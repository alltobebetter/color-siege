import { PartySocket } from "partysocket";
import { useCallback, useEffect, useRef, useState } from "react";
import { PARTY_HOST } from "../game/config";

export type MatchStatus = "idle" | "searching" | "matched" | "error";

export interface MatchResult {
  gameId: string;
  opponent: string;
}

export function useMatchmaker() {
  const [status, setStatus] = useState<MatchStatus>("idle");
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<PartySocket | null>(null);

  const startMatch = useCallback((name: string) => {
    setStatus("searching");
    setError(null);
    setResult(null);

    const socket = new PartySocket({
      host: PARTY_HOST,
      room: "lobby",
      party: "matchmaker",
    });

    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ type: "queue", name }));
    });

    socket.addEventListener("message", (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "waiting") {
          // 继续等待
        } else if (msg.type === "matched") {
          setStatus("matched");
          setResult({ gameId: msg.gameId, opponent: msg.opponent });
          socket.close();
          wsRef.current = null;
        }
      } catch (e) {
        console.error("Parse error:", e);
      }
    });

    socket.addEventListener("error", () => {
      setStatus("error");
      setError("连接失败");
    });

    wsRef.current = socket;
  }, []);

  const cancelMatch = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.send(JSON.stringify({ type: "cancel" }));
      } catch {}
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus("idle");
    setResult(null);
  }, []);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return { status, result, error, startMatch, cancelMatch };
}
