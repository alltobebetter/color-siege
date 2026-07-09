import { GRID_SIZE, getObstacleLayout } from "./constants";
import type { Grid, CellOwner, PlayerColor, ScoreInfo } from "./types";

/** 创建初始空网格 */
export function createEmptyGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => 0 as CellOwner)
  );
}

/** 创建带障碍物的初始网格 */
export function createInitialGrid(): Grid {
  const grid = createEmptyGrid();
  for (const { x, y } of getObstacleLayout()) {
    grid[y][x] = -1;
  }
  return grid;
}

/** 检查坐标是否在网格内 */
export function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
}

/** 检查格子是否可移动 */
export function isWalkable(grid: Grid, x: number, y: number): boolean {
  if (!inBounds(x, y)) return false;
  return grid[y][x] !== -1;
}

/** 涂色一个格子 */
export function paintCell(
  grid: Grid,
  x: number,
  y: number,
  color: PlayerColor
): boolean {
  if (!inBounds(x, y)) return false;
  if (grid[y][x] === -1) return false;
  grid[y][x] = color;
  return true;
}

/**
 * 围地检测算法（围棋「气」机制）
 *
 * 找到对方所有连通的格子群，检查每个群是否有「气」（相邻空格）。
 * 如果一个群完全没有气（所有相邻格子都是己方颜色、障碍物或边界），
 * 则该群被「围杀」，全部翻转为己方颜色。
 *
 * 与旧版 BFS 边界算法不同，这种机制下：
 * - 绕外圈走不会直接翻转内部所有对方格子（因为内部仍有空格 = 有气）
 * - 必须完全包围对方格子群并填满所有相邻空隙才能真正围杀
 */
export function detectSiege(
  grid: Grid,
  siegeColor: PlayerColor
): Array<{ x: number; y: number }> {
  const opponentColor: CellOwner = siegeColor === 1 ? 2 : 1;
  const visited: boolean[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => false)
  );
  const dirs = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  const besieged: Array<{ x: number; y: number }> = [];

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (grid[y][x] !== opponentColor || visited[y][x]) continue;

      // Flood fill 找到对方连通群
      const group: Array<{ x: number; y: number }> = [];
      let hasLiberty = false;
      const queue: Array<{ x: number; y: number }> = [{ x, y }];
      visited[y][x] = true;

      while (queue.length > 0) {
        const cell = queue.shift()!;
        group.push(cell);

        for (const [dx, dy] of dirs) {
          const nx = cell.x + dx;
          const ny = cell.y + dy;
          if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;

          const neighbor = grid[ny][nx];
          // 空格 = 气！
          if (neighbor === 0) hasLiberty = true;
          // 对方颜色的连通格子，加入群
          if (neighbor === opponentColor && !visited[ny][nx]) {
            visited[ny][nx] = true;
            queue.push({ x: nx, y: ny });
          }
        }
      }

      // 群没有气 = 被完全围杀
      if (!hasLiberty) {
        besieged.push(...group);
      }
    }
  }

  return besieged;
}

/** 执行围地翻转，返回翻转的格子列表 */
export function executeSiege(
  grid: Grid,
  siegeColor: PlayerColor
): Array<{ x: number; y: number }> {
  const besieged = detectSiege(grid, siegeColor);
  for (const { x, y } of besieged) {
    grid[y][x] = siegeColor;
  }
  return besieged;
}

/** 统计双方涂色数量 */
export function countScores(grid: Grid): ScoreInfo {
  let p1Count = 0;
  let p2Count = 0;
  let totalCells = 0;
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (grid[y][x] === 1) p1Count++;
      else if (grid[y][x] === 2) p2Count++;
      if (grid[y][x] !== -1) totalCells++;
    }
  }
  return { p1Count, p2Count, totalCells };
}
