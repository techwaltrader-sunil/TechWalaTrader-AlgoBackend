const express = require('express');
const router = express.Router();
const { deployStrategy, getActiveDeployments, stopDeployment } = require('../controllers/deploymentController');
const reportController = require('../controllers/reportController');

router.post('/', deployStrategy);
router.get('/active', getActiveDeployments);
router.post('/stop/:id', stopDeployment);

router.get('/reports/summary', reportController.getReportSummary);

module.exports = router;