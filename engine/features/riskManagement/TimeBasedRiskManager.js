// // // File: src/engine/features/TimeBasedRiskManager.js

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

//     async evaluateRisk(currentMTM, currentTimeStr, currentSpotPrice = null, boundaries = null, getRealMTM = null) {
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
//             // 🟢 MAIN TRADE RULES (WITH PHANTOM PROFIT SHIELD)
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

//             // 🛡️ Phase 1 (Move SL to Cost) - CROSS VERIFIED
//             if (timeInMinutes < timePhase1) {
//                 if (!this.isC2CLocked && this.highestMTM >= this.valPhase1Profit) {
                    
//                     let realMTM = currentMTM; 
//                     if (getRealMTM) {
//                         console.log(`\n🔍 [VERIFICATION] Mock MTM hit ₹${this.highestMTM.toFixed(2)}. Verifying REAL data for C2C...`);
//                         realMTM = await getRealMTM(); // API se asli price aane tak wait karega
//                     }

//                     if (realMTM >= this.valPhase1Profit) {
//                         this.currentSlLevel = 0;
//                         this.isC2CLocked = true;
//                         console.log(`✅ [VERIFIED MAIN TRAIL] Time: ${currentTimeStr} | Real MTM (₹${realMTM.toFixed(2)}) crossed ${this.config.phase1Profit}% (Target: ₹${this.valPhase1Profit.toFixed(2)}). SL locked at C2C.`);
//                     } else {
//                         console.log(`⚠️ [PHANTOM ALERT] Time: ${currentTimeStr} | Mock: ₹${this.highestMTM.toFixed(2)} vs REAL: ₹${realMTM.toFixed(2)}. C2C Lock Aborted!`);
//                         this.highestMTM = realMTM; // Reset to prevent API spam
//                     }
//                 }
//             }

//             // 🛡️ Phase 2 (Lock & Trail) - CROSS VERIFIED
//             if (timeInMinutes < timePhase2) {
//                 if (this.highestMTM >= this.valPhase2Profit) {
//                     const extraProfit = this.highestMTM - this.valPhase2Profit;
//                     const steps = Math.floor(extraProfit / this.valPhase2Trail);
//                     const newSlLevel = this.valPhase2Lock + (steps * this.valPhase2Trail);
                    
//                     if (newSlLevel > this.currentSlLevel) {
                        
//                         let realMTM = currentMTM;
//                         if (getRealMTM) {
//                             realMTM = await getRealMTM(); // API se asli price aane tak wait karega
//                         }

//                         if (realMTM >= this.valPhase2Profit) {
//                             const realExtraProfit = realMTM - this.valPhase2Profit;
//                             const realSteps = Math.floor(realExtraProfit / this.valPhase2Trail);
//                             const realNewSlLevel = this.valPhase2Lock + (realSteps * this.valPhase2Trail);
                            
//                             if (realNewSlLevel > this.currentSlLevel) {
//                                 this.currentSlLevel = realNewSlLevel;
//                                 console.log(`🚀 [VERIFIED MAIN TRAIL] Time: ${currentTimeStr} | Real MTM touched ₹${realMTM.toFixed(2)}. SL trailed to ₹${this.currentSlLevel.toFixed(2)}`);
//                             }
//                         } else {
//                             // Agar naya sl level real market me achieve nahi hua
//                             this.highestMTM = realMTM; 
//                         }
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

//         // // 💥 FINAL CHECK: NORMAL SL HIT CONDITION
//         // if (currentMTM <= this.currentSlLevel) {
//         //     return { action: 'SL_HIT', reason: `Dynamic SL Hit at ₹${this.currentSlLevel.toFixed(2)}`, slAmount: this.currentSlLevel };
//         // }

//         // 💥 FINAL CHECK: NORMAL SL HIT CONDITION (CROSS-VERIFIED)
//         if (currentMTM <= this.currentSlLevel) {
            
//             let realMTM = currentMTM; 
//             if (getRealMTM) {
//                 console.log(`\n🔍 [VERIFICATION] Mock MTM hit SL at ₹${currentMTM.toFixed(2)}. Verifying REAL data before cutting trade...`);
//                 realMTM = await getRealMTM(); // API se asli price aane tak wait karega
//             }

//             // Cross-Check: Kya asli market me bhi SL level hit hua hai?
//             if (realMTM <= this.currentSlLevel) {
//                 console.log(`🚨 [VERIFIED SL HIT] Real MTM (₹${realMTM.toFixed(2)}) breached SL level (₹${this.currentSlLevel.toFixed(2)}). Exiting trade!`);
//                 return { action: 'SL_HIT', reason: `Verified SL Hit at ₹${this.currentSlLevel.toFixed(2)}`, slAmount: this.currentSlLevel };
//             } else {
//                 // ❌ Fake Loss Pakda Gaya!
//                 console.log(`⚠️ [PHANTOM LOSS ALERT] Time: ${currentTimeStr} | Mock: ₹${currentMTM.toFixed(2)} vs REAL: ₹${realMTM.toFixed(2)}. SL Exit Aborted! Holding trade...`);
                
//                 // 🔥 NAYA FIX: API spam rokne ke liye highestMTM ko real MTM par reset kar do
//                 // Taaki engine har second check karke hang na ho
//                 this.highestMTM = realMTM; 
//             }
//         }

//         return { action: 'HOLD', currentSlLevel: this.currentSlLevel, highestMTM: this.highestMTM };
//     }
// }

// module.exports = TimeBasedRiskManager;



// // File: src/engine/features/TimeBasedRiskManager.js

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

        // 💥 FINAL CHECK: NORMAL SL HIT CONDITION & VELOCITY GUARD
        // =========================================================
        // 🚨 STEP 3: THE API OVERRIDE (Panic Mode & Mock SL)
        // Agar Mock MTM SL hit kare YAA Panic Mode ON ho, dono case me API call hogi!
        if (currentMTM <= this.currentSlLevel || this.isPanicApiMode) {
            
            let realMTM = currentMTM; 
            if (getRealMTM) {
                if (this.isPanicApiMode) {
                    console.log(`\n🚨 [VELOCITY GUARD] Panic Mode ON! Bypassing Mock MTM (₹${currentMTM.toFixed(2)}) & verifying REAL data directly...`);
                } else {
                    console.log(`\n🔍 [VERIFICATION] Mock MTM hit SL at ₹${currentMTM.toFixed(2)}. Verifying REAL data before cutting trade...`);
                }
                realMTM = await getRealMTM(); // API se asli price aane tak wait karega
            }


           // -------------------------------------------------------------
            // ⚔️ STEP 4: GAMMA BLAST MASTER EXIT & COOL-DOWN
            // -------------------------------------------------------------
            let wasPanicMode = this.isPanicApiMode; // 🔥 Memory for Phantom Guard

            if (this.isPanicApiMode) {
                const gbSettings = this.config?.riskManagement?.gammaBlastSettings || {};
                const panicPct = Number(gbSettings.panicLimitPct) || 70; 
                const gammaCutoff = this.currentSlLevel * (panicPct / 100);
                
                // 1. Cool-down (Vega Crush ho gaya, trade wapas profit me aa gaya)
                if (realMTM > 0) {
                    console.log(`🟢 [PANIC OVER] Time: ${currentTimeStr} | Market stabilized! Real MTM (₹${realMTM.toFixed(2)}) is in profit. Returning to normal Mock Mode.`);
                    this.isPanicApiMode = false; // Risk manager me Panic mode band
                    
                    // 🔥 THE MISSING FIX: Turant main file ko batao ki Panic band ho gaya hai, aage mat badho!
                    return { action: 'HOLD', currentSlLevel: this.currentSlLevel, highestMTM: this.highestMTM, isPanicApiMode: false };
                } 
                // 2. The Emergency Cut 
                else if (realMTM <= gammaCutoff) {
                    console.log(`💥 [VELOCITY GUARD BREACH] Time: ${currentTimeStr} | Real MTM (₹${realMTM.toFixed(2)}) crossed ${panicPct}% Panic Limit (₹${gammaCutoff.toFixed(2)})! Cutting trade early to save capital.`);
                    return { action: 'SL_HIT', reason: 'GAMMA_BLAST_VELOCITY_BREACH', slAmount: gammaCutoff };
                }
            }
            // -------------------------------------------------------------

            // 🛡️ Cross-Check: Kya asli market me bhi SL level hit hua hai? (Normal Guard)
            if (realMTM <= this.currentSlLevel) {
                console.log(`🚨 [VERIFIED SL HIT] Real MTM (₹${realMTM.toFixed(2)}) breached SL level (₹${this.currentSlLevel.toFixed(2)}). Exiting trade!`);
                return { action: 'SL_HIT', reason: `Verified SL Hit at ₹${this.currentSlLevel.toFixed(2)}`, slAmount: this.currentSlLevel };
            } else {
                // ❌ Fake Loss Pakda Gaya! (Sirf tab print hoga jab Panic mode OFF ho)
                if (!this.isPanicApiMode) {
                    console.log(`⚠️ [PHANTOM LOSS ALERT] Time: ${currentTimeStr} | Mock: ₹${currentMTM.toFixed(2)} vs REAL: ₹${realMTM.toFixed(2)}. SL Exit Aborted! Holding trade...`);
                }
                
                // 🔥 NAYA FIX: API spam rokne ke liye highestMTM ko real MTM par reset kar do
                this.highestMTM = realMTM; 
            }
        }

        // 🔥 NAYA FIX: isPanicApiMode ko wapas return kar rahe hain taaki main file ko update mil sake
        return { action: 'HOLD', currentSlLevel: this.currentSlLevel, highestMTM: this.highestMTM, isPanicApiMode: this.isPanicApiMode };
    }
}

module.exports = TimeBasedRiskManager;