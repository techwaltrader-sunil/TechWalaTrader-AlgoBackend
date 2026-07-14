// // File: src/engine/timeBasedEngine.js

// const { findOptimalStrikes } = require('./scanners/optionChainScanner');
// const { calculateApproxBasketMargin, fetchLiveBasketMargin } = require('./utils/marginCalculator');
// const TimeBasedRiskManager = require('./features/TimeBasedRiskManager');

// class TimeBasedEngine {
//     constructor(strategyConfig, isLiveMode = false) {
//         this.config = strategyConfig;      // UI se aaya hua JSON data
//         this.isLiveMode = isLiveMode;      // True for Live, False for Backtest
        
//         // 🎯 State Tracking
//         this.status = 'WAITING_FOR_ENTRY'; // State Machine
//         this.activeLegs = [];              // Abhi kaun se trades chal rahe hain
//         this.riskManager = null;           // SL trail karne wala manager
        
//         // 💰 Capital & Recovery Tracking
//         this.estimatedMargin = 0;
//         this.maxLossLimit = 0;             // Trade Capital ka 1%
//         this.realizedLoss = 0;             // Agar SL hit hua toh kitna loss book hua
//         this.recoveryAttemptsLeft = strategyConfig.riskManagement?.recoverySettings?.enableRecovery ? (strategyConfig.riskManagement.recoverySettings.attempts || 2) : 0;
//     }

//     // ========================================================
//     // 1️⃣ ENTRY LOGIC (e.g., 09:27 AM)
//     // ========================================================
//     async evaluateEntry(currentTime, currentSpotPrice, broker) {
//         if (this.status === 'WAITING_FOR_ENTRY' && currentTime === this.config.startTime) {
//             console.log(`\n🚀 [TIME ENGINE] Trigger Time Reached (${currentTime}). Initiating Entry Protocol...`);
            
//             // 1. Scanner se 1:4 wale strikes nikalo
//             const ratioParams = this.config.ratioSpreadParams || { divisor: 4, baseBuyLots: 1, sellMultiplier: 4 };
            
//             const optimalLegsObj = await findOptimalStrikes(
//                 this.config.symbol || "NIFTY 50", 
//                 currentSpotPrice, 
//                 this.config.expiry, 
//                 ratioParams.divisor, 
//                 ratioParams.baseBuyLots, 
//                 broker
//             );

//             if (!optimalLegsObj) {
//                 console.log("❌ [TIME ENGINE] Failed to find optimal strikes. Aborting trade.");
//                 this.status = 'COMPLETED';
//                 return null;
//             }

//             // Object ko Array me convert karna taaki loop chalana aasan ho
//             this.activeLegs = [
//                 { ...optimalLegsObj.buyLegCE, entryPrice: optimalLegsObj.buyLegCE.ltp, tag: 'MAIN' },
//                 { ...optimalLegsObj.buyLegPE, entryPrice: optimalLegsObj.buyLegPE.ltp, tag: 'MAIN' },
//                 { ...optimalLegsObj.sellLegCE, entryPrice: optimalLegsObj.sellLegCE.ltp, tag: 'MAIN' },
//                 { ...optimalLegsObj.sellLegPE, entryPrice: optimalLegsObj.sellLegPE.ltp, tag: 'MAIN' }
//             ];

//             // 2. Margin Calculate karo (The 1% Rule Foundation)
//             this.estimatedMargin = this.isLiveMode 
//                 ? await fetchLiveBasketMargin(this.activeLegs, broker) 
//                 : calculateApproxBasketMargin(this.activeLegs, this.config.symbol || "NIFTY 50");
            
//             // 3. Trade Capital ka 1% (Max Loss) Set karo
//             const riskPct = this.config.riskManagement?.maxLossPct || 1; 
//             this.maxLossLimit = this.estimatedMargin * (riskPct / 100);
            
//             console.log(`🏦 Est. Margin: ₹${this.estimatedMargin.toFixed(2)} | 🛡️ 1% Max Loss SL: -₹${this.maxLossLimit.toFixed(2)}`);

//             // 4. Risk Manager (Gatekeeper) Initialize karo
//             this.riskManager = new TimeBasedRiskManager(this.maxLossLimit);
//             this.status = 'ACTIVE';

//             return { action: 'EXECUTE_ENTRY', legs: this.activeLegs };
//         }
//         return null;
//     }

//     // ========================================================
//     // 2️⃣ TICK EVALUATION (Every Second/Minute)
//     // ========================================================
//     evaluateTick(currentTime, currentLTPs) {
//         if (this.status !== 'ACTIVE' && this.status !== 'RECOVERY_MODE') return null;

//         // 1. Calculate Live PnL
//         let currentMTM = this.calculateMTM(currentLTPs);

//         // 2. Risk Manager ko decision lene do (Trailing, Lock, ya SL Hit)
//         const decision = this.riskManager.evaluateRisk(currentMTM, currentTime);

//         // 🟢 SQUARE OFF (Profit booked ya Late Break-Even)
//         if (decision.action === 'SQUARE_OFF') {
//             console.log(`\n🎉 [EXIT] Strategy Exited. Reason: ${decision.reason} | Final MTM: ₹${currentMTM.toFixed(2)}`);
//             this.status = 'COMPLETED';
//             return { action: 'EXIT_ALL', reason: decision.reason, mtm: currentMTM };
//         }

//         // 🔴 SL HIT (Check for Recovery Firefighting)
//         if (decision.action === 'SL_HIT') {
//             console.log(`\n💥 [SL HIT] Stoploss hit at ₹${currentMTM.toFixed(2)}. Tracking remaining capital...`);
            
//             this.realizedLoss += currentMTM; // E.g., -800
            
//             if (this.status === 'ACTIVE' && this.config.riskManagement?.recoverySettings?.enableRecovery && this.recoveryAttemptsLeft > 0) {
//                 return this.initiateRecoveryProtocol(currentLTPs);
//             } else {
//                 console.log(`🚫 [GAME OVER] No recovery attempts left or Max Loss reached. EXIT ALL.`);
//                 this.status = 'COMPLETED';
//                 return { action: 'EXIT_ALL', reason: 'Max Loss Reached', mtm: this.realizedLoss };
//             }
//         }

//         // 🟡 HOLD (Sab theek hai, chalne do)
//         return { action: 'HOLD', currentMTM, slLevel: decision.currentSlLevel };
//     }

//     // ========================================================
//     // 3️⃣ MTM CALCULATOR
//     // ========================================================
//     calculateMTM(liveLTPs) {
//         let totalPnL = 0;
        
//         for (const leg of this.activeLegs) {
//             // liveLTPs ek object hoga, e.g., { "token1": 150, "token2": 140 }
//             const currentPrice = liveLTPs[leg.inst.id] || leg.entryPrice; 
//             const lotMultiplier = leg.lots * (leg.inst.lotSize || 25);
            
//             if (leg.action === 'BUY') {
//                 totalPnL += (currentPrice - leg.entryPrice) * lotMultiplier;
//             } else if (leg.action === 'SELL') {
//                 totalPnL += (leg.entryPrice - currentPrice) * lotMultiplier;
//             }
//         }
//         return totalPnL;
//     }

//     // ========================================================
//     // 4️⃣ THE FIREFIGHTING ENGINE (Loss Recovery)
//     // ========================================================
//     initiateRecoveryProtocol(currentLTPs) {
//         this.status = 'RECOVERY_MODE';
//         this.recoveryAttemptsLeft -= 1;
        
//         console.log(`\n🚑 [FIREFIGHTING] Initiating Recovery Entry! Attempts left: ${this.recoveryAttemptsLeft}`);

//         // 1. Calculate Remaining Capital for SL
//         // Agar max loss ₹2000 tha, aur abhi ₹800 loss hua, toh ₹1200 bache hain.
//         const remainingLossCap = this.maxLossLimit - Math.abs(this.realizedLoss);
        
//         // Bacha hua SL ka 50% use karenge (as per your rule)
//         const riskPctPerAttempt = this.config.riskManagement?.recoverySettings?.riskPct || 50;
//         const recoveryRiskAmount = remainingLossCap * (riskPctPerAttempt / 100);

//         // 2. Find Trend Direction to know which side to Naked Sell
//         // Agar ATM CE ka daam badha hai = Market Uppar gaya hai = PE sell karo
//         const atmCeLeg = this.activeLegs.find(l => l.tag === 'MAIN' && l.type === 'CE' && l.action === 'BUY');
//         const currentAtmCePrice = currentLTPs[atmCeLeg.inst.id] || atmCeLeg.entryPrice;
        
//         let sellType = 'CE'; // Default if market fell
//         let selectedOldLeg = null;

//         if (currentAtmCePrice > atmCeLeg.entryPrice) {
//             // Market is UP -> We will sell Naked PE
//             sellType = 'PE';
//             console.log("📈 Market Trend is UP. Firing NAKED PE Sell for recovery!");
//             selectedOldLeg = this.activeLegs.find(l => l.tag === 'MAIN' && l.type === 'PE' && l.action === 'SELL');
//         } else {
//             // Market is DOWN -> We will sell Naked CE
//             sellType = 'CE';
//             console.log("📉 Market Trend is DOWN. Firing NAKED CE Sell for recovery!");
//             selectedOldLeg = this.activeLegs.find(l => l.tag === 'MAIN' && l.type === 'CE' && l.action === 'SELL');
//         }

//         // 3. Purane saare legs square-off karne ka signal bhejo, aur naya Naked leg entry me daalo
//         const oldLegsToExit = [...this.activeLegs];
        
//         // Naya Naked Leg (Purane OTM strike ko hi dobara sell kar rahe hain 4 lots me)
//         const ratioParams = this.config.ratioSpreadParams || { sellMultiplier: 4 };
//         const recoveryLeg = {
//             ...selectedOldLeg,
//             action: 'SELL',
//             lots: ratioParams.sellMultiplier, // Your divide wala number (e.g., 4)
//             entryPrice: currentLTPs[selectedOldLeg.inst.id] || selectedOldLeg.entryPrice,
//             tag: 'RECOVERY'
//         };

//         this.activeLegs = [recoveryLeg]; // Ab sirf ye ek leg active rahega

//         // 4. Initialize NEW Risk Manager specifically for this Recovery Trade
//         // NOTE: Hum iske trailing rules `TimeBasedRiskManager` me update karenge
//         // this.riskManager = new TimeBasedRiskManager(recoveryRiskAmount, true); // true = isRecoveryMode

//         this.riskManager = new TimeBasedRiskManager(this.maxLossLimit, true, recoveryRiskAmount, this.config.riskManagement);

//         return { 
//             action: 'RECOVERY_SWITCH', 
//             exitLegs: oldLegsToExit,    // Inhe square off karna hai
//             enterLegs: [recoveryLeg],   // Ise naya execute karna hai
//             newRiskAmount: recoveryRiskAmount 
//         };
//     }
// }

// module.exports = TimeBasedEngine;




// File: src/engine/timeBasedEngine.js

// const { findOptimalStrikes } = require('./scanners/optionChainScanner');
// const { calculateApproxBasketMargin, fetchLiveBasketMargin } = require('./utils/marginCalculator');
// const TimeBasedRiskManager = require('./features/riskManagement/TimeBasedRiskManager');

// class TimeBasedEngine {
//     constructor(strategyConfig, isLiveMode = false) {
//         this.config = strategyConfig;      // UI se aaya hua JSON data
//         this.isLiveMode = isLiveMode;      // True for Live, False for Backtest
        
//         // 🎯 State Tracking
//         this.status = 'WAITING_FOR_ENTRY'; // State Machine
//         this.activeLegs = [];              // Abhi kaun se trades chal rahe hain
//         this.riskManager = null;           // SL trail karne wala manager
        
//         // 💰 Capital, Recovery & Boundary Tracking
//         this.estimatedMargin = 0;
//         this.maxLossLimit = 0;             // Trade Capital ka 1%
//         this.realizedLoss = 0;             // Agar SL hit hua toh kitna loss book hua
//         this.recoveryAttemptsLeft = strategyConfig.riskManagement?.recoverySettings?.enableRecovery ? (strategyConfig.riskManagement.recoverySettings.attempts || 2) : 0;
//         this.tradeBoundaries = { upper: Infinity, lower: 0 }; // Breakeven points
//     }

//     // ========================================================
//     // 1️⃣ ENTRY LOGIC (e.g., 09:27 AM)
//     // ========================================================
//     async evaluateEntry(currentTime, currentSpotPrice, broker) {
//         if (this.status === 'WAITING_FOR_ENTRY' && currentTime === this.config.startTime) {
//             console.log(`\n🚀 [TIME ENGINE] Trigger Time Reached (${currentTime}). Initiating Entry Protocol...`);
            
//             // 1. Scanner se 1:4 wale strikes nikalo
//             const ratioParams = this.config.ratioSpreadParams || { divisor: 4, baseBuyLots: 1, sellMultiplier: 4 };
            
//             const optimalLegsObj = await findOptimalStrikes(
//                 this.config.symbol || "NIFTY 50", 
//                 currentSpotPrice, 
//                 this.config.expiry, 
//                 ratioParams.divisor, 
//                 ratioParams.baseBuyLots, 
//                 broker
//             );

//             if (!optimalLegsObj) {
//                 console.log("❌ [TIME ENGINE] Failed to find optimal strikes. Aborting trade.");
//                 this.status = 'COMPLETED';
//                 return null;
//             }

//             // Object ko Array me convert karna taaki loop chalana aasan ho
//             this.activeLegs = [
//                 { ...optimalLegsObj.buyLegCE, entryPrice: optimalLegsObj.buyLegCE.ltp, tag: 'MAIN' },
//                 { ...optimalLegsObj.buyLegPE, entryPrice: optimalLegsObj.buyLegPE.ltp, tag: 'MAIN' },
//                 { ...optimalLegsObj.sellLegCE, entryPrice: optimalLegsObj.sellLegCE.ltp, tag: 'MAIN' },
//                 { ...optimalLegsObj.sellLegPE, entryPrice: optimalLegsObj.sellLegPE.ltp, tag: 'MAIN' }
//             ];

//             // 2. Margin Calculate karo (The 1% Rule Foundation)
//             this.estimatedMargin = this.isLiveMode 
//                 ? await fetchLiveBasketMargin(this.activeLegs, broker) 
//                 : calculateApproxBasketMargin(this.activeLegs, this.config.symbol || "NIFTY 50");
            
//             // 3. Trade Capital ka 1% (Max Loss) Set karo
//             const riskPct = this.config.riskManagement?.maxLossPct || 1; 
//             this.maxLossLimit = this.estimatedMargin * (riskPct / 100);
            
//             console.log(`🏦 Est. Margin: ₹${this.estimatedMargin.toFixed(2)} | 🛡️ 1% Max Loss SL: -₹${this.maxLossLimit.toFixed(2)}`);

//             // 4. Risk Manager (Gatekeeper) Initialize karo
//             this.riskManager = new TimeBasedRiskManager(this.maxLossLimit, false, null, this.config.riskManagement);
            
//             // 🔥 5. NEW: Calculate Breakeven Boundaries at Entry
//             this.tradeBoundaries = this.calculateBreakevens();
//             console.log(`🚧 Trade Boundaries Set: Lower BE = ${this.tradeBoundaries.lower.toFixed(2)} | Upper BE = ${this.tradeBoundaries.upper.toFixed(2)}`);

//             this.status = 'ACTIVE';

//             return { action: 'EXECUTE_ENTRY', legs: this.activeLegs };
//         }
//         return null;
//     }

//     // ========================================================
//     // 🔥 NEW UTILITY: BREAKEVEN CALCULATOR (ACCURATE MATH)
//     // ========================================================
//     calculateBreakevens() {
//         try {
//             const buyCE = this.activeLegs.find(l => l.type === 'CE' && l.action === 'BUY' && l.tag === 'MAIN');
//             const sellCE = this.activeLegs.find(l => l.type === 'CE' && l.action === 'SELL' && l.tag === 'MAIN');
//             const buyPE = this.activeLegs.find(l => l.type === 'PE' && l.action === 'BUY' && l.tag === 'MAIN');
//             const sellPE = this.activeLegs.find(l => l.type === 'PE' && l.action === 'SELL' && l.tag === 'MAIN');

//             if (!buyCE || !sellCE || !buyPE || !sellPE) return { lower: 0, upper: Infinity };

//             // 1. Ratio Multipliers (Humne kitne guna lot sell kiye hain)
//             const nCE = sellCE.lots / buyCE.lots; // Example: 4 / 1 = 4
//             const nPE = sellPE.lots / buyPE.lots; // Example: 4 / 1 = 4

//             // 2. Net Premium (Points me Credit received - Debit paid)
//             const totalDebit = buyCE.entryPrice + buyPE.entryPrice;
//             const totalCredit = (sellCE.entryPrice * nCE) + (sellPE.entryPrice * nPE);
//             const netPremium = totalCredit - totalDebit;

//             // 3. Exact Ratio Spread Math Formulas
//             const ceWidth = sellCE.strike - buyCE.strike; // Example: 24550 - 24450 = 100
//             const peWidth = buyPE.strike - sellPE.strike; // Example: 24450 - 24350 = 100

//             // Slope denominator is (Ratio - 1) because 1 bought leg cancels out 1 sold leg's risk
//             const upperBE = sellCE.strike + ((ceWidth + netPremium) / (nCE - 1));
//             const lowerBE = sellPE.strike - ((peWidth + netPremium) / (nPE - 1));

//             return { lower: lowerBE, upper: upperBE };
//         } catch (error) {
//             console.error("❌ Error calculating breakevens:", error);
//             return { lower: 0, upper: Infinity };
//         }
//     }

//     // ========================================================
//     // 2️⃣ TICK EVALUATION (Every Second/Minute)
//     // ========================================================
//     evaluateTick(currentTime, currentLTPs, currentSpotPrice) { 
//         if (this.status !== 'ACTIVE' && this.status !== 'RECOVERY_MODE') return null;

//         // 1. Calculate Live PnL
//         let currentMTM = this.calculateMTM(currentLTPs);

//         // 2. Risk Manager ko decision lene do
//         const decision = this.riskManager.evaluateRisk(currentMTM, currentTime, currentSpotPrice, this.tradeBoundaries);

//         // 🟢 SQUARE OFF (Profit booked ya LATE Break-Even Touch - 2:30 ke baad)
//         if (decision.action === 'SQUARE_OFF') {
//             // 🔥 NAYA FIX: Yahan 'currentTime' add kar diya gaya hai!
//             console.log(`\n🎉 [EXIT] Strategy Exited at ${currentTime}. Reason: ${decision.reason} | Estimated MTM: ₹${currentMTM.toFixed(2)}`);
//             this.status = 'COMPLETED';
//             return { action: 'EXIT_ALL', reason: decision.reason, mtm: currentMTM };
//         }

//         // 🔴 SL HIT या EARLY BOUNDARY BREACH (2:30 ke pehle)
//         if (decision.action === 'SL_HIT' || decision.action === 'BOUNDARY_BREACH_EARLY') {
//             // 🔥 NAYA FIX: Yahan bhi 'currentTime' add kar diya hai taaki har SL/Boundary touch ka time dikhe!
//             console.log(`\n💥 [MAIN EXIT] Reason: ${decision.reason} at ${currentTime} | Estimated MTM: ₹${currentMTM.toFixed(2)}. Tracking capital...`);
            
//             this.realizedLoss += currentMTM; 
            
//             // 🔥 CHANCHAL'S RULE: Check karo ki kya humare paas Recovery lene ke liye capital bacha hai?
//             const remainingLossCap = this.maxLossLimit - Math.abs(this.realizedLoss);

//             if (this.status === 'ACTIVE' && 
//                 this.config.riskManagement?.recoverySettings?.enableRecovery && 
//                 this.recoveryAttemptsLeft > 0 &&
//                 remainingLossCap > 0) { // Capital MUST be greater than 0
                
//                 return this.initiateRecoveryProtocol(currentLTPs);
//             } else {
//                 console.log(`🚫 [GAME OVER] No recovery attempts left OR Max Loss reached (Remaining Cap: ₹${remainingLossCap.toFixed(2)}). EXIT ALL at ${currentTime}.`);
//                 this.status = 'COMPLETED';
//                 return { action: 'EXIT_ALL', reason: decision.reason, mtm: this.realizedLoss };
//             }
//         }

//         // 🟡 HOLD (Sab theek hai, chalne do)
//         return { action: 'HOLD', currentMTM, slLevel: decision.currentSlLevel };
//     }

//     // ========================================================
//     // 3️⃣ MTM CALCULATOR
//     // ========================================================
//     calculateMTM(liveLTPs) {
//         let totalPnL = 0;
        
//         for (const leg of this.activeLegs) {
//             // 🔥 THE FIX: '||' ki jagah '!== undefined' use kiya. 
//             // Ab agar LTP sach me '0' hoga, toh engine use 0 hi maanega, entryPrice nahi uthayega!
//             const currentPrice = liveLTPs[leg.inst?.id] !== undefined ? liveLTPs[leg.inst?.id] : leg.entryPrice; 
            
//             const lotMultiplier = leg.lots * (leg.inst?.lotSize || 25);
            
//             if (leg.action === 'BUY') {
//                 totalPnL += (currentPrice - leg.entryPrice) * lotMultiplier;
//             } else if (leg.action === 'SELL') {
//                 totalPnL += (leg.entryPrice - currentPrice) * lotMultiplier;
//             }
//         }
//         return totalPnL;
//     }
//     // ========================================================
//     // 4️⃣ THE FIREFIGHTING ENGINE (Loss Recovery)
//     // ========================================================
//     initiateRecoveryProtocol(currentLTPs) {
//         this.status = 'RECOVERY_MODE';
//         this.recoveryAttemptsLeft -= 1;
        
//         console.log(`\n🚑 [FIREFIGHTING] Initiating Recovery Entry! Attempts left: ${this.recoveryAttemptsLeft}`);

//         // 1. Calculate Remaining Capital for SL
//         const remainingLossCap = this.maxLossLimit - Math.abs(this.realizedLoss);
        
//         const riskPctPerAttempt = this.config.riskManagement?.recoverySettings?.riskPct || 50;
//         const recoveryRiskAmount = remainingLossCap * (riskPctPerAttempt / 100);

//         // 2. Find Trend Direction to know which side to Naked Sell
//         const atmCeLeg = this.activeLegs.find(l => l.tag === 'MAIN' && l.type === 'CE' && l.action === 'BUY');
//         const currentAtmCePrice = currentLTPs[atmCeLeg.inst?.id] || atmCeLeg.entryPrice;
        
//         let sellType = 'CE'; // Default if market fell
//         let selectedOldLeg = null;

//         if (currentAtmCePrice > atmCeLeg.entryPrice) {
//             // Market is UP -> We will sell Naked PE
//             sellType = 'PE';
//             console.log("📈 Market Trend is UP. Firing NAKED PE Sell for recovery!");
//             selectedOldLeg = this.activeLegs.find(l => l.tag === 'MAIN' && l.type === 'PE' && l.action === 'SELL');
//         } else {
//             // Market is DOWN -> We will sell Naked CE
//             sellType = 'CE';
//             console.log("📉 Market Trend is DOWN. Firing NAKED CE Sell for recovery!");
//             selectedOldLeg = this.activeLegs.find(l => l.tag === 'MAIN' && l.type === 'CE' && l.action === 'SELL');
//         }

//         // 3. Purane saare legs square-off karne ka signal bhejo
//         const oldLegsToExit = [...this.activeLegs];
        
//         // Naya Naked Leg
//         const ratioParams = this.config.ratioSpreadParams || { sellMultiplier: 4 };
//         const recoveryLeg = {
//             ...selectedOldLeg,
//             action: 'SELL',
//             lots: ratioParams.sellMultiplier,
//             entryPrice: currentLTPs[selectedOldLeg.inst?.id] || selectedOldLeg.entryPrice,
//             tag: 'RECOVERY'
//         };

//         this.activeLegs = [recoveryLeg];

//         // 4. Initialize NEW Risk Manager for this Recovery Trade
//         this.riskManager = new TimeBasedRiskManager(this.maxLossLimit, true, recoveryRiskAmount, this.config.riskManagement);

//         return { 
//             action: 'RECOVERY_SWITCH', 
//             exitLegs: oldLegsToExit,    
//             enterLegs: [recoveryLeg],   
//             newRiskAmount: recoveryRiskAmount 
//         };
//     }
// }

// module.exports = TimeBasedEngine;







const { findOptimalStrikes } = require('./scanners/optionChainScanner');
const { calculateApproxBasketMargin, fetchLiveBasketMargin } = require('./utils/marginCalculator');
const TimeBasedRiskManager = require('./features/riskManagement/TimeBasedRiskManager');

class TimeBasedEngine {
    constructor(strategyConfig, isLiveMode = false) {
        this.config = strategyConfig;      // UI se aaya hua JSON data
        this.isLiveMode = isLiveMode;      // True for Live, False for Backtest
        
        // 🎯 State Tracking
        this.status = 'WAITING_FOR_ENTRY'; // State Machine
        this.activeLegs = [];              // Abhi kaun se trades chal rahe hain
        this.riskManager = null;           // SL trail karne wala manager
        
        // 💰 Capital, Recovery & Boundary Tracking
        this.estimatedMargin = 0;
        this.maxLossLimit = 0;             // Trade Capital ka 1%
        this.realizedLoss = 0;             // Agar SL hit hua toh kitna loss book hua
        this.recoveryAttemptsLeft = strategyConfig.riskManagement?.recoverySettings?.enableRecovery ? (strategyConfig.riskManagement.recoverySettings.attempts || 2) : 0;
        this.tradeBoundaries = { upper: Infinity, lower: 0 }; // Breakeven points
    }

    // ========================================================
    // 1️⃣ ENTRY LOGIC (e.g., 09:27 AM)
    // ========================================================
    async evaluateEntry(currentTime, currentSpotPrice, broker) {
        if (this.status === 'WAITING_FOR_ENTRY' && currentTime === this.config.startTime) {
            console.log(`\n🚀 [TIME ENGINE] Trigger Time Reached (${currentTime}). Initiating Entry Protocol...`);
            
            // 1. Scanner se 1:4 wale strikes nikalo
            const ratioParams = this.config.ratioSpreadParams || { divisor: 4, baseBuyLots: 1, sellMultiplier: 4 };
            
            const optimalLegsObj = await findOptimalStrikes(
                this.config.symbol || "NIFTY 50", 
                currentSpotPrice, 
                this.config.expiry, 
                ratioParams.divisor, 
                ratioParams.baseBuyLots, 
                broker
            );

            if (!optimalLegsObj) {
                console.log("❌ [TIME ENGINE] Failed to find optimal strikes. Aborting trade.");
                this.status = 'COMPLETED';
                return null;
            }

            // Object ko Array me convert karna taaki loop chalana aasan ho
            this.activeLegs = [
                { ...optimalLegsObj.buyLegCE, entryPrice: optimalLegsObj.buyLegCE.ltp, tag: 'MAIN' },
                { ...optimalLegsObj.buyLegPE, entryPrice: optimalLegsObj.buyLegPE.ltp, tag: 'MAIN' },
                { ...optimalLegsObj.sellLegCE, entryPrice: optimalLegsObj.sellLegCE.ltp, tag: 'MAIN' },
                { ...optimalLegsObj.sellLegPE, entryPrice: optimalLegsObj.sellLegPE.ltp, tag: 'MAIN' }
            ];

            // 2. Margin Calculate karo (The 1% Rule Foundation)
            this.estimatedMargin = this.isLiveMode 
                ? await fetchLiveBasketMargin(this.activeLegs, broker) 
                : calculateApproxBasketMargin(this.activeLegs, this.config.symbol || "NIFTY 50");
            
            // 3. Trade Capital ka 1% (Max Loss) Set karo
            const riskPct = this.config.riskManagement?.maxLossPct || 1; 
            this.maxLossLimit = this.estimatedMargin * (riskPct / 100);
            
            console.log(`🏦 Est. Margin: ₹${this.estimatedMargin.toFixed(2)} | 🛡️ 1% Max Loss SL: -₹${this.maxLossLimit.toFixed(2)}`);

            // 4. Risk Manager (Gatekeeper) Initialize karo
            this.riskManager = new TimeBasedRiskManager(this.maxLossLimit, false, null, this.config.riskManagement);
            
            // 🔥 5. NEW: Calculate Breakeven Boundaries at Entry
            this.tradeBoundaries = this.calculateBreakevens();
            console.log(`🚧 Trade Boundaries Set: Lower BE = ${this.tradeBoundaries.lower.toFixed(2)} | Upper BE = ${this.tradeBoundaries.upper.toFixed(2)}`);

            this.status = 'ACTIVE';

            return { action: 'EXECUTE_ENTRY', legs: this.activeLegs };
        }
        return null;
    }

    // ========================================================
    // 🔥 NEW UTILITY: BREAKEVEN CALCULATOR (ACCURATE MATH)
    // ========================================================
    calculateBreakevens() {
        try {
            const buyCE = this.activeLegs.find(l => l.type === 'CE' && l.action === 'BUY' && l.tag === 'MAIN');
            const sellCE = this.activeLegs.find(l => l.type === 'CE' && l.action === 'SELL' && l.tag === 'MAIN');
            const buyPE = this.activeLegs.find(l => l.type === 'PE' && l.action === 'BUY' && l.tag === 'MAIN');
            const sellPE = this.activeLegs.find(l => l.type === 'PE' && l.action === 'SELL' && l.tag === 'MAIN');

            if (!buyCE || !sellCE || !buyPE || !sellPE) return { lower: 0, upper: Infinity };

            // 1. Ratio Multipliers (Humne kitne guna lot sell kiye hain)
            const nCE = sellCE.lots / buyCE.lots; // Example: 4 / 1 = 4
            const nPE = sellPE.lots / buyPE.lots; // Example: 4 / 1 = 4

            // 2. Net Premium (Points me Credit received - Debit paid)
            const totalDebit = buyCE.entryPrice + buyPE.entryPrice;
            const totalCredit = (sellCE.entryPrice * nCE) + (sellPE.entryPrice * nPE);
            const netPremium = totalCredit - totalDebit;

            // 3. Exact Ratio Spread Math Formulas
            const ceWidth = sellCE.strike - buyCE.strike; // Example: 24550 - 24450 = 100
            const peWidth = buyPE.strike - sellPE.strike; // Example: 24450 - 24350 = 100

            // Slope denominator is (Ratio - 1) because 1 bought leg cancels out 1 sold leg's risk
            const upperBE = sellCE.strike + ((ceWidth + netPremium) / (nCE - 1));
            const lowerBE = sellPE.strike - ((peWidth + netPremium) / (nPE - 1));

            return { lower: lowerBE, upper: upperBE };
        } catch (error) {
            console.error("❌ Error calculating breakevens:", error);
            return { lower: 0, upper: Infinity };
        }
    }

    // ========================================================
    // 2️⃣ TICK EVALUATION (Every Second/Minute)
    // ========================================================
    evaluateTick(currentTime, currentLTPs, currentSpotPrice) { 
        if (this.status !== 'ACTIVE' && this.status !== 'RECOVERY_MODE') return null;

        // 1. Calculate Live PnL (Estimated)
        let currentMTM = this.calculateMTM(currentLTPs);

        // 2. Risk Manager ko decision lene do
        const decision = this.riskManager.evaluateRisk(currentMTM, currentTime, currentSpotPrice, this.tradeBoundaries);

        // 🟢 SQUARE OFF (Late Exit / EOD)
        if (decision.action === 'SQUARE_OFF') {
            return { action: 'EXIT_ALL', reason: decision.reason, mtm: currentMTM };
        }

        // 🔴 EARLY BOUNDARY BREACH (Stop guessing! Demand Real API Price)
        if (decision.action === 'SL_HIT' || decision.action === 'BOUNDARY_BREACH_EARLY') {
            // 🔥 NAYA FIX: Ab engine yahan se sidha 'FETCH_REAL_PRICES' ka signal bhejega
            return { action: 'FETCH_REAL_PRICES_FOR_RECOVERY', reason: decision.reason };
        }

        // 🟡 HOLD (Sab theek hai, chalne do)
        return { action: 'HOLD', currentMTM, slLevel: decision.currentSlLevel };
    }

    // ============================================================================
    // 🔥 NAYA FUNCTION: Real API PnL milne ke baad ye faisla lega ki Recovery leni hai ya nahi!
    // ============================================================================
    // processRealExitAndRecovery(realPnL, currentTime, currentLTPs) {
    //     console.log(`\n💥 [MAIN EXIT] Reason: Early Boundary Breach at ${currentTime} | REAL MTM: ₹${realPnL.toFixed(2)}. Tracking capital...`);
            
    //     this.realizedLoss += realPnL; 
        
    //     // Check karo ki kya humare paas Recovery lene ke liye capital bacha hai?
    //     const remainingLossCap = this.maxLossLimit - Math.abs(this.realizedLoss);

    //     // Recover ONLY if we are in Loss AND have Capital left
    //     if (this.status === 'ACTIVE' && 
    //         this.config.riskManagement?.recoverySettings?.enableRecovery && 
    //         this.recoveryAttemptsLeft > 0 &&
    //         remainingLossCap > 0 && realPnL < 0) { 
            
    //         return this.initiateRecoveryProtocol(currentLTPs);
    //     } else {
    //         if (realPnL >= 0) {
    //             console.log(`🎯 [LUCKY ESCAPE] Boundary breached but REAL PnL is positive (₹${realPnL.toFixed(2)}). Exiting with Profit!`);
    //         } else {
    //             console.log(`🚫 [GAME OVER] No recovery attempts left OR Max Loss breached (Remaining Cap: ₹${remainingLossCap.toFixed(2)}). EXIT ALL.`);
    //         }
    //         this.status = 'COMPLETED';
    //         return { action: 'EXIT_ALL', reason: 'Boundary Breach (Exit All)', mtm: this.realizedLoss };
    //     }
    // }

    // processRealExitAndRecovery(realPnL, currentTime, currentLTPs) {
    //     const isAlreadyInRecovery = (this.status === 'RECOVERY_MODE');
    //     console.log(`\n💥 [${isAlreadyInRecovery ? 'RECOVERY EXIT' : 'MAIN EXIT'}] Reason: SL/Boundary Breach at ${currentTime} | REAL MTM: ₹${realPnL.toFixed(2)}. Tracking capital...`);
            
    //     this.realizedLoss += realPnL; 
        
    //     // 1. Check Remaining Capital
    //     const remainingLossCap = this.maxLossLimit - Math.abs(this.realizedLoss);

    //     // 🔥 2. DYNAMIC TIME CHECK: UI se time lo, warna default 14:30 rakho
    //     const cutoffTimeStr = this.config.riskManagement?.timeConditionedTrailing?.lateBoundaryTime || "14:30";
        
    //     const [hours, mins] = currentTime.split(':').map(Number);
    //     const currentTimeMins = hours * 60 + mins;
        
    //     const [cutoffHours, cutoffMinsPart] = cutoffTimeStr.split(':').map(Number);
    //     const cutoffMins = (cutoffHours * 60) + cutoffMinsPart; 

    //     // 🟢 MULTI-RECOVERY RULE:
    //     // Recover ONLY if: Time dynamic cutoff se pehle ho AND Capital bacha ho AND Loss me ho
    //     if (currentTimeMins < cutoffMins && 
    //         (this.status === 'ACTIVE' || this.status === 'RECOVERY_MODE') && 
    //         this.config.riskManagement?.recoverySettings?.enableRecovery && 
    //         remainingLossCap > 1000 && realPnL < 0) { 
            
    //         return this.initiateRecoveryProtocol(currentLTPs);
    //     } else {
    //         // 🔴 GAME OVER YAA PROFIT BOOKING YAA TIME OVER
    //         if (currentTimeMins >= cutoffMins && realPnL < 0) {
    //              // Ab console me hardcoded 14:30 nahi, balki user ka diya hua time chhapega!
    //              console.log(`⏰ [TIME OVER] It's ${currentTime} (>= ${cutoffTimeStr}). Strict rule applied: No new recovery trades allowed!`);
    //         } else if (realPnL >= 0) {
    //             console.log(`🎯 [LUCKY ESCAPE] Trade closed. REAL PnL is positive (₹${realPnL.toFixed(2)}). Exiting with Profit!`);
    //         } else {
    //             console.log(`🚫 [GAME OVER] Risk limit reached or Max Loss breached (Remaining Cap: ₹${remainingLossCap.toFixed(2)}). EXIT ALL.`);
    //         }
            
    //         this.status = 'COMPLETED';
            
    //         console.log(`\n💰 Final PnL Booked for the Day: ₹${this.realizedLoss.toFixed(2)}`);
            
    //         const finalReason = (currentTimeMins >= cutoffMins) ? `Late Break-Even/SL (No Entry after ${cutoffTimeStr})` : 'Risk Limit Reached or Profit Booked';
    //         return { action: 'EXIT_ALL', reason: finalReason, mtm: this.realizedLoss };
    //     }
    // }


    processRealExitAndRecovery(realPnL, currentTime, currentLTPs) {
        const isAlreadyInRecovery = (this.status === 'RECOVERY_MODE');
        console.log(`\n💥 [${isAlreadyInRecovery ? 'RECOVERY EXIT' : 'MAIN EXIT'}] Reason: SL/Boundary Breach at ${currentTime} | REAL MTM: ₹${realPnL.toFixed(2)}. Tracking capital...`);
            
        this.realizedLoss += realPnL; 
        
        // 1. Check Remaining Capital
        const remainingLossCap = this.maxLossLimit - Math.abs(this.realizedLoss);

        // 🔥 2. DYNAMIC TIME CHECK: UI se time lo, warna default 14:30 rakho
        const cutoffTimeStr = this.config.riskManagement?.lateBoundaryTime || "14:30";
        
        const [hours, mins] = currentTime.split(':').map(Number);
        const currentTimeMins = hours * 60 + mins;
        
        const [cutoffHours, cutoffMinsPart] = cutoffTimeStr.split(':').map(Number);
        const cutoffMins = (cutoffHours * 60) + cutoffMinsPart; 

        // 🟢 MULTI-RECOVERY RULE:
        // Recover ONLY if: Time dynamic cutoff se pehle ho AND Capital bacha ho AND Loss me ho
        if (currentTimeMins < cutoffMins && 
            (this.status === 'ACTIVE' || this.status === 'RECOVERY_MODE') && 
            this.config.riskManagement?.recoverySettings?.enableRecovery && 
            remainingLossCap > 1000 && realPnL < 0) { 
            
            return this.initiateRecoveryProtocol(currentLTPs);
        } else {
            // 🔴 GAME OVER YAA PROFIT BOOKING YAA TIME OVER
            if (currentTimeMins >= cutoffMins && realPnL < 0) {
                 // Ab console me hardcoded 14:30 nahi, balki user ka diya hua time chhapega!
                 console.log(`⏰ [TIME OVER] It's ${currentTime} (>= ${cutoffTimeStr}). Strict rule applied: No new recovery trades allowed!`);
            } else if (realPnL >= 0) {
                console.log(`🎯 [LUCKY ESCAPE] Trade closed. REAL PnL is positive (₹${realPnL.toFixed(2)}). Exiting with Profit!`);
            } else {
                console.log(`🚫 [GAME OVER] Risk limit reached or Max Loss breached (Remaining Cap: ₹${remainingLossCap.toFixed(2)}). EXIT ALL.`);
            }
            
            this.status = 'COMPLETED';
            
            console.log(`\n💰 Final PnL Booked for the Day: ₹${this.realizedLoss.toFixed(2)}`);
            
            const finalReason = (currentTimeMins >= cutoffMins) ? `Late Break-Even/SL (No Entry after ${cutoffTimeStr})` : 'Risk Limit Reached or Profit Booked';
            return { action: 'EXIT_ALL', reason: finalReason, mtm: this.realizedLoss };
        }
    }

    // ========================================================
    // 3️⃣ MTM CALCULATOR
    // ========================================================
    calculateMTM(liveLTPs) {
        let totalPnL = 0;
        
        for (const leg of this.activeLegs) {
            // 🔥 THE FIX: '||' ki jagah '!== undefined' use kiya. 
            // Ab agar LTP sach me '0' hoga, toh engine use 0 hi maanega, entryPrice nahi uthayega!
            const currentPrice = liveLTPs[leg.inst?.id] !== undefined ? liveLTPs[leg.inst?.id] : leg.entryPrice; 
            
            const lotMultiplier = leg.lots * (leg.inst?.lotSize || 25);
            
            if (leg.action === 'BUY') {
                totalPnL += (currentPrice - leg.entryPrice) * lotMultiplier;
            } else if (leg.action === 'SELL') {
                totalPnL += (leg.entryPrice - currentPrice) * lotMultiplier;
            }
        }
        return totalPnL;
    }
    // ========================================================
    // 4️⃣ THE FIREFIGHTING ENGINE (Loss Recovery)
    // ========================================================
    // initiateRecoveryProtocol(currentLTPs) {
    //     this.status = 'RECOVERY_MODE';
    //     this.recoveryAttemptsLeft -= 1;
        
    //     console.log(`\n🚑 [FIREFIGHTING] Initiating Recovery Entry! Attempts left: ${this.recoveryAttemptsLeft}`);

    //     // 1. Calculate Remaining Capital for SL
    //     const remainingLossCap = this.maxLossLimit - Math.abs(this.realizedLoss);
        
    //     const riskPctPerAttempt = this.config.riskManagement?.recoverySettings?.riskPct || 50;
    //     const recoveryRiskAmount = remainingLossCap * (riskPctPerAttempt / 100);

    //     // 2. Find Trend Direction to know which side to Naked Sell
    //     const atmCeLeg = this.activeLegs.find(l => l.tag === 'MAIN' && l.type === 'CE' && l.action === 'BUY');
    //     const currentAtmCePrice = currentLTPs[atmCeLeg.inst?.id] || atmCeLeg.entryPrice;
        
    //     let sellType = 'CE'; // Default if market fell
    //     let selectedOldLeg = null;

    //     if (currentAtmCePrice > atmCeLeg.entryPrice) {
    //         // Market is UP -> We will sell Naked PE
    //         sellType = 'PE';
    //         console.log("📈 Market Trend is UP. Firing NAKED PE Sell for recovery!");
    //         selectedOldLeg = this.activeLegs.find(l => l.tag === 'MAIN' && l.type === 'PE' && l.action === 'SELL');
    //     } else {
    //         // Market is DOWN -> We will sell Naked CE
    //         sellType = 'CE';
    //         console.log("📉 Market Trend is DOWN. Firing NAKED CE Sell for recovery!");
    //         selectedOldLeg = this.activeLegs.find(l => l.tag === 'MAIN' && l.type === 'CE' && l.action === 'SELL');
    //     }

    //     // 3. Purane saare legs square-off karne ka signal bhejo
    //     const oldLegsToExit = [...this.activeLegs];
        
    //     // Naya Naked Leg
    //     const ratioParams = this.config.ratioSpreadParams || { sellMultiplier: 4 };
    //     const recoveryLeg = {
    //         ...selectedOldLeg,
    //         action: 'SELL',
    //         lots: ratioParams.sellMultiplier,
    //         entryPrice: currentLTPs[selectedOldLeg.inst?.id] || selectedOldLeg.entryPrice,
    //         tag: 'RECOVERY'
    //     };

    //     this.activeLegs = [recoveryLeg];

    //     // 4. Initialize NEW Risk Manager for this Recovery Trade
    //     this.riskManager = new TimeBasedRiskManager(this.maxLossLimit, true, recoveryRiskAmount, this.config.riskManagement);

    //     return { 
    //         action: 'RECOVERY_SWITCH', 
    //         exitLegs: oldLegsToExit,    
    //         enterLegs: [recoveryLeg],   
    //         newRiskAmount: recoveryRiskAmount 
    //     };
    // }



    initiateRecoveryProtocol(currentLTPs) {
        this.status = 'RECOVERY_MODE';
        this.recoveryAttemptsLeft -= 1;
        
        console.log(`\n🚑 [FIREFIGHTING] Initiating Recovery Entry! Attempts left: ${this.recoveryAttemptsLeft}`);

        // 1. Calculate Remaining Capital for SL
        const remainingLossCap = this.maxLossLimit - Math.abs(this.realizedLoss);
        const riskPctPerAttempt = this.config.riskManagement?.recoverySettings?.riskPct || 50;
        const recoveryRiskAmount = remainingLossCap * (riskPctPerAttempt / 100);

        // 2. SAFE TREND DETECTION (Crash Fix)
        const mainCeLeg = this.activeLegs.find(l => l.tag === 'MAIN' && l.type === 'CE' && l.action === 'BUY');
        
        if (mainCeLeg && currentLTPs) {
            // 🔥 Sirf Pehli (1st) Recovery me chalega:
            const currentAtmCePrice = currentLTPs[mainCeLeg.inst?.id] || mainCeLeg.entryPrice;
            let sellType = (currentAtmCePrice > mainCeLeg.entryPrice) ? 'PE' : 'CE';
            
            console.log(sellType === 'PE' ? "📈 Market Trend is UP. Suggesting PE Sell!" : "📉 Market Trend is DOWN. Suggesting CE Sell!");
            
            // Controller ko batane ke liye ek dummy leg set kar do
            this.activeLegs = [{ type: sellType, tag: 'DUMMY' }];
        } 
        // Note: Dusri (2nd) recovery me hum activeLegs nahi badlenge kyunki 'backtestController' usey khud Reverse (CE <-> PE) kar dega!

        // 3. RESET RISK MANAGER FOR RECOVERY (Zaroori hai taaki trailing fresh 0 se start ho)
        this.riskManager = new TimeBasedRiskManager(this.maxLossLimit, true, recoveryRiskAmount, this.config.riskManagement);

        return { 
            action: 'RECOVERY_SWITCH', 
            reason: 'Recovery Strategy Activated' 
        };
    }
}

module.exports = TimeBasedEngine;