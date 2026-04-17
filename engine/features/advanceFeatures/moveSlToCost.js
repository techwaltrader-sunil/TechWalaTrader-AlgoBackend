// // File: src/engine/features/advanceFeatures/moveSlToCost.js

// const Deployment = require('../../../models/Deployment.js');
// const { createAndEmitLog } = require('../../utils/logger.js');

// /**
//  * 🛡️ ADVANCE FEATURE 1: MOVE SL TO COST
//  * Ye function tab call hoga jab kisi ek leg ka Target hit ho jaye.
//  * Ye bache hue sabhi active legs ka SL utha kar unke Entry Price par set kar dega.
//  */
// const handleMoveSlToCost = async (strategy, triggeredDeployment, broker) => {
//     try {
//         // 1. Check karein ki user ne strategy me ye feature ON kiya hai ya nahi
//         const advanceData = strategy.data?.advanceFeatures || {};
//         const isMoveSlToCostEnabled = advanceData.moveSlToCost === true || advanceData.moveSlToCost === 'ON';

//         if (!isMoveSlToCostEnabled) return; // Agar feature OFF hai to wapas jao

//         console.log(`🛡️ [ADVANCE FEATURE] Move SL to Cost triggered by target hit in ${triggeredDeployment.tradedSymbol}`);

//         // 2. Database me same strategy aur same broker ke dusre ACTIVE legs dhundhein
//         const otherActiveLegs = await Deployment.find({
//             strategyId: triggeredDeployment.strategyId,
//             brokerId: triggeredDeployment.brokerId,
//             status: 'ACTIVE',
//             _id: { $ne: triggeredDeployment._id } // Jis leg ne target hit kiya hai, usko chhod kar
//         });

//         // Agar koi aur leg bacha hi nahi hai, to aage badhne ki zarurat nahi
//         if (otherActiveLegs.length === 0) {
//             console.log("ℹ️ Koi aur active leg nahi mila Move SL to Cost ke liye.");
//             return;
//         }

//         // 3. Bache hue sabhi legs ka SL cost par move karein
//         for (let leg of otherActiveLegs) {
            
//             // Agar pehle hi move ho chuka hai, to ignore karein
//             if (leg.isSlMovedToCost) continue;

//             const oldSL = leg.trailingSL || leg.paperSlPrice || 0;
//             const newSL = leg.entryPrice;

//             // SL Update (Live SL aur Trailing SL dono ko Cost par le aaye)
//             leg.trailingSL = newSL;
//             leg.paperSlPrice = newSL;
//             leg.isSlMovedToCost = true; // 🔥 Flag set karein taki baar-baar update na ho
            
//             await leg.save();

//             const logMessage = `🛡️ Risk Free! SL Moved to Cost (₹${newSL}) for ${leg.tradedSymbol} because another leg hit target.`;
//             console.log(logMessage);

//             // 4. User ko UI par Live Notification (Log) bhejein
//             if (broker) {
//                 await createAndEmitLog(
//                     broker,
//                     leg.tradedSymbol,
//                     'SYSTEM_UPDATE',
//                     leg.tradedQty,
//                     'SUCCESS',
//                     logMessage
//                 );
//             }
//         }

//     } catch (error) {
//         console.error("❌ Move SL to Cost Error:", error.message);
//     }
// };

// module.exports = {
//     handleMoveSlToCost
// };


// File: src/engine/features/advanceFeatures/moveSlToCost.js

const Deployment = require('../../../models/Deployment.js');
const { createAndEmitLog } = require('../../utils/logger.js');

/**
 * 🛡️ ADVANCE FEATURE 1: MOVE SL TO COST
 * Ye function tab call hoga jab kisi ek leg ka Target/SL hit ho jaye.
 * Ye bache hue sabhi ACTIVE legs ka SL utha kar unke Entry Price par set kar dega.
 */
const handleMoveSlToCost = async (strategy, deployment, broker) => {
    try {
        // 1. Check karein ki user ne strategy me ye feature ON kiya hai ya nahi
        const isMoveSlToCostEnabled = strategy.data?.advanceSettings?.moveSLToCost === true;

        if (!isMoveSlToCostEnabled) return; // Agar feature OFF hai to wapas jao

        console.log(`🛡️ [ADVANCE FEATURE] Checking Move SL to Cost for Strategy: ${strategy.name}`);

        let isUpdated = false;

        // 2. 🔥 THE FIX: Ab hum DB me dusra deployment nahi dhundhenge!
        // Hum sidhe isi deployment ke 'executedLegs' array me loop chalayenge
        for (let leg of deployment.executedLegs) {
            
            // Jo leg abhi bhi ACTIVE hai aur jiska SL abhi tak move nahi hua hai
            if (leg.status === 'ACTIVE' && !leg.isSlMovedToCost) {
                
                const newSL = leg.entryPrice;

                // SL Update (Live SL aur Trailing SL dono ko Cost par le aaye)
                leg.trailingSL = newSL;
                leg.paperSlPrice = newSL;
                leg.isSlMovedToCost = true; // Flag set karein taki baar-baar loop run na ho
                
                isUpdated = true;

                const logMessage = `🛡️ Risk Free! SL Moved to Cost (₹${newSL}) for ${leg.symbol}.`;
                console.log(logMessage);

                // 3. User ko UI par Live Notification (Log) bhejein
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
