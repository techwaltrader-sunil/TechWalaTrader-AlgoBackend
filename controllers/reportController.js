const Deployment = require('../models/Deployment');

exports.getReportSummary = async (req, res) => {
    try {
        const { startDate, endDate, brokerId } = req.query;

        // 1. Filter Banayenge (Sirf COMPLETED trades chahiye)
        let query = { status: 'COMPLETED' };

        // Agar UI se Date aayi hai, to date filter lagao (UpdatedAt ke hisaab se kyunki trade tabhi close hua)
        if (startDate && endDate) {
            query.updatedAt = {
                $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
                $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
            };
        }

        // Agar specific broker select kiya hai (Optional)
        if (brokerId && brokerId !== 'All') {
            query.brokers = { $in: [brokerId] };
        }

        // 2. Database se Data nikalo
        const deployments = await Deployment.find(query).populate('strategyId');

        // 3. Variables for Calculations
        let totalTrades = deployments.length;
        let totalPnl = 0;
        let wins = 0;
        let losses = 0;
        let maxProfit = 0;
        let maxLoss = 0;
        let strategyBreakdown = {}; // Donut Chart aur Table ke liye

        // 4. Har trade ka P&L check karke Maths karo
        deployments.forEach(dep => {
            const pnl = dep.realizedPnl || 0;
            totalPnl += pnl;

            if (pnl > 0) wins++;
            else if (pnl < 0) losses++;

            if (pnl > maxProfit) maxProfit = pnl;
            if (pnl < maxLoss) maxLoss = pnl;

            // Strategy ke hisaab se P&L baanto (Donut Chart ke liye)
            const strategyName = dep.strategyId ? dep.strategyId.name : "Unknown Strategy";
            if (!strategyBreakdown[strategyName]) {
                strategyBreakdown[strategyName] = { pnl: 0, trades: 0, wins: 0, losses: 0, segment: dep.tradedExchange || 'N/A' };
            }
            strategyBreakdown[strategyName].pnl += pnl;
            strategyBreakdown[strategyName].trades += 1;
            if (pnl > 0) strategyBreakdown[strategyName].wins += 1;
            else if (pnl < 0) strategyBreakdown[strategyName].losses += 1;
        });

        // 5. Win Rate Calculate karo
        const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(2) : 0;

        // 6. Object ko Array me convert karo taaki Frontend ko aasaani ho
        const strategyData = Object.keys(strategyBreakdown).map(name => ({
            name,
            ...strategyBreakdown[name]
        }));

        // 7. Frontend ko mast JSON bhej do
        res.status(200).json({
            success: true,
            data: {
                totalTrades,
                totalPnl,
                wins,
                losses,
                winRate,
                maxProfit,
                maxLoss,
                strategyData
            }
        });

    } catch (error) {
        console.error("❌ Report API Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch reports" });
    }
};