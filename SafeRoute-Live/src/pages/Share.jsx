import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Copy, Check, Share2, MapPin, Send } from 'lucide-react';
import { useSocket } from '../context/SocketContext.jsx';
import ContactList from '../components/ContactList.jsx';
import ShareRequestToast from '../components/ShareRequestToast.jsx';
import DirectShare from '../components/DirectShare.jsx';
import { getActiveSessions } from '../services/shareService.js';

export default function Share() {
  const navigate = useNavigate();
  const { shareRequests, setShareRequests, activeSessions, setActiveSessions } = useSocket();
  const [currentUserId, setCurrentUserId] = useState(null);

  // Get current user ID from token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.userId || payload.id);
      } catch (err) {
        console.error('Error parsing token:', err);
      }
    }
  }, []);

  // Load active sessions on mount
  useEffect(() => {
    loadActiveSessions();
  }, []);

  const loadActiveSessions = async () => {
    try {
      const data = await getActiveSessions();
      setActiveSessions(data.sessions || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const handleRequestApproved = (sessionData) => {
    console.log('Request approved:', sessionData);
    setActiveSessions(prev => [...prev, sessionData]);
    // Navigate to tracking page
    navigate(`/share/track/${sessionData.sessionId}`);
  };

  const handleRequestClose = (requestId) => {
    setShareRequests(prev => prev.filter(r => r.requestId !== requestId));
  };

  // Get mock contacts (in production, fetch from API)
  const contacts = [
    { id: 'user1', name: 'Alice Johnson', email: 'alice@example.com', phone: '+1234567890' },
    { id: 'user2', name: 'Bob Smith', email: 'bob@example.com', phone: '+1234567891' },
    { id: 'user3', name: 'Charlie Brown', email: 'charlie@example.com', phone: '+1234567892' }
  ].filter(c => c.id !== currentUserId);

  return (
    <div className="p-6 max-w-4xl mx-auto h-full overflow-y-auto">
      {/* Incoming Share Requests */}
      {shareRequests.length > 0 && (
        <div className="mb-6 space-y-3">
          {shareRequests.map((request) => (
            <ShareRequestToast
              key={request.requestId}
              request={request}
              onClose={() => handleRequestClose(request.requestId)}
              onApproved={handleRequestApproved}
            />
          ))}
        </div>
      )}

      {/* Direct Share - Main Feature */}
      <div className="mb-6">
        <DirectShare onShareStarted={(data) => {
          setActiveSessions(prev => [...prev, data]);
        }} />
      </div>

      {/* Contact List - Alternative method */}
      <div className="mb-6">
        <ContactList contacts={contacts} currentUserId={currentUserId} />
      </div>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <div className="glass rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="text-xl text-green-400" />
            <h2 className="text-xl font-semibold">Active Sessions</h2>
          </div>
          
          <div className="space-y-2">
            {activeSessions.map((session) => {
              const otherParticipant = session.participants?.find(
                p => p.id !== currentUserId
              );
              
              return (
                <div
                  key={session.sessionId}
                  className="glass rounded-lg p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <MapPin size={20} className="text-green-400" />
                    </div>
                    <div>
                      <div className="font-medium">
                        Sharing with {otherParticipant?.name || 'Unknown'}
                      </div>
                      <div className="text-xs text-slate-400">
                        Session: {session.sessionId.slice(-8)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/share/track/${session.sessionId}`)}
                    className="px-4 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/50 flex items-center gap-2"
                  >
                    <MapPin size={16} />
                    View on Map
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Back to Route Planner */}
      <div className="mt-6">
        <Link 
          to="/route-planner" 
          className="w-full px-4 py-2 rounded-lg glass hover:bg-white/10 transition-all text-center block"
        >
          Back to Route Planner
        </Link>
      </div>
    </div>
  );
}


