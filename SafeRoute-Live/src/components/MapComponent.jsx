import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { io } from 'socket.io-client';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

export default function MapComponent({ routes = [], selectedRoute = null, accidents = [] }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeLayersRef = useRef(new Map());
  const routeSourcesRef = useRef(new Map());
  const heatSourceIdRef = useRef('heat-source');
  const heatLayerIdRef = useRef('heat-layer');
  const accidentsLayerRef = useRef('accidents-layer');
  const accidentsSourceRef = useRef('accidents-source');

  useEffect(() => {
    if (mapInstanceRef.current) return;

    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [77.5946, 12.9716],
      zoom: 12
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('load', () => {
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


