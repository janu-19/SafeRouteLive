import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

/**
 * Socket Context
 * Provides authenticated Socket.IO connection with JWT token
 */

const SocketContext = createContext(null);

const WS_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [shareRequests, setShareRequests] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    // Get JWT token from localStorage
    const token = localStorage.getItem('token');

    if (!token) {
      console.warn('⚠️ No token found in localStorage. Socket connection requires authentication.');
      console.warn('💡 Set token with: localStorage.setItem("token", "<your-token>")');
      return;
    }

    console.log('🔌 Initializing authenticated socket connection...');
    console.log('🔑 Token found:', token.substring(0, 50) + '...');
    
    // Initialize socket with authentication
    const newSocket = io(WS_URL, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 20000,
      autoConnect: true
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message || error);
      if (error.message && error.message.includes('Authentication')) {
        console.error('🔐 Authentication failed. Please:');
        console.error('1. Check token: localStorage.getItem("token")');
        console.error('2. Set token: localStorage.setItem("token", "<valid-token>")');
        console.error('3. Verify server JWT_SECRET matches token generation secret');
      }
      setIsConnected(false);
    });

    // Share request received
    newSocket.on('share:request', (data) => {
      console.log('📥 Share request received:', data);
      setShareRequests(prev => {
        // Check if request already exists
        const exists = prev.find(r => r.requestId === data.requestId);
        if (exists) return prev;
        return [...prev, data];
      });
    });

    // Share request approved
    newSocket.on('share:approved', (data) => {
      console.log('✅ Share request approved:', data);
      setActiveSessions(prev => {
        const exists = prev.find(s => s.sessionId === data.sessionId);
        if (exists) return prev;
        return [...prev, data];
      });
      // Remove from pending requests
      setShareRequests(prev => prev.filter(r => r.requestId !== data.requestId));
    });

    // Direct share started (no approval needed)
    newSocket.on('share:direct', (data) => {
      console.log('🚀 Direct share started:', data);
      setActiveSessions(prev => {
        const exists = prev.find(s => s.sessionId === data.sessionId);
        if (exists) return prev;
        return [...prev, data];
      });
    });

    // Share session ended
    newSocket.on('share:end', (data) => {
      console.log('🔴 Share session ended:', data);
      setActiveSessions(prev => prev.filter(s => s.sessionId !== data.sessionId));
    });

    // Share session expired
    newSocket.on('share:expired', (data) => {
      console.log('⏰ Share session expired:', data);
      setActiveSessions(prev => prev.filter(s => s.sessionId !== data.sessionId));
    });

    // Share errors
    newSocket.on('share:error', (data) => {
      console.error('❌ Share error:', data);
    });

    setSocket(newSocket);
    socketRef.current = newSocket;

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // Only run once on mount

  // Update token if it changes (e.g., user logs in)
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (token && socketRef.current && socketRef.current.connected) {
      // Reconnect with new token if token changes
      socketRef.current.auth.token = token;
    } else if (token && (!socketRef.current || !socketRef.current.connected)) {
      // Re-initialize socket if token is available but socket is not connected
      const event = new Event('tokenUpdated');
      window.dispatchEvent(event);
    }
  }, [localStorage.getItem('token')]);

  const value = {
    socket,
    isConnected,
    shareRequests,
    setShareRequests,
    activeSessions,
    setActiveSessions
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

