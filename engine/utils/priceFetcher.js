// File: src/engine/utils/priceFetcher.js
const axios = require('axios');

/**
 * 🚀 THE FINAL PRICE FETCHER (TradingView + Yahoo Fallback)
 */
const fetchLivePrice = async (symbol) => {
    const baseSymbol = symbol.toUpperCase();
    try {
        console.log(`📡 Fetching Live Price for ${baseSymbol}...`);

        // 🔥 LAYER 1: TRADINGVIEW (The True Savior)
        let tvTicker = "";
        if (baseSymbol.includes("MIDCP") || baseSymbol.includes("MIDCAP")) tvTicker = "NSE:NIFTY_MID_SELECT";
        else if (baseSymbol.includes("BANKNIFTY")) tvTicker = "NSE:BANKNIFTY";
        else if (baseSymbol.includes("FINNIFTY")) tvTicker = "NSE:FINNIFTY";
        else if (baseSymbol.includes("NIFTY")) tvTicker = "NSE:NIFTY";
        else if (baseSymbol.includes("SENSEX")) tvTicker = "BSE:SENSEX";

        if (tvTicker) {
            try {
                const tvRes = await axios.post('https://scanner.tradingview.com/india/scan', {
                    "symbols": { "tickers": [tvTicker] },
                    "columns": ["close"]
                }, { headers: { 'Content-Type': 'application/json' } });

                if (tvRes.data && tvRes.data.data && tvRes.data.data.length > 0) {
                    const ltp = parseFloat(tvRes.data.data[0].d[0]);
                    if (ltp) {
                        console.log(`✅ [DEBUG] TradingView LTP for ${baseSymbol}: ${ltp}`);
                        return ltp;
                    }
                } else {
                    console.log(`⚠️ TradingView ko '${tvTicker}' nahi mila (Empty Data)`);
                }
            } catch (e) { 
                console.log(`⚠️ [LAYER 1 FAILED] TradingView Error: ${e.message}`); 
            }
        }

        // 🔥 LAYER 2: YAHOO FINANCE FALLBACK
        let yahooTicker = "";
        if (baseSymbol.includes("BANKNIFTY")) yahooTicker = "^NSEBANK";
        else if (baseSymbol.includes("FINNIFTY")) yahooTicker = "NIFTY_FIN_SERVICE.NS";
        else if (baseSymbol.includes("NIFTY") && !baseSymbol.includes("MIDCP")) yahooTicker = "^NSEI";
        else if (baseSymbol.includes("SENSEX")) yahooTicker = "^BSESN";

        if (yahooTicker) {
            try {
                const yUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=1m`;
                const yRes = await axios.get(yUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                if (yRes.data && yRes.data.chart && yRes.data.chart.result) {
                    const ltp = parseFloat(yRes.data.chart.result[0].meta.regularMarketPrice);
                    if (ltp) {
                        console.log(`✅ [DEBUG] Yahoo LTP for ${baseSymbol}: ${ltp}`);
                        return ltp;
                    }
                }
            } catch (e) { 
                console.log(`⚠️ [LAYER 2 FAILED] Yahoo Error: ${e.message}`); 
            }
        }

        console.log(`❌ [CRITICAL] ALL APIS FAILED to fetch Spot Price for ${baseSymbol}`);
        return null;

    } catch (error) {
        console.error(`❌ [DEBUG] Code Crash in fetchLivePrice:`, error.message);
        return null;
    }
};

// 🔥 YAHAN EXPORT KARNA HAI
module.exports = {
    fetchLivePrice
};