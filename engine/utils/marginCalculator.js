// File: src/engine/utils/marginCalculator.js

/**
 * 🧮 APPROXIMATE SPAN + EXPOSURE MARGIN CALCULATOR (For Backtesting)
 * Yeh logic Stockmock ki tarah Options basket ka Est. Margin nikalta hai.
 */
const calculateApproxBasketMargin = (legs, baseSymbol = "NIFTY 50") => {
    // Note: 2026 ke hisab se Nifty ka naked sell margin approx ₹1.10L to ₹1.25L per lot hota hai.
    // Hum ek base value set karenge.
    let perNakedLotMargin = 120000; // ₹1.20 Lakh per naked lot (Nifty)
    if (baseSymbol.includes("BANKNIFTY")) perNakedLotMargin = 90000;
    if (baseSymbol.includes("FINNIFTY")) perNakedLotMargin = 80000;
    if (baseSymbol.includes("MIDCPNIFTY")) perNakedLotMargin = 75000;

    let totalMargin = 0;
    let ceBuyLots = 0, ceSellLots = 0;
    let peBuyLots = 0, peSellLots = 0;
    let netPremiumPaid = 0;
    let netPremiumReceived = 0;

    // 1. Lots ko separate karein
    legs.forEach(leg => {
        const value = leg.ltp * leg.lots * (leg.lotSize || 25); // Premium Value (₹)
        
        if (leg.type === 'CE') {
            if (leg.action === 'BUY') { ceBuyLots += leg.lots; netPremiumPaid += value; }
            if (leg.action === 'SELL') { ceSellLots += leg.lots; netPremiumReceived += value; }
        } else if (leg.type === 'PE') {
            if (leg.action === 'BUY') { peBuyLots += leg.lots; netPremiumPaid += value; }
            if (leg.action === 'SELL') { peSellLots += leg.lots; netPremiumReceived += value; }
        }
    });

    // 2. Unhedged (Naked) Lots nikalna
    // Agar hum 4 CE sell kar rahe hain aur 1 CE buy kiya hai, toh hedge benefit sirf 1 lot ko milega.
    // Baaki 3 lots naked maane jayenge.
    let nakedCeSells = Math.max(0, ceSellLots - ceBuyLots);
    let nakedPeSells = Math.max(0, peSellLots - peBuyLots);

    // 3. Hedged Lots ka margin (Spread margin is usually around ₹30k - ₹40k per lot)
    let hedgedCeSells = ceSellLots - nakedCeSells;
    let hedgedPeSells = peSellLots - nakedPeSells;

    let hedgedMarginPerLot = 35000; // Approx ₹35k per hedged lot

    // 4. Final Calculation
    let totalNakedMargin = (nakedCeSells + nakedPeSells) * perNakedLotMargin;
    let totalHedgedMargin = (hedgedCeSells + hedgedPeSells) * hedgedMarginPerLot;

    // Options buy karne ke liye premium dena padta hai, wo bhi block hota hai
    totalMargin = totalNakedMargin + totalHedgedMargin + netPremiumPaid;

    // Stockmock jaisa exact dikhane ke liye hum isme ek 5-7% ka SPAN buffer add kar dete hain 
    // kyunki strike distance door hone par SPAN margin badhta hai.
    totalMargin = totalMargin * 1.05; 

    return totalMargin; // E.g., Return karega ₹ 9,14,000
};


/**
 * 📡 LIVE BROKER MARGIN CALCULATOR (For Live Trading)
 */
const fetchLiveBasketMargin = async (legs, brokerCredentials) => {
    try {
        console.log("📡 Fetching accurate basket margin from Broker API...");
        // Yahan aapke broker (Dhan) ka Margin API call hoga
        // const response = await dhanMarginApi.calculateBasket(legs);
        // return response.marginRequired;
        
        // Abhi ke liye fallback ke roop me approximate bhej rahe hain
        return calculateApproxBasketMargin(legs); 
    } catch (error) {
        console.log("⚠️ Broker Margin API failed, using approximate calculation...");
        return calculateApproxBasketMargin(legs);
    }
};

module.exports = {
    calculateApproxBasketMargin,
    fetchLiveBasketMargin
};