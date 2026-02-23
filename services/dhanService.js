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