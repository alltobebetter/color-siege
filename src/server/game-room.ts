import { DurableObject } from "cloudflare:workers";
import {
  createInitialState,
  createPlayer,
  movePlayer,
  useSkill,
  startCountdown,
  gameTick,
  serializeState,
} from "../game/engine";
import { getBotAction } from "../game/bot";
import type { BotDifficulty } from "../game/bot";
import type {
  GameState,
  PlayerColor,
  ClientMessage,
  ServerMessage,
  Direction,
  SkillType,
} from "../game/types";

const TICK_INTERVAL = 100;
const BROADCAST_INTERVAL = 50;
const RECONNECT_GRACE = 15_000;
const BOT_TICK_INTERVAL = 150;

interface ConnInfo {
  id: string;
  ws: WebSocket;
  color: PlayerColor | null;
}

export class GameRoom extends DurableObject {
  gameState: GameState;
  tickTimer: ReturnType<typeof setInterval> | null = null;
  broadcastTimer: ReturnType<typeof setInterval> | null = null;
  endCheckTimer: ReturnType<typeof setInterval> | null = null;
  botTimer: ReturnType<typeof setInterval> | null = null;

  // ws → ConnInfo
  connections: Map<WebSocket, ConnInfo> = new Map();
  // name → color（断线重连不变色）
  playerNames: Map<string, PlayerColor> = new Map();
  // color → 重连超时计时器
  reconnectTimeouts: Map<PlayerColor, ReturnType<typeof setTimeout>> = new Map();

  // AI Bot 相关（通过 DO 内部通信预设，前端完全不知情）
  botDifficulty: BotDifficulty | null = null;
  botName: string | null = null;
  botColor: PlayerColor | null = null;

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    this.gameState = createInitialState();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // 内部接口：预设 AI 配置（由 Matchmaker 调用）
    if (url.pathname === "/ai-setup" && request.method === "POST") {
      try {
        const data = await request.json() as { difficulty: BotDifficulty; botName: string };
        this.botDifficulty = data.difficulty;
        this.botName = data.botName;
      } catch {}
      return new Response("OK");
    }

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
      const player = this.gameState.players[color];
      if (player) {
        player.id = id;
      }

      this.sendTo(ws, { type: "joined", color, name: cleanName });
      this.broadcast();
      return;
    }

    // 新玩家 — 找空位
    let color: PlayerColor | null = null;
    if (!this.gameState.players[1]) color = 1;
    else if (!this.gameState.players[2]) color = 2;

    if (color === null) {
      this.sendTo(ws, { type: "error", message: "房间已满" });
      return;
    }

    // 游戏进行中不允许新玩家加入（但允许重连，上面已处理）
    if (this.gameState.status === "playing" || this.gameState.status === "countdown") {
      this.sendTo(ws, { type: "error", message: "游戏已开始" });
      return;
    }

    const player = createPlayer(id, color, cleanName);
    this.gameState.players[color] = player;
    connInfo.color = color;
    this.playerNames.set(cleanName, color);

    this.sendTo(ws, { type: "joined", color, name: cleanName });

    // 如果有 AI 配置（由 Matchmaker 预设），自动创建 AI 对手
    if (this.botDifficulty && this.botName && this.botColor === null) {
      const botColor: PlayerColor = color === 1 ? 2 : 1;
      this.botColor = botColor;
      const bot = createPlayer("bot", botColor, this.botName);
      bot.ready = true; // AI 自动准备
      this.gameState.players[botColor] = bot;
      this.playerNames.set(this.botName, botColor);
    }

    this.broadcast();
  }

  handleReady(ws: WebSocket) {
    const connInfo = this.connections.get(ws);
    if (!connInfo || connInfo.color === null) return;

    const color = connInfo.color;
    const player = this.gameState.players[color];
    if (!player) return;
    if (this.gameState.status !== "waiting") return;

    player.ready = true;

    const p1 = this.gameState.players[1];
    const p2 = this.gameState.players[2];
    if (p1?.ready && p2?.ready) {
      startCountdown(this.gameState);
      this.startGameLoop();
    }

    this.broadcast();
  }

  handleMove(ws: WebSocket, dir: Direction) {
    const connInfo = this.connections.get(ws);
    if (!connInfo || connInfo.color === null) return;
    movePlayer(this.gameState, connInfo.color, dir);
  }

  handleSkill(ws: WebSocket, skill: SkillType) {
    const connInfo = this.connections.get(ws);
    if (!connInfo || connInfo.color === null) return;
    useSkill(this.gameState, connInfo.color, skill);
  }

  handleLeave(ws: WebSocket) {
    const connInfo = this.connections.get(ws);
    if (!connInfo) return;

    const color = connInfo.color;

    // 删除连接映射
    this.connections.delete(ws);

    if (color === null) return;

    const player = this.gameState.players[color];
    if (!player) return;

    // 如果是 AI 房间，人类离开 → 直接结束
    if (this.botDifficulty && color !== this.botColor) {
      this.gameState.status = "ended";
      this.gameState.winner = this.botColor;
      this.stopGameLoop();
      this.broadcast();
      return;
    }

    if (this.gameState.status === "playing" || this.gameState.status === "countdown") {
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
        this.gameState.players[color] = null;
        this.playerNames.delete(playerName);
        this.gameState.status = "ended";
        this.gameState.winner = color === 1 ? 2 : 1;
        this.stopGameLoop();
        this.broadcast();
      }, RECONNECT_GRACE);

      this.reconnectTimeouts.set(color, timeout);
    } else {
      // 非游戏中 — 立即移除
      this.playerNames.delete(player.name);
      this.gameState.players[color] = null;
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
    if (this.botTimer) clearInterval(this.botTimer);

    this.tickTimer = setInterval(() => {
      gameTick(this.gameState);
    }, TICK_INTERVAL);

    this.broadcastTimer = setInterval(() => {
      this.broadcast();
    }, BROADCAST_INTERVAL);

    this.endCheckTimer = setInterval(() => {
      if (this.gameState.status === "ended") {
        this.stopGameLoop();
        this.broadcast();
      }
    }, 500);

    // AI Bot 定时决策
    if (this.botDifficulty && this.botColor !== null) {
      this.botTimer = setInterval(() => {
        this.runBot();
      }, BOT_TICK_INTERVAL);
    }
  }

  /** AI Bot 执行决策 */
  runBot() {
    if (this.gameState.status !== "playing") return;
    if (!this.botDifficulty || this.botColor === null) return;

    const botPlayer = this.gameState.players[this.botColor];
    if (!botPlayer) return;

    const action = getBotAction(this.gameState, this.botColor, this.botDifficulty);

    if (action.skill) {
      useSkill(this.gameState, this.botColor, action.skill);
    }

    if (action.move) {
      movePlayer(this.gameState, this.botColor, action.move);
    }
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
    if (this.botTimer) {
      clearInterval(this.botTimer);
      this.botTimer = null;
    }
  }

  broadcast() {
    const msg: ServerMessage = {
      type: "state",
      state: serializeState(this.gameState),
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
