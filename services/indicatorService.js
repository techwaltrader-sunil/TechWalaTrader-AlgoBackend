const { SMA, EMA, RSI, MACD, BollingerBands, ATR } = require('technicalindicators');

// 1. Indicator Calculate karne ka function
const calculateIndicator = (indConfig, candles) => {
    if (!indConfig || !indConfig.id) return null;
    const indId = indConfig.id.trim().toLowerCase();
    
    if (indId === 'number' || indId === 'static') {
        const staticVal = Number(indConfig.value) || Number(indConfig.params?.Value) || Number(indConfig.params?.value) || 0;
        return candles.map(() => staticVal);
    }
    
    const closePrices = candles.map(c => parseFloat(c.close) || 0);
    let results = [];
    
    try {
        if (indId === 'candle') return closePrices;
        if (indId === 'sma') results = SMA.calculate({ period: Number(indConfig.params?.Period) || Number(indConfig.params?.period) || 14, values: closePrices });
        else if (indId === 'ema') results = EMA.calculate({ period: Number(indConfig.params?.Period) || Number(indConfig.params?.period) || 9, values: closePrices });
        else if (indId === 'rsi') results = RSI.calculate({ period: Number(indConfig.params?.Period) || Number(indConfig.params?.period) || 14, values: closePrices });
        // Aap aage MACD, Bollinger Bands wagarah bhi add kar sakte hain
        
        if (results.length > 0) {
            const padding = Array(candles.length - results.length).fill(null);
            return [...padding, ...results];
        }
        return Array(candles.length).fill(null);
    } catch (error) { 
        return Array(candles.length).fill(null); 
    }
};

// 2. Parameters nikalne ka function
const extractParams = (ruleInd, fallbackParams) => {
    let p = ruleInd?.params || fallbackParams || {};
    if (!p.Period && ruleInd?.display) {
        const match = ruleInd.display.match(/\((\d+)/);
        if (match) p.Period = Number(match[1]);
    }
    return p;
};

// 3. Condition Match (Crossover etc.) check karne ka function
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