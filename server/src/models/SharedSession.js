import mongoose from 'mongoose';

/**
 * SharedSession Model
 * Represents an active location sharing session between users
 * Includes TTL index for automatic expiration
 */
const sharedSessionSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShareRequest',
    required: false, // Optional - direct shares don't have a request
    unique: true,
    sparse: true // Only enforce uniqueness when requestId exists
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: { expireAfterSeconds: 0 } // TTL will be set dynamically based on SHARE_SESSION_TTL_MINUTES
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  },
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  revokedAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// Ensure participants array has exactly 2 users
sharedSessionSchema.pre('save', function(next) {
  if (this.participants.length !== 2) {
    return next(new Error('SharedSession must have exactly 2 participants'));
  }
  next();
});

export default mongoose.model('SharedSession', sharedSessionSchema);

