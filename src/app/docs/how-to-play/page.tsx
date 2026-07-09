"use client";

import { useState } from "react";

type Tab = "basics" | "skills" | "siege" | "tips";

export default function HowToPlayPage() {
  const [tab, setTab] = useState<Tab>("basics");

  const tabs: { id: Tab; label: string }[] = [
    { id: "basics", label: "基础玩法" },
    { id: "skills", label: "技能系统" },
    { id: "siege", label: "围地机制" },
    { id: "tips", label: "进阶技巧" },
  ];

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 标题 */}
        <div className="space-y-1">
          <h1 className="text-2xl text-text-main">如何游玩</h1>
          <p className="text-xs text-text-dim">Color Siege 玩法指南</p>
        </div>

        {/* 标签栏 */}
        <div className="flex gap-1 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 text-xs transition-colors ${
                tab === t.id
                  ? "bg-surface2 text-text-main border-border-default"
                  : "text-text-dim hover:text-text-main"
              } border`}
              style={{
                background: tab === t.id ? "var(--surface-2)" : "var(--surface)",
                borderColor: tab === t.id ? "#3a3a4a" : "var(--border)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 内容 */}
        <div className="card p-6 space-y-4 text-sm leading-relaxed text-text-main">
          {tab === "basics" && <Basics />}
          {tab === "skills" && <Skills />}
          {tab === "siege" && <Siege />}
          {tab === "tips" && <Tips />}
        </div>

        {/* 返回 */}
        <div className="text-center">
          <a href="/lobby" className="btn inline-block px-5 py-2 text-xs">
            返回大厅
          </a>
        </div>
      </div>
    </main>
  );
}

function Basics() {
  return (
    <>
      <h2 className="text-lg text-text-main">游戏目标</h2>
      <p className="text-text-dim">
        在 90 秒内，通过移动涂色争夺地图格子的控制权。时间结束时，涂色面积更大的一方获胜。
      </p>

      <h2 className="text-lg text-text-main pt-2">操作方式</h2>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {["W", "A", "S", "D"].map((k) => (
              <kbd key={k} className="kbd">{k}</kbd>
            ))}
          </div>
          <span className="text-text-dim">或方向键 — 移动角色</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {["1", "2", "3"].map((k) => (
              <kbd key={k} className="kbd">{k}</kbd>
            ))}
          </div>
          <span className="text-text-dim">或 Q / E / R — 使用技能</span>
        </div>
      </div>

      <h2 className="text-lg text-text-main pt-2">基本规则</h2>
      <ul className="space-y-2 text-text-dim list-disc list-inside">
        <li>角色每移动一格，经过的格子会变成你的颜色</li>
        <li>地图中有固定的障碍物，无法通过也无法涂色</li>
        <li>双方都点击「准备」后，3 秒倒计时开始游戏</li>
        <li>90 秒后游戏结束，涂色面积大者获胜</li>
        <li>游戏中途断线，15 秒内重连可继续游戏</li>
      </ul>

      <div className="flex gap-4 pt-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3" style={{ background: "#e8475a" }} />
          <span className="text-xs">玩家 1（红）</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3" style={{ background: "#4a6cf7" }} />
          <span className="text-xs">玩家 2（蓝）</span>
        </div>
      </div>
    </>
  );
}

function Skills() {
  const skills = [
    {
      name: "冲刺",
      hotkey: "1 / Q",
      cooldown: "8 秒",
      color: "#4a6cf7",
      desc: "朝当前方向快速移动 3 格，沿途涂色。适合快速占领新区域或逃离危险。",
    },
    {
      name: "炸弹",
      hotkey: "2 / E",
      cooldown: "12 秒",
      color: "#e8475a",
      desc: "以自身为中心 5×5 范围内，所有格子变成你的颜色。如果对方有护盾则无法翻转其格子。",
    },
    {
      name: "护盾",
      hotkey: "3 / R",
      cooldown: "18 秒",
      color: "#f0c050",
      desc: "持续 5 秒，期间你所有格子免疫围地翻转和炸弹伤害。金色脉动边框表示护盾生效中。",
    },
  ];

  return (
    <>
      <h2 className="text-lg text-text-main">三种技能</h2>
      <p className="text-text-dim">
        每个技能有独立冷却时间，合理搭配是制胜关键。
      </p>
      <div className="space-y-3">
        {skills.map((s) => (
          <div key={s.name} className="border border-border-default p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-text-main font-bold" style={{ color: s.color }}>
                {s.name}
              </span>
              <span className="text-xs text-text-dim">冷却 {s.cooldown}</span>
            </div>
            <div className="text-xs text-text-dim">快捷键: {s.hotkey}</div>
            <p className="text-xs text-text-dim pt-1">{s.desc}</p>
          </div>
        ))}
      </div>

      <h2 className="text-lg text-text-main pt-2">道具系统</h2>
      <p className="text-text-dim">
        游戏中会随机刷新道具，拾取后获得一次性增益：
      </p>
      <ul className="space-y-1.5 text-text-dim list-disc list-inside text-xs">
        <li><span className="text-text-main">S 加速</span> — 减少移动冷却 2 秒 + 技能冷却 3 秒</li>
        <li><span className="text-text-main">B 炸弹</span> — 立即重置炸弹冷却</li>
        <li><span className="text-text-main">D 护盾</span> — 获得 3 秒护盾</li>
        <li><span className="text-text-main">E 扩张</span> — 周围 3×3 范围涂色</li>
      </ul>
    </>
  );
}

function Siege() {
  return (
    <>
      <h2 className="text-lg text-text-main">围地机制（核心玩法）</h2>
      <p className="text-text-dim">
        Color Siege 的核心创新机制，借鉴围棋的「气」概念。
      </p>

      <h3 className="text-base text-text-main pt-2">什么是「气」？</h3>
      <p className="text-text-dim">
        每个对方格子的连通群，如果相邻有空格，就说明它还有「气」（还活着）。
        当一个群<strong className="text-text-main">完全没有空格相邻</strong>时（被你的颜色完全包围），就会触发围地翻转。
      </p>

      <h3 className="text-base text-text-main pt-2">翻转效果</h3>
      <p className="text-text-dim">
        被围杀的格子群会全部翻转成你的颜色。这可以瞬间逆转局势！
      </p>

      <h3 className="text-base text-text-main pt-2">如何围杀</h3>
      <ul className="space-y-1.5 text-text-dim list-disc list-inside text-xs">
        <li>找到对方的一块连通领地</li>
        <li>用你的颜色填满它周围的所有空格</li>
        <li>当对方格子群没有任何空格相邻时，触发翻转</li>
      </ul>

      <div className="border border-border-default p-3 mt-2">
        <p className="text-xs text-text-dim">
          <strong className="text-text-main">注意：</strong>
          绕外圈走一圈不会翻转内部格子！因为内部仍有空格（有气）。
          必须真正填满所有空隙才能完成围杀。
        </p>
      </div>

      <h3 className="text-base text-text-main pt-2">护盾克制</h3>
      <p className="text-text-dim">
        如果对方启用了护盾，围地检测会被跳过——即使完全包围也无法翻转。
        等护盾消失后再完成围杀。
      </p>
    </>
  );
}

function Tips() {
  return (
    <>
      <h2 className="text-lg text-text-main">进阶技巧</h2>

      <h3 className="text-base text-text-main pt-2">开局策略</h3>
      <ul className="space-y-1.5 text-text-dim list-disc list-inside text-xs">
        <li>快速向中心区域移动，抢占战略要地</li>
        <li>利用冲刺技能在开局快速铺开领地</li>
        <li>注意地图中央的十字障碍物，它可以作为天然屏障</li>
      </ul>

      <h3 className="text-base text-text-main pt-2">中期运营</h3>
      <ul className="space-y-1.5 text-text-dim list-disc list-inside text-xs">
        <li>观察对方的领地分布，寻找围杀机会</li>
        <li>炸弹可以同时涂色和切断对方领地连通性</li>
        <li>在对方领地周围留空格，等时机成熟再一口气填满围杀</li>
        <li>拾取道具可以获得关键时刻的优势</li>
      </ul>

      <h3 className="text-base text-text-main pt-2">防守要点</h3>
      <ul className="space-y-1.5 text-text-dim list-disc list-inside text-xs">
        <li>保持己方领地有「气」（不要让所有相邻格子都被对方占领）</li>
        <li>对方使用炸弹时，如果格子即将被围，立即开护盾</li>
        <li>不要让自己的领地被分割成孤立的小块</li>
      </ul>

      <h3 className="text-base text-text-main pt-2">终局冲刺</h3>
      <ul className="space-y-1.5 text-text-dim list-disc list-inside text-xs">
        <li>最后 10 秒，优先抢占空格而非围地</li>
        <li>炸弹和冲刺可以在最后时刻快速涂色翻盘</li>
        <li>如果领先，用护盾保护己方领地不被围杀</li>
      </ul>
    </>
  );
}
