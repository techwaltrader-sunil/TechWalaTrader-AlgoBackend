// const mongoose = require('mongoose');

// const deploymentSchema = new mongoose.Schema({
//     strategyId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Strategy', // Aapke Strategy model ka naam (agar alag ho to change kar lena)
//         required: true
//     },
//     executionType: {
//         type: String,
//         enum: ['LIVE', 'FORWARD_TEST', 'PAPER'],
//         required: true
//     },
//     brokers: [{
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Broker' // Broker model se link kiya
//     }],
//     multiplier: { type: Number, default: 1 },
//     maxProfit: { type: Number, default: 0 },
//     maxLoss: { type: Number, default: 0 },
//     squareOffTime: { type: String, default: '15:15' },
    
//     // Trading Engine is status ko check karega
//     status: {
//         type: String,
//         enum: ['ACTIVE', 'STOPPED', 'COMPLETED', 'ERROR'],
//         default: 'ACTIVE'
//     },
//     pnl: { type: Number, default: 0 } // Live P&L track karne ke liye
// }, { timestamps: true });

// module.exports = mongoose.model('Deployment', deploymentSchema);



// const mongoose = require('mongoose');

// const deploymentSchema = new mongoose.Schema({
//     strategyId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Strategy', 
//         required: true
//     },
//     executionType: {
//         type: String,
//         enum: ['LIVE', 'FORWARD_TEST', 'PAPER'],
//         required: true
//     },
//     brokers: [{
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Broker' 
//     }],
//     multiplier: { type: Number, default: 1 },
//     maxProfit: { type: Number, default: 0 },
//     maxLoss: { type: Number, default: 0 },
//     squareOffTime: { type: String, default: '15:15' },
    
//     status: {
//         type: String,
//         enum: ['ACTIVE', 'STOPPED', 'COMPLETED', 'ERROR'],
//         default: 'ACTIVE'
//     },
//     pnl: { type: Number, default: 0 }, 
    
//     // ==========================================
//     // 🔥 PHASE 2: REAL P&L TRACKING FIELDS 🔥
//     // ==========================================
//     tradedSecurityId: { type: String, default: null }, // e.g., "35012" (Dhan ID)
//     tradedExchange: { type: String, default: "NSE_FNO" }, // NSE_EQ ya NSE_FNO
//     tradedQty: { type: Number, default: 0 }, // Kitni quantity li gayi
//     entryPrice: { type: Number, default: 0 }, // Kis premium par trade execute hua
//     tradeAction: { type: String, enum: ['BUY', 'SELL'], default: 'BUY' }, // BUY ya SELL
//     tradedSymbol: { type: String },
//     exitPrice: { type: Number, default: 0 },
//     paperSlPrice: { type: Number, default: 0 }, // 👈 NEW: For Paper Trade Pre-Punch SL
//     realizedPnl: { type: Number, default: 0 },
//     waitReferencePrice: { type: Number, default: 0 },
    
// }, { timestamps: true });

// module.exports = mongoose.model('Deployment', deploymentSchema);




// const mongoose = require('mongoose');

// const deploymentSchema = new mongoose.Schema({
//     strategyId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Strategy', 
//         required: true
//     },
//     executionType: {
//         type: String,
//         enum: ['LIVE', 'FORWARD_TEST', 'PAPER'],
//         required: true
//     },
//     brokers: [{
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Broker' 
//     }],
//     multiplier: { type: Number, default: 1 },
//     maxProfit: { type: Number, default: 0 },
//     maxLoss: { type: Number, default: 0 },
//     squareOffTime: { type: String, default: '15:15' },
    
//     status: {
//         type: String,
//         enum: ['ACTIVE', 'STOPPED', 'COMPLETED', 'ERROR'],
//         default: 'ACTIVE'
//     },
//     pnl: { type: Number, default: 0 }, 
    
//     // ==========================================
//     // 🔥 PHASE 2: REAL P&L TRACKING FIELDS 🔥
//     // ==========================================
//     tradedSecurityId: { type: String, default: null }, // e.g., "35012" (Dhan ID)
//     tradedExchange: { type: String, default: "NSE_FNO" }, // NSE_EQ ya NSE_FNO
//     tradedQty: { type: Number, default: 0 }, // Kitni quantity li gayi
//     entryPrice: { type: Number, default: 0 }, // Kis premium par trade execute hua
//     tradeAction: { type: String, enum: ['BUY', 'SELL'], default: 'BUY' }, // BUY ya SELL
//     tradedSymbol: { type: String },
//     exitPrice: { type: Number, default: 0 },
//     paperSlPrice: { type: Number, default: 0 }, // 👈 NEW: For Paper Trade Pre-Punch SL
//     realizedPnl: { type: Number, default: 0 },
//     waitReferencePrice: { type: Number, default: 0 },
//     exitRemarks: { type: String, default: 'COMPLETED' }
    
// }, { timestamps: true });

// module.exports = mongoose.model('Deployment', deploymentSchema);


const mongoose = require('mongoose');

// ==========================================
// 🧩 NEW: Individual Leg Schema (Har leg ka data alag save hoga)
// ==========================================
const executedLegSchema = new mongoose.Schema({
    securityId: { type: String, required: true }, // e.g., "35012" (Dhan ID)
    exchange: { type: String, default: "NSE_FNO" }, // NSE_EQ ya NSE_FNO
    symbol: { type: String, required: true }, // e.g., "BANKNIFTY 28 APR 56200 PUT"
    action: { type: String, enum: ['BUY', 'SELL'], required: true }, // BUY ya SELL
    quantity: { type: Number, required: true }, // Kitni quantity
    entryPrice: { type: Number, default: 0 }, // Kis premium par trade execute hua
    exitPrice: { type: Number, default: 0 }, // Square-off price
    status: { type: String, enum: ['ACTIVE', 'COMPLETED'], default: 'ACTIVE' }, // Leg ka apna status
    exitReason: { type: String, default: '' }, // Is specific leg ka exit reason (e.g., SL Hit)
    paperSlPrice: { type: Number, default: 0 }, // For Paper Trade Pre-Punch SL
    waitReferencePrice: { type: Number, default: 0 }, // Wait & Trade reference price
    livePnl: { type: Number, default: 0 }, // UI me har leg ka PnL dikhane ke liye
    isSlMovedToCost: { type: Boolean, default: false }
});

// ==========================================
// 🚀 MAIN DEPLOYMENT SCHEMA
// ==========================================
const deploymentSchema = new mongoose.Schema({
    strategyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Strategy', 
        required: true
    },
    executionType: {
        type: String,
        enum: ['LIVE', 'FORWARD_TEST', 'PAPER'],
        required: true
    },
    brokers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Broker' 
    }],
    multiplier: { type: Number, default: 1 },
    maxProfit: { type: Number, default: 0 },
    maxLoss: { type: Number, default: 0 },
    squareOffTime: { type: String, default: '15:15' },
    
    // Overall Strategy Status
    status: {
        type: String,
        enum: ['ACTIVE', 'STOPPED', 'COMPLETED', 'PARTIALLY_COMPLETED', 'ERROR'], // 👈 PARTIALLY_COMPLETED joda gaya hai
        default: 'ACTIVE'
    },
    pnl: { type: Number, default: 0 }, // Total PnL (Dono legs ka milakar)
    realizedPnl: { type: Number, default: 0 },
    exitRemarks: { type: String, default: 'COMPLETED' }, // Overall exit reason
    
    // ==========================================
    // 🔥 PHASE 3: MULTI-LEG TRACKING ARRAY 🔥
    // ==========================================
    // Purane single fields hata diye gaye hain, ab har trade ek array me push hoga.
    executedLegs: [executedLegSchema]
    
}, { timestamps: true });

module.exports = mongoose.model('Deployment', deploymentSchema);