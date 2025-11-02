import mongoose from 'mongoose';

/**
 * Chat Message Model
 * Stores chat messages between users or in share sessions
 */
const chatMessageSchema = new mongoose.Schema({
  // Session or conversation ID (can be share session ID or user-to-user chat ID)
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  senderName: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  messageType: {
    type: String,
    enum: ['text', 'location', 'system'],
    default: 'text'
  },
  // For location messages
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String }
  },
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  deleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date,
    required: false
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
chatMessageSchema.index({ sessionId: 1, createdAt: -1 });
chatMessageSchema.index({ sender: 1, createdAt: -1 });
chatMessageSchema.index({ deleted: 1, createdAt: -1 });

export default mongoose.model('ChatMessage', chatMessageSchema);

