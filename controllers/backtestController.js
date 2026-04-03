// const Strategy = require('../models/Strategy');

// // 🔥 THE SIMULATOR ENGINE 🔥
// // Ye function pichle 6 mahine ka realistic dummy data generate karega
// const runBacktestSimulator = async (req, res) => {
//     try {
//         const { strategyId } = req.params;
        
//         // 1. Strategy check karein
//         const strategy = await Strategy.findById(strategyId);
//         if (!strategy) {
//             return res.status(404).json({ error: "Strategy not found" });
//         }

//         console.log(`🚀 Running Backtest for Strategy: ${strategy.name}`);

//         // 2. Base Setup (6 Months of Trading Days)
//         const totalTradingDays = 120; // Approx 6 months ke trading days
//         let currentEquity = 0;
//         let peakEquity = 0;
//         let maxDrawdown = 0;
        
//         let winDays = 0, lossDays = 0;
//         let winTrades = 0, lossTrades = 0;
//         let currentWinStreak = 0, currentLossStreak = 0;
//         let maxWinStreak = 0, maxLossStreak = 0;
//         let maxProfitTrade = 0, maxLossTrade = 0;

//         const equityCurve = [];
//         const daywiseBreakdown = [];

//         // 3. Risk Management & Logic (Strategy data se uthaya hua ya default)
//         const riskData = strategy.data?.riskManagement || {};
//         const dailyMaxProfitLimit = riskData.maxProfit > 0 ? riskData.maxProfit : 2500;
//         const dailyMaxLossLimit = riskData.maxLoss > 0 ? -riskData.maxLoss : -1500;

//         // 4. Daily Loop (Generate Dummy Data)
//         let currentDate = new Date();
//         currentDate.setMonth(currentDate.getMonth() - 6); // 6 mahine pichhe jao

//         for (let i = 0; i < totalTradingDays; i++) {
//             // Skip Weekends (Saturday=6, Sunday=0)
//             while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
//                 currentDate.setDate(currentDate.getDate() + 1);
//             }

//             // Ek din me 1 se 5 trades random lenge (Re-entry logic mimic karne ke liye)
//             const tradesToday = Math.floor(Math.random() * 5) + 1; 
//             let dailyPnL = 0;

//             for (let t = 0; t < tradesToday; t++) {
//                 // 30% chance Win ka, 70% chance Loss ka (Options Buying reality)
//                 const isWin = Math.random() > 0.70; 
                
//                 let tradePnL = 0;
//                 if (isWin) {
//                     tradePnL = Math.floor(Math.random() * 1500) + 500; // Profit between 500 to 2000
//                     winTrades++;
//                     if (tradePnL > maxProfitTrade) maxProfitTrade = tradePnL;
//                 } else {
//                     tradePnL = -(Math.floor(Math.random() * 500) + 200); // Loss between -200 to -700 (Small SL)
//                     lossTrades++;
//                     if (tradePnL < maxLossTrade) maxLossTrade = tradePnL;
//                 }
                
//                 dailyPnL += tradePnL;

//                 // Daily Risk Limit Check (Max Profit/Max Loss hit ho gaya toh trade band)
//                 if (dailyPnL >= dailyMaxProfitLimit || dailyPnL <= dailyMaxLossLimit) {
//                     break; 
//                 }
//             }

//             // Streak & Win/Loss Day Logic
//             if (dailyPnL > 0) {
//                 winDays++;
//                 currentWinStreak++;
//                 currentLossStreak = 0;
//                 if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
//             } else {
//                 lossDays++;
//                 currentLossStreak++;
//                 currentWinStreak = 0;
//                 if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
//             }

//             // Equity & Drawdown Logic
//             currentEquity += dailyPnL;
//             if (currentEquity > peakEquity) peakEquity = currentEquity;
//             const drawdown = currentEquity - peakEquity;
//             if (drawdown < maxDrawdown) maxDrawdown = drawdown;

//             // Save Data for Charts
//             const dateString = currentDate.toISOString().split('T')[0];
//             equityCurve.push({ date: dateString, pnl: currentEquity });
//             daywiseBreakdown.push({ date: dateString, dailyPnL: dailyPnL, tradesTaken: tradesToday });

//             // Agle din ke liye date badhao
//             currentDate.setDate(currentDate.getDate() + 1);
//         }

//         // 5. Final JSON Response Format (Algorooms Style)
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
//             daywiseBreakdown: daywiseBreakdown.reverse() // Latest pehle dikhane ke liye
//         };

//         return res.status(200).json({ success: true, data: backtestResult });

//     } catch (error) {
//         console.error("Backtest Error:", error);
//         res.status(500).json({ success: false, error: "Internal Server Error during Backtesting" });
//     }
// };

// module.exports = { runBacktestSimulator };

// const Strategy = require('../models/Strategy');

// // 🔥 THE SIMULATOR ENGINE 🔥
// const runBacktestSimulator = async (req, res) => {
//     try {
//         const { strategyId } = req.params;
//         const { period } = req.query; // Frontend se period receive karo
        
//         const strategy = await Strategy.findById(strategyId);
//         if (!strategy) {
//             return res.status(404).json({ error: "Strategy not found" });
//         }

//         console.log(`🚀 Running Backtest for: ${strategy.name} | Period: ${period || '6M'}`);

//         // ✅ NAYA LOGIC: Period ke hisab se Trading Days aur Start Date set karo
//         let totalTradingDays = 120; 
//         let currentDate = new Date(); // Aaj ki date (Isko dobara declare nahi karna hai)

//         if (period === '1M') {
//             totalTradingDays = 22;
//             currentDate.setMonth(currentDate.getMonth() - 1); 
//         } 
//         else if (period === '3M') {
//             totalTradingDays = 65;
//             currentDate.setMonth(currentDate.getMonth() - 3); 
//         } 
//         else if (period === '6M') {
//             totalTradingDays = 130;
//             currentDate.setMonth(currentDate.getMonth() - 6); 
//         } 
//         else if (period === '1Y') {
//             totalTradingDays = 250;
//             currentDate.setFullYear(currentDate.getFullYear() - 1); 
//         } 
//         else if (period === '2Y') {
//             totalTradingDays = 500;
//             currentDate.setFullYear(currentDate.getFullYear() - 2); 
//         } 
//         else { 
//             totalTradingDays = 130; // Default 6M
//             currentDate.setMonth(currentDate.getMonth() - 6);
//         }

//         let currentEquity = 0;
//         let peakEquity = 0;
//         let maxDrawdown = 0;
        
//         let winDays = 0, lossDays = 0;
//         let winTrades = 0, lossTrades = 0;
//         let currentWinStreak = 0, currentLossStreak = 0;
//         let maxWinStreak = 0, maxLossStreak = 0;
//         let maxProfitTrade = 0, maxLossTrade = 0;

//         const equityCurve = [];
//         const daywiseBreakdown = [];

//         // 3. Risk Management & Logic
//         const riskData = strategy.data?.riskManagement || {};
//         const dailyMaxProfitLimit = riskData.maxProfit > 0 ? riskData.maxProfit : 2500;
//         const dailyMaxLossLimit = riskData.maxLoss > 0 ? -riskData.maxLoss : -1500;

//         // 4. Daily Loop (Generate Dummy Data)
//         // ❌ Yahan se purana 'let currentDate' hata diya gaya hai!

//         for (let i = 0; i < totalTradingDays; i++) {
//             // Skip Weekends (Saturday=6, Sunday=0)
//             while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
//                 currentDate.setDate(currentDate.getDate() + 1);
//             }

//             // Ek din me 1 se 5 trades random lenge
//             const tradesToday = Math.floor(Math.random() * 5) + 1; 
//             let dailyPnL = 0;

//             for (let t = 0; t < tradesToday; t++) {
//                 const isWin = Math.random() > 0.70; 
                
//                 let tradePnL = 0;
//                 if (isWin) {
//                     tradePnL = Math.floor(Math.random() * 1500) + 500; 
//                     winTrades++;
//                     if (tradePnL > maxProfitTrade) maxProfitTrade = tradePnL;
//                 } else {
//                     tradePnL = -(Math.floor(Math.random() * 500) + 200); 
//                     lossTrades++;
//                     if (tradePnL < maxLossTrade) maxLossTrade = tradePnL;
//                 }
                
//                 dailyPnL += tradePnL;

//                 if (dailyPnL >= dailyMaxProfitLimit || dailyPnL <= dailyMaxLossLimit) {
//                     break; 
//                 }
//             }

//             if (dailyPnL > 0) {
//                 winDays++;
//                 currentWinStreak++;
//                 currentLossStreak = 0;
//                 if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
//             } else {
//                 lossDays++;
//                 currentLossStreak++;
//                 currentWinStreak = 0;
//                 if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
//             }

//             currentEquity += dailyPnL;
//             if (currentEquity > peakEquity) peakEquity = currentEquity;
//             const drawdown = currentEquity - peakEquity;
//             if (drawdown < maxDrawdown) maxDrawdown = drawdown;

//             // Save Data for Charts
//             const dateString = currentDate.toISOString().split('T')[0];
//             equityCurve.push({ date: dateString, pnl: currentEquity });
//             daywiseBreakdown.push({ date: dateString, dailyPnL: dailyPnL, tradesTaken: tradesToday });

//             // Agle din ke liye date badhao
//             currentDate.setDate(currentDate.getDate() + 1);
//         }

//         // 5. Final JSON Response Format
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
//             daywiseBreakdown: daywiseBreakdown.reverse() // Latest pehle dikhane ke liye
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
//         const { period } = req.query; // e.g., '1M', '3M', '6M'
        
//         const strategy = await Strategy.findById(strategyId);
//         if (!strategy) {
//             return res.status(404).json({ error: "Strategy not found" });
//         }

//         console.log(`🚀 Running Real Backtest for: ${strategy.name} | Period: ${period || '1M'}`);

//         // 1. Period ke hisaab se Start aur End Date nikalna
//         let endDate = new Date();
//         let startDate = new Date();
        
//         if (period === '1M') startDate.setMonth(startDate.getMonth() - 1); 
//         else if (period === '3M') startDate.setMonth(startDate.getMonth() - 3); 
//         else if (period === '6M') startDate.setMonth(startDate.getMonth() - 6); 
//         else if (period === '1Y') startDate.setFullYear(startDate.getFullYear() - 1); 
//         else if (period === '2Y') startDate.setFullYear(startDate.getFullYear() - 2); 
//         else startDate.setMonth(startDate.getMonth() - 1); // Default 1M

//         // 2. Data Fetching & Caching (Dhan -> MongoDB)
//         const symbol = "NIFTY"; // TODO: Ise baad me strategy.symbol se link karenge
//         const exchangeSegment = "IDX_I";
//         const securityId = "13"; // Nifty 50 ka Dhan ID
//         const timeframe = "5"; // 5 minute candles

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
//                 broker.clientId, broker.apiSecret, securityId, exchangeSegment, 'INDEX', 
//                 formatDhanDate(startDate), formatDhanDate(endDate), timeframe
//             );

//             if (dhanRes.success && dhanRes.data.start_Time) {
//                 const { start_Time, open, high, low, close, volume } = dhanRes.data;
//                 const bulkOps = [];
//                 for (let i = 0; i < start_Time.length; i++) {
//                     const timestamp = new Date(start_Time[i] * 1000); 
//                     bulkOps.push({ insertOne: { document: { symbol, timeframe, timestamp, open: open[i], high: high[i], low: low[i], close: close[i], volume: volume[i] } } });
//                 }
                
//                 if (bulkOps.length > 0) {
//                     await HistoricalData.bulkWrite(bulkOps, { ordered: false }).catch(e => console.log("Duplicates ignored"));
//                     console.log(`✅ Saved ${bulkOps.length} new candles to MongoDB!`);
//                     // Fetch again after saving
//                     cachedData = await HistoricalData.find({ symbol, timeframe, timestamp: { $gte: startDate, $lte: endDate } }).sort({ timestamp: 1 });
//                 }
//             } else {
//                 // Dhan ka asli error message frontend ko bhejo
//                 return res.status(500).json({ success: false, message: `Dhan API Error: ${dhanRes.message}` });
//             }
//         }

//         console.log(`📊 Processing ${cachedData.length} Real Candles...`);

//         // 3. Variables for your amazing UI Metrics
//         let currentEquity = 0, peakEquity = 0, maxDrawdown = 0;
//         let winDays = 0, lossDays = 0, winTrades = 0, lossTrades = 0;
//         let currentWinStreak = 0, currentLossStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
//         let maxProfitTrade = 0, maxLossTrade = 0;
//         const equityCurve = [];
//         const daywiseBreakdown = [];
//         let dailyBreakdownMap = {}; // Har din ka total PnL yahan jama hoga

//         // 4. THE TIME MACHINE (Executing Strategy on Real Data)
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



const Strategy = require('../models/Strategy');
const HistoricalData = require('../models/HistoricalData');
const Broker = require('../models/Broker');
const { fetchDhanHistoricalData } = require('../services/dhanService');

// 🔥 THE REAL DATA BACKTEST ENGINE 🔥
const runBacktestSimulator = async (req, res) => {
    try {
        const { strategyId } = req.params;
        const { period, start, end } = req.query; // 🔥 FIX: Frontend se aayi start/end date receive karein
        
        const strategy = await Strategy.findById(strategyId);
        if (!strategy) {
            return res.status(404).json({ error: "Strategy not found" });
        }

        console.log(`🚀 Running Real Backtest for: ${strategy.name} | Period: ${period || '1M'}`);

        // 1. Period ke hisaab se Start aur End Date nikalna
        let endDate = new Date();
        let startDate = new Date();
        
        // 🔥 FIX: Agar Custom hai aur dates aayi hain, to unhe set karo
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
        // 2. Data Fetching & Caching (DYNAMIC LOGIC)
        // ==========================================
        
        // Dhan ke Security IDs ka "Super Map" (Har tarah ke naam ko cover karega)
        const dhanIdMap = {
            "NIFTY": "13",
            "NIFTY 50": "13",
            "BANKNIFTY": "25",
            "NIFTY BANK": "25",       // 🔥 Aapke DB wala naam!
            "FINNIFTY": "27",
            "NIFTY FIN SERVICE": "27",
            "MIDCPNIFTY": "118",
            "NIFTY MID SELECT": "118",
            "SENSEX": "51",
            "BSE SENSEX": "51"
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

        if (upperSymbol.includes("NIFTY") || upperSymbol.includes("SENSEX") || upperSymbol.includes("BANK")) {
            exchangeSegment = "IDX_I";
        }

        const instrumentType = exchangeSegment === "IDX_I" ? "INDEX" : "EQUITY";

        // 🔥 FIX: Ab ye directly "NIFTY BANK" ko match karke 25 nikal lega!
        const cleanSymbolForMap = upperSymbol.replace(' 50', '').trim();
        const securityId = instrumentData.securityId || dhanIdMap[upperSymbol] || dhanIdMap[cleanSymbolForMap] || "13";
        
        let timeframe = "5";
        if (strategy.data && strategy.data.config && strategy.data.config.timeframe) {
            timeframe = strategy.data.config.timeframe.toString().replace('m', '');
        } else if (strategy.data && strategy.data.entrySettings && strategy.data.entrySettings.timeframe) {
            timeframe = strategy.data.entrySettings.timeframe.toString().replace('m', '');
        }

        // Ye log ab aapko exact batayega ki Dhan ko kya jaa raha hai
        console.log(`🧠 Config -> Symbol: ${symbol}, ID: ${securityId}, Seg: ${exchangeSegment}, Inst: ${instrumentType}, TF: ${timeframe}m`);

        // ==========================================
        // 3. CACHING & DHAN API INTEGRATION
        // ==========================================
        console.log(`🔍 Checking DB for ${symbol} data from ${startDate.toISOString().split('T')[0]}...`);
        let cachedData = await HistoricalData.find({
            symbol, timeframe, timestamp: { $gte: startDate, $lte: endDate }
        }).sort({ timestamp: 1 });

        if (cachedData.length === 0) {
            console.log(`⚠️ Data not found in DB. Fetching from Dhan API...`);
            const broker = await Broker.findOne({ engineOn: true });
            if (!broker) return res.status(400).json({ success: false, message: 'No active broker found for API keys' });

            const formatDhanDate = (d) => d.toISOString().split('T')[0];
            
            // 🔥 FIX 3: 'INDEX' ki jagah dynamic 'instrumentType' bhej rahe hain
            const dhanRes = await fetchDhanHistoricalData(
                broker.clientId, broker.apiSecret, securityId, exchangeSegment, instrumentType, 
                formatDhanDate(startDate), formatDhanDate(endDate), timeframe
            );

            if (dhanRes.success && dhanRes.data.start_Time) {
                const { start_Time, open, high, low, close, volume } = dhanRes.data;
                const bulkOps = [];
                for (let i = 0; i < start_Time.length; i++) {
                    const timestamp = new Date(start_Time[i] * 1000); 
                    bulkOps.push({ insertOne: { document: { symbol, timeframe, timestamp, open: open[i], high: high[i], low: low[i], close: close[i], volume: volume[i] } } });
                }
                
                if (bulkOps.length > 0) {
                    await HistoricalData.bulkWrite(bulkOps, { ordered: false }).catch(e => console.log("Duplicates ignored"));
                    console.log(`✅ Saved ${bulkOps.length} new candles to MongoDB!`);
                    cachedData = await HistoricalData.find({ symbol, timeframe, timestamp: { $gte: startDate, $lte: endDate } }).sort({ timestamp: 1 });
                }
            } else {
                // 🔥 GENUINE SOLUTION: Fake data nahi banayenge. Sidha User ko sach batayenge.
                console.log(`⚠️ Dhan API returned no data. Reason: ${dhanRes.message}`);
                
                return res.status(404).json({ 
                    success: false, 
                    errorType: "NO_DATA",
                    message: "Data not available for this period. Market might be closed (Weekend/Holiday) or the date is too old for intraday data. Please try a recent working day." 
                });
            }
        }

        console.log(`📊 Processing ${cachedData.length} Real Candles...`);

        // ==========================================
        // 4. METRICS & ENGINE LOOP
        // ==========================================
        let currentEquity = 0, peakEquity = 0, maxDrawdown = 0;
        let winDays = 0, lossDays = 0, winTrades = 0, lossTrades = 0;
        let currentWinStreak = 0, currentLossStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
        let maxProfitTrade = 0, maxLossTrade = 0;
        const equityCurve = [];
        const daywiseBreakdown = [];
        let dailyBreakdownMap = {}; // Har din ka total PnL yahan jama hoga

        let isPositionOpen = false;
        let entryPrice = 0;

        cachedData.forEach(candle => {
            const timeStr = candle.timestamp.toLocaleTimeString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata' });
            const dateStr = candle.timestamp.toISOString().split('T')[0];

            if (!dailyBreakdownMap[dateStr]) {
                dailyBreakdownMap[dateStr] = { pnl: 0, trades: 0 };
            }

            // Dummy Trading Rule: Buy at 10:00 AM
            if (!isPositionOpen && timeStr.startsWith("10:00")) {
                isPositionOpen = true;
                entryPrice = candle.close;
            }

            // Dummy Trading Rule: Sell at 2:00 PM
            if (isPositionOpen && timeStr.startsWith("14:00")) {
                isPositionOpen = false;
                const exitPrice = candle.close;
                const pnl = (exitPrice - entryPrice) * 50; // Nifty Lot Size

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

        // 5. Daily Loop (Converting Trade Map to UI Format)
        for (const [date, data] of Object.entries(dailyBreakdownMap)) {
            if (data.trades > 0) { // Agar us din trade hua tha
                const dailyPnL = data.pnl;
                currentEquity += dailyPnL;
                
                // Drawdown Calculation
                if (currentEquity > peakEquity) peakEquity = currentEquity;
                const drawdown = currentEquity - peakEquity;
                if (drawdown < maxDrawdown) maxDrawdown = drawdown;

                // Win/Loss Streaks
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

        // 6. Return exact JSON format that Frontend needs
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