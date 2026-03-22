
// const express = require('express');
// const dotenv = require('dotenv');
// const cors = require('cors');
// const http = require('http'); // ✅ Import HTTP
// const { Server } = require('socket.io'); // ✅ Import Socket.io
// const connectDB = require('./config/db');
// const colors = require('colors');


// const webhookRoutes = require('./routes/webhookRoutes');

// const algoLogRoutes = require('./routes/algoLogRoutes');

// const { downloadAndParseInstruments } = require('./services/instrumentService');

// const backtestRoutes = require('./routes/backtestRoutes');

// // Config
// dotenv.config();
// connectDB();

// const app = express();

// // App start hone par ye function call karein
// downloadAndParseInstruments();

// // Middlewares
// app.use(express.json());
// app.use(cors({orgins: '*'}));

// // ✅ 1. HTTP Server Create (Socket.io ke liye)
// const server = http.createServer(app);

// // ✅ 2. Socket.io Setup
// const io = new Server(server, {
//   cors: {
//     origin: "*", // Frontend URL allow karein
//     methods: ["GET", "POST"]
//   }
// });

// // 🔥 NAYI LINE: io ko app me save kar rahe hain taaki dusri files isko use kar sakein
// app.set('io', io);

// // Routes
// app.use('/api/brokers', require('./routes/brokerRoutes'));
// app.use('/api/strategies', require('./routes/strategyRoutes')); // ✅ NEW LINE ADDED



// // ✅ 3. Real-time Connection Logic
// io.on('connection', (socket) => {
//   console.log(`User Connected: ${socket.id}`.green);

//   // 🔥 MARKET SIMULATOR (Har 1 second me fake P&L bhejo)
//   const interval = setInterval(() => {
//     // Random P&L between -500 to +1500
//     const fakePnL = (Math.random() * 2000 - 500).toFixed(2);
    
//     // Frontend ko data bhejo
//     socket.emit('market-update', {
//       pnl: fakePnL,
//       message: 'Live Data from Market'
//     });
//   }, 1000); // 1 Second interval

//   socket.on('disconnect', () => {
//     console.log('User Disconnected'.red);
//     clearInterval(interval); // Connection tootne par loop band karo
//   });
// });

// // Test Route
// app.get('/', (req, res) => {
//   res.send('API & Socket Server Running...');
// });

// // Uske baad isko use karein
// app.use('/api/webhook', webhookRoutes);


// app.use('/api/algo-logs', algoLogRoutes);

// app.use('/api/backtest', backtestRoutes);

// const PORT = process.env.PORT || 6000;

// // ✅ Note: app.listen ki jagah server.listen use karein
// server.listen(PORT, () => {
//   console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold);
// });



const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http'); // ✅ Import HTTP
const { Server } = require('socket.io'); // ✅ Import Socket.io
const connectDB = require('./config/db');
const colors = require('colors');

// Config
dotenv.config();
connectDB();

// 🔥 BACKEND ENGINE START (Cron Jobs ke liye ye zaroori hai)
require('./engine/tradingEngine');

const webhookRoutes = require('./routes/webhookRoutes');
const algoLogRoutes = require('./routes/algoLogRoutes');
const backtestRoutes = require('./routes/backtestRoutes');
const { downloadAndParseInstruments } = require('./services//instrumentService');

const app = express();

// App start hone par ye function call karein
downloadAndParseInstruments();

// Middlewares
app.use(express.json());
// 🔥 FIX: 'orgins' ki jagah 'origin' hoga
app.use(cors({ origin: '*' }));

// ✅ 1. HTTP Server Create (Socket.io ke liye)
const server = http.createServer(app);

// ✅ 2. Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: "*", // Frontend URL allow karein
    methods: ["GET", "POST"]
  }
});

// 🔥 io ko app me save kar rahe hain taaki dusri files isko use kar sakein
global.io = io;
app.set('io', io);

// ==========================================
// ✅ ROUTES DEFINITION
// ==========================================
app.use('/api/brokers', require('./routes/brokerRoutes'));
app.use('/api/strategies', require('./routes/strategyRoutes')); 

// 🔥 THE MISSING LINE: Yehi chhut gaya tha! 👇
app.use('/api/deployments', require('./routes/deploymentRoutes'));

app.use('/api/webhook', webhookRoutes);
app.use('/api/algo-logs', algoLogRoutes);
app.use('/api/backtest', backtestRoutes);
// ==========================================


// ✅ 3. Real-time Connection Logic
io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`.green);

  // 🔥 MARKET SIMULATOR (Har 1 second me fake P&L bhejo)
  const interval = setInterval(() => {
    // Random P&L between -500 to +1500
    const fakePnL = (Math.random() * 2000 - 500).toFixed(2);
    
    // Frontend ko data bhejo
    socket.emit('market-update', {
      pnl: fakePnL,
      message: 'Live Data from Market'
    });
  }, 1000); // 1 Second interval

  socket.on('disconnect', () => {
    console.log('User Disconnected'.red);
    clearInterval(interval); // Connection tootne par loop band karo
  });
});

// Test Route
app.get('/', (req, res) => {
  res.send('API & Socket Server Running...');
});

const PORT = process.env.PORT || 6000;

// ✅ Note: app.listen ki jagah server.listen use karein
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`.yellow.bold);
});