"use client";

import { useEffect, useRef, useState, useCallback, useMemo, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGameConnection } from "@/hooks/useGameConnection";
import { GameRenderer } from "@/game/renderer";
import { SKILL_COOLDOWNS, MOVE_COOLDOWN, DIR_VECTORS } from "@/game/constants";
import type { ClientMessage, Direction, SkillType, SerializedState, PlayerColor } from "@/game/types";

const P1_COLOR = "#e8475a";
const P2_COLOR = "#4a6cf7";

function GameContent() {
  const params = useParams();
  const router = useRouter();

  const roomId = params.roomId as string;
  const [playerName, setPlayerName] = useState("");

  // 获取用户信息
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setPlayerName(data.user.nickname);
        } else {
          router.replace("/");
        }
      })
      .catch(() => router.replace("/"));
  }, [router]);

  const { state, myColor, connected, error, send } = useGameConnection(
    roomId,
    playerName
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const [, forceTick] = useState(0);

  // ===== 客户端预测 =====
  // predictedState 是在服务器状态基础上应用本地移动后的状态
  const predictedStateRef = useRef<SerializedState | null>(null);
  const lastMoveTimeRef = useRef(0);
  const pendingMovesRef = useRef<Array<{ seq: number; dir: Direction }>>([]);
  const seqRef = useRef(0);
  const serverStateRef = useRef<SerializedState | null>(null);
  const myColorRef = useRef<PlayerColor | null>(null);
  myColorRef.current = myColor;

  // 服务器状态到达时，重新应用未确认的移动
  useEffect(() => {
    if (!state) return;
    serverStateRef.current = state;

    // 以服务器状态为基准，重新应用未确认的移动
    const predicted = JSON.parse(JSON.stringify(state)) as SerializedState;
    const color = myColorRef.current;
    if (color && predicted.players[color]) {
      for (const move of pendingMovesRef.current) {
        const p: SerializedState["players"][PlayerColor] = predicted.players[color]!;
        if (!p) break;
        const now = Date.now();
        if (now < p.moveCooldown) break; // 冷却中，停止重放
        const { dx, dy } = DIR_VECTORS[move.dir];
        const nx = p.x + dx;
        const ny = p.y + dy;
        // 边界/障碍检查
        if (nx < 0 || nx >= 20 || ny < 0 || ny >= 20) { p.dir = move.dir; continue; }
        if (predicted.grid[ny][nx] === -1) { p.dir = move.dir; continue; }
        p.x = nx;
        p.y = ny;
        p.dir = move.dir;
        p.moveCooldown = now + MOVE_COOLDOWN;
        predicted.grid[ny][nx] = color;
      }
    }
    predictedStateRef.current = predicted;
  }, [state]);

  // 本地预测移动
  const predictMove = useCallback((dir: Direction) => {
    const color = myColorRef.current;
    const baseState = predictedStateRef.current || serverStateRef.current;
    if (!color || !baseState || !baseState.players[color]) return;
    if (baseState.status !== "playing") return;

    const p = baseState.players[color]!;
    const now = Date.now();
    if (now < p.moveCooldown) return; // 冷却中

    // 克隆状态，应用移动
    const newState = JSON.parse(JSON.stringify(baseState)) as SerializedState;
    const np = newState.players[color]!;
    const { dx, dy } = DIR_VECTORS[dir];
    const nx = np.x + dx;
    const ny = np.y + dy;

    // 边界/障碍检查
    if (nx < 0 || nx >= 20 || ny < 0 || ny >= 20 || newState.grid[ny][nx] === -1) {
      np.dir = dir; // 只改变朝向
    } else {
      np.x = nx;
      np.y = ny;
      np.dir = dir;
      np.moveCooldown = now + MOVE_COOLDOWN;
      newState.grid[ny][nx] = color;
    }

    predictedStateRef.current = newState;

    // 记录待确认的移动
    const seq = ++seqRef.current;
    pendingMovesRef.current.push({ seq, dir });
    // 保留最近 10 条
    if (pendingMovesRef.current.length > 10) {
      pendingMovesRef.current.shift();
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    rendererRef.current = new GameRenderer(canvasRef.current);
  }, []);

  // 渲染循环 — 使用预测状态，独立于 state 更新，保证 60fps
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (rendererRef.current) {
        const renderState = predictedStateRef.current || state;
        rendererRef.current.render(renderState, myColor);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [state, myColor]);

  // 每500ms强制刷新（用于冷却倒计时更新）
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, []);

  // 键盘输入 — 先本地预测，再发服务器
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      const dirMap: Record<string, Direction> = {
        arrowup: "up", arrowdown: "down", arrowleft: "left", arrowright: "right",
        w: "up", s: "down", a: "left", d: "right",
      };
      if (dirMap[key]) {
        e.preventDefault();
        predictMove(dirMap[key]);
        send({ type: "move", dir: dirMap[key] });
      }

      const skillMap: Record<string, SkillType> = {
        "1": "dash", "2": "bomb", "3": "shield",
        q: "dash", e: "bomb", r: "shield",
      };
      if (skillMap[key]) {
        e.preventDefault();
        send({ type: "skill", skill: skillMap[key] });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [send, predictMove]);

  const handleReady = useCallback(() => send({ type: "ready" }), [send]);
  const handleSkill = useCallback(
    (skill: SkillType) => send({ type: "skill", skill }),
    [send]
  );
  const handleLeave = useCallback(() => {
    send({ type: "leave" });
    router.push("/lobby");
  }, [send, router]);

  const scores = useMemo(() => {
    const s = predictedStateRef.current || state;
    if (!s) return { p1: 0, p2: 0, total: 0 };
    let p1 = 0, p2 = 0, total = 0;
    for (const row of s.grid) {
      for (const cell of row) {
        if (cell === 1) p1++;
        else if (cell === 2) p2++;
        if (cell !== -1) total++;
      }
    }
    return { p1, p2, total };
  }, [state, predictedStateRef.current]);

  const gameTimeLeft = useMemo(() => {
    const s = predictedStateRef.current || state;
    if (!s || s.status !== "playing") return 0;
    return Math.max(0, Math.ceil((s.endTime - Date.now()) / 1000));
  }, [state, predictedStateRef.current]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="card p-8 max-w-sm text-center space-y-4">
          <p className="text-sm" style={{ color: P1_COLOR }}>{error}</p>
          <button onClick={() => router.push("/lobby")} className="btn px-5 py-2 text-sm">
            返回大厅
          </button>
        </div>
      </main>
    );
  }

  const displayState = predictedStateRef.current || state;
  const myPlayer = myColor ? displayState?.players[myColor] : null;
  const mySkillCDs = myPlayer?.skillCooldowns ?? { dash: 0, bomb: 0, shield: 0 };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-6 gap-3">
      {/* 顶栏 */}
      <div className="w-full max-w-[560px] flex items-center justify-between text-xs text-text-dim">
        <button onClick={handleLeave} className="btn px-3 py-1.5 text-xs">
          退出
        </button>
        <span>
          房间 <span className="text-text-main uppercase">{roomId}</span>
        </span>
        <span style={{ color: connected ? "#4ade80" : "#fbbf24" }}>
          {connected ? "已连接" : "连接中"}
        </span>
      </div>

      {/* 分数栏 — 我在左，对手在右 */}
      {state && myColor && (
        (() => {
          const oppColor: 1 | 2 = myColor === 1 ? 2 : 1;
          const myScore = myColor === 1 ? scores.p1 : scores.p2;
          const oppScore = myColor === 1 ? scores.p2 : scores.p1;
          const myColorHex = myColor === 1 ? P1_COLOR : P2_COLOR;
          const oppColorHex = oppColor === 1 ? P1_COLOR : P2_COLOR;
          const myName = state.players[myColor]?.name || "—";
          const oppName = state.players[oppColor]?.name || "—";
          const sumScore = myScore + oppScore;
          const myWidth = sumScore > 0 ? (myScore / sumScore) * 100 : 50;
          const oppWidth = sumScore > 0 ? (oppScore / sumScore) * 100 : 50;

          return (
            <div className="w-full max-w-[560px] card px-3 py-2 flex items-center gap-3">
              {/* 我 */}
              <div className="flex items-center gap-2 min-w-0" style={{ flex: "0 0 auto" }}>
                <div className="w-2.5 h-2.5" style={{ background: myColorHex }} />
                <span className="text-xs truncate max-w-[70px]">{myName}</span>
                <span className="text-sm font-bold tabular-nums" style={{ color: myColorHex }}>
                  {myScore}
                </span>
              </div>

              {/* 进度条 */}
              <div className="flex-1 h-1.5 bg-surface2 flex">
                <div
                  className="h-full transition-all duration-300"
                  style={{ width: `${myWidth}%`, background: myColorHex }}
                />
                <div
                  className="h-full transition-all duration-300"
                  style={{ width: `${oppWidth}%`, background: oppColorHex }}
                />
              </div>

              {/* 对手 */}
              <div className="flex items-center gap-2 min-w-0 justify-end" style={{ flex: "0 0 auto" }}>
                <span className="text-sm font-bold tabular-nums" style={{ color: oppColorHex }}>
                  {oppScore}
                </span>
                <span className="text-xs truncate max-w-[70px]">{oppName}</span>
                <div className="w-2.5 h-2.5" style={{ background: oppColorHex }} />
              </div>
            </div>
          );
        })()
      )}

      {/* 画布 */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="border border-border-default"
          style={{ imageRendering: "pixelated" }}
        />

        {/* 计时器 */}
        {state?.status === "playing" && (
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-center">
            <span className="text-lg tabular-nums text-text-main">
              {gameTimeLeft}
            </span>
            <span className="text-xs text-text-dim ml-0.5">s</span>
          </div>
        )}
      </div>

      {/* 底部控制区 */}
      <div className="w-full max-w-[560px] space-y-2">
        {/* 等待中 */}
        {state?.status === "waiting" && myColor && (
          <button
            onClick={handleReady}
            disabled={state.players[myColor]?.ready}
            className="btn-p2 w-full py-2.5 text-sm"
          >
            {state.players[myColor]?.ready ? "已准备" : "准备"}
          </button>
        )}

        {/* 技能 */}
        {state?.status === "playing" && myColor && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <SkillButton
                name="冲刺" hotkey="1"
                cooldown={mySkillCDs.dash}
                maxCooldown={SKILL_COOLDOWNS.dash}
                onClick={() => handleSkill("dash")}
              />
              <SkillButton
                name="炸弹" hotkey="2"
                cooldown={mySkillCDs.bomb}
                maxCooldown={SKILL_COOLDOWNS.bomb}
                onClick={() => handleSkill("bomb")}
              />
              <SkillButton
                name="护盾" hotkey="3"
                cooldown={mySkillCDs.shield}
                maxCooldown={SKILL_COOLDOWNS.shield}
                onClick={() => handleSkill("shield")}
              />
            </div>
            <p className="text-center text-xs text-text-dim">
              WASD 移动 / 1 2 3 技能
            </p>
          </>
        )}

        {/* 结束 */}
        {state?.status === "ended" && (
          <button
            onClick={() => router.push("/lobby")}
            className="btn w-full py-2.5 text-sm"
          >
            返回大厅
          </button>
        )}
      </div>
    </main>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={null}>
      <GameContent />
    </Suspense>
  );
}

function SkillButton({
  name,
  hotkey,
  cooldown,
  maxCooldown,
  onClick,
}: {
  name: string;
  hotkey: string;
  cooldown: number;
  maxCooldown: number;
  onClick: () => void;
}) {
  const now = Date.now();
  const remaining = Math.max(0, cooldown - now);
  const isReady = remaining === 0;
  const progress = isReady ? 0 : (remaining / maxCooldown) * 100;

  return (
    <button
      onClick={onClick}
      disabled={!isReady}
      className="skill-btn py-2.5 px-2 text-center relative"
    >
      {!isReady && (
        <div
          className="absolute inset-0 bg-bg/80"
          style={{ clipPath: `inset(0 0 ${100 - progress}% 0)` }}
        />
      )}
      <div className="relative">
        <div className="text-xs text-text-main">{name}</div>
        <div className="text-[10px] text-text-dim mt-0.5">[{hotkey}]</div>
      </div>
    </button>
  );
}
