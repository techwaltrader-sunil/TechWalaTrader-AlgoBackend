// // File: src/engine/features/riskManagement/mtmSquareOff.js

// 📌 IMPORTS
const Broker = require('../../../models/Broker.js'); 
const { fetchLiveLTP, placeDhanOrder } = require('../../../services/dhanService.js'); 
const { createAndEmitLog } = require('../../utils/logger.js');

/**
 * ========================================================
 * 🟢 LIVE & PAPER TRADING ENGINE
 * ========================================================
 * 💰 THE NEW MULTI-LEG MTM (MAX PROFIT / MAX LOSS) SQUARE-OFF
 */
const handleMtmSquareOff = async (deployment, strategy, executionLocks, exitLockKey) => {
    try {
        const riskData = strategy.data?.riskManagement || {};
        const maxProfit = parseFloat(riskData.maxProfit) || 0;
        const maxLoss = parseFloat(riskData.maxLoss) || 0;

        // 1. SAFETY CHECK: Agar limits set nahi hain, ya pehle se lock laga hai, to wapas jao
        if (executionLocks.has(exitLockKey) || (maxProfit === 0 && maxLoss === 0)) {
            return;
        }

        // 2. CHECK ACTIVE LEGS (Ab hum executedLegs array check karenge)
        const activeLegs = deployment.executedLegs ? deployment.executedLegs.filter(leg => leg.status === 'ACTIVE') : [];
        if (activeLegs.length === 0) return;

        const brokerId = deployment.brokers[0];
        const broker = await Broker.findById(brokerId);
        if (!broker || !broker.engineOn) return;

        let totalLivePnl = 0;
        let legPnlMap = new Map(); // LTP bar-bar fetch na karna pade isliye save karenge

        // 3. FETCH LIVE PRICES & CALCULATE TOTAL RUNNING PNL
        for (let leg of activeLegs) {
            const liveLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, leg.exchange, leg.securityId);
            
            if (liveLtp && liveLtp > 0) {
                const legPnl = leg.action === 'BUY' 
                    ? (liveLtp - leg.entryPrice) * leg.quantity 
                    : (leg.entryPrice - liveLtp) * leg.quantity;
                
                totalLivePnl += legPnl;
                legPnlMap.set(leg._id ? leg._id.toString() : leg.securityId, { ltp: liveLtp, pnl: legPnl });
            }
        }

        // Grand Total PnL = Purana Booked PnL + Aaj ka Running PnL
        const grandTotalPnl = (deployment.realizedPnl || 0) + totalLivePnl;

        // 4. CHECK TARGET OR STOP-LOSS
        let squareOffReason = null;
        if (maxProfit > 0 && grandTotalPnl >= maxProfit) {
            squareOffReason = `Target Reached (Max Profit: ₹${maxProfit})`;
        } else if (maxLoss > 0 && grandTotalPnl <= -Math.abs(maxLoss)) {
            squareOffReason = `Stop-Loss Hit (Max Loss: ₹${Math.abs(maxLoss)})`;
        }

        // 5. IF CONDITION MET -> EXECUTE SQUARE-OFF FOR ALL LEGS
        if (squareOffReason) {
            executionLocks.add(exitLockKey);
            console.log(`🚨 MTM SQUARE-OFF TRIGGERED! Total PnL: ₹${grandTotalPnl.toFixed(2)} | Reason: ${squareOffReason}`);

            let allSuccess = true;

            for (let i = 0; i < deployment.executedLegs.length; i++) {
                let leg = deployment.executedLegs[i];
                if (leg.status !== 'ACTIVE') continue;

                const exitAction = leg.action === 'BUY' ? 'SELL' : 'BUY';
                
                // Fetch saved LTP
                const legData = legPnlMap.get(leg._id ? leg._id.toString() : leg.securityId);
                const liveLtp = legData ? legData.ltp : leg.entryPrice; 
                const legPnl = legData ? legData.pnl : 0;

                let isExitSuccessful = false;
                let exitRemarks = squareOffReason;
                let orderIdToSave = "N/A";

                // 🟢 PAPER TRADE MTM EXIT
                if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
                    isExitSuccessful = true;
                } 
                // 🔴 LIVE TRADE MTM EXIT
                else if (deployment.executionType === 'LIVE') {
                    const orderData = { 
                        action: exitAction, 
                        quantity: leg.quantity, 
                        securityId: leg.securityId, 
                        segment: leg.exchange 
                    };
                    const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                    
                    if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
                        isExitSuccessful = true;
                        orderIdToSave = orderResponse.data.orderId;
                    } else {
                        exitRemarks = orderResponse.data?.remarks || orderResponse.error?.errorMessage || "RMS Rejected";
                        allSuccess = false; // Koi ek leg fail ho gaya
                    }
                }

                // 🧮 6. SAVE INDIVIDUAL LEG PNL
                if (isExitSuccessful) {
                    leg.exitPrice = liveLtp;
                    leg.livePnl = legPnl;
                    leg.status = 'COMPLETED';
                    leg.exitReason = "MTM Square-Off";

                    deployment.pnl = (deployment.pnl || 0) + legPnl;
                    deployment.realizedPnl = (deployment.realizedPnl || 0) + legPnl;

                    await createAndEmitLog(broker, leg.symbol, exitAction, leg.quantity, 'SUCCESS', `${exitRemarks} (Leg P&L: ₹${legPnl.toFixed(2)})`, orderIdToSave);
                } else {
                    await createAndEmitLog(broker, leg.symbol, exitAction, leg.quantity, 'FAILED', `MTM Exit Failed: ${exitRemarks}`, orderIdToSave);
                }
            }

            // 7. DEPLOYMENT STATUS UPDATE
            const stillActive = deployment.executedLegs.some(l => l.status === 'ACTIVE');
            if (!stillActive) {
                deployment.status = 'COMPLETED';
                deployment.exitRemarks = squareOffReason;
            }

            await deployment.save();

            // Agar API ki wajah se koi leg fail hua ho, to lock hata do taki next 30 sec me wapas try kare!
            if (!allSuccess) {
                executionLocks.delete(exitLockKey); 
            }
        }

    } catch (error) {
        console.error("❌ MTM Module Error:", error.message);
    }
};

/**
 * ========================================================
 * 🔵 BACKTESTING ENGINE (Stateless Math Logic)
 * ========================================================
 */
const evaluateMtmLogic = (realizedDailyPnL, openTradePnL, riskData) => {
    let result = { isHalted: false, exitReason: null, logMessage: "" };

    const globalMaxProfit = Number(riskData.maxProfit) || 0;
    const globalMaxLoss = Number(riskData.maxLoss) || 0;

    if (globalMaxProfit === 0 && globalMaxLoss === 0) return result;

    const runningDailyPnL = realizedDailyPnL + (openTradePnL || 0);

    if (globalMaxProfit > 0 && runningDailyPnL >= globalMaxProfit) {
        result.isHalted = true;
        result.exitReason = "MAX_PROFIT";
        result.logMessage = `🎯 [MTM LIMIT] Global Max Profit Hit! Total PnL: ₹${runningDailyPnL.toFixed(2)} (Limit: ₹${globalMaxProfit})`;
    }
    else if (globalMaxLoss > 0 && runningDailyPnL <= -globalMaxLoss) {
        result.isHalted = true;
        result.exitReason = "MAX_LOSS";
        result.logMessage = `🛑 [MTM LIMIT] Global Max Loss Hit! Total PnL: ₹${runningDailyPnL.toFixed(2)} (Limit: -₹${globalMaxLoss})`;
    }

    return result;
};

module.exports = {
    handleMtmSquareOff,
    evaluateMtmLogic
};