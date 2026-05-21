// const mongoose = require('mongoose');
// const crypto = require('crypto');
// const Strategy = require('../models/Strategy');
// const HistoricalData = require('../models/HistoricalData');
// const Broker = require('../models/Broker');
// const BacktestCache = require('../models/BacktestCache');

// const { calculateIndicator, extractParams, evaluateCondition } = require('../services/indicatorService');
// const { getOptionSecurityId, sleep } = require('../services/instrumentService');
// const { fetchDhanHistoricalData, fetchExpiredOptionData } = require('../services/dhanService');

// const { evaluateTrailingSL } = require('../engine/features/riskManagement/trailingLogic');
// const { evaluateMtmLogic } = require('../engine/features/riskManagement/mtmSquareOff');
// const { evaluateExitAllLogic } = require('../engine/features/advanceFeatures/exitAllOnSlTgt');

// const { processWaitAndTrade } = require('../engine/features/advanceFeatures/waitAndTrade');

// const { calculateTrailedSL } = require('../engine/features/advanceFeatures/trailSL');
// const { evaluateReEntryLogic } = require('../engine/features/advanceFeatures/reEntryLogic'); // 🔥 NAYA IMPORT


// const { isTradingHoliday } = require('../engine/utils/holidaysCalendar');
// const { getNearestExpiryString } = require('../engine/utils/expiryCalculator'); // ✅ Yeh NAYA add karein

// const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


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

//         console.log(`\n🚀 Running MULTI-LEG Backtest for: ${strategy.name} | Period: ${period || '1M'}`);

//         let endDate = new Date();
//         let startDate = new Date();

//         if (period === 'Custom' && start && end) {
//             startDate = new Date(start);
//             endDate = new Date(end);
//             endDate.setHours(23, 59, 59, 999);
//         }
//         else if (period === '1M') startDate.setMonth(startDate.getMonth() - 1);
//         else if (period === '3M') startDate.setMonth(startDate.getMonth() - 3);
//         else if (period === '6M') startDate.setMonth(startDate.getMonth() - 6);
//         else if (period === '1Y') startDate.setFullYear(startDate.getFullYear() - 1);
//         else if (period === '2Y') startDate.setFullYear(startDate.getFullYear() - 2);
//         else startDate.setMonth(startDate.getMonth() - 1);

//         const dhanIdMap = {
//             "NIFTY": "13", "NIFTY 50": "13", "BANKNIFTY": "25", "NIFTY BANK": "25",
//             "FINNIFTY": "27", "NIFTY FIN SERVICE": "27", "MIDCPNIFTY": "118", "NIFTY MID SELECT": "118",
//             "SENSEX": "51", "BSE SENSEX": "51"
//         };

//         const instrumentsArr = strategy.instruments || strategy.data?.instruments || [];
//         const instrumentData = instrumentsArr.length > 0 ? instrumentsArr[0] : {};
//         const symbol = instrumentData.name || instrumentData.symbol || "BANKNIFTY";
//         const upperSymbol = symbol.toUpperCase().trim();
//         const isOptionsTrade = instrumentData.segment === "Option" || instrumentData.segment === "NFO";

//         let exchangeSegment = "IDX_I";
//         if (upperSymbol.includes("NIFTY") || upperSymbol.includes("SENSEX") || upperSymbol === "BANKNIFTY" || upperSymbol === "NIFTY BANK") {
//             exchangeSegment = "IDX_I";
//         }

//         const cleanSymbolForMap = upperSymbol.replace(' 50', '').trim();
//         const spotSecurityId = instrumentData.securityId || dhanIdMap[upperSymbol] || dhanIdMap[cleanSymbolForMap] || "25";

//         const rawInterval = strategy.interval || strategy.config?.interval || strategy.data?.config?.interval;
//         let timeframe = rawInterval ? String(rawInterval).replace(' min', '').trim() : "5";

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
//             startTime: sTime,
//             squareOffTime: sqTime,
//             transactionType: txnType,
//             isTimeBased: isTimeBased,
//             allowedDays: allowedDaysNames,
//             orderType: orderType, // 🔥 Cache update for CNC
//             cncEntryDays: cncEntryDays,
//             cncExitDays: cncExitDays
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
//         // 📡 DATA DOWNLOADING (The Ant Strategy)
//         // =========================================================
//         // 🔥 REGEX HATA DIYA! Exact match se speed 100x fast ho jayegi!
//         let cachedData = await HistoricalData.find({
//             symbol: upperSymbol,
//             timeframe: timeframe,
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
//                 await HistoricalData.deleteMany({ symbol: { $regex: new RegExp(cleanSymbolForMap, "i") }, timeframe, timestamp: { $gte: startDate, $lte: endDate } });
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
//                 res.write(`data: ${JSON.stringify({ type: 'PROGRESS', date: `Fetching Spot Data: ${range.start.toISOString().split('T')[0]}`, percent: 0 })}\n\n`);

//                 const dhanRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, spotSecurityId, exchangeSegment, "INDEX", range.start.toISOString().split('T')[0], range.end.toISOString().split('T')[0], timeframe);
//                 const timeArray = dhanRes.data ? (dhanRes.data.start_Time || dhanRes.data.timestamp) : null;

//                 if (dhanRes.success && timeArray) {
//                     const { open, high, low, close, volume } = dhanRes.data;
//                     const bulkOps = [];
//                     for (let i = 0; i < timeArray.length; i++) {
//                         let ms = timeArray[i];
//                         if (ms < 10000000000) ms = ms * 1000;
//                         bulkOps.push({ insertOne: { document: { symbol: upperSymbol, timeframe, timestamp: new Date(ms), open: open[i], high: high[i], low: low[i], close: close[i], volume: volume[i] } } });
//                     }
//                     if (bulkOps.length > 0) await HistoricalData.bulkWrite(bulkOps, { ordered: false }).catch(e => console.log("Duplicates ignored"));
//                 }

//                 await delay(1000);
//             }

//             cachedData = await HistoricalData.find({ symbol: { $regex: new RegExp(cleanSymbolForMap, "i") }, timeframe, timestamp: { $gte: startDate, $lte: endDate } }).sort({ timestamp: 1 }).lean();
//             if (cachedData.length === 0) {
//                 res.write(`data: ${JSON.stringify({ type: 'ERROR', message: 'Spot Data not available for this period. Dhan API failed to fetch.' })}\n\n`);
//                 return res.end();
//             }
//         }

//         // --- INDICATOR CALCULATION SETUP ---
//         const calcLongInd1 = []; const calcLongInd2 = [];
//         if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
//             entryConds.longRules.forEach((rule, idx) => {
//                 calcLongInd1[idx] = calculateIndicator({ ...rule.ind1, params: extractParams(rule.ind1, rule.params) }, cachedData);
//                 calcLongInd2[idx] = calculateIndicator({ ...rule.ind2, params: extractParams(rule.ind2, null) }, cachedData);
//             });
//         }
//         const calcShortInd1 = []; const calcShortInd2 = [];
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
//         // ⏱️ THE MAIN CANDLE LOOP
//         // =========================================================
//         console.log(`\n🔍 [DEBUG] Strategy: ${strategy.name} | Legs Count: ${strategyLegs.length} | Entry Time: ${sTime} | Symbol: ${upperSymbol}\n`);
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
//             if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
//                 let overallResult = null;
//                 entryConds.longRules.forEach((rule, idx) => {
//                     const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
//                     const ruleResult = evaluateCondition(
//                         calcLongInd1[idx] ? calcLongInd1[idx][i] : null, calcLongInd2[idx] ? calcLongInd2[idx][i] : null,
//                         (i > 0 && calcLongInd1[idx]) ? calcLongInd1[idx][i - 1] : null, (i > 0 && calcLongInd2[idx]) ? calcLongInd2[idx][i - 1] : null, operator
//                     );
//                     if (idx === 0) overallResult = ruleResult;
//                     else {
//                         const logicalOp = entryConds.logicalOps[idx - 1];
//                         overallResult = logicalOp === 'AND' ? (overallResult && ruleResult) : (overallResult || ruleResult);
//                     }
//                 });
//                 longSignal = overallResult;
//             }

//             let shortSignal = false;
//             if (entryConds && entryConds.shortRules && entryConds.shortRules.length > 0) {
//                 let overallResult = null;
//                 entryConds.shortRules.forEach((rule, idx) => {
//                     const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
//                     const ruleResult = evaluateCondition(
//                         calcShortInd1[idx] ? calcShortInd1[idx][i] : null, calcShortInd2[idx] ? calcShortInd2[idx][i] : null,
//                         (i > 0 && calcShortInd1[idx]) ? calcShortInd1[idx][i - 1] : null, (i > 0 && calcShortInd2[idx]) ? calcShortInd2[idx][i - 1] : null, operator
//                     );
//                     if (idx === 0) overallResult = ruleResult;
//                     else {
//                         const logicalOp = entryConds.logicalOps[idx - 1];
//                         overallResult = logicalOp === 'AND' ? (overallResult && ruleResult) : (overallResult || ruleResult);
//                     }
//                 });
//                 shortSignal = overallResult;
//             }

//             // 🔥 CNC DTE CHECK FOR ENTRY
//             const primaryReqExpiry = strategyLegs[0]?.expiry || "WEEKLY";
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

//             if (isTimeBased && sTime) { // <-- Iske andar condition change karein
//                 const [sh, smStr] = sTime.split(':');
//                 let startMin = parseInt(sh) * 60 + parseInt(smStr.split(' ')[0]);
//                 if (sTime.toUpperCase().includes('PM') && parseInt(sh) !== 12) startMin += 720;
//                 if (sTime.toUpperCase().includes('AM') && parseInt(sh) === 12) startMin -= 720;

//                 // 🔥 NAYI CONDITION (isCncEntryDay check karega)
//                 if (timeInMinutes >= startMin && !dailyBreakdownMap[dateStr].hasTradedTimeBased && isCncEntryDay) {
//                     longSignal = true;
//                     dailyBreakdownMap[dateStr].hasTradedTimeBased = true;
//                 }
//             }

//             const finalLongSignal = (txnType === 'Both Side' || txnType === 'Only Long' || isTimeBased) ? longSignal : false;
//             const finalShortSignal = (txnType === 'Both Side' || txnType === 'Only Short') ? shortSignal : false;

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
//                     }

//                     // 🔥 THE FIX: Added isLegTrailed condition
//                     if ((!isSlMovedToCost && slValue > 0) || isSlMovedToCost || isLegTrailed) {
//                         if (spotTriggeredSl || (trade.transaction === "BUY" && trade.currentLow <= slPrice) || (trade.transaction === "SELL" && trade.currentHigh >= slPrice)) {
//                             trade.markedForExit = true;
//                             // 🔥 Naya naam taki logs aur UI me saaf pata chale ki Trail SL hit hua hai
//                             trade.exitReason = isSlMovedToCost ? "SL_MOVED_TO_COST" : (isLegTrailed ? "LEG_TRAIL_SL" : "STOPLOSS");
//                             trade.exitPrice = slPrice;
//                             triggerReasonForExitAll = trade.exitReason;
//                         }
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
//                     // 🔥 THE CNC EXIT CHECK
//                     let forceSquareOff = false;
//                     if (orderType === "MIS") {
//                         if (isExitTime || isLastCandleOfDay) forceSquareOff = true;
//                     } else { // CNC OR BTST

//                         // 🔥 THE FIX: Moving Goalpost Bug
//                         // Engine ko baar-baar naya expiry nikalne se roko. Trade ke name (symbol) se asli expiry fetch karo!
//                         let actualTradeExpiryStr = "";
//                         const expMatch = trade.symbol.match(/(?:Upcoming )?(EXP \d{2}[A-Z]{3}\d{2})/i);

//                         if (expMatch && expMatch[1]) {
//                             actualTradeExpiryStr = expMatch[1]; // Ex: "EXP 31MAR26"
//                         } else {
//                             actualTradeExpiryStr = getNearestExpiryString(dateStr, upperSymbol, trade.legConfig?.expiry || "WEEKLY");
//                         }

//                         const tradeDTE = getTradingDaysToExpiry(istDate, actualTradeExpiryStr);

//                         if (tradeDTE <= cncExitDays && isExitTime) forceSquareOff = true;
//                         else if (tradeDTE <= 0 && isLastCandleOfDay) forceSquareOff = true; // Expiry day EOD force exit
//                         else if (isExitTime && trade.exitReason) forceSquareOff = true; // Agar SL/Tgt hit hua par abhi tak kata nahi
//                     }

//                     // 🔥 PURANI LINE KO ISSE REPLACE KAREIN 👇
//                     if (trade.markedForExit || forceSquareOff) {
//                         if (!trade.markedForExit) {
//                             trade.exitReason = isLastCandleOfDay ? "EOD_SQUAREOFF" : "TIME_SQUAREOFF";
//                         }

//                         // =========================================================================
//                         // 🔴 THE SNIPER GATEKEEPER
//                         // =========================================================================
//                         const needsMarketPrice = ["MAX_LOSS", "MAX_PROFIT", "TIME_SQUAREOFF", "EOD_SQUAREOFF", "INDICATOR_EXIT", "STOPLOSS", "TARGET", "TRAILING_SL", "SL_MOVED_TO_COST", "LOCK_FIX_PROFIT", "LOCK_AND_TRAIL", "LEG_TRAIL_SL"].includes(trade.exitReason) || String(trade.exitReason).startsWith("EXIT_ALL");
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

//                                 let reqExpiry = trade.legConfig.expiry || "WEEKLY";
//                                 let expFlag = "WEEK"; let expCode = 1;
//                                 if (reqExpiry.toUpperCase() === "MONTHLY") { expFlag = "MONTH"; expCode = 1; }
//                                 else if (reqExpiry.toUpperCase() === "NEXT WEEKLY" || reqExpiry.toUpperCase() === "NEXT WEEK") { expFlag = "WEEK"; expCode = 2; }

//                                 const basePayload = {
//                                     exchangeSegment: "NSE_FNO", interval: "1", securityId: Number(spotSecurityId), instrument: "OPTIDX",
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
//                                         trade.exitPrice = (trade.exitReason === "TIME_SQUAREOFF" || String(trade.exitReason).startsWith("EXIT_ALL")) ? cOpen : cClose;
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

//                     console.log(`🎯 [${completedTrade.exitType}] Date: ${dateStr} | Symbol: ${trade.symbol} | Exit: ${trade.exitPrice.toFixed(2)} | PnL: ${pnl.toFixed(2)}`);
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
//                                     let reqExpiry = trade.legConfig.expiry || "WEEKLY";
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
//                             // =========================================================================

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
//             const canTakeNewEntry = openTrades.length === 0 || (orderType !== "MIS" && isTimeBased);

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

//             // 3. Asli Entry Loop (Brackets ko protect kiya gaya hai)
//             if (shouldAttemptEntry) {
//                 const isLongSignal = activeSignalType === "LONG";

//                 // 🔥 NAYA CODE: Premium Diff check karne ke liye temporary memory
//                 let tempPendingTrades = [];
//                 let tempLtps = [];

//                 for (let legIndex = 0; legIndex < strategyLegs.length; legIndex++) {
//                     const legData = strategyLegs[legIndex];

//                     let tradeQuantity = legData.quantity;
//                     if (!tradeQuantity || isNaN(tradeQuantity)) tradeQuantity = upperSymbol.includes("BANK") ? 30 : (upperSymbol.includes("NIFTY") ? 50 : 1);

//                     const transActionTypeStr = (legData.action || "BUY").toUpperCase();
//                     let activeOptionType = "";

//                     if (isTimeBased) {
//                         activeOptionType = (legData.optionType || "Call").toUpperCase().includes("C") ? "CE" : "PE";
//                     } else {
//                         // 🔥 FIX: finalLongSignal ki jagah ab humara smart isLongSignal use hoga
//                         if (transActionTypeStr === "BUY") activeOptionType = isLongSignal ? "CE" : "PE";
//                         else if (transActionTypeStr === "SELL") activeOptionType = isLongSignal ? "PE" : "CE";
//                     }

//                     let finalEntryPrice = isOptionsTrade ? 0 : spotClosePrice;
//                     let validTrade = true;
//                     let premiumChartData = null;
//                     let targetStrike = calculateATM(spotClosePrice, upperSymbol);
//                     const strikeCriteria = legData.strikeCriteria || "ATM pt";
//                     const strikeType = legData.strikeType || "ATM";
//                     const reqExpiry = legData.expiry || "WEEKLY";

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
//                             entryReason: currentEntryReason // 🔥 NAYA TAG (Ise Jodna Hai)
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

//         const backtestResult = {
//             summary: {
//                 totalPnL: currentEquity,
//                 maxDrawdown,
//                 tradingDays: totalMarketDays,
//                 winDays,
//                 lossDays,
//                 // ✅ FIX: Ab Total trades me teeno judenge (Win + Loss + BreakEven)
//                 totalTrades: winTrades + lossTrades + breakEvenTrades,
//                 winTrades,
//                 lossTrades,
//                 breakEvenTrades, // ✅ Frontend ko direct data bhej diya
//                 maxWinStreak,
//                 maxLossStreak,
//                 maxProfit: maxProfitTrade,
//                 maxLoss: maxLossTrade
//             },
//             equityCurve: equityCurve,
//             daywiseBreakdown: daywiseBreakdown
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



// const mongoose = require('mongoose');
// const crypto = require('crypto');
// const Strategy = require('../models/Strategy');
// const HistoricalData = require('../models/HistoricalData');
// const Broker = require('../models/Broker');
// const BacktestCache = require('../models/BacktestCache');

// const { calculateIndicator, extractParams, evaluateCondition } = require('../services/indicatorService');
// const { getOptionSecurityId, sleep } = require('../services/instrumentService');
// const { fetchDhanHistoricalData, fetchExpiredOptionData } = require('../services/dhanService');

// const { evaluateTrailingSL } = require('../engine/features/riskManagement/trailingLogic');
// const { evaluateMtmLogic } = require('../engine/features/riskManagement/mtmSquareOff');
// const { evaluateExitAllLogic } = require('../engine/features/advanceFeatures/exitAllOnSlTgt');

// const { processWaitAndTrade } = require('../engine/features/advanceFeatures/waitAndTrade');

// const { calculateTrailedSL } = require('../engine/features/advanceFeatures/trailSL');
// const { evaluateReEntryLogic } = require('../engine/features/advanceFeatures/reEntryLogic'); // 🔥 NAYA IMPORT


// const { isTradingHoliday } = require('../engine/utils/holidaysCalendar');
// const { getNearestExpiryString } = require('../engine/utils/expiryCalculator'); // ✅ Yeh NAYA add karein

// const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


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

//         console.log(`\n🚀 Running MULTI-LEG Backtest for: ${strategy.name} | Period: ${period || '1M'}`);

//         let endDate = new Date();
//         let startDate = new Date();

//         if (period === 'Custom' && start && end) {
//             startDate = new Date(start);
//             endDate = new Date(end);
//             endDate.setHours(23, 59, 59, 999);
//         }
//         else if (period === '1M') startDate.setMonth(startDate.getMonth() - 1);
//         else if (period === '3M') startDate.setMonth(startDate.getMonth() - 3);
//         else if (period === '6M') startDate.setMonth(startDate.getMonth() - 6);
//         else if (period === '1Y') startDate.setFullYear(startDate.getFullYear() - 1);
//         else if (period === '2Y') startDate.setFullYear(startDate.getFullYear() - 2);
//         else startDate.setMonth(startDate.getMonth() - 1);

//         const dhanIdMap = {
//             "NIFTY": "13", "NIFTY 50": "13", "BANKNIFTY": "25", "NIFTY BANK": "25",
//             "FINNIFTY": "27", "NIFTY FIN SERVICE": "27", "MIDCPNIFTY": "118", "NIFTY MID SELECT": "118",
//             "SENSEX": "51", "BSE SENSEX": "51"
//         };

//         const instrumentsArr = strategy.instruments || strategy.data?.instruments || [];
//         const instrumentData = instrumentsArr.length > 0 ? instrumentsArr[0] : {};
//         const symbol = instrumentData.name || instrumentData.symbol || "BANKNIFTY";
//         const upperSymbol = symbol.toUpperCase().trim();
//         const isOptionsTrade = instrumentData.segment === "Option" || instrumentData.segment === "NFO";

//         let exchangeSegment = "IDX_I";
//         if (upperSymbol.includes("NIFTY") || upperSymbol.includes("SENSEX") || upperSymbol === "BANKNIFTY" || upperSymbol === "NIFTY BANK") {
//             exchangeSegment = "IDX_I";
//         }

//         const cleanSymbolForMap = upperSymbol.replace(' 50', '').trim();
//         const spotSecurityId = instrumentData.securityId || dhanIdMap[upperSymbol] || dhanIdMap[cleanSymbolForMap] || "25";

//         const rawInterval = strategy.interval || strategy.config?.interval || strategy.data?.config?.interval;
//         let timeframe = rawInterval ? String(rawInterval).replace(' min', '').trim() : "5";

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
//             startTime: sTime,
//             squareOffTime: sqTime,
//             transactionType: txnType,
//             isTimeBased: isTimeBased,
//             allowedDays: allowedDaysNames,
//             orderType: orderType, // 🔥 Cache update for CNC
//             cncEntryDays: cncEntryDays,
//             cncExitDays: cncExitDays
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
//         // 📡 DATA DOWNLOADING (The Ant Strategy)
//         // =========================================================
//         // 🔥 REGEX HATA DIYA! Exact match se speed 100x fast ho jayegi!
//         let cachedData = await HistoricalData.find({
//             symbol: upperSymbol,
//             timeframe: timeframe,
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
//                 await HistoricalData.deleteMany({ symbol: { $regex: new RegExp(cleanSymbolForMap, "i") }, timeframe, timestamp: { $gte: startDate, $lte: endDate } });
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
//                 res.write(`data: ${JSON.stringify({ type: 'PROGRESS', date: `Fetching Spot Data: ${range.start.toISOString().split('T')[0]}`, percent: 0 })}\n\n`);

//                 const dhanRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, spotSecurityId, exchangeSegment, "INDEX", range.start.toISOString().split('T')[0], range.end.toISOString().split('T')[0], timeframe);
//                 const timeArray = dhanRes.data ? (dhanRes.data.start_Time || dhanRes.data.timestamp) : null;

//                 if (dhanRes.success && timeArray) {
//                     const { open, high, low, close, volume } = dhanRes.data;
//                     const bulkOps = [];
//                     for (let i = 0; i < timeArray.length; i++) {
//                         let ms = timeArray[i];
//                         if (ms < 10000000000) ms = ms * 1000;
//                         bulkOps.push({ insertOne: { document: { symbol: upperSymbol, timeframe, timestamp: new Date(ms), open: open[i], high: high[i], low: low[i], close: close[i], volume: volume[i] } } });
//                     }
//                     if (bulkOps.length > 0) await HistoricalData.bulkWrite(bulkOps, { ordered: false }).catch(e => console.log("Duplicates ignored"));
//                 }

//                 await delay(1000);
//             }

//             cachedData = await HistoricalData.find({ symbol: { $regex: new RegExp(cleanSymbolForMap, "i") }, timeframe, timestamp: { $gte: startDate, $lte: endDate } }).sort({ timestamp: 1 }).lean();
//             if (cachedData.length === 0) {
//                 res.write(`data: ${JSON.stringify({ type: 'ERROR', message: 'Spot Data not available for this period. Dhan API failed to fetch.' })}\n\n`);
//                 return res.end();
//             }
//         }

//         // --- INDICATOR CALCULATION SETUP ---
//         const calcLongInd1 = []; const calcLongInd2 = [];
//         if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
//             entryConds.longRules.forEach((rule, idx) => {
//                 calcLongInd1[idx] = calculateIndicator({ ...rule.ind1, params: extractParams(rule.ind1, rule.params) }, cachedData);
//                 calcLongInd2[idx] = calculateIndicator({ ...rule.ind2, params: extractParams(rule.ind2, null) }, cachedData);
//             });
//         }
//         const calcShortInd1 = []; const calcShortInd2 = [];
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
//         // ⏱️ THE MAIN CANDLE LOOP
//         // =========================================================
//         console.log(`\n🔍 [DEBUG] Strategy: ${strategy.name} | Legs Count: ${strategyLegs.length} | Entry Time: ${sTime} | Symbol: ${upperSymbol}\n`);
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
//             if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
//                 let overallResult = null;
//                 entryConds.longRules.forEach((rule, idx) => {
//                     const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
//                     const ruleResult = evaluateCondition(
//                         calcLongInd1[idx] ? calcLongInd1[idx][i] : null, calcLongInd2[idx] ? calcLongInd2[idx][i] : null,
//                         (i > 0 && calcLongInd1[idx]) ? calcLongInd1[idx][i - 1] : null, (i > 0 && calcLongInd2[idx]) ? calcLongInd2[idx][i - 1] : null, operator
//                     );
//                     if (idx === 0) overallResult = ruleResult;
//                     else {
//                         const logicalOp = entryConds.logicalOps[idx - 1];
//                         overallResult = logicalOp === 'AND' ? (overallResult && ruleResult) : (overallResult || ruleResult);
//                     }
//                 });
//                 longSignal = overallResult;
//             }

//             let shortSignal = false;
//             if (entryConds && entryConds.shortRules && entryConds.shortRules.length > 0) {
//                 let overallResult = null;
//                 entryConds.shortRules.forEach((rule, idx) => {
//                     const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
//                     const ruleResult = evaluateCondition(
//                         calcShortInd1[idx] ? calcShortInd1[idx][i] : null, calcShortInd2[idx] ? calcShortInd2[idx][i] : null,
//                         (i > 0 && calcShortInd1[idx]) ? calcShortInd1[idx][i - 1] : null, (i > 0 && calcShortInd2[idx]) ? calcShortInd2[idx][i - 1] : null, operator
//                     );
//                     if (idx === 0) overallResult = ruleResult;
//                     else {
//                         const logicalOp = entryConds.logicalOps[idx - 1];
//                         overallResult = logicalOp === 'AND' ? (overallResult && ruleResult) : (overallResult || ruleResult);
//                     }
//                 });
//                 shortSignal = overallResult;
//             }

//             // 🔥 CNC DTE CHECK FOR ENTRY
//             const primaryReqExpiry = strategyLegs[0]?.expiry || "WEEKLY";
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

//             if (isTimeBased && sTime) { // <-- Iske andar condition change karein
//                 const [sh, smStr] = sTime.split(':');
//                 let startMin = parseInt(sh) * 60 + parseInt(smStr.split(' ')[0]);
//                 if (sTime.toUpperCase().includes('PM') && parseInt(sh) !== 12) startMin += 720;
//                 if (sTime.toUpperCase().includes('AM') && parseInt(sh) === 12) startMin -= 720;

//                 // 🔥 NAYI CONDITION (isCncEntryDay check karega)
//                 if (timeInMinutes >= startMin && !dailyBreakdownMap[dateStr].hasTradedTimeBased && isCncEntryDay) {
//                     longSignal = true;
//                     dailyBreakdownMap[dateStr].hasTradedTimeBased = true;
//                 }
//             }

//             const finalLongSignal = (txnType === 'Both Side' || txnType === 'Only Long' || isTimeBased) ? longSignal : false;
//             const finalShortSignal = (txnType === 'Both Side' || txnType === 'Only Short') ? shortSignal : false;

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
//                     }

//                     // 🔥 THE FIX: Added isLegTrailed condition
//                     if ((!isSlMovedToCost && slValue > 0) || isSlMovedToCost || isLegTrailed) {
//                         if (spotTriggeredSl || (trade.transaction === "BUY" && trade.currentLow <= slPrice) || (trade.transaction === "SELL" && trade.currentHigh >= slPrice)) {
//                             trade.markedForExit = true;
//                             // 🔥 Naya naam taki logs aur UI me saaf pata chale ki Trail SL hit hua hai
//                             trade.exitReason = isSlMovedToCost ? "SL_MOVED_TO_COST" : (isLegTrailed ? "LEG_TRAIL_SL" : "STOPLOSS");
//                             trade.exitPrice = slPrice;
//                             triggerReasonForExitAll = trade.exitReason;
//                         }
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

//                                 let reqExpiry = trade.legConfig.expiry || "WEEKLY";
//                                 let expFlag = "WEEK"; let expCode = 1;
//                                 if (reqExpiry.toUpperCase() === "MONTHLY") { expFlag = "MONTH"; expCode = 1; }
//                                 else if (reqExpiry.toUpperCase() === "NEXT WEEKLY" || reqExpiry.toUpperCase() === "NEXT WEEK") { expFlag = "WEEK"; expCode = 2; }

//                                 const basePayload = {
//                                     exchangeSegment: "NSE_FNO", interval: "1", securityId: Number(spotSecurityId), instrument: "OPTIDX",
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

//                     console.log(`🎯 [${completedTrade.exitType}] Date: ${dateStr} | Symbol: ${trade.symbol} | Exit: ${trade.exitPrice.toFixed(2)} | PnL: ${pnl.toFixed(2)}`);
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
//                                     let reqExpiry = trade.legConfig.expiry || "WEEKLY";
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
//                             // =========================================================================

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

//             // 3. Asli Entry Loop (Brackets ko protect kiya gaya hai)
//             if (shouldAttemptEntry) {
//                 const isLongSignal = activeSignalType === "LONG";

//                 // 🔥 NAYA CODE: Premium Diff check karne ke liye temporary memory
//                 let tempPendingTrades = [];
//                 let tempLtps = [];

//                 for (let legIndex = 0; legIndex < strategyLegs.length; legIndex++) {
//                     const legData = strategyLegs[legIndex];

//                     let tradeQuantity = legData.quantity;
//                     if (!tradeQuantity || isNaN(tradeQuantity)) tradeQuantity = upperSymbol.includes("BANK") ? 30 : (upperSymbol.includes("NIFTY") ? 50 : 1);

//                     const transActionTypeStr = (legData.action || "BUY").toUpperCase();
//                     let activeOptionType = "";

//                     if (isTimeBased) {
//                         activeOptionType = (legData.optionType || "Call").toUpperCase().includes("C") ? "CE" : "PE";
//                     } else {
//                         // 🔥 FIX: finalLongSignal ki jagah ab humara smart isLongSignal use hoga
//                         if (transActionTypeStr === "BUY") activeOptionType = isLongSignal ? "CE" : "PE";
//                         else if (transActionTypeStr === "SELL") activeOptionType = isLongSignal ? "PE" : "CE";
//                     }

//                     let finalEntryPrice = isOptionsTrade ? 0 : spotClosePrice;
//                     let validTrade = true;
//                     let premiumChartData = null;
//                     let targetStrike = calculateATM(spotClosePrice, upperSymbol);
//                     const strikeCriteria = legData.strikeCriteria || "ATM pt";
//                     const strikeType = legData.strikeType || "ATM";
//                     const reqExpiry = legData.expiry || "WEEKLY";

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
//                             entryReason: currentEntryReason // 🔥 NAYA TAG (Ise Jodna Hai)
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

//         const backtestResult = {
//             summary: {
//                 totalPnL: currentEquity,
//                 maxDrawdown,
//                 tradingDays: totalMarketDays,
//                 winDays,
//                 lossDays,
//                 // ✅ FIX: Ab Total trades me teeno judenge (Win + Loss + BreakEven)
//                 totalTrades: winTrades + lossTrades + breakEvenTrades,
//                 winTrades,
//                 lossTrades,
//                 breakEvenTrades, // ✅ Frontend ko direct data bhej diya
//                 maxWinStreak,
//                 maxLossStreak,
//                 maxProfit: maxProfitTrade,
//                 maxLoss: maxLossTrade
//             },
//             equityCurve: equityCurve,
//             daywiseBreakdown: daywiseBreakdown
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

// const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


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

//         console.log(`\n🚀 Running MULTI-LEG Backtest for: ${strategy.name} | Period: ${period || '1M'}`);

//         let endDate = new Date();
//         let startDate = new Date();

//         if (period === 'Custom' && start && end) {
//             startDate = new Date(start);
//             endDate = new Date(end);
//             endDate.setHours(23, 59, 59, 999);
//         }
//         else if (period === '1M') startDate.setMonth(startDate.getMonth() - 1);
//         else if (period === '3M') startDate.setMonth(startDate.getMonth() - 3);
//         else if (period === '6M') startDate.setMonth(startDate.getMonth() - 6);
//         else if (period === '1Y') startDate.setFullYear(startDate.getFullYear() - 1);
//         else if (period === '2Y') startDate.setFullYear(startDate.getFullYear() - 2);
//         else startDate.setMonth(startDate.getMonth() - 1);

//         const dhanIdMap = {
//             "NIFTY": "13", "NIFTY 50": "13", "BANKNIFTY": "25", "NIFTY BANK": "25",
//             "FINNIFTY": "27", "NIFTY FIN SERVICE": "27", "MIDCPNIFTY": "118", "NIFTY MID SELECT": "118",
//             "SENSEX": "51", "BSE SENSEX": "51"
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
//         let dbCacheSymbol = upperSymbol; // MongoDB me Spot aur Future alag alag save honge!

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

//         const rawInterval = strategy.interval || strategy.config?.interval || strategy.data?.config?.interval;
//         let timeframe = rawInterval ? String(rawInterval).replace(' min', '').trim() : "5";

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
//             startTime: sTime,
//             squareOffTime: sqTime,
//             transactionType: txnType,
//             isTimeBased: isTimeBased,
//             allowedDays: allowedDaysNames,
//             orderType: orderType, // 🔥 Cache update for CNC
//             cncEntryDays: cncEntryDays,
//             cncExitDays: cncExitDays
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
//         // 🔥 FIX: Regex hata diya aur dbCacheSymbol lagaya (Taki Spot aur Future mix na ho)
//         let cachedData = await HistoricalData.find({
//             symbol: dbCacheSymbol,
//             timeframe: timeframe,
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
//                 // 🔥 FIX: Puraana data delete karte waqt bhi dbCacheSymbol use hoga
//                 await HistoricalData.deleteMany({ symbol: dbCacheSymbol, timeframe, timestamp: { $gte: startDate, $lte: endDate } });
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
//                 // 🔥 UI ko batao ki Spot fetch ho raha hai ya Future
//                 res.write(`data: ${JSON.stringify({ type: 'PROGRESS', date: `Fetching ${underlyingType} Data: ${range.start.toISOString().split('T')[0]}`, percent: 0 })}\n\n`);

//                // 🔥 Dynamic Security ID Tracker (For Futures)
//                 let targetSecurityId = spotSecurityId;
//                 let finalExchange = exchangeSegment;
//                 let finalInstType = instrumentType;

//                 if (underlyingType === "Future" && typeof getFutureSecurityId === 'function') {
//                     const futId = await getFutureSecurityId(upperSymbol, range.start.toISOString().split('T')[0]);
//                     if (futId) {
//                         targetSecurityId = futId;
//                     } else {
//                         // 🚨 CONTRACT EXPIRED & NOT IN CSV! Fallback to SPOT temporarily so engine doesn't crash
//                         console.log(`⚠️ Future ID not found for ${range.start.toISOString().split('T')[0]}. Falling back to Spot Data.`);
//                         targetSecurityId = spotSecurityId;
//                         finalExchange = "IDX_I";
//                         finalInstType = "INDEX";
//                     }
//                 }

                
//                 // API call me exchangeSegment aur instrumentType dynamic jayenge
//                 const dhanRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, targetSecurityId, exchangeSegment, instrumentType, range.start.toISOString().split('T')[0], range.end.toISOString().split('T')[0], timeframe);
//                 const timeArray = dhanRes.data ? (dhanRes.data.start_Time || dhanRes.data.timestamp) : null;

//                 if (dhanRes.success && timeArray) {
//                     const { open, high, low, close, volume } = dhanRes.data;
//                     const bulkOps = [];
//                     for (let i = 0; i < timeArray.length; i++) {
//                         let ms = timeArray[i];
//                         if (ms < 10000000000) ms = ms * 1000;
//                         // 🔥 DB me insert karte waqt dbCacheSymbol (e.g. BANKNIFTY_FUT) jayega
//                         bulkOps.push({ insertOne: { document: { symbol: dbCacheSymbol, timeframe, timestamp: new Date(ms), open: open[i], high: high[i], low: low[i], close: close[i], volume: volume[i] } } });
//                     }
//                     if (bulkOps.length > 0) await HistoricalData.bulkWrite(bulkOps, { ordered: false }).catch(e => console.log("Duplicates ignored"));
//                 }

//                 await delay(1000);
//             }

//             // Loop ke baad wapas DB se uthao
//             cachedData = await HistoricalData.find({ symbol: dbCacheSymbol, timeframe, timestamp: { $gte: startDate, $lte: endDate } }).sort({ timestamp: 1 }).lean();
//             if (cachedData.length === 0) {
//                 res.write(`data: ${JSON.stringify({ type: 'ERROR', message: `${underlyingType} Data not available for this period. Dhan API failed to fetch.` })}\n\n`);
//                 return res.end();
//             }
//         }

//         // --- INDICATOR CALCULATION SETUP ---
//         const calcLongInd1 = []; const calcLongInd2 = [];
//         if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
//             entryConds.longRules.forEach((rule, idx) => {
//                 calcLongInd1[idx] = calculateIndicator({ ...rule.ind1, params: extractParams(rule.ind1, rule.params) }, cachedData);
//                 calcLongInd2[idx] = calculateIndicator({ ...rule.ind2, params: extractParams(rule.ind2, null) }, cachedData);
//             });
//         }
//         const calcShortInd1 = []; const calcShortInd2 = [];
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
//         // ⏱️ THE MAIN CANDLE LOOP
//         // =========================================================
//         console.log(`\n🔍 [DEBUG] Strategy: ${strategy.name} | Legs Count: ${strategyLegs.length} | Entry Time: ${sTime} | Symbol: ${upperSymbol}\n`);
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
//             if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
//                 let overallResult = null;
//                 entryConds.longRules.forEach((rule, idx) => {
//                     const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
//                     const ruleResult = evaluateCondition(
//                         calcLongInd1[idx] ? calcLongInd1[idx][i] : null, calcLongInd2[idx] ? calcLongInd2[idx][i] : null,
//                         (i > 0 && calcLongInd1[idx]) ? calcLongInd1[idx][i - 1] : null, (i > 0 && calcLongInd2[idx]) ? calcLongInd2[idx][i - 1] : null, operator
//                     );
//                     if (idx === 0) overallResult = ruleResult;
//                     else {
//                         const logicalOp = entryConds.logicalOps[idx - 1];
//                         overallResult = logicalOp === 'AND' ? (overallResult && ruleResult) : (overallResult || ruleResult);
//                     }
//                 });
//                 longSignal = overallResult;
//             }

//             let shortSignal = false;
//             if (entryConds && entryConds.shortRules && entryConds.shortRules.length > 0) {
//                 let overallResult = null;
//                 entryConds.shortRules.forEach((rule, idx) => {
//                     const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
//                     const ruleResult = evaluateCondition(
//                         calcShortInd1[idx] ? calcShortInd1[idx][i] : null, calcShortInd2[idx] ? calcShortInd2[idx][i] : null,
//                         (i > 0 && calcShortInd1[idx]) ? calcShortInd1[idx][i - 1] : null, (i > 0 && calcShortInd2[idx]) ? calcShortInd2[idx][i - 1] : null, operator
//                     );
//                     if (idx === 0) overallResult = ruleResult;
//                     else {
//                         const logicalOp = entryConds.logicalOps[idx - 1];
//                         overallResult = logicalOp === 'AND' ? (overallResult && ruleResult) : (overallResult || ruleResult);
//                     }
//                 });
//                 shortSignal = overallResult;
//             }

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

//             const finalLongSignal = (txnType === 'Both Side' || txnType === 'Only Long' || isTimeBased) ? longSignal : false;
//             const finalShortSignal = (txnType === 'Both Side' || txnType === 'Only Short') ? shortSignal : false;

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
//                     }

//                     // 🔥 THE FIX: Added isLegTrailed condition
//                     if ((!isSlMovedToCost && slValue > 0) || isSlMovedToCost || isLegTrailed) {
//                         if (spotTriggeredSl || (trade.transaction === "BUY" && trade.currentLow <= slPrice) || (trade.transaction === "SELL" && trade.currentHigh >= slPrice)) {
//                             trade.markedForExit = true;
//                             // 🔥 Naya naam taki logs aur UI me saaf pata chale ki Trail SL hit hua hai
//                             trade.exitReason = isSlMovedToCost ? "SL_MOVED_TO_COST" : (isLegTrailed ? "LEG_TRAIL_SL" : "STOPLOSS");
//                             trade.exitPrice = slPrice;
//                             triggerReasonForExitAll = trade.exitReason;
//                         }
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

//                                 const basePayload = {
//                                     exchangeSegment: "NSE_FNO", interval: "1", securityId: Number(spotSecurityId), instrument: "OPTIDX",
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

//                     console.log(`🎯 [${completedTrade.exitType}] Date: ${dateStr} | Symbol: ${trade.symbol} | Exit: ${trade.exitPrice.toFixed(2)} | PnL: ${pnl.toFixed(2)}`);
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
//                             // =========================================================================

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

//             // 3. Asli Entry Loop (Brackets ko protect kiya gaya hai)
//             if (shouldAttemptEntry) {
//                 const isLongSignal = activeSignalType === "LONG";

//                 // 🔥 NAYA CODE: Premium Diff check karne ke liye temporary memory
//                 let tempPendingTrades = [];
//                 let tempLtps = [];

//                 for (let legIndex = 0; legIndex < strategyLegs.length; legIndex++) {
//                     const legData = strategyLegs[legIndex];

//                     let tradeQuantity = legData.quantity;
//                     if (!tradeQuantity || isNaN(tradeQuantity)) tradeQuantity = upperSymbol.includes("BANK") ? 30 : (upperSymbol.includes("NIFTY") ? 50 : 1);

//                     const transActionTypeStr = (legData.action || "BUY").toUpperCase();
//                     let activeOptionType = "";

//                     if (isTimeBased) {
//                         activeOptionType = (legData.optionType || "Call").toUpperCase().includes("C") ? "CE" : "PE";
//                     } else {
//                         // 🔥 FIX: finalLongSignal ki jagah ab humara smart isLongSignal use hoga
//                         if (transActionTypeStr === "BUY") activeOptionType = isLongSignal ? "CE" : "PE";
//                         else if (transActionTypeStr === "SELL") activeOptionType = isLongSignal ? "PE" : "CE";
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
//                             entryReason: currentEntryReason // 🔥 NAYA TAG (Ise Jodna Hai)
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

//         const backtestResult = {
//             summary: {
//                 totalPnL: currentEquity,
//                 maxDrawdown,
//                 tradingDays: totalMarketDays,
//                 winDays,
//                 lossDays,
//                 // ✅ FIX: Ab Total trades me teeno judenge (Win + Loss + BreakEven)
//                 totalTrades: winTrades + lossTrades + breakEvenTrades,
//                 winTrades,
//                 lossTrades,
//                 breakEvenTrades, // ✅ Frontend ko direct data bhej diya
//                 maxWinStreak,
//                 maxLossStreak,
//                 maxProfit: maxProfitTrade,
//                 maxLoss: maxLossTrade
//             },
//             equityCurve: equityCurve,
//             daywiseBreakdown: daywiseBreakdown
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

const { identifySwings, checkPriceActionSignal } = require('../engine/scanners/priceActionScanner.js');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


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

        console.log(`\n🚀 Running MULTI-LEG Backtest for: ${strategy.name} | Period: ${period || '1M'}`);

        let endDate = new Date();
        let startDate = new Date();

        if (period === 'Custom' && start && end) {
            startDate = new Date(start);
            endDate = new Date(end);
            endDate.setHours(23, 59, 59, 999);
        }
        else if (period === '1M') startDate.setMonth(startDate.getMonth() - 1);
        else if (period === '3M') startDate.setMonth(startDate.getMonth() - 3);
        else if (period === '6M') startDate.setMonth(startDate.getMonth() - 6);
        else if (period === '1Y') startDate.setFullYear(startDate.getFullYear() - 1);
        else if (period === '2Y') startDate.setFullYear(startDate.getFullYear() - 2);
        else startDate.setMonth(startDate.getMonth() - 1);

        const dhanIdMap = {
            "NIFTY": "13", "NIFTY 50": "13", "BANKNIFTY": "25", "NIFTY BANK": "25",
            "FINNIFTY": "27", "NIFTY FIN SERVICE": "27", "MIDCPNIFTY": "118", "NIFTY MID SELECT": "118",
            "SENSEX": "51", "BSE SENSEX": "51"
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
        let dbCacheSymbol = upperSymbol; // MongoDB me Spot aur Future alag alag save honge!

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

        const rawInterval = strategy.interval || strategy.config?.interval || strategy.data?.config?.interval;
        let timeframe = rawInterval ? String(rawInterval).replace(' min', '').trim() : "5";

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
        // 🔥 FIX: Regex hata diya aur dbCacheSymbol lagaya (Taki Spot aur Future mix na ho)
        let cachedData = await HistoricalData.find({
            symbol: dbCacheSymbol,
            timeframe: timeframe,
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
                // 🔥 FIX: Puraana data delete karte waqt bhi dbCacheSymbol use hoga
                await HistoricalData.deleteMany({ symbol: dbCacheSymbol, timeframe, timestamp: { $gte: startDate, $lte: endDate } });
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
                // 🔥 UI ko batao ki Spot fetch ho raha hai ya Future
                res.write(`data: ${JSON.stringify({ type: 'PROGRESS', date: `Fetching ${underlyingType} Data: ${range.start.toISOString().split('T')[0]}`, percent: 0 })}\n\n`);

               // 🔥 Dynamic Security ID Tracker (For Futures)
                let targetSecurityId = spotSecurityId;
                let finalExchange = exchangeSegment;
                let finalInstType = instrumentType;

                if (underlyingType === "Future" && typeof getFutureSecurityId === 'function') {
                    const futId = await getFutureSecurityId(upperSymbol, range.start.toISOString().split('T')[0]);
                    if (futId) {
                        targetSecurityId = futId;
                    } else {
                        // 🚨 CONTRACT EXPIRED & NOT IN CSV! Fallback to SPOT temporarily so engine doesn't crash
                        console.log(`⚠️ Future ID not found for ${range.start.toISOString().split('T')[0]}. Falling back to Spot Data.`);
                        targetSecurityId = spotSecurityId;
                        finalExchange = "IDX_I";
                        finalInstType = "INDEX";
                    }
                }

                
                // API call me exchangeSegment aur instrumentType dynamic jayenge
                const dhanRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, targetSecurityId, exchangeSegment, instrumentType, range.start.toISOString().split('T')[0], range.end.toISOString().split('T')[0], timeframe);
                const timeArray = dhanRes.data ? (dhanRes.data.start_Time || dhanRes.data.timestamp) : null;

                if (dhanRes.success && timeArray) {
                    const { open, high, low, close, volume } = dhanRes.data;
                    const bulkOps = [];
                    for (let i = 0; i < timeArray.length; i++) {
                        let ms = timeArray[i];
                        if (ms < 10000000000) ms = ms * 1000;
                        // 🔥 DB me insert karte waqt dbCacheSymbol (e.g. BANKNIFTY_FUT) jayega
                        bulkOps.push({ insertOne: { document: { symbol: dbCacheSymbol, timeframe, timestamp: new Date(ms), open: open[i], high: high[i], low: low[i], close: close[i], volume: volume[i] } } });
                    }
                    if (bulkOps.length > 0) await HistoricalData.bulkWrite(bulkOps, { ordered: false }).catch(e => console.log("Duplicates ignored"));
                }

                await delay(1000);
            }

            // Loop ke baad wapas DB se uthao
            cachedData = await HistoricalData.find({ symbol: dbCacheSymbol, timeframe, timestamp: { $gte: startDate, $lte: endDate } }).sort({ timestamp: 1 }).lean();
            if (cachedData.length === 0) {
                res.write(`data: ${JSON.stringify({ type: 'ERROR', message: `${underlyingType} Data not available for this period. Dhan API failed to fetch.` })}\n\n`);
                return res.end();
            }
        }

        // --- INDICATOR CALCULATION SETUP ---
        const calcLongInd1 = []; const calcLongInd2 = [];
        if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
            entryConds.longRules.forEach((rule, idx) => {
                calcLongInd1[idx] = calculateIndicator({ ...rule.ind1, params: extractParams(rule.ind1, rule.params) }, cachedData);
                calcLongInd2[idx] = calculateIndicator({ ...rule.ind2, params: extractParams(rule.ind2, null) }, cachedData);
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

        const calculateATM = (spotPrice, symbolStr) => {
            if (symbolStr.includes("BANK")) return Math.round(spotPrice / 100) * 100;
            return Math.round(spotPrice / 50) * 50;
        };

        const calcTradePnL = (entryP, exitP, qty, action) => {
            if (action === "BUY") return (exitP - entryP) * qty;
            return (entryP - exitP) * qty;
        };



        // =========================================================
        // ⏱️ THE MAIN CANDLE LOOP
        // =========================================================
        console.log(`\n🔍 [DEBUG] Strategy: ${strategy.name} | Legs Count: ${strategyLegs.length} | Entry Time: ${sTime} | Symbol: ${upperSymbol}\n`);
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

       // 🔥 NAYA PRICE ACTION LOGIC (THE MASTER FIX)
        let priceActionLongSignal = false;
        let priceActionShortSignal = false;

        // ✅ FIX: strategy.type को भी चेक करना ज़रूरी है क्योंकि DB में वहीं सेव है!
        if (strategy.type === "Price Action Based" || strategy.data?.type === "Price Action Based") {
            const slice = cachedData.slice(Math.max(0, i - 50), i + 1);
            const swings = identifySwings(slice);
            const setupType = strategy.data?.priceActionSettings?.setupType || "BOS (Break of Structure)";
            const paSignal = checkPriceActionSignal(slice, swings, setupType);
            priceActionLongSignal = paSignal.long;
            priceActionShortSignal = paSignal.short;
            
            // DEBUG लॉग
            if(i % 100 === 0) console.log(`🔎 Testing SMC Logic on Date: ${dateStr} | Signals: L=${priceActionLongSignal} S=${priceActionShortSignal}`);
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
                    }

                    // 🔥 THE FIX: Added isLegTrailed condition
                    if ((!isSlMovedToCost && slValue > 0) || isSlMovedToCost || isLegTrailed) {
                        if (spotTriggeredSl || (trade.transaction === "BUY" && trade.currentLow <= slPrice) || (trade.transaction === "SELL" && trade.currentHigh >= slPrice)) {
                            trade.markedForExit = true;
                            // 🔥 Naya naam taki logs aur UI me saaf pata chale ki Trail SL hit hua hai
                            trade.exitReason = isSlMovedToCost ? "SL_MOVED_TO_COST" : (isLegTrailed ? "LEG_TRAIL_SL" : "STOPLOSS");
                            trade.exitPrice = slPrice;
                            triggerReasonForExitAll = trade.exitReason;
                        }
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

                                const basePayload = {
                                    exchangeSegment: "NSE_FNO", interval: "1", securityId: Number(spotSecurityId), instrument: "OPTIDX",
                                    expiryFlag: expFlag, expiryCode: expCode,
                                    drvOptionType: optType === "CE" ? "CALL" : "PUT",
                                    requiredData: ["open", "high", "low", "close", "strike"],
                                    fromDate: dateStr, toDate: dateStr
                                };

                                const stepSize = (upperSymbol.includes("BANK") || upperSymbol.includes("SENSEX")) ? 100 : 50;

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

                                    let stepSize = 50; let decayFactor = 1.10; let baseMultiplier = 0.0125;
                                    if (upperSymbol.includes("BANK") || upperSymbol.includes("SENSEX")) {
                                        stepSize = 100; decayFactor = 1.15; baseMultiplier = 0.013;
                                    } else if (upperSymbol.includes("MID")) {
                                        stepSize = 25; decayFactor = 1.08; baseMultiplier = 0.012;
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

                    console.log(`🎯 [${completedTrade.exitType}] Date: ${dateStr} | Symbol: ${trade.symbol} | Exit: ${trade.exitPrice.toFixed(2)} | PnL: ${pnl.toFixed(2)}`);
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
                                    const stepSize = (upperSymbol.includes("BANK") || upperSymbol.includes("SENSEX")) ? 100 : 50;
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
                            // =========================================================================

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

            // 3. Asli Entry Loop (Brackets ko protect kiya gaya hai)
            if (shouldAttemptEntry) {
                const isLongSignal = activeSignalType === "LONG";

                // 🔥 NAYA CODE: Premium Diff check karne ke liye temporary memory
                let tempPendingTrades = [];
                let tempLtps = [];

                for (let legIndex = 0; legIndex < strategyLegs.length; legIndex++) {
                    const legData = strategyLegs[legIndex];

                    let tradeQuantity = legData.quantity;
                    if (!tradeQuantity || isNaN(tradeQuantity)) tradeQuantity = upperSymbol.includes("BANK") ? 30 : (upperSymbol.includes("NIFTY") ? 50 : 1);

                    const transActionTypeStr = (legData.action || "BUY").toUpperCase();
                    let activeOptionType = "";

                    if (isTimeBased) {
                        activeOptionType = (legData.optionType || "Call").toUpperCase().includes("C") ? "CE" : "PE";
                    } else {
                        // 🔥 FIX: finalLongSignal ki jagah ab humara smart isLongSignal use hoga
                        if (transActionTypeStr === "BUY") activeOptionType = isLongSignal ? "CE" : "PE";
                        else if (transActionTypeStr === "SELL") activeOptionType = isLongSignal ? "PE" : "CE";
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
                            entryReason: currentEntryReason // 🔥 NAYA TAG (Ise Jodna Hai)
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

        const backtestResult = {
            summary: {
                totalPnL: currentEquity,
                maxDrawdown,
                tradingDays: totalMarketDays,
                winDays,
                lossDays,
                // ✅ FIX: Ab Total trades me teeno judenge (Win + Loss + BreakEven)
                totalTrades: winTrades + lossTrades + breakEvenTrades,
                winTrades,
                lossTrades,
                breakEvenTrades, // ✅ Frontend ko direct data bhej diya
                maxWinStreak,
                maxLossStreak,
                maxProfit: maxProfitTrade,
                maxLoss: maxLossTrade
            },
            equityCurve: equityCurve,
            daywiseBreakdown: daywiseBreakdown
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