# Troubleshooting 401 Unauthorized Errors

## Quick Check:

1. **Open browser console (F12) and check if token exists:**
```javascript
localStorage.getItem('token')
```

2. **If no token or null, set it:**
```javascript
// For Alice
localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTA2MmU3YzYzYWRhYTc2ZmNhMDdkYmEiLCJlbWFpbCI6ImFsaWNlQGV4YW1wbGUuY29tIiwibmFtZSI6IkFsaWNlIEpvaG5zb24iLCJpYXQiOjE3NjIwMTI5NzcsImV4cCI6MTc2NDYwNDk3N30.NRHx0dmTXwt8-fL0a2Q8I1L7YyQXw37zU5N3SWf_tKY')
```

3. **Restart server to ensure JWT_SECRET is loaded:**
```bash
cd SafeRouteLive-main\SafeRouteLive-main\server
npm run dev
```

4. **Verify server console shows:**
```
🔍 MongoDB URI from env: Found
🔍 Will connect to: mongodb+srv://...
```

5. **Check server terminal for JWT errors** - it should show what went wrong with token verification

## Common Issues:

### Issue 1: Token not in localStorage
**Solution:** Set token using the command above

### Issue 2: JWT_SECRET mismatch
**Solution:** 
- Make sure `.env` file has `JWT_SECRET=your-secret-key-change-in-production-use-a-long-random-string-here`
- Regenerate tokens: `cd SafeRouteLive-main\SafeRouteLive-main\server && node src/scripts/getTokens.js`
- Use the NEW tokens

### Issue 3: Server not reading .env
**Solution:**
- Make sure `dotenv` is installed: `npm install dotenv`
- Check server/index.js has `import 'dotenv/config'` at the top
- Restart server after creating/editing .env

### Issue 4: Old token in browser
**Solution:**
- Clear localStorage: `localStorage.clear()`
- Set new token
- Refresh page

## Debug Steps:

1. Check token exists:
```javascript
console.log('Token:', localStorage.getItem('token'))
```

2. Check token format (should start with "eyJ"):
```javascript
const token = localStorage.getItem('token');
console.log('Token starts with eyJ:', token?.startsWith('eyJ'));
```

3. Check server logs for JWT verification errors

4. Verify .env file location: `SafeRouteLive-main\SafeRouteLive-main\server\.env`

