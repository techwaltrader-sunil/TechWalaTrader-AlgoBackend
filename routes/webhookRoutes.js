const express = require('express');
const router = express.Router();
const { handleTradingViewAlert } = require('../controllers/webhookController');

// Ye route TradingView se POST request receive karega
// Example URL: http://YOUR_SERVER_IP:5500/api/webhook/tv
router.post('/tv', handleTradingViewAlert);

module.exports = router;