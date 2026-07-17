// // File: src/engine/utils/marginCalculator.js

// /**
//  * 🧮 APPROXIMATE SPAN + EXPOSURE MARGIN CALCULATOR (For Backtesting)
//  * Yeh logic Stockmock ki tarah Options basket ka Est. Margin nikalta hai.
//  */
// const calculateApproxBasketMargin = (legs, baseSymbol = "NIFTY 50") => {
//     // Note: 2026 ke hisab se Nifty ka naked sell margin approx ₹1.10L to ₹1.25L per lot hota hai.
//     // Hum ek base value set karenge.
//     let perNakedLotMargin = 120000; // ₹1.20 Lakh per naked lot (Nifty)
//     if (baseSymbol.includes("BANKNIFTY")) perNakedLotMargin = 90000;
//     if (baseSymbol.includes("FINNIFTY")) perNakedLotMargin = 80000;
//     if (baseSymbol.includes("MIDCPNIFTY")) perNakedLotMargin = 75000;

//     let totalMargin = 0;
//     let ceBuyLots = 0, ceSellLots = 0;
//     let peBuyLots = 0, peSellLots = 0;
//     let netPremiumPaid = 0;
//     let netPremiumReceived = 0;

//     // 1. Lots ko separate karein
//     legs.forEach(leg => {
//         const value = leg.ltp * leg.lots * (leg.lotSize || 25); // Premium Value (₹)
        
//         if (leg.type === 'CE') {
//             if (leg.action === 'BUY') { ceBuyLots += leg.lots; netPremiumPaid += value; }
//             if (leg.action === 'SELL') { ceSellLots += leg.lots; netPremiumReceived += value; }
//         } else if (leg.type === 'PE') {
//             if (leg.action === 'BUY') { peBuyLots += leg.lots; netPremiumPaid += value; }
//             if (leg.action === 'SELL') { peSellLots += leg.lots; netPremiumReceived += value; }
//         }
//     });

//     // 2. Unhedged (Naked) Lots nikalna
//     // Agar hum 4 CE sell kar rahe hain aur 1 CE buy kiya hai, toh hedge benefit sirf 1 lot ko milega.
//     // Baaki 3 lots naked maane jayenge.
//     let nakedCeSells = Math.max(0, ceSellLots - ceBuyLots);
//     let nakedPeSells = Math.max(0, peSellLots - peBuyLots);

//     // 3. Hedged Lots ka margin (Spread margin is usually around ₹30k - ₹40k per lot)
//     let hedgedCeSells = ceSellLots - nakedCeSells;
//     let hedgedPeSells = peSellLots - nakedPeSells;

//     let hedgedMarginPerLot = 35000; // Approx ₹35k per hedged lot

//     // 4. Final Calculation
//     let totalNakedMargin = (nakedCeSells + nakedPeSells) * perNakedLotMargin;
//     let totalHedgedMargin = (hedgedCeSells + hedgedPeSells) * hedgedMarginPerLot;

//     // Options buy karne ke liye premium dena padta hai, wo bhi block hota hai
//     totalMargin = totalNakedMargin + totalHedgedMargin + netPremiumPaid;

//     // Stockmock jaisa exact dikhane ke liye hum isme ek 5-7% ka SPAN buffer add kar dete hain 
//     // kyunki strike distance door hone par SPAN margin badhta hai.
//     totalMargin = totalMargin * 1.05; 

//     return totalMargin; // E.g., Return karega ₹ 9,14,000
// };


// /**
//  * 📡 LIVE BROKER MARGIN CALCULATOR (For Live Trading)
//  */
// const fetchLiveBasketMargin = async (legs, brokerCredentials) => {
//     try {
//         console.log("📡 Fetching accurate basket margin from Broker API...");
//         // Yahan aapke broker (Dhan) ka Margin API call hoga
//         // const response = await dhanMarginApi.calculateBasket(legs);
//         // return response.marginRequired;
        
//         // Abhi ke liye fallback ke roop me approximate bhej rahe hain
//         return calculateApproxBasketMargin(legs); 
//     } catch (error) {
//         console.log("⚠️ Broker Margin API failed, using approximate calculation...");
//         return calculateApproxBasketMargin(legs);
//     }
// };

// module.exports = {
//     calculateApproxBasketMargin,
//     fetchLiveBasketMargin
// };


/**
 * 🚀 THE ADVANCED HEURISTIC MARGIN CALCULATOR (As per SEBI Peak Margin Rules)
 * Step 1: Position Pairing (Hedging Logic)
 * Step 2: Spread Margin Calculation (Risk + Buffer)
 * Step 3: Naked Leg Margin (Dynamic Expiry Day Adjustment & Dynamic Lot Sizes)
 * Step 4: Credit/Debit Offset (Premium Adjustment)
 */

const calculateApproxBasketMargin = (legs, baseSymbol = "NIFTY 50", isExpiryDay = false) => {
    if (!legs || legs.length === 0) return 0;

    let totalMargin = 0;
    let ceLongs = [];
    let ceShorts = [];
    let peLongs = [];
    let peShorts = [];

    // 🧠 SMART FALLBACK: Agar API fail ho jaye, to index ke hisaab se aaj ke date ka sahi lot size dega
    const getFallbackLotSize = (symbol) => {
        if (symbol.includes("BANK")) return 15;
        if (symbol.includes("SENSEX")) return 10;
        if (symbol.includes("FINNIFTY")) return 25;
        if (symbol.includes("MIDCP")) return 50; 
        return 65; // NIFTY 50 ka naya default (Current SEBI Rules)
    };

    // 📂 STEP 0: Segregate Legs (BUY/SELL & CE/PE)
    legs.forEach(leg => {
        // 🔥 100% DYNAMIC LOT SIZE: API ke lot size ko priority, fail hone par fallback
        const lotSize = leg.inst?.lotSize || leg.lotSize || getFallbackLotSize(baseSymbol);
        const totalQty = leg.lots * lotSize;
        
        // dynamicLotSize ko item ke andar save kar rahe hain taki aage math me kaam aaye
        const item = { ...leg, remainingQty: totalQty, dynamicLotSize: lotSize };
        
        if (leg.type === 'CE') {
            if (leg.action === 'BUY') ceLongs.push(item);
            else ceShorts.push(item);
        } else if (leg.type === 'PE') {
            if (leg.action === 'BUY') peLongs.push(item);
            else peShorts.push(item);
        }
    });

    // 🛡️ STEP 1 & 2: Position Pairing (Hedging) & Spread Margin
    const calculateSpreadMargin = (longs, shorts) => {
        let spreadMargin = 0;
        
        // Sort by strike to pair nearest legs (Best Hedge First)
        longs.sort((a, b) => a.strike - b.strike);
        shorts.sort((a, b) => a.strike - b.strike);

        for (let s of shorts) {
            for (let l of longs) {
                if (s.remainingQty <= 0) break;
                if (l.remainingQty <= 0) continue;

                let pairedQty = Math.min(s.remainingQty, l.remainingQty);
                s.remainingQty -= pairedQty; // Deduct hedged qty
                l.remainingQty -= pairedQty; // Deduct hedged qty

                // Spread Risk = (Strike Difference * Paired Qty)
                let strikeDiff = Math.abs(s.strike - l.strike);
                let baseSpreadRisk = strikeDiff * pairedQty;
                
                // Add SEBI exposure buffer for hedged positions (~₹150 equivalent per qty)
                let spreadExposureBuffer = pairedQty * 150; 
                
                spreadMargin += (baseSpreadRisk + spreadExposureBuffer);
            }
        }
        return spreadMargin;
    };

    totalMargin += calculateSpreadMargin(ceLongs, ceShorts);
    totalMargin += calculateSpreadMargin(peLongs, peShorts);

    // 💥 STEP 3: Naked Leg Margin (VIX / Expiry Rule)
    // Ab hum fix 50 qty ka math nahi karenge, direct 'Per Lot' calculate karenge!
    
    let baseNakedMarginPerLot = 110000;  // Normal Day Nifty (Approx 1.1L per dynamic lot)
    
    if (isExpiryDay) {
        // 🔥 SEBI Gamma Rule: Expiry Day naked shorts require massive margin
        baseNakedMarginPerLot = 145000; 
    }

    // Dynamic Index Adjustment (Custom margin logic for each symbol)
    if (baseSymbol.includes("BANK")) {
        baseNakedMarginPerLot = isExpiryDay ? 120000 : 85000; 
    } else if (baseSymbol.includes("SENSEX")) {
        baseNakedMarginPerLot = isExpiryDay ? 100000 : 65000; 
    } else if (baseSymbol.includes("FINNIFTY")) {
        baseNakedMarginPerLot = isExpiryDay ? 115000 : 80000;
    } else if (baseSymbol.includes("MIDCP")) {
        baseNakedMarginPerLot = isExpiryDay ? 120000 : 85000;
    }

    const calculateNakedMargin = (shorts) => {
        let nakedMargin = 0;
        for (let s of shorts) {
            if (s.remainingQty > 0) {
                // 🔥 DYNAMIC MATH: Bachi hui quantity ko wapas uske real lot size se divide karke Lots nikalo
                let remainingLots = s.remainingQty / s.dynamicLotSize;
                nakedMargin += (baseNakedMarginPerLot * remainingLots);
            }
        }
        return nakedMargin;
    };

    totalMargin += calculateNakedMargin(ceShorts);
    totalMargin += calculateNakedMargin(peShorts);

    // 💳 STEP 4: Credit / Debit Offset
    let totalDebit = 0; // Premium Paid (Money Out)
    let totalCredit = 0; // Premium Received (Money In)

    legs.forEach(leg => {
        // Offset me bhi wahi dynamic lot size use hoga
        const lotSize = leg.inst?.lotSize || leg.lotSize || getFallbackLotSize(baseSymbol);
        const totalQty = leg.lots * lotSize;
        const premiumValue = leg.entryPrice * totalQty;

        if (leg.action === 'BUY') {
            totalDebit += premiumValue;
        } else {
            totalCredit += premiumValue;
        }
    });

    // Net Premium Offset: 
    // - Paid more? Margin requirement goes UP.
    // - Received more? Margin requirement goes DOWN (Margin Benefit).
    let netPremiumOffset = totalDebit - totalCredit;
    totalMargin += netPremiumOffset;

    // Failsafe: System me koi glitch bhi aaye toh margin 50k se niche na dikhaye
    return Math.max(totalMargin, 50000); 
};

module.exports = { calculateApproxBasketMargin };