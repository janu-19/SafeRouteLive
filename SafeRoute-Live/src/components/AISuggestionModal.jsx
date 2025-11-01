import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

export default function AISuggestionModal({ isOpen, onClose, suggestion }) {
  useEffect(() => {
    if (isOpen && suggestion) {
      // Auto-close after 10 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!suggestion) return null;

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
            <div className="glass rounded-2xl p-6 max-w-lg w-full border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  🤖 AI Safety Suggestion
                </h3>
                <button
                  onClick={onClose}
                  className="text-xl opacity-60 hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Recommendation */}
                <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-500/30">
                  <p className="font-semibold text-blue-300 mb-2">💡 Recommendation</p>
                  <p className="text-sm">{suggestion.recommendationText}</p>
                </div>
                
                {/* Best Departure Time */}
                <div className="bg-purple-500/20 rounded-lg p-4 border border-purple-500/30">
                  <p className="font-semibold text-purple-300 mb-2">⏰ Best Departure Time</p>
                  <p className="text-lg font-bold mb-1">{suggestion.bestDepartureTime.formatted}</p>
                  <p className="text-xs opacity-80">{suggestion.bestDepartureTime.reason}</p>
                </div>
                
                {/* Suggestions List */}
                {suggestion.suggestions && suggestion.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold opacity-80">Additional Tips:</p>
                    <ul className="space-y-2">
                      {suggestion.suggestions.map((tip, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="text-sm flex items-start gap-2"
                        >
                          <span className="text-lg">•</span>
                          <span>{tip}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Current Conditions */}
                {suggestion.currentConditions && (
                  <div className="flex gap-2 text-xs opacity-60">
                    {suggestion.currentConditions.isNight && <span>🌙 Night Time</span>}
                    {suggestion.currentConditions.isMonsoon && <span>🌧️ Monsoon</span>}
                  </div>
                )}
              </div>
              
              <button
                onClick={onClose}
                className="mt-6 w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 py-2 hover:brightness-110 transition-all font-semibold"
              >
                Got it!
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

