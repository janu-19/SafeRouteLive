import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Route, Send, ChevronUp, ChevronDown, MessageCircle, LifeBuoy } from 'lucide-react';
import { sendSOSAlert } from '../utils/api';

export default function FloatingButtons({ onRecalculate, location, onFindSafeZones, loadingSafeZones = false }) {
  const navigate = useNavigate();
  const [sosLoading, setSosLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

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

  const handleAIChatbot = () => {
    // Open AI Chatbot - will create a modal or navigate to chatbot page
    navigate('/ai-chatbot');
  };

  return (
    <div className="absolute left-4 bottom-20 flex flex-col-reverse gap-3 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-12 h-12 rounded-full flex items-center justify-center 
                   bg-slate-800/90 hover:bg-slate-700 
                   border-2 border-slate-600/50 
                   backdrop-blur-sm shadow-lg 
                   transition-all duration-200 hover:scale-105"
        aria-label={isExpanded ? "Hide buttons" : "Show buttons"}
      >
        {isExpanded ? <ChevronDown size={20} className="text-white" /> : <ChevronUp size={20} className="text-white" />}
      </button>

      {/* Buttons Container */}
      <div className={`flex flex-col-reverse space-y-3 space-y-reverse transition-all duration-300 ${isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}>
        {/* SOS Alert Button */}
        <button
        onClick={handleSOS}
        disabled={sosLoading}
        className="btn-danger group relative w-14 h-14 rounded-full flex items-center justify-center 
                   hover:brightness-110 
                   active:scale-95 
                   shadow-lg 
                   hover:shadow-xl 
                   border-2 border-white/50 
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
        className="btn-success group relative w-14 h-14 rounded-full flex items-center justify-center 
                   hover:brightness-110 
                   active:scale-95 
                   shadow-lg 
                   hover:shadow-xl 
                   border-2 border-white/50 
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

      {/* AI Chatbot Button */}
      <button
        onClick={handleAIChatbot}
        className="btn-secondary group relative w-14 h-14 rounded-full flex items-center justify-center 
                   hover:brightness-110 
                   active:scale-95 
                   shadow-lg 
                   hover:shadow-xl 
                   border-2 border-white/50 
                   backdrop-blur-sm 
                   transition-all duration-200 
                   hover:scale-105"
        aria-label="AI Chatbot"
        title="AI Chatbot"
      >
        <MessageCircle 
          size={24} 
          className="text-white drop-shadow-sm" 
        />
        {/* Tooltip */}
        <span className="absolute right-full mr-3 px-3 py-1.5 rounded-lg 
                        bg-gray-900/95 text-white text-xs font-medium 
                        whitespace-nowrap opacity-0 group-hover:opacity-100 
                        transition-opacity duration-200 pointer-events-none
                        shadow-lg backdrop-blur-sm border border-white/10">
          AI Chatbot
          <span className="absolute left-full top-1/2 -translate-y-1/2 
                          border-4 border-transparent border-l-gray-900/95"></span>
        </span>
      </button>

      {/* Share Location Button */}
      <button
        onClick={handleShareLive}
        className="btn-primary group relative w-14 h-14 rounded-full flex items-center justify-center 
                   hover:brightness-110 
                   active:scale-95 
                   shadow-lg 
                   hover:shadow-xl 
                   border-2 border-white/50 
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

      {/* Find Safe Zones Button */}
      <button
        onClick={onFindSafeZones}
        disabled={loadingSafeZones}
        className="bg-gradient-to-br from-blue-500 to-cyan-500 group relative w-14 h-14 rounded-full flex items-center justify-center 
                   hover:brightness-110 
                   active:scale-95 
                   shadow-lg 
                   hover:shadow-xl 
                   border-2 border-white/50 
                   backdrop-blur-sm 
                   transition-all duration-200 
                   hover:scale-105
                   disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Find Safe Zones"
        title="Find Safe Zones 🛟"
      >
        {loadingSafeZones ? (
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
        ) : (
          <LifeBuoy 
            size={24} 
            className="text-white drop-shadow-sm" 
          />
        )}
        {/* Tooltip */}
        <span className="absolute right-full mr-3 px-3 py-1.5 rounded-lg 
                        bg-gray-900/95 text-white text-xs font-medium 
                        whitespace-nowrap opacity-0 group-hover:opacity-100 
                        transition-opacity duration-200 pointer-events-none
                        shadow-lg backdrop-blur-sm border border-white/10">
          Find Safe Zones 🛟
          <span className="absolute left-full top-1/2 -translate-y-1/2 
                          border-4 border-transparent border-l-gray-900/95"></span>
        </span>
      </button>
      </div>
    </div>
  );
}

