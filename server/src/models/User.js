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

// Fix phone index - ensure sparse index is used
// The schema already has sparse: true, but we need to ensure the index exists
userSchema.index({ phone: 1 }, { unique: true, sparse: true });

const User = mongoose.model('User', userSchema);

// Fix old phone_1 index after connection
// This will run once when the database connects
if (mongoose.connection.readyState === 1) {
  fixPhoneIndex();
} else {
  mongoose.connection.once('connected', fixPhoneIndex);
}

async function fixPhoneIndex() {
  try {
    const indexes = await User.collection.getIndexes();
    
    // Check if old non-sparse index exists
    if (indexes.phone_1 && !indexes.phone_1.sparse) {
      console.log('🔧 Fixing phone index: dropping old non-sparse index...');
      await User.collection.dropIndex('phone_1');
      console.log('✅ Dropped old phone_1 index');
      
      // Recreate with sparse (schema will auto-create, but we do it explicitly)
      await User.collection.createIndex({ phone: 1 }, { unique: true, sparse: true });
      console.log('✅ Created sparse phone index');
    } else if (indexes.phone_1 && indexes.phone_1.sparse) {
      console.log('✅ Phone index is already sparse');
    } else {
      // Index doesn't exist, let Mongoose create it from schema
      console.log('📝 Phone index will be created from schema');
    }
  } catch (err) {
    // Ignore "index not found" errors
    if (!err.message.includes('index not found') && !err.message.includes('ns not found')) {
      console.log('⚠️  Could not fix phone index:', err.message);
    }
  }
}

export default User;

