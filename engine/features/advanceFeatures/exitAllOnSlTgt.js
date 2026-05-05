// // File: src/engine/features/advanceFeatures/exitAllOnSlTgt.js

// const Deployment = require('../../../models/Deployment.js');
// const { placeDhanOrder } = require('../../../services/dhanService.js');
// const { createAndEmitLog } = require('../../utils/logger.js');

// /**
//  * 🚨 ADVANCE FEATURE 2: EXIT ALL ON SL/TARGET
//  * Ye function tab call hoga jab kisi leg ka Target ya Stop-Loss hit ho jaye.
//  * Ye turant baaki sabhi active legs ko market price par square-off kar dega.
//  */
// const handleExitAllOnSlTgt = async (strategy, triggeredDeployment, broker, triggerReason) => {
//     try {
//         // 1. Check karein ki user ne strategy me ye feature ON kiya hai ya nahi
//         const advanceData = strategy.data?.advanceFeatures || {};
//         const isExitAllEnabled = advanceData.exitAllOnSlTgt === true || advanceData.exitAllOnSlTgt === 'ON';

//         if (!isExitAllEnabled) return; // Agar feature OFF hai to wapas jao

//         console.log(`🚨 [ADVANCE FEATURE] Exit All triggered by ${triggerReason} in ${triggeredDeployment.tradedSymbol}`);

//         // 2. Database se same strategy ke baaki ACTIVE legs nikalein
//         const otherActiveLegs = await Deployment.find({
//             strategyId: triggeredDeployment.strategyId,
//             brokerId: triggeredDeployment.brokerId,
//             status: 'ACTIVE',
//             _id: { $ne: triggeredDeployment._id } // Jisne trigger kiya, usko chhod kar
//         });

//         if (otherActiveLegs.length === 0) {
//             console.log("ℹ️ Koi aur active leg nahi bacha hai 'Exit All' ke liye.");
//             return;
//         }

//         // 3. Loop through baaki legs aur turant square-off marein
//         for (let leg of otherActiveLegs) {
//             const exitAction = leg.tradeAction === 'BUY' ? 'SELL' : 'BUY';
//             let isExitSuccessful = false;
//             let exitRemarks = `Square-Off due to Exit-All (${triggerReason})`;
//             let orderIdToSave = "N/A";

//             // 🟢 PAPER TRADE EXIT
//             if (leg.executionType === 'FORWARD_TEST' || leg.executionType === 'PAPER') {
//                 isExitSuccessful = true;
//             } 
//             // 🔴 LIVE TRADE EXIT (Direct Market Order to Dhan)
//             else if (leg.executionType === 'LIVE') {
//                 const orderData = { 
//                     action: exitAction, 
//                     quantity: leg.tradedQty, 
//                     securityId: leg.tradedSecurityId, 
//                     segment: leg.tradedExchange 
//                     // Market order hai, isliye price dene ki zarurat nahi
//                 };
                
//                 const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                
//                 if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
//                     isExitSuccessful = true;
//                     orderIdToSave = orderResponse.data.orderId;
//                 } else {
//                     exitRemarks = orderResponse.data?.remarks || orderResponse.error?.errorMessage || "API Order Rejected";
//                 }
//             }

//             // 4. Update Database & Send Log
//             if (isExitSuccessful) {
//                 leg.status = 'COMPLETED';
//                 leg.exitRemarks = exitRemarks;
//                 // Note: Final exitPrice aur PnL orderbook sync webhook se update ho jayega
//                 await leg.save();

//                 await createAndEmitLog(
//                     broker, 
//                     leg.tradedSymbol, 
//                     exitAction, 
//                     leg.tradedQty, 
//                     'SUCCESS', 
//                     `🚨 EXIT ALL: ${leg.tradedSymbol} squared off because another leg hit ${triggerReason}.`, 
//                     orderIdToSave
//                 );
//             } else {
//                 await createAndEmitLog(
//                     broker, 
//                     leg.tradedSymbol, 
//                     exitAction, 
//                     leg.tradedQty, 
//                     'FAILED', 
//                     `⚠️ EXIT ALL FAILED for ${leg.tradedSymbol}: ${exitRemarks}`, 
//                     orderIdToSave
//                 );
//             }
//         }

//     } catch (error) {
//         console.error("❌ Exit All On SL/Tgt Error:", error.message);
//     }
// };

// module.exports = {
//     handleExitAllOnSlTgt
// };




const Deployment = require('../../../models/Deployment.js');
const { placeDhanOrder } = require('../../../services/dhanService.js');
const { createAndEmitLog } = require('../../utils/logger.js');

/**
 * ========================================================
 * 🟢 LIVE & PAPER TRADING ENGINE (Your Original Code)
 * ========================================================
 * 🚨 ADVANCE FEATURE 2: EXIT ALL ON SL/TARGET
 */
const handleExitAllOnSlTgt = async (strategy, triggeredDeployment, broker, triggerReason) => {
    try {
        const advanceData = strategy.data?.advanceFeatures || strategy.advanceFeatures || {};
        const isExitAllEnabled = advanceData.exitAllOnSlTgt === true || advanceData.exitAllOnSlTgt === 'ON';

        if (!isExitAllEnabled) return; 

        console.log(`🚨 [ADVANCE FEATURE] Exit All triggered by ${triggerReason} in ${triggeredDeployment.tradedSymbol}`);

        const otherActiveLegs = await Deployment.find({
            strategyId: triggeredDeployment.strategyId,
            brokerId: triggeredDeployment.brokerId,
            status: 'ACTIVE',
            _id: { $ne: triggeredDeployment._id } 
        });

        if (otherActiveLegs.length === 0) {
            console.log("ℹ️ Koi aur active leg nahi bacha hai 'Exit All' ke liye.");
            return;
        }

        for (let leg of otherActiveLegs) {
            const exitAction = leg.tradeAction === 'BUY' ? 'SELL' : 'BUY';
            let isExitSuccessful = false;
            let exitRemarks = `Square-Off due to Exit-All (${triggerReason})`;
            let orderIdToSave = "N/A";

            if (leg.executionType === 'FORWARD_TEST' || leg.executionType === 'PAPER') {
                isExitSuccessful = true;
            } 
            else if (leg.executionType === 'LIVE') {
                const orderData = { 
                    action: exitAction, 
                    quantity: leg.tradedQty, 
                    securityId: leg.tradedSecurityId, 
                    segment: leg.tradedExchange 
                };
                
                const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                
                if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
                    isExitSuccessful = true;
                    orderIdToSave = orderResponse.data.orderId;
                } else {
                    exitRemarks = orderResponse.data?.remarks || orderResponse.error?.errorMessage || "API Order Rejected";
                }
            }

            if (isExitSuccessful) {
                leg.status = 'COMPLETED';
                leg.exitRemarks = exitRemarks;
                await leg.save();

                await createAndEmitLog(
                    broker, leg.tradedSymbol, exitAction, leg.tradedQty, 'SUCCESS', 
                    `🚨 EXIT ALL: ${leg.tradedSymbol} squared off because another leg hit ${triggerReason}.`, 
                    orderIdToSave
                );
            } else {
                await createAndEmitLog(
                    broker, leg.tradedSymbol, exitAction, leg.tradedQty, 'FAILED', 
                    `⚠️ EXIT ALL FAILED for ${leg.tradedSymbol}: ${exitRemarks}`, 
                    orderIdToSave
                );
            }
        }

    } catch (error) {
        console.error("❌ Exit All On SL/Tgt Error:", error.message);
    }
};

/**
 * ========================================================
 * 🔵 BACKTESTING ENGINE (Stateless Math Logic)
 * ========================================================
 */
const evaluateExitAllLogic = (advanceData, hitReason) => {
    // 🔥 FIX: Frontend se aane wale exact naam (exitAllOnSLTgt) ko match kar diya!
    const isExitAllEnabled = advanceData?.exitAllOnSLTgt === true || advanceData?.exitAllOnSlTgt === true || advanceData?.exitAllOnSLTgt === 'ON';
    
    // Agar feature band hai, ya koi exit reason hi nahi hai, to false return karo
    if (!isExitAllEnabled || !hitReason) return { shouldExitAll: false };

    // 🔥 THE FIX: Saare trailing aur profit lock events ko bhi pehchanega
    const validTriggers = [
        'STOPLOSS', 
        'TARGET', 
        'TRAILING_SL', 
        'SL_MOVED_TO_COST', 
        'LOCK_FIX_PROFIT', 
        'LOCK_AND_TRAIL'
    ];

    if (validTriggers.includes(hitReason)) {
        return {
            shouldExitAll: true,
            exitReason: `EXIT_ALL_TRIGGERED_BY_${hitReason}`
        };
    }

    return { shouldExitAll: false };
};
// 🔥 Exporting both
module.exports = {
    handleExitAllOnSlTgt,
    evaluateExitAllLogic
};