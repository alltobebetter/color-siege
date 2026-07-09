// ===== 游戏常量 =====

/** 网格大小 */
export const GRID_SIZE = 20;

/** 每个格子的像素大小（渲染时用） */
export const CELL_SIZE = 28;

/** Canvas 总尺寸 */
export const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;

/** 移动冷却（毫秒） */
export const MOVE_COOLDOWN = 140;

/** 游戏时长（毫秒） */
export const GAME_DURATION = 90_000;

/** 倒计时（毫秒） */
export const COUNTDOWN_DURATION = 3_000;

/** 技能冷却时间（毫秒） */
export const SKILL_COOLDOWNS = {
  dash: 8_000,
  bomb: 12_000,
  shield: 18_000,
} as const;

/** 冲刺距离 */
export const DASH_DISTANCE = 3;

/** 炸弹范围（半径，3x3 = 半径1） */
export const BOMB_RADIUS = 2; // 5x5

/** 护盾持续时间（毫秒） */
export const SHIELD_DURATION = 5_000;

/** 道具生成间隔（毫秒） */
export const POWERUP_INTERVAL = 12_000;

/** 道具最大数量 */
export const MAX_POWERUPS = 3;

/** 道具持续时间（毫秒） */
export const POWERUP_LIFETIME = 15_000;

/** 玩家初始位置 */
export const PLAYER_INIT = {
  1: { x: 2, y: 2 },
  2: { x: GRID_SIZE - 3, y: GRID_SIZE - 3 },
} as const;

/** 玩家初始朝向 */
export const PLAYER_INIT_DIR = {
  1: "right" as const,
  2: "left" as const,
};

/** 玩家颜色（渲染用） */
export const PLAYER_COLORS = {
  1: { main: "#e8475a", glow: "#e8475a", light: "#f06878" },
  2: { main: "#4a6cf7", glow: "#4a6cf7", light: "#6a8af9" },
  obstacle: "#2a2a36",
  empty: "#18181f",
  emptyLight: "#1c1c26",
};

/** 道具颜色 */
export const POWERUP_COLORS: Record<string, string> = {
  speed: "#f0c050",
  bomb: "#e8475a",
  shield: "#48b0d8",
  expand: "#50c878",
};

/** 道具图标 */
export const POWERUP_ICONS: Record<string, string> = {
  speed: "S",
  bomb: "B",
  shield: "D",
  expand: "E",
};

/** 方向向量 */
export const DIR_VECTORS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
} as const;

/** 障碍物布局（地图中央的固定障碍物） */
export function getObstacleLayout(): Array<{ x: number; y: number }> {
  const obstacles: Array<{ x: number; y: number }> = [];
  const mid = Math.floor(GRID_SIZE / 2);

  // 中央十字形障碍物
  for (let i = -2; i <= 2; i++) {
    obstacles.push({ x: mid + i, y: mid });
    obstacles.push({ x: mid, y: mid + i });
  }

  // 四角小障碍
  const corners = [
    { x: 5, y: 5 }, { x: 6, y: 5 },
    { x: GRID_SIZE - 6, y: 5 }, { x: GRID_SIZE - 7, y: 5 },
    { x: 5, y: GRID_SIZE - 6 }, { x: 6, y: GRID_SIZE - 6 },
    { x: GRID_SIZE - 6, y: GRID_SIZE - 6 }, { x: GRID_SIZE - 7, y: GRID_SIZE - 6 },
  ];
  obstacles.push(...corners);

  return obstacles;
}
