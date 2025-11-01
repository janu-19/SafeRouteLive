# Quick Setup Guide - Direct Location Sharing

## Step 1: Set JWT Token in Browser

Open your browser console (F12) and paste ONE of these commands:

### For Alice:
```javascript
localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTA2MmU3YzYzYWRhYTc2ZmNhMDdkYmEiLCJlbWFpbCI6ImFsaWNlQGV4YW1wbGUuY29tIiwibmFtZSI6IkFsaWNlIEpvaG5zb24iLCJpYXQiOjE3NjIwMTI5NzcsImV4cCI6MTc2NDYwNDk3N30.NRHx0dmTXwt8-fL0a2Q8I1L7YyQXw37zU5N3SWf_tKY')
```

### For Bob:
```javascript
localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTA2MmU3ZDYzYWRhYTc2ZmNhMDdkYmQiLCJlbWFpbCI6ImJvYkBleGFtcGxlLmNvbSIsIm5hbWUiOiJCb2IgU21pdGgiLCJpYXQiOjE3NjIwMTI5NzcsImV4cCI6MTc2NDYwNDk3N30.6cpBVxiCd9yKVPFCKhGix5a592MGL-fetUb34WSOCRQ')
```

### For Charlie:
```javascript
localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTA2MmU3ZDYzYWRhYTc2ZmNhMDdkYzAiLCJlbWFpbCI6ImNoYXJsaWVAZXhhbXBsZS5jb20iLCJuYW1lIjoiQ2hhcmxpZSBCcm93biIsImlhdCI6MTc2MjAxMjk3NywiZXhwIjoxNzY0NjA0OTc3fQ.b6mspvEPriGZddnC4YxmxXznMBb4HC4suVSC7vNLiv8')
```

## Step 2: Refresh the Page

Press `F5` or `Ctrl+R` to refresh the page.

## Step 3: Test Direct Sharing

1. Go to `/share` page
2. In the "Share Location Directly" section:
   - Type a friend's name: "Alice", "Bob", or "Charlie"
   - Or type their email: "alice@example.com"
   - Or type their phone: "+1234567890"
3. Select from search results
4. Click "Share Now" - sharing starts instantly!

## Troubleshooting

**If you still get 401 errors:**
1. Check token is set: `localStorage.getItem('token')`
2. Restart the server to ensure it's using the correct JWT_SECRET
3. Regenerate tokens by running: `cd SafeRouteLive-main\SafeRouteLive-main\server && node src/scripts/getTokens.js`

## How It Works

- **No approval needed** - Sharing starts immediately
- **Search by name/email/phone** - Find friends instantly  
- **Real-time location** - Both users see each other's live location
- **Secure** - JWT authentication ensures only authorized users

