// const mongoose = require('mongoose');
// const crypto = require('crypto');
// const Strategy = require('../models/Strategy');
// const HistoricalData = require('../models/HistoricalData');
// const Broker = require('../models/Broker');
// const BacktestCache = require('../models/BacktestCache');

// const { calculateIndicator, extractParams, evaluateCondition } = require('../services/indicatorService');
// const { getOptionSecurityId, sleep, getFutureSecurityId } = require('../services/instrumentService');
// const { fetchDhanHistoricalData, fetchExpiredOptionData } = require('../services/dhanService');

// const { evaluateTrailingSL } = require('../engine/features/riskManagement/trailingLogic');
// const { evaluateMtmLogic } = require('../engine/features/riskManagement/mtmSquareOff');
// const { evaluateExitAllLogic } = require('../engine/features/advanceFeatures/exitAllOnSlTgt');

// const { processWaitAndTrade } = require('../engine/features/advanceFeatures/waitAndTrade');

// const { calculateTrailedSL } = require('../engine/features/advanceFeatures/trailSL');
// const { evaluateReEntryLogic } = require('../engine/features/advanceFeatures/reEntryLogic'); // 🔥 NAYA IMPORT


// const { isTradingHoliday } = require('../engine/utils/holidaysCalendar');
// const { getNearestExpiryString } = require('../engine/utils/expiryCalculator'); // ✅ Yeh NAYA add karein

// const { calculateApproxBasketMargin } = require('../engine/utils/marginCalculator');
// const { isThisExpiryDay } = require('../engine/utils/expiryCalculator');

// const { identifyMechanicalStructure, checkPriceActionSignal } = require('../engine/scanners/priceActionScanner.js');

// const SMCEntryEngine = require('../engine/scanners/SMCEntryEngine.js');

// const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


// const TimeBasedEngine = require('../engine/timeBasedEngine');
// const TimeBasedRiskManager = require('../engine/features/riskManagement/TimeBasedRiskManager');



// // 🔥 PRO FIX: 1-मिनट की कैंडल्स को जोड़कर Higher Timeframe (HTF) कैंडल बनाने का लॉजिक
// const buildHtfCandles = (ltfCandles, htfMinutes) => {
//     let htfCandles = [];
//     let currentHtf = null;
//     const periodMs = parseInt(htfMinutes) * 60 * 1000;

//     for (let candle of ltfCandles) {
//         const candleTime = new Date(candle.timestamp).getTime();
//         // समय को 5-मिनट (या 15-मिनट) के ब्लॉक में राउंड-ऑफ करें
//         const blockTime = Math.floor(candleTime / periodMs) * periodMs;

//         if (!currentHtf || currentHtf.blockTime !== blockTime) {
//             if (currentHtf) htfCandles.push(currentHtf);
//             currentHtf = {
//                 timestamp: candle.timestamp, // कैंडल शुरू होने का समय
//                 blockTime: blockTime,
//                 open: candle.open,
//                 high: candle.high,
//                 low: candle.low,
//                 close: candle.close
//             };
//         } else {
//             // अगर उसी 5-मिनट ब्लॉक की कैंडल है, तो High/Low अपडेट करो
//             currentHtf.high = Math.max(currentHtf.high, candle.high);
//             currentHtf.low = Math.min(currentHtf.low, candle.low);
//             currentHtf.close = candle.close; // आख़िरी कैंडल का क्लोज़ ही HTF का क्लोज़ होता है
//         }
//     }
//     if (currentHtf) htfCandles.push(currentHtf);
//     return htfCandles;
// };


// const getTradingDaysToExpiry = (currentDate, expiryString) => {
//     if (!expiryString) return 0;
//     const datePart = expiryString.split('EXP ')[1];
//     if (!datePart) return 0;
//     const day = parseInt(datePart.substring(0, 2));
//     const monthMap = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
//     const month = monthMap[datePart.substring(2, 5)];
//     const year = parseInt("20" + datePart.substring(5, 7));
//     const expDate = new Date(year, month, day);
//     expDate.setHours(0, 0, 0, 0);

//     const currDate = new Date(currentDate);
//     currDate.setHours(0, 0, 0, 0);

//     let dte = 0;
//     let tempDate = new Date(currDate);
//     while (tempDate < expDate) {
//         tempDate.setDate(tempDate.getDate() + 1);
//         if (tempDate.getDay() !== 0 && tempDate.getDay() !== 6 && !isTradingHoliday(tempDate)) dte++;
//     }
//     return dte;
// };


// // 🛡️ THE SEBI AUTO-CORRECTOR FOR DHAN API PAYLOAD
// const autoCorrectExpiryType = (symbolStr, dateStr, reqExpiry) => {
//     let upperReqExpiry = (reqExpiry || "WEEKLY").toUpperCase();
//     if (upperReqExpiry === "MONTHLY") return "MONTHLY";
    
//     let checkSym = symbolStr.toUpperCase().replace(' 50', '').replace(' BANK', '').trim();
//     if (checkSym === "NIFTY FINANCIAL SERVICES") checkSym = "FINNIFTY";
//     if (checkSym === "NIFTY MID SELECT") checkSym = "MIDCPNIFTY";
    
//     const dDate = new Date(dateStr);
//     // SEBI Updates: Auto-convert Discontinued Weeklies to Monthly
//     if (checkSym === "BANKNIFTY" && dDate > new Date("2024-11-13")) return "MONTHLY";
//     if (checkSym === "FINNIFTY" && dDate > new Date("2024-11-19")) return "MONTHLY";
//     if (checkSym === "MIDCPNIFTY" && dDate > new Date("2024-11-18")) return "MONTHLY";
    
//     return upperReqExpiry;
// };


// const withRetry = async (apiCallFn, maxRetries = 3, delayMs = 1500) => {
//     for (let i = 0; i < maxRetries; i++) {
//         try {
//             const result = await apiCallFn();
//             if ((result && result.success && result.data && result.data.close) ||
//                 (result && result.data && result.data.data)) {
//                 return result;
//             }
//             console.log(`⚠️ Dhan API Empty. Cooling down (${i + 1}/${maxRetries})...`);
//             await delay(delayMs * (i + 1));
//         } catch (error) {
//             const status = error.response ? error.response.status : 0;
//             if (status === 429 || (error.response && error.response.data && error.response.data.errorCode === 'DH-904')) {
//                 console.log(`🛑 Rate Limit (429) on Entry! 5-sec cooldown...`);
//                 await delay(5000);
//             } else {
//                 await delay(delayMs * (i + 1));
//             }
//         }
//     }
//     return { success: false, data: null };
// };

// const runBacktestSimulator = async (req, res) => {
//     req.setTimeout(0);
//     res.setHeader('Content-Type', 'text/event-stream');
//     res.setHeader('Cache-Control', 'no-cache');
//     res.setHeader('Connection', 'keep-alive');
//     res.flushHeaders();

//     const heartbeat = setInterval(() => { res.write(`: keep-alive-ping\n\n`); }, 25000);
//     req.on('close', () => { clearInterval(heartbeat); });

//     res.write(`data: ${JSON.stringify({ type: 'START', message: 'Engine warming up...' })}\n\n`);

//     try {
//         const { strategyId } = req.params;
//         const { period, start, end, slippage } = req.query;
//         const useRealisticSlippage = slippage !== 'false';

//         const strategy = await Strategy.collection.findOne({ _id: new mongoose.Types.ObjectId(strategyId) });
//         if (!strategy) {
//             res.write(`data: ${JSON.stringify({ type: 'ERROR', message: 'Strategy not found' })}\n\n`);
//             return res.end();
//         }

//         const paSettingsGlobal = strategy.data?.priceActionSettings || strategy.priceActionSettings || {};
        
//         const showD2S_DOB = req.query.showD2S_DOB !== undefined ? String(req.query.showD2S_DOB) === "true" : (paSettingsGlobal.showD2S_DOB !== false);
//         const showD2S_DOF = req.query.showD2S_DOF !== undefined ? String(req.query.showD2S_DOF) === "true" : (paSettingsGlobal.showD2S_DOF !== false);
//         const showD2S_EOB = req.query.showD2S_EOB !== undefined ? String(req.query.showD2S_EOB) === "true" : (paSettingsGlobal.showD2S_EOB !== false);
//         const showD2S_EOF = req.query.showD2S_EOF !== undefined ? String(req.query.showD2S_EOF) === "true" : (paSettingsGlobal.showD2S_EOF !== false);

//         console.log(`\n🚀 Running MULTI-LEG Backtest for: ${strategy.name} | Period: ${period || '1M'}`);

//         let endDate = new Date();
//         let startDate = new Date();

//         if (period === 'Custom' && start && end) {
//             startDate = new Date(start);
//             endDate = new Date(end);
            
//             // 🔥 THE FIX: अगर 'end' स्ट्रिंग में 'T' मौजूद है, तो इसका मतलब टाइम भी भेजा गया है।
//             // ऐसी स्थिति में setHours को स्किप करो ताकि यूज़र का चुना हुआ टाइम (जैसे 11:30 AM) सुरक्षित रहे।
//             if (typeof end === 'string' && !end.includes('T')) {
//                 endDate.setHours(23, 59, 59, 999);
//             }
//         }
//         else if (period === '1M') startDate.setMonth(startDate.getMonth() - 1);
//         else if (period === '3M') startDate.setMonth(startDate.getMonth() - 3);
//         else if (period === '6M') startDate.setMonth(startDate.getMonth() - 6);
//         else if (period === '1Y') startDate.setFullYear(startDate.getFullYear() - 1);
//         else if (period === '2Y') startDate.setFullYear(startDate.getFullYear() - 2);
//         else startDate.setMonth(startDate.getMonth() - 1);

//         const dhanIdMap = {
//             "NIFTY": "13", "NIFTY 50": "13", "BANKNIFTY": "25", "NIFTY BANK": "25",
//             "FINNIFTY": "27", "NIFTY FIN SERVICE": "27", "MIDCPNIFTY": "442", "NIFTY MID SELECT": "442",
//             "SENSEX": "51", "BSE SENSEX": "51", "BANKEX": "69", "BSE BANKEX": "69"
//         };

//         const exchangeMap = {
//             "SENSEX": "BSE_FNO", "BSE SENSEX": "BSE_FNO",
//             "BANKEX": "BSE_FNO", "BSE BANKEX": "BSE_FNO"
//         };

//         const instrumentsArr = strategy.instruments || strategy.data?.instruments || [];
//         const instrumentData = instrumentsArr.length > 0 ? instrumentsArr[0] : {};
//         const symbol = instrumentData.name || instrumentData.symbol || "BANKNIFTY";
//         const upperSymbol = symbol.toUpperCase().trim();
//         const isOptionsTrade = instrumentData.segment === "Option" || instrumentData.segment === "NFO";

//         // 🔥 THE UNDERLYING FIX (Spot vs Future)
//         const underlyingType = strategy.config?.underlying || strategy.data?.config?.underlying || "Spot";
        
//         let exchangeSegment = "IDX_I";
//         let instrumentType = "INDEX";
//         let dbCacheSymbol = (upperSymbol === "BANKEX") ? "BANKEX_V2" : upperSymbol; // MongoDB me Spot aur Future alag alag save honge!

//         if (underlyingType === "Future") {
//             exchangeSegment = "NSE_FNO";
//             instrumentType = "FUTIDX";
//             dbCacheSymbol = `${upperSymbol}_FUT`; // e.g., BANKNIFTY_FUT
//         } else {
//             if (upperSymbol.includes("NIFTY") || upperSymbol.includes("SENSEX") || upperSymbol === "BANKNIFTY" || upperSymbol === "NIFTY BANK") {
//                 exchangeSegment = "IDX_I";
//             }
//         }

//         const cleanSymbolForMap = upperSymbol.replace(' 50', '').trim();
//         const spotSecurityId = instrumentData.securityId || dhanIdMap[upperSymbol] || dhanIdMap[cleanSymbolForMap] || "25";

//         // 🔥 MULTI-TIMEFRAME SETUP
//         let htfTimeframe = "15"; // Default Master Trend
//         let ltfTimeframe = "1";  // Default Entry Trigger

//         // DB में सेव्ड Price Action सेटिंग्स से टाइमफ्रेम निकालें
//         if (strategy.type === "Price Action Based" || strategy.data?.type === "Price Action Based") {
//             const paSettings = strategy.data?.priceActionSettings || strategy.priceActionSettings || {};
//             htfTimeframe = paSettings.masterTimeframe ? String(paSettings.masterTimeframe).replace(' min', '').trim() : "15";
//             ltfTimeframe = paSettings.entryTimeframe ? String(paSettings.entryTimeframe).replace(' min', '').trim() : "1";
//         } else {
//             // पुरानी स्ट्रेटेजीज़ (Indicator/Time Based) के लिए Fallback
//             const rawInterval = strategy.interval || strategy.config?.interval || strategy.data?.config?.interval;
//             ltfTimeframe = rawInterval ? String(rawInterval).replace(' min', '').trim() : "5";
//             htfTimeframe = ltfTimeframe; // अगर Price Action नहीं है, तो दोनों सेम रहेंगे
//         }

//         // 🔥 पुराने कोड को क्रैश होने से बचाने के लिए (Backwards Compatibility)
//         let timeframe = ltfTimeframe; 

//         console.log(`⏱️ Engine Timeframes -> HTF: ${htfTimeframe}m | LTF: ${ltfTimeframe}m`);

//        // =========================================================
//         // 🔐 THE FINGERPRINT FIX
//         // =========================================================
//         const advanceFeaturesSettings = strategy.data?.advanceSettings || strategy.advanceSettings || strategy.data?.advanceFeatures || strategy.advanceFeatures || {};
//         let riskSettings = strategy.data?.riskManagement || strategy.riskManagement || {};

//         // 🔥 GHOST POCKET FIX: UI kisi bhi folder me MaxLoss dale, yahan pakda jayega!
//         riskSettings.maxProfit = riskSettings.maxProfit || strategy.data?.config?.maxProfit || strategy.config?.maxProfit || strategy.data?.maxProfit || strategy.maxProfit || 0;
//         riskSettings.maxLoss = riskSettings.maxLoss || strategy.data?.config?.maxLoss || strategy.config?.maxLoss || strategy.data?.maxLoss || strategy.maxLoss || 0;
//         riskSettings.profitTrailing = riskSettings.profitTrailing || strategy.data?.config?.profitTrailing || strategy.config?.profitTrailing || "No Trailing";

//         const findConditions = (obj) => {
//             if (!obj || typeof obj !== 'object') return null;
//             if (obj.longRules && Array.isArray(obj.longRules)) return obj;
//             if (Array.isArray(obj)) {
//                 for (let item of obj) { const found = findConditions(item); if (found) return found; }
//             } else {
//                 for (let key in obj) { const found = findConditions(obj[key]); if (found) return found; }
//             }
//             return null;
//         };

//         let entryConds = findConditions(strategy);
//         let exitConds = {};
//         const possibleExits = strategy.exitConditions || strategy.data?.exitConditions || strategy.data?.entrySettings?.exitConditions || [];
//         if (Array.isArray(possibleExits) && possibleExits.length > 0) exitConds = possibleExits[0];
//         else if (possibleExits && typeof possibleExits === 'object' && !Array.isArray(possibleExits)) exitConds = possibleExits;

//         // 🔥 THE FIX: Yahan se duplicate sTime, sqTime hata diye gaye hain!
//         const sTime = strategy.startTime || strategy.entryTime || strategy.config?.startTime || strategy.config?.entryTime || strategy.data?.config?.startTime || strategy.data?.config?.entryTime || strategy.entrySettings?.startTime || strategy.data?.entrySettings?.startTime;
//         const sqTime = strategy.config?.squareOff || strategy.data?.config?.squareOff || strategy.config?.squareOffTime || strategy.data?.config?.squareOffTime || "03:15 PM";
//         const txnType = strategy.config?.transactionType || strategy.data?.config?.transactionType || 'Both Side';
//         const isTimeBased = (strategy.config?.strategyType === 'Time Based' || strategy.data?.config?.strategyType === 'Time Based' || strategy.type === 'Time Based');

//         // 🔥 THE CNC VARIABLES
//         const orderType = strategy.data?.config?.orderType || strategy.config?.orderType || "MIS";
//         const cncEntryDays = Number(strategy.data?.config?.cncEntryDays ?? strategy.config?.cncEntryDays ?? 4);
//         const cncExitDays = Number(strategy.data?.config?.cncExitDays ?? strategy.config?.cncExitDays ?? 1);
//         // =========================================================
//         // 🗓️ THE FIX 1: EXTRACT ALLOWED TRADING DAYS
//         // =========================================================
//         const rawDays = strategy.config?.days || strategy.data?.config?.days || ["MON", "TUE", "WED", "THU", "FRI"];
//         const allowedDaysNames = (Array.isArray(rawDays) && rawDays.length > 0) ? rawDays : ["MON", "TUE", "WED", "THU", "FRI"];

//         // JS getDay() format: SUN:0, MON:1, TUE:2, WED:3, THU:4, FRI:5, SAT:6
//         const dayMap = { "SUN": 0, "MON": 1, "TUE": 2, "WED": 3, "THU": 4, "FRI": 5, "SAT": 6 };
//         const allowedDaysNum = allowedDaysNames.map(d => dayMap[d.toUpperCase()]).filter(n => n !== undefined);
//         // =========================================================

//         const strategyConfigString = JSON.stringify({
//             legs: strategy.legs || strategy.data?.legs,
//             entryConds: entryConds,
//             exitConds: exitConds,
//             timeframe: timeframe,
//             advanceFeatures: advanceFeaturesSettings,
//             riskManagement: riskSettings,
//             slippage: useRealisticSlippage,
//             priceActionSettings: strategy.data?.priceActionSettings || strategy.priceActionSettings || {}, // 🔥 NEW: Cache Hash Update
//             startTime: sTime,
//             squareOffTime: sqTime,
//             transactionType: txnType,
//             isTimeBased: isTimeBased,
//             allowedDays: allowedDaysNames,
//             orderType: orderType, // 🔥 Cache update for CNC
//             cncEntryDays: cncEntryDays,
//             cncExitDays: cncExitDays,
//             version: "SMC_V1"
//         });
//         const configHash = crypto.createHash('md5').update(strategyConfigString).digest('hex');

//         // =========================================================
//         // 🧠 BULK MEMORY FETCH
//         // =========================================================
//         const savedDaysCache = await BacktestCache.find({
//             strategyId: strategy._id,
//             configHash: configHash,
//             date: {
//                 $gte: startDate.toISOString().split('T')[0],
//                 $lte: endDate.toISOString().split('T')[0]
//             }
//         }).lean();

//         const bulkCacheMap = {};
//         savedDaysCache.forEach(doc => { bulkCacheMap[doc.date] = doc; });

//         const cachedDaysCount = Object.keys(bulkCacheMap).length;
//         if (cachedDaysCount > 0) {
//             console.log(`📦 Loaded ${cachedDaysCount} pre-calculated days from DB Memory Map!`);
//             res.write(`data: ${JSON.stringify({ type: 'PROGRESS', date: `Fast-forwarding ${cachedDaysCount} saved days...`, percent: 10 })}\n\n`);
//         } else {
//             console.log(`🧹 No Cache Found for this ConfigHash. Running FRESH backtest!`);
//         }

//         // =========================================================
//         // 📡 DATA DOWNLOADING (The Ant Strategy - Spot/Future Ready)
//         // =========================================================
//         let cachedData = await HistoricalData.find({
//             symbol: dbCacheSymbol,
//             timeframe: ltfTimeframe, // 🔥 FIX: ab LTF timeframe se data check hoga
//             timestamp: { $gte: startDate, $lte: endDate }
//         }).sort({ timestamp: 1 }).lean();

//         let shouldFetchFromDhan = false;
//         if (cachedData.length === 0) {
//             shouldFetchFromDhan = true;
//         } else {
//             const dbStartDate = cachedData[0].timestamp;
//             const dbEndDate = cachedData[cachedData.length - 1].timestamp;
//             if (dbStartDate > new Date(startDate.getTime() + 86400000) || dbEndDate < new Date(endDate.getTime() - 86400000)) {
//                 shouldFetchFromDhan = true;
//                 // 🔥 FIX: Puraana data delete karte waqt bhi ltfTimeframe use hoga
//                 await HistoricalData.deleteMany({ symbol: dbCacheSymbol, timeframe: ltfTimeframe, timestamp: { $gte: startDate, $lte: endDate } });
//             }
//         }

//         let broker = null;
//         if (shouldFetchFromDhan || isOptionsTrade) {
//             broker = await Broker.findOne({ engineOn: true });
//             if (!broker) {
//                 res.write(`data: ${JSON.stringify({ type: 'ERROR', message: 'No active broker found for API keys' })}\n\n`);
//                 return res.end();
//             }
//         }

//         if (shouldFetchFromDhan) {
//             let chunkedRanges = [];
//             let currentStart = new Date(startDate);
//             while (currentStart <= endDate) {
//                 let currentEnd = new Date(currentStart);
//                 currentEnd.setDate(currentStart.getDate() + 4);
//                 if (currentEnd > endDate) currentEnd = new Date(endDate);
//                 chunkedRanges.push({ start: new Date(currentStart), end: new Date(currentEnd) });
//                 currentStart.setDate(currentStart.getDate() + 5);
//             }

//             for (let range of chunkedRanges) {
//                 // UI ko batao ki Spot fetch ho raha hai ya Future
//                 res.write(`data: ${JSON.stringify({ type: 'PROGRESS', date: `Fetching ${underlyingType} Data: ${range.start.toISOString().split('T')[0]}`, percent: 0 })}\n\n`);

//                 let targetSecurityId = spotSecurityId;
//                 let finalExchange = exchangeSegment;
//                 let finalInstType = instrumentType;

//                 if (underlyingType === "Future" && typeof getFutureSecurityId === 'function') {
//                     const futId = await getFutureSecurityId(upperSymbol, range.start.toISOString().split('T')[0]);
//                     if (futId) {
//                         targetSecurityId = futId;
//                     } else {
//                         console.log(`⚠️ Future ID not found for ${range.start.toISOString().split('T')[0]}. Falling back to Spot Data.`);
//                         targetSecurityId = spotSecurityId;
//                         finalExchange = "IDX_I";
//                         finalInstType = "INDEX";
//                     }
//                 }

//                 // API call me LTF timeframe jayega
//                 const dhanRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, targetSecurityId, exchangeSegment, instrumentType, range.start.toISOString().split('T')[0], range.end.toISOString().split('T')[0], ltfTimeframe);
//                 const timeArray = dhanRes.data ? (dhanRes.data.start_Time || dhanRes.data.timestamp) : null;

//                 if (dhanRes.success && timeArray) {
//                     const { open, high, low, close, volume } = dhanRes.data;
//                     const bulkOps = [];
//                     for (let i = 0; i < timeArray.length; i++) {
//                         let ms = timeArray[i];
//                         if (ms < 10000000000) ms = ms * 1000;
//                         bulkOps.push({ insertOne: { document: { symbol: dbCacheSymbol, timeframe: ltfTimeframe, timestamp: new Date(ms), open: open[i], high: high[i], low: low[i], close: close[i], volume: volume[i] } } });
//                     }
//                     if (bulkOps.length > 0) await HistoricalData.bulkWrite(bulkOps, { ordered: false }).catch(e => console.log("Duplicates ignored"));
//                 }

//                 await delay(1000);
//             }
//         } // 🛑 THE FIX: shouldFetchFromDhan YAHAN BAND HOGA!

//         // ==========================================
//         // 📥 HTF MANAGER DATA PROCESSING (Asli Machine)
//         // ==========================================
//         // Ye code ab HAMESHA chalega, chahe API call hui ho ya seedha DB se aaya ho!
//         cachedData = await HistoricalData.find({ symbol: dbCacheSymbol, timeframe: ltfTimeframe, timestamp: { $gte: startDate, $lte: endDate } }).sort({ timestamp: 1 }).lean();
        
//         if (cachedData.length === 0) {
//             res.write(`data: ${JSON.stringify({ type: 'ERROR', message: `${underlyingType} Data not available for this period.` })}\n\n`);
//             return res.end();
//         }

//         let cachedHtfData = []; // 🔥 GLOBAL VAR (Ab iski shadow copy nahi banegi)
//         if (htfTimeframe !== ltfTimeframe) {
//             cachedHtfData = buildHtfCandles(cachedData, htfTimeframe);
//             console.log(`🧠 MANAGER READY: Aggregated ${cachedData.length} LTF candles into ${cachedHtfData.length} HTF candles!`);
//         } else {
//             cachedHtfData = cachedData;
//         }
        

//         // =========================================================
//         // --- INDICATOR CALCULATION SETUP ---
//         // =========================================================
//         const calcLongInd1 = []; const calcLongInd2 = [];
//         const calcShortInd1 = []; const calcShortInd2 = []; // 🔥 THE FIX: ये दोनों डिक्लेयर करना भूल गए थे!

//         // Long Rules Calculation
//         if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
//             entryConds.longRules.forEach((rule, idx) => {
//                 calcLongInd1[idx] = calculateIndicator({ ...rule.ind1, params: extractParams(rule.ind1, rule.params) }, cachedData);
//                 calcLongInd2[idx] = calculateIndicator({ ...rule.ind2, params: extractParams(rule.ind2, null) }, cachedData);
//             });
//         }

//         // 🔥 THE FIX: Short Rules का डेटा भी कैलकुलेट करना ज़रूरी है!
//         if (entryConds && entryConds.shortRules && entryConds.shortRules.length > 0) {
//             entryConds.shortRules.forEach((rule, idx) => {
//                 calcShortInd1[idx] = calculateIndicator({ ...rule.ind1, params: extractParams(rule.ind1, rule.params) }, cachedData);
//                 calcShortInd2[idx] = calculateIndicator({ ...rule.ind2, params: extractParams(rule.ind2, null) }, cachedData);
//             });
//         }

//         const rawExitLongRules = exitConds.longRules || [];
//         const rawExitShortRules = exitConds.shortRules || [];
//         const exitLongRules = rawExitLongRules.filter(rule => rule.ind1 && (rule.ind1.id || rule.ind1.display));
//         const exitShortRules = rawExitShortRules.filter(rule => rule.ind1 && (rule.ind1.id || rule.ind1.display));

//         const calcExitLongInd1 = []; const calcExitLongInd2 = [];
//         if (exitLongRules.length > 0) {
//             exitLongRules.forEach((rule, idx) => {
//                 calcExitLongInd1[idx] = calculateIndicator({ ...rule.ind1, params: extractParams(rule.ind1, rule.params) }, cachedData);
//                 calcExitLongInd2[idx] = calculateIndicator({ ...rule.ind2, params: extractParams(rule.ind2, null) }, cachedData);
//             });
//         }
        
//         const calcExitShortInd1 = []; const calcExitShortInd2 = [];
//         if (exitShortRules.length > 0) {
//             exitShortRules.forEach((rule, idx) => {
//                 calcExitShortInd1[idx] = calculateIndicator({ ...rule.ind1, params: extractParams(rule.ind1, rule.params) }, cachedData);
//                 calcExitShortInd2[idx] = calculateIndicator({ ...rule.ind2, params: extractParams(rule.ind2, null) }, cachedData);
//             });
//         }

//         // =========================================================
//         // --- ENGINE VARIABLES & THE GLOBAL MAX PROFIT FIX ---
//         // =========================================================
//         let currentEquity = 0, peakEquity = 0, maxDrawdown = 0;
//         let winDays = 0, lossDays = 0, winTrades = 0, lossTrades = 0;
//         let currentWinStreak = 0, currentLossStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
//         let maxProfitTrade = 0, maxLossTrade = 0;
//         let equityCurve = [];
//         let daywiseBreakdown = [];
//         let dailyBreakdownMap = {};

//         let optionDataCache = {};
//         let openTrades = [];
//         let pendingReEntries = []; // 🔥 NAYA HOSPITAL
//         const strategyLegs = strategy.legs || strategy.data?.legs || [];

//         // 🔥 FIX 1: Math.abs ensures NO negative sign bugs from UI!
//         const globalMaxProfit = Math.abs(Number(riskSettings.maxProfit) || 0);
//         const globalMaxLoss = Math.abs(Number(riskSettings.maxLoss) || 0);

//         let exitMin = 915;
//         if (sqTime) {
//             const [eh, emStr] = sqTime.split(':');
//             if (emStr) {
//                 const em = emStr.split(' ')[0];
//                 let h = parseInt(eh);
//                 if (sqTime.toUpperCase().includes('PM') && h !== 12) h += 12;
//                 if (sqTime.toUpperCase().includes('AM') && h === 12) h -= 12;
//                 exitMin = h * 60 + parseInt(em);
//             }
//         }

//         // 🔥 BTST TIME PARSER 🔥
//         const nextDaySqTimeStr = strategy.data?.config?.nextDaySquareOff || strategy.config?.nextDaySquareOff || "09:15 AM";
//         let nextDayExitMin = 555; // Default 09:15 AM
//         if (nextDaySqTimeStr) {
//             const [neh, nemStr] = nextDaySqTimeStr.split(':');
//             if (nemStr) {
//                 const nem = nemStr.split(' ')[0];
//                 let nh = parseInt(neh);
//                 if (nextDaySqTimeStr.toUpperCase().includes('PM') && nh !== 12) nh += 12;
//                 if (nextDaySqTimeStr.toUpperCase().includes('AM') && nh === 12) nh -= 12;
//                 nextDayExitMin = nh * 60 + parseInt(nem);
//             }
//         }

//         // 🛡️ BTST & CNC ENTRY PROTECTOR 🛡️
//         // Agar BTST hai, toh engine ko 15:30 (Market Close) tak entry lene do! 
//         // Default 15:15 square-off rules ko bypass karo.
//         if (orderType === "BTST" || orderType === "CNC") {
//             exitMin = 930; // 15:30 minutes
//             if (typeof noTradeMin !== 'undefined') noTradeMin = 930; 
//         }

//         let isTradingHaltedForDay = false;
//         let currentDayTracker = "";
//         let newDaysToCache = [];

//         const calculateATM = (spotPrice, symbolStr) => {
//             if (symbolStr.includes("BANK")) return Math.round(spotPrice / 100) * 100;
//             return Math.round(spotPrice / 50) * 50;
//         };

//         const calcTradePnL = (entryP, exitP, qty, action) => {
//             if (action === "BUY") return (exitP - entryP) * qty;
//             return (entryP - exitP) * qty;
//         };



//         // =========================================================
//         // 🧠 INITIALIZE BACKTEST SNIPER ENGINE
//         // =========================================================
//         let backtestSniper = null;
//         if (strategy.type === "Price Action Based" || strategy.data?.type === "Price Action Based") {
//             const paConfig = strategy.data?.config || strategy.config || {};
            
//             let userSlValue = strategyLegs[0]?.slValue || paConfig.maxSlPoints || 20;
//             let sniperMaxSl = Number(userSlValue);

//             // 🔥 THE FIX: DB से यूज़र का Exact Setup और Triggers निकालो
//             const userSmcSetup = strategyLegs[0]?.smcSetup || {};
//             const dbTriggers = userSmcSetup.entryTriggers || paConfig.entryTriggers || ['DIRECT ENTRY', 'POI ENTRY', 'SCOB ENTRY'];
            
//             // 🛡️ Name Normalizer: UI से "ENTRY on POI 50%" आता है, लेकिन इंजन "POI 50% ENTRY" समझता है
//             const normalizedTriggers = dbTriggers.map(t => {
//                 if(t === "ENTRY on POI 50%") return "POI 50% ENTRY";
//                 if(t === "ENTRY on SCOB 50%") return "SCOB 50% ENTRY";
//                 return t;
//             });

//             backtestSniper = new SMCEntryEngine({
//                 maxSlPoints: sniperMaxSl, 
//                 entryTriggers: normalizedTriggers, // 🔥 अब स्नाइपर सिर्फ यूज़र के भेजे रूल्स मानेगा!
//                 htf: htfTimeframe + ' min',
//                 ltf: ltfTimeframe + ' min'
//             });
//             console.log(`🔫 Sniper Engine Loaded! Max SL: ${sniperMaxSl} | User Triggers: ${normalizedTriggers.join(', ')}`);
//         }


//         // =========================================================
//         // 🚀 NEW ENGINE SETUP: THE RATIO SPREAD ISOLATOR
//         // =========================================================
//         const isRatioSpreadStrategy = strategyLegs.some(leg => leg?.strikeCriteria === 'Ratio Spread (Prem/X)');
//         let ratioEngine = null;

//         console.log(`\n🔍 [DEBUG] Strategy: ${strategy.name} | Legs Count: ${strategyLegs.length} | Entry Time: ${sTime} | Symbol: ${upperSymbol}`);
//         console.log(`🚦 Mode: ${isRatioSpreadStrategy ? 'RATIO SPREAD ENGINE' : 'LEGACY ENGINE'}\n`);


//         // =========================================================
//         // ⏱️ THE MAIN CANDLE LOOP
//         // =========================================================
//         // console.log(`\n🔍 [DEBUG] Strategy: ${strategy.name} | Legs Count: ${strategyLegs.length} | Entry Time: ${sTime} | Symbol: ${upperSymbol}\n`);
//         for (let i = 0; i < cachedData.length; i++) {
//             if (i % 500 === 0) await new Promise(resolve => setImmediate(resolve));

//             const candle = cachedData[i];
//             const candleTime = new Date(candle.timestamp).getTime();
//             const istDate = new Date(candleTime + (5.5 * 60 * 60 * 1000));

//             // =========================================================
//             // 🚫 THE FIX 3: SKIP UNAUTHORIZED DAYS
//             // =========================================================
//             const currentDayOfWeek = istDate.getDay();
//             if (!allowedDaysNum.includes(currentDayOfWeek)) {
//                 continue; // Agar aaj ka din list me nahi hai, toh seedha agli candle par jao!
//             }
//             // =========================================================

//             const h = String(istDate.getUTCHours()).padStart(2, '0');
//             const m = String(istDate.getUTCMinutes()).padStart(2, '0');
//             const timeInMinutes = (istDate.getUTCHours() * 60) + istDate.getUTCMinutes();
//             const dateStr = istDate.toISOString().split('T')[0];

//             if (dateStr !== currentDayTracker) {
//                 currentDayTracker = dateStr;
//                 isTradingHaltedForDay = false;
//                 optionDataCache = {};

//                 if (!dailyBreakdownMap[dateStr]) dailyBreakdownMap[dateStr] = { pnl: 0, trades: 0, tradesList: [], hasTradedTimeBased: false };

//                 // 🔥 RATIO SPREAD RESET PER DAY 🔥
//                 if (isRatioSpreadStrategy) {
//                     const parsedConfig = JSON.parse(strategyConfigString);
//                     ratioEngine = new TimeBasedEngine(parsedConfig, false);
//                     ratioEngine.estimatedMargin = 914000; // Hardcoded default for Nifty Ratio
//                     ratioEngine.maxLossLimit = ratioEngine.estimatedMargin * ((riskSettings.maxLossPct || 1) / 100);
//                     ratioEngine.status = 'WAITING_FOR_ENTRY';
//                 }

//                 // 🐸 THE LEAPFROG (Jump Over Cached Days)
//                 if (bulkCacheMap[dateStr] && orderType === "MIS") {
//                     const dayCache = bulkCacheMap[dateStr];
//                     dailyBreakdownMap[dateStr].pnl = dayCache.dailyPnL;
//                     dailyBreakdownMap[dateStr].trades = dayCache.trades.length;
//                     dailyBreakdownMap[dateStr].tradesList = dayCache.trades;
//                     dailyBreakdownMap[dateStr].hasTradedTimeBased = dayCache.hasTradedTimeBased;

//                     while (i + 1 < cachedData.length) {
//                         const nextIst = new Date(new Date(cachedData[i + 1].timestamp).getTime() + (5.5 * 60 * 60 * 1000));
//                         if (nextIst.toISOString().split('T')[0] === dateStr) {
//                             i++;
//                         } else {
//                             break;
//                         }
//                     }

//                     const expectedTotalDays = Math.max(1, (endDate - startDate) / (1000 * 60 * 60 * 24));
//                     const daysPassed = Math.max(0, (istDate - startDate) / (1000 * 60 * 60 * 24));
//                     let livePercent = Math.min(95, Math.round((daysPassed / expectedTotalDays) * 100));
//                     res.write(`data: ${JSON.stringify({ type: 'PROGRESS', date: `${dateStr} (Loaded from Memory)`, percent: livePercent })}\n\n`);

//                     continue;
//                 } else {
//                     if (!newDaysToCache.includes(dateStr)) newDaysToCache.push(dateStr);

//                     const expectedTotalDays = Math.max(1, (endDate - startDate) / (1000 * 60 * 60 * 24));
//                     const daysPassed = Math.max(0, (istDate - startDate) / (1000 * 60 * 60 * 24));
//                     let livePercent = Math.min(95, Math.round((daysPassed / expectedTotalDays) * 100));
//                     res.write(`data: ${JSON.stringify({ type: 'PROGRESS', date: `Calculating: ${dateStr}`, percent: livePercent })}\n\n`);
//                 }
//             }

//             let longSignal = false;
//         if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
//             let overallResult = null;
//             entryConds.longRules.forEach((rule, idx) => {
//                 const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
//                 const ruleResult = evaluateCondition(
//                     calcLongInd1[idx] ? calcLongInd1[idx][i] : null, calcLongInd2[idx] ? calcLongInd2[idx][i] : null,
//                     (i > 0 && calcLongInd1[idx]) ? calcLongInd1[idx][i - 1] : null, (i > 0 && calcLongInd2[idx]) ? calcLongInd2[idx][i - 1] : null, operator
//                 );
//                 if (idx === 0) overallResult = ruleResult;
//                 else {
//                     const logicalOp = entryConds.logicalOps[idx - 1];
//                     overallResult = logicalOp === 'AND' ? (overallResult && ruleResult) : (overallResult || ruleResult);
//                 }
//             });
//             longSignal = overallResult;
//         }

//         let shortSignal = false;
//         if (entryConds && entryConds.shortRules && entryConds.shortRules.length > 0) {
//             let overallResult = null;
//             entryConds.shortRules.forEach((rule, idx) => {
//                 const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
//                 const ruleResult = evaluateCondition(
//                     calcShortInd1[idx] ? calcShortInd1[idx][i] : null, calcShortInd2[idx] ? calcShortInd2[idx][i] : null,
//                     (i > 0 && calcShortInd1[idx]) ? calcShortInd1[idx][i - 1] : null, (i > 0 && calcShortInd2[idx]) ? calcShortInd2[idx][i - 1] : null, operator
//                 );
//                 if (idx === 0) overallResult = ruleResult;
//                 else {
//                     const logicalOp = entryConds.logicalOps[idx - 1];
//                     overallResult = logicalOp === 'AND' ? (overallResult && ruleResult) : (overallResult || ruleResult);
//                 }
//             });
//             shortSignal = overallResult;
//         }

//        // 🔥 NAYA PRICE ACTION LOGIC (MULTI-TIMEFRAME SYNC)
//         let priceActionLongSignal = false;
//         let priceActionShortSignal = false;
//         let sniperTriggerName = "Price Action"; 
//         let currentCandleSniperSignal = null; // 🔥 SL सेव करने के लिए

//         if (strategy.type === "Price Action Based" || strategy.data?.type === "Price Action Based") {
//             const ltfSlice = cachedData.slice(Math.max(0, i - 50), i + 1);
//             const currentLtfTimeMs = new Date(cachedData[i].timestamp).getTime();
//             const periodMs = parseInt(htfTimeframe) * 60 * 1000;
//             const htfSlice = cachedHtfData.filter(hCandle => (hCandle.blockTime + periodMs) <= currentLtfTimeMs);
//             const recentHtfSlice = htfSlice.slice(-1000);

//             const paSettings = strategy.data?.priceActionSettings || {};
//             const strictDecisional = paSettings.strictDecisional === true; 
//             const strictCounter = strictDecisional ? true : (paSettings.strictCounter !== false);

//             const signals = identifyMechanicalStructure(
//                 recentHtfSlice, paSettings.startingTrend || "AUTO", Number(paSettings.counterStructureDepth) || 0, 
//                 paSettings.structureMode || "MECHANICAL", strictDecisional, strictCounter, 
//                 paSettings.majorOnly === true, showD2S_DOB, showD2S_DOF, showD2S_EOB, showD2S_EOF
//             );
            
//             let currentTrend = "BULLISH";
//             if (signals.length > 0) {
//                  const lastMajor = signals.slice().reverse().find(s => s.type === "CHoCH" || s.type === "BOS");
//                  if (lastMajor) currentTrend = lastMajor.trend;
//             }

//             // 🔥 NAYA PRICE ACTION LOGIC (MULTI-TIMEFRAME SYNC)
//             let activeSetupZone = null;
//             let zoneTrend = currentTrend; 
            
//             // 🔥 THE GATEKEEPER FIX: यूज़र ने DB में जो Setup (D-OB) चुना है, उसे निकालो
//             const userSmcSetup = strategyLegs[0]?.smcSetup || {};
//             const allowedSetup = userSmcSetup.setup; // e.g., "D-OB"

//             const activeZones = signals.filter(sig => {
//                 if (!sig.isActive) return false;
                
//                 // 🚫 Strict Block: अगर यूज़र ने "D-OB" चुना है, तो "E-OB" या बाकी सबको रिजेक्ट कर दो!
//                 // (अगर allowedSetup मौजूद है, और सिग्नल का टाइप उससे मैच नहीं करता, तो हटा दो)
//                 if (allowedSetup && sig.type !== allowedSetup) return false; 
                
//                 return ["E-OB", "D-OB", "E-OF", "D-OF"].includes(sig.type);
//             });
            
//             if (activeZones.length > 0) {
//                 const nearestZone = activeZones[activeZones.length - 1]; 
                
//                 // 🔥 लाल ज़ोन/हरे ज़ोन का असली ट्रेंड निकालें
//                 if (nearestZone.trend) zoneTrend = nearestZone.trend;
//                 else if (nearestZone.isBullish !== undefined) zoneTrend = nearestZone.isBullish ? "BULLISH" : "BEARISH";
//                 else {
//                     const currentClose = ltfSlice[ltfSlice.length - 1].close;
//                     zoneTrend = (nearestZone.priceBottom > currentClose) ? "BEARISH" : "BULLISH";
//                 }

//                 activeSetupZone = { top: nearestZone.priceTop, bottom: nearestZone.priceBottom, type: nearestZone.type, trend: zoneTrend };
//             }

//             const currentCandle = ltfSlice[ltfSlice.length - 1];

//             if (backtestSniper) {
//                 const sniperSignal = backtestSniper.processLiveMarket(currentCandle.close, currentCandle, activeSetupZone, zoneTrend);

//                 if (sniperSignal && (sniperSignal.action === 'BUY' || sniperSignal.action === 'SELL')) {
//                     currentCandleSniperSignal = sniperSignal; // 🔥 सिग्नल सेव कर लिया
//                     if (sniperSignal.trendType === "LONG" || sniperSignal.trendType === "BULLISH") priceActionLongSignal = true;
//                     if (sniperSignal.trendType === "SHORT" || sniperSignal.trendType === "BEARISH") priceActionShortSignal = true;
                    
//                     sniperTriggerName = `${sniperSignal.type} [${activeSetupZone.type}]`; 
//                     console.log(`🎯 [BACKTEST SNIPER] Triggered via: ${sniperTriggerName} at ₹${sniperSignal.entryPrice} | Date: ${dateStr} | Time: ${h}:${m}`);
//                 }
//             }
//         }

//         // 🔥 FINAL SIGNAL MERGER (यहाँ भी FIX लागू किया है)
//         finalLongSignal = (strategy.type === "Price Action Based" || strategy.data?.type === "Price Action Based") 
//             ? priceActionLongSignal 
//             : (txnType === 'Both Side' || txnType === 'Only Long' || isTimeBased) ? longSignal : false;

//         finalShortSignal = (strategy.type === "Price Action Based" || strategy.data?.type === "Price Action Based") 
//             ? priceActionShortSignal 
//             : (txnType === 'Both Side' || txnType === 'Only Short') ? shortSignal : false;
            
       

//             // 🔥 CNC DTE CHECK FOR ENTRY
//             const primaryReqExpiry = autoCorrectExpiryType(upperSymbol, dateStr, strategyLegs[0]?.expiry || "WEEKLY");
//             const primaryExpiryLabel = getNearestExpiryString(dateStr, upperSymbol, primaryReqExpiry);
//             const currentDTE = getTradingDaysToExpiry(istDate, primaryExpiryLabel);

//             let isCncEntryDay = false; // Default ko false rakho
//             let targetCncExpiryLabel = primaryExpiryLabel;

//             if (orderType === "CNC") {
//                 if (currentDTE === cncEntryDays) {
//                     isCncEntryDay = true; // Normal Entry Day (Wednesday)
//                 }
//                 else if (currentDTE === cncEntryDays - 1) {
//                     // 🔥 OPTION 2 LOGIC: Catch the Skipped Day (Enter on DTE 3 / Wednesday)
//                     // Check if yesterday was an expiry day. Agar kal expiry thi, toh kal humne trade skip kiya tha, isliye aaj entry lo!
//                     let yesterday = new Date(istDate);
//                     yesterday.setDate(yesterday.getDate() - 1);

//                     // Weekend aur holidays ko skip karke pichla working day nikalo
//                     while (yesterday.getDay() === 0 || yesterday.getDay() === 6 || isTradingHoliday(yesterday)) {
//                         yesterday.setDate(yesterday.getDate() - 1);
//                     }

//                     const yestDateStr = yesterday.toISOString().split('T')[0];
//                     const yestExpiryLabel = getNearestExpiryString(yestDateStr, upperSymbol, primaryReqExpiry);
//                     const yestDTE = getTradingDaysToExpiry(yesterday, yestExpiryLabel);

//                     if (yestDTE === 0) {
//                         isCncEntryDay = true; // Kal expiry thi, toh aaj DTE 3 par trade le lo!
//                     }
//                 }
//                 else if (currentDTE < cncEntryDays) {
//                     const nextExpiryLabel = getNearestExpiryString(dateStr, upperSymbol, "NEXT WEEKLY");
//                     const nextDTE = getTradingDaysToExpiry(istDate, nextExpiryLabel);

//                     if (nextDTE === cncEntryDays) {
//                         if (currentDTE === 0) {
//                             // 🔥 OPTION 2 LOGIC: Agar entry ka din (DTE 4) khud ek Expiry Day (DTE 0) hai, toh aaj SKIP karo!
//                             isCncEntryDay = false;
//                         } else {
//                             isCncEntryDay = true;
//                             targetCncExpiryLabel = nextExpiryLabel;
//                         }
//                     }
//                 }
//             } else {
//                 isCncEntryDay = true; // MIS aur BTST ke liye hamesha ON rahega
//             }

//             // =========================================================
//             // 🛑 THE START TIME GATEKEEPER (Universal for Time & Indicator)
//             // =========================================================
//             let currentStartMin = 555; // Default 09:15 AM
//             if (sTime) {
//                 const [sh, smStr] = sTime.split(':');
//                 if (smStr) {
//                     const sm = smStr.split(' ')[0];
//                     let h = parseInt(sh);
//                     if (sTime.toUpperCase().includes('PM') && h !== 12) h += 12;
//                     if (sTime.toUpperCase().includes('AM') && h === 12) h -= 12;
//                     currentStartMin = h * 60 + parseInt(sm);
//                 }
//             }

//             // =========================================================
//             // 🚀 ISOLATED RATIO SPREAD EXECUTION BLOCK (Safe from Legacy Bugs)
//             // =========================================================
//             if (isRatioSpreadStrategy && ratioEngine) {
//                 const spotClosePrice = parseFloat(candle.close);
//                 const currentTimeStr = `${h}:${m}`;
                
//                 // 1. ENTRY LOGIC (REAL DHAN API PREMIUMS)
//                 if (ratioEngine.status === 'WAITING_FOR_ENTRY' && timeInMinutes >= currentStartMin && !dailyBreakdownMap[dateStr].hasTradedTimeBased) {
                    
//                     const atmStrike = calculateATM(spotClosePrice, upperSymbol);
                    
//                     let stepSize = 50;
//                     if (upperSymbol.includes("BANK") || upperSymbol.includes("SENSEX")) stepSize = 100;
//                     else if (upperSymbol.includes("MID")) stepSize = 25;

//                     // 🔥 THE PREMIUM DIVISOR (Current 4, dynamic later)
//                     const premiumDivisor = 4; 

//                     console.log(`\n📡 [API CALL] Fetching REAL ATM Premiums for ${dateStr} ${currentTimeStr}...`);

//                     const fetchRealPremium = async (optType, label) => {
//                         if (!broker) return null;
//                         try {
//                             const axios = require('axios');
//                             let expFlag = "WEEK"; let expCode = 1;
//                             let reqExpiry = autoCorrectExpiryType(upperSymbol, dateStr, strategyLegs[0]?.expiry || "WEEKLY");
//                             if (reqExpiry.toUpperCase() === "MONTHLY") { expFlag = "MONTH"; }
//                             else if (reqExpiry.toUpperCase() === "NEXT WEEKLY" || reqExpiry.toUpperCase() === "NEXT WEEK") { expCode = 2; }
                            
//                             const exchSegment = (Number(spotSecurityId) === 51 || Number(spotSecurityId) === 69) ? "BSE_FNO" : "NSE_FNO";
                            
//                             const res = await axios.post('https://api.dhan.co/v2/charts/rollingoption', {
//                                 exchangeSegment: exchSegment, interval: "1", securityId: Number(spotSecurityId), instrument: "OPTIDX",
//                                 expiryFlag: expFlag, expiryCode: expCode, drvOptionType: optType === "CE" ? "CALL" : "PUT",
//                                 requiredData: ["open", "strike"], fromDate: dateStr, toDate: dateStr, strike: label
//                             }, { headers: { 'access-token': broker.apiSecret, 'client-id': broker.clientId, 'Content-Type': 'application/json' }, timeout: 4000 });

//                             const optKey = optType === "CE" ? "ce" : "pe";
//                             if (res.data && res.data.data && res.data.data[optKey]) {
//                                 const chart = res.data.data[optKey];
//                                 for (let k = 0; k < chart.timestamp.length; k++) {
//                                     const optTime = new Date(chart.timestamp[k] * 1000 + (5.5 * 3600000));
//                                     if (optTime.toISOString().split('T')[1].substring(0, 5) === currentTimeStr) {
//                                         return { price: chart.open[k], strike: Number(chart.strike[k]) };
//                                     }
//                                 }
//                             }
//                         } catch (e) {}
//                         return null;
//                     };

//                     // 🔥 BULLETPROOF HELPER: Guarantees Exact Strike from Dhan 
//                     const getVerifiedPremium = async (optType, expectedStrike) => {
//                         const stepDiff = Math.round((expectedStrike - atmStrike) / stepSize);
//                         if (stepDiff === 0) return await fetchRealPremium(optType, "ATM");
                        
//                         // Dhan API Quirk Fix: Positive steps (+50) = OTM1, Negative steps (-50) = ITM-1
//                         let labelsToTry = stepDiff > 0 
//                             ? [`OTM${stepDiff}`, `ITM${stepDiff}`, `${stepDiff}`]
//                             : [`ITM${stepDiff}`, `OTM${stepDiff}`, `${stepDiff}`]; 
                        
//                         for (let label of labelsToTry) {
//                             await delay(200); // Anti-ban
//                             let data = await fetchRealPremium(optType, label);
//                             // Verify strike strictly!
//                             if (data && data.strike === expectedStrike) return data;
//                         }
//                         return null;
//                     };

//                     // 🟢 STEP 1: Get Exact ATM Premiums
//                     const atmCe = await getVerifiedPremium("CE", atmStrike) || { price: 120, strike: atmStrike };
//                     const atmPe = await getVerifiedPremium("PE", atmStrike) || { price: 110, strike: atmStrike };

//                     // 🟢 STEP 2: Calculate Target Premiums
//                     const targetCePremium = atmCe.price / premiumDivisor;
//                     const targetPePremium = atmPe.price / premiumDivisor;
//                     console.log(`🎯 Target Premiums to Sell (ATM / ${premiumDivisor}) -> CE: ₹${targetCePremium.toFixed(2)}, PE: ₹${targetPePremium.toFixed(2)}`);

//                     // 🔥 NEW: Check Execution Mode
//                     const executionMode = riskSettings?.legSelectionMode || 'SYMMETRIC';
//                     const maxAsymmetricLots = riskSettings?.maxAsymmetricLots || 5;
                    
//                     let finalOtmCe = null;
//                     let finalOtmPe = null;
                    
//                     let bestStep = 0; // 🔥 BUG FIX: bestStep ko yahan bahar nikal diya!
                    
//                     // Default Sell Lots
//                     let ceSellLots = strategyLegs[2]?.quantity || 4; 
//                     let peSellLots = strategyLegs[3]?.quantity || 4; 

//                     if (executionMode === 'SYMMETRIC') {
//                         // -------------------------------------------------------------
//                         // 🟦 OLD LOGIC: SYMMETRIC SCANNER (Fixed Steps)
//                         // -------------------------------------------------------------
//                         console.log(`🤿 Scanning Option Chain to find the PERFECT Symmetric OTM...`);
//                         let minCombinedError = Infinity; // 🔥 yahan se let bestStep hata diya gaya

//                         for(let step = 1; step <= 10; step++) {
//                             const expectedCeStrike = atmStrike + (step * stepSize);
//                             const expectedPeStrike = atmStrike - (step * stepSize);
                            
//                             let ceData = await getVerifiedPremium("CE", expectedCeStrike);
//                             let peData = await getVerifiedPremium("PE", expectedPeStrike);

//                             if(!ceData || !peData) continue;

//                             let ceError = Math.abs(ceData.price - targetCePremium);
//                             let peError = Math.abs(peData.price - targetPePremium);
//                             let combinedError = ceError + peError;

//                             console.log(`   🔎 Tested Step ${step} (CE:${ceData.strike}, PE:${peData.strike}): CE=₹${ceData.price.toFixed(2)}, PE=₹${peData.price.toFixed(2)} | Combined Error: ${combinedError.toFixed(2)}`);

//                             if (combinedError < minCombinedError) {
//                                 minCombinedError = combinedError;
//                                 bestStep = step;
//                                 finalOtmCe = ceData;
//                                 finalOtmPe = peData;
//                             }

//                             if (ceData.price < (targetCePremium * 0.4) && peData.price < (targetPePremium * 0.4)) break; 
//                         }
//                         console.log(`✅ [LOCK IN] Selected Symmetric Strike: Step ${bestStep} (${bestStep * stepSize} points away from ATM)`);
                        
//                     } else {

//                         // -------------------------------------------------------------
//                         // 🟪 NEW LOGIC: ASYMMETRIC SCANNER (Premium Matched & Delta Neutral)
//                         // -------------------------------------------------------------
//                         console.log(`🤿 Scanning Option Chain in 🔥 ASYMMETRIC Mode to find exact Premium matches...`);
                        
//                         let bestCeStep = 0; let minCeError = Infinity;
//                         let bestPeStep = 0; let minPeError = Infinity;

//                         // 1. CE Side ko alag scan karo
//                         for(let step = 1; step <= 15; step++) { 
//                             const expectedCeStrike = atmStrike + (step * stepSize);
//                             let ceData = await getVerifiedPremium("CE", expectedCeStrike);
//                             if(!ceData) continue;
                            
//                             let ceError = Math.abs(ceData.price - targetCePremium);
//                             console.log(`   🔎 Tested CE Step ${step} (${ceData.strike}): Premium=₹${ceData.price.toFixed(2)} | Error: ${ceError.toFixed(2)}`);
                            
//                             if (ceError < minCeError) {
//                                 minCeError = ceError;
//                                 bestCeStep = step;
//                                 finalOtmCe = ceData;
//                             }
//                             if (ceData.price < (targetCePremium * 0.3)) break; 
//                         }

//                         // 2. PE Side ko alag scan karo
//                         for(let step = 1; step <= 15; step++) { 
//                             const expectedPeStrike = atmStrike - (step * stepSize);
//                             let peData = await getVerifiedPremium("PE", expectedPeStrike);
//                             if(!peData) continue;
                            
//                             let peError = Math.abs(peData.price - targetPePremium);
//                             console.log(`   🔎 Tested PE Step ${step} (${peData.strike}): Premium=₹${peData.price.toFixed(2)} | Error: ${peError.toFixed(2)}`);
                            
//                             if (peError < minPeError) {
//                                 minPeError = peError;
//                                 bestPeStep = step;
//                                 finalOtmPe = peData;
//                             }
//                             if (peData.price < (targetPePremium * 0.3)) break; 
//                         }

//                         // 3. 🛡️ SAFE LOGGING 
//                         const safeCeStrike = finalOtmCe ? finalOtmCe.strike : "N/A (API Fail)";
//                         const safePeStrike = finalOtmPe ? finalOtmPe.strike : "N/A (API Fail)";
//                         console.log(`✅ [LOCK IN] Asymmetric Match -> CE: Step ${bestCeStep} (${safeCeStrike}) | PE: Step ${bestPeStep} (${safePeStrike})`);

//                         // 4. 🧠 THE GENIUS MATH (With Fallback)
//                         let fallbackStep = upperSymbol.includes("BANK") ? 6 : 5;
//                         let activeCeStep = finalOtmCe ? bestCeStep : fallbackStep;
//                         let activePeStep = finalOtmPe ? bestPeStep : fallbackStep;

//                         let calculatedCeLots = activeCeStep + 1;
//                         let calculatedPeLots = activePeStep + 1;

//                         // 🔥 BUG FIX: Yahan bestStep set kar diya taki niche ka code (Boundary Limits) crash na ho!
//                         bestStep = Math.max(activeCeStep, activePeStep); 

//                         // 5. 🛡️ THE EVENT-DAY SAFETY GUARD
//                         ceSellLots = Math.min(calculatedCeLots, maxAsymmetricLots);
//                         peSellLots = Math.min(calculatedPeLots, maxAsymmetricLots);
                        
//                         if (calculatedCeLots > maxAsymmetricLots || calculatedPeLots > maxAsymmetricLots) {
//                              console.log(`⚠️ Extreme IV Guard Activated! CE Lots: ${calculatedCeLots} -> ${ceSellLots}, PE Lots: ${calculatedPeLots} -> ${peSellLots} (Capped at ${maxAsymmetricLots})`);
//                         } else {
//                              console.log(`⚖️ Dynamic Delta Lots Assigned -> CE Sell: ${ceSellLots} Lots, PE Sell: ${peSellLots} Lots.`);
//                         }
//                     }

//                     // 🟢 STEP 4: Fallback Guard
//                     if (!finalOtmCe || !finalOtmPe) {
//                         bestStep = upperSymbol.includes("BANK") ? 6 : 5;
//                         finalOtmCe = { price: 32, strike: atmStrike + (bestStep * stepSize) };
//                         finalOtmPe = { price: 27, strike: atmStrike - (bestStep * stepSize) };
//                         console.log(`⚠️ Scanner Failed completely. Using Default Step ${bestStep}.`);
//                     }

//                     console.log(`✅ [LOCK IN] Selected Symmetric Strike: Step ${bestStep} (${bestStep * stepSize} points away from ATM)`);

//                     // 🔥 DYNAMIC LOT SIZE CALCULATOR (Directly from your UI / DB Payload)
//                     const realLotSize = Number(instrumentData.lotSize) || Number(strategyLegs[0]?.quantity) || 65;
//                     console.log(`📦 Using Dynamic Lot Size from UI: ${realLotSize}`);

//                     ratioEngine.activeLegs = [
//                         { strike: atmCe.strike, type: 'CE', action: 'BUY', entryPrice: atmCe.price, lots: 1, tag: 'MAIN', inst: { id: `CE_ATM`, lotSize: realLotSize } },
//                         { strike: atmPe.strike, type: 'PE', action: 'BUY', entryPrice: atmPe.price, lots: 1, tag: 'MAIN', inst: { id: `PE_ATM`, lotSize: realLotSize } },
                        
//                         // 🔥 YAHAN BADLAV HUA HAI: Hardcoded 4 ki jagah 'ceSellLots' aur 'peSellLots' lagaya gaya hai
//                         { strike: finalOtmCe.strike, type: 'CE', action: 'SELL', entryPrice: finalOtmCe.price, lots: ceSellLots, tag: 'MAIN', inst: { id: `CE_OTM`, lotSize: realLotSize } },
//                         { strike: finalOtmPe.strike, type: 'PE', action: 'SELL', entryPrice: finalOtmPe.price, lots: peSellLots, tag: 'MAIN', inst: { id: `PE_OTM`, lotSize: realLotSize } }
//                     ];
                    
//                     ratioEngine.tradeBoundaries = ratioEngine.calculateBreakevens();
                    
//                     // 🔥 🟢 STEP 5: SMART ESTIMATED MARGIN CALCULATOR (Using marginCalculator.js & Time Machine)
//                     const requestedExpiry = riskSettings?.expiryType || "WEEKLY"; 
//                     const isExpiryDay = isThisExpiryDay(dateStr, upperSymbol, requestedExpiry);

//                     if(isExpiryDay) {
//                         console.log(`⚠️ [GAMMA ALERT] SEBI Peak Margin Rules applied for 0 DTE Expiry Day!`);
//                     }

//                     // 🚀 Yahan hum apna naya engine call kar rahe hain jo sab kuch khud calculate karega
//                     let estMargin = calculateApproxBasketMargin(ratioEngine.activeLegs, upperSymbol, isExpiryDay);
//                     ratioEngine.estimatedMargin = estMargin;
                    
//                     // Agar UI me Fix Max Loss (₹) diya hai to wo use karo, warna Est. Margin ka 1% nikalo
//                     const userMaxLossAmt = Number(riskSettings.maxLoss);
//                     const calculatedMaxLoss = userMaxLossAmt > 0 ? userMaxLossAmt : (estMargin * (Number(riskSettings.maxLossPct || 1) / 100));
//                     ratioEngine.maxLossLimit = calculatedMaxLoss;

//                     console.log(`🏦 Est. Margin: ₹${estMargin.toFixed(2)} | 🛡️ Engine Max Loss Limit: -₹${calculatedMaxLoss.toFixed(2)}`);

//                     // 🛡️ Ab Risk Manager ko calculate kiya hua asli Max Loss milega
//                     ratioEngine.riskManager = new TimeBasedRiskManager(ratioEngine.maxLossLimit, false, null, riskSettings);
//                     ratioEngine.status = 'ACTIVE';
//                     dailyBreakdownMap[dateStr].hasTradedTimeBased = true;
//                     ratioEngine.tradeStartTime = timeInMinutes;
//                     ratioEngine.entrySpotPrice = spotClosePrice;
                    
//                     console.log(`\n🚀 [RATIO SPREAD MAIN ENTRY] Date: ${dateStr} | Time: ${currentTimeStr} | Spot: ₹${spotClosePrice}`);
//                     ratioEngine.activeLegs.forEach((leg, idx) => {
//                         console.log(`   🔸 Leg ${idx + 1}: ${leg.action} ${leg.lots} Lot(s) ${leg.type} @ Strike ${leg.strike} | Premium: ₹${leg.entryPrice.toFixed(2)}`);
//                     });
//                     console.log(`🚧 Boundaries: Lower BE: ₹${ratioEngine.tradeBoundaries.lower.toFixed(2)} | Upper BE: ₹${ratioEngine.tradeBoundaries.upper.toFixed(2)}`);
//                 }
 
//                 if (ratioEngine.status === 'ACTIVE' || ratioEngine.status === 'RECOVERY_MODE') {
                    
//                     // 🔥 NAYA FIX 3: Spot ka difference Strike se nahi, 'Entry Spot' se nikalna hai!
//                     // Isse engine ko pata chalega ki trade lene ke baad market kitna point sach me hila hai.
//                     const baseSpot = ratioEngine.entrySpotPrice || ratioEngine.activeLegs[0].strike;
//                     const spotChange = spotClosePrice - baseSpot; 
                    
//                     const activeStartMin = ratioEngine.tradeStartTime || currentStartMin;
//                     const minutesPassed = Math.max(0, timeInMinutes - activeStartMin);
//                     const decayFactor = Math.min(1, minutesPassed / 375);
                    
                  
//                     // 🕒 GET EXACT DTE FOR INTRADAY MTM SIMULATION
//                     const reqExp = riskSettings?.expiryType || "WEEKLY";
//                     const expiryStrRaw = getNearestExpiryString(dateStr, upperSymbol, reqExp);
//                     const expDateStr = expiryStrRaw.split(' ').pop(); 
//                     const expDay = parseInt(expDateStr.substring(0, 2));
//                     const expMonthStr = expDateStr.substring(2, 5);
//                     const expYear = parseInt("20" + expDateStr.substring(5, 7));
//                     const monthMap = { "JAN":0, "FEB":1, "MAR":2, "APR":3, "MAY":4, "JUN":5, "JUL":6, "AUG":7, "SEP":8, "OCT":9, "NOV":10, "DEC":11 };
//                     const expDateObj = new Date(expYear, monthMap[expMonthStr], expDay);
//                     const tradeDateObj = new Date(dateStr);
//                     let intradayDte = Math.max(0, Math.ceil((expDateObj.getTime() - tradeDateObj.getTime()) / (1000 * 3600 * 24)));

//                     // 📉 DTE-BASED INTRADAY THETA FACTOR (Max decay allowed inside intraday session)
//                     let intradayMaxDecay = 0.05; // Default for far DTE
//                     if (intradayDte === 0) intradayMaxDecay = 0.60;      // Expiry day: massive intraday crush
//                     else if (intradayDte === 1) intradayMaxDecay = 0.25; // 1 DTE: 25% intraday decay
//                     else if (intradayDte === 2) intradayMaxDecay = 0.15;
//                     else if (intradayDte === 3) intradayMaxDecay = 0.10;

//                     let mockLTPs = {};
//                     // baseSpot aur spotChange upar pehle se hi declared hain, isliye yahan se hata diya.

//                     ratioEngine.activeLegs.forEach(leg => {
//                         // 🔥 1. NIFTY GAMMA SCALE (800 points for a full delta shift)
//                         const GAMMA_SCALE = upperSymbol.includes("BANK") ? 1500 : 800; 

//                         // 🔥 2. CALCULATE ENTRY DELTA
//                         let entryDelta = leg.type === 'CE' 
//                             ? 0.50 + ((baseSpot - leg.strike) / GAMMA_SCALE)
//                             : -0.50 + ((baseSpot - leg.strike) / GAMMA_SCALE);
                        
//                         entryDelta = leg.type === 'CE' 
//                             ? Math.max(0.05, Math.min(0.95, entryDelta)) 
//                             : Math.max(-0.95, Math.min(-0.05, entryDelta));

//                         // 🔥 3. CALCULATE LIVE DELTA
//                         let currentDelta = leg.type === 'CE' 
//                             ? 0.50 + ((spotClosePrice - leg.strike) / GAMMA_SCALE)
//                             : -0.50 + ((spotClosePrice - leg.strike) / GAMMA_SCALE);
                            
//                         currentDelta = leg.type === 'CE' 
//                             ? Math.max(0.05, Math.min(0.95, currentDelta)) 
//                             : Math.max(-0.95, Math.min(-0.05, currentDelta));

//                         // 🔥 4. AVERAGE DELTA (The Calculus Secret to match Stockmock)
//                         // Jab market move karta hai to option ek average delta par badhta/ghatta hai
//                         let avgDelta = (entryDelta + currentDelta) / 2;

//                         // 🔥 5. SMART INTRADAY THETA DECAY
//                         let decayRate = leg.action === 'SELL' ? intradayMaxDecay : (intradayMaxDecay * 0.5);
//                         let thetaDecay = leg.entryPrice * decayRate * decayFactor;

//                         // 🔥 6. THEORETICAL PRICE FORMULA
//                         let theoreticalPrice = leg.entryPrice + (spotChange * avgDelta) - thetaDecay;
                        
//                         // -------------------------------------------------------------
//                         // 🌪️ THE SMART IV CRUSH SIMULATOR (Sunil Bhai's Concept)
//                         // -------------------------------------------------------------
//                         let intrinsicForCrush = leg.type === 'CE' ? Math.max(0, spotClosePrice - leg.strike) : Math.max(0, leg.strike - spotClosePrice);
//                         let currentExtrinsic = Math.max(0, theoreticalPrice - intrinsicForCrush); 
//                         let ivCrushFactor = 1.0;

//                         // Agar time 2:30 PM (870 minutes) ke baad ka hai, to premium crush hona shuru hoga
//                         if (timeInMinutes >= 870) {
//                             let crushDuration = timeInMinutes - 870; // 0 se 60 minutes tak (3:30 baje tak)
//                             let crushRatio = Math.min(1, crushDuration / 60); 

//                             // Expiry ke din 95% hawa niklegi, normal din 55-60% hawa niklegi
//                             let maxCrushLimit = intradayDte === 0 ? 0.95 : 0.55; 
//                             ivCrushFactor = 1.0 - (crushRatio * maxCrushLimit);
//                         }

//                         // Extrinsic ko crush karke wapas Intrinsic me jod do
//                         let crushedExtrinsic = currentExtrinsic * ivCrushFactor;
//                         theoreticalPrice = intrinsicForCrush + crushedExtrinsic;
//                         // -------------------------------------------------------------

//                         // 🔥 7. THE INTRINSIC FLOOR (Option kabhi apni asli value se sasta nahi ho sakta)
//                         let intrinsic = leg.type === 'CE' 
//                             ? Math.max(0, spotClosePrice - leg.strike) 
//                             : Math.max(0, leg.strike - spotClosePrice);
                            
//                         // Price ko lock kar do (Intrinsic ya 0.05, jo bhi bada ho)
//                         mockLTPs[leg.inst?.id] = Math.max(0.05, Math.max(intrinsic, theoreticalPrice));
//                     });



//                     // 🧮 (B) THE MASTER EXIT CALCULATOR (Fetches EXACT Dhan Prices at Exit Time)
//                     const executeRealExit = async (exitReason, exitTimeStr) => {
//                         console.log(`\n📡 [API CALL] ${exitReason} Triggered! Fetching REAL Exit Premiums for ${dateStr} ${exitTimeStr}...`);
//                         let finalRealPnL = 0;
//                         const currentAtmExit = calculateATM(spotClosePrice, upperSymbol);
                        
//                         let stepSize = 50;
//                         if (upperSymbol.includes("BANK") || upperSymbol.includes("SENSEX")) stepSize = 100;
//                         else if (upperSymbol.includes("MID")) stepSize = 25;

//                         for (let idx = 0; idx < ratioEngine.activeLegs.length; idx++) {
//                             let leg = ratioEngine.activeLegs[idx];
//                             let realExitPrice = null;

//                             const stepDiff = Math.round((leg.strike - currentAtmExit) / stepSize);
//                             let labelsToTry = stepDiff === 0 ? ["ATM"] : (stepDiff > 0 ? [`OTM${stepDiff}`, `ITM${stepDiff}`, `${stepDiff}`] : [`ITM${stepDiff}`, `OTM${stepDiff}`, `${stepDiff}`]);

//                             for (let label of labelsToTry) {
//                                 await delay(250); // Anti-ban shield
//                                 try {
//                                     const axios = require('axios');
//                                     let expFlag = "WEEK"; let expCode = 1;
//                                     let reqExpiry = autoCorrectExpiryType(upperSymbol, dateStr, strategyLegs[0]?.expiry || "WEEKLY");
//                                     if (reqExpiry.toUpperCase() === "MONTHLY") { expFlag = "MONTH"; }
//                                     else if (reqExpiry.toUpperCase() === "NEXT WEEKLY" || reqExpiry.toUpperCase() === "NEXT WEEK") { expCode = 2; }
//                                     const exchSegment = (Number(spotSecurityId) === 51 || Number(spotSecurityId) === 69) ? "BSE_FNO" : "NSE_FNO";

//                                     const res = await axios.post('https://api.dhan.co/v2/charts/rollingoption', {
//                                         exchangeSegment: exchSegment, interval: "1", securityId: Number(spotSecurityId), instrument: "OPTIDX",
//                                         expiryFlag: expFlag, expiryCode: expCode, drvOptionType: leg.type === "CE" ? "CALL" : "PUT",
//                                         requiredData: ["open", "strike"], fromDate: dateStr, toDate: dateStr, strike: label
//                                     }, { headers: { 'access-token': broker.apiSecret, 'client-id': broker.clientId, 'Content-Type': 'application/json' }, timeout: 4000 });

//                                     const optKey = leg.type === "CE" ? "ce" : "pe";
//                                     if (res.data && res.data.data && res.data.data[optKey]) {
//                                         const chart = res.data.data[optKey];
//                                         let fallbackLTP = null;
//                                         let fallbackTime = null;

//                                         for (let k = 0; k < chart.timestamp.length; k++) {
//                                             const optTime = new Date(chart.timestamp[k] * 1000 + (5.5 * 3600000));
//                                             const candleTimeStr = optTime.toISOString().split('T')[1].substring(0, 5);
                                            
//                                             if (Number(chart.strike[k]) === leg.strike) {
//                                                 // 1. SMART LTP TRACKER: Exit time se pehle ka sabse latest price
//                                                 if (candleTimeStr <= exitTimeStr) {
//                                                     fallbackLTP = chart.close[k] || chart.open[k];
//                                                     fallbackTime = candleTimeStr;
//                                                 }
//                                                 // 2. Agar exact exit time mil gaya, to lock karo
//                                                 if (candleTimeStr === exitTimeStr) {
//                                                     realExitPrice = chart.open[k];
//                                                     break;
//                                                 }
//                                             }
//                                         }

//                                         // 3. Agar exact time nahi mila, par LTP mil gaya
//                                         if (realExitPrice === null && fallbackLTP !== null) {
//                                             realExitPrice = fallbackLTP;
//                                             console.log(`⚠️ Exact ${exitTimeStr} missing. Using LTP from ${fallbackTime}: ₹${realExitPrice.toFixed(2)}`);
//                                         }
//                                     }
//                                 } catch(e) {}
//                                 if (realExitPrice !== null) break; // Perfect strike found!
//                             }

//                             // 🔥 3. DTE & EXPIRY CALCULATION (Global Scope for this loop)
//                             const reqExp = riskSettings?.expiryType || "WEEKLY";
//                             const expiryStrRaw = getNearestExpiryString(dateStr, upperSymbol, reqExp);
//                             const expDateStr = expiryStrRaw.split(' ').pop(); 
//                             const expDay = parseInt(expDateStr.substring(0, 2));
//                             const expMonthStr = expDateStr.substring(2, 5);
//                             const expYear = parseInt("20" + expDateStr.substring(5, 7));
//                             const monthMap = { "JAN":0, "FEB":1, "MAR":2, "APR":3, "MAY":4, "JUN":5, "JUL":6, "AUG":7, "SEP":8, "OCT":9, "NOV":10, "DEC":11 };
                            
//                             const expDateObj = new Date(expYear, monthMap[expMonthStr], expDay);
//                             const tradeDateObj = new Date(dateStr);
//                             const dte = Math.max(0, Math.ceil((expDateObj.getTime() - tradeDateObj.getTime()) / (1000 * 3600 * 24)));
//                             const isExpiryDay = (dte === 0);

//                             if (realExitPrice === null) {
//                                 let intrinsic = leg.type === 'CE' ? Math.max(0, spotClosePrice - leg.strike) : Math.max(0, leg.strike - spotClosePrice);
//                                 const baseSpot = ratioEngine.entrySpotPrice || ratioEngine.activeLegs[0].strike;
//                                 const spotChange = spotClosePrice - baseSpot;
//                                 const GAMMA_SCALE = upperSymbol.includes("BANK") ? 1500 : 800;
                                
//                                 let entryDelta = leg.type === 'CE' ? 0.50 + ((baseSpot - leg.strike) / GAMMA_SCALE) : -0.50 + ((baseSpot - leg.strike) / GAMMA_SCALE);
//                                 entryDelta = leg.type === 'CE' ? Math.max(0.05, Math.min(0.95, entryDelta)) : Math.max(-0.95, Math.min(-0.05, entryDelta));

//                                 let currentDelta = leg.type === 'CE' ? 0.50 + ((spotClosePrice - leg.strike) / GAMMA_SCALE) : -0.50 + ((spotClosePrice - leg.strike) / GAMMA_SCALE);
//                                 currentDelta = leg.type === 'CE' ? Math.max(0.05, Math.min(0.95, currentDelta)) : Math.max(-0.95, Math.min(-0.05, currentDelta));

//                                 let avgDelta = (entryDelta + currentDelta) / 2;

//                                 let dailyThetaPct = 0.08; 
//                                 if (dte === 0) dailyThetaPct = 0.85;      
//                                 else if (dte === 1) dailyThetaPct = 0.50; 
//                                 else if (dte === 2) dailyThetaPct = 0.35; 
//                                 else if (dte === 3) dailyThetaPct = 0.25; 
//                                 else if (dte === 4) dailyThetaPct = 0.20; 
//                                 else if (dte === 5) dailyThetaPct = 0.15; 
//                                 else if (dte === 6) dailyThetaPct = 0.10;

//                                 const activeStartMin = ratioEngine.tradeStartTime || 567;
//                                 const exitMin = parseInt(exitTimeStr.split(':')[0]) * 60 + parseInt(exitTimeStr.split(':')[1]);
//                                 const minutesPassed = Math.max(0, exitMin - activeStartMin);
//                                 const intradayDecayFactor = Math.min(1, minutesPassed / 375);

//                                 let thetaDecay = leg.entryPrice * dailyThetaPct * intradayDecayFactor;
//                                 let theoreticalPrice = leg.entryPrice + (spotChange * avgDelta) - thetaDecay;

//                                 // -------------------------------------------------------------
//                                 // 🌪️ THE SMART IV CRUSH SIMULATOR (EOD Exit)
//                                 // -------------------------------------------------------------
//                                 let intrinsicForCrush = leg.type === 'CE' ? Math.max(0, spotClosePrice - leg.strike) : Math.max(0, leg.strike - spotClosePrice);
//                                 let currentExtrinsic = Math.max(0, theoreticalPrice - intrinsicForCrush); 
//                                 let ivCrushFactor = 1.0;

//                                 if (exitMin >= 870) { // 2:30 PM ke baad (870 minutes)
//                                     let crushDuration = exitMin - 870; 
//                                     let crushRatio = Math.min(1, crushDuration / 60); 
//                                     let maxCrushLimit = dte === 0 ? 0.95 : 0.55; 
//                                     ivCrushFactor = 1.0 - (crushRatio * maxCrushLimit);
//                                 }

//                                 let crushedExtrinsic = currentExtrinsic * ivCrushFactor;
//                                 theoreticalPrice = intrinsicForCrush + crushedExtrinsic;
//                                 // -------------------------------------------------------------

//                                 let distanceOtm = leg.type === 'CE' ? Math.max(0, leg.strike - spotClosePrice) : Math.max(0, spotClosePrice - leg.strike);
//                                 let baseMin = dte > 0 ? (dte * 5.0) : 0.05; 
//                                 let distancePenalty = Math.max(1, distanceOtm / 120);
//                                 let minTimeValue = Math.max(0.05, baseMin / distancePenalty);

//                                 realExitPrice = Math.max(minTimeValue, Math.max(intrinsic, theoreticalPrice));
//                                 console.log(`⚠️ API Completely Failed for Leg ${idx+1}. Using Dynamic Math -> P: ₹${realExitPrice.toFixed(2)} (DTE: ${dte}, Theta: ${dailyThetaPct*100}%)`);
//                             }

//                             // 🔥 5. THE SMART VWAP-AWARE INTRINSIC & FREAK TICK GUARD
//                             const intrinsicValue = leg.type === 'CE' ? Math.max(0, spotClosePrice - leg.strike) : Math.max(0, leg.strike - spotClosePrice);
//                             const gap = intrinsicValue - realExitPrice;
                            
//                             // Expiry day volatile market me Spot aur VWAP ka gap 100+ points tak ja sakta hai.
//                             const maxVwapGap = isExpiryDay ? 120 : 60; 

//                             // PRIORITY 1: VWAP GUARD
//                             if (realExitPrice < intrinsicValue && gap > maxVwapGap) {
//                                 console.log(`🛡️ Intrinsic Guard: Correcting huge API gap! API ₹${realExitPrice.toFixed(2)} -> True Value ₹${intrinsicValue.toFixed(2)}`);
//                                 realExitPrice = intrinsicValue; 
//                             }
//                             // PRIORITY 2: FREAK TICK GUARD (Expiry & OTM Aware)
//                             // else {
//                             //     // 🔥 BUG FIX: entryPrice ki jagah ab hum live theoretical price (mockLTPs) use karenge!
//                             //     // Kyoki subah ki entry se lekar abhi tak market bahut move ho chuka hota hai.
//                             //     const mockFallback = mockLTPs[leg.inst?.id] || leg.entryPrice; 
//                             //     const priceDiff = Math.abs(realExitPrice - mockFallback);
//                             //     const isVWAPSettlement = (realExitPrice < intrinsicValue && gap <= maxVwapGap);
//                             //     const tolerance = isExpiryDay ? (mockFallback * 0.95) : (mockFallback * 0.5);
                                
//                             //     // 🔥 THE OTM ZERO FIX: Expiry ke din OTM option ka 0.05 ho jana natural hai.
//                             //     const isExpiryOTM = (isExpiryDay && intrinsicValue === 0 && realExitPrice <= 5);
                                
//                             //     // 🔥 NORMAL DAY OTM FIX: Agar DTE > 0 hai aur PE/CE deep OTM hokar naturally gal gaye hain (e.g. 166 -> 25)
//                             //     const isNormalOtmDecay = (intrinsicValue === 0 && realExitPrice < 40 && mockFallback < 60);
                                
//                             //     if (!isVWAPSettlement && !isExpiryOTM && !isNormalOtmDecay && priceDiff > 20 && priceDiff > tolerance) {
//                             //         console.log(`🛡️ Freak Tick Blocked on ${leg.strike} ${leg.type}! API gave ₹${realExitPrice.toFixed(2)} | Using Safe Mock: ₹${mockFallback.toFixed(2)}`);
//                             //         realExitPrice = mockFallback;
//                             //     }
//                             // }

//                             else {
//                                 const mockFallback = mockLTPs[leg.inst?.id] || leg.entryPrice; 
                                
//                                 // 🔥 SUNIL BHAI'S LOGIC: Trust the API!
//                                 // Downside (Premium girna) IV Crush hota hai (e.g. 88 -> 38), isliye downside ko block NAHI karna hai.
//                                 // Sirf Extreme Upside Spike (Agar API 3 guna aur 40+ point zyada price de de) ko Freak Tick manenge.
//                                 if (realExitPrice > (mockFallback * 3) && (realExitPrice - mockFallback) > 40) {
//                                     console.log(`🛡️ Extreme Freak Tick Blocked on ${leg.strike} ${leg.type}! API gave ₹${realExitPrice.toFixed(2)} | Using Safe Mock: ₹${mockFallback.toFixed(2)}`);
//                                     realExitPrice = mockFallback;
//                                 }
//                             }

//                             realExitPrice = Math.max(0.05, realExitPrice);

//                             // 🔥 THE DYNAMIC LOT SIZE FIX
//                             const mult = leg.lots * (leg.inst?.lotSize || realLotSize || 65);

//                             const legPnL = leg.action === 'BUY' ? (realExitPrice - leg.entryPrice) * mult : (leg.entryPrice - realExitPrice) * mult;
//                             finalRealPnL += legPnL;

//                             console.log(`   🏁 Leg ${idx + 1} Exit: ${leg.action} ${leg.lots} Lot(s) ${leg.type} @ Strike ${leg.strike} | Exit Premium: ₹${realExitPrice.toFixed(2)} | Leg PnL: ₹${legPnL.toFixed(2)}`);
//                         }
//                         return isNaN(finalRealPnL) ? 0 : finalRealPnL;
//                     };

//                     // ⏰ (C) EOD FORCE EXIT FIX
//                     if (timeInMinutes >= exitMin) {
//                         // 🔥 Ye direct API se true price layega!
//                         const finalPnL = await executeRealExit("EOD SQUARE OFF", currentTimeStr);
                        
//                         console.log(`\n⏰ [EOD SQUARE OFF] Time: ${currentTimeStr} | Spot: ₹${spotClosePrice}`);

//                         // 🔥 FIX: Puraane saare loss (realizedLoss) aur aakhiri trade ka loss (finalPnL) dono jod do!
//                         const totalDailyPnL = (ratioEngine.realizedLoss || 0) + finalPnL;
//                         console.log(`   💰 Final Total PnL booked for the Day: ₹${totalDailyPnL.toFixed(2)}`);

//                         // 🔥 SMART SYMBOL (BULLETPROOF) FOR EOD:
//                         const isRecoveryTrade = ratioEngine.activeLegs.some(leg => leg.tag === 'RECOVERY');
//                         const finalTradeSymbol = isRecoveryTrade ? "RECOVERY_TRADE" : "RATIO_SPREAD_MAIN";

//                         dailyBreakdownMap[dateStr].tradesList.push({
//                             symbol: finalTradeSymbol,
//                             pnl: finalPnL,
//                             exitType: "TIME_SQUAREOFF",
//                             exitTime: `${dateStr} ${currentTimeStr}:00`
//                         });
//                         dailyBreakdownMap[dateStr].pnl += finalPnL;
//                         dailyBreakdownMap[dateStr].trades += 1;
//                         ratioEngine.status = 'COMPLETED'; 
//                     } else {
//                         // (D) Normal intra-day evaluation
//                         // 🔥 CROSS-VERIFICATION INJECTION: 'await' lagaya aur ek arrow function pass kiya jo asali MTM layega
//                         const decision = await ratioEngine.evaluateTick(
//                             currentTimeStr, 
//                             mockLTPs, 
//                             spotClosePrice,
//                             async () => {
//                                 console.log(`\n📡 [API CALL] Cross-verifying REAL MTM from Broker...`);
//                                 let tempRealPnL = 0;
//                                 let stepSize = upperSymbol.includes("BANK") || upperSymbol.includes("SENSEX") ? 100 : (upperSymbol.includes("MID") ? 25 : 50);
//                                 const currentAtmCheck = calculateATM(spotClosePrice, upperSymbol);

//                                 for (let idx = 0; idx < ratioEngine.activeLegs.length; idx++) {
//                                     let leg = ratioEngine.activeLegs[idx];
//                                     let checkPrice = null;
//                                     const stepDiff = Math.round((leg.strike - currentAtmCheck) / stepSize);
//                                     let labelsToTry = stepDiff === 0 ? ["ATM"] : (stepDiff > 0 ? [`OTM${stepDiff}`, `ITM${stepDiff}`, `${stepDiff}`] : [`ITM${stepDiff}`, `OTM${stepDiff}`, `${stepDiff}`]);

//                                     for (let label of labelsToTry) {
//                                         await delay(250); 
//                                         try {
//                                             const axios = require('axios');
//                                             let expFlag = "WEEK"; let expCode = 1;
//                                             let reqExpiry = autoCorrectExpiryType(upperSymbol, dateStr, strategyLegs[0]?.expiry || "WEEKLY");
//                                             if (reqExpiry.toUpperCase() === "MONTHLY") { expFlag = "MONTH"; }
//                                             else if (reqExpiry.toUpperCase() === "NEXT WEEKLY" || reqExpiry.toUpperCase() === "NEXT WEEK") { expCode = 2; }
//                                             const exchSegment = (Number(spotSecurityId) === 51 || Number(spotSecurityId) === 69) ? "BSE_FNO" : "NSE_FNO";

//                                             const res = await axios.post('https://api.dhan.co/v2/charts/rollingoption', {
//                                                 exchangeSegment: exchSegment, interval: "1", securityId: Number(spotSecurityId), instrument: "OPTIDX",
//                                                 expiryFlag: expFlag, expiryCode: expCode, drvOptionType: leg.type === "CE" ? "CALL" : "PUT",
//                                                 requiredData: ["open", "strike"], fromDate: dateStr, toDate: dateStr, strike: label
//                                             }, { headers: { 'access-token': broker.apiSecret, 'client-id': broker.clientId, 'Content-Type': 'application/json' }, timeout: 4000 });

//                                             const optKey = leg.type === "CE" ? "ce" : "pe";
//                                             if (res.data && res.data.data && res.data.data[optKey]) {
//                                                 const chart = res.data.data[optKey];
//                                                 for (let k = chart.timestamp.length - 1; k >= 0; k--) {
//                                                     const optTime = new Date(chart.timestamp[k] * 1000 + (5.5 * 3600000));
//                                                     const candleTimeStr = optTime.toISOString().split('T')[1].substring(0, 5);
                                                    
//                                                     // 🔥 THE MISSING MASTER LOCK: Strike jarur match karni chahiye!
//                                                     if (Number(chart.strike[k]) === leg.strike) {
//                                                         if (candleTimeStr <= currentTimeStr) {
//                                                             checkPrice = chart.open[k];
//                                                             break;
//                                                         }
//                                                     }
//                                                 }
//                                             }
//                                         } catch(e) {}
//                                         if (checkPrice !== null) break; // Asli price mil gaya to aage ke labels check karna band!
//                                     }
                                    
//                                     // 🔥 DTE & EXPIRY CALCULATION FOR SMART GUARDS
//                                     const reqExpiry = autoCorrectExpiryType(upperSymbol, dateStr, strategyLegs[0]?.expiry || "WEEKLY");
//                                     const expiryStrRaw = getNearestExpiryString(dateStr, upperSymbol, reqExpiry);
//                                     const expDateStr = expiryStrRaw.split(' ').pop(); 
//                                     const expDay = parseInt(expDateStr.substring(0, 2));
//                                     const expMonthStr = expDateStr.substring(2, 5);
//                                     const expYear = parseInt("20" + expDateStr.substring(5, 7));
//                                     const monthMap = { "JAN":0, "FEB":1, "MAR":2, "APR":3, "MAY":4, "JUN":5, "JUL":6, "AUG":7, "SEP":8, "OCT":9, "NOV":10, "DEC":11 };
                                    
//                                     const expDateObj = new Date(expYear, monthMap[expMonthStr], expDay);
//                                     const tradeDateObj = new Date(dateStr);
//                                     const dte = Math.max(0, Math.ceil((expDateObj.getTime() - tradeDateObj.getTime()) / (1000 * 3600 * 24)));
//                                     const isExpiryDay = (dte === 0);

//                                     // 🔥 THE SPIKE GUARD (Fallback if API gives wrong/no data)
//                                     let mockPrice = mockLTPs[leg.inst?.id] || leg.entryPrice;
                                    
//                                     if (checkPrice !== null) {
//                                         const intrinsic = leg.type === 'CE' ? Math.max(0, spotClosePrice - leg.strike) : Math.max(0, leg.strike - spotClosePrice);
//                                         const gap = intrinsic - checkPrice;
                                        
//                                         // Expiry day volatile market me Spot aur VWAP ka gap 100+ points tak ja sakta hai.
//                                         const maxVwapGap = isExpiryDay ? 120 : 60; 
                                        
//                                         // 🔥 PRIORITY 1: THE SMART VWAP-AWARE INTRINSIC GUARD
//                                         if (checkPrice < intrinsic && gap > maxVwapGap) {
//                                             console.log(`🛡️ Intrinsic Guard: Correcting huge API gap! API ₹${checkPrice.toFixed(2)} -> True Value ₹${intrinsic.toFixed(2)}`);
//                                             checkPrice = intrinsic; 
//                                         } 
//                                         // 🔥 PRIORITY 2: FREAK TICK GUARD (Expiry & OTM Aware)
//                                         // else {
//                                         //     const priceDiff = Math.abs(checkPrice - mockPrice);
//                                         //     const isVWAPSettlement = (checkPrice < intrinsic && gap <= maxVwapGap);
//                                         //     const tolerance = isExpiryDay ? (mockPrice * 0.95) : (mockPrice * 0.5); 
                                            
//                                         //     // 🔥 THE OTM ZERO FIX: Expiry ke din OTM option ka 0.05 ho jana natural hai.
//                                         //     const isExpiryOTM = (isExpiryDay && intrinsic === 0 && checkPrice <= 5);
                                            
//                                         //     if (!isVWAPSettlement && !isExpiryOTM && priceDiff > 20 && priceDiff > tolerance) {
//                                         //         console.log(`🛡️ Freak Tick Blocked on ${leg.strike} ${leg.type}! API gave ₹${checkPrice.toFixed(2)} | Using Safe Mock: ₹${mockPrice.toFixed(2)}`);
//                                         //         checkPrice = mockPrice;
//                                         //     }
//                                         // }

//                                         // 🔥 PRIORITY 2: FREAK TICK GUARD (Trust API Mode)
//                                         else {
//                                             // 🔥 SUNIL BHAI'S LOGIC: Trust the API!
//                                             // Downside (Premium girna) IV Crush hai, isse chup-chap pass hone do.
//                                             // Sirf Extreme Upside Spike ko Freak Tick manenge.
//                                             if (checkPrice > (mockPrice * 3) && (checkPrice - mockPrice) > 40) {
//                                                 console.log(`🛡️ Extreme Freak Tick Blocked on ${leg.strike} ${leg.type}! API gave ₹${checkPrice.toFixed(2)} | Using Safe Mock: ₹${mockPrice.toFixed(2)}`);
//                                                 checkPrice = mockPrice;
//                                             }
//                                         }
                                        
//                                         checkPrice = Math.max(0.05, checkPrice);
//                                     } else {
//                                         // Agar API complete fail ho jaye
//                                         checkPrice = mockPrice;
//                                     }

//                                     const mult = leg.lots * (leg.inst?.lotSize || 65);
//                                     tempRealPnL += leg.action === 'BUY' ? (checkPrice - leg.entryPrice) * mult : (leg.entryPrice - checkPrice) * mult;
//                                 }
//                                 return tempRealPnL;
//                             }
//                         );


//                         // 🔥 NAYA FIX: EARLY BREACH PE REAL API PRICE MANGO!
//                         if (decision && decision.action === 'FETCH_REAL_PRICES_FOR_RECOVERY') {
                            
//                             // 1. Dhan API se asli price laao (e.g., -₹5288)
//                             const realPnL = await executeRealExit(decision.reason, currentTimeStr);
                            
//                             // 2. Real PnL wapas Engine ko do recovery ka faisla lene ke liye!
//                             const recoveryDecision = ratioEngine.processRealExitAndRecovery(realPnL, currentTimeStr, mockLTPs);
                            
//                             if (recoveryDecision && recoveryDecision.action === 'RECOVERY_SWITCH') {
//                                 console.log(`\n🚑 [RECOVERY TRIGGERED] Switching to Firefighting Mode at ${currentTimeStr} | Spot: ₹${spotClosePrice}`);
//                                 console.log(`   📉 Realized Loss booked: ₹${realPnL.toFixed(2)}`);
                                
//                                 // 🔥 NAYA FIX: MULTI-RECOVERY COUNTER (The Foolproof Way)
//                                 if (!ratioEngine.customRecoveryCount) ratioEngine.customRecoveryCount = 0;
//                                 ratioEngine.customRecoveryCount += 1; // 1 = First Recovery, 2 = Second Recovery
                                
//                                 const isSequentialRecovery = (ratioEngine.customRecoveryCount > 1);

//                                 // 1. Pehle ka trade DB me save karo
//                                 const exitingTradeSymbol = isSequentialRecovery ? "RECOVERY_TRADE" : "RATIO_SPREAD_MAIN";
//                                 dailyBreakdownMap[dateStr].tradesList.push({
//                                     symbol: exitingTradeSymbol,
//                                     pnl: realPnL,
//                                     // exitType: "STOPLOSS_TO_RECOVERY",
//                                     exitType: decision.reason || "SWITCHED TO RECOVERY",
//                                     exitTime: `${dateStr} ${currentTimeStr}:00`
//                                 });
//                                 dailyBreakdownMap[dateStr].pnl += realPnL;
//                                 dailyBreakdownMap[dateStr].trades += 1;

//                                 // 🔥 2. MULTI-RECOVERY BUDGET RULE
//                                 const remainingLossCap = ratioEngine.maxLossLimit - Math.abs(ratioEngine.realizedLoss);
//                                 // Agar pehli baar hai, to 50% use karo. Agar doosri baar hai, to bacha hua pura (100%) paisa laga do!
//                                 const recoveryRiskBudget = isSequentialRecovery ? remainingLossCap : (remainingLossCap * 0.5);
                                
//                                 // 🔥 3. TREND DIRECTION RULE
//                                 let recoveryType = "PE";
//                                 if (isSequentialRecovery) {
//                                     // Sirf dusri (2nd) recovery me disha palatni hai!
//                                     const oldType = ratioEngine.activeLegs[0]?.type || "PE";
//                                     recoveryType = (oldType === "PE") ? "CE" : "PE";
//                                     console.log(`   🔄 C2C/SL Hit! Reversing direction to catch trend. Previous was ${oldType}, now Selling ${recoveryType}.`);
//                                 } else {
//                                     // Pehli recovery me engine ne trend se jo disha (PE ya CE) nikali hai, wahi use karo
//                                     recoveryType = ratioEngine.activeLegs[0]?.type || "PE"; 
//                                 }

//                                 const recoveryAtmStrike = calculateATM(spotClosePrice, upperSymbol);
//                                 console.log(`\n📡 [API CALL] Fetching REAL Recovery Entry Premium for ATM Strike ${recoveryAtmStrike} ${recoveryType} at ${currentTimeStr}...`);
                                
//                                 let recoveryEntryPrice = 50; 
//                                 try {
//                                     const axios = require('axios');
//                                     let expFlag = "WEEK"; let expCode = 1;
//                                     let reqExpiry = autoCorrectExpiryType(upperSymbol, dateStr, strategyLegs[0]?.expiry || "WEEKLY");
//                                     if (reqExpiry.toUpperCase() === "MONTHLY") { expFlag = "MONTH"; }
//                                     else if (reqExpiry.toUpperCase() === "NEXT WEEKLY" || reqExpiry.toUpperCase() === "NEXT WEEK") { expCode = 2; }
//                                     const exchSegment = (Number(spotSecurityId) === 51 || Number(spotSecurityId) === 69) ? "BSE_FNO" : "NSE_FNO";

//                                     const res = await axios.post('https://api.dhan.co/v2/charts/rollingoption', {
//                                         exchangeSegment: exchSegment, interval: "1", securityId: Number(spotSecurityId), instrument: "OPTIDX",
//                                         expiryFlag: expFlag, expiryCode: expCode, drvOptionType: recoveryType === "CE" ? "CALL" : "PUT",
//                                         requiredData: ["open", "strike"], fromDate: dateStr, toDate: dateStr, strike: "ATM"
//                                     }, { headers: { 'access-token': broker.apiSecret, 'client-id': broker.clientId, 'Content-Type': 'application/json' }, timeout: 4000 });

//                                     const optKey = recoveryType === "CE" ? "ce" : "pe";
//                                     if (res.data && res.data.data && res.data.data[optKey]) {
//                                         const chart = res.data.data[optKey];
//                                         for (let k = 0; k < chart.timestamp.length; k++) {
//                                             const optTime = new Date(chart.timestamp[k] * 1000 + (5.5 * 3600000));
//                                             if (optTime.toISOString().split('T')[1].substring(0, 5) === currentTimeStr) {
//                                                 recoveryEntryPrice = chart.open[k];
//                                                 break;
//                                             }
//                                         }
//                                     }
//                                 } catch(e) { }

//                                 // 🔥 SMART POSITION SIZING (UI wale Buffer ke hisaab se)
//                                 const realLotSize = Number(instrumentData.lotSize) || Number(strategyLegs[0]?.quantity) || 65;

//                                 // 1. UI se aane wala Stop Loss Buffer points (Agar UI se nahi aaya to default 15 points)
//                                 const slBufferPoints = ratioEngine.config.riskManagement?.recoverySettings?.slBufferPoints || 15;

//                                 // 2. Dynamic Lots calculation
//                                 let dynamicLots = Math.floor(recoveryRiskBudget / (slBufferPoints * realLotSize));

//                                 // 3. Rules: Kam se kam 1 lot lenge, aur maximum 4 lots lenge (Ise bhi UI se dynamic kar sakte hain baad me)
//                                 if (dynamicLots < 1) dynamicLots = 1; 
//                                 if (dynamicLots > 4) dynamicLots = 4;

//                                 currentStartMin = timeInMinutes; 
//                                 ratioEngine.tradeStartTime = timeInMinutes;
//                                 ratioEngine.entrySpotPrice = spotClosePrice; // Recovery trade ka time lock

//                                 ratioEngine.activeLegs = [
//                                     { strike: recoveryAtmStrike, type: recoveryType, action: 'SELL', entryPrice: recoveryEntryPrice, lots: dynamicLots, tag: 'RECOVERY', inst: { id: `${recoveryType}_RECOVERY`, lotSize: realLotSize } }
//                                 ];
                                
//                                 console.log(`   🔥 [RECOVERY ENTRY] Sold ${dynamicLots} Lot(s) ${recoveryType} @ Strike ${recoveryAtmStrike} | Premium: ₹${recoveryEntryPrice.toFixed(2)} | Risk Allocated: -₹${recoveryRiskBudget.toFixed(2)}`);
                                
//                                 ratioEngine.status = 'RECOVERY_MODE';
//                             }
                            
//                             else if (recoveryDecision && recoveryDecision.action === 'EXIT_ALL') {
//                                 // 🔥 SMART SYMBOL (BULLETPROOF): Status 'COMPLETED' ho chuka hai, 
//                                 // isliye hum sidha activeLegs ka 'tag' check karenge!
//                                 const isRecoveryTrade = ratioEngine.activeLegs.some(leg => leg.tag === 'RECOVERY');
//                                 const finalTradeSymbol = isRecoveryTrade ? "RECOVERY_TRADE" : "RATIO_SPREAD_MAIN";
                                                            
//                                 dailyBreakdownMap[dateStr].tradesList.push({
//                                     symbol: finalTradeSymbol,
//                                     pnl: realPnL,
//                                     exitType: recoveryDecision.reason,
//                                     exitTime: `${dateStr} ${currentTimeStr}:00`
//                                 });
//                                 dailyBreakdownMap[dateStr].pnl += realPnL;
//                                 dailyBreakdownMap[dateStr].trades += 1;
//                                 ratioEngine.status = 'COMPLETED';
//                             }
//                         }

//                         // For Late Exit (SQUARE OFF)
//                         else if (decision && decision.action === 'EXIT_ALL') {
//                             const exitReason = decision.reason || "STRATEGY_EXIT";
//                             const finalPnL = await executeRealExit(exitReason, currentTimeStr); 
                            
//                             console.log(`\n🎯 [EXIT ALL] Reason: ${exitReason} | Time: ${currentTimeStr} | Spot: ₹${spotClosePrice}`);
//                             console.log(`   💰 Final PnL booked: ₹${finalPnL.toFixed(2)}`);

//                             dailyBreakdownMap[dateStr].tradesList.push({
//                                 symbol: ratioEngine.status === 'RECOVERY_MODE' ? "RECOVERY_TRADE" : "RATIO_SPREAD_MAIN",
//                                 pnl: finalPnL,
//                                 exitType: exitReason,
//                                 exitTime: `${dateStr} ${currentTimeStr}:00`
//                             });
//                             dailyBreakdownMap[dateStr].pnl += finalPnL;
//                             dailyBreakdownMap[dateStr].trades += 1;
//                             ratioEngine.status = 'COMPLETED'; 
//                         }
//                     }
//                 }
                
//                 continue; // 🔥 ISE BILKUL NAHI HATANA HAI!
//             }

//             // 1. Agar Time-Based strategy hai, to time aane par signal TRUE karo
//             if (isTimeBased) { 
//                 if (timeInMinutes >= currentStartMin && !dailyBreakdownMap[dateStr].hasTradedTimeBased && isCncEntryDay) {
//                     longSignal = true;
//                     dailyBreakdownMap[dateStr].hasTradedTimeBased = true;
//                 }
//             } 
//             // 2. Agar Indicator-Based strategy hai, aur waqt Start Time se chhota hai, 
//             // to chahe indicator signal de de, use BLOCK (false) kardo!
//             else {
//                 if (timeInMinutes < currentStartMin) {
//                     longSignal = false;
//                     shortSignal = false;
//                 }
//             }

//             // 🔥 THE CULPRIT KILLED: यह कोड सिर्फ तभी इंडिकेटर को देखेगा जब स्ट्रेटेजी Price Action न हो
//             if (strategy.type !== "Price Action Based" && strategy.data?.type !== "Price Action Based") {
//                 finalLongSignal = (txnType === 'Both Side' || txnType === 'Only Long' || isTimeBased) ? longSignal : false;
//                 finalShortSignal = (txnType === 'Both Side' || txnType === 'Only Short') ? shortSignal : false;
//             }

//             // 🛑 GATEKEEPER BLOCK: अगर 9:15 (Start Time) से पहले का सिग्नल है, तो उसे रोक दो
//             if (timeInMinutes < currentStartMin && !isTimeBased) {
//                 finalLongSignal = false;
//                 finalShortSignal = false;
//             }

//             let exitLongSignal = false;
//             if (exitLongRules.length > 0) {
//                 let overallResult = null;
//                 exitLongRules.forEach((rule, idx) => {
//                     const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
//                     const ruleResult = evaluateCondition(
//                         calcExitLongInd1[idx] ? calcExitLongInd1[idx][i] : null, calcExitLongInd2[idx] ? calcExitLongInd2[idx][i] : null,
//                         (i > 0 && calcExitLongInd1[idx]) ? calcExitLongInd1[idx][i - 1] : null, (i > 0 && calcExitLongInd2[idx]) ? calcExitLongInd2[idx][i - 1] : null, operator
//                     );
//                     if (idx === 0) overallResult = ruleResult;
//                     else {
//                         const logicalOp = exitConds.logicalOpsLong ? exitConds.logicalOpsLong[idx - 1] : 'AND';
//                         overallResult = logicalOp === 'AND' ? (overallResult && ruleResult) : (overallResult || ruleResult);
//                     }
//                 });
//                 exitLongSignal = overallResult;
//             }

//             let exitShortSignal = false;
//             if (exitShortRules.length > 0) {
//                 let overallResult = null;
//                 exitShortRules.forEach((rule, idx) => {
//                     const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
//                     const ruleResult = evaluateCondition(
//                         calcExitShortInd1[idx] ? calcExitShortInd1[idx][i] : null, calcExitShortInd2[idx] ? calcExitShortInd2[idx][i] : null,
//                         (i > 0 && calcExitShortInd1[idx]) ? calcExitShortInd1[idx][i - 1] : null, (i > 0 && calcExitShortInd2[idx]) ? calcExitShortInd2[idx][i - 1] : null, operator
//                     );
//                     if (idx === 0) overallResult = ruleResult;
//                     else {
//                         const logicalOp = exitConds.logicalOpsShort ? exitConds.logicalOpsShort[idx - 1] : 'AND';
//                         overallResult = logicalOp === 'AND' ? (overallResult && ruleResult) : (overallResult || ruleResult);
//                     }
//                 });
//                 exitShortSignal = overallResult;
//             }

//             const isMarketOpen = timeInMinutes >= 555 && timeInMinutes < exitMin;
//             const isExitTime = timeInMinutes >= exitMin;
//             let isLastCandleOfDay = false;
//             if (i === cachedData.length - 1) isLastCandleOfDay = true;
//             else {
//                 const nextCandleIst = new Date(new Date(cachedData[i + 1].timestamp).getTime() + (5.5 * 60 * 60 * 1000));
//                 if (nextCandleIst.toISOString().split('T')[0] !== dateStr) isLastCandleOfDay = true;
//             }

//             const spotClosePrice = parseFloat(candle.close);

//             // =========================================================
//             // 🛡️ 1. M2M RISK CHECK & MULTI-LEG EVALUATION
//             // =========================================================
//             if (openTrades.length > 0) {
//                 let combinedOpenPnL = 0;
//                 let triggerReasonForExitAll = null;

//                 openTrades.forEach(trade => {
//                     let currentClose = spotClosePrice;
//                     let currentHigh = spotClosePrice;
//                     let currentLow = spotClosePrice;
//                     let currentOpen = spotClosePrice;

//                     // 🎯 STEP 1: Intrinsic Value MUST use 'spotClosePrice' (Candle ke High/Low ka dhokha nahi)
//                     let intrinsicValueAtClose = 0;
//                     if (isOptionsTrade && trade.optionConfig) {
//                         const fixedStrike = Number(trade.optionConfig.strike);
//                         if (trade.optionConfig.type === "CE") {
//                             intrinsicValueAtClose = Math.max(0, spotClosePrice - fixedStrike);
//                         } else {
//                             intrinsicValueAtClose = Math.max(0, fixedStrike - spotClosePrice);
//                         }
//                     }

//                     if (isOptionsTrade && trade.premiumChart && trade.premiumChart.start_Time) {
//                         let exactMatchIndex = trade.premiumChart.start_Time.findIndex(t => {
//                             const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                             return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                         });

//                         let isFakeData = false;
                        
//                         if (exactMatchIndex !== -1) {
//                             let tempClose = parseFloat(trade.premiumChart.close[exactMatchIndex]);
                            
//                             // 🛡️ THE GHOST CATCHER 4.0 (Perfect Sanity Check)
//                             if (!tempClose || isNaN(tempClose) || tempClose <= 0) {
//                                 isFakeData = true; 
//                             } else if (intrinsicValueAtClose > 10 && tempClose < (intrinsicValueAtClose * 0.7)) {
//                                 // Agar option ka close price Nifty ke close intrinsic se bahut kam hai, tabhi FAKE mano!
//                                 isFakeData = true; 
//                             }

//                             if (!isFakeData) {
//                                 currentClose = tempClose;
//                                 currentHigh = parseFloat(trade.premiumChart.high[exactMatchIndex]);
//                                 currentLow = parseFloat(trade.premiumChart.low[exactMatchIndex]);
//                                 currentOpen = parseFloat(trade.premiumChart.open[exactMatchIndex]);
//                                 trade.lastKnownPremium = currentClose;
//                             }
//                         } else {
//                             isFakeData = true; // API Data Missing
//                         }
                        
//                         // 🟢 THE BLIND SPOT TRACKER 🟢
//                         if (isFakeData) {
//                             let fallbackPremium = trade.lastKnownPremium || trade.entryPrice;
//                             // Fake/Missing data aane par real loss chhupne na paye
//                             currentClose = Math.max(fallbackPremium, intrinsicValueAtClose); 
//                             currentHigh = currentLow = currentOpen = currentClose;
//                         }

//                     } else if (!isOptionsTrade) {
//                         currentHigh = parseFloat(candle.high); currentLow = parseFloat(candle.low); currentClose = parseFloat(candle.close); currentOpen = parseFloat(candle.open);
//                     }

//                     trade.currentPrice = currentClose;
//                     trade.currentHigh = currentHigh;
//                     trade.currentLow = currentLow;
//                     trade.currentOpen = currentOpen;
//                     trade.openPnL = calcTradePnL(trade.entryPrice, currentClose, trade.quantity, trade.transaction);
//                     combinedOpenPnL += trade.openPnL;
//                 });



//                 const realizedDailyPnL = dailyBreakdownMap[dateStr].pnl;
//                 const currentTotalPnL = realizedDailyPnL + combinedOpenPnL;

//                 let hitGlobalMaxProfit = false;
//                 let hitGlobalMaxLoss = false;

//                 if (globalMaxProfit > 0 && currentTotalPnL >= globalMaxProfit) {
//                     hitGlobalMaxProfit = true;
//                     isTradingHaltedForDay = true;
//                     triggerReasonForExitAll = "MAX_PROFIT";
//                 } else if (globalMaxLoss > 0 && currentTotalPnL <= -globalMaxLoss) {
//                     hitGlobalMaxLoss = true;
//                     isTradingHaltedForDay = true;
//                     triggerReasonForExitAll = "MAX_LOSS";
//                 }


//                 let anyLegHitSlPast = dailyBreakdownMap[dateStr].tradesList.some(t => t.exitType === "STOPLOSS" || t.exitType === "SL_MOVED_TO_COST");
//                 let anyLegHitSlThisTick = false;


//                 // 🔥 V-SHAPE RECOVERY UPGRADE: Check if user wants independent trailing
//                 let isSlMovedToCostGlobal = false;

//                 // Pata karo ki kya user ne Independent Trailing ON rakhi hai (Frontend se aayega)
//                 const isIndependent = strategy?.advanceSettings?.independentTrailing === true || strategy?.data?.advanceSettings?.independentTrailing === true;

//                 if (isIndependent) {
//                     // Aggressive Mode: Sirf pakka Loss (STOPLOSS) ya pakka Target (TARGET) aane par hi dusra leg Cost par jayega. Trailing me azaad rahega!
//                     isSlMovedToCostGlobal = dailyBreakdownMap[dateStr].tradesList.some(t =>
//                         ["STOPLOSS", "TARGET"].includes(t.exitType)
//                     );
//                 } else {
//                     // Conservative Mode (Default): Kisi bhi wajah se leg kata (Trailing, Lock etc.), to dusra leg Cost par chala jayega.
//                     isSlMovedToCostGlobal = dailyBreakdownMap[dateStr].tradesList.some(t =>
//                         ["STOPLOSS", "SL_MOVED_TO_COST", "TRAILING_SL", "TARGET", "LOCK_FIX_PROFIT", "LOCK_AND_TRAIL"].includes(t.exitType)
//                     );
//                 }


//                 openTrades.forEach((trade, idx) => {
//                     if (trade.markedForExit) return;

//                     // 🔥 FIX 2: Realistic MTM Exit Price (No fake math that breaks multi-leg!)
//                     if (hitGlobalMaxProfit || hitGlobalMaxLoss) {
//                         trade.markedForExit = true;
//                         trade.exitReason = hitGlobalMaxProfit ? "MAX_PROFIT" : "MAX_LOSS";
//                         trade.exitPrice = trade.currentPrice;
//                         return;
//                     }

//                     const legData = trade.legConfig;
//                     const slValue = Number(legData.slValue || 0);
//                     const slType = legData.slType || "Points";
//                     const tpValue = Number(legData.tpValue || 0);
//                     const tpType = legData.tpType || "Points";

//                     let slPrice = 0, tpPrice = 0;
//                     let isSlMovedToCost = false;

//                     if (advanceFeaturesSettings.moveSLToCost && isSlMovedToCostGlobal) {
//                         isSlMovedToCost = true;
//                     }

//                     if (trade.transaction === "BUY") {
//                         if (isSlMovedToCost) slPrice = trade.entryPrice;
//                         else slPrice = slType === "Points" ? trade.entryPrice - slValue : trade.entryPrice * (1 - slValue / 100);
//                         tpPrice = tpType === "Points" ? trade.entryPrice + tpValue : trade.entryPrice * (1 + tpValue / 100);
//                     } else {
//                         if (isSlMovedToCost) slPrice = trade.entryPrice;
//                         else slPrice = slType === "Points" ? trade.entryPrice + slValue : trade.entryPrice * (1 + slValue / 100);
//                         tpPrice = tpType === "Points" ? trade.entryPrice - tpValue : trade.entryPrice * (1 - tpValue / 100);
//                     }

//                     // ==============================================================
//                     // 🎯 ADVANCE FEATURE: TRAIL SL (Sniper Guard)
//                     // ==============================================================
//                     let isLegTrailed = false;
//                     if (advanceFeaturesSettings.trailSL && !isSlMovedToCost) {
//                         const trailConfig = advanceFeaturesSettings.trailSLConfig || {};
//                         const initialSL = slPrice;

//                         const newTrailedSL = calculateTrailedSL(
//                             trade.transaction,
//                             trade.entryPrice,
//                             initialSL,
//                             trade.currentPrice, // Current LTP of the leg
//                             trailConfig,
//                             trade.currentTrailedSL
//                         );

//                         trade.currentTrailedSL = newTrailedSL;
//                         slPrice = newTrailedSL; // 🔥 Override main SL price!

//                         if (newTrailedSL !== initialSL) isLegTrailed = true;
//                     }
//                     // ==============================================================

//                     let spotTriggeredSl = false;
//                     let spotTriggeredTp = false;

//                     if (isOptionsTrade && trade.optionConfig) {
//                         const optType = trade.optionConfig.type;
//                         const entrySpot = trade.optionConfig.strike;
//                         const assumedDelta = 0.5;
//                         const slGap = Math.abs(slPrice - trade.entryPrice);
//                         const tpGap = Math.abs(tpPrice - trade.entryPrice);
//                         const reqSpotMoveSl = slGap / assumedDelta;
//                         const reqSpotMoveTp = tpGap / assumedDelta;

//                         if (trade.transaction === "BUY") {
//                             if (optType === "CE") {
//                                 if (slValue > 0 && spotClosePrice <= entrySpot - reqSpotMoveSl) spotTriggeredSl = true;
//                                 if (tpValue > 0 && spotClosePrice >= entrySpot + reqSpotMoveTp) spotTriggeredTp = true;
//                             } else {
//                                 if (slValue > 0 && spotClosePrice >= entrySpot + reqSpotMoveSl) spotTriggeredSl = true;
//                                 if (tpValue > 0 && spotClosePrice <= entrySpot - reqSpotMoveTp) spotTriggeredTp = true;
//                             }
//                         } else {
//                             if (optType === "CE") {
//                                 if (slValue > 0 && spotClosePrice >= entrySpot + reqSpotMoveSl) spotTriggeredSl = true;
//                                 if (tpValue > 0 && spotClosePrice <= entrySpot - reqSpotMoveTp) spotTriggeredTp = true;
//                             } else {
//                                 if (slValue > 0 && spotClosePrice <= entrySpot - reqSpotMoveSl) spotTriggeredSl = true;
//                                 if (tpValue > 0 && spotClosePrice >= entrySpot + reqSpotMoveTp) spotTriggeredTp = true;
//                             }
//                         }

//                         // 🔥 THE SMC SPOT SL OVERRIDE (Super Accurate Risk Management) 🔥
//                         if (trade.spotSlPrice && trade.spotSlPrice > 0) {
                            
//                             // A. पुराने Delta वाले SL को रीसेट कर दो (क्योंकि SMC में Delta SL काम का नहीं है)
//                             spotTriggeredSl = false; 

//                             // B. अपना नया SMC Spot Chart वाला SL लगाओ
//                             if (optType === "CE" && spotClosePrice <= trade.spotSlPrice) {
//                                 spotTriggeredSl = true; // CALL के लिए: Spot अगर SL लाइन से नीचे गिरा
//                             }
//                             if (optType === "PE" && spotClosePrice >= trade.spotSlPrice) {
//                                 spotTriggeredSl = true; // PUT के लिए: Spot अगर SL लाइन से ऊपर गया
//                             }
//                         }
//                     }

//                     // 🔥 THE FIX: Added isLegTrailed condition
//                     // 🔥 THE ULTIMATE PNL & SL FIX 🔥
//                     let isNormalSlHit = false;
                    
//                     // अगर UI में SL 0 से ज्यादा है या फिर Trailing/Cost SL एक्टिव है, तभी Premium का Low/High चेक करो!
//                     if (slValue > 0 || isSlMovedToCost || isLegTrailed) {
//                         if (trade.transaction === "BUY" && trade.currentLow <= slPrice) isNormalSlHit = true;
//                         if (trade.transaction === "SELL" && trade.currentHigh >= slPrice) isNormalSlHit = true;
//                     }

//                     if (spotTriggeredSl || isNormalSlHit) {
//                         trade.markedForExit = true;
//                         trade.exitReason = isSlMovedToCost ? "SL_MOVED_TO_COST" : (isLegTrailed ? "LEG_TRAIL_SL" : "STOPLOSS");
                        
//                         // 🔥 THE 0.00 PnL KILLER: अगर SMC का Spot SL हिट हुआ है, तो एग्जिट प्राइस में कैंडल का रियल क्लोज़ भाव डालो!
//                         if (spotTriggeredSl && !isSlMovedToCost && !isLegTrailed) {
//                             trade.exitPrice = trade.currentPrice; // ✅ FIX: currentPrice use karna hai
//                         } else {
//                             trade.exitPrice = slPrice; 
//                         }
                        
//                         triggerReasonForExitAll = trade.exitReason;
//                     }

//                     if (tpValue > 0 && !trade.markedForExit) {
//                         if (spotTriggeredTp || (trade.transaction === "BUY" && trade.currentHigh >= tpPrice) || (trade.transaction === "SELL" && trade.currentLow <= tpPrice)) {
//                             trade.markedForExit = true; trade.exitReason = "TARGET"; trade.exitPrice = tpPrice;
//                             triggerReasonForExitAll = "TARGET";
//                         }
//                     }

//                     if (!trade.markedForExit) {
//                         const tslResult = evaluateTrailingSL(trade, trade.openPnL, riskSettings, trade.quantity);
//                         if (tslResult.isModified) trade.trailingSL = tslResult.newTrailingSL;

//                         if (trade.trailingSL) {
//                             if ((trade.transaction === "BUY" && trade.currentLow <= trade.trailingSL) || (trade.transaction === "SELL" && trade.currentHigh >= trade.trailingSL)) {
//                                 trade.markedForExit = true;

//                                 // 🔥 THE FIX: State bhoolne ki problem khatam! Direct Strategy settings se naam uthao.
//                                 if (riskSettings.profitTrailing === 'Lock Fix Profit') {
//                                     trade.exitReason = "LOCK_FIX_PROFIT";
//                                 } else if (riskSettings.profitTrailing === 'Lock and Trail') {
//                                     trade.exitReason = "LOCK_AND_TRAIL";
//                                 } else {
//                                     trade.exitReason = "TRAILING_SL";
//                                 }

//                                 trade.exitPrice = trade.trailingSL;
//                                 triggerReasonForExitAll = trade.exitReason;
//                             }
//                         }
//                     }

//                     if (!trade.markedForExit) {
//                         if ((trade.signalType === "LONG" && exitLongSignal) || (trade.signalType === "SHORT" && exitShortSignal)) {
//                             trade.markedForExit = true; trade.exitReason = "INDICATOR_EXIT"; trade.exitPrice = trade.currentPrice;
//                         }
//                     }
//                 });


//                 let remainingTrades = [];
//                 let pendingMTMExits = []; // MTM ke kachre ko hold karega
//                 let confirmedOtherExits = []; // Pakke trades hold karega
                
//                 for (let trade of openTrades) {
                    
//                     // 🔥 THE UNIVERSAL EXIT CHECK (MIS, BTST, CNC)
//                     let forceSquareOff = false;
                    
//                     if (orderType === "MIS") {
//                         if (isExitTime || isLastCandleOfDay) forceSquareOff = true;
//                     } 
//                     else if (orderType === "BTST") {
//                         // BTST Logic: Check if we have crossed into the "Next Day"
//                         const tradeEntryDate = trade.entryTime.split(' ')[0]; // Format: DD/MM/YYYY
//                         const currentDateFormatted = dateStr.split('-').reverse().join('/');
                        
//                         if (currentDateFormatted !== tradeEntryDate) {
//                             // Bhai, kal subah ho gayi hai! Ab Next Day Square Off Time check karo
//                             if (timeInMinutes >= nextDayExitMin || isLastCandleOfDay) {
//                                 forceSquareOff = true;
//                                 trade.exitReason = "BTST_EXIT";
//                             }
//                         }
//                         // Note: Agar aaj hi ka din hai (currentDateFormatted === tradeEntryDate), toh EOD par nahi katega!
//                     } 
//                     else if (orderType === "CNC") {
//                         let actualTradeExpiryStr = "";
//                         const expMatch = trade.symbol.match(/(?:Upcoming )?(EXP \d{2}[A-Z]{3}\d{2})/i);

//                         if (expMatch && expMatch[1]) {
//                             actualTradeExpiryStr = expMatch[1]; 
//                         } else {
//                             actualTradeExpiryStr = getNearestExpiryString(dateStr, upperSymbol, trade.legConfig?.expiry || "WEEKLY");
//                         }

//                         const tradeDTE = getTradingDaysToExpiry(istDate, actualTradeExpiryStr);

//                         if (tradeDTE <= cncExitDays && isExitTime) forceSquareOff = true;
//                         else if (tradeDTE <= 0 && isLastCandleOfDay) forceSquareOff = true; 
//                         else if (isExitTime && trade.exitReason) forceSquareOff = true; 
//                     }

//                     // 🔥 PURANI LINE KO ISSE REPLACE KAREIN 👇
//                     if (trade.markedForExit || forceSquareOff) {
//                         if (!trade.markedForExit) {
//                             trade.markedForExit = true; // 🚨 YEH MISSING THA! Iske bina engine ghum gaya tha!
//                             // 🛡️ TAG PROTECTOR: Agar pehle se BTST_EXIT tag nahi hai, tabhi TIME_SQUAREOFF lagao
//                             if (!trade.exitReason) {
//                                 trade.exitReason = isLastCandleOfDay ? "EOD_SQUAREOFF" : "TIME_SQUAREOFF";
//                             }
//                         }

//                         // =========================================================================
//                         // 🔴 THE SNIPER GATEKEEPER
//                         // =========================================================================
//                         const needsMarketPrice = ["MAX_LOSS", "MAX_PROFIT", "TIME_SQUAREOFF", "EOD_SQUAREOFF", "BTST_EXIT", "INDICATOR_EXIT", "STOPLOSS", "TARGET", "TRAILING_SL", "SL_MOVED_TO_COST", "LOCK_FIX_PROFIT", "LOCK_AND_TRAIL", "LEG_TRAIL_SL"].includes(trade.exitReason) || String(trade.exitReason).startsWith("EXIT_ALL");
//                         let fakeTriggerRejected = false;

//                         if (isOptionsTrade && broker && needsMarketPrice && trade.optionConfig) {
//                             const fixedStrike = Number(trade.optionConfig.strike);
//                             const optType = trade.optionConfig.type;
//                             const exitTimeStr = `${h}:${m}`;
//                             const cacheKey = `${fixedStrike}_${optType}_${dateStr}`;

//                             let exitData = null;
//                             let actualExitIndex = -1;
//                             let foundExactExit = false;

//                             if (optionDataCache[cacheKey]) {
//                                 let cachedChart = optionDataCache[cacheKey];
//                                 for (let k = 0; k < cachedChart.timestamp.length; k++) {
//                                     const optTime = new Date(cachedChart.timestamp[k] * 1000 + (5.5 * 3600000));
//                                     if (optTime.toISOString().split('T')[1].substring(0, 5) === exitTimeStr) {
//                                         if (cachedChart.strike && Number(cachedChart.strike[k]) === fixedStrike) {
//                                             actualExitIndex = k;
//                                             exitData = cachedChart;
//                                             foundExactExit = true;
//                                         }
//                                         break;
//                                     }
//                                 }
//                             }

//                             if (!foundExactExit) {
//                                 const axios = require('axios');
//                                 const https = require('https');

//                                 const keepAliveAgent = new https.Agent({ keepAlive: true, rejectUnauthorized: false });
//                                 const ghostHeaders = {
//                                     'access-token': broker.apiSecret,
//                                     'client-id': broker.clientId,
//                                     'Content-Type': 'application/json',
//                                     'User-Agent': 'Mozilla/5.0',
//                                     'Accept': 'application/json',
//                                     'Connection': 'keep-alive'
//                                 };

//                                 let reqExpiry = autoCorrectExpiryType(upperSymbol, dateStr, trade.legConfig.expiry || "WEEKLY");
//                                 let expFlag = "WEEK"; let expCode = 1;
//                                 if (reqExpiry.toUpperCase() === "MONTHLY") { expFlag = "MONTH"; expCode = 1; }
//                                 else if (reqExpiry.toUpperCase() === "NEXT WEEKLY" || reqExpiry.toUpperCase() === "NEXT WEEK") { expFlag = "WEEK"; expCode = 2; }

//                                 const dynamicOptExchange = (Number(spotSecurityId) === 51 || Number(spotSecurityId) === 69) ? "BSE_FNO" : "NSE_FNO";

//                                 const basePayload = {
//                                     exchangeSegment: dynamicOptExchange, 
//                                     interval: "1", 
//                                     securityId: Number(spotSecurityId), 
//                                     instrument: "OPTIDX",
//                                     expiryFlag: expFlag, expiryCode: expCode,
//                                     drvOptionType: optType === "CE" ? "CALL" : "PUT",
//                                     requiredData: ["open", "high", "low", "close", "strike"],
//                                     fromDate: dateStr, toDate: dateStr
//                                 };

//                                 const stepSize = (upperSymbol.includes("BANK") || upperSymbol.includes("SENSEX")) ? 100 : 50;

//                                 let dhanActualAtm = null;

//                                 try {
//                                     await delay(250);
//                                     const atmRes = await axios.post('https://api.dhan.co/v2/charts/rollingoption', { ...basePayload, strike: "ATM" }, {
//                                         headers: ghostHeaders,
//                                         httpsAgent: keepAliveAgent,
//                                         timeout: 8000
//                                     });

//                                     const optKey = optType === "CE" ? "ce" : "pe";
//                                     let atmExitData = atmRes.data && atmRes.data.data ? atmRes.data.data[optKey] : null;

//                                     if (atmExitData && atmExitData.timestamp) {
//                                         for (let k = 0; k < atmExitData.timestamp.length; k++) {
//                                             const optTime = new Date(atmExitData.timestamp[k] * 1000 + (5.5 * 3600000));
//                                             if (optTime.toISOString().split('T')[1].substring(0, 5) === exitTimeStr) {
//                                                 dhanActualAtm = Number(atmExitData.strike[k]);
//                                                 if (dhanActualAtm === fixedStrike) {
//                                                     exitData = atmExitData;
//                                                     actualExitIndex = k;
//                                                     foundExactExit = true;
//                                                     optionDataCache[cacheKey] = exitData;
//                                                 }
//                                                 break;
//                                             }
//                                         }
//                                     }
//                                 } catch (e) {
//                                     console.log(`⚠️ Anchor ATM fetch failed. Using Fallback Spot math.`);
//                                 }

//                                 if (!foundExactExit) {
//                                     const referenceAtm = dhanActualAtm ? dhanActualAtm : calculateATM(spotClosePrice, upperSymbol);
//                                     const strikeDiff = fixedStrike - referenceAtm;
//                                     const exactStep = Math.round(strikeDiff / stepSize);

//                                     let candidates = [
//                                         `ITM${exactStep}`,
//                                         `ITM${exactStep + 1}`,
//                                         `ITM${exactStep - 1}`
//                                     ];

//                                     let retryCount = 0;
//                                     for (let c = 0; c < candidates.length; c++) {
//                                         let guess = candidates[c];
//                                         await delay(300);

//                                         try {
//                                             const exitRes = await axios.post('https://api.dhan.co/v2/charts/rollingoption', { ...basePayload, strike: guess }, {
//                                                 headers: ghostHeaders,
//                                                 httpsAgent: keepAliveAgent,
//                                                 timeout: 8000
//                                             });

//                                             retryCount = 0;

//                                             const optKey = optType === "CE" ? "ce" : "pe";
//                                             let tempExitData = exitRes.data && exitRes.data.data ? exitRes.data.data[optKey] : null;

//                                             if (tempExitData && tempExitData.timestamp) {
//                                                 let tempIndex = -1;
//                                                 for (let k = 0; k < tempExitData.timestamp.length; k++) {
//                                                     const optTime = new Date(tempExitData.timestamp[k] * 1000 + (5.5 * 3600000));
//                                                     if (optTime.toISOString().split('T')[1].substring(0, 5) === exitTimeStr) { tempIndex = k; break; }
//                                                 }

//                                                 if (tempIndex !== -1 && tempExitData.strike && Number(tempExitData.strike[tempIndex]) === fixedStrike) {
//                                                     exitData = tempExitData;
//                                                     actualExitIndex = tempIndex;
//                                                     foundExactExit = true;
//                                                     optionDataCache[cacheKey] = exitData;
//                                                     break;
//                                                 }
//                                             }
//                                         } catch (e) {
//                                             const status = e.response ? e.response.status : 0;
//                                             if (status === 429 || status === 0 || status >= 500 || (e.response && e.response.data && e.response.data.errorCode === 'DH-904')) {
//                                                 if (retryCount < 1) {
//                                                     await delay(3000);
//                                                     retryCount++;
//                                                     c--;
//                                                     continue;
//                                                 }
//                                             }
//                                             retryCount = 0;
//                                         }
//                                     }
//                                 }
//                             }

//                             if (foundExactExit && exitData) {
//                                 const mathPrice = trade.exitPrice;
//                                 const cOpen = exitData.open[actualExitIndex];
//                                 const cHigh = exitData.high[actualExitIndex];
//                                 const cLow = exitData.low[actualExitIndex];
//                                 const cClose = exitData.close[actualExitIndex];

//                                 let isValidTrigger = true;
//                                 if (["STOPLOSS", "TRAILING_SL", "SL_MOVED_TO_COST", "LOCK_FIX_PROFIT", "LOCK_AND_TRAIL", "LEG_TRAIL_SL"].includes(trade.exitReason)) {
//                                     if (trade.transaction === "BUY" && cLow > mathPrice) isValidTrigger = false;
//                                     if (trade.transaction === "SELL" && cHigh < mathPrice) isValidTrigger = false;
//                                 } else if (trade.exitReason === "TARGET") {
//                                     if (trade.transaction === "BUY" && cHigh < mathPrice) isValidTrigger = false;
//                                     if (trade.transaction === "SELL" && cLow > mathPrice) isValidTrigger = false;
//                                 }

//                                 let isFlatline = false;
//                                 if (["TIME_SQUAREOFF", "EOD_SQUAREOFF"].includes(trade.exitReason)) {
//                                     if (cOpen === trade.entryPrice || cClose === trade.entryPrice) {
//                                         isFlatline = true;
//                                     }
//                                 }

//                                 if (!isValidTrigger || isFlatline) {
//                                     fakeTriggerRejected = true;
//                                 } else {
//                                     // 🔥 THE MASTER FIX: PURE API PRICE FOR GLOBAL LIMITS 🔥
//                                     if (["MAX_LOSS", "MAX_PROFIT"].includes(trade.exitReason)) {
//                                         // MTM limits hamesha TIME_SQUAREOFF ki tarah exact real candle price par katenge, no fallback math!
//                                         trade.exitPrice = cOpen; 
//                                     }
//                                     else if (["STOPLOSS", "TARGET", "TRAILING_SL", "SL_MOVED_TO_COST", "LOCK_FIX_PROFIT", "LOCK_AND_TRAIL", "LEG_TRAIL_SL"].includes(trade.exitReason)) {
//                                         if (!useRealisticSlippage) {
//                                             trade.exitPrice = cOpen; 
//                                         } else {
//                                             if (trade.transaction === "BUY") {
//                                                 if (["STOPLOSS", "TRAILING_SL", "SL_MOVED_TO_COST", "LOCK_FIX_PROFIT", "LOCK_AND_TRAIL", "LEG_TRAIL_SL"].includes(trade.exitReason) && cOpen < mathPrice) trade.exitPrice = cOpen;
//                                                 else if (trade.exitReason === "TARGET" && cOpen > mathPrice) trade.exitPrice = cOpen;
//                                                 else trade.exitPrice = mathPrice; 
//                                             } else { 
//                                                 if (["STOPLOSS", "TRAILING_SL", "SL_MOVED_TO_COST", "LOCK_FIX_PROFIT", "LOCK_AND_TRAIL", "LEG_TRAIL_SL"].includes(trade.exitReason) && cOpen > mathPrice) trade.exitPrice = cOpen;
//                                                 else if (trade.exitReason === "TARGET" && cOpen < mathPrice) trade.exitPrice = cOpen;
//                                                 else trade.exitPrice = mathPrice; 
//                                             }
//                                         }
//                                     } else {
//                                         trade.exitPrice = (trade.exitReason === "TIME_SQUAREOFF" || trade.exitReason === "BTST_EXIT" || String(trade.exitReason).startsWith("EXIT_ALL")) ? cOpen : cClose;
//                                     }
//                                 }
//                             }

//                             if (fakeTriggerRejected) {
//                                 if (isExitTime || isLastCandleOfDay) {
//                                     trade.exitReason = isLastCandleOfDay ? "EOD_SQUAREOFF" : "TIME_SQUAREOFF";
//                                     trade.exitPrice = null;
//                                     foundExactExit = false;
//                                 } else {
//                                     trade.markedForExit = false;
//                                     trade.exitReason = null;
//                                     trade.exitPrice = null;
//                                     remainingTrades.push(trade);
//                                     continue;
//                                 }
//                             }



//                                 if (!foundExactExit) {
//                                 // 🔥 THE FIX: Zombie Bug Killed! Removed the 'else' block that was rejecting Max Loss!
//                                 if (["MAX_LOSS", "MAX_PROFIT", "STOPLOSS", "TARGET", "TRAILING_SL", "SL_MOVED_TO_COST", "LOCK_FIX_PROFIT", "LOCK_AND_TRAIL", "LEG_TRAIL_SL"].includes(trade.exitReason)) {
//                                     if (isExitTime || isLastCandleOfDay) {
//                                         trade.exitReason = isLastCandleOfDay ? "EOD_SQUAREOFF" : "TIME_SQUAREOFF";
//                                         trade.exitPrice = null;
//                                     }
//                                     // Chupchap aage badho aur Math Fallback se exitPrice nikalo! (No Else Block)
//                                 }


//                                 if (!trade.exitPrice) {
//                                     const currentAtmAtFallback = calculateATM(spotClosePrice, upperSymbol);

//                                     let stepSize = 50; let decayFactor = 1.10; let baseMultiplier = 0.0125;
//                                     if (upperSymbol.includes("BANK") || upperSymbol.includes("SENSEX")) {
//                                         stepSize = 100; decayFactor = 1.15; baseMultiplier = 0.013;
//                                     } else if (upperSymbol.includes("MID")) {
//                                         stepSize = 25; decayFactor = 1.08; baseMultiplier = 0.012;
//                                     }

//                                     const stepDiff = Math.round(Math.abs(fixedStrike - currentAtmAtFallback) / stepSize);

//                                     // 🔥 THE AGGRESSIVE WORST-CASE ESTIMATOR (For Final Exit Price)
//                                     let worstSpot = spotClosePrice;
//                                     if (candle.high && candle.low) {
//                                         if (trade.transaction === "SELL") {
//                                             worstSpot = optType === "CE" ? parseFloat(candle.high) : parseFloat(candle.low);
//                                         } else {
//                                             worstSpot = optType === "CE" ? parseFloat(candle.low) : parseFloat(candle.high);
//                                         }
//                                     }

//                                     let intrinsicValue = 0;
//                                     if (optType === "CE") intrinsicValue = Math.max(0, worstSpot - fixedStrike);
//                                     else intrinsicValue = Math.max(0, fixedStrike - worstSpot);

//                                     let dte = 0;


//                                     try {
//                                         const expMatch = trade.symbol.match(/EXP (\d{2}[A-Z]{3}\d{2})/i);
//                                         if (expMatch && expMatch[1]) {
//                                             const expDay = parseInt(expMatch[1].substring(0, 2));
//                                             const monthStr = expMatch[1].substring(2, 5);
//                                             const expYear = parseInt("20" + expMatch[1].substring(5, 7));
//                                             const monthMap = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
//                                             const expDateObj = new Date(expYear, monthMap[monthStr.toUpperCase()], expDay, 15, 30, 0);

//                                             const diffTime = expDateObj.getTime() - istDate.getTime();
//                                             dte = Math.max(0, diffTime / (1000 * 60 * 60 * 24));
//                                         }
//                                     } catch (e) { dte = 1; }

//                                     let estimatedAtmPremium = 0;
//                                     if (dte >= 1) {
//                                         estimatedAtmPremium = spotClosePrice * baseMultiplier * Math.sqrt(dte / 7);
//                                     } else {
//                                         const minutesLeft = Math.max(0, 930 - timeInMinutes);
//                                         estimatedAtmPremium = spotClosePrice * (baseMultiplier / 2) * Math.sqrt(minutesLeft / 375);
//                                     }

//                                     const estimatedTimeValue = estimatedAtmPremium / Math.pow(decayFactor, stepDiff);
//                                     trade.exitPrice = intrinsicValue + estimatedTimeValue;
//                                 }
//                             }
//                         }

//                         // 🔥 INSTEAD OF DIRECT EXECUTION, SORT THEM FOR REALITY CHECK 🔥
//                         if (trade.exitReason === "MAX_LOSS" || trade.exitReason === "MAX_PROFIT") {
//                             pendingMTMExits.push(trade);
//                         } else {
//                             confirmedOtherExits.push(trade);
//                         }
//                     } else {
//                         remainingTrades.push(trade);
//                     }
//                 } // <-- End of Gatekeeper Loop

//                 // 🛡️ THE REALITY CHECKER (False Alarm Canceller) 🛡️
//                 if (pendingMTMExits.length > 0) {
//                     let actualCombinedPnL = dailyBreakdownMap[dateStr].pnl;
//                     pendingMTMExits.forEach(t => {
//                         actualCombinedPnL += calcTradePnL(t.entryPrice, t.exitPrice, t.quantity, t.transaction);
//                     });

//                     let isRealBreach = false;
//                     if (pendingMTMExits[0].exitReason === "MAX_PROFIT" && globalMaxProfit > 0 && actualCombinedPnL >= globalMaxProfit) isRealBreach = true;
//                     if (pendingMTMExits[0].exitReason === "MAX_LOSS" && globalMaxLoss > 0 && actualCombinedPnL <= -globalMaxLoss) isRealBreach = true;
//                     if (isExitTime || isLastCandleOfDay) isRealBreach = true; // EOD pe toh katna hi hai

//                     if (isRealBreach) {
//                         confirmedOtherExits.push(...pendingMTMExits);
//                     } else {
//                         // 🟢 JADOO: Agar MTM ne fake alarm bajaya, toh use CANCEL karo aur trades wapas chalu karo!
//                         console.log(`🛡️ [FALSE ALARM REJECTED] MTM Hallucinated. Real PnL is ${actualCombinedPnL.toFixed(2)}. Resuming trades...`);
//                         pendingMTMExits.forEach(t => {
//                             t.markedForExit = false;
//                             t.exitReason = null;
//                             t.exitPrice = null;
//                             remainingTrades.push(t);
//                         });
//                         isTradingHaltedForDay = false; // Engine on karo wapas!
//                     }
//                 }

//                 // 🎯 EXECUTE CONFIRMED TRADES
//                 confirmedOtherExits.forEach(trade => {
//                     const pnl = calcTradePnL(trade.entryPrice, trade.exitPrice, trade.quantity, trade.transaction);
                    
//                     const completedTrade = {
//                         ...trade,
//                         exitTime: `${dateStr.split('-').reverse().join('/')} ${h}:${m}:00`,
//                         pnl: pnl,
//                         exitType: trade.exitReason
//                     };

//                     if (advanceFeaturesSettings.reEntryExecute) {
//                         const reConfig = advanceFeaturesSettings.reEntryExecuteConfig || {};
//                         if (["STOPLOSS", "LEG_TRAIL_SL", "SL_MOVED_TO_COST"].includes(trade.exitReason)) {
//                             const currentCycle = trade.reEntryCycle || 0;
//                             if (currentCycle < Number(reConfig.cycles || 0)) {
//                                 pendingReEntries.push({
//                                     ...trade,
//                                     reEntryCycle: currentCycle + 1,
//                                     reEntryConfig: reConfig,
//                                     originalEntryPrice: trade.entryPrice
//                                 });
//                                 console.log(`🚑 [HOSPITAL] Leg ${trade.symbol} sent to recovery | Cycle: ${currentCycle + 1}/${reConfig.cycles}`);
//                             }
//                         }
//                     }

//                     dailyBreakdownMap[dateStr].tradesList.push(completedTrade);
//                     dailyBreakdownMap[dateStr].pnl += pnl;
//                     dailyBreakdownMap[dateStr].trades += 1;
//                     if (pnl > 0) { winTrades++; if (pnl > maxProfitTrade) maxProfitTrade = pnl; }
//                     else { lossTrades++; if (pnl < maxLossTrade) maxLossTrade = pnl; }

//                     console.log(`🎯 [${completedTrade.exitType}] Date: ${dateStr} | Time: ${h}:${m} | Symbol: ${trade.symbol} | Exit: ${trade.exitPrice.toFixed(2)} | PnL: ${pnl.toFixed(2)}`);
//                 });

//                 openTrades = remainingTrades;

//                 // 🔥 NEW BULLETPROOF EXIT ALL LOGIC (Post-Gatekeeper)
//                 // Ye tabhi trigger hoga jab Sniper Gatekeeper kisi leg ko sach me kaat dega
//                 const advanceData = advanceFeaturesSettings;
//                 const isExitAllEnabled = advanceData?.exitAllOnSLTgt === true || advanceData?.exitAllOnSlTgt === true || advanceData?.exitAllOnSLTgt === 'ON';

//                 if (isExitAllEnabled && openTrades.length > 0 && !hitGlobalMaxProfit && !hitGlobalMaxLoss) {
//                     const confirmedTriggers = ["STOPLOSS", "TARGET", "TRAILING_SL", "LOCK_FIX_PROFIT", "LOCK_AND_TRAIL", "LEG_TRAIL_SL"];
//                     let actualTriggerReason = null;

//                     // Check karo ki kya isi minute me Sniper Gatekeeper ne sach me koi SL/Target confirm kiya hai?
//                     const currentMinute = `${h}:${m}:00`;
//                     for (let i = dailyBreakdownMap[dateStr].tradesList.length - 1; i >= 0; i--) {
//                         const t = dailyBreakdownMap[dateStr].tradesList[i];
//                         if (t.exitTime === currentMinute && confirmedTriggers.includes(t.exitType)) {
//                             actualTriggerReason = t.exitType;
//                             break;
//                         }
//                     }



//                     // Agar SL/Target 100% confirm ho gaya hai, tabhi baki bache hue legs ko (Exit All) maaro
//                     if (actualTriggerReason) {
//                         for (let trade of openTrades) {
//                             let exitP = trade.currentOpen; // Default math/fallback

//                             // =========================================================================
//                             // 🔥 THE FIX: EXACT STRIKE PREMIUM FETCH FOR VICTIM LEGS
//                             // Rolling chart ki jagah asli strike (e.g. 23850) ka exact premium fetch karo
//                             // =========================================================================
//                             if (isOptionsTrade && broker && trade.optionConfig) {
//                                 try {
//                                     const axios = require('axios');
//                                     let expFlag = "WEEK"; let expCode = 1;
//                                     let reqExpiry = autoCorrectExpiryType(upperSymbol, dateStr, trade.legConfig.expiry || "WEEKLY");
//                                     if (reqExpiry.toUpperCase() === "MONTHLY") { expFlag = "MONTH"; }
//                                     else if (reqExpiry.toUpperCase() === "NEXT WEEKLY" || reqExpiry.toUpperCase() === "NEXT WEEK") { expCode = 2; }

//                                     const fixedStrike = Number(trade.optionConfig.strike);
//                                     const stepSize = (upperSymbol.includes("BANK") || upperSymbol.includes("SENSEX")) ? 100 : 50;
//                                     const referenceAtm = calculateATM(spotClosePrice, upperSymbol);

//                                     // Calculate ITM/OTM steps based on current Spot ATM
//                                     const strikeDiff = fixedStrike - referenceAtm;
//                                     const exactStep = Math.round(strikeDiff / stepSize);

//                                     // Dhan ke format me strike guesses (e.g., ITM1, ITM0) banayenge
//                                     let candidates = [`ITM${exactStep}`, `ITM${exactStep + 1}`, `ITM${exactStep - 1}`];

//                                     const basePayload = {
//                                         exchangeSegment: "NSE_FNO", interval: "1", securityId: Number(spotSecurityId), instrument: "OPTIDX",
//                                         expiryFlag: expFlag, expiryCode: expCode,
//                                         drvOptionType: trade.optionConfig.type === "CE" ? "CALL" : "PUT",
//                                         requiredData: ["open", "close", "strike"],
//                                         fromDate: dateStr, toDate: dateStr
//                                     };

//                                     let exactPriceFound = false;

//                                     for (let c = 0; c < candidates.length; c++) {
//                                         if (exactPriceFound) break;
//                                         let guess = candidates[c];

//                                         const res = await axios.post('https://api.dhan.co/v2/charts/rollingoption', { ...basePayload, strike: guess }, {
//                                             headers: { 'access-token': broker.apiSecret, 'client-id': broker.clientId, 'Content-Type': 'application/json' },
//                                             timeout: 5000
//                                         });

//                                         const optKey = trade.optionConfig.type === "CE" ? "ce" : "pe";
//                                         if (res.data && res.data.data && res.data.data[optKey]) {
//                                             const chart = res.data.data[optKey];
//                                             const exitTimeStr = `${h}:${m}`;

//                                             for (let k = 0; k < chart.timestamp.length; k++) {
//                                                 const optTime = new Date(chart.timestamp[k] * 1000 + (5.5 * 3600000));
//                                                 if (optTime.toISOString().split('T')[1].substring(0, 5) === exitTimeStr) {
//                                                     // Verify karo ki Dhan ne sach me exact 23850 hi bheja hai
//                                                     if (Number(chart.strike[k]) === fixedStrike) {
//                                                         exitP = chart.open[k]; // Bingo! 197.10 mil gaya!
//                                                         exactPriceFound = true;
//                                                     }
//                                                     break;
//                                                 }
//                                             }
//                                         }
//                                         await new Promise(r => setTimeout(r, 200)); // Thoda sleep API block se bachne ke liye
//                                     }
//                                 } catch (e) {
//                                     console.log(`⚠️ Exact exit fetch failed for ${trade.symbol}, using fallback.`);
//                                 }
//                             }
    


//                             const pnl = calcTradePnL(trade.entryPrice, exitP, trade.quantity, trade.transaction);

//                             const forcedTrade = {
//                                 ...trade,
//                                 exitTime: `${dateStr.split('-').reverse().join('/')} ${currentMinute}`,
//                                 exitPrice: exitP,
//                                 pnl: pnl,
//                                 exitType: `EXIT_ALL_TRIGGERED_BY_${actualTriggerReason}`
//                             };

//                             dailyBreakdownMap[dateStr].tradesList.push(forcedTrade);
//                             dailyBreakdownMap[dateStr].pnl += pnl;
//                             dailyBreakdownMap[dateStr].trades += 1;

//                             if (pnl > 0) { winTrades++; if (pnl > maxProfitTrade) maxProfitTrade = pnl; }
//                             else { lossTrades++; if (pnl < maxLossTrade) maxLossTrade = pnl; }
//                         }

//                         openTrades = []; // Saare legs khatam, dukaan band!
//                     }
//                 }

//             }
//             else if (!isTradingHaltedForDay) {
//                 const mtmResult = evaluateMtmLogic(dailyBreakdownMap[dateStr].pnl, 0, riskSettings);
//                 if (mtmResult.isHalted) {
//                     isTradingHaltedForDay = true;
//                     console.log(mtmResult.logMessage);
//                 }
//             }


//             // =========================================================
//             // 🏥 1.5 HOSPITAL CHECK (RE-ENTRY LOGIC)
//             // =========================================================
//             if (advanceFeaturesSettings.reEntryExecute && pendingReEntries.length > 0 && !isTradingHaltedForDay && isMarketOpen) {
//                 let stillPending = [];
//                 let revivedTrades = [];

//                 for (let pTrade of pendingReEntries) {
//                     const reviveStatus = evaluateReEntryLogic(pTrade, istDate, spotClosePrice);

//                     if (reviveStatus.shouldRevive) {
//                         console.log(`⚡ [RE-ENTRY] Reviving leg: ${pTrade.symbol} at ₹${reviveStatus.revivePrice.toFixed(2)} | Cycle: ${pTrade.reEntryCycle}`);

//                         revivedTrades.push({
//                             id: pTrade.id,
//                             legConfig: pTrade.legConfig,
//                             symbol: pTrade.symbol,
//                             transaction: pTrade.transaction,
//                             quantity: pTrade.quantity,
//                             entryTime: `${dateStr.split('-').reverse().join('/')} ${h}:${m}:00`,
//                             entryPrice: reviveStatus.revivePrice,
//                             exitTime: null, exitPrice: null, pnl: null, exitType: null,
//                             optionConfig: pTrade.optionConfig,
//                             premiumChart: pTrade.premiumChart,
//                             signalType: pTrade.signalType,
//                             lastKnownPremium: reviveStatus.revivePrice,
//                             markedForExit: false,
//                             currentTrailedSL: null,
//                             reEntryCycle: pTrade.reEntryCycle, // Ensure cycle count moves forward
//                             entryReason: "Re-Entry" // 🔥 NAYA TAG (Ise Jodna Hai)
//                         });
//                     } else {
//                         stillPending.push(pTrade); // Agar revive nahi hua, toh hospital me hi rehne do
//                     }
//                 }

//                 pendingReEntries = stillPending;
//                 if (revivedTrades.length > 0) openTrades.push(...revivedTrades);
//             }

//             // =========================================================
//             // 🔥 2. MULTI-LEG ENTRY LOGIC (Wait & Trade Upgraded)
//             // =========================================================
//             let shouldAttemptEntry = false;
//             let activeSignalType = null;
//             let currentEntryReason = "Normal";
//             const isWaitAndTradeActive = advanceFeaturesSettings.waitAndTrade === true;
//             const waitConfig = advanceFeaturesSettings.waitAndTradeConfig || {};

//             // 🔥 THE ROLLOVER FIX: CNC me naya trade lene do, bhale hi purana trade aaj 3:15 pe katne wala ho
//             let canTakeNewEntry = openTrades.length === 0 || (orderType !== "MIS" && isTimeBased);

//             // 🛑 BTST EXPIRY TRAP BLOCKER 🛑
//             // Expiry ke din premium 0.90 ho jata hai aur contract dead ho jata hai. 
//             // Dead contract ko kal tak hold nahi kar sakte, isliye aaj entry block kardo!
//             if (orderType === "BTST" && currentDTE === 0) {
//                 canTakeNewEntry = false;
//             }

//             if (canTakeNewEntry && isMarketOpen && !isTradingHaltedForDay) {

//                 // 1. Agar naya signal aaya hai
//                 if (finalLongSignal || finalShortSignal) {
//                     if (isWaitAndTradeActive && waitConfig.movement > 0) {
//                         if (!dailyBreakdownMap[dateStr].isWaitingForTrade) {
//                             dailyBreakdownMap[dateStr].isWaitingForTrade = true;
//                             dailyBreakdownMap[dateStr].waitRefPrice = spotClosePrice; // Backtest speed ke liye Spot Price use hoga
//                             dailyBreakdownMap[dateStr].waitSignalType = finalLongSignal ? "LONG" : "SHORT";

//                             // 🔥 NAYA CONSOLE LOG: 9:45 baje ka exact Spot Price dekhne ke liye
//                             console.log(`\n⏳ [WAIT STARTED] Date: ${dateStr} | Time: ${h}:${m} | Ref Spot Price: ₹${spotClosePrice} | Logic: ${waitConfig.type} ${waitConfig.movement}`);
//                         }
//                     } else {
//                         shouldAttemptEntry = true;
//                         activeSignalType = finalLongSignal ? "LONG" : "SHORT";

//                         // 🔥 THE LINK: स्नाइपर का नाम यहाँ पास कर दो!
//                         if (strategy.type === "Price Action Based" || strategy.data?.type === "Price Action Based") {
//                             currentEntryReason = sniperTriggerName; 
//                         }
//                     }
//                 }

//                 // 2. Agar hum target ka wait kar rahe hain
//                 if (dailyBreakdownMap[dateStr].isWaitingForTrade) {
//                     const waitStatus = processWaitAndTrade(waitConfig, spotClosePrice, dailyBreakdownMap[dateStr].waitRefPrice);
//                     if (waitStatus.shouldExecute) {
//                         shouldAttemptEntry = true;
//                         activeSignalType = dailyBreakdownMap[dateStr].waitSignalType;
//                         currentEntryReason = "Wait & Trade"; // 🔥 NAYA TAG (Ise Jodna Hai)
//                         dailyBreakdownMap[dateStr].isWaitingForTrade = false; // Agle trade ke liye reset kardo

//                         // 🔥 NAYA CONSOLE LOG: Jab 20 point ka target hit ho jaye
//                         console.log(`🎯 [TARGET HIT] Date: ${dateStr} | Time: ${h}:${m} | Trigger Spot: ₹${spotClosePrice} | (Ref was: ₹${dailyBreakdownMap[dateStr].waitRefPrice})`);
//                     }
//                 }
//             }

//             //3. Asli Entry Loop (Brackets ko protect kiya gaya hai)
//             if (shouldAttemptEntry) {
//                 const isLongSignal = activeSignalType === "LONG";

//                 let tempPendingTrades = [];
//                 let tempLtps = [];

//                 for (let legIndex = 0; legIndex < strategyLegs.length; legIndex++) {
//                     const legData = strategyLegs[legIndex];

//                     let tradeQuantity = legData.quantity;
//                     if (!tradeQuantity || isNaN(tradeQuantity)) tradeQuantity = upperSymbol.includes("BANK") ? 30 : (upperSymbol.includes("NIFTY") ? 50 : 1);

//                     const transActionTypeStr = (legData.action || "BUY").toUpperCase();
//                     let activeOptionType = "";

//                     const isPA = (strategy.type === "Price Action Based" || strategy.data?.type === "Price Action Based");

//                     // ==============================================================
//                     // 🔥 THE MASTER FIX: STRICT LEG DIRECTION FOR PRICE ACTION
//                     // ==============================================================
//                     if (isTimeBased || isPA) {
//                         // Price Action me ab User ka chuna hua CE/PE hi strictly use hoga (No Dynamic Flip)
//                         activeOptionType = (legData.optionType || "Call").toUpperCase().includes("C") ? "CE" : "PE";
//                     } else {
//                         // Indicator Based me dynamic flip chalta rahega
//                         if (transActionTypeStr === "BUY") activeOptionType = isLongSignal ? "CE" : "PE";
//                         else if (transActionTypeStr === "SELL") activeOptionType = isLongSignal ? "PE" : "CE";
//                     }

//                     // 🛡️ THE GATEKEEPER: Signal Direction vs Leg Direction (Sirf Price Action ke liye)
//                     if (isPA) {
//                         let legDirection = "";
//                         // BUY CE = Bullish (LONG), BUY PE = Bearish (SHORT)
//                         if (transActionTypeStr === "BUY") legDirection = activeOptionType === "CE" ? "LONG" : "SHORT";
//                         // SELL CE = Bearish (SHORT), SELL PE = Bullish (LONG)
//                         else legDirection = activeOptionType === "PE" ? "LONG" : "SHORT"; 

//                         // 🚫 अगर Signal Bullish है पर आपका Leg Bearish (CE Sell) है, तो इस ट्रेड को ब्लॉक कर दो!
//                         if (legDirection !== activeSignalType) {
//                             console.log(`⚠️ Signal (${activeSignalType}) ignored! Strategy is built for ${legDirection} (${transActionTypeStr} ${activeOptionType}).`);
//                             continue; // सीधा अगली कैंडल/लेग पर जाओ, गलत ट्रेड मत लो!
//                         }
//                     }

//                     let finalEntryPrice = isOptionsTrade ? 0 : spotClosePrice;
//                     let validTrade = true;
//                     let premiumChartData = null;
//                     let targetStrike = calculateATM(spotClosePrice, upperSymbol);
//                     const strikeCriteria = legData.strikeCriteria || "ATM pt";
//                     const strikeType = legData.strikeType || "ATM";
//                     const reqExpiry = autoCorrectExpiryType(upperSymbol, dateStr, legData.expiry || "WEEKLY");

//                     // 🔥 THE FIX: Agar CNC trade lene ka din hai, toh targetCncExpiryLabel (Next Expiry) use karo
//                     const expiryLabel = (orderType === "CNC" && isCncEntryDay) ? targetCncExpiryLabel : getNearestExpiryString(dateStr, upperSymbol, reqExpiry);
//                     let tradeSymbol = `${upperSymbol} ${targetStrike} ${activeOptionType} (${expiryLabel})`;

//                     if (isOptionsTrade && broker) {
//                         let apiSuccess = false;

//                         const targetExpStr = expiryLabel.split('EXP ')[1];
//                         const expectedDay = targetExpStr.substring(0, 2);
//                         const expectedMonth = targetExpStr.substring(2, 5);
//                         const expectedDhanDateStr = `${expectedDay} ${expectedMonth}`;

//                         const optionConfig = getOptionSecurityId(upperSymbol, spotClosePrice, strikeCriteria, strikeType, activeOptionType, reqExpiry);

//                         if (optionConfig && optionConfig.strike && optionConfig.tradingSymbol.includes(expectedDhanDateStr)) {
//                             targetStrike = optionConfig.strike;
//                             try {
//                                 await sleep(500);
//                                 const optRes = await withRetry(() => fetchDhanHistoricalData(broker.clientId, broker.apiSecret, optionConfig.id, "NSE_FNO", "OPTIDX", dateStr, dateStr, "1"));
//                                 if (optRes.success && optRes.data && optRes.data.close) {
//                                     const exactMatchIndex = optRes.data.start_Time.findIndex(t => {
//                                         const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                                         return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                                     });
//                                     if (isTimeBased) {
//                                         finalEntryPrice = exactMatchIndex !== -1 ? optRes.data.open[exactMatchIndex] : optRes.data.open[0];
//                                     } else {
//                                         finalEntryPrice = exactMatchIndex !== -1 ? optRes.data.close[exactMatchIndex] : optRes.data.close[0];
//                                     }
//                                     premiumChartData = optRes.data;
//                                     apiSuccess = true;
//                                 }
//                             } catch (e) { }
//                         }

//                         if (!apiSuccess) {
//                             try {
//                                 await sleep(500);
//                                 const formattedStrikeForRolling = strikeType.replace(/\s+/g, '').toUpperCase();
//                                 const expRes = await withRetry(() => fetchExpiredOptionData(broker.clientId, broker.apiSecret, spotSecurityId, formattedStrikeForRolling, activeOptionType, dateStr, dateStr, reqExpiry));
//                                 if (expRes.success && expRes.data && expRes.data.close) {
//                                     const exactMatchIndex = expRes.data.start_Time.findIndex(t => {
//                                         const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                                         return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                                     });
//                                     if (isTimeBased) {
//                                         finalEntryPrice = exactMatchIndex !== -1 ? expRes.data.open[exactMatchIndex] : expRes.data.open[0];
//                                     } else {
//                                         finalEntryPrice = exactMatchIndex !== -1 ? expRes.data.close[exactMatchIndex] : expRes.data.close[0];
//                                     }
//                                     premiumChartData = expRes.data;
//                                     apiSuccess = true;
//                                 }
//                             } catch (e) { }
//                         }

//                         if (!apiSuccess || finalEntryPrice === 0) {
//                             validTrade = false;
//                             console.log(`❌ Trade Canceled: API failed for ${tradeSymbol} on ${dateStr}`);
//                         } else if (finalEntryPrice > spotClosePrice * 0.5) {
//                             validTrade = false;
//                             console.log(`❌ Trade Canceled: Spot Price returned instead of Premium for ${tradeSymbol}`);
//                         }
//                     }

//                     if (validTrade) {
//                         // 🔥 NAYA CODE: Direct openTrades me na daal kar temp memory me rakho
//                         tempPendingTrades.push({
//                             id: `leg_${legIndex}`,
//                             legConfig: legData,
//                             symbol: tradeSymbol,
//                             transaction: transActionTypeStr,
//                             quantity: tradeQuantity,
//                             entryTime: `${dateStr.split('-').reverse().join('/')} ${h}:${m}:00`,
//                             entryPrice: finalEntryPrice,
//                             exitTime: null, exitPrice: null, pnl: null, exitType: null,
//                             optionConfig: isOptionsTrade ? { strike: targetStrike, type: activeOptionType } : null,
//                             premiumChart: premiumChartData,
//                             signalType: finalLongSignal ? "LONG" : "SHORT",
//                             lastKnownPremium: finalEntryPrice,
//                             markedForExit: false,
//                             currentTrailedSL: null,
//                             spotSlPrice: currentCandleSniperSignal ? currentCandleSniperSignal.spotSlPrice : 0, // 🔥 SPOT SL SAVE HO GAYA
//                             entryReason: currentEntryReason
//                         });
//                         tempLtps.push(finalEntryPrice);
//                     }
//                 } // <-- Leg Loop yahan khatam hota hai

//                 // ==============================================================
//                 // ⚖️ GATEKEEPER: PREMIUM DIFFERENCE CHECK (BACKTEST)
//                 // ==============================================================
//                 let isPremiumDiffPassed = true;
//                 const advSettings = advanceFeaturesSettings || {};

//                 if (advSettings.premiumDifference && tempLtps.length >= 2) {
//                     const maxDiff = Number(advSettings.premiumDifferenceConfig?.premium || 100);
//                     const actualDiff = Math.abs(tempLtps[0] - tempLtps[1]);

//                     if (actualDiff > maxDiff) {
//                         isPremiumDiffPassed = false;
//                         console.log(`⚖️ [PREMIUM DIFF BLOCK] Date: ${dateStr} | Time: ${h}:${m} | Diff: ₹${actualDiff.toFixed(2)} > Limit: ₹${maxDiff}`);

//                         // 🔥 THE MAGIC: Agar block ho gaya, toh Time Based flag ko wapas false kardo taki agle minute fir try kare!
//                         if (isTimeBased) {
//                             dailyBreakdownMap[dateStr].hasTradedTimeBased = false;
//                         }
//                     }
//                 }

//                 // Agar Gatekeeper ne pass kar diya, toh finally Trades execute kardo
//                 if (isPremiumDiffPassed && tempPendingTrades.length > 0) {
//                     tempPendingTrades.forEach((trade, idx) => {

//                         // 🔥 NAYA CODE: Agar Premium Diff ON tha aur trade execute hua, toh Tag badal do
//                         if (advSettings.premiumDifference && trade.entryReason === "Normal") {
//                             trade.entryReason = "Premium Diff";
//                         }

//                         openTrades.push(trade);
//                         console.log(`✅ [TRADE OPEN] Leg ${idx + 1} | Time: ${h}:${m} | Spot: ${spotClosePrice} | Premium: ${trade.entryPrice} | Type: ${trade.optionConfig?.type}`);
//                     });
//                 }
//             }
//         }

//         // ==========================================
//         // 🧮 5. DAILY LOOP (Metrics Generation)
//         // ==========================================
//         let totalMarketDays = Object.keys(dailyBreakdownMap).length;

//         // 🔥 THE FIX: Reset counters and added breakEvenTrades
//         winTrades = 0;
//         lossTrades = 0;
//         let breakEvenTrades = 0; // ✅ Naya counter 0 PnL ke liye
//         maxProfitTrade = 0;
//         maxLossTrade = 0;

//         for (const [date, data] of Object.entries(dailyBreakdownMap)) {
//             currentEquity += data.pnl;
//             if (currentEquity > peakEquity) peakEquity = currentEquity;
//             const drawdown = currentEquity - peakEquity;
//             if (drawdown < maxDrawdown) maxDrawdown = drawdown;

//             // 🔥 NEW LOGIC: Har din ke andar ghuskar trades ko gino
//             if (data.tradesList && data.tradesList.length > 0) {
//                 data.tradesList.forEach(trade => {
//                     if (trade.pnl > 0) {
//                         winTrades++;
//                         if (trade.pnl > maxProfitTrade) maxProfitTrade = trade.pnl;
//                     } else if (trade.pnl < 0) {
//                         lossTrades++;
//                         if (trade.pnl < maxLossTrade) maxLossTrade = trade.pnl;
//                     } else {
//                         // ✅ FIX: Agar PnL exactly 0 hai, to yaha gino
//                         breakEvenTrades++;
//                     }
//                 });
//             }

//             // Day-level metrics (Win Day / Loss Day)
//             if (data.pnl > 0) {
//                 winDays++; currentWinStreak++; currentLossStreak = 0;
//                 if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
//             }
//             else if (data.pnl < 0) {
//                 lossDays++; currentLossStreak++; currentWinStreak = 0;
//                 if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
//             }
//             else {
//                 currentWinStreak = 0; currentLossStreak = 0;
//             }

//             equityCurve.push({ date, pnl: currentEquity });
//             daywiseBreakdown.push({ date, dailyPnL: data.pnl, tradesTaken: data.trades, tradesList: data.tradesList });
//         }

//         // 🔥 THE VISUAL DEBUGGER PREPARATION 🔥
//         let allExecutedTrades = [];
//         daywiseBreakdown.forEach(day => {
//             if (day.tradesList) allExecutedTrades.push(...day.tradesList);
//         });

//         let finalSmcSignals = [];
//         if (strategy.type === "Price Action Based" || strategy.data?.type === "Price Action Based") {
//             const paSettings = strategy.data?.priceActionSettings || strategy.priceActionSettings || {};
//             const userChosenTrend = paSettings.startingTrend || "AUTO";
//             const counterDepth = Number(paSettings.counterStructureDepth) || 0; 
//             const structureMode = paSettings.structureMode || "MECHANICAL"; 
            
//             // 🔥 THE NEW ADDITION: UI से Strict Decisional और Strict Counter की वैल्यू निकालें
//             const strictDecisional = paSettings.strictDecisional === true;
            
//             // 🔥 THE LOGIC SYNC: अगर Main Strict है, तो Counter भी हमेशा Strict (True) ही रहेगा!
//             const strictCounter = strictDecisional ? true : (paSettings.strictCounter !== false);

//             const majorOnly = paSettings.majorOnly === true;

//             // चार्ट पर दिखाने के लिए पूरे 1 महीने के HTF (Manager) सिग्नल्स जनरेट करें
//             finalSmcSignals = identifyMechanicalStructure(cachedHtfData, userChosenTrend, counterDepth, structureMode, strictDecisional, strictCounter, majorOnly, showD2S_DOB, showD2S_DOF, showD2S_EOB, showD2S_EOF);
//         }

//         const backtestResult = {
//             summary: {
//                 totalPnL: currentEquity,
//                 maxDrawdown,
//                 tradingDays: totalMarketDays,
//                 winDays,
//                 lossDays,
//                 totalTrades: winTrades + lossTrades + breakEvenTrades,
//                 winTrades,
//                 lossTrades,
//                 breakEvenTrades,
//                 maxWinStreak,
//                 maxLossStreak,
//                 maxProfit: maxProfitTrade,
//                 maxLoss: maxLossTrade
//             },
//             equityCurve: equityCurve,
//             daywiseBreakdown: daywiseBreakdown,
            
//             // 📦 FRONTEND CHART KE LIYE NAYA PARSEL 📦
//             candleData: cachedHtfData,       // 5m Manager Candles
//             smcSignals: finalSmcSignals,     // IDM, BOS, CHoCH Lines
//             executedTrades: allExecutedTrades // Target/SL Arrows
//         };

//         // 🔥 3. SEND FINAL DATA TO UI
//         clearInterval(heartbeat);
//         const finalResultForUI = {
//             ...backtestResult,
//             daywiseBreakdown: [...backtestResult.daywiseBreakdown].reverse()
//         };
//         res.write(`data: ${JSON.stringify({ type: 'COMPLETE', data: finalResultForUI })}\n\n`);
//         res.end();

//         // =========================================================
//         // 💾 SILENT BACKGROUND SAVE
//         // =========================================================
//         if (newDaysToCache.length > 0) {
//             console.log(`💾 Silent Background Save: Saving ${newDaysToCache.length} newly calculated days to MongoDB...`);

//             const bulkOps = newDaysToCache.map(dateStr => ({
//                 updateOne: {
//                     filter: { strategyId: strategy._id, configHash, date: dateStr },
//                     update: {
//                         $set: {
//                             trades: dailyBreakdownMap[dateStr].tradesList,
//                             dailyPnL: dailyBreakdownMap[dateStr].pnl,
//                             hasTradedTimeBased: dailyBreakdownMap[dateStr].hasTradedTimeBased
//                         }
//                     },
//                     upsert: true
//                 }
//             }));

//             try {
//                 BacktestCache.bulkWrite(bulkOps, { ordered: false })
//                     .then(res => console.log(`✅ Saved ${res.upsertedCount + res.modifiedCount} days to Cache Godown.`))
//                     .catch(e => console.error("⚠️ Background Cache Save Error:", e.message));
//             } catch (error) {
//                 console.error("⚠️ Failed to trigger Background Save");
//             }
//         }

//     } catch (error) {
//         console.error("Backtest Error:", error);

//         clearInterval(heartbeat);
//         let errorMsg = "Internal Server Error";
//         if (error.response && error.response.status === 429) errorMsg = "Broker API Rate Limit Exceeded";
//         else if (error.message) errorMsg = error.message;

//         res.write(`data: ${JSON.stringify({ type: 'ERROR', message: errorMsg })}\n\n`);
//         res.end();
//     }
// };

// module.exports = { runBacktestSimulator };




const mongoose = require('mongoose');
const crypto = require('crypto');
const Strategy = require('../models/Strategy');
const HistoricalData = require('../models/HistoricalData');
const Broker = require('../models/Broker');
const BacktestCache = require('../models/BacktestCache');

const { calculateIndicator, extractParams, evaluateCondition } = require('../services/indicatorService');
const { getOptionSecurityId, sleep, getFutureSecurityId } = require('../services/instrumentService');
const { fetchDhanHistoricalData, fetchExpiredOptionData } = require('../services/dhanService');

const { evaluateTrailingSL } = require('../engine/features/riskManagement/trailingLogic');
const { evaluateMtmLogic } = require('../engine/features/riskManagement/mtmSquareOff');
const { evaluateExitAllLogic } = require('../engine/features/advanceFeatures/exitAllOnSlTgt');

const { processWaitAndTrade } = require('../engine/features/advanceFeatures/waitAndTrade');

const { calculateTrailedSL } = require('../engine/features/advanceFeatures/trailSL');
const { evaluateReEntryLogic } = require('../engine/features/advanceFeatures/reEntryLogic'); // 🔥 NAYA IMPORT


const { isTradingHoliday } = require('../engine/utils/holidaysCalendar');
const { getNearestExpiryString } = require('../engine/utils/expiryCalculator'); // ✅ Yeh NAYA add karein

const { calculateApproxBasketMargin } = require('../engine/utils/marginCalculator');
const { isThisExpiryDay } = require('../engine/utils/expiryCalculator');

const { identifyMechanicalStructure, checkPriceActionSignal } = require('../engine/scanners/priceActionScanner.js');

const SMCEntryEngine = require('../engine/scanners/SMCEntryEngine.js');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


const TimeBasedEngine = require('../engine/timeBasedEngine');
const TimeBasedRiskManager = require('../engine/features/riskManagement/TimeBasedRiskManager');



// 🔥 PRO FIX: 1-मिनट की कैंडल्स को जोड़कर Higher Timeframe (HTF) कैंडल बनाने का लॉजिक
const buildHtfCandles = (ltfCandles, htfMinutes) => {
    let htfCandles = [];
    let currentHtf = null;
    const periodMs = parseInt(htfMinutes) * 60 * 1000;

    for (let candle of ltfCandles) {
        const candleTime = new Date(candle.timestamp).getTime();
        // समय को 5-मिनट (या 15-मिनट) के ब्लॉक में राउंड-ऑफ करें
        const blockTime = Math.floor(candleTime / periodMs) * periodMs;

        if (!currentHtf || currentHtf.blockTime !== blockTime) {
            if (currentHtf) htfCandles.push(currentHtf);
            currentHtf = {
                timestamp: candle.timestamp, // कैंडल शुरू होने का समय
                blockTime: blockTime,
                open: candle.open,
                high: candle.high,
                low: candle.low,
                close: candle.close
            };
        } else {
            // अगर उसी 5-मिनट ब्लॉक की कैंडल है, तो High/Low अपडेट करो
            currentHtf.high = Math.max(currentHtf.high, candle.high);
            currentHtf.low = Math.min(currentHtf.low, candle.low);
            currentHtf.close = candle.close; // आख़िरी कैंडल का क्लोज़ ही HTF का क्लोज़ होता है
        }
    }
    if (currentHtf) htfCandles.push(currentHtf);
    return htfCandles;
};


const getTradingDaysToExpiry = (currentDate, expiryString) => {
    if (!expiryString) return 0;
    const datePart = expiryString.split('EXP ')[1];
    if (!datePart) return 0;
    const day = parseInt(datePart.substring(0, 2));
    const monthMap = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
    const month = monthMap[datePart.substring(2, 5)];
    const year = parseInt("20" + datePart.substring(5, 7));
    const expDate = new Date(year, month, day);
    expDate.setHours(0, 0, 0, 0);

    const currDate = new Date(currentDate);
    currDate.setHours(0, 0, 0, 0);

    let dte = 0;
    let tempDate = new Date(currDate);
    while (tempDate < expDate) {
        tempDate.setDate(tempDate.getDate() + 1);
        if (tempDate.getDay() !== 0 && tempDate.getDay() !== 6 && !isTradingHoliday(tempDate)) dte++;
    }
    return dte;
};


// 🛡️ THE SEBI AUTO-CORRECTOR FOR DHAN API PAYLOAD
const autoCorrectExpiryType = (symbolStr, dateStr, reqExpiry) => {
    let upperReqExpiry = (reqExpiry || "WEEKLY").toUpperCase();
    if (upperReqExpiry === "MONTHLY") return "MONTHLY";
    
    let checkSym = symbolStr.toUpperCase().replace(' 50', '').replace(' BANK', '').trim();
    if (checkSym === "NIFTY FINANCIAL SERVICES") checkSym = "FINNIFTY";
    if (checkSym === "NIFTY MID SELECT") checkSym = "MIDCPNIFTY";
    
    const dDate = new Date(dateStr);
    // SEBI Updates: Auto-convert Discontinued Weeklies to Monthly
    if (checkSym === "BANKNIFTY" && dDate > new Date("2024-11-13")) return "MONTHLY";
    if (checkSym === "FINNIFTY" && dDate > new Date("2024-11-19")) return "MONTHLY";
    if (checkSym === "MIDCPNIFTY" && dDate > new Date("2024-11-18")) return "MONTHLY";
    
    return upperReqExpiry;
};


const withRetry = async (apiCallFn, maxRetries = 3, delayMs = 1500) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const result = await apiCallFn();
            if ((result && result.success && result.data && result.data.close) ||
                (result && result.data && result.data.data)) {
                return result;
            }
            console.log(`⚠️ Dhan API Empty. Cooling down (${i + 1}/${maxRetries})...`);
            await delay(delayMs * (i + 1));
        } catch (error) {
            const status = error.response ? error.response.status : 0;
            if (status === 429 || (error.response && error.response.data && error.response.data.errorCode === 'DH-904')) {
                console.log(`🛑 Rate Limit (429) on Entry! 5-sec cooldown...`);
                await delay(5000);
            } else {
                await delay(delayMs * (i + 1));
            }
        }
    }
    return { success: false, data: null };
};

const runBacktestSimulator = async (req, res) => {
    req.setTimeout(0);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const heartbeat = setInterval(() => { res.write(`: keep-alive-ping\n\n`); }, 25000);
    req.on('close', () => { clearInterval(heartbeat); });

    res.write(`data: ${JSON.stringify({ type: 'START', message: 'Engine warming up...' })}\n\n`);

    try {
        const { strategyId } = req.params;
        const { period, start, end, slippage } = req.query;
        const useRealisticSlippage = slippage !== 'false';

        const strategy = await Strategy.collection.findOne({ _id: new mongoose.Types.ObjectId(strategyId) });
        if (!strategy) {
            res.write(`data: ${JSON.stringify({ type: 'ERROR', message: 'Strategy not found' })}\n\n`);
            return res.end();
        }

        const paSettingsGlobal = strategy.data?.priceActionSettings || strategy.priceActionSettings || {};
        
        const showD2S_DOB = req.query.showD2S_DOB !== undefined ? String(req.query.showD2S_DOB) === "true" : (paSettingsGlobal.showD2S_DOB !== false);
        const showD2S_DOF = req.query.showD2S_DOF !== undefined ? String(req.query.showD2S_DOF) === "true" : (paSettingsGlobal.showD2S_DOF !== false);
        const showD2S_EOB = req.query.showD2S_EOB !== undefined ? String(req.query.showD2S_EOB) === "true" : (paSettingsGlobal.showD2S_EOB !== false);
        const showD2S_EOF = req.query.showD2S_EOF !== undefined ? String(req.query.showD2S_EOF) === "true" : (paSettingsGlobal.showD2S_EOF !== false);

        console.log(`\n🚀 Running MULTI-LEG Backtest for: ${strategy.name} | Period: ${period || '1M'}`);

        let endDate = new Date();
        let startDate = new Date();

        if (period === 'Custom' && start && end) {
            startDate = new Date(start);
            endDate = new Date(end);
            
            // 🔥 THE FIX: अगर 'end' स्ट्रिंग में 'T' मौजूद है, तो इसका मतलब टाइम भी भेजा गया है।
            // ऐसी स्थिति में setHours को स्किप करो ताकि यूज़र का चुना हुआ टाइम (जैसे 11:30 AM) सुरक्षित रहे।
            if (typeof end === 'string' && !end.includes('T')) {
                endDate.setHours(23, 59, 59, 999);
            }
        }
        else if (period === '1M') startDate.setMonth(startDate.getMonth() - 1);
        else if (period === '3M') startDate.setMonth(startDate.getMonth() - 3);
        else if (period === '6M') startDate.setMonth(startDate.getMonth() - 6);
        else if (period === '1Y') startDate.setFullYear(startDate.getFullYear() - 1);
        else if (period === '2Y') startDate.setFullYear(startDate.getFullYear() - 2);
        else startDate.setMonth(startDate.getMonth() - 1);

        const dhanIdMap = {
            "NIFTY": "13", "NIFTY 50": "13", "BANKNIFTY": "25", "NIFTY BANK": "25",
            "FINNIFTY": "27", "NIFTY FIN SERVICE": "27", "MIDCPNIFTY": "442", "NIFTY MID SELECT": "442",
            "SENSEX": "51", "BSE SENSEX": "51", "BANKEX": "69", "BSE BANKEX": "69"
        };

        const exchangeMap = {
            "SENSEX": "BSE_FNO", "BSE SENSEX": "BSE_FNO",
            "BANKEX": "BSE_FNO", "BSE BANKEX": "BSE_FNO"
        };

        const instrumentsArr = strategy.instruments || strategy.data?.instruments || [];
        const instrumentData = instrumentsArr.length > 0 ? instrumentsArr[0] : {};
        const symbol = instrumentData.name || instrumentData.symbol || "BANKNIFTY";
        const upperSymbol = symbol.toUpperCase().trim();
        const isOptionsTrade = instrumentData.segment === "Option" || instrumentData.segment === "NFO";

        // 🔥 THE UNDERLYING FIX (Spot vs Future)
        const underlyingType = strategy.config?.underlying || strategy.data?.config?.underlying || "Spot";
        
        let exchangeSegment = "IDX_I";
        let instrumentType = "INDEX";
        let dbCacheSymbol = (upperSymbol === "BANKEX") ? "BANKEX_V2" : upperSymbol; // MongoDB me Spot aur Future alag alag save honge!

        if (underlyingType === "Future") {
            exchangeSegment = "NSE_FNO";
            instrumentType = "FUTIDX";
            dbCacheSymbol = `${upperSymbol}_FUT`; // e.g., BANKNIFTY_FUT
        } else {
            if (upperSymbol.includes("NIFTY") || upperSymbol.includes("SENSEX") || upperSymbol === "BANKNIFTY" || upperSymbol === "NIFTY BANK") {
                exchangeSegment = "IDX_I";
            }
        }

        const cleanSymbolForMap = upperSymbol.replace(' 50', '').trim();
        const spotSecurityId = instrumentData.securityId || dhanIdMap[upperSymbol] || dhanIdMap[cleanSymbolForMap] || "25";

        // 🔥 MULTI-TIMEFRAME SETUP
        let htfTimeframe = "15"; // Default Master Trend
        let ltfTimeframe = "1";  // Default Entry Trigger

        // DB में सेव्ड Price Action सेटिंग्स से टाइमफ्रेम निकालें
        if (strategy.type === "Price Action Based" || strategy.data?.type === "Price Action Based") {
            const paSettings = strategy.data?.priceActionSettings || strategy.priceActionSettings || {};
            htfTimeframe = paSettings.masterTimeframe ? String(paSettings.masterTimeframe).replace(' min', '').trim() : "15";
            ltfTimeframe = paSettings.entryTimeframe ? String(paSettings.entryTimeframe).replace(' min', '').trim() : "1";
        } else {
            // पुरानी स्ट्रेटेजीज़ (Indicator/Time Based) के लिए Fallback
            const rawInterval = strategy.interval || strategy.config?.interval || strategy.data?.config?.interval;
            ltfTimeframe = rawInterval ? String(rawInterval).replace(' min', '').trim() : "5";
            htfTimeframe = ltfTimeframe; // अगर Price Action नहीं है, तो दोनों सेम रहेंगे
        }

        // 🔥 पुराने कोड को क्रैश होने से बचाने के लिए (Backwards Compatibility)
        let timeframe = ltfTimeframe; 

        console.log(`⏱️ Engine Timeframes -> HTF: ${htfTimeframe}m | LTF: ${ltfTimeframe}m`);

       // =========================================================
        // 🔐 THE FINGERPRINT FIX
        // =========================================================
        const advanceFeaturesSettings = strategy.data?.advanceSettings || strategy.advanceSettings || strategy.data?.advanceFeatures || strategy.advanceFeatures || {};
        let riskSettings = strategy.data?.riskManagement || strategy.riskManagement || {};

        // 🔥 GHOST POCKET FIX: UI kisi bhi folder me MaxLoss dale, yahan pakda jayega!
        riskSettings.maxProfit = riskSettings.maxProfit || strategy.data?.config?.maxProfit || strategy.config?.maxProfit || strategy.data?.maxProfit || strategy.maxProfit || 0;
        riskSettings.maxLoss = riskSettings.maxLoss || strategy.data?.config?.maxLoss || strategy.config?.maxLoss || strategy.data?.maxLoss || strategy.maxLoss || 0;
        riskSettings.profitTrailing = riskSettings.profitTrailing || strategy.data?.config?.profitTrailing || strategy.config?.profitTrailing || "No Trailing";

        const findConditions = (obj) => {
            if (!obj || typeof obj !== 'object') return null;
            if (obj.longRules && Array.isArray(obj.longRules)) return obj;
            if (Array.isArray(obj)) {
                for (let item of obj) { const found = findConditions(item); if (found) return found; }
            } else {
                for (let key in obj) { const found = findConditions(obj[key]); if (found) return found; }
            }
            return null;
        };

        let entryConds = findConditions(strategy);
        let exitConds = {};
        const possibleExits = strategy.exitConditions || strategy.data?.exitConditions || strategy.data?.entrySettings?.exitConditions || [];
        if (Array.isArray(possibleExits) && possibleExits.length > 0) exitConds = possibleExits[0];
        else if (possibleExits && typeof possibleExits === 'object' && !Array.isArray(possibleExits)) exitConds = possibleExits;

        // 🔥 THE FIX: Yahan se duplicate sTime, sqTime hata diye gaye hain!
        const sTime = strategy.startTime || strategy.entryTime || strategy.config?.startTime || strategy.config?.entryTime || strategy.data?.config?.startTime || strategy.data?.config?.entryTime || strategy.entrySettings?.startTime || strategy.data?.entrySettings?.startTime;
        const sqTime = strategy.config?.squareOff || strategy.data?.config?.squareOff || strategy.config?.squareOffTime || strategy.data?.config?.squareOffTime || "03:15 PM";
        const txnType = strategy.config?.transactionType || strategy.data?.config?.transactionType || 'Both Side';
        const isTimeBased = (strategy.config?.strategyType === 'Time Based' || strategy.data?.config?.strategyType === 'Time Based' || strategy.type === 'Time Based');

        // 🔥 THE CNC VARIABLES
        const orderType = strategy.data?.config?.orderType || strategy.config?.orderType || "MIS";
        const cncEntryDays = Number(strategy.data?.config?.cncEntryDays ?? strategy.config?.cncEntryDays ?? 4);
        const cncExitDays = Number(strategy.data?.config?.cncExitDays ?? strategy.config?.cncExitDays ?? 1);
        // =========================================================
        // 🗓️ THE FIX 1: EXTRACT ALLOWED TRADING DAYS
        // =========================================================
        const rawDays = strategy.config?.days || strategy.data?.config?.days || ["MON", "TUE", "WED", "THU", "FRI"];
        const allowedDaysNames = (Array.isArray(rawDays) && rawDays.length > 0) ? rawDays : ["MON", "TUE", "WED", "THU", "FRI"];

        // JS getDay() format: SUN:0, MON:1, TUE:2, WED:3, THU:4, FRI:5, SAT:6
        const dayMap = { "SUN": 0, "MON": 1, "TUE": 2, "WED": 3, "THU": 4, "FRI": 5, "SAT": 6 };
        const allowedDaysNum = allowedDaysNames.map(d => dayMap[d.toUpperCase()]).filter(n => n !== undefined);
        // =========================================================

        const strategyConfigString = JSON.stringify({
            legs: strategy.legs || strategy.data?.legs,
            entryConds: entryConds,
            exitConds: exitConds,
            timeframe: timeframe,
            advanceFeatures: advanceFeaturesSettings,
            riskManagement: riskSettings,
            slippage: useRealisticSlippage,
            priceActionSettings: strategy.data?.priceActionSettings || strategy.priceActionSettings || {}, // 🔥 NEW: Cache Hash Update
            startTime: sTime,
            squareOffTime: sqTime,
            transactionType: txnType,
            isTimeBased: isTimeBased,
            allowedDays: allowedDaysNames,
            orderType: orderType, // 🔥 Cache update for CNC
            cncEntryDays: cncEntryDays,
            cncExitDays: cncExitDays,
            version: "SMC_V1"
        });
        const configHash = crypto.createHash('md5').update(strategyConfigString).digest('hex');

        // =========================================================
        // 🧠 BULK MEMORY FETCH
        // =========================================================
        const savedDaysCache = await BacktestCache.find({
            strategyId: strategy._id,
            configHash: configHash,
            date: {
                $gte: startDate.toISOString().split('T')[0],
                $lte: endDate.toISOString().split('T')[0]
            }
        }).lean();

        const bulkCacheMap = {};
        savedDaysCache.forEach(doc => { bulkCacheMap[doc.date] = doc; });

        const cachedDaysCount = Object.keys(bulkCacheMap).length;
        if (cachedDaysCount > 0) {
            console.log(`📦 Loaded ${cachedDaysCount} pre-calculated days from DB Memory Map!`);
            res.write(`data: ${JSON.stringify({ type: 'PROGRESS', date: `Fast-forwarding ${cachedDaysCount} saved days...`, percent: 10 })}\n\n`);
        } else {
            console.log(`🧹 No Cache Found for this ConfigHash. Running FRESH backtest!`);
        }

        // =========================================================
        // 📡 DATA DOWNLOADING (The Ant Strategy - Spot/Future Ready)
        // =========================================================
        let cachedData = await HistoricalData.find({
            symbol: dbCacheSymbol,
            timeframe: ltfTimeframe, // 🔥 FIX: ab LTF timeframe se data check hoga
            timestamp: { $gte: startDate, $lte: endDate }
        }).sort({ timestamp: 1 }).lean();

        let shouldFetchFromDhan = false;
        if (cachedData.length === 0) {
            shouldFetchFromDhan = true;
        } else {
            const dbStartDate = cachedData[0].timestamp;
            const dbEndDate = cachedData[cachedData.length - 1].timestamp;
            if (dbStartDate > new Date(startDate.getTime() + 86400000) || dbEndDate < new Date(endDate.getTime() - 86400000)) {
                shouldFetchFromDhan = true;
                // 🔥 FIX: Puraana data delete karte waqt bhi ltfTimeframe use hoga
                await HistoricalData.deleteMany({ symbol: dbCacheSymbol, timeframe: ltfTimeframe, timestamp: { $gte: startDate, $lte: endDate } });
            }
        }

        let broker = null;
        if (shouldFetchFromDhan || isOptionsTrade) {
            broker = await Broker.findOne({ engineOn: true });
            if (!broker) {
                res.write(`data: ${JSON.stringify({ type: 'ERROR', message: 'No active broker found for API keys' })}\n\n`);
                return res.end();
            }
        }

        if (shouldFetchFromDhan) {
            let chunkedRanges = [];
            let currentStart = new Date(startDate);
            while (currentStart <= endDate) {
                let currentEnd = new Date(currentStart);
                currentEnd.setDate(currentStart.getDate() + 4);
                if (currentEnd > endDate) currentEnd = new Date(endDate);
                chunkedRanges.push({ start: new Date(currentStart), end: new Date(currentEnd) });
                currentStart.setDate(currentStart.getDate() + 5);
            }

            for (let range of chunkedRanges) {
                // UI ko batao ki Spot fetch ho raha hai ya Future
                res.write(`data: ${JSON.stringify({ type: 'PROGRESS', date: `Fetching ${underlyingType} Data: ${range.start.toISOString().split('T')[0]}`, percent: 0 })}\n\n`);

                let targetSecurityId = spotSecurityId;
                let finalExchange = exchangeSegment;
                let finalInstType = instrumentType;

                if (underlyingType === "Future" && typeof getFutureSecurityId === 'function') {
                    const futId = await getFutureSecurityId(upperSymbol, range.start.toISOString().split('T')[0]);
                    if (futId) {
                        targetSecurityId = futId;
                    } else {
                        console.log(`⚠️ Future ID not found for ${range.start.toISOString().split('T')[0]}. Falling back to Spot Data.`);
                        targetSecurityId = spotSecurityId;
                        finalExchange = "IDX_I";
                        finalInstType = "INDEX";
                    }
                }

                // API call me LTF timeframe jayega
                const dhanRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, targetSecurityId, exchangeSegment, instrumentType, range.start.toISOString().split('T')[0], range.end.toISOString().split('T')[0], ltfTimeframe);
                const timeArray = dhanRes.data ? (dhanRes.data.start_Time || dhanRes.data.timestamp) : null;

                if (dhanRes.success && timeArray) {
                    const { open, high, low, close, volume } = dhanRes.data;
                    const bulkOps = [];
                    for (let i = 0; i < timeArray.length; i++) {
                        let ms = timeArray[i];
                        if (ms < 10000000000) ms = ms * 1000;
                        bulkOps.push({ insertOne: { document: { symbol: dbCacheSymbol, timeframe: ltfTimeframe, timestamp: new Date(ms), open: open[i], high: high[i], low: low[i], close: close[i], volume: volume[i] } } });
                    }
                    if (bulkOps.length > 0) await HistoricalData.bulkWrite(bulkOps, { ordered: false }).catch(e => console.log("Duplicates ignored"));
                }

                await delay(1000);
            }
        } // 🛑 THE FIX: shouldFetchFromDhan YAHAN BAND HOGA!

        // ==========================================
        // 📥 HTF MANAGER DATA PROCESSING (Asli Machine)
        // ==========================================
        // Ye code ab HAMESHA chalega, chahe API call hui ho ya seedha DB se aaya ho!
        cachedData = await HistoricalData.find({ symbol: dbCacheSymbol, timeframe: ltfTimeframe, timestamp: { $gte: startDate, $lte: endDate } }).sort({ timestamp: 1 }).lean();
        
        if (cachedData.length === 0) {
            res.write(`data: ${JSON.stringify({ type: 'ERROR', message: `${underlyingType} Data not available for this period.` })}\n\n`);
            return res.end();
        }

        let cachedHtfData = []; // 🔥 GLOBAL VAR (Ab iski shadow copy nahi banegi)
        if (htfTimeframe !== ltfTimeframe) {
            cachedHtfData = buildHtfCandles(cachedData, htfTimeframe);
            console.log(`🧠 MANAGER READY: Aggregated ${cachedData.length} LTF candles into ${cachedHtfData.length} HTF candles!`);
        } else {
            cachedHtfData = cachedData;
        }
        

        // =========================================================
        // --- INDICATOR CALCULATION SETUP ---
        // =========================================================
        const calcLongInd1 = []; const calcLongInd2 = [];
        const calcShortInd1 = []; const calcShortInd2 = []; // 🔥 THE FIX: ये दोनों डिक्लेयर करना भूल गए थे!

        // Long Rules Calculation
        if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
            entryConds.longRules.forEach((rule, idx) => {
                calcLongInd1[idx] = calculateIndicator({ ...rule.ind1, params: extractParams(rule.ind1, rule.params) }, cachedData);
                calcLongInd2[idx] = calculateIndicator({ ...rule.ind2, params: extractParams(rule.ind2, null) }, cachedData);
            });
        }

        // 🔥 THE FIX: Short Rules का डेटा भी कैलकुलेट करना ज़रूरी है!
        if (entryConds && entryConds.shortRules && entryConds.shortRules.length > 0) {
            entryConds.shortRules.forEach((rule, idx) => {
                calcShortInd1[idx] = calculateIndicator({ ...rule.ind1, params: extractParams(rule.ind1, rule.params) }, cachedData);
                calcShortInd2[idx] = calculateIndicator({ ...rule.ind2, params: extractParams(rule.ind2, null) }, cachedData);
            });
        }

        const rawExitLongRules = exitConds.longRules || [];
        const rawExitShortRules = exitConds.shortRules || [];
        const exitLongRules = rawExitLongRules.filter(rule => rule.ind1 && (rule.ind1.id || rule.ind1.display));
        const exitShortRules = rawExitShortRules.filter(rule => rule.ind1 && (rule.ind1.id || rule.ind1.display));

        const calcExitLongInd1 = []; const calcExitLongInd2 = [];
        if (exitLongRules.length > 0) {
            exitLongRules.forEach((rule, idx) => {
                calcExitLongInd1[idx] = calculateIndicator({ ...rule.ind1, params: extractParams(rule.ind1, rule.params) }, cachedData);
                calcExitLongInd2[idx] = calculateIndicator({ ...rule.ind2, params: extractParams(rule.ind2, null) }, cachedData);
            });
        }
        
        const calcExitShortInd1 = []; const calcExitShortInd2 = [];
        if (exitShortRules.length > 0) {
            exitShortRules.forEach((rule, idx) => {
                calcExitShortInd1[idx] = calculateIndicator({ ...rule.ind1, params: extractParams(rule.ind1, rule.params) }, cachedData);
                calcExitShortInd2[idx] = calculateIndicator({ ...rule.ind2, params: extractParams(rule.ind2, null) }, cachedData);
            });
        }

        // =========================================================
        // --- ENGINE VARIABLES & THE GLOBAL MAX PROFIT FIX ---
        // =========================================================
        let currentEquity = 0, peakEquity = 0, maxDrawdown = 0;
        let winDays = 0, lossDays = 0, winTrades = 0, lossTrades = 0;
        let currentWinStreak = 0, currentLossStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
        let maxProfitTrade = 0, maxLossTrade = 0;
        let equityCurve = [];
        let daywiseBreakdown = [];
        let dailyBreakdownMap = {};

        let optionDataCache = {};
        let openTrades = [];
        let pendingReEntries = []; // 🔥 NAYA HOSPITAL
        const strategyLegs = strategy.legs || strategy.data?.legs || [];

        // 🔥 FIX 1: Math.abs ensures NO negative sign bugs from UI!
        const globalMaxProfit = Math.abs(Number(riskSettings.maxProfit) || 0);
        const globalMaxLoss = Math.abs(Number(riskSettings.maxLoss) || 0);

        let exitMin = 915;
        if (sqTime) {
            const [eh, emStr] = sqTime.split(':');
            if (emStr) {
                const em = emStr.split(' ')[0];
                let h = parseInt(eh);
                if (sqTime.toUpperCase().includes('PM') && h !== 12) h += 12;
                if (sqTime.toUpperCase().includes('AM') && h === 12) h -= 12;
                exitMin = h * 60 + parseInt(em);
            }
        }

        // 🔥 BTST TIME PARSER 🔥
        const nextDaySqTimeStr = strategy.data?.config?.nextDaySquareOff || strategy.config?.nextDaySquareOff || "09:15 AM";
        let nextDayExitMin = 555; // Default 09:15 AM
        if (nextDaySqTimeStr) {
            const [neh, nemStr] = nextDaySqTimeStr.split(':');
            if (nemStr) {
                const nem = nemStr.split(' ')[0];
                let nh = parseInt(neh);
                if (nextDaySqTimeStr.toUpperCase().includes('PM') && nh !== 12) nh += 12;
                if (nextDaySqTimeStr.toUpperCase().includes('AM') && nh === 12) nh -= 12;
                nextDayExitMin = nh * 60 + parseInt(nem);
            }
        }

        // 🛡️ BTST & CNC ENTRY PROTECTOR 🛡️
        // Agar BTST hai, toh engine ko 15:30 (Market Close) tak entry lene do! 
        // Default 15:15 square-off rules ko bypass karo.
        if (orderType === "BTST" || orderType === "CNC") {
            exitMin = 930; // 15:30 minutes
            if (typeof noTradeMin !== 'undefined') noTradeMin = 930; 
        }

        let isTradingHaltedForDay = false;
        let currentDayTracker = "";
        let newDaysToCache = [];


         // 🔥 CENTRALIZED STRIKE STEP SIZE MANAGER
        const getStrikeStepSize = (symbol) => {
            if (!symbol) return 50; // Fallback default
            
            const upperSymbol = symbol.toUpperCase();
            
            if (upperSymbol.includes("SENSEX") || upperSymbol.includes("BANKEX")) return 100;
            if (upperSymbol.includes("BANKNIFTY")) return 100; // NIFTY BANK
            if (upperSymbol.includes("FINNIFTY")) return 50;   // NIFTY FIN SERVICE
            if (upperSymbol.includes("MIDCPNIFTY")) return 25;   // NIFTY MID SELECT
            
            return 50; // Default for NIFTY 50
        };

        // 🔥 UPDATED ATM CALCULATOR (Using Centralized Step Manager)
        const calculateATM = (spotPrice, symbolStr) => {
            // 1. Centralized function se pehle correct step size nikalo (e.g., 25, 50, ya 100)
            const step = getStrikeStepSize(symbolStr);
            
            // 2. Us step size ke hisaab se round-off kar do
            return Math.round(spotPrice / step) * step;
        };


        const calcTradePnL = (entryP, exitP, qty, action) => {
            if (action === "BUY") return (exitP - entryP) * qty;
            return (entryP - exitP) * qty;
        };



        // =========================================================
        // 🧠 INITIALIZE BACKTEST SNIPER ENGINE
        // =========================================================
        let backtestSniper = null;
        if (strategy.type === "Price Action Based" || strategy.data?.type === "Price Action Based") {
            const paConfig = strategy.data?.config || strategy.config || {};
            
            let userSlValue = strategyLegs[0]?.slValue || paConfig.maxSlPoints || 20;
            let sniperMaxSl = Number(userSlValue);

            // 🔥 THE FIX: DB से यूज़र का Exact Setup और Triggers निकालो
            const userSmcSetup = strategyLegs[0]?.smcSetup || {};
            const dbTriggers = userSmcSetup.entryTriggers || paConfig.entryTriggers || ['DIRECT ENTRY', 'POI ENTRY', 'SCOB ENTRY'];
            
            // 🛡️ Name Normalizer: UI से "ENTRY on POI 50%" आता है, लेकिन इंजन "POI 50% ENTRY" समझता है
            const normalizedTriggers = dbTriggers.map(t => {
                if(t === "ENTRY on POI 50%") return "POI 50% ENTRY";
                if(t === "ENTRY on SCOB 50%") return "SCOB 50% ENTRY";
                return t;
            });

            backtestSniper = new SMCEntryEngine({
                maxSlPoints: sniperMaxSl, 
                entryTriggers: normalizedTriggers, // 🔥 अब स्नाइपर सिर्फ यूज़र के भेजे रूल्स मानेगा!
                htf: htfTimeframe + ' min',
                ltf: ltfTimeframe + ' min'
            });
            console.log(`🔫 Sniper Engine Loaded! Max SL: ${sniperMaxSl} | User Triggers: ${normalizedTriggers.join(', ')}`);
        }


        // =========================================================
        // 🚀 NEW ENGINE SETUP: THE RATIO SPREAD ISOLATOR
        // =========================================================
        const isRatioSpreadStrategy = strategyLegs.some(leg => leg?.strikeCriteria === 'Ratio Spread (Prem/X)');
        let ratioEngine = null;

        console.log(`\n🔍 [DEBUG] Strategy: ${strategy.name} | Legs Count: ${strategyLegs.length} | Entry Time: ${sTime} | Symbol: ${upperSymbol}`);
        console.log(`🚦 Mode: ${isRatioSpreadStrategy ? 'RATIO SPREAD ENGINE' : 'LEGACY ENGINE'}\n`);


        // =========================================================
        // ⏱️ THE MAIN CANDLE LOOP
        // =========================================================
        // console.log(`\n🔍 [DEBUG] Strategy: ${strategy.name} | Legs Count: ${strategyLegs.length} | Entry Time: ${sTime} | Symbol: ${upperSymbol}\n`);
        for (let i = 0; i < cachedData.length; i++) {
            if (i % 500 === 0) await new Promise(resolve => setImmediate(resolve));

            const candle = cachedData[i];
            const candleTime = new Date(candle.timestamp).getTime();
            const istDate = new Date(candleTime + (5.5 * 60 * 60 * 1000));

            // =========================================================
            // 🚫 THE FIX 3: SKIP UNAUTHORIZED DAYS
            // =========================================================
            const currentDayOfWeek = istDate.getDay();
            if (!allowedDaysNum.includes(currentDayOfWeek)) {
                continue; // Agar aaj ka din list me nahi hai, toh seedha agli candle par jao!
            }
            // =========================================================

            const h = String(istDate.getUTCHours()).padStart(2, '0');
            const m = String(istDate.getUTCMinutes()).padStart(2, '0');
            const timeInMinutes = (istDate.getUTCHours() * 60) + istDate.getUTCMinutes();
            const dateStr = istDate.toISOString().split('T')[0];

            if (dateStr !== currentDayTracker) {
                currentDayTracker = dateStr;
                isTradingHaltedForDay = false;
                optionDataCache = {};

                if (!dailyBreakdownMap[dateStr]) dailyBreakdownMap[dateStr] = { pnl: 0, trades: 0, tradesList: [], hasTradedTimeBased: false };

                // 🔥 RATIO SPREAD RESET PER DAY 🔥
                if (isRatioSpreadStrategy) {
                    const parsedConfig = JSON.parse(strategyConfigString);
                    ratioEngine = new TimeBasedEngine(parsedConfig, false);
                    ratioEngine.estimatedMargin = 914000; // Hardcoded default for Nifty Ratio
                    ratioEngine.maxLossLimit = ratioEngine.estimatedMargin * ((riskSettings.maxLossPct || 1) / 100);
                    ratioEngine.status = 'WAITING_FOR_ENTRY';
                }

                // 🐸 THE LEAPFROG (Jump Over Cached Days)
                if (bulkCacheMap[dateStr] && orderType === "MIS") {
                    const dayCache = bulkCacheMap[dateStr];
                    dailyBreakdownMap[dateStr].pnl = dayCache.dailyPnL;
                    dailyBreakdownMap[dateStr].trades = dayCache.trades.length;
                    dailyBreakdownMap[dateStr].tradesList = dayCache.trades;
                    dailyBreakdownMap[dateStr].hasTradedTimeBased = dayCache.hasTradedTimeBased;

                    while (i + 1 < cachedData.length) {
                        const nextIst = new Date(new Date(cachedData[i + 1].timestamp).getTime() + (5.5 * 60 * 60 * 1000));
                        if (nextIst.toISOString().split('T')[0] === dateStr) {
                            i++;
                        } else {
                            break;
                        }
                    }

                    const expectedTotalDays = Math.max(1, (endDate - startDate) / (1000 * 60 * 60 * 24));
                    const daysPassed = Math.max(0, (istDate - startDate) / (1000 * 60 * 60 * 24));
                    let livePercent = Math.min(95, Math.round((daysPassed / expectedTotalDays) * 100));
                    res.write(`data: ${JSON.stringify({ type: 'PROGRESS', date: `${dateStr} (Loaded from Memory)`, percent: livePercent })}\n\n`);

                    continue;
                } else {
                    if (!newDaysToCache.includes(dateStr)) newDaysToCache.push(dateStr);

                    const expectedTotalDays = Math.max(1, (endDate - startDate) / (1000 * 60 * 60 * 24));
                    const daysPassed = Math.max(0, (istDate - startDate) / (1000 * 60 * 60 * 24));
                    let livePercent = Math.min(95, Math.round((daysPassed / expectedTotalDays) * 100));
                    res.write(`data: ${JSON.stringify({ type: 'PROGRESS', date: `Calculating: ${dateStr}`, percent: livePercent })}\n\n`);
                }
            }

            let longSignal = false;
        if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
            let overallResult = null;
            entryConds.longRules.forEach((rule, idx) => {
                const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
                const ruleResult = evaluateCondition(
                    calcLongInd1[idx] ? calcLongInd1[idx][i] : null, calcLongInd2[idx] ? calcLongInd2[idx][i] : null,
                    (i > 0 && calcLongInd1[idx]) ? calcLongInd1[idx][i - 1] : null, (i > 0 && calcLongInd2[idx]) ? calcLongInd2[idx][i - 1] : null, operator
                );
                if (idx === 0) overallResult = ruleResult;
                else {
                    const logicalOp = entryConds.logicalOps[idx - 1];
                    overallResult = logicalOp === 'AND' ? (overallResult && ruleResult) : (overallResult || ruleResult);
                }
            });
            longSignal = overallResult;
        }

        let shortSignal = false;
        if (entryConds && entryConds.shortRules && entryConds.shortRules.length > 0) {
            let overallResult = null;
            entryConds.shortRules.forEach((rule, idx) => {
                const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
                const ruleResult = evaluateCondition(
                    calcShortInd1[idx] ? calcShortInd1[idx][i] : null, calcShortInd2[idx] ? calcShortInd2[idx][i] : null,
                    (i > 0 && calcShortInd1[idx]) ? calcShortInd1[idx][i - 1] : null, (i > 0 && calcShortInd2[idx]) ? calcShortInd2[idx][i - 1] : null, operator
                );
                if (idx === 0) overallResult = ruleResult;
                else {
                    const logicalOp = entryConds.logicalOps[idx - 1];
                    overallResult = logicalOp === 'AND' ? (overallResult && ruleResult) : (overallResult || ruleResult);
                }
            });
            shortSignal = overallResult;
        }

       // 🔥 NAYA PRICE ACTION LOGIC (MULTI-TIMEFRAME SYNC)
        let priceActionLongSignal = false;
        let priceActionShortSignal = false;
        let sniperTriggerName = "Price Action"; 
        let currentCandleSniperSignal = null; // 🔥 SL सेव करने के लिए

        if (strategy.type === "Price Action Based" || strategy.data?.type === "Price Action Based") {
            const ltfSlice = cachedData.slice(Math.max(0, i - 50), i + 1);
            const currentLtfTimeMs = new Date(cachedData[i].timestamp).getTime();
            const periodMs = parseInt(htfTimeframe) * 60 * 1000;
            const htfSlice = cachedHtfData.filter(hCandle => (hCandle.blockTime + periodMs) <= currentLtfTimeMs);
            const recentHtfSlice = htfSlice.slice(-1000);

            const paSettings = strategy.data?.priceActionSettings || {};
            const strictDecisional = paSettings.strictDecisional === true; 
            const strictCounter = strictDecisional ? true : (paSettings.strictCounter !== false);

            const signals = identifyMechanicalStructure(
                recentHtfSlice, paSettings.startingTrend || "AUTO", Number(paSettings.counterStructureDepth) || 0, 
                paSettings.structureMode || "MECHANICAL", strictDecisional, strictCounter, 
                paSettings.majorOnly === true, showD2S_DOB, showD2S_DOF, showD2S_EOB, showD2S_EOF
            );
            
            let currentTrend = "BULLISH";
            if (signals.length > 0) {
                 const lastMajor = signals.slice().reverse().find(s => s.type === "CHoCH" || s.type === "BOS");
                 if (lastMajor) currentTrend = lastMajor.trend;
            }

            // 🔥 NAYA PRICE ACTION LOGIC (MULTI-TIMEFRAME SYNC)
            let activeSetupZone = null;
            let zoneTrend = currentTrend; 
            
            // 🔥 THE GATEKEEPER FIX: यूज़र ने DB में जो Setup (D-OB) चुना है, उसे निकालो
            const userSmcSetup = strategyLegs[0]?.smcSetup || {};
            const allowedSetup = userSmcSetup.setup; // e.g., "D-OB"

            const activeZones = signals.filter(sig => {
                if (!sig.isActive) return false;
                
                // 🚫 Strict Block: अगर यूज़र ने "D-OB" चुना है, तो "E-OB" या बाकी सबको रिजेक्ट कर दो!
                // (अगर allowedSetup मौजूद है, और सिग्नल का टाइप उससे मैच नहीं करता, तो हटा दो)
                if (allowedSetup && sig.type !== allowedSetup) return false; 
                
                return ["E-OB", "D-OB", "E-OF", "D-OF"].includes(sig.type);
            });
            
            if (activeZones.length > 0) {
                const nearestZone = activeZones[activeZones.length - 1]; 
                
                // 🔥 लाल ज़ोन/हरे ज़ोन का असली ट्रेंड निकालें
                if (nearestZone.trend) zoneTrend = nearestZone.trend;
                else if (nearestZone.isBullish !== undefined) zoneTrend = nearestZone.isBullish ? "BULLISH" : "BEARISH";
                else {
                    const currentClose = ltfSlice[ltfSlice.length - 1].close;
                    zoneTrend = (nearestZone.priceBottom > currentClose) ? "BEARISH" : "BULLISH";
                }

                activeSetupZone = { top: nearestZone.priceTop, bottom: nearestZone.priceBottom, type: nearestZone.type, trend: zoneTrend };
            }

            const currentCandle = ltfSlice[ltfSlice.length - 1];

            if (backtestSniper) {
                const sniperSignal = backtestSniper.processLiveMarket(currentCandle.close, currentCandle, activeSetupZone, zoneTrend);

                if (sniperSignal && (sniperSignal.action === 'BUY' || sniperSignal.action === 'SELL')) {
                    currentCandleSniperSignal = sniperSignal; // 🔥 सिग्नल सेव कर लिया
                    if (sniperSignal.trendType === "LONG" || sniperSignal.trendType === "BULLISH") priceActionLongSignal = true;
                    if (sniperSignal.trendType === "SHORT" || sniperSignal.trendType === "BEARISH") priceActionShortSignal = true;
                    
                    sniperTriggerName = `${sniperSignal.type} [${activeSetupZone.type}]`; 
                    console.log(`🎯 [BACKTEST SNIPER] Triggered via: ${sniperTriggerName} at ₹${sniperSignal.entryPrice} | Date: ${dateStr} | Time: ${h}:${m}`);
                }
            }
        }

        // 🔥 FINAL SIGNAL MERGER (यहाँ भी FIX लागू किया है)
        finalLongSignal = (strategy.type === "Price Action Based" || strategy.data?.type === "Price Action Based") 
            ? priceActionLongSignal 
            : (txnType === 'Both Side' || txnType === 'Only Long' || isTimeBased) ? longSignal : false;

        finalShortSignal = (strategy.type === "Price Action Based" || strategy.data?.type === "Price Action Based") 
            ? priceActionShortSignal 
            : (txnType === 'Both Side' || txnType === 'Only Short') ? shortSignal : false;
            
       

            // 🔥 CNC DTE CHECK FOR ENTRY
            const primaryReqExpiry = autoCorrectExpiryType(upperSymbol, dateStr, strategyLegs[0]?.expiry || "WEEKLY");
            const primaryExpiryLabel = getNearestExpiryString(dateStr, upperSymbol, primaryReqExpiry);
            const currentDTE = getTradingDaysToExpiry(istDate, primaryExpiryLabel);

            let isCncEntryDay = false; // Default ko false rakho
            let targetCncExpiryLabel = primaryExpiryLabel;

            if (orderType === "CNC") {
                if (currentDTE === cncEntryDays) {
                    isCncEntryDay = true; // Normal Entry Day (Wednesday)
                }
                else if (currentDTE === cncEntryDays - 1) {
                    // 🔥 OPTION 2 LOGIC: Catch the Skipped Day (Enter on DTE 3 / Wednesday)
                    // Check if yesterday was an expiry day. Agar kal expiry thi, toh kal humne trade skip kiya tha, isliye aaj entry lo!
                    let yesterday = new Date(istDate);
                    yesterday.setDate(yesterday.getDate() - 1);

                    // Weekend aur holidays ko skip karke pichla working day nikalo
                    while (yesterday.getDay() === 0 || yesterday.getDay() === 6 || isTradingHoliday(yesterday)) {
                        yesterday.setDate(yesterday.getDate() - 1);
                    }

                    const yestDateStr = yesterday.toISOString().split('T')[0];
                    const yestExpiryLabel = getNearestExpiryString(yestDateStr, upperSymbol, primaryReqExpiry);
                    const yestDTE = getTradingDaysToExpiry(yesterday, yestExpiryLabel);

                    if (yestDTE === 0) {
                        isCncEntryDay = true; // Kal expiry thi, toh aaj DTE 3 par trade le lo!
                    }
                }
                else if (currentDTE < cncEntryDays) {
                    const nextExpiryLabel = getNearestExpiryString(dateStr, upperSymbol, "NEXT WEEKLY");
                    const nextDTE = getTradingDaysToExpiry(istDate, nextExpiryLabel);

                    if (nextDTE === cncEntryDays) {
                        if (currentDTE === 0) {
                            // 🔥 OPTION 2 LOGIC: Agar entry ka din (DTE 4) khud ek Expiry Day (DTE 0) hai, toh aaj SKIP karo!
                            isCncEntryDay = false;
                        } else {
                            isCncEntryDay = true;
                            targetCncExpiryLabel = nextExpiryLabel;
                        }
                    }
                }
            } else {
                isCncEntryDay = true; // MIS aur BTST ke liye hamesha ON rahega
            }

            // =========================================================
            // 🛑 THE START TIME GATEKEEPER (Universal for Time & Indicator)
            // =========================================================
            let currentStartMin = 555; // Default 09:15 AM
            if (sTime) {
                const [sh, smStr] = sTime.split(':');
                if (smStr) {
                    const sm = smStr.split(' ')[0];
                    let h = parseInt(sh);
                    if (sTime.toUpperCase().includes('PM') && h !== 12) h += 12;
                    if (sTime.toUpperCase().includes('AM') && h === 12) h -= 12;
                    currentStartMin = h * 60 + parseInt(sm);
                }
            }

            // =========================================================
            // 🚀 ISOLATED RATIO SPREAD EXECUTION BLOCK (Safe from Legacy Bugs)
            // =========================================================
            if (isRatioSpreadStrategy && ratioEngine) {
                const spotClosePrice = parseFloat(candle.close);
                const currentTimeStr = `${h}:${m}`;


                // -------------------------------------------------------------
                // 🚨 STEP 1 & 2: THE DYNAMIC VELOCITY GUARD (UI Controlled)
                // -------------------------------------------------------------
                // 1. Initialize memory variables
                ratioEngine.spotHistory = ratioEngine.spotHistory || [];
                ratioEngine.isPanicApiMode = ratioEngine.isPanicApiMode || false;

                // Sirf tabhi history banao jab trade ON ho (WAITING me nahi)
                if (ratioEngine.status === 'ACTIVE' || ratioEngine.status === 'RECOVERY_MODE') {
                    
                    // 🔥 NAYA FIX: Fetching from NEW Object Folder 'gammaBlastSettings'
                    const gbSettings = riskSettings?.gammaBlastSettings || {};
                    const vWindow = Number(gbSettings.velocityWindow) || 15; // Default: 15 mins
                    
                    const defaultPoints = upperSymbol.includes("BANK") ? 250 : (upperSymbol.includes("SENSEX") ? 250 : 100);
                    const vPoints = Number(gbSettings.velocityPoints) || defaultPoints;

                    // Current Spot ko history me daalo
                    ratioEngine.spotHistory.push(spotClosePrice);

                    // 🔥 NAYA FIX: History array ko static 15 ki jagah dynamic 'vWindow' tak hi rakho
                    if (ratioEngine.spotHistory.length > vWindow) {
                        ratioEngine.spotHistory.shift(); 
                    }

                    // Trigger Panic Mode agar dynamic time me dynamic threshold cross ho jaye
                    if (ratioEngine.spotHistory.length === vWindow) {
                        let oldSpot = ratioEngine.spotHistory[0];
                        let spotMove = Math.abs(spotClosePrice - oldSpot);

                        if (spotMove >= vPoints && !ratioEngine.isPanicApiMode) {
                            ratioEngine.isPanicApiMode = true;
                            console.log(`\n🚨 [GAMMA BLAST ALERT] Time: ${currentTimeStr} | High Velocity! Spot moved ${spotMove.toFixed(2)} pts in ${vWindow} mins. Shifting to Panic API Mode!`);
                        }
                    }
                }
                // -------------------------------------------------------------
                
                // 1. ENTRY LOGIC (REAL DHAN API PREMIUMS)
                if (ratioEngine.status === 'WAITING_FOR_ENTRY' && timeInMinutes >= currentStartMin && !dailyBreakdownMap[dateStr].hasTradedTimeBased) {
                    
                    const atmStrike = calculateATM(spotClosePrice, upperSymbol);
                    
                    // let stepSize = 50;
                    // if (upperSymbol.includes("BANK") || upperSymbol.includes("SENSEX")) stepSize = 100;
                    // else if (upperSymbol.includes("MID")) stepSize = 25;

                    const stepSize = getStrikeStepSize(upperSymbol);

                    // 🔥 THE PREMIUM DIVISOR (Current 4, dynamic later)
                    const premiumDivisor = 4; 

                    console.log(`\n📡 [API CALL] Fetching REAL ATM Premiums for ${dateStr} ${currentTimeStr}...`);

                    const fetchRealPremium = async (optType, label) => {
                        if (!broker) return null;
                        try {
                            const axios = require('axios');
                            let expFlag = "WEEK"; let expCode = 1;
                            let reqExpiry = autoCorrectExpiryType(upperSymbol, dateStr, strategyLegs[0]?.expiry || "WEEKLY");
                            if (reqExpiry.toUpperCase() === "MONTHLY") { expFlag = "MONTH"; }
                            else if (reqExpiry.toUpperCase() === "NEXT WEEKLY" || reqExpiry.toUpperCase() === "NEXT WEEK") { expCode = 2; }
                            
                            const exchSegment = (Number(spotSecurityId) === 51 || Number(spotSecurityId) === 69) ? "BSE_FNO" : "NSE_FNO";
                            
                            const res = await axios.post('https://api.dhan.co/v2/charts/rollingoption', {
                                exchangeSegment: exchSegment, interval: "1", securityId: Number(spotSecurityId), instrument: "OPTIDX",
                                expiryFlag: expFlag, expiryCode: expCode, drvOptionType: optType === "CE" ? "CALL" : "PUT",
                                requiredData: ["open", "strike"], fromDate: dateStr, toDate: dateStr, strike: label
                            }, { headers: { 'access-token': broker.apiSecret, 'client-id': broker.clientId, 'Content-Type': 'application/json' }, timeout: 4000 });

                            const optKey = optType === "CE" ? "ce" : "pe";
                            if (res.data && res.data.data && res.data.data[optKey]) {
                                const chart = res.data.data[optKey];
                                for (let k = 0; k < chart.timestamp.length; k++) {
                                    const optTime = new Date(chart.timestamp[k] * 1000 + (5.5 * 3600000));
                                    if (optTime.toISOString().split('T')[1].substring(0, 5) === currentTimeStr) {
                                        return { price: chart.open[k], strike: Number(chart.strike[k]) };
                                    }
                                }
                            }
                        } catch (e) {}
                        return null;
                    };

                    // 🔥 BULLETPROOF HELPER: Guarantees Exact Strike from Dhan 
                    const getVerifiedPremium = async (optType, expectedStrike) => {
                        const stepDiff = Math.round((expectedStrike - atmStrike) / stepSize);
                        if (stepDiff === 0) return await fetchRealPremium(optType, "ATM");
                        
                        // Dhan API Quirk Fix: Positive steps (+50) = OTM1, Negative steps (-50) = ITM-1
                        let labelsToTry = stepDiff > 0 
                            ? [`OTM${stepDiff}`, `ITM${stepDiff}`, `${stepDiff}`]
                            : [`ITM${stepDiff}`, `OTM${stepDiff}`, `${stepDiff}`]; 
                        
                        for (let label of labelsToTry) {
                            await delay(200); // Anti-ban
                            let data = await fetchRealPremium(optType, label);
                            // Verify strike strictly!
                            if (data && data.strike === expectedStrike) return data;
                        }
                        return null;
                    };

                    // 🟢 STEP 1: Get Exact ATM Premiums
                    const atmCe = await getVerifiedPremium("CE", atmStrike) || { price: 120, strike: atmStrike };
                    const atmPe = await getVerifiedPremium("PE", atmStrike) || { price: 110, strike: atmStrike };

                    // 🟢 STEP 2: Calculate Target Premiums
                    const targetCePremium = atmCe.price / premiumDivisor;
                    const targetPePremium = atmPe.price / premiumDivisor;
                    console.log(`🎯 Target Premiums to Sell (ATM / ${premiumDivisor}) -> CE: ₹${targetCePremium.toFixed(2)}, PE: ₹${targetPePremium.toFixed(2)}`);

                    // 🔥 NEW: Check Execution Mode
                    const executionMode = riskSettings?.legSelectionMode || 'SYMMETRIC';
                    const maxAsymmetricLots = riskSettings?.maxAsymmetricLots || 5;
                    
                    let finalOtmCe = null;
                    let finalOtmPe = null;
                    
                    let bestStep = 0; // 🔥 BUG FIX: bestStep ko yahan bahar nikal diya!
                    
                    // Default Sell Lots
                    let ceSellLots = strategyLegs[2]?.quantity || 4; 
                    let peSellLots = strategyLegs[3]?.quantity || 4; 

                    if (executionMode === 'SYMMETRIC') {
                        // -------------------------------------------------------------
                        // 🟦 OLD LOGIC: SYMMETRIC SCANNER (Fixed Steps)
                        // -------------------------------------------------------------
                        console.log(`🤿 Scanning Option Chain to find the PERFECT Symmetric OTM...`);
                        let minCombinedError = Infinity; 

                        for(let step = 1; step <= 10; step++) {
                            const expectedCeStrike = atmStrike + (step * stepSize);
                            const expectedPeStrike = atmStrike - (step * stepSize);
                            
                            let ceData = await getVerifiedPremium("CE", expectedCeStrike);
                            let peData = await getVerifiedPremium("PE", expectedPeStrike);

                            if(!ceData || !peData) continue;

                            let ceError = Math.abs(ceData.price - targetCePremium);
                            let peError = Math.abs(peData.price - targetPePremium);
                            let combinedError = ceError + peError;

                            console.log(`   🔎 Tested Step ${step} (CE:${ceData.strike}, PE:${peData.strike}): CE=₹${ceData.price.toFixed(2)}, PE=₹${peData.price.toFixed(2)} | Combined Error: ${combinedError.toFixed(2)}`);

                            if (combinedError < minCombinedError) {
                                minCombinedError = combinedError;
                                bestStep = step;
                                finalOtmCe = ceData;
                                finalOtmPe = peData;
                            }

                            if (ceData.price < (targetCePremium * 0.4) && peData.price < (targetPePremium * 0.4)) break; 
                        }
                        console.log(`✅ [LOCK IN] Selected Symmetric Strike: Step ${bestStep} (${bestStep * stepSize} points away from ATM)`);
                        
                    } else {

                        // -------------------------------------------------------------
                        // 🟪/🟩 DYNAMIC SCANNER (Premium Matched - ASYMMETRIC & ADAPTIVE_SKEW)
                        // -------------------------------------------------------------
                        console.log(`🤿 Scanning Option Chain in 🔥 ${executionMode} Mode to find exact Premium matches...`);
                        
                        let bestCeStep = 0; let minCeError = Infinity;
                        let bestPeStep = 0; let minPeError = Infinity;

                        // 1. CE Side ko alag scan karo
                        for(let step = 1; step <= 15; step++) { 
                            const expectedCeStrike = atmStrike + (step * stepSize);
                            let ceData = await getVerifiedPremium("CE", expectedCeStrike);
                            if(!ceData) continue;
                            
                            let ceError = Math.abs(ceData.price - targetCePremium);
                            console.log(`   🔎 Tested CE Step ${step} (${ceData.strike}): Premium=₹${ceData.price.toFixed(2)} | Error: ${ceError.toFixed(2)}`);
                            
                            if (ceError < minCeError) {
                                minCeError = ceError;
                                bestCeStep = step;
                                finalOtmCe = ceData;
                            }
                            if (ceData.price < (targetCePremium * 0.3)) break; 
                        }

                        // 2. PE Side ko alag scan karo
                        for(let step = 1; step <= 15; step++) { 
                            const expectedPeStrike = atmStrike - (step * stepSize);
                            let peData = await getVerifiedPremium("PE", expectedPeStrike);
                            if(!peData) continue;
                            
                            let peError = Math.abs(peData.price - targetPePremium);
                            console.log(`   🔎 Tested PE Step ${step} (${peData.strike}): Premium=₹${peData.price.toFixed(2)} | Error: ${peError.toFixed(2)}`);
                            
                            if (peError < minPeError) {
                                minPeError = peError;
                                bestPeStep = step;
                                finalOtmPe = peData;
                            }
                            if (peData.price < (targetPePremium * 0.3)) break; 
                        }

                        // 3. 🛡️ SAFE LOGGING 
                        const safeCeStrike = finalOtmCe ? finalOtmCe.strike : "N/A (API Fail)";
                        const safePeStrike = finalOtmPe ? finalOtmPe.strike : "N/A (API Fail)";
                        console.log(`✅ [PREMIUM MATCHED] Initial Match -> CE: Step ${bestCeStep} (${safeCeStrike}) | PE: Step ${bestPeStep} (${safePeStrike})`);

                        // 4. 🧠 THE GENIUS MATH (With Fallback & Modes)
                        let fallbackStep = upperSymbol.includes("BANK") ? 6 : 5;
                        let activeCeStep = finalOtmCe ? bestCeStep : fallbackStep;
                        let activePeStep = finalOtmPe ? bestPeStep : fallbackStep;

                        if (executionMode === 'ASYMMETRIC') {
                            // -------------------------------------------------------------
                            // 🟪 ASYMMETRIC LOGIC (Delta Neutral Sizing)
                            // -------------------------------------------------------------
                            let calculatedCeLots = activeCeStep + 1;
                            let calculatedPeLots = activePeStep + 1;

                            ceSellLots = Math.min(calculatedCeLots, maxAsymmetricLots);
                            peSellLots = Math.min(calculatedPeLots, maxAsymmetricLots);
                            bestStep = Math.max(activeCeStep, activePeStep); 

                            if (calculatedCeLots > maxAsymmetricLots || calculatedPeLots > maxAsymmetricLots) {
                                 console.log(`⚠️ Extreme IV Guard Activated! CE Lots: ${calculatedCeLots} -> ${ceSellLots}, PE Lots: ${calculatedPeLots} -> ${peSellLots} (Capped at ${maxAsymmetricLots})`);
                            } else {
                                 console.log(`⚖️ Dynamic Delta Lots Assigned -> CE Sell: ${ceSellLots} Lots, PE Sell: ${peSellLots} Lots.`);
                            }
                        } 
                        else if (executionMode === 'ADAPTIVE_SKEW') {
                            // -------------------------------------------------------------
                            // 🟩 ADAPTIVE SKEW MODE (Sunil Bhai's Masterpiece Logic)
                            // -------------------------------------------------------------
                            let stepDiff = Math.abs(activeCeStep - activePeStep);
                            let originalCeStep = activeCeStep;
                            let originalPeStep = activePeStep;

                            if (stepDiff === 0) {
                                // Rule 5: Equal Steps
                                ceSellLots = 4; peSellLots = 4;
                                console.log(`⚖️ Adaptive [Rule 5]: Zero Skew detected (Both Step ${activeCeStep}). Firing equal 4-4 lots.`);
                            } 
                            else if (stepDiff === 1) {
                                // Rule 1, 2 & 3: Minor Skew (1 step gap)
                                if (activeCeStep < activePeStep) {
                                    ceSellLots = 3; peSellLots = 4;
                                } else {
                                    ceSellLots = 4; peSellLots = 3;
                                }
                                console.log(`🛡️ Adaptive [Minor Skew]: Closer leg assigned 3 lots to protect Break-Even. Assigned -> CE: ${ceSellLots}, PE: ${peSellLots}.`);
                            } 
                            else if (stepDiff >= 2) {
                                // Rule 4: Dangerous Skew (Shift closer leg by +1 for Safety)
                                if (activeCeStep < activePeStep) {
                                    activeCeStep += 1; // Shift CE further OTM
                                    ceSellLots = 3; peSellLots = 4;
                                    console.log(`🚨 Adaptive [Major Skew]: Dangerous CE proximity! Shifting CE Step ${originalCeStep} -> ${activeCeStep} for safety.`);
                                    
                                    // Fetch the newly shifted premium
                                    const shiftedStrike = atmStrike + (activeCeStep * stepSize);
                                    const newCeData = await getVerifiedPremium("CE", shiftedStrike);
                                    if(newCeData) finalOtmCe = newCeData;
                                    
                                } else {
                                    activePeStep += 1; // Shift PE further OTM
                                    ceSellLots = 4; peSellLots = 3;
                                    console.log(`🚨 Adaptive [Major Skew]: Dangerous PE proximity! Shifting PE Step ${originalPeStep} -> ${activePeStep} for safety.`);
                                    
                                    // Fetch the newly shifted premium
                                    const shiftedStrike = atmStrike - (activePeStep * stepSize);
                                    const newPeData = await getVerifiedPremium("PE", shiftedStrike);
                                    if(newPeData) finalOtmPe = newPeData;
                                }
                                console.log(`🛡️ Adaptive Shift Applied -> CE: ${ceSellLots} Lots, PE: ${peSellLots} Lots.`);
                            }

                            // 🛡️ THE EVENT-DAY SAFETY GUARD (Bouncer check)
                            let finalCeLots = Math.min(ceSellLots, maxAsymmetricLots);
                            let finalPeLots = Math.min(peSellLots, maxAsymmetricLots);

                            if (ceSellLots > maxAsymmetricLots || peSellLots > maxAsymmetricLots) {
                                 console.log(`⚠️ Adaptive Guard Activated! Capping Lots to ${maxAsymmetricLots} to prevent extreme margin block.`);
                                 ceSellLots = finalCeLots;
                                 peSellLots = finalPeLots;
                            }
                            
                            bestStep = Math.max(activeCeStep, activePeStep); // Lock the furthest step for max margin estimation
                        }
                    }

                    // 🟢 STEP 4: Fallback Guard
                    if (!finalOtmCe || !finalOtmPe) {
                        bestStep = upperSymbol.includes("BANK") ? 6 : 5;
                        finalOtmCe = { price: 32, strike: atmStrike + (bestStep * stepSize) };
                        finalOtmPe = { price: 27, strike: atmStrike - (bestStep * stepSize) };
                        console.log(`⚠️ Scanner Failed completely. Using Default Step ${bestStep}.`);
                    }

                    console.log(`✅ [LOCK IN] Selected Symmetric Strike: Step ${bestStep} (${bestStep * stepSize} points away from ATM)`);

                    // 🔥 DYNAMIC LOT SIZE CALCULATOR (Directly from your UI / DB Payload)
                    const realLotSize = Number(instrumentData.lotSize) || Number(strategyLegs[0]?.quantity) || 65;
                    console.log(`📦 Using Dynamic Lot Size from UI: ${realLotSize}`);

                    ratioEngine.activeLegs = [
                        { strike: atmCe.strike, type: 'CE', action: 'BUY', entryPrice: atmCe.price, lots: 1, tag: 'MAIN', inst: { id: `CE_ATM`, lotSize: realLotSize } },
                        { strike: atmPe.strike, type: 'PE', action: 'BUY', entryPrice: atmPe.price, lots: 1, tag: 'MAIN', inst: { id: `PE_ATM`, lotSize: realLotSize } },
                        
                        // 🔥 YAHAN BADLAV HUA HAI: Hardcoded 4 ki jagah 'ceSellLots' aur 'peSellLots' lagaya gaya hai
                        { strike: finalOtmCe.strike, type: 'CE', action: 'SELL', entryPrice: finalOtmCe.price, lots: ceSellLots, tag: 'MAIN', inst: { id: `CE_OTM`, lotSize: realLotSize } },
                        { strike: finalOtmPe.strike, type: 'PE', action: 'SELL', entryPrice: finalOtmPe.price, lots: peSellLots, tag: 'MAIN', inst: { id: `PE_OTM`, lotSize: realLotSize } }
                    ];
                    
                    ratioEngine.tradeBoundaries = ratioEngine.calculateBreakevens();
                    
                    // 🔥 🟢 STEP 5: SMART ESTIMATED MARGIN CALCULATOR (Using marginCalculator.js & Time Machine)
                    const requestedExpiry = riskSettings?.expiryType || "WEEKLY"; 
                    const isExpiryDay = isThisExpiryDay(dateStr, upperSymbol, requestedExpiry);

                    if(isExpiryDay) {
                        console.log(`⚠️ [GAMMA ALERT] SEBI Peak Margin Rules applied for 0 DTE Expiry Day!`);
                    }

                    // 🚀 Yahan hum apna naya engine call kar rahe hain jo sab kuch khud calculate karega
                    let estMargin = calculateApproxBasketMargin(ratioEngine.activeLegs, upperSymbol, isExpiryDay);
                    ratioEngine.estimatedMargin = estMargin;
                    
                    // Agar UI me Fix Max Loss (₹) diya hai to wo use karo, warna Est. Margin ka 1% nikalo
                    const userMaxLossAmt = Number(riskSettings.maxLoss);
                    const calculatedMaxLoss = userMaxLossAmt > 0 ? userMaxLossAmt : (estMargin * (Number(riskSettings.maxLossPct || 1) / 100));
                    ratioEngine.maxLossLimit = calculatedMaxLoss;

                    console.log(`🏦 Est. Margin: ₹${estMargin.toFixed(2)} | 🛡️ Engine Max Loss Limit: -₹${calculatedMaxLoss.toFixed(2)}`);

                    // 🛡️ Ab Risk Manager ko calculate kiya hua asli Max Loss milega
                    ratioEngine.riskManager = new TimeBasedRiskManager(ratioEngine.maxLossLimit, false, null, riskSettings);
                    ratioEngine.status = 'ACTIVE';
                    dailyBreakdownMap[dateStr].hasTradedTimeBased = true;
                    ratioEngine.tradeStartTime = timeInMinutes;
                    ratioEngine.entrySpotPrice = spotClosePrice;
                    
                    console.log(`\n🚀 [RATIO SPREAD MAIN ENTRY] Date: ${dateStr} | Time: ${currentTimeStr} | Spot: ₹${spotClosePrice}`);
                    ratioEngine.activeLegs.forEach((leg, idx) => {
                        console.log(`   🔸 Leg ${idx + 1}: ${leg.action} ${leg.lots} Lot(s) ${leg.type} @ Strike ${leg.strike} | Premium: ₹${leg.entryPrice.toFixed(2)}`);
                    });
                    console.log(`🚧 Boundaries: Lower BE: ₹${ratioEngine.tradeBoundaries.lower.toFixed(2)} | Upper BE: ₹${ratioEngine.tradeBoundaries.upper.toFixed(2)}`);
                }
 
                if (ratioEngine.status === 'ACTIVE' || ratioEngine.status === 'RECOVERY_MODE') {
                    
                    // 🔥 NAYA FIX 3: Spot ka difference Strike se nahi, 'Entry Spot' se nikalna hai!
                    // Isse engine ko pata chalega ki trade lene ke baad market kitna point sach me hila hai.
                    const baseSpot = ratioEngine.entrySpotPrice || ratioEngine.activeLegs[0].strike;
                    const spotChange = spotClosePrice - baseSpot; 
                    
                    const activeStartMin = ratioEngine.tradeStartTime || currentStartMin;
                    const minutesPassed = Math.max(0, timeInMinutes - activeStartMin);
                    const decayFactor = Math.min(1, minutesPassed / 375);
                    
                  
                    // 🕒 GET EXACT DTE FOR INTRADAY MTM SIMULATION
                    const reqExp = riskSettings?.expiryType || "WEEKLY";
                    const expiryStrRaw = getNearestExpiryString(dateStr, upperSymbol, reqExp);
                    const expDateStr = expiryStrRaw.split(' ').pop(); 
                    const expDay = parseInt(expDateStr.substring(0, 2));
                    const expMonthStr = expDateStr.substring(2, 5);
                    const expYear = parseInt("20" + expDateStr.substring(5, 7));
                    const monthMap = { "JAN":0, "FEB":1, "MAR":2, "APR":3, "MAY":4, "JUN":5, "JUL":6, "AUG":7, "SEP":8, "OCT":9, "NOV":10, "DEC":11 };
                    const expDateObj = new Date(expYear, monthMap[expMonthStr], expDay);
                    const tradeDateObj = new Date(dateStr);
                    let intradayDte = Math.max(0, Math.ceil((expDateObj.getTime() - tradeDateObj.getTime()) / (1000 * 3600 * 24)));

                    // 📉 DTE-BASED INTRADAY THETA FACTOR (Max decay allowed inside intraday session)
                    let intradayMaxDecay = 0.05; // Default for far DTE
                    if (intradayDte === 0) intradayMaxDecay = 0.60;      // Expiry day: massive intraday crush
                    else if (intradayDte === 1) intradayMaxDecay = 0.25; // 1 DTE: 25% intraday decay
                    else if (intradayDte === 2) intradayMaxDecay = 0.15;
                    else if (intradayDte === 3) intradayMaxDecay = 0.10;

                    let mockLTPs = {};
                    // baseSpot aur spotChange upar pehle se hi declared hain, isliye yahan se hata diya.

                    ratioEngine.activeLegs.forEach(leg => {
                        // 🔥 1. NIFTY GAMMA SCALE (800 points for a full delta shift)
                        const GAMMA_SCALE = upperSymbol.includes("BANK") ? 1500 : 800; 

                        // 🔥 2. CALCULATE ENTRY DELTA
                        let entryDelta = leg.type === 'CE' 
                            ? 0.50 + ((baseSpot - leg.strike) / GAMMA_SCALE)
                            : -0.50 + ((baseSpot - leg.strike) / GAMMA_SCALE);
                        
                        entryDelta = leg.type === 'CE' 
                            ? Math.max(0.05, Math.min(0.95, entryDelta)) 
                            : Math.max(-0.95, Math.min(-0.05, entryDelta));

                        // 🔥 3. CALCULATE LIVE DELTA
                        let currentDelta = leg.type === 'CE' 
                            ? 0.50 + ((spotClosePrice - leg.strike) / GAMMA_SCALE)
                            : -0.50 + ((spotClosePrice - leg.strike) / GAMMA_SCALE);
                            
                        currentDelta = leg.type === 'CE' 
                            ? Math.max(0.05, Math.min(0.95, currentDelta)) 
                            : Math.max(-0.95, Math.min(-0.05, currentDelta));

                        // 🔥 4. AVERAGE DELTA (The Calculus Secret to match Stockmock)
                        // Jab market move karta hai to option ek average delta par badhta/ghatta hai
                        let avgDelta = (entryDelta + currentDelta) / 2;

                        // 🔥 5. SMART INTRADAY THETA DECAY
                        let decayRate = leg.action === 'SELL' ? intradayMaxDecay : (intradayMaxDecay * 0.5);
                        let thetaDecay = leg.entryPrice * decayRate * decayFactor;

                        // 🔥 6. THEORETICAL PRICE FORMULA
                        let theoreticalPrice = leg.entryPrice + (spotChange * avgDelta) - thetaDecay;
                        
                        // -------------------------------------------------------------
                        // 🌪️ THE SMART IV CRUSH SIMULATOR (Sunil Bhai's Concept)
                        // -------------------------------------------------------------
                        let intrinsicForCrush = leg.type === 'CE' ? Math.max(0, spotClosePrice - leg.strike) : Math.max(0, leg.strike - spotClosePrice);
                        let currentExtrinsic = Math.max(0, theoreticalPrice - intrinsicForCrush); 
                        let ivCrushFactor = 1.0;

                        // Agar time 2:30 PM (870 minutes) ke baad ka hai, to premium crush hona shuru hoga
                        if (timeInMinutes >= 870) {
                            let crushDuration = timeInMinutes - 870; // 0 se 60 minutes tak (3:30 baje tak)
                            let crushRatio = Math.min(1, crushDuration / 60); 

                            // Expiry ke din 95% hawa niklegi, normal din 55-60% hawa niklegi
                            let maxCrushLimit = intradayDte === 0 ? 0.95 : 0.55; 
                            ivCrushFactor = 1.0 - (crushRatio * maxCrushLimit);
                        }

                        // Extrinsic ko crush karke wapas Intrinsic me jod do
                        let crushedExtrinsic = currentExtrinsic * ivCrushFactor;
                        theoreticalPrice = intrinsicForCrush + crushedExtrinsic;
                        // -------------------------------------------------------------

                        // 🔥 7. THE INTRINSIC FLOOR (Option kabhi apni asli value se sasta nahi ho sakta)
                        let intrinsic = leg.type === 'CE' 
                            ? Math.max(0, spotClosePrice - leg.strike) 
                            : Math.max(0, leg.strike - spotClosePrice);
                            
                        // Price ko lock kar do (Intrinsic ya 0.05, jo bhi bada ho)
                        mockLTPs[leg.inst?.id] = Math.max(0.05, Math.max(intrinsic, theoreticalPrice));
                    });



                    // 🧮 (B) THE MASTER EXIT CALCULATOR (Fetches EXACT Dhan Prices at Exit Time)
                    const executeRealExit = async (exitReason, exitTimeStr) => {
                        console.log(`\n📡 [API CALL] ${exitReason} Triggered! Fetching REAL Exit Premiums for ${dateStr} ${exitTimeStr}...`);
                        let finalRealPnL = 0;
                        const currentAtmExit = calculateATM(spotClosePrice, upperSymbol);
                        
                        // let stepSize = 50;
                        // if (upperSymbol.includes("BANK") || upperSymbol.includes("SENSEX")) stepSize = 100;
                        // else if (upperSymbol.includes("MID")) stepSize = 25;

                        const stepSize = getStrikeStepSize(upperSymbol);

                        for (let idx = 0; idx < ratioEngine.activeLegs.length; idx++) {
                            let leg = ratioEngine.activeLegs[idx];
                            let realExitPrice = null;

                            const stepDiff = Math.round((leg.strike - currentAtmExit) / stepSize);
                            let labelsToTry = stepDiff === 0 ? ["ATM"] : (stepDiff > 0 ? [`OTM${stepDiff}`, `ITM${stepDiff}`, `${stepDiff}`] : [`ITM${stepDiff}`, `OTM${stepDiff}`, `${stepDiff}`]);

                            for (let label of labelsToTry) {
                                await delay(250); // Anti-ban shield
                                try {
                                    const axios = require('axios');
                                    let expFlag = "WEEK"; let expCode = 1;
                                    let reqExpiry = autoCorrectExpiryType(upperSymbol, dateStr, strategyLegs[0]?.expiry || "WEEKLY");
                                    if (reqExpiry.toUpperCase() === "MONTHLY") { expFlag = "MONTH"; }
                                    else if (reqExpiry.toUpperCase() === "NEXT WEEKLY" || reqExpiry.toUpperCase() === "NEXT WEEK") { expCode = 2; }
                                    const exchSegment = (Number(spotSecurityId) === 51 || Number(spotSecurityId) === 69) ? "BSE_FNO" : "NSE_FNO";

                                    const res = await axios.post('https://api.dhan.co/v2/charts/rollingoption', {
                                        exchangeSegment: exchSegment, interval: "1", securityId: Number(spotSecurityId), instrument: "OPTIDX",
                                        expiryFlag: expFlag, expiryCode: expCode, drvOptionType: leg.type === "CE" ? "CALL" : "PUT",
                                        requiredData: ["open", "strike"], fromDate: dateStr, toDate: dateStr, strike: label
                                    }, { headers: { 'access-token': broker.apiSecret, 'client-id': broker.clientId, 'Content-Type': 'application/json' }, timeout: 4000 });

                                    const optKey = leg.type === "CE" ? "ce" : "pe";
                                    if (res.data && res.data.data && res.data.data[optKey]) {
                                        const chart = res.data.data[optKey];
                                        let fallbackLTP = null;
                                        let fallbackTime = null;

                                        for (let k = 0; k < chart.timestamp.length; k++) {
                                            const optTime = new Date(chart.timestamp[k] * 1000 + (5.5 * 3600000));
                                            const candleTimeStr = optTime.toISOString().split('T')[1].substring(0, 5);
                                            
                                            if (Number(chart.strike[k]) === leg.strike) {
                                                // 1. SMART LTP TRACKER: Exit time se pehle ka sabse latest price
                                                if (candleTimeStr <= exitTimeStr) {
                                                    fallbackLTP = chart.close[k] || chart.open[k];
                                                    fallbackTime = candleTimeStr;
                                                }
                                                // 2. Agar exact exit time mil gaya, to lock karo
                                                if (candleTimeStr === exitTimeStr) {
                                                    realExitPrice = chart.open[k];
                                                    break;
                                                }
                                            }
                                        }

                                        // 3. Agar exact time nahi mila, par LTP mil gaya
                                        if (realExitPrice === null && fallbackLTP !== null) {
                                            realExitPrice = fallbackLTP;
                                            console.log(`⚠️ Exact ${exitTimeStr} missing. Using LTP from ${fallbackTime}: ₹${realExitPrice.toFixed(2)}`);
                                        }
                                    }
                                } catch(e) {}
                                if (realExitPrice !== null) break; // Perfect strike found!
                            }

                            // 🔥 3. DTE & EXPIRY CALCULATION (Global Scope for this loop)
                            const reqExp = riskSettings?.expiryType || "WEEKLY";
                            const expiryStrRaw = getNearestExpiryString(dateStr, upperSymbol, reqExp);
                            const expDateStr = expiryStrRaw.split(' ').pop(); 
                            const expDay = parseInt(expDateStr.substring(0, 2));
                            const expMonthStr = expDateStr.substring(2, 5);
                            const expYear = parseInt("20" + expDateStr.substring(5, 7));
                            const monthMap = { "JAN":0, "FEB":1, "MAR":2, "APR":3, "MAY":4, "JUN":5, "JUL":6, "AUG":7, "SEP":8, "OCT":9, "NOV":10, "DEC":11 };
                            
                            const expDateObj = new Date(expYear, monthMap[expMonthStr], expDay);
                            const tradeDateObj = new Date(dateStr);
                            const dte = Math.max(0, Math.ceil((expDateObj.getTime() - tradeDateObj.getTime()) / (1000 * 3600 * 24)));
                            const isExpiryDay = (dte === 0);

                            if (realExitPrice === null) {
                                let intrinsic = leg.type === 'CE' ? Math.max(0, spotClosePrice - leg.strike) : Math.max(0, leg.strike - spotClosePrice);
                                const baseSpot = ratioEngine.entrySpotPrice || ratioEngine.activeLegs[0].strike;
                                const spotChange = spotClosePrice - baseSpot;
                                const GAMMA_SCALE = upperSymbol.includes("BANK") ? 1500 : 800;
                                
                                let entryDelta = leg.type === 'CE' ? 0.50 + ((baseSpot - leg.strike) / GAMMA_SCALE) : -0.50 + ((baseSpot - leg.strike) / GAMMA_SCALE);
                                entryDelta = leg.type === 'CE' ? Math.max(0.05, Math.min(0.95, entryDelta)) : Math.max(-0.95, Math.min(-0.05, entryDelta));

                                let currentDelta = leg.type === 'CE' ? 0.50 + ((spotClosePrice - leg.strike) / GAMMA_SCALE) : -0.50 + ((spotClosePrice - leg.strike) / GAMMA_SCALE);
                                currentDelta = leg.type === 'CE' ? Math.max(0.05, Math.min(0.95, currentDelta)) : Math.max(-0.95, Math.min(-0.05, currentDelta));

                                let avgDelta = (entryDelta + currentDelta) / 2;

                                let dailyThetaPct = 0.08; 
                                if (dte === 0) dailyThetaPct = 0.85;      
                                else if (dte === 1) dailyThetaPct = 0.50; 
                                else if (dte === 2) dailyThetaPct = 0.35; 
                                else if (dte === 3) dailyThetaPct = 0.25; 
                                else if (dte === 4) dailyThetaPct = 0.20; 
                                else if (dte === 5) dailyThetaPct = 0.15; 
                                else if (dte === 6) dailyThetaPct = 0.10;

                                const activeStartMin = ratioEngine.tradeStartTime || 567;
                                const exitMin = parseInt(exitTimeStr.split(':')[0]) * 60 + parseInt(exitTimeStr.split(':')[1]);
                                const minutesPassed = Math.max(0, exitMin - activeStartMin);
                                const intradayDecayFactor = Math.min(1, minutesPassed / 375);

                                let thetaDecay = leg.entryPrice * dailyThetaPct * intradayDecayFactor;
                                let theoreticalPrice = leg.entryPrice + (spotChange * avgDelta) - thetaDecay;

                                // -------------------------------------------------------------
                                // 🌪️ THE SMART IV CRUSH SIMULATOR (EOD Exit)
                                // -------------------------------------------------------------
                                let intrinsicForCrush = leg.type === 'CE' ? Math.max(0, spotClosePrice - leg.strike) : Math.max(0, leg.strike - spotClosePrice);
                                let currentExtrinsic = Math.max(0, theoreticalPrice - intrinsicForCrush); 
                                let ivCrushFactor = 1.0;

                                if (exitMin >= 870) { // 2:30 PM ke baad (870 minutes)
                                    let crushDuration = exitMin - 870; 
                                    let crushRatio = Math.min(1, crushDuration / 60); 
                                    let maxCrushLimit = dte === 0 ? 0.95 : 0.55; 
                                    ivCrushFactor = 1.0 - (crushRatio * maxCrushLimit);
                                }

                                let crushedExtrinsic = currentExtrinsic * ivCrushFactor;
                                theoreticalPrice = intrinsicForCrush + crushedExtrinsic;
                                // -------------------------------------------------------------

                                let distanceOtm = leg.type === 'CE' ? Math.max(0, leg.strike - spotClosePrice) : Math.max(0, spotClosePrice - leg.strike);
                                let baseMin = dte > 0 ? (dte * 5.0) : 0.05; 
                                let distancePenalty = Math.max(1, distanceOtm / 120);
                                let minTimeValue = Math.max(0.05, baseMin / distancePenalty);

                                realExitPrice = Math.max(minTimeValue, Math.max(intrinsic, theoreticalPrice));
                                console.log(`⚠️ API Completely Failed for Leg ${idx+1}. Using Dynamic Math -> P: ₹${realExitPrice.toFixed(2)} (DTE: ${dte}, Theta: ${dailyThetaPct*100}%)`);
                            }

                            // 🔥 5. THE SMART VWAP-AWARE INTRINSIC & FREAK TICK GUARD
                            const intrinsicValue = leg.type === 'CE' ? Math.max(0, spotClosePrice - leg.strike) : Math.max(0, leg.strike - spotClosePrice);
                            const gap = intrinsicValue - realExitPrice;
                            
                            // Expiry day volatile market me Spot aur VWAP ka gap 100+ points tak ja sakta hai.
                            const maxVwapGap = isExpiryDay ? 120 : 60; 

                            // 🔥 UI se Toggle ki value read karein (Default: false rakhein taki API par trust kare)
                            const enableIntrinsicGuard = riskSettings?.enableIntrinsicGuard === true;
                            const enableFreakTickGuard = riskSettings?.enableFreakTickGuard === true; // 🔥 NAYA FIX: Freak Tick Toggle

                            // PRIORITY 1: VWAP GUARD (Now UI Controlled)
                            if (enableIntrinsicGuard && realExitPrice < intrinsicValue && gap > maxVwapGap) {
                                console.log(`🛡️ Intrinsic Guard: Correcting huge API gap! API ₹${realExitPrice.toFixed(2)} -> True Value ₹${intrinsicValue.toFixed(2)}`);
                                realExitPrice = intrinsicValue; 
                            } 
                            else {
                                const mockFallback = mockLTPs[leg.inst?.id] || leg.entryPrice; 
                                
                                // 🔥 SUNIL BHAI'S LOGIC: Trust the API! (Now UI Controlled)
                                // Downside (Premium girna) IV Crush hota hai (e.g. 88 -> 38), isliye downside ko block NAHI karna hai.
                                // Sirf Extreme Upside Spike (Agar API 3 guna aur 40+ point zyada price de de) ko Freak Tick manenge.
                                if (enableFreakTickGuard) { // 🔥 NAYA FIX: Sirf jab ON ho tabhi block karega
                                    if (realExitPrice > (mockFallback * 3) && (realExitPrice - mockFallback) > 40) {
                                        console.log(`🛡️ Extreme Freak Tick Blocked on ${leg.strike} ${leg.type}! API gave ₹${realExitPrice.toFixed(2)} | Using Safe Mock: ₹${mockFallback.toFixed(2)}`);
                                        realExitPrice = mockFallback;
                                    }
                                }
                            }

                            realExitPrice = Math.max(0.05, realExitPrice);

                            // 🔥 THE DYNAMIC LOT SIZE FIX
                            const mult = leg.lots * (leg.inst?.lotSize || realLotSize || 65);

                            const legPnL = leg.action === 'BUY' ? (realExitPrice - leg.entryPrice) * mult : (leg.entryPrice - realExitPrice) * mult;
                            finalRealPnL += legPnL;

                            console.log(`   🏁 Leg ${idx + 1} Exit: ${leg.action} ${leg.lots} Lot(s) ${leg.type} @ Strike ${leg.strike} | Exit Premium: ₹${realExitPrice.toFixed(2)} | Leg PnL: ₹${legPnL.toFixed(2)}`);
                        }
                        return isNaN(finalRealPnL) ? 0 : finalRealPnL;
                    };

                    // ⏰ (C) EOD FORCE EXIT FIX
                    if (timeInMinutes >= exitMin) {
                        // 🔥 Ye direct API se true price layega!
                        const finalPnL = await executeRealExit("EOD SQUARE OFF", currentTimeStr);
                        
                        console.log(`\n⏰ [EOD SQUARE OFF] Time: ${currentTimeStr} | Spot: ₹${spotClosePrice}`);

                        // 🔥 FIX: Puraane saare loss (realizedLoss) aur aakhiri trade ka loss (finalPnL) dono jod do!
                        const totalDailyPnL = (ratioEngine.realizedLoss || 0) + finalPnL;
                        console.log(`   💰 Final Total PnL booked for the Day: ₹${totalDailyPnL.toFixed(2)}`);

                        // 🔥 SMART SYMBOL (BULLETPROOF) FOR EOD:
                        const isRecoveryTrade = ratioEngine.activeLegs.some(leg => leg.tag === 'RECOVERY');
                        const finalTradeSymbol = isRecoveryTrade ? "RECOVERY_TRADE" : "RATIO_SPREAD_MAIN";

                        dailyBreakdownMap[dateStr].tradesList.push({
                            symbol: finalTradeSymbol,
                            pnl: finalPnL,
                            exitType: "TIME_SQUAREOFF",
                            exitTime: `${dateStr} ${currentTimeStr}:00`
                        });
                        dailyBreakdownMap[dateStr].pnl += finalPnL;
                        dailyBreakdownMap[dateStr].trades += 1;
                        ratioEngine.status = 'COMPLETED'; 
                    } else {
                        // (D) Normal intra-day evaluation
                        // 👇 1. YAHAN EK LINE JODE: Main file ka Panic status Risk Manager ko bheje
                        if (ratioEngine.riskManager) ratioEngine.riskManager.isPanicApiMode = ratioEngine.isPanicApiMode;

                        // 🔥 CROSS-VERIFICATION INJECTION: 'await' lagaya aur ek arrow function pass kiya jo asali MTM layega
                        const decision = await ratioEngine.evaluateTick(
                            currentTimeStr, 
                            mockLTPs, 
                            spotClosePrice,
                            async () => {
                                console.log(`\n📡 [API CALL] Cross-verifying REAL MTM from Broker...`);
                                let tempRealPnL = 0;

                                // let stepSize = upperSymbol.includes("BANK") || upperSymbol.includes("SENSEX") ? 100 : (upperSymbol.includes("MID") ? 25 : 50);
                                let stepSize = getStrikeStepSize(upperSymbol);

                                const currentAtmCheck = calculateATM(spotClosePrice, upperSymbol);

                                for (let idx = 0; idx < ratioEngine.activeLegs.length; idx++) {
                                    let leg = ratioEngine.activeLegs[idx];
                                    let checkPrice = null;
                                    const stepDiff = Math.round((leg.strike - currentAtmCheck) / stepSize);
                                    let labelsToTry = stepDiff === 0 ? ["ATM"] : (stepDiff > 0 ? [`OTM${stepDiff}`, `ITM${stepDiff}`, `${stepDiff}`] : [`ITM${stepDiff}`, `OTM${stepDiff}`, `${stepDiff}`]);

                                    for (let label of labelsToTry) {
                                        await delay(250); 
                                        try {
                                            const axios = require('axios');
                                            let expFlag = "WEEK"; let expCode = 1;
                                            let reqExpiry = autoCorrectExpiryType(upperSymbol, dateStr, strategyLegs[0]?.expiry || "WEEKLY");
                                            if (reqExpiry.toUpperCase() === "MONTHLY") { expFlag = "MONTH"; }
                                            else if (reqExpiry.toUpperCase() === "NEXT WEEKLY" || reqExpiry.toUpperCase() === "NEXT WEEK") { expCode = 2; }
                                            const exchSegment = (Number(spotSecurityId) === 51 || Number(spotSecurityId) === 69) ? "BSE_FNO" : "NSE_FNO";

                                            const res = await axios.post('https://api.dhan.co/v2/charts/rollingoption', {
                                                exchangeSegment: exchSegment, interval: "1", securityId: Number(spotSecurityId), instrument: "OPTIDX",
                                                expiryFlag: expFlag, expiryCode: expCode, drvOptionType: leg.type === "CE" ? "CALL" : "PUT",
                                                requiredData: ["open", "strike"], fromDate: dateStr, toDate: dateStr, strike: label
                                            }, { headers: { 'access-token': broker.apiSecret, 'client-id': broker.clientId, 'Content-Type': 'application/json' }, timeout: 4000 });

                                            const optKey = leg.type === "CE" ? "ce" : "pe";
                                            if (res.data && res.data.data && res.data.data[optKey]) {
                                                const chart = res.data.data[optKey];
                                                for (let k = chart.timestamp.length - 1; k >= 0; k--) {
                                                    const optTime = new Date(chart.timestamp[k] * 1000 + (5.5 * 3600000));
                                                    const candleTimeStr = optTime.toISOString().split('T')[1].substring(0, 5);
                                                    
                                                    // 🔥 THE MISSING MASTER LOCK: Strike jarur match karni chahiye!
                                                    if (Number(chart.strike[k]) === leg.strike) {
                                                        if (candleTimeStr <= currentTimeStr) {
                                                            checkPrice = chart.open[k];
                                                            break;
                                                        }
                                                    }
                                                }
                                            }
                                        } catch(e) {}
                                        if (checkPrice !== null) break; // Asli price mil gaya to aage ke labels check karna band!
                                    }
                                    
                                    // 🔥 DTE & EXPIRY CALCULATION FOR SMART GUARDS
                                    const reqExpiry = autoCorrectExpiryType(upperSymbol, dateStr, strategyLegs[0]?.expiry || "WEEKLY");
                                    const expiryStrRaw = getNearestExpiryString(dateStr, upperSymbol, reqExpiry);
                                    const expDateStr = expiryStrRaw.split(' ').pop(); 
                                    const expDay = parseInt(expDateStr.substring(0, 2));
                                    const expMonthStr = expDateStr.substring(2, 5);
                                    const expYear = parseInt("20" + expDateStr.substring(5, 7));
                                    const monthMap = { "JAN":0, "FEB":1, "MAR":2, "APR":3, "MAY":4, "JUN":5, "JUL":6, "AUG":7, "SEP":8, "OCT":9, "NOV":10, "DEC":11 };
                                    
                                    const expDateObj = new Date(expYear, monthMap[expMonthStr], expDay);
                                    const tradeDateObj = new Date(dateStr);
                                    const dte = Math.max(0, Math.ceil((expDateObj.getTime() - tradeDateObj.getTime()) / (1000 * 3600 * 24)));
                                    const isExpiryDay = (dte === 0);

                                    // 🔥 THE SPIKE GUARD (Fallback if API gives wrong/no data)
                                    let mockPrice = mockLTPs[leg.inst?.id] || leg.entryPrice;
                                    
                                    if (checkPrice !== null) {
                                        const intrinsic = leg.type === 'CE' ? Math.max(0, spotClosePrice - leg.strike) : Math.max(0, leg.strike - spotClosePrice);
                                        const gap = intrinsic - checkPrice;
                                        
                                        // Expiry day volatile market me Spot aur VWAP ka gap 100+ points tak ja sakta hai.
                                        const maxVwapGap = isExpiryDay ? 120 : 60; 

                                        // 🔥 UI se Toggle ki value read karein
                                        const enableIntrinsicGuard = riskSettings?.enableIntrinsicGuard === true;
                                        
                                        // 🔥 PRIORITY 1: THE SMART VWAP-AWARE INTRINSIC GUARD (Now UI Controlled)
                                        if (enableIntrinsicGuard && checkPrice < intrinsic && gap > maxVwapGap) {
                                            console.log(`🛡️ Intrinsic Guard: Correcting huge API gap! API ₹${checkPrice.toFixed(2)} -> True Value ₹${intrinsic.toFixed(2)}`);
                                            checkPrice = intrinsic; 
                                        } 

                                        // 🔥 PRIORITY 2: FREAK TICK GUARD (Trust API Mode)
                                        else {
                                            // 🔥 SUNIL BHAI'S LOGIC: Trust the API!
                                            // Downside (Premium girna) IV Crush hai, isse chup-chap pass hone do.
                                            // Sirf Extreme Upside Spike ko Freak Tick manenge.
                                            if (checkPrice > (mockPrice * 3) && (checkPrice - mockPrice) > 40) {
                                                console.log(`🛡️ Extreme Freak Tick Blocked on ${leg.strike} ${leg.type}! API gave ₹${checkPrice.toFixed(2)} | Using Safe Mock: ₹${mockPrice.toFixed(2)}`);
                                                checkPrice = mockPrice;
                                            }
                                        }
                                        
                                        checkPrice = Math.max(0.05, checkPrice);
                                    } else {
                                        // Agar API complete fail ho jaye
                                        checkPrice = mockPrice;
                                    }

                                    const mult = leg.lots * (leg.inst?.lotSize || 65);
                                    tempRealPnL += leg.action === 'BUY' ? (checkPrice - leg.entryPrice) * mult : (leg.entryPrice - checkPrice) * mult;
                                }
                                return tempRealPnL;
                            }
                        );

                        // 🌉 THE SYNC BRIDGE (FOOLPROOF DIRECT READ) 🔥
                        // Naya Fix: Hum 'decision' object ka wait nahi karenge, direct Risk Manager ka brain padhenge!
                        if (ratioEngine.riskManager) {
                            
                            // Agar Main file me Panic ON tha, aur Risk Manager ne usko andar OFF (false) kar diya hai...
                            if (ratioEngine.isPanicApiMode === true && ratioEngine.riskManager.isPanicApiMode === false) {
                                // Toh Radar ki purani memory clear kar do! 
                                ratioEngine.spotHistory = []; 
                                console.log(`🧹 [RADAR RESET] Time: ${currentTimeStr} | Engine memory cleared for next fresh setup.`);
                            }
                            
                            // Main file aur Risk Manager ka status hamesha ek-saman (Sync) rakho
                            ratioEngine.isPanicApiMode = ratioEngine.riskManager.isPanicApiMode;
                        }


                        // 🔥 NAYA FIX: EARLY BREACH PE REAL API PRICE MANGO! (Added SL_HIT & GAMMA Fallback)
                        if (decision && (decision.action === 'FETCH_REAL_PRICES_FOR_RECOVERY' || decision.action === 'SL_HIT' || decision.reason === 'GAMMA_BLAST_VELOCITY_BREACH')) {
                            
                            // 1. Dhan API se asli price laao (e.g., -₹5288)
                            const realPnL = await executeRealExit(decision.reason, currentTimeStr);
                            
                            // 2. Real PnL wapas Engine ko do recovery ka faisla lene ke liye!
                            const recoveryDecision = ratioEngine.processRealExitAndRecovery(realPnL, currentTimeStr, mockLTPs);
                            
                            if (recoveryDecision && recoveryDecision.action === 'RECOVERY_SWITCH') {
                                console.log(`\n🚑 [RECOVERY TRIGGERED] Switching to Firefighting Mode at ${currentTimeStr} | Spot: ₹${spotClosePrice}`);
                                console.log(`   📉 Realized Loss booked: ₹${realPnL.toFixed(2)}`);
                                
                                // 🔥 NAYA FIX: MULTI-RECOVERY COUNTER (The Foolproof Way)
                                if (!ratioEngine.customRecoveryCount) ratioEngine.customRecoveryCount = 0;
                                ratioEngine.customRecoveryCount += 1; // 1 = First Recovery, 2 = Second Recovery
                                
                                const isSequentialRecovery = (ratioEngine.customRecoveryCount > 1);

                                // 1. Pehle ka trade DB me save karo
                                const exitingTradeSymbol = isSequentialRecovery ? "RECOVERY_TRADE" : "RATIO_SPREAD_MAIN";
                                dailyBreakdownMap[dateStr].tradesList.push({
                                    symbol: exitingTradeSymbol,
                                    pnl: realPnL,
                                    // exitType: "STOPLOSS_TO_RECOVERY",
                                    exitType: decision.reason || "SWITCHED TO RECOVERY",
                                    exitTime: `${dateStr} ${currentTimeStr}:00`
                                });
                                dailyBreakdownMap[dateStr].pnl += realPnL;
                                dailyBreakdownMap[dateStr].trades += 1;

                                // 🔥 2. MULTI-RECOVERY BUDGET RULE
                                const remainingLossCap = ratioEngine.maxLossLimit - Math.abs(ratioEngine.realizedLoss);
                                // Agar pehli baar hai, to 50% use karo. Agar doosri baar hai, to bacha hua pura (100%) paisa laga do!
                                const recoveryRiskBudget = isSequentialRecovery ? remainingLossCap : (remainingLossCap * 0.5);
                                
                                // 🔥 3. TREND DIRECTION RULE
                                let recoveryType = "PE";
                                if (isSequentialRecovery) {
                                    // Sirf dusri (2nd) recovery me disha palatni hai!
                                    const oldType = ratioEngine.activeLegs[0]?.type || "PE";
                                    recoveryType = (oldType === "PE") ? "CE" : "PE";
                                    console.log(`   🔄 C2C/SL Hit! Reversing direction to catch trend. Previous was ${oldType}, now Selling ${recoveryType}.`);
                                } else {
                                    // Pehli recovery me engine ne trend se jo disha (PE ya CE) nikali hai, wahi use karo
                                    recoveryType = ratioEngine.activeLegs[0]?.type || "PE"; 
                                }

                                const recoveryAtmStrike = calculateATM(spotClosePrice, upperSymbol);
                                console.log(`\n📡 [API CALL] Fetching REAL Recovery Entry Premium for ATM Strike ${recoveryAtmStrike} ${recoveryType} at ${currentTimeStr}...`);
                                
                                let recoveryEntryPrice = 50; 
                                try {
                                    const axios = require('axios');
                                    let expFlag = "WEEK"; let expCode = 1;
                                    let reqExpiry = autoCorrectExpiryType(upperSymbol, dateStr, strategyLegs[0]?.expiry || "WEEKLY");
                                    if (reqExpiry.toUpperCase() === "MONTHLY") { expFlag = "MONTH"; }
                                    else if (reqExpiry.toUpperCase() === "NEXT WEEKLY" || reqExpiry.toUpperCase() === "NEXT WEEK") { expCode = 2; }
                                    const exchSegment = (Number(spotSecurityId) === 51 || Number(spotSecurityId) === 69) ? "BSE_FNO" : "NSE_FNO";

                                    const res = await axios.post('https://api.dhan.co/v2/charts/rollingoption', {
                                        exchangeSegment: exchSegment, interval: "1", securityId: Number(spotSecurityId), instrument: "OPTIDX",
                                        expiryFlag: expFlag, expiryCode: expCode, drvOptionType: recoveryType === "CE" ? "CALL" : "PUT",
                                        requiredData: ["open", "strike"], fromDate: dateStr, toDate: dateStr, strike: "ATM"
                                    }, { headers: { 'access-token': broker.apiSecret, 'client-id': broker.clientId, 'Content-Type': 'application/json' }, timeout: 4000 });

                                    const optKey = recoveryType === "CE" ? "ce" : "pe";
                                    if (res.data && res.data.data && res.data.data[optKey]) {
                                        const chart = res.data.data[optKey];
                                        for (let k = 0; k < chart.timestamp.length; k++) {
                                            const optTime = new Date(chart.timestamp[k] * 1000 + (5.5 * 3600000));
                                            if (optTime.toISOString().split('T')[1].substring(0, 5) === currentTimeStr) {
                                                recoveryEntryPrice = chart.open[k];
                                                break;
                                            }
                                        }
                                    }
                                } catch(e) { }

                                // 🔥 SMART POSITION SIZING (UI wale Buffer ke hisaab se)
                                const realLotSize = Number(instrumentData.lotSize) || Number(strategyLegs[0]?.quantity) || 65;

                                // 1. UI se aane wala Stop Loss Buffer points (Agar UI se nahi aaya to default 15 points)
                                const slBufferPoints = ratioEngine.config.riskManagement?.recoverySettings?.slBufferPoints || 15;

                                // 2. Dynamic Lots calculation
                                let dynamicLots = Math.floor(recoveryRiskBudget / (slBufferPoints * realLotSize));

                                // 3. Rules: Kam se kam 1 lot lenge, aur maximum 4 lots lenge (Ise bhi UI se dynamic kar sakte hain baad me)
                                if (dynamicLots < 1) dynamicLots = 1; 
                                if (dynamicLots > 4) dynamicLots = 4;

                                currentStartMin = timeInMinutes; 
                                ratioEngine.tradeStartTime = timeInMinutes;
                                ratioEngine.entrySpotPrice = spotClosePrice; // Recovery trade ka time lock

                                ratioEngine.activeLegs = [
                                    { strike: recoveryAtmStrike, type: recoveryType, action: 'SELL', entryPrice: recoveryEntryPrice, lots: dynamicLots, tag: 'RECOVERY', inst: { id: `${recoveryType}_RECOVERY`, lotSize: realLotSize } }
                                ];
                                
                                console.log(`   🔥 [RECOVERY ENTRY] Sold ${dynamicLots} Lot(s) ${recoveryType} @ Strike ${recoveryAtmStrike} | Premium: ₹${recoveryEntryPrice.toFixed(2)} | Risk Allocated: -₹${recoveryRiskBudget.toFixed(2)}`);
                                
                                ratioEngine.status = 'RECOVERY_MODE';
                            }
                            
                            // 🛑 THE MISSING LOCK (KILL SWITCH): Agar recovery nahi hui, fail ho gayi, ya disable hai!
                            else {
                                console.log(`\n🎯 [FORCE EXIT] Time: ${currentTimeStr} | Trade closed completely. Recovery skipped/disabled.`);
                                
                                const isRecoveryTrade = ratioEngine.activeLegs.some(leg => leg.tag === 'RECOVERY');
                                const finalTradeSymbol = isRecoveryTrade ? "RECOVERY_TRADE" : "RATIO_SPREAD_MAIN";
                                                            
                                dailyBreakdownMap[dateStr].tradesList.push({
                                    symbol: finalTradeSymbol,
                                    pnl: realPnL,
                                    exitType: decision.reason || "GAMMA_VELOCITY_CUT",
                                    exitTime: `${dateStr} ${currentTimeStr}:00`
                                });
                                dailyBreakdownMap[dateStr].pnl += realPnL;
                                dailyBreakdownMap[dateStr].trades += 1;
                                
                                // 🔥 ENGINE KO BAND KARO (Infinite Loop Fix)
                                ratioEngine.status = 'COMPLETED'; 
                            }
                        }

                        // For Late Exit (SQUARE OFF)
                        else if (decision && decision.action === 'EXIT_ALL') {
                            const exitReason = decision.reason || "STRATEGY_EXIT";
                            const finalPnL = await executeRealExit(exitReason, currentTimeStr); 
                            
                            console.log(`\n🎯 [EXIT ALL] Reason: ${exitReason} | Time: ${currentTimeStr} | Spot: ₹${spotClosePrice}`);
                            console.log(`   💰 Final PnL booked: ₹${finalPnL.toFixed(2)}`);

                            dailyBreakdownMap[dateStr].tradesList.push({
                                symbol: ratioEngine.status === 'RECOVERY_MODE' ? "RECOVERY_TRADE" : "RATIO_SPREAD_MAIN",
                                pnl: finalPnL,
                                exitType: exitReason,
                                exitTime: `${dateStr} ${currentTimeStr}:00`
                            });
                            dailyBreakdownMap[dateStr].pnl += finalPnL;
                            dailyBreakdownMap[dateStr].trades += 1;
                            ratioEngine.status = 'COMPLETED'; 
                        }
                    }
                }
                
                continue; // 🔥 ISE BILKUL NAHI HATANA HAI!
            }

            // 1. Agar Time-Based strategy hai, to time aane par signal TRUE karo
            if (isTimeBased) { 
                if (timeInMinutes >= currentStartMin && !dailyBreakdownMap[dateStr].hasTradedTimeBased && isCncEntryDay) {
                    longSignal = true;
                    dailyBreakdownMap[dateStr].hasTradedTimeBased = true;
                }
            } 
            // 2. Agar Indicator-Based strategy hai, aur waqt Start Time se chhota hai, 
            // to chahe indicator signal de de, use BLOCK (false) kardo!
            else {
                if (timeInMinutes < currentStartMin) {
                    longSignal = false;
                    shortSignal = false;
                }
            }

            // 🔥 THE CULPRIT KILLED: यह कोड सिर्फ तभी इंडिकेटर को देखेगा जब स्ट्रेटेजी Price Action न हो
            if (strategy.type !== "Price Action Based" && strategy.data?.type !== "Price Action Based") {
                finalLongSignal = (txnType === 'Both Side' || txnType === 'Only Long' || isTimeBased) ? longSignal : false;
                finalShortSignal = (txnType === 'Both Side' || txnType === 'Only Short') ? shortSignal : false;
            }

            // 🛑 GATEKEEPER BLOCK: अगर 9:15 (Start Time) से पहले का सिग्नल है, तो उसे रोक दो
            if (timeInMinutes < currentStartMin && !isTimeBased) {
                finalLongSignal = false;
                finalShortSignal = false;
            }

            let exitLongSignal = false;
            if (exitLongRules.length > 0) {
                let overallResult = null;
                exitLongRules.forEach((rule, idx) => {
                    const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
                    const ruleResult = evaluateCondition(
                        calcExitLongInd1[idx] ? calcExitLongInd1[idx][i] : null, calcExitLongInd2[idx] ? calcExitLongInd2[idx][i] : null,
                        (i > 0 && calcExitLongInd1[idx]) ? calcExitLongInd1[idx][i - 1] : null, (i > 0 && calcExitLongInd2[idx]) ? calcExitLongInd2[idx][i - 1] : null, operator
                    );
                    if (idx === 0) overallResult = ruleResult;
                    else {
                        const logicalOp = exitConds.logicalOpsLong ? exitConds.logicalOpsLong[idx - 1] : 'AND';
                        overallResult = logicalOp === 'AND' ? (overallResult && ruleResult) : (overallResult || ruleResult);
                    }
                });
                exitLongSignal = overallResult;
            }

            let exitShortSignal = false;
            if (exitShortRules.length > 0) {
                let overallResult = null;
                exitShortRules.forEach((rule, idx) => {
                    const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
                    const ruleResult = evaluateCondition(
                        calcExitShortInd1[idx] ? calcExitShortInd1[idx][i] : null, calcExitShortInd2[idx] ? calcExitShortInd2[idx][i] : null,
                        (i > 0 && calcExitShortInd1[idx]) ? calcExitShortInd1[idx][i - 1] : null, (i > 0 && calcExitShortInd2[idx]) ? calcExitShortInd2[idx][i - 1] : null, operator
                    );
                    if (idx === 0) overallResult = ruleResult;
                    else {
                        const logicalOp = exitConds.logicalOpsShort ? exitConds.logicalOpsShort[idx - 1] : 'AND';
                        overallResult = logicalOp === 'AND' ? (overallResult && ruleResult) : (overallResult || ruleResult);
                    }
                });
                exitShortSignal = overallResult;
            }

            const isMarketOpen = timeInMinutes >= 555 && timeInMinutes < exitMin;
            const isExitTime = timeInMinutes >= exitMin;
            let isLastCandleOfDay = false;
            if (i === cachedData.length - 1) isLastCandleOfDay = true;
            else {
                const nextCandleIst = new Date(new Date(cachedData[i + 1].timestamp).getTime() + (5.5 * 60 * 60 * 1000));
                if (nextCandleIst.toISOString().split('T')[0] !== dateStr) isLastCandleOfDay = true;
            }

            const spotClosePrice = parseFloat(candle.close);

            // =========================================================
            // 🛡️ 1. M2M RISK CHECK & MULTI-LEG EVALUATION
            // =========================================================
            if (openTrades.length > 0) {
                let combinedOpenPnL = 0;
                let triggerReasonForExitAll = null;

                openTrades.forEach(trade => {
                    let currentClose = spotClosePrice;
                    let currentHigh = spotClosePrice;
                    let currentLow = spotClosePrice;
                    let currentOpen = spotClosePrice;

                    // 🎯 STEP 1: Intrinsic Value MUST use 'spotClosePrice' (Candle ke High/Low ka dhokha nahi)
                    let intrinsicValueAtClose = 0;
                    if (isOptionsTrade && trade.optionConfig) {
                        const fixedStrike = Number(trade.optionConfig.strike);
                        if (trade.optionConfig.type === "CE") {
                            intrinsicValueAtClose = Math.max(0, spotClosePrice - fixedStrike);
                        } else {
                            intrinsicValueAtClose = Math.max(0, fixedStrike - spotClosePrice);
                        }
                    }

                    if (isOptionsTrade && trade.premiumChart && trade.premiumChart.start_Time) {
                        let exactMatchIndex = trade.premiumChart.start_Time.findIndex(t => {
                            const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
                            return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
                        });

                        let isFakeData = false;
                        
                        if (exactMatchIndex !== -1) {
                            let tempClose = parseFloat(trade.premiumChart.close[exactMatchIndex]);
                            
                            // 🛡️ THE GHOST CATCHER 4.0 (Perfect Sanity Check)
                            if (!tempClose || isNaN(tempClose) || tempClose <= 0) {
                                isFakeData = true; 
                            } else if (intrinsicValueAtClose > 10 && tempClose < (intrinsicValueAtClose * 0.7)) {
                                // Agar option ka close price Nifty ke close intrinsic se bahut kam hai, tabhi FAKE mano!
                                isFakeData = true; 
                            }

                            if (!isFakeData) {
                                currentClose = tempClose;
                                currentHigh = parseFloat(trade.premiumChart.high[exactMatchIndex]);
                                currentLow = parseFloat(trade.premiumChart.low[exactMatchIndex]);
                                currentOpen = parseFloat(trade.premiumChart.open[exactMatchIndex]);
                                trade.lastKnownPremium = currentClose;
                            }
                        } else {
                            isFakeData = true; // API Data Missing
                        }
                        
                        // 🟢 THE BLIND SPOT TRACKER 🟢
                        if (isFakeData) {
                            let fallbackPremium = trade.lastKnownPremium || trade.entryPrice;
                            // Fake/Missing data aane par real loss chhupne na paye
                            currentClose = Math.max(fallbackPremium, intrinsicValueAtClose); 
                            currentHigh = currentLow = currentOpen = currentClose;
                        }

                    } else if (!isOptionsTrade) {
                        currentHigh = parseFloat(candle.high); currentLow = parseFloat(candle.low); currentClose = parseFloat(candle.close); currentOpen = parseFloat(candle.open);
                    }

                    trade.currentPrice = currentClose;
                    trade.currentHigh = currentHigh;
                    trade.currentLow = currentLow;
                    trade.currentOpen = currentOpen;
                    trade.openPnL = calcTradePnL(trade.entryPrice, currentClose, trade.quantity, trade.transaction);
                    combinedOpenPnL += trade.openPnL;
                });



                const realizedDailyPnL = dailyBreakdownMap[dateStr].pnl;
                const currentTotalPnL = realizedDailyPnL + combinedOpenPnL;

                let hitGlobalMaxProfit = false;
                let hitGlobalMaxLoss = false;

                if (globalMaxProfit > 0 && currentTotalPnL >= globalMaxProfit) {
                    hitGlobalMaxProfit = true;
                    isTradingHaltedForDay = true;
                    triggerReasonForExitAll = "MAX_PROFIT";
                } else if (globalMaxLoss > 0 && currentTotalPnL <= -globalMaxLoss) {
                    hitGlobalMaxLoss = true;
                    isTradingHaltedForDay = true;
                    triggerReasonForExitAll = "MAX_LOSS";
                }


                let anyLegHitSlPast = dailyBreakdownMap[dateStr].tradesList.some(t => t.exitType === "STOPLOSS" || t.exitType === "SL_MOVED_TO_COST");
                let anyLegHitSlThisTick = false;


                // 🔥 V-SHAPE RECOVERY UPGRADE: Check if user wants independent trailing
                let isSlMovedToCostGlobal = false;

                // Pata karo ki kya user ne Independent Trailing ON rakhi hai (Frontend se aayega)
                const isIndependent = strategy?.advanceSettings?.independentTrailing === true || strategy?.data?.advanceSettings?.independentTrailing === true;

                if (isIndependent) {
                    // Aggressive Mode: Sirf pakka Loss (STOPLOSS) ya pakka Target (TARGET) aane par hi dusra leg Cost par jayega. Trailing me azaad rahega!
                    isSlMovedToCostGlobal = dailyBreakdownMap[dateStr].tradesList.some(t =>
                        ["STOPLOSS", "TARGET"].includes(t.exitType)
                    );
                } else {
                    // Conservative Mode (Default): Kisi bhi wajah se leg kata (Trailing, Lock etc.), to dusra leg Cost par chala jayega.
                    isSlMovedToCostGlobal = dailyBreakdownMap[dateStr].tradesList.some(t =>
                        ["STOPLOSS", "SL_MOVED_TO_COST", "TRAILING_SL", "TARGET", "LOCK_FIX_PROFIT", "LOCK_AND_TRAIL"].includes(t.exitType)
                    );
                }


                openTrades.forEach((trade, idx) => {
                    if (trade.markedForExit) return;

                    // 🔥 FIX 2: Realistic MTM Exit Price (No fake math that breaks multi-leg!)
                    if (hitGlobalMaxProfit || hitGlobalMaxLoss) {
                        trade.markedForExit = true;
                        trade.exitReason = hitGlobalMaxProfit ? "MAX_PROFIT" : "MAX_LOSS";
                        trade.exitPrice = trade.currentPrice;
                        return;
                    }

                    const legData = trade.legConfig;
                    const slValue = Number(legData.slValue || 0);
                    const slType = legData.slType || "Points";
                    const tpValue = Number(legData.tpValue || 0);
                    const tpType = legData.tpType || "Points";

                    let slPrice = 0, tpPrice = 0;
                    let isSlMovedToCost = false;

                    if (advanceFeaturesSettings.moveSLToCost && isSlMovedToCostGlobal) {
                        isSlMovedToCost = true;
                    }

                    if (trade.transaction === "BUY") {
                        if (isSlMovedToCost) slPrice = trade.entryPrice;
                        else slPrice = slType === "Points" ? trade.entryPrice - slValue : trade.entryPrice * (1 - slValue / 100);
                        tpPrice = tpType === "Points" ? trade.entryPrice + tpValue : trade.entryPrice * (1 + tpValue / 100);
                    } else {
                        if (isSlMovedToCost) slPrice = trade.entryPrice;
                        else slPrice = slType === "Points" ? trade.entryPrice + slValue : trade.entryPrice * (1 + slValue / 100);
                        tpPrice = tpType === "Points" ? trade.entryPrice - tpValue : trade.entryPrice * (1 - tpValue / 100);
                    }

                    // ==============================================================
                    // 🎯 ADVANCE FEATURE: TRAIL SL (Sniper Guard)
                    // ==============================================================
                    let isLegTrailed = false;
                    if (advanceFeaturesSettings.trailSL && !isSlMovedToCost) {
                        const trailConfig = advanceFeaturesSettings.trailSLConfig || {};
                        const initialSL = slPrice;

                        const newTrailedSL = calculateTrailedSL(
                            trade.transaction,
                            trade.entryPrice,
                            initialSL,
                            trade.currentPrice, // Current LTP of the leg
                            trailConfig,
                            trade.currentTrailedSL
                        );

                        trade.currentTrailedSL = newTrailedSL;
                        slPrice = newTrailedSL; // 🔥 Override main SL price!

                        if (newTrailedSL !== initialSL) isLegTrailed = true;
                    }
                    // ==============================================================

                    let spotTriggeredSl = false;
                    let spotTriggeredTp = false;

                    if (isOptionsTrade && trade.optionConfig) {
                        const optType = trade.optionConfig.type;
                        const entrySpot = trade.optionConfig.strike;
                        const assumedDelta = 0.5;
                        const slGap = Math.abs(slPrice - trade.entryPrice);
                        const tpGap = Math.abs(tpPrice - trade.entryPrice);
                        const reqSpotMoveSl = slGap / assumedDelta;
                        const reqSpotMoveTp = tpGap / assumedDelta;

                        if (trade.transaction === "BUY") {
                            if (optType === "CE") {
                                if (slValue > 0 && spotClosePrice <= entrySpot - reqSpotMoveSl) spotTriggeredSl = true;
                                if (tpValue > 0 && spotClosePrice >= entrySpot + reqSpotMoveTp) spotTriggeredTp = true;
                            } else {
                                if (slValue > 0 && spotClosePrice >= entrySpot + reqSpotMoveSl) spotTriggeredSl = true;
                                if (tpValue > 0 && spotClosePrice <= entrySpot - reqSpotMoveTp) spotTriggeredTp = true;
                            }
                        } else {
                            if (optType === "CE") {
                                if (slValue > 0 && spotClosePrice >= entrySpot + reqSpotMoveSl) spotTriggeredSl = true;
                                if (tpValue > 0 && spotClosePrice <= entrySpot - reqSpotMoveTp) spotTriggeredTp = true;
                            } else {
                                if (slValue > 0 && spotClosePrice <= entrySpot - reqSpotMoveSl) spotTriggeredSl = true;
                                if (tpValue > 0 && spotClosePrice >= entrySpot + reqSpotMoveTp) spotTriggeredTp = true;
                            }
                        }

                        // 🔥 THE SMC SPOT SL OVERRIDE (Super Accurate Risk Management) 🔥
                        if (trade.spotSlPrice && trade.spotSlPrice > 0) {
                            
                            // A. पुराने Delta वाले SL को रीसेट कर दो (क्योंकि SMC में Delta SL काम का नहीं है)
                            spotTriggeredSl = false; 

                            // B. अपना नया SMC Spot Chart वाला SL लगाओ
                            if (optType === "CE" && spotClosePrice <= trade.spotSlPrice) {
                                spotTriggeredSl = true; // CALL के लिए: Spot अगर SL लाइन से नीचे गिरा
                            }
                            if (optType === "PE" && spotClosePrice >= trade.spotSlPrice) {
                                spotTriggeredSl = true; // PUT के लिए: Spot अगर SL लाइन से ऊपर गया
                            }
                        }
                    }

                    // 🔥 THE FIX: Added isLegTrailed condition
                    // 🔥 THE ULTIMATE PNL & SL FIX 🔥
                    let isNormalSlHit = false;
                    
                    // अगर UI में SL 0 से ज्यादा है या फिर Trailing/Cost SL एक्टिव है, तभी Premium का Low/High चेक करो!
                    if (slValue > 0 || isSlMovedToCost || isLegTrailed) {
                        if (trade.transaction === "BUY" && trade.currentLow <= slPrice) isNormalSlHit = true;
                        if (trade.transaction === "SELL" && trade.currentHigh >= slPrice) isNormalSlHit = true;
                    }

                    if (spotTriggeredSl || isNormalSlHit) {
                        trade.markedForExit = true;
                        trade.exitReason = isSlMovedToCost ? "SL_MOVED_TO_COST" : (isLegTrailed ? "LEG_TRAIL_SL" : "STOPLOSS");
                        
                        // 🔥 THE 0.00 PnL KILLER: अगर SMC का Spot SL हिट हुआ है, तो एग्जिट प्राइस में कैंडल का रियल क्लोज़ भाव डालो!
                        if (spotTriggeredSl && !isSlMovedToCost && !isLegTrailed) {
                            trade.exitPrice = trade.currentPrice; // ✅ FIX: currentPrice use karna hai
                        } else {
                            trade.exitPrice = slPrice; 
                        }
                        
                        triggerReasonForExitAll = trade.exitReason;
                    }

                    if (tpValue > 0 && !trade.markedForExit) {
                        if (spotTriggeredTp || (trade.transaction === "BUY" && trade.currentHigh >= tpPrice) || (trade.transaction === "SELL" && trade.currentLow <= tpPrice)) {
                            trade.markedForExit = true; trade.exitReason = "TARGET"; trade.exitPrice = tpPrice;
                            triggerReasonForExitAll = "TARGET";
                        }
                    }

                    if (!trade.markedForExit) {
                        const tslResult = evaluateTrailingSL(trade, trade.openPnL, riskSettings, trade.quantity);
                        if (tslResult.isModified) trade.trailingSL = tslResult.newTrailingSL;

                        if (trade.trailingSL) {
                            if ((trade.transaction === "BUY" && trade.currentLow <= trade.trailingSL) || (trade.transaction === "SELL" && trade.currentHigh >= trade.trailingSL)) {
                                trade.markedForExit = true;

                                // 🔥 THE FIX: State bhoolne ki problem khatam! Direct Strategy settings se naam uthao.
                                if (riskSettings.profitTrailing === 'Lock Fix Profit') {
                                    trade.exitReason = "LOCK_FIX_PROFIT";
                                } else if (riskSettings.profitTrailing === 'Lock and Trail') {
                                    trade.exitReason = "LOCK_AND_TRAIL";
                                } else {
                                    trade.exitReason = "TRAILING_SL";
                                }

                                trade.exitPrice = trade.trailingSL;
                                triggerReasonForExitAll = trade.exitReason;
                            }
                        }
                    }

                    if (!trade.markedForExit) {
                        if ((trade.signalType === "LONG" && exitLongSignal) || (trade.signalType === "SHORT" && exitShortSignal)) {
                            trade.markedForExit = true; trade.exitReason = "INDICATOR_EXIT"; trade.exitPrice = trade.currentPrice;
                        }
                    }
                });


                let remainingTrades = [];
                let pendingMTMExits = []; // MTM ke kachre ko hold karega
                let confirmedOtherExits = []; // Pakke trades hold karega
                
                for (let trade of openTrades) {
                    
                    // 🔥 THE UNIVERSAL EXIT CHECK (MIS, BTST, CNC)
                    let forceSquareOff = false;
                    
                    if (orderType === "MIS") {
                        if (isExitTime || isLastCandleOfDay) forceSquareOff = true;
                    } 
                    else if (orderType === "BTST") {
                        // BTST Logic: Check if we have crossed into the "Next Day"
                        const tradeEntryDate = trade.entryTime.split(' ')[0]; // Format: DD/MM/YYYY
                        const currentDateFormatted = dateStr.split('-').reverse().join('/');
                        
                        if (currentDateFormatted !== tradeEntryDate) {
                            // Bhai, kal subah ho gayi hai! Ab Next Day Square Off Time check karo
                            if (timeInMinutes >= nextDayExitMin || isLastCandleOfDay) {
                                forceSquareOff = true;
                                trade.exitReason = "BTST_EXIT";
                            }
                        }
                        // Note: Agar aaj hi ka din hai (currentDateFormatted === tradeEntryDate), toh EOD par nahi katega!
                    } 
                    else if (orderType === "CNC") {
                        let actualTradeExpiryStr = "";
                        const expMatch = trade.symbol.match(/(?:Upcoming )?(EXP \d{2}[A-Z]{3}\d{2})/i);

                        if (expMatch && expMatch[1]) {
                            actualTradeExpiryStr = expMatch[1]; 
                        } else {
                            actualTradeExpiryStr = getNearestExpiryString(dateStr, upperSymbol, trade.legConfig?.expiry || "WEEKLY");
                        }

                        const tradeDTE = getTradingDaysToExpiry(istDate, actualTradeExpiryStr);

                        if (tradeDTE <= cncExitDays && isExitTime) forceSquareOff = true;
                        else if (tradeDTE <= 0 && isLastCandleOfDay) forceSquareOff = true; 
                        else if (isExitTime && trade.exitReason) forceSquareOff = true; 
                    }

                    // 🔥 PURANI LINE KO ISSE REPLACE KAREIN 👇
                    if (trade.markedForExit || forceSquareOff) {
                        if (!trade.markedForExit) {
                            trade.markedForExit = true; // 🚨 YEH MISSING THA! Iske bina engine ghum gaya tha!
                            // 🛡️ TAG PROTECTOR: Agar pehle se BTST_EXIT tag nahi hai, tabhi TIME_SQUAREOFF lagao
                            if (!trade.exitReason) {
                                trade.exitReason = isLastCandleOfDay ? "EOD_SQUAREOFF" : "TIME_SQUAREOFF";
                            }
                        }

                        // =========================================================================
                        // 🔴 THE SNIPER GATEKEEPER
                        // =========================================================================
                        const needsMarketPrice = ["MAX_LOSS", "MAX_PROFIT", "TIME_SQUAREOFF", "EOD_SQUAREOFF", "BTST_EXIT", "INDICATOR_EXIT", "STOPLOSS", "TARGET", "TRAILING_SL", "SL_MOVED_TO_COST", "LOCK_FIX_PROFIT", "LOCK_AND_TRAIL", "LEG_TRAIL_SL"].includes(trade.exitReason) || String(trade.exitReason).startsWith("EXIT_ALL");
                        let fakeTriggerRejected = false;

                        if (isOptionsTrade && broker && needsMarketPrice && trade.optionConfig) {
                            const fixedStrike = Number(trade.optionConfig.strike);
                            const optType = trade.optionConfig.type;
                            const exitTimeStr = `${h}:${m}`;
                            const cacheKey = `${fixedStrike}_${optType}_${dateStr}`;

                            let exitData = null;
                            let actualExitIndex = -1;
                            let foundExactExit = false;

                            if (optionDataCache[cacheKey]) {
                                let cachedChart = optionDataCache[cacheKey];
                                for (let k = 0; k < cachedChart.timestamp.length; k++) {
                                    const optTime = new Date(cachedChart.timestamp[k] * 1000 + (5.5 * 3600000));
                                    if (optTime.toISOString().split('T')[1].substring(0, 5) === exitTimeStr) {
                                        if (cachedChart.strike && Number(cachedChart.strike[k]) === fixedStrike) {
                                            actualExitIndex = k;
                                            exitData = cachedChart;
                                            foundExactExit = true;
                                        }
                                        break;
                                    }
                                }
                            }

                            if (!foundExactExit) {
                                const axios = require('axios');
                                const https = require('https');

                                const keepAliveAgent = new https.Agent({ keepAlive: true, rejectUnauthorized: false });
                                const ghostHeaders = {
                                    'access-token': broker.apiSecret,
                                    'client-id': broker.clientId,
                                    'Content-Type': 'application/json',
                                    'User-Agent': 'Mozilla/5.0',
                                    'Accept': 'application/json',
                                    'Connection': 'keep-alive'
                                };

                                let reqExpiry = autoCorrectExpiryType(upperSymbol, dateStr, trade.legConfig.expiry || "WEEKLY");
                                let expFlag = "WEEK"; let expCode = 1;
                                if (reqExpiry.toUpperCase() === "MONTHLY") { expFlag = "MONTH"; expCode = 1; }
                                else if (reqExpiry.toUpperCase() === "NEXT WEEKLY" || reqExpiry.toUpperCase() === "NEXT WEEK") { expFlag = "WEEK"; expCode = 2; }

                                const dynamicOptExchange = (Number(spotSecurityId) === 51 || Number(spotSecurityId) === 69) ? "BSE_FNO" : "NSE_FNO";

                                const basePayload = {
                                    exchangeSegment: dynamicOptExchange, 
                                    interval: "1", 
                                    securityId: Number(spotSecurityId), 
                                    instrument: "OPTIDX",
                                    expiryFlag: expFlag, expiryCode: expCode,
                                    drvOptionType: optType === "CE" ? "CALL" : "PUT",
                                    requiredData: ["open", "high", "low", "close", "strike"],
                                    fromDate: dateStr, toDate: dateStr
                                };

                                // const stepSize = (upperSymbol.includes("BANK") || upperSymbol.includes("SENSEX")) ? 100 : 50;

                                const stepSize = getStrikeStepSize(upperSymbol);

                                let dhanActualAtm = null;

                                try {
                                    await delay(250);
                                    const atmRes = await axios.post('https://api.dhan.co/v2/charts/rollingoption', { ...basePayload, strike: "ATM" }, {
                                        headers: ghostHeaders,
                                        httpsAgent: keepAliveAgent,
                                        timeout: 8000
                                    });

                                    const optKey = optType === "CE" ? "ce" : "pe";
                                    let atmExitData = atmRes.data && atmRes.data.data ? atmRes.data.data[optKey] : null;

                                    if (atmExitData && atmExitData.timestamp) {
                                        for (let k = 0; k < atmExitData.timestamp.length; k++) {
                                            const optTime = new Date(atmExitData.timestamp[k] * 1000 + (5.5 * 3600000));
                                            if (optTime.toISOString().split('T')[1].substring(0, 5) === exitTimeStr) {
                                                dhanActualAtm = Number(atmExitData.strike[k]);
                                                if (dhanActualAtm === fixedStrike) {
                                                    exitData = atmExitData;
                                                    actualExitIndex = k;
                                                    foundExactExit = true;
                                                    optionDataCache[cacheKey] = exitData;
                                                }
                                                break;
                                            }
                                        }
                                    }
                                } catch (e) {
                                    console.log(`⚠️ Anchor ATM fetch failed. Using Fallback Spot math.`);
                                }

                                if (!foundExactExit) {
                                    const referenceAtm = dhanActualAtm ? dhanActualAtm : calculateATM(spotClosePrice, upperSymbol);
                                    const strikeDiff = fixedStrike - referenceAtm;
                                    const exactStep = Math.round(strikeDiff / stepSize);

                                    let candidates = [
                                        `ITM${exactStep}`,
                                        `ITM${exactStep + 1}`,
                                        `ITM${exactStep - 1}`
                                    ];

                                    let retryCount = 0;
                                    for (let c = 0; c < candidates.length; c++) {
                                        let guess = candidates[c];
                                        await delay(300);

                                        try {
                                            const exitRes = await axios.post('https://api.dhan.co/v2/charts/rollingoption', { ...basePayload, strike: guess }, {
                                                headers: ghostHeaders,
                                                httpsAgent: keepAliveAgent,
                                                timeout: 8000
                                            });

                                            retryCount = 0;

                                            const optKey = optType === "CE" ? "ce" : "pe";
                                            let tempExitData = exitRes.data && exitRes.data.data ? exitRes.data.data[optKey] : null;

                                            if (tempExitData && tempExitData.timestamp) {
                                                let tempIndex = -1;
                                                for (let k = 0; k < tempExitData.timestamp.length; k++) {
                                                    const optTime = new Date(tempExitData.timestamp[k] * 1000 + (5.5 * 3600000));
                                                    if (optTime.toISOString().split('T')[1].substring(0, 5) === exitTimeStr) { tempIndex = k; break; }
                                                }

                                                if (tempIndex !== -1 && tempExitData.strike && Number(tempExitData.strike[tempIndex]) === fixedStrike) {
                                                    exitData = tempExitData;
                                                    actualExitIndex = tempIndex;
                                                    foundExactExit = true;
                                                    optionDataCache[cacheKey] = exitData;
                                                    break;
                                                }
                                            }
                                        } catch (e) {
                                            const status = e.response ? e.response.status : 0;
                                            if (status === 429 || status === 0 || status >= 500 || (e.response && e.response.data && e.response.data.errorCode === 'DH-904')) {
                                                if (retryCount < 1) {
                                                    await delay(3000);
                                                    retryCount++;
                                                    c--;
                                                    continue;
                                                }
                                            }
                                            retryCount = 0;
                                        }
                                    }
                                }
                            }

                            if (foundExactExit && exitData) {
                                const mathPrice = trade.exitPrice;
                                const cOpen = exitData.open[actualExitIndex];
                                const cHigh = exitData.high[actualExitIndex];
                                const cLow = exitData.low[actualExitIndex];
                                const cClose = exitData.close[actualExitIndex];

                                let isValidTrigger = true;
                                if (["STOPLOSS", "TRAILING_SL", "SL_MOVED_TO_COST", "LOCK_FIX_PROFIT", "LOCK_AND_TRAIL", "LEG_TRAIL_SL"].includes(trade.exitReason)) {
                                    if (trade.transaction === "BUY" && cLow > mathPrice) isValidTrigger = false;
                                    if (trade.transaction === "SELL" && cHigh < mathPrice) isValidTrigger = false;
                                } else if (trade.exitReason === "TARGET") {
                                    if (trade.transaction === "BUY" && cHigh < mathPrice) isValidTrigger = false;
                                    if (trade.transaction === "SELL" && cLow > mathPrice) isValidTrigger = false;
                                }

                                let isFlatline = false;
                                if (["TIME_SQUAREOFF", "EOD_SQUAREOFF"].includes(trade.exitReason)) {
                                    if (cOpen === trade.entryPrice || cClose === trade.entryPrice) {
                                        isFlatline = true;
                                    }
                                }

                                if (!isValidTrigger || isFlatline) {
                                    fakeTriggerRejected = true;
                                } else {
                                    // 🔥 THE MASTER FIX: PURE API PRICE FOR GLOBAL LIMITS 🔥
                                    if (["MAX_LOSS", "MAX_PROFIT"].includes(trade.exitReason)) {
                                        // MTM limits hamesha TIME_SQUAREOFF ki tarah exact real candle price par katenge, no fallback math!
                                        trade.exitPrice = cOpen; 
                                    }
                                    else if (["STOPLOSS", "TARGET", "TRAILING_SL", "SL_MOVED_TO_COST", "LOCK_FIX_PROFIT", "LOCK_AND_TRAIL", "LEG_TRAIL_SL"].includes(trade.exitReason)) {
                                        if (!useRealisticSlippage) {
                                            trade.exitPrice = cOpen; 
                                        } else {
                                            if (trade.transaction === "BUY") {
                                                if (["STOPLOSS", "TRAILING_SL", "SL_MOVED_TO_COST", "LOCK_FIX_PROFIT", "LOCK_AND_TRAIL", "LEG_TRAIL_SL"].includes(trade.exitReason) && cOpen < mathPrice) trade.exitPrice = cOpen;
                                                else if (trade.exitReason === "TARGET" && cOpen > mathPrice) trade.exitPrice = cOpen;
                                                else trade.exitPrice = mathPrice; 
                                            } else { 
                                                if (["STOPLOSS", "TRAILING_SL", "SL_MOVED_TO_COST", "LOCK_FIX_PROFIT", "LOCK_AND_TRAIL", "LEG_TRAIL_SL"].includes(trade.exitReason) && cOpen > mathPrice) trade.exitPrice = cOpen;
                                                else if (trade.exitReason === "TARGET" && cOpen < mathPrice) trade.exitPrice = cOpen;
                                                else trade.exitPrice = mathPrice; 
                                            }
                                        }
                                    } else {
                                        trade.exitPrice = (trade.exitReason === "TIME_SQUAREOFF" || trade.exitReason === "BTST_EXIT" || String(trade.exitReason).startsWith("EXIT_ALL")) ? cOpen : cClose;
                                    }
                                }
                            }

                            if (fakeTriggerRejected) {
                                if (isExitTime || isLastCandleOfDay) {
                                    trade.exitReason = isLastCandleOfDay ? "EOD_SQUAREOFF" : "TIME_SQUAREOFF";
                                    trade.exitPrice = null;
                                    foundExactExit = false;
                                } else {
                                    trade.markedForExit = false;
                                    trade.exitReason = null;
                                    trade.exitPrice = null;
                                    remainingTrades.push(trade);
                                    continue;
                                }
                            }



                                if (!foundExactExit) {
                                // 🔥 THE FIX: Zombie Bug Killed! Removed the 'else' block that was rejecting Max Loss!
                                if (["MAX_LOSS", "MAX_PROFIT", "STOPLOSS", "TARGET", "TRAILING_SL", "SL_MOVED_TO_COST", "LOCK_FIX_PROFIT", "LOCK_AND_TRAIL", "LEG_TRAIL_SL"].includes(trade.exitReason)) {
                                    if (isExitTime || isLastCandleOfDay) {
                                        trade.exitReason = isLastCandleOfDay ? "EOD_SQUAREOFF" : "TIME_SQUAREOFF";
                                        trade.exitPrice = null;
                                    }
                                    // Chupchap aage badho aur Math Fallback se exitPrice nikalo! (No Else Block)
                                }


                                if (!trade.exitPrice) {
                                    const currentAtmAtFallback = calculateATM(spotClosePrice, upperSymbol);

                                    // let stepSize = 50; let decayFactor = 1.10; let baseMultiplier = 0.0125;
                                    // if (upperSymbol.includes("BANK") || upperSymbol.includes("SENSEX")) {
                                    //     stepSize = 100; decayFactor = 1.15; baseMultiplier = 0.013;
                                    // } else if (upperSymbol.includes("MID")) {
                                    //     stepSize = 25; decayFactor = 1.08; baseMultiplier = 0.012;
                                    // }

                                    // 🔥 NAYA FIX: Centralized function se Step Size liya gaya
                                    const stepSize = getStrikeStepSize(upperSymbol); 
                                    
                                    // Baki ke default Fallback Multipliers (decay aur base) waise hi rahenge
                                    let decayFactor = 1.10; 
                                    let baseMultiplier = 0.0125;
                                    
                                    if (upperSymbol.includes("BANK") || upperSymbol.includes("SENSEX")) {
                                        decayFactor = 1.15; baseMultiplier = 0.013;
                                    } else if (upperSymbol.includes("MID")) {
                                        decayFactor = 1.08; baseMultiplier = 0.012;
                                    }

                                    const stepDiff = Math.round(Math.abs(fixedStrike - currentAtmAtFallback) / stepSize);

                                    // 🔥 THE AGGRESSIVE WORST-CASE ESTIMATOR (For Final Exit Price)
                                    let worstSpot = spotClosePrice;
                                    if (candle.high && candle.low) {
                                        if (trade.transaction === "SELL") {
                                            worstSpot = optType === "CE" ? parseFloat(candle.high) : parseFloat(candle.low);
                                        } else {
                                            worstSpot = optType === "CE" ? parseFloat(candle.low) : parseFloat(candle.high);
                                        }
                                    }

                                    let intrinsicValue = 0;
                                    if (optType === "CE") intrinsicValue = Math.max(0, worstSpot - fixedStrike);
                                    else intrinsicValue = Math.max(0, fixedStrike - worstSpot);

                                    let dte = 0;


                                    try {
                                        const expMatch = trade.symbol.match(/EXP (\d{2}[A-Z]{3}\d{2})/i);
                                        if (expMatch && expMatch[1]) {
                                            const expDay = parseInt(expMatch[1].substring(0, 2));
                                            const monthStr = expMatch[1].substring(2, 5);
                                            const expYear = parseInt("20" + expMatch[1].substring(5, 7));
                                            const monthMap = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
                                            const expDateObj = new Date(expYear, monthMap[monthStr.toUpperCase()], expDay, 15, 30, 0);

                                            const diffTime = expDateObj.getTime() - istDate.getTime();
                                            dte = Math.max(0, diffTime / (1000 * 60 * 60 * 24));
                                        }
                                    } catch (e) { dte = 1; }

                                    let estimatedAtmPremium = 0;
                                    if (dte >= 1) {
                                        estimatedAtmPremium = spotClosePrice * baseMultiplier * Math.sqrt(dte / 7);
                                    } else {
                                        const minutesLeft = Math.max(0, 930 - timeInMinutes);
                                        estimatedAtmPremium = spotClosePrice * (baseMultiplier / 2) * Math.sqrt(minutesLeft / 375);
                                    }

                                    const estimatedTimeValue = estimatedAtmPremium / Math.pow(decayFactor, stepDiff);
                                    trade.exitPrice = intrinsicValue + estimatedTimeValue;
                                }
                            }
                        }

                        // 🔥 INSTEAD OF DIRECT EXECUTION, SORT THEM FOR REALITY CHECK 🔥
                        if (trade.exitReason === "MAX_LOSS" || trade.exitReason === "MAX_PROFIT") {
                            pendingMTMExits.push(trade);
                        } else {
                            confirmedOtherExits.push(trade);
                        }
                    } else {
                        remainingTrades.push(trade);
                    }
                } // <-- End of Gatekeeper Loop

                // 🛡️ THE REALITY CHECKER (False Alarm Canceller) 🛡️
                if (pendingMTMExits.length > 0) {
                    let actualCombinedPnL = dailyBreakdownMap[dateStr].pnl;
                    pendingMTMExits.forEach(t => {
                        actualCombinedPnL += calcTradePnL(t.entryPrice, t.exitPrice, t.quantity, t.transaction);
                    });

                    let isRealBreach = false;
                    if (pendingMTMExits[0].exitReason === "MAX_PROFIT" && globalMaxProfit > 0 && actualCombinedPnL >= globalMaxProfit) isRealBreach = true;
                    if (pendingMTMExits[0].exitReason === "MAX_LOSS" && globalMaxLoss > 0 && actualCombinedPnL <= -globalMaxLoss) isRealBreach = true;
                    if (isExitTime || isLastCandleOfDay) isRealBreach = true; // EOD pe toh katna hi hai

                    if (isRealBreach) {
                        confirmedOtherExits.push(...pendingMTMExits);
                    } else {
                        // 🟢 JADOO: Agar MTM ne fake alarm bajaya, toh use CANCEL karo aur trades wapas chalu karo!
                        console.log(`🛡️ [FALSE ALARM REJECTED] MTM Hallucinated. Real PnL is ${actualCombinedPnL.toFixed(2)}. Resuming trades...`);
                        pendingMTMExits.forEach(t => {
                            t.markedForExit = false;
                            t.exitReason = null;
                            t.exitPrice = null;
                            remainingTrades.push(t);
                        });
                        isTradingHaltedForDay = false; // Engine on karo wapas!
                    }
                }

                // 🎯 EXECUTE CONFIRMED TRADES
                confirmedOtherExits.forEach(trade => {
                    const pnl = calcTradePnL(trade.entryPrice, trade.exitPrice, trade.quantity, trade.transaction);
                    
                    const completedTrade = {
                        ...trade,
                        exitTime: `${dateStr.split('-').reverse().join('/')} ${h}:${m}:00`,
                        pnl: pnl,
                        exitType: trade.exitReason
                    };

                    if (advanceFeaturesSettings.reEntryExecute) {
                        const reConfig = advanceFeaturesSettings.reEntryExecuteConfig || {};
                        if (["STOPLOSS", "LEG_TRAIL_SL", "SL_MOVED_TO_COST"].includes(trade.exitReason)) {
                            const currentCycle = trade.reEntryCycle || 0;
                            if (currentCycle < Number(reConfig.cycles || 0)) {
                                pendingReEntries.push({
                                    ...trade,
                                    reEntryCycle: currentCycle + 1,
                                    reEntryConfig: reConfig,
                                    originalEntryPrice: trade.entryPrice
                                });
                                console.log(`🚑 [HOSPITAL] Leg ${trade.symbol} sent to recovery | Cycle: ${currentCycle + 1}/${reConfig.cycles}`);
                            }
                        }
                    }

                    dailyBreakdownMap[dateStr].tradesList.push(completedTrade);
                    dailyBreakdownMap[dateStr].pnl += pnl;
                    dailyBreakdownMap[dateStr].trades += 1;
                    if (pnl > 0) { winTrades++; if (pnl > maxProfitTrade) maxProfitTrade = pnl; }
                    else { lossTrades++; if (pnl < maxLossTrade) maxLossTrade = pnl; }

                    console.log(`🎯 [${completedTrade.exitType}] Date: ${dateStr} | Time: ${h}:${m} | Symbol: ${trade.symbol} | Exit: ${trade.exitPrice.toFixed(2)} | PnL: ${pnl.toFixed(2)}`);
                });

                openTrades = remainingTrades;

                // 🔥 NEW BULLETPROOF EXIT ALL LOGIC (Post-Gatekeeper)
                // Ye tabhi trigger hoga jab Sniper Gatekeeper kisi leg ko sach me kaat dega
                const advanceData = advanceFeaturesSettings;
                const isExitAllEnabled = advanceData?.exitAllOnSLTgt === true || advanceData?.exitAllOnSlTgt === true || advanceData?.exitAllOnSLTgt === 'ON';

                if (isExitAllEnabled && openTrades.length > 0 && !hitGlobalMaxProfit && !hitGlobalMaxLoss) {
                    const confirmedTriggers = ["STOPLOSS", "TARGET", "TRAILING_SL", "LOCK_FIX_PROFIT", "LOCK_AND_TRAIL", "LEG_TRAIL_SL"];
                    let actualTriggerReason = null;

                    // Check karo ki kya isi minute me Sniper Gatekeeper ne sach me koi SL/Target confirm kiya hai?
                    const currentMinute = `${h}:${m}:00`;
                    for (let i = dailyBreakdownMap[dateStr].tradesList.length - 1; i >= 0; i--) {
                        const t = dailyBreakdownMap[dateStr].tradesList[i];
                        if (t.exitTime === currentMinute && confirmedTriggers.includes(t.exitType)) {
                            actualTriggerReason = t.exitType;
                            break;
                        }
                    }



                    // Agar SL/Target 100% confirm ho gaya hai, tabhi baki bache hue legs ko (Exit All) maaro
                    if (actualTriggerReason) {
                        for (let trade of openTrades) {
                            let exitP = trade.currentOpen; // Default math/fallback

                            // =========================================================================
                            // 🔥 THE FIX: EXACT STRIKE PREMIUM FETCH FOR VICTIM LEGS
                            // Rolling chart ki jagah asli strike (e.g. 23850) ka exact premium fetch karo
                            // =========================================================================
                            if (isOptionsTrade && broker && trade.optionConfig) {
                                try {
                                    const axios = require('axios');
                                    let expFlag = "WEEK"; let expCode = 1;
                                    let reqExpiry = autoCorrectExpiryType(upperSymbol, dateStr, trade.legConfig.expiry || "WEEKLY");
                                    if (reqExpiry.toUpperCase() === "MONTHLY") { expFlag = "MONTH"; }
                                    else if (reqExpiry.toUpperCase() === "NEXT WEEKLY" || reqExpiry.toUpperCase() === "NEXT WEEK") { expCode = 2; }

                                    const fixedStrike = Number(trade.optionConfig.strike);

                                    // const stepSize = (upperSymbol.includes("BANK") || upperSymbol.includes("SENSEX")) ? 100 : 50;

                                    const stepSize = getStrikeStepSize(upperSymbol);

                                    const referenceAtm = calculateATM(spotClosePrice, upperSymbol);

                                    // Calculate ITM/OTM steps based on current Spot ATM
                                    const strikeDiff = fixedStrike - referenceAtm;
                                    const exactStep = Math.round(strikeDiff / stepSize);

                                    // Dhan ke format me strike guesses (e.g., ITM1, ITM0) banayenge
                                    let candidates = [`ITM${exactStep}`, `ITM${exactStep + 1}`, `ITM${exactStep - 1}`];

                                    const basePayload = {
                                        exchangeSegment: "NSE_FNO", interval: "1", securityId: Number(spotSecurityId), instrument: "OPTIDX",
                                        expiryFlag: expFlag, expiryCode: expCode,
                                        drvOptionType: trade.optionConfig.type === "CE" ? "CALL" : "PUT",
                                        requiredData: ["open", "close", "strike"],
                                        fromDate: dateStr, toDate: dateStr
                                    };

                                    let exactPriceFound = false;

                                    for (let c = 0; c < candidates.length; c++) {
                                        if (exactPriceFound) break;
                                        let guess = candidates[c];

                                        const res = await axios.post('https://api.dhan.co/v2/charts/rollingoption', { ...basePayload, strike: guess }, {
                                            headers: { 'access-token': broker.apiSecret, 'client-id': broker.clientId, 'Content-Type': 'application/json' },
                                            timeout: 5000
                                        });

                                        const optKey = trade.optionConfig.type === "CE" ? "ce" : "pe";
                                        if (res.data && res.data.data && res.data.data[optKey]) {
                                            const chart = res.data.data[optKey];
                                            const exitTimeStr = `${h}:${m}`;

                                            for (let k = 0; k < chart.timestamp.length; k++) {
                                                const optTime = new Date(chart.timestamp[k] * 1000 + (5.5 * 3600000));
                                                if (optTime.toISOString().split('T')[1].substring(0, 5) === exitTimeStr) {
                                                    // Verify karo ki Dhan ne sach me exact 23850 hi bheja hai
                                                    if (Number(chart.strike[k]) === fixedStrike) {
                                                        exitP = chart.open[k]; // Bingo! 197.10 mil gaya!
                                                        exactPriceFound = true;
                                                    }
                                                    break;
                                                }
                                            }
                                        }
                                        await new Promise(r => setTimeout(r, 200)); // Thoda sleep API block se bachne ke liye
                                    }
                                } catch (e) {
                                    console.log(`⚠️ Exact exit fetch failed for ${trade.symbol}, using fallback.`);
                                }
                            }
    


                            const pnl = calcTradePnL(trade.entryPrice, exitP, trade.quantity, trade.transaction);

                            const forcedTrade = {
                                ...trade,
                                exitTime: `${dateStr.split('-').reverse().join('/')} ${currentMinute}`,
                                exitPrice: exitP,
                                pnl: pnl,
                                exitType: `EXIT_ALL_TRIGGERED_BY_${actualTriggerReason}`
                            };

                            dailyBreakdownMap[dateStr].tradesList.push(forcedTrade);
                            dailyBreakdownMap[dateStr].pnl += pnl;
                            dailyBreakdownMap[dateStr].trades += 1;

                            if (pnl > 0) { winTrades++; if (pnl > maxProfitTrade) maxProfitTrade = pnl; }
                            else { lossTrades++; if (pnl < maxLossTrade) maxLossTrade = pnl; }
                        }

                        openTrades = []; // Saare legs khatam, dukaan band!
                    }
                }

            }
            else if (!isTradingHaltedForDay) {
                const mtmResult = evaluateMtmLogic(dailyBreakdownMap[dateStr].pnl, 0, riskSettings);
                if (mtmResult.isHalted) {
                    isTradingHaltedForDay = true;
                    console.log(mtmResult.logMessage);
                }
            }


            // =========================================================
            // 🏥 1.5 HOSPITAL CHECK (RE-ENTRY LOGIC)
            // =========================================================
            if (advanceFeaturesSettings.reEntryExecute && pendingReEntries.length > 0 && !isTradingHaltedForDay && isMarketOpen) {
                let stillPending = [];
                let revivedTrades = [];

                for (let pTrade of pendingReEntries) {
                    const reviveStatus = evaluateReEntryLogic(pTrade, istDate, spotClosePrice);

                    if (reviveStatus.shouldRevive) {
                        console.log(`⚡ [RE-ENTRY] Reviving leg: ${pTrade.symbol} at ₹${reviveStatus.revivePrice.toFixed(2)} | Cycle: ${pTrade.reEntryCycle}`);

                        revivedTrades.push({
                            id: pTrade.id,
                            legConfig: pTrade.legConfig,
                            symbol: pTrade.symbol,
                            transaction: pTrade.transaction,
                            quantity: pTrade.quantity,
                            entryTime: `${dateStr.split('-').reverse().join('/')} ${h}:${m}:00`,
                            entryPrice: reviveStatus.revivePrice,
                            exitTime: null, exitPrice: null, pnl: null, exitType: null,
                            optionConfig: pTrade.optionConfig,
                            premiumChart: pTrade.premiumChart,
                            signalType: pTrade.signalType,
                            lastKnownPremium: reviveStatus.revivePrice,
                            markedForExit: false,
                            currentTrailedSL: null,
                            reEntryCycle: pTrade.reEntryCycle, // Ensure cycle count moves forward
                            entryReason: "Re-Entry" // 🔥 NAYA TAG (Ise Jodna Hai)
                        });
                    } else {
                        stillPending.push(pTrade); // Agar revive nahi hua, toh hospital me hi rehne do
                    }
                }

                pendingReEntries = stillPending;
                if (revivedTrades.length > 0) openTrades.push(...revivedTrades);
            }

            // =========================================================
            // 🔥 2. MULTI-LEG ENTRY LOGIC (Wait & Trade Upgraded)
            // =========================================================
            let shouldAttemptEntry = false;
            let activeSignalType = null;
            let currentEntryReason = "Normal";
            const isWaitAndTradeActive = advanceFeaturesSettings.waitAndTrade === true;
            const waitConfig = advanceFeaturesSettings.waitAndTradeConfig || {};

            // 🔥 THE ROLLOVER FIX: CNC me naya trade lene do, bhale hi purana trade aaj 3:15 pe katne wala ho
            let canTakeNewEntry = openTrades.length === 0 || (orderType !== "MIS" && isTimeBased);

            // 🛑 BTST EXPIRY TRAP BLOCKER 🛑
            // Expiry ke din premium 0.90 ho jata hai aur contract dead ho jata hai. 
            // Dead contract ko kal tak hold nahi kar sakte, isliye aaj entry block kardo!
            if (orderType === "BTST" && currentDTE === 0) {
                canTakeNewEntry = false;
            }

            if (canTakeNewEntry && isMarketOpen && !isTradingHaltedForDay) {

                // 1. Agar naya signal aaya hai
                if (finalLongSignal || finalShortSignal) {
                    if (isWaitAndTradeActive && waitConfig.movement > 0) {
                        if (!dailyBreakdownMap[dateStr].isWaitingForTrade) {
                            dailyBreakdownMap[dateStr].isWaitingForTrade = true;
                            dailyBreakdownMap[dateStr].waitRefPrice = spotClosePrice; // Backtest speed ke liye Spot Price use hoga
                            dailyBreakdownMap[dateStr].waitSignalType = finalLongSignal ? "LONG" : "SHORT";

                            // 🔥 NAYA CONSOLE LOG: 9:45 baje ka exact Spot Price dekhne ke liye
                            console.log(`\n⏳ [WAIT STARTED] Date: ${dateStr} | Time: ${h}:${m} | Ref Spot Price: ₹${spotClosePrice} | Logic: ${waitConfig.type} ${waitConfig.movement}`);
                        }
                    } else {
                        shouldAttemptEntry = true;
                        activeSignalType = finalLongSignal ? "LONG" : "SHORT";

                        // 🔥 THE LINK: स्नाइपर का नाम यहाँ पास कर दो!
                        if (strategy.type === "Price Action Based" || strategy.data?.type === "Price Action Based") {
                            currentEntryReason = sniperTriggerName; 
                        }
                    }
                }

                // 2. Agar hum target ka wait kar rahe hain
                if (dailyBreakdownMap[dateStr].isWaitingForTrade) {
                    const waitStatus = processWaitAndTrade(waitConfig, spotClosePrice, dailyBreakdownMap[dateStr].waitRefPrice);
                    if (waitStatus.shouldExecute) {
                        shouldAttemptEntry = true;
                        activeSignalType = dailyBreakdownMap[dateStr].waitSignalType;
                        currentEntryReason = "Wait & Trade"; // 🔥 NAYA TAG (Ise Jodna Hai)
                        dailyBreakdownMap[dateStr].isWaitingForTrade = false; // Agle trade ke liye reset kardo

                        // 🔥 NAYA CONSOLE LOG: Jab 20 point ka target hit ho jaye
                        console.log(`🎯 [TARGET HIT] Date: ${dateStr} | Time: ${h}:${m} | Trigger Spot: ₹${spotClosePrice} | (Ref was: ₹${dailyBreakdownMap[dateStr].waitRefPrice})`);
                    }
                }
            }

            //3. Asli Entry Loop (Brackets ko protect kiya gaya hai)
            if (shouldAttemptEntry) {
                const isLongSignal = activeSignalType === "LONG";

                let tempPendingTrades = [];
                let tempLtps = [];

                for (let legIndex = 0; legIndex < strategyLegs.length; legIndex++) {
                    const legData = strategyLegs[legIndex];

                    let tradeQuantity = legData.quantity;
                    if (!tradeQuantity || isNaN(tradeQuantity)) tradeQuantity = upperSymbol.includes("BANK") ? 30 : (upperSymbol.includes("NIFTY") ? 50 : 1);

                    const transActionTypeStr = (legData.action || "BUY").toUpperCase();
                    let activeOptionType = "";

                    const isPA = (strategy.type === "Price Action Based" || strategy.data?.type === "Price Action Based");

                    // ==============================================================
                    // 🔥 THE MASTER FIX: STRICT LEG DIRECTION FOR PRICE ACTION
                    // ==============================================================
                    if (isTimeBased || isPA) {
                        // Price Action me ab User ka chuna hua CE/PE hi strictly use hoga (No Dynamic Flip)
                        activeOptionType = (legData.optionType || "Call").toUpperCase().includes("C") ? "CE" : "PE";
                    } else {
                        // Indicator Based me dynamic flip chalta rahega
                        if (transActionTypeStr === "BUY") activeOptionType = isLongSignal ? "CE" : "PE";
                        else if (transActionTypeStr === "SELL") activeOptionType = isLongSignal ? "PE" : "CE";
                    }

                    // 🛡️ THE GATEKEEPER: Signal Direction vs Leg Direction (Sirf Price Action ke liye)
                    if (isPA) {
                        let legDirection = "";
                        // BUY CE = Bullish (LONG), BUY PE = Bearish (SHORT)
                        if (transActionTypeStr === "BUY") legDirection = activeOptionType === "CE" ? "LONG" : "SHORT";
                        // SELL CE = Bearish (SHORT), SELL PE = Bullish (LONG)
                        else legDirection = activeOptionType === "PE" ? "LONG" : "SHORT"; 

                        // 🚫 अगर Signal Bullish है पर आपका Leg Bearish (CE Sell) है, तो इस ट्रेड को ब्लॉक कर दो!
                        if (legDirection !== activeSignalType) {
                            console.log(`⚠️ Signal (${activeSignalType}) ignored! Strategy is built for ${legDirection} (${transActionTypeStr} ${activeOptionType}).`);
                            continue; // सीधा अगली कैंडल/लेग पर जाओ, गलत ट्रेड मत लो!
                        }
                    }

                    let finalEntryPrice = isOptionsTrade ? 0 : spotClosePrice;
                    let validTrade = true;
                    let premiumChartData = null;
                    let targetStrike = calculateATM(spotClosePrice, upperSymbol);
                    const strikeCriteria = legData.strikeCriteria || "ATM pt";
                    const strikeType = legData.strikeType || "ATM";
                    const reqExpiry = autoCorrectExpiryType(upperSymbol, dateStr, legData.expiry || "WEEKLY");

                    // 🔥 THE FIX: Agar CNC trade lene ka din hai, toh targetCncExpiryLabel (Next Expiry) use karo
                    const expiryLabel = (orderType === "CNC" && isCncEntryDay) ? targetCncExpiryLabel : getNearestExpiryString(dateStr, upperSymbol, reqExpiry);
                    let tradeSymbol = `${upperSymbol} ${targetStrike} ${activeOptionType} (${expiryLabel})`;

                    if (isOptionsTrade && broker) {
                        let apiSuccess = false;

                        const targetExpStr = expiryLabel.split('EXP ')[1];
                        const expectedDay = targetExpStr.substring(0, 2);
                        const expectedMonth = targetExpStr.substring(2, 5);
                        const expectedDhanDateStr = `${expectedDay} ${expectedMonth}`;

                        const optionConfig = getOptionSecurityId(upperSymbol, spotClosePrice, strikeCriteria, strikeType, activeOptionType, reqExpiry);

                        if (optionConfig && optionConfig.strike && optionConfig.tradingSymbol.includes(expectedDhanDateStr)) {
                            targetStrike = optionConfig.strike;
                            try {
                                await sleep(500);
                                const optRes = await withRetry(() => fetchDhanHistoricalData(broker.clientId, broker.apiSecret, optionConfig.id, "NSE_FNO", "OPTIDX", dateStr, dateStr, "1"));
                                if (optRes.success && optRes.data && optRes.data.close) {
                                    const exactMatchIndex = optRes.data.start_Time.findIndex(t => {
                                        const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
                                        return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
                                    });
                                    if (isTimeBased) {
                                        finalEntryPrice = exactMatchIndex !== -1 ? optRes.data.open[exactMatchIndex] : optRes.data.open[0];
                                    } else {
                                        finalEntryPrice = exactMatchIndex !== -1 ? optRes.data.close[exactMatchIndex] : optRes.data.close[0];
                                    }
                                    premiumChartData = optRes.data;
                                    apiSuccess = true;
                                }
                            } catch (e) { }
                        }

                        if (!apiSuccess) {
                            try {
                                await sleep(500);
                                const formattedStrikeForRolling = strikeType.replace(/\s+/g, '').toUpperCase();
                                const expRes = await withRetry(() => fetchExpiredOptionData(broker.clientId, broker.apiSecret, spotSecurityId, formattedStrikeForRolling, activeOptionType, dateStr, dateStr, reqExpiry));
                                if (expRes.success && expRes.data && expRes.data.close) {
                                    const exactMatchIndex = expRes.data.start_Time.findIndex(t => {
                                        const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
                                        return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
                                    });
                                    if (isTimeBased) {
                                        finalEntryPrice = exactMatchIndex !== -1 ? expRes.data.open[exactMatchIndex] : expRes.data.open[0];
                                    } else {
                                        finalEntryPrice = exactMatchIndex !== -1 ? expRes.data.close[exactMatchIndex] : expRes.data.close[0];
                                    }
                                    premiumChartData = expRes.data;
                                    apiSuccess = true;
                                }
                            } catch (e) { }
                        }

                        if (!apiSuccess || finalEntryPrice === 0) {
                            validTrade = false;
                            console.log(`❌ Trade Canceled: API failed for ${tradeSymbol} on ${dateStr}`);
                        } else if (finalEntryPrice > spotClosePrice * 0.5) {
                            validTrade = false;
                            console.log(`❌ Trade Canceled: Spot Price returned instead of Premium for ${tradeSymbol}`);
                        }
                    }

                    if (validTrade) {
                        // 🔥 NAYA CODE: Direct openTrades me na daal kar temp memory me rakho
                        tempPendingTrades.push({
                            id: `leg_${legIndex}`,
                            legConfig: legData,
                            symbol: tradeSymbol,
                            transaction: transActionTypeStr,
                            quantity: tradeQuantity,
                            entryTime: `${dateStr.split('-').reverse().join('/')} ${h}:${m}:00`,
                            entryPrice: finalEntryPrice,
                            exitTime: null, exitPrice: null, pnl: null, exitType: null,
                            optionConfig: isOptionsTrade ? { strike: targetStrike, type: activeOptionType } : null,
                            premiumChart: premiumChartData,
                            signalType: finalLongSignal ? "LONG" : "SHORT",
                            lastKnownPremium: finalEntryPrice,
                            markedForExit: false,
                            currentTrailedSL: null,
                            spotSlPrice: currentCandleSniperSignal ? currentCandleSniperSignal.spotSlPrice : 0, // 🔥 SPOT SL SAVE HO GAYA
                            entryReason: currentEntryReason
                        });
                        tempLtps.push(finalEntryPrice);
                    }
                } // <-- Leg Loop yahan khatam hota hai

                // ==============================================================
                // ⚖️ GATEKEEPER: PREMIUM DIFFERENCE CHECK (BACKTEST)
                // ==============================================================
                let isPremiumDiffPassed = true;
                const advSettings = advanceFeaturesSettings || {};

                if (advSettings.premiumDifference && tempLtps.length >= 2) {
                    const maxDiff = Number(advSettings.premiumDifferenceConfig?.premium || 100);
                    const actualDiff = Math.abs(tempLtps[0] - tempLtps[1]);

                    if (actualDiff > maxDiff) {
                        isPremiumDiffPassed = false;
                        console.log(`⚖️ [PREMIUM DIFF BLOCK] Date: ${dateStr} | Time: ${h}:${m} | Diff: ₹${actualDiff.toFixed(2)} > Limit: ₹${maxDiff}`);

                        // 🔥 THE MAGIC: Agar block ho gaya, toh Time Based flag ko wapas false kardo taki agle minute fir try kare!
                        if (isTimeBased) {
                            dailyBreakdownMap[dateStr].hasTradedTimeBased = false;
                        }
                    }
                }

                // Agar Gatekeeper ne pass kar diya, toh finally Trades execute kardo
                if (isPremiumDiffPassed && tempPendingTrades.length > 0) {
                    tempPendingTrades.forEach((trade, idx) => {

                        // 🔥 NAYA CODE: Agar Premium Diff ON tha aur trade execute hua, toh Tag badal do
                        if (advSettings.premiumDifference && trade.entryReason === "Normal") {
                            trade.entryReason = "Premium Diff";
                        }

                        openTrades.push(trade);
                        console.log(`✅ [TRADE OPEN] Leg ${idx + 1} | Time: ${h}:${m} | Spot: ${spotClosePrice} | Premium: ${trade.entryPrice} | Type: ${trade.optionConfig?.type}`);
                    });
                }
            }
        }

        // ==========================================
        // 🧮 5. DAILY LOOP (Metrics Generation)
        // ==========================================
        let totalMarketDays = Object.keys(dailyBreakdownMap).length;

        // 🔥 THE FIX: Reset counters and added breakEvenTrades
        winTrades = 0;
        lossTrades = 0;
        let breakEvenTrades = 0; // ✅ Naya counter 0 PnL ke liye
        maxProfitTrade = 0;
        maxLossTrade = 0;

        for (const [date, data] of Object.entries(dailyBreakdownMap)) {
            currentEquity += data.pnl;
            if (currentEquity > peakEquity) peakEquity = currentEquity;
            const drawdown = currentEquity - peakEquity;
            if (drawdown < maxDrawdown) maxDrawdown = drawdown;

            // 🔥 NEW LOGIC: Har din ke andar ghuskar trades ko gino
            if (data.tradesList && data.tradesList.length > 0) {
                data.tradesList.forEach(trade => {
                    if (trade.pnl > 0) {
                        winTrades++;
                        if (trade.pnl > maxProfitTrade) maxProfitTrade = trade.pnl;
                    } else if (trade.pnl < 0) {
                        lossTrades++;
                        if (trade.pnl < maxLossTrade) maxLossTrade = trade.pnl;
                    } else {
                        // ✅ FIX: Agar PnL exactly 0 hai, to yaha gino
                        breakEvenTrades++;
                    }
                });
            }

            // Day-level metrics (Win Day / Loss Day)
            if (data.pnl > 0) {
                winDays++; currentWinStreak++; currentLossStreak = 0;
                if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
            }
            else if (data.pnl < 0) {
                lossDays++; currentLossStreak++; currentWinStreak = 0;
                if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
            }
            else {
                currentWinStreak = 0; currentLossStreak = 0;
            }

            equityCurve.push({ date, pnl: currentEquity });
            daywiseBreakdown.push({ date, dailyPnL: data.pnl, tradesTaken: data.trades, tradesList: data.tradesList });
        }

        // 🔥 THE VISUAL DEBUGGER PREPARATION 🔥
        let allExecutedTrades = [];
        daywiseBreakdown.forEach(day => {
            if (day.tradesList) allExecutedTrades.push(...day.tradesList);
        });

        let finalSmcSignals = [];
        if (strategy.type === "Price Action Based" || strategy.data?.type === "Price Action Based") {
            const paSettings = strategy.data?.priceActionSettings || strategy.priceActionSettings || {};
            const userChosenTrend = paSettings.startingTrend || "AUTO";
            const counterDepth = Number(paSettings.counterStructureDepth) || 0; 
            const structureMode = paSettings.structureMode || "MECHANICAL"; 
            
            // 🔥 THE NEW ADDITION: UI से Strict Decisional और Strict Counter की वैल्यू निकालें
            const strictDecisional = paSettings.strictDecisional === true;
            
            // 🔥 THE LOGIC SYNC: अगर Main Strict है, तो Counter भी हमेशा Strict (True) ही रहेगा!
            const strictCounter = strictDecisional ? true : (paSettings.strictCounter !== false);

            const majorOnly = paSettings.majorOnly === true;

            // चार्ट पर दिखाने के लिए पूरे 1 महीने के HTF (Manager) सिग्नल्स जनरेट करें
            finalSmcSignals = identifyMechanicalStructure(cachedHtfData, userChosenTrend, counterDepth, structureMode, strictDecisional, strictCounter, majorOnly, showD2S_DOB, showD2S_DOF, showD2S_EOB, showD2S_EOF);
        }

        const backtestResult = {
            summary: {
                totalPnL: currentEquity,
                maxDrawdown,
                tradingDays: totalMarketDays,
                winDays,
                lossDays,
                totalTrades: winTrades + lossTrades + breakEvenTrades,
                winTrades,
                lossTrades,
                breakEvenTrades,
                maxWinStreak,
                maxLossStreak,
                maxProfit: maxProfitTrade,
                maxLoss: maxLossTrade
            },
            equityCurve: equityCurve,
            daywiseBreakdown: daywiseBreakdown,
            
            // 📦 FRONTEND CHART KE LIYE NAYA PARSEL 📦
            candleData: cachedHtfData,       // 5m Manager Candles
            smcSignals: finalSmcSignals,     // IDM, BOS, CHoCH Lines
            executedTrades: allExecutedTrades // Target/SL Arrows
        };

        // 🔥 3. SEND FINAL DATA TO UI
        clearInterval(heartbeat);
        const finalResultForUI = {
            ...backtestResult,
            daywiseBreakdown: [...backtestResult.daywiseBreakdown].reverse()
        };
        res.write(`data: ${JSON.stringify({ type: 'COMPLETE', data: finalResultForUI })}\n\n`);
        res.end();

        // =========================================================
        // 💾 SILENT BACKGROUND SAVE
        // =========================================================
        if (newDaysToCache.length > 0) {
            console.log(`💾 Silent Background Save: Saving ${newDaysToCache.length} newly calculated days to MongoDB...`);

            const bulkOps = newDaysToCache.map(dateStr => ({
                updateOne: {
                    filter: { strategyId: strategy._id, configHash, date: dateStr },
                    update: {
                        $set: {
                            trades: dailyBreakdownMap[dateStr].tradesList,
                            dailyPnL: dailyBreakdownMap[dateStr].pnl,
                            hasTradedTimeBased: dailyBreakdownMap[dateStr].hasTradedTimeBased
                        }
                    },
                    upsert: true
                }
            }));

            try {
                BacktestCache.bulkWrite(bulkOps, { ordered: false })
                    .then(res => console.log(`✅ Saved ${res.upsertedCount + res.modifiedCount} days to Cache Godown.`))
                    .catch(e => console.error("⚠️ Background Cache Save Error:", e.message));
            } catch (error) {
                console.error("⚠️ Failed to trigger Background Save");
            }
        }

    } catch (error) {
        console.error("Backtest Error:", error);

        clearInterval(heartbeat);
        let errorMsg = "Internal Server Error";
        if (error.response && error.response.status === 429) errorMsg = "Broker API Rate Limit Exceeded";
        else if (error.message) errorMsg = error.message;

        res.write(`data: ${JSON.stringify({ type: 'ERROR', message: errorMsg })}\n\n`);
        res.end();
    }
};

module.exports = { runBacktestSimulator };