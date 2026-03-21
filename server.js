
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http'); // ✅ Import HTTP
const { Server } = require('socket.io'); // ✅ Import Socket.io
const connectDB = require('./config/db');
const colors = require('colors');

require('./engine/tradingEngine');


const webhookRoutes = require('./routes/webhookRoutes');

const algoLogRoutes = require('./routes/algoLogRoutes');

const { downloadAndParseInstruments } = require('./services/instrumentService');

const backtestRoutes = require('./routes/backtestRoutes');

// Config
dotenv.config();
connectDB();

const app = express();

// App start hone par ye function call karein
downloadAndParseInstruments();

// Middlewares
app.use(express.json());
app.use(cors({orgins: '*'}));

// ✅ 1. HTTP Server Create (Socket.io ke liye)
const server = http.createServer(app);

// ✅ 2. Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: "*", // Frontend URL allow karein
    methods: ["GET", "POST"]
  }
});

// 🔥 NAYI LINE: io ko app me save kar rahe hain taaki dusri files isko use kar sakein
app.set('io', io);

// Routes
app.use('/api/brokers', require('./routes/brokerRoutes'));
app.use('/api/strategies', require('./routes/strategyRoutes')); // ✅ NEW LINE ADDED

app.use('/api/deployments', require('./routes/deploymentRoutes'));



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

// Uske baad isko use karein
app.use('/api/webhook', webhookRoutes);


app.use('/api/algo-logs', algoLogRoutes);

app.use('/api/backtest', backtestRoutes);



const PORT = process.env.PORT || 6000;

// ✅ Note: app.listen ki jagah server.listen use karein
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold);
});