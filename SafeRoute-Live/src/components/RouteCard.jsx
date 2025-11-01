import { motion } from 'framer-motion';
import { useState } from 'react';

export default function RouteCard({ 
  color = '#3b82f6', 
  name, 
  score, 
  distanceKm, 
  etaMin, 
  onSelect,
  metadata,
  isARecommended = false,
  index = 0,
  source = '',
  destination = '',
  geometry = null
}) {
  const safetyLabel = score > 75 ? 'Safe' : score >= 50 ? 'Moderate' : 'Risky';
  const isNight = metadata?.isNight || false;
  const isMonsoon = metadata?.isMonsoon || false;
  


  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.02 }}
      onClick={onSelect}
      className="glass w-full rounded-xl p-4 text-left hover:bg-white/10 transition-all border border-white/10 hover:border-white/20 relative overflow-hidden cursor-pointer"
    >
      {/* AI Recommended Badge */}
      {isARecommended && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-2 right-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"
        >
          🤖 AI Recommended
        </motion.div>
      )}
      
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <span>{name}</span>
          {/* Safety Trend Icons */}
          <div className="flex items-center gap-1">
            {isNight && (
              <motion.span
                initial={{ opacity: 0, rotate: -10 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg"
                title="Night time - Enhanced lighting weight applied"
              >
                🌙
              </motion.span>
            )}
            {isMonsoon && (
              <motion.span
                initial={{ opacity: 0, rotate: -10 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ delay: 0.3 }}
                className="text-lg"
                title="Monsoon season - Accident factor increased"
              >
                🌧️
              </motion.span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs px-2 py-1 rounded" style={{ 
            backgroundColor: score > 75 ? 'rgba(34, 197, 94, 0.2)' : score >= 50 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: score > 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'
          }}>
            {safetyLabel}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between text-sm mb-3">
        <span className="opacity-90">{distanceKm} km • {etaMin} min</span>
        <span className="opacity-70 font-semibold">Score: {score}</span>
      </div>

      
    </motion.div>
  );
}


