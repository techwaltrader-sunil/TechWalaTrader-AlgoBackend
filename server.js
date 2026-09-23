
// const express = require('express');
// const dotenv = require('dotenv');
// const cors = require('cors');
// const http = require('http'); // ✅ Import HTTP
// const { Server } = require('socket.io'); // ✅ Import Socket.io


// const connectDB = require('./config/db');
// const { initPostgresDB } = require('./config/postgres');

// const colors = require('colors');
// const cron = require('node-cron'); 

// // Config
// dotenv.config();

// connectDB();
// initPostgresDB();

// const webhookRoutes = require('./routes/webhookRoutes');
// const algoLogRoutes = require('./routes/algoLogRoutes');
// const backtestRoutes = require('./routes/backtestRoutes');
// const { downloadAndParseInstruments } = require('./services/instrumentService'); 

// const insightRoutes = require('./routes/insightRoutes');

// const aocRoutes = require('./routes/aocRoutes');

// const behaviorRoutes = require('./routes/behaviorRoutes');

// const app = express();



// // ==========================================
// // ⏰ AUTOMATIC CSV UPDATER (CRON JOB)
// // ==========================================
// // 1. App start hone par ek baar data load karein
// downloadAndParseInstruments();

// // 2. Har din subah 08:00 AM (IST) par auto-update
// cron.schedule('0 8 * * *', async () => {
//     console.log("⏰ Running Daily Dhan CSV Updater Task...");
//     await downloadAndParseInstruments(); 
// }, {
//     timezone: "Asia/Kolkata"
// });
// // ==========================================

// // Middlewares
// app.use(express.json());
// app.use(cors({ origin: '*' }));

// // ✅ 1. HTTP Server Create (Socket.io ke liye)
// const server = http.createServer(app);

// // ✅ 2. Socket.io Setup
// const io = new Server(server, {
//   cors: {
//     origin: "*", 
//     methods: ["GET", "POST"]
//   }
// });

// // 🔥 io ko app me save kar rahe hain taaki dusri files isko use kar sakein
// global.io = io;
// app.set('io', io);


// // ==========================================
// // 🚀 LIVE TERMINAL LOGS TO FRONTEND VIA SOCKET
// // ==========================================
// const originalConsoleLog = console.log;
// const originalConsoleError = console.error;

// console.log = function (...args) {
//     originalConsoleLog.apply(console, args); 
//     const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
    
//     if (global.io) {
//         global.io.emit('system-log', { message: message, type: 'info', time: new Date() });
//     }
// };

// console.error = function (...args) {
//     originalConsoleError.apply(console, args); 
//     const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
    
//     if (global.io) {
//         global.io.emit('system-log', { message: message, type: 'error', time: new Date() });
//     }
// };
// // ==========================================


// // ==========================================
// // ✅ ROUTES DEFINITION
// // ==========================================
// app.use('/api/brokers', require('./routes/brokerRoutes'));
// app.use('/api/strategies', require('./routes/strategyRoutes')); 
// app.use('/api/deployments', require('./routes/deploymentRoutes'));
// app.use('/api/webhook', webhookRoutes);
// app.use('/api/algo-logs', algoLogRoutes);
// app.use('/api/backtest', backtestRoutes);
// app.use('/api/strategy-templates', require('./routes/templateRoutes'));
// app.use('/api/simulator', require('./routes/simulatorRoutes'));
// app.use('/api/aoc', aocRoutes);
// // ==========================================

// app.use('/api/behavior-rule', behaviorRoutes);

// app.use('/api', insightRoutes);



// // ==========================================
// // 🔌 MONGODB MODEL (For Dynamic Token)
// // ==========================================
// const mongoose = require('mongoose');
// const brokerSchema = new mongoose.Schema({}, { strict: false, collection: 'brokers' });
// const Broker = mongoose.models.Broker || mongoose.model('Broker', brokerSchema);

// // 👇 🚀 LIVE AOC ENDPOINT (POWERED BY DHAN API & MONGODB) 👇
// const axios = require('axios');


// app.get('/api/live/aoc', async (req, res) => {
//     try {
//         const { symbol = 'NIFTY', expiry } = req.query;

//         // 🎯 1. FETCH DYNAMIC CREDENTIALS FROM MONGODB 
//         const broker = await Broker.findOne({ name: "Dhan" }); 
        
//         if (!broker || !broker.apiSecret || !broker.clientId) {
//             return res.status(400).json({ success: false, message: "Dhan API Credentials not found in Database." });
//         }

//         const DHAN_CLIENT_ID = broker.clientId;
//         const DHAN_ACCESS_TOKEN = broker.apiSecret; 
//         const underlyingScrip = symbol === 'NIFTY' ? 13 : 25;

//         // ==========================================
//         // ⚡ NAYA LOGIC: PEHLE SPOT PRICE FETCH KARO!
//         // ==========================================
//         let liveSpotPrice = 0;
//         try {
//             const spotPayload = { "IDX_I": [underlyingScrip.toString()] }; // Dhan LTP Payload
//             const spotRes = await axios.post('https://api.dhan.co/v2/marketfeed/ltp', spotPayload, {
//                 headers: {
//                     'access-token': DHAN_ACCESS_TOKEN,
//                     'client-id': DHAN_CLIENT_ID,
//                     'Content-Type': 'application/json'
//                 }
//             });
            
//             // Dhan के रिस्पॉन्स से असली लाइव प्राइस खींचना
//             if (spotRes.data?.data?.IDX_I?.[underlyingScrip.toString()]?.last_price) {
//                 liveSpotPrice = Number(spotRes.data.data.IDX_I[underlyingScrip.toString()].last_price);
                
//                 // 🌟 ग्लोबल वेरिएबल में सेव कर दो ताकि बाकी ऐप को भी पता चल जाए!
//                 if (!global.liveSpotPrices) global.liveSpotPrices = {};
//                 global.liveSpotPrices[symbol] = liveSpotPrice;
//             }
//         } catch (spotErr) {
//             console.error("⚠️ Error fetching Spot Price, using fallback:", spotErr.message);
//         }

//         // अगर API से स्पॉट प्राइस न मिले, तो पुराना प्राइस इस्तेमाल करें (ताकि ऐप क्रैश न हो)
//         liveSpotPrice = liveSpotPrice || global.liveSpotPrices?.[symbol] || 23550;


//         // ==========================================
//         // ⚡ PHIR OPTION CHAIN FETCH KARO!
//         // ==========================================
//         let formattedExpiry = expiry;
//         if (!formattedExpiry || formattedExpiry.length !== 10) {
//             formattedExpiry = "2026-09-15"; 
//         }

//         const payload = {
//             "UnderlyingScrip": underlyingScrip,
//             "UnderlyingSeg": "IDX_I", 
//             "Expiry": formattedExpiry 
//         };

//         const response = await axios.post('https://api.dhan.co/v2/optionchain', payload, {
//             headers: {
//                 'access-token': DHAN_ACCESS_TOKEN, 
//                 'client-id': DHAN_CLIENT_ID,       
//                 'Content-Type': 'application/json',
//                 'Accept': 'application/json'
//             }
//         });

//         if (response.data && response.data.data) {
//             let rawChain = response.data.data.oc || response.data.data;
            
//             const iterableChain = Array.isArray(rawChain) 
//                 ? rawChain 
//                 : Object.entries(rawChain).map(([key, val]) => ({ 
//                     strikePrice: parseFloat(key), 
//                     ...val 
//                   }));

//             let formattedChain = [];
            
//             iterableChain.forEach(strikeData => {
//                 if (!strikeData) return;
                
//                 const strikeVal = strikeData.strikePrice || strikeData.strike || parseFloat(strikeData.StrikePrice) || 0;
//                 if (strikeVal === 0) return; 

//                 const ceData = strikeData.ce || strikeData.CE || {};
//                 const peData = strikeData.pe || strikeData.PE || {};

//                 formattedChain.push({
//                     strikePrice: strikeVal,
//                     strike: strikeVal,
//                     CE: {
//                         ltp: Number(ceData.lastPrice ?? ceData.ltp ?? ceData.LastPrice ?? ceData.LTP ?? ceData.last_price ?? 0),
//                         volume: Number(ceData.volume ?? ceData.Volume ?? ceData.tradedVolume ?? 0),
//                         oi: Number(ceData.openInterest ?? ceData.oi ?? ceData.OpenInterest ?? ceData.OI ?? 0),
//                         oiChg: Number(ceData.oiChange ?? ceData.oiChg ?? ceData.OIChange ?? ceData.changeInOi ?? 0),
//                         token: ceData.securityId ?? ceData.token ?? ceData.SecurityId ?? ''
//                     },
//                     PE: {
//                         ltp: Number(peData.lastPrice ?? peData.ltp ?? peData.LastPrice ?? peData.LTP ?? peData.last_price ?? 0),
//                         volume: Number(peData.volume ?? peData.Volume ?? peData.tradedVolume ?? 0),
//                         oi: Number(peData.openInterest ?? peData.oi ?? peData.OpenInterest ?? peData.OI ?? 0),
//                         oiChg: Number(peData.oiChange ?? peData.oiChg ?? peData.OIChange ?? peData.changeInOi ?? 0),
//                         token: peData.securityId ?? peData.token ?? peData.SecurityId ?? ''
//                     }
//                 });
//             });

//             formattedChain.sort((a, b) => a.strikePrice - b.strikePrice);


//             // ==========================================
//             // 🛡️ THE QUANT TRADER FALLBACK: SYNTHETIC SPOT 
//             // ==========================================
//             // अगर Dhan LTP API (400) फेल हो गया, तो हम Option Chain से ही Spot Price निकाल लेंगे!
//             if (!liveSpotPrice || liveSpotPrice === 0 || liveSpotPrice === 23550) {
//                 let minDiff = Infinity;
//                 let atmStrike = 0;
//                 let atmCE = 0;
//                 let atmPE = 0;
                
//                 // ATM स्ट्राइक ढूँढना (जहाँ CE और PE का अंतर सबसे कम हो)
//                 formattedChain.forEach(strikeData => {
//                     const ceLtp = strikeData.CE.ltp;
//                     const peLtp = strikeData.PE.ltp;
//                     const strikeVal = strikeData.strikePrice;
                    
//                     if (ceLtp > 0 && peLtp > 0 && strikeVal > 0) {
//                         const diff = Math.abs(ceLtp - peLtp);
//                         if (diff < minDiff) {
//                             minDiff = diff;
//                             atmStrike = strikeVal;
//                             atmCE = ceLtp;
//                             atmPE = peLtp;
//                         }
//                     }
//                 });

//                 if (atmStrike > 0) {
//                     // 📈 Synthetic Spot Formula (Strike + CE - PE)
//                     liveSpotPrice = atmStrike + atmCE - atmPE;
//                     liveSpotPrice = Math.round(liveSpotPrice * 100) / 100; // 2 decimal तक राउंड ऑफ
//                     console.log(`✅ [CRASH GUARD] API Failed, Synthesized Spot Price: ${liveSpotPrice}`);
//                 } else {
//                     liveSpotPrice = global.liveSpotPrices?.[symbol] || 23550; // आखिरी बचाव
//                 }
//             }

//             // 🌟 ग्लोबल मेमोरी को नए लाइव प्राइस के साथ अपडेट करें
//             if (!global.liveSpotPrices) global.liveSpotPrices = {};
//             global.liveSpotPrices[symbol] = liveSpotPrice;

//             // ==========================================
//             // 🎯 THE CLIMAX: DONO DATA EK SATH BHEJO
//             // ==========================================
//             return res.json({
//                 success: true,
//                 spotPrice: liveSpotPrice, // 👈 जादुई नया लाइव स्पॉट प्राइस!
//                 chain: formattedChain
//             });
        
//         } else {
//             throw new Error("Invalid response from Dhan API");
//         }

//     } catch (error) {
//         console.error("❌ Error fetching live AOC from Dhan:", error?.response?.data || error.message);
//         res.status(500).json({ success: false, message: error.message });
//     }
// });


// // ✅ 3. Real-time Connection Logic
// io.on('connection', (socket) => {
//   console.log(`User Connected: ${socket.id}`.green);
  
//   socket.on('disconnect', () => {
//     console.log('User Disconnected'.red);
//   });
// });

// // Test Route
// app.get('/', (req, res) => {
//   res.send('API & Socket Server Running...');
// });


// // 🔥 THE FIX: BACKEND ENGINE START YAHAN HOGA (Socket Ready hone ke baad)
// require('./engine/tradingEngine');


// const PORT = process.env.PORT || 6000;

// // ✅ Note: app.listen ki jagah server.listen use karein
// server.listen(PORT, () => {
//   console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`.yellow.bold);
// });






// const express = require('express');
// const dotenv = require('dotenv');
// const cors = require('cors');
// const http = require('http'); // ✅ Import HTTP
// const { Server } = require('socket.io'); // ✅ Import Socket.io


// const connectDB = require('./config/db');
// const { initPostgresDB } = require('./config/postgres');

// const colors = require('colors');
// const cron = require('node-cron'); 

// // Config
// dotenv.config();

// connectDB();
// initPostgresDB();

// const webhookRoutes = require('./routes/webhookRoutes');
// const algoLogRoutes = require('./routes/algoLogRoutes');
// const backtestRoutes = require('./routes/backtestRoutes');
// const { downloadAndParseInstruments } = require('./services/instrumentService'); 

// const insightRoutes = require('./routes/insightRoutes');

// const aocRoutes = require('./routes/aocRoutes');

// const behaviorRoutes = require('./routes/behaviorRoutes');

// const app = express();



// // ==========================================
// // ⏰ AUTOMATIC CSV UPDATER (CRON JOB)
// // ==========================================
// // 1. App start hone par ek baar data load karein
// downloadAndParseInstruments();

// // 2. Har din subah 08:00 AM (IST) par auto-update
// cron.schedule('0 8 * * *', async () => {
//     console.log("⏰ Running Daily Dhan CSV Updater Task...");
//     await downloadAndParseInstruments(); 
// }, {
//     timezone: "Asia/Kolkata"
// });
// // ==========================================

// // Middlewares
// app.use(express.json());
// app.use(cors({ origin: '*' }));

// // ✅ 1. HTTP Server Create (Socket.io ke liye)
// const server = http.createServer(app);

// // ✅ 2. Socket.io Setup
// const io = new Server(server, {
//   cors: {
//     origin: "*", 
//     methods: ["GET", "POST"]
//   }
// });

// // 🔥 io ko app me save kar rahe hain taaki dusri files isko use kar sakein
// global.io = io;
// app.set('io', io);


// // ==========================================
// // 🚀 LIVE TERMINAL LOGS TO FRONTEND VIA SOCKET
// // ==========================================
// const originalConsoleLog = console.log;
// const originalConsoleError = console.error;

// console.log = function (...args) {
//     originalConsoleLog.apply(console, args); 
//     const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
    
//     if (global.io) {
//         global.io.emit('system-log', { message: message, type: 'info', time: new Date() });
//     }
// };

// console.error = function (...args) {
//     originalConsoleError.apply(console, args); 
//     const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
    
//     if (global.io) {
//         global.io.emit('system-log', { message: message, type: 'error', time: new Date() });
//     }
// };
// // ==========================================


// // ==========================================
// // ✅ ROUTES DEFINITION
// // ==========================================
// app.use('/api/brokers', require('./routes/brokerRoutes'));
// app.use('/api/strategies', require('./routes/strategyRoutes')); 
// app.use('/api/deployments', require('./routes/deploymentRoutes'));
// app.use('/api/webhook', webhookRoutes);
// app.use('/api/algo-logs', algoLogRoutes);
// app.use('/api/backtest', backtestRoutes);
// app.use('/api/strategy-templates', require('./routes/templateRoutes'));
// app.use('/api/simulator', require('./routes/simulatorRoutes'));
// app.use('/api/aoc', aocRoutes);
// // ==========================================

// app.use('/api/behavior-rule', behaviorRoutes);

// app.use('/api', insightRoutes);



// // ==========================================
// // 🔌 MONGODB MODEL (For Dynamic Token)
// // ==========================================
// const mongoose = require('mongoose');
// const brokerSchema = new mongoose.Schema({}, { strict: false, collection: 'brokers' });
// const Broker = mongoose.models.Broker || mongoose.model('Broker', brokerSchema);

// // 👇 🚀 LIVE AOC ENDPOINT (POWERED BY DHAN API & MONGODB) 👇
// const axios = require('axios');


// app.get('/api/live/aoc', async (req, res) => {
//     try {
//         const { symbol = 'NIFTY', expiry } = req.query;

//         // 🎯 1. FETCH CREDENTIALS 
//         const broker = await Broker.findOne({ name: "Dhan" }); 
//         if (!broker || !broker.apiSecret || !broker.clientId) {
//             return res.status(400).json({ success: false, message: "Credentials not found." });
//         }

//         const DHAN_CLIENT_ID = broker.clientId;
//         const DHAN_ACCESS_TOKEN = broker.apiSecret; 
//         const underlyingScrip = symbol === 'NIFTY' ? 13 : 25;

//         // ==========================================
//         // 🌟 PLAN A: FETCH SPOT FROM INTRADAY API
//         // ==========================================
//         let liveSpotPrice = 0;
//         try {
//             const today = new Date();
//             const year = today.getFullYear();
//             const month = String(today.getMonth() + 1).padStart(2, '0');
//             const day = String(today.getDate()).padStart(2, '0');
//             const syncDate = `${year}-${month}-${day}`;
            
//             const spotPayload = { 
//                 securityId: underlyingScrip.toString(), 
//                 exchangeSegment: "IDX_I", 
//                 instrument: "INDEX", 
//                 interval: "1", 
//                 fromDate: `${syncDate} 09:15:00`, 
//                 toDate: `${syncDate} 15:30:00` 
//             };

//             const spotRes = await axios.post('https://api.dhan.co/v2/charts/intraday', spotPayload, {
//                 headers: { 'access-token': DHAN_ACCESS_TOKEN, 'client-id': DHAN_CLIENT_ID, 'Content-Type': 'application/json' }
//             });
            
//             if (spotRes.data?.data?.close?.length > 0) {
//                 const closePrices = spotRes.data.data.close;
//                 liveSpotPrice = Number(closePrices[closePrices.length - 1]);
//             }
//         } catch (spotErr) {
//             console.error("⚠️ Plan A Failed (Intraday API):", spotErr.message);
//         }

//         // ==========================================
//         // 🌟 FETCH OPTION CHAIN
//         // ==========================================
//         let formattedExpiry = expiry && expiry.length === 10 ? expiry : "2026-09-22"; 
        
//         const payload = { "UnderlyingScrip": underlyingScrip, "UnderlyingSeg": "IDX_I", "Expiry": formattedExpiry };

//         const response = await axios.post('https://api.dhan.co/v2/optionchain', payload, {
//             headers: { 'access-token': DHAN_ACCESS_TOKEN, 'client-id': DHAN_CLIENT_ID, 'Content-Type': 'application/json' }
//         });

//         if (response.data && response.data.data) {
//             let rawChain = response.data.data.oc || response.data.data;
//             const iterableChain = Array.isArray(rawChain) ? rawChain : Object.entries(rawChain).map(([key, val]) => ({ strikePrice: parseFloat(key), ...val }));

//             let formattedChain = [];
            
//             iterableChain.forEach(strikeData => {
//                 if (!strikeData) return;
//                 const strikeVal = strikeData.strikePrice || strikeData.strike || parseFloat(strikeData.StrikePrice) || 0;
//                 if (strikeVal === 0) return; 

//                 const ceData = strikeData.ce || strikeData.CE || {};
//                 const peData = strikeData.pe || strikeData.PE || {};

//                 formattedChain.push({
//                     strikePrice: strikeVal, strike: strikeVal,
//                     CE: {
//                         // 🎯 THE FIX: last_price (अंडरस्कोर वाला) ऐड कर दिया गया है
//                         ltp: Number(ceData.last_price ?? ceData.lastPrice ?? ceData.ltp ?? ceData.LTP ?? ceData.LastPrice ?? 0),
//                         volume: Number(ceData.volume ?? ceData.Volume ?? ceData.tradedVolume ?? 0),
//                         oi: Number(ceData.open_interest ?? ceData.openInterest ?? ceData.oi ?? ceData.OpenInterest ?? ceData.OI ?? 0),
//                         oiChg: Number(ceData.oi_change ?? ceData.oiChange ?? ceData.oiChg ?? ceData.OIChange ?? ceData.changeInOi ?? 0),
//                         token: ceData.securityId ?? ceData.token ?? ceData.SecurityId ?? ''
//                     },
//                     PE: {
//                         // 🎯 THE FIX: last_price यहाँ भी ऐड किया गया है
//                         ltp: Number(peData.last_price ?? peData.lastPrice ?? peData.ltp ?? peData.LTP ?? peData.LastPrice ?? 0),
//                         volume: Number(peData.volume ?? peData.Volume ?? peData.tradedVolume ?? 0),
//                         oi: Number(peData.open_interest ?? peData.openInterest ?? peData.oi ?? peData.OpenInterest ?? peData.OI ?? 0),
//                         oiChg: Number(peData.oi_change ?? peData.oiChange ?? peData.oiChg ?? ceData.OIChange ?? peData.changeInOi ?? 0),
//                         token: peData.securityId ?? peData.token ?? peData.SecurityId ?? ''
//                     }
//                 });
//             });

//             formattedChain.sort((a, b) => a.strikePrice - b.strikePrice);

//             // ==========================================
//             // 🌟 PLAN B: THE CRASH GUARD (अगर Plan A फेल हो जाए)
//             // ==========================================
//             if (!liveSpotPrice || liveSpotPrice === 0) {
//                 let minDiff = Infinity;
//                 let atmStrike = 0, atmCE = 0, atmPE = 0;
                
//                 formattedChain.forEach(strikeData => {
//                     const ceLtp = strikeData.CE.ltp, peLtp = strikeData.PE.ltp, strikeVal = strikeData.strikePrice;
//                     if (ceLtp > 0 && peLtp > 0 && strikeVal > 0) {
//                         const diff = Math.abs(ceLtp - peLtp);
//                         if (diff < minDiff) { minDiff = diff; atmStrike = strikeVal; atmCE = ceLtp; atmPE = peLtp; }
//                     }
//                 });

//                 if (atmStrike > 0) {
//                     liveSpotPrice = Math.round((atmStrike + atmCE - atmPE) * 100) / 100;
//                     console.log(`✅ [CRASH GUARD] Plan A Failed, using Synthetic Spot: ${liveSpotPrice}`);
//                 }
//             }

//             // 🌟 PLAN C: ULTIMATE FALLBACK (ताकि SPOT कभी 0 न हो)
//             liveSpotPrice = liveSpotPrice || global.liveSpotPrices?.[symbol] || 23500;
            
//             if (!global.liveSpotPrices) global.liveSpotPrices = {};
//             global.liveSpotPrices[symbol] = liveSpotPrice;

//             return res.json({
//                 success: true,
//                 spotPrice: liveSpotPrice, 
//                 chain: formattedChain
//             });
        
//         } else {
//             throw new Error("Invalid response from Dhan API");
//         }

//     } catch (error) {
//         console.error("❌ Error fetching live AOC:", error?.response?.data || error.message);
//         res.status(500).json({ success: false, message: error.message });
//     }
// });


// // ✅ 3. Real-time Connection Logic
// io.on('connection', (socket) => {
//   console.log(`User Connected: ${socket.id}`.green);
  
//   socket.on('disconnect', () => {
//     console.log('User Disconnected'.red);
//   });
// });

// // Test Route
// app.get('/', (req, res) => {
//   res.send('API & Socket Server Running...');
// });


// // 🔥 THE FIX: BACKEND ENGINE START YAHAN HOGA (Socket Ready hone ke baad)
// require('./engine/tradingEngine');


// const PORT = process.env.PORT || 6000;

// // ✅ Note: app.listen ki jagah server.listen use karein
// server.listen(PORT, () => {
//   console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`.yellow.bold);
// });




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

        // 🎯 1. FETCH CREDENTIALS 
        const broker = await Broker.findOne({ name: "Dhan" }); 
        if (!broker || !broker.apiSecret || !broker.clientId) {
            return res.status(400).json({ success: false, message: "Credentials not found." });
        }

        const DHAN_CLIENT_ID = broker.clientId;
        const DHAN_ACCESS_TOKEN = broker.apiSecret; 
        const underlyingScrip = symbol === 'NIFTY' ? 13 : 25;

        // ==========================================
        // 🌟 PLAN A: FETCH SPOT FROM INTRADAY API
        // ==========================================
        let liveSpotPrice = 0;
        try {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const syncDate = `${year}-${month}-${day}`;
            
            const spotPayload = { 
                securityId: underlyingScrip.toString(), 
                exchangeSegment: "IDX_I", 
                instrument: "INDEX", 
                interval: "1", 
                fromDate: `${syncDate} 09:15:00`, 
                toDate: `${syncDate} 15:30:00` 
            };

            const spotRes = await axios.post('https://api.dhan.co/v2/charts/intraday', spotPayload, {
                headers: { 'access-token': DHAN_ACCESS_TOKEN, 'client-id': DHAN_CLIENT_ID, 'Content-Type': 'application/json' }
            });
            
            if (spotRes.data?.data?.close?.length > 0) {
                const closePrices = spotRes.data.data.close;
                liveSpotPrice = Number(closePrices[closePrices.length - 1]);
            }
        } catch (spotErr) {
            console.error("⚠️ Plan A Failed (Intraday API):", spotErr.message);
        }

        // ==========================================
        // 🌟 FETCH OPTION CHAIN
        // ==========================================
        let formattedExpiry = expiry && expiry.length === 10 ? expiry : "2026-09-22"; 
        
        const payload = { "UnderlyingScrip": underlyingScrip, "UnderlyingSeg": "IDX_I", "Expiry": formattedExpiry };

        const response = await axios.post('https://api.dhan.co/v2/optionchain', payload, {
            headers: { 'access-token': DHAN_ACCESS_TOKEN, 'client-id': DHAN_CLIENT_ID, 'Content-Type': 'application/json' }
        });

        if (response.data && response.data.data) {
            let rawChain = response.data.data.oc || response.data.data;
            const iterableChain = Array.isArray(rawChain) ? rawChain : Object.entries(rawChain).map(([key, val]) => ({ strikePrice: parseFloat(key), ...val }));

            let formattedChain = [];
            
            iterableChain.forEach(strikeData => {
                if (!strikeData) return;
                const strikeVal = strikeData.strikePrice || strikeData.strike || parseFloat(strikeData.StrikePrice) || 0;
                if (strikeVal === 0) return; 

                const ceData = strikeData.ce || strikeData.CE || {};
                const peData = strikeData.pe || strikeData.PE || {};

                formattedChain.push({
                    strikePrice: strikeVal, strike: strikeVal,
                    CE: {
                        ltp: Number(ceData.last_price ?? ceData.lastPrice ?? ceData.ltp ?? ceData.LTP ?? ceData.LastPrice ?? 0),
                        volume: Number(ceData.volume ?? ceData.Volume ?? ceData.tradedVolume ?? 0),
                        oi: Number(ceData.open_interest ?? ceData.openInterest ?? ceData.oi ?? ceData.OpenInterest ?? ceData.OI ?? 0),
                        oiChg: Number(ceData.oi_change ?? ceData.oiChange ?? ceData.oiChg ?? ceData.OIChange ?? ceData.changeInOi ?? 0),
                        token: ceData.securityId ?? ceData.token ?? ceData.SecurityId ?? ''
                    },
                    PE: {
                        ltp: Number(peData.last_price ?? peData.lastPrice ?? peData.ltp ?? peData.LTP ?? peData.LastPrice ?? 0),
                        volume: Number(peData.volume ?? peData.Volume ?? peData.tradedVolume ?? 0),
                        oi: Number(peData.open_interest ?? peData.openInterest ?? peData.oi ?? peData.OpenInterest ?? peData.OI ?? 0),
                        oiChg: Number(peData.oi_change ?? peData.oiChange ?? peData.oiChg ?? ceData.OIChange ?? peData.changeInOi ?? 0),
                        token: peData.securityId ?? peData.token ?? peData.SecurityId ?? ''
                    }
                });
            });

            formattedChain.sort((a, b) => a.strikePrice - b.strikePrice);

            // ==========================================
            // 🌟 PLAN B: THE CRASH GUARD (अगर Plan A फेल हो जाए)
            // ==========================================
            if (!liveSpotPrice || liveSpotPrice === 0) {
                let minDiff = Infinity;
                let atmStrike = 0, atmCE = 0, atmPE = 0;
                
                formattedChain.forEach(strikeData => {
                    const ceLtp = strikeData.CE.ltp, peLtp = strikeData.PE.ltp, strikeVal = strikeData.strikePrice;
                    if (ceLtp > 0 && peLtp > 0 && strikeVal > 0) {
                        const diff = Math.abs(ceLtp - peLtp);
                        if (diff < minDiff) { minDiff = diff; atmStrike = strikeVal; atmCE = ceLtp; atmPE = peLtp; }
                    }
                });

                if (atmStrike > 0) {
                    liveSpotPrice = Math.round((atmStrike + atmCE - atmPE) * 100) / 100;
                    console.log(`✅ [CRASH GUARD] Plan A Failed, using Synthetic Spot: ${liveSpotPrice}`);
                }
            }

            // 🌟 PLAN C: ULTIMATE FALLBACK (ताकि SPOT कभी 0 न हो)
            liveSpotPrice = liveSpotPrice || global.liveSpotPrices?.[symbol] || 23500;
            
            if (!global.liveSpotPrices) global.liveSpotPrices = {};
            global.liveSpotPrices[symbol] = liveSpotPrice;

            return res.json({
                success: true,
                spotPrice: liveSpotPrice, 
                chain: formattedChain
            });
        
        } else {
            throw new Error("Invalid response from Dhan API");
        }

    } catch (error) {
        console.error("❌ Error fetching live AOC:", error?.response?.data || error.message);
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


