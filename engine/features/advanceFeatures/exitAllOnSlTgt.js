// File: src/engine/features/advanceFeatures/exitAllOnSlTgt.js

const Deployment = require('../../../models/Deployment.js');
const { placeDhanOrder } = require('../../../services/dhanService.js');
const { createAndEmitLog } = require('../../utils/logger.js');

/**
 * 🚨 ADVANCE FEATURE 2: EXIT ALL ON SL/TARGET
 * Ye function tab call hoga jab kisi leg ka Target ya Stop-Loss hit ho jaye.
 * Ye turant baaki sabhi active legs ko market price par square-off kar dega.
 */
const handleExitAllOnSlTgt = async (strategy, triggeredDeployment, broker, triggerReason) => {
    try {
        // 1. Check karein ki user ne strategy me ye feature ON kiya hai ya nahi
        const advanceData = strategy.data?.advanceFeatures || {};
        const isExitAllEnabled = advanceData.exitAllOnSlTgt === true || advanceData.exitAllOnSlTgt === 'ON';

        if (!isExitAllEnabled) return; // Agar feature OFF hai to wapas jao

        console.log(`🚨 [ADVANCE FEATURE] Exit All triggered by ${triggerReason} in ${triggeredDeployment.tradedSymbol}`);

        // 2. Database se same strategy ke baaki ACTIVE legs nikalein
        const otherActiveLegs = await Deployment.find({
            strategyId: triggeredDeployment.strategyId,
            brokerId: triggeredDeployment.brokerId,
            status: 'ACTIVE',
            _id: { $ne: triggeredDeployment._id } // Jisne trigger kiya, usko chhod kar
        });

        if (otherActiveLegs.length === 0) {
            console.log("ℹ️ Koi aur active leg nahi bacha hai 'Exit All' ke liye.");
            return;
        }

        // 3. Loop through baaki legs aur turant square-off marein
        for (let leg of otherActiveLegs) {
            const exitAction = leg.tradeAction === 'BUY' ? 'SELL' : 'BUY';
            let isExitSuccessful = false;
            let exitRemarks = `Square-Off due to Exit-All (${triggerReason})`;
            let orderIdToSave = "N/A";

            // 🟢 PAPER TRADE EXIT
            if (leg.executionType === 'FORWARD_TEST' || leg.executionType === 'PAPER') {
                isExitSuccessful = true;
            } 
            // 🔴 LIVE TRADE EXIT (Direct Market Order to Dhan)
            else if (leg.executionType === 'LIVE') {
                const orderData = { 
                    action: exitAction, 
                    quantity: leg.tradedQty, 
                    securityId: leg.tradedSecurityId, 
                    segment: leg.tradedExchange 
                    // Market order hai, isliye price dene ki zarurat nahi
                };
                
                const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                
                if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
                    isExitSuccessful = true;
                    orderIdToSave = orderResponse.data.orderId;
                } else {
                    exitRemarks = orderResponse.data?.remarks || orderResponse.error?.errorMessage || "API Order Rejected";
                }
            }

            // 4. Update Database & Send Log
            if (isExitSuccessful) {
                leg.status = 'COMPLETED';
                leg.exitRemarks = exitRemarks;
                // Note: Final exitPrice aur PnL orderbook sync webhook se update ho jayega
                await leg.save();

                await createAndEmitLog(
                    broker, 
                    leg.tradedSymbol, 
                    exitAction, 
                    leg.tradedQty, 
                    'SUCCESS', 
                    `🚨 EXIT ALL: ${leg.tradedSymbol} squared off because another leg hit ${triggerReason}.`, 
                    orderIdToSave
                );
            } else {
                await createAndEmitLog(
                    broker, 
                    leg.tradedSymbol, 
                    exitAction, 
                    leg.tradedQty, 
                    'FAILED', 
                    `⚠️ EXIT ALL FAILED for ${leg.tradedSymbol}: ${exitRemarks}`, 
                    orderIdToSave
                );
            }
        }

    } catch (error) {
        console.error("❌ Exit All On SL/Tgt Error:", error.message);
    }
};

module.exports = {
    handleExitAllOnSlTgt
};