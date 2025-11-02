import mongoose from 'mongoose';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * Seed script to create demo users for testing
 * Run with: npm run seed
 */

import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/saferoute';
const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-key-change-in-production';

async function seed() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing users (optional - comment out if you want to keep existing data)
    // await User.deleteMany({});
    // console.log('🗑️  Cleared existing users');

    // Create demo users
    const users = [
      {
        name: 'Test User',
        email: 'test@saferoute.com',
        password: 'test123'
      },
      {
        name: 'Alice Johnson',
        email: 'alice@example.com',
        phone: '+1234567890',
        password: 'password123'
      },
      {
        name: 'Bob Smith',
        email: 'bob@example.com',
        phone: '+1234567891',
        password: 'password123'
      },
      {
        name: 'Charlie Brown',
        email: 'charlie@example.com',
        phone: '+1234567892',
        password: 'password123'
      }
    ];

    const createdUsers = [];

    for (const userData of users) {
      // Check if user already exists
      let user = await User.findOne({ email: userData.email });
      
      if (!user) {
        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        // Create user - don't include phone if not provided
        const userObj = {
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          authMethod: 'email'
        };
        
        // Only add phone if provided
        if (userData.phone && userData.phone.trim()) {
          userObj.phone = userData.phone.trim();
        }
        
        user = new User(userObj);
        
        await user.save();
        console.log(`✅ Created user: ${user.name} (${user.email})`);
      } else {
        console.log(`⏭️  User already exists: ${user.name} (${user.email})`);
      }

      // Generate JWT token for testing
      const token = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          name: user.name
        },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      createdUsers.push({
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        token: token
      });
    }

    console.log('\n📋 Demo Users Created:');
    console.log('='.repeat(80));
    createdUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Phone: ${user.phone}`);
      console.log(`   Password: password123`);
      console.log(`   User ID: ${user.id}`);
      console.log(`   JWT Token: ${user.token}`);
      console.log(`   `);
      console.log(`   Copy this command to browser console:`);
      console.log(`   localStorage.setItem('token', '${user.token}')`);
    });

    console.log('\n✅ Seed script completed successfully!');
    console.log('\n💡 Use these tokens in your frontend localStorage or API requests:');
    console.log('   localStorage.setItem("token", "<token>")');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();

