import { motion, AnimatePresence } from 'framer-motion';
import { submitFeedback } from '../utils/api';

export default function FeedbackModal({ isOpen, onClose, routeId, safetyScore }) {
  const handleFeedback = async (feedback) => {
    try {
      await submitFeedback(routeId, feedback, safetyScore);
      onClose();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="glass rounded-2xl p-6 max-w-md w-full border border-white/20">
              <h3 className="text-xl font-semibold mb-4">Did you feel safe?</h3>
              <p className="text-sm opacity-80 mb-6">
                Your feedback helps us improve route safety calculations.
              </p>
              
              <div className="flex gap-4">
                <button
                  onClick={() => handleFeedback('safe')}
                  className="flex-1 rounded-lg bg-gradient-to-r from-green-600 to-green-700 py-3 px-4 hover:brightness-110 transition-all flex items-center justify-center gap-2 text-lg font-semibold"
                >
                  ✅ Yes, Safe
                </button>
                <button
                  onClick={() => handleFeedback('unsafe')}
                  className="flex-1 rounded-lg bg-gradient-to-r from-red-600 to-red-700 py-3 px-4 hover:brightness-110 transition-all flex items-center justify-center gap-2 text-lg font-semibold"
                >
                  ❌ Unsafe
                </button>
              </div>
              
              <button
                onClick={onClose}
                className="mt-4 w-full text-sm opacity-60 hover:opacity-100 transition-opacity"
              >
                Skip
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

