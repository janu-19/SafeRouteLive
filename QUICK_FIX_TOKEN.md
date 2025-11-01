# Quick Fix: Set Token in Browser

## Copy & Paste This in Browser Console (F12):

```javascript
localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTA2MmU3YzYzYWRhYTc2ZmNhMDdkYmEiLCJlbWFpbCI6ImFsaWNlQGV4YW1wbGUuY29tIiwibmFtZSI6IkFsaWNlIEpvaG5zb24iLCJpYXQiOjE3NjIwMTI5NzcsImV4cCI6MTc2NDYwNDk3N30.NRHx0dmTXwt8-fL0a2Q8I1L7YyQXw37zU5N3SWf_tKY')
```

Then:
1. Press Enter
2. Refresh the page (F5)
3. Check console - should see "✅ Socket connected"

## Verify Token is Set:

```javascript
console.log('Token:', localStorage.getItem('token'))
```

## If Still Not Working:

1. **Check server terminal** - look for JWT verification errors
2. **Restart server** after setting .env file
3. **Verify .env has:** `JWT_SECRET=your-secret-key-change-in-production-use-a-long-random-string-here`

