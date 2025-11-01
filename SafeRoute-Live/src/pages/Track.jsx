import { useParams } from 'react-router-dom';
import MapComponent from '../components/MapComponent.jsx';

export default function Track() {
  const { roomId } = useParams();
  return (
    <div className="h-full w-full relative">
      <div className="absolute inset-0">
        <MapComponent />
      </div>
      <div className="absolute top-24 left-4 glass rounded-xl px-3 py-2 text-sm">
        Tracking room: <span className="font-mono">{roomId}</span>
      </div>
    </div>
  );
}


