const express = require('express'); // 🎯 'react' की जगह 'express' कर दिया
const router = express.Router();
const insightController = require('../controllers/insightController');

// ब्राउज़र में चेक करने के लिए अभी GET ही रहने देते हैं
router.post('/insights', insightController.getInsightData);

module.exports = router;