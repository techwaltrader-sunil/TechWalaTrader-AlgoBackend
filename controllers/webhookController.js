

// const Broker = require('../models/Broker');
// const AlgoTradeLog = require('../models/AlgoTradeLog');
// const axios = require('axios');
// const { getOptionSecurityId } = require('../services/instrumentService'); 

// const DHAN_API_URL = "https://api.dhan.co/orders";

// const symbolMapper = {
//     "HDFCBANK": { id: "1333", exchange: "NSE_EQ" },
//     "YESBANK": { id: "11915", exchange: "NSE_EQ" },
//     "TATASTEEL": { id: "3499", exchange: "NSE_EQ" }
// };

// const handleTradingViewAlert = async (req, res) => {
//     try {
//         const alertData = req.body;
        
//         console.log("\n=========================================");
//         console.log("🔔 NEW WEBHOOK RECEIVED FROM TRADINGVIEW!");

//         // 🔥 1. SECURITY CHECK (The Bouncer) 🔥
//         const expectedSecret = process.env.WEBHOOK_SECRET;

//         // Agar webhook me token nahi hai, ya galat hai
//         if (!alertData.secret_token || alertData.secret_token !== expectedSecret) {
//             console.log("🚨 SECURITY ALERT: Unauthorized Webhook Attempt Blocked!");
//             return res.status(401).json({ error: "Unauthorized: Invalid or Missing Secret Token" });
//         }

//         console.log("✅ Security Check Passed! Valid Token Received.");

//         // 🔥 2. PAYLOAD VALIDATION 🔥
//         if (!alertData.action || !alertData.transaction_type || !alertData.symbol) {
//             return res.status(400).json({ error: "Invalid webhook payload format" });
//         }

//         let securityId = null;
//         let exchangeSegment = null;
//         let finalSymbolName = alertData.symbol;

//         // F&O Variables
//         let drvExpiryDate = null;
//         let drvOptionType = null;
//         let drvStrikePrice = null;

//         if (alertData.strike && alertData.option_type) {
//             const optionData = getOptionSecurityId(alertData.symbol, alertData.strike, alertData.option_type);
            
//             if (!optionData) {
//                 console.log(`❌ Option Contract [${alertData.symbol} ${alertData.strike} ${alertData.option_type}] not found!`);
//                 return res.status(400).json({ error: "Option contract not found for current expiry." });
//             }
            
//             securityId = optionData.id;
//             exchangeSegment = optionData.exchange;
//             finalSymbolName = optionData.tradingSymbol; 
            
//             drvExpiryDate = optionData.expiry; 
//             drvOptionType = optionData.optionType; 
//             drvStrikePrice = parseFloat(optionData.strike);
            
//             console.log(`🎯 F&O Mapped: ${finalSymbolName} (ID: ${securityId}) | Type: ${drvOptionType} | Exp: ${drvExpiryDate}`);
            
//         } else {
//             const instrumentInfo = symbolMapper[alertData.symbol];
//             if (!instrumentInfo) return res.status(400).json({ error: "Equity Security ID not found." });
//             securityId = instrumentInfo.id;
//             exchangeSegment = instrumentInfo.exchange;
//         }

//         let tradeAction = "BUY";
//         if (alertData.transaction_type === "LONG" && alertData.action === "EXIT") tradeAction = "SELL";
//         if (alertData.transaction_type === "SHORT" && alertData.action === "ENTRY") tradeAction = "SELL";
//         if (alertData.transaction_type === "SHORT" && alertData.action === "EXIT") tradeAction = "BUY";

//         const dhanProductType = alertData.product_type === "MIS" ? "INTRADAY" : "MARGIN";
//         const activeBrokers = await Broker.find({ terminalOn: true, engineOn: true, name: "Dhan" });

//         if (activeBrokers.length === 0) {
//             return res.status(200).json({ message: "No active broker engine found." });
//         }

//         for (const broker of activeBrokers) {
//             // 🔥 THE MAGIC FIX: Database me field ka naam chahe jo ho, ye auto-detect kar lega
//             const actualToken = broker.apiSecret || broker.accessToken || broker.apiKey || broker.token;
            
//             if (!actualToken || !broker.clientId) {
//                 console.log(`⚠️ WARNING: API Token or Client ID is missing for Broker: ${broker.name}. Please check your Brokers page!`);
//                 continue;
//             }

//             const dhanOrderPayload = {
//                 dhanClientId: String(broker.clientId),
//                 correlationId: String(`TM_${Date.now()}`),
//                 transactionType: tradeAction,
//                 exchangeSegment: exchangeSegment,
//                 productType: dhanProductType,
//                 orderType: "MARKET",
//                 validity: "DAY",
//                 tradingSymbol: "", 
//                 securityId: String(securityId),
//                 quantity: parseInt(alertData.quantity, 10) || 1,
//                 disclosedQuantity: 0,
//                 price: 0,
//                 triggerPrice: 0,
//                 afterMarketOrder: false,
//                 amoTime: "OPEN",
//                 boProfitValue: 0,
//                 boStopLossValue: 0
//             };

//             console.log(`\n🚀 Firing REAL Order for: ${broker.clientId} | ${finalSymbolName}`);
//             // Ye line hume terminal me batayegi ki token sahi se ja raha hai ya nahi (Security ke liye sirf shuruat ke 5 akshar print karenge)
//             console.log(`🔑 Using Token: ${actualToken.substring(0, 5)}...**********`);
            
//             try {
//                 const response = await axios.post(DHAN_API_URL, dhanOrderPayload, {
//                     headers: {
//                         'access-token': actualToken, // ✅ Yahan updated token laga diya
//                         'client-id': broker.clientId,
//                         'Content-Type': 'application/json',
//                         'Accept': 'application/json'
//                     }
//                 });
                
//                 console.log("🟢 ORDER SUCCESS:", response.data);

//                 const savedLog = await AlgoTradeLog.create({
//                     brokerId: broker._id,
//                     brokerName: broker.name,
//                     symbol: finalSymbolName, 
//                     action: tradeAction,
//                     quantity: alertData.quantity || 1,
//                     status: 'SUCCESS',
//                     message: "Order placed successfully",
//                     orderId: response.data.orderId || "N/A"
//                 });

//                 const io = req.app.get('io');
//                 if (io) io.emit('new-trade-log', savedLog);

//             } catch (error) {
//                 console.error("🔴 ORDER FAILED!");
//                 const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;

//                 const failedLog = await AlgoTradeLog.create({
//                     brokerId: broker._id,
//                     brokerName: broker.name,
//                     symbol: finalSymbolName,
//                     action: tradeAction,
//                     quantity: alertData.quantity || 1,
//                     status: 'FAILED',
//                     message: errorMessage 
//                 });

//                 const io = req.app.get('io');
//                 if (io) io.emit('new-trade-log', failedLog);
//             }
//         }

//         console.log("=========================================\n");
//         res.status(200).json({ success: true, message: "Real Webhook processed & Logged" });

//     } catch (error) {
//         console.error("Webhook Error:", error);
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// };

// module.exports = { handleTradingViewAlert };


// const Broker = require('../models/Broker');
// const AlgoTradeLog = require('../models/AlgoTradeLog');
// const axios = require('axios');
// const { getOptionSecurityId } = require('../services/instrumentService'); 

// const DHAN_API_URL = "https://api.dhan.co/orders";

// const symbolMapper = {
//     "HDFCBANK": { id: "1333", exchange: "NSE_EQ" },
//     "YESBANK": { id: "11915", exchange: "NSE_EQ" },
//     "TATASTEEL": { id: "3499", exchange: "NSE_EQ" }
// };

// // 🔥 HELPER 1: Strike Price Gap Calculator 🔥
// // Ye function batayega ki kis index me kitne points ka gap hota hai
// const getStrikeStep = (symbol) => {
//     const sym = symbol.toUpperCase();
//     if (sym.includes("BANKNIFTY")) return 100;
//     if (sym.includes("FINNIFTY")) return 50;
//     if (sym.includes("MIDCPNIFTY")) return 25; // ✅ Naya: Midcap ke liye 25 point ka gap
//     if (sym.includes("NIFTY")) return 50;
//     if (sym.includes("SENSEX")) return 100;
//     return 50; // Default fallback
// };

// // // 🔥 HELPER 2: Real Live Price Fetcher (Yahoo Finance API) 🔥
// // const fetchLivePrice = async (symbol) => {
// //     try {
// //         console.log(`📡 Fetching Live Price for ${symbol} from Global Market...`);
        
// //         let ticker = "";
// //         const upperSymbol = symbol.toUpperCase();

// //         // Yahoo Finance ke liye Indian Indices ke Ticker Codes
// //         if (upperSymbol.includes("BANKNIFTY")) {
// //             ticker = "^NSEBANK";
// //         } else if (upperSymbol.includes("FINNIFTY")) {
// //             ticker = "NIFTY_FIN_SERVICE.NS"; 
// //         } else if (upperSymbol.includes("NIFTY")) {
// //             ticker = "^NSEI";
// //         } else if (upperSymbol.includes("SENSEX")) {
// //             ticker = "^BSESN";
// //         } else {
// //             console.log(`⚠️ Live price ticker not found for: ${symbol}`);
// //             return null;
// //         }

// //         // Yahoo Finance ki Free Open API
// //         const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m`;
        
// //         const response = await axios.get(url, {
// //             headers: {
// //                 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' // Taki Yahoo block na kare
// //             }
// //         });

// //         // Response se Live Market Price (LTP) nikalna
// //         const ltp = response.data.chart.result[0].meta.regularMarketPrice;
        
// //         return ltp;
// //     } catch (error) {
// //         console.error("❌ Error fetching Real-time LTP:", error.message);
// //         return null;
// //     }
// // };

// // 🔥 HELPER 2: Real Live Price Fetcher (Yahoo Finance API) 🔥
// const fetchLivePrice = async (symbol) => {
//     try {
//         console.log(`📡 Fetching Live Price for ${symbol} from Global Market...`);
        
//         let ticker = "";
//         const upperSymbol = symbol.toUpperCase();

//         // Yahoo Finance ke liye Indian Indices ke Ticker Codes
//         if (upperSymbol.includes("BANKNIFTY")) {
//             ticker = "^NSEBANK";
//         } else if (upperSymbol.includes("FINNIFTY")) {
//             ticker = "NIFTY_FIN_SERVICE.NS"; 
//         } else if (upperSymbol.includes("MIDCPNIFTY")) {
//             ticker = "NIFTY_MIDCAP_SELECT.NS"; // ✅ Naya: Midcap Select ka exact Yahoo Ticker
//         } else if (upperSymbol.includes("NIFTY")) {
//             ticker = "^NSEI";
//         } else if (upperSymbol.includes("SENSEX")) {
//             ticker = "^BSESN";
//         } else {
//             console.log(`⚠️ Live price ticker not found for: ${symbol}`);
//             return null;
//         }

//         // Yahoo Finance ki Free Open API
//         const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m`;
        
//         const response = await axios.get(url, {
//             headers: {
//                 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' 
//             }
//         });

//         // Response se Live Market Price (LTP) nikalna
//         const ltp = response.data.chart.result[0].meta.regularMarketPrice;
//         console.log(`✅ Real LTP Received: ${ltp}`);
//         return ltp;
//     } catch (error) {
//         console.error("❌ Error fetching Real-time LTP:", error.message);
//         return null;
//     }
// };

// const handleTradingViewAlert = async (req, res) => {
//     try {
//         const alertData = req.body;
        
//         console.log("\n=========================================");
//         console.log("🔔 NEW WEBHOOK RECEIVED FROM TRADINGVIEW!");

//         // 🔥 1. SECURITY CHECK (The Bouncer) 🔥
//         const expectedSecret = process.env.WEBHOOK_SECRET;

//         if (!alertData.secret_token || alertData.secret_token !== expectedSecret) {
//             console.log("🚨 SECURITY ALERT: Unauthorized Webhook Attempt Blocked!");
//             return res.status(401).json({ error: "Unauthorized: Invalid or Missing Secret Token" });
//         }

//         console.log("✅ Security Check Passed! Valid Token Received.");

//         // 🔥 2. PAYLOAD VALIDATION 🔥
//         if (!alertData.action || !alertData.transaction_type || !alertData.symbol) {
//             return res.status(400).json({ error: "Invalid webhook payload format" });
//         }

//         // Active brokers nikalna (LTP fetch karne ke liye token chahiye ho sakta hai)
//         const activeBrokers = await Broker.find({ terminalOn: true, engineOn: true, name: "Dhan" });
//         if (activeBrokers.length === 0) {
//             return res.status(200).json({ message: "No active broker engine found." });
//         }

//         let securityId = null;
//         let exchangeSegment = null;
//         let finalSymbolName = alertData.symbol;

//         // F&O Variables
//         let drvExpiryDate = null;
//         let drvOptionType = null;
//         let drvStrikePrice = null;
        
//         // 🎯 THE ATM MAGIC LOGIC 🎯
//         let targetStrike = alertData.strike ? alertData.strike.toString().toUpperCase() : null;

//         if (targetStrike === "ATM") {
//             console.log(`🔄 ATM Logic Triggered for ${alertData.symbol}. Fetching Market Price...`);
            
//             // Asli LTP fetch karein (Yahan activeBrokers[0] use kar rahe hain taaki uske token se LTP nikal sakein)
//             const ltp = await fetchLivePrice(alertData.symbol);
            
//             if (!ltp) {
//                 console.log(`❌ ERROR: Failed to fetch Live Price for ${alertData.symbol}`);
//                 return res.status(400).json({ error: "Could not fetch Live Price for ATM calculation." });
//             }

//             const step = getStrikeStep(alertData.symbol);
//             // Rounding Formula: (LTP / Step) ko round karo, fir Step se multiply kar do
//             targetStrike = (Math.round(ltp / step) * step).toString();
            
//             console.log(`📊 Live Price: ${ltp} | Calculated ATM Strike: ${targetStrike}`);
//         }

//         // Agar option data hai to Process karein
//         if (targetStrike && alertData.option_type) {
//             // Ab getOptionSecurityId ko "ATM" nahi, balki asli number (jaise "47000") milega
//             const optionData = getOptionSecurityId(alertData.symbol, targetStrike, alertData.option_type);
            
//             if (!optionData) {
//                 console.log(`❌ Option Contract [${alertData.symbol} ${targetStrike} ${alertData.option_type}] not found!`);
//                 return res.status(400).json({ error: "Option contract not found for current expiry." });
//             }
            
//             securityId = optionData.id;
//             exchangeSegment = optionData.exchange;
//             finalSymbolName = optionData.tradingSymbol; 
            
//             drvExpiryDate = optionData.expiry; 
//             drvOptionType = optionData.optionType; 
//             drvStrikePrice = parseFloat(optionData.strike);
            
//             console.log(`🎯 F&O Mapped: ${finalSymbolName} (ID: ${securityId}) | Type: ${drvOptionType} | Exp: ${drvExpiryDate}`);
            
//         } else {
//             const instrumentInfo = symbolMapper[alertData.symbol];
//             if (!instrumentInfo) return res.status(400).json({ error: "Equity Security ID not found." });
//             securityId = instrumentInfo.id;
//             exchangeSegment = instrumentInfo.exchange;
//         }

//         let tradeAction = "BUY";
//         if (alertData.transaction_type === "LONG" && alertData.action === "EXIT") tradeAction = "SELL";
//         if (alertData.transaction_type === "SHORT" && alertData.action === "ENTRY") tradeAction = "SELL";
//         if (alertData.transaction_type === "SHORT" && alertData.action === "EXIT") tradeAction = "BUY";

//         const dhanProductType = alertData.product_type === "MIS" ? "INTRADAY" : "MARGIN";

//         for (const broker of activeBrokers) {
//             const actualToken = broker.apiSecret || broker.accessToken || broker.apiKey || broker.token;
            
//             if (!actualToken || !broker.clientId) {
//                 console.log(`⚠️ WARNING: API Token or Client ID is missing for Broker: ${broker.name}.`);
//                 continue;
//             }

//             const dhanOrderPayload = {
//                 dhanClientId: String(broker.clientId),
//                 correlationId: String(`TM_${Date.now()}`),
//                 transactionType: tradeAction,
//                 exchangeSegment: exchangeSegment,
//                 productType: dhanProductType,
//                 orderType: "MARKET",
//                 validity: "DAY",
//                 tradingSymbol: "", 
//                 securityId: String(securityId),
//                 quantity: parseInt(alertData.quantity, 10) || 1,
//                 disclosedQuantity: 0,
//                 price: 0,
//                 triggerPrice: 0,
//                 afterMarketOrder: false,
//                 amoTime: "OPEN",
//                 boProfitValue: 0,
//                 boStopLossValue: 0
//             };

//             console.log(`\n🚀 Firing REAL Order for: ${broker.clientId} | ${finalSymbolName}`);
//             console.log(`🔑 Using Token: ${actualToken.substring(0, 5)}...**********`);
            
//             try {
//                 const response = await axios.post(DHAN_API_URL, dhanOrderPayload, {
//                     headers: {
//                         'access-token': actualToken, 
//                         'client-id': broker.clientId,
//                         'Content-Type': 'application/json',
//                         'Accept': 'application/json'
//                     }
//                 });
                
//                 console.log("🟢 ORDER SUCCESS:", response.data);

//                 const savedLog = await AlgoTradeLog.create({
//                     brokerId: broker._id,
//                     brokerName: broker.name,
//                     symbol: finalSymbolName, 
//                     action: tradeAction,
//                     quantity: alertData.quantity || 1,
//                     status: 'SUCCESS',
//                     message: "Order placed successfully",
//                     orderId: response.data.orderId || "N/A"
//                 });

//                 const io = req.app.get('io');
//                 if (io) io.emit('new-trade-log', savedLog);

//             } catch (error) {
//                 console.error("🔴 ORDER FAILED!");
//                 const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;

//                 const failedLog = await AlgoTradeLog.create({
//                     brokerId: broker._id,
//                     brokerName: broker.name,
//                     symbol: finalSymbolName,
//                     action: tradeAction,
//                     quantity: alertData.quantity || 1,
//                     status: 'FAILED',
//                     message: errorMessage 
//                 });

//                 const io = req.app.get('io');
//                 if (io) io.emit('new-trade-log', failedLog);
//             }
//         }

//         console.log("=========================================\n");
//         res.status(200).json({ success: true, message: "Real Webhook processed & Logged" });

//     } catch (error) {
//         console.error("Webhook Error:", error);
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// };

// module.exports = { handleTradingViewAlert };



const Broker = require('../models/Broker');
const AlgoTradeLog = require('../models/AlgoTradeLog');
const axios = require('axios');
const { getOptionSecurityId } = require('../services/instrumentService'); 

const DHAN_API_URL = "https://api.dhan.co/orders";

const symbolMapper = {
    "HDFCBANK": { id: "1333", exchange: "NSE_EQ" },
    "YESBANK": { id: "11915", exchange: "NSE_EQ" },
    "TATASTEEL": { id: "3499", exchange: "NSE_EQ" }
};

// 🔥 HELPER 1: Strike Price Gap Calculator 🔥
const getStrikeStep = (symbol) => {
    const sym = symbol.toUpperCase();
    if (sym.includes("BANKNIFTY")) return 100;
    if (sym.includes("FINNIFTY")) return 50;
    if (sym.includes("MIDCPNIFTY")) return 25; 
    if (sym.includes("NIFTY")) return 50;
    if (sym.includes("SENSEX")) return 100;
    return 50; // Default fallback
};

// 🔥 HELPER 2: STRICT Real Live Price Fetcher (NO DUMMY DATA) 🔥
const fetchLivePrice = async (symbol) => {
    try {
        console.log(`📡 Fetching Live Price for ${symbol} from Global Market...`);
        
        let ticker = "";
        const upperSymbol = symbol.toUpperCase();

        if (upperSymbol.includes("BANKNIFTY")) {
            ticker = "^NSEBANK";
        } else if (upperSymbol.includes("FINNIFTY")) {
            ticker = "NIFTY_FIN_SERVICE.NS"; 
        } else if (upperSymbol.includes("MIDCPNIFTY")) {
            ticker = "NIFTY_MIDCAP_SELECT.NS"; 
        } else if (upperSymbol.includes("NIFTY")) {
            ticker = "^NSEI";
        } else if (upperSymbol.includes("SENSEX")) {
            ticker = "^BSESN";
        } else {
            console.log(`⚠️ Live price ticker not found for: ${symbol}`);
            return null;
        }

        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m`;
        
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });

        // Agar Yahoo result na de, toh immediately error throw karein
        if (!response.data.chart.result) {
             throw new Error("Yahoo returned null result for this ticker.");
        }

        const ltp = response.data.chart.result[0].meta.regularMarketPrice;
        console.log(`✅ Real LTP Received: ${ltp}`);
        return ltp;

    } catch (error) {
        console.error("❌ Error fetching exact Real-time LTP:", error.message);
        return null; // Strict mode: Dummy price return nahi karna hai
    }
};

const handleTradingViewAlert = async (req, res) => {
    try {
        const alertData = req.body;
        
        console.log("\n=========================================");
        console.log("🔔 NEW WEBHOOK RECEIVED FROM TRADINGVIEW!");

        // 🔥 1. SECURITY CHECK (The Bouncer) 🔥
        const expectedSecret = process.env.WEBHOOK_SECRET;

        if (!alertData.secret_token || alertData.secret_token !== expectedSecret) {
            console.log("🚨 SECURITY ALERT: Unauthorized Webhook Attempt Blocked!");
            return res.status(401).json({ error: "Unauthorized: Invalid or Missing Secret Token" });
        }

        console.log("✅ Security Check Passed! Valid Token Received.");

        // 🔥 2. PAYLOAD VALIDATION 🔥
        if (!alertData.action || !alertData.transaction_type || !alertData.symbol) {
            return res.status(400).json({ error: "Invalid webhook payload format" });
        }

        const activeBrokers = await Broker.find({ terminalOn: true, engineOn: true, name: "Dhan" });
        if (activeBrokers.length === 0) {
            return res.status(200).json({ message: "No active broker engine found." });
        }

        let securityId = null;
        let exchangeSegment = null;
        let finalSymbolName = alertData.symbol;

        let drvExpiryDate = null;
        let drvOptionType = null;
        let drvStrikePrice = null;
        
        // 🎯 THE ATM MAGIC LOGIC 🎯
        let targetStrike = alertData.strike ? alertData.strike.toString().toUpperCase() : null;

        if (targetStrike === "ATM") {
            console.log(`🔄 ATM Logic Triggered for ${alertData.symbol}. Fetching Market Price...`);
            
            const ltp = await fetchLivePrice(alertData.symbol);
            
            // 🛑 KILL SWITCH LOGIC STARTS HERE 🛑
            if (!ltp) {
                console.log(`🚨 TRADE ABORTED: Live market price not available for ${alertData.symbol}.`);
                
                // Frontend par failed logs dikhane ke liye loop
                for (const broker of activeBrokers) {
                    const failedLog = await AlgoTradeLog.create({
                        brokerId: broker._id,
                        brokerName: broker.name,
                        symbol: alertData.symbol,
                        action: alertData.action,
                        quantity: alertData.quantity || 1,
                        status: 'FAILED',
                        message: "Trade Aborted: Live market price not available for ATM calculation. (Market Closed/API Error)" 
                    });
                    const io = req.app.get('io');
                    if (io) io.emit('new-trade-log', failedLog);
                }

                // Yahan se function wapas laut jayega, aage execution nahi hoga
                return res.status(400).json({ error: "Trade Aborted due to missing Live Price (LTP)." });
            }
            // 🛑 KILL SWITCH LOGIC ENDS HERE 🛑

            const step = getStrikeStep(alertData.symbol);
            targetStrike = (Math.round(ltp / step) * step).toString();
            
            console.log(`📊 Live Price: ${ltp} | Calculated ATM Strike: ${targetStrike}`);
        }

        if (targetStrike && alertData.option_type) {
            const optionData = getOptionSecurityId(alertData.symbol, targetStrike, alertData.option_type);
            
            if (!optionData) {
                console.log(`❌ Option Contract [${alertData.symbol} ${targetStrike} ${alertData.option_type}] not found!`);
                return res.status(400).json({ error: "Option contract not found for current expiry." });
            }
            
            securityId = optionData.id;
            exchangeSegment = optionData.exchange;
            finalSymbolName = optionData.tradingSymbol; 
            
            drvExpiryDate = optionData.expiry; 
            drvOptionType = optionData.optionType; 
            drvStrikePrice = parseFloat(optionData.strike);
            
            console.log(`🎯 F&O Mapped: ${finalSymbolName} (ID: ${securityId}) | Type: ${drvOptionType} | Exp: ${drvExpiryDate}`);
            
        } else {
            const instrumentInfo = symbolMapper[alertData.symbol];
            if (!instrumentInfo) return res.status(400).json({ error: "Equity Security ID not found." });
            securityId = instrumentInfo.id;
            exchangeSegment = instrumentInfo.exchange;
        }

        let tradeAction = "BUY";
        if (alertData.transaction_type === "LONG" && alertData.action === "EXIT") tradeAction = "SELL";
        if (alertData.transaction_type === "SHORT" && alertData.action === "ENTRY") tradeAction = "SELL";
        if (alertData.transaction_type === "SHORT" && alertData.action === "EXIT") tradeAction = "BUY";

        const dhanProductType = alertData.product_type === "MIS" ? "INTRADAY" : "MARGIN";

        for (const broker of activeBrokers) {
            const actualToken = broker.apiSecret || broker.accessToken || broker.apiKey || broker.token;
            
            if (!actualToken || !broker.clientId) {
                console.log(`⚠️ WARNING: API Token or Client ID is missing for Broker: ${broker.name}.`);
                continue;
            }

            const dhanOrderPayload = {
                dhanClientId: String(broker.clientId),
                correlationId: String(`TM_${Date.now()}`),
                transactionType: tradeAction,
                exchangeSegment: exchangeSegment,
                productType: dhanProductType,
                orderType: "MARKET",
                validity: "DAY",
                tradingSymbol: "", 
                securityId: String(securityId),
                quantity: parseInt(alertData.quantity, 10) || 1,
                disclosedQuantity: 0,
                price: 0,
                triggerPrice: 0,
                afterMarketOrder: false,
                amoTime: "OPEN",
                boProfitValue: 0,
                boStopLossValue: 0
            };

            console.log(`\n🚀 Firing REAL Order for: ${broker.clientId} | ${finalSymbolName}`);
            console.log(`🔑 Using Token: ${actualToken.substring(0, 5)}...**********`);
            
            try {
                const response = await axios.post(DHAN_API_URL, dhanOrderPayload, {
                    headers: {
                        'access-token': actualToken, 
                        'client-id': broker.clientId,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });
                
                console.log("🟢 ORDER SUCCESS:", response.data);

                const savedLog = await AlgoTradeLog.create({
                    brokerId: broker._id,
                    brokerName: broker.name,
                    symbol: finalSymbolName, 
                    action: tradeAction,
                    quantity: alertData.quantity || 1,
                    status: 'SUCCESS',
                    message: "Order placed successfully",
                    orderId: response.data.orderId || "N/A"
                });

                const io = req.app.get('io');
                if (io) io.emit('new-trade-log', savedLog);

            } catch (error) {
                console.error("🔴 ORDER FAILED!");
                const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;

                const failedLog = await AlgoTradeLog.create({
                    brokerId: broker._id,
                    brokerName: broker.name,
                    symbol: finalSymbolName,
                    action: tradeAction,
                    quantity: alertData.quantity || 1,
                    status: 'FAILED',
                    message: errorMessage 
                });

                const io = req.app.get('io');
                if (io) io.emit('new-trade-log', failedLog);
            }
        }

        console.log("=========================================\n");
        res.status(200).json({ success: true, message: "Real Webhook processed & Logged" });

    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = { handleTradingViewAlert };