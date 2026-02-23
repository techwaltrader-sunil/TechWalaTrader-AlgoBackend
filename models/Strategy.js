

const mongoose = require('mongoose');

const strategySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true, // e.g., "Time Based", "Indicator Based"
  },
  status: {
    type: String,
    default: 'Inactive', // Active / Inactive
  },
  // ✅ NEW FIELD ADDED
  isSignalActive: { type: Boolean, default: false },

  configuredAlerts: { type: [String], default: [] },
  
  createdDate: {
    type: Date,
    default: Date.now,
  },
  // 🔥 The Power Move: Store complex logic in a flexible 'data' object
  data: {
    instruments: { type: Array, default: [] },    // Stores NIFTY, BANKNIFTY details
    legs: { type: Array, default: [] },           // Stores Buy/Sell legs with all details
    config: { type: Object, default: {} },        // Stores MIS, Days, Time settings
    advanceSettings: { type: Object, default: {} }, // Stores Trailing SL, Cost SL etc.
    entrySettings: { type: Object, default: {} },  // Stores Indicator conditions

    // ✅ NEW ADDITION: Risk Management Object
    riskManagement: { type: Object, default: {} }
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Future proofing for multi-user
  }
});

module.exports = mongoose.model('Strategy', strategySchema);