// ============================================================================
// 🎯 SMC SETUP FINDER (D-OB, E-OB, D-OF, E-OF & Mitigation Tracker)
// ============================================================================

/**
 * 1. Pullback Zone की Mitigation चेक करने का हेल्पर फंक्शन
 */
const isPullbackMitigated = (pullback, candles, idmIndex) => {
    const startIndex = pullback.breakCandleIndex + 1;
    for (let i = startIndex; i <= idmIndex; i++) {
        if (i >= candles.length) break;
        const currentCandle = candles[i];
        if (currentCandle.low <= pullback.confirmHH) {
            return true; 
        }
    }
    return false; 
};

const findMitigationTime = (zoneTop, startIndex, candles) => {
    for (let j = startIndex + 1; j < candles.length; j++) { 
        if (candles[j].low <= zoneTop) return candles[j].timestamp; 
    }
    return candles[candles.length - 1].timestamp;
};

const findMitigationTime_Bearish = (zoneBottomPrice, startIndex, candles) => {
    for (let j = startIndex + 1; j < candles.length; j++) {
        if (candles[j].high >= zoneBottomPrice) return candles[j].timestamp; 
    }
    return candles[candles.length - 1].timestamp;
};

const isOfMitigated = (pb, candles, currentIndex) => {
    const startIdx = pb.breakCandleIndex + 1;
    for (let j = startIdx; j <= currentIndex; j++) {
        if (j >= candles.length) break;
        if (candles[j].low <= pb.confirmHH) return true;
    }
    return false; 
};

const isOfMitigated_Bearish = (pb, candles, currentIndex) => {
    const startIdx = pb.breakCandleIndex + 1;
    for (let j = startIdx; j <= currentIndex; j++) {
        if (j >= candles.length) break;
        if (candles[j].high >= pb.confirmLL) return true;
    }
    return false; 
};

const findValidOrderBlock = (pullback, candles, currentIndex) => {
    const startIdx = pullback.validHLCandleIndex;
    const endIdx = pullback.breakCandleIndex;

    for (let i = startIdx; i <= endIdx; i++) {
        if (i + 2 >= candles.length) continue;

        const firstCandle = candles[i];
        const thirdCandle = candles[i + 2];

        if (firstCandle.high < thirdCandle.low) {
            let isMitigated = false;
            for (let j = i + 3; j <= currentIndex; j++) {
                if (j >= candles.length) break;
                if (candles[j].low <= firstCandle.high) {
                    isMitigated = true;
                    break;
                }
            }

            if (!isMitigated) {
                return {
                    found: true,
                    price: { high: firstCandle.high, low: firstCandle.low }, 
                    fvgZone: { top: thirdCandle.low, bottom: firstCandle.high },
                    startTime: firstCandle.timestamp, 
                    candleIndex: i
                };
            }
        }
    }
    return { found: false };
};

const findBearishValidOrderBlock = (pullback, candles, currentIndex) => {
    const startIdx = pullback.validLHCandleIndex; 
    const endIdx = pullback.breakCandleIndex;

    for (let i = startIdx; i <= endIdx; i++) {
        if (i + 2 >= candles.length) continue;

        const firstCandle = candles[i];
        const thirdCandle = candles[i + 2];

        if (firstCandle.low > thirdCandle.high) {
            let isMitigated = false;
            for (let j = i + 3; j <= currentIndex; j++) {
                if (j >= candles.length) break;
                if (candles[j].high >= firstCandle.low) {
                    isMitigated = true;
                    break;
                }
            }

            if (!isMitigated) {
                return {
                    found: true,
                    price: { top: firstCandle.high, bottom: firstCandle.low },
                    fvgZone: { top: firstCandle.low, bottom: thirdCandle.high },
                    startTime: firstCandle.timestamp,
                    candleIndex: i
                };
            }
        }
    }
    return { found: false };
};

// 🎯 MAIN POI ENGINE FOR BULLISH ZONES
const findSMCZones = (candles, pullbacksArray, currentIndex) => {
    let smcZones = { eof: null, eob: null, dof: null, dob: null };
    if (!pullbacksArray || pullbacksArray.length === 0) return smcZones;

    for (let i = 0; i < pullbacksArray.length; i++) {
        const pb = pullbacksArray[i];
        const obResult = findValidOrderBlock(pb, candles, currentIndex);

        if (obResult.found) {
            const mitigatedOF = isOfMitigated(pb, candles, currentIndex);
            if (pb.id !== "ROOT_SWING_HL") {
                smcZones.eof = { type: "E-OF", top: pb.confirmHH, bottom: pb.validHL, startTime: pb.startTime, isMitigated: mitigatedOF, data: pb };
            }
            smcZones.eob = { type: "E-OB", top: obResult.price.high, bottom: obResult.price.low, startTime: obResult.startTime, fvgTop: obResult.fvgZone.top, fvgBottom: obResult.fvgZone.bottom };
            break;
        }
    }

    for (let i = pullbacksArray.length - 1; i >= 0; i--) {
        const pb = pullbacksArray[i];
        if (smcZones.eof && smcZones.eof.data.id === pb.id) break;

        const obResult = findValidOrderBlock(pb, candles, currentIndex);

        if (obResult.found) {
            if (smcZones.eob && smcZones.eob.startTime === obResult.startTime) continue;
            const mitigatedOF = isOfMitigated(pb, candles, currentIndex);

            if (pb.id !== "ROOT_SWING_HL") {
                smcZones.dof = { type: "D-OF", top: pb.confirmHH, bottom: pb.validHL, startTime: pb.startTime, isMitigated: mitigatedOF, data: pb };
            }
            smcZones.dob = { type: "D-OB", top: obResult.price.high, bottom: obResult.price.low, startTime: obResult.startTime, fvgTop: obResult.fvgZone.top, fvgBottom: obResult.fvgZone.bottom, data: pb };
            break;
        }
    }
    return smcZones;
};

// 🎯 MAIN POI ENGINE FOR BEARISH ZONES
const findSMCZones_Bearish = (candles, pullbacksArray, currentIndex) => {
    let smcZones = { eof: null, eob: null, dof: null, dob: null };
    if (!pullbacksArray || pullbacksArray.length === 0) return smcZones;

    for (let i = 0; i < pullbacksArray.length; i++) {
        const pb = pullbacksArray[i];
        const obResult = findBearishValidOrderBlock(pb, candles, currentIndex);

        if (obResult.found) {
            const mitigatedOF = isOfMitigated_Bearish(pb, candles, currentIndex);
            if (pb.id !== "ROOT_SWING_LH") {
                smcZones.eof = { type: "E-OF", top: pb.validLH, bottom: pb.confirmLL, startTime: pb.startTime, isMitigated: mitigatedOF, data: pb };
            }
            smcZones.eob = { type: "E-OB", top: obResult.price.top, bottom: obResult.price.bottom, startTime: obResult.startTime, fvgTop: obResult.fvgZone.top, fvgBottom: obResult.fvgZone.bottom };
            break;
        }
    }

    for (let i = pullbacksArray.length - 1; i >= 0; i--) {
        const pb = pullbacksArray[i];
        if (smcZones.eof && smcZones.eof.data.id === pb.id) break;

        const obResult = findBearishValidOrderBlock(pb, candles, currentIndex);

        if (obResult.found) {
            if (smcZones.eob && smcZones.eob.startTime === obResult.startTime) continue;
            const mitigatedOF = isOfMitigated_Bearish(pb, candles, currentIndex);

            smcZones.dof = { type: "D-OF", top: pb.validLH, bottom: pb.confirmLL, startTime: pb.startTime, isMitigated: mitigatedOF, data: pb };
            smcZones.dob = { type: "D-OB", top: obResult.price.top, bottom: obResult.price.bottom, startTime: obResult.startTime, fvgTop: obResult.fvgZone.top, fvgBottom: obResult.fvgZone.bottom, data: pb };
            break;
        }
    }
    return smcZones;
};

// फाइल्स को एक्सपोर्ट करें ताकि Scanner इसका इस्तेमाल कर सके
module.exports = {
    findSMCZones,
    findSMCZones_Bearish,
    findMitigationTime,
    findMitigationTime_Bearish,
    isPullbackMitigated
};