import { useEffect, useRef, useState } from 'react';
import { Chart } from 'chart.js/auto';
import MapComponent from '../components/MapComponent.jsx';
import { initializeSocket, getSocket } from '../utils/socket.js';
import { getAccidents, getCrimeData, getN8NData } from '../utils/api.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export default function Dashboard() {
  // Map and heatmap state
  const [safetyScoreData, setSafetyScoreData] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const mapUpdateIntervalRef = useRef(null);

  // Real-time data fusion state
  const [socialFeed, setSocialFeed] = useState([]);
  const [crowdDensity, setCrowdDensity] = useState(null); // null = no data, will use n8n
  const [trafficStatus, setTrafficStatus] = useState(null); // null = no data, will use n8n
  const [showStaticData, setShowStaticData] = useState(false);
  const [staticDataPoints, setStaticDataPoints] = useState([]);
  const [n8nDataLoading, setN8NDataLoading] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState(null); // Track which alert to show on map

  // Live alerts state
  const [liveAlerts, setLiveAlerts] = useState([]);
  const alertsEndRef = useRef(null);

  // Admin Panel state (Demo Magic Wand)
  const [lat, setLat] = useState('12.9716');
  const [lng, setLng] = useState('77.5946');
  const [severity, setSeverity] = useState('-5');
  const [eventType, setEventType] = useState('accident');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Charts
  const trafficChartRef = useRef(null);
  const crowdChartRef = useRef(null);

  // Get user's current location on component mount
  useEffect(() => {
    // Check if the browser supports Geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Success! We got the user's location.
          const { latitude, longitude } = position.coords;
          console.log('✅ Got user location:', latitude, longitude);
          
          // Update the form fields
          setLat(latitude.toFixed(6));
          setLng(longitude.toFixed(6));
        },
        (error) => {
          // Handle errors (e.g., user clicked "Block")
          console.warn('⚠️ Could not get location, using default.', error.message);
          // Keep default values (Bengaluru)
        }
      );
    } else {
      console.warn('⚠️ Geolocation is not supported by this browser.');
      // Keep default values
    }
  }, []); // Empty array means this runs only once on mount

  // Initialize Socket.IO for live updates
  useEffect(() => {
    const socket = initializeSocket();
    
    // Listen for safety updates
    socket.on('safety-update', (payload) => {
      if (payload.type === 'live-event' && payload.event) {
        // Add to live alerts
        const alert = {
          id: `alert-${Date.now()}`,
          type: payload.event.eventType,
          message: `${payload.event.eventType.toUpperCase()} detected at ${new Date().toLocaleTimeString()}`,
          location: `${payload.event.lat.toFixed(4)}, ${payload.event.lng.toFixed(4)}`,
          severity: payload.event.severity,
          timestamp: Date.now()
        };
        setLiveAlerts(prev => [alert, ...prev].slice(0, 20)); // Keep last 20
        
        // Add to social feed
        const feedItem = {
          id: `feed-${Date.now()}`,
          source: 'Live Alert System',
          text: `⚠️ ${payload.event.eventType.toUpperCase()} reported near location ${payload.event.lat.toFixed(4)}, ${payload.event.lng.toFixed(4)}`,
          timestamp: Date.now(),
          type: 'alert'
        };
        setSocialFeed(prev => [feedItem, ...prev].slice(0, 50)); // Keep last 50
      }
    });

    return () => {
      socket?.off('safety-update');
    };
  }, []);

  // Update safety score map every 30 seconds
  useEffect(() => {
    const updateSafetyMap = async () => {
      try {
        // Fetch latest accidents and crime data
        const accidentsResponse = await getAccidents();
        const accidents = accidentsResponse.data || [];
        
        // Generate safety score points based on accidents
        const safetyPoints = accidents.map(accident => ({
          lat: accident.lat,
          lng: accident.lng,
          score: accident.severity === 'high' ? 30 : accident.severity === 'medium' ? 50 : 70,
          timestamp: accident.timestamp
        }));

        // Add some random safety points for visualization
        for (let i = 0; i < 20; i++) {
          safetyPoints.push({
            lat: 12.9 + (Math.random() * 0.1),
            lng: 77.5 + (Math.random() * 0.1),
            score: 40 + Math.random() * 50,
            timestamp: Date.now() - Math.random() * 3600000
          });
        }

        setSafetyScoreData(safetyPoints);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Error updating safety map:', error);
      }
    };

    // Initial update
    updateSafetyMap();

    // Update every 30 seconds
    mapUpdateIntervalRef.current = setInterval(updateSafetyMap, 30000);

    return () => {
      if (mapUpdateIntervalRef.current) {
        clearInterval(mapUpdateIntervalRef.current);
      }
    };
  }, []);

  // Fetch all n8n data in one place (social feed, traffic, crowd)
  useEffect(() => {
    const fetchAllN8NData = async () => {
      setN8NDataLoading(true);
      try {
        const userLat = lat ? parseFloat(lat) : 12.9716;
        const userLng = lng ? parseFloat(lng) : 77.5946;
        
        const n8nResponse = await getN8NData(userLat, userLng);
        
        if (n8nResponse.success && n8nResponse.data) {
          const data = n8nResponse.data;
          
          // Update social feed
          if (data.socialFeed && data.socialFeed.length > 0) {
            const feedItems = data.socialFeed.map(item => ({
              id: item.id || `feed-${Date.now()}-${Math.random()}`,
              source: item.source || 'n8n',
              text: item.text || item.message || '',
              timestamp: item.timestamp || Date.now(),
              type: item.type || 'info',
              url: item.url || null,
              location: item.location || null,
              status: item.status || null
            }));
            setSocialFeed(feedItems.slice(0, 50));
            console.log(`✅ Loaded ${feedItems.length} social feed items from n8n`);
          }
          
          // Update traffic status
          if (data.traffic) {
            setTrafficStatus(data.traffic);
            console.log(`✅ Loaded traffic data from n8n: ${data.traffic.level} (${data.traffic.value}%)`);
          }
          
          // Update crowd density
          if (data.crowdDensity) {
            setCrowdDensity(data.crowdDensity);
            console.log(`✅ Loaded crowd density from n8n: ${data.crowdDensity.level} (${data.crowdDensity.value}%)`);
          }
        } else {
          console.log('⚠️ n8n returned no data or unsuccessful response');
        }
      } catch (error) {
        console.error('⚠️ Error fetching n8n data:', error.message);
      } finally {
        setN8NDataLoading(false);
      }
    };

    // Fetch initial data
    fetchAllN8NData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchAllN8NData, 30000);
    
    return () => clearInterval(interval);
  }, [lat, lng]);

  // Initialize traffic gauge chart
  useEffect(() => {
    const ctx = trafficChartRef.current?.getContext('2d');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Free', 'Moderate', 'Heavy'],
        datasets: [{
          data: [0, 0, 0], // Start empty, will be updated with n8n data
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true }
        },
        cutout: '70%'
      }
    });

    // Update chart when traffic status changes (from n8n)
    const updateTrafficChart = () => {
      if (trafficStatus) {
        const levelMap = { 'Free': 0, 'Moderate': 1, 'Heavy': 2 };
        const levelIndex = levelMap[trafficStatus.level] || 1;
        const normalized = [0, 0, 0];
        normalized[levelIndex] = 100;
        
        chart.data.datasets[0].data = normalized;
        chart.update();
      } else {
        // Show empty/loading state
        chart.data.datasets[0].data = [0, 0, 0];
        chart.update();
      }
    };

    updateTrafficChart();

    return () => {
      chart.destroy();
    };
  }, [trafficStatus]);

  // Initialize crowd density chart
  useEffect(() => {
    const ctx = crowdChartRef.current?.getContext('2d');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Low', 'Medium', 'High'],
        datasets: [{
          data: [0, 0, 0], // Start empty, will be updated with n8n data
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true }
        },
        cutout: '70%'
      }
    });

    // Update chart when crowd density changes (from n8n)
    const updateCrowdChart = () => {
      if (crowdDensity) {
        const levelMap = { 'Low': 0, 'Medium': 1, 'High': 2 };
        const levelIndex = levelMap[crowdDensity.level] || 1;
        const normalized = [0, 0, 0];
        normalized[levelIndex] = 100;
        
        chart.data.datasets[0].data = normalized;
        chart.update();
      } else {
        // Show empty/loading state
        chart.data.datasets[0].data = [0, 0, 0];
        chart.update();
      }
    };

    updateCrowdChart();

    return () => {
      chart.destroy();
    };
  }, [crowdDensity]);

  // Social feed is now fetched in the centralized n8n data fetcher above

  // Load static data points (police stations, streetlights)
  useEffect(() => {
    if (showStaticData) {
      const points = [
        { type: 'police', lat: 12.9716, lng: 77.5946, name: 'City Police Station' },
        { type: 'police', lat: 12.9352, lng: 77.6100, name: 'Koramangala Station' },
        { type: 'police', lat: 12.9500, lng: 77.5800, name: 'Indiranagar Station' },
        { type: 'streetlight', lat: 12.9650, lng: 77.5900 },
        { type: 'streetlight', lat: 12.9600, lng: 77.6000 },
        { type: 'streetlight', lat: 12.9550, lng: 77.6100 },
        { type: 'hospital', lat: 12.9700, lng: 77.5950, name: 'City Hospital' }
      ];
      setStaticDataPoints(points);
    } else {
      setStaticDataPoints([]);
    }
  }, [showStaticData]);

  // Auto-scroll social feed
  useEffect(() => {
    alertsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [socialFeed]);

  // Handle trigger event (Admin Panel)
  const handleTriggerEvent = async () => {
    if (!lat || !lng) {
      setMessage('⚠️ Please enter latitude and longitude');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/trigger-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          severity: parseFloat(severity),
          eventType
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setMessage(`✅ ${data.message}`);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(`❌ Error: ${data.error || 'Failed to trigger event'}`);
      }
    } catch (error) {
      console.error('Error triggering event:', error);
      if (error.message?.includes('404') || error.message?.includes('Not Found')) {
        setMessage('⚠️ Trigger event endpoint not configured. Event will be logged locally.');
      } else {
        setMessage(`❌ Network error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-4 p-4 overflow-hidden">
      {/* Main Map Area */}
      <div className="relative h-full min-h-[600px]">
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          <MapComponent 
            routes={[]} 
            accidents={safetyScoreData.map(p => ({ lat: p.lat, lng: p.lng, severity: p.score < 40 ? 'high' : p.score < 60 ? 'medium' : 'low' }))}
            n8nAlerts={socialFeed.filter(item => item.location).map(item => ({
              id: item.id,
              type: item.type,
              location: item.location,
              text: item.text,
              source: item.source,
              summary: item.text
            }))}
            selectedAlertId={selectedAlertId}
            onAlertFocus={(alertId) => setSelectedAlertId(alertId)}
          />
        </div>
        {/* Map overlay info */}
        <div className="absolute top-4 left-4 glass rounded-lg p-3 z-10">
          <div className="text-xs opacity-70">🛰️ Dynamic Safety Score Map</div>
          <div className="text-sm font-semibold">Last updated: {lastUpdate.toLocaleTimeString()}</div>
          <div className="text-xs opacity-70 mt-1">Auto-updating every 30s</div>
        </div>
      </div>

      {/* Side Panel */}
      <div className="space-y-4 overflow-y-auto">
        {/* Admin Panel - Demo Magic Wand */}
        <div className="glass rounded-2xl p-4 border-2 border-purple-500">
          <div className="font-bold text-lg mb-3 text-purple-300">✨ Demo Magic Wand</div>
          <div className="text-xs opacity-70 mb-4">Trigger live safety events for demo</div>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs opacity-80">Latitude</label>
                <input 
                  type="number"
                  step="0.0001"
                  className="mt-1 w-full rounded-lg bg-transparent border border-white/20 px-2 py-1.5 text-sm outline-none" 
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="12.9716"
                />
              </div>
              <div>
                <label className="text-xs opacity-80">Longitude</label>
                <input 
                  type="number"
                  step="0.0001"
                  className="mt-1 w-full rounded-lg bg-transparent border border-white/20 px-2 py-1.5 text-sm outline-none" 
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="77.5946"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs opacity-80">Severity</label>
                <input 
                  type="number"
                  step="1"
                  className="mt-1 w-full rounded-lg bg-transparent border border-white/20 px-2 py-1.5 text-sm outline-none" 
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  placeholder="-5"
                />
              </div>
              <div>
                <label className="text-xs opacity-80">Event Type</label>
                <select 
                  className="mt-1 w-full rounded-lg bg-transparent border border-white/20 px-2 py-1.5 text-sm" 
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                >
                  <option value="accident">Accident</option>
                  <option value="protest">Protest</option>
                  <option value="crime">Crime</option>
                  <option value="roadwork">Roadwork</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
            </div>
            <button 
              onClick={handleTriggerEvent}
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 py-2 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
            >
              {loading ? '⏳ Triggering...' : '🎯 Trigger Event'}
            </button>
            {message && (
              <div className={`text-xs mt-2 p-2 rounded ${
                message.startsWith('✅') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {message}
              </div>
            )}
          </div>
        </div>

        {/* Real-time Data Fusion Panel */}
        <div className="glass rounded-2xl p-4">
          <div className="font-bold text-lg mb-3">⚙️ Real-time Data Fusion</div>
          
          {/* Crowd & Traffic Gauges */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-xs opacity-70 mb-2">Crowd Density {n8nDataLoading && <span className="animate-pulse">⏳</span>}</div>
              <div className="relative w-24 h-24 mx-auto">
                <canvas ref={crowdChartRef} width="96" height="96" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    {crowdDensity ? (
                      <>
                        <div className="text-lg font-bold">{crowdDensity.value}%</div>
                        <div className="text-xs opacity-70">{crowdDensity.level}</div>
                      </>
                    ) : (
                      <div className="text-xs opacity-50">Loading...</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs opacity-70 mb-2">Traffic Flow {n8nDataLoading && <span className="animate-pulse">⏳</span>}</div>
              <div className="relative w-24 h-24 mx-auto">
                <canvas ref={trafficChartRef} width="96" height="96" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    {trafficStatus ? (
                      <>
                        <div className="text-lg font-bold">{trafficStatus.value}%</div>
                        <div className="text-xs opacity-70">{trafficStatus.level}</div>
                      </>
                    ) : (
                      <div className="text-xs opacity-50">Loading...</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Static Data Toggle */}
          <div className="flex items-center justify-between mb-4 p-2 rounded-lg bg-white/5">
            <span className="text-sm">Show Static Data</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showStaticData}
                onChange={(e) => setShowStaticData(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          {showStaticData && staticDataPoints.length > 0 && (
            <div className="text-xs opacity-70 mb-2">
              📍 {staticDataPoints.filter(p => p.type === 'police').length} Police Stations | 
              {' '}{staticDataPoints.filter(p => p.type === 'streetlight').length} Streetlights | 
              {' '}{staticDataPoints.filter(p => p.type === 'hospital').length} Hospitals
            </div>
          )}

          {/* Social Media Live Feed */}
          <div className="mt-4">
            <div className="text-sm font-semibold mb-2">
              📱 Live Social Feed {n8nDataLoading && <span className="animate-pulse text-xs">⏳</span>}
            </div>
            <div className="h-32 overflow-y-auto space-y-2 border border-white/10 rounded-lg p-2 bg-black/20">
              {n8nDataLoading ? (
                <div className="text-xs opacity-50 text-center py-4">🔄 Fetching data from n8n...</div>
              ) : socialFeed.length === 0 ? (
                <div className="text-xs opacity-50 text-center py-4">No data available from n8n</div>
              ) : (
                socialFeed.slice(0, 10).map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => {
                      if (item.location) {
                        setSelectedAlertId(item.id);
                      }
                    }}
                    className={`text-xs p-2 rounded transition cursor-pointer ${
                      selectedAlertId === item.id 
                        ? 'bg-blue-500/30 border-2 border-blue-500' 
                        : item.location 
                          ? 'bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/20' 
                          : 'bg-white/5 opacity-60'
                    }`}
                    title={item.location ? `Click to view location: ${item.location}` : 'No location data'}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`text-xs ${
                        item.type === 'accident' || item.type === 'emergency' ? 'text-red-400' :
                        item.type === 'protest' ? 'text-orange-400' :
                        item.type === 'safe' || item.type === 'positive' ? 'text-green-400' :
                        'text-blue-400'
                      }`}>
                        {item.type === 'accident' ? '🚨' : item.type === 'protest' ? '⚠️' : item.type === 'safe' ? '✅' : '📢'}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-1">
                          {item.text}
                          {item.location && (
                            <span className="text-[10px] opacity-60" title="Has location">
                              📍
                            </span>
                          )}
                        </div>
                        <div className="text-xs opacity-50 mt-0.5">
                          {item.location && <span className="opacity-70">📍 {item.location} • </span>}
                          {item.source} • {new Date(item.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={alertsEndRef} />
            </div>
          </div>
        </div>

        {/* Live Alerts Panel */}
        <div className="glass rounded-2xl p-4">
          <div className="font-bold text-lg mb-3">🔔 Live Alerts</div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {liveAlerts.length === 0 ? (
              <div className="text-xs opacity-50 text-center py-4">No active alerts</div>
            ) : (
              liveAlerts.slice(0, 10).map((alert) => (
                <div 
                  key={alert.id} 
                  className={`p-3 rounded-lg border ${
                    alert.severity < -7 ? 'bg-red-500/20 border-red-500/50' :
                    alert.severity < -4 ? 'bg-orange-500/20 border-orange-500/50' :
                    'bg-yellow-500/20 border-yellow-500/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">
                      {alert.type === 'accident' ? '🚨' : alert.type === 'protest' ? '⚠️' : '📢'}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{alert.message}</div>
                      <div className="text-xs opacity-70 mt-1">📍 {alert.location}</div>
                      <div className="text-xs opacity-50 mt-1">{new Date(alert.timestamp).toLocaleTimeString()}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
