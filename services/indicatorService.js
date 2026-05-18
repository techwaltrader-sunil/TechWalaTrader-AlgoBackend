// const { SMA, EMA, RSI, MACD, BollingerBands, ATR } = require('technicalindicators');

// // 1. Indicator Calculate karne ka function
// const calculateIndicator = (indConfig, candles) => {
//     if (!indConfig || !indConfig.id) return null;
//     const indId = indConfig.id.trim().toLowerCase();
    
//     if (indId === 'number' || indId === 'static') {
//         const staticVal = Number(indConfig.value) || Number(indConfig.params?.Value) || Number(indConfig.params?.value) || 0;
//         return candles.map(() => staticVal);
//     }
    
//     const closePrices = candles.map(c => parseFloat(c.close) || 0);
//     let results = [];
    
//     try {
//         if (indId === 'candle') return closePrices;
//         if (indId === 'sma') results = SMA.calculate({ period: Number(indConfig.params?.Period) || Number(indConfig.params?.period) || 14, values: closePrices });
//         else if (indId === 'ema') results = EMA.calculate({ period: Number(indConfig.params?.Period) || Number(indConfig.params?.period) || 9, values: closePrices });
//         else if (indId === 'rsi') results = RSI.calculate({ period: Number(indConfig.params?.Period) || Number(indConfig.params?.period) || 14, values: closePrices });
//         // Aap aage MACD, Bollinger Bands wagarah bhi add kar sakte hain
        
//         if (results.length > 0) {
//             const padding = Array(candles.length - results.length).fill(null);
//             return [...padding, ...results];
//         }
//         return Array(candles.length).fill(null);
//     } catch (error) { 
//         return Array(candles.length).fill(null); 
//     }
// };

// // 2. Parameters nikalne ka function
// const extractParams = (ruleInd, fallbackParams) => {
//     let p = ruleInd?.params || fallbackParams || {};
//     if (!p.Period && ruleInd?.display) {
//         const match = ruleInd.display.match(/\((\d+)/);
//         if (match) p.Period = Number(match[1]);
//     }
//     return p;
// };

// // 3. Condition Match (Crossover etc.) check karne ka function
// const evaluateCondition = (val1, val2, prevVal1, prevVal2, operator) => {
//     if (val1 === null || val2 === null) return false;
//     const op = operator?.trim(); 
//     switch(op) {
//         case 'Greater Than': return val1 > val2;
//         case 'Less Than': return val1 < val2;
//         case 'Equals': return val1 === val2;
//         case 'Crosses Above': return prevVal1 !== null && prevVal2 !== null && prevVal1 <= prevVal2 && val1 > val2; 
//         case 'Crosses Below': return prevVal1 !== null && prevVal2 !== null && prevVal1 >= prevVal2 && val1 < val2; 
//         default: return false;
//     }
// };

// module.exports = {
//     calculateIndicator,
//     extractParams,
//     evaluateCondition
// };



const { SMA, EMA, WMA, RSI, MACD, BollingerBands, ADX, PSAR, VWAP, ATR } = require('technicalindicators');

// 🛠️ HELPER: Array Padding
// 'technicalindicators' library hamesha array chhota return karti hai (jaise 100 candle par 14-SMA lagao toh 87 values aati hain)
// Ye helper uske aage 'null' lagakar wapas 100 ki length poori karta hai taki Backtest Loop sync me rahe.
const padResults = (results, totalLength, extractKey = null) => {
    if (!results || results.length === 0) return Array(totalLength).fill(null);
    const paddingLength = totalLength - results.length;
    const padding = Array(paddingLength).fill(null);

    let formattedResults = results;
    // MACD ya Bollinger jisme 3 lines hoti hain, unme se specific line nikalne ke liye
    if (extractKey) {
        formattedResults = results.map(r => r ? r[extractKey] : null);
    }
    return [...padding, ...formattedResults];
};

// 🛠️ HELPER: Custom SuperTrend Calculator (Kyunki Library me nahi hota)
const calculateSuperTrend = (highs, lows, closes, period, multiplier) => {
    const atrResult = ATR.calculate({ high: highs, low: lows, close: closes, period: period });
    const atrs = padResults(atrResult, closes.length);

    let supertrend = Array(closes.length).fill(null);
    let finalUpperband = Array(closes.length).fill(0);
    let finalLowerband = Array(closes.length).fill(0);
    let trend = Array(closes.length).fill(1); // 1 for Uptrend, -1 for Downtrend

    for (let i = period; i < closes.length; i++) {
        let basicUpperband = ((highs[i] + lows[i]) / 2) + (multiplier * atrs[i]);
        let basicLowerband = ((highs[i] + lows[i]) / 2) - (multiplier * atrs[i]);

        // Upperband logic
        if (basicUpperband < finalUpperband[i - 1] || closes[i - 1] > finalUpperband[i - 1]) {
            finalUpperband[i] = basicUpperband;
        } else { finalUpperband[i] = finalUpperband[i - 1]; }

        // Lowerband logic
        if (basicLowerband > finalLowerband[i - 1] || closes[i - 1] < finalLowerband[i - 1]) {
            finalLowerband[i] = basicLowerband;
        } else { finalLowerband[i] = finalLowerband[i - 1]; }

        // Trend Flip logic
        if (trend[i - 1] === 1 && closes[i] <= finalLowerband[i]) trend[i] = -1;
        else if (trend[i - 1] === -1 && closes[i] >= finalUpperband[i]) trend[i] = 1;
        else trend[i] = trend[i - 1];

        supertrend[i] = trend[i] === 1 ? finalLowerband[i] : finalUpperband[i];
    }
    return supertrend;
};

// =========================================================================
// 🧠 1. THE MASTER CALCULATOR
// =========================================================================
const calculateIndicator = (indConfig, candles) => {
    if (!indConfig || !indConfig.id) return null;
    const indId = indConfig.id.trim().toLowerCase();
    
    // Static Number Condition
    if (indId === 'number' || indId === 'static') {
        const staticVal = Number(indConfig.value) || Number(indConfig.params?.Value) || Number(indConfig.params?.value) || 0;
        return candles.map(() => staticVal);
    }
    
    // Raw Materials Prep
    const closePrices = candles.map(c => parseFloat(c.close) || 0);
    const highPrices = candles.map(c => parseFloat(c.high) || 0);
    const lowPrices = candles.map(c => parseFloat(c.low) || 0);
    const volumes = candles.map(c => parseFloat(c.volume) || 0);
    
    try {
        // --- BASE CHARTS ---
        if (indId === 'candle') {
            const candleType = (indConfig.params?.Type || indConfig.params?.type || 'Close').toLowerCase();
            if (candleType === 'open') return candles.map(c => parseFloat(c.open) || 0);
            if (candleType === 'high') return highPrices;
            if (candleType === 'low') return lowPrices;
            return closePrices;
        }

        // Extract Common Params
        const period = Number(indConfig.params?.Period) || Number(indConfig.params?.period) || 14;

        // --- MOVING AVERAGES ---
        if (indId === 'moving average' || indId === 'sma' || indId === 'ema' || indId === 'wma') {
            const maType = (indConfig.params?.MovingAverageType || indId).toUpperCase();
            let res;
            if (maType === 'EMA') res = EMA.calculate({ period, values: closePrices });
            else if (maType === 'WMA') res = WMA.calculate({ period, values: closePrices });
            else res = SMA.calculate({ period, values: closePrices });
            return padResults(res, candles.length);
        }

        // --- OSCILLATORS & MOMENTUM ---
        if (indId === 'rsi') {
            return padResults(RSI.calculate({ period, values: closePrices }), candles.length);
        }

        if (indId === 'macd') {
            const fastPeriod = Number(indConfig.params?.FastPeriod) || 12;
            const slowPeriod = Number(indConfig.params?.SlowPeriod) || 26;
            const signalPeriod = Number(indConfig.params?.SignalPeriod) || 9;
            const lineType = (indConfig.params?.Line || 'MACD Line').toLowerCase();

            const res = MACD.calculate({ values: closePrices, fastPeriod, slowPeriod, signalPeriod, SimpleMAOscillator: false, SimpleMASignal: false });
            
            let extractKey = 'MACD';
            if (lineType.includes('signal')) extractKey = 'signal';
            else if (lineType.includes('histogram')) extractKey = 'histogram';
            
            return padResults(res, candles.length, extractKey);
        }

        // --- VOLATILITY & BANDS ---
        if (indId === 'bollinger bands') {
            const stdDev = Number(indConfig.params?.StdDev) || 2;
            const lineType = (indConfig.params?.Line || 'Upper Band').toLowerCase();
            const res = BollingerBands.calculate({ period, stdDev, values: closePrices });

            let extractKey = 'upper';
            if (lineType.includes('lower')) extractKey = 'lower';
            else if (lineType.includes('middle') || lineType.includes('basis')) extractKey = 'middle';

            return padResults(res, candles.length, extractKey);
        }

        if (indId === 'adx') {
            const res = ADX.calculate({ high: highPrices, low: lowPrices, close: closePrices, period });
            const lineType = (indConfig.params?.Line || 'ADX').toLowerCase();
            
            let extractKey = 'adx';
            if (lineType.includes('+di') || lineType === 'pdi') extractKey = 'pdi';
            if (lineType.includes('-di') || lineType === 'mdi') extractKey = 'mdi';
            
            return padResults(res, candles.length, extractKey);
        }

        // --- TREND & VOLUME ---
        if (indId === 'vwap') {
            // VWAP ke liye volume hona jaruri hai (Isliye humne pehle Option 1 me Future chart laya tha!)
            const res = VWAP.calculate({ high: highPrices, low: lowPrices, close: closePrices, volume: volumes });
            return padResults(res, candles.length);
        }

        if (indId === 'parabolic sar' || indId === 'psar') {
            const step = Number(indConfig.params?.Step) || 0.02;
            const max = Number(indConfig.params?.Max) || 0.2;
            const res = PSAR.calculate({ high: highPrices, low: lowPrices, step, max });
            return padResults(res, candles.length);
        }

        if (indId === 'supertrend') {
            const stPeriod = Number(indConfig.params?.ATRPeriod) || 10;
            const stMultiplier = Number(indConfig.params?.Multiplier) || 3;
            return calculateSuperTrend(highPrices, lowPrices, closePrices, stPeriod, stMultiplier);
        }
        
        return Array(candles.length).fill(null);
    } catch (error) { 
        console.error(`⚠️ Error calculating indicator [${indId}]:`, error.message);
        return Array(candles.length).fill(null); 
    }
};

// =========================================================================
// 🎯 2. PARAMETER EXTRACTOR
// =========================================================================
const extractParams = (ruleInd, fallbackParams) => {
    let p = ruleInd?.params || fallbackParams || {};
    // Regex logic to catch period from UI display names like "SMA(14)"
    if (!p.Period && ruleInd?.display) {
        const match = ruleInd.display.match(/\((\d+)/);
        if (match) p.Period = Number(match[1]);
    }
    return p;
};

// =========================================================================
// ⚔️ 3. SIGNAL TRIGGER (CROSSOVER ENGINE)
// =========================================================================
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

module.exports = {
    calculateIndicator,
    extractParams,
    evaluateCondition
};