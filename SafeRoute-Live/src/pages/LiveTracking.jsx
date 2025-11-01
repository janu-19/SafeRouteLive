import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import MapView from '../components/MapView.jsx';
import LiveLocationMarker from '../components/LiveLocationMarker.jsx';
import { FriendMarkers } from '../components/FriendMarker.jsx';
import Controls from '../components/Controls.jsx';
import { initializeSocket, joinRoom, leaveRoom, broadcastLocation, onLocationUpdate, onUserJoined, onUserLeft, onRoomUsers, cleanupSocket, isSocketConnected } from '../utils/socket.js';
import { watchPosition, requestGeolocationPermission, isGeolocationSupported } from '../utils/geolocation.js';
import { Copy, Check, Wifi, WifiOff, AlertCircle } from 'lucide-react';

/**
 * LiveTracking Page
 * Main page for real-time location tracking with room-based sharing
 */
export default function LiveTracking() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  
  // State management
  const [status, setStatus] = useState('Connecting...');
  const [location, setLocation] = useState(null);
  const [friends, setFriends] = useState([]);
  const [error, setError] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  
  // Refs
  const mapRef = useRef(null);
  const userIdRef = useRef(`user_${Math.random().toString(36).slice(2, 9)}`);
  const watchPositionCleanupRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    initializeSocket();
    
    return () => {
      cleanupSocket();
    };
  }, []);

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

  // Wait for socket connection then join room
  useEffect(() => {
    if (!permissionGranted) {
      return;
    }

    // Set up socket event listeners first
    const cleanupLocationUpdate = onLocationUpdate((data) => {
      if (data.userId !== userIdRef.current) {
        setFriends(prevFriends => {
          const filtered = prevFriends.filter(f => f.userId !== data.userId);
          return [...filtered, { userId: data.userId, location: data.location }];
        });
      }
    });

    const cleanupUserJoined = onUserJoined((data) => {
      console.log('User joined:', data);
      setStatus('Connected');
    });

    const cleanupUserLeft = onUserLeft((data) => {
      console.log('User left:', data);
      setFriends(prevFriends => prevFriends.filter(f => f.userId !== data.userId));
    });

    const cleanupRoomUsers = onRoomUsers((data) => {
      console.log('Room users:', data);
      if (data.users) {
        setFriends(data.users.filter(u => u.userId !== userIdRef.current));
      }
      setStatus('Connected');
    });

    // Wait for socket connection
    const checkConnection = () => {
      if (isSocketConnected()) {
        setStatus('Joining room...');
        
        // Initial location
        getCurrentLocation((loc) => {
          joinRoom(roomId, userIdRef.current, loc);
          setLocation(loc);
        });

        // Watch for location updates
        watchPositionCleanupRef.current = watchPosition(
          (loc) => {
            setLocation(loc);
            if (isSocketConnected()) {
              broadcastLocation(roomId, userIdRef.current, loc);
            }
          },
          (err) => {
            console.error('Location error:', err);
            setError(`Location error: ${err.message}`);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
        );
      } else {
        // Retry after a short delay
        setTimeout(checkConnection, 500);
      }
    };

    checkConnection();

    return () => {
      if (watchPositionCleanupRef.current) {
        watchPositionCleanupRef.current();
      }
      cleanupLocationUpdate();
      cleanupUserJoined();
      cleanupUserLeft();
      cleanupRoomUsers();
      if (isSocketConnected()) {
        leaveRoom(roomId, userIdRef.current);
      }
    };
  }, [roomId, permissionGranted]);

  // Get current location once
  const getCurrentLocation = (callback) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          callback({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed
          });
        },
        (err) => {
          console.error('Get location error:', err);
        }
      );
    }
  };

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

  // Handle share
  const handleShare = useCallback(() => {
    const link = `${window.location.origin}/track/${roomId}`;
    navigator.clipboard.writeText(link)
      .then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      })
      .catch(() => {
        // Fallback: show alert
        alert( `Share this link: ${link}`);
      });
  }, [roomId]);

  return (
    <div className="h-full w-full relative overflow-hidden">
      {/* Map View */}
      <MapView onMapLoaded={handleMapLoaded} />

      {/* User Location Marker */}
      {location && <LiveLocationMarker map={mapRef.current} location={location} userId={userIdRef.current} />}

      {/* Friend Markers */}
      <FriendMarkers map={mapRef.current} friends={friends} />

      {/* Status Bar */}
      <div className="absolute top-24 left-4 right-4 z-10">
        <div className="glass rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isSocketConnected() ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              {isSocketConnected() ? <Wifi size={18} /> : <WifiOff size={18} />}
            </div>
            <div>
              <div className="text-xs text-slate-400">Room</div>
              <div className="font-mono text-sm font-semibold">{roomId || 'loading...'}</div>
            </div>
          </div>
          <div className="text-xs text-slate-400">
            {location ? `${friends.length + 1} users` : 'Locating...'}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="absolute top-32 left-4 right-4 z-10 glass rounded-xl px-4 py-3 flex items-center gap-3 bg-red-500/10 border-red-500/30">
          <AlertCircle size={20} className="text-red-400" />
          <div className="text-sm text-red-300">{error}</div>
        </div>
      )}

      {/* Controls */}
      <Controls
        onRecenter={handleRecenter}
        onShare={handleShare}
        location={location}
        map={mapRef.current}
      />

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