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
                <div>
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    🤖 AI Safety Suggestion
                    {suggestion.realTimeData && (
                      <span className="text-xs font-normal flex items-center gap-1 text-green-400">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        Live
                      </span>
                    )}
                  </h3>
                  {suggestion.realTimeData?.lastUpdated && (
                    <p className="text-xs opacity-60 mt-1">
                      Updated: {new Date(suggestion.realTimeData.lastUpdated).toLocaleTimeString()}
                    </p>
                  )}
                </div>
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
                
                {/* Real-time Data Summary */}
                {suggestion.realTimeData && (
                  <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-lg p-4 border border-green-500/30">
                    <p className="font-semibold text-green-300 mb-2">📊 Real-time Conditions</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {suggestion.realTimeData.incidentsCount > 0 && (
                        <div className="flex items-center gap-1 text-green-400">
                          <span>✅</span>
                          <span>Route optimized — {suggestion.realTimeData.incidentsCount} incident{suggestion.realTimeData.incidentsCount > 1 ? 's' : ''} avoided</span>
                        </div>
                      )}
                      {suggestion.realTimeData.accidentsCount > 0 && (
                        <div className="flex items-center gap-1 text-green-400">
                          <span>✅</span>
                          <span>Safe navigation — {suggestion.realTimeData.accidentsCount} area{suggestion.realTimeData.accidentsCount > 1 ? 's' : ''} bypassed</span>
                        </div>
                      )}
                      {suggestion.realTimeData.weather && (
                        <div className="flex items-center gap-1">
                          <span>🌤️</span>
                          <span>{suggestion.realTimeData.weather.condition}</span>
                        </div>
                      )}
                      {suggestion.realTimeData.traffic && (
                        <div className="flex items-center gap-1">
                          <span>🚦</span>
                          <span>Traffic: {suggestion.realTimeData.traffic.level}</span>
                        </div>
                      )}
                      {suggestion.realTimeData.incidentsCount === 0 && suggestion.realTimeData.accidentsCount === 0 && (
                        <div className="col-span-2 flex items-center gap-1 text-green-400">
                          <span>✅</span>
                          <span>All clear — Optimal safety conditions confirmed</span>
                        </div>
                      )}
                    </div>
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

