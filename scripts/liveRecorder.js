// const axios = require('axios');
// const cron = require('node-cron');
// const { pool } = require('../config/postgres');
// // require('dotenv').config(); // Agar .env file use kar rahe ho

// const CLIENT_ID = "1103238744";
// const ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzg3Mjg0MTUzLCJpYXQiOjE3ODcxOTc3NTMsInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTAzMjM4NzQ0In0.A2orPJLJrzeHiS8Pi8JqX7J7NhpzX5uwaKZOdRgz1TbLZq0wlRhZVY-OcAOw_beBXyh1rkMH0_rmtsDie2nMAQ";


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
//                 const ceSecurityId = ce.token || ce.security_id || null;

//                 // 🛑 THE FILTER: Agar LTP 0 hai, to database me save mat karo!
//                 if (ceLTP > 0) {
//                     const ceGreeks = ce.greeks || {};
//                     // 👇 NAYA LOGIC: Table name change & open/high/low removed
//                     const ceQuery = `
//                         INSERT INTO option_chain_data 
//                         (instrument, strike, option_type, expiry_date, timestamp, close, volume, oi, iv, delta, theta, gamma, vega, security_id)
//                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
//                         ON CONFLICT (instrument, strike, option_type, expiry_date, timestamp) 
//                         DO UPDATE SET 
//                             close = EXCLUDED.close, volume = EXCLUDED.volume, oi = EXCLUDED.oi, iv = EXCLUDED.iv,
//                             delta = EXCLUDED.delta, theta = EXCLUDED.theta, gamma = EXCLUDED.gamma, vega = EXCLUDED.vega,
//                             security_id = EXCLUDED.security_id;
//                     `;

//                     await client.query(ceQuery, [
//                         'NIFTY', strike, 'CE', expiryDate, timestampStr,
//                         ceLTP,    // <-- Sirf Close (LTP) bacha hai
//                         ce.volume || 0, ce.oi || 0,
//                         ce.implied_volatility || 0, ceGreeks.delta || 0,
//                         ceGreeks.theta || 0, ceGreeks.gamma || 0, ceGreeks.vega || 0,
//                         ceSecurityId                   // 👈 14th value: Security ID
//                     ]);
//                 }
//             }

//             // --- 2. PROCESS PUT OPTION (PE) ---
//             if (strikeData.pe) {
//                 const pe = strikeData.pe;
//                 const peLTP = pe.last_price || 0;
//                 const peSecurityId = pe.token || pe.security_id || null;

//                 // 🛑 THE FILTER: Agar LTP 0 hai, to database me save mat karo!
//                 if (peLTP > 0) {
//                     const peGreeks = pe.greeks || {};
//                     // 👇 NAYA LOGIC: Table name change & open/high/low removed
//                     const peQuery = `
//                         INSERT INTO option_chain_data 
//                         (instrument, strike, option_type, expiry_date, timestamp, close, volume, oi, iv, delta, theta, gamma, vega, security_id)
//                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
//                         ON CONFLICT (instrument, strike, option_type, expiry_date, timestamp) 
//                         DO UPDATE SET 
//                             close = EXCLUDED.close, volume = EXCLUDED.volume, oi = EXCLUDED.oi, iv = EXCLUDED.iv,
//                             delta = EXCLUDED.delta, theta = EXCLUDED.theta, gamma = EXCLUDED.gamma, vega = EXCLUDED.vega,
//                             security_id = EXCLUDED.security_id;
//                     `;

//                     await client.query(peQuery, [
//                         'NIFTY', strike, 'PE', expiryDate, timestampStr,
//                         peLTP,    // <-- Sirf Close (LTP) bacha hai
//                         pe.volume || 0, pe.oi || 0,
//                         pe.implied_volatility || 0, peGreeks.delta || 0,
//                         peGreeks.theta || 0, peGreeks.gamma || 0, peGreeks.vega || 0,
//                         peSecurityId                   // 👈 14th value: Security ID
//                     ]);
//                 }
//             }
//         }

//         await client.query('COMMIT');
//         console.log(`🎉 [SUCCESS] Filtered Live Option Chain (Cleaned up) saved to Postgres successfully!`);

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




// require('dotenv').config({ path: '../.env' });

// const axios = require('axios');
// const cron = require('node-cron');
// const { pool } = require('../config/postgres');

// const CLIENT_ID = process.env.DHAN_CLIENT_ID;
// const ACCESS_TOKEN = process.env.DHAN_ACCESS_TOKEN

// const headers = {
//     'access-token': ACCESS_TOKEN,
//     'client-id': CLIENT_ID,
//     'Content-Type': 'application/json'
// };

// // ==========================================
// // 🔍 1. GET TARGET EXPIRIES DYNAMICALLY (SMART LOGIC)
// // ==========================================
// async function getTargetExpiries() {
//     try {
//         const url = 'https://api.dhan.co/v2/optionchain/expirylist';
//         const payload = {
//             "UnderlyingScrip": 13,    // 13 = NIFTY 50
//             "UnderlyingSeg": "IDX_I"
//         };

//         const response = await axios.post(url, payload, { headers });
//         if (response.data && response.data.data && response.data.data.length > 0) {
//             const allExpiries = response.data.data; // Dhan se aayi saari expiries ki list

//             const expiriesList = [];

//             // Step A: Shuru ki 5 continuous expiries hamesha add karo
//             for(let i = 0; i < Math.min(5, allExpiries.length); i++){
//                 expiriesList.push(allExpiries[i]);
//             }

//             // Step B: Next Month (NM) ki Aakhiri (Monthly) Expiry dhundo
//             if (allExpiries.length > 0) {
//                 const currentMonth = new Date(allExpiries[0]).getMonth(); 
//                 const targetNextMonth = (currentMonth + 1) % 12;

//                 let nmMonthlyExpiry = null;
//                 for (let i = 0; i < allExpiries.length - 1; i++) {
//                     const m1 = new Date(allExpiries[i]).getMonth();
//                     const m2 = new Date(allExpiries[i+1]).getMonth();
                    
//                     if (m1 === targetNextMonth && m2 !== targetNextMonth) {
//                         nmMonthlyExpiry = allExpiries[i];
//                         break;
//                     }
//                 }

//                 // Step C: Agar NM Monthly expiry list me nahi hai, toh add kar do
//                 if (nmMonthlyExpiry && !expiriesList.includes(nmMonthlyExpiry)) {
//                     expiriesList.push(nmMonthlyExpiry);
//                 }
//             }

//             return expiriesList; 
//         }
//     } catch (error) {
//         console.error("❌ Expiry Fetch Error:", error.response ? error.response.data : error.message);
//     }
//     return [];
// }

// // ==========================================
// // 💾 2. SAVE LIVE OPTION CHAIN TO POSTGRES
// // ==========================================
// async function saveLiveOptionChainToDB(expiryDate, optionChainData) {
//     const client = await pool.connect();
//     try {
//         const strikes = Object.keys(optionChainData.oc);

//         const now = new Date();
//         now.setSeconds(0, 0);
//         const timestampStr = now.toISOString();

//         await client.query('BEGIN'); 

//         for (const strikeStr of strikes) {
//             const strike = parseFloat(strikeStr);
//             const strikeData = optionChainData.oc[strikeStr];

//             // --- 1. PROCESS CE ---
//             if (strikeData.ce) {
//                 const ce = strikeData.ce;
//                 const ceLTP = ce.last_price || 0;
//                 const ceSecurityId = ce.token || ce.security_id || null;

//                 if (ceLTP > 0) {
//                     const ceGreeks = ce.greeks || {};
//                     const ceQuery = `
//                         INSERT INTO option_chain_data 
//                         (instrument, strike, option_type, expiry_date, timestamp, close, volume, oi, iv, delta, theta, gamma, vega, security_id)
//                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
//                         ON CONFLICT (instrument, strike, option_type, expiry_date, timestamp) 
//                         DO UPDATE SET 
//                             close = EXCLUDED.close, volume = EXCLUDED.volume, oi = EXCLUDED.oi, iv = EXCLUDED.iv,
//                             delta = EXCLUDED.delta, theta = EXCLUDED.theta, gamma = EXCLUDED.gamma, vega = EXCLUDED.vega,
//                             security_id = EXCLUDED.security_id;
//                     `;
//                     await client.query(ceQuery, [
//                         'NIFTY', strike, 'CE', expiryDate, timestampStr,
//                         ceLTP, ce.volume || 0, ce.oi || 0,
//                         ce.implied_volatility || 0, ceGreeks.delta || 0,
//                         ceGreeks.theta || 0, ceGreeks.gamma || 0, ceGreeks.vega || 0,
//                         ceSecurityId 
//                     ]);
//                 }
//             }

//             // --- 2. PROCESS PE ---
//             if (strikeData.pe) {
//                 const pe = strikeData.pe;
//                 const peLTP = pe.last_price || 0;
//                 const peSecurityId = pe.token || pe.security_id || null;

//                 if (peLTP > 0) {
//                     const peGreeks = pe.greeks || {};
//                     const peQuery = `
//                         INSERT INTO option_chain_data 
//                         (instrument, strike, option_type, expiry_date, timestamp, close, volume, oi, iv, delta, theta, gamma, vega, security_id)
//                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
//                         ON CONFLICT (instrument, strike, option_type, expiry_date, timestamp) 
//                         DO UPDATE SET 
//                             close = EXCLUDED.close, volume = EXCLUDED.volume, oi = EXCLUDED.oi, iv = EXCLUDED.iv,
//                             delta = EXCLUDED.delta, theta = EXCLUDED.theta, gamma = EXCLUDED.gamma, vega = EXCLUDED.vega,
//                             security_id = EXCLUDED.security_id;
//                     `;
//                     await client.query(peQuery, [
//                         'NIFTY', strike, 'PE', expiryDate, timestampStr,
//                         peLTP, pe.volume || 0, pe.oi || 0,
//                         pe.implied_volatility || 0, peGreeks.delta || 0,
//                         peGreeks.theta || 0, peGreeks.gamma || 0, peGreeks.vega || 0,
//                         peSecurityId 
//                     ]);
//                 }
//             }
//         }

//         await client.query('COMMIT');
//         console.log(`✅ Saved live data for Expiry: ${expiryDate}`);

//     } catch (error) {
//         await client.query('ROLLBACK');
//         console.error(`❌ DB Save Error for ${expiryDate}:`, error.message);
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
//         // 1. Ek nahi, ab array of expiries aayegi!
//         const targetExpiries = await getTargetExpiries();
        
//         if (!targetExpiries || targetExpiries.length === 0) {
//             console.log(`[${timeNow}] ⚠️ Could not fetch expiry dates. Aborting.`);
//             return;
//         }
        
//         console.log(`📅 Target Expiries: ${targetExpiries.join(', ')}`);

//         // 2. Har expiry ke liye Dhan API ko call maro
//         for (const expiry of targetExpiries) {
//             console.log(`📡 Fetching live data for: ${expiry}...`);
            
//             const url = 'https://api.dhan.co/v2/optionchain';
//             const payload = {
//                 "UnderlyingScrip": 13,
//                 "UnderlyingSeg": "IDX_I",
//                 "Expiry": expiry
//             };

//             try {
//                 const response = await axios.post(url, payload, { 
//                     headers: headers,
//                     timeout: 10000 // Safe timeout
//                 });
//                 const optionChainData = response.data.data;

//                 if (!optionChainData || !optionChainData.oc) {
//                     console.log(`⚠️ No Option Chain data received for ${expiry}.`);
//                     continue; // Skip karke next expiry pe jao
//                 }

//                 // 3. Database me save karo
//                 await saveLiveOptionChainToDB(expiry, optionChainData);

//             } catch (err) {
//                 console.error(`❌ API Error for ${expiry}:`, err.message);
//             }

//             // 🎯 API Rate Limit se bachne ke liye har request ke baad 1 second ka delay
//             await new Promise(resolve => setTimeout(resolve, 1000));
//         }

//         console.log(`🎉 Live sync completed for this minute!`);

//     } catch (error) {
//         console.error(`❌ Fetch Error:`, error.message);
//     }
// }

// // ==========================================
// // ⏰ 4. THE TIMEKEEPER (CRON SCHEDULER)
// // ==========================================
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
// console.log("🟢 SMART TRADER LIVE RECORDER (MULTI-EXPIRY) STARTED");
// console.log("⏳ Waiting for the clock to hit the next minute...");
// console.log("=====================================================");

// // Start immediately on run
// fetchLiveOptionChain();



const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const axios = require('axios');
const cron = require('node-cron');
const { pool } = require('../config/postgres');
const mongoose = require('mongoose'); // 🎯 Mongoose import kiya

// ==========================================
// 🔌 MONGODB CONNECTION (For Dynamic Token)
// ==========================================
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB for Dynamic Tokens!'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err.message));

// 🎯 Broker Collection ka Schema (Strict: false rakha hai taaki kisi bhi structure pe kaam kare)
const brokerSchema = new mongoose.Schema({}, { strict: false, collection: 'brokers' });
const Broker = mongoose.models.Broker || mongoose.model('Broker', brokerSchema);

async function getDynamicHeaders() {
    try {
        // 🎯 Sirf Dhan broker ka document uthayenge jiska clientId aur apiSecret maujood ho
        const broker = await Broker.findOne({ name: "Dhan" }); 

        if (!broker || !broker.apiSecret) {
            console.log("⚠️ MongoDB me Dhan broker ya apiSecret (Access Token) nahi mila!");
            return null;
        }

        return {
            'access-token': broker.apiSecret, // 🎯 Database ka field 'apiSecret' hai
            'client-id': broker.clientId,       // 🎯 Database ka field 'clientId' hai
            'Content-Type': 'application/json'
        };
    } catch (error) {
        console.error("❌ Error fetching dynamic headers from MongoDB:", error.message);
        return null;
    }
}

// ==========================================
// 🔍 1. GET TARGET EXPIRIES DYNAMICALLY 
// ==========================================
async function getTargetExpiries(dynamicHeaders) {
    try {
        const url = 'https://api.dhan.co/v2/optionchain/expirylist';
        const payload = {
            "UnderlyingScrip": 13,    
            "UnderlyingSeg": "IDX_I"
        };

        const response = await axios.post(url, payload, { headers: dynamicHeaders });
        if (response.data && response.data.data && response.data.data.length > 0) {
            const allExpiries = response.data.data; 
            const expiriesList = [];

            for(let i = 0; i < Math.min(5, allExpiries.length); i++){
                expiriesList.push(allExpiries[i]);
            }

            if (allExpiries.length > 0) {
                const currentMonth = new Date(allExpiries[0]).getMonth(); 
                const targetNextMonth = (currentMonth + 1) % 12;

                let nmMonthlyExpiry = null;
                for (let i = 0; i < allExpiries.length - 1; i++) {
                    const m1 = new Date(allExpiries[i]).getMonth();
                    const m2 = new Date(allExpiries[i+1]).getMonth();
                    
                    if (m1 === targetNextMonth && m2 !== targetNextMonth) {
                        nmMonthlyExpiry = allExpiries[i];
                        break;
                    }
                }

                if (nmMonthlyExpiry && !expiriesList.includes(nmMonthlyExpiry)) {
                    expiriesList.push(nmMonthlyExpiry);
                }
            }
            return expiriesList; 
        }
    } catch (error) {
        console.error("❌ Expiry Fetch Error:", error.response ? error.response.data : error.message);
    }
    return [];
}

// ==========================================
// 💾 2. SAVE LIVE OPTION CHAIN TO POSTGRES
// ==========================================
async function saveLiveOptionChainToDB(expiryDate, optionChainData) {
    const client = await pool.connect();
    try {
        const strikes = Object.keys(optionChainData.oc);
        const now = new Date();
        now.setSeconds(0, 0);
        const timestampStr = now.toISOString();

        await client.query('BEGIN'); 

        for (const strikeStr of strikes) {
            const strike = parseFloat(strikeStr);
            const strikeData = optionChainData.oc[strikeStr];

            if (strikeData.ce) {
                const ce = strikeData.ce;
                const ceLTP = ce.last_price || 0;
                const ceSecurityId = ce.token || ce.security_id || null;

                if (ceLTP > 0) {
                    const ceGreeks = ce.greeks || {};
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
                        ceLTP, ce.volume || 0, ce.oi || 0,
                        ce.implied_volatility || 0, ceGreeks.delta || 0,
                        ceGreeks.theta || 0, ceGreeks.gamma || 0, ceGreeks.vega || 0,
                        ceSecurityId 
                    ]);
                }
            }

            if (strikeData.pe) {
                const pe = strikeData.pe;
                const peLTP = pe.last_price || 0;
                const peSecurityId = pe.token || pe.security_id || null;

                if (peLTP > 0) {
                    const peGreeks = pe.greeks || {};
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
                        peLTP, pe.volume || 0, pe.oi || 0,
                        pe.implied_volatility || 0, peGreeks.delta || 0,
                        peGreeks.theta || 0, peGreeks.gamma || 0, peGreeks.vega || 0,
                        peSecurityId 
                    ]);
                }
            }
        }

        await client.query('COMMIT');
        console.log(`✅ Saved live data for Expiry: ${expiryDate}`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ DB Save Error for ${expiryDate}:`, error.message);
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
        // 🎯 1. MongoDB se Latest Token uthana
        const dynamicHeaders = await getDynamicHeaders();
        if (!dynamicHeaders) {
            console.log(`[${timeNow}] ⚠️ Stopping execution because valid token not found in MongoDB.`);
            return;
        }

        // 🎯 2. Headers ko pass karna API call me
        const targetExpiries = await getTargetExpiries(dynamicHeaders);
        
        if (!targetExpiries || targetExpiries.length === 0) {
            console.log(`[${timeNow}] ⚠️ Could not fetch expiry dates. Aborting.`);
            return;
        }
        
        console.log(`📅 Target Expiries: ${targetExpiries.join(', ')}`);

        for (const expiry of targetExpiries) {
            console.log(`📡 Fetching live data for: ${expiry}...`);
            
            const url = 'https://api.dhan.co/v2/optionchain';
            const payload = {
                "UnderlyingScrip": 13,
                "UnderlyingSeg": "IDX_I",
                "Expiry": expiry
            };

            try {
                // 🎯 3. Yahan bhi Dynamic Headers use honge
                const response = await axios.post(url, payload, { 
                    headers: dynamicHeaders,
                    timeout: 10000 
                });
                const optionChainData = response.data.data;

                if (!optionChainData || !optionChainData.oc) {
                    console.log(`⚠️ No Option Chain data received for ${expiry}.`);
                    continue; 
                }

                await saveLiveOptionChainToDB(expiry, optionChainData);

            } catch (err) {
                console.error(`❌ API Error for ${expiry}:`, err.message);
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`🎉 Live sync completed for this minute!`);

    } catch (error) {
        console.error(`❌ Fetch Error:`, error.message);
    }
}

// ==========================================
// ⏰ 4. THE TIMEKEEPER (CRON SCHEDULER)
// ==========================================
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
console.log("🟢 SMART TRADER LIVE RECORDER (MONGODB LINKED) STARTED");
console.log("⏳ Waiting for the clock to hit the next minute...");
console.log("=====================================================");

// Start immediately on run
fetchLiveOptionChain();