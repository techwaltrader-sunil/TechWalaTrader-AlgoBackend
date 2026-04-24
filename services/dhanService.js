
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


// const axios = require('axios');

// // Dhan API Base URLs
// const DHAN_API_URL = 'https://api.dhan.co/orders';
// // 🔥 THE FIX 1: Dhan ka naya v2 URL update kar diya
// const DHAN_FEED_URL = 'https://api.dhan.co/v2/marketfeed/ltp'; 

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
//  * 🔥 Fetch Live Premium Price (LTP) from Dhan
//  */
// const fetchLiveLTP = async (clientId, accessToken, exchange, securityId) => {
//     try {
//         const payload = {};
//         // Dhan API ke liye ID ko strictly number (Integer) me bhejna safe hota hai
//         payload[exchange] = [parseInt(securityId)];

//         const response = await axios.post(DHAN_FEED_URL, payload, {
//             headers: {
//                 'access-token': accessToken,
//                 'client-id': clientId,
//                 'Content-Type': 'application/json',
//                 'Accept': 'application/json'
//             }
//         });

//         const ltpData = response.data?.data;
        
//         // 🔥 THE FIX 2: Dhan 'last_price' key ke andar price bhejta hai
//         if (ltpData && ltpData[exchange] && ltpData[exchange][securityId]) {
//             const price = ltpData[exchange][securityId].last_price;
//             return parseFloat(price);
//         }
        
//         return null;
//     } catch (error) {
//         console.error(`❌ [DHAN API] LTP Fetch Failed for ${securityId}:`, error.response?.data || error.message);
//         return null;
//     }
// };

// // ==========================================
// // 📊 FETCH HISTORICAL DATA (OHLCV) FROM DHAN
// // ==========================================
// const fetchDhanHistoricalData = async (clientId, accessToken, securityId, exchangeSegment, instrumentType, fromDate, toDate, interval = "5") => {
//     try {
//         // 🔥 FIX: Check karo ki Timeframe Daily (1D) hai ya Intraday (5m, 15m)
//         const isDaily = (interval.toUpperCase() === "D" || interval.toUpperCase() === "1D");
       
//         const url = isDaily 
//             ? 'https://api.dhan.co/v2/charts/historical' 
//             : 'https://api.dhan.co/v2/charts/intraday';

//         // 🔥 THE ULTIMATE V2 FIX: Time is STRICTLY required for Intraday in Dhan V2
//         const formattedFromDate = isDaily ? fromDate : `${fromDate} 09:15:00`;
//         const formattedToDate = isDaily ? toDate : `${toDate} 15:30:00`;

//         const payload = {
//             securityId: securityId.toString(),
//             exchangeSegment: exchangeSegment, 
//             instrument: instrumentType,       
//             fromDate: formattedFromDate,               
//             toDate: formattedToDate,
//         };

//         if (isDaily) {
//             payload.expiryCode = 0; 
//         } else {
//             // 🔥 FIX: Parameters table (image_f6e645) ke hisaab se interval 'enum integer' hai
//             payload.interval = parseInt(interval) || 5; 
//             payload.oi = false;
//         }

//         const headers = {
//             'client-id': clientId,
//             'access-token': accessToken,
//             'Content-Type': 'application/json',
//             'Accept': 'application/json'
//         };

//         console.log(`📡 [Dhan API] Fetching ${isDaily ? 'DAILY' : 'INTRADAY'} Data for ID: ${securityId} | From: ${fromDate} To: ${toDate}...`);
        
//         const response = await axios.post(url, payload, { headers });
        
//         // 🔥 ULTIMATE FIX: Dhan chahe data.data me bheje ya sirf data me, hum dono check karenge!
//         // Sabse pehle andar wale data me dhundo, agar wahan nahi hai to bahar wale me dhundo
//         const actualData = (response.data && response.data.data && response.data.data.open) 
//                             ? response.data.data 
//                             : response.data;

//         // Ab hum bas ye check karenge ki 'open' prices ki array aayi hai ya nahi
//         if (actualData && actualData.open && actualData.open.length > 0) {
//             console.log(`✅ [Dhan API] ${isDaily ? 'Daily' : 'Intraday'} Data Fetched Successfully! Candles: ${actualData.open.length}`);
//             return { success: true, data: actualData };
//         } else {
//             // Agar phir bhi fail ho, to log me print kar lenge ki aakhir Dhan ne bheja kya hai!
//             console.log('⚠️ Dhan Response Format:', JSON.stringify(response.data).substring(0, 200));
//             return { success: false, message: 'Invalid data format received from Dhan' };
//         }
//     } catch (error) {
//         const errData = error.response?.data;
//         const errorMsg = errData?.internalErrorMessage || errData?.errorMessage || error.message || "Unknown error occurred";
//         console.error(`❌ [Dhan API] Historical Fetch Error:`, errData || errorMsg);
//         return { success: false, message: errorMsg };
//     }
// };

// // 🔥 NEW & FIXED: Function to fetch EXACT premium for Expired Options
// const fetchExpiredOptionData = async (clientId, apiSecret, spotSecurityId, strike, optionType, fromDate, toDate) => {
//     try {
//         const payload = {
//             exchangeSegment: "NSE_FNO",
//             interval: "1",
//             securityId: Number(spotSecurityId), 
//             instrument: "OPTIDX",
//             expiryFlag: "WEEK", // BankNifty mostly uses Weekly expiries
//             expiryCode: 1, 
//             strike: "ATM", // 🔥 SECRET 1: Expired API strictly needs "ATM", not numbers like 52400
//             drvOptionType: optionType === "CE" ? "CALL" : "PUT",
//             requiredData: ["open", "high", "low", "close", "volume"],
//             fromDate: fromDate,
//             toDate: toDate
//         };

//         const response = await axios({
//             method: 'post',
//             url: 'https://api.dhan.co/v2/charts/rollingoption', // 🔥 SECRET 2: The exact URL
//             headers: {
//                 'access-token': apiSecret,
//                 'client-id': clientId,
//                 'Accept': 'application/json',
//                 'Content-Type': 'application/json'
//             },
//             data: payload
//         });

//         // 🔥 SECRET 3: THE ADAPTER (Format conversion to prevent backend crash)
//         const optionKey = optionType === "CE" ? "ce" : "pe";
//         const expData = response.data.data ? response.data.data[optionKey] : null;

//         if (!expData || !expData.timestamp || expData.timestamp.length === 0) {
//              return { success: false, error: "No data found in expired options" };
//         }

//         // Converting Expired API format to perfectly match Standard Intraday API format!
//         const formattedData = {
//             start_Time: expData.timestamp, // Matching the property name
//             open: expData.open,
//             high: expData.high,
//             low: expData.low,
//             close: expData.close,
//             volume: expData.volume
//         };

//         return { success: true, data: formattedData };

//     } catch (error) {
//         console.log(`⚠️ Expired API Error for ${optionType}:`, error.response?.data || error.message);
//         return { success: false, error: error.message };
//     }
// };

// module.exports = {
//     placeDhanOrder,
//     fetchLiveLTP,
//     fetchDhanHistoricalData,
//     fetchExpiredOptionData // 🔥 Make sure to export this
// };


// const axios = require('axios');

// // Dhan API Base URLs
// const DHAN_API_URL = 'https://api.dhan.co/orders';
// const DHAN_FEED_URL = 'https://api.dhan.co/v2/marketfeed/ltp'; 

// // ==============================================================
// // 🚦 THE TRAFFIC POLICE (GLOBAL RATE LIMITER - 805 ERROR KILLER)
// // ==============================================================
// const API_DELAY_MS = 250; // Har API call ke beech minimum 250ms (0.25 sec) ka gap (Max 4 calls/second)
// let lastApiCallTime = 0;
// let apiQueue = Promise.resolve();

// /**
//  * Ye function saari API requests ko ek line (queue) me khada kar dega 
//  * aur unke beech ek safe gap maintain karega taaki 805 error na aaye.
//  */
// const enqueueApiCall = (apiFunction) => {
//     apiQueue = apiQueue.then(async () => {
//         const now = Date.now();
//         const timeSinceLastCall = now - lastApiCallTime;
        
//         // Agar pichli call aur is call me gap kam hai, toh thoda intezaar karo
//         if (timeSinceLastCall < API_DELAY_MS) {
//             await new Promise(resolve => setTimeout(resolve, API_DELAY_MS - timeSinceLastCall));
//         }
        
//         lastApiCallTime = Date.now(); // Time update karo
//         return apiFunction(); // Original API call fire karo
//     }).catch(err => {
//         // Queue tootne na paye, error ko pass on kar do
//         throw err; 
//     });
//     return apiQueue;
// };


// // ==========================================
// // 🛒 1. PLACE DHAN ORDER
// // ==========================================
// const placeDhanOrder = async (clientId, accessToken, orderData) => {
//     return enqueueApiCall(async () => { // 🔥 Queue ke andar daal diya
//         try {
//             const payload = {
//                 dhanClientId: clientId,
//                 correlationId: `TM-${Date.now()}`, 
//                 transactionType: orderData.action, 
//                 exchangeSegment: "NSE_FNO", 
//                 productType: "INTRADAY", 
//                 orderType: "MARKET", 
//                 validity: "DAY",
//                 securityId: orderData.securityId, 
//                 quantity: orderData.quantity
//             };

//             const response = await axios.post(DHAN_API_URL, payload, {
//                 headers: {
//                     'access-token': accessToken,
//                     'Content-Type': 'application/json',
//                     'Accept': 'application/json'
//                 }
//             });

//             console.log(`✅ [DHAN API] Order Placed Successfully for ${clientId}:`, response.data);
//             return { success: true, data: response.data };

//         } catch (error) {
//             console.error(`❌ [DHAN API] Order Failed for ${clientId}:`, error.response?.data || error.message);
//             return { success: false, error: error.response?.data || error.message };
//         }
//     });
// };

// // ==========================================
// // 📡 2. FETCH LIVE LTP
// // ==========================================
// const fetchLiveLTP = async (clientId, accessToken, exchange, securityId) => {
//     return enqueueApiCall(async () => { // 🔥 Queue ke andar daal diya
//         try {
//             const payload = {};
//             payload[exchange] = [parseInt(securityId)];

//             const response = await axios.post(DHAN_FEED_URL, payload, {
//                 headers: {
//                     'access-token': accessToken,
//                     'client-id': clientId,
//                     'Content-Type': 'application/json',
//                     'Accept': 'application/json'
//                 }
//             });

//             const ltpData = response.data?.data;
//             if (ltpData && ltpData[exchange] && ltpData[exchange][securityId]) {
//                 const price = ltpData[exchange][securityId].last_price;
//                 return parseFloat(price);
//             }
//             return null;
//         } catch (error) {
//             console.error(`❌ [DHAN API] LTP Fetch Failed for ${securityId}:`, error.response?.data || error.message);
//             return null;
//         }
//     });
// };

// // ==========================================
// // 📊 3. FETCH HISTORICAL DATA (OHLCV)
// // ==========================================
// const fetchDhanHistoricalData = async (clientId, accessToken, securityId, exchangeSegment, instrumentType, fromDate, toDate, interval = "5") => {
//     return enqueueApiCall(async () => { // 🔥 Queue ke andar daal diya
//         try {
//             const isDaily = (interval.toUpperCase() === "D" || interval.toUpperCase() === "1D");
//             const url = isDaily ? 'https://api.dhan.co/v2/charts/historical' : 'https://api.dhan.co/v2/charts/intraday';
//             const formattedFromDate = isDaily ? fromDate : `${fromDate} 09:15:00`;
//             const formattedToDate = isDaily ? toDate : `${toDate} 15:30:00`;

//             const payload = {
//                 securityId: securityId.toString(),
//                 exchangeSegment: exchangeSegment, 
//                 instrument: instrumentType,       
//                 fromDate: formattedFromDate,               
//                 toDate: formattedToDate,
//             };

//             if (isDaily) {
//                 payload.expiryCode = 0; 
//             } else {
//                 payload.interval = parseInt(interval) || 5; 
//                 payload.oi = false;
//             }

//             const headers = {
//                 'client-id': clientId,
//                 'access-token': accessToken,
//                 'Content-Type': 'application/json',
//                 'Accept': 'application/json'
//             };

//             const response = await axios.post(url, payload, { headers });
            
//             const actualData = (response.data && response.data.data && response.data.data.open) ? response.data.data : response.data;

//             if (actualData && actualData.open && actualData.open.length > 0) {
//                 return { success: true, data: actualData };
//             } else {
//                 return { success: false, message: 'Invalid data format received from Dhan' };
//             }
//         } catch (error) {
//             const errData = error.response?.data;
//             const errorMsg = errData?.internalErrorMessage || errData?.errorMessage || error.message || "Unknown error occurred";
//             console.error(`❌ [Dhan API] Historical Fetch Error:`, errData || errorMsg);
//             return { success: false, message: errorMsg };
//         }
//     });
// };

// // ==========================================
// // 🕒 4. FETCH EXPIRED OPTION DATA
// // ==========================================
// const fetchExpiredOptionData = async (clientId, apiSecret, spotSecurityId, strike, optionType, fromDate, toDate) => {
//     return enqueueApiCall(async () => { // 🔥 Queue ke andar daal diya
//         try {
//             const payload = {
//                 exchangeSegment: "NSE_FNO",
//                 interval: "1",
//                 securityId: Number(spotSecurityId), 
//                 instrument: "OPTIDX",
//                 expiryFlag: "WEEK", 
//                 expiryCode: 1, 
//                 strike: "ATM", 
//                 drvOptionType: optionType === "CE" ? "CALL" : "PUT",
//                 requiredData: ["open", "high", "low", "close", "volume"],
//                 fromDate: fromDate,
//                 toDate: toDate
//             };

//             const response = await axios({
//                 method: 'post',
//                 url: 'https://api.dhan.co/v2/charts/rollingoption', 
//                 headers: {
//                     'access-token': apiSecret,
//                     'client-id': clientId,
//                     'Accept': 'application/json',
//                     'Content-Type': 'application/json'
//                 },
//                 data: payload
//             });

//             const optionKey = optionType === "CE" ? "ce" : "pe";
//             const expData = response.data.data ? response.data.data[optionKey] : null;

//             if (!expData || !expData.timestamp || expData.timestamp.length === 0) {
//                  return { success: false, error: "No data found in expired options" };
//             }

//             const formattedData = {
//                 start_Time: expData.timestamp,
//                 open: expData.open,
//                 high: expData.high,
//                 low: expData.low,
//                 close: expData.close,
//                 volume: expData.volume
//             };

//             return { success: true, data: formattedData };

//         } catch (error) {
//             console.log(`⚠️ Expired API Error for ${optionType}:`, error.response?.data || error.message);
//             return { success: false, error: error.message };
//         }
//     });
// };

// module.exports = {
//     placeDhanOrder,
//     fetchLiveLTP,
//     fetchDhanHistoricalData,
//     fetchExpiredOptionData 
// };


// const axios = require('axios');

// // Dhan API Base URLs
// const DHAN_API_URL = 'https://api.dhan.co/orders';
// const DHAN_FEED_URL = 'https://api.dhan.co/v2/marketfeed/ltp'; 

// // ==============================================================
// // 🚦 THE TRAFFIC POLICE & CACHE SYSTEM (805 ERROR KILLER)
// // ==============================================================
// const API_DELAY_MS = 1000; // API calls ke beech 300ms ka gap
// let lastApiCallTime = 0;
// let apiQueue = Promise.resolve();

// // 🔥 NEW: LTP Cache System
// const ltpCache = new Map();
// const CACHE_TTL = 5000; // 2.5 seconds tak price yaad rakhega

// const enqueueApiCall = (apiFunction) => {
//     apiQueue = apiQueue.then(async () => {
//         const now = Date.now();
//         const timeSinceLastCall = now - lastApiCallTime;
        
//         if (timeSinceLastCall < API_DELAY_MS) {
//             await new Promise(resolve => setTimeout(resolve, API_DELAY_MS - timeSinceLastCall));
//         }
        
//         lastApiCallTime = Date.now(); 
//         return apiFunction(); 
//     }).catch(err => {
//         throw err; 
//     });
//     return apiQueue;
// };


// // ==========================================
// // 🛒 1. PLACE DHAN ORDER
// // ==========================================
// const placeDhanOrder = async (clientId, accessToken, orderData) => {
//     return enqueueApiCall(async () => { 
//         try {
//             const payload = {
//                 dhanClientId: clientId,
//                 correlationId: `TM-${Date.now()}`, 
//                 transactionType: orderData.action, 
//                 exchangeSegment: "NSE_FNO", 
//                 productType: "INTRADAY", 
//                 orderType: "MARKET", 
//                 validity: "DAY",
//                 securityId: orderData.securityId, 
//                 quantity: orderData.quantity
//             };

//             const response = await axios.post(DHAN_API_URL, payload, {
//                 headers: {
//                     'access-token': accessToken,
//                     'Content-Type': 'application/json',
//                     'Accept': 'application/json'
//                 }
//             });

//             console.log(`✅ [DHAN API] Order Placed Successfully for ${clientId}:`, response.data);
//             return { success: true, data: response.data };

//         } catch (error) {
//             console.error(`❌ [DHAN API] Order Failed for ${clientId}:`, error.response?.data || error.message);
//             return { success: false, error: error.response?.data || error.message };
//         }
//     });
// };

// // ==========================================
// // 📡 2. FETCH LIVE LTP (WITH SMART CACHING)
// // ==========================================
// const fetchLiveLTP = async (clientId, accessToken, exchange, securityId) => {
//     // 🔥 CACHE CHECK: Pehle dekho kya hamare paas taza (fresh) price pada hai?
//     const cacheKey = `${exchange}_${securityId}`;
//     const cachedData = ltpCache.get(cacheKey);
    
//     if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
//         // Agar 2.5 second ke andar data fetch hua tha, to Dhan ko mat chhedo, yahi se return kardo!
//         return cachedData.price;
//     }

//     return enqueueApiCall(async () => { 
//         try {
//             const payload = {};
//             payload[exchange] = [parseInt(securityId)];

//             const response = await axios.post(DHAN_FEED_URL, payload, {
//                 headers: {
//                     'access-token': accessToken,
//                     'client-id': clientId,
//                     'Content-Type': 'application/json',
//                     'Accept': 'application/json'
//                 }
//             });

//             const ltpData = response.data?.data;
//             if (ltpData && ltpData[exchange] && ltpData[exchange][securityId]) {
//                 const price = parseFloat(ltpData[exchange][securityId].last_price);
                
//                 // 🔥 CACHE UPDATE: Naya price memory me daal do agli requests ke liye
//                 ltpCache.set(cacheKey, { price: price, timestamp: Date.now() });
                
//                 return price;
//             }
//             return null;
//         } catch (error) {
//             console.error(`❌ [DHAN API] LTP Fetch Failed for ${securityId}:`, error.response?.data || error.message);
//             return null;
//         }
//     });
// };

// // ==========================================
// // 📊 3. FETCH HISTORICAL DATA (OHLCV)
// // ==========================================
// const fetchDhanHistoricalData = async (clientId, accessToken, securityId, exchangeSegment, instrumentType, fromDate, toDate, interval = "5") => {
//     return enqueueApiCall(async () => { 
//         try {
//             const isDaily = (interval.toUpperCase() === "D" || interval.toUpperCase() === "1D");
//             const url = isDaily ? 'https://api.dhan.co/v2/charts/historical' : 'https://api.dhan.co/v2/charts/intraday';
//             const formattedFromDate = isDaily ? fromDate : `${fromDate} 09:15:00`;
//             const formattedToDate = isDaily ? toDate : `${toDate} 15:30:00`;

//             const payload = {
//                 securityId: securityId.toString(),
//                 exchangeSegment: exchangeSegment, 
//                 instrument: instrumentType,       
//                 fromDate: formattedFromDate,               
//                 toDate: formattedToDate,
//             };

//             if (isDaily) {
//                 payload.expiryCode = 0; 
//             } else {
//                 payload.interval = parseInt(interval) || 5; 
//                 payload.oi = false;
//             }

//             const headers = {
//                 'client-id': clientId,
//                 'access-token': accessToken,
//                 'Content-Type': 'application/json',
//                 'Accept': 'application/json'
//             };

//             const response = await axios.post(url, payload, { headers });
            
//             const actualData = (response.data && response.data.data && response.data.data.open) ? response.data.data : response.data;

//             if (actualData && actualData.open && actualData.open.length > 0) {
//                 return { success: true, data: actualData };
//             } else {
//                 return { success: false, message: 'Invalid data format received from Dhan' };
//             }
//         } catch (error) {
//             const errData = error.response?.data;
//             const errorMsg = errData?.internalErrorMessage || errData?.errorMessage || error.message || "Unknown error occurred";
//             console.error(`❌ [Dhan API] Historical Fetch Error:`, errData || errorMsg);
//             return { success: false, message: errorMsg };
//         }
//     });
// };

// // ==========================================
// // 🕒 4. FETCH EXPIRED OPTION DATA
// // ==========================================
// const fetchExpiredOptionData = async (clientId, apiSecret, spotSecurityId, strike, optionType, fromDate, toDate) => {
//     return enqueueApiCall(async () => { 
//         try {
//             const payload = {
//                 exchangeSegment: "NSE_FNO",
//                 interval: "1",
//                 securityId: Number(spotSecurityId), 
//                 instrument: "OPTIDX",
//                 expiryFlag: "WEEK", 
//                 expiryCode: 1, 
//                 strike: "ATM", 
//                 drvOptionType: optionType === "CE" ? "CALL" : "PUT",
//                 requiredData: ["open", "high", "low", "close", "volume"],
//                 fromDate: fromDate,
//                 toDate: toDate
//             };

//             const response = await axios({
//                 method: 'post',
//                 url: 'https://api.dhan.co/v2/charts/rollingoption', 
//                 headers: {
//                     'access-token': apiSecret,
//                     'client-id': clientId,
//                     'Accept': 'application/json',
//                     'Content-Type': 'application/json'
//                 },
//                 data: payload
//             });

//             const optionKey = optionType === "CE" ? "ce" : "pe";
//             const expData = response.data.data ? response.data.data[optionKey] : null;

//             if (!expData || !expData.timestamp || expData.timestamp.length === 0) {
//                  return { success: false, error: "No data found in expired options" };
//             }

//             const formattedData = {
//                 start_Time: expData.timestamp,
//                 open: expData.open,
//                 high: expData.high,
//                 low: expData.low,
//                 close: expData.close,
//                 volume: expData.volume
//             };

//             return { success: true, data: formattedData };

//         } catch (error) {
//             console.log(`⚠️ Expired API Error for ${optionType}:`, error.response?.data || error.message);
//             return { success: false, error: error.message };
//         }
//     });
// };

// module.exports = {
//     placeDhanOrder,
//     fetchLiveLTP,
//     fetchDhanHistoricalData,
//     fetchExpiredOptionData 
// };



// const axios = require('axios');

// // Dhan API Base URLs
// const DHAN_API_URL = 'https://api.dhan.co/orders';
// const DHAN_FEED_URL = 'https://api.dhan.co/v2/marketfeed/ltp'; 

// // ==============================================================
// // 🚦 THE TRAFFIC POLICE & CACHE SYSTEM (805 ERROR KILLER)
// // ==============================================================
// const API_DELAY_MS = 1000; // API calls ke beech 300ms ka gap
// let lastApiCallTime = 0;
// let apiQueue = Promise.resolve();

// // 🔥 NEW: LTP Cache System
// const ltpCache = new Map();
// const CACHE_TTL = 5000; // 2.5 seconds tak price yaad rakhega

// const enqueueApiCall = (apiFunction) => {
//     apiQueue = apiQueue.then(async () => {
//         const now = Date.now();
//         const timeSinceLastCall = now - lastApiCallTime;
        
//         if (timeSinceLastCall < API_DELAY_MS) {
//             await new Promise(resolve => setTimeout(resolve, API_DELAY_MS - timeSinceLastCall));
//         }
        
//         lastApiCallTime = Date.now(); 
//         return apiFunction(); 
//     }).catch(err => {
//         throw err; 
//     });
//     return apiQueue;
// };


// // ==========================================
// // 🛒 1. PLACE DHAN ORDER (WITH AUTO-RETRY - DEADLOCK FIXED)
// // ==========================================
// const placeDhanOrder = async (clientId, accessToken, orderData) => {
//     const MAX_RETRIES = 3; 
//     const RETRY_DELAY_MS = 1500; 

//     return enqueueApiCall(async () => { 
//         // 🔥 DEADLOCK FIX: Recursion hatakar simple FOR loop laga diya
//         for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
//             try {
//                 const retrySuffix = attempt > 0 ? `-R${attempt}` : '';
//                 const payload = {
//                     dhanClientId: clientId,
//                     correlationId: `TM-${Date.now()}${retrySuffix}`, 
//                     transactionType: orderData.action, 
//                     exchangeSegment: "NSE_FNO", 
//                     productType: "INTRADAY", 
//                     orderType: "MARKET", 
//                     validity: "DAY",
//                     securityId: orderData.securityId, 
//                     quantity: orderData.quantity
//                 };

//                 const response = await axios.post(DHAN_API_URL, payload, {
//                     headers: {
//                         'access-token': accessToken,
//                         'Content-Type': 'application/json',
//                         'Accept': 'application/json'
//                     }
//                 });

//                 if (attempt > 0) {
//                      console.log(`✅ [DHAN API] Order Placed Successfully on Retry #${attempt} for ${clientId}`);
//                 } else {
//                      console.log(`✅ [DHAN API] Order Placed Successfully for ${clientId}:`, response.data);
//                 }
                
//                 return { success: true, data: response.data };

//             } catch (error) {
//                 const status = error.response?.status;
                
//                 // Agar server error hai aur attempts bache hain
//                 if ((status === 502 || status === 503 || status === 504 || error.code === 'ECONNABORTED' || !error.response) && attempt < MAX_RETRIES) {
//                     console.warn(`⚠️ [DHAN API] Server Error (${status || 'Network Issue'}) for ${clientId}. Retrying in ${RETRY_DELAY_MS/1000}s... (Attempt ${attempt + 1}/${MAX_RETRIES})`);
                    
//                     await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
//                     continue; // Agle try ke liye loop ko aage badhao (No deadlock!)
//                 }

//                 console.error(`❌ [DHAN API] Order Failed for ${clientId} after ${attempt} retries:`, error.response?.data || error.message);
//                 return { success: false, error: error.response?.data || error.message };
//             }
//         }
//     });
// };

// // ==========================================
// // 📡 2. FETCH LIVE LTP (WITH SMART CACHING)
// // ==========================================
// const fetchLiveLTP = async (clientId, accessToken, exchange, securityId) => {
//     // 🔥 CACHE CHECK: Pehle dekho kya hamare paas taza (fresh) price pada hai?
//     const cacheKey = `${exchange}_${securityId}`;
//     const cachedData = ltpCache.get(cacheKey);
    
//     if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
//         // Agar 2.5 second ke andar data fetch hua tha, to Dhan ko mat chhedo, yahi se return kardo!
//         return cachedData.price;
//     }

//     return enqueueApiCall(async () => { 
//         try {
//             const payload = {};
//             payload[exchange] = [parseInt(securityId)];

//             const response = await axios.post(DHAN_FEED_URL, payload, {
//                 headers: {
//                     'access-token': accessToken,
//                     'client-id': clientId,
//                     'Content-Type': 'application/json',
//                     'Accept': 'application/json'
//                 }
//             });

//             const ltpData = response.data?.data;
//             if (ltpData && ltpData[exchange] && ltpData[exchange][securityId]) {
//                 const price = parseFloat(ltpData[exchange][securityId].last_price);
                
//                 // 🔥 CACHE UPDATE: Naya price memory me daal do agli requests ke liye
//                 ltpCache.set(cacheKey, { price: price, timestamp: Date.now() });
                
//                 return price;
//             }
//             return null;
//         } catch (error) {
//             console.error(`❌ [DHAN API] LTP Fetch Failed for ${securityId}:`, error.response?.data || error.message);
//             return null;
//         }
//     });
// };

// // ==========================================
// // 📊 3. FETCH HISTORICAL DATA (OHLCV)
// // ==========================================
// const fetchDhanHistoricalData = async (clientId, accessToken, securityId, exchangeSegment, instrumentType, fromDate, toDate, interval = "5") => {
//     return enqueueApiCall(async () => { 
//         try {
//             const isDaily = (interval.toUpperCase() === "D" || interval.toUpperCase() === "1D");
//             const url = isDaily ? 'https://api.dhan.co/v2/charts/historical' : 'https://api.dhan.co/v2/charts/intraday';
//             const formattedFromDate = isDaily ? fromDate : `${fromDate} 09:15:00`;
//             const formattedToDate = isDaily ? toDate : `${toDate} 15:30:00`;

//             const payload = {
//                 securityId: securityId.toString(),
//                 exchangeSegment: exchangeSegment, 
//                 instrument: instrumentType,       
//                 fromDate: formattedFromDate,               
//                 toDate: formattedToDate,
//             };

//             if (isDaily) {
//                 payload.expiryCode = 0; 
//             } else {
//                 payload.interval = parseInt(interval) || 5; 
//                 payload.oi = false;
//             }

//             const headers = {
//                 'client-id': clientId,
//                 'access-token': accessToken,
//                 'Content-Type': 'application/json',
//                 'Accept': 'application/json'
//             };

//             const response = await axios.post(url, payload, { headers });
            
//             const actualData = (response.data && response.data.data && response.data.data.open) ? response.data.data : response.data;

//              // 🔥 THE MASTER FIX: Data normalization so the engine never crashes!
//             if (actualData && !actualData.start_Time && actualData.timestamp) {
//                 actualData.start_Time = actualData.timestamp; 
//             }
            
//             if (actualData && actualData.open && actualData.open.length > 0) {
//                 return { success: true, data: actualData };
//             } else {
//                 return { success: false, message: 'Invalid data format received from Dhan' };
//             }
//         } catch (error) {
//             const errData = error.response?.data;
//             const errorMsg = errData?.internalErrorMessage || errData?.errorMessage || error.message || "Unknown error occurred";
//             console.error(`❌ [Dhan API] Historical Fetch Error:`, errData || errorMsg);
//             return { success: false, message: errorMsg };
//         }
//     });
// };

// // ==========================================
// // 🕒 4. FETCH EXPIRED OPTION DATA
// // ==========================================
// const fetchExpiredOptionData = async (clientId, apiSecret, spotSecurityId, strike, optionType, fromDate, toDate) => {
//     return enqueueApiCall(async () => { 
//         try {
//             const payload = {
//                 exchangeSegment: "NSE_FNO",
//                 interval: "1",
//                 securityId: Number(spotSecurityId), 
//                 instrument: "OPTIDX",
//                 expiryFlag: "WEEK", 
//                 expiryCode: 1, 
//                 strike: "ATM", 
//                 drvOptionType: optionType === "CE" ? "CALL" : "PUT",
//                 requiredData: ["open", "high", "low", "close", "volume"],
//                 fromDate: fromDate,
//                 toDate: toDate
//             };

//             const response = await axios({
//                 method: 'post',
//                 url: 'https://api.dhan.co/v2/charts/rollingoption', 
//                 headers: {
//                     'access-token': apiSecret,
//                     'client-id': clientId,
//                     'Accept': 'application/json',
//                     'Content-Type': 'application/json'
//                 },
//                 data: payload
//             });

//             const optionKey = optionType === "CE" ? "ce" : "pe";
//             const expData = response.data.data ? response.data.data[optionKey] : null;

//             if (!expData || !expData.timestamp || expData.timestamp.length === 0) {
//                  return { success: false, error: "No data found in expired options" };
//             }

//             const formattedData = {
//                 start_Time: expData.timestamp,
//                 open: expData.open,
//                 high: expData.high,
//                 low: expData.low,
//                 close: expData.close,
//                 volume: expData.volume
//             };

//             return { success: true, data: formattedData };

//         } catch (error) {
//             console.log(`⚠️ Expired API Error for ${optionType}:`, error.response?.data || error.message);
//             return { success: false, error: error.message };
//         }
//     });
// };

// module.exports = {
//     placeDhanOrder,
//     fetchLiveLTP,
//     fetchDhanHistoricalData,
//     fetchExpiredOptionData 
// };




const axios = require('axios');

// Dhan API Base URLs
const DHAN_API_URL = 'https://api.dhan.co/orders';
const DHAN_FEED_URL = 'https://api.dhan.co/v2/marketfeed/ltp'; 

// ==============================================================
// 🚦 THE TRAFFIC POLICE & CACHE SYSTEM (805 ERROR KILLER)
// ==============================================================
const API_DELAY_MS = 1000; // API calls ke beech 300ms ka gap
let lastApiCallTime = 0;
let apiQueue = Promise.resolve();

// 🔥 NEW: LTP Cache System
const ltpCache = new Map();
const CACHE_TTL = 5000; // 2.5 seconds tak price yaad rakhega

const enqueueApiCall = (apiFunction) => {
    apiQueue = apiQueue.then(async () => {
        const now = Date.now();
        const timeSinceLastCall = now - lastApiCallTime;
        
        if (timeSinceLastCall < API_DELAY_MS) {
            await new Promise(resolve => setTimeout(resolve, API_DELAY_MS - timeSinceLastCall));
        }
        
        lastApiCallTime = Date.now(); 
        return apiFunction(); 
    }).catch(err => {
        throw err; 
    });
    return apiQueue;
};


// ==========================================
// 🛒 1. PLACE DHAN ORDER (WITH AUTO-RETRY - DEADLOCK FIXED)
// ==========================================
const placeDhanOrder = async (clientId, accessToken, orderData) => {
    const MAX_RETRIES = 3; 
    const RETRY_DELAY_MS = 1500; 

    return enqueueApiCall(async () => { 
        // 🔥 DEADLOCK FIX: Recursion hatakar simple FOR loop laga diya
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                const retrySuffix = attempt > 0 ? `-R${attempt}` : '';
                const payload = {
                    dhanClientId: clientId,
                    correlationId: `TM-${Date.now()}${retrySuffix}`, 
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

                if (attempt > 0) {
                     console.log(`✅ [DHAN API] Order Placed Successfully on Retry #${attempt} for ${clientId}`);
                } else {
                     console.log(`✅ [DHAN API] Order Placed Successfully for ${clientId}:`, response.data);
                }
                
                return { success: true, data: response.data };

            } catch (error) {
                const status = error.response?.status;
                
                // Agar server error hai aur attempts bache hain
                if ((status === 502 || status === 503 || status === 504 || error.code === 'ECONNABORTED' || !error.response) && attempt < MAX_RETRIES) {
                    console.warn(`⚠️ [DHAN API] Server Error (${status || 'Network Issue'}) for ${clientId}. Retrying in ${RETRY_DELAY_MS/1000}s... (Attempt ${attempt + 1}/${MAX_RETRIES})`);
                    
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                    continue; // Agle try ke liye loop ko aage badhao (No deadlock!)
                }

                console.error(`❌ [DHAN API] Order Failed for ${clientId} after ${attempt} retries:`, error.response?.data || error.message);
                return { success: false, error: error.response?.data || error.message };
            }
        }
    });
};

// ==========================================
// 📡 2. FETCH LIVE LTP (WITH SMART CACHING)
// ==========================================
const fetchLiveLTP = async (clientId, accessToken, exchange, securityId) => {
    // 🔥 CACHE CHECK: Pehle dekho kya hamare paas taza (fresh) price pada hai?
    const cacheKey = `${exchange}_${securityId}`;
    const cachedData = ltpCache.get(cacheKey);
    
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
        // Agar 2.5 second ke andar data fetch hua tha, to Dhan ko mat chhedo, yahi se return kardo!
        return cachedData.price;
    }

    return enqueueApiCall(async () => { 
        try {
            const payload = {};
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
            if (ltpData && ltpData[exchange] && ltpData[exchange][securityId]) {
                const price = parseFloat(ltpData[exchange][securityId].last_price);
                
                // 🔥 CACHE UPDATE: Naya price memory me daal do agli requests ke liye
                ltpCache.set(cacheKey, { price: price, timestamp: Date.now() });
                
                return price;
            }
            return null;
        } catch (error) {
            console.error(`❌ [DHAN API] LTP Fetch Failed for ${securityId}:`, error.response?.data || error.message);
            return null;
        }
    });
};

// ==========================================
// 📊 3. FETCH HISTORICAL DATA (OHLCV)
// ==========================================
const fetchDhanHistoricalData = async (clientId, accessToken, securityId, exchangeSegment, instrumentType, fromDate, toDate, interval = "5") => {
    return enqueueApiCall(async () => { 
        try {
            const isDaily = (interval.toUpperCase() === "D" || interval.toUpperCase() === "1D");
            const url = isDaily ? 'https://api.dhan.co/v2/charts/historical' : 'https://api.dhan.co/v2/charts/intraday';
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
                payload.interval = parseInt(interval) || 5; 
                payload.oi = false;
            }

            const headers = {
                'client-id': clientId,
                'access-token': accessToken,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };

            const response = await axios.post(url, payload, { headers });
            
            const actualData = (response.data && response.data.data && response.data.data.open) ? response.data.data : response.data;

             // 🔥 THE MASTER FIX: Data normalization so the engine never crashes!
            if (actualData && !actualData.start_Time && actualData.timestamp) {
                actualData.start_Time = actualData.timestamp; 
            }
            
            if (actualData && actualData.open && actualData.open.length > 0) {
                return { success: true, data: actualData };
            } else {
                return { success: false, message: 'Invalid data format received from Dhan' };
            }
        } catch (error) {
            const errData = error.response?.data;
            const errorMsg = errData?.internalErrorMessage || errData?.errorMessage || error.message || "Unknown error occurred";
            console.error(`❌ [Dhan API] Historical Fetch Error:`, errData || errorMsg);
            return { success: false, message: errorMsg };
        }
    });
};

/// ==========================================
// 🕒 4. FETCH EXPIRED OPTION DATA (SEBI COMPLIANT)
// ==========================================
const fetchExpiredOptionData = async (clientId, apiSecret, spotSecurityId, strike, optionType, fromDate, toDate, reqExpiry = "WEEKLY", interval = "1") => {
    return enqueueApiCall(async () => { 
        try {
            let expFlag = "WEEK";
            let expCode = 1; 

            const upperReqExpiry = reqExpiry.toUpperCase();
            
            // 🔥 SEBI RULE: Agar ID 13 (NIFTY 50) nahi hai, to zabardasti Monthly flag lagao!
            const forceMonthly = Number(spotSecurityId) !== 13;

            if (forceMonthly || upperReqExpiry === "MONTHLY") {
                expFlag = "MONTH";
                expCode = 1;
            } else if (upperReqExpiry === "NEXT WEEKLY" || upperReqExpiry === "NEXT WEEK") {
                expFlag = "WEEK";
                expCode = 2; 
            }

            const payload = {
                exchangeSegment: "NSE_FNO",
                interval: String(interval),
                securityId: Number(spotSecurityId), 
                instrument: "OPTIDX",
                expiryFlag: expFlag, 
                expiryCode: expCode, 
                strike: String(strike), 
                drvOptionType: optionType === "CE" ? "CALL" : "PUT",
                requiredData: ["open", "high", "low", "close", "volume"],
                fromDate: fromDate,
                toDate: toDate
            };

            const response = await axios({
                method: 'post',
                url: 'https://api.dhan.co/v2/charts/rollingoption', 
                headers: {
                    'access-token': apiSecret,
                    'client-id': clientId,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                data: payload
            });

            const optionKey = optionType === "CE" ? "ce" : "pe";
            const expData = response.data.data ? response.data.data[optionKey] : null;

            if (!expData || !expData.timestamp || expData.timestamp.length === 0) {
                 return { success: false, error: "No data found in expired options" };
            }

            const formattedData = {
                start_Time: expData.timestamp,
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
    });
};

module.exports = {
    placeDhanOrder,
    fetchLiveLTP,
    fetchDhanHistoricalData,
    fetchExpiredOptionData 
};