/**
 * ⚖️ PREMIUM DIFFERENCE LOGIC
 * Check karta hai ki kya CE aur PE ke premium ka difference user ki limit ke andar hai ya nahi.
 */

const checkPremiumDifference = (isPremiumDiffActive, maxDifference, currentLegsLtp) => {
    // Agar feature ON nahi hai, toh hamesha True return karo (entry allow kardo)
    if (!isPremiumDiffActive || maxDifference == null || maxDifference < 0) {
        return { isAllowed: true };
    }

    // Agar 2 se kam legs hain (Single leg strategy), toh premium diff ka koi matlab nahi
    if (currentLegsLtp.length < 2) {
        return { isAllowed: true };
    }

    // Pehle 2 legs ka ltp uthao (usually CE aur PE)
    const premium1 = currentLegsLtp[0] || 0;
    const premium2 = currentLegsLtp[1] || 0;

    // Agar LTP abhi tak nahi aaya hai (0 hai), toh wait karo
    if (premium1 === 0 || premium2 === 0) {
        return { 
            isAllowed: false, 
            reason: "Waiting for valid LTP to calculate difference." 
        };
    }

    // Absolute difference calculate karo (Math.abs ensures negative value na aaye)
    const actualDifference = Math.abs(premium1 - premium2);

    // Agar actual difference limit ke andar hai, toh Entry Allow karo
    if (actualDifference <= maxDifference) {
        return { 
            isAllowed: true, 
            actualDifference: actualDifference 
        };
    }

    // Agar gap zyada hai, toh Entry Block karo
    return { 
        isAllowed: false, 
        actualDifference: actualDifference,
        reason: `Premium Gap (₹${actualDifference.toFixed(2)}) is greater than allowed limit (₹${maxDifference}).`
    };
};

module.exports = { checkPremiumDifference };