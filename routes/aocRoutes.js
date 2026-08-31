const express = require('express');
const router = express.Router();
const aocController = require('../controllers/aocController');

// Ye route frontend hit karega: /api/aoc/chart-data
router.get('/chart-data', aocController.getChartData);

module.exports = router;