"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMatchmaker } from "@/hooks/useMatchmaker";

interface UserInfo {
  userId: string;
  nickname: string;
  isGuest: boolean;
}

export default function LobbyPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [checked, setChecked] = useState(false);
  const [roomId, setRoomId] = useState("");

  const { status, result, error: matchError, startMatch, cancelMatch } =
    useMatchmaker();

  // 获取用户信息
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        } else {
          router.replace("/");
        }
      })
      .catch(() => router.replace("/"))
      .finally(() => setChecked(true));
  }, [router]);

  // 匹配成功 → 进游戏
  useEffect(() => {
    if (status === "matched" && result && user) {
      router.push(
        `/play/${result.gameId}?name=${encodeURIComponent(user.nickname)}`
      );
    }
  }, [status, result, user, router]);

  const handleMatch = useCallback(() => {
    if (!user) return;
    startMatch(user.nickname);
  }, [user, startMatch]);

  const createRoom = useCallback(() => {
    if (!user) return;
    const id = Math.random().toString(36).substring(2, 8);
    router.push(`/play/${id}?name=${encodeURIComponent(user.nickname)}`);
  }, [user, router]);

  const joinRoom = useCallback(() => {
    if (!user) return;
    const id = roomId.trim().toLowerCase();
    if (!id) return;
    router.push(`/play/${id}?name=${encodeURIComponent(user.nickname)}`);
  }, [user, roomId, router]);

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }, [router]);

  if (!checked || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-xs text-text-dim">加载中</div>
      </main>
    );
  }

  // 匹配中
  if (status === "searching") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-8">
          <div className="space-y-3">
            <div className="text-xl text-text-main">匹配中</div>
            <div className="flex justify-center gap-1">
              <span
                className="w-1 h-1 bg-text-dim"
                style={{ animation: "pulse 1.4s ease-in-out infinite" }}
              />
              <span
                className="w-1 h-1 bg-text-dim"
                style={{ animation: "pulse 1.4s ease-in-out 0.2s infinite" }}
              />
              <span
                className="w-1 h-1 bg-text-dim"
                style={{ animation: "pulse 1.4s ease-in-out 0.4s infinite" }}
              />
            </div>
          </div>
          <button onClick={cancelMatch} className="btn px-6 py-2 text-sm">
            取消
          </button>
          {matchError && (
            <p className="text-xs" style={{ color: "#e8475a" }}>
              {matchError}
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* 标题 + 用户信息 */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl tracking-tight text-text-main">
              Color Siege
            </h1>
            <p className="text-xs text-text-dim">
              <span style={{ color: "#4a6cf7" }}>{user.nickname}</span>
              {user.isGuest ? (
                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-surface2 text-text-dim">游客</span>
              ) : (
                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px]" style={{ background: "rgba(74,108,247,0.15)", color: "#4a6cf7" }}>注册</span>
              )}
            </p>
          </div>
          <button onClick={handleLogout} className="btn px-3 py-1.5 text-xs">
            退出
          </button>
        </div>

        {/* 玩法说明 */}
        <div className="card p-4 space-y-2 text-xs leading-relaxed text-text-dim">
          <p>移动时经过的格子会变成你的颜色。</p>
          <p>用你的颜色将对方领地完全围住，即可将其全部翻转。</p>
          <p>90 秒内涂色面积大者获胜。</p>
          <div className="pt-1 flex gap-4 text-text-main">
            <span>冲刺 / 快速涂色</span>
            <span>炸弹 / 范围爆破</span>
            <span>护盾 / 免疫翻转</span>
          </div>
        </div>

        {/* 操作区 */}
        <div className="card p-5 space-y-4">
          {/* 匹配 + 创建房间 */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleMatch} className="btn-p2 py-2.5 text-sm">
              开始匹配
            </button>
            <button onClick={createRoom} className="btn py-2.5 text-sm">
              创建房间
            </button>
          </div>

          {/* 分隔线 */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border-default" />
            <span className="text-xs text-text-dim">或</span>
            <div className="flex-1 h-px bg-border-default" />
          </div>

          {/* 加入房间 */}
          <div className="space-y-1.5">
            <label className="text-xs text-text-dim block">房间号</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomId}
                onChange={(e) =>
                  setRoomId(
                    e.target.value.replace(/[^a-z0-9]/gi, "").toLowerCase()
                  )
                }
                maxLength={8}
                placeholder="输入房间号"
                className="input flex-1 px-3 py-2.5 text-sm uppercase"
                onKeyDown={(e) => e.key === "Enter" && joinRoom()}
              />
              <button
                onClick={joinRoom}
                disabled={!roomId.trim()}
                className="btn px-5 py-2.5 text-sm"
              >
                加入
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 text-xs text-text-dim">
          <a href="/docs/how-to-play" className="hover:text-text-main transition-colors">如何游玩</a>
          <span>/</span>
          <a href="/docs/privacy" className="hover:text-text-main transition-colors">隐私政策</a>
          <span>/</span>
          <a href="/docs/terms" className="hover:text-text-main transition-colors">服务条款</a>
        </div>

        <p className="text-center text-xs text-text-dim">
          在线联机 / 双人对战
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </main>
  );
}
