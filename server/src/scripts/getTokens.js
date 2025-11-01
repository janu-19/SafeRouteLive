import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/saferoute';
const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-key-change-in-production';

// Debug: Show what JWT_SECRET is being used
console.log('🔑 Using JWT_SECRET:', JWT_SECRET ? JWT_SECRET.substring(0, 20) + '...' : 'NOT FOUND');

async function getTokens() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const users = await User.find({});
    
    console.log('\n📋 User Tokens (Copy these):');
    console.log('='.repeat(80));
    
    for (const user of users) {
      const token = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          name: user.name
        },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      console.log(`\n${user.name} (${user.email}):`);
      console.log(`Token: ${token}`);
      console.log(`\nlocalStorage.setItem('token', '${token}')`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

getTokens();

