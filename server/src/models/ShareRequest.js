import mongoose from 'mongoose';

/**
 * ShareRequest Model
 * Represents a location sharing request between two users
 * Status: 'pending' | 'approved' | 'rejected' | 'revoked'
 */
const shareRequestSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'revoked'],
    default: 'pending',
    index: true
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  respondedAt: {
    type: Date
  },
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  revokedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
shareRequestSchema.index({ from: 1, to: 1, status: 1 });
shareRequestSchema.index({ to: 1, status: 1 });

export default mongoose.model('ShareRequest', shareRequestSchema);

