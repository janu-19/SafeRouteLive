import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MapComponent from '../components/MapComponent.jsx';
import RouteCard from '../components/RouteCard.jsx';

export default function RoutePlanner() {
  const navigate = useNavigate();
  const [source, setSource] = useState('MG Road, Bengaluru');
  const [dest, setDest] = useState('Indiranagar, Bengaluru');
  const [pref, setPref] = useState('Well-lit');
  const [routes, setRoutes] = useState([]);
  const [selected, setSelected] = useState(null);

  function mockGetSafeRoutes() {
    const base = [
      { name: 'Well-lit Main Roads', color: '#22c55e', score: 92, distanceKm: 5.1, etaMin: 18 },
      { name: 'Crowded Streets', color: '#f59e0b', score: 84, distanceKm: 5.4, etaMin: 20 },
      { name: 'Fastest Path', color: '#3b82f6', score: 76, distanceKm: 4.6, etaMin: 15 },
    ];
    const geo = (color) => ({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { color },
          geometry: {
            type: 'LineString',
            coordinates: [ [77.5946, 12.9716], [77.6400, 12.9790] ]
          }
        }
      ]
    });
    const enriched = base.map(r => ({ ...r, route: geo(r.color) }));
    setRoutes(enriched);
    setSelected(enriched[0]);
  }

  return (
    <div className="h-full w-full grid grid-cols-1 lg:grid-cols-[380px_1fr]">
      <div className="p-4 space-y-3 order-2 lg:order-1">
        <div className="glass rounded-2xl p-4 space-y-3">
          <div>
            <label className="text-xs opacity-80">Source</label>
            <input className="mt-1 w-full rounded-lg bg-transparent border border-white/20 px-3 py-2 outline-none" value={source} onChange={(e)=>setSource(e.target.value)} />
          </div>
          <div>
            <label className="text-xs opacity-80">Destination</label>
            <input className="mt-1 w-full rounded-lg bg-transparent border border-white/20 px-3 py-2 outline-none" value={dest} onChange={(e)=>setDest(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs opacity-80">Safety Preference</label>
              <select className="mt-1 w-full rounded-lg bg-transparent border border-white/20 px-3 py-2" value={pref} onChange={(e)=>setPref(e.target.value)}>
                <option>Well-lit</option>
                <option>Crowded</option>
                <option>Fastest</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={mockGetSafeRoutes} className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 py-2 hover:brightness-110">Find Safe Routes</button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {routes.map((r, i) => (
            <RouteCard key={i} color={r.color} name={r.name} score={r.score} distanceKm={r.distanceKm} etaMin={r.etaMin} onSelect={()=>setSelected(r)} />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => navigate('/share')} className="glass rounded-xl py-2 hover:bg-white/10">Share Live Location</button>
          <button onClick={() => navigate('/sos')} className="glass rounded-xl py-2 hover:bg-white/10">SOS</button>
          <button className="glass rounded-xl py-2 hover:bg-white/10">Recalculate Safety</button>
        </div>
      </div>
      <div className="relative order-1 lg:order-2">
        <div className="absolute inset-0">
          <MapComponent routeGeoJSON={selected?.route} />
        </div>
      </div>
    </div>
  );
}


