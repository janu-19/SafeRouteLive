# Secure Contact-Initiated Live Location Sharing Feature

## Overview

This document describes the secure two-way live location sharing feature added to the SafeRoute project. The feature allows users to request location sharing from contacts, receive approval/rejection, and then share live locations in real-time via Socket.IO with authentication and rate limiting.

## Architecture

### Backend Stack
- **Node.js** with Express
- **MongoDB** with Mongoose
- **Socket.IO** for real-time communication
- **JWT** for authentication
- **bcryptjs** for password hashing

### Frontend Stack
- **React** with Vite
- **Socket.io-client** for real-time connections
- **Mapbox GL** for map visualization
- **React Router** for navigation

## Setup Instructions

### Prerequisites
1. Node.js 18+ installed
2. MongoDB running locally or connection string
3. JWT_SECRET environment variable set

### Backend Setup

1. **Install dependencies:**
```bash
cd server
npm install
```

2. **Create `.env` file in `server/` directory:**
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/saferoute
JWT_SECRET=your-secret-key-change-in-production
SHARE_SESSION_TTL_MINUTES=30
FRONTEND_URL=http://localhost:5173
```

3. **Seed demo users:**
```bash
npm run seed
```

This creates three demo users:
- Alice Johnson (alice@example.com)
- Bob Smith (bob@example.com)
- Charlie Brown (charlie@example.com)

All passwords: `password123`

4. **Start the server:**
```bash
npm run dev
```

### Frontend Setup

1. **Install dependencies:**
```bash
cd SafeRoute-Live
npm install
```

2. **Create `.env` file in `SafeRoute-Live/` directory:**
```env
VITE_API_BASE_URL=http://localhost:3001
VITE_MAPBOX_TOKEN=your_mapbox_token
```

3. **Start the frontend:**
```bash
npm run dev
```

## API Endpoints

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### POST /api/share/request
Create a location sharing request.

**Body:**
```json
{
  "toUserId": "userId"
}
```

**Response:**
```json
{
  "success": true,
  "requestId": "request_id",
  "status": "pending",
  "from": { "id": "...", "name": "..." },
  "to": { "id": "...", "name": "..." }
}
```

### GET /api/share/requests
Get all share requests (inbound and outbound).

**Response:**
```json
{
  "success": true,
  "inbound": [...],
  "outbound": [...]
}
```

### POST /api/share/requests/:requestId/approve
Approve or reject a share request.

**Body:**
```json
{
  "approve": true
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "session_id",
  "expiresAt": "2024-01-01T12:00:00Z",
  "participants": [...]
}
```

### POST /api/share/requests/:requestId/revoke
Revoke a pending request.

### POST /api/share/session/:sessionId/revoke
Revoke an active sharing session.

### GET /api/share/sessions
Get active sessions for the logged-in user.

## Socket.IO Events

### Client to Server

#### share:join
Join a share room after approval.
```javascript
socket.emit('share:join', { sessionId: 'session_id' });
```

#### location:update
Emit location updates (rate-limited to 1 per second).
```javascript
socket.emit('location:update', {
  sessionId: 'session_id',
  lat: 12.9716,
  lng: 77.5946,
  timestamp: Date.now()
});
```

#### share:end
End a sharing session.
```javascript
socket.emit('share:end', { sessionId: 'session_id' });
```

### Server to Client

#### share:request
Incoming share request notification.
```javascript
socket.on('share:request', (data) => {
  // data.requestId, data.from, data.createdAt
});
```

#### share:approved
Request approved notification.
```javascript
socket.on('share:approved', (data) => {
  // data.sessionId, data.participants, data.expiresAt
});
```

#### share:joined
Successfully joined share room.
```javascript
socket.on('share:joined', (data) => {
  // data.sessionId, data.roomId
});
```

#### location:peerUpdate
Location update from peer.
```javascript
socket.on('location:peerUpdate', (data) => {
  // data.fromUserId, data.fromUserName, data.lat, data.lng, data.timestamp
});
```

#### share:end
Session ended notification.
```javascript
socket.on('share:end', (data) => {
  // data.sessionId, data.endedBy, data.endedAt
});
```

#### share:expired
Session expired notification.
```javascript
socket.on('share:expired', (data) => {
  // data.sessionId, data.expiresAt
});
```

#### share:error
Error notification.
```javascript
socket.on('share:error', (data) => {
  // data.message
});
```

## Usage Flow

### 1. Send Request
1. User A navigates to `/share` page
2. User A clicks "Request Location" on a contact (User B)
3. Request is sent via `POST /api/share/request`
4. Server emits `share:request` to User B

### 2. Receive and Approve Request
1. User B receives `share:request` socket event
2. User B sees `ShareRequestToast` component
3. User B clicks "Approve"
4. Request is approved via `POST /api/share/requests/:id/approve`
5. Server creates `SharedSession` and emits `share:approved` to both users
6. Both users automatically navigate to `/share/track/:sessionId`

### 3. Start Sharing
1. Both users join share room via `share:join`
2. Both users start geolocation watch
3. Location updates are emitted via `location:update` (rate-limited)
4. Each user receives peer locations via `location:peerUpdate`
5. Map displays both users' locations in real-time

### 4. End Sharing
1. Either user can click "End Sharing" button
2. Session is revoked via `POST /api/share/session/:id/revoke`
3. `share:end` is broadcasted to room
4. Both users are disconnected and returned to `/share` page

## Security Features

1. **JWT Authentication**: All HTTP endpoints and Socket.IO connections require valid JWT tokens
2. **Room Isolation**: Each share session uses a unique room (`share_<sessionId>`)
3. **Participant Validation**: Server verifies users are participants before allowing room joins
4. **Rate Limiting**: Location updates are limited to 1 per second per socket
5. **Session Expiry**: Sessions automatically expire after `SHARE_SESSION_TTL_MINUTES` (default: 30 minutes)
6. **TTL Index**: MongoDB TTL index automatically deletes expired sessions

## File Structure

### Backend
```
server/
├── src/
│   ├── models/
│   │   ├── User.js
│   │   ├── ShareRequest.js
│   │   └── SharedSession.js
│   ├── middleware/
│   │   └── auth.js
│   ├── controllers/
│   │   └── shareController.js
│   ├── routes/
│   │   └── shareRoutes.js
│   ├── sockets/
│   │   └── liveTrackingSocket.js
│   └── scripts/
│       └── seed.js
└── index.js
```

### Frontend
```
SafeRoute-Live/src/
├── services/
│   └── shareService.js
├── context/
│   └── SocketContext.jsx
├── components/
│   ├── ContactList.jsx
│   ├── ShareRequestToast.jsx
│   └── FriendMarker.jsx (updated)
├── pages/
│   ├── Share.jsx (updated)
│   └── ShareTracking.jsx (new)
└── App.jsx (updated)
```

## Testing

### Manual Testing Steps

1. **Setup:**
   - Start MongoDB
   - Start backend: `cd server && npm run dev`
   - Start frontend: `cd SafeRoute-Live && npm run dev`
   - Seed users: `cd server && npm run seed`

2. **Get JWT Tokens:**
   - Run seed script to see user tokens
   - Or create tokens manually using JWT library

3. **Test Flow:**
   - Open two browser windows (User A and User B)
   - Set localStorage: `localStorage.setItem('token', '<userA_token>')` in window 1
   - Set localStorage: `localStorage.setItem('token', '<userB_token>')` in window 2
   - Navigate to `/share` in both windows
   - User A: Click "Request Location" on User B
   - User B: See notification, click "Approve"
   - Both should navigate to tracking page and see each other's locations

### Postman Collection Example

**Create Request:**
```
POST http://localhost:3001/api/share/request
Headers:
  Authorization: Bearer <token>
Body:
  {
    "toUserId": "user_id_here"
  }
```

**Approve Request:**
```
POST http://localhost:3001/api/share/requests/:requestId/approve
Headers:
  Authorization: Bearer <token>
Body:
  {
    "approve": true
  }
```

**Get Requests:**
```
GET http://localhost:3001/api/share/requests
Headers:
  Authorization: Bearer <token>
```

## Environment Variables

### Backend (.env)
- `PORT`: Server port (default: 3001)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT signing
- `SHARE_SESSION_TTL_MINUTES`: Session expiry time (default: 30)
- `FRONTEND_URL`: Frontend URL for CORS

### Frontend (.env)
- `VITE_API_BASE_URL`: Backend API URL
- `VITE_MAPBOX_TOKEN`: Mapbox access token

## Troubleshooting

1. **Socket connection fails:**
   - Check JWT token is valid and in localStorage
   - Verify backend is running
   - Check browser console for errors

2. **Location updates not working:**
   - Check geolocation permissions
   - Verify rate limiting isn't blocking updates
   - Check socket connection status

3. **Requests not appearing:**
   - Verify users exist in database
   - Check token corresponds to correct user
   - Verify socket is connected and authenticated

## Production Considerations

1. **HTTPS**: Use HTTPS in production for secure JWT token transmission
2. **JWT Secret**: Use a strong, randomly generated secret
3. **MongoDB**: Use MongoDB Atlas or secure database with authentication
4. **Rate Limiting**: Consider stricter rate limits for production
5. **Error Handling**: Implement comprehensive error logging
6. **Monitoring**: Add monitoring for socket connections and API usage

## License

This feature is part of the SafeRoute project.

