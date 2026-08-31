// const { pool } = require('../config/postgres');

// exports.getChartData = async (req, res) => {
//     try {
//         const { date, symbol = 'NIFTY' } = req.query;

//         if (!date) {
//             return res.status(400).json({ success: false, message: "Date is required" });
//         }

//         // 🎯 SMC Logic: Humein us din ka subah 09:15 se lekar 15:30 tak ka data chahiye
//         const startTime = `${date} 09:15:00+05:30`;
//         const endTime = `${date} 15:30:00+05:30`;

//         const query = `
//             SELECT timestamp, open, high, low, close, volume 
//             FROM historical_candles 
//             WHERE symbol = $1 
//             AND timestamp >= $2::timestamptz 
//             AND timestamp <= $3::timestamptz 
//             ORDER BY timestamp ASC
//         `;

//         const result = await pool.query(query, [symbol, startTime, endTime]);

//         res.json({
//             success: true,
//             data: result.rows // Ye array return karega
//         });

//     } catch (error) {
//         console.error("Chart API Error:", error);
//         res.status(500).json({ success: false, message: error.message });
//     }
// };



const { pool } = require('../config/postgres');

exports.getChartData = async (req, res) => {
    try {
        // 🎯 1. अब हम startDate और endDate दोनों को रिसीव करेंगे (पुराने 'date' का भी सपोर्ट रखेंगे)
        const { startDate, endDate, date, symbol = 'NIFTY' } = req.query;

        // अगर नया फ्रंटएंड startDate/endDate भेज रहा है तो वो लो, वरना पुराने वाले date को यूज़ करो
        const finalStartDate = startDate || date;
        const finalEndDate = endDate || date;

        if (!finalStartDate || !finalEndDate) {
            return res.status(400).json({ success: false, message: "Date parameters are required" });
        }

        // 🎯 2. Range Logic: startDate की सुबह 09:15 से लेकर endDate की दोपहर 15:30 तक
        const startTime = `${finalStartDate} 09:15:00+05:30`;
        const endTime = `${finalEndDate} 15:30:00+05:30`;

        const query = `
            SELECT timestamp, open, high, low, close, volume 
            FROM historical_candles 
            WHERE symbol = $1 
            AND timestamp >= $2::timestamptz 
            AND timestamp <= $3::timestamptz 
            ORDER BY timestamp ASC
        `;

        const result = await pool.query(query, [symbol, startTime, endTime]);

        res.json({
            success: true,
            data: result.rows // Ye array return karega
        });

    } catch (error) {
        console.error("Chart API Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};