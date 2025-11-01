import { useState } from 'react';

export default function ChatInputBox({ onRoute }) {
  const [text, setText] = useState('Take me from MG Road to Indiranagar');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/getRouteFromChat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text })
      });
      // Mock if backend absent
      let data;
      if (res.ok) {
        data = await res.json();
      } else {
        // create a simple straight route mock in Bengaluru
        data = {
          route: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: { name: 'Mock Route' },
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [77.5946, 12.9716],
                    [77.6400, 12.9790]
                  ]
                }
              }
            ]
          },
          meta: { name: 'Mock Route', distanceKm: 5.2, safetyScore: 86 }
        };
      }
      onRoute?.(data);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="glass w-full rounded-xl p-3 flex gap-2">
      <input
        className="flex-1 bg-transparent outline-none text-slate-100 placeholder:text-slate-400"
        placeholder="Describe where you want to go…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        type="submit"
        disabled={loading}
        className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
      >
        {loading ? '...' : 'Go'}
      </button>
    </form>
  );
}


