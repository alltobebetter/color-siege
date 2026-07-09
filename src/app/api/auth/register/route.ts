import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { hashPassword, generateId, signToken, setAuthCookie } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { nickname, password } = await req.json();

    if (!nickname || typeof nickname !== "string") {
      return NextResponse.json({ error: "昵称不能为空" }, { status: 400 });
    }
    if (nickname.length < 2 || nickname.length > 12) {
      return NextResponse.json({ error: "昵称 2-12 个字符" }, { status: 400 });
    }
    if (!password || password.length < 4) {
      return NextResponse.json({ error: "密码至少 4 位" }, { status: 400 });
    }

    await initDb();
    const db = getDb();

    // 检查昵称是否已存在
    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE nickname = ?",
      args: [nickname],
    });
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "昵称已被占用" }, { status: 409 });
    }

    // 创建用户
    const userId = generateId();
    const passwordHash = hashPassword(password);
    const now = Date.now();

    await db.batch([
      {
        sql: "INSERT INTO users (id, nickname, password_hash, created_at) VALUES (?, ?, ?, ?)",
        args: [userId, nickname, passwordHash, now],
      },
      {
        sql: "INSERT INTO user_stats (user_id, wins, losses, total_score, updated_at) VALUES (?, 0, 0, 0, ?)",
        args: [userId, now],
      },
    ]);

    const token = signToken({
      userId,
      nickname,
      isGuest: false,
    });

    const res = NextResponse.json({
      userId,
      nickname,
      token,
    });
    setAuthCookie(res, token, 60 * 60 * 24 * 30); // 30 天
    return res;
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
