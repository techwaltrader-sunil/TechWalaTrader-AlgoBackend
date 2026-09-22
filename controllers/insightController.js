// const { pool } = require('../config/postgres'); // अपने DB कनेक्शन का सही पाथ दें

// exports.getInsightData = async (req, res) => {
//     try {
//         // फ्रंटएंड से आने वाले फ़िल्टर्स (बाद में हम इन्हें क्वेरी में जोड़ेंगे)
//         const { symbol, fromDate, toDate, dayOfWeek, gapType, streakCount, reversalTF, movementRange } = req.body;

//         const client = await pool.connect();

//         try {
//             // 🎯 MASTER SQL QUERY (The Core Logic)
//             const query = `
//                 WITH DailyData AS (
//                     -- Step 1: 1-Minute डेटा से डेली कैंडल और टाइम-स्लॉट रेंज निकालना
//                     SELECT 
//                         timestamp::date AS date,
//                         EXTRACT(ISODOW FROM timestamp::date) AS day_of_week,
//                         (array_agg(open ORDER BY timestamp ASC))[1] AS daily_open,
//                         MAX(high) AS daily_high, 
//                         MIN(low) AS daily_low,
//                         (array_agg(close ORDER BY timestamp DESC))[1] AS daily_close,
                        
//                         -- Morning Slot (09:15 to 10:30) High-Low Range
//                         MAX(CASE WHEN timestamp::time >= '09:15:00' AND timestamp::time < '10:30:00' THEN high ELSE NULL END) - 
//                         MIN(CASE WHEN timestamp::time >= '09:15:00' AND timestamp::time < '10:30:00' THEN low ELSE NULL END) AS morning_move,
                        
//                         -- Midday Slot (10:30 to 13:30) High-Low Range
//                         MAX(CASE WHEN timestamp::time >= '10:30:00' AND timestamp::time < '13:30:00' THEN high ELSE NULL END) - 
//                         MIN(CASE WHEN timestamp::time >= '10:30:00' AND timestamp::time < '13:30:00' THEN low ELSE NULL END) AS midday_move,
                        
//                         -- Closing Slot (13:30 to 15:30) High-Low Range
//                         MAX(CASE WHEN timestamp::time >= '13:30:00' AND timestamp::time <= '15:30:00' THEN high ELSE NULL END) - 
//                         MIN(CASE WHEN timestamp::time >= '13:30:00' AND timestamp::time <= '15:30:00' THEN low ELSE NULL END) AS closing_move

//                     FROM historical_candles 
//                     WHERE symbol = $1 
//                     GROUP BY timestamp::date
//                 ),
//                 GapAnalysis AS (
//                     -- Step 2: पिछले दिन का डेटा (Lag) और गैप कैलकुलेशन
//                     SELECT 
//                         *,
//                         LAG(daily_close) OVER (ORDER BY date) AS prev_close
//                     FROM DailyData
//                 )
//                 -- Step 3: फाइनल कैलकुलेशन
//                 SELECT 
//                     date,
//                     day_of_week,
//                     prev_close,
//                     daily_open,
//                     ROUND(CAST(daily_open - prev_close AS numeric), 2) AS gap_points,
//                     ROUND(CAST(daily_close - prev_close AS numeric), 2) AS move_points,
//                     ROUND(CAST(((daily_close - prev_close) / prev_close) * 100 AS numeric), 2) AS move_percent,
//                     CASE 
//                         WHEN daily_open > prev_close THEN 'GAP_UP'
//                         WHEN daily_open < prev_close THEN 'GAP_DOWN'
//                         ELSE 'FLAT' 
//                     END AS gap_type,
//                     CASE
//                         WHEN daily_open > prev_close AND daily_low <= prev_close THEN true
//                         WHEN daily_open < prev_close AND daily_high >= prev_close THEN true
//                         ELSE false
//                     END AS is_filled,
//                     ROUND(CAST(morning_move AS numeric), 2) AS morning_move,
//                     ROUND(CAST(midday_move AS numeric), 2) AS midday_move,
//                     ROUND(CAST(closing_move AS numeric), 2) AS closing_move
//                 FROM GapAnalysis
//                 WHERE prev_close IS NOT NULL
//                 ORDER BY date DESC;
//             `;

//             // फिलहाल हम NIFTY को हार्डकोड कर रहे हैं बेस लॉजिक टेस्ट करने के लिए
//             const result = await client.query(query, ['NIFTY']);
            
//             res.json({
//                 success: true,
//                 count: result.rowCount,
//                 data: result.rows
//             });

//         } finally {
//             client.release();
//         }
//     } catch (error) {
//         console.error("Error fetching insight data:", error);
//         res.status(500).json({ success: false, message: "Server Error" });
//     }
// };





// const { pool } = require('../config/postgres');

// exports.getInsightData = async (req, res) => {
//     try {
//         // 🎯 1. फ्रंटएंड से फ़िल्टर्स लेना (Default values के साथ)
//         const { 
//             symbol = 'NIFTY', 
//             fromDate = '2026-09-01', 
//             toDate = '2026-09-18', 
//             dayOfWeek = 'ALL', 
//             gapType = 'ALL', 
//             movementRange = 'ALL' 
//         } = req.body;

//         const client = await pool.connect();

//         try {
//             // 🎯 2. Dynamic SQL Query (सिर्फ़ चुनी हुई डेट्स का डेटा निकालने के लिए)
//             const query = `
//                 WITH DailyData AS (
//                     SELECT 
//                         timestamp::date AS date,
//                         EXTRACT(ISODOW FROM timestamp::date) AS day_of_week,
//                         (array_agg(open ORDER BY timestamp ASC))[1] AS daily_open,
//                         MAX(high) AS daily_high, 
//                         MIN(low) AS daily_low,
//                         (array_agg(close ORDER BY timestamp DESC))[1] AS daily_close,
//                         MAX(CASE WHEN timestamp::time >= '09:15:00' AND timestamp::time < '10:30:00' THEN high ELSE NULL END) - MIN(CASE WHEN timestamp::time >= '09:15:00' AND timestamp::time < '10:30:00' THEN low ELSE NULL END) AS morning_move,
//                         MAX(CASE WHEN timestamp::time >= '10:30:00' AND timestamp::time < '13:30:00' THEN high ELSE NULL END) - MIN(CASE WHEN timestamp::time >= '10:30:00' AND timestamp::time < '13:30:00' THEN low ELSE NULL END) AS midday_move,
//                         MAX(CASE WHEN timestamp::time >= '13:30:00' AND timestamp::time <= '15:30:00' THEN high ELSE NULL END) - MIN(CASE WHEN timestamp::time >= '13:30:00' AND timestamp::time <= '15:30:00' THEN low ELSE NULL END) AS closing_move
//                     FROM historical_candles 
//                     WHERE symbol = $1 AND timestamp::date >= $2 AND timestamp::date <= $3
//                     GROUP BY timestamp::date
//                 ),
//                 GapAnalysis AS (
//                     SELECT *, LAG(daily_close) OVER (ORDER BY date) AS prev_close
//                     FROM DailyData
//                 )
//                 SELECT 
//                     date, day_of_week, prev_close, daily_open,
//                     ROUND(CAST(daily_open - prev_close AS numeric), 2) AS gap_points,
//                     ROUND(CAST(daily_close - prev_close AS numeric), 2) AS move_points,
//                     ROUND(CAST(((daily_close - prev_close) / prev_close) * 100 AS numeric), 2) AS move_percent,
//                     CASE 
//                         WHEN daily_open > prev_close THEN 'GAP_UP'
//                         WHEN daily_open < prev_close THEN 'GAP_DOWN'
//                         ELSE 'FLAT' 
//                     END AS gap_type,
//                     CASE
//                         WHEN daily_open > prev_close AND daily_low <= prev_close THEN true
//                         WHEN daily_open < prev_close AND daily_high >= prev_close THEN true
//                         ELSE false
//                     END AS is_filled,
//                     ROUND(CAST(morning_move AS numeric), 2) AS morning_move,
//                     ROUND(CAST(midday_move AS numeric), 2) AS midday_move,
//                     ROUND(CAST(closing_move AS numeric), 2) AS closing_move
//                 FROM GapAnalysis
//                 WHERE prev_close IS NOT NULL
//                 ORDER BY date DESC;
//             `;

//             const result = await client.query(query, [symbol, fromDate, toDate]);
//             let rawData = result.rows;

//             // 🎯 3. JavaScript में एडवांस फ़िल्टर्स लगाना (Gap Type, Day, Move %)
//             let filteredData = rawData.filter(row => {
//                 let match = true;
                
//                 if (dayOfWeek !== 'ALL' && row.day_of_week.toString() !== dayOfWeek.toString()) match = false;
//                 if (gapType !== 'ALL' && row.gap_type !== gapType) match = false;
                
//                 if (movementRange !== 'ALL') {
//                     let moveAbs = Math.abs(parseFloat(row.move_percent));
//                     if (movementRange === '0-0.5' && (moveAbs < 0 || moveAbs > 0.5)) match = false;
//                     else if (movementRange === '0.5-1.0' && (moveAbs < 0.5 || moveAbs > 1.0)) match = false;
//                     else if (movementRange === '1.0-1.5' && (moveAbs < 1.0 || moveAbs > 1.5)) match = false;
//                     else if (movementRange === '1.5-2.0' && (moveAbs < 1.5 || moveAbs > 2.0)) match = false;
//                     else if (movementRange === '2.0-2.5' && (moveAbs < 2.0 || moveAbs > 2.5)) match = false;
//                     else if (movementRange === '2.5-3.0' && (moveAbs < 2.5 || moveAbs > 3.0)) match = false;
//                     else if (movementRange === '3.0-4.0' && (moveAbs < 3.0 || moveAbs > 4.0)) match = false;
//                     else if (movementRange === '4.0-5.0' && (moveAbs < 4.0 || moveAbs > 5.0)) match = false;
//                     else if (movementRange === 'ABOVE-5.0' && moveAbs <= 5.0) match = false;
//                 }
                
//                 return match;
//             });

//             // 🎯 4. Summary Cards के लिए गणित (Math) लगाना
//             let totalDays = filteredData.length;
//             let gapUpCount = 0, gapDownCount = 0, gapFilledCount = 0;
//             let totalMorning = 0, totalMidday = 0, totalClosing = 0;

//             let tableData = filteredData.map((row, index) => {
//                 if (row.gap_type === 'GAP_UP') gapUpCount++;
//                 if (row.gap_type === 'GAP_DOWN') gapDownCount++;
//                 if (row.is_filled) gapFilledCount++;

//                 totalMorning += parseFloat(row.morning_move || 0);
//                 totalMidday += parseFloat(row.midday_move || 0);
//                 totalClosing += parseFloat(row.closing_move || 0);

//                 return {
//                     id: index + 1,
//                     date: row.date.toISOString().split('T')[0], // YYYY-MM-DD
//                     prevClose: parseFloat(row.prev_close),
//                     open: parseFloat(row.daily_open),
//                     gapPoints: parseFloat(row.gap_points),
//                     gapType: row.gap_type,
//                     movePoints: parseFloat(row.move_points),
//                     movePercent: parseFloat(row.move_percent),
//                     isFilled: row.is_filled,
//                     isReversed: false, // Reversal API logic बाद में जोड़ेंगे
//                     morningMove: parseFloat(row.morning_move || 0),
//                     middayMove: parseFloat(row.midday_move || 0),
//                     closingMove: parseFloat(row.closing_move || 0)
//                 };
//             });

//             let gapUpPercent = totalDays > 0 ? ((gapUpCount / totalDays) * 100).toFixed(2) : "0.00";
//             let gapDownPercent = totalDays > 0 ? ((gapDownCount / totalDays) * 100).toFixed(2) : "0.00";
//             let gapFillProb = (gapUpCount + gapDownCount) > 0 ? ((gapFilledCount / (gapUpCount + gapDownCount)) * 100).toFixed(2) : "0.00";

//             let summary = {
//                 totalDays,
//                 gapUpPercent,
//                 gapDownPercent,
//                 gapFillProb,
//                 reversalProb: "0.00", // Placeholder
//                 timeBuckets: {
//                     morningAvg: totalDays > 0 ? (totalMorning / totalDays).toFixed(1) : "0.0",
//                     middayAvg: totalDays > 0 ? (totalMidday / totalDays).toFixed(1) : "0.0",
//                     closingAvg: totalDays > 0 ? (totalClosing / totalDays).toFixed(1) : "0.0"
//                 }
//             };

//             // 🎯 5. React को रिस्पॉन्स भेजना
//             res.json({
//                 success: true,
//                 data: { summary, tableData }
//             });

//         } finally {
//             client.release();
//         }
//     } catch (error) {
//         console.error("Error fetching insight data:", error);
//         res.status(500).json({ success: false, message: "Server Error" });
//     }
// };



// const { pool } = require('../config/postgres');

// exports.getInsightData = async (req, res) => {
//     try {
//         const { 
//             symbol = 'NIFTY', 
//             fromDate = '2020-01-01', 
//             toDate = '2030-12-31', 
//             dayOfWeek = 'ALL', 
//             gapType = 'ALL', 
//             movementRange = 'ALL' 
//         } = req.body;

//         const client = await pool.connect();

//         try {
//             const query = `
//                 WITH DailyData AS (
//                     SELECT 
//                         timestamp::date AS date,
//                         EXTRACT(ISODOW FROM timestamp::date) AS day_of_week,
//                         (array_agg(open ORDER BY timestamp ASC))[1] AS daily_open,
//                         MAX(high) AS daily_high, 
//                         MIN(low) AS daily_low,
//                         (array_agg(close ORDER BY timestamp DESC))[1] AS daily_close,
//                         MAX(CASE WHEN timestamp::time >= '09:15:00' AND timestamp::time < '10:30:00' THEN high ELSE NULL END) - MIN(CASE WHEN timestamp::time >= '09:15:00' AND timestamp::time < '10:30:00' THEN low ELSE NULL END) AS morning_move,
//                         MAX(CASE WHEN timestamp::time >= '10:30:00' AND timestamp::time < '13:30:00' THEN high ELSE NULL END) - MIN(CASE WHEN timestamp::time >= '10:30:00' AND timestamp::time < '13:30:00' THEN low ELSE NULL END) AS midday_move,
//                         MAX(CASE WHEN timestamp::time >= '13:30:00' AND timestamp::time <= '15:30:00' THEN high ELSE NULL END) - MIN(CASE WHEN timestamp::time >= '13:30:00' AND timestamp::time <= '15:30:00' THEN low ELSE NULL END) AS closing_move
//                     FROM historical_candles 
//                     WHERE symbol = $1 AND timestamp::date >= $2 AND timestamp::date <= $3
//                     GROUP BY timestamp::date
//                 ),
//                 GapAnalysis AS (
//                     SELECT *, LAG(daily_close) OVER (ORDER BY date) AS prev_close
//                     FROM DailyData
//                 )
//                 SELECT 
//                     TO_CHAR(date, 'YYYY-MM-DD') AS formatted_date, 
//                     day_of_week, prev_close, daily_open,
//                     ROUND(CAST(daily_open - prev_close AS numeric), 2) AS gap_points,
                    
//                     -- 🎯 Nayi Line: Gap Percentage calculate karne ke liye
//                     ROUND(CAST(((daily_open - prev_close) / prev_close) * 100 AS numeric), 2) AS gap_percent, 
                    
//                     ROUND(CAST(daily_close - prev_close AS numeric), 2) AS move_points,

//                     ROUND(CAST(((daily_close - prev_close) / prev_close) * 100 AS numeric), 2) AS move_percent,
//                     CASE 
//                         WHEN daily_open > prev_close THEN 'GAP_UP'
//                         WHEN daily_open < prev_close THEN 'GAP_DOWN'
//                         ELSE 'FLAT' 
//                     END AS gap_type,
//                     CASE
//                         WHEN daily_open > prev_close AND daily_low <= prev_close THEN true
//                         WHEN daily_open < prev_close AND daily_high >= prev_close THEN true
//                         ELSE false
//                     END AS is_filled,
//                     ROUND(CAST(morning_move AS numeric), 2) AS morning_move,
//                     ROUND(CAST(midday_move AS numeric), 2) AS midday_move,
//                     ROUND(CAST(closing_move AS numeric), 2) AS closing_move
//                 FROM GapAnalysis
//                 WHERE prev_close IS NOT NULL
//                 ORDER BY formatted_date DESC;
//             `;

//             const result = await client.query(query, [symbol, fromDate, toDate]);
//             let rawData = result.rows;

//             let filteredData = rawData.filter(row => {
//                 let match = true;
//                 if (dayOfWeek !== 'ALL' && row.day_of_week.toString() !== dayOfWeek.toString()) match = false;
//                 if (gapType !== 'ALL' && row.gap_type !== gapType) match = false;
//                 if (movementRange !== 'ALL') {
//                     let moveAbs = Math.abs(parseFloat(row.move_percent));
//                     if (movementRange === '0-0.5' && (moveAbs < 0 || moveAbs > 0.5)) match = false;
//                     else if (movementRange === '0.5-1.0' && (moveAbs < 0.5 || moveAbs > 1.0)) match = false;
//                     else if (movementRange === '1.0-1.5' && (moveAbs < 1.0 || moveAbs > 1.5)) match = false;
//                     else if (movementRange === '1.5-2.0' && (moveAbs < 1.5 || moveAbs > 2.0)) match = false;
//                     else if (movementRange === '2.0-2.5' && (moveAbs < 2.0 || moveAbs > 2.5)) match = false;
//                     else if (movementRange === '2.5-3.0' && (moveAbs < 2.5 || moveAbs > 3.0)) match = false;
//                     else if (movementRange === '3.0-4.0' && (moveAbs < 3.0 || moveAbs > 4.0)) match = false;
//                     else if (movementRange === '4.0-5.0' && (moveAbs < 4.0 || moveAbs > 5.0)) match = false;
//                     else if (movementRange === 'ABOVE-5.0' && moveAbs <= 5.0) match = false;
//                 }
//                 return match;
//             });

//             let totalDays = filteredData.length;
//             let gapUpCount = 0, gapDownCount = 0, gapFilledCount = 0;
//             let totalMorning = 0, totalMidday = 0, totalClosing = 0;

//             let tableData = filteredData.map((row, index) => {
//                 if (row.gap_type === 'GAP_UP') gapUpCount++;
//                 if (row.gap_type === 'GAP_DOWN') gapDownCount++;
//                 if (row.is_filled) gapFilledCount++;

//                 totalMorning += parseFloat(row.morning_move || 0);
//                 totalMidday += parseFloat(row.midday_move || 0);
//                 totalClosing += parseFloat(row.closing_move || 0);

//                 return {
//                     id: index + 1,
//                     date: row.formatted_date, // 🎯 यहाँ अब बिना किसी छेड़छाड़ के असली डेट सेट होगी
//                     prevClose: parseFloat(row.prev_close),
//                     open: parseFloat(row.daily_open),
//                     gapPoints: parseFloat(row.gap_points),
//                     gapPercent: parseFloat(row.gap_percent),
//                     gapType: row.gap_type,
//                     movePoints: parseFloat(row.move_points),
//                     movePercent: parseFloat(row.move_percent),
//                     isFilled: row.is_filled,
//                     isReversed: false, 
//                     morningMove: parseFloat(row.morning_move || 0),
//                     middayMove: parseFloat(row.midday_move || 0),
//                     closingMove: parseFloat(row.closing_move || 0)
//                 };
//             });

//             let gapUpPercent = totalDays > 0 ? ((gapUpCount / totalDays) * 100).toFixed(2) : "0.00";
//             let gapDownPercent = totalDays > 0 ? ((gapDownCount / totalDays) * 100).toFixed(2) : "0.00";
//             let gapFillProb = (gapUpCount + gapDownCount) > 0 ? ((gapFilledCount / (gapUpCount + gapDownCount)) * 100).toFixed(2) : "0.00";

//             let summary = {
//                 totalDays,
//                 gapUpPercent,
//                 gapDownPercent,
//                 gapFillProb,
//                 reversalProb: "0.00",
//                 timeBuckets: {
//                     morningAvg: totalDays > 0 ? (totalMorning / totalDays).toFixed(1) : "0.0",
//                     middayAvg: totalDays > 0 ? (totalMidday / totalDays).toFixed(1) : "0.0",
//                     closingAvg: totalDays > 0 ? (totalClosing / totalDays).toFixed(1) : "0.0"
//                 }
//             };

//             res.json({ success: true, data: { summary, tableData } });

//         } finally {
//             client.release();
//         }
//     } catch (error) {
//         console.error("Error fetching insight data:", error);
//         res.status(500).json({ success: false, message: "Server Error" });
//     }
// };




// const { pool } = require('../config/postgres');

// exports.getInsightData = async (req, res) => {
//     try {
//         const { 
//             symbol = 'NIFTY', 
//             fromDate = '2020-01-01', 
//             toDate = '2030-12-31', 
//             dayOfWeek = 'ALL', 
//             gapType = 'ALL', 
//             movementRange = 'ALL',
//             streakCount = '1',    
//             reversalTF = 'NONE'
//         } = req.body;

//         const client = await pool.connect();

//         try {
//             const query = `
//                 WITH DailyData AS (
//                     SELECT 
//                         timestamp::date AS date,
//                         EXTRACT(ISODOW FROM timestamp::date) AS day_of_week,
//                         (array_agg(open ORDER BY timestamp ASC))[1] AS daily_open,
//                         MAX(high) AS daily_high, 
//                         MIN(low) AS daily_low,
//                         (array_agg(close ORDER BY timestamp DESC))[1] AS daily_close,
//                         MAX(CASE WHEN timestamp::time >= '09:15:00' AND timestamp::time < '10:30:00' THEN high ELSE NULL END) - MIN(CASE WHEN timestamp::time >= '09:15:00' AND timestamp::time < '10:30:00' THEN low ELSE NULL END) AS morning_move,
//                         MAX(CASE WHEN timestamp::time >= '10:30:00' AND timestamp::time < '13:30:00' THEN high ELSE NULL END) - MIN(CASE WHEN timestamp::time >= '10:30:00' AND timestamp::time < '13:30:00' THEN low ELSE NULL END) AS midday_move,
//                         MAX(CASE WHEN timestamp::time >= '13:30:00' AND timestamp::time <= '15:30:00' THEN high ELSE NULL END) - MIN(CASE WHEN timestamp::time >= '13:30:00' AND timestamp::time <= '15:30:00' THEN low ELSE NULL END) AS closing_move
//                     FROM historical_candles 
//                     WHERE symbol = $1 AND timestamp::date >= $2 AND timestamp::date <= $3
//                     GROUP BY timestamp::date
//                 ),
//                 GapAnalysis AS (
//                     SELECT *, LAG(daily_close) OVER (ORDER BY date) AS prev_close
//                     FROM DailyData
//                 )
//                 SELECT 
//                     TO_CHAR(date, 'YYYY-MM-DD') AS formatted_date, 
//                     day_of_week, prev_close, daily_open,
//                     ROUND(CAST(daily_open - prev_close AS numeric), 2) AS gap_points,
                    
//                     -- 🎯 Nayi Line: Gap Percentage calculate karne ke liye
//                     ROUND(CAST(((daily_open - prev_close) / prev_close) * 100 AS numeric), 2) AS gap_percent, 
                    
//                     ROUND(CAST(daily_close - prev_close AS numeric), 2) AS move_points,

//                     ROUND(CAST(((daily_close - prev_close) / prev_close) * 100 AS numeric), 2) AS move_percent,
//                     CASE 
//                         WHEN daily_open > prev_close THEN 'GAP_UP'
//                         WHEN daily_open < prev_close THEN 'GAP_DOWN'
//                         ELSE 'FLAT' 
//                     END AS gap_type,
//                     CASE
//                         WHEN daily_open > prev_close AND daily_low <= prev_close THEN true
//                         WHEN daily_open < prev_close AND daily_high >= prev_close THEN true
//                         ELSE false
//                     END AS is_filled,
//                     ROUND(CAST(morning_move AS numeric), 2) AS morning_move,
//                     ROUND(CAST(midday_move AS numeric), 2) AS midday_move,
//                     ROUND(CAST(closing_move AS numeric), 2) AS closing_move
//                 FROM GapAnalysis
//                 WHERE prev_close IS NOT NULL
//                 ORDER BY formatted_date DESC;
//             `;

//             const result = await client.query(query, [symbol, fromDate, toDate]);
//             let rawData = result.rows;

//             // 🎯 NEW LOGIC 1: Consecutive Days (Streak Grouping)
//             let ascendingData = rawData.reverse();
//             let currentStreak = 1;
//             let lastGapType = null;
//             let currentGroupId = 1; 
//             let groupMaxStreaks = {}; // हर ट्रेंड (Group) का सबसे बड़ा (Max) स्ट्रीक सेव करने के लिए

//             ascendingData.forEach((row, index) => {
//                 if (index === 0) {
//                     currentStreak = 1;
//                 } else {
//                     if (row.gap_type !== 'FLAT' && row.gap_type === lastGapType) {
//                         currentStreak++;
//                     } else {
//                         currentStreak = 1;
//                         currentGroupId++; // ट्रेंड टूटा, तो नया Group ID दे दिया
//                     }
//                 }
                
//                 row.streak = currentStreak;
//                 row.groupId = currentGroupId;
                
//                 // उस Group की सबसे बड़ी स्ट्रीक क्या है, उसे अपडेट करते जाओ
//                 groupMaxStreaks[currentGroupId] = Math.max(groupMaxStreaks[currentGroupId] || 1, currentStreak);
                
//                 lastGapType = row.gap_type;
//             });

//             // डेटा को वापस UI के लिए Newest to Oldest कर दिया
//             rawData = ascendingData.reverse();

//             // 🎯 NEW LOGIC 2: Filters
//             let filteredData = rawData.filter(row => {
//                 let match = true;
                
//                 if (dayOfWeek !== 'ALL' && row.day_of_week.toString() !== dayOfWeek.toString()) match = false;
//                 if (gapType !== 'ALL' && row.gap_type !== gapType) match = false;
                
//                 if (movementRange !== 'ALL') {
//                     let moveAbs = Math.abs(parseFloat(row.move_percent));
//                     if (movementRange === '0-0.5' && (moveAbs < 0 || moveAbs > 0.5)) match = false;
//                     else if (movementRange === '0.5-1.0' && (moveAbs < 0.5 || moveAbs > 1.0)) match = false;
//                     else if (movementRange === '1.0-1.5' && (moveAbs < 1.0 || moveAbs > 1.5)) match = false;
//                     else if (movementRange === '1.5-2.0' && (moveAbs < 1.5 || moveAbs > 2.0)) match = false;
//                     else if (movementRange === '2.0-2.5' && (moveAbs < 2.0 || moveAbs > 2.5)) match = false;
//                     else if (movementRange === '2.5-3.0' && (moveAbs < 2.5 || moveAbs > 3.0)) match = false;
//                     else if (movementRange === '3.0-4.0' && (moveAbs < 3.0 || moveAbs > 4.0)) match = false;
//                     else if (movementRange === '4.0-5.0' && (moveAbs < 4.0 || moveAbs > 5.0)) match = false;
//                     else if (movementRange === 'ABOVE-5.0' && moveAbs <= 5.0) match = false;
//                 }

//                 // 🎯 UPDATED STREAK FILTER
//                 if (streakCount && parseInt(streakCount) > 1) {
//                     // अब हम सिर्फ़ उस दिन का स्ट्रीक नहीं, बल्कि उस पूरे Group की Max Streak चेक करेंगे!
//                     // अगर ग्रुप का Max Streak >= 2 है, तो उस ग्रुप के सारे दिन (13 और 14 दोनों) पास हो जाएंगे
//                     if (groupMaxStreaks[row.groupId] < parseInt(streakCount)) {
//                         match = false;
//                     }
//                 }
                
//                 return match;
//             });

//             let totalDays = filteredData.length;
//             let gapUpCount = 0, gapDownCount = 0, gapFilledCount = 0;
//             let totalMorning = 0, totalMidday = 0, totalClosing = 0;

//             let tableData = filteredData.map((row, index) => {
//                 if (row.gap_type === 'GAP_UP') gapUpCount++;
//                 if (row.gap_type === 'GAP_DOWN') gapDownCount++;
//                 if (row.is_filled) gapFilledCount++;

//                 totalMorning += parseFloat(row.morning_move || 0);
//                 totalMidday += parseFloat(row.midday_move || 0);
//                 totalClosing += parseFloat(row.closing_move || 0);

//                 return {
//                     id: index + 1,
//                     date: row.formatted_date, // 🎯 यहाँ अब बिना किसी छेड़छाड़ के असली डेट सेट होगी
//                     prevClose: parseFloat(row.prev_close),
//                     open: parseFloat(row.daily_open),
//                     gapPoints: parseFloat(row.gap_points),
//                     gapPercent: parseFloat(row.gap_percent),
//                     gapType: row.gap_type,
//                     movePoints: parseFloat(row.move_points),
//                     movePercent: parseFloat(row.move_percent),
//                     isFilled: row.is_filled,
//                     isReversed: false, 
//                     morningMove: parseFloat(row.morning_move || 0),
//                     middayMove: parseFloat(row.midday_move || 0),
//                     closingMove: parseFloat(row.closing_move || 0)
//                 };
//             });

//             let gapUpPercent = totalDays > 0 ? ((gapUpCount / totalDays) * 100).toFixed(2) : "0.00";
//             let gapDownPercent = totalDays > 0 ? ((gapDownCount / totalDays) * 100).toFixed(2) : "0.00";
//             let gapFillProb = (gapUpCount + gapDownCount) > 0 ? ((gapFilledCount / (gapUpCount + gapDownCount)) * 100).toFixed(2) : "0.00";

//             let summary = {
//                 totalDays,
//                 gapUpPercent,
//                 gapDownPercent,
//                 gapFillProb,
//                 reversalProb: "0.00",
//                 timeBuckets: {
//                     morningAvg: totalDays > 0 ? (totalMorning / totalDays).toFixed(1) : "0.0",
//                     middayAvg: totalDays > 0 ? (totalMidday / totalDays).toFixed(1) : "0.0",
//                     closingAvg: totalDays > 0 ? (totalClosing / totalDays).toFixed(1) : "0.0"
//                 }
//             };

//             res.json({ success: true, data: { summary, tableData } });

//         } finally {
//             client.release();
//         }
//     } catch (error) {
//         console.error("Error fetching insight data:", error);
//         res.status(500).json({ success: false, message: "Server Error" });
//     }
// };





// const { pool } = require('../config/postgres');

// exports.getInsightData = async (req, res) => {
//     try {
//         const { 
//             symbol = 'NIFTY', 
//             fromDate = '2020-01-01', 
//             toDate = '2030-12-31', 
//             dayOfWeek = 'ALL', 
//             gapType = 'ALL', 
//             movementRange = 'ALL',
//             streakCount = '1',    
//             reversalTF = 'NONE'
//         } = req.body;

//         const client = await pool.connect();

//         try {
//             const query = `
//                 WITH DailyData AS (
//                     SELECT 
//                         timestamp::date AS date,
//                         EXTRACT(ISODOW FROM timestamp::date) AS day_of_week,
//                         (array_agg(open ORDER BY timestamp ASC))[1] AS daily_open,
//                         MAX(high) AS daily_high, 
//                         MIN(low) AS daily_low,
//                         (array_agg(close ORDER BY timestamp DESC))[1] AS daily_close,
//                         MAX(CASE WHEN timestamp::time >= '09:15:00' AND timestamp::time < '10:30:00' THEN high ELSE NULL END) - MIN(CASE WHEN timestamp::time >= '09:15:00' AND timestamp::time < '10:30:00' THEN low ELSE NULL END) AS morning_move,
//                         MAX(CASE WHEN timestamp::time >= '10:30:00' AND timestamp::time < '13:30:00' THEN high ELSE NULL END) - MIN(CASE WHEN timestamp::time >= '10:30:00' AND timestamp::time < '13:30:00' THEN low ELSE NULL END) AS midday_move,
//                         MAX(CASE WHEN timestamp::time >= '13:30:00' AND timestamp::time <= '15:30:00' THEN high ELSE NULL END) - MIN(CASE WHEN timestamp::time >= '13:30:00' AND timestamp::time <= '15:30:00' THEN low ELSE NULL END) AS closing_move
//                     FROM historical_candles 
//                     WHERE symbol = $1 AND timestamp::date >= $2 AND timestamp::date <= $3
//                     GROUP BY timestamp::date
//                 ),
//                 GapAnalysis AS (
//                     SELECT *, LAG(daily_close) OVER (ORDER BY date) AS prev_close
//                     FROM DailyData
//                 ),
//                 FillTimeAnalysis AS (
//                     SELECT 
//                         g.*,
//                         -- Exact minute nikalna jab Gap Fill hua
//                         (SELECT MIN(timestamp) 
//                          FROM historical_candles c 
//                          WHERE c.symbol = $1 AND c.timestamp::date = g.date
//                            AND ((g.daily_open > g.prev_close AND c.low <= g.prev_close) 
//                              OR (g.daily_open < g.prev_close AND c.high >= g.prev_close))
//                         ) AS fill_time
//                     FROM GapAnalysis g
//                     WHERE g.prev_close IS NOT NULL
//                 ),
//                 ReversalAnalysis AS (
//                     SELECT 
//                         f.*,
//                         -- Gap Fill hone ke 5 minute baad ka price
//                         (SELECT close FROM historical_candles c 
//                          WHERE c.symbol = $1 AND c.timestamp > f.fill_time AND c.timestamp <= f.fill_time + interval '5 minutes' 
//                          ORDER BY timestamp DESC LIMIT 1) AS price_after_5m,
//                         -- Gap Fill hone ke 15 minute baad ka price
//                         (SELECT close FROM historical_candles c 
//                          WHERE c.symbol = $1 AND c.timestamp > f.fill_time AND c.timestamp <= f.fill_time + interval '15 minutes' 
//                          ORDER BY timestamp DESC LIMIT 1) AS price_after_15m
//                     FROM FillTimeAnalysis f
//                 )
//                 SELECT 
//                     TO_CHAR(date, 'YYYY-MM-DD') AS formatted_date, 
//                     day_of_week, prev_close, daily_open,
//                     ROUND(CAST(daily_open - prev_close AS numeric), 2) AS gap_points,
//                     ROUND(CAST(((daily_open - prev_close) / prev_close) * 100 AS numeric), 2) AS gap_percent,
//                     ROUND(CAST(daily_close - prev_close AS numeric), 2) AS move_points,
//                     ROUND(CAST(((daily_close - prev_close) / prev_close) * 100 AS numeric), 2) AS move_percent,
//                     CASE 
//                         WHEN daily_open > prev_close THEN 'GAP_UP'
//                         WHEN daily_open < prev_close THEN 'GAP_DOWN'
//                         ELSE 'FLAT' 
//                     END AS gap_type,
//                     CASE WHEN fill_time IS NOT NULL THEN true ELSE false END AS is_filled,
                    
//                     -- 🎯 5m aur 15m Reversal Bounce Logic
//                     CASE 
//                         WHEN daily_open > prev_close AND price_after_5m > prev_close THEN true 
//                         WHEN daily_open < prev_close AND price_after_5m < prev_close THEN true 
//                         ELSE false 
//                     END AS is_reversed_5m,
//                     CASE 
//                         WHEN daily_open > prev_close AND price_after_15m > prev_close THEN true 
//                         WHEN daily_open < prev_close AND price_after_15m < prev_close THEN true 
//                         ELSE false 
//                     END AS is_reversed_15m,

//                     ROUND(CAST(morning_move AS numeric), 2) AS morning_move,
//                     ROUND(CAST(midday_move AS numeric), 2) AS midday_move,
//                     ROUND(CAST(closing_move AS numeric), 2) AS closing_move
//                 FROM ReversalAnalysis
//                 ORDER BY formatted_date DESC;
//             `;

//             // Query run karke parameters bhejna (Dhyaan rahe, symbol 4 baar use ho raha hai isliye use array me add kiya hai)
//             const result = await client.query(query, [symbol, fromDate, toDate]);
//             let rawData = result.rows;

//             // 🎯 STREAK GROUPING LOGIC (Mera purana code same rahega)
//             let ascendingData = rawData.reverse();
//             let currentStreak = 1;
//             let lastGapType = null;
//             let currentGroupId = 1; 
//             let groupMaxStreaks = {}; 

//             ascendingData.forEach((row, index) => {
//                 if (index === 0) {
//                     currentStreak = 1;
//                 } else {
//                     if (row.gap_type !== 'FLAT' && row.gap_type === lastGapType) {
//                         currentStreak++;
//                     } else {
//                         currentStreak = 1;
//                         currentGroupId++; 
//                     }
//                 }
//                 row.streak = currentStreak;
//                 row.groupId = currentGroupId;
//                 groupMaxStreaks[currentGroupId] = Math.max(groupMaxStreaks[currentGroupId] || 1, currentStreak);
//                 lastGapType = row.gap_type;
//             });
//             rawData = ascendingData.reverse();

//             // 🎯 NEW FILTERS & REVERSAL CHECK
//             let filteredData = rawData.filter(row => {
//                 let match = true;
                
//                 if (dayOfWeek !== 'ALL' && row.day_of_week.toString() !== dayOfWeek.toString()) match = false;
//                 if (gapType !== 'ALL' && row.gap_type !== gapType) match = false;
                
//                 if (movementRange !== 'ALL') {
//                     let moveAbs = Math.abs(parseFloat(row.move_percent));
//                     if (movementRange === '0-0.5' && (moveAbs < 0 || moveAbs > 0.5)) match = false;
//                     else if (movementRange === '0.5-1.0' && (moveAbs < 0.5 || moveAbs > 1.0)) match = false;
//                     else if (movementRange === '1.0-1.5' && (moveAbs < 1.0 || moveAbs > 1.5)) match = false;
//                     else if (movementRange === '1.5-2.0' && (moveAbs < 1.5 || moveAbs > 2.0)) match = false;
//                     else if (movementRange === '2.0-2.5' && (moveAbs < 2.0 || moveAbs > 2.5)) match = false;
//                     else if (movementRange === '2.5-3.0' && (moveAbs < 2.5 || moveAbs > 3.0)) match = false;
//                     else if (movementRange === '3.0-4.0' && (moveAbs < 3.0 || moveAbs > 4.0)) match = false;
//                     else if (movementRange === '4.0-5.0' && (moveAbs < 4.0 || moveAbs > 5.0)) match = false;
//                     else if (movementRange === 'ABOVE-5.0' && moveAbs <= 5.0) match = false;
//                 }

//                 if (streakCount && parseInt(streakCount) > 1) {
//                     if (groupMaxStreaks[row.groupId] < parseInt(streakCount)) match = false;
//                 }

//                 // 🎯 Reversal Filter 
//                 if (reversalTF !== 'NONE') {
//                     if (!row.is_filled) match = false; // Agar gap fill hi nahi hua toh reversal nahi ho sakta
//                     else if (reversalTF === '5m' && !row.is_reversed_5m) match = false;
//                     else if (reversalTF === '15m' && !row.is_reversed_15m) match = false;
//                 }
                
//                 return match;
//             });

//             // 🎯 REVERSAL PROBABILITY MATH FOR SUMMARY CARDS
//             let totalDays = filteredData.length;
//             let gapUpCount = 0, gapDownCount = 0, gapFilledCount = 0, reversalCount = 0;
//             let totalMorning = 0, totalMidday = 0, totalClosing = 0;

//             let tableData = filteredData.map((row, index) => {
//                 if (row.gap_type === 'GAP_UP') gapUpCount++;
//                 if (row.gap_type === 'GAP_DOWN') gapDownCount++;
                
//                 // Decide which reversal flag to show in the table (default 5m if NONE)
//                 let isReversed = false;
//                 if (row.is_filled) {
//                     gapFilledCount++;
//                     isReversed = (reversalTF === '15m') ? row.is_reversed_15m : row.is_reversed_5m;
//                     if (isReversed) reversalCount++;
//                 }

//                 totalMorning += parseFloat(row.morning_move || 0);
//                 totalMidday += parseFloat(row.midday_move || 0);
//                 totalClosing += parseFloat(row.closing_move || 0);

//                 return {
//                     id: index + 1,
//                     date: row.formatted_date, 
//                     prevClose: parseFloat(row.prev_close),
//                     open: parseFloat(row.daily_open),
//                     gapPoints: parseFloat(row.gap_points),
//                     gapPercent: parseFloat(row.gap_percent), 
//                     gapType: row.gap_type,
//                     movePoints: parseFloat(row.move_points),
//                     movePercent: parseFloat(row.move_percent),
//                     isFilled: row.is_filled,
//                     isReversed: isReversed, // 🎯 API Table me boolean bhej rahi hai
//                     morningMove: parseFloat(row.morning_move || 0),
//                     middayMove: parseFloat(row.midday_move || 0),
//                     closingMove: parseFloat(row.closing_move || 0)
//                 };
//             });

//             let gapUpPercent = totalDays > 0 ? ((gapUpCount / totalDays) * 100).toFixed(2) : "0.00";
//             let gapDownPercent = totalDays > 0 ? ((gapDownCount / totalDays) * 100).toFixed(2) : "0.00";
//             let gapFillProb = (gapUpCount + gapDownCount) > 0 ? ((gapFilledCount / (gapUpCount + gapDownCount)) * 100).toFixed(2) : "0.00";
            
//             // 🎯 Reversal Probability
//             let reversalProb = gapFilledCount > 0 ? ((reversalCount / gapFilledCount) * 100).toFixed(2) : "0.00";

//             let summary = {
//                 totalDays, gapUpPercent, gapDownPercent, gapFillProb,
//                 reversalProb, // 🎯 Card me data update hoga
//                 timeBuckets: {
//                     morningAvg: totalDays > 0 ? (totalMorning / totalDays).toFixed(1) : "0.0",
//                     middayAvg: totalDays > 0 ? (totalMidday / totalDays).toFixed(1) : "0.0",
//                     closingAvg: totalDays > 0 ? (totalClosing / totalDays).toFixed(1) : "0.0"
//                 }
//             };

//             res.json({ success: true, data: { summary, tableData } });

//         } finally {
//             client.release();
//         }
//     } catch (error) {
//         console.error("Error fetching insight data:", error);
//         res.status(500).json({ success: false, message: "Server Error" });
//     }
// };




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