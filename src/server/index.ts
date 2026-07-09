/// <reference types="@cloudflare/workers-types" />

export { GameRoom } from "./game-room";
export { Matchmaker } from "./matchmaker";

export interface Env {
  GAME_ROOM: DurableObjectNamespace;
  MATCHMAKER: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 健康检查
    if (url.pathname === "/") {
      return new Response("Color Siege server is running!", { status: 200 });
    }

    // 游戏房间 WebSocket: /room/{roomId}
    if (url.pathname.startsWith("/room/")) {
      const roomId = url.pathname.split("/")[2];
      if (!roomId) {
        return new Response("Missing roomId", { status: 400 });
      }
      const id = env.GAME_ROOM.idFromName(roomId);
      const stub = env.GAME_ROOM.get(id);
      return stub.fetch(request);
    }

    // 匹配服务器 WebSocket: /matchmaker
    if (url.pathname === "/matchmaker") {
      const id = env.MATCHMAKER.idFromName("lobby");
      const stub = env.MATCHMAKER.get(id);
      return stub.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  },
};
