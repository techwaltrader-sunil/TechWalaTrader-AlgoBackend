// const cron = require('node-cron');
// const moment = require('moment-timezone');
// const axios = require('axios');
// const Deployment = require('../models/Deployment');
// const Broker = require('../models/Broker');
// const AlgoTradeLog = require('../models/AlgoTradeLog');
// const { placeDhanOrder, fetchLiveLTP, fetchDhanHistoricalData } = require('../services/dhanService');
// const { calculateIndicator, extractParams, evaluateCondition } = require('../services/indicatorService'); // 👈 NAYA
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
// // 🧠 1.5 INDICATOR SIGNAL CHECKER (The Brain)
// // ==========================================
// const getIndicatorSignal = async (strategy, broker, baseSymbol) => {
//     try {
//         const dhanIdMap = { "NIFTY": "13", "BANKNIFTY": "25", "FINNIFTY": "27", "MIDCPNIFTY": "118", "SENSEX": "51" };
//         const spotSecurityId = dhanIdMap[baseSymbol] || "25";
//         const timeframe = strategy.interval ? strategy.interval.replace(' min', '') : "5";

//         // 1. Pichle 3 din ka data mangao (EMA/SMA calculation ke liye accurate history chahiye)
//         const toDate = new Date().toISOString().split('T')[0];
//         const fromDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

//         const dhanRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, spotSecurityId, "IDX_I", "INDEX", fromDate, toDate, timeframe);
//         if (!dhanRes.success || !dhanRes.data || !dhanRes.data.close) return { long: false, short: false };

//         const candles = [];
//         for (let i = 0; i < dhanRes.data.close.length; i++) {
//             candles.push({ close: dhanRes.data.close[i], high: dhanRes.data.high[i], low: dhanRes.data.low[i], open: dhanRes.data.open[i] });
//         }
//         if (candles.length < 20) return { long: false, short: false }; // Data kam hai

//         // 2. Rules dhundo
//         const findConditions = (obj) => {
//             if (!obj || typeof obj !== 'object') return null;
//             if (obj.longRules && Array.isArray(obj.longRules)) return obj;
//             if (Array.isArray(obj)) { for (let item of obj) { const f = findConditions(item); if (f) return f; } }
//             else { for (let key in obj) { const f = findConditions(obj[key]); if (f) return f; } }
//             return null;
//         };
//         // Mongoose document ko plain object me convert karke bhejo taaki loop na phase
//         const entryConds = findConditions(strategy.toObject ? strategy.toObject() : strategy);
//         if (!entryConds) return { long: false, short: false };

//         // 3. 🚨 HAMESHA LAST CLOSED CANDLE PAR CHECK KAREIN (Repainting se bachne ke liye)
//         const i = candles.length - 2;
//         if (i < 1) return { long: false, short: false };

//         // 🟢 LONG SIGNAL EVALUATION
//         let longSignal = false;
//         if (entryConds.longRules && entryConds.longRules.length > 0) {
//             let overallResult = null;
//             entryConds.longRules.forEach((rule, idx) => {
//                 const p1 = extractParams(rule.ind1, rule.params);
//                 const ind1Data = calculateIndicator({ ...rule.ind1, params: p1 }, candles);
//                 const p2 = extractParams(rule.ind2, null);
//                 const ind2Data = calculateIndicator({ ...rule.ind2, params: p2 }, candles);

//                 const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
//                 const ruleResult = evaluateCondition(ind1Data[i], ind2Data[i], ind1Data[i - 1], ind2Data[i - 1], operator);

//                 if (idx === 0) overallResult = ruleResult;
//                 else {
//                     const logicalOp = entryConds.logicalOps[idx - 1];
//                     if (logicalOp === 'AND') overallResult = overallResult && ruleResult;
//                     else if (logicalOp === 'OR') overallResult = overallResult || ruleResult;
//                 }
//             });
//             longSignal = overallResult;
//         }

//         // 🔴 SHORT SIGNAL EVALUATION (Neeche girne ka signal - YE MISSING THA)
//         let shortSignal = false;
//         if (entryConds.shortRules && entryConds.shortRules.length > 0) {
//             let overallResult = null;
//             entryConds.shortRules.forEach((rule, idx) => {
//                 const p1 = extractParams(rule.ind1, rule.params);
//                 const ind1Data = calculateIndicator({...rule.ind1, params: p1}, candles);
//                 const p2 = extractParams(rule.ind2, null);
//                 const ind2Data = calculateIndicator({...rule.ind2, params: p2}, candles);

//                 const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
//                 const ruleResult = evaluateCondition(ind1Data[i], ind2Data[i], ind1Data[i-1], ind2Data[i-1], operator);

//                 if (idx === 0) overallResult = ruleResult;
//                 else {
//                     const logicalOp = entryConds.shortLogicalOps ? entryConds.shortLogicalOps[idx - 1] : (entryConds.logicalOps[idx - 1] || 'AND');
//                     if (logicalOp === 'AND') overallResult = overallResult && ruleResult;
//                     else if (logicalOp === 'OR') overallResult = overallResult || ruleResult;
//                 }
//             });
//             shortSignal = overallResult;
//         }

//         // ✅ AB DONO SIGNAL RETURN HONGE
//         return { long: longSignal, short: shortSignal };

//     } catch (e) {
//         console.error("❌ Indicator Eval Error:", e.message);
//         return { long: false, short: false };
//     }
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

//             await sleep(1000);

//             const strategy = deployment.strategyId;
//             if (!strategy) continue;

//             const config = strategy.data?.config || {};
//             const entryLockKey = `ENTRY_${deployment._id.toString()}_${currentTime}`;
//             const exitLockKey = `EXIT_${deployment._id.toString()}_${currentTime}`;
//             const squareOffTime = deployment.squareOffTime || config.squareOffTime;

//             // 1. ENTRY LOGIC ⚡
//             if (!executionLocks.has(entryLockKey) && !deployment.tradedSecurityId) {

//                 let shouldEnter = false;
//                 let currentSignalType = "NONE";
//                 const strategyType = strategy.type || "Time Based";

//                 // ==============================================================
//                 // 🛑 THE SHIELD: STRICT SYMBOL VALIDATION (Fail-Safe Mechanism)
//                 // ==============================================================
//                 const instrumentData = (strategy.data.instruments && strategy.data.instruments.length > 0) ? strategy.data.instruments[0] : {};
//                 let rawSymbol = instrumentData.name || config.index || strategy.symbol || strategy.name;

//                 if (!rawSymbol) {
//                     console.log(`❌ [CRITICAL ERROR] No valid symbol found for strategy: ${strategy.name}. Trade Aborted!`);
//                     continue; // Loop me agli strategy par chale jao
//                 }

//                 let baseSymbol = "";
//                 const upperRawSymbol = String(rawSymbol).toUpperCase();

//                 if (upperRawSymbol.includes("BANK")) baseSymbol = "BANKNIFTY";
//                 else if (upperRawSymbol.includes("FIN")) baseSymbol = "FINNIFTY";
//                 else if (upperRawSymbol.includes("MID")) baseSymbol = "MIDCPNIFTY";
//                 else if (upperRawSymbol.includes("NIFTY")) baseSymbol = "NIFTY";
//                 else if (upperRawSymbol.includes("SENSEX")) baseSymbol = "SENSEX";
//                 else {
//                     console.log(`❌ [CRITICAL ERROR] Unknown symbol format: '${rawSymbol}' for strategy: ${strategy.name}. Trade Aborted!`);
//                     continue; // Agar "Reliance" ya koi ajeeb naam hai toh rok do
//                 }
//                 // ==============================================================

//                 // 🟢 A. INDICATOR BASED CHECK
//                 if (strategyType === "Indicator Based") {
//                     const broker = await Broker.findById(deployment.brokers[0]);
//                     if (broker && broker.engineOn) {
//                         // 🧠 Signal mangao (Ab baseSymbol upar se verified aayega)
//                         const signal = await getIndicatorSignal(strategy, broker, baseSymbol);

//                         if (signal.long) {
//                             shouldEnter = true;
//                             currentSignalType = "LONG";
//                             console.log(`📈 [BULLISH SIGNAL] LONG Indicator matched for ${strategy.name}`);
//                         } else if (signal.short) {
//                             shouldEnter = true;
//                             currentSignalType = "SHORT";
//                             console.log(`📉 [BEARISH SIGNAL] SHORT Indicator matched for ${strategy.name}`);
//                         }
//                     }
//                 }
//                 // ⏰ B. TIME BASED CHECK
//                 else {
//                     if (config.startTime === currentTime) {
//                         shouldEnter = true;
//                         currentSignalType = "TIME";
//                     }
//                 }

//                 // 🚀 C. EXECUTE ENTRY
//                 if (shouldEnter) {
//                     executionLocks.add(entryLockKey);
//                     const isPrePunchSL = strategy.data?.advanceSettings?.prePunchSL || false;

//                     for (const brokerId of deployment.brokers) {
//                         const broker = await Broker.findById(brokerId);
//                         if (broker && broker.engineOn) {

//                             for (const leg of strategy.data.legs) {
//                                 let tradeAction = (leg.action || "BUY").toUpperCase();
//                                 let tradeQty = (leg.quantity || 1) * deployment.multiplier;

//                                 // 🔥 OPTION BUYING & SELLING LOGIC
//                                 let optType = leg.optionType === "Call" ? "CE" : "PE";

//                                 if (currentSignalType === "LONG") {
//                                     optType = (tradeAction === "BUY") ? "CE" : "PE";
//                                 } else if (currentSignalType === "SHORT") {
//                                     optType = (tradeAction === "BUY") ? "PE" : "CE";
//                                 }

//                                 let currentSpotPrice = await fetchLivePrice(baseSymbol);
//                                 if (!currentSpotPrice) continue;

//                                 let stepValue = getStrikeStep(baseSymbol);
//                                 let targetStrikePrice = Math.round(currentSpotPrice / stepValue) * stepValue;
//                                 // const instrument = getOptionSecurityId(baseSymbol, targetStrikePrice, optType);

//                                 // 🔥 THE FIX: Passed all required parameters to getOptionSecurityId
//                                 const strikeCriteria = leg.strikeCriteria || "ATM pt";
//                                 const strikeType = leg.strikeType || "ATM";
//                                 const requestedExpiry = leg.expiry || "WEEKLY";

//                                 const instrument = getOptionSecurityId(
//                                     baseSymbol,
//                                     currentSpotPrice, // Dhyaan dein: Yahan targetStrikePrice nahi, sidha Spot Price bhejna hai
//                                     strikeCriteria,
//                                     strikeType,
//                                     optType,
//                                     requestedExpiry
//                                 );

//                                 if (!instrument) continue;

//                                 // 🟢 FORWARD TEST / PAPER TRADING EXECUTION
//                                 if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                                     await sleep(500);
//                                     const entryPrice = await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id) || currentSpotPrice;

//                                     deployment.tradedSecurityId = instrument.id;
//                                     deployment.tradedExchange = instrument.exchange;
//                                     deployment.tradedQty = tradeQty;
//                                     deployment.tradeAction = tradeAction;
//                                     deployment.tradedSymbol = instrument.tradingSymbol;
//                                     deployment.entryPrice = entryPrice;

//                                     if (isPrePunchSL && entryPrice > 0 && leg.slValue > 0) {
//                                         let slPrice = 0;
//                                         if (tradeAction === "BUY") {
//                                             slPrice = leg.slType === 'SL%' ? entryPrice - (entryPrice * (Number(leg.slValue) / 100)) : entryPrice - Number(leg.slValue);
//                                         } else if (tradeAction === "SELL") {
//                                             slPrice = leg.slType === 'SL%' ? entryPrice + (entryPrice * (Number(leg.slValue) / 100)) : entryPrice + Number(leg.slValue);
//                                         }
//                                         deployment.paperSlPrice = slPrice;
//                                     }

//                                     await deployment.save();
//                                     console.log(`📝 PAPER TRADE EXECUTED: ${instrument.tradingSymbol} (Action: ${tradeAction}) at ₹${entryPrice}`);
//                                     await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Paper Trade Entry Executed at ₹${entryPrice}`);
//                                 }

//                                 // ==========================================
//                                 // 🔴 LIVE TRADING EXECUTION (Asli Paisa)
//                                 // ==========================================
//                                 if (deployment.executionType === 'LIVE') {
//                                     const orderData = { action: tradeAction, quantity: tradeQty, securityId: instrument.id, segment: instrument.exchange };
//                                     const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

//                                     if (orderResponse.success) {
//                                         const respData = orderResponse.data || {};
//                                         const orderStatus = respData.orderStatus ? respData.orderStatus.toUpperCase() : "UNKNOWN";

//                                         if (orderStatus !== "REJECTED") {
//                                             deployment.tradedSecurityId = instrument.id;
//                                             deployment.tradedExchange = instrument.exchange;
//                                             deployment.tradedQty = tradeQty;
//                                             deployment.tradeAction = tradeAction;
//                                             deployment.tradedSymbol = instrument.tradingSymbol;

//                                             await sleep(1000);
//                                             const entryPrice = await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id);
//                                             deployment.entryPrice = entryPrice || 0;

//                                             // 🛡️ LIVE PRE-PUNCH SL LOGIC
//                                             if (isPrePunchSL && entryPrice > 0 && leg.slValue > 0) {
//                                                 let slPrice = leg.slType === 'SL%'
//                                                     ? entryPrice - (entryPrice * (Number(leg.slValue) / 100))
//                                                     : entryPrice - Number(leg.slValue);

//                                                 // Yahan Dhan ka SL-M Order fire hoga future me
//                                                 console.log(`🛡️ [LIVE PRE-PUNCH] SL Placed at ₹${slPrice.toFixed(2)} on Exchange`);
//                                             }

//                                             await deployment.save();
//                                             await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Entry Order placed successfully`, respData.orderId);
//                                         } else {
//                                             await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'FAILED', respData.remarks || "RMS Rejected", respData.orderId);
//                                         }
//                                     } else {
//                                         const errorObj = orderResponse.error || {};
//                                         await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'FAILED', errorObj.internalErrorMessage || JSON.stringify(errorObj));
//                                     }
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }

//             // 2. // ==========================================
//             // 2. AUTO SQUARE-OFF LOGIC ⏰
//             // ==========================================
//             if (squareOffTime === currentTime && !executionLocks.has(exitLockKey) && deployment.tradedSecurityId) {
//                 executionLocks.add(exitLockKey);
//                 console.log(`⏰ SQUARE-OFF TRIGGERED! Strategy: ${strategy.name}`);

//                 for (const brokerId of deployment.brokers) {
//                     const broker = await Broker.findById(brokerId);
//                     if (broker && broker.engineOn) {
//                         const exitAction = deployment.tradeAction === 'BUY' ? 'SELL' : 'BUY';
//                         const squareOffSymbolName = deployment.tradedSymbol ? `${deployment.tradedSymbol} (Auto-Exit)` : "Auto Square-Off";

//                         let isExitSuccessful = false;
//                         let exitLtp = 0;
//                         let exitRemarks = "Square-Off Completed";
//                         let orderIdToSave = "N/A";

//                         // 🟢 PAPER TRADE EXIT LOGIC
//                         if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                             await sleep(500);
//                             exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId) || 0;
//                             isExitSuccessful = true;
//                             exitRemarks = "Paper Trade Auto-Exit Executed";
//                         }
//                         // 🔴 LIVE TRADE EXIT LOGIC
//                         else if (deployment.executionType === 'LIVE') {
//                             const orderData = { action: exitAction, quantity: deployment.tradedQty, securityId: deployment.tradedSecurityId, segment: deployment.tradedExchange };
//                             const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

//                             if (orderResponse.success) {
//                                 const respData = orderResponse.data || {};
//                                 if (respData.orderStatus && respData.orderStatus.toUpperCase() !== "REJECTED") {
//                                     await sleep(1000);
//                                     exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId) || 0;
//                                     isExitSuccessful = true;
//                                     orderIdToSave = respData.orderId;
//                                     exitRemarks = `Live Auto-Exit Successful`;
//                                 } else {
//                                     exitRemarks = respData.remarks || "RMS Rejected";
//                                 }
//                             } else {
//                                 exitRemarks = orderResponse.error?.errorMessage || "API Order Failed";
//                             }
//                         }

//                         // 🧮 FINAL P&L CALCULATION & DB SAVE
//                         if (isExitSuccessful) {
//                             let finalPnl = 0;
//                             if (exitLtp > 0 && deployment.entryPrice > 0) {
//                                 finalPnl = deployment.tradeAction === 'BUY'
//                                     ? (exitLtp - deployment.entryPrice) * deployment.tradedQty
//                                     : (deployment.entryPrice - exitLtp) * deployment.tradedQty;
//                             }

//                             deployment.exitPrice = exitLtp;
//                             deployment.pnl = finalPnl;          // 🔥 FIX: Frontend isko padhta hai
//                             deployment.realizedPnl = finalPnl;
//                             deployment.status = 'COMPLETED';
//                             await deployment.save();

//                             console.log(`🏁 [EXIT SUCCESS] ${exitRemarks} | P&L: ₹${finalPnl.toFixed(2)}`);
//                             await createAndEmitLog(broker, squareOffSymbolName, exitAction, deployment.tradedQty, 'SUCCESS', `${exitRemarks} (P&L: ₹${finalPnl.toFixed(2)})`, orderIdToSave);
//                         } else {
//                             await createAndEmitLog(broker, squareOffSymbolName, exitAction, deployment.tradedQty, 'FAILED', `Exit Failed: ${exitRemarks}`, orderIdToSave);
//                             executionLocks.delete(exitLockKey); // Failed hua to aagle loop me fir try karega
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

//             if (!executionLocks.has(exitLockKey) && deployment.tradedSecurityId && deployment.entryPrice > 0 && (maxProfit > 0 || maxLoss > 0)) {
//                 for (const brokerId of deployment.brokers) {
//                     const broker = await Broker.findById(brokerId);
//                     if (broker && broker.engineOn) {
//                         try {
//                             const liveLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId);

//                             if (liveLtp && liveLtp > 0) {
//                                 let currentPnl = deployment.tradeAction === 'BUY'
//                                     ? (liveLtp - deployment.entryPrice) * deployment.tradedQty
//                                     : (deployment.entryPrice - liveLtp) * deployment.tradedQty;

//                                 let squareOffReason = null;
//                                 if (maxProfit > 0 && currentPnl >= maxProfit) squareOffReason = `Target Reached (Max Profit: ₹${maxProfit})`;
//                                 else if (maxLoss > 0 && currentPnl <= -Math.abs(maxLoss)) squareOffReason = `Stop-Loss Hit (Max Loss: ₹${Math.abs(maxLoss)})`;

//                                 if (squareOffReason) {
//                                     executionLocks.add(exitLockKey);
//                                     console.log(`🚨 MTM SQUARE-OFF TRIGGERED! Reason: ${squareOffReason}`);

//                                     const exitAction = deployment.tradeAction === 'BUY' ? 'SELL' : 'BUY';
//                                     const squareOffSymbolName = deployment.tradedSymbol ? `${deployment.tradedSymbol} (MTM-Exit)` : "MTM Square-Off";

//                                     let isExitSuccessful = false;
//                                     let exitRemarks = squareOffReason;
//                                     let orderIdToSave = "N/A";

//                                     // 🟢 PAPER TRADE MTM EXIT
//                                     if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                                         isExitSuccessful = true;
//                                         exitRemarks = `Paper Trade MTM Exit: ${squareOffReason}`;
//                                     }
//                                     // 🔴 LIVE TRADE MTM EXIT
//                                     else if (deployment.executionType === 'LIVE') {
//                                         const orderData = { action: exitAction, quantity: deployment.tradedQty, securityId: deployment.tradedSecurityId, segment: deployment.tradedExchange };
//                                         const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

//                                         if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
//                                             isExitSuccessful = true;
//                                             orderIdToSave = orderResponse.data.orderId;
//                                             exitRemarks = `Live MTM Exit: ${squareOffReason}`;
//                                         } else {
//                                             exitRemarks = orderResponse.data?.remarks || orderResponse.error?.errorMessage || "RMS Rejected";
//                                         }
//                                     }

//                                     // 🧮 FINAL P&L CALCULATION & DB SAVE
//                                     if (isExitSuccessful) {
//                                         deployment.exitPrice = liveLtp;
//                                         deployment.pnl = currentPnl;         // 🔥 FIX
//                                         deployment.realizedPnl = currentPnl;
//                                         deployment.status = 'COMPLETED';
//                                         await deployment.save();

//                                         await createAndEmitLog(broker, squareOffSymbolName, exitAction, deployment.tradedQty, 'SUCCESS', `${exitRemarks} (Final P&L: ₹${currentPnl.toFixed(2)})`, orderIdToSave);
//                                     } else {
//                                         await createAndEmitLog(broker, squareOffSymbolName, exitAction, deployment.tradedQty, 'FAILED', `MTM Exit Failed: ${exitRemarks}`, orderIdToSave);
//                                         executionLocks.delete(exitLockKey);
//                                     }
//                                 }
//                             }
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
// const { placeDhanOrder, fetchLiveLTP, fetchDhanHistoricalData } = require('../services/dhanService');
// const { calculateIndicator, extractParams, evaluateCondition } = require('../services/indicatorService'); // 👈 NAYA
// const { getOptionSecurityId } = require('../services/instrumentService');

// const { getImpliedVolatility } = require('implied-volatility');
// const { getDelta } = require('greeks');

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
// // 🧠 1.5 INDICATOR SIGNAL CHECKER (The Brain)
// // ==========================================
// const getIndicatorSignal = async (strategy, broker, baseSymbol) => {
//     try {
//         const dhanIdMap = { "NIFTY": "13", "BANKNIFTY": "25", "FINNIFTY": "27", "MIDCPNIFTY": "118", "SENSEX": "51" };
//         const spotSecurityId = dhanIdMap[baseSymbol] || "25";
//         const timeframe = strategy.interval ? strategy.interval.replace(' min', '') : "5";

//         // 1. Pichle 3 din ka data mangao (EMA/SMA calculation ke liye accurate history chahiye)
//         const toDate = new Date().toISOString().split('T')[0];
//         const fromDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

//         const dhanRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, spotSecurityId, "IDX_I", "INDEX", fromDate, toDate, timeframe);
//         if (!dhanRes.success || !dhanRes.data || !dhanRes.data.close) return { long: false, short: false };

//         const candles = [];
//         for (let i = 0; i < dhanRes.data.close.length; i++) {
//             candles.push({ close: dhanRes.data.close[i], high: dhanRes.data.high[i], low: dhanRes.data.low[i], open: dhanRes.data.open[i] });
//         }
//         if (candles.length < 20) return { long: false, short: false }; // Data kam hai

//         // 2. Rules dhundo
//         const findConditions = (obj) => {
//             if (!obj || typeof obj !== 'object') return null;
//             if (obj.longRules && Array.isArray(obj.longRules)) return obj;
//             if (Array.isArray(obj)) { for (let item of obj) { const f = findConditions(item); if (f) return f; } }
//             else { for (let key in obj) { const f = findConditions(obj[key]); if (f) return f; } }
//             return null;
//         };
//         // Mongoose document ko plain object me convert karke bhejo taaki loop na phase
//         const entryConds = findConditions(strategy.toObject ? strategy.toObject() : strategy);
//         if (!entryConds) return { long: false, short: false };

//         // 3. 🚨 HAMESHA LAST CLOSED CANDLE PAR CHECK KAREIN (Repainting se bachne ke liye)
//         const i = candles.length - 2;
//         if (i < 1) return { long: false, short: false };

//         // 🟢 LONG SIGNAL EVALUATION
//         let longSignal = false;
//         if (entryConds.longRules && entryConds.longRules.length > 0) {
//             let overallResult = null;
//             entryConds.longRules.forEach((rule, idx) => {
//                 const p1 = extractParams(rule.ind1, rule.params);
//                 const ind1Data = calculateIndicator({ ...rule.ind1, params: p1 }, candles);
//                 const p2 = extractParams(rule.ind2, null);
//                 const ind2Data = calculateIndicator({ ...rule.ind2, params: p2 }, candles);

//                 const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
//                 const ruleResult = evaluateCondition(ind1Data[i], ind2Data[i], ind1Data[i - 1], ind2Data[i - 1], operator);

//                 if (idx === 0) overallResult = ruleResult;
//                 else {
//                     const logicalOp = entryConds.logicalOps[idx - 1];
//                     if (logicalOp === 'AND') overallResult = overallResult && ruleResult;
//                     else if (logicalOp === 'OR') overallResult = overallResult || ruleResult;
//                 }
//             });
//             longSignal = overallResult;
//         }

//         // 🔴 SHORT SIGNAL EVALUATION (Neeche girne ka signal - YE MISSING THA)
//         let shortSignal = false;
//         if (entryConds.shortRules && entryConds.shortRules.length > 0) {
//             let overallResult = null;
//             entryConds.shortRules.forEach((rule, idx) => {
//                 const p1 = extractParams(rule.ind1, rule.params);
//                 const ind1Data = calculateIndicator({...rule.ind1, params: p1}, candles);
//                 const p2 = extractParams(rule.ind2, null);
//                 const ind2Data = calculateIndicator({...rule.ind2, params: p2}, candles);

//                 const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
//                 const ruleResult = evaluateCondition(ind1Data[i], ind2Data[i], ind1Data[i-1], ind2Data[i-1], operator);

//                 if (idx === 0) overallResult = ruleResult;
//                 else {
//                     const logicalOp = entryConds.shortLogicalOps ? entryConds.shortLogicalOps[idx - 1] : (entryConds.logicalOps[idx - 1] || 'AND');
//                     if (logicalOp === 'AND') overallResult = overallResult && ruleResult;
//                     else if (logicalOp === 'OR') overallResult = overallResult || ruleResult;
//                 }
//             });
//             shortSignal = overallResult;
//         }

//         // ✅ AB DONO SIGNAL RETURN HONGE
//         return { long: longSignal, short: shortSignal };

//     } catch (e) {
//         console.error("❌ Indicator Eval Error:", e.message);
//         return { long: false, short: false };
//     }
// };

// // ==========================================
// // 🧮 NATIVE BLACK-SCHOLES MATH HELPERS (No External Lib Needed for Delta)
// // ==========================================
// const normalCDF = (x) => {
//     const t = 1 / (1 + 0.2316419 * Math.abs(x));
//     const d = 0.39894228 * Math.exp(-x * x / 2);
//     const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
//     return x > 0 ? 1 - prob : prob;
// };

// const calculateBSDelta = (S, K, t, v, r, type) => {
//     if (v <= 0 || t <= 0) return type === 'call' ? (S > K ? 1 : 0) : (S < K ? -1 : 0);
//     const d1 = (Math.log(S / K) + (r + (v * v) / 2) * t) / (v * Math.sqrt(t));
//     const delta = normalCDF(d1);
//     return type === 'call' ? delta : delta - 1;
// };

// // ==========================================
// // 🔍 LIVE OPTION CHAIN SCANNER (For CP & Delta)
// // ==========================================
// const findStrikeByLivePremium = async (baseSymbol, currentSpotPrice, optType, requestedExpiry, criteria, targetValue, broker) => {
//     try {
//         console.log(`🔍 Scanning Live Option Chain for ${baseSymbol} | Target: ${criteria} ${targetValue}`);

//         const step = getStrikeStep(baseSymbol);
//         const atmStrike = Math.round(currentSpotPrice / step) * step;

//         // 1. ATM ke aas-paas sirf 13 Strikes ki list banayein (6 ITM, 6 OTM)
//         const strikesToCheck = [];
//         for (let i = -6; i <= 6; i++) {
//             strikesToCheck.push(atmStrike + (i * step));
//         }

//         // 2. Security ID (Token) nikalein
//         const chainTokens = [];
//         for (const strike of strikesToCheck) {
//             const inst = getOptionSecurityId(baseSymbol, strike, "ATM pt", "ATM", optType, requestedExpiry);
//             if (inst) chainTokens.push(inst);
//         }

//         if (chainTokens.length === 0) return null;

//         // 3. 🔥 THE GUARANTEED RATE LIMIT FIX: 1000ms (1 Second) Delay per request
//         const liveChain = [];
//         for (const inst of chainTokens) {
//             try {
//                 const ltp = await fetchLiveLTP(broker.clientId, broker.apiSecret, inst.exchange, inst.id);
//                 liveChain.push({ ...inst, ltp: ltp || 0 });
//             } catch (err) {
//                 liveChain.push({ ...inst, ltp: 0 });
//             }

//             // Dhan API ko lagna chahiye ki manual click ho raha hai (1 second ka gap)
//             await new Promise(resolve => setTimeout(resolve, 1000));
//         }

//         const validOptions = liveChain.filter(o => o.ltp > 0);

//         if (validOptions.length === 0) {
//             console.log("⚠️ Option chain ke live prices nahi mile (Rate Limit or Weekend).");
//             return null;
//         }

//         // 4. User ke Criteria ke hisab se best Strike dhundhein
//         let selectedOption = null;
//         const targetVal = parseFloat(targetValue);

//         if (criteria === 'CP') {
//             selectedOption = validOptions.reduce((prev, curr) => Math.abs(curr.ltp - targetVal) < Math.abs(prev.ltp - targetVal) ? curr : prev);
//         }
//         else if (criteria === 'CP >=') {
//             const filtered = validOptions.filter(o => o.ltp >= targetVal).sort((a, b) => a.ltp - b.ltp);
//             selectedOption = filtered.length > 0 ? filtered[0] : null;
//         }
//         else if (criteria === 'CP <=') {
//             const filtered = validOptions.filter(o => o.ltp <= targetVal).sort((a, b) => b.ltp - a.ltp);
//             selectedOption = filtered.length > 0 ? filtered[0] : null;
//         }
//         else if (criteria === 'Delta') {
//             // 🔥 NATIVE BLACK-SCHOLES CALCULATION
//             console.log("🧮 Calculating Live Delta using Native Black-Scholes Math...");

//             const riskFreeRate = 0.10;
//             const callPutParam = optType.toUpperCase() === 'CE' ? 'call' : 'put';
//             const today = new Date();

//             const optionsWithDelta = validOptions.map(opt => {
//                 // 🔥 THE FIX: Yahan "MONTHLY/WEEKLY" ke badle actual resolved date (opt.expiry) use karenge
//                 const expiryDate = new Date(opt.expiry);
//                 const daysToExpiry = Math.max(0.5, (expiryDate - today) / (1000 * 60 * 60 * 24));
//                 const t = daysToExpiry / 365;

//                 let iv = 0.15; // Default 15% IV (Safe fallback)
//                 try {
//                     // Try getting exact IV from library
//                     const calcIv = getImpliedVolatility(opt.ltp, currentSpotPrice, opt.strike, t, riskFreeRate, callPutParam);
//                     if (!isNaN(calcIv) && calcIv > 0) iv = calcIv;
//                 } catch(e) { /* Ignore IV calculation errors */ }

//                 // Use Native BS Formula for bulletproof Delta
//                 let delta = calculateBSDelta(currentSpotPrice, opt.strike, t, iv, riskFreeRate, callPutParam);
//                 const absDelta = Math.abs(delta);

//                 return { ...opt, iv, delta: absDelta, rawDelta: delta };
//             });

//             selectedOption = optionsWithDelta.reduce((prev, curr) =>
//                 Math.abs(curr.delta - targetVal) < Math.abs(prev.delta - targetVal) ? curr : prev
//             );

//             console.log(`✅ Delta Matched! Target: ${targetVal} | Found: ${selectedOption.delta.toFixed(2)} (Strike: ${selectedOption.strike})`);
//         }

//         if (selectedOption) {
//             console.log(`✅ Premium/Delta Matched! Strike: ${selectedOption.strike} ${optType} | LTP: ₹${selectedOption.ltp}`);
//             return selectedOption;
//         }

//         return null;

//     } catch (error) {
//         console.error("❌ Option Chain Scanner Error:", error.message);
//         return null;
//     }
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

//             await sleep(1000);

//             const strategy = deployment.strategyId;
//             if (!strategy) continue;

//             const config = strategy.data?.config || {};
//             const entryLockKey = `ENTRY_${deployment._id.toString()}_${currentTime}`;
//             const exitLockKey = `EXIT_${deployment._id.toString()}_${currentTime}`;
//             const squareOffTime = deployment.squareOffTime || config.squareOffTime;

//             // 1. ENTRY LOGIC ⚡
//             if (!executionLocks.has(entryLockKey) && !deployment.tradedSecurityId) {

//                 let shouldEnter = false;
//                 let currentSignalType = "NONE";
//                 const strategyType = strategy.type || "Time Based";

//                 // ==============================================================
//                 // 🛑 THE SHIELD: STRICT SYMBOL VALIDATION (Fail-Safe Mechanism)
//                 // ==============================================================
//                 const instrumentData = (strategy.data.instruments && strategy.data.instruments.length > 0) ? strategy.data.instruments[0] : {};
//                 let rawSymbol = instrumentData.name || config.index || strategy.symbol || strategy.name;

//                 if (!rawSymbol) {
//                     console.log(`❌ [CRITICAL ERROR] No valid symbol found for strategy: ${strategy.name}. Trade Aborted!`);
//                     continue; // Loop me agli strategy par chale jao
//                 }

//                 let baseSymbol = "";
//                 const upperRawSymbol = String(rawSymbol).toUpperCase();

//                 if (upperRawSymbol.includes("BANK")) baseSymbol = "BANKNIFTY";
//                 else if (upperRawSymbol.includes("FIN")) baseSymbol = "FINNIFTY";
//                 else if (upperRawSymbol.includes("MID")) baseSymbol = "MIDCPNIFTY";
//                 else if (upperRawSymbol.includes("NIFTY")) baseSymbol = "NIFTY";
//                 else if (upperRawSymbol.includes("SENSEX")) baseSymbol = "SENSEX";
//                 else {
//                     console.log(`❌ [CRITICAL ERROR] Unknown symbol format: '${rawSymbol}' for strategy: ${strategy.name}. Trade Aborted!`);
//                     continue; // Agar "Reliance" ya koi ajeeb naam hai toh rok do
//                 }
//                 // ==============================================================

//                 // 🟢 A. INDICATOR BASED CHECK
//                 if (strategyType === "Indicator Based") {
//                     const broker = await Broker.findById(deployment.brokers[0]);
//                     if (broker && broker.engineOn) {
//                         // 🧠 Signal mangao (Ab baseSymbol upar se verified aayega)
//                         const signal = await getIndicatorSignal(strategy, broker, baseSymbol);

//                         if (signal.long) {
//                             shouldEnter = true;
//                             currentSignalType = "LONG";
//                             console.log(`📈 [BULLISH SIGNAL] LONG Indicator matched for ${strategy.name}`);
//                         } else if (signal.short) {
//                             shouldEnter = true;
//                             currentSignalType = "SHORT";
//                             console.log(`📉 [BEARISH SIGNAL] SHORT Indicator matched for ${strategy.name}`);
//                         }
//                     }
//                 }
//                 // ⏰ B. TIME BASED CHECK
//                 else {
//                     if (config.startTime === currentTime) {
//                         shouldEnter = true;
//                         currentSignalType = "TIME";
//                     }
//                 }

//                 // 🚀 C. EXECUTE ENTRY
//                 if (shouldEnter) {
//                     executionLocks.add(entryLockKey);
//                     const isPrePunchSL = strategy.data?.advanceSettings?.prePunchSL || false;

//                     for (const brokerId of deployment.brokers) {
//                         const broker = await Broker.findById(brokerId);
//                         if (broker && broker.engineOn) {

//                             for (const leg of strategy.data.legs) {
//                                 let tradeAction = (leg.action || "BUY").toUpperCase();
//                                 let tradeQty = (leg.quantity || 1) * deployment.multiplier;

//                                 // 🔥 OPTION BUYING & SELLING LOGIC
//                                 let optType = leg.optionType === "Call" ? "CE" : "PE";

//                                 if (currentSignalType === "LONG") {
//                                     optType = (tradeAction === "BUY") ? "CE" : "PE";
//                                 } else if (currentSignalType === "SHORT") {
//                                     optType = (tradeAction === "BUY") ? "PE" : "CE";
//                                 }

//                                 let currentSpotPrice = await fetchLivePrice(baseSymbol);
//                                 if (!currentSpotPrice) continue;

//                                 let stepValue = getStrikeStep(baseSymbol);
//                                 let targetStrikePrice = Math.round(currentSpotPrice / stepValue) * stepValue;
//                                 // const instrument = getOptionSecurityId(baseSymbol, targetStrikePrice, optType);

//                                 // 🔥 THE SMART STRIKE FINDER 🔥
//                                 const strikeCriteria = leg.strikeCriteria || "ATM pt";
//                                 const strikeType = leg.strikeType || "ATM";
//                                 const requestedExpiry = leg.expiry || "WEEKLY";

//                                 let instrument = null;

//                                 // Agar user ko Premium (CP) ke hisab se trade lena hai:
//                                 if (["CP", "CP >=", "CP <=", "Delta"].includes(strikeCriteria)) {
//                                     instrument = await findStrikeByLivePremium(
//                                         baseSymbol,
//                                         currentSpotPrice,
//                                         optType,
//                                         requestedExpiry,
//                                         strikeCriteria,
//                                         strikeType, // Yahan strikeType ke andar user ka value hoga (e.g., 100, 50)
//                                         broker
//                                     );
//                                 }
//                                 // Normal ATM/ITM/OTM points ya % ke liye purana fast method:
//                                 else {
//                                     instrument = getOptionSecurityId(
//                                         baseSymbol,
//                                         currentSpotPrice,
//                                         strikeCriteria,
//                                         strikeType,
//                                         optType,
//                                         requestedExpiry
//                                     );
//                                 }

//                                 if (!instrument) {
//                                     console.log(`⚠️ Trade skipped: Could not find valid instrument for Leg ${leg.id}`);
//                                     continue;
//                                 }

//                                 // 🟢 FORWARD TEST / PAPER TRADING EXECUTION
//                                 if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                                     await sleep(500);
//                                     const entryPrice = await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id) || currentSpotPrice;

//                                     deployment.tradedSecurityId = instrument.id;
//                                     deployment.tradedExchange = instrument.exchange;
//                                     deployment.tradedQty = tradeQty;
//                                     deployment.tradeAction = tradeAction;
//                                     deployment.tradedSymbol = instrument.tradingSymbol;
//                                     deployment.entryPrice = entryPrice;

//                                     if (isPrePunchSL && entryPrice > 0 && leg.slValue > 0) {
//                                         let slPrice = 0;
//                                         if (tradeAction === "BUY") {
//                                             slPrice = leg.slType === 'SL%' ? entryPrice - (entryPrice * (Number(leg.slValue) / 100)) : entryPrice - Number(leg.slValue);
//                                         } else if (tradeAction === "SELL") {
//                                             slPrice = leg.slType === 'SL%' ? entryPrice + (entryPrice * (Number(leg.slValue) / 100)) : entryPrice + Number(leg.slValue);
//                                         }
//                                         deployment.paperSlPrice = slPrice;
//                                     }

//                                     await deployment.save();
//                                     console.log(`📝 PAPER TRADE EXECUTED: ${instrument.tradingSymbol} (Action: ${tradeAction}) at ₹${entryPrice}`);
//                                     await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Paper Trade Entry Executed at ₹${entryPrice}`);
//                                 }

//                                 // ==========================================
//                                 // 🔴 LIVE TRADING EXECUTION (Asli Paisa)
//                                 // ==========================================
//                                 if (deployment.executionType === 'LIVE') {
//                                     const orderData = { action: tradeAction, quantity: tradeQty, securityId: instrument.id, segment: instrument.exchange };
//                                     const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

//                                     if (orderResponse.success) {
//                                         const respData = orderResponse.data || {};
//                                         const orderStatus = respData.orderStatus ? respData.orderStatus.toUpperCase() : "UNKNOWN";

//                                         if (orderStatus !== "REJECTED") {
//                                             deployment.tradedSecurityId = instrument.id;
//                                             deployment.tradedExchange = instrument.exchange;
//                                             deployment.tradedQty = tradeQty;
//                                             deployment.tradeAction = tradeAction;
//                                             deployment.tradedSymbol = instrument.tradingSymbol;

//                                             await sleep(1000);
//                                             const entryPrice = await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id);
//                                             deployment.entryPrice = entryPrice || 0;

//                                             // 🛡️ LIVE PRE-PUNCH SL LOGIC
//                                             if (isPrePunchSL && entryPrice > 0 && leg.slValue > 0) {
//                                                 let slPrice = leg.slType === 'SL%'
//                                                     ? entryPrice - (entryPrice * (Number(leg.slValue) / 100))
//                                                     : entryPrice - Number(leg.slValue);

//                                                 // Yahan Dhan ka SL-M Order fire hoga future me
//                                                 console.log(`🛡️ [LIVE PRE-PUNCH] SL Placed at ₹${slPrice.toFixed(2)} on Exchange`);
//                                             }

//                                             await deployment.save();
//                                             await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Entry Order placed successfully`, respData.orderId);
//                                         } else {
//                                             await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'FAILED', respData.remarks || "RMS Rejected", respData.orderId);
//                                         }
//                                     } else {
//                                         const errorObj = orderResponse.error || {};
//                                         await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'FAILED', errorObj.internalErrorMessage || JSON.stringify(errorObj));
//                                     }
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }

//             // 2. // ==========================================
//             // 2. AUTO SQUARE-OFF LOGIC ⏰
//             // ==========================================
//             if (squareOffTime === currentTime && !executionLocks.has(exitLockKey) && deployment.tradedSecurityId) {
//                 executionLocks.add(exitLockKey);
//                 console.log(`⏰ SQUARE-OFF TRIGGERED! Strategy: ${strategy.name}`);

//                 for (const brokerId of deployment.brokers) {
//                     const broker = await Broker.findById(brokerId);
//                     if (broker && broker.engineOn) {
//                         const exitAction = deployment.tradeAction === 'BUY' ? 'SELL' : 'BUY';
//                         const squareOffSymbolName = deployment.tradedSymbol ? `${deployment.tradedSymbol} (Auto-Exit)` : "Auto Square-Off";

//                         let isExitSuccessful = false;
//                         let exitLtp = 0;
//                         let exitRemarks = "Square-Off Completed";
//                         let orderIdToSave = "N/A";

//                         // 🟢 PAPER TRADE EXIT LOGIC
//                         if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                             await sleep(500);
//                             exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId) || 0;
//                             isExitSuccessful = true;
//                             exitRemarks = "Paper Trade Auto-Exit Executed";
//                         }
//                         // 🔴 LIVE TRADE EXIT LOGIC
//                         else if (deployment.executionType === 'LIVE') {
//                             const orderData = { action: exitAction, quantity: deployment.tradedQty, securityId: deployment.tradedSecurityId, segment: deployment.tradedExchange };
//                             const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

//                             if (orderResponse.success) {
//                                 const respData = orderResponse.data || {};
//                                 if (respData.orderStatus && respData.orderStatus.toUpperCase() !== "REJECTED") {
//                                     await sleep(1000);
//                                     exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId) || 0;
//                                     isExitSuccessful = true;
//                                     orderIdToSave = respData.orderId;
//                                     exitRemarks = `Live Auto-Exit Successful`;
//                                 } else {
//                                     exitRemarks = respData.remarks || "RMS Rejected";
//                                 }
//                             } else {
//                                 exitRemarks = orderResponse.error?.errorMessage || "API Order Failed";
//                             }
//                         }

//                         // 🧮 FINAL P&L CALCULATION & DB SAVE
//                         if (isExitSuccessful) {
//                             let finalPnl = 0;
//                             if (exitLtp > 0 && deployment.entryPrice > 0) {
//                                 finalPnl = deployment.tradeAction === 'BUY'
//                                     ? (exitLtp - deployment.entryPrice) * deployment.tradedQty
//                                     : (deployment.entryPrice - exitLtp) * deployment.tradedQty;
//                             }

//                             deployment.exitPrice = exitLtp;
//                             deployment.pnl = finalPnl;          // 🔥 FIX: Frontend isko padhta hai
//                             deployment.realizedPnl = finalPnl;
//                             deployment.status = 'COMPLETED';
//                             await deployment.save();

//                             console.log(`🏁 [EXIT SUCCESS] ${exitRemarks} | P&L: ₹${finalPnl.toFixed(2)}`);
//                             await createAndEmitLog(broker, squareOffSymbolName, exitAction, deployment.tradedQty, 'SUCCESS', `${exitRemarks} (P&L: ₹${finalPnl.toFixed(2)})`, orderIdToSave);
//                         } else {
//                             await createAndEmitLog(broker, squareOffSymbolName, exitAction, deployment.tradedQty, 'FAILED', `Exit Failed: ${exitRemarks}`, orderIdToSave);
//                             executionLocks.delete(exitLockKey); // Failed hua to aagle loop me fir try karega
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

//             if (!executionLocks.has(exitLockKey) && deployment.tradedSecurityId && deployment.entryPrice > 0 && (maxProfit > 0 || maxLoss > 0)) {
//                 for (const brokerId of deployment.brokers) {
//                     const broker = await Broker.findById(brokerId);
//                     if (broker && broker.engineOn) {
//                         try {
//                             const liveLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId);

//                             if (liveLtp && liveLtp > 0) {
//                                 let currentPnl = deployment.tradeAction === 'BUY'
//                                     ? (liveLtp - deployment.entryPrice) * deployment.tradedQty
//                                     : (deployment.entryPrice - liveLtp) * deployment.tradedQty;

//                                 let squareOffReason = null;
//                                 if (maxProfit > 0 && currentPnl >= maxProfit) squareOffReason = `Target Reached (Max Profit: ₹${maxProfit})`;
//                                 else if (maxLoss > 0 && currentPnl <= -Math.abs(maxLoss)) squareOffReason = `Stop-Loss Hit (Max Loss: ₹${Math.abs(maxLoss)})`;

//                                 if (squareOffReason) {
//                                     executionLocks.add(exitLockKey);
//                                     console.log(`🚨 MTM SQUARE-OFF TRIGGERED! Reason: ${squareOffReason}`);

//                                     const exitAction = deployment.tradeAction === 'BUY' ? 'SELL' : 'BUY';
//                                     const squareOffSymbolName = deployment.tradedSymbol ? `${deployment.tradedSymbol} (MTM-Exit)` : "MTM Square-Off";

//                                     let isExitSuccessful = false;
//                                     let exitRemarks = squareOffReason;
//                                     let orderIdToSave = "N/A";

//                                     // 🟢 PAPER TRADE MTM EXIT
//                                     if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                                         isExitSuccessful = true;
//                                         exitRemarks = `Paper Trade MTM Exit: ${squareOffReason}`;
//                                     }
//                                     // 🔴 LIVE TRADE MTM EXIT
//                                     else if (deployment.executionType === 'LIVE') {
//                                         const orderData = { action: exitAction, quantity: deployment.tradedQty, securityId: deployment.tradedSecurityId, segment: deployment.tradedExchange };
//                                         const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

//                                         if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
//                                             isExitSuccessful = true;
//                                             orderIdToSave = orderResponse.data.orderId;
//                                             exitRemarks = `Live MTM Exit: ${squareOffReason}`;
//                                         } else {
//                                             exitRemarks = orderResponse.data?.remarks || orderResponse.error?.errorMessage || "RMS Rejected";
//                                         }
//                                     }

//                                     // 🧮 FINAL P&L CALCULATION & DB SAVE
//                                     if (isExitSuccessful) {
//                                         deployment.exitPrice = liveLtp;
//                                         deployment.pnl = currentPnl;         // 🔥 FIX
//                                         deployment.realizedPnl = currentPnl;
//                                         deployment.status = 'COMPLETED';
//                                         await deployment.save();

//                                         await createAndEmitLog(broker, squareOffSymbolName, exitAction, deployment.tradedQty, 'SUCCESS', `${exitRemarks} (Final P&L: ₹${currentPnl.toFixed(2)})`, orderIdToSave);
//                                     } else {
//                                         await createAndEmitLog(broker, squareOffSymbolName, exitAction, deployment.tradedQty, 'FAILED', `MTM Exit Failed: ${exitRemarks}`, orderIdToSave);
//                                         executionLocks.delete(exitLockKey);
//                                     }
//                                 }
//                             }
//                         } catch (err) {
//                             console.log(`⚠️ MTM Check Failed for ${strategy.name}: ${err.message}`);
//                         }
//                     }
//                 }
//             }
//         }
//     } catch (error) { console.error("❌ Trading Engine Error:", error); }
// });




// import { calculateBSDelta } from "./utils/blackScholes.js";
// import { fetchLivePrice } from "./utils/priceFetcher.js";

// import { findStrikeByLivePremium } from "./scanners/optionChainScanner.js";
// import { getIndicatorSignal } from "./scanners/indicatorScanner.js";

// import { handleMoveSlToCost } from "./features/advanceFeatures/moveSlToCost.js";

// const cron = require("node-cron");
// const moment = require("moment-timezone");
// const axios = require("axios");
// const Deployment = require("../models/Deployment");
// const Broker = require("../models/Broker");
// const AlgoTradeLog = require("../models/AlgoTradeLog");
// const {
//   placeDhanOrder,
//   fetchLiveLTP,
//   fetchDhanHistoricalData,
// } = require("../services/dhanService");
// const {
//   calculateIndicator,
//   extractParams,
//   evaluateCondition,
// } = require("../services/indicatorService"); // 👈 NAYA
// const { getOptionSecurityId } = require("../services/instrumentService");

// const { getImpliedVolatility } = require("implied-volatility");

// console.log("🚀 Trading Engine Initialized...");

// const executionLocks = new Set();
// const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// const getStrikeStep = (symbol) => {
//   const sym = symbol.toUpperCase();
//   if (sym.includes("BANKNIFTY")) return 100;
//   if (sym.includes("FINNIFTY")) return 50;
//   if (sym.includes("MIDCPNIFTY") || sym.includes("MIDCAP")) return 25; // Midcap Strike Step
//   if (sym.includes("NIFTY")) return 50;
//   if (sym.includes("SENSEX")) return 100;
//   return 50;
// };

// // ==========================================
// // 📝 LOG CREATOR
// // ==========================================
// const createAndEmitLog = async (
//   broker,
//   symbol,
//   action,
//   quantity,
//   status,
//   message,
//   orderId = "N/A",
// ) => {
//   try {
//     const newLog = await AlgoTradeLog.create({
//       brokerId: broker._id,
//       brokerName: broker.name,
//       symbol,
//       action,
//       quantity,
//       status,
//       message,
//       orderId,
//     });
//     if (global.io) global.io.emit("new-trade-log", newLog);
//   } catch (err) {
//     console.error("❌ Log Error:", err.message);
//   }
// };

// // ==========================================
// // ⚙️ MAIN CRON JOB
// // ==========================================
// cron.schedule("*/30 * * * * *", async () => {
//   try {
//     const currentTime = moment().tz("Asia/Kolkata").format("HH:mm");
//     const activeDeployments = await Deployment.find({
//       status: "ACTIVE",
//     }).populate("strategyId");

//     if (activeDeployments.length === 0) return;

//     if (currentTime === "00:00" && executionLocks.size > 0)
//       executionLocks.clear();

//     for (const deployment of activeDeployments) {
//       await sleep(1000);

//       const strategy = deployment.strategyId;
//       if (!strategy) continue;

//       const config = strategy.data?.config || {};
//       const entryLockKey = `ENTRY_${deployment._id.toString()}_${currentTime}`;
//       const exitLockKey = `EXIT_${deployment._id.toString()}_${currentTime}`;
//       const squareOffTime = deployment.squareOffTime || config.squareOffTime;

//       // 1. ENTRY LOGIC ⚡
//       if (!executionLocks.has(entryLockKey) && !deployment.tradedSecurityId) {
//         let shouldEnter = false;
//         let currentSignalType = "NONE";
//         const strategyType = strategy.type || "Time Based";

//         // ==============================================================
//         // 🛑 THE SHIELD: STRICT SYMBOL VALIDATION (Fail-Safe Mechanism)
//         // ==============================================================
//         const instrumentData =
//           strategy.data.instruments && strategy.data.instruments.length > 0
//             ? strategy.data.instruments[0]
//             : {};
//         let rawSymbol =
//           instrumentData.name ||
//           config.index ||
//           strategy.symbol ||
//           strategy.name;

//         if (!rawSymbol) {
//           console.log(
//             `❌ [CRITICAL ERROR] No valid symbol found for strategy: ${strategy.name}. Trade Aborted!`,
//           );
//           continue; // Loop me agli strategy par chale jao
//         }

//         let baseSymbol = "";
//         const upperRawSymbol = String(rawSymbol).toUpperCase();

//         if (upperRawSymbol.includes("BANK")) baseSymbol = "BANKNIFTY";
//         else if (upperRawSymbol.includes("FIN")) baseSymbol = "FINNIFTY";
//         else if (upperRawSymbol.includes("MID")) baseSymbol = "MIDCPNIFTY";
//         else if (upperRawSymbol.includes("NIFTY")) baseSymbol = "NIFTY";
//         else if (upperRawSymbol.includes("SENSEX")) baseSymbol = "SENSEX";
//         else {
//           console.log(
//             `❌ [CRITICAL ERROR] Unknown symbol format: '${rawSymbol}' for strategy: ${strategy.name}. Trade Aborted!`,
//           );
//           continue; // Agar "Reliance" ya koi ajeeb naam hai toh rok do
//         }
//         // ==============================================================

//         // 🟢 A. INDICATOR BASED CHECK
//         if (strategyType === "Indicator Based") {
//           const broker = await Broker.findById(deployment.brokers[0]);
//           if (broker && broker.engineOn) {
//             // 🧠 Signal mangao (Ab baseSymbol upar se verified aayega)
//             const signal = await getIndicatorSignal(
//               strategy,
//               broker,
//               baseSymbol,
//             );

//             if (signal.long) {
//               shouldEnter = true;
//               currentSignalType = "LONG";
//               console.log(
//                 `📈 [BULLISH SIGNAL] LONG Indicator matched for ${strategy.name}`,
//               );
//             } else if (signal.short) {
//               shouldEnter = true;
//               currentSignalType = "SHORT";
//               console.log(
//                 `📉 [BEARISH SIGNAL] SHORT Indicator matched for ${strategy.name}`,
//               );
//             }
//           }
//         }
//         // ⏰ B. TIME BASED CHECK
//         else {
//           if (config.startTime === currentTime) {
//             shouldEnter = true;
//             currentSignalType = "TIME";
//           }
//         }

//         // 🚀 C. EXECUTE ENTRY
//         if (shouldEnter) {
//           executionLocks.add(entryLockKey);
//           const isPrePunchSL =
//             strategy.data?.advanceSettings?.prePunchSL || false;

//           for (const brokerId of deployment.brokers) {
//             const broker = await Broker.findById(brokerId);
//             if (broker && broker.engineOn) {
//               for (const leg of strategy.data.legs) {
//                 let tradeAction = (leg.action || "BUY").toUpperCase();
//                 let tradeQty = (leg.quantity || 1) * deployment.multiplier;

//                 // 🔥 OPTION BUYING & SELLING LOGIC
//                 let optType = leg.optionType === "Call" ? "CE" : "PE";

//                 if (currentSignalType === "LONG") {
//                   optType = tradeAction === "BUY" ? "CE" : "PE";
//                 } else if (currentSignalType === "SHORT") {
//                   optType = tradeAction === "BUY" ? "PE" : "CE";
//                 }

//                 let currentSpotPrice = await fetchLivePrice(baseSymbol);
//                 if (!currentSpotPrice) continue;

//                 let stepValue = getStrikeStep(baseSymbol);
//                 let targetStrikePrice =
//                   Math.round(currentSpotPrice / stepValue) * stepValue;
//                 // const instrument = getOptionSecurityId(baseSymbol, targetStrikePrice, optType);

//                 // 🔥 THE SMART STRIKE FINDER 🔥
//                 const strikeCriteria = leg.strikeCriteria || "ATM pt";
//                 const strikeType = leg.strikeType || "ATM";
//                 const requestedExpiry = leg.expiry || "WEEKLY";

//                 let instrument = null;

//                 // Agar user ko Premium (CP) ke hisab se trade lena hai:
//                 if (
//                   ["CP", "CP >=", "CP <=", "Delta"].includes(strikeCriteria)
//                 ) {
//                   instrument = await findStrikeByLivePremium(
//                     baseSymbol,
//                     currentSpotPrice,
//                     optType,
//                     requestedExpiry,
//                     strikeCriteria,
//                     strikeType, // Yahan strikeType ke andar user ka value hoga (e.g., 100, 50)
//                     broker,
//                   );
//                 }
//                 // Normal ATM/ITM/OTM points ya % ke liye purana fast method:
//                 else {
//                   instrument = getOptionSecurityId(
//                     baseSymbol,
//                     currentSpotPrice,
//                     strikeCriteria,
//                     strikeType,
//                     optType,
//                     requestedExpiry,
//                   );
//                 }

//                 if (!instrument) {
//                   console.log(
//                     `⚠️ Trade skipped: Could not find valid instrument for Leg ${leg.id}`,
//                   );
//                   continue;
//                 }

//                 // 🟢 FORWARD TEST / PAPER TRADING EXECUTION
//                 if (
//                   deployment.executionType === "FORWARD_TEST" ||
//                   deployment.executionType === "PAPER"
//                 ) {
//                   await sleep(500);
//                   const entryPrice =
//                     (await fetchLiveLTP(
//                       broker.clientId,
//                       broker.apiSecret,
//                       instrument.exchange,
//                       instrument.id,
//                     )) || currentSpotPrice;

//                   deployment.tradedSecurityId = instrument.id;
//                   deployment.tradedExchange = instrument.exchange;
//                   deployment.tradedQty = tradeQty;
//                   deployment.tradeAction = tradeAction;
//                   deployment.tradedSymbol = instrument.tradingSymbol;
//                   deployment.entryPrice = entryPrice;

//                   if (isPrePunchSL && entryPrice > 0 && leg.slValue > 0) {
//                     let slPrice = 0;
//                     if (tradeAction === "BUY") {
//                       slPrice =
//                         leg.slType === "SL%"
//                           ? entryPrice -
//                             entryPrice * (Number(leg.slValue) / 100)
//                           : entryPrice - Number(leg.slValue);
//                     } else if (tradeAction === "SELL") {
//                       slPrice =
//                         leg.slType === "SL%"
//                           ? entryPrice +
//                             entryPrice * (Number(leg.slValue) / 100)
//                           : entryPrice + Number(leg.slValue);
//                     }
//                     deployment.paperSlPrice = slPrice;
//                   }

//                   await deployment.save();
//                   console.log(
//                     `📝 PAPER TRADE EXECUTED: ${instrument.tradingSymbol} (Action: ${tradeAction}) at ₹${entryPrice}`,
//                   );
//                   await createAndEmitLog(
//                     broker,
//                     instrument.tradingSymbol,
//                     tradeAction,
//                     tradeQty,
//                     "SUCCESS",
//                     `Paper Trade Entry Executed at ₹${entryPrice}`,
//                   );
//                 }

//                 // ==========================================
//                 // 🔴 LIVE TRADING EXECUTION (Asli Paisa)
//                 // ==========================================
//                 if (deployment.executionType === "LIVE") {
//                   const orderData = {
//                     action: tradeAction,
//                     quantity: tradeQty,
//                     securityId: instrument.id,
//                     segment: instrument.exchange,
//                   };
//                   const orderResponse = await placeDhanOrder(
//                     broker.clientId,
//                     broker.apiSecret,
//                     orderData,
//                   );

//                   if (orderResponse.success) {
//                     const respData = orderResponse.data || {};
//                     const orderStatus = respData.orderStatus
//                       ? respData.orderStatus.toUpperCase()
//                       : "UNKNOWN";

//                     if (orderStatus !== "REJECTED") {
//                       deployment.tradedSecurityId = instrument.id;
//                       deployment.tradedExchange = instrument.exchange;
//                       deployment.tradedQty = tradeQty;
//                       deployment.tradeAction = tradeAction;
//                       deployment.tradedSymbol = instrument.tradingSymbol;

//                       await sleep(1000);
//                       const entryPrice = await fetchLiveLTP(
//                         broker.clientId,
//                         broker.apiSecret,
//                         instrument.exchange,
//                         instrument.id,
//                       );
//                       deployment.entryPrice = entryPrice || 0;

//                       // 🛡️ LIVE PRE-PUNCH SL LOGIC
//                       if (isPrePunchSL && entryPrice > 0 && leg.slValue > 0) {
//                         let slPrice =
//                           leg.slType === "SL%"
//                             ? entryPrice -
//                               entryPrice * (Number(leg.slValue) / 100)
//                             : entryPrice - Number(leg.slValue);

//                         // Yahan Dhan ka SL-M Order fire hoga future me
//                         console.log(
//                           `🛡️ [LIVE PRE-PUNCH] SL Placed at ₹${slPrice.toFixed(2)} on Exchange`,
//                         );
//                       }

//                       await deployment.save();
//                       await createAndEmitLog(
//                         broker,
//                         instrument.tradingSymbol,
//                         tradeAction,
//                         tradeQty,
//                         "SUCCESS",
//                         `Entry Order placed successfully`,
//                         respData.orderId,
//                       );
//                     } else {
//                       await createAndEmitLog(
//                         broker,
//                         instrument.tradingSymbol,
//                         tradeAction,
//                         tradeQty,
//                         "FAILED",
//                         respData.remarks || "RMS Rejected",
//                         respData.orderId,
//                       );
//                     }
//                   } else {
//                     const errorObj = orderResponse.error || {};
//                     await createAndEmitLog(
//                       broker,
//                       instrument.tradingSymbol,
//                       tradeAction,
//                       tradeQty,
//                       "FAILED",
//                       errorObj.internalErrorMessage || JSON.stringify(errorObj),
//                     );
//                   }
//                 }
//               }
//             }
//           }
//         }
//       }

//       // 2. // ==========================================
//       // 2. AUTO SQUARE-OFF LOGIC ⏰
//       // ==========================================
//       if (
//         squareOffTime === currentTime &&
//         !executionLocks.has(exitLockKey) &&
//         deployment.tradedSecurityId
//       ) {
//         executionLocks.add(exitLockKey);
//         console.log(`⏰ SQUARE-OFF TRIGGERED! Strategy: ${strategy.name}`);

//         for (const brokerId of deployment.brokers) {
//           const broker = await Broker.findById(brokerId);
//           if (broker && broker.engineOn) {
//             const exitAction =
//               deployment.tradeAction === "BUY" ? "SELL" : "BUY";
//             const squareOffSymbolName = deployment.tradedSymbol
//               ? `${deployment.tradedSymbol} (Auto-Exit)`
//               : "Auto Square-Off";

//             let isExitSuccessful = false;
//             let exitLtp = 0;
//             let exitRemarks = "Square-Off Completed";
//             let orderIdToSave = "N/A";

//             // 🟢 PAPER TRADE EXIT LOGIC
//             if (
//               deployment.executionType === "FORWARD_TEST" ||
//               deployment.executionType === "PAPER"
//             ) {
//               await sleep(500);
//               exitLtp =
//                 (await fetchLiveLTP(
//                   broker.clientId,
//                   broker.apiSecret,
//                   deployment.tradedExchange,
//                   deployment.tradedSecurityId,
//                 )) || 0;
//               isExitSuccessful = true;
//               exitRemarks = "Paper Trade Auto-Exit Executed";
//             }
//             // 🔴 LIVE TRADE EXIT LOGIC
//             else if (deployment.executionType === "LIVE") {
//               const orderData = {
//                 action: exitAction,
//                 quantity: deployment.tradedQty,
//                 securityId: deployment.tradedSecurityId,
//                 segment: deployment.tradedExchange,
//               };
//               const orderResponse = await placeDhanOrder(
//                 broker.clientId,
//                 broker.apiSecret,
//                 orderData,
//               );

//               if (orderResponse.success) {
//                 const respData = orderResponse.data || {};
//                 if (
//                   respData.orderStatus &&
//                   respData.orderStatus.toUpperCase() !== "REJECTED"
//                 ) {
//                   await sleep(1000);
//                   exitLtp =
//                     (await fetchLiveLTP(
//                       broker.clientId,
//                       broker.apiSecret,
//                       deployment.tradedExchange,
//                       deployment.tradedSecurityId,
//                     )) || 0;
//                   isExitSuccessful = true;
//                   orderIdToSave = respData.orderId;
//                   exitRemarks = `Live Auto-Exit Successful`;
//                 } else {
//                   exitRemarks = respData.remarks || "RMS Rejected";
//                 }
//               } else {
//                 exitRemarks =
//                   orderResponse.error?.errorMessage || "API Order Failed";
//               }
//             }

//             // 🧮 FINAL P&L CALCULATION & DB SAVE
//             if (isExitSuccessful) {
//               let finalPnl = 0;
//               if (exitLtp > 0 && deployment.entryPrice > 0) {
//                 finalPnl =
//                   deployment.tradeAction === "BUY"
//                     ? (exitLtp - deployment.entryPrice) * deployment.tradedQty
//                     : (deployment.entryPrice - exitLtp) * deployment.tradedQty;
//               }

//               deployment.exitPrice = exitLtp;
//               deployment.pnl = finalPnl; // 🔥 FIX: Frontend isko padhta hai
//               deployment.realizedPnl = finalPnl;
//               deployment.status = "COMPLETED";
//               await deployment.save();

//               console.log(
//                 `🏁 [EXIT SUCCESS] ${exitRemarks} | P&L: ₹${finalPnl.toFixed(2)}`,
//               );
//               await createAndEmitLog(
//                 broker,
//                 squareOffSymbolName,
//                 exitAction,
//                 deployment.tradedQty,
//                 "SUCCESS",
//                 `${exitRemarks} (P&L: ₹${finalPnl.toFixed(2)})`,
//                 orderIdToSave,
//               );
//             } else {
//               await createAndEmitLog(
//                 broker,
//                 squareOffSymbolName,
//                 exitAction,
//                 deployment.tradedQty,
//                 "FAILED",
//                 `Exit Failed: ${exitRemarks}`,
//                 orderIdToSave,
//               );
//               executionLocks.delete(exitLockKey); // Failed hua to aagle loop me fir try karega
//             }
//           }
//         }
//       }

//       // ==========================================
//       // 3. MTM (MAX PROFIT / MAX LOSS) SQUARE-OFF LOGIC 💰
//       // ==========================================
//       const riskData = strategy.data?.riskManagement || {};
//       const maxProfit = parseFloat(riskData.maxProfit) || 0;
//       const maxLoss = parseFloat(riskData.maxLoss) || 0;

//       if (
//         !executionLocks.has(exitLockKey) &&
//         deployment.tradedSecurityId &&
//         deployment.entryPrice > 0 &&
//         (maxProfit > 0 || maxLoss > 0)
//       ) {
//         for (const brokerId of deployment.brokers) {
//           const broker = await Broker.findById(brokerId);
//           if (broker && broker.engineOn) {
//             try {
//               const liveLtp = await fetchLiveLTP(
//                 broker.clientId,
//                 broker.apiSecret,
//                 deployment.tradedExchange,
//                 deployment.tradedSecurityId,
//               );

//               if (liveLtp && liveLtp > 0) {
//                 let currentPnl =
//                   deployment.tradeAction === "BUY"
//                     ? (liveLtp - deployment.entryPrice) * deployment.tradedQty
//                     : (deployment.entryPrice - liveLtp) * deployment.tradedQty;

//                 let squareOffReason = null;
//                 if (maxProfit > 0 && currentPnl >= maxProfit)
//                   squareOffReason = `Target Reached (Max Profit: ₹${maxProfit})`;
//                 else if (maxLoss > 0 && currentPnl <= -Math.abs(maxLoss))
//                   squareOffReason = `Stop-Loss Hit (Max Loss: ₹${Math.abs(maxLoss)})`;

//                 if (squareOffReason) {
//                   executionLocks.add(exitLockKey);
//                   console.log(
//                     `🚨 MTM SQUARE-OFF TRIGGERED! Reason: ${squareOffReason}`,
//                   );

//                   const exitAction =
//                     deployment.tradeAction === "BUY" ? "SELL" : "BUY";
//                   const squareOffSymbolName = deployment.tradedSymbol
//                     ? `${deployment.tradedSymbol} (MTM-Exit)`
//                     : "MTM Square-Off";

//                   let isExitSuccessful = false;
//                   let exitRemarks = squareOffReason;
//                   let orderIdToSave = "N/A";

//                   // 🟢 PAPER TRADE MTM EXIT
//                   if (
//                     deployment.executionType === "FORWARD_TEST" ||
//                     deployment.executionType === "PAPER"
//                   ) {
//                     isExitSuccessful = true;
//                     exitRemarks = `Paper Trade MTM Exit: ${squareOffReason}`;
//                   }
//                   // 🔴 LIVE TRADE MTM EXIT
//                   else if (deployment.executionType === "LIVE") {
//                     const orderData = {
//                       action: exitAction,
//                       quantity: deployment.tradedQty,
//                       securityId: deployment.tradedSecurityId,
//                       segment: deployment.tradedExchange,
//                     };
//                     const orderResponse = await placeDhanOrder(
//                       broker.clientId,
//                       broker.apiSecret,
//                       orderData,
//                     );

//                     if (
//                       orderResponse.success &&
//                       orderResponse.data?.orderStatus?.toUpperCase() !==
//                         "REJECTED"
//                     ) {
//                       isExitSuccessful = true;
//                       orderIdToSave = orderResponse.data.orderId;
//                       exitRemarks = `Live MTM Exit: ${squareOffReason}`;
//                     } else {
//                       exitRemarks =
//                         orderResponse.data?.remarks ||
//                         orderResponse.error?.errorMessage ||
//                         "RMS Rejected";
//                     }
//                   }

//                   // 🧮 FINAL P&L CALCULATION & DB SAVE
//                   if (isExitSuccessful) {
//                     deployment.exitPrice = liveLtp;
//                     deployment.pnl = currentPnl; // 🔥 FIX
//                     deployment.realizedPnl = currentPnl;
//                     deployment.status = "COMPLETED";
//                     await deployment.save();

//                     await createAndEmitLog(
//                       broker,
//                       squareOffSymbolName,
//                       exitAction,
//                       deployment.tradedQty,
//                       "SUCCESS",
//                       `${exitRemarks} (Final P&L: ₹${currentPnl.toFixed(2)})`,
//                       orderIdToSave,
//                     );
//                   } else {
//                     await createAndEmitLog(
//                       broker,
//                       squareOffSymbolName,
//                       exitAction,
//                       deployment.tradedQty,
//                       "FAILED",
//                       `MTM Exit Failed: ${exitRemarks}`,
//                       orderIdToSave,
//                     );
//                     executionLocks.delete(exitLockKey);
//                   }
//                 }
//               }
//             } catch (err) {
//               console.log(`⚠️ MTM Check Failed for ${strategy.name}: ${err.message}`,);
//             }
//           }
//         }
//       }
//     }
//   } catch (error) {
//     console.error("❌ Trading Engine Error:", error);
//   }
// });



// ==========================================
// 🌟 MAIN TRADING ENGINE (THE MANAGER) 🌟
// ==========================================
const cron = require('node-cron');
const moment = require('moment-timezone');

// 📂 Models
const Deployment = require('../models/Deployment.js');
const Broker = require('../models/Broker.js');

// 🛠️ Utilities & APIs (Inhe apne path ke hisab se set karein)
const { sleep, getStrikeStep, getOptionSecurityId } = require('../services/instrumentService.js');
const { placeDhanOrder, fetchLiveLTP } = require('../services/dhanService.js');
const { fetchLivePrice } = require('./utils/priceFetcher.js');
const { createAndEmitLog } = require('./utils/logger.js'); // Log function ko ek file me dal diya hai

// 🔍 Scanners
const { findStrikeByLivePremium } = require('./scanners/optionChainScanner.js');
const { getIndicatorSignal } = require('./scanners/indicatorScanner.js');  

// 🛡️ Risk Management & Advance Features
const { handleMtmSquareOff } = require('./features/riskManagement/mtmSquareOff.js');
const { processTrailingLogic } = require('./features/riskManagement/trailingLogic.js');
const { handleMoveSlToCost } = require('./features/advanceFeatures/moveSlToCost.js');

// Global execution locks (Double entry se bachne ke liye)
const executionLocks = new Set();

// ==========================================
// ⚙️ THE CORE CRON JOB LOOP (Runs every 30s)
// ==========================================
cron.schedule('*/30 * * * * *', async () => {
    try {
        const currentTime = moment().tz("Asia/Kolkata").format("HH:mm");
        const activeDeployments = await Deployment.find({ status: 'ACTIVE' }).populate('strategyId');

        if (activeDeployments.length === 0) return;

        // Reset locks at midnight
        if (currentTime === "00:00" && executionLocks.size > 0) executionLocks.clear();

        for (const deployment of activeDeployments) {
            await sleep(1000);

            const strategy = deployment.strategyId;
            if (!strategy) continue;

            const config = strategy.data?.config || {};
            const entryLockKey = `ENTRY_${deployment._id.toString()}_${currentTime}`;
            const exitLockKey = `EXIT_${deployment._id.toString()}_${currentTime}`;
            const squareOffTime = deployment.squareOffTime || config.squareOffTime;

            // ==============================================================
            // 🛑 THE SHIELD: STRICT SYMBOL VALIDATION 
            // ==============================================================
            const instrumentData = (strategy.data.instruments && strategy.data.instruments.length > 0) ? strategy.data.instruments[0] : {};
            let rawSymbol = instrumentData.name || config.index || strategy.symbol || strategy.name;
            if (!rawSymbol) continue;

            let baseSymbol = "";
            const upperRawSymbol = String(rawSymbol).toUpperCase();
            if (upperRawSymbol.includes("BANK")) baseSymbol = "BANKNIFTY";
            else if (upperRawSymbol.includes("FIN")) baseSymbol = "FINNIFTY";
            else if (upperRawSymbol.includes("MID")) baseSymbol = "MIDCPNIFTY";
            else if (upperRawSymbol.includes("NIFTY")) baseSymbol = "NIFTY";
            else if (upperRawSymbol.includes("SENSEX")) baseSymbol = "SENSEX";
            else continue; // Invalid symbol skip

            // ==============================================================
            // ⚡ 1. ENTRY LOGIC 
            // ==============================================================
            if (!executionLocks.has(entryLockKey) && !deployment.tradedSecurityId) {
                let shouldEnter = false;
                let currentSignalType = "NONE";
                const strategyType = strategy.type || "Time Based"; 

                // 🟢 A. INDICATOR BASED CHECK (Delegated to Scanner)
                if (strategyType === "Indicator Based") {
                    const broker = await Broker.findById(deployment.brokers[0]);
                    if (broker && broker.engineOn) {
                        const signal = await getIndicatorSignal(strategy, broker, baseSymbol);
                        if (signal.long) { shouldEnter = true; currentSignalType = "LONG"; } 
                        else if (signal.short) { shouldEnter = true; currentSignalType = "SHORT"; }
                    }
                } 
                // ⏰ B. TIME BASED CHECK
                else {
                    if (config.startTime === currentTime) { shouldEnter = true; currentSignalType = "TIME"; }
                }

                // 🚀 C. EXECUTE ENTRY
                if (shouldEnter) {
                    executionLocks.add(entryLockKey);
                    const isPrePunchSL = strategy.data?.advanceSettings?.prePunchSL || false;

                    for (const brokerId of deployment.brokers) {
                        const broker = await Broker.findById(brokerId);
                        if (broker && broker.engineOn) {
                            
                            for (const leg of strategy.data.legs) {
                                let tradeAction = (leg.action || "BUY").toUpperCase(); 
                                let tradeQty = (leg.quantity || 1) * deployment.multiplier;

                                // Option Type Selection
                                let optType = leg.optionType === "Call" ? "CE" : "PE"; 
                                if (currentSignalType === "LONG") optType = (tradeAction === "BUY") ? "CE" : "PE"; 
                                else if (currentSignalType === "SHORT") optType = (tradeAction === "BUY") ? "PE" : "CE"; 

                                let currentSpotPrice = await fetchLivePrice(baseSymbol);
                                if (!currentSpotPrice) continue;

                                // 🎯 STRIKE SELECTION
                                const strikeCriteria = leg.strikeCriteria || "ATM pt";
                                let instrument = null;

                                if (["CP", "CP >=", "CP <=", "Delta"].includes(strikeCriteria)) {
                                    // Delegated to Scanner
                                    instrument = await findStrikeByLivePremium(baseSymbol, currentSpotPrice, optType, leg.expiry || "WEEKLY", strikeCriteria, leg.strikeType || "ATM", broker);
                                } else {
                                    instrument = getOptionSecurityId(baseSymbol, currentSpotPrice, strikeCriteria, leg.strikeType || "ATM", optType, leg.expiry || "WEEKLY");
                                }
                                
                                if (!instrument) continue;

                                // 🟢 PAPER TRADE EXECUTION
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
                                        deployment.paperSlPrice = tradeAction === "BUY" 
                                            ? (leg.slType === 'SL%' ? entryPrice - (entryPrice * (Number(leg.slValue)/100)) : entryPrice - Number(leg.slValue))
                                            : (leg.slType === 'SL%' ? entryPrice + (entryPrice * (Number(leg.slValue)/100)) : entryPrice + Number(leg.slValue));
                                    }

                                    await deployment.save();
                                    await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Paper Entry at ₹${entryPrice}`);
                                } 
                                // 🔴 LIVE TRADE EXECUTION
                                else if (deployment.executionType === 'LIVE') {
                                    const orderData = { action: tradeAction, quantity: tradeQty, securityId: instrument.id, segment: instrument.exchange };
                                    const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

                                    if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
                                        deployment.tradedSecurityId = instrument.id;
                                        deployment.tradedExchange = instrument.exchange;
                                        deployment.tradedQty = tradeQty;
                                        deployment.tradeAction = tradeAction;
                                        deployment.tradedSymbol = instrument.tradingSymbol;

                                        await sleep(1000);
                                        const entryPrice = await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id);
                                        deployment.entryPrice = entryPrice || 0;

                                        if (isPrePunchSL) console.log(`🛡️ [LIVE PRE-PUNCH] SL Placed on Exchange`); // (SL order logic yahan lagayenge)

                                        await deployment.save();
                                        await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Live Entry Executed`, orderResponse.data.orderId);
                                    } else {
                                        await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'FAILED', orderResponse.data?.remarks || "Order Failed");
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // ==============================================================
            // ⏰ 2. TIME-BASED AUTO SQUARE-OFF LOGIC
            // ==============================================================
            if (squareOffTime === currentTime && !executionLocks.has(exitLockKey) && deployment.tradedSecurityId) {
                executionLocks.add(exitLockKey);
                console.log(`⏰ TIME SQUARE-OFF TRIGGERED! Strategy: ${strategy.name}`);

                for (const brokerId of deployment.brokers) {
                    const broker = await Broker.findById(brokerId);
                    if (broker && broker.engineOn) {
                        const exitAction = deployment.tradeAction === 'BUY' ? 'SELL' : 'BUY';
                        
                        // Paper Exit
                        if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
                            const exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId) || 0;
                            // PnL Logic yahan aayega...
                        } 
                        // Live Exit
                        else if (deployment.executionType === 'LIVE') {
                            const orderData = { action: exitAction, quantity: deployment.tradedQty, securityId: deployment.tradedSecurityId, segment: deployment.tradedExchange };
                            await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                        }
                    }
                }
            }

            // ==============================================================
            // 💰 3. RISK MANAGEMENT & ADVANCE FEATURES DELEGATION (Workers)
            // ==============================================================
            if (deployment.tradedSecurityId && deployment.status === 'ACTIVE') {
                
                // MTM Max Profit / Loss Check
                await handleMtmSquareOff(deployment, strategy, executionLocks, exitLockKey);

                // Trailing SL & Profit Lock Check
                const broker = await Broker.findById(deployment.brokers[0]); // Fetching for LTP check
                if (broker) {
                    const liveLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId);
                    
                    if (liveLtp && liveLtp > 0) {
                        // Trail Profit
                        await processTrailingLogic(deployment, strategy, liveLtp, broker);
                    }
                }

                // Advance Features Check
                if (strategy.data?.advanceSettings?.moveSLToCost) {
                    await handleMoveSlToCost(strategy);
                }
                
                // Future Advance Features:
                // if (strategy.data?.advanceSettings?.waitAndTrade) await handleWaitAndTrade(deployment, strategy, liveLtp);
            }
        }
    } catch (error) { 
        console.error("❌ Trading Engine Core Error:", error); 
    }
});