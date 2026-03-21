const express = require('express');
const router = express.Router();
const { deployStrategy, getActiveDeployments } = require('../controllers/deploymentController');

router.post('/', deployStrategy);
router.get('/active', getActiveDeployments);

module.exports = router;