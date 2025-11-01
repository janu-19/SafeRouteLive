import { useState, useEffect } from 'react';
import { requestLocationShare, getShareRequests, revokeShareRequest } from '../services/shareService';
import { Check, X, Clock, Share2, User } from 'lucide-react';

/**
 * ContactList Component
 * Displays list of contacts and allows requesting location sharing
 * 
 * In a production app, contacts would come from a backend API
 * For demo purposes, we'll use a mock list or allow manual entry
 */
export default function ContactList({ contacts = [], currentUserId }) {
  const [outboundRequests, setOutboundRequests] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState({});
  const [statusMap, setStatusMap] = useState({}); // userId -> status

  // Fetch outbound requests on mount
  useEffect(() => {
    loadRequests();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadRequests = async () => {
    try {
      const data = await getShareRequests();
      setOutboundRequests(data.outbound || []);
      
      // Update status map
      const status = {};
      data.outbound?.forEach(req => {
        status[req.to.id] = req.status;
      });
      setStatusMap(status);
    } catch (error) {
      // Silently handle authentication errors - share features require token
      if (error.code === 'NO_TOKEN' || error.message?.includes('Authentication')) {
        // Don't show error, just disable share features
        console.log('Share features disabled - token required');
      } else {
        console.error('Error loading requests:', error);
      }
    }
  };

  const handleRequestLocation = async (contactId) => {
    if (loading[contactId]) return;
    
    setLoading(prev => ({ ...prev, [contactId]: true }));
    
    try {
      const response = await requestLocationShare(contactId);
      setStatusMap(prev => ({ ...prev, [contactId]: 'pending' }));
      await loadRequests(); // Refresh requests
    } catch (error) {
      alert(`Failed to send request: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, [contactId]: false }));
    }
  };

  const handleRevokeRequest = async (requestId, contactId) => {
    if (loading[requestId]) return;
    
    setLoading(prev => ({ ...prev, [requestId]: true }));
    
    try {
      await revokeShareRequest(requestId);
      setStatusMap(prev => ({ ...prev, [contactId]: null }));
      await loadRequests(); // Refresh requests
    } catch (error) {
      alert(`Failed to revoke request: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, [requestId]: false }));
    }
  };

  // If no contacts provided, show demo contacts
  const displayContacts = contacts.length > 0 ? contacts : [
    { id: 'user1', name: 'Alice Johnson', email: 'alice@example.com', phone: '+1234567890' },
    { id: 'user2', name: 'Bob Smith', email: 'bob@example.com', phone: '+1234567891' },
    { id: 'user3', name: 'Charlie Brown', email: 'charlie@example.com', phone: '+1234567892' }
  ];

  const getRequestForContact = (contactId) => {
    return outboundRequests.find(req => req.to.id === contactId);
  };

  const getStatusBadge = (contactId) => {
    const status = statusMap[contactId];
    const request = getRequestForContact(contactId);
    
    if (!status && !request) {
      return null; // No request sent
    }

    if (status === 'pending' || request?.status === 'pending') {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 flex items-center gap-1">
          <Clock size={12} />
          Pending
        </span>
      );
    }

    if (status === 'approved' || request?.status === 'approved') {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-300 border border-green-500/50 flex items-center gap-1">
          <Check size={12} />
          Sharing
        </span>
      );
    }

    if (status === 'rejected' || request?.status === 'rejected') {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-300 border border-red-500/50 flex items-center gap-1">
          <X size={12} />
          Rejected
        </span>
      );
    }

    return null;
  };

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Share2 className="text-xl text-blue-400" />
        <h2 className="text-xl font-semibold">Request Location</h2>
      </div>

      {displayContacts.length === 0 ? (
        <div className="text-center text-sm text-slate-400 py-8">
          No contacts available. Add contacts to request location sharing.
        </div>
      ) : (
        <div className="space-y-2">
          {displayContacts.map((contact) => {
            const request = getRequestForContact(contact.id);
            const isPending = statusMap[contact.id] === 'pending' || request?.status === 'pending';
            const isLoading = loading[contact.id] || loading[request?.requestId];

            return (
              <div
                key={contact.id}
                className="glass rounded-lg p-3 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <User size={20} className="text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{contact.name}</div>
                    <div className="text-xs text-slate-400">{contact.email || contact.phone}</div>
                  </div>
                  {getStatusBadge(contact.id)}
                </div>

                <div className="flex items-center gap-2">
                  {isPending && request ? (
                    <button
                      onClick={() => handleRevokeRequest(request.requestId, contact.id)}
                      disabled={isLoading}
                      className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm border border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? '...' : 'Revoke'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRequestLocation(contact.id)}
                      disabled={isLoading || statusMap[contact.id] === 'approved'}
                      className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-sm border border-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isLoading ? (
                        '...'
                      ) : (
                        <>
                          <Share2 size={14} />
                          Request Location
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {contacts.length === 0 && (
        <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-300">
          💡 <strong>Demo Mode:</strong> These are sample contacts. In production, contacts would come from your address book or backend API.
        </div>
      )}
    </div>
  );
}

