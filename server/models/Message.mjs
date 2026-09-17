import { getDb } from '../database.mjs';

export const Message = {
  async create({ sender_id, receiver_id, message, reply_to_id = null }) {
    const db = getDb();
    const result = await db.run(
      'INSERT INTO messages (sender_id, receiver_id, message, reply_to_id) VALUES (?, ?, ?, ?)',
      [sender_id, receiver_id, message, reply_to_id]
    );
    return this.findById(result.lastID);
  },

  async findById(id) {
    const db = getDb();
    return db.get(`
      SELECT m.*, u.username as sender_name 
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?
    `, [id]);
  },

  async getConversation(userId1, userId2, limit = 50, offset = 0) {
    const db = getDb();
    return db.all(`
      SELECT m.*, 
             u.username as sender_name,
             r.username as receiver_name,
             (SELECT message FROM messages WHERE id = m.reply_to_id) as reply_text
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      JOIN users r ON m.receiver_id = r.id
      WHERE ((m.sender_id = ? AND m.receiver_id = ?)
         OR (m.sender_id = ? AND m.receiver_id = ?))
      AND m.deleted = 0
      ORDER BY m.time ASC
      LIMIT ? OFFSET ?
    `, [userId1, userId2, userId2, userId1, limit, offset]);
  },

  async markAsSeen(messageIds, userId) {
    const db = getDb();
    if (messageIds.length === 0) return;
    const placeholders = messageIds.map(() => '?').join(',');
    await db.run(
      `UPDATE messages SET seen = 1, seen_at = CURRENT_TIMESTAMP 
       WHERE id IN (${placeholders}) AND receiver_id = ?`,
      [...messageIds, userId]
    );
  },

  async getUnseenCount(userId) {
    const db = getDb();
    const result = await db.get(
      'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND seen = 0 AND deleted = 0',
      [userId]
    );
    return result.count;
  },

  async getUnseenBySender(userId) {
    const db = getDb();
    return db.all(
      `SELECT sender_id, COUNT(*) as count 
       FROM messages 
       WHERE receiver_id = ? AND seen = 0 AND deleted = 0
       GROUP BY sender_id`,
      [userId]
    );
  },

  async deleteMessage(messageId, userId) {
    const db = getDb();
    const result = await db.run(
      'UPDATE messages SET deleted = 1 WHERE id = ? AND sender_id = ?',
      [messageId, userId]
    );
    return result.changes > 0;
  },

  async getLastMessage(userId1, userId2) {
    const db = getDb();
    return db.get(`
      SELECT m.*, u.username as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE ((m.sender_id = ? AND m.receiver_id = ?)
         OR (m.sender_id = ? AND m.receiver_id = ?))
      AND m.deleted = 0
      ORDER BY m.time DESC
      LIMIT 1
    `, [userId1, userId2, userId2, userId1]);
  },

  // ===== دریافت پیام‌های دیده‌نشده یک کاربر =====
  async getUnseenMessages(userId) {
    const db = getDb();
    return db.all(
      `SELECT m.*, u.username as sender_name 
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.receiver_id = ? AND m.seen = 0 AND m.deleted = 0
       ORDER BY m.time ASC`,
      [userId]
    );
  },

  // ===== حذف پیام‌های قدیمی‌تر از minutes دقیقه =====
  async deleteOldMessages(minutes = 5) {
    const db = getDb();
    const cutoff = new Date(Date.now() - minutes * 60000).toISOString();
    
    // گرفتن پیام‌های قدیمی برای بک‌آپ
    const oldMessages = await db.all(
      'SELECT * FROM messages WHERE time < ? AND deleted = 0',
      [cutoff]
    );
    
    // حذف پیام‌های قدیمی
    if (oldMessages.length > 0) {
      await db.run(
        'DELETE FROM messages WHERE time < ?',
        [cutoff]
      );
    }
    
    return oldMessages;
  },

  // ===== واکنش‌ها (Reactions) =====
  async addReaction(messageId, userId, reaction) {
    const db = getDb();
    // INSERT OR REPLACE به‌روزرسانی واکنش کاربر در صورت وجود
    await db.run(
      `INSERT OR REPLACE INTO reactions (message_id, user_id, reaction) VALUES (?, ?, ?)`,
      [messageId, userId, reaction]
    );
  },

  async removeReaction(messageId, userId) {
    const db = getDb();
    await db.run(
      `DELETE FROM reactions WHERE message_id = ? AND user_id = ?`,
      [messageId, userId]
    );
  },

  async getReactions(messageId) {
    const db = getDb();
    return db.all(
      `SELECT user_id, reaction FROM reactions WHERE message_id = ?`,
      [messageId]
    );
  },

  // ===== جستجوی پیشرفته پیام‌ها =====
  async searchMessages(userId, query, otherUserId = null) {
    const db = getDb();
    let sql = `
      SELECT m.*, u.username as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE (m.sender_id = ? OR m.receiver_id = ?)
      AND m.message LIKE ?
      AND m.deleted = 0
    `;
    const params = [userId, userId, `%${query}%`];
    if (otherUserId) {
      sql += ` AND (m.sender_id = ? OR m.receiver_id = ?)`;
      params.push(otherUserId, otherUserId);
    }
    sql += ` ORDER BY m.time DESC LIMIT 50`;
    return db.all(sql, params);
  }
};