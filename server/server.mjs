import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import { initializeDatabase, getDb } from './database.mjs';
import authRoutes from './routes/auth.mjs';
import userRoutes from './routes/users.mjs';
import messageRoutes from './routes/messages.mjs';
import { authenticate, verifyToken } from './middleware/auth.mjs';
import { User } from './models/User.mjs';
import { Message } from './models/Message.mjs';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// ===== اضافه کردن io به app برای دسترسی در مسیرها =====
app.set('io', io);

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/src/assets/avatars', express.static(path.join(__dirname, '../src/assets/avatars')));

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/messages', messageRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const onlineUsers = new Map();
const LOG_FILE = path.join(__dirname, 'backups', 'all_messages.txt');

// ---- اطمینان از وجود پوشه backups ----
function ensureBackupDir() {
  const dir = path.join(__dirname, 'backups');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ---- تابع ذخیره پیام در فایل ثابت ----
function appendToLogFile(message) {
  ensureBackupDir();
  const logLine = `[${message.time || new Date().toISOString()}] User ${message.sender_id} -> User ${message.receiver_id}: ${message.message}\n`;
  fs.appendFileSync(LOG_FILE, logLine, 'utf8');
}

// ---- تابع ذخیره چند پیام در فایل ثابت (برای بک‌آپ هنگام پاک‌سازی) ----
function appendMultipleToLogFile(messages) {
  if (!messages || messages.length === 0) return;
  ensureBackupDir();
  const lines = messages.map(m => 
    `[${m.time || new Date().toISOString()}] User ${m.sender_id} -> User ${m.receiver_id}: ${m.message}`
  ).join('\n');
  fs.appendFileSync(LOG_FILE, lines + '\n', 'utf8');
  console.log(`📁 Backed up ${messages.length} messages to ${LOG_FILE}`);
}

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return next(new Error('Invalid token'));
  }
  socket.userId = decoded.id;
  next();
});

// ---- تابع پاک‌سازی خودکار پیام‌ها ----
async function autoCleanup() {
  try {
    const oldMessages = await Message.deleteOldMessages(43200); // 30 روز
    if (oldMessages && oldMessages.length > 0) {
      appendMultipleToLogFile(oldMessages);
      console.log(`🗑️ Deleted ${oldMessages.length} old messages (older than 30 days) and backed up to ${LOG_FILE}`);
    }
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}

io.on('connection', async (socket) => {
  const userId = socket.userId;

  socket.join(`user_${userId}`);

  onlineUsers.set(userId, socket.id);
  await User.updateStatus(userId, 'online');

  io.emit('user_status', { userId, status: 'online' });

  const onlineUserIds = Array.from(onlineUsers.keys());
  socket.emit('online_users', { users: onlineUserIds });

  // ---- ارسال پیام‌های دیده‌نشده ----
  try {
    const unseenMessages = await Message.getUnseenMessages(userId);
    if (unseenMessages && unseenMessages.length > 0) {
      console.log(`📨 Sending ${unseenMessages.length} unseen messages to user ${userId}`);
      socket.emit('unseen_messages', unseenMessages);
    }
  } catch (error) {
    console.error('Error fetching unseen messages:', error);
  }

  socket.on('typing', ({ receiverId, isTyping }) => {
    const targetSocket = onlineUsers.get(receiverId);
    if (targetSocket) {
      io.to(targetSocket).emit('user_typing', {
        userId,
        isTyping
      });
    }
  });

  // ---- Send Message ----
  socket.on('send_message', async (data) => {
    try {
      const { receiver_id, message, reply_to_id } = data;

      const msg = await Message.create({
        sender_id: userId,
        receiver_id,
        message: message.trim(),
        reply_to_id: reply_to_id || null
      });

      await User.incrementMessageCount(userId);
      await User.updateLastSeen(userId);

      const msgWithSender = await Message.findById(msg.id);

      // ---- ذخیره لحظه‌ای در فایل بک‌آپ ثابت ----
      appendToLogFile(msgWithSender);

      const targetSocket = onlineUsers.get(receiver_id);
      if (targetSocket) {
        io.to(targetSocket).emit('new_message', msgWithSender);
      }

      socket.emit('message_sent', msgWithSender);

      const unseen = await Message.getUnseenCount(receiver_id);
      if (targetSocket) {
        io.to(targetSocket).emit('unseen_update', { total: unseen });
      }

    } catch (error) {
      console.error('Socket message error:', error);
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  });

  // ---- Mark as Seen ----
  socket.on('mark_seen', async ({ messageIds }) => {
    if (!messageIds || messageIds.length === 0) return;
    try {
      await Message.markAsSeen(messageIds, userId);

      const db = getDb();
      const placeholders = messageIds.map(() => '?').join(',');
      const rows = await db.all(
        `SELECT DISTINCT sender_id FROM messages WHERE id IN (${placeholders}) AND receiver_id = ?`,
        [...messageIds, userId]
      );

      for (const row of rows) {
        const senderSocket = onlineUsers.get(row.sender_id);
        if (senderSocket) {
          io.to(senderSocket).emit('message_seen', { messageIds, userId });
        }
      }

      const unseen = await Message.getUnseenCount(userId);
      socket.emit('unseen_update', { total: unseen });

    } catch (error) {
      console.error('Mark seen error:', error);
      socket.emit('error', { message: 'Failed to mark messages as seen' });
    }
  });

  // ---- Disconnect ----
  socket.on('disconnect', async () => {
    onlineUsers.delete(userId);
    await User.updateStatus(userId, 'offline');
    await User.updateLastSeen(userId);
    io.emit('user_status', { userId, status: 'offline' });
  });
});

async function startServer() {
  try {
    await initializeDatabase();
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 ARCKER Server running on http://localhost:${PORT}`);
    });
    
    // ---- راه‌اندازی تایمر پاک‌سازی خودکار (هر ۶۰ ثانیه) ----
    setInterval(autoCleanup, 60000);
    // اجرای اولیه بعد از ۵ ثانیه
    setTimeout(autoCleanup, 5000);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { io, onlineUsers };