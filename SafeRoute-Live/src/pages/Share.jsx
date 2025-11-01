import { useMemo } from 'react';
import { Link } from 'react-router-dom';

export default function Share() {
  const roomId = useMemo(() => Math.random().toString(36).slice(2, 8), []);
  const link = `${location.origin}/track/${roomId}`;
  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="glass rounded-2xl p-5">
        <div className="text-lg font-semibold">Share Live Location</div>
        <div className="mt-2 text-sm text-slate-300">Send this link to a friend so they can track your walk.</div>
        <div className="mt-4 p-3 rounded-lg bg-black/40 font-mono text-xs break-all">{link}</div>
        <div className="mt-4 flex gap-3">
          <a href={link} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500">Open tracking</a>
          <Link to="/route-planner" className="px-4 py-2 rounded-lg glass hover:bg-white/10">Back to planner</Link>
        </div>
      </div>
    </div>
  );
}


