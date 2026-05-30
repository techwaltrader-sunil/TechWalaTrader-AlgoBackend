

// const identifyMechanicalStructure = (candles, startingTrend = "AUTO") => {

//     // 🔥 2. User Input के हिसाब से Initial Trend सेट करें
//     let trend = 0;
//     if (startingTrend === "BULLISH") trend = 1;
//     else if (startingTrend === "BEARISH") trend = -1;
//     else {
//         // AUTO Mode: बेसिक शुरुआत (आगे जाकर Smart Auto इसे फिक्स कर लेगा)
//         trend = candles.length > 5 ? (candles[5].close > candles[0].close ? 1 : -1) : 1;
//     }


//     let signals = [];
//     if (candles.length === 0) return signals;

//     let refCandle = candles[0];

//     // ==========================================
//     // 📉 BEARISH STATE VARIABLES
//     // ==========================================
//     let refLL = null;
//     let tempLH = null;
//     let confirmedLH = null;
//     let validLL = null;
//     let tempSwingHigh = null;
//     let lockedSwingHigh = null;
//     let absoluteLowest = { price: candles[0].low, time: candles[0].timestamp };

//     let bearishPullbacks = []; 
//     let tempPullbackTracker_Bearish = null;

//     // 🔥 Liquidity Sweep (X) Variables
//     let refX_BOS_Bearish = null;
//     let majorIdm_Bearish = { price: -Infinity, time: null };
//     let refX_CHoCH_Bearish = null;

//     // ==========================================
//     // 📈 BULLISH STATE VARIABLES
//     // ==========================================
//     let refHH = null;
//     let tempHL = null;
//     let confirmedHL = null;
//     let validHH = null;

//     let tempSwingLow = null;
//     let lockedSwingLow = null;
//     let absoluteHighest = { price: candles[0].high, time: candles[0].timestamp };

//     // 🔥 NAYA CODE: Pullbacks Store करने के लिए
//     let bullishPullbacks = [];
//     let tempPullbackTracker = null;

//     // 🔥 Liquidity Sweep (X) Variables
//     let refX_BOS_Bullish = null;
//     let majorIdm_Bullish = { price: Infinity, time: null };
//     let refX_CHoCH_Bullish = null;

//     let isIdmTaken = false;

//     let current_bullish_structure = [];
//     let previous_bullish_structure = [];
    

//     for (let i = 1; i < candles.length; i++) {
//         const curr = candles[i];

//         const prevAbsoluteHighest = absoluteHighest.price;
//         const prevAbsoluteLowest = absoluteLowest.price;

//         // अब नया हाई/लो अपडेट करें
//         if (curr.low < absoluteLowest.price) absoluteLowest = { price: curr.low, time: curr.timestamp };
//         if (curr.high > absoluteHighest.price) absoluteHighest = { price: curr.high, time: curr.timestamp };

//         let isInsideBar = curr.high <= refCandle.high && curr.low >= refCandle.low;
//         let isOutsideBar = curr.high > refCandle.high && curr.low < refCandle.low;

//         if (isInsideBar) continue;

//         let brokeHigh = curr.high > refCandle.high;
//         let brokeLow = curr.low < refCandle.low;

//         // ==========================================
//         // 📉 BEARISH STRUCTURE LOGIC (-1)
//         // ==========================================
//         if (trend === -1) {

//             // 🔥 SMART AUTO FIX (यहाँ सबसे ऊपर रहेगा!): 
//             if (startingTrend === "AUTO" && lockedSwingHigh === null && curr.close > prevAbsoluteHighest) {
//                 trend = 1;
//                 isIdmTaken = false;
//                 validLL = null; refLL = null; tempSwingHigh = null; confirmedLH = null;
                
//                 bearishPullbacks = []; // 🎯 Added
//                 tempPullbackTracker_Bearish = null; // 🎯 Added

//                 absoluteLowest = { price: curr.low, time: curr.timestamp }; 
//                 refCandle = curr;
//                 continue;
//             }

//             if (isIdmTaken) {
//                 if (curr.high > majorIdm_Bearish.price) majorIdm_Bearish = { price: curr.high, time: curr.timestamp };
//             }

//             // RULE 5 & 6c: CHoCH & Sweep Logic
//             if (lockedSwingHigh !== null) {
//                 let breakLevel = refX_CHoCH_Bearish ? refX_CHoCH_Bearish.price : lockedSwingHigh.price;

//                 if (curr.high > breakLevel) {
//                     if (curr.close > breakLevel) { // 🚀 Full Body Break (Valid CHoCH)

//                         signals.push({
//                             type: "CHoCH", trend: "BULLISH",
//                             sweptSide: "HIGH",
//                             price: lockedSwingHigh.price,
//                             startTime: lockedSwingHigh.time,
//                             endTime: curr.timestamp
//                         });

//                         trend = 1;
//                         isIdmTaken = false;
//                         lockedSwingLow = { ...absoluteLowest };
//                         validLL = null; refLL = null; tempSwingHigh = null; lockedSwingHigh = null; confirmedLH = null;
//                         refX_CHoCH_Bearish = null; refX_BOS_Bearish = null;
                        
//                         bearishPullbacks = []; // 🎯 Added
//                         tempPullbackTracker_Bearish = null; // 🎯 Added

//                         absoluteHighest = { price: curr.high, time: curr.timestamp };
//                         refCandle = curr;
//                         continue;
//                     } else { // 🧹 Sweep (Ref X)
//                         refX_CHoCH_Bearish = { price: curr.high, time: curr.timestamp };
//                     }
//                 }
//             }

//             // ==========================================================
//             // 🔥 BULLETPROOF PULLBACK TRACKER (Bearish Engulfing Fix)
//             // ==========================================================
//             if (brokeHigh && !isOutsideBar && refLL === null) { 
//                 refLL = { price: refCandle.low, time: refCandle.timestamp };
//                 tempLH = { price: curr.high, time: curr.timestamp };
                
//                 tempPullbackTracker_Bearish = {
//                     id: bearishPullbacks.length + 1,
//                     confirmLL: refCandle.low,
//                     confirmLLCandleIndex: i - 1, 
//                     validLH: curr.high,
//                     validLHCandleIndex: i, 
//                     startTime: refCandle.timestamp
//                 };
//             } else if (refLL !== null) { 
//                 if (curr.high > tempLH.price) {
//                     tempLH = { price: curr.high, time: curr.timestamp };
//                     if (tempPullbackTracker_Bearish) {
//                         tempPullbackTracker_Bearish.validLH = curr.high;
//                         tempPullbackTracker_Bearish.validLHCandleIndex = i;
//                     }
//                 }
                
//                 if (curr.low <= refLL.price) { 
//                     // ❌ Fake Engulfing Pullback (Discard)
//                     if (curr.timestamp === tempLH.time) {
//                         refLL = null; 
//                         tempPullbackTracker_Bearish = null; 
//                     } else {
//                         // ✅ Valid Pullback (Confirm)
//                         confirmedLH = tempLH; 
//                         refLL = null; 
                        
//                         if (tempPullbackTracker_Bearish) {
//                             tempPullbackTracker_Bearish.breakCandleIndex = i;
//                             bearishPullbacks.push({...tempPullbackTracker_Bearish});
//                             tempPullbackTracker_Bearish = null; 
//                         }
//                     }
//                 }
//             }

//             // 🎯 THE FINAL IDM CONFIRMATION & SUPPLY ZONE TRANSFORMATION
//             if (confirmedLH !== null && curr.high >= confirmedLH.price && !isIdmTaken) {
//                 isIdmTaken = true;
//                 validLL = { ...absoluteLowest };
//                 tempSwingHigh = { price: curr.high, time: curr.timestamp };
//                 majorIdm_Bearish = { price: curr.high, time: curr.timestamp };
//                 signals.push({ type: "IDM", trend: "BEARISH", price: confirmedLH.price, startTime: confirmedLH.time, endTime: curr.timestamp });

//                 // 🔥 1. THE ROOT EXTREME FIX
//                 const rootTime = lockedSwingHigh ? lockedSwingHigh.time : absoluteHighest.time;
//                 const rootPrice = lockedSwingHigh ? lockedSwingHigh.price : absoluteHighest.price;

//                 const swingLHIndex = candles.findIndex(c => c.timestamp === rootTime);
//                 const refLLIndex = candles.findIndex(c => c.timestamp === validLL.time);

//                 const rootExtreme = {
//                     id: "ROOT_SWING_LH",
//                     validLH: rootPrice,
//                     validLHCandleIndex: swingLHIndex,
//                     confirmLL: validLL.price,
//                     confirmLLCandleIndex: refLLIndex,
//                     breakCandleIndex: refLLIndex, 
//                     startTime: rootTime
//                 };

//                 const validPullbacksForSMC = bearishPullbacks.filter(pb => pb.validLH !== confirmedLH.price);

//                 if (swingLHIndex !== -1 && refLLIndex !== -1) {
//                     validPullbacksForSMC.unshift(rootExtreme);
//                 }

//                 const poiZones = findSMCZones_Bearish(candles, validPullbacksForSMC, i);

//                 // 🔥 2. THE MASTER STATE MANAGEMENT
//                 signals.forEach(sig => {
//                     if (["E-OB", "D-OB", "E-OF", "D-OF"].includes(sig.type)) {
                        
//                         // अगर पहले से Demand/Supply नाम नहीं हुआ है, तभी चेक करो
//                         if (!sig.displayName || (!sig.displayName.includes("Demand") && !sig.displayName.includes("Supply"))) {
//                             sig.isActive = false; // पुराने ज़ोन डीएक्टिवेट करें
                            
//                             let isMitigated = false;
//                             let startIdx = candles.findIndex(c => c.timestamp === sig.startTime);
                            
//                             if (startIdx !== -1) {
//                                 for (let j = startIdx + 3; j <= i; j++) {
//                                     // बुलिश ज़ोन के लिए चेकिंग
//                                     if (sig.trend === "BULLISH" && candles[j].low <= sig.priceTop) {
//                                         isMitigated = true;
//                                         break;
//                                     }
//                                     // बेयरिश ज़ोन के लिए चेकिंग
//                                     if (sig.trend === "BEARISH" && candles[j].high >= sig.priceBottom) {
//                                         isMitigated = true;
//                                         break;
//                                     }
//                                 }
//                             }

//                             // 🎯 सिर्फ अनमिटिगेटेड ज़ोन्स का नाम उनके ट्रेंड के हिसाब से बदलें
//                             if (!isMitigated) {
//                                 if (sig.trend === "BULLISH") {
//                                     if (sig.type === "E-OB" || sig.type === "D-OB") sig.displayName = "Demand Zone(OB)";
//                                     if (sig.type === "E-OF" || sig.type === "D-OF") sig.displayName = "Demand Zone(OF)";
//                                 } else if (sig.trend === "BEARISH") {
//                                     if (sig.type === "E-OB" || sig.type === "D-OB") sig.displayName = "Supply Zone(OB)";
//                                     if (sig.type === "E-OF" || sig.type === "D-OF") sig.displayName = "Supply Zone(OF)";
//                                 }
//                             }
//                         }
//                     }
//                 });

//                 // 🔥 3. THE VISUAL FIX
//                 if (poiZones.eof && !poiZones.eof.isMitigated) {
//                     let mitTimeEOF = findMitigationTime_Bearish(poiZones.eof.bottom, i, candles);
//                     signals.push({ type: "E-OF", displayName: "E-OF", trend: "BEARISH", priceTop: poiZones.eof.top, priceBottom: poiZones.eof.bottom, startTime: poiZones.eof.startTime, endTime: mitTimeEOF, isActive: true });
//                 }
//                 if (poiZones.eob) {
//                     let mitTimeEOB = findMitigationTime_Bearish(poiZones.eob.bottom, i, candles);
//                     signals.push({ type: "E-OB", displayName: "E-OB", trend: "BEARISH", priceTop: poiZones.eob.top, priceBottom: poiZones.eob.bottom, startTime: poiZones.eob.startTime, fvgTop: poiZones.eob.fvgTop, fvgBottom: poiZones.eob.fvgBottom, endTime: mitTimeEOB, isActive: true });
//                 }
//                 if (poiZones.dof && !poiZones.dof.isMitigated) {
//                     let mitTimeDOF = findMitigationTime_Bearish(poiZones.dof.bottom, i, candles);
//                     signals.push({ type: "D-OF", displayName: "D-OF", trend: "BEARISH", priceTop: poiZones.dof.top, priceBottom: poiZones.dof.bottom, startTime: poiZones.dof.startTime, endTime: mitTimeDOF, isActive: true });
//                 }
//                 if (poiZones.dob) {
//                     let mitTimeDOB = findMitigationTime_Bearish(poiZones.dob.bottom, i, candles);
//                     signals.push({ type: "D-OB", displayName: "D-OB", trend: "BEARISH", priceTop: poiZones.dob.top, priceBottom: poiZones.dob.bottom, startTime: poiZones.dob.startTime, fvgTop: poiZones.dob.fvgTop, fvgBottom: poiZones.dob.fvgBottom, endTime: mitTimeDOB, isActive: true });
//                 }
                
//                 bearishPullbacks = []; 
//                 tempPullbackTracker_Bearish = null;
//                 confirmedLH = null;
//             }

//             // 🎯 New High before BOS (Unlock Tracker)
//             if (isIdmTaken && curr.high > tempSwingHigh.price) {
//                 tempSwingHigh = { price: curr.high, time: curr.timestamp };
//                 bearishPullbacks = []; // 🎯 Added
//                 refLL = null; 
//                 tempPullbackTracker_Bearish = null; // 🎯 Added
//             }

//             // RULE 3 & 6a: BOS & Sweep Logic
//             if (isIdmTaken && validLL !== null) {
//                 let breakLevel = refX_BOS_Bearish ? refX_BOS_Bearish.price : validLL.price;

//                 if (curr.low < breakLevel) {
//                     if (curr.close < breakLevel) { // 🚀 Full Body Break (Valid BOS)
//                         signals.push({
//                             type: "BOS", trend: "BEARISH",
//                             price: validLL.price, 
//                             startTime: validLL.time, 
//                             endTime: curr.timestamp
//                         });

//                         if (refX_CHoCH_Bearish) {
//                             signals.push({ type: "X", trend: "BEARISH", price: lockedSwingHigh.price, startTime: lockedSwingHigh.time, endTime: refX_CHoCH_Bearish.time });
//                             refX_CHoCH_Bearish = null;
//                         }

//                         lockedSwingHigh = { ...tempSwingHigh };
//                         isIdmTaken = false;
//                         validLL = null; refLL = null; refX_BOS_Bearish = null;
//                         absoluteLowest = { price: curr.low, time: curr.timestamp };
                        
//                         bearishPullbacks = []; // 🎯 Added
//                         tempPullbackTracker_Bearish = null; // 🎯 Added
//                     } else { // 🧹 Sweep (Ref X)
//                         refX_BOS_Bearish = { price: curr.low, time: curr.timestamp, majorIdmTarget: { ...majorIdm_Bearish } };
//                     }
//                 }

//                 if (refX_BOS_Bearish && refX_BOS_Bearish.majorIdmTarget) {
//                     if (curr.high > refX_BOS_Bearish.majorIdmTarget.price) {
//                         signals.push({ type: "IDM", trend: "BEARISH", price: refX_BOS_Bearish.majorIdmTarget.price, startTime: refX_BOS_Bearish.majorIdmTarget.time, endTime: curr.timestamp });
//                         signals.push({ type: "X", trend: "BEARISH", sweptSide: "LOW", price: validLL.price, startTime: validLL.time, endTime: refX_BOS_Bearish.time });

//                         validLL = { price: refX_BOS_Bearish.price, time: refX_BOS_Bearish.time };
//                         refX_BOS_Bearish = null;
//                         majorIdm_Bearish = { price: curr.high, time: curr.timestamp };
//                     }
//                 }
//             }
//         }

//         // ==========================================
//         // 📈 BULLISH STRUCTURE LOGIC (1)
//         // ==========================================
//         else if (trend === 1) {

//             // 🔥 SMART AUTO FIX (यहाँ सबसे ऊपर रहेगा!): 
//             // अगर कोई BOS नहीं हुआ है और मार्केट क्रैश होकर एकदम बॉटम को तोड़ दे
//             if (startingTrend === "AUTO" && lockedSwingLow === null && curr.close < prevAbsoluteLowest) {
//                 trend = -1;
//                 isIdmTaken = false;
//                 validHH = null; refHH = null; tempSwingLow = null; confirmedHL = null;

//                 bullishPullbacks = [];
//                 tempPullbackTracker = null;

//                 absoluteHighest = { price: curr.high, time: curr.timestamp }; // नई शुरुआत के लिए टॉप सेट करें
//                 refCandle = curr;
//                 continue;
//             }

//             if (isIdmTaken) {
//                 if (curr.low < majorIdm_Bullish.price) majorIdm_Bullish = { price: curr.low, time: curr.timestamp };
//             }

//             // RULE 5 & 6c: CHoCH & Sweep Logic
//             if (lockedSwingLow !== null) {
//                 let breakLevel = refX_CHoCH_Bullish ? refX_CHoCH_Bullish.price : lockedSwingLow.price;

//                 if (curr.low < breakLevel) {
//                     if (curr.close < breakLevel) { // 🚀 Full Body Break

//                         // 🔥 VISUAL FIX: लाइन हमेशा ओरिजिनल 'lockedSwingLow' से ही ड्रा होगी!
//                         signals.push({
//                             type: "CHoCH", trend: "BEARISH",
//                             price: lockedSwingLow.price,     // <-- Original Price
//                             startTime: lockedSwingLow.time,  // <-- Original Time
//                             endTime: curr.timestamp
//                         });

//                         trend = -1;
//                         isIdmTaken = false;
//                         lockedSwingHigh = { ...absoluteHighest };
//                         validHH = null; refHH = null; tempSwingLow = null; lockedSwingLow = null; confirmedHL = null;
//                         refX_CHoCH_Bullish = null; refX_BOS_Bullish = null;

//                         bullishPullbacks = [];
//                         tempPullbackTracker = null;

//                         absoluteLowest = { price: curr.low, time: curr.timestamp };
//                         refCandle = curr;
//                         continue;
//                     } else { // 🧹 Sweep (Ref X)
//                         refX_CHoCH_Bullish = { price: curr.low, time: curr.timestamp };
//                     }
//                 }
//             }

//             // ==========================================================
//             // 🔥 BULLETPROOF PULLBACK TRACKER (The Smart Engulfing Fix)
//             // ==========================================================
//             if (brokeLow && !isOutsideBar && refHH === null) { 
//                 refHH = { price: refCandle.high, time: refCandle.timestamp };
//                 tempHL = { price: curr.low, time: curr.timestamp };
                
//                 tempPullbackTracker = {
//                     id: bullishPullbacks.length + 1,
//                     confirmHH: refCandle.high,
//                     confirmHHCandleIndex: i - 1, 
//                     validHL: curr.low,
//                     validHLCandleIndex: i, 
//                     startTime: refCandle.timestamp
//                 };
//             } else if (refHH !== null) { 
//                 if (curr.low < tempHL.price) {
//                     tempHL = { price: curr.low, time: curr.timestamp };
//                     if (tempPullbackTracker) {
//                         tempPullbackTracker.validHL = curr.low;
//                         tempPullbackTracker.validHLCandleIndex = i;
//                     }
//                 }
                
//                 if (curr.high >= refHH.price) { 
//                     // ==================================================
//                     // 🔥 THE SMART ENGULFING FIX (1-Candle Sweep Filter)
//                     // ==================================================
//                     // अगर जो कैंडल हाई (refHH) को ब्रेक कर रही है, उसी कैंडल ने 
//                     // इस पुलबैक का सबसे निचला लो (Lowest Low) भी बनाया है 
//                     // (यानी curr.timestamp === tempHL.time), तो इसका मतलब है कि 
//                     // यह एक 'राक्षस कैंडल' है जिसने बॉटम और टॉप दोनों एक साथ खा लिए।
//                     // इसे फेक पुलबैक मानकर डिलीट कर देंगे!
                    
//                     if (curr.timestamp === tempHL.time) {
//                         // ❌ Fake Engulfing Pullback (Discard)
//                         refHH = null; 
//                         tempPullbackTracker = null; 
//                     } else {
//                         // ✅ Valid Pullback (Confirm)
//                         confirmedHL = tempHL; 
//                         refHH = null; 
                        
//                         if (tempPullbackTracker) {
//                             tempPullbackTracker.breakCandleIndex = i;
//                             bullishPullbacks.push({...tempPullbackTracker});
//                             tempPullbackTracker = null; 
//                         }
//                     }
//                 }
//             }

//             if (confirmedHL !== null && curr.low <= confirmedHL.price && !isIdmTaken) {
//                 isIdmTaken = true;
//                 validHH = { ...absoluteHighest };
//                 tempSwingLow = { price: curr.low, time: curr.timestamp };
//                 majorIdm_Bullish = { price: curr.low, time: curr.timestamp };
//                 signals.push({ type: "IDM", trend: "BULLISH", price: confirmedHL.price, startTime: confirmedHL.time, endTime: curr.timestamp });

//                 // ==========================================================
//                 // 🔥 THE ROOT EXTREME FIX (Null Crash Fix)
//                 // ==========================================================
                
//                 // 1. सेफ़्टी चेक: अगर पहली लहर (First Wave) है और lockedSwingLow अभी null है, 
//                 // तो इंजन बॉटम के लिए absoluteLowest का यूज़ करेगा!
//                 const rootTime = lockedSwingLow ? lockedSwingLow.time : absoluteLowest.time;
//                 const rootPrice = lockedSwingLow ? lockedSwingLow.price : absoluteLowest.price;

//                 const swingHLIndex = candles.findIndex(c => c.timestamp === rootTime);
//                 const refHHIndex = candles.findIndex(c => c.timestamp === validHH.time);

//                 const rootExtreme = {
//                     id: "ROOT_SWING_HL",
//                     validHL: rootPrice,
//                     validHLCandleIndex: swingHLIndex,
//                     confirmHH: validHH.price,
//                     confirmHHCandleIndex: refHHIndex,
//                     breakCandleIndex: refHHIndex, 
//                     startTime: rootTime
//                 };

//                 const validPullbacksForSMC = bullishPullbacks.filter(pb =>
//                     pb.validHL !== confirmedHL.price 
//                 );

//                 if (swingHLIndex !== -1 && refHHIndex !== -1) {
//                     validPullbacksForSMC.unshift(rootExtreme);
//                 }

//                 const poiZones = findSMCZones(candles, validPullbacksForSMC, i);

//                 // ==========================================================
//                 // 🔥 THE VISUAL FIX
//                 // ==========================================================
                
//                 // 1. जब नया IDM कन्फर्म होता है, तो 'signals' एरे में मौजूद पिछले सारे ज़ोन्स 'पुराने' बन जाते हैं।
//                 signals.forEach(sig => {
//                     if (["E-OB", "D-OB", "E-OF", "D-OF"].includes(sig.type)) {
                        
//                         // अगर पहले से Demand/Supply नाम नहीं हुआ है, तभी चेक करो
//                         if (!sig.displayName || (!sig.displayName.includes("Demand") && !sig.displayName.includes("Supply"))) {
//                             sig.isActive = false; // पुराने ज़ोन डीएक्टिवेट करें
                            
//                             let isMitigated = false;
//                             let startIdx = candles.findIndex(c => c.timestamp === sig.startTime);
                            
//                             if (startIdx !== -1) {
//                                 for (let j = startIdx + 3; j <= i; j++) {
//                                     // बुलिश ज़ोन के लिए चेकिंग
//                                     if (sig.trend === "BULLISH" && candles[j].low <= sig.priceTop) {
//                                         isMitigated = true;
//                                         break;
//                                     }
//                                     // बेयरिश ज़ोन के लिए चेकिंग
//                                     if (sig.trend === "BEARISH" && candles[j].high >= sig.priceBottom) {
//                                         isMitigated = true;
//                                         break;
//                                     }
//                                 }
//                             }

//                             // 🎯 सिर्फ अनमिटिगेटेड ज़ोन्स का नाम उनके ट्रेंड के हिसाब से बदलें
//                             if (!isMitigated) {
//                                 if (sig.trend === "BULLISH") {
//                                     if (sig.type === "E-OB" || sig.type === "D-OB") sig.displayName = "Demand Zone(OB)";
//                                     if (sig.type === "E-OF" || sig.type === "D-OF") sig.displayName = "Demand Zone(OF)";
//                                 } else if (sig.trend === "BEARISH") {
//                                     if (sig.type === "E-OB" || sig.type === "D-OB") sig.displayName = "Supply Zone(OB)";
//                                     if (sig.type === "E-OF" || sig.type === "D-OF") sig.displayName = "Supply Zone(OF)";
//                                 }
//                             }
//                         }
//                     }
//                 });

//                 // 2. नए (Current Structure) ज़ोन्स को सिग्नल्स में पुश करें
//                 if (poiZones.eof && !poiZones.eof.isMitigated) {
//                     let mitTimeEOF = findMitigationTime(poiZones.eof.top, i, candles);
//                     signals.push({ type: "E-OF", displayName: "E-OF", trend: "BULLISH", priceTop: poiZones.eof.top, priceBottom: poiZones.eof.bottom, startTime: poiZones.eof.startTime, endTime: mitTimeEOF, isActive: true });
//                 }
                
//                 if (poiZones.eob) {
//                     let mitTimeEOB = findMitigationTime(poiZones.eob.top, i, candles);
//                     signals.push({ type: "E-OB", displayName: "E-OB", trend: "BULLISH", priceTop: poiZones.eob.top, priceBottom: poiZones.eob.bottom, startTime: poiZones.eob.startTime, fvgTop: poiZones.eob.fvgTop, fvgBottom: poiZones.eob.fvgBottom, endTime: mitTimeEOB, isActive: true });
//                 }

//                 if (poiZones.dof && !poiZones.dof.isMitigated) {
//                     let mitTimeDOF = findMitigationTime(poiZones.dof.top, i, candles);
//                     signals.push({ type: "D-OF", displayName: "D-OF", trend: "BULLISH", priceTop: poiZones.dof.top, priceBottom: poiZones.dof.bottom, startTime: poiZones.dof.startTime, endTime: mitTimeDOF, isActive: true });
//                 }
                
//                 if (poiZones.dob) {
//                     let mitTimeDOB = findMitigationTime(poiZones.dob.top, i, candles);
//                     signals.push({ type: "D-OB", displayName: "D-OB", trend: "BULLISH", priceTop: poiZones.dob.top, priceBottom: poiZones.dob.bottom, startTime: poiZones.dob.startTime, fvgTop: poiZones.dob.fvgTop, fvgBottom: poiZones.dob.fvgBottom, endTime: mitTimeDOB, isActive: true });
//                 }
                
//                 bullishPullbacks = []; 
//                 tempPullbackTracker = null;
//                 confirmedHL = null;
//             }

//             if (isIdmTaken && curr.low < tempSwingLow.price) {
//                 tempSwingLow = { price: curr.low, time: curr.timestamp };

//                 bullishPullbacks = [];
//                 refHH = null; // ट्रैकर अनलॉक!
//                 tempPullbackTracker = null;
//             }

//             // RULE 3 & 6a: BOS & Sweep Logic
//             if (isIdmTaken && validHH !== null) {
//                 let breakLevel = refX_BOS_Bullish ? refX_BOS_Bullish.price : validHH.price;

//                 if (curr.high > breakLevel) {
//                     if (curr.close > breakLevel) { // 🚀 Full Body Break

//                         // 🔥 VISUAL FIX: लाइन हमेशा ओरिजिनल 'validHH' से ही ड्रा होगी!
//                         signals.push({
//                             type: "BOS", trend: "BULLISH",
//                             price: validHH.price,       // <-- Original Price
//                             startTime: validHH.time,    // <-- Original Time
//                             endTime: curr.timestamp
//                         });

//                         if (refX_CHoCH_Bullish) {
//                             signals.push({ type: "X", trend: "BULLISH", sweptSide: "LOW", price: lockedSwingLow.price, startTime: lockedSwingLow.time, endTime: refX_CHoCH_Bullish.time });
//                             refX_CHoCH_Bullish = null;
//                         }

//                         lockedSwingLow = { ...tempSwingLow };
//                         isIdmTaken = false;
//                         validHH = null; refHH = null; refX_BOS_Bullish = null;


//                         absoluteHighest = { price: curr.high, time: curr.timestamp };
//                     } else { // 🧹 Sweep (Ref X)
//                         refX_BOS_Bullish = { price: curr.high, time: curr.timestamp, majorIdmTarget: { ...majorIdm_Bullish } };
//                     }
//                 }

//                 if (refX_BOS_Bullish && refX_BOS_Bullish.majorIdmTarget) {
//                     if (curr.low < refX_BOS_Bullish.majorIdmTarget.price) {
//                         signals.push({ type: "IDM", trend: "BULLISH", price: refX_BOS_Bullish.majorIdmTarget.price, startTime: refX_BOS_Bullish.majorIdmTarget.time, endTime: curr.timestamp });

//                         signals.push({ type: "X", trend: "BULLISH", sweptSide: "HIGH", price: validHH.price, startTime: validHH.time, endTime: refX_BOS_Bullish.time }); // <-- यहाँ बदलाव है

//                         validHH = { price: refX_BOS_Bullish.price, time: refX_BOS_Bullish.time };
//                         refX_BOS_Bullish = null;
//                         majorIdm_Bullish = { price: curr.low, time: curr.timestamp };
//                     }
//                 }
//             }
//         }

//         refCandle = curr;
//     }

//     // ==========================================
//     // 🔥 LIVE EDGE: पेंडिंग "Ref X" को चार्ट पर भेजना
//     // ==========================================
//     const lastTime = candles[candles.length - 1].timestamp;

//     if (trend === -1) {
//         if (refX_CHoCH_Bearish && lockedSwingHigh) {
//             signals.push({ type: "Ref X", trend: "BEARISH", sweptSide: "HIGH", price: lockedSwingHigh.price, startTime: lockedSwingHigh.time, endTime: lastTime });
//         }
//         if (refX_BOS_Bearish && validLL) {
//             signals.push({ type: "Ref X", trend: "BEARISH", sweptSide: "LOW", price: validLL.price, startTime: validLL.time, endTime: lastTime });
//         }
//     } else if (trend === 1) {
//         if (refX_CHoCH_Bullish && lockedSwingLow) {
//             signals.push({ type: "Ref X", trend: "BULLISH", sweptSide: "LOW", price: lockedSwingLow.price, startTime: lockedSwingLow.time, endTime: lastTime });
//         }
//         if (refX_BOS_Bullish && validHH) {
//             signals.push({ type: "Ref X", trend: "BULLISH", sweptSide: "HIGH", price: validHH.price, startTime: validHH.time, endTime: lastTime });
//         }
//     }

//     return signals;
// };

// // ============================================================================
// // 🎯 SMC POI SCANNER BLOCK: E-OF, E-OB, D-OF, D-OB FOR BULLISH SCENARIO
// // ============================================================================

// /**
//  * 1. Pullback Zone की Mitigation चेक करने का हेल्पर फंक्शन
//  * (अगर कोई भी अगली कैंडल पुलबैक के टॉप यानी confirmHH के नीचे घुसती है, तो वो मिटिगेट माना जाएगा)
//  */
// const isPullbackMitigated = (pullback, candles, idmIndex) => {
//     // पुलबैक बनने वाले कैंडल इंडेक्स से लेकर IDM कन्फर्म होने वाले इंडेक्स तक चेक करेंगे
//     const startIndex = pullback.breakCandleIndex + 1;

//     for (let i = startIndex; i <= idmIndex; i++) {
//         if (i >= candles.length) break;
//         const currentCandle = candles[i];

//         // 🔥 रिफाइनमेंट रूल: अगर किसी भी अगली कैंडल का Low, पुलबैक के टॉप (confirmHH) के नीचे या बराबर चला जाए
//         if (currentCandle.low <= pullback.confirmHH) {
//             return true; // ज़ोन मिटिगेट (खत्म) हो गया
//         }
//     }
//     return false; // अनमिटिगेटेड है
// };

// /**
//  * 🎯 Helper: Future में Zone कब Mitigate (Tap) हुआ, उसका Time खोजना
//  */
// const findMitigationTime = (zoneTop, startIndex, candles) => {
//     // IDM वाली कैंडल (startIndex) से लेकर चार्ट के अंत तक चेक करेंगे
//     for (let j = startIndex; j < candles.length; j++) {
//         // बुलिश ज़ोन के लिए: अगर कैंडल का Low ज़ोन के Top को टच करे या नीचे जाए
//         if (candles[j].low <= zoneTop) {
//             return candles[j].timestamp; // यहाँ ज़ोन टैप (Mitigate) हो गया!
//         }
//     }
//     // अगर अभी तक टैप नहीं हुआ (Unmitigated), तो चार्ट की एकदम आखिरी कैंडल तक ज़ोन को खींच दो
//     return candles[candles.length - 1].timestamp;
// };

// /**
//  * 🎯 BEARISH Mitigation Time: कट-ऑफ टाइम ढूँढना जब प्राइस सप्लाई ज़ोन को हिट करे
//  */
// const findMitigationTime_Bearish = (zoneBottomPrice, startIndex, candles) => {
//     // IDM के बाद वाली कैंडल से स्कैन शुरू करेंगे
//     for (let j = startIndex + 1; j < candles.length; j++) {
//         // 🎯 Bearish Rule: क्या प्राइस नीचे से ऊपर जाकर ज़ोन के बॉटम से टकराया?
//         if (candles[j].high >= zoneBottomPrice) {
//             return candles[j].timestamp; // जैसे ही टच हुआ, वही टाइम लॉक कर दो
//         }
//     }
//     // अगर किसी ने टच नहीं किया (Unmitigated), तो चार्ट के अंत तक बॉक्स खींच दो
//     return candles[candles.length - 1].timestamp; 
// };


// /**
//  * 🎯 Helper: Check if Order Flow (Pullback) is Mitigated
//  */
// // const isOfMitigated = (pb, candles, currentIndex) => {
// //     // ब्रेकआउट कैंडल के बाद से IDM तक चेक करेंगे
// //     const startIdx = pb.breakCandleIndex + 1;
// //     for (let j = startIdx; j <= currentIndex; j++) {
// //         if (j >= candles.length) break;
// //         // बुलिश में: अगर कोई कैंडल OF के टॉप (confirmHH) को नीचे की तरफ टच कर दे
// //         if (candles[j].low <= pb.confirmHH) {
// //             return true; // OF मिटिगेट हो गया!
// //         }
// //     }
// //     return false; // OF अभी भी फ्रेश है!
// // };


// // /**
// //  * 🎯 Helper: Check if Bearish Order Flow (Pullback) is Mitigated
// //  */
// // const isOfMitigated_Bearish = (pb, candles, currentIndex) => {
// //     // ब्रेकआउट कैंडल के बाद से IDM तक चेक करेंगे
// //     const startIdx = pb.breakCandleIndex + 1;
// //     for (let j = startIdx; j <= currentIndex; j++) {
// //         if (j >= candles.length) break;
// //         // 🎯 Bearish में: अगर कोई कैंडल ऊपर उठकर OF के बॉटम (confirmLL) को टच कर दे
// //         if (candles[j].high >= pb.confirmLL) {
// //             return true; // OF मिटिगेट हो गया!
// //         }
// //     }
// //     return false; // OF अभी भी फ्रेश है!
// // };


// /**
//  * 🎯 Helper: Check if Bullish Order Flow is Mitigated (TAPPED)
//  */
// const isOfMitigated = (pb, candles, currentIndex) => {
//     const startIdx = pb.breakCandleIndex + 1;
//     for (let j = startIdx; j <= currentIndex; j++) {
//         if (j >= candles.length) break;

//         // 🎯 SMC Rule: बुलिश OF का टॉप (confirmHH) है। 
//         // प्राइस जैसे ही नीचे गिरकर इसे टच करेगा, ज़ोन मिटिगेट!
//         if (candles[j].low <= pb.confirmHH) { 
//             return true; 
//         }
//     }
//     return false; // टच नहीं हुआ, मतलब फ्रेश है!
// };

// /**
//  * 🎯 Helper: Check if Bearish Order Flow is Mitigated (TAPPED)
//  */
// const isOfMitigated_Bearish = (pb, candles, currentIndex) => {
//     const startIdx = pb.breakCandleIndex + 1;
//     for (let j = startIdx; j <= currentIndex; j++) {
//         if (j >= candles.length) break;
        
//         // 🎯 SMC Rule: बेयरिश OF का बॉटम (confirmLL) है।
//         // प्राइस जैसे ही ऊपर उठकर इसे टच करेगा, ज़ोन मिटिगेट!
//         if (candles[j].high >= pb.confirmLL) { 
//             return true; 
//         }
//     }
//     return false; // टच नहीं हुआ, मतलब फ्रेश है!
// };

// /**
//  * 🎯 E-OB / D-OB ढूँढने का "Swing HL to Ref HH" एडवांस लॉजिक
//  */
// const findValidOrderBlock = (pullback, candles, currentIndex) => {
    
//     // 1. Start: "Swing HL" वाली कैंडल को ही exactly 1st कैंडल मानेंगे (No -1 logic)
//     const startIdx = pullback.validHLCandleIndex; 
    
//     // 2. Limitation: FVG चेक करते हुए सिर्फ "Ref HH" (Breakout Candle) तक ही जाएंगे
//     const endIdx = pullback.breakCandleIndex; 

//     // 1-1 कैंडल ऊपर बढ़ते जाएंगे
//     for (let i = startIdx; i <= endIdx; i++) {
//         if (i + 2 >= candles.length) continue;

//         const firstCandle = candles[i];
//         const thirdCandle = candles[i + 2];

//         // 3. FVG Check: क्या इस 1st कैंडल और 3rd कैंडल के बीच FVG (Imbalance) है?
//         if (firstCandle.high < thirdCandle.low) {
            
//             // Mitigation चेक (क्या भविष्य में ये कैंडल टच हुई है?)
//             let isMitigated = false;
//             for (let j = i + 3; j <= currentIndex; j++) {
//                 if (j >= candles.length) break;
//                 if (candles[j].low <= firstCandle.high) {
//                     isMitigated = true;
//                     break;
//                 }
//             }

//             if (!isMitigated) {
//                 // ✅ 4. FVG मिल गया! अब इसी 1st Candle के High और Low से रेक्टेंगल बॉक्स ड्रा होगा।
//                 return {
//                     found: true,
//                     price: { high: firstCandle.high, low: firstCandle.low }, // 1st कैंडल का High-Low
//                     fvgZone: { top: thirdCandle.low, bottom: firstCandle.high },
//                     startTime: firstCandle.timestamp, // बॉक्स यहीं से शुरू होगा
//                     candleIndex: i
//                 };
//             }
//         }
//     }

//     // 5. Fallback: अगर Swing HL से Ref HH तक कोई फ्रेश FVG नहीं मिला, 
//     // तो इंजन 'false' रिटर्न करेगा और हमारा 'पुलबैक शिफ्ट लॉजिक' (2nd Pullback check) स्टार्ट हो जाएगा!
//     return { found: false };
// };


// /**
//  * 🎯 E-OB / D-OB ढूँढने का BEARISH SMC रूल: "Swing High to Ref LL"
//  */
// const findBearishValidOrderBlock = (pullback, candles, currentIndex) => {
    
//     // 1. Start: "Swing High" (Top) वाली कैंडल को 1st कैंडल मानेंगे
//     const startIdx = pullback.validLHCandleIndex; // Bearish में Lower High (LH)
//     const endIdx = pullback.breakCandleIndex; 

//     for (let i = startIdx; i <= endIdx; i++) {
//         if (i + 2 >= candles.length) continue;

//         const firstCandle = candles[i];
//         const thirdCandle = candles[i + 2];

//         // 2. Bearish FVG Check: क्या 1st कैंडल का Low, 3rd कैंडल के High से ऊपर है? (Imbalance)
//         if (firstCandle.low > thirdCandle.high) {
            
//             // Mitigation चेक (क्या भविष्य में मार्केट ऊपर आकर इसे टच किया है?)
//             let isMitigated = false;
//             for (let j = i + 3; j <= currentIndex; j++) {
//                 if (j >= candles.length) break;
//                 // 🎯 Bearish में कैंडल का High ज़ोन के Bottom (firstCandle.low) को टच करता है
//                 if (candles[j].high >= firstCandle.low) { 
//                     isMitigated = true;
//                     break;
//                 }
//             }

//             if (!isMitigated) {
//                 // ✅ 3. Bearish FVG मिल गया!
//                 return {
//                     found: true,
//                     // Bearish बॉक्स का Top (High) और Bottom (Low)
//                     price: { top: firstCandle.high, bottom: firstCandle.low }, 
//                     fvgZone: { top: firstCandle.low, bottom: thirdCandle.high },
//                     startTime: firstCandle.timestamp,
//                     candleIndex: i
//                 };
//             }
//         }
//     }
//     return { found: false };
// };

// /**
//  * 🎯 MAIN POI ENGINE: Extreme & Decisional ज़ोन फ़िल्टर
//  */
// const findSMCZones = (candles, pullbacksArray, currentIndex) => {
//     let smcZones = { eof: null, eob: null, dof: null, dob: null };
//     if (!pullbacksArray || pullbacksArray.length === 0) return smcZones;

//     // ==============================================================
//     // 🔥 1. EXTREME ZONES (E-OF / E-OB)
//     // ==============================================================
//     for (let i = 0; i < pullbacksArray.length; i++) {
//         const pb = pullbacksArray[i];
//         const obResult = findValidOrderBlock(pb, candles, currentIndex);

//         if (obResult.found) {
//             const mitigatedOF = isOfMitigated(pb, candles, currentIndex);
//             smcZones.eof = { type: "E-OF", top: pb.confirmHH, bottom: pb.validHL, startTime: pb.startTime, isMitigated: mitigatedOF, data: pb };
            
//             // यहाँ 'obResult.startTime' का यूज़ करना बहुत ज़रूरी है
//             smcZones.eob = { 
//                 type: "E-OB", 
//                 top: obResult.price.high, 
//                 bottom: obResult.price.low, 
//                 startTime: obResult.startTime, // बॉक्स अब यहीं से शुरू होगा
//                 fvgTop: obResult.fvgZone.top, 
//                 fvgBottom: obResult.fvgZone.bottom 
//             };
//             break; 
//         }
//     }

//     // ==============================================================
//     // 🔥 2. DECISIONAL ZONES (D-OF / D-OB) - UPDATED DYNAMIC LOGIC
//     // ==============================================================
//     for (let i = pullbacksArray.length - 1; i >= 0; i--) {
//         const pb = pullbacksArray[i];
//         if (smcZones.eof && smcZones.eof.data.id === pb.id) break;

//         const obResult = findValidOrderBlock(pb, candles, currentIndex);

//         if (obResult.found) {
//             // 🎯 THE OVERLAP GUARD: अगर D-OB का टाइम E-OB से टकरा रहा है, तो इसे स्किप कर दो!
//             if (smcZones.eob && smcZones.eob.startTime === obResult.startTime) {
//                 continue; 
//             }

//             const mitigatedOF = isOfMitigated(pb, candles, currentIndex);
            
//             smcZones.dof = { 
//                 type: "D-OF", top: pb.confirmHH, bottom: pb.validHL, startTime: pb.startTime, isMitigated: mitigatedOF, data: pb 
//             };

//             smcZones.dob = { 
//                 type: "D-OB", top: obResult.price.high, bottom: obResult.price.low, startTime: obResult.startTime, fvgTop: obResult.fvgZone.top, fvgBottom: obResult.fvgZone.bottom, data: pb
//             };
//             break; 
//         }
//     }
//     return smcZones;
// };


// const findSMCZones_Bearish = (candles, pullbacksArray, currentIndex) => {
//     let smcZones = { eof: null, eob: null, dof: null, dob: null };
//     if (!pullbacksArray || pullbacksArray.length === 0) return smcZones;

//     // ==============================================================
//     // 🔥 1. EXTREME ZONES (E-OF / E-OB) - Bearish
//     // ==============================================================
//     // यहाँ हम लूप लगा रहे हैं ताकि अगर पहला लेग फेल हो जाए, तो इंजन अगले लेग को चेक करे
//     for (let i = 0; i < pullbacksArray.length; i++) {
//         const pb = pullbacksArray[i];
//         const obResult = findBearishValidOrderBlock(pb, candles, currentIndex);

//         if (obResult.found) {
//             // 🎯 असली जादू यहाँ है: अब हम चेक कर रहे हैं कि OF मिटिगेट हुआ है या नहीं!
//             const mitigatedOF = isOfMitigated_Bearish(pb, candles, currentIndex);
            
//             smcZones.eof = { 
//                 type: "E-OF", 
//                 top: pb.validLH,       // Bearish pullback top (Supply)
//                 bottom: pb.confirmLL,  // Bearish pullback bottom (Break point)
//                 startTime: pb.startTime, 
//                 isMitigated: mitigatedOF, // 🚀 अब यह डायनामिक है!
//                 data: pb 
//             };
            
//             smcZones.eob = { 
//                 type: "E-OB", 
//                 top: obResult.price.top, 
//                 bottom: obResult.price.bottom, 
//                 startTime: obResult.startTime, 
//                 fvgTop: obResult.fvgZone.top, 
//                 fvgBottom: obResult.fvgZone.bottom 
//             };
//             break; 
//         }
//     }

//     // ==============================================================
//     // 🔥 2. DECISIONAL ZONES (D-OF / D-OB) - BEARISH
//     // ==============================================================
//     for (let i = pullbacksArray.length - 1; i >= 0; i--) {
//         const pb = pullbacksArray[i];
        
//         if (smcZones.eof && smcZones.eof.data.id === pb.id) break;

//         const obResult = findBearishValidOrderBlock(pb, candles, currentIndex);

//         if (obResult.found) {
//             // 🎯 THE OVERLAP GUARD: अगर D-OB का टाइम E-OB से टकरा रहा है, तो इसे स्किप कर दो!
//             if (smcZones.eob && smcZones.eob.startTime === obResult.startTime) {
//                 continue; 
//             }

//             const mitigatedOF = isOfMitigated_Bearish(pb, candles, currentIndex);
            
//             smcZones.dof = { 
//                 type: "D-OF", top: pb.validLH, bottom: pb.confirmLL, startTime: pb.startTime, isMitigated: mitigatedOF, data: pb 
//             };

//             smcZones.dob = { 
//                 type: "D-OB", top: obResult.price.top, bottom: obResult.price.bottom, startTime: obResult.startTime, fvgTop: obResult.fvgZone.top, fvgBottom: obResult.fvgZone.bottom, data: pb
//             };
//             break; 
//         }
//     }
    
//     return smcZones;
// };

// // ___________________________________________________________________________________________________


// // 🎯 MAIN SCANNER
// const checkPriceActionSignal = (htfCandles, ltfCandles, setupType, startingTrend = "AUTO") => {
//     let signal = { long: false, short: false, reason: "" };

//     if (!htfCandles || htfCandles.length < 15 || !ltfCandles || ltfCandles.length === 0) {
//         return signal;
//     }

//     const htfSignals = identifyMechanicalStructure(htfCandles, startingTrend);
//     if (htfSignals.length === 0) return signal;

//     const latestSignal = htfSignals[htfSignals.length - 1];

//     // 🔥 THE FIX: 'isRecent' वाला टाइम लिमिट पूरी तरह हटा दिया गया है!
//     // अब इंजन को कोई फर्क नहीं पड़ता कि BOS/CHoCH कब हुआ था। 
//     // जो भी आख़िरी स्ट्रक्चर है, वही मास्टर ट्रेंड माना जाएगा।

//     let htfSignalLong = false;
//     let htfSignalShort = false;

//     if (setupType === "BOS (Break of Structure)" && latestSignal.type === "BOS") {
//         if (latestSignal.trend === "BULLISH") htfSignalLong = true;
//         if (latestSignal.trend === "BEARISH") htfSignalShort = true;
//     }
//     else if (setupType === "CHoCH (Change of Character)" && latestSignal.type === "CHoCH") {
//         if (latestSignal.trend === "BULLISH") htfSignalLong = true;
//         if (latestSignal.trend === "BEARISH") htfSignalShort = true;
//     }

//     // 3. LTF Delivery Boy (1-Min Confirmation)
//     if (htfSignalLong || htfSignalShort) {
//         const currentLtfCandle = ltfCandles[ltfCandles.length - 1];

//         const isLtfBullish = currentLtfCandle.close > currentLtfCandle.open;
//         const isLtfBearish = currentLtfCandle.close < currentLtfCandle.open;

//         if (htfSignalLong && isLtfBullish) {
//             signal.long = true;
//             signal.reason = `HTF ${latestSignal.type} Bullish + LTF Confirm`;
//         }
//         else if (htfSignalShort && isLtfBearish) {
//             signal.short = true;
//             signal.reason = `HTF ${latestSignal.type} Bearish + LTF Confirm`;
//         }
//     }
//     return signal;
// };

// module.exports = { identifyMechanicalStructure, checkPriceActionSignal };





// const identifyMechanicalStructure = (candles, startingTrend = "AUTO") => {

//     // 🔥 2. User Input के हिसाब से Initial Trend सेट करें
//     let trend = 0;
//     if (startingTrend === "BULLISH") trend = 1;
//     else if (startingTrend === "BEARISH") trend = -1;
//     else {
//         // AUTO Mode: बेसिक शुरुआत (आगे जाकर Smart Auto इसे फिक्स कर लेगा)
//         trend = candles.length > 5 ? (candles[5].close > candles[0].close ? 1 : -1) : 1;
//     }


//     let signals = [];
//     if (candles.length === 0) return signals;

//     let refCandle = candles[0];

//     // ==========================================
//     // 📉 BEARISH STATE VARIABLES
//     // ==========================================
//     let refLL = null;
//     let tempLH = null;
//     let confirmedLH = null;
//     let validLL = null;
//     let tempSwingHigh = null;
//     let lockedSwingHigh = null;
//     let absoluteLowest = { price: candles[0].low, time: candles[0].timestamp };

//     let bearishPullbacks = []; 
//     let tempPullbackTracker_Bearish = null;

//     // 🔥 Liquidity Sweep (X) Variables
//     let refX_BOS_Bearish = null;
//     let majorIdm_Bearish = { price: -Infinity, time: null };
//     let refX_CHoCH_Bearish = null;

//     // ==========================================
//     // 📈 BULLISH STATE VARIABLES
//     // ==========================================
//     let refHH = null;
//     let tempHL = null;
//     let confirmedHL = null;
//     let validHH = null;

//     let tempSwingLow = null;
//     let lockedSwingLow = null;
//     let absoluteHighest = { price: candles[0].high, time: candles[0].timestamp };

//     // 🔥 NAYA CODE: Pullbacks Store करने के लिए
//     let bullishPullbacks = [];
//     let tempPullbackTracker = null;

//     // 🔥 Liquidity Sweep (X) Variables
//     let refX_BOS_Bullish = null;
//     let majorIdm_Bullish = { price: Infinity, time: null };
//     let refX_CHoCH_Bullish = null;

//     let isIdmTaken = false;

//     let current_bullish_structure = [];
//     let previous_bullish_structure = [];


//     // 🔥 NEW: COUNTER STRUCTURE (D2S) VARIABLES FOR BULLISH TREND
//     let isDobTapped_D2S = false;
//     let tappingCandle_D2S = null;
//     let isDobFailed_D2S = false;
//     let refLL_D2S = null;
//     let tempLH_D2S = null;
//     let confirmedLH_D2S = null;
//     let idm_D2S_Taken = false;
    

//     for (let i = 1; i < candles.length; i++) {
//         const curr = candles[i];

//         const prevAbsoluteHighest = absoluteHighest.price;
//         const prevAbsoluteLowest = absoluteLowest.price;

//         // अब नया हाई/लो अपडेट करें
//         if (curr.low < absoluteLowest.price) absoluteLowest = { price: curr.low, time: curr.timestamp };
//         if (curr.high > absoluteHighest.price) absoluteHighest = { price: curr.high, time: curr.timestamp };

//         let isInsideBar = curr.high <= refCandle.high && curr.low >= refCandle.low;
//         let isOutsideBar = curr.high > refCandle.high && curr.low < refCandle.low;

//         if (isInsideBar) continue;

//         let brokeHigh = curr.high > refCandle.high;
//         let brokeLow = curr.low < refCandle.low;

//         // ==========================================
//         // 📉 BEARISH STRUCTURE LOGIC (-1)
//         // ==========================================
//         if (trend === -1) {

//             // 🔥 SMART AUTO FIX (यहाँ सबसे ऊपर रहेगा!): 
//             if (startingTrend === "AUTO" && lockedSwingHigh === null && curr.close > prevAbsoluteHighest) {
//                 trend = 1;
//                 isIdmTaken = false;
//                 validLL = null; refLL = null; tempSwingHigh = null; confirmedLH = null;
                
//                 bearishPullbacks = []; // 🎯 Added
//                 tempPullbackTracker_Bearish = null; // 🎯 Added

//                 absoluteLowest = { price: curr.low, time: curr.timestamp }; 
//                 refCandle = curr;
//                 continue;
//             }

//             if (isIdmTaken) {
//                 if (curr.high > majorIdm_Bearish.price) majorIdm_Bearish = { price: curr.high, time: curr.timestamp };
//             }

//             // RULE 5 & 6c: CHoCH & Sweep Logic
//             if (lockedSwingHigh !== null) {
//                 let breakLevel = refX_CHoCH_Bearish ? refX_CHoCH_Bearish.price : lockedSwingHigh.price;

//                 if (curr.high > breakLevel) {
//                     if (curr.close > breakLevel) { // 🚀 Full Body Break (Valid CHoCH)

//                         signals.push({
//                             type: "CHoCH", trend: "BULLISH",
//                             sweptSide: "HIGH",
//                             price: lockedSwingHigh.price,
//                             startTime: lockedSwingHigh.time,
//                             endTime: curr.timestamp
//                         });

//                         trend = 1;
//                         isIdmTaken = false;
//                         lockedSwingLow = { ...absoluteLowest };
//                         validLL = null; refLL = null; tempSwingHigh = null; lockedSwingHigh = null; confirmedLH = null;
//                         refX_CHoCH_Bearish = null; refX_BOS_Bearish = null;
                        
//                         bearishPullbacks = []; // 🎯 Added
//                         tempPullbackTracker_Bearish = null; // 🎯 Added

//                         absoluteHighest = { price: curr.high, time: curr.timestamp };
//                         refCandle = curr;
//                         continue;
//                     } else { // 🧹 Sweep (Ref X)
//                         refX_CHoCH_Bearish = { price: curr.high, time: curr.timestamp };
//                     }
//                 }
//             }

//             // ==========================================================
//             // 🔥 BULLETPROOF PULLBACK TRACKER (Bearish)
//             // ==========================================================
//             if (brokeHigh && !isOutsideBar && refLL === null) { 
//                 refLL = { price: refCandle.low, time: refCandle.timestamp };
//                 tempLH = { price: curr.high, time: curr.timestamp };
                
//                 tempPullbackTracker_Bearish = {
//                     id: bearishPullbacks.length + 1,
//                     confirmLL: refCandle.low,
//                     confirmLLCandleIndex: i - 1, 
//                     validLH: curr.high,
//                     validLHCandleIndex: i, 
//                     startTime: refCandle.timestamp
//                 };
//             } else if (refLL !== null) { 
//                 if (curr.high > tempLH.price) {
//                     tempLH = { price: curr.high, time: curr.timestamp };
//                     if (tempPullbackTracker_Bearish) {
//                         tempPullbackTracker_Bearish.validLH = curr.high;
//                         tempPullbackTracker_Bearish.validLHCandleIndex = i;
//                     }
//                 }
                
//                 // 🔥 THE FIX: SMC True Pullback Confirmation Rule
//                 // पुलबैक तब कन्फर्म होता है जब कोई कैंडल पिछली कैंडल का Low तोड़ दे (brokeLow), 
//                 // या फिर मार्केट सच में पूरा नीचे गिरकर refLL को तोड़ दे।
//                 if (brokeLow || curr.low <= refLL.price) { 
//                     // ❌ 1-Candle Fake Sweep Filter
//                     if (curr.timestamp === tempLH.time && curr.low <= refLL.price) {
//                         refLL = null; 
//                         tempPullbackTracker_Bearish = null; 
//                     } else {
//                         // ✅ Valid Pullback (Confirm)
//                         confirmedLH = tempLH; 
//                         refLL = null; // Reset tracker for next pullback
                        
//                         if (tempPullbackTracker_Bearish) {
//                             tempPullbackTracker_Bearish.breakCandleIndex = i;
//                             bearishPullbacks.push({...tempPullbackTracker_Bearish});
//                             tempPullbackTracker_Bearish = null; 
//                         }
//                     }
//                 }
//             }

//             // 🎯 THE FINAL IDM CONFIRMATION & SUPPLY ZONE TRANSFORMATION
//             if (confirmedLH !== null && curr.high >= confirmedLH.price && !isIdmTaken) {
//                 isIdmTaken = true;
//                 validLL = { ...absoluteLowest };
//                 tempSwingHigh = { price: curr.high, time: curr.timestamp };
//                 majorIdm_Bearish = { price: curr.high, time: curr.timestamp };
//                 signals.push({ type: "IDM", trend: "BEARISH", price: confirmedLH.price, startTime: confirmedLH.time, endTime: curr.timestamp });

//                 // 🔥 1. THE ROOT EXTREME FIX
//                 const rootTime = lockedSwingHigh ? lockedSwingHigh.time : absoluteHighest.time;
//                 const rootPrice = lockedSwingHigh ? lockedSwingHigh.price : absoluteHighest.price;

//                 const swingLHIndex = candles.findIndex(c => c.timestamp === rootTime);
//                 const refLLIndex = candles.findIndex(c => c.timestamp === validLL.time);

//                 const rootExtreme = {
//                     id: "ROOT_SWING_LH",
//                     validLH: rootPrice,
//                     validLHCandleIndex: swingLHIndex,
//                     confirmLL: validLL.price,
//                     confirmLLCandleIndex: refLLIndex,
//                     breakCandleIndex: refLLIndex, 
//                     startTime: rootTime
//                 };

//                 const validPullbacksForSMC = bearishPullbacks.filter(pb => pb.validLH !== confirmedLH.price);

//                 if (swingLHIndex !== -1 && refLLIndex !== -1) {
//                     validPullbacksForSMC.unshift(rootExtreme);
//                 }

//                 const poiZones = findSMCZones_Bearish(candles, validPullbacksForSMC, i);

//                 // 🔥 2. THE MASTER STATE MANAGEMENT
//                 signals.forEach(sig => {
//                     if (["E-OB", "D-OB", "E-OF", "D-OF"].includes(sig.type)) {
                        
//                         // अगर पहले से Demand/Supply नाम नहीं हुआ है, तभी चेक करो
//                         if (!sig.displayName || (!sig.displayName.includes("Demand") && !sig.displayName.includes("Supply"))) {
//                             sig.isActive = false; // पुराने ज़ोन डीएक्टिवेट करें
                            
//                             let isMitigated = false;
//                             let startIdx = candles.findIndex(c => c.timestamp === sig.startTime);
                            
//                             if (startIdx !== -1) {
//                                 for (let j = startIdx + 3; j <= i; j++) {
//                                     // बुलिश ज़ोन के लिए चेकिंग
//                                     if (sig.trend === "BULLISH" && candles[j].low <= sig.priceTop) {
//                                         isMitigated = true;
//                                         break;
//                                     }
//                                     // बेयरिश ज़ोन के लिए चेकिंग
//                                     if (sig.trend === "BEARISH" && candles[j].high >= sig.priceBottom) {
//                                         isMitigated = true;
//                                         break;
//                                     }
//                                 }
//                             }

//                             // 🎯 सिर्फ अनमिटिगेटेड ज़ोन्स का नाम उनके ट्रेंड के हिसाब से बदलें
//                             if (!isMitigated) {
//                                 if (sig.trend === "BULLISH") {
//                                     if (sig.type === "E-OB" || sig.type === "D-OB") sig.displayName = "Demand Zone(OB)";
//                                     if (sig.type === "E-OF" || sig.type === "D-OF") sig.displayName = "Demand Zone(OF)";
//                                 } else if (sig.trend === "BEARISH") {
//                                     if (sig.type === "E-OB" || sig.type === "D-OB") sig.displayName = "Supply Zone(OB)";
//                                     if (sig.type === "E-OF" || sig.type === "D-OF") sig.displayName = "Supply Zone(OF)";
//                                 }
//                             }
//                         }
//                     }
//                 });

//                 // 🔥 3. THE VISUAL FIX
//                 if (poiZones.eof && !poiZones.eof.isMitigated) {
//                     let mitTimeEOF = findMitigationTime_Bearish(poiZones.eof.bottom, i, candles);
//                     signals.push({ type: "E-OF", displayName: "E-OF", trend: "BEARISH", priceTop: poiZones.eof.top, priceBottom: poiZones.eof.bottom, startTime: poiZones.eof.startTime, endTime: mitTimeEOF, isActive: true });
//                 }
//                 if (poiZones.eob) {
//                     let mitTimeEOB = findMitigationTime_Bearish(poiZones.eob.bottom, i, candles);
//                     signals.push({ type: "E-OB", displayName: "E-OB", trend: "BEARISH", priceTop: poiZones.eob.top, priceBottom: poiZones.eob.bottom, startTime: poiZones.eob.startTime, fvgTop: poiZones.eob.fvgTop, fvgBottom: poiZones.eob.fvgBottom, endTime: mitTimeEOB, isActive: true });
//                 }
//                 if (poiZones.dof && !poiZones.dof.isMitigated) {
//                     let mitTimeDOF = findMitigationTime_Bearish(poiZones.dof.bottom, i, candles);
//                     signals.push({ type: "D-OF", displayName: "D-OF", trend: "BEARISH", priceTop: poiZones.dof.top, priceBottom: poiZones.dof.bottom, startTime: poiZones.dof.startTime, endTime: mitTimeDOF, isActive: true });
//                 }
//                 if (poiZones.dob) {
//                     let mitTimeDOB = findMitigationTime_Bearish(poiZones.dob.bottom, i, candles);
//                     signals.push({ type: "D-OB", displayName: "D-OB", trend: "BEARISH", priceTop: poiZones.dob.top, priceBottom: poiZones.dob.bottom, startTime: poiZones.dob.startTime, fvgTop: poiZones.dob.fvgTop, fvgBottom: poiZones.dob.fvgBottom, endTime: mitTimeDOB, isActive: true });
//                 }
                
//                 bearishPullbacks = []; 
//                 tempPullbackTracker_Bearish = null;
//                 confirmedLH = null;
//             }

//             // 🎯 New High before BOS (Unlock Tracker)
//             if (isIdmTaken && curr.high > tempSwingHigh.price) {
//                 tempSwingHigh = { price: curr.high, time: curr.timestamp };
//                 bearishPullbacks = []; // 🎯 Added
//                 refLL = null; 
//                 tempPullbackTracker_Bearish = null; // 🎯 Added
//             }

//             // RULE 3 & 6a: BOS & Sweep Logic
//             if (isIdmTaken && validLL !== null) {
//                 let breakLevel = refX_BOS_Bearish ? refX_BOS_Bearish.price : validLL.price;

//                 if (curr.low < breakLevel) {
//                     if (curr.close < breakLevel) { // 🚀 Full Body Break (Valid BOS)
//                         signals.push({
//                             type: "BOS", trend: "BEARISH",
//                             price: validLL.price, 
//                             startTime: validLL.time, 
//                             endTime: curr.timestamp
//                         });

//                         if (refX_CHoCH_Bearish) {
//                             signals.push({ type: "X", trend: "BEARISH", price: lockedSwingHigh.price, startTime: lockedSwingHigh.time, endTime: refX_CHoCH_Bearish.time });
//                             refX_CHoCH_Bearish = null;
//                         }

//                         lockedSwingHigh = { ...tempSwingHigh };
//                         isIdmTaken = false;
//                         validLL = null; refLL = null; refX_BOS_Bearish = null;
                        
//                         // 🔥 THE MASTER FIX: BOS के बाद पुरानी IDM मेमोरी को जड़ से मिटाएं!
//                         confirmedLH = null; 
//                         bearishPullbacks = []; 
//                         tempPullbackTracker_Bearish = null; 
                        
//                         absoluteLowest = { price: curr.low, time: curr.timestamp };
//                     } else { // 🧹 Sweep (Ref X)
//                         refX_BOS_Bearish = { price: curr.low, time: curr.timestamp, majorIdmTarget: { ...majorIdm_Bearish } };
//                     }
//                 }

//                 if (refX_BOS_Bearish && refX_BOS_Bearish.majorIdmTarget) {
//                     if (curr.high > refX_BOS_Bearish.majorIdmTarget.price) {
//                         signals.push({ type: "IDM", trend: "BEARISH", price: refX_BOS_Bearish.majorIdmTarget.price, startTime: refX_BOS_Bearish.majorIdmTarget.time, endTime: curr.timestamp });
//                         signals.push({ type: "X", trend: "BEARISH", sweptSide: "LOW", price: validLL.price, startTime: validLL.time, endTime: refX_BOS_Bearish.time });

//                         validLL = { price: refX_BOS_Bearish.price, time: refX_BOS_Bearish.time };
//                         refX_BOS_Bearish = null;
//                         majorIdm_Bearish = { price: curr.high, time: curr.timestamp };
//                     }
//                 }
//             }
//         }

//         // ==========================================
//         // 📈 BULLISH STRUCTURE LOGIC (1)
//         // ==========================================
//         else if (trend === 1) {

//             // 🔥 SMART AUTO FIX (यहाँ सबसे ऊपर रहेगा!): 
//             // अगर कोई BOS नहीं हुआ है और मार्केट क्रैश होकर एकदम बॉटम को तोड़ दे
//             if (startingTrend === "AUTO" && lockedSwingLow === null && curr.close < prevAbsoluteLowest) {
//                 trend = -1;
//                 isIdmTaken = false;
//                 validHH = null; refHH = null; tempSwingLow = null; confirmedHL = null;

//                 bullishPullbacks = [];
//                 tempPullbackTracker = null;

//                 absoluteHighest = { price: curr.high, time: curr.timestamp }; // नई शुरुआत के लिए टॉप सेट करें
//                 refCandle = curr;
//                 continue;
//             }

//             if (isIdmTaken) {
//                 if (curr.low < majorIdm_Bullish.price) majorIdm_Bullish = { price: curr.low, time: curr.timestamp };
//             }

//             // RULE 5 & 6c: CHoCH & Sweep Logic
//             if (lockedSwingLow !== null) {
//                 let breakLevel = refX_CHoCH_Bullish ? refX_CHoCH_Bullish.price : lockedSwingLow.price;

//                 if (curr.low < breakLevel) {
//                     if (curr.close < breakLevel) { // 🚀 Full Body Break

//                         // 🔥 VISUAL FIX: लाइन हमेशा ओरिजिनल 'lockedSwingLow' से ही ड्रा होगी!
//                         signals.push({
//                             type: "CHoCH", trend: "BEARISH",
//                             price: lockedSwingLow.price,     // <-- Original Price
//                             startTime: lockedSwingLow.time,  // <-- Original Time
//                             endTime: curr.timestamp
//                         });

//                         trend = -1;
//                         isIdmTaken = false;
//                         lockedSwingHigh = { ...absoluteHighest };
//                         validHH = null; refHH = null; tempSwingLow = null; lockedSwingLow = null; confirmedHL = null;
//                         refX_CHoCH_Bullish = null; refX_BOS_Bullish = null;

//                         bullishPullbacks = [];
//                         tempPullbackTracker = null;

//                         absoluteLowest = { price: curr.low, time: curr.timestamp };
//                         refCandle = curr;
//                         continue;
//                     } else { // 🧹 Sweep (Ref X)
//                         refX_CHoCH_Bullish = { price: curr.low, time: curr.timestamp };
//                     }
//                 }
//             }

//            // ==========================================================
//             // 🔥 BULLETPROOF PULLBACK TRACKER (Bullish)
//             // ==========================================================
//             if (brokeLow && !isOutsideBar && refHH === null) { 
//                 refHH = { price: refCandle.high, time: refCandle.timestamp };
//                 tempHL = { price: curr.low, time: curr.timestamp };
                
//                 tempPullbackTracker = {
//                     id: bullishPullbacks.length + 1,
//                     confirmHH: refCandle.high,
//                     confirmHHCandleIndex: i - 1, 
//                     validHL: curr.low,
//                     validHLCandleIndex: i, 
//                     startTime: refCandle.timestamp
//                 };
//             } else if (refHH !== null) { 
//                 if (curr.low < tempHL.price) {
//                     tempHL = { price: curr.low, time: curr.timestamp };
//                     if (tempPullbackTracker) {
//                         tempPullbackTracker.validHL = curr.low;
//                         tempPullbackTracker.validHLCandleIndex = i;
//                     }
//                 }
                
//                 // 🔥 THE FIX: SMC True Pullback Confirmation Rule
//                 // पुलबैक तब कन्फर्म होता है जब कोई कैंडल पिछली कैंडल का High तोड़ दे (brokeHigh),
//                 // या फिर मार्केट सच में पूरा ऊपर जाकर refHH को तोड़ दे।
//                 if (brokeHigh || curr.high >= refHH.price) { 
//                     // ❌ 1-Candle Fake Sweep Filter
//                     if (curr.timestamp === tempHL.time && curr.high >= refHH.price) {
//                         refHH = null; 
//                         tempPullbackTracker = null; 
//                     } else {
//                         // ✅ Valid Pullback (Confirm)
//                         confirmedHL = tempHL; 
//                         refHH = null; // Reset tracker for next pullback
                        
//                         if (tempPullbackTracker) {
//                             tempPullbackTracker.breakCandleIndex = i;
//                             bullishPullbacks.push({...tempPullbackTracker});
//                             tempPullbackTracker = null; 
//                         }
//                     }
//                 }
//             }

//             if (confirmedHL !== null && curr.low <= confirmedHL.price && !isIdmTaken) {
//                 isIdmTaken = true;
//                 validHH = { ...absoluteHighest };
//                 tempSwingLow = { price: curr.low, time: curr.timestamp };
//                 majorIdm_Bullish = { price: curr.low, time: curr.timestamp };
//                 signals.push({ type: "IDM", trend: "BULLISH", price: confirmedHL.price, startTime: confirmedHL.time, endTime: curr.timestamp });

//                 // ==========================================================
//                 // 🔥 THE ROOT EXTREME FIX (Null Crash Fix)
//                 // ==========================================================
                
//                 // 1. सेफ़्टी चेक: अगर पहली लहर (First Wave) है और lockedSwingLow अभी null है, 
//                 // तो इंजन बॉटम के लिए absoluteLowest का यूज़ करेगा!
//                 const rootTime = lockedSwingLow ? lockedSwingLow.time : absoluteLowest.time;
//                 const rootPrice = lockedSwingLow ? lockedSwingLow.price : absoluteLowest.price;

//                 const swingHLIndex = candles.findIndex(c => c.timestamp === rootTime);
//                 const refHHIndex = candles.findIndex(c => c.timestamp === validHH.time);

//                 const rootExtreme = {
//                     id: "ROOT_SWING_HL",
//                     validHL: rootPrice,
//                     validHLCandleIndex: swingHLIndex,
//                     confirmHH: validHH.price,
//                     confirmHHCandleIndex: refHHIndex,
//                     breakCandleIndex: refHHIndex, 
//                     startTime: rootTime
//                 };

//                 const validPullbacksForSMC = bullishPullbacks.filter(pb =>
//                     pb.validHL !== confirmedHL.price 
//                 );

//                 if (swingHLIndex !== -1 && refHHIndex !== -1) {
//                     validPullbacksForSMC.unshift(rootExtreme);
//                 }

//                 const poiZones = findSMCZones(candles, validPullbacksForSMC, i);

//                 // ==========================================================
//                 // 🔥 THE VISUAL FIX
//                 // ==========================================================
                
//                 // 1. जब नया IDM कन्फर्म होता है, तो 'signals' एरे में मौजूद पिछले सारे ज़ोन्स 'पुराने' बन जाते हैं।
//                 signals.forEach(sig => {
//                     if (["E-OB", "D-OB", "E-OF", "D-OF"].includes(sig.type)) {
                        
//                         // अगर पहले से Demand/Supply नाम नहीं हुआ है, तभी चेक करो
//                         if (!sig.displayName || (!sig.displayName.includes("Demand") && !sig.displayName.includes("Supply"))) {
//                             sig.isActive = false; // पुराने ज़ोन डीएक्टिवेट करें
                            
//                             let isMitigated = false;
//                             let startIdx = candles.findIndex(c => c.timestamp === sig.startTime);
                            
//                             if (startIdx !== -1) {
//                                 for (let j = startIdx + 3; j <= i; j++) {
//                                     // बुलिश ज़ोन के लिए चेकिंग
//                                     if (sig.trend === "BULLISH" && candles[j].low <= sig.priceTop) {
//                                         isMitigated = true;
//                                         break;
//                                     }
//                                     // बेयरिश ज़ोन के लिए चेकिंग
//                                     if (sig.trend === "BEARISH" && candles[j].high >= sig.priceBottom) {
//                                         isMitigated = true;
//                                         break;
//                                     }
//                                 }
//                             }

//                             // 🎯 सिर्फ अनमिटिगेटेड ज़ोन्स का नाम उनके ट्रेंड के हिसाब से बदलें
//                             if (!isMitigated) {
//                                 if (sig.trend === "BULLISH") {
//                                     if (sig.type === "E-OB" || sig.type === "D-OB") sig.displayName = "Demand Zone(OB)";
//                                     if (sig.type === "E-OF" || sig.type === "D-OF") sig.displayName = "Demand Zone(OF)";
//                                 } else if (sig.trend === "BEARISH") {
//                                     if (sig.type === "E-OB" || sig.type === "D-OB") sig.displayName = "Supply Zone(OB)";
//                                     if (sig.type === "E-OF" || sig.type === "D-OF") sig.displayName = "Supply Zone(OF)";
//                                 }
//                             }
//                         }
//                     }
//                 });

//                 // 2. नए (Current Structure) ज़ोन्स को सिग्नल्स में पुश करें
//                 if (poiZones.eof && !poiZones.eof.isMitigated) {
//                     let mitTimeEOF = findMitigationTime(poiZones.eof.top, i, candles);
//                     signals.push({ type: "E-OF", displayName: "E-OF", trend: "BULLISH", priceTop: poiZones.eof.top, priceBottom: poiZones.eof.bottom, startTime: poiZones.eof.startTime, endTime: mitTimeEOF, isActive: true });
//                 }
                
//                 if (poiZones.eob) {
//                     let mitTimeEOB = findMitigationTime(poiZones.eob.top, i, candles);
//                     signals.push({ type: "E-OB", displayName: "E-OB", trend: "BULLISH", priceTop: poiZones.eob.top, priceBottom: poiZones.eob.bottom, startTime: poiZones.eob.startTime, fvgTop: poiZones.eob.fvgTop, fvgBottom: poiZones.eob.fvgBottom, endTime: mitTimeEOB, isActive: true });
//                 }

//                 if (poiZones.dof && !poiZones.dof.isMitigated) {
//                     let mitTimeDOF = findMitigationTime(poiZones.dof.top, i, candles);
//                     signals.push({ type: "D-OF", displayName: "D-OF", trend: "BULLISH", priceTop: poiZones.dof.top, priceBottom: poiZones.dof.bottom, startTime: poiZones.dof.startTime, endTime: mitTimeDOF, isActive: true });
//                 }
                
//                 if (poiZones.dob) {
//                     let mitTimeDOB = findMitigationTime(poiZones.dob.top, i, candles);
//                     signals.push({ type: "D-OB", displayName: "D-OB", trend: "BULLISH", priceTop: poiZones.dob.top, priceBottom: poiZones.dob.bottom, startTime: poiZones.dob.startTime, fvgTop: poiZones.dob.fvgTop, fvgBottom: poiZones.dob.fvgBottom, endTime: mitTimeDOB, isActive: true });
//                 }
                
//                 bullishPullbacks = []; 
//                 tempPullbackTracker = null;
//                 confirmedHL = null;
//             }

//             if (isIdmTaken && curr.low < tempSwingLow.price) {
//                 tempSwingLow = { price: curr.low, time: curr.timestamp };

//                 bullishPullbacks = [];
//                 refHH = null; // ट्रैकर अनलॉक!
//                 tempPullbackTracker = null;
//             }

//             // RULE 3 & 6a: BOS & Sweep Logic
//             if (isIdmTaken && validHH !== null) {
//                 let breakLevel = refX_BOS_Bullish ? refX_BOS_Bullish.price : validHH.price;

//                 if (curr.high > breakLevel) {
//                     if (curr.close > breakLevel) { // 🚀 Full Body Break

//                         // 🔥 VISUAL FIX: लाइन हमेशा ओरिजिनल 'validHH' से ही ड्रा होगी!
//                         signals.push({
//                             type: "BOS", trend: "BULLISH",
//                             price: validHH.price,       // <-- Original Price
//                             startTime: validHH.time,    // <-- Original Time
//                             endTime: curr.timestamp
//                         });

//                         if (refX_CHoCH_Bullish) {
//                             signals.push({ type: "X", trend: "BULLISH", sweptSide: "LOW", price: lockedSwingLow.price, startTime: lockedSwingLow.time, endTime: refX_CHoCH_Bullish.time });
//                             refX_CHoCH_Bullish = null;
//                         }

//                         lockedSwingLow = { ...tempSwingLow };
//                         isIdmTaken = false;
//                         validHH = null; refHH = null; refX_BOS_Bullish = null;
                        
//                         // 🔥 THE MASTER FIX: BOS के बाद पुरानी IDM मेमोरी को जड़ से मिटाएं!
//                         confirmedHL = null; 
//                         bullishPullbacks = []; 
//                         tempPullbackTracker = null;

//                         absoluteHighest = { price: curr.high, time: curr.timestamp };
//                     } else { // 🧹 Sweep (Ref X)
//                         refX_BOS_Bullish = { price: curr.high, time: curr.timestamp, majorIdmTarget: { ...majorIdm_Bullish } };
//                     }
//                 }

//                 if (refX_BOS_Bullish && refX_BOS_Bullish.majorIdmTarget) {
//                     if (curr.low < refX_BOS_Bullish.majorIdmTarget.price) {
//                         signals.push({ type: "IDM", trend: "BULLISH", price: refX_BOS_Bullish.majorIdmTarget.price, startTime: refX_BOS_Bullish.majorIdmTarget.time, endTime: curr.timestamp });

//                         signals.push({ type: "X", trend: "BULLISH", sweptSide: "HIGH", price: validHH.price, startTime: validHH.time, endTime: refX_BOS_Bullish.time }); // <-- यहाँ बदलाव है

//                         validHH = { price: refX_BOS_Bullish.price, time: refX_BOS_Bullish.time };
//                         refX_BOS_Bullish = null;
//                         majorIdm_Bullish = { price: curr.low, time: curr.timestamp };
//                     }
//                 }
//             }
//         }

//         refCandle = curr;
//     }

//     // ==========================================
//     // 🔥 LIVE EDGE: पेंडिंग "Ref X" को चार्ट पर भेजना
//     // ==========================================
//     const lastTime = candles[candles.length - 1].timestamp;

//     if (trend === -1) {
//         if (refX_CHoCH_Bearish && lockedSwingHigh) {
//             signals.push({ type: "Ref X", trend: "BEARISH", sweptSide: "HIGH", price: lockedSwingHigh.price, startTime: lockedSwingHigh.time, endTime: lastTime });
//         }
//         if (refX_BOS_Bearish && validLL) {
//             signals.push({ type: "Ref X", trend: "BEARISH", sweptSide: "LOW", price: validLL.price, startTime: validLL.time, endTime: lastTime });
//         }
//     } else if (trend === 1) {
//         if (refX_CHoCH_Bullish && lockedSwingLow) {
//             signals.push({ type: "Ref X", trend: "BULLISH", sweptSide: "LOW", price: lockedSwingLow.price, startTime: lockedSwingLow.time, endTime: lastTime });
//         }
//         if (refX_BOS_Bullish && validHH) {
//             signals.push({ type: "Ref X", trend: "BULLISH", sweptSide: "HIGH", price: validHH.price, startTime: validHH.time, endTime: lastTime });
//         }
//     }

//     return signals;
// };

// // ============================================================================
// // 🎯 SMC POI SCANNER BLOCK: E-OF, E-OB, D-OF, D-OB FOR BULLISH SCENARIO
// // ============================================================================

// /**
//  * 1. Pullback Zone की Mitigation चेक करने का हेल्पर फंक्शन
//  * (अगर कोई भी अगली कैंडल पुलबैक के टॉप यानी confirmHH के नीचे घुसती है, तो वो मिटिगेट माना जाएगा)
//  */
// const isPullbackMitigated = (pullback, candles, idmIndex) => {
//     // पुलबैक बनने वाले कैंडल इंडेक्स से लेकर IDM कन्फर्म होने वाले इंडेक्स तक चेक करेंगे
//     const startIndex = pullback.breakCandleIndex + 1;

//     for (let i = startIndex; i <= idmIndex; i++) {
//         if (i >= candles.length) break;
//         const currentCandle = candles[i];

//         // 🔥 रिफाइनमेंट रूल: अगर किसी भी अगली कैंडल का Low, पुलबैक के टॉप (confirmHH) के नीचे या बराबर चला जाए
//         if (currentCandle.low <= pullback.confirmHH) {
//             return true; // ज़ोन मिटिगेट (खत्म) हो गया
//         }
//     }
//     return false; // अनमिटिगेटेड है
// };

// /**
//  * 🎯 Helper: Future में Zone कब Mitigate (Tap) हुआ, उसका Time खोजना
//  */
// const findMitigationTime = (zoneTop, startIndex, candles) => {
//     // IDM वाली कैंडल (startIndex) से लेकर चार्ट के अंत तक चेक करेंगे
//     for (let j = startIndex; j < candles.length; j++) {
//         // बुलिश ज़ोन के लिए: अगर कैंडल का Low ज़ोन के Top को टच करे या नीचे जाए
//         if (candles[j].low <= zoneTop) {
//             return candles[j].timestamp; // यहाँ ज़ोन टैप (Mitigate) हो गया!
//         }
//     }
//     // अगर अभी तक टैप नहीं हुआ (Unmitigated), तो चार्ट की एकदम आखिरी कैंडल तक ज़ोन को खींच दो
//     return candles[candles.length - 1].timestamp;
// };

// /**
//  * 🎯 BEARISH Mitigation Time: कट-ऑफ टाइम ढूँढना जब प्राइस सप्लाई ज़ोन को हिट करे
//  */
// const findMitigationTime_Bearish = (zoneBottomPrice, startIndex, candles) => {
//     // IDM के बाद वाली कैंडल से स्कैन शुरू करेंगे
//     for (let j = startIndex + 1; j < candles.length; j++) {
//         // 🎯 Bearish Rule: क्या प्राइस नीचे से ऊपर जाकर ज़ोन के बॉटम से टकराया?
//         if (candles[j].high >= zoneBottomPrice) {
//             return candles[j].timestamp; // जैसे ही टच हुआ, वही टाइम लॉक कर दो
//         }
//     }
//     // अगर किसी ने टच नहीं किया (Unmitigated), तो चार्ट के अंत तक बॉक्स खींच दो
//     return candles[candles.length - 1].timestamp; 
// };


// /**
//  * 🎯 Helper: Check if Order Flow (Pullback) is Mitigated
//  */
// // const isOfMitigated = (pb, candles, currentIndex) => {
// //     // ब्रेकआउट कैंडल के बाद से IDM तक चेक करेंगे
// //     const startIdx = pb.breakCandleIndex + 1;
// //     for (let j = startIdx; j <= currentIndex; j++) {
// //         if (j >= candles.length) break;
// //         // बुलिश में: अगर कोई कैंडल OF के टॉप (confirmHH) को नीचे की तरफ टच कर दे
// //         if (candles[j].low <= pb.confirmHH) {
// //             return true; // OF मिटिगेट हो गया!
// //         }
// //     }
// //     return false; // OF अभी भी फ्रेश है!
// // };


// // /**
// //  * 🎯 Helper: Check if Bearish Order Flow (Pullback) is Mitigated
// //  */
// // const isOfMitigated_Bearish = (pb, candles, currentIndex) => {
// //     // ब्रेकआउट कैंडल के बाद से IDM तक चेक करेंगे
// //     const startIdx = pb.breakCandleIndex + 1;
// //     for (let j = startIdx; j <= currentIndex; j++) {
// //         if (j >= candles.length) break;
// //         // 🎯 Bearish में: अगर कोई कैंडल ऊपर उठकर OF के बॉटम (confirmLL) को टच कर दे
// //         if (candles[j].high >= pb.confirmLL) {
// //             return true; // OF मिटिगेट हो गया!
// //         }
// //     }
// //     return false; // OF अभी भी फ्रेश है!
// // };


// /**
//  * 🎯 Helper: Check if Bullish Order Flow is Mitigated (TAPPED)
//  */
// const isOfMitigated = (pb, candles, currentIndex) => {
//     const startIdx = pb.breakCandleIndex + 1;
//     for (let j = startIdx; j <= currentIndex; j++) {
//         if (j >= candles.length) break;

//         // 🎯 SMC Rule: बुलिश OF का टॉप (confirmHH) है। 
//         // प्राइस जैसे ही नीचे गिरकर इसे टच करेगा, ज़ोन मिटिगेट!
//         if (candles[j].low <= pb.confirmHH) { 
//             return true; 
//         }
//     }
//     return false; // टच नहीं हुआ, मतलब फ्रेश है!
// };

// /**
//  * 🎯 Helper: Check if Bearish Order Flow is Mitigated (TAPPED)
//  */
// const isOfMitigated_Bearish = (pb, candles, currentIndex) => {
//     const startIdx = pb.breakCandleIndex + 1;
//     for (let j = startIdx; j <= currentIndex; j++) {
//         if (j >= candles.length) break;
        
//         // 🎯 SMC Rule: बेयरिश OF का बॉटम (confirmLL) है।
//         // प्राइस जैसे ही ऊपर उठकर इसे टच करेगा, ज़ोन मिटिगेट!
//         if (candles[j].high >= pb.confirmLL) { 
//             return true; 
//         }
//     }
//     return false; // टच नहीं हुआ, मतलब फ्रेश है!
// };

// /**
//  * 🎯 E-OB / D-OB ढूँढने का "Swing HL to Ref HH" एडवांस लॉजिक
//  */
// const findValidOrderBlock = (pullback, candles, currentIndex) => {
    
//     // 1. Start: "Swing HL" वाली कैंडल को ही exactly 1st कैंडल मानेंगे (No -1 logic)
//     const startIdx = pullback.validHLCandleIndex; 
    
//     // 2. Limitation: FVG चेक करते हुए सिर्फ "Ref HH" (Breakout Candle) तक ही जाएंगे
//     const endIdx = pullback.breakCandleIndex; 

//     // 1-1 कैंडल ऊपर बढ़ते जाएंगे
//     for (let i = startIdx; i <= endIdx; i++) {
//         if (i + 2 >= candles.length) continue;

//         const firstCandle = candles[i];
//         const thirdCandle = candles[i + 2];

//         // 3. FVG Check: क्या इस 1st कैंडल और 3rd कैंडल के बीच FVG (Imbalance) है?
//         if (firstCandle.high < thirdCandle.low) {
            
//             // Mitigation चेक (क्या भविष्य में ये कैंडल टच हुई है?)
//             let isMitigated = false;
//             for (let j = i + 3; j <= currentIndex; j++) {
//                 if (j >= candles.length) break;
//                 if (candles[j].low <= firstCandle.high) {
//                     isMitigated = true;
//                     break;
//                 }
//             }

//             if (!isMitigated) {
//                 // ✅ 4. FVG मिल गया! अब इसी 1st Candle के High और Low से रेक्टेंगल बॉक्स ड्रा होगा।
//                 return {
//                     found: true,
//                     price: { high: firstCandle.high, low: firstCandle.low }, // 1st कैंडल का High-Low
//                     fvgZone: { top: thirdCandle.low, bottom: firstCandle.high },
//                     startTime: firstCandle.timestamp, // बॉक्स यहीं से शुरू होगा
//                     candleIndex: i
//                 };
//             }
//         }
//     }

//     // 5. Fallback: अगर Swing HL से Ref HH तक कोई फ्रेश FVG नहीं मिला, 
//     // तो इंजन 'false' रिटर्न करेगा और हमारा 'पुलबैक शिफ्ट लॉजिक' (2nd Pullback check) स्टार्ट हो जाएगा!
//     return { found: false };
// };


// /**
//  * 🎯 E-OB / D-OB ढूँढने का BEARISH SMC रूल: "Swing High to Ref LL"
//  */
// const findBearishValidOrderBlock = (pullback, candles, currentIndex) => {
    
//     // 1. Start: "Swing High" (Top) वाली कैंडल को 1st कैंडल मानेंगे
//     const startIdx = pullback.validLHCandleIndex; // Bearish में Lower High (LH)
//     const endIdx = pullback.breakCandleIndex; 

//     for (let i = startIdx; i <= endIdx; i++) {
//         if (i + 2 >= candles.length) continue;

//         const firstCandle = candles[i];
//         const thirdCandle = candles[i + 2];

//         // 2. Bearish FVG Check: क्या 1st कैंडल का Low, 3rd कैंडल के High से ऊपर है? (Imbalance)
//         if (firstCandle.low > thirdCandle.high) {
            
//             // Mitigation चेक (क्या भविष्य में मार्केट ऊपर आकर इसे टच किया है?)
//             let isMitigated = false;
//             for (let j = i + 3; j <= currentIndex; j++) {
//                 if (j >= candles.length) break;
//                 // 🎯 Bearish में कैंडल का High ज़ोन के Bottom (firstCandle.low) को टच करता है
//                 if (candles[j].high >= firstCandle.low) { 
//                     isMitigated = true;
//                     break;
//                 }
//             }

//             if (!isMitigated) {
//                 // ✅ 3. Bearish FVG मिल गया!
//                 return {
//                     found: true,
//                     // Bearish बॉक्स का Top (High) और Bottom (Low)
//                     price: { top: firstCandle.high, bottom: firstCandle.low }, 
//                     fvgZone: { top: firstCandle.low, bottom: thirdCandle.high },
//                     startTime: firstCandle.timestamp,
//                     candleIndex: i
//                 };
//             }
//         }
//     }
//     return { found: false };
// };

// /**
//  * 🎯 MAIN POI ENGINE: Extreme & Decisional ज़ोन फ़िल्टर
//  */
// const findSMCZones = (candles, pullbacksArray, currentIndex) => {
//     let smcZones = { eof: null, eob: null, dof: null, dob: null };
//     if (!pullbacksArray || pullbacksArray.length === 0) return smcZones;

//     // ==============================================================
//     // 🔥 1. EXTREME ZONES (E-OF / E-OB)
//     // ==============================================================
//     for (let i = 0; i < pullbacksArray.length; i++) {
//         const pb = pullbacksArray[i];
//         const obResult = findValidOrderBlock(pb, candles, currentIndex);

//         if (obResult.found) {
//             const mitigatedOF = isOfMitigated(pb, candles, currentIndex);
//             smcZones.eof = { type: "E-OF", top: pb.confirmHH, bottom: pb.validHL, startTime: pb.startTime, isMitigated: mitigatedOF, data: pb };
            
//             // यहाँ 'obResult.startTime' का यूज़ करना बहुत ज़रूरी है
//             smcZones.eob = { 
//                 type: "E-OB", 
//                 top: obResult.price.high, 
//                 bottom: obResult.price.low, 
//                 startTime: obResult.startTime, // बॉक्स अब यहीं से शुरू होगा
//                 fvgTop: obResult.fvgZone.top, 
//                 fvgBottom: obResult.fvgZone.bottom 
//             };
//             break; 
//         }
//     }

//     // ==============================================================
//     // 🔥 2. DECISIONAL ZONES (D-OF / D-OB) - UPDATED DYNAMIC LOGIC
//     // ==============================================================
//     for (let i = pullbacksArray.length - 1; i >= 0; i--) {
//         const pb = pullbacksArray[i];
//         if (smcZones.eof && smcZones.eof.data.id === pb.id) break;

//         const obResult = findValidOrderBlock(pb, candles, currentIndex);

//         if (obResult.found) {
//             // 🎯 THE OVERLAP GUARD: अगर D-OB का टाइम E-OB से टकरा रहा है, तो इसे स्किप कर दो!
//             if (smcZones.eob && smcZones.eob.startTime === obResult.startTime) {
//                 continue; 
//             }

//             const mitigatedOF = isOfMitigated(pb, candles, currentIndex);
            
//             smcZones.dof = { 
//                 type: "D-OF", top: pb.confirmHH, bottom: pb.validHL, startTime: pb.startTime, isMitigated: mitigatedOF, data: pb 
//             };

//             smcZones.dob = { 
//                 type: "D-OB", top: obResult.price.high, bottom: obResult.price.low, startTime: obResult.startTime, fvgTop: obResult.fvgZone.top, fvgBottom: obResult.fvgZone.bottom, data: pb
//             };
//             break; 
//         }
//     }
//     return smcZones;
// };


// const findSMCZones_Bearish = (candles, pullbacksArray, currentIndex) => {
//     let smcZones = { eof: null, eob: null, dof: null, dob: null };
//     if (!pullbacksArray || pullbacksArray.length === 0) return smcZones;

//     // ==============================================================
//     // 🔥 1. EXTREME ZONES (E-OF / E-OB) - Bearish
//     // ==============================================================
//     // यहाँ हम लूप लगा रहे हैं ताकि अगर पहला लेग फेल हो जाए, तो इंजन अगले लेग को चेक करे
//     for (let i = 0; i < pullbacksArray.length; i++) {
//         const pb = pullbacksArray[i];
//         const obResult = findBearishValidOrderBlock(pb, candles, currentIndex);

//         if (obResult.found) {
//             // 🎯 असली जादू यहाँ है: अब हम चेक कर रहे हैं कि OF मिटिगेट हुआ है या नहीं!
//             const mitigatedOF = isOfMitigated_Bearish(pb, candles, currentIndex);
            
//             smcZones.eof = { 
//                 type: "E-OF", 
//                 top: pb.validLH,       // Bearish pullback top (Supply)
//                 bottom: pb.confirmLL,  // Bearish pullback bottom (Break point)
//                 startTime: pb.startTime, 
//                 isMitigated: mitigatedOF, // 🚀 अब यह डायनामिक है!
//                 data: pb 
//             };
            
//             smcZones.eob = { 
//                 type: "E-OB", 
//                 top: obResult.price.top, 
//                 bottom: obResult.price.bottom, 
//                 startTime: obResult.startTime, 
//                 fvgTop: obResult.fvgZone.top, 
//                 fvgBottom: obResult.fvgZone.bottom 
//             };
//             break; 
//         }
//     }

//     // ==============================================================
//     // 🔥 2. DECISIONAL ZONES (D-OF / D-OB) - BEARISH
//     // ==============================================================
//     for (let i = pullbacksArray.length - 1; i >= 0; i--) {
//         const pb = pullbacksArray[i];
        
//         if (smcZones.eof && smcZones.eof.data.id === pb.id) break;

//         const obResult = findBearishValidOrderBlock(pb, candles, currentIndex);

//         if (obResult.found) {
//             // 🎯 THE OVERLAP GUARD: अगर D-OB का टाइम E-OB से टकरा रहा है, तो इसे स्किप कर दो!
//             if (smcZones.eob && smcZones.eob.startTime === obResult.startTime) {
//                 continue; 
//             }

//             const mitigatedOF = isOfMitigated_Bearish(pb, candles, currentIndex);
            
//             smcZones.dof = { 
//                 type: "D-OF", top: pb.validLH, bottom: pb.confirmLL, startTime: pb.startTime, isMitigated: mitigatedOF, data: pb 
//             };

//             smcZones.dob = { 
//                 type: "D-OB", top: obResult.price.top, bottom: obResult.price.bottom, startTime: obResult.startTime, fvgTop: obResult.fvgZone.top, fvgBottom: obResult.fvgZone.bottom, data: pb
//             };
//             break; 
//         }
//     }
    
//     return smcZones;
// };

// // ___________________________________________________________________________________________________


// // 🎯 MAIN SCANNER
// const checkPriceActionSignal = (htfCandles, ltfCandles, setupType, startingTrend = "AUTO") => {
//     let signal = { long: false, short: false, reason: "" };

//     if (!htfCandles || htfCandles.length < 15 || !ltfCandles || ltfCandles.length === 0) {
//         return signal;
//     }

//     const htfSignals = identifyMechanicalStructure(htfCandles, startingTrend);
//     if (htfSignals.length === 0) return signal;

//     const latestSignal = htfSignals[htfSignals.length - 1];

//     // 🔥 THE FIX: 'isRecent' वाला टाइम लिमिट पूरी तरह हटा दिया गया है!
//     // अब इंजन को कोई फर्क नहीं पड़ता कि BOS/CHoCH कब हुआ था। 
//     // जो भी आख़िरी स्ट्रक्चर है, वही मास्टर ट्रेंड माना जाएगा।

//     let htfSignalLong = false;
//     let htfSignalShort = false;

//     if (setupType === "BOS (Break of Structure)" && latestSignal.type === "BOS") {
//         if (latestSignal.trend === "BULLISH") htfSignalLong = true;
//         if (latestSignal.trend === "BEARISH") htfSignalShort = true;
//     }
//     else if (setupType === "CHoCH (Change of Character)" && latestSignal.type === "CHoCH") {
//         if (latestSignal.trend === "BULLISH") htfSignalLong = true;
//         if (latestSignal.trend === "BEARISH") htfSignalShort = true;
//     }

//     // 3. LTF Delivery Boy (1-Min Confirmation)
//     if (htfSignalLong || htfSignalShort) {
//         const currentLtfCandle = ltfCandles[ltfCandles.length - 1];

//         const isLtfBullish = currentLtfCandle.close > currentLtfCandle.open;
//         const isLtfBearish = currentLtfCandle.close < currentLtfCandle.open;

//         if (htfSignalLong && isLtfBullish) {
//             signal.long = true;
//             signal.reason = `HTF ${latestSignal.type} Bullish + LTF Confirm`;
//         }
//         else if (htfSignalShort && isLtfBearish) {
//             signal.short = true;
//             signal.reason = `HTF ${latestSignal.type} Bearish + LTF Confirm`;
//         }
//     }
//     return signal;
// };

// module.exports = { identifyMechanicalStructure, checkPriceActionSignal };


// =========================================================================
// 🧠 SMART RETRO-SCANNER (Visual Zig-Zag Logic by Chanchal Bhai)
// =========================================================================
const scanRetroactivePullbacks = (startIndex, endIndex, candles, trendType) => {
    let validPullbacks = []; // सारे पक्के पुलबैक्स यहाँ जमा होंगे
    let inPullback = false;
    let tempExtreme = null;
    let targetBreakLevel = null;

    // 📉 1. BEARISH STRUCTURE: गिरते हुए मार्केट में चोटियां (Lower Highs) ढूँढना
    if (trendType === "BEARISH") {
        for (let j = startIndex + 1; j <= endIndex; j++) {
            let curr = candles[j];
            let prev = candles[j - 1];

            let isOutsideBar = curr.high > prev.high && curr.low < prev.low;
            let brokeHigh = curr.high > prev.high;

            // STEP 1: पुलबैक शुरू (हरी कैंडल ने लाल का High तोड़ा)
            if (!inPullback && brokeHigh && !isOutsideBar) {
                inPullback = true;
                targetBreakLevel = prev.low; // कन्फर्म करने के लिए इस Low का टूटना ज़रूरी है
                tempExtreme = { price: curr.high, time: curr.timestamp }; // चोटी (Peak)
            }
            // STEP 2: पुलबैक के अंदर
            else if (inPullback) {
                // अगर मार्केट और ऊपर जाता है, तो चोटी को अपडेट करो
                if (curr.high > tempExtreme.price) {
                    tempExtreme = { price: curr.high, time: curr.timestamp };
                }
                
                // STEP 3: पुलबैक कन्फर्म (मार्केट गिरकर Target Low तोड़ दे)
                if (curr.low < targetBreakLevel) {
                    validPullbacks.push(tempExtreme); // पक्का पुलबैक मिल गया! इसे लिस्ट में डालो
                    inPullback = false; // अगले पुलबैक के लिए रिसेट
                }
            }
        }
    } 
    // 📈 2. BULLISH STRUCTURE: उठते हुए मार्केट में गढ्ढे (Higher Lows) ढूँढना
    else if (trendType === "BULLISH") {
        for (let j = startIndex + 1; j <= endIndex; j++) {
            let curr = candles[j];
            let prev = candles[j - 1];

            let isOutsideBar = curr.high > prev.high && curr.low < prev.low;
            let brokeLow = curr.low < prev.low;

            // STEP 1: पुलबैक शुरू (लाल कैंडल ने हरी का Low तोड़ा)
            if (!inPullback && brokeLow && !isOutsideBar) {
                inPullback = true;
                targetBreakLevel = prev.high; // कन्फर्म करने के लिए इस High का टूटना ज़रूरी है
                tempExtreme = { price: curr.low, time: curr.timestamp }; // गढ्ढा (Dip)
            }
            // STEP 2: पुलबैक के अंदर
            else if (inPullback) {
                // अगर मार्केट और नीचे गिरता है, तो गढ्ढे को अपडेट करो
                if (curr.low < tempExtreme.price) {
                    tempExtreme = { price: curr.low, time: curr.timestamp };
                }
                
                // STEP 3: पुलबैक कन्फर्म (मार्केट उठकर Target High तोड़ दे)
                if (curr.high > targetBreakLevel) {
                    validPullbacks.push(tempExtreme); // पक्का पुलबैक मिल गया! इसे लिस्ट में डालो
                    inPullback = false; // अगले पुलबैक के लिए रिसेट
                }
            }
        }
    }

    // 🔥 द मास्टरस्ट्रोक: सबसे ताज़ा (Nearest) IDM चुनो
    // हमारे पास सारे पुलबैक्स आ गए हैं। जो सबसे आख़िरी पुलबैक होगा (CHoCH के सबसे करीब), वही IDM बनेगा!
    if (validPullbacks.length > 0) {
        return validPullbacks[validPullbacks.length - 1];
    }
    
    return null; // अगर कोई पुलबैक नहीं मिला
};

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

    let bearishPullbacks = []; 
    let tempPullbackTracker_Bearish = null;

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
            if (startingTrend === "AUTO" && lockedSwingHigh === null && curr.close > prevAbsoluteHighest) {
                trend = 1;
                isIdmTaken = false;
                validLL = null; refLL = null; tempSwingHigh = null; confirmedLH = null;
                
                bearishPullbacks = []; // 🎯 Added
                tempPullbackTracker_Bearish = null; // 🎯 Added

                absoluteLowest = { price: curr.low, time: curr.timestamp }; 
                refCandle = curr;
                continue;
            }

            if (isIdmTaken) {
                if (curr.high > majorIdm_Bearish.price) majorIdm_Bearish = { price: curr.high, time: curr.timestamp };
            }

            // RULE 5 & 6c: CHoCH & Sweep Logic
            if (lockedSwingHigh !== null) {
                let breakLevel = refX_CHoCH_Bearish ? refX_CHoCH_Bearish.price : lockedSwingHigh.price;

                if (curr.high > breakLevel) {
                    if (curr.close > breakLevel) { // 🚀 Full Body Break (Valid CHoCH)
                        signals.push({
                            type: "CHoCH", trend: "BULLISH",
                            sweptSide: "HIGH",
                            price: lockedSwingHigh.price,
                            startTime: lockedSwingHigh.time,
                            endTime: curr.timestamp
                        });

                        trend = 1;
                        isIdmTaken = false;
                        lockedSwingLow = { ...absoluteLowest };
                        
                        validLL = null; refLL = null; tempSwingHigh = null; lockedSwingHigh = null;
                        refX_CHoCH_Bearish = null; refX_BOS_Bearish = null;
                        bearishPullbacks = []; tempPullbackTracker_Bearish = null; 
                        
                        refHH = null; tempHL = null; bullishPullbacks = []; tempPullbackTracker = null;

                        // 🔥 RETRO-SCANNER INJECTION: CHoCH के पहले वाले Bullish पुलबैक्स ढूँढो
                        let startIdx = candles.findIndex(c => c.timestamp === lockedSwingLow.time);
                        let retroIDM = scanRetroactivePullbacks(startIdx, i, candles, "BULLISH");
                        confirmedHL = retroIDM; 

                        absoluteHighest = { price: curr.high, time: curr.timestamp };
                        refCandle = curr;
                        continue;
                    } else { // 🧹 Sweep (Ref X)
                        refX_CHoCH_Bearish = { price: curr.high, time: curr.timestamp };
                    }
                }
            }

            // ==========================================================
            // 🔥 BULLETPROOF PULLBACK TRACKER (Bearish Engulfing Fix)
            // ==========================================================
            if (brokeHigh && !isOutsideBar && refLL === null) { 
                refLL = { price: refCandle.low, time: refCandle.timestamp };
                tempLH = { price: curr.high, time: curr.timestamp };
                
                tempPullbackTracker_Bearish = {
                    id: bearishPullbacks.length + 1,
                    confirmLL: refCandle.low,
                    confirmLLCandleIndex: i - 1, 
                    validLH: curr.high,
                    validLHCandleIndex: i, 
                    startTime: refCandle.timestamp
                };
            } else if (refLL !== null) { 
                if (curr.high > tempLH.price) {
                    tempLH = { price: curr.high, time: curr.timestamp };
                    if (tempPullbackTracker_Bearish) {
                        tempPullbackTracker_Bearish.validLH = curr.high;
                        tempPullbackTracker_Bearish.validLHCandleIndex = i;
                    }
                }
                
                if (curr.low <= refLL.price) { 
                    // ❌ Fake Engulfing Pullback (Discard)
                    if (curr.timestamp === tempLH.time) {
                        refLL = null; 
                        tempPullbackTracker_Bearish = null; 
                    } else {
                        // ✅ Valid Pullback (Confirm)
                        confirmedLH = tempLH; 
                        refLL = null; 
                        
                        if (tempPullbackTracker_Bearish) {
                            tempPullbackTracker_Bearish.breakCandleIndex = i;
                            bearishPullbacks.push({...tempPullbackTracker_Bearish});
                            tempPullbackTracker_Bearish = null; 
                        }
                    }
                }
            }

            // 🎯 THE FINAL IDM CONFIRMATION & SUPPLY ZONE TRANSFORMATION
            if (confirmedLH !== null && curr.high >= confirmedLH.price && !isIdmTaken) {
                isIdmTaken = true;
                validLL = { ...absoluteLowest };
                tempSwingHigh = { price: curr.high, time: curr.timestamp };
                majorIdm_Bearish = { price: curr.high, time: curr.timestamp };
                signals.push({ type: "IDM", trend: "BEARISH", price: confirmedLH.price, startTime: confirmedLH.time, endTime: curr.timestamp });

                // 🔥 1. THE ROOT EXTREME FIX
                const rootTime = lockedSwingHigh ? lockedSwingHigh.time : absoluteHighest.time;
                const rootPrice = lockedSwingHigh ? lockedSwingHigh.price : absoluteHighest.price;

                const swingLHIndex = candles.findIndex(c => c.timestamp === rootTime);
                const refLLIndex = candles.findIndex(c => c.timestamp === validLL.time);

                const rootExtreme = {
                    id: "ROOT_SWING_LH",
                    validLH: rootPrice,
                    validLHCandleIndex: swingLHIndex,
                    confirmLL: validLL.price,
                    confirmLLCandleIndex: refLLIndex,
                    breakCandleIndex: refLLIndex, 
                    startTime: rootTime
                };

                const validPullbacksForSMC = bearishPullbacks.filter(pb => pb.validLH !== confirmedLH.price);

                if (swingLHIndex !== -1 && refLLIndex !== -1) {
                    validPullbacksForSMC.unshift(rootExtreme);
                }

                const poiZones = findSMCZones_Bearish(candles, validPullbacksForSMC, i);

                // 🔥 2. THE MASTER STATE MANAGEMENT
                signals.forEach(sig => {
                    if (["E-OB", "D-OB", "E-OF", "D-OF"].includes(sig.type)) {
                        
                        // अगर पहले से Demand/Supply नाम नहीं हुआ है, तभी चेक करो
                        if (!sig.displayName || (!sig.displayName.includes("Demand") && !sig.displayName.includes("Supply"))) {
                            sig.isActive = false; // पुराने ज़ोन डीएक्टिवेट करें
                            
                            let isMitigated = false;
                            let startIdx = candles.findIndex(c => c.timestamp === sig.startTime);
                            
                            if (startIdx !== -1) {
                                for (let j = startIdx + 3; j <= i; j++) {
                                    // बुलिश ज़ोन के लिए चेकिंग
                                    if (sig.trend === "BULLISH" && candles[j].low <= sig.priceTop) {
                                        isMitigated = true;
                                        break;
                                    }
                                    // बेयरिश ज़ोन के लिए चेकिंग
                                    if (sig.trend === "BEARISH" && candles[j].high >= sig.priceBottom) {
                                        isMitigated = true;
                                        break;
                                    }
                                }
                            }

                            // 🎯 सिर्फ अनमिटिगेटेड ज़ोन्स का नाम उनके ट्रेंड के हिसाब से बदलें
                            if (!isMitigated) {
                                if (sig.trend === "BULLISH") {
                                    if (sig.type === "E-OB" || sig.type === "D-OB") sig.displayName = "Demand Zone(OB)";
                                    if (sig.type === "E-OF" || sig.type === "D-OF") sig.displayName = "Demand Zone(OF)";
                                } else if (sig.trend === "BEARISH") {
                                    if (sig.type === "E-OB" || sig.type === "D-OB") sig.displayName = "Supply Zone(OB)";
                                    if (sig.type === "E-OF" || sig.type === "D-OF") sig.displayName = "Supply Zone(OF)";
                                }
                            }
                        }
                    }
                });

                // 🔥 3. THE VISUAL FIX
                if (poiZones.eof && !poiZones.eof.isMitigated) {
                    let mitTimeEOF = findMitigationTime_Bearish(poiZones.eof.bottom, i, candles);
                    signals.push({ type: "E-OF", displayName: "E-OF", trend: "BEARISH", priceTop: poiZones.eof.top, priceBottom: poiZones.eof.bottom, startTime: poiZones.eof.startTime, endTime: mitTimeEOF, isActive: true });
                }
                if (poiZones.eob) {
                    let mitTimeEOB = findMitigationTime_Bearish(poiZones.eob.bottom, i, candles);
                    signals.push({ type: "E-OB", displayName: "E-OB", trend: "BEARISH", priceTop: poiZones.eob.top, priceBottom: poiZones.eob.bottom, startTime: poiZones.eob.startTime, fvgTop: poiZones.eob.fvgTop, fvgBottom: poiZones.eob.fvgBottom, endTime: mitTimeEOB, isActive: true });
                }
                if (poiZones.dof && !poiZones.dof.isMitigated) {
                    let mitTimeDOF = findMitigationTime_Bearish(poiZones.dof.bottom, i, candles);
                    signals.push({ type: "D-OF", displayName: "D-OF", trend: "BEARISH", priceTop: poiZones.dof.top, priceBottom: poiZones.dof.bottom, startTime: poiZones.dof.startTime, endTime: mitTimeDOF, isActive: true });
                }
                if (poiZones.dob) {
                    let mitTimeDOB = findMitigationTime_Bearish(poiZones.dob.bottom, i, candles);
                    signals.push({ type: "D-OB", displayName: "D-OB", trend: "BEARISH", priceTop: poiZones.dob.top, priceBottom: poiZones.dob.bottom, startTime: poiZones.dob.startTime, fvgTop: poiZones.dob.fvgTop, fvgBottom: poiZones.dob.fvgBottom, endTime: mitTimeDOB, isActive: true });
                }
                
                bearishPullbacks = []; 
                tempPullbackTracker_Bearish = null;
                confirmedLH = null;
            }

            // 🎯 New High before BOS (Unlock Tracker)
            if (isIdmTaken && curr.high > tempSwingHigh.price) {
                tempSwingHigh = { price: curr.high, time: curr.timestamp };
                bearishPullbacks = []; // 🎯 Added
                refLL = null; 
                tempPullbackTracker_Bearish = null; // 🎯 Added
            }

            // RULE 3 & 6a: BOS & Sweep Logic
            if (isIdmTaken && validLL !== null) {
                let breakLevel = refX_BOS_Bearish ? refX_BOS_Bearish.price : validLL.price;

                if (curr.low < breakLevel) {
                    if (curr.close < breakLevel) { // 🚀 Full Body Break (Valid BOS)
                        signals.push({
                            type: "BOS", trend: "BEARISH",
                            price: validLL.price, 
                            startTime: validLL.time, 
                            endTime: curr.timestamp
                        });

                        if (refX_CHoCH_Bearish) {
                            signals.push({ type: "X", trend: "BEARISH", price: lockedSwingHigh.price, startTime: lockedSwingHigh.time, endTime: refX_CHoCH_Bearish.time });
                            refX_CHoCH_Bearish = null;
                        }

                        lockedSwingHigh = { ...tempSwingHigh };
                        isIdmTaken = false;
                        validLL = null; refLL = null; refX_BOS_Bearish = null;
                        
                        // 🔥 RETRO-SCANNER INJECTION: BOS के पहले वाले पुलबैक्स ढूँढो
                        let startIdx = candles.findIndex(c => c.timestamp === lockedSwingHigh.time);
                        let retroIDM = scanRetroactivePullbacks(startIdx, i, candles, "BEARISH");
                        confirmedLH = retroIDM; 
                        
                        bearishPullbacks = []; 
                        tempPullbackTracker_Bearish = null; 
                        absoluteLowest = { price: curr.low, time: curr.timestamp };

                    } else { // 🧹 Sweep (Ref X)
                        refX_BOS_Bearish = { price: curr.low, time: curr.timestamp, majorIdmTarget: { ...majorIdm_Bearish } };
                    }
                }

                if (refX_BOS_Bearish && refX_BOS_Bearish.majorIdmTarget) {
                    if (curr.high > refX_BOS_Bearish.majorIdmTarget.price) {
                        signals.push({ type: "IDM", trend: "BEARISH", price: refX_BOS_Bearish.majorIdmTarget.price, startTime: refX_BOS_Bearish.majorIdmTarget.time, endTime: curr.timestamp });
                        signals.push({ type: "X", trend: "BEARISH", sweptSide: "LOW", price: validLL.price, startTime: validLL.time, endTime: refX_BOS_Bearish.time });

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
                        signals.push({
                            type: "CHoCH", trend: "BEARISH",
                            price: lockedSwingLow.price,     
                            startTime: lockedSwingLow.time,  
                            endTime: curr.timestamp
                        });

                        trend = -1;
                        isIdmTaken = false;
                        lockedSwingHigh = { ...absoluteHighest };
                        
                        validHH = null; refHH = null; tempSwingLow = null; lockedSwingLow = null;
                        refX_CHoCH_Bullish = null; refX_BOS_Bullish = null;
                        bullishPullbacks = []; tempPullbackTracker = null;

                        refLL = null; tempLH = null; bearishPullbacks = []; tempPullbackTracker_Bearish = null;

                        // 🔥 RETRO-SCANNER INJECTION: CHoCH के पहले वाले Bearish पुलबैक्स ढूँढो
                        let startIdx = candles.findIndex(c => c.timestamp === lockedSwingHigh.time);
                        let retroIDM = scanRetroactivePullbacks(startIdx, i, candles, "BEARISH");
                        confirmedLH = retroIDM; 

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
                    if (["E-OB", "D-OB", "E-OF", "D-OF"].includes(sig.type)) {
                        
                        // अगर पहले से Demand/Supply नाम नहीं हुआ है, तभी चेक करो
                        if (!sig.displayName || (!sig.displayName.includes("Demand") && !sig.displayName.includes("Supply"))) {
                            sig.isActive = false; // पुराने ज़ोन डीएक्टिवेट करें
                            
                            let isMitigated = false;
                            let startIdx = candles.findIndex(c => c.timestamp === sig.startTime);
                            
                            if (startIdx !== -1) {
                                for (let j = startIdx + 3; j <= i; j++) {
                                    // बुलिश ज़ोन के लिए चेकिंग
                                    if (sig.trend === "BULLISH" && candles[j].low <= sig.priceTop) {
                                        isMitigated = true;
                                        break;
                                    }
                                    // बेयरिश ज़ोन के लिए चेकिंग
                                    if (sig.trend === "BEARISH" && candles[j].high >= sig.priceBottom) {
                                        isMitigated = true;
                                        break;
                                    }
                                }
                            }

                            // 🎯 सिर्फ अनमिटिगेटेड ज़ोन्स का नाम उनके ट्रेंड के हिसाब से बदलें
                            if (!isMitigated) {
                                if (sig.trend === "BULLISH") {
                                    if (sig.type === "E-OB" || sig.type === "D-OB") sig.displayName = "Demand Zone(OB)";
                                    if (sig.type === "E-OF" || sig.type === "D-OF") sig.displayName = "Demand Zone(OF)";
                                } else if (sig.trend === "BEARISH") {
                                    if (sig.type === "E-OB" || sig.type === "D-OB") sig.displayName = "Supply Zone(OB)";
                                    if (sig.type === "E-OF" || sig.type === "D-OF") sig.displayName = "Supply Zone(OF)";
                                }
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
                            price: validHH.price,       
                            startTime: validHH.time,    
                            endTime: curr.timestamp
                        });

                        if (refX_CHoCH_Bullish) {
                            signals.push({ type: "X", trend: "BULLISH", sweptSide: "LOW", price: lockedSwingLow.price, startTime: lockedSwingLow.time, endTime: refX_CHoCH_Bullish.time });
                            refX_CHoCH_Bullish = null;
                        }

                        lockedSwingLow = { ...tempSwingLow };
                        isIdmTaken = false;
                        validHH = null; refHH = null; refX_BOS_Bullish = null;
                        
                        // 🔥 RETRO-SCANNER INJECTION: BOS के पहले वाले Bullish पुलबैक्स ढूँढो
                        let startIdx = candles.findIndex(c => c.timestamp === lockedSwingLow.time);
                        let retroIDM = scanRetroactivePullbacks(startIdx, i, candles, "BULLISH");
                        confirmedHL = retroIDM; 

                        bullishPullbacks = []; 
                        tempPullbackTracker = null;
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
 * 🎯 BEARISH Mitigation Time: कट-ऑफ टाइम ढूँढना जब प्राइस सप्लाई ज़ोन को हिट करे
 */
const findMitigationTime_Bearish = (zoneBottomPrice, startIndex, candles) => {
    // IDM के बाद वाली कैंडल से स्कैन शुरू करेंगे
    for (let j = startIndex + 1; j < candles.length; j++) {
        // 🎯 Bearish Rule: क्या प्राइस नीचे से ऊपर जाकर ज़ोन के बॉटम से टकराया?
        if (candles[j].high >= zoneBottomPrice) {
            return candles[j].timestamp; // जैसे ही टच हुआ, वही टाइम लॉक कर दो
        }
    }
    // अगर किसी ने टच नहीं किया (Unmitigated), तो चार्ट के अंत तक बॉक्स खींच दो
    return candles[candles.length - 1].timestamp; 
};


/**
 * 🎯 Helper: Check if Order Flow (Pullback) is Mitigated
 */
// const isOfMitigated = (pb, candles, currentIndex) => {
//     // ब्रेकआउट कैंडल के बाद से IDM तक चेक करेंगे
//     const startIdx = pb.breakCandleIndex + 1;
//     for (let j = startIdx; j <= currentIndex; j++) {
//         if (j >= candles.length) break;
//         // बुलिश में: अगर कोई कैंडल OF के टॉप (confirmHH) को नीचे की तरफ टच कर दे
//         if (candles[j].low <= pb.confirmHH) {
//             return true; // OF मिटिगेट हो गया!
//         }
//     }
//     return false; // OF अभी भी फ्रेश है!
// };


// /**
//  * 🎯 Helper: Check if Bearish Order Flow (Pullback) is Mitigated
//  */
// const isOfMitigated_Bearish = (pb, candles, currentIndex) => {
//     // ब्रेकआउट कैंडल के बाद से IDM तक चेक करेंगे
//     const startIdx = pb.breakCandleIndex + 1;
//     for (let j = startIdx; j <= currentIndex; j++) {
//         if (j >= candles.length) break;
//         // 🎯 Bearish में: अगर कोई कैंडल ऊपर उठकर OF के बॉटम (confirmLL) को टच कर दे
//         if (candles[j].high >= pb.confirmLL) {
//             return true; // OF मिटिगेट हो गया!
//         }
//     }
//     return false; // OF अभी भी फ्रेश है!
// };


/**
 * 🎯 Helper: Check if Bullish Order Flow is Mitigated (TAPPED)
 */
const isOfMitigated = (pb, candles, currentIndex) => {
    const startIdx = pb.breakCandleIndex + 1;
    for (let j = startIdx; j <= currentIndex; j++) {
        if (j >= candles.length) break;

        // 🎯 SMC Rule: बुलिश OF का टॉप (confirmHH) है। 
        // प्राइस जैसे ही नीचे गिरकर इसे टच करेगा, ज़ोन मिटिगेट!
        if (candles[j].low <= pb.confirmHH) { 
            return true; 
        }
    }
    return false; // टच नहीं हुआ, मतलब फ्रेश है!
};

/**
 * 🎯 Helper: Check if Bearish Order Flow is Mitigated (TAPPED)
 */
const isOfMitigated_Bearish = (pb, candles, currentIndex) => {
    const startIdx = pb.breakCandleIndex + 1;
    for (let j = startIdx; j <= currentIndex; j++) {
        if (j >= candles.length) break;
        
        // 🎯 SMC Rule: बेयरिश OF का बॉटम (confirmLL) है।
        // प्राइस जैसे ही ऊपर उठकर इसे टच करेगा, ज़ोन मिटिगेट!
        if (candles[j].high >= pb.confirmLL) { 
            return true; 
        }
    }
    return false; // टच नहीं हुआ, मतलब फ्रेश है!
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
 * 🎯 E-OB / D-OB ढूँढने का BEARISH SMC रूल: "Swing High to Ref LL"
 */
const findBearishValidOrderBlock = (pullback, candles, currentIndex) => {
    
    // 1. Start: "Swing High" (Top) वाली कैंडल को 1st कैंडल मानेंगे
    const startIdx = pullback.validLHCandleIndex; // Bearish में Lower High (LH)
    const endIdx = pullback.breakCandleIndex; 

    for (let i = startIdx; i <= endIdx; i++) {
        if (i + 2 >= candles.length) continue;

        const firstCandle = candles[i];
        const thirdCandle = candles[i + 2];

        // 2. Bearish FVG Check: क्या 1st कैंडल का Low, 3rd कैंडल के High से ऊपर है? (Imbalance)
        if (firstCandle.low > thirdCandle.high) {
            
            // Mitigation चेक (क्या भविष्य में मार्केट ऊपर आकर इसे टच किया है?)
            let isMitigated = false;
            for (let j = i + 3; j <= currentIndex; j++) {
                if (j >= candles.length) break;
                // 🎯 Bearish में कैंडल का High ज़ोन के Bottom (firstCandle.low) को टच करता है
                if (candles[j].high >= firstCandle.low) { 
                    isMitigated = true;
                    break;
                }
            }

            if (!isMitigated) {
                // ✅ 3. Bearish FVG मिल गया!
                return {
                    found: true,
                    // Bearish बॉक्स का Top (High) और Bottom (Low)
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
            // 🎯 THE OVERLAP GUARD: अगर D-OB का टाइम E-OB से टकरा रहा है, तो इसे स्किप कर दो!
            if (smcZones.eob && smcZones.eob.startTime === obResult.startTime) {
                continue; 
            }

            const mitigatedOF = isOfMitigated(pb, candles, currentIndex);
            
            smcZones.dof = { 
                type: "D-OF", top: pb.confirmHH, bottom: pb.validHL, startTime: pb.startTime, isMitigated: mitigatedOF, data: pb 
            };

            smcZones.dob = { 
                type: "D-OB", top: obResult.price.high, bottom: obResult.price.low, startTime: obResult.startTime, fvgTop: obResult.fvgZone.top, fvgBottom: obResult.fvgZone.bottom, data: pb
            };
            break; 
        }
    }
    return smcZones;
};


const findSMCZones_Bearish = (candles, pullbacksArray, currentIndex) => {
    let smcZones = { eof: null, eob: null, dof: null, dob: null };
    if (!pullbacksArray || pullbacksArray.length === 0) return smcZones;

    // ==============================================================
    // 🔥 1. EXTREME ZONES (E-OF / E-OB) - Bearish
    // ==============================================================
    // यहाँ हम लूप लगा रहे हैं ताकि अगर पहला लेग फेल हो जाए, तो इंजन अगले लेग को चेक करे
    for (let i = 0; i < pullbacksArray.length; i++) {
        const pb = pullbacksArray[i];
        const obResult = findBearishValidOrderBlock(pb, candles, currentIndex);

        if (obResult.found) {
            // 🎯 असली जादू यहाँ है: अब हम चेक कर रहे हैं कि OF मिटिगेट हुआ है या नहीं!
            const mitigatedOF = isOfMitigated_Bearish(pb, candles, currentIndex);
            
            smcZones.eof = { 
                type: "E-OF", 
                top: pb.validLH,       // Bearish pullback top (Supply)
                bottom: pb.confirmLL,  // Bearish pullback bottom (Break point)
                startTime: pb.startTime, 
                isMitigated: mitigatedOF, // 🚀 अब यह डायनामिक है!
                data: pb 
            };
            
            smcZones.eob = { 
                type: "E-OB", 
                top: obResult.price.top, 
                bottom: obResult.price.bottom, 
                startTime: obResult.startTime, 
                fvgTop: obResult.fvgZone.top, 
                fvgBottom: obResult.fvgZone.bottom 
            };
            break; 
        }
    }

    // ==============================================================
    // 🔥 2. DECISIONAL ZONES (D-OF / D-OB) - BEARISH
    // ==============================================================
    for (let i = pullbacksArray.length - 1; i >= 0; i--) {
        const pb = pullbacksArray[i];
        
        if (smcZones.eof && smcZones.eof.data.id === pb.id) break;

        const obResult = findBearishValidOrderBlock(pb, candles, currentIndex);

        if (obResult.found) {
            // 🎯 THE OVERLAP GUARD: अगर D-OB का टाइम E-OB से टकरा रहा है, तो इसे स्किप कर दो!
            if (smcZones.eob && smcZones.eob.startTime === obResult.startTime) {
                continue; 
            }

            const mitigatedOF = isOfMitigated_Bearish(pb, candles, currentIndex);
            
            smcZones.dof = { 
                type: "D-OF", top: pb.validLH, bottom: pb.confirmLL, startTime: pb.startTime, isMitigated: mitigatedOF, data: pb 
            };

            smcZones.dob = { 
                type: "D-OB", top: obResult.price.top, bottom: obResult.price.bottom, startTime: obResult.startTime, fvgTop: obResult.fvgZone.top, fvgBottom: obResult.fvgZone.bottom, data: pb
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
