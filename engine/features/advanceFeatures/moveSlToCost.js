// File: src/engine/features/advanceFeatures/moveSlToCost.js

// Yahan aap apne broker API aur DB functions import karenge (example ke liye)
// import { modifyDhanOrder } from '../../../utils/dhanApi.js';
// import { updateLegStatus } from '../../../database/legDb.js';

/**
 * Handle Move SL to Cost Logic
 * @param {Object} strategy - The complete strategy object containing legs and settings
 */
export const handleMoveSlToCost = async (strategy) => {
    try {
        // 1. SAFETY CHECK: Agar ye feature on nahi hai ya legs nahi hain, to turant wapas jao
        if (!strategy?.advanceSettings?.moveSLToCost || !strategy?.legs) return;

        const legs = strategy.legs;

        // 2. Pata lagao: Kya koi leg Profit/Target me kat chuka hai?
        // (Aapke database me status ka jo bhi naam ho, wo yahan daalein, jaise 'EXITED_TARGET')
        const targetHitLegs = legs.filter(leg => leg.status === 'EXITED_TARGET');
        
        // 3. Pata lagao: Kya koi leg abhi bhi market me chal raha hai?
        const activeLegs = legs.filter(leg => leg.status === 'ACTIVE');

        // 🔥 THE CORE LOGIC 🔥
        // Agar kam se kam 1 leg Target pe nikal gaya, aur dusra abhi chal raha hai...
        if (targetHitLegs.length > 0 && activeLegs.length > 0) {
            
            for (let activeLeg of activeLegs) {
                // 4. FLAG CHECK: Kya iska SL pehle hi cost par laya ja chuka hai? 
                // (Taki engine har second modify order ka spam na kare)
                if (!activeLeg.isSlMovedToCost) {
                    
                    console.log(`🛡️ [Advance Feature] Move SL to Cost Triggered for Leg ID: ${activeLeg.id}`);
                    
                    const newSlPrice = activeLeg.entryPrice; // SL ab kharid-bhav (Cost) par aayega

                    // 5. BROKER API CALL: Dhan (ya kisi aur broker) ko naya SL price bhejna
                    /*
                    await modifyDhanOrder({
                        orderId: activeLeg.slOrderId, // Purana SL order ID
                        orderType: 'STOP_LOSS',
                        price: newSlPrice,
                        triggerPrice: newSlPrice
                    });
                    */

                    // 6. DATABASE UPDATE: Update kar do ki SL move ho chuka hai aur naya price kya hai
                    /*
                    await updateLegStatus(activeLeg.id, {
                        isSlMovedToCost: true,
                        slPrice: newSlPrice
                    });
                    */

                    console.log(`✅ SL successfully moved to cost (₹${newSlPrice}) for Leg: ${activeLeg.id}`);
                }
            }
        }
    } catch (error) {
        console.error(`❌ [Advance Feature Error] Move SL to Cost failed for Strategy ${strategy.id}:`, error);
    }
};