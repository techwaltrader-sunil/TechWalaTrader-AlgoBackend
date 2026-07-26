// File: engine/strategies/ratioSpreadManager.js

/**
 * =========================================================
 * 🧠 RATIO SPREAD MASTER ENGINE (CENTRAL LOGIC)
 * Reusable for both Backtest Engine & Live Trading Engine
 * =========================================================
 */

// ---------------------------------------------------------
// 1. THE ADAPTIVE SKEW & LEG GENERATOR
// ---------------------------------------------------------
/**
 * UI se aane wali settings aur Live Premiums ko match karke 
 * exact Strikes aur Lot Size calculate karega.
 */
const generateRatioSpreadLegs = async (spotPrice, atmStrike, upperSymbol, stepSize, targetCePremium, targetPePremium, fetchPremiumCallback, config) => {
    
    // UI Settings aur Defaults extract karein
    const executionMode = config.executionMode || 'SYMMETRIC';
    const maxAsymmetricLots = config.maxAsymmetricLots || 5;
    const realLotSize = config.realLotSize || 65;
    
    let ceSellLots = config.defaultCeLots || 4;
    let peSellLots = config.defaultPeLots || 4;

    let finalOtmCe = null;
    let finalOtmPe = null;
    let bestStep = 0;
    
    let bestCeStep = 0; 
    let bestPeStep = 0;

    console.log(`\n🤿 Scanning Option Chain in 🔥 ${executionMode} Mode to find exact Premium matches...`);

    if (executionMode === 'SYMMETRIC') {
        // =========================================================
        // 🟦 SYMMETRIC SCANNER (Fixed Steps for both sides)
        // =========================================================
        let minCombinedError = Infinity; 

        for(let step = 1; step <= 10; step++) {
            const expectedCeStrike = atmStrike + (step * stepSize);
            const expectedPeStrike = atmStrike - (step * stepSize);
            
            // Universal callback call (Works for Backtest & Live)
            let ceData = await fetchPremiumCallback("CE", expectedCeStrike);
            let peData = await fetchPremiumCallback("PE", expectedPeStrike);

            if(!ceData || !peData) continue;

            let ceError = Math.abs(ceData.price - targetCePremium);
            let peError = Math.abs(peData.price - targetPePremium);
            let combinedError = ceError + peError;

            if (combinedError < minCombinedError) {
                minCombinedError = combinedError;
                bestStep = step;
                finalOtmCe = ceData;
                finalOtmPe = peData;
            }

            if (ceData.price < (targetCePremium * 0.4) && peData.price < (targetPePremium * 0.4)) break; 
        }
        console.log(`✅ [LOCK IN] Selected Symmetric Strike: Step ${bestStep}`);

    } else {
        // =========================================================
        // 🟪/🟩 DYNAMIC SCANNER (ASYMMETRIC & ADAPTIVE_SKEW)
        // =========================================================
        let minCeError = Infinity;
        let minPeError = Infinity;

        // 1. CE Side Scan
        for(let step = 1; step <= 15; step++) { 
            const expectedCeStrike = atmStrike + (step * stepSize);
            let ceData = await fetchPremiumCallback("CE", expectedCeStrike);
            if(!ceData) continue;
            
            let ceError = Math.abs(ceData.price - targetCePremium);
            if (ceError < minCeError) {
                minCeError = ceError;
                bestCeStep = step;
                finalOtmCe = ceData;
            }
            if (ceData.price < (targetCePremium * 0.3)) break; 
        }

        // 2. PE Side Scan
        for(let step = 1; step <= 15; step++) { 
            const expectedPeStrike = atmStrike - (step * stepSize);
            let peData = await fetchPremiumCallback("PE", expectedPeStrike);
            if(!peData) continue;
            
            let peError = Math.abs(peData.price - targetPePremium);
            if (peError < minPeError) {
                minPeError = peError;
                bestPeStep = step;
                finalOtmPe = peData;
            }
            if (peData.price < (targetPePremium * 0.3)) break; 
        }

        const safeCeStrike = finalOtmCe ? finalOtmCe.strike : "N/A";
        const safePeStrike = finalOtmPe ? finalOtmPe.strike : "N/A";
        console.log(`✅ [PREMIUM MATCHED] Initial Match -> CE: Step ${bestCeStep} (${safeCeStrike}) | PE: Step ${bestPeStep} (${safePeStrike})`);

        // 3. Math & Mode Execution
        let fallbackStep = upperSymbol.includes("BANK") ? 6 : 5;
        let activeCeStep = finalOtmCe ? bestCeStep : fallbackStep;
        let activePeStep = finalOtmPe ? bestPeStep : fallbackStep;

        if (executionMode === 'ASYMMETRIC') {
            // --- 🟪 ASYMMETRIC LOGIC (Delta Neutral Sizing) ---
            let calculatedCeLots = activeCeStep + 1;
            let calculatedPeLots = activePeStep + 1;

            ceSellLots = Math.min(calculatedCeLots, maxAsymmetricLots);
            peSellLots = Math.min(calculatedPeLots, maxAsymmetricLots);
            bestStep = Math.max(activeCeStep, activePeStep); 

        } else if (executionMode === 'ADAPTIVE_SKEW') {
            // --- 🟩 ADAPTIVE SKEW MODE (Sunil Bhai's Masterpiece) ---
            let stepDiff = Math.abs(activeCeStep - activePeStep);
            let originalCeStep = activeCeStep;
            let originalPeStep = activePeStep;

            if (stepDiff === 0) {
                // Rule 5: Equal Steps
                ceSellLots = 4; peSellLots = 4;
                console.log(`⚖️ Adaptive [Rule 5]: Zero Skew detected. Firing equal 4-4 lots.`);
            } 
            else if (stepDiff === 1) {
                // Rule 1, 2 & 3: Minor Skew (1 step gap)
                if (activeCeStep < activePeStep) { ceSellLots = 3; peSellLots = 4; } 
                else { ceSellLots = 4; peSellLots = 3; }
                console.log(`🛡️ Adaptive [Minor Skew]: Closer leg assigned 3 lots. Assigned -> CE: ${ceSellLots}, PE: ${peSellLots}.`);
            } 
            else if (stepDiff >= 2) {
                // Rule 4: Dangerous Skew (Shift closer leg by +1 for Safety)
                if (activeCeStep < activePeStep) {
                    activeCeStep += 1; 
                    ceSellLots = 3; peSellLots = 4;
                    console.log(`🚨 Adaptive [Major Skew]: Shifting CE Step ${originalCeStep} -> ${activeCeStep} for safety.`);
                    const shiftedStrike = atmStrike + (activeCeStep * stepSize);
                    const newCeData = await fetchPremiumCallback("CE", shiftedStrike);
                    if(newCeData) finalOtmCe = newCeData;
                } else {
                    activePeStep += 1; 
                    ceSellLots = 4; peSellLots = 3;
                    console.log(`🚨 Adaptive [Major Skew]: Shifting PE Step ${originalPeStep} -> ${activePeStep} for safety.`);
                    const shiftedStrike = atmStrike - (activePeStep * stepSize);
                    const newPeData = await fetchPremiumCallback("PE", shiftedStrike);
                    if(newPeData) finalOtmPe = newPeData;
                }
            }

            // Extreme Margin Guard for Event Days
            ceSellLots = Math.min(ceSellLots, maxAsymmetricLots);
            peSellLots = Math.min(peSellLots, maxAsymmetricLots);
            bestStep = Math.max(activeCeStep, activePeStep); 
        }
    }

    // =========================================================
    // 🚑 FALLBACK GUARD (If completely failed due to API)
    // =========================================================
    if (!finalOtmCe || !finalOtmPe) {
        bestStep = upperSymbol.includes("BANK") ? 6 : 5;
        finalOtmCe = { price: 32, strike: atmStrike + (bestStep * stepSize) };
        finalOtmPe = { price: 27, strike: atmStrike - (bestStep * stepSize) };
        console.log(`⚠️ Scanner Failed. Using Default Step ${bestStep}.`);
    }

    // Getting ATM Premiums (Direct hit to callback)
    const atmCe = await fetchPremiumCallback("CE", atmStrike) || { price: 120, strike: atmStrike };
    const atmPe = await fetchPremiumCallback("PE", atmStrike) || { price: 110, strike: atmStrike };

    // =========================================================
    // 🎯 FINAL LEGS CONSTRUCTION (BUY FIRST, SELL LATER)
    // =========================================================
    // Sequence is extremely important for margin benefit in live market!
    const activeLegs = [
        { strike: atmCe.strike, type: 'CE', action: 'BUY', entryPrice: atmCe.price, lots: 1, tag: 'MAIN', inst: { id: `CE_ATM`, lotSize: realLotSize } },
        { strike: atmPe.strike, type: 'PE', action: 'BUY', entryPrice: atmPe.price, lots: 1, tag: 'MAIN', inst: { id: `PE_ATM`, lotSize: realLotSize } },
        { strike: finalOtmCe.strike, type: 'CE', action: 'SELL', entryPrice: finalOtmCe.price, lots: ceSellLots, tag: 'MAIN', inst: { id: `CE_OTM`, lotSize: realLotSize } },
        { strike: finalOtmPe.strike, type: 'PE', action: 'SELL', entryPrice: finalOtmPe.price, lots: peSellLots, tag: 'MAIN', inst: { id: `PE_OTM`, lotSize: realLotSize } }
    ];

    return {
        activeLegs,
        bestStep,
        ceSellLots,
        peSellLots
    };
};

// ---------------------------------------------------------
// 2. THE VELOCITY GUARD (GAMMA BLAST DETECTOR)
// ---------------------------------------------------------
/**
 * Live tick ya backtest candle par check karega ki market 
 * achanak se crash ya spike toh nahi ho raha.
 */
const checkVelocityGuard = (currentSpot, spotHistory, velocityWindow, velocityPoints, isAlreadyPanic) => {
    // Agar pehle se panic mode ON hai, toh check karne ki zarurat nahi
    if (isAlreadyPanic) return { isPanic: true, spotHistory };

    // Naya spot history me daalo
    spotHistory.push(currentSpot);

    // Window size (e.g., 15 mins) maintain rakho
    if (spotHistory.length > velocityWindow) {
        spotHistory.shift(); 
    }

    // Jab history full ho jaye, tabhi velocity check karo
    if (spotHistory.length === velocityWindow) {
        const oldSpot = spotHistory[0];
        const spotMove = Math.abs(currentSpot - oldSpot);

        if (spotMove >= velocityPoints) {
            console.log(`\n🚨 [GAMMA BLAST ALERT] High Velocity! Spot moved ${spotMove.toFixed(2)} pts in ${velocityWindow} mins. Shifting to Panic API Mode!\n`);
            return { 
                isPanic: true, 
                spotMove, 
                spotHistory 
            };
        }
    }
    
    return { isPanic: false, spotHistory };
};

// ---------------------------------------------------------
// 3. THE GAMMA HOUR PROFIT SHIELD
// ---------------------------------------------------------
/**
 * 2:30 PM ke baad profit ko lock karke trail karega, aur
 * buffer drop hone par emergency exit ka signal dega.
 */
const evaluateGammaShield = (currentTimeStr, currentRealMtm, estimatedMargin, shieldConfig, shieldState) => {
    const { minProfitPct, dropBufferPct, startTime, endTime } = shieldConfig;
    let { isActive, highestLockedProfit } = shieldState;

    // ₹ Value calculate karna
    const minProfitAmt = (estimatedMargin * minProfitPct) / 100;
    const dropBufferAmt = (estimatedMargin * dropBufferPct) / 100;

    // Sirf 2:30 PM (startTime) se 3:15 PM (endTime) ke beech chalega
    if (currentTimeStr >= startTime && currentTimeStr <= endTime) {
        
        // Shield Trigger (Target Hit)
        if (!isActive && currentRealMtm >= minProfitAmt) {
            isActive = true;
            highestLockedProfit = currentRealMtm;
            console.log(`\n🛡️ [GAMMA SHIELD ON] Target Hit! (${minProfitPct}%) Locked REAL Profit: ₹${highestLockedProfit.toFixed(2)}\n`);
        }

        // Trail & Protect
        if (isActive) {
            // Naya high laga toh trail karo
            if (currentRealMtm > highestLockedProfit) {
                highestLockedProfit = currentRealMtm; 
            }

            // Cutoff SL (Buffer minus karke)
            const emergencyCutoffSL = highestLockedProfit - dropBufferAmt;
            
            // Agar profit gira aur buffer tut gaya -> Exit!
            if (currentRealMtm <= emergencyCutoffSL) {
                console.log(`\n🚨 [GAMMA SHIELD BREACH] REAL Profit dropped to ₹${currentRealMtm.toFixed(2)} (Below safety net ₹${emergencyCutoffSL.toFixed(2)}). Initiating Emergency Exit!`);
                return { 
                    action: 'FORCE_EXIT', 
                    reason: 'GAMMA_HOUR_PROFIT_SHIELD_DROP', 
                    newState: { isActive, highestLockedProfit } 
                };
            }
        }
    } 
    // Shield time khatam ho gaya
    else if (currentTimeStr > endTime && isActive) {
        console.log(`\n🛡️ [GAMMA SHIELD DEACTIVATED] Market survived the Gamma Hour.`);
        isActive = false; 
    }

    return { 
        action: 'HOLD', 
        newState: { isActive, highestLockedProfit } 
    };
};

// ---------------------------------------------------------
// 4. SMART IV CRUSH SIMULATOR (Theoretical Price)
// ---------------------------------------------------------
/**
 * Backtest aur Mock MTM ko verify karne ke liye Intraday decay 
 * aur IV crush ka mathematical formula.
 */
const calculateTheoreticalPrice = (leg, currentSpot, entrySpot, dte, timeInMinutes) => {
    // Yahan aapka 'entryDelta', 'avgDelta', 'intradayMaxDecay' aur
    // 'ivCrushFactor' wala pura genius math aayega.
    return 0; // Returns calculated theoretical premium
};


module.exports = {
    generateRatioSpreadLegs,
    checkVelocityGuard,
    evaluateGammaShield,
    calculateTheoreticalPrice
};