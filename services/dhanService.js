
// const axios = require('axios');

// // Dhan API Base URLs
// const DHAN_API_URL = 'https://api.dhan.co/orders';
// const DHAN_FEED_URL = 'https://api.dhan.co/marketfeed/ltp'; // 🔥 NAYA: Live Price URL

// /**
//  * Place a real order on Dhan
//  */
// const placeDhanOrder = async (clientId, accessToken, orderData) => {
//     try {
//         const payload = {
//             dhanClientId: clientId,
//             correlationId: `TM-${Date.now()}`, 
//             transactionType: orderData.action, 
//             exchangeSegment: "NSE_FNO", 
//             productType: "INTRADAY", 
//             orderType: "MARKET", 
//             validity: "DAY",
//             securityId: orderData.securityId, 
//             quantity: orderData.quantity
//         };

//         const response = await axios.post(DHAN_API_URL, payload, {
//             headers: {
//                 'access-token': accessToken,
//                 'Content-Type': 'application/json',
//                 'Accept': 'application/json'
//             }
//         });

//         console.log(`✅ [DHAN API] Order Placed Successfully for ${clientId}:`, response.data);
//         return { success: true, data: response.data };

//     } catch (error) {
//         console.error(`❌ [DHAN API] Order Failed for ${clientId}:`, error.response?.data || error.message);
//         return { success: false, error: error.response?.data || error.message };
//     }
// };

// /**
//  * 🔥 PHASE 2: Fetch Live Premium Price (LTP) from Dhan
//  * @param {String} clientId - User's Dhan Client ID
//  * @param {String} accessToken - User's Dhan Access Token
//  * @param {String} exchange - e.g., "NSE_FNO"
//  * @param {String} securityId - e.g., "35012"
//  */
// const fetchLiveLTP = async (clientId, accessToken, exchange, securityId) => {
//     try {
//         const payload = {};
//         // Dhan API format: { "NSE_FNO": ["35012"] }
//         payload[exchange] = [String(securityId)];

//         const response = await axios.post(DHAN_FEED_URL, payload, {
//             headers: {
//                 'access-token': accessToken,
//                 'client-id': clientId,
//                 'Content-Type': 'application/json',
//                 'Accept': 'application/json'
//             }
//         });

//         // Response format is generally: { data: { NSE_FNO: { "35012": 320.50 } } }
//         const ltpData = response.data?.data;
//         if (ltpData && ltpData[exchange] && ltpData[exchange][securityId]) {
//             return parseFloat(ltpData[exchange][securityId]);
//         }
        
//         return null;
//     } catch (error) {
//         console.error(`❌ [DHAN API] LTP Fetch Failed for ${securityId}:`, error.response?.data || error.message);
//         return null;
//     }
// };

// module.exports = {
//     placeDhanOrder,
//     fetchLiveLTP // 🔥 NAYA Export
// };


const axios = require('axios');

// Dhan API Base URLs
const DHAN_API_URL = 'https://api.dhan.co/orders';
// 🔥 THE FIX 1: Dhan ka naya v2 URL update kar diya
const DHAN_FEED_URL = 'https://api.dhan.co/v2/marketfeed/ltp'; 

/**
 * Place a real order on Dhan
 */
const placeDhanOrder = async (clientId, accessToken, orderData) => {
    try {
        const payload = {
            dhanClientId: clientId,
            correlationId: `TM-${Date.now()}`, 
            transactionType: orderData.action, 
            exchangeSegment: "NSE_FNO", 
            productType: "INTRADAY", 
            orderType: "MARKET", 
            validity: "DAY",
            securityId: orderData.securityId, 
            quantity: orderData.quantity
        };

        const response = await axios.post(DHAN_API_URL, payload, {
            headers: {
                'access-token': accessToken,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        console.log(`✅ [DHAN API] Order Placed Successfully for ${clientId}:`, response.data);
        return { success: true, data: response.data };

    } catch (error) {
        console.error(`❌ [DHAN API] Order Failed for ${clientId}:`, error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
};

/**
 * 🔥 Fetch Live Premium Price (LTP) from Dhan
 */
const fetchLiveLTP = async (clientId, accessToken, exchange, securityId) => {
    try {
        const payload = {};
        // Dhan API ke liye ID ko strictly number (Integer) me bhejna safe hota hai
        payload[exchange] = [parseInt(securityId)];

        const response = await axios.post(DHAN_FEED_URL, payload, {
            headers: {
                'access-token': accessToken,
                'client-id': clientId,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        const ltpData = response.data?.data;
        
        // 🔥 THE FIX 2: Dhan 'last_price' key ke andar price bhejta hai
        if (ltpData && ltpData[exchange] && ltpData[exchange][securityId]) {
            const price = ltpData[exchange][securityId].last_price;
            return parseFloat(price);
        }
        
        return null;
    } catch (error) {
        console.error(`❌ [DHAN API] LTP Fetch Failed for ${securityId}:`, error.response?.data || error.message);
        return null;
    }
};

// ==========================================
// 📊 FETCH HISTORICAL DATA (OHLCV) FROM DHAN
// ==========================================
const fetchDhanHistoricalData = async (clientId, accessToken, securityId, exchangeSegment, instrumentType, fromDate, toDate, interval = "5") => {
    try {
        // 🔥 FIX: Check karo ki Timeframe Daily (1D) hai ya Intraday (5m, 15m)
        const isDaily = (interval.toUpperCase() === "D" || interval.toUpperCase() === "1D");
        
        // Daily aur Intraday ke endpoints alag hote hain
        // const url = isDaily 
        //     ? 'https://api.dhan.co/charts/historical' 
        //     : 'https://api.dhan.co/charts/intraday';
        
        // const payload = {
        //     securityId: securityId.toString(),
        //     exchangeSegment: exchangeSegment, 
        //     instrument: instrumentType,       
        //     fromDate: fromDate,               
        //     toDate: toDate,
        // };

        // // Dhan ko Daily me 'expiryCode' chahiye hota hai, aur Intraday me 'interval'
        // if (isDaily) {
        //     payload.expiryCode = 0; 
        // } else {
        //     payload.interval = interval;
        // }

        const url = isDaily 
            ? 'https://api.dhan.co/v2/charts/historical' 
            : 'https://api.dhan.co/v2/charts/intraday';

        // 🔥 THE ULTIMATE V2 FIX: Time is STRICTLY required for Intraday in Dhan V2
        const formattedFromDate = isDaily ? fromDate : `${fromDate} 09:15:00`;
        const formattedToDate = isDaily ? toDate : `${toDate} 15:30:00`;

        const payload = {
            securityId: securityId.toString(),
            exchangeSegment: exchangeSegment, 
            instrument: instrumentType,       
            fromDate: formattedFromDate,               
            toDate: formattedToDate,
        };

        if (isDaily) {
            payload.expiryCode = 0; 
        } else {
            // 🔥 FIX: Parameters table (image_f6e645) ke hisaab se interval 'enum integer' hai
            payload.interval = parseInt(interval) || 5; 
            payload.oi = false;
        }

        const headers = {
            'client-id': clientId,
            'access-token': accessToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        console.log(`📡 [Dhan API] Fetching ${isDaily ? 'DAILY' : 'INTRADAY'} Data for ID: ${securityId} | From: ${fromDate} To: ${toDate}...`);
        
        const response = await axios.post(url, payload, { headers });
        
        // 🔥 ULTIMATE FIX: Dhan chahe data.data me bheje ya sirf data me, hum dono check karenge!
        // Sabse pehle andar wale data me dhundo, agar wahan nahi hai to bahar wale me dhundo
        const actualData = (response.data && response.data.data && response.data.data.open) 
                            ? response.data.data 
                            : response.data;

        // Ab hum bas ye check karenge ki 'open' prices ki array aayi hai ya nahi
        if (actualData && actualData.open && actualData.open.length > 0) {
            console.log(`✅ [Dhan API] ${isDaily ? 'Daily' : 'Intraday'} Data Fetched Successfully! Candles: ${actualData.open.length}`);
            return { success: true, data: actualData };
        } else {
            // Agar phir bhi fail ho, to log me print kar lenge ki aakhir Dhan ne bheja kya hai!
            console.log('⚠️ Dhan Response Format:', JSON.stringify(response.data).substring(0, 200));
            return { success: false, message: 'Invalid data format received from Dhan' };
        }
    } catch (error) {
        const errData = error.response?.data;
        const errorMsg = errData?.internalErrorMessage || errData?.errorMessage || error.message || "Unknown error occurred";
        console.error(`❌ [Dhan API] Historical Fetch Error:`, errData || errorMsg);
        return { success: false, message: errorMsg };
    }
};

// 🔥 NEW & FIXED: Function to fetch EXACT premium for Expired Options
const fetchExpiredOptionData = async (clientId, apiSecret, spotSecurityId, strike, optionType, fromDate, toDate) => {
    try {
        const payload = {
            exchangeSegment: "NSE_FNO",
            interval: "1",
            securityId: Number(spotSecurityId), 
            instrument: "OPTIDX",
            expiryFlag: "WEEK", // BankNifty mostly uses Weekly expiries
            expiryCode: 1, 
            strike: "ATM", // 🔥 SECRET 1: Expired API strictly needs "ATM", not numbers like 52400
            drvOptionType: optionType === "CE" ? "CALL" : "PUT",
            requiredData: ["open", "high", "low", "close", "volume"],
            fromDate: fromDate,
            toDate: toDate
        };

        const response = await axios({
            method: 'post',
            url: 'https://api.dhan.co/v2/charts/rollingoption', // 🔥 SECRET 2: The exact URL
            headers: {
                'access-token': apiSecret,
                'client-id': clientId,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data: payload
        });

        // 🔥 SECRET 3: THE ADAPTER (Format conversion to prevent backend crash)
        const optionKey = optionType === "CE" ? "ce" : "pe";
        const expData = response.data.data ? response.data.data[optionKey] : null;

        if (!expData || !expData.timestamp || expData.timestamp.length === 0) {
             return { success: false, error: "No data found in expired options" };
        }

        // Converting Expired API format to perfectly match Standard Intraday API format!
        const formattedData = {
            start_Time: expData.timestamp, // Matching the property name
            open: expData.open,
            high: expData.high,
            low: expData.low,
            close: expData.close,
            volume: expData.volume
        };

        return { success: true, data: formattedData };

    } catch (error) {
        console.log(`⚠️ Expired API Error for ${optionType}:`, error.response?.data || error.message);
        return { success: false, error: error.message };
    }
};

module.exports = {
    placeDhanOrder,
    fetchLiveLTP,
    fetchDhanHistoricalData,
    fetchExpiredOptionData // 🔥 Make sure to export this
};