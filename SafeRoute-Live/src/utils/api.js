export async function getRouteFromChat(prompt) {
  const res = await fetch('/api/getRouteFromChat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  if (!res.ok) throw new Error('Failed to fetch route');
  return res.json();
}

export async function getSafeRoutes(payload) {
  // Mocked response for planner
  return {
    routes: [
      { name: 'Well-lit Main Roads', color: '#22c55e', score: 92, distanceKm: 5.1, etaMin: 18 },
      { name: 'Crowded Streets', color: '#f59e0b', score: 84, distanceKm: 5.4, etaMin: 20 },
      { name: 'Fastest Path', color: '#3b82f6', score: 76, distanceKm: 4.6, etaMin: 15 },
    ]
  };
}

export async function getSafetyStats() {
  // Mocked stats
  return {
    topSafest: ['MG Road', 'Indiranagar', 'Koramangala'],
    topRisky: ['KR Market', 'Shivajinagar']
  };
}


