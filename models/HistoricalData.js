// models/HistoricalData.js
const mongoose = require('mongoose');

const historicalDataSchema = new mongoose.Schema({
    symbol: { 
        type: String, 
        required: true,
        uppercase: true 
    }, // Ex: 'MIDCPNIFTY', 'BANKNIFTY'
    
    timeframe: { 
        type: String, 
        required: true 
    }, // Ex: '1m', '5m', '15m', '1d'
    
    timestamp: { 
        type: Date, 
        required: true 
    }, // Candle ka exact time
    
    open: { type: Number, required: true },
    high: { type: Number, required: true },
    low: { type: Number, required: true },
    close: { type: Number, required: true },
    volume: { type: Number, default: 0 }
}, { 
    timestamps: true 
});

// 🔥 THE MASTERSTROKE: Compound Unique Index
// Yeh 2 bade kaam karega:
// 1. Ek hi candle ko galti se 2 baar save hone se rokega (No Duplicates).
// 2. Jab aapka engine 1 saal ka data mangega, to yeh index query ko 10x fast kar dega!
historicalDataSchema.index({ symbol: 1, timeframe: 1, timestamp: 1 }, { unique: true });

module.exports = mongoose.model('HistoricalData', historicalDataSchema);