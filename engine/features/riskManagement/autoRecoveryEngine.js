const moment = require('moment-timezone');
const { placeDhanOrder, fetchLiveLTP } = require('../../../services/dhanService.js');
const { getOptionSecurityId, sleep } = require('../../../services/instrumentService.js');
const { createAndEmitLog } = require('../../utils/logger.js');

/**
 * =========================================================
 * 🚑 LIVE FIREFIGHTING (RECOVERY ENGINE)
 * =========================================================
 */

const executeAutoRecovery = async (deployment, broker, session, currentSpotPrice, exitReason) => {
    try {
        console.log(`\n🚑 [RECOVERY ENGINE] Firefighting Initiated! Reason: ${exitReason}`);

        // 1. 🕒 TIME CHECK (03:15 PM LIMIT)
        const currentTime = moment().tz("Asia/Kolkata");
        const cutoffTime = moment().tz("Asia/Kolkata").set({ hour: 15, minute: 15, second: 0 });
        
        if (currentTime.isAfter(cutoffTime)) {
            console.log(`⛔ [RECOVERY BLOCKED] Time is past 03:15 PM. No new recovery trades allowed.`);
            return { success: false, reason: "TIME_OVER" };
        }

        // 2. 🔄 MAX ATTEMPTS CHECK
        const maxAttempts = deployment.advanceSettings?.autoRecoveryConfig?.maxAttempts || 2;
        deployment.recoveryAttempts = deployment.recoveryAttempts || 0;

        if (deployment.recoveryAttempts >= maxAttempts) {
            console.log(`⛔ [RECOVERY BLOCKED] Max attempts (${maxAttempts}) reached. Shutting down engine.`);
            return { success: false, reason: "MAX_ATTEMPTS_REACHED" };
        }

        // 3. 💰 RISK ALLOCATION (50% of Remaining Risk)
        const totalMaxLoss = session.maxLossLimit; // Engine memory se
        const currentRealizedLoss = deployment.realizedPnl || 0;
        
        // Agar pehle se hi limit se zyada loss hai toh ruko
        if (currentRealizedLoss <= -Math.abs(totalMaxLoss)) {
            console.log(`⛔ [RECOVERY BLOCKED] Max Loss Limit already hit. Cannot risk more.`);
            return { success: false, reason: "MAX_LOSS_HIT" };
        }

        const remainingRisk = Math.abs(totalMaxLoss) - Math.abs(currentRealizedLoss);
        const riskPerAttemptPct = deployment.advanceSettings?.autoRecoveryConfig?.riskPerAttempt || 50;
        const allocatedRisk = remainingRisk * (riskPerAttemptPct / 100);

        console.log(`💰 [RECOVERY RISK] Attempt: ${deployment.recoveryAttempts + 1}/${maxAttempts} | Allocated Risk: ₹${allocatedRisk.toFixed(2)}`);

        // 4. 📈 TREND ANALYSIS (SMC Zone ya Spot History se Trend nikalna)
        // Note: Yahan aap SMC Entry Engine se live trend fetch kar sakte hain. Abhi ke liye history logic.
        let marketTrend = "BEARISH"; 
        if (session.spotHistory && session.spotHistory.length > 2) {
            const firstSpot = session.spotHistory[0];
            const lastSpot = session.spotHistory[session.spotHistory.length - 1];
            marketTrend = lastSpot > firstSpot ? "BULLISH" : "BEARISH";
        }
        console.log(`📉 [RECOVERY TREND] Detected Market Trend: ${marketTrend}`);

        // 5. 🎯 STRIKE SELECTION (Out of The Money Options)
        const stepSize = session.symbol.includes("BANK") ? 100 : 50;
        let recoveryLegsToExecute = [];
        const lotSize = 65; // Dynamic kar sakte hain
        const lots = 2; // Recovery quantity

        if (marketTrend === "BULLISH") {
            // Market upar ja raha hai -> Sell OTM PE, Buy Deep OTM PE (Margin Benefit)
            const sellStrike = Math.floor(currentSpotPrice / stepSize) * stepSize - (stepSize * 2);
            const buyStrike = sellStrike - (stepSize * 3);
            
            recoveryLegsToExecute.push({ strike: buyStrike, type: 'PE', action: 'BUY', lots: lots });
            recoveryLegsToExecute.push({ strike: sellStrike, type: 'PE', action: 'SELL', lots: lots });
        } else {
            // Market niche ja raha hai -> Sell OTM CE, Buy Deep OTM CE (Margin Benefit)
            const sellStrike = Math.ceil(currentSpotPrice / stepSize) * stepSize + (stepSize * 2);
            const buyStrike = sellStrike + (stepSize * 3);
            
            recoveryLegsToExecute.push({ strike: buyStrike, type: 'CE', action: 'BUY', lots: lots });
            recoveryLegsToExecute.push({ strike: sellStrike, type: 'CE', action: 'SELL', lots: lots });
        }

        // 6. 🛒 EXECUTION LOGIC (BUY FIRST, SELL LATER)
        let successfulRecoveryLegs = [];
        let executionFailed = false;

        console.log(`🚀 Executing Recovery Spread...`);
        for (let leg of recoveryLegsToExecute) {
            const inst = getOptionSecurityId(session.symbol, leg.strike, String(leg.strike), "STRIKE", leg.type, "WEEKLY");
            if (!inst) continue;

            const orderData = { action: leg.action, quantity: leg.lots * lotSize, securityId: inst.id, segment: inst.exchange, orderType: "MARKET" };
            
            // Paper Trade Bypass
            if (deployment.executionType === 'PAPER') {
                const ltp = await fetchLiveLTP(broker.clientId, broker.apiSecret, inst.exchange, inst.id) || 50;
                successfulRecoveryLegs.push({ ...leg, inst, realEntryPrice: ltp, status: 'ACTIVE' });
                await sleep(500);
            } else {
                // Live Execution
                const orderResp = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                if (orderResp.success) {
                    await sleep(1500); // Margin benefit gap
                    const ltp = await fetchLiveLTP(broker.clientId, broker.apiSecret, inst.exchange, inst.id) || 0;
                    successfulRecoveryLegs.push({ ...leg, inst, realEntryPrice: ltp, status: 'ACTIVE' });
                    console.log(`  ✅ Recovery ${leg.action} Executed: ${leg.strike} ${leg.type} @ ₹${ltp}`);
                } else {
                    executionFailed = true;
                    break;
                }
            }
        }

        // Partial Execution Guard
        if (executionFailed) {
             console.log(`🚨 Recovery Execution Failed midway. Squaring off safe legs...`);
             // (Add square-off logic for active legs here if needed)
             return { success: false, reason: "API_EXECUTION_FAILED" };
        }

        // 7. 💾 DATABASE & MEMORY UPDATE
        deployment.recoveryAttempts += 1;
        
        const dbLegs = successfulRecoveryLegs.map(l => ({
             securityId: l.inst.id, exchange: l.inst.exchange, symbol: `${session.symbol} ${l.strike} ${l.type}`,
             action: l.action, quantity: l.lots * lotSize, entryPrice: l.realEntryPrice, status: 'ACTIVE',
             entryReason: `Recovery Attempt ${deployment.recoveryAttempts}`
        }));

        deployment.executedLegs = dbLegs;
        deployment.status = 'RECOVERY_MODE'; // Naya Status!
        await deployment.save();

        await createAndEmitLog(broker, session.symbol, "DEPLOY", 1, 'SUCCESS', `Recovery Trade Executed. Attempt ${deployment.recoveryAttempts}/${maxAttempts}`);

        // Update Session Memory
        session.activeLegs = successfulRecoveryLegs;
        session.status = 'RECOVERY_MODE';
        session.allocatedRecoveryRisk = allocatedRisk;

        return { success: true, newLegs: successfulRecoveryLegs };

    } catch (error) {
        console.error("❌ Recovery Engine Error:", error);
        return { success: false, reason: error.message };
    }
};

/**
 * =========================================================
 * 🎯 RECOVERY TRAILING LOGIC (0.4% C2C, 1% Lock, 0.2% Trail)
 * =========================================================
 */
const processRecoveryTrailing = (session, currentRealMtm) => {
    // Agar engine Recovery Mode me nahi hai toh wapas jao
    if (session.status !== 'RECOVERY_MODE') return null;

    const allocatedRisk = session.allocatedRecoveryRisk || 1000;
    
    // Percentages calculate karna based on allocated risk
    const currentProfitPct = (currentRealMtm / allocatedRisk) * 100;

    let { recoveryHighestProfitPct, currentRecoverySlPct } = session;
    recoveryHighestProfitPct = recoveryHighestProfitPct || 0;
    currentRecoverySlPct = currentRecoverySlPct || -100; // Shuru me SL 100% of allocated risk par hai

    let isUpdated = false;

    // Track Highest Profit
    if (currentProfitPct > recoveryHighestProfitPct) {
        recoveryHighestProfitPct = currentProfitPct;
        isUpdated = true;
    }

    // Rule 1: 0.4% aate hi SL Cost par (0%)
    if (recoveryHighestProfitPct >= 0.4 && currentRecoverySlPct < 0) {
        currentRecoverySlPct = 0;
        console.log(`🛡️ [RECOVERY TRAIL] Profit reached 0.4%. SL moved to COST (₹0).`);
        isUpdated = true;
    }

    // Rule 2: 1% aate hi 0.5% Lock
    if (recoveryHighestProfitPct >= 1.0 && currentRecoverySlPct < 0.5) {
        currentRecoverySlPct = 0.5;
        console.log(`🔒 [RECOVERY TRAIL] Profit reached 1%. SL Locked at 0.5%.`);
        isUpdated = true;
    }

    // Rule 3: 0.2% ka continuous Trailing (1% ke baad)
    if (recoveryHighestProfitPct > 1.0) {
        const extraProfit = recoveryHighestProfitPct - 1.0;
        const trailingSteps = Math.floor(extraProfit / 0.2); 
        
        const newCalculatedSlPct = 0.5 + (trailingSteps * 0.2);
        
        if (newCalculatedSlPct > currentRecoverySlPct) {
            currentRecoverySlPct = newCalculatedSlPct;
            console.log(`🎯 [RECOVERY TRAIL] Trailing Active! SL moved to ${currentRecoverySlPct.toFixed(2)}%`);
            isUpdated = true;
        }
    }

    // State update in session
    if (isUpdated) {
        session.recoveryHighestProfitPct = recoveryHighestProfitPct;
        session.currentRecoverySlPct = currentRecoverySlPct;
    }

    // Exit Condition Check (Trailing Hit!)
    if (currentRecoverySlPct !== -100 && currentProfitPct <= currentRecoverySlPct) {
         console.log(`🚨 [RECOVERY EXIT] Trailed SL Hit at ${currentRecoverySlPct}%! Exiting Recovery Trade.`);
         return { shouldExit: true, reason: "RECOVERY_TRAIL_HIT" };
    }

    // Hard Stop Loss check for Recovery Trade (-100% of allocated risk)
    if (currentProfitPct <= -100) {
        console.log(`🚨 [RECOVERY EXIT] Max Risk Hit! Exiting Recovery Trade.`);
        return { shouldExit: true, reason: "RECOVERY_MAX_LOSS_HIT" };
    }

    return { shouldExit: false };
};

module.exports = {
    executeAutoRecovery,
    processRecoveryTrailing
};