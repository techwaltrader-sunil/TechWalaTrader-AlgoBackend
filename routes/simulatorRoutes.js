const express = require('express');
const router = express.Router();
const { getSimulatorData, getMonthExpiries } = require('../controllers/simulatorController');

// GET /api/simulator/data?date=2026-08-17&time=09:15
router.get('/data', getSimulatorData);

// GET /api/simulator/expiries?year=2026&month=8&symbol=NIFTY
router.get('/expiries', getMonthExpiries);

module.exports = router;