const Deployment = require('../../../models/Deployment.js');
const { createAndEmitLog } = require('../../utils/logger.js');

/**
 * 🛡️ ADVANCE FEATURE 1: MOVE SL TO COST (With V-Shape Recovery)
 * @param {string} triggerEvent - Ye batayega ki function kab call hua ('LEG_EXIT' ya 'TRAILING_UPDATE')
 */
const handleMoveSlToCost = async (strategy, deployment, broker, triggerEvent = 'LEG_EXIT') => {
    try {
        // 1. Settings check karein
        const advanceSettings = strategy.data?.advanceSettings || {};
        const isMoveSlToCostEnabled = advanceSettings.moveSLToCost === true;
        const isIndependentLegs = advanceSettings.independentTrailingLegs === true; // V-Shape Flag

        if (!isMoveSlToCostEnabled) return; // Agar main feature OFF hai to wapas jao

        // 🔥 THE V-SHAPE RECOVERY LOGIC 🔥
        // Agar Independent legs ON hai, aur trigger 'TRAILING_UPDATE' hai, to SL cost par move NAHI karna hai!
        if (isIndependentLegs && triggerEvent === 'TRAILING_UPDATE') {
            console.log(`🛡️ [V-SHAPE RECOVERY] Independent Legs ON. Skipping Move SL to Cost during Trailing for ${strategy.name}`);
            return; 
        }

        console.log(`🛡️ [ADVANCE FEATURE] Running Move SL to Cost for Strategy: ${strategy.name} | Trigger: ${triggerEvent}`);

        let isUpdated = false;

        // 2. Loop through executed legs
        for (let leg of deployment.executedLegs) {
            
            // Jo leg abhi bhi ACTIVE hai aur jiska SL abhi tak move nahi hua hai
            if (leg.status === 'ACTIVE' && !leg.isSlMovedToCost) {
                
                const newSL = leg.entryPrice;

                // SL Update
                leg.trailingSL = newSL;
                leg.paperSlPrice = newSL;
                leg.isSlMovedToCost = true; 
                
                isUpdated = true;

                const logMessage = `🛡️ Risk Free! SL Moved to Cost (₹${newSL}) for ${leg.symbol}.`;
                console.log(logMessage);

                // 3. User ko UI par Live Notification bhejein
                if (broker) {
                    await createAndEmitLog(
                        broker,
                        leg.symbol,
                        'SYSTEM_UPDATE',
                        leg.quantity,
                        'SUCCESS',
                        logMessage
                    );
                }
            }
        }

        // 4. Agar array me kisi leg me update hua hai, tabhi Database save karein
        if (isUpdated) {
            await deployment.save();
        }

    } catch (error) {
        console.error("❌ Move SL to Cost Error:", error.message);
    }
};

module.exports = {
    handleMoveSlToCost
};