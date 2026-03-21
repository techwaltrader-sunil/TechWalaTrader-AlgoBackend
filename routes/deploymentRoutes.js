const express = require('express');
const router = express.Router();
const { deployStrategy, getActiveDeployments, stopDeployment } = require('../controllers/deploymentController');

router.post('/', deployStrategy);
router.get('/active', getActiveDeployments);
router.post('/stop/:id', stopDeployment);

module.exports = router;