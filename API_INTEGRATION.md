# Real API Integration Guide

## Overview
The backend now integrates with real APIs for route planning, traffic data, accidents, and street lighting.

## API Keys Configured

### Mapbox
- **Token**: `pk.eyJ1IjoibHlubnZpc2hhbnRoIiwiYSI6ImNtaGM3dDNhZTIwdWcya3BjMDlta2JzYjQifQ.xrN6-HYsxUE99AWH1mHBqQ`
- **Used for**: 
  - Geocoding (address → coordinates)
  - Directions API (route calculation)
- **Environment Variable**: `MAPBOX_ACCESS_TOKEN`

### TomTom
- **Key**: `VT4rxjoalnUg4StOsHNmAxPNleSYowIR`
- **Used for**:
  - Traffic flow data
  - Accident/incident data
- **Environment Variable**: `TOMTOM_API_KEY`

### Overpass API
- **URL**: `https://overpass-api.de/api/interpreter`
- **Used for**:
  - Street lighting data (OpenStreetMap data)
- **No API key required** (public API)

## Integrated APIs

### 1. Mapbox Geocoding API
**Endpoint**: `GET /api/getSafeRoutes`
- Converts source and destination addresses to coordinates
- Uses Mapbox Geocoding API v5
- Falls back to default coordinates on error

**Usage**:
```javascript
const sourceCoords = await geocodeAddress("MG Road, Bengaluru");
// Returns: [77.5946, 12.9716]
```

### 2. Mapbox Directions API
**Endpoint**: `GET /api/getSafeRoutes`
- Gets multiple route alternatives between two points
- Returns route geometry, distance, and duration
- Falls back to mock routes on error

**Usage**:
```javascript
const routes = await getRoutesFromMapbox(sourceCoords, destCoords);
// Returns: Array of route objects with geometry, distance, duration
```

### 3. TomTom Traffic API
**Endpoints**:
- `GET /api/getTraffic?coords=[...]`
- `GET /api/getAccidents?lat=...&lng=...`

**Features**:
- Real-time traffic flow data
- Accident and incident details
- Speed and congestion information

**Usage**:
```javascript
const traffic = await getTrafficFromTomTom(coordinates);
const accidents = await getAccidentsFromTomTom(lat, lng);
```

### 4. Overpass API (OpenStreetMap)
**Endpoint**: `GET /api/getLighting?coords=[...]`

**Features**:
- Queries OpenStreetMap for street lamp data
- Calculates lighting quality based on proximity
- Uses bounding box queries

**Query Format**:
```
[out:json];
(
  node["highway"="street_lamp"]({{bbox}});
  way["highway"="street_lamp"]({{bbox}});
);
out;
```

**Usage**:
```javascript
const lighting = await getLightingFromOverpass(coordinates);
// Returns: Array with lighting quality (good/moderate/poor) per coordinate
```

## How It Works

### Route Calculation Flow

1. **Geocode Source & Destination**
   - User enters addresses
   - Mapbox Geocoding API converts to coordinates

2. **Get Route Alternatives**
   - Mapbox Directions API calculates routes
   - Returns up to 3 alternative routes

3. **Fetch Safety Data**
   - **Lighting**: Overpass API queries street lamps near route
   - **Traffic**: TomTom API gets real-time flow data
   - **Accidents**: TomTom API gets nearby incidents
   - **Crime**: Mock data (can be replaced with real API)

4. **Calculate Safety Scores**
   - Each route scored using weighted formula
   - Factors: lighting, traffic, accidents, crime, crowd density
   - Dynamic weights for night time and monsoon

5. **Return Enriched Routes**
   - Routes include safety scores, colors, and metadata
   - Sorted by safety score (highest first)

## Error Handling

All API integrations have fallback mechanisms:

- **Mapbox API fails** → Falls back to mock routes
- **TomTom API fails** → Falls back to mock traffic/accidents
- **Overpass API fails** → Falls back to mock lighting data

This ensures the application continues to work even if external APIs are unavailable.

## Environment Variables

Create a `.env` file in the `server` directory:

```env
PORT=3001
MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoibHlubnZpc2hhbnRoIiwiYSI6ImNtaGM3dDNhZTIwdWcya3BjMDlta2JzYjQifQ.xrN6-HYsxUE99AWH1mHBqQ
TOMTOM_API_KEY=VT4rxjoalnUg4StOsHNmAxPNleSYowIR
FRONTEND_URL=http://localhost:5173
```

## API Rate Limits

### Mapbox
- Free tier: 100,000 requests/month
- Geocoding: 600 requests/min
- Directions: 600 requests/min

### TomTom
- Free tier: 2,500 requests/day
- Traffic API: 250 requests/day
- Rate limit: Varies by endpoint

### Overpass API
- No authentication required
- Rate limit: ~10,000 requests/day (shared)
- Be respectful with query frequency

## Testing

To test the integrations:

1. **Start the server**:
   ```bash
   cd server
   npm install  # Install node-fetch
   npm run dev
   ```

2. **Make a route request**:
   ```bash
   curl "http://localhost:3001/api/getSafeRoutes?source=MG%20Road,%20Bengaluru&destination=Indiranagar,%20Bengaluru&preference=Well-lit"
   ```

3. **Check console logs**:
   - API calls are logged
   - Errors show fallback to mock data
   - Success messages confirm API usage

## Next Steps

1. **Replace Crime Data**: Integrate real crime data API (e.g., data.gov.in for India)
2. **Add Caching**: Cache API responses to reduce rate limit usage
3. **Optimize Queries**: Batch API calls where possible
4. **Monitor Usage**: Track API usage to stay within limits
5. **Add Retry Logic**: Implement exponential backoff for failed requests

## Notes

- All APIs use default keys (hardcoded) for quick setup
- For production, move keys to environment variables
- Mock data is still available as fallback
- API responses are transformed to match application format

