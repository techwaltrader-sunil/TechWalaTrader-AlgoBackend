

// const cron = require('node-cron');
// const moment = require('moment-timezone');
// const axios = require('axios'); 
// const Deployment = require('../models/Deployment');
// const Broker = require('../models/Broker');
// const AlgoTradeLog = require('../models/AlgoTradeLog'); 
// const { placeDhanOrder } = require('../services/dhanService');
// const { getOptionSecurityId } = require('../services/instrumentService');

// console.log("🚀 Trading Engine Initialized...");

// const getStrikeStep = (symbol) => {
//     const sym = symbol.toUpperCase();
//     if (sym.includes("BANKNIFTY")) return 100;
//     if (sym.includes("FINNIFTY")) return 50;
//     if (sym.includes("MIDCPNIFTY")) return 25; 
//     if (sym.includes("NIFTY")) return 50;
//     if (sym.includes("SENSEX")) return 100;
//     return 50; 
// };

// const fetchLivePrice = async (symbol) => {
//     try {
//         let ticker = "";
//         const upperSymbol = symbol.toUpperCase();

//         if (upperSymbol.includes("BANKNIFTY")) ticker = "^NSEBANK";
//         else if (upperSymbol.includes("FINNIFTY")) ticker = "NIFTY_FIN_SERVICE.NS"; 
//         else if (upperSymbol.includes("MIDCPNIFTY")) ticker = "NIFTY_MIDCAP_SELECT.NS"; 
//         else if (upperSymbol.includes("NIFTY")) ticker = "^NSEI";
//         else if (upperSymbol.includes("SENSEX")) ticker = "^BSESN";
//         else return null;

//         const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m`;
//         const response = await axios.get(url, {
//             headers: { 'User-Agent': 'Mozilla/5.0' }
//         });

//         if (!response.data.chart.result) return null;
//         return response.data.chart.result[0].meta.regularMarketPrice;
//     } catch (error) {
//         console.error("❌ Error fetching Real-time LTP:", error.message);
//         return null; 
//     }
// };

// const createAndEmitLog = async (broker, symbol, action, quantity, status, message, orderId = "N/A") => {
//     try {
//         const newLog = await AlgoTradeLog.create({
//             brokerId: broker._id,
//             brokerName: broker.name,
//             symbol: symbol,
//             action: action,
//             quantity: quantity,
//             status: status,
//             message: message,
//             orderId: orderId
//         });

//         if (global.io) {
//             global.io.emit('new-trade-log', newLog);
//         }
//     } catch (err) {
//         console.error("❌ Failed to save Log in DB:", err.message);
//     }
// };

// cron.schedule('*/10 * * * * *', async () => {
//     try {
//         const currentTime = moment().tz("Asia/Kolkata").format("HH:mm"); 
//         const activeDeployments = await Deployment.find({ status: 'ACTIVE' }).populate('strategyId');
        
//         if (activeDeployments.length === 0) return;

//         for (const deployment of activeDeployments) {
//             const strategy = deployment.strategyId;
//             if (!strategy) continue;

//             const config = strategy.data?.config || {};
            
//             if (config.startTime === currentTime && !deployment.orderPlacedToday) {
//                 console.log(`⚡ ENTRY TRIGGERED! Strategy: ${strategy.name}`);

//                 // 🔥 THE MAGIC FIX: Entry trigger hote hi isko true kar do aur DB me save kar do!
//                 // Taaki agle 10 second wale loop me ye wapas entry na le.
//                 deployment.orderPlacedToday = true; 
//                 await deployment.save();

//                 for (const brokerId of deployment.brokers) {
//                     const broker = await Broker.findById(brokerId);
                    
//                     if (broker && broker.engineOn) {
                        
//                         const instrumentData = strategy.data.instruments[0]; 
//                         let rawSymbol = instrumentData ? instrumentData.name : "";
//                         let baseSymbol = "NIFTY"; 
//                         if (rawSymbol.toUpperCase().includes("BANK")) baseSymbol = "BANKNIFTY";
//                         else if (rawSymbol.toUpperCase().includes("FIN")) baseSymbol = "FINNIFTY";

//                         for (const leg of strategy.data.legs) {
                            
//                             let optType = leg.optionType === "Call" ? "CE" : "PE";
//                             let tradeAction = leg.action.toUpperCase();
//                             let tradeQty = (leg.quantity || 1) * deployment.multiplier;

//                             console.log(`📡 Fetching Live Price for ${baseSymbol}...`);
//                             let currentSpotPrice = await fetchLivePrice(baseSymbol);

//                             if (!currentSpotPrice) {
//                                 console.error(`🚨 TRADE ABORTED: Missing Live Price for ${baseSymbol}`);
//                                 await createAndEmitLog(broker, baseSymbol, tradeAction, tradeQty, 'FAILED', "Trade Aborted: Live market price not available for ATM calculation.");
//                                 continue; 
//                             }

//                             let stepValue = getStrikeStep(baseSymbol); 
//                             let targetStrikePrice = Math.round(currentSpotPrice / stepValue) * stepValue;
                            
//                             let fallbackSymbolName = `${baseSymbol} ${targetStrikePrice} ${optType}`; 

//                             const instrument = getOptionSecurityId(baseSymbol, targetStrikePrice, optType);

//                             if (!instrument) {
//                                 console.error(`❌ Strike not found in CSV: ${fallbackSymbolName}`);
//                                 await createAndEmitLog(broker, fallbackSymbolName, tradeAction, tradeQty, 'FAILED', `Option contract not found for calculated strike ${targetStrikePrice}.`);
//                                 continue; 
//                             }

//                             let finalSymbolName = instrument.tradingSymbol; 
//                             console.log(`✅ Found Instrument: ${finalSymbolName} (ID: ${instrument.id})`);

//                             const orderData = {
//                                 action: tradeAction, 
//                                 quantity: tradeQty,
//                                 securityId: instrument.id,
//                                 segment: instrument.exchange
//                             };

//                             // 🔥 REAL DHAN API CALL
//                             const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                            
//                             if(orderResponse.success) {
//                                 const respData = orderResponse.data || {};
//                                 const orderStatus = respData.orderStatus ? respData.orderStatus.toUpperCase() : "UNKNOWN";

//                                 if (orderStatus === "REJECTED") {
//                                     console.log("⚠️ BROKER RMS REJECTED ORDER:", respData.remarks);
//                                     await createAndEmitLog(broker, finalSymbolName, tradeAction, tradeQty, 'FAILED', respData.remarks || "Order rejected by broker RMS.", respData.orderId);
//                                 } else {
//                                     console.log("🚀 ORDER SUCCESSFULLY PLACED AT BROKER!");
//                                     await createAndEmitLog(broker, finalSymbolName, tradeAction, tradeQty, 'SUCCESS', `Order placed successfully (${orderStatus})`, respData.orderId);
//                                 }
//                             } else {
//                                 console.log("⚠️ BROKER REJECTED ORDER:", orderResponse.error);
//                                 const errorMsg = typeof orderResponse.error === 'object' ? JSON.stringify(orderResponse.error) : orderResponse.error;
//                                 await createAndEmitLog(broker, finalSymbolName, tradeAction, tradeQty, 'FAILED', errorMsg);
//                             }
//                         }
//                     }
//                 }
//             }
//         }
//     } catch (error) {
//         console.error("❌ Trading Engine Error:", error);
//     }
// });



const cron = require('node-cron');
const moment = require('moment-timezone');
const axios = require('axios'); 
const Deployment = require('../models/Deployment');
const Broker = require('../models/Broker');
const AlgoTradeLog = require('../models/AlgoTradeLog'); 
const { placeDhanOrder } = require('../services/dhanService');
const { getOptionSecurityId } = require('../services/instrumentService');

console.log("🚀 Trading Engine Initialized...");

// 🔥 THE MASTER LOCK (Ye array cron loop ko rokega)
const executionLocks = new Set();

// ==========================================
// 🛠️ HELPER FUNCTIONS
// ==========================================

const getStrikeStep = (symbol) => {
    const sym = symbol.toUpperCase();
    if (sym.includes("BANKNIFTY")) return 100;
    if (sym.includes("FINNIFTY")) return 50;
    if (sym.includes("MIDCPNIFTY")) return 25; 
    if (sym.includes("NIFTY")) return 50;
    if (sym.includes("SENSEX")) return 100;
    return 50; 
};

const fetchLivePrice = async (symbol) => {
    try {
        let ticker = "";
        const upperSymbol = symbol.toUpperCase();

        if (upperSymbol.includes("BANKNIFTY")) ticker = "^NSEBANK";
        else if (upperSymbol.includes("FINNIFTY")) ticker = "NIFTY_FIN_SERVICE.NS"; 
        else if (upperSymbol.includes("MIDCPNIFTY")) ticker = "NIFTY_MIDCAP_SELECT.NS"; 
        else if (upperSymbol.includes("NIFTY")) ticker = "^NSEI";
        else if (upperSymbol.includes("SENSEX")) ticker = "^BSESN";
        else return null;

        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m`;
        const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });

        if (!response.data.chart.result) return null;
        return response.data.chart.result[0].meta.regularMarketPrice;
    } catch (error) {
        console.error("❌ Error fetching Real-time LTP:", error.message);
        return null; 
    }
};

const createAndEmitLog = async (broker, symbol, action, quantity, status, message, orderId = "N/A") => {
    try {
        const newLog = await AlgoTradeLog.create({
            brokerId: broker._id,
            brokerName: broker.name,
            symbol: symbol,
            action: action,
            quantity: quantity,
            status: status,
            message: message,
            orderId: orderId
        });

        if (global.io) {
            global.io.emit('new-trade-log', newLog);
        }
    } catch (err) {
        console.error("❌ Failed to save Log in DB:", err.message);
    }
};

// ==========================================
// ⚙️ MAIN CRON JOB (Runs Every 10 Seconds)
// ==========================================

cron.schedule('*/10 * * * * *', async () => {
    try {
        const currentTime = moment().tz("Asia/Kolkata").format("HH:mm"); 
        const activeDeployments = await Deployment.find({ status: 'ACTIVE' }).populate('strategyId');
        
        if (activeDeployments.length === 0) return;

        // Har raat 12:00 baje memory lock clean kar do (taaki agle din naye trades ho sakein)
        if (currentTime === "00:00" && executionLocks.size > 0) {
            executionLocks.clear();
            console.log("🧹 Execution Locks Cleared for the new day.");
        }

        for (const deployment of activeDeployments) {
            const strategy = deployment.strategyId;
            if (!strategy) continue;

            const config = strategy.data?.config || {};
            
            // 🔥 LOCK LOGIC: ID aur Time ko jodkar ek unique lock key banayi
            // Example: "65f3d_12:55"
            const lockKey = `${deployment._id.toString()}_${currentTime}`;

            // Check karo ki kya time ho gaya hai, aur kya yeh lock pehle se maujood to nahi hai?
            if (config.startTime === currentTime && !executionLocks.has(lockKey)) {
                
                // 🛑 IMMEDIATE LOCK: Agle loop se pehle hi isko set kar do
                executionLocks.add(lockKey);
                console.log(`⚡ ENTRY TRIGGERED! Strategy: ${strategy.name}`);

                for (const brokerId of deployment.brokers) {
                    const broker = await Broker.findById(brokerId);
                    
                    if (broker && broker.engineOn) {
                        
                        const instrumentData = strategy.data.instruments[0]; 
                        let rawSymbol = instrumentData ? instrumentData.name : "";
                        let baseSymbol = "NIFTY"; 
                        if (rawSymbol.toUpperCase().includes("BANK")) baseSymbol = "BANKNIFTY";
                        else if (rawSymbol.toUpperCase().includes("FIN")) baseSymbol = "FINNIFTY";

                        for (const leg of strategy.data.legs) {
                            
                            let optType = leg.optionType === "Call" ? "CE" : "PE";
                            let tradeAction = leg.action.toUpperCase();
                            let tradeQty = (leg.quantity || 1) * deployment.multiplier;

                            console.log(`📡 Fetching Live Price for ${baseSymbol}...`);
                            let currentSpotPrice = await fetchLivePrice(baseSymbol);

                            if (!currentSpotPrice) {
                                console.error(`🚨 TRADE ABORTED: Missing Live Price for ${baseSymbol}`);
                                await createAndEmitLog(broker, baseSymbol, tradeAction, tradeQty, 'FAILED', "Trade Aborted: Live market price not available for ATM calculation.");
                                continue; 
                            }

                            let stepValue = getStrikeStep(baseSymbol); 
                            let targetStrikePrice = Math.round(currentSpotPrice / stepValue) * stepValue;
                            
                            let fallbackSymbolName = `${baseSymbol} ${targetStrikePrice} ${optType}`; 

                            const instrument = getOptionSecurityId(baseSymbol, targetStrikePrice, optType);

                            if (!instrument) {
                                console.error(`❌ Strike not found in CSV: ${fallbackSymbolName}`);
                                await createAndEmitLog(broker, fallbackSymbolName, tradeAction, tradeQty, 'FAILED', `Option contract not found for calculated strike ${targetStrikePrice}.`);
                                continue; 
                            }

                            let finalSymbolName = instrument.tradingSymbol; 
                            console.log(`✅ Found Instrument: ${finalSymbolName} (ID: ${instrument.id})`);

                            const orderData = {
                                action: tradeAction, 
                                quantity: tradeQty,
                                securityId: instrument.id,
                                segment: instrument.exchange
                            };

                            // 🔥 REAL DHAN API CALL
                            const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                            
                            if(orderResponse.success) {
                                const respData = orderResponse.data || {};
                                const orderStatus = respData.orderStatus ? respData.orderStatus.toUpperCase() : "UNKNOWN";

                                if (orderStatus === "REJECTED") {
                                    console.log("⚠️ BROKER RMS REJECTED ORDER:", respData.remarks);
                                    await createAndEmitLog(broker, finalSymbolName, tradeAction, tradeQty, 'FAILED', respData.remarks || "Order rejected by broker RMS.", respData.orderId);
                                } else {
                                    console.log("🚀 ORDER SUCCESSFULLY PLACED AT BROKER!");
                                    await createAndEmitLog(broker, finalSymbolName, tradeAction, tradeQty, 'SUCCESS', `Order placed successfully (${orderStatus})`, respData.orderId);
                                }
                            } else {
                                console.log("⚠️ BROKER REJECTED ORDER:", orderResponse.error);
                                const errorMsg = typeof orderResponse.error === 'object' ? JSON.stringify(orderResponse.error) : orderResponse.error;
                                await createAndEmitLog(broker, finalSymbolName, tradeAction, tradeQty, 'FAILED', errorMsg);
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error("❌ Trading Engine Error:", error);
    }
});