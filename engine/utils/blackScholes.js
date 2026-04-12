// File: src/engine/utils/blackScholes.js

/**
 * Normal Cumulative Distribution Function
 */
const normalCDF = (x) => {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.39894228 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - prob : prob;
};

/**
 * Standard Normal PDF (Vega nikalne ke liye zaroori hai)
 */
const normalPDF = (x) => {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
};

/**
 * Calculate Bulletproof BS Delta
 */
const calculateBSDelta = (S, K, t, v, r, type) => {
    if (v <= 0 || t <= 0) return type === 'call' ? (S > K ? 1 : 0) : (S < K ? -1 : 0);
    const d1 = (Math.log(S / K) + (r + (v * v) / 2) * t) / (v * Math.sqrt(t));
    const delta = normalCDF(d1);
    return type === 'call' ? delta : delta - 1;
};

/**
 * Option ka Price nikalne ka formula
 */
const calculateBSPrice = (S, K, t, v, r, type) => {
    if (t <= 0) return type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
    const d1 = (Math.log(S / K) + (r + (v * v) / 2) * t) / (v * Math.sqrt(t));
    const d2 = d1 - v * Math.sqrt(t);
    
    if (type === 'call') {
        return S * normalCDF(d1) - K * Math.exp(-r * t) * normalCDF(d2);
    } else {
        return K * Math.exp(-r * t) * normalCDF(-d2) - S * normalCDF(-d1);
    }
};

/**
 * Option ka Vega (Volatility badhne se price kitna badhega)
 */
const calculateBSVega = (S, K, t, v, r) => {
    if (t <= 0) return 0;
    const d1 = (Math.log(S / K) + (r + (v * v) / 2) * t) / (v * Math.sqrt(t));
    return S * Math.sqrt(t) * normalPDF(d1);
};

/**
 * 🔥 THE MAGIC: Reverse calculate Implied Volatility (Newton-Raphson Method)
 */
const getImpliedVolatility = (targetPrice, S, K, t, r, type) => {
    let v = 0.5; // Hum initial guess 50% IV se shuru karte hain
    const maxIter = 100; // Maximum 100 baar try karega
    const tolerance = 1e-4; // Accuracy level

    for (let i = 0; i < maxIter; i++) {
        const price = calculateBSPrice(S, K, t, v, r, type);
        const diff = price - targetPrice;
        
        // Agar difference bahut chota hai, matlab hume sahi IV mil gaya!
        if (Math.abs(diff) < tolerance) return v;

        const vega = calculateBSVega(S, K, t, v, r);
        if (vega === 0) break; // Error se bachne ke liye

        v = v - (diff / vega); // Newton-Raphson ka formula
    }
    
    // Agar math fail ho jaye ya negative aaye, to default 15% (0.15) return kar do
    if (v <= 0 || isNaN(v)) return 0.15; 
    
    return v;
};

// 🔥 Niche Export laga diya gaya hai
module.exports = {
    calculateBSDelta,
    getImpliedVolatility
};