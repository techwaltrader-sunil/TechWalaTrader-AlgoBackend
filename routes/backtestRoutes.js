// const express = require('express');
// const router = express.Router();
// const { runBacktestSimulator } = require('../controllers/backtestController');

// // Route: GET /api/backtest/run/:strategyId
// router.get('/run/:strategyId', runBacktestSimulator);

// module.exports = router;


const express = require('express');
const router = express.Router();
const { runBacktestSimulator } = require('../controllers/backtestController');

// 👇 Frontend thik yahi route GET kar raha hai 👇
router.get('/run/:strategyId', runBacktestSimulator);

module.exports = router;