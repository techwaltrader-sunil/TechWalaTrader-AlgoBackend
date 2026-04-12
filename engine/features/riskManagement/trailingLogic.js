// File: src/engine/features/riskManagement/trailingLogic.js

// 🔥 1. IMPORT LOGGER
import { createAndEmitLog } from '../../utils/logger.js';

/**
 * 📈 PROFIT TRAILING LOGIC (Lock, Trail, Lock & Trail)
 */
// 🔥 2. FUNCTION SIGNATURE ME 'broker' ADD KIYA
export const processTrailingLogic = async (deployment, strategy, liveLtp, broker) => {
    try {
        const riskData = strategy.data?.riskManagement || {};
        const trailType = riskData.profitTrailing;

        if (!trailType || trailType === 'No Trailing' || !deployment.entryPrice || liveLtp <= 0) return;

        let currentPnl = deployment.tradeAction === 'BUY' 
            ? (liveLtp - deployment.entryPrice) * deployment.tradedQty 
            : (deployment.entryPrice - liveLtp) * deployment.tradedQty;

        let newTrailingSL = deployment.trailingSL || 0;
        let isModified = false;
        let logMessage = ""; // 🔥 NAYA VARIABLE MESSAGE STORE KARNE KE LIYE

        // --- 1. LOCK FIX PROFIT LOGIC ---
        if (trailType === 'Lock Fix Profit' || trailType === 'Lock and Trail') {
            const lockAt = parseFloat(riskData.lockAt) || 0;
            const lockProfit = parseFloat(riskData.lockProfit) || 0;

            if (currentPnl >= lockAt && (!deployment.isProfitLocked)) {
                newTrailingSL = deployment.tradeAction === 'BUY'
                    ? deployment.entryPrice + (lockProfit / deployment.tradedQty)
                    : deployment.entryPrice - (lockProfit / deployment.tradedQty);
                
                deployment.isProfitLocked = true;
                isModified = true;
                
                // 🔥 MESSAGE SET KIYA
                logMessage = `🔒 Profit Locked! PnL crossed ₹${lockAt}. SL moved to ₹${newTrailingSL.toFixed(2)}`;
                console.log(logMessage);
            }
        }

        // --- 2. TRAIL PROFIT LOGIC ---
        if (trailType === 'Trail Profit' || trailType === 'Lock and Trail') {
            const trailEvery = parseFloat(riskData.trailEvery) || 0;
            const trailBy = parseFloat(riskData.trailBy) || 0;

            if (trailEvery > 0 && trailBy > 0) {
                const currentProfitSteps = Math.floor(currentPnl / trailEvery);
                const lastProfitSteps = deployment.lastProfitSteps || 0;

                if (currentProfitSteps > lastProfitSteps) {
                    const moveSteps = currentProfitSteps - lastProfitSteps;
                    const moveAmount = moveSteps * trailBy;
                    const movePrice = moveAmount / deployment.tradedQty;
                    const baseSL = newTrailingSL || deployment.trailingSL || deployment.paperSlPrice;

                    newTrailingSL = deployment.tradeAction === 'BUY'
                        ? baseSL + movePrice
                        : baseSL - movePrice;

                    deployment.lastProfitSteps = currentProfitSteps;
                    isModified = true;
                    
                    // 🔥 MESSAGE UPDATE KIYA
                    logMessage = `🚀 SL Trailed! New Stop Loss moved to ₹${newTrailingSL.toFixed(2)}`;
                    console.log(logMessage);
                }
            }
        }

        // --- 3. SAVE & SYNC (THE FIX) ---
        if (isModified) {
            deployment.trailingSL = newTrailingSL;
            await deployment.save();
            
            // 🔥 YAHAN ACTUAL LOG FUNCTION CALL HOGA
            if (logMessage && broker) {
                await createAndEmitLog(
                    broker, 
                    deployment.tradedSymbol || "Unknown Symbol", 
                    deployment.tradeAction, 
                    deployment.tradedQty, 
                    'SUCCESS', 
                    logMessage
                );
            }
        }

    } catch (error) {
        console.error("❌ Trailing Module Error:", error.message);
    }
};