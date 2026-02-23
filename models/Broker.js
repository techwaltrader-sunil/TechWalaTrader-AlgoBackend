
const mongoose = require('mongoose');

const brokerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true, // e.g., "Dhan", "Zerodha"
  },
  clientId: {
    type: String,
    required: true,
  },
  apiKey: {
    type: String,
    // Note: Production me hum ise Encrypt karenge, abhi simple rakhte hain
  },
  apiSecret: {
    type: String,
  },
  logo: {
    type: String, // Logo ka URL ya path frontend se aayega
  },
  status: {
    type: String,
    default: 'Not Connected', // Connected / Not Connected
  },
  isConnected: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  
  // 🔥 NAYE FIELDS (Jo Frontend me Terminal aur Engine ke liye chahiye)
  terminalOn: { 
    type: Boolean, 
    default: false 
  },
  engineOn: { 
    type: Boolean, 
    default: false 
  },
  performance: { 
    type: String, 
    default: "0.00" 
  }
});

module.exports = mongoose.model('Broker', brokerSchema);