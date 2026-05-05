// File: src/engine/features/advanceFeatures/prePunchSl.js

// const { placeDhanOrder } = require('../../../services/dhanService.js');
// const { createAndEmitLog } = require('../../utils/logger.js');

// /**
//  * 🛡️ ADVANCE FEATURE 3: PRE-PUNCH SL
//  * Entry aate hi turant Broker ke terminal par Pending SL order laga dena.
//  */
// const handlePrePunchSl = async (deployment, broker, leg, entryPrice) => {
//     try {
//         if (!entryPrice || entryPrice <= 0 || !leg.slValue || leg.slValue <= 0) return;

//         // Buy kiya hai to SL Sell ka lagega, Sell kiya hai to SL Buy ka lagega
//         const exitAction = deployment.tradeAction === 'BUY' ? 'SELL' : 'BUY';
        
//         // 1. Calculate Exact SL Price
//         let slPrice = 0;
//         if (deployment.tradeAction === 'BUY') {
//             slPrice = leg.slType === 'SL%' 
//                 ? entryPrice - (entryPrice * (Number(leg.slValue) / 100)) 
//                 : entryPrice - Number(leg.slValue);
//         } else {
//             slPrice = leg.slType === 'SL%' 
//                 ? entryPrice + (entryPrice * (Number(leg.slValue) / 100)) 
//                 : entryPrice + Number(leg.slValue);
//         }

//         // 2. NSE/NFO ke tick size (0.05) ke hisab se round off karna zaroori hai, warna broker reject kar dega
//         slPrice = Math.round(slPrice * 20) / 20;

//         console.log(`🛡️ Pre-Punching SL on Exchange for ${deployment.tradedSymbol} at ₹${slPrice}`);

//         // 3. Prepare Dhan Order Data for Stop Loss
//         const orderData = {
//             action: exitAction,
//             quantity: deployment.tradedQty,
//             securityId: deployment.tradedSecurityId,
//             segment: deployment.tradedExchange,
//             orderType: "STOP_LOSS_MARKET", // Trigger hit hote hi market order lag jayega
//             triggerPrice: slPrice
//         };

//         // 4. Send Order to Dhan
//         const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

//         // 5. Update Database & Logs
//         if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
//             deployment.prePunchOrderId = orderResponse.data.orderId;
//             deployment.isSlPrePunched = true;
//             await deployment.save();
            
//             await createAndEmitLog(
//                 broker, 
//                 deployment.tradedSymbol, 
//                 exitAction, 
//                 deployment.tradedQty, 
//                 'SUCCESS', 
//                 `🛡️ System Safe: Pre-Punch SL placed at ₹${slPrice}`, 
//                 orderResponse.data.orderId
//             );
//         } else {
//             await createAndEmitLog(
//                 broker, 
//                 deployment.tradedSymbol, 
//                 exitAction, 
//                 deployment.tradedQty, 
//                 'FAILED', 
//                 `⚠️ Pre-Punch SL Rejected by Broker: ${orderResponse.data?.remarks || "Margin/API Issue"}`
//             );
//         }

//     } catch (error) {
//         console.error("❌ Pre Punch SL Module Error:", error.message);
//     }
// };

// module.exports = {
//     handlePrePunchSl
// };


const { placeDhanOrder, cancelDhanOrder } = require('../../../services/dhanService.js');
const { createAndEmitLog } = require('../../utils/logger.js');

/**
 * ============================================================================
 * 🛡️ ADVANCE FEATURE: PRE-PUNCH SL (SHIELD 1 - DISASTER MANAGEMENT)
 * ============================================================================
 * Entry aate hi turant Broker ke terminal par Pending SL order laga dena.
 */
const handlePrePunchSl = async (deployment, broker, leg, entryPrice) => {
    try {
        // Agar feature OFF hai ya SL value 0 hai, to wapas jao
        const advanceData = deployment.strategyId?.advanceFeatures || {}; // Strategy model se
        const isPrePunchEnabled = advanceData.prePunchSl === true || advanceData.prePunchSl === 'ON';
        
        if (!isPrePunchEnabled || !entryPrice || entryPrice <= 0 || !leg.slValue || leg.slValue <= 0) return;

        // Buy kiya hai to SL Sell ka lagega, Sell kiya hai to SL Buy ka lagega
        const exitAction = deployment.tradeAction === 'BUY' ? 'SELL' : 'BUY';
        
        // 1. Calculate Exact SL Price
        let slPrice = 0;
        if (deployment.tradeAction === 'BUY') {
            slPrice = leg.slType === 'SL%' 
                ? entryPrice - (entryPrice * (Number(leg.slValue) / 100)) 
                : entryPrice - Number(leg.slValue);
        } else {
            slPrice = leg.slType === 'SL%' 
                ? entryPrice + (entryPrice * (Number(leg.slValue) / 100)) 
                : entryPrice + Number(leg.slValue);
        }

        // 2. NSE/NFO ke tick size (0.05) ke hisab se round off karna zaroori hai
        slPrice = Math.round(slPrice * 20) / 20;

        console.log(`🛡️ Pre-Punching STATIC SL on Exchange for ${deployment.tradedSymbol} at ₹${slPrice}`);

        // 3. Prepare Dhan Order Data for Stop Loss
        const orderData = {
            action: exitAction,
            quantity: deployment.tradedQty,
            securityId: deployment.tradedSecurityId,
            segment: deployment.tradedExchange,
            orderType: "STOP_LOSS_MARKET", // Dhan API format for SL-M
            triggerPrice: slPrice
        };

        // 4. Send Order to Dhan
        const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

        // 5. Update Database & Logs
        if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
            deployment.prePunchOrderId = orderResponse.data.orderId;
            deployment.isSlPrePunched = true;
            deployment.prePunchSlPrice = slPrice; // Future reference ke liye save kar rahe hain
            await deployment.save();
            
            await createAndEmitLog(
                broker, 
                deployment.tradedSymbol, 
                exitAction, 
                deployment.tradedQty, 
                'SUCCESS', 
                `🛡️ Dual Shield Active: Static Pre-Punch SL placed on broker at ₹${slPrice}`, 
                orderResponse.data.orderId
            );
        } else {
            await createAndEmitLog(
                broker, 
                deployment.tradedSymbol, 
                exitAction, 
                deployment.tradedQty, 
                'FAILED', 
                `⚠️ Pre-Punch SL Rejected by Broker: ${orderResponse.data?.remarks || "Margin/API Issue"}`
            );
        }

    } catch (error) {
        console.error("❌ Pre Punch SL Module Error:", error.message);
    }
};

/**
 * ============================================================================
 * 🧹 NAKED ORDER CLEANUP (SHIELD 2 HANDOVER)
 * ============================================================================
 * Agar Local Engine (Gatekeeper) ne trade kaat diya (Target, Trailing SL etc.), 
 * toh pending SL order ko Dhan se Delete/Cancel karna zaroori hai.
 */
const cancelPrePunchedSl = async (deployment, broker, exitReason) => {
    try {
        // Agar Pre-punch nahi laga tha, ya order ID nahi hai, to kuch mat karo
        if (!deployment.isSlPrePunched || !deployment.prePunchOrderId || deployment.prePunchOrderId === 'N/A') {
            return;
        }

        console.log(`🧹 Cancelling pending Pre-Punch SL (${deployment.prePunchOrderId}) due to: ${exitReason}`);

        // Dhan API se Order Cancel karo (Aapko dhanService.js me cancelDhanOrder function banana hoga)
        const cancelResponse = await cancelDhanOrder(broker.clientId, broker.apiSecret, deployment.prePunchOrderId);

        if (cancelResponse.success) {
            deployment.isSlPrePunched = false; // Flag reset kar do
            await deployment.save();
            
            await createAndEmitLog(
                broker, 
                deployment.tradedSymbol, 
                'CANCEL', 
                deployment.tradedQty, 
                'SUCCESS', 
                `🧹 Naked Order Prevented: Cancelled pending broker SL because trade exited via ${exitReason}.`, 
                deployment.prePunchOrderId
            );
        } else {
            await createAndEmitLog(
                broker, 
                deployment.tradedSymbol, 
                'CANCEL', 
                deployment.tradedQty, 
                'FAILED', 
                `🚨 URGENT: Failed to cancel pending SL. Please check broker terminal manually! Reason: ${cancelResponse.error || 'API Error'}`
            );
        }
    } catch (error) {
        console.error("❌ Cancel Pre-Punch SL Error:", error.message);
    }
};

module.exports = {
    handlePrePunchSl,
    cancelPrePunchedSl
};