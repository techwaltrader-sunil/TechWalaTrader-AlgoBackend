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
    for (let i = 1; i < candles.length - 1; i++) {
        const prev = candles[i - 1];
        const curr = candles[i];
        const next = candles[i + 1];

        // Swing High: करंट हाई पिछले और अगले से बड़ा
        if (curr.high > prev.high && curr.high > next.high) {
            swings.push({ type: 'HIGH', price: curr.high, index: i });
        } 
        // Swing Low: करंट लो पिछले और अगले से छोटा
        else if (curr.low < prev.low && curr.low < next.low) {
            swings.push({ type: 'LOW', price: curr.low, index: i });
        }
    }
    return swings;
};

// एडवांस स्कैनर: BOS और CHoCH को पहचानना
const checkPriceActionSignal = (candles, swings, setupType) => {
    if (swings.length < 3) return { long: false, short: false };

    const lastSwing = swings[swings.length - 1];
    const prevSwing = swings[swings.length - 2];
    const currentPrice = candles[candles.length - 1].close;

    let signal = { long: false, short: false };

    // 1. BOS (Break of Structure): ट्रेंड जारी रहने का सिग्नल
    if (setupType === "BOS (Break of Structure)") {
        if (lastSwing.type === 'HIGH' && currentPrice > lastSwing.price) {
            return { long: true, short: false, reason: `BOS Bullish: Price ${currentPrice.toFixed(2)} > Swing High ${lastSwing.price}` };
        }
        if (lastSwing.type === 'LOW' && currentPrice < lastSwing.price) {
            return { long: false, short: true, reason: `BOS Bearish: Price ${currentPrice.toFixed(2)} < Swing Low ${lastSwing.price}` };
        }
    }

    // 2. CHoCH (Change of Character): ट्रेंड रिवर्सल का सिग्नल (सबसे पावरफुल)
    else if (setupType === "CHoCH (Change of Character)") {
    // अगर पिछले दो स्विंग्स LOW थे और अब नया हाई बना है, तो बुलिश CHoCH
    // यहाँ हम 'lastSwing' की कीमत को 'Break' मान रहे हैं
    if (lastSwing.type === 'HIGH' && prevSwing.type === 'LOW' && currentPrice > lastSwing.price) {
        signal.long = true;
        signal.reason = `CHoCH Bullish: Price ${currentPrice.toFixed(2)} broke above last High ${lastSwing.price.toFixed(2)}`;
    }
    // अगर पिछले दो स्विंग्स HIGH थे और अब नया लो बना है, तो बेयरिश CHoCH
    if (lastSwing.type === 'LOW' && prevSwing.type === 'HIGH' && currentPrice < lastSwing.price) {
        signal.short = true;
        signal.reason = `CHoCH Bearish: Price ${currentPrice.toFixed(2)} broke below last Low ${lastSwing.price.toFixed(2)}`;
    }
}

    return signal;
};

module.exports = { identifySwings, checkPriceActionSignal };