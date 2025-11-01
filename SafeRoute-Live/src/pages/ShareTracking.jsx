import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MapView from '../components/MapView.jsx';
import LiveLocationMarker from '../components/LiveLocationMarker.jsx';
import { FriendMarkers } from '../components/FriendMarker.jsx';
import Controls from '../components/Controls.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { watchPosition, requestGeolocationPermission, isGeolocationSupported, getCurrentPosition } from '../utils/geolocation.js';
import { revokeShareSession, getActiveSessions } from '../services/shareService.js';
import { Copy, Check, Wifi, WifiOff, AlertCircle, X } from 'lucide-react';

/**
 * ShareTracking Page
 * Real-time location tracking for approved share sessions
 * Uses authenticated socket connection with share rooms
 */
export default function ShareTracking({ sessionId: propSessionId }) {
  const { sessionId: paramSessionId } = useParams();
  const navigate = useNavigate();
  const sessionId = propSessionId || paramSessionId;
  
  // Socket context
  const { socket, isConnected, activeSessions, setActiveSessions } = useSocket();
  
  // State management
  const [status, setStatus] = useState('Connecting...');
  const [location, setLocation] = useState(null);
  const [peers, setPeers] = useState([]); // { userId, userName, location, lastUpdate }
  const [error, setError] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  
  // Refs
  const mapRef = useRef(null);
  const watchPositionCleanupRef = useRef(null);
  const hasCenteredRef = useRef(false);
  const lastUpdateTimeRef = useRef(0);
  const locationUpdateIntervalRef = useRef(null);

  // Find current session from active sessions
  useEffect(() => {
    if (sessionId && activeSessions) {
      const session = activeSessions.find(s => s.sessionId === sessionId);
      setCurrentSession(session);
    }
  }, [sessionId, activeSessions]);

  // Request geolocation permission
  useEffect(() => {
    if (isGeolocationSupported()) {
      requestGeolocationPermission()
        .then(granted => {
          setPermissionGranted(granted);
          if (!granted) {
            setError('Geolocation permission denied. Please enable location access.');
          }
        })
        .catch(err => {
          console.error('Permission check error:', err);
          setPermissionGranted(true);
        });
    } else {
      setError('Geolocation is not supported by this browser.');
    }
  }, []);

  // Join share room when session is available and socket is connected
  useEffect(() => {
    if (!sessionId || !socket || !isConnected || !permissionGranted) {
      return;
    }

    // Join share room
    socket.emit('share:join', { sessionId });

    // Listen for share events
    const onShareJoined = (data) => {
      console.log('✅ Joined share room:', data);
      setStatus('Connected');
      setIsSharing(true);
    };

    const onShareError = (data) => {
      console.error('Share error:', data);
      setError(data.message || 'Share error occurred');
      setStatus('Error');
    };

    const onPeerUpdate = (data) => {
      const { fromUserId, fromUserName, lat, lng, timestamp } = data;
      
      setPeers(prev => {
        const existing = prev.find(p => p.userId === fromUserId);
        if (existing) {
          return prev.map(p => 
            p.userId === fromUserId
              ? { ...p, location: { latitude: lat, longitude: lng }, lastUpdate: timestamp }
              : p
          );
        } else {
          return [...prev, {
            userId: fromUserId,
            userName: fromUserName,
            location: { latitude: lat, longitude: lng },
            lastUpdate: timestamp
          }];
        }
      });
    };

    const onShareEnd = (data) => {
      console.log('Share session ended:', data);
      setStatus('Session ended');
      setIsSharing(false);
      setCurrentSession(null);
      setPeers([]);
      if (watchPositionCleanupRef.current) {
        watchPositionCleanupRef.current();
      }
      if (locationUpdateIntervalRef.current) {
        clearInterval(locationUpdateIntervalRef.current);
      }
      
      // Navigate away after 3 seconds
      setTimeout(() => {
        navigate('/share');
      }, 3000);
    };

    const onShareExpired = (data) => {
      console.log('Share session expired:', data);
      setError('Session expired');
      setStatus('Expired');
      setIsSharing(false);
    };

    socket.on('share:joined', onShareJoined);
    socket.on('share:error', onShareError);
    socket.on('location:peerUpdate', onPeerUpdate);
    socket.on('share:end', onShareEnd);
    socket.on('share:expired', onShareExpired);

    // Get initial location and start watching
    getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 })
      .then(loc => {
        setLocation(loc);
      })
      .catch(err => {
        console.error('Error getting initial location:', err);
        setError('Failed to get initial location');
      });

    // Start watching position
    watchPositionCleanupRef.current = watchPosition(
      (loc) => {
        setLocation(loc);
        
        // Emit location update (rate-limited to 1 per second)
        const now = Date.now();
        if (now - lastUpdateTimeRef.current >= 1000 && socket && isConnected && isSharing) {
          lastUpdateTimeRef.current = now;
          
          socket.emit('location:update', {
            sessionId,
            lat: loc.latitude,
            lng: loc.longitude,
            timestamp: now
          });
        }
      },
      (err) => {
        console.error('Location error:', err);
        setError(`Location error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    );

    return () => {
      socket.off('share:joined', onShareJoined);
      socket.off('share:error', onShareError);
      socket.off('location:peerUpdate', onPeerUpdate);
      socket.off('share:end', onShareEnd);
      socket.off('share:expired', onShareExpired);
      
      if (watchPositionCleanupRef.current) {
        watchPositionCleanupRef.current();
      }
      if (locationUpdateIntervalRef.current) {
        clearInterval(locationUpdateIntervalRef.current);
      }
    };
  }, [sessionId, socket, isConnected, permissionGranted, isSharing, navigate]);

  // Automatically center map on user location when first received
  useEffect(() => {
    if (location && mapRef.current && !hasCenteredRef.current) {
      mapRef.current.flyTo({
        center: [location.longitude, location.latitude],
        zoom: 16,
        duration: 1500,
        essential: true
      });
      hasCenteredRef.current = true;
    }
  }, [location]);

  // Handle map loaded
  const handleMapLoaded = useCallback((map) => {
    mapRef.current = map;
  }, []);

  // Handle recenter
  const handleRecenter = useCallback((loc) => {
    if (mapRef.current && loc) {
      mapRef.current.flyTo({
        center: [loc.longitude, loc.latitude],
        zoom: 16,
        duration: 1500,
        essential: true
      });
    }
  }, []);

  // Handle share link copy
  const handleShare = useCallback(() => {
    const link = `${window.location.origin}/share/track/${sessionId}`;
    navigator.clipboard.writeText(link)
      .then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      })
      .catch(() => {
        alert(`Share this link: ${link}`);
      });
  }, [sessionId]);

  // Handle end session
  const handleEndSession = async () => {
    if (!sessionId) return;
    
    try {
      await revokeShareSession(sessionId);
      if (socket) {
        socket.emit('share:end', { sessionId });
      }
      setIsSharing(false);
      navigate('/share');
    } catch (error) {
      alert(`Failed to end session: ${error.message}`);
    }
  };

  // Convert peers to friends format for FriendMarkers
  const friends = peers.map(peer => ({
    userId: peer.userId,
    userName: peer.userName,
    location: peer.location
  }));

  return (
    <div className="h-full w-full relative overflow-hidden">
      {/* Map View */}
      <MapView onMapLoaded={handleMapLoaded} />

      {/* User Location Marker */}
      {location && <LiveLocationMarker map={mapRef.current} location={location} userId="me" />}

      {/* Peer Markers */}
      <FriendMarkers map={mapRef.current} friends={friends} />

      {/* Status Bar */}
      <div className="absolute top-24 left-4 right-4 z-10">
        <div className="glass rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isConnected ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              {isConnected ? <Wifi size={18} /> : <WifiOff size={18} />}
            </div>
            <div>
              <div className="text-xs text-slate-400">Share Session</div>
              <div className="font-mono text-sm font-semibold">{sessionId?.slice(-8) || 'loading...'}</div>
            </div>
            {isSharing && (
              <div className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-300 border border-green-500/50">
                Sharing
              </div>
            )}
          </div>
          <div className="text-xs text-slate-400">
            {location ? `${peers.length + 1} users` : 'Locating...'}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="absolute top-32 left-4 right-4 z-10 glass rounded-xl px-4 py-3 flex items-center gap-3 bg-red-500/10 border-red-500/30">
          <AlertCircle size={20} className="text-red-400" />
          <div className="text-sm text-red-300 flex-1">{error}</div>
          <button
            onClick={() => setError(null)}
            className="p-1 rounded hover:bg-red-500/20"
          >
            <X size={16} className="text-red-400" />
          </button>
        </div>
      )}

      {/* Controls */}
      <Controls
        onRecenter={handleRecenter}
        onShare={handleShare}
        location={location}
        map={mapRef.current}
      />

      {/* End Session Button */}
      {isSharing && (
        <div className="absolute bottom-24 right-6 z-10">
          <button
            onClick={handleEndSession}
            className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/50 flex items-center gap-2"
          >
            <X size={18} />
            End Sharing
          </button>
        </div>
      )}

      {/* Share Link Copied Notification */}
      {linkCopied && (
        <div className="absolute bottom-32 right-6 z-10 glass rounded-xl px-4 py-2 flex items-center gap-2 bg-green-500/20 border-green-500/30">
          <Check size={18} className="text-green-400" />
          <span className="text-sm text-green-300">Link copied!</span>
        </div>
      )}
    </div>
  );
}

