import jwt from 'jsonwebtoken';

/**
 * JWT Authentication Middleware
 * Verifies Authorization: Bearer <token> header
 * Attaches user info to req.user
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Missing or invalid Authorization header'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Token not provided'
      });
    }

    // Verify JWT token
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('JWT_SECRET not configured');
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'JWT secret not configured'
      });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
    
      // Attach user info to request
      req.userId = decoded.userId || decoded.id;
      req.user = {
        id: decoded.userId || decoded.id,
        email: decoded.email,
        name: decoded.name
      };

      next();
    } catch (verifyError) {
      // Log the actual error for debugging
      console.error('JWT verification error:', verifyError.message);
      console.error('Token provided:', token.substring(0, 50) + '...');
      console.error('JWT_SECRET configured:', JWT_SECRET ? 'Yes' : 'No');
      
      if (verifyError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          error: 'Invalid token',
          message: 'Token verification failed',
          details: verifyError.message
        });
      }
    
      if (verifyError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Token expired',
          message: 'Please login again'
        });
      }

      console.error('Auth middleware error:', verifyError);
      return res.status(500).json({ 
        error: 'Authentication error',
        message: 'Failed to authenticate request'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication error',
      message: 'Failed to authenticate request'
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 * Useful for socket handshake validation
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const JWT_SECRET = process.env.JWT_SECRET;
      
      if (JWT_SECRET) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          req.userId = decoded.userId || decoded.id;
          req.user = {
            id: decoded.userId || decoded.id,
            email: decoded.email,
            name: decoded.name
          };
        } catch (err) {
          // Token invalid but continue without auth
          console.warn('Optional auth failed:', err.message);
        }
      }
    }
    
    next();
  } catch (error) {
    // Continue without auth
    next();
  }
};

