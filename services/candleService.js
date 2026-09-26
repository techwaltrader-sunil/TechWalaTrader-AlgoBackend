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