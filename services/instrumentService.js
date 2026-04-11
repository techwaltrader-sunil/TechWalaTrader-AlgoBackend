
// const axios = require('axios');
// const csv = require('csv-parser');

// const DHAN_CSV_URL = "https://images.dhan.co/api-data/api-scrip-master.csv";

// let nfoInstruments = [];

// const downloadAndParseInstruments = async () => {
//     console.log("📥 Downloading Dhan Scrip Master CSV... Please wait.");

//     try {
//         const response = await axios({
//             method: 'get',
//             url: DHAN_CSV_URL,
//             responseType: 'stream'
//         });

//         const tempData = [];

//         response.data
//             .pipe(csv({ mapHeaders: ({ header }) => header.trim() })) 
//             .on('data', (row) => {
//                 const instName = (row.SEM_INSTRUMENT_NAME || "").trim();

//                 if (instName === 'OPTIDX' || instName === 'OPTSTK') {

//                     let rawExchange = (row.SEM_EXM_EXCH_ID || "").trim().toUpperCase();
//                     let mappedExchange = "NSE_FNO"; 

//                     if (rawExchange.includes('BSE') || rawExchange === 'BFO') {
//                         mappedExchange = 'BSE_FNO'; 
//                     }

//                     tempData.push({
//                         id: (row.SEM_SMST_SECURITY_ID || "").trim(),              
//                         symbol: (row.SEM_CUSTOM_SYMBOL || "").trim(),             
//                         strike: parseFloat(row.SEM_STRIKE_PRICE),  
//                         optionType: (row.SEM_OPTION_TYPE || "").trim(),           
//                         expiry: (row.SEM_EXPIRY_DATE || "").trim(),               
//                         tradingSymbol: (row.SEM_TRADING_SYMBOL || "").trim(),
//                         exchange: mappedExchange 
//                     });
//                 }
//             })
//             .on('end', () => {
//                 nfoInstruments = tempData;
//                 console.log(`✅ Dhan CSV Parsed Successfully! Loaded ${nfoInstruments.length} Options contracts.`);
//             });

//     } catch (error) {
//         console.error("❌ Failed to download CSV:", error.message);
//     }
// };

// const getOptionSecurityId = (baseSymbol, strike, optionType) => {

//     // 🔥 THE FIX: Aapka Webhook wala solid logic wapas aa gaya!
//     // Ye Dhan ke naye format (e.g., BANKNIFTY-Mar2026-53400-CE) ko correctly pakad lega
//     const matches = nfoInstruments.filter(inst => 
//         inst.tradingSymbol.startsWith(baseSymbol + '-') && 
//         inst.strike === parseFloat(strike) && 
//         inst.optionType === optionType
//     );

//     if (matches.length === 0) return null;

//     matches.sort((a, b) => new Date(a.expiry) - new Date(b.expiry));

//     const apiOptionType = matches[0].optionType === 'CE' ? 'CALL' : 'PUT';
//     const apiExpiry = matches[0].expiry.split(' ')[0]; 

//     return {
//         id: matches[0].id,
//         exchange: matches[0].exchange, 
//         tradingSymbol: matches[0].tradingSymbol,
//         expiry: apiExpiry,       
//         optionType: apiOptionType, 
//         strike: matches[0].strike  
//     };
// };

// module.exports = { downloadAndParseInstruments, getOptionSecurityId };




// const axios = require('axios');
// const csv = require('csv-parser');

// const DHAN_CSV_URL = "https://images.dhan.co/api-data/api-scrip-master.csv";

// let nfoInstruments = [];

// const downloadAndParseInstruments = async () => {
//     console.log("📥 Downloading Dhan Scrip Master CSV... Please wait.");

//     try {
//         const response = await axios({
//             method: 'get',
//             url: DHAN_CSV_URL,
//             responseType: 'stream'
//         });

//         const tempData = [];

//         response.data
//             .pipe(csv({ mapHeaders: ({ header }) => header.trim() })) 
//             .on('data', (row) => {
//                 const instName = (row.SEM_INSTRUMENT_NAME || "").trim();

//                 // Sirf Options uthao
//                 if (instName === 'OPTIDX' || instName === 'OPTSTK') {
//                     tempData.push({
//                         id: (row.SEM_SMST_SECURITY_ID || "").trim(),
//                         customSymbol: (row.SEM_CUSTOM_SYMBOL || "").trim().toUpperCase(),
//                         tradingSymbol: (row.SEM_TRADING_SYMBOL || "").trim().toUpperCase(),
//                         strike: parseFloat(row.SEM_STRIKE_PRICE),  
//                         expiry: (row.SEM_EXPIRY_DATE || "").trim()
//                     });
//                 }
//             })
//             .on('end', () => {
//                 nfoInstruments = tempData;
//                 console.log(`✅ Dhan CSV Parsed Successfully! Loaded ${nfoInstruments.length} Options contracts.`);
//             });

//     } catch (error) {
//         console.error("❌ Failed to download CSV:", error.message);
//     }
// };

// const getOptionSecurityId = (baseSymbol, strike, optionType) => {
//     const targetBase = baseSymbol.toUpperCase(); 
//     const targetStrike = parseFloat(strike); 
//     const suffix = ['CE', 'CALL'].includes(optionType.toUpperCase()) ? 'CE' : 'PE';

//     const matches = nfoInstruments.filter(inst => {
//         // 1. Strike Check
//         if (inst.strike !== targetStrike) return false;

//         // 🔥 2. THE MASTER HACK: BSE IDs are 10 digits. NSE IDs are <= 6 digits.
//         // Ye line BSE (1000728652) ko hamesha ke liye block kar degi!
//         if (inst.id.length > 7) return false; 

//         // 3. String Match Check (Dhan chahay dash lagaye ya na lagaye, ye pakad lega)
//         const ts = inst.tradingSymbol;
//         const cs = inst.customSymbol;

//         // NIFTY se shuru hona chahiye
//         if (!ts.startsWith(targetBase) && !cs.startsWith(targetBase)) return false;
//         // CE / PE par khatam hona chahiye
//         if (!ts.endsWith(suffix) && !cs.endsWith(suffix)) return false;

//         return true;
//     });

//     if (matches.length === 0) {
//         console.log(`⚠️ Instrument NOT FOUND for: ${targetBase} ${targetStrike} ${suffix}`);
//         return null;
//     }

//     // Sabse kareeb wali expiry ko top par laao
//     matches.sort((a, b) => new Date(a.expiry) - new Date(b.expiry));

//     return {
//         id: matches[0].id,
//         exchange: "NSE_FNO", // Hardcoded safely because BSE is blocked
//         tradingSymbol: matches[0].customSymbol || matches[0].tradingSymbol, 
//         expiry: matches[0].expiry.split(' ')[0],       
//         optionType: suffix === 'CE' ? 'CALL' : 'PUT', // Dhan API format
//         strike: matches[0].strike  
//     };
// };

// module.exports = { downloadAndParseInstruments, getOptionSecurityId };



// const axios = require('axios');
// const csv = require('csv-parser');

// const DHAN_CSV_URL = "https://images.dhan.co/api-data/api-scrip-master.csv";

// let nfoInstruments = [];

// const downloadAndParseInstruments = async () => {
//     console.log("📥 Downloading Dhan Scrip Master CSV... Please wait.");
//     try {
//         const response = await axios({ method: 'get', url: DHAN_CSV_URL, responseType: 'stream' });
//         const tempData = [];

//         response.data
//             .pipe(csv({ mapHeaders: ({ header }) => header.trim() }))
//             .on('data', (row) => {
//                 const instName = (row.SEM_INSTRUMENT_NAME || "").trim();
//                 if (instName === 'OPTIDX' || instName === 'OPTSTK') {
//                     tempData.push({
//                         id: (row.SEM_SMST_SECURITY_ID || "").trim(),
//                         customSymbol: (row.SEM_CUSTOM_SYMBOL || "").trim().toUpperCase(),
//                         tradingSymbol: (row.SEM_TRADING_SYMBOL || "").trim().toUpperCase(),
//                         strike: parseFloat(row.SEM_STRIKE_PRICE),
//                         expiry: (row.SEM_EXPIRY_DATE || "").trim()
//                     });
//                 }
//             })
//             .on('end', () => {
//                 nfoInstruments = tempData;
//                 console.log(`✅ Dhan CSV Parsed Successfully! Loaded ${nfoInstruments.length} Options contracts.`);
//             });

//     } catch (error) {
//         console.error("❌ Failed to download CSV:", error.message);
//     }
// };

// const getOptionSecurityId = (baseSymbol, strike, optionType) => {
//     // 🔥 THE FIX: Naming Translation for Dhan API
//     let targetBase = baseSymbol.toUpperCase().replace(' 50', '').trim();
//     if (targetBase === "NIFTY BANK") targetBase = "BANKNIFTY";
//     else if (targetBase === "NIFTY FIN SERVICE") targetBase = "FINNIFTY";
//     else if (targetBase === "NIFTY MID SELECT") targetBase = "MIDCPNIFTY";

//     const targetStrike = parseFloat(strike);
//     const suffix = ['CE', 'CALL'].includes(optionType.toUpperCase()) ? 'CE' : 'PE';

//     const matches = nfoInstruments.filter(inst => {
//         if (inst.strike !== targetStrike) return false;
//         if (inst.id.length > 7) return false; // Block BSE
//         const ts = inst.tradingSymbol;
//         const cs = inst.customSymbol;
//         if (!ts.startsWith(targetBase) && !cs.startsWith(targetBase)) return false;
//         if (!ts.endsWith(suffix) && !cs.endsWith(suffix)) return false;
//         return true;
//     });

//     if (matches.length === 0) {
//         console.log(`⚠️ Option Token NOT FOUND in CSV for: ${targetBase} ${targetStrike} ${suffix}`);
//         return null;
//     }

//     matches.sort((a, b) => new Date(a.expiry) - new Date(b.expiry));

//     return {
//         id: matches[0].id,
//         exchange: "NSE_FNO",
//         tradingSymbol: matches[0].customSymbol || matches[0].tradingSymbol,
//         expiry: matches[0].expiry.split(' ')[0],
//         optionType: suffix === 'CE' ? 'CALL' : 'PUT',
//         strike: matches[0].strike
//     };
// };

// module.exports = { downloadAndParseInstruments, getOptionSecurityId };


const axios = require('axios');
const csv = require('csv-parser');

const DHAN_CSV_URL = "https://images.dhan.co/api-data/api-scrip-master.csv";

let nfoInstruments = [];

const downloadAndParseInstruments = async () => {
    console.log("📥 Downloading Dhan Scrip Master CSV... Please wait.");
    try {
        const response = await axios({ method: 'get', url: DHAN_CSV_URL, responseType: 'stream' });
        const tempData = [];

        response.data
            .pipe(csv({ mapHeaders: ({ header }) => header.trim() }))
            .on('data', (row) => {
                const instName = (row.SEM_INSTRUMENT_NAME || "").trim();
                if (instName === 'OPTIDX' || instName === 'OPTSTK') {
                    tempData.push({
                        id: (row.SEM_SMST_SECURITY_ID || "").trim(),
                        customSymbol: (row.SEM_CUSTOM_SYMBOL || "").trim().toUpperCase(),
                        tradingSymbol: (row.SEM_TRADING_SYMBOL || "").trim().toUpperCase(),
                        strike: parseFloat(row.SEM_STRIKE_PRICE),
                        expiry: (row.SEM_EXPIRY_DATE || "").trim()
                    });
                }
            })
            .on('end', () => {
                nfoInstruments = tempData;
                console.log(`✅ Dhan CSV Parsed Successfully! Loaded ${nfoInstruments.length} Options contracts.`);
            });

    } catch (error) {
        console.error("❌ Failed to download CSV:", error.message);
    }
};

// 🔥 NAYA HELPER: Instrument ke hisab se Strike Step nikalna
const getStrikeStep = (symbol) => {
    const sym = symbol.toUpperCase();
    if (sym.includes("BANKNIFTY") || sym.includes("SENSEX") || sym.includes("BANKEX")) return 100;
    if (sym.includes("FINNIFTY") || sym.includes("NIFTY")) return 50;
    if (sym.includes("MIDCPNIFTY") || sym.includes("MIDCAP")) return 25;
    return 50;
};

// 🔥 NAYA HELPER: OTM/ITM aur % ka Math karke exact Strike Price nikalna
const calculateTargetStrike = (spotPrice, baseSymbol, strikeCriteria, strikeType, optionType) => {
    const step = getStrikeStep(baseSymbol);
    const atmStrike = Math.round(spotPrice / step) * step; // Sabse pehle ATM nikalo

    if (!strikeType || strikeType === "ATM") return atmStrike;

    const isCall = ['CE', 'CALL'].includes(optionType.toUpperCase());
    const parts = strikeType.split(' '); // Example: ["ITM", "100"] ya ["OTM", "1.5%"]

    if (parts.length === 2) {
        const type = parts[0].toUpperCase(); // ITM ya OTM
        let offsetVal = parseFloat(parts[1].replace('%', '')); // 100 ya 1.5 nikal liya

        let offsetPoints = 0;
        
        // 1. Agar Points me hai
        if (strikeCriteria === "ATM pt") {
            offsetPoints = offsetVal;
        } 
        // 2. Agar Percentage (%) me hai
        else if (strikeCriteria === "ATM %") {
            offsetPoints = (atmStrike * offsetVal) / 100;
        }

        // Offset ko round off karo step size ke hisab se (jaise 48 points aaya to 50 kar do)
        const steppedOffset = Math.round(offsetPoints / step) * step;

        // Math Logic: Call me ITM minus hota hai, Put me ITM plus hota hai
        if (type === 'ITM') {
            return isCall ? (atmStrike - steppedOffset) : (atmStrike + steppedOffset);
        } else if (type === 'OTM') {
            return isCall ? (atmStrike + steppedOffset) : (atmStrike - steppedOffset);
        }
    }
    
    // Agar kuch samajh na aaye (Delta, CP wagera jo yahan handle nahi hote), to ATM bhej do
    return atmStrike; 
};

// 🔥 UPDATED FUNCTION: Ab ye Expiry aur Strike Criteria bhi handle karega
const getOptionSecurityId = (baseSymbol, spotPrice, strikeCriteria, strikeType, optionType, requestedExpiry = "WEEKLY") => {
    
    // Naming Translation for Dhan API
    let targetBase = baseSymbol.toUpperCase().replace(' 50', '').trim();
    if (targetBase === "NIFTY BANK") targetBase = "BANKNIFTY";
    else if (targetBase === "NIFTY FIN SERVICE") targetBase = "FINNIFTY";
    else if (targetBase === "NIFTY MID SELECT") targetBase = "MIDCPNIFTY";

    const suffix = ['CE', 'CALL'].includes(optionType.toUpperCase()) ? 'CE' : 'PE';

    // 1. Pehle OTM/ITM ka Math lagakar exact strike dhundo
    const targetStrike = calculateTargetStrike(spotPrice, targetBase, strikeCriteria, strikeType, suffix);
    console.log(`🎯 Calculated Target Strike for ${targetBase} (Spot: ${spotPrice}): ${targetStrike} (${strikeType})`);

    // 2. CSV me matches filter karo
    const matches = nfoInstruments.filter(inst => {
        if (inst.strike !== targetStrike) return false;
        if (inst.id.length > 7) return false; // Block BSE for now (if not Bankex/Sensex)
        const ts = inst.tradingSymbol;
        const cs = inst.customSymbol;
        if (!ts.startsWith(targetBase) && !cs.startsWith(targetBase)) return false;
        if (!ts.endsWith(suffix) && !cs.endsWith(suffix)) return false;
        return true;
    });

    if (matches.length === 0) {
        console.log(`⚠️ Option Token NOT FOUND for: ${targetBase} ${targetStrike} ${suffix}`);
        return null;
    }

    // 3. 🔥 EXPIRY LOGIC 🔥
    // Saari unique expiries nikalo aur date ke hisab se sort karo
    const uniqueExpiries = [...new Set(matches.map(inst => inst.expiry.split(' ')[0]))]
                            .sort((a, b) => new Date(a) - new Date(b));

    let selectedExpiry = uniqueExpiries[0]; // Default: Current Weekly

    if (requestedExpiry === "NEXT WEEKLY" && uniqueExpiries.length > 1) {
        selectedExpiry = uniqueExpiries[1]; // Agle hafte wali
    } 
    else if (requestedExpiry === "MONTHLY") {
        // Current month ki aakhiri expiry dhundo
        const currentMonth = new Date(uniqueExpiries[0]).getMonth();
        const currentMonthExpiries = uniqueExpiries.filter(d => new Date(d).getMonth() === currentMonth);
        selectedExpiry = currentMonthExpiries[currentMonthExpiries.length - 1]; 
        
        // Failsafe: Agar array khali ho jaye
        if (!selectedExpiry) selectedExpiry = uniqueExpiries[uniqueExpiries.length - 1];
    }

    console.log(`📅 Selecting Expiry: ${selectedExpiry} (Requested: ${requestedExpiry})`);

    // 4. Final Data dhundo jo hamari Selected Expiry se match kare
    const finalMatch = matches.find(m => m.expiry.startsWith(selectedExpiry)) || matches[0];

    return {
        id: finalMatch.id,
        exchange: "NSE_FNO", // Yahan BSE ka logic future me add kar sakte hain Sensex ke liye
        tradingSymbol: finalMatch.customSymbol || finalMatch.tradingSymbol,
        expiry: finalMatch.expiry.split(' ')[0],
        optionType: suffix === 'CE' ? 'CALL' : 'PUT',
        strike: finalMatch.strike
    };
};

module.exports = { downloadAndParseInstruments, getOptionSecurityId };