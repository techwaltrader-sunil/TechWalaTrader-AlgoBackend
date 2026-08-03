const moment = require('moment-timezone');
const { placeDhanOrder, fetchLiveLTP } = require('../../../services/dhanService.js');
const { getStrikeStep, getOptionSecurityId, sleep } = require('../../../services/instrumentService.js');
const { createAndEmitLog } = require('../../utils/logger.js');

/**
 * =========================================================
 * 🚑 LIVE FIREFIGHTING (RECOVERY ENGINE)
 * =========================================================
 */

const executeAutoRecovery = async (deployment, broker, session, currentSpotPrice, exitReason) => {
    try {
        console.log(`\n🚑 [RECOVERY ENGINE] Firefighting Initiated! Reason: ${exitReason}`);

        // 🧠 Fetch Dynamic Settings from DB
        const strategyData = deployment.strategyId?.data || {};
        const recSettings = strategyData.recoverySettings || {};
        const riskSettings = strategyData.riskManagement || {};

        // 1. 🕒 DYNAMIC TIME CHECK (noTradeAfter Limit)
        const noTradeAfter = riskSettings.noTradeAfter || "15:15";
        const [cHour, cMin] = noTradeAfter.split(':').map(Number);
        
        const currentTime = moment().tz("Asia/Kolkata");
        const cutoffTime = moment().tz("Asia/Kolkata").set({ hour: cHour, minute: cMin, second: 0 });
        
        if (currentTime.isAfter(cutoffTime)) {
            console.log(`⛔ [RECOVERY BLOCKED] Time is past ${noTradeAfter}. No new recovery trades allowed.`);
            return { success: false, reason: "TIME_OVER" };
        }

        // 2. 🔄 MAX ATTEMPTS CHECK
        const maxAttempts = recSettings.attempts || 2;
        deployment.recoveryAttempts = deployment.recoveryAttempts || 0;

        if (deployment.recoveryAttempts >= maxAttempts) {
            console.log(`⛔ [RECOVERY BLOCKED] Max attempts (${maxAttempts}) reached. Shutting down engine.`);
            return { success: false, reason: "MAX_ATTEMPTS_REACHED" };
        }

        // 3. 💰 RISK ALLOCATION (Dynamic % of Remaining Risk)
        const totalMaxLoss = session.maxLossLimit; // Engine memory se
        const currentRealizedLoss = deployment.realizedPnl || 0;
        
        if (currentRealizedLoss <= -Math.abs(totalMaxLoss)) {
            console.log(`⛔ [RECOVERY BLOCKED] Max Loss Limit already hit. Cannot risk more.`);
            return { success: false, reason: "MAX_LOSS_HIT" };
        }

        const remainingRisk = Math.abs(totalMaxLoss) - Math.abs(currentRealizedLoss);
        const riskPerAttemptPct = recSettings.riskPct || 50;
        const allocatedRisk = remainingRisk * (riskPerAttemptPct / 100);

        console.log(`💰 [RECOVERY RISK] Attempt: ${deployment.recoveryAttempts + 1}/${maxAttempts} | Allocated Risk: ₹${allocatedRisk.toFixed(2)}`);

        // 4. 📈 TREND ANALYSIS (Spot History Logic)
        let marketTrend = "BEARISH"; 
        if (session.spotHistory && session.spotHistory.length > 2) {
            const firstSpot = session.spotHistory[0];
            const lastSpot = session.spotHistory[session.spotHistory.length - 1];
            marketTrend = lastSpot > firstSpot ? "BULLISH" : "BEARISH";
        }
        console.log(`📉 [RECOVERY TREND] Detected Market Trend: ${marketTrend}`);

        // 5. 🎯 STRIKE SELECTION (Dynamic Step & Lot Size)
        const stepSize = getStrikeStep(session.symbol); // 🔥 Imported utility use kiya!
        const lotSize = session.activeLegs && session.activeLegs[0] ? (session.activeLegs[0].inst?.lotSize || 65) : 65; 
        const lots = 2; // (Future Scope: Calculate lots based on allocatedRisk)
        
        let recoveryLegsToExecute = [];

        if (marketTrend === "BULLISH") {
            const sellStrike = Math.floor(currentSpotPrice / stepSize) * stepSize - (stepSize * 2);
            const buyStrike = sellStrike - (stepSize * 3);
            recoveryLegsToExecute.push({ strike: buyStrike, type: 'PE', action: 'BUY', lots: lots });
            recoveryLegsToExecute.push({ strike: sellStrike, type: 'PE', action: 'SELL', lots: lots });
        } else {
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
            
            if (deployment.executionType === 'PAPER' || deployment.executionType === 'FORWARD_TEST') {
                const ltp = await fetchLiveLTP(broker.clientId, broker.apiSecret, inst.exchange, inst.id) || 50;
                successfulRecoveryLegs.push({ ...leg, inst, realEntryPrice: ltp, status: 'ACTIVE' });
                await sleep(500);
            } else {
                const orderResp = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                if (orderResp.success) {
                    await sleep(1500);
                    const ltp = await fetchLiveLTP(broker.clientId, broker.apiSecret, inst.exchange, inst.id) || 0;
                    successfulRecoveryLegs.push({ ...leg, inst, realEntryPrice: ltp, status: 'ACTIVE' });
                    console.log(`  ✅ Recovery ${leg.action} Executed: ${leg.strike} ${leg.type} @ ₹${ltp}`);
                } else {
                    executionFailed = true;
                    break;
                }
            }
        }

        if (executionFailed) {
             console.log(`🚨 Recovery Execution Failed midway. Squaring off safe legs...`);
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
        deployment.status = 'RECOVERY_MODE'; 
        await deployment.save();

        await createAndEmitLog(broker, session.symbol, "DEPLOY", 1, 'SUCCESS', `Recovery Trade Executed. Attempt ${deployment.recoveryAttempts}/${maxAttempts}`);

        // Update Session Memory (Saved recoverySettings for Trailing function)
        session.activeLegs = successfulRecoveryLegs;
        session.status = 'RECOVERY_MODE';
        session.allocatedRecoveryRisk = allocatedRisk;
        session.recoverySettings = recSettings; // 🔥 Saved config for dynamic trailing!

        return { success: true, newLegs: successfulRecoveryLegs };

    } catch (error) {
        console.error("❌ Recovery Engine Error:", error);
        return { success: false, reason: error.message };
    }
};

/**
 * =========================================================
 * 🎯 DYNAMIC RECOVERY TRAILING LOGIC
 * =========================================================
 */
const processRecoveryTrailing = (session, currentRealMtm) => {
    if (session.status !== 'RECOVERY_MODE') return null;

    const allocatedRisk = session.allocatedRecoveryRisk || 1000;
    const currentProfitPct = (currentRealMtm / allocatedRisk) * 100;

    // 🔥 FETCH DYNAMIC PARAMS FROM SESSION MEMORY
    const recSettings = session.recoverySettings || {};
    const c2cTrigger = Number(recSettings.c2cTrigger) || 0.4;
    const lockTarget = Number(recSettings.target) || 1.0;
    const lockPct = Number(recSettings.lock) || 0.5;
    const trailPct = Number(recSettings.trail) || 0.2;

    let { recoveryHighestProfitPct, currentRecoverySlPct } = session;
    recoveryHighestProfitPct = recoveryHighestProfitPct || 0;
    currentRecoverySlPct = currentRecoverySlPct || -100; 

    let isUpdated = false;

    if (currentProfitPct > recoveryHighestProfitPct) {
        recoveryHighestProfitPct = currentProfitPct;
        isUpdated = true;
    }

    // Rule 1: c2cTrigger aate hi SL Cost par (0%)
    if (recoveryHighestProfitPct >= c2cTrigger && currentRecoverySlPct < 0) {
        currentRecoverySlPct = 0;
        console.log(`🛡️ [RECOVERY TRAIL] Profit reached ${c2cTrigger}%. SL moved to COST (₹0).`);
        isUpdated = true;
    }

    // Rule 2: lockTarget aate hi lockPct Lock
    if (recoveryHighestProfitPct >= lockTarget && currentRecoverySlPct < lockPct) {
        currentRecoverySlPct = lockPct;
        console.log(`🔒 [RECOVERY TRAIL] Profit reached ${lockTarget}%. SL Locked at ${lockPct}%.`);
        isUpdated = true;
    }

    // Rule 3: Continuous Trailing
    if (recoveryHighestProfitPct > lockTarget) {
        const extraProfit = recoveryHighestProfitPct - lockTarget;
        const trailingSteps = Math.floor(extraProfit / trailPct); 
        
        const newCalculatedSlPct = lockPct + (trailingSteps * trailPct);
        
        if (newCalculatedSlPct > currentRecoverySlPct) {
            currentRecoverySlPct = newCalculatedSlPct;
            console.log(`🎯 [RECOVERY TRAIL] Trailing Active! SL moved to ${currentRecoverySlPct.toFixed(2)}%`);
            isUpdated = true;
        }
    }

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