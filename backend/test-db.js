const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Use Google DNS
require('dotenv').config();

const testConnection = async () => {
  const uri = process.env.MONGODB_URI;
  console.log('Attempting to connect to:', uri.split('@')[1]); // Only log the host part for security
  try {
    await mongoose.connect(uri);
    console.log('✅ Success! MongoDB is connected.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }
};

testConnection();
