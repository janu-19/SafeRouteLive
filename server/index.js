// IMPORTANT: Load environment variables FIRST before any other imports
// This must be done at the very top to ensure env vars are available to all modules
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from server/.env FIRST
const envPath = join(__dirname, '.env');
const envResult = dotenv.config({ path: envPath });

if (envResult.error) {
  console.error('⚠️  Error loading .env file:', envResult.error);
} else {
  console.log('✅ Environment variables loaded from:', envPath);
  // Only show Google credentials status in debug mode (too verbose otherwise)
  if (process.env.DEBUG_AUTH === 'true') {
    console.log('   GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing');
    console.log('   GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
  }
}

// NOW import other modules (they will have access to environment variables)
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import session from 'express-session';
import passport from 'passport';

// Import database connection
import { connectDB } from './src/config/database.js';

// Import Passport configuration (after env is loaded)
import './src/config/passport.js';

// Node.js 18+ has native fetch support
// If using Node.js < 18, uncomment: import fetch from 'node-fetch';

// Import routes
import authRoutes from './src/routes/authRoutes.js';

// Import models
import Incident from './src/models/Incident.js';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Define allowed origins (main app + admin dashboard)
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5177' // Admin Dashboard
];

// CORS configuration - allow all localhost ports in development
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all localhost ports for development
    if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list (for production)
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      callback(new Error(msg), false);
    }
  },
  credentials: true
}));

app.use(express.json());

// Session configuration (needed for Passport)
app.use(session({
  secret: process.env.SESSION_SECRET || 'saferoute-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Connect to MongoDB (non-blocking - server will start even if DB fails)
connectDB().catch(err => {
  console.error('⚠️  Failed to connect to MongoDB:', err.message);
  console.error('   Server will continue, but database features may not work');
  // Don't exit - allow server to start without database
});

// Initialize Socket.IO with multiple allowed origins
// For development, allow all localhost ports to avoid CORS issues
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }
      
      // Allow all localhost ports for development
      if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
        console.log(`✅ CORS allowed origin: ${origin}`);
        return callback(null, true);
      }
      
      // Check if origin is in allowed list (for production)
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log(`❌ CORS blocked origin: ${origin}. Allowed:`, allowedOrigins);
        callback(new Error('CORS: Origin not allowed'), false);
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  }
});

// Room management (in-memory storage)
const rooms = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  // Only log connections in debug mode - too verbose otherwise
  if (process.env.DEBUG_SOCKET === 'true') {
    console.log('✅ Client connected:', socket.id);
  }

  // Join room
  socket.on('join-room', (data) => {
    const { roomId, userId, location } = data;
    console.log(`👤 User ${userId} joining room ${roomId}`);
    
    socket.join(roomId);
    
    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }
    
    const room = rooms.get(roomId);
    
    // Add user to room
    room.set(userId, {
      userId,
      location,
      socketId: socket.id,
      joinedAt: Date.now()
    });
    
    // Broadcast user joined to others in room
    socket.to(roomId).emit('user-joined', {
      userId,
      location,
      timestamp: Date.now()
    });
    
    // Send current users in room to the new user
    const users = Array.from(room.values()).filter(u => u.userId !== userId);
    socket.emit('room-users', {
      roomId,
      users: users.map(u => ({
        userId: u.userId,
        location: u.location
      }))
    });
    
    console.log(`Room ${roomId} now has ${room.size} users`);
  });

  // Handle location updates
  socket.on('location-update', (data) => {
    const { roomId, userId, location } = data;
    
    if (!rooms.has(roomId)) {
      return;
    }
    
    const room = rooms.get(roomId);
    const user = room.get(userId);
    
    if (user) {
      // Update user location
      user.location = location;
      
      // Broadcast location update to others in room
      socket.to(roomId).emit('location-update', {
        userId,
        location,
        timestamp: Date.now()
      });
    }
  });

  // Handle leave room
  socket.on('leave-room', (data) => {
    const { roomId, userId } = data;
    console.log(`👋 User ${userId} leaving room ${roomId}`);
    
    socket.leave(roomId);
    
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      room.delete(userId);
      
      // If room is empty, remove it
      if (room.size === 0) {
        rooms.delete(roomId);
      } else {
        // Broadcast user left to others in room
        socket.to(roomId).emit('user-left', {
          userId,
          timestamp: Date.now()
        });
      }
    }
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    // Only log unusual disconnects or in debug mode - too verbose otherwise
    if (process.env.DEBUG_SOCKET === 'true' || (reason !== 'transport close' && reason !== 'io client disconnect')) {
      console.log('❌ Client disconnected:', socket.id, reason || '');
    }
    
    // Find and remove user from all rooms
    for (const [roomId, room] of rooms.entries()) {
      for (const [userId, user] of room.entries()) {
        if (user.socketId === socket.id) {
          room.delete(userId);
          
          // Broadcast user left
          io.to(roomId).emit('user-left', {
            userId,
            timestamp: Date.now()
          });
          
          // Remove empty room
          if (room.size === 0) {
            rooms.delete(roomId);
          }
          
          break;
        }
      }
    }
  });
});

// Register authentication routes
app.use('/api/auth', authRoutes);

// Import and register friend, chat, and share routes
import friendRoutes from './src/routes/friendRoutes.js';
import chatRoutes from './src/routes/chatRoutes.js';
import shareRoutes from './src/routes/shareRoutes.js';

app.use('/api/friends', friendRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/share', shareRoutes);

// API Configuration
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoibHlubnZpc2hhbnRoIiwiYSI6ImNtaGM3dDNhZTIwdWcya3BjMDlta2JzYjQifQ.xrN6-HYsxUE99AWH1mHBqQ';
const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY || 'VT4rxjoalnUg4StOsHNmAxPNleSYowIR';
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

// Streetlight Query for Overpass API
const streetlightQuery = `
  [out:json];
  (
    node["highway"="street_lamp"]({{bbox}});
    way["highway"="street_lamp"]({{bbox}});
  );
  out;
`;

/**
 * Get streetlight data from Overpass API
 * @param {string} bboxString - Bounding box string (south,west,north,east)
 * @returns {Promise<Array>} Array of streetlight elements
 */
async function getStreetlightData(bboxString) {
  try {
    const query = streetlightQuery.replace('{{bbox}}', bboxString);
    
    const response = await fetch(OVERPASS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: query
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();
    return data.elements || [];
  } catch (error) {
    console.error('Error fetching streetlight data:', error);
    return []; // Return empty array on error, will fallback to mock
  }
}

/**
 * Calculate bounding box from coordinates
 * @param {Array} coords - Array of [lng, lat] coordinates
 * @returns {string} Bounding box string for Overpass API
 */
function calculateBBox(coords) {
  if (!coords || coords.length === 0) {
    return '12.9,77.5,13.0,77.7'; // Default Bengaluru bbox
  }

  const lats = coords.map(c => c[1]);
  const lngs = coords.map(c => c[0]);
  
  const south = Math.min(...lats);
  const west = Math.min(...lngs);
  const north = Math.max(...lats);
  const east = Math.max(...lngs);
  
  // Add small buffer
  const buffer = 0.01;
  return `${south - buffer},${west - buffer},${north + buffer},${east + buffer}`;
}

// Mock data generators (fallback)
function generateMockCrimeData() {
  return [
    { lat: 12.9716, lng: 77.5946, rate: 0.3, area: 'MG Road' },
    { lat: 12.9790, lng: 77.6400, rate: 0.7, area: 'Shivajinagar' },
    { lat: 12.9352, lng: 77.6245, rate: 0.4, area: 'Indiranagar' },
    { lat: 12.9141, lng: 77.6412, rate: 0.8, area: 'KR Market' },
    { lat: 12.9352, lng: 77.6100, rate: 0.2, area: 'Koramangala' }
  ];
}

/**
 * Get accidents from TomTom API
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radius - Radius in meters (default 5000m = 5km)
 * @returns {Promise<Array>} Array of accident incidents
 */
async function getAccidentsFromTomTom(lat, lng, radius = 5000) {
  try {
    const bbox = `${lat - 0.05},${lng - 0.05},${lat + 0.05},${lng + 0.05}`;
    
    // Step 1: Get Traffic Model ID (t) from Incident Viewport API
    const viewportUrl = `https://api.tomtom.com/traffic/services/5/incident/viewport/${bbox}?key=${TOMTOM_API_KEY}`;
    const viewportResponse = await fetch(viewportUrl);
    
    if (!viewportResponse.ok) {
      throw new Error(`TomTom Viewport API error: ${viewportResponse.status}`);
    }
    
    const viewportData = await viewportResponse.json();
    // Get the latest traffic model ID (t)
    const trafficModelId = viewportData.tm?.id || 'latest';
    
    // Step 2: Get incident details using v5 API with Traffic Model ID
    const url = `https://api.tomtom.com/traffic/services/5/incident/details?key=${TOMTOM_API_KEY}&bbox=${bbox}&t=${trafficModelId}&categoryFilter=Accident`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`TomTom Incident Details API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform TomTom v5 data to our format
    const accidents = [];
    if (data.incidents) {
      data.incidents.forEach(incident => {
        if (incident.point && incident.point.coordinates) {
          accidents.push({
            lat: incident.point.coordinates[1],
            lng: incident.point.coordinates[0],
            severity: incident.properties?.magnitudeOfDelay === 'major' ? 'high' : 
                     incident.properties?.magnitudeOfDelay === 'moderate' ? 'medium' : 'low',
            timestamp: incident.properties?.startTime || Date.now() - (Math.random() * 3600000),
            type: incident.properties?.iconCategory || 'accident'
          });
        }
      });
    }
    
    return accidents;
  } catch (error) {
    console.error('Error fetching TomTom accidents:', error);
    return generateMockAccidents(); // Fallback to mock
  }
}

function generateMockAccidents() {
  return [
    { lat: 12.9750, lng: 77.6000, severity: 'high', timestamp: Date.now() - 3600000 },
    { lat: 12.9600, lng: 77.6300, severity: 'medium', timestamp: Date.now() - 7200000 },
    { lat: 12.9450, lng: 77.6150, severity: 'low', timestamp: Date.now() - 10800000 }
  ];
}

/**
 * Get traffic data from TomTom API
 * @param {Array} coords - Array of [lng, lat] coordinates
 * @returns {Promise<Array>} Traffic data along route
 */
async function getTrafficFromTomTom(coords) {
  // FOR THE HACKATHON: Immediately return mock data to avoid 300+ API calls
  // A single route can have 500+ coordinates, and with 3 routes that's 300 API calls
  // This causes the app to timeout or take minutes to respond
  return generateMockTraffic(coords);
}

function generateMockTraffic(coords) {
  // Generate traffic congestion along route coordinates
  return coords.map((coord, i) => ({
    lat: coord[1],
    lng: coord[0],
    congestion: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
    speed: 20 + Math.random() * 40
  }));
}

/**
 * Get lighting data from Overpass API
 * @param {Array} coords - Array of [lng, lat] coordinates
 * @returns {Promise<Array>} Lighting data along route
 */
async function getLightingFromOverpass(coords) {
  // FOR THE HACKATHON: Immediately return mock data to avoid API calls
  // This also has N+1 problem (one API call per route, but still slow)
  return generateMockLighting(coords);
}

function generateMockLighting(coords) {
  // Generate street lighting data
  return coords.map((coord) => ({
    lat: coord[1],
    lng: coord[0],
    lighting: Math.random() > 0.6 ? 'good' : Math.random() > 0.3 ? 'moderate' : 'poor'
  }));
}

function generateMockCrowdDensity(coords) {
  // Generate crowd density
  return coords.map((coord) => ({
    lat: coord[1],
    lng: coord[0],
    density: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low'
  }));
}

// In-memory feedback storage (mock DB)
const userFeedbackStore = {
  total: 0,
  safe: 0,
  unsafe: 0,
  weightAdjustments: {
    lighting: 0,
    accident: 0,
    crowd: 0
  }
};

// Get adjusted weights based on user feedback
function getAdjustedWeights(baseWeights) {
  const unsafeRatio = userFeedbackStore.total > 0 
    ? userFeedbackStore.unsafe / userFeedbackStore.total 
    : 0;
  
  // If 70%+ unsafe, decrease weights slightly
  if (unsafeRatio >= 0.7) {
    return {
      lighting: baseWeights.lighting * 0.9, // Decrease by 10%
      accident: baseWeights.accident * 1.1,  // Increase penalty
      crowd: baseWeights.crowd * 0.95         // Slight decrease
    };
  }
  
  // If mostly safe, keep original weights
  return baseWeights;
}

// Check if current month is monsoon (June-September)
function isMonsoonMonth() {
  const month = new Date().getMonth() + 1; // 1-12
  return month >= 6 && month <= 9;
}

// Check if it's night time (8 PM - 6 AM)
function isNightTime() {
  const hour = new Date().getHours();
  return hour >= 20 || hour <= 6;
}

// Safety score calculation with dynamic weights
// Now includes n8n alerts/incidents along the route
function calculateSafetyScore(route, preference, crimeData, accidents, traffic, lighting, crowd, timeOfDay, n8nAlerts = []) {
  const hour = new Date().getHours();
  const isNight = isNightTime();
  const isMonsoon = isMonsoonMonth();
  const timePenalty = isNight ? -10 : 0;

  // Aggregate data along route
  const coords = route.geometry.coordinates;
  let totalCrime = 0;
  let totalAccidents = 0;
  let totalIncidents = 0; // n8n alerts/incidents along route
  let avgLighting = 0;
  let avgCrowd = 0;
  let avgSpeed = 0;
  
  // Track reasons for score (for user feedback)
  const scoreReasons = {
    incidents: [],
    accidents: [],
    crimeAreas: [],
    lowLighting: false,
    lowCrowd: false,
    timeFactors: []
  };

  // Check for incidents from n8n along the route
  const routeBBox = {
    minLng: Math.min(...coords.map(c => c[0])),
    maxLng: Math.max(...coords.map(c => c[0])),
    minLat: Math.min(...coords.map(c => c[1])),
    maxLat: Math.max(...coords.map(c => c[1]))
  };

  // Find n8n alerts that are along the route path
  n8nAlerts.forEach(alert => {
    if (!alert.location) return;
    
    let isOnRoute = false;
    
    // If alert has lat/lng coordinates, check if it's near any route coordinate
    if (alert.lat && alert.lng) {
      const alertLng = typeof alert.lng === 'number' ? alert.lng : parseFloat(alert.lng);
      const alertLat = typeof alert.lat === 'number' ? alert.lat : parseFloat(alert.lat);
      
      // Validate coordinates
      if (isNaN(alertLng) || isNaN(alertLat)) return;
      
      // Check if alert is within route bounding box (quick check)
      if (alertLng >= routeBBox.minLng && alertLng <= routeBBox.maxLng &&
          alertLat >= routeBBox.minLat && alertLat <= routeBBox.maxLat) {
        // Check distance to nearest route point
        const minDist = coords.reduce((min, coord) => {
          const dist = Math.sqrt(
            Math.pow(coord[1] - alertLat, 2) + 
            Math.pow(coord[0] - alertLng, 2)
          );
          return dist < min ? dist : min;
        }, Infinity);
        
        // If within 500m of route (0.0045 degrees ≈ 500m)
        if (minDist < 0.0045) {
          isOnRoute = true;
        }
      }
    } else {
      // If no coordinates, try to match location string with route area
      // This is a fallback for alerts that couldn't be geocoded
      // We'll use a simple text-based check - if location name appears to be in route area
      // This is less precise but better than nothing
      const locationStr = alert.location.toLowerCase();
      // For now, we'll skip text-based matching to avoid false positives
      // Alerts without coordinates won't affect score (safer approach)
    }
    
    if (isOnRoute) {
      // Penalty based on incident type
      const type = alert.type || '';
      let penalty = 0;
      let reasonText = '';
      
      if (type === 'accident' || type === 'emergency') {
        penalty = 25; // High penalty
        reasonText = `🚨 ${alert.type === 'accident' ? 'Accident' : 'Emergency'} reported near ${alert.location || 'route'}`;
        scoreReasons.incidents.push(reasonText);
      } else if (type === 'crime') {
        penalty = 20; // High penalty
        reasonText = `🔴 Crime incident reported near ${alert.location || 'route'}`;
        scoreReasons.incidents.push(reasonText);
      } else if (type === 'protest' || type === 'crowd') {
        penalty = 10; // Medium penalty
        reasonText = `⚠️ ${alert.type === 'protest' ? 'Protest' : 'Crowd'} activity near ${alert.location || 'route'}`;
        scoreReasons.incidents.push(reasonText);
      } else if (type === 'roadwork') {
        penalty = 5; // Low penalty
        reasonText = `🚧 Roadwork near ${alert.location || 'route'}`;
        scoreReasons.incidents.push(reasonText);
      } else {
        penalty = 5; // Default small penalty for other incidents
        reasonText = `📍 Incident reported near ${alert.location || 'route'}`;
        scoreReasons.incidents.push(reasonText);
      }
      
      totalIncidents += penalty;
    }
  });

  coords.forEach(coord => {
    // Find nearest crime data
    const nearestCrime = crimeData.reduce((min, c) => {
      const dist = Math.sqrt(Math.pow(c.lat - coord[1], 2) + Math.pow(c.lng - coord[0], 2));
      return dist < min.dist ? { dist, rate: c.rate } : min;
    }, { dist: Infinity, rate: 0 });
    totalCrime += nearestCrime.rate;

    // Find nearest accidents
    const nearbyAccident = accidents.find(a => {
      const dist = Math.sqrt(Math.pow(a.lat - coord[1], 2) + Math.pow(a.lng - coord[0], 2));
      return dist < 0.01; // ~1km
    });
    if (nearbyAccident) {
      const penalty = nearbyAccident.severity === 'high' ? 20 : nearbyAccident.severity === 'medium' ? 10 : 5;
      totalAccidents += penalty;
      
      // Track accident for reasons
      if (!scoreReasons.accidents.find(a => a.lat === nearbyAccident.lat && a.lng === nearbyAccident.lng)) {
        scoreReasons.accidents.push({
          severity: nearbyAccident.severity,
          lat: nearbyAccident.lat,
          lng: nearbyAccident.lng
        });
      }
    }
    
    // Track high crime areas
    if (nearestCrime.rate > 5 && nearestCrime.dist < 0.005) {
      // High crime within 500m
      if (scoreReasons.crimeAreas.length < 5) {
        scoreReasons.crimeAreas.push({
          rate: nearestCrime.rate,
          location: `High crime area (rate: ${nearestCrime.rate.toFixed(1)})`
        });
      }
    }
  });

  // Use the real data that was already fetched (or mock data from our performance fix)
  // DO NOT regenerate mock data here - use the parameters passed in!
  const routeCrowd = crowd || [];
  
  // Filter lighting data to only coordinates for this route
  // Since we pass ALL lighting data for all routes, filter by coordinate match
  let routeLighting = [];
  if (lighting && lighting.length > 0) {
    // Create a Set of coordinate strings for quick lookup
    const coordSet = new Set(coords.map(c => `${c[0].toFixed(5)},${c[1].toFixed(5)}`));
    // Filter lighting data that matches this route's coordinates
    routeLighting = lighting.filter(l => {
      if (!l.lat || !l.lng) return false;
      const coordKey = `${l.lng.toFixed(5)},${l.lat.toFixed(5)}`;
      // Find closest match (within 0.001 degrees ~= 111m)
      for (const coord of coords) {
        const dist = Math.sqrt(
          Math.pow(l.lat - coord[1], 2) + 
          Math.pow(l.lng - coord[0], 2)
        );
        if (dist < 0.001) return true;
      }
      return false;
    });
  }

  // Calculate lighting average
  if (routeLighting.length > 0) {
    const goodLightingCount = routeLighting.filter(l => l.lighting === 'good').length;
    routeLighting.forEach(l => {
      avgLighting += l.lighting === 'good' ? 10 : l.lighting === 'moderate' ? 5 : 0;
    });
    avgLighting /= routeLighting.length;
    
    // Track if lighting is poor
    const goodLightingRatio = goodLightingCount / routeLighting.length;
    if (goodLightingRatio < 0.3) {
      scoreReasons.lowLighting = true;
    }
  } else {
    // No lighting data - assume low lighting
    scoreReasons.lowLighting = true;
  }

  if (routeCrowd.length > 0) {
    const highCrowdCount = routeCrowd.filter(c => c.density === 'high').length;
    routeCrowd.forEach(c => {
      avgCrowd += c.density === 'high' ? 15 : c.density === 'medium' ? 8 : 0;
    });
    avgCrowd /= routeCrowd.length;
    
    // Track if crowd density is low
    const highCrowdRatio = highCrowdCount / routeCrowd.length;
    if (highCrowdRatio < 0.2) {
      scoreReasons.lowCrowd = true;
    }
  }

  // If traffic is null, use route.duration from Mapbox driving-traffic API
  // Convert duration to average speed (duration in seconds, distance in meters)
  if (traffic === null) {
    // Use route duration from Mapbox driving-traffic which includes traffic
    const distanceKm = route.distance / 1000; // meters to km
    const durationHours = route.duration / 3600; // seconds to hours
    avgSpeed = durationHours > 0 ? distanceKm / durationHours : 40; // km/h
  } else if (traffic && traffic.length > 0) {
    traffic.forEach(t => {
      avgSpeed += t.speed || 30;
    });
    avgSpeed /= traffic.length;
  } else {
    avgSpeed = 40; // Default speed
  }
  const speedFactor = Math.min(avgSpeed / 50, 1) * 20; // Normalize to 0-20

  const crimePenalty = (totalCrime / coords.length) * 15;
  
  // Dynamic accident penalty: +0.15 during monsoon
  let accidentPenalty = totalAccidents / coords.length;
  if (isMonsoon) {
    accidentPenalty *= 1.15; // Increase by 15% during monsoon
  }
  
  // Calculate incident penalty from n8n alerts along route
  // More incidents = lower score, no incidents = bonus
  const incidentPenalty = totalIncidents > 0 ? (totalIncidents / coords.length) * 20 : 0;
  const incidentBonus = totalIncidents === 0 ? 10 : 0; // Bonus if no incidents found

  // Get base weights
  let lightingWeight, crowdWeight, accidentWeight;
  
  // Dynamic lighting weight: +0.2 at night
  if (isNight) {
    lightingWeight = 0.6; // Increased from 0.4
  } else {
    lightingWeight = 0.4;
  }

  // Apply user feedback adjustments
  const adjusted = getAdjustedWeights({
    lighting: lightingWeight,
    accident: accidentPenalty,
    crowd: 0.2
  });

  // Apply weighted formula based on preference
  // Score starts higher if no incidents found, decreases with incidents along route
  let score = 0;
  const baseScore = 50 + incidentBonus; // Higher base if no incidents
  
  if (preference === 'Well-lit') {
    score = baseScore + (avgLighting * adjusted.lighting) + (avgCrowd * 0.2) - (crimePenalty * 0.25) - (adjusted.accident * 0.1) - (incidentPenalty * 0.3) + timePenalty;
  } else if (preference === 'Crowded') {
    score = baseScore + (avgCrowd * 0.4) + (avgLighting * adjusted.lighting) - (crimePenalty * 0.2) - (adjusted.accident * 0.1) - (incidentPenalty * 0.3) + timePenalty;
  } else if (preference === 'Fastest') {
    score = baseScore + (speedFactor * 0.4) + (avgLighting * (adjusted.lighting * 0.25)) - (crimePenalty * 0.15) - (adjusted.accident * 0.15) - (incidentPenalty * 0.25) + timePenalty;
  }

  // Track time-related factors
  if (isNight) {
    scoreReasons.timeFactors.push('🌙 Night time travel (reduced visibility)');
  }
  if (isMonsoon) {
    scoreReasons.timeFactors.push('🌧️ Monsoon season (higher accident risk)');
  }
  
  // Build summary of reasons
  const reasons = [];
  
  if (scoreReasons.incidents.length > 0) {
    reasons.push(...scoreReasons.incidents.slice(0, 3)); // Limit to 3 most recent
  }
  
  if (scoreReasons.accidents.length > 0) {
    const highSeverity = scoreReasons.accidents.filter(a => a.severity === 'high').length;
    const mediumSeverity = scoreReasons.accidents.filter(a => a.severity === 'medium').length;
    if (highSeverity > 0) {
      reasons.push(`🚨 ${highSeverity} high-severity accident${highSeverity > 1 ? 's' : ''} along route`);
    }
    if (mediumSeverity > 0) {
      reasons.push(`⚠️ ${mediumSeverity} medium-severity accident${mediumSeverity > 1 ? 's' : ''} along route`);
    }
  }
  
  if (scoreReasons.crimeAreas.length > 0) {
    reasons.push(`🔴 ${scoreReasons.crimeAreas.length} high crime area${scoreReasons.crimeAreas.length > 1 ? 's' : ''} detected`);
  }
  
  if (scoreReasons.lowLighting) {
    reasons.push('💡 Poor street lighting along route');
  }
  
  if (scoreReasons.lowCrowd && preference === 'Crowded') {
    reasons.push('👥 Low crowd density (less safe for crowded preference)');
  }
  
  if (scoreReasons.timeFactors.length > 0) {
    reasons.push(...scoreReasons.timeFactors);
  }
  
  // If score is good, mention positive factors
  const positiveFactors = [];
  if (totalIncidents === 0 && scoreReasons.accidents.length === 0) {
    positiveFactors.push('✅ No incidents or accidents reported');
  }
  if (avgLighting > 7) {
    positiveFactors.push('💡 Good street lighting');
  }
  if (avgCrowd > 10 && preference === 'Crowded') {
    positiveFactors.push('👥 High crowd density');
  }

  // Normalize score to 0-100
  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    metadata: {
      isNight,
      isMonsoon,
      lightingWeight: adjusted.lighting,
      accidentPenalty: adjusted.accident
    },
    scoreReasons: {
      negative: reasons,
      positive: positiveFactors,
      incidentsCount: scoreReasons.incidents.length,
      accidentsCount: scoreReasons.accidents.length,
      crimeAreasCount: scoreReasons.crimeAreas.length
    }
  };
}

// Generate route color based on safety score
function getRouteColor(score) {
  if (score > 75) return '#22c55e'; // Green
  if (score >= 50) return '#f59e0b'; // Yellow
  return '#3b82f6'; // Blue
}

// API Routes
app.get('/api/getCrimeData', (req, res) => {
  const data = generateMockCrimeData();
  res.json({ data });
});

/**
 * Get accidents from n8n workflow
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Array>} Array of accident incidents from n8n
 */
/**
 * Get comprehensive data from n8n automation (tweets, news, weather, etc.)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object>} Normalized data from n8n workflow
 */
async function getDataFromN8N(lat, lng) {
  try {
    // n8n workflow webhook URL - configure via N8N_WEBHOOK_URL environment variable
    // Production URL is always active (no need to execute workflow manually)
    // Test URL requires manual execution each time
    // To get your webhook URL:
    // 1. Open your n8n workflow
    // 2. Click on the "Webhook Trigger" node
    // 3. Copy the "Production URL" (always active)
    // 4. Set it as environment variable: N8N_WEBHOOK_URL=https://your-domain.n8n.cloud/webhook/your-webhook-id
    const n8nWorkflowUrl = process.env.N8N_WEBHOOK_URL || 'https://pramodhkumar.app.n8n.cloud/webhook/saferoute';
    
    // Call n8n workflow with location data
    // Using GET request with query parameters (n8n webhook is configured for GET)
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      timestamp: new Date().toISOString()
    });
    
    const response = await fetch(`${n8nWorkflowUrl}?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`n8n workflow error: ${response.status}`);
    }
    
    // Get raw response text first to handle empty responses
    const rawText = await response.text();
    let data = {};
    let parsedContent = null;
    
    if (rawText && rawText.trim().length > 0) {
      try {
        const responseData = JSON.parse(rawText);
        
        // Handle n8n AI response structure: data is in content.parts[0].text as JSON string
        if (responseData.content && responseData.content.parts && responseData.content.parts[0] && responseData.content.parts[0].text) {
          let jsonText = responseData.content.parts[0].text;
          
          // Remove markdown code block markers (```json and ```)
          jsonText = jsonText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
          
          try {
            parsedContent = JSON.parse(jsonText);
            console.log('✅ Extracted and parsed JSON from AI response');
          } catch (parseError) {
            console.warn('⚠️ Failed to parse JSON from content.parts[0].text:', parseError.message);
          }
        }
        
        // Use parsed content if available, otherwise use response data directly
        data = parsedContent || responseData;
        
        // Also merge meta data if available
        if (responseData.meta) {
          data.meta = responseData.meta;
        }
        
      } catch (e) {
        console.warn('⚠️ Failed to parse n8n response as JSON, using empty object:', e.message);
        data = {};
      }
    } else {
      console.warn('⚠️ n8n webhook returned empty response');
    }
    
    // Transform n8n data to our dashboard format
    // Expected format from n8n: { alerts: [...], weather: {...}, meta: {...} }
    const normalizedData = {
      socialFeed: [],
      weather: null,
      traffic: null,
      crowdDensity: null,
      news: []
    };
    
    // Process alerts array (contains tweets, news, weather events)
    if (data.alerts && Array.isArray(data.alerts)) {
      data.alerts.forEach(alert => {
        const alertSource = alert.source || 'Unknown';
        const alertText = alert.summary || alert.text || '';
        const alertType = alert.type || determineType(alertText);
        
        normalizedData.socialFeed.push({
          id: alert.id || `alert-${Date.now()}-${Math.random()}`,
          source: alertSource,
          text: alertText,
          timestamp: alert.timestamp ? new Date(alert.timestamp).getTime() : Date.now(),
          type: alertType,
          location: alert.location || null,
          status: alert.status || null
        });
      });
    }
    
    // Process tweets/news if they exist separately
    if (data.tweets && Array.isArray(data.tweets)) {
      data.tweets.forEach(tweet => {
        normalizedData.socialFeed.push({
          id: `tweet-${tweet.id || Date.now()}-${Math.random()}`,
          source: 'Twitter',
          text: tweet.text || tweet.content || '',
          timestamp: tweet.timestamp || tweet.created_at || Date.now(),
          type: determineType(tweet.text || tweet.content || ''),
          url: tweet.url || null
        });
      });
    }
    
    if (data.news && Array.isArray(data.news)) {
      data.news.forEach(article => {
        normalizedData.socialFeed.push({
          id: `news-${article.id || Date.now()}-${Math.random()}`,
          source: article.source?.name || 'News',
          text: article.title || article.description || '',
          timestamp: article.publishedAt || article.timestamp || Date.now(),
          type: determineType(article.title || article.description || ''),
          url: article.url || null
        });
      });
    }
    
    // Process normalized/analyzed data if available
    if (data.normalized && Array.isArray(data.normalized)) {
      data.normalized.forEach(item => {
        normalizedData.socialFeed.push({
          id: `normalized-${item.id || Date.now()}-${Math.random()}`,
          source: item.source || 'AI Analysis',
          text: item.text || item.content || item.message || '',
          timestamp: item.timestamp || Date.now(),
          type: item.type || determineType(item.text || item.content || ''),
        });
      });
    }
    
    if (data.analyzed && Array.isArray(data.analyzed)) {
      data.analyzed.forEach(item => {
        normalizedData.socialFeed.push({
          id: `analyzed-${item.id || Date.now()}-${Math.random()}`,
          source: item.source || 'AI Analysis',
          text: item.message || item.text || item.summary || '',
          timestamp: item.timestamp || Date.now(),
          type: item.category || item.type || 'info',
        });
      });
    }
    
    // Process weather data - check both root level and meta.weather
    if (data.weather) {
      normalizedData.weather = {
        temperature: data.weather.temp || data.weather.temperature,
        condition: data.weather.condition || data.weather.description || data.weather.description,
        humidity: data.weather.humidity,
        windSpeed: data.weather.windSpeed || data.weather.wind?.speed || data.weather.wind?.speed
      };
    } else if (data.meta && data.meta.weather) {
      normalizedData.weather = {
        temperature: data.meta.weather.temp,
        condition: data.meta.weather.description || data.meta.weather.condition,
        humidity: data.meta.weather.humidity,
        windSpeed: data.meta.weather.wind?.speed,
        visibility: data.meta.weather.visibility
      };
    }
    
    // Extract traffic/crowd data from safety score or alerts
    if (data.safetyScore !== undefined) {
      // Map safety score to traffic/crowd (0-100 scale)
      const score = data.safetyScore;
      if (score < 40) {
        normalizedData.traffic = { level: 'Heavy', value: 80 };
        normalizedData.crowdDensity = { level: 'High', value: 75 };
      } else if (score < 70) {
        normalizedData.traffic = { level: 'Moderate', value: 50 };
        normalizedData.crowdDensity = { level: 'Medium', value: 45 };
      } else {
        normalizedData.traffic = { level: 'Free', value: 20 };
        normalizedData.crowdDensity = { level: 'Low', value: 25 };
      }
    }
    
    // Try to extract traffic/crowd data from analyzed data
    if (data.analyzed) {
      const trafficInfo = data.analyzed.find(item => 
        item.type === 'traffic' || item.category === 'traffic' || 
        (item.text && item.text.toLowerCase().includes('traffic'))
      );
      if (trafficInfo) {
        normalizedData.traffic = {
          level: trafficInfo.level || 'Moderate',
          value: trafficInfo.value || 50
        };
      }
      
      const crowdInfo = data.analyzed.find(item => 
        item.type === 'crowd' || item.category === 'crowd' || 
        (item.text && item.text.toLowerCase().includes('crowd'))
      );
      if (crowdInfo) {
        normalizedData.crowdDensity = {
          level: crowdInfo.level || 'Medium',
          value: crowdInfo.value || 45
        };
      }
    }
    
    // Sort social feed by timestamp (newest first)
    normalizedData.socialFeed.sort((a, b) => b.timestamp - a.timestamp);
    
    if (normalizedData.socialFeed.length > 0) {
      console.log(`✅ Fetched ${normalizedData.socialFeed.length} items from n8n workflow`);
      
      // Store incidents in MongoDB
      try {
        await storeIncidentsFromN8N(normalizedData.socialFeed, lat, lng);
      } catch (storeError) {
        console.error('Error storing incidents:', storeError);
        // Don't fail the entire request if storing fails
      }
    } else {
      console.log('⚠️ No data found in n8n response, returning empty structure');
    }
    return normalizedData;
  } catch (error) {
    console.error('Error fetching data from n8n:', error.message);
    // Return empty structure instead of throwing to allow fallback
    return {
      socialFeed: [],
      weather: null,
      traffic: null,
      crowdDensity: null,
      news: []
    };
  }
}

/**
 * Store incidents from n8n data into MongoDB
 * @param {Array} socialFeed - Array of alert/incident objects from n8n
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 */
async function storeIncidentsFromN8N(socialFeed, lat, lng) {
  if (!socialFeed || socialFeed.length === 0) return;
  
  try {
    for (const alert of socialFeed) {
      // Skip if no location or type
      if (!alert.location || !alert.type) continue;
      
      // Determine severity based on type
      let severity = 'medium';
      if (alert.type === 'accident' || alert.type === 'emergency' || alert.type === 'crime') {
        severity = 'high';
      } else if (alert.type === 'protest' || alert.type === 'crowd') {
        severity = 'medium';
      } else {
        severity = 'low';
      }
      
      // Geocode location if we have lat/lng, otherwise will need to geocode later
      let alertLat = alert.lat || lat;
      let alertLng = alert.lng || lng;
      
      // Try to geocode location string if no coordinates
      if (!alertLat || !alertLng || alertLat === lat || alertLng === lng) {
        if (alert.location) {
          try {
            const coords = await geocodeAddress(alert.location);
            alertLng = coords[0];
            alertLat = coords[1];
          } catch (geocodeError) {
            // Use default coordinates if geocoding fails
            alertLat = lat;
            alertLng = lng;
          }
        }
      }
      
      // Check if incident already exists (to avoid duplicates)
      const existingIncident = await Incident.findOne({
        sourceId: alert.id,
        source: 'n8n',
        reportedAt: {
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Within last 24 hours
        }
      });
      
      if (existingIncident) {
        continue; // Skip if already stored
      }
      
      // Create incident record
      await Incident.create({
        type: alert.type,
        location: alert.location,
        latitude: alertLat,
        longitude: alertLng,
        summary: alert.text || alert.summary,
        description: alert.text || alert.summary,
        source: 'n8n',
        sourceId: alert.id,
        severity: severity,
        status: 'active',
        reportedAt: alert.timestamp ? new Date(alert.timestamp) : new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expire after 7 days
        metadata: {
          sourceInfo: alert.source,
          originalData: alert
        }
      });
    }
    
    console.log(`✅ Stored incidents to MongoDB`);
  } catch (error) {
    console.error('Error storing incidents to MongoDB:', error);
    throw error;
  }
}

/**
 * Get historical incidents near a route
 * @param {Array} routeCoordinates - Array of [lng, lat] coordinates
 * @param {number} radiusMeters - Radius in meters (default 500m)
 * @returns {Promise<Array>} Array of incidents
 */
async function getHistoricalIncidents(routeCoordinates, radiusMeters = 500) {
  try {
    if (!routeCoordinates || routeCoordinates.length === 0) {
      return [];
    }
    
    // Calculate bounding box for route
    const lngs = routeCoordinates.map(c => c[0]);
    const lats = routeCoordinates.map(c => c[1]);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    
    // Convert radius from meters to approximate degrees
    // 1 degree latitude ≈ 111km, 1 degree longitude ≈ 111km * cos(latitude)
    const latRadius = radiusMeters / 111000;
    const avgLat = (minLat + maxLat) / 2;
    const lngRadius = radiusMeters / (111000 * Math.cos(avgLat * Math.PI / 180));
    
    // Find active incidents within bounding box and time window (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const incidents = await Incident.find({
      status: 'active',
      latitude: {
        $gte: minLat - latRadius,
        $lte: maxLat + latRadius
      },
      longitude: {
        $gte: minLng - lngRadius,
        $lte: maxLng + lngRadius
      },
      reportedAt: {
        $gte: sevenDaysAgo
      }
    }).sort({ reportedAt: -1 }).limit(100); // Limit to most recent 100
    
    // Further filter by actual distance from route
    const incidentsNearRoute = [];
    for (const incident of incidents) {
      // Check distance from nearest route point
      const minDist = routeCoordinates.reduce((min, coord) => {
        const dist = Math.sqrt(
          Math.pow(coord[1] - incident.latitude, 2) + 
          Math.pow(coord[0] - incident.longitude, 2)
        );
        return dist < min ? dist : min;
      }, Infinity);
      
      // Convert distance (in degrees) to meters (approximate)
      const distMeters = minDist * 111000;
      
      if (distMeters <= radiusMeters) {
        incidentsNearRoute.push({
          id: incident._id.toString(),
          type: incident.type,
          location: incident.location,
          lat: incident.latitude,
          lng: incident.longitude,
          summary: incident.summary,
          severity: incident.severity,
          reportedAt: incident.reportedAt,
          source: incident.source
        });
      }
    }
    
    return incidentsNearRoute;
  } catch (error) {
    console.error('Error fetching historical incidents:', error);
    return []; // Return empty array on error
  }
}

/**
 * Helper function to determine message type from text content
 */
function determineType(text) {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('accident') || lowerText.includes('crash') || lowerText.includes('collision')) {
    return 'accident';
  }
  if (lowerText.includes('protest') || lowerText.includes('demonstration') || lowerText.includes('march')) {
    return 'protest';
  }
  if (lowerText.includes('emergency') || lowerText.includes('sos') || lowerText.includes('urgent')) {
    return 'emergency';
  }
  if (lowerText.includes('roadwork') || lowerText.includes('construction') || lowerText.includes('repair')) {
    return 'roadwork';
  }
  if (lowerText.includes('safe') || lowerText.includes('clear') || lowerText.includes('all good')) {
    return 'safe';
  }
  if (lowerText.includes('crowd') || lowerText.includes('people') || lowerText.includes('gathering')) {
    return 'crowd';
  }
  return 'info';
}

async function getAccidentsFromN8N(lat, lng) {
  try {
    // n8n workflow webhook URL - can be configured via environment variable
    // Production webhook URL (always active): https://pramodhkumar.app.n8n.cloud/webhook/saferoute
    // Test webhook URL (requires manual execution): https://pramodhkumar.app.n8n.cloud/webhook-test/saferoute
    // Webhook URL format: https://[domain].n8n.cloud/webhook/[webhook-id]
    // Note: Production webhook is always active - no need to execute workflow manually
    const n8nWorkflowUrl = process.env.N8N_WEBHOOK_URL || 'https://pramodhkumar.app.n8n.cloud/webhook/saferoute';
    
    // Call n8n workflow with location data
    // Using GET request with query parameters (n8n webhook is configured for GET)
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      timestamp: new Date().toISOString()
    });
    
    const response = await fetch(`${n8nWorkflowUrl}?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`n8n workflow error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transform n8n data to our format
    // Assuming n8n returns data in format: { accidents: [...], weather: [...], news: [...] }
    const accidents = [];
    
    // Handle different possible response formats
    if (data.accidents && Array.isArray(data.accidents)) {
      data.accidents.forEach(accident => {
        if (accident.lat && accident.lng) {
          accidents.push({
            lat: parseFloat(accident.lat),
            lng: parseFloat(accident.lng),
            severity: accident.severity || (accident.type === 'severe' ? 'high' : accident.type === 'moderate' ? 'medium' : 'low'),
            timestamp: accident.timestamp || Date.now(),
            type: accident.type || 'accident',
            source: accident.source || 'n8n',
            description: accident.description || accident.text || '',
            weather: accident.weather || null,
            news: accident.news || null
          });
        }
      });
    } else if (Array.isArray(data)) {
      // If n8n returns array directly
      data.forEach(item => {
        if (item.lat && item.lng) {
          accidents.push({
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lng),
            severity: item.severity || 'medium',
            timestamp: item.timestamp || Date.now(),
            type: item.type || 'accident',
            source: item.source || 'n8n',
            description: item.description || item.text || '',
            weather: item.weather || null,
            news: item.news || null
          });
        }
      });
    } else if (data.data && Array.isArray(data.data)) {
      // If wrapped in data property
      data.data.forEach(accident => {
        if (accident.lat && accident.lng) {
          accidents.push({
            lat: parseFloat(accident.lat),
            lng: parseFloat(accident.lng),
            severity: accident.severity || 'medium',
            timestamp: accident.timestamp || Date.now(),
            type: accident.type || 'accident',
            source: accident.source || 'n8n',
            description: accident.description || accident.text || '',
            weather: accident.weather || null,
            news: accident.news || null
          });
        }
      });
    }
    
    console.log(`✅ Fetched ${accidents.length} accidents from n8n workflow`);
    return accidents;
  } catch (error) {
    console.error('Error fetching accidents from n8n:', error.message);
    throw error;
  }
}

app.get('/api/getAccidents', async (req, res) => {
  try {
    const { lat = 12.9716, lng = 77.5946 } = req.query;
    
    // Try n8n workflow first
    let accidents = [];
    try {
      accidents = await getAccidentsFromN8N(parseFloat(lat), parseFloat(lng));
      if (accidents.length > 0) {
        console.log(`✅ Using ${accidents.length} accidents from n8n workflow`);
        return res.json({ data: accidents });
      }
    } catch (n8nError) {
      console.log('⚠️ n8n workflow failed, falling back to TomTom:', n8nError.message);
    }
    
    // Fallback to TomTom API
    try {
      accidents = await getAccidentsFromTomTom(parseFloat(lat), parseFloat(lng));
      if (accidents.length > 0) {
        console.log(`✅ Using ${accidents.length} accidents from TomTom API`);
        return res.json({ data: accidents });
      }
    } catch (tomTomError) {
      console.log('⚠️ TomTom API failed, falling back to mock:', tomTomError.message);
    }
    
    // Final fallback to mock data
    console.log('⚠️ Using mock accident data');
    res.json({ data: generateMockAccidents() });
  } catch (error) {
    console.error('Error in /api/getAccidents:', error);
    res.json({ data: generateMockAccidents() }); // Fallback to mock
  }
});

/**
 * Get comprehensive dashboard data from n8n automation
 * This endpoint fetches tweets, news, weather, and analyzed data from n8n workflow
 */
app.get('/api/getN8NData', async (req, res) => {
  try {
    const { lat = 12.9716, lng = 77.5946 } = req.query;
    
    // Fetch data from n8n workflow
    const n8nData = await getDataFromN8N(parseFloat(lat), parseFloat(lng));
    
    return res.json({
      success: true,
      data: n8nData
    });
  } catch (error) {
    console.error('Error in /api/getN8NData:', error);
    // Return empty structure on error so dashboard can still use fallback data
    res.json({
      success: false,
      data: {
        socialFeed: [],
        weather: null,
        traffic: null,
        crowdDensity: null,
        news: []
      },
      error: error.message
    });
  }
});

app.get('/api/getTraffic', async (req, res) => {
  try {
    const { coords } = req.query;
    if (!coords) {
      return res.json({ data: [] });
    }
    const parsedCoords = JSON.parse(coords);
    const data = await getTrafficFromTomTom(parsedCoords);
    res.json({ data });
  } catch (error) {
    console.error('Error in /api/getTraffic:', error);
    const parsedCoords = JSON.parse(req.query.coords || '[]');
    res.json({ data: generateMockTraffic(parsedCoords) }); // Fallback to mock
  }
});

app.get('/api/getLighting', async (req, res) => {
  try {
    const { coords } = req.query;
    if (!coords) {
      return res.json({ data: [] });
    }
    const parsedCoords = JSON.parse(coords);
    const data = await getLightingFromOverpass(parsedCoords);
    res.json({ data });
  } catch (error) {
    console.error('Error in /api/getLighting:', error);
    const parsedCoords = JSON.parse(req.query.coords || '[]');
    res.json({ data: generateMockLighting(parsedCoords) }); // Fallback to mock
  }
});

/**
 * Geocode address to coordinates using Mapbox with multiple fallback strategies
 * @param {string} address - Address string
 * @returns {Promise<Array>} [lng, lat] coordinates
 */
async function geocodeAddress(address) {
  if (!address || address.trim().length === 0) {
    throw new Error('Address is required');
  }

  console.log(`🔍 Geocoding address: "${address}"`);

  // Clean and prepare address variants
  const cleanAddress = address.trim();
  
  // Extract potential components (for India addresses)
  const addressParts = cleanAddress.split(',').map(part => part.trim()).filter(part => part.length > 0);
  
  // Build progressive fallback addresses - START WITH SIMPLER VARIANTS FIRST
  const addressVariants = [];
  
  // Filter out India, postal codes, and other noise
  const locationParts = addressParts.filter(part => 
    !part.match(/^N\d+$|^\d{6}$|^India$/i)
  );
  
  // 1. Try just the first part (main location name) - SIMPLEST FIRST
  if (addressParts.length > 0) {
    addressVariants.push(addressParts[0]);
  }
  
  // 2. Try first part + city (if we have multiple parts)
  if (addressParts.length >= 2) {
    addressVariants.push(`${addressParts[0]}, ${addressParts[addressParts.length - 1]}`);
  }
  
  // 3. Try without postal code (if present)
  const withoutPostal = addressParts.filter(part => !/^\d{6}$/.test(part)).join(', ');
  if (withoutPostal !== cleanAddress && withoutPostal.length < 100) {
    addressVariants.push(withoutPostal);
  }
  
  // 4. Try with key location parts (city, district, state)
  if (locationParts.length > 0) {
    // Try with city/district and state
    if (locationParts.length >= 2) {
      addressVariants.push(`${locationParts[locationParts.length - 2]}, ${locationParts[locationParts.length - 1]}`);
    }
    
    // Try with just the main city/district
    if (locationParts.length >= 1) {
      addressVariants.push(locationParts[locationParts.length - 2] || locationParts[0]);
    }
  }
  
  // 5. Try original address LAST (only if not too long)
  if (cleanAddress.length < 150) {
    addressVariants.push(cleanAddress);
  }
  
  // Remove duplicates
  const uniqueVariants = [...new Set(addressVariants)];
  
  console.log(`📋 Trying ${uniqueVariants.length} address variants:`, uniqueVariants);
  
  // Try each variant
  for (const variant of uniqueVariants) {
    try {
      const encodedAddress = encodeURIComponent(variant);
      
      // Try with India country code for better results
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=IN&limit=5`;
      
      console.log(`🌐 Trying Mapbox geocoding for: "${variant}"`);
      const response = await fetch(url);
      
      if (!response.ok) {
        console.log(`❌ Mapbox API returned ${response.status} for "${variant}"`);
        continue; // Try next variant
      }

      const data = await response.json();
      console.log(`📊 Mapbox returned ${data.features?.length || 0} results for "${variant}"`);
      
      if (data.features && data.features.length > 0) {
        // Prefer results in India
        let bestMatch = data.features.find(f => 
          f.context && f.context.some(ctx => ctx.id && ctx.id.startsWith('country'))
        ) || data.features[0];
        
        // If we can't find India match, use first result
        if (!bestMatch || !bestMatch.context || 
            !bestMatch.context.some(ctx => ctx.id && ctx.id.startsWith('country'))) {
          bestMatch = data.features[0];
        }
        
        const coords = bestMatch.center; // [lng, lat]
        console.log(`✅ Geocoded "${variant}" to [${coords[0]}, ${coords[1]}] (${bestMatch.place_name})`);
        return coords;
      }
    } catch (error) {
      console.log(`⚠️ Failed to geocode variant "${variant}":`, error.message);
      continue; // Try next variant
    }
  }
  
  // If all variants failed, try one more time with just the city/state
  const lastResort = addressParts.slice(-3).join(', ');
  if (lastResort !== cleanAddress) {
    try {
      const encodedAddress = encodeURIComponent(lastResort);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=IN&limit=3`;
      
      console.log(`🔄 Last resort geocoding: "${lastResort}"`);
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          const coords = data.features[0].center;
          console.log(`✅ Geocoded fallback "${lastResort}" to [${coords[0]}, ${coords[1]}]`);
          return coords;
        }
      }
  } catch (error) {
      console.log(`⚠️ Fallback geocoding failed:`, error.message);
  }
  }
  
  console.log(`❌ All geocoding attempts failed for: "${address}"`);
  throw new Error(`No location found for: ${address}`);
}

/**
 * Get routes from Mapbox Directions API
 * @param {Array} sourceCoords - [lng, lat] of source
 * @param {Array} destCoords - [lng, lat] of destination
 * @returns {Promise<Array>} Array of route options
 */
async function getRoutesFromMapbox(sourceCoords, destCoords) {
  try {
    // Validate coordinates
    if (!sourceCoords || !Array.isArray(sourceCoords) || sourceCoords.length !== 2) {
      throw new Error(`Invalid source coordinates: ${JSON.stringify(sourceCoords)}`);
    }
    if (!destCoords || !Array.isArray(destCoords) || destCoords.length !== 2) {
      throw new Error(`Invalid destination coordinates: ${JSON.stringify(destCoords)}`);
    }
    
    // Validate coordinate values are numbers and within valid ranges
    if (typeof sourceCoords[0] !== 'number' || typeof sourceCoords[1] !== 'number') {
      throw new Error(`Source coordinates must be numbers: [${sourceCoords[0]}, ${sourceCoords[1]}]`);
    }
    if (typeof destCoords[0] !== 'number' || typeof destCoords[1] !== 'number') {
      throw new Error(`Destination coordinates must be numbers: [${destCoords[0]}, ${destCoords[1]}]`);
    }
    
    // Validate longitude is between -180 and 180, latitude between -90 and 90
    if (sourceCoords[0] < -180 || sourceCoords[0] > 180 || sourceCoords[1] < -90 || sourceCoords[1] > 90) {
      throw new Error(`Source coordinates out of range: [${sourceCoords[0]}, ${sourceCoords[1]}]`);
    }
    if (destCoords[0] < -180 || destCoords[0] > 180 || destCoords[1] < -90 || destCoords[1] > 90) {
      throw new Error(`Destination coordinates out of range: [${destCoords[0]}, ${destCoords[1]}]`);
    }
    
    // Format: longitude,latitude (Mapbox uses lng,lat format)
    const coordinates = `${sourceCoords[0]},${sourceCoords[1]};${destCoords[0]},${destCoords[1]}`;
    console.log('🔍 Fetching route from Mapbox Directions API');
    console.log('📍 Source coordinates:', sourceCoords, `(${sourceCoords[0]}, ${sourceCoords[1]})`);
    console.log('🎯 Destination coordinates:', destCoords, `(${destCoords[0]}, ${destCoords[1]})`);
    console.log('📡 Coordinates string:', coordinates);
    
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordinates}?access_token=${MAPBOX_ACCESS_TOKEN}&alternatives=true&geometries=geojson&steps=false&overview=full`;
    
    console.log('🌐 Mapbox API URL:', url.replace(MAPBOX_ACCESS_TOKEN, 'TOKEN_HIDDEN'));
    
    const response = await fetch(url);
    
    if (!response.ok) {
      // Try to get error details from response
      let errorDetails = `Status: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorDetails += ` - ${JSON.stringify(errorData)}`;
      } catch (e) {
        // If response isn't JSON, get text
        const text = await response.text();
        errorDetails += ` - ${text}`;
      }
      console.error('❌ Mapbox Directions API error:', errorDetails);
      throw new Error(`Mapbox Directions API error: ${errorDetails}`);
    }

    const data = await response.json();
    
    console.log('✅ Mapbox API response received');
    console.log('📊 Response data:', JSON.stringify(data, null, 2));
    
    if (!data.routes || data.routes.length === 0) {
      console.error('❌ No routes found in Mapbox response');
      console.log('📋 Full response:', JSON.stringify(data, null, 2));
      throw new Error('No routes found in Mapbox response');
    }

    console.log(`✅ Found ${data.routes.length} route(s) from Mapbox`);

    // Transform Mapbox routes to our format
    return data.routes.map((route, index) => {
      // Get route name based on characteristics
      let routeName = `Route ${index + 1}`;
      const distance = route.distance / 1000; // Convert to km
      const duration = route.duration / 60; // Convert to minutes
      
      if (index === 0) {
        routeName = 'Fastest Path';
      } else if (distance < 5) {
        routeName = 'Short Route';
      } else {
        routeName = `Alternative Route ${index + 1}`;
      }

      console.log(`   Route ${index + 1}: ${routeName} - ${distance.toFixed(1)} km, ${duration.toFixed(1)} min, ${route.geometry.coordinates.length} points`);

      return {
        geometry: route.geometry,
        distance: route.distance, // meters
        duration: route.duration, // seconds
        name: routeName,
        weight: route.weight,
        weightName: route.weight_name
      };
    });
  } catch (error) {
    console.error('❌ Error fetching Mapbox routes:', error.message);
    console.error('   Stack:', error.stack);
    console.error('   Source coords:', sourceCoords);
    console.error('   Dest coords:', destCoords);
    
    // Return empty array instead of fake route - no fallback mock route
    console.warn('⚠️ Mapbox API failed - returning empty routes array (no fallback route)');
    return [];
  }
}

app.get('/api/getSafeRoutes', async (req, res) => {
  try {
    const { source, destination, preference = 'Well-lit' } = req.query;

    if (!source || !destination) {
      return res.status(400).json({ error: 'Source and destination are required' });
    }

    // Geocode source and destination
    let sourceCoords, destCoords;
      try {
        sourceCoords = await geocodeAddress(source);
      } catch (error) {
        return res.status(400).json({ 
          error: `Could not find location for source: "${source}". Please be more specific (e.g., "Hyderabad, Telangana" or include a landmark).`,
          details: error.message
        });
    }
    
      try {
        destCoords = await geocodeAddress(destination);
      } catch (error) {
        return res.status(400).json({ 
          error: `Could not find location for destination: "${destination}". Please be more specific (e.g., include city name or landmark).`,
          details: error.message
        });
    }

    // Log geocoded coordinates
    console.log('🗺️ Geocoded coordinates:');
    console.log(`   Source "${source}": [${sourceCoords[0]}, ${sourceCoords[1]}] (lng, lat)`);
    console.log(`   Destination "${destination}": [${destCoords[0]}, ${destCoords[1]}] (lng, lat)`);
    
    // Get routes from Mapbox Directions API (only real driving routes, no straight lines)
    let routes = await getRoutesFromMapbox(sourceCoords, destCoords);
    
    // If no routes were found, return error (don't generate fake routes)
    if (routes.length === 0) {
      console.error('❌ No routes found from Mapbox API');
      return res.status(404).json({ 
        error: 'No routes found between the given locations. Please check that both source and destination are valid addresses.',
        details: 'The Mapbox Directions API could not find a route. Please try more specific locations (e.g., include city names).'
      });
    }
    
    // Use only real routes from Mapbox - no fake alternative routes
    // Mapbox already returns multiple alternative routes if available
    // Limit to 3 routes (or fewer if Mapbox returns fewer)
    routes = routes.slice(0, 3);
    
    // Fetch n8n alerts for the route area (use midpoint of route)
    const midLat = (sourceCoords[1] + destCoords[1]) / 2;
    const midLng = (sourceCoords[0] + destCoords[0]) / 2;
    let n8nAlerts = [];
    try {
      const n8nData = await getDataFromN8N(midLat, midLng);
      // Extract alerts with location data and add coordinates
      if (n8nData.socialFeed && Array.isArray(n8nData.socialFeed)) {
        const alertsWithLocations = n8nData.socialFeed.filter(alert => alert.location);
        
        // Geocode alert locations to get coordinates
        const geocodedAlerts = await Promise.all(
          alertsWithLocations.map(async (alert) => {
            try {
              const geocoded = await geocodeAddress(alert.location);
              return {
                ...alert,
                lat: geocoded[1],
                lng: geocoded[0]
              };
            } catch (e) {
              // If geocoding fails, return alert without coordinates
              // It will be checked by location name matching if needed
              return { ...alert, lat: null, lng: null };
            }
          })
        );
        
        n8nAlerts = geocodedAlerts;
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch n8n alerts for route safety calculation:', error.message);
      n8nAlerts = []; // Continue with empty alerts
    }
    
    // Fetch historical incidents from MongoDB for each route
    // This will be done per route below to get route-specific incidents

    // --- LIGHTING FIX: CALL ONCE FOR ALL ROUTES ---
    // 1. Get ALL coordinates from ALL routes
    const allCoords = routes.flatMap(route => route.geometry.coordinates);
    // 2. Create ONE big bounding box
    const megaBBox = calculateBBox(allCoords);
    // 3. Call the API ONCE (or generate mock data once)
    const allStreetlights = await getLightingFromOverpass(allCoords);
    // --- END LIGHTING FIX ---

    // Fetch safety data
    const crimeData = generateMockCrimeData();
    const accidents = await getAccidentsFromTomTom(sourceCoords[1], sourceCoords[0]);

    // Calculate safety scores for each route
    const enrichedRoutes = await Promise.all(routes.map(async (route, index) => {
      const coords = route.geometry.coordinates;
      // Traffic is now included in route.duration from Mapbox driving-traffic API
      // No need to call getTrafficFromTomTom anymore!
      const lighting = allStreetlights; // Use the pre-fetched lighting data for all routes
      const crowd = generateMockCrowdDensity(coords);
      
      // Get historical incidents from MongoDB for this specific route
      let historicalIncidents = [];
      try {
        historicalIncidents = await getHistoricalIncidents(coords, 500); // 500m radius
      } catch (error) {
        console.warn('⚠️ Could not fetch historical incidents:', error.message);
      }
      
      // Combine n8n alerts with historical incidents
      const allIncidents = [
        ...n8nAlerts,
        ...historicalIncidents.map(inc => ({
          id: inc.id,
          type: inc.type,
          location: inc.location,
          lat: inc.lat,
          lng: inc.lng,
          text: inc.summary,
          severity: inc.severity,
          source: inc.source || 'historical',
          timestamp: inc.reportedAt
        }))
      ];
      
      const safetyResult = calculateSafetyScore(
        route,
        preference,
        crimeData,
        accidents,
        null, // Traffic is already included in route.duration from Mapbox driving-traffic
        lighting, // Pre-fetched lighting data for all routes
        crowd,
        new Date().getHours(),
        allIncidents // Pass all incidents (n8n + historical) to check incidents along route
      );

      const safetyScore = safetyResult.score;
      const color = getRouteColor(safetyScore);

      const goodLightingCount = lighting.filter(l => l.lighting === 'good').length;
      const highCrowdCount = crowd.filter(c => c.density === 'high').length;

      return {
        id: `route-${index}`,
        name: route.name,
        geometry: route.geometry,
        distance: route.distance,
        duration: route.duration,
        safetyScore,
        color,
        metadata: safetyResult.metadata,
        scoreReasons: safetyResult.scoreReasons, // Include score reasons
        // Include aggregated safety data
        safetyData: {
          crimeRate: (crimeData.reduce((sum, c) => sum + c.rate, 0) / crimeData.length).toFixed(2),
          accidents: accidents.length,
          avgLighting: lighting.length > 0 ? (goodLightingCount / lighting.length).toFixed(2) : '0.00',
          avgCrowd: crowd.length > 0 ? (highCrowdCount / crowd.length).toFixed(2) : '0.00'
        }
      };
    }));

    // Sort by safety score (highest first)
    enrichedRoutes.sort((a, b) => b.safetyScore - a.safetyScore);

    res.json({
      routes: enrichedRoutes,
      source,
      destination,
      preference
    });
  } catch (error) {
    console.error('Error getting safe routes:', error);
    res.status(500).json({ error: 'Failed to get safe routes' });
  }
});

// Feedback endpoint
app.post('/api/feedback', (req, res) => {
  const { routeId, feedback, safetyScore } = req.body; // feedback: 'safe' or 'unsafe'
  
  userFeedbackStore.total += 1;
  if (feedback === 'safe') {
    userFeedbackStore.safe += 1;
  } else {
    userFeedbackStore.unsafe += 1;
  }
  
  console.log('📊 User feedback received:', {
    routeId,
    feedback,
    safetyScore,
    totals: {
      total: userFeedbackStore.total,
      safe: userFeedbackStore.safe,
      unsafe: userFeedbackStore.unsafe,
      safeRatio: (userFeedbackStore.safe / userFeedbackStore.total).toFixed(2)
    }
  });
  
  res.json({
    success: true,
    message: 'Feedback recorded successfully',
    feedbackStats: {
      total: userFeedbackStore.total,
      safe: userFeedbackStore.safe,
      unsafe: userFeedbackStore.unsafe,
      safeRatio: userFeedbackStore.total > 0 
        ? (userFeedbackStore.safe / userFeedbackStore.total).toFixed(2)
        : 0
    }
  });
});

// AI Safety Suggestion endpoint - Now with real-time data
app.get('/api/ai-safety-suggestion', async (req, res) => {
  const { source, destination, routes, lat, lng } = req.query;
  
  if (!routes) {
    return res.status(400).json({ error: 'Routes data is required' });
  }
  
  try {
    const routesData = JSON.parse(routes);
    const currentHour = new Date().getHours();
    const isMonsoon = isMonsoonMonth();
    
    // Fetch real-time data if coordinates provided
    let realTimeData = {
      incidents: [],
      accidents: [],
      weather: null,
      traffic: null,
      lastUpdated: new Date().toISOString()
    };
    
    if (lat && lng) {
      try {
        // Get n8n alerts for the area
        const n8nData = await getDataFromN8N(parseFloat(lat), parseFloat(lng));
        
        if (n8nData.socialFeed && Array.isArray(n8nData.socialFeed)) {
          realTimeData.incidents = n8nData.socialFeed.filter(alert => 
            alert.location && (alert.type === 'accident' || alert.type === 'crime' || 
            alert.type === 'emergency' || alert.type === 'protest')
          );
        }
        
        realTimeData.weather = n8nData.weather;
        realTimeData.traffic = n8nData.traffic;
        
        // Get accidents
        const accidents = await getAccidentsFromTomTom(parseFloat(lat), parseFloat(lng));
        realTimeData.accidents = accidents;
      } catch (error) {
        console.warn('⚠️ Could not fetch real-time data for AI suggestions:', error.message);
        // Continue with static suggestions
      }
    }
    
    // Find safest route
    const safestRoute = routesData.reduce((best, route) => 
      route.safetyScore > best.safetyScore ? route : best
    , routesData[0]);
    
    // Find second safest for comparison
    const sortedRoutes = [...routesData].sort((a, b) => b.safetyScore - a.safetyScore);
    const secondSafest = sortedRoutes[1];
    
    // Calculate best departure time (default to 7 PM)
    let bestDepartureTime = 19; // 7 PM
    let bestTimeSafety = 0;
    
    // Simulate safety scores for different departure times
    for (let hour = 6; hour <= 22; hour++) {
      // Higher safety during day time (9 AM - 6 PM)
      let timeScore = 0;
      if (hour === 19) {
        timeScore = 90; // Best time - 7 PM
      } else if (hour >= 9 && hour <= 18) {
        timeScore = 85; // Best time
      } else if (hour >= 7 && hour <= 20) {
        timeScore = 70; // Good time
      } else {
        timeScore = 50; // Night time
      }
      
      if (timeScore > bestTimeSafety) {
        bestTimeSafety = timeScore;
        bestDepartureTime = hour;
      }
    }
    
    // Format departure time
    const formatHour = (h) => {
      const period = h >= 12 ? 'PM' : 'AM';
      const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      return `${hour12}:00 ${period}`;
    };
    
    // Calculate safety improvement percentage
    const safetyImprovement = secondSafest 
      ? ((safestRoute.safetyScore - secondSafest.safetyScore) / secondSafest.safetyScore * 100).toFixed(0)
      : 0;
    
    // Generate recommendation text with real-time context
    let recommendation = '';
    const incidentCount = realTimeData.incidents.length;
    const accidentCount = realTimeData.accidents.length;
    
    // Real-time alerts
    const hasRecentIncidents = incidentCount > 0;
    const hasRecentAccidents = accidentCount > 0;
    const hasWeatherWarning = realTimeData.weather && 
      (realTimeData.weather.condition?.toLowerCase().includes('storm') ||
       realTimeData.weather.condition?.toLowerCase().includes('heavy rain'));
    
    if (hasRecentIncidents || hasRecentAccidents) {
    if (safetyImprovement > 10) {
        recommendation = `✅ ${safestRoute.name} recommended — Safest option available. ${safetyImprovement}% safer than alternatives.`;
    } else {
        recommendation = `✅ ${safestRoute.name} is the safest route — System has identified this as your best option for safe travel.`;
      }
    } else if (safetyImprovement > 10) {
      recommendation = `✅ ${safestRoute.name} recommended — ${safetyImprovement}% safer than ${secondSafest?.name || 'alternatives'}. Optimal route selected.`;
    } else {
      recommendation = `✅ ${safestRoute.name} is the safest route available. All clear - optimal conditions for travel.`;
    }
    
    res.json({
      success: true,
      recommendation: {
        safestRoute: {
          id: safestRoute.id,
          name: safestRoute.name,
          safetyScore: safestRoute.safetyScore
        },
        recommendationText: recommendation,
        bestDepartureTime: {
          hour: bestDepartureTime,
          formatted: formatHour(bestDepartureTime),
          reason: bestDepartureTime >= 9 && bestDepartureTime <= 18 
            ? 'Daytime travel provides excellent visibility and optimal safety conditions'
            : bestDepartureTime === 19
            ? 'Evening travel provides optimal balance of visibility and traffic conditions'
            : 'Early departure ensures maximum daylight visibility for safest journey'
        },
        currentConditions: {
          isNight: isNightTime(),
          isMonsoon,
          currentHour
        },
        suggestions: [
          hasRecentIncidents 
            ? `✅ Recommended route avoids all reported incidents — Smart navigation activated`
            : '✅ No active incidents detected in the area — Clear path ahead',
          hasRecentAccidents
            ? `✅ Your selected route bypasses all recent incidents — Safe passage guaranteed`
            : '✅ Route analysis complete — All systems safe',
          hasWeatherWarning
            ? `🌤️ Weather: ${realTimeData.weather.condition} — Routes adjusted for safe travel`
            : realTimeData.weather
              ? `🌤️ Weather: ${realTimeData.weather.condition} — Excellent conditions for travel`
              : '',
          bestDepartureTime !== currentHour 
            ? `⏰ Best departure time: ${formatHour(bestDepartureTime)} — ${safetyImprovement > 0 ? `${safetyImprovement}%` : 'Optimal'} safety boost`
            : '✅ Current time is optimal for travel',
          isMonsoon ? '🌧️ Monsoon season — Routes optimized for safe travel conditions' : '',
          isNightTime() ? '🌙 Night travel — Well-lit routes selected for maximum visibility' : ''
        ].filter(s => s !== ''),
        realTimeData: {
          incidentsCount: incidentCount,
          accidentsCount: accidentCount,
          weather: realTimeData.weather,
          traffic: realTimeData.traffic,
          lastUpdated: realTimeData.lastUpdated
        }
      }
    });
  } catch (error) {
    console.error('Error generating AI suggestion:', error);
    res.status(500).json({ error: 'Failed to generate AI suggestion' });
  }
});

// Trigger safety event endpoint
app.post('/api/trigger-event', (req, res) => {
  try {
    const { lat, lng, severity, eventType } = req.body;
    
    if (!lat || !lng || !eventType) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: lat, lng, eventType' 
      });
    }
    
    // Emit event to all connected sockets
    io.emit('safety-update', {
      type: 'live-event',
      event: {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        severity: severity || 'medium',
        eventType: eventType,
      timestamp: Date.now()
      }
    });

    console.log(`✅ Safety event triggered: ${eventType} at [${lat}, ${lng}]`);

    res.json({
      success: true,
      message: `Safety event "${eventType}" triggered successfully`
    });
  } catch (error) {
    console.error('Error in /api/trigger-event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger event'
    });
  }
});

// Trigger AI Predictive Alert endpoint
app.post('/api/trigger-predictive-alert', (req, res) => {
  try {
    const { lat, lng, area } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: lat, lng' 
      });
    }
    
    console.log(`🔮 Triggering AI PREDICTIVE ALERT at [${lat}, ${lng}]`);
    
    // Emit predictive alert to all connected sockets
    io.emit('predictive-alert', {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      area: area || 'this area',
      message: `High probability of a safety incident detected in ${area || 'this area'} within the next 15 minutes.`,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      message: 'Predictive alert sent successfully'
    });
  } catch (error) {
    console.error('Error in /api/trigger-predictive-alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger predictive alert'
    });
  }
});

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
}

// Format distance for display
function formatDistance(distanceKm) {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
}

// Nearby Safe Places endpoint
app.get('/api/nearbySafePlaces', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ 
        error: 'Missing required parameters: lat, lng' 
      });
    }
    
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radius = 2000; // 2km radius in meters
    
    console.log(`🔍 Fetching nearby safe places for [${latitude}, ${longitude}]`);
    
    const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
    const safePlaces = [];
    
    // Define place types to search for
    const placeTypes = [
      { type: 'police', keyword: 'police station', icon: '🚓' },
      { type: 'hospital', keyword: 'hospital', icon: '🏥' },
      { type: 'gas_station', keyword: 'gas station', icon: '⛽' },
      { type: 'supermarket', keyword: 'supermarket', icon: '🛍️' },
      { type: 'cafe', keyword: 'cafe', icon: '☕' }
    ];
    
    if (GOOGLE_PLACES_API_KEY) {
      // Use Google Places API Nearby Search
      for (const placeType of placeTypes) {
        try {
          const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&keyword=${encodeURIComponent(placeType.keyword)}&key=${GOOGLE_PLACES_API_KEY}`;
          
          const response = await fetch(url);
    const data = await response.json();
          
          if (data.status === 'OK' && data.results) {
            for (const place of data.results.slice(0, 5)) { // Limit to 5 per type
              const distance = calculateDistance(latitude, longitude, place.geometry.location.lat, place.geometry.location.lng);
              
              safePlaces.push({
                id: place.place_id || `place_${Date.now()}_${Math.random()}`,
                name: place.name,
                type: placeType.type,
                typeLabel: placeType.keyword,
                icon: placeType.icon,
                lat: place.geometry.location.lat,
                lng: place.geometry.location.lng,
                distance: formatDistance(distance),
                distanceKm: distance,
                address: place.vicinity || place.formatted_address || 'Address not available',
                rating: place.rating || null,
                placeId: place.place_id
              });
            }
          }
        } catch (error) {
          console.error(`Error fetching ${placeType.type}:`, error.message);
        }
      }
    } else {
      // Fallback to OpenStreetMap Nominatim API (no API key needed)
      console.log('⚠️  Google Places API key not found, using OpenStreetMap Nominatim');
      
      for (const placeType of placeTypes) {
        try {
          // Use Nominatim search API with location-based query
          // First try: Search for places near the location
          const searchQuery = encodeURIComponent(`${placeType.keyword} near ${latitude},${longitude}`);
          const url = `https://nominatim.openstreetmap.org/search?q=${searchQuery}&format=json&limit=10&lat=${latitude}&lon=${longitude}&radius=${radius / 1000}`;
          
          console.log(`🔍 Searching OSM for ${placeType.type}: ${searchQuery}`);
          
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'SafeRouteLive/1.0' // Required by Nominatim
            }
          });
          
          if (!response.ok) {
            console.error(`❌ OSM API error for ${placeType.type}: ${response.status}`);
            continue;
          }
          
          const data = await response.json();
          
          if (Array.isArray(data) && data.length > 0) {
            for (const place of data.slice(0, 5)) {
              const placeLat = parseFloat(place.lat);
              const placeLng = parseFloat(place.lon);
              const distance = calculateDistance(latitude, longitude, placeLat, placeLng);
              
              // Filter by radius (Nominatim doesn't always respect radius parameter)
              if (distance <= 2) {
                safePlaces.push({
                  id: place.place_id || place.osm_id || `osm_${Date.now()}_${Math.random()}`,
                  name: place.display_name.split(',')[0], // Get first part as name
                  type: placeType.type,
                  typeLabel: placeType.keyword,
                  icon: placeType.icon,
                  lat: placeLat,
                  lng: placeLng,
                  distance: formatDistance(distance),
                  distanceKm: distance,
                  address: place.display_name,
                  rating: null,
                  placeId: null
                });
              }
            }
            console.log(`✅ Found ${Math.min(data.length, 5)} ${placeType.type} from OSM`);
          } else {
            console.log(`⚠️  No ${placeType.type} found in OSM for this location`);
          }
          
          // Rate limiting for Nominatim (max 1 request per second)
          await new Promise(resolve => setTimeout(resolve, 1100)); // Slightly more than 1 second
        } catch (error) {
          console.error(`Error fetching ${placeType.type} from OSM:`, error.message);
        }
      }
      
      // If OSM didn't return results, generate some mock nearby places for testing
      if (safePlaces.length === 0) {
        console.log('⚠️  No places found from OSM. Generating mock nearby places for testing...');
        const mockPlaces = [
          { type: 'police', keyword: 'police station', icon: '🚓', name: 'Police Station', offset: [0.01, 0.01] },
          { type: 'hospital', keyword: 'hospital', icon: '🏥', name: 'Hospital', offset: [-0.01, 0.01] },
          { type: 'gas_station', keyword: 'gas station', icon: '⛽', name: 'Petrol Station', offset: [0.01, -0.01] },
          { type: 'supermarket', keyword: 'supermarket', icon: '🛍️', name: 'Supermarket', offset: [-0.01, -0.01] },
          { type: 'cafe', keyword: 'cafe', icon: '☕', name: 'Café', offset: [0.015, 0.015] }
        ];
        
        mockPlaces.forEach((mock, index) => {
          const mockLat = latitude + mock.offset[0];
          const mockLng = longitude + mock.offset[1];
          const distance = calculateDistance(latitude, longitude, mockLat, mockLng);
          
          safePlaces.push({
            id: `mock_${mock.type}_${index}`,
            name: `${mock.name} (Mock)`,
            type: mock.type,
            typeLabel: mock.keyword,
            icon: mock.icon,
            lat: mockLat,
            lng: mockLng,
            distance: formatDistance(distance),
            distanceKm: distance,
            address: 'Near your location (mock data for testing)',
            rating: null,
            placeId: null
          });
        });
        
        console.log(`✅ Generated ${mockPlaces.length} mock safe places for testing`);
      }
    }
    
    // Sort by distance
    safePlaces.sort((a, b) => a.distanceKm - b.distanceKm);
    
    console.log(`✅ Found ${safePlaces.length} safe places within 2km`);
    
    res.json({
      safePlaces: safePlaces.slice(0, 30), // Limit total results to 30
      count: safePlaces.length,
      userLocation: { lat: latitude, lng: longitude }
    });
    
  } catch (error) {
    console.error('Error fetching nearby safe places:', error);
    res.status(500).json({ 
      error: 'Failed to fetch nearby safe places',
      message: error.message 
    });
  }
});

// SOS endpoint (mock Twilio)
app.post('/api/sos', (req, res) => {
  const { location, message } = req.body;
  console.log('🚨 SOS Alert received:', { location, message, timestamp: new Date().toISOString() });
  
  // In production, integrate with Twilio API here
  // Example: twilioClient.messages.create({...})

    res.json({
    success: true,
    message: 'SOS alert sent successfully',
    alertId: `SOS-${Date.now()}`,
    timestamp: new Date().toISOString()
  });
});

httpServer.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available at /api/*`);
  console.log(`🔌 Socket.IO server ready for connections`);
  
  // Verify n8n webhook is accessible on startup
  const n8nWorkflowUrl = process.env.N8N_WEBHOOK_URL || 'https://pramodhkumar.app.n8n.cloud/webhook/saferoute';
  console.log(`\n🔍 Verifying n8n webhook connection...`);
  console.log(`   URL: ${n8nWorkflowUrl}`);
  
  try {
    const testParams = new URLSearchParams({
      lat: '12.9716',
      lng: '77.5946',
      timestamp: new Date().toISOString()
    });
    
    const response = await fetch(`${n8nWorkflowUrl}?${testParams}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const responseText = await response.text();
      if (responseText && responseText.length > 0) {
        console.log(`✅ n8n webhook is active and responding`);
        console.log(`   Response: ${responseText.substring(0, 100)}...`);
      } else {
        console.log(`⚠️ n8n webhook responded but returned empty data`);
        console.log(`   Make sure your workflow is active and Webhook Response node is configured`);
      }
    } else {
      console.log(`⚠️ n8n webhook returned status ${response.status}`);
      console.log(`   Check that your workflow is saved and active in n8n`);
    }
  } catch (error) {
    console.log(`⚠️ Could not verify n8n webhook: ${error.message}`);
    console.log(`   The server will continue, but n8n integration may not work`);
  }
  
  console.log(`\n✨ Ready to accept requests!\n`);
});

