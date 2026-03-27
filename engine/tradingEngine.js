

// const cron = require('node-cron');
// const moment = require('moment-timezone');
// const axios = require('axios');
// const Deployment = require('../models/Deployment');
// const Broker = require('../models/Broker');
// const AlgoTradeLog = require('../models/AlgoTradeLog');
// const { placeDhanOrder, fetchLiveLTP } = require('../services/dhanService');
// const { getOptionSecurityId } = require('../services/instrumentService');

// console.log("🚀 Trading Engine Initialized...");

// const executionLocks = new Set();
// const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// const getStrikeStep = (symbol) => {
//     const sym = symbol.toUpperCase();
//     if (sym.includes("BANKNIFTY")) return 100;
//     if (sym.includes("FINNIFTY")) return 50;
//     if (sym.includes("MIDCPNIFTY") || sym.includes("MIDCAP")) return 25; // Midcap Strike Step
//     if (sym.includes("NIFTY")) return 50;
//     if (sym.includes("SENSEX")) return 100;
//     return 50;
// };


// // 🚀 THE FINAL PRICE FETCHER (Correct TradingView Symbol)
// // ==========================================
// const fetchLivePrice = async (symbol) => {
//     const baseSymbol = symbol.toUpperCase();
//     try {
//         console.log(`📡 Fetching Live Price for ${baseSymbol}...`);
        
//         // 🔥 LAYER 1: TRADINGVIEW (The True Savior with Correct Symbol)
//         let tvTicker = "";
//         // 👇 THE MAGIC FIX: "NSE:NIFTY_MID_SELECT" IS THE EXACT TV SYMBOL! 👇
//         if (baseSymbol.includes("MIDCP") || baseSymbol.includes("MIDCAP")) tvTicker = "NSE:NIFTY_MID_SELECT";
//         else if (baseSymbol.includes("BANKNIFTY")) tvTicker = "NSE:BANKNIFTY";
//         else if (baseSymbol.includes("FINNIFTY")) tvTicker = "NSE:FINNIFTY";
//         else if (baseSymbol.includes("NIFTY")) tvTicker = "NSE:NIFTY";
//         else if (baseSymbol.includes("SENSEX")) tvTicker = "BSE:SENSEX";

//         if (tvTicker) {
//             try {
//                 const tvRes = await axios.post('https://scanner.tradingview.com/india/scan', {
//                     "symbols": { "tickers": [tvTicker] },
//                     "columns": ["close"]
//                 }, { headers: { 'Content-Type': 'application/json' } });

//                 if (tvRes.data && tvRes.data.data && tvRes.data.data.length > 0) {
//                     const ltp = parseFloat(tvRes.data.data[0].d[0]);
//                     if (ltp) {
//                         console.log(`✅ [DEBUG] TradingView LTP for ${baseSymbol}: ${ltp}`);
//                         return ltp;
//                     }
//                 } else {
//                     console.log(`⚠️ TradingView ko '${tvTicker}' nahi mila (Empty Data)`);
//                 }
//             } catch (e) { console.log(`⚠️ [LAYER 1 FAILED] TradingView Error: ${e.message}`); }
//         }

//         // 🔥 LAYER 2: YAHOO FINANCE FALLBACK (Nifty/BankNifty Only - No Midcap!)
//         let yahooTicker = "";
//         if (baseSymbol.includes("BANKNIFTY")) yahooTicker = "^NSEBANK";
//         else if (baseSymbol.includes("FINNIFTY")) yahooTicker = "NIFTY_FIN_SERVICE.NS";
//         else if (baseSymbol.includes("NIFTY") && !baseSymbol.includes("MIDCP")) yahooTicker = "^NSEI";
//         else if (baseSymbol.includes("SENSEX")) yahooTicker = "^BSESN";

//         if (yahooTicker) {
//             try {
//                 const yUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=1m`;
//                 const yRes = await axios.get(yUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
//                 if (yRes.data && yRes.data.chart && yRes.data.chart.result) {
//                     const ltp = parseFloat(yRes.data.chart.result[0].meta.regularMarketPrice);
//                     if (ltp) {
//                         console.log(`✅ [DEBUG] Yahoo LTP for ${baseSymbol}: ${ltp}`);
//                         return ltp;
//                     }
//                 }
//             } catch (e) { console.log(`⚠️ [LAYER 2 FAILED] Yahoo Error: ${e.message}`); }
//         }

//         console.log(`❌ [CRITICAL] ALL APIS FAILED to fetch Spot Price for ${baseSymbol}`);
//         return null;

//     } catch (error) { 
//         console.error(`❌ [DEBUG] Code Crash in fetchLivePrice:`, error.message);
//         return null; 
//     }
// };


// // ==========================================
// // 📝 LOG CREATOR
// // ==========================================
// const createAndEmitLog = async (broker, symbol, action, quantity, status, message, orderId = "N/A") => {
//     try {
//         const newLog = await AlgoTradeLog.create({ brokerId: broker._id, brokerName: broker.name, symbol, action, quantity, status, message, orderId });
//         if (global.io) global.io.emit('new-trade-log', newLog);
//     } catch (err) { console.error("❌ Log Error:", err.message); }
// };

// // ==========================================
// // ⚙️ MAIN CRON JOB
// // ==========================================
// cron.schedule('*/30 * * * * *', async () => {
//     try {
//         const currentTime = moment().tz("Asia/Kolkata").format("HH:mm");
//         const activeDeployments = await Deployment.find({ status: 'ACTIVE' }).populate('strategyId');

//         if (activeDeployments.length === 0) return;

//         if (currentTime === "00:00" && executionLocks.size > 0) executionLocks.clear();

//         for (const deployment of activeDeployments) {
//             const strategy = deployment.strategyId;
//             if (!strategy) continue;

//             const config = strategy.data?.config || {};
//             const entryLockKey = `ENTRY_${deployment._id.toString()}_${currentTime}`;
//             const exitLockKey = `EXIT_${deployment._id.toString()}_${currentTime}`;
//             const squareOffTime = deployment.squareOffTime || config.squareOffTime;

//             // 1. ENTRY LOGIC ⚡
//             if (config.startTime === currentTime && !executionLocks.has(entryLockKey) && !deployment.tradedSecurityId) {
//                 executionLocks.add(entryLockKey);
//                 console.log(`⚡ ENTRY TRIGGERED! Strategy: ${strategy.name}`);

//                 for (const brokerId of deployment.brokers) {
//                     const broker = await Broker.findById(brokerId);
//                     if (broker && broker.engineOn) {
                        
//                         // 🔥 THE SMART CATCHER
//                         const instrumentData = (strategy.data.instruments && strategy.data.instruments.length > 0) ? strategy.data.instruments[0] : {};
//                         let rawSymbol = instrumentData.name || instrumentData.symbol || instrumentData.value || config.index || config.symbol || strategy.symbol || strategy.name || "";
                        
//                         let baseSymbol = "NIFTY"; 
//                         const upperRawSymbol = String(rawSymbol).toUpperCase();
                        
//                         console.log(`🔍 [DEBUG] Strategy Name: "${strategy.name}" | Frontend ne bheja: "${rawSymbol}"`);

//                         if (upperRawSymbol.includes("BANK")) baseSymbol = "BANKNIFTY";
//                         else if (upperRawSymbol.includes("FIN")) baseSymbol = "FINNIFTY";
//                         else if (upperRawSymbol.includes("MIDCP") || upperRawSymbol.includes("MIDCAP")) baseSymbol = "MIDCPNIFTY";
//                         else if (upperRawSymbol.includes("SENSEX")) baseSymbol = "SENSEX";

//                         console.log(`✅ [DEBUG] Engine ne decide kiya: ${baseSymbol}`);

//                         for (const leg of strategy.data.legs) {
//                             let optType = leg.optionType === "Call" ? "CE" : "PE";
//                             let tradeAction = leg.action.toUpperCase();
//                             let tradeQty = (leg.quantity || 1) * deployment.multiplier;

//                             let currentSpotPrice = await fetchLivePrice(baseSymbol);
//                             console.log(`📊 [DEBUG] ${baseSymbol} Live Spot Price:`, currentSpotPrice);

//                             if (!currentSpotPrice) {
//                                 console.log(`❌ [DEBUG] API se Spot Price nahi mila!`);
//                                 await createAndEmitLog(broker, baseSymbol, tradeAction, tradeQty, 'FAILED', `Failed to fetch live spot price. Cannot calculate ATM Strike.`);
//                                 continue;
//                             }

//                             let stepValue = getStrikeStep(baseSymbol);
//                             let targetStrikePrice = Math.round(currentSpotPrice / stepValue) * stepValue;
//                             console.log(`🎯 [DEBUG] Calculated Target Strike: ${targetStrikePrice}`);

//                             const instrument = getOptionSecurityId(baseSymbol, targetStrikePrice, optType);
                            
//                             if (!instrument) {
//                                 console.log(`❌ [DEBUG] CSV me Instrument nahi mila: ${baseSymbol} ${targetStrikePrice} ${optType}`);
//                                 await createAndEmitLog(broker, `${baseSymbol} ${targetStrikePrice} ${optType}`, tradeAction, tradeQty, 'FAILED', `Strike ${targetStrikePrice} not found in Dhan Scrip CSV`);
//                                 continue;
//                             }
                            
//                             console.log(`✅ [DEBUG] Final Instrument Match:`, instrument.tradingSymbol);

//                             const orderData = { action: tradeAction, quantity: tradeQty, securityId: instrument.id, segment: instrument.exchange };
//                             const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

//                             if (orderResponse.success) {
//                                 const respData = orderResponse.data || {};
//                                 const orderStatus = respData.orderStatus ? respData.orderStatus.toUpperCase() : "UNKNOWN";

//                                 if (orderStatus !== "REJECTED") {
//                                     console.log("🚀 ENTRY ORDER SUCCESSFULLY PLACED AT BROKER!");
//                                     deployment.tradedSecurityId = instrument.id;
//                                     deployment.tradedExchange = instrument.exchange;
//                                     deployment.tradedQty = tradeQty;
//                                     deployment.tradeAction = tradeAction;
                                    
//                                     await sleep(1000); 
//                                     const entryPrice = await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id);
//                                     deployment.entryPrice = entryPrice || 0;
//                                     await deployment.save();

//                                     await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Entry Order placed successfully`, respData.orderId);
//                                 } else {
//                                     await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'FAILED', respData.remarks || "RMS Rejected", respData.orderId);
//                                 }
//                             } else {
//                                 const errorObj = orderResponse.error || {};
//                                 const errorMsg = errorObj.internalErrorMessage || errorObj.errorMessage || JSON.stringify(errorObj);
//                                 await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'FAILED', errorMsg);
//                             }
//                             await sleep(500);
//                         }
//                     }
//                 }
//             }

//             // 2. AUTO SQUARE-OFF LOGIC ⏰
//             if (squareOffTime === currentTime && !executionLocks.has(exitLockKey) && deployment.tradedSecurityId) {
//                 executionLocks.add(exitLockKey);
//                 console.log(`⏰ SQUARE-OFF TRIGGERED! Strategy: ${strategy.name}`);

//                 for (const brokerId of deployment.brokers) {
//                     const broker = await Broker.findById(brokerId);
//                     if (broker && broker.engineOn) {
//                         const exitAction = deployment.tradeAction === 'BUY' ? 'SELL' : 'BUY';
//                         const orderData = {
//                             action: exitAction,
//                             quantity: deployment.tradedQty,
//                             securityId: deployment.tradedSecurityId,
//                             segment: deployment.tradedExchange
//                         };

//                         const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

//                         if (orderResponse.success) {
//                             const respData = orderResponse.data || {};
//                             const orderStatus = respData.orderStatus ? respData.orderStatus.toUpperCase() : "UNKNOWN";

//                             if (orderStatus !== "REJECTED") {
//                                 console.log("🏁 SQUARE-OFF ORDER SUCCESSFULLY PLACED!");
//                                 deployment.status = 'COMPLETED';
//                                 await deployment.save();
//                                 await createAndEmitLog(broker, "Auto Square-Off", exitAction, deployment.tradedQty, 'SUCCESS', `Strategy Time-Based Square-Off Completed`, respData.orderId);
//                             } else {
//                                 await createAndEmitLog(broker, "Auto Square-Off", exitAction, deployment.tradedQty, 'FAILED', respData.remarks || "RMS Rejected", respData.orderId);
//                             }
//                         } else {
//                             const errorObj = orderResponse.error || {};
//                             const errorMsg = errorObj.internalErrorMessage || errorObj.errorMessage || JSON.stringify(errorObj);
//                             await createAndEmitLog(broker, "Auto Square-Off", exitAction, deployment.tradedQty, 'FAILED', errorMsg);
//                         }
//                     }
//                 }
//             }
//         }
//     } catch (error) { console.error("❌ Trading Engine Error:", error); }
// });





const cron = require('node-cron');
const moment = require('moment-timezone');
const axios = require('axios');
const Deployment = require('../models/Deployment');
const Broker = require('../models/Broker');
const AlgoTradeLog = require('../models/AlgoTradeLog');
const { placeDhanOrder, fetchLiveLTP } = require('../services/dhanService');
const { getOptionSecurityId } = require('../services/instrumentService');

console.log("🚀 Trading Engine Initialized...");

const executionLocks = new Set();
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getStrikeStep = (symbol) => {
    const sym = symbol.toUpperCase();
    if (sym.includes("BANKNIFTY")) return 100;
    if (sym.includes("FINNIFTY")) return 50;
    if (sym.includes("MIDCPNIFTY") || sym.includes("MIDCAP")) return 25; // Midcap Strike Step
    if (sym.includes("NIFTY")) return 50;
    if (sym.includes("SENSEX")) return 100;
    return 50;
};


// 🚀 THE FINAL PRICE FETCHER (Correct TradingView Symbol)
// ==========================================
const fetchLivePrice = async (symbol) => {
    const baseSymbol = symbol.toUpperCase();
    try {
        console.log(`📡 Fetching Live Price for ${baseSymbol}...`);
        
        // 🔥 LAYER 1: TRADINGVIEW (The True Savior with Correct Symbol)
        let tvTicker = "";
        // 👇 THE MAGIC FIX: "NSE:NIFTY_MID_SELECT" IS THE EXACT TV SYMBOL! 👇
        if (baseSymbol.includes("MIDCP") || baseSymbol.includes("MIDCAP")) tvTicker = "NSE:NIFTY_MID_SELECT";
        else if (baseSymbol.includes("BANKNIFTY")) tvTicker = "NSE:BANKNIFTY";
        else if (baseSymbol.includes("FINNIFTY")) tvTicker = "NSE:FINNIFTY";
        else if (baseSymbol.includes("NIFTY")) tvTicker = "NSE:NIFTY";
        else if (baseSymbol.includes("SENSEX")) tvTicker = "BSE:SENSEX";

        if (tvTicker) {
            try {
                const tvRes = await axios.post('https://scanner.tradingview.com/india/scan', {
                    "symbols": { "tickers": [tvTicker] },
                    "columns": ["close"]
                }, { headers: { 'Content-Type': 'application/json' } });

                if (tvRes.data && tvRes.data.data && tvRes.data.data.length > 0) {
                    const ltp = parseFloat(tvRes.data.data[0].d[0]);
                    if (ltp) {
                        console.log(`✅ [DEBUG] TradingView LTP for ${baseSymbol}: ${ltp}`);
                        return ltp;
                    }
                } else {
                    console.log(`⚠️ TradingView ko '${tvTicker}' nahi mila (Empty Data)`);
                }
            } catch (e) { console.log(`⚠️ [LAYER 1 FAILED] TradingView Error: ${e.message}`); }
        }

        // 🔥 LAYER 2: YAHOO FINANCE FALLBACK (Nifty/BankNifty Only - No Midcap!)
        let yahooTicker = "";
        if (baseSymbol.includes("BANKNIFTY")) yahooTicker = "^NSEBANK";
        else if (baseSymbol.includes("FINNIFTY")) yahooTicker = "NIFTY_FIN_SERVICE.NS";
        else if (baseSymbol.includes("NIFTY") && !baseSymbol.includes("MIDCP")) yahooTicker = "^NSEI";
        else if (baseSymbol.includes("SENSEX")) yahooTicker = "^BSESN";

        if (yahooTicker) {
            try {
                const yUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=1m`;
                const yRes = await axios.get(yUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                if (yRes.data && yRes.data.chart && yRes.data.chart.result) {
                    const ltp = parseFloat(yRes.data.chart.result[0].meta.regularMarketPrice);
                    if (ltp) {
                        console.log(`✅ [DEBUG] Yahoo LTP for ${baseSymbol}: ${ltp}`);
                        return ltp;
                    }
                }
            } catch (e) { console.log(`⚠️ [LAYER 2 FAILED] Yahoo Error: ${e.message}`); }
        }

        console.log(`❌ [CRITICAL] ALL APIS FAILED to fetch Spot Price for ${baseSymbol}`);
        return null;

    } catch (error) { 
        console.error(`❌ [DEBUG] Code Crash in fetchLivePrice:`, error.message);
        return null; 
    }
};


// ==========================================
// 📝 LOG CREATOR
// ==========================================
const createAndEmitLog = async (broker, symbol, action, quantity, status, message, orderId = "N/A") => {
    try {
        const newLog = await AlgoTradeLog.create({ brokerId: broker._id, brokerName: broker.name, symbol, action, quantity, status, message, orderId });
        if (global.io) global.io.emit('new-trade-log', newLog);
    } catch (err) { console.error("❌ Log Error:", err.message); }
};

// ==========================================
// ⚙️ MAIN CRON JOB
// ==========================================
cron.schedule('*/30 * * * * *', async () => {
    try {
        const currentTime = moment().tz("Asia/Kolkata").format("HH:mm");
        const activeDeployments = await Deployment.find({ status: 'ACTIVE' }).populate('strategyId');

        if (activeDeployments.length === 0) return;

        if (currentTime === "00:00" && executionLocks.size > 0) executionLocks.clear();

        for (const deployment of activeDeployments) {
            const strategy = deployment.strategyId;
            if (!strategy) continue;

            const config = strategy.data?.config || {};
            const entryLockKey = `ENTRY_${deployment._id.toString()}_${currentTime}`;
            const exitLockKey = `EXIT_${deployment._id.toString()}_${currentTime}`;
            const squareOffTime = deployment.squareOffTime || config.squareOffTime;

            // 1. ENTRY LOGIC ⚡
            if (config.startTime === currentTime && !executionLocks.has(entryLockKey) && !deployment.tradedSecurityId) {
                executionLocks.add(entryLockKey);
                console.log(`⚡ ENTRY TRIGGERED! Strategy: ${strategy.name}`);

                for (const brokerId of deployment.brokers) {
                    const broker = await Broker.findById(brokerId);
                    if (broker && broker.engineOn) {
                        
                        // 🔥 THE SMART CATCHER
                        const instrumentData = (strategy.data.instruments && strategy.data.instruments.length > 0) ? strategy.data.instruments[0] : {};
                        let rawSymbol = instrumentData.name || instrumentData.symbol || instrumentData.value || config.index || config.symbol || strategy.symbol || strategy.name || "";
                        
                        let baseSymbol = "NIFTY"; 
                        const upperRawSymbol = String(rawSymbol).toUpperCase();
                        
                        console.log(`🔍 [DEBUG] Strategy Name: "${strategy.name}" | Frontend ne bheja: "${rawSymbol}"`);

                        if (upperRawSymbol.includes("BANK")) baseSymbol = "BANKNIFTY";
                        else if (upperRawSymbol.includes("FIN")) baseSymbol = "FINNIFTY";
                        else if (upperRawSymbol.includes("MIDCP") || upperRawSymbol.includes("MIDCAP")) baseSymbol = "MIDCPNIFTY";
                        else if (upperRawSymbol.includes("SENSEX")) baseSymbol = "SENSEX";

                        console.log(`✅ [DEBUG] Engine ne decide kiya: ${baseSymbol}`);

                        for (const leg of strategy.data.legs) {
                            let optType = leg.optionType === "Call" ? "CE" : "PE";
                            let tradeAction = leg.action.toUpperCase();
                            let tradeQty = (leg.quantity || 1) * deployment.multiplier;

                            let currentSpotPrice = await fetchLivePrice(baseSymbol);
                            console.log(`📊 [DEBUG] ${baseSymbol} Live Spot Price:`, currentSpotPrice);

                            if (!currentSpotPrice) {
                                console.log(`❌ [DEBUG] API se Spot Price nahi mila!`);
                                await createAndEmitLog(broker, baseSymbol, tradeAction, tradeQty, 'FAILED', `Failed to fetch live spot price. Cannot calculate ATM Strike.`);
                                continue;
                            }

                            let stepValue = getStrikeStep(baseSymbol);
                            let targetStrikePrice = Math.round(currentSpotPrice / stepValue) * stepValue;
                            console.log(`🎯 [DEBUG] Calculated Target Strike: ${targetStrikePrice}`);

                            const instrument = getOptionSecurityId(baseSymbol, targetStrikePrice, optType);
                            
                            if (!instrument) {
                                console.log(`❌ [DEBUG] CSV me Instrument nahi mila: ${baseSymbol} ${targetStrikePrice} ${optType}`);
                                await createAndEmitLog(broker, `${baseSymbol} ${targetStrikePrice} ${optType}`, tradeAction, tradeQty, 'FAILED', `Strike ${targetStrikePrice} not found in Dhan Scrip CSV`);
                                continue;
                            }
                            
                            console.log(`✅ [DEBUG] Final Instrument Match:`, instrument.tradingSymbol);

                            const orderData = { action: tradeAction, quantity: tradeQty, securityId: instrument.id, segment: instrument.exchange };
                            const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

                            if (orderResponse.success) {
                                const respData = orderResponse.data || {};
                                const orderStatus = respData.orderStatus ? respData.orderStatus.toUpperCase() : "UNKNOWN";

                                if (orderStatus !== "REJECTED") {
                                    console.log("🚀 ENTRY ORDER SUCCESSFULLY PLACED AT BROKER!");
                                    deployment.tradedSecurityId = instrument.id;
                                    deployment.tradedExchange = instrument.exchange;
                                    deployment.tradedQty = tradeQty;
                                    deployment.tradeAction = tradeAction;

                                    // 👇 YE NAYI LINE ADD KARNI HAI 👇
                                    deployment.tradedSymbol = instrument.tradingSymbol;
                                    
                                    await sleep(1000); 
                                    const entryPrice = await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id);
                                    deployment.entryPrice = entryPrice || 0;
                                    await deployment.save();

                                    await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Entry Order placed successfully`, respData.orderId);
                                } else {
                                    await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'FAILED', respData.remarks || "RMS Rejected", respData.orderId);
                                }
                            } else {
                                const errorObj = orderResponse.error || {};
                                const errorMsg = errorObj.internalErrorMessage || errorObj.errorMessage || JSON.stringify(errorObj);
                                await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'FAILED', errorMsg);
                            }
                            await sleep(500);
                        }
                    }
                }
            }

            // 2. AUTO SQUARE-OFF LOGIC ⏰
            if (squareOffTime === currentTime && !executionLocks.has(exitLockKey) && deployment.tradedSecurityId) {
                executionLocks.add(exitLockKey);
                console.log(`⏰ SQUARE-OFF TRIGGERED! Strategy: ${strategy.name}`);

                for (const brokerId of deployment.brokers) {
                    const broker = await Broker.findById(brokerId);
                    if (broker && broker.engineOn) {
                        const exitAction = deployment.tradeAction === 'BUY' ? 'SELL' : 'BUY';
                        const orderData = {
                            action: exitAction,
                            quantity: deployment.tradedQty,
                            securityId: deployment.tradedSecurityId,
                            segment: deployment.tradedExchange
                        };

                        const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

                       if (orderResponse.success) {
                            const respData = orderResponse.data || {};
                            const orderStatus = respData.orderStatus ? respData.orderStatus.toUpperCase() : "UNKNOWN";
                            
                            // 👇 UI par dikhane ke liye mast format: "NIFTY 30 MAR 22950 CALL (Auto-Exit)"
                            const squareOffSymbolName = deployment.tradedSymbol ? `${deployment.tradedSymbol} (Auto-Exit)` : "Auto Square-Off";

                            if (orderStatus !== "REJECTED") {
                                console.log("🏁 SQUARE-OFF ORDER SUCCESSFULLY PLACED!");
                                deployment.status = 'COMPLETED';
                                await deployment.save();
                                
                                // Yahan purane "Auto Square-Off" ki jagah 'squareOffSymbolName' pass kiya hai
                                await createAndEmitLog(broker, squareOffSymbolName, exitAction, deployment.tradedQty, 'SUCCESS', `Strategy Time-Based Square-Off Completed`, respData.orderId);
                            } else {
                                await createAndEmitLog(broker, squareOffSymbolName, exitAction, deployment.tradedQty, 'FAILED', respData.remarks || "RMS Rejected", respData.orderId);
                            }
                        } else {
                            const errorObj = orderResponse.error || {};
                            const errorMsg = errorObj.internalErrorMessage || errorObj.errorMessage || JSON.stringify(errorObj);
                            
                            const squareOffSymbolName = deployment.tradedSymbol ? `${deployment.tradedSymbol} (Auto-Exit)` : "Auto Square-Off";
                            await createAndEmitLog(broker, squareOffSymbolName, exitAction, deployment.tradedQty, 'FAILED', errorMsg);
                        }
                    }
                }
            }
        }
    } catch (error) { console.error("❌ Trading Engine Error:", error); }
});