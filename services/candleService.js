// const axios = require('axios');
// const moment = require('moment-timezone');

// /**
//  * Dhan API से कैंडलस्टिक डेटा (OHLCV) फेच करने की सर्विस
//  * @param {String} clientId - Dhan Client ID
//  * @param {String} apiSecret - Dhan API Secret
//  * @param {String} exchange - Exchange Segment (e.g., 'NSE', 'BSE', 'NSE_FNO')
//  * @param {String} securityId - Instrument Security ID (e.g., '13' for Nifty)
//  * @param {String} instrumentType - Instrument Type ('INDEX', 'EQUITY', 'OPTIDX', 'FUTIDX')
//  * @param {String} resolution - Timeframe ('1', '5', '15', '60', '1D')
//  * @param {Number} daysBack - कितने दिन पुराना डेटा चाहिए (Default 1 for Intraday)
//  * @returns {Array} - Array of formatted OHLCV objects
//  */
// const fetchCandleData = async (clientId, apiSecret, exchange, securityId, instrumentType = 'INDEX', resolution = '1', daysBack = 1) => {
//     try {
//         // 1. Date Calculation (India Time)
//         const toDate = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");
//         // Agar weekend hai ya holidays hain, to jyada din peeche jana pad sakta hai, par intraday ke liye 1-3 din kafi hai
//         const fromDate = moment().tz("Asia/Kolkata").subtract(daysBack, 'days').format("YYYY-MM-DD");

//         const url = "https://api.dhan.co/v2/charts/historical";

//         const headers = {
//             "client-id": clientId,
//             "access-token": apiSecret,
//             "Content-Type": "application/json",
//             "Accept": "application/json"
//         };

//         const payload = {
//             securityId: String(securityId),
//             exchangeSegment: exchange,
//             instrument: instrumentType, 
//             expiryCode: 0, // 0 for Spot/Index/Equity
//             fromDate: fromDate,
//             toDate: toDate,
//             resolution: String(resolution)
//         };

//         const response = await axios.post(url, payload, { headers });

//         if (response.data && response.data.status === "success" && response.data.data) {
//             const rawData = response.data.data;
            
//             // Dhan API alag-alag arrays bhejta hai, humein ise Objects ki array me combine karna hai
//             const formattedCandles = [];
//             const length = rawData.start_Time.length;

//             for (let i = 0; i < length; i++) {
//                 formattedCandles.push({
//                     timestamp: rawData.start_Time[i], // Epoch time
//                     timeStr: moment(rawData.start_Time[i] * 1000).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
//                     open: rawData.open[i],
//                     high: rawData.high[i],
//                     low: rawData.low[i],
//                     close: rawData.close[i],
//                     volume: rawData.volume[i]
//                 });
//             }

//             return formattedCandles;
//         } else {
//             console.error(`⚠️ [CANDLE SERVICE] Dhan API returned empty or failed response for ${securityId}`);
//             return [];
//         }

//     } catch (error) {
//         console.error(`❌ [CANDLE SERVICE] Error fetching data for ${securityId}:`, error.response?.data || error.message);
//         return [];
//     }
// };

// module.exports = {
//     fetchCandleData
// };


// const axios = require('axios');
// const moment = require('moment-timezone');

// /**
//  * 🎯 SMART CANDLE SERVICE (Dhan API V2)
//  * Handles both Intraday (1-min) and Historical (1-Day) automatically.
//  */
// const fetchCandleData = async (clientId, apiSecret, exchange, securityId, instrumentType = 'INDEX', resolution = '1', daysBack = 5) => {
//     try {
//         // 🛡️ 1. THE SMART EXCHANGE FIX (Dhan API requires 'IDX_I' for Indices)
//         let safeExchange = exchange;
//         if (instrumentType === 'INDEX' && (exchange === 'NSE' || exchange === 'NSE_EQ')) {
//             safeExchange = 'IDX_I';
//         } else if (instrumentType === 'EQUITY' && exchange === 'NSE') {
//             safeExchange = 'NSE_EQ';
//         } else if (instrumentType === 'INDEX' && exchange === 'BSE') {
//             safeExchange = 'BSE_IDX';
//         }

//         // 🛡️ 2. THE SMART ENDPOINT FIX
//         const isIntraday = (resolution === '1' || resolution === '5' || resolution === '15');
//         const url = isIntraday 
//             ? "https://api.dhan.co/v2/charts/intraday"   // Intraday Data
//             : "https://api.dhan.co/v2/charts/historical"; // Daily Data

//         const headers = {
//             "client-id": clientId,
//             "access-token": apiSecret,
//             "Content-Type": "application/json",
//             "Accept": "application/json"
//         };

//         // 📅 Date Calculation
//         const toDate = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");
//         const fromDate = moment().tz("Asia/Kolkata").subtract(daysBack, 'days').format("YYYY-MM-DD");

//         let payload = {};

//         if (isIntraday) {
//             // 🎯 INTRADAY PAYLOAD (The Bug was here!)
//             payload = {
//                 securityId: String(securityId),
//                 exchangeSegment: safeExchange,
//                 instrument: instrumentType,
//                 interval: String(resolution), // ⚠️ Dhan uses 'interval' for Intraday
//                 fromDate: fromDate,           // ⚠️ Dates are REQUIRED
//                 toDate: toDate
//             };
//         } else {
//             // 📅 HISTORICAL PAYLOAD
//             payload = {
//                 securityId: String(securityId),
//                 exchangeSegment: safeExchange,
//                 instrument: instrumentType,
//                 resolution: String(resolution), // ⚠️ Dhan uses 'resolution' for Historical
//                 expiryCode: 0,
//                 fromDate: fromDate,
//                 toDate: toDate
//             };
//         }

//         const response = await axios.post(url, payload, { headers });

//         // 🔥 THE PARSER FIX: Dhan API कभी डेटा पैक करके देता है, और कभी सीधा!
//         let rawData = null;

//         if (response.data && response.data.data && response.data.data.start_Time) {
//             rawData = response.data.data; // Historical Wrapped Case
//         } else if (response.data && response.data.start_Time) {
//             rawData = response.data; // Intraday Direct Case
//         }

//         if (rawData && rawData.start_Time.length > 0) {
//             const formattedCandles = [];
//             const length = rawData.start_Time.length;

//             for (let i = 0; i < length; i++) {
//                 formattedCandles.push({
//                     timestamp: rawData.start_Time[i], 
//                     timeStr: moment(rawData.start_Time[i] * 1000).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
//                     open: rawData.open[i],
//                     high: rawData.high[i],
//                     low: rawData.low[i],
//                     close: rawData.close[i],
//                     volume: rawData.volume[i] || 0
//                 });
//             }

//             // कंसोल को साफ़ रखने के लिए एक छोटा सक्सेस मैसेज
//             // console.log(`✅ [CANDLE SERVICE] Successfully fetched ${length} candles for ID: ${securityId}`);
            
//             return formattedCandles;
//         } else {
//             console.error(`⚠️ [CANDLE SERVICE] Failed or Empty response for ${securityId}. Message:`, response.data);
//             return [];
//         }

//     } catch (error) {
//         console.error(`❌ [CANDLE SERVICE] API Error for ${securityId}:`, error.response?.data || error.message);
//         return [];
//     }
// };

// module.exports = {
//     fetchCandleData
// };





const axios = require('axios');
const moment = require('moment-timezone');

/**
 * 🎯 SMART CANDLE SERVICE (Dhan API V2)
 * Handles both Intraday (1-min) and Historical (1-Day) automatically.
 */
const fetchCandleData = async (clientId, apiSecret, exchange, securityId, instrumentType = 'INDEX', resolution = '1', daysBack = 5) => {
    try {
        // 🛡️ 1. THE SMART EXCHANGE FIX
        let safeExchange = exchange;
        if (instrumentType === 'INDEX' && (exchange === 'NSE' || exchange === 'NSE_EQ')) {
            safeExchange = 'IDX_I';
        } else if (instrumentType === 'EQUITY' && exchange === 'NSE') {
            safeExchange = 'NSE_EQ';
        } else if (instrumentType === 'INDEX' && exchange === 'BSE') {
            safeExchange = 'BSE_IDX';
        }

        // 🛡️ 2. THE SMART ENDPOINT FIX
        const isIntraday = (resolution === '1' || resolution === '5' || resolution === '15');
        const url = isIntraday 
            ? "https://api.dhan.co/v2/charts/intraday"
            : "https://api.dhan.co/v2/charts/historical";

        const headers = {
            "client-id": clientId,
            "access-token": apiSecret,
            "Content-Type": "application/json",
            "Accept": "application/json"
        };

        const toDate = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");
        const fromDate = moment().tz("Asia/Kolkata").subtract(daysBack, 'days').format("YYYY-MM-DD");

        let payload = {};
        if (isIntraday) {
            payload = {
                securityId: String(securityId),
                exchangeSegment: safeExchange,
                instrument: instrumentType,
                interval: String(resolution),
                fromDate: fromDate,
                toDate: toDate
            };
        } else {
            payload = {
                securityId: String(securityId),
                exchangeSegment: safeExchange,
                instrument: instrumentType,
                resolution: String(resolution),
                expiryCode: 0,
                fromDate: fromDate,
                toDate: toDate
            };
        }

        const response = await axios.post(url, payload, { headers });

        // 🔥 SUPER ROBUST PARSER 🔥
        let rawData = null;

        // 1. अगर डेटा 'data' ऑब्जेक्ट के अंदर लिपटा है (Historical Mode)
        if (response.data && response.data.data && response.data.data.open && response.data.data.open.length > 0) {
            rawData = response.data.data;
        } 
        // 2. अगर डेटा सीधा नंगा आ रहा है (Intraday Mode)
        else if (response.data && response.data.open && response.data.open.length > 0) {
            rawData = response.data;
        }

        // अगर हमें Open/Close मिल गया, मतलब डेटा एकदम सही है!
        if (rawData) {
            // 🎯 स्मार्ट तरीके से Time की चाबी ढूँढो (Capital T या Small t)
            const timeKey = rawData.start_Time ? 'start_Time' : (rawData.start_time ? 'start_time' : 'timestamp');
            const timeArray = rawData[timeKey];

            if (!timeArray || timeArray.length === 0) {
                 console.error(`⚠️ [CANDLE SERVICE] Time array missing for ${securityId}.`);
                 return [];
            }

            const formattedCandles = [];
            const length = rawData.open.length;

            for (let i = 0; i < length; i++) {
                formattedCandles.push({
                    timestamp: timeArray[i], 
                    timeStr: moment(timeArray[i] * 1000).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
                    open: rawData.open[i],
                    high: rawData.high[i],
                    low: rawData.low[i],
                    close: rawData.close[i],
                    volume: rawData.volume ? (rawData.volume[i] || 0) : 0
                });
            }

            // हरा सिग्नल: सब कुछ एकदम स्मूथ हो गया! 🟢
            console.log(`✅ [CANDLE SERVICE] Successfully Fetched & Parsed ${length} candles for ID: ${securityId}`);
            
            return formattedCandles;
        } else {
            // अगर सच में एरर है, तो सिर्फ छोटा सा मैसेज प्रिंट करो (पूरा कचरा नहीं)
            console.error(`⚠️ [CANDLE SERVICE] Failed response for ${securityId}. Message:`, JSON.stringify(response.data).substring(0, 150) + "...");
            return [];
        }

    } catch (error) {
        console.error(`❌ [CANDLE SERVICE] API Error for ${securityId}:`, error.response?.data || error.message);
        return [];
    }
};

module.exports = {
    fetchCandleData
};