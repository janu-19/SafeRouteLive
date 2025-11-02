import mongoose from 'mongoose';

/**
 * User Model
 * Represents a user in the SafeRoute system
 * Supports both email/password and Google OAuth authentication
 */
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  
  // Password-based authentication (optional if using Google OAuth)
  phone: {
    type: String,
    required: false, // Not required for Google OAuth users
    unique: true,
    sparse: true, // Allows multiple nulls
    trim: true
  },
  password: {
    type: String,
    required: false // Not required for Google OAuth users
  },
  
  // Google OAuth fields
  googleId: {
    type: String,
    required: false,
    unique: true,
    sparse: true, // Allows multiple nulls
    index: true
  },
  googleEmail: {
    type: String,
    required: false,
    lowercase: true,
    trim: true
  },
  picture: {
    type: String, // Google profile picture URL
    required: false
  },
  
  // Authentication method
  authMethod: {
    type: String,
    enum: ['email', 'google'],
    default: 'email'
  },
  
  // User preferences and settings
  preferences: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });

export default mongoose.model('User', userSchema);

