

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

//         // 🔥 NEW 1: Global Risk Settings nikal lein
//         const riskSettings = strategy.data?.riskManagement || strategy.riskManagement || {};
//         const globalMaxProfit = Number(riskSettings.maxProfit) || 0;
//         const globalMaxLoss = Number(riskSettings.maxLoss) || 0;
//         let isTradingHaltedForDay = false; // Aaj ka din block karne ke liye flag
//         let currentDayTracker = ""; // Din track karne ke liye


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

//             // 🔥 NEW 2: Agar naya din shuru hua, to "Halt Flag" reset kar do
//             if (dateStr !== currentDayTracker) {
//                 currentDayTracker = dateStr;
//                 isTradingHaltedForDay = false; // Naye din ki nayi shuruaat
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
//             // 5. 🛑 M2M RISK CHECK (SL/TP & Global Max Profit/Loss Check)
//             // =========================================================
//             if (isPositionOpen && currentTrade) {
//                 let hitSL = false;
//                 let hitTP = false;
//                 let hitMaxProfit = false;
//                 let hitMaxLoss = false;
//                 let exitPrice = 0;
//                 let exitReason = "";

//                 const slValue = legData.slValue || 0;
//                 const slPrice = currentTrade.entryPrice * (1 - slValue / 100);
//                 const tpValue = legData.tpValue || 0;
//                 const tpPrice = currentTrade.entryPrice * (1 + tpValue / 100);

//                 let currentHigh = spotClosePrice; 
//                 let currentLow = spotClosePrice;  
//                 let currentClose = spotClosePrice; // M2M PnL ke liye

//                 if (isOptionsTrade && currentTrade.premiumChart && currentTrade.premiumChart.start_Time) {
//                     const exactMatchIndex = currentTrade.premiumChart.start_Time.findIndex(t => {
//                         const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                         return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                     });
                    
//                     if (exactMatchIndex !== -1) {
//                         currentHigh = currentTrade.premiumChart.high[exactMatchIndex];
//                         currentLow = currentTrade.premiumChart.low[exactMatchIndex];
//                         currentClose = currentTrade.premiumChart.close[exactMatchIndex];
//                     } else {
//                         continue; 
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
//                     }
//                 }
//                 if (tpValue > 0 && currentTrade.entryPrice > 0) {
//                     if (currentTrade.transaction === "BUY" && currentHigh >= tpPrice) {
//                         hitTP = true; exitPrice = tpPrice; exitReason = "TARGET";
//                     }
//                 }

//                 // 🔥 2. CHECK GLOBAL MAX PROFIT / MAX LOSS
//                 if (!hitSL && !hitTP) { // Agar SL/TP hit nahi hua tabhi global check karo
//                     const openTradePnL = calcTradePnL(currentTrade.entryPrice, currentClose, tradeQuantity, currentTrade.transaction);
//                     const runningDailyPnL = dailyBreakdownMap[dateStr].pnl + openTradePnL; // Realized + Unrealized

//                     if (globalMaxProfit > 0 && runningDailyPnL >= globalMaxProfit) {
//                         hitMaxProfit = true;
//                         exitPrice = currentClose;
//                         exitReason = "MAX_PROFIT";
//                         isTradingHaltedForDay = true; // Aaj ke liye terminal band!
//                     } 
//                     else if (globalMaxLoss > 0 && runningDailyPnL <= -globalMaxLoss) {
//                         hitMaxLoss = true;
//                         exitPrice = currentClose;
//                         exitReason = "MAX_LOSS";
//                         isTradingHaltedForDay = true; // Aaj ke liye terminal band!
//                     }
//                 }

//                 // 🚀 EXIT EXECUTION
//                 if (hitSL || hitTP || hitMaxProfit || hitMaxLoss) {
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
//                 // 🔥 NEW 3: Agar position open nahi hai, fir bhi check karo kya purane trades se profit/loss limit pahuch gayi hai
//                 const realizedDailyPnL = dailyBreakdownMap[dateStr].pnl;
//                 if (globalMaxProfit > 0 && realizedDailyPnL >= globalMaxProfit) isTradingHaltedForDay = true;
//                 if (globalMaxLoss > 0 && realizedDailyPnL <= -globalMaxLoss) isTradingHaltedForDay = true;
//             }


//             // =========================================================
//             // 🟢 TAKE TRADE (ENTRY)
//             // =========================================================
//            if (!isPositionOpen && isMarketOpen && !isTradingHaltedForDay && (finalLongSignal || finalShortSignal)) {
                
//                 const activeOptionType = finalLongSignal ? "CE" : "PE";
//                 const transActionTypeStr = legData.action || "BUY";
                
//                 let tradeSymbol = upperSymbol;
//                 let finalEntryPrice = spotClosePrice;
//                 let validTrade = true;
//                 let premiumChartData = null; // 🔥 NEW: Pure din ka premium data save karne ke liye

//                 if(isOptionsTrade && broker) {
//                     const targetStrike = calculateATM(spotClosePrice, upperSymbol);
//                     let apiSuccess = false;
                    
//                     // 1. Try Standard API
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
//                                 premiumChartData = optRes.data; // 🔥 NEW: Save Data
//                                 apiSuccess = true;
//                             } 
//                         } catch(e) { }
//                     } 
                    
//                     // 2. Use Expired Options API (Fallback)
//                     if (!apiSuccess) {
//                         try {
//                             const expRes = await fetchExpiredOptionData(broker.clientId, broker.apiSecret, spotSecurityId, targetStrike, activeOptionType, dateStr, dateStr);
//                             if(expRes.success && expRes.data && expRes.data.close) {
//                                 const exactMatchIndex = expRes.data.start_Time.findIndex(t => {
//                                     const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
//                                     return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
//                                 });
//                                 finalEntryPrice = exactMatchIndex !== -1 ? expRes.data.close[exactMatchIndex] : expRes.data.close[0];
//                                 tradeSymbol = `${upperSymbol} ${targetStrike} ${activeOptionType} (EXP)`; 
//                                 premiumChartData = expRes.data; // 🔥 NEW: Save Data
//                                 apiSuccess = true;
//                             }
//                         } catch(e) { }
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
//                         optionConfig: isOptionsTrade ? { strike: calculateATM(spotClosePrice, upperSymbol), type: activeOptionType } : null,
//                         premiumChart: premiumChartData // 🔥 NEW: Attach to current trade
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

        // 🔥 NEW 1: Global Risk Settings nikal lein
        const riskSettings = strategy.data?.riskManagement || strategy.riskManagement || {};
        const globalMaxProfit = Number(riskSettings.maxProfit) || 0;
        const globalMaxLoss = Number(riskSettings.maxLoss) || 0;
        let isTradingHaltedForDay = false; // Aaj ka din block karne ke liye flag
        let currentDayTracker = ""; // Din track karne ke liye


        const calculateATM = (spotPrice, symbolStr) => {
            if(symbolStr.includes("BANK")) return Math.round(spotPrice / 100) * 100;
            return Math.round(spotPrice / 50) * 50;
        };

        const calcTradePnL = (entryP, exitP, qty, action) => {
            if(action === "BUY") return (exitP - entryP) * qty;
            return (entryP - exitP) * qty; 
        };

        // 🔥 NEW: SEBI Updated Expiry Calculator with 'Upcoming' vs 'Expired' Tag
        const getNearestExpiryString = (tradeDateStr, symbolStr) => {
            const d = new Date(tradeDateStr);
            const upSym = symbolStr.toUpperCase();
            let expiryDate = new Date(d);
            
            // 1. 🟢 NIFTY 50: Weekly (Har Tuesday)
            if (upSym.includes("NIFTY") && !upSym.includes("BANK") && !upSym.includes("FIN") && !upSym.includes("MID")) {
                let targetDay = 2; // 2 = Tuesday
                while (expiryDate.getDay() !== targetDay) {
                    expiryDate.setDate(expiryDate.getDate() + 1);
                }
            } 
            // 2. 🔴 OTHERS (BankNifty etc.): Monthly (Mahine ka Aakhiri Tuesday/Monday)
            else {
                let targetDay = 2; // Default Last Tuesday
                if (upSym.includes("MID")) targetDay = 1; // Last Monday
                
                const lastDayOfMonth = new Date(expiryDate.getFullYear(), expiryDate.getMonth() + 1, 0);
                expiryDate = new Date(lastDayOfMonth);
                while (expiryDate.getDay() !== targetDay) {
                    expiryDate.setDate(expiryDate.getDate() - 1);
                }
                
                if (d > expiryDate) {
                    const lastDayOfNextMonth = new Date(d.getFullYear(), d.getMonth() + 2, 0);
                    expiryDate = new Date(lastDayOfNextMonth);
                    while (expiryDate.getDay() !== targetDay) {
                        expiryDate.setDate(expiryDate.getDate() - 1);
                    }
                }
            }

            // Date Formatting: "28APR26"
            const day = String(expiryDate.getDate()).padStart(2, '0');
            const month = expiryDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
            const year = String(expiryDate.getFullYear()).slice(-2);
            const formattedDate = `${day}${month}${year}`;

            // 🔥 THE MAGIC: Real World Today se compare karna
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Sirf date check karne ke liye time zero kar do
            
            const expDateForCheck = new Date(expiryDate);
            expDateForCheck.setHours(0, 0, 0, 0);

            // Agar expiry Date nikal chuki hai -> "EXP", warna -> "Upcoming EXP"
            const prefix = (expDateForCheck < today) ? "EXP" : "Upcoming EXP";

            return `${prefix} ${formattedDate}`; 
        };

        // =========================================================
        // 🔄 MAIN BACKTEST LOOP
        // =========================================================
        for (let i = 0; i < cachedData.length; i++) {

            // 🔥 THE BREATHER FIX: Har 500 candle ke baad event loop ko free karo
            if (i % 500 === 0) {
                await new Promise(resolve => setImmediate(resolve));
            }

            const candle = cachedData[i];
            const candleTime = new Date(candle.timestamp).getTime();
            const istDate = new Date(candleTime + (5.5 * 60 * 60 * 1000));
            const h = String(istDate.getUTCHours()).padStart(2, '0'); 
            const m = String(istDate.getUTCMinutes()).padStart(2, '0');
            const timeInMinutes = (istDate.getUTCHours() * 60) + istDate.getUTCMinutes(); 
            const dateStr = istDate.toISOString().split('T')[0];

            // 🔥 NEW 2: Agar naya din shuru hua, to "Halt Flag" reset kar do
            if (dateStr !== currentDayTracker) {
                currentDayTracker = dateStr;
                isTradingHaltedForDay = false; // Naye din ki nayi shuruaat
            }

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
            // 5. 🛑 M2M RISK CHECK (SL/TP & Global Max Profit/Loss Check)
            // =========================================================
            if (isPositionOpen && currentTrade) {
                let hitSL = false;
                let hitTP = false;
                let hitMaxProfit = false;
                let hitMaxLoss = false;
                let exitPrice = 0;
                let exitReason = "";

                const slValue = legData.slValue || 0;
                const tpValue = legData.tpValue || 0;
                let slPrice = 0;
                let tpPrice = 0;

                // 🔥 THE FIX: Buyer aur Seller ke liye alag-alag SL/TP math
                if (currentTrade.transaction === "BUY") {
                    slPrice = currentTrade.entryPrice * (1 - slValue / 100);
                    tpPrice = currentTrade.entryPrice * (1 + tpValue / 100);
                } else if (currentTrade.transaction === "SELL") {
                    // Seller ke liye SL upar hota hai, Target niche hota hai
                    slPrice = currentTrade.entryPrice * (1 + slValue / 100);
                    tpPrice = currentTrade.entryPrice * (1 - tpValue / 100);
                }

                let currentHigh = spotClosePrice; 
                let currentLow = spotClosePrice;  
                let currentClose = spotClosePrice; 

                if (isOptionsTrade && currentTrade.premiumChart && currentTrade.premiumChart.start_Time) {
                    const exactMatchIndex = currentTrade.premiumChart.start_Time.findIndex(t => {
                        const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
                        return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
                    });
                    
                    if (exactMatchIndex !== -1) {
                        currentHigh = currentTrade.premiumChart.high[exactMatchIndex];
                        currentLow = currentTrade.premiumChart.low[exactMatchIndex];
                        currentClose = currentTrade.premiumChart.close[exactMatchIndex];
                    } else {
                        continue; 
                    }
                } else if (!isOptionsTrade) {
                    currentHigh = parseFloat(candle.high);
                    currentLow = parseFloat(candle.low);
                    currentClose = parseFloat(candle.close);
                }

                // 🛑 1. CHECK LEG STOPLOSS & TARGET (BUYER vs SELLER)
                if (slValue > 0 && currentTrade.entryPrice > 0) {
                    if (currentTrade.transaction === "BUY" && currentLow <= slPrice) {
                        hitSL = true; exitPrice = slPrice; exitReason = "STOPLOSS";
                    } else if (currentTrade.transaction === "SELL" && currentHigh >= slPrice) {
                        hitSL = true; exitPrice = slPrice; exitReason = "STOPLOSS"; // Seller ka premium badha to SL hit
                    }
                }
                
                if (tpValue > 0 && currentTrade.entryPrice > 0) {
                    if (currentTrade.transaction === "BUY" && currentHigh >= tpPrice) {
                        hitTP = true; exitPrice = tpPrice; exitReason = "TARGET";
                    } else if (currentTrade.transaction === "SELL" && currentLow <= tpPrice) {
                        hitTP = true; exitPrice = tpPrice; exitReason = "TARGET"; // Seller ka premium gira to Target hit
                    }
                }

                // 🔥 2. CHECK GLOBAL MAX PROFIT / MAX LOSS
                if (!hitSL && !hitTP) { 
                    const openTradePnL = calcTradePnL(currentTrade.entryPrice, currentClose, tradeQuantity, currentTrade.transaction);
                    const runningDailyPnL = dailyBreakdownMap[dateStr].pnl + openTradePnL; 

                    if (globalMaxProfit > 0 && runningDailyPnL >= globalMaxProfit) {
                        hitMaxProfit = true; exitPrice = currentClose; exitReason = "MAX_PROFIT";
                        isTradingHaltedForDay = true; 
                    } 
                    else if (globalMaxLoss > 0 && runningDailyPnL <= -globalMaxLoss) {
                        hitMaxLoss = true; exitPrice = currentClose; exitReason = "MAX_LOSS";
                        isTradingHaltedForDay = true; 
                    }
                }

                // 🚀 EXIT EXECUTION
                if (hitSL || hitTP || hitMaxProfit || hitMaxLoss) {
                    isPositionOpen = false;
                    const pnl = calcTradePnL(currentTrade.entryPrice, exitPrice, tradeQuantity, currentTrade.transaction);

                    currentTrade.exitTime = `${h}:${m}:00`;
                    currentTrade.exitPrice = exitPrice;
                    currentTrade.pnl = pnl;
                    currentTrade.exitType = exitReason;
                    
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
            else if (!isTradingHaltedForDay) {
                const realizedDailyPnL = dailyBreakdownMap[dateStr].pnl;
                if (globalMaxProfit > 0 && realizedDailyPnL >= globalMaxProfit) isTradingHaltedForDay = true;
                if (globalMaxLoss > 0 && realizedDailyPnL <= -globalMaxLoss) isTradingHaltedForDay = true;
            }


            // =========================================================
            // 🟢 TAKE TRADE (ENTRY)
            // =========================================================
           if (!isPositionOpen && isMarketOpen && !isTradingHaltedForDay && (finalLongSignal || finalShortSignal)) {
                
                const transActionTypeStr = legData.action || "BUY";
                
                // 🔥 THE FIX: Option Type selection based on BUY vs SELL
                let activeOptionType = "";
                if (transActionTypeStr === "BUY") {
                    // Buyer: Bullish me CE, Bearish me PE
                    activeOptionType = finalLongSignal ? "CE" : "PE";
                } else if (transActionTypeStr === "SELL") {
                    // Seller: Bullish me PE sell karega, Bearish me CE sell karega
                    activeOptionType = finalLongSignal ? "PE" : "CE"; 
                }
                
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
                        console.log(`⚠️ Standard API Failed. Trying Expired Options API for: ${upperSymbol} ${targetStrike} ${activeOptionType}`);
                        try {
                            const expRes = await fetchExpiredOptionData(broker.clientId, broker.apiSecret, spotSecurityId, targetStrike, activeOptionType, dateStr, dateStr);
                            if(expRes.success && expRes.data && expRes.data.close) {
                                const exactMatchIndex = expRes.data.start_Time.findIndex(t => {
                                    const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
                                    return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
                                });
                                finalEntryPrice = exactMatchIndex !== -1 ? expRes.data.close[exactMatchIndex] : expRes.data.close[0];
                                
                                // 🔥 THE FIX: Yahan brackets hata diye kyunki prefix function se hi aa raha hai
                                const expiryLabel = getNearestExpiryString(dateStr, upperSymbol);
                                tradeSymbol = `${upperSymbol} ${targetStrike} ${activeOptionType} (${expiryLabel})`; 
                                
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