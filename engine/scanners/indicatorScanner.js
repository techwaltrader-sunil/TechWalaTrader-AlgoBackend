// File: src/engine/scanners/indicatorScanner.js

// 1. Dhan historical data
const { fetchDhanHistoricalData } = require('../../services/dhanService.js'); 

// 2. 🔥 THE FIX: Aapka pehle se bana hua Indicator Service!
const { extractParams, calculateIndicator, evaluateCondition } = require('../../services/indicatorService.js');

/**
 * 🧠 INDICATOR SIGNAL CHECKER
 */
export const getIndicatorSignal = async (strategy, broker, baseSymbol) => {
    try {
        const dhanIdMap = { "NIFTY": "13", "BANKNIFTY": "25", "FINNIFTY": "27", "MIDCPNIFTY": "118", "SENSEX": "51" };
        const spotSecurityId = dhanIdMap[baseSymbol] || "25";
        const timeframe = strategy.interval ? strategy.interval.replace(' min', '') : "5";

        const toDate = new Date().toISOString().split('T')[0];
        const fromDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const dhanRes = await fetchDhanHistoricalData(broker.clientId, broker.apiSecret, spotSecurityId, "IDX_I", "INDEX", fromDate, toDate, timeframe);
        if (!dhanRes.success || !dhanRes.data || !dhanRes.data.close) return { long: false, short: false };

        const candles = [];
        for (let i = 0; i < dhanRes.data.close.length; i++) {
            candles.push({ close: dhanRes.data.close[i], high: dhanRes.data.high[i], low: dhanRes.data.low[i], open: dhanRes.data.open[i] });
        }
        if (candles.length < 20) return { long: false, short: false };

        const findConditions = (obj) => {
            if (!obj || typeof obj !== 'object') return null;
            if (obj.longRules && Array.isArray(obj.longRules)) return obj;
            if (Array.isArray(obj)) { for (let item of obj) { const f = findConditions(item); if (f) return f; } }
            else { for (let key in obj) { const f = findConditions(obj[key]); if (f) return f; } }
            return null;
        };
        
        const entryConds = findConditions(strategy.toObject ? strategy.toObject() : strategy);
        if (!entryConds) return { long: false, short: false };

        // 🚨 HAMESHA LAST CLOSED CANDLE PAR CHECK KAREIN
        const i = candles.length - 2;
        if (i < 1) return { long: false, short: false };

        // 🟢 LONG SIGNAL
        let longSignal = false;
        if (entryConds.longRules && entryConds.longRules.length > 0) {
            let overallResult = null;
            entryConds.longRules.forEach((rule, idx) => {
                const p1 = extractParams(rule.ind1, rule.params);
                const ind1Data = calculateIndicator({ ...rule.ind1, params: p1 }, candles);
                const p2 = extractParams(rule.ind2, null);
                const ind2Data = calculateIndicator({ ...rule.ind2, params: p2 }, candles);
                const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
                const ruleResult = evaluateCondition(ind1Data[i], ind2Data[i], ind1Data[i - 1], ind2Data[i - 1], operator);

                if (idx === 0) overallResult = ruleResult;
                else {
                    const logicalOp = entryConds.logicalOps[idx - 1];
                    if (logicalOp === 'AND') overallResult = overallResult && ruleResult;
                    else if (logicalOp === 'OR') overallResult = overallResult || ruleResult;
                }
            });
            longSignal = overallResult;
        }

        // 🔴 SHORT SIGNAL
        let shortSignal = false;
        if (entryConds.shortRules && entryConds.shortRules.length > 0) {
            let overallResult = null;
            entryConds.shortRules.forEach((rule, idx) => {
                const p1 = extractParams(rule.ind1, rule.params);
                const ind1Data = calculateIndicator({...rule.ind1, params: p1}, candles);
                const p2 = extractParams(rule.ind2, null);
                const ind2Data = calculateIndicator({...rule.ind2, params: p2}, candles);
                const operator = rule.op || rule.params?.op || rule.ind1?.params?.op || rule.ind1?.op;
                const ruleResult = evaluateCondition(ind1Data[i], ind2Data[i], ind1Data[i-1], ind2Data[i-1], operator);

                if (idx === 0) overallResult = ruleResult;
                else {
                    const logicalOp = entryConds.shortLogicalOps ? entryConds.shortLogicalOps[idx - 1] : (entryConds.logicalOps[idx - 1] || 'AND');
                    if (logicalOp === 'AND') overallResult = overallResult && ruleResult;
                    else if (logicalOp === 'OR') overallResult = overallResult || ruleResult;
                }
            });
            shortSignal = overallResult;
        }

        return { long: longSignal, short: shortSignal };
    } catch (e) {
        console.error("❌ Indicator Eval Error:", e.message);
        return { long: false, short: false };
    }
};