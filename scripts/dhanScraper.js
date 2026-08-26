
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const axios = require('axios');
const { pool } = require('../config/postgres');

const CLIENT_ID = "1103238744";
const ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJ1c2VyUmVnaW9uIjoiUjEiLCJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzg3NTQzMjg5LCJpYXQiOjE3ODc0NTY4ODksInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTAzMjM4NzQ0In0.JdAoZsdLBv3Ie9_IrdYASQwtGa2vCoIbYE9CrQlju5N4qjoHDiRj3GSfM0SzkWTqAKFWeaxcMOB8HAEwk53i6w";

const SPOT_API_URL = 'https://api.dhan.co/v2/charts/intraday';

const headers = {
  'access-token': ACCESS_TOKEN,
  'client-id': CLIENT_ID,
  'Content-Type': 'application/json'
};

// ==========================================
// 💾 SPOT DATA SYNC (ONLY FOR NIFTY 50)
// ==========================================
async function saveSpotToDatabase(symbol, data) {
  if (!data || !data.timestamp || data.timestamp.length === 0) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < data.timestamp.length; i++) {
      let date = new Date(data.timestamp[i] * 1000);
      date.setSeconds(0, 0);
      
      const query = `
          INSERT INTO historical_candles (symbol, timestamp, open, high, low, close, volume) 
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (symbol, timestamp) DO UPDATE SET 
              open = EXCLUDED.open, high = EXCLUDED.high, 
              low = EXCLUDED.low, close = EXCLUDED.close, volume = EXCLUDED.volume;
      `;
      await client.query(query, [
        symbol, date.toISOString(), data.open[i], data.high[i], data.low[i], data.close[i], data.volume[i]
      ]);
    }
    await client.query('COMMIT');
    console.log(`🎉 [SUCCESS] Exact OHLC SPOT Data saved for [${symbol}]!`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ SPOT DB Error:`, error.message);
  } finally {
    client.release();
  }
}

async function fetchSpotData(securityId, symbol, fromDate, toDate) {
  console.log(`\n🚀 Fetching EXACT INTRADAY SPOT data for: ${symbol}...`);
  try {
    const payload = { 
        securityId: securityId, 
        exchangeSegment: "IDX_I", 
        instrument: "INDEX", 
        interval: "1", 
        fromDate: fromDate, 
        toDate: toDate 
    };
    const response = await axios.post(SPOT_API_URL, payload, { headers });
    
    // 🔥 THE FIX: Dhan sends data directly, not inside a second 'data' object!
    if (response.data && response.data.timestamp) {
        await saveSpotToDatabase(symbol, response.data);
    } else {
        console.log(`⚠️ No spot data received from Dhan. API Response:`, JSON.stringify(response.data).substring(0, 150) + "...");
    }
  } catch (error) {
    console.error(`❌ Spot Fetch Failed:`, error.message);
  }
}

// ==========================================
// 🚦 MAIN EXECUTION
// ==========================================
async function runScraper() {
  console.log("--------------------------------------------------");
  console.log("⚡ SMART TRADER EOD SYNCER STARTED (SPOT ONLY) ⚡");
  console.log("--------------------------------------------------");
  
  const syncDate = "2026-06-02"; 
  
  // 🔥 THE FIX: Dhan Intraday API requires exact TIME!
  const fromTime = `${syncDate} 09:15:00`;
  const toTime = `${syncDate} 15:30:00`;

  await fetchSpotData("13", "NIFTY", fromTime, toTime);

  console.log("--------------------------------------------------");
  console.log("✅ SPOT Data Synced. All tasks completed. Exiting...");
  process.exit();
}

runScraper();



// const axios = require('axios');
// const { pool } = require('../config/postgres');

// const CLIENT_ID = "1103238744";
// const ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJ1c2VyUmVnaW9uIjoiUjEiLCJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzg3NTQzMjg5LCJpYXQiOjE3ODc0NTY4ODksInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTAzMjM4NzQ0In0.JdAoZsdLBv3Ie9_IrdYASQwtGa2vCoIbYE9CrQlju5N4qjoHDiRj3GSfM0SzkWTqAKFWeaxcMOB8HAEwk53i6w";

// const SPOT_API_URL = 'https://api.dhan.co/v2/charts/intraday';

// const headers = {
//   'access-token': ACCESS_TOKEN,
//   'client-id': CLIENT_ID,
//   'Content-Type': 'application/json'
// };

// // ==========================================
// // 💾 SPOT DATA SYNC (ONLY FOR NIFTY 50)
// // ==========================================
// async function saveSpotToDatabase(symbol, data) {
//   if (!data || !data.timestamp || data.timestamp.length === 0) return;
//   const client = await pool.connect();
//   try {
//     await client.query('BEGIN');
//     for (let i = 0; i < data.timestamp.length; i++) {
//       let date = new Date(data.timestamp[i] * 1000);
//       date.setSeconds(0, 0);
      
//       const query = `
//           INSERT INTO historical_candles (symbol, timestamp, open, high, low, close, volume) 
//           VALUES ($1, $2, $3, $4, $5, $6, $7)
//           ON CONFLICT (symbol, timestamp) DO UPDATE SET 
//               open = EXCLUDED.open, high = EXCLUDED.high, 
//               low = EXCLUDED.low, close = EXCLUDED.close, volume = EXCLUDED.volume;
//       `;
//       await client.query(query, [
//         symbol, date.toISOString(), data.open[i], data.high[i], data.low[i], data.close[i], data.volume[i]
//       ]);
//     }
//     await client.query('COMMIT');
//     console.log(`🎉 [SUCCESS] Exact OHLC SPOT Data saved for [${symbol}]!`);
//   } catch (error) {
//     await client.query('ROLLBACK');
//     console.error(`❌ SPOT DB Error:`, error.message);
//   } finally {
//     client.release();
//   }
// }

// async function fetchSpotData(securityId, symbol, fromDate, toDate) {
//   console.log(`\n🚀 Fetching EXACT INTRADAY SPOT data for: ${symbol}...`);
//   try {
//     const payload = { 
//         securityId: securityId, 
//         exchangeSegment: "IDX_I", 
//         instrument: "INDEX", 
//         interval: "1", 
//         fromDate: fromDate, 
//         toDate: toDate 
//     };
//     const response = await axios.post(SPOT_API_URL, payload, { headers });
    
//     // 🎯 THE FIX: Handle Dhan API nested structure safely
//     const resData = response.data.data || response.data;

//     if (resData && resData.timestamp && resData.timestamp.length > 0) {
//         await saveSpotToDatabase(symbol, resData);
//     } else {
//         console.log(`⚠️ No spot data received from Dhan. API Response:`, JSON.stringify(response.data).substring(0, 150) + "...");
//     }
//   } catch (error) {
//     console.error(`❌ Spot Fetch Failed:`, error.message);
//   }
// }

// // ==========================================
// // 🚦 MAIN EXECUTION
// // ==========================================
// async function runScraper() {
//   console.log("--------------------------------------------------");
//   console.log("⚡ SMART TRADER EOD SYNCER STARTED (SPOT ONLY) ⚡");
//   console.log("--------------------------------------------------");
  
//   // 🎯 THE FIX: Changed to a Weekday (June 5, 2026 is Friday). June 6 was Saturday!
//   const syncDate = "2026-05-01"; 
  
//   const fromTime = `${syncDate} 09:15:00`;
//   const toTime = `${syncDate} 15:30:00`;

//   await fetchSpotData("13", "NIFTY", fromTime, toTime);

//   console.log("--------------------------------------------------");
//   console.log("✅ SPOT Data Synced. All tasks completed. Exiting...");
//   process.exit();
// }

// runScraper();