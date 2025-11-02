import mongoose from 'mongoose';

/**
 * Incident Model
 * Stores historical incidents/events that affect safety scores
 */
const incidentSchema = new mongoose.Schema({
  // Incident identification
  type: {
    type: String,
    required: true,
    enum: ['accident', 'crime', 'protest', 'roadwork', 'weather', 'emergency', 'crowd', 'other'],
    index: true
  },
  
  // Location data
  location: {
    type: String,
    required: true,
    index: true
  },
  latitude: {
    type: Number,
    required: false,
    index: true
  },
  longitude: {
    type: Number,
    required: false,
    index: true
  },
  
  // Incident details
  summary: {
    type: String,
    required: false
  },
  description: {
    type: String,
    required: false
  },
  
  // Source information
  source: {
    type: String,
    required: false, // e.g., 'twitter', 'news', 'n8n'
    default: 'n8n'
  },
  sourceId: {
    type: String,
    required: false, // Original ID from source system
  },
  
  // Severity and status
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'expired'],
    default: 'active',
    index: true
  },
  
  // Timestamps
  reportedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  resolvedAt: {
    type: Date,
    required: false
  },
  expiresAt: {
    type: Date,
    required: false, // Auto-expire old incidents
    index: true
  },
  
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
incidentSchema.index({ latitude: 1, longitude: 1 });
incidentSchema.index({ type: 1, status: 1, reportedAt: -1 });
incidentSchema.index({ location: 1, type: 1 });
incidentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-deletion

export default mongoose.model('Incident', incidentSchema);

