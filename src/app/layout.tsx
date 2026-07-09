import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "色彩围攻 Color Siege",
  description: "涂色 + 围棋围地机制的创新多人对战游戏",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body className="text-white antialiased">{children}</body>
    </html>
  );
}
