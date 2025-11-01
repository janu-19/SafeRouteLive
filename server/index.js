import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Node.js 18+ has native fetch support
// If using Node.js < 18, uncomment: import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Room management (in-memory storage)
const rooms = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

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
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
    
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
function calculateSafetyScore(route, preference, crimeData, accidents, traffic, lighting, crowd, timeOfDay) {
  const hour = new Date().getHours();
  const isNight = isNightTime();
  const isMonsoon = isMonsoonMonth();
  const timePenalty = isNight ? -10 : 0;

  // Aggregate data along route
  const coords = route.geometry.coordinates;
  let totalCrime = 0;
  let totalAccidents = 0;
  let avgLighting = 0;
  let avgCrowd = 0;
  let avgSpeed = 0;

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
      totalAccidents += nearbyAccident.severity === 'high' ? 20 : nearbyAccident.severity === 'medium' ? 10 : 5;
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
    routeLighting.forEach(l => {
      avgLighting += l.lighting === 'good' ? 10 : l.lighting === 'moderate' ? 5 : 0;
    });
    avgLighting /= routeLighting.length;
  }

  if (routeCrowd.length > 0) {
    routeCrowd.forEach(c => {
      avgCrowd += c.density === 'high' ? 15 : c.density === 'medium' ? 8 : 0;
    });
    avgCrowd /= routeCrowd.length;
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
  let score = 0;
  if (preference === 'Well-lit') {
    score = 40 + (avgLighting * adjusted.lighting) + (avgCrowd * 0.2) - (crimePenalty * 0.25) - (adjusted.accident * 0.1) + timePenalty;
  } else if (preference === 'Crowded') {
    score = 40 + (avgCrowd * 0.4) + (avgLighting * adjusted.lighting) - (crimePenalty * 0.2) - (adjusted.accident * 0.1) + timePenalty;
  } else if (preference === 'Fastest') {
    score = 30 + (speedFactor * 0.4) + (avgLighting * (adjusted.lighting * 0.25)) - (crimePenalty * 0.15) - (adjusted.accident * 0.15) + timePenalty;
  }

  // Normalize score to 0-100
  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    metadata: {
      isNight,
      isMonsoon,
      lightingWeight: adjusted.lighting,
      accidentPenalty: adjusted.accident
    }
  };
}

// Generate route color based on safety score
function getRouteColor(score) {
  if (score > 75) return '#22c55e'; // Green
  if (score >= 50) return '#f59e0b'; // Yellow
  return '#ef4444'; // Red
}

// API Routes
app.get('/api/getCrimeData', (req, res) => {
  const data = generateMockCrimeData();
  res.json({ data });
});

app.get('/api/getAccidents', async (req, res) => {
  try {
    const { lat = 12.9716, lng = 77.5946 } = req.query;
    const data = await getAccidentsFromTomTom(parseFloat(lat), parseFloat(lng));
    res.json({ data });
  } catch (error) {
    console.error('Error in /api/getAccidents:', error);
    res.json({ data: generateMockAccidents() }); // Fallback to mock
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

  // Clean and prepare address variants
  const cleanAddress = address.trim();
  
  // Extract potential components (for India addresses)
  const addressParts = cleanAddress.split(',').map(part => part.trim()).filter(part => part.length > 0);
  
  // Build progressive fallback addresses
  const addressVariants = [];
  
  // 1. Try original address
  addressVariants.push(cleanAddress);
  
  // 2. Try without postal code (if present)
  const withoutPostal = addressParts.filter(part => !/^\d{6}$/.test(part)).join(', ');
  if (withoutPostal !== cleanAddress) {
    addressVariants.push(withoutPostal);
  }
  
  // 3. Try with key location parts (city, district, state, country)
  // For format like "N10, 522240, Kuragallu, Mangalagiri, Guntur, Andhra Pradesh, India"
  // Extract: Kuragallu, Mangalagiri, Guntur, Andhra Pradesh
  const locationParts = addressParts.filter(part => 
    !part.match(/^N\d+$|^\d{6}$|^India$/i)
  );
  if (locationParts.length > 0) {
    // Try with all location parts
    addressVariants.push(locationParts.join(', '));
    
    // Try with city/district and state
    if (locationParts.length >= 2) {
      addressVariants.push(`${locationParts[locationParts.length - 2]}, ${locationParts[locationParts.length - 1]}`);
    }
    
    // Try with just the main city/district
    if (locationParts.length >= 1) {
      addressVariants.push(locationParts[locationParts.length - 2] || locationParts[0]);
    }
  }
  
  // Remove duplicates
  const uniqueVariants = [...new Set(addressVariants)];
  
  // Try each variant
  for (const variant of uniqueVariants) {
    try {
      const encodedAddress = encodeURIComponent(variant);
      
      // Try with India country code for better results
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=IN&limit=5`;
      
      const response = await fetch(url);
      if (!response.ok) {
        continue; // Try next variant
      }

      const data = await response.json();
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
        console.log(`✅ Geocoded "${variant}" to [${coords[0]}, ${coords[1]}]`);
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
    const coordinates = `${sourceCoords[0]},${sourceCoords[1]};${destCoords[0]},${destCoords[1]}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordinates}?access_token=${MAPBOX_ACCESS_TOKEN}&alternatives=true&geometries=geojson&steps=false&overview=full`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Mapbox Directions API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.routes || data.routes.length === 0) {
      throw new Error('No routes found');
    }

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
    console.error('Error fetching Mapbox routes:', error);
    // Return mock routes as fallback
    return [
      {
        geometry: {
          type: 'LineString',
          coordinates: [
            sourceCoords,
            [(sourceCoords[0] + destCoords[0]) / 2, (sourceCoords[1] + destCoords[1]) / 2],
            destCoords
          ]
        },
        distance: 5000,
        duration: 900,
        name: 'Default Route'
      }
    ];
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

    // Get routes from Mapbox Directions API
    let routes = await getRoutesFromMapbox(sourceCoords, destCoords);
    
    // If we got only one route from Mapbox, add a couple of alternatives using slight variations
    if (routes.length < 3) {
      // Generate alternative routes by slightly offsetting coordinates
      const altRoutes = [];
      for (let i = 0; i < 3 - routes.length; i++) {
        const offset = (i + 1) * 0.005; // Small offset
        altRoutes.push({
          geometry: {
            type: 'LineString',
            coordinates: [
              sourceCoords,
              [sourceCoords[0] + offset, sourceCoords[1] + offset],
              [destCoords[0] + offset, destCoords[1] + offset],
              destCoords
            ]
          },
          distance: routes[0].distance * (1 + (i + 1) * 0.1),
          duration: routes[0].duration * (1 + (i + 1) * 0.1),
          name: i === 0 ? 'Well-lit Main Roads' : i === 1 ? 'Crowded Streets' : 'Alternative Route'
        });
      }
      routes = [...routes, ...altRoutes];
    }

    // Limit to 3 routes
    routes = routes.slice(0, 3);

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
      
      const safetyResult = calculateSafetyScore(
        route,
        preference,
        crimeData,
        accidents,
        null, // Traffic is already included in route.duration from Mapbox driving-traffic
        lighting, // Pre-fetched lighting data for all routes
        crowd,
        new Date().getHours()
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

// AI Safety Suggestion endpoint
app.get('/api/ai-safety-suggestion', (req, res) => {
  const { source, destination, routes } = req.query;
  
  if (!routes) {
    return res.status(400).json({ error: 'Routes data is required' });
  }
  
  try {
    const routesData = JSON.parse(routes);
    const currentHour = new Date().getHours();
    const isMonsoon = isMonsoonMonth();
    
    // Find safest route
    const safestRoute = routesData.reduce((best, route) => 
      route.safetyScore > best.safetyScore ? route : best
    , routesData[0]);
    
    // Find second safest for comparison
    const sortedRoutes = [...routesData].sort((a, b) => b.safetyScore - a.safetyScore);
    const secondSafest = sortedRoutes[1];
    
    // Calculate best departure time (avoid night hours)
    let bestDepartureTime = currentHour;
    let bestTimeSafety = 0;
    
    // Simulate safety scores for different departure times
    for (let hour = 6; hour <= 22; hour++) {
      // Higher safety during day time (9 AM - 6 PM)
      let timeScore = 0;
      if (hour >= 9 && hour <= 18) {
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
    
    // Generate recommendation text
    let recommendation = '';
    if (safetyImprovement > 10) {
      recommendation = `Try ${safestRoute.name} — ${safetyImprovement}% safer than ${secondSafest?.name || 'alternatives'}`;
    } else {
      recommendation = `${safestRoute.name} is the safest route available`;
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
            ? 'Daytime travel provides better visibility and higher crowd density'
            : 'Earlier departure avoids night-time safety concerns'
        },
        currentConditions: {
          isNight: isNightTime(),
          isMonsoon,
          currentHour
        },
        suggestions: [
          bestDepartureTime !== currentHour 
            ? `Best departure time: ${formatHour(bestDepartureTime)} (${safetyImprovement}% safer)`
            : 'Current time is optimal for travel',
          isMonsoon ? '⚠️ Monsoon season detected - Exercise extra caution' : '',
          isNightTime() ? '🌙 Night time travel - Well-lit routes recommended' : ''
        ].filter(s => s !== '')
      }
    });
  } catch (error) {
    console.error('Error generating AI suggestion:', error);
    res.status(500).json({ error: 'Failed to generate AI suggestion' });
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

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available at /api/*`);
  console.log(`🔌 Socket.IO server ready for connections`);
});

