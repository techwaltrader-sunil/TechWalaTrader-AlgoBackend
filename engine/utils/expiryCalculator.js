// // File: engine/utils/expiryCalculator.js

// const { isTradingHoliday } = require('./holidaysCalendar'); // Holiday wali file import kar li

// /**
//  * =========================================================
//  * 🗓️ CENTRALIZED EXPIRY CALCULATOR
//  * =========================================================
//  * SEBI/Exchange rules change frequently. Keep all expiry
//  * logic centralized here so it updates across the entire app.
//  */

// const getNearestExpiryString = (tradeDateStr, symbolStr, reqExpiry = "WEEKLY") => {
//     const d = new Date(tradeDateStr);
//     const upSym = symbolStr.toUpperCase();
//     let expiryDate = new Date(d);

//     // NIFTY को पहचानें
//     const isNifty = upSym.includes("NIFTY") && !upSym.includes("BANK") && !upSym.includes("FIN") && !upSym.includes("MID");
//     const upperReqExpiry = reqExpiry.toUpperCase();

//     // 🔥 CURRENT MASTER RULE: Sabki Expiry Tuesday (2) ko hogi
//     const targetDay = 2; // 0=Sun, 1=Mon, 2=Tuesday, 3=Wed...

//     if (isNifty && upperReqExpiry !== "MONTHLY") {
//         // 🎯 RULE 1: NIFTY Weekly Expiry -> Tuesday
//         while (expiryDate.getDay() !== targetDay) {
//             expiryDate.setDate(expiryDate.getDate() + 1);
//         }
        
//         if (upperReqExpiry === "NEXT WEEKLY" || upperReqExpiry === "NEXT WEEK") {
//             expiryDate.setDate(expiryDate.getDate() + 7);
//         }
//     } else {
//         // 🎯 RULE 2: All Other Indices OR NIFTY Monthly -> Last Tuesday of the Month
//         const lastDayOfMonth = new Date(expiryDate.getFullYear(), expiryDate.getMonth() + 1, 0);
//         expiryDate = new Date(lastDayOfMonth);
        
//         // पीछे जाकर उस महीने का आख़िरी मंगलवार ढूँढें
//         while (expiryDate.getDay() !== targetDay) {
//             expiryDate.setDate(expiryDate.getDate() - 1);
//         }

//         // अगर ट्रेड का दिन इस महीने के आख़िरी मंगलवार के बाद का है, तो अगले महीने का आख़िरी मंगलवार लें
//         if (d > expiryDate) {
//             const lastDayOfNextMonth = new Date(d.getFullYear(), d.getMonth() + 2, 0);
//             expiryDate = new Date(lastDayOfNextMonth);
//             while (expiryDate.getDay() !== targetDay) {
//                 expiryDate.setDate(expiryDate.getDate() - 1);
//             }
//         }
//     }

//     // 🔥 THE MASTER FIX: HOLIDAY EXPIRY SHIFTING
//     // अगर निकाली गई एक्सपायरी डेट को छुट्टी है, तो एक दिन पहले (Working Day) पर खिसका दें
//     while (isTradingHoliday(expiryDate)) {
//         expiryDate.setDate(expiryDate.getDate() - 1);
//     }

//     const formattedDate = `${String(expiryDate.getDate()).padStart(2, '0')}${expiryDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()}${String(expiryDate.getFullYear()).slice(-2)}`;
//     const today = new Date(); 
//     today.setHours(0, 0, 0, 0);
    
//     const expDateForCheck = new Date(expiryDate); 
//     expDateForCheck.setHours(0, 0, 0, 0);

//     return `${(expDateForCheck < today) ? "EXP" : "Upcoming EXP"} ${formattedDate}`;
// };

// module.exports = {
//     getNearestExpiryString
// };



// File: engine/utils/expiryCalculator.js

const { isTradingHoliday } = require('./holidaysCalendar'); // Holiday wali file import kar li

/**
 * =========================================================
 * 🗓️ CENTRALIZED EXPIRY CALCULATOR (TIME MACHINE 3.0)
 * =========================================================
 * SEBI/Exchange rules change frequently. 
 * Includes SEBI Mandate Nov 2024 (Discontinuation of Weekly Options)
 */

// 🔥 1. WEEKLY EXPIRY RULES (Time Machine) 🔥
const WEEKLY_EXPIRY_RULES = {
    "NIFTY": [
        { start: "2000-01-01", end: "2026-02-28", dayOfWeek: 4 }, // Pehle Thursday (4) tha
        { start: "2026-03-01", end: "2099-12-31", dayOfWeek: 2 }  // Ab Tuesday (2) ho gaya hai
    ],
    "BANKNIFTY": [
        { start: "2000-01-01", end: "2023-09-02", dayOfWeek: 4 }, // Pehle Thursday tha
        { start: "2023-09-03", end: "2024-11-13", dayOfWeek: 3 }  // 🔥 SEBI Update: 13 Nov 2024 ko Weekly hamesha ke liye band!
    ],
    "FINNIFTY": [
        { start: "2000-01-01", end: "2024-11-19", dayOfWeek: 2 }  // 🔥 SEBI Update: 19 Nov 2024 ko Weekly band!
    ],
    "MIDCPNIFTY": [
        { start: "2000-01-01", end: "2024-11-18", dayOfWeek: 1 }  // 🔥 SEBI Update: 18 Nov 2024 ko Weekly band!
    ],
    "SENSEX": [
        { start: "2000-01-01", end: "2099-12-31", dayOfWeek: 5 }  // BSE Sensex weekly abhi bhi zinda hai (Friday)
    ]
};

// 🔥 2. MONTHLY EXPIRY RULES (Universal for all NSE instruments) 🔥
const MONTHLY_EXPIRY_RULES = [
    { start: "2000-01-01", end: "2025-08-31", dayOfWeek: 4 }, // Pehle NSE ke sabhi Monthly Last Thursday (4) ko hote the
    { start: "2025-09-01", end: "2099-12-31", dayOfWeek: 2 }  // NSE ne ab sabka Monthly Last Tuesday (2) kar diya hai!
];

// 🧠 Smart function jo WEEKLY expiry day nikalega
function getWeeklyTargetDay(symbol, dateStr) {
    let cleanSymbol = symbol.toUpperCase().replace(' 50', '').replace(' BANK', '').trim();
    if (cleanSymbol === "NIFTY FINANCIAL SERVICES") cleanSymbol = "FINNIFTY";
    if (cleanSymbol === "NIFTY MID SELECT") cleanSymbol = "MIDCPNIFTY";
    if (cleanSymbol === "BSE SENSEX") cleanSymbol = "SENSEX";

    const rules = WEEKLY_EXPIRY_RULES[cleanSymbol] || WEEKLY_EXPIRY_RULES["NIFTY"]; 
    const currentDate = new Date(dateStr);

    for (let rule of rules) {
        if (currentDate >= new Date(rule.start) && currentDate <= new Date(rule.end)) {
            return rule.dayOfWeek;
        }
    }
    return 4; // Default Thursday
}

// 🧠 Smart function jo MONTHLY expiry day nikalega
function getMonthlyTargetDay(symbol, dateStr) {
    let cleanSymbol = symbol.toUpperCase();
    if (cleanSymbol.includes("SENSEX")) return 4; // Sensex monthly Thursday

    const currentDate = new Date(dateStr);
    for (let rule of MONTHLY_EXPIRY_RULES) {
        if (currentDate >= new Date(rule.start) && currentDate <= new Date(rule.end)) {
            return rule.dayOfWeek;
        }
    }
    return 2; // Default Tuesday
}

// 🎯 THE MAIN CALCULATOR ENGINE
const getNearestExpiryString = (tradeDateStr, symbolStr, reqExpiry = "WEEKLY") => {
    const d = new Date(tradeDateStr);
    d.setHours(0, 0, 0, 0);
    let expiryDate = new Date(d);

    let upperReqExpiry = reqExpiry.toUpperCase();
    
    // ====================================================================
    // 🛡️ THE SEBI AUTO-CORRECTOR (Safety Net)
    // Agar user ne galti se discontinued index ka WEEKLY select kar liya hai, 
    // toh engine use error dene ke bajaye automatically MONTHLY me badal dega!
    // ====================================================================
    if (upperReqExpiry !== "MONTHLY") {
        let checkSym = symbolStr.toUpperCase().replace(' 50', '').replace(' BANK', '').trim();
        if (checkSym === "NIFTY FINANCIAL SERVICES") checkSym = "FINNIFTY";
        if (checkSym === "NIFTY MID SELECT") checkSym = "MIDCPNIFTY";
        
        if (checkSym === "BANKNIFTY" && d > new Date("2024-11-13")) upperReqExpiry = "MONTHLY";
        if (checkSym === "FINNIFTY" && d > new Date("2024-11-19")) upperReqExpiry = "MONTHLY";
        if (checkSym === "MIDCPNIFTY" && d > new Date("2024-11-18")) upperReqExpiry = "MONTHLY";
    }

    if (upperReqExpiry !== "MONTHLY") {
        // 🎯 RULE 1: WEEKLY LOGIC (Only runs if legally active)
        const targetDay = getWeeklyTargetDay(symbolStr, tradeDateStr);
        let daysToTarget = targetDay - expiryDate.getDay();
        
        if (daysToTarget < 0) daysToTarget += 7;
        expiryDate.setDate(expiryDate.getDate() + daysToTarget);
        
        if (upperReqExpiry === "NEXT WEEKLY" || upperReqExpiry === "NEXT WEEK") {
            expiryDate.setDate(expiryDate.getDate() + 7);
        }
    } else {
        // 🎯 RULE 2: MONTHLY LOGIC
        const targetDay = getMonthlyTargetDay(symbolStr, tradeDateStr);
        const lastDayOfMonth = new Date(expiryDate.getFullYear(), expiryDate.getMonth() + 1, 0);
        expiryDate = new Date(lastDayOfMonth);
        
        while (expiryDate.getDay() !== targetDay) {
            expiryDate.setDate(expiryDate.getDate() - 1);
        }

        if (d > expiryDate) {
            const lastDayOfNextMonth = new Date(d.getFullYear(), d.getMonth() + 2, 0);
            expiryDate = new Date(lastDayOfNextMonth);
            while (expiryDate.getDay() !== targetDay) {
                expiryDate.setDate(expiryDate.getDate() - 1);
            }
        }
    }

    // 🔥 HOLIDAY SHIFTER
    while (isTradingHoliday(expiryDate) || expiryDate.getDay() === 0 || expiryDate.getDay() === 6) {
        expiryDate.setDate(expiryDate.getDate() - 1);
    }

    const formattedDate = `${String(expiryDate.getDate()).padStart(2, '0')}${expiryDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()}${String(expiryDate.getFullYear()).slice(-2)}`;
    const today = new Date(); 
    today.setHours(0, 0, 0, 0);
    
    return `${(expiryDate < today) ? "EXP" : "Upcoming EXP"} ${formattedDate}`;
};

module.exports = {
    getNearestExpiryString,
};