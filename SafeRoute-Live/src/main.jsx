import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import 'mapbox-gl/dist/mapbox-gl.css';

// Suppress Mapbox telemetry errors globally
// These errors occur when ad blockers block Mapbox analytics requests
// They are harmless and don't affect map functionality
(function() {
  // Intercept console.error to filter Mapbox telemetry errors and missing images
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const message = args[0]?.toString() || '';
    const errorMessage = args[0]?.message?.toString() || '';
    // Ignore Mapbox telemetry/analytics errors and missing image warnings
    if (message.includes('events.mapbox.com') || 
        message.includes('ERR_BLOCKED_BY_CLIENT') ||
        (message.includes('could not be loaded') && message.includes('addImage')) ||
        message.includes('styleimagemissing') ||
        errorMessage.includes('events.mapbox.com') ||
        errorMessage.includes('ERR_BLOCKED_BY_CLIENT') ||
        (typeof args[0] === 'object' && args[0]?.message?.includes('events.mapbox.com'))) {
      return; // Silently ignore
    }
    originalConsoleError.apply(console, args);
  };

  // Intercept fetch requests to prevent Mapbox telemetry requests
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
    return originalFetch.apply(window, args).catch((error) => {
      // Silently ignore network errors for Mapbox telemetry
      const errorMsg = error?.message?.toString() || '';
      if (errorMsg.includes('events.mapbox.com') || 
          errorMsg.includes('ERR_BLOCKED_BY_CLIENT') ||
          error?.toString().includes('events.mapbox.com')) {
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
  <BrowserRouter>
    <App />
  </BrowserRouter>
);


