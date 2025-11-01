# SafeRoute Live - Safe Routes Feature

A comprehensive React application that finds and displays the safest routes between locations using live and static safety data.

## Features

- 🗺️ **Multiple Route Options**: Fetch and display multiple route options from Mapbox Directions API
- 🛡️ **Safety Score Calculation**: Calculate safety scores using:
  - Crime Rate data
  - Traffic Congestion
  - Recent Accidents
  - Street Lighting
  - Crowd Density
  - Time of Day
- 🎨 **Color-Coded Visualization**: 
  - 🟢 Green: Safety Score > 75
  - 🟡 Yellow: Safety Score 50-75
  - 🔴 Red: Safety Score < 50
- ⏱️ **Real-Time Updates**: Auto-refresh safety data every 10 seconds
- 🚨 **Floating Action Buttons**:
  - 🔴 SOS: Send emergency alert (mock Twilio integration)
  - 🟢 Recalculate Route: Re-fetch safe routes
  - 🔵 Share Live: Share live location

## Project Structure

```
SafeLive/
├── server/                    # Backend Express.js server
│   ├── index.js              # Main server with API routes
│   ├── package.json          # Server dependencies
│   └── .env.example          # Environment variables template
├── SafeRoute-Live/            # Frontend React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── MapComponent.jsx      # Mapbox map component
│   │   │   ├── RouteCard.jsx         # Route card display
│   │   │   └── FloatingButtons.jsx   # SOS, Recalculate, Share buttons
│   │   ├── pages/
│   │   │   └── RoutePlanner.jsx      # Main route planner page
│   │   └── utils/
│   │       └── api.js                # API utility functions
│   └── .env.example          # Frontend environment variables
└── README.md                  # This file
```

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Backend Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` and add your API keys (optional for now, works with mock data):
   ```env
   PORT=3001
   MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
   TOMTOM_API_KEY=your_tomtom_key_here
   ```

5. Start the server:
   ```bash
   npm run dev
   ```

   The server will run on `http://localhost:3001`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd SafeRoute-Live
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` and add your Mapbox token:
   ```env
   VITE_MAPBOX_TOKEN=your_mapbox_token_here
   VITE_API_BASE_URL=http://localhost:3001
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend will run on `http://localhost:5173`

## API Endpoints

### Backend Routes

- `GET /api/getSafeRoutes?source={source}&destination={dest}&preference={pref}`
  - Returns multiple route options with safety scores
  - Parameters:
    - `source`: Starting location
    - `destination`: End location
    - `preference`: "Well-lit", "Crowded", or "Fastest"

- `GET /api/getCrimeData`
  - Returns mock crime data for the area

- `GET /api/getAccidents`
  - Returns mock accident data

- `GET /api/getTraffic?coords={coordinates}`
  - Returns traffic congestion data for given coordinates

- `GET /api/getLighting?coords={coordinates}`
  - Returns street lighting data for given coordinates

- `POST /api/sos`
  - Sends SOS alert (mock Twilio integration)
  - Body: `{ location: { lat, lng }, message: "..." }`

## Safety Score Calculation

The safety score is calculated using weighted formulas based on user preference:

### Well-lit Preference
```
Score = 40 + (lighting × 0.4) + (crowd × 0.2) - (crime × 0.25) - (accidents × 0.1) + timePenalty
```

### Crowded Preference
```
Score = 40 + (crowd × 0.4) + (lighting × 0.2) - (crime × 0.2) - (accidents × 0.1) + timePenalty
```

### Fastest Preference
```
Score = 30 + (speedFactor × 0.4) + (lighting × 0.1) - (crime × 0.15) - (accidents × 0.15) + timePenalty
```

### Factors

- **CrimeRate**: -15 points for high crime areas
- **Traffic Congestion**: +10 points for busy areas (safety in numbers)
- **Accidents**: -20 points near recent incidents
- **Street Lighting**: +10 points for well-lit roads
- **Crowd Density**: +15 points if area is populated
- **Time of Day**: -10 points if nighttime (after 8 PM or before 6 AM)

## Integration with Real APIs

The current implementation uses mock data. To integrate with real APIs:

### Mapbox Directions API

In `server/index.js`, replace the mock routes section with:
```javascript
const mapboxUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${sourceLng},${sourceLat};${destLng},${destLat}?access_token=${MAPBOX_TOKEN}&alternatives=true`;
const response = await fetch(mapboxUrl);
const data = await response.json();
```

### TomTom API

Replace `generateMockAccidents()` with:
```javascript
const tomtomUrl = `https://api.tomtom.com/traffic/services/4/incidentDetails?key=${TOMTOM_API_KEY}&bbox=${bbox}`;
const response = await fetch(tomtomUrl);
const data = await response.json();
```

### OpenStreetMap (Lighting)

Use Overpass API to query street lighting:
```javascript
const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];...`;
```

### Data.gov.in (Crime Data)

Use the India Open Government Data Portal:
```javascript
const crimeUrl = `https://api.data.gov.in/resource/...`;
```

## Real-Time Updates

The application automatically refreshes safety data every 10 seconds using `setInterval`. This includes:
- Accident markers on the map
- Route safety scores
- Traffic congestion updates

## Development

### Running Both Servers

Use two terminal windows:

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd SafeRoute-Live
npm run dev
```

## Production Deployment

1. Set environment variables on your hosting platform
2. Update `VITE_API_BASE_URL` to your deployed backend URL
3. Build the frontend:
   ```bash
   cd SafeRoute-Live
   npm run build
   ```
4. Deploy both backend and frontend

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

