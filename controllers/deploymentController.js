const Deployment = require('../models/Deployment');
const Strategy = require('../models/Strategy'); // Strategy model bhi chahiye

// @desc    Deploy a strategy
// @route   POST /api/deployments
const deployStrategy = async (req, res) => {
    try {
        const { strategyId, executionType, brokers, multiplier, maxProfit, maxLoss, squareOffTime } = req.body;

        // 1. Check if already deployed and ACTIVE
        const existingDeployment = await Deployment.findOne({ strategyId, status: 'ACTIVE' });
        if (existingDeployment) {
            return res.status(400).json({ message: "This strategy is already deployed and running!" });
        }

        // 2. Create new Deployment
        const newDeployment = await Deployment.create({
            strategyId,
            executionType,
            brokers,
            multiplier,
            maxProfit,
            maxLoss,
            squareOffTime,
            status: 'ACTIVE' // Jaise hi deploy hoga, engine isko read karna shuru kar dega
        });

        res.status(201).json({
            success: true,
            message: `Strategy successfully deployed in ${executionType} mode!`,
            data: newDeployment
        });

    } catch (error) {
        console.error("Deployment Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all active deployments
// @route   GET /api/deployments/active
const getActiveDeployments = async (req, res) => {
    try {
        const activeDeployments = await Deployment.find({ status: 'ACTIVE' })
            .populate('strategyId') // Strategy ki poori details le aayega
            .populate('brokers');   // Broker ki details (API keys etc.) le aayega
            
        res.json({ success: true, data: activeDeployments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    deployStrategy,
    getActiveDeployments
};