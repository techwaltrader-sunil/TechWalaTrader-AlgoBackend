const express = require('express');
const router = express.Router();
const { getAlgoTradeLogs } = require('../controllers/algoLogController');

router.get('/', getAlgoTradeLogs);

module.exports = router;