import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { io } from 'socket.io-client';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

export default function MapComponent({ routes = [], selectedRoute = null, accidents = [], source = '', destination = '', onCurrentLocationAsSource = null, n8nAlerts = [], selectedAlertId = null, onAlertFocus = null, userLocation = null, onMapReady = null }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeLayersRef = useRef(new Map());
  const routeSourcesRef = useRef(new Map());
  const heatSourceIdRef = useRef('heat-source');
  const heatLayerIdRef = useRef('heat-layer');
  const accidentsLayerRef = useRef('accidents-layer');
  const accidentsSourceRef = useRef('accidents-source');
  const n8nAlertsLayerRef = useRef('n8n-alerts-layer');
  const n8nAlertsSourceRef = useRef('n8n-alerts-source');
  const n8nAlertMarkersRef = useRef(new Map()); // Store marker references
  const n8nAlertCoordinatesRef = useRef(new Map()); // Store coordinates for each alert
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const currentLocationMarkerRef = useRef(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [navigationSteps, setNavigationSteps] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const navigationWatchIdRef = useRef(null);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/streets-v12');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const userLocationMarkerRef = useRef(null);
  const [isLoadingNavigation, setIsLoadingNavigation] = useState(false);

  // Voice navigation function
  const speak = (text) => {
    if (!isVoiceEnabled) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Cancel any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Update step index and announce during navigation
  useEffect(() => {
    if (!isNavigating || !navigationSteps || navigationSteps.length === 0) return;
    
    let timeoutId = null;
    
    const announceNextStep = () => {
      if (currentStepIndex < navigationSteps.length - 1 && isNavigating) {
        const timeToAnnounce = Math.max(3000, navigationSteps[currentStepIndex].duration * 1000 * 0.7); // 70% of step duration, min 3s
        timeoutId = setTimeout(() => {
          if (currentStepIndex < navigationSteps.length - 1 && isNavigating) {
            const nextIndex = currentStepIndex + 1;
            setCurrentStepIndex(nextIndex);
            speak(navigationSteps[nextIndex].instruction);
          }
        }, timeToAnnounce);
      }
    };
    
    announceNextStep();
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isNavigating, navigationSteps, currentStepIndex, isVoiceEnabled]);

  // Handle map style changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    
    if (map.isStyleLoaded()) {
      map.setStyle(mapStyle);
    } else {
      map.once('load', () => {
        // This will be handled on next render
      });
    }
  }, [mapStyle]);

  useEffect(() => {
    if (mapInstanceRef.current) return;

    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: mapStyle,
      center: [77.5946, 12.9716],
      zoom: 12,
      pitch: 0,
      bearing: 0
    });

    // Add navigation controls (Google Maps style - bottom right)
    map.addControl(new mapboxgl.NavigationControl({
      showCompass: true,
      showZoom: true,
      visualizePitch: true
    }), 'bottom-right');
    
    // Add scale control (bottom left)
    map.addControl(new mapboxgl.ScaleControl({
      maxWidth: 100,
      unit: 'metric'
    }), 'bottom-left');

    map.on('load', () => {
      // Enhance label visibility - ensure all labels are shown
      try {
        // Get all label layers and increase their visibility
        const style = map.getStyle();
        if (style && style.layers) {
          style.layers.forEach(layer => {
            if (layer.type === 'symbol' && layer.layout) {
              // Increase label visibility by adjusting text size and making them more prominent
              if (layer.layout['text-size']) {
                // Increase text size for better visibility
                const currentSize = layer.layout['text-size'];
                if (typeof currentSize === 'number' && currentSize < 16) {
                  map.setLayoutProperty(layer.id, 'text-size', Math.max(14, currentSize * 1.2));
                }
              }
              
              // Make labels more prominent
              if (layer.paint && layer.paint['text-halo-width'] !== undefined) {
                map.setPaintProperty(layer.id, 'text-halo-width', 1.5);
              }
              
              // Ensure labels are visible at lower zoom levels
              if (layer.minzoom !== undefined && layer.minzoom > 5) {
                map.setLayoutProperty(layer.id, 'visibility', 'visible');
              }
            }
            
            // Specifically enhance city and place labels
            if (layer.id.includes('place') || layer.id.includes('poi') || layer.id.includes('label')) {
              map.setLayoutProperty(layer.id, 'visibility', 'visible');
              if (layer.layout && layer.layout['text-size']) {
                const currentSize = layer.layout['text-size'];
                if (typeof currentSize === 'number' && currentSize < 18) {
                  map.setLayoutProperty(layer.id, 'text-size', Math.max(16, currentSize * 1.3));
                }
              }
            }
          });
        }
      } catch (error) {
        console.log('Label enhancement:', error);
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

      // n8n Alerts layer (for GeoJSON-based alerts if needed)
      if (!map.getSource(n8nAlertsSourceRef.current)) {
        map.addSource(n8nAlertsSourceRef.current, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        });
      }
    });

    // Re-enhance labels when style changes
    map.on('style.load', () => {
      // Delay to ensure style is fully loaded
      setTimeout(() => {
        try {
          const style = map.getStyle();
          if (style && style.layers) {
            style.layers.forEach(layer => {
              if (layer.type === 'symbol' && (layer.id.includes('place') || layer.id.includes('poi') || layer.id.includes('label'))) {
                map.setLayoutProperty(layer.id, 'visibility', 'visible');
              }
            });
          }
        } catch (error) {
          console.log('Label enhancement on style load:', error);
        }
      }, 500);
    });

    // Socket listeners
    const socket = io();
    socket.on('connect', () => {
      // Connected
    });
    socket.on('safety-update', (payload) => {
      // Could update heatmap source here
      // console.log('safety-update', payload);
    });
    socket.on('route-alert', (payload) => {
      try {
        window.speechSynthesis?.speak(new SpeechSynthesisUtterance('Re-routing due to safety alert'));
      } catch (_) {}
      // eslint-disable-next-line no-console
      console.log('Re-routing…', payload);
    });

    mapInstanceRef.current = map;

    // Call onMapReady callback if provided
    if (onMapReady) {
      onMapReady(map);
    }

    return () => {
      socket?.close();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

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

    // Handle route selection with zoom in then zoom out animation
    if (selectedRoute && selectedRoute.geometry && selectedRoute.geometry.coordinates) {
      const routeCoords = selectedRoute.geometry.coordinates;
      
      if (routeCoords.length > 0) {
        // Calculate bounds for the selected route
        const routeBounds = routeCoords.reduce(
          (bounds, coord) => bounds.extend(coord),
          new mapboxgl.LngLatBounds(routeCoords[0], routeCoords[0])
        );
        
        // Get center of the route
        const center = routeBounds.getCenter();
        
        // Step 1: Zoom in close to the route (very tight zoom)
        map.flyTo({
          center: [center.lng, center.lat],
          zoom: 16, // Very zoomed in
          duration: 1500,
          essential: true
        });
        
        // Step 2: After zoom in, zoom out to show full route
        setTimeout(() => {
          map.fitBounds(routeBounds, { 
            padding: { top: 80, bottom: 80, left: 80, right: 80 },
            duration: 2000,
            essential: true,
            maxZoom: 15
          });
        }, 1600);
      }
    } else if (routes.length > 0) {
      // If no route selected, fit bounds to all routes
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

  // Update accidents markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded?.()) return;

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

    const source = map.getSource(accidentsSourceRef.current);
    if (source) {
      source.setData(accidentsGeoJSON);
    }
  }, [accidents]);

  // Update n8n alert markers on map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded?.()) return;

    // Remove old markers
    n8nAlertMarkersRef.current.forEach((marker) => {
      marker.remove();
    });
    n8nAlertMarkersRef.current.clear();

    // Geocode and add new markers
    const geocodeAndAddMarker = async (alert) => {
      if (!alert.location) return; // Skip if no location

      try {
        // Try to geocode location string to coordinates
        const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
        if (!MAPBOX_TOKEN) return;

        const params = new URLSearchParams({
          access_token: MAPBOX_TOKEN,
          limit: '1',
          proximity: '77.5946,12.9716' // Center around default location
        });

        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(alert.location)}.json?${params}`
        );

        if (!res.ok) return;
        const data = await res.json();

        if (data.features && data.features.length > 0) {
          const coords = data.features[0].center; // [lng, lat]
          
          // Get icon based on alert type
          const getIconForType = (type) => {
            switch (type) {
              case 'accident':
              case 'emergency':
                return '🚨';
              case 'crime':
                return '🔴';
              case 'weather':
                return '⛈️';
              case 'protest':
                return '⚠️';
              case 'roadwork':
                return '🚧';
              case 'crowd':
                return '👥';
              default:
                return '📍';
            }
          };

          // Get color based on alert type
          const getColorForType = (type) => {
            switch (type) {
              case 'accident':
              case 'emergency':
                return '#ef4444';
              case 'crime':
                return '#dc2626';
              case 'weather':
                return '#3b82f6';
              case 'protest':
                return '#f59e0b';
              case 'roadwork':
                return '#f97316';
              case 'crowd':
                return '#8b5cf6';
              default:
                return '#6366f1';
            }
          };

          const icon = getIconForType(alert.type);
          const color = getColorForType(alert.type);

          // Create marker element
          const el = document.createElement('div');
          el.className = 'n8n-alert-marker';
          el.style.width = '36px';
          el.style.height = '36px';
          el.style.borderRadius = '50%';
          el.style.backgroundColor = color;
          el.style.border = '3px solid white';
          el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.style.fontSize = '20px';
          el.style.cursor = 'pointer';
          el.innerHTML = icon;

          // Create popup content
          const popupContent = `
            <div style="padding: 8px; max-width: 200px;">
              <div style="font-weight: bold; margin-bottom: 4px; font-size: 14px;">
                ${icon} ${alert.type ? alert.type.charAt(0).toUpperCase() + alert.type.slice(1) : 'Alert'}
              </div>
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
                ${alert.location}
              </div>
              <div style="font-size: 12px; color: #333;">
                ${alert.text || alert.summary || ''}
              </div>
              ${alert.source ? `<div style="font-size: 11px; color: #999; margin-top: 4px;">Source: ${alert.source}</div>` : ''}
            </div>
          `;

          const marker = new mapboxgl.Marker(el)
            .setLngLat(coords)
            .setPopup(new mapboxgl.Popup({ offset: 25, maxWidth: '250px' })
              .setHTML(popupContent))
            .addTo(map);

          const alertId = alert.id || `alert-${Date.now()}`;
          n8nAlertMarkersRef.current.set(alertId, marker);
          n8nAlertCoordinatesRef.current.set(alertId, coords); // Store coordinates for navigation
        }
      } catch (error) {
        console.error(`Error geocoding alert location "${alert.location}":`, error);
      }
    };

    // Process all alerts
    n8nAlerts.forEach((alert) => {
      geocodeAndAddMarker(alert);
    });

    // Cleanup
    return () => {
      n8nAlertMarkersRef.current.forEach((marker) => {
        marker.remove();
      });
      n8nAlertMarkersRef.current.clear();
      n8nAlertCoordinatesRef.current.clear();
    };
  }, [n8nAlerts]);

  // Handle selected alert - fly to location and open popup
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedAlertId) return;

    const marker = n8nAlertMarkersRef.current.get(selectedAlertId);
    const coords = n8nAlertCoordinatesRef.current.get(selectedAlertId);

    if (marker && coords) {
      // Fly to the location
      map.flyTo({
        center: coords,
        zoom: 15,
        duration: 1500,
        essential: true
      });

      // Open the popup after fly animation
      setTimeout(() => {
        marker.togglePopup();
      }, 1600);
    } else if (coords) {
      // If marker not ready yet but we have coordinates, just fly to location
      map.flyTo({
        center: coords,
        zoom: 15,
        duration: 1500,
        essential: true
      });
    }
  }, [selectedAlertId]);

  // Geocode addresses to coordinates
  useEffect(() => {
    const geocodeAddress = async (address) => {
      if (!address) return null;
      const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
      if (!MAPBOX_TOKEN) return null;
      
      try {
        const params = new URLSearchParams({
          access_token: MAPBOX_TOKEN,
          limit: '1'
        });
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?${params}`
        );
        if (!res.ok) return null;
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          return data.features[0].center; // [lng, lat]
        }
      } catch (err) {
        console.error('Error geocoding address:', err);
      }
      return null;
    };

    const updateMarkers = async () => {
      const map = mapInstanceRef.current;
      if (!map || !map.isStyleLoaded?.()) return;

      // Remove old markers
      if (startMarkerRef.current) startMarkerRef.current.remove();
      if (endMarkerRef.current) endMarkerRef.current.remove();

      // Add start marker
      if (source) {
        const sourceCoords = await geocodeAddress(source);
        if (sourceCoords) {
          const el = document.createElement('div');
          el.className = 'custom-marker';
          el.style.width = '40px';
          el.style.height = '40px';
          el.innerHTML = `
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#22c55e" stroke="white" stroke-width="2"/>
              <circle cx="12" cy="9" r="2.5" fill="white"/>
            </svg>
          `;
          el.style.cursor = 'pointer';
          el.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
          
          startMarkerRef.current = new mapboxgl.Marker(el)
            .setLngLat(sourceCoords)
            .setPopup(new mapboxgl.Popup().setText(`Start: ${source}`))
            .addTo(map);
        }
      }

      // Add end marker
      if (destination) {
        const destCoords = await geocodeAddress(destination);
        if (destCoords) {
          const el = document.createElement('div');
          el.className = 'custom-marker';
          el.style.width = '40px';
          el.style.height = '40px';
          el.innerHTML = `
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#ef4444" stroke="white" stroke-width="2"/>
              <circle cx="12" cy="9" r="2.5" fill="white"/>
            </svg>
          `;
          el.style.cursor = 'pointer';
          el.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
          
          endMarkerRef.current = new mapboxgl.Marker(el)
            .setLngLat(destCoords)
            .setPopup(new mapboxgl.Popup().setText(`End: ${destination}`))
            .addTo(map);
        }
      }
    };

    updateMarkers();
  }, [source, destination]);

  // Reverse geocode coordinates to address
  const reverseGeocode = async (coords) => {
    const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!MAPBOX_TOKEN) return null;
    
    try {
      const params = new URLSearchParams({
        access_token: MAPBOX_TOKEN,
        limit: '1'
      });
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords[0]},${coords[1]}.json?${params}`
      );
      if (!res.ok) return null;
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        return data.features[0].place_name || data.features[0].text;
      }
    } catch (err) {
      console.error('Error reverse geocoding:', err);
    }
    return null;
  };

  // Current location functionality
  const handleGetCurrentLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { longitude, latitude } = position.coords;
        const coords = [longitude, latitude];
        setCurrentLocation(coords);
        
        // Reverse geocode to get address
        const address = await reverseGeocode(coords);
        
        // Pass address to parent component if callback provided
        if (onCurrentLocationAsSource && address) {
          onCurrentLocationAsSource(address);
        }
        
        const map = mapInstanceRef.current;
        if (map) {
          // Remove old current location marker
          if (currentLocationMarkerRef.current) {
            currentLocationMarkerRef.current.remove();
          }

          // Add current location marker with bike icon
          const el = document.createElement('div');
          el.className = 'custom-marker';
          el.style.width = '40px';
          el.style.height = '40px';
          el.style.borderRadius = '50%';
          el.style.backgroundColor = '#3b82f6';
          el.style.border = '3px solid white';
          el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.innerHTML = '🛵';
          el.style.fontSize = '24px';
          
          currentLocationMarkerRef.current = new mapboxgl.Marker(el)
            .setLngLat(coords)
            .setPopup(new mapboxgl.Popup().setText(address || 'Current Location'))
            .addTo(map);

          // Fly to current location
          map.flyTo({
            center: coords,
            zoom: 15,
            duration: 1500
          });
        }
        
        setIsLocating(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to get your location. Please check your browser settings.');
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  };


  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Current Location Button */}
      <button
        onClick={handleGetCurrentLocation}
        disabled={isLocating}
        className="absolute top-4 right-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg transition-all z-10 backdrop-blur-sm border border-blue-500/50"
        title="Get Current Location and Use as Source"
      >
        {isLocating ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
            <span>Locating...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>My Location</span>
          </>
        )}
      </button>

      {/* Navigation Panel */}
      {navigationSteps && navigationSteps.length > 0 && selectedRoute && (
        <div className="absolute bottom-4 left-4 right-4 max-w-md bg-gray-900/95 backdrop-blur-lg border border-white/20 rounded-lg shadow-xl z-10 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">Navigation</h3>
            <div className="flex gap-2">
              {/* Voice Toggle */}
              <button
                onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                className={`px-3 py-1.5 rounded text-sm font-medium ${
                  isVoiceEnabled 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
                title={isVoiceEnabled ? 'Disable Voice' : 'Enable Voice'}
              >
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                {isVoiceEnabled ? 'Voice On' : 'Voice Off'}
              </button>
              
              {!isNavigating ? (
                <button
                  onClick={() => {
                    setIsNavigating(true);
                    setCurrentStepIndex(0);
                    
                    // Announce first instruction
                    if (isVoiceEnabled && navigationSteps && navigationSteps.length > 0) {
                      speak(navigationSteps[0].instruction);
                    }
                    
                    // Start watching position
                    if (navigator.geolocation) {
                      navigationWatchIdRef.current = navigator.geolocation.watchPosition(
                        (position) => {
                          const { longitude, latitude } = position.coords;
                          const map = mapInstanceRef.current;
                          if (map) {
                            map.setCenter([longitude, latitude]);
                            map.setZoom(17);
                            
                            // Update user location marker with bike icon
                            if (userLocationMarkerRef.current) {
                              userLocationMarkerRef.current.setLngLat([longitude, latitude]);
                            } else {
                              // Create bike icon marker
                              const el = document.createElement('div');
                              el.className = 'bike-marker';
                              el.style.width = '40px';
                              el.style.height = '40px';
                              el.style.borderRadius = '50%';
                              el.style.backgroundColor = '#3b82f6';
                              el.style.border = '3px solid white';
                              el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';
                              el.style.display = 'flex';
                              el.style.alignItems = 'center';
                              el.style.justifyContent = 'center';
                              el.style.fontSize = '24px';
                              el.innerHTML = '🛵';
                              
                              userLocationMarkerRef.current = new mapboxgl.Marker(el)
                                .setLngLat([longitude, latitude])
                                .addTo(map);
                            }
                          }
                        },
                        (error) => console.error('Navigation tracking error:', error),
                        { enableHighAccuracy: true, maximumAge: 1000 }
                      );
                    }
                  }}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm font-medium text-white"
                >
                  Start
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsNavigating(false);
                    setCurrentStepIndex(0);
                    if (navigationWatchIdRef.current !== null) {
                      navigator.geolocation.clearWatch(navigationWatchIdRef.current);
                      navigationWatchIdRef.current = null;
                    }
                    if (userLocationMarkerRef.current) {
                      userLocationMarkerRef.current.remove();
                      userLocationMarkerRef.current = null;
                    }
                    // Stop any speech
                    window.speechSynthesis?.cancel();
                  }}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm font-medium text-white"
                >
                  Stop
                </button>
              )}
              <button
                onClick={() => {
                  setNavigationSteps(null);
                  setIsLoadingNavigation(false);
                  setCurrentStepIndex(0);
                  setIsNavigating(false);
                  if (navigationWatchIdRef.current !== null) {
                    navigator.geolocation.clearWatch(navigationWatchIdRef.current);
                    navigationWatchIdRef.current = null;
                  }
                  if (userLocationMarkerRef.current) {
                    userLocationMarkerRef.current.remove();
                    userLocationMarkerRef.current = null;
                  }
                  window.speechSynthesis?.cancel();
                }}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium text-white"
              >
                Close
              </button>
            </div>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {navigationSteps.map((step, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  index === currentStepIndex && isNavigating
                    ? 'bg-blue-600/30 border-blue-500'
                    : 'bg-gray-800/50 border-white/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === currentStepIndex && isNavigating
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm">{step.instruction}</p>
                    <p className="text-gray-400 text-xs mt-1">
                      {(step.distance / 1000).toFixed(2)} km • {Math.round(step.duration / 60)} min
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Start Navigation Button - Shows when route is selected */}
      {selectedRoute && source && destination && !navigationSteps && (
        <button
          disabled={isLoadingNavigation}
          onClick={async () => {
            // Get navigation directions using selected route geometry
            const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
            if (!MAPBOX_TOKEN) {
              alert('Mapbox token not found. Please check your configuration.');
              return;
            }

            setIsLoadingNavigation(true);
            console.log('Starting navigation...', { selectedRoute, source, destination });

            try {
              // If selected route has geometry, use it to get directions
              if (selectedRoute.geometry && selectedRoute.geometry.coordinates && selectedRoute.geometry.coordinates.length > 1) {
                console.log('Using route geometry for navigation');
                // Extract key waypoints from the route geometry
                const routeCoords = selectedRoute.geometry.coordinates;
                const startCoord = routeCoords[0];
                const endCoord = routeCoords[routeCoords.length - 1];
                
                // Use the actual route geometry waypoints for more accurate navigation
                // Mapbox Directions API supports up to 25 waypoints, but URL length can be an issue
                // Let's use a simpler approach - use start and end coordinates directly
                // For complex routes, we'll use fewer intermediate waypoints
                const numWaypoints = Math.min(10, Math.floor(routeCoords.length / 20)); // Reduced waypoints
                const stepSize = numWaypoints > 0 ? Math.max(1, Math.floor((routeCoords.length - 2) / numWaypoints)) : routeCoords.length;
                
                let coordinates = `${startCoord[0]},${startCoord[1]}`;
                
                // Add intermediate waypoints only if we have enough coordinates
                if (numWaypoints > 0 && routeCoords.length > 10) {
                  for (let i = stepSize; i < routeCoords.length - stepSize; i += stepSize) {
                    const coord = routeCoords[i];
                    if (coord && Array.isArray(coord) && coord.length >= 2) {
                      coordinates += `;${coord[0]},${coord[1]}`;
                    }
                  }
                }
                
                // Add destination
                coordinates += `;${endCoord[0]},${endCoord[1]}`;
                
                console.log('Directions URL coordinates:', coordinates.substring(0, 200) + '...');
                
                const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordinates}?access_token=${MAPBOX_TOKEN}&alternatives=false&geometries=geojson&steps=true&overview=full&language=en`;
                
                const response = await fetch(url);
                if (!response.ok) {
                  const errorText = await response.text();
                  console.error('Directions API error:', response.status, errorText);
                  alert(`Failed to get navigation directions: ${response.status}. Please try again.`);
                  return;
                }
                
                const data = await response.json();
                console.log('Directions API response:', data);
                
                if (data.routes && data.routes.length > 0 && data.routes[0].legs && data.routes[0].legs.length > 0) {
                  const allSteps = [];
                  data.routes[0].legs.forEach(leg => {
                    if (leg.steps && leg.steps.length > 0) {
                      leg.steps.forEach(step => {
                        allSteps.push({
                          instruction: step.maneuver.instruction || 'Continue',
                          distance: step.distance || 0,
                          duration: step.duration || 0,
                          location: step.maneuver.location || []
                        });
                      });
                    }
                  });
                  
                  if (allSteps.length > 0) {
                    console.log('Navigation steps loaded:', allSteps.length);
                    setNavigationSteps(allSteps);
                    setIsLoadingNavigation(false);
                  } else {
                    console.error('No steps found in route');
                    setIsLoadingNavigation(false);
                    alert('Could not generate navigation steps. Please try selecting a different route.');
                  }
                } else {
                  console.error('No routes or legs found');
                  setIsLoadingNavigation(false);
                  alert('Could not find navigation route. Please try again.');
                }
              } else {
                // Fallback to geocoding
                const geocodeAddress = async (address) => {
                  const params = new URLSearchParams({
                    access_token: MAPBOX_TOKEN,
                    limit: '1'
                  });
                  const res = await fetch(
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?${params}`
                  );
                  if (!res.ok) return null;
                  const data = await res.json();
                  if (data.features && data.features.length > 0) {
                    return data.features[0].center;
                  }
                  return null;
                };

                console.log('Using fallback geocoding...');
                const sourceCoords = await geocodeAddress(source);
                const destCoords = await geocodeAddress(destination);

                if (!sourceCoords || !destCoords) {
                  setIsLoadingNavigation(false);
                  alert('Could not geocode source or destination. Please check the addresses.');
                  return;
                }

                const coordinates = `${sourceCoords[0]},${sourceCoords[1]};${destCoords[0]},${destCoords[1]}`;
                console.log('Fallback coordinates:', coordinates);
                const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordinates}?access_token=${MAPBOX_TOKEN}&alternatives=false&geometries=geojson&steps=true&overview=full&language=en`;
                
                const response = await fetch(url);
                if (!response.ok) {
                  const errorText = await response.text();
                  console.error('Directions API error (fallback):', response.status, errorText);
                  alert(`Failed to get navigation directions: ${response.status}. Please try again.`);
                  return;
                }
                
                const data = await response.json();
                console.log('Directions API response (fallback):', data);
                
                if (data.routes && data.routes.length > 0 && data.routes[0].legs && data.routes[0].legs.length > 0) {
                  const steps = [];
                  data.routes[0].legs.forEach(leg => {
                    if (leg.steps && leg.steps.length > 0) {
                      leg.steps.forEach(step => {
                        steps.push({
                          instruction: step.maneuver.instruction || 'Continue',
                          distance: step.distance || 0,
                          duration: step.duration || 0,
                          location: step.maneuver.location || []
                        });
                      });
                    }
                  });
                  
                  if (steps.length > 0) {
                    console.log('Navigation steps loaded (fallback):', steps.length);
                    setNavigationSteps(steps);
                    setIsLoadingNavigation(false);
                  } else {
                    console.error('No steps found in route (fallback)');
                    setIsLoadingNavigation(false);
                    alert('Could not generate navigation steps. Please try selecting a different route.');
                  }
                } else {
                  console.error('No routes or legs found (fallback)');
                  setIsLoadingNavigation(false);
                  alert('Could not find navigation route. Please check your source and destination.');
                }
              }
            } catch (error) {
              console.error('Error getting navigation directions:', error);
              setIsLoadingNavigation(false);
              alert(`Navigation error: ${error.message}. Please try again.`);
            }
          }}
          className={`absolute bottom-4 left-4 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg transition-all z-10 backdrop-blur-sm border ${
            isLoadingNavigation 
              ? 'bg-gray-600 text-gray-300 cursor-not-allowed border-gray-500/50' 
              : 'bg-green-600 hover:bg-green-700 text-white border-green-500/50'
          }`}
        >
          {isLoadingNavigation ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
              Loading...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Start Navigation
            </>
          )}
        </button>
      )}
      
      {/* Map Style Toggle - Satellite/Street View */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              const newStyle = mapStyle.includes('satellite') 
                ? 'mapbox://styles/mapbox/streets-v12'
                : mapStyle === 'mapbox://styles/mapbox/streets-v12'
                ? 'mapbox://styles/mapbox/dark-v11'
                : 'mapbox://styles/mapbox/satellite-v9';
              setMapStyle(newStyle);
              const map = mapInstanceRef.current;
              if (map) {
                map.setStyle(newStyle);
              }
            }}
            className="px-3 py-2 bg-white/90 hover:bg-white rounded-lg text-sm font-medium text-gray-800 shadow-lg backdrop-blur-sm border border-gray-200 flex items-center gap-2"
            title="Toggle Map View"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {mapStyle.includes('satellite') ? 'Map' : mapStyle.includes('dark') ? 'Labels' : 'Satellite'}
          </button>
          
          {!mapStyle.includes('satellite') && (
            <button
              onClick={() => {
                const newStyle = mapStyle === 'mapbox://styles/mapbox/streets-v12'
                  ? 'mapbox://styles/mapbox/dark-v11'
                  : 'mapbox://styles/mapbox/streets-v12';
                setMapStyle(newStyle);
                const map = mapInstanceRef.current;
                if (map) {
                  map.setStyle(newStyle);
                }
              }}
              className="px-3 py-2 bg-white/90 hover:bg-white rounded-lg text-sm font-medium text-gray-800 shadow-lg backdrop-blur-sm border border-gray-200 flex items-center gap-2"
              title="Toggle Map Style"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
              {mapStyle.includes('dark') ? 'Streets' : 'Dark'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


