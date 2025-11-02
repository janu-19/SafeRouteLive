import { useState, useEffect, useRef } from 'react';
import { Send, MapPin, Loader } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { getChatMessages, sendChatMessage, markMessagesAsRead } from '../services/chatService';
import { reverseGeocode } from '../utils/api';

export default function ChatWindow({ sessionId, isOpen, onClose }) {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Load messages on mount
  useEffect(() => {
    if (sessionId && isOpen) {
      loadMessages();
    }
  }, [sessionId, isOpen]);

  // Listen for new messages via Socket.IO
  useEffect(() => {
    if (!socket || !sessionId || !isOpen) return;

    const handleNewMessage = (message) => {
      if (message.sessionId === sessionId) {
        setMessages(prev => {
          // Check if message already exists
          const exists = prev.find(m => m._id === message._id);
          if (exists) return prev;
          return [...prev, message];
        });
        
        // Mark as read if not from current user
        if (message.sender._id !== user?.id) {
          markMessagesAsRead(sessionId).catch(console.error);
        }
      }
    };

    socket.on('chat:newMessage', handleNewMessage);

    return () => {
      socket.off('chat:newMessage', handleNewMessage);
    };
  }, [socket, sessionId, isOpen, user]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mark messages as read when chat opens
  useEffect(() => {
    if (isOpen && sessionId && messages.length > 0) {
      markMessagesAsRead(sessionId).catch(console.error);
    }
  }, [isOpen, sessionId]);

  const loadMessages = async () => {
    if (!sessionId) return;
    
    setLoading(true);
    try {
      const data = await getChatMessages(sessionId);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !sessionId || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      // Send via API (will trigger Socket.IO broadcast)
      const data = await sendChatMessage(sessionId, messageText);
      
      // Optimistically add message to UI
      setMessages(prev => {
        const exists = prev.find(m => m._id === data.message._id);
        if (exists) return prev;
        return [...prev, data.message];
      });
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
      setNewMessage(messageText); // Restore message
    } finally {
      setSending(false);
    }
  };

  const handleShareLocation = async () => {
    if (!sessionId || sending) return;

    try {
      setSending(true);
      
      // Get current location
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            
            // Get address
            const address = await reverseGeocode(longitude, latitude) || 'Unknown location';
            
            // Send location message
            try {
              await sendChatMessage(sessionId, `📍 ${address}`, 'location', {
                latitude,
                longitude,
                address
              });
            } catch (error) {
              console.error('Error sending location:', error);
              alert('Failed to share location');
            } finally {
              setSending(false);
            }
          },
          (error) => {
            console.error('Error getting location:', error);
            alert('Failed to get your location');
            setSending(false);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        alert('Geolocation is not supported by your browser');
        setSending(false);
      }
    } catch (error) {
      console.error('Error sharing location:', error);
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-0 right-0 w-96 h-[500px] z-50 flex flex-col glass rounded-t-xl border border-slate-200/50 dark:border-slate-700/50 shadow-2xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Chat</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isConnected ? 'Connected' : 'Connecting...'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader size={20} className="animate-spin text-[var(--color-primary)]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender._id === user?.id || 
                         message.sender.toString() === user?.id;
            
            return (
              <div
                key={message._id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 ${
                    isOwn
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                  }`}
                >
                  {!isOwn && (
                    <div className="text-xs font-semibold mb-1 opacity-80">
                      {message.senderName || message.sender?.name || 'Unknown'}
                    </div>
                  )}
                  
                  {message.messageType === 'location' && message.location ? (
                    <div>
                      <MapPin size={16} className="inline mb-1" />
                      <div className="text-sm font-medium">{message.location.address}</div>
                      <a
                        href={`https://www.google.com/maps?q=${message.location.latitude},${message.location.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs opacity-80 underline"
                      >
                        View on Map
                      </a>
                    </div>
                  ) : (
                    <div className="text-sm whitespace-pre-wrap">{message.message}</div>
                  )}
                  
                  <div className={`text-xs mt-1 ${isOwn ? 'text-white/70' : 'text-slate-500 dark:text-slate-400'}`}>
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-200/50 dark:border-slate-700/50">
        <div className="flex gap-2">
          <button
            onClick={handleShareLocation}
            disabled={sending || !isConnected}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Share location"
          >
            <MapPin size={18} className="text-[var(--color-primary)]" />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={sending || !isConnected}
            className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending || !isConnected}
            className="p-2 rounded-lg bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {sending ? (
              <Loader size={18} className="animate-spin text-white" />
            ) : (
              <Send size={18} className="text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

