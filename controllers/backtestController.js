

// const mongoose = require('mongoose'); 
// const Strategy = require('../models/Strategy');
// const HistoricalData = require('../models/HistoricalData');
// const Broker = require('../models/Broker');
// // const { fetchDhanHistoricalData } = require('../services/dhanService');
// const { SMA, EMA, RSI, MACD, BollingerBands, ATR } = require('technicalindicators');
// const { getOptionSecurityId } = require('../services/instrumentService');

// const { fetchDhanHistoricalData, fetchExpiredOptionData } = require('../services/dhanService');

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
        
//         let timeframe = strategy.interval ? strategy.interval.replace(' min', '') : "5"; 
        
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

//         const calculateIndicator = (indConfig, candles) => {
//             if (!indConfig || !indConfig.id) return null;
//             const indId = indConfig.id.trim().toLowerCase();
//             if (indId === 'number' || indId === 'static') {
//                 const staticVal = Number(indConfig.value) || Number(indConfig.params?.Value) || Number(indConfig.params?.value) || 0;
//                 return candles.map(() => staticVal);
//             }
//             const closePrices = candles.map(c => parseFloat(c.close) || 0);
//             let results = [];
//             try {
//                 if (indId === 'candle') return closePrices;
//                 if (indId === 'sma') results = SMA.calculate({ period: Number(indConfig.params?.Period) || Number(indConfig.params?.period) || 14, values: closePrices });
//                 else if (indId === 'ema') results = EMA.calculate({ period: Number(indConfig.params?.Period) || Number(indConfig.params?.period) || 9, values: closePrices });
//                 else if (indId === 'rsi') results = RSI.calculate({ period: Number(indConfig.params?.Period) || Number(indConfig.params?.period) || 14, values: closePrices });
                
//                 if (results.length > 0) {
//                     const padding = Array(candles.length - results.length).fill(null);
//                     return [...padding, ...results];
//                 }
//                 return Array(candles.length).fill(null);
//             } catch (error) { return Array(candles.length).fill(null); }
//         };

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

//         const extractParams = (ruleInd, fallbackParams) => {
//             let p = ruleInd?.params || fallbackParams || {};
//             if (!p.Period && ruleInd?.display) {
//                 const match = ruleInd.display.match(/\((\d+)/);
//                 if (match) p.Period = Number(match[1]);
//             }
//             return p;
//         };

//         const calcLongInd1 = []; const calcLongInd2 = [];
//         if (entryConds && entryConds.longRules) {
//             entryConds.longRules.forEach((rule, idx) => {
//                 const params1 = extractParams(rule.ind1, rule.params);
//                 calcLongInd1[idx] = calculateIndicator({...rule.ind1, params: params1}, cachedData);
//                 const params2 = extractParams(rule.ind2, null);
//                 calcLongInd2[idx] = calculateIndicator({...rule.ind2, params: params2}, cachedData);
//             });
//         }

//         const evaluateCondition = (val1, val2, prevVal1, prevVal2, operator) => {
//             if (val1 === null || val2 === null) return false;
//             const op = operator?.trim(); 
//             switch(op) {
//                 case 'Greater Than': return val1 > val2;
//                 case 'Less Than': return val1 < val2;
//                 case 'Equals': return val1 === val2;
//                 case 'Crosses Above': return prevVal1 !== null && prevVal2 !== null && prevVal1 <= prevVal2 && val1 > val2; 
//                 case 'Crosses Below': return prevVal1 !== null && prevVal2 !== null && prevVal1 >= prevVal2 && val1 < val2; 
//                 default: return false;
//             }
//         };

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
//         const optionType = legData.optionType === "Put" ? "PE" : "CE";
//         const transactionType = legData.action || "BUY";

//         const calculateATM = (spotPrice, symbolStr) => {
//             if(symbolStr.includes("BANK")) return Math.round(spotPrice / 100) * 100;
//             return Math.round(spotPrice / 50) * 50;
//         };

//         const calcTradePnL = (entryP, exitP, qty, action) => {
//             if(action === "BUY") return (exitP - entryP) * qty;
//             return (entryP - exitP) * qty; 
//         };

//         for (let i = 0; i < cachedData.length; i++) {
//             const candle = cachedData[i];
//             const candleTime = new Date(candle.timestamp).getTime();
//             const istDate = new Date(candleTime + (5.5 * 60 * 60 * 1000));
//             const h = String(istDate.getUTCHours()).padStart(2, '0'); 
//             const m = String(istDate.getUTCMinutes()).padStart(2, '0');
//             const timeInMinutes = (istDate.getUTCHours() * 60) + istDate.getUTCMinutes(); 
//             const dateStr = istDate.toISOString().split('T')[0];

//             if (!dailyBreakdownMap[dateStr]) dailyBreakdownMap[dateStr] = { pnl: 0, trades: 0, tradesList: [] };

//             let longSignal = false;
//             if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
//                 let overallResult = null;
//                 entryConds.longRules.forEach((rule, idx) => {
//                     const val1 = calcLongInd1[idx] ? calcLongInd1[idx][i] : null;
//                     const val2 = calcLongInd2[idx] ? calcLongInd2[idx][i] : null;
//                     const prevVal1 = (i > 0 && calcLongInd1[idx]) ? calcLongInd1[idx][i-1] : null;
//                     const prevVal2 = (i > 0 && calcLongInd2[idx]) ? calcLongInd2[idx][i-1] : null;

//                     const operator = rule.op || rule.params?.op || rule.ind1?.params?.op;
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

//             const isMarketOpen = timeInMinutes >= 555 && timeInMinutes < 915; 
//             const isExitTime = timeInMinutes >= 915; 
//             let isLastCandleOfDay = false;
//             if (i === cachedData.length - 1) isLastCandleOfDay = true;
//             else {
//                 const nextCandleIst = new Date(new Date(cachedData[i+1].timestamp).getTime() + (5.5 * 60 * 60 * 1000));
//                 if (nextCandleIst.toISOString().split('T')[0] !== dateStr) isLastCandleOfDay = true;
//             }

//             const spotClosePrice = parseFloat(candle.close);

//             // --------------------------------------------------------
//             // 🚦 TRANSACTION TYPE FILTER LOGIC
//             // --------------------------------------------------------
//             // Strategy Config se Transaction Type nikalna (Default: Both Side)
//             const txnType = strategy.config?.transactionType || 'Both Side';

//             // Signal ko filter karna based on UI selection
//             const finalLongSignal = (txnType === 'Both Side' || txnType === 'Only Long') ? longSignal : false;
//             const finalShortSignal = (txnType === 'Both Side' || txnType === 'Only Short') ? shortSignal : false;


//             // 🟢 TAKE TRADE (ENTRY)
//             // Ab hum 'longSignal' ki jagah final filtered signals check karenge
//             if (!isPositionOpen && isMarketOpen && (finalLongSignal || finalShortSignal)) {
                
//                 // 🔥 DYNAMIC OPTION TYPE DECISION 🔥
//                 // Agar Long Signal aaya hai to CE kharidenge, Short aaya hai to PE
//                 const activeOptionType = finalLongSignal ? "CE" : "PE";
                
//                 let tradeSymbol = upperSymbol;
//                 let finalEntryPrice = spotClosePrice;
//                 let validTrade = true;

//                 if(isOptionsTrade && broker) {
//                     const targetStrike = calculateATM(spotClosePrice, upperSymbol);
//                     let apiSuccess = false;
                    
//                     // 1. Try Standard API (For active/recent contracts)
//                     const optionConfig = getOptionSecurityId(upperSymbol, targetStrike, activeOptionType);
//                     if(optionConfig) {
//                         try {
//                             const optRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, optionConfig.id, "NSE_FNO", "OPTIDX", dateStr, dateStr, "1");
//                             if(optRes.success && optRes.data && optRes.data.close) {
//                                 const exactMatchIndex = optRes.data.start_Time.findIndex(t => {
//                                     const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                                     return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                                 });
//                                 finalEntryPrice = exactMatchIndex !== -1 ? optRes.data.close[exactMatchIndex] : optRes.data.close[0];
//                                 tradeSymbol = optionConfig.tradingSymbol;
//                                 apiSuccess = true;
//                             } 
//                         } catch(e) { }
//                     } 
                    
//                     // 2. If Standard API fails (DH-905), use Expired Options API
//                     if (!apiSuccess) {
//                         console.log(`⚠️ Standard API Failed. Trying Expired Options API for: ${upperSymbol} ${targetStrike} ${activeOptionType}`);
//                         try {
//                             const expRes = await fetchExpiredOptionData(broker.clientId, broker.apiSecret, spotSecurityId, targetStrike, activeOptionType, dateStr, dateStr);
//                             if(expRes.success && expRes.data && expRes.data.close) {
//                                 const exactMatchIndex = expRes.data.start_Time.findIndex(t => {
//                                     const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                                     return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                                 });
//                                 finalEntryPrice = exactMatchIndex !== -1 ? expRes.data.close[exactMatchIndex] : expRes.data.close[0];
//                                 tradeSymbol = `${upperSymbol} ${targetStrike} ${activeOptionType} (EXP)`; 
//                                 apiSuccess = true;
//                             }
//                         } catch(e) { }
//                     }

//                     if (!apiSuccess) {
//                         validTrade = false;
//                         console.log(`❌ Trade Canceled: Real Premium Data not available in any API for ${upperSymbol} ${targetStrike} ${activeOptionType}`);
//                     }
//                 }

//                 if (validTrade) {
//                     isPositionOpen = true;
//                     currentTrade = {
//                         symbol: tradeSymbol, transaction: transactionType, quantity: tradeQuantity,
//                         entryTime: `${h}:${m}:00`, entryPrice: finalEntryPrice,
//                         exitTime: null, exitPrice: null, pnl: null, exitType: null,
//                         optionConfig: isOptionsTrade ? { strike: calculateATM(spotClosePrice, upperSymbol), type: activeOptionType } : null,
//                         signalType: finalLongSignal ? "LONG" : "SHORT" // Store for debugging
//                     };
//                     console.log(`✅ [TRADE OPEN] Date: ${dateStr} | Time: ${h}:${m} | Spot: ${spotClosePrice} | Premium: ${finalEntryPrice} | Type: ${activeOptionType}`);
//                 }
//             }

//             // 🔴 EXIT TRADE (EXIT)
//             if (isPositionOpen && (isExitTime || isLastCandleOfDay)) {
//                 isPositionOpen = false;
//                 let finalExitPrice = spotClosePrice;

//                 if(isOptionsTrade && currentTrade.optionConfig && broker) {
//                     let apiSuccess = false;
//                     const targetStrike = currentTrade.optionConfig.strike;
                    
//                     // 1. Try Standard API
//                     const optionConfig = getOptionSecurityId(upperSymbol, targetStrike, currentTrade.optionConfig.type);
//                     if(optionConfig) {
//                         try {
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

//                     // 2. 🔥 THE MASTERSTROKE: If Standard API fails, use Expired Options API
//                     if (!apiSuccess) {
//                         try {
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
//                         // Agar dhan ka server hi down hai, to trade 0 PnL par kaat do (loss se bachne ke liye)
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
//         // 5. DAILY LOOP (UI Format Conversion & Metrics)
//         // ==========================================
        
//         // 🔥 FIX 1: Market jitne din khula tha, wo total days nikal liye
//         let totalMarketDays = Object.keys(dailyBreakdownMap).length;

//         for (const [date, data] of Object.entries(dailyBreakdownMap)) {
//             // 🔥 FIX 2: Humne 'if (data.trades > 0)' wali condition hata di
//             // Taaki jis din trade nahi hua, wo din bhi Trading Days aur Equity me count ho!

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
//                 // Neutral Day (0 PnL ya 0 Trades) - yaha streak break ho jayegi
//                 currentWinStreak = 0; currentLossStreak = 0;
//             }

//             equityCurve.push({ date, pnl: currentEquity });
            
//             // Ye table me "0 Trades Executed" wala din bhi show karega, jo transparency ke liye best hai
//             daywiseBreakdown.push({ date, dailyPnL: data.pnl, tradesTaken: data.trades, tradesList: data.tradesList });
//         }

//         const backtestResult = {
//             summary: { 
//                 totalPnL: currentEquity, 
//                 maxDrawdown, 
//                 tradingDays: totalMarketDays, // 🔥 FIX 3: Ab ye real Market Open Days dikhayega
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
// const { SMA, EMA, RSI, MACD, BollingerBands, ATR } = require('technicalindicators');
// const { getOptionSecurityId } = require('../services/instrumentService');

// const { fetchDhanHistoricalData, fetchExpiredOptionData } = require('../services/dhanService');

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
        
//         let timeframe = strategy.interval ? strategy.interval.replace(' min', '') : "5"; 
        
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

//         const calculateIndicator = (indConfig, candles) => {
//             if (!indConfig || !indConfig.id) return null;
//             const indId = indConfig.id.trim().toLowerCase();
//             if (indId === 'number' || indId === 'static') {
//                 const staticVal = Number(indConfig.value) || Number(indConfig.params?.Value) || Number(indConfig.params?.value) || 0;
//                 return candles.map(() => staticVal);
//             }
//             const closePrices = candles.map(c => parseFloat(c.close) || 0);
//             let results = [];
//             try {
//                 if (indId === 'candle') return closePrices;
//                 if (indId === 'sma') results = SMA.calculate({ period: Number(indConfig.params?.Period) || Number(indConfig.params?.period) || 14, values: closePrices });
//                 else if (indId === 'ema') results = EMA.calculate({ period: Number(indConfig.params?.Period) || Number(indConfig.params?.period) || 9, values: closePrices });
//                 else if (indId === 'rsi') results = RSI.calculate({ period: Number(indConfig.params?.Period) || Number(indConfig.params?.period) || 14, values: closePrices });
                
//                 if (results.length > 0) {
//                     const padding = Array(candles.length - results.length).fill(null);
//                     return [...padding, ...results];
//                 }
//                 return Array(candles.length).fill(null);
//             } catch (error) { return Array(candles.length).fill(null); }
//         };

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

//         const extractParams = (ruleInd, fallbackParams) => {
//             let p = ruleInd?.params || fallbackParams || {};
//             if (!p.Period && ruleInd?.display) {
//                 const match = ruleInd.display.match(/\((\d+)/);
//                 if (match) p.Period = Number(match[1]);
//             }
//             return p;
//         };

//         // =========================================================
//         // 📊 PRE-CALCULATE INDICATORS (LONG & SHORT)
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

//         const evaluateCondition = (val1, val2, prevVal1, prevVal2, operator) => {
//             if (val1 === null || val2 === null) return false;
//             const op = operator?.trim(); 
//             switch(op) {
//                 case 'Greater Than': return val1 > val2;
//                 case 'Less Than': return val1 < val2;
//                 case 'Equals': return val1 === val2;
//                 case 'Crosses Above': return prevVal1 !== null && prevVal2 !== null && prevVal1 <= prevVal2 && val1 > val2; 
//                 case 'Crosses Below': return prevVal1 !== null && prevVal2 !== null && prevVal1 >= prevVal2 && val1 < val2; 
//                 default: return false;
//             }
//         };

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

//         const calculateATM = (spotPrice, symbolStr) => {
//             if(symbolStr.includes("BANK")) return Math.round(spotPrice / 100) * 100;
//             return Math.round(spotPrice / 50) * 50;
//         };

//         const calcTradePnL = (entryP, exitP, qty, action) => {
//             if(action === "BUY") return (exitP - entryP) * qty;
//             return (entryP - exitP) * qty; 
//         };

//         // =========================================================
//         // 🔄 MAIN BACKTEST LOOP
//         // =========================================================
//         for (let i = 0; i < cachedData.length; i++) {
//             const candle = cachedData[i];
//             const candleTime = new Date(candle.timestamp).getTime();
//             const istDate = new Date(candleTime + (5.5 * 60 * 60 * 1000));
//             const h = String(istDate.getUTCHours()).padStart(2, '0'); 
//             const m = String(istDate.getUTCMinutes()).padStart(2, '0');
//             const timeInMinutes = (istDate.getUTCHours() * 60) + istDate.getUTCMinutes(); 
//             const dateStr = istDate.toISOString().split('T')[0];

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

//                     const operator = rule.op || rule.params?.op || rule.ind1?.params?.op;
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

//                     const operator = rule.op || rule.params?.op || rule.ind1?.params?.op;
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

//             const isMarketOpen = timeInMinutes >= 555 && timeInMinutes < 915; 
//             const isExitTime = timeInMinutes >= 915; 
//             let isLastCandleOfDay = false;
//             if (i === cachedData.length - 1) isLastCandleOfDay = true;
//             else {
//                 const nextCandleIst = new Date(new Date(cachedData[i+1].timestamp).getTime() + (5.5 * 60 * 60 * 1000));
//                 if (nextCandleIst.toISOString().split('T')[0] !== dateStr) isLastCandleOfDay = true;
//             }

//             const spotClosePrice = parseFloat(candle.close);

//             // --------------------------------------------------------
//             // 🚦 TRANSACTION TYPE FILTER LOGIC
//             // --------------------------------------------------------
//             const txnType = strategy.config?.transactionType || strategy.data?.config?.transactionType || 'Both Side';
//             const finalLongSignal = (txnType === 'Both Side' || txnType === 'Only Long') ? longSignal : false;
//             const finalShortSignal = (txnType === 'Both Side' || txnType === 'Only Short') ? shortSignal : false;

//             // =========================================================
//             // 🛑 M2M RISK CHECK (SL & TP Check per candle)
//             // =========================================================
//             if (isPositionOpen && currentTrade) {
//                 let hitSL = false;
//                 let hitTP = false;
//                 let exitPrice = 0;

//                 const slValue = legData.slValue || 0;
//                 const slPrice = currentTrade.entryPrice * (1 - slValue / 100);
                
//                 const tpValue = legData.tpValue || 0;
//                 const tpPrice = currentTrade.entryPrice * (1 + tpValue / 100);

//                 if (slValue > 0 && currentTrade.entryPrice > 0) {
//                     if (currentTrade.transaction === "BUY" && spotClosePrice <= slPrice) {
//                         hitSL = true;
//                         exitPrice = slPrice;
//                     }
//                 }

//                 if (tpValue > 0 && currentTrade.entryPrice > 0) {
//                     if (currentTrade.transaction === "BUY" && spotClosePrice >= tpPrice) {
//                         hitTP = true;
//                         exitPrice = tpPrice;
//                     }
//                 }

//                 if (hitSL || hitTP) {
//                     isPositionOpen = false;
//                     const pnl = calcTradePnL(currentTrade.entryPrice, exitPrice, tradeQuantity, currentTrade.transaction);

//                     currentTrade.exitTime = `${h}:${m}:00`;
//                     currentTrade.exitPrice = exitPrice;
//                     currentTrade.pnl = pnl;
//                     currentTrade.exitType = hitSL ? "STOPLOSS" : "TARGET";
                    
//                     dailyBreakdownMap[dateStr].tradesList.push(currentTrade);
//                     dailyBreakdownMap[dateStr].pnl += pnl;
//                     dailyBreakdownMap[dateStr].trades += 1;
                    
//                     if (pnl > 0) { winTrades++; if (pnl > maxProfitTrade) maxProfitTrade = pnl; } 
//                     else { lossTrades++; if (pnl < maxLossTrade) maxLossTrade = pnl; }
                    
//                     console.log(`🎯 [${currentTrade.exitType}] Date: ${dateStr} | Premium: ${exitPrice.toFixed(2)} | PnL: ${pnl.toFixed(2)}`);
//                     currentTrade = null; 
//                     continue; // Is candle ka kaam khatam, aage badho
//                 }
//             }

//             // =========================================================
//             // 🟢 TAKE TRADE (ENTRY)
//             // =========================================================
//             if (!isPositionOpen && isMarketOpen && (finalLongSignal || finalShortSignal)) {
                
//                 const activeOptionType = finalLongSignal ? "CE" : "PE";
                
//                 let tradeSymbol = upperSymbol;
//                 let finalEntryPrice = spotClosePrice;
//                 let validTrade = true;

//                 if(isOptionsTrade && broker) {
//                     const targetStrike = calculateATM(spotClosePrice, upperSymbol);
//                     let apiSuccess = false;
                    
//                     // 1. Standard API
//                     const optionConfig = getOptionSecurityId(upperSymbol, targetStrike, activeOptionType);
//                     if(optionConfig) {
//                         try {
//                             const optRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, optionConfig.id, "NSE_FNO", "OPTIDX", dateStr, dateStr, "1");
//                             if(optRes.success && optRes.data && optRes.data.close) {
//                                 const exactMatchIndex = optRes.data.start_Time.findIndex(t => {
//                                     const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                                     return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                                 });
//                                 finalEntryPrice = exactMatchIndex !== -1 ? optRes.data.close[exactMatchIndex] : optRes.data.close[0];
//                                 tradeSymbol = optionConfig.tradingSymbol;
//                                 apiSuccess = true;
//                             } 
//                         } catch(e) { }
//                     } 
                    
//                     // 2. Expired API
//                     if (!apiSuccess) {
//                         console.log(`⚠️ Standard API Failed. Trying Expired Options API for: ${upperSymbol} ${targetStrike} ${activeOptionType}`);
//                         try {
//                             const expRes = await fetchExpiredOptionData(broker.clientId, broker.apiSecret, spotSecurityId, targetStrike, activeOptionType, dateStr, dateStr);
//                             if(expRes.success && expRes.data && expRes.data.close) {
//                                 const exactMatchIndex = expRes.data.start_Time.findIndex(t => {
//                                     const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                                     return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                                 });
//                                 finalEntryPrice = exactMatchIndex !== -1 ? expRes.data.close[exactMatchIndex] : expRes.data.close[0];
//                                 tradeSymbol = `${upperSymbol} ${targetStrike} ${activeOptionType} (EXP)`; 
//                                 apiSuccess = true;
//                             }
//                         } catch(e) { }
//                     }

//                     if (!apiSuccess) {
//                         validTrade = false;
//                         console.log(`❌ Trade Canceled: Real Premium Data not available in any API for ${upperSymbol} ${targetStrike} ${activeOptionType}`);
//                     }
//                 }

//                 if (validTrade) {
//                     isPositionOpen = true;
//                     currentTrade = {
//                         symbol: tradeSymbol, transaction: transactionType, quantity: tradeQuantity,
//                         entryTime: `${h}:${m}:00`, entryPrice: finalEntryPrice,
//                         exitTime: null, exitPrice: null, pnl: null, exitType: null,
//                         optionConfig: isOptionsTrade ? { strike: calculateATM(spotClosePrice, upperSymbol), type: activeOptionType } : null,
//                         signalType: finalLongSignal ? "LONG" : "SHORT" 
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
                    
//                     const optionConfig = getOptionSecurityId(upperSymbol, targetStrike, currentTrade.optionConfig.type);
//                     if(optionConfig) {
//                         try {
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




const mongoose = require('mongoose'); 
const Strategy = require('../models/Strategy');
const HistoricalData = require('../models/HistoricalData');
const Broker = require('../models/Broker');
const { SMA, EMA, RSI, MACD, BollingerBands, ATR } = require('technicalindicators');
const { getOptionSecurityId } = require('../services/instrumentService');

const { fetchDhanHistoricalData, fetchExpiredOptionData } = require('../services/dhanService');

const runBacktestSimulator = async (req, res) => {
    try {
        const { strategyId } = req.params;
        const { period, start, end } = req.query;
        
        const strategy = await Strategy.collection.findOne({ _id: new mongoose.Types.ObjectId(strategyId) });
        if (!strategy) return res.status(404).json({ error: "Strategy not found" });

        console.log(`\n🚀 Running Real Backtest for: ${strategy.name} | Period: ${period || '1M'}`);

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
        
        let timeframe = strategy.interval ? strategy.interval.replace(' min', '') : "5"; 
        
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
            const dhanRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, spotSecurityId, exchangeSegment, "INDEX", startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0], timeframe);
            const timeArray = dhanRes.data ? (dhanRes.data.start_Time || dhanRes.data.timestamp) : null;

            if (dhanRes.success && timeArray) {
                const { open, high, low, close, volume } = dhanRes.data;
                const bulkOps = [];
                for (let i = 0; i < timeArray.length; i++) {
                    let ms = timeArray[i];
                    if (ms < 10000000000) ms = ms * 1000; 
                    bulkOps.push({ insertOne: { document: { symbol: upperSymbol, timeframe, timestamp: new Date(ms), open: open[i], high: high[i], low: low[i], close: close[i], volume: volume[i] } } });
                }
                
                if (bulkOps.length > 0) {
                    await HistoricalData.bulkWrite(bulkOps, { ordered: false }).catch(e => console.log("Duplicates ignored"));
                    cachedData = await HistoricalData.find({ symbol: { $regex: new RegExp(cleanSymbolForMap, "i") }, timeframe, timestamp: { $gte: startDate, $lte: endDate } }).sort({ timestamp: 1 }).lean();
                }
            } else {
                return res.status(404).json({ success: false, errorType: "NO_DATA", message: "Spot Data not available for this period." });
            }
        }

        const calculateIndicator = (indConfig, candles) => {
            if (!indConfig || !indConfig.id) return null;
            const indId = indConfig.id.trim().toLowerCase();
            if (indId === 'number' || indId === 'static') {
                const staticVal = Number(indConfig.value) || Number(indConfig.params?.Value) || Number(indConfig.params?.value) || 0;
                return candles.map(() => staticVal);
            }
            const closePrices = candles.map(c => parseFloat(c.close) || 0);
            let results = [];
            try {
                if (indId === 'candle') return closePrices;
                if (indId === 'sma') results = SMA.calculate({ period: Number(indConfig.params?.Period) || Number(indConfig.params?.period) || 14, values: closePrices });
                else if (indId === 'ema') results = EMA.calculate({ period: Number(indConfig.params?.Period) || Number(indConfig.params?.period) || 9, values: closePrices });
                else if (indId === 'rsi') results = RSI.calculate({ period: Number(indConfig.params?.Period) || Number(indConfig.params?.period) || 14, values: closePrices });
                
                if (results.length > 0) {
                    const padding = Array(candles.length - results.length).fill(null);
                    return [...padding, ...results];
                }
                return Array(candles.length).fill(null);
            } catch (error) { return Array(candles.length).fill(null); }
        };

        const findConditions = (obj) => {
            if (!obj || typeof obj !== 'object') return null;
            if (obj.longRules && Array.isArray(obj.longRules)) return obj;
            if (Array.isArray(obj)) {
                for (let item of obj) {
                    const found = findConditions(item);
                    if (found) return found;
                }
            } else {
                for (let key in obj) {
                    const found = findConditions(obj[key]);
                    if (found) return found;
                }
            }
            return null;
        };

        let entryConds = findConditions(strategy);

        const extractParams = (ruleInd, fallbackParams) => {
            let p = ruleInd?.params || fallbackParams || {};
            if (!p.Period && ruleInd?.display) {
                const match = ruleInd.display.match(/\((\d+)/);
                if (match) p.Period = Number(match[1]);
            }
            return p;
        };

        // =========================================================
        // 📊 PRE-CALCULATE INDICATORS (LONG & SHORT)
        // =========================================================
        const calcLongInd1 = []; const calcLongInd2 = [];
        if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
            entryConds.longRules.forEach((rule, idx) => {
                const params1 = extractParams(rule.ind1, rule.params);
                calcLongInd1[idx] = calculateIndicator({...rule.ind1, params: params1}, cachedData);
                const params2 = extractParams(rule.ind2, null);
                calcLongInd2[idx] = calculateIndicator({...rule.ind2, params: params2}, cachedData);
            });
        }

        const calcShortInd1 = []; const calcShortInd2 = [];
        if (entryConds && entryConds.shortRules && entryConds.shortRules.length > 0) {
            entryConds.shortRules.forEach((rule, idx) => {
                const params1 = extractParams(rule.ind1, rule.params);
                calcShortInd1[idx] = calculateIndicator({...rule.ind1, params: params1}, cachedData);
                const params2 = extractParams(rule.ind2, null);
                calcShortInd2[idx] = calculateIndicator({...rule.ind2, params: params2}, cachedData);
            });
        }

        const evaluateCondition = (val1, val2, prevVal1, prevVal2, operator) => {
            if (val1 === null || val2 === null) return false;
            const op = operator?.trim(); 
            switch(op) {
                case 'Greater Than': return val1 > val2;
                case 'Less Than': return val1 < val2;
                case 'Equals': return val1 === val2;
                case 'Crosses Above': return prevVal1 !== null && prevVal2 !== null && prevVal1 <= prevVal2 && val1 > val2; 
                case 'Crosses Below': return prevVal1 !== null && prevVal2 !== null && prevVal1 >= prevVal2 && val1 < val2; 
                default: return false;
            }
        };

        let currentEquity = 0, peakEquity = 0, maxDrawdown = 0;
        let winDays = 0, lossDays = 0, winTrades = 0, lossTrades = 0;
        let currentWinStreak = 0, currentLossStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
        let maxProfitTrade = 0, maxLossTrade = 0;
        const equityCurve = []; const daywiseBreakdown = []; let dailyBreakdownMap = {}; 

        let isPositionOpen = false; 
        let currentTrade = null; 
        
        let tradeQuantity = strategy.legs?.[0]?.quantity || strategy.data?.legs?.[0]?.quantity; 
        if (!tradeQuantity || isNaN(tradeQuantity)) tradeQuantity = upperSymbol.includes("BANK") ? 30 : (upperSymbol.includes("NIFTY") ? 50 : 1);

        const legData = strategy.legs?.[0] || strategy.data?.legs?.[0] || {};
        const transactionType = legData.action || "BUY";

        const calculateATM = (spotPrice, symbolStr) => {
            if(symbolStr.includes("BANK")) return Math.round(spotPrice / 100) * 100;
            return Math.round(spotPrice / 50) * 50;
        };

        const calcTradePnL = (entryP, exitP, qty, action) => {
            if(action === "BUY") return (exitP - entryP) * qty;
            return (entryP - exitP) * qty; 
        };

        // =========================================================
        // 🔄 MAIN BACKTEST LOOP
        // =========================================================
        for (let i = 0; i < cachedData.length; i++) {
            const candle = cachedData[i];
            const candleTime = new Date(candle.timestamp).getTime();
            const istDate = new Date(candleTime + (5.5 * 60 * 60 * 1000));
            const h = String(istDate.getUTCHours()).padStart(2, '0'); 
            const m = String(istDate.getUTCMinutes()).padStart(2, '0');
            const timeInMinutes = (istDate.getUTCHours() * 60) + istDate.getUTCMinutes(); 
            const dateStr = istDate.toISOString().split('T')[0];

            if (!dailyBreakdownMap[dateStr]) dailyBreakdownMap[dateStr] = { pnl: 0, trades: 0, tradesList: [] };

            // 🟢 LONG SIGNAL EVALUATION
            let longSignal = false;
            if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
                let overallResult = null;
                entryConds.longRules.forEach((rule, idx) => {
                    const val1 = calcLongInd1[idx] ? calcLongInd1[idx][i] : null;
                    const val2 = calcLongInd2[idx] ? calcLongInd2[idx][i] : null;
                    const prevVal1 = (i > 0 && calcLongInd1[idx]) ? calcLongInd1[idx][i-1] : null;
                    const prevVal2 = (i > 0 && calcLongInd2[idx]) ? calcLongInd2[idx][i-1] : null;

                    const operator = rule.op || rule.params?.op || rule.ind1?.params?.op;
                    const ruleResult = evaluateCondition(val1, val2, prevVal1, prevVal2, operator);
                    
                    if (idx === 0) overallResult = ruleResult;
                    else {
                        const logicalOp = entryConds.logicalOps[idx - 1]; 
                        if (logicalOp === 'AND') overallResult = overallResult && ruleResult;
                        else if (logicalOp === 'OR') overallResult = overallResult || ruleResult;
                    }
                });
                longSignal = overallResult;
            }

            // 🔴 SHORT SIGNAL EVALUATION
            let shortSignal = false;
            if (entryConds && entryConds.shortRules && entryConds.shortRules.length > 0) {
                let overallResult = null;
                entryConds.shortRules.forEach((rule, idx) => {
                    const val1 = calcShortInd1[idx] ? calcShortInd1[idx][i] : null;
                    const val2 = calcShortInd2[idx] ? calcShortInd2[idx][i] : null;
                    const prevVal1 = (i > 0 && calcShortInd1[idx]) ? calcShortInd1[idx][i-1] : null;
                    const prevVal2 = (i > 0 && calcShortInd2[idx]) ? calcShortInd2[idx][i-1] : null;

                    const operator = rule.op || rule.params?.op || rule.ind1?.params?.op;
                    const ruleResult = evaluateCondition(val1, val2, prevVal1, prevVal2, operator);
                    
                    if (idx === 0) overallResult = ruleResult;
                    else {
                        const logicalOp = entryConds.logicalOps[idx - 1]; 
                        if (logicalOp === 'AND') overallResult = overallResult && ruleResult;
                        else if (logicalOp === 'OR') overallResult = overallResult || ruleResult;
                    }
                });
                shortSignal = overallResult;
            }

            const isMarketOpen = timeInMinutes >= 555 && timeInMinutes < 915; 
            const isExitTime = timeInMinutes >= 915; 
            let isLastCandleOfDay = false;
            if (i === cachedData.length - 1) isLastCandleOfDay = true;
            else {
                const nextCandleIst = new Date(new Date(cachedData[i+1].timestamp).getTime() + (5.5 * 60 * 60 * 1000));
                if (nextCandleIst.toISOString().split('T')[0] !== dateStr) isLastCandleOfDay = true;
            }

            const spotClosePrice = parseFloat(candle.close);

            // --------------------------------------------------------
            // 🚦 TRANSACTION TYPE FILTER LOGIC
            // --------------------------------------------------------
            const txnType = strategy.config?.transactionType || strategy.data?.config?.transactionType || 'Both Side';
            const finalLongSignal = (txnType === 'Both Side' || txnType === 'Only Long') ? longSignal : false;
            const finalShortSignal = (txnType === 'Both Side' || txnType === 'Only Short') ? shortSignal : false;

            // =========================================================
            // 5. 🛑 M2M RISK CHECK (SL & TP Check per candle)
            // =========================================================
            if (isPositionOpen && currentTrade) {
                let hitSL = false;
                let hitTP = false;
                let exitPrice = 0;

                // Stoploss Value (e.g. 30%)
                const slValue = legData.slValue || 0;
                const slPrice = currentTrade.entryPrice * (1 - slValue / 100);
                
                // Target Value (e.g. 50%)
                const tpValue = legData.tpValue || 0;
                const tpPrice = currentTrade.entryPrice * (1 + tpValue / 100);

                let currentHigh = spotClosePrice; 
                let currentLow = spotClosePrice;  

                // 🔥 THE FIX: Get exact Premium High/Low for THIS specific minute
                if (isOptionsTrade && currentTrade.premiumChart && currentTrade.premiumChart.start_Time) {
                    const exactMatchIndex = currentTrade.premiumChart.start_Time.findIndex(t => {
                        const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
                        return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
                    });
                    
                    if (exactMatchIndex !== -1) {
                        currentHigh = currentTrade.premiumChart.high[exactMatchIndex];
                        currentLow = currentTrade.premiumChart.low[exactMatchIndex];
                    } else {
                        continue; // Agar is minute ka premium data nahi hai, to next minute check karo
                    }
                } else if (!isOptionsTrade) {
                    currentHigh = parseFloat(candle.high);
                    currentLow = parseFloat(candle.low);
                }

                // 🛑 CHECK STOPLOSS (Low price se check karenge)
                if (slValue > 0 && currentTrade.entryPrice > 0) {
                    if (currentTrade.transaction === "BUY" && currentLow <= slPrice) {
                        hitSL = true;
                        exitPrice = slPrice; // SL price par hi nikal gaye
                    }
                }

                // 🎯 CHECK TARGET (High price se check karenge)
                if (tpValue > 0 && currentTrade.entryPrice > 0) {
                    if (currentTrade.transaction === "BUY" && currentHigh >= tpPrice) {
                        hitTP = true;
                        exitPrice = tpPrice; // Target price par profit book
                    }
                }

                // 🚀 EXIT EXECUTION
                if (hitSL || hitTP) {
                    isPositionOpen = false;
                    const pnl = calcTradePnL(currentTrade.entryPrice, exitPrice, tradeQuantity, currentTrade.transaction);

                    currentTrade.exitTime = `${h}:${m}:00`;
                    currentTrade.exitPrice = exitPrice;
                    currentTrade.pnl = pnl;
                    currentTrade.exitType = hitSL ? "STOPLOSS" : "TARGET";
                    
                    dailyBreakdownMap[dateStr].tradesList.push(currentTrade);
                    dailyBreakdownMap[dateStr].pnl += pnl;
                    dailyBreakdownMap[dateStr].trades += 1;
                    if (pnl > 0) { winTrades++; if(pnl > maxProfitTrade) maxProfitTrade = pnl; } 
                    else { lossTrades++; if(pnl < maxLossTrade) maxLossTrade = pnl; }
                    
                    console.log(`🎯 [${currentTrade.exitType}] Date: ${dateStr} | Exit Premium: ${exitPrice.toFixed(2)} | PnL: ${pnl.toFixed(2)}`);
                    currentTrade = null;
                    continue; 
                }
            }

            // =========================================================
            // 🟢 TAKE TRADE (ENTRY)
            // =========================================================
           if (!isPositionOpen && isMarketOpen && (finalLongSignal || finalShortSignal)) {
                
                const activeOptionType = finalLongSignal ? "CE" : "PE";
                const transActionTypeStr = legData.action || "BUY";
                
                let tradeSymbol = upperSymbol;
                let finalEntryPrice = spotClosePrice;
                let validTrade = true;
                let premiumChartData = null; // 🔥 NEW: Pure din ka premium data save karne ke liye

                if(isOptionsTrade && broker) {
                    const targetStrike = calculateATM(spotClosePrice, upperSymbol);
                    let apiSuccess = false;
                    
                    // 1. Try Standard API
                    const optionConfig = getOptionSecurityId(upperSymbol, targetStrike, activeOptionType);
                    if(optionConfig) {
                        try {
                            const optRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, optionConfig.id, "NSE_FNO", "OPTIDX", dateStr, dateStr, "1");
                            if(optRes.success && optRes.data && optRes.data.close) {
                                const exactMatchIndex = optRes.data.start_Time.findIndex(t => {
                                    const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
                                    return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
                                });
                                finalEntryPrice = exactMatchIndex !== -1 ? optRes.data.close[exactMatchIndex] : optRes.data.close[0];
                                tradeSymbol = optionConfig.tradingSymbol;
                                premiumChartData = optRes.data; // 🔥 NEW: Save Data
                                apiSuccess = true;
                            } 
                        } catch(e) { }
                    } 
                    
                    // 2. Use Expired Options API (Fallback)
                    if (!apiSuccess) {
                        try {
                            const expRes = await fetchExpiredOptionData(broker.clientId, broker.apiSecret, spotSecurityId, targetStrike, activeOptionType, dateStr, dateStr);
                            if(expRes.success && expRes.data && expRes.data.close) {
                                const exactMatchIndex = expRes.data.start_Time.findIndex(t => {
                                    const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
                                    return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
                                });
                                finalEntryPrice = exactMatchIndex !== -1 ? expRes.data.close[exactMatchIndex] : expRes.data.close[0];
                                tradeSymbol = `${upperSymbol} ${targetStrike} ${activeOptionType} (EXP)`; 
                                premiumChartData = expRes.data; // 🔥 NEW: Save Data
                                apiSuccess = true;
                            }
                        } catch(e) { }
                    }

                    if (!apiSuccess) {
                        validTrade = false;
                        console.log(`❌ Trade Canceled: Premium Data not available for ${upperSymbol} ${targetStrike} ${activeOptionType}`);
                    }
                }

                if (validTrade) {
                    isPositionOpen = true;
                    currentTrade = {
                        symbol: tradeSymbol, transaction: transActionTypeStr, quantity: tradeQuantity,
                        entryTime: `${h}:${m}:00`, entryPrice: finalEntryPrice,
                        exitTime: null, exitPrice: null, pnl: null, exitType: null,
                        optionConfig: isOptionsTrade ? { strike: calculateATM(spotClosePrice, upperSymbol), type: activeOptionType } : null,
                        premiumChart: premiumChartData // 🔥 NEW: Attach to current trade
                    };
                    console.log(`✅ [TRADE OPEN] Date: ${dateStr} | Time: ${h}:${m} | Spot: ${spotClosePrice} | Premium: ${finalEntryPrice} | Type: ${activeOptionType}`);
                }
            }
            
            // =========================================================
            // 🔴 EXIT TRADE (TIME SQAUREOFF)
            // =========================================================
            if (isPositionOpen && (isExitTime || isLastCandleOfDay)) {
                isPositionOpen = false;
                let finalExitPrice = spotClosePrice;

                if(isOptionsTrade && currentTrade.optionConfig && broker) {
                    let apiSuccess = false;
                    const targetStrike = currentTrade.optionConfig.strike;
                    
                    const optionConfig = getOptionSecurityId(upperSymbol, targetStrike, currentTrade.optionConfig.type);
                    if(optionConfig) {
                        try {
                            const optRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, optionConfig.id, "NSE_FNO", "OPTIDX", dateStr, dateStr, "1");
                            if(optRes.success && optRes.data && optRes.data.close) {
                                const exactMatchIndex = optRes.data.start_Time.findIndex(t => {
                                    const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
                                    return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
                                });
                                finalExitPrice = exactMatchIndex !== -1 ? optRes.data.close[exactMatchIndex] : optRes.data.close[optRes.data.close.length - 1];
                                apiSuccess = true;
                            }
                        } catch(e) { }
                    }

                    if (!apiSuccess) {
                        try {
                            const expRes = await fetchExpiredOptionData(broker.clientId, broker.apiSecret, spotSecurityId, targetStrike, currentTrade.optionConfig.type, dateStr, dateStr);
                            if(expRes.success && expRes.data && expRes.data.close) {
                                const exactMatchIndex = expRes.data.start_Time.findIndex(t => {
                                    const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
                                    return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
                                });
                                finalExitPrice = exactMatchIndex !== -1 ? expRes.data.close[exactMatchIndex] : expRes.data.close[expRes.data.close.length - 1];
                                apiSuccess = true;
                            }
                        } catch(e) { }
                    }

                    if (!apiSuccess) {
                        finalExitPrice = currentTrade.entryPrice; 
                    }
                }

                const pnl = calcTradePnL(currentTrade.entryPrice, finalExitPrice, tradeQuantity, transactionType);

                currentTrade.exitTime = `${h}:${m}:00`;
                currentTrade.exitPrice = finalExitPrice;
                currentTrade.pnl = pnl;
                currentTrade.exitType = isLastCandleOfDay ? "EOD_SQUAREOFF" : "TIME_SQUAREOFF";
                dailyBreakdownMap[dateStr].tradesList.push(currentTrade);
                
                console.log(`❌ [TRADE CLOSE] Date: ${dateStr} | Premium: ${finalExitPrice.toFixed(2)} | PnL: ${pnl.toFixed(2)}`);
                currentTrade = null; 

                dailyBreakdownMap[dateStr].pnl += pnl;
                dailyBreakdownMap[dateStr].trades += 1;

                if (pnl > 0) { winTrades++; if (pnl > maxProfitTrade) maxProfitTrade = pnl; } 
                else { lossTrades++; if (pnl < maxLossTrade) maxLossTrade = pnl; }
            }
        }

        // ==========================================
        // 🧮 5. DAILY LOOP (UI Format Conversion & Metrics)
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