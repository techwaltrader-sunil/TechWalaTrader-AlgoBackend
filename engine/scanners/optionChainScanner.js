// File: src/engine/scanners/optionChainScanner.js

// 1. Delta calculate karne ka math
const { calculateBSDelta, getImpliedVolatility } = require('../utils/blackScholes.js');

// 2. 🔥 THE FIX: Live LTP mangane ke liye humara main Dhan Service
const { fetchLiveLTP } = require('../../services/dhanService.js');

// 3. 🔥 THE FIX: Strike aur Option ID nikalne ke liye humara naya Helper
const { getStrikeStep, getOptionSecurityId } = require('../../services/instrumentService.js');

// (Note: Agar 'getImpliedVolatility' ka function aapke paas hai, to usko bhi helpers.js me daal kar yahan import kar lijiye. Agar nahi hai, to engine waise bhi default 0.15 IV use kar lega, isliye koi dikkat nahi hai!)



/**
 * 🔍 LIVE OPTION CHAIN SCANNER (For CP & Delta)
 */
export const findStrikeByLivePremium = async (baseSymbol, currentSpotPrice, optType, requestedExpiry, criteria, targetValue, broker) => {
    try {
        console.log(`🔍 Scanning Live Option Chain for ${baseSymbol} | Target: ${criteria} ${targetValue}`);
        
        const step = getStrikeStep(baseSymbol);
        const atmStrike = Math.round(currentSpotPrice / step) * step;

        // 1. ATM ke aas-paas sirf 13 Strikes ki list banayein (6 ITM, 6 OTM)
        const strikesToCheck = [];
        for (let i = -6; i <= 6; i++) {
            strikesToCheck.push(atmStrike + (i * step));
        }

        // 2. Security ID (Token) nikalein
        const chainTokens = [];
        for (const strike of strikesToCheck) {
            const inst = getOptionSecurityId(baseSymbol, strike, "ATM pt", "ATM", optType, requestedExpiry);
            if (inst) chainTokens.push(inst);
        }

        if (chainTokens.length === 0) return null;

        // 3. 🔥 THE GUARANTEED RATE LIMIT FIX: 1000ms (1 Second) Delay per request
        const liveChain = [];
        for (const inst of chainTokens) {
            try {
                const ltp = await fetchLiveLTP(broker.clientId, broker.apiSecret, inst.exchange, inst.id);
                liveChain.push({ ...inst, ltp: ltp || 0 });
            } catch (err) {
                liveChain.push({ ...inst, ltp: 0 });
            }
            // Dhan API ko lagna chahiye ki manual click ho raha hai
            await new Promise(resolve => setTimeout(resolve, 1000)); 
        }

        const validOptions = liveChain.filter(o => o.ltp > 0);
        if (validOptions.length === 0) {
            console.log("⚠️ Option chain ke live prices nahi mile (Rate Limit or Weekend).");
            return null;
        }

        // 4. User ke Criteria ke hisab se best Strike dhundhein
        let selectedOption = null;
        const targetVal = parseFloat(targetValue);

        if (criteria === 'CP') {
            selectedOption = validOptions.reduce((prev, curr) => Math.abs(curr.ltp - targetVal) < Math.abs(prev.ltp - targetVal) ? curr : prev);
        } 
        else if (criteria === 'CP >=') {
            const filtered = validOptions.filter(o => o.ltp >= targetVal).sort((a, b) => a.ltp - b.ltp);
            selectedOption = filtered.length > 0 ? filtered[0] : null;
        } 
        else if (criteria === 'CP <=') {
            const filtered = validOptions.filter(o => o.ltp <= targetVal).sort((a, b) => b.ltp - a.ltp);
            selectedOption = filtered.length > 0 ? filtered[0] : null;
        }
        else if (criteria === 'Delta') {
            console.log("🧮 Calculating Live Delta using Native Black-Scholes Math...");
            const riskFreeRate = 0.10; 
            const callPutParam = optType.toUpperCase() === 'CE' ? 'call' : 'put';
            const today = new Date();

            const optionsWithDelta = validOptions.map(opt => {
                const expiryDate = new Date(opt.expiry);
                const daysToExpiry = Math.max(0.5, (expiryDate - today) / (1000 * 60 * 60 * 24)); 
                const t = daysToExpiry / 365;
                let iv = 0.15; // Default 15% IV

                try {
                    const calcIv = getImpliedVolatility(opt.ltp, currentSpotPrice, opt.strike, t, riskFreeRate, callPutParam);
                    if (!isNaN(calcIv) && calcIv > 0) iv = calcIv;
                } catch(e) { /* Ignore IV calculation errors */ }

                let delta = calculateBSDelta(currentSpotPrice, opt.strike, t, iv, riskFreeRate, callPutParam);
                return { ...opt, iv, delta: Math.abs(delta), rawDelta: delta };
            });

            selectedOption = optionsWithDelta.reduce((prev, curr) => 
                Math.abs(curr.delta - targetVal) < Math.abs(prev.delta - targetVal) ? curr : prev
            );
            console.log(`✅ Delta Matched! Target: ${targetVal} | Found: ${selectedOption.delta.toFixed(2)} (Strike: ${selectedOption.strike})`);
        }

        if (selectedOption) {
            console.log(`✅ Premium/Delta Matched! Strike: ${selectedOption.strike} ${optType} | LTP: ₹${selectedOption.ltp}`);
            return selectedOption;
        }

        return null;

    } catch (error) {
        console.error("❌ Option Chain Scanner Error:", error.message);
        return null;
    }
};