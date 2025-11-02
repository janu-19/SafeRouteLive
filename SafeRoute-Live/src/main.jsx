import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import 'mapbox-gl/dist/mapbox-gl.css';

// Suppress Mapbox telemetry errors and internal warnings globally
// These errors occur when ad blockers block Mapbox analytics requests
// They are harmless and don't affect map functionality
(function() {
  // Intercept console.error to filter Mapbox telemetry errors and internal warnings
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const message = args[0]?.toString() || '';
    const errorMessage = args[0]?.message?.toString() || '';
    const errorStr = args.join(' ');
    
    // Ignore Mapbox telemetry/analytics errors and missing image warnings
    if (message.includes('events.mapbox.com') || 
        message.includes('ERR_BLOCKED_BY_CLIENT') ||
        message.includes('ERR_NETWORK_CHANGED') ||
        message.includes('map-sessions') ||
        (message.includes('could not be loaded') && message.includes('addImage')) ||
        message.includes('styleimagemissing') ||
        errorMessage.includes('events.mapbox.com') ||
        errorMessage.includes('ERR_BLOCKED_BY_CLIENT') ||
        errorMessage.includes('ERR_NETWORK_CHANGED') ||
        errorMessage.includes('map-sessions') ||
        (typeof args[0] === 'object' && args[0]?.message?.includes('events.mapbox.com'))) {
      return; // Silently ignore
    }
    
    // Ignore Mapbox expression evaluation warnings (internal style warnings)
    if ((errorStr.includes('Failed to evaluate expression') || 
         errorStr.includes('evaluate expression')) && 
        (errorStr.includes('evaluated to null') || 
         errorStr.includes('was expected to be of type')) &&
        (errorStr.includes('["get","layer"]') || 
         errorStr.includes('bridge') ||
         errorStr.includes('structure') ||
         errorStr.includes('motorway'))) {
      return; // Silently ignore
    }
    
    // Filter out unhelpful geolocation errors
    if ((errorStr.includes('Error getting location') || 
         errorStr.includes('Error getting initial location') ||
         errorStr.includes('GeolocationError') ||
         errorStr.includes('Geolocation error')) &&
        (errorStr.includes(': Object') || 
         errorStr.includes('User denied Geolocation') ||
         errorStr.includes('Permission denied') ||
         errorStr.includes('Position unavailable') ||
         errorStr.includes('timeout'))) {
      // These are expected geolocation errors - suppress them
      // The UI handles these gracefully with user-friendly messages
      return; // Silently ignore
    }
    
    // Suppress expected authentication errors when user is not logged in
    // These are informational, not actual bugs - features just require authentication
    if (errorStr.includes('Authentication required') || 
        errorStr.includes('401 (Unauthorized)') ||
        errorStr.includes('401') ||
        errorStr.includes('token required') ||
        errorStr.includes('Share features disabled') ||
        errorStr.includes('Please login') ||
        errorStr.includes('Unauthorized')) {
      // Check if it's related to friends/share features
      if (errorStr.includes('friends') || 
          errorStr.includes('share') || 
          errorStr.includes('Share.jsx') ||
          errorStr.includes('ContactList.jsx') ||
          errorStr.includes('FriendList.jsx') ||
          errorStr.includes('DirectShare.jsx') ||
          errorStr.includes('friendService') ||
          errorStr.includes('shareService') ||
          errorStr.includes('/api/friends') ||
          errorStr.includes('Search error') ||
          errorStr.includes('Error loading') ||
          errorStr.includes('Error loading requests') ||
          errorStr.includes('Error loading friends')) {
        // These are expected when user is not authenticated - suppress them
        return; // Silently ignore
      }
    }
    
    // Suppress connection errors when server is not running (expected during development)
    if ((errorStr.includes('ERR_CONNECTION_REFUSED') ||
         errorStr.includes('Failed to fetch') ||
         errorStr.includes('WebSocket connection') ||
         errorStr.includes('websocket error') ||
         errorStr.includes('Socket connection error')) &&
        (errorStr.includes('localhost:3001') ||
         errorStr.includes('socket.io') ||
         errorStr.includes('/api/friends') ||
         errorStr.includes('/api/'))) {
      // Server is not running - these errors are expected, suppress them
      return; // Silently ignore
    }
    
    // Suppress network errors for authentication endpoints
    // These are handled by the UI and show user-friendly messages, so console errors are noise
    if ((errorStr.includes('Failed to load resource') || 
         errorStr.includes('POST') || 
         errorStr.includes('GET') ||
         errorStr.includes('http://localhost:3001') ||
         errorStr.includes('/api/auth')) &&
        (errorStr.includes('401') || 
         errorStr.includes('Unauthorized') ||
         errorStr.includes('400') ||
         errorStr.includes('Bad Request')) &&
        (errorStr.includes('/api/friends') ||
         errorStr.includes('/api/friends/') ||
         errorStr.includes('/api/auth/login') ||
         errorStr.includes('/api/auth/register') ||
         errorStr.includes('register') ||
         errorStr.includes('login') ||
         errorStr.includes('friends'))) {
      // Suppress auth errors - UI handles showing user-friendly messages
      return; // Silently ignore
    }
    
    // Suppress browser-generated network error logs for auth endpoints
    // These appear as console errors with URLs and status codes
    if (errorStr.includes('POST http://localhost:3001/api/auth') &&
        (errorStr.includes('400') || errorStr.includes('401'))) {
      return; // Silently ignore - UI shows user-friendly error messages
    }
    
    originalConsoleError.apply(console, args);
  };
  
  // Intercept console.warn to filter Mapbox internal warnings
  const originalConsoleWarn = console.warn;
  console.warn = function(...args) {
    const warnStr = args.join(' ');
    
    // Filter out Mapbox image loading warnings
    if ((warnStr.includes('Image') && 
         (warnStr.includes('could not be loaded') || 
          warnStr.includes('Please make sure you have added the image')) &&
         (warnStr.includes('in-state') || 
          warnStr.includes('directions') || 
          warnStr.includes('mapbox'))) ||
        // Filter style diff warnings
        (warnStr.includes('Unable to perform style diff') && 
         (warnStr.includes('setSprite') || 
          warnStr.includes('Rebuilding'))) ||
        // Filter any Mapbox style-related warnings
        (warnStr.includes('style') && 
         warnStr.includes('mapbox') && 
         (warnStr.includes('diff') || warnStr.includes('setSprite')))) {
      return; // Silently ignore
    }
    
    originalConsoleWarn.apply(console, args);
  };

  // Intercept fetch requests to prevent Mapbox telemetry requests and suppress auth error logs
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0]?.toString() || '';
    // Block Mapbox telemetry requests (they're harmless analytics)
    if (url.includes('events.mapbox.com')) {
      // Return a fake successful response to prevent errors
      return Promise.resolve(new Response(JSON.stringify({}), {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    
    // Wrap the fetch to suppress auth error logging
    return originalFetch.apply(window, args).then((response) => {
      // Suppress browser logging for auth endpoint errors (400, 401) - UI handles these
      const isAuthEndpoint = url.includes('/api/auth/login') || url.includes('/api/auth/register');
      if (isAuthEndpoint && (response.status === 400 || response.status === 401)) {
        // Return response silently - don't let browser log it
        // The response is still returned so the code can handle it, but without console noise
        return response;
      }
      return response;
    }).catch((error) => {
      // Silently ignore network errors for Mapbox telemetry
      const errorMsg = error?.message?.toString() || '';
      const errorStr = error?.toString() || '';
      if (errorMsg.includes('events.mapbox.com') || 
          errorMsg.includes('ERR_BLOCKED_BY_CLIENT') ||
          errorMsg.includes('ERR_NETWORK_CHANGED') ||
          errorMsg.includes('map-sessions') ||
          errorStr.includes('events.mapbox.com') ||
          errorStr.includes('map-sessions')) {
        // Return empty response to prevent error bubbling
        return new Response(JSON.stringify({}), {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Type': 'application/json' }
        });
      }
      throw error;
    });
  };

  // Intercept XMLHttpRequest for Mapbox telemetry (Mapbox uses this for telemetry)
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._mapboxUrl = url;
    return originalXHROpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    // Block Mapbox telemetry requests before they're sent
    if (typeof this._mapboxUrl === 'string' && this._mapboxUrl.includes('events.mapbox.com')) {
      // Set up fake successful response
      Object.defineProperty(this, 'status', { value: 200, writable: false });
      Object.defineProperty(this, 'statusText', { value: 'OK', writable: false });
      Object.defineProperty(this, 'readyState', { value: 4, writable: false });
      this.responseText = '{}';
      this.response = '{}';
      
      // Trigger onload handler if present (Mapbox might be checking for this)
      setTimeout(() => {
        if (this.onload) {
          try {
            this.onload();
          } catch (e) {
            // Ignore errors
          }
        }
        if (this.onreadystatechange) {
          try {
            this.onreadystatechange();
          } catch (e) {
            // Ignore errors
          }
        }
      }, 0);
      
      // Prevent actual request
      return;
    }
    return originalXHRSend.apply(this, args);
  };
})();

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
    <App />
  </BrowserRouter>
);


