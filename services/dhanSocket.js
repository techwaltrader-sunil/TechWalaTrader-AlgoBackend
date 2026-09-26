const WebSocket = require('ws');
const mongoose = require('mongoose'); 

const { getOptionChainTokens } = require('./instrumentService');

const brokerSchema = new mongoose.Schema({}, { strict: false, collection: 'brokers' });
const Broker = mongoose.models.Broker || mongoose.model('Broker', brokerSchema);

let dhanWs = null;
let isConnected = false;

// 🎯 WebSocket Connection Function
const connectDhanWebSocket = async (io) => {
  // 👈 🎯 THE BULLETPROOF FIX: Variable को फंक्शन के अंदर डिफाइन करो
  let currentNiftySpot = 0; 
  let requestedExpiry = null

  setTimeout(async () => {
    try {
        const broker = await Broker.findOne({ name: "Dhan" });
        if (!broker || !broker.clientId || !broker.apiSecret) {
            console.error("❌ Dhan credentials missing in DB. Cannot start WebSocket.");
            return;
        }

        const CLIENT_ID = broker.clientId;
        const ACCESS_TOKEN = broker.apiSecret;

        const WS_URL = `wss://api-feed.dhan.co?version=2&token=${ACCESS_TOKEN}&clientId=${CLIENT_ID}&authType=2`;

        console.log("🔄 Connecting to DhanHQ Live Market WebSocket...");
        dhanWs = new WebSocket(WS_URL);

        dhanWs.on('open', () => {
            isConnected = true;
            console.log("✅ DhanHQ WebSocket Connected Successfully!");

            const subscriptionPayload = {
                "RequestCode": 15,
                "InstrumentCount": 1,
                "InstrumentList": [ 
                    {
                        "ExchangeSegment": "IDX_I", 
                        "SecurityId": "13" 
                    }
                ]
            };

            dhanWs.send(JSON.stringify(subscriptionPayload));
            console.log("📡 JSON Subscription request sent for NIFTY Spot!");
        });

        dhanWs.on('message', (data) => {
            // 🚨 THE RADAR: अगर Dhan कोई टेक्स्ट या JSON एरर भेजता है, तो उसे पकड़ो!
            if (typeof data === 'string' || (Buffer.isBuffer(data) && data[0] === 123)) { 
                console.log("📝 Dhan Text/Error Message:", data.toString());
                return;
            }

            try {
                const buffer = Buffer.from(data);
                
                if (buffer.length >= 8) {
                    // 🎯 THE MASTER FIX: Dhan v2 API में OpCode Byte 0 पर होता है, 2 पर नहीं!
                    const opCode = buffer.readInt8(0); 
                    const securityId = buffer.readUInt32LE(4);

                    if (opCode === 2 && buffer.length >= 12) {
                        const ltp = buffer.readFloatLE(8); 

                        const tickData = {
                            securityId: securityId.toString(),
                            ltp: Number(ltp.toFixed(2)),
                            type: 'LTP'
                        };

                        // 🎯 Nifty Spot (13) का प्राइस आते ही उसे सेव कर लो
                        if (securityId === 13) {
                            let wasZero = (currentNiftySpot === 0);
                            currentNiftySpot = tickData.ltp;

                            if (wasZero && requestedExpiry) {
                                let instrumentList = getOptionChainTokens("NIFTY", requestedExpiry, currentNiftySpot);
                                
                                if (instrumentList.length > 0 && dhanWs.readyState === 1) {
                                    // 🚀 THE 100-LIMIT FIX: 100-100 के टुकड़ों में भेजो
                                    for (let i = 0; i < instrumentList.length; i += 100) {
                                        const chunk = instrumentList.slice(i, i + 100);
                                        // 🎯 FIX: Options के लिए 15 की जगह 17 भेज रहे हैं ताकि OI/Volume मिले
                                        const payload = { "RequestCode": 17, "InstrumentCount": chunk.length, "InstrumentList": chunk };
                                        dhanWs.send(JSON.stringify(payload));
                                    }
                                    console.log(`🚀 Auto-Subscribed to ${instrumentList.length} Options (in chunks) with RequestCode 17!`);
                                }
                            }
                        }

                        // 🚀 Broadcast to Frontend (चार्ट और टेबल को लाइव करो!)
                        io.emit('market-tick', tickData);
                    }
                    // 🚀 THE NEW FIX: OpCode 4 (Quote Data - LTP + Volume)
                    else if (opCode === 4 && buffer.length >= 50) {
                        const ltp = buffer.readFloatLE(8);
                        const volume = buffer.readInt32LE(22); // Volume 22nd byte पर होता है
                        
                        io.emit('market-tick', { 
                            securityId: securityId.toString(), 
                            ltp: Number(ltp.toFixed(2)), 
                            volume: volume,
                            type: 'QUOTE' 
                        });
                    }
                    // 🚀 THE NEW FIX: OpCode 5 (OI Data)
                    else if (opCode === 5 && buffer.length >= 12) {
                        const oi = buffer.readUInt32LE(8); // OI 8th byte पर होता है
                        
                        io.emit('market-tick', { 
                            securityId: securityId.toString(), 
                            oi: oi,
                            type: 'OI' 
                        });
                    }
                }
            } catch (err) {
                console.error("❌ Binary Parse Error:", err.message);
            }
        });

        // =========================================================
        // 🎯 सुनिश्चित करें कि यह ब्लॉक `connectDhanWebSocket` के अंदर ही है
        io.on('connection', (clientSocket) => {
            clientSocket.on('subscribe-options-chain', (reqData) => {
                const { expiry, fallbackSpot } = reqData; 
                let formattedExpiry = expiry && expiry.length === 10 ? expiry : "2026-09-29";
                requestedExpiry = formattedExpiry; 

                const spotToUse = currentNiftySpot > 0 ? currentNiftySpot : (fallbackSpot || 23200);

                if (spotToUse > 0) {
                    let instrumentList = getOptionChainTokens("NIFTY", requestedExpiry, spotToUse);
                    
                    if (instrumentList.length > 0 && dhanWs && dhanWs.readyState === 1) {
                        // 🚀 THE 100-LIMIT FIX: 100-100 ke tukdon me bhejo
                        for (let i = 0; i < instrumentList.length; i += 100) {
                            const chunk = instrumentList.slice(i, i + 100);
                            const subscriptionPayload = {
                                "RequestCode": 17,
                                "InstrumentCount": chunk.length,
                                "InstrumentList": chunk
                            };
                            dhanWs.send(JSON.stringify(subscriptionPayload));
                        }
                        console.log(`🚀 Force-Subscribed to ${instrumentList.length} Options using Spot: ${spotToUse} (in chunks)!`);
                    }
                }
            });
        });
        // =========================================================

        dhanWs.on('close', () => {
            isConnected = false;
            console.warn("⚠️ DhanHQ WebSocket Disconnected. Trying to reconnect in 5s...");
            setTimeout(() => connectDhanWebSocket(io), 5000); 
        });

        dhanWs.on('error', (err) => {
            console.error("❌ DhanHQ WebSocket Error:", err.message);
        });

    } catch (error) {
        console.error("❌ Failed to initialize Dhan WebSocket:", error.message);
    }
  }, 3000);
};

module.exports = { connectDhanWebSocket };