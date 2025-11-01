import { useEffect, useRef, useState } from 'react';
import { Chart } from 'chart.js/auto';
import MapComponent from '../components/MapComponent.jsx';
import { initializeSocket, getSocket } from '../utils/socket.js';
import { getAccidents, getCrimeData } from '../utils/api.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export default function Dashboard() {
  // Map and heatmap state
  const [safetyScoreData, setSafetyScoreData] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const mapUpdateIntervalRef = useRef(null);

  // Real-time data fusion state
  const [socialFeed, setSocialFeed] = useState([]);
  const [crowdDensity, setCrowdDensity] = useState({ level: 'Medium', value: 45 });
  const [trafficStatus, setTrafficStatus] = useState({ level: 'Moderate', value: 60 });
  const [showStaticData, setShowStaticData] = useState(false);
  const [staticDataPoints, setStaticDataPoints] = useState([]);

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

  // Initialize traffic gauge chart
  useEffect(() => {
    const ctx = trafficChartRef.current?.getContext('2d');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Free', 'Moderate', 'Heavy'],
        datasets: [{
          data: [30, 50, 20],
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

    // Update chart periodically
    const updateTraffic = () => {
      const levels = ['Free', 'Moderate', 'Heavy'];
      const values = [20 + Math.random() * 30, 40 + Math.random() * 30, 10 + Math.random() * 20];
      const total = values.reduce((a, b) => a + b, 0);
      const normalized = values.map(v => (v / total) * 100);
      
      chart.data.datasets[0].data = normalized;
      chart.update();
      
      const level = levels[normalized.indexOf(Math.max(...normalized))];
      const avgValue = (normalized[0] * 1 + normalized[1] * 0.5 + normalized[2] * 0.1) * 100;
      setTrafficStatus({ level, value: Math.round(avgValue) });
    };

    const interval = setInterval(updateTraffic, 15000);
    updateTraffic();

    return () => {
      clearInterval(interval);
      chart.destroy();
    };
  }, []);

  // Initialize crowd density chart
  useEffect(() => {
    const ctx = crowdChartRef.current?.getContext('2d');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Low', 'Medium', 'High'],
        datasets: [{
          data: [25, 50, 25],
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

    // Update chart periodically
    const updateCrowd = () => {
      const levels = ['Low', 'Medium', 'High'];
      const values = [25 + Math.random() * 25, 30 + Math.random() * 30, 20 + Math.random() * 25];
      const total = values.reduce((a, b) => a + b, 0);
      const normalized = values.map(v => (v / total) * 100);
      
      chart.data.datasets[0].data = normalized;
      chart.update();
      
      const level = levels[normalized.indexOf(Math.max(...normalized))];
      const avgValue = (normalized[0] * 0.2 + normalized[1] * 0.5 + normalized[2] * 0.9) * 100;
      setCrowdDensity({ level, value: Math.round(avgValue) });
    };

    const interval = setInterval(updateCrowd, 20000);
    updateCrowd();

    return () => {
      clearInterval(interval);
      chart.destroy();
    };
  }, []);

  // Generate mock social media feed
  useEffect(() => {
    const generateSocialFeed = () => {
      const messages = [
        { text: '🚨 Accident reported at MG Road. Traffic diverted.', source: 'Twitter', type: 'accident' },
        { text: '👥 Heavy crowd at Indiranagar Metro Station', source: 'User Report', type: 'crowd' },
        { text: '🚧 Roadwork in progress near Koramangala', source: 'City Updates', type: 'roadwork' },
        { text: '⚠️ Protest activity near Town Hall. Avoid area.', source: 'News Alert', type: 'protest' },
        { text: '✅ All clear on Outer Ring Road. Safe to travel.', source: 'Traffic Control', type: 'safe' },
        { text: '🌙 Well-lit streets reported in Whitefield area', source: 'Community', type: 'positive' },
        { text: '🚨 Emergency services called to Malleswaram', source: 'Alert System', type: 'emergency' }
      ];

      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      const feedItem = {
        id: `feed-${Date.now()}-${Math.random()}`,
        source: randomMessage.source,
        text: randomMessage.text,
        timestamp: Date.now(),
        type: randomMessage.type
      };

      setSocialFeed(prev => [feedItem, ...prev].slice(0, 50));
    };

    // Generate initial feed
    for (let i = 0; i < 10; i++) {
      setTimeout(() => generateSocialFeed(), i * 2000);
    }

    // Continue generating feed every 15-30 seconds
    const interval = setInterval(() => {
      if (Math.random() > 0.3) {
        generateSocialFeed();
      }
    }, 20000);

    return () => clearInterval(interval);
  }, []);

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

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage(`✅ ${data.message}`);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(`❌ Error: ${data.error || 'Failed to trigger event'}`);
      }
    } catch (error) {
      console.error('Error triggering event:', error);
      setMessage(`❌ Network error: ${error.message}`);
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
              <div className="text-xs opacity-70 mb-2">Crowd Density</div>
              <div className="relative w-24 h-24 mx-auto">
                <canvas ref={crowdChartRef} width="96" height="96" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-lg font-bold">{crowdDensity.value}%</div>
                    <div className="text-xs opacity-70">{crowdDensity.level}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs opacity-70 mb-2">Traffic Flow</div>
              <div className="relative w-24 h-24 mx-auto">
                <canvas ref={trafficChartRef} width="96" height="96" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-lg font-bold">{trafficStatus.value}%</div>
                    <div className="text-xs opacity-70">{trafficStatus.level}</div>
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
            <div className="text-sm font-semibold mb-2">📱 Live Social Feed</div>
            <div className="h-32 overflow-y-auto space-y-2 border border-white/10 rounded-lg p-2 bg-black/20">
              {socialFeed.length === 0 ? (
                <div className="text-xs opacity-50 text-center py-4">Loading feed...</div>
              ) : (
                socialFeed.slice(0, 10).map((item) => (
                  <div key={item.id} className="text-xs p-2 rounded bg-white/5 hover:bg-white/10 transition">
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
                        <div className="font-medium">{item.text}</div>
                        <div className="text-xs opacity-50 mt-0.5">{item.source} • {new Date(item.timestamp).toLocaleTimeString()}</div>
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
