import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

/**
 * Configure Google OAuth Strategy
 * Only initialize if credentials are provided
 */
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/auth/google/callback`
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
  }));
} else {
  console.log('⚠️  Google OAuth not configured - skipping Google authentication');
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

