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

export async function getAISafetySuggestion(source, destination, routes) {
  const params = new URLSearchParams({
    source,
    destination,
    routes: JSON.stringify(routes)
  });
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


