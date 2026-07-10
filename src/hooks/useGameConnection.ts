import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientMessage, ServerMessage, SerializedState } from "../game/types";
import { WS_HOST } from "../game/config";

export interface GameConnection {
  state: SerializedState | null;
  myColor: 1 | 2 | null;
  connected: boolean;
  error: string | null;
  send: (msg: ClientMessage) => void;
}

export function useGameConnection(roomId: string, playerName: string): GameConnection {
  const [state, setState] = useState<SerializedState | null>(null);
  const [myColor, setMyColor] = useState<1 | 2 | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const hasConnectedRef = useRef(false);

  // 用 ref 保存最新的 playerName，供 open 回调读取
  const nameRef = useRef(playerName);
  nameRef.current = playerName;

  useEffect(() => {
    // 等昵称加载完
    if (!playerName) return;
    // 防止重连（StrictMode 双挂载 / playerName 变化）
    if (hasConnectedRef.current) return;
    hasConnectedRef.current = true;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${WS_HOST}/ws/room/${roomId}`);

    const doJoin = () => {
      setConnected(true);
      setError(null);
      const msg: ClientMessage = { type: "join", name: nameRef.current };
      socket.send(JSON.stringify(msg));
    };

    socket.addEventListener("open", doJoin);

    socket.addEventListener("message", (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        switch (msg.type) {
          case "state":
            setState(msg.state);
            break;
          case "joined":
            setMyColor(msg.color);
            break;
          case "error":
            setError(msg.message);
            break;
        }
      } catch (e) {
        console.error("Parse error:", e);
      }
    });

    socket.addEventListener("close", () => {
      setConnected(false);
    });

    socket.addEventListener("error", () => {
      setError("连接失败，请检查网络");
    });

    wsRef.current = socket;

    return () => {
      socket.close();
      wsRef.current = null;
      hasConnectedRef.current = false;
    };
  }, [roomId, playerName]);

  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { state, myColor, connected, error, send };
}
