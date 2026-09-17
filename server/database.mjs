import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db;

export async function initializeDatabase() {
  try {
    // اطمینان از وجود پوشه server (اگر نبود بساز)
    const serverDir = __dirname;
    if (!fs.existsSync(serverDir)) {
      fs.mkdirSync(serverDir, { recursive: true });
    }

    // باز کردن دیتابیس
    db = await open({
      filename: join(__dirname, 'database.db'),
      driver: sqlite3.Database
    });

    // حالا db معتبر است
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        avatar TEXT DEFAULT 'default',
        bio TEXT DEFAULT '',
        status TEXT DEFAULT 'offline',
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        theme TEXT DEFAULT 'purple',
        total_messages INTEGER DEFAULT 0,
        two_factor_enabled BOOLEAN DEFAULT 0,
        two_factor_secret TEXT,
        blocked_users TEXT DEFAULT '[]',
        notification_settings TEXT DEFAULT '{}'
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        time DATETIME DEFAULT CURRENT_TIMESTAMP,
        seen BOOLEAN DEFAULT 0,
        seen_at DATETIME,
        deleted BOOLEAN DEFAULT 0,
        reply_to_id INTEGER,
        edited BOOLEAN DEFAULT 0,
        pinned BOOLEAN DEFAULT 0,
        forwarded_from INTEGER,
        FOREIGN KEY (sender_id) REFERENCES users(id),
        FOREIGN KEY (receiver_id) REFERENCES users(id),
        FOREIGN KEY (reply_to_id) REFERENCES messages(id)
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS reactions (
        message_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        reaction TEXT NOT NULL,
        PRIMARY KEY (message_id, user_id),
        FOREIGN KEY (message_id) REFERENCES messages(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
      CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
      CREATE INDEX IF NOT EXISTS idx_messages_time ON messages(time);
    `);

    console.log('✅ Database initialized successfully');
    return db;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}