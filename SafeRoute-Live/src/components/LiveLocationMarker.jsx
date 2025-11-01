import { useEffect, useRef } from 'react';
import * as MapView from './MapView.jsx';

/**
 * LiveLocationMarker Component
 * Displays user's current location with accuracy circle
 */
function LiveLocationMarker({ map, location, userId }) {
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map || !location) {
      return;
    }

    const coordinates = [location.longitude, location.latitude];

    // Create or update marker
    if (!markerRef.current) {
      markerRef.current = MapView.addMarker(map, coordinates, {
        color: '#22c55e',
        scale: 1.2,
        rotation: location.heading || 0,
        popupText: `You (${userId}) are here`
      });
    } else {
      MapView.updateMarker(markerRef.current, coordinates, location.heading || 0);
    }

    // Cleanup
    return () => {
      if (markerRef.current) {
        MapView.removeMarker(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [map, location, userId]);

  return null;
}

export default LiveLocationMarker;
