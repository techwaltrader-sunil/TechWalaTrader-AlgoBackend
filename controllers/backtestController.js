
// const mongoose = require('mongoose'); 
// const Strategy = require('../models/Strategy');
// const HistoricalData = require('../models/HistoricalData');
// const Broker = require('../models/Broker');
// const { calculateIndicator, extractParams, evaluateCondition } = require('../services/indicatorService');
// const { getOptionSecurityId, sleep } = require('../services/instrumentService');

// const { fetchDhanHistoricalData, fetchExpiredOptionData } = require('../services/dhanService');

// // 🔥 NAYA FUNCTION: Indicator ke naam aur period ko nikalne ke liye
// const formatIndName = (ind) => {
//     if (!ind) return 'Value';
    
//     if (ind.display) {
//         // e.g., "EMA(9,Close)" ko "EMA(9)" me convert karna
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
//     try {
//         const { strategyId } = req.params;
//         const { period, start, end } = req.query;
        
//         const strategy = await Strategy.collection.findOne({ _id: new mongoose.Types.ObjectId(strategyId) });
//         if (!strategy) return res.status(404).json({ error: "Strategy not found" });

//         console.log(`\n🚀 Running Real Backtest for: ${strategy.name} | Period: ${period || '1M'}`);

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
        
//         // 🔥 FIX: Deep extraction for interval to handle MongoDB nesting
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
//             if (!broker) return res.status(400).json({ success: false, message: 'No active broker found for API keys' });
//         }

//         if (shouldFetchFromDhan) {
//             const dhanRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, spotSecurityId, exchangeSegment, "INDEX", startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0], timeframe);
//             const timeArray = dhanRes.data ? (dhanRes.data.start_Time || dhanRes.data.timestamp) : null;

//             if (dhanRes.success && timeArray) {
//                 const { open, high, low, close, volume } = dhanRes.data;
//                 const bulkOps = [];
//                 for (let i = 0; i < timeArray.length; i++) {
//                     let ms = timeArray[i];
//                     if (ms < 10000000000) ms = ms * 1000; 
//                     bulkOps.push({ insertOne: { document: { symbol: upperSymbol, timeframe, timestamp: new Date(ms), open: open[i], high: high[i], low: low[i], close: close[i], volume: volume[i] } } });
//                 }
                
//                 if (bulkOps.length > 0) {
//                     await HistoricalData.bulkWrite(bulkOps, { ordered: false }).catch(e => console.log("Duplicates ignored"));
//                     cachedData = await HistoricalData.find({ symbol: { $regex: new RegExp(cleanSymbolForMap, "i") }, timeframe, timestamp: { $gte: startDate, $lte: endDate } }).sort({ timestamp: 1 }).lean();
//                 }
//             } else {
//                 return res.status(404).json({ success: false, errorType: "NO_DATA", message: "Spot Data not available for this period." });
//             }
//         }

        
//         const findConditions = (obj) => {
//             if (!obj || typeof obj !== 'object') return null;
//             if (obj.longRules && Array.isArray(obj.longRules)) return obj;
//             if (Array.isArray(obj)) {
//                 for (let item of obj) {
//                     const found = findConditions(item);
//                     if (found) return found;
//                 }
//             } else {
//                 for (let key in obj) {
//                     const found = findConditions(obj[key]);
//                     if (found) return found;
//                 }
//             }
//             return null;
//         };

//         let entryConds = findConditions(strategy);

//         // =========================================================
//         // 📊 PRE-CALCULATE INDICATORS (LONG & SHORT ENTRY)
//         // =========================================================
//         const calcLongInd1 = []; const calcLongInd2 = [];
//         if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
//             entryConds.longRules.forEach((rule, idx) => {
//                 const params1 = extractParams(rule.ind1, rule.params);
//                 calcLongInd1[idx] = calculateIndicator({...rule.ind1, params: params1}, cachedData);
//                 const params2 = extractParams(rule.ind2, null);
//                 calcLongInd2[idx] = calculateIndicator({...rule.ind2, params: params2}, cachedData);
//             });
//         }

//         const calcShortInd1 = []; const calcShortInd2 = [];
//         if (entryConds && entryConds.shortRules && entryConds.shortRules.length > 0) {
//             entryConds.shortRules.forEach((rule, idx) => {
//                 const params1 = extractParams(rule.ind1, rule.params);
//                 calcShortInd1[idx] = calculateIndicator({...rule.ind1, params: params1}, cachedData);
//                 const params2 = extractParams(rule.ind2, null);
//                 calcShortInd2[idx] = calculateIndicator({...rule.ind2, params: params2}, cachedData);
//             });
//         }

//        // =========================================================
//         // 📊 PRE-CALCULATE EXIT INDICATORS (LONG & SHORT EXIT)
//         // =========================================================
//         let exitConds = {};
        
//         const possibleExits = strategy.exitConditions 
//                            || strategy.data?.exitConditions 
//                            || strategy.data?.entrySettings?.exitConditions 
//                            || strategy.entrySettings?.exitConditions
//                            || strategy.entryConditions?.[0]?.exitConditions 
//                            || strategy.data?.entryConditions?.[0]?.exitConditions 
//                            || [];

//         if (Array.isArray(possibleExits) && possibleExits.length > 0) {
//             exitConds = possibleExits[0];
//         } else if (possibleExits && typeof possibleExits === 'object' && !Array.isArray(possibleExits)) {
//             exitConds = possibleExits;
//         }

//         const rawExitLongRules = exitConds.longRules || [];
//         const rawExitShortRules = exitConds.shortRules || [];
        
//         const exitLongRules = rawExitLongRules.filter(rule => rule.ind1 && (rule.ind1.id || rule.ind1.display));
//         const exitShortRules = rawExitShortRules.filter(rule => rule.ind1 && (rule.ind1.id || rule.ind1.display));
        
//         const calcExitLongInd1 = []; const calcExitLongInd2 = [];
//         if (exitLongRules.length > 0) {
//             exitLongRules.forEach((rule, idx) => {
//                 const params1 = extractParams(rule.ind1, rule.params);
//                 calcExitLongInd1[idx] = calculateIndicator({...rule.ind1, params: params1}, cachedData);
//                 const params2 = extractParams(rule.ind2, null);
//                 calcExitLongInd2[idx] = calculateIndicator({...rule.ind2, params: params2}, cachedData);
//             });
//         }

//         const calcExitShortInd1 = []; const calcExitShortInd2 = [];
//         if (exitShortRules.length > 0) {
//             exitShortRules.forEach((rule, idx) => {
//                 const params1 = extractParams(rule.ind1, rule.params);
//                 calcExitShortInd1[idx] = calculateIndicator({...rule.ind1, params: params1}, cachedData);
//                 const params2 = extractParams(rule.ind2, null);
//                 calcExitShortInd2[idx] = calculateIndicator({...rule.ind2, params: params2}, cachedData);
//             });
//         }

//         let currentEquity = 0, peakEquity = 0, maxDrawdown = 0;
//         let winDays = 0, lossDays = 0, winTrades = 0, lossTrades = 0;
//         let currentWinStreak = 0, currentLossStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
//         let maxProfitTrade = 0, maxLossTrade = 0;
//         const equityCurve = []; const daywiseBreakdown = []; let dailyBreakdownMap = {}; 

//         let isPositionOpen = false; 
//         let currentTrade = null; 
        
//         let tradeQuantity = strategy.legs?.[0]?.quantity || strategy.data?.legs?.[0]?.quantity; 
//         if (!tradeQuantity || isNaN(tradeQuantity)) tradeQuantity = upperSymbol.includes("BANK") ? 30 : (upperSymbol.includes("NIFTY") ? 50 : 1);

//         const legData = strategy.legs?.[0] || strategy.data?.legs?.[0] || {};
//         const transactionType = legData.action || "BUY";

//         const riskSettings = strategy.data?.riskManagement || strategy.riskManagement || {};
//         const globalMaxProfit = Number(riskSettings.maxProfit) || 0;
//         const globalMaxLoss = Number(riskSettings.maxLoss) || 0;
//         let isTradingHaltedForDay = false; 
//         let currentDayTracker = ""; 

//         const calculateATM = (spotPrice, symbolStr) => {
//             if(symbolStr.includes("BANK")) return Math.round(spotPrice / 100) * 100;
//             return Math.round(spotPrice / 50) * 50;
//         };

//         const calcTradePnL = (entryP, exitP, qty, action) => {
//             if(action === "BUY") return (exitP - entryP) * qty;
//             return (entryP - exitP) * qty; 
//         };

//         const getNearestExpiryString = (tradeDateStr, symbolStr) => {
//             const d = new Date(tradeDateStr);
//             const upSym = symbolStr.toUpperCase();
//             let expiryDate = new Date(d);
            
//             if (upSym.includes("NIFTY") && !upSym.includes("BANK") && !upSym.includes("FIN") && !upSym.includes("MID")) {
//                 let targetDay = 2; 
//                 while (expiryDate.getDay() !== targetDay) {
//                     expiryDate.setDate(expiryDate.getDate() + 1);
//                 }
//             } 
//             else {
//                 let targetDay = 2; 
//                 if (upSym.includes("MID")) targetDay = 1; 
                
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

//             const day = String(expiryDate.getDate()).padStart(2, '0');
//             const month = expiryDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
//             const year = String(expiryDate.getFullYear()).slice(-2);
//             const formattedDate = `${day}${month}${year}`;

//             const today = new Date();
//             today.setHours(0, 0, 0, 0); 
            
//             const expDateForCheck = new Date(expiryDate);
//             expDateForCheck.setHours(0, 0, 0, 0);

//             const prefix = (expDateForCheck < today) ? "EXP" : "Upcoming EXP";

//             return `${prefix} ${formattedDate}`; 
//         };

//         // =========================================================
//         // 🔄 MAIN BACKTEST LOOP
//         // =========================================================
//         for (let i = 0; i < cachedData.length; i++) {

//             if (i % 500 === 0) {
//                 await new Promise(resolve => setImmediate(resolve));
//             }

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
//             }

//             if (!dailyBreakdownMap[dateStr]) dailyBreakdownMap[dateStr] = { pnl: 0, trades: 0, tradesList: [] };

//             // 🟢 LONG SIGNAL EVALUATION
//             let longSignal = false;
//             if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
//                 let overallResult = null;
//                 entryConds.longRules.forEach((rule, idx) => {
//                     const val1 = calcLongInd1[idx] ? calcLongInd1[idx][i] : null;
//                     const val2 = calcLongInd2[idx] ? calcLongInd2[idx][i] : null;
//                     const prevVal1 = (i > 0 && calcLongInd1[idx]) ? calcLongInd1[idx][i-1] : null;
//                     const prevVal2 = (i > 0 && calcLongInd2[idx]) ? calcLongInd2[idx][i-1] : null;

//                     const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
//                     const ruleResult = evaluateCondition(val1, val2, prevVal1, prevVal2, operator);
                    
//                     if (idx === 0) overallResult = ruleResult;
//                     else {
//                         const logicalOp = entryConds.logicalOps[idx - 1]; 
//                         if (logicalOp === 'AND') overallResult = overallResult && ruleResult;
//                         else if (logicalOp === 'OR') overallResult = overallResult || ruleResult;
//                     }
//                 });
//                 longSignal = overallResult;
//             }

//             // 🔴 SHORT SIGNAL EVALUATION
//             let shortSignal = false;
//             if (entryConds && entryConds.shortRules && entryConds.shortRules.length > 0) {
//                 let overallResult = null;
//                 entryConds.shortRules.forEach((rule, idx) => {
//                     const val1 = calcShortInd1[idx] ? calcShortInd1[idx][i] : null;
//                     const val2 = calcShortInd2[idx] ? calcShortInd2[idx][i] : null;
//                     const prevVal1 = (i > 0 && calcShortInd1[idx]) ? calcShortInd1[idx][i-1] : null;
//                     const prevVal2 = (i > 0 && calcShortInd2[idx]) ? calcShortInd2[idx][i-1] : null;

//                     const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
//                     const ruleResult = evaluateCondition(val1, val2, prevVal1, prevVal2, operator);
                    
//                     if (idx === 0) overallResult = ruleResult;
//                     else {
//                         const logicalOp = entryConds.logicalOps[idx - 1]; 
//                         if (logicalOp === 'AND') overallResult = overallResult && ruleResult;
//                         else if (logicalOp === 'OR') overallResult = overallResult || ruleResult;
//                     }
//                 });
//                 shortSignal = overallResult;
//             }

//             // --------------------------------------------------------
//             // 🚦 TRANSACTION TYPE FILTER LOGIC
//             // --------------------------------------------------------
//             const txnType = strategy.config?.transactionType || strategy.data?.config?.transactionType || 'Both Side';
//             const finalLongSignal = (txnType === 'Both Side' || txnType === 'Only Long') ? longSignal : false;
//             const finalShortSignal = (txnType === 'Both Side' || txnType === 'Only Short') ? shortSignal : false;

//             // 🔴 EXIT LONG SIGNAL EVALUATION
//             let exitLongSignal = false;
//             if (exitLongRules.length > 0) {
//                 let overallResult = null;
//                 exitLongRules.forEach((rule, idx) => {
//                     const val1 = calcExitLongInd1[idx] ? calcExitLongInd1[idx][i] : null;
//                     const val2 = calcExitLongInd2[idx] ? calcExitLongInd2[idx][i] : null;
//                     const prevVal1 = (i > 0 && calcExitLongInd1[idx]) ? calcExitLongInd1[idx][i-1] : null;
//                     const prevVal2 = (i > 0 && calcExitLongInd2[idx]) ? calcExitLongInd2[idx][i-1] : null;

//                     const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
//                     const ruleResult = evaluateCondition(val1, val2, prevVal1, prevVal2, operator);
                    
//                     if (idx === 0) overallResult = ruleResult;
//                     else {
//                         const logicalOp = exitConds.logicalOpsLong ? exitConds.logicalOpsLong[idx - 1] : 'AND'; 
//                         if (logicalOp === 'AND') overallResult = overallResult && ruleResult;
//                         else if (logicalOp === 'OR') overallResult = overallResult || ruleResult;
//                     }
//                 });
//                 exitLongSignal = overallResult;
//             }

//             // 🟢 EXIT SHORT SIGNAL EVALUATION
//             let exitShortSignal = false;
//             if (exitShortRules.length > 0) {
//                 let overallResult = null;
//                 exitShortRules.forEach((rule, idx) => {
//                     const val1 = calcExitShortInd1[idx] ? calcExitShortInd1[idx][i] : null;
//                     const val2 = calcExitShortInd2[idx] ? calcExitShortInd2[idx][i] : null;
//                     const prevVal1 = (i > 0 && calcExitShortInd1[idx]) ? calcExitShortInd1[idx][i-1] : null;
//                     const prevVal2 = (i > 0 && calcExitShortInd2[idx]) ? calcExitShortInd2[idx][i-1] : null;

//                     const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
//                     const ruleResult = evaluateCondition(val1, val2, prevVal1, prevVal2, operator);
                    
//                     if (idx === 0) overallResult = ruleResult;
//                     else {
//                         const logicalOp = exitConds.logicalOpsShort ? exitConds.logicalOpsShort[idx - 1] : 'AND'; 
//                         if (logicalOp === 'AND') overallResult = overallResult && ruleResult;
//                         else if (logicalOp === 'OR') overallResult = overallResult || ruleResult;
//                     }
//                 });
//                 exitShortSignal = overallResult;
//             }

//             const isMarketOpen = timeInMinutes >= 555 && timeInMinutes < 915; 
//             const isExitTime = timeInMinutes >= 915; 
//             let isLastCandleOfDay = false;
//             if (i === cachedData.length - 1) isLastCandleOfDay = true;
//             else {
//                 const nextCandleIst = new Date(new Date(cachedData[i+1].timestamp).getTime() + (5.5 * 60 * 60 * 1000));
//                 if (nextCandleIst.toISOString().split('T')[0] !== dateStr) isLastCandleOfDay = true;
//             }

//             const spotClosePrice = parseFloat(candle.close);



//             // =========================================================
//             // 🔥 ENTRY X-RAY DEBUGGER (Jab koi trade open nahi hai)
//             // =========================================================
//             if (!isPositionOpen && isMarketOpen && !isTradingHaltedForDay) {
                
//                 // LONG ENTRY CHECK
//                 if (txnType === 'Both Side' || txnType === 'Only Long') {
//                     if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
//                         const v1 = calcLongInd1.length > 0 ? calcLongInd1[0][i] : null;
//                         const v2 = calcLongInd2.length > 0 ? calcLongInd2[0][i] : null;
//                         const n1 = formatIndName(entryConds.longRules[0].ind1);
//                         const n2 = formatIndName(entryConds.longRules[0].ind2);
//                         console.log(`🔍 [ENTRY X-RAY] Time: ${h}:${m} | Check: LONG | ${n1}: ${v1 ? v1.toFixed(2) : 'null'} | ${n2}: ${v2 ? v2.toFixed(2) : 'null'} | Signal: ${finalLongSignal}`);
//                     }
//                 }

//                 // SHORT ENTRY CHECK
//                 if (txnType === 'Both Side' || txnType === 'Only Short') {
//                     if (entryConds && entryConds.shortRules && entryConds.shortRules.length > 0) {
//                         const v1 = calcShortInd1.length > 0 ? calcShortInd1[0][i] : null;
//                         const v2 = calcShortInd2.length > 0 ? calcShortInd2[0][i] : null;
//                         const n1 = formatIndName(entryConds.shortRules[0].ind1);
//                         const n2 = formatIndName(entryConds.shortRules[0].ind2);
//                         console.log(`🔍 [ENTRY X-RAY] Time: ${h}:${m} | Check: SHORT | ${n1}: ${v1 ? v1.toFixed(2) : 'null'} | ${n2}: ${v2 ? v2.toFixed(2) : 'null'} | Signal: ${finalShortSignal}`);
//                     }
//                 }
//             }

//             // =========================================================
//             // 5. 🛑 M2M RISK CHECK (SL/TP & Global Max Profit/Loss Check)
//             // =========================================================
//             if (isPositionOpen && currentTrade) {
                
//                 // 🔥 THE RESTORED UNSTOPPABLE X-RAY DEBUGGER (WITH SMART NAMES) 🔥
//                 if (currentTrade.signalType === "SHORT") {
//                     const v1 = calcExitShortInd1.length > 0 ? calcExitShortInd1[0][i] : null;
//                     const v2 = calcExitShortInd2.length > 0 ? calcExitShortInd2[0][i] : null;
//                     const n1 = exitShortRules.length > 0 ? formatIndName(exitShortRules[0].ind1) : 'Ind1';
//                     const n2 = exitShortRules.length > 0 ? formatIndName(exitShortRules[0].ind2) : 'Ind2';
//                     console.log(`🔍 [X-RAY] Time: ${h}:${m} | Type: SHORT | ${n1}: ${v1 ? v1.toFixed(2) : 'null'} | ${n2}: ${v2 ? v2.toFixed(2) : 'null'} | Signal: ${exitShortSignal}`);
//                 } else if (currentTrade.signalType === "LONG") {
//                     const v1 = calcExitLongInd1.length > 0 ? calcExitLongInd1[0][i] : null;
//                     const v2 = calcExitLongInd2.length > 0 ? calcExitLongInd2[0][i] : null;
//                     const n1 = exitLongRules.length > 0 ? formatIndName(exitLongRules[0].ind1) : 'Ind1';
//                     const n2 = exitLongRules.length > 0 ? formatIndName(exitLongRules[0].ind2) : 'Ind2';
//                     console.log(`🔍 [X-RAY] Time: ${h}:${m} | Type: LONG | ${n1}: ${v1 ? v1.toFixed(2) : 'null'} | ${n2}: ${v2 ? v2.toFixed(2) : 'null'} | Signal: ${exitLongSignal}`);
//                 }

//                 let hitSL = false;
//                 let hitTP = false;
//                 let hitMaxProfit = false;
//                 let hitMaxLoss = false;
//                 let hitIndicatorExit = false;

//                 let exitPrice = 0;
//                 let exitReason = "";

//                 const slValue = legData.slValue || 0;
//                 const tpValue = legData.tpValue || 0;
//                 let slPrice = 0;
//                 let tpPrice = 0;

//                 if (currentTrade.transaction === "BUY") {
//                     slPrice = currentTrade.entryPrice * (1 - slValue / 100);
//                     tpPrice = currentTrade.entryPrice * (1 + tpValue / 100);
//                 } else if (currentTrade.transaction === "SELL") {
//                     slPrice = currentTrade.entryPrice * (1 + slValue / 100);
//                     tpPrice = currentTrade.entryPrice * (1 - tpValue / 100);
//                 }

//                 let currentHigh = spotClosePrice; 
//                 let currentLow = spotClosePrice;  
//                 let currentClose = spotClosePrice; 

//                 if (isOptionsTrade && currentTrade.premiumChart && currentTrade.premiumChart.start_Time) {
//                     const exactMatchIndex = currentTrade.premiumChart.start_Time.findIndex(t => {
//                         const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                         return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                     });
                    
//                     if (exactMatchIndex !== -1) {
//                         let tempClose = currentTrade.premiumChart.close[exactMatchIndex];
//                         if (tempClose > spotClosePrice * 0.5) {
//                             currentClose = currentTrade.lastKnownPremium || currentTrade.entryPrice;
//                             currentHigh = currentClose;
//                             currentLow = currentClose;
//                         } else {
//                             currentClose = tempClose;
//                             currentHigh = currentTrade.premiumChart.high[exactMatchIndex];
//                             currentLow = currentTrade.premiumChart.low[exactMatchIndex];
//                             currentTrade.lastKnownPremium = currentClose; 
//                         }
//                     } else {
//                         currentClose = currentTrade.lastKnownPremium || currentTrade.entryPrice;
//                         currentHigh = currentClose;
//                         currentLow = currentClose;
//                     }
//                 } else if (!isOptionsTrade) {
//                     currentHigh = parseFloat(candle.high);
//                     currentLow = parseFloat(candle.low);
//                     currentClose = parseFloat(candle.close);
//                 }

//                 // 🛑 1. CHECK LEG STOPLOSS & TARGET 
//                 if (slValue > 0 && currentTrade.entryPrice > 0) {
//                     if (currentTrade.transaction === "BUY" && currentLow <= slPrice) {
//                         hitSL = true; exitPrice = slPrice; exitReason = "STOPLOSS";
//                     } else if (currentTrade.transaction === "SELL" && currentHigh >= slPrice) {
//                         hitSL = true; exitPrice = slPrice; exitReason = "STOPLOSS"; 
//                     }
//                 }
                
//                 if (tpValue > 0 && currentTrade.entryPrice > 0) {
//                     if (currentTrade.transaction === "BUY" && currentHigh >= tpPrice) {
//                         hitTP = true; exitPrice = tpPrice; exitReason = "TARGET";
//                     } else if (currentTrade.transaction === "SELL" && currentLow <= tpPrice) {
//                         hitTP = true; exitPrice = tpPrice; exitReason = "TARGET"; 
//                     }
//                 }


//                 // =========================================================
//                 // 🔥 TRAILING STOP LOSS (TSL) ENGINE 🚀
//                 // =========================================================
//                 const openTradePnL = calcTradePnL(currentTrade.entryPrice, currentClose, tradeQuantity, currentTrade.transaction);

//                 if (currentTrade.highestPnL === undefined) currentTrade.highestPnL = openTradePnL;
//                 if (openTradePnL > currentTrade.highestPnL) currentTrade.highestPnL = openTradePnL;

//                 const trailingType = riskSettings.profitTrailing || "No Trailing";
//                 const lockTrigger = Number(riskSettings.lockTrigger) || 0;
//                 const lockAmount = Number(riskSettings.lockAmount) || 0;
//                 const trailTrigger = Number(riskSettings.trailTrigger) || 0;
//                 const trailAmount = Number(riskSettings.trailAmount) || 0;

//                 if (!hitSL && !hitTP && trailingType !== "No Trailing") {
                    
//                     if (currentTrade.lockedPnL === undefined) currentTrade.lockedPnL = -Infinity;
//                     if (currentTrade.trailingPnL === undefined) currentTrade.trailingPnL = -Infinity;

//                     // 🔒 A. Lock Fix Profit Logic
//                     if (!currentTrade.tslLocked && (trailingType === "Lock Fix Profit" || trailingType === "Lock and Trail")) {
//                         if (lockTrigger > 0 && currentTrade.highestPnL >= lockTrigger) {
//                             currentTrade.lockedPnL = lockAmount;
//                             currentTrade.tslLocked = true;
//                         }
//                     }

//                     // 🏃‍♂️ B. Trail Profit Logic
//                     if (trailingType === "Trail Profit" || (trailingType === "Lock and Trail" && currentTrade.tslLocked)) {
//                         if (trailTrigger > 0) {
//                             let trailingBasePnL = currentTrade.highestPnL;
                            
//                             if (trailingType === "Lock and Trail") {
//                                 trailingBasePnL = currentTrade.highestPnL - lockTrigger;
//                             }

//                             if (trailingBasePnL >= trailTrigger) {
//                                 let steps = Math.floor(trailingBasePnL / trailTrigger);
//                                 let baseAmount = (trailingType === "Lock and Trail") ? lockAmount : 0;
//                                 let newTrailingPnL = baseAmount + (steps * trailAmount);

//                                 if (newTrailingPnL > currentTrade.trailingPnL) {
//                                     currentTrade.trailingPnL = newTrailingPnL;
//                                 }
//                             }
//                         }
//                     }

//                     // 🛑 C. TSL Hit Execution
//                     let activeFloorPnL = Math.max(currentTrade.lockedPnL, currentTrade.trailingPnL);

//                     if (activeFloorPnL !== -Infinity && openTradePnL <= activeFloorPnL) {
//                         hitSL = true; 
//                         exitReason = "TRAILING_SL";
                        
//                         if (currentTrade.transaction === "BUY") {
//                             exitPrice = currentTrade.entryPrice + (activeFloorPnL / tradeQuantity);
//                         } else {
//                             exitPrice = currentTrade.entryPrice - (activeFloorPnL / tradeQuantity);
//                         }
//                     }
//                 }

//                 // 🔥 2. CHECK GLOBAL MAX PROFIT / MAX LOSS
//                 if (!hitSL && !hitTP) { 
//                     const openTradePnL = calcTradePnL(currentTrade.entryPrice, currentClose, tradeQuantity, currentTrade.transaction);
//                     const runningDailyPnL = dailyBreakdownMap[dateStr].pnl + openTradePnL; 

//                     if (globalMaxProfit > 0 && runningDailyPnL >= globalMaxProfit) {
//                         hitMaxProfit = true; exitPrice = currentClose; exitReason = "MAX_PROFIT";
//                         isTradingHaltedForDay = true; 
//                     } 
//                     else if (globalMaxLoss > 0 && runningDailyPnL <= -globalMaxLoss) {
//                         hitMaxLoss = true; exitPrice = currentClose; exitReason = "MAX_LOSS";
//                         isTradingHaltedForDay = true; 
//                     }
//                 }

//                 // 🔥 3. CHECK INDICATOR BASED EXIT
//                 if (!hitSL && !hitTP && !hitMaxProfit && !hitMaxLoss) {
//                     if (currentTrade.signalType === "LONG" && exitLongSignal) {
//                         hitIndicatorExit = true;
//                         exitPrice = currentClose; 
//                         exitReason = "INDICATOR_EXIT";
//                     } 
//                     else if (currentTrade.signalType === "SHORT" && exitShortSignal) {
//                         hitIndicatorExit = true;
//                         exitPrice = currentClose;
//                         exitReason = "INDICATOR_EXIT";
//                     }
//                 }
                
//                 // 🚀 EXIT EXECUTION
//                 if (hitSL || hitTP || hitMaxProfit || hitMaxLoss || hitIndicatorExit) {
//                     isPositionOpen = false;
//                     const pnl = calcTradePnL(currentTrade.entryPrice, exitPrice, tradeQuantity, currentTrade.transaction);

//                     currentTrade.exitTime = `${h}:${m}:00`;
//                     currentTrade.exitPrice = exitPrice;
//                     currentTrade.pnl = pnl;
//                     currentTrade.exitType = exitReason;
                    
//                     dailyBreakdownMap[dateStr].tradesList.push(currentTrade);
//                     dailyBreakdownMap[dateStr].pnl += pnl;
//                     dailyBreakdownMap[dateStr].trades += 1;
//                     if (pnl > 0) { winTrades++; if(pnl > maxProfitTrade) maxProfitTrade = pnl; } 
//                     else { lossTrades++; if(pnl < maxLossTrade) maxLossTrade = pnl; }
                    
//                     console.log(`🎯 [${currentTrade.exitType}] Date: ${dateStr} | Exit Premium: ${exitPrice.toFixed(2)} | PnL: ${pnl.toFixed(2)}`);
//                     currentTrade = null;
//                     continue; 
//                 }
//             } 
//             else if (!isTradingHaltedForDay) {
//                 const realizedDailyPnL = dailyBreakdownMap[dateStr].pnl;
//                 if (globalMaxProfit > 0 && realizedDailyPnL >= globalMaxProfit) isTradingHaltedForDay = true;
//                 if (globalMaxLoss > 0 && realizedDailyPnL <= -globalMaxLoss) isTradingHaltedForDay = true;
//             }


//             // =========================================================
//             // 🟢 TAKE TRADE (ENTRY)
//             // =========================================================
//            if (!isPositionOpen && isMarketOpen && !isTradingHaltedForDay && (finalLongSignal || finalShortSignal)) {
                
//                 const transActionTypeStr = (legData.action || "BUY").toUpperCase();
                
//                 let activeOptionType = "";
//                 if (transActionTypeStr === "BUY") {
//                     activeOptionType = finalLongSignal ? "CE" : "PE";
//                 } else if (transActionTypeStr === "SELL") {
//                     activeOptionType = finalLongSignal ? "PE" : "CE"; 
//                 }
                
//                 let tradeSymbol = upperSymbol;
//                 let finalEntryPrice = spotClosePrice;
//                 let validTrade = true;
//                 let premiumChartData = null; 
//                 let targetStrike = calculateATM(spotClosePrice, upperSymbol); // Default Fallback

//                 if(isOptionsTrade && broker) {
//                     let apiSuccess = false;
                    
//                     const strikeCriteria = legData.strikeCriteria || "ATM pt";
//                     const strikeType = legData.strikeType || "ATM";
//                     const reqExpiry = legData.expiry || "WEEKLY";

//                     console.log(`🔍 [X-RAY] Fetching Option ID -> Base: ${upperSymbol}, OptType: ${activeOptionType}`);

//                     const optionConfig = getOptionSecurityId(upperSymbol, spotClosePrice, strikeCriteria, strikeType, activeOptionType, reqExpiry);
                    
//                     if (optionConfig && optionConfig.strike) {
//                         targetStrike = optionConfig.strike; // Update targetStrike dynamically
//                     }

//                     if(optionConfig) {
//                         try {
//                             await sleep(500);
//                             const optRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, optionConfig.id, "NSE_FNO", "OPTIDX", dateStr, dateStr, "1");
//                             if(optRes.success && optRes.data && optRes.data.close) {
//                                 const exactMatchIndex = optRes.data.start_Time.findIndex(t => {
//                                     const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                                     return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                                 });
//                                 finalEntryPrice = exactMatchIndex !== -1 ? optRes.data.close[exactMatchIndex] : optRes.data.close[0];
//                                 tradeSymbol = optionConfig.tradingSymbol;
//                                 premiumChartData = optRes.data; 
//                                 apiSuccess = true;
//                             } 
//                         } catch(e) { }
//                     } 
                    
//                     if (!apiSuccess) {
//                         try {
//                             await sleep(500);
//                             const expRes = await fetchExpiredOptionData(broker.clientId, broker.apiSecret, spotSecurityId, targetStrike, activeOptionType, dateStr, dateStr);
//                             if(expRes.success && expRes.data && expRes.data.close) {
//                                 const exactMatchIndex = expRes.data.start_Time.findIndex(t => {
//                                     const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                                     return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                                 });
//                                 finalEntryPrice = exactMatchIndex !== -1 ? expRes.data.close[exactMatchIndex] : expRes.data.close[0];
                                
//                                 const expiryLabel = getNearestExpiryString(dateStr, upperSymbol);
//                                 tradeSymbol = `${upperSymbol} ${targetStrike} ${activeOptionType} (${expiryLabel})`;

//                                 premiumChartData = expRes.data; 
//                                 apiSuccess = true;
//                             }
//                         } catch(e) { }
//                     }

//                     if (apiSuccess && finalEntryPrice > spotClosePrice * 0.5) {
//                         apiSuccess = false;
//                         validTrade = false;
//                         console.log(`❌ Trade Canceled: Dhan API sent garbage premium (${finalEntryPrice}) matching the Spot price!`);
//                     }

//                     if (!apiSuccess) {
//                         validTrade = false;
//                         console.log(`❌ Trade Canceled: Premium Data not available for ${upperSymbol} ${targetStrike} ${activeOptionType}`);
//                     }
//                 }

//                 if (validTrade) {
//                     isPositionOpen = true;
//                     currentTrade = {
//                         symbol: tradeSymbol, transaction: transActionTypeStr, quantity: tradeQuantity,
//                         entryTime: `${h}:${m}:00`, entryPrice: finalEntryPrice,
//                         exitTime: null, exitPrice: null, pnl: null, exitType: null,
//                         optionConfig: isOptionsTrade ? { strike: targetStrike, type: activeOptionType } : null,
//                         premiumChart: premiumChartData,
//                         signalType: finalLongSignal ? "LONG" : "SHORT",
//                         lastKnownPremium: finalEntryPrice 
//                     };
//                     console.log(`✅ [TRADE OPEN] Date: ${dateStr} | Time: ${h}:${m} | Spot: ${spotClosePrice} | Premium: ${finalEntryPrice} | Type: ${activeOptionType}`);
//                 }
//             }

            
            
//             // =========================================================
//             // 🔴 EXIT TRADE (TIME SQAUREOFF)
//             // =========================================================
//             if (isPositionOpen && (isExitTime || isLastCandleOfDay)) {
//                 isPositionOpen = false;
//                 let finalExitPrice = spotClosePrice;

//                 if(isOptionsTrade && currentTrade.optionConfig && broker) {
//                     let apiSuccess = false;
//                     const targetStrike = currentTrade.optionConfig.strike;
                    
//                     const reqExpiry = legData.expiry || "WEEKLY";
//                     const optionConfig = getOptionSecurityId(upperSymbol, targetStrike, "ATM pt", "ATM", currentTrade.optionConfig.type, reqExpiry);
                    
//                     if(optionConfig) {
//                         try {
//                             await sleep(500);
//                             const optRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, optionConfig.id, "NSE_FNO", "OPTIDX", dateStr, dateStr, "1");
//                             if(optRes.success && optRes.data && optRes.data.close) {
//                                 const exactMatchIndex = optRes.data.start_Time.findIndex(t => {
//                                     const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                                     return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                                 });
//                                 finalExitPrice = exactMatchIndex !== -1 ? optRes.data.close[exactMatchIndex] : optRes.data.close[optRes.data.close.length - 1];
//                                 apiSuccess = true;
//                             }
//                         } catch(e) { }
//                     }

//                     if (!apiSuccess) {
//                         try {
//                             await sleep(500);
//                             const expRes = await fetchExpiredOptionData(broker.clientId, broker.apiSecret, spotSecurityId, targetStrike, currentTrade.optionConfig.type, dateStr, dateStr);
//                             if(expRes.success && expRes.data && expRes.data.close) {
//                                 const exactMatchIndex = expRes.data.start_Time.findIndex(t => {
//                                     const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                                     return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                                 });
//                                 finalExitPrice = exactMatchIndex !== -1 ? expRes.data.close[exactMatchIndex] : expRes.data.close[expRes.data.close.length - 1];
//                                 apiSuccess = true;
//                             }
//                         } catch(e) { }
//                     }

//                     if (!apiSuccess) {
//                         finalExitPrice = currentTrade.entryPrice; 
//                     }
//                 }

//                 const pnl = calcTradePnL(currentTrade.entryPrice, finalExitPrice, tradeQuantity, transactionType);

//                 currentTrade.exitTime = `${h}:${m}:00`;
//                 currentTrade.exitPrice = finalExitPrice;
//                 currentTrade.pnl = pnl;
//                 currentTrade.exitType = isLastCandleOfDay ? "EOD_SQUAREOFF" : "TIME_SQUAREOFF";
//                 dailyBreakdownMap[dateStr].tradesList.push(currentTrade);
                
//                 console.log(`❌ [TRADE CLOSE] Date: ${dateStr} | Premium: ${finalExitPrice.toFixed(2)} | PnL: ${pnl.toFixed(2)}`);
//                 currentTrade = null; 

//                 dailyBreakdownMap[dateStr].pnl += pnl;
//                 dailyBreakdownMap[dateStr].trades += 1;

//                 if (pnl > 0) { winTrades++; if (pnl > maxProfitTrade) maxProfitTrade = pnl; } 
//                 else { lossTrades++; if (pnl < maxLossTrade) maxLossTrade = pnl; }
//             }
//         }

//         // ==========================================
//         // 🧮 5. DAILY LOOP (UI Format Conversion & Metrics)
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
//             equityCurve, 
//             daywiseBreakdown: daywiseBreakdown.reverse()
//         };

//         return res.status(200).json({ success: true, data: backtestResult });

//     } catch (error) {
//         console.error("Backtest Error:", error);
//         res.status(500).json({ success: false, error: "Internal Server Error" });
//     }
// };

// module.exports = { runBacktestSimulator };



// const mongoose = require('mongoose'); 
// const Strategy = require('../models/Strategy');
// const HistoricalData = require('../models/HistoricalData');
// const Broker = require('../models/Broker');
// const { calculateIndicator, extractParams, evaluateCondition } = require('../services/indicatorService');
// const { getOptionSecurityId, sleep } = require('../services/instrumentService');
// const { fetchDhanHistoricalData, fetchExpiredOptionData } = require('../services/dhanService');

// // 🔥 IMPORTING SHARED LOGIC: TSL Engine ko yahan import kiya hai!
// const { evaluateTrailingSL } = require('../engine/features/riskManagement/trailingLogic');

// // Indicator ke naam aur period ko nikalne ke liye
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
//     try {
//         const { strategyId } = req.params;
//         const { period, start, end } = req.query;
        
//         const strategy = await Strategy.collection.findOne({ _id: new mongoose.Types.ObjectId(strategyId) });
//         if (!strategy) return res.status(404).json({ error: "Strategy not found" });

//         console.log(`\n🚀 Running Real Backtest for: ${strategy.name} | Period: ${period || '1M'}`);

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
//             if (!broker) return res.status(400).json({ success: false, message: 'No active broker found for API keys' });
//         }

//         if (shouldFetchFromDhan) {
//             const dhanRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, spotSecurityId, exchangeSegment, "INDEX", startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0], timeframe);
//             const timeArray = dhanRes.data ? (dhanRes.data.start_Time || dhanRes.data.timestamp) : null;

//             if (dhanRes.success && timeArray) {
//                 const { open, high, low, close, volume } = dhanRes.data;
//                 const bulkOps = [];
//                 for (let i = 0; i < timeArray.length; i++) {
//                     let ms = timeArray[i];
//                     if (ms < 10000000000) ms = ms * 1000; 
//                     bulkOps.push({ insertOne: { document: { symbol: upperSymbol, timeframe, timestamp: new Date(ms), open: open[i], high: high[i], low: low[i], close: close[i], volume: volume[i] } } });
//                 }
                
//                 if (bulkOps.length > 0) {
//                     await HistoricalData.bulkWrite(bulkOps, { ordered: false }).catch(e => console.log("Duplicates ignored"));
//                     cachedData = await HistoricalData.find({ symbol: { $regex: new RegExp(cleanSymbolForMap, "i") }, timeframe, timestamp: { $gte: startDate, $lte: endDate } }).sort({ timestamp: 1 }).lean();
//                 }
//             } else {
//                 return res.status(404).json({ success: false, errorType: "NO_DATA", message: "Spot Data not available for this period." });
//             }
//         }

//         const findConditions = (obj) => {
//             if (!obj || typeof obj !== 'object') return null;
//             if (obj.longRules && Array.isArray(obj.longRules)) return obj;
//             if (Array.isArray(obj)) {
//                 for (let item of obj) {
//                     const found = findConditions(item);
//                     if (found) return found;
//                 }
//             } else {
//                 for (let key in obj) {
//                     const found = findConditions(obj[key]);
//                     if (found) return found;
//                 }
//             }
//             return null;
//         };

//         let entryConds = findConditions(strategy);

//         const calcLongInd1 = []; const calcLongInd2 = [];
//         if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
//             entryConds.longRules.forEach((rule, idx) => {
//                 const params1 = extractParams(rule.ind1, rule.params);
//                 calcLongInd1[idx] = calculateIndicator({...rule.ind1, params: params1}, cachedData);
//                 const params2 = extractParams(rule.ind2, null);
//                 calcLongInd2[idx] = calculateIndicator({...rule.ind2, params: params2}, cachedData);
//             });
//         }

//         const calcShortInd1 = []; const calcShortInd2 = [];
//         if (entryConds && entryConds.shortRules && entryConds.shortRules.length > 0) {
//             entryConds.shortRules.forEach((rule, idx) => {
//                 const params1 = extractParams(rule.ind1, rule.params);
//                 calcShortInd1[idx] = calculateIndicator({...rule.ind1, params: params1}, cachedData);
//                 const params2 = extractParams(rule.ind2, null);
//                 calcShortInd2[idx] = calculateIndicator({...rule.ind2, params: params2}, cachedData);
//             });
//         }

//         let exitConds = {};
//         const possibleExits = strategy.exitConditions 
//                            || strategy.data?.exitConditions 
//                            || strategy.data?.entrySettings?.exitConditions 
//                            || strategy.entrySettings?.exitConditions
//                            || strategy.entryConditions?.[0]?.exitConditions 
//                            || strategy.data?.entryConditions?.[0]?.exitConditions 
//                            || [];

//         if (Array.isArray(possibleExits) && possibleExits.length > 0) {
//             exitConds = possibleExits[0];
//         } else if (possibleExits && typeof possibleExits === 'object' && !Array.isArray(possibleExits)) {
//             exitConds = possibleExits;
//         }

//         const rawExitLongRules = exitConds.longRules || [];
//         const rawExitShortRules = exitConds.shortRules || [];
        
//         const exitLongRules = rawExitLongRules.filter(rule => rule.ind1 && (rule.ind1.id || rule.ind1.display));
//         const exitShortRules = rawExitShortRules.filter(rule => rule.ind1 && (rule.ind1.id || rule.ind1.display));
        
//         const calcExitLongInd1 = []; const calcExitLongInd2 = [];
//         if (exitLongRules.length > 0) {
//             exitLongRules.forEach((rule, idx) => {
//                 const params1 = extractParams(rule.ind1, rule.params);
//                 calcExitLongInd1[idx] = calculateIndicator({...rule.ind1, params: params1}, cachedData);
//                 const params2 = extractParams(rule.ind2, null);
//                 calcExitLongInd2[idx] = calculateIndicator({...rule.ind2, params: params2}, cachedData);
//             });
//         }

//         const calcExitShortInd1 = []; const calcExitShortInd2 = [];
//         if (exitShortRules.length > 0) {
//             exitShortRules.forEach((rule, idx) => {
//                 const params1 = extractParams(rule.ind1, rule.params);
//                 calcExitShortInd1[idx] = calculateIndicator({...rule.ind1, params: params1}, cachedData);
//                 const params2 = extractParams(rule.ind2, null);
//                 calcExitShortInd2[idx] = calculateIndicator({...rule.ind2, params: params2}, cachedData);
//             });
//         }

//         let currentEquity = 0, peakEquity = 0, maxDrawdown = 0;
//         let winDays = 0, lossDays = 0, winTrades = 0, lossTrades = 0;
//         let currentWinStreak = 0, currentLossStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
//         let maxProfitTrade = 0, maxLossTrade = 0;
//         const equityCurve = []; const daywiseBreakdown = []; let dailyBreakdownMap = {}; 

//         let isPositionOpen = false; 
//         let currentTrade = null; 
        
//         let tradeQuantity = strategy.legs?.[0]?.quantity || strategy.data?.legs?.[0]?.quantity; 
//         if (!tradeQuantity || isNaN(tradeQuantity)) tradeQuantity = upperSymbol.includes("BANK") ? 30 : (upperSymbol.includes("NIFTY") ? 50 : 1);

//         const legData = strategy.legs?.[0] || strategy.data?.legs?.[0] || {};
//         const transactionType = legData.action || "BUY";

//         const riskSettings = strategy.data?.riskManagement || strategy.riskManagement || {};
//         const globalMaxProfit = Number(riskSettings.maxProfit) || 0;
//         const globalMaxLoss = Number(riskSettings.maxLoss) || 0;
//         let isTradingHaltedForDay = false; 
//         let currentDayTracker = ""; 

//         const calculateATM = (spotPrice, symbolStr) => {
//             if(symbolStr.includes("BANK")) return Math.round(spotPrice / 100) * 100;
//             return Math.round(spotPrice / 50) * 50;
//         };

//         const calcTradePnL = (entryP, exitP, qty, action) => {
//             if(action === "BUY") return (exitP - entryP) * qty;
//             return (entryP - exitP) * qty; 
//         };

//         const getNearestExpiryString = (tradeDateStr, symbolStr) => {
//             const d = new Date(tradeDateStr);
//             const upSym = symbolStr.toUpperCase();
//             let expiryDate = new Date(d);
            
//             if (upSym.includes("NIFTY") && !upSym.includes("BANK") && !upSym.includes("FIN") && !upSym.includes("MID")) {
//                 let targetDay = 2; 
//                 while (expiryDate.getDay() !== targetDay) {
//                     expiryDate.setDate(expiryDate.getDate() + 1);
//                 }
//             } else {
//                 let targetDay = 2; 
//                 if (upSym.includes("MID")) targetDay = 1; 
                
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

//             const day = String(expiryDate.getDate()).padStart(2, '0');
//             const month = expiryDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
//             const year = String(expiryDate.getFullYear()).slice(-2);
//             const formattedDate = `${day}${month}${year}`;

//             const today = new Date();
//             today.setHours(0, 0, 0, 0); 
            
//             const expDateForCheck = new Date(expiryDate);
//             expDateForCheck.setHours(0, 0, 0, 0);

//             const prefix = (expDateForCheck < today) ? "EXP" : "Upcoming EXP";
//             return `${prefix} ${formattedDate}`; 
//         };

//         for (let i = 0; i < cachedData.length; i++) {
//             if (i % 500 === 0) {
//                 await new Promise(resolve => setImmediate(resolve));
//             }

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
//             }

//             if (!dailyBreakdownMap[dateStr]) dailyBreakdownMap[dateStr] = { pnl: 0, trades: 0, tradesList: [] };

//             let longSignal = false;
//             if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
//                 let overallResult = null;
//                 entryConds.longRules.forEach((rule, idx) => {
//                     const val1 = calcLongInd1[idx] ? calcLongInd1[idx][i] : null;
//                     const val2 = calcLongInd2[idx] ? calcLongInd2[idx][i] : null;
//                     const prevVal1 = (i > 0 && calcLongInd1[idx]) ? calcLongInd1[idx][i-1] : null;
//                     const prevVal2 = (i > 0 && calcLongInd2[idx]) ? calcLongInd2[idx][i-1] : null;

//                     const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
//                     const ruleResult = evaluateCondition(val1, val2, prevVal1, prevVal2, operator);
                    
//                     if (idx === 0) overallResult = ruleResult;
//                     else {
//                         const logicalOp = entryConds.logicalOps[idx - 1]; 
//                         if (logicalOp === 'AND') overallResult = overallResult && ruleResult;
//                         else if (logicalOp === 'OR') overallResult = overallResult || ruleResult;
//                     }
//                 });
//                 longSignal = overallResult;
//             }

//             let shortSignal = false;
//             if (entryConds && entryConds.shortRules && entryConds.shortRules.length > 0) {
//                 let overallResult = null;
//                 entryConds.shortRules.forEach((rule, idx) => {
//                     const val1 = calcShortInd1[idx] ? calcShortInd1[idx][i] : null;
//                     const val2 = calcShortInd2[idx] ? calcShortInd2[idx][i] : null;
//                     const prevVal1 = (i > 0 && calcShortInd1[idx]) ? calcShortInd1[idx][i-1] : null;
//                     const prevVal2 = (i > 0 && calcShortInd2[idx]) ? calcShortInd2[idx][i-1] : null;

//                     const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
//                     const ruleResult = evaluateCondition(val1, val2, prevVal1, prevVal2, operator);
                    
//                     if (idx === 0) overallResult = ruleResult;
//                     else {
//                         const logicalOp = entryConds.logicalOps[idx - 1]; 
//                         if (logicalOp === 'AND') overallResult = overallResult && ruleResult;
//                         else if (logicalOp === 'OR') overallResult = overallResult || ruleResult;
//                     }
//                 });
//                 shortSignal = overallResult;
//             }

//             const txnType = strategy.config?.transactionType || strategy.data?.config?.transactionType || 'Both Side';
//             const finalLongSignal = (txnType === 'Both Side' || txnType === 'Only Long') ? longSignal : false;
//             const finalShortSignal = (txnType === 'Both Side' || txnType === 'Only Short') ? shortSignal : false;

//             let exitLongSignal = false;
//             if (exitLongRules.length > 0) {
//                 let overallResult = null;
//                 exitLongRules.forEach((rule, idx) => {
//                     const val1 = calcExitLongInd1[idx] ? calcExitLongInd1[idx][i] : null;
//                     const val2 = calcExitLongInd2[idx] ? calcExitLongInd2[idx][i] : null;
//                     const prevVal1 = (i > 0 && calcExitLongInd1[idx]) ? calcExitLongInd1[idx][i-1] : null;
//                     const prevVal2 = (i > 0 && calcExitLongInd2[idx]) ? calcExitLongInd2[idx][i-1] : null;

//                     const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
//                     const ruleResult = evaluateCondition(val1, val2, prevVal1, prevVal2, operator);
                    
//                     if (idx === 0) overallResult = ruleResult;
//                     else {
//                         const logicalOp = exitConds.logicalOpsLong ? exitConds.logicalOpsLong[idx - 1] : 'AND'; 
//                         if (logicalOp === 'AND') overallResult = overallResult && ruleResult;
//                         else if (logicalOp === 'OR') overallResult = overallResult || ruleResult;
//                     }
//                 });
//                 exitLongSignal = overallResult;
//             }

//             let exitShortSignal = false;
//             if (exitShortRules.length > 0) {
//                 let overallResult = null;
//                 exitShortRules.forEach((rule, idx) => {
//                     const val1 = calcExitShortInd1[idx] ? calcExitShortInd1[idx][i] : null;
//                     const val2 = calcExitShortInd2[idx] ? calcExitShortInd2[idx][i] : null;
//                     const prevVal1 = (i > 0 && calcExitShortInd1[idx]) ? calcExitShortInd1[idx][i-1] : null;
//                     const prevVal2 = (i > 0 && calcExitShortInd2[idx]) ? calcExitShortInd2[idx][i-1] : null;

//                     const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
//                     const ruleResult = evaluateCondition(val1, val2, prevVal1, prevVal2, operator);
                    
//                     if (idx === 0) overallResult = ruleResult;
//                     else {
//                         const logicalOp = exitConds.logicalOpsShort ? exitConds.logicalOpsShort[idx - 1] : 'AND'; 
//                         if (logicalOp === 'AND') overallResult = overallResult && ruleResult;
//                         else if (logicalOp === 'OR') overallResult = overallResult || ruleResult;
//                     }
//                 });
//                 exitShortSignal = overallResult;
//             }

//             const isMarketOpen = timeInMinutes >= 555 && timeInMinutes < 915; 
//             const isExitTime = timeInMinutes >= 915; 
//             let isLastCandleOfDay = false;
//             if (i === cachedData.length - 1) isLastCandleOfDay = true;
//             else {
//                 const nextCandleIst = new Date(new Date(cachedData[i+1].timestamp).getTime() + (5.5 * 60 * 60 * 1000));
//                 if (nextCandleIst.toISOString().split('T')[0] !== dateStr) isLastCandleOfDay = true;
//             }

//             const spotClosePrice = parseFloat(candle.close);

//             if (!isPositionOpen && isMarketOpen && !isTradingHaltedForDay) {
//                 if (txnType === 'Both Side' || txnType === 'Only Long') {
//                     if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
//                         const v1 = calcLongInd1.length > 0 ? calcLongInd1[0][i] : null;
//                         const v2 = calcLongInd2.length > 0 ? calcLongInd2[0][i] : null;
//                         const n1 = formatIndName(entryConds.longRules[0].ind1);
//                         const n2 = formatIndName(entryConds.longRules[0].ind2);
//                         console.log(`🔍 [ENTRY X-RAY] Time: ${h}:${m} | Check: LONG | ${n1}: ${v1 ? v1.toFixed(2) : 'null'} | ${n2}: ${v2 ? v2.toFixed(2) : 'null'} | Signal: ${finalLongSignal}`);
//                     }
//                 }

//                 if (txnType === 'Both Side' || txnType === 'Only Short') {
//                     if (entryConds && entryConds.shortRules && entryConds.shortRules.length > 0) {
//                         const v1 = calcShortInd1.length > 0 ? calcShortInd1[0][i] : null;
//                         const v2 = calcShortInd2.length > 0 ? calcShortInd2[0][i] : null;
//                         const n1 = formatIndName(entryConds.shortRules[0].ind1);
//                         const n2 = formatIndName(entryConds.shortRules[0].ind2);
//                         console.log(`🔍 [ENTRY X-RAY] Time: ${h}:${m} | Check: SHORT | ${n1}: ${v1 ? v1.toFixed(2) : 'null'} | ${n2}: ${v2 ? v2.toFixed(2) : 'null'} | Signal: ${finalShortSignal}`);
//                     }
//                 }
//             }

//             // =========================================================
//             // 5. 🛑 M2M RISK CHECK (SL/TP & Global Max Profit/Loss Check)
//             // =========================================================
//             if (isPositionOpen && currentTrade) {
//                 if (currentTrade.signalType === "SHORT") {
//                     const v1 = calcExitShortInd1.length > 0 ? calcExitShortInd1[0][i] : null;
//                     const v2 = calcExitShortInd2.length > 0 ? calcExitShortInd2[0][i] : null;
//                     const n1 = exitShortRules.length > 0 ? formatIndName(exitShortRules[0].ind1) : 'Ind1';
//                     const n2 = exitShortRules.length > 0 ? formatIndName(exitShortRules[0].ind2) : 'Ind2';
//                     console.log(`🔍 [X-RAY] Time: ${h}:${m} | Type: SHORT | ${n1}: ${v1 ? v1.toFixed(2) : 'null'} | ${n2}: ${v2 ? v2.toFixed(2) : 'null'} | Signal: ${exitShortSignal}`);
//                 } else if (currentTrade.signalType === "LONG") {
//                     const v1 = calcExitLongInd1.length > 0 ? calcExitLongInd1[0][i] : null;
//                     const v2 = calcExitLongInd2.length > 0 ? calcExitLongInd2[0][i] : null;
//                     const n1 = exitLongRules.length > 0 ? formatIndName(exitLongRules[0].ind1) : 'Ind1';
//                     const n2 = exitLongRules.length > 0 ? formatIndName(exitLongRules[0].ind2) : 'Ind2';
//                     console.log(`🔍 [X-RAY] Time: ${h}:${m} | Type: LONG | ${n1}: ${v1 ? v1.toFixed(2) : 'null'} | ${n2}: ${v2 ? v2.toFixed(2) : 'null'} | Signal: ${exitLongSignal}`);
//                 }

//                 let hitSL = false;
//                 let hitTP = false;
//                 let hitMaxProfit = false;
//                 let hitMaxLoss = false;
//                 let hitIndicatorExit = false;

//                 let exitPrice = 0;
//                 let exitReason = "";

//                 const slValue = legData.slValue || 0;
//                 const tpValue = legData.tpValue || 0;
//                 let slPrice = 0;
//                 let tpPrice = 0;

//                 if (currentTrade.transaction === "BUY") {
//                     slPrice = currentTrade.entryPrice * (1 - slValue / 100);
//                     tpPrice = currentTrade.entryPrice * (1 + tpValue / 100);
//                 } else if (currentTrade.transaction === "SELL") {
//                     slPrice = currentTrade.entryPrice * (1 + slValue / 100);
//                     tpPrice = currentTrade.entryPrice * (1 - tpValue / 100);
//                 }

//                 let currentHigh = spotClosePrice; 
//                 let currentLow = spotClosePrice;  
//                 let currentClose = spotClosePrice; 

//                 if (isOptionsTrade && currentTrade.premiumChart && currentTrade.premiumChart.start_Time) {
//                     const exactMatchIndex = currentTrade.premiumChart.start_Time.findIndex(t => {
//                         const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                         return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                     });
                    
//                     if (exactMatchIndex !== -1) {
//                         let tempClose = currentTrade.premiumChart.close[exactMatchIndex];
//                         if (tempClose > spotClosePrice * 0.5) {
//                             currentClose = currentTrade.lastKnownPremium || currentTrade.entryPrice;
//                             currentHigh = currentClose;
//                             currentLow = currentClose;
//                         } else {
//                             currentClose = tempClose;
//                             currentHigh = currentTrade.premiumChart.high[exactMatchIndex];
//                             currentLow = currentTrade.premiumChart.low[exactMatchIndex];
//                             currentTrade.lastKnownPremium = currentClose; 
//                         }
//                     } else {
//                         currentClose = currentTrade.lastKnownPremium || currentTrade.entryPrice;
//                         currentHigh = currentClose;
//                         currentLow = currentClose;
//                     }
//                 } else if (!isOptionsTrade) {
//                     currentHigh = parseFloat(candle.high);
//                     currentLow = parseFloat(candle.low);
//                     currentClose = parseFloat(candle.close);
//                 }

//                 if (slValue > 0 && currentTrade.entryPrice > 0) {
//                     if (currentTrade.transaction === "BUY" && currentLow <= slPrice) {
//                         hitSL = true; exitPrice = slPrice; exitReason = "STOPLOSS";
//                     } else if (currentTrade.transaction === "SELL" && currentHigh >= slPrice) {
//                         hitSL = true; exitPrice = slPrice; exitReason = "STOPLOSS"; 
//                     }
//                 }
                
//                 if (tpValue > 0 && currentTrade.entryPrice > 0) {
//                     if (currentTrade.transaction === "BUY" && currentHigh >= tpPrice) {
//                         hitTP = true; exitPrice = tpPrice; exitReason = "TARGET";
//                     } else if (currentTrade.transaction === "SELL" && currentLow <= tpPrice) {
//                         hitTP = true; exitPrice = tpPrice; exitReason = "TARGET"; 
//                     }
//                 }

//                 // =========================================================
//                 // 🔥 SHARED TRAILING STOP LOSS (TSL) ENGINE 🚀
//                 // =========================================================
//                 const openTradePnL = calcTradePnL(currentTrade.entryPrice, currentClose, tradeQuantity, currentTrade.transaction);

//                 if (!hitSL && !hitTP) { 
//                     // 1. Math check karo ki kya TSL modify hone ka time aa gaya hai?
//                     const tslResult = evaluateTrailingSL(currentTrade, openTradePnL, riskSettings, tradeQuantity);
                    
//                     // Agar modify hua hai, to array me save karo aur log print karo
//                     if (tslResult.isModified) {
//                         currentTrade.trailingSL = tslResult.newTrailingSL;
//                         console.log(tslResult.logMessage);
//                     }

//                     // 2. Check karo ki kya current price ne Trailing SL ko hit kar diya?
//                     if (currentTrade.trailingSL) {
//                         if (currentTrade.transaction === "BUY" && currentLow <= currentTrade.trailingSL) {
//                             hitSL = true; exitReason = "TRAILING_SL"; exitPrice = currentTrade.trailingSL;
//                         } else if (currentTrade.transaction === "SELL" && currentHigh >= currentTrade.trailingSL) {
//                             hitSL = true; exitReason = "TRAILING_SL"; exitPrice = currentTrade.trailingSL;
//                         }
//                     }
//                 }

//                 // 🔥 2. CHECK GLOBAL MAX PROFIT / MAX LOSS
//                 if (!hitSL && !hitTP) { 
//                     const runningDailyPnL = dailyBreakdownMap[dateStr].pnl + openTradePnL; 

//                     if (globalMaxProfit > 0 && runningDailyPnL >= globalMaxProfit) {
//                         hitMaxProfit = true; exitPrice = currentClose; exitReason = "MAX_PROFIT";
//                         isTradingHaltedForDay = true; 
//                     } 
//                     else if (globalMaxLoss > 0 && runningDailyPnL <= -globalMaxLoss) {
//                         hitMaxLoss = true; exitPrice = currentClose; exitReason = "MAX_LOSS";
//                         isTradingHaltedForDay = true; 
//                     }
//                 }

//                 // 🔥 3. CHECK INDICATOR BASED EXIT
//                 if (!hitSL && !hitTP && !hitMaxProfit && !hitMaxLoss) {
//                     if (currentTrade.signalType === "LONG" && exitLongSignal) {
//                         hitIndicatorExit = true;
//                         exitPrice = currentClose; 
//                         exitReason = "INDICATOR_EXIT";
//                     } 
//                     else if (currentTrade.signalType === "SHORT" && exitShortSignal) {
//                         hitIndicatorExit = true;
//                         exitPrice = currentClose;
//                         exitReason = "INDICATOR_EXIT";
//                     }
//                 }
                
//                 if (hitSL || hitTP || hitMaxProfit || hitMaxLoss || hitIndicatorExit) {
//                     isPositionOpen = false;
//                     const pnl = calcTradePnL(currentTrade.entryPrice, exitPrice, tradeQuantity, currentTrade.transaction);

//                     currentTrade.exitTime = `${h}:${m}:00`;
//                     currentTrade.exitPrice = exitPrice;
//                     currentTrade.pnl = pnl;
//                     currentTrade.exitType = exitReason;
                    
//                     dailyBreakdownMap[dateStr].tradesList.push(currentTrade);
//                     dailyBreakdownMap[dateStr].pnl += pnl;
//                     dailyBreakdownMap[dateStr].trades += 1;
//                     if (pnl > 0) { winTrades++; if(pnl > maxProfitTrade) maxProfitTrade = pnl; } 
//                     else { lossTrades++; if(pnl < maxLossTrade) maxLossTrade = pnl; }
                    
//                     console.log(`🎯 [${currentTrade.exitType}] Date: ${dateStr} | Exit Premium: ${exitPrice.toFixed(2)} | PnL: ${pnl.toFixed(2)}`);
//                     currentTrade = null;
//                     continue; 
//                 }
//             } 
//             else if (!isTradingHaltedForDay) {
//                 const realizedDailyPnL = dailyBreakdownMap[dateStr].pnl;
//                 if (globalMaxProfit > 0 && realizedDailyPnL >= globalMaxProfit) isTradingHaltedForDay = true;
//                 if (globalMaxLoss > 0 && realizedDailyPnL <= -globalMaxLoss) isTradingHaltedForDay = true;
//             }

//             if (!isPositionOpen && isMarketOpen && !isTradingHaltedForDay && (finalLongSignal || finalShortSignal)) {
                
//                 const transActionTypeStr = (legData.action || "BUY").toUpperCase();
                
//                 let activeOptionType = "";
//                 if (transActionTypeStr === "BUY") {
//                     activeOptionType = finalLongSignal ? "CE" : "PE";
//                 } else if (transActionTypeStr === "SELL") {
//                     activeOptionType = finalLongSignal ? "PE" : "CE"; 
//                 }
                
//                 let tradeSymbol = upperSymbol;
//                 let finalEntryPrice = spotClosePrice;
//                 let validTrade = true;
//                 let premiumChartData = null; 
//                 let targetStrike = calculateATM(spotClosePrice, upperSymbol);

//                 if(isOptionsTrade && broker) {
//                     let apiSuccess = false;
                    
//                     const strikeCriteria = legData.strikeCriteria || "ATM pt";
//                     const strikeType = legData.strikeType || "ATM";
//                     const reqExpiry = legData.expiry || "WEEKLY";

//                     console.log(`🔍 [X-RAY] Fetching Option ID -> Base: ${upperSymbol}, OptType: ${activeOptionType}`);

//                     const optionConfig = getOptionSecurityId(upperSymbol, spotClosePrice, strikeCriteria, strikeType, activeOptionType, reqExpiry);
                    
//                     if (optionConfig && optionConfig.strike) {
//                         targetStrike = optionConfig.strike;
//                     }

//                     if(optionConfig) {
//                         try {
//                             await sleep(500);
//                             const optRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, optionConfig.id, "NSE_FNO", "OPTIDX", dateStr, dateStr, "1");
//                             if(optRes.success && optRes.data && optRes.data.close) {
//                                 const exactMatchIndex = optRes.data.start_Time.findIndex(t => {
//                                     const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                                     return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                                 });
//                                 finalEntryPrice = exactMatchIndex !== -1 ? optRes.data.close[exactMatchIndex] : optRes.data.close[0];
//                                 tradeSymbol = optionConfig.tradingSymbol;
//                                 premiumChartData = optRes.data; 
//                                 apiSuccess = true;
//                             } 
//                         } catch(e) { }
//                     } 
                    
//                     if (!apiSuccess) {
//                         try {
//                             await sleep(500);
//                             const expRes = await fetchExpiredOptionData(broker.clientId, broker.apiSecret, spotSecurityId, targetStrike, activeOptionType, dateStr, dateStr);
//                             if(expRes.success && expRes.data && expRes.data.close) {
//                                 const exactMatchIndex = expRes.data.start_Time.findIndex(t => {
//                                     const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                                     return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                                 });
//                                 finalEntryPrice = exactMatchIndex !== -1 ? expRes.data.close[exactMatchIndex] : expRes.data.close[0];
                                
//                                 const expiryLabel = getNearestExpiryString(dateStr, upperSymbol);
//                                 tradeSymbol = `${upperSymbol} ${targetStrike} ${activeOptionType} (${expiryLabel})`;

//                                 premiumChartData = expRes.data; 
//                                 apiSuccess = true;
//                             }
//                         } catch(e) { }
//                     }

//                     if (apiSuccess && finalEntryPrice > spotClosePrice * 0.5) {
//                         apiSuccess = false;
//                         validTrade = false;
//                         console.log(`❌ Trade Canceled: Dhan API sent garbage premium (${finalEntryPrice}) matching the Spot price!`);
//                     }

//                     if (!apiSuccess) {
//                         validTrade = false;
//                         console.log(`❌ Trade Canceled: Premium Data not available for ${upperSymbol} ${targetStrike} ${activeOptionType}`);
//                     }
//                 }

//                 if (validTrade) {
//                     isPositionOpen = true;
//                     currentTrade = {
//                         symbol: tradeSymbol, transaction: transActionTypeStr, quantity: tradeQuantity,
//                         entryTime: `${h}:${m}:00`, entryPrice: finalEntryPrice,
//                         exitTime: null, exitPrice: null, pnl: null, exitType: null,
//                         optionConfig: isOptionsTrade ? { strike: targetStrike, type: activeOptionType } : null,
//                         premiumChart: premiumChartData,
//                         signalType: finalLongSignal ? "LONG" : "SHORT",
//                         lastKnownPremium: finalEntryPrice 
//                     };
//                     console.log(`✅ [TRADE OPEN] Date: ${dateStr} | Time: ${h}:${m} | Spot: ${spotClosePrice} | Premium: ${finalEntryPrice} | Type: ${activeOptionType}`);
//                 }
//             }

//             if (isPositionOpen && (isExitTime || isLastCandleOfDay)) {
//                 isPositionOpen = false;
//                 let finalExitPrice = spotClosePrice;

//                 if(isOptionsTrade && currentTrade.optionConfig && broker) {
//                     let apiSuccess = false;
//                     const targetStrike = currentTrade.optionConfig.strike;
                    
//                     const reqExpiry = legData.expiry || "WEEKLY";
//                     const optionConfig = getOptionSecurityId(upperSymbol, targetStrike, "ATM pt", "ATM", currentTrade.optionConfig.type, reqExpiry);
                    
//                     if(optionConfig) {
//                         try {
//                             await sleep(500);
//                             const optRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, optionConfig.id, "NSE_FNO", "OPTIDX", dateStr, dateStr, "1");
//                             if(optRes.success && optRes.data && optRes.data.close) {
//                                 const exactMatchIndex = optRes.data.start_Time.findIndex(t => {
//                                     const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                                     return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                                 });
//                                 finalExitPrice = exactMatchIndex !== -1 ? optRes.data.close[exactMatchIndex] : optRes.data.close[optRes.data.close.length - 1];
//                                 apiSuccess = true;
//                             }
//                         } catch(e) { }
//                     }

//                     if (!apiSuccess) {
//                         try {
//                             await sleep(500);
//                             const expRes = await fetchExpiredOptionData(broker.clientId, broker.apiSecret, spotSecurityId, targetStrike, currentTrade.optionConfig.type, dateStr, dateStr);
//                             if(expRes.success && expRes.data && expRes.data.close) {
//                                 const exactMatchIndex = expRes.data.start_Time.findIndex(t => {
//                                     const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                                     return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                                 });
//                                 finalExitPrice = exactMatchIndex !== -1 ? expRes.data.close[exactMatchIndex] : expRes.data.close[expRes.data.close.length - 1];
//                                 apiSuccess = true;
//                             }
//                         } catch(e) { }
//                     }

//                     if (!apiSuccess) {
//                         finalExitPrice = currentTrade.entryPrice; 
//                     }
//                 }

//                 const pnl = calcTradePnL(currentTrade.entryPrice, finalExitPrice, tradeQuantity, transactionType);

//                 currentTrade.exitTime = `${h}:${m}:00`;
//                 currentTrade.exitPrice = finalExitPrice;
//                 currentTrade.pnl = pnl;
//                 currentTrade.exitType = isLastCandleOfDay ? "EOD_SQUAREOFF" : "TIME_SQUAREOFF";
//                 dailyBreakdownMap[dateStr].tradesList.push(currentTrade);
                
//                 console.log(`❌ [TRADE CLOSE] Date: ${dateStr} | Premium: ${finalExitPrice.toFixed(2)} | PnL: ${pnl.toFixed(2)}`);
//                 currentTrade = null; 

//                 dailyBreakdownMap[dateStr].pnl += pnl;
//                 dailyBreakdownMap[dateStr].trades += 1;

//                 if (pnl > 0) { winTrades++; if (pnl > maxProfitTrade) maxProfitTrade = pnl; } 
//                 else { lossTrades++; if (pnl < maxLossTrade) maxLossTrade = pnl; }
//             }
//         }

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
//             equityCurve, 
//             daywiseBreakdown: daywiseBreakdown.reverse()
//         };

//         return res.status(200).json({ success: true, data: backtestResult });

//     } catch (error) {
//         console.error("Backtest Error:", error);
//         res.status(500).json({ success: false, error: "Internal Server Error" });
//     }
// };

// module.exports = { runBacktestSimulator };



// const mongoose = require('mongoose'); 
// const Strategy = require('../models/Strategy');
// const HistoricalData = require('../models/HistoricalData');
// const Broker = require('../models/Broker');
// const { calculateIndicator, extractParams, evaluateCondition } = require('../services/indicatorService');
// const { getOptionSecurityId, sleep } = require('../services/instrumentService');
// const { fetchDhanHistoricalData, fetchExpiredOptionData } = require('../services/dhanService');

// // 🔥 IMPORTING SHARED LOGIC
// const { evaluateTrailingSL } = require('../engine/features/riskManagement/trailingLogic');
// const { evaluateMtmLogic } = require('../engine/features/riskManagement/mtmSquareOff'); // Naya Import

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
//     try {
//         const { strategyId } = req.params;
//         const { period, start, end } = req.query;
        
//         const strategy = await Strategy.collection.findOne({ _id: new mongoose.Types.ObjectId(strategyId) });
//         if (!strategy) return res.status(404).json({ error: "Strategy not found" });

//         console.log(`\n🚀 Running Real Backtest for: ${strategy.name} | Period: ${period || '1M'}`);

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
//             if (!broker) return res.status(400).json({ success: false, message: 'No active broker found for API keys' });
//         }

//         if (shouldFetchFromDhan) {
//             const dhanRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, spotSecurityId, exchangeSegment, "INDEX", startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0], timeframe);
//             const timeArray = dhanRes.data ? (dhanRes.data.start_Time || dhanRes.data.timestamp) : null;

//             if (dhanRes.success && timeArray) {
//                 const { open, high, low, close, volume } = dhanRes.data;
//                 const bulkOps = [];
//                 for (let i = 0; i < timeArray.length; i++) {
//                     let ms = timeArray[i];
//                     if (ms < 10000000000) ms = ms * 1000; 
//                     bulkOps.push({ insertOne: { document: { symbol: upperSymbol, timeframe, timestamp: new Date(ms), open: open[i], high: high[i], low: low[i], close: close[i], volume: volume[i] } } });
//                 }
                
//                 if (bulkOps.length > 0) {
//                     await HistoricalData.bulkWrite(bulkOps, { ordered: false }).catch(e => console.log("Duplicates ignored"));
//                     cachedData = await HistoricalData.find({ symbol: { $regex: new RegExp(cleanSymbolForMap, "i") }, timeframe, timestamp: { $gte: startDate, $lte: endDate } }).sort({ timestamp: 1 }).lean();
//                 }
//             } else {
//                 return res.status(404).json({ success: false, errorType: "NO_DATA", message: "Spot Data not available for this period." });
//             }
//         }

//         const findConditions = (obj) => {
//             if (!obj || typeof obj !== 'object') return null;
//             if (obj.longRules && Array.isArray(obj.longRules)) return obj;
//             if (Array.isArray(obj)) {
//                 for (let item of obj) {
//                     const found = findConditions(item);
//                     if (found) return found;
//                 }
//             } else {
//                 for (let key in obj) {
//                     const found = findConditions(obj[key]);
//                     if (found) return found;
//                 }
//             }
//             return null;
//         };

//         let entryConds = findConditions(strategy);

//         const calcLongInd1 = []; const calcLongInd2 = [];
//         if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
//             entryConds.longRules.forEach((rule, idx) => {
//                 const params1 = extractParams(rule.ind1, rule.params);
//                 calcLongInd1[idx] = calculateIndicator({...rule.ind1, params: params1}, cachedData);
//                 const params2 = extractParams(rule.ind2, null);
//                 calcLongInd2[idx] = calculateIndicator({...rule.ind2, params: params2}, cachedData);
//             });
//         }

//         const calcShortInd1 = []; const calcShortInd2 = [];
//         if (entryConds && entryConds.shortRules && entryConds.shortRules.length > 0) {
//             entryConds.shortRules.forEach((rule, idx) => {
//                 const params1 = extractParams(rule.ind1, rule.params);
//                 calcShortInd1[idx] = calculateIndicator({...rule.ind1, params: params1}, cachedData);
//                 const params2 = extractParams(rule.ind2, null);
//                 calcShortInd2[idx] = calculateIndicator({...rule.ind2, params: params2}, cachedData);
//             });
//         }

//         let exitConds = {};
//         const possibleExits = strategy.exitConditions 
//                            || strategy.data?.exitConditions 
//                            || strategy.data?.entrySettings?.exitConditions 
//                            || strategy.entrySettings?.exitConditions
//                            || strategy.entryConditions?.[0]?.exitConditions 
//                            || strategy.data?.entryConditions?.[0]?.exitConditions 
//                            || [];

//         if (Array.isArray(possibleExits) && possibleExits.length > 0) {
//             exitConds = possibleExits[0];
//         } else if (possibleExits && typeof possibleExits === 'object' && !Array.isArray(possibleExits)) {
//             exitConds = possibleExits;
//         }

//         const rawExitLongRules = exitConds.longRules || [];
//         const rawExitShortRules = exitConds.shortRules || [];
        
//         const exitLongRules = rawExitLongRules.filter(rule => rule.ind1 && (rule.ind1.id || rule.ind1.display));
//         const exitShortRules = rawExitShortRules.filter(rule => rule.ind1 && (rule.ind1.id || rule.ind1.display));
        
//         const calcExitLongInd1 = []; const calcExitLongInd2 = [];
//         if (exitLongRules.length > 0) {
//             exitLongRules.forEach((rule, idx) => {
//                 const params1 = extractParams(rule.ind1, rule.params);
//                 calcExitLongInd1[idx] = calculateIndicator({...rule.ind1, params: params1}, cachedData);
//                 const params2 = extractParams(rule.ind2, null);
//                 calcExitLongInd2[idx] = calculateIndicator({...rule.ind2, params: params2}, cachedData);
//             });
//         }

//         const calcExitShortInd1 = []; const calcExitShortInd2 = [];
//         if (exitShortRules.length > 0) {
//             exitShortRules.forEach((rule, idx) => {
//                 const params1 = extractParams(rule.ind1, rule.params);
//                 calcExitShortInd1[idx] = calculateIndicator({...rule.ind1, params: params1}, cachedData);
//                 const params2 = extractParams(rule.ind2, null);
//                 calcExitShortInd2[idx] = calculateIndicator({...rule.ind2, params: params2}, cachedData);
//             });
//         }

//         let currentEquity = 0, peakEquity = 0, maxDrawdown = 0;
//         let winDays = 0, lossDays = 0, winTrades = 0, lossTrades = 0;
//         let currentWinStreak = 0, currentLossStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
//         let maxProfitTrade = 0, maxLossTrade = 0;
//         const equityCurve = []; const daywiseBreakdown = []; let dailyBreakdownMap = {}; 

//         let isPositionOpen = false; 
//         let currentTrade = null; 
        
//         let tradeQuantity = strategy.legs?.[0]?.quantity || strategy.data?.legs?.[0]?.quantity; 
//         if (!tradeQuantity || isNaN(tradeQuantity)) tradeQuantity = upperSymbol.includes("BANK") ? 30 : (upperSymbol.includes("NIFTY") ? 50 : 1);

//         const legData = strategy.legs?.[0] || strategy.data?.legs?.[0] || {};
//         const transactionType = legData.action || "BUY";

//         const riskSettings = strategy.data?.riskManagement || strategy.riskManagement || {};
        
//         // 🔥 FIX: Re-declared global limits for Exact Price Math
//         const globalMaxProfit = Number(riskSettings.maxProfit) || 0;
//         const globalMaxLoss = Number(riskSettings.maxLoss) || 0;
        
//         let isTradingHaltedForDay = false; 
//         let currentDayTracker = "";

//         const calculateATM = (spotPrice, symbolStr) => {
//             if(symbolStr.includes("BANK")) return Math.round(spotPrice / 100) * 100;
//             return Math.round(spotPrice / 50) * 50;
//         };

//         const calcTradePnL = (entryP, exitP, qty, action) => {
//             if(action === "BUY") return (exitP - entryP) * qty;
//             return (entryP - exitP) * qty; 
//         };

//         const getNearestExpiryString = (tradeDateStr, symbolStr) => {
//             const d = new Date(tradeDateStr);
//             const upSym = symbolStr.toUpperCase();
//             let expiryDate = new Date(d);
            
//             if (upSym.includes("NIFTY") && !upSym.includes("BANK") && !upSym.includes("FIN") && !upSym.includes("MID")) {
//                 let targetDay = 2; 
//                 while (expiryDate.getDay() !== targetDay) {
//                     expiryDate.setDate(expiryDate.getDate() + 1);
//                 }
//             } else {
//                 let targetDay = 2; 
//                 if (upSym.includes("MID")) targetDay = 1; 
                
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

//             const day = String(expiryDate.getDate()).padStart(2, '0');
//             const month = expiryDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
//             const year = String(expiryDate.getFullYear()).slice(-2);
//             const formattedDate = `${day}${month}${year}`;

//             const today = new Date();
//             today.setHours(0, 0, 0, 0); 
            
//             const expDateForCheck = new Date(expiryDate);
//             expDateForCheck.setHours(0, 0, 0, 0);

//             const prefix = (expDateForCheck < today) ? "EXP" : "Upcoming EXP";
//             return `${prefix} ${formattedDate}`; 
//         };

//         for (let i = 0; i < cachedData.length; i++) {
//             if (i % 500 === 0) {
//                 await new Promise(resolve => setImmediate(resolve));
//             }

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
//             }

//             if (!dailyBreakdownMap[dateStr]) dailyBreakdownMap[dateStr] = { pnl: 0, trades: 0, tradesList: [] };

//             let longSignal = false;
//             if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
//                 let overallResult = null;
//                 entryConds.longRules.forEach((rule, idx) => {
//                     const val1 = calcLongInd1[idx] ? calcLongInd1[idx][i] : null;
//                     const val2 = calcLongInd2[idx] ? calcLongInd2[idx][i] : null;
//                     const prevVal1 = (i > 0 && calcLongInd1[idx]) ? calcLongInd1[idx][i-1] : null;
//                     const prevVal2 = (i > 0 && calcLongInd2[idx]) ? calcLongInd2[idx][i-1] : null;

//                     const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
//                     const ruleResult = evaluateCondition(val1, val2, prevVal1, prevVal2, operator);
                    
//                     if (idx === 0) overallResult = ruleResult;
//                     else {
//                         const logicalOp = entryConds.logicalOps[idx - 1]; 
//                         if (logicalOp === 'AND') overallResult = overallResult && ruleResult;
//                         else if (logicalOp === 'OR') overallResult = overallResult || ruleResult;
//                     }
//                 });
//                 longSignal = overallResult;
//             }

//             let shortSignal = false;
//             if (entryConds && entryConds.shortRules && entryConds.shortRules.length > 0) {
//                 let overallResult = null;
//                 entryConds.shortRules.forEach((rule, idx) => {
//                     const val1 = calcShortInd1[idx] ? calcShortInd1[idx][i] : null;
//                     const val2 = calcShortInd2[idx] ? calcShortInd2[idx][i] : null;
//                     const prevVal1 = (i > 0 && calcShortInd1[idx]) ? calcShortInd1[idx][i-1] : null;
//                     const prevVal2 = (i > 0 && calcShortInd2[idx]) ? calcShortInd2[idx][i-1] : null;

//                     const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
//                     const ruleResult = evaluateCondition(val1, val2, prevVal1, prevVal2, operator);
                    
//                     if (idx === 0) overallResult = ruleResult;
//                     else {
//                         const logicalOp = entryConds.logicalOps[idx - 1]; 
//                         if (logicalOp === 'AND') overallResult = overallResult && ruleResult;
//                         else if (logicalOp === 'OR') overallResult = overallResult || ruleResult;
//                     }
//                 });
//                 shortSignal = overallResult;
//             }

//             const txnType = strategy.config?.transactionType || strategy.data?.config?.transactionType || 'Both Side';
//             const finalLongSignal = (txnType === 'Both Side' || txnType === 'Only Long') ? longSignal : false;
//             const finalShortSignal = (txnType === 'Both Side' || txnType === 'Only Short') ? shortSignal : false;

//             let exitLongSignal = false;
//             if (exitLongRules.length > 0) {
//                 let overallResult = null;
//                 exitLongRules.forEach((rule, idx) => {
//                     const val1 = calcExitLongInd1[idx] ? calcExitLongInd1[idx][i] : null;
//                     const val2 = calcExitLongInd2[idx] ? calcExitLongInd2[idx][i] : null;
//                     const prevVal1 = (i > 0 && calcExitLongInd1[idx]) ? calcExitLongInd1[idx][i-1] : null;
//                     const prevVal2 = (i > 0 && calcExitLongInd2[idx]) ? calcExitLongInd2[idx][i-1] : null;

//                     const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
//                     const ruleResult = evaluateCondition(val1, val2, prevVal1, prevVal2, operator);
                    
//                     if (idx === 0) overallResult = ruleResult;
//                     else {
//                         const logicalOp = exitConds.logicalOpsLong ? exitConds.logicalOpsLong[idx - 1] : 'AND'; 
//                         if (logicalOp === 'AND') overallResult = overallResult && ruleResult;
//                         else if (logicalOp === 'OR') overallResult = overallResult || ruleResult;
//                     }
//                 });
//                 exitLongSignal = overallResult;
//             }

//             let exitShortSignal = false;
//             if (exitShortRules.length > 0) {
//                 let overallResult = null;
//                 exitShortRules.forEach((rule, idx) => {
//                     const val1 = calcExitShortInd1[idx] ? calcExitShortInd1[idx][i] : null;
//                     const val2 = calcExitShortInd2[idx] ? calcExitShortInd2[idx][i] : null;
//                     const prevVal1 = (i > 0 && calcExitShortInd1[idx]) ? calcExitShortInd1[idx][i-1] : null;
//                     const prevVal2 = (i > 0 && calcExitShortInd2[idx]) ? calcExitShortInd2[idx][i-1] : null;

//                     const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
//                     const ruleResult = evaluateCondition(val1, val2, prevVal1, prevVal2, operator);
                    
//                     if (idx === 0) overallResult = ruleResult;
//                     else {
//                         const logicalOp = exitConds.logicalOpsShort ? exitConds.logicalOpsShort[idx - 1] : 'AND'; 
//                         if (logicalOp === 'AND') overallResult = overallResult && ruleResult;
//                         else if (logicalOp === 'OR') overallResult = overallResult || ruleResult;
//                     }
//                 });
//                 exitShortSignal = overallResult;
//             }

//             const isMarketOpen = timeInMinutes >= 555 && timeInMinutes < 915; 
//             const isExitTime = timeInMinutes >= 915; 
//             let isLastCandleOfDay = false;
//             if (i === cachedData.length - 1) isLastCandleOfDay = true;
//             else {
//                 const nextCandleIst = new Date(new Date(cachedData[i+1].timestamp).getTime() + (5.5 * 60 * 60 * 1000));
//                 if (nextCandleIst.toISOString().split('T')[0] !== dateStr) isLastCandleOfDay = true;
//             }

//             const spotClosePrice = parseFloat(candle.close);

//             if (!isPositionOpen && isMarketOpen && !isTradingHaltedForDay) {
//                 if (txnType === 'Both Side' || txnType === 'Only Long') {
//                     if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
//                         const v1 = calcLongInd1.length > 0 ? calcLongInd1[0][i] : null;
//                         const v2 = calcLongInd2.length > 0 ? calcLongInd2[0][i] : null;
//                         const n1 = formatIndName(entryConds.longRules[0].ind1);
//                         const n2 = formatIndName(entryConds.longRules[0].ind2);
//                         console.log(`🔍 [ENTRY X-RAY] Time: ${h}:${m} | Check: LONG | ${n1}: ${v1 ? v1.toFixed(2) : 'null'} | ${n2}: ${v2 ? v2.toFixed(2) : 'null'} | Signal: ${finalLongSignal}`);
//                     }
//                 }

//                 if (txnType === 'Both Side' || txnType === 'Only Short') {
//                     if (entryConds && entryConds.shortRules && entryConds.shortRules.length > 0) {
//                         const v1 = calcShortInd1.length > 0 ? calcShortInd1[0][i] : null;
//                         const v2 = calcShortInd2.length > 0 ? calcShortInd2[0][i] : null;
//                         const n1 = formatIndName(entryConds.shortRules[0].ind1);
//                         const n2 = formatIndName(entryConds.shortRules[0].ind2);
//                         console.log(`🔍 [ENTRY X-RAY] Time: ${h}:${m} | Check: SHORT | ${n1}: ${v1 ? v1.toFixed(2) : 'null'} | ${n2}: ${v2 ? v2.toFixed(2) : 'null'} | Signal: ${finalShortSignal}`);
//                     }
//                 }
//             }

//             // =========================================================
//             // 5. 🛑 M2M RISK CHECK (SL/TP & Global Max Profit/Loss Check)
//             // =========================================================
//             if (isPositionOpen && currentTrade) {
//                 if (currentTrade.signalType === "SHORT") {
//                     const v1 = calcExitShortInd1.length > 0 ? calcExitShortInd1[0][i] : null;
//                     const v2 = calcExitShortInd2.length > 0 ? calcExitShortInd2[0][i] : null;
//                     const n1 = exitShortRules.length > 0 ? formatIndName(exitShortRules[0].ind1) : 'Ind1';
//                     const n2 = exitShortRules.length > 0 ? formatIndName(exitShortRules[0].ind2) : 'Ind2';
//                     console.log(`🔍 [X-RAY] Time: ${h}:${m} | Type: SHORT | ${n1}: ${v1 ? v1.toFixed(2) : 'null'} | ${n2}: ${v2 ? v2.toFixed(2) : 'null'} | Signal: ${exitShortSignal}`);
//                 } else if (currentTrade.signalType === "LONG") {
//                     const v1 = calcExitLongInd1.length > 0 ? calcExitLongInd1[0][i] : null;
//                     const v2 = calcExitLongInd2.length > 0 ? calcExitLongInd2[0][i] : null;
//                     const n1 = exitLongRules.length > 0 ? formatIndName(exitLongRules[0].ind1) : 'Ind1';
//                     const n2 = exitLongRules.length > 0 ? formatIndName(exitLongRules[0].ind2) : 'Ind2';
//                     console.log(`🔍 [X-RAY] Time: ${h}:${m} | Type: LONG | ${n1}: ${v1 ? v1.toFixed(2) : 'null'} | ${n2}: ${v2 ? v2.toFixed(2) : 'null'} | Signal: ${exitLongSignal}`);
//                 }

//                 let hitSL = false;
//                 let hitTP = false;
//                 let hitMaxProfit = false;
//                 let hitMaxLoss = false;
//                 let hitIndicatorExit = false;

//                 let exitPrice = 0;
//                 let exitReason = "";

//                 const slValue = legData.slValue || 0;
//                 const tpValue = legData.tpValue || 0;
//                 let slPrice = 0;
//                 let tpPrice = 0;

//                 if (currentTrade.transaction === "BUY") {
//                     slPrice = currentTrade.entryPrice * (1 - slValue / 100);
//                     tpPrice = currentTrade.entryPrice * (1 + tpValue / 100);
//                 } else if (currentTrade.transaction === "SELL") {
//                     slPrice = currentTrade.entryPrice * (1 + slValue / 100);
//                     tpPrice = currentTrade.entryPrice * (1 - tpValue / 100);
//                 }

//                 let currentHigh = spotClosePrice; 
//                 let currentLow = spotClosePrice;  
//                 let currentClose = spotClosePrice; 

//                 if (isOptionsTrade && currentTrade.premiumChart && currentTrade.premiumChart.start_Time) {
//                     const exactMatchIndex = currentTrade.premiumChart.start_Time.findIndex(t => {
//                         const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                         return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                     });
                    
//                     if (exactMatchIndex !== -1) {
//                         let tempClose = currentTrade.premiumChart.close[exactMatchIndex];
//                         if (tempClose > spotClosePrice * 0.5) {
//                             currentClose = currentTrade.lastKnownPremium || currentTrade.entryPrice;
//                             currentHigh = currentClose;
//                             currentLow = currentClose;
//                         } else {
//                             currentClose = tempClose;
//                             currentHigh = currentTrade.premiumChart.high[exactMatchIndex];
//                             currentLow = currentTrade.premiumChart.low[exactMatchIndex];
//                             currentTrade.lastKnownPremium = currentClose; 
//                         }
//                     } else {
//                         currentClose = currentTrade.lastKnownPremium || currentTrade.entryPrice;
//                         currentHigh = currentClose;
//                         currentLow = currentClose;
//                     }
//                 } else if (!isOptionsTrade) {
//                     currentHigh = parseFloat(candle.high);
//                     currentLow = parseFloat(candle.low);
//                     currentClose = parseFloat(candle.close);
//                 }

//                 if (slValue > 0 && currentTrade.entryPrice > 0) {
//                     if (currentTrade.transaction === "BUY" && currentLow <= slPrice) {
//                         hitSL = true; exitPrice = slPrice; exitReason = "STOPLOSS";
//                     } else if (currentTrade.transaction === "SELL" && currentHigh >= slPrice) {
//                         hitSL = true; exitPrice = slPrice; exitReason = "STOPLOSS"; 
//                     }
//                 }
                
//                 if (tpValue > 0 && currentTrade.entryPrice > 0) {
//                     if (currentTrade.transaction === "BUY" && currentHigh >= tpPrice) {
//                         hitTP = true; exitPrice = tpPrice; exitReason = "TARGET";
//                     } else if (currentTrade.transaction === "SELL" && currentLow <= tpPrice) {
//                         hitTP = true; exitPrice = tpPrice; exitReason = "TARGET"; 
//                     }
//                 }

//                 const openTradePnL = calcTradePnL(currentTrade.entryPrice, currentClose, tradeQuantity, currentTrade.transaction);

//                 // 🔥 SHARED TRAILING STOP LOSS (TSL) ENGINE
//                 if (!hitSL && !hitTP) { 
//                     const tslResult = evaluateTrailingSL(currentTrade, openTradePnL, riskSettings, tradeQuantity);
                    
//                     if (tslResult.isModified) {
//                         currentTrade.trailingSL = tslResult.newTrailingSL;
//                         // console.log(tslResult.logMessage);
//                     }

//                     if (currentTrade.trailingSL) {
//                         if (currentTrade.transaction === "BUY" && currentLow <= currentTrade.trailingSL) {
//                             hitSL = true; exitReason = "TRAILING_SL"; exitPrice = currentTrade.trailingSL;
//                         } else if (currentTrade.transaction === "SELL" && currentHigh >= currentTrade.trailingSL) {
//                             hitSL = true; exitReason = "TRAILING_SL"; exitPrice = currentTrade.trailingSL;
//                         }
//                     }
//                 }

//                 // // 🔥 2. CHECK GLOBAL MAX PROFIT / MAX LOSS (SHARED LOGIC)
//                 // if (!hitSL && !hitTP) { 
//                 //     const mtmResult = evaluateMtmLogic(dailyBreakdownMap[dateStr].pnl, openTradePnL, riskSettings);
                    
//                 //     if (mtmResult.isHalted) {
//                 //         hitMaxProfit = mtmResult.exitReason === "MAX_PROFIT";
//                 //         hitMaxLoss = mtmResult.exitReason === "MAX_LOSS";
//                 //         exitPrice = currentClose; 
//                 //         exitReason = mtmResult.exitReason;
//                 //         isTradingHaltedForDay = true; 
//                 //         console.log(mtmResult.logMessage);
//                 //     }
//                 // }

//                 // =========================================================
//                 // 🔥 2. CHECK GLOBAL MAX PROFIT / MAX LOSS (EXACT PRICE LOGIC)
//                 // =========================================================
//                 if (!hitSL && !hitTP) { 
//                     const realizedDailyPnL = dailyBreakdownMap[dateStr].pnl;
                    
//                     // Target PnL needed from current trade to hit global limits
//                     const pnlNeededForMaxProfit = globalMaxProfit > 0 ? (globalMaxProfit - realizedDailyPnL) : Infinity;
//                     const pnlNeededForMaxLoss = globalMaxLoss > 0 ? (-globalMaxLoss - realizedDailyPnL) : -Infinity;

//                     // Calculate the EXACT Premium Price to hit these targets
//                     let exactMtmProfitPrice = 0;
//                     let exactMtmLossPrice = 0;

//                     if (currentTrade.transaction === "BUY") {
//                         exactMtmProfitPrice = currentTrade.entryPrice + (pnlNeededForMaxProfit / tradeQuantity);
//                         exactMtmLossPrice = currentTrade.entryPrice + (pnlNeededForMaxLoss / tradeQuantity); // This will drop price
//                     } else { // SELL
//                         exactMtmProfitPrice = currentTrade.entryPrice - (pnlNeededForMaxProfit / tradeQuantity);
//                         exactMtmLossPrice = currentTrade.entryPrice - (pnlNeededForMaxLoss / tradeQuantity);
//                     }

//                     // 🛑 CHECK EXACT MAX LOSS HIT (Mid-Candle)
//                     if (globalMaxLoss > 0 && (
//                         (currentTrade.transaction === "BUY" && currentLow <= exactMtmLossPrice) || 
//                         (currentTrade.transaction === "SELL" && currentHigh >= exactMtmLossPrice)
//                     )) {
//                         hitMaxLoss = true;
//                         exitPrice = exactMtmLossPrice; 
//                         exitReason = "MAX_LOSS";
//                         isTradingHaltedForDay = true; 
//                         console.log(`🛑 [MTM EXACT HIT] Max Loss reached mid-candle. Exiting exactly at ₹${exactMtmLossPrice.toFixed(2)}`);
//                     }
//                     // 🎯 CHECK EXACT MAX PROFIT HIT (Mid-Candle)
//                     else if (globalMaxProfit > 0 && (
//                         (currentTrade.transaction === "BUY" && currentHigh >= exactMtmProfitPrice) || 
//                         (currentTrade.transaction === "SELL" && currentLow <= exactMtmProfitPrice)
//                     )) {
//                         hitMaxProfit = true;
//                         exitPrice = exactMtmProfitPrice; 
//                         exitReason = "MAX_PROFIT";
//                         isTradingHaltedForDay = true; 
//                         console.log(`🎯 [MTM EXACT HIT] Max Profit reached mid-candle. Exiting exactly at ₹${exactMtmProfitPrice.toFixed(2)}`);
//                     }
//                 }

//                 // 🔥 3. CHECK INDICATOR BASED EXIT
//                 if (!hitSL && !hitTP && !hitMaxProfit && !hitMaxLoss) {
//                     if (currentTrade.signalType === "LONG" && exitLongSignal) {
//                         hitIndicatorExit = true;
//                         exitPrice = currentClose; 
//                         exitReason = "INDICATOR_EXIT";
//                     } 
//                     else if (currentTrade.signalType === "SHORT" && exitShortSignal) {
//                         hitIndicatorExit = true;
//                         exitPrice = currentClose;
//                         exitReason = "INDICATOR_EXIT";
//                     }
//                 }
                
//                 if (hitSL || hitTP || hitMaxProfit || hitMaxLoss || hitIndicatorExit) {
//                     isPositionOpen = false;
//                     const pnl = calcTradePnL(currentTrade.entryPrice, exitPrice, tradeQuantity, currentTrade.transaction);

//                     currentTrade.exitTime = `${h}:${m}:00`;
//                     currentTrade.exitPrice = exitPrice;
//                     currentTrade.pnl = pnl;
//                     currentTrade.exitType = exitReason;
                    
//                     dailyBreakdownMap[dateStr].tradesList.push(currentTrade);
//                     dailyBreakdownMap[dateStr].pnl += pnl;
//                     dailyBreakdownMap[dateStr].trades += 1;
//                     if (pnl > 0) { winTrades++; if(pnl > maxProfitTrade) maxProfitTrade = pnl; } 
//                     else { lossTrades++; if(pnl < maxLossTrade) maxLossTrade = pnl; }
                    
//                     console.log(`🎯 [${currentTrade.exitType}] Date: ${dateStr} | Exit Premium: ${exitPrice.toFixed(2)} | PnL: ${pnl.toFixed(2)}`);
//                     currentTrade = null;
//                     continue; 
//                 }
//             } 
//             else if (!isTradingHaltedForDay) {
//                 // 🔥 SHARED MTM LOGIC JAB KOI TRADE OPEN NAHI HAI
//                 const mtmResult = evaluateMtmLogic(dailyBreakdownMap[dateStr].pnl, 0, riskSettings);
//                 if (mtmResult.isHalted) {
//                     isTradingHaltedForDay = true;
//                     console.log(mtmResult.logMessage);
//                 }
//             }

//             if (!isPositionOpen && isMarketOpen && !isTradingHaltedForDay && (finalLongSignal || finalShortSignal)) {
                
//                 const transActionTypeStr = (legData.action || "BUY").toUpperCase();
                
//                 let activeOptionType = "";
//                 if (transActionTypeStr === "BUY") {
//                     activeOptionType = finalLongSignal ? "CE" : "PE";
//                 } else if (transActionTypeStr === "SELL") {
//                     activeOptionType = finalLongSignal ? "PE" : "CE"; 
//                 }
                
//                 let tradeSymbol = upperSymbol;
//                 let finalEntryPrice = spotClosePrice;
//                 let validTrade = true;
//                 let premiumChartData = null; 
//                 let targetStrike = calculateATM(spotClosePrice, upperSymbol);

//                 if(isOptionsTrade && broker) {
//                     let apiSuccess = false;
                    
//                     const strikeCriteria = legData.strikeCriteria || "ATM pt";
//                     const strikeType = legData.strikeType || "ATM";
//                     const reqExpiry = legData.expiry || "WEEKLY";

//                     console.log(`🔍 [X-RAY] Fetching Option ID -> Base: ${upperSymbol}, OptType: ${activeOptionType}`);

//                     const optionConfig = getOptionSecurityId(upperSymbol, spotClosePrice, strikeCriteria, strikeType, activeOptionType, reqExpiry);
                    
//                     if (optionConfig && optionConfig.strike) {
//                         targetStrike = optionConfig.strike;
//                     }

//                     if(optionConfig) {
//                         try {
//                             await sleep(500);
//                             const optRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, optionConfig.id, "NSE_FNO", "OPTIDX", dateStr, dateStr, "1");
//                             if(optRes.success && optRes.data && optRes.data.close) {
//                                 const exactMatchIndex = optRes.data.start_Time.findIndex(t => {
//                                     const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                                     return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                                 });
//                                 finalEntryPrice = exactMatchIndex !== -1 ? optRes.data.close[exactMatchIndex] : optRes.data.close[0];
//                                 tradeSymbol = optionConfig.tradingSymbol;
//                                 premiumChartData = optRes.data; 
//                                 apiSuccess = true;
//                             } 
//                         } catch(e) { }
//                     } 
                    
//                     if (!apiSuccess) {
//                         try {
//                             await sleep(500);
//                             const expRes = await fetchExpiredOptionData(broker.clientId, broker.apiSecret, spotSecurityId, targetStrike, activeOptionType, dateStr, dateStr);
//                             if(expRes.success && expRes.data && expRes.data.close) {
//                                 const exactMatchIndex = expRes.data.start_Time.findIndex(t => {
//                                     const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                                     return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                                 });
//                                 finalEntryPrice = exactMatchIndex !== -1 ? expRes.data.close[exactMatchIndex] : expRes.data.close[0];
                                
//                                 const expiryLabel = getNearestExpiryString(dateStr, upperSymbol);
//                                 tradeSymbol = `${upperSymbol} ${targetStrike} ${activeOptionType} (${expiryLabel})`;

//                                 premiumChartData = expRes.data; 
//                                 apiSuccess = true;
//                             }
//                         } catch(e) { }
//                     }

//                     if (apiSuccess && finalEntryPrice > spotClosePrice * 0.5) {
//                         apiSuccess = false;
//                         validTrade = false;
//                         console.log(`❌ Trade Canceled: Dhan API sent garbage premium (${finalEntryPrice}) matching the Spot price!`);
//                     }

//                     if (!apiSuccess) {
//                         validTrade = false;
//                         console.log(`❌ Trade Canceled: Premium Data not available for ${upperSymbol} ${targetStrike} ${activeOptionType}`);
//                     }
//                 }

//                 if (validTrade) {
//                     isPositionOpen = true;
//                     currentTrade = {
//                         symbol: tradeSymbol, transaction: transActionTypeStr, quantity: tradeQuantity,
//                         entryTime: `${h}:${m}:00`, entryPrice: finalEntryPrice,
//                         exitTime: null, exitPrice: null, pnl: null, exitType: null,
//                         optionConfig: isOptionsTrade ? { strike: targetStrike, type: activeOptionType } : null,
//                         premiumChart: premiumChartData,
//                         signalType: finalLongSignal ? "LONG" : "SHORT",
//                         lastKnownPremium: finalEntryPrice 
//                     };
//                     console.log(`✅ [TRADE OPEN] Date: ${dateStr} | Time: ${h}:${m} | Spot: ${spotClosePrice} | Premium: ${finalEntryPrice} | Type: ${activeOptionType}`);
//                 }
//             }

//             if (isPositionOpen && (isExitTime || isLastCandleOfDay)) {
//                 isPositionOpen = false;
//                 let finalExitPrice = spotClosePrice;

//                 if(isOptionsTrade && currentTrade.optionConfig && broker) {
//                     let apiSuccess = false;
//                     const targetStrike = currentTrade.optionConfig.strike;
                    
//                     const reqExpiry = legData.expiry || "WEEKLY";
//                     const optionConfig = getOptionSecurityId(upperSymbol, targetStrike, "ATM pt", "ATM", currentTrade.optionConfig.type, reqExpiry);
                    
//                     if(optionConfig) {
//                         try {
//                             await sleep(500);
//                             const optRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, optionConfig.id, "NSE_FNO", "OPTIDX", dateStr, dateStr, "1");
//                             if(optRes.success && optRes.data && optRes.data.close) {
//                                 const exactMatchIndex = optRes.data.start_Time.findIndex(t => {
//                                     const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                                     return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                                 });
//                                 finalExitPrice = exactMatchIndex !== -1 ? optRes.data.close[exactMatchIndex] : optRes.data.close[optRes.data.close.length - 1];
//                                 apiSuccess = true;
//                             }
//                         } catch(e) { }
//                     }

//                     if (!apiSuccess) {
//                         try {
//                             await sleep(500);
//                             const expRes = await fetchExpiredOptionData(broker.clientId, broker.apiSecret, spotSecurityId, targetStrike, currentTrade.optionConfig.type, dateStr, dateStr);
//                             if(expRes.success && expRes.data && expRes.data.close) {
//                                 const exactMatchIndex = expRes.data.start_Time.findIndex(t => {
//                                     const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                                     return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                                 });
//                                 finalExitPrice = exactMatchIndex !== -1 ? expRes.data.close[exactMatchIndex] : expRes.data.close[expRes.data.close.length - 1];
//                                 apiSuccess = true;
//                             }
//                         } catch(e) { }
//                     }

//                     if (!apiSuccess) {
//                         finalExitPrice = currentTrade.entryPrice; 
//                     }
//                 }

//                 const pnl = calcTradePnL(currentTrade.entryPrice, finalExitPrice, tradeQuantity, transactionType);

//                 currentTrade.exitTime = `${h}:${m}:00`;
//                 currentTrade.exitPrice = finalExitPrice;
//                 currentTrade.pnl = pnl;
//                 currentTrade.exitType = isLastCandleOfDay ? "EOD_SQUAREOFF" : "TIME_SQUAREOFF";
//                 dailyBreakdownMap[dateStr].tradesList.push(currentTrade);
                
//                 console.log(`❌ [TRADE CLOSE] Date: ${dateStr} | Premium: ${finalExitPrice.toFixed(2)} | PnL: ${pnl.toFixed(2)}`);
//                 currentTrade = null; 

//                 dailyBreakdownMap[dateStr].pnl += pnl;
//                 dailyBreakdownMap[dateStr].trades += 1;

//                 if (pnl > 0) { winTrades++; if (pnl > maxProfitTrade) maxProfitTrade = pnl; } 
//                 else { lossTrades++; if (pnl < maxLossTrade) maxLossTrade = pnl; }
//             }
//         }

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
//             equityCurve, 
//             daywiseBreakdown: daywiseBreakdown.reverse()
//         };

//         return res.status(200).json({ success: true, data: backtestResult });

//     } catch (error) {
//         console.error("Backtest Error:", error);
//         res.status(500).json({ success: false, error: "Internal Server Error" });
//     }
// };

// module.exports = { runBacktestSimulator };



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
//     try {
//         const { strategyId } = req.params;
//         const { period, start, end } = req.query;
        
//         const strategy = await Strategy.collection.findOne({ _id: new mongoose.Types.ObjectId(strategyId) });
//         if (!strategy) return res.status(404).json({ error: "Strategy not found" });

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
//             if (!broker) return res.status(400).json({ success: false, message: 'No active broker found for API keys' });
//         }

//         if (shouldFetchFromDhan) {
//             const dhanRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, spotSecurityId, exchangeSegment, "INDEX", startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0], timeframe);
//             const timeArray = dhanRes.data ? (dhanRes.data.start_Time || dhanRes.data.timestamp) : null;

//             if (dhanRes.success && timeArray) {
//                 const { open, high, low, close, volume } = dhanRes.data;
//                 const bulkOps = [];
//                 for (let i = 0; i < timeArray.length; i++) {
//                     let ms = timeArray[i];
//                     if (ms < 10000000000) ms = ms * 1000; 
//                     bulkOps.push({ insertOne: { document: { symbol: upperSymbol, timeframe, timestamp: new Date(ms), open: open[i], high: high[i], low: low[i], close: close[i], volume: volume[i] } } });
//                 }
                
//                 if (bulkOps.length > 0) {
//                     await HistoricalData.bulkWrite(bulkOps, { ordered: false }).catch(e => console.log("Duplicates ignored"));
//                     cachedData = await HistoricalData.find({ symbol: { $regex: new RegExp(cleanSymbolForMap, "i") }, timeframe, timestamp: { $gte: startDate, $lte: endDate } }).sort({ timestamp: 1 }).lean();
//                 }
//             } else {
//                 return res.status(404).json({ success: false, errorType: "NO_DATA", message: "Spot Data not available for this period." });
//             }
//         }

//         const findConditions = (obj) => {
//             if (!obj || typeof obj !== 'object') return null;
//             if (obj.longRules && Array.isArray(obj.longRules)) return obj;
//             if (Array.isArray(obj)) {
//                 for (let item of obj) {
//                     const found = findConditions(item);
//                     if (found) return found;
//                 }
//             } else {
//                 for (let key in obj) {
//                     const found = findConditions(obj[key]);
//                     if (found) return found;
//                 }
//             }
//             return null;
//         };

//         let entryConds = findConditions(strategy);

//         const calcLongInd1 = []; const calcLongInd2 = [];
//         if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
//             entryConds.longRules.forEach((rule, idx) => {
//                 const params1 = extractParams(rule.ind1, rule.params);
//                 calcLongInd1[idx] = calculateIndicator({...rule.ind1, params: params1}, cachedData);
//                 const params2 = extractParams(rule.ind2, null);
//                 calcLongInd2[idx] = calculateIndicator({...rule.ind2, params: params2}, cachedData);
//             });
//         }

//         const calcShortInd1 = []; const calcShortInd2 = [];
//         if (entryConds && entryConds.shortRules && entryConds.shortRules.length > 0) {
//             entryConds.shortRules.forEach((rule, idx) => {
//                 const params1 = extractParams(rule.ind1, rule.params);
//                 calcShortInd1[idx] = calculateIndicator({...rule.ind1, params: params1}, cachedData);
//                 const params2 = extractParams(rule.ind2, null);
//                 calcShortInd2[idx] = calculateIndicator({...rule.ind2, params: params2}, cachedData);
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
//                 calcExitLongInd1[idx] = calculateIndicator({...rule.ind1, params: extractParams(rule.ind1, rule.params)}, cachedData);
//                 calcExitLongInd2[idx] = calculateIndicator({...rule.ind2, params: extractParams(rule.ind2, null)}, cachedData);
//             });
//         }

//         const calcExitShortInd1 = []; const calcExitShortInd2 = [];
//         if (exitShortRules.length > 0) {
//             exitShortRules.forEach((rule, idx) => {
//                 calcExitShortInd1[idx] = calculateIndicator({...rule.ind1, params: extractParams(rule.ind1, rule.params)}, cachedData);
//                 calcExitShortInd2[idx] = calculateIndicator({...rule.ind2, params: extractParams(rule.ind2, null)}, cachedData);
//             });
//         }

//         let currentEquity = 0, peakEquity = 0, maxDrawdown = 0;
//         let winDays = 0, lossDays = 0, winTrades = 0, lossTrades = 0;
//         let currentWinStreak = 0, currentLossStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
//         let maxProfitTrade = 0, maxLossTrade = 0;
//         const equityCurve = []; const daywiseBreakdown = []; let dailyBreakdownMap = {}; 

//         // 🔥 MULTI-LEG STATE VARIABLES
//         let openTrades = []; // Ek se zyada trades ho sakte hain
//         const strategyLegs = strategy.legs || strategy.data?.legs || [];

//         const advanceFeaturesSettings = strategy.data?.advanceFeatures || strategy.advanceFeatures || {};
//         const riskSettings = strategy.data?.riskManagement || strategy.riskManagement || {};
//         const globalMaxProfit = Number(riskSettings.maxProfit) || 0;
//         const globalMaxLoss = Number(riskSettings.maxLoss) || 0;
        
//         let isTradingHaltedForDay = false; 
//         let currentDayTracker = ""; 

//         const calculateATM = (spotPrice, symbolStr) => {
//             if(symbolStr.includes("BANK")) return Math.round(spotPrice / 100) * 100;
//             return Math.round(spotPrice / 50) * 50;
//         };

//         const calcTradePnL = (entryP, exitP, qty, action) => {
//             if(action === "BUY") return (exitP - entryP) * qty;
//             return (entryP - exitP) * qty; 
//         };

//         const getNearestExpiryString = (tradeDateStr, symbolStr) => {
//             const d = new Date(tradeDateStr);
//             const upSym = symbolStr.toUpperCase();
//             let expiryDate = new Date(d);
            
//             if (upSym.includes("NIFTY") && !upSym.includes("BANK") && !upSym.includes("FIN") && !upSym.includes("MID")) {
//                 let targetDay = 2; 
//                 while (expiryDate.getDay() !== targetDay) expiryDate.setDate(expiryDate.getDate() + 1);
//             } else {
//                 let targetDay = upSym.includes("MID") ? 1 : 2; 
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
//             }

//             if (!dailyBreakdownMap[dateStr]) dailyBreakdownMap[dateStr] = { pnl: 0, trades: 0, tradesList: [] };

//             let longSignal = false;
//             if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
//                 let overallResult = null;
//                 entryConds.longRules.forEach((rule, idx) => {
//                     const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
//                     const ruleResult = evaluateCondition(
//                         calcLongInd1[idx] ? calcLongInd1[idx][i] : null, calcLongInd2[idx] ? calcLongInd2[idx][i] : null,
//                         (i > 0 && calcLongInd1[idx]) ? calcLongInd1[idx][i-1] : null, (i > 0 && calcLongInd2[idx]) ? calcLongInd2[idx][i-1] : null, operator
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
//                         (i > 0 && calcShortInd1[idx]) ? calcShortInd1[idx][i-1] : null, (i > 0 && calcShortInd2[idx]) ? calcShortInd2[idx][i-1] : null, operator
//                     );
//                     if (idx === 0) overallResult = ruleResult;
//                     else {
//                         const logicalOp = entryConds.logicalOps[idx - 1]; 
//                         overallResult = logicalOp === 'AND' ? (overallResult && ruleResult) : (overallResult || ruleResult);
//                     }
//                 });
//                 shortSignal = overallResult;
//             }

//             const txnType = strategy.config?.transactionType || strategy.data?.config?.transactionType || 'Both Side';
//             const finalLongSignal = (txnType === 'Both Side' || txnType === 'Only Long') ? longSignal : false;
//             const finalShortSignal = (txnType === 'Both Side' || txnType === 'Only Short') ? shortSignal : false;

//             let exitLongSignal = false;
//             if (exitLongRules.length > 0) {
//                 let overallResult = null;
//                 exitLongRules.forEach((rule, idx) => {
//                     const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
//                     const ruleResult = evaluateCondition(
//                         calcExitLongInd1[idx] ? calcExitLongInd1[idx][i] : null, calcExitLongInd2[idx] ? calcExitLongInd2[idx][i] : null,
//                         (i > 0 && calcExitLongInd1[idx]) ? calcExitLongInd1[idx][i-1] : null, (i > 0 && calcExitLongInd2[idx]) ? calcExitLongInd2[idx][i-1] : null, operator
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
//                         (i > 0 && calcExitShortInd1[idx]) ? calcExitShortInd1[idx][i-1] : null, (i > 0 && calcExitShortInd2[idx]) ? calcExitShortInd2[idx][i-1] : null, operator
//                     );
//                     if (idx === 0) overallResult = ruleResult;
//                     else {
//                         const logicalOp = exitConds.logicalOpsShort ? exitConds.logicalOpsShort[idx - 1] : 'AND'; 
//                         overallResult = logicalOp === 'AND' ? (overallResult && ruleResult) : (overallResult || ruleResult);
//                     }
//                 });
//                 exitShortSignal = overallResult;
//             }

//             const isMarketOpen = timeInMinutes >= 555 && timeInMinutes < 915; 
//             const isExitTime = timeInMinutes >= 915; 
//             let isLastCandleOfDay = false;
//             if (i === cachedData.length - 1) isLastCandleOfDay = true;
//             else {
//                 const nextCandleIst = new Date(new Date(cachedData[i+1].timestamp).getTime() + (5.5 * 60 * 60 * 1000));
//                 if (nextCandleIst.toISOString().split('T')[0] !== dateStr) isLastCandleOfDay = true;
//             }

//             const spotClosePrice = parseFloat(candle.close);

//             // =========================================================
//             // 🔥 1. M2M RISK CHECK & MULTI-LEG EVALUATION
//             // =========================================================
//             if (openTrades.length > 0) {
//                 let combinedOpenPnL = 0;
//                 let triggerReasonForExitAll = null; // Exit All Tracker

//                 // 🧮 A. UPDATE PREMIUMS & CALCULATE COMBINED PNL
//                 openTrades.forEach(trade => {
//                     let currentClose = spotClosePrice; 
//                     trade.currentHigh = spotClosePrice; trade.currentLow = spotClosePrice;

//                     if (isOptionsTrade && trade.premiumChart && trade.premiumChart.start_Time) {
//                         const exactMatchIndex = trade.premiumChart.start_Time.findIndex(t => {
//                             const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                             return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                         });
                        
//                         if (exactMatchIndex !== -1) {
//                             let tempClose = trade.premiumChart.close[exactMatchIndex];
//                             if (tempClose > spotClosePrice * 0.5) {
//                                 currentClose = trade.lastKnownPremium || trade.entryPrice;
//                             } else {
//                                 currentClose = tempClose;
//                                 trade.currentHigh = trade.premiumChart.high[exactMatchIndex];
//                                 trade.currentLow = trade.premiumChart.low[exactMatchIndex];
//                                 trade.lastKnownPremium = currentClose; 
//                             }
//                         } else {
//                             currentClose = trade.lastKnownPremium || trade.entryPrice;
//                         }
//                     } else if (!isOptionsTrade) {
//                         trade.currentHigh = parseFloat(candle.high); trade.currentLow = parseFloat(candle.low); currentClose = parseFloat(candle.close);
//                     }
                    
//                     trade.currentPrice = currentClose;
//                     trade.openPnL = calcTradePnL(trade.entryPrice, currentClose, trade.quantity, trade.transaction);
//                     combinedOpenPnL += trade.openPnL;
//                 });

//                 // 🧮 B. CHECK GLOBAL MTM FIRST (Priority Override)
//                 let hitGlobalMaxProfit = false;
//                 let hitGlobalMaxLoss = false;
//                 let globalExitPriceMap = {}; 

//                 const realizedDailyPnL = dailyBreakdownMap[dateStr].pnl;
//                 const mtmResult = evaluateMtmLogic(realizedDailyPnL, combinedOpenPnL, riskSettings);
                
//                 if (mtmResult.isHalted) {
//                     hitGlobalMaxProfit = mtmResult.exitReason === "MAX_PROFIT";
//                     hitGlobalMaxLoss = mtmResult.exitReason === "MAX_LOSS";
//                     isTradingHaltedForDay = true; 
//                     triggerReasonForExitAll = mtmResult.exitReason;
//                     console.log(mtmResult.logMessage);
//                 }

//                 // 🧮 C. CHECK INDIVIDUAL LEG SL/TP/TSL/INDICATOR
//                 openTrades.forEach((trade, idx) => {
//                     if (trade.markedForExit) return; // Skip already processed

//                     if (hitGlobalMaxProfit || hitGlobalMaxLoss) {
//                         trade.markedForExit = true;
//                         trade.exitReason = hitGlobalMaxProfit ? "MAX_PROFIT" : "MAX_LOSS";
//                         trade.exitPrice = trade.currentPrice; 
//                         return;
//                     }

//                     const legData = trade.legConfig;
//                     const slValue = legData.slValue || 0;
//                     const tpValue = legData.tpValue || 0;
//                     let slPrice = 0, tpPrice = 0;

//                     if (trade.transaction === "BUY") {
//                         slPrice = trade.entryPrice * (1 - slValue / 100); tpPrice = trade.entryPrice * (1 + tpValue / 100);
//                     } else {
//                         slPrice = trade.entryPrice * (1 + slValue / 100); tpPrice = trade.entryPrice * (1 - tpValue / 100);
//                     }

//                     // 1. Fixed SL/TP
//                     if (slValue > 0 && ((trade.transaction === "BUY" && trade.currentLow <= slPrice) || (trade.transaction === "SELL" && trade.currentHigh >= slPrice))) {
//                         trade.markedForExit = true; trade.exitReason = "STOPLOSS"; trade.exitPrice = slPrice;
//                         triggerReasonForExitAll = "STOPLOSS";
//                     } else if (tpValue > 0 && ((trade.transaction === "BUY" && trade.currentHigh >= tpPrice) || (trade.transaction === "SELL" && trade.currentLow <= tpPrice))) {
//                         trade.markedForExit = true; trade.exitReason = "TARGET"; trade.exitPrice = tpPrice;
//                         triggerReasonForExitAll = "TARGET";
//                     }

//                     // 2. Trailing SL
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

//                     // 3. Indicator Exit
//                     if (!trade.markedForExit) {
//                         if ((trade.signalType === "LONG" && exitLongSignal) || (trade.signalType === "SHORT" && exitShortSignal)) {
//                             trade.markedForExit = true; trade.exitReason = "INDICATOR_EXIT"; trade.exitPrice = trade.currentPrice;
//                         }
//                     }
//                 });

//                 // 🧮 D. EVALUATE EXIT ALL ON SL/TGT (Advance Feature)
//                 if (triggerReasonForExitAll && !hitGlobalMaxProfit && !hitGlobalMaxLoss) {
//                     const exitAllCheck = evaluateExitAllLogic(advanceFeaturesSettings, triggerReasonForExitAll);
//                     if (exitAllCheck.shouldExitAll) {
//                         openTrades.forEach(trade => {
//                             if (!trade.markedForExit) {
//                                 trade.markedForExit = true;
//                                 trade.exitReason = exitAllCheck.exitReason; // e.g. "EXIT_ALL_TRIGGERED_BY_STOPLOSS"
//                                 trade.exitPrice = trade.currentPrice; // Market square-off
//                             }
//                         });
//                     }
//                 }

//                 // 🧮 E. EXECUTE EXITS AND CLEANUP ARRAY
//                 let remainingTrades = [];
//                 openTrades.forEach(trade => {
//                     if (trade.markedForExit || isExitTime || isLastCandleOfDay) {
//                         // Time Square Off fallback
//                         if (!trade.markedForExit) {
//                             trade.exitReason = isLastCandleOfDay ? "EOD_SQUAREOFF" : "TIME_SQUAREOFF";
//                             trade.exitPrice = trade.currentPrice;
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
//                         if (pnl > 0) { winTrades++; if(pnl > maxProfitTrade) maxProfitTrade = pnl; } 
//                         else { lossTrades++; if(pnl < maxLossTrade) maxLossTrade = pnl; }
                        
//                         console.log(`🎯 [${completedTrade.exitType}] Date: ${dateStr} | Symbol: ${trade.symbol} | Exit: ${trade.exitPrice.toFixed(2)} | PnL: ${pnl.toFixed(2)}`);
//                     } else {
//                         remainingTrades.push(trade); // Keep it open
//                     }
//                 });

//                 openTrades = remainingTrades; // Update array
//             } 
//             else if (!isTradingHaltedForDay) {
//                 // If no trades open, check MTM realization
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
                
//                 // Loop through all legs defined in the strategy
//                 for (let legIndex = 0; legIndex < strategyLegs.length; legIndex++) {
//                     const legData = strategyLegs[legIndex];
                    
//                     let tradeQuantity = legData.quantity; 
//                     if (!tradeQuantity || isNaN(tradeQuantity)) tradeQuantity = upperSymbol.includes("BANK") ? 30 : (upperSymbol.includes("NIFTY") ? 50 : 1);

//                     const transActionTypeStr = (legData.action || "BUY").toUpperCase();
                    
//                     let activeOptionType = "";
//                     if (transActionTypeStr === "BUY") activeOptionType = finalLongSignal ? "CE" : "PE";
//                     else if (transActionTypeStr === "SELL") activeOptionType = finalLongSignal ? "PE" : "CE"; 
                    
//                     let tradeSymbol = upperSymbol;
//                     let finalEntryPrice = spotClosePrice;
//                     let validTrade = true;
//                     let premiumChartData = null; 
//                     let targetStrike = calculateATM(spotClosePrice, upperSymbol);

//                     if(isOptionsTrade && broker) {
//                         let apiSuccess = false;
//                         const strikeCriteria = legData.strikeCriteria || "ATM pt";
//                         const strikeType = legData.strikeType || "ATM";
//                         const reqExpiry = legData.expiry || "WEEKLY";

//                         const optionConfig = getOptionSecurityId(upperSymbol, spotClosePrice, strikeCriteria, strikeType, activeOptionType, reqExpiry);
//                         if (optionConfig && optionConfig.strike) targetStrike = optionConfig.strike;

//                         if(optionConfig) {
//                             try {
//                                 await sleep(500); // Be kind to API
//                                 const optRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, optionConfig.id, "NSE_FNO", "OPTIDX", dateStr, dateStr, "1");
//                                 if(optRes.success && optRes.data && optRes.data.close) {
//                                     const exactMatchIndex = optRes.data.start_Time.findIndex(t => {
//                                         const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                                         return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                                     });
//                                     finalEntryPrice = exactMatchIndex !== -1 ? optRes.data.close[exactMatchIndex] : optRes.data.close[0];
//                                     tradeSymbol = optionConfig.tradingSymbol;
//                                     premiumChartData = optRes.data; 
//                                     apiSuccess = true;
//                                 } 
//                             } catch(e) { }
//                         } 
                        
//                         if (!apiSuccess) {
//                             try {
//                                 await sleep(500);
//                                 const expRes = await fetchExpiredOptionData(broker.clientId, broker.apiSecret, spotSecurityId, targetStrike, activeOptionType, dateStr, dateStr);
//                                 if(expRes.success && expRes.data && expRes.data.close) {
//                                     const exactMatchIndex = expRes.data.start_Time.findIndex(t => {
//                                         const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                                         return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                                     });
//                                     finalEntryPrice = exactMatchIndex !== -1 ? expRes.data.close[exactMatchIndex] : expRes.data.close[0];
//                                     const expiryLabel = getNearestExpiryString(dateStr, upperSymbol);
//                                     tradeSymbol = `${upperSymbol} ${targetStrike} ${activeOptionType} (${expiryLabel})`;
//                                     premiumChartData = expRes.data; 
//                                     apiSuccess = true;
//                                 }
//                             } catch(e) { }
//                         }

//                         if (apiSuccess && finalEntryPrice > spotClosePrice * 0.5) {
//                             validTrade = false;
//                             console.log(`❌ Trade Canceled: API sent garbage premium matching Spot price!`);
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
//                             markedForExit: false // Flag for cleanup
//                         });
//                         console.log(`✅ [TRADE OPEN] Leg ${legIndex + 1} | Time: ${h}:${m} | Spot: ${spotClosePrice} | Premium: ${finalEntryPrice} | Type: ${activeOptionType}`);
//                     }
//                 } // End of Legs Loop
//             }
//         } // End of Main Candle Loop

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

//         return res.status(200).json({ success: true, data: backtestResult });

//     } catch (error) {
//         console.error("Backtest Error:", error);
//         res.status(500).json({ success: false, error: "Internal Server Error" });
//     }
// };

// module.exports = { runBacktestSimulator };



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
//     try {
//         const { strategyId } = req.params;
//         const { period, start, end } = req.query;
        
//         const strategy = await Strategy.collection.findOne({ _id: new mongoose.Types.ObjectId(strategyId) });
//         if (!strategy) return res.status(404).json({ error: "Strategy not found" });

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
//             if (!broker) return res.status(400).json({ success: false, message: 'No active broker found for API keys' });
//         }

//         // 🔥 FIX 1: DATE CHUNKING LOGIC (To bypass Dhan 5-day limit)
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

//             console.log(`📡 Fetching missing historical data from API in ${chunkedRanges.length} safe chunks...`);
            
//             for (let range of chunkedRanges) {
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
//                 } else {
//                     console.error(`❌ [DHAN API ERROR] Chunk Failed. Dhan says:`, dhanRes.message || "Returned Empty Data");
//                 }
//             }
            
//             cachedData = await HistoricalData.find({ symbol: { $regex: new RegExp(cleanSymbolForMap, "i") }, timeframe, timestamp: { $gte: startDate, $lte: endDate } }).sort({ timestamp: 1 }).lean();
            
//             if (cachedData.length === 0) {
//                 return res.status(404).json({ success: false, errorType: "NO_DATA", message: "Spot Data not available for this period." });
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
//                 const params1 = extractParams(rule.ind1, rule.params);
//                 calcLongInd1[idx] = calculateIndicator({...rule.ind1, params: params1}, cachedData);
//                 const params2 = extractParams(rule.ind2, null);
//                 calcLongInd2[idx] = calculateIndicator({...rule.ind2, params: params2}, cachedData);
//             });
//         }

//         const calcShortInd1 = []; const calcShortInd2 = [];
//         if (entryConds && entryConds.shortRules && entryConds.shortRules.length > 0) {
//             entryConds.shortRules.forEach((rule, idx) => {
//                 const params1 = extractParams(rule.ind1, rule.params);
//                 calcShortInd1[idx] = calculateIndicator({...rule.ind1, params: params1}, cachedData);
//                 const params2 = extractParams(rule.ind2, null);
//                 calcShortInd2[idx] = calculateIndicator({...rule.ind2, params: params2}, cachedData);
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
//                 calcExitLongInd1[idx] = calculateIndicator({...rule.ind1, params: extractParams(rule.ind1, rule.params)}, cachedData);
//                 calcExitLongInd2[idx] = calculateIndicator({...rule.ind2, params: extractParams(rule.ind2, null)}, cachedData);
//             });
//         }

//         const calcExitShortInd1 = []; const calcExitShortInd2 = [];
//         if (exitShortRules.length > 0) {
//             exitShortRules.forEach((rule, idx) => {
//                 calcExitShortInd1[idx] = calculateIndicator({...rule.ind1, params: extractParams(rule.ind1, rule.params)}, cachedData);
//                 calcExitShortInd2[idx] = calculateIndicator({...rule.ind2, params: extractParams(rule.ind2, null)}, cachedData);
//             });
//         }

//         let currentEquity = 0, peakEquity = 0, maxDrawdown = 0;
//         let winDays = 0, lossDays = 0, winTrades = 0, lossTrades = 0;
//         let currentWinStreak = 0, currentLossStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
//         let maxProfitTrade = 0, maxLossTrade = 0;
//         const equityCurve = []; const daywiseBreakdown = []; let dailyBreakdownMap = {}; 

//         let openTrades = []; 
//         const strategyLegs = strategy.legs || strategy.data?.legs || [];

//         const advanceFeaturesSettings = strategy.data?.advanceFeatures || strategy.advanceFeatures || {};
//         const riskSettings = strategy.data?.riskManagement || strategy.riskManagement || {};
//         const globalMaxProfit = Number(riskSettings.maxProfit) || 0;
//         const globalMaxLoss = Number(riskSettings.maxLoss) || 0;
        
//         let isTradingHaltedForDay = false; 
//         let currentDayTracker = ""; 

//         const calculateATM = (spotPrice, symbolStr) => {
//             if(symbolStr.includes("BANK")) return Math.round(spotPrice / 100) * 100;
//             return Math.round(spotPrice / 50) * 50;
//         };

//         const calcTradePnL = (entryP, exitP, qty, action) => {
//             if(action === "BUY") return (exitP - entryP) * qty;
//             return (entryP - exitP) * qty; 
//         };

//         const getNearestExpiryString = (tradeDateStr, symbolStr) => {
//             const d = new Date(tradeDateStr);
//             const upSym = symbolStr.toUpperCase();
//             let expiryDate = new Date(d);
            
//             if (upSym.includes("NIFTY") && !upSym.includes("BANK") && !upSym.includes("FIN") && !upSym.includes("MID")) {
//                 let targetDay = 2; 
//                 while (expiryDate.getDay() !== targetDay) expiryDate.setDate(expiryDate.getDate() + 1);
//             } else {
//                 let targetDay = upSym.includes("MID") ? 1 : 2; 
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
//             }

//             // 🔥 FIX 2: Added hasTradedTimeBased flag to prevent multiple entries
//             if (!dailyBreakdownMap[dateStr]) dailyBreakdownMap[dateStr] = { pnl: 0, trades: 0, tradesList: [], hasTradedTimeBased: false };

//             let longSignal = false;
//             if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
//                 let overallResult = null;
//                 entryConds.longRules.forEach((rule, idx) => {
//                     const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
//                     const ruleResult = evaluateCondition(
//                         calcLongInd1[idx] ? calcLongInd1[idx][i] : null, calcLongInd2[idx] ? calcLongInd2[idx][i] : null,
//                         (i > 0 && calcLongInd1[idx]) ? calcLongInd1[idx][i-1] : null, (i > 0 && calcLongInd2[idx]) ? calcLongInd2[idx][i-1] : null, operator
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
//                         (i > 0 && calcShortInd1[idx]) ? calcShortInd1[idx][i-1] : null, (i > 0 && calcShortInd2[idx]) ? calcShortInd2[idx][i-1] : null, operator
//                     );
//                     if (idx === 0) overallResult = ruleResult;
//                     else {
//                         const logicalOp = entryConds.logicalOps[idx - 1]; 
//                         overallResult = logicalOp === 'AND' ? (overallResult && ruleResult) : (overallResult || ruleResult);
//                     }
//                 });
//                 shortSignal = overallResult;
//             }

//             // 🔥 FIX 3: THE MISSING TIME-BASED ENGINE LOGIC
//             const isTimeBased = (strategy.config?.strategyType === 'Time Based' || strategy.data?.config?.strategyType === 'Time Based' || strategy.type === 'Time Based');
            
//             if (isTimeBased) {
//                 const sTime = strategy.startTime || strategy.config?.startTime || strategy.data?.config?.startTime || strategy.entrySettings?.startTime || strategy.data?.entrySettings?.startTime;
                
//                 if (sTime) {
//                     const [sh, sm] = sTime.split(':');
//                     let startMin = parseInt(sh) * 60 + parseInt(sm.split(' ')[0]);
//                     if (sTime.toUpperCase().includes('PM') && parseInt(sh) !== 12) startMin += 720;
                    
//                     // Trigger entry if current time is >= Start Time and we haven't traded yet today
//                     if (timeInMinutes >= startMin && !dailyBreakdownMap[dateStr].hasTradedTimeBased) {
//                         longSignal = true; // Use longSignal to force the engine to enter
//                         dailyBreakdownMap[dateStr].hasTradedTimeBased = true; // Lock it for the day
//                     }
//                 }
//             }

//             const txnType = strategy.config?.transactionType || strategy.data?.config?.transactionType || 'Both Side';
//             // Included isTimeBased flag here to pass the signal
//             const finalLongSignal = (txnType === 'Both Side' || txnType === 'Only Long' || isTimeBased) ? longSignal : false;
//             const finalShortSignal = (txnType === 'Both Side' || txnType === 'Only Short') ? shortSignal : false;

//             let exitLongSignal = false;
//             if (exitLongRules.length > 0) {
//                 let overallResult = null;
//                 exitLongRules.forEach((rule, idx) => {
//                     const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
//                     const ruleResult = evaluateCondition(
//                         calcExitLongInd1[idx] ? calcExitLongInd1[idx][i] : null, calcExitLongInd2[idx] ? calcExitLongInd2[idx][i] : null,
//                         (i > 0 && calcExitLongInd1[idx]) ? calcExitLongInd1[idx][i-1] : null, (i > 0 && calcExitLongInd2[idx]) ? calcExitLongInd2[idx][i-1] : null, operator
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
//                         (i > 0 && calcExitShortInd1[idx]) ? calcExitShortInd1[idx][i-1] : null, (i > 0 && calcExitShortInd2[idx]) ? calcExitShortInd2[idx][i-1] : null, operator
//                     );
//                     if (idx === 0) overallResult = ruleResult;
//                     else {
//                         const logicalOp = exitConds.logicalOpsShort ? exitConds.logicalOpsShort[idx - 1] : 'AND'; 
//                         overallResult = logicalOp === 'AND' ? (overallResult && ruleResult) : (overallResult || ruleResult);
//                     }
//                 });
//                 exitShortSignal = overallResult;
//             }

//             const isMarketOpen = timeInMinutes >= 555 && timeInMinutes < 915; 
//             const isExitTime = timeInMinutes >= 915; 
//             let isLastCandleOfDay = false;
//             if (i === cachedData.length - 1) isLastCandleOfDay = true;
//             else {
//                 const nextCandleIst = new Date(new Date(cachedData[i+1].timestamp).getTime() + (5.5 * 60 * 60 * 1000));
//                 if (nextCandleIst.toISOString().split('T')[0] !== dateStr) isLastCandleOfDay = true;
//             }

//             const spotClosePrice = parseFloat(candle.close);

//             // =========================================================
//             // 🔥 1. M2M RISK CHECK & MULTI-LEG EVALUATION
//             // =========================================================
//             if (openTrades.length > 0) {
//                 let combinedOpenPnL = 0;
//                 let triggerReasonForExitAll = null; 

//                 openTrades.forEach(trade => {
//                     let currentClose = spotClosePrice; 
//                     trade.currentHigh = spotClosePrice; trade.currentLow = spotClosePrice;

//                     if (isOptionsTrade && trade.premiumChart && trade.premiumChart.start_Time) {
//                         const exactMatchIndex = trade.premiumChart.start_Time.findIndex(t => {
//                             const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                             return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                         });
                        
//                         if (exactMatchIndex !== -1) {
//                             let tempClose = trade.premiumChart.close[exactMatchIndex];
//                             if (tempClose > spotClosePrice * 0.5) {
//                                 currentClose = trade.lastKnownPremium || trade.entryPrice;
//                             } else {
//                                 currentClose = tempClose;
//                                 trade.currentHigh = trade.premiumChart.high[exactMatchIndex];
//                                 trade.currentLow = trade.premiumChart.low[exactMatchIndex];
//                                 trade.lastKnownPremium = currentClose; 
//                             }
//                         } else {
//                             currentClose = trade.lastKnownPremium || trade.entryPrice;
//                         }
//                     } else if (!isOptionsTrade) {
//                         trade.currentHigh = parseFloat(candle.high); trade.currentLow = parseFloat(candle.low); currentClose = parseFloat(candle.close);
//                     }
                    
//                     trade.currentPrice = currentClose;
//                     trade.openPnL = calcTradePnL(trade.entryPrice, currentClose, trade.quantity, trade.transaction);
//                     combinedOpenPnL += trade.openPnL;
//                 });

//                 let hitGlobalMaxProfit = false;
//                 let hitGlobalMaxLoss = false;
//                 let globalExitPriceMap = {}; 

//                 const realizedDailyPnL = dailyBreakdownMap[dateStr].pnl;
//                 const mtmResult = evaluateMtmLogic(realizedDailyPnL, combinedOpenPnL, riskSettings);
                
//                 if (mtmResult.isHalted) {
//                     hitGlobalMaxProfit = mtmResult.exitReason === "MAX_PROFIT";
//                     hitGlobalMaxLoss = mtmResult.exitReason === "MAX_LOSS";
//                     isTradingHaltedForDay = true; 
//                     triggerReasonForExitAll = mtmResult.exitReason;
//                 }

//                 openTrades.forEach((trade, idx) => {
//                     if (trade.markedForExit) return; 

//                     if (hitGlobalMaxProfit || hitGlobalMaxLoss) {
//                         trade.markedForExit = true;
//                         trade.exitReason = hitGlobalMaxProfit ? "MAX_PROFIT" : "MAX_LOSS";
//                         trade.exitPrice = trade.currentPrice; 
//                         return;
//                     }

//                     const legData = trade.legConfig;
//                     const slValue = legData.slValue || 0;
//                     const tpValue = legData.tpValue || 0;
//                     let slPrice = 0, tpPrice = 0;

//                     if (trade.transaction === "BUY") {
//                         slPrice = trade.entryPrice * (1 - slValue / 100); tpPrice = trade.entryPrice * (1 + tpValue / 100);
//                     } else {
//                         slPrice = trade.entryPrice * (1 + slValue / 100); tpPrice = trade.entryPrice * (1 - tpValue / 100);
//                     }

//                     if (slValue > 0 && ((trade.transaction === "BUY" && trade.currentLow <= slPrice) || (trade.transaction === "SELL" && trade.currentHigh >= slPrice))) {
//                         trade.markedForExit = true; trade.exitReason = "STOPLOSS"; trade.exitPrice = slPrice;
//                         triggerReasonForExitAll = "STOPLOSS";
//                     } else if (tpValue > 0 && ((trade.transaction === "BUY" && trade.currentHigh >= tpPrice) || (trade.transaction === "SELL" && trade.currentLow <= tpPrice))) {
//                         trade.markedForExit = true; trade.exitReason = "TARGET"; trade.exitPrice = tpPrice;
//                         triggerReasonForExitAll = "TARGET";
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
//                 openTrades.forEach(trade => {
//                     if (trade.markedForExit || isExitTime || isLastCandleOfDay) {
//                         if (!trade.markedForExit) {
//                             trade.exitReason = isLastCandleOfDay ? "EOD_SQUAREOFF" : "TIME_SQUAREOFF";
//                             trade.exitPrice = trade.currentPrice;
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
//                         if (pnl > 0) { winTrades++; if(pnl > maxProfitTrade) maxProfitTrade = pnl; } 
//                         else { lossTrades++; if(pnl < maxLossTrade) maxLossTrade = pnl; }
                        
//                         console.log(`🎯 [${completedTrade.exitType}] Date: ${dateStr} | Symbol: ${trade.symbol} | Exit: ${trade.exitPrice.toFixed(2)} | PnL: ${pnl.toFixed(2)}`);
//                     } else {
//                         remainingTrades.push(trade); 
//                     }
//                 });

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

//                     // 🔥 FIX 4: PREVENT CE/PE OVERRIDE IN TIME-BASED
//                     if (isTimeBased) {
//                         activeOptionType = (legData.optionType || "Call").toUpperCase().includes("C") ? "CE" : "PE";
//                     } else {
//                         if (transActionTypeStr === "BUY") activeOptionType = finalLongSignal ? "CE" : "PE";
//                         else if (transActionTypeStr === "SELL") activeOptionType = finalLongSignal ? "PE" : "CE"; 
//                     }
                    
//                     let tradeSymbol = upperSymbol;
//                     let finalEntryPrice = spotClosePrice;
//                     let validTrade = true;
//                     let premiumChartData = null; 
//                     let targetStrike = calculateATM(spotClosePrice, upperSymbol);

//                     if(isOptionsTrade && broker) {
//                         let apiSuccess = false;
//                         const strikeCriteria = legData.strikeCriteria || "ATM pt";
//                         const strikeType = legData.strikeType || "ATM";
//                         const reqExpiry = legData.expiry || "WEEKLY";

//                         const optionConfig = getOptionSecurityId(upperSymbol, spotClosePrice, strikeCriteria, strikeType, activeOptionType, reqExpiry);
//                         if (optionConfig && optionConfig.strike) targetStrike = optionConfig.strike;

//                         if(optionConfig) {
//                             try {
//                                 await sleep(500); 
//                                 const optRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, optionConfig.id, "NSE_FNO", "OPTIDX", dateStr, dateStr, "1");
//                                 if(optRes.success && optRes.data && optRes.data.close) {
//                                     const exactMatchIndex = optRes.data.start_Time.findIndex(t => {
//                                         const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                                         return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                                     });
//                                     finalEntryPrice = exactMatchIndex !== -1 ? optRes.data.close[exactMatchIndex] : optRes.data.close[0];
//                                     tradeSymbol = optionConfig.tradingSymbol;
//                                     premiumChartData = optRes.data; 
//                                     apiSuccess = true;
//                                 } 
//                             } catch(e) { }
//                         } 
                        
//                         if (!apiSuccess) {
//                             try {
//                                 await sleep(500);
//                                 const expRes = await fetchExpiredOptionData(broker.clientId, broker.apiSecret, spotSecurityId, targetStrike, activeOptionType, dateStr, dateStr);
//                                 if(expRes.success && expRes.data && expRes.data.close) {
//                                     const exactMatchIndex = expRes.data.start_Time.findIndex(t => {
//                                         const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                                         return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                                     });
//                                     finalEntryPrice = exactMatchIndex !== -1 ? expRes.data.close[exactMatchIndex] : expRes.data.close[0];
//                                     const expiryLabel = getNearestExpiryString(dateStr, upperSymbol);
//                                     tradeSymbol = `${upperSymbol} ${targetStrike} ${activeOptionType} (${expiryLabel})`;
//                                     premiumChartData = expRes.data; 
//                                     apiSuccess = true;
//                                 }
//                             } catch(e) { }
//                         }

//                         if (apiSuccess && finalEntryPrice > spotClosePrice * 0.5) {
//                             validTrade = false;
//                             console.log(`❌ Trade Canceled: API sent garbage premium matching Spot price!`);
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

//         return res.status(200).json({ success: true, data: backtestResult });

//     } catch (error) {
//         console.error("Backtest Error:", error);
//         res.status(500).json({ success: false, error: "Internal Server Error" });
//     }
// };

// module.exports = { runBacktestSimulator };


const mongoose = require('mongoose'); 
const Strategy = require('../models/Strategy');
const HistoricalData = require('../models/HistoricalData');
const Broker = require('../models/Broker');
const { calculateIndicator, extractParams, evaluateCondition } = require('../services/indicatorService');
const { getOptionSecurityId, sleep } = require('../services/instrumentService');
const { fetchDhanHistoricalData, fetchExpiredOptionData } = require('../services/dhanService');

// 🔥 IMPORTING ALL SHARED LOGIC MODULES
const { evaluateTrailingSL } = require('../engine/features/riskManagement/trailingLogic');
const { evaluateMtmLogic } = require('../engine/features/riskManagement/mtmSquareOff');
const { evaluateExitAllLogic } = require('../engine/features/advanceFeatures/exitAllOnSlTgt');

const formatIndName = (ind) => {
    if (!ind) return 'Value';
    if (ind.display) {
        const match = ind.display.match(/^([A-Za-z0-9_]+)\((\d+)/);
        if (match) return `${match[1]}(${match[2]})`;
        return ind.display.split(',')[0] + (ind.display.includes(',') ? ')' : '');
    }
    let name = ind.name || ind.id || 'Value';
    let period = ind.params?.Period || ind.params?.period;
    if (period) return `${name}(${period})`;
    return name;
};

const runBacktestSimulator = async (req, res) => {
    try {
        const { strategyId } = req.params;
        const { period, start, end } = req.query;
        
        const strategy = await Strategy.collection.findOne({ _id: new mongoose.Types.ObjectId(strategyId) });
        if (!strategy) return res.status(404).json({ error: "Strategy not found" });

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
        
        let cachedData = await HistoricalData.find({
            symbol: { $regex: new RegExp(cleanSymbolForMap, "i") }, timeframe, timestamp: { $gte: startDate, $lte: endDate }
        }).sort({ timestamp: 1 }).lean();

        let shouldFetchFromDhan = false;
        if (cachedData.length === 0) {
            shouldFetchFromDhan = true;
        } else {
            const dbStartDate = cachedData[0].timestamp;
            const dbEndDate = cachedData[cachedData.length - 1].timestamp;
            if (dbStartDate > new Date(startDate.getTime() + 86400000) || dbEndDate < new Date(endDate.getTime() - 86400000)) {
                shouldFetchFromDhan = true;
                await HistoricalData.deleteMany({ symbol: { $regex: new RegExp(cleanSymbolForMap, "i") }, timeframe, timestamp: { $gte: startDate, $lte: endDate } });
            }
        }

        let broker = null;
        if (shouldFetchFromDhan || isOptionsTrade) {
            broker = await Broker.findOne({ engineOn: true });
            if (!broker) return res.status(400).json({ success: false, message: 'No active broker found for API keys' });
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
            }
            
            cachedData = await HistoricalData.find({ symbol: { $regex: new RegExp(cleanSymbolForMap, "i") }, timeframe, timestamp: { $gte: startDate, $lte: endDate } }).sort({ timestamp: 1 }).lean();
            if (cachedData.length === 0) return res.status(404).json({ success: false, errorType: "NO_DATA", message: "Spot Data not available for this period." });
        }

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

        const calcLongInd1 = []; const calcLongInd2 = [];
        if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
            entryConds.longRules.forEach((rule, idx) => {
                calcLongInd1[idx] = calculateIndicator({...rule.ind1, params: extractParams(rule.ind1, rule.params)}, cachedData);
                calcLongInd2[idx] = calculateIndicator({...rule.ind2, params: extractParams(rule.ind2, null)}, cachedData);
            });
        }

        const calcShortInd1 = []; const calcShortInd2 = [];
        if (entryConds && entryConds.shortRules && entryConds.shortRules.length > 0) {
            entryConds.shortRules.forEach((rule, idx) => {
                calcShortInd1[idx] = calculateIndicator({...rule.ind1, params: extractParams(rule.ind1, rule.params)}, cachedData);
                calcShortInd2[idx] = calculateIndicator({...rule.ind2, params: extractParams(rule.ind2, null)}, cachedData);
            });
        }

        let exitConds = {};
        const possibleExits = strategy.exitConditions || strategy.data?.exitConditions || strategy.data?.entrySettings?.exitConditions || [];
        if (Array.isArray(possibleExits) && possibleExits.length > 0) exitConds = possibleExits[0];
        else if (possibleExits && typeof possibleExits === 'object' && !Array.isArray(possibleExits)) exitConds = possibleExits;

        const rawExitLongRules = exitConds.longRules || [];
        const rawExitShortRules = exitConds.shortRules || [];
        const exitLongRules = rawExitLongRules.filter(rule => rule.ind1 && (rule.ind1.id || rule.ind1.display));
        const exitShortRules = rawExitShortRules.filter(rule => rule.ind1 && (rule.ind1.id || rule.ind1.display));
        
        const calcExitLongInd1 = []; const calcExitLongInd2 = [];
        if (exitLongRules.length > 0) {
            exitLongRules.forEach((rule, idx) => {
                calcExitLongInd1[idx] = calculateIndicator({...rule.ind1, params: extractParams(rule.ind1, rule.params)}, cachedData);
                calcExitLongInd2[idx] = calculateIndicator({...rule.ind2, params: extractParams(rule.ind2, null)}, cachedData);
            });
        }

        const calcExitShortInd1 = []; const calcExitShortInd2 = [];
        if (exitShortRules.length > 0) {
            exitShortRules.forEach((rule, idx) => {
                calcExitShortInd1[idx] = calculateIndicator({...rule.ind1, params: extractParams(rule.ind1, rule.params)}, cachedData);
                calcExitShortInd2[idx] = calculateIndicator({...rule.ind2, params: extractParams(rule.ind2, null)}, cachedData);
            });
        }

        let currentEquity = 0, peakEquity = 0, maxDrawdown = 0;
        let winDays = 0, lossDays = 0, winTrades = 0, lossTrades = 0;
        let currentWinStreak = 0, currentLossStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
        let maxProfitTrade = 0, maxLossTrade = 0;
        const equityCurve = []; const daywiseBreakdown = []; let dailyBreakdownMap = {}; 

        let openTrades = []; 
        const strategyLegs = strategy.legs || strategy.data?.legs || [];

        // 🔥 FIX: Robustly map advance features (Database compatibility)
        const advanceFeaturesSettings = strategy.data?.advanceSettings || strategy.advanceSettings || strategy.data?.advanceFeatures || strategy.advanceFeatures || {};
        const riskSettings = strategy.data?.riskManagement || strategy.riskManagement || {};
        const globalMaxProfit = Number(riskSettings.maxProfit) || 0;
        const globalMaxLoss = Number(riskSettings.maxLoss) || 0;
        
        // 🔥 FIX 1: DYNAMIC SQUARE-OFF TIME (UI se padhna)
        const sqTime = strategy.config?.squareOff || strategy.data?.config?.squareOff || strategy.config?.squareOffTime || strategy.data?.config?.squareOffTime || "03:15 PM";
        let exitMin = 915; // default 15:15
        if (sqTime) {
            const [eh, emStr] = sqTime.split(':');
            if (emStr) {
                const em = emStr.split(' ')[0];
                let h = parseInt(eh);
                if (sqTime.toUpperCase().includes('PM') && h !== 12) h += 12;
                exitMin = h * 60 + parseInt(em);
            }
        }
        
        let isTradingHaltedForDay = false; 
        let currentDayTracker = ""; 

        const calculateATM = (spotPrice, symbolStr) => {
            if(symbolStr.includes("BANK")) return Math.round(spotPrice / 100) * 100;
            return Math.round(spotPrice / 50) * 50;
        };

        const calcTradePnL = (entryP, exitP, qty, action) => {
            if(action === "BUY") return (exitP - entryP) * qty;
            return (entryP - exitP) * qty; 
        };

                // 🔥 NEW: SEBI COMPLIANT DATE CALCULATOR (WITH ORIGINAL UI FORMATTING)
        const getNearestExpiryString = (tradeDateStr, symbolStr, reqExpiry = "WEEKLY") => {
            const d = new Date(tradeDateStr);
            const upSym = symbolStr.toUpperCase();
            let expiryDate = new Date(d);

            // 🔥 SEBI NEW RULE: Ab sabka Expiry TUESDAY (2) ho gaya hai!
            const targetDay = 2; 
            let forceMonthly = false;

            // NIFTY 50 ko chhodkar baki sab (Bank, Fin, Midcap) zabardasti Monthly hain
            if (upSym.includes("BANK") || upSym.includes("FIN") || upSym.includes("MID")) {
                forceMonthly = true;
            }

            const upperReqExpiry = reqExpiry.toUpperCase();
            const isMonthlyRequest = forceMonthly || upperReqExpiry === "MONTHLY";

            if (!isMonthlyRequest) {
                // NIFTY 50 Weekly Logic (Target Day: Tuesday)
                while (expiryDate.getDay() !== targetDay) {
                    expiryDate.setDate(expiryDate.getDate() + 1);
                }
                // Next Weekly Support
                if (upperReqExpiry === "NEXT WEEKLY" || upperReqExpiry === "NEXT WEEK") {
                    expiryDate.setDate(expiryDate.getDate() + 7);
                }
            } else {
                // MONTHLY LOGIC (For Bank/Fin/Midcap, or Nifty Monthly) -> Target Day: Last Tuesday
                const lastDayOfMonth = new Date(expiryDate.getFullYear(), expiryDate.getMonth() + 1, 0);
                expiryDate = new Date(lastDayOfMonth);
                
                // Find the last Tuesday of the month
                while (expiryDate.getDay() !== targetDay) {
                    expiryDate.setDate(expiryDate.getDate() - 1);
                }
                
                // Agar aaj ka din is mahine ki expiry ke BAAD ka hai, to agle mahine ka Last Tuesday lo
                if (d > expiryDate) {
                    const lastDayOfNextMonth = new Date(d.getFullYear(), d.getMonth() + 2, 0);
                    expiryDate = new Date(lastDayOfNextMonth);
                    while (expiryDate.getDay() !== targetDay) {
                        expiryDate.setDate(expiryDate.getDate() - 1);
                    }
                }
            }

            // Date ko format karna (e.g., 28APR26)
            const formattedDate = `${String(expiryDate.getDate()).padStart(2, '0')}${expiryDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()}${String(expiryDate.getFullYear()).slice(-2)}`;
            
            // 🔥 ORIGINAL UI FORMATTING (Aapke purane code se)
            const today = new Date(); 
            today.setHours(0, 0, 0, 0); 
            const expDateForCheck = new Date(expiryDate); 
            expDateForCheck.setHours(0, 0, 0, 0);
            
            return `${(expDateForCheck < today) ? "EXP" : "Upcoming EXP"} ${formattedDate}`; 
        };



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
            }

            if (!dailyBreakdownMap[dateStr]) dailyBreakdownMap[dateStr] = { pnl: 0, trades: 0, tradesList: [], hasTradedTimeBased: false };

            let longSignal = false;
            if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
                let overallResult = null;
                entryConds.longRules.forEach((rule, idx) => {
                    const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
                    const ruleResult = evaluateCondition(
                        calcLongInd1[idx] ? calcLongInd1[idx][i] : null, calcLongInd2[idx] ? calcLongInd2[idx][i] : null,
                        (i > 0 && calcLongInd1[idx]) ? calcLongInd1[idx][i-1] : null, (i > 0 && calcLongInd2[idx]) ? calcLongInd2[idx][i-1] : null, operator
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
                        (i > 0 && calcShortInd1[idx]) ? calcShortInd1[idx][i-1] : null, (i > 0 && calcShortInd2[idx]) ? calcShortInd2[idx][i-1] : null, operator
                    );
                    if (idx === 0) overallResult = ruleResult;
                    else {
                        const logicalOp = entryConds.logicalOps[idx - 1]; 
                        overallResult = logicalOp === 'AND' ? (overallResult && ruleResult) : (overallResult || ruleResult);
                    }
                });
                shortSignal = overallResult;
            }

            const isTimeBased = (strategy.config?.strategyType === 'Time Based' || strategy.data?.config?.strategyType === 'Time Based' || strategy.type === 'Time Based');
            
            if (isTimeBased) {
                const sTime = strategy.startTime || strategy.config?.startTime || strategy.data?.config?.startTime || strategy.entrySettings?.startTime || strategy.data?.entrySettings?.startTime;
                
                if (sTime) {
                    const [sh, sm] = sTime.split(':');
                    let startMin = parseInt(sh) * 60 + parseInt(sm.split(' ')[0]);
                    if (sTime.toUpperCase().includes('PM') && parseInt(sh) !== 12) startMin += 720;
                    
                    if (timeInMinutes >= startMin && !dailyBreakdownMap[dateStr].hasTradedTimeBased) {
                        longSignal = true; 
                        dailyBreakdownMap[dateStr].hasTradedTimeBased = true; 
                    }
                }
            }

            const txnType = strategy.config?.transactionType || strategy.data?.config?.transactionType || 'Both Side';
            const finalLongSignal = (txnType === 'Both Side' || txnType === 'Only Long' || isTimeBased) ? longSignal : false;
            const finalShortSignal = (txnType === 'Both Side' || txnType === 'Only Short') ? shortSignal : false;

            let exitLongSignal = false;
            if (exitLongRules.length > 0) {
                let overallResult = null;
                exitLongRules.forEach((rule, idx) => {
                    const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
                    const ruleResult = evaluateCondition(
                        calcExitLongInd1[idx] ? calcExitLongInd1[idx][i] : null, calcExitLongInd2[idx] ? calcExitLongInd2[idx][i] : null,
                        (i > 0 && calcExitLongInd1[idx]) ? calcExitLongInd1[idx][i-1] : null, (i > 0 && calcExitLongInd2[idx]) ? calcExitLongInd2[idx][i-1] : null, operator
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
                        (i > 0 && calcExitShortInd1[idx]) ? calcExitShortInd1[idx][i-1] : null, (i > 0 && calcExitShortInd2[idx]) ? calcExitShortInd2[idx][i-1] : null, operator
                    );
                    if (idx === 0) overallResult = ruleResult;
                    else {
                        const logicalOp = exitConds.logicalOpsShort ? exitConds.logicalOpsShort[idx - 1] : 'AND'; 
                        overallResult = logicalOp === 'AND' ? (overallResult && ruleResult) : (overallResult || ruleResult);
                    }
                });
                exitShortSignal = overallResult;
            }

            // Using the dynamic exitMin defined earlier
            const isMarketOpen = timeInMinutes >= 555 && timeInMinutes < exitMin; 
            const isExitTime = timeInMinutes >= exitMin; 
            let isLastCandleOfDay = false;
            if (i === cachedData.length - 1) isLastCandleOfDay = true;
            else {
                const nextCandleIst = new Date(new Date(cachedData[i+1].timestamp).getTime() + (5.5 * 60 * 60 * 1000));
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
                    let currentOpen = spotClosePrice; // Extracted for Time-Squareoff

                    if (isOptionsTrade && trade.premiumChart && trade.premiumChart.start_Time) {
                        let exactMatchIndex = trade.premiumChart.start_Time.findIndex(t => {
                            const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
                            return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
                        });
                        
                        // 🔥 FIX 2: GHOST CANDLE VOLATILITY FIX (Bawandar Fix)
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
                                    // Flatline logic
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
                


                // 🔥 FIX 3: MOVE SL TO COST TRACKERS
                let anyLegHitSlPast = dailyBreakdownMap[dateStr].tradesList.some(t => t.exitType === "STOPLOSS" || t.exitType === "SL_MOVED_TO_COST");
                let anyLegHitSlThisTick = false;

                // 🚀 ROLLBACK: Wapas forEach loop me aa gaye (No API Spam, Fast Speed)
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
                    if (advanceFeaturesSettings.moveSLToCost && (anyLegHitSlPast || anyLegHitSlThisTick)) {
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

                    // =========================================================================
                    // 🚀🚀🚀 SUNIL BHAI'S MASTER IDEA: THE SPOT-DELTA TRACKER 🚀🚀🚀
                    // (Option Rolling Chart ka Lag khatam karne ke liye Spot Chart se tracking)
                    // =========================================================================
                    let spotTriggeredSl = false;
                    let spotTriggeredTp = false;

                    // Hum sirf tabhi spot tracker use karenge jab SL move na hua ho. 
                    // Move to cost ke liye purana logic hi best hai, CE wala trade safe rahega.
                    if (isOptionsTrade && trade.optionConfig) {
                        const optType = trade.optionConfig.type; // CE ya PE
                        const entrySpot = trade.optionConfig.strike; // Strike ko hi Base Spot manenge

                        // Aapka Idea: "30 Rs ka Option Gap = 60 point Spot Gap" -> Yani Delta = 0.5
                        const assumedDelta = 0.5; 
                        const slGap = Math.abs(slPrice - trade.entryPrice);
                        const tpGap = Math.abs(tpPrice - trade.entryPrice);
                        
                        // Option gap ko Spot points me convert kiya (e.g., 30 / 0.5 = 60 points)
                        const reqSpotMoveSl = slGap / assumedDelta;
                        const reqSpotMoveTp = tpGap / assumedDelta;

                        if (trade.transaction === "BUY") {
                            if (optType === "CE") {
                                if (slValue > 0 && spotClosePrice <= entrySpot - reqSpotMoveSl) spotTriggeredSl = true;
                                if (tpValue > 0 && spotClosePrice >= entrySpot + reqSpotMoveTp) spotTriggeredTp = true;
                            } else { // PE BUY
                                if (slValue > 0 && spotClosePrice >= entrySpot + reqSpotMoveSl) spotTriggeredSl = true;
                                if (tpValue > 0 && spotClosePrice <= entrySpot - reqSpotMoveTp) spotTriggeredTp = true;
                            }
                        } else { // SELL Trade (Aapka PE Sell scenario)
                            if (optType === "CE") {
                                if (slValue > 0 && spotClosePrice >= entrySpot + reqSpotMoveSl) spotTriggeredSl = true;
                                if (tpValue > 0 && spotClosePrice <= entrySpot - reqSpotMoveTp) spotTriggeredTp = true;
                            } else { // PE SELL
                                // PE Sell me SL tab hit hoga jab market girega (Spot niche jayega)
                                if (slValue > 0 && spotClosePrice <= entrySpot - reqSpotMoveSl) spotTriggeredSl = true;
                                if (tpValue > 0 && spotClosePrice >= entrySpot + reqSpotMoveTp) spotTriggeredTp = true;
                            }
                        }
                    }
                    // =========================================================================

                    // 🛡️ AB ENGINE NORMAL KAAM KAREGA, PAR "SPOT-TIMING" KI TAQAT KE SATH!
                    if ((!isSlMovedToCost && slValue > 0) || isSlMovedToCost) {
                        // Agar aapke Spot Tracker ne SL pakda OR Rolling chart ne (Dono me se jo pehle ho)
                        if (spotTriggeredSl || (trade.transaction === "BUY" && trade.currentLow <= slPrice) || (trade.transaction === "SELL" && trade.currentHigh >= slPrice)) {
                            trade.markedForExit = true; 
                            trade.exitReason = isSlMovedToCost ? "SL_MOVED_TO_COST" : "STOPLOSS"; 
                            trade.exitPrice = slPrice;
                            triggerReasonForExitAll = "STOPLOSS";
                            anyLegHitSlThisTick = true; 
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

                // let remainingTrades = [];
                // openTrades.forEach(trade => {
                //     if (trade.markedForExit || isExitTime || isLastCandleOfDay) {
                //         if (!trade.markedForExit) {
                //             trade.exitReason = isLastCandleOfDay ? "EOD_SQUAREOFF" : "TIME_SQUAREOFF";
                //             // 🔥 THE DOT-TO-DOT FIX: Square-Off time par EXACT Open price uthao!
                //             trade.exitPrice = trade.exitReason === "TIME_SQUAREOFF" ? trade.currentOpen : trade.currentPrice;
                //         }

                //         const pnl = calcTradePnL(trade.entryPrice, trade.exitPrice, trade.quantity, trade.transaction);
                        
                //         const completedTrade = {
                //             ...trade,
                //             exitTime: `${h}:${m}:00`,
                //             pnl: pnl,
                //             exitType: trade.exitReason
                //         };
                        
                //         dailyBreakdownMap[dateStr].tradesList.push(completedTrade);
                //         dailyBreakdownMap[dateStr].pnl += pnl;
                //         dailyBreakdownMap[dateStr].trades += 1;
                //         if (pnl > 0) { winTrades++; if(pnl > maxProfitTrade) maxProfitTrade = pnl; } 
                //         else { lossTrades++; if(pnl < maxLossTrade) maxLossTrade = pnl; }
                        
                //         console.log(`🎯 [${completedTrade.exitType}] Date: ${dateStr} | Symbol: ${trade.symbol} | Exit: ${trade.exitPrice.toFixed(2)} | PnL: ${pnl.toFixed(2)}`);
                //     } else {
                //         remainingTrades.push(trade); 
                //     }
                // });

                // openTrades = remainingTrades; 

                let remainingTrades = [];
                for (let trade of openTrades) {
                    if (trade.markedForExit || isExitTime || isLastCandleOfDay) {
                        if (!trade.markedForExit) {
                            trade.exitReason = isLastCandleOfDay ? "EOD_SQUAREOFF" : "TIME_SQUAREOFF";
                        }

                        // =========================================================================
                        // 🔴 THE SNIPER INJECTION (FOOLPROOF VERSION) 🔴
                        // =========================================================================
                        // Is list me "SL_MOVED_TO_COST" add kar diya gaya hai!
                        const needsMarketPrice = ["TIME_SQUAREOFF", "EOD_SQUAREOFF", "INDICATOR_EXIT", "MAX_PROFIT", "MAX_LOSS", "EXIT_ALL_TGT", "EXIT_ALL_SL", "STOPLOSS", "TARGET", "TRAILING_SL", "SL_MOVED_TO_COST"].includes(trade.exitReason);
                        
                        if (isOptionsTrade && broker && needsMarketPrice && trade.optionConfig) {
                            const fixedStrike = trade.optionConfig.strike;
                            const optType = trade.optionConfig.type; 
                            const exitTimeStr = `${h}:${m}`;

                            // 🔥 Sniper ab har haal me chalega! Koi if(shift) ki shart nahi!
                            console.log(`\n🔬 [EXIT SNIPER] Trigger at ${exitTimeStr} for ${trade.exitReason}. Fetching exact Close/Open for ${fixedStrike}...`);
                            
                            const axios = require('axios'); 
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

                            // "ATM" ko bhi list me dal diya taki agar shift na hua ho to bhi API data de!
                            const candidates = ["ATM", "ITM-1", "OTM-1", "-ITM1", "-OTM1", "-1", "-2", "-3", "ITM1", "ITM2", "ITM3", "OTM1", "OTM2", "OTM3", "ITM 1", "OTM 1"];
                            let foundExactExit = false;
                            
                            for(let guess of candidates) {
                                try {
                                    const exitRes = await axios.post('https://api.dhan.co/v2/charts/rollingoption', { ...basePayload, strike: guess }, {
                                        headers: { 'access-token': broker.apiSecret, 'client-id': broker.clientId, 'Content-Type': 'application/json' }
                                    });
                                    const optKey = optType === "CE" ? "ce" : "pe";
                                    let exitData = exitRes.data.data ? exitRes.data.data[optKey] : null;

                                    if (exitData && exitData.timestamp) {
                                        let actualExitIndex = -1;
                                        for(let k=0; k<exitData.timestamp.length; k++){
                                            const optTime = new Date(exitData.timestamp[k] * 1000 + (5.5 * 3600000));
                                            if(optTime.toISOString().split('T')[1].substring(0, 5) === exitTimeStr) { actualExitIndex = k; break; }
                                        }
                                        
                                        if(actualExitIndex !== -1 && exitData.strike && exitData.strike[actualExitIndex] === fixedStrike) {
                                            console.log(`✅ [SNIPER BINGO] Dhan mapped ${fixedStrike} to [ ${guess} ] at ${exitTimeStr}!`);
                                            
                                            const mathPrice = trade.exitPrice; // Original calculated price
                                            const cOpen = exitData.open[actualExitIndex];
                                            const cClose = exitData.close[actualExitIndex];

                                            // 🚀 STRICT OVERWRITE TO CLOSE PRICE (Conservative Slippage)
                                            if (["STOPLOSS", "TARGET", "TRAILING_SL", "SL_MOVED_TO_COST"].includes(trade.exitReason)) {
                                                if (trade.transaction === "BUY") {
                                                    if (["STOPLOSS", "TRAILING_SL", "SL_MOVED_TO_COST"].includes(trade.exitReason) && cOpen < mathPrice) trade.exitPrice = cOpen;
                                                    else if (trade.exitReason === "TARGET" && cOpen > mathPrice) trade.exitPrice = cOpen;
                                                    else trade.exitPrice = cClose; // FORCE OVERWRITE TO CLOSE PRICE!
                                                } else { // SELL Trade
                                                    if (["STOPLOSS", "TRAILING_SL", "SL_MOVED_TO_COST"].includes(trade.exitReason) && cOpen > mathPrice) trade.exitPrice = cOpen;
                                                    else if (trade.exitReason === "TARGET" && cOpen < mathPrice) trade.exitPrice = cOpen;
                                                    else trade.exitPrice = cClose; // FORCE OVERWRITE TO CLOSE PRICE!
                                                }
                                            } else {
                                                trade.exitPrice = trade.exitReason === "TIME_SQUAREOFF" ? cOpen : cClose;
                                            }
                                            
                                            foundExactExit = true;
                                            break;
                                        }
                                    }
                                } catch(e) { }
                            }
                            
                            if (!foundExactExit) {
                                console.log(`❌ [SNIPER FAILED] Could not find ${fixedStrike} at ${exitTimeStr}. Using fallback.`);
                                if (!trade.exitPrice) trade.exitPrice = trade.exitReason === "TIME_SQUAREOFF" ? trade.currentOpen : trade.currentPrice;
                            }
                        } else {
                            if (!trade.exitPrice) trade.exitPrice = trade.exitReason === "TIME_SQUAREOFF" ? trade.currentOpen : trade.currentPrice;
                        }
                        // =========================================================================

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
                        if (pnl > 0) { winTrades++; if(pnl > maxProfitTrade) maxProfitTrade = pnl; } 
                        else { lossTrades++; if(pnl < maxLossTrade) maxLossTrade = pnl; }
                        
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
            // 🔥 2. MULTI-LEG ENTRY LOGIC (THE SMART ROUTER)
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

                    if(isOptionsTrade && broker) {
                        let apiSuccess = false;

                        // 🔥 EXTRACT EXPECTED DATE (e.g., "28 APR") TO VERIFY LIVE ID
                        const targetExpStr = expiryLabel.split('EXP ')[1]; // "28APR26"
                        const expectedDay = targetExpStr.substring(0, 2); // "28"
                        const expectedMonth = targetExpStr.substring(2, 5); // "APR"
                        const expectedDhanDateStr = `${expectedDay} ${expectedMonth}`; // "28 APR"

                        // 🟢 STEP 1: SMART LIVE API CHECK (For Fixed Strike Accuracy)
                        const optionConfig = getOptionSecurityId(upperSymbol, spotClosePrice, strikeCriteria, strikeType, activeOptionType, reqExpiry);
                        
                        // Check if Live ID exists AND it matches our required historical date!
                        if (optionConfig && optionConfig.strike && optionConfig.tradingSymbol.includes(expectedDhanDateStr)) {
                            targetStrike = optionConfig.strike;
                            // UI text ko sundar rakhne ke liye tradeSymbol overwrite nahi karenge
                            try {
                                await sleep(500); 
                                const optRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, optionConfig.id, "NSE_FNO", "OPTIDX", dateStr, dateStr, "1");
                                if(optRes.success && optRes.data && optRes.data.close) {
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
                            } catch(e) { }
                        }

                        // 🔴 STEP 2: FALLBACK TO ROLLING API (Only for deleted/expired Weekly contracts)
                        if (!apiSuccess) {
                            try {
                                await sleep(500);
                                const formattedStrikeForRolling = strikeType.replace(/\s+/g, '').toUpperCase(); 
                                const expRes = await fetchExpiredOptionData(broker.clientId, broker.apiSecret, spotSecurityId, formattedStrikeForRolling, activeOptionType, dateStr, dateStr, reqExpiry);
                                
                                if(expRes.success && expRes.data && expRes.data.close) {
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
                            } catch(e) { }
                        }

                        // Strict Validation
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

        for (const [date, data] of Object.entries(dailyBreakdownMap)) {
            currentEquity += data.pnl;
            if (currentEquity > peakEquity) peakEquity = currentEquity;
            const drawdown = currentEquity - peakEquity;
            if (drawdown < maxDrawdown) maxDrawdown = drawdown;

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
                totalPnL: currentEquity, maxDrawdown, tradingDays: totalMarketDays, winDays, lossDays, 
                totalTrades: winTrades + lossTrades, winTrades, lossTrades, maxWinStreak, maxLossStreak, 
                maxProfit: maxProfitTrade, maxLoss: maxLossTrade 
            },
            equityCurve, 
            daywiseBreakdown: daywiseBreakdown.reverse()
        };

        return res.status(200).json({ success: true, data: backtestResult });

    } catch (error) {
        console.error("Backtest Error:", error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
};

module.exports = { runBacktestSimulator };


