import express from 'express';
import ChatMessage from '../models/ChatMessage.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * Get chat messages for a session
 */
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50, before } = req.query;
    
    const query = {
      sessionId,
      deleted: false
    };
    
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }
    
    const messages = await ChatMessage.find(query)
      .populate('sender', 'name email picture')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();
    
    // Reverse to get chronological order
    messages.reverse();
    
    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * Send a chat message
 */
router.post('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message, messageType = 'text', location } = req.body;
    const userId = req.userId;
    const userName = req.user.name;
    
    if (!message && !location) {
      return res.status(400).json({ error: 'Message or location is required' });
    }
    
    const chatMessage = await ChatMessage.create({
      sessionId,
      sender: userId,
      senderName: userName,
      message: message || '',
      messageType,
      location
    });
    
    const populated = await ChatMessage.findById(chatMessage._id)
      .populate('sender', 'name email picture')
      .lean();
    
    res.status(201).json({ success: true, message: populated });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * Mark messages as read
 */
router.post('/:sessionId/read', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.userId;
    
    await ChatMessage.updateMany(
      {
        sessionId,
        sender: { $ne: userId },
        'readBy.userId': { $ne: userId }
      },
      {
        $push: {
          readBy: {
            userId,
            readAt: new Date()
          }
        }
      }
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

/**
 * Delete a message
 */
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.userId;
    
    const message = await ChatMessage.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Only sender can delete
    if (message.sender.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    message.deleted = true;
    message.deletedAt = new Date();
    await message.save();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;

