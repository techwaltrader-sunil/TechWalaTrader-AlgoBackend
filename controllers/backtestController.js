// const mongoose = require('mongoose');
// const Strategy = require('../models/Strategy');
// const HistoricalData = require('../models/HistoricalData');
// const Broker = require('../models/Broker');

// const { calculateIndicator, extractParams, evaluateCondition } = require('../services/indicatorService');
// const { getOptionSecurityId, sleep } = require('../services/instrumentService');
// const { fetchDhanHistoricalData, fetchExpiredOptionData } = require('../services/dhanService');

// // 🔥 IMPORTING ALL SHARED LOGIC MODULES
// const { evaluateTrailingSL } = require('../engine/features/riskManagement/trailingLogic');
// const { evaluateMtmLogic } = require('../engine/features/riskManagement/mtmSquareOff');
// const { evaluateExitAllLogic } = require('../engine/features/advanceFeatures/exitAllOnSlTgt');


// // =========================================================================
// // 🔥 THE MISSING DELAY & ANTI-THROTTLING ARMOR (Rollback se delete ho gaye the)
// // =========================================================================
// const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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


// const formatIndName = (ind) => {
//     if (!ind) return 'Value';
//     if (ind.display) {
//         const match = ind.display.match(/^([A-Za-z0-9_]+)\((\d+)/);
//         if (match) return `${match[1]}(${match[2]})`;
//         return ind.display.split(',')[0] + (ind.display.includes(',') ? ')' : '');
//     }
//     let name = ind.name || ind.id || 'Value';
//     let period = ind.params?.Period || ind.params?.period;
//     if (period) return `${name}(${period})`;
//     return name;
// };

// const runBacktestSimulator = async (req, res) => {
//     // 🔥 THE FIX: Node.js ka default 2-minute timeout band karo!
//     req.setTimeout(0);

//     // 🔥 1. SETUP SSE HEADERS (Streaming Mode ON)
//     res.setHeader('Content-Type', 'text/event-stream');
//     res.setHeader('Cache-Control', 'no-cache');
//     res.setHeader('Connection', 'keep-alive');
//     res.flushHeaders(); // Connection turant open karne ke liye


//     // ==========================================
//     // 💓 THE FIX: RENDER ANTI-SLEEP HEARTBEAT
//     // ==========================================
//     // Render ko har 25 second me ek 'Ping' bhejte raho taki wo connection na kaate
//     const heartbeat = setInterval(() => {
//         res.write(`: keep-alive-ping\n\n`); 
//     }, 25000);

//     // Agar user ne bich me tab band kar diya, to interval clear kar do
//     req.on('close', () => {
//         clearInterval(heartbeat);
//     });
//     // ==========================================

//     // Client ko batayenge ki engine start ho gaya hai
//     res.write(`data: ${JSON.stringify({ type: 'START', message: 'Engine warming up...' })}\n\n`);

//     try {
//         const { strategyId } = req.params;

//         const { period, start, end, slippage } = req.query;
//         // Default true manenge agar frontend se kuch nahi aaya
//         const useRealisticSlippage = slippage !== 'false';

//         const strategy = await Strategy.collection.findOne({ _id: new mongoose.Types.ObjectId(strategyId) });
//         if (!strategy) {
//             res.write(`data: ${JSON.stringify({ type: 'ERROR', message: 'Strategy not found' })}\n\n`);
//             res.end();
//             return;
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

//         let cachedData = await HistoricalData.find({
//             symbol: { $regex: new RegExp(cleanSymbolForMap, "i") }, timeframe, timestamp: { $gte: startDate, $lte: endDate }
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
//                 res.end();
//                 return;
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
//                 // 🔥 Frontend ko batao ki kya download ho raha hai
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
//             }

//             cachedData = await HistoricalData.find({ symbol: { $regex: new RegExp(cleanSymbolForMap, "i") }, timeframe, timestamp: { $gte: startDate, $lte: endDate } }).sort({ timestamp: 1 }).lean();
//             if (cachedData.length === 0) {
//                 res.write(`data: ${JSON.stringify({ type: 'ERROR', message: 'Spot Data not available for this period. Dhan API failed to fetch historical data.' })}\n\n`);
//                 res.end();
//                 return;
//             }
//         }

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

//         let exitConds = {};
//         const possibleExits = strategy.exitConditions || strategy.data?.exitConditions || strategy.data?.entrySettings?.exitConditions || [];
//         if (Array.isArray(possibleExits) && possibleExits.length > 0) exitConds = possibleExits[0];
//         else if (possibleExits && typeof possibleExits === 'object' && !Array.isArray(possibleExits)) exitConds = possibleExits;

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

//         let currentEquity = 0, peakEquity = 0, maxDrawdown = 0;
//         let winDays = 0, lossDays = 0, winTrades = 0, lossTrades = 0;
//         let currentWinStreak = 0, currentLossStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
//         let maxProfitTrade = 0, maxLossTrade = 0;
//         const equityCurve = []; const daywiseBreakdown = []; let dailyBreakdownMap = {};

//         let optionDataCache = {}; // 🔥 RAM CACHE (Super Fast Speed ke liye)

//         let openTrades = [];
//         const strategyLegs = strategy.legs || strategy.data?.legs || [];

//         // 🔥 FIX: Robustly map advance features (Database compatibility)
//         const advanceFeaturesSettings = strategy.data?.advanceSettings || strategy.advanceSettings || strategy.data?.advanceFeatures || strategy.advanceFeatures || {};
//         const riskSettings = strategy.data?.riskManagement || strategy.riskManagement || {};
//         const globalMaxProfit = Number(riskSettings.maxProfit) || 0;
//         const globalMaxLoss = Number(riskSettings.maxLoss) || 0;

//         // 🔥 FIX 1: DYNAMIC SQUARE-OFF TIME (UI se padhna)
//         const sqTime = strategy.config?.squareOff || strategy.data?.config?.squareOff || strategy.config?.squareOffTime || strategy.data?.config?.squareOffTime || "03:15 PM";
//         let exitMin = 915; // default 15:15
//         if (sqTime) {
//             const [eh, emStr] = sqTime.split(':');
//             if (emStr) {
//                 const em = emStr.split(' ')[0];
//                 let h = parseInt(eh);
//                 if (sqTime.toUpperCase().includes('PM') && h !== 12) h += 12;
//                 exitMin = h * 60 + parseInt(em);
//             }
//         }

//         let isTradingHaltedForDay = false;
//         let currentDayTracker = "";

//         const calculateATM = (spotPrice, symbolStr) => {
//             if (symbolStr.includes("BANK")) return Math.round(spotPrice / 100) * 100;
//             return Math.round(spotPrice / 50) * 50;
//         };

//         const calcTradePnL = (entryP, exitP, qty, action) => {
//             if (action === "BUY") return (exitP - entryP) * qty;
//             return (entryP - exitP) * qty;
//         };

//         // 🔥 NEW: SEBI COMPLIANT DATE CALCULATOR (WITH ORIGINAL UI FORMATTING)
//         const getNearestExpiryString = (tradeDateStr, symbolStr, reqExpiry = "WEEKLY") => {
//             const d = new Date(tradeDateStr);
//             const upSym = symbolStr.toUpperCase();
//             let expiryDate = new Date(d);

//             // 🔥 SEBI NEW RULE: Ab sabka Expiry TUESDAY (2) ho gaya hai!
//             const targetDay = 2;
//             let forceMonthly = false;

//             // NIFTY 50 ko chhodkar baki sab (Bank, Fin, Midcap) zabardasti Monthly hain
//             if (upSym.includes("BANK") || upSym.includes("FIN") || upSym.includes("MID")) {
//                 forceMonthly = true;
//             }

//             const upperReqExpiry = reqExpiry.toUpperCase();
//             const isMonthlyRequest = forceMonthly || upperReqExpiry === "MONTHLY";

//             if (!isMonthlyRequest) {
//                 // NIFTY 50 Weekly Logic (Target Day: Tuesday)
//                 while (expiryDate.getDay() !== targetDay) {
//                     expiryDate.setDate(expiryDate.getDate() + 1);
//                 }
//                 // Next Weekly Support
//                 if (upperReqExpiry === "NEXT WEEKLY" || upperReqExpiry === "NEXT WEEK") {
//                     expiryDate.setDate(expiryDate.getDate() + 7);
//                 }
//             } else {
//                 // MONTHLY LOGIC (For Bank/Fin/Midcap, or Nifty Monthly) -> Target Day: Last Tuesday
//                 const lastDayOfMonth = new Date(expiryDate.getFullYear(), expiryDate.getMonth() + 1, 0);
//                 expiryDate = new Date(lastDayOfMonth);

//                 // Find the last Tuesday of the month
//                 while (expiryDate.getDay() !== targetDay) {
//                     expiryDate.setDate(expiryDate.getDate() - 1);
//                 }

//                 // Agar aaj ka din is mahine ki expiry ke BAAD ka hai, to agle mahine ka Last Tuesday lo
//                 if (d > expiryDate) {
//                     const lastDayOfNextMonth = new Date(d.getFullYear(), d.getMonth() + 2, 0);
//                     expiryDate = new Date(lastDayOfNextMonth);
//                     while (expiryDate.getDay() !== targetDay) {
//                         expiryDate.setDate(expiryDate.getDate() - 1);
//                     }
//                 }
//             }

//             // Date ko format karna (e.g., 28APR26)
//             const formattedDate = `${String(expiryDate.getDate()).padStart(2, '0')}${expiryDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()}${String(expiryDate.getFullYear()).slice(-2)}`;

//             // 🔥 ORIGINAL UI FORMATTING (Aapke purane code se)
//             const today = new Date();
//             today.setHours(0, 0, 0, 0);
//             const expDateForCheck = new Date(expiryDate);
//             expDateForCheck.setHours(0, 0, 0, 0);

//             return `${(expDateForCheck < today) ? "EXP" : "Upcoming EXP"} ${formattedDate}`;
//         };



//         for (let i = 0; i < cachedData.length; i++) {
//             if (i % 500 === 0) await new Promise(resolve => setImmediate(resolve));

//             const candle = cachedData[i];
//             const candleTime = new Date(candle.timestamp).getTime();
//             const istDate = new Date(candleTime + (5.5 * 60 * 60 * 1000));
//             const h = String(istDate.getUTCHours()).padStart(2, '0');
//             const m = String(istDate.getUTCMinutes()).padStart(2, '0');
//             const timeInMinutes = (istDate.getUTCHours() * 60) + istDate.getUTCMinutes();
//             const dateStr = istDate.toISOString().split('T')[0];

//             if (dateStr !== currentDayTracker) {
//                 currentDayTracker = dateStr;
//                 isTradingHaltedForDay = false;

//                 // 🔥 THE RAM SAVER: Har naye din pichle din ka kachra saaf karo!
//                 optionDataCache = {};

//                 // 🔥 2. SEND LIVE PROGRESS TO UI (Day-by-Day)
//                 const expectedTotalDays = Math.max(1, (endDate - startDate) / (1000 * 60 * 60 * 24));
//                 const daysPassed = Math.max(0, (istDate - startDate) / (1000 * 60 * 60 * 24));
//                 let livePercent = Math.min(95, Math.round((daysPassed / expectedTotalDays) * 100));
                
//                 // Frontend ko exact date aur percentage stream karo
//                 res.write(`data: ${JSON.stringify({ type: 'PROGRESS', date: dateStr, percent: livePercent })}\n\n`);
//             }

//             if (!dailyBreakdownMap[dateStr]) dailyBreakdownMap[dateStr] = { pnl: 0, trades: 0, tradesList: [], hasTradedTimeBased: false };

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

//             const isTimeBased = (strategy.config?.strategyType === 'Time Based' || strategy.data?.config?.strategyType === 'Time Based' || strategy.type === 'Time Based');

//             if (isTimeBased) {
//                 const sTime = strategy.startTime || strategy.config?.startTime || strategy.data?.config?.startTime || strategy.entrySettings?.startTime || strategy.data?.entrySettings?.startTime;

//                 if (sTime) {
//                     const [sh, sm] = sTime.split(':');
//                     let startMin = parseInt(sh) * 60 + parseInt(sm.split(' ')[0]);
//                     if (sTime.toUpperCase().includes('PM') && parseInt(sh) !== 12) startMin += 720;

//                     if (timeInMinutes >= startMin && !dailyBreakdownMap[dateStr].hasTradedTimeBased) {
//                         longSignal = true;
//                         dailyBreakdownMap[dateStr].hasTradedTimeBased = true;
//                     }
//                 }
//             }

//             const txnType = strategy.config?.transactionType || strategy.data?.config?.transactionType || 'Both Side';
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

//             // Using the dynamic exitMin defined earlier
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
//                     let currentOpen = spotClosePrice; // Extracted for Time-Squareoff

//                     if (isOptionsTrade && trade.premiumChart && trade.premiumChart.start_Time) {
//                         let exactMatchIndex = trade.premiumChart.start_Time.findIndex(t => {
//                             const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                             return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                         });

//                         // 🔥 FIX 2: GHOST CANDLE VOLATILITY FIX (Bawandar Fix)
//                         let isFallbackCandle = false;
//                         if (exactMatchIndex === -1) {
//                             let nearestIdx = -1;
//                             for (let k = trade.premiumChart.start_Time.length - 1; k >= 0; k--) {
//                                 const optTime = new Date(trade.premiumChart.start_Time[k] * 1000 + (5.5 * 60 * 60 * 1000));
//                                 if (optTime <= istDate) { nearestIdx = k; break; }
//                             }
//                             exactMatchIndex = nearestIdx;
//                             isFallbackCandle = true;
//                         }

//                         if (exactMatchIndex !== -1) {
//                             let tempClose = trade.premiumChart.close[exactMatchIndex];
//                             if (tempClose > spotClosePrice * 0.5) {
//                                 currentClose = trade.lastKnownPremium || trade.entryPrice;
//                                 currentHigh = currentLow = currentOpen = currentClose;
//                             } else {
//                                 currentClose = tempClose;
//                                 if (isFallbackCandle) {
//                                     // Flatline logic
//                                     currentHigh = tempClose;
//                                     currentLow = tempClose;
//                                     currentOpen = tempClose;
//                                 } else {
//                                     currentHigh = trade.premiumChart.high[exactMatchIndex];
//                                     currentLow = trade.premiumChart.low[exactMatchIndex];
//                                     currentOpen = trade.premiumChart.open[exactMatchIndex];
//                                 }
//                                 trade.lastKnownPremium = currentClose;
//                             }
//                         } else {
//                             currentClose = trade.lastKnownPremium || trade.entryPrice;
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


//                 // 🔥 FIX 3: MOVE SL TO COST TRACKERS
//                 let anyLegHitSlPast = dailyBreakdownMap[dateStr].tradesList.some(t => t.exitType === "STOPLOSS" || t.exitType === "SL_MOVED_TO_COST");
//                 let anyLegHitSlThisTick = false;

//                 // 🔥 THE GATEKEEPER PARADOX FIX (No more 'ThisTick' fake triggers)
//                 // Jab tak Gatekeeper verify karke tradesList me SL hit nahi daal deta, dusra leg cost par nahi aayega!
//                 let isSlMovedToCostGlobal = dailyBreakdownMap[dateStr].tradesList.some(t => t.exitType === "STOPLOSS" || t.exitType === "SL_MOVED_TO_COST");

//                 openTrades.forEach((trade, idx) => {
//                     if (trade.markedForExit) return;

//                     if (hitGlobalMaxProfit || hitGlobalMaxLoss) {
//                         trade.markedForExit = true;
//                         trade.exitReason = hitGlobalMaxProfit ? "MAX_PROFIT" : "MAX_LOSS";
//                         if (hitGlobalMaxLoss && globalMaxLoss > 0) {
//                             const exactLossPoints = globalMaxLoss / trade.quantity;
//                             trade.exitPrice = trade.transaction === "BUY" ? (trade.entryPrice - exactLossPoints) : (trade.entryPrice + exactLossPoints);
//                         } else if (hitGlobalMaxProfit && globalMaxProfit > 0) {
//                             const exactProfitPoints = globalMaxProfit / trade.quantity;
//                             trade.exitPrice = trade.transaction === "BUY" ? (trade.entryPrice + exactProfitPoints) : (trade.entryPrice - exactProfitPoints);
//                         } else {
//                             trade.exitPrice = trade.currentPrice;
//                         }
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

//                     // Spot-Delta Tracker
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

//                     if ((!isSlMovedToCost && slValue > 0) || isSlMovedToCost) {
//                         if (spotTriggeredSl || (trade.transaction === "BUY" && trade.currentLow <= slPrice) || (trade.transaction === "SELL" && trade.currentHigh >= slPrice)) {
//                             trade.markedForExit = true;
//                             trade.exitReason = isSlMovedToCost ? "SL_MOVED_TO_COST" : "STOPLOSS";
//                             trade.exitPrice = slPrice;
//                             triggerReasonForExitAll = "STOPLOSS";
//                             // 🔥 Yahan se 'anyLegHitSlThisTick = true' humesha ke liye delete kar diya gaya hai!
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
//                                 trade.markedForExit = true; trade.exitReason = "TRAILING_SL"; trade.exitPrice = trade.trailingSL;
//                                 triggerReasonForExitAll = "TRAILING_SL";
//                             }
//                         }
//                     }

//                     if (!trade.markedForExit) {
//                         if ((trade.signalType === "LONG" && exitLongSignal) || (trade.signalType === "SHORT" && exitShortSignal)) {
//                             trade.markedForExit = true; trade.exitReason = "INDICATOR_EXIT"; trade.exitPrice = trade.currentPrice;
//                         }
//                     }
//                 });




//                 if (triggerReasonForExitAll && !hitGlobalMaxProfit && !hitGlobalMaxLoss) {
//                     const exitAllCheck = evaluateExitAllLogic(advanceFeaturesSettings, triggerReasonForExitAll);
//                     if (exitAllCheck.shouldExitAll) {
//                         openTrades.forEach(trade => {
//                             if (!trade.markedForExit) {
//                                 trade.markedForExit = true;
//                                 trade.exitReason = exitAllCheck.exitReason;
//                                 trade.exitPrice = trade.currentPrice;
//                             }
//                         });
//                     }
//                 }


//                 let remainingTrades = [];
//                 for (let trade of openTrades) {
//                     if (trade.markedForExit || isExitTime || isLastCandleOfDay) {
//                         if (!trade.markedForExit) {
//                             trade.exitReason = isLastCandleOfDay ? "EOD_SQUAREOFF" : "TIME_SQUAREOFF";
//                         }

//                         // =========================================================================
//                         // 🔴 THE SNIPER GATEKEEPER (WITH SUPER-FAST RAM CACHE) 🔴
//                         // =========================================================================
//                         const needsMarketPrice = ["TIME_SQUAREOFF", "EOD_SQUAREOFF", "INDICATOR_EXIT", "MAX_PROFIT", "MAX_LOSS", "EXIT_ALL_TGT", "EXIT_ALL_SL", "STOPLOSS", "TARGET", "TRAILING_SL", "SL_MOVED_TO_COST"].includes(trade.exitReason);
                        
//                         let fakeTriggerRejected = false;

//                         if (isOptionsTrade && broker && needsMarketPrice && trade.optionConfig) {
//                             // 🌟 X-RAY FIX 1: Ensure fixedStrike is strictly a Number to prevent "===" failure!
//                             const fixedStrike = Number(trade.optionConfig.strike);
//                             const optType = trade.optionConfig.type; 
//                             const exitTimeStr = `${h}:${m}`;
//                             const cacheKey = `${fixedStrike}_${optType}_${dateStr}`; 
                            
//                             let exitData = null;
//                             let actualExitIndex = -1;
//                             let foundExactExit = false;

//                             // ⚡ 1. CHECK RAM CACHE FIRST (0 Milliseconds, No API Spam)
//                             if (optionDataCache[cacheKey]) {
//                                 let cachedChart = optionDataCache[cacheKey];
//                                 for(let k=0; k<cachedChart.timestamp.length; k++){
//                                     const optTime = new Date(cachedChart.timestamp[k] * 1000 + (5.5 * 3600000));
//                                     if(optTime.toISOString().split('T')[1].substring(0, 5) === exitTimeStr) { 
//                                         // 🌟 X-RAY FIX 2: Check if cached Rolling Chart STILL matches our strike at this exact minute!
//                                         if (cachedChart.strike && Number(cachedChart.strike[k]) === fixedStrike) {
//                                             actualExitIndex = k; 
//                                             exitData = cachedChart;
//                                             foundExactExit = true;
//                                         }
//                                         break; 
//                                     }
//                                 }
//                             } 
                            
//                            // 🐢 2. IF NOT IN CACHE, CALL API (O(1) Anchor Method with Ghost Protocol)
//                             if (!foundExactExit) {
//                                 const axios = require('axios'); 
//                                 const https = require('https');
                                
//                                 // 🔥 THE GHOST PROTOCOL (Render IP WAF Bypass)
//                                 const keepAliveAgent = new https.Agent({ keepAlive: true, rejectUnauthorized: false });
//                                 const ghostHeaders = { 
//                                     'access-token': broker.apiSecret, 
//                                     'client-id': broker.clientId, 
//                                     'Content-Type': 'application/json',
//                                     'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
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
//                                         timeout: 8000 // 🌟 Time extended for slow Dhan backend
//                                     });
                                    
//                                     const optKey = optType === "CE" ? "ce" : "pe";
//                                     let atmExitData = atmRes.data && atmRes.data.data ? atmRes.data.data[optKey] : null;

//                                     if (atmExitData && atmExitData.timestamp) {
//                                         for(let k=0; k<atmExitData.timestamp.length; k++){
//                                             const optTime = new Date(atmExitData.timestamp[k] * 1000 + (5.5 * 3600000));
//                                             if(optTime.toISOString().split('T')[1].substring(0, 5) === exitTimeStr) { 
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
//                                     console.log(`⚠️ Anchor ATM fetch failed or timed out. Using Fallback Spot math.`);
//                                 }

//                                 if (!foundExactExit) {
//                                     const referenceAtm = dhanActualAtm ? dhanActualAtm : calculateATM(spotClosePrice, upperSymbol);
//                                     const strikeDiff = fixedStrike - referenceAtm; 
//                                     const exactStep = Math.round(strikeDiff / stepSize); 

//                                     // Strictly 3 Requests ONLY
//                                     let candidates = [
//                                         `ITM${exactStep}`,     
//                                         `ITM${exactStep + 1}`, 
//                                         `ITM${exactStep - 1}`  
//                                     ];

//                                     let retryCount = 0; 
//                                     for(let c = 0; c < candidates.length; c++) {
//                                         let guess = candidates[c];
//                                         await delay(300); 
                                        
//                                         try {
//                                             const exitRes = await axios.post('https://api.dhan.co/v2/charts/rollingoption', { ...basePayload, strike: guess }, {
//                                                 headers: ghostHeaders,
//                                                 httpsAgent: keepAliveAgent,
//                                                 timeout: 8000 // 🌟 Prevents premature connection drops
//                                             });
                                            
//                                             retryCount = 0; 
                                            
//                                             const optKey = optType === "CE" ? "ce" : "pe";
//                                             let tempExitData = exitRes.data && exitRes.data.data ? exitRes.data.data[optKey] : null;

//                                             if (tempExitData && tempExitData.timestamp) {
//                                                 let tempIndex = -1;
//                                                 for(let k=0; k<tempExitData.timestamp.length; k++){
//                                                     const optTime = new Date(tempExitData.timestamp[k] * 1000 + (5.5 * 3600000));
//                                                     if(optTime.toISOString().split('T')[1].substring(0, 5) === exitTimeStr) { tempIndex = k; break; }
//                                                 }
                                                
//                                                 if(tempIndex !== -1 && tempExitData.strike && Number(tempExitData.strike[tempIndex]) === fixedStrike) {
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
//                                                     console.log(`🛑 Sniper API Drop (Status: ${status}) for ${guess}. Retrying once...`);
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

//                             // 🛡️ 3. GATEKEEPER VALIDATION (Uses 0ms Cached Data)
//                             if (foundExactExit && exitData) {
//                                 const mathPrice = trade.exitPrice; 
//                                 const cOpen = exitData.open[actualExitIndex];
//                                 const cHigh = exitData.high[actualExitIndex];
//                                 const cLow = exitData.low[actualExitIndex];
//                                 const cClose = exitData.close[actualExitIndex];

//                                 let isValidTrigger = true;
//                                 if (["STOPLOSS", "TRAILING_SL", "SL_MOVED_TO_COST"].includes(trade.exitReason)) {
//                                     if (trade.transaction === "BUY" && cLow > mathPrice) isValidTrigger = false; 
//                                     if (trade.transaction === "SELL" && cHigh < mathPrice) isValidTrigger = false; 
//                                 } else if (trade.exitReason === "TARGET") {
//                                     if (trade.transaction === "BUY" && cHigh < mathPrice) isValidTrigger = false;
//                                     if (trade.transaction === "SELL" && cLow > mathPrice) isValidTrigger = false;
//                                 }

//                                 // 🔥 THE FLATLINE DETECTOR (Dhan API Bug Fix)
//                                 let isFlatline = false;
//                                 if (["TIME_SQUAREOFF", "EOD_SQUAREOFF"].includes(trade.exitReason)) {
//                                     // Agar Dhan API ne dead candle bheja jiska price entry price se exactly match ho raha hai
//                                     if (cOpen === trade.entryPrice || cClose === trade.entryPrice) {
//                                         isFlatline = true; // Yeh mara hua data hai!
//                                     }
//                                 }

//                                 if (!isValidTrigger || isFlatline) {
//                                     fakeTriggerRejected = true;
//                                 } else {
//                                     // 🔥 THE MISSING LINK FIX: Sirf SL/Target ke liye Slippage logic chalega
//                                     if (["STOPLOSS", "TARGET", "TRAILING_SL", "SL_MOVED_TO_COST"].includes(trade.exitReason)) {
                                        
//                                         // FrontEnd Toggle check
//                                         if (!useRealisticSlippage) {
//                                             trade.exitPrice = cOpen; 
//                                         } else {
//                                             if (trade.transaction === "BUY") {
//                                                 if (["STOPLOSS", "TRAILING_SL", "SL_MOVED_TO_COST"].includes(trade.exitReason) && cOpen < mathPrice) trade.exitPrice = cOpen;
//                                                 else if (trade.exitReason === "TARGET" && cOpen > mathPrice) trade.exitPrice = cOpen;
//                                                 else trade.exitPrice = mathPrice; 
//                                             } else { 
//                                                 if (["STOPLOSS", "TRAILING_SL", "SL_MOVED_TO_COST"].includes(trade.exitReason) && cOpen > mathPrice) trade.exitPrice = cOpen;
//                                                 else if (trade.exitReason === "TARGET" && cOpen < mathPrice) trade.exitPrice = cOpen;
//                                                 else trade.exitPrice = mathPrice; 
//                                             }
//                                         }
                                        
//                                     } else {
//                                         trade.exitPrice = trade.exitReason === "TIME_SQUAREOFF" ? cOpen : cClose;
//                                     }
//                                 }
//                             }
                            
//                             // 🚀 4. SILENT GATEKEEPER REJECTION (Ghost Buster Fixed)
//                             if (fakeTriggerRejected) {
//                                 if (isExitTime || isLastCandleOfDay) {
//                                     // Agar market band ho raha hai, to reject mat karo! Force Square-off karo!
//                                     trade.exitReason = isLastCandleOfDay ? "EOD_SQUAREOFF" : "TIME_SQUAREOFF";
//                                     trade.exitPrice = null; // 🌟 THE ZOMBIE KILLER: Purana fake price delete karo!
//                                     foundExactExit = false; // 🔥 FORCE THE QUANT CHEF TO COOK!
//                                 } else {
//                                     trade.markedForExit = false;
//                                     trade.exitReason = null;
//                                     trade.exitPrice = null;
//                                     remainingTrades.push(trade);
//                                     continue; 
//                                 }
//                             }

//                             // 🚨 5. ILLIQUID MINUTE & SMART FALLBACK (THE QUANT CHEF)
//                             if (!foundExactExit) {
//                                 if (["STOPLOSS", "TARGET", "TRAILING_SL", "SL_MOVED_TO_COST"].includes(trade.exitReason)) {
//                                     if (isExitTime || isLastCandleOfDay) {
//                                         // Market closing time pe Data na mile, to usko Force Square-off me convert kar do
//                                         trade.exitReason = isLastCandleOfDay ? "EOD_SQUAREOFF" : "TIME_SQUAREOFF";
//                                         trade.exitPrice = null; // 🌟 THE ZOMBIE KILLER: Yahan bhi purana price delete karo!
//                                     } else {
//                                         trade.markedForExit = false;
//                                         trade.exitReason = null;
//                                         trade.exitPrice = null;
//                                         remainingTrades.push(trade);
//                                         continue; 
//                                     }
//                                 } 
                                
//                                 // 👨‍🍳 THE QUANT CHEF ESTIMATOR (Intrinsic + Theta Decay Math)
//                                 // Ab kyunki humne trade.exitPrice ko 'null' kar diya hai, Chef 100% kaam karega!
//                                 if (!trade.exitPrice) {
//                                     const currentAtmAtFallback = calculateATM(spotClosePrice, upperSymbol);
                                    
//                                     // 🔥 MICHELIN STAR CHEF UPGRADE (Calibrated for Indian Markets)
//                                     let stepSize = 50; let decayFactor = 1.10; let baseMultiplier = 0.0125; // Nifty Defaults
//                                     if (upperSymbol.includes("BANK") || upperSymbol.includes("SENSEX")) { 
//                                         stepSize = 100; decayFactor = 1.15; baseMultiplier = 0.013; 
//                                     } else if (upperSymbol.includes("MID")) { 
//                                         stepSize = 25; decayFactor = 1.08; baseMultiplier = 0.012; 
//                                     }

//                                     const stepDiff = Math.round(Math.abs(fixedStrike - currentAtmAtFallback) / stepSize);
                                    
//                                     let intrinsicValue = 0;
//                                     if (optType === "CE") intrinsicValue = Math.max(0, spotClosePrice - fixedStrike);
//                                     else intrinsicValue = Math.max(0, fixedStrike - spotClosePrice);

//                                     // 📅 Calculate Days to Expiry (DTE) for Realistic Theta
//                                     let dte = 0;
//                                     try {
//                                         const expMatch = trade.symbol.match(/EXP (\d{2}[A-Z]{3}\d{2})/i);
//                                         if (expMatch && expMatch[1]) {
//                                             const expDay = parseInt(expMatch[1].substring(0, 2));
//                                             const monthStr = expMatch[1].substring(2, 5);
//                                             const expYear = parseInt("20" + expMatch[1].substring(5, 7));
//                                             const monthMap = {JAN:0, FEB:1, MAR:2, APR:3, MAY:4, JUN:5, JUL:6, AUG:7, SEP:8, OCT:9, NOV:10, DEC:11};
//                                             const expDateObj = new Date(expYear, monthMap[monthStr.toUpperCase()], expDay, 15, 30, 0);
                                            
//                                             const diffTime = expDateObj.getTime() - istDate.getTime();
//                                             dte = Math.max(0, diffTime / (1000 * 60 * 60 * 24)); 
//                                         }
//                                     } catch(e) { dte = 1; }

//                                     // 🧮 Black-Scholes Proxy: Adapted for Indian Average VIX
//                                     let estimatedAtmPremium = 0;
//                                     if (dte >= 1) {
//                                         estimatedAtmPremium = spotClosePrice * baseMultiplier * Math.sqrt(dte / 7);
//                                     } else {
//                                         const minutesLeft = Math.max(0, 930 - timeInMinutes); 
//                                         estimatedAtmPremium = spotClosePrice * (baseMultiplier / 2) * Math.sqrt(minutesLeft / 375); 
//                                     }

//                                     // 📉 Apply Realistic OTM/ITM Step Decay
//                                     const estimatedTimeValue = estimatedAtmPremium / Math.pow(decayFactor, stepDiff);
                                    
//                                     // 🍽️ Serve the Exact Mathematical Price!
//                                     trade.exitPrice = intrinsicValue + estimatedTimeValue;
//                                 }
//                             }
//                         }
//                         // =========================================================================

//                         const pnl = calcTradePnL(trade.entryPrice, trade.exitPrice, trade.quantity, trade.transaction);

//                         const completedTrade = {
//                             ...trade,
//                             exitTime: `${h}:${m}:00`,
//                             pnl: pnl,
//                             exitType: trade.exitReason
//                         };

//                         dailyBreakdownMap[dateStr].tradesList.push(completedTrade);
//                         dailyBreakdownMap[dateStr].pnl += pnl;
//                         dailyBreakdownMap[dateStr].trades += 1;
//                         if (pnl > 0) { winTrades++; if (pnl > maxProfitTrade) maxProfitTrade = pnl; }
//                         else { lossTrades++; if (pnl < maxLossTrade) maxLossTrade = pnl; }

//                         console.log(`🎯 [${completedTrade.exitType}] Date: ${dateStr} | Symbol: ${trade.symbol} | Exit: ${trade.exitPrice.toFixed(2)} | PnL: ${pnl.toFixed(2)}`);
//                     } else {
//                         remainingTrades.push(trade);
//                     }
//                 }

//                 openTrades = remainingTrades;


//             }
//             else if (!isTradingHaltedForDay) {
//                 const mtmResult = evaluateMtmLogic(dailyBreakdownMap[dateStr].pnl, 0, riskSettings);
//                 if (mtmResult.isHalted) {
//                     isTradingHaltedForDay = true;
//                     console.log(mtmResult.logMessage);
//                 }
//             }


//             // =========================================================
//             // 🔥 2. MULTI-LEG ENTRY LOGIC (THE SMART ROUTER)
//             // =========================================================
//             if (openTrades.length === 0 && isMarketOpen && !isTradingHaltedForDay && (finalLongSignal || finalShortSignal)) {

//                 for (let legIndex = 0; legIndex < strategyLegs.length; legIndex++) {
//                     const legData = strategyLegs[legIndex];

//                     let tradeQuantity = legData.quantity;
//                     if (!tradeQuantity || isNaN(tradeQuantity)) tradeQuantity = upperSymbol.includes("BANK") ? 30 : (upperSymbol.includes("NIFTY") ? 50 : 1);

//                     const transActionTypeStr = (legData.action || "BUY").toUpperCase();
//                     let activeOptionType = "";

//                     if (isTimeBased) {
//                         activeOptionType = (legData.optionType || "Call").toUpperCase().includes("C") ? "CE" : "PE";
//                     } else {
//                         if (transActionTypeStr === "BUY") activeOptionType = finalLongSignal ? "CE" : "PE";
//                         else if (transActionTypeStr === "SELL") activeOptionType = finalLongSignal ? "PE" : "CE";
//                     }

//                     let finalEntryPrice = isOptionsTrade ? 0 : spotClosePrice;
//                     let validTrade = true;
//                     let premiumChartData = null;
//                     let targetStrike = calculateATM(spotClosePrice, upperSymbol);
//                     const strikeCriteria = legData.strikeCriteria || "ATM pt";
//                     const strikeType = legData.strikeType || "ATM";
//                     const reqExpiry = legData.expiry || "WEEKLY";

//                     const expiryLabel = getNearestExpiryString(dateStr, upperSymbol, reqExpiry);
//                     let tradeSymbol = `${upperSymbol} ${targetStrike} ${activeOptionType} (${expiryLabel})`;

//                     if (isOptionsTrade && broker) {
//                         let apiSuccess = false;

//                         // 🔥 EXTRACT EXPECTED DATE (e.g., "28 APR") TO VERIFY LIVE ID
//                         const targetExpStr = expiryLabel.split('EXP ')[1]; // "28APR26"
//                         const expectedDay = targetExpStr.substring(0, 2); // "28"
//                         const expectedMonth = targetExpStr.substring(2, 5); // "APR"
//                         const expectedDhanDateStr = `${expectedDay} ${expectedMonth}`; // "28 APR"

//                         // 🟢 STEP 1: SMART LIVE API CHECK (For Fixed Strike Accuracy)
//                         const optionConfig = getOptionSecurityId(upperSymbol, spotClosePrice, strikeCriteria, strikeType, activeOptionType, reqExpiry);

//                         // Check if Live ID exists AND it matches our required historical date!
//                         if (optionConfig && optionConfig.strike && optionConfig.tradingSymbol.includes(expectedDhanDateStr)) {
//                             targetStrike = optionConfig.strike;
//                             // UI text ko sundar rakhne ke liye tradeSymbol overwrite nahi karenge
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

//                         // 🔴 STEP 2: FALLBACK TO ROLLING API (Only for deleted/expired Weekly contracts)
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

//                         // Strict Validation
//                         if (!apiSuccess || finalEntryPrice === 0) {
//                             validTrade = false;
//                             console.log(`❌ Trade Canceled: API failed for ${tradeSymbol} on ${dateStr}`);
//                         } else if (finalEntryPrice > spotClosePrice * 0.5) {
//                             validTrade = false;
//                             console.log(`❌ Trade Canceled: Spot Price returned instead of Premium for ${tradeSymbol}`);
//                         }
//                     }

//                     if (validTrade) {
//                         openTrades.push({
//                             id: `leg_${legIndex}`,
//                             legConfig: legData,
//                             symbol: tradeSymbol,
//                             transaction: transActionTypeStr,
//                             quantity: tradeQuantity,
//                             entryTime: `${h}:${m}:00`,
//                             entryPrice: finalEntryPrice,
//                             exitTime: null, exitPrice: null, pnl: null, exitType: null,
//                             optionConfig: isOptionsTrade ? { strike: targetStrike, type: activeOptionType } : null,
//                             premiumChart: premiumChartData,
//                             signalType: finalLongSignal ? "LONG" : "SHORT",
//                             lastKnownPremium: finalEntryPrice,
//                             markedForExit: false
//                         });
//                         console.log(`✅ [TRADE OPEN] Leg ${legIndex + 1} | Time: ${h}:${m} | Spot: ${spotClosePrice} | Premium: ${finalEntryPrice} | Type: ${activeOptionType}`);
//                     }
//                 }
//             }
//         }

//         // ==========================================
//         // 🧮 5. DAILY LOOP (Metrics Generation)
//         // ==========================================
//         let totalMarketDays = Object.keys(dailyBreakdownMap).length;

//         for (const [date, data] of Object.entries(dailyBreakdownMap)) {
//             currentEquity += data.pnl;
//             if (currentEquity > peakEquity) peakEquity = currentEquity;
//             const drawdown = currentEquity - peakEquity;
//             if (drawdown < maxDrawdown) maxDrawdown = drawdown;

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
//                 totalPnL: currentEquity, maxDrawdown, tradingDays: totalMarketDays, winDays, lossDays,
//                 totalTrades: winTrades + lossTrades, winTrades, lossTrades, maxWinStreak, maxLossStreak,
//                 maxProfit: maxProfitTrade, maxLoss: maxLossTrade
//             },
//             equityCurve,
//             daywiseBreakdown: daywiseBreakdown.reverse()
//         };

//         // return res.status(200).json({ success: true, data: backtestResult });

//         // 🔥 3. SEND FINAL DATA & CLOSE STREAM
//         clearInterval(heartbeat); // 💓 Heartbeat band karo
//         res.write(`data: ${JSON.stringify({ type: 'COMPLETE', data: backtestResult })}\n\n`);
//         res.end(); // Stream safely closed!

//     } catch (error) {
//         console.error("Backtest Error:", error);

//         // res.status(500).json({ success: false, error: "Internal Server Error" });

//         // 🔥 4. SMART ERROR PROTOCOL: Server crash na kare, client ko error bhej kar stream band kare
//         clearInterval(heartbeat); // 💓 Heartbeat band karo
//         let errorMsg = "Internal Server Error";
//         if (error.response && error.response.status === 429) errorMsg = "Broker API Rate Limit Exceeded";
//         else if (error.message) errorMsg = error.message;

//         res.write(`data: ${JSON.stringify({ type: 'ERROR', message: errorMsg })}\n\n`);
//         res.end(); // Stream safely closed!
//     }
// };

// module.exports = { runBacktestSimulator };


// const mongoose = require('mongoose');
// const Strategy = require('../models/Strategy');
// const HistoricalData = require('../models/HistoricalData');
// const Broker = require('../models/Broker');
// const BacktestCache = require('../models/BacktestCache'); // 🔥 THE CACHE GODOWN

// const { calculateIndicator, extractParams, evaluateCondition } = require('../services/indicatorService');
// const { getOptionSecurityId, sleep } = require('../services/instrumentService');
// const { fetchDhanHistoricalData, fetchExpiredOptionData } = require('../services/dhanService');

// // 🔥 IMPORTING ALL SHARED LOGIC MODULES
// const { evaluateTrailingSL } = require('../engine/features/riskManagement/trailingLogic');
// const { evaluateMtmLogic } = require('../engine/features/riskManagement/mtmSquareOff');
// const { evaluateExitAllLogic } = require('../engine/features/advanceFeatures/exitAllOnSlTgt');


// // =========================================================================
// // 🔥 DELAY & ANTI-THROTTLING ARMOR
// // =========================================================================
// const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

// const formatIndName = (ind) => {
//     if (!ind) return 'Value';
//     if (ind.display) {
//         const match = ind.display.match(/^([A-Za-z0-9_]+)\((\d+)/);
//         if (match) return `${match[1]}(${match[2]})`;
//         return ind.display.split(',')[0] + (ind.display.includes(',') ? ')' : '');
//     }
//     let name = ind.name || ind.id || 'Value';
//     let period = ind.params?.Period || ind.params?.period;
//     if (period) return `${name}(${period})`;
//     return name;
// };

// const runBacktestSimulator = async (req, res) => {
//     // 🔥 THE FIX: Node.js ka default 2-minute timeout band karo!
//     req.setTimeout(0);

//     // 🔥 1. SETUP SSE HEADERS (Streaming Mode ON)
//     res.setHeader('Content-Type', 'text/event-stream');
//     res.setHeader('Cache-Control', 'no-cache');
//     res.setHeader('Connection', 'keep-alive');
//     res.flushHeaders(); 

//     // ==========================================
//     // 💓 THE FIX: RENDER ANTI-SLEEP HEARTBEAT
//     // ==========================================
//     const heartbeat = setInterval(() => {
//         res.write(`: keep-alive-ping\n\n`); 
//     }, 25000);

//     req.on('close', () => {
//         clearInterval(heartbeat);
//     });
//     // ==========================================

//     res.write(`data: ${JSON.stringify({ type: 'START', message: 'Engine warming up...' })}\n\n`);

//     try {
//         const { strategyId } = req.params;
//         const { period, start, end, slippage } = req.query;
//         const useRealisticSlippage = slippage !== 'false';

//         const strategy = await Strategy.collection.findOne({ _id: new mongoose.Types.ObjectId(strategyId) });
//         if (!strategy) {
//             res.write(`data: ${JSON.stringify({ type: 'ERROR', message: 'Strategy not found' })}\n\n`);
//             res.end();
//             return;
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

//         const originalStartDate = new Date(startDate); // Cache save karne ke liye

//         // =========================================================
//         // ⚡ ABSOLUTE DATE CACHING (0-Second Delivery)
//         // =========================================================
//         if (period !== 'Custom') {
//             const existingCache = await BacktestCache.findOne({ strategyId: strategy._id, period: period }).lean();
            
//             if (existingCache && existingCache.summary) {
//                 console.log(`📦 Cache Hit! Serving ${period} data instantly for ${strategy.name}`);
                
//                 res.write(`data: ${JSON.stringify({ type: 'PROGRESS', date: `Loading cached results for ${period}...`, percent: 100 })}\n\n`);
                
//                 const finalResultForUI = {
//                     summary: existingCache.summary,
//                     equityCurve: existingCache.equityCurve,
//                     daywiseBreakdown: [...existingCache.daywiseBreakdown].reverse() // UI ko reverse chahiye
//                 };
                
//                 clearInterval(heartbeat);
//                 res.write(`data: ${JSON.stringify({ type: 'COMPLETE', data: finalResultForUI })}\n\n`);
//                 res.end();
//                 return; // Yahin se function khatam! Baki ka engine nahi chalega.
//             }
//         }
//         // =========================================================


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

//         let cachedData = await HistoricalData.find({
//             symbol: { $regex: new RegExp(cleanSymbolForMap, "i") }, timeframe, timestamp: { $gte: startDate, $lte: endDate }
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
//                 res.end();
//                 return;
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
//                 // 🐜 THE ANT STRATEGY: UI Update
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
//                     // Flush to DB immediately
//                     if (bulkOps.length > 0) await HistoricalData.bulkWrite(bulkOps, { ordered: false }).catch(e => console.log("Duplicates ignored"));
//                 }
                
//                 // 🐜 THE ANT STRATEGY: 1.5 Second Sleep for API/RAM safety
//                 await delay(1500); 
//             }

//             cachedData = await HistoricalData.find({ symbol: { $regex: new RegExp(cleanSymbolForMap, "i") }, timeframe, timestamp: { $gte: startDate, $lte: endDate } }).sort({ timestamp: 1 }).lean();
//             if (cachedData.length === 0) {
//                 res.write(`data: ${JSON.stringify({ type: 'ERROR', message: 'Spot Data not available for this period. Dhan API failed to fetch historical data.' })}\n\n`);
//                 res.end();
//                 return;
//             }
//         }

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

//         let exitConds = {};
//         const possibleExits = strategy.exitConditions || strategy.data?.exitConditions || strategy.data?.entrySettings?.exitConditions || [];
//         if (Array.isArray(possibleExits) && possibleExits.length > 0) exitConds = possibleExits[0];
//         else if (possibleExits && typeof possibleExits === 'object' && !Array.isArray(possibleExits)) exitConds = possibleExits;

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

//         // ENGINE VARIABLES (Fresh Start)
//         let currentEquity = 0, peakEquity = 0, maxDrawdown = 0;
//         let winDays = 0, lossDays = 0, winTrades = 0, lossTrades = 0;
//         let currentWinStreak = 0, currentLossStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
//         let maxProfitTrade = 0, maxLossTrade = 0;
//         let equityCurve = []; 
//         let daywiseBreakdown = []; 
//         let dailyBreakdownMap = {};

//         let optionDataCache = {}; // 🧹 RAM CACHE
//         let openTrades = [];
//         const strategyLegs = strategy.legs || strategy.data?.legs || [];

//         const advanceFeaturesSettings = strategy.data?.advanceSettings || strategy.advanceSettings || strategy.data?.advanceFeatures || strategy.advanceFeatures || {};
//         const riskSettings = strategy.data?.riskManagement || strategy.riskManagement || {};
//         const globalMaxProfit = Number(riskSettings.maxProfit) || 0;
//         const globalMaxLoss = Number(riskSettings.maxLoss) || 0;

//         const sqTime = strategy.config?.squareOff || strategy.data?.config?.squareOff || strategy.config?.squareOffTime || strategy.data?.config?.squareOffTime || "03:15 PM";
//         let exitMin = 915; 
//         if (sqTime) {
//             const [eh, emStr] = sqTime.split(':');
//             if (emStr) {
//                 const em = emStr.split(' ')[0];
//                 let h = parseInt(eh);
//                 if (sqTime.toUpperCase().includes('PM') && h !== 12) h += 12;
//                 exitMin = h * 60 + parseInt(em);
//             }
//         }

//         let isTradingHaltedForDay = false;
//         let currentDayTracker = "";

//         const calculateATM = (spotPrice, symbolStr) => {
//             if (symbolStr.includes("BANK")) return Math.round(spotPrice / 100) * 100;
//             return Math.round(spotPrice / 50) * 50;
//         };

//         const calcTradePnL = (entryP, exitP, qty, action) => {
//             if (action === "BUY") return (exitP - entryP) * qty;
//             return (entryP - exitP) * qty;
//         };

//         const getNearestExpiryString = (tradeDateStr, symbolStr, reqExpiry = "WEEKLY") => {
//             const d = new Date(tradeDateStr);
//             const upSym = symbolStr.toUpperCase();
//             let expiryDate = new Date(d);

//             const targetDay = 2;
//             let forceMonthly = false;

//             if (upSym.includes("BANK") || upSym.includes("FIN") || upSym.includes("MID")) {
//                 forceMonthly = true;
//             }

//             const upperReqExpiry = reqExpiry.toUpperCase();
//             const isMonthlyRequest = forceMonthly || upperReqExpiry === "MONTHLY";

//             if (!isMonthlyRequest) {
//                 while (expiryDate.getDay() !== targetDay) {
//                     expiryDate.setDate(expiryDate.getDate() + 1);
//                 }
//                 if (upperReqExpiry === "NEXT WEEKLY" || upperReqExpiry === "NEXT WEEK") {
//                     expiryDate.setDate(expiryDate.getDate() + 7);
//                 }
//             } else {
//                 const lastDayOfMonth = new Date(expiryDate.getFullYear(), expiryDate.getMonth() + 1, 0);
//                 expiryDate = new Date(lastDayOfMonth);

//                 while (expiryDate.getDay() !== targetDay) {
//                     expiryDate.setDate(expiryDate.getDate() - 1);
//                 }

//                 if (d > expiryDate) {
//                     const lastDayOfNextMonth = new Date(d.getFullYear(), d.getMonth() + 2, 0);
//                     expiryDate = new Date(lastDayOfNextMonth);
//                     while (expiryDate.getDay() !== targetDay) {
//                         expiryDate.setDate(expiryDate.getDate() - 1);
//                     }
//                 }
//             }

//             const formattedDate = `${String(expiryDate.getDate()).padStart(2, '0')}${expiryDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()}${String(expiryDate.getFullYear()).slice(-2)}`;

//             const today = new Date();
//             today.setHours(0, 0, 0, 0);
//             const expDateForCheck = new Date(expiryDate);
//             expDateForCheck.setHours(0, 0, 0, 0);

//             return `${(expDateForCheck < today) ? "EXP" : "Upcoming EXP"} ${formattedDate}`;
//         };



//         for (let i = 0; i < cachedData.length; i++) {
//             if (i % 500 === 0) await new Promise(resolve => setImmediate(resolve));

//             const candle = cachedData[i];
//             const candleTime = new Date(candle.timestamp).getTime();
//             const istDate = new Date(candleTime + (5.5 * 60 * 60 * 1000));
//             const h = String(istDate.getUTCHours()).padStart(2, '0');
//             const m = String(istDate.getUTCMinutes()).padStart(2, '0');
//             const timeInMinutes = (istDate.getUTCHours() * 60) + istDate.getUTCMinutes();
//             const dateStr = istDate.toISOString().split('T')[0];

//             if (dateStr !== currentDayTracker) {
//                 currentDayTracker = dateStr;
//                 isTradingHaltedForDay = false;

//                 // 🧹 THE RAM SAVER (Flush old day's data)
//                 optionDataCache = {};

//                 const expectedTotalDays = Math.max(1, (endDate - startDate) / (1000 * 60 * 60 * 24));
//                 const daysPassed = Math.max(0, (istDate - startDate) / (1000 * 60 * 60 * 24));
//                 let livePercent = Math.min(95, Math.round((daysPassed / expectedTotalDays) * 100));
                
//                 res.write(`data: ${JSON.stringify({ type: 'PROGRESS', date: dateStr, percent: livePercent })}\n\n`);
//             }

//             if (!dailyBreakdownMap[dateStr]) dailyBreakdownMap[dateStr] = { pnl: 0, trades: 0, tradesList: [], hasTradedTimeBased: false };

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

//             const isTimeBased = (strategy.config?.strategyType === 'Time Based' || strategy.data?.config?.strategyType === 'Time Based' || strategy.type === 'Time Based');

//             if (isTimeBased) {
//                 const sTime = strategy.startTime || strategy.config?.startTime || strategy.data?.config?.startTime || strategy.entrySettings?.startTime || strategy.data?.entrySettings?.startTime;

//                 if (sTime) {
//                     const [sh, sm] = sTime.split(':');
//                     let startMin = parseInt(sh) * 60 + parseInt(sm.split(' ')[0]);
//                     if (sTime.toUpperCase().includes('PM') && parseInt(sh) !== 12) startMin += 720;

//                     if (timeInMinutes >= startMin && !dailyBreakdownMap[dateStr].hasTradedTimeBased) {
//                         longSignal = true;
//                         dailyBreakdownMap[dateStr].hasTradedTimeBased = true;
//                     }
//                 }
//             }

//             const txnType = strategy.config?.transactionType || strategy.data?.config?.transactionType || 'Both Side';
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

//                     if (isOptionsTrade && trade.premiumChart && trade.premiumChart.start_Time) {
//                         let exactMatchIndex = trade.premiumChart.start_Time.findIndex(t => {
//                             const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                             return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                         });

//                         let isFallbackCandle = false;
//                         if (exactMatchIndex === -1) {
//                             let nearestIdx = -1;
//                             for (let k = trade.premiumChart.start_Time.length - 1; k >= 0; k--) {
//                                 const optTime = new Date(trade.premiumChart.start_Time[k] * 1000 + (5.5 * 60 * 60 * 1000));
//                                 if (optTime <= istDate) { nearestIdx = k; break; }
//                             }
//                             exactMatchIndex = nearestIdx;
//                             isFallbackCandle = true;
//                         }

//                         if (exactMatchIndex !== -1) {
//                             let tempClose = trade.premiumChart.close[exactMatchIndex];
//                             if (tempClose > spotClosePrice * 0.5) {
//                                 currentClose = trade.lastKnownPremium || trade.entryPrice;
//                                 currentHigh = currentLow = currentOpen = currentClose;
//                             } else {
//                                 currentClose = tempClose;
//                                 if (isFallbackCandle) {
//                                     currentHigh = tempClose;
//                                     currentLow = tempClose;
//                                     currentOpen = tempClose;
//                                 } else {
//                                     currentHigh = trade.premiumChart.high[exactMatchIndex];
//                                     currentLow = trade.premiumChart.low[exactMatchIndex];
//                                     currentOpen = trade.premiumChart.open[exactMatchIndex];
//                                 }
//                                 trade.lastKnownPremium = currentClose;
//                             }
//                         } else {
//                             currentClose = trade.lastKnownPremium || trade.entryPrice;
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

//                 let isSlMovedToCostGlobal = dailyBreakdownMap[dateStr].tradesList.some(t => t.exitType === "STOPLOSS" || t.exitType === "SL_MOVED_TO_COST");

//                 openTrades.forEach((trade, idx) => {
//                     if (trade.markedForExit) return;

//                     if (hitGlobalMaxProfit || hitGlobalMaxLoss) {
//                         trade.markedForExit = true;
//                         trade.exitReason = hitGlobalMaxProfit ? "MAX_PROFIT" : "MAX_LOSS";
//                         if (hitGlobalMaxLoss && globalMaxLoss > 0) {
//                             const exactLossPoints = globalMaxLoss / trade.quantity;
//                             trade.exitPrice = trade.transaction === "BUY" ? (trade.entryPrice - exactLossPoints) : (trade.entryPrice + exactLossPoints);
//                         } else if (hitGlobalMaxProfit && globalMaxProfit > 0) {
//                             const exactProfitPoints = globalMaxProfit / trade.quantity;
//                             trade.exitPrice = trade.transaction === "BUY" ? (trade.entryPrice + exactProfitPoints) : (trade.entryPrice - exactProfitPoints);
//                         } else {
//                             trade.exitPrice = trade.currentPrice;
//                         }
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

//                     if ((!isSlMovedToCost && slValue > 0) || isSlMovedToCost) {
//                         if (spotTriggeredSl || (trade.transaction === "BUY" && trade.currentLow <= slPrice) || (trade.transaction === "SELL" && trade.currentHigh >= slPrice)) {
//                             trade.markedForExit = true;
//                             trade.exitReason = isSlMovedToCost ? "SL_MOVED_TO_COST" : "STOPLOSS";
//                             trade.exitPrice = slPrice;
//                             triggerReasonForExitAll = "STOPLOSS";
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
//                                 trade.markedForExit = true; trade.exitReason = "TRAILING_SL"; trade.exitPrice = trade.trailingSL;
//                                 triggerReasonForExitAll = "TRAILING_SL";
//                             }
//                         }
//                     }

//                     if (!trade.markedForExit) {
//                         if ((trade.signalType === "LONG" && exitLongSignal) || (trade.signalType === "SHORT" && exitShortSignal)) {
//                             trade.markedForExit = true; trade.exitReason = "INDICATOR_EXIT"; trade.exitPrice = trade.currentPrice;
//                         }
//                     }
//                 });


//                 if (triggerReasonForExitAll && !hitGlobalMaxProfit && !hitGlobalMaxLoss) {
//                     const exitAllCheck = evaluateExitAllLogic(advanceFeaturesSettings, triggerReasonForExitAll);
//                     if (exitAllCheck.shouldExitAll) {
//                         openTrades.forEach(trade => {
//                             if (!trade.markedForExit) {
//                                 trade.markedForExit = true;
//                                 trade.exitReason = exitAllCheck.exitReason;
//                                 trade.exitPrice = trade.currentPrice;
//                             }
//                         });
//                     }
//                 }

//                 let remainingTrades = [];
//                 for (let trade of openTrades) {
//                     if (trade.markedForExit || isExitTime || isLastCandleOfDay) {
//                         if (!trade.markedForExit) {
//                             trade.exitReason = isLastCandleOfDay ? "EOD_SQUAREOFF" : "TIME_SQUAREOFF";
//                         }

//                         // =========================================================================
//                         // 🔴 THE SNIPER GATEKEEPER (WITH SUPER-FAST RAM CACHE) 🔴
//                         // =========================================================================
//                         const needsMarketPrice = ["TIME_SQUAREOFF", "EOD_SQUAREOFF", "INDICATOR_EXIT", "MAX_PROFIT", "MAX_LOSS", "EXIT_ALL_TGT", "EXIT_ALL_SL", "STOPLOSS", "TARGET", "TRAILING_SL", "SL_MOVED_TO_COST"].includes(trade.exitReason);
                        
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
//                                 for(let k=0; k<cachedChart.timestamp.length; k++){
//                                     const optTime = new Date(cachedChart.timestamp[k] * 1000 + (5.5 * 3600000));
//                                     if(optTime.toISOString().split('T')[1].substring(0, 5) === exitTimeStr) { 
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
//                                         for(let k=0; k<atmExitData.timestamp.length; k++){
//                                             const optTime = new Date(atmExitData.timestamp[k] * 1000 + (5.5 * 3600000));
//                                             if(optTime.toISOString().split('T')[1].substring(0, 5) === exitTimeStr) { 
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
//                                     for(let c = 0; c < candidates.length; c++) {
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
//                                                 for(let k=0; k<tempExitData.timestamp.length; k++){
//                                                     const optTime = new Date(tempExitData.timestamp[k] * 1000 + (5.5 * 3600000));
//                                                     if(optTime.toISOString().split('T')[1].substring(0, 5) === exitTimeStr) { tempIndex = k; break; }
//                                                 }
                                                
//                                                 if(tempIndex !== -1 && tempExitData.strike && Number(tempExitData.strike[tempIndex]) === fixedStrike) {
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
//                                 if (["STOPLOSS", "TRAILING_SL", "SL_MOVED_TO_COST"].includes(trade.exitReason)) {
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
//                                     if (["STOPLOSS", "TARGET", "TRAILING_SL", "SL_MOVED_TO_COST"].includes(trade.exitReason)) {
                                        
//                                         if (!useRealisticSlippage) {
//                                             trade.exitPrice = cOpen; 
//                                         } else {
//                                             if (trade.transaction === "BUY") {
//                                                 if (["STOPLOSS", "TRAILING_SL", "SL_MOVED_TO_COST"].includes(trade.exitReason) && cOpen < mathPrice) trade.exitPrice = cOpen;
//                                                 else if (trade.exitReason === "TARGET" && cOpen > mathPrice) trade.exitPrice = cOpen;
//                                                 else trade.exitPrice = mathPrice; 
//                                             } else { 
//                                                 if (["STOPLOSS", "TRAILING_SL", "SL_MOVED_TO_COST"].includes(trade.exitReason) && cOpen > mathPrice) trade.exitPrice = cOpen;
//                                                 else if (trade.exitReason === "TARGET" && cOpen < mathPrice) trade.exitPrice = cOpen;
//                                                 else trade.exitPrice = mathPrice; 
//                                             }
//                                         }
                                        
//                                     } else {
//                                         trade.exitPrice = trade.exitReason === "TIME_SQUAREOFF" ? cOpen : cClose;
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

//                             if (!foundExactExit) {
//                                 if (["STOPLOSS", "TARGET", "TRAILING_SL", "SL_MOVED_TO_COST"].includes(trade.exitReason)) {
//                                     if (isExitTime || isLastCandleOfDay) {
//                                         trade.exitReason = isLastCandleOfDay ? "EOD_SQUAREOFF" : "TIME_SQUAREOFF";
//                                         trade.exitPrice = null; 
//                                     } else {
//                                         trade.markedForExit = false;
//                                         trade.exitReason = null;
//                                         trade.exitPrice = null;
//                                         remainingTrades.push(trade);
//                                         continue; 
//                                     }
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
                                    
//                                     let intrinsicValue = 0;
//                                     if (optType === "CE") intrinsicValue = Math.max(0, spotClosePrice - fixedStrike);
//                                     else intrinsicValue = Math.max(0, fixedStrike - spotClosePrice);

//                                     let dte = 0;
//                                     try {
//                                         const expMatch = trade.symbol.match(/EXP (\d{2}[A-Z]{3}\d{2})/i);
//                                         if (expMatch && expMatch[1]) {
//                                             const expDay = parseInt(expMatch[1].substring(0, 2));
//                                             const monthStr = expMatch[1].substring(2, 5);
//                                             const expYear = parseInt("20" + expMatch[1].substring(5, 7));
//                                             const monthMap = {JAN:0, FEB:1, MAR:2, APR:3, MAY:4, JUN:5, JUL:6, AUG:7, SEP:8, OCT:9, NOV:10, DEC:11};
//                                             const expDateObj = new Date(expYear, monthMap[monthStr.toUpperCase()], expDay, 15, 30, 0);
                                            
//                                             const diffTime = expDateObj.getTime() - istDate.getTime();
//                                             dte = Math.max(0, diffTime / (1000 * 60 * 60 * 24)); 
//                                         }
//                                     } catch(e) { dte = 1; }

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

//                         const pnl = calcTradePnL(trade.entryPrice, trade.exitPrice, trade.quantity, trade.transaction);

//                         const completedTrade = {
//                             ...trade,
//                             exitTime: `${h}:${m}:00`,
//                             pnl: pnl,
//                             exitType: trade.exitReason
//                         };

//                         dailyBreakdownMap[dateStr].tradesList.push(completedTrade);
//                         dailyBreakdownMap[dateStr].pnl += pnl;
//                         dailyBreakdownMap[dateStr].trades += 1;
//                         if (pnl > 0) { winTrades++; if (pnl > maxProfitTrade) maxProfitTrade = pnl; }
//                         else { lossTrades++; if (pnl < maxLossTrade) maxLossTrade = pnl; }

//                         console.log(`🎯 [${completedTrade.exitType}] Date: ${dateStr} | Symbol: ${trade.symbol} | Exit: ${trade.exitPrice.toFixed(2)} | PnL: ${pnl.toFixed(2)}`);
//                     } else {
//                         remainingTrades.push(trade);
//                     }
//                 }

//                 openTrades = remainingTrades;
//             }
//             else if (!isTradingHaltedForDay) {
//                 const mtmResult = evaluateMtmLogic(dailyBreakdownMap[dateStr].pnl, 0, riskSettings);
//                 if (mtmResult.isHalted) {
//                     isTradingHaltedForDay = true;
//                     console.log(mtmResult.logMessage);
//                 }
//             }

//             // =========================================================
//             // 🔥 2. MULTI-LEG ENTRY LOGIC
//             // =========================================================
//             if (openTrades.length === 0 && isMarketOpen && !isTradingHaltedForDay && (finalLongSignal || finalShortSignal)) {

//                 for (let legIndex = 0; legIndex < strategyLegs.length; legIndex++) {
//                     const legData = strategyLegs[legIndex];

//                     let tradeQuantity = legData.quantity;
//                     if (!tradeQuantity || isNaN(tradeQuantity)) tradeQuantity = upperSymbol.includes("BANK") ? 30 : (upperSymbol.includes("NIFTY") ? 50 : 1);

//                     const transActionTypeStr = (legData.action || "BUY").toUpperCase();
//                     let activeOptionType = "";

//                     if (isTimeBased) {
//                         activeOptionType = (legData.optionType || "Call").toUpperCase().includes("C") ? "CE" : "PE";
//                     } else {
//                         if (transActionTypeStr === "BUY") activeOptionType = finalLongSignal ? "CE" : "PE";
//                         else if (transActionTypeStr === "SELL") activeOptionType = finalLongSignal ? "PE" : "CE";
//                     }

//                     let finalEntryPrice = isOptionsTrade ? 0 : spotClosePrice;
//                     let validTrade = true;
//                     let premiumChartData = null;
//                     let targetStrike = calculateATM(spotClosePrice, upperSymbol);
//                     const strikeCriteria = legData.strikeCriteria || "ATM pt";
//                     const strikeType = legData.strikeType || "ATM";
//                     const reqExpiry = legData.expiry || "WEEKLY";

//                     const expiryLabel = getNearestExpiryString(dateStr, upperSymbol, reqExpiry);
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
//                         openTrades.push({
//                             id: `leg_${legIndex}`,
//                             legConfig: legData,
//                             symbol: tradeSymbol,
//                             transaction: transActionTypeStr,
//                             quantity: tradeQuantity,
//                             entryTime: `${h}:${m}:00`,
//                             entryPrice: finalEntryPrice,
//                             exitTime: null, exitPrice: null, pnl: null, exitType: null,
//                             optionConfig: isOptionsTrade ? { strike: targetStrike, type: activeOptionType } : null,
//                             premiumChart: premiumChartData,
//                             signalType: finalLongSignal ? "LONG" : "SHORT",
//                             lastKnownPremium: finalEntryPrice,
//                             markedForExit: false
//                         });
//                         console.log(`✅ [TRADE OPEN] Leg ${legIndex + 1} | Time: ${h}:${m} | Spot: ${spotClosePrice} | Premium: ${finalEntryPrice} | Type: ${activeOptionType}`);
//                     }
//                 }
//             }
//         }

//         // ==========================================
//         // 🧮 5. DAILY LOOP (Metrics Generation)
//         // ==========================================
//         let totalMarketDays = Object.keys(dailyBreakdownMap).length;

//         for (const [date, data] of Object.entries(dailyBreakdownMap)) {
//             currentEquity += data.pnl;
//             if (currentEquity > peakEquity) peakEquity = currentEquity;
//             const drawdown = currentEquity - peakEquity;
//             if (drawdown < maxDrawdown) maxDrawdown = drawdown;

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

//         // 🔥 FRESH RESULT PREPARATION
//         const backtestResult = {
//             summary: {
//                 totalPnL: currentEquity, 
//                 maxDrawdown, 
//                 tradingDays: totalMarketDays, 
//                 winDays, 
//                 lossDays,
//                 totalTrades: winTrades + lossTrades, 
//                 winTrades, 
//                 lossTrades, 
//                 maxWinStreak, 
//                 maxLossStreak,
//                 maxProfit: maxProfitTrade, 
//                 maxLoss: maxLossTrade
//             },
//             equityCurve: equityCurve,
//             daywiseBreakdown: daywiseBreakdown // Chronological
//         };

//         // 💾 SAVE NEW CACHE (Taaki agli baar 0 second mein serve ho)
//         if (period !== 'Custom') { 
//             await BacktestCache.findOneAndUpdate(
//                 { strategyId: strategy._id, period: period },
//                 {
//                     startDate: originalStartDate, 
//                     endDate: endDate,
//                     summary: backtestResult.summary,
//                     equityCurve: backtestResult.equityCurve,
//                     daywiseBreakdown: backtestResult.daywiseBreakdown, 
//                     strategyUpdatedAt: strategy.updatedAt || new Date()
//                 },
//                 { upsert: true, new: true } 
//             ).catch(e => console.log("Cache Save Error:", e));
//         }

//         // 🔥 3. SEND FINAL DATA TO UI 
//         clearInterval(heartbeat); 
//         const finalResultForUI = {
//             ...backtestResult,
//             daywiseBreakdown: [...backtestResult.daywiseBreakdown].reverse() 
//         };
        
//         res.write(`data: ${JSON.stringify({ type: 'COMPLETE', data: finalResultForUI })}\n\n`);
//         res.end(); 

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

// const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

//         // =========================================================
//         // 🔐 THE FINGERPRINT FIX 
//         // =========================================================
//         const advanceFeaturesSettings = strategy.data?.advanceSettings || strategy.advanceSettings || strategy.data?.advanceFeatures || strategy.advanceFeatures || {};
//         const riskSettings = strategy.data?.riskManagement || strategy.riskManagement || {};
        
//         const sTime = strategy.startTime || strategy.entryTime || strategy.config?.startTime || strategy.config?.entryTime || strategy.data?.config?.startTime || strategy.data?.config?.entryTime || strategy.entrySettings?.startTime || strategy.data?.entrySettings?.startTime;
//         const sqTime = strategy.config?.squareOff || strategy.data?.config?.squareOff || strategy.config?.squareOffTime || strategy.data?.config?.squareOffTime || "03:15 PM";
//         const txnType = strategy.config?.transactionType || strategy.data?.config?.transactionType || 'Both Side';
//         const isTimeBased = (strategy.config?.strategyType === 'Time Based' || strategy.data?.config?.strategyType === 'Time Based' || strategy.type === 'Time Based');

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
//             isTimeBased: isTimeBased 
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
//         const strategyLegs = strategy.legs || strategy.data?.legs || [];

//         // 🔥 FIX: Global Max Profit and Loss ab loop se bahar aur top scope me hain
//         const globalMaxProfit = Number(riskSettings.maxProfit) || 0;
//         const globalMaxLoss = Number(riskSettings.maxLoss) || 0;

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

//         const getNearestExpiryString = (tradeDateStr, symbolStr, reqExpiry = "WEEKLY") => {
//             const d = new Date(tradeDateStr);
//             const upSym = symbolStr.toUpperCase();
//             let expiryDate = new Date(d);
//             const targetDay = 2; // SEBI Tuesday
//             let forceMonthly = false;

//             if (upSym.includes("BANK") || upSym.includes("FIN") || upSym.includes("MID")) forceMonthly = true;

//             const upperReqExpiry = reqExpiry.toUpperCase();
//             const isMonthlyRequest = forceMonthly || upperReqExpiry === "MONTHLY";

//             if (!isMonthlyRequest) {
//                 while (expiryDate.getDay() !== targetDay) expiryDate.setDate(expiryDate.getDate() + 1);
//                 if (upperReqExpiry === "NEXT WEEKLY" || upperReqExpiry === "NEXT WEEK") expiryDate.setDate(expiryDate.getDate() + 7);
//             } else {
//                 const lastDayOfMonth = new Date(expiryDate.getFullYear(), expiryDate.getMonth() + 1, 0);
//                 expiryDate = new Date(lastDayOfMonth);
//                 while (expiryDate.getDay() !== targetDay) expiryDate.setDate(expiryDate.getDate() - 1);

//                 if (d > expiryDate) {
//                     const lastDayOfNextMonth = new Date(d.getFullYear(), d.getMonth() + 2, 0);
//                     expiryDate = new Date(lastDayOfNextMonth);
//                     while (expiryDate.getDay() !== targetDay) expiryDate.setDate(expiryDate.getDate() - 1);
//                 }
//             }

//             const formattedDate = `${String(expiryDate.getDate()).padStart(2, '0')}${expiryDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()}${String(expiryDate.getFullYear()).slice(-2)}`;
//             const today = new Date(); today.setHours(0, 0, 0, 0);
//             const expDateForCheck = new Date(expiryDate); expDateForCheck.setHours(0, 0, 0, 0);

//             return `${(expDateForCheck < today) ? "EXP" : "Upcoming EXP"} ${formattedDate}`;
//         };


//         // =========================================================
//         // ⏱️ THE MAIN CANDLE LOOP
//         // =========================================================
//         for (let i = 0; i < cachedData.length; i++) {
//             if (i % 500 === 0) await new Promise(resolve => setImmediate(resolve));

//             const candle = cachedData[i];
//             const candleTime = new Date(candle.timestamp).getTime();
//             const istDate = new Date(candleTime + (5.5 * 60 * 60 * 1000));
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
//                 if (bulkCacheMap[dateStr]) {
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

//             if (isTimeBased && sTime) {
//                 const [sh, smStr] = sTime.split(':');
//                 let startMin = parseInt(sh) * 60 + parseInt(smStr.split(' ')[0]);
//                 if (sTime.toUpperCase().includes('PM') && parseInt(sh) !== 12) startMin += 720;
//                 if (sTime.toUpperCase().includes('AM') && parseInt(sh) === 12) startMin -= 720;

//                 if (timeInMinutes >= startMin && !dailyBreakdownMap[dateStr].hasTradedTimeBased) {
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

//                     if (isOptionsTrade && trade.premiumChart && trade.premiumChart.start_Time) {
//                         let exactMatchIndex = trade.premiumChart.start_Time.findIndex(t => {
//                             const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                             return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                         });

//                         let isFallbackCandle = false;
//                         if (exactMatchIndex === -1) {
//                             let nearestIdx = -1;
//                             for (let k = trade.premiumChart.start_Time.length - 1; k >= 0; k--) {
//                                 const optTime = new Date(trade.premiumChart.start_Time[k] * 1000 + (5.5 * 60 * 60 * 1000));
//                                 if (optTime <= istDate) { nearestIdx = k; break; }
//                             }
//                             exactMatchIndex = nearestIdx;
//                             isFallbackCandle = true;
//                         }

//                         if (exactMatchIndex !== -1) {
//                             let tempClose = trade.premiumChart.close[exactMatchIndex];
//                             if (tempClose > spotClosePrice * 0.5) {
//                                 currentClose = trade.lastKnownPremium || trade.entryPrice;
//                                 currentHigh = currentLow = currentOpen = currentClose;
//                             } else {
//                                 currentClose = tempClose;
//                                 if (isFallbackCandle) {
//                                     currentHigh = tempClose;
//                                     currentLow = tempClose;
//                                     currentOpen = tempClose;
//                                 } else {
//                                     currentHigh = trade.premiumChart.high[exactMatchIndex];
//                                     currentLow = trade.premiumChart.low[exactMatchIndex];
//                                     currentOpen = trade.premiumChart.open[exactMatchIndex];
//                                 }
//                                 trade.lastKnownPremium = currentClose;
//                             }
//                         } else {
//                             currentClose = trade.lastKnownPremium || trade.entryPrice;
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

//                 let isSlMovedToCostGlobal = dailyBreakdownMap[dateStr].tradesList.some(t => t.exitType === "STOPLOSS" || t.exitType === "SL_MOVED_TO_COST");

//                 openTrades.forEach((trade, idx) => {
//                     if (trade.markedForExit) return;

//                     if (hitGlobalMaxProfit || hitGlobalMaxLoss) {
//                         trade.markedForExit = true;
//                         trade.exitReason = hitGlobalMaxProfit ? "MAX_PROFIT" : "MAX_LOSS";
//                         if (hitGlobalMaxLoss && globalMaxLoss > 0) {
//                             const exactLossPoints = globalMaxLoss / trade.quantity;
//                             trade.exitPrice = trade.transaction === "BUY" ? (trade.entryPrice - exactLossPoints) : (trade.entryPrice + exactLossPoints);
//                         } else if (hitGlobalMaxProfit && globalMaxProfit > 0) {
//                             const exactProfitPoints = globalMaxProfit / trade.quantity;
//                             trade.exitPrice = trade.transaction === "BUY" ? (trade.entryPrice + exactProfitPoints) : (trade.entryPrice - exactProfitPoints);
//                         } else {
//                             trade.exitPrice = trade.currentPrice;
//                         }
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

//                     if ((!isSlMovedToCost && slValue > 0) || isSlMovedToCost) {
//                         if (spotTriggeredSl || (trade.transaction === "BUY" && trade.currentLow <= slPrice) || (trade.transaction === "SELL" && trade.currentHigh >= slPrice)) {
//                             trade.markedForExit = true;
//                             trade.exitReason = isSlMovedToCost ? "SL_MOVED_TO_COST" : "STOPLOSS";
//                             trade.exitPrice = slPrice;
//                             triggerReasonForExitAll = "STOPLOSS";
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
//                                 trade.markedForExit = true; trade.exitReason = "TRAILING_SL"; trade.exitPrice = trade.trailingSL;
//                                 triggerReasonForExitAll = "TRAILING_SL";
//                             }
//                         }
//                     }

//                     if (!trade.markedForExit) {
//                         if ((trade.signalType === "LONG" && exitLongSignal) || (trade.signalType === "SHORT" && exitShortSignal)) {
//                             trade.markedForExit = true; trade.exitReason = "INDICATOR_EXIT"; trade.exitPrice = trade.currentPrice;
//                         }
//                     }
//                 });

//                 if (triggerReasonForExitAll && !hitGlobalMaxProfit && !hitGlobalMaxLoss) {
//                     const exitAllCheck = evaluateExitAllLogic(advanceFeaturesSettings, triggerReasonForExitAll);
//                     if (exitAllCheck.shouldExitAll) {
//                         openTrades.forEach(trade => {
//                             if (!trade.markedForExit) {
//                                 trade.markedForExit = true;
//                                 trade.exitReason = exitAllCheck.exitReason;
//                                 trade.exitPrice = trade.currentPrice;
//                             }
//                         });
//                     }
//                 }

//                 let remainingTrades = [];
//                 for (let trade of openTrades) {
//                     if (trade.markedForExit || isExitTime || isLastCandleOfDay) {
//                         if (!trade.markedForExit) {
//                             trade.exitReason = isLastCandleOfDay ? "EOD_SQUAREOFF" : "TIME_SQUAREOFF";
//                         }

//                         // =========================================================================
//                         // 🔴 THE SNIPER GATEKEEPER 
//                         // =========================================================================
//                         const needsMarketPrice = ["TIME_SQUAREOFF", "EOD_SQUAREOFF", "INDICATOR_EXIT", "MAX_PROFIT", "MAX_LOSS", "EXIT_ALL_TGT", "EXIT_ALL_SL", "STOPLOSS", "TARGET", "TRAILING_SL", "SL_MOVED_TO_COST"].includes(trade.exitReason);
                        
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
//                                 for(let k=0; k<cachedChart.timestamp.length; k++){
//                                     const optTime = new Date(cachedChart.timestamp[k] * 1000 + (5.5 * 3600000));
//                                     if(optTime.toISOString().split('T')[1].substring(0, 5) === exitTimeStr) { 
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
//                                         for(let k=0; k<atmExitData.timestamp.length; k++){
//                                             const optTime = new Date(atmExitData.timestamp[k] * 1000 + (5.5 * 3600000));
//                                             if(optTime.toISOString().split('T')[1].substring(0, 5) === exitTimeStr) { 
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
//                                     for(let c = 0; c < candidates.length; c++) {
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
//                                                 for(let k=0; k<tempExitData.timestamp.length; k++){
//                                                     const optTime = new Date(tempExitData.timestamp[k] * 1000 + (5.5 * 3600000));
//                                                     if(optTime.toISOString().split('T')[1].substring(0, 5) === exitTimeStr) { tempIndex = k; break; }
//                                                 }
                                                
//                                                 if(tempIndex !== -1 && tempExitData.strike && Number(tempExitData.strike[tempIndex]) === fixedStrike) {
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
//                                 if (["STOPLOSS", "TRAILING_SL", "SL_MOVED_TO_COST"].includes(trade.exitReason)) {
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
//                                     if (["STOPLOSS", "TARGET", "TRAILING_SL", "SL_MOVED_TO_COST"].includes(trade.exitReason)) {
//                                         if (!useRealisticSlippage) {
//                                             trade.exitPrice = cOpen; 
//                                         } else {
//                                             if (trade.transaction === "BUY") {
//                                                 if (["STOPLOSS", "TRAILING_SL", "SL_MOVED_TO_COST"].includes(trade.exitReason) && cOpen < mathPrice) trade.exitPrice = cOpen;
//                                                 else if (trade.exitReason === "TARGET" && cOpen > mathPrice) trade.exitPrice = cOpen;
//                                                 else trade.exitPrice = mathPrice; 
//                                             } else { 
//                                                 if (["STOPLOSS", "TRAILING_SL", "SL_MOVED_TO_COST"].includes(trade.exitReason) && cOpen > mathPrice) trade.exitPrice = cOpen;
//                                                 else if (trade.exitReason === "TARGET" && cOpen < mathPrice) trade.exitPrice = cOpen;
//                                                 else trade.exitPrice = mathPrice; 
//                                             }
//                                         }
//                                     } else {
//                                         trade.exitPrice = trade.exitReason === "TIME_SQUAREOFF" ? cOpen : cClose;
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

//                             if (!foundExactExit) {
//                                 if (["STOPLOSS", "TARGET", "TRAILING_SL", "SL_MOVED_TO_COST"].includes(trade.exitReason)) {
//                                     if (isExitTime || isLastCandleOfDay) {
//                                         trade.exitReason = isLastCandleOfDay ? "EOD_SQUAREOFF" : "TIME_SQUAREOFF";
//                                         trade.exitPrice = null; 
//                                     } else {
//                                         trade.markedForExit = false;
//                                         trade.exitReason = null;
//                                         trade.exitPrice = null;
//                                         remainingTrades.push(trade);
//                                         continue; 
//                                     }
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
                                    
//                                     let intrinsicValue = 0;
//                                     if (optType === "CE") intrinsicValue = Math.max(0, spotClosePrice - fixedStrike);
//                                     else intrinsicValue = Math.max(0, fixedStrike - spotClosePrice);

//                                     let dte = 0;
//                                     try {
//                                         const expMatch = trade.symbol.match(/EXP (\d{2}[A-Z]{3}\d{2})/i);
//                                         if (expMatch && expMatch[1]) {
//                                             const expDay = parseInt(expMatch[1].substring(0, 2));
//                                             const monthStr = expMatch[1].substring(2, 5);
//                                             const expYear = parseInt("20" + expMatch[1].substring(5, 7));
//                                             const monthMap = {JAN:0, FEB:1, MAR:2, APR:3, MAY:4, JUN:5, JUL:6, AUG:7, SEP:8, OCT:9, NOV:10, DEC:11};
//                                             const expDateObj = new Date(expYear, monthMap[monthStr.toUpperCase()], expDay, 15, 30, 0);
                                            
//                                             const diffTime = expDateObj.getTime() - istDate.getTime();
//                                             dte = Math.max(0, diffTime / (1000 * 60 * 60 * 24)); 
//                                         }
//                                     } catch(e) { dte = 1; }

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

//                         const pnl = calcTradePnL(trade.entryPrice, trade.exitPrice, trade.quantity, trade.transaction);

//                         const completedTrade = {
//                             ...trade,
//                             exitTime: `${h}:${m}:00`,
//                             pnl: pnl,
//                             exitType: trade.exitReason
//                         };

//                         dailyBreakdownMap[dateStr].tradesList.push(completedTrade);
//                         dailyBreakdownMap[dateStr].pnl += pnl;
//                         dailyBreakdownMap[dateStr].trades += 1;
//                         if (pnl > 0) { winTrades++; if (pnl > maxProfitTrade) maxProfitTrade = pnl; }
//                         else { lossTrades++; if (pnl < maxLossTrade) maxLossTrade = pnl; }

//                         console.log(`🎯 [${completedTrade.exitType}] Date: ${dateStr} | Symbol: ${trade.symbol} | Exit: ${trade.exitPrice.toFixed(2)} | PnL: ${pnl.toFixed(2)}`);
//                     } else {
//                         remainingTrades.push(trade);
//                     }
//                 }

//                 openTrades = remainingTrades;
//             }
//             else if (!isTradingHaltedForDay) {
//                 const mtmResult = evaluateMtmLogic(dailyBreakdownMap[dateStr].pnl, 0, riskSettings);
//                 if (mtmResult.isHalted) {
//                     isTradingHaltedForDay = true;
//                     console.log(mtmResult.logMessage);
//                 }
//             }

//             // =========================================================
//             // 🔥 2. MULTI-LEG ENTRY LOGIC
//             // =========================================================
//             if (openTrades.length === 0 && isMarketOpen && !isTradingHaltedForDay && (finalLongSignal || finalShortSignal)) {

//                 for (let legIndex = 0; legIndex < strategyLegs.length; legIndex++) {
//                     const legData = strategyLegs[legIndex];

//                     let tradeQuantity = legData.quantity;
//                     if (!tradeQuantity || isNaN(tradeQuantity)) tradeQuantity = upperSymbol.includes("BANK") ? 30 : (upperSymbol.includes("NIFTY") ? 50 : 1);

//                     const transActionTypeStr = (legData.action || "BUY").toUpperCase();
//                     let activeOptionType = "";

//                     if (isTimeBased) {
//                         activeOptionType = (legData.optionType || "Call").toUpperCase().includes("C") ? "CE" : "PE";
//                     } else {
//                         if (transActionTypeStr === "BUY") activeOptionType = finalLongSignal ? "CE" : "PE";
//                         else if (transActionTypeStr === "SELL") activeOptionType = finalLongSignal ? "PE" : "CE";
//                     }

//                     let finalEntryPrice = isOptionsTrade ? 0 : spotClosePrice;
//                     let validTrade = true;
//                     let premiumChartData = null;
//                     let targetStrike = calculateATM(spotClosePrice, upperSymbol);
//                     const strikeCriteria = legData.strikeCriteria || "ATM pt";
//                     const strikeType = legData.strikeType || "ATM";
//                     const reqExpiry = legData.expiry || "WEEKLY";

//                     const expiryLabel = getNearestExpiryString(dateStr, upperSymbol, reqExpiry);
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
//                         openTrades.push({
//                             id: `leg_${legIndex}`,
//                             legConfig: legData,
//                             symbol: tradeSymbol,
//                             transaction: transActionTypeStr,
//                             quantity: tradeQuantity,
//                             entryTime: `${h}:${m}:00`,
//                             entryPrice: finalEntryPrice,
//                             exitTime: null, exitPrice: null, pnl: null, exitType: null,
//                             optionConfig: isOptionsTrade ? { strike: targetStrike, type: activeOptionType } : null,
//                             premiumChart: premiumChartData,
//                             signalType: finalLongSignal ? "LONG" : "SHORT",
//                             lastKnownPremium: finalEntryPrice,
//                             markedForExit: false
//                         });
//                         console.log(`✅ [TRADE OPEN] Leg ${legIndex + 1} | Time: ${h}:${m} | Spot: ${spotClosePrice} | Premium: ${finalEntryPrice} | Type: ${activeOptionType}`);
//                     }
//                 }
//             }
//         }

//         // ==========================================
//         // 🧮 5. DAILY LOOP (Metrics Generation)
//         // ==========================================
//         let totalMarketDays = Object.keys(dailyBreakdownMap).length;

//         // 🔥 THE FIX: Reset counters so we can count BOTH cached and fresh trades perfectly
//         winTrades = 0; 
//         lossTrades = 0; 
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
//                 totalTrades: winTrades + lossTrades, 
//                 winTrades, 
//                 lossTrades, 
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
const { getOptionSecurityId, sleep } = require('../services/instrumentService');
const { fetchDhanHistoricalData, fetchExpiredOptionData } = require('../services/dhanService');

const { evaluateTrailingSL } = require('../engine/features/riskManagement/trailingLogic');
const { evaluateMtmLogic } = require('../engine/features/riskManagement/mtmSquareOff');
const { evaluateExitAllLogic } = require('../engine/features/advanceFeatures/exitAllOnSlTgt');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

        let exchangeSegment = "IDX_I";
        if (upperSymbol.includes("NIFTY") || upperSymbol.includes("SENSEX") || upperSymbol === "BANKNIFTY" || upperSymbol === "NIFTY BANK") {
            exchangeSegment = "IDX_I";
        }

        const cleanSymbolForMap = upperSymbol.replace(' 50', '').trim();
        const spotSecurityId = instrumentData.securityId || dhanIdMap[upperSymbol] || dhanIdMap[cleanSymbolForMap] || "25";

        const rawInterval = strategy.interval || strategy.config?.interval || strategy.data?.config?.interval;
        let timeframe = rawInterval ? String(rawInterval).replace(' min', '').trim() : "5";

        // =========================================================
        // 🔐 THE FINGERPRINT HASH
        // =========================================================
        const advanceFeaturesSettings = strategy.data?.advanceSettings || strategy.advanceSettings || strategy.data?.advanceFeatures || strategy.advanceFeatures || {};
        const riskSettings = strategy.data?.riskManagement || strategy.riskManagement || {};
        
        const sTime = strategy.startTime || strategy.entryTime || strategy.config?.startTime || strategy.config?.entryTime || strategy.data?.config?.startTime || strategy.data?.config?.entryTime || strategy.entrySettings?.startTime || strategy.data?.entrySettings?.startTime;
        const sqTime = strategy.config?.squareOff || strategy.data?.config?.squareOff || strategy.config?.squareOffTime || strategy.data?.config?.squareOffTime || "03:15 PM";
        const txnType = strategy.config?.transactionType || strategy.data?.config?.transactionType || 'Both Side';
        const isTimeBased = (strategy.config?.strategyType === 'Time Based' || strategy.data?.config?.strategyType === 'Time Based' || strategy.type === 'Time Based');

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
            isTimeBased: isTimeBased 
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
        // 📡 DATA DOWNLOADING (Spot Data)
        // =========================================================
        let cachedData = await HistoricalData.find({
            symbol: upperSymbol, 
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
                await HistoricalData.deleteMany({ symbol: upperSymbol, timeframe, timestamp: { $gte: startDate, $lte: endDate } });
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
                currentEnd.setDate(currentStart.getDate() + 9);
                if (currentEnd > endDate) currentEnd = new Date(endDate);
                chunkedRanges.push({ start: new Date(currentStart), end: new Date(currentEnd) });
                currentStart.setDate(currentStart.getDate() + 10);
            }

            for (let range of chunkedRanges) {
                res.write(`data: ${JSON.stringify({ type: 'PROGRESS', date: `Fetching Spot Data: ${range.start.toISOString().split('T')[0]}`, percent: 0 })}\n\n`);
                
                const dhanRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, spotSecurityId, exchangeSegment, "INDEX", range.start.toISOString().split('T')[0], range.end.toISOString().split('T')[0], timeframe);
                const timeArray = dhanRes.data ? (dhanRes.data.start_Time || dhanRes.data.timestamp) : null;

                if (dhanRes.success && timeArray) {
                    const { open, high, low, close, volume } = dhanRes.data;
                    const bulkOps = [];
                    for (let i = 0; i < timeArray.length; i++) {
                        let ms = timeArray[i];
                        if (ms < 10000000000) ms = ms * 1000;
                        bulkOps.push({ insertOne: { document: { symbol: upperSymbol, timeframe, timestamp: new Date(ms), open: open[i], high: high[i], low: low[i], close: close[i], volume: volume[i] } } });
                    }
                    if (bulkOps.length > 0) await HistoricalData.bulkWrite(bulkOps, { ordered: false }).catch(e => console.log("Duplicates ignored"));
                }
                
                await delay(400); 
            }

            cachedData = await HistoricalData.find({ symbol: upperSymbol, timeframe, timestamp: { $gte: startDate, $lte: endDate } }).sort({ timestamp: 1 }).lean();
            if (cachedData.length === 0) {
                res.write(`data: ${JSON.stringify({ type: 'ERROR', message: 'Spot Data not available for this period. Dhan API failed to fetch.' })}\n\n`);
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
        const calcShortInd1 = []; const calcShortInd2 = [];
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
        // --- ENGINE VARIABLES ---
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
        const strategyLegs = strategy.legs || strategy.data?.legs || [];

        const globalMaxProfit = Number(riskSettings.maxProfit) || 0;
        const globalMaxLoss = Number(riskSettings.maxLoss) || 0;

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

        // 🔥 PERFECT EXPIRY LOGIC (As per User Rule: Nifty = Thursday, Rest = Monthly)
        const getNearestExpiryString = (tradeDateStr, symbolStr, reqExpiry = "WEEKLY") => {
            const d = new Date(tradeDateStr);
            const upSym = symbolStr.toUpperCase();
            let expiryDate = new Date(d);

            const isNifty = upSym.includes("NIFTY") && !upSym.includes("BANK") && !upSym.includes("FIN") && !upSym.includes("MID");

            if (isNifty && reqExpiry.toUpperCase() !== "MONTHLY") {
                // NSE Nifty -> Thursday (4)
                let targetDay = 4;
                while (expiryDate.getDay() !== targetDay) expiryDate.setDate(expiryDate.getDate() + 1);
                if (reqExpiry.toUpperCase() === "NEXT WEEKLY" || reqExpiry.toUpperCase() === "NEXT WEEK") {
                    expiryDate.setDate(expiryDate.getDate() + 7);
                }
            } else {
                // Others (BankNifty, FinNifty, etc.) OR Monthly Nifty -> Monthly Expiry (Last Thursday)
                let targetDay = 4; // Last Thursday of the month
                const lastDayOfMonth = new Date(expiryDate.getFullYear(), expiryDate.getMonth() + 1, 0);
                expiryDate = new Date(lastDayOfMonth);
                while (expiryDate.getDay() !== targetDay) expiryDate.setDate(expiryDate.getDate() - 1);

                if (d > expiryDate) {
                    const lastDayOfNextMonth = new Date(d.getFullYear(), d.getMonth() + 2, 0);
                    expiryDate = new Date(lastDayOfNextMonth);
                    while (expiryDate.getDay() !== targetDay) expiryDate.setDate(expiryDate.getDate() - 1);
                }
            }

            const formattedDate = `${String(expiryDate.getDate()).padStart(2, '0')}${expiryDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()}${String(expiryDate.getFullYear()).slice(-2)}`;
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const expDateForCheck = new Date(expiryDate); expDateForCheck.setHours(0, 0, 0, 0);

            return `${(expDateForCheck < today) ? "EXP" : "Upcoming EXP"} ${formattedDate}`;
        };


        // =========================================================
        // ⏱️ THE MAIN CANDLE LOOP
        // =========================================================
        for (let i = 0; i < cachedData.length; i++) {
            if (i % 500 === 0) await new Promise(resolve => setImmediate(resolve));

            const candle = cachedData[i];
            const candleTime = new Date(candle.timestamp).getTime();
            const istDate = new Date(candleTime + (5.5 * 60 * 60 * 1000));
            const h = String(istDate.getUTCHours()).padStart(2, '0');
            const m = String(istDate.getUTCMinutes()).padStart(2, '0');
            const timeInMinutes = (istDate.getUTCHours() * 60) + istDate.getUTCMinutes();
            const dateStr = istDate.toISOString().split('T')[0];

            if (dateStr !== currentDayTracker) {
                currentDayTracker = dateStr;
                isTradingHaltedForDay = false;
                optionDataCache = {}; 

                if (!dailyBreakdownMap[dateStr]) dailyBreakdownMap[dateStr] = { pnl: 0, trades: 0, tradesList: [], hasTradedTimeBased: false };

                // 🐸 THE LEAPFROG (Stable Version)
                if (bulkCacheMap[dateStr]) {
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

            if (isTimeBased && sTime) {
                const [sh, smStr] = sTime.split(':');
                let startMin = parseInt(sh) * 60 + parseInt(smStr.split(' ')[0]);
                if (sTime.toUpperCase().includes('PM') && parseInt(sh) !== 12) startMin += 720;
                if (sTime.toUpperCase().includes('AM') && parseInt(sh) === 12) startMin -= 720;

                if (timeInMinutes >= startMin && !dailyBreakdownMap[dateStr].hasTradedTimeBased) {
                    longSignal = true;
                    dailyBreakdownMap[dateStr].hasTradedTimeBased = true;
                }
            }

            const finalLongSignal = (txnType === 'Both Side' || txnType === 'Only Long' || isTimeBased) ? longSignal : false;
            const finalShortSignal = (txnType === 'Both Side' || txnType === 'Only Short') ? shortSignal : false;

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

                    if (isOptionsTrade && trade.premiumChart && trade.premiumChart.start_Time) {
                        let exactMatchIndex = trade.premiumChart.start_Time.findIndex(t => {
                            const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
                            return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
                        });

                        let isFallbackCandle = false;
                        if (exactMatchIndex === -1) {
                            let nearestIdx = -1;
                            for (let k = trade.premiumChart.start_Time.length - 1; k >= 0; k--) {
                                const optTime = new Date(trade.premiumChart.start_Time[k] * 1000 + (5.5 * 60 * 60 * 1000));
                                if (optTime <= istDate) { nearestIdx = k; break; }
                            }
                            exactMatchIndex = nearestIdx;
                            isFallbackCandle = true;
                        }

                        if (exactMatchIndex !== -1) {
                            let tempClose = trade.premiumChart.close[exactMatchIndex];
                            if (tempClose > spotClosePrice * 0.5) {
                                currentClose = trade.lastKnownPremium || trade.entryPrice;
                                currentHigh = currentLow = currentOpen = currentClose;
                            } else {
                                currentClose = tempClose;
                                if (isFallbackCandle) {
                                    currentHigh = tempClose;
                                    currentLow = tempClose;
                                    currentOpen = tempClose;
                                } else {
                                    currentHigh = trade.premiumChart.high[exactMatchIndex];
                                    currentLow = trade.premiumChart.low[exactMatchIndex];
                                    currentOpen = trade.premiumChart.open[exactMatchIndex];
                                }
                                trade.lastKnownPremium = currentClose;
                            }
                        } else {
                            currentClose = trade.lastKnownPremium || trade.entryPrice;
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

                let isSlMovedToCostGlobal = dailyBreakdownMap[dateStr].tradesList.some(t => t.exitType === "STOPLOSS" || t.exitType === "SL_MOVED_TO_COST");

                openTrades.forEach((trade, idx) => {
                    if (trade.markedForExit) return;

                    if (hitGlobalMaxProfit || hitGlobalMaxLoss) {
                        trade.markedForExit = true;
                        trade.exitReason = hitGlobalMaxProfit ? "MAX_PROFIT" : "MAX_LOSS";
                        if (hitGlobalMaxLoss && globalMaxLoss > 0) {
                            const exactLossPoints = globalMaxLoss / trade.quantity;
                            trade.exitPrice = trade.transaction === "BUY" ? (trade.entryPrice - exactLossPoints) : (trade.entryPrice + exactLossPoints);
                        } else if (hitGlobalMaxProfit && globalMaxProfit > 0) {
                            const exactProfitPoints = globalMaxProfit / trade.quantity;
                            trade.exitPrice = trade.transaction === "BUY" ? (trade.entryPrice + exactProfitPoints) : (trade.entryPrice - exactProfitPoints);
                        } else {
                            trade.exitPrice = trade.currentPrice;
                        }
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

                    if ((!isSlMovedToCost && slValue > 0) || isSlMovedToCost) {
                        if (spotTriggeredSl || (trade.transaction === "BUY" && trade.currentLow <= slPrice) || (trade.transaction === "SELL" && trade.currentHigh >= slPrice)) {
                            trade.markedForExit = true;
                            trade.exitReason = isSlMovedToCost ? "SL_MOVED_TO_COST" : "STOPLOSS";
                            trade.exitPrice = slPrice;
                            triggerReasonForExitAll = "STOPLOSS";
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
                                trade.markedForExit = true; trade.exitReason = "TRAILING_SL"; trade.exitPrice = trade.trailingSL;
                                triggerReasonForExitAll = "TRAILING_SL";
                            }
                        }
                    }

                    if (!trade.markedForExit) {
                        if ((trade.signalType === "LONG" && exitLongSignal) || (trade.signalType === "SHORT" && exitShortSignal)) {
                            trade.markedForExit = true; trade.exitReason = "INDICATOR_EXIT"; trade.exitPrice = trade.currentPrice;
                        }
                    }
                });

                if (triggerReasonForExitAll && !hitGlobalMaxProfit && !hitGlobalMaxLoss) {
                    const exitAllCheck = evaluateExitAllLogic(advanceFeaturesSettings, triggerReasonForExitAll);
                    if (exitAllCheck.shouldExitAll) {
                        openTrades.forEach(trade => {
                            if (!trade.markedForExit) {
                                trade.markedForExit = true;
                                trade.exitReason = exitAllCheck.exitReason;
                                trade.exitPrice = trade.currentPrice;
                            }
                        });
                    }
                }

                let remainingTrades = [];
                for (let trade of openTrades) {
                    if (trade.markedForExit || isExitTime || isLastCandleOfDay) {
                        if (!trade.markedForExit) {
                            trade.exitReason = isLastCandleOfDay ? "EOD_SQUAREOFF" : "TIME_SQUAREOFF";
                        }

                        const needsMarketPrice = ["TIME_SQUAREOFF", "EOD_SQUAREOFF", "INDICATOR_EXIT", "MAX_PROFIT", "MAX_LOSS", "EXIT_ALL_TGT", "EXIT_ALL_SL", "STOPLOSS", "TARGET", "TRAILING_SL", "SL_MOVED_TO_COST"].includes(trade.exitReason);
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
                                for(let k=0; k<cachedChart.timestamp.length; k++){
                                    const optTime = new Date(cachedChart.timestamp[k] * 1000 + (5.5 * 3600000));
                                    if(optTime.toISOString().split('T')[1].substring(0, 5) === exitTimeStr) { 
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

                                let reqExpiry = trade.legConfig.expiry || "WEEKLY";
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
                                        for(let k=0; k<atmExitData.timestamp.length; k++){
                                            const optTime = new Date(atmExitData.timestamp[k] * 1000 + (5.5 * 3600000));
                                            if(optTime.toISOString().split('T')[1].substring(0, 5) === exitTimeStr) { 
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
                                    for(let c = 0; c < candidates.length; c++) {
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
                                                for(let k=0; k<tempExitData.timestamp.length; k++){
                                                    const optTime = new Date(tempExitData.timestamp[k] * 1000 + (5.5 * 3600000));
                                                    if(optTime.toISOString().split('T')[1].substring(0, 5) === exitTimeStr) { tempIndex = k; break; }
                                                }
                                                
                                                if(tempIndex !== -1 && tempExitData.strike && Number(tempExitData.strike[tempIndex]) === fixedStrike) {
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
                                if (["STOPLOSS", "TRAILING_SL", "SL_MOVED_TO_COST"].includes(trade.exitReason)) {
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
                                    if (["STOPLOSS", "TARGET", "TRAILING_SL", "SL_MOVED_TO_COST"].includes(trade.exitReason)) {
                                        if (!useRealisticSlippage) {
                                            trade.exitPrice = cOpen; 
                                        } else {
                                            if (trade.transaction === "BUY") {
                                                if (["STOPLOSS", "TRAILING_SL", "SL_MOVED_TO_COST"].includes(trade.exitReason) && cOpen < mathPrice) trade.exitPrice = cOpen;
                                                else if (trade.exitReason === "TARGET" && cOpen > mathPrice) trade.exitPrice = cOpen;
                                                else trade.exitPrice = mathPrice; 
                                            } else { 
                                                if (["STOPLOSS", "TRAILING_SL", "SL_MOVED_TO_COST"].includes(trade.exitReason) && cOpen > mathPrice) trade.exitPrice = cOpen;
                                                else if (trade.exitReason === "TARGET" && cOpen < mathPrice) trade.exitPrice = cOpen;
                                                else trade.exitPrice = mathPrice; 
                                            }
                                        }
                                    } else {
                                        trade.exitPrice = trade.exitReason === "TIME_SQUAREOFF" ? cOpen : cClose;
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
                                if (["STOPLOSS", "TARGET", "TRAILING_SL", "SL_MOVED_TO_COST"].includes(trade.exitReason)) {
                                    if (isExitTime || isLastCandleOfDay) {
                                        trade.exitReason = isLastCandleOfDay ? "EOD_SQUAREOFF" : "TIME_SQUAREOFF";
                                        trade.exitPrice = null; 
                                    } else {
                                        trade.markedForExit = false;
                                        trade.exitReason = null;
                                        trade.exitPrice = null;
                                        remainingTrades.push(trade);
                                        continue; 
                                    }
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
                                    
                                    let intrinsicValue = 0;
                                    if (optType === "CE") intrinsicValue = Math.max(0, spotClosePrice - fixedStrike);
                                    else intrinsicValue = Math.max(0, fixedStrike - spotClosePrice);

                                    let dte = 0;
                                    try {
                                        const expMatch = trade.symbol.match(/EXP (\d{2}[A-Z]{3}\d{2})/i);
                                        if (expMatch && expMatch[1]) {
                                            const expDay = parseInt(expMatch[1].substring(0, 2));
                                            const monthStr = expMatch[1].substring(2, 5);
                                            const expYear = parseInt("20" + expMatch[1].substring(5, 7));
                                            const monthMap = {JAN:0, FEB:1, MAR:2, APR:3, MAY:4, JUN:5, JUL:6, AUG:7, SEP:8, OCT:9, NOV:10, DEC:11};
                                            const expDateObj = new Date(expYear, monthMap[monthStr.toUpperCase()], expDay, 15, 30, 0);
                                            
                                            const diffTime = expDateObj.getTime() - istDate.getTime();
                                            dte = Math.max(0, diffTime / (1000 * 60 * 60 * 24)); 
                                        }
                                    } catch(e) { dte = 1; }

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

                        const pnl = calcTradePnL(trade.entryPrice, trade.exitPrice, trade.quantity, trade.transaction);

                        const completedTrade = {
                            ...trade,
                            exitTime: `${h}:${m}:00`,
                            pnl: pnl,
                            exitType: trade.exitReason
                        };

                        dailyBreakdownMap[dateStr].tradesList.push(completedTrade);
                        dailyBreakdownMap[dateStr].pnl += pnl;
                        dailyBreakdownMap[dateStr].trades += 1;
                        if (pnl > 0) { winTrades++; if (pnl > maxProfitTrade) maxProfitTrade = pnl; }
                        else { lossTrades++; if (pnl < maxLossTrade) maxLossTrade = pnl; }

                        console.log(`🎯 [${completedTrade.exitType}] Date: ${dateStr} | Symbol: ${trade.symbol} | Exit: ${trade.exitPrice.toFixed(2)} | PnL: ${pnl.toFixed(2)}`);
                    } else {
                        remainingTrades.push(trade);
                    }
                }

                openTrades = remainingTrades;
            }
            else if (!isTradingHaltedForDay) {
                const mtmResult = evaluateMtmLogic(dailyBreakdownMap[dateStr].pnl, 0, riskSettings);
                if (mtmResult.isHalted) {
                    isTradingHaltedForDay = true;
                    console.log(mtmResult.logMessage);
                }
            }

            // =========================================================
            // 🔥 2. MULTI-LEG ENTRY LOGIC (Direct Dhan API for pure accuracy)
            // =========================================================
            if (openTrades.length === 0 && isMarketOpen && !isTradingHaltedForDay && (finalLongSignal || finalShortSignal)) {

                for (let legIndex = 0; legIndex < strategyLegs.length; legIndex++) {
                    const legData = strategyLegs[legIndex];

                    let tradeQuantity = legData.quantity;
                    if (!tradeQuantity || isNaN(tradeQuantity)) tradeQuantity = upperSymbol.includes("BANK") ? 30 : (upperSymbol.includes("NIFTY") ? 50 : 1);

                    const transActionTypeStr = (legData.action || "BUY").toUpperCase();
                    let activeOptionType = "";

                    if (isTimeBased) {
                        activeOptionType = (legData.optionType || "Call").toUpperCase().includes("C") ? "CE" : "PE";
                    } else {
                        if (transActionTypeStr === "BUY") activeOptionType = finalLongSignal ? "CE" : "PE";
                        else if (transActionTypeStr === "SELL") activeOptionType = finalLongSignal ? "PE" : "CE";
                    }

                    let finalEntryPrice = isOptionsTrade ? 0 : spotClosePrice;
                    let validTrade = true;
                    let premiumChartData = null;
                    let targetStrike = calculateATM(spotClosePrice, upperSymbol);
                    const strikeCriteria = legData.strikeCriteria || "ATM pt";
                    const strikeType = legData.strikeType || "ATM";
                    const reqExpiry = legData.expiry || "WEEKLY";

                    const expiryLabel = getNearestExpiryString(dateStr, upperSymbol, reqExpiry);
                    let tradeSymbol = `${upperSymbol} ${targetStrike} ${activeOptionType} (${expiryLabel})`;

                    if (isOptionsTrade && broker) {
                        let apiSuccess = false;

                        const targetExpStr = expiryLabel.split('EXP ')[1]; 
                        const expectedDay = targetExpStr ? targetExpStr.substring(0, 2) : ""; 
                        const expectedMonth = targetExpStr ? targetExpStr.substring(2, 5) : ""; 
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
                        openTrades.push({
                            id: `leg_${legIndex}`,
                            legConfig: legData,
                            symbol: tradeSymbol,
                            transaction: transActionTypeStr,
                            quantity: tradeQuantity,
                            entryTime: `${h}:${m}:00`,
                            entryPrice: finalEntryPrice,
                            exitTime: null, exitPrice: null, pnl: null, exitType: null,
                            optionConfig: isOptionsTrade ? { strike: targetStrike, type: activeOptionType } : null,
                            premiumChart: premiumChartData,
                            signalType: finalLongSignal ? "LONG" : "SHORT",
                            lastKnownPremium: finalEntryPrice,
                            markedForExit: false
                        });
                        console.log(`✅ [TRADE OPEN] Leg ${legIndex + 1} | Time: ${h}:${m} | Spot: ${spotClosePrice} | Premium: ${finalEntryPrice} | Type: ${activeOptionType}`);
                    }
                }
            }
        }

        // ==========================================
        // 🧮 5. DAILY LOOP (Metrics Generation)
        // ==========================================
        let totalMarketDays = Object.keys(dailyBreakdownMap).length;

        winTrades = 0; 
        lossTrades = 0; 
        maxProfitTrade = 0; 
        maxLossTrade = 0;

        for (const [date, data] of Object.entries(dailyBreakdownMap)) {
            currentEquity += data.pnl;
            if (currentEquity > peakEquity) peakEquity = currentEquity;
            const drawdown = currentEquity - peakEquity;
            if (drawdown < maxDrawdown) maxDrawdown = drawdown;

            if (data.tradesList && data.tradesList.length > 0) {
                data.tradesList.forEach(trade => {
                    if (trade.pnl > 0) {
                        winTrades++;
                        if (trade.pnl > maxProfitTrade) maxProfitTrade = trade.pnl;
                    } else if (trade.pnl < 0) {
                        lossTrades++;
                        if (trade.pnl < maxLossTrade) maxLossTrade = trade.pnl;
                    }
                });
            }

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
                totalTrades: winTrades + lossTrades, 
                winTrades, 
                lossTrades, 
                maxWinStreak, 
                maxLossStreak,
                maxProfit: maxProfitTrade, 
                maxLoss: maxLossTrade
            },
            equityCurve: equityCurve,
            daywiseBreakdown: daywiseBreakdown 
        };

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