// const { pool } = require('../config/postgres');

// exports.getSimulatorData = async (req, res) => {
//     try {
//         let { date, time } = req.query; 

//         // 🛡️ THE FIX: Agar direct URL hit kiya bina parameters ke (Browser test)
//         if (!date || !time) {
//             date = '2026-08-17'; // Default date
//             time = '09:16';      // Default time (Kyunki spot 09:16 se shuru hota hai)
//         }
        
//         // Timezone ke sath exact timestamp banayenge (+05:30 IST)
//         const timestampStr = `${date} ${time}:00+05:30`;

//         // 1. Fetch Spot Price (Nifty 50) - (Added ::timestamptz for strict Postgres matching)
//         const spotQuery = `SELECT close as spot_price FROM historical_candles WHERE symbol = 'NIFTY' AND timestamp = $1::timestamptz`;
//         const spotRes = await pool.query(spotQuery, [timestampStr]);
//         const spotPrice = spotRes.rows.length > 0 ? parseFloat(spotRes.rows[0].spot_price) : null;

//         // 2. Fetch Option Chain Data
//         const chainQuery = `
//             SELECT strike, option_type, close as ltp, delta, oi, volume, iv
//             FROM option_chain_data 
//             WHERE instrument = 'NIFTY' AND timestamp = $1::timestamptz
//             ORDER BY strike ASC
//         `;
//         const chainRes = await pool.query(chainQuery, [timestampStr]);

//         // 3. Format Data for Stockmock like UI
//         const chainMap = {};
//         chainRes.rows.forEach(row => {
//             const strike = parseFloat(row.strike);
//             if (!chainMap[strike]) {
//                 chainMap[strike] = { strike: strike };
//             }
//             if (row.option_type === 'CE') {
//                 chainMap[strike].CE = row;
//             } else if (row.option_type === 'PE') {
//                 chainMap[strike].PE = row;
//             }
//         });

//         const formattedChain = Object.values(chainMap).sort((a, b) => a.strike - b.strike);

//         res.json({
//             success: true,
//             timestamp: timestampStr,
//             spotPrice: spotPrice,
//             chain: formattedChain
//         });

//     } catch (error) {
//         console.error("Simulator API Error:", error);
//         res.status(500).json({ success: false, message: error.message });
//     }
// };



const { pool } = require('../config/postgres');
// 🎯 1. Tumhara DTE Calculator import kar liya
const { calculateDTE, isThisExpiryDay } = require('../engine/utils/expiryCalculator'); 

exports.getSimulatorData = async (req, res) => {
    try {
        // 🎯 FIX 1: req.query me se 'expiry' ko bhi receive karna hai
        let { date, time, expiry } = req.query; 

        if (!date || !time) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            
            date = `${yyyy}-${mm}-${dd}`; 
            time = '09:16';               
        }
        
        const timestampStr = `${date} ${time}:00+05:30`;

        // 1. Fetch Spot Price (Nifty 50)
        const spotQuery = `SELECT close as spot_price FROM historical_candles WHERE symbol = 'NIFTY' AND timestamp = $1::timestamptz`;
        const spotRes = await pool.query(spotQuery, [timestampStr]);
        const spotPrice = spotRes.rows.length > 0 ? parseFloat(spotRes.rows[0].spot_price) : null;

        // 1.5 Fetch Available Expiries
        const expiriesQuery = `
            SELECT DISTINCT expiry_date 
            FROM option_chain_data 
            WHERE instrument = 'NIFTY' AND timestamp = $1::timestamptz
            ORDER BY expiry_date ASC
        `;
        const expiriesRes = await pool.query(expiriesQuery, [timestampStr]);
        
        const availableExpiries = expiriesRes.rows.map(row => {
            const d = new Date(row.expiry_date);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        });

        // 🎯 FIX 2: targetExpiry ko safely define kiya gaya hai
        let targetExpiry = expiry;
        if (!targetExpiry && availableExpiries.length > 0) {
            targetExpiry = availableExpiries[0]; 
        }

        // 2. Fetch Option Chain Data (Crash-proof logic)
        let chainQuery = "";
        let queryParams = [timestampStr];

        if (targetExpiry) {
            chainQuery = `
                SELECT strike, option_type, close as ltp, delta, oi, volume, iv, expiry_date 
                FROM option_chain_data 
                WHERE instrument = 'NIFTY' 
                AND timestamp = $1::timestamptz 
                AND expiry_date = $2::date
                ORDER BY strike ASC
            `;
            queryParams.push(targetExpiry); // Yahan targetExpiry safely use ho raha hai
        } else {
            chainQuery = `
                SELECT strike, option_type, close as ltp, delta, oi, volume, iv, expiry_date 
                FROM option_chain_data 
                WHERE instrument = 'NIFTY' 
                AND timestamp = $1::timestamptz
                ORDER BY strike ASC
            `;
        }

        const chainRes = await pool.query(chainQuery, queryParams);

        // 3. Format Data for Stockmock like UI
        const chainMap = {};
        chainRes.rows.forEach(row => {
            const strike = parseFloat(row.strike);
            if (!chainMap[strike]) {
                chainMap[strike] = { strike: strike };
            }
            if (row.option_type === 'CE') {
                chainMap[strike].CE = row;
            } else if (row.option_type === 'PE') {
                chainMap[strike].PE = row;
            }
        });

        const formattedChain = Object.values(chainMap).sort((a, b) => a.strike - b.strike);

        // 4. Calculate Exact DTE
        let exactDTE = 4; // Fallback default value
        if (chainRes.rows.length > 0) {
            const expiryDateDB = chainRes.rows[0].expiry_date; 
            
            // Dhyan de: Agar tumne calculateDTE import nahi kiya hai, to ise comment kar dena
            if (typeof calculateDTE === 'function') {
                exactDTE = calculateDTE(timestampStr, expiryDateDB);
            }
        }

        res.json({
            success: true,
            timestamp: timestampStr,
            spotPrice: spotPrice,
            dte: exactDTE, 
            chain: formattedChain,
            availableExpiries: availableExpiries 
        });

    } catch (error) {
        console.error("Simulator API Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.getMonthExpiries = (req, res) => {
    try {
        const { year, month, symbol = 'NIFTY' } = req.query;
        const expiries = [];
        
        // Us mahine me kitne din hain (28, 30 ya 31) wo nikalenge
        const daysInMonth = new Date(year, month, 0).getDate();

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            
            // Tumhare expiryCalculator.js ka centralized logic yahan chalega
            if (isThisExpiryDay(dateStr, symbol)) {
                expiries.push(dateStr);
            }
        }

        res.json({ success: true, expiries });
    } catch (error) {
        console.error("Expiry API Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};