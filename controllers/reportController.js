const Deployment = require('../models/Deployment');

exports.getReportSummary = async (req, res) => {
    try {
        const { startDate, endDate, brokerId, mode } = req.query;

        // 1. Filter Setup (COMPLETED trades only)
        let query = { status: 'COMPLETED' };

        // 🎯 Live vs Forward (Paper Trading) Filter using executionType
        if (mode === 'Forward') {
            query.executionType = { $in: ['PAPER', 'FORWARD_TEST'] }; 
        } else {
            query.executionType = 'LIVE'; 
        }

        // 2. Date Filter
        if (startDate && endDate) {
            query.updatedAt = {
                $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
                $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
            };
        }

        // 3. Broker Filter
        if (brokerId && brokerId !== 'All') {
            query.brokers = { $in: [brokerId] };
        }

        // 4. Fetch Deployments from DB
        const deployments = await Deployment.find(query).populate('strategyId');

        let totalTrades = deployments.length;
        let totalPnl = 0;
        let wins = 0;
        let losses = 0;
        let maxProfit = 0;
        let maxLoss = 0;
        let strategyBreakdown = {};
        let dailyBreakdown = {}; 

        // 5. Data Calculation Loop
        deployments.forEach(dep => {
            
            // 🔥 THE MAIN FIX: Calculate PnL directly from executedLegs (Reverse Summation)
            // Ab hum root 'realizedPnl' par bharosa nahi karenge
            let calculatedPnl = 0;
            if (dep.executedLegs && dep.executedLegs.length > 0) {
                calculatedPnl = dep.executedLegs.reduce((sum, leg) => {
                    const legPnl = leg.livePnl !== undefined ? leg.livePnl : (leg.pnl || 0);
                    return sum + legPnl;
                }, 0);
            } else {
                calculatedPnl = dep.realizedPnl || dep.pnl || 0;
            }

            const pnl = calculatedPnl; // Ye ab 100% accurate Net P&L hai
            totalPnl += pnl;

            if (pnl > 0) wins++;
            else if (pnl < 0) losses++;

            if (pnl > maxProfit) maxProfit = pnl;
            if (pnl < maxLoss) maxLoss = pnl;

            // 🔥 Time formatting
            const entryDateObj = new Date(dep.createdAt);
            const exitDateObj = new Date(dep.updatedAt);
            
            const dateStrFull = exitDateObj.toISOString().split('T')[0]; 
            const entryTimeStr = entryDateObj.toLocaleTimeString('en-US', { hour12: false, timeZone: 'Asia/Kolkata' });
            const exitTimeStr = exitDateObj.toLocaleTimeString('en-US', { hour12: false, timeZone: 'Asia/Kolkata' });

            // Dynamic Segment Extraction
            let segment = dep.tradedExchange;
            if (!segment && dep.executedLegs && dep.executedLegs.length > 0) {
                segment = dep.executedLegs[0].exchange;
            }
            segment = segment || 'OPTION'; 

            // Strategy Breakdown Setup
            const strategyName = dep.strategyId ? dep.strategyId.name : "Unknown Strategy";
            if (!strategyBreakdown[strategyName]) {
                strategyBreakdown[strategyName] = { 
                    pnl: 0, 
                    trades: 0, 
                    wins: 0, 
                    losses: 0, 
                    segment: segment, 
                    tradesList: []
                };
            }

            // Metrics Update
            strategyBreakdown[strategyName].pnl += pnl;
            strategyBreakdown[strategyName].trades += 1;
            if (pnl > 0) strategyBreakdown[strategyName].wins += 1;
            else if (pnl < 0) strategyBreakdown[strategyName].losses += 1;

            // Trade Push to Array
            strategyBreakdown[strategyName].tradesList.push({
                executedLegs: dep.executedLegs || [], 
                date: dateStrFull,
                createdAt: dep.createdAt,
                updatedAt: dep.updatedAt,
                entryTime: entryTimeStr,
                exitTime: exitTimeStr,
                tradedSymbol: dep.tradedSymbol || strategyName,
                tradeAction: dep.tradeAction || "BUY",
                tradedQty: dep.tradedQty || 0,
                entryPrice: dep.entryPrice || 0,
                exitPrice: dep.exitPrice || 0,
                realizedPnl: pnl, // 🔥 Updated accurate PnL passed to UI
                exitRemarks: dep.exitRemarks || "COMPLETED"
            });

            // Day-wise P&L Calculation
            const dateStr = exitDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); 
            if (!dailyBreakdown[dateStr]) dailyBreakdown[dateStr] = 0;
            dailyBreakdown[dateStr] += pnl;
        });

        const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(2) : 0;
        
        // Final Output Map
        const strategyData = Object.keys(strategyBreakdown).map(name => ({ 
            name, 
            ...strategyBreakdown[name] 
        }));

        // Daily P&L Array formatting
        const dailyData = Object.keys(dailyBreakdown).map(date => ({
            date,
            pnl: dailyBreakdown[date],
            fill: dailyBreakdown[date] >= 0 ? '#10b981' : '#ef4444' 
        }));

        res.status(200).json({
            success: true,
            data: { totalTrades, totalPnl, wins, losses, winRate, maxProfit, maxLoss, strategyData, dailyData }
        });

    } catch (error) {
        console.error("❌ Report API Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch reports" });
    }
};