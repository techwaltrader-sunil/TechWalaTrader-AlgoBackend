
// File: scripts/historicalOptionScraper.js
require('dotenv').config({ path: '../.env' });
const axios = require('axios');
const { pool } = require('../config/postgres');
const { isTradingHoliday } = require('../engine/utils/holidaysCalendar'); 
const { getNearestExpiryString } = require('../engine/utils/expiryCalculator');

// 🎯 CONFIGURATION
const CLIENT_ID = process.env.DHAN_CLIENT_ID || "1103238744";
const ACCESS_TOKEN = process.env.DHAN_ACCESS_TOKEN || "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJ1c2VyUmVnaW9uIjoiUjEiLCJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzkwMzk0MDMzLCJpYXQiOjE3OTAzMDc2MzMsInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTAzMjM4NzQ0In0.LQy4QWSF8_O2TxM_kmrJ0-I0zhMjLpnm3u_2waEjSF9c3grvmgyviu4gNBHiLy8R12fbTZfa_Lj202BYW7hBKw";
const SYMBOL = 'NIFTY';
const FALLBACK_START_DATE = '2026-07-01'; 
const END_DATE = '2026-07-31'; 

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