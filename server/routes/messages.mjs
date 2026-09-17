import express from 'express';
import { Message } from '../models/Message.mjs';
import { User } from '../models/User.mjs';
import { authenticate } from '../middleware/auth.mjs';

const router = express.Router();

// Get reactions for a message (must be declared before the /:userId/:otherUserId route)
router.get('/:id/reactions', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const reactions = await Message.getReactions(parseInt(id));
    res.json({ reactions });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get conversation
router.get('/:userId/:otherUserId', authenticate, async (req, res) => {
  try {
    const { userId, otherUserId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    if (parseInt(userId) !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!Number.isInteger(parseInt(otherUserId))) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const messages = await Message.getConversation(
      parseInt(userId),
      parseInt(otherUserId),
      parseInt(limit),
      parseInt(offset)
    );

    const unseen = messages
      .filter(m => m.receiver_id === req.user.id && !m.seen)
      .map(m => m.id);

    if (unseen.length > 0) {
      await Message.markAsSeen(unseen, req.user.id);
    }

    res.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send message
router.post('/send', authenticate, async (req, res) => {
  try {
    const { receiver_id, message, reply_to_id } = req.body;

    if (!receiver_id || !message) {
      return res.status(400).json({ error: 'Receiver and message required' });
    }

    if (message.length > 5000) {
      return res.status(400).json({ error: 'Message too long (max 5000 characters)' });
    }

    const receiver = await User.findById(receiver_id);
    if (!receiver) {
      return res.status(404).json({ error: 'User not found' });
    }

    const msg = await Message.create({
      sender_id: req.user.id,
      receiver_id: parseInt(receiver_id),
      message: message.trim(),
      reply_to_id: reply_to_id || null
    });

    await User.incrementMessageCount(req.user.id);

    res.status(201).json({ message: msg });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete message
router.delete('/:messageId', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const deleted = await Message.deleteMessage(parseInt(messageId), req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Message not found or access denied' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get unseen counts
router.get('/unseen', authenticate, async (req, res) => {
  try {
    const total = await Message.getUnseenCount(req.user.id);
    const bySender = await Message.getUnseenBySender(req.user.id);
    res.json({ total, bySender });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
// ... بقیه کد

// Edit message
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    if (!message || message.length > 5000) {
      return res.status(400).json({ error: 'Invalid message' });
    }
    const success = await Message.editMessage(parseInt(id), req.user.id, message.trim());
    if (!success) {
      return res.status(404).json({ error: 'Message not found or not yours' });
    }
    const updated = await Message.findById(parseInt(id));
    // emit via socket
    const io = req.app.get('io');
    io.to(`user_${updated.receiver_id}`).emit('message_edited', updated);
    res.json({ message: updated });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete for everyone
router.delete('/:id/for-everyone', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const success = await Message.deleteForEveryone(parseInt(id), req.user.id);
    if (!success) {
      return res.status(404).json({ error: 'Message not found or not yours' });
    }
    const io = req.app.get('io');
    io.to(`user_${req.user.id}`).emit('message_deleted', { id: parseInt(id) });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Pin
router.post('/:id/pin', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const success = await Message.pinMessage(parseInt(id), req.user.id);
    if (!success) return res.status(404).json({ error: 'Message not found' });
    const io = req.app.get('io');
    io.to(`user_${req.user.id}`).emit('message_pinned', { id: parseInt(id) });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id/pin', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await Message.unpinMessage(parseInt(id));
    const io = req.app.get('io');
    io.to(`user_${req.user.id}`).emit('message_unpinned', { id: parseInt(id) });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Reactions
router.post('/:id/reactions', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { reaction } = req.body;
    if (!reaction || reaction.length > 2) {
      return res.status(400).json({ error: 'Invalid reaction' });
    }
    await Message.addReaction(parseInt(id), req.user.id, reaction);
    const msg = await Message.findById(parseInt(id));
    const io = req.app.get('io');
    const payload = { id: parseInt(id), reaction, userId: req.user.id };
    if (msg) {
      io.to(`user_${msg.sender_id}`).emit('reaction_added', payload);
      io.to(`user_${msg.receiver_id}`).emit('reaction_added', payload);
    } else {
      io.to(`user_${req.user.id}`).emit('reaction_added', payload);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id/reactions', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await Message.removeReaction(parseInt(id), req.user.id);
    const msg = await Message.findById(parseInt(id));
    const io = req.app.get('io');
    const payload = { id: parseInt(id), userId: req.user.id };
    if (msg) {
      io.to(`user_${msg.sender_id}`).emit('reaction_removed', payload);
      io.to(`user_${msg.receiver_id}`).emit('reaction_removed', payload);
    } else {
      io.to(`user_${req.user.id}`).emit('reaction_removed', payload);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Forward
router.post('/:id/forward', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ error: 'Target user required' });
    const forwarded = await Message.forwardMessage(parseInt(id), req.user.id, parseInt(targetUserId));
    if (!forwarded) return res.status(404).json({ error: 'Message not found or not yours' });
    const io = req.app.get('io');
    io.to(`user_${targetUserId}`).emit('new_message', forwarded);
    res.json({ message: forwarded });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Search
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q, withUser } = req.query;
    if (!q || q.length < 2) return res.json({ messages: [] });
    const messages = await Message.searchMessages(req.user.id, q, withUser ? parseInt(withUser) : null);
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});