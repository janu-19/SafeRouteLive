import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set Mapbox access token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
} else {
  console.warn('Mapbox token not found. Please set VITE_MAPBOX_TOKEN in your .env file');
}

/**
 * MapView Component
 * Handles Mapbox initialization, rendering, and cleanup
 */
export default function MapView({ center = [77.5946, 12.9716], zoom = 13, onMapLoaded }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Prevent re-initialization
    if (mapRef.current || !mapContainerRef.current) {
      return;
    }

    // Check if Mapbox token is available
    if (!MAPBOX_TOKEN) {
      console.error('Mapbox access token is required');
      return;
    }

    // Initialize map
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: center,
      zoom: zoom,
      attributionControl: true
    });

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    // Add scale control
    map.addControl(new mapboxgl.ScaleControl({
      maxWidth: 100,
      unit: 'metric'
    }), 'bottom-left');

    // Handle map load
    map.on('load', () => {
      setIsLoaded(true);
      if (onMapLoaded) {
        onMapLoaded(map);
      }
    });

    // Handle map errors
    map.on('error', (error) => {
      console.error('Map error:', error);
    });

    // Store map reference
    mapRef.current = map;

    // Cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setIsLoaded(false);
    };
  }, []); // Run only once on mount

  // Provide map instance to parent via ref
  useEffect(() => {
    return () => {
      // Additional cleanup if needed
    };
  }, []);

  // Expose map instance via ref callback pattern
  useEffect(() => {
    if (mapRef.current && onMapLoaded) {
      onMapLoaded(mapRef.current);
    }
  }, [isLoaded]);

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-full"
      style={{ minHeight: '400px' }}
    />
  );
}

/**
 * Add marker to map
 * @param {Map} map - Mapbox map instance
 * @param {number[]} coordinates - [lng, lat]
 * @param {object} options - Marker options
 * @returns {Marker} Mapbox marker instance
 */
export function addMarker(map, coordinates, options = {}) {
  const { color = '#22c55e', scale = 1, rotation = 0, popupText } = options;

  const el = document.createElement('div');
  el.className = 'marker';
  el.style.cssText = `
    width: ${20 * scale}px;
    height: ${20 * scale}px;
    border-radius: 50%;
    background-color: ${color};
    border: 3px solid white;
    box-shadow: 0 0 10px rgba(0,0,0,0.3);
    transform: rotate(${rotation}deg);
  `;

  const marker = new mapboxgl.Marker(el)
    .setLngLat(coordinates)
    .addTo(map);

  if (popupText) {
    const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
      .setText(popupText);
    marker.setPopup(popup);
  }

  return marker;
}

/**
 * Update marker position
 * @param {Marker} marker - Mapbox marker instance
 * @param {number[]} coordinates - [lng, lat]
 * @param {number} rotation - Rotation in degrees
 */
export function updateMarker(marker, coordinates, rotation = 0) {
  if (marker) {
    marker.setLngLat(coordinates);
    const el = marker.getElement();
    if (el) {
      el.style.transform = `rotate(${rotation}deg)`;
    }
  }
}

/**
 * Remove marker from map
 * @param {Marker} marker - Mapbox marker instance
 */
export function removeMarker(marker) {
  if (marker) {
    marker.remove();
  }
}

/**
 * Fit map bounds to markers
 * @param {Map} map - Mapbox map instance
 * @param {Marker[]} markers - Array of markers
 * @param {object} options - Options for fitBounds
 */
export function fitMapToMarkers(map, markers, options = {}) {
  if (!map || !markers || markers.length === 0) {
    return;
  }

  const bounds = new mapboxgl.LngLatBounds();
  
  markers.forEach(marker => {
    if (marker && marker.getLngLat) {
      bounds.extend(marker.getLngLat());
    }
  });

  map.fitBounds(bounds, {
    padding: 50,
    duration: 1000,
    ...options
  });
}

/**
 * Smoothly fly to location
 * @param {Map} map - Mapbox map instance
 * @param {number[]} coordinates - [lng, lat]
 * @param {number} zoom - Zoom level
 */
export function flyToLocation(map, coordinates, zoom = 15) {
  if (!map) {
    return;
  }

  map.flyTo({
    center: coordinates,
    zoom: zoom,
    duration: 1500,
    essential: true
  });
}