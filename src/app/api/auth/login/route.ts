import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { verifyPassword, signToken, setAuthCookie } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { nickname, password } = await req.json();

    if (!nickname || !password) {
      return NextResponse.json({ error: "昵称和密码不能为空" }, { status: 400 });
    }

    await initDb();
    const db = getDb();

    const result = await db.execute({
      sql: "SELECT id, nickname, password_hash FROM users WHERE nickname = ?",
      args: [nickname],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    const user = result.rows[0];
    const valid = verifyPassword(password, user.password_hash as string);
    if (!valid) {
      return NextResponse.json({ error: "密码错误" }, { status: 401 });
    }

    const token = signToken({
      userId: user.id as string,
      nickname: user.nickname as string,
      isGuest: false,
    });

    const res = NextResponse.json({
      userId: user.id,
      nickname: user.nickname,
      token,
    });
    setAuthCookie(res, token, 60 * 60 * 24 * 30);
    return res;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
