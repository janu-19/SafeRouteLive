import mongoose from 'mongoose';

/**
 * Connect to MongoDB
 */
export const connectDB = async () => {
  try {
    // Use provided MongoDB URI or default
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://pramodhkumar782006:pramodh786@cluster0.a0woy.mongodb.net/saferoute?retryWrites=true&w=majority&appName=Cluster0';
    
    // Add connection timeout to prevent hanging
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('⚠️  Server will continue without database connection');
    console.error('   Some features requiring database may not work');
    // Don't exit - let the server start anyway
    // process.exit(1);
    throw error; // Re-throw but don't exit
  }
};

