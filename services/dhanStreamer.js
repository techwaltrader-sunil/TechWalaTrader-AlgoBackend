
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