"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 已登录的用户直接跳大厅
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          router.push("/lobby");
        }
      })
      .catch(() => {});
  }, [router]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!nickname.trim() || !password) return;
      setLoading(true);
      setError(null);

      try {
        const endpoint =
          mode === "login" ? "/api/auth/login" : "/api/auth/register";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nickname: nickname.trim(),
            password,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "出错了");
          return;
        }

        router.push("/lobby");
      } catch {
        setError("网络错误");
      } finally {
        setLoading(false);
      }
    },
    [mode, nickname, password, router]
  );

  const handleGuest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/guest", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "出错了");
        return;
      }
      router.push("/lobby");
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* 标题 */}
        <div className="space-y-1">
          <h1 className="text-3xl tracking-tight text-text-main">
            Color Siege
          </h1>
          <p className="text-sm text-text-dim">
            色彩围攻 — 涂色与围地
          </p>
        </div>

        {/* 登录/注册 */}
        <form onSubmit={handleSubmit} className="card p-5 space-y-4">
          {/* 模式切换 */}
          <div className="flex">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 py-2 text-sm ${
                mode === "login" ? "text-text-main border-b border-text-main" : "text-text-dim border-b border-border-default"
              }`}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 py-2 text-sm ${
                mode === "register" ? "text-text-main border-b border-text-main" : "text-text-dim border-b border-border-default"
              }`}
            >
              注册
            </button>
          </div>

          {/* 昵称 */}
          <div className="space-y-1.5">
            <label className="text-xs text-text-dim block">昵称</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={12}
              placeholder="2-12 个字符"
              className="input w-full px-3 py-2.5 text-sm"
              autoFocus
            />
          </div>

          {/* 密码 */}
          <div className="space-y-1.5">
            <label className="text-xs text-text-dim block">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 4 位"
              className="input w-full px-3 py-2.5 text-sm"
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <p className="text-xs" style={{ color: "#e8475a" }}>
              {error}
            </p>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={loading || !nickname.trim() || !password}
            className="btn-p2 w-full py-2.5 text-sm"
          >
            {loading ? "..." : mode === "login" ? "登录" : "注册"}
          </button>
        </form>

        {/* 游客 */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border-default" />
          <span className="text-xs text-text-dim">或</span>
          <div className="flex-1 h-px bg-border-default" />
        </div>

        <button
          onClick={handleGuest}
          disabled={loading}
          className="btn w-full py-2.5 text-sm"
        >
          游客登录
        </button>

        <p className="text-center text-xs text-text-dim">
          在线联机 / 双人对战
        </p>
      </div>
    </main>
  );
}
