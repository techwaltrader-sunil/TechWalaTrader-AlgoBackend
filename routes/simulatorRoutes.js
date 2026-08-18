const express = require('express');
const router = express.Router();
const { getSimulatorData } = require('../controllers/simulatorController');

// GET /api/simulator/data?date=2026-08-17&time=09:15
router.get('/data', getSimulatorData);

module.exports = router;