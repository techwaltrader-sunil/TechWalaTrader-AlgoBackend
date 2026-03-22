// const cron = require('node-cron');
// const moment = require('moment-timezone');
// const Deployment = require('../models/Deployment'); // Path check kar lein
// const Broker = require('../models/Broker'); // Path check kar lein
// const { placeDhanOrder } = require('../services/dhanService'); // Path check kar lein

// console.log("🚀 Trading Engine Initialized...");

// // Har 10 second me check karega (Production me ise har 1 second "* * * * * *" kar sakte hain)
// cron.schedule('*/10 * * * * *', async () => {
//     try {
//         // 1. Current Time nikalo (IST me)
//         const currentTime = moment().tz("Asia/Kolkata").format("hh:mm A"); 
        
//         // 2. Database se saari ACTIVE deployments nikalo
//         const activeDeployments = await Deployment.find({ status: 'ACTIVE' }).populate('strategyId');

//         if (activeDeployments.length === 0) return;

//         for (const deployment of activeDeployments) {
//             const strategy = deployment.strategyId;
            
//             // 3. Time Check: Kya Strategy ka Start Time ho gaya hai?
//             if (strategy.data?.orderType?.startTime === currentTime) {
                
//                 // Pata karo is strategy ka order aaj lag chuka hai ya nahi (taaki baar-baar na lage)
//                 // (Iske liye Deployment model me `lastExecutedDate` add karna padega)
                
//                 console.log(`⚡ TRIGGER MATCHED! Strategy: ${strategy.name} at ${currentTime}`);

//                 // 4. Har selected broker ke liye order fire karo
//                 for (const brokerId of deployment.brokers) {
//                     const broker = await Broker.findById(brokerId);
                    
//                     // Sirf un brokers pe order lagao jinka Engine ON hai
//                     if (broker && broker.engineOn) {
                        
//                         console.log(`➡️ Firing Order to Broker: ${broker.name} (${broker.clientId})`);
                        
//                         // Strategy ke har leg ke liye order lagao
//                         for (const leg of strategy.data.legs) {
                            
//                             // ⚠️ Dummy Security ID for test (Real logic me aapko Nifty ke live strike ki ID nikalni padegi)
//                             const testSecurityId = "12345"; 
                            
//                             const orderData = {
//                                 action: leg.action, // BUY ya SELL
//                                 quantity: leg.quantity * deployment.multiplier,
//                                 securityId: testSecurityId 
//                             };

//                             // API Call to Dhan
//                             // await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                            
//                             console.log(`✅ [TEST MODE] Order Sent: ${orderData.action} ${orderData.quantity} qty`);
//                         }
//                     } else {
//                         console.log(`⏭️ Skipped Broker: ${broker?.name} (Engine is OFF)`);
//                     }
//                 }
//             }
            
//             // 5. Square Off Time Check
//             if (deployment.squareOffTime === currentTime) {
//                 console.log(`🛑 SQUARE OFF TRIGGERED! Strategy: ${strategy.name} at ${currentTime}`);
//                 // Yahan square off ka logic aayega (sab positions close karne ka)
                
//                 // Deployment ka status STOPPED kar do
//                 deployment.status = 'STOPPED';
//                 await deployment.save();
//             }
//         }

//     } catch (error) {
//         console.error("❌ Trading Engine Error:", error);
//     }
// });


// const cron = require('node-cron');
// const moment = require('moment-timezone');
// const Deployment = require('../models/Deployment');
// const Broker = require('../models/Broker');
// const { placeDhanOrder } = require('../services/dhanService');
// // ✅ NAYA: Instrument service ko import kiya
// const { getOptionSecurityId } = require('../services/instrumentService'); 

// console.log("🚀 Trading Engine Initialized...");

// cron.schedule('*/5 * * * * *', async () => {
//     try {
//         const currentTime = moment().tz("Asia/Kolkata").format("HH:mm"); 
        
//         const activeDeployments = await Deployment.find({ status: 'ACTIVE' }).populate('strategyId');
//         if (activeDeployments.length === 0) return;

//         for (const deployment of activeDeployments) {
//             const strategy = deployment.strategyId;
//             const config = strategy.data?.config || {};
            
//             // ENTRY LOGIC
//             if (config.startTime === currentTime && !deployment.orderPlacedToday) {
//                 console.log(`⚡ ENTRY TRIGGERED! Strategy: ${strategy.name}`);

//                 for (const brokerId of deployment.brokers) {
//                     const broker = await Broker.findById(brokerId);
                    
//                     if (broker && broker.engineOn) {
//                         for (const leg of strategy.data.legs) {
                            
//                             // --------------------------------------------------------
//                             // 🔥 THE BRAIN: ATM to Strike Price Conversion 🔥
//                             // --------------------------------------------------------
                            
//                             // Step 1: Live Spot Price lana (Abhi ke liye Dummy Price)
//                             // Future me yahan Dhan WebSockets se live price aayega
//                             let currentSpotPrice = 22020; // Example Nifty Price
//                             let stepValue = leg.symbol === "BANKNIFTY" ? 100 : 50; 

//                             let targetStrikePrice = 0;

//                             // Step 2: Calculate Exact Strike
//                             if (leg.strike === "ATM") {
//                                 // Rounding to nearest ATM (22020 -> 22000, 22030 -> 22050)
//                                 targetStrikePrice = Math.round(currentSpotPrice / stepValue) * stepValue;
//                             } else {
//                                 // Agar ITM 100, OTM 50 etc. ka logic hai to wo yahan aayega
//                                 // Abhi ke liye hum assume kar rahe hain ki default ATM hi hai
//                                 targetStrikePrice = Math.round(currentSpotPrice / stepValue) * stepValue;
//                             }

//                             console.log(`🎯 Searching Security ID for: ${leg.symbol} ${targetStrikePrice} ${leg.type}`);

//                             // Step 3: Call your Instrument Service
//                             const instrument = getOptionSecurityId(leg.symbol, targetStrikePrice, leg.type);

//                             if (!instrument) {
//                                 console.error(`❌ Strike not found in CSV: ${leg.symbol} ${targetStrikePrice} ${leg.type}`);
//                                 continue; // Skip this leg if not found
//                             }

//                             console.log(`✅ Found Instrument: ${instrument.tradingSymbol} (ID: ${instrument.id})`);

//                             // Step 4: Create Order Payload & Send to Dhan
//                             const orderData = {
//                                 action: leg.action,
//                                 quantity: (leg.qty || 1) * deployment.multiplier,
//                                 securityId: instrument.id,
//                                 segment: instrument.exchange
//                             };

//                             const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                            
//                             if(orderResponse.success) {
//                                 console.log("🚀 ORDER SUCCESSFULLY PLACED AT BROKER!");
//                                 deployment.orderPlacedToday = true; 
//                                 await deployment.save();
//                             }
//                         }
//                     }
//                 }
//             }
            
//             // EXIT LOGIC... (Yahan abhi code chota rakha hai)
//             if (config.squareOffTime === currentTime) {
//                  // ... square off logic
//             }
//         }
//     } catch (error) {
//         console.error("❌ Trading Engine Error:", error);
//     }
// });


// const cron = require('node-cron');
// const moment = require('moment-timezone');
// const Deployment = require('../models/Deployment'); // Path check kar lein
// const Broker = require('../models/Broker'); // Path check kar lein
// const { placeDhanOrder } = require('../services/dhanService');
// const { getOptionSecurityId } = require('../services/instrumentService');

// console.log("🚀 Trading Engine Initialized...");

// // Har 10 second me engine chalega
// cron.schedule('*/10 * * * * *', async () => {
//     try {
//         // Indian Standard Time (IST) nikal rahe hain
//         const currentTime = moment().tz("Asia/Kolkata").format("HH:mm"); 
        
//         const activeDeployments = await Deployment.find({ status: 'ACTIVE' }).populate('strategyId');
        
//         // ----------------------------------------------------
//         // 🔎 X-RAY LOG 1: Engine zinda hai aur time kya ho raha hai?
//         // ----------------------------------------------------
//         console.log(`⏱️ Engine Tick -> Server Time: ${currentTime} | Active Algos Found: ${activeDeployments.length}`);

//         if (activeDeployments.length === 0) return;

//         for (const deployment of activeDeployments) {
//             const strategy = deployment.strategyId;
//             if (!strategy) continue; // Agar strategy delete ho gayi ho to skip

//             const config = strategy.data?.config || {};
            
//             // ----------------------------------------------------
//             // 🔎 X-RAY LOG 2: Strategy me kya time set hai?
//             // ----------------------------------------------------
//             console.log(`   👉 Checking Algo: [${strategy.name}] | Set Time: ${config.startTime} | Matching?: ${config.startTime === currentTime}`);

//             // ENTRY LOGIC
//             if (config.startTime === currentTime && !deployment.orderPlacedToday) {
//                 console.log(`⚡ ENTRY TRIGGERED! Strategy: ${strategy.name}`);

//                 for (const brokerId of deployment.brokers) {
//                     const broker = await Broker.findById(brokerId);
                    
//                     if (broker && broker.engineOn) {
//                         for (const leg of strategy.data.legs) {
                            
//                             let currentSpotPrice = 22020; 
//                             let stepValue = leg.symbol === "BANKNIFTY" ? 100 : 50; 
//                             let targetStrikePrice = Math.round(currentSpotPrice / stepValue) * stepValue;

//                             console.log(`🎯 Searching Security ID for: ${leg.symbol} ${targetStrikePrice} ${leg.type}`);

//                             const instrument = getOptionSecurityId(leg.symbol, targetStrikePrice, leg.type);

//                             if (!instrument) {
//                                 console.error(`❌ Strike not found in CSV: ${leg.symbol} ${targetStrikePrice} ${leg.type}`);
//                                 continue; 
//                             }

//                             console.log(`✅ Found Instrument: ${instrument.tradingSymbol} (ID: ${instrument.id})`);

//                             const orderData = {
//                                 action: leg.action,
//                                 quantity: (leg.qty || 1) * deployment.multiplier,
//                                 securityId: instrument.id,
//                                 segment: instrument.exchange
//                             };

//                             const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                            
//                             if(orderResponse.success) {
//                                 console.log("🚀 ORDER SUCCESSFULLY PLACED AT BROKER!");
//                                 deployment.orderPlacedToday = true; 
//                                 await deployment.save();
//                             }
//                         }
//                     }
//                 }
//             }
//         }
//     } catch (error) {
//         console.error("❌ Trading Engine Error:", error);
//     }
// });


// const cron = require('node-cron');
// const moment = require('moment-timezone');
// const Deployment = require('../models/Deployment');
// const Broker = require('../models/Broker');
// const { placeDhanOrder } = require('../services/dhanService');
// const { getOptionSecurityId } = require('../services/instrumentService');

// console.log("🚀 Trading Engine Initialized...");

// cron.schedule('*/10 * * * * *', async () => {
//     try {
//         const currentTime = moment().tz("Asia/Kolkata").format("HH:mm"); 
//         const activeDeployments = await Deployment.find({ status: 'ACTIVE' }).populate('strategyId');
        
//         console.log(`⏱️ Engine Tick -> Server Time: ${currentTime} | Active Algos Found: ${activeDeployments.length}`);

//         if (activeDeployments.length === 0) return;

//         for (const deployment of activeDeployments) {
//             const strategy = deployment.strategyId;
//             if (!strategy) continue;

//             const config = strategy.data?.config || {};
//             console.log(`   👉 Checking Algo: [${strategy.name}] | Set Time: ${config.startTime} | Matching?: ${config.startTime === currentTime}`);

//             if (config.startTime === currentTime && !deployment.orderPlacedToday) {
//                 console.log(`⚡ ENTRY TRIGGERED! Strategy: ${strategy.name}`);

//                 for (const brokerId of deployment.brokers) {
//                     const broker = await Broker.findById(brokerId);
                    
//                     if (broker && broker.engineOn) {
                        
//                         // 🔥 FIX 1: Instrument se Symbol nikalo (Nifty 50 ko NIFTY banao)
//                         const instrumentData = strategy.data.instruments[0]; 
//                         let rawSymbol = instrumentData ? instrumentData.name : "";
//                         let baseSymbol = "NIFTY"; // Default
//                         if (rawSymbol.toUpperCase().includes("BANK")) baseSymbol = "BANKNIFTY";
//                         else if (rawSymbol.toUpperCase().includes("FIN")) baseSymbol = "FINNIFTY";

//                         for (const leg of strategy.data.legs) {
                            
//                             // 🔥 FIX 2: Call/Put ko CE/PE banao
//                             let optType = leg.optionType === "Call" ? "CE" : "PE";

//                             let currentSpotPrice = 22020; // Dummy Live Price
//                             let stepValue = baseSymbol === "BANKNIFTY" ? 100 : 50; 
//                             let targetStrikePrice = Math.round(currentSpotPrice / stepValue) * stepValue;

//                             // Ab undefined nahi, NIFTY 22000 CE aayega!
//                             console.log(`🎯 Searching Security ID for: ${baseSymbol} ${targetStrikePrice} ${optType}`);

//                             const instrument = getOptionSecurityId(baseSymbol, targetStrikePrice, optType);

//                             if (!instrument) {
//                                 console.error(`❌ Strike not found in CSV: ${baseSymbol} ${targetStrikePrice} ${optType}`);
//                                 continue; 
//                             }

//                             console.log(`✅ Found Instrument: ${instrument.tradingSymbol} (ID: ${instrument.id})`);

//                             const orderData = {
//                                 action: leg.action.toUpperCase(), // BUY ya SELL
//                                 quantity: (leg.quantity || 1) * deployment.multiplier,
//                                 securityId: instrument.id,
//                                 segment: instrument.exchange
//                             };

//                             // 🔥 REAL DHAN API CALL
//                             const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                            
//                             if(orderResponse.success) {
//                                 console.log("🚀 ORDER SUCCESSFULLY PLACED AT BROKER!");
//                                 deployment.orderPlacedToday = true; 
//                                 await deployment.save();
//                             }
//                         }
//                     }
//                 }
//             }
//         }
//     } catch (error) {
//         console.error("❌ Trading Engine Error:", error);
//     }
// });



const cron = require('node-cron');
const moment = require('moment-timezone');
const axios = require('axios'); // 🔥 NAYA: Yahoo API call ke liye
const Deployment = require('../models/Deployment');
const Broker = require('../models/Broker');
const { placeDhanOrder } = require('../services/dhanService');
const { getOptionSecurityId } = require('../services/instrumentService');

console.log("🚀 Trading Engine Initialized...");

// 🔥 HELPER 1: Strike Price Gap Calculator
const getStrikeStep = (symbol) => {
    const sym = symbol.toUpperCase();
    if (sym.includes("BANKNIFTY")) return 100;
    if (sym.includes("FINNIFTY")) return 50;
    if (sym.includes("MIDCPNIFTY")) return 25; 
    if (sym.includes("NIFTY")) return 50;
    if (sym.includes("SENSEX")) return 100;
    return 50; 
};

// 🔥 HELPER 2: Real Live Price Fetcher (Yahoo Finance)
const fetchLivePrice = async (symbol) => {
    try {
        let ticker = "";
        const upperSymbol = symbol.toUpperCase();

        if (upperSymbol.includes("BANKNIFTY")) ticker = "^NSEBANK";
        else if (upperSymbol.includes("FINNIFTY")) ticker = "NIFTY_FIN_SERVICE.NS"; 
        else if (upperSymbol.includes("MIDCPNIFTY")) ticker = "NIFTY_MIDCAP_SELECT.NS"; 
        else if (upperSymbol.includes("NIFTY")) ticker = "^NSEI";
        else if (upperSymbol.includes("SENSEX")) ticker = "^BSESN";
        else return null;

        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m`;
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (!response.data.chart.result) return null;

        return response.data.chart.result[0].meta.regularMarketPrice;
    } catch (error) {
        console.error("❌ Error fetching Real-time LTP:", error.message);
        return null; 
    }
};

cron.schedule('*/10 * * * * *', async () => {
    try {
        const currentTime = moment().tz("Asia/Kolkata").format("HH:mm"); 
        const activeDeployments = await Deployment.find({ status: 'ACTIVE' }).populate('strategyId');
        
        console.log(`⏱️ Engine Tick -> Server Time: ${currentTime} | Active Algos Found: ${activeDeployments.length}`);

        if (activeDeployments.length === 0) return;

        for (const deployment of activeDeployments) {
            const strategy = deployment.strategyId;
            if (!strategy) continue;

            const config = strategy.data?.config || {};
            
            if (config.startTime === currentTime && !deployment.orderPlacedToday) {
                console.log(`⚡ ENTRY TRIGGERED! Strategy: ${strategy.name}`);

                for (const brokerId of deployment.brokers) {
                    const broker = await Broker.findById(brokerId);
                    
                    if (broker && broker.engineOn) {
                        
                        const instrumentData = strategy.data.instruments[0]; 
                        let rawSymbol = instrumentData ? instrumentData.name : "";
                        let baseSymbol = "NIFTY"; // Default
                        if (rawSymbol.toUpperCase().includes("BANK")) baseSymbol = "BANKNIFTY";
                        else if (rawSymbol.toUpperCase().includes("FIN")) baseSymbol = "FINNIFTY";

                        for (const leg of strategy.data.legs) {
                            
                            let optType = leg.optionType === "Call" ? "CE" : "PE";

                            // 🔥 THE FIX: Yahan aapka Yahoo API wala code lag gaya!
                            console.log(`📡 Fetching Live Price for ${baseSymbol}...`);
                            let currentSpotPrice = await fetchLivePrice(baseSymbol);

                            // Agar live price nahi mila toh trade rok do
                            if (!currentSpotPrice) {
                                console.error(`🚨 TRADE ABORTED: Missing Live Price for ${baseSymbol}`);
                                continue; 
                            }

                            console.log(`✅ Real LTP Received: ${currentSpotPrice}`);

                            let stepValue = getStrikeStep(baseSymbol); 
                            let targetStrikePrice = Math.round(currentSpotPrice / stepValue) * stepValue;

                            console.log(`🎯 Searching Security ID for: ${baseSymbol} ${targetStrikePrice} ${optType}`);

                            const instrument = getOptionSecurityId(baseSymbol, targetStrikePrice, optType);

                            if (!instrument) {
                                console.error(`❌ Strike not found in CSV: ${baseSymbol} ${targetStrikePrice} ${optType}`);
                                continue; 
                            }

                            console.log(`✅ Found Instrument: ${instrument.tradingSymbol} (ID: ${instrument.id})`);

                            const orderData = {
                                action: leg.action.toUpperCase(), 
                                quantity: (leg.quantity || 1) * deployment.multiplier,
                                securityId: instrument.id,
                                segment: instrument.exchange
                            };

                            // 🔥 REAL DHAN API CALL
                            const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                            
                            if(orderResponse.success) {
                                console.log("🚀 ORDER SUCCESSFULLY PLACED AT BROKER!");
                                deployment.orderPlacedToday = true; 
                                await deployment.save();
                            } else {
                                console.log("⚠️ BROKER REJECTED ORDER:", orderResponse.error);
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error("❌ Trading Engine Error:", error);
    }
});