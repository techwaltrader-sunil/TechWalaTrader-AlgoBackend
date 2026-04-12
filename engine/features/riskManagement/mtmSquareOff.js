// File: src/engine/features/riskManagement/mtmSquareOff.js

// 📌 IMPORTS (Apne folder structure ke hisab se '../' adjust kar lijiyega agar zarurat pade)
const Broker = require('../../../models/Broker.js'); 
const { fetchLiveLTP, placeDhanOrder } = require('../../../services/dhanService.js'); 
const { createAndEmitLog } = require('../../utils/logger.js');

/**
 * 💰 MTM (MAX PROFIT / MAX LOSS) SQUARE-OFF LOGIC
 * Ye function check karta hai ki user ka target ya stop-loss hit hua ya nahi.
 */
export const handleMtmSquareOff = async (deployment, strategy, executionLocks, exitLockKey) => {
    try {
        const riskData = strategy.data?.riskManagement || {};
        const maxProfit = parseFloat(riskData.maxProfit) || 0;
        const maxLoss = parseFloat(riskData.maxLoss) || 0;

        // 1. SAFETY CHECK: Agar Max Profit/Loss set nahi hai, ya lock laga hai, to turant wapas jao
        if (executionLocks.has(exitLockKey) || !deployment.tradedSecurityId || deployment.entryPrice <= 0 || (maxProfit === 0 && maxLoss === 0)) {
            return;
        }

        // 2. LOOP THROUGH BROKERS
        for (const brokerId of deployment.brokers) {
            
            // Broker ki details DB se nikalo
            const broker = await Broker.findById(brokerId);

            if (broker && broker.engineOn) {
                try {
                    // 3. FETCH LIVE PRICE
                    const liveLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId);
                    
                    if (liveLtp && liveLtp > 0) {
                        
                        // 4. CALCULATE CURRENT PnL
                        let currentPnl = deployment.tradeAction === 'BUY' 
                            ? (liveLtp - deployment.entryPrice) * deployment.tradedQty 
                            : (deployment.entryPrice - liveLtp) * deployment.tradedQty;

                        let squareOffReason = null;
                        
                        // 5. CHECK TARGET OR STOP-LOSS
                        if (maxProfit > 0 && currentPnl >= maxProfit) {
                            squareOffReason = `Target Reached (Max Profit: ₹${maxProfit})`;
                        } else if (maxLoss > 0 && currentPnl <= -Math.abs(maxLoss)) {
                            squareOffReason = `Stop-Loss Hit (Max Loss: ₹${Math.abs(maxLoss)})`;
                        }

                        // 6. IF CONDITION MET -> EXECUTE SQUARE-OFF
                        if (squareOffReason) {
                            
                            // Turant lock lagao taki double order fire na ho
                            executionLocks.add(exitLockKey);
                            console.log(`🚨 MTM SQUARE-OFF TRIGGERED! Reason: ${squareOffReason}`);

                            const exitAction = deployment.tradeAction === 'BUY' ? 'SELL' : 'BUY';
                            const squareOffSymbolName = deployment.tradedSymbol ? `${deployment.tradedSymbol} (MTM-Exit)` : "MTM Square-Off";

                            let isExitSuccessful = false;
                            let exitRemarks = squareOffReason;
                            let orderIdToSave = "N/A";

                            // 🟢 PAPER TRADE MTM EXIT
                            if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
                                isExitSuccessful = true;
                                exitRemarks = `Paper Trade MTM Exit: ${squareOffReason}`;
                            } 
                            // 🔴 LIVE TRADE MTM EXIT
                            else if (deployment.executionType === 'LIVE') {
                                const orderData = { 
                                    action: exitAction, 
                                    quantity: deployment.tradedQty, 
                                    securityId: deployment.tradedSecurityId, 
                                    segment: deployment.tradedExchange 
                                };
                                const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                                
                                if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
                                    isExitSuccessful = true;
                                    orderIdToSave = orderResponse.data.orderId;
                                    exitRemarks = `Live MTM Exit: ${squareOffReason}`;
                                } else {
                                    exitRemarks = orderResponse.data?.remarks || orderResponse.error?.errorMessage || "RMS Rejected";
                                }
                            }

                            // 🧮 7. FINAL P&L CALCULATION & DB SAVE
                            if (isExitSuccessful) {
                                deployment.exitPrice = liveLtp;
                                deployment.pnl = currentPnl;         
                                deployment.realizedPnl = currentPnl;
                                deployment.status = 'COMPLETED';
                                await deployment.save();

                                await createAndEmitLog(broker, squareOffSymbolName, exitAction, deployment.tradedQty, 'SUCCESS', `${exitRemarks} (Final P&L: ₹${currentPnl.toFixed(2)})`, orderIdToSave);
                            } else {
                                await createAndEmitLog(broker, squareOffSymbolName, exitAction, deployment.tradedQty, 'FAILED', `MTM Exit Failed: ${exitRemarks}`, orderIdToSave);
                                
                                // Agar exit fail ho gaya (e.g., API error), to lock hata do taki next 30 sec baad wapas try kare!
                                executionLocks.delete(exitLockKey); 
                            }
                        }
                    }
                } catch (err) {
                    console.log(`⚠️ MTM Check Failed for ${strategy.name}: ${err.message}`);
                }
            }
        }
    } catch (error) {
        console.error("❌ MTM Module Error:", error.message);
    }
};