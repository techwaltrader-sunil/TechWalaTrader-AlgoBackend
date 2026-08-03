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