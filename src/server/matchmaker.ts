/// <reference types="@cloudflare/workers-types" />

interface QueuedPlayer {
  id: string;
  ws: WebSocket;
  name: string;
}

export class Matchmaker {
  state: DurableObjectState;
  queue: QueuedPlayer[] = [];

  constructor(state: DurableObjectState, _env: unknown) {
    this.state = state;
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
      this.queue = this.queue.filter((p) => p.id !== wsData.id);
    });

    server.addEventListener("error", () => {
      this.queue = this.queue.filter((p) => p.id !== wsData.id);
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

  handleQueue(id: string, ws: WebSocket, name: string) {
    const playerName = name || "Guest";

    // 避免重复排队
    this.queue = this.queue.filter((p) => p.id !== id);
    this.queue.push({ id, ws, name: playerName });

    if (this.queue.length >= 2) {
      const p1 = this.queue.shift()!;
      const p2 = this.queue.shift()!;

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

  handleCancel(id: string, ws: WebSocket) {
    this.queue = this.queue.filter((p) => p.id !== id);
    try {
      ws.send(JSON.stringify({ type: "cancelled" }));
    } catch {}
  }
}
