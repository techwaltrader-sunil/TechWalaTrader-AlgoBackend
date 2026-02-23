const Broker = require('../models/Broker');

// @desc    Add a new broker
// @route   POST /api/brokers/add
// @access  Public (Abhi ke liye)
const addBroker = async (req, res) => {
  try {
    const { name, clientId, apiKey, apiSecret, logo } = req.body;

    // 1. Check agar broker pehle se exist karta hai (Client ID se)
    const brokerExists = await Broker.findOne({ clientId });

    if (brokerExists) {
      return res.status(400).json({ message: 'Broker with this Client ID already exists' });
    }

    // 2. Naya broker create karo
    const broker = await Broker.create({
      name,
      clientId,
      apiKey,
      apiSecret,
      logo,
      status: 'Not Connected',
      isConnected: false
    });

    if (broker) {
      res.status(201).json({
        _id: broker.id,
        name: broker.name,
        clientId: broker.clientId,
        message: 'Broker added successfully!'
      });
    } else {
      res.status(400).json({ message: 'Invalid broker data' });
    }

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all connected brokers
// @route   GET /api/brokers
const getBrokers = async (req, res) => {
  try {
    const brokers = await Broker.find({});
    res.json(brokers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ FIXED: Delete Broker
const deleteBroker = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Broker.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ message: "Broker not found" });
        
        res.json({ message: 'Broker deleted successfully', id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ✅ NEW: Square Off Logic (Praman ke liye Console Log)
const squareOffBroker = async (req, res) => {
    try {
        const { id } = req.params;
        const broker = await Broker.findById(id);
        
        // 🔥 PROOF: Ye Terminal me print hoga
        console.log(`=========================================`);
        console.log(`🚨 EMERGENCY SQUARE OFF TRIGGERED!`);
        console.log(`🆔 Broker ID: ${id}`);
        console.log(`👤 Broker Name: ${broker ? broker.name : 'Unknown'}`);
        console.log(`📉 Action: Closing all open positions...`);
        console.log(`=========================================`);

        // Yaha future me real AngelOne/Zerodha API call aayega
        
        res.json({ success: true, message: `Square Off command sent for ${broker?.name}` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ✅ UPDATE BROKER STATUS FUNCTION
const updateBrokerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // status Frontend se aayega (true ya false)

        console.log(`Backend got update request: Broker ID = ${id}, New Status = ${status}`);

        const updatedBroker = await Broker.findByIdAndUpdate(
            id,
            { 
                terminalOn: status,                // Naya Field update 
                isConnected: status,               // Purana Field bhi sync kar diya
                status: status ? 'Connected' : 'Not Connected' // Status text bhi change kar diya
            },
            { new: true } // Update hone ke baad naya data return kare
        );

        if (!updatedBroker) {
            return res.status(404).json({ message: "Broker not found" });
        }

        res.json(updatedBroker);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// ✅ NEW: Update Trading Engine Status
const updateEngineStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { engineOn } = req.body; // true ya false

        console.log(`Backend Engine Update: Broker ID = ${id}, Engine = ${engineOn}`);

        const updatedBroker = await Broker.findByIdAndUpdate(
            id,
            { engineOn: engineOn }, // MongoDB me engineOn update karega
            { new: true }
        );

        if (!updatedBroker) return res.status(404).json({ message: "Broker not found" });
        res.json(updatedBroker);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
  addBroker,
  getBrokers,
  deleteBroker,
  squareOffBroker,
  updateBrokerStatus,
  updateEngineStatus
};