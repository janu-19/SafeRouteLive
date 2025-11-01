import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startDirectShare, searchUsers } from '../services/shareService';
import { Search, Send, User, Mail, Phone, MapPin, Loader } from 'lucide-react';

/**
 * DirectShare Component
 * Allows searching for users and directly sharing location without approval
 */
export default function DirectShare({ onShareStarted }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSharing, setIsSharing] = useState({});
  const [error, setError] = useState(null);

  // Debounced search
  const handleSearch = async (query) => {
    setSearchQuery(query);
    setError(null);

    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const data = await searchUsers(query);
      setSearchResults(data.users || []);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to search users');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDirectShare = async (user) => {
    if (isSharing[user.id]) return;

    setIsSharing(prev => ({ ...prev, [user.id]: true }));
    setError(null);

    try {
      // Try by username first, then fallback to ID
      const response = await startDirectShare(
        user.id,
        user.name || user.email || user.phone
      );

      if (onShareStarted) {
        onShareStarted(response);
      }

      // Navigate to tracking page
      navigate(`/share/track/${response.sessionId}`);
    } catch (err) {
      console.error('Direct share error:', err);
      setError(err.message || 'Failed to start sharing');
      setIsSharing(prev => ({ ...prev, [user.id]: false }));
    }
  };

  return (
    <div className="glass rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Send className="text-2xl text-green-400" />
        <div>
          <h2 className="text-xl font-semibold">Share Location Directly</h2>
          <p className="text-sm text-slate-400">Search by name, email, or phone and share instantly</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/40 border border-white/20 focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/20"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader className="animate-spin text-green-400" size={18} />
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {searchResults.map((user) => (
            <div
              key={user.id}
              className="glass rounded-lg p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <User size={20} className="text-green-400" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-3 mt-1">
                    {user.email && (
                      <span className="flex items-center gap-1">
                        <Mail size={12} />
                        {user.email}
                      </span>
                    )}
                    {user.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={12} />
                        {user.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDirectShare(user)}
                disabled={isSharing[user.id]}
                className="px-4 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {isSharing[user.id] ? (
                  <>
                    <Loader className="animate-spin" size={16} />
                    Sharing...
                  </>
                ) : (
                  <>
                    <MapPin size={16} />
                    Share Now
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && !error && (
        <div className="text-center text-sm text-slate-400 py-8">
          No users found matching "{searchQuery}"
        </div>
      )}

      {/* Instructions */}
      {searchQuery.length === 0 && (
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-sm text-blue-300">
          💡 <strong>Tip:</strong> Type at least 2 characters to search. You can search by:
          <ul className="mt-2 ml-4 list-disc space-y-1">
            <li>Name: "Alice", "Bob"</li>
            <li>Email: "alice@example.com"</li>
            <li>Phone: "+1234567890"</li>
          </ul>
        </div>
      )}
    </div>
  );
}

