import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-key-change-in-production';

/**
 * Google OAuth Routes
 */

// Google OAuth login
router.get('/google', (req, res, next) => {
  // Check if Google strategy is registered
  const availableStrategies = Object.keys(passport._strategies || {});
  console.log('🔍 Available passport strategies:', availableStrategies);
  
  if (!passport._strategies || !passport._strategies.google) {
    console.error('❌ Google OAuth strategy not registered!');
    console.error('   Available strategies:', availableStrategies);
    console.error('   Environment check:');
    console.error('     GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Missing');
    console.error('     GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Missing');
    return res.status(500).json({
      error: 'Google OAuth not configured',
      message: 'Please check server configuration and .env file',
      debug: {
        availableStrategies,
        hasClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET
      }
    });
  }
  
  console.log('🔐 Google OAuth login initiated');
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res, next);
});

// Google OAuth callback
router.get('/google/callback',
  (req, res, next) => {
    console.log('🔄 Google OAuth callback received');
    passport.authenticate('google', { session: false }, (err, user, info) => {
      if (err) {
        console.error('❌ Google OAuth error:', err);
        const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendURL}/auth/callback?error=authentication_failed&message=${encodeURIComponent(err.message)}`);
      }
      
      if (!user) {
        console.error('❌ Google OAuth: No user returned');
        const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendURL}/auth/callback?error=authentication_failed&message=No user data received`);
      }
      
      // Store user in request for the next handler
      req.user = user;
      next();
    })(req, res, next);
  },
  async (req, res) => {
    try {
      const user = req.user;
      console.log('✅ Google OAuth success for user:', user.email);
      
      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          name: user.name
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      // Redirect to frontend with token
      const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
      console.log('🔗 Redirecting to frontend:', `${frontendURL}/auth/callback?token=***&success=true`);
      res.redirect(`${frontendURL}/auth/callback?token=${token}&success=true`);
    } catch (error) {
      console.error('❌ Google OAuth callback error:', error);
      const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendURL}/auth/callback?error=authentication_failed&message=${encodeURIComponent(error.message)}`);
    }
  }
);

/**
 * Email/Password Authentication
 */

// Register with email and password
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    
    console.log('📝 Registration attempt:', { 
      name: name ? '✓' : '✗', 
      email: email ? '✓' : '✗', 
      password: password ? '✓' : '✗',
      phone: phone ? '✓' : '✗',
      body: req.body
    });
    
    if (!name || !email || !password) {
      console.log('❌ Missing required fields:', { name, email, password: password ? 'provided' : 'missing' });
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Name, email, and password are required'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone: phone || null }]
    });
    
    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists',
        message: existingUser.email === email 
          ? 'Email already registered' 
          : 'Phone number already registered'
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone: phone || undefined,
      authMethod: 'email'
    });
    
    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        authMethod: user.authMethod
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: error.message
    });
  }
});

// Login with email and password
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }
    
    // Check if user has password (not Google-only account)
    if (!user.password) {
      return res.status(401).json({
        error: 'Invalid authentication method',
        message: 'Please login with Google'
      });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        authMethod: user.authMethod,
        picture: user.picture
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error.message
    });
  }
});

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        authMethod: user.authMethod,
        picture: user.picture,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({
      error: 'Invalid token',
      message: error.message
    });
  }
});

export default router;

