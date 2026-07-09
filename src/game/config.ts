/**
 * 共享配置
 */
export const WS_HOST =
  process.env.NEXT_PUBLIC_WS_HOST ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "localhost:8787"
    : "color-siege.alltobebetter.workers.dev");

/**
 * 生成游客昵称
 * 格式: Guest + 4位随机大写字母数字
 */
export function generateGuestName(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 4; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return `Guest${id}`;
}
