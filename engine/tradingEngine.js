


// // ==========================================
// // 🌟 MAIN TRADING ENGINE (THE MANAGER) 🌟
// // ==========================================
// const cron = require('node-cron');
// const moment = require('moment-timezone');

// // 📂 Models
// const Deployment = require('../models/Deployment.js');
// const Broker = require('../models/Broker.js');

// // 🛠️ Utilities & APIs 
// const { sleep, getStrikeStep, getOptionSecurityId } = require('../services/instrumentService.js');
// const { placeDhanOrder, fetchLiveLTP } = require('../services/dhanService.js');
// const { fetchLivePrice } = require('./utils/priceFetcher.js');
// const { createAndEmitLog } = require('./utils/logger.js'); 

// // 🔍 Scanners
// // 🔥 FIX: Added 'getIndicatorExitSignal' for Indicator Exits
// const { findStrikeByLivePremium } = require('./scanners/optionChainScanner.js');
// const { getIndicatorSignal, getIndicatorExitSignal } = require('./scanners/indicatorScanner.js');  

// // 🛡️ Risk Management
// const { handleMtmSquareOff } = require('./features/riskManagement/mtmSquareOff.js');
// const { processTrailingLogic } = require('./features/riskManagement/trailingLogic.js');

// // 🚀 ADVANCE FEATURES
// const { handleMoveSlToCost } = require('./features/advanceFeatures/moveSlToCost.js');
// const { handlePrePunchSl } = require('./features/advanceFeatures/prePunchSl.js');
// const { handleExitAllOnSlTgt } = require('./features/advanceFeatures/exitAllOnSlTgt.js');
// const { processWaitAndTrade } = require('./features/advanceFeatures/waitAndTrade.js');

// // Global execution locks
// const executionLocks = new Set();
// let isEngineRunning = false; 

// // ==========================================
// // ⚙️ THE CORE CRON JOB LOOP (Runs every 30s)
// // ==========================================
// cron.schedule('*/30 * * * * *', async () => {
    
//     if (isEngineRunning) {
//         console.log("⏳ Engine is taking time, skipping overlapping tick...");
//         return; 
//     }
    
//     isEngineRunning = true; 

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

//             // 🛑 THE SHIELD: STRICT SYMBOL VALIDATION 
//             const instrumentData = (strategy.data.instruments && strategy.data.instruments.length > 0) ? strategy.data.instruments[0] : {};
//             let rawSymbol = instrumentData.name || config.index || strategy.symbol || strategy.name;
//             if (!rawSymbol) continue;

//             let baseSymbol = "";
//             const upperRawSymbol = String(rawSymbol).toUpperCase();
//             if (upperRawSymbol.includes("BANK")) baseSymbol = "BANKNIFTY";
//             else if (upperRawSymbol.includes("FIN")) baseSymbol = "FINNIFTY";
//             else if (upperRawSymbol.includes("MID")) baseSymbol = "MIDCPNIFTY";
//             else if (upperRawSymbol.includes("NIFTY")) baseSymbol = "NIFTY";
//             else if (upperRawSymbol.includes("SENSEX")) baseSymbol = "SENSEX";
//             else continue; 

//             // ==============================================================
//             // ⚡ 1. ENTRY LOGIC 
//             // ==============================================================
//             if (!executionLocks.has(entryLockKey) && !deployment.tradedSecurityId) {
//                 let shouldEnter = false;
//                 let currentSignalType = "NONE";
//                 const strategyType = strategy.type || "Time Based"; 

//                 if (strategyType === "Indicator Based") {
//                     const broker = await Broker.findById(deployment.brokers[0]);
//                     if (broker && broker.engineOn) {
//                         const signal = await getIndicatorSignal(strategy, broker, baseSymbol);
//                         if (signal.long) { shouldEnter = true; currentSignalType = "LONG"; } 
//                         else if (signal.short) { shouldEnter = true; currentSignalType = "SHORT"; }
//                     }
//                 } 
//                 else {
//                     if (config.startTime === currentTime) { shouldEnter = true; currentSignalType = "TIME"; }
//                 }

//                 if (shouldEnter) {
//                     executionLocks.add(entryLockKey);
//                     const isPrePunchSL = strategy.data?.advanceSettings?.prePunchSL || false;

//                     for (const brokerId of deployment.brokers) {
//                         const broker = await Broker.findById(brokerId);
//                         if (broker && broker.engineOn) {
                            
//                             for (const leg of strategy.data.legs) {
//                                 let tradeAction = (leg.action || "BUY").toUpperCase(); 
//                                 let tradeQty = (leg.quantity || 1) * deployment.multiplier;

//                                 let optType = leg.optionType === "Call" ? "CE" : "PE"; 
//                                 if (currentSignalType === "LONG") optType = (tradeAction === "BUY") ? "CE" : "PE"; 
//                                 else if (currentSignalType === "SHORT") optType = (tradeAction === "BUY") ? "PE" : "CE"; 

//                                 let currentSpotPrice = await fetchLivePrice(baseSymbol);
//                                 if (!currentSpotPrice) continue;

//                                 const strikeCriteria = leg.strikeCriteria || "ATM pt";
//                                 let instrument = null;
//                                 let preFetchedLtp = null; 

//                                 if (["CP", "CP >=", "CP <=", "Delta"].includes(strikeCriteria)) {
//                                     instrument = await findStrikeByLivePremium(baseSymbol, currentSpotPrice, optType, leg.expiry || "WEEKLY", strikeCriteria, leg.strikeType || "ATM", broker);
//                                     if (instrument && instrument.ltp) preFetchedLtp = instrument.ltp;
//                                 } else {
//                                     instrument = getOptionSecurityId(baseSymbol, currentSpotPrice, strikeCriteria, leg.strikeType || "ATM", optType, leg.expiry || "WEEKLY");
//                                 }
                                
//                                 if (!instrument) continue;


//                                 if (!instrument) continue;

//                                 // 🔥 THE WAIT & TRADE INJECTION 🔥
//                                 await sleep(500); // 805 Rate limit safety
//                                 const currentPremiumLtp = preFetchedLtp || await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id) || currentSpotPrice;

//                                 const isWaitAndTradeActive = strategy.data?.advanceSettings?.waitAndTrade;
//                                 const waitAndTradeConfig = strategy.data?.advanceSettings?.waitAndTradeConfig || {};

//                                 if (isWaitAndTradeActive && waitAndTradeConfig.movement > 0) {
//                                     // 1. Agar Reference Price save nahi hai, to save karo aur Wait karo
//                                     if (!deployment.waitReferencePrice) {
//                                         deployment.waitReferencePrice = currentPremiumLtp; 
//                                         await deployment.save();
                                        
//                                         console.log(`⏳ [WAIT & TRADE] Signal Aaya! Ref Price: ₹${currentPremiumLtp}. Waiting for movement...`);
//                                         await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'INFO', `Wait & Trade Activated. Ref Premium: ₹${currentPremiumLtp}`);
//                                         continue; // 🛑 Trade execute mat karo, agle loop ka intezaar karo
//                                     } 
//                                     // 2. Agar pehle se Wait kar rahe hain, to condition check karo
//                                     else {
//                                         const waitStatus = processWaitAndTrade(waitAndTradeConfig, currentPremiumLtp, deployment.waitReferencePrice);
                                        
//                                         if (!waitStatus.shouldExecute) {
//                                             // Condition abhi meet nahi hui hai
//                                             continue; // 🛑 Chup chaap agle loop me jao
//                                         } else {
//                                             console.log(`🎯 [WAIT & TRADE] Condition Met! Current: ₹${currentPremiumLtp} crossed Target: ₹${waitStatus.targetPrice}.`);
//                                             await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'INFO', `Wait Target (₹${waitStatus.targetPrice}) Hit! Executing Trade...`);
//                                         }
//                                     }
//                                 }

//                                 // 🟢 PAPER TRADE ENTRY
//                                 if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                                     await sleep(500); 
                                    
//                                     // 🔥 THE BUG FIX: "|| currentSpotPrice" hata diya gaya hai!
//                                     let entryPrice = preFetchedLtp || await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id);
                                    
//                                     // Agar API error ki wajah se price nahi mila, to galat price par entry mat lo!
//                                     if (!entryPrice || entryPrice <= 0) {
//                                         console.log(`⚠️ [WARNING] LTP not found for Paper Trade Entry. Skipping tick to prevent wrong P&L.`);
//                                         continue; 
//                                     }
                                    
//                                     deployment.tradedSecurityId = instrument.id;
//                                     deployment.tradedExchange = instrument.exchange;
//                                     deployment.tradedQty = tradeQty;
//                                     deployment.tradeAction = tradeAction;
//                                     deployment.tradedSymbol = instrument.tradingSymbol;
//                                     deployment.entryPrice = entryPrice;

//                                     if (isPrePunchSL && entryPrice > 0 && leg.slValue > 0) {
//                                         deployment.paperSlPrice = tradeAction === "BUY" 
//                                             ? (leg.slType === 'SL%' ? entryPrice - (entryPrice * (Number(leg.slValue)/100)) : entryPrice - Number(leg.slValue))
//                                             : (leg.slType === 'SL%' ? entryPrice + (entryPrice * (Number(leg.slValue)/100)) : entryPrice + Number(leg.slValue));
//                                     }

//                                     await deployment.save();
//                                     await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Paper Entry at ₹${entryPrice}`);
//                                 }

                                
//                                 // 🔴 LIVE TRADE ENTRY
//                                 else if (deployment.executionType === 'LIVE') {
//                                     const orderData = { action: tradeAction, quantity: tradeQty, securityId: instrument.id, segment: instrument.exchange };
//                                     const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

//                                     if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
//                                         deployment.tradedSecurityId = instrument.id;
//                                         deployment.tradedExchange = instrument.exchange;
//                                         deployment.tradedQty = tradeQty;
//                                         deployment.tradeAction = tradeAction;
//                                         deployment.tradedSymbol = instrument.tradingSymbol;
//                                         deployment.signalType = currentSignalType; // 🔥 FIX: Saving Signal Type

//                                         await sleep(2000); 
//                                         const entryPrice = await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id);
//                                         deployment.entryPrice = entryPrice || 0;

//                                         if (isPrePunchSL) {
//                                             await handlePrePunchSl(deployment, broker, leg, deployment.entryPrice);
//                                         }

//                                         await deployment.save();
//                                         await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Live Entry Executed`, orderResponse.data.orderId);
//                                     } else {
//                                         await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'FAILED', orderResponse.data?.remarks || "Order Failed");
//                                     }
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }

//             // ==============================================================
//             // 📉 2.5 INDICATOR BASED EXIT LOGIC (NEW)
//             // ==============================================================
//             if (!executionLocks.has(exitLockKey) && deployment.tradedSecurityId && strategy.type === "Indicator Based") {
//                 const broker = await Broker.findById(deployment.brokers[0]);
//                 if (broker && broker.engineOn) {
//                     // 🔥 Scanner se poochho ki Exit ka signal aaya kya?
//                     const shouldExit = await getIndicatorExitSignal(strategy, broker, baseSymbol, deployment.signalType);
                    
//                     if (shouldExit) {
//                         executionLocks.add(exitLockKey);
//                         console.log(`📉 INDICATOR EXIT TRIGGERED! Strategy: ${strategy.name}`);

//                         const exitAction = deployment.tradeAction === 'BUY' ? 'SELL' : 'BUY';
                        
//                         // 🟢 PAPER EXIT (Indicator)
//                         if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                             await sleep(500); 
//                             const exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId) || 0;
                            
//                             if (exitLtp > 0 && deployment.entryPrice > 0) {
//                                 const finalPnl = deployment.tradeAction === 'BUY' 
//                                     ? (exitLtp - deployment.entryPrice) * deployment.tradedQty 
//                                     : (deployment.entryPrice - exitLtp) * deployment.tradedQty;

//                                 deployment.exitPrice = exitLtp;
//                                 deployment.pnl = finalPnl;
//                                 deployment.realizedPnl = finalPnl;
//                                 deployment.status = 'COMPLETED';
//                                 deployment.exitRemarks = "Indicator Exit condition met";
//                                 await deployment.save();

//                                 await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'SUCCESS', `Paper Auto-Exit (Indicator). P&L: ₹${finalPnl.toFixed(2)}`);
                                
//                                 // Trigger Advance Features (Exit All)
//                                 if (strategy.data?.advanceSettings?.exitAllOnSlTgt) {
//                                     await handleExitAllOnSlTgt(strategy, deployment, broker, "Indicator Exit");
//                                 }
//                             }
//                         } 
//                         // 🔴 LIVE EXIT (Indicator)
//                         else if (deployment.executionType === 'LIVE') {
//                             const orderData = { action: exitAction, quantity: deployment.tradedQty, securityId: deployment.tradedSecurityId, segment: deployment.tradedExchange };
//                             const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                            
//                             if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
//                                 await sleep(2000); 
//                                 const exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId) || 0;
                                
//                                 const finalPnl = deployment.tradeAction === 'BUY' 
//                                     ? (exitLtp - deployment.entryPrice) * deployment.tradedQty 
//                                     : (deployment.entryPrice - exitLtp) * deployment.tradedQty;

//                                 deployment.exitPrice = exitLtp;
//                                 deployment.pnl = finalPnl;
//                                 deployment.realizedPnl = finalPnl;
//                                 deployment.status = 'COMPLETED';
//                                 deployment.exitRemarks = "Indicator Exit condition met";
//                                 await deployment.save();

//                                 await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'SUCCESS', `Live Auto-Exit (Indicator). P&L: ₹${finalPnl.toFixed(2)}`, orderResponse.data.orderId);

//                                 // Trigger Advance Features (Exit All)
//                                 if (strategy.data?.advanceSettings?.exitAllOnSlTgt) {
//                                     await handleExitAllOnSlTgt(strategy, deployment, broker, "Indicator Exit");
//                                 }
//                             } else {
//                                 await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'FAILED', `Indicator Exit Failed: ${orderResponse.data?.remarks || "RMS Rejected"}`);
//                                 executionLocks.delete(exitLockKey);
//                             }
//                         }
//                     }
//                 }
//             }


//             // ==============================================================
//             // ⏰ 3. TIME-BASED AUTO SQUARE-OFF LOGIC (BULLETPROOF FIXED)
//             // ==============================================================
//             if (squareOffTime && deployment.tradedSecurityId && !executionLocks.has(exitLockKey)) {
                
//                 // Convert both times to pure minutes for safe >= comparison
//                 const [currH, currM] = currentTime.split(':').map(Number);
//                 const currentMinutes = (currH * 60) + currM;

//                 const [sqH, sqM] = squareOffTime.split(':').map(Number);
//                 const squareOffMinutes = (sqH * 60) + sqM;

//                 // Agar current time square-off time ke barabar ya usse zayada hai
//                 if (currentMinutes >= squareOffMinutes) {
//                     executionLocks.add(exitLockKey);
//                     console.log(`⏰ TIME SQUARE-OFF TRIGGERED! Strategy: ${strategy.name} at ${currentTime} (Target was ${squareOffTime})`);

//                     for (const brokerId of deployment.brokers) {
//                         const broker = await Broker.findById(brokerId);
//                         if (broker && broker.engineOn) {
//                             const exitAction = deployment.tradeAction === 'BUY' ? 'SELL' : 'BUY';
                            
//                             if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                                 await sleep(500); 
//                                 const exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId) || 0;
                                
//                                 if (exitLtp > 0 && deployment.entryPrice > 0) {
//                                     const finalPnl = deployment.tradeAction === 'BUY' 
//                                         ? (exitLtp - deployment.entryPrice) * deployment.tradedQty 
//                                         : (deployment.entryPrice - exitLtp) * deployment.tradedQty;

//                                     deployment.exitPrice = exitLtp;
//                                     deployment.pnl = finalPnl;
//                                     deployment.realizedPnl = finalPnl;
//                                     deployment.status = 'COMPLETED';
//                                     deployment.exitRemarks = "Time Auto Square-Off";
//                                     await deployment.save();

//                                     await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'SUCCESS', `Paper Trade Auto-Exit (Time). P&L: ₹${finalPnl.toFixed(2)}`);
//                                 }
//                             } 
//                             else if (deployment.executionType === 'LIVE') {
//                                 const orderData = { action: exitAction, quantity: deployment.tradedQty, securityId: deployment.tradedSecurityId, segment: deployment.tradedExchange };
//                                 const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                                
//                                 if (orderResponse.success) {
//                                     // Live db save & log is handled by Webhook, but we can add a basic log here
//                                     await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'INFO', `Live Time Auto Square-Off order placed.`);
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }


            

//             // ==============================================================
//             // 💰 4. RISK MANAGEMENT & ADVANCE FEATURES DELEGATION 
//             // ==============================================================
//             if (deployment.tradedSecurityId && deployment.status === 'ACTIVE') {
                
//                 await handleMtmSquareOff(deployment, strategy, executionLocks, exitLockKey);

//                 const broker = await Broker.findById(deployment.brokers[0]); 
//                 if (broker) {
//                     await sleep(2000); 
                    
//                     const liveLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId);
                    
//                     if (liveLtp && liveLtp > 0) {
//                         await processTrailingLogic(deployment, strategy, liveLtp, broker);

//                         const checkExitStatus = await Deployment.findById(deployment._id);
//                         if (checkExitStatus && checkExitStatus.status === 'COMPLETED') {
//                             const triggerReason = checkExitStatus.exitRemarks || "Target/SL Hit";

//                             if (strategy.data?.advanceSettings?.exitAllOnSlTgt) {
//                                 await handleExitAllOnSlTgt(strategy, checkExitStatus, broker, triggerReason);
//                             }
                            
//                             if (strategy.data?.advanceSettings?.moveSLToCost) {
//                                 await handleMoveSlToCost(strategy, checkExitStatus, broker);
//                             }
//                         }
//                     }
//                 }
//             }
//         }
//     } catch (error) { 
//         console.error("❌ Trading Engine Core Error:", error); 
//     } finally {
//         isEngineRunning = false; 
//     }
// });




// // ==========================================
// // 🌟 MAIN TRADING ENGINE (THE MANAGER) 🌟
// // ==========================================
// const cron = require('node-cron');
// const moment = require('moment-timezone');

// // 📂 Models
// const Deployment = require('../models/Deployment.js');
// const Broker = require('../models/Broker.js');

// // 🛠️ Utilities & APIs 
// const { sleep, getStrikeStep, getOptionSecurityId } = require('../services/instrumentService.js');
// const { placeDhanOrder, fetchLiveLTP } = require('../services/dhanService.js');
// const { fetchLivePrice } = require('./utils/priceFetcher.js');
// const { createAndEmitLog } = require('./utils/logger.js'); 

// // 🔍 Scanners
// // 🔥 FIX: Added 'getIndicatorExitSignal' for Indicator Exits
// const { findStrikeByLivePremium } = require('./scanners/optionChainScanner.js');
// const { getIndicatorSignal, getIndicatorExitSignal } = require('./scanners/indicatorScanner.js');  

// // 🛡️ Risk Management
// const { handleMtmSquareOff } = require('./features/riskManagement/mtmSquareOff.js');
// const { processTrailingLogic } = require('./features/riskManagement/trailingLogic.js');

// // 🚀 ADVANCE FEATURES
// const { handleMoveSlToCost } = require('./features/advanceFeatures/moveSlToCost.js');
// const { handlePrePunchSl } = require('./features/advanceFeatures/prePunchSl.js');
// const { handleExitAllOnSlTgt } = require('./features/advanceFeatures/exitAllOnSlTgt.js');
// const { processWaitAndTrade } = require('./features/advanceFeatures/waitAndTrade.js');

// // Global execution locks
// const executionLocks = new Set();
// let isEngineRunning = false; 

// // ==========================================
// // ⚙️ THE CORE CRON JOB LOOP (Runs every 30s)
// // ==========================================
// cron.schedule('*/30 * * * * *', async () => {
    
//     if (isEngineRunning) {
//         console.log("⏳ Engine is taking time, skipping overlapping tick...");
//         return; 
//     }
    
//     isEngineRunning = true; 

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

//             // 🛑 THE SHIELD: STRICT SYMBOL VALIDATION 
//             const instrumentData = (strategy.data.instruments && strategy.data.instruments.length > 0) ? strategy.data.instruments[0] : {};
//             let rawSymbol = instrumentData.name || config.index || strategy.symbol || strategy.name;
//             if (!rawSymbol) continue;

//             let baseSymbol = "";
//             const upperRawSymbol = String(rawSymbol).toUpperCase();
//             if (upperRawSymbol.includes("BANK")) baseSymbol = "BANKNIFTY";
//             else if (upperRawSymbol.includes("FIN")) baseSymbol = "FINNIFTY";
//             else if (upperRawSymbol.includes("MID")) baseSymbol = "MIDCPNIFTY";
//             else if (upperRawSymbol.includes("NIFTY")) baseSymbol = "NIFTY";
//             else if (upperRawSymbol.includes("SENSEX")) baseSymbol = "SENSEX";
//             else continue; 

//             // ==============================================================
//             // ⚡ 1. ENTRY LOGIC 
//             // ==============================================================
//             if (!executionLocks.has(entryLockKey) && !deployment.tradedSecurityId) {
//                 let shouldEnter = false;
//                 let currentSignalType = "NONE";
//                 const strategyType = strategy.type || "Time Based"; 

//                 if (strategyType === "Indicator Based") {
//                     const broker = await Broker.findById(deployment.brokers[0]);
//                     if (broker && broker.engineOn) {
//                         const signal = await getIndicatorSignal(strategy, broker, baseSymbol);
//                         if (signal.long) { shouldEnter = true; currentSignalType = "LONG"; } 
//                         else if (signal.short) { shouldEnter = true; currentSignalType = "SHORT"; }
//                     }
//                 } 
//                 else {
//                     if (config.startTime === currentTime) { shouldEnter = true; currentSignalType = "TIME"; }
//                 }

//                 if (shouldEnter) {
//                     executionLocks.add(entryLockKey);
//                     const isPrePunchSL = strategy.data?.advanceSettings?.prePunchSL || false;

//                     for (const brokerId of deployment.brokers) {
//                         const broker = await Broker.findById(brokerId);
//                         if (broker && broker.engineOn) {
                            
//                             for (const leg of strategy.data.legs) {
//                                 let tradeAction = (leg.action || "BUY").toUpperCase(); 
//                                 let tradeQty = (leg.quantity || 1) * deployment.multiplier;

//                                 let optType = leg.optionType === "Call" ? "CE" : "PE"; 
//                                 if (currentSignalType === "LONG") optType = (tradeAction === "BUY") ? "CE" : "PE"; 
//                                 else if (currentSignalType === "SHORT") optType = (tradeAction === "BUY") ? "PE" : "CE"; 

//                                 let currentSpotPrice = await fetchLivePrice(baseSymbol);
//                                 if (!currentSpotPrice) continue;

//                                 const strikeCriteria = leg.strikeCriteria || "ATM pt";
//                                 let instrument = null;
//                                 let preFetchedLtp = null; 

//                                 if (["CP", "CP >=", "CP <=", "Delta"].includes(strikeCriteria)) {
//                                     instrument = await findStrikeByLivePremium(baseSymbol, currentSpotPrice, optType, leg.expiry || "WEEKLY", strikeCriteria, leg.strikeType || "ATM", broker);
//                                     if (instrument && instrument.ltp) preFetchedLtp = instrument.ltp;
//                                 } else {
//                                     instrument = getOptionSecurityId(baseSymbol, currentSpotPrice, strikeCriteria, leg.strikeType || "ATM", optType, leg.expiry || "WEEKLY");
//                                 }
                                
//                                 if (!instrument) continue;


//                                 if (!instrument) continue;

//                                 // 🔥 THE WAIT & TRADE INJECTION 🔥
//                                 await sleep(500); // 805 Rate limit safety
//                                 const currentPremiumLtp = preFetchedLtp || await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id) || currentSpotPrice;

//                                 const isWaitAndTradeActive = strategy.data?.advanceSettings?.waitAndTrade;
//                                 const waitAndTradeConfig = strategy.data?.advanceSettings?.waitAndTradeConfig || {};

//                                 if (isWaitAndTradeActive && waitAndTradeConfig.movement > 0) {
//                                     // 1. Agar Reference Price save nahi hai, to save karo aur Wait karo
//                                     if (!deployment.waitReferencePrice) {
//                                         deployment.waitReferencePrice = currentPremiumLtp; 
//                                         await deployment.save();
                                        
//                                         console.log(`⏳ [WAIT & TRADE] Signal Aaya! Ref Price: ₹${currentPremiumLtp}. Waiting for movement...`);
//                                         await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'INFO', `Wait & Trade Activated. Ref Premium: ₹${currentPremiumLtp}`);
//                                         continue; // 🛑 Trade execute mat karo, agle loop ka intezaar karo
//                                     } 
//                                     // 2. Agar pehle se Wait kar rahe hain, to condition check karo
//                                     else {
//                                         const waitStatus = processWaitAndTrade(waitAndTradeConfig, currentPremiumLtp, deployment.waitReferencePrice);
                                        
//                                         if (!waitStatus.shouldExecute) {
//                                             // Condition abhi meet nahi hui hai
//                                             continue; // 🛑 Chup chaap agle loop me jao
//                                         } else {
//                                             console.log(`🎯 [WAIT & TRADE] Condition Met! Current: ₹${currentPremiumLtp} crossed Target: ₹${waitStatus.targetPrice}.`);
//                                             await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'INFO', `Wait Target (₹${waitStatus.targetPrice}) Hit! Executing Trade...`);
//                                         }
//                                     }
//                                 }

//                                 // 🟢 PAPER TRADE ENTRY
//                                 if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                                     await sleep(500); 
                                    
//                                     // 🔥 THE BUG FIX: "|| currentSpotPrice" hata diya gaya hai!
//                                     let entryPrice = preFetchedLtp || await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id);
                                    
//                                     // Agar API error ki wajah se price nahi mila, to galat price par entry mat lo!
//                                     if (!entryPrice || entryPrice <= 0) {
//                                         console.log(`⚠️ [WARNING] LTP not found for Paper Trade Entry. Skipping tick to prevent wrong P&L.`);
//                                         continue; 
//                                     }
                                    
//                                     deployment.tradedSecurityId = instrument.id;
//                                     deployment.tradedExchange = instrument.exchange;
//                                     deployment.tradedQty = tradeQty;
//                                     deployment.tradeAction = tradeAction;
//                                     deployment.tradedSymbol = instrument.tradingSymbol;
//                                     deployment.entryPrice = entryPrice;

//                                     if (isPrePunchSL && entryPrice > 0 && leg.slValue > 0) {
//                                         deployment.paperSlPrice = tradeAction === "BUY" 
//                                             ? (leg.slType === 'SL%' ? entryPrice - (entryPrice * (Number(leg.slValue)/100)) : entryPrice - Number(leg.slValue))
//                                             : (leg.slType === 'SL%' ? entryPrice + (entryPrice * (Number(leg.slValue)/100)) : entryPrice + Number(leg.slValue));
//                                     }

//                                     await deployment.save();
//                                     await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Paper Entry at ₹${entryPrice}`);
//                                 }

                                
//                                 // 🔴 LIVE TRADE ENTRY
//                                 else if (deployment.executionType === 'LIVE') {
//                                     const orderData = { action: tradeAction, quantity: tradeQty, securityId: instrument.id, segment: instrument.exchange };
//                                     const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

//                                     if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
//                                         deployment.tradedSecurityId = instrument.id;
//                                         deployment.tradedExchange = instrument.exchange;
//                                         deployment.tradedQty = tradeQty;
//                                         deployment.tradeAction = tradeAction;
//                                         deployment.tradedSymbol = instrument.tradingSymbol;
//                                         deployment.signalType = currentSignalType; // 🔥 FIX: Saving Signal Type

//                                         await sleep(2000); 
//                                         const entryPrice = await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id);
//                                         deployment.entryPrice = entryPrice || 0;

//                                         if (isPrePunchSL) {
//                                             await handlePrePunchSl(deployment, broker, leg, deployment.entryPrice);
//                                         }

//                                         await deployment.save();
//                                         await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Live Entry Executed`, orderResponse.data.orderId);
//                                     } else {
//                                         await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'FAILED', orderResponse.data?.remarks || "Order Failed");
//                                     }
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }

//             // ==============================================================
//             // 📉 2.5 INDICATOR BASED EXIT LOGIC (NEW)
//             // ==============================================================
//             if (!executionLocks.has(exitLockKey) && deployment.tradedSecurityId && strategy.type === "Indicator Based") {
//                 const broker = await Broker.findById(deployment.brokers[0]);
//                 if (broker && broker.engineOn) {
//                     // 🔥 Scanner se poochho ki Exit ka signal aaya kya?
//                     const shouldExit = await getIndicatorExitSignal(strategy, broker, baseSymbol, deployment.signalType);
                    
//                     if (shouldExit) {
//                         executionLocks.add(exitLockKey);
//                         console.log(`📉 INDICATOR EXIT TRIGGERED! Strategy: ${strategy.name}`);

//                         const exitAction = deployment.tradeAction === 'BUY' ? 'SELL' : 'BUY';
                        
//                         // 🟢 PAPER EXIT (Indicator)
//                         if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                             await sleep(500); 
//                             const exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId) || 0;
                            
//                             if (exitLtp > 0 && deployment.entryPrice > 0) {
//                                 const finalPnl = deployment.tradeAction === 'BUY' 
//                                     ? (exitLtp - deployment.entryPrice) * deployment.tradedQty 
//                                     : (deployment.entryPrice - exitLtp) * deployment.tradedQty;

//                                 deployment.exitPrice = exitLtp;
//                                 deployment.pnl = finalPnl;
//                                 deployment.realizedPnl = finalPnl;
//                                 deployment.status = 'COMPLETED';
//                                 deployment.exitRemarks = "Indicator Exit condition met";
//                                 await deployment.save();

//                                 await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'SUCCESS', `Paper Auto-Exit (Indicator). P&L: ₹${finalPnl.toFixed(2)}`);
                                
//                                 // Trigger Advance Features (Exit All)
//                                 if (strategy.data?.advanceSettings?.exitAllOnSlTgt) {
//                                     await handleExitAllOnSlTgt(strategy, deployment, broker, "Indicator Exit");
//                                 }
//                             }
//                         } 
//                         // 🔴 LIVE EXIT (Indicator)
//                         else if (deployment.executionType === 'LIVE') {
//                             const orderData = { action: exitAction, quantity: deployment.tradedQty, securityId: deployment.tradedSecurityId, segment: deployment.tradedExchange };
//                             const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                            
//                             if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
//                                 await sleep(2000); 
//                                 const exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId) || 0;
                                
//                                 const finalPnl = deployment.tradeAction === 'BUY' 
//                                     ? (exitLtp - deployment.entryPrice) * deployment.tradedQty 
//                                     : (deployment.entryPrice - exitLtp) * deployment.tradedQty;

//                                 deployment.exitPrice = exitLtp;
//                                 deployment.pnl = finalPnl;
//                                 deployment.realizedPnl = finalPnl;
//                                 deployment.status = 'COMPLETED';
//                                 deployment.exitRemarks = "Indicator Exit condition met";
//                                 await deployment.save();

//                                 await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'SUCCESS', `Live Auto-Exit (Indicator). P&L: ₹${finalPnl.toFixed(2)}`, orderResponse.data.orderId);

//                                 // Trigger Advance Features (Exit All)
//                                 if (strategy.data?.advanceSettings?.exitAllOnSlTgt) {
//                                     await handleExitAllOnSlTgt(strategy, deployment, broker, "Indicator Exit");
//                                 }
//                             } else {
//                                 await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'FAILED', `Indicator Exit Failed: ${orderResponse.data?.remarks || "RMS Rejected"}`);
//                                 executionLocks.delete(exitLockKey);
//                             }
//                         }
//                     }
//                 }
//             }


//             // ==============================================================
//             // ⏰ 3. TIME-BASED AUTO SQUARE-OFF LOGIC (BULLETPROOF FIXED)
//             // ==============================================================
//             if (squareOffTime && deployment.tradedSecurityId && !executionLocks.has(exitLockKey)) {
                
//                 // Convert both times to pure minutes for safe >= comparison
//                 const [currH, currM] = currentTime.split(':').map(Number);
//                 const currentMinutes = (currH * 60) + currM;

//                 const [sqH, sqM] = squareOffTime.split(':').map(Number);
//                 const squareOffMinutes = (sqH * 60) + sqM;

//                 // Agar current time square-off time ke barabar ya usse zayada hai
//                 if (currentMinutes >= squareOffMinutes) {
//                     executionLocks.add(exitLockKey);
//                     console.log(`⏰ TIME SQUARE-OFF TRIGGERED! Strategy: ${strategy.name} at ${currentTime} (Target was ${squareOffTime})`);

//                     for (const brokerId of deployment.brokers) {
//                         const broker = await Broker.findById(brokerId);
//                         if (broker && broker.engineOn) {
//                             const exitAction = deployment.tradeAction === 'BUY' ? 'SELL' : 'BUY';
                            
//                             if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                                 await sleep(500); 
//                                 const exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId) || 0;
                                
//                                 if (exitLtp > 0 && deployment.entryPrice > 0) {
//                                     const finalPnl = deployment.tradeAction === 'BUY' 
//                                         ? (exitLtp - deployment.entryPrice) * deployment.tradedQty 
//                                         : (deployment.entryPrice - exitLtp) * deployment.tradedQty;

//                                     deployment.exitPrice = exitLtp;
//                                     deployment.pnl = finalPnl;
//                                     deployment.realizedPnl = finalPnl;
//                                     deployment.status = 'COMPLETED';
//                                     deployment.exitRemarks = "Time Auto Square-Off";
//                                     await deployment.save();

//                                     await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'SUCCESS', `Paper Trade Auto-Exit (Time). P&L: ₹${finalPnl.toFixed(2)}`);
//                                 }
//                             } 
//                             else if (deployment.executionType === 'LIVE') {
//                                 const orderData = { action: exitAction, quantity: deployment.tradedQty, securityId: deployment.tradedSecurityId, segment: deployment.tradedExchange };
//                                 const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                                
//                                 if (orderResponse.success) {
//                                     // Live db save & log is handled by Webhook, but we can add a basic log here
//                                     await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'INFO', `Live Time Auto Square-Off order placed.`);
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }


//             // ==============================================================
//             // 💰 4. RISK MANAGEMENT & ADVANCE FEATURES DELEGATION 
//             // ==============================================================
//             if (deployment.tradedSecurityId && deployment.status === 'ACTIVE' && !executionLocks.has(exitLockKey)) {
                
//                 // MTM Square-off (Overall Strategy Level)
//                 await handleMtmSquareOff(deployment, strategy, executionLocks, exitLockKey);

//                 const broker = await Broker.findById(deployment.brokers[0]); 
//                 if (broker) {
//                     await sleep(2000); 
                    
//                     const liveLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId);
                    
//                     if (liveLtp && liveLtp > 0) {
                        
//                         // ==============================================================
//                         // 🎯 4.1 NEW: INDIVIDUAL LEG SL & TP LOGIC (% and Points)
//                         // ==============================================================
//                         let isSlHit = false;
//                         let isTpHit = false;
//                         let exitReason = "";

//                         // Strategy setup me se is leg ka config nikalo
//                         const legConfig = strategy.data.legs.find(l => 
//                             (l.action || "BUY").toUpperCase() === deployment.tradeAction && 
//                             deployment.tradedSymbol.includes(l.optionType === "Call" ? "CE" : "PE")
//                         ) || strategy.data.legs[0];

//                         if (legConfig) {
//                             // Backend ke keys handle karna (UI ke hisaab se)
//                             const slType = legConfig.slType || "SL pt";
//                             const slVal = Number(legConfig.slValue || legConfig.sl || 0);
//                             const tpType = legConfig.tpType || "TP pt";
//                             const tpVal = Number(legConfig.tpValue || legConfig.tp || 0);

//                             // PnL in Points (Kitne point upar/niche gaya)
//                             let pnlInPoints = deployment.tradeAction === 'BUY' 
//                                 ? (liveLtp - deployment.entryPrice) 
//                                 : (deployment.entryPrice - liveLtp);
                                
//                             // PnL in Percentage (Kitna % upar/niche gaya)
//                             let pnlInPercentage = (pnlInPoints / deployment.entryPrice) * 100;

//                             // 🚨 CHECK STOPLOSS (SL)
//                             if (slVal > 0) {
//                                 if (slType.includes("%") && pnlInPercentage <= -slVal) {
//                                     isSlHit = true;
//                                     exitReason = `StopLoss Hit (${slVal}%)`;
//                                 } else if (!slType.includes("%") && pnlInPoints <= -slVal) {
//                                     isSlHit = true;
//                                     exitReason = `StopLoss Hit (${slVal} pts)`;
//                                 }
//                             }

//                             // 🎯 CHECK TARGET (TP)
//                             if (tpVal > 0 && !isSlHit) {
//                                 if (tpType.includes("%") && pnlInPercentage >= tpVal) {
//                                     isTpHit = true;
//                                     exitReason = `Target Hit (${tpVal}%)`;
//                                 } else if (!tpType.includes("%") && pnlInPoints >= tpVal) {
//                                     isTpHit = true;
//                                     exitReason = `Target Hit (${tpVal} pts)`;
//                                 }
//                             }
//                         }

//                         // ⚡ AGAR SL YA TP HIT HUA HAI TO TRADE SQUARE-OFF KARO
//                         if (isSlHit || isTpHit) {
//                             executionLocks.add(exitLockKey);
//                             const exitAction = deployment.tradeAction === 'BUY' ? 'SELL' : 'BUY';
//                             console.log(`🎯 TARGET/SL TRIGGERED: ${exitReason} for ${deployment.tradedSymbol}`);

//                             // 🟢 PAPER TRADE EXIT
//                             if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                                 const finalPnl = deployment.tradeAction === 'BUY' 
//                                     ? (liveLtp - deployment.entryPrice) * deployment.tradedQty 
//                                     : (deployment.entryPrice - liveLtp) * deployment.tradedQty;

//                                 deployment.exitPrice = liveLtp;
//                                 deployment.pnl = finalPnl;
//                                 deployment.realizedPnl = finalPnl;
//                                 deployment.status = 'COMPLETED';
//                                 deployment.exitRemarks = exitReason; // Frontend par ab reason dikhega
//                                 await deployment.save();

//                                 await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'SUCCESS', `Auto-Exit: ${exitReason}. P&L: ₹${finalPnl.toFixed(2)}`);

//                                 // Trigger Advance Features (Exit All)
//                                 if (strategy.data?.advanceSettings?.exitAllOnSlTgt) {
//                                     await handleExitAllOnSlTgt(strategy, deployment, broker, exitReason);
//                                 }
//                             } 
//                             // 🔴 LIVE TRADE EXIT
//                             else if (deployment.executionType === 'LIVE') {
//                                 const orderData = { action: exitAction, quantity: deployment.tradedQty, securityId: deployment.tradedSecurityId, segment: deployment.tradedExchange };
//                                 const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

//                                 if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
//                                     const finalPnl = deployment.tradeAction === 'BUY' 
//                                         ? (liveLtp - deployment.entryPrice) * deployment.tradedQty 
//                                         : (deployment.entryPrice - liveLtp) * deployment.tradedQty;

//                                     deployment.exitPrice = liveLtp;
//                                     deployment.pnl = finalPnl;
//                                     deployment.realizedPnl = finalPnl;
//                                     deployment.status = 'COMPLETED';
//                                     deployment.exitRemarks = exitReason; // Frontend par ab reason dikhega
//                                     await deployment.save();

//                                     await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'SUCCESS', `Live Auto-Exit: ${exitReason}. P&L: ₹${finalPnl.toFixed(2)}`, orderResponse.data.orderId);

//                                     if (strategy.data?.advanceSettings?.exitAllOnSlTgt) {
//                                         await handleExitAllOnSlTgt(strategy, deployment, broker, exitReason);
//                                     }
//                                 } else {
//                                     await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'FAILED', `Exit Failed: ${orderResponse.data?.remarks || "RMS Rejected"}`);
//                                     executionLocks.delete(exitLockKey);
//                                 }
//                             }
//                         } 
//                         // ==============================================================
//                         // 🔄 4.2 AGAR SL/TP HIT NAHI HUA, TO TRAILING LOGIC CHALAO
//                         // ==============================================================
//                         else {
//                             await processTrailingLogic(deployment, strategy, liveLtp, broker);

//                             const checkExitStatus = await Deployment.findById(deployment._id);
//                             if (checkExitStatus && checkExitStatus.status === 'COMPLETED') {
//                                 const triggerReason = checkExitStatus.exitRemarks || "Trailing SL Hit";

//                                 if (strategy.data?.advanceSettings?.exitAllOnSlTgt) {
//                                     await handleExitAllOnSlTgt(strategy, checkExitStatus, broker, triggerReason);
//                                 }
                                
//                                 if (strategy.data?.advanceSettings?.moveSLToCost) {
//                                     await handleMoveSlToCost(strategy, checkExitStatus, broker);
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }
//         }
//     } catch (error) { 
//         console.error("❌ Trading Engine Core Error:", error); 
//     } finally {
//         isEngineRunning = false; 
//     }
// });



// // ==========================================
// // 🌟 MAIN TRADING ENGINE (THE MANAGER) 🌟
// // ==========================================
// const cron = require('node-cron');
// const moment = require('moment-timezone');

// // 📂 Models
// const Deployment = require('../models/Deployment.js');
// const Broker = require('../models/Broker.js');

// // 🛠️ Utilities & APIs 
// const { sleep, getStrikeStep, getOptionSecurityId } = require('../services/instrumentService.js');
// const { placeDhanOrder, fetchLiveLTP } = require('../services/dhanService.js');
// const { fetchLivePrice } = require('./utils/priceFetcher.js');
// const { createAndEmitLog } = require('./utils/logger.js'); 

// // 🔍 Scanners
// const { findStrikeByLivePremium } = require('./scanners/optionChainScanner.js');
// const { getIndicatorSignal, getIndicatorExitSignal } = require('./scanners/indicatorScanner.js');  

// // 🛡️ Risk Management
// const { handleMtmSquareOff } = require('./features/riskManagement/mtmSquareOff.js');
// const { processTrailingLogic } = require('./features/riskManagement/trailingLogic.js');

// // 🚀 ADVANCE FEATURES
// const { handleMoveSlToCost } = require('./features/advanceFeatures/moveSlToCost.js');
// const { handlePrePunchSl } = require('./features/advanceFeatures/prePunchSl.js');
// const { handleExitAllOnSlTgt } = require('./features/advanceFeatures/exitAllOnSlTgt.js');
// const { processWaitAndTrade } = require('./features/advanceFeatures/waitAndTrade.js');

// // Global execution locks
// const executionLocks = new Set();
// let isEngineRunning = false; 

// // ==========================================
// // ⚙️ THE CORE CRON JOB LOOP (Runs every 30s)
// // ==========================================
// cron.schedule('*/30 * * * * *', async () => {
    
//     if (isEngineRunning) {
//         console.log("⏳ Engine is taking time, skipping overlapping tick...");
//         return; 
//     }
    
//     isEngineRunning = true; 

//     try {
//         const currentTime = moment().tz("Asia/Kolkata").format("HH:mm");
//         const activeDeployments = await Deployment.find({ 
//             status: { $in: ['ACTIVE', 'PARTIALLY_COMPLETED'] } // 🔥 FIX: Both active states
//         }).populate('strategyId');

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

//             // 🛑 THE SHIELD: STRICT SYMBOL VALIDATION 
//             const instrumentData = (strategy.data.instruments && strategy.data.instruments.length > 0) ? strategy.data.instruments[0] : {};
//             let rawSymbol = instrumentData.name || config.index || strategy.symbol || strategy.name;
//             if (!rawSymbol) continue;

//             let baseSymbol = "";
//             const upperRawSymbol = String(rawSymbol).toUpperCase();
//             if (upperRawSymbol.includes("BANK")) baseSymbol = "BANKNIFTY";
//             else if (upperRawSymbol.includes("FIN")) baseSymbol = "FINNIFTY";
//             else if (upperRawSymbol.includes("MID")) baseSymbol = "MIDCPNIFTY";
//             else if (upperRawSymbol.includes("NIFTY")) baseSymbol = "NIFTY";
//             else if (upperRawSymbol.includes("SENSEX")) baseSymbol = "SENSEX";
//             else continue; 

//             // 🔥 HELPERS
//             const hasLegs = deployment.executedLegs && deployment.executedLegs.length > 0;
//             const hasActiveLegs = hasLegs && deployment.executedLegs.some(l => l.status === 'ACTIVE');

//             // ==============================================================
//             // ⚡ 1. ENTRY LOGIC (Fixed to use executedLegs array)
//             // ==============================================================
//             if (!executionLocks.has(entryLockKey) && !hasLegs) {
//                 let shouldEnter = false;
//                 let currentSignalType = "NONE";
//                 const strategyType = strategy.type || "Time Based"; 

//                 if (strategyType === "Indicator Based") {
//                     const broker = await Broker.findById(deployment.brokers[0]);
//                     if (broker && broker.engineOn) {
//                         const signal = await getIndicatorSignal(strategy, broker, baseSymbol);
//                         if (signal.long) { shouldEnter = true; currentSignalType = "LONG"; } 
//                         else if (signal.short) { shouldEnter = true; currentSignalType = "SHORT"; }
//                     }
//                 } 
//                 else {
//                     if (config.startTime === currentTime) { shouldEnter = true; currentSignalType = "TIME"; }
//                 }

//                 if (shouldEnter) {
//                     executionLocks.add(entryLockKey);
//                     const isPrePunchSL = strategy.data?.advanceSettings?.prePunchSL || false;

//                     for (const brokerId of deployment.brokers) {
//                         const broker = await Broker.findById(brokerId);
//                         if (broker && broker.engineOn) {
                            
//                             for (const leg of strategy.data.legs) {
//                                 let tradeAction = (leg.action || "BUY").toUpperCase(); 
//                                 let tradeQty = (leg.quantity || 1) * deployment.multiplier;

//                                 let optType = leg.optionType === "Call" ? "CE" : "PE"; 
//                                 if (currentSignalType === "LONG") optType = (tradeAction === "BUY") ? "CE" : "PE"; 
//                                 else if (currentSignalType === "SHORT") optType = (tradeAction === "BUY") ? "PE" : "CE"; 

//                                 let currentSpotPrice = await fetchLivePrice(baseSymbol);
//                                 if (!currentSpotPrice) continue;

//                                 const strikeCriteria = leg.strikeCriteria || "ATM pt";
//                                 let instrument = null;
//                                 let preFetchedLtp = null; 

//                                 if (["CP", "CP >=", "CP <=", "Delta"].includes(strikeCriteria)) {
//                                     instrument = await findStrikeByLivePremium(baseSymbol, currentSpotPrice, optType, leg.expiry || "WEEKLY", strikeCriteria, leg.strikeType || "ATM", broker);
//                                     if (instrument && instrument.ltp) preFetchedLtp = instrument.ltp;
//                                 } else {
//                                     instrument = getOptionSecurityId(baseSymbol, currentSpotPrice, strikeCriteria, leg.strikeType || "ATM", optType, leg.expiry || "WEEKLY");
//                                 }
                                
//                                 if (!instrument) continue;

//                                 // 🔥 THE WAIT & TRADE INJECTION
//                                 await sleep(500); 
//                                 const currentPremiumLtp = preFetchedLtp || await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id) || currentSpotPrice;

//                                 const isWaitAndTradeActive = strategy.data?.advanceSettings?.waitAndTrade;
//                                 const waitAndTradeConfig = strategy.data?.advanceSettings?.waitAndTradeConfig || {};

//                                 if (isWaitAndTradeActive && waitAndTradeConfig.movement > 0) {
//                                     if (!deployment.waitReferencePrice) {
//                                         deployment.waitReferencePrice = currentPremiumLtp; 
//                                         await deployment.save();
//                                         console.log(`⏳ [WAIT & TRADE] Ref Price: ₹${currentPremiumLtp}. Waiting for movement...`);
//                                         await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'INFO', `Wait & Trade Activated. Ref Premium: ₹${currentPremiumLtp}`);
//                                         continue; 
//                                     } else {
//                                         const waitStatus = processWaitAndTrade(waitAndTradeConfig, currentPremiumLtp, deployment.waitReferencePrice);
//                                         if (!waitStatus.shouldExecute) {
//                                             continue; 
//                                         } else {
//                                             console.log(`🎯 [WAIT & TRADE] Target Hit! Executing Trade...`);
//                                         }
//                                     }
//                                 }

//                                 // 🟢 PAPER TRADE ENTRY
//                                 if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                                     await sleep(500); 
//                                     let entryPrice = preFetchedLtp || await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id);
                                    
//                                     if (!entryPrice || entryPrice <= 0) {
//                                         console.log(`⚠️ LTP not found. Skipping...`);
//                                         continue; 
//                                     }
                                    
//                                     let paperSl = 0;
//                                     if (isPrePunchSL && entryPrice > 0 && leg.slValue > 0) {
//                                         paperSl = tradeAction === "BUY" 
//                                             ? (leg.slType === 'SL%' ? entryPrice - (entryPrice * (Number(leg.slValue)/100)) : entryPrice - Number(leg.slValue))
//                                             : (leg.slType === 'SL%' ? entryPrice + (entryPrice * (Number(leg.slValue)/100)) : entryPrice + Number(leg.slValue));
//                                     }

//                                     // 🔥 PUSH TO ARRAY
//                                     deployment.executedLegs.push({
//                                         securityId: instrument.id,
//                                         exchange: instrument.exchange,
//                                         symbol: instrument.tradingSymbol,
//                                         action: tradeAction,
//                                         quantity: tradeQty,
//                                         entryPrice: entryPrice,
//                                         paperSlPrice: paperSl,
//                                         status: 'ACTIVE'
//                                     });

//                                     await deployment.save();
//                                     await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Paper Entry at ₹${entryPrice}`);
//                                 }
                                
//                                 // 🔴 LIVE TRADE ENTRY
//                                 else if (deployment.executionType === 'LIVE') {
//                                     const orderData = { action: tradeAction, quantity: tradeQty, securityId: instrument.id, segment: instrument.exchange };
//                                     const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

//                                     if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
//                                         await sleep(2000); 
//                                         const entryPrice = await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id) || 0;

//                                         // 🔥 PUSH TO ARRAY
//                                         deployment.executedLegs.push({
//                                             securityId: instrument.id,
//                                             exchange: instrument.exchange,
//                                             symbol: instrument.tradingSymbol,
//                                             action: tradeAction,
//                                             quantity: tradeQty,
//                                             entryPrice: entryPrice,
//                                             status: 'ACTIVE'
//                                         });

//                                         await deployment.save();
//                                         await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Live Entry Executed`, orderResponse.data.orderId);
//                                     } else {
//                                         await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'FAILED', orderResponse.data?.remarks || "Order Failed");
//                                     }
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }

//             // ==============================================================
//             // 📉 2.5 INDICATOR BASED EXIT LOGIC (Fixed for Array)
//             // ==============================================================
//             if (!executionLocks.has(exitLockKey) && hasActiveLegs && strategy.type === "Indicator Based") {
//                 const broker = await Broker.findById(deployment.brokers[0]);
//                 if (broker && broker.engineOn) {
//                     // Check signal (you might need to update your scanner if it relied on single leg data)
//                     const shouldExit = await getIndicatorExitSignal(strategy, broker, baseSymbol, deployment.signalType || "NONE");
                    
//                     if (shouldExit) {
//                         executionLocks.add(exitLockKey);
//                         console.log(`📉 INDICATOR EXIT TRIGGERED! Strategy: ${strategy.name}`);

//                         for (let i = 0; i < deployment.executedLegs.length; i++) {
//                             let currentLeg = deployment.executedLegs[i];
//                             if (currentLeg.status !== 'ACTIVE') continue;

//                             const exitAction = currentLeg.action === 'BUY' ? 'SELL' : 'BUY';
//                             await sleep(500);
                            
//                             // PAPER
//                             if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                                 const exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, currentLeg.exchange, currentLeg.securityId) || 0;
//                                 if (exitLtp > 0) {
//                                     const finalPnl = currentLeg.action === 'BUY' 
//                                         ? (exitLtp - currentLeg.entryPrice) * currentLeg.quantity 
//                                         : (currentLeg.entryPrice - exitLtp) * currentLeg.quantity;

//                                     currentLeg.exitPrice = exitLtp;
//                                     currentLeg.livePnl = finalPnl;
//                                     currentLeg.status = 'COMPLETED';
//                                     currentLeg.exitReason = "Indicator Exit";
                                    
//                                     deployment.pnl = (deployment.pnl || 0) + finalPnl;
//                                     deployment.realizedPnl = (deployment.realizedPnl || 0) + finalPnl;

//                                     await createAndEmitLog(broker, currentLeg.symbol, exitAction, currentLeg.quantity, 'SUCCESS', `Paper Indicator Exit. P&L: ₹${finalPnl.toFixed(2)}`);
//                                 }
//                             } 
//                             // LIVE
//                             else if (deployment.executionType === 'LIVE') {
//                                 const orderData = { action: exitAction, quantity: currentLeg.quantity, securityId: currentLeg.securityId, segment: currentLeg.exchange };
//                                 const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                                
//                                 if (orderResponse.success) {
//                                     await sleep(2000); 
//                                     const exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, currentLeg.exchange, currentLeg.securityId) || 0;
//                                     const finalPnl = currentLeg.action === 'BUY' 
//                                         ? (exitLtp - currentLeg.entryPrice) * currentLeg.quantity 
//                                         : (currentLeg.entryPrice - exitLtp) * currentLeg.quantity;

//                                     currentLeg.exitPrice = exitLtp;
//                                     currentLeg.livePnl = finalPnl;
//                                     currentLeg.status = 'COMPLETED';
//                                     currentLeg.exitReason = "Indicator Exit";
                                    
//                                     deployment.pnl = (deployment.pnl || 0) + finalPnl;
//                                     deployment.realizedPnl = (deployment.realizedPnl || 0) + finalPnl;

//                                     await createAndEmitLog(broker, currentLeg.symbol, exitAction, currentLeg.quantity, 'SUCCESS', `Live Indicator Exit. P&L: ₹${finalPnl.toFixed(2)}`, orderResponse.data.orderId);
//                                 }
//                             }
//                         }
//                         deployment.status = 'COMPLETED';
//                         deployment.exitRemarks = "Indicator Exit condition met";
//                         await deployment.save();

//                         if (strategy.data?.advanceSettings?.exitAllOnSlTgt) {
//                             await handleExitAllOnSlTgt(strategy, deployment, broker, "Indicator Exit");
//                         }
//                     }
//                 }
//             }

//             // ==============================================================
//             // ⏰ 3. TIME-BASED AUTO SQUARE-OFF LOGIC (Fixed for Array)
//             // ==============================================================
//             if (squareOffTime && hasActiveLegs && !executionLocks.has(exitLockKey)) {
//                 const [currH, currM] = currentTime.split(':').map(Number);
//                 const currentMinutes = (currH * 60) + currM;

//                 const [sqH, sqM] = squareOffTime.split(':').map(Number);
//                 const squareOffMinutes = (sqH * 60) + sqM;

//                 if (currentMinutes >= squareOffMinutes) {
//                     executionLocks.add(exitLockKey);
//                     console.log(`⏰ TIME SQUARE-OFF TRIGGERED! Strategy: ${strategy.name}`);

//                     const broker = await Broker.findById(deployment.brokers[0]);
//                     if (broker && broker.engineOn) {
//                         for (let i = 0; i < deployment.executedLegs.length; i++) {
//                             let currentLeg = deployment.executedLegs[i];
//                             if (currentLeg.status !== 'ACTIVE') continue;

//                             const exitAction = currentLeg.action === 'BUY' ? 'SELL' : 'BUY';
                            
//                             // PAPER
//                             if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                                 await sleep(500); 
//                                 const exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, currentLeg.exchange, currentLeg.securityId) || 0;
                                
//                                 if (exitLtp > 0) {
//                                     const finalPnl = currentLeg.action === 'BUY' 
//                                         ? (exitLtp - currentLeg.entryPrice) * currentLeg.quantity 
//                                         : (currentLeg.entryPrice - exitLtp) * currentLeg.quantity;

//                                     currentLeg.exitPrice = exitLtp;
//                                     currentLeg.livePnl = finalPnl;
//                                     currentLeg.status = 'COMPLETED';
//                                     currentLeg.exitReason = "Time Auto Square-Off";
                                    
//                                     deployment.pnl = (deployment.pnl || 0) + finalPnl;
//                                     deployment.realizedPnl = (deployment.realizedPnl || 0) + finalPnl;

//                                     await createAndEmitLog(broker, currentLeg.symbol, exitAction, currentLeg.quantity, 'SUCCESS', `Paper Auto-Exit (Time). P&L: ₹${finalPnl.toFixed(2)}`);
//                                 }
//                             } 
//                             // LIVE
//                             else if (deployment.executionType === 'LIVE') {
//                                 const orderData = { action: exitAction, quantity: currentLeg.quantity, securityId: currentLeg.securityId, segment: currentLeg.exchange };
//                                 const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                                
//                                 if (orderResponse.success) {
//                                     currentLeg.status = 'COMPLETED'; // Will sync properly with Webhook
//                                     currentLeg.exitReason = "Time Auto Square-Off";
//                                     await createAndEmitLog(broker, currentLeg.symbol, exitAction, currentLeg.quantity, 'INFO', `Live Time Auto Square-Off order placed.`);
//                                 }
//                             }
//                         }
//                         deployment.status = 'COMPLETED';
//                         deployment.exitRemarks = "Time Auto Square-Off";
//                         await deployment.save();
//                     }
//                 }
//             }

//             // ==============================================================
//             // 💰 4. RISK MANAGEMENT & ADVANCE FEATURES DELEGATION 
//             // ==============================================================
//             if (hasActiveLegs && (deployment.status === 'ACTIVE' || deployment.status === 'PARTIALLY_COMPLETED') && !executionLocks.has(exitLockKey)) {
                
//                 await handleMtmSquareOff(deployment, strategy, executionLocks, exitLockKey);

//                 const broker = await Broker.findById(deployment.brokers[0]); 
//                 if (broker) {
                    
//                     // Loop through each Executed Leg
//                     for (let i = 0; i < deployment.executedLegs.length; i++) {
//                         let currentLeg = deployment.executedLegs[i];
                        
//                         if (currentLeg.status !== 'ACTIVE') continue; 

//                         await sleep(1000); 
//                         const liveLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, currentLeg.exchange, currentLeg.securityId);
                        
//                         if (liveLtp && liveLtp > 0) {
                            
//                             let isSlHit = false;
//                             let isTpHit = false;
//                             let exitReason = "";

//                             const legConfig = strategy.data.legs.find(l => 
//                                 (l.action || "BUY").toUpperCase() === currentLeg.action && 
//                                 currentLeg.symbol.includes(l.optionType === "Call" ? "CE" : "PE")
//                             ) || strategy.data.legs[0];

//                             if (legConfig) {
//                                 const slType = legConfig.slType || "SL pt";
//                                 const slVal = Number(legConfig.slValue || legConfig.sl || 0);
//                                 const tpType = legConfig.tpType || "TP pt";
//                                 const tpVal = Number(legConfig.tpValue || legConfig.tp || 0);

//                                 let pnlInPoints = currentLeg.action === 'BUY' 
//                                     ? (liveLtp - currentLeg.entryPrice) 
//                                     : (currentLeg.entryPrice - liveLtp);
                                    
//                                 let pnlInPercentage = (pnlInPoints / currentLeg.entryPrice) * 100;

//                                 // 🚨 CHECK STOPLOSS (SL)
//                                 if (slVal > 0) {
//                                     if (slType.includes("%") && pnlInPercentage <= -slVal) {
//                                         isSlHit = true; exitReason = `StopLoss Hit (${slVal}%)`;
//                                     } else if (!slType.includes("%") && pnlInPoints <= -slVal) {
//                                         isSlHit = true; exitReason = `StopLoss Hit (${slVal} pts)`;
//                                     }
//                                 }

//                                 // 🎯 CHECK TARGET (TP)
//                                 if (tpVal > 0 && !isSlHit) {
//                                     if (tpType.includes("%") && pnlInPercentage >= tpVal) {
//                                         isTpHit = true; exitReason = `Target Hit (${tpVal}%)`;
//                                     } else if (!tpType.includes("%") && pnlInPoints >= tpVal) {
//                                         isTpHit = true; exitReason = `Target Hit (${tpVal} pts)`;
//                                     }
//                                 }
//                             }

//                             // ⚡ SQUARE-OFF
//                             if (isSlHit || isTpHit) {
//                                 executionLocks.add(exitLockKey);
//                                 const exitAction = currentLeg.action === 'BUY' ? 'SELL' : 'BUY';
//                                 console.log(`🎯 LEG EXIT TRIGGERED: ${exitReason} for ${currentLeg.symbol}`);

//                                 const finalPnl = currentLeg.action === 'BUY' 
//                                     ? (liveLtp - currentLeg.entryPrice) * currentLeg.quantity 
//                                     : (currentLeg.entryPrice - liveLtp) * currentLeg.quantity;

//                                 currentLeg.exitPrice = liveLtp;
//                                 currentLeg.livePnl = finalPnl;
//                                 currentLeg.status = 'COMPLETED';
//                                 currentLeg.exitReason = exitReason;

//                                 deployment.pnl = (deployment.pnl || 0) + finalPnl;
//                                 deployment.realizedPnl = (deployment.realizedPnl || 0) + finalPnl;
                                
//                                 const allCompleted = deployment.executedLegs.every(l => l.status === 'COMPLETED');
//                                 deployment.status = allCompleted ? 'COMPLETED' : 'PARTIALLY_COMPLETED';

//                                 await deployment.save();

//                                 // PAPER / LIVE Log Execution
//                                 if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                                     await createAndEmitLog(broker, currentLeg.symbol, exitAction, currentLeg.quantity, 'SUCCESS', `Auto-Exit: ${exitReason}. P&L: ₹${finalPnl.toFixed(2)}`);
//                                 } else if (deployment.executionType === 'LIVE') {
//                                     const orderData = { action: exitAction, quantity: currentLeg.quantity, securityId: currentLeg.securityId, segment: currentLeg.exchange };
//                                     const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
//                                     if (orderResponse.success) {
//                                         await createAndEmitLog(broker, currentLeg.symbol, exitAction, currentLeg.quantity, 'SUCCESS', `Live Auto-Exit: ${exitReason}. P&L: ₹${finalPnl.toFixed(2)}`, orderResponse.data.orderId);
//                                     }
//                                 }

//                                 // 🚀 ADVANCE FEATURES
//                                 if (!allCompleted && strategy.data?.advanceSettings?.moveSLToCost) {
//                                     await handleMoveSlToCost(strategy, deployment, broker);
//                                 }
//                                 if (strategy.data?.advanceSettings?.exitAllOnSlTgt) {
//                                     await handleExitAllOnSlTgt(strategy, deployment, broker, exitReason);
//                                 }

//                             } else {
//                                 // Live PnL UI Update
//                                 currentLeg.livePnl = currentLeg.action === 'BUY' 
//                                     ? (liveLtp - currentLeg.entryPrice) * currentLeg.quantity 
//                                     : (currentLeg.entryPrice - liveLtp) * currentLeg.quantity;
//                                 await deployment.save();
                                
//                                 // Note: Trailing logic can be called here if needed for the current leg
//                                 // await processTrailingLogic(deployment, strategy, liveLtp, broker);
//                             }
//                         }
//                     }
//                 }
//             }
//         }
//     } catch (error) { 
//         console.error("❌ Trading Engine Core Error:", error); 
//     } finally {
//         isEngineRunning = false; 
//     }
// });



// ==========================================
// 🌟 MAIN TRADING ENGINE (THE MANAGER) 🌟
// ==========================================
const cron = require('node-cron');
const moment = require('moment-timezone');

// 📂 Models
const Deployment = require('../models/Deployment.js');
const Broker = require('../models/Broker.js');

// 🛠️ Utilities & APIs 
const { sleep, getStrikeStep, getOptionSecurityId } = require('../services/instrumentService.js');
const { placeDhanOrder, fetchLiveLTP } = require('../services/dhanService.js');
const { fetchLivePrice } = require('./utils/priceFetcher.js');
const { createAndEmitLog } = require('./utils/logger.js'); 

// 🔍 Scanners
const { findStrikeByLivePremium } = require('./scanners/optionChainScanner.js');
const { getIndicatorSignal, getIndicatorExitSignal } = require('./scanners/indicatorScanner.js');  

// 🛡️ Risk Management
const { handleMtmSquareOff } = require('./features/riskManagement/mtmSquareOff.js');
const { processTrailingLogic } = require('./features/riskManagement/trailingLogic.js');

// 🚀 ADVANCE FEATURES
const { handleMoveSlToCost } = require('./features/advanceFeatures/moveSlToCost.js');
const { handlePrePunchSl } = require('./features/advanceFeatures/prePunchSl.js');
const { handleExitAllOnSlTgt } = require('./features/advanceFeatures/exitAllOnSlTgt.js');
const { processWaitAndTrade } = require('./features/advanceFeatures/waitAndTrade.js');

// Global execution locks
const executionLocks = new Set();
let isEngineRunning = false; 

// ==========================================
// ⚙️ THE CORE CRON JOB LOOP (Runs every 30s)
// ==========================================
cron.schedule('*/30 * * * * *', async () => {
    
    if (isEngineRunning) {
        console.log("⏳ Engine is taking time, skipping overlapping tick...");
        return; 
    }
    
    isEngineRunning = true; 

    try {
        const currentTime = moment().tz("Asia/Kolkata").format("HH:mm");
        const activeDeployments = await Deployment.find({ 
            status: { $in: ['ACTIVE', 'PARTIALLY_COMPLETED'] } // 🔥 FIX: Both active states
        }).populate('strategyId');

        if (activeDeployments.length === 0) return;

        if (currentTime === "00:00" && executionLocks.size > 0) executionLocks.clear();

        for (const deployment of activeDeployments) {
            await sleep(1000);

            const strategy = deployment.strategyId;
            if (!strategy) continue;

            const config = strategy.data?.config || {};
            const entryLockKey = `ENTRY_${deployment._id.toString()}_${currentTime}`;
            const exitLockKey = `EXIT_${deployment._id.toString()}_${currentTime}`;
            const squareOffTime = deployment.squareOffTime || config.squareOffTime;

            // 🛑 THE SHIELD: STRICT SYMBOL VALIDATION 
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
            else continue; 

            // 🔥 HELPERS
            const hasLegs = deployment.executedLegs && deployment.executedLegs.length > 0;
            const hasActiveLegs = hasLegs && deployment.executedLegs.some(l => l.status === 'ACTIVE');

            // ==============================================================
            // ⚡ 1. ENTRY LOGIC (Fixed to use executedLegs array)
            // ==============================================================
            if (!executionLocks.has(entryLockKey) && !hasLegs) {
                let shouldEnter = false;
                let currentSignalType = "NONE";
                const strategyType = strategy.type || "Time Based"; 

                if (strategyType === "Indicator Based") {
                    const broker = await Broker.findById(deployment.brokers[0]);
                    if (broker && broker.engineOn) {
                        const signal = await getIndicatorSignal(strategy, broker, baseSymbol);
                        if (signal.long) { shouldEnter = true; currentSignalType = "LONG"; } 
                        else if (signal.short) { shouldEnter = true; currentSignalType = "SHORT"; }
                    }
                } 
                else {
                    if (config.startTime === currentTime) { shouldEnter = true; currentSignalType = "TIME"; }
                }

                if (shouldEnter) {
                    executionLocks.add(entryLockKey);
                    const isPrePunchSL = strategy.data?.advanceSettings?.prePunchSL || false;

                    for (const brokerId of deployment.brokers) {
                        const broker = await Broker.findById(brokerId);
                        if (broker && broker.engineOn) {
                            
                            for (const leg of strategy.data.legs) {
                                let tradeAction = (leg.action || "BUY").toUpperCase(); 
                                let tradeQty = (leg.quantity || 1) * deployment.multiplier;

                                let optType = leg.optionType === "Call" ? "CE" : "PE"; 
                                if (currentSignalType === "LONG") optType = (tradeAction === "BUY") ? "CE" : "PE"; 
                                else if (currentSignalType === "SHORT") optType = (tradeAction === "BUY") ? "PE" : "CE"; 

                                let currentSpotPrice = await fetchLivePrice(baseSymbol);
                                if (!currentSpotPrice) continue;

                                const strikeCriteria = leg.strikeCriteria || "ATM pt";
                                let instrument = null;
                                let preFetchedLtp = null; 

                                if (["CP", "CP >=", "CP <=", "Delta"].includes(strikeCriteria)) {
                                    instrument = await findStrikeByLivePremium(baseSymbol, currentSpotPrice, optType, leg.expiry || "WEEKLY", strikeCriteria, leg.strikeType || "ATM", broker);
                                    if (instrument && instrument.ltp) preFetchedLtp = instrument.ltp;
                                } else {
                                    instrument = getOptionSecurityId(baseSymbol, currentSpotPrice, strikeCriteria, leg.strikeType || "ATM", optType, leg.expiry || "WEEKLY");
                                }
                                
                                if (!instrument) continue;

                                // 🔥 THE WAIT & TRADE INJECTION
                                await sleep(500); 
                                const currentPremiumLtp = preFetchedLtp || await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id) || currentSpotPrice;

                                const isWaitAndTradeActive = strategy.data?.advanceSettings?.waitAndTrade;
                                const waitAndTradeConfig = strategy.data?.advanceSettings?.waitAndTradeConfig || {};

                                if (isWaitAndTradeActive && waitAndTradeConfig.movement > 0) {
                                    if (!deployment.waitReferencePrice) {
                                        deployment.waitReferencePrice = currentPremiumLtp; 
                                        await deployment.save();
                                        console.log(`⏳ [WAIT & TRADE] Ref Price: ₹${currentPremiumLtp}. Waiting for movement...`);
                                        await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'INFO', `Wait & Trade Activated. Ref Premium: ₹${currentPremiumLtp}`);
                                        continue; 
                                    } else {
                                        const waitStatus = processWaitAndTrade(waitAndTradeConfig, currentPremiumLtp, deployment.waitReferencePrice);
                                        if (!waitStatus.shouldExecute) {
                                            continue; 
                                        } else {
                                            console.log(`🎯 [WAIT & TRADE] Target Hit! Executing Trade...`);
                                        }
                                    }
                                }

                                // 🟢 PAPER TRADE ENTRY
                                if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
                                    await sleep(500); 
                                    let entryPrice = preFetchedLtp || await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id);
                                    
                                    if (!entryPrice || entryPrice <= 0) {
                                        console.log(`⚠️ LTP not found. Skipping...`);
                                        continue; 
                                    }
                                    
                                    let paperSl = 0;
                                    if (isPrePunchSL && entryPrice > 0 && leg.slValue > 0) {
                                        paperSl = tradeAction === "BUY" 
                                            ? (leg.slType === 'SL%' ? entryPrice - (entryPrice * (Number(leg.slValue)/100)) : entryPrice - Number(leg.slValue))
                                            : (leg.slType === 'SL%' ? entryPrice + (entryPrice * (Number(leg.slValue)/100)) : entryPrice + Number(leg.slValue));
                                    }

                                    // 🔥 PUSH TO ARRAY
                                    deployment.executedLegs.push({
                                        securityId: instrument.id,
                                        exchange: instrument.exchange,
                                        symbol: instrument.tradingSymbol,
                                        action: tradeAction,
                                        quantity: tradeQty,
                                        entryPrice: entryPrice,
                                        paperSlPrice: paperSl,
                                        status: 'ACTIVE'
                                    });

                                    await deployment.save();
                                    await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Paper Entry at ₹${entryPrice}`);
                                }
                                
                                // 🔴 LIVE TRADE ENTRY
                                else if (deployment.executionType === 'LIVE') {
                                    const orderData = { action: tradeAction, quantity: tradeQty, securityId: instrument.id, segment: instrument.exchange };
                                    const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

                                    if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
                                        await sleep(2000); 
                                        const entryPrice = await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id) || 0;

                                        // 🔥 PUSH TO ARRAY
                                        deployment.executedLegs.push({
                                            securityId: instrument.id,
                                            exchange: instrument.exchange,
                                            symbol: instrument.tradingSymbol,
                                            action: tradeAction,
                                            quantity: tradeQty,
                                            entryPrice: entryPrice,
                                            status: 'ACTIVE'
                                        });

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
            // 📉 2.5 INDICATOR BASED EXIT LOGIC (Fixed for Array)
            // ==============================================================
            if (!executionLocks.has(exitLockKey) && hasActiveLegs && strategy.type === "Indicator Based") {
                const broker = await Broker.findById(deployment.brokers[0]);
                if (broker && broker.engineOn) {
                    // Check signal (you might need to update your scanner if it relied on single leg data)
                    const shouldExit = await getIndicatorExitSignal(strategy, broker, baseSymbol, deployment.signalType || "NONE");
                    
                    if (shouldExit) {
                        executionLocks.add(exitLockKey);
                        console.log(`📉 INDICATOR EXIT TRIGGERED! Strategy: ${strategy.name}`);

                        for (let i = 0; i < deployment.executedLegs.length; i++) {
                            let currentLeg = deployment.executedLegs[i];
                            if (currentLeg.status !== 'ACTIVE') continue;

                            const exitAction = currentLeg.action === 'BUY' ? 'SELL' : 'BUY';
                            await sleep(500);
                            
                            // PAPER
                            if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
                                const exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, currentLeg.exchange, currentLeg.securityId) || 0;
                                if (exitLtp > 0) {
                                    const finalPnl = currentLeg.action === 'BUY' 
                                        ? (exitLtp - currentLeg.entryPrice) * currentLeg.quantity 
                                        : (currentLeg.entryPrice - exitLtp) * currentLeg.quantity;

                                    currentLeg.exitPrice = exitLtp;
                                    currentLeg.livePnl = finalPnl;
                                    currentLeg.status = 'COMPLETED';
                                    currentLeg.exitReason = "Indicator Exit";
                                    
                                    deployment.pnl = (deployment.pnl || 0) + finalPnl;
                                    deployment.realizedPnl = (deployment.realizedPnl || 0) + finalPnl;

                                    await createAndEmitLog(broker, currentLeg.symbol, exitAction, currentLeg.quantity, 'SUCCESS', `Paper Indicator Exit. P&L: ₹${finalPnl.toFixed(2)}`);
                                }
                            } 
                            // LIVE
                            else if (deployment.executionType === 'LIVE') {
                                const orderData = { action: exitAction, quantity: currentLeg.quantity, securityId: currentLeg.securityId, segment: currentLeg.exchange };
                                const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                                
                                if (orderResponse.success) {
                                    await sleep(2000); 
                                    const exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, currentLeg.exchange, currentLeg.securityId) || 0;
                                    const finalPnl = currentLeg.action === 'BUY' 
                                        ? (exitLtp - currentLeg.entryPrice) * currentLeg.quantity 
                                        : (currentLeg.entryPrice - exitLtp) * currentLeg.quantity;

                                    currentLeg.exitPrice = exitLtp;
                                    currentLeg.livePnl = finalPnl;
                                    currentLeg.status = 'COMPLETED';
                                    currentLeg.exitReason = "Indicator Exit";
                                    
                                    deployment.pnl = (deployment.pnl || 0) + finalPnl;
                                    deployment.realizedPnl = (deployment.realizedPnl || 0) + finalPnl;

                                    await createAndEmitLog(broker, currentLeg.symbol, exitAction, currentLeg.quantity, 'SUCCESS', `Live Indicator Exit. P&L: ₹${finalPnl.toFixed(2)}`, orderResponse.data.orderId);
                                }
                            }
                        }
                        deployment.status = 'COMPLETED';
                        deployment.exitRemarks = "Indicator Exit condition met";
                        await deployment.save();

                        if (strategy.data?.advanceSettings?.exitAllOnSlTgt) {
                            await handleExitAllOnSlTgt(strategy, deployment, broker, "Indicator Exit");
                        }
                    }
                }
            }

            // ==============================================================
            // ⏰ 3. TIME-BASED AUTO SQUARE-OFF LOGIC (Fixed for Array)
            // ==============================================================
            if (squareOffTime && hasActiveLegs && !executionLocks.has(exitLockKey)) {
                const [currH, currM] = currentTime.split(':').map(Number);
                const currentMinutes = (currH * 60) + currM;

                const [sqH, sqM] = squareOffTime.split(':').map(Number);
                const squareOffMinutes = (sqH * 60) + sqM;

                if (currentMinutes >= squareOffMinutes) {
                    executionLocks.add(exitLockKey);
                    console.log(`⏰ TIME SQUARE-OFF TRIGGERED! Strategy: ${strategy.name}`);

                    const broker = await Broker.findById(deployment.brokers[0]);
                    if (broker && broker.engineOn) {
                        for (let i = 0; i < deployment.executedLegs.length; i++) {
                            let currentLeg = deployment.executedLegs[i];
                            if (currentLeg.status !== 'ACTIVE') continue;

                            const exitAction = currentLeg.action === 'BUY' ? 'SELL' : 'BUY';
                            
                            // PAPER
                            if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
                                await sleep(500); 
                                const exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, currentLeg.exchange, currentLeg.securityId) || 0;
                                
                                if (exitLtp > 0) {
                                    const finalPnl = currentLeg.action === 'BUY' 
                                        ? (exitLtp - currentLeg.entryPrice) * currentLeg.quantity 
                                        : (currentLeg.entryPrice - exitLtp) * currentLeg.quantity;

                                    currentLeg.exitPrice = exitLtp;
                                    currentLeg.livePnl = finalPnl;
                                    currentLeg.status = 'COMPLETED';
                                    currentLeg.exitReason = "Time Auto Square-Off";
                                    
                                    deployment.pnl = (deployment.pnl || 0) + finalPnl;
                                    deployment.realizedPnl = (deployment.realizedPnl || 0) + finalPnl;

                                    await createAndEmitLog(broker, currentLeg.symbol, exitAction, currentLeg.quantity, 'SUCCESS', `Paper Auto-Exit (Time). P&L: ₹${finalPnl.toFixed(2)}`);
                                }
                            } 
                            // LIVE
                            else if (deployment.executionType === 'LIVE') {
                                const orderData = { action: exitAction, quantity: currentLeg.quantity, securityId: currentLeg.securityId, segment: currentLeg.exchange };
                                const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                                
                                if (orderResponse.success) {
                                    currentLeg.status = 'COMPLETED'; // Will sync properly with Webhook
                                    currentLeg.exitReason = "Time Auto Square-Off";
                                    await createAndEmitLog(broker, currentLeg.symbol, exitAction, currentLeg.quantity, 'INFO', `Live Time Auto Square-Off order placed.`);
                                }
                            }
                        }
                        deployment.status = 'COMPLETED';
                        deployment.exitRemarks = "Time Auto Square-Off";
                        await deployment.save();
                    }
                }
            }

            // ==============================================================
            // 💰 4. RISK MANAGEMENT & ADVANCE FEATURES DELEGATION 
            // ==============================================================
            if (hasActiveLegs && (deployment.status === 'ACTIVE' || deployment.status === 'PARTIALLY_COMPLETED') && !executionLocks.has(exitLockKey)) {
                
                await handleMtmSquareOff(deployment, strategy, executionLocks, exitLockKey);

                const broker = await Broker.findById(deployment.brokers[0]); 
                if (broker) {
                    
                    // Loop through each Executed Leg
                    for (let i = 0; i < deployment.executedLegs.length; i++) {
                        let currentLeg = deployment.executedLegs[i];
                        
                        if (currentLeg.status !== 'ACTIVE') continue; 

                        await sleep(1000); 
                        const liveLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, currentLeg.exchange, currentLeg.securityId);
                        
                        if (liveLtp && liveLtp > 0) {
                            
                            let isSlHit = false;
                            let isTpHit = false;
                            let exitReason = "";

                            const legConfig = strategy.data.legs.find(l => 
                                (l.action || "BUY").toUpperCase() === currentLeg.action && 
                                currentLeg.symbol.includes(l.optionType === "Call" ? "CE" : "PE")
                            ) || strategy.data.legs[0];

                            if (legConfig) {
                                const slType = legConfig.slType || "SL pt";
                                const slVal = Number(legConfig.slValue || legConfig.sl || 0);
                                const tpType = legConfig.tpType || "TP pt";
                                const tpVal = Number(legConfig.tpValue || legConfig.tp || 0);

                                let pnlInPoints = currentLeg.action === 'BUY' 
                                    ? (liveLtp - currentLeg.entryPrice) 
                                    : (currentLeg.entryPrice - liveLtp);
                                    
                                let pnlInPercentage = (pnlInPoints / currentLeg.entryPrice) * 100;

                                // 🚨 CHECK STOPLOSS (SL)
                                if (slVal > 0) {
                                    if (slType.includes("%") && pnlInPercentage <= -slVal) {
                                        isSlHit = true; exitReason = `StopLoss Hit (${slVal}%)`;
                                    } else if (!slType.includes("%") && pnlInPoints <= -slVal) {
                                        isSlHit = true; exitReason = `StopLoss Hit (${slVal} pts)`;
                                    }
                                }

                                // 🎯 CHECK TARGET (TP)
                                if (tpVal > 0 && !isSlHit) {
                                    if (tpType.includes("%") && pnlInPercentage >= tpVal) {
                                        isTpHit = true; exitReason = `Target Hit (${tpVal}%)`;
                                    } else if (!tpType.includes("%") && pnlInPoints >= tpVal) {
                                        isTpHit = true; exitReason = `Target Hit (${tpVal} pts)`;
                                    }
                                }
                            }

                            // ⚡ SQUARE-OFF
                            if (isSlHit || isTpHit) {
                                executionLocks.add(exitLockKey);
                                const exitAction = currentLeg.action === 'BUY' ? 'SELL' : 'BUY';
                                console.log(`🎯 LEG EXIT TRIGGERED: ${exitReason} for ${currentLeg.symbol}`);

                                const finalPnl = currentLeg.action === 'BUY' 
                                    ? (liveLtp - currentLeg.entryPrice) * currentLeg.quantity 
                                    : (currentLeg.entryPrice - liveLtp) * currentLeg.quantity;

                                currentLeg.exitPrice = liveLtp;
                                currentLeg.livePnl = finalPnl;
                                currentLeg.status = 'COMPLETED';
                                currentLeg.exitReason = exitReason;

                                deployment.pnl = (deployment.pnl || 0) + finalPnl;
                                deployment.realizedPnl = (deployment.realizedPnl || 0) + finalPnl;
                                
                                const allCompleted = deployment.executedLegs.every(l => l.status === 'COMPLETED');
                                deployment.status = allCompleted ? 'COMPLETED' : 'PARTIALLY_COMPLETED';

                                await deployment.save();

                                // PAPER / LIVE Log Execution
                                if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
                                    await createAndEmitLog(broker, currentLeg.symbol, exitAction, currentLeg.quantity, 'SUCCESS', `Auto-Exit: ${exitReason}. P&L: ₹${finalPnl.toFixed(2)}`);
                                } else if (deployment.executionType === 'LIVE') {
                                    const orderData = { action: exitAction, quantity: currentLeg.quantity, securityId: currentLeg.securityId, segment: currentLeg.exchange };
                                    const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                                    if (orderResponse.success) {
                                        await createAndEmitLog(broker, currentLeg.symbol, exitAction, currentLeg.quantity, 'SUCCESS', `Live Auto-Exit: ${exitReason}. P&L: ₹${finalPnl.toFixed(2)}`, orderResponse.data.orderId);
                                    }
                                }

                                // 🚀 ADVANCE FEATURES
                                if (!allCompleted && strategy.data?.advanceSettings?.moveSLToCost) {
                                    await handleMoveSlToCost(strategy, deployment, broker);
                                }
                                if (strategy.data?.advanceSettings?.exitAllOnSlTgt) {
                                    await handleExitAllOnSlTgt(strategy, deployment, broker, exitReason);
                                }

                            } else {
                                // Live PnL UI Update
                                currentLeg.livePnl = currentLeg.action === 'BUY' 
                                    ? (liveLtp - currentLeg.entryPrice) * currentLeg.quantity 
                                    : (currentLeg.entryPrice - liveLtp) * currentLeg.quantity;
                                await deployment.save();
                                
                                // Note: Trailing logic can be called here if needed for the current leg
                                // await processTrailingLogic(deployment, strategy, liveLtp, broker);
                            }
                        }
                    }
                }
            }
        }
    } catch (error) { 
        console.error("❌ Trading Engine Core Error:", error); 
    } finally {
        isEngineRunning = false; 
    }
});

