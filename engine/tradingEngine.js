
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
// const { findSMCZones } = require('./scanners/SetupFinder.js');

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

// const SMCEntryEngine = require('./scanners/SMCEntryEngine.js');


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
                        
//                         // 🛡️ THE FIX: Dhan Security ID Fallback
//                         const dhanIndexIds = {
//                             "NIFTY": "13",
//                             "BANKNIFTY": "25",
//                             "FINNIFTY": "27",
//                             "MIDCPNIFTY": "118",
//                             "SENSEX": "51"
//                         };

//                         // 🔥 THE NEW FIX: Dhan API needs 'IDX_I' for Indices, not 'NSE'
//                         let targetExchange = "IDX_I"; 
//                         if (baseSymbol === "SENSEX") targetExchange = "BSE";

//                         // Safety Check
//                         const safeInstrumentId = (typeof instrumentData !== 'undefined' && instrumentData.id) ? instrumentData.id : null;
                        
//                         const targetSecurityId = safeInstrumentId || dhanIndexIds[baseSymbol];

//                         console.log(`🔍 [DEBUG SCANNER] BaseSymbol: ${baseSymbol} | Exchange: ${targetExchange} | Final Target ID: ${targetSecurityId}`);

//                         if (!targetSecurityId) {
//                             console.log(`⚠️ [WARNING] No Security ID found for ${baseSymbol}. Skipping tick...`);
//                             continue; 
//                         }

//                         // 1. कैंडल्स फेच करो (🎯 अब targetExchange में 'IDX_I' जाएगा)
//                         const candles = await fetchCandleData(broker.clientId, broker.apiSecret, targetExchange, targetSecurityId, 'INDEX', '1', 1);
                        
//                         if (candles && candles.length > 0) {
//                             const deploymentIdStr = deployment._id.toString();

//                             // 2. 🧠 MAP GUARD: अगर इस डिप्लॉयमेंट का स्नाइपर इंजन पहले से मैप में नहीं है, तो नया बनाओ
//                             if (!liveSniperMap.has(deploymentIdStr)) {
//                                 liveSniperMap.set(deploymentIdStr, new SMCEntryEngine({
//                                     maxSlPoints: config.maxSlPoints || 20, // UI से आया हुआ Dynamic SL Size
//                                     entryTriggers: config.entryTriggers || ['DIRECT ENTRY', 'POI ENTRY', 'SCOB ENTRY'], // UI से सिलेक्टेड ट्रिगर्स
//                                     htf: config.htf || '5 min',
//                                     ltf: config.ltf || '1 min'
//                                 }));
//                             }

//                             const sniperInstance = liveSniperMap.get(deploymentIdStr);

//                             // 3. SetupFinder का इस्तेमाल करके एक्टिव ज़ोन निकालो
//                             let activeSetupZone = await findSMCZones(candles); 
//                             let currentTrend = deployment.signalType || "BULLISH"; 
//                             let currentLivePrice = await fetchLivePrice(baseSymbol);

//                             if (activeSetupZone && currentLivePrice) {
//                                 // 🎯 स्नाइपर इंजन को लाइव टिक और कैंडल डेटा प्रोसेस करने के लिए दें
//                                 const currentCandle = candles[candles.length - 1];
//                                 const sniperSignal = sniperInstance.processLiveMarket(currentLivePrice, currentCandle, activeSetupZone, currentTrend);

//                                 // 4. अगर स्नाइपर ने वॉटरफॉल प्रायोरिटी पास करके ट्रिगर दबा दिया!
//                                 if (sniperSignal && (sniperSignal.action === 'BUY' || sniperSignal.action === 'SELL')) {
//                                     shouldEnter = true;
//                                     currentSignalType = sniperSignal.trendType; // LONG or SHORT
                                    
//                                     console.log(`🎯 [SNIPER EXECUTION] Triggered via: ${sniperSignal.type} at ₹${sniperSignal.entryPrice}`);
//                                     await createAndEmitLog(broker, instrumentData.name, "SNIPER", 0, "SUCCESS", `SMC Entry Confirmed via ${sniperSignal.type}`);
//                                 }
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


const dhanStreamer = require('../services/dhanStreamer');

const { calculateApproxBasketMargin } = require('./utils/marginCalculator.js'); 
const { isThisExpiryDay } = require('./utils/expiryCalculator.js');

// =========================================================================
// 🧠 RATIO SPREAD: LIVE MEMORY CACHE & TICK LISTENER (THE HEARTBEAT)
// =========================================================================
const { checkVelocityGuard, evaluateGammaShield, generateRatioSpreadLegs } = require('../engine/strategies/ratioSpreadManager.js');

// 1. Global Memory (Fast Access)
const activeRatioDeployments = new Map(); 
const liveLtpCache = {}; 

// 🛡️ THE LIVE FIREFIGHTER (Square-off Executer)
const executeLiveEmergencyExit = async (session, reason, currentMtm) => {
    try {
        console.log(`\n🚑 [FIREFIGHTER] Squaring off all active legs for ${session.symbol}. Reason: ${reason}`);
        
        // 1. Dhan API pe ulte orders (Square-off) fire karo
        for (let leg of session.activeLegs) {
            const sqAction = leg.action === 'BUY' ? 'SELL' : 'BUY';
            const sqOrderData = { 
                action: sqAction, 
                quantity: leg.lots * (leg.inst.lotSize || 65), 
                securityId: leg.inst.id, 
                segment: leg.exchange || "NSE_FNO", 
                orderType: "MARKET" 
            };
            
            // Fire Market Order on Dhan
            const sqResp = await placeDhanOrder(session.broker.clientId, session.broker.apiSecret, sqOrderData);
            if (sqResp.success) {
                console.log(`   ✅ Auto-Exited: ${leg.action} Leg @ ${leg.strike} ${leg.type}`);
            } else {
                console.log(`   ❌ Exit Failed for ${leg.strike}: ${sqResp.data?.remarks}`);
            }
        }

        // 2. DB me Deployment Status 'COMPLETED' mark kar do
        const Deployment = require('../models/deploymentModel'); // Path verify kar lijiyega
        const depDb = await Deployment.findById(session.deploymentId);
        if(depDb) {
            depDb.status = 'COMPLETED';
            depDb.exitReason = reason;
            depDb.exitTime = new Date();
            await depDb.save();
        }

        // 3. Trade ko Memory se hata do taki dobara check na ho
        activeRatioDeployments.delete(session.deploymentId);
        console.log(`🎯 [EXIT SUCCESS] Trade Closed Successfully at MTM: ₹${currentMtm.toFixed(2)}`);

    } catch (error) {
        console.error(`❌ [FIREFIGHTER ERROR]`, error.message);
    }
};

// ⏱️ THE TICK LISTENER (Har millisecond me chalega)
dhanStreamer.on('tick', async (tickData) => {
    try {
        // A) Naya price turant cache me dalo
        liveLtpCache[tickData.securityId] = tickData.ltp;

        // B) Har ek Active Ratio Spread ko check karo
        for (let [depId, session] of activeRatioDeployments.entries()) {
            if(session.status !== 'ACTIVE' && session.status !== 'RECOVERY_MODE') continue;
            
            // C) 🚨 VELOCITY GUARD CHECK (Agar Nifty/BankNifty ka tick aaya hai)
            if (String(tickData.securityId) === String(session.spotSecurityId)) {
                const vGuard = checkVelocityGuard(tickData.ltp, session.spotHistory, session.vWindow, session.vPoints, session.isPanicApiMode);
                session.spotHistory = vGuard.spotHistory;
                
                if (vGuard.isPanic && !session.isPanicApiMode) {
                    session.isPanicApiMode = true; // Engine Ab Panic Mode me hai
                }
            }

            // D) 🧮 LIVE MTM CALCULATION (Lightning Fast)
            let allPricesAvailable = true;
            let liveMTM = 0;

            for (let leg of session.activeLegs) {
                const legLtp = liveLtpCache[leg.inst.id];
                if (!legLtp) { allPricesAvailable = false; break; } // Agar ek bhi leg ka price nahi aaya, to ruko
                
                const mult = leg.lots * (leg.inst.lotSize || 65);
                const legPnL = leg.action === 'BUY' ? (legLtp - leg.entryPrice) * mult : (leg.entryPrice - legLtp) * mult;
                liveMTM += legPnL;
            }

            if (!allPricesAvailable) continue; 

            let forceExitReason = null;

            // E) 🛡️ GAMMA SHIELD CHECK
            const now = new Date();
            const h = String(now.getHours()).padStart(2, '0');
            const m = String(now.getMinutes()).padStart(2, '0');
            const currentTimeStr = `${h}:${m}`;

            if (session.shieldConfig && session.estimatedMargin) {
                const shieldState = { isActive: session.isGammaShieldActive, highestLockedProfit: session.highestLockedProfit };
                const shieldResult = evaluateGammaShield(currentTimeStr, liveMTM, session.estimatedMargin, session.shieldConfig, shieldState);
                
                session.isGammaShieldActive = shieldResult.newState.isActive;
                session.highestLockedProfit = shieldResult.newState.highestLockedProfit;

                if (shieldResult.action === 'FORCE_EXIT') forceExitReason = 'GAMMA_HOUR_PROFIT_SHIELD_DROP';
            }

            // F) 🚨 HARD STOPLOSS CHECK
            if (liveMTM <= -Math.abs(session.maxLossLimit)) {
                forceExitReason = 'MAX_LOSS_HIT';
            }

            // G) 💣 VELOCITY PANIC EXIT (Agar market tezi se gira aur loss -70% tak pahunch gaya)
            if (session.isPanicApiMode && liveMTM <= -Math.abs(session.maxLossLimit * 0.70)) {
                forceExitReason = 'GAMMA_BLAST_VELOCITY_BREACH';
            }

            // H) 🔥 FINAL EXECUTION: FIRE THE EXIT!
            if (forceExitReason) {
                // Turant status change karo taki double-fire na ho jaye
                session.status = 'EXECUTING_EXIT';
                console.log(`\n⚡ [LIVE TRIGGER] Limit Breached! Reason: ${forceExitReason} | Current Live MTM: ₹${liveMTM.toFixed(2)}`);
                
                // Firefighter ko call kardo
                executeLiveEmergencyExit(session, forceExitReason, liveMTM);
            }
        }
    } catch (error) {
        // Silent error handle (Taki loop crash na ho)
    }
});
// =========================================================================

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

                            // 🔍 CHECK STRATEGY TYPE: Kya ye Ratio Spread hai?
                            const isRatioSpreadStrategy = strategy.data?.legs?.some(leg => leg?.strikeCriteria === 'Ratio Spread (Prem/X)');

                            if (isRatioSpreadStrategy) {
                                // ==============================================================
                                // 🚀 NEW LIVE MARKET ENTRY SEQUENCE (RATIO SPREAD)
                                // ==============================================================
                                console.log(`\n⚡ [RATIO SPREAD LIVE EXECUTION] Processing Smart Entry...`);

                                const upperSymbol = baseSymbol;
                                
                                // 1. Spot Price aur ATM Strike nikalna
                                const currentSpotPrice = await fetchLivePrice(baseSymbol);
                                if (!currentSpotPrice) {
                                    console.log(`⚠️ Spot price fetch failed. Skipping tick.`);
                                    continue;
                                }
                                
                                // Apni purani utils use karke ATM nikal lein
                                const atmStrike = Math.round(currentSpotPrice / getStrikeStep(upperSymbol)) * getStrikeStep(upperSymbol);
                                const stepSize = getStrikeStep(upperSymbol);
                                const premiumDivisor = 4; // Target Divisor

                                // 2. Premium Fetch Callback (Live API)
                                const liveFetchPremiumCallback = async (optType, expectedStrike) => {
                                    // Live market me hum fetchLiveLTP se direct true price nikalenge
                                    let inst = getOptionSecurityId(baseSymbol, currentSpotPrice, "ATM pt", "ATM", optType, strategy.data?.legs[0]?.expiry || "WEEKLY"); // Dummy call to get structure
                                    if(!inst) return null;
                                    
                                    // Yahan Dhan API call function use hoga
                                    const ltp = await fetchLiveLTP(broker.clientId, broker.apiSecret, inst.exchange, inst.id);
                                    if(ltp) return { price: ltp, strike: expectedStrike };
                                    return null;
                                };

                                // ATM Premiums for target
                                const atmCe = await liveFetchPremiumCallback("CE", atmStrike) || { price: 120, strike: atmStrike };
                                const atmPe = await liveFetchPremiumCallback("PE", atmStrike) || { price: 110, strike: atmStrike };
                                const targetCePremium = atmCe.price / premiumDivisor;
                                const targetPePremium = atmPe.price / premiumDivisor;

                                // 3. Master Engine ko call karein
                                const legConfig = {
                                    executionMode: strategy.data?.advanceSettings?.legSelectionMode || 'ADAPTIVE_SKEW',
                                    maxAsymmetricLots: strategy.data?.advanceSettings?.maxAsymmetricLots || 5,
                                    realLotSize: (strategy.data?.instruments && strategy.data?.instruments[0]?.lotSize) ? strategy.data.instruments[0].lotSize : 65,
                                    defaultCeLots: strategy.data?.legs[2]?.quantity || 4,
                                    defaultPeLots: strategy.data?.legs[3]?.quantity || 4
                                };

                                const masterResult = await generateRatioSpreadLegs(
                                    currentSpotPrice, atmStrike, upperSymbol, stepSize, targetCePremium, targetPePremium, liveFetchPremiumCallback, legConfig
                                );

                                let legsToExecute = masterResult.activeLegs; 
                                let successfulLiveLegs = [];
                                let executionFailed = false;

                                const buyLegs = legsToExecute.filter(leg => leg.action === 'BUY');
                                const sellLegs = legsToExecute.filter(leg => leg.action === 'SELL');

                                // 4. PAPER TRADE LOGIC FOR RATIO SPREAD
                                if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
                                    deployment.executedLegs = [];
                                    for (let leg of legsToExecute) {
                                        deployment.executedLegs.push({
                                            securityId: leg.inst.id, exchange: "NSE_FNO", symbol: `${upperSymbol} ${leg.strike} ${leg.type}`,
                                            action: leg.action, quantity: leg.lots * leg.inst.lotSize, entryPrice: leg.entryPrice,
                                            paperSlPrice: 0, status: 'ACTIVE', currentTrailedSL: null, entryReason: "Ratio Spread Paper"
                                        });
                                    }
                                    await deployment.save();
                                    console.log(`📝 [PAPER TRADE] Ratio Spread Deployed Successfully.`);

                                    // =========================================================
                                    // 🔌 START WEBSOCKET & SUBSCRIBE LIVE TOKENS (PAPER MODE)
                                    // =========================================================
                                    if (!dhanStreamer.isConnected) {
                                        dhanStreamer.connect(broker.clientId, broker.apiSecret); 
                                    }

                                    // 🔥 FIX: Paper trade me 'legsToExecute' use karenge
                                    const liveTokens = legsToExecute.map(leg => leg.inst.id);
                                    
                                    if (liveTokens.length > 0) {
                                        setTimeout(() => {
                                            dhanStreamer.subscribeTokens("NSE_FNO", liveTokens);
                                        }, 2000); 
                                    }
                                    // =========================================================


                                    // =========================================================
                                    // 🧮 CALCULATE MARGIN & MAX LOSS FOR PAPER
                                    // =========================================================
                                    let estMargin = 150000; // Fallback Default
                                    try {
                                        const todayStr = new Date().toISOString().split('T')[0];
                                        const isExpDay = isThisExpiryDay(todayStr, upperSymbol, strategy.data?.legs[0]?.expiry || "WEEKLY");
                                        // 🔥 FIX: Paper trade me margin nikalne ke liye 'legsToExecute' use hoga
                                        estMargin = calculateApproxBasketMargin(legsToExecute, upperSymbol, isExpDay);
                                    } catch (e) {
                                        console.log(`⚠️ Margin calculation fallback used for Paper Trade.`);
                                    }
                                    
                                    const userMaxLossAmt = Number(strategy.data?.advanceSettings?.maxLoss || 0);
                                    const calcMaxLoss = userMaxLossAmt > 0 ? userMaxLossAmt : (estMargin * (Number(strategy.data?.advanceSettings?.maxLossPct || 1) / 100));

                                    
                                    // =========================================================
                                    // 🔍 FIND SPOT SECURITY ID (For Velocity Guard)
                                    // =========================================================
                                    let spotSecurityId = "13"; // Default NIFTY 50
                                    const checkSym = String(upperSymbol).toUpperCase().replace(/\s+/g, '');
                                    
                                    if (checkSym.includes("BANKNIFTY") || checkSym === "NIFTYBANK") spotSecurityId = "25";
                                    else if (checkSym.includes("FINNIFTY")) spotSecurityId = "27";
                                    else if (checkSym.includes("MIDCPNIFTY")) spotSecurityId = "26";
                                    else if (checkSym.includes("SENSEX")) spotSecurityId = "51";
                                    else if (checkSym.includes("BANKEX")) spotSecurityId = "52";
                                    // =========================================================
                                    

                                    // 👇👇👇 NAYA CODE YAHAN FIT HUA HAI 👇👇👇
                                    // =========================================================
                                    // 🧠 REGISTER TO GLOBAL MEMORY (For Live Tick Tracking - PAPER)
                                    // =========================================================
                                    activeRatioDeployments.set(deployment._id.toString(), {
                                        deploymentId: deployment._id.toString(),
                                        broker: broker,
                                        symbol: upperSymbol,
                                        spotSecurityId: spotSecurityId,
                                        status: 'ACTIVE',
                                        activeLegs: legsToExecute, // 🔥 Paper mode me 'legsToExecute' jayega
                                        
                                        // 🔥 NEW MARGIN & LOSS LIMITS 🔥
                                        estimatedMargin: estMargin,
                                        maxLossLimit: calcMaxLoss,
                                        
                                        // Guards Memory
                                        spotHistory: [],
                                        isPanicApiMode: false,
                                        isGammaShieldActive: false,
                                        highestLockedProfit: 0,
                                        
                                        // Config Settings
                                        vWindow: strategy.data?.advanceSettings?.gammaBlastSettings?.velocityWindow || 15,
                                        vPoints: strategy.data?.advanceSettings?.gammaBlastSettings?.velocityPoints || (upperSymbol.includes("BANK") ? 250 : 100),
                                        shieldConfig: strategy.data?.advanceSettings?.timeShieldSettings || null
                                    });
                                    console.log(`🎯 Engine Memory Updated! ${upperSymbol} is now under Paper Live Radar Tracking. (Max Loss Limit: -₹${calcMaxLoss.toFixed(2)})`);
                                    // =========================================================
                                }

                                // 5. REAL LIVE TRADE EXECUTION (BUY FIRST, SELL LATER)
                                else if (deployment.executionType === 'LIVE') {
                                    try {
                                        // 🟢 STEP A: FIRE BUY LEGS FIRST
                                        console.log(`🛒 Firing BUY Legs First...`);
                                        for (let leg of buyLegs) {
                                            const orderData = { action: 'BUY', quantity: leg.lots * leg.inst.lotSize, securityId: leg.inst.id, segment: "NSE_FNO", orderType: "MARKET" };
                                            const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

                                            if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
                                                const entryLTP = await fetchLiveLTP(broker.clientId, broker.apiSecret, orderData.segment, orderData.securityId) || leg.entryPrice;
                                                successfulLiveLegs.push({ ...leg, realEntryPrice: entryLTP, status: 'ACTIVE', orderId: orderResponse.data.orderId });
                                                console.log(`   ✅ BUY Executed: ${leg.lots} Lot(s) @ ₹${entryLTP}`);
                                            } else {
                                                executionFailed = true;
                                            }
                                        }

                                        if (executionFailed) throw new Error("BUY Legs execution failed. Halting.");

                                        // ⏳ Wait for Margin Benefit
                                        await sleep(1500);

                                        // 🔴 STEP B: FIRE SELL LEGS
                                        console.log(`🔥 Firing SELL Legs...`);
                                        for (let leg of sellLegs) {
                                            const orderData = { action: 'SELL', quantity: leg.lots * leg.inst.lotSize, securityId: leg.inst.id, segment: "NSE_FNO", orderType: "MARKET" };
                                            const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

                                            if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
                                                const entryLTP = await fetchLiveLTP(broker.clientId, broker.apiSecret, orderData.segment, orderData.securityId) || leg.entryPrice;
                                                successfulLiveLegs.push({ ...leg, realEntryPrice: entryLTP, status: 'ACTIVE', orderId: orderResponse.data.orderId });
                                                console.log(`   ✅ SELL Executed: ${leg.lots} Lot(s) @ ₹${entryLTP}`);
                                            } else {
                                                executionFailed = true;
                                                break; 
                                            }
                                        }

                                        // 🚑 Partial Fill Guard (Auto Square-Off)
                                        if (executionFailed) {
                                            console.log(`🚨 [EMERGENCY] Sell Leg Failed! Squaring off existing BUY positions...`);
                                            for (let safeLeg of successfulLiveLegs.filter(l => l.action === 'BUY')) {
                                                const sqData = { action: 'SELL', quantity: safeLeg.lots * safeLeg.inst.lotSize, securityId: safeLeg.inst.id, segment: "NSE_FNO", orderType: "MARKET" };
                                                await placeDhanOrder(broker.clientId, broker.apiSecret, sqData);
                                            }
                                            throw new Error("Margin Shortfall on Sell Leg.");
                                        }

                                        // 💾 Save to MongoDB
                                        for (let sLeg of successfulLiveLegs) {
                                            deployment.executedLegs.push({
                                                securityId: sLeg.inst.id, exchange: "NSE_FNO", symbol: `${upperSymbol} ${sLeg.strike} ${sLeg.type}`,
                                                action: sLeg.action, quantity: sLeg.lots * sLeg.inst.lotSize, entryPrice: sLeg.realEntryPrice,
                                                paperSlPrice: 0, status: 'ACTIVE', currentTrailedSL: null, entryReason: "Ratio Spread Live"
                                            });
                                        }
                                        deployment.status = 'ACTIVE';
                                        await deployment.save();
                                        await createAndEmitLog(broker, strategy.name, "DEPLOY", 1, 'SUCCESS', `Live Ratio Spread Executed Successfully.`);
                                        
                                        // =========================================================
                                        // 🔌 START WEBSOCKET & SUBSCRIBE LIVE TOKENS
                                        // =========================================================
                                        // 1. Agar websocket connected nahi hai, toh connect karo
                                        if (!dhanStreamer.isConnected) {
                                            dhanStreamer.connect(broker.clientId, broker.apiSecret); 
                                        }

                                        // 2. Successful legs me se token IDs (SecurityId) nikalo
                                        const liveTokens = successfulLiveLegs.map(leg => leg.inst.id);
                                        
                                        // 3. Dhan API ko bolo in tokens par nazar rakhe
                                        if (liveTokens.length > 0) {
                                            setTimeout(() => {
                                                dhanStreamer.subscribeTokens("NSE_FNO", liveTokens);
                                            }, 2000); 
                                        }
                                        // =========================================================

                                        // =========================================================
                                        // 🧮 CALCULATE MARGIN & MAX LOSS FOR LIVE
                                        // =========================================================
                                        let estMargin = 150000; // Fallback Default
                                        try {
                                            const todayStr = new Date().toISOString().split('T')[0];
                                            const isExpDay = isThisExpiryDay(todayStr, upperSymbol, strategy.data?.legs[0]?.expiry || "WEEKLY");
                                            estMargin = calculateApproxBasketMargin(successfulLiveLegs, upperSymbol, isExpDay);
                                        } catch (e) {
                                            console.log(`⚠️ Margin calculation fallback used.`);
                                        }
                                        
                                        const userMaxLossAmt = Number(strategy.data?.advanceSettings?.maxLoss || 0);
                                        const calcMaxLoss = userMaxLossAmt > 0 ? userMaxLossAmt : (estMargin * (Number(strategy.data?.advanceSettings?.maxLossPct || 1) / 100));


                          
                                        // =========================================================
                                        // 🔍 FIND SPOT SECURITY ID (For Velocity Guard)
                                        // =========================================================
                                        let spotSecurityId = "13"; // Default NIFTY 50
                                        const checkSym = String(upperSymbol).toUpperCase().replace(/\s+/g, '');
                                        
                                        if (checkSym.includes("BANKNIFTY") || checkSym === "NIFTYBANK") spotSecurityId = "25";
                                        else if (checkSym.includes("FINNIFTY")) spotSecurityId = "27";
                                        else if (checkSym.includes("MIDCPNIFTY")) spotSecurityId = "26";
                                        else if (checkSym.includes("SENSEX")) spotSecurityId = "51";
                                        else if (checkSym.includes("BANKEX")) spotSecurityId = "52";
                                        // =========================================================
                               

                                        // =========================================================
                                        // 🧠 REGISTER TO GLOBAL MEMORY (For Live Tick Tracking)
                                        // =========================================================
                                        activeRatioDeployments.set(deployment._id.toString(), {
                                            deploymentId: deployment._id.toString(),
                                            broker: broker,
                                            symbol: upperSymbol,
                                            spotSecurityId: spotSecurityId,
                                            status: 'ACTIVE',
                                            activeLegs: successfulLiveLegs, // 🔥 LIVE me successfulLiveLegs
                                            
                                            // 🔥 NEW MARGIN & LOSS LIMITS 🔥
                                            estimatedMargin: estMargin,
                                            maxLossLimit: calcMaxLoss,
                                            
                                            // Guards Memory
                                            spotHistory: [],
                                            isPanicApiMode: false,
                                            isGammaShieldActive: false,
                                            highestLockedProfit: 0,
                                            
                                            // Config Settings
                                            vWindow: strategy.data?.advanceSettings?.gammaBlastSettings?.velocityWindow || 15,
                                            vPoints: strategy.data?.advanceSettings?.gammaBlastSettings?.velocityPoints || (upperSymbol.includes("BANKNIFTY") ? 250 : 100),
                                            shieldConfig: strategy.data?.advanceSettings?.timeShieldSettings || null
                                        });
                                        console.log(`🎯 Engine Memory Updated! ${upperSymbol} is now under LIVE Radar Tracking. (Max Loss Limit: -₹${calcMaxLoss.toFixed(2)})`);
                                        // =========================================================

                                    } catch (error) {
                                        await createAndEmitLog(broker, strategy.name, "FAILED", 0, 'FAILED', `Execution Aborted: ${error.message}`);
                                    }
                                }
                                
                            } 
                            else {
                    
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
