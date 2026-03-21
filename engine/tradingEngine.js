const cron = require('node-cron');
const moment = require('moment-timezone');
const Deployment = require('../models/Deployment'); // Path check kar lein
const Broker = require('../models/Broker'); // Path check kar lein
const { placeDhanOrder } = require('../services/dhanService'); // Path check kar lein

console.log("🚀 Trading Engine Initialized...");

// Har 10 second me check karega (Production me ise har 1 second "* * * * * *" kar sakte hain)
cron.schedule('*/10 * * * * *', async () => {
    try {
        // 1. Current Time nikalo (IST me)
        const currentTime = moment().tz("Asia/Kolkata").format("hh:mm A"); 
        
        // 2. Database se saari ACTIVE deployments nikalo
        const activeDeployments = await Deployment.find({ status: 'ACTIVE' }).populate('strategyId');

        if (activeDeployments.length === 0) return;

        for (const deployment of activeDeployments) {
            const strategy = deployment.strategyId;
            
            // 3. Time Check: Kya Strategy ka Start Time ho gaya hai?
            if (strategy.data?.orderType?.startTime === currentTime) {
                
                // Pata karo is strategy ka order aaj lag chuka hai ya nahi (taaki baar-baar na lage)
                // (Iske liye Deployment model me `lastExecutedDate` add karna padega)
                
                console.log(`⚡ TRIGGER MATCHED! Strategy: ${strategy.name} at ${currentTime}`);

                // 4. Har selected broker ke liye order fire karo
                for (const brokerId of deployment.brokers) {
                    const broker = await Broker.findById(brokerId);
                    
                    // Sirf un brokers pe order lagao jinka Engine ON hai
                    if (broker && broker.engineOn) {
                        
                        console.log(`➡️ Firing Order to Broker: ${broker.name} (${broker.clientId})`);
                        
                        // Strategy ke har leg ke liye order lagao
                        for (const leg of strategy.data.legs) {
                            
                            // ⚠️ Dummy Security ID for test (Real logic me aapko Nifty ke live strike ki ID nikalni padegi)
                            const testSecurityId = "12345"; 
                            
                            const orderData = {
                                action: leg.action, // BUY ya SELL
                                quantity: leg.quantity * deployment.multiplier,
                                securityId: testSecurityId 
                            };

                            // API Call to Dhan
                            // await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                            
                            console.log(`✅ [TEST MODE] Order Sent: ${orderData.action} ${orderData.quantity} qty`);
                        }
                    } else {
                        console.log(`⏭️ Skipped Broker: ${broker?.name} (Engine is OFF)`);
                    }
                }
            }
            
            // 5. Square Off Time Check
            if (deployment.squareOffTime === currentTime) {
                console.log(`🛑 SQUARE OFF TRIGGERED! Strategy: ${strategy.name} at ${currentTime}`);
                // Yahan square off ka logic aayega (sab positions close karne ka)
                
                // Deployment ka status STOPPED kar do
                deployment.status = 'STOPPED';
                await deployment.save();
            }
        }

    } catch (error) {
        console.error("❌ Trading Engine Error:", error);
    }
});