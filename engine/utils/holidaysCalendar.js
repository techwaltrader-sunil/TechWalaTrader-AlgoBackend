// File: engine/utils/holidaysCalendar.js

/**
 * =========================================================
 * 🗓️ CENTRALIZED NSE HOLIDAY CALENDAR (YYYY-MM-DD)
 * =========================================================
 * Note: Add future year holidays here to ensure backtest accuracy
 */
const nseHolidays = [
    // --- 2024 Holidays ---
    "2024-01-26", "2024-03-08", "2024-03-25", "2024-03-29", 
    "2024-04-11", "2024-04-17", "2024-05-01", "2024-06-17", 
    "2024-07-17", "2024-08-15", "2024-10-02", "2024-11-01", 
    "2024-11-15", "2024-12-25",

    // --- 2025 Holidays ---
    "2025-02-26", "2025-03-14", "2025-03-31", "2025-04-10", 
    "2025-04-14", "2025-04-18", "2025-05-01", "2025-08-15", 
    "2025-08-27", "2025-10-02", "2025-10-21", "2025-11-05", 
    "2025-12-25",

    // --- 2026 Holidays ---
    "2026-01-26", "2026-03-03", "2026-03-20", "2026-04-14", 
    "2026-05-01", "2026-08-15", "2026-10-02", "2026-11-08", 
    "2026-12-25"
];

/**
 * Checks if a given Date object falls on a weekend or an NSE holiday
 * @param {Date} dateObj - The date to check
 * @returns {boolean} - true if holiday/weekend, false if working day
 */
const isTradingHoliday = (dateObj) => {
    const dayOfWeek = dateObj.getDay();
    // Check for weekends (Sunday = 0, Saturday = 6)
    if (dayOfWeek === 0 || dayOfWeek === 6) return true; 
    
    // Check for explicit NSE holidays
    const dStr = dateObj.toISOString().split('T')[0];
    return nseHolidays.includes(dStr);
};

module.exports = {
    isTradingHoliday
};