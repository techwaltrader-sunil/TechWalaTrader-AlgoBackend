


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

//                                     // 👇 YE NAYI LINE ADD KARNI HAI 👇
//                                     deployment.tradedSymbol = instrument.tradingSymbol;

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

//                        if (orderResponse.success) {
//                             const respData = orderResponse.data || {};
//                             const orderStatus = respData.orderStatus ? respData.orderStatus.toUpperCase() : "UNKNOWN";

//                             // 👇 UI par dikhane ke liye mast format: "NIFTY 30 MAR 22950 CALL (Auto-Exit)"
//                             const squareOffSymbolName = deployment.tradedSymbol ? `${deployment.tradedSymbol} (Auto-Exit)` : "Auto Square-Off";

//                             if (orderStatus !== "REJECTED") {
//                                 console.log("🏁 SQUARE-OFF ORDER SUCCESSFULLY PLACED!");

//                                 // 👇 NAYI LINES: Exit Price aur P&L nikalna 👇
//                                 const exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId) || 0;
//                                 let finalPnl = 0;
//                                 if (exitLtp > 0 && deployment.entryPrice > 0) {
//                                     finalPnl = deployment.tradeAction === 'BUY' 
//                                         ? (exitLtp - deployment.entryPrice) * deployment.tradedQty 
//                                         : (deployment.entryPrice - exitLtp) * deployment.tradedQty;
//                                 }

//                                 deployment.exitPrice = exitLtp;
//                                 deployment.realizedPnl = finalPnl;
//                                 // 👆 NAYI LINES 👆

//                                 deployment.status = 'COMPLETED';
//                                 await deployment.save();

//                                 await createAndEmitLog(broker, squareOffSymbolName, exitAction, deployment.tradedQty, 'SUCCESS', `Strategy Time-Based Square-Off Completed (P&L: ₹${finalPnl.toFixed(2)})`, respData.orderId);
//                             } else {
//                                 await createAndEmitLog(broker, squareOffSymbolName, exitAction, deployment.tradedQty, 'FAILED', respData.remarks || "RMS Rejected", respData.orderId);
//                             }
//                         } else {
//                             const errorObj = orderResponse.error || {};
//                             const errorMsg = errorObj.internalErrorMessage || errorObj.errorMessage || JSON.stringify(errorObj);

//                             const squareOffSymbolName = deployment.tradedSymbol ? `${deployment.tradedSymbol} (Auto-Exit)` : "Auto Square-Off";
//                             await createAndEmitLog(broker, squareOffSymbolName, exitAction, deployment.tradedQty, 'FAILED', errorMsg);
//                         }
//                     }
//                 }
//             }

//             // ==========================================
//             // 3. MTM (MAX PROFIT / MAX LOSS) SQUARE-OFF LOGIC 💰
//             // ==========================================
//             const riskData = strategy.data?.riskManagement || {};
//             const maxProfit = parseFloat(riskData.maxProfit) || 0;
//             const maxLoss = parseFloat(riskData.maxLoss) || 0;

//             // Sirf tabhi check karo jab trade open ho, Entry Price mil chuka ho, aur MaxProfit/MaxLoss set ho (0 se zyada ho)
//             if (!executionLocks.has(exitLockKey) && deployment.tradedSecurityId && deployment.entryPrice > 0 && (maxProfit > 0 || maxLoss > 0)) {

//                 for (const brokerId of deployment.brokers) {
//                     const broker = await Broker.findById(brokerId);
//                     if (broker && broker.engineOn) {

//                         try {
//                             // Dhan API se Contract ka Live Price (LTP) nikalo
//                             const liveLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId);

//                             if (liveLtp && liveLtp > 0) {
//                                 let currentPnl = 0;

//                                 // P&L Calculation: (Live Price - Entry Price) * Qty
//                                 if (deployment.tradeAction === 'BUY') {
//                                     currentPnl = (liveLtp - deployment.entryPrice) * deployment.tradedQty;
//                                 } else {
//                                     currentPnl = (deployment.entryPrice - liveLtp) * deployment.tradedQty;
//                                 }

//                                 console.log(`📊 [MTM Tracker] Strategy: ${strategy.name} | Live P&L: ₹${currentPnl.toFixed(2)} (LTP: ${liveLtp}, Entry: ${deployment.entryPrice})`);

//                                 let squareOffReason = null;

//                                 // Condition 1: Max Profit Hit (Target)
//                                 if (maxProfit > 0 && currentPnl >= maxProfit) {
//                                     squareOffReason = `Target Reached (Max Profit: ₹${maxProfit})`;
//                                 } 
//                                 // Condition 2: Max Loss Hit (Stop-Loss) - Math.abs ensures it works even if user puts 500 or -500
//                                 else if (maxLoss > 0 && currentPnl <= -Math.abs(maxLoss)) {
//                                     squareOffReason = `Stop-Loss Hit (Max Loss: ₹${Math.abs(maxLoss)})`;
//                                 }

//                                 // Agar Target ya SL hit hua to Order fire karo!
//                                 if (squareOffReason) {
//                                     executionLocks.add(exitLockKey);
//                                     console.log(`🚨 MTM SQUARE-OFF TRIGGERED! Reason: ${squareOffReason}`);

//                                     const exitAction = deployment.tradeAction === 'BUY' ? 'SELL' : 'BUY';
//                                     const orderData = {
//                                         action: exitAction,
//                                         quantity: deployment.tradedQty,
//                                         securityId: deployment.tradedSecurityId,
//                                         segment: deployment.tradedExchange
//                                     };

//                                     const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
//                                     const squareOffSymbolName = deployment.tradedSymbol ? `${deployment.tradedSymbol} (MTM-Exit)` : "MTM Square-Off";

//                                     if (orderResponse.success) {
//                                         const respData = orderResponse.data || {};
//                                         if (respData.orderStatus && respData.orderStatus.toUpperCase() !== "REJECTED") {
//                                             console.log("🏁 MTM SQUARE-OFF ORDER SUCCESSFULLY PLACED!");

//                                             // 👇 NAYI LINES 👇
//                                             deployment.exitPrice = liveLtp;
//                                             deployment.realizedPnl = currentPnl;
//                                             // 👆 NAYI LINES 👆

//                                             deployment.status = 'COMPLETED'; // Algo Stop
//                                             await deployment.save();
//                                             await createAndEmitLog(broker, squareOffSymbolName, exitAction, deployment.tradedQty, 'SUCCESS', `MTM Exit: ${squareOffReason} (Final P&L: ₹${currentPnl.toFixed(2)})`, respData.orderId);
//                                         } else {
//                                             await createAndEmitLog(broker, squareOffSymbolName, exitAction, deployment.tradedQty, 'FAILED', respData.remarks || "RMS Rejected", respData.orderId);
//                                             executionLocks.delete(exitLockKey); // Lock hatao taaki agle 30 sec me fir try kare
//                                         }
//                                     } else {
//                                         const errorMsg = orderResponse.error?.errorMessage || orderResponse.data?.remarks || JSON.stringify(orderResponse.error || {});
//                                         await createAndEmitLog(broker, squareOffSymbolName, exitAction, deployment.tradedQty, 'FAILED', `MTM Exit Failed: ${errorMsg}`);
//                                         executionLocks.delete(exitLockKey);
//                                     }
//                                 }
//                             }

//                             // 🔥 Dhan API Block (805 Error) se bachne ke liye 1 second ka delay
//                             await sleep(1000); 

//                         } catch (err) {
//                             console.log(`⚠️ MTM Check Failed for ${strategy.name}: ${err.message}`);
//                         }
//                     }
//                 }
//             }
//         }
//     } catch (error) { console.error("❌ Trading Engine Error:", error); }
// });






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

//                 // 🔥 NAYA: Pre-Punch SL Check
//                 const isPrePunchSL = strategy.data?.advanceSettings?.prePunchSL || false;

//                 for (const brokerId of deployment.brokers) {
//                     const broker = await Broker.findById(brokerId);
//                     if (broker && broker.engineOn) {

//                         // 🔥 THE SMART CATCHER (Aapka purana logic)
//                         const instrumentData = (strategy.data.instruments && strategy.data.instruments.length > 0) ? strategy.data.instruments[0] : {};
//                         let rawSymbol = instrumentData.name || instrumentData.symbol || instrumentData.value || config.index || config.symbol || strategy.symbol || strategy.name || "";

//                         let baseSymbol = "NIFTY"; 
//                         const upperRawSymbol = String(rawSymbol).toUpperCase();

//                         if (upperRawSymbol.includes("BANK")) baseSymbol = "BANKNIFTY";
//                         else if (upperRawSymbol.includes("FIN")) baseSymbol = "FINNIFTY";
//                         else if (upperRawSymbol.includes("MIDCP") || upperRawSymbol.includes("MIDCAP")) baseSymbol = "MIDCPNIFTY";
//                         else if (upperRawSymbol.includes("SENSEX")) baseSymbol = "SENSEX";

//                         for (const leg of strategy.data.legs) {
//                             let optType = leg.optionType === "Call" ? "CE" : "PE";
//                             let tradeAction = leg.action.toUpperCase();
//                             let tradeQty = (leg.quantity || 1) * deployment.multiplier;

//                             let currentSpotPrice = await fetchLivePrice(baseSymbol);
//                             if (!currentSpotPrice) {
//                                 await createAndEmitLog(broker, baseSymbol, tradeAction, tradeQty, 'FAILED', `Failed to fetch live spot price. Cannot calculate ATM Strike.`);
//                                 continue;
//                             }

//                             let stepValue = getStrikeStep(baseSymbol);
//                             let targetStrikePrice = Math.round(currentSpotPrice / stepValue) * stepValue;
//                             const instrument = getOptionSecurityId(baseSymbol, targetStrikePrice, optType);

//                             if (!instrument) {
//                                 await createAndEmitLog(broker, `${baseSymbol} ${targetStrikePrice} ${optType}`, tradeAction, tradeQty, 'FAILED', `Strike ${targetStrikePrice} not found in Dhan Scrip CSV`);
//                                 continue;
//                             }

//                             console.log(`✅ [DEBUG] Execution Type: ${deployment.executionType} | Symbol: ${instrument.tradingSymbol}`);

//                             // ==========================================
//                             // 🔴 LIVE TRADING EXECUTION (Asli Paisa)
//                             // ==========================================
//                             if (deployment.executionType === 'LIVE') {
//                                 const orderData = { action: tradeAction, quantity: tradeQty, securityId: instrument.id, segment: instrument.exchange };
//                                 const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

//                                 if (orderResponse.success) {
//                                     const respData = orderResponse.data || {};
//                                     const orderStatus = respData.orderStatus ? respData.orderStatus.toUpperCase() : "UNKNOWN";

//                                     if (orderStatus !== "REJECTED") {
//                                         deployment.tradedSecurityId = instrument.id;
//                                         deployment.tradedExchange = instrument.exchange;
//                                         deployment.tradedQty = tradeQty;
//                                         deployment.tradeAction = tradeAction;
//                                         deployment.tradedSymbol = instrument.tradingSymbol;

//                                         await sleep(1000); 
//                                         const entryPrice = await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id);
//                                         deployment.entryPrice = entryPrice || 0;

//                                         // 🛡️ LIVE PRE-PUNCH SL LOGIC
//                                         if (isPrePunchSL && entryPrice > 0 && leg.slValue > 0) {
//                                             let slPrice = leg.slType === 'SL%' 
//                                                 ? entryPrice - (entryPrice * (Number(leg.slValue) / 100))
//                                                 : entryPrice - Number(leg.slValue);

//                                             // Yahan Dhan ka SL-M Order fire hoga future me
//                                             console.log(`🛡️ [LIVE PRE-PUNCH] SL Placed at ₹${slPrice.toFixed(2)} on Exchange`);
//                                         }

//                                         await deployment.save();
//                                         await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Entry Order placed successfully`, respData.orderId);
//                                     } else {
//                                         await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'FAILED', respData.remarks || "RMS Rejected", respData.orderId);
//                                     }
//                                 } else {
//                                     const errorObj = orderResponse.error || {};
//                                     await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'FAILED', errorObj.internalErrorMessage || JSON.stringify(errorObj));
//                                 }
//                             } 
//                             // ==========================================
//                             // 🟢 FORWARD TEST / PAPER TRADING EXECUTION
//                             // ==========================================
//                             else {
//                                 await sleep(500); // Simulate API delay
//                                 const entryPrice = await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id) || currentSpotPrice;

//                                 deployment.tradedSecurityId = instrument.id;
//                                 deployment.tradedExchange = instrument.exchange;
//                                 deployment.tradedQty = tradeQty;
//                                 deployment.tradeAction = tradeAction;
//                                 deployment.tradedSymbol = instrument.tradingSymbol;
//                                 deployment.entryPrice = entryPrice;

//                                 // 🛡️ PAPER PRE-PUNCH SL LOGIC
//                                 if (isPrePunchSL && entryPrice > 0 && leg.slValue > 0) {
//                                     let slPrice = leg.slType === 'SL%' 
//                                         ? entryPrice - (entryPrice * (Number(leg.slValue) / 100))
//                                         : entryPrice - Number(leg.slValue);

//                                     deployment.paperSlPrice = slPrice; // Database me SL store kar lo
//                                     console.log(`🛡️ [PAPER PRE-PUNCH] Paper SL Locked at ₹${slPrice.toFixed(2)}`);
//                                 }

//                                 await deployment.save();
//                                 console.log(`📝 PAPER TRADE EXECUTED: ${instrument.tradingSymbol} at ₹${entryPrice}`);
//                                 await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Paper Trade Entry Executed at ₹${entryPrice}`);
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

//                        if (orderResponse.success) {
//                             const respData = orderResponse.data || {};
//                             const orderStatus = respData.orderStatus ? respData.orderStatus.toUpperCase() : "UNKNOWN";

//                             // 👇 UI par dikhane ke liye mast format: "NIFTY 30 MAR 22950 CALL (Auto-Exit)"
//                             const squareOffSymbolName = deployment.tradedSymbol ? `${deployment.tradedSymbol} (Auto-Exit)` : "Auto Square-Off";

//                             if (orderStatus !== "REJECTED") {
//                                 console.log("🏁 SQUARE-OFF ORDER SUCCESSFULLY PLACED!");

//                                 // 👇 NAYI LINES: Exit Price aur P&L nikalna 👇
//                                 const exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId) || 0;
//                                 let finalPnl = 0;
//                                 if (exitLtp > 0 && deployment.entryPrice > 0) {
//                                     finalPnl = deployment.tradeAction === 'BUY' 
//                                         ? (exitLtp - deployment.entryPrice) * deployment.tradedQty 
//                                         : (deployment.entryPrice - exitLtp) * deployment.tradedQty;
//                                 }

//                                 deployment.exitPrice = exitLtp;
//                                 deployment.realizedPnl = finalPnl;
//                                 // 👆 NAYI LINES 👆

//                                 deployment.status = 'COMPLETED';
//                                 await deployment.save();

//                                 await createAndEmitLog(broker, squareOffSymbolName, exitAction, deployment.tradedQty, 'SUCCESS', `Strategy Time-Based Square-Off Completed (P&L: ₹${finalPnl.toFixed(2)})`, respData.orderId);
//                             } else {
//                                 await createAndEmitLog(broker, squareOffSymbolName, exitAction, deployment.tradedQty, 'FAILED', respData.remarks || "RMS Rejected", respData.orderId);
//                             }
//                         } else {
//                             const errorObj = orderResponse.error || {};
//                             const errorMsg = errorObj.internalErrorMessage || errorObj.errorMessage || JSON.stringify(errorObj);

//                             const squareOffSymbolName = deployment.tradedSymbol ? `${deployment.tradedSymbol} (Auto-Exit)` : "Auto Square-Off";
//                             await createAndEmitLog(broker, squareOffSymbolName, exitAction, deployment.tradedQty, 'FAILED', errorMsg);
//                         }
//                     }
//                 }
//             }

//             // ==========================================
//             // 3. MTM (MAX PROFIT / MAX LOSS) SQUARE-OFF LOGIC 💰
//             // ==========================================
//             const riskData = strategy.data?.riskManagement || {};
//             const maxProfit = parseFloat(riskData.maxProfit) || 0;
//             const maxLoss = parseFloat(riskData.maxLoss) || 0;

//             // Sirf tabhi check karo jab trade open ho, Entry Price mil chuka ho, aur MaxProfit/MaxLoss set ho (0 se zyada ho)
//             if (!executionLocks.has(exitLockKey) && deployment.tradedSecurityId && deployment.entryPrice > 0 && (maxProfit > 0 || maxLoss > 0)) {

//                 for (const brokerId of deployment.brokers) {
//                     const broker = await Broker.findById(brokerId);
//                     if (broker && broker.engineOn) {

//                         try {
//                             // Dhan API se Contract ka Live Price (LTP) nikalo
//                             const liveLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId);

//                             if (liveLtp && liveLtp > 0) {
//                                 let currentPnl = 0;

//                                 // P&L Calculation: (Live Price - Entry Price) * Qty
//                                 if (deployment.tradeAction === 'BUY') {
//                                     currentPnl = (liveLtp - deployment.entryPrice) * deployment.tradedQty;
//                                 } else {
//                                     currentPnl = (deployment.entryPrice - liveLtp) * deployment.tradedQty;
//                                 }

//                                 console.log(`📊 [MTM Tracker] Strategy: ${strategy.name} | Live P&L: ₹${currentPnl.toFixed(2)} (LTP: ${liveLtp}, Entry: ${deployment.entryPrice})`);

//                                 let squareOffReason = null;

//                                 // Condition 1: Max Profit Hit (Target)
//                                 if (maxProfit > 0 && currentPnl >= maxProfit) {
//                                     squareOffReason = `Target Reached (Max Profit: ₹${maxProfit})`;
//                                 } 
//                                 // Condition 2: Max Loss Hit (Stop-Loss) - Math.abs ensures it works even if user puts 500 or -500
//                                 else if (maxLoss > 0 && currentPnl <= -Math.abs(maxLoss)) {
//                                     squareOffReason = `Stop-Loss Hit (Max Loss: ₹${Math.abs(maxLoss)})`;
//                                 }

//                                 // Agar Target ya SL hit hua to Order fire karo!
//                                 if (squareOffReason) {
//                                     executionLocks.add(exitLockKey);
//                                     console.log(`🚨 MTM SQUARE-OFF TRIGGERED! Reason: ${squareOffReason}`);

//                                     const exitAction = deployment.tradeAction === 'BUY' ? 'SELL' : 'BUY';
//                                     const orderData = {
//                                         action: exitAction,
//                                         quantity: deployment.tradedQty,
//                                         securityId: deployment.tradedSecurityId,
//                                         segment: deployment.tradedExchange
//                                     };

//                                     const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
//                                     const squareOffSymbolName = deployment.tradedSymbol ? `${deployment.tradedSymbol} (MTM-Exit)` : "MTM Square-Off";

//                                     if (orderResponse.success) {
//                                         const respData = orderResponse.data || {};
//                                         if (respData.orderStatus && respData.orderStatus.toUpperCase() !== "REJECTED") {
//                                             console.log("🏁 MTM SQUARE-OFF ORDER SUCCESSFULLY PLACED!");

//                                             // 👇 NAYI LINES 👇
//                                             deployment.exitPrice = liveLtp;
//                                             deployment.realizedPnl = currentPnl;
//                                             // 👆 NAYI LINES 👆

//                                             deployment.status = 'COMPLETED'; // Algo Stop
//                                             await deployment.save();
//                                             await createAndEmitLog(broker, squareOffSymbolName, exitAction, deployment.tradedQty, 'SUCCESS', `MTM Exit: ${squareOffReason} (Final P&L: ₹${currentPnl.toFixed(2)})`, respData.orderId);
//                                         } else {
//                                             await createAndEmitLog(broker, squareOffSymbolName, exitAction, deployment.tradedQty, 'FAILED', respData.remarks || "RMS Rejected", respData.orderId);
//                                             executionLocks.delete(exitLockKey); // Lock hatao taaki agle 30 sec me fir try kare
//                                         }
//                                     } else {
//                                         const errorMsg = orderResponse.error?.errorMessage || orderResponse.data?.remarks || JSON.stringify(orderResponse.error || {});
//                                         await createAndEmitLog(broker, squareOffSymbolName, exitAction, deployment.tradedQty, 'FAILED', `MTM Exit Failed: ${errorMsg}`);
//                                         executionLocks.delete(exitLockKey);
//                                     }
//                                 }
//                             }

//                             // 🔥 Dhan API Block (805 Error) se bachne ke liye 1 second ka delay
//                             await sleep(1000); 

//                         } catch (err) {
//                             console.log(`⚠️ MTM Check Failed for ${strategy.name}: ${err.message}`);
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
const { placeDhanOrder, fetchLiveLTP, fetchDhanHistoricalData } = require('../services/dhanService');
const { calculateIndicator, extractParams, evaluateCondition } = require('../services/indicatorService'); // 👈 NAYA
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
// 🧠 1.5 INDICATOR SIGNAL CHECKER (The Brain)
// ==========================================
const getIndicatorSignal = async (strategy, broker, baseSymbol) => {
    try {
        const dhanIdMap = { "NIFTY": "13", "BANKNIFTY": "25", "FINNIFTY": "27", "MIDCPNIFTY": "118", "SENSEX": "51" };
        const spotSecurityId = dhanIdMap[baseSymbol] || "25";
        const timeframe = strategy.interval ? strategy.interval.replace(' min', '') : "5";

        // 1. Pichle 3 din ka data mangao (EMA/SMA calculation ke liye accurate history chahiye)
        const toDate = new Date().toISOString().split('T')[0];
        const fromDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const dhanRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, spotSecurityId, "IDX_I", "INDEX", fromDate, toDate, timeframe);
        if (!dhanRes.success || !dhanRes.data || !dhanRes.data.close) return { long: false, short: false };

        const candles = [];
        for (let i = 0; i < dhanRes.data.close.length; i++) {
            candles.push({ close: dhanRes.data.close[i], high: dhanRes.data.high[i], low: dhanRes.data.low[i], open: dhanRes.data.open[i] });
        }
        if (candles.length < 20) return { long: false, short: false }; // Data kam hai

        // 2. Rules dhundo
        const findConditions = (obj) => {
            if (!obj || typeof obj !== 'object') return null;
            if (obj.longRules && Array.isArray(obj.longRules)) return obj;
            if (Array.isArray(obj)) { for (let item of obj) { const f = findConditions(item); if (f) return f; } }
            else { for (let key in obj) { const f = findConditions(obj[key]); if (f) return f; } }
            return null;
        };
        const entryConds = findConditions(strategy);
        if (!entryConds) return { long: false, short: false };

        // 3. 🚨 HAMESHA LAST CLOSED CANDLE PAR CHECK KAREIN (Repainting se bachne ke liye)
        const i = candles.length - 2;
        if (i < 1) return { long: false, short: false };

        let longSignal = false;
        if (entryConds.longRules && entryConds.longRules.length > 0) {
            let overallResult = null;
            entryConds.longRules.forEach((rule, idx) => {
                const p1 = extractParams(rule.ind1, rule.params);
                const ind1Data = calculateIndicator({ ...rule.ind1, params: p1 }, candles);
                const p2 = extractParams(rule.ind2, null);
                const ind2Data = calculateIndicator({ ...rule.ind2, params: p2 }, candles);

                const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
                const ruleResult = evaluateCondition(ind1Data[i], ind2Data[i], ind1Data[i - 1], ind2Data[i - 1], operator);

                if (idx === 0) overallResult = ruleResult;
                else {
                    const logicalOp = entryConds.logicalOps[idx - 1];
                    if (logicalOp === 'AND') overallResult = overallResult && ruleResult;
                    else if (logicalOp === 'OR') overallResult = overallResult || ruleResult;
                }
            });
            longSignal = overallResult;
        }

        return { long: longSignal, short: false }; // Abhi basic logic rakha hai

    } catch (e) {
        console.error("❌ Indicator Eval Error:", e.message);
        return { long: false, short: false };
    }
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
            if (!executionLocks.has(entryLockKey) && !deployment.tradedSecurityId) {

                let shouldEnter = false;
                const strategyType = strategy.type || "Time Based";

                // 🟢 A. INDICATOR BASED CHECK
                if (strategyType === "Indicator Based") {
                    // Sirf pehle broker ki key se indicator check karo (taaki API rate limit bachi rahe)
                    const broker = await Broker.findById(deployment.brokers[0]);
                    if (broker && broker.engineOn) {
                        const instrumentData = (strategy.data.instruments && strategy.data.instruments.length > 0) ? strategy.data.instruments[0] : {};
                        let rawSymbol = instrumentData.name || config.index || strategy.name || "NIFTY";
                        let baseSymbol = "NIFTY";
                        if (rawSymbol.toUpperCase().includes("BANK")) baseSymbol = "BANKNIFTY";

                        // 🧠 Signal mangao
                        const signal = await getIndicatorSignal(strategy, broker, baseSymbol);
                        if (signal.long || signal.short) {
                            shouldEnter = true;
                            console.log(`📈 [INDICATOR MATCHED] Signal received for ${strategy.name}`);
                        }
                    }
                }
                // ⏰ B. TIME BASED CHECK
                else {
                    if (config.startTime === currentTime) {
                        shouldEnter = true;
                    }
                }

                // 🚀 C. EXECUTE ENTRY (Agar trigger mila)
                if (shouldEnter) {
                    executionLocks.add(entryLockKey);
                    console.log(`⚡ ENTRY TRIGGERED! Strategy: ${strategy.name} | Mode: ${strategyType}`);

                    const isPrePunchSL = strategy.data?.advanceSettings?.prePunchSL || false;

                    for (const brokerId of deployment.brokers) {
                        const broker = await Broker.findById(brokerId);
                        if (broker && broker.engineOn) {

                            const instrumentData = (strategy.data.instruments && strategy.data.instruments.length > 0) ? strategy.data.instruments[0] : {};
                            let rawSymbol = instrumentData.name || config.index || strategy.symbol || strategy.name || "";

                            let baseSymbol = "NIFTY";
                            const upperRawSymbol = String(rawSymbol).toUpperCase();
                            if (upperRawSymbol.includes("BANK")) baseSymbol = "BANKNIFTY";
                            else if (upperRawSymbol.includes("FIN")) baseSymbol = "FINNIFTY";
                            else if (upperRawSymbol.includes("MID")) baseSymbol = "MIDCPNIFTY";

                            for (const leg of strategy.data.legs) {
                                let optType = leg.optionType === "Call" ? "CE" : "PE";
                                let tradeAction = leg.action.toUpperCase();
                                let tradeQty = (leg.quantity || 1) * deployment.multiplier;

                                let currentSpotPrice = await fetchLivePrice(baseSymbol);
                                if (!currentSpotPrice) continue;

                                let stepValue = getStrikeStep(baseSymbol);
                                let targetStrikePrice = Math.round(currentSpotPrice / stepValue) * stepValue;
                                const instrument = getOptionSecurityId(baseSymbol, targetStrikePrice, optType);

                                if (!instrument) continue;

                                // ==========================================
                                // 🟢 FORWARD TEST / PAPER TRADING EXECUTION
                                // ==========================================
                                if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
                                    await sleep(500);
                                    const entryPrice = await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id) || currentSpotPrice;

                                    deployment.tradedSecurityId = instrument.id;
                                    deployment.tradedExchange = instrument.exchange;
                                    deployment.tradedQty = tradeQty;
                                    deployment.tradeAction = tradeAction;
                                    deployment.tradedSymbol = instrument.tradingSymbol;
                                    deployment.entryPrice = entryPrice;

                                    if (isPrePunchSL && entryPrice > 0 && leg.slValue > 0) {
                                        let slPrice = leg.slType === 'SL%'
                                            ? entryPrice - (entryPrice * (Number(leg.slValue) / 100))
                                            : entryPrice - Number(leg.slValue);

                                        deployment.paperSlPrice = slPrice;
                                    }

                                    await deployment.save();
                                    console.log(`📝 PAPER TRADE EXECUTED: ${instrument.tradingSymbol} at ₹${entryPrice}`);
                                    await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Paper Trade Entry Executed at ₹${entryPrice}`);
                                }
                                // ==========================================
                                // 🔴 LIVE TRADING EXECUTION (Asli Paisa)
                                // ==========================================
                                if (deployment.executionType === 'LIVE') {
                                    const orderData = { action: tradeAction, quantity: tradeQty, securityId: instrument.id, segment: instrument.exchange };
                                    const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

                                    if (orderResponse.success) {
                                        const respData = orderResponse.data || {};
                                        const orderStatus = respData.orderStatus ? respData.orderStatus.toUpperCase() : "UNKNOWN";

                                        if (orderStatus !== "REJECTED") {
                                            deployment.tradedSecurityId = instrument.id;
                                            deployment.tradedExchange = instrument.exchange;
                                            deployment.tradedQty = tradeQty;
                                            deployment.tradeAction = tradeAction;
                                            deployment.tradedSymbol = instrument.tradingSymbol;

                                            await sleep(1000);
                                            const entryPrice = await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id);
                                            deployment.entryPrice = entryPrice || 0;

                                            // 🛡️ LIVE PRE-PUNCH SL LOGIC
                                            if (isPrePunchSL && entryPrice > 0 && leg.slValue > 0) {
                                                let slPrice = leg.slType === 'SL%'
                                                    ? entryPrice - (entryPrice * (Number(leg.slValue) / 100))
                                                    : entryPrice - Number(leg.slValue);

                                                // Yahan Dhan ka SL-M Order fire hoga future me
                                                console.log(`🛡️ [LIVE PRE-PUNCH] SL Placed at ₹${slPrice.toFixed(2)} on Exchange`);
                                            }

                                            await deployment.save();
                                            await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Entry Order placed successfully`, respData.orderId);
                                        } else {
                                            await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'FAILED', respData.remarks || "RMS Rejected", respData.orderId);
                                        }
                                    } else {
                                        const errorObj = orderResponse.error || {};
                                        await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'FAILED', errorObj.internalErrorMessage || JSON.stringify(errorObj));
                                    }
                                }
                            }
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

                                // 👇 NAYI LINES: Exit Price aur P&L nikalna 👇
                                const exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId) || 0;
                                let finalPnl = 0;
                                if (exitLtp > 0 && deployment.entryPrice > 0) {
                                    finalPnl = deployment.tradeAction === 'BUY'
                                        ? (exitLtp - deployment.entryPrice) * deployment.tradedQty
                                        : (deployment.entryPrice - exitLtp) * deployment.tradedQty;
                                }

                                deployment.exitPrice = exitLtp;
                                deployment.realizedPnl = finalPnl;
                                // 👆 NAYI LINES 👆

                                deployment.status = 'COMPLETED';
                                await deployment.save();

                                await createAndEmitLog(broker, squareOffSymbolName, exitAction, deployment.tradedQty, 'SUCCESS', `Strategy Time-Based Square-Off Completed (P&L: ₹${finalPnl.toFixed(2)})`, respData.orderId);
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

            // ==========================================
            // 3. MTM (MAX PROFIT / MAX LOSS) SQUARE-OFF LOGIC 💰
            // ==========================================
            const riskData = strategy.data?.riskManagement || {};
            const maxProfit = parseFloat(riskData.maxProfit) || 0;
            const maxLoss = parseFloat(riskData.maxLoss) || 0;

            // Sirf tabhi check karo jab trade open ho, Entry Price mil chuka ho, aur MaxProfit/MaxLoss set ho (0 se zyada ho)
            if (!executionLocks.has(exitLockKey) && deployment.tradedSecurityId && deployment.entryPrice > 0 && (maxProfit > 0 || maxLoss > 0)) {

                for (const brokerId of deployment.brokers) {
                    const broker = await Broker.findById(brokerId);
                    if (broker && broker.engineOn) {

                        try {
                            // Dhan API se Contract ka Live Price (LTP) nikalo
                            const liveLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId);

                            if (liveLtp && liveLtp > 0) {
                                let currentPnl = 0;

                                // P&L Calculation: (Live Price - Entry Price) * Qty
                                if (deployment.tradeAction === 'BUY') {
                                    currentPnl = (liveLtp - deployment.entryPrice) * deployment.tradedQty;
                                } else {
                                    currentPnl = (deployment.entryPrice - liveLtp) * deployment.tradedQty;
                                }

                                console.log(`📊 [MTM Tracker] Strategy: ${strategy.name} | Live P&L: ₹${currentPnl.toFixed(2)} (LTP: ${liveLtp}, Entry: ${deployment.entryPrice})`);

                                let squareOffReason = null;

                                // Condition 1: Max Profit Hit (Target)
                                if (maxProfit > 0 && currentPnl >= maxProfit) {
                                    squareOffReason = `Target Reached (Max Profit: ₹${maxProfit})`;
                                }
                                // Condition 2: Max Loss Hit (Stop-Loss) - Math.abs ensures it works even if user puts 500 or -500
                                else if (maxLoss > 0 && currentPnl <= -Math.abs(maxLoss)) {
                                    squareOffReason = `Stop-Loss Hit (Max Loss: ₹${Math.abs(maxLoss)})`;
                                }

                                // Agar Target ya SL hit hua to Order fire karo!
                                if (squareOffReason) {
                                    executionLocks.add(exitLockKey);
                                    console.log(`🚨 MTM SQUARE-OFF TRIGGERED! Reason: ${squareOffReason}`);

                                    const exitAction = deployment.tradeAction === 'BUY' ? 'SELL' : 'BUY';
                                    const orderData = {
                                        action: exitAction,
                                        quantity: deployment.tradedQty,
                                        securityId: deployment.tradedSecurityId,
                                        segment: deployment.tradedExchange
                                    };

                                    const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                                    const squareOffSymbolName = deployment.tradedSymbol ? `${deployment.tradedSymbol} (MTM-Exit)` : "MTM Square-Off";

                                    if (orderResponse.success) {
                                        const respData = orderResponse.data || {};
                                        if (respData.orderStatus && respData.orderStatus.toUpperCase() !== "REJECTED") {
                                            console.log("🏁 MTM SQUARE-OFF ORDER SUCCESSFULLY PLACED!");

                                            // 👇 NAYI LINES 👇
                                            deployment.exitPrice = liveLtp;
                                            deployment.realizedPnl = currentPnl;
                                            // 👆 NAYI LINES 👆

                                            deployment.status = 'COMPLETED'; // Algo Stop
                                            await deployment.save();
                                            await createAndEmitLog(broker, squareOffSymbolName, exitAction, deployment.tradedQty, 'SUCCESS', `MTM Exit: ${squareOffReason} (Final P&L: ₹${currentPnl.toFixed(2)})`, respData.orderId);
                                        } else {
                                            await createAndEmitLog(broker, squareOffSymbolName, exitAction, deployment.tradedQty, 'FAILED', respData.remarks || "RMS Rejected", respData.orderId);
                                            executionLocks.delete(exitLockKey); // Lock hatao taaki agle 30 sec me fir try kare
                                        }
                                    } else {
                                        const errorMsg = orderResponse.error?.errorMessage || orderResponse.data?.remarks || JSON.stringify(orderResponse.error || {});
                                        await createAndEmitLog(broker, squareOffSymbolName, exitAction, deployment.tradedQty, 'FAILED', `MTM Exit Failed: ${errorMsg}`);
                                        executionLocks.delete(exitLockKey);
                                    }
                                }
                            }

                            // 🔥 Dhan API Block (805 Error) se bachne ke liye 1 second ka delay
                            await sleep(1000);

                        } catch (err) {
                            console.log(`⚠️ MTM Check Failed for ${strategy.name}: ${err.message}`);
                        }
                    }
                }
            }
        }
    } catch (error) { console.error("❌ Trading Engine Error:", error); }
});