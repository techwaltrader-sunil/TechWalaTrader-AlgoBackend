const Strategy = require('../models/Strategy');

// 🔥 THE SIMULATOR ENGINE 🔥
// Ye function pichle 6 mahine ka realistic dummy data generate karega
const runBacktestSimulator = async (req, res) => {
    try {
        const { strategyId } = req.params;
        
        // 1. Strategy check karein
        const strategy = await Strategy.findById(strategyId);
        if (!strategy) {
            return res.status(404).json({ error: "Strategy not found" });
        }

        console.log(`🚀 Running Backtest for Strategy: ${strategy.name}`);

        // 2. Base Setup (6 Months of Trading Days)
        const totalTradingDays = 120; // Approx 6 months ke trading days
        let currentEquity = 0;
        let peakEquity = 0;
        let maxDrawdown = 0;
        
        let winDays = 0, lossDays = 0;
        let winTrades = 0, lossTrades = 0;
        let currentWinStreak = 0, currentLossStreak = 0;
        let maxWinStreak = 0, maxLossStreak = 0;
        let maxProfitTrade = 0, maxLossTrade = 0;

        const equityCurve = [];
        const daywiseBreakdown = [];

        // 3. Risk Management & Logic (Strategy data se uthaya hua ya default)
        const riskData = strategy.data?.riskManagement || {};
        const dailyMaxProfitLimit = riskData.maxProfit > 0 ? riskData.maxProfit : 2500;
        const dailyMaxLossLimit = riskData.maxLoss > 0 ? -riskData.maxLoss : -1500;

        // 4. Daily Loop (Generate Dummy Data)
        let currentDate = new Date();
        currentDate.setMonth(currentDate.getMonth() - 6); // 6 mahine pichhe jao

        for (let i = 0; i < totalTradingDays; i++) {
            // Skip Weekends (Saturday=6, Sunday=0)
            while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
                currentDate.setDate(currentDate.getDate() + 1);
            }

            // Ek din me 1 se 5 trades random lenge (Re-entry logic mimic karne ke liye)
            const tradesToday = Math.floor(Math.random() * 5) + 1; 
            let dailyPnL = 0;

            for (let t = 0; t < tradesToday; t++) {
                // 30% chance Win ka, 70% chance Loss ka (Options Buying reality)
                const isWin = Math.random() > 0.70; 
                
                let tradePnL = 0;
                if (isWin) {
                    tradePnL = Math.floor(Math.random() * 1500) + 500; // Profit between 500 to 2000
                    winTrades++;
                    if (tradePnL > maxProfitTrade) maxProfitTrade = tradePnL;
                } else {
                    tradePnL = -(Math.floor(Math.random() * 500) + 200); // Loss between -200 to -700 (Small SL)
                    lossTrades++;
                    if (tradePnL < maxLossTrade) maxLossTrade = tradePnL;
                }
                
                dailyPnL += tradePnL;

                // Daily Risk Limit Check (Max Profit/Max Loss hit ho gaya toh trade band)
                if (dailyPnL >= dailyMaxProfitLimit || dailyPnL <= dailyMaxLossLimit) {
                    break; 
                }
            }

            // Streak & Win/Loss Day Logic
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

            // Equity & Drawdown Logic
            currentEquity += dailyPnL;
            if (currentEquity > peakEquity) peakEquity = currentEquity;
            const drawdown = currentEquity - peakEquity;
            if (drawdown < maxDrawdown) maxDrawdown = drawdown;

            // Save Data for Charts
            const dateString = currentDate.toISOString().split('T')[0];
            equityCurve.push({ date: dateString, pnl: currentEquity });
            daywiseBreakdown.push({ date: dateString, dailyPnL: dailyPnL, tradesTaken: tradesToday });

            // Agle din ke liye date badhao
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // 5. Final JSON Response Format (Algorooms Style)
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
            daywiseBreakdown: daywiseBreakdown.reverse() // Latest pehle dikhane ke liye
        };

        return res.status(200).json({ success: true, data: backtestResult });

    } catch (error) {
        console.error("Backtest Error:", error);
        res.status(500).json({ success: false, error: "Internal Server Error during Backtesting" });
    }
};

module.exports = { runBacktestSimulator };