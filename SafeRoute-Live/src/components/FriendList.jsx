import { useState, useEffect } from 'react';
import { Search, UserPlus, Check, X, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getFriends, getFriendRequests, sendFriendRequest, acceptFriendRequest, deleteFriendRequest, searchUsers } from '../services/friendService';

export default function FriendList({ onFriendSelect, selectedFriendId = null }) {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ sent: [], received: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('friends'); // 'friends', 'requests', 'search'

  useEffect(() => {
    loadFriends();
    loadRequests();
  }, []);

  const loadFriends = async () => {
    try {
      const data = await getFriends();
      setFriends(data.friends || []);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const loadRequests = async () => {
    try {
      const data = await getFriendRequests();
      setRequests(data);
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = await searchUsers(query);
      setSearchResults(data.users || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (userId) => {
    try {
      await sendFriendRequest(userId);
      await loadRequests();
      // Update search results
      setSearchResults(prev => prev.map(u => 
        u.id === userId ? { ...u, friendshipStatus: 'pending' } : u
      ));
    } catch (error) {
      alert(error.message || 'Failed to send friend request');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await acceptFriendRequest(requestId);
      await loadFriends();
      await loadRequests();
    } catch (error) {
      alert(error.message || 'Failed to accept request');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await deleteFriendRequest(requestId);
      await loadRequests();
    } catch (error) {
      alert(error.message || 'Failed to reject request');
    }
  };

  return (
    <div className="glass rounded-xl p-4 h-full flex flex-col">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
            activeTab === 'friends'
              ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
              : 'bg-slate-100/10 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400'
          }`}
        >
          Friends ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
            activeTab === 'requests'
              ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
              : 'bg-slate-100/10 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400'
          }`}
        >
          Requests ({requests.received?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
            activeTab === 'search'
              ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
              : 'bg-slate-100/10 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400'
          }`}
        >
          Search
        </button>
      </div>

      {activeTab === 'friends' && (
        <div className="flex-1 overflow-y-auto space-y-2">
          {friends.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <Users size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No friends yet</p>
            </div>
          ) : (
            friends.map(friend => (
              <div
                key={friend.id}
                onClick={() => onFriendSelect && onFriendSelect(friend)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedFriendId === friend.id
                    ? 'bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/50'
                    : 'bg-slate-100/10 dark:bg-slate-800/50 hover:bg-slate-100/20 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {friend.picture ? (
                    <img src={friend.picture} alt={friend.name} className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center">
                      <Users size={20} className="text-[var(--color-primary)]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{friend.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{friend.email}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="flex-1 overflow-y-auto space-y-4">
          {requests.received && requests.received.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Received</h3>
              <div className="space-y-2">
                {requests.received.map(request => (
                  <div key={request.id} className="p-3 rounded-lg bg-slate-100/10 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3 mb-2">
                      {request.picture ? (
                        <img src={request.picture} alt={request.name} className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center">
                          <Users size={16} className="text-[var(--color-primary)]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{request.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{request.email}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptRequest(request.requestId)}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-300 text-xs flex items-center justify-center gap-1"
                      >
                        <Check size={14} />
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.requestId)}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs flex items-center justify-center gap-1"
                      >
                        <X size={14} />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {requests.sent && requests.sent.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Sent</h3>
              <div className="space-y-2">
                {requests.sent.map(request => (
                  <div key={request.id} className="p-3 rounded-lg bg-slate-100/10 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                      {request.picture ? (
                        <img src={request.picture} alt={request.name} className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center">
                          <Users size={16} className="text-[var(--color-primary)]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{request.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Pending...</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!requests.received || requests.received.length === 0) && 
           (!requests.sent || requests.sent.length === 0) && (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <UserPlus size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No pending requests</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'search' && (
        <div className="flex-1 flex flex-col">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-100/10 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2">
            {loading ? (
              <div className="text-center py-4 text-slate-500 dark:text-slate-400 text-sm">
                Searching...
              </div>
            ) : searchResults.length === 0 && searchQuery.length >= 2 ? (
              <div className="text-center py-4 text-slate-500 dark:text-slate-400 text-sm">
                No users found
              </div>
            ) : (
              searchResults.map(user => (
                <div key={user.id} className="p-3 rounded-lg bg-slate-100/10 dark:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    {user.picture ? (
                      <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center">
                        <Users size={16} className="text-[var(--color-primary)]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{user.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</div>
                    </div>
                    {user.friendshipStatus === null && (
                      <button
                        onClick={() => handleSendRequest(user.id)}
                        className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)]/20 hover:bg-[var(--color-primary)]/30 text-[var(--color-primary)] text-xs flex items-center gap-1"
                      >
                        <UserPlus size={14} />
                        Add
                      </button>
                    )}
                    {user.friendshipStatus === 'pending' && (
                      <span className="px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-300 text-xs">
                        Pending
                      </span>
                    )}
                    {user.friendshipStatus === 'accepted' && (
                      <span className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-300 text-xs">
                        Friends
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

