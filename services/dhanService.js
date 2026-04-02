// const axios = require('axios');
// require('dotenv').config();

// // Dhan API का बेस URL
// const DHAN_API_URL = "https://api.dhan.co/v2"; 

// // Axios इंस्टेंस बनाना (हर रिक्वेस्ट में API Key और Client ID ऑटोमैटिक जाएगा)
// const dhanApi = axios.create({
//   baseURL: DHAN_API_URL,
//   headers: {
//     'access-token': process.env.DHAN_ACCESS_TOKEN,
//     'client-id': process.env.DHAN_CLIENT_ID,
//     'Accept': 'application/json',
//     'Content-Type': 'application/json'
//   }
// });

// // --- 1. फंड्स (Funds) चेक करने का फंक्शन ---
// const getFundSummary = async () => {
//   try {
//     const response = await dhanApi.get('/fundlimit');
//     return response.data;
//   } catch (error) {
//     console.error("❌ Dhan API Error:", error.response ? error.response.data : error.message);
//     throw error;
//   }
// };

// // --- 2. ट्रेड (Buy/Sell) ऑर्डर लगाने का फंक्शन ---
// const placeOrder = async (orderData) => {
//   try {
//     // DhanHQ API का ऑर्डर प्लेसमेंट एंडपॉइंट
//     const response = await dhanApi.post('/orders', orderData);
//     return response.data;
//   } catch (error) {
//     console.error("❌ Dhan Order Error:", error.response ? error.response.data : error.message);
//     throw error;
//   }
// };

// // module.exports में इसे भी शामिल करें
// module.exports = {
//   getFundSummary,
//   placeOrder // ✅ नया फंक्शन यहाँ जोड़ा गया
// };

// const axios = require('axios');

// // Dhan API Base URL
// const DHAN_API_URL = 'https://api.dhan.co/orders';

// /**
//  * Place a real order on Dhan
//  * @param {String} clientId - User's Dhan Client ID
//  * @param {String} accessToken - User's Dhan Access Token (Saved as apiSecret in DB)
//  * @param {Object} orderData - Details of the trade (Symbol, Qty, Buy/Sell)
//  */
// const placeDhanOrder = async (clientId, accessToken, orderData) => {
//     try {
//         const payload = {
//             dhanClientId: clientId,
//             correlationId: `TM-${Date.now()}`, // TradeMaster ki taraf se unique ID
//             transactionType: orderData.action, // "BUY" or "SELL"
//             exchangeSegment: "NSE_FNO", // Options ke liye NSE_FNO
//             productType: "INTRADAY", // MIS
//             orderType: "MARKET", // Market price par execute hoga
//             validity: "DAY",
//             securityId: orderData.securityId, // Nifty Strike ka Dhan ID (e.g., "35012")
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

// module.exports = {
//     placeDhanOrder
// };




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
const fetchDhanHistoricalData = async (clientId, accessToken, securityId, exchangeSegment, instrumentType, fromDate, toDate) => {
    try {
        // Dhan Intraday/Historical API Endpoint
        const url = 'https://api.dhan.co/charts/intraday';
        
        // Payload as per Dhan API documentation
        const payload = {
            securityId: securityId.toString(),
            exchangeSegment: exchangeSegment, // e.g., 'NSE_FNO' ya 'NSE_EQ'
            instrument: instrumentType,       // e.g., 'OPTIDX' (Options) ya 'FUTIDX'
            fromDate: fromDate,               // Format: 'YYYY-MM-DD'
            toDate: toDate                    // Format: 'YYYY-MM-DD'
        };

        const headers = {
            'client-id': clientId,
            'access-token': accessToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        console.log(`📡 [Dhan API] Fetching Historical Data for ${securityId} | From: ${fromDate} To: ${toDate}...`);
        
        const response = await axios.post(url, payload, { headers });
        
        // Dhan data arrays me bhejta hai: { open: [...], high: [...], low: [...], close: [...], volume: [...], start_Time: [...] }
        if (response.data && response.data.data) {
            console.log(`✅ [Dhan API] Historical Data Fetched Successfully!`);
            return {
                success: true,
                data: response.data.data
            };
        } else {
            return { success: false, message: 'Invalid data format received from Dhan' };
        }
    } catch (error) {
        const errorMsg = error.response?.data?.errorMessage || error.message;
        console.error('❌ [Dhan API] Historical Fetch Error:', errorMsg);
        return { success: false, message: errorMsg };
    }
};

module.exports = {
    placeDhanOrder,
    fetchLiveLTP,
    fetchDhanHistoricalData
};