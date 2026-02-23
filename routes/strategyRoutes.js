const express = require('express');
const router = express.Router();
const { createStrategy, getStrategies, updateStrategy, toggleStrategy, deleteStrategy } = require('../controllers/strategyController');

// Routes
router.post('/add', createStrategy);        // New Strategy banane ke liye
router.get('/', getStrategies);             // List dekhne ke liye
router.put('/toggle/:id', toggleStrategy);  // On/Off karne ke liye

// ✅ NEW ROUTE
router.put('/:id', updateStrategy);

router.delete('/:id', deleteStrategy); // ✅ NEW ROUTE ADDED

module.exports = router;