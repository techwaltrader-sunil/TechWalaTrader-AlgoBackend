/**
 * 🎯 TRAIL SL LOGIC (Sniper Guard)
 * Har leg ka individual stoploss trail karta hai.
 */

const calculateTrailedSL = (action, entryPrice, initialSL, currentLTP, trailConfig, currentTrailedSL) => {
    // Agar config theek nahi hai, toh purana SL hi return kardo
    if (!trailConfig) return currentTrailedSL !== null ? currentTrailedSL : initialSL;
    
    const { trailType, x, y } = trailConfig;

    // Agar X ya Y 0 hai, toh trailing nahi hogi
    if (!x || !y || x <= 0 || y <= 0) {
        return currentTrailedSL !== null ? currentTrailedSL : initialSL;
    }

    // 1. Percentage (%) ko Points me convert karo (Agar user ne % select kiya hai)
    const actualX = trailType === '%' ? (entryPrice * x) / 100 : x;
    const actualY = trailType === '%' ? (entryPrice * y) / 100 : y;

    let profitPoints = 0;

    // 2. Calculate karo ki abhi kitna profit chal raha hai (Points me)
    if (action === "BUY") {
        profitPoints = currentLTP - entryPrice;
    } else if (action === "SELL") {
        profitPoints = entryPrice - currentLTP;
    }

    // 3. Agar price hamare favor me X points gaya hai, tabhi trail karenge
    if (profitPoints >= actualX) {
        // Pata lagao ki kitne "Steps" achieve hue hain? (Jaise agar X=10 hai, aur profit 25 point hai, toh 2 steps hue)
        const steps = Math.floor(profitPoints / actualX);

        let newSL = initialSL;
        const referenceSL = currentTrailedSL !== null ? currentTrailedSL : initialSL;

        // 4. Naya SL calculate karo aur ensure karo ki SL peeche na jaye
        if (action === "BUY") {
            newSL = initialSL + (steps * actualY);
            // BUY me naya SL hamesha purane se bada (upar) hona chahiye
            if (newSL > referenceSL) {
                return parseFloat(newSL.toFixed(2));
            }
        } else if (action === "SELL") {
            newSL = initialSL - (steps * actualY);
            // SELL me naya SL hamesha purane se chhota (neeche) hona chahiye
            if (newSL < referenceSL) {
                return parseFloat(newSL.toFixed(2));
            }
        }
    }

    // Agar price wapas palat gaya, toh purana trailed SL hi maintain rakho
    return currentTrailedSL !== null ? currentTrailedSL : initialSL;
};

module.exports = { calculateTrailedSL };