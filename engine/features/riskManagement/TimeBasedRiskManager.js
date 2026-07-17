// // File: src/engine/features/TimeBasedRiskManager.js

// class TimeBasedRiskManager {
//     // 🌟 baseOnePercentAmount = आपके टोटल कैपिटल का एग्ज़ैक्ट 1% (e.g. ₹9,140)
//     // 🌟 isRecoveryMode = क्या यह नॉर्मल ट्रेड है या Firefighting?
//     // 🌟 actualRiskAmount = रिकवरी में हम पूरा 1% रिस्क नहीं लेते, सिर्फ बचा हुआ अमाउंट लेते हैं
//     constructor(baseOnePercentAmount, isRecoveryMode = false, actualRiskAmount = null) {
//         this.baseOnePercent = baseOnePercentAmount;
//         this.isRecoveryMode = isRecoveryMode;

//         // 🧮 सारे की-लेवल्स (Key Levels) टोटल कैपिटल के बेस पर कैलकुलेट कर लिए
//         this.pointTwoPercent = this.baseOnePercent * 0.2;   // 0.2%
//         this.pointFourPercent = this.baseOnePercent * 0.4;  // 0.4%
//         this.pointFivePercent = this.baseOnePercent * 0.5;  // 0.5%
//         this.pointEightPercent = this.baseOnePercent * 0.8; // 0.8%
//         this.onePercentCap = this.baseOnePercent * 1.0;     // 1.0%

//         // 🎯 Initial Stop Loss सेट करना
//         // मेन ट्रेड में पूरा 1% का SL होगा, लेकिन रिकवरी में सिर्फ तय किया हुआ रिस्क (e.g., बचे हुए का 50%)
//         let startingRisk = actualRiskAmount !== null ? actualRiskAmount : this.baseOnePercent;
//         this.currentSlLevel = -Math.abs(startingRisk);

//         this.highestMTM = 0;                  // अब तक का सबसे ज्यादा प्रॉफिट
//         this.isC2CLocked = false;             // Cost to Cost लॉक हुआ या नहीं?
//     }

//     // ⏳ यह फंक्शन हर सेकंड मार्केट की नई टिक (LTP) आने पर कॉल होगा
//     evaluateRisk(currentMTM, currentTimeStr) {
        
//         // 1. MTM का हाईएस्ट पॉइंट ट्रैक करें (Trailing के लिए ज़रूरी)
//         if (currentMTM > this.highestMTM) {
//             this.highestMTM = currentMTM;
//         }

//         const [hours, minutes] = currentTimeStr.split(':').map(Number);
//         const timeInMinutes = (hours * 60) + minutes;
        
//         const time12PM = 12 * 60;       // 720 minutes
//         const time230PM = (14 * 60) + 30; // 870 minutes

//         if (this.isRecoveryMode) {
//             // ========================================================
//             // 🚑 RECOVERY MODE RULES (Firefighting Exit Logic)
//             // ========================================================
            
//             // 🔴 रूल 1: जैसे ही 0.4% प्रॉफिट आए, ट्रेड को Cost 2 Cost (0) कर दो
//             if (!this.isC2CLocked && this.highestMTM >= this.pointFourPercent) {
//                 this.currentSlLevel = 0;
//                 this.isC2CLocked = true;
//                 console.log("🚑 [RECOVERY TRAIL] Profit crossed 0.4%. SL locked at Cost-to-Cost (0).");
//             }

//             // 🔴 रूल 2 & 3: प्रॉफिट 1% पार करे तो 0.5% पर लॉक करो, फिर हर 0.2% पर ट्रेल करो
//             if (this.highestMTM >= this.onePercentCap) {
//                 const extraProfit = this.highestMTM - this.onePercentCap;
//                 const steps = Math.floor(extraProfit / this.pointTwoPercent);
                
//                 // रिकवरी का बेस लॉक 0.5% है (मेन ट्रेड का 0.8% था)
//                 const newSlLevel = this.pointFivePercent + (steps * this.pointTwoPercent);
                
//                 if (newSlLevel > this.currentSlLevel) {
//                     this.currentSlLevel = newSlLevel;
//                     console.log(`🚀 [RECOVERY TRAIL] Profit touched ₹${this.highestMTM.toFixed(2)}. SL trailed to ₹${this.currentSlLevel.toFixed(2)}`);
//                 }
//             }

//         } else {
//             // ========================================================
//             // 🟢 MAIN TRADE RULES (Normal Ratio Spread Logic)
//             // ========================================================
            
//             // Before 12:00 PM: Profit > 0.5% -> Move SL to C2C
//             if (timeInMinutes < time12PM) {
//                 if (!this.isC2CLocked && this.highestMTM >= this.pointFivePercent) {
//                     this.currentSlLevel = 0;
//                     this.isC2CLocked = true;
//                     console.log("⏰ [MAIN TRAIL] Before 12 PM: Profit crossed 0.5%. SL locked at Cost-to-Cost (0).");
//                 }
//             }

//             // Before 2:30 PM: Profit > 1.0% -> Lock 0.8%, Trail 0.2% by 0.2%
//             if (timeInMinutes < time230PM) {
//                 if (this.highestMTM >= this.onePercentCap) {
//                     const extraProfit = this.highestMTM - this.onePercentCap;
//                     const steps = Math.floor(extraProfit / this.pointTwoPercent);
                    
//                     const newSlLevel = this.pointEightPercent + (steps * this.pointTwoPercent);
                    
//                     if (newSlLevel > this.currentSlLevel) {
//                         this.currentSlLevel = newSlLevel;
//                         console.log(`🚀 [MAIN TRAIL] Profit touched ₹${this.highestMTM.toFixed(2)}. SL trailed to ₹${this.currentSlLevel.toFixed(2)}`);
//                     }
//                 }
//             }

//             // After 2:30 PM: Break-even Exit Rule
//             if (timeInMinutes >= time230PM && timeInMinutes < (15 * 60)) { 
//                 if (currentMTM <= 0) {
//                     console.log("🚨 [LATE EXIT] Time >= 2:30 PM and MTM touched Break-Even. SQUARE OFF ALL LEGS!");
//                     return { action: 'SQUARE_OFF', reason: 'Late Break-Even Touch' };
//                 }
//             }
//         }

//         // ========================================================
//         // 🔥 FINAL CHECK: SL HIT CONDITION
//         // ========================================================
//         if (currentMTM <= this.currentSlLevel) {
//             return { 
//                 action: 'SL_HIT', 
//                 reason: `Dynamic SL Hit at ₹${this.currentSlLevel.toFixed(2)}`, 
//                 slAmount: this.currentSlLevel 
//             };
//         }

//         // Hold Trade
//         return { action: 'HOLD', currentSlLevel: this.currentSlLevel, highestMTM: this.highestMTM };
//     }
// }

// module.exports = TimeBasedRiskManager;


// File: src/engine/features/TimeBasedRiskManager.js

// class TimeBasedRiskManager {
//     constructor(baseOnePercentAmount, isRecoveryMode = false, actualRiskAmount = null, tcConfig = {}) {
//         this.baseOnePercent = baseOnePercentAmount;
//         this.isRecoveryMode = isRecoveryMode;
        
//         // 🎛️ DYNAMIC CONFIGURATION (Map UI inputs to backend variables)
//         this.config = {
//             phase1Time: tcConfig.tcPhase1Time || '12:00',
//             phase1Profit: Number(tcConfig.tcPhase1Profit) || 0.5,
//             phase2Time: tcConfig.tcPhase2Time || '14:30',
//             phase2Profit: Number(tcConfig.tcPhase2Profit) || 1.0,
//             phase2Lock: Number(tcConfig.tcPhase2Lock) || 0.8,
//             phase2Trail: Number(tcConfig.tcPhase2Trail) || 0.2,
            
//             // 🔥 THE FIX: Map Dynamic Recovery Rules from UI
//             recoveryC2C: Number(tcConfig.recoveryC2C) || 0.4,
//             recoveryTarget: Number(tcConfig.recoveryTarget) || 1.0,
//             recoveryLock: Number(tcConfig.recoveryLock) || 0.5,
//             recoveryTrail: Number(tcConfig.recoveryTrail) || 0.2
//         };

//         // 🧮 Calculate Main Trade values
//         this.valPhase1Profit = this.baseOnePercent * this.config.phase1Profit;
//         this.valPhase2Profit = this.baseOnePercent * this.config.phase2Profit;
//         this.valPhase2Lock   = this.baseOnePercent * this.config.phase2Lock;
//         this.valPhase2Trail  = this.baseOnePercent * this.config.phase2Trail;

//         // 🧮 Calculate Recovery Trade values
//         this.valRecC2C    = this.baseOnePercent * this.config.recoveryC2C;
//         this.valRecTarget = this.baseOnePercent * this.config.recoveryTarget;
//         this.valRecLock   = this.baseOnePercent * this.config.recoveryLock;
//         this.valRecTrail  = this.baseOnePercent * this.config.recoveryTrail;

//         let startingRisk = actualRiskAmount !== null ? actualRiskAmount : this.baseOnePercent;
//         this.currentSlLevel = -Math.abs(startingRisk);
//         this.highestMTM = 0;                  
//         this.isC2CLocked = false;             
//     }

//     evaluateRisk(currentMTM, currentTimeStr) {
//         if (currentMTM > this.highestMTM) {
//             this.highestMTM = currentMTM;
//         }

//         const [hours, minutes] = currentTimeStr.split(':').map(Number);
//         const timeInMinutes = (hours * 60) + minutes;
        
//         const [h1, m1] = this.config.phase1Time.split(':').map(Number);
//         const timePhase1 = (h1 * 60) + m1;

//         const [h2, m2] = this.config.phase2Time.split(':').map(Number);
//         const timePhase2 = (h2 * 60) + m2;

//         if (this.isRecoveryMode) {
//             // ========================================================
//             // 🚑 DYNAMIC RECOVERY MODE RULES
//             // ========================================================
//             if (!this.isC2CLocked && this.highestMTM >= this.valRecC2C) {
//                 this.currentSlLevel = 0;
//                 this.isC2CLocked = true;
//                 console.log(`🚑 [RECOVERY] Profit crossed ${this.config.recoveryC2C}%. SL locked at C2C.`);
//             }

//             if (this.highestMTM >= this.valRecTarget) { 
//                 let newSlLevel = this.currentSlLevel;
                
//                 // Trail logic: If profit >= (Target + Trail Step)
//                 if (this.highestMTM >= (this.valRecTarget + this.valRecTrail)) {
//                     const extraProfit = this.highestMTM - (this.valRecTarget + this.valRecTrail);
//                     const steps = Math.floor(extraProfit / this.valRecTrail);
//                     // Trail starts from Original Target (e.g., 1.0%)
//                     newSlLevel = this.valRecTarget + (steps * this.valRecTrail);
//                 } else {
//                     // Between Target and Target+Trail -> Lock value
//                     newSlLevel = this.valRecLock;
//                 }
                
//                 if (newSlLevel > this.currentSlLevel) {
//                     this.currentSlLevel = newSlLevel;
//                     console.log(`🚀 [RECOVERY TRAIL] Profit touched ₹${this.highestMTM.toFixed(2)}. SL trailed to ₹${this.currentSlLevel.toFixed(2)}`);
//                 }
//             }

//         } else {
//             // ========================================================
//             // 🟢 DYNAMIC MAIN TRADE RULES
//             // ========================================================
//             if (timeInMinutes < timePhase1) {
//                 if (!this.isC2CLocked && this.highestMTM >= this.valPhase1Profit) {
//                     this.currentSlLevel = 0;
//                     this.isC2CLocked = true;
//                     console.log(`⏰ [MAIN TRAIL] Before ${this.config.phase1Time}: Profit crossed ${this.config.phase1Profit}%. SL locked at C2C.`);
//                 }
//             }

//             if (timeInMinutes < timePhase2) {
//                 if (this.highestMTM >= this.valPhase2Profit) {
//                     const extraProfit = this.highestMTM - this.valPhase2Profit;
//                     const steps = Math.floor(extraProfit / this.valPhase2Trail);
                    
//                     const newSlLevel = this.valPhase2Lock + (steps * this.valPhase2Trail);
                    
//                     if (newSlLevel > this.currentSlLevel) {
//                         this.currentSlLevel = newSlLevel;
//                         console.log(`🚀 [MAIN TRAIL] Profit touched ₹${this.highestMTM.toFixed(2)}. SL trailed to ₹${this.currentSlLevel.toFixed(2)}`);
//                     }
//                 }
//             }

//             if (timeInMinutes >= timePhase2 && timeInMinutes < (15 * 60)) { 
//                 if (currentMTM <= 0) {
//                     console.log(`🚨 [LATE EXIT] Time >= ${this.config.phase2Time} and MTM touched Break-Even. SQUARE OFF!`);
//                     return { action: 'SQUARE_OFF', reason: 'Late Break-Even Touch' };
//                 }
//             }
//         }

//         // ========================================================
//         // 🔥 FINAL CHECK: SL HIT CONDITION
//         // ========================================================
//         if (currentMTM <= this.currentSlLevel) {
//             return { action: 'SL_HIT', reason: `Dynamic SL Hit at ₹${this.currentSlLevel.toFixed(2)}`, slAmount: this.currentSlLevel };
//         }

//         return { action: 'HOLD', currentSlLevel: this.currentSlLevel, highestMTM: this.highestMTM };
//     }
// }

// module.exports = TimeBasedRiskManager;




// class TimeBasedRiskManager {
//     constructor(baseOnePercentAmount, isRecoveryMode = false, actualRiskAmount = null, tcConfig = {}) {
//         this.baseOnePercent = baseOnePercentAmount;
//         this.isRecoveryMode = isRecoveryMode;
        
//         // 📂 NAYE FOLDERS SE DATA READ KARO
//         const tcTrailing = tcConfig.timeConditionedTrailing || {};
//         const recSettings = tcConfig.recoverySettings || {};

//         this.config = {
//             phase1Time: tcTrailing.phase1Time || '12:00',
//             phase1Profit: Number(tcTrailing.phase1Profit) || 0.5,
//             phase2Time: tcTrailing.phase2Time || '14:30',
//             phase2Profit: Number(tcTrailing.phase2Profit) || 1.0,
//             phase2Lock: Number(tcTrailing.phase2Lock) || 0.8,
//             phase2Trail: Number(tcTrailing.phase2Trail) || 0.2,
            
//             recoveryC2C: Number(recSettings.c2cTrigger) || 0.4,
//             recoveryTarget: Number(recSettings.target) || 1.0,
//             recoveryLock: Number(recSettings.lock) || 0.5,
//             recoveryTrail: Number(recSettings.trail) || 0.2
//         };

//         // 🧮 Calculate Main Trade values
//         this.valPhase1Profit = this.baseOnePercent * this.config.phase1Profit;
//         this.valPhase2Profit = this.baseOnePercent * this.config.phase2Profit;
//         this.valPhase2Lock   = this.baseOnePercent * this.config.phase2Lock;
//         this.valPhase2Trail  = this.baseOnePercent * this.config.phase2Trail;

//         // 🧮 Calculate Recovery Trade values
//         this.valRecC2C    = this.baseOnePercent * this.config.recoveryC2C;
//         this.valRecTarget = this.baseOnePercent * this.config.recoveryTarget;
//         this.valRecLock   = this.baseOnePercent * this.config.recoveryLock;
//         this.valRecTrail  = this.baseOnePercent * this.config.recoveryTrail;

//         let startingRisk = actualRiskAmount !== null ? actualRiskAmount : this.baseOnePercent;
//         this.currentSlLevel = -Math.abs(startingRisk);
//         this.highestMTM = 0;                  
//         this.isC2CLocked = false;             
//     }

//     evaluateRisk(currentMTM, currentTimeStr) {
//         if (currentMTM > this.highestMTM) {
//             this.highestMTM = currentMTM;
//         }

//         const [hours, minutes] = currentTimeStr.split(':').map(Number);
//         const timeInMinutes = (hours * 60) + minutes;
        
//         const [h1, m1] = this.config.phase1Time.split(':').map(Number);
//         const timePhase1 = (h1 * 60) + m1;

//         const [h2, m2] = this.config.phase2Time.split(':').map(Number);
//         const timePhase2 = (h2 * 60) + m2;

//         if (this.isRecoveryMode) {
//             // ========================================================
//             // 🚑 DYNAMIC RECOVERY MODE RULES
//             // ========================================================
//             if (!this.isC2CLocked && this.highestMTM >= this.valRecC2C) {
//                 this.currentSlLevel = 0;
//                 this.isC2CLocked = true;
//                 console.log(`🚑 [RECOVERY] Profit crossed ${this.config.recoveryC2C}%. SL locked at C2C.`);
//             }

//             if (this.highestMTM >= this.valRecTarget) { 
//                 let newSlLevel = this.currentSlLevel;
                
//                 // Trail logic: If profit >= (Target + Trail Step)
//                 if (this.highestMTM >= (this.valRecTarget + this.valRecTrail)) {
//                     const extraProfit = this.highestMTM - (this.valRecTarget + this.valRecTrail);
//                     const steps = Math.floor(extraProfit / this.valRecTrail);
//                     // Trail starts from Original Target (e.g., 1.0%)
//                     newSlLevel = this.valRecTarget + (steps * this.valRecTrail);
//                 } else {
//                     // Between Target and Target+Trail -> Lock value
//                     newSlLevel = this.valRecLock;
//                 }
                
//                 if (newSlLevel > this.currentSlLevel) {
//                     this.currentSlLevel = newSlLevel;
//                     console.log(`🚀 [RECOVERY TRAIL] Profit touched ₹${this.highestMTM.toFixed(2)}. SL trailed to ₹${this.currentSlLevel.toFixed(2)}`);
//                 }
//             }

//         } else {
//             // ========================================================
//             // 🟢 DYNAMIC MAIN TRADE RULES
//             // ========================================================
//             if (timeInMinutes < timePhase1) {
//                 if (!this.isC2CLocked && this.highestMTM >= this.valPhase1Profit) {
//                     this.currentSlLevel = 0;
//                     this.isC2CLocked = true;
//                     console.log(`⏰ [MAIN TRAIL] Before ${this.config.phase1Time}: Profit crossed ${this.config.phase1Profit}%. SL locked at C2C.`);
//                 }
//             }

//             if (timeInMinutes < timePhase2) {
//                 if (this.highestMTM >= this.valPhase2Profit) {
//                     const extraProfit = this.highestMTM - this.valPhase2Profit;
//                     const steps = Math.floor(extraProfit / this.valPhase2Trail);
                    
//                     const newSlLevel = this.valPhase2Lock + (steps * this.valPhase2Trail);
                    
//                     if (newSlLevel > this.currentSlLevel) {
//                         this.currentSlLevel = newSlLevel;
//                         console.log(`🚀 [MAIN TRAIL] Profit touched ₹${this.highestMTM.toFixed(2)}. SL trailed to ₹${this.currentSlLevel.toFixed(2)}`);
//                     }
//                 }
//             }

//             if (timeInMinutes >= timePhase2 && timeInMinutes < (15 * 60)) { 
//                 if (currentMTM <= 0) {
//                     console.log(`🚨 [LATE EXIT] Time >= ${this.config.phase2Time} and MTM touched Break-Even. SQUARE OFF!`);
//                     return { action: 'SQUARE_OFF', reason: 'Late Break-Even Touch' };
//                 }
//             }
//         }

//         // ========================================================
//         // 🔥 FINAL CHECK: SL HIT CONDITION
//         // ========================================================
//         if (currentMTM <= this.currentSlLevel) {
//             return { action: 'SL_HIT', reason: `Dynamic SL Hit at ₹${this.currentSlLevel.toFixed(2)}`, slAmount: this.currentSlLevel };
//         }

//         return { action: 'HOLD', currentSlLevel: this.currentSlLevel, highestMTM: this.highestMTM };
//     }
// }

// module.exports = TimeBasedRiskManager;




// class TimeBasedRiskManager {
//     constructor(baseOnePercentAmount, isRecoveryMode = false, actualRiskAmount = null, tcConfig = {}) {
//         this.baseOnePercent = baseOnePercentAmount;
//         this.isRecoveryMode = isRecoveryMode;
        
//         const tcTrailing = tcConfig.timeConditionedTrailing || {};
//         const recSettings = tcConfig.recoverySettings || {};

//         this.config = {
//             phase1Time: tcTrailing.phase1Time || '12:00',
//             phase1Profit: Number(tcTrailing.phase1Profit) || 0.5,
//             phase2Time: tcTrailing.phase2Time || '14:30',
//             phase2Profit: Number(tcTrailing.phase2Profit) || 1.0,
//             phase2Lock: Number(tcTrailing.phase2Lock) || 0.8,
//             phase2Trail: Number(tcTrailing.phase2Trail) || 0.2,
            
//             recoveryC2C: Number(recSettings.c2cTrigger) || 0.4,
//             recoveryTarget: Number(recSettings.target) || 1.0,
//             recoveryLock: Number(recSettings.lock) || 0.5,
//             recoveryTrail: Number(recSettings.trail) || 0.2
//         };

//         this.valPhase1Profit = this.baseOnePercent * this.config.phase1Profit;
//         this.valPhase2Profit = this.baseOnePercent * this.config.phase2Profit;
//         this.valPhase2Lock   = this.baseOnePercent * this.config.phase2Lock;
//         this.valPhase2Trail  = this.baseOnePercent * this.config.phase2Trail;

//         this.valRecC2C    = this.baseOnePercent * this.config.recoveryC2C;
//         this.valRecTarget = this.baseOnePercent * this.config.recoveryTarget;
//         this.valRecLock   = this.baseOnePercent * this.config.recoveryLock;
//         this.valRecTrail  = this.baseOnePercent * this.config.recoveryTrail;

//         let startingRisk = actualRiskAmount !== null ? actualRiskAmount : this.baseOnePercent;
//         this.currentSlLevel = -Math.abs(startingRisk);
//         this.highestMTM = 0;                  
//         this.isC2CLocked = false;             
//     }

//     evaluateRisk(currentMTM, currentTimeStr, currentSpotPrice = null, boundaries = null) {
//         if (currentMTM > this.highestMTM) {
//             this.highestMTM = currentMTM;
//         }

//         const [hours, minutes] = currentTimeStr.split(':').map(Number);
//         const timeInMinutes = (hours * 60) + minutes;
        
//         const [h1, m1] = this.config.phase1Time.split(':').map(Number);
//         const timePhase1 = (h1 * 60) + m1;

//         const [h2, m2] = this.config.phase2Time.split(':').map(Number);
//         const timePhase2 = (h2 * 60) + m2;

//         const time230PM = (14 * 60) + 30;
//         const time300PM = 15 * 60;

//         if (this.isRecoveryMode) {
//             // ========================================================
//             // 🚑 RECOVERY TRADE RULES
//             // ========================================================
//             if (!this.isC2CLocked && this.highestMTM >= this.valRecC2C) {
//                 this.currentSlLevel = 0;
//                 this.isC2CLocked = true;
//                 console.log(`🚑 [RECOVERY] Profit crossed ${this.config.recoveryC2C}%. SL locked at C2C.`);
//             }

//             if (this.highestMTM >= this.valRecTarget) { 
//                 let newSlLevel = this.currentSlLevel;
//                 if (this.highestMTM >= (this.valRecTarget + this.valRecTrail)) {
//                     const extraProfit = this.highestMTM - (this.valRecTarget + this.valRecTrail);
//                     const steps = Math.floor(extraProfit / this.valRecTrail);
//                     newSlLevel = this.valRecTarget + (steps * this.valRecTrail);
//                 } else {
//                     newSlLevel = this.valRecLock;
//                 }
                
//                 if (newSlLevel > this.currentSlLevel) {
//                     this.currentSlLevel = newSlLevel;
//                     console.log(`🚀 [RECOVERY TRAIL] Profit touched ₹${this.highestMTM.toFixed(2)}. SL trailed to ₹${this.currentSlLevel.toFixed(2)}`);
//                 }
//             }

//         } else {
//             // ========================================================
//             // 🟢 MAIN TRADE RULES
//             // ========================================================

//             // 🔥 RULE 4: BREAKEVEN BOUNDARY TOUCH (Highest Priority between 2:30 PM to 3:00 PM)
//             if (timeInMinutes >= time230PM && timeInMinutes <= time300PM) {
//                 if (currentSpotPrice && boundaries) {
//                     if (currentSpotPrice >= boundaries.upper || currentSpotPrice <= boundaries.lower) {
//                         console.log(`🚨 [BOUNDARY BREACH] Spot (${currentSpotPrice}) touched Breakeven! SQUARE OFF ALL LEGS.`);
//                         return { action: 'SQUARE_OFF', reason: 'Breakeven Boundary Touch' };
//                     }
//                 }
//             }

//             // Phase 1 (Move SL to Cost)
//             if (timeInMinutes < timePhase1) {
//                 if (!this.isC2CLocked && this.highestMTM >= this.valPhase1Profit) {
//                     this.currentSlLevel = 0;
//                     this.isC2CLocked = true;
//                     console.log(`⏰ [MAIN TRAIL] Before ${this.config.phase1Time}: Profit crossed ${this.config.phase1Profit}%. SL locked at C2C.`);
//                 }
//             }

//             // Phase 2 (Lock & Trail)
//             if (timeInMinutes < timePhase2) {
//                 if (this.highestMTM >= this.valPhase2Profit) {
//                     const extraProfit = this.highestMTM - this.valPhase2Profit;
//                     const steps = Math.floor(extraProfit / this.valPhase2Trail);
//                     const newSlLevel = this.valPhase2Lock + (steps * this.valPhase2Trail);
                    
//                     if (newSlLevel > this.currentSlLevel) {
//                         this.currentSlLevel = newSlLevel;
//                         console.log(`🚀 [MAIN TRAIL] Profit touched ₹${this.highestMTM.toFixed(2)}. SL trailed to ₹${this.currentSlLevel.toFixed(2)}`);
//                     }
//                 }
//             }

//             // Late Exit Rule (If MTM drops to break-even after Phase 2 time)
//             if (timeInMinutes >= timePhase2 && timeInMinutes < (15 * 60)) { 
//                 if (currentMTM <= 0) {
//                     console.log(`🚨 [LATE EXIT] Time >= ${this.config.phase2Time} and MTM touched Break-Even. SQUARE OFF!`);
//                     return { action: 'SQUARE_OFF', reason: 'Late Break-Even Touch' };
//                 }
//             }
//         }

//         // ========================================================
//         // 💥 FINAL CHECK: SL HIT CONDITION
//         // ========================================================
//         if (currentMTM <= this.currentSlLevel) {
//             return { action: 'SL_HIT', reason: `Dynamic SL Hit at ₹${this.currentSlLevel.toFixed(2)}`, slAmount: this.currentSlLevel };
//         }

//         return { action: 'HOLD', currentSlLevel: this.currentSlLevel, highestMTM: this.highestMTM };
//     }
// }

// module.exports = TimeBasedRiskManager;




// class TimeBasedRiskManager {
//     constructor(baseOnePercentAmount, isRecoveryMode = false, actualRiskAmount = null, tcConfig = {}) {
//         this.baseOnePercent = baseOnePercentAmount;
//         this.isRecoveryMode = isRecoveryMode;
        
//         const tcTrailing = tcConfig.timeConditionedTrailing || {};
//         const recSettings = tcConfig.recoverySettings || {};

//         this.config = {
//             phase1Time: tcTrailing.phase1Time || '12:00',
//             phase1Profit: Number(tcTrailing.phase1Profit) || 0.5,
//             phase2Time: tcTrailing.phase2Time || '14:30',
//             phase2Profit: Number(tcTrailing.phase2Profit) || 1.0,
//             phase2Lock: Number(tcTrailing.phase2Lock) || 0.8,
//             phase2Trail: Number(tcTrailing.phase2Trail) || 0.2,
            
//             recoveryC2C: Number(recSettings.c2cTrigger) || 0.4,
//             recoveryTarget: Number(recSettings.target) || 1.0,
//             recoveryLock: Number(recSettings.lock) || 0.5,
//             recoveryTrail: Number(recSettings.trail) || 0.2,

//             // 🔥 NAYA DYNAMIC CONTROL: Boundary Timings
//             lateBoundaryTime: tcConfig.lateBoundaryTime || '14:30', 
//             boundaryEndTime: tcConfig.boundaryEndTime || '15:00'
//         };

//         this.valPhase1Profit = this.baseOnePercent * this.config.phase1Profit;
//         this.valPhase2Profit = this.baseOnePercent * this.config.phase2Profit;
//         this.valPhase2Lock   = this.baseOnePercent * this.config.phase2Lock;
//         this.valPhase2Trail  = this.baseOnePercent * this.config.phase2Trail;

//         this.valRecC2C    = this.baseOnePercent * this.config.recoveryC2C;
//         this.valRecTarget = this.baseOnePercent * this.config.recoveryTarget;
//         this.valRecLock   = this.baseOnePercent * this.config.recoveryLock;
//         this.valRecTrail  = this.baseOnePercent * this.config.recoveryTrail;

//         let startingRisk = actualRiskAmount !== null ? actualRiskAmount : this.baseOnePercent;
//         this.currentSlLevel = -Math.abs(startingRisk);
//         this.highestMTM = 0;                  
//         this.isC2CLocked = false;             
//     }

//     evaluateRisk(currentMTM, currentTimeStr, currentSpotPrice = null, boundaries = null) {
//         if (currentMTM > this.highestMTM) {
//             this.highestMTM = currentMTM;
//         }

//         const [hours, minutes] = currentTimeStr.split(':').map(Number);
//         const timeInMinutes = (hours * 60) + minutes;
        
//         const [h1, m1] = this.config.phase1Time.split(':').map(Number);
//         const timePhase1 = (h1 * 60) + m1;

//         const [h2, m2] = this.config.phase2Time.split(':').map(Number);
//         const timePhase2 = (h2 * 60) + m2;

//         // 🔥 Convert Dynamic Boundary Times to Minutes
//         const [hb, mb] = this.config.lateBoundaryTime.split(':').map(Number);
//         const timeLateBoundary = (hb * 60) + mb;

//         const [he, me] = this.config.boundaryEndTime.split(':').map(Number);
//         const timeBoundaryEnd = (he * 60) + me;

//         if (this.isRecoveryMode) {
//             // ========================================================
//             // 🚑 RECOVERY TRADE RULES
//             // ========================================================
//             if (!this.isC2CLocked && this.highestMTM >= this.valRecC2C) {
//                 this.currentSlLevel = 0;
//                 this.isC2CLocked = true;
//                 console.log(`🚑 [RECOVERY] Profit crossed ${this.config.recoveryC2C}%. SL locked at C2C.`);
//             }

//             if (this.highestMTM >= this.valRecTarget) { 
//                 let newSlLevel = this.currentSlLevel;
//                 if (this.highestMTM >= (this.valRecTarget + this.valRecTrail)) {
//                     const extraProfit = this.highestMTM - (this.valRecTarget + this.valRecTrail);
//                     const steps = Math.floor(extraProfit / this.valRecTrail);
//                     newSlLevel = this.valRecTarget + (steps * this.valRecTrail);
//                 } else {
//                     newSlLevel = this.valRecLock;
//                 }
                
//                 if (newSlLevel > this.currentSlLevel) {
//                     this.currentSlLevel = newSlLevel;
//                     console.log(`🚀 [RECOVERY TRAIL] Profit touched ₹${this.highestMTM.toFixed(2)}. SL trailed to ₹${this.currentSlLevel.toFixed(2)}`);
//                 }
//             }

//         } else {
//             // ========================================================
//             // 🟢 MAIN TRADE RULES
//             // ========================================================

//             // 🔥 PERFECT BOUNDARY RULE (NOW DYNAMIC!)
//             if (currentSpotPrice && boundaries) {
//                 if (currentSpotPrice >= boundaries.upper || currentSpotPrice <= boundaries.lower) {
//                     if (timeInMinutes < timeLateBoundary) {
//                         console.log(`🚨 [EARLY BOUNDARY BREACH] Spot (${currentSpotPrice}) touched Breakeven before ${this.config.lateBoundaryTime}! Initiating cut for possible Recovery.`);
//                         return { action: 'BOUNDARY_BREACH_EARLY', reason: 'Early Breakeven Boundary Touch' }; 
//                     } else if (timeInMinutes <= timeBoundaryEnd) {
//                         console.log(`🚨 [LATE BOUNDARY BREACH] Spot (${currentSpotPrice}) touched Breakeven after ${this.config.lateBoundaryTime}! SQUARE OFF ALL LEGS.`);
//                         return { action: 'SQUARE_OFF', reason: 'Late Breakeven Boundary Touch' };
//                     }
//                 }
//             }

//             // Phase 1 (Move SL to Cost)
//             if (timeInMinutes < timePhase1) {
//                 if (!this.isC2CLocked && this.highestMTM >= this.valPhase1Profit) {
//                     this.currentSlLevel = 0;
//                     this.isC2CLocked = true;
//                     console.log(`⏰ [MAIN TRAIL] Before ${this.config.phase1Time}: Profit crossed ${this.config.phase1Profit}%. SL locked at C2C.`);
//                 }
//             }

//             // Phase 2 (Lock & Trail)
//             if (timeInMinutes < timePhase2) {
//                 if (this.highestMTM >= this.valPhase2Profit) {
//                     const extraProfit = this.highestMTM - this.valPhase2Profit;
//                     const steps = Math.floor(extraProfit / this.valPhase2Trail);
//                     const newSlLevel = this.valPhase2Lock + (steps * this.valPhase2Trail);
                    
//                     if (newSlLevel > this.currentSlLevel) {
//                         this.currentSlLevel = newSlLevel;
//                         console.log(`🚀 [MAIN TRAIL] Profit touched ₹${this.highestMTM.toFixed(2)}. SL trailed to ₹${this.currentSlLevel.toFixed(2)}`);
//                     }
//                 }
//             }
            
//             // =========================================================
//             // 🚧 THE REAL BOUNDARY CHECK (Based on SPOT PRICE, not MTM)
//             // =========================================================
            
//             // 1. Safety Check: Verify boundaries exist before calculating
//             let isBoundaryBreached = false;
//             if (boundaries && boundaries.lower !== undefined && boundaries.upper !== undefined) {
//                 isBoundaryBreached = (currentSpotPrice <= boundaries.lower || currentSpotPrice >= boundaries.upper);
//             }

//             if (isBoundaryBreached) {
//                 // Condition A: LATE Boundary Touch (e.g., Phase 2 / 14:30 ke baad)
//                 if (timeInMinutes >= timePhase2) { 
//                     console.log(`🚨 [LATE EXIT TRIGGERED] Time >= ${this.config.phase2Time} | Spot: ${currentSpotPrice} touched Boundary (L: ${boundaries.lower.toFixed(2)} / U: ${boundaries.upper.toFixed(2)}). SQUARE OFF!`);
//                     return { action: 'SQUARE_OFF', reason: 'Late Break-Even Touch (Spot Price)' };
//                 } 
//                 // Condition B: EARLY Boundary Touch (e.g., 14:30 se pehle) -> TRIGGER RECOVERY!
//                 else {
//                     console.log(`⚠️ [EARLY BOUNDARY BREACH] Spot: ${currentSpotPrice} breached Boundary! Initiating Recovery Protocol...`);
//                     return { action: 'BOUNDARY_BREACH_EARLY', reason: 'Early Break-Even Boundary Touch (Spot Price)' };
//                 }
//             }
//         }

//         // ========================================================
//         // 💥 FINAL CHECK: NORMAL SL HIT CONDITION
//         // ========================================================
//         if (currentMTM <= this.currentSlLevel) {
//             return { action: 'SL_HIT', reason: `Dynamic SL Hit at ₹${this.currentSlLevel.toFixed(2)}`, slAmount: this.currentSlLevel };
//         }

//         return { action: 'HOLD', currentSlLevel: this.currentSlLevel, highestMTM: this.highestMTM };
//     }
// }

// module.exports = TimeBasedRiskManager;





// class TimeBasedRiskManager {
//     constructor(baseOnePercentAmount, isRecoveryMode = false, actualRiskAmount = null, tcConfig = {}) {
//         this.baseOnePercent = baseOnePercentAmount;
//         this.isRecoveryMode = isRecoveryMode;
        
//         const tcTrailing = tcConfig.timeConditionedTrailing || {};
//         const recSettings = tcConfig.recoverySettings || {};

//         this.config = {
//             phase1Time: tcTrailing.phase1Time || '12:00',
//             phase1Profit: Number(tcTrailing.phase1Profit) || 0.5,
//             phase2Time: tcTrailing.phase2Time || '14:30',
//             phase2Profit: Number(tcTrailing.phase2Profit) || 1.0,
//             phase2Lock: Number(tcTrailing.phase2Lock) || 0.8,
//             phase2Trail: Number(tcTrailing.phase2Trail) || 0.2,
            
//             recoveryC2C: Number(recSettings.c2cTrigger) || 0.4,
//             recoveryTarget: Number(recSettings.target) || 1.0,
//             recoveryLock: Number(recSettings.lock) || 0.5,
//             recoveryTrail: Number(recSettings.trail) || 0.2,

//             // 🔥 NAYA DYNAMIC CONTROL: Boundary Timings
//             lateBoundaryTime: tcConfig.lateBoundaryTime || '14:30', 
//             boundaryEndTime: tcConfig.boundaryEndTime || '15:00'
//         };

//         this.valPhase1Profit = this.baseOnePercent * this.config.phase1Profit;
//         this.valPhase2Profit = this.baseOnePercent * this.config.phase2Profit;
//         this.valPhase2Lock   = this.baseOnePercent * this.config.phase2Lock;
//         this.valPhase2Trail  = this.baseOnePercent * this.config.phase2Trail;

//         this.valRecC2C    = this.baseOnePercent * this.config.recoveryC2C;
//         this.valRecTarget = this.baseOnePercent * this.config.recoveryTarget;
//         this.valRecLock   = this.baseOnePercent * this.config.recoveryLock;
//         this.valRecTrail  = this.baseOnePercent * this.config.recoveryTrail;

//         let startingRisk = actualRiskAmount !== null ? actualRiskAmount : this.baseOnePercent;
//         this.currentSlLevel = -Math.abs(startingRisk);
//         this.highestMTM = 0;                  
//         this.isC2CLocked = false;             
//     }

//     evaluateRisk(currentMTM, currentTimeStr, currentSpotPrice = null, boundaries = null) {
//         if (currentMTM > this.highestMTM) {
//             this.highestMTM = currentMTM;
//         }

//         const [hours, minutes] = currentTimeStr.split(':').map(Number);
//         const timeInMinutes = (hours * 60) + minutes;
        
//         const [h1, m1] = this.config.phase1Time.split(':').map(Number);
//         const timePhase1 = (h1 * 60) + m1;

//         const [h2, m2] = this.config.phase2Time.split(':').map(Number);
//         const timePhase2 = (h2 * 60) + m2;

//         const [hb, mb] = this.config.lateBoundaryTime.split(':').map(Number);
//         const timeLateBoundary = (hb * 60) + mb;

//         const [he, me] = this.config.boundaryEndTime.split(':').map(Number);
//         const timeBoundaryEnd = (he * 60) + me;

//         if (this.isRecoveryMode) {
//             // ========================================================
//             // 🚑 RECOVERY TRADE RULES
//             // ========================================================
//             if (!this.isC2CLocked && this.highestMTM >= this.valRecC2C) {
//                 this.currentSlLevel = 0;
//                 this.isC2CLocked = true;
//                 // 🔥 NAYA FIX: Time, Target aur MTM sab print hoga!
//                 console.log(`\n🚑 [RECOVERY TRAIL] Time: ${currentTimeStr} | Profit crossed ${this.config.recoveryC2C}% of Margin (Target: ₹${this.valRecC2C.toFixed(2)}). Highest MTM: ₹${this.highestMTM.toFixed(2)}. SL locked at C2C (₹0.00).`);
//             }

//             if (this.highestMTM >= this.valRecTarget) { 
//                 let newSlLevel = this.currentSlLevel;
//                 if (this.highestMTM >= (this.valRecTarget + this.valRecTrail)) {
//                     const extraProfit = this.highestMTM - (this.valRecTarget + this.valRecTrail);
//                     const steps = Math.floor(extraProfit / this.valRecTrail);
//                     newSlLevel = this.valRecTarget + (steps * this.valRecTrail);
//                 } else {
//                     newSlLevel = this.valRecLock;
//                 }
                
//                 if (newSlLevel > this.currentSlLevel) {
//                     this.currentSlLevel = newSlLevel;
//                     console.log(`🚀 [RECOVERY TRAIL] Time: ${currentTimeStr} | Profit touched ₹${this.highestMTM.toFixed(2)}. SL trailed to ₹${this.currentSlLevel.toFixed(2)}`);
//                 }
//             }

//         } else {
//             // ========================================================
//             // 🟢 MAIN TRADE RULES
//             // ========================================================

//             if (currentSpotPrice && boundaries) {
//                 if (currentSpotPrice >= boundaries.upper || currentSpotPrice <= boundaries.lower) {
//                     if (timeInMinutes < timeLateBoundary) {
//                         console.log(`🚨 [EARLY BOUNDARY BREACH] Spot (${currentSpotPrice}) touched Breakeven before ${this.config.lateBoundaryTime}! Initiating cut for possible Recovery.`);
//                         return { action: 'BOUNDARY_BREACH_EARLY', reason: 'Early Breakeven Boundary Touch' }; 
//                     } else if (timeInMinutes <= timeBoundaryEnd) {
//                         console.log(`🚨 [LATE BOUNDARY BREACH] Spot (${currentSpotPrice}) touched Breakeven after ${this.config.lateBoundaryTime}! SQUARE OFF ALL LEGS.`);
//                         return { action: 'SQUARE_OFF', reason: 'Late Breakeven Boundary Touch' };
//                     }
//                 }
//             }

//             // Phase 1 (Move SL to Cost)
//             if (timeInMinutes < timePhase1) {
//                 if (!this.isC2CLocked && this.highestMTM >= this.valPhase1Profit) {
//                     this.currentSlLevel = 0;
//                     this.isC2CLocked = true;
//                     // 🔥 NAYA FIX: Main trade me bhi clear logs
//                     console.log(`\n⏰ [MAIN TRAIL] Time: ${currentTimeStr} | Profit crossed ${this.config.phase1Profit}% (Target: ₹${this.valPhase1Profit.toFixed(2)}). SL locked at C2C.`);
//                 }
//             }

//             // Phase 2 (Lock & Trail)
//             if (timeInMinutes < timePhase2) {
//                 if (this.highestMTM >= this.valPhase2Profit) {
//                     const extraProfit = this.highestMTM - this.valPhase2Profit;
//                     const steps = Math.floor(extraProfit / this.valPhase2Trail);
//                     const newSlLevel = this.valPhase2Lock + (steps * this.valPhase2Trail);
                    
//                     if (newSlLevel > this.currentSlLevel) {
//                         this.currentSlLevel = newSlLevel;
//                         console.log(`🚀 [MAIN TRAIL] Time: ${currentTimeStr} | Profit touched ₹${this.highestMTM.toFixed(2)}. SL trailed to ₹${this.currentSlLevel.toFixed(2)}`);
//                     }
//                 }
//             }
            
//             // 🚧 THE REAL BOUNDARY CHECK
//             let isBoundaryBreached = false;
//             if (boundaries && boundaries.lower !== undefined && boundaries.upper !== undefined) {
//                 isBoundaryBreached = (currentSpotPrice <= boundaries.lower || currentSpotPrice >= boundaries.upper);
//             }

//             if (isBoundaryBreached) {
//                 if (timeInMinutes >= timePhase2) { 
//                     console.log(`🚨 [LATE EXIT TRIGGERED] Time: ${currentTimeStr} >= ${this.config.phase2Time} | Spot: ${currentSpotPrice} touched Boundary (L: ${boundaries.lower.toFixed(2)} / U: ${boundaries.upper.toFixed(2)}). SQUARE OFF!`);
//                     return { action: 'SQUARE_OFF', reason: 'Late Break-Even Touch (Spot Price)' };
//                 } else {
//                     console.log(`⚠️ [EARLY BOUNDARY BREACH] Time: ${currentTimeStr} | Spot: ${currentSpotPrice} breached Boundary! Initiating Recovery Protocol...`);
//                     return { action: 'BOUNDARY_BREACH_EARLY', reason: 'Early Break-Even Boundary Touch (Spot Price)' };
//                 }
//             }
//         }

//         // 💥 FINAL CHECK: NORMAL SL HIT CONDITION
//         if (currentMTM <= this.currentSlLevel) {
//             return { action: 'SL_HIT', reason: `Dynamic SL Hit at ₹${this.currentSlLevel.toFixed(2)}`, slAmount: this.currentSlLevel };
//         }

//         return { action: 'HOLD', currentSlLevel: this.currentSlLevel, highestMTM: this.highestMTM };
//     }
// }

// module.exports = TimeBasedRiskManager;







class TimeBasedRiskManager {
    constructor(baseOnePercentAmount, isRecoveryMode = false, actualRiskAmount = null, tcConfig = {}) {
        this.baseOnePercent = baseOnePercentAmount;
        this.isRecoveryMode = isRecoveryMode;
        
        const tcTrailing = tcConfig.timeConditionedTrailing || {};
        const recSettings = tcConfig.recoverySettings || {};

        this.config = {
            phase1Time: tcTrailing.phase1Time || '12:00',
            phase1Profit: Number(tcTrailing.phase1Profit) || 0.5,
            phase2Time: tcTrailing.phase2Time || '14:30',
            phase2Profit: Number(tcTrailing.phase2Profit) || 1.0,
            phase2Lock: Number(tcTrailing.phase2Lock) || 0.8,
            phase2Trail: Number(tcTrailing.phase2Trail) || 0.2,
            
            recoveryC2C: Number(recSettings.c2cTrigger) || 0.4,
            recoveryTarget: Number(recSettings.target) || 1.0,
            recoveryLock: Number(recSettings.lock) || 0.5,
            recoveryTrail: Number(recSettings.trail) || 0.2,

            // 🔥 NAYA DYNAMIC CONTROL: Boundary Timings
            lateBoundaryTime: tcConfig.lateBoundaryTime || '14:30', 
            boundaryEndTime: tcConfig.boundaryEndTime || '15:00'
        };

        this.valPhase1Profit = this.baseOnePercent * this.config.phase1Profit;
        this.valPhase2Profit = this.baseOnePercent * this.config.phase2Profit;
        this.valPhase2Lock   = this.baseOnePercent * this.config.phase2Lock;
        this.valPhase2Trail  = this.baseOnePercent * this.config.phase2Trail;

        this.valRecC2C    = this.baseOnePercent * this.config.recoveryC2C;
        this.valRecTarget = this.baseOnePercent * this.config.recoveryTarget;
        this.valRecLock   = this.baseOnePercent * this.config.recoveryLock;
        this.valRecTrail  = this.baseOnePercent * this.config.recoveryTrail;

        let startingRisk = actualRiskAmount !== null ? actualRiskAmount : this.baseOnePercent;
        this.currentSlLevel = -Math.abs(startingRisk);
        this.highestMTM = 0;                  
        this.isC2CLocked = false;             
    }

    async evaluateRisk(currentMTM, currentTimeStr, currentSpotPrice = null, boundaries = null, getRealMTM = null) {
        if (currentMTM > this.highestMTM) {
            this.highestMTM = currentMTM;
        }

        const [hours, minutes] = currentTimeStr.split(':').map(Number);
        const timeInMinutes = (hours * 60) + minutes;
        
        const [h1, m1] = this.config.phase1Time.split(':').map(Number);
        const timePhase1 = (h1 * 60) + m1;

        const [h2, m2] = this.config.phase2Time.split(':').map(Number);
        const timePhase2 = (h2 * 60) + m2;

        const [hb, mb] = this.config.lateBoundaryTime.split(':').map(Number);
        const timeLateBoundary = (hb * 60) + mb;

        const [he, me] = this.config.boundaryEndTime.split(':').map(Number);
        const timeBoundaryEnd = (he * 60) + me;

        if (this.isRecoveryMode) {
            // ========================================================
            // 🚑 RECOVERY TRADE RULES
            // ========================================================
            if (!this.isC2CLocked && this.highestMTM >= this.valRecC2C) {
                this.currentSlLevel = 0;
                this.isC2CLocked = true;
                console.log(`\n🚑 [RECOVERY TRAIL] Time: ${currentTimeStr} | Profit crossed ${this.config.recoveryC2C}% of Margin (Target: ₹${this.valRecC2C.toFixed(2)}). Highest MTM: ₹${this.highestMTM.toFixed(2)}. SL locked at C2C (₹0.00).`);
            }

            if (this.highestMTM >= this.valRecTarget) { 
                let newSlLevel = this.currentSlLevel;
                if (this.highestMTM >= (this.valRecTarget + this.valRecTrail)) {
                    const extraProfit = this.highestMTM - (this.valRecTarget + this.valRecTrail);
                    const steps = Math.floor(extraProfit / this.valRecTrail);
                    newSlLevel = this.valRecTarget + (steps * this.valRecTrail);
                } else {
                    newSlLevel = this.valRecLock;
                }
                
                if (newSlLevel > this.currentSlLevel) {
                    this.currentSlLevel = newSlLevel;
                    console.log(`🚀 [RECOVERY TRAIL] Time: ${currentTimeStr} | Profit touched ₹${this.highestMTM.toFixed(2)}. SL trailed to ₹${this.currentSlLevel.toFixed(2)}`);
                }
            }

        } else {
            // ========================================================
            // 🟢 MAIN TRADE RULES (WITH PHANTOM PROFIT SHIELD)
            // ========================================================

            if (currentSpotPrice && boundaries) {
                if (currentSpotPrice >= boundaries.upper || currentSpotPrice <= boundaries.lower) {
                    if (timeInMinutes < timeLateBoundary) {
                        console.log(`🚨 [EARLY BOUNDARY BREACH] Spot (${currentSpotPrice}) touched Breakeven before ${this.config.lateBoundaryTime}! Initiating cut for possible Recovery.`);
                        return { action: 'BOUNDARY_BREACH_EARLY', reason: 'Early Breakeven Boundary Touch' }; 
                    } else if (timeInMinutes <= timeBoundaryEnd) {
                        console.log(`🚨 [LATE BOUNDARY BREACH] Spot (${currentSpotPrice}) touched Breakeven after ${this.config.lateBoundaryTime}! SQUARE OFF ALL LEGS.`);
                        return { action: 'SQUARE_OFF', reason: 'Late Breakeven Boundary Touch' };
                    }
                }
            }

            // 🛡️ Phase 1 (Move SL to Cost) - CROSS VERIFIED
            if (timeInMinutes < timePhase1) {
                if (!this.isC2CLocked && this.highestMTM >= this.valPhase1Profit) {
                    
                    let realMTM = currentMTM; 
                    if (getRealMTM) {
                        console.log(`\n🔍 [VERIFICATION] Mock MTM hit ₹${this.highestMTM.toFixed(2)}. Verifying REAL data for C2C...`);
                        realMTM = await getRealMTM(); // API se asli price aane tak wait karega
                    }

                    if (realMTM >= this.valPhase1Profit) {
                        this.currentSlLevel = 0;
                        this.isC2CLocked = true;
                        console.log(`✅ [VERIFIED MAIN TRAIL] Time: ${currentTimeStr} | Real MTM (₹${realMTM.toFixed(2)}) crossed ${this.config.phase1Profit}% (Target: ₹${this.valPhase1Profit.toFixed(2)}). SL locked at C2C.`);
                    } else {
                        console.log(`⚠️ [PHANTOM ALERT] Time: ${currentTimeStr} | Mock: ₹${this.highestMTM.toFixed(2)} vs REAL: ₹${realMTM.toFixed(2)}. C2C Lock Aborted!`);
                        this.highestMTM = realMTM; // Reset to prevent API spam
                    }
                }
            }

            // 🛡️ Phase 2 (Lock & Trail) - CROSS VERIFIED
            if (timeInMinutes < timePhase2) {
                if (this.highestMTM >= this.valPhase2Profit) {
                    const extraProfit = this.highestMTM - this.valPhase2Profit;
                    const steps = Math.floor(extraProfit / this.valPhase2Trail);
                    const newSlLevel = this.valPhase2Lock + (steps * this.valPhase2Trail);
                    
                    if (newSlLevel > this.currentSlLevel) {
                        
                        let realMTM = currentMTM;
                        if (getRealMTM) {
                            realMTM = await getRealMTM(); // API se asli price aane tak wait karega
                        }

                        if (realMTM >= this.valPhase2Profit) {
                            const realExtraProfit = realMTM - this.valPhase2Profit;
                            const realSteps = Math.floor(realExtraProfit / this.valPhase2Trail);
                            const realNewSlLevel = this.valPhase2Lock + (realSteps * this.valPhase2Trail);
                            
                            if (realNewSlLevel > this.currentSlLevel) {
                                this.currentSlLevel = realNewSlLevel;
                                console.log(`🚀 [VERIFIED MAIN TRAIL] Time: ${currentTimeStr} | Real MTM touched ₹${realMTM.toFixed(2)}. SL trailed to ₹${this.currentSlLevel.toFixed(2)}`);
                            }
                        } else {
                            // Agar naya sl level real market me achieve nahi hua
                            this.highestMTM = realMTM; 
                        }
                    }
                }
            }
            
            // 🚧 THE REAL BOUNDARY CHECK
            let isBoundaryBreached = false;
            if (boundaries && boundaries.lower !== undefined && boundaries.upper !== undefined) {
                isBoundaryBreached = (currentSpotPrice <= boundaries.lower || currentSpotPrice >= boundaries.upper);
            }

            if (isBoundaryBreached) {
                if (timeInMinutes >= timePhase2) { 
                    console.log(`🚨 [LATE EXIT TRIGGERED] Time: ${currentTimeStr} >= ${this.config.phase2Time} | Spot: ${currentSpotPrice} touched Boundary (L: ${boundaries.lower.toFixed(2)} / U: ${boundaries.upper.toFixed(2)}). SQUARE OFF!`);
                    return { action: 'SQUARE_OFF', reason: 'Late Break-Even Touch (Spot Price)' };
                } else {
                    console.log(`⚠️ [EARLY BOUNDARY BREACH] Time: ${currentTimeStr} | Spot: ${currentSpotPrice} breached Boundary! Initiating Recovery Protocol...`);
                    return { action: 'BOUNDARY_BREACH_EARLY', reason: 'Early Break-Even Boundary Touch (Spot Price)' };
                }
            }
        }

        // // 💥 FINAL CHECK: NORMAL SL HIT CONDITION
        // if (currentMTM <= this.currentSlLevel) {
        //     return { action: 'SL_HIT', reason: `Dynamic SL Hit at ₹${this.currentSlLevel.toFixed(2)}`, slAmount: this.currentSlLevel };
        // }

        // 💥 FINAL CHECK: NORMAL SL HIT CONDITION (CROSS-VERIFIED)
        if (currentMTM <= this.currentSlLevel) {
            
            let realMTM = currentMTM; 
            if (getRealMTM) {
                console.log(`\n🔍 [VERIFICATION] Mock MTM hit SL at ₹${currentMTM.toFixed(2)}. Verifying REAL data before cutting trade...`);
                realMTM = await getRealMTM(); // API se asli price aane tak wait karega
            }

            // Cross-Check: Kya asli market me bhi SL level hit hua hai?
            if (realMTM <= this.currentSlLevel) {
                console.log(`🚨 [VERIFIED SL HIT] Real MTM (₹${realMTM.toFixed(2)}) breached SL level (₹${this.currentSlLevel.toFixed(2)}). Exiting trade!`);
                return { action: 'SL_HIT', reason: `Verified SL Hit at ₹${this.currentSlLevel.toFixed(2)}`, slAmount: this.currentSlLevel };
            } else {
                // ❌ Fake Loss Pakda Gaya!
                console.log(`⚠️ [PHANTOM LOSS ALERT] Time: ${currentTimeStr} | Mock: ₹${currentMTM.toFixed(2)} vs REAL: ₹${realMTM.toFixed(2)}. SL Exit Aborted! Holding trade...`);
                
                // 🔥 NAYA FIX: API spam rokne ke liye highestMTM ko real MTM par reset kar do
                // Taaki engine har second check karke hang na ho
                this.highestMTM = realMTM; 
            }
        }

        return { action: 'HOLD', currentSlLevel: this.currentSlLevel, highestMTM: this.highestMTM };
    }
}

module.exports = TimeBasedRiskManager;