import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables if not already loaded
// This ensures .env is loaded before we try to read GOOGLE_CLIENT_ID, etc.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env'); // Go up from src/config to server/.env

// Only load if not already loaded (avoid duplicates)
if (!process.env.GOOGLE_CLIENT_ID && !process.env.GOOGLE_CLIENT_SECRET) {
  console.log('📁 Loading .env from:', envPath);
  const envResult = dotenv.config({ path: envPath });
  if (envResult.error) {
    console.warn('⚠️  Could not load .env from passport.js:', envResult.error.message);
  } else {
    console.log('✅ .env loaded successfully in passport.js');
  }
} else {
  console.log('✅ Environment variables already loaded (from index.js)');
}

/**
 * Configure Google OAuth Strategy
 */
// Trim whitespace from environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID?.trim();
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET?.trim();
const GOOGLE_CALLBACK_URL = (process.env.GOOGLE_CALLBACK_URL?.trim() || `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/auth/google/callback`);

// Debug: Log raw values (without secrets)
console.log('🔍 Google OAuth Configuration Check:');
console.log('   GOOGLE_CLIENT_ID length:', GOOGLE_CLIENT_ID?.length || 0);
console.log('   GOOGLE_CLIENT_SECRET length:', GOOGLE_CLIENT_SECRET?.length || 0);
console.log('   GOOGLE_CLIENT_ID value:', GOOGLE_CLIENT_ID ? `${GOOGLE_CLIENT_ID.substring(0, 20)}...` : 'undefined');
console.log('   GOOGLE_CALLBACK_URL:', GOOGLE_CALLBACK_URL);

// Validate environment variables
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || GOOGLE_CLIENT_ID.length === 0 || GOOGLE_CLIENT_SECRET.length === 0) {
  console.error('⚠️  Google OAuth credentials missing or empty!');
  console.error('   GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.length > 0 ? '✅ Set' : '❌ Missing');
  console.error('   GOOGLE_CLIENT_SECRET:', GOOGLE_CLIENT_SECRET && GOOGLE_CLIENT_SECRET.length > 0 ? '✅ Set' : '❌ Missing');
  console.error('   Please check your .env file in the server directory');
  console.error('   Make sure there are no extra spaces or quotes around the values');
  console.log('⚠️  Google OAuth not configured - skipping Google authentication');
} else {
  console.log('✅ Google OAuth credentials loaded successfully');
  console.log('   Callback URL:', GOOGLE_CALLBACK_URL);
  
  try {
    console.log('🔄 Attempting to register Google OAuth strategy...');
    const strategy = new GoogleStrategy({
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });
        
        if (user) {
          // Update user info if needed
          user.googleEmail = profile.emails[0].value;
          user.picture = profile.photos[0]?.value;
          await user.save();
          return done(null, user);
        }
        
        // Check if user exists with this email (might have signed up with email)
        user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
          // Link Google account to existing user
          user.googleId = profile.id;
          user.googleEmail = profile.emails[0].value;
          user.picture = profile.photos[0]?.value;
          user.authMethod = 'google'; // Prefer Google auth if they use it
          await user.save();
          return done(null, user);
        }
        
        // Create new user
        user = await User.create({
          name: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id,
          googleEmail: profile.emails[0].value,
          picture: profile.photos[0]?.value,
          authMethod: 'google'
        });
        
        return done(null, user);
      } catch (error) {
        console.error('Passport Google strategy error:', error);
        return done(error, null);
      }
    });
    
    passport.use('google', strategy);
    console.log('✅ Google OAuth strategy registered successfully');
    console.log('   Strategy name: google');
    console.log('   Available strategies:', Object.keys(passport._strategies || {}));
  } catch (error) {
    console.error('❌ Error registering Google OAuth strategy:', error);
  }
}

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
