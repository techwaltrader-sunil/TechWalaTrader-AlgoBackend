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

const axios = require('axios');

// Dhan API Base URL
const DHAN_API_URL = 'https://api.dhan.co/orders';

/**
 * Place a real order on Dhan
 * @param {String} clientId - User's Dhan Client ID
 * @param {String} accessToken - User's Dhan Access Token (Saved as apiSecret in DB)
 * @param {Object} orderData - Details of the trade (Symbol, Qty, Buy/Sell)
 */
const placeDhanOrder = async (clientId, accessToken, orderData) => {
    try {
        const payload = {
            dhanClientId: clientId,
            correlationId: `TM-${Date.now()}`, // TradeMaster ki taraf se unique ID
            transactionType: orderData.action, // "BUY" or "SELL"
            exchangeSegment: "NSE_FNO", // Options ke liye NSE_FNO
            productType: "INTRADAY", // MIS
            orderType: "MARKET", // Market price par execute hoga
            validity: "DAY",
            securityId: orderData.securityId, // Nifty Strike ka Dhan ID (e.g., "35012")
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

module.exports = {
    placeDhanOrder
};