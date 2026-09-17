import { getDb } from '../database.mjs';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

const AVATAR_COLORS = [
  '6C5CE7', 'FD79A8', '00B894', 'FDCB6E', 'E17055', 
  '0984E3', 'A29BFE', 'FAB1A0', '55EFC4', '81ECEC',
  'F8A5C2', '74B9FF', 'A3CB38', 'FF7979', 'B33771'
];

function getRandomColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

function generateAvatar(username) {
  const color = getRandomColor();
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=${color}&color=fff&size=200&rounded=true&bold=true&font-size=0.5`;
}

export const User = {
  async create({ username, password, avatar = null }) {
    const db = getDb();
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    // اگر آواتار داده نشده، با رنگ تصادفی بساز
    const avatarUrl = avatar || generateAvatar(username);
    
    const result = await db.run(
      'INSERT INTO users (username, password, avatar) VALUES (?, ?, ?)',
      [username, hashedPassword, avatarUrl]
    );
    return { id: result.lastID, username, avatar: avatarUrl };
  },

  async findByUsername(username) {
    const db = getDb();
    return db.get('SELECT * FROM users WHERE username = ?', [username]);
  },

  async findById(id) {
    const db = getDb();
    return db.get(
      `SELECT id, username, avatar, bio, status, last_seen, created_at, theme, total_messages,
              two_factor_enabled, blocked_users, notification_settings
       FROM users WHERE id = ?`,
      [id]
    );
  },

  async findAll() {
    const db = getDb();
    return db.all(
      'SELECT id, username, avatar, bio, status, last_seen, total_messages, created_at FROM users'
    );
  },

  async updateStatus(userId, status) {
    const db = getDb();
    await db.run('UPDATE users SET status = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?', [status, userId]);
  },

  async updateLastSeen(userId) {
    const db = getDb();
    await db.run('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?', [userId]);
  },

  async updateProfile(userId, { username, bio, avatar, theme }) {
    const db = getDb();
    const updates = [];
    const values = [];
    if (username) { updates.push('username = ?'); values.push(username); }
    if (bio !== undefined) { updates.push('bio = ?'); values.push(bio); }
    if (avatar) { updates.push('avatar = ?'); values.push(avatar); }
    if (theme) { updates.push('theme = ?'); values.push(theme); }
    if (updates.length === 0) return;
    values.push(userId);
    await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
  },

  async updatePassword(userId, newPassword) {
    const db = getDb();
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
  },

  async incrementMessageCount(userId) {
    const db = getDb();
    await db.run('UPDATE users SET total_messages = total_messages + 1 WHERE id = ?', [userId]);
  },

  async verifyPassword(user, plainPassword) {
    return bcrypt.compare(plainPassword, user.password);
  },

  async search(query) {
    const db = getDb();
    return db.all(
      'SELECT id, username, avatar, status, last_seen FROM users WHERE username LIKE ?',
      [`%${query}%`]
    );
  },

  // 2FA
  async enable2FA(userId, secret) {
    const db = getDb();
    await db.run(
      'UPDATE users SET two_factor_enabled = 1, two_factor_secret = ? WHERE id = ?',
      [secret, userId]
    );
  },

  async disable2FA(userId) {
    const db = getDb();
    await db.run(
      'UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL WHERE id = ?',
      [userId]
    );
  },

  async get2FASecret(userId) {
    const db = getDb();
    const result = await db.get('SELECT two_factor_secret FROM users WHERE id = ?', [userId]);
    return result?.two_factor_secret;
  },

  // Block
  async blockUser(userId, blockedId) {
    const db = getDb();
    const user = await this.findById(userId);
    let blocked = user.blocked_users ? JSON.parse(user.blocked_users) : [];
    if (!blocked.includes(blockedId)) {
      blocked.push(blockedId);
      await db.run('UPDATE users SET blocked_users = ? WHERE id = ?', [JSON.stringify(blocked), userId]);
    }
  },

  async unblockUser(userId, blockedId) {
    const db = getDb();
    const user = await this.findById(userId);
    let blocked = user.blocked_users ? JSON.parse(user.blocked_users) : [];
    blocked = blocked.filter(id => id !== blockedId);
    await db.run('UPDATE users SET blocked_users = ? WHERE id = ?', [JSON.stringify(blocked), userId]);
  },

  async getBlockedUsers(userId) {
    const db = getDb();
    const user = await this.findById(userId);
    return user.blocked_users ? JSON.parse(user.blocked_users) : [];
  },

  // Notification settings
  async updateNotificationSettings(userId, settings) {
    const db = getDb();
    await db.run(
      'UPDATE users SET notification_settings = ? WHERE id = ?',
      [JSON.stringify(settings), userId]
    );
  },

  async getNotificationSettings(userId) {
    const db = getDb();
    const user = await this.findById(userId);
    return user.notification_settings ? JSON.parse(user.notification_settings) : {};
  }
};