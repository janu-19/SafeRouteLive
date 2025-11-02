import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import MapComponent from '../components/MapComponent.jsx';
import RouteCard from '../components/RouteCard.jsx';
import FloatingButtons from '../components/FloatingButtons.jsx';
import AISuggestionModal from '../components/AISuggestionModal.jsx';
import { getSafeRoutes, getAccidents, getAISafetySuggestion, getAddressSuggestions, getNearbySafePlaces } from '../utils/api.js';
import { useSocket } from '../context/SocketContext.jsx';

export default function RoutePlanner() {
  const [source, setSource] = useState('MG Road, Bengaluru');
  const [dest, setDest] = useState('Indiranagar, Bengaluru');
  const [pref, setPref] = useState('Well-lit');
  const [routes, setRoutes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [accidents, setAccidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAISuggestion, setShowAISuggestion] = useState(false);
  const [aiSuggestion, setAISuggestion] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  
  // Refs for AI suggestion (must be declared early to avoid reference errors)
  const aiSuggestionRef = useRef(null);
  const showAISuggestionRef = useRef(false);
  const fetchAISuggestionRef = useRef(null);
  const [routeCompleted, setRouteCompleted] = useState(false);
  const [sourceSuggestions, setSourceSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showSourceSuggestions, setShowSourceSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [safeZones, setSafeZones] = useState([]);
  const [loadingSafeZones, setLoadingSafeZones] = useState(false);
  const [predictiveAlert, setPredictiveAlert] = useState(null);
  const intervalRef = useRef(null);
  
  // Socket for predictive alerts
  const { socket } = useSocket();
  const lastFetchRef = useRef(null); // Initialize as null, only set after successful search
  const routeStartTimeRef = useRef(null);
  const sourceRef = useRef(source);
  const destRef = useRef(dest);
  const prefRef = useRef(pref);
  const isSearchingRef = useRef(false);
  const allowAutoRefreshRef = useRef(false);
  const sourceInputRef = useRef(null);
  const destInputRef = useRef(null);
  const sourceSuggestionsRef = useRef(null);
  const destSuggestionsRef = useRef(null);
  const sourceDebounceTimerRef = useRef(null);
  const destDebounceTimerRef = useRef(null);

  const fetchSafeRoutes = async (isManual = false) => {
    // Prevent multiple simultaneous searches
    if (isSearchingRef.current) return;
    
    // Use refs to get current values to avoid closure issues
    const currentSource = sourceRef.current || source;
    const currentDest = destRef.current || dest;
    const currentPref = prefRef.current || pref;
    
    if (!currentSource || !currentDest) return;
    
    // ONLY allow manual searches (button clicks) - block ALL automatic searches
    if (!isManual) {
      // Completely block automatic route fetching
      return;
    }
    
    isSearchingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      const response = await getSafeRoutes(currentSource, currentDest, currentPref);
      const formattedRoutes = response.routes.map((route, index) => ({
        ...route,
        id: route.id,
        name: route.name,
        color: route.color,
        score: route.safetyScore,
        distanceKm: (route.distance / 1000).toFixed(1),
        etaMin: Math.round(route.duration / 60),
        geometry: route.geometry,
        metadata: route.metadata || {},
        scoreReasons: route.scoreReasons || null // Include score reasons
      }));
      
      // Find safest route for AI recommendation
      const safestRouteId = formattedRoutes.reduce((best, route) => 
        route.score > best.score ? route : best
      , formattedRoutes[0])?.id;
      
      setRoutes(formattedRoutes.map(route => ({
        ...route,
        isARecommended: route.id === safestRouteId
      })));
      
      if (formattedRoutes.length > 0 && !selected) {
        setSelected({ ...formattedRoutes[0], isARecommended: formattedRoutes[0].id === safestRouteId });
      }
      
      // Update selected route if it still exists in new routes
      if (selected) {
        const updatedSelected = formattedRoutes.find(r => r.id === selected.id);
        if (updatedSelected) {
          setSelected({ ...updatedSelected, isARecommended: updatedSelected.id === safestRouteId });
        } else if (formattedRoutes.length > 0) {
          setSelected({ ...formattedRoutes[0], isARecommended: formattedRoutes[0].id === safestRouteId });
        }
      }
      
      // Only update lastFetchRef after successful search
      lastFetchRef.current = { source: currentSource, dest: currentDest, pref: currentPref };
      
      // Automatically fetch AI suggestion when routes are loaded
      if (formattedRoutes.length > 0) {
        // Fetch AI suggestion with real-time data (using ref to avoid dependency issues)
        setTimeout(() => {
          if (fetchAISuggestionRef.current) {
            fetchAISuggestionRef.current(false); // Don't force modal open, just fetch in background
          }
        }, 1000); // Wait 1 second after routes load
      }
      
      // Track route start time for completion simulation
      if (formattedRoutes.length > 0) {
        routeStartTimeRef.current = Date.now();
        setRouteCompleted(false);
        // Enable auto-refresh ONLY after a successful MANUAL search
        // Automatic searches should never enable auto-refresh
        if (isManual) {
          allowAutoRefreshRef.current = true;
        } else {
          // This was an automatic refresh - keep auto-refresh enabled only if already enabled
          // Don't change the state
        }
      } else {
        // If no routes returned, disable auto-refresh
        allowAutoRefreshRef.current = false;
      }
    } catch (err) {
      console.error('Error fetching safe routes:', err);
      if (err.message?.includes('Failed to fetch') || err.message?.includes('Connection refused')) {
        setError('Backend server is not running. Please start the server on port 3001.');
      } else {
        // Use error message from API response if available
        setError(err.data?.error || err.message || 'Failed to fetch safe routes. Please try again with more specific location names.');
      }
    } finally {
      setLoading(false);
      isSearchingRef.current = false;
    }
  };

  const fetchAccidents = async () => {
    try {
      const response = await getAccidents();
      setAccidents(response.data || []);
    } catch (err) {
      // Only log if it's not a connection error (server might not be running)
      if (!err.message?.includes('Failed to fetch') && !err.message?.includes('Connection refused')) {
        console.error('Error fetching accidents:', err);
      }
      // Set empty array as fallback
      setAccidents([]);
    }
  };

  // Fetch address suggestions with debouncing
  const fetchSuggestions = async (query, setSuggestions, setShow) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setShow(false);
      return;
    }

    try {
      const results = await getAddressSuggestions(query);
      setSuggestions(results);
      setShow(true);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setSuggestions([]);
    }
  };

  // Listen for AI Predictive Alert socket events
  useEffect(() => {
    if (!socket) return;

    const handlePredictiveAlert = (data) => {
      console.log('🔮 AI Predictive Alert received:', data);
      setPredictiveAlert(data);
      
      // Auto re-fetch routes to avoid the predicted danger zone
      // This triggers re-calculation of the safest route around the predicted incident
      if (routes.length > 0 && selected && sourceRef.current && destRef.current) {
        console.log('🔄 Re-routing to avoid predicted danger zone...');
        // Re-fetch routes after a short delay to show the re-routing message
        setTimeout(() => {
          fetchSafeRoutes(true);
        }, 2500);
      }
    };

    socket.on('predictive-alert', handlePredictiveAlert);

    return () => {
      socket.off('predictive-alert', handlePredictiveAlert);
    };
  }, [socket, routes, selected]);

  // Debounced search for source
  useEffect(() => {
    if (sourceDebounceTimerRef.current) {
      clearTimeout(sourceDebounceTimerRef.current);
    }

    sourceDebounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(source, setSourceSuggestions, setShowSourceSuggestions);
    }, 300); // 300ms debounce

    return () => {
      if (sourceDebounceTimerRef.current) {
        clearTimeout(sourceDebounceTimerRef.current);
      }
    };
  }, [source]);

  // Debounced search for destination
  useEffect(() => {
    if (destDebounceTimerRef.current) {
      clearTimeout(destDebounceTimerRef.current);
    }

    destDebounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(dest, setDestSuggestions, setShowDestSuggestions);
    }, 300); // 300ms debounce

    return () => {
      if (destDebounceTimerRef.current) {
        clearTimeout(destDebounceTimerRef.current);
      }
    };
  }, [dest]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        sourceInputRef.current && !sourceInputRef.current.contains(event.target) &&
        sourceSuggestionsRef.current && !sourceSuggestionsRef.current.contains(event.target)
      ) {
        setShowSourceSuggestions(false);
      }
      if (
        destInputRef.current && !destInputRef.current.contains(event.target) &&
        destSuggestionsRef.current && !destSuggestionsRef.current.contains(event.target)
      ) {
        setShowDestSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAccidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle suggestion selection
  const handleSourceSuggestion = (suggestion) => {
    // Use a shorter, cleaner address format
    const address = suggestion.text || suggestion.place_name;
    setSource(address);
    sourceRef.current = address;
    setShowSourceSuggestions(false);
    setSourceSuggestions([]);
  };

  const handleDestSuggestion = (suggestion) => {
    // Use a shorter, cleaner address format
    const address = suggestion.text || suggestion.place_name;
    setDest(address);
    destRef.current = address;
    setShowDestSuggestions(false);
    setDestSuggestions([]);
  };


  useEffect(() => {
    // Update refs when values change
    sourceRef.current = source;
    destRef.current = dest;
    prefRef.current = pref;
    
    // Clear routes when user changes addresses (prevent stale data)
    const last = lastFetchRef.current;
    
    if (last && last.source && last.dest) {
      const current = { source, dest, pref };
      
      // If parameters changed from the last successful fetch, clear routes
      if (current.source !== last.source || current.dest !== last.dest || current.pref !== last.pref) {
        // Clear routes if they exist
        if (routes.length > 0) {
          setRoutes([]);
          setSelected(null);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, dest, pref]); // Only depend on source, dest, pref - not routes.length

  useEffect(() => {
    // Set up interval for fetching accidents AND AI suggestions (real-time updates)
    // Routes will ONLY be fetched on manual button clicks
    if (routes.length > 0) {
      // Clear any existing interval first
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Fetch accidents and AI suggestions in real-time
      intervalRef.current = setInterval(() => {
        fetchAccidents();
        // Auto-refresh AI suggestions every 30 seconds if routes exist
        if (routes.length > 0 && fetchAISuggestionRef.current) {
          fetchAISuggestionRef.current(false); // Don't force modal open on auto-update
        }
      }, 30000); // 30 seconds for real-time updates
    } else {
      // Clear interval if no routes
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [routes.length]); // Only depend on routes.length - fetchAISuggestionRef is used inside

  // Keep refs in sync with state
  useEffect(() => {
    aiSuggestionRef.current = aiSuggestion;
  }, [aiSuggestion]);
  
  useEffect(() => {
    showAISuggestionRef.current = showAISuggestion;
  }, [showAISuggestion]);

  const fetchAISuggestion = useCallback(async (showModal = false) => {
    if (routes.length === 0) {
      if (showModal) {
        alert('Please find routes first');
      }
      return;
    }
    
    setLoadingAI(true);
    try {
      const routesData = routes.map(r => ({
        id: r.id,
        name: r.name,
        safetyScore: r.score
      }));
      
      // Get current location if available, otherwise use route midpoint
      let lat, lng;
      if (selected && selected.geometry && selected.geometry.coordinates) {
        const coords = selected.geometry.coordinates;
        const midIdx = Math.floor(coords.length / 2);
        lng = coords[midIdx][0];
        lat = coords[midIdx][1];
      }
      
      const response = await getAISafetySuggestion(source, dest, routesData, lat, lng);
      const newSuggestion = response.recommendation;
      
      // Check if suggestion has changed significantly using refs
      const currentSuggestion = aiSuggestionRef.current;
      const hasChanged = !currentSuggestion || 
        currentSuggestion.realTimeData?.incidentsCount !== newSuggestion.realTimeData?.incidentsCount ||
        currentSuggestion.realTimeData?.accidentsCount !== newSuggestion.realTimeData?.accidentsCount;
      
      setAISuggestion(newSuggestion);
      
      // Auto-open modal if suggestion changed and modal was already open, or if manually requested
      if (showModal || (hasChanged && showAISuggestionRef.current)) {
        setShowAISuggestion(true);
      }
    } catch (err) {
      console.error('Error getting AI suggestion:', err);
      if (showModal) {
        alert('Failed to get AI suggestion. Please try again.');
      }
    } finally {
      setLoadingAI(false);
    }
  }, [routes, source, dest, selected]);
  
  // Store fetchAISuggestion in ref immediately after it's defined
  fetchAISuggestionRef.current = fetchAISuggestion;

  const handleRecalculate = () => {
    fetchSafeRoutes(true); // Pass true to indicate manual search
  };

  const handleAISuggestion = () => {
    fetchAISuggestion(true); // Show modal when manually clicked
  };

  const handleFindSafeZones = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser. Please enable location access.');
      return;
    }

    setLoadingSafeZones(true);
    
    try {
      // Check permissions first
      let permissionStatus = 'prompt';
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const permissionResult = await navigator.permissions.query({ name: 'geolocation' });
          permissionStatus = permissionResult.state;
          console.log('📍 Geolocation permission status:', permissionStatus);
        } catch (permError) {
          console.log('📍 Could not check permission status:', permError);
        }
      }

      // Get user's current location
      // Use Promise.race to handle the case where success and error both fire
      // (e.g., from browser extensions interfering)
      const positionPromise = new Promise((resolve, reject) => {
        let hasResolved = false;
        let errorOccurred = false;
        let successOccurred = false;
        
        const successHandler = (pos) => {
          if (!hasResolved) {
            successOccurred = true;
            hasResolved = true;
            console.log('✅ Location obtained:', pos.coords.latitude, pos.coords.longitude);
            resolve(pos); // Resolve with success - this takes priority
          }
        };
        
        const errorHandler = (err) => {
          // Delay error handling slightly to allow success handler to fire first
          // If success has already occurred, ignore this error
          setTimeout(() => {
            if (!hasResolved && !successOccurred) {
              errorOccurred = true;
              // Only log if it's a real error (not from extension interference)
              if (err.code === 1) {
                // Permission denied - check if it's really denied or just interference
                // Wait a bit more to see if success comes through
                setTimeout(() => {
                  if (!successOccurred && !hasResolved) {
                    console.error('❌ Geolocation error details:', {
                      code: err.code,
                      message: err.message
                    });
                    const error = new Error(err.message || 'Geolocation error');
                    error.code = err.code;
                    hasResolved = true;
                    reject(error);
                  }
                }, 500);
              } else {
                // For other errors, log and reject immediately
                console.error('❌ Geolocation error details:', {
                  code: err.code,
                  message: err.message
                });
                const error = new Error(err.message || 'Geolocation error');
                error.code = err.code;
                hasResolved = true;
                reject(error);
              }
            }
          }, 100); // Small delay to allow success to fire first
        };
        
        navigator.geolocation.getCurrentPosition(
          successHandler,
          errorHandler,
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 60000 // Allow cached location (1 minute old max)
          }
        );
      });
      
      const position = await positionPromise;

      const { latitude, longitude } = position.coords;
      console.log(`📍 Fetching safe zones for location: [${latitude}, ${longitude}]`);

      // Fetch nearby safe places
      const response = await getNearbySafePlaces(latitude, longitude);
      
      if (response.safePlaces && response.safePlaces.length > 0) {
        setSafeZones(response.safePlaces);
        console.log(`✅ Found ${response.safePlaces.length} safe places nearby`);
      } else {
        setSafeZones([]);
        alert('No safe places found nearby. Please try again later or check your location.');
      }
    } catch (error) {
      console.error('Error fetching safe zones:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        name: error.name
      });
      
      // Handle geolocation errors
      if (error.code !== undefined || error.message?.includes('denied') || error.message?.includes('permission')) {
        if (error.code === 1 || error.code === error.PERMISSION_DENIED || error.message?.includes('denied') || error.message?.includes('permission')) {
          alert('📍 Location access denied.\n\nPlease allow location access in your browser settings to find nearby safe zones.\n\nYou can enable it by:\n1. Clicking the lock icon (or site icon) in your browser\'s address bar\n2. Setting Location/Permissions to "Allow"\n3. Refreshing the page and trying again.\n\nNote: Some browsers may require HTTPS for location access.');
        } else if (error.code === 2 || error.code === error.POSITION_UNAVAILABLE) {
          alert('⚠️ Location information unavailable.\n\nPlease check your GPS settings and ensure location services are enabled on your device.');
        } else if (error.code === 3 || error.code === error.TIMEOUT) {
          alert('⏱️ Location request timed out.\n\nPlease try again. Make sure your GPS is enabled and you have a clear view of the sky.');
        } else {
          alert(`❌ Location error: ${error.message || 'Unknown error'}\n\nPlease try again.`);
        }
      } else {
        // Handle API errors
        const errorMessage = error.message || error.data?.error || 'Unknown error';
        console.error('API error details:', {
          message: errorMessage,
          response: error.response,
          data: error.data
        });
        
        if (error.response?.status === 404) {
          alert('📍 No safe places found nearby.\n\nPlease try again with a different location.');
        } else if (error.response?.status === 500 || error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
          alert('⚠️ Backend server error.\n\nPlease make sure the server is running on port 3001.\n\nIf the server is running, it might be a network issue. Please check your connection.');
        } else {
          alert(`❌ Failed to fetch safe zones: ${errorMessage}\n\nPlease try again.`);
        }
      }
      
      setSafeZones([]);
    } finally {
      setLoadingSafeZones(false);
    }
  };

  const handleRouteComplete = () => {
    // Simulate route completion
    setRouteCompleted(true);
  };

  return (
    <div className="h-full w-full grid grid-cols-1 lg:grid-cols-[380px_1fr]">
      <div className="p-4 space-y-3 order-2 lg:order-1 overflow-y-auto">
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="relative">
            <label className="text-xs opacity-80">Source</label>
            <div ref={sourceInputRef} className="relative">
              <input 
                className="mt-1 w-full rounded-lg bg-transparent border border-white/20 px-3 py-2 outline-none" 
                value={source} 
                onChange={(e)=>{
                  sourceRef.current = e.target.value;
                  setSource(e.target.value);
                  setShowSourceSuggestions(true);
                }}
                onFocus={() => {
                  if (sourceSuggestions.length > 0) {
                    setShowSourceSuggestions(true);
                  }
                }}
                placeholder="Enter source location"
              />
              {showSourceSuggestions && sourceSuggestions.length > 0 && (
                <div
                  ref={sourceSuggestionsRef}
                  className="absolute z-50 w-full mt-1 bg-gray-900/95 backdrop-blur-lg border border-white/30 rounded-lg overflow-hidden shadow-xl max-h-60 overflow-y-auto"
                >
                  {sourceSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => handleSourceSuggestion(suggestion)}
                      className="px-4 py-3 hover:bg-blue-600/30 cursor-pointer border-b border-white/10 last:border-b-0 transition-colors"
                    >
                      <div className="font-medium text-white text-sm">
                        {suggestion.text || suggestion.place_name}
                      </div>
                      {suggestion.context && (
                        <div className="text-xs text-white/70 mt-1">
                          {suggestion.context.map((ctx, i) => ctx.text).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="relative">
            <label className="text-xs opacity-80">Destination</label>
            <div ref={destInputRef} className="relative">
              <input 
                className="mt-1 w-full rounded-lg bg-transparent border border-white/20 px-3 py-2 outline-none" 
                value={dest} 
                onChange={(e)=>{
                  destRef.current = e.target.value;
                  setDest(e.target.value);
                  setShowDestSuggestions(true);
                }}
                onFocus={() => {
                  if (destSuggestions.length > 0) {
                    setShowDestSuggestions(true);
                  }
                }}
                placeholder="Enter destination location"
              />
              {showDestSuggestions && destSuggestions.length > 0 && (
                <div
                  ref={destSuggestionsRef}
                  className="absolute z-50 w-full mt-1 bg-gray-900/95 backdrop-blur-lg border border-white/30 rounded-lg overflow-hidden shadow-xl max-h-60 overflow-y-auto"
                >
                  {destSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => handleDestSuggestion(suggestion)}
                      className="px-4 py-3 hover:bg-blue-600/30 cursor-pointer border-b border-white/10 last:border-b-0 transition-colors"
                    >
                      <div className="font-medium text-white text-sm">
                        {suggestion.text || suggestion.place_name}
                      </div>
                      {suggestion.context && (
                        <div className="text-xs text-white/70 mt-1">
                          {suggestion.context.map((ctx, i) => ctx.text).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs opacity-80">Safety Preference</label>
              <select 
                className="mt-1 w-full rounded-lg bg-transparent border border-white/20 px-3 py-2" 
                value={pref} 
                onChange={(e)=>{
                  prefRef.current = e.target.value;
                  setPref(e.target.value);
                }}
              >
                <option>Well-lit</option>
                <option>Crowded</option>
                <option>Fastest</option>
              </select>
            </div>
            <div className="flex items-end">
              <button 
                onClick={() => fetchSafeRoutes(true)} 
                disabled={loading}
                className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 py-2 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Finding...' : 'Find Safe Routes'}
              </button>
            </div>
          </div>
          {error && (
            <div className="text-red-400 text-sm mt-2">{error}</div>
          )}
          
          {/* AI Suggestion Button */}
          {routes.length > 0 && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleAISuggestion}
              disabled={loadingAI}
              className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 py-2.5 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 relative"
            >
              {loadingAI ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <span>🤖</span>
                  <span>AI Safety Suggestion</span>
                  {aiSuggestion && aiSuggestion.realTimeData && (
                    <span className="ml-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Live updates active"></span>
                  )}
                </>
              )}
            </motion.button>
          )}
          
          {/* Route Complete Button (for demo) */}
          {selected && !routeCompleted && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={handleRouteComplete}
              className="w-full rounded-lg bg-gradient-to-r from-green-600 to-teal-600 py-2 hover:brightness-110 font-semibold"
            >
              ✓ Mark Route as Complete
            </motion.button>
          )}
        </div>

        <div className="space-y-2">
          {routes.length === 0 && !loading && (
            <div className="text-center text-sm opacity-60 py-8">

            </div>
          )}
          {routes.map((r, index) => (
            <RouteCard 
              key={r.id} 
              color={r.color} 
              name={r.name} 
              score={r.score} 
              distanceKm={parseFloat(r.distanceKm)} 
              etaMin={r.etaMin} 
              onSelect={()=>setSelected(r)}
              metadata={r.metadata}
              isARecommended={r.isARecommended}
              index={index}
              source={source}
              destination={dest}
              geometry={r.geometry}
              scoreReasons={r.scoreReasons}
            />
          ))}
        </div>
      </div>
      <div className="relative order-1 lg:order-2">
        <div className="absolute inset-0">
          <MapComponent 
            routes={routes} 
            selectedRoute={selected}
            accidents={accidents}
            safeZones={safeZones}
            source={source}
            destination={dest}
            predictiveAlert={predictiveAlert}
            onCurrentLocationAsSource={(address) => {
              setSource(address);
              sourceRef.current = address;
            }}
          />
        </div>
        <FloatingButtons 
          onRecalculate={handleRecalculate} 
          onFindSafeZones={handleFindSafeZones}
          loadingSafeZones={loadingSafeZones}
        />
      </div>
      
      {/* AI Suggestion Modal */}
      <AISuggestionModal
        isOpen={showAISuggestion}
        onClose={() => setShowAISuggestion(false)}
        suggestion={aiSuggestion}
      />
      
      {/* AI Predictive Alert Modal */}
      {predictiveAlert && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md"
        >
          <div className="glass rounded-2xl p-6 border-2 border-yellow-500/50 shadow-2xl bg-gradient-to-br from-yellow-900/30 to-orange-900/30 backdrop-blur-xl">
            <div className="flex items-start gap-4">
              <div className="text-4xl animate-pulse">🔮</div>
              <div className="flex-1">
                <h3 className="font-bold text-xl mb-2 text-yellow-300">
                  AI PREDICTIVE ALERT
                </h3>
                <p className="text-sm mb-4 opacity-90 text-white">
                  Our model predicts a high probability of a safety incident (severe traffic jam, dangerous crowding) in the <strong className="text-yellow-200">{predictiveAlert.area || 'Kanthavanam Junction'} area</strong> within the next 15 minutes.
                </p>
                <div className="text-xs opacity-70 mb-4 italic text-white">
                  [Re-routing you to a safer alternative...]
                </div>
                <button
                  onClick={() => setPredictiveAlert(null)}
                  className="w-full rounded-lg bg-gradient-to-r from-yellow-600 to-orange-600 py-2 hover:brightness-110 font-semibold text-sm transition-all text-white shadow-lg"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}


