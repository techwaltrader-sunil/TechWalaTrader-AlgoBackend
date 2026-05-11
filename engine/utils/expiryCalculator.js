// File: engine/utils/expiryCalculator.js

const { isTradingHoliday } = require('./holidaysCalendar'); // Holiday wali file import kar li

/**
 * =========================================================
 * 🗓️ CENTRALIZED EXPIRY CALCULATOR
 * =========================================================
 * SEBI/Exchange rules change frequently. Keep all expiry
 * logic centralized here so it updates across the entire app.
 */

const getNearestExpiryString = (tradeDateStr, symbolStr, reqExpiry = "WEEKLY") => {
    const d = new Date(tradeDateStr);
    const upSym = symbolStr.toUpperCase();
    let expiryDate = new Date(d);

    // NIFTY को पहचानें
    const isNifty = upSym.includes("NIFTY") && !upSym.includes("BANK") && !upSym.includes("FIN") && !upSym.includes("MID");
    const upperReqExpiry = reqExpiry.toUpperCase();

    // 🔥 CURRENT MASTER RULE: Sabki Expiry Tuesday (2) ko hogi
    const targetDay = 2; // 0=Sun, 1=Mon, 2=Tuesday, 3=Wed...

    if (isNifty && upperReqExpiry !== "MONTHLY") {
        // 🎯 RULE 1: NIFTY Weekly Expiry -> Tuesday
        while (expiryDate.getDay() !== targetDay) {
            expiryDate.setDate(expiryDate.getDate() + 1);
        }
        
        if (upperReqExpiry === "NEXT WEEKLY" || upperReqExpiry === "NEXT WEEK") {
            expiryDate.setDate(expiryDate.getDate() + 7);
        }
    } else {
        // 🎯 RULE 2: All Other Indices OR NIFTY Monthly -> Last Tuesday of the Month
        const lastDayOfMonth = new Date(expiryDate.getFullYear(), expiryDate.getMonth() + 1, 0);
        expiryDate = new Date(lastDayOfMonth);
        
        // पीछे जाकर उस महीने का आख़िरी मंगलवार ढूँढें
        while (expiryDate.getDay() !== targetDay) {
            expiryDate.setDate(expiryDate.getDate() - 1);
        }

        // अगर ट्रेड का दिन इस महीने के आख़िरी मंगलवार के बाद का है, तो अगले महीने का आख़िरी मंगलवार लें
        if (d > expiryDate) {
            const lastDayOfNextMonth = new Date(d.getFullYear(), d.getMonth() + 2, 0);
            expiryDate = new Date(lastDayOfNextMonth);
            while (expiryDate.getDay() !== targetDay) {
                expiryDate.setDate(expiryDate.getDate() - 1);
            }
        }
    }

    // 🔥 THE MASTER FIX: HOLIDAY EXPIRY SHIFTING
    // अगर निकाली गई एक्सपायरी डेट को छुट्टी है, तो एक दिन पहले (Working Day) पर खिसका दें
    while (isTradingHoliday(expiryDate)) {
        expiryDate.setDate(expiryDate.getDate() - 1);
    }

    const formattedDate = `${String(expiryDate.getDate()).padStart(2, '0')}${expiryDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()}${String(expiryDate.getFullYear()).slice(-2)}`;
    const today = new Date(); 
    today.setHours(0, 0, 0, 0);
    
    const expDateForCheck = new Date(expiryDate); 
    expDateForCheck.setHours(0, 0, 0, 0);

    return `${(expDateForCheck < today) ? "EXP" : "Upcoming EXP"} ${formattedDate}`;
};

module.exports = {
    getNearestExpiryString
};