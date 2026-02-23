const AlgoTradeLog = require('../models/AlgoTradeLog');

const getAlgoTradeLogs = async (req, res) => {
    try {
        // .sort({ createdAt: -1 }) se naye trades sabse upar dikhenge
        const logs = await AlgoTradeLog.find().sort({ createdAt: -1 });
        res.status(200).json(logs);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch logs", error: error.message });
    }
};

module.exports = { getAlgoTradeLogs };