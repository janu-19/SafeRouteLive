# Live Location Sharing Setup Guide

## Overview
The live location sharing feature allows users to share their real-time location with friends through room-based tracking using Socket.IO.

## Architecture

### Backend (Socket.IO Server)
- **Port**: 3001 (default)
- **Room Management**: In-memory storage (Map-based)
- **Events**:
  - `join-room`: User joins a tracking room
  - `location-update`: Broadcast location updates
  - `leave-room`: User leaves a room
  - `user-joined`: Notify others when someone joins
  - `user-left`: Notify others when someone leaves
  - `room-users`: Send list of users in room

### Frontend Components

1. **Share.jsx**: Page to create and share tracking links
2. **LiveTracking.jsx**: Main tracking page that displays real-time locations
3. **MapView.jsx**: Mapbox map component
4. **LiveLocationMarker.jsx**: User's own location marker
5. **FriendMarker.jsx**: Friends' location markers
6. **Controls.jsx**: Floating action buttons (Recenter, Share, SOS)

## Setup Instructions

### 1. Install Backend Dependencies

```bash
cd server
npm install
```

This will install:
- `express` - Web server
- `cors` - CORS middleware
- `socket.io` - Real-time communication server

### 2. Install Frontend Dependencies

```bash
cd SafeRoute-Live
npm install
```

Frontend already has `socket.io-client` installed.

### 3. Configure Environment Variables

**Backend (.env in server folder):**
```env
PORT=3001
FRONTEND_URL=http://localhost:5173
```

**Frontend (.env in SafeRoute-Live folder):**
```env
VITE_MAPBOX_TOKEN=your_mapbox_token_here
VITE_API_BASE_URL=http://localhost:3001
```

### 4. Start the Servers

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

You should see:
```
🚀 Server running on http://localhost:3001
📡 API endpoints available at /api/*
🔌 Socket.IO server ready for connections
```

**Terminal 2 - Frontend:**
```bash
cd SafeRoute-Live
npm run dev
```

### 5. Test the Feature

1. **Create a Share Link:**
   - Navigate to `/share` in your browser
   - A unique room ID is generated
   - Copy the shareable link

2. **Start Tracking:**
   - Click "Start Tracking" on the Share page
   - Or navigate to `/track/{roomId}`
   - Grant geolocation permission when prompted

3. **Share with Friends:**
   - Send the link to a friend
   - They can open the same link in their browser
   - Both locations will be visible on the map in real-time

## How It Works

1. **User creates a share link:**
   - Generates a unique room ID (6-character alphanumeric)
   - Link format: `http://localhost:5173/track/{roomId}`

2. **User starts tracking:**
   - Requests geolocation permission
   - Connects to Socket.IO server
   - Joins the room with initial location
   - Starts watching position updates

3. **Location updates:**
   - Browser geolocation API watches position
   - Updates are sent to server every few seconds
   - Server broadcasts to all users in the room

4. **Friends join:**
   - Friend opens the same link
   - Connects to Socket.IO server
   - Joins the same room
   - Receives current users' locations
   - Starts sending their own location updates

5. **Real-time sync:**
   - All users in the room receive location updates
   - Map markers update in real-time
   - User count displayed in status bar

## Features

- ✅ Real-time location tracking
- ✅ Multiple users in same room
- ✅ Automatic reconnection on disconnect
- ✅ Room-based isolation (different room IDs = different groups)
- ✅ Visual markers for each user
- ✅ Connection status indicator
- ✅ Recenter map to user location
- ✅ Share link functionality
- ✅ Clean room cleanup on disconnect

## Troubleshooting

### Socket not connecting
- Verify backend server is running on port 3001
- Check browser console for connection errors
- Ensure `VITE_API_BASE_URL` matches backend URL
- Check CORS settings in backend

### Location not updating
- Ensure geolocation permission is granted
- Check browser console for geolocation errors
- Verify location services are enabled on device
- Try different browser or device

### Markers not appearing
- Check Mapbox token is set correctly
- Verify map is loaded before adding markers
- Check browser console for errors
- Ensure location data is valid (lat/lng numbers)

### Users not seeing each other
- Verify both users are in the same room (same roomId in URL)
- Check Socket.IO connection status in status bar
- Check browser console for socket events
- Verify backend is receiving and broadcasting events

## Socket.IO Events

### Client → Server
- `join-room`: `{ roomId, userId, location }`
- `location-update`: `{ roomId, userId, location }`
- `leave-room`: `{ roomId, userId }`

### Server → Client
- `user-joined`: `{ userId, location, timestamp }`
- `location-update`: `{ userId, location, timestamp }`
- `user-left`: `{ userId, timestamp }`
- `room-users`: `{ roomId, users: [{ userId, location }] }`

## Room Management

Rooms are stored in memory on the server:
- Each room is a Map of userId → user data
- Empty rooms are automatically cleaned up
- Rooms persist until all users leave

## Security Notes

- Room IDs are randomly generated (not secure for sensitive use)
- No authentication required (add in production)
- Location data is not persisted
- Consider adding rate limiting for production

