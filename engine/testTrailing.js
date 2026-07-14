// File: src/engine/testTrailing.js

const TimeBasedRiskManager = require('./features/riskManagement/TimeBasedRiskManager');

console.log("=========================================");
console.log("🧪 RUNNING SIMULATION: MAIN TRADE TRAILING");
console.log("=========================================\n");

// मान लेते हैं टोटल मार्जिन 9,14,000 है, तो 1% Max Loss = ₹9,140
const baseCapital1Percent = 9140; 

// UI से आई हुई डमी सेटिंग्स
const dummyTcConfig = {
    tcPhase1Time: '12:00', tcPhase1Profit: 0.5,
    tcPhase2Time: '14:30', tcPhase2Profit: 1.0, 
    tcPhase2Lock: 0.8, tcPhase2Trail: 0.2
};

const engine = new TimeBasedRiskManager(baseCapital1Percent, false, null, dummyTcConfig);

// ---------------------------------------------------------
// ⏳ TIME MACHINE: मार्केट को सिमुलेट करते हैं
// ---------------------------------------------------------

const testCases = [
    { time: "10:15", mtm: 2000, msg: "Morning normal movement" },
    { time: "11:30", mtm: 5000, msg: "Profit > 0.5% (₹4570). SL should move to C2C" },
    { time: "12:15", mtm: 3000, msg: "Profit dropped, but SL is already C2C" },
    { time: "13:45", mtm: 9500, msg: "Profit > 1.0% (₹9140). SL should lock at 0.8% (₹7312)" },
    { time: "14:10", mtm: 11500, msg: "Profit > 1.2%. SL should trail step-by-step" },
    { time: "14:20", mtm: 8000, msg: "Market reversed! Did it hit our trailed SL?" }
];

testCases.forEach(test => {
    console.log(`\n🕒 Time: ${test.time} | 💰 MTM: ₹${test.mtm}  (${test.msg})`);
    const decision = engine.evaluateRisk(test.mtm, test.time);
    console.log(`👉 Decision: ${decision.action} | Current SL is at: ₹${decision.currentSlLevel !== undefined ? decision.currentSlLevel.toFixed(2) : decision.slAmount.toFixed(2)}`);
});