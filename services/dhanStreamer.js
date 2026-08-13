// const WebSocket = require('ws');
// const EventEmitter = require('events');

// class DhanStreamer extends EventEmitter {
//     constructor() {
//         super();
//         this.ws = null;
//         this.isConnected = false;
//         this.subscribedTokens = new Set();
//         this.clientId = null;
//         this.accessToken = null;
//         this.reconnectTimer = null;
//     }

//     // =========================================================
//     // 1. CONNECTION & AUTHENTICATION
//     // =========================================================
//     connect(clientId, accessToken) {
//         this.clientId = clientId;
//         this.accessToken = accessToken;

//         const wsUrl = `wss://api-feed.dhan.co`; // Dhan Live Market Feed URL

//         console.log(`🔌 [WEBSOCKET] Connecting to Dhan Live Stream for Client: ${this.clientId}...`);
        
//         this.ws = new WebSocket(wsUrl);

//         this.ws.on('open', () => {
//             this.isConnected = true;
//             console.log(`✅ [WEBSOCKET] Connected Successfully!`);
//             this.emit('connected');

//             // Send Authorization Packet
//             const authPacket = this._createAuthPacket();
//             this.ws.send(authPacket);

//             // Agar internet tutne ke baad reconnect hua hai, toh purane tokens wapas subscribe karo
//             if (this.subscribedTokens.size > 0) {
//                 console.log(`🔄 [WEBSOCKET] Re-subscribing to ${this.subscribedTokens.size} active tokens...`);
//                 this._resubscribeAll();
//             }
//         });

//         this.ws.on('message', (data) => {
//             this._processTick(data);
//         });

//         this.ws.on('close', () => {
//             this.isConnected = false;
//             console.log(`⚠️ [WEBSOCKET] Connection Closed! Auto-reconnecting in 3 seconds...`);
//             this._handleReconnect();
//         });

//         this.ws.on('error', (err) => {
//             console.error(`❌ [WEBSOCKET ERROR]`, err.message);
//         });
//     }

//     // =========================================================
//     // 2. SUBSCRIPTION MANAGEMENT
//     // =========================================================
//     subscribeTokens(exchange, tokensArray) {
//         // Tokens ko Set me add karo taki duplicate na ho
//         tokensArray.forEach(token => this.subscribedTokens.add(JSON.stringify({ exchange, token: String(token) })));
        
//         if (this.isConnected) {
//             const subPacket = this._createSubscribePacket(exchange, tokensArray);
//             this.ws.send(subPacket);
//             console.log(`📡 [WEBSOCKET] Subscribed to ${tokensArray.length} tokens.`);
//         } else {
//             console.log(`⏳ [WEBSOCKET] Engine offline. Tokens queued for subscription upon connection.`);
//         }
//     }

//     unsubscribeAll() {
//         this.subscribedTokens.clear();
//         console.log(`🛑 [WEBSOCKET] Cleared all token subscriptions.`);
//         // Note: Dhan API generally clears subscriptions if you send a blank sub request or disconnect.
//     }

//     _resubscribeAll() {
//         // Group tokens by exchange
//         const nseTokens = [];
//         const bseTokens = [];
        
//         this.subscribedTokens.forEach(itemStr => {
//             const item = JSON.parse(itemStr);
//             if (item.exchange === "NSE_FNO") nseTokens.push(item.token);
//             else if (item.exchange === "BSE_FNO") bseTokens.push(item.token);
//         });

//         if (nseTokens.length > 0) this.ws.send(this._createSubscribePacket("NSE_FNO", nseTokens));
//         if (bseTokens.length > 0) this.ws.send(this._createSubscribePacket("BSE_FNO", bseTokens));
//     }

//     // =========================================================
//     // 3. BINARY DATA PARSING (TICK PROCESSING)
//     // =========================================================
//     _processTick(data) {
//         try {
//             // Dhan WebSocket sends data in Binary Buffer format.
//             // 8-Byte Header + Payload
//             const buffer = Buffer.from(data);
            
//             // Validate packet length (Minimum header size is 8 bytes)
//             if (buffer.length < 8) return;

//             const feedResponseCode = buffer.readUInt8(0);
            
//             // Response Code 2 = Ticker Data (LTP)
//             if (feedResponseCode === 2 && buffer.length >= 16) {
//                 const exchangeSegment = buffer.readUInt8(3);
//                 const securityId = buffer.readUInt32LE(4);
//                 const ltp = buffer.readFloatLE(8); // LTP is a float starting at byte 8

//                 // Format string for our Engine
//                 const exchangeMap = { 0: "NSE", 1: "BSE", 2: "NSE_FNO", 3: "BSE_FNO", 4: "MCX" };
//                 const exchangeStr = exchangeMap[exchangeSegment] || "NSE_FNO";

//                 // MAIN ENGINE KO EVENT BHEJNA
//                 this.emit('tick', {
//                     exchange: exchangeStr,
//                     securityId: String(securityId),
//                     ltp: Number(ltp.toFixed(2)),
//                     timestamp: new Date()
//                 });
//             }
//             // Add other Response Codes (like Full Depth / Quote) here later if needed.
//         } catch (e) {
//             console.error(`❌ [WEBSOCKET PARSE ERROR]`, e.message);
//         }
//     }

//     // =========================================================
//     // 4. UTILITY / HELPERS
//     // =========================================================
//     _handleReconnect() {
//         clearTimeout(this.reconnectTimer);
//         this.reconnectTimer = setTimeout(() => {
//             if (!this.isConnected && this.clientId) {
//                 this.connect(this.clientId, this.accessToken);
//             }
//         }, 3000);
//     }

//     _createAuthPacket() {
//         // Buffer allocation for Auth Request (Code 11)
//         // Adjust buffer size based on exact Dhan string lengths if doing strict binary,
//         // For Dhan's hybrid JSON/Binary, some auths accept JSON. 
//         // Using Dhan's standard JSON Auth structure for handshake:
//         return JSON.stringify({
//             RequestCode: 11,
//             InstrumentCount: 0,
//             WssClientId: this.clientId,
//             WssAccessToken: this.accessToken
//         });
//     }

//     _createSubscribePacket(exchange, tokensArray) {
//         const exchangeMap = { "NSE": 0, "BSE": 1, "NSE_FNO": 2, "BSE_FNO": 3, "MCX": 4 };
//         const exchCode = exchangeMap[exchange] || 2;

//         const instrumentList = tokensArray.map(token => ({
//             ExchangeSegment: exchCode,
//             SecurityId: String(token)
//         }));

//         // Using Dhan's standard Ticker Subscription (Code 21) or Market Depth (Code 17)
//         return JSON.stringify({
//             RequestCode: 21, // 21 is for Ticker (LTP only)
//             InstrumentCount: tokensArray.length,
//             InstrumentList: instrumentList
//         });
//     }
// }

// // Singleton Instance (Pura backend sirf ek hi connection use karega)
// const dhanStreamer = new DhanStreamer();
// module.exports = dhanStreamer;


// const WebSocket = require('ws');
// const EventEmitter = require('events');

// class DhanStreamer extends EventEmitter {
//     constructor() {
//         super();
//         this.ws = null;
//         this.isConnected = false;
//         this.isConnecting = false;
//         this.subscribedTokens = new Set();
//         this.clientId = null;
//         this.accessToken = null;
//         this.reconnectTimer = null;
//     }

//     // =========================================================
//     // 1. CONNECTION & URL AUTHENTICATION (DHAN v2)
//     // =========================================================
//     connect(clientId, accessToken) {
//         if (this.isConnected || this.isConnecting) return; 
        
//         this.clientId = String(clientId);
//         this.accessToken = String(accessToken);
//         this.isConnecting = true;

//         // 🔥 THE REAL FIX: Auth is passed directly in the URL!
//         const wsUrl = `wss://api-feed.dhan.co?version=2&token=${this.accessToken}&clientId=${this.clientId}&authType=2`;

//         console.log(`🔌 [WEBSOCKET] Connecting to Dhan Live Stream for Client: ${this.clientId}...`);
        
//         this.ws = new WebSocket(wsUrl);

//         this.ws.on('open', () => {
//             this.isConnecting = false;
//             this.isConnected = true;
//             console.log(`✅ [WEBSOCKET] Connection Opened & Authenticated Successfully! Engine is LIVE 🟢`);
//             this.emit('connected');

//             // Reconnect hone par purane tokens wapas subscribe karna
//             if (this.subscribedTokens.size > 0) {
//                 console.log(`🔄 [WEBSOCKET] Re-subscribing to ${this.subscribedTokens.size} active tokens...`);
//                 this._resubscribeAll();
//             }
//         });

//         this.ws.on('message', (data) => {
//             this._processTick(data);
//         });

//         this.ws.on('close', () => {
//             this.isConnected = false;
//             this.isConnecting = false;
//             console.log(`⚠️ [WEBSOCKET] Connection Closed! Auto-reconnecting in 5 seconds...`);
//             this._handleReconnect();
//         });

//         this.ws.on('error', (err) => {
//             this.isConnecting = false;
//             console.error(`❌ [WEBSOCKET ERROR]`, err.message);
//         });
//     }

//     // =========================================================
//     // 2. JSON SUBSCRIPTION MANAGEMENT
//     // =========================================================
//     subscribeTokens(exchange, tokensArray) {
//         tokensArray.forEach(token => this.subscribedTokens.add(JSON.stringify({ exchange, token: String(token) })));
        
//         if (this.isConnected) {
//             // 🔥 Request Code 15 for Ticker Data (As per Documentation)
//             const subPacket = this._createSubscribePacket(exchange, tokensArray, 15);
//             this.ws.send(subPacket);
//             console.log(`📡 [WEBSOCKET] Subscribed to ${tokensArray.length} tokens.`);
//         } else {
//             console.log(`⏳ [WEBSOCKET] Engine offline. Tokens queued for subscription upon connection.`);
//         }
//     }

//     unsubscribeAll() {
//         this.subscribedTokens.clear();
//         console.log(`🛑 [WEBSOCKET] Cleared all token subscriptions.`);
//     }

//     _resubscribeAll() {
//         const nseTokens = [];
//         const bseTokens = [];
//         const idxTokens = [];
        
//         this.subscribedTokens.forEach(itemStr => {
//             const item = JSON.parse(itemStr);
//             if (item.exchange === "NSE_FNO" || item.exchange === "NSE") nseTokens.push(item.token);
//             else if (item.exchange === "BSE_FNO" || item.exchange === "BSE") bseTokens.push(item.token);
//             else if (item.exchange === "IDX_I") idxTokens.push(item.token);
//         });

//         if (nseTokens.length > 0) this.ws.send(this._createSubscribePacket("NSE_FNO", nseTokens, 15));
//         if (bseTokens.length > 0) this.ws.send(this._createSubscribePacket("BSE_FNO", bseTokens, 15));
//         if (idxTokens.length > 0) this.ws.send(this._createSubscribePacket("IDX_I", idxTokens, 15));
//     }

//     // =========================================================
//     // 3. BINARY DATA PARSING (TICK PROCESSING)
//     // =========================================================
//     _processTick(data) {
//         try {
//             const buffer = Buffer.from(data);
//             if (buffer.length < 8) return;

//             const feedResponseCode = buffer.readUInt8(0);

//             // 🟢 AUTH RESPONSE (11)
//             if (feedResponseCode === 11) {
//                 this.isConnected = true;
//                 const responseMsg = buffer.length >= 68 ? buffer.slice(18, 68).toString('utf8').replace(/\0/g, '').trim() : "Success";
//                 console.log(`✅ [WEBSOCKET] Authenticated Successfully! Message: ${responseMsg}`);
//                 this.emit('connected');
//                 if (this.subscribedTokens.size > 0) {
//                     this._resubscribeAll();
//                 }
//                 return;
//             }

//             // 🛑 SERVER DISCONNECT (50)
//             if (feedResponseCode === 50) {
//                 console.log(`🛑 [WEBSOCKET] Dhan Server forcefully disconnected the feed.`);
//                 return;
//             }
            
//             // 🟢 TICKER / QUOTE / FULL DATA (Catching 2, 4, and 8)
//             // LTP hamesha byte offset 8 par hi hota hai chahe packet koi bhi ho!
//             if ([2, 4, 8].includes(feedResponseCode) && buffer.length >= 12) {
//                 const exchangeSegment = buffer.readUInt8(3);
//                 const securityId = buffer.readUInt32LE(4);
//                 const ltp = buffer.readFloatLE(8); 

//                 const exchangeMap = { 0: "NSE_EQ", 1: "BSE_EQ", 2: "NSE_FNO", 3: "BSE_FNO", 4: "MCX", 5: "IDX_I" };
//                 const exchangeStr = exchangeMap[exchangeSegment] || "NSE_FNO";

//                 this.emit('tick', {
//                     exchange: exchangeStr,
//                     securityId: String(securityId),
//                     ltp: Number(ltp.toFixed(2)),
//                     timestamp: new Date()
//                 });
//             }
//         } catch (e) {
//             // Silently ignore corrupt packets
//         }
//     }

//     _handleReconnect() {
//         clearTimeout(this.reconnectTimer);
//         this.reconnectTimer = setTimeout(() => {
//             if (!this.isConnected && this.clientId) {
//                 this.connect(this.clientId, this.accessToken);
//             }
//         }, 5000); 
//     }

//     // =========================================================
//     // 4. JSON PACKET CREATOR (Dhan v2 Standard)
//     // =========================================================
//     _createSubscribePacket(exchange, tokensArray, requestCode = 15) {
//         // Dhan v2 takes exact strings like "NSE_FNO", "BSE_FNO", "IDX_I"
//         let mappedExchange = exchange;
//         if (exchange === "NSE") mappedExchange = "NSE_EQ";
//         if (exchange === "BSE") mappedExchange = "BSE_EQ";

//         // Maximum 100 instruments per JSON message
//         const tokensToSubscribe = tokensArray.slice(0, 100);

//         const instrumentList = tokensToSubscribe.map(token => ({
//             ExchangeSegment: mappedExchange,
//             SecurityId: String(token)
//         }));

//         const payload = {
//             RequestCode: requestCode,
//             InstrumentCount: tokensToSubscribe.length,
//             InstrumentList: instrumentList
//         };

//         return JSON.stringify(payload); // 🚀 Send as JSON
//     }
// }

// const dhanStreamer = new DhanStreamer();
// module.exports = dhanStreamer;


const WebSocket = require('ws');
const EventEmitter = require('events');

class DhanStreamer extends EventEmitter {
    constructor() {
        super();
        this.ws = null;
        this.isConnected = false;
        this.isConnecting = false;
        this.subscribedTokens = new Set();
        this.clientId = null;
        this.accessToken = null;
        this.reconnectTimer = null;
        
        // 🔥 Naya Rate-Limit Tracker
        this.reconnectDelay = 5000; // Base delay 5 seconds
        this.isRateLimited = false; 
    }

    // =========================================================
    // 1. CONNECTION & URL AUTHENTICATION (DHAN v2)
    // =========================================================
    connect(clientId, accessToken) {
        if (this.isConnected || this.isConnecting) return; 
        
        this.clientId = String(clientId);
        this.accessToken = String(accessToken);
        this.isConnecting = true;

        // 🛑 ZOMBIE CONNECTION KILLER (Subse zaroori fix)
        // Agar pehle se koi connection atka hai, toh use poori tarah destroy karo
        if (this.ws) {
            try {
                this.ws.removeAllListeners(); // Purane memory leaks band karo
                this.ws.terminate();          // Dhan server se forcefully rishta todo
            } catch (e) {}
            this.ws = null;
        }

        const wsUrl = `wss://api-feed.dhan.co?version=2&token=${this.accessToken}&clientId=${this.clientId}&authType=2`;

        console.log(`🔌 [WEBSOCKET] Connecting to Dhan Live Stream for Client: ${this.clientId}...`);
        
        this.ws = new WebSocket(wsUrl);

        // 🔥 THE NEW FIX: 429 TOO MANY REQUESTS HANDLER
        // WebSocket open hone se pehle hi HTTP errors catch kar lega
        this.ws.on('unexpected-response', (request, response) => {
            console.error(`❌ [WEBSOCKET ERROR] Unexpected server response: ${response.statusCode}`);
            if (response.statusCode === 429) {
                console.log(`⏳ [RATE LIMIT] Dhan Server requires a break. Backing off for 30 seconds...`);
                this.isRateLimited = true;
            }
        });

        this.ws.on('open', () => {
            this.isConnecting = false;
            this.isConnected = true;
            
            // Connection success hone par timers reset kar do
            this.isRateLimited = false; 
            this.reconnectDelay = 5000; 

            console.log(`✅ [WEBSOCKET] Connection Opened & Authenticated Successfully! Engine is LIVE 🟢`);
            this.emit('connected');

            if (this.subscribedTokens.size > 0) {
                console.log(`🔄 [WEBSOCKET] Re-subscribing to ${this.subscribedTokens.size} active tokens...`);
                this._resubscribeAll();
            }
        });

        this.ws.on('message', (data) => {
            this._processTick(data);
        });

        this.ws.on('close', () => {
            this.isConnected = false;
            this.isConnecting = false;
            
            // 🔥 SMART DELAY LOGIC
            const delay = this.isRateLimited ? 30000 : this.reconnectDelay;
            console.log(`⚠️ [WEBSOCKET] Connection Closed! Auto-reconnecting in ${delay/1000} seconds...`);
            this._handleReconnect(delay);
        });

        this.ws.on('error', (err) => {
            this.isConnecting = false;
            console.error(`❌ [WEBSOCKET ERROR]`, err.message);
        });
    }

    // =========================================================
    // 2. JSON SUBSCRIPTION MANAGEMENT
    // =========================================================
    subscribeTokens(exchange, tokensArray) {
        tokensArray.forEach(token => this.subscribedTokens.add(JSON.stringify({ exchange, token: String(token) })));
        
        if (this.isConnected) {
            const subPacket = this._createSubscribePacket(exchange, tokensArray, 15);
            this.ws.send(subPacket);
            console.log(`📡 [WEBSOCKET] Subscribed to ${tokensArray.length} tokens.`);
        } else {
            console.log(`⏳ [WEBSOCKET] Engine offline. Tokens queued for subscription upon connection.`);
        }
    }

    unsubscribeAll() {
        this.subscribedTokens.clear();
        console.log(`🛑 [WEBSOCKET] Cleared all token subscriptions.`);
    }

    _resubscribeAll() {
        const nseTokens = [];
        const bseTokens = [];
        const idxTokens = [];
        
        this.subscribedTokens.forEach(itemStr => {
            const item = JSON.parse(itemStr);
            if (item.exchange === "NSE_FNO" || item.exchange === "NSE") nseTokens.push(item.token);
            else if (item.exchange === "BSE_FNO" || item.exchange === "BSE") bseTokens.push(item.token);
            else if (item.exchange === "IDX_I") idxTokens.push(item.token);
        });

        if (nseTokens.length > 0) this.ws.send(this._createSubscribePacket("NSE_FNO", nseTokens, 15));
        if (bseTokens.length > 0) this.ws.send(this._createSubscribePacket("BSE_FNO", bseTokens, 15));
        if (idxTokens.length > 0) this.ws.send(this._createSubscribePacket("IDX_I", idxTokens, 15));
    }

    // =========================================================
    // 3. BINARY DATA PARSING (TICK PROCESSING)
    // =========================================================
    _processTick(data) {
        try {
            const buffer = Buffer.from(data);
            if (buffer.length < 8) return;

            const feedResponseCode = buffer.readUInt8(0);

            if (feedResponseCode === 11) {
                this.isConnected = true;
                const responseMsg = buffer.length >= 68 ? buffer.slice(18, 68).toString('utf8').replace(/\0/g, '').trim() : "Success";
                console.log(`✅ [WEBSOCKET] Authenticated Successfully! Message: ${responseMsg}`);
                this.emit('connected');
                if (this.subscribedTokens.size > 0) {
                    this._resubscribeAll();
                }
                return;
            }

            if (feedResponseCode === 50) {
                console.log(`🛑 [WEBSOCKET] Dhan Server forcefully disconnected the feed.`);
                return;
            }
            
            if ([2, 4, 8].includes(feedResponseCode) && buffer.length >= 12) {
                const exchangeSegment = buffer.readUInt8(3);
                const securityId = buffer.readUInt32LE(4);
                const ltp = buffer.readFloatLE(8); 

                const exchangeMap = { 
                    0: "NSE_EQ", 
                    1: "NSE_FNO", 
                    2: "NSE_CUR", 
                    3: "BSE_EQ", 
                    4: "BSE_FNO",  // 👈 SENSEX/BANKEX yahan aayega!
                    5: "BSE_CUR", 
                    7: "MCX", 
                    8: "IDX_I"     // 👈 Spot Nifty/Sensex yahan aayega!
                };
                const exchangeStr = exchangeMap[exchangeSegment] || "NSE_FNO";

                this.emit('tick', {
                    exchange: exchangeStr,
                    securityId: String(securityId),
                    ltp: Number(ltp.toFixed(2)),
                    timestamp: new Date()
                });
            }
        } catch (e) {
            // Silently ignore corrupt packets
        }
    }

    _handleReconnect(delay) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
            if (!this.isConnected && this.clientId) {
                // Agar normal disconnect hai toh delay dheere-dheere badhao (max 20 sec) taaki block na ho
                if (!this.isRateLimited) {
                    this.reconnectDelay = Math.min(this.reconnectDelay + 5000, 20000); 
                }
                this.connect(this.clientId, this.accessToken);
            }
        }, delay); 
    }

    // =========================================================
    // 4. JSON PACKET CREATOR (Dhan v2 Standard)
    // =========================================================
    _createSubscribePacket(exchange, tokensArray, requestCode = 15) {
        let mappedExchange = exchange;
        if (exchange === "NSE") mappedExchange = "NSE_EQ";
        if (exchange === "BSE") mappedExchange = "BSE_EQ";

        const tokensToSubscribe = tokensArray.slice(0, 100);

        const instrumentList = tokensToSubscribe.map(token => ({
            ExchangeSegment: mappedExchange,
            SecurityId: String(token)
        }));

        const payload = {
            RequestCode: requestCode,
            InstrumentCount: tokensToSubscribe.length,
            InstrumentList: instrumentList
        };

        return JSON.stringify(payload); 
    }
}

const dhanStreamer = new DhanStreamer();
module.exports = dhanStreamer;