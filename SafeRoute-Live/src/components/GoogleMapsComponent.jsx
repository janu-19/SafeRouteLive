import { useEffect, useRef, useState } from 'react';

export default function GoogleMapsComponent({ source, destination, geometry, onClose }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const directionsServiceRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load Google Maps JavaScript API
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Google Maps API key not found');
      return;
    }

    // Check if script is already loaded
    if (window.google && window.google.maps) {
      setScriptLoaded(true);
      return;
    }

    // Check if script tag already exists
    if (document.querySelector(`script[src*="maps.googleapis.com"]`)) {
      // Wait for it to load
      const checkGoogle = setInterval(() => {
        if (window.google && window.google.maps) {
          setScriptLoaded(true);
          clearInterval(checkGoogle);
        }
      }, 100);
      return () => clearInterval(checkGoogle);
    }

    // Load Google Maps JavaScript API
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setScriptLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup script if component unmounts
      const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
      if (existingScript && existingScript.parentNode === document.head) {
        // Only remove if we added it (not if it was already there)
      }
    };
  }, []);

  // Initialize map when script is loaded
  useEffect(() => {
    if (!scriptLoaded || !mapRef.current || mapInstanceRef.current) return;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    try {
      // Initialize map
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 13,
        center: { lat: 12.9716, lng: 77.5946 },
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
      });

      // Initialize directions service and renderer
      const directionsService = new window.google.maps.DirectionsService();
      const directionsRenderer = new window.google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: false,
        draggable: true,
      });

      directionsServiceRef.current = directionsService;
      directionsRendererRef.current = directionsRenderer;
      mapInstanceRef.current = map;
      setIsLoaded(true);
    } catch (error) {
      console.error('Error initializing Google Maps:', error);
    }
  }, [scriptLoaded]);

  // Display route when source and destination are available
  useEffect(() => {
    if (!isLoaded || !directionsServiceRef.current || !directionsRendererRef.current || !source || !destination) return;

    const directionsService = directionsServiceRef.current;
    const directionsRenderer = directionsRendererRef.current;

    // Prepare request
    const request = {
      origin: source,
      destination: destination,
      travelMode: window.google.maps.TravelMode.DRIVING,
    };

    // Add waypoints if geometry is available
    if (geometry && geometry.coordinates && Array.isArray(geometry.coordinates) && geometry.coordinates.length > 2) {
      const coords = geometry.coordinates;
      const numWaypoints = Math.min(10, Math.max(3, Math.floor(coords.length / 20)));
      const step = Math.max(1, Math.floor((coords.length - 2) / numWaypoints));

      const waypoints = [];
      for (let i = step; i < coords.length - step; i += step) {
        if (coords[i] && Array.isArray(coords[i]) && coords[i].length >= 2) {
          const lat = coords[i][1];
          const lng = coords[i][0];
          if (typeof lat === 'number' && typeof lng === 'number' && 
              lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            waypoints.push({
              location: { lat, lng },
              stopover: true
            });
          }
        }
      }

      if (waypoints.length > 0 && waypoints.length <= 23) {
        request.waypoints = waypoints.slice(0, 23);
      }
    }

    // Get directions
    directionsService.route(request, (result, status) => {
      if (status === window.google.maps.DirectionsStatus.OK) {
        directionsRenderer.setDirections(result);
        
        // Fit map to route
        const bounds = new window.google.maps.LatLngBounds();
        result.routes[0].legs.forEach((leg) => {
          bounds.extend(leg.start_location);
          bounds.extend(leg.end_location);
        });
        mapInstanceRef.current.fitBounds(bounds);
      } else {
        console.error('Directions request failed:', status);
      }
    });
  }, [isLoaded, source, destination, geometry]);

  // Generate navigation URL
  const getNavigationUrl = () => {
    const encodedSource = encodeURIComponent(source);
    const encodedDest = encodeURIComponent(destination);
    return `https://www.google.com/maps/dir/?api=1&origin=${encodedSource}&destination=${encodedDest}&travelmode=driving&dir_action=navigate`;
  };

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  return (
    <div className="relative w-full h-full">
      {!apiKey ? (
        <div className="h-full flex items-center justify-center bg-gray-900 flex-col p-8">
          <p className="text-lg font-semibold mb-2">Google Maps API Key Required</p>
          <p className="text-sm opacity-70 mb-4">Please add VITE_GOOGLE_MAPS_API_KEY to your .env file</p>
        </div>
      ) : !scriptLoaded || !isLoaded ? (
        <div className="h-full flex items-center justify-center bg-gray-900 flex-col p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-sm opacity-70">Loading Google Maps...</p>
        </div>
      ) : (
        <>
          <div ref={mapRef} className="w-full h-full" />
          
          {/* Navigation Controls Overlay */}
          <div className="absolute bottom-4 left-4 right-4 flex gap-2 z-10">
            <a
              href={getNavigationUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg transition-all flex-1 justify-center"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              Start Navigation
            </a>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

