
// const Strategy = require('../models/Strategy');
// const HistoricalData = require('../models/HistoricalData');
// const Broker = require('../models/Broker');
// const { fetchDhanHistoricalData } = require('../services/dhanService');
// const { SMA, EMA, RSI, MACD, BollingerBands, ATR } = require('technicalindicators');

// const runBacktestSimulator = async (req, res) => {
//     try {
//         const { strategyId } = req.params;
//         const { period, start, end } = req.query;
        
//         const strategy = await Strategy.findById(strategyId);
//         if (!strategy) return res.status(404).json({ error: "Strategy not found" });

//         console.log(`🚀 Running Real Backtest for: ${strategy.name} | Period: ${period || '1M'}`);

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
//             "SENSEX": "51", "BSE SENSEX": "51", "HDFCBANK": "1333", "RELIANCE": "2885"
//         };

//         // 🔥 ROBUST EXTRACTION: Array fallback for nested structures
//         const instrumentsArr = strategy.instruments || strategy.data?.instruments || [];
//         const instrumentData = instrumentsArr.length > 0 ? instrumentsArr[0] : {};
        
//         const symbol = instrumentData.symbol || instrumentData.name || "BANKNIFTY"; 
//         const upperSymbol = symbol.toUpperCase().trim(); 
        
//         let rawExchange = (instrumentData.exchange || "IDX_I").toUpperCase();
//         let exchangeSegment = "IDX_I"; 

//         if (rawExchange === "NSE") exchangeSegment = "NSE_EQ";
//         else if (rawExchange === "BSE") exchangeSegment = "BSE_EQ";
//         else if (rawExchange === "NFO") exchangeSegment = "NSE_FNO";
//         else if (rawExchange === "MCX") exchangeSegment = "MCX_COMM";
//         else exchangeSegment = rawExchange;

//         if (upperSymbol.includes("NIFTY") || upperSymbol.includes("SENSEX") || upperSymbol === "BANKNIFTY" || upperSymbol === "NIFTY BANK") {
//             exchangeSegment = "IDX_I";
//         }

//         const instrumentType = exchangeSegment === "IDX_I" ? "INDEX" : "EQUITY";
//         const cleanSymbolForMap = upperSymbol.replace(' 50', '').trim();
//         const securityId = instrumentData.securityId || dhanIdMap[upperSymbol] || dhanIdMap[cleanSymbolForMap] || "25";
        
//         let timeframe = "5"; 
//         if (strategy.config?.timeframe) timeframe = strategy.config.timeframe.toString().replace('m', '');
//         else if (strategy.data?.config?.timeframe) timeframe = strategy.data.config.timeframe.toString().replace('m', '');
//         else if (strategy.entrySettings?.timeframe) timeframe = strategy.entrySettings.timeframe.toString().replace('m', '');
//         else if (strategy.data?.entrySettings?.timeframe) timeframe = strategy.data.entrySettings.timeframe.toString().replace('m', '');

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

//         if (shouldFetchFromDhan) {
//             const broker = await Broker.findOne({ engineOn: true });
//             if (!broker) return res.status(400).json({ success: false, message: 'No active broker found for API keys' });

//             const dhanRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, securityId, exchangeSegment, instrumentType, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0], timeframe);
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
//                 return res.status(404).json({ success: false, errorType: "NO_DATA", message: "Data not available for this period." });
//             }
//         }

//         console.log(`📊 Processing ${cachedData.length} Real Candles...`);

//         // ==========================================
//         // 🧠 THE UNIVERSAL INDICATOR ENGINE 🧠
//         // ==========================================
//         const calculateIndicator = (indConfig, candles) => {
//             if (!indConfig || !indConfig.id) return null;
            
//             // 🔥 FIX: Clean ID to prevent invisible space issues
//             const indId = indConfig.id.trim().toLowerCase();

//             if (indId === 'number' || indId === 'static') {
//                 const staticVal = Number(indConfig.value) || Number(indConfig.params?.Value) || Number(indConfig.params?.value) || 0;
//                 return candles.map(() => staticVal);
//             }

//             const closePrices = candles.map(c => parseFloat(c.close) || 0);
//             const highPrices = candles.map(c => parseFloat(c.high) || 0);
//             const lowPrices = candles.map(c => parseFloat(c.low) || 0);
//             const volumes = candles.map(c => parseFloat(c.volume) || 0);
            
//             let results = [];
//             try {
//                 if (indId === 'candle') return closePrices;
//                 if (indId === 'volume') return volumes;
//                 if (indId === 'sma') results = SMA.calculate({ period: Number(indConfig.params?.Period) || 14, values: closePrices });
//                 else if (indId === 'ema') results = EMA.calculate({ period: Number(indConfig.params?.Period) || 9, values: closePrices });
//                 else if (indId === 'rsi') results = RSI.calculate({ period: Number(indConfig.params?.Period) || 14, values: closePrices });
//                 else if (indId === 'macd') {
//                     const macdOutput = MACD.calculate({ values: closePrices, fastPeriod: Number(indConfig.params?.['Fast MA']) || 12, slowPeriod: Number(indConfig.params?.['Slow MA']) || 26, signalPeriod: Number(indConfig.params?.Signal) || 9, SimpleMAOscillator: false, SimpleMASignal: false });
//                     const lineType = indConfig.params?.Line || 'MACD Line';
//                     results = macdOutput.map(m => lineType === 'Signal Line' ? m.signal : (lineType === 'Histogram' ? m.histogram : m.MACD));
//                 }
//                 else if (indId === 'bb') {
//                     const bbOutput = BollingerBands.calculate({ period: Number(indConfig.params?.Period) || 20, values: closePrices, stdDev: Number(indConfig.params?.StdDev) || 2 });
//                     const lineType = indConfig.params?.Line || 'Upper';
//                     results = bbOutput.map(b => lineType === 'Lower' ? b.lower : (lineType === 'Middle' ? b.middle : b.upper));
//                 }
//                 else if (indId === 'atr') results = ATR.calculate({ high: highPrices, low: lowPrices, close: closePrices, period: Number(indConfig.params?.Period) || 14 });
//                 else if (indId === 'supertrend') {
//                     const period = Number(indConfig.params?.Period) || 7;
//                     const multiplier = Number(indConfig.params?.Multiplier) || 3;
//                     const atrResult = ATR.calculate({ high: highPrices, low: lowPrices, close: closePrices, period });
//                     let stArray = []; let finalUpper = 0, finalLower = 0, isUptrend = true;
//                     for (let i = 0; i < closePrices.length; i++) {
//                         if (i < period) { stArray.push(null); continue; }
//                         let atr = atrResult[i - period];
//                         let basicUpper = (highPrices[i] + lowPrices[i]) / 2 + (multiplier * atr);
//                         let basicLower = (highPrices[i] + lowPrices[i]) / 2 - (multiplier * atr);
//                         if (i === period) { finalUpper = basicUpper; finalLower = basicLower; } 
//                         else {
//                             finalUpper = (basicUpper < finalUpper || closePrices[i-1] > finalUpper) ? basicUpper : finalUpper;
//                             finalLower = (basicLower > finalLower || closePrices[i-1] < finalLower) ? basicLower : finalLower;
//                         }
//                         if (closePrices[i] > finalUpper) isUptrend = true;
//                         else if (closePrices[i] < finalLower) isUptrend = false;
//                         stArray.push(isUptrend ? finalLower : finalUpper);
//                     }
//                     results = stArray.filter(v => v !== null); 
//                 }

//                 if (results.length > 0) {
//                     const padding = Array(candles.length - results.length).fill(null);
//                     return [...padding, ...results];
//                 }
//                 return Array(candles.length).fill(null);
//             } catch (error) {
//                 console.error(`Error calculating ${indId}:`, error);
//                 return Array(candles.length).fill(null);
//             }
//         };

//         // 🔥 ROBUST EXTRACTION: Har jagah dhundega jahan conditions save ho sakti hain
//         let entryConds = null;
//         if (strategy.entryConditions?.length) entryConds = strategy.entryConditions[0];
//         else if (strategy.data?.entryConditions?.length) entryConds = strategy.data.entryConditions[0];
//         else if (strategy.entrySettings?.entryConditions?.length) entryConds = strategy.entrySettings.entryConditions[0];
//         else if (strategy.data?.entrySettings?.entryConditions?.length) entryConds = strategy.data.entrySettings.entryConditions[0];

//         console.log(`🧠 Extracted Entry Conditions:`, entryConds ? "✅ FOUND" : "❌ NOT FOUND");

//         const calcLongInd1 = []; const calcLongInd2 = [];

//         if (entryConds && entryConds.longRules) {
//             entryConds.longRules.forEach((rule, idx) => {
//                 calcLongInd1[idx] = calculateIndicator(rule.ind1, cachedData);
//                 calcLongInd2[idx] = calculateIndicator(rule.ind2, cachedData);
//             });
//         }

//         const evaluateCondition = (val1, val2, prevVal1, prevVal2, operator) => {
//             if (val1 === null || val2 === null) return false;
//             const op = operator?.trim(); // 🔥 FIX: Clean spaces
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

//         let isPositionOpen = false; let entryPrice = 0;
        
//         // Dynamic Lot size extraction
//         let tradeQuantity = strategy.legs?.[0]?.quantity || strategy.data?.legs?.[0]?.quantity || 15; 
//         if (!tradeQuantity || isNaN(tradeQuantity)) tradeQuantity = 15;

//         cachedData.forEach((candle, i) => {
//             const candleTime = new Date(candle.timestamp).getTime();
//             const istDate = new Date(candleTime + (5.5 * 60 * 60 * 1000));
//             const h = istDate.getUTCHours(); const m = istDate.getUTCMinutes();
//             const timeInMinutes = (h * 60) + m; 
//             const dateStr = istDate.toISOString().split('T')[0];

//             if (!dailyBreakdownMap[dateStr]) dailyBreakdownMap[dateStr] = { pnl: 0, trades: 0 };

//             let longSignal = false;
//             if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
//                 let overallResult = null;
//                 entryConds.longRules.forEach((rule, idx) => {
//                     const val1 = calcLongInd1[idx] ? calcLongInd1[idx][i] : null;
//                     const val2 = calcLongInd2[idx] ? calcLongInd2[idx][i] : null;
//                     const prevVal1 = (i > 0 && calcLongInd1[idx]) ? calcLongInd1[idx][i-1] : null;
//                     const prevVal2 = (i > 0 && calcLongInd2[idx]) ? calcLongInd2[idx][i-1] : null;

//                     const ruleResult = evaluateCondition(val1, val2, prevVal1, prevVal2, rule.op);
//                     if (idx === 0) overallResult = ruleResult;
//                     else {
//                         const logicalOp = entryConds.logicalOps[idx - 1]; 
//                         if (logicalOp === 'AND') overallResult = overallResult && ruleResult;
//                         else if (logicalOp === 'OR') overallResult = overallResult || ruleResult;
//                     }
//                 });
//                 longSignal = overallResult;
//             }

//             const isMarketOpen = timeInMinutes >= 555 && timeInMinutes < 915; // 09:15 to 15:15
//             const isExitTime = timeInMinutes >= 915; // >= 15:15
            
//             let isLastCandleOfDay = false;
//             if (i === cachedData.length - 1) isLastCandleOfDay = true;
//             else {
//                 const nextCandleIst = new Date(new Date(cachedData[i+1].timestamp).getTime() + (5.5 * 60 * 60 * 1000));
//                 if (nextCandleIst.toISOString().split('T')[0] !== dateStr) isLastCandleOfDay = true;
//             }

//             if (!isPositionOpen && longSignal && isMarketOpen) {
//                 isPositionOpen = true;
//                 entryPrice = parseFloat(candle.close);
//                 console.log(`✅ [TRADE OPEN] Date: ${dateStr} | Time: ${h}:${m} | Price: ${entryPrice}`); 
//             }

//             if (isPositionOpen && (isExitTime || isLastCandleOfDay)) {
//                 isPositionOpen = false;
//                 const exitPrice = parseFloat(candle.close);
//                 const pnl = (exitPrice - entryPrice) * tradeQuantity; 
//                 console.log(`❌ [TRADE CLOSE] Date: ${dateStr} | Time: ${h}:${m} | PnL: ${pnl.toFixed(2)}`); 

//                 dailyBreakdownMap[dateStr].pnl += pnl;
//                 dailyBreakdownMap[dateStr].trades += 1;

//                 if (pnl > 0) { winTrades++; if (pnl > maxProfitTrade) maxProfitTrade = pnl; } 
//                 else { lossTrades++; if (pnl < maxLossTrade) maxLossTrade = pnl; }
//             }
//         });

//         for (const [date, data] of Object.entries(dailyBreakdownMap)) {
//             if (data.trades > 0) { 
//                 currentEquity += data.pnl;
//                 if (currentEquity > peakEquity) peakEquity = currentEquity;
//                 const drawdown = currentEquity - peakEquity;
//                 if (drawdown < maxDrawdown) maxDrawdown = drawdown;

//                 if (data.pnl > 0) { winDays++; currentWinStreak++; currentLossStreak = 0; if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak; } 
//                 else { lossDays++; currentLossStreak++; currentWinStreak = 0; if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak; }

//                 equityCurve.push({ date, pnl: currentEquity });
//                 daywiseBreakdown.push({ date, dailyPnL: data.pnl, tradesTaken: data.trades });
//             }
//         }

//         const backtestResult = {
//             summary: { totalPnL: currentEquity, maxDrawdown, tradingDays: winDays + lossDays, winDays, lossDays, totalTrades: winTrades + lossTrades, winTrades, lossTrades, maxWinStreak, maxLossStreak, maxProfit: maxProfitTrade, maxLoss: maxLossTrade },
//             equityCurve, daywiseBreakdown: daywiseBreakdown.reverse()
//         };

//         return res.status(200).json({ success: true, data: backtestResult });

//     } catch (error) {
//         console.error("Backtest Error:", error);
//         res.status(500).json({ success: false, error: "Internal Server Error" });
//     }
// };

// module.exports = { runBacktestSimulator };





// const Strategy = require('../models/Strategy');
// const HistoricalData = require('../models/HistoricalData');
// const Broker = require('../models/Broker');
// const { fetchDhanHistoricalData } = require('../services/dhanService');
// const { SMA, EMA, RSI, MACD, BollingerBands, ATR } = require('technicalindicators');

// const runBacktestSimulator = async (req, res) => {
//     try {
//         const { strategyId } = req.params;
//         const { period, start, end } = req.query;
        
//         const strategy = await Strategy.findById(strategyId);
//         if (!strategy) return res.status(404).json({ error: "Strategy not found" });

//         console.log(`🚀 Running Real Backtest for: ${strategy.name} | Period: ${period || '1M'}`);

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
//             "SENSEX": "51", "BSE SENSEX": "51", "HDFCBANK": "1333", "RELIANCE": "2885"
//         };

//         // 🔥 ROBUST EXTRACTION: Array fallback for nested structures
//         const instrumentsArr = strategy.instruments || strategy.data?.instruments || [];
//         const instrumentData = instrumentsArr.length > 0 ? instrumentsArr[0] : {};
        
//         const symbol = instrumentData.symbol || instrumentData.name || "BANKNIFTY"; 
//         const upperSymbol = symbol.toUpperCase().trim(); 
        
//         let rawExchange = (instrumentData.exchange || "IDX_I").toUpperCase();
//         let exchangeSegment = "IDX_I"; 

//         if (rawExchange === "NSE") exchangeSegment = "NSE_EQ";
//         else if (rawExchange === "BSE") exchangeSegment = "BSE_EQ";
//         else if (rawExchange === "NFO") exchangeSegment = "NSE_FNO";
//         else if (rawExchange === "MCX") exchangeSegment = "MCX_COMM";
//         else exchangeSegment = rawExchange;

//         if (upperSymbol.includes("NIFTY") || upperSymbol.includes("SENSEX") || upperSymbol === "BANKNIFTY" || upperSymbol === "NIFTY BANK") {
//             exchangeSegment = "IDX_I";
//         }

//         const instrumentType = exchangeSegment === "IDX_I" ? "INDEX" : "EQUITY";
//         const cleanSymbolForMap = upperSymbol.replace(' 50', '').trim();
//         const securityId = instrumentData.securityId || dhanIdMap[upperSymbol] || dhanIdMap[cleanSymbolForMap] || "25";
        
//         let timeframe = "5"; 
//         if (strategy.config?.timeframe) timeframe = strategy.config.timeframe.toString().replace('m', '');
//         else if (strategy.data?.config?.timeframe) timeframe = strategy.data.config.timeframe.toString().replace('m', '');
//         else if (strategy.entrySettings?.timeframe) timeframe = strategy.entrySettings.timeframe.toString().replace('m', '');
//         else if (strategy.data?.entrySettings?.timeframe) timeframe = strategy.data.entrySettings.timeframe.toString().replace('m', '');

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

//         if (shouldFetchFromDhan) {
//             const broker = await Broker.findOne({ engineOn: true });
//             if (!broker) return res.status(400).json({ success: false, message: 'No active broker found for API keys' });

//             const dhanRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, securityId, exchangeSegment, instrumentType, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0], timeframe);
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
//                 return res.status(404).json({ success: false, errorType: "NO_DATA", message: "Data not available for this period." });
//             }
//         }

//         console.log(`📊 Processing ${cachedData.length} Real Candles...`);

//         // ==========================================
//         // 🧠 THE UNIVERSAL INDICATOR ENGINE 🧠
//         // ==========================================
//         const calculateIndicator = (indConfig, candles) => {
//             if (!indConfig || !indConfig.id) return null;
            
//             // 🔥 FIX: Clean ID to prevent invisible space issues
//             const indId = indConfig.id.trim().toLowerCase();

//             if (indId === 'number' || indId === 'static') {
//                 const staticVal = Number(indConfig.value) || Number(indConfig.params?.Value) || Number(indConfig.params?.value) || 0;
//                 return candles.map(() => staticVal);
//             }

//             const closePrices = candles.map(c => parseFloat(c.close) || 0);
//             const highPrices = candles.map(c => parseFloat(c.high) || 0);
//             const lowPrices = candles.map(c => parseFloat(c.low) || 0);
//             const volumes = candles.map(c => parseFloat(c.volume) || 0);
            
//             let results = [];
//             try {
//                 if (indId === 'candle') return closePrices;
//                 if (indId === 'volume') return volumes;
//                 if (indId === 'sma') results = SMA.calculate({ period: Number(indConfig.params?.Period) || 14, values: closePrices });
//                 else if (indId === 'ema') results = EMA.calculate({ period: Number(indConfig.params?.Period) || 9, values: closePrices });
//                 else if (indId === 'rsi') results = RSI.calculate({ period: Number(indConfig.params?.Period) || 14, values: closePrices });
//                 else if (indId === 'macd') {
//                     const macdOutput = MACD.calculate({ values: closePrices, fastPeriod: Number(indConfig.params?.['Fast MA']) || 12, slowPeriod: Number(indConfig.params?.['Slow MA']) || 26, signalPeriod: Number(indConfig.params?.Signal) || 9, SimpleMAOscillator: false, SimpleMASignal: false });
//                     const lineType = indConfig.params?.Line || 'MACD Line';
//                     results = macdOutput.map(m => lineType === 'Signal Line' ? m.signal : (lineType === 'Histogram' ? m.histogram : m.MACD));
//                 }
//                 else if (indId === 'bb') {
//                     const bbOutput = BollingerBands.calculate({ period: Number(indConfig.params?.Period) || 20, values: closePrices, stdDev: Number(indConfig.params?.StdDev) || 2 });
//                     const lineType = indConfig.params?.Line || 'Upper';
//                     results = bbOutput.map(b => lineType === 'Lower' ? b.lower : (lineType === 'Middle' ? b.middle : b.upper));
//                 }
//                 else if (indId === 'atr') results = ATR.calculate({ high: highPrices, low: lowPrices, close: closePrices, period: Number(indConfig.params?.Period) || 14 });
//                 else if (indId === 'supertrend') {
//                     const period = Number(indConfig.params?.Period) || 7;
//                     const multiplier = Number(indConfig.params?.Multiplier) || 3;
//                     const atrResult = ATR.calculate({ high: highPrices, low: lowPrices, close: closePrices, period });
//                     let stArray = []; let finalUpper = 0, finalLower = 0, isUptrend = true;
//                     for (let i = 0; i < closePrices.length; i++) {
//                         if (i < period) { stArray.push(null); continue; }
//                         let atr = atrResult[i - period];
//                         let basicUpper = (highPrices[i] + lowPrices[i]) / 2 + (multiplier * atr);
//                         let basicLower = (highPrices[i] + lowPrices[i]) / 2 - (multiplier * atr);
//                         if (i === period) { finalUpper = basicUpper; finalLower = basicLower; } 
//                         else {
//                             finalUpper = (basicUpper < finalUpper || closePrices[i-1] > finalUpper) ? basicUpper : finalUpper;
//                             finalLower = (basicLower > finalLower || closePrices[i-1] < finalLower) ? basicLower : finalLower;
//                         }
//                         if (closePrices[i] > finalUpper) isUptrend = true;
//                         else if (closePrices[i] < finalLower) isUptrend = false;
//                         stArray.push(isUptrend ? finalLower : finalUpper);
//                     }
//                     results = stArray.filter(v => v !== null); 
//                 }

//                 if (results.length > 0) {
//                     const padding = Array(candles.length - results.length).fill(null);
//                     return [...padding, ...results];
//                 }
//                 return Array(candles.length).fill(null);
//             } catch (error) {
//                 console.error(`Error calculating ${indId}:`, error);
//                 return Array(candles.length).fill(null);
//             }
//         };

//         // 🔥 ROBUST EXTRACTION: Har jagah dhundega jahan conditions save ho sakti hain
//         let entryConds = null;
//         if (strategy.entryConditions?.length) entryConds = strategy.entryConditions[0];
//         else if (strategy.data?.entryConditions?.length) entryConds = strategy.data.entryConditions[0];
//         else if (strategy.entrySettings?.entryConditions?.length) entryConds = strategy.entrySettings.entryConditions[0];
//         else if (strategy.data?.entrySettings?.entryConditions?.length) entryConds = strategy.data.entrySettings.entryConditions[0];

//         console.log(`🧠 Extracted Entry Conditions:`, entryConds ? "✅ FOUND" : "❌ NOT FOUND");

//         const calcLongInd1 = []; const calcLongInd2 = [];

//         if (entryConds && entryConds.longRules) {
//             entryConds.longRules.forEach((rule, idx) => {
//                 calcLongInd1[idx] = calculateIndicator(rule.ind1, cachedData);
//                 calcLongInd2[idx] = calculateIndicator(rule.ind2, cachedData);
//             });
//         }

//         const evaluateCondition = (val1, val2, prevVal1, prevVal2, operator) => {
//             if (val1 === null || val2 === null) return false;
//             const op = operator?.trim(); // 🔥 FIX: Clean spaces
//             switch(op) {
//                 case 'Greater Than': return val1 > val2;
//                 case 'Less Than': return val1 < val2;
//                 case 'Equals': return val1 === val2;
//                 case 'Crosses Above': return prevVal1 !== null && prevVal2 !== null && prevVal1 <= prevVal2 && val1 > val2; 
//                 case 'Crosses Below': return prevVal1 !== null && prevVal2 !== null && prevVal1 >= prevVal2 && val1 < val2; 
//                 default: return false;
//             }
//         };

//         // ==========================================
//         // 4. METRICS & ENGINE LOOP
//         // ==========================================
//         let currentEquity = 0, peakEquity = 0, maxDrawdown = 0;
//         let winDays = 0, lossDays = 0, winTrades = 0, lossTrades = 0;
//         let currentWinStreak = 0, currentLossStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
//         let maxProfitTrade = 0, maxLossTrade = 0;
//         const equityCurve = []; const daywiseBreakdown = []; let dailyBreakdownMap = {}; 

//         let isPositionOpen = false; let entryPrice = 0;
//         let currentTrade = null; // 🔥 NEW: Individual trade ko track karne ke liye
        
//         let tradeQuantity = strategy.legs?.[0]?.quantity || strategy.data?.legs?.[0]?.quantity || 15; 
//         if (!tradeQuantity || isNaN(tradeQuantity)) tradeQuantity = 15;

//         cachedData.forEach((candle, i) => {
//             const candleTime = new Date(candle.timestamp).getTime();
//             const istDate = new Date(candleTime + (5.5 * 60 * 60 * 1000));
            
//             // Format hours and minutes with leading zero (e.g., 09:15)
//             const h = String(istDate.getUTCHours()).padStart(2, '0'); 
//             const m = String(istDate.getUTCMinutes()).padStart(2, '0');
//             const timeInMinutes = (istDate.getUTCHours() * 60) + istDate.getUTCMinutes(); 
//             const dateStr = istDate.toISOString().split('T')[0];

//             if (!dailyBreakdownMap[dateStr]) {
//                 dailyBreakdownMap[dateStr] = { pnl: 0, trades: 0, tradesList: [] }; // 🔥 NEW: tradesList array
//             }

//             let longSignal = false;
//             if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
//                 let overallResult = null;
//                 entryConds.longRules.forEach((rule, idx) => {
//                     const val1 = calcLongInd1[idx] ? calcLongInd1[idx][i] : null;
//                     const val2 = calcLongInd2[idx] ? calcLongInd2[idx][i] : null;
//                     const prevVal1 = (i > 0 && calcLongInd1[idx]) ? calcLongInd1[idx][i-1] : null;
//                     const prevVal2 = (i > 0 && calcLongInd2[idx]) ? calcLongInd2[idx][i-1] : null;

//                     const ruleResult = evaluateCondition(val1, val2, prevVal1, prevVal2, rule.op);
//                     if (idx === 0) overallResult = ruleResult;
//                     else {
//                         const logicalOp = entryConds.logicalOps[idx - 1]; 
//                         if (logicalOp === 'AND') overallResult = overallResult && ruleResult;
//                         else if (logicalOp === 'OR') overallResult = overallResult || ruleResult;
//                     }
//                 });
//                 longSignal = overallResult;
//             }

//             const isMarketOpen = timeInMinutes >= 555 && timeInMinutes < 915; // 09:15 to 15:15
//             const isExitTime = timeInMinutes >= 915; // >= 15:15
            
//             let isLastCandleOfDay = false;
//             if (i === cachedData.length - 1) isLastCandleOfDay = true;
//             else {
//                 const nextCandleIst = new Date(new Date(cachedData[i+1].timestamp).getTime() + (5.5 * 60 * 60 * 1000));
//                 if (nextCandleIst.toISOString().split('T')[0] !== dateStr) isLastCandleOfDay = true;
//             }

//             // 🟢 TAKE TRADE (ENTRY)
//             if (!isPositionOpen && longSignal && isMarketOpen) {
//                 isPositionOpen = true;
//                 entryPrice = parseFloat(candle.close);
                
//                 // 🔥 NEW: Trade Object banayein
//                 currentTrade = {
//                     symbol: upperSymbol,
//                     transaction: "BUY",
//                     quantity: tradeQuantity,
//                     entryTime: `${h}:${m}:00`,
//                     entryPrice: entryPrice,
//                     exitTime: null,
//                     exitPrice: null,
//                     pnl: null,
//                     exitType: null
//                 };
//             }

//             // 🔴 EXIT TRADE (EXIT)
//             if (isPositionOpen && (isExitTime || isLastCandleOfDay)) {
//                 isPositionOpen = false;
//                 const exitPrice = parseFloat(candle.close);
//                 const pnl = (exitPrice - entryPrice) * tradeQuantity; 

//                 // 🔥 NEW: Trade Object complete karein aur list me daalein
//                 currentTrade.exitTime = `${h}:${m}:00`;
//                 currentTrade.exitPrice = exitPrice;
//                 currentTrade.pnl = pnl;
//                 currentTrade.exitType = isLastCandleOfDay ? "EOD_SQUAREOFF" : "TIME_SQUAREOFF";

//                 dailyBreakdownMap[dateStr].tradesList.push(currentTrade);
//                 currentTrade = null; // Reset for next trade

//                 dailyBreakdownMap[dateStr].pnl += pnl;
//                 dailyBreakdownMap[dateStr].trades += 1;

//                 if (pnl > 0) { winTrades++; if (pnl > maxProfitTrade) maxProfitTrade = pnl; } 
//                 else { lossTrades++; if (pnl < maxLossTrade) maxLossTrade = pnl; }
//             }
//         });

//         // ==========================================
//         // 5. DAILY LOOP (UI Format Conversion)
//         // ==========================================
//         for (const [date, data] of Object.entries(dailyBreakdownMap)) {
//             if (data.trades > 0) { 
//                 currentEquity += data.pnl;
//                 if (currentEquity > peakEquity) peakEquity = currentEquity;
//                 const drawdown = currentEquity - peakEquity;
//                 if (drawdown < maxDrawdown) maxDrawdown = drawdown;

//                 if (data.pnl > 0) { winDays++; currentWinStreak++; currentLossStreak = 0; if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak; } 
//                 else { lossDays++; currentLossStreak++; currentWinStreak = 0; if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak; }

//                 equityCurve.push({ date, pnl: currentEquity });
//                 // 🔥 NEW: Frontend ko tradesList bhi bhej rahe hain
//                 daywiseBreakdown.push({ 
//                     date, 
//                     dailyPnL: data.pnl, 
//                     tradesTaken: data.trades,
//                     tradesList: data.tradesList 
//                 });
//             }
//         }

//         // ==========================================
//         // 6. RETURN RESULT
//         // ==========================================
//         const backtestResult = {
//             summary: { totalPnL: currentEquity, maxDrawdown, tradingDays: winDays + lossDays, winDays, lossDays, totalTrades: winTrades + lossTrades, winTrades, lossTrades, maxWinStreak, maxLossStreak, maxProfit: maxProfitTrade, maxLoss: maxLossTrade },
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




// const Strategy = require('../models/Strategy');
// const HistoricalData = require('../models/HistoricalData');
// const Broker = require('../models/Broker');
// const { fetchDhanHistoricalData } = require('../services/dhanService');
// const { SMA, EMA, RSI, MACD, BollingerBands, ATR } = require('technicalindicators');


// const runBacktestSimulator = async (req, res) => {
//     try {
//         const { strategyId } = req.params;
//         const { period, start, end } = req.query;
        
//         const strategy = await Strategy.findById(strategyId);
//         if (!strategy) return res.status(404).json({ error: "Strategy not found" });

//         console.log(`🚀 Running Real Backtest for: ${strategy.name} | Period: ${period || '1M'}`);

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
//             "SENSEX": "51", "BSE SENSEX": "51", "HDFCBANK": "1333", "RELIANCE": "2885"
//         };

//         // 🔥 ROBUST EXTRACTION: Array fallback for nested structures
//         const instrumentsArr = strategy.instruments || strategy.data?.instruments || [];
//         const instrumentData = instrumentsArr.length > 0 ? instrumentsArr[0] : {};
        
//         const symbol = instrumentData.symbol || instrumentData.name || "BANKNIFTY"; 
//         const upperSymbol = symbol.toUpperCase().trim(); 
        
//         let rawExchange = (instrumentData.exchange || "IDX_I").toUpperCase();
//         let exchangeSegment = "IDX_I"; 

//         if (rawExchange === "NSE") exchangeSegment = "NSE_EQ";
//         else if (rawExchange === "BSE") exchangeSegment = "BSE_EQ";
//         else if (rawExchange === "NFO") exchangeSegment = "NSE_FNO";
//         else if (rawExchange === "MCX") exchangeSegment = "MCX_COMM";
//         else exchangeSegment = rawExchange;

//         if (upperSymbol.includes("NIFTY") || upperSymbol.includes("SENSEX") || upperSymbol === "BANKNIFTY" || upperSymbol === "NIFTY BANK") {
//             exchangeSegment = "IDX_I";
//         }

//         const instrumentType = exchangeSegment === "IDX_I" ? "INDEX" : "EQUITY";
//         const cleanSymbolForMap = upperSymbol.replace(' 50', '').trim();
//         const securityId = instrumentData.securityId || dhanIdMap[upperSymbol] || dhanIdMap[cleanSymbolForMap] || "25";
        
//         let timeframe = "5"; 
//         if (strategy.config?.timeframe) timeframe = strategy.config.timeframe.toString().replace('m', '');
//         else if (strategy.data?.config?.timeframe) timeframe = strategy.data.config.timeframe.toString().replace('m', '');
//         else if (strategy.entrySettings?.timeframe) timeframe = strategy.entrySettings.timeframe.toString().replace('m', '');
//         else if (strategy.data?.entrySettings?.timeframe) timeframe = strategy.data.entrySettings.timeframe.toString().replace('m', '');

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

//         if (shouldFetchFromDhan) {
//             const broker = await Broker.findOne({ engineOn: true });
//             if (!broker) return res.status(400).json({ success: false, message: 'No active broker found for API keys' });

//             const dhanRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, securityId, exchangeSegment, instrumentType, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0], timeframe);
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
//                 return res.status(404).json({ success: false, errorType: "NO_DATA", message: "Data not available for this period." });
//             }
//         }

//         console.log(`📊 Processing ${cachedData.length} Real Candles...`);

//         // ==========================================
//         // 🧠 THE UNIVERSAL INDICATOR ENGINE 🧠
//         // ==========================================
//         const calculateIndicator = (indConfig, candles) => {
//             if (!indConfig || !indConfig.id) return null;
            
//             // 🔥 FIX: Clean ID to prevent invisible space issues
//             const indId = indConfig.id.trim().toLowerCase();

//             if (indId === 'number' || indId === 'static') {
//                 const staticVal = Number(indConfig.value) || Number(indConfig.params?.Value) || Number(indConfig.params?.value) || 0;
//                 return candles.map(() => staticVal);
//             }

//             const closePrices = candles.map(c => parseFloat(c.close) || 0);
//             const highPrices = candles.map(c => parseFloat(c.high) || 0);
//             const lowPrices = candles.map(c => parseFloat(c.low) || 0);
//             const volumes = candles.map(c => parseFloat(c.volume) || 0);
            
//             let results = [];
//             try {
//                 if (indId === 'candle') return closePrices;
//                 if (indId === 'volume') return volumes;
//                 if (indId === 'sma') results = SMA.calculate({ period: Number(indConfig.params?.Period) || 14, values: closePrices });
//                 else if (indId === 'ema') results = EMA.calculate({ period: Number(indConfig.params?.Period) || 9, values: closePrices });
//                 else if (indId === 'rsi') results = RSI.calculate({ period: Number(indConfig.params?.Period) || 14, values: closePrices });
//                 else if (indId === 'macd') {
//                     const macdOutput = MACD.calculate({ values: closePrices, fastPeriod: Number(indConfig.params?.['Fast MA']) || 12, slowPeriod: Number(indConfig.params?.['Slow MA']) || 26, signalPeriod: Number(indConfig.params?.Signal) || 9, SimpleMAOscillator: false, SimpleMASignal: false });
//                     const lineType = indConfig.params?.Line || 'MACD Line';
//                     results = macdOutput.map(m => lineType === 'Signal Line' ? m.signal : (lineType === 'Histogram' ? m.histogram : m.MACD));
//                 }
//                 else if (indId === 'bb') {
//                     const bbOutput = BollingerBands.calculate({ period: Number(indConfig.params?.Period) || 20, values: closePrices, stdDev: Number(indConfig.params?.StdDev) || 2 });
//                     const lineType = indConfig.params?.Line || 'Upper';
//                     results = bbOutput.map(b => lineType === 'Lower' ? b.lower : (lineType === 'Middle' ? b.middle : b.upper));
//                 }
//                 else if (indId === 'atr') results = ATR.calculate({ high: highPrices, low: lowPrices, close: closePrices, period: Number(indConfig.params?.Period) || 14 });
//                 else if (indId === 'supertrend') {
//                     const period = Number(indConfig.params?.Period) || 7;
//                     const multiplier = Number(indConfig.params?.Multiplier) || 3;
//                     const atrResult = ATR.calculate({ high: highPrices, low: lowPrices, close: closePrices, period });
//                     let stArray = []; let finalUpper = 0, finalLower = 0, isUptrend = true;
//                     for (let i = 0; i < closePrices.length; i++) {
//                         if (i < period) { stArray.push(null); continue; }
//                         let atr = atrResult[i - period];
//                         let basicUpper = (highPrices[i] + lowPrices[i]) / 2 + (multiplier * atr);
//                         let basicLower = (highPrices[i] + lowPrices[i]) / 2 - (multiplier * atr);
//                         if (i === period) { finalUpper = basicUpper; finalLower = basicLower; } 
//                         else {
//                             finalUpper = (basicUpper < finalUpper || closePrices[i-1] > finalUpper) ? basicUpper : finalUpper;
//                             finalLower = (basicLower > finalLower || closePrices[i-1] < finalLower) ? basicLower : finalLower;
//                         }
//                         if (closePrices[i] > finalUpper) isUptrend = true;
//                         else if (closePrices[i] < finalLower) isUptrend = false;
//                         stArray.push(isUptrend ? finalLower : finalUpper);
//                     }
//                     results = stArray.filter(v => v !== null); 
//                 }

//                 if (results.length > 0) {
//                     const padding = Array(candles.length - results.length).fill(null);
//                     return [...padding, ...results];
//                 }
//                 return Array(candles.length).fill(null);
//             } catch (error) {
//                 console.error(`Error calculating ${indId}:`, error);
//                 return Array(candles.length).fill(null);
//             }
//         };

//         // 🔥 ROBUST EXTRACTION: Har jagah dhundega jahan conditions save ho sakti hain
//         let entryConds = null;
//         if (strategy.entryConditions?.length) entryConds = strategy.entryConditions[0];
//         else if (strategy.data?.entryConditions?.length) entryConds = strategy.data.entryConditions[0];
//         else if (strategy.entrySettings?.entryConditions?.length) entryConds = strategy.entrySettings.entryConditions[0];
//         else if (strategy.data?.entrySettings?.entryConditions?.length) entryConds = strategy.data.entrySettings.entryConditions[0];

//         console.log(`🧠 Extracted Entry Conditions:`, entryConds ? "✅ FOUND" : "❌ NOT FOUND");

//         const calcLongInd1 = []; const calcLongInd2 = [];

//         if (entryConds && entryConds.longRules) {
//             entryConds.longRules.forEach((rule, idx) => {
//                 calcLongInd1[idx] = calculateIndicator(rule.ind1, cachedData);
//                 calcLongInd2[idx] = calculateIndicator(rule.ind2, cachedData);
//             });
//         }

//         const evaluateCondition = (val1, val2, prevVal1, prevVal2, operator) => {
//             if (val1 === null || val2 === null) return false;
//             const op = operator?.trim(); // 🔥 FIX: Clean spaces
//             switch(op) {
//                 case 'Greater Than': return val1 > val2;
//                 case 'Less Than': return val1 < val2;
//                 case 'Equals': return val1 === val2;
//                 case 'Crosses Above': return prevVal1 !== null && prevVal2 !== null && prevVal1 <= prevVal2 && val1 > val2; 
//                 case 'Crosses Below': return prevVal1 !== null && prevVal2 !== null && prevVal1 >= prevVal2 && val1 < val2; 
//                 default: return false;
//             }
//         };

//        // ==========================================
//         // 4. METRICS & ENGINE LOOP
//         // ==========================================
//         let currentEquity = 0, peakEquity = 0, maxDrawdown = 0;
//         let winDays = 0, lossDays = 0, winTrades = 0, lossTrades = 0;
//         let currentWinStreak = 0, currentLossStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
//         let maxProfitTrade = 0, maxLossTrade = 0;
//         const equityCurve = []; const daywiseBreakdown = []; let dailyBreakdownMap = {}; 

//         let isPositionOpen = false; let entryPrice = 0;
//         let currentTrade = null; 
        
//         // 🔥 FIX 2: Smart Quantity Logic (Banknifty = 30, Nifty = 50)
//         let tradeQuantity = strategy.legs?.[0]?.quantity || strategy.data?.legs?.[0]?.quantity; 
//         if (!tradeQuantity || isNaN(tradeQuantity)) {
//             tradeQuantity = upperSymbol.includes("BANK") ? 30 : (upperSymbol.includes("NIFTY") ? 50 : 1);
//         }

//         cachedData.forEach((candle, i) => {
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

//                     const ruleResult = evaluateCondition(val1, val2, prevVal1, prevVal2, rule.op);
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

//             // 🟢 TAKE TRADE (ENTRY)
//             if (!isPositionOpen && longSignal && isMarketOpen) {
//                 isPositionOpen = true;
//                 entryPrice = parseFloat(candle.close);
                
//                 currentTrade = {
//                     symbol: upperSymbol,
//                     transaction: "BUY",
//                     quantity: tradeQuantity,
//                     entryTime: `${h}:${m}:00`,
//                     entryPrice: entryPrice,
//                     exitTime: null,
//                     exitPrice: null,
//                     pnl: null,
//                     exitType: null
//                 };
//                 // 🔥 FIX 5: Render Console Logs wapas aa gaye
//                 console.log(`✅ [TRADE OPEN] Date: ${dateStr} | Time: ${h}:${m} | Price: ${entryPrice} | Qty: ${tradeQuantity}`);
//             }

//             // 🔴 EXIT TRADE (EXIT)
//             if (isPositionOpen && (isExitTime || isLastCandleOfDay)) {
//                 isPositionOpen = false;
//                 const exitPrice = parseFloat(candle.close);
//                 const pnl = (exitPrice - entryPrice) * tradeQuantity; 

//                 if(currentTrade) {
//                     currentTrade.exitTime = `${h}:${m}:00`;
//                     currentTrade.exitPrice = exitPrice;
//                     currentTrade.pnl = pnl;
//                     currentTrade.exitType = isLastCandleOfDay ? "EOD_SQUAREOFF" : "TIME_SQUAREOFF";
//                     dailyBreakdownMap[dateStr].tradesList.push(currentTrade);
//                     currentTrade = null; 
//                 }

//                 // 🔥 FIX 5: Render Console Logs wapas aa gaye
//                 console.log(`❌ [TRADE CLOSE] Date: ${dateStr} | Time: ${h}:${m} | PnL: ${pnl.toFixed(2)}`);

//                 dailyBreakdownMap[dateStr].pnl += pnl;
//                 dailyBreakdownMap[dateStr].trades += 1;

//                 if (pnl > 0) { winTrades++; if (pnl > maxProfitTrade) maxProfitTrade = pnl; } 
//                 else { lossTrades++; if (pnl < maxLossTrade) maxLossTrade = pnl; }
//             }
//         });

//         for (const [date, data] of Object.entries(dailyBreakdownMap)) {
//             if (data.trades > 0) { 
//                 currentEquity += data.pnl;
//                 if (currentEquity > peakEquity) peakEquity = currentEquity;
//                 const drawdown = currentEquity - peakEquity;
//                 if (drawdown < maxDrawdown) maxDrawdown = drawdown;

//                 if (data.pnl > 0) { winDays++; currentWinStreak++; currentLossStreak = 0; if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak; } 
//                 else { lossDays++; currentLossStreak++; currentWinStreak = 0; if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak; }

//                 equityCurve.push({ date, pnl: currentEquity });
//                 daywiseBreakdown.push({ date, dailyPnL: data.pnl, tradesTaken: data.trades, tradesList: data.tradesList });
//             }
//         }

//         const backtestResult = {
//             summary: { totalPnL: currentEquity, maxDrawdown, tradingDays: winDays + lossDays, winDays, lossDays, totalTrades: winTrades + lossTrades, winTrades, lossTrades, maxWinStreak, maxLossStreak, maxProfit: maxProfitTrade, maxLoss: maxLossTrade },
//             equityCurve, daywiseBreakdown: daywiseBreakdown.reverse()
//         };

//         return res.status(200).json({ success: true, data: backtestResult });

//     } catch (error) {
//         console.error("Backtest Error:", error);
//         res.status(500).json({ success: false, error: "Internal Server Error" });
//     }
// };

// module.exports = { runBacktestSimulator };



const Strategy = require('../models/Strategy');
const HistoricalData = require('../models/HistoricalData');
const Broker = require('../models/Broker');
const { fetchDhanHistoricalData } = require('../services/dhanService');
const { SMA, EMA, RSI, MACD, BollingerBands, ATR } = require('technicalindicators');
// Make sure this path matches where your instrumentService.js is located
const { getOptionSecurityId } = require('../services/instrumentService');

const runBacktestSimulator = async (req, res) => {
    try {
        const { strategyId } = req.params;
        const { period, start, end } = req.query;
        
        const strategy = await Strategy.findById(strategyId);
        if (!strategy) return res.status(404).json({ error: "Strategy not found" });

        console.log(`🚀 Running Real Backtest for: ${strategy.name} | Period: ${period || '1M'}`);

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
        
        // Is this strategy for Options or Equity/Spot?
        const isOptionsTrade = instrumentData.segment === "Option" || instrumentData.segment === "NFO";
        
        // Spot Exchange handling
        let exchangeSegment = "IDX_I"; 
        if (upperSymbol.includes("NIFTY") || upperSymbol.includes("SENSEX") || upperSymbol === "BANKNIFTY" || upperSymbol === "NIFTY BANK") {
            exchangeSegment = "IDX_I";
        }

        const cleanSymbolForMap = upperSymbol.replace(' 50', '').trim();
        const spotSecurityId = instrumentData.securityId || dhanIdMap[upperSymbol] || dhanIdMap[cleanSymbolForMap] || "25";
        
        let timeframe = strategy.interval ? strategy.interval.replace(' min', '') : "5"; 
        
        // --------------------------------------------------------
        // STEP 1: FETCH SPOT DATA (For Signal Generation)
        // --------------------------------------------------------
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

        console.log(`📊 Processing ${cachedData.length} Real Candles for Signals...`);

        // ==========================================
        // 🧠 THE UNIVERSAL INDICATOR ENGINE 🧠
        // ==========================================
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
            } catch (error) {
                return Array(candles.length).fill(null);
            }
        };

        let entryConds = null;
        if (strategy.entryConditions?.length) entryConds = strategy.entryConditions[0];
        else if (strategy.data?.entryConditions?.length) entryConds = strategy.data.entryConditions[0];

        const calcLongInd1 = []; const calcLongInd2 = [];
        if (entryConds && entryConds.longRules) {
            entryConds.longRules.forEach((rule, idx) => {
                const params1 = rule.ind1?.params || rule.params; 
                calcLongInd1[idx] = calculateIndicator({...rule.ind1, params: params1}, cachedData);
                calcLongInd2[idx] = calculateIndicator(rule.ind2, cachedData);
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

        // ==========================================
        // 4. METRICS & OPTIONS ENGINE LOOP
        // ==========================================
        let currentEquity = 0, peakEquity = 0, maxDrawdown = 0;
        let winDays = 0, lossDays = 0, winTrades = 0, lossTrades = 0;
        let currentWinStreak = 0, currentLossStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
        let maxProfitTrade = 0, maxLossTrade = 0;
        const equityCurve = []; const daywiseBreakdown = []; let dailyBreakdownMap = {}; 

        let isPositionOpen = false; 
        let currentTrade = null; 
        
        let tradeQuantity = strategy.legs?.[0]?.quantity || 15; 
        const legData = strategy.legs?.[0] || {};
        const optionType = legData.optionType === "Put" ? "PE" : "CE";
        const transactionType = legData.action || "BUY";
        const strikeCriteria = legData.strikeType || "ATM"; // ATM, ITM, OTM

        // 🔥 Helper: Spot Price se ATM nikalna (Banknifty 100 ka multiple, Nifty 50 ka multiple)
        const calculateATM = (spotPrice, symbolStr) => {
            if(symbolStr.includes("BANK")) return Math.round(spotPrice / 100) * 100;
            return Math.round(spotPrice / 50) * 50;
        };

        // Helper: PnL Calculation based on Buy/Sell
        const calcTradePnL = (entryP, exitP, qty, action) => {
            if(action === "BUY") return (exitP - entryP) * qty;
            return (entryP - exitP) * qty; // If Short Sold
        };

        for (let i = 0; i < cachedData.length; i++) {
            const candle = cachedData[i];
            const candleTime = new Date(candle.timestamp).getTime();
            const istDate = new Date(candleTime + (5.5 * 60 * 60 * 1000));
            const h = String(istDate.getUTCHours()).padStart(2, '0'); 
            const m = String(istDate.getUTCMinutes()).padStart(2, '0');
            const timeInMinutes = (istDate.getUTCHours() * 60) + istDate.getUTCMinutes(); 
            const dateStr = istDate.toISOString().split('T')[0];

            if (!dailyBreakdownMap[dateStr]) dailyBreakdownMap[dateStr] = { pnl: 0, trades: 0, tradesList: [] };

            let longSignal = false;
            if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
                let overallResult = null;
                entryConds.longRules.forEach((rule, idx) => {
                    const val1 = calcLongInd1[idx] ? calcLongInd1[idx][i] : null;
                    const val2 = calcLongInd2[idx] ? calcLongInd2[idx][i] : null;
                    const prevVal1 = (i > 0 && calcLongInd1[idx]) ? calcLongInd1[idx][i-1] : null;
                    const prevVal2 = (i > 0 && calcLongInd2[idx]) ? calcLongInd2[idx][i-1] : null;

                    const ruleResult = evaluateCondition(val1, val2, prevVal1, prevVal2, rule.op || rule.params?.op);
                    if (idx === 0) overallResult = ruleResult;
                    else {
                        const logicalOp = entryConds.logicalOps[idx - 1]; 
                        if (logicalOp === 'AND') overallResult = overallResult && ruleResult;
                        else if (logicalOp === 'OR') overallResult = overallResult || ruleResult;
                    }
                });
                longSignal = overallResult;
            }

            const isMarketOpen = timeInMinutes >= 555 && timeInMinutes < 915; 
            const isExitTime = timeInMinutes >= 915; // 3:15 PM Squareoff
            
            let isLastCandleOfDay = false;
            if (i === cachedData.length - 1) isLastCandleOfDay = true;
            else {
                const nextCandleIst = new Date(new Date(cachedData[i+1].timestamp).getTime() + (5.5 * 60 * 60 * 1000));
                if (nextCandleIst.toISOString().split('T')[0] !== dateStr) isLastCandleOfDay = true;
            }

            const spotClosePrice = parseFloat(candle.close);

            // 🟢 TAKE TRADE (ENTRY)
            if (!isPositionOpen && longSignal && isMarketOpen) {
                isPositionOpen = true;
                
                let tradeSymbol = upperSymbol;
                let finalEntryPrice = spotClosePrice;

                // 🚀 THE OPTIONS ENGINE MAGIC: Fetching Premium Data
                if(isOptionsTrade) {
                    const targetStrike = calculateATM(spotClosePrice, upperSymbol); // Add ITM/OTM logic here later if needed
                    const optionConfig = getOptionSecurityId(upperSymbol, targetStrike, optionType);
                    
                    if(optionConfig && broker) {
                        tradeSymbol = optionConfig.tradingSymbol;
                        try {
                            // Ek hi minute ka data mangwayenge option premium ka
                            const optRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, optionConfig.id, "NSE_FNO", "OPTIDX", dateStr, dateStr, "1");
                            if(optRes.success && optRes.data && optRes.data.close) {
                                // Find exact minute match, or take first available
                                const exactMatchIndex = optRes.data.start_Time.findIndex(t => {
                                    const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
                                    return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
                                });
                                finalEntryPrice = exactMatchIndex !== -1 ? optRes.data.close[exactMatchIndex] : optRes.data.close[0];
                            }
                        } catch(e) { console.log("Failed to fetch Option entry premium"); }
                    } else {
                        console.log(`⚠️ Option Config not found for ${upperSymbol} ${targetStrike} ${optionType}`);
                    }
                }

                currentTrade = {
                    symbol: tradeSymbol,
                    transaction: transactionType,
                    quantity: tradeQuantity,
                    entryTime: `${h}:${m}:00`,
                    entryPrice: finalEntryPrice,
                    exitTime: null, exitPrice: null, pnl: null, exitType: null,
                    optionConfig: isOptionsTrade ? { strike: calculateATM(spotClosePrice, upperSymbol), type: optionType } : null // Store for exit
                };
                console.log(`✅ [TRADE OPEN] Date: ${dateStr} | Time: ${h}:${m} | Spot: ${spotClosePrice} | Premium: ${finalEntryPrice}`);
            }

            // 🔴 EXIT TRADE (EXIT)
            if (isPositionOpen && (isExitTime || isLastCandleOfDay)) {
                isPositionOpen = false;
                
                let finalExitPrice = spotClosePrice;

                // 🚀 THE OPTIONS ENGINE MAGIC: Fetching Premium Exit Data
                if(isOptionsTrade && currentTrade.optionConfig && broker) {
                    const optionConfig = getOptionSecurityId(upperSymbol, currentTrade.optionConfig.strike, currentTrade.optionConfig.type);
                    if(optionConfig) {
                        try {
                            const optRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, optionConfig.id, "NSE_FNO", "OPTIDX", dateStr, dateStr, "1");
                            if(optRes.success && optRes.data && optRes.data.close) {
                                const exactMatchIndex = optRes.data.start_Time.findIndex(t => {
                                    const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
                                    return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
                                });
                                // M2M Squareoff hai to us minute ka last, nahi to din ka aakhiri rate
                                finalExitPrice = exactMatchIndex !== -1 ? optRes.data.close[exactMatchIndex] : optRes.data.close[optRes.data.close.length - 1];
                            }
                        } catch(e) { console.log("Failed to fetch Option exit premium"); }
                    }
                }

                const pnl = calcTradePnL(currentTrade.entryPrice, finalExitPrice, tradeQuantity, transactionType);

                currentTrade.exitTime = `${h}:${m}:00`;
                currentTrade.exitPrice = finalExitPrice;
                currentTrade.pnl = pnl;
                currentTrade.exitType = isLastCandleOfDay ? "EOD_SQUAREOFF" : "TIME_SQUAREOFF";
                dailyBreakdownMap[dateStr].tradesList.push(currentTrade);
                
                console.log(`❌ [TRADE CLOSE] Date: ${dateStr} | Premium: ${finalExitPrice} | PnL: ${pnl.toFixed(2)}`);
                currentTrade = null; 

                dailyBreakdownMap[dateStr].pnl += pnl;
                dailyBreakdownMap[dateStr].trades += 1;

                if (pnl > 0) { winTrades++; if (pnl > maxProfitTrade) maxProfitTrade = pnl; } 
                else { lossTrades++; if (pnl < maxLossTrade) maxLossTrade = pnl; }
            }
        }

        // ==========================================
        // 5. DAILY LOOP (UI Format Conversion)
        // ==========================================
        for (const [date, data] of Object.entries(dailyBreakdownMap)) {
            if (data.trades > 0) { 
                currentEquity += data.pnl;
                if (currentEquity > peakEquity) peakEquity = currentEquity;
                const drawdown = currentEquity - peakEquity;
                if (drawdown < maxDrawdown) maxDrawdown = drawdown;

                if (data.pnl > 0) { winDays++; currentWinStreak++; currentLossStreak = 0; if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak; } 
                else { lossDays++; currentLossStreak++; currentWinStreak = 0; if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak; }

                equityCurve.push({ date, pnl: currentEquity });
                daywiseBreakdown.push({ date, dailyPnL: data.pnl, tradesTaken: data.trades, tradesList: data.tradesList });
            }
        }

        const backtestResult = {
            summary: { totalPnL: currentEquity, maxDrawdown, tradingDays: winDays + lossDays, winDays, lossDays, totalTrades: winTrades + lossTrades, winTrades, lossTrades, maxWinStreak, maxLossStreak, maxProfit: maxProfitTrade, maxLoss: maxLossTrade },
            equityCurve, daywiseBreakdown: daywiseBreakdown.reverse()
        };

        return res.status(200).json({ success: true, data: backtestResult });

    } catch (error) {
        console.error("Backtest Error:", error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
};

module.exports = { runBacktestSimulator };