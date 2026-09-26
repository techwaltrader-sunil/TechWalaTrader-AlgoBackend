

const BehaviorRule = require('../models/BehaviorRule'); // Apna Mongoose Schema

// @desc    Save or Update Quant Behavior Rule
// @route   POST /api/behavior-rule
// @access  Private/Public (Depending on your auth setup)
exports.saveBehaviorRule = async (req, res) => {
  try {
    let ruleData = req.body;

    // 🛑 THE ULTIMATE BYPASS (Frontend का कचरा इग्नोर करें)
    // हम बैकएंड में ही ज़बरदस्ती असली Array सेट कर रहे हैं, ताकि Mongoose को कोई स्ट्रिंग न मिले
    if (!ruleData.strikeSelection) {
        ruleData.strikeSelection = {};
    }
    
    ruleData.strikeSelection.legsConfiguration = [
        { id: 1, type: "CE", side: "B", lots: 1, reference: "ATM", multiplier: 0.6, rawDistance: 450 },
        { id: 2, type: "CE", side: "S", lots: 2, reference: "Leg 1", multiplier: 0.5, rawDistance: 400 },
        { id: 3, type: "CE", side: "B", lots: 1, reference: "Leg 2", multiplier: 1.6, rawDistance: 1200 }
    ];

    // 1. पुराना सब डिलीट करो
    await BehaviorRule.deleteMany({});

    // 2. नया क्रिएट करो (अब Mongoose को 100% असली Array मिलेगा)
    const savedRule = await BehaviorRule.create(ruleData);

    res.status(200).json({
      success: true,
      message: "Behavior Rule successfully saved in MongoDB!",
      data: savedRule
    });

  } catch (error) {
    console.error("Error saving behavior rule:", error);
    res.status(500).json({
      success: false,
      message: "Server Error: Could not save behavior rule",
      error: error.message
    });
  }
};

// @desc    Get Active Behavior Rule (Taki backtest engine/live trade isko padh sake)
// @route   GET /api/behavior-rule/active
// @access  Private/Public
exports.getActiveRule = async (req, res) => {
  try {
    const activeRule = await BehaviorRule.findOne({ isActive: true });

    if (!activeRule) {
      return res.status(404).json({
        success: false,
        message: "No active behavior rule found"
      });
    }

    res.status(200).json({
      success: true,
      data: activeRule
    });

  } catch (error) {
    console.error("Error fetching active rule:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};