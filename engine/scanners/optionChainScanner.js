// File: src/engine/scanners/optionChainScanner.js

// 1. Delta calculate karne ka math
const { calculateBSDelta, getImpliedVolatility } = require('../utils/blackScholes.js');

// 2. Live LTP mangane ke liye humara main Dhan Service
const { fetchLiveLTP } = require('../../services/dhanService.js');

// 3. Strike aur Option ID nikalne ke liye humara naya Helper
const { getStrikeStep, getOptionSecurityId } = require('../../services/instrumentService.js');

/**
 * 🔍 LIVE OPTION CHAIN SCANNER (For CP & Delta)
 */
const findStrikeByLivePremium = async (baseSymbol, currentSpotPrice, optType, requestedExpiry, criteria, targetValue, broker) => {
    try {
        console.log(`🔍 Scanning Live Option Chain for ${baseSymbol} | Target: ${criteria} ₹${targetValue.toFixed(2)}`);
        
        const step = getStrikeStep(baseSymbol);
        const atmStrike = Math.round(currentSpotPrice / step) * step;

        const strikesToCheck = [];
        // 🔥 THE OPTIMIZATION FIX: API calls कम करने के लिए सिर्फ काम की स्ट्राइक्स निकालें
        if (optType.toUpperCase() === 'CE') {
            for (let i = 0; i <= 15; i++) strikesToCheck.push(atmStrike + (i * step)); // ATM से OTM CE
        } else {
            for (let i = 0; i >= -15; i--) strikesToCheck.push(atmStrike + (i * step)); // ATM से OTM PE
        }

        // Security ID (Token) nikalein
        const chainTokens = [];
        for (const strike of strikesToCheck) {
            const inst = getOptionSecurityId(baseSymbol, strike, "ATM pt", "ATM", optType, requestedExpiry);
            if (inst) chainTokens.push(inst);
        }

        if (chainTokens.length === 0) return null;

        // 🔥 THE GUARANTEED RATE LIMIT FIX: 1000ms (1 Second) Delay per request
        const liveChain = [];
        for (const inst of chainTokens) {
            try {
                const ltp = await fetchLiveLTP(broker.clientId, broker.apiSecret, inst.exchange, inst.id);
                liveChain.push({ ...inst, ltp: ltp || 0 });
            } catch (err) {
                liveChain.push({ ...inst, ltp: 0 });
            }
            await new Promise(resolve => setTimeout(resolve, 1000)); 
        }

        const validOptions = liveChain.filter(o => o.ltp > 0);
        if (validOptions.length === 0) {
            console.log("⚠️ Option chain ke live prices nahi mile (Rate Limit or Weekend).");
            return null;
        }

        // User ke Criteria ke hisab se best Strike dhundhein
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
                let iv = 0.15; 

                try {
                    const calcIv = getImpliedVolatility(opt.ltp, currentSpotPrice, opt.strike, t, riskFreeRate, callPutParam);
                    if (!isNaN(calcIv) && calcIv > 0) iv = calcIv;
                } catch(e) { }

                let delta = calculateBSDelta(currentSpotPrice, opt.strike, t, iv, riskFreeRate, callPutParam);
                return { ...opt, iv, delta: Math.abs(delta), rawDelta: delta };
            });

            selectedOption = optionsWithDelta.reduce((prev, curr) => 
                Math.abs(curr.delta - targetVal) < Math.abs(prev.delta - targetVal) ? curr : prev
            );
        }

        if (selectedOption) {
            console.log(`✅ Nearest Strike Found! Strike: ${selectedOption.strike} ${optType} | LTP: ₹${selectedOption.ltp}`);
            return selectedOption;
        }

        return null;

    } catch (error) {
        console.error("❌ Option Chain Scanner Error:", error.message);
        return null;
    }
};

/**
 * 🦇 CHANCHAL BHAI'S RATIO SPREAD SCANNER (Premium Divisor & Distance Asymmetry Fix)
 */
const findOptimalStrikes = async (baseSymbol, currentSpotPrice, requestedExpiry, divisor, baseLots, broker) => {
    try {
        console.log(`\n======================================================`);
        console.log(`🦇 Starting Time-Based Strategy Scan: ${baseSymbol}`);
        console.log(`🎯 Divisor: ${divisor} | Base Lots: ${baseLots} | Spot: ${currentSpotPrice}`);
        console.log(`======================================================`);

        const step = getStrikeStep(baseSymbol);
        const atmStrike = Math.round(currentSpotPrice / step) * step;

        // 1. Fetch ATM CE and PE tokens
        const atmCeInst = getOptionSecurityId(baseSymbol, atmStrike, "ATM pt", "ATM", "CE", requestedExpiry);
        const atmPeInst = getOptionSecurityId(baseSymbol, atmStrike, "ATM pt", "ATM", "PE", requestedExpiry);

        if (!atmCeInst || !atmPeInst) return null;

        console.log(`Fetching live prices for ATM Strike: ${atmStrike}...`);
        const atmCeLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, atmCeInst.exchange, atmCeInst.id) || 0;
        await new Promise(resolve => setTimeout(resolve, 1000)); 
        const atmPeLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, atmPeInst.exchange, atmPeInst.id) || 0;
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (atmCeLtp === 0 || atmPeLtp === 0) {
            console.log("❌ Failed to fetch ATM live premiums.");
            return null;
        }

        // 2. Calculate Target Premiums (Premium / 4)
        const targetCePremium = atmCeLtp / divisor;
        const targetPePremium = atmPeLtp / divisor;

        console.log(`✅ ATM CE: ₹${atmCeLtp} -> Target OTM CE Premium: ₹${targetCePremium.toFixed(2)}`);
        console.log(`✅ ATM PE: ₹${atmPeLtp} -> Target OTM PE Premium: ₹${targetPePremium.toFixed(2)}`);

        // 3. Find Best OTM Strikes that match Target Premiums
        console.log(`\n🔍 Searching for Best Match OTM CE...`);
        const otmCeOpt = await findStrikeByLivePremium(baseSymbol, currentSpotPrice, 'CE', requestedExpiry, 'CP', targetCePremium, broker);
        
        console.log(`\n🔍 Searching for Best Match OTM PE...`);
        const otmPeOpt = await findStrikeByLivePremium(baseSymbol, currentSpotPrice, 'PE', requestedExpiry, 'CP', targetPePremium, broker);

        if (!otmCeOpt || !otmPeOpt) {
            console.log("❌ Failed to find matching OTM strikes.");
            return null;
        }

        // 4. 🔥 THE TWIST: Distance Asymmetry Rule 🔥
        const distCE = Math.abs(otmCeOpt.strike - atmStrike);
        const distPE = Math.abs(otmPeOpt.strike - atmStrike);

        let sellLotsCE = baseLots;
        let sellLotsPE = baseLots;

        if (distCE !== distPE) {
            console.log(`\n⚖️ Asymmetry Detected! Distance CE: ${distCE} | Distance PE: ${distPE}`);
            if (distCE > distPE) {
                // CE ज़्यादा दूर है, PE पास है -> PE के लॉट कम करो
                sellLotsPE = Math.round((distPE / distCE) * baseLots);
                console.log(`📉 PE is closer. Adjusting PE Lots: (${distPE}/${distCE}) * ${baseLots} = ${sellLotsPE}`);
            } else {
                // PE ज़्यादा दूर है, CE पास है -> CE के लॉट कम करो
                sellLotsCE = Math.round((distCE / distPE) * baseLots);
                console.log(`📉 CE is closer. Adjusting CE Lots: (${distCE}/${distPE}) * ${baseLots} = ${sellLotsCE}`);
            }
        }

        // सेफगार्ड: कम से कम 1 लॉट तो होना ही चाहिए
        sellLotsCE = Math.max(1, sellLotsCE);
        sellLotsPE = Math.max(1, sellLotsPE);

        console.log(`\n🔥 FINAL STRATEGY LEGS 🔥`);
        console.log(`[BUY]  ATM CE: Strike ${atmStrike} | Qty: 1 lot | Price: ₹${atmCeLtp}`);
        console.log(`[BUY]  ATM PE: Strike ${atmStrike} | Qty: 1 lot | Price: ₹${atmPeLtp}`);
        console.log(`[SELL] OTM CE: Strike ${otmCeOpt.strike} | Qty: ${sellLotsCE} lots | Price: ₹${otmCeOpt.ltp} | Distance: ${distCE}`);
        console.log(`[SELL] OTM PE: Strike ${otmPeOpt.strike} | Qty: ${sellLotsPE} lots | Price: ₹${otmPeOpt.ltp} | Distance: ${distPE}\n`);

        return {
            atmStrike,
            buyLegCE: { strike: atmStrike, type: 'CE', ltp: atmCeLtp, lots: 1, action: 'BUY', inst: atmCeInst },
            buyLegPE: { strike: atmStrike, type: 'PE', ltp: atmPeLtp, lots: 1, action: 'BUY', inst: atmPeInst },
            sellLegCE: { strike: otmCeOpt.strike, type: 'CE', ltp: otmCeOpt.ltp, lots: sellLotsCE, action: 'SELL', distance: distCE, inst: otmCeOpt },
            sellLegPE: { strike: otmPeOpt.strike, type: 'PE', ltp: otmPeOpt.ltp, lots: sellLotsPE, action: 'SELL', distance: distPE, inst: otmPeOpt }
        };

    } catch (error) {
        console.error("❌ findOptimalStrikes Error:", error.message);
        return null;
    }
};

module.exports = {
    findStrikeByLivePremium,
    findOptimalStrikes
};