const mongoose = require('mongoose');

const backtestCacheSchema = new mongoose.Schema({
    strategyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Strategy', required: true },
    configHash: { type: String, required: true }, // 🔐 The unique fingerprint
    date: { type: String, required: true }, // e.g., "2026-04-15"
    
    // Day Results
    trades: { type: Array, default: [] }, 
    dailyPnL: { type: Number, default: 0 },
    hasTradedTimeBased: { type: Boolean, default: false } // Time-based strategies ke liye
}, { timestamps: true });

// 🔥 Super Fast Search ke liye Compound Index
backtestCacheSchema.index({ strategyId: 1, configHash: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('BacktestCache', backtestCacheSchema);