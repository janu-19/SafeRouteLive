import { motion } from 'framer-motion';
import { useState } from 'react';

export default function RouteCard({ 
  color = '#3b82f6', 
  name, 
  score, 
  distanceKm, 
  etaMin, 
  onSelect,
  metadata,
  isARecommended = false,
  index = 0,
  source = '',
  destination = '',
  geometry = null
}) {
  const [showMapPreview, setShowMapPreview] = useState(false);
  const safetyLabel = score > 75 ? 'Safe' : score >= 50 ? 'Moderate' : 'Risky';
  const isNight = metadata?.isNight || false;
  const isMonsoon = metadata?.isMonsoon || false;
  
  const openFullScreen = (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!source || !destination) {
      console.error('Source or destination missing');
      return;
    }
    
    // Generate Google Maps URL for popup
    const generateGoogleMapsPopupUrl = () => {
      const encodedSource = encodeURIComponent(source);
      const encodedDest = encodeURIComponent(destination);
      
      // If we have route geometry, use waypoints
      if (geometry && geometry.coordinates && Array.isArray(geometry.coordinates) && geometry.coordinates.length > 2) {
        const coords = geometry.coordinates;
        const numWaypoints = Math.min(10, Math.max(3, Math.floor(coords.length / 20)));
        const step = Math.max(1, Math.floor((coords.length - 2) / numWaypoints));
        
        const waypoints = [];
        for (let i = step; i < coords.length - step; i += step) {
          if (coords[i] && Array.isArray(coords[i]) && coords[i].length >= 2) {
            const lat = coords[i][1];
            const lng = coords[i][0];
            if (typeof lat === 'number' && typeof lng === 'number' && 
                lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
              waypoints.push(`${lat},${lng}`);
            }
          }
        }
        
        const selectedWaypoints = waypoints.slice(0, 10);
        if (selectedWaypoints.length > 0) {
          const waypointsStr = selectedWaypoints.join('|');
          return `https://www.google.com/maps/dir/?api=1&origin=${encodedSource}&destination=${encodedDest}&waypoints=${encodeURIComponent(waypointsStr)}&travelmode=driving`;
        }
      }
      
      // Fallback to simple origin/destination
      return `https://www.google.com/maps/dir/?api=1&origin=${encodedSource}&destination=${encodedDest}&travelmode=driving`;
    };
    
    const mapsUrl = generateGoogleMapsPopupUrl();
    
    // Open in popup window
    const popup = window.open(
      mapsUrl,
      'GoogleMapsRoute',
      'width=1200,height=800,scrollbars=yes,resizable=yes,location=yes,toolbar=yes,menubar=yes'
    );
    
    if (popup) {
      popup.focus();
    } else {
      // If popup blocked, fallback to new tab
      window.open(mapsUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const toggleMapPreview = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setShowMapPreview(!showMapPreview);
  };

  const generateGoogleMapsUrl = () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !source || !destination) return null;
    
    const encodedSource = encodeURIComponent(source);
    const encodedDest = encodeURIComponent(destination);
    
    if (geometry && geometry.coordinates && Array.isArray(geometry.coordinates) && geometry.coordinates.length > 2) {
      const coords = geometry.coordinates;
      const numWaypoints = Math.min(10, Math.max(3, Math.floor(coords.length / 20)));
      const step = Math.max(1, Math.floor((coords.length - 2) / numWaypoints));
      
      const waypoints = [];
      for (let i = step; i < coords.length - step; i += step) {
        if (coords[i] && Array.isArray(coords[i]) && coords[i].length >= 2) {
          const lat = coords[i][1];
          const lng = coords[i][0];
          if (typeof lat === 'number' && typeof lng === 'number' && 
              lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            waypoints.push(`${lat},${lng}`);
          }
        }
      }
      
      const selectedWaypoints = waypoints.slice(0, 10);
      if (selectedWaypoints.length > 0) {
        const waypointsStr = selectedWaypoints.join('|');
        return `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${encodedSource}&destination=${encodedDest}&waypoints=${encodeURIComponent(waypointsStr)}`;
      }
    }
    
    return `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${encodedSource}&destination=${encodedDest}`;
  };
  
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.02 }}
      onClick={onSelect}
      className="glass w-full rounded-xl p-4 text-left hover:bg-white/10 transition-all border border-white/10 hover:border-white/20 relative overflow-hidden"
    >
      {/* AI Recommended Badge */}
      {isARecommended && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-2 right-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"
        >
          🤖 AI Recommended
        </motion.div>
      )}
      
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <span>{name}</span>
          {/* Safety Trend Icons */}
          <div className="flex items-center gap-1">
            {isNight && (
              <motion.span
                initial={{ opacity: 0, rotate: -10 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg"
                title="Night time - Enhanced lighting weight applied"
              >
                🌙
              </motion.span>
            )}
            {isMonsoon && (
              <motion.span
                initial={{ opacity: 0, rotate: -10 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ delay: 0.3 }}
                className="text-lg"
                title="Monsoon season - Accident factor increased"
              >
                🌧️
              </motion.span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs px-2 py-1 rounded" style={{ 
            backgroundColor: score > 75 ? 'rgba(34, 197, 94, 0.2)' : score >= 50 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: score > 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'
          }}>
            {safetyLabel}
          </div>
          {source && destination && (
            <button
              onClick={openFullScreen}
              className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 transition-colors border border-blue-500/30 hover:border-blue-500/50"
              title="Open Google Maps in Full Screen"
            >
              <svg 
                className="w-4 h-4 text-blue-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" 
                />
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" 
                />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between text-sm mb-3">
        <span className="opacity-90">{distanceKm} km • {etaMin} min</span>
        <span className="opacity-70 font-semibold">Score: {score}</span>
      </div>

      {/* Map Preview Toggle Button */}
      {source && destination && (
        <div className="mt-2">
          <button
            onClick={toggleMapPreview}
            className="w-full text-xs text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1 py-1.5 hover:bg-white/5 rounded transition-colors"
          >
            {showMapPreview ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                Hide Map Preview
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Show Map Preview
              </>
            )}
          </button>

          {/* Small Map Preview */}
          {showMapPreview && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 rounded-lg overflow-hidden border border-white/20 relative"
              style={{ height: '200px' }}
            >
              {generateGoogleMapsUrl() ? (
                <>
                  <iframe
                    width="100%"
                    height="200"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={generateGoogleMapsUrl()}
                    title="Route Preview"
                  />
                  {/* Full Screen Button Overlay */}
                  <div className="absolute bottom-2 right-2">
                    <button
                      onClick={openFullScreen}
                      className="px-3 py-1.5 bg-blue-600/90 hover:bg-blue-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 backdrop-blur-sm border border-blue-500/50 hover:border-blue-400 transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      Full Screen
                    </button>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-900/50 flex-col p-4">
                  <p className="text-xs opacity-70 mb-2">Map preview requires API key</p>
                  <button
                    onClick={openFullScreen}
                    className="px-3 py-1.5 bg-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Open Full Screen
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}
      
    </motion.button>
  );
}


