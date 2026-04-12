// File: src/engine/utils/blackScholes.js

/**
 * Normal Cumulative Distribution Function
 */
export const normalCDF = (x) => {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.39894228 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - prob : prob;
};

/**
 * Calculate Bulletproof BS Delta
 */
export const calculateBSDelta = (S, K, t, v, r, type) => {
    if (v <= 0 || t <= 0) return type === 'call' ? (S > K ? 1 : 0) : (S < K ? -1 : 0);
    const d1 = (Math.log(S / K) + (r + (v * v) / 2) * t) / (v * Math.sqrt(t));
    const delta = normalCDF(d1);
    return type === 'call' ? delta : delta - 1;
};


/**
 * 🔥 THE MAGIC: Reverse calculate Implied Volatility (Newton-Raphson Method)
 */
export const getImpliedVolatility = (targetPrice, S, K, t, r, type) => {
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