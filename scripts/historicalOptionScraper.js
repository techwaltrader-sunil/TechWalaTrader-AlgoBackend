// // require('dotenv').config({ path: '../.env' }); // Apne .env ka sahi path check kar lena
// const axios = require('axios');
// const { pool } = require('../config/postgres');
// // Ensure path is correct for your expiryCalculator
// const { getNearestExpiryString } = require('../engine/utils/expiryCalculator'); 

// const CLIENT_ID = "1103238744";
// const ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJ1c2VyUmVnaW9uIjoiUjEiLCJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzg3NTQzMjg5LCJpYXQiOjE3ODc0NTY4ODksInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTAzMjM4NzQ0In0.JdAoZsdLBv3Ie9_IrdYASQwtGa2vCoIbYE9CrQlju5N4qjoHDiRj3GSfM0SzkWTqAKFWeaxcMOB8HAEwk53i6w";


// // 🎯 CONFIGURATION
// // const ACCESS_TOKEN = process.env.DHAN_ACCESS_TOKEN;
// // const CLIENT_ID = process.env.DHAN_CLIENT_ID;
// const TARGET_DATE = '2026-06-05'; // Jis din ka data chahiye wo yahan daalo
// const SYMBOL = 'NIFTY';

// // Helper: "Upcoming EXP 18AUG26" ko "2026-08-18" me badalne ke liye
// function parseExpiryToDate(expStr) {
//     const parts = expStr.split(' ');
//     const datePart = parts[parts.length - 1]; // "18AUG26"
    
//     const day = datePart.substring(0, 2);
//     const monthStr = datePart.substring(2, 5);
//     const yearStr = "20" + datePart.substring(5, 7);
    
//     const months = { JAN:"01", FEB:"02", MAR:"03", APR:"04", MAY:"05", JUN:"06", JUL:"07", AUG:"08", SEP:"09", OCT:"10", NOV:"11", DEC:"12" };
//     return `${yearStr}-${months[monthStr]}-${day}`;
// }

// // 🎯 STEP 1: Subah 9:15 ka ATM Strike Nikalna
// async function getAtmStrikeAtSOD(dateStr) {
//   const client = await pool.connect();
//     try {
//         // Exact time ke bajaye, us din ki sabse pehli candle uthayenge
//         const query = `
//             SELECT open, timestamp FROM historical_candles 
//             WHERE symbol = $1 AND timestamp::date = $2 
//             ORDER BY timestamp ASC 
//             LIMIT 1
//         `;
//         const res = await pool.query(query, [SYMBOL, dateStr]);
        
//         if (res.rows.length === 0) throw new Error(`Spot data missing in historical_candles for date ${dateStr}`);
        
//         const spot = parseFloat(res.rows[0].open);
//         console.log(`🌅 First candle found at: ${res.rows[0].timestamp}`);
        
//         return Math.round(spot / 50) * 50; // NIFTY ka ATM 50 ke multiple me hota hai
//     } catch (err) {
//         console.error("❌ Error fetching ATM Strike:", err.message);
//         process.exit(1);
//     }
// }

// // 🎯 MAIN ENGINE
// async function fetchAndSaveHistoricalOptions() {
//     console.log(`\n🚀 STARTING HISTORICAL OPTION SCRAPER FOR: ${TARGET_DATE}\n`);

//     try {
//         // 1. Get Correct Expiry Date using your Smart Engine
//         const expString = getNearestExpiryString(TARGET_DATE, SYMBOL, "WEEKLY");
//         const expiryDate = parseExpiryToDate(expString);
//         console.log(`📅 Calculated Safe Expiry: ${expiryDate} (Engine Output: ${expString})`);

//         // 2. Get Morning ATM Strike
//         const atmStrike = await getAtmStrikeAtSOD(TARGET_DATE);
//         console.log(`🎯 ATM Strike Fixed at 09:15: ${atmStrike}\n`);

//         const optionTypes = ['CALL', 'PUT'];
//         const offsets = [];
//         for (let i = -10; i <= 10; i++) offsets.push(i); // ATM-10 se ATM+10 (21 Strikes)

//         // 3. Loop through CE & PE and all 21 Strikes
//         for (const type of optionTypes) {
//             for (const offset of offsets) {
//                 let strikeStr = "ATM";
//                 if (offset > 0) strikeStr = `ATM+${offset}`;
//                 if (offset < 0) strikeStr = `ATM${offset}`; // negative sign already included in i

//                 console.log(`📡 Fetching ${type} data for ${strikeStr}...`);

//                 const payload = {
//                     exchangeSegment: "NSE_FNO",
//                     interval: "1",
//                     securityId: "13", // 13 is NIFTY 50
//                     instrument: "OPTIDX",
//                     expiryFlag: "WEEK", 
//                     expiryCode: 1, // 0 = Current Nearest Expiry
//                     strike: strikeStr,
//                     drvOptionType: type,
//                     requiredData: ["open", "high", "low", "close", "iv", "volume", "strike", "oi", "spot"],
//                     fromDate: TARGET_DATE,
//                     toDate: TARGET_DATE
//                 };

//                 const response = await axios.post('https://api.dhan.co/v2/charts/rollingoption', payload, {
//                     headers: {
//                         'access-token': ACCESS_TOKEN,
//                         'client-id': CLIENT_ID,
//                         'Content-Type': 'application/json',
//                         'Accept': 'application/json'
//                     }
//                 });

//                 const resData = response.data.data;
//                 const optKey = type === 'CALL' ? 'ce' : 'pe';
//                 const seriesData = resData[optKey];

//                 if (!seriesData || !seriesData.timestamp || seriesData.timestamp.length === 0) {
//                     console.log(`⚠️ No data found for ${strikeStr} ${type} on Dhan API.`);
//                     continue;
//                 }

//                 // 4. Prepare Batch Insert Query
//                 const values = [];
//                 const placeholders = [];
//                 let paramIdx = 1;

//                 for (let i = 0; i < seriesData.timestamp.length; i++) {
//                     const ts = new Date(seriesData.timestamp[i] * 1000).toISOString(); 
                    
//                     // Agar Dhan api exact strike nahi deta to hum apna fallback strike banayenge
//                     const actualStrike = seriesData.strike[i] || (atmStrike + (offset * 50)); 
                    
//                     values.push(
//                         SYMBOL,
//                         actualStrike,
//                         type === 'CALL' ? 'CE' : 'PE',
//                         expiryDate,
//                         ts,
//                         seriesData.close[i] || 0,
//                         seriesData.volume[i] || 0,
//                         seriesData.oi[i] || 0,
//                         seriesData.iv[i] || 0,
//                         0, 0, 0, 0, // Greeks ko default 0 set kiya (Delta, Theta, Gamma, Vega)
//                         '00000' // Security ID (Placeholder)
//                     );

//                     const rowPlaceholders = [];
//                     for(let j = 0; j < 14; j++) {
//                         rowPlaceholders.push(`$${paramIdx++}`);
//                     }
//                     placeholders.push(`(${rowPlaceholders.join(',')})`);
//                 }

//                 // 5. Fire Insert Query to PostgreSQL
//                 if (values.length > 0) {
//                     const query = `
//                         INSERT INTO option_chain_data 
//                         (instrument, strike, option_type, expiry_date, timestamp, close, volume, oi, iv, delta, theta, gamma, vega, security_id) 
//                         VALUES ${placeholders.join(',')}
//                     `;
//                     await pool.query(query, values);
//                     console.log(`✅ Saved ${seriesData.timestamp.length} rows for ${strikeStr} ${type}`);
//                 }
                
//                 // Dhan API ko saans lene ke liye 0.5 second ka delay (Rate Limit se bachne ke liye)
//                 await new Promise(resolve => setTimeout(resolve, 500));
//             }
//         }

//         console.log('\n🎉 ALL DONE! Historical Option Chain Data successfully injected into PostgreSQL!');
//         process.exit(0);

//     } catch (error) {
//         console.error('\n❌ CRITICAL ERROR IN SCRAPER:', error?.response?.data || error.message);
//         process.exit(1);
//     }
// }

// // Start The Engine
// fetchAndSaveHistoricalOptions();






// // require('dotenv').config({ path: '../.env' }); 
// const axios = require('axios');
// const { pool } = require('../config/postgres');
// const { getNearestExpiryString } = require('../engine/utils/expiryCalculator'); 

// const CLIENT_ID = "1103238744";
// const ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJ1c2VyUmVnaW9uIjoiUjEiLCJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzg3NTQzMjg5LCJpYXQiOjE3ODc0NTY4ODksInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTAzMjM4NzQ0In0.JdAoZsdLBv3Ie9_IrdYASQwtGa2vCoIbYE9CrQlju5N4qjoHDiRj3GSfM0SzkWTqAKFWeaxcMOB8HAEwk53i6w";

// const TARGET_DATE = '2026-08-19'; // Jis din ka data chahiye wo yahan daalo
// const SYMBOL = 'NIFTY';
// const NUM_EXPIRIES_TO_FETCH = 3; // 🎯 Kitni expiry chahiye? (3 = Current, Next, Far Week)

// // Helper: "Upcoming EXP 18AUG26" ko "2026-08-18" me badalne ke liye
// function parseExpiryToDate(expStr) {
//     const parts = expStr.split(' ');
//     const datePart = parts[parts.length - 1]; 
    
//     const day = datePart.substring(0, 2);
//     const monthStr = datePart.substring(2, 5);
//     const yearStr = "20" + datePart.substring(5, 7);
    
//     const months = { JAN:"01", FEB:"02", MAR:"03", APR:"04", MAY:"05", JUN:"06", JUL:"07", AUG:"08", SEP:"09", OCT:"10", NOV:"11", DEC:"12" };
//     return `${yearStr}-${months[monthStr]}-${day}`;
// }

// // 🎯 STEP 1: Subah 9:15 ka ATM Strike Nikalna
// async function getAtmStrikeAtSOD(dateStr) {
//     const client = await pool.connect();
//     try {
//         const query = `
//             SELECT open, timestamp FROM historical_candles 
//             WHERE symbol = $1 AND timestamp::date = $2 
//             ORDER BY timestamp ASC 
//             LIMIT 1
//         `;
//         const res = await pool.query(query, [SYMBOL, dateStr]);
        
//         if (res.rows.length === 0) throw new Error(`Spot data missing in historical_candles for date ${dateStr}`);
        
//         const spot = parseFloat(res.rows[0].open);
//         console.log(`🌅 First candle found at: ${res.rows[0].timestamp}`);
//         client.release();
//         return Math.round(spot / 50) * 50; 
//     } catch (err) {
//         console.error("❌ Error fetching ATM Strike:", err.message);
//         client.release();
//         process.exit(1);
//     }
// }

// // 🎯 MAIN ENGINE
// async function fetchAndSaveHistoricalOptions() {
//     console.log(`\n🚀 STARTING HISTORICAL OPTION SCRAPER FOR: ${TARGET_DATE}\n`);

//     try {
//         // 1. Get Morning ATM Strike
//         const atmStrike = await getAtmStrikeAtSOD(TARGET_DATE);
//         console.log(`🎯 ATM Strike Fixed at 09:15: ${atmStrike}\n`);

//         // 🎯 2. NAYA LOGIC: Agli 3 Expiries Calculate karna
//         const expiriesList = [];
//         let currentSearchDate = new Date(TARGET_DATE);

//         for (let i = 0; i < NUM_EXPIRIES_TO_FETCH; i++) {
//             const targetStr = currentSearchDate.toISOString().split('T')[0];
//             const expString = getNearestExpiryString(targetStr, SYMBOL, "WEEKLY");
//             const expiryDate = parseExpiryToDate(expString);

//             expiriesList.push({
//                 expiryCode: i + 1,           // Dhan API: 0 = Nearest, 1 = Next, 2 = Far
//                 expiryDate: expiryDate,  // DB me save karne ke liye
//                 expString: expString
//             });

//             // Agli expiry nikalne ke liye engine ko push karna (Found expiry me 2 din jod do taaki weekend cross ho jaye)
//             let nextExp = new Date(expiryDate);
//             nextExp.setDate(nextExp.getDate() + 2);
//             currentSearchDate = nextExp;
//         }

//         console.table(expiriesList); // Console me teeno dates print hongi check karne ke liye

//         const optionTypes = ['CALL', 'PUT'];
//         const offsets = [];
//         for (let i = -10; i <= 10; i++) offsets.push(i); // ATM-10 se ATM+10 (21 Strikes)

//         // 🎯 3. MAIN LOOP: Har Expiry ke liye loop chalega
//         for (const exp of expiriesList) {
//             console.log(`\n=============================================================`);
//             console.log(`🔥 DOWNLOADING DATA FOR EXPIRY: ${exp.expiryDate} (Code: ${exp.expiryCode})`);
//             console.log(`=============================================================\n`);

//             for (const type of optionTypes) {
//                 for (const offset of offsets) {
//                         let strikeStr = "ATM";
//                         if (offset > 0) strikeStr = `ATM+${offset}`;
//                         if (offset < 0) strikeStr = `ATM${offset}`; 

//                         console.log(`📡 Fetching ${type} data for ${strikeStr}...`);

//                         const payload = {
//                             exchangeSegment: "NSE_FNO",
//                             interval: "1",
//                             securityId: "13", 
//                             instrument: "OPTIDX",
//                             expiryFlag: "WEEK", 
//                             expiryCode: exp.expiryCode, 
//                             strike: strikeStr,
//                             drvOptionType: type,
//                             requiredData: ["open", "high", "low", "close", "iv", "volume", "strike", "oi", "spot"],
//                             fromDate: TARGET_DATE,
//                             toDate: TARGET_DATE
//                         };

//                         // 🎯 THE FIX: Naya Bulletproof Try-Catch Block
//                         try {
//                             const response = await axios.post('https://api.dhan.co/v2/charts/rollingoption', payload, {
//                                 headers: {
//                                     'access-token': ACCESS_TOKEN,
//                                     'client-id': CLIENT_ID,
//                                     'Content-Type': 'application/json',
//                                     'Accept': 'application/json'
//                                 },
//                                 timeout: 25000 // 🎯 Timeout 25 seconds kar diya gaya hai
//                             });

//                             const resData = response.data.data;
//                             const optKey = type === 'CALL' ? 'ce' : 'pe';
//                             const seriesData = resData ? resData[optKey] : null;

//                             if (!seriesData || !seriesData.timestamp || seriesData.timestamp.length === 0) {
//                                 console.log(`⚠️ No data found for ${strikeStr} ${type} on Dhan API.`);
//                             } else {
//                                 // 4. Prepare Batch Insert Query
//                                 const values = [];
//                                 const placeholders = [];
//                                 let paramIdx = 1;

//                                 for (let i = 0; i < seriesData.timestamp.length; i++) {
//                                     const ts = new Date(seriesData.timestamp[i] * 1000).toISOString(); 
//                                     const actualStrike = seriesData.strike[i] || (atmStrike + (offset * 50)); 
                                    
//                                     values.push(
//                                         SYMBOL, actualStrike, type === 'CALL' ? 'CE' : 'PE',
//                                         exp.expiryDate, ts,
//                                         seriesData.close[i] || 0, seriesData.volume[i] || 0,
//                                         seriesData.oi[i] || 0, seriesData.iv[i] || 0,
//                                         0, 0, 0, 0, '00000' 
//                                     );

//                                     const rowPlaceholders = [];
//                                     for(let j = 0; j < 14; j++) {
//                                         rowPlaceholders.push(`$${paramIdx++}`);
//                                     }
//                                     placeholders.push(`(${rowPlaceholders.join(',')})`);
//                                 }

//                                 // 5. Fire Insert Query to PostgreSQL
//                                 if (values.length > 0) {
//                                     // 🎯 ON CONFLICT DO NOTHING lagaya gaya hai
//                                     const query = `
//                                         INSERT INTO option_chain_data 
//                                         (instrument, strike, option_type, expiry_date, timestamp, close, volume, oi, iv, delta, theta, gamma, vega, security_id) 
//                                         VALUES ${placeholders.join(',')}
//                                         ON CONFLICT ON CONSTRAINT options_candles_instrument_strike_option_type_expiry_date_t_key DO NOTHING
//                                     `;
//                                     await pool.query(query, values);
//                                     console.log(`✅ Saved ${seriesData.timestamp.length} rows for ${strikeStr} ${type}`);
//                                 }
//                             }
//                         } catch (apiError) {
//                             console.log(`❌ Skipped ${strikeStr} ${type} due to API Error: ${apiError.message}`);
//                         }
                        
//                         // 🎯 Delay badhakar 2000ms (2 seconds) kar diya gaya hai
//                         await new Promise(resolve => setTimeout(resolve, 2000));
//                     }
//             }
//         }

//         console.log('\n🎉 ALL DONE! Historical Option Chain Data successfully injected into PostgreSQL!');
//         process.exit(0);

//     } catch (error) {
//         console.error('\n❌ CRITICAL ERROR IN SCRAPER:', error?.response?.data || error.message);
//         process.exit(1);
//     }
// }

// fetchAndSaveHistoricalOptions();





// // require('dotenv').config({ path: '../.env' }); // Apne .env ka sahi path check kar lena
// const axios = require('axios');
// const { pool } = require('../config/postgres');
// // Ensure path is correct for your expiryCalculator
// const { getNearestExpiryString } = require('../engine/utils/expiryCalculator'); 

// const CLIENT_ID = "1103238744";
// const ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJ1c2VyUmVnaW9uIjoiUjEiLCJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzg3NTQzMjg5LCJpYXQiOjE3ODc0NTY4ODksInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTAzMjM4NzQ0In0.JdAoZsdLBv3Ie9_IrdYASQwtGa2vCoIbYE9CrQlju5N4qjoHDiRj3GSfM0SzkWTqAKFWeaxcMOB8HAEwk53i6w";


// // 🎯 CONFIGURATION
// // const ACCESS_TOKEN = process.env.DHAN_ACCESS_TOKEN;
// // const CLIENT_ID = process.env.DHAN_CLIENT_ID;
// const TARGET_DATE = '2026-08-19'; // Jis din ka data chahiye wo yahan daalo
// const SYMBOL = 'NIFTY';

// // Helper: "Upcoming EXP 18AUG26" ko "2026-08-18" me badalne ke liye
// function parseExpiryToDate(expStr) {
//     const parts = expStr.split(' ');
//     const datePart = parts[parts.length - 1]; // "18AUG26"
    
//     const day = datePart.substring(0, 2);
//     const monthStr = datePart.substring(2, 5);
//     const yearStr = "20" + datePart.substring(5, 7);
    
//     const months = { JAN:"01", FEB:"02", MAR:"03", APR:"04", MAY:"05", JUN:"06", JUL:"07", AUG:"08", SEP:"09", OCT:"10", NOV:"11", DEC:"12" };
//     return `${yearStr}-${months[monthStr]}-${day}`;
// }

// // 🎯 STEP 1: Subah 9:15 ka ATM Strike Nikalna
// async function getAtmStrikeAtSOD(dateStr) {
//   const client = await pool.connect();
//     try {
//         // Exact time ke bajaye, us din ki sabse pehli candle uthayenge
//         const query = `
//             SELECT open, timestamp FROM historical_candles 
//             WHERE symbol = $1 AND timestamp::date = $2 
//             ORDER BY timestamp ASC 
//             LIMIT 1
//         `;
//         const res = await pool.query(query, [SYMBOL, dateStr]);
        
//         if (res.rows.length === 0) throw new Error(`Spot data missing in historical_candles for date ${dateStr}`);
        
//         const spot = parseFloat(res.rows[0].open);
//         console.log(`🌅 First candle found at: ${res.rows[0].timestamp}`);
        
//         return Math.round(spot / 50) * 50; // NIFTY ka ATM 50 ke multiple me hota hai
//     } catch (err) {
//         console.error("❌ Error fetching ATM Strike:", err.message);
//         process.exit(1);
//     }
// }

// // 🎯 MAIN ENGINE
// async function fetchAndSaveHistoricalOptions() {
//     console.log(`\n🚀 STARTING HISTORICAL OPTION SCRAPER FOR: ${TARGET_DATE}\n`);

//     try {
//         // 1. Get Correct Expiry Date using your Smart Engine
//         const expString = getNearestExpiryString(TARGET_DATE, SYMBOL, "WEEKLY");
//         const expiryDate = parseExpiryToDate(expString);
//         console.log(`📅 Calculated Safe Expiry: ${expiryDate} (Engine Output: ${expString})`);

//         // 2. Get Morning ATM Strike
//         const atmStrike = await getAtmStrikeAtSOD(TARGET_DATE);
//         console.log(`🎯 ATM Strike Fixed at 09:15: ${atmStrike}\n`);

//         const optionTypes = ['CALL', 'PUT'];
//         const offsets = [];
//         for (let i = -10; i <= 10; i++) offsets.push(i); // ATM-10 se ATM+10 (21 Strikes)

//         // 3. Loop through CE & PE and all 21 Strikes
//         for (const type of optionTypes) {
//             for (const offset of offsets) {
//                 let strikeStr = "ATM";
//                 if (offset > 0) strikeStr = `ATM+${offset}`;
//                 if (offset < 0) strikeStr = `ATM${offset}`; // negative sign already included in i

//                 console.log(`📡 Fetching ${type} data for ${strikeStr}...`);

//                 const payload = {
//                     exchangeSegment: "NSE_FNO",
//                     interval: "1",
//                     securityId: "13", // 13 is NIFTY 50
//                     instrument: "OPTIDX",
//                     expiryFlag: "WEEK", 
//                     expiryCode: 1, // 0 = Current Nearest Expiry
//                     strike: strikeStr,
//                     drvOptionType: type,
//                     requiredData: ["open", "high", "low", "close", "iv", "volume", "strike", "oi", "spot"],
//                     fromDate: TARGET_DATE,
//                     toDate: TARGET_DATE
//                 };

//                 const response = await axios.post('https://api.dhan.co/v2/charts/rollingoption', payload, {
//                     headers: {
//                         'access-token': ACCESS_TOKEN,
//                         'client-id': CLIENT_ID,
//                         'Content-Type': 'application/json',
//                         'Accept': 'application/json'
//                     }
//                 });

//                 const resData = response.data.data;
//                 const optKey = type === 'CALL' ? 'ce' : 'pe';
//                 const seriesData = resData[optKey];

//                 if (!seriesData || !seriesData.timestamp || seriesData.timestamp.length === 0) {
//                     console.log(`⚠️ No data found for ${strikeStr} ${type} on Dhan API.`);
//                     continue;
//                 }

//                 // 4. Prepare Batch Insert Query
//                 const values = [];
//                 const placeholders = [];
//                 let paramIdx = 1;

//                 for (let i = 0; i < seriesData.timestamp.length; i++) {
//                     const ts = new Date(seriesData.timestamp[i] * 1000).toISOString(); 
                    
//                     // Agar Dhan api exact strike nahi deta to hum apna fallback strike banayenge
//                     const actualStrike = seriesData.strike[i] || (atmStrike + (offset * 50)); 
                    
//                     values.push(
//                         SYMBOL,
//                         actualStrike,
//                         type === 'CALL' ? 'CE' : 'PE',
//                         expiryDate,
//                         ts,
//                         seriesData.close[i] || 0,
//                         seriesData.volume[i] || 0,
//                         seriesData.oi[i] || 0,
//                         seriesData.iv[i] || 0,
//                         0, 0, 0, 0, // Greeks ko default 0 set kiya (Delta, Theta, Gamma, Vega)
//                         '00000' // Security ID (Placeholder)
//                     );

//                     const rowPlaceholders = [];
//                     for(let j = 0; j < 14; j++) {
//                         rowPlaceholders.push(`$${paramIdx++}`);
//                     }
//                     placeholders.push(`(${rowPlaceholders.join(',')})`);
//                 }

//                 // 5. Fire Insert Query to PostgreSQL
//                 if (values.length > 0) {
//                     const query = `
//                         INSERT INTO option_chain_data 
//                         (instrument, strike, option_type, expiry_date, timestamp, close, volume, oi, iv, delta, theta, gamma, vega, security_id) 
//                         VALUES ${placeholders.join(',')}
//                     `;
//                     await pool.query(query, values);
//                     console.log(`✅ Saved ${seriesData.timestamp.length} rows for ${strikeStr} ${type}`);
//                 }
                
//                 // Dhan API ko saans lene ke liye 0.5 second ka delay (Rate Limit se bachne ke liye)
//                 await new Promise(resolve => setTimeout(resolve, 500));
//             }
//         }

//         console.log('\n🎉 ALL DONE! Historical Option Chain Data successfully injected into PostgreSQL!');
//         process.exit(0);

//     } catch (error) {
//         console.error('\n❌ CRITICAL ERROR IN SCRAPER:', error?.response?.data || error.message);
//         process.exit(1);
//     }
// }

// // Start The Engine
// fetchAndSaveHistoricalOptions();






// // File: scripts/historicalOptionScraper.js
// require('dotenv').config({ path: '../.env' });
// const axios = require('axios');
// const { pool } = require('../config/postgres');
// const { isTradingHoliday } = require('../engine/utils/holidaysCalendar'); // Assuming you saved the holiday script here
// const { getNearestExpiryString } = require('../engine/utils/expiryCalculator');

// // 🎯 CONFIGURATION
// const CLIENT_ID = process.env.DHAN_CLIENT_ID || "1103238744";
// const ACCESS_TOKEN = process.env.DHAN_ACCESS_TOKEN || "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJ1c2VyUmVnaW9uIjoiUjEiLCJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzg5OTYxMzg2LCJpYXQiOjE3ODk4NzQ5ODYsInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTAzMjM4NzQ0In0.CQYL9FYML0X8cqRy4lmlM6-vnBosu0DNT8TjeMUHRCoHX1kIa7w_NRY7AIfBZ1ZTcUuhzg2aSvsldjVf-r68lQ";
// const SYMBOL = 'NIFTY';
// const FALLBACK_START_DATE = '2026-08-03'; // Agar DB khali ho toh yahan se shuru karega
// const END_DATE = '2026-08-03'; // Kahan tak ka data chahiye

// // Helper: "Upcoming EXP 18AUG26" ko "2026-08-18" me badalne ke liye
// function parseExpiryToDate(expStr) {
//     const parts = expStr.split(' ');
//     const datePart = parts[parts.length - 1]; 
//     const day = datePart.substring(0, 2);
//     const monthStr = datePart.substring(2, 5);
//     const yearStr = "20" + datePart.substring(5, 7);
//     const months = { JAN:"01", FEB:"02", MAR:"03", APR:"04", MAY:"05", JUN:"06", JUL:"07", AUG:"08", SEP:"09", OCT:"10", NOV:"11", DEC:"12" };
//     return `${yearStr}-${months[monthStr]}-${day}`;
// }

// // 🎯 STEP 1: Smart Resume - DB se last date nikalna
// async function getResumeDate() {
//     const client = await pool.connect();
//     try {
//         const query = `SELECT MAX(timestamp) as last_time FROM option_chain_data WHERE instrument = $1`;
//         const res = await client.query(query, [SYMBOL]);
//         if (res.rows[0].last_time) {
//             const lastDate = new Date(res.rows[0].last_time);
//             lastDate.setDate(lastDate.getDate() + 1); // Agle din se shuru karo
//             return lastDate;
//         }
//         return new Date(FALLBACK_START_DATE);
//     } finally {
//         client.release();
//     }
// }

// // 🎯 STEP 2: Subah 9:15 ka ATM Strike Nikalna
// async function getAtmStrikeAtSOD(dateStr) {
//     const client = await pool.connect();
//     try {
//         const query = `
//             SELECT open, timestamp FROM historical_candles 
//             WHERE symbol = $1 AND timestamp::date = $2 
//             ORDER BY timestamp ASC LIMIT 1
//         `;
//         const res = await client.query(query, [SYMBOL, dateStr]);
//         if (res.rows.length === 0) return null; // Spot data nahi mila
        
//         const spot = parseFloat(res.rows[0].open);
//         return Math.round(spot / 50) * 50; 
//     } catch (err) {
//         console.error(`❌ Error fetching ATM for ${dateStr}:`, err.message);
//         return null;
//     } finally {
//         client.release();
//     }
// }

// // 🎯 MAIN ENGINE: The Master Loop
// async function runHistoricalMiner() {
//     console.log(`\n🚀 STARTING BULK HISTORICAL MINER FOR ${SYMBOL}\n`);
    
//     let currentDate = new Date(FALLBACK_START_DATE);
//     const endDateObj = new Date(END_DATE);
    
//     console.log(`📡 Smart Resume Activated: Mining starting from ${currentDate.toISOString().split('T')[0]}`);

//     while (currentDate <= endDateObj) {
//         const targetDateStr = currentDate.toISOString().split('T')[0];

//         // 1. Holiday & Weekend Filter
//         if (isTradingHoliday(currentDate)) {
//             console.log(`⏩ Skipping ${targetDateStr} (Weekend/Holiday)`);
//             currentDate.setDate(currentDate.getDate() + 1);
//             continue;
//         }

//         // 2. Get ATM Strike
//         const atmStrike = await getAtmStrikeAtSOD(targetDateStr);
//         if (!atmStrike) {
//             console.log(`⚠️ Skipping ${targetDateStr}: No SPOT data found in historical_candles.`);
//             currentDate.setDate(currentDate.getDate() + 1);
//             continue;
//         }

//         console.log(`\n===========================================`);
//         console.log(`📅 Processing Date: ${targetDateStr} | ATM: ${atmStrike}`);
//         console.log(`===========================================`);

//         const optionTypes = ['CALL', 'PUT'];
//         const offsets = Array.from({length: 21}, (_, i) => i - 10); // -10 to +10
//         const expCodes = [1, 2, 3, 4, 5, 6]; // 6 Expiries ek sath


        

//         // 3. Loop Expiries, Types and Strikes
//         for (const expCode of expCodes) {
//             console.log(`➡️ Fetching Expiry Code: ${expCode} for ${targetDateStr}`);
            
//             for (const type of optionTypes) {
//                 for (const offset of offsets) {
//                     let strikeStr = offset === 0 ? "ATM" : offset > 0 ? `ATM+${offset}` : `ATM${offset}`;
                    
//                     const payload = {
//                         exchangeSegment: "NSE_FNO",
//                         interval: "1",
//                         securityId: "13",
//                         instrument: "OPTIDX",
//                         expiryFlag: "WEEK", 
//                         expiryCode: expCode,
//                         strike: strikeStr,
//                         drvOptionType: type,
//                         requiredData: ["open", "high", "low", "close", "iv", "volume", "strike", "oi", "spot"],
//                         fromDate: targetDateStr,
//                         toDate: targetDateStr
//                     };

//                     try {
//                         const response = await axios.post('https://api.dhan.co/v2/charts/rollingoption', payload, {
//                             headers: {
//                                 'access-token': ACCESS_TOKEN,
//                                 'client-id': CLIENT_ID,
//                                 'Content-Type': 'application/json',
//                                 'Accept': 'application/json'
//                             }
//                         });

//                         const resData = response.data.data;
//                         const optKey = type === 'CALL' ? 'ce' : 'pe';
//                         const seriesData = resData ? resData[optKey] : null;

//                         if (!seriesData || !seriesData.timestamp || seriesData.timestamp.length === 0) {
//                             // Data nahi mila toh next strike par jao (silent skip to keep console clean)
//                             await new Promise(resolve => setTimeout(resolve, 500));
//                             continue;
//                         }

//                         // Calculate Exact Expiry Date manually if Dhan doesn't provide it directly here
//                         // Note: For exact DB mapping, you might want to map expCode to actual expiry date using getNearestExpiryString
//                         // For now, using a placeholder string or calculation based on your engine
//                         const actualStrike = seriesData.strike[0] || (atmStrike + (offset * 50));
//                         const expiryDatePlaceholder = targetDateStr; // Replace with getNearestExpiryString logic if needed

//                         const values = [];
//                         const placeholders = [];
//                         let paramIdx = 1;

//                         for (let i = 0; i < seriesData.timestamp.length; i++) {
//                             const ts = new Date((seriesData.timestamp[i] + 60) * 1000).toISOString();
                            
//                             values.push(
//                                 SYMBOL, actualStrike, type === 'CALL' ? 'CE' : 'PE',
//                                 expiryDatePlaceholder, ts,
//                                 seriesData.close[i] || 0,
//                                 seriesData.volume[i] || 0,
//                                 seriesData.oi[i] || 0,
//                                 seriesData.iv[i] || 0,
//                                 0, 0, 0, 0, // Greeks
//                                 '00000' // Security ID
//                             );

//                             const rowPlaceholders = [];
//                             for(let j = 0; j < 14; j++) rowPlaceholders.push(`$${paramIdx++}`);
//                             placeholders.push(`(${rowPlaceholders.join(',')})`);
//                         }

//                         if (values.length > 0) {
//                             const query = `
//                                 INSERT INTO option_chain_data 
//                                 (instrument, strike, option_type, expiry_date, timestamp, close, volume, oi, iv, delta, theta, gamma, vega, security_id) 
//                                 VALUES ${placeholders.join(',')}
//                                 ON CONFLICT DO NOTHING
//                             `;
//                             await pool.query(query, values);
//                         }
                        
//                     } catch (err) {
//                         console.error(`❌ API Error on ${strikeStr} ${type}:`, err?.response?.data || err.message);
//                     }

//                     // Strict Throttling: 500ms delay to respect 5 requests/sec limit
//                     await new Promise(resolve => setTimeout(resolve, 500));
//                 }
//             }
//         }

//         console.log(`✅ Completed fetching all data for ${targetDateStr}.`);
//         console.log(`💤 Engine Sleeping for 10 seconds to cool down...`);
//         await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second safety buffer per day
        
//         currentDate.setDate(currentDate.getDate() + 1);
//     }

//     console.log('\n🎉 ALL DONE! Historical Engine has synced all requested dates.');
//     process.exit(0);
// }

// // Start The Engine
// runHistoricalMiner();




// // File: scripts/historicalOptionScraper.js
// require('dotenv').config({ path: '../.env' });
// const axios = require('axios');
// const { pool } = require('../config/postgres');
// const { isTradingHoliday } = require('../engine/utils/holidaysCalendar'); 
// const { getNearestExpiryString } = require('../engine/utils/expiryCalculator');

// // 🎯 CONFIGURATION
// const CLIENT_ID = process.env.DHAN_CLIENT_ID || "1103238744";
// const ACCESS_TOKEN = process.env.DHAN_ACCESS_TOKEN || "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJ1c2VyUmVnaW9uIjoiUjEiLCJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzg5OTYxMzg2LCJpYXQiOjE3ODk4NzQ5ODYsInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTAzMjM4NzQ0In0.CQYL9FYML0X8cqRy4lmlM6-vnBosu0DNT8TjeMUHRCoHX1kIa7w_NRY7AIfBZ1ZTcUuhzg2aSvsldjVf-r68lQ";
// const SYMBOL = 'NIFTY';
// const FALLBACK_START_DATE = '2026-08-03'; 
// const END_DATE = '2026-08-03'; 

// // Helper: "Upcoming EXP 18AUG26" ko "2026-08-18" me badalne ke liye
// function parseExpiryToDate(expStr) {
//     const parts = expStr.split(' ');
//     const datePart = parts[parts.length - 1]; 
//     const day = datePart.substring(0, 2);
//     const monthStr = datePart.substring(2, 5);
//     const yearStr = "20" + datePart.substring(5, 7);
//     const months = { JAN:"01", FEB:"02", MAR:"03", APR:"04", MAY:"05", JUN:"06", JUL:"07", AUG:"08", SEP:"09", OCT:"10", NOV:"11", DEC:"12" };
//     return `${yearStr}-${months[monthStr]}-${day}`;
// }

// // 🎯 STEP 1: Smart Resume
// async function getResumeDate() {
//     const client = await pool.connect();
//     try {
//         const query = `SELECT MAX(timestamp) as last_time FROM option_chain_data WHERE instrument = $1`;
//         const res = await client.query(query, [SYMBOL]);
//         if (res.rows[0].last_time) {
//             const lastDate = new Date(res.rows[0].last_time);
//             lastDate.setDate(lastDate.getDate() + 1); 
//             return lastDate;
//         }
//         return new Date(FALLBACK_START_DATE);
//     } finally {
//         client.release();
//     }
// }

// // 🎯 STEP 2: Subah 9:15 ka ATM Strike Nikalna
// async function getAtmStrikeAtSOD(dateStr) {
//     const client = await pool.connect();
//     try {
//         const query = `
//             SELECT open, timestamp FROM historical_candles 
//             WHERE symbol = $1 AND timestamp::date = $2 
//             ORDER BY timestamp ASC LIMIT 1
//         `;
//         const res = await client.query(query, [SYMBOL, dateStr]);
//         if (res.rows.length === 0) return null; 
        
//         const spot = parseFloat(res.rows[0].open);
//         return Math.round(spot / 50) * 50; 
//     } catch (err) {
//         console.error(`❌ Error fetching ATM for ${dateStr}:`, err.message);
//         return null;
//     } finally {
//         client.release();
//     }
// }

// // 🎯 MAIN ENGINE: The Master Loop
// async function runHistoricalMiner() {
//     console.log(`\n🚀 STARTING BULK HISTORICAL MINER FOR ${SYMBOL}\n`);
    
//     let currentDate = new Date(FALLBACK_START_DATE); // Testing ke liye fix date
//     const endDateObj = new Date(END_DATE);
    
//     console.log(`📡 Mining starting from ${currentDate.toISOString().split('T')[0]}`);

//     while (currentDate <= endDateObj) {
//         const targetDateStr = currentDate.toISOString().split('T')[0];

//         if (isTradingHoliday(currentDate)) {
//             console.log(`⏩ Skipping ${targetDateStr} (Weekend/Holiday)`);
//             currentDate.setDate(currentDate.getDate() + 1);
//             continue;
//         }

//         const atmStrike = await getAtmStrikeAtSOD(targetDateStr);
//         if (!atmStrike) {
//             console.log(`⚠️ Skipping ${targetDateStr}: No SPOT data found in historical_candles.`);
//             currentDate.setDate(currentDate.getDate() + 1);
//             continue;
//         }

//         console.log(`\n===========================================`);
//         console.log(`📅 Processing Date: ${targetDateStr} | ATM: ${atmStrike}`);
//         console.log(`===========================================`);

//         const optionTypes = ['CALL', 'PUT'];
//         const offsets = Array.from({length: 43}, (_, i) => i - 21);
        
//         // 1 se 6 tak ki expiries (API ke liye strings better hain)
//         const expCodes = ["1", "2", "3", "4", "5", "6"]; 

//         // 🎯 NAYA LOGIC: Nearest Expiry nikalna taaki baaki हफ़्तों ki date banayi ja sake
//         const nearestExpStr = getNearestExpiryString(targetDateStr, SYMBOL, "WEEKLY");
//         const baseExpiryDateStr = parseExpiryToDate(nearestExpStr);
//         const baseExpiryDate = new Date(baseExpiryDateStr);

//         // 3. Loop Expiries, Types and Strikes
//         for (let i = 0; i < expCodes.length; i++) {
//             const expCode = expCodes[i];
//             let actualExpiryDateStr;

//             if (expCode === "6") {
//                 // 🎯 6th Expiry = Next Month (NM) Expiry
//                 // Date ko 35 din aage badhakar wahan ki 'MONTHLY' expiry nikalenge
//                 let futureDate = new Date(targetDateStr);
//                 futureDate.setDate(futureDate.getDate() + 35);
//                 const futureDateStr = futureDate.toISOString().split('T')[0];

//                 const nmExpStr = getNearestExpiryString(futureDateStr, SYMBOL, "MONTHLY");
//                 actualExpiryDateStr = parseExpiryToDate(nmExpStr);
//             } else {
//                 // 🎯 Baki 1 se 5 tak normal Weekly (7-7 din add karke)
//                 let currentExpiryDate = new Date(baseExpiryDate);
//                 currentExpiryDate.setDate(currentExpiryDate.getDate() + (i * 7));

//                 // Holiday Filter for Expiry Day
//                 while (isTradingHoliday(currentExpiryDate) || currentExpiryDate.getDay() === 0 || currentExpiryDate.getDay() === 6) {
//                     currentExpiryDate.setDate(currentExpiryDate.getDate() - 1);
//                 }
//                 actualExpiryDateStr = currentExpiryDate.toISOString().split('T')[0];
//             }
            
//             console.log(`➡️ Fetching Expiry Code: ${expCode} (Actual Expiry: ${actualExpiryDateStr}) for ${targetDateStr}`);

//             for (const type of optionTypes) {
//                 for (const offset of offsets) {
//                     let strikeStr = offset === 0 ? "ATM" : offset > 0 ? `ATM+${offset}` : `ATM${offset}`;
                    
//                     const payload = {
//                         exchangeSegment: "NSE_FNO",
//                         interval: "1",
//                         securityId: "13",
//                         instrument: "OPTIDX",
//                         expiryFlag: "WEEK", 
//                         expiryCode: expCode,
//                         strike: strikeStr,
//                         drvOptionType: type,
//                         requiredData: ["open", "high", "low", "close", "iv", "volume", "strike", "oi", "spot"],
//                         fromDate: targetDateStr,
//                         toDate: targetDateStr
//                     };

//                     try {
//                         const response = await axios.post('https://api.dhan.co/v2/charts/rollingoption', payload, {
//                             headers: {
//                                 'access-token': ACCESS_TOKEN,
//                                 'client-id': CLIENT_ID,
//                                 'Content-Type': 'application/json',
//                                 'Accept': 'application/json'
//                             }
//                         });

//                         const resData = response.data.data;
//                         const optKey = type === 'CALL' ? 'ce' : 'pe';
//                         const seriesData = resData ? resData[optKey] : null;

//                         if (!seriesData || !seriesData.timestamp || seriesData.timestamp.length === 0) {
//                             await new Promise(resolve => setTimeout(resolve, 500));
//                             continue;
//                         }

//                         const actualStrike = seriesData.strike[0] || (atmStrike + (offset * 50));
                        
//                         const values = [];
//                         const placeholders = [];
//                         let paramIdx = 1;

//                         for (let k = 0; k < seriesData.timestamp.length; k++) {
//                             // 🎯 NAYA LOGIC: Timestamp ko 60 seconds aage badhana
//                             const ts = new Date((seriesData.timestamp[k] + 60) * 1000).toISOString();
                            
//                             values.push(
//                                 SYMBOL, actualStrike, type === 'CALL' ? 'CE' : 'PE',
//                                 actualExpiryDateStr, // 🎯 NAYA LOGIC: Sahi Expiry Date Database me jayegi
//                                 ts,
//                                 seriesData.close[k] || 0,
//                                 seriesData.volume[k] || 0,
//                                 seriesData.oi[k] || 0,
//                                 seriesData.iv[k] || 0,
//                                 0, 0, 0, 0, // Greeks
//                                 '00000' // Security ID
//                             );

//                             const rowPlaceholders = [];
//                             for(let j = 0; j < 14; j++) rowPlaceholders.push(`$${paramIdx++}`);
//                             placeholders.push(`(${rowPlaceholders.join(',')})`);
//                         }

//                         if (values.length > 0) {
//                             const query = `
//                                 INSERT INTO option_chain_data 
//                                 (instrument, strike, option_type, expiry_date, timestamp, close, volume, oi, iv, delta, theta, gamma, vega, security_id) 
//                                 VALUES ${placeholders.join(',')}
//                                 ON CONFLICT DO NOTHING
//                             `;
//                             await pool.query(query, values);
//                         }
                        
//                     } catch (err) {
//                         console.error(`❌ API Error on ${strikeStr} ${type}:`, err?.response?.data || err.message);
//                     }

//                     await new Promise(resolve => setTimeout(resolve, 500));
//                 }
//             }
//         }

//         console.log(`✅ Completed fetching all data for ${targetDateStr}.`);
//         console.log(`💤 Engine Sleeping for 10 seconds to cool down...`);
//         await new Promise(resolve => setTimeout(resolve, 10000)); 
        
//         currentDate.setDate(currentDate.getDate() + 1);
//     }

//     console.log('\n🎉 ALL DONE! Historical Engine has synced all requested dates.');
//     process.exit(0);
// }

// runHistoricalMiner();







// // File: scripts/historicalOptionScraper.js
// require('dotenv').config({ path: '../.env' });
// const axios = require('axios');
// const { pool } = require('../config/postgres');
// const { isTradingHoliday } = require('../engine/utils/holidaysCalendar'); 
// const { getNearestExpiryString } = require('../engine/utils/expiryCalculator');

// // 🎯 CONFIGURATION
// const CLIENT_ID = process.env.DHAN_CLIENT_ID || "1103238744";
// const ACCESS_TOKEN = process.env.DHAN_ACCESS_TOKEN || "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJ1c2VyUmVnaW9uIjoiUjEiLCJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzg5OTYxMzg2LCJpYXQiOjE3ODk4NzQ5ODYsInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTAzMjM4NzQ0In0.CQYL9FYML0X8cqRy4lmlM6-vnBosu0DNT8TjeMUHRCoHX1kIa7w_NRY7AIfBZ1ZTcUuhzg2aSvsldjVf-r68lQ";
// const SYMBOL = 'NIFTY';
// const FALLBACK_START_DATE = '2026-08-05'; 
// const END_DATE = '2026-08-05'; 

// // Helper: "Upcoming EXP 18AUG26" ko "2026-08-18" me badalne ke liye
// function parseExpiryToDate(expStr) {
//     const parts = expStr.split(' ');
//     const datePart = parts[parts.length - 1]; 
//     const day = datePart.substring(0, 2);
//     const monthStr = datePart.substring(2, 5);
//     const yearStr = "20" + datePart.substring(5, 7);
//     const months = { JAN:"01", FEB:"02", MAR:"03", APR:"04", MAY:"05", JUN:"06", JUL:"07", AUG:"08", SEP:"09", OCT:"10", NOV:"11", DEC:"12" };
//     return `${yearStr}-${months[monthStr]}-${day}`;
// }

// // 🎯 STEP 1: Smart Resume
// async function getResumeDate() {
//     const client = await pool.connect();
//     try {
//         const query = `SELECT MAX(timestamp) as last_time FROM option_chain_data WHERE instrument = $1`;
//         const res = await client.query(query, [SYMBOL]);
//         if (res.rows[0].last_time) {
//             const lastDate = new Date(res.rows[0].last_time);
//             lastDate.setDate(lastDate.getDate() + 1); 
//             return lastDate;
//         }
//         return new Date(FALLBACK_START_DATE);
//     } finally {
//         client.release();
//     }
// }

// // 🎯 STEP 2: Subah 9:15 ka ATM Strike Nikalna
// async function getAtmStrikeAtSOD(dateStr) {
//     const client = await pool.connect();
//     try {
//         const query = `
//             SELECT open, timestamp FROM historical_candles 
//             WHERE symbol = $1 AND timestamp::date = $2 
//             ORDER BY timestamp ASC LIMIT 1
//         `;
//         const res = await client.query(query, [SYMBOL, dateStr]);
//         if (res.rows.length === 0) return null; 
        
//         const spot = parseFloat(res.rows[0].open);
//         return Math.round(spot / 50) * 50; 
//     } catch (err) {
//         console.error(`❌ Error fetching ATM for ${dateStr}:`, err.message);
//         return null;
//     } finally {
//         client.release();
//     }
// }

// // 🎯 MAIN ENGINE: The Master Loop
// async function runHistoricalMiner() {
//     console.log(`\n🚀 STARTING BULK HISTORICAL MINER FOR ${SYMBOL}\n`);
    
//     let currentDate = new Date(FALLBACK_START_DATE); // Testing ke liye fix date
//     const endDateObj = new Date(END_DATE);
    
//     console.log(`📡 Mining starting from ${currentDate.toISOString().split('T')[0]}`);

//     while (currentDate <= endDateObj) {
//         const targetDateStr = currentDate.toISOString().split('T')[0];

//         if (isTradingHoliday(currentDate)) {
//             console.log(`⏩ Skipping ${targetDateStr} (Weekend/Holiday)`);
//             currentDate.setDate(currentDate.getDate() + 1);
//             continue;
//         }

//         const atmStrike = await getAtmStrikeAtSOD(targetDateStr);
//         if (!atmStrike) {
//             console.log(`⚠️ Skipping ${targetDateStr}: No SPOT data found in historical_candles.`);
//             currentDate.setDate(currentDate.getDate() + 1);
//             continue;
//         }

//         console.log(`\n===========================================`);
//         console.log(`📅 Processing Date: ${targetDateStr} | ATM: ${atmStrike}`);
//         console.log(`===========================================`);

//         const optionTypes = ['CALL', 'PUT'];
//         const offsets = Array.from({length: 21}, (_, i) => i - 10);
        
//         // // 1 se 6 tak ki expiries (API ke liye strings better hain)
//         // const expCodes = ["1", "2", "3", "4", "5", "6"]; 

//         // 🎯 NAYA LOGIC: Nearest Expiry nikalna taaki baaki हफ़्तों ki date banayi ja sake
//        function getFarMonthsTargetDates(targetDateStr) {
//             let d = new Date(targetDateStr);
//             let currentMonth = d.getMonth();
//             let dates = [];
            
//             // Next 3 mahine (Next, Far 1, Far 2)
//             dates.push(new Date(d.getFullYear(), currentMonth + 1, 15)); 
//             dates.push(new Date(d.getFullYear(), currentMonth + 2, 15)); 
//             dates.push(new Date(d.getFullYear(), currentMonth + 3, 15)); 
            
//             // NSE ke Quarterly mahine (Mar=2, Jun=5, Sep=8, Dec=11)
//             let qMonths = [2, 5, 8, 11];
//             let checkDate = new Date(d.getFullYear(), currentMonth + 4, 15);
//             let addedQs = 0;
//             while(addedQs < 2) { 
//                 if (qMonths.includes(checkDate.getMonth())) {
//                     dates.push(new Date(checkDate));
//                     addedQs++;
//                 }
//                 checkDate.setMonth(checkDate.getMonth() + 1);
//             }
//             return dates; // [NM, Far1, Far2(Q1), Q2, Q3]
//         }

//         const nearestExpStr = getNearestExpiryString(targetDateStr, SYMBOL, "WEEKLY");
//         const baseExpiryDateStr = parseExpiryToDate(nearestExpStr);
//         const baseExpiryDate = new Date(baseExpiryDateStr);

//         // 🎯 NAYA LOGIC: 6 Weeklies aur 2 Far Months ka task array
//         const fetchTasks = [
//             { flag: "WEEK", code: "1", type: "W", addDays: 0 },
//             // { flag: "WEEK", code: "2", type: "W", addDays: 7 },
//             // { flag: "WEEK", code: "3", type: "W", addDays: 14 },
//             // { flag: "WEEK", code: "4", type: "W", addDays: 21 },
//             // { flag: "WEEK", code: "5", type: "W", addDays: 28 },
//             // { flag: "WEEK", code: "6", type: "M_NM", addDays: 35 }, 
//             // { flag: "MONTH", code: "2", type: "M_FAR", dIdx: 1 }, // Far 1
//             // { flag: "MONTH", code: "3", type: "M_FAR", dIdx: 2 }  // Far 2
//         ];

//         let farMonthDates = getFarMonthsTargetDates(targetDateStr);

//         // 3. Loop Expiries, Types and Strikes
//         for (const task of fetchTasks) {
//             let actualExpiryDateStr;

//             if (task.type === "W") {
//                 let currentExpiryDate = new Date(baseExpiryDate);
//                 currentExpiryDate.setDate(currentExpiryDate.getDate() + task.addDays);
//                 while (isTradingHoliday(currentExpiryDate) || currentExpiryDate.getDay() === 0 || currentExpiryDate.getDay() === 6) {
//                     currentExpiryDate.setDate(currentExpiryDate.getDate() - 1);
//                 }
//                 actualExpiryDateStr = currentExpiryDate.toISOString().split('T')[0];
//             } 
//             else if (task.type === "M_NM") {
//                 let futureDateStr = farMonthDates[0].toISOString().split('T')[0];
//                 const nmExpStr = getNearestExpiryString(futureDateStr, SYMBOL, "MONTHLY");
//                 actualExpiryDateStr = parseExpiryToDate(nmExpStr);
//             } 
//             else if (task.type === "M_FAR") {
//                 let futureDateStr = farMonthDates[task.dIdx].toISOString().split('T')[0];
//                 const farExpStr = getNearestExpiryString(futureDateStr, SYMBOL, "MONTHLY");
//                 actualExpiryDateStr = parseExpiryToDate(farExpStr);
//             }

//             console.log(`➡️ Fetching ${task.flag} Expiry Code: ${task.code} (Actual: ${actualExpiryDateStr}) for ${targetDateStr}`);
            
//             for (const type of optionTypes) {
//                 for (const offset of offsets) {
//                     let strikeStr = offset === 0 ? "ATM" : offset > 0 ? `ATM+${offset}` : `ATM${offset}`;
                    
//                     const payload = {
//                         exchangeSegment: "NSE_FNO",
//                         interval: "1",
//                         securityId: "13",
//                         instrument: "OPTIDX",
//                         expiryFlag: task.flag, // 🎯 Yahan 'WEEK' ki jagah task.flag aayega
//                         expiryCode: task.code, // 🎯 Yahan expCode ki jagah task.code aayega
//                         strike: strikeStr,
//                         drvOptionType: type,
//                         requiredData: ["open", "high", "low", "close", "iv", "volume", "strike", "oi", "spot"],
//                         fromDate: targetDateStr,
//                         toDate: targetDateStr
//                     };

//                     try {
//                         const response = await axios.post('https://api.dhan.co/v2/charts/rollingoption', payload, {
//                             headers: {
//                                 'access-token': ACCESS_TOKEN,
//                                 'client-id': CLIENT_ID,
//                                 'Content-Type': 'application/json',
//                                 'Accept': 'application/json'
//                             }
//                         });

//                         const resData = response.data.data;
//                         const optKey = type === 'CALL' ? 'ce' : 'pe';
//                         const seriesData = resData ? resData[optKey] : null;

//                         if (!seriesData || !seriesData.timestamp || seriesData.timestamp.length === 0) {
//                             await new Promise(resolve => setTimeout(resolve, 500));
//                             continue;
//                         }

//                         const actualStrike = seriesData.strike[0] || (atmStrike + (offset * 50));
                        
//                         const values = [];
//                         const placeholders = [];
//                         let paramIdx = 1;

//                         for (let k = 0; k < seriesData.timestamp.length; k++) {
//                             // 🎯 NAYA LOGIC: Timestamp ko 60 seconds aage badhana
//                             const ts = new Date((seriesData.timestamp[k] + 60) * 1000).toISOString();
                            
//                             values.push(
//                                 SYMBOL, actualStrike, type === 'CALL' ? 'CE' : 'PE',
//                                 actualExpiryDateStr, // 🎯 NAYA LOGIC: Sahi Expiry Date Database me jayegi
//                                 ts,
//                                 seriesData.close[k] || 0,
//                                 seriesData.volume[k] || 0,
//                                 seriesData.oi[k] || 0,
//                                 seriesData.iv[k] || 0,
//                                 0, 0, 0, 0, // Greeks
//                                 '00000' // Security ID
//                             );

//                             const rowPlaceholders = [];
//                             for(let j = 0; j < 14; j++) rowPlaceholders.push(`$${paramIdx++}`);
//                             placeholders.push(`(${rowPlaceholders.join(',')})`);
//                         }

//                         if (values.length > 0) {
//                             const query = `
//                                 INSERT INTO option_chain_data 
//                                 (instrument, strike, option_type, expiry_date, timestamp, close, volume, oi, iv, delta, theta, gamma, vega, security_id) 
//                                 VALUES ${placeholders.join(',')}
//                                 ON CONFLICT DO NOTHING
//                             `;
//                             await pool.query(query, values);
//                         }
                        
//                     } catch (err) {
//                         console.error(`❌ API Error on ${strikeStr} ${type}:`, err?.response?.data || err.message);
//                     }

//                     await new Promise(resolve => setTimeout(resolve, 500));
//                 }
//             }
//         }

//         console.log(`✅ Completed fetching all data for ${targetDateStr}.`);
//         console.log(`💤 Engine Sleeping for 10 seconds to cool down...`);
//         await new Promise(resolve => setTimeout(resolve, 10000)); 
        
//         currentDate.setDate(currentDate.getDate() + 1);
//     }

//     console.log('\n🎉 ALL DONE! Historical Engine has synced all requested dates.');
//     process.exit(0);
// }

// runHistoricalMiner();






// File: scripts/historicalOptionScraper.js
require('dotenv').config({ path: '../.env' });
const axios = require('axios');
const { pool } = require('../config/postgres');
const { isTradingHoliday } = require('../engine/utils/holidaysCalendar'); 
const { getNearestExpiryString } = require('../engine/utils/expiryCalculator');

// 🎯 CONFIGURATION
const CLIENT_ID = process.env.DHAN_CLIENT_ID || "1103238744";
const ACCESS_TOKEN = process.env.DHAN_ACCESS_TOKEN || "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJ1c2VyUmVnaW9uIjoiUjEiLCJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzkwMDQ4MTQ5LCJpYXQiOjE3ODk5NjE3NDksInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTAzMjM4NzQ0In0.Ld-9D_KR-3KrHp0rhwXkwWevmLF-IKigigZ_i-Dn-zxlEAGQy_msA19j0hfeGsgBpKgu87ts7hpftHXwrkWwdQ";
const SYMBOL = 'NIFTY';
const FALLBACK_START_DATE = '2026-08-06'; 
const END_DATE = '2026-08-26'; 

// Helper: "Upcoming EXP 18AUG26" ko "2026-08-18" me badalne ke liye
function parseExpiryToDate(expStr) {
    const parts = expStr.split(' ');
    const datePart = parts[parts.length - 1]; 
    const day = datePart.substring(0, 2);
    const monthStr = datePart.substring(2, 5);
    const yearStr = "20" + datePart.substring(5, 7);
    const months = { JAN:"01", FEB:"02", MAR:"03", APR:"04", MAY:"05", JUN:"06", JUL:"07", AUG:"08", SEP:"09", OCT:"10", NOV:"11", DEC:"12" };
    return `${yearStr}-${months[monthStr]}-${day}`;
}

// 🎯 STEP 1: Smart Resume
async function getResumeDate() {
    const client = await pool.connect();
    try {
        const query = `SELECT MAX(timestamp) as last_time FROM option_chain_data WHERE instrument = $1`;
        const res = await client.query(query, [SYMBOL]);
        if (res.rows[0].last_time) {
            const lastDate = new Date(res.rows[0].last_time);
            lastDate.setDate(lastDate.getDate() + 1); 
            return lastDate;
        }
        return new Date(FALLBACK_START_DATE);
    } finally {
        client.release();
    }
}

// 🎯 STEP 2: Subah 9:15 ka ATM Strike Nikalna
async function getAtmStrikeAtSOD(dateStr) {
    const client = await pool.connect();
    try {
        const query = `
            SELECT open, timestamp FROM historical_candles 
            WHERE symbol = $1 AND timestamp::date = $2 
            ORDER BY timestamp ASC LIMIT 1
        `;
        const res = await client.query(query, [SYMBOL, dateStr]);
        if (res.rows.length === 0) return null; 
        
        const spot = parseFloat(res.rows[0].open);
        return Math.round(spot / 50) * 50; 
    } catch (err) {
        console.error(`❌ Error fetching ATM for ${dateStr}:`, err.message);
        return null;
    } finally {
        client.release();
    }
}

// 🎯 MAIN ENGINE: The Master Loop
async function runHistoricalMiner() {
    console.log(`\n🚀 STARTING BULK HISTORICAL MINER FOR ${SYMBOL}\n`);
    
    let currentDate = new Date(FALLBACK_START_DATE); // Testing ke liye fix date
    const endDateObj = new Date(END_DATE);
    
    console.log(`📡 Mining starting from ${currentDate.toISOString().split('T')[0]}`);

    while (currentDate <= endDateObj) {
        const targetDateStr = currentDate.toISOString().split('T')[0];

        if (isTradingHoliday(currentDate)) {
            console.log(`⏩ Skipping ${targetDateStr} (Weekend/Holiday)`);
            currentDate.setDate(currentDate.getDate() + 1);
            continue;
        }

        const atmStrike = await getAtmStrikeAtSOD(targetDateStr);
        if (!atmStrike) {
            console.log(`⚠️ Skipping ${targetDateStr}: No SPOT data found in historical_candles.`);
            currentDate.setDate(currentDate.getDate() + 1);
            continue;
        }

        console.log(`\n===========================================`);
        console.log(`📅 Processing Date: ${targetDateStr} | ATM: ${atmStrike}`);
        console.log(`===========================================`);

        const optionTypes = ['CALL', 'PUT'];
        const offsets = Array.from({length: 43}, (_, i) => i - 21);
        
        // // 1 se 6 tak ki expiries (API ke liye strings better hain)
        // const expCodes = ["1", "2", "3", "4", "5", "6"]; 

        // 🎯 NAYA LOGIC: Nearest Expiry nikalna taaki baaki हफ़्तों ki date banayi ja sake
       function getFarMonthsTargetDates(targetDateStr) {
            let d = new Date(targetDateStr);
            let currentMonth = d.getMonth();
            let dates = [];
            
            // Next 3 mahine (Next, Far 1, Far 2)
            dates.push(new Date(d.getFullYear(), currentMonth + 1, 15)); 
            dates.push(new Date(d.getFullYear(), currentMonth + 2, 15)); 
            dates.push(new Date(d.getFullYear(), currentMonth + 3, 15)); 
            
            // NSE ke Quarterly mahine (Mar=2, Jun=5, Sep=8, Dec=11)
            let qMonths = [2, 5, 8, 11];
            let checkDate = new Date(d.getFullYear(), currentMonth + 4, 15);
            let addedQs = 0;
            while(addedQs < 2) { 
                if (qMonths.includes(checkDate.getMonth())) {
                    dates.push(new Date(checkDate));
                    addedQs++;
                }
                checkDate.setMonth(checkDate.getMonth() + 1);
            }
            return dates; // [NM, Far1, Far2(Q1), Q2, Q3]
        }

        const nearestExpStr = getNearestExpiryString(targetDateStr, SYMBOL, "WEEKLY");
        const baseExpiryDateStr = parseExpiryToDate(nearestExpStr);
        const baseExpiryDate = new Date(baseExpiryDateStr);

        // 🎯 NAYA LOGIC: 6 Weeklies aur 2 Far Months ka task array
        const fetchTasks = [
            { flag: "WEEK", code: "1", type: "W", addDays: 0 },
            { flag: "WEEK", code: "2", type: "W", addDays: 7 },
            { flag: "WEEK", code: "3", type: "W", addDays: 14 },
            { flag: "WEEK", code: "4", type: "W", addDays: 21 },
            { flag: "WEEK", code: "5", type: "W", addDays: 28 },
            { flag: "WEEK", code: "6", type: "M_NM", addDays: 35 }, 
            { flag: "MONTH", code: "2", type: "M_FAR", dIdx: 1 }, // Far 1
            { flag: "MONTH", code: "3", type: "M_FAR", dIdx: 2 }  // Far 2
        ];

        let farMonthDates = getFarMonthsTargetDates(targetDateStr);

        // 3. Loop Expiries, Types and Strikes
        for (const task of fetchTasks) {
            let actualExpiryDateStr;

            if (task.type === "W") {
                let currentExpiryDate = new Date(baseExpiryDate);
                currentExpiryDate.setDate(currentExpiryDate.getDate() + task.addDays);
                while (isTradingHoliday(currentExpiryDate) || currentExpiryDate.getDay() === 0 || currentExpiryDate.getDay() === 6) {
                    currentExpiryDate.setDate(currentExpiryDate.getDate() - 1);
                }
                actualExpiryDateStr = currentExpiryDate.toISOString().split('T')[0];
            } 
            else if (task.type === "M_NM") {
                let futureDateStr = farMonthDates[0].toISOString().split('T')[0];
                const nmExpStr = getNearestExpiryString(futureDateStr, SYMBOL, "MONTHLY");
                actualExpiryDateStr = parseExpiryToDate(nmExpStr);
            } 
            else if (task.type === "M_FAR") {
                let futureDateStr = farMonthDates[task.dIdx].toISOString().split('T')[0];
                const farExpStr = getNearestExpiryString(futureDateStr, SYMBOL, "MONTHLY");
                actualExpiryDateStr = parseExpiryToDate(farExpStr);
            }

            console.log(`➡️ Fetching ${task.flag} Expiry Code: ${task.code} (Actual: ${actualExpiryDateStr}) for ${targetDateStr}`);
            
            for (const type of optionTypes) {
                for (const offset of offsets) {
                    let strikeStr = offset === 0 ? "ATM" : offset > 0 ? `ATM+${offset}` : `ATM${offset}`;
                    
                    const payload = {
                        exchangeSegment: "NSE_FNO",
                        interval: "1",
                        securityId: "13",
                        instrument: "OPTIDX",
                        expiryFlag: task.flag, // 🎯 Yahan 'WEEK' ki jagah task.flag aayega
                        expiryCode: task.code, // 🎯 Yahan expCode ki jagah task.code aayega
                        strike: strikeStr,
                        drvOptionType: type,
                        requiredData: ["open", "high", "low", "close", "iv", "volume", "strike", "oi", "spot"],
                        fromDate: targetDateStr,
                        toDate: targetDateStr
                    };

                    try {
                        const response = await axios.post('https://api.dhan.co/v2/charts/rollingoption', payload, {
                            headers: {
                                'access-token': ACCESS_TOKEN,
                                'client-id': CLIENT_ID,
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            }
                        });

                        const resData = response.data.data;
                        const optKey = type === 'CALL' ? 'ce' : 'pe';
                        const seriesData = resData ? resData[optKey] : null;

                        if (!seriesData || !seriesData.timestamp || seriesData.timestamp.length === 0) {
                            await new Promise(resolve => setTimeout(resolve, 500));
                            continue;
                        }

                        const actualStrike = seriesData.strike[0] || (atmStrike + (offset * 50));
                        
                        const values = [];
                        const placeholders = [];
                        let paramIdx = 1;

                       for (let k = 0; k < seriesData.timestamp.length; k++) {
                            // Timestamp ko 60 seconds aage badhana
                            // const ts = new Date((seriesData.timestamp[k] + 60) * 1000).toISOString();
                            const ts = new Date(seriesData.timestamp[k] * 1000).toISOString();
                            
                            // 🎯 THE BUG FIX: actualStrike ab loop ke andar calculate hoga!
                            // Ye Dhan ke API se har minute ka exact strike nikalega.
                            const actualStrike = (seriesData.strike && seriesData.strike[k]) 
                                                 ? seriesData.strike[k] 
                                                 : (atmStrike + (offset * 50));
                            
                            values.push(
                                SYMBOL, actualStrike, type === 'CALL' ? 'CE' : 'PE',
                                actualExpiryDateStr, 
                                ts,
                                seriesData.close[k] || 0,
                                seriesData.volume[k] || 0,
                                seriesData.oi[k] || 0,
                                seriesData.iv[k] || 0,
                                0, 0, 0, 0, // Greeks
                                '00000' // Security ID
                            );

                            const rowPlaceholders = [];
                            for(let j = 0; j < 14; j++) rowPlaceholders.push(`$${paramIdx++}`);
                            placeholders.push(`(${rowPlaceholders.join(',')})`);
                        }

                        if (values.length > 0) {
                            const query = `
                                INSERT INTO option_chain_data 
                                (instrument, strike, option_type, expiry_date, timestamp, close, volume, oi, iv, delta, theta, gamma, vega, security_id) 
                                VALUES ${placeholders.join(',')}
                                ON CONFLICT DO NOTHING
                            `;
                            await pool.query(query, values);
                        }
                        
                    } catch (err) {
                        console.error(`❌ API Error on ${strikeStr} ${type}:`, err?.response?.data || err.message);
                    }

                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }

        console.log(`✅ Completed fetching all data for ${targetDateStr}.`);
        console.log(`💤 Engine Sleeping for 10 seconds to cool down...`);
        await new Promise(resolve => setTimeout(resolve, 10000)); 
        
        currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log('\n🎉 ALL DONE! Historical Engine has synced all requested dates.');
    process.exit(0);
}

runHistoricalMiner();