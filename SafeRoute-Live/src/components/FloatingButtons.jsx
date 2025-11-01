import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Route, Send } from 'lucide-react';
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
    <div className="absolute right-4 bottom-20 flex flex-col space-y-3 z-50">
      {/* SOS Alert Button */}
      <button
        onClick={handleSOS}
        disabled={sosLoading}
        className="group relative w-14 h-14 rounded-full flex items-center justify-center 
                   bg-gradient-to-br from-red-500/90 to-red-600/90 
                   hover:from-red-600 hover:to-red-700 
                   active:scale-95 
                   shadow-lg shadow-red-500/30 
                   hover:shadow-xl hover:shadow-red-500/50 
                   border-2 border-red-400/50 
                   backdrop-blur-sm 
                   transition-all duration-200 
                   disabled:opacity-50 disabled:cursor-not-allowed
                   hover:scale-105"
        aria-label="SOS Emergency Alert"
        title="SOS"
      >
        <AlertTriangle 
          size={24} 
          className="text-white drop-shadow-sm group-hover:animate-pulse" 
        />
        {/* Tooltip */}
        <span className="absolute right-full mr-3 px-3 py-1.5 rounded-lg 
                        bg-gray-900/95 text-white text-xs font-medium 
                        whitespace-nowrap opacity-0 group-hover:opacity-100 
                        transition-opacity duration-200 pointer-events-none
                        shadow-lg backdrop-blur-sm border border-white/10">
          SOS
          <span className="absolute left-full top-1/2 -translate-y-1/2 
                          border-4 border-transparent border-l-gray-900/95"></span>
        </span>
      </button>

      {/* Find Route Button */}
      <button
        onClick={onRecalculate}
        className="group relative w-14 h-14 rounded-full flex items-center justify-center 
                   bg-gradient-to-br from-green-500/90 to-emerald-600/90 
                   hover:from-green-600 hover:to-emerald-700 
                   active:scale-95 
                   shadow-lg shadow-green-500/30 
                   hover:shadow-xl hover:shadow-green-500/50 
                   border-2 border-green-400/50 
                   backdrop-blur-sm 
                   transition-all duration-200 
                   hover:scale-105"
        aria-label="Find Route"
        title="Find Route"
      >
        <Route 
          size={24} 
          className="text-white drop-shadow-sm" 
        />
        {/* Tooltip */}
        <span className="absolute right-full mr-3 px-3 py-1.5 rounded-lg 
                        bg-gray-900/95 text-white text-xs font-medium 
                        whitespace-nowrap opacity-0 group-hover:opacity-100 
                        transition-opacity duration-200 pointer-events-none
                        shadow-lg backdrop-blur-sm border border-white/10">
          Find Route
          <span className="absolute left-full top-1/2 -translate-y-1/2 
                          border-4 border-transparent border-l-gray-900/95"></span>
        </span>
      </button>

      {/* Share Location Button */}
      <button
        onClick={handleShareLive}
        className="group relative w-14 h-14 rounded-full flex items-center justify-center 
                   bg-gradient-to-br from-blue-500/90 to-indigo-600/90 
                   hover:from-blue-600 hover:to-indigo-700 
                   active:scale-95 
                   shadow-lg shadow-blue-500/30 
                   hover:shadow-xl hover:shadow-blue-500/50 
                   border-2 border-blue-400/50 
                   backdrop-blur-sm 
                   transition-all duration-200 
                   hover:scale-105"
        aria-label="Share Location"
        title="Share Location"
      >
        <Send 
          size={24} 
          className="text-white drop-shadow-sm" 
        />
        {/* Tooltip */}
        <span className="absolute right-full mr-3 px-3 py-1.5 rounded-lg 
                        bg-gray-900/95 text-white text-xs font-medium 
                        whitespace-nowrap opacity-0 group-hover:opacity-100 
                        transition-opacity duration-200 pointer-events-none
                        shadow-lg backdrop-blur-sm border border-white/10">
          Share Location
          <span className="absolute left-full top-1/2 -translate-y-1/2 
                          border-4 border-transparent border-l-gray-900/95"></span>
        </span>
      </button>
    </div>
  );
}

