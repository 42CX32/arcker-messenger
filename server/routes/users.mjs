import express from 'express';
import { User } from '../models/User.mjs';
import { authenticate } from '../middleware/auth.mjs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { io } from '../server.mjs';
import fs from 'fs';

// ===== تعریف __dirname در ابتدا =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// ===== ایجاد پوشه avatars در صورت عدم وجود =====
const avatarsDir = path.join(__dirname, '../../src/assets/avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
  console.log('📁 Avatars directory created at:', avatarsDir);
}

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir); // استفاده از مسیر ساخته‌شده
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  }
});

// Get all users
router.get('/', authenticate, async (req, res) => {
  try {
    const users = await User.findAll();
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { username, bio, theme } = req.body;
    
    if (username) {
      if (username.length < 3 || username.length > 20) {
        return res.status(400).json({ error: 'Username must be 3-20 characters' });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ error: 'Invalid username format' });
      }
      const existing = await User.findByUsername(username);
      if (existing && existing.id !== req.user.id) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    await User.updateProfile(req.user.id, { username, bio, theme });
    const updated = await User.findById(req.user.id);
    
    // ---- انتشار رویداد به‌روزرسانی پروفایل ----
    if (io) {
      io.emit('profile_update', { user: updated });
      console.log(`📤 Profile update broadcast for user ${updated.id}`);
    }
    
    res.json({ user: updated });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload avatar
router.post('/avatar', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const avatarPath = `/src/assets/avatars/${req.file.filename}`;
    await User.updateProfile(req.user.id, { avatar: avatarPath });
    const updated = await User.findById(req.user.id);
    
    // ---- انتشار رویداد به‌روزرسانی پروفایل ----
    if (io) {
      io.emit('profile_update', { user: updated });
      console.log(`📤 Avatar update broadcast for user ${updated.id}`);
    }
    
    res.json({ user: updated });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Change password
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findByUsername(req.user.username);
    const isValid = await User.verifyPassword(user, currentPassword);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    await User.updatePassword(req.user.id, newPassword);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Search users
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 1) {
      return res.json({ users: [] });
    }
    const users = await User.search(q);
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Block
router.post('/:id/block', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await User.blockUser(req.user.id, parseInt(id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id/block', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await User.unblockUser(req.user.id, parseInt(id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/blocked', authenticate, async (req, res) => {
  try {
    const blocked = await User.getBlockedUsers(req.user.id);
    res.json({ blocked });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ---- مسیر تست برای انتشار رویداد (اختیاری) ----
router.get('/test-emit', authenticate, (req, res) => {
  if (io) {
    const testUser = {
      id: req.user.id,
      username: req.user.username,
      avatar: req.user.avatar || '/src/assets/default-avatar.svg',
      bio: 'Test bio from server emit ' + new Date().toISOString()
    };
    io.emit('profile_update', { user: testUser });
    res.json({ success: true, message: 'Event emitted', user: testUser });
  } else {
    res.status(500).json({ error: 'io is not defined' });
  }
});

export default router;