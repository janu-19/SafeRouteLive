import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

// Mock data generators
function generateMockCrimeData() {
  return [
    { lat: 12.9716, lng: 77.5946, rate: 0.3, area: 'MG Road' },
    { lat: 12.9790, lng: 77.6400, rate: 0.7, area: 'Shivajinagar' },
    { lat: 12.9352, lng: 77.6245, rate: 0.4, area: 'Indiranagar' },
    { lat: 12.9141, lng: 77.6412, rate: 0.8, area: 'KR Market' },
    { lat: 12.9352, lng: 77.6100, rate: 0.2, area: 'Koramangala' }
  ];
}

function generateMockAccidents() {
  return [
    { lat: 12.9750, lng: 77.6000, severity: 'high', timestamp: Date.now() - 3600000 },
    { lat: 12.9600, lng: 77.6300, severity: 'medium', timestamp: Date.now() - 7200000 },
    { lat: 12.9450, lng: 77.6150, severity: 'low', timestamp: Date.now() - 10800000 }
  ];
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

  // Aggregate traffic, lighting, crowd
  const routeTraffic = generateMockTraffic(coords);
  const routeLighting = generateMockLighting(coords);
  const routeCrowd = generateMockCrowdDensity(coords);

  routeLighting.forEach(l => {
    avgLighting += l.lighting === 'good' ? 10 : l.lighting === 'moderate' ? 5 : 0;
  });
  avgLighting /= coords.length;

  routeCrowd.forEach(c => {
    avgCrowd += c.density === 'high' ? 15 : c.density === 'medium' ? 8 : 0;
  });
  avgCrowd /= coords.length;

  routeTraffic.forEach(t => {
    avgSpeed += t.speed;
  });
  avgSpeed /= coords.length;
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

app.get('/api/getAccidents', (req, res) => {
  const data = generateMockAccidents();
  res.json({ data });
});

app.get('/api/getTraffic', (req, res) => {
  const { coords } = req.query;
  if (!coords) {
    return res.json({ data: [] });
  }
  const parsedCoords = JSON.parse(coords);
  const data = generateMockTraffic(parsedCoords);
  res.json({ data });
});

app.get('/api/getLighting', (req, res) => {
  const { coords } = req.query;
  if (!coords) {
    return res.json({ data: [] });
  }
  const parsedCoords = JSON.parse(coords);
  const data = generateMockLighting(parsedCoords);
  res.json({ data });
});

app.get('/api/getSafeRoutes', async (req, res) => {
  try {
    const { source, destination, preference = 'Well-lit' } = req.query;

    if (!source || !destination) {
      return res.status(400).json({ error: 'Source and destination are required' });
    }

    // Mock Mapbox Directions API call
    // In production, replace with actual Mapbox API call
    const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || '';
    
    // Generate mock routes (3 options)
    const mockRoutes = [
      {
        geometry: {
          type: 'LineString',
          coordinates: [
            [77.5946, 12.9716],
            [77.6000, 12.9750],
            [77.6100, 12.9800],
            [77.6200, 12.9850],
            [77.6300, 12.9880],
            [77.6400, 12.9790]
          ]
        },
        distance: 5100, // meters
        duration: 1080, // seconds
        name: 'Well-lit Main Roads'
      },
      {
        geometry: {
          type: 'LineString',
          coordinates: [
            [77.5946, 12.9716],
            [77.6050, 12.9730],
            [77.6150, 12.9750],
            [77.6250, 12.9770],
            [77.6350, 12.9780],
            [77.6400, 12.9790]
          ]
        },
        distance: 5400,
        duration: 1200,
        name: 'Crowded Streets'
      },
      {
        geometry: {
          type: 'LineString',
          coordinates: [
            [77.5946, 12.9716],
            [77.6100, 12.9720],
            [77.6250, 12.9740],
            [77.6370, 12.9780],
            [77.6400, 12.9790]
          ]
        },
        distance: 4600,
        duration: 900,
        name: 'Fastest Path'
      }
    ];

    // Fetch safety data
    const crimeData = generateMockCrimeData();
    const accidents = generateMockAccidents();

    // Calculate safety scores for each route
    const enrichedRoutes = mockRoutes.map((route, index) => {
      const traffic = generateMockTraffic(route.geometry.coordinates);
      const lighting = generateMockLighting(route.geometry.coordinates);
      const crowd = generateMockCrowdDensity(route.geometry.coordinates);
      
      const safetyResult = calculateSafetyScore(
        route,
        preference,
        crimeData,
        accidents,
        traffic,
        lighting,
        crowd,
        new Date().getHours()
      );

      const safetyScore = safetyResult.score;
      const color = getRouteColor(safetyScore);

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
          avgLighting: lighting.filter(l => l.lighting === 'good').length / lighting.length,
          avgCrowd: crowd.filter(c => c.density === 'high').length / crowd.length
        }
      };
    });

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

