const express = require('express');
const router = express.Router();
const { saveBehaviorRule, getActiveRule } = require('../controllers/behaviorController');

// POST request: Frontend Simulator se rule save karne ke liye
router.post('/', saveBehaviorRule);

// GET request: Backtest Engine ya Live Trade engine ke liye rule fetch karne ke liye
router.get('/active', getActiveRule);

module.exports = router;