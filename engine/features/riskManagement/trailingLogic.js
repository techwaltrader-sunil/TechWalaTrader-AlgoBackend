// // File: src/engine/features/riskManagement/trailingLogic.js

// // 🔥 1. IMPORT LOGGER
// const { createAndEmitLog } = require('../../utils/logger.js');

// /**
//  * 📈 PROFIT TRAILING LOGIC (Lock, Trail, Lock & Trail)
//  */
// // 🔥 Yahan se 'export' hata diya gaya hai
// const processTrailingLogic = async (deployment, strategy, liveLtp, broker) => {
//     try {
//         const riskData = strategy.data?.riskManagement || {};
//         const trailType = riskData.profitTrailing;

//         if (!trailType || trailType === 'No Trailing' || !deployment.entryPrice || liveLtp <= 0) return;

//         let currentPnl = deployment.tradeAction === 'BUY' 
//             ? (liveLtp - deployment.entryPrice) * deployment.tradedQty 
//             : (deployment.entryPrice - liveLtp) * deployment.tradedQty;

//         let newTrailingSL = deployment.trailingSL || 0;
//         let isModified = false;
//         let logMessage = ""; // 🔥 NAYA VARIABLE MESSAGE STORE KARNE KE LIYE

//         // --- 1. LOCK FIX PROFIT LOGIC ---
//         if (trailType === 'Lock Fix Profit' || trailType === 'Lock and Trail') {
//             const lockAt = parseFloat(riskData.lockAt) || 0;
//             const lockProfit = parseFloat(riskData.lockProfit) || 0;

//             if (currentPnl >= lockAt && (!deployment.isProfitLocked)) {
//                 newTrailingSL = deployment.tradeAction === 'BUY'
//                     ? deployment.entryPrice + (lockProfit / deployment.tradedQty)
//                     : deployment.entryPrice - (lockProfit / deployment.tradedQty);
                
//                 deployment.isProfitLocked = true;
//                 isModified = true;
                
//                 // 🔥 MESSAGE SET KIYA
//                 logMessage = `🔒 Profit Locked! PnL crossed ₹${lockAt}. SL moved to ₹${newTrailingSL.toFixed(2)}`;
//                 console.log(logMessage);
//             }
//         }

//         // --- 2. TRAIL PROFIT LOGIC ---
//         if (trailType === 'Trail Profit' || trailType === 'Lock and Trail') {
//             const trailEvery = parseFloat(riskData.trailEvery) || 0;
//             const trailBy = parseFloat(riskData.trailBy) || 0;

//             if (trailEvery > 0 && trailBy > 0) {
//                 const currentProfitSteps = Math.floor(currentPnl / trailEvery);
//                 const lastProfitSteps = deployment.lastProfitSteps || 0;

//                 if (currentProfitSteps > lastProfitSteps) {
//                     const moveSteps = currentProfitSteps - lastProfitSteps;
//                     const moveAmount = moveSteps * trailBy;
//                     const movePrice = moveAmount / deployment.tradedQty;
//                     const baseSL = newTrailingSL || deployment.trailingSL || deployment.paperSlPrice;

//                     newTrailingSL = deployment.tradeAction === 'BUY'
//                         ? baseSL + movePrice
//                         : baseSL - movePrice;

//                     deployment.lastProfitSteps = currentProfitSteps;
//                     isModified = true;
                    
//                     // 🔥 MESSAGE UPDATE KIYA
//                     logMessage = `🚀 SL Trailed! New Stop Loss moved to ₹${newTrailingSL.toFixed(2)}`;
//                     console.log(logMessage);
//                 }
//             }
//         }

//         // --- 3. SAVE & SYNC (THE FIX) ---
//         if (isModified) {
//             deployment.trailingSL = newTrailingSL;
//             await deployment.save();
            
//             // 🔥 YAHAN ACTUAL LOG FUNCTION CALL HOGA
//             if (logMessage && broker) {
//                 await createAndEmitLog(
//                     broker, 
//                     deployment.tradedSymbol || "Unknown Symbol", 
//                     deployment.tradeAction, 
//                     deployment.tradedQty, 
//                     'SUCCESS', 
//                     logMessage
//                 );
//             }
//         }

//     } catch (error) {
//         console.error("❌ Trailing Module Error:", error.message);
//     }
// };

// // 🔥 Niche module.exports laga diya gaya hai
// module.exports = {
//     processTrailingLogic
// };









// // 🔥 1. IMPORT LOGGER
// const { createAndEmitLog } = require('../../utils/logger.js');

// /**
//  * ========================================================
//  * 🟢 LIVE & PAPER TRADING ENGINE
//  * ========================================================
//  */
// const processTrailingLogic = async (deployment, strategy, liveLtp, broker) => {
//     try {
//         const riskData = strategy.data?.riskManagement || strategy.riskManagement || {};
//         const trailType = riskData.profitTrailing;

//         if (!trailType || trailType === 'No Trailing' || !deployment.entryPrice || liveLtp <= 0) return;

//         let currentPnl = deployment.tradeAction === 'BUY' 
//             ? (liveLtp - deployment.entryPrice) * deployment.tradedQty 
//             : (deployment.entryPrice - liveLtp) * deployment.tradedQty;

//         let newTrailingSL = deployment.trailingSL || 0;
//         let isModified = false;
//         let logMessage = ""; 

//         // 🔥 THE FIX: Fallback variables (UI UI vs DB naming mismatch ko theek karna)
//         const lockAt = parseFloat(riskData.lockAt || riskData.lockTrigger) || 0;
//         const lockProfit = parseFloat(riskData.lockProfit || riskData.lockAmount) || 0;

//         // --- 1. LOCK FIX PROFIT LOGIC ---
//         if (trailType === 'Lock Fix Profit' || trailType === 'Lock and Trail') {
//             // 🔥 THE FIX 2: Strict > 0 check. Taaki 0 pe turant SL na lag jaye.
//             if (lockAt > 0 && currentPnl >= lockAt && (!deployment.isProfitLocked)) {
//                 newTrailingSL = deployment.tradeAction === 'BUY'
//                     ? deployment.entryPrice + (lockProfit / deployment.tradedQty)
//                     : deployment.entryPrice - (lockProfit / deployment.tradedQty);
                
//                 deployment.isProfitLocked = true;
//                 isModified = true;
//                 logMessage = `🔒 Profit Locked! PnL crossed ₹${lockAt}. SL moved to ₹${newTrailingSL.toFixed(2)}`;
//                 console.log(logMessage);
//             }
//         }

//         // --- 2. TRAIL PROFIT LOGIC ---
//         if (trailType === 'Trail Profit' || trailType === 'Lock and Trail') {
//             const trailEvery = parseFloat(riskData.trailEvery || riskData.trailTrigger) || 0;
//             const trailBy = parseFloat(riskData.trailBy || riskData.trailAmount) || 0;

//             if (trailEvery > 0 && trailBy > 0) {
//                 const currentProfitSteps = Math.floor(currentPnl / trailEvery);
//                 const lastProfitSteps = deployment.lastProfitSteps || 0;

//                 if (currentProfitSteps > lastProfitSteps) {
//                     const moveSteps = currentProfitSteps - lastProfitSteps;
//                     const moveAmount = moveSteps * trailBy;
//                     const movePrice = moveAmount / deployment.tradedQty;
//                     const baseSL = newTrailingSL || deployment.trailingSL || deployment.paperSlPrice;

//                     newTrailingSL = deployment.tradeAction === 'BUY'
//                         ? baseSL + movePrice
//                         : baseSL - movePrice;

//                     deployment.lastProfitSteps = currentProfitSteps;
//                     isModified = true;
//                     logMessage = `🚀 SL Trailed! New Stop Loss moved to ₹${newTrailingSL.toFixed(2)}`;
//                     console.log(logMessage);
//                 }
//             }
//         }

//         // --- 3. SAVE & SYNC ---
//         if (isModified) {
//             deployment.trailingSL = newTrailingSL;
//             await deployment.save();
            
//             if (logMessage && broker) {
//                 await createAndEmitLog(
//                     broker, deployment.tradedSymbol || "Unknown Symbol", deployment.tradeAction, deployment.tradedQty, 'SUCCESS', logMessage
//                 );
//             }
//         }
//     } catch (error) {
//         console.error("❌ Trailing Module Error:", error.message);
//     }
// };

// /**
//  * ========================================================
//  * 🔵 BACKTESTING ENGINE (Stateless Math Logic)
//  * ========================================================
//  */
// const evaluateTrailingSL = (currentTrade, currentPnl, riskData, tradeQuantity) => {
//     let result = { 
//         newTrailingSL: currentTrade.trailingSL || 0, 
//         isModified: false, 
//         logMessage: "" 
//     };
    
//     const trailType = riskData.profitTrailing;
//     if (!trailType || trailType === 'No Trailing') return result;

//     // 🔥 THE FIX: Fallback variables (UI UI vs DB naming mismatch ko theek karna)
//     const lockAt = parseFloat(riskData.lockAt || riskData.lockTrigger) || 0;
//     const lockProfit = parseFloat(riskData.lockProfit || riskData.lockAmount) || 0;

//     // --- 1. LOCK FIX PROFIT LOGIC ---
//     if (trailType === 'Lock Fix Profit' || trailType === 'Lock and Trail') {
//         if (lockAt > 0 && currentPnl >= lockAt && (!currentTrade.isProfitLocked)) {
//             result.newTrailingSL = currentTrade.transaction === 'BUY'
//                 ? currentTrade.entryPrice + (lockProfit / tradeQuantity)
//                 : currentTrade.entryPrice - (lockProfit / tradeQuantity);
            
//             currentTrade.isProfitLocked = true;
//             result.isModified = true;
//             result.logMessage = `🔒 [BACKTEST] Profit Locked! PnL crossed ₹${lockAt}. SL moved to ₹${result.newTrailingSL.toFixed(2)}`;
//         }
//     }

//     // --- 2. TRAIL PROFIT LOGIC ---
//     if (trailType === 'Trail Profit' || trailType === 'Lock and Trail') {
//         const trailEvery = parseFloat(riskData.trailEvery || riskData.trailTrigger) || 0;
//         const trailBy = parseFloat(riskData.trailBy || riskData.trailAmount) || 0;

//         if (trailEvery > 0 && trailBy > 0) {
//             const currentProfitSteps = Math.floor(currentPnl / trailEvery);
//             const lastProfitSteps = currentTrade.lastProfitSteps || 0;

//             if (currentProfitSteps > lastProfitSteps) {
//                 const moveSteps = currentProfitSteps - lastProfitSteps;
//                 const moveAmount = moveSteps * trailBy;
//                 const movePrice = moveAmount / tradeQuantity;
//                 const baseSL = result.newTrailingSL || currentTrade.trailingSL || currentTrade.slPrice || currentTrade.entryPrice;

//                 result.newTrailingSL = currentTrade.transaction === 'BUY'
//                     ? baseSL + movePrice
//                     : baseSL - movePrice;

//                 currentTrade.lastProfitSteps = currentProfitSteps;
//                 result.isModified = true;
//                 result.logMessage = `🚀 [BACKTEST] SL Trailed! New Stop Loss moved to ₹${result.newTrailingSL.toFixed(2)}`;
//             }
//         }
//     }

//     return result;
// };

// module.exports = {
//     processTrailingLogic,
//     evaluateTrailingSL
// };



// 🔥 1. IMPORT LOGGER
const { createAndEmitLog } = require('../../utils/logger.js');

/**
 * ========================================================
 * 🟢 LIVE & PAPER TRADING ENGINE (आपका सुरक्षित पुराना कोड)
 * ========================================================
 */
const processTrailingLogic = async (deployment, strategy, liveLtp, broker) => {
    try {
        const riskData = strategy.data?.riskManagement || strategy.riskManagement || {};
        const trailType = riskData.profitTrailing;

        if (!trailType || trailType === 'No Trailing' || !deployment.entryPrice || liveLtp <= 0) return;

        let currentPnl = deployment.tradeAction === 'BUY' 
            ? (liveLtp - deployment.entryPrice) * deployment.tradedQty 
            : (deployment.entryPrice - liveLtp) * deployment.tradedQty;

        let newTrailingSL = deployment.trailingSL || 0;
        let isModified = false;
        let logMessage = ""; 

        // 🔥 THE FIX: Fallback variables (UI UI vs DB naming mismatch ko theek karna)
        const lockAt = parseFloat(riskData.lockAt || riskData.lockTrigger) || 0;
        const lockProfit = parseFloat(riskData.lockProfit || riskData.lockAmount) || 0;

        // --- 1. LOCK FIX PROFIT LOGIC ---
        if (trailType === 'Lock Fix Profit' || trailType === 'Lock and Trail') {
            // 🔥 THE FIX 2: Strict > 0 check. Taaki 0 pe turant SL na lag jaye.
            if (lockAt > 0 && currentPnl >= lockAt && (!deployment.isProfitLocked)) {
                newTrailingSL = deployment.tradeAction === 'BUY'
                    ? deployment.entryPrice + (lockProfit / deployment.tradedQty)
                    : deployment.entryPrice - (lockProfit / deployment.tradedQty);
                
                deployment.isProfitLocked = true;
                isModified = true;
                logMessage = `🔒 Profit Locked! PnL crossed ₹${lockAt}. SL moved to ₹${newTrailingSL.toFixed(2)}`;
                console.log(logMessage);
            }
        }

        // --- 2. TRAIL PROFIT LOGIC ---
        if (trailType === 'Trail Profit' || trailType === 'Lock and Trail') {
            const trailEvery = parseFloat(riskData.trailEvery || riskData.trailTrigger) || 0;
            const trailBy = parseFloat(riskData.trailBy || riskData.trailAmount) || 0;

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
                    logMessage = `🚀 SL Trailed! New Stop Loss moved to ₹${newTrailingSL.toFixed(2)}`;
                    console.log(logMessage);
                }
            }
        }

        // --- 3. SAVE & SYNC ---
        if (isModified) {
            deployment.trailingSL = newTrailingSL;
            await deployment.save();
            
            if (logMessage && broker) {
                await createAndEmitLog(
                    broker, deployment.tradedSymbol || "Unknown Symbol", deployment.tradeAction, deployment.tradedQty, 'SUCCESS', logMessage
                );
            }
        }
    } catch (error) {
        console.error("❌ Trailing Module Error:", error.message);
    }
};

/**
 * ========================================================
 * 🔵 BACKTESTING ENGINE (हमारा नया 100% बुलेटप्रूफ कोड)
 * ========================================================
 */
const evaluateTrailingSL = (trade, openPnL, riskSettings, quantity) => {
    let result = { isModified: false, newTrailingSL: null, exitReason: null };

    // If trade doesn't exist, is already marked for exit, or there are no risk settings, return early.
    if (!trade || trade.markedForExit || !riskSettings) return result;

    // 🔥 STRICT CHECK: We only trail if the trade is currently in PROFIT.
    if (openPnL <= 0) return result;

    // Convert total PnL logic to points for easier math
    const currentProfitPoints = openPnL / quantity;
    const isBuy = trade.transaction === "BUY";

    // Initialize tracking variables on the trade object if they don't exist
    if (trade.maxProfitPointsReached === undefined) trade.maxProfitPointsReached = 0;
    if (trade.currentTrailingSL === undefined) trade.currentTrailingSL = null;
    if (trade.isProfitLocked === undefined) trade.isProfitLocked = false;

    // Update the highest profit points reached so far
    if (currentProfitPoints > trade.maxProfitPointsReached) {
        trade.maxProfitPointsReached = currentProfitPoints;
    }

    const lockAmt = Number(riskSettings.lockProfit || riskSettings.lockAmount) || 0;
    const reachAmt = Number(riskSettings.lockAt || riskSettings.lockTrigger) || 0;
    const trailType = riskSettings.profitTrailing;

    if (!trailType || trailType === 'No Trailing') return result;

    // =========================================================================
    // 1. LOCK FIX PROFIT (The "Tijori" Logic)
    // =========================================================================
    if (trailType === 'Lock Fix Profit' || trailType === 'Lock and Trail') {
        if (reachAmt > 0 && lockAmt > 0 && !trade.isProfitLocked) {
            const reachPoints = reachAmt / quantity;
            const lockPoints = lockAmt / quantity;

            // If we hit the trigger (reachAmt)
            if (trade.maxProfitPointsReached >= reachPoints) {
                // Calculate the exact price where the profit is "locked"
                const lockedPrice = isBuy 
                    ? trade.entryPrice + lockPoints 
                    : trade.entryPrice - lockPoints;

                trade.currentTrailingSL = lockedPrice;
                trade.isProfitLocked = true; // Mark as locked so we don't recalculate
                
                result.isModified = true;
                result.newTrailingSL = lockedPrice;
                result.exitReason = "TRAILING_SL"; 
                
                return result; 
            }
        }
    }

    // =========================================================================
    // 2. TRAIL PROFIT (The "Caterpillar" Logic)
    // =========================================================================
    if (trailType === 'Trail Profit' || trailType === 'Lock and Trail') {
        const trailReachAmt = Number(riskSettings.trailEvery || riskSettings.trailTrigger) || 0;
        const trailJumpAmt = Number(riskSettings.trailBy || riskSettings.trailAmount) || 0;

        // If profit is locked (via Lock and Trail), we only trail if it goes HIGHER than the lock
        if (trailReachAmt > 0 && trailJumpAmt > 0) {
            const trailReachPoints = trailReachAmt / quantity;
            const trailJumpPoints = trailJumpAmt / quantity;

            const jumpsMade = Math.floor(trade.maxProfitPointsReached / trailReachPoints);

            if (jumpsMade > 0) {
                const totalTrailingPoints = jumpsMade * trailJumpPoints;
                
                const calculatedTrailPrice = isBuy
                    ? trade.entryPrice + totalTrailingPoints
                    : trade.entryPrice - totalTrailingPoints;

                let shouldUpdateTrail = false;
                if (trade.currentTrailingSL === null) {
                    shouldUpdateTrail = true;
                } else {
                    // Always move SL forward, never backward
                    shouldUpdateTrail = isBuy 
                        ? calculatedTrailPrice > trade.currentTrailingSL 
                        : calculatedTrailPrice < trade.currentTrailingSL;
                }

                if (shouldUpdateTrail) {
                    trade.currentTrailingSL = calculatedTrailPrice;
                    result.isModified = true;
                    result.newTrailingSL = calculatedTrailPrice;
                    result.exitReason = "TRAILING_SL";
                    return result;
                }
            }
        }
    }

    return result;
};

module.exports = {
    processTrailingLogic,
    evaluateTrailingSL
};