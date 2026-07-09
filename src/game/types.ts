// ===== 类型定义 =====

/** 格子所有者：0=空, 1=玩家1, 2=玩家2, -1=障碍物 */
export type CellOwner = 0 | 1 | 2 | -1;

/** 网格：二维数组，grid[y][x] */
export type Grid = CellOwner[][];

/** 玩家颜色 */
export type PlayerColor = 1 | 2;

/** 方向 */
export type Direction = "up" | "down" | "left" | "right";

/** 技能类型 */
export type SkillType = "dash" | "bomb" | "shield";

/** 玩家状态 */
export interface PlayerState {
  id: string;          // 连接ID
  color: PlayerColor;  // 1 或 2
  name: string;        // 显示名称
  x: number;           // 网格X坐标
  y: number;           // 网格Y坐标
  dir: Direction;      // 当前朝向
  moveCooldown: number; // 移动冷却时间戳
  // 技能冷却（时间戳，0表示可用）
  skillCooldowns: {
    dash: number;
    bomb: number;
    shield: number;
  };
  shieldUntil: number; // 护盾结束时间戳，0表示无护盾
  ready: boolean;      // 是否准备
}

/** 道具 */
export interface PowerUp {
  id: string;
  x: number;
  y: number;
  type: "speed" | "bomb" | "shield" | "expand";
  spawnedAt: number;
}

/** 特效（用于前端渲染） */
export interface Effect {
  id: string;
  type: "explosion" | "flip" | "dash" | "pickup";
  x: number;
  y: number;
  startTime: number;
  color?: PlayerColor;
}

/** 完整游戏状态 */
export interface GameState {
  grid: Grid;
  players: Record<PlayerColor, PlayerState | null>;
  powerUps: PowerUp[];
  effects: Effect[];
  status: "waiting" | "countdown" | "playing" | "ended";
  startTime: number;    // 游戏开始时间戳
  endTime: number;      // 游戏结束时间戳
  countdownEnd: number; // 倒计时结束时间戳
  winner: PlayerColor | null;
  lastFlipTime: number; // 上次翻转时间（用于特效）
  powerUpSpawnTimer: number; // 下次道具生成时间
}

// ===== 消息协议 =====

/** 客户端 → 服务端 */
export type ClientMessage =
  | { type: "join"; name: string }
  | { type: "ready" }
  | { type: "move"; dir: Direction }
  | { type: "skill"; skill: SkillType }
  | { type: "leave" };

/** 服务端 → 客户端 */
export type ServerMessage =
  | { type: "state"; state: SerializedState }
  | { type: "joined"; color: PlayerColor; name: string }
  | { type: "error"; message: string }
  | { type: "effect"; effect: Effect };

/** 序列化后的状态（通过 JSON 传输） */
export interface SerializedState {
  grid: number[][];
  players: {
    1: Omit<PlayerState, "id"> | null;
    2: Omit<PlayerState, "id"> | null;
  };
  powerUps: PowerUp[];
  effects: Effect[];
  status: GameState["status"];
  startTime: number;
  endTime: number;
  countdownEnd: number;
  winner: PlayerColor | null;
}

/** 分数统计 */
export interface ScoreInfo {
  p1Count: number;
  p2Count: number;
  totalCells: number;
}
