import { Link } from 'react-router-dom';
import { AlertCircle, Share2, Navigation } from 'lucide-react';

/**
 * Controls Component
 * Floating action buttons for SOS, Share, and Recenter
 */
function Controls({ onRecenter, onShare, location, map }) {
  const handleRecenter = () => {
    if (onRecenter && location && map) {
      onRecenter(location);
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare();
    }
  };

  return (
    <div className="absolute bottom-6 right-6 flex flex-col gap-3 z-10">
      {/* Recenter Button */}
      <button
        onClick={handleRecenter}
        disabled={!location || !map}
        className="p-4 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 active:scale-95 transition-all shadow-lg border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Recenter map to your location"
        title="Recenter to your location"
      >
        <Navigation size={24} className="text-slate-100" />
      </button>

      {/* Share Button */}
      <button
        onClick={handleShare}
        className="p-4 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 active:scale-95 transition-all shadow-lg border border-white/20"
        aria-label="Share your location"
        title="Share location"
      >
        <Share2 size={24} className="text-slate-100" />
      </button>

      {/* SOS Button */}
      <Link
        to="/sos"
        className="p-4 bg-rose-600/90 backdrop-blur-md rounded-full hover:bg-rose-600 active:scale-95 transition-all shadow-lg border border-rose-400/30"
        aria-label="Emergency SOS"
        title="Emergency SOS"
      >
        <AlertCircle size={24} className="text-white" />
      </Link>
    </div>
  );
}

export default Controls;
