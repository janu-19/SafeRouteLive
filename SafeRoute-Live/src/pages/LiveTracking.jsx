import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import MapComponent from '../components/MapComponent.jsx';

export default function LiveTracking() {
  const { roomId } = useParams();
  const [status, setStatus] = useState('Disconnected');

  useEffect(() => {
    const socket = io();
    socket.on('connect', () => setStatus('Connected'));
    socket.on('disconnect', () => setStatus('Disconnected'));
    return () => socket.close();
  }, []);

  return (
    <div className="h-full w-full relative">
      <div className="absolute inset-0">
        <MapComponent />
      </div>
      <div className="absolute top-24 left-4 glass rounded-xl px-3 py-2 text-sm">
        Room: <span className="font-mono">{roomId}</span> • <span className="opacity-80">{status}</span>
      </div>
    </div>
  );
}


