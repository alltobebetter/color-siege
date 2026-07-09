import { createClient, type Client } from "@libsql/client";

let _client: Client | null = null;

export function getDb(): Client {
  if (_client) return _client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error("TURSO_DATABASE_URL is not set");
  }

  _client = createClient({ url, authToken });
  return _client;
}

/**
 * 初始化数据库 schema
 * 安全调用，表已存在时不会报错
 */
export async function initDb(): Promise<void> {
  const db = getDb();

  await db.batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        nickname TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS matches (
        id TEXT PRIMARY KEY,
        player_a_id TEXT NOT NULL,
        player_b_id TEXT NOT NULL,
        winner_id TEXT,
        score_a INTEGER NOT NULL,
        score_b INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS user_stats (
        user_id TEXT PRIMARY KEY,
        wins INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0,
        total_score INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL
      )`,
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_matches_player_a ON matches(player_a_id)`,
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_matches_player_b ON matches(player_b_id)`,
    },
  ]);
}
