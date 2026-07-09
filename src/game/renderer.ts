import {
  GRID_SIZE,
  CELL_SIZE,
  CANVAS_SIZE,
  PLAYER_COLORS,
  POWERUP_COLORS,
  POWERUP_ICONS,
} from "../game/constants";
import type { SerializedState, PlayerColor } from "../game/types";

export class GameRenderer {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = CANVAS_SIZE;
    this.canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available");
    this.ctx = ctx;
  }

  render(state: SerializedState | null, myColor: PlayerColor | null) {
    const { ctx } = this;

    // 背景
    ctx.fillStyle = PLAYER_COLORS.empty;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    if (!state) {
      this.drawCenterText("等待连接...", "#6b6b78");
      return;
    }

    // 格子
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = state.grid[y][x];
        const px = x * CELL_SIZE;
        const py = y * CELL_SIZE;

        if (cell === -1) {
          ctx.fillStyle = PLAYER_COLORS.obstacle;
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        } else if (cell === 1) {
          ctx.fillStyle = PLAYER_COLORS[1].main;
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        } else if (cell === 2) {
          ctx.fillStyle = PLAYER_COLORS[2].main;
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        } else {
          // 空格 — 极淡棋盘格
          ctx.fillStyle = (x + y) % 2 === 0 ? PLAYER_COLORS.empty : PLAYER_COLORS.emptyLight;
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        }
      }
    }

    // 网格线
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE + 0.5, 0);
      ctx.lineTo(i * CELL_SIZE + 0.5, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE + 0.5);
      ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE + 0.5);
      ctx.stroke();
    }

    const now = Date.now();

    // 护盾 — 在己方所有格子上绘制金色脉动边框
    for (let c = 1 as PlayerColor; c <= 2; c = (c + 1) as PlayerColor) {
      const p = state.players[c as 1 | 2];
      if (!p) continue;
      const hasShield = p.shieldUntil > now;
      if (!hasShield) continue;

      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          if (state.grid[y][x] !== c) continue;
          const px = x * CELL_SIZE;
          const py = y * CELL_SIZE;

          const pulse = 0.5 + 0.5 * Math.sin(now * 0.006);
          ctx.strokeStyle = `rgba(240, 192, 80, ${0.5 + 0.4 * pulse})`;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px + 1.5, py + 1.5, CELL_SIZE - 3, CELL_SIZE - 3);
        }
      }
    }

    // 道具
    for (const pu of state.powerUps) {
      this.drawPowerUp(pu.x, pu.y, pu.type);
    }

    // 特效
    for (const eff of state.effects) {
      const age = now - eff.startTime;
      if (age > 1500) continue;
      this.drawEffect(eff, age);
    }

    // 玩家
    for (let c = 1 as PlayerColor; c <= 2; c = (c + 1) as PlayerColor) {
      const p = state.players[c as 1 | 2];
      if (!p) continue;
      this.drawPlayer(p.x, p.y, c as PlayerColor, p.shieldUntil > now, p.dir);
    }

    // 状态遮罩
    if (state.status === "waiting") {
      this.drawWaitingOverlay(state);
    } else if (state.status === "countdown") {
      this.drawCountdown(state);
    } else if (state.status === "ended") {
      this.drawEndScreen(state, myColor);
    }
  }

  drawPlayer(
    gx: number, gy: number,
    color: PlayerColor, hasShield: boolean, dir: string
  ) {
    const { ctx } = this;
    const cx = gx * CELL_SIZE + CELL_SIZE / 2;
    const cy = gy * CELL_SIZE + CELL_SIZE / 2;
    const r = CELL_SIZE * 0.35;
    const colors = PLAYER_COLORS[color];

    // 护盾 — 金色脉动光环
    if (hasShield) {
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.006);
      ctx.strokeStyle = `rgba(240, 192, 80, ${0.6 + 0.4 * pulse})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - r - 3, cy - r - 3, r * 2 + 6, r * 2 + 6);
    }

    // 主体 — 方块而非圆形，更像素风
    ctx.fillStyle = colors.main;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    // 内部亮色
    ctx.fillStyle = colors.light;
    ctx.fillRect(cx - r + 2, cy - r + 2, r * 2 - 8, 3);

    // 方向指示 — 小三角
    ctx.fillStyle = "#fff";
    const off = r * 0.55;
    let dx = 0, dy = 0;
    if (dir === "up") dy = -off;
    else if (dir === "down") dy = off;
    else if (dir === "left") dx = -off;
    else if (dir === "right") dx = off;
    ctx.fillRect(cx + dx - 2, cy + dy - 2, 4, 4);
  }

  drawPowerUp(gx: number, gy: number, type: string) {
    const { ctx } = this;
    const cx = gx * CELL_SIZE + CELL_SIZE / 2;
    const cy = gy * CELL_SIZE + CELL_SIZE / 2;
    const s = CELL_SIZE * 0.5;
    const color = POWERUP_COLORS[type] || "#fff";
    const icon = POWERUP_ICONS[type] || "?";

    // 方块底
    ctx.fillStyle = color;
    ctx.fillRect(cx - s / 2, cy - s / 2, s, s);

    // 字母
    ctx.fillStyle = "#0e0e12";
    ctx.font = `bold ${CELL_SIZE * 0.4}px "Unifont", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(icon, cx, cy);
  }

  drawEffect(
    eff: { type: string; x: number; y: number; startTime: number; color?: number },
    age: number
  ) {
    const { ctx } = this;
    const cx = eff.x * CELL_SIZE + CELL_SIZE / 2;
    const cy = eff.y * CELL_SIZE + CELL_SIZE / 2;
    const progress = age / 1500;

    if (eff.type === "explosion") {
      const r = CELL_SIZE * 2.5 * progress;
      const color = eff.color === 1 ? PLAYER_COLORS[1].main : PLAYER_COLORS[2].main;
      ctx.globalAlpha = (1 - progress) * 0.5;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (eff.type === "flip") {
      ctx.globalAlpha = (1 - progress) * 0.4;
      ctx.fillStyle = "#fff";
      ctx.fillRect(
        cx - CELL_SIZE / 2, cy - CELL_SIZE / 2,
        CELL_SIZE, CELL_SIZE
      );
      ctx.globalAlpha = 1;
    } else if (eff.type === "dash") {
      const color = eff.color === 1 ? PLAYER_COLORS[1].main : PLAYER_COLORS[2].main;
      ctx.globalAlpha = (1 - progress) * 0.4;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(
        cx - CELL_SIZE * (0.5 + progress),
        cy - CELL_SIZE * (0.5 + progress),
        CELL_SIZE * (1 + progress * 2),
        CELL_SIZE * (1 + progress * 2)
      );
      ctx.globalAlpha = 1;
    } else if (eff.type === "pickup") {
      ctx.globalAlpha = (1 - progress) * 0.5;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(
        cx - CELL_SIZE * (0.3 + progress),
        cy - CELL_SIZE * (0.3 + progress),
        CELL_SIZE * (0.6 + progress * 2),
        CELL_SIZE * (0.6 + progress * 2)
      );
      ctx.globalAlpha = 1;
    }
  }

  drawCenterText(text: string, color: string, size = 16) {
    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.font = `${size}px "Unifont", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, CANVAS_SIZE / 2, CANVAS_SIZE / 2);
  }

  drawWaitingOverlay(state: SerializedState) {
    const { ctx } = this;
    ctx.fillStyle = "rgba(14,14,18,0.8)";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const p1 = state.players[1];
    const p2 = state.players[2];

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (p1 && p2) {
      // 双方都在 — 显示准备状态
      ctx.font = '14px "Unifont", monospace';
      ctx.fillStyle = "#d4d4dc";
      const p1Status = p1.ready ? "[ ready ]" : "[ ... ]";
      const p2Status = p2.ready ? "[ ready ]" : "[ ... ]";
      ctx.fillStyle = PLAYER_COLORS[1].main;
      ctx.fillText(`${p1.name} ${p1Status}`, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 20);
      ctx.fillStyle = PLAYER_COLORS[2].main;
      ctx.fillText(`${p2.name} ${p2Status}`, CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 10);
      ctx.fillStyle = "#6b6b78";
      ctx.font = '12px "Unifont", monospace';
      ctx.fillText("双方准备后开始", CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 40);
    } else {
      ctx.font = '14px "Unifont", monospace';
      ctx.fillStyle = "#6b6b78";
      ctx.fillText("等待对手加入...", CANVAS_SIZE / 2, CANVAS_SIZE / 2);
    }
  }

  drawCountdown(state: SerializedState) {
    const { ctx } = this;
    const remaining = Math.max(0, state.countdownEnd - Date.now());
    const seconds = Math.ceil(remaining / 1000);

    ctx.fillStyle = "rgba(14,14,18,0.6)";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.fillStyle = "#d4d4dc";
    ctx.font = 'bold 64px "Unifont", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(seconds), CANVAS_SIZE / 2, CANVAS_SIZE / 2);
  }

  drawEndScreen(state: SerializedState, myColor: PlayerColor | null) {
    const { ctx } = this;
    ctx.fillStyle = "rgba(14,14,18,0.85)";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let resultText = "";
    let resultColor = "#d4d4dc";

    if (state.winner === null) {
      resultText = "DRAW";
      resultColor = "#6b6b78";
    } else if (myColor === state.winner) {
      resultText = "WIN";
      resultColor = PLAYER_COLORS[state.winner].main;
    } else if (myColor !== null) {
      resultText = "LOSE";
      resultColor = PLAYER_COLORS[state.winner === 1 ? 2 : 1].main;
    } else {
      resultText = state.winner === 1 ? "P1 WIN" : "P2 WIN";
      resultColor = PLAYER_COLORS[state.winner!].main;
    }

    ctx.fillStyle = resultColor;
    ctx.font = 'bold 36px "Unifont", monospace';
    ctx.fillText(resultText, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 25);

    // 比分
    ctx.fillStyle = "#d4d4dc";
    ctx.font = '14px "Unifont", monospace';
    const p1 = state.players[1];
    const p2 = state.players[2];
    if (p1 && p2) {
      ctx.fillStyle = PLAYER_COLORS[1].main;
      ctx.fillText(`${p1.name}  ${this.countCells(state, 1)}`, CANVAS_SIZE / 2 - 60, CANVAS_SIZE / 2 + 20);
      ctx.fillStyle = "#6b6b78";
      ctx.fillText(":", CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 20);
      ctx.fillStyle = PLAYER_COLORS[2].main;
      ctx.fillText(`${this.countCells(state, 2)}  ${p2.name}`, CANVAS_SIZE / 2 + 60, CANVAS_SIZE / 2 + 20);
    }
  }

  countCells(state: SerializedState, color: number): number {
    let count = 0;
    for (const row of state.grid) {
      for (const cell of row) {
        if (cell === color) count++;
      }
    }
    return count;
  }
}
