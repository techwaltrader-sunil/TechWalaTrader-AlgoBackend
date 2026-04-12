// File: src/engine/utils/logger.js
const AlgoTradeLog = require('../../models/AlgoTradeLog'); // Apne DB model ka sahi path daalein

// 🔥 Yahan se 'export' hata diya gaya hai
const createAndEmitLog = async (broker, symbol, action, quantity, status, message, orderId = "N/A") => {
    try {
        const newLog = await AlgoTradeLog.create({ 
            brokerId: broker._id, 
            brokerName: broker.name, 
            symbol, 
            action, 
            quantity, 
            status, 
            message, 
            orderId 
        });
        // Frontend ko live update bhejne ke liye
        if (global.io) global.io.emit('new-trade-log', newLog);
    } catch (err) { 
        console.error("❌ Log Error:", err.message); 
    }
};

// 🔥 Niche module.exports laga diya gaya hai
module.exports = {
    createAndEmitLog
};