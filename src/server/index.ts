import { GameRoom } from "./game-room";
import { Matchmaker } from "./matchmaker";

export { GameRoom, Matchmaker };

export interface Env {
  GAME_ROOM: DurableObjectNamespace;
  MATCHMAKER: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 健康检查
    if (url.pathname === "/ws" || url.pathname === "/ws/") {
      return new Response("Color Siege server is running!", { status: 200 });
    }

    // 游戏房间 WebSocket: /ws/room/{roomId}
    if (url.pathname.startsWith("/ws/room/")) {
      const roomId = url.pathname.split("/")[3];
      if (!roomId) {
        return new Response("Missing roomId", { status: 400 });
      }
      const id = env.GAME_ROOM.idFromName(roomId);
      const stub = env.GAME_ROOM.get(id);
      return stub.fetch(request);
    }

    // 匹配服务器 WebSocket: /ws/matchmaker
    if (url.pathname === "/ws/matchmaker") {
      const id = env.MATCHMAKER.idFromName("lobby");
      const stub = env.MATCHMAKER.get(id);
      return stub.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  },
};
