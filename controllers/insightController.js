const { pool } = require('../config/postgres');

exports.getInsightData = async (req, res) => {
    try {
        const { 
            symbol = 'NIFTY', 
            fromDate = '2020-01-01', 
            toDate = '2030-12-31', 
            dayOfWeek = 'ALL', 
            gapType = 'ALL', 
            movementRange = 'ALL',
            streakCount = '1',    
            reversalTF = 'NONE'
        } = req.body;

        const client = await pool.connect();

        try {
            const query = `
                WITH DailyData AS (
                    SELECT 
                        timestamp::date AS date,
                        EXTRACT(ISODOW FROM timestamp::date) AS day_of_week,
                        (array_agg(open ORDER BY timestamp ASC))[1] AS daily_open,
                        MAX(high) AS daily_high, 
                        MIN(low) AS daily_low,
                        (array_agg(close ORDER BY timestamp DESC))[1] AS daily_close,
                        MAX(CASE WHEN timestamp::time >= '09:15:00' AND timestamp::time < '10:30:00' THEN high ELSE NULL END) - MIN(CASE WHEN timestamp::time >= '09:15:00' AND timestamp::time < '10:30:00' THEN low ELSE NULL END) AS morning_move,
                        MAX(CASE WHEN timestamp::time >= '10:30:00' AND timestamp::time < '13:30:00' THEN high ELSE NULL END) - MIN(CASE WHEN timestamp::time >= '10:30:00' AND timestamp::time < '13:30:00' THEN low ELSE NULL END) AS midday_move,
                        MAX(CASE WHEN timestamp::time >= '13:30:00' AND timestamp::time <= '15:30:00' THEN high ELSE NULL END) - MIN(CASE WHEN timestamp::time >= '13:30:00' AND timestamp::time <= '15:30:00' THEN low ELSE NULL END) AS closing_move
                    FROM historical_candles 
                    WHERE symbol = $1 AND timestamp::date >= $2 AND timestamp::date <= $3
                    GROUP BY timestamp::date
                ),
                GapAnalysis AS (
                    SELECT *, LAG(daily_close) OVER (ORDER BY date) AS prev_close
                    FROM DailyData
                ),
                FillTimeAnalysis AS (
                    SELECT 
                        g.*,
                        (SELECT MIN(timestamp) 
                         FROM historical_candles c 
                         WHERE c.symbol = $1 AND c.timestamp::date = g.date
                           AND ((g.daily_open > g.prev_close AND c.low <= g.prev_close) 
                             OR (g.daily_open < g.prev_close AND c.high >= g.prev_close))
                        ) AS fill_time
                    FROM GapAnalysis g
                    WHERE g.prev_close IS NOT NULL
                ),
                ReversalAnalysis AS (
                    SELECT 
                        f.*,
                        (SELECT close FROM historical_candles c 
                         WHERE c.symbol = $1 AND c.timestamp > f.fill_time AND c.timestamp <= f.fill_time + interval '5 minutes' 
                         ORDER BY timestamp DESC LIMIT 1) AS price_after_5m,
                        (SELECT close FROM historical_candles c 
                         WHERE c.symbol = $1 AND c.timestamp > f.fill_time AND c.timestamp <= f.fill_time + interval '15 minutes' 
                         ORDER BY timestamp DESC LIMIT 1) AS price_after_15m,
                        
                        -- 🎯 5 Min Failure Check: रिवर्सल के बाद क्या मार्केट ने वापस गैप लाइन तोड़ी?
                        (SELECT MIN(timestamp) FROM historical_candles c 
                         WHERE c.symbol = $1 AND c.timestamp > f.fill_time + interval '5 minutes' AND c.timestamp::date = f.date
                           AND ((f.daily_open > f.prev_close AND c.close < f.prev_close) 
                             OR (f.daily_open < f.prev_close AND c.close > f.prev_close))
                        ) AS failure_time_5m,

                        -- 🎯 15 Min Failure Check
                        (SELECT MIN(timestamp) FROM historical_candles c 
                         WHERE c.symbol = $1 AND c.timestamp > f.fill_time + interval '15 minutes' AND c.timestamp::date = f.date
                           AND ((f.daily_open > f.prev_close AND c.close < f.prev_close) 
                             OR (f.daily_open < f.prev_close AND c.close > f.prev_close))
                        ) AS failure_time_15m

                    FROM FillTimeAnalysis f
                )
                SELECT 
                    TO_CHAR(date, 'YYYY-MM-DD') AS formatted_date, 
                    day_of_week, prev_close, daily_open,
                    ROUND(CAST(daily_open - prev_close AS numeric), 2) AS gap_points,
                    ROUND(CAST(((daily_open - prev_close) / prev_close) * 100 AS numeric), 2) AS gap_percent,
                    ROUND(CAST(daily_close - prev_close AS numeric), 2) AS move_points,
                    ROUND(CAST(((daily_close - prev_close) / prev_close) * 100 AS numeric), 2) AS move_percent,
                    CASE 
                        WHEN daily_open > prev_close THEN 'GAP_UP'
                        WHEN daily_open < prev_close THEN 'GAP_DOWN'
                        ELSE 'FLAT' 
                    END AS gap_type,
                    CASE WHEN fill_time IS NOT NULL THEN true ELSE false END AS is_filled,
                    
                    CASE 
                        WHEN daily_open > prev_close AND price_after_5m > prev_close THEN true 
                        WHEN daily_open < prev_close AND price_after_5m < prev_close THEN true 
                        ELSE false 
                    END AS is_reversed_5m,
                    CASE 
                        WHEN daily_open > prev_close AND price_after_15m > prev_close THEN true 
                        WHEN daily_open < prev_close AND price_after_15m < prev_close THEN true 
                        ELSE false 
                    END AS is_reversed_15m,

                    -- फेल होने में कितने मिनट लगे (अगर फेल हुआ तो)
                    EXTRACT(EPOCH FROM (failure_time_5m - fill_time))/60 AS failed_after_5m_mins,
                    EXTRACT(EPOCH FROM (failure_time_15m - fill_time))/60 AS failed_after_15m_mins,

                    ROUND(CAST(morning_move AS numeric), 2) AS morning_move,
                    ROUND(CAST(midday_move AS numeric), 2) AS midday_move,
                    ROUND(CAST(closing_move AS numeric), 2) AS closing_move
                FROM ReversalAnalysis
                ORDER BY formatted_date DESC;
            `;

            const result = await client.query(query, [symbol, fromDate, toDate]);
            let rawData = result.rows;

            // (Streak Grouping और Filter वाला कोड यहाँ सेम रहेगा जो तुमने पहले डाला था)
            let ascendingData = rawData.reverse();
            let currentStreak = 1;
            let lastGapType = null;
            let currentGroupId = 1; 
            let groupMaxStreaks = {}; 

            ascendingData.forEach((row, index) => {
                if (index === 0) { currentStreak = 1; } else {
                    if (row.gap_type !== 'FLAT' && row.gap_type === lastGapType) { currentStreak++; } 
                    else { currentStreak = 1; currentGroupId++; }
                }
                row.streak = currentStreak;
                row.groupId = currentGroupId;
                groupMaxStreaks[currentGroupId] = Math.max(groupMaxStreaks[currentGroupId] || 1, currentStreak);
                lastGapType = row.gap_type;
            });
            rawData = ascendingData.reverse();

            let filteredData = rawData.filter(row => {
                let match = true;
                
                if (dayOfWeek !== 'ALL' && row.day_of_week.toString() !== dayOfWeek.toString()) match = false;
                if (gapType !== 'ALL' && row.gap_type !== gapType) match = false;
                
                // 🎯 Daily Move Filter (Tumhara original logic)
                if (movementRange !== 'ALL') {
                    let moveAbs = Math.abs(parseFloat(row.move_percent));
                    if (movementRange === '0-0.5' && (moveAbs < 0 || moveAbs > 0.5)) match = false;
                    else if (movementRange === '0.5-1.0' && (moveAbs < 0.5 || moveAbs > 1.0)) match = false;
                    else if (movementRange === '1.0-1.5' && (moveAbs < 1.0 || moveAbs > 1.5)) match = false;
                    else if (movementRange === '1.5-2.0' && (moveAbs < 1.5 || moveAbs > 2.0)) match = false;
                    else if (movementRange === '2.0-2.5' && (moveAbs < 2.0 || moveAbs > 2.5)) match = false;
                    else if (movementRange === '2.5-3.0' && (moveAbs < 2.5 || moveAbs > 3.0)) match = false;
                    else if (movementRange === '3.0-4.0' && (moveAbs < 3.0 || moveAbs > 4.0)) match = false;
                    else if (movementRange === '4.0-5.0' && (moveAbs < 4.0 || moveAbs > 5.0)) match = false;
                    else if (movementRange === 'ABOVE-5.0' && moveAbs <= 5.0) match = false;
                }

                // 🎯 Streak Filter
                if (streakCount && parseInt(streakCount) > 1) {
                    if (groupMaxStreaks[row.groupId] < parseInt(streakCount)) match = false;
                }

                // 🎯 Reversal Filter 
                if (reversalTF !== 'NONE') {
                    if (!row.is_filled) match = false; // Agar gap fill hi nahi hua toh reversal nahi ho sakta
                    else if (reversalTF === '5m' && !row.is_reversed_5m) match = false;
                    else if (reversalTF === '15m' && !row.is_reversed_15m) match = false;
                }
                
                return match;
            });

            // 🎯 TABLE MAPPING WITH REVERSAL STATUS LOGIC
            let totalDays = filteredData.length;
            let gapUpCount = 0, gapDownCount = 0, gapFilledCount = 0, reversalCount = 0;
            let totalMorning = 0, totalMidday = 0, totalClosing = 0;

            let tableData = filteredData.map((row, index) => {
                if (row.gap_type === 'GAP_UP') gapUpCount++;
                if (row.gap_type === 'GAP_DOWN') gapDownCount++;
                
                let isReversed = false;
                let reversalStatus = "N/A"; // 🎯 डिफ़ॉल्ट स्टेटस

                if (row.is_filled) {
                    gapFilledCount++;
                    isReversed = (reversalTF === '15m') ? row.is_reversed_15m : row.is_reversed_5m;
                    
                    if (isReversed) {
                        reversalCount++;
                        // चेक करें कि कितने मिनट बाद फेल हुआ
                        let failedMins = (reversalTF === '15m') ? row.failed_after_15m_mins : row.failed_after_5m_mins;
                        
                        if (failedMins) {
                            // 🎯 FIX: यहाँ Math.round लगा दिया ताकि 56.0000 सीधा 56 बन जाए
                            let cleanMins = Math.round(parseFloat(failedMins));
                            reversalStatus = `Failed after ${cleanMins}m`; 
                        } else {
                            reversalStatus = "🔥 PASS"; // अगर पूरा दिन होल्ड किया
                        }
                    } else {
                        reversalStatus = "No Reversal";
                    }
                }

                totalMorning += parseFloat(row.morning_move || 0);
                totalMidday += parseFloat(row.midday_move || 0);
                totalClosing += parseFloat(row.closing_move || 0);

                return {
                    id: index + 1,
                    date: row.formatted_date, 
                    prevClose: parseFloat(row.prev_close),
                    open: parseFloat(row.daily_open),
                    gapPoints: parseFloat(row.gap_points),
                    gapPercent: parseFloat(row.gap_percent), 
                    gapType: row.gap_type,
                    movePoints: parseFloat(row.move_points),
                    movePercent: parseFloat(row.move_percent),
                    isFilled: row.is_filled,
                    isReversed: isReversed, 
                    reversalStatus: reversalStatus, // 🎯 स्टेटस को फ्रंटएंड में भेजें
                    morningMove: parseFloat(row.morning_move || 0),
                    middayMove: parseFloat(row.midday_move || 0),
                    closingMove: parseFloat(row.closing_move || 0)
                };
            });

            let gapUpPercent = totalDays > 0 ? ((gapUpCount / totalDays) * 100).toFixed(2) : "0.00";
            let gapDownPercent = totalDays > 0 ? ((gapDownCount / totalDays) * 100).toFixed(2) : "0.00";
            let gapFillProb = (gapUpCount + gapDownCount) > 0 ? ((gapFilledCount / (gapUpCount + gapDownCount)) * 100).toFixed(2) : "0.00";
            
            // 🎯 Reversal Probability
            let reversalProb = gapFilledCount > 0 ? ((reversalCount / gapFilledCount) * 100).toFixed(2) : "0.00";

            let summary = {
                totalDays, gapUpPercent, gapDownPercent, gapFillProb,
                reversalProb, // 🎯 Card me data update hoga
                timeBuckets: {
                    morningAvg: totalDays > 0 ? (totalMorning / totalDays).toFixed(1) : "0.0",
                    middayAvg: totalDays > 0 ? (totalMidday / totalDays).toFixed(1) : "0.0",
                    closingAvg: totalDays > 0 ? (totalClosing / totalDays).toFixed(1) : "0.0"
                }
            };

            res.json({ success: true, data: { summary, tableData } });

        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Error fetching insight data:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};