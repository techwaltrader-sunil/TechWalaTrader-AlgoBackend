
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const axios = require('axios');
const cron = require('node-cron');
const { pool } = require('../config/postgres');
const mongoose = require('mongoose');

// ==========================================
// 🔌 MONGODB CONNECTION (For Dynamic Token)
// ==========================================
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB for Dynamic Tokens!'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err.message));

const brokerSchema = new mongoose.Schema({}, { strict: false, collection: 'brokers' });
const Broker = mongoose.models.Broker || mongoose.model('Broker', brokerSchema);

async function getDynamicHeaders() {
    try {
        const broker = await Broker.findOne({ name: "Dhan" }); 
        if (!broker || !broker.apiSecret) {
            console.log("⚠️ MongoDB me Dhan broker ya apiSecret (Access Token) nahi mila!");
            return null;
        }
        return {
            'access-token': broker.apiSecret, 
            'client-id': broker.clientId,      
            'Content-Type': 'application/json'
        };
    } catch (error) {
        console.error("❌ Error fetching dynamic headers from MongoDB:", error.message);
        return null;
    }
}

// ==========================================
// 📈 1. SPOT PRICE SYNC (NIFTY 50)
// ==========================================
async function saveSpotToDatabase(symbol, data) {
    // Dhan API me array ka naam 'start_Time' ya 'timestamp' ho sakta hai
    const timestamps = data.start_Time || data.timestamp;
    if (!timestamps || timestamps.length === 0) return;
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        let query = `
            INSERT INTO historical_candles (symbol, timestamp, open, high, low, close, volume) 
            VALUES 
        `;
        const values = [];
        let paramIndex = 1;
        const rowValues = [];

        // 🎯 THE MAGIC: Sirf aakhiri candle nahi, poore din ka data ek sath loop karke daalenge!
        for (let i = 0; i < timestamps.length; i++) {
            let date = new Date(timestamps[i] * 1000);
            date.setSeconds(0, 0); // Seconds ko 0 kar do taaki perfect minute align ho
            
            rowValues.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
            values.push(
                symbol, 
                date.toISOString(), 
                data.open[i], 
                data.high[i], 
                data.low[i], 
                data.close[i], 
                data.volume[i] || 0
            );
        }

        query += rowValues.join(", ");
        query += `
            ON CONFLICT (symbol, timestamp) DO UPDATE SET 
                open = EXCLUDED.open, high = EXCLUDED.high, 
                low = EXCLUDED.low, close = EXCLUDED.close, volume = EXCLUDED.volume;
        `;

        // Ek hi query me poore din ki saari (ya missing) candles bulk insert ho jayengi
        await client.query(query, values);
        
        await client.query('COMMIT');
        console.log(`📈 [SUCCESS] Spot OHLC Bulk Saved for [${symbol}] - Synced ${timestamps.length} candles!`);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ SPOT DB Bulk Error:`, error.message);
    } finally {
        client.release();
    }
}

async function fetchLiveSpotData(dynamicHeaders) {
    console.log(`\n🔍 Fetching Live SPOT data for: NIFTY...`);
    try {
        const url = 'https://api.dhan.co/v2/charts/intraday';
        
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const syncDate = `${year}-${month}-${day}`;
        
        const fromTime = `${syncDate} 09:15:00`;
        const toTime = `${syncDate} 15:30:00`;

        const payload = { 
            securityId: "13", 
            exchangeSegment: "IDX_I", 
            instrument: "INDEX", 
            interval: "1", 
            fromDate: fromTime, 
            toDate: toTime 
        };
        const response = await axios.post(url, payload, { headers: dynamicHeaders });
        
        // 🎯 FIX: Dhan ka data 'response.data.data' ke andar aata hai
        const apiData = response.data.data || response.data;

        if (apiData && (apiData.start_Time || apiData.timestamp)) {
            await saveSpotToDatabase("NIFTY", apiData);
        } else {
            console.log(`⚠️ No spot data received from Dhan API.`);
        }
    } catch (error) {
        console.error(`❌ Spot Fetch Failed:`, error.message);
    }
}

// ==========================================
// 🔍 2. GET TARGET EXPIRIES DYNAMICALLY 
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
// 💾 3. SAVE LIVE OPTION CHAIN TO POSTGRES
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
        console.log(`✅ Saved options data for Expiry: ${expiryDate}`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ DB Save Error for ${expiryDate}:`, error.message);
    } finally {
        client.release();
    }
}

// ==========================================
// ⚡ 4. MASTER FETCH LOGIC (SPOT + OPTIONS)
// ==========================================
async function fetchLiveMarketData() {
    const timeNow = new Date().toLocaleTimeString();
    console.log(`\n[${timeNow}] ⚡ Starting Live Market Fetch & DB Save...`);

    try {
        // 🎯 1. MongoDB se Latest Token uthana (Sirf ek baar!)
        const dynamicHeaders = await getDynamicHeaders();
        if (!dynamicHeaders) {
            console.log(`[${timeNow}] ⚠️ Stopping execution because valid token not found in MongoDB.`);
            return;
        }

        // 🎯 2. Pehle NIFTY ka Spot Price fetch aur save karo
        await fetchLiveSpotData(dynamicHeaders);

        // 🎯 3. Phir Option Chain Expiries nikalo
        const targetExpiries = await getTargetExpiries(dynamicHeaders);
        
        if (!targetExpiries || targetExpiries.length === 0) {
            console.log(`[${timeNow}] ⚠️ Could not fetch expiry dates. Aborting options fetch.`);
            return;
        }
        
        console.log(`📅 Target Expiries: ${targetExpiries.join(', ')}`);

        // 🎯 4. Har expiry ka Option Chain fetch aur save karo
        for (const expiry of targetExpiries) {
            console.log(`📡 Fetching live options data for: ${expiry}...`);
            
            const url = 'https://api.dhan.co/v2/optionchain';
            const payload = {
                "UnderlyingScrip": 13,
                "UnderlyingSeg": "IDX_I",
                "Expiry": expiry
            };

            try {
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
        console.error(`❌ Master Fetch Error:`, error.message);
    }
}

// ==========================================
// ⏰ 5. THE TIMEKEEPER (CRON SCHEDULER)
// ==========================================
cron.schedule('* 9-15 * * 1-5', () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    if ((hours === 9 && minutes < 15) || (hours === 15 && minutes > 30)) {
        console.log(`[${now.toLocaleTimeString()}] ⏸️ Market Closed. Waiting...`);
        return;
    }
    fetchLiveMarketData();
});

console.log("=====================================================");
console.log("🟢 SMART TRADER LIVE RECORDER (SPOT + OPTIONS) STARTED");
console.log("⏳ Waiting for the clock to hit the next minute...");
console.log("=====================================================");

// Start immediately on run
fetchLiveMarketData();