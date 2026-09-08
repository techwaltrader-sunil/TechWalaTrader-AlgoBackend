

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http'); // ✅ Import HTTP
const { Server } = require('socket.io'); // ✅ Import Socket.io


const connectDB = require('./config/db');
const { initPostgresDB } = require('./config/postgres');

const colors = require('colors');
const cron = require('node-cron'); 

// Config
dotenv.config();

connectDB();
initPostgresDB();

const webhookRoutes = require('./routes/webhookRoutes');
const algoLogRoutes = require('./routes/algoLogRoutes');
const backtestRoutes = require('./routes/backtestRoutes');
const { downloadAndParseInstruments } = require('./services/instrumentService'); 

const aocRoutes = require('./routes/aocRoutes');

const app = express();



// ==========================================
// ⏰ AUTOMATIC CSV UPDATER (CRON JOB)
// ==========================================
// 1. App start hone par ek baar data load karein
downloadAndParseInstruments();

// 2. Har din subah 08:00 AM (IST) par auto-update
cron.schedule('0 8 * * *', async () => {
    console.log("⏰ Running Daily Dhan CSV Updater Task...");
    await downloadAndParseInstruments(); 
}, {
    timezone: "Asia/Kolkata"
});
// ==========================================

// Middlewares
app.use(express.json());
app.use(cors({ origin: '*' }));

// ✅ 1. HTTP Server Create (Socket.io ke liye)
const server = http.createServer(app);

// ✅ 2. Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// 🔥 io ko app me save kar rahe hain taaki dusri files isko use kar sakein
global.io = io;
app.set('io', io);


// ==========================================
// 🚀 LIVE TERMINAL LOGS TO FRONTEND VIA SOCKET
// ==========================================
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function (...args) {
    originalConsoleLog.apply(console, args); 
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
    
    if (global.io) {
        global.io.emit('system-log', { message: message, type: 'info', time: new Date() });
    }
};

console.error = function (...args) {
    originalConsoleError.apply(console, args); 
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
    
    if (global.io) {
        global.io.emit('system-log', { message: message, type: 'error', time: new Date() });
    }
};
// ==========================================


// ==========================================
// ✅ ROUTES DEFINITION
// ==========================================
app.use('/api/brokers', require('./routes/brokerRoutes'));
app.use('/api/strategies', require('./routes/strategyRoutes')); 
app.use('/api/deployments', require('./routes/deploymentRoutes'));
app.use('/api/webhook', webhookRoutes);
app.use('/api/algo-logs', algoLogRoutes);
app.use('/api/backtest', backtestRoutes);
app.use('/api/strategy-templates', require('./routes/templateRoutes'));
app.use('/api/simulator', require('./routes/simulatorRoutes'));
app.use('/api/aoc', aocRoutes);
// ==========================================

// 👇 🚀 NAYA LIVE AOC ENDPOINT YAHAN ADD KAREIN 👇
app.get('/api/live/aoc', async (req, res) => {
    try {
        const { symbol = 'NIFTY', expiry } = req.query;

        // 1. लाइव स्पॉट प्राइस लें जो आपके WebSocket / global cache में आ रहा है
        const liveSpot = global.liveSpotPrices?.[symbol] || 24100;

        // 2. DhanHQ API से असली Option Chain डेटा फेच करें
        // (ध्यान दें: आपके एनवायरनमेंट या डेटाबेस में यूजर का access-token और client-id सेव होगा)
        /*
        const dhanAccessToken = process.env.DHAN_ACCESS_TOKEN; // या यूजर के डेटाबेस से लें
        const underlyingId = symbol === 'NIFTY' ? '13' : '25'; // उदाहरण के लिए टोकन मैप करें

        const response = await axios.post('https://api.dhan.co/v2/optionchain', {
            underlying_scrip: underlyingId,
            expiry_date: expiry || "2026-09-10" // यूज़र द्वारा चुनी गई एक्सपायरी
        }, {
            headers: {
                'access-token': dhanAccessToken,
                'client-id': process.env.DHAN_CLIENT_ID,
                'Content-Type': 'application/json'
            }
        });

        if (response.data && response.data.status === 'success') {
            // Dhan के डेटा को अपने फ्रंटएंड फॉर्मेट (CE, PE, strike) में मैप करें
            const rawChain = response.data.data.oc; // (Dhan के रिस्पॉन्स स्ट्रक्चर के अनुसार)
            
            // फॉर्मेटिंग लॉजिक...
            return res.json({
                success: true,
                spotPrice: response.data.data.spot_price || liveSpot,
                chain: formattedChain
            });
        }
        */

        // 🛡️ Safe Fallback: जब तक आप Dhan API क्रेडेंशियल या टोकन पूरी तरह प्लग-इन नहीं करते, 
        // तब तक यह आपके ग्लोबल लाइव स्पॉट प्राइस के साथ डमी चेन को लाइव मोशन में रखेगा ताकि ऐप क्रैश न हो।
        res.json({
            success: true,
            spotPrice: liveSpot,
            chain: [
                { strikePrice: liveSpot - 100, strike: liveSpot - 100, CE: { ltp: 145, volume: 11200, oi: 52000, oiChg: 1300, chng_in_oi: 1300, iv: 12, delta: 0.7 }, PE: { ltp: 42, volume: 21000, oi: 125000, oiChg: -400, chng_in_oi: -400, iv: 14, delta: -0.2 } },
                { strikePrice: liveSpot - 50, strike: liveSpot - 50, CE: { ltp: 105, volume: 16000, oi: 62000, oiChg: 1900, chng_in_oi: 1900, iv: 11, delta: 0.6 }, PE: { ltp: 62, volume: 19000, oi: 97000, oiChg: 750, chng_in_oi: 750, iv: 13, delta: -0.3 } },
                { strikePrice: liveSpot, strike: liveSpot, CE: { ltp: 75, volume: 26000, oi: 87000, oiChg: 2600, chng_in_oi: 2600, iv: 10, delta: 0.5 }, PE: { ltp: 88, volume: 23000, oi: 90000, oiChg: 1300, chng_in_oi: 1300, iv: 12, delta: -0.4 } },
                { strikePrice: liveSpot + 50, strike: liveSpot + 50, CE: { ltp: 52, volume: 31000, oi: 112000, oiChg: 3600, chng_in_oi: 3600, iv: 11, delta: 0.3 }, PE: { ltp: 122, volume: 15000, oi: 67000, oiChg: -150, chng_in_oi: -150, iv: 11, delta: -0.6 } },
                { strikePrice: liveSpot + 100, strike: liveSpot + 100, CE: { ltp: 32, volume: 41000, oi: 152000, oiChg: 5100, chng_in_oi: 5100, iv: 13, delta: 0.2 }, PE: { ltp: 158, volume: 11000, oi: 47000, oiChg: -750, chng_in_oi: -750, iv: 15, delta: -0.7 } }
            ]
        });

    } catch (error) {
        console.error("Error fetching live AOC from Dhan:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});


// ✅ 3. Real-time Connection Logic
io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`.green);
  
  socket.on('disconnect', () => {
    console.log('User Disconnected'.red);
  });
});

// Test Route
app.get('/', (req, res) => {
  res.send('API & Socket Server Running...');
});


// 🔥 THE FIX: BACKEND ENGINE START YAHAN HOGA (Socket Ready hone ke baad)
require('./engine/tradingEngine');


const PORT = process.env.PORT || 6000;

// ✅ Note: app.listen ki jagah server.listen use karein
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`.yellow.bold);
});
