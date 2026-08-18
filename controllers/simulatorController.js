const { pool } = require('../config/postgres');

exports.getSimulatorData = async (req, res) => {
    try {
        let { date, time } = req.query; 

        // 🛡️ THE FIX: Agar direct URL hit kiya bina parameters ke (Browser test)
        if (!date || !time) {
            date = '2026-08-17'; // Default date
            time = '09:16';      // Default time (Kyunki spot 09:16 se shuru hota hai)
        }
        
        // Timezone ke sath exact timestamp banayenge (+05:30 IST)
        const timestampStr = `${date} ${time}:00+05:30`;

        // 1. Fetch Spot Price (Nifty 50) - (Added ::timestamptz for strict Postgres matching)
        const spotQuery = `SELECT close as spot_price FROM historical_candles WHERE symbol = 'NIFTY' AND timestamp = $1::timestamptz`;
        const spotRes = await pool.query(spotQuery, [timestampStr]);
        const spotPrice = spotRes.rows.length > 0 ? parseFloat(spotRes.rows[0].spot_price) : null;

        // 2. Fetch Option Chain Data
        const chainQuery = `
            SELECT strike, option_type, close as ltp, delta, oi, volume, iv
            FROM option_chain_data 
            WHERE instrument = 'NIFTY' AND timestamp = $1::timestamptz
            ORDER BY strike ASC
        `;
        const chainRes = await pool.query(chainQuery, [timestampStr]);

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

        res.json({
            success: true,
            timestamp: timestampStr,
            spotPrice: spotPrice,
            chain: formattedChain
        });

    } catch (error) {
        console.error("Simulator API Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};