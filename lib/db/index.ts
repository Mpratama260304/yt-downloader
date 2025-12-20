/**
 * Database Connection and Initialization
 * 
 * Uses better-sqlite3 with drizzle-orm for SQLite database management.
 * Database is stored at /data/app.db (configurable via DATABASE_PATH env var).
 * 
 * v5.0: Removed cookies table and functions - cookies are now auto-fetched
 */

import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { eq, desc, sql } from 'drizzle-orm';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

// Database path from environment or default
// Support both DB_PATH and DATABASE_PATH for backward compatibility
const DB_PATH = process.env.DATABASE_PATH || process.env.DB_PATH || path.join(process.cwd(), 'data', 'app.db');

// Lazy initialization for database connection
let sqlite: Database.Database | null = null;
let drizzleDb: BetterSQLite3Database<typeof schema> | null = null;
let isInitialized = false;

/**
 * Create database tables (synchronous)
 * v5.0: Removed cookies table
 */
function createTables() {
  if (!sqlite || isInitialized) return;
  
  // Create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT,
      password_hash TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    );
    
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT,
      updated_at INTEGER DEFAULT (unixepoch())
    );
    
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      title TEXT,
      format TEXT,
      ip TEXT,
      user_agent TEXT,
      success INTEGER DEFAULT 1,
      error TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );
  `);
  
  isInitialized = true;
  console.log('[DB] Tables created at:', DB_PATH);
}

/**
 * Create default admin user (synchronous)
 */
function createDefaultAdminSync() {
  if (!sqlite) return;
  
  // Check if admin exists
  const stmt = sqlite.prepare('SELECT id FROM users WHERE username = ?');
  const existing = stmt.get('admin');
  
  if (!existing) {
    // Use bcrypt sync for initial setup
    const passwordHash = bcrypt.hashSync('admin123', 10);
    
    const insert = sqlite.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)');
    insert.run('admin', 'admin@example.com', passwordHash);
    
    console.log('[DB] Default admin created - username: admin, password: admin123');
  }
}

/**
 * Initialize default settings (synchronous)
 */
function initDefaultSettingsSync() {
  if (!sqlite) return;
  
  const defaultSettings = [
    { key: 'site_name', value: 'YouTube Downloader' },
    { key: 'site_description', value: 'Download YouTube videos and audio with yt-dlp' },
    { key: 'logo_path', value: '/icon.svg' },
    { key: 'favicon_path', value: '/favicon.ico' },
  ];
  
  const insert = sqlite.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  
  for (const setting of defaultSettings) {
    insert.run(setting.key, setting.value);
  }
}

/**
 * Get database connection (lazy initialization)
 */
function getDb(): BetterSQLite3Database<typeof schema> {
  if (!drizzleDb) {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(DB_PATH);
      console.log('[DB] Initializing database at:', DB_PATH);
      console.log('[DB] Data directory:', dataDir);
      
      if (!fs.existsSync(dataDir)) {
        console.log('[DB] Creating data directory...');
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Create SQLite connection with timeout for busy handling
      sqlite = new Database(DB_PATH);
      
      // Enable WAL mode for better concurrent access
      sqlite.pragma('journal_mode = WAL');
      sqlite.pragma('busy_timeout = 5000');

      // Create drizzle instance
      drizzleDb = drizzle(sqlite, { schema });
      
      // Auto-initialize tables on first connection
      createTables();
      createDefaultAdminSync();
      initDefaultSettingsSync();
      
      console.log('[DB] Database initialized successfully');
    } catch (error) {
      console.error('[DB] Failed to initialize database:', error);
      throw error;
    }
  }
  return drizzleDb;
}

// Export db getter
export const db = new Proxy({} as BetterSQLite3Database<typeof schema>, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  }
});

// ==========================================
// User Management Functions
// ==========================================

export async function getAdminUser() {
  const users = getDb().select().from(schema.users).where(eq(schema.users.username, 'admin')).all();
  return users[0] || null;
}

export async function getUserById(id: number) {
  const users = getDb().select().from(schema.users).where(eq(schema.users.id, id)).all();
  return users[0] || null;
}

export async function getUserByUsername(username: string) {
  const users = getDb().select().from(schema.users).where(eq(schema.users.username, username)).all();
  return users[0] || null;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function updateUserPassword(userId: number, newPasswordHash: string) {
  return getDb().update(schema.users)
    .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
    .where(eq(schema.users.id, userId))
    .run();
}

export async function updateUsername(userId: number, newUsername: string) {
  return getDb().update(schema.users)
    .set({ username: newUsername, updatedAt: new Date() })
    .where(eq(schema.users.id, userId))
    .run();
}

// ==========================================
// Settings Management Functions
// ==========================================

export async function getSetting(key: string): Promise<string | null> {
  const settings = getDb().select().from(schema.settings).where(eq(schema.settings.key, key)).all();
  return settings[0]?.value || null;
}

export async function setSetting(key: string, value: string) {
  const existing = await getSetting(key);
  if (existing !== null) {
    return getDb().update(schema.settings)
      .set({ value, updatedAt: new Date() })
      .where(eq(schema.settings.key, key))
      .run();
  }
  return getDb().insert(schema.settings).values({ key, value }).run();
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const settings = getDb().select().from(schema.settings).all();
  const result: Record<string, string> = {};
  for (const setting of settings) {
    if (setting.key && setting.value) {
      result[setting.key] = setting.value;
    }
  }
  return result;
}

// ==========================================
// History Management Functions
// ==========================================

export async function addHistoryEntry(entry: {
  url: string;
  title?: string;
  format?: string;
  ip?: string;
  userAgent?: string;
  success?: boolean;
  error?: string;
}) {
  // Prune old entries first (keep last 100)
  const count = await getHistoryCount();
  if (count >= 100) {
    await pruneHistory(100);
  }
  
  return getDb().insert(schema.history)
    .values({
      url: entry.url,
      title: entry.title || null,
      format: entry.format || null,
      ip: entry.ip || null,
      userAgent: entry.userAgent || null,
      success: entry.success !== false,
      error: entry.error || null,
    })
    .run();
}

export async function getHistory(limit = 100, offset = 0) {
  return getDb().select()
    .from(schema.history)
    .orderBy(desc(schema.history.createdAt))
    .limit(limit)
    .offset(offset)
    .all();
}

export async function getHistoryCount() {
  const result = getDb().select({ count: sql<number>`count(*)` }).from(schema.history).all();
  return result[0]?.count || 0;
}

export async function clearHistory() {
  return getDb().delete(schema.history).run();
}

async function pruneHistory(keepCount: number) {
  // Delete oldest entries beyond keepCount
  const entries = await getHistory(1000, 0);
  if (entries.length > keepCount) {
    const toDelete = entries.slice(keepCount);
    for (const entry of toDelete) {
      getDb().delete(schema.history).where(eq(schema.history.id, entry.id)).run();
    }
  }
}

// Export schema types (v5.0: removed Cookie types)
export type { User, Setting, HistoryEntry, NewUser, NewSetting, NewHistoryEntry } from './schema';
