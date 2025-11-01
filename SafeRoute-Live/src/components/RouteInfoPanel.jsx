export default function RouteInfoPanel({ meta }) {
  const name = meta?.name || 'No route selected';
  const distanceKm = meta?.distanceKm;
  const safetyScore = meta?.safetyScore;

  return (
    <div className="glass rounded-2xl p-4 w-80 text-slate-100">
      <div className="font-semibold text-lg">{name}</div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <div className="opacity-80">Distance</div>
        <div className="text-right">{distanceKm ? `${distanceKm} km` : '-'}</div>
        <div className="opacity-80">Safety score</div>
        <div className="text-right">{safetyScore ?? '-'}</div>
      </div>
      <button className="mt-4 w-full py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 hover:from-fuchsia-400 hover:to-indigo-400">
        Start Journey
      </button>
    </div>
  );
}


