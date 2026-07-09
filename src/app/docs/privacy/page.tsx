export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl text-text-main">隐私政策</h1>
          <p className="text-xs text-text-dim">最后更新：2025 年 7 月 9 日</p>
        </div>

        <div className="card p-6 space-y-6 text-sm leading-relaxed text-text-dim">
          <section className="space-y-2">
            <h2 className="text-base text-text-main">1. 概述</h2>
            <p>
              Color Siege（以下简称「本游戏」）是一款在线双人对战游戏。我们尊重并保护用户的隐私。本政策说明我们收集、使用和保护用户信息的方式。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base text-text-main">2. 我们收集的信息</h2>
            <p>我们仅收集以下必要信息：</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong className="text-text-main">昵称</strong> — 用于游戏内显示，可选择注册账号或使用游客身份</li>
              <li><strong className="text-text-main">账号凭证</strong> — 注册用户密码经 bcrypt 哈希存储，不以明文保存</li>
              <li><strong className="text-text-main">游戏数据</strong> — 房间号、游戏状态等实时数据，仅在游戏期间存在</li>
            </ul>
            <p className="text-xs">我们不收集您的真实姓名、邮箱、电话、位置信息或设备信息。</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base text-text-main">3. 信息的使用</h2>
            <p>收集的信息仅用于：</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>识别玩家身份并在游戏中显示昵称</li>
              <li>维持游戏的实时对战功能</li>
              <li>防止作弊和恶意行为</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base text-text-main">4. 数据存储</h2>
            <p>
              用户账号信息存储在 Turso（基于 LibSQL）数据库中。游戏实时数据存储在 Cloudflare Workers 的 Durable Objects 中，游戏结束后状态即清除。
            </p>
            <p className="text-xs">
              Cookie 用于维持登录会话（JWT Token），有效期 7 天（游客）或 30 天（注册用户）。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base text-text-main">5. 信息共享</h2>
            <p>
              我们不会将您的个人信息出售、出租或交易给第三方。除以下情况外，我们不会与任何第三方共享您的信息：
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>经您明确同意</li>
              <li>法律法规要求或司法/行政机关强制要求</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base text-text-main">6. 数据安全</h2>
            <p>
              我们采取合理的技术措施保护您的信息安全，包括密码哈希存储、JWT 签名验证等。但请注意，互联网传输无法保证 100% 安全。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base text-text-main">7. 您的权利</h2>
            <p>您有权：</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>访问和修改您的昵称</li>
              <li>注销账号（联系管理员）</li>
              <li>选择使用游客身份游玩（无需注册）</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base text-text-main">8. 未成年人</h2>
            <p>
              本游戏面向一般用户，不专门针对未成年人。如果您是未成年人，请在监护人指导下使用。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base text-text-main">9. 政策更新</h2>
            <p>
              我们可能不时更新本隐私政策。更新后的政策将在本页面发布，继续使用本游戏即表示您同意更新后的政策。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base text-text-main">10. 联系我们</h2>
            <p>
              如对本隐私政策有任何疑问，请通过 GitHub Issues 联系我们：
              <a href="https://github.com/alltobebetter/color-siege/issues" target="_blank" rel="noopener noreferrer" className="text-text-main underline ml-1">
                color-siege/issues
              </a>
            </p>
          </section>
        </div>

        <div className="text-center">
          <a href="/docs" className="btn inline-block px-5 py-2 text-xs">
            返回文档
          </a>
        </div>
      </div>
    </main>
  );
}
