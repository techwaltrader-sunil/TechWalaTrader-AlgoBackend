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

// 🔥 HELPER 2: STRICT Real Live Price Fetcher (NO DUMMY DATA) 🔥
const fetchLivePrice = async (symbol) => {
    try {
        console.log(`📡 Fetching Live Price for ${symbol} from Global Market...`);
        let ticker = "";
        const upperSymbol = symbol.toUpperCase();

        if (upperSymbol.includes("BANKNIFTY")) ticker = "^NSEBANK";
        else if (upperSymbol.includes("FINNIFTY")) ticker = "NIFTY_FIN_SERVICE.NS"; 
        else if (upperSymbol.includes("MIDCPNIFTY")) ticker = "NIFTY_MIDCAP_SELECT.NS"; 
        else if (upperSymbol.includes("NIFTY")) ticker = "^NSEI";
        else if (upperSymbol.includes("SENSEX")) ticker = "^BSESN";
        else return null;

        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m`;
        const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });

        if (response.data.chart.result) {
            return response.data.chart.result[0].meta.regularMarketPrice;
        }
        return null;
    } catch (error) {
        console.error(`❌ Yahoo Finance API Failed for ${symbol}:`, error.message);
        // STRICT RULE: Return null, DO NOT use hardcoded prices!
        return null; 
    }
};

const handleTradingViewAlert = async (req, res) => {
    try {
        const alertData = req.body;
        console.log("\n=========================================");
        console.log("🔔 NEW WEBHOOK RECEIVED FROM TRADINGVIEW!");

        const expectedSecret = process.env.WEBHOOK_SECRET;

        if (!alertData.secret_token || alertData.secret_token !== expectedSecret) {
            console.log("🚨 SECURITY ALERT: Unauthorized Webhook Attempt Blocked!");
            return res.status(401).json({ error: "Unauthorized: Invalid Secret Token" });
        }

        if (!alertData.action || !alertData.transaction_type || !alertData.symbol) {
            return res.status(400).json({ error: "Invalid webhook payload format" });
        }

        const activeBrokers = await Broker.find({ terminalOn: true, engineOn: true, name: "Dhan" });
        if (activeBrokers.length === 0) {
            return res.status(200).json({ message: "No active broker engine found." });
        }

        let tradeAction = "BUY";
        if (alertData.transaction_type === "LONG" && alertData.action === "EXIT") tradeAction = "SELL";
        if (alertData.transaction_type === "SHORT" && alertData.action === "ENTRY") tradeAction = "SELL";
        if (alertData.transaction_type === "SHORT" && alertData.action === "EXIT") tradeAction = "BUY";

        let securityId = null;
        let exchangeSegment = null;
        let finalSymbolName = alertData.symbol;
        let targetStrike = alertData.strike ? alertData.strike.toString().toUpperCase().trim() : null;

        // 🎯 THE STRICT ATM MAGIC LOGIC 🔥
        if (targetStrike === "ATM") {
            
            // Priority 1: TradingView ka bheja hua exact price ({{close}})
            // Priority 2: Agar TV se nahi aaya, tab Yahoo API call karo
            let ltp = alertData.price ? parseFloat(alertData.price) : await fetchLivePrice(alertData.symbol);
            
            // 🛑 STRICT KILL SWITCH: Agar dono se LTP nahi mila, to trade ABORT karo!
            if (!ltp) {
                console.log(`🚨 TRADE ABORTED: Missing Live Price for ${alertData.symbol}. No Dummy Trades allowed!`);
                
                for (const broker of activeBrokers) {
                    try {
                        const failedLog = await AlgoTradeLog.create({
                            brokerId: broker._id, 
                            brokerName: broker.name,
                            symbol: alertData.symbol, 
                            action: tradeAction, 
                            quantity: alertData.quantity || 1,
                            status: 'FAILED', 
                            orderId: "N/A",
                            message: "Trade Aborted: Live market price not available for ATM calculation (API Failed)." 
                        });
                        
                        const io = req.app.get('io') || global.io;
                        if (io) io.emit('new-trade-log', failedLog);
                    } catch(e) { console.error("DB Log Error:", e.message) }
                }
                return res.status(400).json({ error: "Trade Aborted due to missing LTP." });
            }

            console.log(`✅ Using LTP: ${ltp} for ATM Calculation`);
            const step = getStrikeStep(alertData.symbol);
            targetStrike = (Math.round(ltp / step) * step).toString();
        }

        if (targetStrike && alertData.option_type) {
            
            let optionData = null;
            try {
                optionData = getOptionSecurityId(alertData.symbol, targetStrike, alertData.option_type);
            } catch (err) {
                console.error("Option Security ID fetch failed safely:", err.message);
                optionData = null;
            }
            
            if (!optionData) {
                console.log(`❌ Option Contract [${alertData.symbol} ${targetStrike} ${alertData.option_type}] not found!`);
                
                for (const broker of activeBrokers) {
                    try {
                        const failedLog = await AlgoTradeLog.create({
                            brokerId: broker._id, 
                            brokerName: broker.name,
                            symbol: `${alertData.symbol} ${targetStrike} ${alertData.option_type}`, 
                            action: tradeAction, 
                            quantity: alertData.quantity || 1,
                            status: 'FAILED', 
                            orderId: "N/A",
                            message: `Trade Aborted: Option contract not found for calculated strike ${targetStrike}.`
                        });
                        
                        const io = req.app.get('io') || global.io;
                        if (io) io.emit('new-trade-log', failedLog);
                    } catch(e) { console.error("DB Log Error:", e.message) }
                }
                return res.status(400).json({ error: "Option contract not found." });
            }
            
            securityId = optionData.id;
            exchangeSegment = optionData.exchange;
            finalSymbolName = optionData.tradingSymbol; 
            
        } else {
            const instrumentInfo = symbolMapper[alertData.symbol];
            if (!instrumentInfo) return res.status(400).json({ error: "Equity Security ID not found." });
            securityId = instrumentInfo.id;
            exchangeSegment = instrumentInfo.exchange;
        }

        const dhanProductType = alertData.product_type === "MIS" ? "INTRADAY" : "MARGIN";

        for (const broker of activeBrokers) {
            const actualToken = broker.apiSecret || broker.accessToken || broker.apiKey || broker.token;
            if (!actualToken || !broker.clientId) continue;

            const dhanOrderPayload = {
                dhanClientId: String(broker.clientId), correlationId: String(`TM_${Date.now()}`),
                transactionType: tradeAction, exchangeSegment: exchangeSegment, productType: dhanProductType,
                orderType: "MARKET", validity: "DAY", tradingSymbol: "", securityId: String(securityId),
                quantity: parseInt(alertData.quantity, 10) || 1, disclosedQuantity: 0, price: 0, triggerPrice: 0,
                afterMarketOrder: false, amoTime: "OPEN", boProfitValue: 0, boStopLossValue: 0
            };

            try {
                const response = await axios.post(DHAN_API_URL, dhanOrderPayload, {
                    headers: { 'access-token': actualToken, 'client-id': broker.clientId, 'Content-Type': 'application/json', 'Accept': 'application/json' }
                });
                
                const respData = response.data;
                const orderStatus = respData.orderStatus ? respData.orderStatus.toUpperCase() : "UNKNOWN";

                if (orderStatus === "REJECTED") {
                    console.log("🔴 ORDER REJECTED BY BROKER RMS:", respData.remarks);
                    
                    const rejectReason = respData.remarks || "Order rejected by broker (Insufficient Funds / RMS Rule).";
                    const failedLog = await AlgoTradeLog.create({
                        brokerId: broker._id, brokerName: broker.name, symbol: finalSymbolName, 
                        action: tradeAction, quantity: alertData.quantity || 1, status: 'FAILED',
                        message: rejectReason, orderId: respData.orderId || "N/A"
                    });

                    const io = req.app.get('io') || global.io;
                    if (io) io.emit('new-trade-log', failedLog);

                } else {
                    console.log(`🟢 ORDER SUCCESS (${orderStatus}):`, respData.orderId);

                    const savedLog = await AlgoTradeLog.create({
                        brokerId: broker._id, brokerName: broker.name, symbol: finalSymbolName, 
                        action: tradeAction, quantity: alertData.quantity || 1, status: 'SUCCESS',
                        message: `Order placed successfully (${orderStatus})`, orderId: respData.orderId || "N/A"
                    });

                    const io = req.app.get('io') || global.io;
                    if (io) io.emit('new-trade-log', savedLog);
                }

            } catch (error) {
                const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
                console.error("🔴 API CRASH FAILED!", errorMessage);

                const failedLog = await AlgoTradeLog.create({
                    brokerId: broker._id, brokerName: broker.name, symbol: finalSymbolName,
                    action: tradeAction, quantity: alertData.quantity || 1, status: 'FAILED',
                    message: errorMessage, orderId: "N/A"
                });

                const io = req.app.get('io') || global.io;
                if (io) io.emit('new-trade-log', failedLog);
            }
        }

        res.status(200).json({ success: true, message: "Real Webhook processed & Logged" });

    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// =========================================================================
// 🚨 NEW: DHAN POSTBACK / WEBHOOK HANDLER (For late rejections & Ghost Trades)
// =========================================================================
const handleDhanPostback = async (req, res) => {
    try {
        const postbackData = req.body;
        
        // Dhan hamesha webhook me orderId aur orderStatus bhejta hai
        const { orderId, orderStatus, remarks, tradingSymbol } = postbackData;

        // Agar orderId nahi hai, to aage mat badho
        if (!orderId) {
            return res.status(200).send("IGNORED: No Order ID"); // Webhook ko hamesha 200 dena chahiye
        }

        console.log(`\n🔔 [DHAN WEBHOOK] Order: ${orderId} | Status: ${orderStatus} | Symbol: ${tradingSymbol}`);

        // Agar order kisi wajah se REJECT ho gaya ho (Late RMS Rejection)
        if (orderStatus && orderStatus.toUpperCase() === 'REJECTED') {
            
            // Database me us ACTIVE deployment ko dhundo jiska order reject hua hai
            // Note: Hum fallback ke liye 'tradedSymbol' bhi use kar rahe hain
            const Deployment = require('../models/Deployment'); // Model import
            
            const failedDeployment = await Deployment.findOne({
                status: 'ACTIVE',
                $or: [
                    { orderId: orderId }, // Agar aapne DB me orderId save kiya hai
                    { tradedSymbol: tradingSymbol } // Fallback option
                ]
            });

            if (failedDeployment) {
                const failReason = remarks || "Rejected by Dhan RMS (Caught via Webhook)";

                // 🛑 GHOST TRADE KILL SWITCH 🛑
                failedDeployment.status = 'FAILED'; 
                failedDeployment.exitRemarks = failReason;
                failedDeployment.pnl = 0; // P&L ko strictly 0 kar do
                await failedDeployment.save();

                console.log(`🛑 [GHOST TRADE KILLED] Webhook marked deployment as FAILED. Reason: ${failReason}`);
            } else {
                console.log(`ℹ️ Order ${orderId} rejected, but no matching ACTIVE deployment found (Already handled).`);
            }
        }

        // Dhan ko batao ki humne message receive kar liya (200 OK)
        return res.status(200).json({ success: true, message: "Dhan Postback processed" });

    } catch (error) {
        console.error("❌ Dhan Postback Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

// 🔥 UPDATE EXPORTS: Dono functions ko export karo
module.exports = { 
    handleTradingViewAlert,
    handleDhanPostback // Naya function add kiya
};