import { motion, AnimatePresence } from 'framer-motion';

export default function GoogleMapsModal({ isOpen, onClose, source, destination, geometry }) {
  const generateGoogleMapsUrl = () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const encodedSource = encodeURIComponent(source);
    const encodedDest = encodeURIComponent(destination);
    
    if (!apiKey) {
      // Fallback: Use Google Maps standard embed (requires API key)
      // Return null to show alternative message
      return null;
    }
    
    // If we have route geometry, use waypoints
    if (geometry && geometry.coordinates && Array.isArray(geometry.coordinates) && geometry.coordinates.length > 2) {
      const coords = geometry.coordinates;
      
      // Sample waypoints evenly from the route
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
        // Use Google Maps Embed API format
        return `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${encodedSource}&destination=${encodedDest}&waypoints=${encodeURIComponent(waypointsStr)}`;
      }
    }
    
    // Fallback to simple origin/destination
    return `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${encodedSource}&destination=${encodedDest}`;
  };

  const generateFallbackUrl = () => {
    const encodedSource = encodeURIComponent(source);
    const encodedDest = encodeURIComponent(destination);
    return `https://www.google.com/maps/dir/?api=1&origin=${encodedSource}&destination=${encodedDest}&travelmode=driving`;
  };

  if (!isOpen || !source || !destination) return null;

  const mapsUrl = generateGoogleMapsUrl();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="glass rounded-2xl overflow-hidden border border-white/20 w-full max-w-6xl h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div>
                  <h3 className="text-xl font-semibold">Route Directions</h3>
                  <p className="text-sm opacity-70 mt-1">{source} → {destination}</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  title="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Google Maps iframe */}
              <div className="flex-1 relative bg-gray-900">
                {mapsUrl ? (
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={mapsUrl}
                    title="Google Maps Route"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center flex-col p-8">
                    <div className="text-center mb-6">
                      <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      <p className="text-lg font-semibold mb-2">Google Maps API Key Required</p>
                      <p className="text-sm opacity-70 mb-4">
                        To embed Google Maps, please add your API key to the .env file:
                      </p>
                      <code className="text-xs bg-black/30 px-3 py-2 rounded mb-4 block">
                        VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
                      </code>
                    </div>
                    <a
                      href={generateFallbackUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:brightness-110 transition-all flex items-center gap-2 font-semibold"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                        <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                      </svg>
                      Open in New Tab
                    </a>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

