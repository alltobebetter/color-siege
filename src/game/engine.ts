import {
  GRID_SIZE,
  MOVE_COOLDOWN,
  GAME_DURATION,
  COUNTDOWN_DURATION,
  SKILL_COOLDOWNS,
  DASH_DISTANCE,
  BOMB_RADIUS,
  SHIELD_DURATION,
  POWERUP_INTERVAL,
  MAX_POWERUPS,
  POWERUP_LIFETIME,
  PLAYER_INIT,
  PLAYER_INIT_DIR,
  DIR_VECTORS,
} from "./constants";
import {
  createInitialGrid,
  isWalkable,
  paintCell,
  executeSiege,
  countScores,
  inBounds,
} from "./grid";
import type {
  GameState,
  Grid,
  PlayerColor,
  PlayerState,
  Direction,
  SkillType,
  PowerUp,
  Effect,
  SerializedState,
  ScoreInfo,
} from "./types";

let effectIdCounter = 0;

/**
 * 围地检测辅助函数：只检测移动方是否围杀了对方。
 * 如果对方有护盾，跳过围杀检测。
 */
function runSiege(
  state: GameState,
  color: PlayerColor
): Array<{ x: number; y: number }> {
  const opponentColor: PlayerColor = color === 1 ? 2 : 1;
  const oppPlayer = state.players[opponentColor];
  const now = Date.now();
  const oppShielded = oppPlayer ? now < oppPlayer.shieldUntil : false;

  if (oppShielded) return [];
  return executeSiege(state.grid, color);
}

function genId(): string {
  return `e${Date.now()}_${effectIdCounter++}`;
}

function genPowerUpId(): string {
  return `p${Date.now()}_${effectIdCounter++}`;
}

/** 创建新玩家 */
export function createPlayer(
  id: string,
  color: PlayerColor,
  name: string
): PlayerState {
  const pos = PLAYER_INIT[color];
  return {
    id,
    color,
    name,
    x: pos.x,
    y: pos.y,
    dir: PLAYER_INIT_DIR[color],
    moveCooldown: 0,
    skillCooldowns: { dash: 0, bomb: 0, shield: 0 },
    shieldUntil: 0,
    ready: false,
  };
}

/** 创建初始游戏状态 */
export function createInitialState(): GameState {
  return {
    grid: createInitialGrid(),
    players: { 1: null, 2: null },
    powerUps: [],
    effects: [],
    status: "waiting",
    startTime: 0,
    endTime: 0,
    countdownEnd: 0,
    winner: null,
    lastFlipTime: 0,
    powerUpSpawnTimer: 0,
  };
}

/** 玩家移动 */
export function movePlayer(
  state: GameState,
  color: PlayerColor,
  dir: Direction
): boolean {
  const player = state.players[color];
  if (!player) return false;
  if (state.status !== "playing") return false;

  const now = Date.now();
  if (now < player.moveCooldown) return false;

  const { dx, dy } = DIR_VECTORS[dir];
  const nx = player.x + dx;
  const ny = player.y + dy;

  if (!isWalkable(state.grid, nx, ny)) {
    // 不能移动，但改变朝向
    player.dir = dir;
    return false;
  }

  player.x = nx;
  player.y = ny;
  player.dir = dir;
  player.moveCooldown = now + MOVE_COOLDOWN;

  // 涂色当前格子
  paintCell(state.grid, nx, ny, color);

  // 围地检测：只检测移动方是否围杀了对方
  const flips = runSiege(state, color);
  if (flips.length > 0) {
    state.effects.push({
      id: genId(),
      type: "flip",
      x: flips[0].x,
      y: flips[0].y,
      startTime: now,
      color,
    });
    state.lastFlipTime = now;
  }

  return true;
}

/** 使用技能 */
export function useSkill(
  state: GameState,
  color: PlayerColor,
  skill: SkillType
): boolean {
  const player = state.players[color];
  if (!player) return false;
  if (state.status !== "playing") return false;

  const now = Date.now();
  if (now < player.skillCooldowns[skill]) return false;

  switch (skill) {
    case "dash":
      return doDash(state, color);
    case "bomb":
      return doBomb(state, color);
    case "shield":
      return doShield(state, color);
  }
}

/** 冲刺技能：快速移动多格，沿途涂色 */
function doDash(state: GameState, color: PlayerColor): boolean {
  const player = state.players[color]!;
  const { dx, dy } = DIR_VECTORS[player.dir];
  let moved = false;

  for (let i = 0; i < DASH_DISTANCE; i++) {
    const nx = player.x + dx;
    const ny = player.y + dy;
    if (!isWalkable(state.grid, nx, ny)) break;
    player.x = nx;
    player.y = ny;
    paintCell(state.grid, nx, ny, color);
    moved = true;
  }

  if (moved) {
    // 冲刺后也做围地检测
    runSiege(state, color);

    state.effects.push({
      id: genId(),
      type: "dash",
      x: player.x,
      y: player.y,
      startTime: Date.now(),
      color,
    });
  }

  player.skillCooldowns.dash = Date.now() + SKILL_COOLDOWNS.dash;
  return moved;
}

/** 炸弹技能：范围内清空对方颜色并涂为己方 */
function doBomb(state: GameState, color: PlayerColor): boolean {
  const player = state.players[color]!;
  const now = Date.now();
  let hit = false;

  for (let dy = -BOMB_RADIUS; dy <= BOMB_RADIUS; dy++) {
    for (let dx = -BOMB_RADIUS; dx <= BOMB_RADIUS; dx++) {
      const nx = player.x + dx;
      const ny = player.y + dy;
      if (!inBounds(nx, ny)) continue;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > BOMB_RADIUS) continue;

      const cell = state.grid[ny][nx];
      if (cell === -1) continue;

      // 如果对方有护盾，不炸对方颜色
      const opponentColor = color === 1 ? 2 : 1;
      const oppPlayer = state.players[opponentColor];
      const oppHasShield =
        oppPlayer && now < oppPlayer.shieldUntil;

      if (cell === opponentColor && oppHasShield) continue;

      state.grid[ny][nx] = color;
      hit = true;
    }
  }

  if (hit) {
    runSiege(state, color);
  }

  state.effects.push({
    id: genId(),
    type: "explosion",
    x: player.x,
    y: player.y,
    startTime: now,
    color,
  });

  player.skillCooldowns.bomb = now + SKILL_COOLDOWNS.bomb;
  return true;
}

/** 护盾技能：免疫围地翻转和炸弹 */
function doShield(state: GameState, color: PlayerColor): boolean {
  const player = state.players[color]!;
  const now = Date.now();
  player.shieldUntil = now + SHIELD_DURATION;
  player.skillCooldowns.shield = now + SKILL_COOLDOWNS.shield;
  return true;
}

/** 生成随机道具 */
function spawnPowerUp(state: GameState): void {
  if (state.powerUps.length >= MAX_POWERUPS) return;

  const types: PowerUp["type"][] = ["speed", "bomb", "shield", "expand"];
  const type = types[Math.floor(Math.random() * types.length)];

  // 找一个空格子
  let attempts = 0;
  while (attempts < 50) {
    const x = Math.floor(Math.random() * GRID_SIZE);
    const y = Math.floor(Math.random() * GRID_SIZE);
    if (state.grid[y][x] !== -1) {
      // 确保不和已有道具重叠
      const overlap = state.powerUps.some((p) => p.x === x && p.y === y);
      if (!overlap) {
        state.powerUps.push({
          id: genPowerUpId(),
          x,
          y,
          type,
          spawnedAt: Date.now(),
        });
        return;
      }
    }
    attempts++;
  }
}

/** 检查道具拾取 */
function checkPowerUpPickup(state: GameState): void {
  const now = Date.now();

  // 移除过期道具
  state.powerUps = state.powerUps.filter(
    (p) => now - p.spawnedAt < POWERUP_LIFETIME
  );

  // 检查拾取
  for (let color = 1 as PlayerColor; color <= 2; color = (color + 1) as PlayerColor) {
    const player = state.players[color];
    if (!player) continue;

    const idx = state.powerUps.findIndex(
      (p) => p.x === player.x && p.y === player.y
    );
    if (idx >= 0) {
      const powerUp = state.powerUps[idx];
      applyPowerUp(state, color, powerUp);
      state.powerUps.splice(idx, 1);

      state.effects.push({
        id: genId(),
        type: "pickup",
        x: powerUp.x,
        y: powerUp.y,
        startTime: now,
        color,
      });
    }
  }
}

/** 应用道具效果 */
function applyPowerUp(
  state: GameState,
  color: PlayerColor,
  powerUp: PowerUp
): void {
  const player = state.players[color];
  if (!player) return;
  const now = Date.now();

  switch (powerUp.type) {
    case "speed":
      // 减少移动冷却 3 秒
      player.moveCooldown = Math.max(0, player.moveCooldown - 2000);
      // 减少所有技能冷却 3 秒
      (Object.keys(player.skillCooldowns) as SkillType[]).forEach((k) => {
        if (player.skillCooldowns[k] > now) {
          player.skillCooldowns[k] = Math.max(now, player.skillCooldowns[k] - 3000);
        }
      });
      break;
    case "bomb":
      // 立即重置炸弹冷却
      player.skillCooldowns.bomb = 0;
      break;
    case "shield":
      // 立即获得 3 秒护盾
      player.shieldUntil = Math.max(player.shieldUntil, now + 3000);
      break;
    case "expand":
      // 周围 3x3 涂色
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          paintCell(state.grid, player.x + dx, player.y + dy, color);
        }
      }
      runSiege(state, color);
      break;
  }
}

/** 清理过期特效 */
function cleanupEffects(state: GameState): void {
  const now = Date.now();
  state.effects = state.effects.filter((e) => now - e.startTime < 2000);
}

/** 游戏主循环 tick */
export function gameTick(state: GameState): void {
  const now = Date.now();

  // 清理特效
  cleanupEffects(state);

  if (state.status === "countdown") {
    if (now >= state.countdownEnd) {
      state.status = "playing";
      state.startTime = now;
      state.endTime = now + GAME_DURATION;
      // 初始涂色玩家位置
      for (let c = 1 as PlayerColor; c <= 2; c = (c + 1) as PlayerColor) {
        const p = state.players[c];
        if (p) paintCell(state.grid, p.x, p.y, c);
      }
    }
    return;
  }

  if (state.status !== "playing") return;

  // 道具生成
  if (now >= state.powerUpSpawnTimer) {
    spawnPowerUp(state);
    state.powerUpSpawnTimer = now + POWERUP_INTERVAL;
  }

  // 道具拾取检查
  checkPowerUpPickup(state);

  // 游戏结束检查
  if (now >= state.endTime) {
    endGame(state);
  }
}

/** 结束游戏 */
export function endGame(state: GameState): void {
  state.status = "ended";
  const scores = countScores(state.grid);
  if (scores.p1Count > scores.p2Count) {
    state.winner = 1;
  } else if (scores.p2Count > scores.p1Count) {
    state.winner = 2;
  } else {
    state.winner = null; // 平局
  }
}

/** 序列化状态用于传输 */
export function serializeState(state: GameState): SerializedState {
  return {
    grid: state.grid.map((row) => row.map((c) => c as number)),
    players: {
      1: state.players[1]
        ? { ...state.players[1], id: "" } as any
        : null,
      2: state.players[2]
        ? { ...state.players[2], id: "" } as any
        : null,
    },
    powerUps: state.powerUps,
    effects: state.effects,
    status: state.status,
    startTime: state.startTime,
    endTime: state.endTime,
    countdownEnd: state.countdownEnd,
    winner: state.winner,
  };
}

/** 开始倒计时 */
export function startCountdown(state: GameState): void {
  state.status = "countdown";
  state.countdownEnd = Date.now() + COUNTDOWN_DURATION;
  state.powerUpSpawnTimer = Date.now() + POWERUP_INTERVAL;
  // 重置网格
  state.grid = createInitialGrid();
  state.powerUps = [];
  state.effects = [];
  state.winner = null;

  // 重置玩家位置
  for (let c = 1 as PlayerColor; c <= 2; c = (c + 1) as PlayerColor) {
    const p = state.players[c];
    if (p) {
      const pos = PLAYER_INIT[c];
      p.x = pos.x;
      p.y = pos.y;
      p.dir = PLAYER_INIT_DIR[c];
      p.moveCooldown = 0;
      p.skillCooldowns = { dash: 0, bomb: 0, shield: 0 };
      p.shieldUntil = 0;
    }
  }
}

/** 获取分数 */
export function getScores(state: GameState): ScoreInfo {
  return countScores(state.grid);
}
