import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import MapComponent from '../components/MapComponent.jsx';
import RouteCard from '../components/RouteCard.jsx';
import FloatingButtons from '../components/FloatingButtons.jsx';
import FeedbackModal from '../components/FeedbackModal.jsx';
import AISuggestionModal from '../components/AISuggestionModal.jsx';
import { getSafeRoutes, getAccidents, getAISafetySuggestion, getAddressSuggestions } from '../utils/api.js';

export default function RoutePlanner() {
  const [source, setSource] = useState('MG Road, Bengaluru');
  const [dest, setDest] = useState('Indiranagar, Bengaluru');
  const [pref, setPref] = useState('Well-lit');
  const [routes, setRoutes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [accidents, setAccidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showAISuggestion, setShowAISuggestion] = useState(false);
  const [aiSuggestion, setAISuggestion] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [routeCompleted, setRouteCompleted] = useState(false);
  const [sourceSuggestions, setSourceSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showSourceSuggestions, setShowSourceSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const intervalRef = useRef(null);
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
        metadata: route.metadata || {}
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
    const address = suggestion.place_name || suggestion.text;
    setSource(address);
    sourceRef.current = address;
    setShowSourceSuggestions(false);
    setSourceSuggestions([]);
  };

  const handleDestSuggestion = (suggestion) => {
    const address = suggestion.place_name || suggestion.text;
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
    // Set up interval ONLY for fetching accidents (not routes)
    // Routes will ONLY be fetched on manual button clicks
    if (routes.length > 0) {
      // Clear any existing interval first
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Only fetch accidents, NEVER fetch routes automatically
      intervalRef.current = setInterval(() => {
        fetchAccidents();
        // Routes are NEVER fetched automatically - only via button click
      }, 10000); // 10 seconds
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
  }, [routes.length]); // Only recreate interval when routes.length changes

  const handleRecalculate = () => {
    fetchSafeRoutes(true); // Pass true to indicate manual search
  };

  const handleAISuggestion = async () => {
    if (routes.length === 0) {
      alert('Please find routes first');
      return;
    }
    
    setLoadingAI(true);
    try {
      const routesData = routes.map(r => ({
        id: r.id,
        name: r.name,
        safetyScore: r.score
      }));
      
      const response = await getAISafetySuggestion(source, dest, routesData);
      setAISuggestion(response.recommendation);
      setShowAISuggestion(true);
    } catch (err) {
      console.error('Error getting AI suggestion:', err);
      alert('Failed to get AI suggestion. Please try again.');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleRouteComplete = () => {
    // Simulate route completion
    setRouteCompleted(true);
    setShowFeedbackModal(true);
  };

  // Simulate route completion after estimated time (optional - can be triggered manually)
  useEffect(() => {
    if (selected && routeStartTimeRef.current && !routeCompleted) {
      const estimatedTime = selected.etaMin * 60 * 1000; // Convert to milliseconds
      const timer = setTimeout(() => {
        setRouteCompleted(true);
        setShowFeedbackModal(true);
      }, Math.min(estimatedTime, 60000)); // Max 60 seconds for demo
      
      return () => clearTimeout(timer);
    }
  }, [selected, routeCompleted]);

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
              className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 py-2.5 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
            >
              {loadingAI ? '⏳ Analyzing...' : '🤖 Get AI Safety Suggestion'}
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
              Enter source and destination to find safe routes
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
          />
        </div>
        <FloatingButtons onRecalculate={handleRecalculate} />
      </div>
      
      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        routeId={selected?.id}
        safetyScore={selected?.score}
      />
      
      {/* AI Suggestion Modal */}
      <AISuggestionModal
        isOpen={showAISuggestion}
        onClose={() => setShowAISuggestion(false)}
        suggestion={aiSuggestion}
      />
    </div>
  );
}


