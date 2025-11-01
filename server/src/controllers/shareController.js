import ShareRequest from '../models/ShareRequest.js';
import SharedSession from '../models/SharedSession.js';
import User from '../models/User.js';

// Socket.IO instance will be passed via setIo
let ioInstance = null;

export const setIo = (io) => {
  ioInstance = io;
};

/**
 * Direct location sharing - start sharing immediately without approval
 * POST /api/share/direct
 * Body: { toUserId, toUsername }
 */
export const startDirectShare = async (req, res) => {
  try {
    const { toUserId, toUsername } = req.body;
    const fromUserId = req.userId;

    if (!toUserId && !toUsername) {
      return res.status(400).json({ 
        error: 'Missing required field',
        message: 'Either toUserId or toUsername is required'
      });
    }

    // Find target user by ID or username
    let targetUser;
    if (toUserId) {
      targetUser = await User.findById(toUserId);
    } else if (toUsername) {
      targetUser = await User.findOne({ 
        $or: [
          { name: toUsername },
          { email: toUsername },
          { phone: toUsername }
        ]
      });
    }

    if (!targetUser) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'Target user does not exist'
      });
    }

    const toUserIdFinal = targetUser._id.toString();

    if (toUserIdFinal === fromUserId) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Cannot share location with yourself'
      });
    }

    // Check if active session already exists
    const existingSession = await SharedSession.findOne({
      participants: { $all: [fromUserId, toUserIdFinal] },
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    if (existingSession) {
      return res.json({
        success: true,
        message: 'Session already exists',
        sessionId: existingSession._id,
        expiresAt: existingSession.expiresAt,
        participants: [
          {
            id: req.user._id || fromUserId,
            name: req.user.name
          },
          {
            id: targetUser._id,
            name: targetUser.name,
            email: targetUser.email
          }
        ]
      });
    }

    // Create direct share session (no approval needed)
    const TTL_MINUTES = parseInt(process.env.SHARE_SESSION_TTL_MINUTES || '30', 10);
    const expiresAt = new Date(Date.now() + TTL_MINUTES * 60 * 1000);

    const session = new SharedSession({
      participants: [fromUserId, toUserIdFinal],
      requestId: null, // Direct share has no request
      expiresAt,
      isActive: true
    });

    await session.save();

    // Emit socket events to both participants
    if (ioInstance) {
      const fromUser = await User.findById(fromUserId);
      
      // Emit to both users
      [fromUserId, toUserIdFinal].forEach(userId => {
        ioInstance.to(`user_${userId}`).emit('share:direct', {
          sessionId: session._id,
          participants: [
            {
              id: fromUser._id,
              name: fromUser.name,
              email: fromUser.email
            },
            {
              id: targetUser._id,
              name: targetUser.name,
              email: targetUser.email
            }
          ],
          expiresAt: session.expiresAt,
          createdAt: session.createdAt,
          fromUserId: fromUserId
        });
      });
    }

    res.json({
      success: true,
      message: 'Direct share started',
      sessionId: session._id,
      expiresAt: session.expiresAt,
      participants: [
        {
          id: fromUserId,
          name: req.user.name
        },
        {
          id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email
        }
      ]
    });
  } catch (error) {
    console.error('Error starting direct share:', error);
    res.status(500).json({ 
      error: 'Failed to start direct share',
      message: error.message
    });
  }
};

/**
 * Create a location sharing request
 * POST /api/share/request
 */
export const createRequest = async (req, res) => {
  try {
    const { toUserId } = req.body;
    const fromUserId = req.userId;

    if (!toUserId) {
      return res.status(400).json({ 
        error: 'Missing required field',
        message: 'toUserId is required'
      });
    }

    if (toUserId === fromUserId) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Cannot request location from yourself'
      });
    }

    // Verify target user exists
    const targetUser = await User.findById(toUserId);
    if (!targetUser) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'Target user does not exist'
      });
    }

    // Check for existing pending request
    const existingRequest = await ShareRequest.findOne({
      $or: [
        { from: fromUserId, to: toUserId, status: 'pending' },
        { from: toUserId, to: fromUserId, status: 'pending' }
      ]
    });

    if (existingRequest) {
      return res.status(409).json({ 
        error: 'Request already exists',
        message: 'A pending request already exists between these users',
        requestId: existingRequest._id
      });
    }

    // Check for existing active session
    const existingSession = await SharedSession.findOne({
      participants: { $all: [fromUserId, toUserId] },
      isActive: true
    });

    if (existingSession) {
      return res.status(409).json({ 
        error: 'Session already active',
        message: 'Location sharing session is already active',
        sessionId: existingSession._id
      });
    }

    // Create new request
    const request = new ShareRequest({
      from: fromUserId,
      to: toUserId,
      status: 'pending'
    });

    await request.save();

    // Populate user info for response
    await request.populate('from', 'name email phone');
    await request.populate('to', 'name email phone');

    // Emit socket event to target user
    if (ioInstance) {
      ioInstance.to(`user_${toUserId}`).emit('share:request', {
        requestId: request._id,
        from: {
          id: request.from._id,
          name: request.from.name,
          email: request.from.email
        },
        createdAt: request.createdAt
      });
    }

    res.status(201).json({
      success: true,
      requestId: request._id,
      status: request.status,
      from: {
        id: request.from._id,
        name: request.from.name
      },
      to: {
        id: request.to._id,
        name: request.to.name
      },
      createdAt: request.createdAt
    });
  } catch (error) {
    console.error('Error creating share request:', error);
    res.status(500).json({ 
      error: 'Failed to create request',
      message: error.message
    });
  }
};

/**
 * Get all share requests for the logged-in user
 * GET /api/share/requests
 */
export const getRequests = async (req, res) => {
  try {
    const userId = req.userId;

    // Get inbound (received) and outbound (sent) requests
    const inboundRequests = await ShareRequest.find({
      to: userId,
      status: 'pending'
    }).populate('from', 'name email phone').sort({ createdAt: -1 });

    const outboundRequests = await ShareRequest.find({
      from: userId,
      status: 'pending'
    }).populate('to', 'name email phone').sort({ createdAt: -1 });

    res.json({
      success: true,
      inbound: inboundRequests.map(r => ({
        requestId: r._id,
        from: {
          id: r.from._id,
          name: r.from.name,
          email: r.from.email
        },
        status: r.status,
        createdAt: r.createdAt
      })),
      outbound: outboundRequests.map(r => ({
        requestId: r._id,
        to: {
          id: r.to._id,
          name: r.to.name,
          email: r.to.email
        },
        status: r.status,
        createdAt: r.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching share requests:', error);
    res.status(500).json({ 
      error: 'Failed to fetch requests',
      message: error.message
    });
  }
};

/**
 * Approve or reject a share request
 * POST /api/share/requests/:requestId/approve
 */
export const respondToRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { approve } = req.body;
    const userId = req.userId;

    const request = await ShareRequest.findById(requestId)
      .populate('from', 'name email phone')
      .populate('to', 'name email phone');

    if (!request) {
      return res.status(404).json({ 
        error: 'Request not found',
        message: 'Share request does not exist'
      });
    }

    // Verify user is the recipient
    if (request.to._id.toString() !== userId) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'You can only respond to requests sent to you'
      });
    }

    // Check if request is already responded to
    if (request.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Request already processed',
        message: `Request is already ${request.status}`
      });
    }

    if (approve) {
      // Approve request
      request.status = 'approved';
      request.respondedAt = new Date();
      await request.save();

      // Create shared session
      const TTL_MINUTES = parseInt(process.env.SHARE_SESSION_TTL_MINUTES || '30', 10);
      const expiresAt = new Date(Date.now() + TTL_MINUTES * 60 * 1000);

      const session = new SharedSession({
        participants: [request.from._id, request.to._id],
        requestId: request._id,
        expiresAt,
        isActive: true
      });

      await session.save();

      // Emit socket events to both participants
      if (ioInstance) {
        const participantIds = [request.from._id.toString(), request.to._id.toString()];
        participantIds.forEach(userId => {
          ioInstance.to(`user_${userId}`).emit('share:approved', {
            sessionId: session._id,
            requestId: request._id,
            participants: [
              {
                id: request.from._id,
                name: request.from.name,
                email: request.from.email
              },
              {
                id: request.to._id,
                name: request.to.name,
                email: request.to.email
              }
            ],
            expiresAt: session.expiresAt,
            createdAt: session.createdAt
          });
        });
      }

      res.json({
        success: true,
        message: 'Request approved',
        sessionId: session._id,
        expiresAt: session.expiresAt,
        participants: [
          {
            id: request.from._id,
            name: request.from.name
          },
          {
            id: request.to._id,
            name: request.to.name
          }
        ]
      });
    } else {
      // Reject request
      request.status = 'rejected';
      request.respondedAt = new Date();
      await request.save();

      res.json({
        success: true,
        message: 'Request rejected',
        status: 'rejected'
      });
    }
  } catch (error) {
    console.error('Error responding to request:', error);
    res.status(500).json({ 
      error: 'Failed to respond to request',
      message: error.message
    });
  }
};

/**
 * Revoke a pending request
 * POST /api/share/requests/:requestId/revoke
 */
export const revokeRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.userId;

    const request = await ShareRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ 
        error: 'Request not found',
        message: 'Share request does not exist'
      });
    }

    // Verify user is the requester
    if (request.from.toString() !== userId) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'You can only revoke requests you created'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Request already processed',
        message: 'Can only revoke pending requests'
      });
    }

    request.status = 'revoked';
    request.revokedBy = userId;
    request.revokedAt = new Date();
    await request.save();

    res.json({
      success: true,
      message: 'Request revoked',
      status: 'revoked'
    });
  } catch (error) {
    console.error('Error revoking request:', error);
    res.status(500).json({ 
      error: 'Failed to revoke request',
      message: error.message
    });
  }
};

/**
 * Revoke an active sharing session
 * POST /api/share/session/:sessionId/revoke
 */
export const revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.userId;

    const session = await SharedSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({ 
        error: 'Session not found',
        message: 'Sharing session does not exist'
      });
    }

    // Verify user is a participant
    const isParticipant = session.participants.some(
      p => p.toString() === userId
    );

    if (!isParticipant) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'You are not a participant in this session'
      });
    }

    if (!session.isActive) {
      return res.status(400).json({ 
        error: 'Session already ended',
        message: 'Session is no longer active'
      });
    }

    session.isActive = false;
    session.revokedBy = userId;
    session.revokedAt = new Date();
    await session.save();

    // Emit socket event to end session
    if (ioInstance) {
      const roomId = `share_${sessionId}`;
      ioInstance.to(roomId).emit('share:end', {
        sessionId: session._id,
        endedBy: userId,
        endedAt: session.revokedAt
      });
    }

    res.json({
      success: true,
      message: 'Session revoked',
      sessionId: session._id
    });
  } catch (error) {
    console.error('Error revoking session:', error);
    res.status(500).json({ 
      error: 'Failed to revoke session',
      message: error.message
    });
  }
};

/**
 * Get active sessions for the logged-in user
 * GET /api/share/sessions
 */
export const getActiveSessions = async (req, res) => {
  try {
    const userId = req.userId;

    const sessions = await SharedSession.find({
      participants: userId,
      isActive: true,
      expiresAt: { $gt: new Date() }
    })
      .populate('participants', 'name email phone')
      .populate('requestId', 'from to status')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      sessions: sessions.map(s => ({
        sessionId: s._id,
        participants: s.participants.map(p => ({
          id: p._id,
          name: p.name,
          email: p.email
        })),
        expiresAt: s.expiresAt,
        createdAt: s.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sessions',
      message: error.message
    });
  }
};

/**
 * Search users by username/email/phone
 * GET /api/share/users/search?q=username
 */
export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.userId;

    console.log('🔍 Search query:', q, 'from user:', currentUserId);

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        users: []
      });
    }

    // Search by name, email, or phone
    const searchRegex = new RegExp(q, 'i');
    const users = await User.find({
      $and: [
        { _id: { $ne: currentUserId } },
        {
          $or: [
            { name: searchRegex },
            { email: searchRegex },
            { phone: searchRegex }
          ]
        }
      ]
    })
      .select('name email phone')
      .limit(10);

    console.log('🔍 Search results:', users.length, 'users found');
    users.forEach(u => console.log('  -', u.name, u.email));

    res.json({
      success: true,
      users: users.map(u => ({
        id: u._id,
        name: u.name,
        email: u.email,
        phone: u.phone
      }))
    });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ 
      error: 'Failed to search users',
      message: error.message
    });
  }
};
