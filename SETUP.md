# Quick Setup Guide

## Step 1: Install Backend Dependencies

```bash
cd server
npm install
```

This will install:
- `express` - Web server framework
- `cors` - Cross-origin resource sharing

## Step 2: Install Frontend Dependencies

```bash
cd SafeRoute-Live
npm install
```

This will install all React dependencies including:
- `react`, `react-dom`
- `mapbox-gl`
- `socket.io-client`
- And other frontend dependencies

## Step 3: Configure Environment Variables

### Backend (.env in server folder)

Create `server/.env`:
```env
PORT=3001
MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
TOMTOM_API_KEY=your_tomtom_key_here
```

**Note:** The application works with mock data even without real API keys!

### Frontend (.env in SafeRoute-Live folder)

Create `SafeRoute-Live/.env`:
```env
VITE_MAPBOX_TOKEN=your_mapbox_token_here
VITE_API_BASE_URL=http://localhost:3001
```

**To get Mapbox token:**
1. Go to https://account.mapbox.com/
2. Sign up or log in
3. Navigate to Access Tokens
4. Copy your default public token or create a new one
5. Paste it in your `.env` file

## Step 4: Start the Application

### Terminal 1 - Backend Server
```bash
cd server
npm run dev
```

You should see:
```
🚀 Server running on http://localhost:3001
📡 API endpoints available at /api/*
```

### Terminal 2 - Frontend Application
```bash
cd SafeRoute-Live
npm run dev
```

You should see:
```
VITE v5.x.x ready in xxx ms
➜ Local: http://localhost:5173/
```

## Step 5: Access the Application

Open your browser and navigate to:
- **Frontend:** http://localhost:5173
- **Route Planner:** http://localhost:5173/route-planner

## Testing the Safe Routes Feature

1. Go to the Route Planner page
2. Enter a source location (e.g., "MG Road, Bengaluru")
3. Enter a destination location (e.g., "Indiranagar, Bengaluru")
4. Select a safety preference:
   - **Well-lit**: Prioritizes routes with good street lighting
   - **Crowded**: Prioritizes routes with high population density
   - **Fastest**: Prioritizes speed while considering safety
5. Click "Find Safe Routes"
6. View multiple route options with color-coded safety scores:
   - 🟢 Green: Safety Score > 75 (Safe)
   - 🟡 Yellow: Safety Score 50-75 (Moderate)
   - 🔴 Red: Safety Score < 50 (Risky)

## Floating Action Buttons

- **🔴 SOS**: Click to send an emergency alert
- **🟢 Recalculate**: Refresh routes with latest safety data
- **🔵 Share Live**: Share your live location

## Real-Time Updates

The application automatically refreshes safety data every 10 seconds:
- Accident markers update on the map
- Route safety scores recalculate
- Traffic congestion data refreshes

## Troubleshooting

### Backend won't start
- Make sure port 3001 is not in use
- Check that `npm install` completed successfully in the `server` folder

### Frontend won't connect to backend
- Verify backend is running on http://localhost:3001
- Check `VITE_API_BASE_URL` in your `.env` file
- Ensure CORS is enabled (it should be by default)

### Map not displaying
- Verify your Mapbox token is correct
- Check browser console for errors
- Ensure `VITE_MAPBOX_TOKEN` is set in `.env`

### No routes found
- Check that both source and destination are entered
- Verify backend server is running
- Check browser console and network tab for errors

## Next Steps

See `README.md` for:
- API endpoint documentation
- Safety score calculation details
- Instructions for integrating real APIs
- Production deployment guide

