const mongoose = require('mongoose');

const deploymentSchema = new mongoose.Schema({
    strategyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Strategy', // Aapke Strategy model ka naam (agar alag ho to change kar lena)
        required: true
    },
    executionType: {
        type: String,
        enum: ['LIVE', 'FORWARD_TEST', 'PAPER'],
        required: true
    },
    brokers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Broker' // Broker model se link kiya
    }],
    multiplier: { type: Number, default: 1 },
    maxProfit: { type: Number, default: 0 },
    maxLoss: { type: Number, default: 0 },
    squareOffTime: { type: String, default: '15:15' },
    
    // Trading Engine is status ko check karega
    status: {
        type: String,
        enum: ['ACTIVE', 'STOPPED', 'COMPLETED', 'ERROR'],
        default: 'ACTIVE'
    },
    pnl: { type: Number, default: 0 } // Live P&L track karne ke liye
}, { timestamps: true });

module.exports = mongoose.model('Deployment', deploymentSchema);