import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

// Use DATA_DIR if provided; on Vercel prefer /tmp for write access
const defaultDir = process.env.VERCEL ? "/tmp/ace-storage" : path.join(process.cwd(), "var", "storage");
const dataDir = process.env.DATA_DIR || defaultDir;
const dbPath = path.join(dataDir, "app.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(
  `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT,
    avatar_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    input_filename TEXT NOT NULL,
    output_filename TEXT,
    status TEXT NOT NULL,
    meta_json TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`
);

export function getDb() {
  return db;
}


