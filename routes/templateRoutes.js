const express = require('express');
const router = express.Router();
const StrategyTemplate = require('../models/StrategyTemplate');

// 1. 🟢 GET ALL TEMPLATES (User & Admin both)
router.get('/', async (req, res) => {
    try {
        // Sirf active templates fetch karenge, naye pehle dikhenge
        const templates = await StrategyTemplate.find({ isActive: true }).sort({ createdAt: -1 });
        res.status(200).json(templates);
    } catch (error) {
        console.error("Fetch Templates Error:", error);
        res.status(500).json({ message: "Failed to fetch templates", error: error.message });
    }
});

// 2. 🔵 CREATE NEW TEMPLATE (Admin Action)
router.post('/', async (req, res) => {
    try {
        const newTemplate = new StrategyTemplate(req.body);
        await newTemplate.save();
        res.status(201).json({ message: "Template Created Successfully!", template: newTemplate });
    } catch (error) {
        console.error("Create Template Error:", error);
        res.status(500).json({ message: "Failed to create template", error: error.message });
    }
});

// 3. 🟠 EDIT/UPDATE TEMPLATE (Admin Action)
router.put('/:id', async (req, res) => {
    try {
        const updatedTemplate = await StrategyTemplate.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true } // naya updated document return karega
        );
        
        if (!updatedTemplate) {
            return res.status(404).json({ message: "Template not found" });
        }
        
        res.status(200).json({ message: "Template Updated Successfully!", template: updatedTemplate });
    } catch (error) {
        console.error("Update Template Error:", error);
        res.status(500).json({ message: "Failed to update template", error: error.message });
    }
});

// 4. 🔴 DELETE TEMPLATE (Admin Action - Soft Delete)
router.delete('/:id', async (req, res) => {
    try {
        // Hum actually delete nahi kar rahe, bas isActive = false kar rahe hain (Safe method)
        const deletedTemplate = await StrategyTemplate.findByIdAndUpdate(
            req.params.id, 
            { isActive: false },
            { new: true }
        );

        if (!deletedTemplate) {
            return res.status(404).json({ message: "Template not found" });
        }

        res.status(200).json({ message: "Template Deleted Successfully!" });
    } catch (error) {
        console.error("Delete Template Error:", error);
        res.status(500).json({ message: "Failed to delete template", error: error.message });
    }
});

module.exports = router;