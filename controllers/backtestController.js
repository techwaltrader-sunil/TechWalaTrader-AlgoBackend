

// const Strategy = require('../models/Strategy');
// const HistoricalData = require('../models/HistoricalData');
// const Broker = require('../models/Broker');
// const { fetchDhanHistoricalData } = require('../services/dhanService');

// // 🔥 THE REAL DATA BACKTEST ENGINE 🔥
// const runBacktestSimulator = async (req, res) => {
//     try {
//         const { strategyId } = req.params;
//         const { period, start, end } = req.query; // 🔥 FIX: Frontend se aayi start/end date receive karein
        
//         const strategy = await Strategy.findById(strategyId);
//         if (!strategy) {
//             return res.status(404).json({ error: "Strategy not found" });
//         }

//         console.log(`🚀 Running Real Backtest for: ${strategy.name} | Period: ${period || '1M'}`);

//         // 1. Period ke hisaab se Start aur End Date nikalna
//         let endDate = new Date();
//         let startDate = new Date();
        
//         // 🔥 FIX: Agar Custom hai aur dates aayi hain, to unhe set karo
//         if (period === 'Custom' && start && end) {
//             startDate = new Date(start);
//             endDate = new Date(end);
//             endDate.setHours(23, 59, 59, 999); // Din ka aakhiri second
//         }
//         else if (period === '1M') startDate.setMonth(startDate.getMonth() - 1); 
//         else if (period === '3M') startDate.setMonth(startDate.getMonth() - 3); 
//         else if (period === '6M') startDate.setMonth(startDate.getMonth() - 6); 
//         else if (period === '1Y') startDate.setFullYear(startDate.getFullYear() - 1); 
//         else if (period === '2Y') startDate.setFullYear(startDate.getFullYear() - 2); 
//         else startDate.setMonth(startDate.getMonth() - 1); // Default 1M

//        // ==========================================
//         // 2. Data Fetching & Caching (DYNAMIC LOGIC)
//         // ==========================================
        
//         // Dhan ke Security IDs ka "Super Map" (Har tarah ke naam ko cover karega)
//         const dhanIdMap = {
//             "NIFTY": "13",
//             "NIFTY 50": "13",
//             "BANKNIFTY": "25",
//             "NIFTY BANK": "25",       // 🔥 Aapke DB wala naam!
//             "FINNIFTY": "27",
//             "NIFTY FIN SERVICE": "27",
//             "MIDCPNIFTY": "118",
//             "NIFTY MID SELECT": "118",
//             "SENSEX": "51",
//             "BSE SENSEX": "51"
//         };

//         const instrumentData = (strategy.data && strategy.data.instruments && strategy.data.instruments.length > 0) 
//                                 ? strategy.data.instruments[0] 
//                                 : {};

//         const symbol = instrumentData.symbol || instrumentData.name || "NIFTY"; 
//         const upperSymbol = symbol.toUpperCase().trim(); 
        
//         let rawExchange = (instrumentData.exchange || "IDX_I").toUpperCase();
//         let exchangeSegment = "IDX_I"; 

//         if (rawExchange === "NSE") exchangeSegment = "NSE_EQ";
//         else if (rawExchange === "BSE") exchangeSegment = "BSE_EQ";
//         else if (rawExchange === "NFO") exchangeSegment = "NSE_FNO";
//         else if (rawExchange === "MCX") exchangeSegment = "MCX_COMM";
//         else exchangeSegment = rawExchange;

//         if (upperSymbol.includes("NIFTY") || upperSymbol.includes("SENSEX") || upperSymbol.includes("BANK")) {
//             exchangeSegment = "IDX_I";
//         }

//         const instrumentType = exchangeSegment === "IDX_I" ? "INDEX" : "EQUITY";

//         // 🔥 FIX: Ab ye directly "NIFTY BANK" ko match karke 25 nikal lega!
//         const cleanSymbolForMap = upperSymbol.replace(' 50', '').trim();
//         const securityId = instrumentData.securityId || dhanIdMap[upperSymbol] || dhanIdMap[cleanSymbolForMap] || "13";
        
       
//         // 🔥 FIX: Wapas original 5m/15m logic par aa gaye
//         let timeframe = "5"; 
        
//         if (strategy.data && strategy.data.config && strategy.data.config.timeframe) {
//             timeframe = strategy.data.config.timeframe.toString().replace('m', '');
//         } else if (strategy.data && strategy.data.entrySettings && strategy.data.entrySettings.timeframe) {
//             timeframe = strategy.data.entrySettings.timeframe.toString().replace('m', '');
//         }

//         // Ye log ab aapko exact batayega ki Dhan ko kya jaa raha hai
//         console.log(`🧠 Config -> Symbol: ${symbol}, ID: ${securityId}, Seg: ${exchangeSegment}, Inst: ${instrumentType}, TF: ${timeframe}`);

//         // ==========================================
//         // 3. CACHING & DHAN API INTEGRATION
//         // ==========================================
//         console.log(`🔍 Checking DB for ${symbol} data from ${startDate.toISOString().split('T')[0]}...`);
//         let cachedData = await HistoricalData.find({
//             symbol, timeframe, timestamp: { $gte: startDate, $lte: endDate }
//         }).sort({ timestamp: 1 });

//         if (cachedData.length === 0) {
//             console.log(`⚠️ Data not found in DB. Fetching from Dhan API...`);
//             const broker = await Broker.findOne({ engineOn: true });
//             if (!broker) return res.status(400).json({ success: false, message: 'No active broker found for API keys' });

//             const formatDhanDate = (d) => d.toISOString().split('T')[0];
            
//             // // 🔥 FIX 3: 'INDEX' ki jagah dynamic 'instrumentType' bhej rahe hain
//             // const dhanRes = await fetchDhanHistoricalData(
//             //     broker.clientId, broker.apiSecret, securityId, exchangeSegment, instrumentType, 
//             //     formatDhanDate(startDate), formatDhanDate(endDate), timeframe
//             // );

//             // 🔥 ULTIMATE TEST: Bank Nifty (IDX_I) ki jagah HDFC Bank (NSE_EQ) mangwa kar dekhein
//             const testSecurityId = "1333"; // HDFC Bank ka Dhan ID
//             const testSegment = "NSE_EQ";
//             const testInstrument = "EQUITY";

//             // Apna purana dhanRes wala API call isse replace karein:
//             const dhanRes = await fetchDhanHistoricalData(
//                 broker.clientId, broker.apiSecret, testSecurityId, testSegment, testInstrument, 
//                 formatDhanDate(startDate), formatDhanDate(endDate), timeframe
//             );

//             // if (dhanRes.success && dhanRes.data.start_Time) {
//             //     const { start_Time, open, high, low, close, volume } = dhanRes.data;
//             //     const bulkOps = [];
//             //     for (let i = 0; i < start_Time.length; i++) {
//             //         const timestamp = new Date(start_Time[i] * 1000); 
//             //         bulkOps.push({ insertOne: { document: { symbol, timeframe, timestamp, open: open[i], high: high[i], low: low[i], close: close[i], volume: volume[i] } } });
//             //     }
                
//             //     if (bulkOps.length > 0) {
//             //         await HistoricalData.bulkWrite(bulkOps, { ordered: false }).catch(e => console.log("Duplicates ignored"));
//             //         console.log(`✅ Saved ${bulkOps.length} new candles to MongoDB!`);
//             //         cachedData = await HistoricalData.find({ symbol, timeframe, timestamp: { $gte: startDate, $lte: endDate } }).sort({ timestamp: 1 });
//             //     }
//             // } else {
//             //     // 🔥 GENUINE SOLUTION: Fake data nahi banayenge. Sidha User ko sach batayenge.
//             //     console.log(`⚠️ Dhan API returned no data. Reason: ${dhanRes.message}`);
                
//             //     return res.status(404).json({ 
//             //         success: false, 
//             //         errorType: "NO_DATA",
//             //         message: "Data not available for this period. Market might be closed (Weekend/Holiday) or the date is too old for intraday data. Please try a recent working day." 
//             //     });
//             // }

//             // 🔥 FIX: Check both 'start_Time' (Intraday) and 'timestamp' (Daily)
//             const timeArray = dhanRes.data ? (dhanRes.data.start_Time || dhanRes.data.timestamp) : null;

//             if (dhanRes.success && timeArray) {
//                 const { open, high, low, close, volume } = dhanRes.data;
//                 const bulkOps = [];
//                 for (let i = 0; i < timeArray.length; i++) {
//                     // Dhan kabhi seconds me bhejta hai, kabhi milliseconds me. Dono handle karein.
//                     let ms = timeArray[i];
//                     if (ms < 10000000000) ms = ms * 1000; 

//                     const timestamp = new Date(ms); 
//                     bulkOps.push({ insertOne: { document: { symbol, timeframe, timestamp, open: open[i], high: high[i], low: low[i], close: close[i], volume: volume[i] } } });
//                 }
                
//                 if (bulkOps.length > 0) {
//                     await HistoricalData.bulkWrite(bulkOps, { ordered: false }).catch(e => console.log("Duplicates ignored"));
//                     console.log(`✅ Saved ${bulkOps.length} new candles to MongoDB!`);
//                     cachedData = await HistoricalData.find({ symbol, timeframe, timestamp: { $gte: startDate, $lte: endDate } }).sort({ timestamp: 1 });
//                 }
//             } else {
//                 // Fake data nahi banayenge. Sidha User ko sach batayenge.
//                 console.log(`⚠️ Dhan API returned no data. Reason: ${dhanRes.message || "Unknown Format"}`);
                
//                 return res.status(404).json({ 
//                     success: false, 
//                     errorType: "NO_DATA",
//                     message: "Data not available for this period. Market might be closed (Weekend/Holiday) or the date is too old for intraday data." 
//                 });
//             }
//         }

//         console.log(`📊 Processing ${cachedData.length} Real Candles...`);

//         // ==========================================
//         // 4. METRICS & ENGINE LOOP
//         // ==========================================
//         let currentEquity = 0, peakEquity = 0, maxDrawdown = 0;
//         let winDays = 0, lossDays = 0, winTrades = 0, lossTrades = 0;
//         let currentWinStreak = 0, currentLossStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
//         let maxProfitTrade = 0, maxLossTrade = 0;
//         const equityCurve = [];
//         const daywiseBreakdown = [];
//         let dailyBreakdownMap = {}; // Har din ka total PnL yahan jama hoga

//         let isPositionOpen = false;
//         let entryPrice = 0;

//         cachedData.forEach(candle => {
//             const timeStr = candle.timestamp.toLocaleTimeString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata' });
//             const dateStr = candle.timestamp.toISOString().split('T')[0];

//             if (!dailyBreakdownMap[dateStr]) {
//                 dailyBreakdownMap[dateStr] = { pnl: 0, trades: 0 };
//             }

//             // Dummy Trading Rule: Buy at 10:00 AM
//             if (!isPositionOpen && timeStr.startsWith("10:00")) {
//                 isPositionOpen = true;
//                 entryPrice = candle.close;
//             }

//             // Dummy Trading Rule: Sell at 2:00 PM
//             if (isPositionOpen && timeStr.startsWith("14:00")) {
//                 isPositionOpen = false;
//                 const exitPrice = candle.close;
//                 const pnl = (exitPrice - entryPrice) * 50; // Nifty Lot Size

//                 dailyBreakdownMap[dateStr].pnl += pnl;
//                 dailyBreakdownMap[dateStr].trades += 1;

//                 if (pnl > 0) {
//                     winTrades++;
//                     if (pnl > maxProfitTrade) maxProfitTrade = pnl;
//                 } else {
//                     lossTrades++;
//                     if (pnl < maxLossTrade) maxLossTrade = pnl;
//                 }
//             }
//         });

//         // 5. Daily Loop (Converting Trade Map to UI Format)
//         for (const [date, data] of Object.entries(dailyBreakdownMap)) {
//             if (data.trades > 0) { // Agar us din trade hua tha
//                 const dailyPnL = data.pnl;
//                 currentEquity += dailyPnL;
                
//                 // Drawdown Calculation
//                 if (currentEquity > peakEquity) peakEquity = currentEquity;
//                 const drawdown = currentEquity - peakEquity;
//                 if (drawdown < maxDrawdown) maxDrawdown = drawdown;

//                 // Win/Loss Streaks
//                 if (dailyPnL > 0) {
//                     winDays++;
//                     currentWinStreak++;
//                     currentLossStreak = 0;
//                     if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
//                 } else {
//                     lossDays++;
//                     currentLossStreak++;
//                     currentWinStreak = 0;
//                     if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
//                 }

//                 equityCurve.push({ date: date, pnl: currentEquity });
//                 daywiseBreakdown.push({ date: date, dailyPnL: dailyPnL, tradesTaken: data.trades });
//             }
//         }

//         // 6. Return exact JSON format that Frontend needs
//         const backtestResult = {
//             summary: {
//                 totalPnL: currentEquity,
//                 maxDrawdown: maxDrawdown,
//                 tradingDays: winDays + lossDays,
//                 winDays: winDays,
//                 lossDays: lossDays,
//                 totalTrades: winTrades + lossTrades,
//                 winTrades: winTrades,
//                 lossTrades: lossTrades,
//                 maxWinStreak: maxWinStreak,
//                 maxLossStreak: maxLossStreak,
//                 maxProfit: maxProfitTrade,
//                 maxLoss: maxLossTrade,
//             },
//             equityCurve: equityCurve,
//             daywiseBreakdown: daywiseBreakdown.reverse()
//         };

//         return res.status(200).json({ success: true, data: backtestResult });

//     } catch (error) {
//         console.error("Backtest Error:", error);
//         res.status(500).json({ success: false, error: "Internal Server Error during Backtesting" });
//     }
// };

// module.exports = { runBacktestSimulator };



// const Strategy = require('../models/Strategy');
// const HistoricalData = require('../models/HistoricalData');
// const Broker = require('../models/Broker');
// const { fetchDhanHistoricalData } = require('../services/dhanService');

// // 🔥 THE REAL DATA BACKTEST ENGINE 🔥
// const runBacktestSimulator = async (req, res) => {
//     try {
//         const { strategyId } = req.params;
//         const { period, start, end } = req.query; // Frontend se aayi start/end date receive karein
        
//         const strategy = await Strategy.findById(strategyId);
//         if (!strategy) {
//             return res.status(404).json({ error: "Strategy not found" });
//         }

//         console.log(`🚀 Running Real Backtest for: ${strategy.name} | Period: ${period || '1M'}`);

//         // ==========================================
//         // 1. DATE CALCULATION
//         // ==========================================
//         let endDate = new Date();
//         let startDate = new Date();
        
//         if (period === 'Custom' && start && end) {
//             startDate = new Date(start);
//             endDate = new Date(end);
//             endDate.setHours(23, 59, 59, 999); // Din ka aakhiri second
//         }
//         else if (period === '1M') startDate.setMonth(startDate.getMonth() - 1); 
//         else if (period === '3M') startDate.setMonth(startDate.getMonth() - 3); 
//         else if (period === '6M') startDate.setMonth(startDate.getMonth() - 6); 
//         else if (period === '1Y') startDate.setFullYear(startDate.getFullYear() - 1); 
//         else if (period === '2Y') startDate.setFullYear(startDate.getFullYear() - 2); 
//         else startDate.setMonth(startDate.getMonth() - 1); // Default 1M

//         // ==========================================
//         // 2. DYNAMIC CONFIGURATION (Symbol, ID, Exchange)
//         // ==========================================
//         const dhanIdMap = {
//             "NIFTY": "13",
//             "NIFTY 50": "13",
//             "BANKNIFTY": "25",
//             "NIFTY BANK": "25",
//             "FINNIFTY": "27",
//             "NIFTY FIN SERVICE": "27",
//             "MIDCPNIFTY": "118",
//             "NIFTY MID SELECT": "118",
//             "SENSEX": "51",
//             "BSE SENSEX": "51",
//             "HDFCBANK": "1333", // 🔥 Added HDFC Bank
//             "RELIANCE": "2885"  // 🔥 Added Reliance
//         };

//         const instrumentData = (strategy.data && strategy.data.instruments && strategy.data.instruments.length > 0) 
//                                 ? strategy.data.instruments[0] 
//                                 : {};

//         const symbol = instrumentData.symbol || instrumentData.name || "NIFTY"; 
//         const upperSymbol = symbol.toUpperCase().trim(); 
        
//         let rawExchange = (instrumentData.exchange || "IDX_I").toUpperCase();
//         let exchangeSegment = "IDX_I"; 

//         if (rawExchange === "NSE") exchangeSegment = "NSE_EQ";
//         else if (rawExchange === "BSE") exchangeSegment = "BSE_EQ";
//         else if (rawExchange === "NFO") exchangeSegment = "NSE_FNO";
//         else if (rawExchange === "MCX") exchangeSegment = "MCX_COMM";
//         else exchangeSegment = rawExchange;

//         // 🔥 FIX: "BANK" ki jagah exact "BANKNIFTY" match karenge, taaki HDFCBANK jaisa stock index na ban jaye
//         if (upperSymbol.includes("NIFTY") || upperSymbol.includes("SENSEX") || upperSymbol === "BANKNIFTY" || upperSymbol === "NIFTY BANK") {
//             exchangeSegment = "IDX_I";
//         }

//         const instrumentType = exchangeSegment === "IDX_I" ? "INDEX" : "EQUITY";

//         const cleanSymbolForMap = upperSymbol.replace(' 50', '').trim();
//         const securityId = instrumentData.securityId || dhanIdMap[upperSymbol] || dhanIdMap[cleanSymbolForMap] || "13";
        
//         let timeframe = "5"; 
//         if (strategy.data && strategy.data.config && strategy.data.config.timeframe) {
//             timeframe = strategy.data.config.timeframe.toString().replace('m', '');
//         } else if (strategy.data && strategy.data.entrySettings && strategy.data.entrySettings.timeframe) {
//             timeframe = strategy.data.entrySettings.timeframe.toString().replace('m', '');
//         }

//         console.log(`🧠 Config -> Symbol: ${symbol}, ID: ${securityId}, Seg: ${exchangeSegment}, Inst: ${instrumentType}, TF: ${timeframe}`);

//         // ==========================================
//         // 3. CACHING & DHAN API INTEGRATION
//         // ==========================================
//         console.log(`🔍 Checking DB for ${symbol} data from ${startDate.toISOString().split('T')[0]}...`);
//         let cachedData = await HistoricalData.find({
//             symbol, timeframe, timestamp: { $gte: startDate, $lte: endDate }
//         }).sort({ timestamp: 1 });

//         if (cachedData.length === 0) {
//             console.log(`⚠️ Data not found in DB. Fetching from Dhan API...`);
//             const broker = await Broker.findOne({ engineOn: true });
//             if (!broker) return res.status(400).json({ success: false, message: 'No active broker found for API keys' });

//             const formatDhanDate = (d) => d.toISOString().split('T')[0];

//             const dhanRes = await fetchDhanHistoricalData(
//                 broker.clientId, 
//                 broker.apiSecret, 
//                 securityId,           // Dynamic ID aayega
//                 exchangeSegment,      // Dynamic Segment aayega
//                 instrumentType,       // Dynamic Instrument aayega
//                 formatDhanDate(startDate), 
//                 formatDhanDate(endDate), 
//                 timeframe
//             );

//             // Handle both Intraday (start_Time) and Daily (timestamp) responses
//             const timeArray = dhanRes.data ? (dhanRes.data.start_Time || dhanRes.data.timestamp) : null;

//             if (dhanRes.success && timeArray) {
//                 const { open, high, low, close, volume } = dhanRes.data;
//                 const bulkOps = [];
//                 for (let i = 0; i < timeArray.length; i++) {
//                     let ms = timeArray[i];
//                     if (ms < 10000000000) ms = ms * 1000; 

//                     const timestamp = new Date(ms); 
//                     bulkOps.push({ insertOne: { document: { symbol, timeframe, timestamp, open: open[i], high: high[i], low: low[i], close: close[i], volume: volume[i] } } });
//                 }
                
//                 if (bulkOps.length > 0) {
//                     await HistoricalData.bulkWrite(bulkOps, { ordered: false }).catch(e => console.log("Duplicates ignored"));
//                     console.log(`✅ Saved ${bulkOps.length} new candles to MongoDB!`);
//                     cachedData = await HistoricalData.find({ symbol, timeframe, timestamp: { $gte: startDate, $lte: endDate } }).sort({ timestamp: 1 });
//                 }
//             } else {
//                 console.log(`⚠️ Dhan API returned no data. Reason: ${dhanRes.message || "Unknown Format"}`);
//                 return res.status(404).json({ 
//                     success: false, 
//                     errorType: "NO_DATA",
//                     message: "Data not available for this period. Market might be closed (Weekend/Holiday) or the date is too old for intraday data." 
//                 });
//             }
//         }

//         console.log(`📊 Processing ${cachedData.length} Real Candles...`);

//         // ==========================================
//         // 4. METRICS & ENGINE LOOP
//         // ==========================================
//         let currentEquity = 0, peakEquity = 0, maxDrawdown = 0;
//         let winDays = 0, lossDays = 0, winTrades = 0, lossTrades = 0;
//         let currentWinStreak = 0, currentLossStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
//         let maxProfitTrade = 0, maxLossTrade = 0;
//         const equityCurve = [];
//         const daywiseBreakdown = [];
//         let dailyBreakdownMap = {}; 

//         let isPositionOpen = false;
//         let entryPrice = 0;

//         cachedData.forEach(candle => {
//             const timeStr = candle.timestamp.toLocaleTimeString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata' });
//             const dateStr = candle.timestamp.toISOString().split('T')[0];

//             if (!dailyBreakdownMap[dateStr]) {
//                 dailyBreakdownMap[dateStr] = { pnl: 0, trades: 0 };
//             }

//             // Dummy Trading Rule: Buy at 10:00 AM
//             if (!isPositionOpen && timeStr.startsWith("10:00")) {
//                 isPositionOpen = true;
//                 entryPrice = candle.close;
//             }

//             // Dummy Trading Rule: Sell at 2:00 PM
//             if (isPositionOpen && timeStr.startsWith("14:00")) {
//                 isPositionOpen = false;
//                 const exitPrice = candle.close;
//                 const pnl = (exitPrice - entryPrice) * 50; // Assuming 50 as Lot Size

//                 dailyBreakdownMap[dateStr].pnl += pnl;
//                 dailyBreakdownMap[dateStr].trades += 1;

//                 if (pnl > 0) {
//                     winTrades++;
//                     if (pnl > maxProfitTrade) maxProfitTrade = pnl;
//                 } else {
//                     lossTrades++;
//                     if (pnl < maxLossTrade) maxLossTrade = pnl;
//                 }
//             }
//         });

//         // ==========================================
//         // 5. DAILY LOOP (UI Format Conversion)
//         // ==========================================
//         for (const [date, data] of Object.entries(dailyBreakdownMap)) {
//             if (data.trades > 0) { 
//                 const dailyPnL = data.pnl;
//                 currentEquity += dailyPnL;
                
//                 if (currentEquity > peakEquity) peakEquity = currentEquity;
//                 const drawdown = currentEquity - peakEquity;
//                 if (drawdown < maxDrawdown) maxDrawdown = drawdown;

//                 if (dailyPnL > 0) {
//                     winDays++;
//                     currentWinStreak++;
//                     currentLossStreak = 0;
//                     if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
//                 } else {
//                     lossDays++;
//                     currentLossStreak++;
//                     currentWinStreak = 0;
//                     if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
//                 }

//                 equityCurve.push({ date: date, pnl: currentEquity });
//                 daywiseBreakdown.push({ date: date, dailyPnL: dailyPnL, tradesTaken: data.trades });
//             }
//         }

//         // ==========================================
//         // 6. RETURN RESULT
//         // ==========================================
//         const backtestResult = {
//             summary: {
//                 totalPnL: currentEquity,
//                 maxDrawdown: maxDrawdown,
//                 tradingDays: winDays + lossDays,
//                 winDays: winDays,
//                 lossDays: lossDays,
//                 totalTrades: winTrades + lossTrades,
//                 winTrades: winTrades,
//                 lossTrades: lossTrades,
//                 maxWinStreak: maxWinStreak,
//                 maxLossStreak: maxLossStreak,
//                 maxProfit: maxProfitTrade,
//                 maxLoss: maxLossTrade,
//             },
//             equityCurve: equityCurve,
//             daywiseBreakdown: daywiseBreakdown.reverse()
//         };

//         return res.status(200).json({ success: true, data: backtestResult });

//     } catch (error) {
//         console.error("Backtest Error:", error);
//         res.status(500).json({ success: false, error: "Internal Server Error during Backtesting" });
//     }
// };

// module.exports = { runBacktestSimulator };





// const Strategy = require('../models/Strategy');
// const HistoricalData = require('../models/HistoricalData');
// const Broker = require('../models/Broker');
// const { fetchDhanHistoricalData } = require('../services/dhanService');

// // 🔥 THE REAL DATA BACKTEST ENGINE 🔥
// const runBacktestSimulator = async (req, res) => {
//     try {
//         const { strategyId } = req.params;
//         const { period, start, end } = req.query; // Frontend se aayi start/end date receive karein
        
//         const strategy = await Strategy.findById(strategyId);
//         if (!strategy) {
//             return res.status(404).json({ error: "Strategy not found" });
//         }

//         console.log(`🚀 Running Real Backtest for: ${strategy.name} | Period: ${period || '1M'}`);

//         // ==========================================
//         // 1. DATE CALCULATION
//         // ==========================================
//         let endDate = new Date();
//         let startDate = new Date();
        
//         if (period === 'Custom' && start && end) {
//             startDate = new Date(start);
//             endDate = new Date(end);
//             endDate.setHours(23, 59, 59, 999); // Din ka aakhiri second
//         }
//         else if (period === '1M') startDate.setMonth(startDate.getMonth() - 1); 
//         else if (period === '3M') startDate.setMonth(startDate.getMonth() - 3); 
//         else if (period === '6M') startDate.setMonth(startDate.getMonth() - 6); 
//         else if (period === '1Y') startDate.setFullYear(startDate.getFullYear() - 1); 
//         else if (period === '2Y') startDate.setFullYear(startDate.getFullYear() - 2); 
//         else startDate.setMonth(startDate.getMonth() - 1); // Default 1M

//         // ==========================================
//         // 2. DYNAMIC CONFIGURATION (Symbol, ID, Exchange)
//         // ==========================================
//         const dhanIdMap = {
//             "NIFTY": "13",
//             "NIFTY 50": "13",
//             "BANKNIFTY": "25",
//             "NIFTY BANK": "25",
//             "FINNIFTY": "27",
//             "NIFTY FIN SERVICE": "27",
//             "MIDCPNIFTY": "118",
//             "NIFTY MID SELECT": "118",
//             "SENSEX": "51",
//             "BSE SENSEX": "51",
//             "HDFCBANK": "1333", // 🔥 Added HDFC Bank
//             "RELIANCE": "2885"  // 🔥 Added Reliance
//         };

//         const instrumentData = (strategy.data && strategy.data.instruments && strategy.data.instruments.length > 0) 
//                                 ? strategy.data.instruments[0] 
//                                 : {};

//         const symbol = instrumentData.symbol || instrumentData.name || "NIFTY"; 
//         const upperSymbol = symbol.toUpperCase().trim(); 
        
//         let rawExchange = (instrumentData.exchange || "IDX_I").toUpperCase();
//         let exchangeSegment = "IDX_I"; 

//         if (rawExchange === "NSE") exchangeSegment = "NSE_EQ";
//         else if (rawExchange === "BSE") exchangeSegment = "BSE_EQ";
//         else if (rawExchange === "NFO") exchangeSegment = "NSE_FNO";
//         else if (rawExchange === "MCX") exchangeSegment = "MCX_COMM";
//         else exchangeSegment = rawExchange;

//         // 🔥 FIX: "BANK" ki jagah exact "BANKNIFTY" match karenge, taaki HDFCBANK jaisa stock index na ban jaye
//         if (upperSymbol.includes("NIFTY") || upperSymbol.includes("SENSEX") || upperSymbol === "BANKNIFTY" || upperSymbol === "NIFTY BANK") {
//             exchangeSegment = "IDX_I";
//         }

//         const instrumentType = exchangeSegment === "IDX_I" ? "INDEX" : "EQUITY";

//         const cleanSymbolForMap = upperSymbol.replace(' 50', '').trim();
//         const securityId = instrumentData.securityId || dhanIdMap[upperSymbol] || dhanIdMap[cleanSymbolForMap] || "13";
        
//         let timeframe = "5"; 
//         if (strategy.data && strategy.data.config && strategy.data.config.timeframe) {
//             timeframe = strategy.data.config.timeframe.toString().replace('m', '');
//         } else if (strategy.data && strategy.data.entrySettings && strategy.data.entrySettings.timeframe) {
//             timeframe = strategy.data.entrySettings.timeframe.toString().replace('m', '');
//         }

//         console.log(`🧠 Config -> Symbol: ${symbol}, ID: ${securityId}, Seg: ${exchangeSegment}, Inst: ${instrumentType}, TF: ${timeframe}`);

//         // ==========================================
//         // 3. CACHING & DHAN API INTEGRATION
//         // ==========================================
//         console.log(`🔍 Checking DB for ${symbol} data from ${startDate.toISOString().split('T')[0]}...`);
//         let cachedData = await HistoricalData.find({
//             symbol, timeframe, timestamp: { $gte: startDate, $lte: endDate }
//         }).sort({ timestamp: 1 });

//         if (cachedData.length === 0) {
//             console.log(`⚠️ Data not found in DB. Fetching from Dhan API...`);
//             const broker = await Broker.findOne({ engineOn: true });
//             if (!broker) return res.status(400).json({ success: false, message: 'No active broker found for API keys' });

//             const formatDhanDate = (d) => d.toISOString().split('T')[0];

//             const dhanRes = await fetchDhanHistoricalData(
//                 broker.clientId, 
//                 broker.apiSecret, 
//                 securityId,           // Dynamic ID aayega
//                 exchangeSegment,      // Dynamic Segment aayega
//                 instrumentType,       // Dynamic Instrument aayega
//                 formatDhanDate(startDate), 
//                 formatDhanDate(endDate), 
//                 timeframe
//             );

//             // Handle both Intraday (start_Time) and Daily (timestamp) responses
//             const timeArray = dhanRes.data ? (dhanRes.data.start_Time || dhanRes.data.timestamp) : null;

//             if (dhanRes.success && timeArray) {
//                 const { open, high, low, close, volume } = dhanRes.data;
//                 const bulkOps = [];
//                 for (let i = 0; i < timeArray.length; i++) {
//                     let ms = timeArray[i];
//                     if (ms < 10000000000) ms = ms * 1000; 

//                     const timestamp = new Date(ms); 
//                     bulkOps.push({ insertOne: { document: { symbol, timeframe, timestamp, open: open[i], high: high[i], low: low[i], close: close[i], volume: volume[i] } } });
//                 }
                
//                 if (bulkOps.length > 0) {
//                     await HistoricalData.bulkWrite(bulkOps, { ordered: false }).catch(e => console.log("Duplicates ignored"));
//                     console.log(`✅ Saved ${bulkOps.length} new candles to MongoDB!`);
//                     cachedData = await HistoricalData.find({ symbol, timeframe, timestamp: { $gte: startDate, $lte: endDate } }).sort({ timestamp: 1 });
//                 }
//             } else {
//                 console.log(`⚠️ Dhan API returned no data. Reason: ${dhanRes.message || "Unknown Format"}`);
//                 return res.status(404).json({ 
//                     success: false, 
//                     errorType: "NO_DATA",
//                     message: "Data not available for this period. Market might be closed (Weekend/Holiday) or the date is too old for intraday data." 
//                 });
//             }
//         }

//         console.log(`📊 Processing ${cachedData.length} Real Candles...`);

//         // ==========================================
//         // 4. METRICS & ENGINE LOOP
//         // ==========================================
//         let currentEquity = 0, peakEquity = 0, maxDrawdown = 0;
//         let winDays = 0, lossDays = 0, winTrades = 0, lossTrades = 0;
//         let currentWinStreak = 0, currentLossStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
//         let maxProfitTrade = 0, maxLossTrade = 0;
//         const equityCurve = [];
//         const daywiseBreakdown = [];
//         let dailyBreakdownMap = {}; 

//         let isPositionOpen = false;
//         let entryPrice = 0;

//         cachedData.forEach(candle => {
//             const timeStr = candle.timestamp.toLocaleTimeString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata' });
//             const dateStr = candle.timestamp.toISOString().split('T')[0];

//             if (!dailyBreakdownMap[dateStr]) {
//                 dailyBreakdownMap[dateStr] = { pnl: 0, trades: 0 };
//             }

//             // Dummy Trading Rule: Buy at 10:00 AM
//             if (!isPositionOpen && timeStr.startsWith("10:00")) {
//                 isPositionOpen = true;
//                 entryPrice = candle.close;
//             }

//             // Dummy Trading Rule: Sell at 2:00 PM
//             if (isPositionOpen && timeStr.startsWith("14:00")) {
//                 isPositionOpen = false;
//                 const exitPrice = candle.close;
//                 const pnl = (exitPrice - entryPrice) * 50; // Assuming 50 as Lot Size

//                 dailyBreakdownMap[dateStr].pnl += pnl;
//                 dailyBreakdownMap[dateStr].trades += 1;

//                 if (pnl > 0) {
//                     winTrades++;
//                     if (pnl > maxProfitTrade) maxProfitTrade = pnl;
//                 } else {
//                     lossTrades++;
//                     if (pnl < maxLossTrade) maxLossTrade = pnl;
//                 }
//             }
//         });

//         // ==========================================
//         // 5. DAILY LOOP (UI Format Conversion)
//         // ==========================================
//         for (const [date, data] of Object.entries(dailyBreakdownMap)) {
//             if (data.trades > 0) { 
//                 const dailyPnL = data.pnl;
//                 currentEquity += dailyPnL;
                
//                 if (currentEquity > peakEquity) peakEquity = currentEquity;
//                 const drawdown = currentEquity - peakEquity;
//                 if (drawdown < maxDrawdown) maxDrawdown = drawdown;

//                 if (dailyPnL > 0) {
//                     winDays++;
//                     currentWinStreak++;
//                     currentLossStreak = 0;
//                     if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
//                 } else {
//                     lossDays++;
//                     currentLossStreak++;
//                     currentWinStreak = 0;
//                     if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
//                 }

//                 equityCurve.push({ date: date, pnl: currentEquity });
//                 daywiseBreakdown.push({ date: date, dailyPnL: dailyPnL, tradesTaken: data.trades });
//             }
//         }

//         // ==========================================
//         // 6. RETURN RESULT
//         // ==========================================
//         const backtestResult = {
//             summary: {
//                 totalPnL: currentEquity,
//                 maxDrawdown: maxDrawdown,
//                 tradingDays: winDays + lossDays,
//                 winDays: winDays,
//                 lossDays: lossDays,
//                 totalTrades: winTrades + lossTrades,
//                 winTrades: winTrades,
//                 lossTrades: lossTrades,
//                 maxWinStreak: maxWinStreak,
//                 maxLossStreak: maxLossStreak,
//                 maxProfit: maxProfitTrade,
//                 maxLoss: maxLossTrade,
//             },
//             equityCurve: equityCurve,
//             daywiseBreakdown: daywiseBreakdown.reverse()
//         };

//         return res.status(200).json({ success: true, data: backtestResult });

//     } catch (error) {
//         console.error("Backtest Error:", error);
//         res.status(500).json({ success: false, error: "Internal Server Error during Backtesting" });
//     }
// };

// module.exports = { runBacktestSimulator };



// const Strategy = require('../models/Strategy');
// const HistoricalData = require('../models/HistoricalData');
// const Broker = require('../models/Broker');
// const { fetchDhanHistoricalData } = require('../services/dhanService');

// const { SMA, EMA, RSI } = require('technicalindicators');

// // 🔥 THE REAL DATA BACKTEST ENGINE 🔥
// const runBacktestSimulator = async (req, res) => {
//     try {
//         const { strategyId } = req.params;
//         const { period, start, end } = req.query; // Frontend se aayi start/end date receive karein
        
//         const strategy = await Strategy.findById(strategyId);
//         if (!strategy) {
//             return res.status(404).json({ error: "Strategy not found" });
//         }

//         console.log(`🚀 Running Real Backtest for: ${strategy.name} | Period: ${period || '1M'}`);

//         // ==========================================
//         // 1. DATE CALCULATION
//         // ==========================================
//         let endDate = new Date();
//         let startDate = new Date();
        
//         if (period === 'Custom' && start && end) {
//             startDate = new Date(start);
//             endDate = new Date(end);
//             endDate.setHours(23, 59, 59, 999); // Din ka aakhiri second
//         }
//         else if (period === '1M') startDate.setMonth(startDate.getMonth() - 1); 
//         else if (period === '3M') startDate.setMonth(startDate.getMonth() - 3); 
//         else if (period === '6M') startDate.setMonth(startDate.getMonth() - 6); 
//         else if (period === '1Y') startDate.setFullYear(startDate.getFullYear() - 1); 
//         else if (period === '2Y') startDate.setFullYear(startDate.getFullYear() - 2); 
//         else startDate.setMonth(startDate.getMonth() - 1); // Default 1M

//         // ==========================================
//         // 2. DYNAMIC CONFIGURATION (Symbol, ID, Exchange)
//         // ==========================================
//         const dhanIdMap = {
//             "NIFTY": "13",
//             "NIFTY 50": "13",
//             "BANKNIFTY": "25",
//             "NIFTY BANK": "25",
//             "FINNIFTY": "27",
//             "NIFTY FIN SERVICE": "27",
//             "MIDCPNIFTY": "118",
//             "NIFTY MID SELECT": "118",
//             "SENSEX": "51",
//             "BSE SENSEX": "51",
//             "HDFCBANK": "1333", // 🔥 Added HDFC Bank
//             "RELIANCE": "2885"  // 🔥 Added Reliance
//         };

//         const instrumentData = (strategy.data && strategy.data.instruments && strategy.data.instruments.length > 0) 
//                                 ? strategy.data.instruments[0] 
//                                 : {};

//         const symbol = instrumentData.symbol || instrumentData.name || "NIFTY"; 
//         const upperSymbol = symbol.toUpperCase().trim(); 
        
//         let rawExchange = (instrumentData.exchange || "IDX_I").toUpperCase();
//         let exchangeSegment = "IDX_I"; 

//         if (rawExchange === "NSE") exchangeSegment = "NSE_EQ";
//         else if (rawExchange === "BSE") exchangeSegment = "BSE_EQ";
//         else if (rawExchange === "NFO") exchangeSegment = "NSE_FNO";
//         else if (rawExchange === "MCX") exchangeSegment = "MCX_COMM";
//         else exchangeSegment = rawExchange;

//         // 🔥 FIX: "BANK" ki jagah exact "BANKNIFTY" match karenge
//         if (upperSymbol.includes("NIFTY") || upperSymbol.includes("SENSEX") || upperSymbol === "BANKNIFTY" || upperSymbol === "NIFTY BANK") {
//             exchangeSegment = "IDX_I";
//         }

//         const instrumentType = exchangeSegment === "IDX_I" ? "INDEX" : "EQUITY";

//         const cleanSymbolForMap = upperSymbol.replace(' 50', '').trim();
//         const securityId = instrumentData.securityId || dhanIdMap[upperSymbol] || dhanIdMap[cleanSymbolForMap] || "13";
        
//         let timeframe = "5"; 
//         if (strategy.data && strategy.data.config && strategy.data.config.timeframe) {
//             timeframe = strategy.data.config.timeframe.toString().replace('m', '');
//         } else if (strategy.data && strategy.data.entrySettings && strategy.data.entrySettings.timeframe) {
//             timeframe = strategy.data.entrySettings.timeframe.toString().replace('m', '');
//         }

//         console.log(`🧠 Config -> Symbol: ${symbol}, ID: ${securityId}, Seg: ${exchangeSegment}, Inst: ${instrumentType}, TF: ${timeframe}`);

//         // ==========================================
//         // 3. CACHING & DHAN API INTEGRATION (SMART LOGIC)
//         // ==========================================
//         console.log(`🔍 Checking DB for ${symbol} data from ${startDate.toISOString().split('T')[0]}...`);
//         let cachedData = await HistoricalData.find({
//             symbol, timeframe, timestamp: { $gte: startDate, $lte: endDate }
//         }).sort({ timestamp: 1 });

//         // 🔥 SMART CACHE LOGIC START 🔥
//         let shouldFetchFromDhan = false;

//         if (cachedData.length === 0) {
//             shouldFetchFromDhan = true;
//         } else {
//             // Agar DB me data hai, to check karo ki kya wo poore range ko cover kar raha hai?
//             const dbStartDate = cachedData[0].timestamp;
//             const dbEndDate = cachedData[cachedData.length - 1].timestamp;

//             // 1 din (86400000 ms) ka buffer de rahe hain gap check karne ke liye
//             if (dbStartDate > new Date(startDate.getTime() + 86400000) || 
//                 dbEndDate < new Date(endDate.getTime() - 86400000)) {
                
//                 console.log(`⚠️ Partial data found in DB. Need fresh data from Dhan!`);
//                 shouldFetchFromDhan = true;
                
//                 // Naya data aane se pehle is date range ka purana/adhura data hata do taaki duplicate na ho
//                 await HistoricalData.deleteMany({ symbol, timeframe, timestamp: { $gte: startDate, $lte: endDate } });
//             }
//         }

//         if (shouldFetchFromDhan) {
//             console.log(`⚠️ Fetching fresh data from Dhan API...`);
//             const broker = await Broker.findOne({ engineOn: true });
//             if (!broker) return res.status(400).json({ success: false, message: 'No active broker found for API keys' });

//             const formatDhanDate = (d) => d.toISOString().split('T')[0];

//             const dhanRes = await fetchDhanHistoricalData(
//                 broker.clientId, 
//                 broker.apiSecret, 
//                 securityId,           // Dynamic ID 
//                 exchangeSegment,      // Dynamic Segment 
//                 instrumentType,       // Dynamic Instrument 
//                 formatDhanDate(startDate), 
//                 formatDhanDate(endDate), 
//                 timeframe
//             );

//             // Handle both Intraday (start_Time) and Daily (timestamp) responses
//             const timeArray = dhanRes.data ? (dhanRes.data.start_Time || dhanRes.data.timestamp) : null;

//             if (dhanRes.success && timeArray) {
//                 const { open, high, low, close, volume } = dhanRes.data;
//                 const bulkOps = [];
//                 for (let i = 0; i < timeArray.length; i++) {
//                     let ms = timeArray[i];
//                     if (ms < 10000000000) ms = ms * 1000; 

//                     const timestamp = new Date(ms); 
//                     bulkOps.push({ insertOne: { document: { symbol, timeframe, timestamp, open: open[i], high: high[i], low: low[i], close: close[i], volume: volume[i] } } });
//                 }
                
//                 if (bulkOps.length > 0) {
//                     await HistoricalData.bulkWrite(bulkOps, { ordered: false }).catch(e => console.log("Duplicates ignored"));
//                     console.log(`✅ Saved ${bulkOps.length} new candles to MongoDB!`);
//                     // 🔥 Fresh fetch from DB so UI gets the full dataset
//                     cachedData = await HistoricalData.find({ symbol, timeframe, timestamp: { $gte: startDate, $lte: endDate } }).sort({ timestamp: 1 });
//                 }
//             } else {
//                 console.log(`⚠️ Dhan API returned no data. Reason: ${dhanRes.message || "Unknown Format"}`);
//                 return res.status(404).json({ 
//                     success: false, 
//                     errorType: "NO_DATA",
//                     message: "Data not available for this period. Market might be closed (Weekend/Holiday) or the date is too old for intraday data." 
//                 });
//             }
//         }
//         // 🔥 SMART CACHE LOGIC END 🔥

//         console.log(`📊 Processing ${cachedData.length} Real Candles...`);

//         // ==========================================
//         // 4. METRICS & ENGINE LOOP
//         // ==========================================
//         let currentEquity = 0, peakEquity = 0, maxDrawdown = 0;
//         let winDays = 0, lossDays = 0, winTrades = 0, lossTrades = 0;
//         let currentWinStreak = 0, currentLossStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
//         let maxProfitTrade = 0, maxLossTrade = 0;
//         const equityCurve = [];
//         const daywiseBreakdown = [];
//         let dailyBreakdownMap = {}; 

//         let isPositionOpen = false;
//         let entryPrice = 0;

//         cachedData.forEach(candle => {
//             const timeStr = candle.timestamp.toLocaleTimeString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata' });
//             const dateStr = candle.timestamp.toISOString().split('T')[0];

//             if (!dailyBreakdownMap[dateStr]) {
//                 dailyBreakdownMap[dateStr] = { pnl: 0, trades: 0 };
//             }

//             // Dummy Trading Rule: Buy at 10:00 AM
//             if (!isPositionOpen && timeStr.startsWith("10:00")) {
//                 isPositionOpen = true;
//                 entryPrice = candle.close;
//             }

//             // Dummy Trading Rule: Sell at 2:00 PM
//             if (isPositionOpen && timeStr.startsWith("14:00")) {
//                 isPositionOpen = false;
//                 const exitPrice = candle.close;
//                 const pnl = (exitPrice - entryPrice) * 50; // Assuming 50 as Lot Size

//                 dailyBreakdownMap[dateStr].pnl += pnl;
//                 dailyBreakdownMap[dateStr].trades += 1;

//                 if (pnl > 0) {
//                     winTrades++;
//                     if (pnl > maxProfitTrade) maxProfitTrade = pnl;
//                 } else {
//                     lossTrades++;
//                     if (pnl < maxLossTrade) maxLossTrade = pnl;
//                 }
//             }
//         });

//         // ==========================================
//         // 5. DAILY LOOP (UI Format Conversion)
//         // ==========================================
//         for (const [date, data] of Object.entries(dailyBreakdownMap)) {
//             if (data.trades > 0) { 
//                 const dailyPnL = data.pnl;
//                 currentEquity += dailyPnL;
                
//                 if (currentEquity > peakEquity) peakEquity = currentEquity;
//                 const drawdown = currentEquity - peakEquity;
//                 if (drawdown < maxDrawdown) maxDrawdown = drawdown;

//                 if (dailyPnL > 0) {
//                     winDays++;
//                     currentWinStreak++;
//                     currentLossStreak = 0;
//                     if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
//                 } else {
//                     lossDays++;
//                     currentLossStreak++;
//                     currentWinStreak = 0;
//                     if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
//                 }

//                 equityCurve.push({ date: date, pnl: currentEquity });
//                 daywiseBreakdown.push({ date: date, dailyPnL: dailyPnL, tradesTaken: data.trades });
//             }
//         }

//         // ==========================================
//         // 6. RETURN RESULT
//         // ==========================================
//         const backtestResult = {
//             summary: {
//                 totalPnL: currentEquity,
//                 maxDrawdown: maxDrawdown,
//                 tradingDays: winDays + lossDays,
//                 winDays: winDays,
//                 lossDays: lossDays,
//                 totalTrades: winTrades + lossTrades,
//                 winTrades: winTrades,
//                 lossTrades: lossTrades,
//                 maxWinStreak: maxWinStreak,
//                 maxLossStreak: maxLossStreak,
//                 maxProfit: maxProfitTrade,
//                 maxLoss: maxLossTrade,
//             },
//             equityCurve: equityCurve,
//             daywiseBreakdown: daywiseBreakdown.reverse()
//         };

//         return res.status(200).json({ success: true, data: backtestResult });

//     } catch (error) {
//         console.error("Backtest Error:", error);
//         res.status(500).json({ success: false, error: "Internal Server Error during Backtesting" });
//     }
// };

// module.exports = { runBacktestSimulator };


const Strategy = require('../models/Strategy');
const HistoricalData = require('../models/HistoricalData');
const Broker = require('../models/Broker');
const { fetchDhanHistoricalData } = require('../services/dhanService');

// 🔥 Nayi library yahan require ki gayi hai
const { SMA, EMA, RSI } = require('technicalindicators');

// 🔥 THE REAL DATA BACKTEST ENGINE 🔥
const runBacktestSimulator = async (req, res) => {
    try {
        const { strategyId } = req.params;
        const { period, start, end } = req.query; // Frontend se aayi start/end date receive karein
        
        const strategy = await Strategy.findById(strategyId);
        if (!strategy) {
            return res.status(404).json({ error: "Strategy not found" });
        }

        console.log(`🚀 Running Real Backtest for: ${strategy.name} | Period: ${period || '1M'}`);

        // ==========================================
        // 1. DATE CALCULATION
        // ==========================================
        let endDate = new Date();
        let startDate = new Date();
        
        if (period === 'Custom' && start && end) {
            startDate = new Date(start);
            endDate = new Date(end);
            endDate.setHours(23, 59, 59, 999); // Din ka aakhiri second
        }
        else if (period === '1M') startDate.setMonth(startDate.getMonth() - 1); 
        else if (period === '3M') startDate.setMonth(startDate.getMonth() - 3); 
        else if (period === '6M') startDate.setMonth(startDate.getMonth() - 6); 
        else if (period === '1Y') startDate.setFullYear(startDate.getFullYear() - 1); 
        else if (period === '2Y') startDate.setFullYear(startDate.getFullYear() - 2); 
        else startDate.setMonth(startDate.getMonth() - 1); // Default 1M

        // ==========================================
        // 2. DYNAMIC CONFIGURATION (Symbol, ID, Exchange)
        // ==========================================
        const dhanIdMap = {
            "NIFTY": "13",
            "NIFTY 50": "13",
            "BANKNIFTY": "25",
            "NIFTY BANK": "25",
            "FINNIFTY": "27",
            "NIFTY FIN SERVICE": "27",
            "MIDCPNIFTY": "118",
            "NIFTY MID SELECT": "118",
            "SENSEX": "51",
            "BSE SENSEX": "51",
            "HDFCBANK": "1333", // 🔥 Added HDFC Bank
            "RELIANCE": "2885"  // 🔥 Added Reliance
        };

        const instrumentData = (strategy.data && strategy.data.instruments && strategy.data.instruments.length > 0) 
                                ? strategy.data.instruments[0] 
                                : {};

        const symbol = instrumentData.symbol || instrumentData.name || "NIFTY"; 
        const upperSymbol = symbol.toUpperCase().trim(); 
        
        let rawExchange = (instrumentData.exchange || "IDX_I").toUpperCase();
        let exchangeSegment = "IDX_I"; 

        if (rawExchange === "NSE") exchangeSegment = "NSE_EQ";
        else if (rawExchange === "BSE") exchangeSegment = "BSE_EQ";
        else if (rawExchange === "NFO") exchangeSegment = "NSE_FNO";
        else if (rawExchange === "MCX") exchangeSegment = "MCX_COMM";
        else exchangeSegment = rawExchange;

        // 🔥 FIX: "BANK" ki jagah exact "BANKNIFTY" match karenge
        if (upperSymbol.includes("NIFTY") || upperSymbol.includes("SENSEX") || upperSymbol === "BANKNIFTY" || upperSymbol === "NIFTY BANK") {
            exchangeSegment = "IDX_I";
        }

        const instrumentType = exchangeSegment === "IDX_I" ? "INDEX" : "EQUITY";

        const cleanSymbolForMap = upperSymbol.replace(' 50', '').trim();
        const securityId = instrumentData.securityId || dhanIdMap[upperSymbol] || dhanIdMap[cleanSymbolForMap] || "13";
        
        let timeframe = "5"; 
        if (strategy.data && strategy.data.config && strategy.data.config.timeframe) {
            timeframe = strategy.data.config.timeframe.toString().replace('m', '');
        } else if (strategy.data && strategy.data.entrySettings && strategy.data.entrySettings.timeframe) {
            timeframe = strategy.data.entrySettings.timeframe.toString().replace('m', '');
        }

        console.log(`🧠 Config -> Symbol: ${symbol}, ID: ${securityId}, Seg: ${exchangeSegment}, Inst: ${instrumentType}, TF: ${timeframe}`);

        // ==========================================
        // 3. CACHING & DHAN API INTEGRATION (SMART LOGIC)
        // ==========================================
        console.log(`🔍 Checking DB for ${symbol} data from ${startDate.toISOString().split('T')[0]}...`);
        let cachedData = await HistoricalData.find({
            symbol, timeframe, timestamp: { $gte: startDate, $lte: endDate }
        }).sort({ timestamp: 1 });

        // 🔥 SMART CACHE LOGIC START 🔥
        let shouldFetchFromDhan = false;

        if (cachedData.length === 0) {
            shouldFetchFromDhan = true;
        } else {
            const dbStartDate = cachedData[0].timestamp;
            const dbEndDate = cachedData[cachedData.length - 1].timestamp;

            if (dbStartDate > new Date(startDate.getTime() + 86400000) || 
                dbEndDate < new Date(endDate.getTime() - 86400000)) {
                
                console.log(`⚠️ Partial data found in DB. Need fresh data from Dhan!`);
                shouldFetchFromDhan = true;
                
                await HistoricalData.deleteMany({ symbol, timeframe, timestamp: { $gte: startDate, $lte: endDate } });
            }
        }

        if (shouldFetchFromDhan) {
            console.log(`⚠️ Fetching fresh data from Dhan API...`);
            const broker = await Broker.findOne({ engineOn: true });
            if (!broker) return res.status(400).json({ success: false, message: 'No active broker found for API keys' });

            const formatDhanDate = (d) => d.toISOString().split('T')[0];

            const dhanRes = await fetchDhanHistoricalData(
                broker.clientId, 
                broker.apiSecret, 
                securityId,           
                exchangeSegment,      
                instrumentType,       
                formatDhanDate(startDate), 
                formatDhanDate(endDate), 
                timeframe
            );

            const timeArray = dhanRes.data ? (dhanRes.data.start_Time || dhanRes.data.timestamp) : null;

            if (dhanRes.success && timeArray) {
                const { open, high, low, close, volume } = dhanRes.data;
                const bulkOps = [];
                for (let i = 0; i < timeArray.length; i++) {
                    let ms = timeArray[i];
                    if (ms < 10000000000) ms = ms * 1000; 

                    const timestamp = new Date(ms); 
                    bulkOps.push({ insertOne: { document: { symbol, timeframe, timestamp, open: open[i], high: high[i], low: low[i], close: close[i], volume: volume[i] } } });
                }
                
                if (bulkOps.length > 0) {
                    await HistoricalData.bulkWrite(bulkOps, { ordered: false }).catch(e => console.log("Duplicates ignored"));
                    console.log(`✅ Saved ${bulkOps.length} new candles to MongoDB!`);
                    cachedData = await HistoricalData.find({ symbol, timeframe, timestamp: { $gte: startDate, $lte: endDate } }).sort({ timestamp: 1 });
                }
            } else {
                console.log(`⚠️ Dhan API returned no data. Reason: ${dhanRes.message || "Unknown Format"}`);
                return res.status(404).json({ 
                    success: false, 
                    errorType: "NO_DATA",
                    message: "Data not available for this period. Market might be closed (Weekend/Holiday) or the date is too old for intraday data." 
                });
            }
        }
        // 🔥 SMART CACHE LOGIC END 🔥

        console.log(`📊 Processing ${cachedData.length} Real Candles...`);


        // ==========================================
        // 🧠 THE UNIVERSAL INDICATOR ENGINE 🧠
        // ==========================================
        console.log("⚙️ Pre-calculating Technical Indicators...");
        
        // Helper Function: Indicator calculate karne ke liye
        const calculateIndicator = (indConfig, candles) => {
            if (!indConfig) return null;
            
            // Agar Static Number hai (jaise 50), to har candle ke liye 50 return karo
            if (indConfig.id === 'number' || indConfig.id === 'static') {
                return candles.map(() => Number(indConfig.value || indConfig.params?.Value || 0));
            }

            const closePrices = candles.map(c => c.close);
            let results = [];
            const period = Number(indConfig.params?.Period) || 14;

            try {
                if (indConfig.id === 'sma') results = SMA.calculate({ period, values: closePrices });
                else if (indConfig.id === 'ema') results = EMA.calculate({ period, values: closePrices });
                else if (indConfig.id === 'rsi') results = RSI.calculate({ period, values: closePrices });
                else if (indConfig.id === 'candle') return closePrices; // Direct Price

                // Array size match karne ke liye shuru me 'null' daal do (Padding)
                const padding = Array(candles.length - results.length).fill(null);
                return [...padding, ...results];
            } catch (error) {
                console.error(`Error calculating ${indConfig.id}:`, error);
                return Array(candles.length).fill(null);
            }
        };

        // Strategy se Entry Conditions nikalna
        const entryConds = strategy.data.entryConditions && strategy.data.entryConditions.length > 0 ? strategy.data.entryConditions[0] : null;

        // Loop se pehle saare indicators ek baar me calculate karke rakh lo (For Super Fast Speed ⚡)
        const calcLongInd1 = [];
        const calcLongInd2 = [];

        if (entryConds && entryConds.longRules) {
            entryConds.longRules.forEach((rule, idx) => {
                calcLongInd1[idx] = calculateIndicator(rule.ind1, cachedData);
                calcLongInd2[idx] = calculateIndicator(rule.ind2, cachedData);
            });
        }

        // Helper Function: Condition check karne ke liye
        const evaluateCondition = (val1, val2, prevVal1, prevVal2, op) => {
            if (val1 === null || val2 === null) return false;
            switch(op) {
                case 'Greater Than': return val1 > val2;
                case 'Less Than': return val1 < val2;
                case 'Equals': return val1 === val2;
                case 'Crosses Above':
                    if (prevVal1 === null || prevVal2 === null) return false;
                    return prevVal1 <= prevVal2 && val1 > val2; // Pichli candle me niche tha, ab upar hai
                case 'Crosses Below':
                    if (prevVal1 === null || prevVal2 === null) return false;
                    return prevVal1 >= prevVal2 && val1 < val2; // Pichli candle me upar tha, ab niche hai
                default: return false;
            }
        };


        // ==========================================
        // 4. METRICS & ENGINE LOOP
        // ==========================================
        let currentEquity = 0, peakEquity = 0, maxDrawdown = 0;
        let winDays = 0, lossDays = 0, winTrades = 0, lossTrades = 0;
        let currentWinStreak = 0, currentLossStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
        let maxProfitTrade = 0, maxLossTrade = 0;
        const equityCurve = [];
        const daywiseBreakdown = [];
        let dailyBreakdownMap = {}; 

        let isPositionOpen = false;
        let entryPrice = 0;
        let tradeQuantity = strategy.data.legs && strategy.data.legs[0] ? Number(strategy.data.legs[0].quantity) : 1;

        cachedData.forEach((candle, i) => {
            const timeStr = candle.timestamp.toLocaleTimeString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata' });
            const dateStr = candle.timestamp.toISOString().split('T')[0];

            if (!dailyBreakdownMap[dateStr]) {
                dailyBreakdownMap[dateStr] = { pnl: 0, trades: 0 };
            }

            // 🔥 REAL DYNAMIC EVALUATION 🔥
            let longSignal = false;

            if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
                let overallResult = null;

                entryConds.longRules.forEach((rule, idx) => {
                    const val1 = calcLongInd1[idx] ? calcLongInd1[idx][i] : null;
                    const val2 = calcLongInd2[idx] ? calcLongInd2[idx][i] : null;
                    const prevVal1 = (i > 0 && calcLongInd1[idx]) ? calcLongInd1[idx][i-1] : null;
                    const prevVal2 = (i > 0 && calcLongInd2[idx]) ? calcLongInd2[idx][i-1] : null;

                    const ruleResult = evaluateCondition(val1, val2, prevVal1, prevVal2, rule.op);

                    // Logical Operator (AND / OR) Check karna
                    if (idx === 0) {
                        overallResult = ruleResult;
                    } else {
                        const logicalOp = entryConds.logicalOps[idx - 1]; 
                        if (logicalOp === 'AND') overallResult = overallResult && ruleResult;
                        else if (logicalOp === 'OR') overallResult = overallResult || ruleResult;
                    }
                });

                longSignal = overallResult;
            }

            // MARKET TIMING RESTRICTION (9:15 AM ke baad hi trade le)
            const isMarketOpen = timeStr >= "09:15:00" && timeStr < "15:15:00";

            // 🟢 TAKE TRADE (ENTRY)
            if (!isPositionOpen && longSignal && isMarketOpen) {
                isPositionOpen = true;
                entryPrice = candle.close;
                // console.log(`📈 LONG ENTRY at ${dateStr} ${timeStr} | Price: ${entryPrice}`);
            }

            // 🔴 EXIT TRADE (Dummy Exit Rule: 15:15 par becho, isko aage advance karenge)
            if (isPositionOpen && timeStr >= "15:15:00") {
                isPositionOpen = false;
                const exitPrice = candle.close;
                const pnl = (exitPrice - entryPrice) * tradeQuantity; 

                dailyBreakdownMap[dateStr].pnl += pnl;
                dailyBreakdownMap[dateStr].trades += 1;

                if (pnl > 0) {
                    winTrades++;
                    if (pnl > maxProfitTrade) maxProfitTrade = pnl;
                } else {
                    lossTrades++;
                    if (pnl < maxLossTrade) maxLossTrade = pnl;
                }
            }
        });

        // ==========================================
        // 5. DAILY LOOP (UI Format Conversion)
        // ==========================================
        for (const [date, data] of Object.entries(dailyBreakdownMap)) {
            if (data.trades > 0) { 
                const dailyPnL = data.pnl;
                currentEquity += dailyPnL;
                
                if (currentEquity > peakEquity) peakEquity = currentEquity;
                const drawdown = currentEquity - peakEquity;
                if (drawdown < maxDrawdown) maxDrawdown = drawdown;

                if (dailyPnL > 0) {
                    winDays++;
                    currentWinStreak++;
                    currentLossStreak = 0;
                    if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
                } else {
                    lossDays++;
                    currentLossStreak++;
                    currentWinStreak = 0;
                    if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
                }

                equityCurve.push({ date: date, pnl: currentEquity });
                daywiseBreakdown.push({ date: date, dailyPnL: dailyPnL, tradesTaken: data.trades });
            }
        }

        // ==========================================
        // 6. RETURN RESULT
        // ==========================================
        const backtestResult = {
            summary: {
                totalPnL: currentEquity,
                maxDrawdown: maxDrawdown,
                tradingDays: winDays + lossDays,
                winDays: winDays,
                lossDays: lossDays,
                totalTrades: winTrades + lossTrades,
                winTrades: winTrades,
                lossTrades: lossTrades,
                maxWinStreak: maxWinStreak,
                maxLossStreak: maxLossStreak,
                maxProfit: maxProfitTrade,
                maxLoss: maxLossTrade,
            },
            equityCurve: equityCurve,
            daywiseBreakdown: daywiseBreakdown.reverse()
        };

        return res.status(200).json({ success: true, data: backtestResult });

    } catch (error) {
        console.error("Backtest Error:", error);
        res.status(500).json({ success: false, error: "Internal Server Error during Backtesting" });
    }
};

module.exports = { runBacktestSimulator };