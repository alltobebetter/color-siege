/// <reference types="@cloudflare/workers-types" />

import {
  createInitialState,
  createPlayer,
  movePlayer,
  useSkill,
  startCountdown,
  gameTick,
  serializeState,
} from "../game/engine";
import type {
  GameState,
  PlayerColor,
  ClientMessage,
  ServerMessage,
} from "../game/types";

const TICK_INTERVAL = 100;
const BROADCAST_INTERVAL = 50;
const RECONNECT_GRACE = 15_000;

interface ConnInfo {
  id: string;
  ws: WebSocket;
  color: PlayerColor | null;
}

export class GameRoom {
  state: GameState;
  state2: DurableObjectState;
  tickTimer: ReturnType<typeof setInterval> | null = null;
  broadcastTimer: ReturnType<typeof setInterval> | null = null;
  endCheckTimer: ReturnType<typeof setInterval> | null = null;

  // ws → ConnInfo
  connections: Map<WebSocket, ConnInfo> = new Map();
  // name → color（断线重连不变色）
  playerNames: Map<string, PlayerColor> = new Map();
  // color → 重连超时计时器
  reconnectTimeouts: Map<PlayerColor, ReturnType<typeof setTimeout>> = new Map();

  constructor(state: DurableObjectState, _env: unknown) {
    this.state2 = state;
    this.state = createInitialState();
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const id = crypto.randomUUID();
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    const connInfo: ConnInfo = { id, ws: server, color: null };
    this.connections.set(server, connInfo);

    server.accept();

    server.addEventListener("message", (event: MessageEvent) => {
      this.onMessage(event.data as string, server);
    });

    server.addEventListener("close", () => {
      this.onClose(server);
    });

    server.addEventListener("error", (err: unknown) => {
      console.error("Connection error:", err);
      this.onClose(server);
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  onMessage(msg: string, ws: WebSocket) {
    const connInfo = this.connections.get(ws);
    if (!connInfo) return;

    let data: ClientMessage;
    try {
      data = JSON.parse(msg);
    } catch {
      return;
    }

    switch (data.type) {
      case "join":
        this.handleJoin(ws, data.name);
        break;
      case "ready":
        this.handleReady(ws);
        break;
      case "move":
        this.handleMove(ws, data.dir);
        break;
      case "skill":
        this.handleSkill(ws, data.skill);
        break;
      case "leave":
        this.handleLeave(ws);
        break;
    }
  }

  handleJoin(ws: WebSocket, name: string) {
    const connInfo = this.connections.get(ws);
    if (!connInfo) return;
    const id = connInfo.id;
    const cleanName = (name || "").trim() || `玩家?`;

    // 同一连接重复 join → 忽略
    if (connInfo.color !== null) return;

    // ★ 重连检测：同名玩家已在游戏中
    if (this.playerNames.has(cleanName)) {
      const color = this.playerNames.get(cleanName)!;

      // 清除重连超时
      const timeout = this.reconnectTimeouts.get(color);
      if (timeout) {
        clearTimeout(timeout);
        this.reconnectTimeouts.delete(color);
      }

      // 更新连接映射
      connInfo.color = color;

      // 更新玩家对象的 id
      const player = this.state.players[color];
      if (player) {
        player.id = id;
      }

      this.sendTo(ws, { type: "joined", color, name: cleanName });
      this.broadcast();
      return;
    }

    // 新玩家 — 找空位
    let color: PlayerColor | null = null;
    if (!this.state.players[1]) color = 1;
    else if (!this.state.players[2]) color = 2;

    if (color === null) {
      this.sendTo(ws, { type: "error", message: "房间已满" });
      return;
    }

    // 游戏进行中不允许新玩家加入（但允许重连，上面已处理）
    if (this.state.status === "playing" || this.state.status === "countdown") {
      this.sendTo(ws, { type: "error", message: "游戏已开始" });
      return;
    }

    const player = createPlayer(id, color, cleanName);
    this.state.players[color] = player;
    connInfo.color = color;
    this.playerNames.set(cleanName, color);

    this.sendTo(ws, { type: "joined", color, name: cleanName });
    this.broadcast();
  }

  handleReady(ws: WebSocket) {
    const connInfo = this.connections.get(ws);
    if (!connInfo || connInfo.color === null) return;

    const color = connInfo.color;
    const player = this.state.players[color];
    if (!player) return;
    if (this.state.status !== "waiting") return;

    player.ready = true;

    const p1 = this.state.players[1];
    const p2 = this.state.players[2];
    if (p1?.ready && p2?.ready) {
      startCountdown(this.state);
      this.startGameLoop();
    }

    this.broadcast();
  }

  handleMove(ws: WebSocket, dir: any) {
    const connInfo = this.connections.get(ws);
    if (!connInfo || connInfo.color === null) return;
    movePlayer(this.state, connInfo.color, dir);
  }

  handleSkill(ws: WebSocket, skill: any) {
    const connInfo = this.connections.get(ws);
    if (!connInfo || connInfo.color === null) return;
    useSkill(this.state, connInfo.color, skill);
  }

  handleLeave(ws: WebSocket) {
    const connInfo = this.connections.get(ws);
    if (!connInfo) return;

    const color = connInfo.color;

    // 删除连接映射
    this.connections.delete(ws);

    if (color === null) return;

    const player = this.state.players[color];
    if (!player) return;

    if (this.state.status === "playing" || this.state.status === "countdown") {
      // 游戏中断线 — 给宽限期重连，不立即移除玩家
      const playerName = player.name;
      const timeout = setTimeout(() => {
        // 检查是否已重连（有新连接映射到这个 color）
        let reconnected = false;
        for (const info of this.connections.values()) {
          if (info.color === color) {
            reconnected = true;
            break;
          }
        }
        if (reconnected) return;

        // 未重连 — 移除玩家，结束游戏
        this.state.players[color] = null;
        this.playerNames.delete(playerName);
        this.state.status = "ended";
        this.state.winner = color === 1 ? 2 : 1;
        this.stopGameLoop();
        this.broadcast();
      }, RECONNECT_GRACE);

      this.reconnectTimeouts.set(color, timeout);
    } else {
      // 非游戏中 — 立即移除
      this.playerNames.delete(player.name);
      this.state.players[color] = null;
    }

    this.broadcast();
  }

  onClose(ws: WebSocket) {
    this.handleLeave(ws);
  }

  startGameLoop() {
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.broadcastTimer) clearInterval(this.broadcastTimer);
    if (this.endCheckTimer) clearInterval(this.endCheckTimer);

    this.tickTimer = setInterval(() => {
      gameTick(this.state);
    }, TICK_INTERVAL);

    this.broadcastTimer = setInterval(() => {
      this.broadcast();
    }, BROADCAST_INTERVAL);

    this.endCheckTimer = setInterval(() => {
      if (this.state.status === "ended") {
        this.stopGameLoop();
        this.broadcast();
      }
    }, 500);
  }

  stopGameLoop() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    if (this.broadcastTimer) {
      clearInterval(this.broadcastTimer);
      this.broadcastTimer = null;
    }
    if (this.endCheckTimer) {
      clearInterval(this.endCheckTimer);
      this.endCheckTimer = null;
    }
  }

  broadcast() {
    const msg: ServerMessage = {
      type: "state",
      state: serializeState(this.state),
    };
    const data = JSON.stringify(msg);
    for (const ws of this.connections.keys()) {
      try {
        ws.send(data);
      } catch {
        // 连接可能已关闭
      }
    }
  }

  sendTo(ws: WebSocket, msg: ServerMessage) {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // 连接可能已关闭
    }
  }
}
