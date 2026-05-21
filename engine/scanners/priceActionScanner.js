// /**
//  * SMC & Price Action Scanner
//  * यह कैंडल्स का डेटा लेकर Swing High/Low और BOS/CHoCH डिटेक्ट करेगा
//  */

// // Swing High/Low पहचानने का फंक्शन
// const identifySwings = (candles) => {
//     let swings = [];
//     for (let i = 1; i < candles.length - 1; i++) {
//         const prev = candles[i - 1];
//         const curr = candles[i];
//         const next = candles[i + 1];

//         // Swing High: करंट कैंडल का हाई पिछले और अगले दोनों से ज्यादा है
//         if (curr.high > prev.high && curr.high > next.high) {
//             swings.push({ type: 'HIGH', price: curr.high, index: i });
//         }
//         // Swing Low: करंट कैंडल का लो पिछले और अगले दोनों से कम है
//         else if (curr.low < prev.low && curr.low < next.low) {
//             swings.push({ type: 'LOW', price: curr.low, index: i });
//         }
//     }
//     return swings;
// };

// // Break of Structure (BOS) चेक करने का फंक्शन
// const checkBOS = (candles, swings) => {
//     const lastSwing = swings[swings.length - 1];
//     const currentPrice = candles[candles.length - 1].close;

//     if (lastSwing.type === 'HIGH' && currentPrice > lastSwing.price) {
//         return { signal: 'BULLISH', type: 'BOS' };
//     }
//     if (lastSwing.type === 'LOW' && currentPrice < lastSwing.price) {
//         return { signal: 'BEARISH', type: 'BOS' };
//     }
//     return null;
// };

// module.exports = { identifySwings, checkBOS };


/**
 * Advanced Price Action Scanner - SMC Logic
 */

// स्विंग्स डिटेक्ट करना (आसान भाषा में: मार्केट के लेवल्स को मार्क करना)
const identifySwings = (candles) => {
    let swings = [];
    // यहाँ i = 1 से शुरू करें, और स्विंग बनाने की कंडीशन को आसान करें
    for (let i = 1; i < candles.length - 1; i++) {
        const prev = candles[i - 1];
        const curr = candles[i];
        const next = candles[i + 1];

        // थोड़ा ढीला रखें (>= या <= का प्रयोग करें)
        if (curr.high >= prev.high && curr.high >= next.high) {
            swings.push({ type: 'HIGH', price: curr.high, index: i });
        } else if (curr.low <= prev.low && curr.low <= next.low) {
            swings.push({ type: 'LOW', price: curr.low, index: i });
        }
    }
    return swings;
};

// एडवांस स्कैनर: BOS और CHoCH को पहचानना
const checkPriceActionSignal = (candles, swings, setupType) => {
    // console.log(`🔍 Scanner Running | Swings Found: ${swings.length} | Last Price: ${candles[candles.length - 1].close}`);
    if (swings.length < 3) return { long: false, short: false };

    const lastSwing = swings[swings.length - 1];
    const prevSwing = swings[swings.length - 2];
    const currentPrice = candles[candles.length - 1].close;

    let signal = { long: false, short: false };

    // 1. BOS (Break of Structure): ट्रेंड जारी रहने का सिग्नल
    if (setupType === "BOS (Break of Structure)") {
        // Bullish BOS (पिछले हाई को तोड़ा)
        if (lastSwing.type === 'HIGH' && currentPrice > lastSwing.price) {
            signal = { long: true, short: false, reason: "BOS Bullish" };
        }
        // 🔥 THE FIX: Bearish BOS (पिछले लो को तोड़ा) - यह मिसिंग था!
        else if (lastSwing.type === 'LOW' && currentPrice < lastSwing.price) {
            signal = { long: false, short: true, reason: "BOS Bearish" };
        }
    }

    // 2. CHoCH (Change of Character): ट्रेंड रिवर्सल का सिग्नल
    else if (setupType === "CHoCH (Change of Character)") {
        // बुलिश CHoCH
        if (lastSwing.type === 'HIGH' && prevSwing.type === 'LOW' && currentPrice > lastSwing.price) {
            signal = { long: true, short: false, reason: `CHoCH Bullish` };
        }
        // बेयरिश CHoCH
        else if (lastSwing.type === 'LOW' && prevSwing.type === 'HIGH' && currentPrice < lastSwing.price) {
            signal = { long: false, short: true, reason: `CHoCH Bearish` };
        }
    }

    return signal;
};

module.exports = { identifySwings, checkPriceActionSignal };