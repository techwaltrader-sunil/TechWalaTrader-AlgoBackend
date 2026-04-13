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



const mongoose = require('mongoose');

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
    
    status: {
        type: String,
        enum: ['ACTIVE', 'STOPPED', 'COMPLETED', 'ERROR'],
        default: 'ACTIVE'
    },
    pnl: { type: Number, default: 0 }, 
    
    // ==========================================
    // 🔥 PHASE 2: REAL P&L TRACKING FIELDS 🔥
    // ==========================================
    tradedSecurityId: { type: String, default: null }, // e.g., "35012" (Dhan ID)
    tradedExchange: { type: String, default: "NSE_FNO" }, // NSE_EQ ya NSE_FNO
    tradedQty: { type: Number, default: 0 }, // Kitni quantity li gayi
    entryPrice: { type: Number, default: 0 }, // Kis premium par trade execute hua
    tradeAction: { type: String, enum: ['BUY', 'SELL'], default: 'BUY' }, // BUY ya SELL
    tradedSymbol: { type: String },
    exitPrice: { type: Number, default: 0 },
    paperSlPrice: { type: Number, default: 0 }, // 👈 NEW: For Paper Trade Pre-Punch SL
    realizedPnl: { type: Number, default: 0 },
    waitReferencePrice: { type: Number, default: 0 },
    
}, { timestamps: true });

module.exports = mongoose.model('Deployment', deploymentSchema);