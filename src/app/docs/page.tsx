export default function DocsPage() {
  const docs = [
    {
      title: "如何游玩",
      href: "/docs/how-to-play",
      desc: "基础操作、技能系统、围地机制、进阶技巧",
      icon: "▶",
    },
    {
      title: "隐私政策",
      href: "/docs/privacy",
      desc: "我们如何收集、使用和保护您的信息",
      icon: "◆",
    },
    {
      title: "服务条款",
      href: "/docs/terms",
      desc: "使用本游戏需要遵守的规则和条款",
      icon: "■",
    },
  ];

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* 标题 */}
        <div className="space-y-1">
          <h1 className="text-2xl tracking-tight text-text-main">文档</h1>
          <p className="text-xs text-text-dim">Color Siege 文档中心</p>
        </div>

        {/* 文档列表 */}
        <div className="space-y-2">
          {docs.map((doc) => (
            <a
              key={doc.href}
              href={doc.href}
              className="card block p-4 transition-colors hover:border-text-dim"
            >
              <div className="flex items-start gap-3">
                <span className="text-text-dim text-sm mt-0.5">{doc.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-main">{doc.title}</div>
                  <div className="text-xs text-text-dim mt-0.5">{doc.desc}</div>
                </div>
                <span className="text-text-dim text-xs">→</span>
              </div>
            </a>
          ))}
        </div>

        {/* 返回 */}
        <div className="flex justify-center gap-2">
          <a href="/lobby" className="btn px-5 py-2 text-xs">
            返回大厅
          </a>
          <a href="/" className="btn px-5 py-2 text-xs">
            首页
          </a>
        </div>

        <p className="text-center text-xs text-text-dim">
          Color Siege © 2025
        </p>
      </div>
    </main>
  );
}
