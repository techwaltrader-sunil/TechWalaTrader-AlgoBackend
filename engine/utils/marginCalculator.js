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

    // =======================================================================
    // 💥 STEP 3: Naked Leg Margin (DYNAMIC SPAN + EXPOSURE CALCULATION)
    // Ab hum hardcoded fix amount nahi lenge, Index ke Contract Value ka % nikalenge
    // =======================================================================
    
    // 1. Ek approximate spot price nikal lo (Kisi bhi leg ka strike price use karke)
    const approxSpot = legs[0]?.strike || 25000; 

    const calculateNakedMargin = (shorts) => {
        let nakedMargin = 0;
        for (let s of shorts) {
            if (s.remainingQty > 0) {
                // Total contract value of 1 Lot at current Index Level
                const contractValue = approxSpot * s.dynamicLotSize;
                
                // Base SEBI Margin Percentage (SPAN + Exposure)
                let marginPercent = 0.10; // Default 10%

                // Index specific Volatility Adjustments (Tuned for Exact Broker Match)
                if (baseSymbol.includes("BANKNIFTY") || baseSymbol.includes("MIDCPNIFTY")) {
                    // BankNifty aur Midcap me fluctuation jyada hota hai
                    marginPercent = isExpiryDay ? 0.13 : 0.09; // 13% on Expiry, 9% on Normal Days
                } else if (baseSymbol.includes("SENSEX") || baseSymbol.includes("FIN")) {
                    // Sensex / FinNifty
                    marginPercent = isExpiryDay ? 0.105 : 0.072; // 10.5% on Expiry, 7.2% on Normal Days (Matches Stockmock)
                } else {
                    // NIFTY 50
                    marginPercent = isExpiryDay ? 0.11 : 0.08; // 11% on Expiry, 8% on Normal Days
                }

                // Required Margin Per Lot = Contract Value * SEBI Percentage
                const requiredMarginPerLot = contractValue * marginPercent;
                
                let remainingLots = s.remainingQty / s.dynamicLotSize;
                nakedMargin += (requiredMarginPerLot * remainingLots);
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