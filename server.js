const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http'); // ✅ Import HTTP
const { Server } = require('socket.io'); // ✅ Import Socket.io
const { Pool } = require('pg'); // 🟢 NAYA: PostgreSQL Pool import

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

const insightRoutes = require('./routes/insightRoutes');
const aocRoutes = require('./routes/aocRoutes');
const behaviorRoutes = require('./routes/behaviorRoutes');

const { connectDhanWebSocket } = require('./services/dhanSocket');
const { getOptionChainSkeleton } = require('./services/instrumentService')



const app = express();

// ==========================================
// 🛢️ POSTGRES CONNECTION POOL (For Historical Data)
// ==========================================
const pgPool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.LOCAL_DB_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

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
app.use('/api/behavior-rule', behaviorRoutes);
app.use('/api', insightRoutes);
// ==========================================


// ==========================================
// ⚙️ STRATEGY PROFILES API (Dynamic Settings)
// ==========================================
// 1. API: Nayi strategy save karne ke liye
app.post('/api/strategies/save', async (req, res) => {
    const { profileName, config } = req.body;
    try {
        // 👈 Yahan table name se pehle 'trading.' jod diya hai
        const query = `INSERT INTO trading.strategy_profiles (profile_name, config) VALUES ($1, $2) RETURNING *`;
        const result = await pgPool.query(query, [profileName, config]); 
        res.status(201).json({ success: true, message: "Strategy Saved!", data: result.rows[0] });
    } catch (error) {
        console.error("❌ Save Strategy Error:", error);
        res.status(500).json({ error: "Database error while saving strategy" });
    }
});

// 2. API: Saari saved strategies fetch karne ke liye
app.get('/api/strategies/list', async (req, res) => {
    try {
        // 👈 Yahan bhi table name se pehle 'trading.' jod diya hai
        const query = 'SELECT * FROM trading.strategy_profiles ORDER BY id DESC';
        const result = await pgPool.query(query); 
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("❌ Fetch Strategy Error:", error);
        res.status(500).json({ error: "Database error while fetching strategies" });
    }
});


// ==========================================
// 📈 THE MASTER HISTORICAL ENGINE (1m -> Any Timeframe)
// ==========================================
app.get('/api/chart/historical', async (req, res) => {
    try {
        const { symbol = 'NIFTY', resolution = '1', from, to } = req.query;
        
        // 🛠️ DEBUG TEST: Agar URL me from/to nahi diya, toh seedha last 100 record dikhao!
        if (!from || !to) {
            console.log(`⚠️ Debug Mode: Fetching last 100 records for ${symbol} without date filter...`);
            const testQuery = `SELECT * FROM historical_candles WHERE symbol = $1 ORDER BY timestamp DESC LIMIT 100`;
            const testRows = await pgPool.query(testQuery, [symbol]);
            return res.json({ success: true, count: testRows.rows.length, data: testRows.rows });
        }

        // JS Date objects (PostgreSQL ke liye ISO string se zyada accurate)
        const fromDate = new Date(Number(from));
        const toDate = new Date(Number(to));

        console.log(`🔍 Querying DB for ${symbol} | From: ${fromDate.toLocaleString()} | To: ${toDate.toLocaleString()}`);

        // 1. Fetch Only 1-Minute Base Candles from Database
        const query = `
            SELECT timestamp, open, high, low, close, volume 
            FROM historical_candles 
            WHERE symbol = $1 AND timestamp >= $2 AND timestamp <= $3 
            ORDER BY timestamp ASC
        `;
        const { rows } = await pgPool.query(query, [symbol, fromDate, toDate]);

        console.log(`✅ DB returned ${rows.length} rows!`);

        if (rows.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const timeframe = parseInt(resolution) || 1; 
        
        if (timeframe === 1) {
            const formattedData = rows.map(r => ({
                timestamp: new Date(r.timestamp).getTime(),
                open: Number(r.open),
                high: Number(r.high),
                low: Number(r.low),
                close: Number(r.close),
                volume: Number(r.volume)
            }));
            return res.json({ success: true, data: formattedData });
        }

        // Aggregate 1-min data to 3m, 5m, 15m
        const aggregatedData = [];
        let currentCandle = null;
        let candleStartTime = null;

        rows.forEach(row => {
            const rowTime = new Date(row.timestamp).getTime();
            
            // Indian Market Snap Logic (9:15 AM Align)
            const tfMs = timeframe * 60 * 1000;
            const istOffset = (5 * 60 + 30) * 60 * 1000; 
            const alignedTime = Math.floor((rowTime + istOffset) / tfMs) * tfMs - istOffset;

            if (!currentCandle || alignedTime !== candleStartTime) {
                if (currentCandle) aggregatedData.push(currentCandle);
                
                candleStartTime = alignedTime;
                currentCandle = {
                    timestamp: alignedTime,
                    open: Number(row.open),
                    high: Number(row.high),
                    low: Number(row.low),
                    close: Number(row.close),
                    volume: Number(row.volume)
                };
            } else {
                currentCandle.high = Math.max(currentCandle.high, Number(row.high));
                currentCandle.low = Math.min(currentCandle.low, Number(row.low));
                currentCandle.close = Number(row.close);
                currentCandle.volume += Number(row.volume);
            }
        });

        if (currentCandle) aggregatedData.push(currentCandle);

        return res.json({ success: true, data: aggregatedData });

    } catch (error) {
        console.error("❌ Historical Data Engine Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});


// ==========================================
// 🔌 MONGODB MODEL (For Dynamic Token)
// ==========================================
const mongoose = require('mongoose');
const brokerSchema = new mongoose.Schema({}, { strict: false, collection: 'brokers' });
const Broker = mongoose.models.Broker || mongoose.model('Broker', brokerSchema);

// 👇 🚀 LIVE AOC ENDPOINT (POWERED BY DHAN API & MONGODB) 👇
const axios = require('axios');

app.get('/api/live/aoc', async (req, res) => {
    try {
        const { symbol = 'NIFTY', expiry } = req.query;
        let formattedExpiry = expiry && expiry.length === 10 ? expiry : "2026-09-29"; 

        // 🎯 THE FIX: Chart वाला Spot या 23200 पास करो
        let roughSpot = global.liveSpotPrices?.[symbol] || 23200; 

        const formattedChain = getOptionChainSkeleton(symbol, formattedExpiry, roughSpot);

        return res.json({
            success: true,
            spotPrice: roughSpot, 
            chain: formattedChain
        });
    
    } catch (error) {
        console.error("❌ Error fetching live AOC Skeleton:", error.message);
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

connectDhanWebSocket(io);

const PORT = process.env.PORT || 6000;

// ✅ Note: app.listen ki jagah server.listen use karein
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`.yellow.bold);
});





