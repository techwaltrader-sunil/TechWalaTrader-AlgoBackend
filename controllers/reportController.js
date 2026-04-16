// const Deployment = require('../models/Deployment');

// exports.getReportSummary = async (req, res) => {
//     try {
//         const { startDate, endDate, brokerId } = req.query;

//         // 1. Filter Banayenge (Sirf COMPLETED trades chahiye)
//         let query = { status: 'COMPLETED' };

//         // Agar UI se Date aayi hai, to date filter lagao (UpdatedAt ke hisaab se kyunki trade tabhi close hua)
//         if (startDate && endDate) {
//             query.updatedAt = {
//                 $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
//                 $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
//             };
//         }

//         // Agar specific broker select kiya hai (Optional)
//         if (brokerId && brokerId !== 'All') {
//             query.brokers = { $in: [brokerId] };
//         }

//         // 2. Database se Data nikalo
//         const deployments = await Deployment.find(query).populate('strategyId');

//         // 3. Variables for Calculations
//         let totalTrades = deployments.length;
//         let totalPnl = 0;
//         let wins = 0;
//         let losses = 0;
//         let maxProfit = 0;
//         let maxLoss = 0;
//         let strategyBreakdown = {}; // Donut Chart aur Table ke liye

//         // 4. Har trade ka P&L check karke Maths karo
//         deployments.forEach(dep => {
//             const pnl = dep.realizedPnl || 0;
//             totalPnl += pnl;

//             if (pnl > 0) wins++;
//             else if (pnl < 0) losses++;

//             if (pnl > maxProfit) maxProfit = pnl;
//             if (pnl < maxLoss) maxLoss = pnl;

//             // Strategy ke hisaab se P&L baanto (Donut Chart ke liye)
//             const strategyName = dep.strategyId ? dep.strategyId.name : "Unknown Strategy";
//             if (!strategyBreakdown[strategyName]) {
//                 strategyBreakdown[strategyName] = { pnl: 0, trades: 0, wins: 0, losses: 0, segment: dep.tradedExchange || 'N/A' };
//             }
//             strategyBreakdown[strategyName].pnl += pnl;
//             strategyBreakdown[strategyName].trades += 1;
//             if (pnl > 0) strategyBreakdown[strategyName].wins += 1;
//             else if (pnl < 0) strategyBreakdown[strategyName].losses += 1;
//         });

//         // 5. Win Rate Calculate karo
//         const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(2) : 0;

//         // 6. Object ko Array me convert karo taaki Frontend ko aasaani ho
//         const strategyData = Object.keys(strategyBreakdown).map(name => ({
//             name,
//             ...strategyBreakdown[name]
//         }));

//         // 7. Frontend ko mast JSON bhej do
//         res.status(200).json({
//             success: true,
//             data: {
//                 totalTrades,
//                 totalPnl,
//                 wins,
//                 losses,
//                 winRate,
//                 maxProfit,
//                 maxLoss,
//                 strategyData
//             }
//         });

//     } catch (error) {
//         console.error("❌ Report API Error:", error);
//         res.status(500).json({ success: false, message: "Failed to fetch reports" });
//     }
// };


// const Deployment = require('../models/Deployment');

// exports.getReportSummary = async (req, res) => {
//     try {
//         const { startDate, endDate, brokerId, mode } = req.query;

//         // 1. Filter Setup (COMPLETED trades only)
//         let query = { status: 'COMPLETED' };

//         // 🎯 FIX 3: Live vs Forward (Paper Trading) Filter
//         // Abhi hamare paas asli DB me Forward ka data nahi hai, to wo empty aayega (jo ki sahi hai)
//         if (mode === 'Forward') {
//             query.isPaperTrade = true; 
//         } else {
//             query.isPaperTrade = { $ne: true }; // Jo paper trade nahi hai wo sab LIVE hai
//         }

//         if (startDate && endDate) {
//             query.updatedAt = {
//                 $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
//                 $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
//             };
//         }

//         if (brokerId && brokerId !== 'All') {
//             query.brokers = { $in: [brokerId] };
//         }

//         const deployments = await Deployment.find(query).populate('strategyId');

//         let totalTrades = deployments.length;
//         let totalPnl = 0;
//         let wins = 0;
//         let losses = 0;
//         let maxProfit = 0;
//         let maxLoss = 0;
//         let strategyBreakdown = {};
        
//         // 🎯 FIX 2: Day-wise P&L Object
//         let dailyBreakdown = {}; 

//         deployments.forEach(dep => {
//             const pnl = dep.realizedPnl || 0;
//             totalPnl += pnl;

//             if (pnl > 0) wins++;
//             else if (pnl < 0) losses++;

//             if (pnl > maxProfit) maxProfit = pnl;
//             if (pnl < maxLoss) maxLoss = pnl;

//             // Strategy Breakdown
//             const strategyName = dep.strategyId ? dep.strategyId.name : "Unknown Strategy";
//             if (!strategyBreakdown[strategyName]) {
//                 strategyBreakdown[strategyName] = { pnl: 0, trades: 0, wins: 0, losses: 0, segment: dep.tradedExchange || 'N/A' };
//             }
//             strategyBreakdown[strategyName].pnl += pnl;
//             strategyBreakdown[strategyName].trades += 1;
//             if (pnl > 0) strategyBreakdown[strategyName].wins += 1;
//             else if (pnl < 0) strategyBreakdown[strategyName].losses += 1;

//             // Day-wise P&L Calculation
//             const dateStr = new Date(dep.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); // Example: "31 Mar"
//             if (!dailyBreakdown[dateStr]) dailyBreakdown[dateStr] = 0;
//             dailyBreakdown[dateStr] += pnl;
//         });

//         const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(2) : 0;
//         const strategyData = Object.keys(strategyBreakdown).map(name => ({ name, ...strategyBreakdown[name] }));

//         // Daily P&L ko Array me convert karna Bar Chart ke liye
//         const dailyData = Object.keys(dailyBreakdown).map(date => ({
//             date,
//             pnl: dailyBreakdown[date],
//             // Agar profit hai to Green, loss hai to Red bar
//             fill: dailyBreakdown[date] >= 0 ? '#10b981' : '#ef4444' 
//         }));

//         res.status(200).json({
//             success: true,
//             data: { totalTrades, totalPnl, wins, losses, winRate, maxProfit, maxLoss, strategyData, dailyData }
//         });

//     } catch (error) {
//         console.error("❌ Report API Error:", error);
//         res.status(500).json({ success: false, message: "Failed to fetch reports" });
//     }
// };


// const Deployment = require('../models/Deployment');

// exports.getReportSummary = async (req, res) => {
//     try {
//         const { startDate, endDate, brokerId, mode } = req.query;

//         // 1. Filter Setup (COMPLETED trades only)
//         let query = { status: 'COMPLETED' };

//         // 🎯 FIX: Live vs Forward (Paper Trading) Filter using executionType
//         // Hamara tradingEngine ab 'executionType' me 'LIVE', 'PAPER', ya 'FORWARD_TEST' save karta hai
//         if (mode === 'Forward') {
//             query.executionType = { $in: ['PAPER', 'FORWARD_TEST'] }; 
//         } else {
//             // Agar mode Live hai ya kuch bhi pass nahi hua, to default LIVE dikhao
//             query.executionType = 'LIVE'; 
//         }

//         if (startDate && endDate) {
//             query.updatedAt = {
//                 $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
//                 $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
//             };
//         }

//         if (brokerId && brokerId !== 'All') {
//             query.brokers = { $in: [brokerId] };
//         }

//         const deployments = await Deployment.find(query).populate('strategyId');

//         let totalTrades = deployments.length;
//         let totalPnl = 0;
//         let wins = 0;
//         let losses = 0;
//         let maxProfit = 0;
//         let maxLoss = 0;
//         let strategyBreakdown = {};
        
//         // 🎯 FIX 2: Day-wise P&L Object
//         let dailyBreakdown = {}; 

//         deployments.forEach(dep => {
//             const pnl = dep.realizedPnl || 0;
//             totalPnl += pnl;

//             if (pnl > 0) wins++;
//             else if (pnl < 0) losses++;

//             if (pnl > maxProfit) maxProfit = pnl;
//             if (pnl < maxLoss) maxLoss = pnl;

//             // Strategy Breakdown
//             const strategyName = dep.strategyId ? dep.strategyId.name : "Unknown Strategy";
//             if (!strategyBreakdown[strategyName]) {
//                 strategyBreakdown[strategyName] = { pnl: 0, trades: 0, wins: 0, losses: 0, segment: dep.tradedExchange || 'N/A' };
//             }
//             strategyBreakdown[strategyName].pnl += pnl;
//             strategyBreakdown[strategyName].trades += 1;
//             if (pnl > 0) strategyBreakdown[strategyName].wins += 1;
//             else if (pnl < 0) strategyBreakdown[strategyName].losses += 1;

//             // Day-wise P&L Calculation
//             const dateStr = new Date(dep.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); // Example: "13 Apr"
//             if (!dailyBreakdown[dateStr]) dailyBreakdown[dateStr] = 0;
//             dailyBreakdown[dateStr] += pnl;
//         });

//         const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(2) : 0;
//         const strategyData = Object.keys(strategyBreakdown).map(name => ({ name, ...strategyBreakdown[name] }));

//         // Daily P&L ko Array me convert karna Bar Chart ke liye
//         const dailyData = Object.keys(dailyBreakdown).map(date => ({
//             date,
//             pnl: dailyBreakdown[date],
//             // Agar profit hai to Green, loss hai to Red bar
//             fill: dailyBreakdown[date] >= 0 ? '#10b981' : '#ef4444' 
//         }));

//         res.status(200).json({
//             success: true,
//             data: { totalTrades, totalPnl, wins, losses, winRate, maxProfit, maxLoss, strategyData, dailyData }
//         });

//     } catch (error) {
//         console.error("❌ Report API Error:", error);
//         res.status(500).json({ success: false, message: "Failed to fetch reports" });
//     }
// };



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
            // Agar mode Live hai ya kuch bhi pass nahi hua, to default LIVE dikhao
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
            const pnl = dep.realizedPnl || 0;
            totalPnl += pnl;

            if (pnl > 0) wins++;
            else if (pnl < 0) losses++;

            if (pnl > maxProfit) maxProfit = pnl;
            if (pnl < maxLoss) maxLoss = pnl;

            // 🔥 Time formatting (Mongoose timestamps: createdAt = Entry, updatedAt = Exit)
            const entryDateObj = new Date(dep.createdAt);
            const exitDateObj = new Date(dep.updatedAt);
            
            // Full Date for records (e.g., "2026-04-15")
            const dateStrFull = exitDateObj.toISOString().split('T')[0]; 
            const entryTimeStr = entryDateObj.toLocaleTimeString('en-US', { hour12: false, timeZone: 'Asia/Kolkata' });
            const exitTimeStr = exitDateObj.toLocaleTimeString('en-US', { hour12: false, timeZone: 'Asia/Kolkata' });

            // Strategy Breakdown Setup
            const strategyName = dep.strategyId ? dep.strategyId.name : "Unknown Strategy";
            if (!strategyBreakdown[strategyName]) {
                strategyBreakdown[strategyName] = { 
                    pnl: 0, 
                    trades: 0, 
                    wins: 0, 
                    losses: 0, 
                    segment: dep.tradedExchange || 'N/A',
                    tradesList: [] // 🔥 ARRAY FOR FRONTEND ACCORDION
                };
            }

            // Metrics Update
            strategyBreakdown[strategyName].pnl += pnl;
            strategyBreakdown[strategyName].trades += 1;
            if (pnl > 0) strategyBreakdown[strategyName].wins += 1;
            else if (pnl < 0) strategyBreakdown[strategyName].losses += 1;

            // 🔥 INDIVIDUAL TRADE DATA PUSH (Isi se Accordion banega)
            strategyBreakdown[strategyName].tradesList.push({
                tradedSymbol: dep.tradedSymbol || strategyName,
                tradeAction: dep.tradeAction || "BUY",
                tradedQty: dep.tradedQty || 0,
                entryPrice: dep.entryPrice || 0,
                exitPrice: dep.exitPrice || 0,
                realizedPnl: pnl,
                exitRemarks: dep.exitRemarks || "COMPLETED",
                date: dateStrFull,
                entryTime: entryTimeStr,
                exitTime: exitTimeStr
            });

            // Day-wise P&L Calculation for Bar Chart
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

        // Daily P&L Array formatting for Bar Chart
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