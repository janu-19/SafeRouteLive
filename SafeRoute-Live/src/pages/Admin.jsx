import { io } from 'socket.io-client';

export default function Admin() {
  function emitSafetyUpdate() {
    // In a real app this would be a backend admin panel.
    // For demo, we call a local endpoint if available or log.
    // eslint-disable-next-line no-alert
    alert('Trigger safety update on server (placeholder).');
  }
  function emitRouteAlert() {
    const socket = io();
    socket.emit('route-alert', { message: 'Demo alert' });
    socket.close();
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="mt-2 text-slate-300">Trigger demo events.</p>
      <div className="mt-6 flex gap-3">
        <button onClick={emitSafetyUpdate} className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500">
          Trigger safety-update
        </button>
        <button onClick={emitRouteAlert} className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500">
          Trigger route-alert
        </button>
      </div>
    </div>
  );
}


