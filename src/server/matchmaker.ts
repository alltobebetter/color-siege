import { DurableObject } from "cloudflare:workers";
import { randomDifficulty, getBotName } from "../game/bot";
import type { BotDifficulty } from "../game/bot";
import type { Env } from "./index";

interface QueuedPlayer {
  id: string;
  ws: WebSocket;
  name: string;
  /** 超时自动匹配 AI 的计时器 */
  aiTimeout: ReturnType<typeof setTimeout>;
}

/** AI 匹配超时范围（毫秒）：8~15 秒随机 */
const AI_TIMEOUT_MIN = 8_000;
const AI_TIMEOUT_MAX = 15_000;

function randomAiTimeout(): number {
  return AI_TIMEOUT_MIN + Math.floor(Math.random() * (AI_TIMEOUT_MAX - AI_TIMEOUT_MIN));
}

export class Matchmaker extends DurableObject {
  queue: QueuedPlayer[] = [];
  private env: Env;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const id = crypto.randomUUID();
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    server.accept();

    const wsData = { id, ws: server };

    server.addEventListener("message", (event: MessageEvent) => {
      this.onMessage(event.data as string, wsData.id, server);
    });

    server.addEventListener("close", () => {
      this.removeFromQueue(wsData.id);
    });

    server.addEventListener("error", () => {
      this.removeFromQueue(wsData.id);
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  onMessage(msg: string, id: string, ws: WebSocket) {
    let data: any;
    try {
      data = JSON.parse(msg);
    } catch {
      return;
    }

    switch (data.type) {
      case "queue":
        this.handleQueue(id, ws, data.name);
        break;
      case "cancel":
        this.handleCancel(id, ws);
        break;
    }
  }

  removeFromQueue(id: string) {
    const player = this.queue.find((p) => p.id === id);
    if (player?.aiTimeout) {
      clearTimeout(player.aiTimeout);
    }
    this.queue = this.queue.filter((p) => p.id !== id);
  }

  handleQueue(id: string, ws: WebSocket, name: string) {
    const playerName = name || "Guest";

    // 避免重复排队
    this.removeFromQueue(id);

    // 设置 AI 超时
    const aiTimeout = setTimeout(() => {
      this.matchWithAi(id);
    }, randomAiTimeout());

    this.queue.push({ id, ws, name: playerName, aiTimeout });

    if (this.queue.length >= 2) {
      const p1 = this.queue.shift()!;
      const p2 = this.queue.shift()!;

      // 清除 AI 超时
      if (p1.aiTimeout) clearTimeout(p1.aiTimeout);
      if (p2.aiTimeout) clearTimeout(p2.aiTimeout);

      // 生成游戏房间 ID
      const gameId = `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

      // 通知双方
      try {
        p1.ws.send(JSON.stringify({ type: "matched", gameId, opponent: p2.name }));
      } catch {}
      try {
        p2.ws.send(JSON.stringify({ type: "matched", gameId, opponent: p1.name }));
      } catch {}
    } else {
      // 排队中
      try {
        ws.send(JSON.stringify({ type: "waiting" }));
      } catch {}
    }
  }

  /** 超时后自动匹配 AI */
  async matchWithAi(playerId: string) {
    const player = this.queue.find((p) => p.id === playerId);
    if (!player) return;

    // 从队列移除
    this.queue = this.queue.filter((p) => p.id !== playerId);

    const difficulty = randomDifficulty();
    const botName = getBotName();
    const gameId = `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

    // 通过 DO 内部通信预设 AI 配置（前端完全不知情）
    try {
      const doId = this.env.GAME_ROOM.idFromName(gameId);
      const stub = this.env.GAME_ROOM.get(doId);
      await stub.fetch(new Request("https://internal/ai-setup", {
        method: "POST",
        body: JSON.stringify({ difficulty, botName }),
      }));
    } catch (e) {
      console.error("AI setup failed:", e);
    }

    // 通知玩家（看起来跟匹配到真人完全一样）
    try {
      player.ws.send(JSON.stringify({
        type: "matched",
        gameId,
        opponent: botName,
      }));
    } catch {}
  }

  handleCancel(id: string, ws: WebSocket) {
    this.removeFromQueue(id);
    try {
      ws.send(JSON.stringify({ type: "cancelled" }));
    } catch {}
  }
}
