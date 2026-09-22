// const mongoose = require('mongoose');

// const behaviorRuleSchema = new mongoose.Schema({
//   strategyName: { 
//     type: String, 
//     required: true, 
//     default: "Dynamic Call Ratio Spread" 
//   },

//   // 1. Delta & Premium Logic
//   strikeSelection: {
//     targetDelta: {
//       min: { type: Number },
//       max: { type: Number }
//     },
//     dynamicPremiumOffset: {
//       enabled: { type: Boolean, default: false },
//       minDistance: { type: Number, default: 300 } // Safety net for expiry day
//     }
//   },

//   // 2. Liquidity & Round Number Shift
//   liquidityFilter: {
//     enforceRoundStrikes: { type: Boolean, default: true },
//     roundMultiple: { type: Number, default: 100 }, // 100 for Nifty, 1000 for BankNifty
//     shiftDirection: { type: String, enum: ['OTM', 'ITM', 'NONE'], default: 'OTM' }
//   },

//   // 3. Expiry & Timing
//   timingRules: {
//     relativeExpiry: { type: String, enum: ['CW', 'NW', 'CM', 'NM'], required: true },
//     preferredEntryDay: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] }
//   },

//   // 4. Risk Management (SL, TP & EOD Exit)
//   riskManagement: {
//     slPercent: {
//       min: { type: Number, required: true },
//       max: { type: Number, required: true }
//     },
//     tpPercent: {
//       min: { type: Number, required: true },
//       max: { type: Number, required: true }
//     },
//     emergencyEodExit: {
//       enabled: { type: Boolean, default: false },
//       startTime: { type: String, default: "15:00" },
//       endTime: { type: String, default: "15:20" },
//       mtmThresholdPercent: { type: Number, default: -0.5 }
//     }
//   },

//   // 5. Conditional Re-Entry (Weekend Theta & Premium Condition)
//   reEntryLogic: {
//     enabled: { type: Boolean, default: false },
//     trigger: { type: String, default: "ON_TRADE_CLOSE" },
//     cooldownAction: { type: String, default: "WAIT_FOR_DAY" },
//     targetDay: { type: String, default: "Friday" },
//     minAtmPremium: { type: Number, default: 300 }
//   },

//   isActive: { type: Boolean, default: true } // Auto-Backtest aur Live me toggle karne ke liye

// }, { timestamps: true });

// module.exports = mongoose.model('BehaviorRule', behaviorRuleSchema);



const mongoose = require('mongoose');

const behaviorRuleSchema = new mongoose.Schema({
  strategyName: {
    type: String,
    required: true,
    default: "Dynamic Call Ratio Spread"
  },

  // 1. Strike Selection (Delta, Premium & 🎯 NEW MULTI-LEG LOGIC)
  strikeSelection: {
    // 🎯 NAYA: Multi-Leg & Credit Seeker Data
    selectionBase: { type: String, enum: ['DELTA', 'PREMIUM', 'MULTI_LEG'], default: 'MULTI_LEG' },

    legsConfiguration: [{
        id: { type: Number },
        type: { type: String }, // CE / PE
        side: { type: String }, // B / S
        lots: { type: Number },
        reference: { type: String },
        multiplier: { type: Number },
        rawDistance: { type: Number }
    }],

    ensureNetCredit: { type: Boolean, default: true },
    minSpreadWidth: { type: Number, default: 300 },

    // 🎯 PURANA FALLBACK (Zaruri)
    targetDelta: {
      min: { type: Number },
      max: { type: Number }
    },
    dynamicPremiumOffset: {
      enabled: { type: Boolean, default: false },
      minDistance: { type: Number, default: 300 } // Safety net for expiry day
    }
  },

  // 2. Liquidity & Round Number Shift
  liquidityFilter: {
    enforceRoundStrikes: { type: Boolean, default: true },
    roundMultiple: { type: Number, default: 100 }, // 100 for Nifty, 1000 for BankNifty
    shiftDirection: { type: String, enum: ['OTM', 'ITM', 'NONE'], default: 'OTM' }
  },

  // 3. Expiry & Timing
  timingRules: {
    relativeExpiry: { type: String, enum: ['CW', 'NW', 'CM', 'NM'], required: true },
    preferredEntryDay: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] }
  },

  // 4. Risk Management (SL, TP & EOD Exit)
  riskManagement: {
    slPercent: {
      min: { type: Number, required: true },
      max: { type: Number, required: true }
    },
    tpPercent: {
      min: { type: Number, required: true },
      max: { type: Number, required: true }
    },
    emergencyEodExit: {
      enabled: { type: Boolean, default: false },
      startTime: { type: String, default: "15:00" },
      endTime: { type: String, default: "15:20" },
      mtmThresholdPercent: { type: Number, default: -0.5 }
    }
  },

  // 5. Conditional Re-Entry (Weekend Theta & Premium Condition)
  reEntryLogic: {
    enabled: { type: Boolean, default: false },
    trigger: { type: String, default: "ON_TRADE_CLOSE" },
    cooldownAction: { type: String, default: "WAIT_FOR_DAY" },
    targetDay: { type: String, default: "Friday" },
    minAtmPremium: { type: Number, default: 300 }
  },

  isActive: { type: Boolean, default: true } // Auto-Backtest aur Live me toggle karne ke liye

}, { timestamps: true });

module.exports = mongoose.model('BehaviorRule', behaviorRuleSchema);