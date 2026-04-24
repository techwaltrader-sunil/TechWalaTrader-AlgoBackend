
const mongoose = require('mongoose'); 
const Strategy = require('../models/Strategy');
const HistoricalData = require('../models/HistoricalData');
const Broker = require('../models/Broker');
const { calculateIndicator, extractParams, evaluateCondition } = require('../services/indicatorService');
const { getOptionSecurityId, sleep } = require('../services/instrumentService');
const { fetchDhanHistoricalData, fetchExpiredOptionData } = require('../services/dhanService');

// 🔥 IMPORTING ALL SHARED LOGIC MODULES
const { evaluateTrailingSL } = require('../engine/features/riskManagement/trailingLogic');
const { evaluateMtmLogic } = require('../engine/features/riskManagement/mtmSquareOff');
const { evaluateExitAllLogic } = require('../engine/features/advanceFeatures/exitAllOnSlTgt');

const formatIndName = (ind) => {
    if (!ind) return 'Value';
    if (ind.display) {
        const match = ind.display.match(/^([A-Za-z0-9_]+)\((\d+)/);
        if (match) return `${match[1]}(${match[2]})`;
        return ind.display.split(',')[0] + (ind.display.includes(',') ? ')' : '');
    }
    let name = ind.name || ind.id || 'Value';
    let period = ind.params?.Period || ind.params?.period;
    if (period) return `${name}(${period})`;
    return name;
};

const runBacktestSimulator = async (req, res) => {
    try {
        const { strategyId } = req.params;
        const { period, start, end } = req.query;
        
        const strategy = await Strategy.collection.findOne({ _id: new mongoose.Types.ObjectId(strategyId) });
        if (!strategy) return res.status(404).json({ error: "Strategy not found" });

        console.log(`\n🚀 Running MULTI-LEG Backtest for: ${strategy.name} | Period: ${period || '1M'}`);

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
        
        const rawInterval = strategy.interval || strategy.config?.interval || strategy.data?.config?.interval;
        let timeframe = rawInterval ? String(rawInterval).replace(' min', '').trim() : "5"; 
        
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
            let chunkedRanges = [];
            let currentStart = new Date(startDate);
            while (currentStart <= endDate) {
                let currentEnd = new Date(currentStart);
                currentEnd.setDate(currentStart.getDate() + 4); 
                if (currentEnd > endDate) currentEnd = new Date(endDate);
                chunkedRanges.push({ start: new Date(currentStart), end: new Date(currentEnd) });
                currentStart.setDate(currentStart.getDate() + 5);
            }
            
            for (let range of chunkedRanges) {
                const dhanRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, spotSecurityId, exchangeSegment, "INDEX", range.start.toISOString().split('T')[0], range.end.toISOString().split('T')[0], timeframe);
                const timeArray = dhanRes.data ? (dhanRes.data.start_Time || dhanRes.data.timestamp) : null;

                if (dhanRes.success && timeArray) {
                    const { open, high, low, close, volume } = dhanRes.data;
                    const bulkOps = [];
                    for (let i = 0; i < timeArray.length; i++) {
                        let ms = timeArray[i];
                        if (ms < 10000000000) ms = ms * 1000; 
                        bulkOps.push({ insertOne: { document: { symbol: upperSymbol, timeframe, timestamp: new Date(ms), open: open[i], high: high[i], low: low[i], close: close[i], volume: volume[i] } } });
                    }
                    if (bulkOps.length > 0) await HistoricalData.bulkWrite(bulkOps, { ordered: false }).catch(e => console.log("Duplicates ignored"));
                }
            }
            
            cachedData = await HistoricalData.find({ symbol: { $regex: new RegExp(cleanSymbolForMap, "i") }, timeframe, timestamp: { $gte: startDate, $lte: endDate } }).sort({ timestamp: 1 }).lean();
            if (cachedData.length === 0) return res.status(404).json({ success: false, errorType: "NO_DATA", message: "Spot Data not available for this period." });
        }

        const findConditions = (obj) => {
            if (!obj || typeof obj !== 'object') return null;
            if (obj.longRules && Array.isArray(obj.longRules)) return obj;
            if (Array.isArray(obj)) {
                for (let item of obj) { const found = findConditions(item); if (found) return found; }
            } else {
                for (let key in obj) { const found = findConditions(obj[key]); if (found) return found; }
            }
            return null;
        };

        let entryConds = findConditions(strategy);

        const calcLongInd1 = []; const calcLongInd2 = [];
        if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
            entryConds.longRules.forEach((rule, idx) => {
                calcLongInd1[idx] = calculateIndicator({...rule.ind1, params: extractParams(rule.ind1, rule.params)}, cachedData);
                calcLongInd2[idx] = calculateIndicator({...rule.ind2, params: extractParams(rule.ind2, null)}, cachedData);
            });
        }

        const calcShortInd1 = []; const calcShortInd2 = [];
        if (entryConds && entryConds.shortRules && entryConds.shortRules.length > 0) {
            entryConds.shortRules.forEach((rule, idx) => {
                calcShortInd1[idx] = calculateIndicator({...rule.ind1, params: extractParams(rule.ind1, rule.params)}, cachedData);
                calcShortInd2[idx] = calculateIndicator({...rule.ind2, params: extractParams(rule.ind2, null)}, cachedData);
            });
        }

        let exitConds = {};
        const possibleExits = strategy.exitConditions || strategy.data?.exitConditions || strategy.data?.entrySettings?.exitConditions || [];
        if (Array.isArray(possibleExits) && possibleExits.length > 0) exitConds = possibleExits[0];
        else if (possibleExits && typeof possibleExits === 'object' && !Array.isArray(possibleExits)) exitConds = possibleExits;

        const rawExitLongRules = exitConds.longRules || [];
        const rawExitShortRules = exitConds.shortRules || [];
        const exitLongRules = rawExitLongRules.filter(rule => rule.ind1 && (rule.ind1.id || rule.ind1.display));
        const exitShortRules = rawExitShortRules.filter(rule => rule.ind1 && (rule.ind1.id || rule.ind1.display));
        
        const calcExitLongInd1 = []; const calcExitLongInd2 = [];
        if (exitLongRules.length > 0) {
            exitLongRules.forEach((rule, idx) => {
                calcExitLongInd1[idx] = calculateIndicator({...rule.ind1, params: extractParams(rule.ind1, rule.params)}, cachedData);
                calcExitLongInd2[idx] = calculateIndicator({...rule.ind2, params: extractParams(rule.ind2, null)}, cachedData);
            });
        }

        const calcExitShortInd1 = []; const calcExitShortInd2 = [];
        if (exitShortRules.length > 0) {
            exitShortRules.forEach((rule, idx) => {
                calcExitShortInd1[idx] = calculateIndicator({...rule.ind1, params: extractParams(rule.ind1, rule.params)}, cachedData);
                calcExitShortInd2[idx] = calculateIndicator({...rule.ind2, params: extractParams(rule.ind2, null)}, cachedData);
            });
        }

        let currentEquity = 0, peakEquity = 0, maxDrawdown = 0;
        let winDays = 0, lossDays = 0, winTrades = 0, lossTrades = 0;
        let currentWinStreak = 0, currentLossStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
        let maxProfitTrade = 0, maxLossTrade = 0;
        const equityCurve = []; const daywiseBreakdown = []; let dailyBreakdownMap = {}; 

        let openTrades = []; 
        const strategyLegs = strategy.legs || strategy.data?.legs || [];

        // 🔥 FIX: Robustly map advance features (Database compatibility)
        const advanceFeaturesSettings = strategy.data?.advanceSettings || strategy.advanceSettings || strategy.data?.advanceFeatures || strategy.advanceFeatures || {};
        const riskSettings = strategy.data?.riskManagement || strategy.riskManagement || {};
        const globalMaxProfit = Number(riskSettings.maxProfit) || 0;
        const globalMaxLoss = Number(riskSettings.maxLoss) || 0;
        
        // 🔥 FIX 1: DYNAMIC SQUARE-OFF TIME (UI se padhna)
        const sqTime = strategy.config?.squareOff || strategy.data?.config?.squareOff || strategy.config?.squareOffTime || strategy.data?.config?.squareOffTime || "03:15 PM";
        let exitMin = 915; // default 15:15
        if (sqTime) {
            const [eh, emStr] = sqTime.split(':');
            if (emStr) {
                const em = emStr.split(' ')[0];
                let h = parseInt(eh);
                if (sqTime.toUpperCase().includes('PM') && h !== 12) h += 12;
                exitMin = h * 60 + parseInt(em);
            }
        }
        
        let isTradingHaltedForDay = false; 
        let currentDayTracker = ""; 

        const calculateATM = (spotPrice, symbolStr) => {
            if(symbolStr.includes("BANK")) return Math.round(spotPrice / 100) * 100;
            return Math.round(spotPrice / 50) * 50;
        };

        const calcTradePnL = (entryP, exitP, qty, action) => {
            if(action === "BUY") return (exitP - entryP) * qty;
            return (entryP - exitP) * qty; 
        };


                // 🔥 NEW: SEBI COMPLIANT DATE CALCULATOR (WITH ORIGINAL UI FORMATTING)
        const getNearestExpiryString = (tradeDateStr, symbolStr, reqExpiry = "WEEKLY") => {
            const d = new Date(tradeDateStr);
            const upSym = symbolStr.toUpperCase();
            let expiryDate = new Date(d);

            // 🔥 SEBI NEW RULE: Ab sabka Expiry TUESDAY (2) ho gaya hai!
            const targetDay = 2; 
            let forceMonthly = false;

            // NIFTY 50 ko chhodkar baki sab (Bank, Fin, Midcap) zabardasti Monthly hain
            if (upSym.includes("BANK") || upSym.includes("FIN") || upSym.includes("MID")) {
                forceMonthly = true;
            }

            const upperReqExpiry = reqExpiry.toUpperCase();
            const isMonthlyRequest = forceMonthly || upperReqExpiry === "MONTHLY";

            if (!isMonthlyRequest) {
                // NIFTY 50 Weekly Logic (Target Day: Tuesday)
                while (expiryDate.getDay() !== targetDay) {
                    expiryDate.setDate(expiryDate.getDate() + 1);
                }
                // Next Weekly Support
                if (upperReqExpiry === "NEXT WEEKLY" || upperReqExpiry === "NEXT WEEK") {
                    expiryDate.setDate(expiryDate.getDate() + 7);
                }
            } else {
                // MONTHLY LOGIC (For Bank/Fin/Midcap, or Nifty Monthly) -> Target Day: Last Tuesday
                const lastDayOfMonth = new Date(expiryDate.getFullYear(), expiryDate.getMonth() + 1, 0);
                expiryDate = new Date(lastDayOfMonth);
                
                // Find the last Tuesday of the month
                while (expiryDate.getDay() !== targetDay) {
                    expiryDate.setDate(expiryDate.getDate() - 1);
                }
                
                // Agar aaj ka din is mahine ki expiry ke BAAD ka hai, to agle mahine ka Last Tuesday lo
                if (d > expiryDate) {
                    const lastDayOfNextMonth = new Date(d.getFullYear(), d.getMonth() + 2, 0);
                    expiryDate = new Date(lastDayOfNextMonth);
                    while (expiryDate.getDay() !== targetDay) {
                        expiryDate.setDate(expiryDate.getDate() - 1);
                    }
                }
            }

            // Date ko format karna (e.g., 28APR26)
            const formattedDate = `${String(expiryDate.getDate()).padStart(2, '0')}${expiryDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()}${String(expiryDate.getFullYear()).slice(-2)}`;
            
            // 🔥 ORIGINAL UI FORMATTING (Aapke purane code se)
            const today = new Date(); 
            today.setHours(0, 0, 0, 0); 
            const expDateForCheck = new Date(expiryDate); 
            expDateForCheck.setHours(0, 0, 0, 0);
            
            return `${(expDateForCheck < today) ? "EXP" : "Upcoming EXP"} ${formattedDate}`; 
        };



        for (let i = 0; i < cachedData.length; i++) {
            if (i % 500 === 0) await new Promise(resolve => setImmediate(resolve));

            const candle = cachedData[i];
            const candleTime = new Date(candle.timestamp).getTime();
            const istDate = new Date(candleTime + (5.5 * 60 * 60 * 1000));
            const h = String(istDate.getUTCHours()).padStart(2, '0'); 
            const m = String(istDate.getUTCMinutes()).padStart(2, '0');
            const timeInMinutes = (istDate.getUTCHours() * 60) + istDate.getUTCMinutes(); 
            const dateStr = istDate.toISOString().split('T')[0];

            if (dateStr !== currentDayTracker) {
                currentDayTracker = dateStr;
                isTradingHaltedForDay = false; 
            }

            if (!dailyBreakdownMap[dateStr]) dailyBreakdownMap[dateStr] = { pnl: 0, trades: 0, tradesList: [], hasTradedTimeBased: false };

            let longSignal = false;
            if (entryConds && entryConds.longRules && entryConds.longRules.length > 0) {
                let overallResult = null;
                entryConds.longRules.forEach((rule, idx) => {
                    const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
                    const ruleResult = evaluateCondition(
                        calcLongInd1[idx] ? calcLongInd1[idx][i] : null, calcLongInd2[idx] ? calcLongInd2[idx][i] : null,
                        (i > 0 && calcLongInd1[idx]) ? calcLongInd1[idx][i-1] : null, (i > 0 && calcLongInd2[idx]) ? calcLongInd2[idx][i-1] : null, operator
                    );
                    if (idx === 0) overallResult = ruleResult;
                    else {
                        const logicalOp = entryConds.logicalOps[idx - 1]; 
                        overallResult = logicalOp === 'AND' ? (overallResult && ruleResult) : (overallResult || ruleResult);
                    }
                });
                longSignal = overallResult;
            }

            let shortSignal = false;
            if (entryConds && entryConds.shortRules && entryConds.shortRules.length > 0) {
                let overallResult = null;
                entryConds.shortRules.forEach((rule, idx) => {
                    const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
                    const ruleResult = evaluateCondition(
                        calcShortInd1[idx] ? calcShortInd1[idx][i] : null, calcShortInd2[idx] ? calcShortInd2[idx][i] : null,
                        (i > 0 && calcShortInd1[idx]) ? calcShortInd1[idx][i-1] : null, (i > 0 && calcShortInd2[idx]) ? calcShortInd2[idx][i-1] : null, operator
                    );
                    if (idx === 0) overallResult = ruleResult;
                    else {
                        const logicalOp = entryConds.logicalOps[idx - 1]; 
                        overallResult = logicalOp === 'AND' ? (overallResult && ruleResult) : (overallResult || ruleResult);
                    }
                });
                shortSignal = overallResult;
            }

            const isTimeBased = (strategy.config?.strategyType === 'Time Based' || strategy.data?.config?.strategyType === 'Time Based' || strategy.type === 'Time Based');
            
            if (isTimeBased) {
                const sTime = strategy.startTime || strategy.config?.startTime || strategy.data?.config?.startTime || strategy.entrySettings?.startTime || strategy.data?.entrySettings?.startTime;
                
                if (sTime) {
                    const [sh, sm] = sTime.split(':');
                    let startMin = parseInt(sh) * 60 + parseInt(sm.split(' ')[0]);
                    if (sTime.toUpperCase().includes('PM') && parseInt(sh) !== 12) startMin += 720;
                    
                    if (timeInMinutes >= startMin && !dailyBreakdownMap[dateStr].hasTradedTimeBased) {
                        longSignal = true; 
                        dailyBreakdownMap[dateStr].hasTradedTimeBased = true; 
                    }
                }
            }

            const txnType = strategy.config?.transactionType || strategy.data?.config?.transactionType || 'Both Side';
            const finalLongSignal = (txnType === 'Both Side' || txnType === 'Only Long' || isTimeBased) ? longSignal : false;
            const finalShortSignal = (txnType === 'Both Side' || txnType === 'Only Short') ? shortSignal : false;

            let exitLongSignal = false;
            if (exitLongRules.length > 0) {
                let overallResult = null;
                exitLongRules.forEach((rule, idx) => {
                    const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
                    const ruleResult = evaluateCondition(
                        calcExitLongInd1[idx] ? calcExitLongInd1[idx][i] : null, calcExitLongInd2[idx] ? calcExitLongInd2[idx][i] : null,
                        (i > 0 && calcExitLongInd1[idx]) ? calcExitLongInd1[idx][i-1] : null, (i > 0 && calcExitLongInd2[idx]) ? calcExitLongInd2[idx][i-1] : null, operator
                    );
                    if (idx === 0) overallResult = ruleResult;
                    else {
                        const logicalOp = exitConds.logicalOpsLong ? exitConds.logicalOpsLong[idx - 1] : 'AND'; 
                        overallResult = logicalOp === 'AND' ? (overallResult && ruleResult) : (overallResult || ruleResult);
                    }
                });
                exitLongSignal = overallResult;
            }

            let exitShortSignal = false;
            if (exitShortRules.length > 0) {
                let overallResult = null;
                exitShortRules.forEach((rule, idx) => {
                    const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
                    const ruleResult = evaluateCondition(
                        calcExitShortInd1[idx] ? calcExitShortInd1[idx][i] : null, calcExitShortInd2[idx] ? calcExitShortInd2[idx][i] : null,
                        (i > 0 && calcExitShortInd1[idx]) ? calcExitShortInd1[idx][i-1] : null, (i > 0 && calcExitShortInd2[idx]) ? calcExitShortInd2[idx][i-1] : null, operator
                    );
                    if (idx === 0) overallResult = ruleResult;
                    else {
                        const logicalOp = exitConds.logicalOpsShort ? exitConds.logicalOpsShort[idx - 1] : 'AND'; 
                        overallResult = logicalOp === 'AND' ? (overallResult && ruleResult) : (overallResult || ruleResult);
                    }
                });
                exitShortSignal = overallResult;
            }

            // Using the dynamic exitMin defined earlier
            const isMarketOpen = timeInMinutes >= 555 && timeInMinutes < exitMin; 
            const isExitTime = timeInMinutes >= exitMin; 
            let isLastCandleOfDay = false;
            if (i === cachedData.length - 1) isLastCandleOfDay = true;
            else {
                const nextCandleIst = new Date(new Date(cachedData[i+1].timestamp).getTime() + (5.5 * 60 * 60 * 1000));
                if (nextCandleIst.toISOString().split('T')[0] !== dateStr) isLastCandleOfDay = true;
            }

            const spotClosePrice = parseFloat(candle.close);

            // =========================================================
            // 🛡️ 1. M2M RISK CHECK & MULTI-LEG EVALUATION
            // =========================================================
            if (openTrades.length > 0) {
                let combinedOpenPnL = 0;
                let triggerReasonForExitAll = null; 

                openTrades.forEach(trade => {
                    let currentClose = spotClosePrice; 
                    let currentHigh = spotClosePrice;
                    let currentLow = spotClosePrice;
                    let currentOpen = spotClosePrice; // Extracted for Time-Squareoff

                    if (isOptionsTrade && trade.premiumChart && trade.premiumChart.start_Time) {
                        let exactMatchIndex = trade.premiumChart.start_Time.findIndex(t => {
                            const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
                            return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
                        });
                        
                        // 🔥 FIX 2: GHOST CANDLE VOLATILITY FIX (Bawandar Fix)
                        let isFallbackCandle = false;
                        if (exactMatchIndex === -1) {
                            let nearestIdx = -1;
                            for (let k = trade.premiumChart.start_Time.length - 1; k >= 0; k--) {
                                const optTime = new Date(trade.premiumChart.start_Time[k] * 1000 + (5.5 * 60 * 60 * 1000));
                                if (optTime <= istDate) { nearestIdx = k; break; }
                            }
                            exactMatchIndex = nearestIdx; 
                            isFallbackCandle = true;
                        }
                        
                        if (exactMatchIndex !== -1) {
                            let tempClose = trade.premiumChart.close[exactMatchIndex];
                            if (tempClose > spotClosePrice * 0.5) {
                                currentClose = trade.lastKnownPremium || trade.entryPrice;
                                currentHigh = currentLow = currentOpen = currentClose; 
                            } else {
                                currentClose = tempClose;
                                if (isFallbackCandle) {
                                    // Flatline logic
                                    currentHigh = tempClose;
                                    currentLow = tempClose;
                                    currentOpen = tempClose;
                                } else {
                                    currentHigh = trade.premiumChart.high[exactMatchIndex];
                                    currentLow = trade.premiumChart.low[exactMatchIndex];
                                    currentOpen = trade.premiumChart.open[exactMatchIndex]; 
                                }
                                trade.lastKnownPremium = currentClose; 
                            }
                        } else {
                            currentClose = trade.lastKnownPremium || trade.entryPrice;
                            currentHigh = currentLow = currentOpen = currentClose;
                        }
                    } else if (!isOptionsTrade) {
                        currentHigh = parseFloat(candle.high); currentLow = parseFloat(candle.low); currentClose = parseFloat(candle.close); currentOpen = parseFloat(candle.open);
                    }
                    
                    trade.currentPrice = currentClose;
                    trade.currentHigh = currentHigh;
                    trade.currentLow = currentLow;
                    trade.currentOpen = currentOpen;
                    trade.openPnL = calcTradePnL(trade.entryPrice, currentClose, trade.quantity, trade.transaction);
                    combinedOpenPnL += trade.openPnL;
                });

                const realizedDailyPnL = dailyBreakdownMap[dateStr].pnl;
                const currentTotalPnL = realizedDailyPnL + combinedOpenPnL;
                
                let hitGlobalMaxProfit = false;
                let hitGlobalMaxLoss = false;
                
                if (globalMaxProfit > 0 && currentTotalPnL >= globalMaxProfit) {
                    hitGlobalMaxProfit = true;
                    isTradingHaltedForDay = true; 
                    triggerReasonForExitAll = "MAX_PROFIT";
                } else if (globalMaxLoss > 0 && currentTotalPnL <= -globalMaxLoss) {
                    hitGlobalMaxLoss = true;
                    isTradingHaltedForDay = true; 
                    triggerReasonForExitAll = "MAX_LOSS";
                }

                // 🔥 FIX 3: MOVE SL TO COST TRACKERS
                let anyLegHitSlPast = dailyBreakdownMap[dateStr].tradesList.some(t => t.exitType === "STOPLOSS" || t.exitType === "SL_MOVED_TO_COST");
                let anyLegHitSlThisTick = false;

                openTrades.forEach((trade, idx) => {
                    if (trade.markedForExit) return; 

                    if (hitGlobalMaxProfit || hitGlobalMaxLoss) {
                        trade.markedForExit = true;
                        trade.exitReason = hitGlobalMaxProfit ? "MAX_PROFIT" : "MAX_LOSS";
                        if (hitGlobalMaxLoss && globalMaxLoss > 0) {
                            const exactLossPoints = globalMaxLoss / trade.quantity;
                            trade.exitPrice = trade.transaction === "BUY" ? (trade.entryPrice - exactLossPoints) : (trade.entryPrice + exactLossPoints);
                        } else if (hitGlobalMaxProfit && globalMaxProfit > 0) {
                            const exactProfitPoints = globalMaxProfit / trade.quantity;
                            trade.exitPrice = trade.transaction === "BUY" ? (trade.entryPrice + exactProfitPoints) : (trade.entryPrice - exactProfitPoints);
                        } else {
                            trade.exitPrice = trade.currentPrice;
                        }
                        return;
                    }

                    const legData = trade.legConfig;
                    const slValue = Number(legData.slValue || 0);
                    // 🔥 FIX 4: DYNAMIC POINTS VS PERCENTAGE SL/TP
                    const slType = legData.slType || "Points"; 
                    const tpValue = Number(legData.tpValue || 0);
                    const tpType = legData.tpType || "Points";
                    
                    let slPrice = 0, tpPrice = 0;

                    let isSlMovedToCost = false;
                    if (advanceFeaturesSettings.moveSLToCost && (anyLegHitSlPast || anyLegHitSlThisTick)) {
                        isSlMovedToCost = true;
                    }

                    if (trade.transaction === "BUY") {
                        if (isSlMovedToCost) slPrice = trade.entryPrice;
                        else slPrice = slType === "Points" ? trade.entryPrice - slValue : trade.entryPrice * (1 - slValue / 100);
                        tpPrice = tpType === "Points" ? trade.entryPrice + tpValue : trade.entryPrice * (1 + tpValue / 100);
                    } else {
                        if (isSlMovedToCost) slPrice = trade.entryPrice;
                        else slPrice = slType === "Points" ? trade.entryPrice + slValue : trade.entryPrice * (1 + slValue / 100);
                        tpPrice = tpType === "Points" ? trade.entryPrice - tpValue : trade.entryPrice * (1 - tpValue / 100);
                    }

                    if ((!isSlMovedToCost && slValue > 0) || isSlMovedToCost) {
                        if ((trade.transaction === "BUY" && trade.currentLow <= slPrice) || (trade.transaction === "SELL" && trade.currentHigh >= slPrice)) {
                            trade.markedForExit = true; 
                            trade.exitReason = isSlMovedToCost ? "SL_MOVED_TO_COST" : "STOPLOSS"; 
                            trade.exitPrice = slPrice;
                            triggerReasonForExitAll = "STOPLOSS";
                            anyLegHitSlThisTick = true; // Trigger sibling legs
                        }
                    } 
                    
                    if (tpValue > 0 && !trade.markedForExit) {
                        if ((trade.transaction === "BUY" && trade.currentHigh >= tpPrice) || (trade.transaction === "SELL" && trade.currentLow <= tpPrice)) {
                            trade.markedForExit = true; trade.exitReason = "TARGET"; trade.exitPrice = tpPrice;
                            triggerReasonForExitAll = "TARGET";
                        }
                    }

                    if (!trade.markedForExit) {
                        const tslResult = evaluateTrailingSL(trade, trade.openPnL, riskSettings, trade.quantity);
                        if (tslResult.isModified) trade.trailingSL = tslResult.newTrailingSL;
                        if (trade.trailingSL) {
                            if ((trade.transaction === "BUY" && trade.currentLow <= trade.trailingSL) || (trade.transaction === "SELL" && trade.currentHigh >= trade.trailingSL)) {
                                trade.markedForExit = true; trade.exitReason = "TRAILING_SL"; trade.exitPrice = trade.trailingSL;
                                triggerReasonForExitAll = "TRAILING_SL";
                            }
                        }
                    }

                    if (!trade.markedForExit) {
                        if ((trade.signalType === "LONG" && exitLongSignal) || (trade.signalType === "SHORT" && exitShortSignal)) {
                            trade.markedForExit = true; trade.exitReason = "INDICATOR_EXIT"; trade.exitPrice = trade.currentPrice;
                        }
                    }
                });

                if (triggerReasonForExitAll && !hitGlobalMaxProfit && !hitGlobalMaxLoss) {
                    const exitAllCheck = evaluateExitAllLogic(advanceFeaturesSettings, triggerReasonForExitAll);
                    if (exitAllCheck.shouldExitAll) {
                        openTrades.forEach(trade => {
                            if (!trade.markedForExit) {
                                trade.markedForExit = true;
                                trade.exitReason = exitAllCheck.exitReason; 
                                trade.exitPrice = trade.currentPrice; 
                            }
                        });
                    }
                }

                let remainingTrades = [];
                openTrades.forEach(trade => {
                    if (trade.markedForExit || isExitTime || isLastCandleOfDay) {
                        if (!trade.markedForExit) {
                            trade.exitReason = isLastCandleOfDay ? "EOD_SQUAREOFF" : "TIME_SQUAREOFF";
                            // 🔥 THE DOT-TO-DOT FIX: Square-Off time par EXACT Open price uthao!
                            trade.exitPrice = trade.exitReason === "TIME_SQUAREOFF" ? trade.currentOpen : trade.currentPrice;
                        }

                        const pnl = calcTradePnL(trade.entryPrice, trade.exitPrice, trade.quantity, trade.transaction);
                        
                        const completedTrade = {
                            ...trade,
                            exitTime: `${h}:${m}:00`,
                            pnl: pnl,
                            exitType: trade.exitReason
                        };
                        
                        dailyBreakdownMap[dateStr].tradesList.push(completedTrade);
                        dailyBreakdownMap[dateStr].pnl += pnl;
                        dailyBreakdownMap[dateStr].trades += 1;
                        if (pnl > 0) { winTrades++; if(pnl > maxProfitTrade) maxProfitTrade = pnl; } 
                        else { lossTrades++; if(pnl < maxLossTrade) maxLossTrade = pnl; }
                        
                        console.log(`🎯 [${completedTrade.exitType}] Date: ${dateStr} | Symbol: ${trade.symbol} | Exit: ${trade.exitPrice.toFixed(2)} | PnL: ${pnl.toFixed(2)}`);
                    } else {
                        remainingTrades.push(trade); 
                    }
                });

                openTrades = remainingTrades; 
            } 
            else if (!isTradingHaltedForDay) {
                const mtmResult = evaluateMtmLogic(dailyBreakdownMap[dateStr].pnl, 0, riskSettings);
                if (mtmResult.isHalted) {
                    isTradingHaltedForDay = true;
                    console.log(mtmResult.logMessage);
                }
            }

      

        // =========================================================
            // 🔥 2. MULTI-LEG ENTRY LOGIC
            // =========================================================
            if (openTrades.length === 0 && isMarketOpen && !isTradingHaltedForDay && (finalLongSignal || finalShortSignal)) {
                
                for (let legIndex = 0; legIndex < strategyLegs.length; legIndex++) {
                    const legData = strategyLegs[legIndex];
                    
                    let tradeQuantity = legData.quantity; 
                    if (!tradeQuantity || isNaN(tradeQuantity)) tradeQuantity = upperSymbol.includes("BANK") ? 30 : (upperSymbol.includes("NIFTY") ? 50 : 1);

                    const transActionTypeStr = (legData.action || "BUY").toUpperCase();
                    
                    let activeOptionType = "";

                    if (isTimeBased) {
                        activeOptionType = (legData.optionType || "Call").toUpperCase().includes("C") ? "CE" : "PE";
                    } else {
                        if (transActionTypeStr === "BUY") activeOptionType = finalLongSignal ? "CE" : "PE";
                        else if (transActionTypeStr === "SELL") activeOptionType = finalLongSignal ? "PE" : "CE"; 
                    }
                    
                    // 🔥 THE MAHA-FIX: Options ke liye default 0 rakho, Spot price NAHI!
                    let finalEntryPrice = isOptionsTrade ? 0 : spotClosePrice; 
                    let validTrade = true;
                    let premiumChartData = null; 
                    let targetStrike = calculateATM(spotClosePrice, upperSymbol);
                    const strikeCriteria = legData.strikeCriteria || "ATM pt";
                    const strikeType = legData.strikeType || "ATM";
                    const reqExpiry = legData.expiry || "WEEKLY";

                    const expiryLabel = getNearestExpiryString(dateStr, upperSymbol, reqExpiry);
                    let tradeSymbol = `${upperSymbol} ${targetStrike} ${activeOptionType} (${expiryLabel})`;

                    if(isOptionsTrade && broker) {
                        let apiSuccess = false;

                        const todayStr = new Date().toISOString().split('T')[0];
                        const isHistoricalDate = dateStr !== todayStr;

                        if(!isHistoricalDate) {
                            const optionConfig = getOptionSecurityId(upperSymbol, spotClosePrice, strikeCriteria, strikeType, activeOptionType, reqExpiry);
                            if (optionConfig && optionConfig.strike) targetStrike = optionConfig.strike;

                            if(optionConfig) {
                                try {
                                    await sleep(500); 
                                    const optRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, optionConfig.id, "NSE_FNO", "OPTIDX", dateStr, dateStr, "1");
                                    if(optRes.success && optRes.data && optRes.data.close) {
                                        const exactMatchIndex = optRes.data.start_Time.findIndex(t => {
                                            const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
                                            return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
                                        });
                                        if (isTimeBased) {
                                            finalEntryPrice = exactMatchIndex !== -1 ? optRes.data.open[exactMatchIndex] : optRes.data.open[0];
                                        } else {
                                            finalEntryPrice = exactMatchIndex !== -1 ? optRes.data.close[exactMatchIndex] : optRes.data.close[0];
                                        }
                                        premiumChartData = optRes.data; 
                                        apiSuccess = true;
                                    } 
                                } catch(e) { }
                            } 
                        }
                        
                        if (!apiSuccess) {
                            try {
                                await sleep(500);
                                
                                // 🔥 THE FIX: Rolling API strictly requires relative names ("ATM", "ITM1"), NOT numeric strikes like 22650!
                                const formattedStrikeForRolling = strikeType.replace(/\s+/g, '').toUpperCase(); // "ITM 1" ko "ITM1" banayega

                                const expRes = await fetchExpiredOptionData(broker.clientId, broker.apiSecret, spotSecurityId, targetStrike, activeOptionType, dateStr, dateStr, reqExpiry);
                                

                                
                                if(expRes.success && expRes.data && expRes.data.close) {
                                    const exactMatchIndex = expRes.data.start_Time.findIndex(t => {
                                        const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
                                        return optTime.getUTCHours() === istDate.getUTCHours() && optTime.getUTCMinutes() === istDate.getUTCMinutes();
                                    });
                                    if (isTimeBased) {
                                        finalEntryPrice = exactMatchIndex !== -1 ? expRes.data.open[exactMatchIndex] : expRes.data.open[0];
                                    } else {
                                        finalEntryPrice = exactMatchIndex !== -1 ? expRes.data.close[exactMatchIndex] : expRes.data.close[0];
                                    }
                                    premiumChartData = expRes.data; 
                                    apiSuccess = true;
                                }
                            } catch(e) { }
                        }

                        // 🔥 STRICT VALIDATION: API fail hui to trade cancel karo, Spot price mat lo!
                        if (!apiSuccess || finalEntryPrice === 0) {
                            validTrade = false;
                            console.log(`❌ Trade Canceled: Dhan API failed to return premium data for ${tradeSymbol} on ${dateStr}`);
                        } else if (finalEntryPrice > spotClosePrice * 0.5) {
                            validTrade = false;
                            console.log(`❌ Trade Canceled: API sent garbage Spot Price instead of Premium for ${tradeSymbol}`);
                        }
                    }

                    if (validTrade) {
                        openTrades.push({
                            id: `leg_${legIndex}`,
                            legConfig: legData,
                            symbol: tradeSymbol, 
                            transaction: transActionTypeStr, 
                            quantity: tradeQuantity,
                            entryTime: `${h}:${m}:00`, 
                            entryPrice: finalEntryPrice,
                            exitTime: null, exitPrice: null, pnl: null, exitType: null,
                            optionConfig: isOptionsTrade ? { strike: targetStrike, type: activeOptionType } : null,
                            premiumChart: premiumChartData,
                            signalType: finalLongSignal ? "LONG" : "SHORT",
                            lastKnownPremium: finalEntryPrice,
                            markedForExit: false 
                        });
                        console.log(`✅ [TRADE OPEN] Leg ${legIndex + 1} | Time: ${h}:${m} | Spot: ${spotClosePrice} | Premium: ${finalEntryPrice} | Type: ${activeOptionType}`);
                    }
                } 
            }
        }

        // ==========================================
        // 🧮 5. DAILY LOOP (Metrics Generation)
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
                totalPnL: currentEquity, maxDrawdown, tradingDays: totalMarketDays, winDays, lossDays, 
                totalTrades: winTrades + lossTrades, winTrades, lossTrades, maxWinStreak, maxLossStreak, 
                maxProfit: maxProfitTrade, maxLoss: maxLossTrade 
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