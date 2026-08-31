// const path = require('path');
// require('dotenv').config({ path: path.join(__dirname, '../.env') });
// const axios = require('axios');
// const { pool } = require('../config/postgres');
// const mongoose = require('mongoose');

// // ==========================================
// // 🔌 MONGODB CONNECTION
// // ==========================================
// const brokerSchema = new mongoose.Schema({}, { strict: false, collection: 'brokers' });
// const Broker = mongoose.models.Broker || mongoose.model('Broker', brokerSchema);

// async function getDynamicHeaders() {
//     try {
//         const broker = await Broker.findOne({ name: "Dhan" }); 
//         if (!broker || !broker.apiSecret) return null;
//         return {
//             'access-token': broker.apiSecret, 
//             'client-id': broker.clientId,      
//             'Content-Type': 'application/json'
//         };
//     } catch (error) {
//         return null;
//     }
// }

// // ==========================================
// // 🚀 THE JUGAD (FETCH FULL DAY SPOT & SAVE)
// // ==========================================
// async function runJugad() {
//     console.log("⚡ JUGAD SCRIPT STARTED: Fetching today's full NIFTY spot data...");
    
//     const headers = await getDynamicHeaders();
//     if (!headers) {
//         console.log("❌ Token not found in DB.");
//         process.exit();
//     }

    // // आज की डेट (26 अगस्त 2026)
    // const today = new Date();
    // const year = today.getFullYear();
    // const month = String(today.getMonth() + 1).padStart(2, '0');
    // const day = String(today.getDate()).padStart(2, '0');
    // const syncDate = `${year}-${month}-${day}`;
    // const syncDate = "2026-08-28"; 
    
//     const fromTime = `${syncDate} 09:15:00`;
//     const toTime = `${syncDate} 15:30:00`;

//     try {
//         const response = await axios.post('https://api.dhan.co/v2/charts/intraday', { 
//             securityId: "13", exchangeSegment: "IDX_I", instrument: "INDEX", interval: "1", fromDate: fromTime, toDate: toTime 
//         }, { headers });

//         const data = response.data;

//         if (data && data.timestamp && data.timestamp.length > 0) {
//             const client = await pool.connect();
//             try {
//                 await client.query('BEGIN');
                
//                 // पूरा लूप चलाकर आज की हर एक मिनट की कैंडल सेव करना
//                 for (let i = 0; i < data.timestamp.length; i++) {
//                     let date = new Date(data.timestamp[i] * 1000);
//                     date.setSeconds(0, 0);
                    
//                     const query = `
//                         INSERT INTO historical_candles (symbol, timestamp, open, high, low, close, volume) 
//                         VALUES ($1, $2, $3, $4, $5, $6, $7)
//                         ON CONFLICT (symbol, timestamp) DO UPDATE SET 
//                             open = EXCLUDED.open, high = EXCLUDED.high, 
//                             low = EXCLUDED.low, close = EXCLUDED.close, volume = EXCLUDED.volume;
//                     `;
//                     await client.query(query, [
//                         'NIFTY', date.toISOString(), data.open[i], data.high[i], data.low[i], data.close[i], data.volume[i]
//                     ]);
//                 }
                
//                 await client.query('COMMIT');
//                 console.log(`🎉 [JUGAD SUCCESS] Total ${data.timestamp.length} minute candles of NIFTY saved to AWS!`);
//             } catch (dbError) {
//                 await client.query('ROLLBACK');
//                 console.error("❌ DB Error:", dbError.message);
//             } finally {
//                 client.release();
//             }
//         } else {
//             console.log("⚠️ No data received from Dhan API.");
//         }
//     } catch (error) {
//         console.error("❌ API Error:", error.message);
//     }
    
//     console.log("✅ Done! You can now check your Simulator.");
//     process.exit();
// }

// // 🚦 RUN
// mongoose.connect(process.env.MONGO_URI).then(() => {
//     runJugad();
// });


// const path = require('path');
// require('dotenv').config({ path: path.join(__dirname, '../.env') });
// const axios = require('axios');
// const { pool } = require('../config/postgres');
// const mongoose = require('mongoose');

// // ==========================================
// // 🔌 MONGODB CONNECTION
// // ==========================================
// const brokerSchema = new mongoose.Schema({}, { strict: false, collection: 'brokers' });
// const Broker = mongoose.models.Broker || mongoose.model('Broker', brokerSchema);

// async function getDynamicHeaders() {
//     try {
//         const broker = await Broker.findOne({ name: "Dhan" }); 
//         if (!broker || !broker.apiSecret) return null;
//         return {
//             'access-token': broker.apiSecret, 
//             'client-id': broker.clientId,      
//             'Content-Type': 'application/json'
//         };
//     } catch (error) {
//         return null;
//     }
// }

// // ==========================================
// // 🚀 THE JUGAD (FETCH FULL DAY SPOT & SAVE)
// // ==========================================
// async function runJugad() {
//     console.log("⚡ JUGAD SCRIPT STARTED: Fetching full NIFTY spot data...");
    
//     const headers = await getDynamicHeaders();
//     if (!headers) {
//         console.log("❌ Token not found in DB.");
//         process.exit();
//     }

//     const syncDate = "2026-08-28"; 
    
//     // 🎯 FIX 1: Dhan API expects only "YYYY-MM-DD" for historical intraday
//     const fromDate = syncDate;
//     const toDate = syncDate;

//     try {
//         const response = await axios.post('https://api.dhan.co/v2/charts/intraday', { 
//             securityId: "13", 
//             exchangeSegment: "IDX_I", 
//             instrument: "INDEX", 
//             interval: "1", 
//             fromDate: fromDate, 
//             toDate: toDate 
//         }, { headers });

//         // 🎯 FIX 2: Dhan puts arrays inside response.data.data
//         const chartData = response.data.data;

//         // 🎯 FIX 3: Dhan uses 'start_Time' instead of 'timestamp'
//         if (chartData && chartData.start_Time && chartData.start_Time.length > 0) {
//             const client = await pool.connect();
//             try {
//                 await client.query('BEGIN');
                
//                 // Pura loop chalakar har ek minute ki candle save karna
//                 for (let i = 0; i < chartData.start_Time.length; i++) {
//                     // Convert epoch seconds to milliseconds for JavaScript
//                     let date = new Date(chartData.start_Time[i] * 1000);
                    
//                     const query = `
//                         INSERT INTO historical_candles (symbol, timestamp, open, high, low, close, volume) 
//                         VALUES ($1, $2, $3, $4, $5, $6, $7)
//                         ON CONFLICT (symbol, timestamp) DO UPDATE SET 
//                             open = EXCLUDED.open, high = EXCLUDED.high, 
//                             low = EXCLUDED.low, close = EXCLUDED.close, volume = EXCLUDED.volume;
//                     `;
                    
//                     await client.query(query, [
//                         'NIFTY', 
//                         date.toISOString(), 
//                         chartData.open[i], 
//                         chartData.high[i], 
//                         chartData.low[i], 
//                         chartData.close[i], 
//                         chartData.volume[i] || 0
//                     ]);
//                 }
                
//                 await client.query('COMMIT');
//                 console.log(`🎉 [JUGAD SUCCESS] Total ${chartData.start_Time.length} minute candles of NIFTY saved to Postgres!`);
//             } catch (dbError) {
//                 await client.query('ROLLBACK');
//                 console.error("❌ DB Error:", dbError.message);
//             } finally {
//                 client.release();
//             }
//         } else {
//             console.log("⚠️ No data received from Dhan API. Check if today is a trading holiday or if time is correct.");
//             console.log("Response from Dhan:", response.data); // For debugging
//         }
//     } catch (error) {
//         console.error("❌ API Error:", error.response ? error.response.data : error.message);
//     }
    
//     console.log("✅ Done! You can now check your pgAdmin.");
//     process.exit();
// }

// // 🚦 RUN
// mongoose.connect(process.env.MONGO_URI).then(() => {
//     runJugad();
// });




const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const axios = require('axios');
const { pool } = require('../config/postgres');
const mongoose = require('mongoose');

// ==========================================
// 🔌 MONGODB CONNECTION
// ==========================================
const brokerSchema = new mongoose.Schema({}, { strict: false, collection: 'brokers' });
const Broker = mongoose.models.Broker || mongoose.model('Broker', brokerSchema);

async function getDynamicHeaders() {
    try {
        const broker = await Broker.findOne({ name: "Dhan" }); 
        if (!broker || !broker.apiSecret) return null;
        return {
            'access-token': broker.apiSecret, 
            'client-id': broker.clientId,      
            'Content-Type': 'application/json'
        };
    } catch (error) {
        return null;
    }
}

// ==========================================
// 🚀 THE JUGAD (FETCH 5-MIN SPOT & SAVE)
// ==========================================
async function runJugad() {
    console.log("⚡ JUGAD SCRIPT STARTED: Fetching 1-Min NIFTY spot data...");
    
    const headers = await getDynamicHeaders();
    if (!headers) {
        console.log("❌ Token not found in DB.");
        process.exit();
    }

    const syncDate = "2026-08-31"; 
    const fromDate = syncDate;
    const toDate = syncDate;

    try {
        const response = await axios.post('https://api.dhan.co/v2/charts/intraday', { 
            securityId: "13", 
            exchangeSegment: "IDX_I", 
            instrument: "INDEX", 
            interval: "1", // 🎯 1-Minute SMC timeframe
            fromDate: fromDate, 
            toDate: toDate 
        }, { headers });

        // 🎯 FIX 1: Reverted to response.data (Terminal me yahi structure dikh raha hai)
        const chartData = response.data;

        // 🎯 FIX 2: Reverted to chartData.timestamp
        if (chartData && chartData.timestamp && chartData.timestamp.length > 0) {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                
                for (let i = 0; i < chartData.timestamp.length; i++) {
                    // Epoch to Milliseconds conversion
                    let date = new Date(chartData.timestamp[i] * 1000);
                    
                    const query = `
                        INSERT INTO historical_candles (symbol, timestamp, open, high, low, close, volume) 
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT (symbol, timestamp) DO UPDATE SET 
                            open = EXCLUDED.open, high = EXCLUDED.high, 
                            low = EXCLUDED.low, close = EXCLUDED.close, volume = EXCLUDED.volume;
                    `;
                    
                    await client.query(query, [
                        'NIFTY', 
                        date.toISOString(), 
                        chartData.open[i], 
                        chartData.high[i], 
                        chartData.low[i], 
                        chartData.close[i], 
                        chartData.volume[i] || 0
                    ]);
                }
                
                await client.query('COMMIT');
                console.log(`🎉 [JUGAD SUCCESS] Total ${chartData.timestamp.length} (5-Minute) candles saved to Database!`);
            } catch (dbError) {
                await client.query('ROLLBACK');
                console.error("❌ DB Error:", dbError.message);
            } finally {
                client.release();
            }
        } else {
            console.log("⚠️ No data received. Structure might be empty.");
            console.log("Response:", response.data); 
        }
    } catch (error) {
        console.error("❌ API Error:", error.response ? error.response.data : error.message);
    }
    
    console.log("✅ Done! Data saved.");
    process.exit();
}

// 🚦 RUN
mongoose.connect(process.env.MONGO_URI).then(() => {
    runJugad();
});