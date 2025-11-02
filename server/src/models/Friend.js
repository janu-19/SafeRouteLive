import mongoose from 'mongoose';

/**
 * Friend Model
 * Represents a friendship between two users
 */
const friendSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'blocked'],
    default: 'pending',
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  acceptedAt: {
    type: Date,
    required: false
  }
}, {
  timestamps: true
});

// Compound index to ensure unique friendship pairs
friendSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// Prevent self-friendship
friendSchema.pre('save', function(next) {
  if (this.requester.toString() === this.recipient.toString()) {
    next(new Error('Cannot add yourself as a friend'));
  } else {
    next();
  }
});

export default mongoose.model('Friend', friendSchema);

