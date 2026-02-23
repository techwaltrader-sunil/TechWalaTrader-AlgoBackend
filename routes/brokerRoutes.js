const express = require('express');
const router = express.Router();
const { addBroker, getBrokers, deleteBroker, squareOffBroker, updateBrokerStatus, updateEngineStatus } = require('../controllers/brokerController');

// URL: /api/brokers/add
router.post('/add', addBroker);

// URL: /api/brokers
router.get('/', getBrokers);

router.delete('/:id', deleteBroker); // ✅ NEW ROUTE

router.post('/square-off/:id', squareOffBroker); // ✅ Square Off Route

router.put('/:id/status', updateBrokerStatus); // ✅ Route for status update

// ✅ NAYA ROUTE: Engine ke liye
router.put('/:id/engine', updateEngineStatus);

module.exports = router;