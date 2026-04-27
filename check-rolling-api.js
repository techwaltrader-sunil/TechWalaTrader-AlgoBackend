// const axios = require('axios');
// const CLIENT_ID = "YOUR_CLIENT_ID"; 
// const ACCESS_TOKEN = "YOUR_ACCESS_TOKEN";

// async function checkMarchData() {
//     const payload = {
//         exchangeSegment: "NSE_FNO",
//         interval: "1",
//         securityId: 13, // NIFTY 50
//         instrument: "OPTIDX",
//         expiryFlag: "MONTH", // 🔥 Monthly Check
//         expiryCode: 1,      
//         strike: "ATM",      
//         drvOptionType: "CALL", 
//         requiredData: ["open", "high", "low", "close", "strike"],
//         fromDate: "2026-03-31", // 🔥 March Month Expiry Date
//         toDate: "2026-03-31"
//     };

//     try {
//         console.log(`\n🔍 Dhan Database se 31 MAR ka data nikaal raha hu...`);
//         const response = await axios.post('https://api.dhan.co/v2/charts/rollingoption', payload, {
//             headers: { 'access-token': ACCESS_TOKEN, 'client-id': CLIENT_ID, 'Content-Type': 'application/json' }
//         });

//         const data = response.data.data ? response.data.data.ce : null;
//         if (!data || !data.timestamp) { console.log("❌ No data found for March."); return; }

//         console.log("=================================================");
//         console.log(`📈 NIFTY 31 MAR MONTHLY EXPIRY CHECK`);
//         console.log("=================================================");
        
//         for(let i=0; i < data.timestamp.length; i++) {
//             const timeObj = new Date(data.timestamp[i] * 1000 + (5.5 * 3600000));
//             const timeStr = timeObj.toISOString().split('T')[1].substring(0, 5); 
            
//             // Subah entry aur sham exit check karein
//             if(timeStr === "09:45" || timeStr === "15:15") {
//                 const actualStrike = data.strike ? data.strike[i] : "N/A";
//                 console.log(`⏰ Time: ${timeStr} | Strike: ${actualStrike} | Price: ${data.close[i]}`);
//             }
//         }
//         console.log("=================================================\n");
//     } catch(e) { console.log("❌ Error:", e.message); }
// }
// checkMarchData();



// const axios = require('axios');

// // 🔥 1. APNI DETAILS YAHAN DALEIN
// const CLIENT_ID = "YOUR_CLIENT_ID"; 
// const ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzc3MTczOTE1LCJpYXQiOjE3NzcwODc1MTUsInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTAzMjM4NzQ0In0.j1H5u2ON-dKxTQnk_8iS1yXO3eiKWGRmXswV_qjqHYsDw9YIGo8QXEhg-SeqSNi9O7cEW3mfW4uUup5BOiqwpg";

// // =========================================================================
// // 🚀 THE MASTER FUNCTION (Now with O-H-L-C Data)
// // =========================================================================
// async function fetchAndCheckDhanData(dateStr, reqExpiry, optType, strikeType, timesToCheck) {
//     let expFlag = "WEEK";
//     let expCode = 1; 

//     // Dynamic Expiry Logic
//     const upperExpiry = reqExpiry.toUpperCase();
//     if (upperExpiry === "MONTHLY") {
//         expFlag = "MONTH";
//         expCode = 1;
//     } else if (upperExpiry === "NEXT WEEKLY" || upperExpiry === "NEXT WEEK") {
//         expFlag = "WEEK";
//         expCode = 2;
//     }

//     const payload = {
//         exchangeSegment: "NSE_FNO",
//         interval: "1",
//         securityId: 13, // 13 = NIFTY 50
//         instrument: "OPTIDX",
//         expiryFlag: expFlag, 
//         expiryCode: expCode,      
//         strike: strikeType.toUpperCase(),      
//         drvOptionType: optType.toUpperCase() === "CE" ? "CALL" : "PUT", 
//         requiredData: ["open", "high", "low", "close", "strike"],
//         fromDate: dateStr, 
//         toDate: dateStr
//     };

//     try {
//         console.log(`\n🔍 Fetching: ${dateStr} | ${reqExpiry} | ${optType.toUpperCase()} | ${strikeType}`);
//         const response = await axios.post('https://api.dhan.co/v2/charts/rollingoption', payload, {
//             headers: { 'access-token': ACCESS_TOKEN, 'client-id': CLIENT_ID, 'Content-Type': 'application/json' }
//         });

//         const optionKey = optType.toUpperCase() === "CE" ? "ce" : "pe";
//         const data = response.data.data ? response.data.data[optionKey] : null;

//         if (!data || !data.timestamp) { 
//             console.log("❌ No data found on Dhan Server for this combination."); 
//             return; 
//         }

//         console.log("--------------------------------------------------------------------------------------");
        
//         let foundAny = false;
//         for(let i=0; i < data.timestamp.length; i++) {
//             const timeObj = new Date(data.timestamp[i] * 1000 + (5.5 * 3600000));
//             const timeStr = timeObj.toISOString().split('T')[1].substring(0, 5); 
            
//             // Agar array me wo time hai jo hum check karna chahte hain
//             if(timesToCheck.includes(timeStr)) {
//                 const actualStrike = data.strike ? data.strike[i] : "N/A";
//                 // 🔥 YAHAN OHLC (Open, High, Low, Close) UPDATE KIYA GAYA HAI
//                 console.log(`⏰ Time: ${timeStr} | Strike: ${actualStrike} | O: ${data.open[i]} | H: ${data.high[i]} | L: ${data.low[i]} | C: ${data.close[i]}`);
//                 foundAny = true;
//             }
//         }
        
//         if(!foundAny) console.log("⚠️ Data mila, par aapka time match nahi hua.");
//         console.log("--------------------------------------------------------------------------------------\n");

//     } catch(e) { 
//         console.log("❌ API Error:", e.response ? JSON.stringify(e.response.data) : e.message); 
//     }
// }


// // =========================================================================
// // 🧪 2. YAHAN APNI MARZI KA TEST RUN KAREIN (Dynamically)
// // =========================================================================

// async function runAllTests() {
//     // Format: fetchAndCheckDhanData("Date", "Expiry", "CE/PE", "Strike", ["Time1", "Time2"])

//     // 👉 Test 1: March ka Monthly (CE)
//     await fetchAndCheckDhanData("2026-02-10", "WEEKLY", "CE", "ATM", ["09:45", "10:33"])

//     // 👉 Test 2: April ka Weekly (PE)
//     await fetchAndCheckDhanData("2026-02-10", "WEEKLY", "PE", "ATM", ["09:45", "10:35"])
    
//     // 👉 Test 3: Ek aur example (Uncomment karke use karein)
//     // await fetchAndCheckDhanData("2026-04-22", "WEEKLY", "PE", "ATM", ["09:45", "15:15"]);
// }

// runAllTests();


// const axios = require('axios');

// // 🔥 1. APNI DETAILS YAHAN DALEIN
// const CLIENT_ID = "YOUR_CLIENT_ID"; 
// const ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzc3MTczOTE1LCJpYXQiOjE3NzcwODc1MTUsInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTAzMjM4NzQ0In0.j1H5u2ON-dKxTQnk_8iS1yXO3eiKWGRmXswV_qjqHYsDw9YIGo8QXEhg-SeqSNi9O7cEW3mfW4uUup5BOiqwpg";

// // =========================================================================
// // 🚀 THE MASTER FUNCTION (Fixed Strike BUY/SELL Matcher - DHAN BUG FIXED)
// // =========================================================================
// async function fetchFixedStrikeData(dateStr, reqExpiry, optType, initialStrikeType, entryTime, exitTime) {
//     let expFlag = "WEEK";
//     let expCode = 1; 

//     if (reqExpiry.toUpperCase() === "MONTHLY") { expFlag = "MONTH"; expCode = 1; } 
//     else if (reqExpiry.toUpperCase() === "NEXT WEEKLY" || reqExpiry.toUpperCase() === "NEXT WEEK") { expFlag = "WEEK"; expCode = 2; }

//     const basePayload = {
//         exchangeSegment: "NSE_FNO", interval: "1", securityId: 13, instrument: "OPTIDX",
//         expiryFlag: expFlag, expiryCode: expCode, 
//         drvOptionType: optType.toUpperCase() === "CE" ? "CALL" : "PUT", 
//         requiredData: ["open", "high", "low", "close", "strike"],
//         fromDate: dateStr, toDate: dateStr
//     };

//     try {
//         console.log(`\n======================================================================`);
//         console.log(`🚀 RUNNING FIXED STRIKE TRADE: ${dateStr} | ${reqExpiry} | ${optType.toUpperCase()}`);
//         console.log(`======================================================================`);
        
//         // 🟢 STEP 1: ENTRY KE TIME KA DATA LAO
//         const entryPayload = { ...basePayload, strike: initialStrikeType.toUpperCase() };
//         const entryRes = await axios.post('https://api.dhan.co/v2/charts/rollingoption', entryPayload, {
//             headers: { 'access-token': ACCESS_TOKEN, 'client-id': CLIENT_ID, 'Content-Type': 'application/json' }
//         });
        
//         const optKey = optType.toUpperCase() === "CE" ? "ce" : "pe";
//         let entryData = entryRes.data.data ? entryRes.data.data[optKey] : null;
//         if(!entryData || !entryData.timestamp) return console.log("❌ Entry Data not found.");

//         let entryIndex = -1, exitIndexATM = -1;
//         for(let i=0; i<entryData.timestamp.length; i++){
//             const tStr = new Date(entryData.timestamp[i] * 1000 + (5.5 * 3600000)).toISOString().split('T')[1].substring(0, 5);
//             if(tStr === entryTime) entryIndex = i;
//             if(tStr === exitTime) exitIndexATM = i;
//         }

//         if(entryIndex === -1 || exitIndexATM === -1) return console.log("❌ Entry ya Exit time data me nahi mila.");

//         // 🔥 Yahan humne Fixed Strike Lock kar li (e.g. 25950)
//         const fixedStrike = entryData.strike[entryIndex];
//         console.log(`🟢 ENTRY (${entryTime}): Strike Lock = ${fixedStrike} (${initialStrikeType})`);
//         console.log(`   └─ O: ${entryData.open[entryIndex]} | H: ${entryData.high[entryIndex]} | L: ${entryData.low[entryIndex]} | C: ${entryData.close[entryIndex]}`);

//         // 🔴 STEP 2: EXIT KE TIME CURRENT MARKET KAHAN HAI?
//         const currentAtmAtExit = entryData.strike[exitIndexATM];
        
//         // Calculate Shift
//         const strikeDiff = fixedStrike - currentAtmAtExit; 
//         const stepDiff = strikeDiff / 50; 

//         let exitStrikeType = "ATM";
//         if(stepDiff !== 0) {
//             // 🔥 DHAN API REVERSE BUG FIX
//             // Chuki Dhan API ITM mangne par +50 (upar) kar deti hai, 
//             // isliye jab hume strike niche (-50) chahiye, to hume zabardasti "OTM" bhejna padega!
            
//             if (stepDiff < 0) {
//                 // Agar target strike (25950) current ATM (26000) se choti hai (-1 step)
//                 exitStrikeType = `OTM${Math.abs(stepDiff)}`; 
//             } else {
//                 // Agar target strike current ATM se badi hai (+ step)
//                 exitStrikeType = `ITM${Math.abs(stepDiff)}`; 
//             }
//         }

//         console.log(`\n🔍 EXIT TIME (${exitTime}): Market shifted. ATM is now ${currentAtmAtExit}.`);
//         console.log(`🔍 Our Target Strike ${fixedStrike} needs Dhan's weird label: [ ${exitStrikeType} ]. Fetching exact chart...`);

//         // 🔴 STEP 3: EXIT DATA LAO
//         if(exitStrikeType === "ATM") {
//              console.log(`\n🔴 EXIT  (${exitTime}): Exact Strike Matched = ${fixedStrike} (${exitStrikeType})`);
//              console.log(`   └─ O: ${entryData.open[exitIndexATM]} | H: ${entryData.high[exitIndexATM]} | L: ${entryData.low[exitIndexATM]} | C: ${entryData.close[exitIndexATM]}`);
//         } else {
//              const exitPayload = { ...basePayload, strike: exitStrikeType };
//              const exitRes = await axios.post('https://api.dhan.co/v2/charts/rollingoption', exitPayload, {
//                 headers: { 'access-token': ACCESS_TOKEN, 'client-id': CLIENT_ID, 'Content-Type': 'application/json' }
//              });
//              let exitData = exitRes.data.data ? exitRes.data.data[optKey] : null;
             
//              if(!exitData || !exitData.timestamp) {
//                  return console.log(`❌ Dhan Server rejected request for extreme Deep ${exitStrikeType}. Data unavailable.`);
//              }

//              let actualExitIndex = -1;
//              for(let i=0; i<exitData.timestamp.length; i++){
//                 const tStr = new Date(exitData.timestamp[i] * 1000 + (5.5 * 3600000)).toISOString().split('T')[1].substring(0, 5);
//                 if(tStr === exitTime) actualExitIndex = i;
//              }
             
//              if(actualExitIndex !== -1) {
//                  console.log(`\n🔴 EXIT  (${exitTime}): Exact Strike Matched = ${exitData.strike[actualExitIndex]} (Fetched via ${exitStrikeType})`);
//                  console.log(`   └─ O: ${exitData.open[actualExitIndex]} | H: ${exitData.high[actualExitIndex]} | L: ${exitData.low[actualExitIndex]} | C: ${exitData.close[actualExitIndex]}`);
//              } else {
//                  console.log("❌ Exit time missing in new chart.");
//              }
//         }
//         console.log(`======================================================================\n`);
//     } catch(e) {
//         console.log("❌ Error:", e.response ? JSON.stringify(e.response.data) : e.message);
//     }
// }

// async function runAllTests() {
//     await fetchFixedStrikeData("2026-02-10", "WEEKLY", "PE", "ATM", "09:45", "10:33");
// }

// runAllTests();


const axios = require('axios');

// 🔥 1. APNI DETAILS YAHAN DALEIN
const CLIENT_ID = "YOUR_CLIENT_ID"; 
const ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzc3MjYxMzc1LCJpYXQiOjE3NzcxNzQ5NzUsInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTAzMjM4NzQ0In0.qkUZSXGBmcnNY7vUafdaSjKIJ7twd8UxKVfVpi1qpvujfmAeUaNcx0iht0qwSy85zaLf82ksfIRaVOpKm2H42g";

// =========================================================================
// 🚀 THE MASTER FUNCTION (Deep-Sea Diver + OHLC + Precision Sniper)
// =========================================================================
async function fetchFixedStrikeData(dateStr, reqExpiry, optType, initialStrikeType, entryTime, exitTime) {
    let expFlag = "WEEK"; let expCode = 1; 

    if (reqExpiry.toUpperCase() === "MONTHLY") { expFlag = "MONTH"; expCode = 1; } 
    else if (reqExpiry.toUpperCase() === "NEXT WEEKLY" || reqExpiry.toUpperCase() === "NEXT WEEK") { expFlag = "WEEK"; expCode = 2; }

    const basePayload = {
        exchangeSegment: "NSE_FNO", interval: "1", securityId: 13, instrument: "OPTIDX",
        expiryFlag: expFlag, expiryCode: expCode, 
        drvOptionType: optType.toUpperCase() === "CE" ? "CALL" : "PUT", 
        requiredData: ["open", "high", "low", "close", "strike"],
        fromDate: dateStr, toDate: dateStr
    };

    try {
        console.log(`\n======================================================================`);
        console.log(`🚀 RUNNING PRECISION SNIPER: ${dateStr} | ${reqExpiry} | ${optType.toUpperCase()}`);
        console.log(`======================================================================`);
        
        // 🟢 STEP 1: ENTRY KE TIME KA DATA LAO
        const entryPayload = { ...basePayload, strike: initialStrikeType.toUpperCase() };
        const entryRes = await axios.post('https://api.dhan.co/v2/charts/rollingoption', entryPayload, {
            headers: { 'access-token': ACCESS_TOKEN, 'client-id': CLIENT_ID, 'Content-Type': 'application/json' }
        });
        
        const optKey = optType.toUpperCase() === "CE" ? "ce" : "pe";
        let entryData = entryRes.data.data ? entryRes.data.data[optKey] : null;
        if(!entryData || !entryData.timestamp) return console.log("❌ Entry Data not found.");

        let entryIndex = -1, exitIndexATM = -1;
        for(let i=0; i<entryData.timestamp.length; i++){
            const tStr = new Date(entryData.timestamp[i] * 1000 + (5.5 * 3600000)).toISOString().split('T')[1].substring(0, 5);
            if(tStr === entryTime) entryIndex = i;
            if(tStr === exitTime) exitIndexATM = i;
        }

        if(entryIndex === -1 || exitIndexATM === -1) return console.log("❌ Entry ya Exit time ATM chart me nahi mila.");

        // 🔥 Humara Target Fixed Strike
        const fixedStrike = entryData.strike[entryIndex];
        console.log(`🟢 ENTRY (${entryTime}): Strike Lock = ${fixedStrike} (${initialStrikeType})`);
        console.log(`   └─ O: ${entryData.open[entryIndex]} | H: ${entryData.high[entryIndex]} | L: ${entryData.low[entryIndex]} | C: ${entryData.close[entryIndex]}`);
        
        const currentAtmAtExit = entryData.strike[exitIndexATM];
        if(currentAtmAtExit === fixedStrike) {
             console.log(`\n🔴 EXIT  (${exitTime}): Exact Strike Matched = ${fixedStrike} (ATM)`);
             console.log(`   └─ O: ${entryData.open[exitIndexATM]} | H: ${entryData.high[exitIndexATM]} | L: ${entryData.low[exitIndexATM]} | C: ${entryData.close[exitIndexATM]}`);
             console.log(`======================================================================\n`);
             return;
        }

        console.log(`\n🔍 EXIT TIME (${exitTime}): ATM shifted to ${currentAtmAtExit}. We need ${fixedStrike}.`);
        console.log(`🔬 Starting DEEP DIVER Sniper to find which label gives ${fixedStrike} AT exactly ${exitTime}...\n`);

        // =========================================================================
        // 🤿 THE DEEP-SEA DIVER (Dynamic Candidates Generator)
        // =========================================================================
        const strikeDiff = Math.abs(fixedStrike - currentAtmAtExit);
        const stepSize = 50; // NIFTY 50 step size is 50
        const exactStep = Math.round(strikeDiff / stepSize);

        let rawCandidates = ["ATM"];
        if (exactStep > 0) {
            // Agar market 10 step dur hai, to hum 8, 9, 10, 11, 12 sab check karenge
            for(let s = Math.max(1, exactStep - 2); s <= exactStep + 2; s++) {
                rawCandidates.push(`ITM${s}`, `OTM${s}`, `ITM-${s}`, `OTM-${s}`, `ITM ${s}`, `OTM ${s}`, `-${s}`);
            }
        } else {
            rawCandidates.push("ITM1", "OTM1", "ITM-1", "OTM-1", "-1", "ITM2", "OTM2");
        }
        
        const candidates = [...new Set(rawCandidates)];
        console.log(`🤿 Generated Dynamic Deep Candidates (${exactStep} steps away):`, candidates.join(', '), '\n');
        // =========================================================================

        let foundExactExit = false;

        for(let guess of candidates) {
            const exitPayload = { ...basePayload, strike: guess };
            let exitRes;
            try {
                exitRes = await axios.post('https://api.dhan.co/v2/charts/rollingoption', exitPayload, {
                    headers: { 'access-token': ACCESS_TOKEN, 'client-id': CLIENT_ID, 'Content-Type': 'application/json' }
                });
            } catch(e) { continue; } 

            let exitData = exitRes.data.data ? exitRes.data.data[optKey] : null;
            if(!exitData || !exitData.timestamp) continue;

            let actualExitIndex = -1;
            for(let i=0; i<exitData.timestamp.length; i++){
                const tStr = new Date(exitData.timestamp[i] * 1000 + (5.5 * 3600000)).toISOString().split('T')[1].substring(0, 5);
                if(tStr === exitTime) { actualExitIndex = i; break; }
            }

            if(actualExitIndex === -1) {
                console.log(`   ❌ [ ${guess} ] tested ➡️ Time ${exitTime} missing in this chart.`);
                continue;
            }

            const returnedStrikeAtExit = exitData.strike[actualExitIndex]; 
            console.log(`   👀 [ ${guess} ] tested ➡️ At ${exitTime}, Dhan gave Strike: ${returnedStrikeAtExit}`);

            if(returnedStrikeAtExit === fixedStrike) {
                console.log(`\n✅ BINGO! Dhan mapped ${fixedStrike} to label [ ${guess} ] exactly at ${exitTime}!`);
                console.log(`🔴 EXIT  (${exitTime}): Exact Strike Matched = ${exitData.strike[actualExitIndex]}`);
                console.log(`   └─ O: ${exitData.open[actualExitIndex]} | H: ${exitData.high[actualExitIndex]} | L: ${exitData.low[actualExitIndex]} | C: ${exitData.close[actualExitIndex]}`);
                foundExactExit = true;
                break;
            }
        }

        if(!foundExactExit) {
            console.log(`\n❌ TOTAL FAILURE: Dhan did not return ${fixedStrike} at ${exitTime} for any standard label.`);
        }
        console.log(`======================================================================\n`);
    } catch(e) {
        console.log("❌ Error:", e.message);
    }
}

async function runAllTests() {
    // Yahan apni pasand ki Deep OTM / Deep ITM entry test karein
    await fetchFixedStrikeData("2026-04-13", "WEEKLY", "PE", "ATM", "09:45", "10:07");
}

runAllTests();