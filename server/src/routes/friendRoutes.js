import express from 'express';
import Friend from '../models/Friend.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * Get all friends (accepted)
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;
    
    const friendships = await Friend.find({
      $or: [
        { requester: userId, status: 'accepted' },
        { recipient: userId, status: 'accepted' }
      ]
    })
    .populate('requester', 'name email picture')
    .populate('recipient', 'name email picture')
    .sort({ acceptedAt: -1 });
    
    // Transform to friend list
    const friends = friendships
      .filter(friendship => friendship.requester && friendship.recipient) // Filter out any null populates
      .map(friendship => {
        const friend = friendship.requester._id.toString() === userId 
          ? friendship.recipient 
          : friendship.requester;
        return {
          id: friend._id,
          name: friend.name,
          email: friend.email,
          picture: friend.picture,
          friendshipId: friendship._id,
          acceptedAt: friendship.acceptedAt
        };
      });
    
    res.json({ success: true, friends });
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

/**
 * Get pending friend requests (sent and received)
 */
router.get('/requests', async (req, res) => {
  try {
    const userId = req.userId;
    
    const sentRequests = await Friend.find({
      requester: userId,
      status: 'pending'
    }).populate('recipient', 'name email picture');
    
    const receivedRequests = await Friend.find({
      recipient: userId,
      status: 'pending'
    }).populate('requester', 'name email picture');
    
    res.json({
      success: true,
      sent: sentRequests
        .filter(r => r.recipient) // Filter out null populates
        .map(r => ({
          id: r.recipient._id,
          name: r.recipient.name,
          email: r.recipient.email,
          picture: r.recipient.picture,
          requestId: r._id,
          createdAt: r.createdAt
        })),
      received: receivedRequests
        .filter(r => r.requester) // Filter out null populates
        .map(r => ({
          id: r.requester._id,
          name: r.requester.name,
          email: r.requester.email,
          picture: r.requester.picture,
          requestId: r._id,
          createdAt: r.createdAt
        }))
    });
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    res.status(500).json({ error: 'Failed to fetch friend requests' });
  }
});

/**
 * Send friend request
 */
router.post('/request', async (req, res) => {
  try {
    const userId = req.userId;
    const { recipientId } = req.body;
    
    if (!recipientId) {
      return res.status(400).json({ error: 'recipientId is required' });
    }
    
    if (recipientId === userId) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }
    
    // Check if user exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if friendship already exists
    const existing = await Friend.findOne({
      $or: [
        { requester: userId, recipient: recipientId },
        { requester: recipientId, recipient: userId }
      ]
    });
    
    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ error: 'Already friends' });
      } else if (existing.status === 'pending') {
        return res.status(400).json({ error: 'Friend request already pending' });
      }
    }
    
    // Create friend request
    const friendship = await Friend.create({
      requester: userId,
      recipient: recipientId,
      status: 'pending'
    });
    
    res.status(201).json({ 
      success: true, 
      message: 'Friend request sent',
      friendshipId: friendship._id
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Friend request already exists' });
    }
    console.error('Error sending friend request:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

/**
 * Accept friend request
 */
router.post('/accept/:requestId', async (req, res) => {
  try {
    const userId = req.userId;
    const { requestId } = req.params;
    
    const friendship = await Friend.findById(requestId);
    
    if (!friendship) {
      return res.status(404).json({ error: 'Friend request not found' });
    }
    
    if (friendship.recipient.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to accept this request' });
    }
    
    if (friendship.status !== 'pending') {
      return res.status(400).json({ error: 'Request is not pending' });
    }
    
    friendship.status = 'accepted';
    friendship.acceptedAt = new Date();
    await friendship.save();
    
    res.json({ 
      success: true, 
      message: 'Friend request accepted',
      friendship 
    });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

/**
 * Reject/Delete friend request
 */
router.delete('/request/:requestId', async (req, res) => {
  try {
    const userId = req.userId;
    const { requestId } = req.params;
    
    const friendship = await Friend.findById(requestId);
    
    if (!friendship) {
      return res.status(404).json({ error: 'Friend request not found' });
    }
    
    // Can delete if user is requester or recipient
    if (friendship.requester.toString() !== userId && 
        friendship.recipient.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    await Friend.findByIdAndDelete(requestId);
    
    res.json({ success: true, message: 'Friend request deleted' });
  } catch (error) {
    console.error('Error deleting friend request:', error);
    res.status(500).json({ error: 'Failed to delete friend request' });
  }
});

/**
 * Remove friend
 */
router.delete('/:friendshipId', async (req, res) => {
  try {
    const userId = req.userId;
    const { friendshipId } = req.params;
    
    const friendship = await Friend.findById(friendshipId);
    
    if (!friendship) {
      return res.status(404).json({ error: 'Friendship not found' });
    }
    
    // Can delete if user is part of the friendship
    if (friendship.requester.toString() !== userId && 
        friendship.recipient.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    await Friend.findByIdAndDelete(friendshipId);
    
    res.json({ success: true, message: 'Friend removed' });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

/**
 * Search users (for adding friends)
 */
router.get('/search', async (req, res) => {
  try {
    const userId = req.userId;
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }
    
    // Find users matching search (by name or email)
    const users = await User.find({
      $and: [
        { _id: { $ne: userId } }, // Exclude self
        {
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } }
          ]
        }
      ]
    })
    .select('name email picture')
    .limit(20);
    
    // Get friendship status for each user
    const friendships = await Friend.find({
      $or: [
        { requester: userId },
        { recipient: userId }
      ]
    });
    
    const results = users.map(user => {
      const friendship = friendships.find(f => 
        f.requester.toString() === user._id.toString() ||
        f.recipient.toString() === user._id.toString()
      );
      
      return {
        id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        friendshipStatus: friendship ? friendship.status : null,
        friendshipId: friendship ? friendship._id : null
      };
    });
    
    res.json({ success: true, users: results });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

export default router;

