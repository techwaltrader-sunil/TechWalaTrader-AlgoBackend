const mongoose = require('mongoose');

const strategyTemplateSchema = new mongoose.Schema({
    // 🃏 Card Display Details
    name: { type: String, required: true },
    description: { type: String, required: true },
    segment: { type: String, default: 'Options' }, // e.g., Options, Futures, Equity
    type: { type: String, default: 'Time Based' }, // e.g., Time Based, Indicator, Price Action
    risk: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    roi: { type: String, default: 'TBD' }, // e.g., '~5-8% / Mo'
    capital: { type: String, default: '1.0L' }, // e.g., '1.5L', '50K'

    // 🧠 Core Strategy Configuration (Exact format as a normal strategy)
    data: {
        type: Object,
        required: true
    },
    
    // 🛡️ Admin & Control
    // createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Future use ke liye
    isActive: { type: Boolean, default: true } // Soft delete ke liye (taki data completely destroy na ho)
}, { timestamps: true });

module.exports = mongoose.model('StrategyTemplate', strategyTemplateSchema);