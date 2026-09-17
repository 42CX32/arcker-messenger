import express from 'express';
import { User } from '../models/User.mjs';
import { generateToken, authenticate } from '../middleware/auth.mjs';

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await User.verifyPassword(user, password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await User.updateStatus(user.id, 'online');

    const token = generateToken(user);
    const userData = await User.findById(user.id);

    res.json({
      success: true,
      token,
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: 'Username must be 3-20 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
    }

    const existing = await User.findByUsername(username);
    if (existing) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const user = await User.create({ username, password });
    const token = generateToken(user);
    const userData = await User.findById(user.id);

    res.status(201).json({
      success: true,
      token,
      user: userData
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const { userId } = req.body;
    if (userId) {
      await User.updateStatus(userId, 'offline');
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 2FA routes (currently disabled - install speakeasy and qrcode to enable)
/*
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

router.post('/2fa/enable', authenticate, async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({ length: 20 });
    await User.enable2FA(req.user.id, secret.base32);
    const otpauth = speakeasy.otpauthURL({
      secret: secret.ascii,
      label: `ARCKER:${req.user.username}`,
      issuer: 'ARCKER'
    });
    const qr = await QRCode.toDataURL(otpauth);
    res.json({ secret: secret.base32, qr });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/2fa/verify', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    const secret = await User.get2FASecret(req.user.id);
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token
    });
    if (!verified) {
      return res.status(401).json({ error: 'Invalid 2FA token' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});
*/

export default router;