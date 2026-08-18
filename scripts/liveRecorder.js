// const axios = require('axios');
// const cron = require('node-cron');
// const { pool } = require('../config/postgres');
// // require('dotenv').config(); // Agar .env file use kar rahe ho

// const CLIENT_ID = "1103238744";
// const ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzg3MDIxNjIyLCJpYXQiOjE3ODY5MzUyMjIsInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTAzMjM4NzQ0In0.or0bixniBZFxQYiyZSYhalc-hckAdOh8g1k2KZdGXalNTuTlS7eeCi4Qh49lBTT9qoAXgcjxiP-YRUveHPFodA";


// const headers = {
//     'access-token': ACCESS_TOKEN,
//     'client-id': CLIENT_ID,
//     'Content-Type': 'application/json'
// };

// // ==========================================
// // 🔍 1. GET NEAREST EXPIRY DATE DYNAMICALLY
// // ==========================================
// async function getNearestExpiry() {
//     try {
//         const url = 'https://api.dhan.co/v2/optionchain/expirylist';
//         const payload = {
//             "UnderlyingScrip": 13,    // 13 = NIFTY 50
//             "UnderlyingSeg": "IDX_I"
//         };

//         const response = await axios.post(url, payload, { headers });
//         if (response.data && response.data.data && response.data.data.length > 0) {
//             return response.data.data[0]; // Nearest Expiry Date (eg: "2026-08-18")
//         }
//     } catch (error) {
//         console.error("❌ Expiry Fetch Error:", error.response ? error.response.data : error.message);
//     }
//     return null;
// }

// // ==========================================
// // 💾 2. SAVE LIVE OPTION CHAIN TO POSTGRES
// // ==========================================
// async function saveLiveOptionChainToDB(expiryDate, optionChainData) {
//     const client = await pool.connect();
//     try {
//         const strikes = Object.keys(optionChainData.oc);

//         // ⏱️ Timestamp Normalization (Seconds ko 00 karna)
//         const now = new Date();
//         now.setSeconds(0, 0);
//         const timestampStr = now.toISOString();

//         await client.query('BEGIN'); // Transaction start

//         for (const strikeStr of strikes) {
//             const strike = parseFloat(strikeStr);
//             const strikeData = optionChainData.oc[strikeStr];

//             // --- 1. PROCESS CALL OPTION (CE) ---
//             if (strikeData.ce) {
//                 const ce = strikeData.ce;
//                 const ceLTP = ce.last_price || 0;

//                 // 👇 NAYA LOGIC: Yahan hum security_id (token) nikal rahe hain
//                 const ceSecurityId = ce.token || ce.security_id || null;

//                 // 🛑 THE FILTER: Agar LTP 0 hai, to database me save mat karo!
//                 if (ceLTP > 0) {
//                     const ceGreeks = ce.greeks || {};
//                     const ceQuery = `
//                         INSERT INTO options_candles 
//                         (instrument, strike, option_type, expiry_date, timestamp, open, high, low, close, volume, oi, iv, delta, theta, gamma, vega, security_id)
//                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
//                         ON CONFLICT (instrument, strike, option_type, expiry_date, timestamp) 
//                         DO UPDATE SET 
//                             open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low, close = EXCLUDED.close,
//                             volume = EXCLUDED.volume, oi = EXCLUDED.oi, iv = EXCLUDED.iv,
//                             delta = EXCLUDED.delta, theta = EXCLUDED.theta, gamma = EXCLUDED.gamma, vega = EXCLUDED.vega,
//                             security_id = EXCLUDED.security_id; -- 👈 Update hone par id bhi set rahegi
//                     `;

//                     await client.query(ceQuery, [
//                         'NIFTY', strike, 'CE', expiryDate, timestampStr,
//                         ceLTP, ceLTP, ceLTP, ceLTP,    // <-- Open, High, Low, Close
//                         ce.volume || 0, ce.oi || 0,
//                         ce.implied_volatility || 0, ceGreeks.delta || 0,
//                         ceGreeks.theta || 0, ceGreeks.gamma || 0, ceGreeks.vega || 0,
//                         ceSecurityId                   // 👈 17th value: Security ID
//                     ]);
//                 }
//             }

//             // --- 2. PROCESS PUT OPTION (PE) ---
//             if (strikeData.pe) {
//                 const pe = strikeData.pe;
//                 const peLTP = pe.last_price || 0;

//                 // 👇 NAYA LOGIC: Yahan hum security_id (token) nikal rahe hain
//                 const peSecurityId = pe.token || pe.security_id || null;

//                 // 🛑 THE FILTER: Agar LTP 0 hai, to database me save mat karo!
//                 if (peLTP > 0) {
//                     const peGreeks = pe.greeks || {};
//                     const peQuery = `
//                         INSERT INTO options_candles 
//                         (instrument, strike, option_type, expiry_date, timestamp, open, high, low, close, volume, oi, iv, delta, theta, gamma, vega, security_id)
//                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
//                         ON CONFLICT (instrument, strike, option_type, expiry_date, timestamp) 
//                         DO UPDATE SET 
//                             open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low, close = EXCLUDED.close,
//                             volume = EXCLUDED.volume, oi = EXCLUDED.oi, iv = EXCLUDED.iv,
//                             delta = EXCLUDED.delta, theta = EXCLUDED.theta, gamma = EXCLUDED.gamma, vega = EXCLUDED.vega,
//                             security_id = EXCLUDED.security_id; -- 👈 Update hone par id bhi set rahegi
//                     `;

//                     await client.query(peQuery, [
//                         'NIFTY', strike, 'PE', expiryDate, timestampStr,
//                         peLTP, peLTP, peLTP, peLTP,    // <-- Open, High, Low, Close
//                         pe.volume || 0, pe.oi || 0,
//                         pe.implied_volatility || 0, peGreeks.delta || 0,
//                         peGreeks.theta || 0, peGreeks.gamma || 0, peGreeks.vega || 0,
//                         peSecurityId                   // 👈 17th value: Security ID
//                     ]);
//                 }
//             }
//         }

//         await client.query('COMMIT');
//         console.log(`🎉 [SUCCESS] Filtered Live Option Chain (with Security IDs) saved to Postgres successfully!`);

//     } catch (error) {
//         await client.query('ROLLBACK');
//         console.error(`❌ DB Save Error:`, error.message);
//     } finally {
//         client.release();
//     }
// }
// // ==========================================
// // ⚡ 3. FETCH LIVE OPTION CHAIN FROM DHAN
// // ==========================================
// async function fetchLiveOptionChain() {
//     const timeNow = new Date().toLocaleTimeString();
//     console.log(`\n[${timeNow}] ⚡ Starting Live Data Fetch & DB Save...`);

//     try {
//         const nearestExpiry = await getNearestExpiry();
//         if (!nearestExpiry) {
//             console.log(`[${timeNow}] ⚠️ Could not fetch expiry date. Aborting.`);
//             return;
//         }
//         console.log(`📅 Target Expiry Date: ${nearestExpiry}`);

//         const url = 'https://api.dhan.co/v2/optionchain';
//         const payload = {
//             "UnderlyingScrip": 13,
//             "UnderlyingSeg": "IDX_I",
//             "Expiry": nearestExpiry
//         };

//         const response = await axios.post(url, payload, { headers });
//         const optionChainData = response.data.data;

//         if (!optionChainData || !optionChainData.oc) {
//             console.log(`[${timeNow}] ⚠️ No Option Chain data received.`);
//             return;
//         }

//         // 👇 Yahan data database me save hoga
//         await saveLiveOptionChainToDB(nearestExpiry, optionChainData);

//     } catch (error) {
//         console.error(`❌ Fetch Error:`, error.response ? error.response.data : error.message);
//     }
// }

// // ==========================================
// // ⏰ 4. THE TIMEKEEPER (CRON SCHEDULER)
// // ==========================================
// // Har minute run hoga jab tak market open hai (Mon-Fri, 9:15 to 15:30)
// cron.schedule('* 9-15 * * 1-5', () => {
//     const now = new Date();
//     const hours = now.getHours();
//     const minutes = now.getMinutes();

//     if ((hours === 9 && minutes < 15) || (hours === 15 && minutes > 30)) {
//         console.log(`[${now.toLocaleTimeString()}] ⏸️ Market Closed. Waiting...`);
//         return;
//     }
//     fetchLiveOptionChain();
// });

// console.log("=====================================================");
// console.log("🟢 SMART TRADER LIVE RECORDER & DB SYNC STARTED");
// console.log("⏳ Waiting for the clock to hit the next minute...");
// console.log("=====================================================");

// // Testing ke liye turant ek baar run kar dete hain
// fetchLiveOptionChain();








const axios = require('axios');
const cron = require('node-cron');
const { pool } = require('../config/postgres');
// require('dotenv').config(); // Agar .env file use kar rahe ho

const CLIENT_ID = "1103238744";
const ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzg3MDIxNjIyLCJpYXQiOjE3ODY5MzUyMjIsInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTAzMjM4NzQ0In0.or0bixniBZFxQYiyZSYhalc-hckAdOh8g1k2KZdGXalNTuTlS7eeCi4Qh49lBTT9qoAXgcjxiP-YRUveHPFodA";


const headers = {
    'access-token': ACCESS_TOKEN,
    'client-id': CLIENT_ID,
    'Content-Type': 'application/json'
};

// ==========================================
// 🔍 1. GET NEAREST EXPIRY DATE DYNAMICALLY
// ==========================================
async function getNearestExpiry() {
    try {
        const url = 'https://api.dhan.co/v2/optionchain/expirylist';
        const payload = {
            "UnderlyingScrip": 13,    // 13 = NIFTY 50
            "UnderlyingSeg": "IDX_I"
        };

        const response = await axios.post(url, payload, { headers });
        if (response.data && response.data.data && response.data.data.length > 0) {
            return response.data.data[0]; // Nearest Expiry Date (eg: "2026-08-18")
        }
    } catch (error) {
        console.error("❌ Expiry Fetch Error:", error.response ? error.response.data : error.message);
    }
    return null;
}

// ==========================================
// 💾 2. SAVE LIVE OPTION CHAIN TO POSTGRES
// ==========================================
async function saveLiveOptionChainToDB(expiryDate, optionChainData) {
    const client = await pool.connect();
    try {
        const strikes = Object.keys(optionChainData.oc);

        // ⏱️ Timestamp Normalization (Seconds ko 00 karna)
        const now = new Date();
        now.setSeconds(0, 0);
        const timestampStr = now.toISOString();

        await client.query('BEGIN'); // Transaction start

        for (const strikeStr of strikes) {
            const strike = parseFloat(strikeStr);
            const strikeData = optionChainData.oc[strikeStr];

            // --- 1. PROCESS CALL OPTION (CE) ---
            if (strikeData.ce) {
                const ce = strikeData.ce;
                const ceLTP = ce.last_price || 0;
                const ceSecurityId = ce.token || ce.security_id || null;

                // 🛑 THE FILTER: Agar LTP 0 hai, to database me save mat karo!
                if (ceLTP > 0) {
                    const ceGreeks = ce.greeks || {};
                    // 👇 NAYA LOGIC: Table name change & open/high/low removed
                    const ceQuery = `
                        INSERT INTO option_chain_data 
                        (instrument, strike, option_type, expiry_date, timestamp, close, volume, oi, iv, delta, theta, gamma, vega, security_id)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                        ON CONFLICT (instrument, strike, option_type, expiry_date, timestamp) 
                        DO UPDATE SET 
                            close = EXCLUDED.close, volume = EXCLUDED.volume, oi = EXCLUDED.oi, iv = EXCLUDED.iv,
                            delta = EXCLUDED.delta, theta = EXCLUDED.theta, gamma = EXCLUDED.gamma, vega = EXCLUDED.vega,
                            security_id = EXCLUDED.security_id;
                    `;

                    await client.query(ceQuery, [
                        'NIFTY', strike, 'CE', expiryDate, timestampStr,
                        ceLTP,    // <-- Sirf Close (LTP) bacha hai
                        ce.volume || 0, ce.oi || 0,
                        ce.implied_volatility || 0, ceGreeks.delta || 0,
                        ceGreeks.theta || 0, ceGreeks.gamma || 0, ceGreeks.vega || 0,
                        ceSecurityId                   // 👈 14th value: Security ID
                    ]);
                }
            }

            // --- 2. PROCESS PUT OPTION (PE) ---
            if (strikeData.pe) {
                const pe = strikeData.pe;
                const peLTP = pe.last_price || 0;
                const peSecurityId = pe.token || pe.security_id || null;

                // 🛑 THE FILTER: Agar LTP 0 hai, to database me save mat karo!
                if (peLTP > 0) {
                    const peGreeks = pe.greeks || {};
                    // 👇 NAYA LOGIC: Table name change & open/high/low removed
                    const peQuery = `
                        INSERT INTO option_chain_data 
                        (instrument, strike, option_type, expiry_date, timestamp, close, volume, oi, iv, delta, theta, gamma, vega, security_id)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                        ON CONFLICT (instrument, strike, option_type, expiry_date, timestamp) 
                        DO UPDATE SET 
                            close = EXCLUDED.close, volume = EXCLUDED.volume, oi = EXCLUDED.oi, iv = EXCLUDED.iv,
                            delta = EXCLUDED.delta, theta = EXCLUDED.theta, gamma = EXCLUDED.gamma, vega = EXCLUDED.vega,
                            security_id = EXCLUDED.security_id;
                    `;

                    await client.query(peQuery, [
                        'NIFTY', strike, 'PE', expiryDate, timestampStr,
                        peLTP,    // <-- Sirf Close (LTP) bacha hai
                        pe.volume || 0, pe.oi || 0,
                        pe.implied_volatility || 0, peGreeks.delta || 0,
                        peGreeks.theta || 0, peGreeks.gamma || 0, peGreeks.vega || 0,
                        peSecurityId                   // 👈 14th value: Security ID
                    ]);
                }
            }
        }

        await client.query('COMMIT');
        console.log(`🎉 [SUCCESS] Filtered Live Option Chain (Cleaned up) saved to Postgres successfully!`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ DB Save Error:`, error.message);
    } finally {
        client.release();
    }
}


// ==========================================
// ⚡ 3. FETCH LIVE OPTION CHAIN FROM DHAN
// ==========================================
async function fetchLiveOptionChain() {
    const timeNow = new Date().toLocaleTimeString();
    console.log(`\n[${timeNow}] ⚡ Starting Live Data Fetch & DB Save...`);

    try {
        const nearestExpiry = await getNearestExpiry();
        if (!nearestExpiry) {
            console.log(`[${timeNow}] ⚠️ Could not fetch expiry date. Aborting.`);
            return;
        }
        console.log(`📅 Target Expiry Date: ${nearestExpiry}`);

        const url = 'https://api.dhan.co/v2/optionchain';
        const payload = {
            "UnderlyingScrip": 13,
            "UnderlyingSeg": "IDX_I",
            "Expiry": nearestExpiry
        };

        const response = await axios.post(url, payload, { headers });
        const optionChainData = response.data.data;

        if (!optionChainData || !optionChainData.oc) {
            console.log(`[${timeNow}] ⚠️ No Option Chain data received.`);
            return;
        }

        // 👇 Yahan data database me save hoga
        await saveLiveOptionChainToDB(nearestExpiry, optionChainData);

    } catch (error) {
        console.error(`❌ Fetch Error:`, error.response ? error.response.data : error.message);
    }
}

// ==========================================
// ⏰ 4. THE TIMEKEEPER (CRON SCHEDULER)
// ==========================================
// Har minute run hoga jab tak market open hai (Mon-Fri, 9:15 to 15:30)
cron.schedule('* 9-15 * * 1-5', () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    if ((hours === 9 && minutes < 15) || (hours === 15 && minutes > 30)) {
        console.log(`[${now.toLocaleTimeString()}] ⏸️ Market Closed. Waiting...`);
        return;
    }
    fetchLiveOptionChain();
});

console.log("=====================================================");
console.log("🟢 SMART TRADER LIVE RECORDER & DB SYNC STARTED");
console.log("⏳ Waiting for the clock to hit the next minute...");
console.log("=====================================================");

// Testing ke liye turant ek baar run kar dete hain
fetchLiveOptionChain();