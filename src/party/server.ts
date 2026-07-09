import type * as Party from "partykit/server";
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
const RECONNECT_GRACE = 15_000; // 断线后 15 秒内可重连

export default class ColorSiegeServer implements Party.Server {
  state: GameState;
  tickTimer: ReturnType<typeof setInterval> | null = null;
  broadcastTimer: ReturnType<typeof setInterval> | null = null;
  endCheckTimer: ReturnType<typeof setInterval> | null = null;

  // conn.id → color
  connections: Map<string, PlayerColor> = new Map();
  // nickname → color（基于昵称的身份追踪，断线重连不变色）
  playerNames: Map<string, PlayerColor> = new Map();
  // color → 重连超时计时器
  reconnectTimeouts: Map<PlayerColor, ReturnType<typeof setTimeout>> = new Map();

  constructor(public room: Party.Room) {
    this.state = createInitialState();
  }

  onConnect(_conn: Party.Connection, _ctx: Party.ConnectionContext) {
    // 等待 join 消息
  }

  onMessage(msg: string, sender: Party.Connection) {
    let data: ClientMessage;
    try {
      data = JSON.parse(msg as string);
    } catch {
      return;
    }

    switch (data.type) {
      case "join":
        this.handleJoin(sender, data.name);
        break;
      case "ready":
        this.handleReady(sender);
        break;
      case "move":
        this.handleMove(sender, data.dir);
        break;
      case "skill":
        this.handleSkill(sender, data.skill);
        break;
      case "leave":
        this.handleLeave(sender);
        break;
    }
  }

  handleJoin(conn: Party.Connection, name: string) {
    const id = conn.id;
    const cleanName = (name || "").trim() || `玩家?`;

    // 同一连接重复 join → 忽略
    if (this.connections.has(id)) return;

    // ★ 重连检测：同名玩家已在游戏中
    if (this.playerNames.has(cleanName)) {
      const color = this.playerNames.get(cleanName)!;

      // 清除重连超时
      const timeout = this.reconnectTimeouts.get(color);
      if (timeout) {
        clearTimeout(timeout);
        this.reconnectTimeouts.delete(color);
      }

      // 更新连接映射（新 conn.id → 原 color）
      this.connections.set(id, color);

      // 更新玩家对象的 id
      const player = this.state.players[color];
      if (player) {
        player.id = id;
      }

      this.sendTo(conn, { type: "joined", color, name: cleanName });
      this.broadcast();
      return;
    }

    // 新玩家 — 找空位
    let color: PlayerColor | null = null;
    if (!this.state.players[1]) color = 1;
    else if (!this.state.players[2]) color = 2;

    if (color === null) {
      this.sendTo(conn, { type: "error", message: "房间已满" });
      return;
    }

    // 游戏进行中不允许新玩家加入（但允许重连，上面已处理）
    if (this.state.status === "playing" || this.state.status === "countdown") {
      this.sendTo(conn, { type: "error", message: "游戏已开始" });
      return;
    }

    const player = createPlayer(id, color, cleanName);
    this.state.players[color] = player;
    this.connections.set(id, color);
    this.playerNames.set(cleanName, color);

    this.sendTo(conn, { type: "joined", color, name: cleanName });
    this.broadcast();
  }

  handleReady(conn: Party.Connection) {
    const color = this.connections.get(conn.id);
    if (!color) return;

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

  handleMove(conn: Party.Connection, dir: any) {
    const color = this.connections.get(conn.id);
    if (!color) return;
    movePlayer(this.state, color, dir);
  }

  handleSkill(conn: Party.Connection, skill: any) {
    const color = this.connections.get(conn.id);
    if (!color) return;
    useSkill(this.state, color, skill);
  }

  handleLeave(conn: Party.Connection) {
    const color = this.connections.get(conn.id);
    if (!color) return;

    // 删除连接映射
    this.connections.delete(conn.id);

    const player = this.state.players[color];
    if (!player) return;

    if (this.state.status === "playing" || this.state.status === "countdown") {
      // 游戏中断线 — 给宽限期重连，不立即移除玩家
      const playerName = player.name;
      const timeout = setTimeout(() => {
        // 检查是否已重连（有新连接映射到这个 color）
        const reconnected = Array.from(this.connections.values()).includes(color);
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

  onClose(conn: Party.Connection) {
    this.handleLeave(conn);
  }

  onError(conn: Party.Connection, err: Error) {
    console.error("Connection error:", err);
    this.handleLeave(conn);
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
    this.room.broadcast(JSON.stringify(msg), undefined);
  }

  sendTo(conn: Party.Connection, msg: ServerMessage) {
    conn.send(JSON.stringify(msg));
  }
}

ColorSiegeServer satisfies Party.Worker;
