// const Deployment = require('../models/Deployment');
// const Strategy = require('../models/Strategy'); // Strategy model bhi chahiye

// // @desc    Deploy a strategy
// // @route   POST /api/deployments
// const deployStrategy = async (req, res) => {
//     try {
//         const { strategyId, executionType, brokers, multiplier, maxProfit, maxLoss, squareOffTime } = req.body;

//         // 1. Check if already deployed and ACTIVE
//         const existingDeployment = await Deployment.findOne({ strategyId, status: 'ACTIVE' });
//         if (existingDeployment) {
//             return res.status(400).json({ message: "This strategy is already deployed and running!" });
//         }

//         // 2. Create new Deployment
//         const newDeployment = await Deployment.create({
//             strategyId,
//             executionType,
//             brokers,
//             multiplier,
//             maxProfit,
//             maxLoss,
//             squareOffTime,
//             status: 'ACTIVE' // Jaise hi deploy hoga, engine isko read karna shuru kar dega
//         });

//         res.status(201).json({
//             success: true,
//             message: `Strategy successfully deployed in ${executionType} mode!`,
//             data: newDeployment
//         });

//     } catch (error) {
//         console.error("Deployment Error:", error);
//         res.status(500).json({ success: false, message: error.message });
//     }
// };

// // @desc    Get all active deployments
// // @route   GET /api/deployments/active
// const getActiveDeployments = async (req, res) => {
//     try {
//         const activeDeployments = await Deployment.find({ status: 'ACTIVE' })
//             .populate('strategyId') // Strategy ki poori details le aayega
//             .populate('brokers');   // Broker ki details (API keys etc.) le aayega
            
//         res.json({ success: true, data: activeDeployments });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// };

// const stopDeployment = async (req, res) => {
//     try {
//         const deploymentId = req.params.id;
        
//         // Deployment ko database me dhundo aur status 'STOPPED' kardo
//         const deployment = await Deployment.findByIdAndUpdate(
//             deploymentId,
//             { status: 'STOPPED' },
//             { new: true }
//         );

//         if (!deployment) {
//             return res.status(404).json({ success: false, message: "Deployment not found" });
//         }

//         // Future Idea: Yahan aap Broker API ko "Square Off" ka command bhi bhej sakte hain

//         res.json({ success: true, message: "Algo stopped successfully!", data: deployment });
//     } catch (error) {
//         console.error("Stop Deployment Error:", error);
//         res.status(500).json({ success: false, message: error.message });
//     }
// };

// module.exports = {
//     deployStrategy,
//     getActiveDeployments,
//     stopDeployment
// };


const Deployment = require('../models/Deployment');
const Strategy = require('../models/Strategy'); 
const Broker = require('../models/Broker'); // Naya Import

// 🔥 Naye Imports (Dhan API aur Logger ke liye) 
// Apne folder structure ke hisab se path adjust kar lijiyega
const { fetchLiveLTP, placeDhanOrder } = require('../services/dhanService'); 
const { createAndEmitLog } = require('../engine/utils/logger'); 


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
            strategyId, executionType, brokers, multiplier,
            maxProfit, maxLoss, squareOffTime,
            status: 'ACTIVE' 
        });

        res.status(201).json({
            success: true, message: `Strategy successfully deployed in ${executionType} mode!`, data: newDeployment
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
            .populate('strategyId') 
            .populate('brokers');   
            
        res.json({ success: true, data: activeDeployments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==========================================================
// 🛑 UPDATED: STOP DEPLOYMENT & MANUAL SQUARE-OFF LOGIC
// ==========================================================
const stopDeployment = async (req, res) => {
    try {
        const deploymentId = req.params.id;
        const deployment = await Deployment.findById(deploymentId);

        if (!deployment) {
            return res.status(404).json({ success: false, message: "Deployment not found" });
        }

        if (deployment.status !== 'ACTIVE') {
            return res.status(400).json({ success: false, message: "Algo is already stopped or completed." });
        }

        let finalStatus = 'STOPPED';
        let exitRemarks = 'Manually stopped before any trade execution';

        // 🔥 CHECK: Kya koi trade open hai? (entryPrice > 0)
        if (deployment.tradedSecurityId && deployment.entryPrice > 0) {
            
            // Broker details nikalo
            const broker = await Broker.findById(deployment.brokers[0]); 
            
            if (broker) {
                const exitAction = deployment.tradeAction === 'BUY' ? 'SELL' : 'BUY';
                let exitLtp = 0;
                let orderSuccess = false;
                let orderIdToSave = "N/A";

                // 🟢 PAPER / FORWARD TEST MANUAL EXIT
                if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
                    exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId) || deployment.entryPrice;
                    orderSuccess = true;
                } 
                // 🔴 LIVE TRADE MANUAL EXIT (Send Market Order to Dhan)
                else if (deployment.executionType === 'LIVE') {
                    
                    // 🕒 MARKET TIME CHECK LIMIT
                    const moment = require('moment-timezone');
                    const currentTime = moment().tz("Asia/Kolkata").format("HH:mm");
                    const [currH, currM] = currentTime.split(':').map(Number);
                    const currentMinutes = (currH * 60) + currM;
                    
                    const isMarketClosed = currentMinutes >= 930 || currentMinutes < 555; // 15:30 (930 min) se zyada ya 09:15 (555 min) se kam

                    if (isMarketClosed) {
                        orderSuccess = false;
                        exitRemarks = "Algo Stopped. Live Market is CLOSED, so broker order was bypassed.";
                        finalStatus = 'STOPPED'; // Trade active reh gaya broker pe, isliye sirf algo stop karo
                        
                        console.log(`⚠️ User stopped algo at ${currentTime}, but Market is Closed!`);
                    } 
                    else {
                        // Market Open hai, Dhan ko order bhejo
                        const orderData = { 
                            action: exitAction, quantity: deployment.tradedQty, 
                            securityId: deployment.tradedSecurityId, segment: deployment.tradedExchange 
                        };
                        const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

                        if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
                            orderSuccess = true;
                            orderIdToSave = orderResponse.data.orderId;
                            
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId) || deployment.entryPrice;
                        } else {
                            exitRemarks = `Manual Stop Failed: ${orderResponse.data?.remarks || 'RMS Rejected'}`;
                        }
                    }
                }

                // 🧮 CALCULATE P&L AND MARK COMPLETED
                if (orderSuccess) {
                    const finalPnl = deployment.tradeAction === 'BUY' 
                        ? (exitLtp - deployment.entryPrice) * deployment.tradedQty 
                        : (deployment.entryPrice - exitLtp) * deployment.tradedQty;

                    deployment.exitPrice = exitLtp;
                    deployment.pnl = finalPnl;
                    deployment.realizedPnl = finalPnl;
                    
                    finalStatus = 'COMPLETED'; // 🔥 YAHI WO MAGIC WORD HAI JIS SE REPORT MEIN DIKHEGA
                    exitRemarks = "Manual Square-off via Stop Button";

                    // Log it to the UI
                    if (createAndEmitLog) {
                        await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'SUCCESS', `Manual Stop Executed. P&L: ₹${finalPnl.toFixed(2)}`, orderIdToSave);
                    }
                }
            }
        } else {
            // Agar koi trade liya hi nahi tha, to seedha STOPPED kardo bina P&L ke
            finalStatus = 'STOPPED'; 
            deployment.pnl = 0;
            deployment.realizedPnl = 0;
        }

        // 💾 Save everything to Database
        deployment.status = finalStatus;
        deployment.exitRemarks = exitRemarks;
        await deployment.save();

        res.json({ success: true, message: "Algo stopped and squared off successfully!", data: deployment });

    } catch (error) {
        console.error("Stop Deployment Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    deployStrategy,
    getActiveDeployments,
    stopDeployment
};