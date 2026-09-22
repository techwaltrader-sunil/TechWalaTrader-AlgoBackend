const { Pool } = require('pg');
const mongoose = require('mongoose');
const BehaviorRule = require('../models/BehaviorRule'); // MongoDB Schema

// PostgreSQL Connection (Apne setup ke hisaab se adjust karein)
const pgPool = new Pool({
    user: process.env.PG_USER || 'postgres',
    host: process.env.PG_HOST || 'localhost',
    database: process.env.PG_DATABASE || 'smart_trader_db',
    password: process.env.PG_PASSWORD || 'password',
    port: process.env.PG_PORT || 5432,
});

// Helper: Day Name to JS Day Index
const getDayIndex = (dayName) => {
    const days = { "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6 };
    return days[dayName];
};

const runAutoBacktest = async (symbol = 'NIFTY', fromDate, toDate) => {
    console.log(`🚀 Starting Auto-Backtest Engine for ${symbol}...`);

    try {
        // ==========================================
        // 1. THE BRAIN: MongoDB se Active Rule lana
        // ==========================================
        const activeRule = await BehaviorRule.findOne({ isActive: true });
        if (!activeRule) {
            console.error("❌ No active behavior rule found in MongoDB!");
            return;
        }
        
        console.log(`🧠 Loaded Rule: ${activeRule.strategyName}`);
        const { targetDelta, dynamicPremiumOffset } = activeRule.strikeSelection;
        const { slPercent, tpPercent, emergencyEodExit } = activeRule.riskManagement;
        const targetDayIndex = getDayIndex(activeRule.timingRules.preferredEntryDay); // Ex: Friday = 5

        // ==========================================
        // 2. THE MUSCLE: PostgreSQL se Dates nikalna
        // ==========================================
        // Sabse pehle hum database se wo saari dates nikalenge jinka data available hai
        const dateQuery = `
            SELECT DISTINCT DATE(timestamp) as trade_date 
            FROM option_chain_data 
            WHERE instrument = $1 
            ORDER BY trade_date ASC;
        `;
        const dateResult = await pgPool.query(dateQuery, [symbol]);
        const allDates = dateResult.rows.map(row => row.trade_date);

        let report = {
            totalTrades: 0,
            wins: 0,
            losses: 0,
            totalPnL: 0,
            tradeLogs: []
        };

        // ==========================================
        // 3. CORE ENGINE LOOP: Har din ka data check karna
        // ==========================================
        for (let dateObj of allDates) {
            const tradeDateStr = dateObj.toISOString().split('T')[0];
            const currentDayIndex = dateObj.getDay();

            // Agar din hamare rule (e.g., Friday) se match nahi karta, toh skip karo
            if (currentDayIndex !== targetDayIndex) continue;

            console.log(`📅 Analyzing Trade Date: ${tradeDateStr} (${activeRule.timingRules.preferredEntryDay})`);

            // 🎯 ENTRY LOGIC: 09:15 AM par data uthao
            const entryTimeStr = `${tradeDateStr} 09:15:00+05:30`;
            
            // 🧠 SMART CREDIT SEEKER LOGIC START
            let isNetCredit = false;
            let maxAdjustments = 5;
            let adjustments = 0;
            
            // मान लीजिये मल्टीप्लायर लॉजिक से निकाली गई शुरुआती कच्ची स्ट्राइक्स ये हैं:
            // (इन्हें हम बाद में activeRule.legsConfiguration से डायनामिक करेंगे)
            let buy1Strike = 23600; 
            let sellStrike = 24400; // (2 Lots)
            let buy3Strike = 27500; 
            let minSpreadWidth = 300; // activeRule.minSpreadWidth से भी ले सकते हैं

            let buy1Premium, sellPremium, buy3Premium, netPremium;

            while (!isNetCredit && adjustments < maxAdjustments) {
                // 1. डेटाबेस से इन तीनों स्ट्राइक्स का प्रीमियम (Close Price) एक साथ निकालें
                const premiumQuery = `
                    SELECT strike, close FROM option_chain_data 
                    WHERE instrument = $1 AND timestamp = $2 AND option_type = 'CE' 
                    AND strike IN ($3, $4, $5)
                `;
                const pResult = await pgPool.query(premiumQuery, [symbol, entryTimeStr, buy1Strike, sellStrike, buy3Strike]);
                
                // 2. प्रीमियम वैल्यूज को मैप करें
                buy1Premium = Number(pResult.rows.find(r => r.strike == buy1Strike)?.close || 0);
                sellPremium = Number(pResult.rows.find(r => r.strike == sellStrike)?.close || 0);
                buy3Premium = Number(pResult.rows.find(r => r.strike == buy3Strike)?.close || 0);

                if (buy1Premium === 0 || sellPremium === 0) {
                    console.log(`⚠️ Data missing for strikes at 09:15 on ${tradeDateStr}, stopping adjustments.`);
                    break;
                }

                // 3. Net Credit चेक करें: (Sell Premium * 2) - (Buy1 + Buy3)
                netPremium = (sellPremium * 2) - buy1Premium - buy3Premium;

                // activeRule.ensureNetCredit चेक लगाकर इसे कंट्रोल किया जा सकता है
                if (netPremium > 0) {
                    console.log(`✅ Net Credit Achieved: ₹${netPremium.toFixed(2)} (Adjustments: ${adjustments})`);
                    isNetCredit = true;
                    break;
                }

                // 4. ⚠️ Debit! एडजस्टमेंट शुरू (Plan A & B)
                let currentSpreadWidth = Math.abs(sellStrike - buy1Strike);

                if (currentSpreadWidth > minSpreadWidth) {
                    buy1Strike += 100; // 🎯 PLAN A: Buy को OTM (पास) लाएं ताकि वह सस्ता हो
                    console.log(`⚠️ Plan A: Buy1 shifted to ${buy1Strike} (Current Spread: ${currentSpreadWidth})`);
                } else {
                    sellStrike -= 100; // 🎯 PLAN B: Sell को ITM (पास) लाएं ताकि प्रीमियम बढ़े
                    console.log(`⚠️ Plan B: Sell shifted to ${sellStrike} to protect Min Spread ${minSpreadWidth}`);
                }
                
                adjustments++;
            }

            // अगर 5 बार एडजस्ट करने के बाद भी क्रेडिट नहीं मिला, तो उस दिन का ट्रेड रिजेक्ट कर दें
            if (!isNetCredit) {
                console.log(`❌ Trade Skipped on ${tradeDateStr}: Could not achieve Net Credit.`);
                continue; // लूप छोड़कर अगले दिन (Next Friday) पर चले जाएं
            }

            // 🎯 TRADE EXECUTION
            // अब हमारा नेट प्रीमियम ही एंट्री प्रीमियम है, जिसे हम ट्रैकिंग के लिए इस्तेमाल करेंगे
            const combinedPremiumSold = netPremium; 
            
            console.log(`✅ Entry Executed: B1 ${buy1Strike} @ ₹${buy1Premium} | S ${sellStrike} (x2) @ ₹${sellPremium} | B2 ${buy3Strike} @ ₹${buy3Premium} | Net: ₹${combinedPremiumSold.toFixed(2)}`);
            // 🧠 SMART CREDIT SEEKER LOGIC END
            
            // Stop Loss & Target Profit Prices
            const slTriggerPremium = combinedPremiumSold * (1 + (slPercent.min / 100)); // SL hit if premium increases
            const tpTriggerPremium = combinedPremiumSold * (1 - (tpPercent.min / 100)); // TP hit if premium drops

            console.log(`✅ Entry Executed: CE ${ceEntry.strike} @ ₹${ceEntry.close} | PE ${peEntry.strike} @ ₹${peEntry.close} | Total: ₹${combinedPremiumSold.toFixed(2)}`);

            // 🎯 TRACKING & EXIT LOGIC (Time-Series loop for the day)
            // Din bhar ke liye sirf inhi 2 strikes ka data fetch karo (Optimized Query)
            const tickQuery = `
                SELECT timestamp, strike, option_type, close 
                FROM option_chain_data 
                WHERE instrument = $1 AND DATE(timestamp) = $2 AND strike IN ($3, $4)
                ORDER BY timestamp ASC
            `;
            const tickResult = await pgPool.query(tickQuery, [symbol, tradeDateStr, ceEntry.strike, peEntry.strike]);
            
            let isTradeOpen = true;
            let currentCePrice = ceEntry.close;
            let currentPePrice = peEntry.close;

            // Group data by timestamp
            const ticksByTime = {};
            tickResult.rows.forEach(row => {
                const t = row.timestamp.toISOString();
                if (!ticksByTime[t]) ticksByTime[t] = { ce: 0, pe: 0, timeStr: t };
                if (row.option_type === 'CE') ticksByTime[t].ce = Number(row.close);
                if (row.option_type === 'PE') ticksByTime[t].pe = Number(row.close);
            });

            // Loop through each minute of the day
            for (let timeTick in ticksByTime) {
                if (!isTradeOpen) break;

                const tick = ticksByTime[timeTick];
                currentCePrice = tick.ce || currentCePrice;
                currentPePrice = tick.pe || currentPePrice;
                const currentCombinedPremium = currentCePrice + currentPePrice;
                
                const timeOnly = new Date(tick.timeStr).toLocaleTimeString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata' }).slice(0, 5); // "15:20" format

                let exitReason = null;

                // 1. SL Hit Check
                if (currentCombinedPremium >= slTriggerPremium) exitReason = "SL Hit";
                // 2. TP Hit Check
                else if (currentCombinedPremium <= tpTriggerPremium) exitReason = "TP Hit";
                // 3. EOD Emergency Exit Check
                else if (emergencyEodExit.enabled && timeOnly >= emergencyEodExit.endTime) exitReason = `EOD Exit (${emergencyEodExit.endTime})`;

                if (exitReason) {
                    isTradeOpen = false;
                    const pnl = combinedPremiumSold - currentCombinedPremium; // Profit for seller: Entry Premium - Exit Premium
                    
                    report.totalTrades++;
                    if (pnl > 0) report.wins++;
                    else report.losses++;
                    report.totalPnL += pnl;

                    report.tradeLogs.push({
                        date: tradeDateStr,
                        entryPremium: combinedPremiumSold.toFixed(2),
                        exitPremium: currentCombinedPremium.toFixed(2),
                        pnl: pnl.toFixed(2),
                        reason: exitReason,
                        exitTime: timeOnly
                    });

                    console.log(`🛑 Exit [${exitReason}] at ${timeOnly} | Exit Premium: ₹${currentCombinedPremium.toFixed(2)} | PnL: ₹${pnl.toFixed(2)}\n`);
                }
            }
        }

        // ==========================================
        // 4. FINAL REPORT GENERATION
        // ==========================================
        const winRate = report.totalTrades > 0 ? ((report.wins / report.totalTrades) * 100).toFixed(2) : 0;
        console.log("=========================================");
        console.log("📊 AUTO-BACKTEST ENGINE FINAL REPORT");
        console.log("=========================================");
        console.log(`Total Trades Executed : ${report.totalTrades}`);
        console.log(`Winning Trades        : ${report.wins}`);
        console.log(`Losing Trades         : ${report.losses}`);
        console.log(`Win Rate              : ${winRate}%`);
        console.log(`Total PnL (Points)    : ₹${report.totalPnL.toFixed(2)}`);
        console.log("=========================================");

        return report;

    } catch (error) {
        console.error("❌ Error in Backtest Engine:", error);
    }
};

module.exports = { runAutoBacktest };