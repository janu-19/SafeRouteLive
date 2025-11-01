# Quick Start Guide

## 🚨 IMPORTANT: You Need TWO Terminal Windows

The application requires **both** the backend server and frontend to be running simultaneously.

### Step 1: Start Backend Server

Open **Terminal 1** (or PowerShell 1):

```bash
cd server
npm install
npm run dev
```

You should see:
```
🚀 Server running on http://localhost:3001
📡 API endpoints available at /api/*
🔌 Socket.IO server ready for connections
```

**Keep this terminal open!** The server must keep running.

### Step 2: Start Frontend

Open **Terminal 2** (or PowerShell 2):

```bash
cd SafeRoute-Live
npm install
npm run dev
```

You should see:
```
VITE v5.x.x ready in xxx ms
➜ Local: http://localhost:5173/
```

### Step 3: Access Application

Open your browser and go to:
- **http://localhost:5173**

## Troubleshooting Connection Errors

### Error: `ERR_CONNECTION_REFUSED`

**Cause**: Backend server is not running.

**Solution**:
1. Go to Terminal 1
2. Make sure you're in the `server` directory
3. Run: `npm run dev`
4. Wait for the "Server running" message
5. Refresh your browser

### Error: `Failed to fetch`

**Cause**: Backend server not accessible.

**Solutions**:
1. **Check server is running**: Look for "Server running on http://localhost:3001" message
2. **Check port 3001 is free**: Close any other applications using port 3001
3. **Verify VITE_API_BASE_URL**: In `SafeRoute-Live/.env`, ensure it's set to `http://localhost:3001`
4. **Check firewall**: Windows firewall might be blocking the connection

### Socket.IO Connection Errors

**Cause**: Backend Socket.IO server not running.

**Solution**: 
- Make sure the backend server is running (Step 1)
- The Socket.IO server starts automatically when the backend starts

## Verify Everything is Working

1. **Backend running**: Check Terminal 1 for "🚀 Server running" message
2. **Frontend running**: Check Terminal 2 for "VITE ready" message
3. **Test API**: Open http://localhost:3001/api/getAccidents in browser
4. **Test app**: Open http://localhost:5173 in browser

## Windows PowerShell Commands

If using PowerShell, use `;` instead of `&&`:

```powershell
# Bad (doesn't work in PowerShell):
cd server && npm install

# Good (works in PowerShell):
cd server; npm install
```

## Common Issues

### Port Already in Use

If port 3001 is already in use:
1. Find the process: `netstat -ano | findstr :3001`
2. Kill the process: `taskkill /PID <PID> /F`
3. Or change port in `server/index.js` (update `PORT`)

### Module Not Found

If you see "Cannot find module" errors:
1. Make sure you ran `npm install` in both directories
2. Check that `node_modules` folder exists
3. Try deleting `node_modules` and `package-lock.json`, then run `npm install` again

### CORS Errors

If you see CORS errors:
1. Check `FRONTEND_URL` in `server/.env` (or `server/index.js`)
2. Ensure it matches your frontend URL (usually `http://localhost:5173`)

