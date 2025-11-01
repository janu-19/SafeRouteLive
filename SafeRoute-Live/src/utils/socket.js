import { io } from 'socket.io-client';

let socketInstance = null;

// Get server URL from environment or default
const getServerUrl = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  return apiBaseUrl;
};

/**
 * Initialize or return existing socket connection
 * @param {string} serverUrl - Socket server URL (optional, uses env var if not provided)
 * @returns {Socket} Socket instance
 */
export function initializeSocket(serverUrl = '') {
  if (socketInstance?.connected) {
    return socketInstance;
  }

  const url = serverUrl || getServerUrl();
  console.log('🔌 Connecting to Socket.IO server:', url);

  socketInstance = io(url, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    timeout: 20000,
    autoConnect: true
  });

  socketInstance.on('connect', () => {
    console.log('✅ Socket connected:', socketInstance.id);
  });

  socketInstance.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
  });

  socketInstance.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error);
  });

  socketInstance.on('error', (error) => {
    console.error('❌ Socket error:', error);
  });

  socketInstance.on('reconnect', (attemptNumber) => {
    console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
  });

  socketInstance.on('reconnect_error', (error) => {
    console.error('❌ Socket reconnection error:', error);
  });

  socketInstance.on('reconnect_failed', () => {
    console.error('❌ Socket reconnection failed');
  });

  return socketInstance;
}

/**
 * Join a room for location sharing
 * @param {string} roomId - Room identifier
 * @param {string} userId - User identifier
 * @param {object} location - Initial location data
 */
export function joinRoom(roomId, userId, location) {
  if (!socketInstance?.connected) {
    console.error('Socket not connected');
    return;
  }

  socketInstance.emit('join-room', {
    roomId,
    userId,
    location,
    timestamp: Date.now()
  });
}

/**
 * Leave a room
 * @param {string} roomId - Room identifier
 * @param {string} userId - User identifier
 */
export function leaveRoom(roomId, userId) {
  if (!socketInstance?.connected) {
    return;
  }

  socketInstance.emit('leave-room', {
    roomId,
    userId,
    timestamp: Date.now()
  });
}

/**
 * Broadcast location update to room
 * @param {string} roomId - Room identifier
 * @param {string} userId - User identifier
 * @param {object} location - Location data
 */
export function broadcastLocation(roomId, userId, location) {
  if (!socketInstance?.connected) {
    return;
  }

  socketInstance.emit('location-update', {
    roomId,
    userId,
    location: {
      ...location,
      timestamp: Date.now()
    }
  });
}

/**
 * Listen for location updates from other users
 * @param {Function} callback - Callback function
 */
export function onLocationUpdate(callback) {
  if (!socketInstance) {
    return;
  }

  socketInstance.on('location-update', callback);

  return () => {
    socketInstance?.off('location-update', callback);
  };
}

/**
 * Listen for user joined events
 * @param {Function} callback - Callback function
 */
export function onUserJoined(callback) {
  if (!socketInstance) {
    return;
  }

  socketInstance.on('user-joined', callback);

  return () => {
    socketInstance?.off('user-joined', callback);
  };
}

/**
 * Listen for user left events
 * @param {Function} callback - Callback function
 */
export function onUserLeft(callback) {
  if (!socketInstance) {
    return;
  }

  socketInstance.on('user-left', callback);

  return () => {
    socketInstance?.off('user-left', callback);
  };
}

/**
 * Listen for room users list
 * @param {Function} callback - Callback function
 */
export function onRoomUsers(callback) {
  if (!socketInstance) {
    return;
  }

  socketInstance.on('room-users', callback);

  return () => {
    socketInstance?.off('room-users', callback);
  };
}

/**
 * Cleanup socket connection
 */
export function cleanupSocket() {
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
  }
}

/**
 * Get socket connection status
 * @returns {boolean}
 */
export function isSocketConnected() {
  return socketInstance?.connected ?? false;
}

/**
 * Get socket instance
 * @returns {Socket|null}
 */
export function getSocket() {
  return socketInstance;
}