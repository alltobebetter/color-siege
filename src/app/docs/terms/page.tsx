export default function TermsPage() {
  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl text-text-main">服务条款</h1>
          <p className="text-xs text-text-dim">最后更新：2025 年 7 月 9 日</p>
        </div>

        <div className="card p-6 space-y-6 text-sm leading-relaxed text-text-dim">
          <section className="space-y-2">
            <h2 className="text-base text-text-main">1. 服务说明</h2>
            <p>
              Color Siege 是一款免费的在线双人对战游戏，由开发者（以下简称「我们」）提供。本服务包括游戏大厅、实时对战、账号系统等功能。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base text-text-main">2. 用户注册与账号</h2>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>用户可选择注册账号或以游客身份游玩</li>
              <li>注册时需提供昵称（2-12 字符）和密码（至少 4 位）</li>
              <li>昵称不得包含侮辱、歧视、违法内容，否则我们有权强制修改</li>
              <li>用户应妥善保管账号密码，因密码泄露导致的损失由用户自行承担</li>
              <li>游客身份的会话有效期为 7 天，注册用户为 30 天</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base text-text-main">3. 用户行为规范</h2>
            <p>用户在使用本服务时，不得进行以下行为：</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>利用游戏漏洞进行作弊</li>
              <li>使用外挂、脚本等非正常手段</li>
              <li>发送垃圾信息或骚扰其他玩家</li>
              <li>冒充他人或虚构身份</li>
              <li>从事任何违反法律法规的活动</li>
            </ul>
            <p className="text-xs">
              违反上述规定的用户，我们有权采取限制功能、封禁账号等措施。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base text-text-main">4. 知识产权</h2>
            <p>
              本游戏的代码、美术、设计等内容版权归开发者所有。游戏源代码基于开源协议发布在 GitHub，使用者需遵守相关开源协议。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base text-text-main">5. 免责声明</h2>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>本服务按「现状」提供，我们不保证服务的不间断运行或无错误</li>
              <li>因网络故障、服务器维护等原因导致的服务中断，我们不承担责任</li>
              <li>游戏数据（如战绩）可能因技术原因丢失，我们不保证数据永久保存</li>
              <li>因用户自身原因（如密码泄露）导致的损失，我们不承担责任</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base text-text-main">6. 服务变更与终止</h2>
            <p>
              我们保留随时修改、暂停或终止本服务的权利。服务终止时，我们将尽可能提前通知用户。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base text-text-main">7. 适用法律</h2>
            <p>
              本条款的解释和适用均遵循中华人民共和国法律。因本服务产生的争议，双方应友好协商解决。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base text-text-main">8. 联系方式</h2>
            <p>
              如对本服务条款有任何疑问，请通过 GitHub Issues 联系我们：
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
