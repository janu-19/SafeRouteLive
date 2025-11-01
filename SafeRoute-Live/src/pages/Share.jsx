import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Copy, Check, Share2 } from 'lucide-react';

export default function Share() {
  const navigate = useNavigate();
  const roomId = useMemo(() => Math.random().toString(36).slice(2, 8), []);
  const [linkCopied, setLinkCopied] = useState(false);
  const link = `${window.location.origin}/track/${roomId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = link;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Track my live location',
          text: 'Follow my live location',
          url: link
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto h-full flex items-center">
      <div className="glass rounded-2xl p-6 w-full">
        <div className="flex items-center gap-3 mb-4">
          <Share2 className="text-2xl text-blue-400" />
          <div className="text-xl font-semibold">Share Live Location</div>
        </div>
        <div className="mt-2 text-sm text-slate-300">
          Send this link to a friend so they can track your location in real-time.
        </div>
        
        <div className="mt-6 p-4 rounded-lg bg-black/40 border border-white/10">
          <div className="flex items-center justify-between gap-3">
            <div className="font-mono text-xs break-all flex-1">{link}</div>
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
              title="Copy link"
            >
              {linkCopied ? (
                <Check size={18} className="text-green-400" />
              ) : (
                <Copy size={18} className="text-slate-300" />
              )}
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={() => navigate(`/track/${roomId}`)}
            className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:brightness-110 transition-all font-semibold"
          >
            Start Tracking
          </button>
          <button
            onClick={handleShare}
            className="w-full px-4 py-2 rounded-lg glass hover:bg-white/10 transition-all flex items-center justify-center gap-2"
          >
            <Share2 size={18} />
            Share Link
          </button>
          <Link 
            to="/route-planner" 
            className="w-full px-4 py-2 rounded-lg glass hover:bg-white/10 transition-all text-center"
          >
            Back to Route Planner
          </Link>
        </div>

        {linkCopied && (
          <div className="mt-4 p-3 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center gap-2 text-sm text-green-300">
            <Check size={16} />
            Link copied to clipboard!
          </div>
        )}
      </div>
    </div>
  );
}


