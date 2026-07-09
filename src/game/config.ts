/**
 * 共享配置
 */
export const WS_HOST =
  process.env.NEXT_PUBLIC_WS_HOST ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "localhost:8787"
    : "color-siege.alltobebetter.workers.dev");
