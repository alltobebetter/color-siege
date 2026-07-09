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
  obstacle: "#3a3a4a",
  obstacleBorder: "#5a5a6e",
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

/** 障碍物最小安全距离（距玩家初始位置） */
export const OBSTACLE_SAFE_RADIUS = 3;

/**
 * 随机生成障碍物布局
 * 规则：
 * - 避开玩家初始位置周围（安全区）
 * - 避开地图边缘（边缘障碍无意义）
 * - 以簇的形式生成，每簇 2-4 个格子
 * - 保证地图可通行（不会完全阻断路径）
 */
export function generateObstacleLayout(): Array<{ x: number; y: number }> {
  const obstacles: Array<{ x: number; y: number }> = [];
  const occupied = new Set<string>();
  const mid = Math.floor(GRID_SIZE / 2);

  // 玩家安全区
  const safeZones = [
    PLAYER_INIT[1],
    PLAYER_INIT[2],
  ];

  const isSafe = (x: number, y: number) => {
    for (const sz of safeZones) {
      const dx = x - sz.x;
      const dy = y - sz.y;
      if (dx * dx + dy * dy <= OBSTACLE_SAFE_RADIUS * OBSTACLE_SAFE_RADIUS) return true;
    }
    return false;
  };

  // 边缘区域不生成
  const isEdge = (x: number, y: number) =>
    x <= 1 || x >= GRID_SIZE - 2 || y <= 1 || y >= GRID_SIZE - 2;

  const tryAdd = (x: number, y: number) => {
    const key = `${x},${y}`;
    if (occupied.has(key)) return false;
    if (isSafe(x, y) || isEdge(x, y)) return false;
    obstacles.push({ x, y });
    occupied.add(key);
    return true;
  };

  // 1. 中央随机簇（1-3 个簇）
  const centerClusters = 1 + Math.floor(Math.random() * 3);
  for (let c = 0; c < centerClusters; c++) {
    const cx = mid + Math.floor(Math.random() * 7) - 3;
    const cy = mid + Math.floor(Math.random() * 7) - 3;
    const size = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < size; i++) {
      const dx = Math.floor(Math.random() * 3) - 1;
      const dy = Math.floor(Math.random() * 3) - 1;
      tryAdd(cx + dx, cy + dy);
    }
  }

  // 2. 四象限随机簇
  const quadrants = [
    { qx: Math.floor(GRID_SIZE * 0.3), qy: Math.floor(GRID_SIZE * 0.3) },
    { qx: Math.floor(GRID_SIZE * 0.7), qy: Math.floor(GRID_SIZE * 0.3) },
    { qx: Math.floor(GRID_SIZE * 0.3), qy: Math.floor(GRID_SIZE * 0.7) },
    { qx: Math.floor(GRID_SIZE * 0.7), qy: Math.floor(GRID_SIZE * 0.7) },
  ];
  for (const q of quadrants) {
    if (Math.random() < 0.7) {
      const cx = q.qx + Math.floor(Math.random() * 3) - 1;
      const cy = q.qy + Math.floor(Math.random() * 3) - 1;
      const size = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < size; i++) {
        const dx = Math.floor(Math.random() * 3) - 1;
        const dy = Math.floor(Math.random() * 3) - 1;
        tryAdd(cx + dx, cy + dy);
      }
    }
  }

  // 3. 随机散点（少量）
  const scatter = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < scatter; i++) {
    const x = 3 + Math.floor(Math.random() * (GRID_SIZE - 6));
    const y = 3 + Math.floor(Math.random() * (GRID_SIZE - 6));
    tryAdd(x, y);
  }

  return obstacles;
}
