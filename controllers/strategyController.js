

const Strategy = require('../models/Strategy');

// @desc    Create a new strategy
// @route   POST /api/strategies/add
const createStrategy = async (req, res) => {
  try {
    // Frontend sends: { name, type, status, data: { instruments, legs, ... } }
    const { name, type, status, data } = req.body;

    const strategy = await Strategy.create({
      name,
      type,
      status: status || 'Inactive',
      data // This saves the entire complex object as-is
    });

    res.status(201).json(strategy);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ... keep getStrategies and toggleStrategy as they were ...
const getStrategies = async (req, res) => {
  try {
    const strategies = await Strategy.find({}).sort({ createdDate: -1 }); // Newest first
    res.json(strategies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ NEW FUNCTION: Update Strategy
const updateStrategy = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body; // Jo data bhejenge wahi update hoga

        const updatedStrategy = await Strategy.findByIdAndUpdate(
            id, 
            updates, 
            { new: true } // Return updated document
        );

        if (!updatedStrategy) {
            return res.status(404).json({ message: "Strategy not found" });
        }

        res.json(updatedStrategy);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const toggleStrategy = async (req, res) => {
    try {
        const strategy = await Strategy.findById(req.params.id);
        if(strategy) {
            // Toggle status string instead of boolean if you prefer "Active"/"Inactive"
            strategy.status = strategy.status === 'Active' ? 'Inactive' : 'Active';
            await strategy.save();
            res.json(strategy);
        } else {
            res.status(404).json({ message: 'Strategy not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}


// ✅ NEW FUNCTION: Delete Strategy
const deleteStrategy = async (req, res) => {
    try {
        const { id } = req.params;
        await Strategy.findByIdAndDelete(id);
        res.json({ message: 'Strategy deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
  createStrategy,
  getStrategies,
  updateStrategy,
  toggleStrategy,
  deleteStrategy
};

