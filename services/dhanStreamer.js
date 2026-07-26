const WebSocket = require('ws');
const EventEmitter = require('events');

class DhanStreamer extends EventEmitter {
    constructor() {
        super();
        this.ws = null;
        this.isConnected = false;
        this.subscribedTokens = new Set();
        this.clientId = null;
        this.accessToken = null;
        this.reconnectTimer = null;
    }

    // =========================================================
    // 1. CONNECTION & AUTHENTICATION
    // =========================================================
    connect(clientId, accessToken) {
        this.clientId = clientId;
        this.accessToken = accessToken;

        const wsUrl = `wss://api-feed.dhan.co`; // Dhan Live Market Feed URL

        console.log(`🔌 [WEBSOCKET] Connecting to Dhan Live Stream for Client: ${this.clientId}...`);
        
        this.ws = new WebSocket(wsUrl);

        this.ws.on('open', () => {
            this.isConnected = true;
            console.log(`✅ [WEBSOCKET] Connected Successfully!`);
            this.emit('connected');

            // Send Authorization Packet
            const authPacket = this._createAuthPacket();
            this.ws.send(authPacket);

            // Agar internet tutne ke baad reconnect hua hai, toh purane tokens wapas subscribe karo
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
            console.log(`⚠️ [WEBSOCKET] Connection Closed! Auto-reconnecting in 3 seconds...`);
            this._handleReconnect();
        });

        this.ws.on('error', (err) => {
            console.error(`❌ [WEBSOCKET ERROR]`, err.message);
        });
    }

    // =========================================================
    // 2. SUBSCRIPTION MANAGEMENT
    // =========================================================
    subscribeTokens(exchange, tokensArray) {
        // Tokens ko Set me add karo taki duplicate na ho
        tokensArray.forEach(token => this.subscribedTokens.add(JSON.stringify({ exchange, token: String(token) })));
        
        if (this.isConnected) {
            const subPacket = this._createSubscribePacket(exchange, tokensArray);
            this.ws.send(subPacket);
            console.log(`📡 [WEBSOCKET] Subscribed to ${tokensArray.length} tokens.`);
        } else {
            console.log(`⏳ [WEBSOCKET] Engine offline. Tokens queued for subscription upon connection.`);
        }
    }

    unsubscribeAll() {
        this.subscribedTokens.clear();
        console.log(`🛑 [WEBSOCKET] Cleared all token subscriptions.`);
        // Note: Dhan API generally clears subscriptions if you send a blank sub request or disconnect.
    }

    _resubscribeAll() {
        // Group tokens by exchange
        const nseTokens = [];
        const bseTokens = [];
        
        this.subscribedTokens.forEach(itemStr => {
            const item = JSON.parse(itemStr);
            if (item.exchange === "NSE_FNO") nseTokens.push(item.token);
            else if (item.exchange === "BSE_FNO") bseTokens.push(item.token);
        });

        if (nseTokens.length > 0) this.ws.send(this._createSubscribePacket("NSE_FNO", nseTokens));
        if (bseTokens.length > 0) this.ws.send(this._createSubscribePacket("BSE_FNO", bseTokens));
    }

    // =========================================================
    // 3. BINARY DATA PARSING (TICK PROCESSING)
    // =========================================================
    _processTick(data) {
        try {
            // Dhan WebSocket sends data in Binary Buffer format.
            // 8-Byte Header + Payload
            const buffer = Buffer.from(data);
            
            // Validate packet length (Minimum header size is 8 bytes)
            if (buffer.length < 8) return;

            const feedResponseCode = buffer.readUInt8(0);
            
            // Response Code 2 = Ticker Data (LTP)
            if (feedResponseCode === 2 && buffer.length >= 16) {
                const exchangeSegment = buffer.readUInt8(3);
                const securityId = buffer.readUInt32LE(4);
                const ltp = buffer.readFloatLE(8); // LTP is a float starting at byte 8

                // Format string for our Engine
                const exchangeMap = { 0: "NSE", 1: "BSE", 2: "NSE_FNO", 3: "BSE_FNO", 4: "MCX" };
                const exchangeStr = exchangeMap[exchangeSegment] || "NSE_FNO";

                // MAIN ENGINE KO EVENT BHEJNA
                this.emit('tick', {
                    exchange: exchangeStr,
                    securityId: String(securityId),
                    ltp: Number(ltp.toFixed(2)),
                    timestamp: new Date()
                });
            }
            // Add other Response Codes (like Full Depth / Quote) here later if needed.
        } catch (e) {
            console.error(`❌ [WEBSOCKET PARSE ERROR]`, e.message);
        }
    }

    // =========================================================
    // 4. UTILITY / HELPERS
    // =========================================================
    _handleReconnect() {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
            if (!this.isConnected && this.clientId) {
                this.connect(this.clientId, this.accessToken);
            }
        }, 3000);
    }

    _createAuthPacket() {
        // Buffer allocation for Auth Request (Code 11)
        // Adjust buffer size based on exact Dhan string lengths if doing strict binary,
        // For Dhan's hybrid JSON/Binary, some auths accept JSON. 
        // Using Dhan's standard JSON Auth structure for handshake:
        return JSON.stringify({
            RequestCode: 11,
            InstrumentCount: 0,
            WssClientId: this.clientId,
            WssAccessToken: this.accessToken
        });
    }

    _createSubscribePacket(exchange, tokensArray) {
        const exchangeMap = { "NSE": 0, "BSE": 1, "NSE_FNO": 2, "BSE_FNO": 3, "MCX": 4 };
        const exchCode = exchangeMap[exchange] || 2;

        const instrumentList = tokensArray.map(token => ({
            ExchangeSegment: exchCode,
            SecurityId: String(token)
        }));

        // Using Dhan's standard Ticker Subscription (Code 21) or Market Depth (Code 17)
        return JSON.stringify({
            RequestCode: 21, // 21 is for Ticker (LTP only)
            InstrumentCount: tokensArray.length,
            InstrumentList: instrumentList
        });
    }
}

// Singleton Instance (Pura backend sirf ek hi connection use karega)
const dhanStreamer = new DhanStreamer();
module.exports = dhanStreamer;