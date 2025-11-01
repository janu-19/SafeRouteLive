# Share Feature Testing & QA Guide

## Quick Start Test Script

### Prerequisites
1. MongoDB running
2. Backend server running: `cd server && npm run dev`
3. Frontend running: `cd SafeRoute-Live && npm run dev`
4. Demo users seeded: `cd server && npm run seed`

### Step 1: Get User Tokens

After running the seed script, you'll see output like:
```
📋 Demo Users Created:
1. Alice Johnson
   Email: alice@example.com
   JWT Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Copy the tokens for two different users (e.g., Alice and Bob).

### Step 2: Setup Browser Windows

**Window 1 (User A - Alice):**
1. Open browser dev tools (F12)
2. Go to Console tab
3. Run: `localStorage.setItem('token', '<alice_token>')`
4. Navigate to `http://localhost:5173/share`

**Window 2 (User B - Bob):**
1. Open browser dev tools (F12)
2. Go to Console tab
3. Run: `localStorage.setItem('token', '<bob_token>')`
4. Navigate to `http://localhost:5173/share`

### Step 3: Send Request

**Window 1 (User A):**
1. Find "Bob Smith" in the contact list
2. Click "Request Location" button
3. Button should change to "Pending" status

### Step 4: Receive and Approve Request

**Window 2 (User B):**
1. Should see a notification toast with "Alice Johnson wants to share their live location"
2. Click "Approve" button
3. Should automatically navigate to `/share/track/:sessionId`

**Window 1 (User A):**
1. Should automatically navigate to `/share/track/:sessionId` after approval
2. Map should display both users' locations

### Step 5: Verify Location Sharing

**Both Windows:**
1. Map should show both users' locations
2. Locations should update in real-time as users move (if testing on mobile or with location simulation)
3. Status bar should show "Sharing" badge
4. Status bar should show "2 users"

### Step 6: End Session

**Either Window:**
1. Click "End Sharing" button
2. Both windows should navigate back to `/share` page
3. Session should be removed from active sessions list

## QA Checklist

### ✅ Send Request Flow
- [ ] User A can see contact list
- [ ] User A can click "Request Location" on a contact
- [ ] Request status shows "Pending" after sending
- [ ] Server creates ShareRequest with status 'pending'
- [ ] Server emits `share:request` socket event to User B

### ✅ Receive Request Flow
- [ ] User B receives `share:request` socket event
- [ ] ShareRequestToast component appears
- [ ] Toast shows correct requester name
- [ ] Toast has Approve and Reject buttons

### ✅ Approve Request Flow
- [ ] User B can click "Approve" button
- [ ] Server updates ShareRequest status to 'approved'
- [ ] Server creates SharedSession
- [ ] Server emits `share:approved` to both users
- [ ] Both users navigate to tracking page
- [ ] Both users join share room via `share:join`

### ✅ Location Sharing Flow
- [ ] Both users' locations appear on map
- [ ] Location updates are emitted via `location:update` (rate-limited to 1/sec)
- [ ] Peer locations are received via `location:peerUpdate`
- [ ] Map markers update in real-time
- [ ] Markers show peer names ("Live from Alice")

### ✅ End Session Flow
- [ ] Either user can click "End Sharing"
- [ ] Session is revoked via HTTP API
- [ ] `share:end` event is broadcasted to room
- [ ] Both users are disconnected
- [ ] Both users navigate back to `/share`

### ✅ Security Tests
- [ ] Unauthenticated requests are rejected (401)
- [ ] User cannot join session they're not a participant in
- [ ] User cannot approve requests sent to someone else
- [ ] Location updates are rate-limited (1 per second)
- [ ] Socket requires JWT token for share events

### ✅ Expiry Tests
- [ ] Sessions expire after `SHARE_SESSION_TTL_MINUTES` (default: 30)
- [ ] Expired sessions emit `share:expired` event
- [ ] MongoDB TTL index deletes expired sessions

### ✅ Revoke Tests
- [ ] Requester can revoke pending requests
- [ ] Either participant can revoke active session
- [ ] Revoked sessions are marked inactive
- [ ] Revoked sessions broadcast `share:end` event

## Postman Collection

### Create Request
```
POST http://localhost:3001/api/share/request
Headers:
  Authorization: Bearer <alice_token>
Body (JSON):
  {
    "toUserId": "<bob_user_id>"
  }
```

### Get Requests
```
GET http://localhost:3001/api/share/requests
Headers:
  Authorization: Bearer <bob_token>
```

### Approve Request
```
POST http://localhost:3001/api/share/requests/<requestId>/approve
Headers:
  Authorization: Bearer <bob_token>
Body (JSON):
  {
    "approve": true
  }
```

### Revoke Session
```
POST http://localhost:3001/api/share/session/<sessionId>/revoke
Headers:
  Authorization: Bearer <user_token>
```

## Expected Results

### Successful Flow
1. ✅ Request created successfully
2. ✅ Socket event received on target user
3. ✅ Approval creates session
4. ✅ Both users join room
5. ✅ Location updates flow between users
6. ✅ Map displays both locations
7. ✅ Session ends cleanly

### Error Cases
- ❌ Invalid token → 401 Unauthorized
- ❌ Non-existent user → 404 Not Found
- ❌ Not a participant → 403 Forbidden
- ❌ Rate limit exceeded → `share:rateLimited` event
- ❌ Session expired → `share:expired` event

## Troubleshooting

**Socket not connecting:**
- Check JWT token in localStorage
- Verify backend is running on port 3001
- Check browser console for errors
- Verify CORS settings

**Location not updating:**
- Check geolocation permissions in browser
- Verify `watchPosition` is working
- Check rate limiting (should be max 1/sec)
- Verify socket is connected and authenticated

**Requests not appearing:**
- Check socket connection status
- Verify `share:request` event listener is registered
- Check MongoDB for ShareRequest documents
- Verify user IDs match between users

**Map not showing:**
- Check Mapbox token in `.env`
- Verify map container is rendered
- Check map initialization in console
- Verify coordinates are valid numbers

## Performance Checks

- ✅ Rate limiting works (max 1 update/second)
- ✅ Socket reconnection works
- ✅ Multiple concurrent sessions work
- ✅ Session cleanup on disconnect
- ✅ TTL expiry works correctly

## Notes

- Demo users use hardcoded IDs from seed script
- In production, contacts would come from backend API
- Mapbox token required for map visualization
- MongoDB must be running for full functionality
- JWT tokens expire after 30 days (seed script)

