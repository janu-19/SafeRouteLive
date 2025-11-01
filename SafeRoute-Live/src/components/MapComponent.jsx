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

  return (
    <div ref={mapRef} className="w-full h-full" />
  );
}


