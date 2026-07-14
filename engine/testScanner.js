// File: src/engine/testScanner.js

console.log("=========================================");
console.log("🔍 RUNNING SIMULATION: RATIO SPREAD SCANNER");
console.log("=========================================\n");

// 1️⃣ DUMMY OPTION CHAIN (Mock Data for Testing)
// मान लेते हैं Nifty Spot 23200 पर चल रहा है।
const mockSpotPrice = 23220; 

const mockOptionChain = [
    { strike: 22900, type: 'PE', ltp: 11.5 },
    { strike: 23000, type: 'PE', ltp: 27.0 },  // OTM Target PE (110 / 4 = 27.5) -> Nearest is 27.0
    { strike: 23100, type: 'PE', ltp: 55.0 },
    { strike: 23200, type: 'PE', ltp: 110.0 }, // ATM PE
    
    { strike: 23200, type: 'CE', ltp: 120.0 }, // ATM CE
    { strike: 23300, type: 'CE', ltp: 65.0 },
    { strike: 23400, type: 'CE', ltp: 32.0 },  // OTM Target CE (120 / 4 = 30) -> Nearest is 32.0
    { strike: 23500, type: 'CE', ltp: 16.0 },
    { strike: 23600, type: 'CE', ltp: 7.0 },
];

// 2️⃣ CORE SCANNER LOGIC (Ratio Spread - Prem/X)
const findOptimalStrikesTest = (spotPrice, optionChain, ratioDivisor = 4, baseLots = 1) => {
    
    // Step A: Find ATM Strike (Nearest to Spot Price)
    // 23220 ke sabse kareeb 23200 hai
    const atmStrike = Math.round(spotPrice / 100) * 100;
    
    // Step B: Get ATM CE and PE
    const atmCE = optionChain.find(opt => opt.strike === atmStrike && opt.type === 'CE');
    const atmPE = optionChain.find(opt => opt.strike === atmStrike && opt.type === 'PE');

    if (!atmCE || !atmPE) return console.log("❌ ATM Strikes not found in chain!");

    // Step C: Calculate Target OTM Premium (ATM Premium / Divisor)
    const targetPremiumCE = atmCE.ltp / ratioDivisor; // e.g., 120 / 4 = 30
    const targetPremiumPE = atmPE.ltp / ratioDivisor; // e.g., 110 / 4 = 27.5

    // Step D: Find OTM Strikes closest to Target Premium
    // CE ke liye OTM (Strike > ATM)
    const otmCE = optionChain
        .filter(opt => opt.type === 'CE' && opt.strike > atmStrike)
        .reduce((prev, curr) => Math.abs(curr.ltp - targetPremiumCE) < Math.abs(prev.ltp - targetPremiumCE) ? curr : prev);

    // PE ke liye OTM (Strike < ATM)
    const otmPE = optionChain
        .filter(opt => opt.type === 'PE' && opt.strike < atmStrike)
        .reduce((prev, curr) => Math.abs(curr.ltp - targetPremiumPE) < Math.abs(prev.ltp - targetPremiumPE) ? curr : prev);

    // Step E: Dynamic Lot Size Calculation
    // Exact premium match karne ke liye kitne lots chahiye?
    const sellLotsCE = Math.round(atmCE.ltp / otmCE.ltp) * baseLots; // 120 / 32 = 3.75 (Rounds to 4)
    const sellLotsPE = Math.round(atmPE.ltp / otmPE.ltp) * baseLots; // 110 / 27 = 4.07 (Rounds to 4)

    return {
        buyLegCE: { strike: atmCE.strike, type: 'CE', action: 'BUY', ltp: atmCE.ltp, lots: baseLots },
        sellLegCE: { strike: otmCE.strike, type: 'CE', action: 'SELL', ltp: otmCE.ltp, lots: sellLotsCE },
        buyLegPE: { strike: atmPE.strike, type: 'PE', action: 'BUY', ltp: atmPE.ltp, lots: baseLots },
        sellLegPE: { strike: otmPE.strike, type: 'PE', action: 'SELL', ltp: otmPE.ltp, lots: sellLotsPE },
    };
};

// 3️⃣ EXECUTE TEST
console.log(`📡 Nifty Spot Price: ${mockSpotPrice}`);
console.log(`⚙️ Ratio Divisor: 4 (Targeting 1/4th premium for OTM)`);
console.log("-----------------------------------------");

const result = findOptimalStrikesTest(mockSpotPrice, mockOptionChain, 4, 1);

console.log("🟢 CALL (CE) LEGS:");
console.log(`   BUY  ${result.buyLegCE.lots} Lot  | Strike: ${result.buyLegCE.strike} CE | LTP: ₹${result.buyLegCE.ltp}`);
console.log(`   SELL ${result.sellLegCE.lots} Lots | Strike: ${result.sellLegCE.strike} CE | LTP: ₹${result.sellLegCE.ltp} (Target was ~₹${(result.buyLegCE.ltp/4).toFixed(2)})`);
console.log(`   *Net CE Premium Flow: Paid ₹${result.buyLegCE.ltp}, Received ₹${(result.sellLegCE.ltp * result.sellLegCE.lots).toFixed(2)}`);

console.log("\n🔴 PUT (PE) LEGS:");
console.log(`   BUY  ${result.buyLegPE.lots} Lot  | Strike: ${result.buyLegPE.strike} PE | LTP: ₹${result.buyLegPE.ltp}`);
console.log(`   SELL ${result.sellLegPE.lots} Lots | Strike: ${result.sellLegPE.strike} PE | LTP: ₹${result.sellLegPE.ltp} (Target was ~₹${(result.buyLegPE.ltp/4).toFixed(2)})`);
console.log(`   *Net PE Premium Flow: Paid ₹${result.buyLegPE.ltp}, Received ₹${(result.sellLegPE.ltp * result.sellLegPE.lots).toFixed(2)}`);
console.log("=========================================\n");