const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export async function getRouteFromChat(prompt) {
  const res = await fetch(`${API_BASE_URL}/api/getRouteFromChat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  if (!res.ok) throw new Error('Failed to fetch route');
  return res.json();
}

export async function getSafeRoutes(source, destination, preference = 'Well-lit') {
  const params = new URLSearchParams({ source, destination, preference });
  const res = await fetch(`${API_BASE_URL}/api/getSafeRoutes?${params}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const error = new Error(errorData.error || 'Failed to fetch safe routes');
    error.response = res;
    error.data = errorData;
    throw error;
  }
  return res.json();
}

export async function getCrimeData() {
  const res = await fetch(`${API_BASE_URL}/api/getCrimeData`);
  if (!res.ok) throw new Error('Failed to fetch crime data');
  return res.json();
}

export async function getAccidents() {
  const res = await fetch(`${API_BASE_URL}/api/getAccidents`);
  if (!res.ok) throw new Error('Failed to fetch accidents');
  return res.json();
}

export async function getTraffic(coords) {
  const params = new URLSearchParams({ coords: JSON.stringify(coords) });
  const res = await fetch(`${API_BASE_URL}/api/getTraffic?${params}`);
  if (!res.ok) throw new Error('Failed to fetch traffic');
  return res.json();
}

export async function getLighting(coords) {
  const params = new URLSearchParams({ coords: JSON.stringify(coords) });
  const res = await fetch(`${API_BASE_URL}/api/getLighting?${params}`);
  if (!res.ok) throw new Error('Failed to fetch lighting data');
  return res.json();
}

export async function getSafetyStats() {
  // Mocked stats
  return {
    topSafest: ['MG Road', 'Indiranagar', 'Koramangala'],
    topRisky: ['KR Market', 'Shivajinagar']
  };
}

export async function sendSOSAlert(location, message = 'Emergency SOS Alert') {
  // Mock Twilio alert - in production, replace with actual Twilio API call
  const res = await fetch(`${API_BASE_URL}/api/sos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location, message })
  });
  if (!res.ok) throw new Error('Failed to send SOS alert');
  return res.json();
}

export async function submitFeedback(routeId, feedback, safetyScore) {
  const res = await fetch(`${API_BASE_URL}/api/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ routeId, feedback, safetyScore })
  });
  if (!res.ok) throw new Error('Failed to submit feedback');
  return res.json();
}

export async function getAISafetySuggestion(source, destination, routes, lat = null, lng = null) {
  const params = new URLSearchParams({
    source,
    destination,
    routes: JSON.stringify(routes)
  });
  
  // Add coordinates for real-time data if available
  if (lat !== null && lng !== null) {
    params.append('lat', lat);
    params.append('lng', lng);
  }
  
  const res = await fetch(`${API_BASE_URL}/api/ai-safety-suggestion?${params}`);
  if (!res.ok) throw new Error('Failed to get AI safety suggestion');
  return res.json();
}

export async function getAddressSuggestions(query) {
  if (!query || query.length < 2) return [];
  
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
  if (!MAPBOX_TOKEN) return [];
  
  try {
    const params = new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      types: 'place,locality,neighborhood,address',
      autocomplete: 'true',
      limit: '5'
    });
    
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`
    );
    
    if (!res.ok) return [];
    
    const data = await res.json();
    return data.features || [];
  } catch (err) {
    console.error('Error fetching address suggestions:', err);
    return [];
  }
}

/**
 * Get comprehensive data from n8n automation
 * Returns social feed (tweets, news), weather, traffic, and crowd density data
 * @param {number} lat - Latitude (optional, defaults to user location)
 * @param {number} lng - Longitude (optional, defaults to user location)
 * @returns {Promise<Object>} Dashboard data from n8n workflow
 */
export async function getN8NData(lat = null, lng = null) {
  const params = new URLSearchParams();
  if (lat !== null) params.append('lat', lat);
  if (lng !== null) params.append('lng', lng);
  
  const res = await fetch(`${API_BASE_URL}/api/getN8NData?${params}`);
  if (!res.ok) {
    throw new Error('Failed to fetch n8n data');
  }
  return res.json();
}

/**
 * Reverse geocode coordinates to get address/location name
 * @param {number} longitude - Longitude coordinate
 * @param {number} latitude - Latitude coordinate
 * @returns {Promise<string>} Location name/address
 */
export async function reverseGeocode(longitude, latitude) {
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
  if (!MAPBOX_TOKEN) return null;
  
  try {
    const params = new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      limit: '1'
    });
    
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?${params}`
    );
    
    if (!res.ok) return null;
    
    const data = await res.json();
    if (data.features && data.features.length > 0) {
      // Get the most relevant place name (usually the place feature)
      const feature = data.features[0];
      return feature.place_name || feature.text || null;
    }
    
    return null;
  } catch (err) {
    console.error('Error reverse geocoding:', err);
    return null;
  }
}


