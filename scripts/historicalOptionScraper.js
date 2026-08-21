// require('dotenv').config({ path: '../.env' }); // Apne .env ka sahi path check kar lena
const axios = require('axios');
const { pool } = require('../config/postgres');
// Ensure path is correct for your expiryCalculator
const { getNearestExpiryString } = require('../engine/utils/expiryCalculator'); 

const CLIENT_ID = "1103238744";
const ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzg3MTk3NjYyLCJpYXQiOjE3ODcxMTEyNjIsInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTAzMjM4NzQ0In0.TSg0Pmyt18XEdEW6R7SvO6qJVPM78BULafhsuThHNlPb-jRBJ4uUJCYumBfqZc0hsM_XheevWNCHCwTlDkMiTg";


// 🎯 CONFIGURATION
// const ACCESS_TOKEN = process.env.DHAN_ACCESS_TOKEN;
// const CLIENT_ID = process.env.DHAN_CLIENT_ID;
const TARGET_DATE = '2026-08-14'; // Jis din ka data chahiye wo yahan daalo
const SYMBOL = 'NIFTY';

// Helper: "Upcoming EXP 18AUG26" ko "2026-08-18" me badalne ke liye
function parseExpiryToDate(expStr) {
    const parts = expStr.split(' ');
    const datePart = parts[parts.length - 1]; // "18AUG26"
    
    const day = datePart.substring(0, 2);
    const monthStr = datePart.substring(2, 5);
    const yearStr = "20" + datePart.substring(5, 7);
    
    const months = { JAN:"01", FEB:"02", MAR:"03", APR:"04", MAY:"05", JUN:"06", JUL:"07", AUG:"08", SEP:"09", OCT:"10", NOV:"11", DEC:"12" };
    return `${yearStr}-${months[monthStr]}-${day}`;
}

// 🎯 STEP 1: Subah 9:15 ka ATM Strike Nikalna
async function getAtmStrikeAtSOD(dateStr) {
  const client = await pool.connect();
    try {
        // Exact time ke bajaye, us din ki sabse pehli candle uthayenge
        const query = `
            SELECT open, timestamp FROM historical_candles 
            WHERE symbol = $1 AND timestamp::date = $2 
            ORDER BY timestamp ASC 
            LIMIT 1
        `;
        const res = await pool.query(query, [SYMBOL, dateStr]);
        
        if (res.rows.length === 0) throw new Error(`Spot data missing in historical_candles for date ${dateStr}`);
        
        const spot = parseFloat(res.rows[0].open);
        console.log(`🌅 First candle found at: ${res.rows[0].timestamp}`);
        
        return Math.round(spot / 50) * 50; // NIFTY ka ATM 50 ke multiple me hota hai
    } catch (err) {
        console.error("❌ Error fetching ATM Strike:", err.message);
        process.exit(1);
    }
}

// 🎯 MAIN ENGINE
async function fetchAndSaveHistoricalOptions() {
    console.log(`\n🚀 STARTING HISTORICAL OPTION SCRAPER FOR: ${TARGET_DATE}\n`);

    try {
        // 1. Get Correct Expiry Date using your Smart Engine
        const expString = getNearestExpiryString(TARGET_DATE, SYMBOL, "WEEKLY");
        const expiryDate = parseExpiryToDate(expString);
        console.log(`📅 Calculated Safe Expiry: ${expiryDate} (Engine Output: ${expString})`);

        // 2. Get Morning ATM Strike
        const atmStrike = await getAtmStrikeAtSOD(TARGET_DATE);
        console.log(`🎯 ATM Strike Fixed at 09:15: ${atmStrike}\n`);

        const optionTypes = ['CALL', 'PUT'];
        const offsets = [];
        for (let i = -10; i <= 10; i++) offsets.push(i); // ATM-10 se ATM+10 (21 Strikes)

        // 3. Loop through CE & PE and all 21 Strikes
        for (const type of optionTypes) {
            for (const offset of offsets) {
                let strikeStr = "ATM";
                if (offset > 0) strikeStr = `ATM+${offset}`;
                if (offset < 0) strikeStr = `ATM${offset}`; // negative sign already included in i

                console.log(`📡 Fetching ${type} data for ${strikeStr}...`);

                const payload = {
                    exchangeSegment: "NSE_FNO",
                    interval: "1",
                    securityId: "13", // 13 is NIFTY 50
                    instrument: "OPTIDX",
                    expiryFlag: "WEEK", 
                    expiryCode: 1, // 0 = Current Nearest Expiry
                    strike: strikeStr,
                    drvOptionType: type,
                    requiredData: ["open", "high", "low", "close", "iv", "volume", "strike", "oi", "spot"],
                    fromDate: TARGET_DATE,
                    toDate: TARGET_DATE
                };

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
                const seriesData = resData[optKey];

                if (!seriesData || !seriesData.timestamp || seriesData.timestamp.length === 0) {
                    console.log(`⚠️ No data found for ${strikeStr} ${type} on Dhan API.`);
                    continue;
                }

                // 4. Prepare Batch Insert Query
                const values = [];
                const placeholders = [];
                let paramIdx = 1;

                for (let i = 0; i < seriesData.timestamp.length; i++) {
                    const ts = new Date(seriesData.timestamp[i] * 1000).toISOString(); 
                    
                    // Agar Dhan api exact strike nahi deta to hum apna fallback strike banayenge
                    const actualStrike = seriesData.strike[i] || (atmStrike + (offset * 50)); 
                    
                    values.push(
                        SYMBOL,
                        actualStrike,
                        type === 'CALL' ? 'CE' : 'PE',
                        expiryDate,
                        ts,
                        seriesData.close[i] || 0,
                        seriesData.volume[i] || 0,
                        seriesData.oi[i] || 0,
                        seriesData.iv[i] || 0,
                        0, 0, 0, 0, // Greeks ko default 0 set kiya (Delta, Theta, Gamma, Vega)
                        '00000' // Security ID (Placeholder)
                    );

                    const rowPlaceholders = [];
                    for(let j = 0; j < 14; j++) {
                        rowPlaceholders.push(`$${paramIdx++}`);
                    }
                    placeholders.push(`(${rowPlaceholders.join(',')})`);
                }

                // 5. Fire Insert Query to PostgreSQL
                if (values.length > 0) {
                    const query = `
                        INSERT INTO option_chain_data 
                        (instrument, strike, option_type, expiry_date, timestamp, close, volume, oi, iv, delta, theta, gamma, vega, security_id) 
                        VALUES ${placeholders.join(',')}
                    `;
                    await pool.query(query, values);
                    console.log(`✅ Saved ${seriesData.timestamp.length} rows for ${strikeStr} ${type}`);
                }
                
                // Dhan API ko saans lene ke liye 0.5 second ka delay (Rate Limit se bachne ke liye)
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        console.log('\n🎉 ALL DONE! Historical Option Chain Data successfully injected into PostgreSQL!');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ CRITICAL ERROR IN SCRAPER:', error?.response?.data || error.message);
        process.exit(1);
    }
}

// Start The Engine
fetchAndSaveHistoricalOptions();