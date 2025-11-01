export default function RouteCard({ color = '#3b82f6', name, score, distanceKm, etaMin, onSelect }) {
  return (
    <button onClick={onSelect} className="glass w-full rounded-xl p-4 text-left hover:bg-white/10">
      <div className="flex items-center justify-between">
        <div className="font-semibold">
          <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: color }} />
          {name}
        </div>
        <div className="text-xs opacity-80">Score: {score}</div>
      </div>
      <div className="mt-2 text-sm opacity-90">{distanceKm} km • {etaMin} min</div>
    </button>
  );
}


