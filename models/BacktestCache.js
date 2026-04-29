const mongoose = require('mongoose');

const backtestCacheSchema = new mongoose.Schema({
    strategyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Strategy',
        required: true,
        index: true // 🔥 Super fast search ke liye index lagaya hai
    },
    period: {
        type: String, 
        required: true,
        enum: ['1M', '3M', '6M', '1Y', '2Y', 'Custom'] // Valid periods
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    // ==========================================
    // 🧠 THE BRAIN: Yahan engine ka result save hoga
    // ==========================================
    summary: {
        type: Object,
        required: true
    },
    equityCurve: {
        type: Array,
        required: true
    },
    daywiseBreakdown: {
        type: Array,
        required: true
    },
    // ==========================================
    // 🛡️ THE GATEKEEPER: Cache Invalidation ke liye
    // ==========================================
    strategyUpdatedAt: {
        type: Date,
        required: true
    }
}, { timestamps: true });

// Ek strategy ka ek period (jaise 1M) ek hi baar save hona chahiye
backtestCacheSchema.index({ strategyId: 1, period: 1 }, { unique: true });

module.exports = mongoose.model('BacktestCache', backtestCacheSchema);