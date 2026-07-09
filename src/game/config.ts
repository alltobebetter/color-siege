/**
 * 共享配置
 * 将来接入登录系统时，这里可以扩展用户认证相关配置
 */
export const PARTY_HOST =
  process.env.NEXT_PUBLIC_PARTYKIT_HOST ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "127.0.0.1:1999"
    : "color-siege.your-name.partykit.dev");

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
