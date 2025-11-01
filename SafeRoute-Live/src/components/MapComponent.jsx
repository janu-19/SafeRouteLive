import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { io } from 'socket.io-client';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

export default function MapComponent({ routes = [], selectedRoute = null, accidents = [], userLocation = null, onMapReady = null }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeLayersRef = useRef(new Map());
  const routeSourcesRef = useRef(new Map());
  const heatSourceIdRef = useRef('heat-source');
  const heatLayerIdRef = useRef('heat-layer');
  const accidentsLayerRef = useRef('accidents-layer');
  const accidentsSourceRef = useRef('accidents-source');
  const userMarkerRef = useRef(null);
  const userPulseCircleRef = useRef(null);
  const hasCenteredRef = useRef(false);

  useEffect(() => {
    if (mapInstanceRef.current) return;

    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [77.5946, 12.9716],
      zoom: 12,
      // Disable Mapbox telemetry to prevent ERR_BLOCKED_BY_CLIENT errors
      collectResourceTiming: false
    });

    // Suppress Mapbox telemetry errors (harmless - just analytics being blocked by ad blockers)
    const originalError = console.error;
    const errorInterceptor = (...args) => {
      const message = args[0]?.toString() || '';
      // Ignore Mapbox telemetry/analytics errors that are blocked by ad blockers
      if (message.includes('events.mapbox.com') || 
          message.includes('ERR_BLOCKED_BY_CLIENT') ||
          (typeof args[0] === 'object' && args[0]?.message?.includes('events.mapbox.com'))) {
        return; // Silently ignore
      }
      originalError.apply(console, args);
    };
    console.error = errorInterceptor;

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('load', () => {
      console.log('🗺️ MapComponent: Map loaded event fired');
      // If userLocation is already available, create marker now
      if (userLocation) {
        console.log('🗺️ MapComponent: userLocation available on map load, will create marker');
      }
      // Placeholder heat source/layer
      if (!map.getSource(heatSourceIdRef.current)) {
        map.addSource(heatSourceIdRef.current, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        });
      }
      if (!map.getLayer(heatLayerIdRef.current)) {
        map.addLayer({
          id: heatLayerIdRef.current,
          type: 'heatmap',
          source: heatSourceIdRef.current,
          paint: {
            'heatmap-radius': 20,
            'heatmap-intensity': 0.6
          }
        });
      }

      // Accidents layer
      if (!map.getSource(accidentsSourceRef.current)) {
        map.addSource(accidentsSourceRef.current, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        });
      }
      if (!map.getLayer(accidentsLayerRef.current)) {
        map.addLayer({
          id: accidentsLayerRef.current,
          type: 'circle',
          source: accidentsSourceRef.current,
          paint: {
            'circle-radius': 8,
            'circle-color': '#ef4444',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });
      }
    });

    // Socket listeners - for live safety updates from Admin Panel
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    const socket = io(API_BASE_URL);
    
    socket.on('connect', () => {
      console.log('✅ MapComponent: Socket connected for live safety updates');
    });
    
    socket.on('safety-update', (payload) => {
      console.log('🎯 Safety update received:', payload);
      
      // Update heatmap when live event is triggered
      if (payload.type === 'live-event' && payload.event) {
        const event = payload.event;
        const heatSource = map.getSource(heatSourceIdRef.current);
        
        if (heatSource) {
          const currentData = heatSource._data || { type: 'FeatureCollection', features: [] };
          
          // Add new safety event point to heatmap
          const newFeature = {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [event.lng, event.lat]
            },
            properties: {
              intensity: Math.abs(event.severity) / 10 // Convert severity to heat intensity
            }
          };
          
          currentData.features.push(newFeature);
          
          // Update heatmap source - this creates the "wow" moment!
          heatSource.setData(currentData);
          
          // Also add a marker/popup for the event
          new mapboxgl.Popup({ closeOnClick: false })
            .setLngLat([event.lng, event.lat])
            .setHTML(`
              <div class="text-sm">
                <strong>${event.eventType.toUpperCase()}</strong><br/>
                Severity: ${event.severity}<br/>
                <small>Live event detected</small>
              </div>
            `)
            .addTo(map);
        }
        
        // Update accidents layer too
        const accidentsSource = map.getSource(accidentsSourceRef.current);
        if (accidentsSource) {
          const currentAccidents = accidentsSource._data || { type: 'FeatureCollection', features: [] };
          currentAccidents.features.push({
            type: 'Feature',
            properties: { severity: event.severity < -7 ? 'high' : event.severity < -4 ? 'medium' : 'low' },
            geometry: {
              type: 'Point',
              coordinates: [event.lng, event.lat]
            }
          });
          accidentsSource.setData(currentAccidents);
        }
      }
    });
    
    socket.on('route-alert', (payload) => {
      try {
        window.speechSynthesis?.speak(new SpeechSynthesisUtterance('Re-routing due to safety alert'));
      } catch (_) {}
      console.log('Re-routing…', payload);
    });

    mapInstanceRef.current = map;

    // Notify parent that map is ready
    if (onMapReady) {
      onMapReady(map);
    }

    return () => {
      // Restore original console.error
      console.error = originalError;
      
      socket?.close();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle user location updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    console.log('📍 MapComponent: userLocation effect triggered', { 
      hasMap: !!map, 
      hasUserLocation: !!userLocation,
      userLocation: userLocation
    });
    
    if (!map) {
      console.warn('📍 MapComponent: No map instance yet');
      return;
    }
    
    if (!userLocation) {
      console.log('📍 MapComponent: No userLocation yet');
      // If marker exists but location is cleared, remove it
      if (userMarkerRef.current) {
        console.log('📍 MapComponent: Removing existing marker (userLocation cleared)');
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
        userPulseCircleRef.current = null;
        hasCenteredRef.current = false;
      }
      return;
    }

    const { latitude, longitude } = userLocation;
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      console.error('📍 MapComponent: Invalid coordinates', { latitude, longitude });
      return;
    }
    
    const coordinates = [longitude, latitude];
    console.log('📍 MapComponent: Processing user location', coordinates, 'from', userLocation);

    // Wait for map to be fully loaded before creating marker
    const createMarker = () => {
      console.log('📍 MapComponent: Creating/updating user marker');
      
      // Always center map on first location
      if (!hasCenteredRef.current) {
        console.log('📍 MapComponent: Centering map to user location', coordinates);
        console.log('📍 MapComponent: Current map center before flyTo:', map.getCenter());
        
        map.flyTo({
          center: coordinates,
          zoom: 15,
          duration: 1500,
          essential: true
        });
        hasCenteredRef.current = true;
        
        // Verify after a delay
        setTimeout(() => {
          const finalCenter = map.getCenter();
          console.log('📍 MapComponent: Map center after flyTo:', finalCenter);
          console.log('📍 MapComponent: Expected center:', coordinates);
          
          // Check if the map actually moved to the correct location
          const distance = Math.sqrt(
            Math.pow(finalCenter.lng - coordinates[0], 2) + 
            Math.pow(finalCenter.lat - coordinates[1], 2)
          );
          console.log('📍 MapComponent: Distance from target:', distance);
        }, 1600);
      } else {
        console.log('📍 MapComponent: Map already centered, skipping flyTo');
      }

      // Create or update user marker with pulsing animation
      if (!userMarkerRef.current) {
        console.log('📍 MapComponent: Creating new user marker');
        // Create pulsing circle element
        const pulseEl = document.createElement('div');
        pulseEl.className = 'user-location-pulse';
        pulseEl.style.cssText = `
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background-color: rgba(59, 130, 246, 0.3);
          border: 2px solid rgba(59, 130, 246, 0.5);
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        `;

        // Create outer pulse circle
        userPulseCircleRef.current = document.createElement('div');
        userPulseCircleRef.current.className = 'user-location-pulse-outer';
        userPulseCircleRef.current.style.cssText = `
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background-color: rgba(59, 130, 246, 0.2);
          border: 2px solid rgba(59, 130, 246, 0.3);
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: pulse-outer 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        `;

        // Create marker container (large enough for pulse circles)
        const markerContainer = document.createElement('div');
        markerContainer.style.cssText = `
          position: relative;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
        `;
        markerContainer.appendChild(userPulseCircleRef.current);
        markerContainer.appendChild(pulseEl);

        // Create inner user dot
        const userDot = document.createElement('div');
        userDot.style.cssText = `
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background-color: #3b82f6;
          border: 3px solid white;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.6);
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 10;
        `;
        markerContainer.appendChild(userDot);

        // Add CSS animations if not already added
        if (!document.getElementById('user-location-animations')) {
          const style = document.createElement('style');
          style.id = 'user-location-animations';
          style.textContent = `
            @keyframes pulse {
              0%, 100% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
              }
              50% {
                opacity: 0.5;
                transform: translate(-50%, -50%) scale(1.2);
              }
            }
            @keyframes pulse-outer {
              0%, 100% {
                opacity: 0.3;
                transform: translate(-50%, -50%) scale(1);
              }
              50% {
                opacity: 0.1;
                transform: translate(-50%, -50%) scale(1.4);
              }
            }
          `;
          document.head.appendChild(style);
        }

        // Create Mapbox marker with explicit z-index and anchor
        userMarkerRef.current = new mapboxgl.Marker({
          element: markerContainer,
          anchor: 'center',
          offset: [0, 0]
        })
          .setLngLat(coordinates)
          .addTo(map);

        // Verify marker was added
        if (!userMarkerRef.current.getElement()) {
          console.error('📍 MapComponent: Marker element not found after creation!');
        } else {
          console.log('📍 MapComponent: Marker element created:', userMarkerRef.current.getElement());
        }

        // Verify marker position
        const markerLngLat = userMarkerRef.current.getLngLat();
        console.log('📍 MapComponent: Marker position set to:', markerLngLat);

        // Add popup
        const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
          .setText('📍 You are here');
        userMarkerRef.current.setPopup(popup);
        
        console.log('📍 MapComponent: ✅ User marker created successfully at', coordinates);
        console.log('📍 MapComponent: Map center is:', map.getCenter());
        console.log('📍 MapComponent: Map zoom is:', map.getZoom());
      } else {
        // Update existing marker position
        console.log('📍 MapComponent: Updating user marker position');
        userMarkerRef.current.setLngLat(coordinates);
      }
    };

    // Try to create marker - handle both loaded and not-yet-loaded cases
    const tryCreateMarker = () => {
      try {
        createMarker();
      } catch (error) {
        console.error('📍 MapComponent: Error creating marker, will retry when map loads', error);
        // If error, wait for map load
        const onLoad = () => {
          console.log('📍 MapComponent: Map loaded after error, retrying marker creation');
          try {
            createMarker();
          } catch (retryError) {
            console.error('📍 MapComponent: Error retrying marker creation', retryError);
          }
        };
        map.once('load', onLoad);
        return () => {
          map.off('load', onLoad);
        };
      }
    };

    // Always try to create marker - let createMarker handle timing issues
    // Use a more aggressive approach: try immediately, then wait for load if needed
    console.log('📍 MapComponent: Attempting to create marker immediately');
    
    // Try immediately first
    tryCreateMarker();
    
    // Also set up listener for map load (in case it wasn't loaded yet)
    const onLoad = () => {
      console.log('📍 MapComponent: Map loaded event fired, attempting marker creation');
      // Only create if we don't have a marker yet
      if (!userMarkerRef.current) {
        tryCreateMarker();
      }
    };
    
    // If map hasn't loaded yet, listen for load event
    if (!map.loaded) {
      console.log('📍 MapComponent: Map not loaded yet, waiting for load event...');
      map.once('load', onLoad);
    }
    
    // Fallback: try again after a delay regardless
    const timeoutId = setTimeout(() => {
      console.log('📍 MapComponent: Fallback timeout - checking marker status');
      if (!userMarkerRef.current) {
        console.log('📍 MapComponent: Marker still not created, retrying...');
        tryCreateMarker();
      } else {
        console.log('📍 MapComponent: Marker already exists, skipping retry');
      }
    }, 2000);
    
    return () => {
      map.off('load', onLoad);
      clearTimeout(timeoutId);
    };
  }, [userLocation]);


  // Update routes when prop changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded?.()) return;

    // Remove old routes
    routeLayersRef.current.forEach((layerId, routeId) => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(`route-source-${routeId}`)) {
        map.removeSource(`route-source-${routeId}`);
      }
      routeLayersRef.current.delete(routeId);
      routeSourcesRef.current.delete(routeId);
    });

    // Add new routes
    routes.forEach((route) => {
      const routeId = route.id || `route-${Date.now()}-${Math.random()}`;
      const sourceId = `route-source-${routeId}`;
      const layerId = `route-layer-${routeId}`;

      const isSelected = selectedRoute?.id === route.id;
      const lineWidth = isSelected ? 6 : 4;
      const lineOpacity = isSelected ? 1 : 0.6;

      const geoJSON = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: { color: route.color },
          geometry: route.geometry
        }]
      };

      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geoJSON
        });
      } else {
        map.getSource(sourceId).setData(geoJSON);
      }

      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': route.color,
            'line-width': lineWidth,
            'line-opacity': lineOpacity
          }
        });
      } else {
        map.setPaintProperty(layerId, 'line-width', lineWidth);
        map.setPaintProperty(layerId, 'line-opacity', lineOpacity);
      }

      routeLayersRef.current.set(routeId, layerId);
      routeSourcesRef.current.set(routeId, sourceId);
    });

    // Fit bounds to all routes
    if (routes.length > 0) {
      const allCoords = routes.flatMap(r => r.geometry.coordinates || []);
      if (allCoords.length > 0) {
        const bounds = allCoords.reduce(
          (b, c) => b.extend(c),
          new mapboxgl.LngLatBounds(allCoords[0], allCoords[0])
        );
        map.fitBounds(bounds, { padding: 40, duration: 600 });
      }
    }
  }, [routes, selectedRoute]);

  // Update accidents markers and heatmap
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded?.()) return;

    // Update accidents layer
    const accidentsGeoJSON = {
      type: 'FeatureCollection',
      features: accidents.map(accident => ({
        type: 'Feature',
        properties: { severity: accident.severity },
        geometry: {
          type: 'Point',
          coordinates: [accident.lng, accident.lat]
        }
      }))
    };

    const accidentsSource = map.getSource(accidentsSourceRef.current);
    if (accidentsSource) {
      accidentsSource.setData(accidentsGeoJSON);
    }

    // Update heatmap layer with safety score data
    // Create heatmap points from accidents - lower safety score = higher heat intensity
    const heatGeoJSON = {
      type: 'FeatureCollection',
      features: accidents.map(accident => {
        // Convert severity to heat intensity (inverse relationship)
        // high severity = higher heat (red), low severity = lower heat (green)
        const severityValue = accident.severity === 'high' ? 3 : accident.severity === 'medium' ? 2 : 1;
        
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [accident.lng, accident.lat]
          },
          properties: {
            // Intensity: 0-1, higher = more red on heatmap
            // High severity = 0.8-1.0, Medium = 0.5-0.8, Low = 0.2-0.5
            intensity: severityValue === 3 ? 0.9 : severityValue === 2 ? 0.6 : 0.3
          }
        };
      })
    };

    const heatSource = map.getSource(heatSourceIdRef.current);
    if (heatSource) {
      heatSource.setData(heatGeoJSON);
      
      // Update heatmap paint properties for better visualization
      map.setPaintProperty(heatLayerIdRef.current, 'heatmap-intensity', [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, 0.6,
        10, 0.8,
        15, 1.0
      ]);
      
      map.setPaintProperty(heatLayerIdRef.current, 'heatmap-radius', [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, 20,
        10, 30,
        15, 40
      ]);
      
      // Heatmap color stops: green (safe) to red (dangerous)
      map.setPaintProperty(heatLayerIdRef.current, 'heatmap-color', [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(34, 197, 94, 0)',        // Green (transparent)
        0.2, 'rgba(34, 197, 94, 0.5)',   // Green
        0.4, 'rgba(251, 191, 36, 0.6)',  // Yellow
        0.6, 'rgba(249, 115, 22, 0.7)',  // Orange
        0.8, 'rgba(239, 68, 68, 0.8)',  // Red
        1, 'rgba(220, 38, 38, 1)'         // Dark Red
      ]);
    }
  }, [accidents]);

  return (
    <div ref={mapRef} className="w-full h-full" />
  );
}


