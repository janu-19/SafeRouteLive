import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { io } from 'socket.io-client';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

export default function MapComponent({ routeGeoJSON }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeIdRef = useRef('route-line');
  const routeSourceIdRef = useRef('route-source');
  const heatSourceIdRef = useRef('heat-source');
  const heatLayerIdRef = useRef('heat-layer');

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

      // Initial empty route layer
      if (!map.getSource(routeSourceIdRef.current)) {
        map.addSource(routeSourceIdRef.current, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        });
      }
      if (!map.getLayer(routeIdRef.current)) {
        map.addLayer({
          id: routeIdRef.current,
          type: 'line',
          source: routeSourceIdRef.current,
          paint: {
            'line-color': '#3b82f6',
            'line-width': 4
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

  // Update route when prop changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded?.()) return;
    const source = map.getSource(routeSourceIdRef.current);
    if (source && routeGeoJSON) {
      source.setData(routeGeoJSON);
      // Fit bounds to route
      const coords = routeGeoJSON.features?.[0]?.geometry?.coordinates || [];
      if (coords.length > 0) {
        const bounds = coords.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(coords[0], coords[0]));
        map.fitBounds(bounds, { padding: 40, duration: 600 });
      }
    }
  }, [routeGeoJSON]);

  return (
    <div ref={mapRef} className="w-full h-full" />
  );
}


