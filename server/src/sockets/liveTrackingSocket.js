import jwt from 'jsonwebtoken';
import ShareRequest from '../models/ShareRequest.js';
import SharedSession from '../models/SharedSession.js';
import ChatMessage from '../models/ChatMessage.js';

/**
 * Rate limiting map: socketId -> lastUpdateTime
 * Limits location updates to allow real-time updates (5 per second)
 */
const rateLimitMap = new Map();
const LOCATION_UPDATE_RATE_LIMIT_MS = 200; // 200ms for real-time updates

/**
 * Authenticate socket connection via JWT token
 * Token can be provided in auth object or query parameter
 */
export const authenticateSocket = (socket, next) => {
  try {
    // Try to get token from auth object first (preferred method)
    let token = socket.handshake.auth?.token;
    
    // Fallback to query parameter
    if (!token) {
      token = socket.handshake.query?.token;
    }

    if (!token) {
      console.warn('Socket connection rejected: No token provided');
      return next(new Error('Authentication required'));
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('JWT_SECRET not configured');
      return next(new Error('Server configuration error'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach user info to socket
    socket.userId = decoded.userId || decoded.id;
    socket.user = {
      id: decoded.userId || decoded.id,
      email: decoded.email,
      name: decoded.name
    };

    console.log(`✅ Socket authenticated: User ${socket.userId} (${socket.user.name})`);
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      console.warn('Socket authentication failed:', error.message);
      return next(new Error('Authentication failed: Invalid or expired token'));
    }

    console.error('Socket authentication error:', error);
    return next(new Error('Authentication error'));
  }
};

// Socket.IO instance for emitting events from controller
let ioInstance = null;

export const setIo = (io) => {
  ioInstance = io;
};

/**
 * Initialize share-related socket event handlers
 * @param {Server} io - Socket.IO server instance
 */
export const initializeShareSocketHandlers = (io) => {
  ioInstance = io;
  // Rate limit check for location updates
  const checkRateLimit = (socketId) => {
    const lastUpdate = rateLimitMap.get(socketId);
    const now = Date.now();
    
    if (lastUpdate && (now - lastUpdate) < LOCATION_UPDATE_RATE_LIMIT_MS) {
      return false; // Rate limited
    }
    
    rateLimitMap.set(socketId, now);
    return true; // Allowed
  };

  // Socket connection handler
  // Authentication is optional - old handlers work without auth
  // Share handlers require auth and will check socket.userId
  io.on('connection', async (socket) => {
    // Try to authenticate if token is provided
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    const JWT_SECRET = process.env.JWT_SECRET; // Declare outside try block for catch block access
    if (token) {
      try {
        if (JWT_SECRET) {
          const decoded = jwt.verify(token, JWT_SECRET);
          socket.userId = decoded.userId || decoded.id;
          socket.user = {
            id: decoded.userId || decoded.id,
            email: decoded.email,
            name: decoded.name
          };
          console.log(`✅ Socket authenticated: User ${socket.userId} (${socket.user.name})`);
        }
      } catch (error) {
        console.warn('⚠️ Socket authentication failed:', error.message);
        console.warn('   Token provided:', token ? token.substring(0, 50) + '...' : 'none');
        console.warn('   JWT_SECRET configured:', JWT_SECRET ? 'Yes' : 'No');
        if (error.name === 'JsonWebTokenError') {
          console.error('   ⚠️ Token signature invalid - JWT_SECRET mismatch or invalid token');
        }
      }
    } else {
      console.log(`🔌 Socket connected (unauthenticated): ${socket.id}`);
    }

    // Join user-specific room for targeted notifications
    if (socket.userId) {
      socket.join(`user_${socket.userId}`);
      console.log(`✅ User ${socket.userId} joined user room: user_${socket.userId}`);
    }

    // Ensure socket is authenticated for share events
    const requireAuth = (event, handler) => {
      socket.on(event, async (...args) => {
        if (!socket.userId) {
          socket.emit('share:error', { message: 'Authentication required' });
          return;
        }
        return handler(...args);
      });
    };

    // Join share room when approved session exists
    requireAuth('share:join', async (data) => {
      try {
        const { sessionId } = data;
        
        if (!sessionId) {
          socket.emit('share:error', { message: 'sessionId is required' });
          return;
        }

        // Verify user is a participant in this session
        const session = await SharedSession.findById(sessionId)
          .populate('participants', 'name email');
        
        if (!session) {
          socket.emit('share:error', { message: 'Session not found' });
          return;
        }

        // Check if session is active
        if (!session.isActive) {
          socket.emit('share:error', { message: 'Session is not active' });
          return;
        }

        // Check if session has expired
        if (new Date() > session.expiresAt) {
          socket.emit('share:expired', { sessionId });
          return;
        }

        // Verify user is a participant
        const isParticipant = session.participants.some(
          p => p._id.toString() === socket.userId
        );

        if (!isParticipant) {
          socket.emit('share:error', { message: 'You are not a participant in this session' });
          return;
        }

        // Join the share room
        const roomId = `share_${sessionId}`;
        socket.join(roomId);
        
        console.log(`✅ User ${socket.userId} joined share room: ${roomId}`);

        // Emit success
        socket.emit('share:joined', { sessionId, roomId });

        // Notify other participants
        socket.to(roomId).emit('share:peerJoined', {
          userId: socket.userId,
          userName: socket.user.name,
          sessionId
        });
      } catch (error) {
        console.error('Error joining share room:', error);
        socket.emit('share:error', { message: error.message });
      }
    });

    // Handle location updates (rate-limited)
    requireAuth('location:update', async (data) => {
      try {
        const { sessionId, lat, lng, timestamp } = data;

        if (!sessionId || lat === undefined || lng === undefined) {
          socket.emit('share:error', { message: 'sessionId, lat, and lng are required' });
          return;
        }

        // Check rate limit
        if (!checkRateLimit(socket.id)) {
          socket.emit('share:rateLimited', { 
            message: 'Location update rate limited. Please wait before sending another update.' 
          });
          return;
        }

        // Verify session exists and user is a participant
        const session = await SharedSession.findById(sessionId);
        
        if (!session) {
          socket.emit('share:error', { message: 'Session not found' });
          return;
        }

        if (!session.isActive) {
          socket.emit('share:error', { message: 'Session is not active' });
          return;
        }

        // Check if session has expired
        if (new Date() > session.expiresAt) {
          socket.emit('share:expired', { sessionId });
          return;
        }

        // Verify user is a participant
        const isParticipant = session.participants.some(
          p => p.toString() === socket.userId
        );

        if (!isParticipant) {
          socket.emit('share:error', { message: 'You are not a participant in this session' });
          return;
        }

        // Broadcast location update to room (excluding sender)
        const roomId = `share_${sessionId}`;
        const updateData = {
          fromUserId: socket.userId,
          fromUserName: socket.user.name,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          timestamp: timestamp || Date.now(),
          sessionId
        };

        socket.to(roomId).emit('location:peerUpdate', updateData);
        
        console.log(`📍 Location update from ${socket.userId} in session ${sessionId}`);
      } catch (error) {
        console.error('Error handling location update:', error);
        socket.emit('share:error', { message: error.message });
      }
    });

    // Handle share end
    requireAuth('share:end', async (data) => {
      try {
        const { sessionId } = data;

        if (!sessionId) {
          socket.emit('share:error', { message: 'sessionId is required' });
          return;
        }

        // Verify session and user participation
        const session = await SharedSession.findById(sessionId);
        
        if (!session) {
          socket.emit('share:error', { message: 'Session not found' });
          return;
        }

        const isParticipant = session.participants.some(
          p => p.toString() === socket.userId
        );

        if (!isParticipant) {
          socket.emit('share:error', { message: 'You are not a participant in this session' });
          return;
        }

        // Update session
        session.isActive = false;
        session.revokedBy = socket.userId;
        session.revokedAt = new Date();
        await session.save();

        // Broadcast end to room
        const roomId = `share_${sessionId}`;
        io.to(roomId).emit('share:end', {
          sessionId,
          endedBy: socket.userId,
          endedAt: new Date()
        });

        // Remove all sockets from room
        const socketsInRoom = await io.in(roomId).fetchSockets();
        socketsInRoom.forEach(s => s.leave(roomId));

        console.log(`🔴 Share session ended: ${sessionId} by ${socket.userId}`);
      } catch (error) {
        console.error('Error ending share session:', error);
        socket.emit('share:error', { message: error.message });
      }
    });

    // ==================== CHAT HANDLERS ====================
    
    // Send chat message
    requireAuth('chat:message', async (data) => {
      try {
        const { sessionId, message, messageType = 'text', location } = data;
        
        if (!sessionId) {
          socket.emit('chat:error', { message: 'sessionId is required' });
          return;
        }
        
        if (!message && !location) {
          socket.emit('chat:error', { message: 'Message or location is required' });
          return;
        }
        
        // Create chat message
        const chatMessage = await ChatMessage.create({
          sessionId,
          sender: socket.userId,
          senderName: socket.user.name,
          message: message || '',
          messageType,
          location
        });
        
        const populated = await ChatMessage.findById(chatMessage._id)
          .populate('sender', 'name email picture')
          .lean();
        
        // Broadcast to all participants in the session/room
        const roomId = `share_${sessionId}`;
        io.to(roomId).emit('chat:newMessage', populated);
        
        console.log(`💬 Chat message sent in session ${sessionId} by ${socket.userId}`);
      } catch (error) {
        console.error('Error sending chat message:', error);
        socket.emit('chat:error', { message: error.message });
      }
    });
    
    // Mark messages as read
    requireAuth('chat:read', async (data) => {
      try {
        const { sessionId } = data;
        
        if (!sessionId) {
          return;
        }
        
        await ChatMessage.updateMany(
          {
            sessionId,
            sender: { $ne: socket.userId },
            'readBy.userId': { $ne: socket.userId }
          },
          {
            $push: {
              readBy: {
                userId: socket.userId,
                readAt: new Date()
              }
            }
          }
        );
        
        // Notify others that messages were read
        const roomId = `share_${sessionId}`;
        socket.to(roomId).emit('chat:read', {
          sessionId,
          userId: socket.userId,
          userName: socket.user.name
        });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      if (socket.userId) {
        console.log(`🔌 Socket disconnected: ${socket.userId} (${socket.id})`);
      }
      
      // Clean up rate limit
      rateLimitMap.delete(socket.id);
    });

    // Periodic check for pending requests and emit share:request events
    const checkPendingRequests = async () => {
      try {
        if (!socket.userId) return;

        // Find pending requests for this user
        const pendingRequests = await ShareRequest.find({
          to: socket.userId,
          status: 'pending'
        })
          .populate('from', 'name email')
          .limit(10);

        // Emit share:request events for any pending requests
        for (const request of pendingRequests) {
          socket.emit('share:request', {
            requestId: request._id,
            from: {
              id: request.from._id,
              name: request.from.name,
              email: request.from.email
            },
            createdAt: request.createdAt
          });
        }

        // Check for approved sessions and emit share:approved
        const activeSessions = await SharedSession.find({
          participants: socket.userId,
          isActive: true,
          expiresAt: { $gt: new Date() }
        })
          .populate('participants', 'name email')
          .populate('requestId');

        for (const session of activeSessions) {
          // Emit share:approved event
          socket.emit('share:approved', {
            sessionId: session._id,
            requestId: session.requestId._id,
            participants: session.participants.map(p => ({
              id: p._id,
              name: p.name,
              email: p.email
            })),
            expiresAt: session.expiresAt,
            createdAt: session.createdAt
          });
        }
      } catch (error) {
        console.error('Error checking pending requests:', error);
      }
    };

    // Check immediately on connect
    checkPendingRequests();

    // Check periodically (every 30 seconds)
    const requestCheckInterval = setInterval(checkPendingRequests, 30000);

    // Cleanup interval on disconnect
    socket.on('disconnect', () => {
      clearInterval(requestCheckInterval);
    });
  });

  // Periodically clean expired sessions
  setInterval(async () => {
    try {
      const now = new Date();
      const expiredSessions = await SharedSession.find({
        isActive: true,
        expiresAt: { $lte: now }
      });

      for (const session of expiredSessions) {
        session.isActive = false;
        await session.save();

        const roomId = `share_${session._id}`;
        io.to(roomId).emit('share:expired', {
          sessionId: session._id,
          expiresAt: session.expiresAt
        });
      }

      if (expiredSessions.length > 0) {
        console.log(`⏰ Cleaned up ${expiredSessions.length} expired sessions`);
      }
    } catch (error) {
      console.error('Error cleaning expired sessions:', error);
    }
  }, 60000); // Check every minute
};

/**
 * Emit share:approved event to both participants when request is approved
 */
export const emitShareApproved = async (io, sessionId) => {
  try {
    const session = await SharedSession.findById(sessionId)
      .populate('participants', 'name email');

    if (!session) return;

    // Emit to both participants
    session.participants.forEach(participant => {
      io.to(`user_${participant._id}`).emit('share:approved', {
        sessionId: session._id,
        participants: session.participants.map(p => ({
          id: p._id,
          name: p.name,
          email: p.email
        })),
        expiresAt: session.expiresAt,
        createdAt: session.createdAt
      });
    });
  } catch (error) {
    console.error('Error emitting share:approved:', error);
  }
};

