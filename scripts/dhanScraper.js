// const axios = require('axios');
// const { pool } = require('../config/postgres'); // Postgres connection
// require('dotenv').config({ path: '../.env' }); // Env file load karna

// const DHAN_API_URL = 'https://api.dhan.co/v2/charts/intraday';

// // const clientId = process.env.DHAN_CLIENT_ID;
// // const accessToken = process.env.DHAN_ACCESS_TOKEN;

// const CLIENT_ID = "1103238744";
// const ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzg2ODUxNzg3LCJpYXQiOjE3ODY3NjUzODcsInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTAzMjM4NzQ0In0.hHPLqfYatVL3Sl-isgpkdANvFNQJHsubL_Z3M-bkfDepK7r2POiwESlh1rKEue1pKMP9cz_BbOL_hC72Ygs8Rw";


// async function runScraper() {
//   console.log("🚀 [SCRAPER STARTED] Connecting to Dhan API...");

//   try {
//     // Dhan API Payload (Example: NIFTY 50 Index 1-Min Data)
//     const payload = {
//       securityId: "13",
//       exchangeSegment: "IDX_I",
//       instrument: "INDEX",
//       interval: "1",              // 👈 Nayi line: 1-minute data ke liye
//       fromDate: "2026-08-01",
//       toDate: "2026-08-15"
//     };

//     const response = await axios.post(DHAN_API_URL, payload, {
//       headers: {
//         'access-token': ACCESS_TOKEN,
//         'client-id': CLIENT_ID,
//         'Content-Type': 'application/json'
//       }
//     });


//     // 👇 YAHAN PAR YE NAYI LINE JODNI HAI 👇
//     console.log("🔍 DHAN API KA ASLI JAWAB:", response.data);
//     // 👆 -------------------------------- 👆

//     const data = response.data;

//     // 👇 Yahan 'start_Time' ki jagah 'timestamp' kar diya hai 👇
//     if (!data || !data.timestamp || data.timestamp.length === 0) {
//       console.log("⚠️ No data received from API. Check dates or Rate Limits.");
//       process.exit();
//     }

//     console.log(`✅ Data Fetched! Total Candles: ${data.timestamp.length}`);
//     console.log("💾 Saving to Postgres Database (Local Hard Disk)...");

//     // Postgres me data insert karna
//     const client = await pool.connect();

//     for (let i = 0; i < data.timestamp.length; i++) {
//       // 👇 Yahan bhi 'timestamp' kar diya hai 👇
//       const timestampStr = new Date(data.timestamp[i] * 1000).toISOString();
//       const symbol = "NIFTY 50";
//       const open = data.open[i];
//       const high = data.high[i];
//       const low = data.low[i];
//       const close = data.close[i];
//       const volume = data.volume[i];

//       const query = `
//                 INSERT INTO historical_candles (symbol, timestamp, open, high, low, close, volume) 
//                 VALUES ($1, $2, $3, $4, $5, $6, $7)
//                 ON CONFLICT (symbol, timestamp) DO NOTHING;
//             `;

//       await client.query(query, [symbol, timestampStr, open, high, low, close, volume]);
//     }

//     client.release();
//     console.log("🎉 [SUCCESS] Data successfully saved to Postgres!");
//     process.exit();

//   } catch (error) {
//     console.error("❌ [ERROR] Scraper Failed:", error.response ? error.response.data : error.message);
//     process.exit(1);
//   }
// }

// // Script start karna
// runScraper();





// const axios = require('axios');
// const { pool } = require('../config/postgres'); // Postgres connection
// require('dotenv').config({ path: '../.env' }); // Env file load karna


// // const clientId = process.env.DHAN_CLIENT_ID;
// // const accessToken = process.env.DHAN_ACCESS_TOKEN;

// const CLIENT_ID = "1103238744";
// const ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzg2OTM4MjQ3LCJpYXQiOjE3ODY4NTE4NDcsInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTAzMjM4NzQ0In0.O7ZRvN2QCo3xC1FGdY5_khPlRuDuev9gMLq1z-oM73xxvXabxIWrgHTrjdBsJdOkV8PbQpfYaLLOq10sGrddew";


// // ==========================================
// // ⚙️ API ENDPOINTS & CREDENTIALS
// // ==========================================
// const SPOT_API_URL = 'https://api.dhan.co/v2/charts/intraday';
// const OPTION_API_URL = 'https://api.dhan.co/v2/charts/rollingoption';

// const headers = {
//   'access-token': ACCESS_TOKEN,  // 👈 Sahi variable mapping
//   'client-id': CLIENT_ID,        // 👈 Sahi variable mapping
//   'Content-Type': 'application/json'
// };

// // ==========================================
// // 💾 COMMON FUNCTION: SAVE TO POSTGRES
// // ==========================================
// async function saveToDatabase(symbol, data) {
//   if (!data || !data.timestamp || data.timestamp.length === 0) {
//     console.log(`⚠️ No data found for: ${symbol}`);
//     return;
//   }

//   console.log(`✅ Fetched ${data.timestamp.length} candles for [${symbol}]`);
//   const client = await pool.connect();

//   try {
//     for (let i = 0; i < data.timestamp.length; i++) {
//       const timestampStr = new Date(data.timestamp[i] * 1000).toISOString();

//       const query = `
//                 INSERT INTO historical_candles (symbol, timestamp, open, high, low, close, volume) 
//                 VALUES ($1, $2, $3, $4, $5, $6, $7)
//                 ON CONFLICT (symbol, timestamp) DO NOTHING;
//             `;

//       await client.query(query, [
//         symbol, timestampStr,
//         data.open[i], data.high[i], data.low[i], data.close[i], data.volume[i]
//       ]);
//     }
//     console.log(`🎉 [SUCCESS] Data saved for [${symbol}]!`);
//   } catch (error) {
//     console.error(`❌ DB Save Error for ${symbol}:`, error.message);
//   } finally {
//     client.release();
//   }
// }



// // ==========================================
// // 📈 1. SPOT DATA FETCH FUNCTION (NIFTY 50)
// // ==========================================
// async function fetchSpotData(securityId, symbol, fromDate, toDate) {
//   console.log(`🚀 Fetching SPOT data for: ${symbol}...`);
//   try {
//     const payload = {
//       securityId: securityId,
//       exchangeSegment: "IDX_I",
//       instrument: "INDEX",
//       interval: "1", // 1-minute candles
//       fromDate: fromDate,
//       toDate: toDate
//     };
//     const response = await axios.post(SPOT_API_URL, payload, { headers });
//     await saveToDatabase(symbol, response.data);
//   } catch (error) {
//     console.error(`❌ Spot Fetch Failed:`, error.response ? error.response.data : error.message);
//   }
// }


// // ==========================================
// // 🧠 2. DYNAMIC STRIKE RESOLVER (The Brain)
// // ==========================================
// async function getDynamicDhanLabel(targetStrike, optionType, fromDate) {
//     console.log(`🧠 Calculating dynamic Dhan label for ${targetStrike} ${optionType}...`);

//     try {
//         // Step 1: Chupke se API se us din ka 'ATM' fetch karo
//         const payload = {
//             exchangeSegment: "NSE_FNO",     
//             interval: "1",                
//             securityId: 13,                 
//             instrument: "OPTIDX",         
//             expiryFlag: "WEEK",             
//             expiryCode: 1,                  
//             drvOptionType: optionType,      
//             strike: "ATM",                 // 👈 Base nikalne ke liye
//             requiredData: ["strike"],
//             fromDate: fromDate,
//             toDate: fromDate
//         };

//         const response = await axios.post(OPTION_API_URL, payload, { headers });
//         const optKey = optionType === "CALL" ? "ce" : "pe";

//         if (!response.data.data || !response.data.data[optKey]) {
//             console.log("⚠️ Failed to find Base ATM.");
//             return "ATM"; // Fallback
//         }

//         // Step 2: Us din ki shuruat ka ATM Strike nikalo
//         const baseAtmStrike = response.data.data[optKey].strike[0]; 

//         // Step 3: Math (Difference aur Steps)
//         const stepSize = 50; // Nifty ka step size
//         const diff = targetStrike - baseAtmStrike;
//         const steps = Math.round(diff / stepSize);

//         if (steps === 0) return "ATM";

//         // Step 4: Rule ke hisab se ITM/OTM Generate karo
//         let finalLabel = "";
//         if (optionType === "CALL") {
//             // CALL: Target agar ATM se bada hai, to OTM
//             finalLabel = steps > 0 ? `OTM${steps}` : `ITM${Math.abs(steps)}`;
//         } else {
//             // PUT: Target agar ATM se bada hai, to ITM (Jaise 24400 PE > 24300 ATM)
//             finalLabel = steps > 0 ? `ITM${steps}` : `OTM${Math.abs(steps)}`;
//         }

//         console.log(`🎯 Base ATM: ${baseAtmStrike} | Target: ${targetStrike} -> Generated Label: [ ${finalLabel} ]`);
//         return finalLabel;

//     } catch (error) {
//         console.error("❌ Dynamic Label Fetch Failed:", error.message);
//         return "ATM"; // Fallback
//     }
// }

// // ==========================================
// // 📉 2. OPTIONS DATA FETCH FUNCTION (CE / PE)
// // ==========================================
// async function fetchOptionData(actualStrike, optionType, expiryLabel, fromDate, toDate) {

//     // 👇 SYMBOL humesha 24400 jaisa clean rahega DB ke liye
//     const symbol = `NIFTY 50 ${actualStrike} ${optionType === 'CALL' ? 'CE' : 'PE'} (EXP ${expiryLabel})`;

//     // 🧠 Yahan AUTOMATIC label generate hoga (e.g., "ITM2")
//     const apiStrikeLabel = await getDynamicDhanLabel(actualStrike, optionType, fromDate);

//     console.log(`🚀 Fetching OPTION data for: ${symbol} using label: ${apiStrikeLabel}...`);

//     try {
//         const payload = {
//             exchangeSegment: "NSE_FNO",     
//             interval: "1",                
//             securityId: 13,                 
//             instrument: "OPTIDX",         
//             expiryFlag: "WEEK",             
//             expiryCode: 1,                  
//             drvOptionType: optionType,      
//             strike: apiStrikeLabel,         // 👈 Automatically calculated label jayega
//             requiredData: ["open", "high", "low", "close", "volume", "strike"],
//             fromDate: fromDate,
//             toDate: toDate
//         };
//         const response = await axios.post(OPTION_API_URL, payload, { headers });

//         const apiData = response.data.data;
//         if (!apiData) return;

//         const optionKey = optionType === "CALL" ? "ce" : "pe";
//         const finalData = apiData[optionKey];

//         if (!finalData || !finalData.timestamp || finalData.timestamp.length === 0) return;

//         await saveToDatabase(symbol, finalData);
//     } catch (error) {
//         console.error(`❌ Option Fetch Failed:`, error.response ? error.response.data : error.message);
//     }
// }




// // ==========================================
// // 🚦 MAIN EXECUTION (YEAHAN SE CONTROL KAREIN)
// // ==========================================
// async function runScraper() {
//   console.log("-----------------------------------------");
//   console.log("⚡ SMART TRADER DATA DOWNLODER STARTED ⚡");
//   console.log("-----------------------------------------");

//   // 👇 JISKO FETCH KARNA HAI, USKO UNCOMMENT KAR DO 👇

//   // 1. NIFTY 50 SPOT DATA
//   // await fetchSpotData("13", "NIFTY 50", "2026-08-01", "2026-08-15");

//   // 2. NIFTY 50 OPTIONS DATA (Eg: 24050 PE for 14-JUL-26)
//   await fetchOptionData(24400, "PUT", "14JUL26", "2026-07-08", "2026-07-08");

//   console.log("-----------------------------------------");
//   console.log("✅ ALL TASKS COMPLETED. Exiting...");
//   process.exit();
// }

// // Start Script
// runScraper();











// const axios = require('axios');
// const { pool } = require('../config/postgres'); // Postgres connection
// // require('dotenv').config({ path: '../.env' }); // Env file load karna


// // const clientId = process.env.DHAN_CLIENT_ID;
// // const accessToken = process.env.DHAN_ACCESS_TOKEN;

// const CLIENT_ID = "1103238744";
// const ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzg2OTM4MjQ3LCJpYXQiOjE3ODY4NTE4NDcsInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTAzMjM4NzQ0In0.O7ZRvN2QCo3xC1FGdY5_khPlRuDuev9gMLq1z-oM73xxvXabxIWrgHTrjdBsJdOkV8PbQpfYaLLOq10sGrddew";


// // ==========================================
// // ⚙️ API ENDPOINTS & CREDENTIALS
// // ==========================================
// const SPOT_API_URL = 'https://api.dhan.co/v2/charts/intraday';
// const OPTION_API_URL = 'https://api.dhan.co/v2/charts/rollingoption';

// const headers = {
//   'access-token': ACCESS_TOKEN,  // 👈 Sahi variable mapping
//   'client-id': CLIENT_ID,        // 👈 Sahi variable mapping
//   'Content-Type': 'application/json'
// };

// // ==========================================
// // 💾 COMMON FUNCTION: SAVE TO POSTGRES
// // ==========================================
// async function saveToDatabase(symbol, data) {
//   if (!data || !data.timestamp || data.timestamp.length === 0) {
//     console.log(`⚠️ No data found for: ${symbol}`);
//     return;
//   }

//   console.log(`✅ Fetched ${data.timestamp.length} candles for [${symbol}]`);
//   const client = await pool.connect();

//   try {
//     for (let i = 0; i < data.timestamp.length; i++) {
//       const timestampStr = new Date(data.timestamp[i] * 1000).toISOString();

//       const query = `
//                 INSERT INTO historical_candles (symbol, timestamp, open, high, low, close, volume) 
//                 VALUES ($1, $2, $3, $4, $5, $6, $7)
//                 ON CONFLICT (symbol, timestamp) DO NOTHING;
//             `;

//       await client.query(query, [
//         symbol, timestampStr,
//         data.open[i], data.high[i], data.low[i], data.close[i], data.volume[i]
//       ]);
//     }
//     console.log(`🎉 [SUCCESS] Data saved for [${symbol}]!`);
//   } catch (error) {
//     console.error(`❌ DB Save Error for ${symbol}:`, error.message);
//   } finally {
//     client.release();
//   }
// }


// // ==========================================
// // 💾 NEW FUNCTION: SAVE OPTIONS DATA TO POSTGRES (EOD SYNCER)
// // ==========================================
// async function saveOptionToDatabase(instrument, strike, optionType, expiryDate, data) {
//   if (!data || !data.timestamp || data.timestamp.length === 0) return;

//   const client = await pool.connect();
//   try {
//     await client.query('BEGIN'); // Transaction start for faster execution

//     for (let i = 0; i < data.timestamp.length; i++) {
//       // ⏱️ Timestamp Normalization (Dhan ke time me seconds ko 00 karna taki Live se match ho)
//       let date = new Date(data.timestamp[i] * 1000);
//       date.setSeconds(0, 0);
//       const timestampStr = date.toISOString();

//       // Agar API ne OI nahi bheja to 0 save karo
//       const oiValue = (data.oi && data.oi[i]) ? data.oi[i] : 0;

//       // 🔥 THE MAGIC UPSERT QUERY
//       const query = `
//                 INSERT INTO options_candles 
//                 (instrument, strike, option_type, expiry_date, timestamp, open, high, low, close, volume, oi) 
//                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
//                 ON CONFLICT (instrument, strike, option_type, expiry_date, timestamp) 
//                 DO UPDATE SET 
//                     open = EXCLUDED.open,
//                     high = EXCLUDED.high,
//                     low = EXCLUDED.low,
//                     close = EXCLUDED.close,
//                     volume = EXCLUDED.volume,
//                     oi = EXCLUDED.oi;
//                 -- 🛑 NOTE: Humne yahan 'iv' aur 'greeks' ka naam nahi likha hai!
//                 -- Iska matlab agar live market ne IV save kiya tha, to wo bilkul safe rahega.
//             `;

//       await client.query(query, [
//         instrument, strike, optionType, expiryDate, timestampStr,
//         data.open[i], data.high[i], data.low[i], data.close[i], data.volume[i], oiValue
//       ]);
//     }

//     await client.query('COMMIT');
//     console.log(`🎉 [EOD SYNC SUCCESS] OHLC perfectly merged for [${instrument} ${strike} ${optionType}]!`);
//   } catch (error) {
//     await client.query('ROLLBACK');
//     console.error(`❌ DB Save Error:`, error.message);
//   } finally {
//     client.release();
//   }
// }


// // ==========================================
// // 📈 1. SPOT DATA FETCH FUNCTION (NIFTY 50)
// // ==========================================
// async function fetchSpotData(securityId, symbol, fromDate, toDate) {
//   console.log(`🚀 Fetching SPOT data for: ${symbol}...`);
//   try {
//     const payload = {
//       securityId: securityId,
//       exchangeSegment: "IDX_I",
//       instrument: "INDEX",
//       interval: "1", // 1-minute candles
//       fromDate: fromDate,
//       toDate: toDate
//     };
//     const response = await axios.post(SPOT_API_URL, payload, { headers });
//     await saveToDatabase(symbol, response.data);
//   } catch (error) {
//     console.error(`❌ Spot Fetch Failed:`, error.response ? error.response.data : error.message);
//   }
// }


// // ==========================================
// // 🧠 2. DYNAMIC STRIKE RESOLVER (The Brain)
// // ==========================================
// async function getDynamicDhanLabel(targetStrike, optionType, fromDate) {
//     console.log(`🧠 Calculating dynamic Dhan label for ${targetStrike} ${optionType}...`);

//     try {
//         const payload = {
//             exchangeSegment: "NSE_FNO",     
//             interval: "1",                
//             securityId: 13,                 
//             instrument: "OPTIDX",         
//             expiryFlag: "WEEK",             
//             expiryCode: 1,                  
//             drvOptionType: optionType,      
//             strike: "ATM",                 
//             requiredData: ["strike"],
//             fromDate: fromDate,
//             toDate: fromDate
//         };

//         const response = await axios.post(OPTION_API_URL, payload, { headers });
//         const optKey = optionType === "CALL" ? "ce" : "pe";

//         // 🛑 THE REAL FIX: Check agar array empty hai (length === 0) ya data missing hai
//         const optData = response.data?.data?.[optKey];
//         if (!optData || !optData.strike || optData.strike.length === 0) {
//             console.log(`⚠️ Dhan API returned Empty ATM Array for ${fromDate}. (Market Closed)`);
//             return null; // Yahan null bhejenge, NaN nahi banne denge
//         }

//         // Step 2: Us din ki shuruat ka ATM Strike nikalo
//         const baseAtmStrike = optData.strike[0]; 

//         // Ek aur safety shield
//         if (!baseAtmStrike) {
//             console.log(`⚠️ Base ATM strike is undefined.`);
//             return null;
//         }

//         // Step 3: Math (Difference aur Steps)
//         const stepSize = 50; 
//         const diff = targetStrike - baseAtmStrike;
//         const steps = Math.round(diff / stepSize);

//         if (steps === 0) return "ATM";

//         // Step 4: Rule ke hisab se ITM/OTM Generate karo
//         let finalLabel = "";
//         if (optionType === "CALL") {
//             finalLabel = steps > 0 ? `OTM${steps}` : `ITM${Math.abs(steps)}`;
//         } else {
//             finalLabel = steps > 0 ? `ITM${steps}` : `OTM${Math.abs(steps)}`;
//         }

//         console.log(`🎯 Base ATM: ${baseAtmStrike} | Target: ${targetStrike} -> Generated Label: [ ${finalLabel} ]`);
//         return finalLabel;

//     } catch (error) {
//         console.error("❌ Dynamic Label Fetch Failed:", error.message);
//         return null; 
//     }
// }

// // ==========================================
// // 📉 2. OPTIONS DATA FETCH FUNCTION (CE / PE)
// // ==========================================
// async function fetchOptionData(instrument, actualStrike, optionType, expiryDate, expiryLabel, fromDate, toDate) {

//   // 🧠 Dynamic label generate karna (e.g., "ITM2")
//   const apiStrikeLabel = await getDynamicDhanLabel(actualStrike, optionType, fromDate);

//   // 🛑 SAFETY SHIELD: Agar label nahi mila (Market closed), to skip kar do!
//   if (!apiStrikeLabel) {
//     console.log(`⏭️ Skipping ${instrument} ${actualStrike} ${optionType} due to missing ATM base.\n`);
//     return;
//   }

//   console.log(`🚀 Fetching OPTION data for: ${instrument} ${actualStrike} ${optionType} (Label: ${apiStrikeLabel})...`);

//   try {
//     const payload = {
//       exchangeSegment: "NSE_FNO",
//       interval: "1",
//       securityId: 13,
//       instrument: "OPTIDX",
//       expiryFlag: "WEEK",
//       expiryCode: 1,
//       drvOptionType: optionType,
//       strike: apiStrikeLabel,
//       // 👇 Yahan aakhiri me "oi" add kar diya
//       requiredData: ["open", "high", "low", "close", "volume", "strike", "oi"],
//       fromDate: fromDate,
//       toDate: toDate
//     };
//     const response = await axios.post(OPTION_API_URL, payload, { headers });

//     const apiData = response.data.data;
//     if (!apiData) return;

//     const optionKey = optionType === "CALL" ? "ce" : "pe";
//     const finalData = apiData[optionKey];

//     if (!finalData || !finalData.timestamp || finalData.timestamp.length === 0) return;

//     // 👇 YAHAN NAYA SAVE FUNCTION CALL HOGA
//     await saveOptionToDatabase(instrument, actualStrike, optionType, expiryDate, finalData);
//   } catch (error) {
//     console.error(`❌ Option Fetch Failed:`, error.response ? error.response.data : error.message);
//   }
// }




// // ==========================================
// // 🤖 THE SMART AUTO-LOOP SYNCER (NEW)
// // ==========================================
// async function syncAllRecordedStrikes(instrument, expiryDate, dhanExpiryLabel, targetDate) {
//   console.log(`\n🔍 Fetching unique strikes from Database for ${instrument} (${expiryDate})...`);

//   const client = await pool.connect();
//   let strikesToSync = [];

//   try {
//     // DB se sirf wahi strikes nikalo jo aaj Live Recorder ne save kiye hain
//     const res = await client.query(`
//             SELECT DISTINCT strike, option_type 
//             FROM options_candles 
//             WHERE instrument = $1 AND expiry_date = $2
//         `, [instrument, expiryDate]);

//     strikesToSync = res.rows; // [{strike: 24400, option_type: 'CE'}, ...]
//   } catch (err) {
//     console.error("❌ Failed to fetch strikes from DB:", err.message);
//     return;
//   } finally {
//     client.release();
//   }

//   if (strikesToSync.length === 0) {
//     console.log("⚠️ No recorded strikes found in DB to sync. Did the Live Recorder run today?");
//     return;
//   }

//   console.log(`📋 Found ${strikesToSync.length} active strikes in DB. Starting EOD Sync...`);

//   // Loop lagakar ek-ek strike ka data fetch aur sync karna
//   for (let i = 0; i < strikesToSync.length; i++) {
//     const { strike, option_type } = strikesToSync[i];

//     // Hamare DB me "CE" hai, Dhan ko "CALL" chahiye
//     const optTypeAPI = option_type === "CE" ? "CALL" : "PUT";

//     console.log(`\n⏳ [${i + 1}/${strikesToSync.length}] Syncing ${strike} ${option_type}...`);

//     await fetchOptionData(instrument, strike, optTypeAPI, expiryDate, dhanExpiryLabel, targetDate, targetDate);

//     // 🛑 RATE LIMIT SHIELD: Har API call ke baad 1 second (1000ms) ka aaram!
//     // Iske bina Dhan humara IP block kar dega!
//     await new Promise(resolve => setTimeout(resolve, 1000));
//   }

//   console.log(`\n🎉🎉 ALL ${strikesToSync.length} STRIKES SUCCESSFULLY SYNCED FOR EOD! 🎉🎉`);
// }


// // ==========================================
// // 🚦 MAIN EXECUTION (YEAHAN SE CONTROL KAREIN)
// // ==========================================
// async function runScraper() {
//   console.log("-----------------------------------------");
//   console.log("⚡ SMART TRADER EOD SYNCER STARTED ⚡");
//   console.log("-----------------------------------------");

//   // Ab hum ek-ek strike nahi, balki pura Auto-Syncer function call karenge:
//   // Parameters: (Instrument, DB Expiry Date, Dhan Expiry Label, Sync Date)
//   await syncAllRecordedStrikes("NIFTY", "2026-08-18", "18AUG26", "2026-08-12");

//   console.log("-----------------------------------------");
//   console.log("✅ ALL TASKS COMPLETED. Exiting...");
//   process.exit();
// }

// // Start Script
// runScraper();






// const axios = require('axios');
// const { pool } = require('../config/postgres'); // Postgres connection

// const CLIENT_ID = "1103238744";
// const ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzg2OTM4MjQ3LCJpYXQiOjE3ODY4NTE4NDcsInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTAzMjM4NzQ0In0.O7ZRvN2QCo3xC1FGdY5_khPlRuDuev9gMLq1z-oM73xxvXabxIWrgHTrjdBsJdOkV8PbQpfYaLLOq10sGrddew";

// // ==========================================
// // ⚙️ API ENDPOINTS & CREDENTIALS
// // ==========================================
// // Ab SPOT aur OPTION dono ke liye ek hi API use hogi (Standard Intraday API)
// const INTRADAY_API_URL = 'https://api.dhan.co/v2/charts/intraday';

// const headers = {
//   'access-token': ACCESS_TOKEN,
//   'client-id': CLIENT_ID,
//   'Content-Type': 'application/json'
// };


// // ==========================================
// // 💾 EOD SYNCER: SAVE OPTIONS OHLC TO POSTGRES
// // ==========================================
// async function saveOptionToDatabase(instrument, strike, optionType, expiryDate, data) {
//   if (!data || !data.timestamp || data.timestamp.length === 0) return;

//   const client = await pool.connect();
//   try {
//     await client.query('BEGIN'); 

//     for (let i = 0; i < data.timestamp.length; i++) {
//       // ⏱️ Timestamp Normalization
//       let date = new Date(data.timestamp[i] * 1000);
//       date.setSeconds(0, 0);
//       const timestampStr = date.toISOString();

//       // Dhan ki Intraday API me OI nahi aata, isliye 0 dal rahe hain naye row ke liye
//       const oiValue = (data.oi && data.oi[i]) ? data.oi[i] : 0;

//       // 🔥 THE MAGIC UPSERT QUERY (Security ID based)
//       const query = `
//         INSERT INTO options_candles 
//         (instrument, strike, option_type, expiry_date, timestamp, open, high, low, close, volume, oi) 
//         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
//         ON CONFLICT (instrument, strike, option_type, expiry_date, timestamp) 
//         DO UPDATE SET 
//             open = EXCLUDED.open,
//             high = EXCLUDED.high,
//             low = EXCLUDED.low,
//             close = EXCLUDED.close,
//             volume = EXCLUDED.volume;
//         -- 🛑 NOTE: Humne yahan UPDATE me 'oi', 'iv' aur 'greeks' ka naam nahi likha hai!
//         -- Yani EOD syncer sirf OHLCV update karega, Live 'fear/data' ekdum safe rahega!
//       `;

//       await client.query(query, [
//         instrument, strike, optionType, expiryDate, timestampStr,
//         data.open[i], data.high[i], data.low[i], data.close[i], data.volume[i], oiValue
//       ]);
//     }

//     await client.query('COMMIT');
//     console.log(`🎉 [EOD SYNC SUCCESS] Exact OHLC merged for [${instrument} ${strike} ${optionType}]!`);
//   } catch (error) {
//     await client.query('ROLLBACK');
//     console.error(`❌ DB Save Error:`, error.message);
//   } finally {
//     client.release();
//   }
// }


// // ==========================================
// // 📉 OPTIONS DATA FETCH FUNCTION (DIRECT SECURITY ID)
// // ==========================================
// async function fetchOptionData(instrument, strike, optionType, expiryDate, securityId, fromDate, toDate) {
//   console.log(`🚀 Fetching EXACT INTRADAY data for: ${instrument} ${strike} ${optionType} (Security ID: ${securityId})...`);

//   try {
//     const payload = {
//       securityId: securityId.toString(), // 👈 Direct ID use kar rahe hain
//       exchangeSegment: "NSE_FNO",
//       instrument: "OPTIDX",
//       interval: "1",
//       fromDate: fromDate,
//       toDate: toDate
//     };

//     // Ab rollingoption nahi, standard intraday API hit ho rahi hai
//     const response = await axios.post(INTRADAY_API_URL, payload, { headers });

//     const apiData = response.data.data;
//     if (!apiData || !apiData.timestamp || apiData.timestamp.length === 0) {
//       console.log(`⚠️ No data found from Dhan for ${strike} ${optionType}`);
//       return;
//     }

//     // Direct save, no object mapping needed!
//     await saveOptionToDatabase(instrument, strike, optionType, expiryDate, apiData);
//   } catch (error) {
//     console.error(`❌ Option Fetch Failed for ${strike}:`, error.response ? error.response.data : error.message);
//   }
// }


// // ==========================================
// // 🤖 THE SMART AUTO-LOOP SYNCER
// // ==========================================
// async function syncAllRecordedStrikes(instrument, expiryDate, targetDate) {
//   console.log(`\n🔍 Fetching unique strikes from Database for ${instrument} (${expiryDate})...`);

//   const client = await pool.connect();
//   let strikesToSync = [];

//   try {
//     // 👇 DB se strike ke sath security_id bhi nikal rahe hain!
//     const res = await client.query(`
//       SELECT DISTINCT strike, option_type, security_id 
//       FROM options_candles 
//       WHERE instrument = $1 AND expiry_date = $2 AND security_id IS NOT NULL
//     `, [instrument, expiryDate]);

//     strikesToSync = res.rows;
//   } catch (err) {
//     console.error("❌ Failed to fetch strikes from DB:", err.message);
//     return;
//   } finally {
//     client.release();
//   }

//   if (strikesToSync.length === 0) {
//     console.log("⚠️ No recorded strikes with Security ID found in DB. Did the new Live Recorder run today?");
//     return;
//   }

//   console.log(`📋 Found ${strikesToSync.length} active strikes with ID in DB. Starting EOD Sync...`);

//   // Loop lagakar ek-ek strike ka data fetch aur sync karna
//   for (let i = 0; i < strikesToSync.length; i++) {
//     const { strike, option_type, security_id } = strikesToSync[i];

//     console.log(`\n⏳ [${i + 1}/${strikesToSync.length}] Syncing ${strike} ${option_type}...`);

//     // Ab DhanExpiryLabel ("18AUG26") bhejne ki zaroorat nahi hai
//     await fetchOptionData(instrument, strike, option_type, expiryDate, security_id, targetDate, targetDate);

//     // 🛑 RATE LIMIT SHIELD: Har API call ke baad 1 second (1000ms) ka aaram!
//     await new Promise(resolve => setTimeout(resolve, 1000));
//   }

//   console.log(`\n🎉🎉 ALL ${strikesToSync.length} STRIKES SUCCESSFULLY SYNCED WITH EXACT OHLC! 🎉🎉`);
// }


// // ==========================================
// // 🚦 MAIN EXECUTION
// // ==========================================
// async function runScraper() {
//   console.log("-----------------------------------------");
//   console.log("⚡ SMART TRADER EOD SYNCER STARTED ⚡");
//   console.log("-----------------------------------------");

//   // Parameters: (Instrument, DB Expiry Date, Sync Date)
//   // DhanExpiryLabel ki ab koi zaroorat nahi!
//   await syncAllRecordedStrikes("NIFTY", "2026-08-18", "2026-08-16");

//   console.log("-----------------------------------------");
//   console.log("✅ ALL TASKS COMPLETED. Exiting...");
//   process.exit();
// }

// runScraper();




// const axios = require('axios');
// const { pool } = require('../config/postgres'); // Postgres connection

// const CLIENT_ID = "1103238744";
// const ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzg3MDIxNjIyLCJpYXQiOjE3ODY5MzUyMjIsInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTAzMjM4NzQ0In0.or0bixniBZFxQYiyZSYhalc-hckAdOh8g1k2KZdGXalNTuTlS7eeCi4Qh49lBTT9qoAXgcjxiP-YRUveHPFodA";

// // ==========================================
// // ⚙️ API ENDPOINTS & CREDENTIALS
// // ==========================================
// // Ab SPOT aur OPTION dono ke liye ek hi API use hogi (Standard Intraday API)
// const INTRADAY_API_URL = 'https://api.dhan.co/v2/charts/intraday';

// const headers = {
//   'access-token': ACCESS_TOKEN,
//   'client-id': CLIENT_ID,
//   'Content-Type': 'application/json'
// };


// // ==========================================
// // 💾 COMMON FUNCTION: SAVE SPOT TO POSTGRES
// // ==========================================
// async function saveToDatabase(symbol, data) {
//   if (!data || !data.timestamp || data.timestamp.length === 0) {
//     console.log(`⚠️ No SPOT data found for: ${symbol}`);
//     return;
//   }

//   const client = await pool.connect();
//   try {
//     await client.query('BEGIN');
//     for (let i = 0; i < data.timestamp.length; i++) {
//       let date = new Date(data.timestamp[i] * 1000);
//       date.setSeconds(0, 0); // Isme bhi seconds 00 kar denge
//       const timestampStr = date.toISOString();

//       const query = `
//           INSERT INTO historical_candles (symbol, timestamp, open, high, low, close, volume) 
//           VALUES ($1, $2, $3, $4, $5, $6, $7)
//           ON CONFLICT (symbol, timestamp) DO UPDATE SET 
//               open = EXCLUDED.open, high = EXCLUDED.high, 
//               low = EXCLUDED.low, close = EXCLUDED.close, volume = EXCLUDED.volume;
//       `;
//       await client.query(query, [
//         symbol, timestampStr,
//         data.open[i], data.high[i], data.low[i], data.close[i], data.volume[i]
//       ]);
//     }
//     await client.query('COMMIT');
//     console.log(`🎉 [SUCCESS] Exact OHLC SPOT Data saved for [${symbol}]!`);
//   } catch (error) {
//     await client.query('ROLLBACK');
//     console.error(`❌ DB Save Error for SPOT ${symbol}:`, error.message);
//   } finally {
//     client.release();
//   }
// }


// // ==========================================
// // 📈 1. SPOT DATA FETCH FUNCTION (NIFTY 50)
// // ==========================================
// async function fetchSpotData(securityId, symbol, fromDate, toDate) {
//   console.log(`\n🚀 Fetching EXACT INTRADAY SPOT data for: ${symbol}...`);
//   try {
//     const payload = {
//       securityId: securityId.toString(),
//       exchangeSegment: "IDX_I",
//       instrument: "INDEX",
//       interval: "1",
//       fromDate: fromDate,
//       toDate: toDate
//     };
//     const response = await axios.post(INTRADAY_API_URL, payload, { headers });
//     await saveToDatabase(symbol, response.data.data);
//   } catch (error) {
//     console.error(`❌ Spot Fetch Failed:`, error.response ? error.response.data : error.message);
//   }
// }


// // ==========================================
// // 💾 EOD SYNCER: SAVE OPTIONS OHLC TO POSTGRES
// // ==========================================
// async function saveOptionToDatabase(instrument, strike, optionType, expiryDate, data) {
//   if (!data || !data.timestamp || data.timestamp.length === 0) return;

//   const client = await pool.connect();
//   try {
//     await client.query('BEGIN');

//     for (let i = 0; i < data.timestamp.length; i++) {
//       // ⏱️ Timestamp Normalization
//       let date = new Date(data.timestamp[i] * 1000);
//       date.setSeconds(0, 0);
//       const timestampStr = date.toISOString();

//       // Dhan ki Intraday API me OI nahi aata, isliye 0 dal rahe hain naye row ke liye
//       const oiValue = (data.oi && data.oi[i]) ? data.oi[i] : 0;

//       // 🔥 THE MAGIC UPSERT QUERY (Security ID based)
//       const query = `
//         INSERT INTO options_candles 
//         (instrument, strike, option_type, expiry_date, timestamp, open, high, low, close, volume, oi) 
//         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
//         ON CONFLICT (instrument, strike, option_type, expiry_date, timestamp) 
//         DO UPDATE SET 
//             open = EXCLUDED.open,
//             high = EXCLUDED.high,
//             low = EXCLUDED.low,
//             close = EXCLUDED.close,
//             volume = EXCLUDED.volume;
//         -- 🛑 NOTE: Humne yahan UPDATE me 'oi', 'iv' aur 'greeks' ka naam nahi likha hai!
//         -- Yani EOD syncer sirf OHLCV update karega, Live 'fear/data' ekdum safe rahega!
//       `;

//       await client.query(query, [
//         instrument, strike, optionType, expiryDate, timestampStr,
//         data.open[i], data.high[i], data.low[i], data.close[i], data.volume[i], oiValue
//       ]);
//     }

//     await client.query('COMMIT');
//     console.log(`🎉 [EOD SYNC SUCCESS] Exact OHLC merged for [${instrument} ${strike} ${optionType}]!`);
//   } catch (error) {
//     await client.query('ROLLBACK');
//     console.error(`❌ DB Save Error:`, error.message);
//   } finally {
//     client.release();
//   }
// }


// // ==========================================
// // 📉 OPTIONS DATA FETCH FUNCTION (DIRECT SECURITY ID)
// // ==========================================
// async function fetchOptionData(instrument, strike, optionType, expiryDate, securityId, fromDate, toDate) {
//   console.log(`🚀 Fetching EXACT INTRADAY data for: ${instrument} ${strike} ${optionType} (Security ID: ${securityId})...`);

//   try {
//     const payload = {
//       securityId: securityId.toString(), // 👈 Direct ID use kar rahe hain
//       exchangeSegment: "NSE_FNO",
//       instrument: "OPTIDX",
//       interval: "1",
//       expiryCode: 0,
//       fromDate: fromDate,
//       toDate: toDate
//     };

//     // Ab rollingoption nahi, standard intraday API hit ho rahi hai
//     const response = await axios.post(INTRADAY_API_URL, payload, { headers });

//     const apiData = response.data.data;
//     if (!apiData || !apiData.timestamp || apiData.timestamp.length === 0) {
//       console.log(`⚠️ No data found from Dhan for ${strike} ${optionType}`);
//       return;
//     }

//     // Direct save, no object mapping needed!
//     await saveOptionToDatabase(instrument, strike, optionType, expiryDate, apiData);
//   } catch (error) {
//     console.error(`❌ Option Fetch Failed for ${strike}:`, error.response ? error.response.data : error.message);
//   }
// }


// // ==========================================
// // 🤖 THE SMART AUTO-LOOP SYNCER
// // ==========================================
// async function syncAllRecordedStrikes(instrument, expiryDate, targetDate) {
//   console.log(`\n🔍 Fetching unique strikes from Database for ${instrument} (${expiryDate})...`);

//   const client = await pool.connect();
//   let strikesToSync = [];

//   try {
//     // 👇 DB se strike ke sath security_id bhi nikal rahe hain!
//     const res = await client.query(`
//       SELECT DISTINCT strike, option_type, security_id 
//       FROM options_candles 
//       WHERE instrument = $1 AND expiry_date = $2 AND security_id IS NOT NULL
//     `, [instrument, expiryDate]);

//     strikesToSync = res.rows;
//   } catch (err) {
//     console.error("❌ Failed to fetch strikes from DB:", err.message);
//     return;
//   } finally {
//     client.release();
//   }

//   if (strikesToSync.length === 0) {
//     console.log("⚠️ No recorded strikes with Security ID found in DB. Did the new Live Recorder run today?");
//     return;
//   }

//   console.log(`📋 Found ${strikesToSync.length} active strikes with ID in DB. Starting EOD Sync...`);

//   // Loop lagakar ek-ek strike ka data fetch aur sync karna
//   for (let i = 0; i < strikesToSync.length; i++) {
//     const { strike, option_type, security_id } = strikesToSync[i];

//     console.log(`\n⏳ [${i + 1}/${strikesToSync.length}] Syncing ${strike} ${option_type}...`);

//     await fetchOptionData(instrument, strike, option_type, expiryDate, security_id, targetDate, targetDate);

//     // 🛑 RATE LIMIT SHIELD: Har API call ke baad 1 second (1000ms) ka aaram!
//     await new Promise(resolve => setTimeout(resolve, 1000));
//   }

//   console.log(`\n🎉🎉 ALL ${strikesToSync.length} STRIKES SUCCESSFULLY SYNCED WITH EXACT OHLC! 🎉🎉`);
// }


// // ==========================================
// // 🚦 MAIN EXECUTION
// // ==========================================
// async function runScraper() {
//   console.log("-----------------------------------------");
//   console.log("⚡ SMART TRADER EOD SYNCER STARTED ⚡");
//   console.log("-----------------------------------------");

//   // Sync Date ko ek variable me daal diya taaki SPOT aur OPTIONS dono me ek hi date jaye
//   const syncDate = "2026-08-17";
//   const expiryDate = "2026-08-18";

//   // 1. Sabse pehle SPOT (NIFTY 50) data fetch & save karega
//   await fetchSpotData("13", "NIFTY", syncDate, syncDate);

//   // 2. Phir OPTIONS ka data fetch & save karega
//   await syncAllRecordedStrikes("NIFTY", expiryDate, syncDate);

//   console.log("-----------------------------------------");
//   console.log("✅ ALL TASKS COMPLETED. Exiting...");
//   process.exit();
// }

// runScraper();




// const axios = require('axios');
// const { pool } = require('../config/postgres');

// const CLIENT_ID = "1103238744";
// const ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzg3MDIxNjIyLCJpYXQiOjE3ODY5MzUyMjIsInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTAzMjM4NzQ0In0.or0bixniBZFxQYiyZSYhalc-hckAdOh8g1k2KZdGXalNTuTlS7eeCi4Qh49lBTT9qoAXgcjxiP-YRUveHPFodA";

// // ==========================================
// // ⚙️ API ENDPOINTS
// // ==========================================
// const SPOT_API_URL = 'https://api.dhan.co/v2/charts/intraday';
// const OPTION_API_URL = 'https://api.dhan.co/v2/charts/rollingoption'; // 👈 Back to the proven API

// const headers = {
//   'access-token': ACCESS_TOKEN,
//   'client-id': CLIENT_ID,
//   'Content-Type': 'application/json'
// };

// // ==========================================
// // 💾 SPOT DATA SYNC
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
//     const payload = { securityId: securityId, exchangeSegment: "IDX_I", instrument: "INDEX", interval: "1", fromDate, toDate };
//     const response = await axios.post(SPOT_API_URL, payload, { headers });
//     await saveSpotToDatabase(symbol, response.data.data);
//   } catch (error) {
//     console.error(`❌ Spot Fetch Failed:`, error.message);
//   }
// }

// // ==========================================
// // 🧠 DYNAMIC STRIKE RESOLVER (The Brain)
// // ==========================================
// async function getDynamicDhanLabel(targetStrike, optionType, fromDate) {
//   try {
//     const payload = {
//       exchangeSegment: "NSE_FNO", instrument: "OPTIDX", interval: "1", securityId: 13,
//       expiryFlag: "WEEK", expiryCode: 1, drvOptionType: optionType, strike: "ATM",
//       requiredData: ["strike"], fromDate: fromDate, toDate: fromDate
//     };
//     const response = await axios.post(OPTION_API_URL, payload, { headers });
//     const optKey = optionType === "CALL" ? "ce" : "pe";
//     const optData = response.data?.data?.[optKey];

//     if (!optData || !optData.strike || optData.strike.length === 0) return null;

//     const baseAtmStrike = optData.strike[0];
//     const diff = targetStrike - baseAtmStrike;
//     const steps = Math.round(diff / 50);

//     if (steps === 0) return "ATM";
//     return optionType === "CALL"
//       ? (steps > 0 ? `OTM${steps}` : `ITM${Math.abs(steps)}`)
//       : (steps > 0 ? `ITM${steps}` : `OTM${Math.abs(steps)}`);
//   } catch (error) {
//     return null;
//   }
// }

// // ==========================================
// // 💾 OPTIONS DATA SYNC
// // ==========================================
// async function saveOptionToDatabase(instrument, strike, optionType, expiryDate, data) {
//   if (!data || !data.timestamp || data.timestamp.length === 0) return;
//   const client = await pool.connect();
//   try {
//     await client.query('BEGIN');
//     for (let i = 0; i < data.timestamp.length; i++) {
//       let date = new Date(data.timestamp[i] * 1000);
//       date.setSeconds(0, 0);

//       const query = `
//         INSERT INTO options_candles (instrument, strike, option_type, expiry_date, timestamp, open, high, low, close, volume) 
//         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
//         ON CONFLICT (instrument, strike, option_type, expiry_date, timestamp) 
//         DO UPDATE SET 
//             open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low, close = EXCLUDED.close, volume = EXCLUDED.volume;
//         -- 🛑 Greeks, IV, and security_id are strictly protected!
//       `;
//       await client.query(query, [
//         instrument, strike, optionType, expiryDate, date.toISOString(),
//         data.open[i], data.high[i], data.low[i], data.close[i], data.volume[i]
//       ]);
//     }
//     await client.query('COMMIT');
//     console.log(`🎉 [EOD SYNC SUCCESS] Exact OHLC merged for [${instrument} ${strike} ${optionType}]!`);
//   } catch (error) {
//     await client.query('ROLLBACK');
//     console.error(`❌ DB Save Error:`, error.message);
//   } finally {
//     client.release();
//   }
// }

// async function fetchOptionData(instrument, actualStrike, optionType, expiryDate, fromDate, toDate) {
//   const apiStrikeLabel = await getDynamicDhanLabel(actualStrike, optionType, fromDate);
//   if (!apiStrikeLabel) {
//     console.log(`⚠️ Skipping ${actualStrike} ${optionType} (Market ATM Base not found)`);
//     return;
//   }

//   console.log(`🚀 Fetching data for: ${actualStrike} ${optionType} (Label: ${apiStrikeLabel})...`);
//   try {
//     const payload = {
//       exchangeSegment: "NSE_FNO", instrument: "OPTIDX", interval: "1", securityId: 13,
//       expiryFlag: "WEEK", expiryCode: 1, drvOptionType: optionType, strike: apiStrikeLabel,
//       requiredData: ["open", "high", "low", "close", "volume"], fromDate, toDate
//     };

//     const response = await axios.post(OPTION_API_URL, payload, { headers });
//     const optionKey = optionType === "CALL" ? "ce" : "pe";
//     const apiData = response.data?.data?.[optionKey];

//     if (!apiData || !apiData.timestamp) {
//       console.log(`⚠️ No data found from Dhan for ${actualStrike} ${optionType}`);
//       return;
//     }
//     await saveOptionToDatabase(instrument, actualStrike, optionType, expiryDate, apiData);
//   } catch (error) {
//     console.error(`❌ Option Fetch Failed:`, error.message);
//   }
// }

// // ==========================================
// // 🤖 MAIN AUTO-SYNCER
// // ==========================================
// async function syncAllRecordedStrikes(instrument, expiryDate, syncDate) {
//   console.log(`\n🔍 Fetching unique strikes from Database for ${instrument}...`);
//   const client = await pool.connect();
//   let strikesToSync = [];
//   try {
//     const res = await client.query(`SELECT DISTINCT strike, option_type FROM options_candles WHERE instrument = $1 AND expiry_date = $2`, [instrument, expiryDate]);
//     strikesToSync = res.rows;
//   } finally { client.release(); }

//   if (strikesToSync.length === 0) return console.log("⚠️ No recorded strikes found in DB.");
//   console.log(`📋 Found ${strikesToSync.length} strikes. Starting EOD Sync...`);

//   for (let i = 0; i < strikesToSync.length; i++) {
//     const { strike, option_type } = strikesToSync[i];
//     console.log(`\n⏳ [${i + 1}/${strikesToSync.length}] Syncing ${strike} ${option_type}...`);
//     const optTypeAPI = option_type === "CE" ? "CALL" : "PUT";
//     await fetchOptionData(instrument, strike, optTypeAPI, expiryDate, syncDate, syncDate);
//     await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 sec delay to respect API limits
//   }
//   console.log(`\n🎉🎉 ALL STRIKES SUCCESSFULLY SYNCED! 🎉🎉`);
// }

// // ==========================================
// // 🚦 MAIN EXECUTION
// // ==========================================
// async function runScraper() {
//   console.log("⚡ SMART TRADER EOD SYNCER STARTED ⚡");
//   const syncDate = "2026-08-17"; // 👈 Aaj ki date (Monday)
//   const expiryDate = "2026-08-18"; // 👈 Database wali expiry date

//   await fetchSpotData("13", "NIFTY", syncDate, syncDate);
//   await syncAllRecordedStrikes("NIFTY", expiryDate, syncDate);
//   console.log("✅ ALL TASKS COMPLETED. Exiting...");
//   process.exit();
// }

// runScraper();




const axios = require('axios');
const { pool } = require('../config/postgres');

const CLIENT_ID = "1103238744";
const ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzg3MDIxNjIyLCJpYXQiOjE3ODY5MzUyMjIsInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTAzMjM4NzQ0In0.or0bixniBZFxQYiyZSYhalc-hckAdOh8g1k2KZdGXalNTuTlS7eeCi4Qh49lBTT9qoAXgcjxiP-YRUveHPFodA";

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
  
  const syncDate = "2026-08-17"; 
  
  // 🔥 THE FIX: Dhan Intraday API requires exact TIME!
  const fromTime = `${syncDate} 09:15:00`;
  const toTime = `${syncDate} 15:30:00`;

  await fetchSpotData("13", "NIFTY", fromTime, toTime);

  console.log("--------------------------------------------------");
  console.log("✅ SPOT Data Synced. All tasks completed. Exiting...");
  process.exit();
}

runScraper();