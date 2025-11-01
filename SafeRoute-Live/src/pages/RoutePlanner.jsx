import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import MapComponent from '../components/MapComponent.jsx';
import RouteCard from '../components/RouteCard.jsx';
import FloatingButtons from '../components/FloatingButtons.jsx';
import FeedbackModal from '../components/FeedbackModal.jsx';
import AISuggestionModal from '../components/AISuggestionModal.jsx';
import { getSafeRoutes, getAccidents, getAISafetySuggestion } from '../utils/api.js';

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
  const intervalRef = useRef(null);
  const lastFetchRef = useRef({ source, dest, pref });
  const routeStartTimeRef = useRef(null);

  const fetchSafeRoutes = async () => {
    if (!source || !dest) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await getSafeRoutes(source, dest, pref);
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
      
      lastFetchRef.current = { source, dest, pref };
      
      // Track route start time for completion simulation
      if (formattedRoutes.length > 0) {
        routeStartTimeRef.current = Date.now();
        setRouteCompleted(false);
      }
    } catch (err) {
      console.error('Error fetching safe routes:', err);
      if (err.message?.includes('Failed to fetch') || err.message?.includes('Connection refused')) {
        setError('Backend server is not running. Please start the server on port 3001.');
      } else {
        setError('Failed to fetch safe routes. Please check your connection.');
      }
    } finally {
      setLoading(false);
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

  // Initial fetch
  useEffect(() => {
    fetchAccidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Set up interval for real-time updates (every 10 seconds)
    if (routes.length > 0) {
      intervalRef.current = setInterval(() => {
        fetchAccidents();
        // Only refresh routes if parameters haven't changed
        const current = { source, dest, pref };
        const last = lastFetchRef.current;
        if (current.source === last.source && current.dest === last.dest && current.pref === last.pref) {
          fetchSafeRoutes();
        }
      }, 10000); // 10 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [routes.length, source, dest, pref]);

  const handleRecalculate = () => {
    fetchSafeRoutes();
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
          <div>
            <label className="text-xs opacity-80">Source</label>
            <input 
              className="mt-1 w-full rounded-lg bg-transparent border border-white/20 px-3 py-2 outline-none" 
              value={source} 
              onChange={(e)=>setSource(e.target.value)}
              placeholder="Enter source location"
            />
          </div>
          <div>
            <label className="text-xs opacity-80">Destination</label>
            <input 
              className="mt-1 w-full rounded-lg bg-transparent border border-white/20 px-3 py-2 outline-none" 
              value={dest} 
              onChange={(e)=>setDest(e.target.value)}
              placeholder="Enter destination location"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs opacity-80">Safety Preference</label>
              <select 
                className="mt-1 w-full rounded-lg bg-transparent border border-white/20 px-3 py-2" 
                value={pref} 
                onChange={(e)=>setPref(e.target.value)}
              >
                <option>Well-lit</option>
                <option>Crowded</option>
                <option>Fastest</option>
              </select>
            </div>
            <div className="flex items-end">
              <button 
                onClick={fetchSafeRoutes} 
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


