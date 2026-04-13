// File: src/engine/features/advanceFeatures/prePunchSl.js

const { placeDhanOrder } = require('../../../services/dhanService.js');
const { createAndEmitLog } = require('../../utils/logger.js');

/**
 * 🛡️ ADVANCE FEATURE 3: PRE-PUNCH SL
 * Entry aate hi turant Broker ke terminal par Pending SL order laga dena.
 */
const handlePrePunchSl = async (deployment, broker, leg, entryPrice) => {
    try {
        if (!entryPrice || entryPrice <= 0 || !leg.slValue || leg.slValue <= 0) return;

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

        // 2. NSE/NFO ke tick size (0.05) ke hisab se round off karna zaroori hai, warna broker reject kar dega
        slPrice = Math.round(slPrice * 20) / 20;

        console.log(`🛡️ Pre-Punching SL on Exchange for ${deployment.tradedSymbol} at ₹${slPrice}`);

        // 3. Prepare Dhan Order Data for Stop Loss
        const orderData = {
            action: exitAction,
            quantity: deployment.tradedQty,
            securityId: deployment.tradedSecurityId,
            segment: deployment.tradedExchange,
            orderType: "STOP_LOSS_MARKET", // Trigger hit hote hi market order lag jayega
            triggerPrice: slPrice
        };

        // 4. Send Order to Dhan
        const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

        // 5. Update Database & Logs
        if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
            deployment.prePunchOrderId = orderResponse.data.orderId;
            deployment.isSlPrePunched = true;
            await deployment.save();
            
            await createAndEmitLog(
                broker, 
                deployment.tradedSymbol, 
                exitAction, 
                deployment.tradedQty, 
                'SUCCESS', 
                `🛡️ System Safe: Pre-Punch SL placed at ₹${slPrice}`, 
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

module.exports = {
    handlePrePunchSl
};