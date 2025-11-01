import { useState, useEffect } from 'react';
import { approveShareRequest, rejectShareRequest } from '../services/shareService';
import { X, Check, User } from 'lucide-react';

/**
 * ShareRequestToast Component
 * Displays incoming location sharing requests with Approve/Reject buttons
 */
export default function ShareRequestToast({ request, onClose, onApproved }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [action, setAction] = useState(null); // 'approving' | 'rejecting'

  const handleApprove = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setAction('approving');
    
    try {
      const response = await approveShareRequest(request.requestId);
      
      // Notify parent that request was approved
      if (onApproved) {
        onApproved(response);
      }
      
      // Close toast after a short delay
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);
    } catch (error) {
      alert(`Failed to approve request: ${error.message}`);
      setIsProcessing(false);
      setAction(null);
    }
  };

  const handleReject = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setAction('rejecting');
    
    try {
      await rejectShareRequest(request.requestId);
      
      // Close toast after a short delay
      setTimeout(() => {
        if (onClose) onClose();
      }, 1000);
    } catch (error) {
      alert(`Failed to reject request: ${error.message}`);
      setIsProcessing(false);
      setAction(null);
    }
  };

  // Auto-close after 30 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, 30000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="glass rounded-xl p-4 border border-blue-500/30 bg-blue-500/10 animate-slide-in">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          <User size={24} className="text-blue-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="font-semibold text-white">Location Share Request</div>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              disabled={isProcessing}
            >
              <X size={16} className="text-slate-400" />
            </button>
          </div>
          
          <div className="text-sm text-slate-300 mb-3">
            <span className="font-medium">{request.from?.name || 'Someone'}</span> wants to share their live location with you
          </div>

          {action === 'approving' ? (
            <div className="text-sm text-green-300 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-green-300 border-t-transparent rounded-full animate-spin"></div>
              Approving...
            </div>
          ) : action === 'rejecting' ? (
            <div className="text-sm text-red-300 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-red-300 border-t-transparent rounded-full animate-spin"></div>
              Rejecting...
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                <Check size={16} />
                Approve
              </button>
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                <X size={16} />
                Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

