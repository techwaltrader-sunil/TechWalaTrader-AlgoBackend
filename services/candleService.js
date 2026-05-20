const axios = require('axios');
const moment = require('moment-timezone');

/**
 * Dhan API से कैंडलस्टिक डेटा (OHLCV) फेच करने की सर्विस
 * @param {String} clientId - Dhan Client ID
 * @param {String} apiSecret - Dhan API Secret
 * @param {String} exchange - Exchange Segment (e.g., 'NSE', 'BSE', 'NSE_FNO')
 * @param {String} securityId - Instrument Security ID (e.g., '13' for Nifty)
 * @param {String} instrumentType - Instrument Type ('INDEX', 'EQUITY', 'OPTIDX', 'FUTIDX')
 * @param {String} resolution - Timeframe ('1', '5', '15', '60', '1D')
 * @param {Number} daysBack - कितने दिन पुराना डेटा चाहिए (Default 1 for Intraday)
 * @returns {Array} - Array of formatted OHLCV objects
 */
const fetchCandleData = async (clientId, apiSecret, exchange, securityId, instrumentType = 'INDEX', resolution = '1', daysBack = 1) => {
    try {
        // 1. Date Calculation (India Time)
        const toDate = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");
        // Agar weekend hai ya holidays hain, to jyada din peeche jana pad sakta hai, par intraday ke liye 1-3 din kafi hai
        const fromDate = moment().tz("Asia/Kolkata").subtract(daysBack, 'days').format("YYYY-MM-DD");

        const url = "https://api.dhan.co/v2/charts/historical";

        const headers = {
            "client-id": clientId,
            "access-token": apiSecret,
            "Content-Type": "application/json",
            "Accept": "application/json"
        };

        const payload = {
            securityId: String(securityId),
            exchangeSegment: exchange,
            instrument: instrumentType, 
            expiryCode: 0, // 0 for Spot/Index/Equity
            fromDate: fromDate,
            toDate: toDate,
            resolution: String(resolution)
        };

        const response = await axios.post(url, payload, { headers });

        if (response.data && response.data.status === "success" && response.data.data) {
            const rawData = response.data.data;
            
            // Dhan API alag-alag arrays bhejta hai, humein ise Objects ki array me combine karna hai
            const formattedCandles = [];
            const length = rawData.start_Time.length;

            for (let i = 0; i < length; i++) {
                formattedCandles.push({
                    timestamp: rawData.start_Time[i], // Epoch time
                    timeStr: moment(rawData.start_Time[i] * 1000).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
                    open: rawData.open[i],
                    high: rawData.high[i],
                    low: rawData.low[i],
                    close: rawData.close[i],
                    volume: rawData.volume[i]
                });
            }

            return formattedCandles;
        } else {
            console.error(`⚠️ [CANDLE SERVICE] Dhan API returned empty or failed response for ${securityId}`);
            return [];
        }

    } catch (error) {
        console.error(`❌ [CANDLE SERVICE] Error fetching data for ${securityId}:`, error.response?.data || error.message);
        return [];
    }
};

module.exports = {
    fetchCandleData
};