

const identifyMechanicalStructure = (candles, startingTrend = "AUTO") => {

    // 🔥 2. User Input के हिसाब से Initial Trend सेट करें
    let trend = 0;
    if (startingTrend === "BULLISH") trend = 1;
    else if (startingTrend === "BEARISH") trend = -1;
    else {
        // AUTO Mode: बेसिक शुरुआत (आगे जाकर Smart Auto इसे फिक्स कर लेगा)
        trend = candles.length > 5 ? (candles[5].close > candles[0].close ? 1 : -1) : 1;
    }


    let signals = [];
    if (candles.length === 0) return signals;

    let refCandle = candles[0];

    // ==========================================
    // 📉 BEARISH STATE VARIABLES
    // ==========================================
    let refLL = null;
    let tempLH = null;
    let confirmedLH = null;
    let validLL = null;
    let tempSwingHigh = null;
    let lockedSwingHigh = null;
    let absoluteLowest = { price: candles[0].low, time: candles[0].timestamp };

    // 🔥 Liquidity Sweep (X) Variables
    let refX_BOS_Bearish = null;
    let majorIdm_Bearish = { price: -Infinity, time: null };
    let refX_CHoCH_Bearish = null;

    // ==========================================
    // 📈 BULLISH STATE VARIABLES
    // ==========================================
    let refHH = null;
    let tempHL = null;
    let confirmedHL = null;
    let validHH = null;

    let tempSwingLow = null;
    let lockedSwingLow = null;
    let absoluteHighest = { price: candles[0].high, time: candles[0].timestamp };

    // 🔥 NAYA CODE: Pullbacks Store करने के लिए
    let bullishPullbacks = [];
    let tempPullbackTracker = null;

    // 🔥 Liquidity Sweep (X) Variables
    let refX_BOS_Bullish = null;
    let majorIdm_Bullish = { price: Infinity, time: null };
    let refX_CHoCH_Bullish = null;

    let isIdmTaken = false;

    let current_bullish_structure = [];
    let previous_bullish_structure = [];
    

    for (let i = 1; i < candles.length; i++) {
        const curr = candles[i];

        const prevAbsoluteHighest = absoluteHighest.price;
        const prevAbsoluteLowest = absoluteLowest.price;

        // अब नया हाई/लो अपडेट करें
        if (curr.low < absoluteLowest.price) absoluteLowest = { price: curr.low, time: curr.timestamp };
        if (curr.high > absoluteHighest.price) absoluteHighest = { price: curr.high, time: curr.timestamp };

        let isInsideBar = curr.high <= refCandle.high && curr.low >= refCandle.low;
        let isOutsideBar = curr.high > refCandle.high && curr.low < refCandle.low;

        if (isInsideBar) continue;

        let brokeHigh = curr.high > refCandle.high;
        let brokeLow = curr.low < refCandle.low;

        // ==========================================
        // 📉 BEARISH STRUCTURE LOGIC (-1)
        // ==========================================
        if (trend === -1) {

            // 🔥 SMART AUTO FIX (यहाँ सबसे ऊपर रहेगा!): 
            // अगर कोई BOS नहीं हुआ है और मार्केट ने शुरुआत वाले टॉप को तोड़ दिया है
            if (startingTrend === "AUTO" && lockedSwingHigh === null && curr.close > prevAbsoluteHighest) {
                trend = 1;
                isIdmTaken = false;
                validLL = null; refLL = null; tempSwingHigh = null; confirmedLH = null;
                absoluteLowest = { price: curr.low, time: curr.timestamp }; // नई शुरुआत के लिए बॉटम सेट करें
                refCandle = curr;
                continue;
            }

            if (isIdmTaken) {
                if (curr.high > majorIdm_Bearish.price) majorIdm_Bearish = { price: curr.high, time: curr.timestamp };
            }

            // RULE 5 & 6c: CHoCH & Sweep Logic
            if (lockedSwingHigh !== null) {
                // इंजन चेक करने के लिए sweep level (breakLevel) यूज़ करेगा
                let breakLevel = refX_CHoCH_Bearish ? refX_CHoCH_Bearish.price : lockedSwingHigh.price;

                if (curr.high > breakLevel) {
                    if (curr.close > breakLevel) { // 🚀 Full Body Break (Valid CHoCH)

                        // 🔥 VISUAL FIX: लाइन हमेशा ओरिजिनल 'lockedSwingHigh' से ही ड्रा होगी!
                        signals.push({
                            type: "CHoCH", trend: "BULLISH",
                            sweptSide: "HIGH",
                            price: lockedSwingHigh.price,      // <-- Original Price
                            startTime: lockedSwingHigh.time,   // <-- Original Time
                            endTime: curr.timestamp
                        });

                        trend = 1;
                        isIdmTaken = false;
                        lockedSwingLow = { ...absoluteLowest };
                        validLL = null; refLL = null; tempSwingHigh = null; lockedSwingHigh = null; confirmedLH = null;
                        refX_CHoCH_Bearish = null; refX_BOS_Bearish = null;
                        absoluteHighest = { price: curr.high, time: curr.timestamp };
                        refCandle = curr;
                        continue;
                    } else { // 🧹 Sweep (Ref X)
                        refX_CHoCH_Bearish = { price: curr.high, time: curr.timestamp };
                    }
                }
            }

            // ... (PULLBACK और IDM का लॉजिक वही रहेगा) ...
            if (brokeHigh && !isOutsideBar && refLL === null && !isIdmTaken) {
                refLL = { price: refCandle.low, time: refCandle.timestamp };
                tempLH = { price: curr.high, time: curr.timestamp };
            } else if (refLL !== null && !isIdmTaken) {
                if (curr.high > tempLH.price) tempLH = { price: curr.high, time: curr.timestamp };
                if (curr.low <= refLL.price) { confirmedLH = tempLH; refLL = null; }
            }

            if (confirmedLH !== null && curr.high >= confirmedLH.price && !isIdmTaken) {
                isIdmTaken = true;
                validLL = { ...absoluteLowest };
                tempSwingHigh = { price: curr.high, time: curr.timestamp };
                majorIdm_Bearish = { price: curr.high, time: curr.timestamp };
                signals.push({ type: "IDM", trend: "BEARISH", price: confirmedLH.price, startTime: confirmedLH.time, endTime: curr.timestamp });
                confirmedLH = null;
            }

            if (isIdmTaken && curr.high > tempSwingHigh.price) {
                tempSwingHigh = { price: curr.high, time: curr.timestamp };
            }

            // RULE 3 & 6a: BOS & Sweep Logic
            if (isIdmTaken && validLL !== null) {
                let breakLevel = refX_BOS_Bearish ? refX_BOS_Bearish.price : validLL.price;

                if (curr.low < breakLevel) {
                    if (curr.close < breakLevel) { // 🚀 Full Body Break (Valid BOS)

                        // 🔥 VISUAL FIX: लाइन हमेशा ओरिजिनल 'validLL' से ही ड्रा होगी!
                        signals.push({
                            type: "BOS", trend: "BEARISH",
                            price: validLL.price,        // <-- Original Price
                            startTime: validLL.time,     // <-- Original Time
                            endTime: curr.timestamp
                        });

                        if (refX_CHoCH_Bearish) {
                            signals.push({ type: "X", trend: "BEARISH", price: lockedSwingHigh.price, startTime: lockedSwingHigh.time, endTime: refX_CHoCH_Bearish.time });
                            refX_CHoCH_Bearish = null;
                        }

                        lockedSwingHigh = { ...tempSwingHigh };
                        isIdmTaken = false;
                        validLL = null; refLL = null; refX_BOS_Bearish = null;
                        absoluteLowest = { price: curr.low, time: curr.timestamp };
                    } else { // 🧹 Sweep (Ref X)
                        refX_BOS_Bearish = { price: curr.low, time: curr.timestamp, majorIdmTarget: { ...majorIdm_Bearish } };
                    }
                }

                if (refX_BOS_Bearish && refX_BOS_Bearish.majorIdmTarget) {
                    if (curr.high > refX_BOS_Bearish.majorIdmTarget.price) {
                        signals.push({ type: "IDM", trend: "BEARISH", price: refX_BOS_Bearish.majorIdmTarget.price, startTime: refX_BOS_Bearish.majorIdmTarget.time, endTime: curr.timestamp });

                        signals.push({ type: "X", trend: "BEARISH", sweptSide: "LOW", price: validLL.price, startTime: validLL.time, endTime: refX_BOS_Bearish.time }); // <-- यहाँ बदलाव है

                        validLL = { price: refX_BOS_Bearish.price, time: refX_BOS_Bearish.time };
                        refX_BOS_Bearish = null;
                        majorIdm_Bearish = { price: curr.high, time: curr.timestamp };
                    }
                }
            }
        }

        // ==========================================
        // 📈 BULLISH STRUCTURE LOGIC (1)
        // ==========================================
        else if (trend === 1) {

            // 🔥 SMART AUTO FIX (यहाँ सबसे ऊपर रहेगा!): 
            // अगर कोई BOS नहीं हुआ है और मार्केट क्रैश होकर एकदम बॉटम को तोड़ दे
            if (startingTrend === "AUTO" && lockedSwingLow === null && curr.close < prevAbsoluteLowest) {
                trend = -1;
                isIdmTaken = false;
                validHH = null; refHH = null; tempSwingLow = null; confirmedHL = null;

                bullishPullbacks = [];
                tempPullbackTracker = null;

                absoluteHighest = { price: curr.high, time: curr.timestamp }; // नई शुरुआत के लिए टॉप सेट करें
                refCandle = curr;
                continue;
            }

            if (isIdmTaken) {
                if (curr.low < majorIdm_Bullish.price) majorIdm_Bullish = { price: curr.low, time: curr.timestamp };
            }

            // RULE 5 & 6c: CHoCH & Sweep Logic
            if (lockedSwingLow !== null) {
                let breakLevel = refX_CHoCH_Bullish ? refX_CHoCH_Bullish.price : lockedSwingLow.price;

                if (curr.low < breakLevel) {
                    if (curr.close < breakLevel) { // 🚀 Full Body Break

                        // 🔥 VISUAL FIX: लाइन हमेशा ओरिजिनल 'lockedSwingLow' से ही ड्रा होगी!
                        signals.push({
                            type: "CHoCH", trend: "BEARISH",
                            price: lockedSwingLow.price,     // <-- Original Price
                            startTime: lockedSwingLow.time,  // <-- Original Time
                            endTime: curr.timestamp
                        });

                        trend = -1;
                        isIdmTaken = false;
                        lockedSwingHigh = { ...absoluteHighest };
                        validHH = null; refHH = null; tempSwingLow = null; lockedSwingLow = null; confirmedHL = null;
                        refX_CHoCH_Bullish = null; refX_BOS_Bullish = null;

                        bullishPullbacks = [];
                        tempPullbackTracker = null;

                        absoluteLowest = { price: curr.low, time: curr.timestamp };
                        refCandle = curr;
                        continue;
                    } else { // 🧹 Sweep (Ref X)
                        refX_CHoCH_Bullish = { price: curr.low, time: curr.timestamp };
                    }
                }
            }

            // ==========================================================
            // 🔥 BULLETPROOF PULLBACK TRACKER (The Smart Engulfing Fix)
            // ==========================================================
            if (brokeLow && !isOutsideBar && refHH === null) { 
                refHH = { price: refCandle.high, time: refCandle.timestamp };
                tempHL = { price: curr.low, time: curr.timestamp };
                
                tempPullbackTracker = {
                    id: bullishPullbacks.length + 1,
                    confirmHH: refCandle.high,
                    confirmHHCandleIndex: i - 1, 
                    validHL: curr.low,
                    validHLCandleIndex: i, 
                    startTime: refCandle.timestamp
                };
            } else if (refHH !== null) { 
                if (curr.low < tempHL.price) {
                    tempHL = { price: curr.low, time: curr.timestamp };
                    if (tempPullbackTracker) {
                        tempPullbackTracker.validHL = curr.low;
                        tempPullbackTracker.validHLCandleIndex = i;
                    }
                }
                
                if (curr.high >= refHH.price) { 
                    // ==================================================
                    // 🔥 THE SMART ENGULFING FIX (1-Candle Sweep Filter)
                    // ==================================================
                    // अगर जो कैंडल हाई (refHH) को ब्रेक कर रही है, उसी कैंडल ने 
                    // इस पुलबैक का सबसे निचला लो (Lowest Low) भी बनाया है 
                    // (यानी curr.timestamp === tempHL.time), तो इसका मतलब है कि 
                    // यह एक 'राक्षस कैंडल' है जिसने बॉटम और टॉप दोनों एक साथ खा लिए।
                    // इसे फेक पुलबैक मानकर डिलीट कर देंगे!
                    
                    if (curr.timestamp === tempHL.time) {
                        // ❌ Fake Engulfing Pullback (Discard)
                        refHH = null; 
                        tempPullbackTracker = null; 
                    } else {
                        // ✅ Valid Pullback (Confirm)
                        confirmedHL = tempHL; 
                        refHH = null; 
                        
                        if (tempPullbackTracker) {
                            tempPullbackTracker.breakCandleIndex = i;
                            bullishPullbacks.push({...tempPullbackTracker});
                            tempPullbackTracker = null; 
                        }
                    }
                }
            }

            if (confirmedHL !== null && curr.low <= confirmedHL.price && !isIdmTaken) {
                isIdmTaken = true;
                validHH = { ...absoluteHighest };
                tempSwingLow = { price: curr.low, time: curr.timestamp };
                majorIdm_Bullish = { price: curr.low, time: curr.timestamp };
                signals.push({ type: "IDM", trend: "BULLISH", price: confirmedHL.price, startTime: confirmedHL.time, endTime: curr.timestamp });

                // ==========================================================
                // 🔥 THE ROOT EXTREME FIX (Null Crash Fix)
                // ==========================================================
                
                // 1. सेफ़्टी चेक: अगर पहली लहर (First Wave) है और lockedSwingLow अभी null है, 
                // तो इंजन बॉटम के लिए absoluteLowest का यूज़ करेगा!
                const rootTime = lockedSwingLow ? lockedSwingLow.time : absoluteLowest.time;
                const rootPrice = lockedSwingLow ? lockedSwingLow.price : absoluteLowest.price;

                const swingHLIndex = candles.findIndex(c => c.timestamp === rootTime);
                const refHHIndex = candles.findIndex(c => c.timestamp === validHH.time);

                const rootExtreme = {
                    id: "ROOT_SWING_HL",
                    validHL: rootPrice,
                    validHLCandleIndex: swingHLIndex,
                    confirmHH: validHH.price,
                    confirmHHCandleIndex: refHHIndex,
                    breakCandleIndex: refHHIndex, 
                    startTime: rootTime
                };

                const validPullbacksForSMC = bullishPullbacks.filter(pb =>
                    pb.validHL !== confirmedHL.price 
                );

                if (swingHLIndex !== -1 && refHHIndex !== -1) {
                    validPullbacksForSMC.unshift(rootExtreme);
                }

                const poiZones = findSMCZones(candles, validPullbacksForSMC, i);

                // ==========================================================
                // 🔥 THE VISUAL FIX
                // ==========================================================
                
                // 1. जब नया IDM कन्फर्म होता है, तो 'signals' एरे में मौजूद पिछले सारे ज़ोन्स 'पुराने' बन जाते हैं।
                signals.forEach(sig => {
                    if (sig.trend === "BULLISH" && ["E-OB", "D-OB", "E-OF", "D-OF"].includes(sig.type)) {
                        
                        if (!sig.displayName || !sig.displayName.includes("Demand")) {
                            sig.isActive = false; // पुराने ज़ोन डीएक्टिवेट करें
                            
                            let isMitigated = false;
                            let startIdx = candles.findIndex(c => c.timestamp === sig.startTime);
                            
                            if (startIdx !== -1) {
                                // 🎯 बग फिक्स: स्कैनिंग startIdx + 3 से शुरू होगी! (ताकि FVG बनाने वाली कैंडल्स इग्नोर हो जाएं)
                                for (let j = startIdx + 3; j <= i; j++) {
                                    if (candles[j].low <= sig.priceTop) {
                                        isMitigated = true;
                                        break;
                                    }
                                }
                            }

                            // 🎯 अगर भविष्य में मार्केट ने इसे टच नहीं किया है, तो नाम बदल दो
                            if (!isMitigated) {
                                if (sig.type === "E-OB" || sig.type === "D-OB") sig.displayName = "Demand Zone(OB)";
                                if (sig.type === "E-OF" || sig.type === "D-OF") sig.displayName = "Demand Zone(OF)";
                            }
                        }
                    }
                });

                // 2. नए (Current Structure) ज़ोन्स को सिग्नल्स में पुश करें
                if (poiZones.eof && !poiZones.eof.isMitigated) {
                    let mitTimeEOF = findMitigationTime(poiZones.eof.top, i, candles);
                    signals.push({ type: "E-OF", displayName: "E-OF", trend: "BULLISH", priceTop: poiZones.eof.top, priceBottom: poiZones.eof.bottom, startTime: poiZones.eof.startTime, endTime: mitTimeEOF, isActive: true });
                }
                
                if (poiZones.eob) {
                    let mitTimeEOB = findMitigationTime(poiZones.eob.top, i, candles);
                    signals.push({ type: "E-OB", displayName: "E-OB", trend: "BULLISH", priceTop: poiZones.eob.top, priceBottom: poiZones.eob.bottom, startTime: poiZones.eob.startTime, fvgTop: poiZones.eob.fvgTop, fvgBottom: poiZones.eob.fvgBottom, endTime: mitTimeEOB, isActive: true });
                }

                if (poiZones.dof && !poiZones.dof.isMitigated) {
                    let mitTimeDOF = findMitigationTime(poiZones.dof.top, i, candles);
                    signals.push({ type: "D-OF", displayName: "D-OF", trend: "BULLISH", priceTop: poiZones.dof.top, priceBottom: poiZones.dof.bottom, startTime: poiZones.dof.startTime, endTime: mitTimeDOF, isActive: true });
                }
                
                if (poiZones.dob) {
                    let mitTimeDOB = findMitigationTime(poiZones.dob.top, i, candles);
                    signals.push({ type: "D-OB", displayName: "D-OB", trend: "BULLISH", priceTop: poiZones.dob.top, priceBottom: poiZones.dob.bottom, startTime: poiZones.dob.startTime, fvgTop: poiZones.dob.fvgTop, fvgBottom: poiZones.dob.fvgBottom, endTime: mitTimeDOB, isActive: true });
                }
                
                bullishPullbacks = []; 
                tempPullbackTracker = null;
                confirmedHL = null;
            }

            if (isIdmTaken && curr.low < tempSwingLow.price) {
                tempSwingLow = { price: curr.low, time: curr.timestamp };

                bullishPullbacks = [];
                refHH = null; // ट्रैकर अनलॉक!
                tempPullbackTracker = null;
            }

            // RULE 3 & 6a: BOS & Sweep Logic
            if (isIdmTaken && validHH !== null) {
                let breakLevel = refX_BOS_Bullish ? refX_BOS_Bullish.price : validHH.price;

                if (curr.high > breakLevel) {
                    if (curr.close > breakLevel) { // 🚀 Full Body Break

                        // 🔥 VISUAL FIX: लाइन हमेशा ओरिजिनल 'validHH' से ही ड्रा होगी!
                        signals.push({
                            type: "BOS", trend: "BULLISH",
                            price: validHH.price,       // <-- Original Price
                            startTime: validHH.time,    // <-- Original Time
                            endTime: curr.timestamp
                        });

                        if (refX_CHoCH_Bullish) {
                            signals.push({ type: "X", trend: "BULLISH", sweptSide: "LOW", price: lockedSwingLow.price, startTime: lockedSwingLow.time, endTime: refX_CHoCH_Bullish.time });
                            refX_CHoCH_Bullish = null;
                        }

                        lockedSwingLow = { ...tempSwingLow };
                        isIdmTaken = false;
                        validHH = null; refHH = null; refX_BOS_Bullish = null;


                        absoluteHighest = { price: curr.high, time: curr.timestamp };
                    } else { // 🧹 Sweep (Ref X)
                        refX_BOS_Bullish = { price: curr.high, time: curr.timestamp, majorIdmTarget: { ...majorIdm_Bullish } };
                    }
                }

                if (refX_BOS_Bullish && refX_BOS_Bullish.majorIdmTarget) {
                    if (curr.low < refX_BOS_Bullish.majorIdmTarget.price) {
                        signals.push({ type: "IDM", trend: "BULLISH", price: refX_BOS_Bullish.majorIdmTarget.price, startTime: refX_BOS_Bullish.majorIdmTarget.time, endTime: curr.timestamp });

                        signals.push({ type: "X", trend: "BULLISH", sweptSide: "HIGH", price: validHH.price, startTime: validHH.time, endTime: refX_BOS_Bullish.time }); // <-- यहाँ बदलाव है

                        validHH = { price: refX_BOS_Bullish.price, time: refX_BOS_Bullish.time };
                        refX_BOS_Bullish = null;
                        majorIdm_Bullish = { price: curr.low, time: curr.timestamp };
                    }
                }
            }
        }

        refCandle = curr;
    }

    // ==========================================
    // 🔥 LIVE EDGE: पेंडिंग "Ref X" को चार्ट पर भेजना
    // ==========================================
    const lastTime = candles[candles.length - 1].timestamp;

    if (trend === -1) {
        if (refX_CHoCH_Bearish && lockedSwingHigh) {
            signals.push({ type: "Ref X", trend: "BEARISH", sweptSide: "HIGH", price: lockedSwingHigh.price, startTime: lockedSwingHigh.time, endTime: lastTime });
        }
        if (refX_BOS_Bearish && validLL) {
            signals.push({ type: "Ref X", trend: "BEARISH", sweptSide: "LOW", price: validLL.price, startTime: validLL.time, endTime: lastTime });
        }
    } else if (trend === 1) {
        if (refX_CHoCH_Bullish && lockedSwingLow) {
            signals.push({ type: "Ref X", trend: "BULLISH", sweptSide: "LOW", price: lockedSwingLow.price, startTime: lockedSwingLow.time, endTime: lastTime });
        }
        if (refX_BOS_Bullish && validHH) {
            signals.push({ type: "Ref X", trend: "BULLISH", sweptSide: "HIGH", price: validHH.price, startTime: validHH.time, endTime: lastTime });
        }
    }

    return signals;
};

// ============================================================================
// 🎯 SMC POI SCANNER BLOCK: E-OF, E-OB, D-OF, D-OB FOR BULLISH SCENARIO
// ============================================================================

/**
 * 1. Pullback Zone की Mitigation चेक करने का हेल्पर फंक्शन
 * (अगर कोई भी अगली कैंडल पुलबैक के टॉप यानी confirmHH के नीचे घुसती है, तो वो मिटिगेट माना जाएगा)
 */
const isPullbackMitigated = (pullback, candles, idmIndex) => {
    // पुलबैक बनने वाले कैंडल इंडेक्स से लेकर IDM कन्फर्म होने वाले इंडेक्स तक चेक करेंगे
    const startIndex = pullback.breakCandleIndex + 1;

    for (let i = startIndex; i <= idmIndex; i++) {
        if (i >= candles.length) break;
        const currentCandle = candles[i];

        // 🔥 रिफाइनमेंट रूल: अगर किसी भी अगली कैंडल का Low, पुलबैक के टॉप (confirmHH) के नीचे या बराबर चला जाए
        if (currentCandle.low <= pullback.confirmHH) {
            return true; // ज़ोन मिटिगेट (खत्म) हो गया
        }
    }
    return false; // अनमिटिगेटेड है
};

/**
 * 🎯 Helper: Future में Zone कब Mitigate (Tap) हुआ, उसका Time खोजना
 */
const findMitigationTime = (zoneTop, startIndex, candles) => {
    // IDM वाली कैंडल (startIndex) से लेकर चार्ट के अंत तक चेक करेंगे
    for (let j = startIndex; j < candles.length; j++) {
        // बुलिश ज़ोन के लिए: अगर कैंडल का Low ज़ोन के Top को टच करे या नीचे जाए
        if (candles[j].low <= zoneTop) {
            return candles[j].timestamp; // यहाँ ज़ोन टैप (Mitigate) हो गया!
        }
    }
    // अगर अभी तक टैप नहीं हुआ (Unmitigated), तो चार्ट की एकदम आखिरी कैंडल तक ज़ोन को खींच दो
    return candles[candles.length - 1].timestamp;
};


/**
 * 🎯 Helper: Check if Order Flow (Pullback) is Mitigated
 */
const isOfMitigated = (pb, candles, currentIndex) => {
    // ब्रेकआउट कैंडल के बाद से IDM तक चेक करेंगे
    const startIdx = pb.breakCandleIndex + 1;
    for (let j = startIdx; j <= currentIndex; j++) {
        if (j >= candles.length) break;
        // बुलिश में: अगर कोई कैंडल OF के टॉप (confirmHH) को नीचे की तरफ टच कर दे
        if (candles[j].low <= pb.confirmHH) {
            return true; // OF मिटिगेट हो गया!
        }
    }
    return false; // OF अभी भी फ्रेश है!
};

/**
 * 🎯 E-OB / D-OB ढूँढने का "Swing HL to Ref HH" एडवांस लॉजिक
 */
const findValidOrderBlock = (pullback, candles, currentIndex) => {
    
    // 1. Start: "Swing HL" वाली कैंडल को ही exactly 1st कैंडल मानेंगे (No -1 logic)
    const startIdx = pullback.validHLCandleIndex; 
    
    // 2. Limitation: FVG चेक करते हुए सिर्फ "Ref HH" (Breakout Candle) तक ही जाएंगे
    const endIdx = pullback.breakCandleIndex; 

    // 1-1 कैंडल ऊपर बढ़ते जाएंगे
    for (let i = startIdx; i <= endIdx; i++) {
        if (i + 2 >= candles.length) continue;

        const firstCandle = candles[i];
        const thirdCandle = candles[i + 2];

        // 3. FVG Check: क्या इस 1st कैंडल और 3rd कैंडल के बीच FVG (Imbalance) है?
        if (firstCandle.high < thirdCandle.low) {
            
            // Mitigation चेक (क्या भविष्य में ये कैंडल टच हुई है?)
            let isMitigated = false;
            for (let j = i + 3; j <= currentIndex; j++) {
                if (j >= candles.length) break;
                if (candles[j].low <= firstCandle.high) {
                    isMitigated = true;
                    break;
                }
            }

            if (!isMitigated) {
                // ✅ 4. FVG मिल गया! अब इसी 1st Candle के High और Low से रेक्टेंगल बॉक्स ड्रा होगा।
                return {
                    found: true,
                    price: { high: firstCandle.high, low: firstCandle.low }, // 1st कैंडल का High-Low
                    fvgZone: { top: thirdCandle.low, bottom: firstCandle.high },
                    startTime: firstCandle.timestamp, // बॉक्स यहीं से शुरू होगा
                    candleIndex: i
                };
            }
        }
    }

    // 5. Fallback: अगर Swing HL से Ref HH तक कोई फ्रेश FVG नहीं मिला, 
    // तो इंजन 'false' रिटर्न करेगा और हमारा 'पुलबैक शिफ्ट लॉजिक' (2nd Pullback check) स्टार्ट हो जाएगा!
    return { found: false };
};

/**
 * 🎯 MAIN POI ENGINE: Extreme & Decisional ज़ोन फ़िल्टर
 */
const findSMCZones = (candles, pullbacksArray, currentIndex) => {
    let smcZones = { eof: null, eob: null, dof: null, dob: null };
    if (!pullbacksArray || pullbacksArray.length === 0) return smcZones;

    // ==============================================================
    // 🔥 1. EXTREME ZONES (E-OF / E-OB)
    // ==============================================================
    for (let i = 0; i < pullbacksArray.length; i++) {
        const pb = pullbacksArray[i];
        const obResult = findValidOrderBlock(pb, candles, currentIndex);

        if (obResult.found) {
            const mitigatedOF = isOfMitigated(pb, candles, currentIndex);
            smcZones.eof = { type: "E-OF", top: pb.confirmHH, bottom: pb.validHL, startTime: pb.startTime, isMitigated: mitigatedOF, data: pb };
            
            // यहाँ 'obResult.startTime' का यूज़ करना बहुत ज़रूरी है
            smcZones.eob = { 
                type: "E-OB", 
                top: obResult.price.high, 
                bottom: obResult.price.low, 
                startTime: obResult.startTime, // बॉक्स अब यहीं से शुरू होगा
                fvgTop: obResult.fvgZone.top, 
                fvgBottom: obResult.fvgZone.bottom 
            };
            break; 
        }
    }

    // ==============================================================
    // 🔥 2. DECISIONAL ZONES (D-OF / D-OB) - UPDATED DYNAMIC LOGIC
    // ==============================================================
    for (let i = pullbacksArray.length - 1; i >= 0; i--) {
        const pb = pullbacksArray[i];
        if (smcZones.eof && smcZones.eof.data.id === pb.id) break;

        const obResult = findValidOrderBlock(pb, candles, currentIndex);

        if (obResult.found) {
            const mitigatedOF = isOfMitigated(pb, candles, currentIndex);
            
            smcZones.dof = { 
                type: "D-OF", 
                top: pb.confirmHH, 
                bottom: pb.validHL, 
                startTime: pb.startTime, 
                isMitigated: mitigatedOF, 
                data: pb 
            };

            // ✅ Yahan dekhiye: Humne `obResult` se dynamic `startTime` aur `price` utha liya hai
            smcZones.dob = { 
                type: "D-OB", 
                top: obResult.price.high, 
                bottom: obResult.price.low, 
                startTime: obResult.startTime, // 🚀 Ye ab dynamic hai!
                fvgTop: obResult.fvgZone.top, 
                fvgBottom: obResult.fvgZone.high, // Ye aapke fvgZone logic ke hisaab se hoga
                data: pb
            };
            break; 
        }
    }
    return smcZones;
};

// ___________________________________________________________________________________________________


// 🎯 MAIN SCANNER
const checkPriceActionSignal = (htfCandles, ltfCandles, setupType, startingTrend = "AUTO") => {
    let signal = { long: false, short: false, reason: "" };

    if (!htfCandles || htfCandles.length < 15 || !ltfCandles || ltfCandles.length === 0) {
        return signal;
    }

    const htfSignals = identifyMechanicalStructure(htfCandles, startingTrend);
    if (htfSignals.length === 0) return signal;

    const latestSignal = htfSignals[htfSignals.length - 1];

    // 🔥 THE FIX: 'isRecent' वाला टाइम लिमिट पूरी तरह हटा दिया गया है!
    // अब इंजन को कोई फर्क नहीं पड़ता कि BOS/CHoCH कब हुआ था। 
    // जो भी आख़िरी स्ट्रक्चर है, वही मास्टर ट्रेंड माना जाएगा।

    let htfSignalLong = false;
    let htfSignalShort = false;

    if (setupType === "BOS (Break of Structure)" && latestSignal.type === "BOS") {
        if (latestSignal.trend === "BULLISH") htfSignalLong = true;
        if (latestSignal.trend === "BEARISH") htfSignalShort = true;
    }
    else if (setupType === "CHoCH (Change of Character)" && latestSignal.type === "CHoCH") {
        if (latestSignal.trend === "BULLISH") htfSignalLong = true;
        if (latestSignal.trend === "BEARISH") htfSignalShort = true;
    }

    // 3. LTF Delivery Boy (1-Min Confirmation)
    if (htfSignalLong || htfSignalShort) {
        const currentLtfCandle = ltfCandles[ltfCandles.length - 1];

        const isLtfBullish = currentLtfCandle.close > currentLtfCandle.open;
        const isLtfBearish = currentLtfCandle.close < currentLtfCandle.open;

        if (htfSignalLong && isLtfBullish) {
            signal.long = true;
            signal.reason = `HTF ${latestSignal.type} Bullish + LTF Confirm`;
        }
        else if (htfSignalShort && isLtfBearish) {
            signal.short = true;
            signal.reason = `HTF ${latestSignal.type} Bearish + LTF Confirm`;
        }
    }
    return signal;
};

module.exports = { identifyMechanicalStructure, checkPriceActionSignal };