const mongoose = require('mongoose');

const algoTradeLogSchema = new mongoose.Schema({
    brokerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Broker',
        required: true 
    },
    brokerName: { type: String, required: true },
    symbol: { type: String, required: true },
    action: { type: String, required: true }, // BUY ya SELL
    quantity: { type: Number, required: true },
    status: { type: String, enum: ['SUCCESS', 'FAILED'], required: true },
    message: { type: String }, // Error aane par error message, success par success message
    orderId: { type: String }, // Dhan ka aayega agar success hua to
    createdAt: { type: Date, default: Date.now }
}, { 
    // 🔥 Mongoose ko explicitly bata rahe hain ki collection ka naam kya rakhna hai
    collection: 'algo_trade_logs' 
});

module.exports = mongoose.model('AlgoTradeLog', algoTradeLogSchema);