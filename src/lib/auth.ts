import { NextResponse } from "next/server";
import { createHash, randomBytes, createHmac } from "crypto";

/**
 * 密码哈希工具
 * 使用 PBKDF2-like 方案：salt + HMAC-SHA256
 * 简单轻量，不依赖外部库
 */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256")
    .update(salt + password)
    .digest("hex");
  // 多轮迭代增加强度
  let final = hash;
  for (let i = 0; i < 1000; i++) {
    final = createHash("sha256").update(final + salt).digest("hex");
  }
  return `${salt}:${final}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  let final = createHash("sha256")
    .update(salt + password)
    .digest("hex");
  for (let i = 0; i < 1000; i++) {
    final = createHash("sha256").update(final + salt).digest("hex");
  }
  return final === hash;
}

export function generateId(): string {
  return randomBytes(12).toString("hex");
}

/**
 * 简易 JWT 签发/验证
 * 不依赖外部库，用 Node crypto 实现
 */

export interface TokenPayload {
  userId: string;
  nickname: string;
  isGuest: boolean;
}

const SECRET = process.env.JWT_SECRET || "fallback-secret";

function base64urlEncode(data: string): string {
  return Buffer.from(data)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(data: string): string {
  const padded = data + "=".repeat((4 - (data.length % 4)) % 4);
  return Buffer.from(
    padded.replace(/-/g, "+").replace(/_/g, "/"),
    "base64"
  ).toString("utf8");
}

export function signToken(payload: TokenPayload): string {
  const header = base64urlEncode(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  );
  const body = base64urlEncode(
    JSON.stringify({ ...payload, iat: Date.now() })
  );
  const signature = createHmac("sha256", SECRET)
    .update(`${header}.${body}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const [header, body, signature] = token.split(".");
    if (!header || !body || !signature) return null;

    const expectedSig = createHmac("sha256", SECRET)
      .update(`${header}.${body}`)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    if (signature !== expectedSig) return null;

    const payload = JSON.parse(base64urlDecode(body));
    return {
      userId: payload.userId,
      nickname: payload.nickname,
      isGuest: payload.isGuest,
    };
  } catch {
    return null;
  }
}

/** 从请求中提取用户信息 */
export function getUserFromRequest(
  req: Request
): TokenPayload | null {
  // 优先从 Authorization header 取
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    return verifyToken(token);
  }

  // 其次从 cookie 取
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/token=([^;]+)/);
  if (match) {
    return verifyToken(match[1]);
  }

  return null;
}

/** 设置认证 cookie 到 NextResponse */
export function setAuthCookie(res: NextResponse, token: string, maxAge: number): void {
  res.cookies.set("token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge,
    path: "/",
  });
}
