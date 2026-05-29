

const axios = require('axios');

// Dhan API Base URLs
const DHAN_API_URL = 'https://api.dhan.co/v2/orders';
const DHAN_FEED_URL = 'https://api.dhan.co/v2/marketfeed/ltp';

// ==============================================================
// 🚦 THE TRAFFIC POLICE & CACHE SYSTEM
// ==============================================================
const API_DELAY_MS = 1000;
let lastApiCallTime = 0;
let apiQueue = Promise.resolve();

const ltpCache = new Map();
const CACHE_TTL = 5000;

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
// 🛒 1. PLACE DHAN ORDER (🔥 APRIL 5th LOGIC RESTORED)
// ==========================================
const placeDhanOrder = async (clientId, accessToken, orderData) => {
    const MAX_RETRIES = 2;
    const RETRY_DELAY_MS = 1000;

    return enqueueApiCall(async () => {
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                // 🔥 EXACTLY 5th APRIL PAYLOAD (No extra fields)
                const payload = {
                    dhanClientId: clientId,
                    correlationId: `TM-${Date.now()}`, 
                    transactionType: orderData.action.toUpperCase(), 
                    exchangeSegment: orderData.segment || "NSE_FNO", 
                    productType: "INTRADAY",
                    
                    // 🔥 NAYA FIX YAHAN HAI: Agar engine ne orderType bheja hai, to wo use karo, warna MARKET.
                    orderType: orderData.orderType || "MARKET", 
                    validity: "DAY",
                    securityId: String(orderData.securityId), 
                    quantity: parseInt(orderData.quantity),
                    
                    // SL orders ke liye price and triggerPrice zaroori hota hai
                    price: orderData.price || 0,
                    triggerPrice: orderData.triggerPrice || 0
                };

                const response = await axios.post(DHAN_API_URL, payload, {
                    headers: {
                          'client-id': clientId,
                          'access-token': accessToken,
                          'Content-Type': 'application/json',
                          'Accept': 'application/json',
                          // 🔥 Cloudflare ko lagega ki ye koi normal insaan Chrome chala raha hai
                          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
                         },
                    timeout: 5000
                });

                console.log(`✅ [DHAN API] Order Placed Successfully for ${clientId}`);
                return { success: true, data: response.data };

            } catch (error) {
                const status = error.response?.status;

                if ((status === 502 || status === 503 || status === 504) && attempt < MAX_RETRIES) {
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                    continue;
                }

                // UI ke liye error extract karna
                const errorMsg = error.response?.data?.errorMessage || error.response?.data?.internalErrorMessage || error.message || "Dhan API Error";
                console.error(`❌ [DHAN API] Order Failed:`, errorMsg);
                return { success: false, data: { remarks: errorMsg } };
            }
        }
    });
};
// ==========================================
// 📡 2. FETCH LIVE LTP
// ==========================================
const fetchLiveLTP = async (clientId, accessToken, exchange, securityId) => {
    const cacheKey = `${exchange}_${securityId}`;
    const cachedData = ltpCache.get(cacheKey);
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) return cachedData.price;

    return enqueueApiCall(async () => {
        try {
            const payload = { [exchange]: [parseInt(securityId)] };
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
                ltpCache.set(cacheKey, { price: price, timestamp: Date.now() });
                return price;
            }
            return null;
        } catch (error) {
            console.error(`❌ [DHAN API] LTP Fetch Failed for ${securityId}:`, error.message);
            return null;
        }
    });
};

// ==========================================
// 📊 3. FETCH HISTORICAL DATA
// ==========================================
const fetchDhanHistoricalData = async (clientId, accessToken, securityId, exchangeSegment, instrumentType, fromDate, toDate, interval = "5") => {
    return enqueueApiCall(async () => {
        try {
            const isDaily = (interval.toUpperCase() === "D" || interval.toUpperCase() === "1D");
            const url = isDaily ? 'https://api.dhan.co/v2/charts/historical' : 'https://api.dhan.co/v2/charts/intraday';
            const payload = {
                securityId: securityId.toString(),
                exchangeSegment: exchangeSegment,
                instrument: instrumentType,
                fromDate: isDaily ? fromDate : `${fromDate} 09:15:00`,
                toDate: isDaily ? toDate : `${toDate} 15:30:00`,
            };
            if (isDaily) payload.expiryCode = 0;
            else { payload.interval = parseInt(interval) || 5; payload.oi = false; }

            const response = await axios.post(url, payload, {
                headers: {
                    'client-id': clientId,
                    'access-token': accessToken,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 8000,
                maxRedirects: 0,
                validateStatus: status => status >= 200 && status < 300
            });
            const actualData = (response.data && response.data.data && response.data.data.open) ? response.data.data : response.data;
            if (actualData && !actualData.start_Time && actualData.timestamp) actualData.start_Time = actualData.timestamp;
            if (actualData && actualData.open && actualData.open.length > 0) return { success: true, data: actualData };
            return { success: false, message: 'Invalid data format received' };
        } catch (error) {
            return { success: false, message: error.response?.data?.errorMessage || error.message };
        }
    });
};

// ==========================================
// 🕒 4. FETCH EXPIRED OPTION DATA
// ==========================================
const fetchExpiredOptionData = async (clientId, apiSecret, spotSecurityId, strike, optionType, fromDate, toDate, reqExpiry = "WEEKLY", interval = "1") => {
    return enqueueApiCall(async () => {
        try {
            let expFlag = "WEEK", expCode = 1;
            if (Number(spotSecurityId) !== 13 || reqExpiry.toUpperCase() === "MONTHLY") { expFlag = "MONTH"; expCode = 1; }
            else if (reqExpiry.toUpperCase() === "NEXT WEEKLY" || reqExpiry.toUpperCase() === "NEXT WEEK") { expFlag = "WEEK"; expCode = 2; }

            const payload = {
                exchangeSegment: "NSE_FNO", interval: String(interval), securityId: Number(spotSecurityId),
                instrument: "OPTIDX", expiryFlag: expFlag, expiryCode: expCode, strike: String(strike),
                drvOptionType: optionType === "CE" ? "CALL" : "PUT", requiredData: ["open", "high", "low", "close", "volume"],
                fromDate: fromDate, toDate: toDate
            };

            const response = await axios.post('https://api.dhan.co/v2/charts/rollingoption', payload, {
                headers: { 'access-token': apiSecret, 'client-id': clientId, 'Accept': 'application/json', 'Content-Type': 'application/json' },
                timeout: 8000, maxRedirects: 0, validateStatus: status => status >= 200 && status < 300
            });
            
            const expData = response.data.data ? response.data.data[optionType === "CE" ? "ce" : "pe"] : null;
            if (!expData || !expData.timestamp || expData.timestamp.length === 0) return { success: false, error: "No data" };
            
            // 🔥 YAHAN FIX KIYA HAI: Kati hui line ko pura kar diya gaya hai
            return { success: true, data: { start_Time: expData.timestamp, open: expData.open, high: expData.high, low: expData.low, close: expData.close, volume: expData.volume } };
            
        } catch (error) { 
            return { success: false, error: error.message }; 
        }
    }); // 🔥 Yahan semicolon (;) bhi add kar diya hai
};

// ==========================================
// 🗑️ 5. CANCEL DHAN ORDER
// ==========================================
const cancelDhanOrder = async (clientId, accessToken, orderId) => {
    return enqueueApiCall(async () => {
        try {
            const response = await axios.delete(`${DHAN_API_URL}/${orderId}`, {
                headers: { 'access-token': accessToken, 'client-id': clientId, 'Content-Type': 'application/json', 'Accept': 'application/json' },
                timeout: 5000
            });
            return { success: true, data: response.data };
        } catch (error) {
            const errorMsg = error.response?.data?.errorMessage || error.message;
            if (errorMsg.toLowerCase().includes('already') || errorMsg.toLowerCase().includes('not open')) return { success: true, message: "Already processed" };
            return { success: false, error: errorMsg };
        }
    });
};

// 🔥 MOST IMPORTANT: EXPORTS
module.exports = {
    placeDhanOrder,
    fetchLiveLTP,
    fetchDhanHistoricalData,
    fetchExpiredOptionData,
    cancelDhanOrder
};

