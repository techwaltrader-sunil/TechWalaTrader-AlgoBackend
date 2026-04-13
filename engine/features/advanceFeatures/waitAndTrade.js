// File: src/engine/features/advanceFeatures/waitAndTrade.js

/**
 * ⏳ ADVANCE FEATURE 4: WAIT & TRADE
 * Signal aane ke baad turant entry nahi leni hai. 
 * Jab price user ke set kiye gaye Target (Breakout ya Pullback) ko touch karega, tabhi trade execute hoga.
 */

const processWaitAndTrade = (waitConfig, currentLtp, referencePrice) => {
    // Agar data missing hai, to default false (wait karo)
    if (!waitConfig || !referencePrice || !currentLtp) return { shouldExecute: false };

    // Puraane "Pt" wale config ko naye "Pt ↑" me convert kar liya backward compatibility ke liye
    const type = waitConfig.type === 'Pt' ? 'Pt ↑' : (waitConfig.type === '%' ? '% ↑' : waitConfig.type); 
    const movement = parseFloat(waitConfig.movement) || 0;

    // Agar movement 0 hai, to kisi chiz ka intezaar nahi karna, turant execute karo!
    if (movement === 0) return { shouldExecute: true, targetPrice: referencePrice }; 

    let targetPrice = 0;
    let shouldExecute = false;

    // 🚀 BREAKOUT LOGIC (Upar jaane par kharidna)
    if (type === '% ↑') {
        targetPrice = referencePrice + (referencePrice * (movement / 100));
        shouldExecute = currentLtp >= targetPrice;
    } 
    else if (type === 'Pt ↑') { 
        targetPrice = referencePrice + movement;
        shouldExecute = currentLtp >= targetPrice;
    } 
    // 🧲 PULLBACK LOGIC (Niche aakar support lene par kharidna)
    else if (type === '% ↓') {
        targetPrice = referencePrice - (referencePrice * (movement / 100));
        shouldExecute = currentLtp <= targetPrice;
    } 
    else if (type === 'Pt ↓') {
        targetPrice = referencePrice - movement;
        shouldExecute = currentLtp <= targetPrice;
    }

    return {
        shouldExecute,
        targetPrice: parseFloat(targetPrice.toFixed(2))
    };
};

module.exports = {
    processWaitAndTrade
};