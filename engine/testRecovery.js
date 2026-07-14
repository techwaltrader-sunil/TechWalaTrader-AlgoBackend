// // File: src/engine/testRecovery.js

// const TimeBasedEngine = require('./timeBasedEngine');

// console.log("==================================================================");
// console.log("🚑 SIMULATION START: TESTING BREAKEVEN TOUCH & FIREFIGHTING ENGINE");
// console.log("==================================================================\n");

// // 1️⃣ UI se aane wali clean and dynamic strategy configuration
// const mockStrategyConfig = {
//     symbol: "NIFTY 50",
//     startTime: "09:27",
//     ratioSpreadParams: { divisor: 4, baseBuyLots: 1, sellMultiplier: 4 },
//     riskManagement: {
//         maxLossPct: 1,
//         profitTrailing: "Time-Conditioned",
//         timeConditionedTrailing: {
//             phase1Time: "12:00", phase1Profit: 0.5,
//             phase2Time: "14:30", phase2Profit: 1.0, phase2Lock: 0.8, phase2Trail: 0.2
//         },
//         recoverySettings: {
//             enableRecovery: true,
//             attempts: 2,
//             riskPct: 50,
//             c2cTrigger: 0.4,
//             target: 1.0,
//             lock: 0.5,
//             trail: 0.2
//         }
//     }
// };

// // 2️⃣ Engine Instance create karein (Backtest mode = false yaishe hi mock karenge)
// const engine = new TimeBasedEngine(mockStrategyConfig, false);

// // 3️⃣ Mocking Entry: Live option chain scanner ko bypass karke manually active legs daal rahe hain
// // Takki hum bina API ke direct calculation test kar sakein
// engine.activeLegs = [
//     { strike: 23200, type: 'CE', action: 'BUY',  entryPrice: 120, lots: 1, inst: { id: "CE_ATM", lotSize: 25 }, tag: 'MAIN' },
//     { strike: 23200, type: 'PE', action: 'BUY',  entryPrice: 110, lots: 1, inst: { id: "PE_ATM", lotSize: 25 }, tag: 'MAIN' },
//     { strike: 23400, type: 'CE', action: 'SELL', entryPrice: 32,  lots: 4, inst: { id: "CE_OTM", lotSize: 25 }, tag: 'MAIN' },
//     { strike: 23000, type: 'PE', action: 'SELL', entryPrice: 27,  lots: 4, inst: { id: "PE_OTM", lotSize: 25 }, tag: 'MAIN' }
// ];

// // Manually initialize engine state like it does on successful entry
// engine.estimatedMargin = 914000; // ₹9.14 Lakh
// engine.maxLossLimit = 9140;      // 1% Max Loss = ₹9,140
// engine.status = 'ACTIVE';

// // 🧮 Dynamic Breakeven Points nikalna (Hamara naya accurate formula)
// engine.tradeBoundaries = engine.calculateBreakevens();

// console.log(`🏦 Est. Margin: ₹${engine.estimatedMargin}`);
// console.log(`🛡️ Max Loss Limit (1%): -₹${engine.maxLossLimit}`);
// console.log(`🚧 Calculated Boundaries -> Lower BE: ${engine.tradeBoundaries.lower.toFixed(2)} | Upper BE: ${engine.tradeBoundaries.upper.toFixed(2)}`);
// console.log("------------------------------------------------------------------\n");

// // Re-initialize risk manager with standard main parameters
// const TimeBasedRiskManager = require('./features/riskManagement/TimeBasedRiskManager');
// engine.riskManager = new TimeBasedRiskManager(engine.maxLossLimit, false, null, engine.config.riskManagement);


// // ==================================================================
// // 🧪 TEST CASE 1: MAIN TRADE SL HIT -> TRIGGER RECOVERY ENGINE
// // ==================================================================
// console.log("🎬 [SCENARIO 1]: Market falls hard, Main Trade hits Stop Loss (-₹9,140)");

// let mockLTPs = { "CE_ATM": 20, "PE_ATM": 280, "CE_OTM": 2, "PE_OTM": 180 };; // Huge loss in Put Selling
// let currentTime = "11:15";
// let spotPrice = 23050; 

// console.log(`🕒 Time: ${currentTime} | Nifty Spot: ${spotPrice}`);
// let result = engine.evaluateTick(currentTime, mockLTPs, spotPrice);

// if (result && result.action === 'RECOVERY_SWITCH') {
//     console.log(`✅ SUCCESS: Recovery Engine Fired Perfectly!`);
//     console.log(`👉 Closed Old Legs. Entered New Recovery Leg: ${engine.activeLegs[0].lots} Lots of ${engine.activeLegs[0].strike} ${engine.activeLegs[0].type} @ ₹${engine.activeLegs[0].entryPrice}`);
//     console.log(`🛡️ New Allocated Risk for Recovery Trade: ₹${result.newRiskAmount.toFixed(2)}`);
// }
// console.log("------------------------------------------------------------------\n");


// // ==================================================================
// // 🧪 TEST CASE 2: RECOVERY TRADE RUNNING -> TESTING DYNAMIC C2C & TRAILING
// // ==================================================================
// console.log("🎬 [SCENARIO 2]: Testing Recovery Trade Trailing Logic");

// // Maan lete hain recovery leg (PE_OTM) ka entry price ₹120 tha (Market reverse ho raha hai, premium crash karega)
// // Recovery MTM formula setup ke liye mock pricing bhejte hain
// currentTime = "11:45";

// // Case A: Recovery trade me ₹4,000 ka profit aaya (UI ke hisab se 9140 ka 0.4% = ₹3,656)
// // Profit crossed 0.4%, SL should move to Cost to Cost (0)
// let recoveryLTPs = { "PE_OTM": 80 }; // (120 - 80) * 4 lots * 25 size = +₹4,000 profit
// console.log(`🕒 Time: ${currentTime} | MTM reached: ₹4000 (Targeting > 0.4% C2C Trigger)`);
// let recResult = engine.evaluateTick(currentTime, recoveryLTPs, 23100);
// console.log(`👉 Engine Decision: ${recResult.action} | Current SL is at: ₹${engine.riskManager.currentSlLevel.toFixed(2)}`);

// // Case B: Recovery trade me ₹10,000 ka profit aa gaya (Target 1.0% = ₹9,140 crossed)
// // SL should lock at 0.5% (₹4,570)
// currentTime = "12:30";
// recoveryLTPs = { "PE_OTM": 20 }; // (120 - 20) * 4 lots * 25 size = +₹10,000 profit
// console.log(`\n🕒 Time: ${currentTime} | MTM reached: ₹10000 (Targeting > 1.0% Profit Lock)`);
// recResult = engine.evaluateTick(currentTime, recoveryLTPs, 23180);
// console.log(`👉 Engine Decision: ${recResult.action} | Current SL is at: ₹${engine.riskManager.currentSlLevel.toFixed(2)}`);
// console.log("------------------------------------------------------------------\n");


// // ==================================================================
// // 🧪 TEST CASE 3: RULE 4 - BREAKEVEN BOUNDARY TOUCH (2:30 PM - 3:00 PM)
// // ==================================================================
// console.log("🎬 [SCENARIO 3]: Resetting Engine to Main Trade to test Rule 4 (Breakeven Boundary Touch)");

// // Engine ko wapas fresh reset karte hain rule 4 test karne ke liye
// const engine2 = new TimeBasedEngine(mockStrategyConfig, false);
// engine2.activeLegs = [...engine.activeLegs]; 
// engine2.estimatedMargin = 914000;
// engine2.maxLossLimit = 9140;
// engine2.status = 'ACTIVE';
// engine2.tradeBoundaries = engine2.calculateBreakevens(); // Upper BE is ~23469
// engine2.riskManager = new TimeBasedRiskManager(engine2.maxLossLimit, false, null, engine2.config.riskManagement);

// currentTime = "14:45"; // 2:30 PM ke baad ka time
// spotPrice = 23475;    // Upper Breakeven boundary (23469) ko cross kar gaya market
// let normalLTPs = { "CE_ATM": 280, "PE_ATM": 5, "CE_OTM": 95, "PE_OTM": 1 }; // PnL normal hai, par spot boundary ke bahar hai

// console.log(`🕒 Time: ${currentTime} (Between 2:30 - 3:00) | Nifty Spot: ${spotPrice} (Breakeven Breached!)`);
// let finalResult = engine2.evaluateTick(currentTime, normalLTPs, spotPrice);

// if (finalResult && finalResult.action === 'EXIT_ALL') {
//     console.log(`✅ SUCCESS: Rule 4 Executed! Engine intercepted boundary breach and forced SQUARE OFF.`);
//     console.log(`👉 Reason: ${finalResult.reason}`);
// }
// console.log("==================================================================");



// File: src/engine/testRecovery.js
const TimeBasedEngine = require('./timeBasedEngine');
const TimeBasedRiskManager = require('./features/riskManagement/TimeBasedRiskManager');

console.log("==================================================================");
console.log("🚑 SIMULATION START: TESTING BREAKEVEN TOUCH & FIREFIGHTING ENGINE");
console.log("==================================================================\n");

const mockStrategyConfig = {
    symbol: "NIFTY 50", startTime: "09:27",
    ratioSpreadParams: { divisor: 4, baseBuyLots: 1, sellMultiplier: 4 },
    riskManagement: {
        maxLossPct: 1, profitTrailing: "Time-Conditioned",
        timeConditionedTrailing: { phase1Time: "12:00", phase1Profit: 0.5, phase2Time: "14:30", phase2Profit: 1.0, phase2Lock: 0.8, phase2Trail: 0.2 },
        recoverySettings: { enableRecovery: true, attempts: 2, riskPct: 50, c2cTrigger: 0.4, target: 1.0, lock: 0.5, trail: 0.2 }
    }
};

const engine = new TimeBasedEngine(mockStrategyConfig, false);

const initialLegs = [
    { strike: 23200, type: 'CE', action: 'BUY',  entryPrice: 120, lots: 1, inst: { id: "CE_ATM", lotSize: 25 }, tag: 'MAIN' },
    { strike: 23200, type: 'PE', action: 'BUY',  entryPrice: 110, lots: 1, inst: { id: "PE_ATM", lotSize: 25 }, tag: 'MAIN' },
    { strike: 23400, type: 'CE', action: 'SELL', entryPrice: 80,  lots: 4, inst: { id: "CE_OTM", lotSize: 25 }, tag: 'MAIN' },
    { strike: 23000, type: 'PE', action: 'SELL', entryPrice: 27,  lots: 4, inst: { id: "PE_OTM", lotSize: 25 }, tag: 'MAIN' }
];

engine.activeLegs = [...initialLegs];
engine.estimatedMargin = 914000; 
engine.maxLossLimit = 9140;      
engine.status = 'ACTIVE';
engine.tradeBoundaries = engine.calculateBreakevens();
engine.riskManager = new TimeBasedRiskManager(engine.maxLossLimit, false, null, engine.config.riskManagement);

// 🔥 ADDED THE LOGS BACK HERE 🔥
console.log(`🏦 Est. Margin: ₹${engine.estimatedMargin.toFixed(2)}`);
console.log(`🛡️ Max Loss Limit (1%): -₹${engine.maxLossLimit.toFixed(2)}`);
console.log(`🚧 Calculated Boundaries -> Lower BE: ${engine.tradeBoundaries.lower.toFixed(2)} | Upper BE: ${engine.tradeBoundaries.upper.toFixed(2)}\n`);

// ==================================================================
// 🧪 SCENARIO 1: MAIN TRADE SL HIT & RECOVERY MATH
// ==================================================================
console.log("🎬 [SCENARIO 1]: Market falls, Trailed SL Hits -> Trigger Recovery");

// Dummy scenario: Man lo hamara SL trail ho kar -5000 par tha
engine.riskManager.currentSlLevel = -5000;

// LTPs set kiye jisse MTM -5550 ho jaye (CE me loss, PE buy me profit, PE sell me heavy loss)
let mockLTPs = { "CE_ATM": 20, "PE_ATM": 280, "CE_OTM": 80, "PE_OTM": 100 }; 
let result = engine.evaluateTick("11:15", mockLTPs, 23050);

if (result?.action === 'RECOVERY_SWITCH') {
    console.log(`✅ SUCCESS: Entered Recovery Leg!`);
    console.log(`   Realized Loss booked: -₹5550.00`);
    console.log(`   Remaining Loss Capital: ₹${(9140 - 5550).toFixed(2)}`);
    console.log(`   🛡️ 50% Risk Allocated for Recovery Trade: ₹${result.newRiskAmount.toFixed(2)}`);
}
console.log("------------------------------------------------------------------\n");

// ==================================================================
// 🧪 SCENARIO 2: RECOVERY TRAILING
// ==================================================================
console.log("🎬 [SCENARIO 2]: Recovery Trade Profit Trailing");
// CE_OTM was sold at 80. Price drops to 40. Profit = (80 - 40) * 100 = +4000
let recoveryLTPs = { "CE_OTM": 40 }; 
let recResult1 = engine.evaluateTick("11:45", recoveryLTPs, 23100);
console.log(`👉 MTM ₹4000 | Action: ${recResult1.action} | SL at: ₹${engine.riskManager.currentSlLevel.toFixed(2)}`);

// Price drops to 0. Profit = (80 - 0) * 100 = +8000
recoveryLTPs = { "CE_OTM": 0 }; 
let recResult2 = engine.evaluateTick("12:30", recoveryLTPs, 23150);
console.log(`👉 MTM ₹8000 | Action: ${recResult2.action} | SL at: ₹${engine.riskManager.currentSlLevel.toFixed(2)}`);
console.log("------------------------------------------------------------------\n");

// ==================================================================
// 🧪 SCENARIO 3: BREAKEVEN BOUNDARY TOUCH (Rule 4)
// ==================================================================
console.log("🎬 [SCENARIO 3]: Testing Rule 4 (Breakeven Boundary Touch)");
const engine2 = new TimeBasedEngine(mockStrategyConfig, false);
engine2.activeLegs = [...initialLegs]; 
engine2.estimatedMargin = 914000; engine2.maxLossLimit = 9140; engine2.status = 'ACTIVE';
engine2.tradeBoundaries = engine2.calculateBreakevens(); 
engine2.riskManager = new TimeBasedRiskManager(engine2.maxLossLimit, false, null, engine2.config.riskManagement);

// Dopahar 2:45, Spot crosses Upper Breakeven (23610)
let finalResult = engine2.evaluateTick("14:45", { "CE_ATM": 300, "PE_ATM": 5, "CE_OTM": 100, "PE_OTM": 1 }, 23610);
if (finalResult?.action === 'SQUARE_OFF') {
    console.log(`✅ SUCCESS: ${finalResult.reason}`);
}
console.log("==================================================================");