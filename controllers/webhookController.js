

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

const handleTradingViewAlert = async (req, res) => {
    try {
        const alertData = req.body;
        
        console.log("\n=========================================");
        console.log("🔔 NEW WEBHOOK RECEIVED FROM TRADINGVIEW!");

        // 🔥 1. SECURITY CHECK (The Bouncer) 🔥
        const expectedSecret = process.env.WEBHOOK_SECRET;

        // Agar webhook me token nahi hai, ya galat hai
        if (!alertData.secret_token || alertData.secret_token !== expectedSecret) {
            console.log("🚨 SECURITY ALERT: Unauthorized Webhook Attempt Blocked!");
            return res.status(401).json({ error: "Unauthorized: Invalid or Missing Secret Token" });
        }

        console.log("✅ Security Check Passed! Valid Token Received.");

        // 🔥 2. PAYLOAD VALIDATION 🔥
        if (!alertData.action || !alertData.transaction_type || !alertData.symbol) {
            return res.status(400).json({ error: "Invalid webhook payload format" });
        }

        let securityId = null;
        let exchangeSegment = null;
        let finalSymbolName = alertData.symbol;

        // F&O Variables
        let drvExpiryDate = null;
        let drvOptionType = null;
        let drvStrikePrice = null;

        if (alertData.strike && alertData.option_type) {
            const optionData = getOptionSecurityId(alertData.symbol, alertData.strike, alertData.option_type);
            
            if (!optionData) {
                console.log(`❌ Option Contract [${alertData.symbol} ${alertData.strike} ${alertData.option_type}] not found!`);
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
        const activeBrokers = await Broker.find({ terminalOn: true, engineOn: true, name: "Dhan" });

        if (activeBrokers.length === 0) {
            return res.status(200).json({ message: "No active broker engine found." });
        }

        for (const broker of activeBrokers) {
            // 🔥 THE MAGIC FIX: Database me field ka naam chahe jo ho, ye auto-detect kar lega
            const actualToken = broker.apiSecret || broker.accessToken || broker.apiKey || broker.token;
            
            if (!actualToken || !broker.clientId) {
                console.log(`⚠️ WARNING: API Token or Client ID is missing for Broker: ${broker.name}. Please check your Brokers page!`);
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
            // Ye line hume terminal me batayegi ki token sahi se ja raha hai ya nahi (Security ke liye sirf shuruat ke 5 akshar print karenge)
            console.log(`🔑 Using Token: ${actualToken.substring(0, 5)}...**********`);
            
            try {
                const response = await axios.post(DHAN_API_URL, dhanOrderPayload, {
                    headers: {
                        'access-token': actualToken, // ✅ Yahan updated token laga diya
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