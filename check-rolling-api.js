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






// const axios = require('axios');

// // 🔥 1. APNI DETAILS YAHAN DALEIN
// const CLIENT_ID = "1103238744"; 
// const ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzgxMzQxNDM4LCJpYXQiOjE3ODEyNTUwMzgsInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTAzMjM4NzQ0In0.InjRp3d4P08K9YHpOOZve9rwsY2EYBcOIuREhM47_ivXDSd10meDJ9kmTgVx_SbGW7yVHH-zk4sfn75DQ-dU0Q";

// // 🛑 Dhan API ko hang hone se bachane ke liye chota sa timeout/delay
// const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// // =========================================================================
// // 🚀 THE MASTER FUNCTION (Deep-Sea Diver + OHLC + Precision Sniper)
// // =========================================================================
// async function fetchFixedStrikeData(dateStr, reqExpiry, optType, initialStrikeType, entryTime, exitTime) {
//     let expFlag = "WEEK"; let expCode = 1; 

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
//         console.log(`🚀 RUNNING PRECISION SNIPER: ${dateStr} | ${reqExpiry} | ${optType.toUpperCase()}`);
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

//         if(entryIndex === -1 || exitIndexATM === -1) return console.log("❌ Entry ya Exit time ATM chart me nahi mila.");

//         // 🔥 Humara Target Fixed Strike
//         const fixedStrike = entryData.strike[entryIndex];
//         console.log(`🟢 ENTRY (${entryTime}): Strike Lock = ${fixedStrike} (${initialStrikeType})`);
//         console.log(`   └─ O: ${entryData.open[entryIndex]} | H: ${entryData.high[entryIndex]} | L: ${entryData.low[entryIndex]} | C: ${entryData.close[entryIndex]}`);
        
//         const currentAtmAtExit = entryData.strike[exitIndexATM];
//         if(currentAtmAtExit === fixedStrike) {
//              console.log(`\n🔴 EXIT  (${exitTime}): Exact Strike Matched = ${fixedStrike} (ATM)`);
//              console.log(`   └─ O: ${entryData.open[exitIndexATM]} | H: ${entryData.high[exitIndexATM]} | L: ${entryData.low[exitIndexATM]} | C: ${entryData.close[exitIndexATM]}`);
//              console.log(`======================================================================\n`);
//              return;
//         }

//         console.log(`\n🔍 EXIT TIME (${exitTime}): ATM shifted to ${currentAtmAtExit}. We need ${fixedStrike}.`);
//         console.log(`🔬 Starting DEEP DIVER Sniper to find which label gives ${fixedStrike} AT exactly ${exitTime}...\n`);

//         // =========================================================================
//         // 🤿 THE DEEP-SEA DIVER (Dynamic Candidates Generator) - 10 STEPS UPGRADE
//         // =========================================================================
//         const strikeDiff = Math.abs(fixedStrike - currentAtmAtExit);
//         const stepSize = 50; // NIFTY 50 step size is 50
//         const exactStep = Math.round(strikeDiff / stepSize);

//         let rawCandidates = ["ATM"];
//         if (exactStep > 0) {
//             // 🔥 NAYA FIX: Ab hum +/- 10 steps (bahut deep) tak check karenge!
//             for(let s = Math.max(1, exactStep - 10); s <= exactStep + 10; s++) {
//                 rawCandidates.push(`ITM${s}`, `OTM${s}`, `ITM-${s}`, `OTM-${s}`, `ITM ${s}`, `OTM ${s}`, `-${s}`);
//             }
//         } else {
//             // Agar market wahi hai, tab bhi safety ke liye aage-peeche 5 step check kar lo
//             for(let s = 1; s <= 5; s++) {
//                 rawCandidates.push(`ITM${s}`, `OTM${s}`, `ITM-${s}`, `OTM-${s}`, `-${s}`);
//             }
//         }
        
//         const candidates = [...new Set(rawCandidates)];
//         console.log(`🤿 Generated Dynamic Deep Candidates (${exactStep} steps away):`, candidates.join(', '), '\n');
//         // =========================================================================

//         let foundExactExit = false;

//         for(let guess of candidates) {
//             await delay(200); // 🛑 ANTI-BAN SHIELD: 200ms ka saans lene do API ko

//             const exitPayload = { ...basePayload, strike: guess };
//             let exitRes;
//             try {
//                 exitRes = await axios.post('https://api.dhan.co/v2/charts/rollingoption', exitPayload, {
//                     headers: { 'access-token': ACCESS_TOKEN, 'client-id': CLIENT_ID, 'Content-Type': 'application/json' },
//                     timeout: 4000
//                 });
//             } catch(e) { 
//                 const status = e.response ? e.response.status : 0;
//                 if(status === 429 || (e.response && e.response.data && e.response.data.errorCode === 'DH-904')){
//                     console.log(` 🛑 RATE LIMIT HIT for [ ${guess} ]. Test will slow down...`);
//                     await delay(3000); // Agar gussa hua to 3 sec ruk jao
//                 }
//                 continue; 
//             } 

//             let exitData = exitRes.data && exitRes.data.data ? exitRes.data.data[optKey] : null;
//             if(!exitData || !exitData.timestamp) continue;

//             let actualExitIndex = -1;
//             for(let i=0; i<exitData.timestamp.length; i++){
//                 const tStr = new Date(exitData.timestamp[i] * 1000 + (5.5 * 3600000)).toISOString().split('T')[1].substring(0, 5);
//                 if(tStr === exitTime) { actualExitIndex = i; break; }
//             }

//             if(actualExitIndex === -1) {
//                 // Console clutter kam karne ke liye isko hata sakte hain, par testing ke liye theek hai
//                 // console.log(`   ❌ [ ${guess} ] tested ➡️ Time ${exitTime} missing in this chart.`);
//                 continue;
//             }

//             const returnedStrikeAtExit = exitData.strike[actualExitIndex]; 
//             console.log(`   👀 [ ${guess} ] tested ➡️ At ${exitTime}, Dhan gave Strike: ${returnedStrikeAtExit}`);

//             if(returnedStrikeAtExit === fixedStrike) {
//                 console.log(`\n✅ BINGO! Dhan mapped ${fixedStrike} to label [ ${guess} ] exactly at ${exitTime}!`);
//                 console.log(`🔴 EXIT  (${exitTime}): Exact Strike Matched = ${exitData.strike[actualExitIndex]}`);
//                 console.log(`   └─ O: ${exitData.open[actualExitIndex]} | H: ${exitData.high[actualExitIndex]} | L: ${exitData.low[actualExitIndex]} | C: ${exitData.close[actualExitIndex]}`);
//                 foundExactExit = true;
//                 break;
//             }
//         }

//         if(!foundExactExit) {
//             console.log(`\n❌ TOTAL FAILURE: Dhan did not return ${fixedStrike} at ${exitTime} for any standard label.`);
//         }
//         console.log(`======================================================================\n`);
//     } catch(e) {
//         console.log("❌ Error:", e.message);
//     }
// }

// async function runAllTests() {
//     // Yahan apni pasand ki Deep OTM / Deep ITM entry test karein
//     await fetchFixedStrikeData("2026-04-29", "WEEKLY", "CE", "ATM", "09:45", "10:10");
//     await fetchFixedStrikeData("2026-04-29", "WEEKLY", "CE", "ATM", "09:45", "10:11");
// }

// runAllTests();





// const axios = require('axios');

// // 🔥 1. APNI DETAILS YAHAN DALEIN
// const CLIENT_ID = "1103238744"; 
// const ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzgxNDM1NDMxLCJpYXQiOjE3ODEzNDkwMzEsInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTAzMjM4NzQ0In0.wZXkT5HYMmH9O926q67Ew_dUffvYRnJTCL4NSNJ-zszADPS7aYjM0OPXV4ebl2JLKlBY0v7JsuAgfMfVMd2IsA";

// // 🛑 Dhan API ko hang hone se bachane ke liye chota sa timeout/delay
// const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// // =========================================================================
// // 🚀 THE MASTER FUNCTION (Deep-Sea Diver + OHLC + Precision Sniper)
// // 🔥 NAYA FIX: 'symbol' parameter add kiya gaya hai
// // =========================================================================
// async function fetchFixedStrikeData(symbol, dateStr, reqExpiry, optType, initialStrikeType, entryTime, exitTime) {
//     let expFlag = "WEEK"; let expCode = 1; 

//     if (reqExpiry.toUpperCase() === "MONTHLY") { expFlag = "MONTH"; expCode = 1; } 
//     else if (reqExpiry.toUpperCase() === "NEXT WEEKLY" || reqExpiry.toUpperCase() === "NEXT WEEK") { expFlag = "WEEK"; expCode = 2; }

//     // =========================================================
//     // 🎯 SMART INSTRUMENT SELECTOR (Nifty vs BankNifty vs Midcap)
//     // =========================================================
//     let secId = 13; // Default NIFTY
//     let stepSize = 50; 
    
//     if (symbol.toUpperCase() === "MIDCPNIFTY") {
//         secId = 120; // Midcap Nifty Token
//         stepSize = 25; // Midcap Nifty Strike Step
//     } else if (symbol.toUpperCase() === "BANKNIFTY") {
//         secId = 25; // BankNifty Token
//         stepSize = 100; // BankNifty Strike Step
//     }

//     // 🔥 Payload me dynamic securityId lagaya gaya hai
//     const basePayload = {
//         exchangeSegment: "NSE_FNO", interval: "1", securityId: secId, instrument: "OPTIDX",
//         expiryFlag: expFlag, expiryCode: expCode, 
//         drvOptionType: optType.toUpperCase() === "CE" ? "CALL" : "PUT", 
//         requiredData: ["open", "high", "low", "close", "strike"],
//         fromDate: dateStr, toDate: dateStr
//     };

//     try {
//         console.log(`\n======================================================================`);
//         console.log(`🚀 RUNNING PRECISION SNIPER: ${symbol} | ${dateStr} | ${reqExpiry} | ${optType.toUpperCase()}`);
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

//         // 🚨 3. The X-Ray Reporter
//         if(entryIndex === -1 || exitIndexATM === -1) {
//             console.log(`❌ Target Time Missing: ${entryTime} ya ${exitTime} nahi mila.`);
//             console.log(`📊 API ne total ${entryData.timestamp.length} candles bheji hain.`);
//             console.log(`🗓️ First Candle: ${availableTimes[0]}`);
//             console.log(`🗓️ Last Candle: ${availableTimes[availableTimes.length - 1]}`);
            
//             console.log(`\n💡 PRO-TIP: Agar Date 25 May (Monday) ki aa rahi hai, matlab Dhan ne expired contract bhej diya hai! Apna expiry "WEEKLY" se badal kar "NEXT WEEKLY" kar lijiye.`);
//             return;
//         }

//         // 🔥 Humara Target Fixed Strike
//         const fixedStrike = entryData.strike[entryIndex];
//         console.log(`🟢 ENTRY (${entryTime}): Strike Lock = ${fixedStrike} (${initialStrikeType})`);
//         console.log(`   └─ O: ${entryData.open[entryIndex]} | H: ${entryData.high[entryIndex]} | L: ${entryData.low[entryIndex]} | C: ${entryData.close[entryIndex]}`);
        
//         const currentAtmAtExit = entryData.strike[exitIndexATM];
//         if(currentAtmAtExit === fixedStrike) {
//              console.log(`\n🔴 EXIT  (${exitTime}): Exact Strike Matched = ${fixedStrike} (ATM)`);
//              console.log(`   └─ O: ${entryData.open[exitIndexATM]} | H: ${entryData.high[exitIndexATM]} | L: ${entryData.low[exitIndexATM]} | C: ${entryData.close[exitIndexATM]}`);
//              console.log(`======================================================================\n`);
//              return;
//         }

//         console.log(`\n🔍 EXIT TIME (${exitTime}): ATM shifted to ${currentAtmAtExit}. We need ${fixedStrike}.`);
//         console.log(`🔬 Starting DEEP DIVER Sniper to find which label gives ${fixedStrike} AT exactly ${exitTime}...\n`);

//         // =========================================================================
//         // 🤿 THE DEEP-SEA DIVER (Dynamic Candidates Generator) - 10 STEPS UPGRADE
//         // =========================================================================
//         const strikeDiff = Math.abs(fixedStrike - currentAtmAtExit);
//         // 🔥 NAYA FIX: Ab Math array calculation dynamic stepSize (25 for Midcap) ke sath hoga
//         const exactStep = Math.round(strikeDiff / stepSize);

//         let rawCandidates = ["ATM"];
//         if (exactStep > 0) {
//             for(let s = Math.max(1, exactStep - 10); s <= exactStep + 10; s++) {
//                 rawCandidates.push(`ITM${s}`, `OTM${s}`, `ITM-${s}`, `OTM-${s}`, `ITM ${s}`, `OTM ${s}`, `-${s}`);
//             }
//         } else {
//             for(let s = 1; s <= 5; s++) {
//                 rawCandidates.push(`ITM${s}`, `OTM${s}`, `ITM-${s}`, `OTM-${s}`, `-${s}`);
//             }
//         }
        
//         const candidates = [...new Set(rawCandidates)];
//         console.log(`🤿 Generated Dynamic Deep Candidates (${exactStep} steps away):`, candidates.join(', '), '\n');
//         // =========================================================================

//         let foundExactExit = false;

//         for(let guess of candidates) {
//             await delay(200); // 🛑 ANTI-BAN SHIELD: 200ms ka saans lene do API ko

//             const exitPayload = { ...basePayload, strike: guess };
//             let exitRes;
//             try {
//                 exitRes = await axios.post('https://api.dhan.co/v2/charts/rollingoption', exitPayload, {
//                     headers: { 'access-token': ACCESS_TOKEN, 'client-id': CLIENT_ID, 'Content-Type': 'application/json' },
//                     timeout: 4000
//                 });
//             } catch(e) { 
//                 const status = e.response ? e.response.status : 0;
//                 if(status === 429 || (e.response && e.response.data && e.response.data.errorCode === 'DH-904')){
//                     console.log(` 🛑 RATE LIMIT HIT for [ ${guess} ]. Test will slow down...`);
//                     await delay(3000); 
//                 }
//                 continue; 
//             } 

//             let exitData = exitRes.data && exitRes.data.data ? exitRes.data.data[optKey] : null;
//             if(!exitData || !exitData.timestamp) continue;

//             let actualExitIndex = -1;
//             for(let i=0; i<exitData.timestamp.length; i++){
//                 const tStr = new Date(exitData.timestamp[i] * 1000 + (5.5 * 3600000)).toISOString().split('T')[1].substring(0, 5);
//                 if(tStr === exitTime) { actualExitIndex = i; break; }
//             }

//             if(actualExitIndex === -1) {
//                 continue;
//             }

//             const returnedStrikeAtExit = exitData.strike[actualExitIndex]; 
//             console.log(`   👀 [ ${guess} ] tested ➡️ At ${exitTime}, Dhan gave Strike: ${returnedStrikeAtExit}`);

//             if(returnedStrikeAtExit === fixedStrike) {
//                 console.log(`\n✅ BINGO! Dhan mapped ${fixedStrike} to label [ ${guess} ] exactly at ${exitTime}!`);
//                 console.log(`🔴 EXIT  (${exitTime}): Exact Strike Matched = ${exitData.strike[actualExitIndex]}`);
//                 console.log(`   └─ O: ${exitData.open[actualExitIndex]} | H: ${exitData.high[actualExitIndex]} | L: ${exitData.low[actualExitIndex]} | C: ${exitData.close[actualExitIndex]}`);
//                 foundExactExit = true;
//                 break;
//             }
//         }

//         if(!foundExactExit) {
//             console.log(`\n❌ TOTAL FAILURE: Dhan did not return ${fixedStrike} at ${exitTime} for any standard label.`);
//         }
//         console.log(`======================================================================\n`);
//     } catch(e) {
//         console.log("❌ Error:", e.message);
//     }
// }

// async function runAllTests() {
//     // 🔥 Ab aap pehla argument Instrument ka naam bhej sakte hain (MIDCPNIFTY, NIFTY, ya BANKNIFTY)
//     await fetchFixedStrikeData("NIFTY", "2026-06-12", "WEEKLY", "CE", "ATM", "09:45", "10:10");
//     await fetchFixedStrikeData("NIFTY", "2026-05-27", "WEEKLY", "CE", "ATM", "09:45", "10:11");
// }

// runAllTests();








const axios = require('axios');

// 🔥 1. APNI DETAILS YAHAN DALEIN
const CLIENT_ID = "1103238744"; 
const ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzgzOTMyMzkwLCJpYXQiOjE3ODM4NDU5OTAsInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTAzMjM4NzQ0In0.yNvws-FZfo4uKg3ICu_Pt9XaW8pVOWCIutpcTH1u8MDV8pqiXPl0zrplAa5OR-tiSXbYurKB61vhLAC-y4LvTQ";

// 🛑 Dhan API ko hang hone se bachane ke liye chota sa timeout/delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// =========================================================================
// 🚀 THE MASTER FUNCTION (Deep-Sea Diver + OHLC + Precision Sniper)
// 🔥 NAYA FIX: 'symbol' parameter add kiya gaya hai
// =========================================================================
async function fetchFixedStrikeData(symbol, dateStr, reqExpiry, optType, initialStrikeType, entryTime, exitTime) {
    let expFlag = "WEEK"; let expCode = 1; 

    if (reqExpiry.toUpperCase() === "MONTHLY") { expFlag = "MONTH"; expCode = 1; } 
    else if (reqExpiry.toUpperCase() === "NEXT WEEKLY" || reqExpiry.toUpperCase() === "NEXT WEEK") { expFlag = "WEEK"; expCode = 2; }

    // =========================================================
    // 🎯 SMART INSTRUMENT SELECTOR (Nifty vs BankNifty vs Midcap)
    // =========================================================
    let secId = 13; // Default NIFTY
    let stepSize = 50; 
    let exchSegment = "NSE_FNO"; // 🔥 Default Exchange
    
    const sym = symbol.toUpperCase();

    if (sym === "BANKNIFTY") {
        secId = 25; stepSize = 100; exchSegment = "NSE_FNO";
    } else if (sym === "FINNIFTY") {
        secId = 27; stepSize = 50; exchSegment = "NSE_FNO";
    } else if (sym === "MIDCPNIFTY") {
        secId = 442; stepSize = 25; exchSegment = "NSE_FNO";
    } else if (sym === "SENSEX") {
        secId = 51; stepSize = 100; exchSegment = "BSE_FNO"; // 🔥 BSE_FNO (Ye bahut zaroori hai!)
    } else if (sym === "BANKEX") {
        secId = 69; stepSize = 100; exchSegment = "BSE_FNO"; // 🔥 BSE_FNO
    }

    // 🔥 Payload me dynamic securityId aur exchangeSegment lagaya gaya hai
    const basePayload = {
        exchangeSegment: exchSegment, // Dynamic Exchange (NSE_FNO / BSE_FNO)
        interval: "1", 
        securityId: secId, // Dynamic Token
        instrument: "OPTIDX",
        expiryFlag: expFlag, 
        expiryCode: expCode, 
        drvOptionType: optType.toUpperCase() === "CE" ? "CALL" : "PUT", 
        requiredData: ["open", "high", "low", "close", "strike"],
        fromDate: dateStr, 
        toDate: dateStr
    };

    try {
        console.log(`\n======================================================================`);
        console.log(`🚀 RUNNING PRECISION SNIPER: ${symbol} | ${dateStr} | ${reqExpiry} | ${optType.toUpperCase()}`);
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

        // 🚨 3. The X-Ray Reporter
        if(entryIndex === -1 || exitIndexATM === -1) {
            console.log(`❌ Target Time Missing: ${entryTime} ya ${exitTime} nahi mila.`);
            console.log(`📊 API ne total ${entryData.timestamp ? entryData.timestamp.length : 0} candles bheji hain.`);
            console.log(`\n💡 PRO-TIP: Agar API 0 candles bhej rahi hai, to matlab ya to Security ID galat hai, ya us din us contract me ZERO trading (No Liquidity) hui thi!`);
            return;
        }

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
        // 🤿 THE DEEP-SEA DIVER (Dynamic Candidates Generator) - 10 STEPS UPGRADE
        // =========================================================================
        const strikeDiff = Math.abs(fixedStrike - currentAtmAtExit);
        // 🔥 NAYA FIX: Ab Math array calculation dynamic stepSize (25 for Midcap) ke sath hoga
        const exactStep = Math.round(strikeDiff / stepSize);

        let rawCandidates = ["ATM"];
        if (exactStep > 0) {
            for(let s = Math.max(1, exactStep - 10); s <= exactStep + 10; s++) {
                rawCandidates.push(`ITM${s}`, `OTM${s}`, `ITM-${s}`, `OTM-${s}`, `ITM ${s}`, `OTM ${s}`, `-${s}`);
            }
        } else {
            for(let s = 1; s <= 5; s++) {
                rawCandidates.push(`ITM${s}`, `OTM${s}`, `ITM-${s}`, `OTM-${s}`, `-${s}`);
            }
        }
        
        const candidates = [...new Set(rawCandidates)];
        console.log(`🤿 Generated Dynamic Deep Candidates (${exactStep} steps away):`, candidates.join(', '), '\n');
        // =========================================================================

        let foundExactExit = false;

        for(let guess of candidates) {
            await delay(200); // 🛑 ANTI-BAN SHIELD: 200ms ka saans lene do API ko

            const exitPayload = { ...basePayload, strike: guess };
            let exitRes;
            try {
                exitRes = await axios.post('https://api.dhan.co/v2/charts/rollingoption', exitPayload, {
                    headers: { 'access-token': ACCESS_TOKEN, 'client-id': CLIENT_ID, 'Content-Type': 'application/json' },
                    timeout: 4000
                });
            } catch(e) { 
                const status = e.response ? e.response.status : 0;
                if(status === 429 || (e.response && e.response.data && e.response.data.errorCode === 'DH-904')){
                    console.log(` 🛑 RATE LIMIT HIT for [ ${guess} ]. Test will slow down...`);
                    await delay(3000); 
                }
                continue; 
            } 

            let exitData = exitRes.data && exitRes.data.data ? exitRes.data.data[optKey] : null;
            if(!exitData || !exitData.timestamp) continue;

            let actualExitIndex = -1;
            for(let i=0; i<exitData.timestamp.length; i++){
                const tStr = new Date(exitData.timestamp[i] * 1000 + (5.5 * 3600000)).toISOString().split('T')[1].substring(0, 5);
                if(tStr === exitTime) { actualExitIndex = i; break; }
            }

            if(actualExitIndex === -1) {
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

// async function runAllTests() {
//     // 🔥 Ab aap pehla argument Instrument ka naam bhej sakte hain (MIDCPNIFTY, NIFTY, ya BANKNIFTY)
//     await fetchFixedStrikeData("NIFTY", "2026-06-12", "WEEKLY", "CE", "ATM", "09:45", "10:10");
//     await fetchFixedStrikeData("NIFTY", "2026-05-27", "WEEKLY", "CE", "ATM", "09:45", "10:11");
// }

async function runAllTests() {
    console.log("🚦 STARTING API TESTS (AS PER SEBI NEW EXPIRY RULES) 🚦\n");

    // // ✅ NSE - WEEKLY ALLOWED
    await fetchFixedStrikeData("NIFTY", "2026-07-07", "WEEKLY", "CE", "ATM", "09:32", "10:10");
    // await delay(2000);

    // // ✅ BSE - WEEKLY ALLOWED
    // await fetchFixedStrikeData("SENSEX", "2026-06-12", "WEEKLY", "CE", "ATM", "09:45", "10:10");
    // await delay(2000);

    // // ❌ NSE - ONLY MONTHLY NOW
    // await fetchFixedStrikeData("BANKNIFTY", "2026-06-12", "MONTHLY", "CE", "ATM", "09:45", "10:10");
    // await delay(2000);

    // await fetchFixedStrikeData("FINNIFTY", "2026-06-12", "MONTHLY", "CE", "ATM", "09:45", "10:10");
    // await delay(2000);

    // await fetchFixedStrikeData("MIDCPNIFTY", "2026-05-26", "MONTHLY", "CE", "ATM", "09:45", "10:10");
    // await delay(2000);

    // // ❌ BSE - ONLY MONTHLY NOW
    // await fetchFixedStrikeData("BANKEX", "2026-05-26", "MONTHLY", "CE", "ATM", "09:45", "10:10");
}

runAllTests();

