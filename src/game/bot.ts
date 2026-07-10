/**
 * AI Bot 决策模块
 *
 * 三档难度：
 * - easy:   70% 随机移动，偶尔用技能，无策略意识
 * - medium: 贪心策略，优先涂空格和抢占对方区域，合理使用技能
 * - hard:   在 medium 基础上增加围地意识、逃跑意识、道具拾取
 */

import { GRID_SIZE, DIR_VECTORS } from "./constants";
import { isWalkable, inBounds } from "./grid";
import type {
  GameState,
  PlayerColor,
  Direction,
  SkillType,
  Grid,
} from "./types";

export type BotDifficulty = "easy" | "medium" | "hard";

export interface BotAction {
  move?: Direction;
  skill?: SkillType;
}

const DIRECTIONS: Direction[] = ["up", "down", "left", "right"];

/** 生成看起来像真人的 Bot 名称 */
const BOT_NAMES = [
  "红蓝对决", "涂色达人", "围地高手", "色彩猎人",
  "地盘王", "格子骑士", "围攻专家", "像素战士",
  "彩虹漫步", "领域领主", "色彩风暴", "边界突破",
  "围城之主", "涂鸦画手", "方格霸主", "极速涂色",
  "战略大师", "领地收割", "色彩魔术师", "围杀之王",
];

export function getBotName(): string {
  return BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
}

/** 随机选取一个可走方向 */
function randomWalkableDir(
  grid: Grid,
  x: number,
  y: number
): Direction | null {
  const walkable = DIRECTIONS.filter((d) => {
    const { dx, dy } = DIR_VECTORS[d];
    return isWalkable(grid, x + dx, y + dy);
  });
  if (walkable.length === 0) return null;
  return walkable[Math.floor(Math.random() * walkable.length)];
}

/**
 * 评估某个方向的「价值」
 * 统计前方一定范围内：空格数(+)、对方格子数(+)、己方格子数(-)、障碍(-)
 */
function evaluateDirection(
  grid: Grid,
  x: number,
  y: number,
  dir: Direction,
  color: PlayerColor,
  range: number
): number {
  const { dx, dy } = DIR_VECTORS[dir];
  const opponent = color === 1 ? 2 : 1;
  let score = 0;
  let reached = 0;

  for (let i = 1; i <= range; i++) {
    const nx = x + dx * i;
    const ny = y + dy * i;
    if (!inBounds(nx, ny)) break;
    const cell = grid[ny][nx];
    if (cell === -1) {
      score -= 3;
      break; // 障碍挡路
    }
    reached++;
    if (cell === 0) score += 2; // 空格最有价值
    else if (cell === opponent) score += 1.5; // 对方格子可抢
    else if (cell === color) score -= 0.5; // 己方格子价值低
  }

  // 如果一步都走不了，很差
  if (reached === 0) return -100;

  // 检查侧面是否有开阔空间（避免走入死胡同）
  let sideOpenness = 0;
  for (let i = 0; i <= Math.min(range, 2); i++) {
    const cx = x + dx * i;
    const cy = y + dy * i;
    if (!inBounds(cx, cy)) break;
    // 左右两侧
    for (const [sdx, sdy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const sx = cx + sdx;
      const sy = cy + sdy;
      if (inBounds(sx, sy) && grid[sy][sx] !== -1) {
        sideOpenness += 0.2;
      }
    }
  }
  score += sideOpenness;

  return score;
}

/**
 * 计算某个位置周围的「气」（可逃方向数）
 * 用于检测是否正在被围
 */
function countLiberties(grid: Grid, x: number, y: number): number {
  let liberties = 0;
  for (const d of DIRECTIONS) {
    const { dx, dy } = DIR_VECTORS[d];
    if (isWalkable(grid, x + dx, y + dy)) {
      liberties++;
    }
  }
  return liberties;
}

/**
 * 检查对方是否正在被围（气很少）
 */
function opponentInDanger(
  grid: Grid,
  oppX: number,
  oppY: number
): boolean {
  return countLiberties(grid, oppX, oppY) <= 1;
}

/**
 * 统计炸弹范围内对方格子数
 */
function countBombTargets(
  grid: Grid,
  x: number,
  y: number,
  opponent: PlayerColor
): number {
  let count = 0;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(nx, ny)) continue;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 2) continue;
      if (grid[ny][nx] === opponent) count++;
    }
  }
  return count;
}

/**
 * 检查前方是否有连续空格（适合冲刺）
 */
function dashOpportunity(
  grid: Grid,
  x: number,
  y: number,
  dir: Direction
): boolean {
  const { dx, dy } = DIR_VECTORS[dir];
  let consecutive = 0;
  for (let i = 1; i <= 3; i++) {
    const nx = x + dx * i;
    const ny = y + dy * i;
    if (!isWalkable(grid, nx, ny)) break;
    if (grid[ny][nx] === 0) consecutive++;
    else break;
  }
  return consecutive >= 2;
}

// ===== 简单 Bot =====
function easyBotAction(state: GameState, color: PlayerColor): BotAction {
  const player = state.players[color];
  if (!player) return {};
  const now = Date.now();
  if (now < player.moveCooldown) return {};

  const action: BotAction = {};

  // 30% 概率使用技能（如果可用）
  if (Math.random() < 0.3) {
    const skills: SkillType[] = ["dash", "bomb", "shield"];
    for (const s of skills) {
      if (now >= player.skillCooldowns[s]) {
        // 简单 bot 随机放技能
        if (Math.random() < 0.3) {
          action.skill = s;
          break;
        }
      }
    }
  }

  // 70% 随机走，30% 贪心走
  if (Math.random() < 0.7) {
    action.move = randomWalkableDir(state.grid, player.x, player.y) ?? undefined;
  } else {
    action.move = greedyMove(state.grid, player.x, player.y, color, 3);
  }

  return action;
}

// ===== 贪心移动（medium/hard 共用） =====
function greedyMove(
  grid: Grid,
  x: number,
  y: number,
  color: PlayerColor,
  range: number
): Direction | undefined {
  let bestScore = -Infinity;
  let bestDir: Direction | undefined;

  for (const dir of DIRECTIONS) {
    const { dx, dy } = DIR_VECTORS[dir];
    const nx = x + dx;
    const ny = y + dy;
    if (!isWalkable(grid, nx, ny)) continue;

    const score = evaluateDirection(grid, x, y, dir, color, range);
    if (score > bestScore) {
      bestScore = score;
      bestDir = dir;
    }
  }

  return bestDir;
}

// ===== 中等 Bot =====
function mediumBotAction(state: GameState, color: PlayerColor): BotAction {
  const player = state.players[color];
  if (!player) return {};
  const now = Date.now();
  if (now < player.moveCooldown) return {};

  const opponent = color === 1 ? 2 : 1;
  const oppPlayer = state.players[opponent];
  const action: BotAction = {};

  // === 技能决策 ===
  // 炸弹：周围对方格子多时用
  if (now >= player.skillCooldowns.bomb) {
    const bombTargets = countBombTargets(state.grid, player.x, player.y, opponent);
    if (bombTargets >= 4) {
      action.skill = "bomb";
    }
  }

  // 冲刺：前方有连续空格
  if (!action.skill && now >= player.skillCooldowns.dash) {
    if (dashOpportunity(state.grid, player.x, player.y, player.dir)) {
      if (Math.random() < 0.5) {
        action.skill = "dash";
      }
    }
  }

  // 护盾：自己气少时用
  if (!action.skill && now >= player.skillCooldowns.shield) {
    const libs = countLiberties(state.grid, player.x, player.y);
    if (libs <= 1) {
      action.skill = "shield";
    }
  }

  // === 移动决策 ===
  // 如果要放炸弹，不移动（炸弹会改变局势）
  if (action.skill === "bomb") {
    return action;
  }

  // 如果要冲刺，朝当前方向
  if (action.skill === "dash") {
    return action;
  }

  // 贪心移动
  action.move = greedyMove(state.grid, player.x, player.y, color, 4);

  // 检查道具
  if (state.powerUps.length > 0) {
    const nearestPowerUp = findNearestPowerUp(state, player.x, player.y);
    if (nearestPowerUp) {
      const dirToPU = directionToward(player.x, player.y, nearestPowerUp.x, nearestPowerUp.y, state.grid);
      if (dirToPU && Math.random() < 0.6) {
        action.move = dirToPU;
      }
    }
  }

  return action;
}

// ===== 困难 Bot =====
function hardBotAction(state: GameState, color: PlayerColor): BotAction {
  const player = state.players[color];
  if (!player) return {};
  const now = Date.now();
  if (now < player.moveCooldown) return {};

  const opponent = color === 1 ? 2 : 1;
  const oppPlayer = state.players[opponent];
  const action: BotAction = {};

  // === 技能决策 ===
  // 炸弹：更智能，3 个对方格子就用
  if (now >= player.skillCooldowns.bomb) {
    const bombTargets = countBombTargets(state.grid, player.x, player.y, opponent);
    if (bombTargets >= 3) {
      action.skill = "bomb";
    }
  }

  // 护盾：气 ≤ 2 或对方正在围自己
  if (!action.skill && now >= player.skillCooldowns.shield) {
    const libs = countLiberties(state.grid, player.x, player.y);
    if (libs <= 2) {
      action.skill = "shield";
    }
  }

  // 冲刺：前方有连续空格，或需要逃跑
  if (!action.skill && now >= player.skillCooldowns.dash) {
    if (dashOpportunity(state.grid, player.x, player.y, player.dir)) {
      action.skill = "dash";
    }
    // 逃跑时冲刺
    if (!action.skill && countLiberties(state.grid, player.x, player.y) <= 1) {
      // 找一个能跑的方向
      const escapeDir = findEscapeDir(state.grid, player.x, player.y);
      if (escapeDir) {
        player.dir = escapeDir;
        action.skill = "dash";
      }
    }
  }

  if (action.skill === "bomb") {
    return action;
  }

  // === 移动决策 ===
  // 道具优先
  if (state.powerUps.length > 0) {
    const nearestPowerUp = findNearestPowerUp(state, player.x, player.y);
    if (nearestPowerUp) {
      const dist = Math.abs(nearestPowerUp.x - player.x) + Math.abs(nearestPowerUp.y - player.y);
      if (dist <= 5) {
        const dirToPU = directionToward(player.x, player.y, nearestPowerUp.x, nearestPowerUp.y, state.grid);
        if (dirToPU) {
          action.move = dirToPU;
          return action;
        }
      }
    }
  }

  // 如果对方在危险中（气 ≤ 1），追击封口
  if (oppPlayer && opponentInDanger(state.grid, oppPlayer.x, oppPlayer.y)) {
    const pursueDir = directionToward(player.x, player.y, oppPlayer.x, oppPlayer.y, state.grid);
    if (pursueDir) {
      action.move = pursueDir;
      return action;
    }
  }

  // 贪心移动 + 避免死胡同
  const candidates: Array<{ dir: Direction; score: number }> = [];
  for (const dir of DIRECTIONS) {
    const { dx, dy } = DIR_VECTORS[dir];
    const nx = player.x + dx;
    const ny = player.y + dy;
    if (!isWalkable(state.grid, nx, ny)) continue;

    let score = evaluateDirection(state.grid, player.x, player.y, dir, color, 5);
    // 惩罚走入低气位置
    const futureLibs = countLiberties(state.grid, nx, ny);
    if (futureLibs <= 1) score -= 20;
    else if (futureLibs === 2) score -= 5;

    candidates.push({ dir, score });
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    action.move = candidates[0].dir;
  }

  return action;
}

// ===== 辅助函数 =====

/** 找最近的道具 */
function findNearestPowerUp(
  state: GameState,
  x: number,
  y: number
): { x: number; y: number } | null {
  if (state.powerUps.length === 0) return null;
  let nearest = state.powerUps[0];
  let minDist = Math.abs(nearest.x - x) + Math.abs(nearest.y - y);
  for (let i = 1; i < state.powerUps.length; i++) {
    const d = Math.abs(state.powerUps[i].x - x) + Math.abs(state.powerUps[i].y - y);
    if (d < minDist) {
      minDist = d;
      nearest = state.powerUps[i];
    }
  }
  return { x: nearest.x, y: nearest.y };
}

/** 朝目标方向走（选可走的方向） */
function directionToward(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  grid: Grid
): Direction | undefined {
  const dx = toX - fromX;
  const dy = toY - fromY;

  const candidates: Direction[] = [];
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx > 0) candidates.push("right");
    if (dx < 0) candidates.push("left");
    if (dy > 0) candidates.push("down");
    if (dy < 0) candidates.push("up");
  } else {
    if (dy > 0) candidates.push("down");
    if (dy < 0) candidates.push("up");
    if (dx > 0) candidates.push("right");
    if (dx < 0) candidates.push("left");
  }

  for (const d of candidates) {
    const { dx: ddx, dy: ddy } = DIR_VECTORS[d];
    if (isWalkable(grid, fromX + ddx, fromY + ddy)) return d;
  }

  // 直接方向走不了，尝试任意可走方向
  return randomWalkableDir(grid, fromX, fromY) ?? undefined;
}

/** 找一个逃跑方向（最多气的方向） */
function findEscapeDir(
  grid: Grid,
  x: number,
  y: number
): Direction | undefined {
  let bestDir: Direction | undefined;
  let maxLibs = -1;

  for (const dir of DIRECTIONS) {
    const { dx, dy } = DIR_VECTORS[dir];
    const nx = x + dx;
    const ny = y + dy;
    if (!isWalkable(grid, nx, ny)) continue;
    const libs = countLiberties(grid, nx, ny);
    if (libs > maxLibs) {
      maxLibs = libs;
      bestDir = dir;
    }
  }

  return bestDir;
}

// ===== 主入口 =====

/** 根据难度获取 Bot 行动 */
export function getBotAction(
  state: GameState,
  color: PlayerColor,
  difficulty: BotDifficulty
): BotAction {
  switch (difficulty) {
    case "easy":
      return easyBotAction(state, color);
    case "medium":
      return mediumBotAction(state, color);
    case "hard":
      return hardBotAction(state, color);
  }
}

/** 随机选取难度 */
export function randomDifficulty(): BotDifficulty {
  const difficulties: BotDifficulty[] = ["easy", "medium", "hard"];
  return difficulties[Math.floor(Math.random() * difficulties.length)];
}
