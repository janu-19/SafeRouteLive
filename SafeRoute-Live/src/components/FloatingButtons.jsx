import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendSOSAlert } from '../utils/api';

export default function FloatingButtons({ onRecalculate, location }) {
  const navigate = useNavigate();
  const [sosLoading, setSosLoading] = useState(false);

  const handleSOS = async () => {
    setSosLoading(true);
    try {
      const userLocation = location || { lat: 12.9716, lng: 77.5946 };
      await sendSOSAlert(userLocation, 'Emergency SOS Alert - User needs immediate assistance');
      // Navigate to SOS page or show confirmation
      navigate('/sos');
    } catch (error) {
      console.error('Failed to send SOS:', error);
      alert('Failed to send SOS alert. Please try again.');
    } finally {
      setSosLoading(false);
    }
  };

  const handleShareLive = () => {
    navigate('/share');
  };

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
      {/* SOS Button */}
      <button
        onClick={handleSOS}
        disabled={sosLoading}
        className="glass rounded-full w-14 h-14 flex items-center justify-center text-2xl hover:scale-110 transition-transform shadow-lg hover:shadow-red-500/50 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50"
        title="SOS Emergency"
      >
        {sosLoading ? '⏳' : '🔴'}
      </button>

      {/* Recalculate Route Button */}
      <button
        onClick={onRecalculate}
        className="glass rounded-full w-14 h-14 flex items-center justify-center text-2xl hover:scale-110 transition-transform shadow-lg hover:shadow-green-500/50 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50"
        title="Recalculate Safe Route"
      >
        🟢
      </button>

      {/* Share Live Location Button */}
      <button
        onClick={handleShareLive}
        className="glass rounded-full w-14 h-14 flex items-center justify-center text-2xl hover:scale-110 transition-transform shadow-lg hover:shadow-blue-500/50 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50"
        title="Share Live Location"
      >
        🔵
      </button>
    </div>
  );
}

