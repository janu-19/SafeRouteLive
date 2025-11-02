import mongoose from 'mongoose';

/**
 * Connect to MongoDB
 */
export const connectDB = async () => {
  try {
    // Use provided MongoDB URI or default
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://pramodhkumar782006:pramodh786@cluster0.a0woy.mongodb.net/saferoute?retryWrites=true&w=majority&appName=Cluster0';
    
    const conn = await mongoose.connect(MONGODB_URI, {
      // MongoDB connection options
      // These are mostly handled by the connection string now
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

