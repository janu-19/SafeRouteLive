import { Link } from 'react-router-dom';

export default function SOS() {
  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="glass rounded-2xl p-5">
        <div className="text-lg font-semibold text-rose-300">SOS Center</div>
        <div className="mt-2 text-sm text-slate-300">This is a demo SOS page. Configure emergency contacts and actions here.</div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button className="rounded-lg bg-rose-600 py-2 hover:bg-rose-500">Call Emergency</button>
          <button className="rounded-lg bg-amber-600 py-2 hover:bg-amber-500">Notify Contacts</button>
        </div>
        <Link to="/route-planner" className="mt-4 inline-block px-4 py-2 rounded-lg glass hover:bg-white/10">Back to planner</Link>
      </div>
    </div>
  );
}


