

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
// const { checkPremiumDifference } = require('./features/advanceFeatures/premiumDifference.js');
// const { calculateTrailedSL } = require('./features/advanceFeatures/trailSL.js');

// // 🔥 THE FIX: Bring the Re-Entry Doctor to the Live Hospital
// const { evaluateReEntryLogic } = require('./features/advanceFeatures/reEntryLogic.js');


// const { identifySwings, checkPriceActionSignal } = require('./scanners/priceActionScanner.js');
// const { fetchCandleData } = require('../services/candleService.js');

// // Global execution locks
// const executionLocks = new Set();
// let isEngineRunning = false;
// let liveHospitalMap = new Map();
// let liveSniperMap = new Map(); // 🧠 स्नाइपर इंजन की याददाश्त के लिए नया मैप

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
//             // 🏥 0. LIVE HOSPITAL CHECK (RE-ENTRY LOGIC)
//             // ==============================================================
//             if (strategy.data?.advanceSettings?.reEntryExecute && liveHospitalMap.has(deployment._id.toString())) {
//                 let hospitalQueue = liveHospitalMap.get(deployment._id.toString()) || [];
//                 if (hospitalQueue.length > 0) {
//                     let stillPending = [];
//                     const broker = await Broker.findById(deployment.brokers[0]);

//                     if (broker && broker.engineOn) {
//                         for (let pTrade of hospitalQueue) {
//                             await sleep(500);
//                             const liveLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, pTrade.exchange, pTrade.securityId);
//                             if (!liveLtp) { stillPending.push(pTrade); continue; }

//                             const fakePending = {
//                                 reEntryConfig: pTrade.reEntryConfig,
//                                 originalEntryPrice: pTrade.originalEntryPrice,
//                                 transaction: pTrade.action,
//                                 premiumChart: null // Live me hum Spot candle/LTP use karte hain
//                             };

//                             // IST Date banayein
//                             const istDate = new Date(new Date().getTime() + (5.5 * 3600000));
//                             const reviveStatus = evaluateReEntryLogic(fakePending, istDate, liveLtp);

//                             if (reviveStatus.shouldRevive) {
//                                 console.log(`⚡ [LIVE RE-ENTRY] Reviving leg: ${pTrade.symbol} at ₹${liveLtp} | Cycle: ${pTrade.reEntryCycle}`);

//                                 let entryPrice = liveLtp;
//                                 let apiSuccess = true;

//                                 if (deployment.executionType === 'LIVE') {
//                                     const orderData = { action: pTrade.action, quantity: pTrade.quantity, securityId: pTrade.securityId, segment: pTrade.exchange };
//                                     const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
//                                     if (orderResponse.success) {
//                                         await sleep(2000);
//                                         entryPrice = await fetchLiveLTP(broker.clientId, broker.apiSecret, pTrade.exchange, pTrade.securityId) || liveLtp;
//                                         await createAndEmitLog(broker, pTrade.symbol, pTrade.action, pTrade.quantity, 'SUCCESS', `Live Re-Entry Executed at ₹${entryPrice}`, orderResponse.data.orderId);
//                                     } else {
//                                         apiSuccess = false;
//                                         await createAndEmitLog(broker, pTrade.symbol, pTrade.action, pTrade.quantity, 'FAILED', `Re-Entry Failed: ${orderResponse.data?.remarks}`);
//                                     }
//                                 } else {
//                                     await createAndEmitLog(broker, pTrade.symbol, pTrade.action, pTrade.quantity, 'SUCCESS', `Paper Re-Entry Executed at ₹${entryPrice}`);
//                                 }

//                                 if (apiSuccess) {
//                                     deployment.executedLegs.push({
//                                         securityId: pTrade.securityId,
//                                         exchange: pTrade.exchange,
//                                         symbol: pTrade.symbol,
//                                         action: pTrade.action,
//                                         quantity: pTrade.quantity,
//                                         entryPrice: entryPrice,
//                                         paperSlPrice: 0,
//                                         status: 'ACTIVE',
//                                         currentTrailedSL: null,
//                                         reEntryCycle: pTrade.reEntryCycle,
//                                         entryReason: "Re-Entry" // 🔥 FRONTEND UI BADGE KE LIYE TAG
//                                     });
//                                     deployment.status = 'PARTIALLY_COMPLETED'; // Taaki engine ise chalata rahe
//                                     await deployment.save();
//                                 } else {
//                                     stillPending.push(pTrade);
//                                 }
//                             } else {
//                                 stillPending.push(pTrade);
//                             }
//                         }
//                     }
//                     liveHospitalMap.set(deployment._id.toString(), stillPending);
//                 }
//             }

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

//                 // 🔥 YAHAN LAGAO APNA NAYA PRICE ACTION ENTRY BLOCK 🔥
//                 else if (strategyType === "Price Action Based") {
//                     const broker = await Broker.findById(deployment.brokers[0]);
//                     if (broker && broker.engineOn) {
//                         // कैंडल्स फेच करो (resolution '1' for 1-min)
//                         const candles = await fetchCandleData(broker.clientId, broker.apiSecret, 'NSE', instrumentData.id, 'INDEX', '1', 1);
                        
//                         if (candles.length > 0) {

//                             // 2. स्विंग्स डिटेक्ट करो
//                             const swings = identifySwings(candles);

//                             // 3. अपना नया स्कैनर चलाओ
//                             // हमने strategy.data में जो priceActionSettings सेव किया था, उसे यहाँ यूज़ करेंगे
//                             const setupType = strategy.data?.priceActionSettings?.setupType || "BOS (Break of Structure)";
//                             const paSignal = checkPriceActionSignal(candles, swings, setupType);

//                             // 🔥 LOG GENERATOR: अब यह Reason भी साथ लाएगा
//                             if (paSignal.long || paSignal.short) {
//                                 const logReason = paSignal.reason || "Price Action Signal Triggered";
//                                 console.log(`🚀 [PRICE ACTION] ${logReason}`);
                                
//                                 // यह लॉग आपके वेब-डैशबोर्ड पर भी दिखेगा
//                                 await createAndEmitLog(broker, instrumentData.name, "SCANNER", 0, "INFO", logReason);
                                
//                                 if (paSignal.long) { shouldEnter = true; currentSignalType = "LONG"; }
//                                 else if (paSignal.short) { shouldEnter = true; currentSignalType = "SHORT"; }
//                             }
//                         }
//                     }
//                 }


//                 else {
//                     // 🔥 THE TIME POLLING FIX: '>=' logic taaki block hone par wapas check kare
//                     if (config.startTime) {
//                         const [currH, currM] = currentTime.split(':').map(Number);
//                         const currentMinutes = (currH * 60) + currM;

//                         let startMinutes = 0;
//                         const timeParts = config.startTime.split(' ');
//                         let [sh, sm] = timeParts[0].split(':').map(Number);
//                         const modifier = timeParts[1];

//                         if (modifier && modifier.toUpperCase() === 'PM' && sh !== 12) sh += 12;
//                         if (modifier && modifier.toUpperCase() === 'AM' && sh === 12) sh = 0;
//                         startMinutes = (sh * 60) + sm;

//                         // Agar time pass ho gaya hai aur abhi tak trade nahi laga (!hasLegs), toh try karo
//                         if (currentMinutes >= startMinutes) {
//                             shouldEnter = true;
//                             currentSignalType = "TIME";
//                         }
//                     }
//                 }

//                 if (shouldEnter) {
//                     executionLocks.add(entryLockKey);
//                     const isPrePunchSL = strategy.data?.advanceSettings?.prePunchSL || false;

//                     for (const brokerId of deployment.brokers) {
//                         const broker = await Broker.findById(brokerId);
//                         if (broker && broker.engineOn) {

//                             // ==============================================================
//                             // ⚖️ GATEKEEPER: PREMIUM DIFFERENCE CHECK
//                             // ==============================================================
//                             const advSettings = strategy.data?.advanceSettings || {};
//                             let passPremiumDiff = true;

//                             // Agar feature ON hai aur strategy mein kam se kam 2 legs hain
//                             if (advSettings.premiumDifference && strategy.data.legs.length >= 2) {
//                                 let currentSpotPrice = await fetchLivePrice(baseSymbol);

//                                 if (currentSpotPrice) {
//                                     let tempLtps = [];

//                                     // Pehle 2 legs ka dummy fetch karke price nikalte hain
//                                     for (let i = 0; i < 2; i++) {
//                                         const tempLeg = strategy.data.legs[i];
//                                         let tempAction = (tempLeg.action || "BUY").toUpperCase();
//                                         let tempOptType = tempLeg.optionType === "Call" ? "CE" : "PE";

//                                         if (currentSignalType === "LONG") tempOptType = (tempAction === "BUY") ? "CE" : "PE";
//                                         else if (currentSignalType === "SHORT") tempOptType = (tempAction === "BUY") ? "PE" : "CE";

//                                         let tempInstrument;
//                                         if (["CP", "CP >=", "CP <=", "Delta"].includes(tempLeg.strikeCriteria || "ATM pt")) {
//                                             tempInstrument = await findStrikeByLivePremium(baseSymbol, currentSpotPrice, tempOptType, tempLeg.expiry || "WEEKLY", tempLeg.strikeCriteria || "ATM pt", tempLeg.strikeType || "ATM", broker);
//                                         } else {
//                                             tempInstrument = getOptionSecurityId(baseSymbol, currentSpotPrice, tempLeg.strikeCriteria || "ATM pt", tempLeg.strikeType || "ATM", tempOptType, tempLeg.expiry || "WEEKLY");
//                                         }

//                                         if (tempInstrument) {
//                                             // Asli LTP mangao ya fallback use karo
//                                             const ltp = tempInstrument.ltp || await fetchLiveLTP(broker.clientId, broker.apiSecret, tempInstrument.exchange, tempInstrument.id) || currentSpotPrice;
//                                             tempLtps.push(ltp);
//                                         }
//                                     }

//                                     // Dono legs ke price mil gaye, ab difference check karo
//                                     if (tempLtps.length === 2) {
//                                         // UI se aane wali exact value (safest fallback ke sath)
//                                         const maxDiff = Number(advSettings.premiumDifferenceConfig?.premium || 100);

//                                         const diffStatus = checkPremiumDifference(true, maxDiff, tempLtps);
//                                         if (!diffStatus.isAllowed) {
//                                             console.log(`⚖️ [PREMIUM DIFF BLOCK] Time: ${currentTime} | ${diffStatus.reason}`);
//                                             passPremiumDiff = false;
//                                         }
//                                     }
//                                 }
//                             }

//                             // Agar difference limit se bahar hai, toh Entry abort kardo is tick ke liye
//                             if (!passPremiumDiff) {
//                                 executionLocks.delete(entryLockKey); // 🔥 LOCK UNLOCK KARNA ZAROORI HAI taki agle 30 sec me fir check ho
//                                 continue; // Agle broker ya next tick par jao
//                             }
//                             // ==============================================================

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
//                                         status: 'ACTIVE',
//                                         currentTrailedSL: null, // 🔥 SNIPER MEMORY
//                                         entryReason: deployment.waitReferencePrice ? "Wait & Trade" : (advSettings.premiumDifference ? "Premium Diff" : "Normal") // 🔥 FRONTEND TAG
//                                     });

//                                     await deployment.save();
//                                     // await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Paper Entry at ₹${entryPrice}`);

//                                     console.log(`📝 [PAPER TRADE] [Time: ${currentTime}] Entry Placed at ₹${entryPrice} | Pre-Punch SL calculated at ₹${paperSl}`);

//                                     await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Paper Entry at ₹${entryPrice} (SL set at ₹${paperSl})`);

//                                 }

//                                 // 🔴 LIVE TRADE ENTRY
//                                 else if (deployment.executionType === 'LIVE') {
//                                     const orderData = { action: tradeAction, quantity: tradeQty, securityId: instrument.id, segment: instrument.exchange };
//                                     const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

//                                     if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
//                                         await sleep(2000);
//                                         const entryPrice = await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id) || 0;

//                                         let liveSlPrice = 0;

//                                         // 🛡️ THE NEW FIX: PRE-PUNCH SL LOGIC FOR LIVE MARKET
//                                         if (isPrePunchSL && entryPrice > 0 && leg.slValue > 0) {
//                                             // SL Price Calculate karna
//                                             const slAmt = leg.slType === 'SL%' ? (entryPrice * (Number(leg.slValue)/100)) : Number(leg.slValue);
//                                             liveSlPrice = tradeAction === "BUY" ? entryPrice - slAmt : entryPrice + slAmt;
//                                             liveSlPrice = parseFloat(liveSlPrice.toFixed(2)); // Dhan ke liye 2 decimal zaroori hai

//                                             // SL hamesha Entry ka opposite hota hai
//                                             const slAction = tradeAction === "BUY" ? "SELL" : "BUY";

//                                             console.log(`🛡️ [PRE-PUNCH] Placing SL Order at ₹${liveSlPrice} for ${instrument.tradingSymbol}`);

//                                             const slOrderData = {
//                                                 action: slAction,
//                                                 quantity: tradeQty,
//                                                 securityId: instrument.id,
//                                                 segment: instrument.exchange,
//                                                 orderType: "STOP_LOSS_MARKET", // 🔥 Dhan ko batana ki ye SL hai
//                                                 triggerPrice: liveSlPrice      // 🔥 Trigger Price set karna
//                                             };

//                                             // Dhan par SL Pending order bhejna
//                                             const slOrderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, slOrderData);

//                                             if(slOrderResponse.success) {
//                                                 await createAndEmitLog(broker, instrument.tradingSymbol, slAction, tradeQty, 'INFO', `Pre-Punch SL Placed successfully at ₹${liveSlPrice}`);
//                                             } else {
//                                                 await createAndEmitLog(broker, instrument.tradingSymbol, slAction, tradeQty, 'FAILED', `Pre-Punch SL Failed: ${slOrderResponse.data?.remarks || "Unknown Error"}`);
//                                             }
//                                         }

//                                         // 🔥 PUSH TO ARRAY
//                                         deployment.executedLegs.push({
//                                             securityId: instrument.id,
//                                             exchange: instrument.exchange,
//                                             symbol: instrument.tradingSymbol,
//                                             action: tradeAction,
//                                             quantity: tradeQty,
//                                             entryPrice: entryPrice,
//                                             paperSlPrice: liveSlPrice > 0 ? liveSlPrice : 0, // SL record karna
//                                             status: 'ACTIVE',
//                                             currentTrailedSL: null, // 🔥 SNIPER MEMORY
//                                             entryReason: deployment.waitReferencePrice ? "Wait & Trade" : (advSettings.premiumDifference ? "Premium Diff" : "Normal") // 🔥 FRONTEND TAG
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

//                             // 🔥 THE FIX: Extract advSettings safely at the top so ALL blocks can use it
//                             const advSettings = strategy.data?.advanceSettings || deployment.advanceSettings || {};

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

//                                 // ==============================================================
//                                 // 🎯 ADVANCE FEATURE: TRAIL SL (Live Sniper Guard)
//                                 // ==============================================================
//                                 let initialSlPrice = 0;
//                                 if (slVal > 0) {
//                                     const slAmt = slType.includes("%") ? (currentLeg.entryPrice * slVal / 100) : slVal;
//                                     initialSlPrice = currentLeg.action === 'BUY' ? currentLeg.entryPrice - slAmt : currentLeg.entryPrice + slAmt;
//                                 }

//                                 // (Yahan se const advSettings = ... hata diya gaya hai)
//                                 if (advSettings.trailSL && initialSlPrice > 0) {
//                                     const newTrailedSL = calculateTrailedSL(
//                                         currentLeg.action,
//                                         currentLeg.entryPrice,
//                                         initialSlPrice,
//                                         liveLtp,
//                                         advSettings.trailSLConfig || {},
//                                         currentLeg.currentTrailedSL || null
//                                     );

//                                     if (newTrailedSL !== currentLeg.currentTrailedSL && newTrailedSL !== initialSlPrice) {
//                                         currentLeg.currentTrailedSL = newTrailedSL;
//                                         await deployment.save();
//                                         console.log(`🎯 [LIVE SNIPER] Trailed SL updated to ₹${newTrailedSL.toFixed(2)} for ${currentLeg.symbol}`);
//                                     }
//                                 }

//                                 let activeSlPrice = currentLeg.currentTrailedSL || initialSlPrice;

//                                 // 🚨 CHECK STOPLOSS (SL)
//                                 if (activeSlPrice > 0) {
//                                     if (currentLeg.action === 'BUY' && liveLtp <= activeSlPrice) {
//                                         isSlHit = true;
//                                         exitReason = currentLeg.currentTrailedSL ? "LEG_TRAIL_SL" : `StopLoss Hit`;
//                                     } else if (currentLeg.action === 'SELL' && liveLtp >= activeSlPrice) {
//                                         isSlHit = true;
//                                         exitReason = currentLeg.currentTrailedSL ? "LEG_TRAIL_SL" : `StopLoss Hit`;
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

//                                 // =========================================================
//                                 // 🚑 SEND DEAD LEGS TO LIVE HOSPITAL
//                                 // =========================================================
//                                 const reConfig = advSettings.reEntryExecuteConfig || {};

//                                 if (advSettings.reEntryExecute && ["StopLoss Hit", "LEG_TRAIL_SL", "SL_MOVED_TO_COST"].includes(exitReason)) {
//                                     const currentCycle = currentLeg.reEntryCycle || 0;
//                                     if (currentCycle < Number(reConfig.cycles || 0)) {
//                                         if (!liveHospitalMap.has(deployment._id.toString())) {
//                                             liveHospitalMap.set(deployment._id.toString(), []);
//                                         }

//                                         liveHospitalMap.get(deployment._id.toString()).push({
//                                             originalLeg: currentLeg,
//                                             reEntryCycle: currentCycle + 1,
//                                             reEntryConfig: reConfig,
//                                             originalEntryPrice: currentLeg.entryPrice,
//                                             symbol: currentLeg.symbol,
//                                             action: currentLeg.action,
//                                             quantity: currentLeg.quantity,
//                                             securityId: currentLeg.securityId,
//                                             exchange: currentLeg.exchange
//                                         });
//                                         console.log(`🚑 [LIVE HOSPITAL] Leg ${currentLeg.symbol} sent to recovery | Cycle: ${currentCycle + 1}/${reConfig.cycles}`);
//                                     }
//                                 }
//                                 // =========================================================

//                                 deployment.pnl = (deployment.pnl || 0) + finalPnl;
//                                 deployment.realizedPnl = (deployment.realizedPnl || 0) + finalPnl;

//                                 const allCompleted = deployment.executedLegs.every(l => l.status === 'COMPLETED');
//                                 const hospitalQueue = liveHospitalMap.get(deployment._id.toString()) || [];

//                                 // 🔥 THE FIX: Agar hospital me patient bacha hai, toh dukaan 'COMPLETED' mat karo!
//                                 deployment.status = (allCompleted && hospitalQueue.length === 0) ? 'COMPLETED' : 'PARTIALLY_COMPLETED'

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
//                                     // 🔥 THE FIX: Yahan 'LEG_EXIT' label add kar diya!
//                                     await handleMoveSlToCost(strategy, deployment, broker, 'LEG_EXIT');
//                                 }

//                                 // 🔥 THE BULLETPROOF EXIT ALL LOGIC
//                                 const isExitAllOn = advSettings.exitAllOnSLTgt === true || advSettings.exitAllOnSlTgt === true || advSettings.exitAllOnSLTgt === 'ON';

//                                 // Agar Exit All ON hai aur kuch legs abhi bhi bache hain (!allCompleted)
//                                 if (!allCompleted && isExitAllOn) {
//                                     await handleExitAllOnSlTgt(strategy, deployment, broker, exitReason);
//                                 }

//                             } else {
//                                 // Live PnL UI Update
//                                 currentLeg.livePnl = currentLeg.action === 'BUY'
//                                     ? (liveLtp - currentLeg.entryPrice) * currentLeg.quantity
//                                     : (currentLeg.entryPrice - liveLtp) * currentLeg.quantity;

//                                 // 🔥 THE MONGOOSE FIX (VersionError Proof)
//                                 // save() ki jagah updateOne() use karenge taaki concurrent clash na ho
//                                 await Deployment.updateOne(
//                                     { _id: deployment._id },
//                                     { $set: { executedLegs: deployment.executedLegs } }
//                                 );

//                                 // 🔥 THE FIX: Trailing SL Logic & V-Shape Recovery Trigger 🔥
//                                 if (strategy.data?.riskManagement?.profitTrailing !== 'No Trailing') {
//                                     // 1. Pehle trailing process karein (ye function 'true' return karega agar SL trail hua to)
//                                     const isTrailed = await processTrailingLogic(deployment, strategy, liveLtp, broker);

//                                     // 2. Agar trailing hui hai, to V-Shape check ke liye Commander ko bulayein
//                                     if (isTrailed) {
//                                         await handleMoveSlToCost(strategy, deployment, broker, 'TRAILING_UPDATE');
//                                     }
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
const { findSMCZones } = require('./scanners/SetupFinder.js');

// 🛡️ Risk Management
const { handleMtmSquareOff } = require('./features/riskManagement/mtmSquareOff.js');
const { processTrailingLogic } = require('./features/riskManagement/trailingLogic.js');

// 🚀 ADVANCE FEATURES
const { handleMoveSlToCost } = require('./features/advanceFeatures/moveSlToCost.js');
const { handlePrePunchSl } = require('./features/advanceFeatures/prePunchSl.js');
const { handleExitAllOnSlTgt } = require('./features/advanceFeatures/exitAllOnSlTgt.js');
const { processWaitAndTrade } = require('./features/advanceFeatures/waitAndTrade.js');
const { checkPremiumDifference } = require('./features/advanceFeatures/premiumDifference.js');
const { calculateTrailedSL } = require('./features/advanceFeatures/trailSL.js');

// 🔥 THE FIX: Bring the Re-Entry Doctor to the Live Hospital
const { evaluateReEntryLogic } = require('./features/advanceFeatures/reEntryLogic.js');


const { identifySwings, checkPriceActionSignal } = require('./scanners/priceActionScanner.js');
const { fetchCandleData } = require('../services/candleService.js');

const SMCEntryEngine = require('./scanners/SMCEntryEngine.js');


// Global execution locks
const executionLocks = new Set();
let isEngineRunning = false;
let liveHospitalMap = new Map();
let liveSniperMap = new Map(); // 🧠 स्नाइपर इंजन की याददाश्त के लिए नया मैप

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
            // 🏥 0. LIVE HOSPITAL CHECK (RE-ENTRY LOGIC)
            // ==============================================================
            if (strategy.data?.advanceSettings?.reEntryExecute && liveHospitalMap.has(deployment._id.toString())) {
                let hospitalQueue = liveHospitalMap.get(deployment._id.toString()) || [];
                if (hospitalQueue.length > 0) {
                    let stillPending = [];
                    const broker = await Broker.findById(deployment.brokers[0]);

                    if (broker && broker.engineOn) {
                        for (let pTrade of hospitalQueue) {
                            await sleep(500);
                            const liveLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, pTrade.exchange, pTrade.securityId);
                            if (!liveLtp) { stillPending.push(pTrade); continue; }

                            const fakePending = {
                                reEntryConfig: pTrade.reEntryConfig,
                                originalEntryPrice: pTrade.originalEntryPrice,
                                transaction: pTrade.action,
                                premiumChart: null // Live me hum Spot candle/LTP use karte hain
                            };

                            // IST Date banayein
                            const istDate = new Date(new Date().getTime() + (5.5 * 3600000));
                            const reviveStatus = evaluateReEntryLogic(fakePending, istDate, liveLtp);

                            if (reviveStatus.shouldRevive) {
                                console.log(`⚡ [LIVE RE-ENTRY] Reviving leg: ${pTrade.symbol} at ₹${liveLtp} | Cycle: ${pTrade.reEntryCycle}`);

                                let entryPrice = liveLtp;
                                let apiSuccess = true;

                                if (deployment.executionType === 'LIVE') {
                                    const orderData = { action: pTrade.action, quantity: pTrade.quantity, securityId: pTrade.securityId, segment: pTrade.exchange };
                                    const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                                    if (orderResponse.success) {
                                        await sleep(2000);
                                        entryPrice = await fetchLiveLTP(broker.clientId, broker.apiSecret, pTrade.exchange, pTrade.securityId) || liveLtp;
                                        await createAndEmitLog(broker, pTrade.symbol, pTrade.action, pTrade.quantity, 'SUCCESS', `Live Re-Entry Executed at ₹${entryPrice}`, orderResponse.data.orderId);
                                    } else {
                                        apiSuccess = false;
                                        await createAndEmitLog(broker, pTrade.symbol, pTrade.action, pTrade.quantity, 'FAILED', `Re-Entry Failed: ${orderResponse.data?.remarks}`);
                                    }
                                } else {
                                    await createAndEmitLog(broker, pTrade.symbol, pTrade.action, pTrade.quantity, 'SUCCESS', `Paper Re-Entry Executed at ₹${entryPrice}`);
                                }

                                if (apiSuccess) {
                                    deployment.executedLegs.push({
                                        securityId: pTrade.securityId,
                                        exchange: pTrade.exchange,
                                        symbol: pTrade.symbol,
                                        action: pTrade.action,
                                        quantity: pTrade.quantity,
                                        entryPrice: entryPrice,
                                        paperSlPrice: 0,
                                        status: 'ACTIVE',
                                        currentTrailedSL: null,
                                        reEntryCycle: pTrade.reEntryCycle,
                                        entryReason: "Re-Entry" // 🔥 FRONTEND UI BADGE KE LIYE TAG
                                    });
                                    deployment.status = 'PARTIALLY_COMPLETED'; // Taaki engine ise chalata rahe
                                    await deployment.save();
                                } else {
                                    stillPending.push(pTrade);
                                }
                            } else {
                                stillPending.push(pTrade);
                            }
                        }
                    }
                    liveHospitalMap.set(deployment._id.toString(), stillPending);
                }
            }

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

                // 🔥 YAHAN LAGAO APNA NAYA PRICE ACTION ENTRY BLOCK 🔥
                else if (strategyType === "Price Action Based") {
                    const broker = await Broker.findById(deployment.brokers[0]);
                    if (broker && broker.engineOn) {
                        
                        // 🛡️ THE FIX: Dhan Security ID Fallback
                        const dhanIndexIds = {
                            "NIFTY": "13",
                            "BANKNIFTY": "25",
                            "FINNIFTY": "27",
                            "MIDCPNIFTY": "118",
                            "SENSEX": "51"
                        };

                        // 🔥 THE NEW FIX: Dhan API needs 'IDX_I' for Indices, not 'NSE'
                        let targetExchange = "IDX_I"; 
                        if (baseSymbol === "SENSEX") targetExchange = "BSE";

                        // Safety Check
                        const safeInstrumentId = (typeof instrumentData !== 'undefined' && instrumentData.id) ? instrumentData.id : null;
                        
                        const targetSecurityId = safeInstrumentId || dhanIndexIds[baseSymbol];

                        console.log(`🔍 [DEBUG SCANNER] BaseSymbol: ${baseSymbol} | Exchange: ${targetExchange} | Final Target ID: ${targetSecurityId}`);

                        if (!targetSecurityId) {
                            console.log(`⚠️ [WARNING] No Security ID found for ${baseSymbol}. Skipping tick...`);
                            continue; 
                        }

                        // 1. कैंडल्स फेच करो (🎯 अब targetExchange में 'IDX_I' जाएगा)
                        const candles = await fetchCandleData(broker.clientId, broker.apiSecret, targetExchange, targetSecurityId, 'INDEX', '1', 1);
                        
                        if (candles && candles.length > 0) {
                            const deploymentIdStr = deployment._id.toString();

                            // 2. 🧠 MAP GUARD: अगर इस डिप्लॉयमेंट का स्नाइपर इंजन पहले से मैप में नहीं है, तो नया बनाओ
                            if (!liveSniperMap.has(deploymentIdStr)) {
                                liveSniperMap.set(deploymentIdStr, new SMCEntryEngine({
                                    maxSlPoints: config.maxSlPoints || 20, // UI से आया हुआ Dynamic SL Size
                                    entryTriggers: config.entryTriggers || ['DIRECT ENTRY', 'POI ENTRY', 'SCOB ENTRY'], // UI से सिलेक्टेड ट्रिगर्स
                                    htf: config.htf || '5 min',
                                    ltf: config.ltf || '1 min'
                                }));
                            }

                            const sniperInstance = liveSniperMap.get(deploymentIdStr);

                            // 3. SetupFinder का इस्तेमाल करके एक्टिव ज़ोन निकालो
                            let activeSetupZone = await findSMCZones(candles); 
                            let currentTrend = deployment.signalType || "BULLISH"; 
                            let currentLivePrice = await fetchLivePrice(baseSymbol);

                            if (activeSetupZone && currentLivePrice) {
                                // 🎯 स्नाइपर इंजन को लाइव टिक और कैंडल डेटा प्रोसेस करने के लिए दें
                                const currentCandle = candles[candles.length - 1];
                                const sniperSignal = sniperInstance.processLiveMarket(currentLivePrice, currentCandle, activeSetupZone, currentTrend);

                                // 4. अगर स्नाइपर ने वॉटरफॉल प्रायोरिटी पास करके ट्रिगर दबा दिया!
                                if (sniperSignal && (sniperSignal.action === 'BUY' || sniperSignal.action === 'SELL')) {
                                    shouldEnter = true;
                                    currentSignalType = sniperSignal.trendType; // LONG or SHORT
                                    
                                    console.log(`🎯 [SNIPER EXECUTION] Triggered via: ${sniperSignal.type} at ₹${sniperSignal.entryPrice}`);
                                    await createAndEmitLog(broker, instrumentData.name, "SNIPER", 0, "SUCCESS", `SMC Entry Confirmed via ${sniperSignal.type}`);
                                }
                            }
                        }
                    }
                }


                else {
                    // 🔥 THE TIME POLLING FIX: '>=' logic taaki block hone par wapas check kare
                    if (config.startTime) {
                        const [currH, currM] = currentTime.split(':').map(Number);
                        const currentMinutes = (currH * 60) + currM;

                        let startMinutes = 0;
                        const timeParts = config.startTime.split(' ');
                        let [sh, sm] = timeParts[0].split(':').map(Number);
                        const modifier = timeParts[1];

                        if (modifier && modifier.toUpperCase() === 'PM' && sh !== 12) sh += 12;
                        if (modifier && modifier.toUpperCase() === 'AM' && sh === 12) sh = 0;
                        startMinutes = (sh * 60) + sm;

                        // Agar time pass ho gaya hai aur abhi tak trade nahi laga (!hasLegs), toh try karo
                        if (currentMinutes >= startMinutes) {
                            shouldEnter = true;
                            currentSignalType = "TIME";
                        }
                    }
                }

                if (shouldEnter) {
                    executionLocks.add(entryLockKey);
                    const isPrePunchSL = strategy.data?.advanceSettings?.prePunchSL || false;

                    for (const brokerId of deployment.brokers) {
                        const broker = await Broker.findById(brokerId);
                        if (broker && broker.engineOn) {

                            // ==============================================================
                            // ⚖️ GATEKEEPER: PREMIUM DIFFERENCE CHECK
                            // ==============================================================
                            const advSettings = strategy.data?.advanceSettings || {};
                            let passPremiumDiff = true;

                            // Agar feature ON hai aur strategy mein kam se kam 2 legs hain
                            if (advSettings.premiumDifference && strategy.data.legs.length >= 2) {
                                let currentSpotPrice = await fetchLivePrice(baseSymbol);

                                if (currentSpotPrice) {
                                    let tempLtps = [];

                                    // Pehle 2 legs ka dummy fetch karke price nikalte hain
                                    for (let i = 0; i < 2; i++) {
                                        const tempLeg = strategy.data.legs[i];
                                        let tempAction = (tempLeg.action || "BUY").toUpperCase();
                                        let tempOptType = tempLeg.optionType === "Call" ? "CE" : "PE";

                                        if (currentSignalType === "LONG") tempOptType = (tempAction === "BUY") ? "CE" : "PE";
                                        else if (currentSignalType === "SHORT") tempOptType = (tempAction === "BUY") ? "PE" : "CE";

                                        let tempInstrument;
                                        if (["CP", "CP >=", "CP <=", "Delta"].includes(tempLeg.strikeCriteria || "ATM pt")) {
                                            tempInstrument = await findStrikeByLivePremium(baseSymbol, currentSpotPrice, tempOptType, tempLeg.expiry || "WEEKLY", tempLeg.strikeCriteria || "ATM pt", tempLeg.strikeType || "ATM", broker);
                                        } else {
                                            tempInstrument = getOptionSecurityId(baseSymbol, currentSpotPrice, tempLeg.strikeCriteria || "ATM pt", tempLeg.strikeType || "ATM", tempOptType, tempLeg.expiry || "WEEKLY");
                                        }

                                        if (tempInstrument) {
                                            // Asli LTP mangao ya fallback use karo
                                            const ltp = tempInstrument.ltp || await fetchLiveLTP(broker.clientId, broker.apiSecret, tempInstrument.exchange, tempInstrument.id) || currentSpotPrice;
                                            tempLtps.push(ltp);
                                        }
                                    }

                                    // Dono legs ke price mil gaye, ab difference check karo
                                    if (tempLtps.length === 2) {
                                        // UI se aane wali exact value (safest fallback ke sath)
                                        const maxDiff = Number(advSettings.premiumDifferenceConfig?.premium || 100);

                                        const diffStatus = checkPremiumDifference(true, maxDiff, tempLtps);
                                        if (!diffStatus.isAllowed) {
                                            console.log(`⚖️ [PREMIUM DIFF BLOCK] Time: ${currentTime} | ${diffStatus.reason}`);
                                            passPremiumDiff = false;
                                        }
                                    }
                                }
                            }

                            // Agar difference limit se bahar hai, toh Entry abort kardo is tick ke liye
                            if (!passPremiumDiff) {
                                executionLocks.delete(entryLockKey); // 🔥 LOCK UNLOCK KARNA ZAROORI HAI taki agle 30 sec me fir check ho
                                continue; // Agle broker ya next tick par jao
                            }
                            // ==============================================================

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
                                        status: 'ACTIVE',
                                        currentTrailedSL: null, // 🔥 SNIPER MEMORY
                                        entryReason: deployment.waitReferencePrice ? "Wait & Trade" : (advSettings.premiumDifference ? "Premium Diff" : "Normal") // 🔥 FRONTEND TAG
                                    });

                                    await deployment.save();
                                    // await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Paper Entry at ₹${entryPrice}`);

                                    console.log(`📝 [PAPER TRADE] [Time: ${currentTime}] Entry Placed at ₹${entryPrice} | Pre-Punch SL calculated at ₹${paperSl}`);

                                    await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Paper Entry at ₹${entryPrice} (SL set at ₹${paperSl})`);

                                }

                                // 🔴 LIVE TRADE ENTRY
                                else if (deployment.executionType === 'LIVE') {
                                    const orderData = { action: tradeAction, quantity: tradeQty, securityId: instrument.id, segment: instrument.exchange };
                                    const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

                                    if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
                                        await sleep(2000);
                                        const entryPrice = await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id) || 0;

                                        let liveSlPrice = 0;

                                        // 🛡️ THE NEW FIX: PRE-PUNCH SL LOGIC FOR LIVE MARKET
                                        if (isPrePunchSL && entryPrice > 0 && leg.slValue > 0) {
                                            // SL Price Calculate karna
                                            const slAmt = leg.slType === 'SL%' ? (entryPrice * (Number(leg.slValue)/100)) : Number(leg.slValue);
                                            liveSlPrice = tradeAction === "BUY" ? entryPrice - slAmt : entryPrice + slAmt;
                                            liveSlPrice = parseFloat(liveSlPrice.toFixed(2)); // Dhan ke liye 2 decimal zaroori hai

                                            // SL hamesha Entry ka opposite hota hai
                                            const slAction = tradeAction === "BUY" ? "SELL" : "BUY";

                                            console.log(`🛡️ [PRE-PUNCH] Placing SL Order at ₹${liveSlPrice} for ${instrument.tradingSymbol}`);

                                            const slOrderData = {
                                                action: slAction,
                                                quantity: tradeQty,
                                                securityId: instrument.id,
                                                segment: instrument.exchange,
                                                orderType: "STOP_LOSS_MARKET", // 🔥 Dhan ko batana ki ye SL hai
                                                triggerPrice: liveSlPrice      // 🔥 Trigger Price set karna
                                            };

                                            // Dhan par SL Pending order bhejna
                                            const slOrderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, slOrderData);

                                            if(slOrderResponse.success) {
                                                await createAndEmitLog(broker, instrument.tradingSymbol, slAction, tradeQty, 'INFO', `Pre-Punch SL Placed successfully at ₹${liveSlPrice}`);
                                            } else {
                                                await createAndEmitLog(broker, instrument.tradingSymbol, slAction, tradeQty, 'FAILED', `Pre-Punch SL Failed: ${slOrderResponse.data?.remarks || "Unknown Error"}`);
                                            }
                                        }

                                        // 🔥 PUSH TO ARRAY
                                        deployment.executedLegs.push({
                                            securityId: instrument.id,
                                            exchange: instrument.exchange,
                                            symbol: instrument.tradingSymbol,
                                            action: tradeAction,
                                            quantity: tradeQty,
                                            entryPrice: entryPrice,
                                            paperSlPrice: liveSlPrice > 0 ? liveSlPrice : 0, // SL record karna
                                            status: 'ACTIVE',
                                            currentTrailedSL: null, // 🔥 SNIPER MEMORY
                                            entryReason: deployment.waitReferencePrice ? "Wait & Trade" : (advSettings.premiumDifference ? "Premium Diff" : "Normal") // 🔥 FRONTEND TAG
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

                            // 🔥 THE FIX: Extract advSettings safely at the top so ALL blocks can use it
                            const advSettings = strategy.data?.advanceSettings || deployment.advanceSettings || {};

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

                                // ==============================================================
                                // 🎯 ADVANCE FEATURE: TRAIL SL (Live Sniper Guard)
                                // ==============================================================
                                let initialSlPrice = 0;
                                if (slVal > 0) {
                                    const slAmt = slType.includes("%") ? (currentLeg.entryPrice * slVal / 100) : slVal;
                                    initialSlPrice = currentLeg.action === 'BUY' ? currentLeg.entryPrice - slAmt : currentLeg.entryPrice + slAmt;
                                }

                                // (Yahan se const advSettings = ... hata diya gaya hai)
                                if (advSettings.trailSL && initialSlPrice > 0) {
                                    const newTrailedSL = calculateTrailedSL(
                                        currentLeg.action,
                                        currentLeg.entryPrice,
                                        initialSlPrice,
                                        liveLtp,
                                        advSettings.trailSLConfig || {},
                                        currentLeg.currentTrailedSL || null
                                    );

                                    if (newTrailedSL !== currentLeg.currentTrailedSL && newTrailedSL !== initialSlPrice) {
                                        currentLeg.currentTrailedSL = newTrailedSL;
                                        await deployment.save();
                                        console.log(`🎯 [LIVE SNIPER] Trailed SL updated to ₹${newTrailedSL.toFixed(2)} for ${currentLeg.symbol}`);
                                    }
                                }

                                let activeSlPrice = currentLeg.currentTrailedSL || initialSlPrice;

                                // 🚨 CHECK STOPLOSS (SL)
                                if (activeSlPrice > 0) {
                                    if (currentLeg.action === 'BUY' && liveLtp <= activeSlPrice) {
                                        isSlHit = true;
                                        exitReason = currentLeg.currentTrailedSL ? "LEG_TRAIL_SL" : `StopLoss Hit`;
                                    } else if (currentLeg.action === 'SELL' && liveLtp >= activeSlPrice) {
                                        isSlHit = true;
                                        exitReason = currentLeg.currentTrailedSL ? "LEG_TRAIL_SL" : `StopLoss Hit`;
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

                                // =========================================================
                                // 🚑 SEND DEAD LEGS TO LIVE HOSPITAL
                                // =========================================================
                                const reConfig = advSettings.reEntryExecuteConfig || {};

                                if (advSettings.reEntryExecute && ["StopLoss Hit", "LEG_TRAIL_SL", "SL_MOVED_TO_COST"].includes(exitReason)) {
                                    const currentCycle = currentLeg.reEntryCycle || 0;
                                    if (currentCycle < Number(reConfig.cycles || 0)) {
                                        if (!liveHospitalMap.has(deployment._id.toString())) {
                                            liveHospitalMap.set(deployment._id.toString(), []);
                                        }

                                        liveHospitalMap.get(deployment._id.toString()).push({
                                            originalLeg: currentLeg,
                                            reEntryCycle: currentCycle + 1,
                                            reEntryConfig: reConfig,
                                            originalEntryPrice: currentLeg.entryPrice,
                                            symbol: currentLeg.symbol,
                                            action: currentLeg.action,
                                            quantity: currentLeg.quantity,
                                            securityId: currentLeg.securityId,
                                            exchange: currentLeg.exchange
                                        });
                                        console.log(`🚑 [LIVE HOSPITAL] Leg ${currentLeg.symbol} sent to recovery | Cycle: ${currentCycle + 1}/${reConfig.cycles}`);
                                    }
                                }
                                // =========================================================

                                deployment.pnl = (deployment.pnl || 0) + finalPnl;
                                deployment.realizedPnl = (deployment.realizedPnl || 0) + finalPnl;

                                const allCompleted = deployment.executedLegs.every(l => l.status === 'COMPLETED');
                                const hospitalQueue = liveHospitalMap.get(deployment._id.toString()) || [];

                                // 🔥 THE FIX: Agar hospital me patient bacha hai, toh dukaan 'COMPLETED' mat karo!
                                deployment.status = (allCompleted && hospitalQueue.length === 0) ? 'COMPLETED' : 'PARTIALLY_COMPLETED'

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
                                    // 🔥 THE FIX: Yahan 'LEG_EXIT' label add kar diya!
                                    await handleMoveSlToCost(strategy, deployment, broker, 'LEG_EXIT');
                                }

                                // 🔥 THE BULLETPROOF EXIT ALL LOGIC
                                const isExitAllOn = advSettings.exitAllOnSLTgt === true || advSettings.exitAllOnSlTgt === true || advSettings.exitAllOnSLTgt === 'ON';

                                // Agar Exit All ON hai aur kuch legs abhi bhi bache hain (!allCompleted)
                                if (!allCompleted && isExitAllOn) {
                                    await handleExitAllOnSlTgt(strategy, deployment, broker, exitReason);
                                }

                            } else {
                                // Live PnL UI Update
                                currentLeg.livePnl = currentLeg.action === 'BUY'
                                    ? (liveLtp - currentLeg.entryPrice) * currentLeg.quantity
                                    : (currentLeg.entryPrice - liveLtp) * currentLeg.quantity;

                                // 🔥 THE MONGOOSE FIX (VersionError Proof)
                                // save() ki jagah updateOne() use karenge taaki concurrent clash na ho
                                await Deployment.updateOne(
                                    { _id: deployment._id },
                                    { $set: { executedLegs: deployment.executedLegs } }
                                );

                                // 🔥 THE FIX: Trailing SL Logic & V-Shape Recovery Trigger 🔥
                                if (strategy.data?.riskManagement?.profitTrailing !== 'No Trailing') {
                                    // 1. Pehle trailing process karein (ye function 'true' return karega agar SL trail hua to)
                                    const isTrailed = await processTrailingLogic(deployment, strategy, liveLtp, broker);

                                    // 2. Agar trailing hui hai, to V-Shape check ke liye Commander ko bulayein
                                    if (isTrailed) {
                                        await handleMoveSlToCost(strategy, deployment, broker, 'TRAILING_UPDATE');
                                    }
                                }
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
