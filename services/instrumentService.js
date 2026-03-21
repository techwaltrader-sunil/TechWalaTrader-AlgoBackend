// // const axios = require('axios');
// // const csv = require('csv-parser');

// // // Dhan ki daily CSV file ka link
// // const DHAN_CSV_URL = "https://images.dhan.co/api-data/api-scrip-master.csv";

// // // Hum is array me apna sara Options ka data store karenge
// // let nfoInstruments = [];

// // const downloadAndParseInstruments = async () => {
// //     console.log("📥 Downloading Dhan Scrip Master CSV... Please wait.");
    
// //     try {
// //         const response = await axios({
// //             method: 'get',
// //             url: DHAN_CSV_URL,
// //             responseType: 'stream'
// //         });

// //         const tempData = [];

// //         response.data
// //             .pipe(csv())
// //             .on('data', (row) => {
// //                 // Hum sirf NFO (Nifty/BankNifty Options) ka data filter kar rahe hain
// //                 if (row.SEM_EXM_EXCH_ID === 'NFO' && row.SEM_INSTRUMENT_NAME === 'OPTIDX') {
// //                     tempData.push({
// //                         id: row.SEM_SMST_SECURITY_ID,              // Dhan Token ID (e.g., 45879)
// //                         symbol: row.SEM_CUSTOM_SYMBOL,             // NIFTY, BANKNIFTY
// //                         strike: parseFloat(row.SEM_STRIKE_PRICE),  // 47000
// //                         optionType: row.SEM_OPTION_TYPE,           // CE ya PE
// //                         expiry: row.SEM_EXPIRY_DATE,               // Expiry Date string
// //                         tradingSymbol: row.SEM_TRADING_SYMBOL      // BANKNIFTY24APR47000CE
// //                     });
// //                 }
// //             })
// //             .on('end', () => {
// //                 nfoInstruments = tempData;
// //                 console.log(`✅ Dhan CSV Parsed Successfully! Loaded ${nfoInstruments.length} Options contracts.`);
// //             });

// //     } catch (error) {
// //         console.error("❌ Failed to download CSV:", error.message);
// //     }
// // };

// // // Ye function kisi bhi Strike aur Type ke liye ID dhundhega (Sabse kareeb ki expiry wala)
// // const getOptionSecurityId = (symbol, strike, optionType) => {
// //     // 1. Pehle match karo: Symbol, Strike aur CE/PE
// //     const matches = nfoInstruments.filter(inst => 
// //         inst.symbol === symbol && 
// //         inst.strike === parseFloat(strike) && 
// //         inst.optionType === optionType
// //     );

// //     if (matches.length === 0) return null;

// //     // 2. Agar ek se zyada expiry mil rahi hain, to sabse pehli (current week) expiry nikal lo
// //     // CSV me usually expiry sort ho kar aati hai, isliye hum pehla item le sakte hain
// //     return {
// //         id: matches[0].id,
// //         exchange: "NFO", // Options ke liye exchange hamesha NFO hota hai
// //         tradingSymbol: matches[0].tradingSymbol
// //     };
// // };

// // module.exports = { downloadAndParseInstruments, getOptionSecurityId };


// // const axios = require('axios');
// // const csv = require('csv-parser');

// // const DHAN_CSV_URL = "https://images.dhan.co/api-data/api-scrip-master.csv";

// // let nfoInstruments = [];

// // const downloadAndParseInstruments = async () => {
// //     console.log("📥 Downloading Dhan Scrip Master CSV... Please wait.");
    
// //     try {
// //         const response = await axios({
// //             method: 'get',
// //             url: DHAN_CSV_URL,
// //             responseType: 'stream'
// //         });

// //         const tempData = [];

// //         response.data
// //             // 🔥 FIX 1: Headers ke aage-piche ka space hatane ke liye
// //             .pipe(csv({ mapHeaders: ({ header }) => header.trim() })) 
// //             .on('data', (row) => {
// //                 // 🔥 FIX 2: Dhan me Index Options 'OPTIDX' aur Stock Options 'OPTSTK' hote hain
// //                 if (row.SEM_INSTRUMENT_NAME === 'OPTIDX' || row.SEM_INSTRUMENT_NAME === 'OPTSTK') {
// //                     tempData.push({
// //                         id: row.SEM_SMST_SECURITY_ID,              
// //                         symbol: row.SEM_CUSTOM_SYMBOL,             // e.g., BANKNIFTY
// //                         strike: parseFloat(row.SEM_STRIKE_PRICE),  // e.g., 47000
// //                         optionType: row.SEM_OPTION_TYPE,           // CE ya PE
// //                         expiry: row.SEM_EXPIRY_DATE,               
// //                         tradingSymbol: row.SEM_TRADING_SYMBOL      
// //                     });
// //                 }
// //             })
// //             .on('end', () => {
// //                 nfoInstruments = tempData;
// //                 console.log(`✅ Dhan CSV Parsed Successfully! Loaded ${nfoInstruments.length} Options contracts.`);
                
// //                 // Debugging ke liye ek sample print kar lete hain (Baad me hata denge)
// //                 if(nfoInstruments.length > 0) {
// //                     console.log("🔍 Sample Option Data:", nfoInstruments[0]);
// //                 }
// //             });

// //     } catch (error) {
// //         console.error("❌ Failed to download CSV:", error.message);
// //     }
// // };

// // const getOptionSecurityId = (symbol, strike, optionType) => {
// //     const matches = nfoInstruments.filter(inst => 
// //         inst.symbol === symbol && 
// //         inst.strike === parseFloat(strike) && 
// //         inst.optionType === optionType
// //     );

// //     if (matches.length === 0) return null;

// //     return {
// //         id: matches[0].id,
// //         // 🔥 FIX 3: Dhan API me F&O order lagane ke liye exchangeSegment 'NSE_FNO' hota hai
// //         exchange: "NSE_FNO", 
// //         tradingSymbol: matches[0].tradingSymbol
// //     };
// // };

// // module.exports = { downloadAndParseInstruments, getOptionSecurityId };


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
//     const matches = nfoInstruments.filter(inst => 
//         inst.tradingSymbol.startsWith(baseSymbol + '-') && 
//         inst.strike === parseFloat(strike) && 
//         inst.optionType === optionType
//     );

//     if (matches.length === 0) return null;

//     matches.sort((a, b) => new Date(a.expiry) - new Date(b.expiry));

//     // 🔥 THE FIX: Dhan API needs specific formats for F&O 🔥
//     const apiOptionType = matches[0].optionType === 'CE' ? 'CALL' : 'PUT';
//     const apiExpiry = matches[0].expiry.split(' ')[0]; // '2026-02-26 14:30:00' me se '2026-02-26' nikalna

//     return {
//         id: matches[0].id,
//         exchange: matches[0].exchange, 
//         tradingSymbol: matches[0].tradingSymbol,
//         expiry: apiExpiry,       // Yahan se Date jayegi
//         optionType: apiOptionType, // Yahan se CALL/PUT jayega
//         strike: matches[0].strike  // Yahan se Strike Price jayega
//     };
// };

// module.exports = { downloadAndParseInstruments, getOptionSecurityId };




// const axios = require('axios');
// const csv = require('csv-parser');

// // Dhan ki daily CSV file ka link
// const DHAN_CSV_URL = "https://images.dhan.co/api-data/api-scrip-master.csv";

// // Hum is array me apna sara Options ka data store karenge
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
//             .pipe(csv())
//             .on('data', (row) => {
//                 // Hum sirf NFO (Nifty/BankNifty Options) ka data filter kar rahe hain
//                 if (row.SEM_EXM_EXCH_ID === 'NFO' && row.SEM_INSTRUMENT_NAME === 'OPTIDX') {
//                     tempData.push({
//                         id: row.SEM_SMST_SECURITY_ID,              // Dhan Token ID (e.g., 45879)
//                         symbol: row.SEM_CUSTOM_SYMBOL,             // NIFTY, BANKNIFTY
//                         strike: parseFloat(row.SEM_STRIKE_PRICE),  // 47000
//                         optionType: row.SEM_OPTION_TYPE,           // CE ya PE
//                         expiry: row.SEM_EXPIRY_DATE,               // Expiry Date string
//                         tradingSymbol: row.SEM_TRADING_SYMBOL      // BANKNIFTY24APR47000CE
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

// // Ye function kisi bhi Strike aur Type ke liye ID dhundhega (Sabse kareeb ki expiry wala)
// const getOptionSecurityId = (symbol, strike, optionType) => {
//     // 1. Pehle match karo: Symbol, Strike aur CE/PE
//     const matches = nfoInstruments.filter(inst => 
//         inst.symbol === symbol && 
//         inst.strike === parseFloat(strike) && 
//         inst.optionType === optionType
//     );

//     if (matches.length === 0) return null;

//     // 2. Agar ek se zyada expiry mil rahi hain, to sabse pehli (current week) expiry nikal lo
//     // CSV me usually expiry sort ho kar aati hai, isliye hum pehla item le sakte hain
//     return {
//         id: matches[0].id,
//         exchange: "NFO", // Options ke liye exchange hamesha NFO hota hai
//         tradingSymbol: matches[0].tradingSymbol
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
//             // 🔥 FIX 1: Headers ke aage-piche ka space hatane ke liye
//             .pipe(csv({ mapHeaders: ({ header }) => header.trim() })) 
//             .on('data', (row) => {
//                 // 🔥 FIX 2: Dhan me Index Options 'OPTIDX' aur Stock Options 'OPTSTK' hote hain
//                 if (row.SEM_INSTRUMENT_NAME === 'OPTIDX' || row.SEM_INSTRUMENT_NAME === 'OPTSTK') {
//                     tempData.push({
//                         id: row.SEM_SMST_SECURITY_ID,              
//                         symbol: row.SEM_CUSTOM_SYMBOL,             // e.g., BANKNIFTY
//                         strike: parseFloat(row.SEM_STRIKE_PRICE),  // e.g., 47000
//                         optionType: row.SEM_OPTION_TYPE,           // CE ya PE
//                         expiry: row.SEM_EXPIRY_DATE,               
//                         tradingSymbol: row.SEM_TRADING_SYMBOL      
//                     });
//                 }
//             })
//             .on('end', () => {
//                 nfoInstruments = tempData;
//                 console.log(`✅ Dhan CSV Parsed Successfully! Loaded ${nfoInstruments.length} Options contracts.`);
                
//                 // Debugging ke liye ek sample print kar lete hain (Baad me hata denge)
//                 if(nfoInstruments.length > 0) {
//                     console.log("🔍 Sample Option Data:", nfoInstruments[0]);
//                 }
//             });

//     } catch (error) {
//         console.error("❌ Failed to download CSV:", error.message);
//     }
// };

// const getOptionSecurityId = (symbol, strike, optionType) => {
//     const matches = nfoInstruments.filter(inst => 
//         inst.symbol === symbol && 
//         inst.strike === parseFloat(strike) && 
//         inst.optionType === optionType
//     );

//     if (matches.length === 0) return null;

//     return {
//         id: matches[0].id,
//         // 🔥 FIX 3: Dhan API me F&O order lagane ke liye exchangeSegment 'NSE_FNO' hota hai
//         exchange: "NSE_FNO", 
//         tradingSymbol: matches[0].tradingSymbol
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
        const response = await axios({
            method: 'get',
            url: DHAN_CSV_URL,
            responseType: 'stream'
        });

        const tempData = [];

        response.data
            .pipe(csv({ mapHeaders: ({ header }) => header.trim() })) 
            .on('data', (row) => {
                const instName = (row.SEM_INSTRUMENT_NAME || "").trim();
                
                if (instName === 'OPTIDX' || instName === 'OPTSTK') {
                    
                    let rawExchange = (row.SEM_EXM_EXCH_ID || "").trim().toUpperCase();
                    let mappedExchange = "NSE_FNO"; 
                    
                    if (rawExchange.includes('BSE') || rawExchange === 'BFO') {
                        mappedExchange = 'BSE_FNO'; 
                    }

                    tempData.push({
                        id: (row.SEM_SMST_SECURITY_ID || "").trim(),              
                        symbol: (row.SEM_CUSTOM_SYMBOL || "").trim(),             
                        strike: parseFloat(row.SEM_STRIKE_PRICE),  
                        optionType: (row.SEM_OPTION_TYPE || "").trim(),           
                        expiry: (row.SEM_EXPIRY_DATE || "").trim(),               
                        tradingSymbol: (row.SEM_TRADING_SYMBOL || "").trim(),
                        exchange: mappedExchange 
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

const getOptionSecurityId = (baseSymbol, strike, optionType) => {
    const matches = nfoInstruments.filter(inst => 
        inst.symbol === baseSymbol && // 🔥 THE FIX: Yahan direct symbol match karo
        inst.strike === parseFloat(strike) && 
        inst.optionType === optionType
    );

    if (matches.length === 0) return null;

    matches.sort((a, b) => new Date(a.expiry) - new Date(b.expiry));

    const apiOptionType = matches[0].optionType === 'CE' ? 'CALL' : 'PUT';
    const apiExpiry = matches[0].expiry.split(' ')[0]; 

    return {
        id: matches[0].id,
        exchange: matches[0].exchange, 
        tradingSymbol: matches[0].tradingSymbol,
        expiry: apiExpiry,       
        optionType: apiOptionType, 
        strike: matches[0].strike  
    };
};

module.exports = { downloadAndParseInstruments, getOptionSecurityId };