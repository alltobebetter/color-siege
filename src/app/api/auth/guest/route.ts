import { NextRequest, NextResponse } from "next/server";
import { generateId, signToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADJ = [
  "Swift", "Brave", "Calm", "Quick", "Bold", "Sharp", "Wild", "Clever",
  "Fierce", "Solid", "Bright", "Dark", "Neon", "Frost", "Blaze", "Storm",
];
const NOUN = [
  "Fox", "Wolf", "Hawk", "Bear", "Cat", "Lion", "Shark", "Raven",
  "Tiger", "Owl", "Snake", "Bull", "Eagle", "Crab", "Dove", "Lynx",
];

export async function POST() {
  const adj = ADJ[Math.floor(Math.random() * ADJ.length)];
  const noun = NOUN[Math.floor(Math.random() * NOUN.length)];
  const num = Math.floor(Math.random() * 100);
  const nickname = `${adj}${noun}${num}`;

  const userId = generateId();
  const token = signToken({
    userId,
    nickname,
    isGuest: true,
  });

  const res = NextResponse.json({
    userId,
    nickname,
    token,
  });
  res.cookies.set("token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 游客 7 天
    path: "/",
  });
  return res;
}
