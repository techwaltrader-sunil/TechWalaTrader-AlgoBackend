// ==============================================================
// 🏥 ADVANCE FEATURE: RE-ENTRY / EXECUTE LOGIC (The Hospital)
// ==============================================================

const evaluateReEntryLogic = (pendingTrade, currentIstDate, currentSpotPrice) => {
    const { reEntryConfig, originalEntryPrice, transaction, premiumChart } = pendingTrade;
    const { reEntryType, actionType } = reEntryConfig;

    let currentCandle = null;

    // 1. Agar Options Trade hai, toh uske 'Premium Chart' me current minute ki candle dhundo
    if (premiumChart && premiumChart.start_Time) {
        const exactMatchIndex = premiumChart.start_Time.findIndex(t => {
            const optTime = new Date(t * 1000 + (5.5 * 60 * 60 * 1000));
            return optTime.getUTCHours() === currentIstDate.getUTCHours() && optTime.getUTCMinutes() === currentIstDate.getUTCMinutes();
        });

        if (exactMatchIndex !== -1) {
            currentCandle = {
                open: premiumChart.open[exactMatchIndex],
                high: premiumChart.high[exactMatchIndex],
                low: premiumChart.low[exactMatchIndex],
                close: premiumChart.close[exactMatchIndex]
            };
        }
    } else {
        // Agar Equity/Future hai toh Spot price ko hi candle maan lo
        currentCandle = { open: currentSpotPrice, high: currentSpotPrice, low: currentSpotPrice, close: currentSpotPrice };
    }

    // Agar data missing hai, toh aage mat bado (Safe Fallback)
    if (!currentCandle) return { shouldRevive: false };

    let shouldRevive = false;
    let revivePrice = 0;

    // ---------------------------------------------------------
    // 🧠 LOGIC 1: ReExecute (Immediately enter without waiting)
    // ---------------------------------------------------------
    if (reEntryType === 'ReExecute') {
        shouldRevive = true;
        revivePrice = actionType === 'Immediate' ? currentCandle.open : currentCandle.close;
    } 
    // ---------------------------------------------------------
    // 🧠 LOGIC 2: ReEntry On Cost (Must touch Original Entry Price)
    // ---------------------------------------------------------
    else if (reEntryType === 'ReEntry On Cost') {
        const cost = originalEntryPrice;

        if (transaction === 'BUY') {
            // BUY ka SL niche hit hota hai, toh wapas upar (High) aakar Cost touch karna chahiye
            if (currentCandle.high >= cost) {
                shouldRevive = true;
                revivePrice = actionType === 'Immediate' ? cost : currentCandle.close;
            }
        } else if (transaction === 'SELL') {
            // SELL ka SL upar hit hota hai, toh wapas niche (Low) aakar Cost touch karna chahiye
            if (currentCandle.low <= cost) {
                shouldRevive = true;
                revivePrice = actionType === 'Immediate' ? cost : currentCandle.close;
            }
        }
    }
    // ---------------------------------------------------------
    // 🧠 LOGIC 3: ReEntry On Close (Candle Close must cross Cost)
    // ---------------------------------------------------------
    else if (reEntryType === 'ReEntry On Close') {
        const cost = originalEntryPrice;

        if (transaction === 'BUY' && currentCandle.close >= cost) {
            shouldRevive = true;
            revivePrice = currentCandle.close;
        } else if (transaction === 'SELL' && currentCandle.close <= cost) {
            shouldRevive = true;
            revivePrice = currentCandle.close;
        }
    }

    return { shouldRevive, revivePrice };
};

module.exports = { evaluateReEntryLogic };