
// // =========================================================================
// // 🧠 SMART RETRO-SCANNER (Visual Zig-Zag Logic by Chanchal Bhai)
// // =========================================================================
// const scanRetroactivePullbacks = (startIndex, endIndex, candles, trendType) => {
//     let validPullbacks = [];
//     let inPullback = false;
//     let tempExtreme = null;
//     let targetBreakLevel = null;

//     if (trendType === "BEARISH") {
//         for (let j = startIndex + 1; j <= endIndex; j++) {
//             let curr = candles[j];
//             let prev = candles[j - 1];
//             let isOutsideBar = curr.high > prev.high && curr.low < prev.low;
//             let brokeHigh = curr.high > prev.high;

//             if (!inPullback && brokeHigh && !isOutsideBar) {
//                 inPullback = true;
//                 targetBreakLevel = prev.low;
//                 tempExtreme = { price: curr.high, time: curr.timestamp };
//             }
//             else if (inPullback) {
//                 if (curr.high > tempExtreme.price) {
//                     tempExtreme = { price: curr.high, time: curr.timestamp };
//                 }
//                 if (curr.low < targetBreakLevel) {
//                     validPullbacks.push({
//                         price: tempExtreme.price,
//                         time: tempExtreme.time,
//                         confirmLL: targetBreakLevel // 🎯 E-OF के बॉटम के लिए
//                     });
//                     inPullback = false;
//                 }
//             }
//         }
//     }
//     else if (trendType === "BULLISH") {
//         for (let j = startIndex + 1; j <= endIndex; j++) {
//             let curr = candles[j];
//             let prev = candles[j - 1];
//             let isOutsideBar = curr.high > prev.high && curr.low < prev.low;
//             let brokeLow = curr.low < prev.low;

//             if (!inPullback && brokeLow && !isOutsideBar) {
//                 inPullback = true;
//                 targetBreakLevel = prev.high;
//                 tempExtreme = { price: curr.low, time: curr.timestamp };
//             }
//             else if (inPullback) {
//                 if (curr.low < tempExtreme.price) {
//                     tempExtreme = { price: curr.low, time: curr.timestamp };
//                 }
//                 if (curr.high > targetBreakLevel) {
//                     validPullbacks.push({
//                         price: tempExtreme.price,
//                         time: tempExtreme.time,
//                         confirmHH: targetBreakLevel // 🎯 E-OF के टॉप के लिए
//                     });
//                     inPullback = false;
//                 }
//             }
//         }
//     }
//     return validPullbacks; // 🔥 पूरा लिस्ट रिटर्न करेगा
// };


// const identifyMechanicalStructure = (candles, startingTrend = "AUTO", counterStructureDepth = 0) => {

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

//     // 🔥 NEW: History Tracker for Counter Structures
//     let historicalCounterWaves = [];

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


//     // 🔥 COUNTER STRUCTURE (D2S) VARIABLES FOR BULLISH TREND
//     let isDobTapped_D2S = false;
//     let tappingCandle_D2S = null;
//     let isDobFailed_D2S = false;
//     let refLL_D2S = null;
//     let tempLH_D2S = null;
//     let confirmedLH_D2S = null;
//     let idm_D2S_Taken = false;


//     // Phase 2 ke variables (Advance preparation)
//     let swingLH_D2S = null;
//     let pullbacks_D2S = [];

//     // 🔥 NEW: COUNTER STRUCTURE (S2D) PHASE 2 & 3 VARIABLES
//     let validHH_S2D = null;
//     let tempSwingLow_S2D = null;
//     let activeDob_S2D = null;
//     let activeDof_S2D = null;
//     let activeEob_S2D = null;  // 🎯 PHASE 3 
//     let activeEof_S2D = null;  // 🎯 PHASE 3 
//     let refX_S2D = null;


//     // 🔥 NEW: COUNTER STRUCTURE (D2S) PHASE 2 & 3 VARIABLES
//     let validLL_D2S = null;
//     let tempSwingHigh_D2S = null;
//     let activeDob_D2S = null;
//     let activeDof_D2S = null;
//     let activeEob_D2S = null;
//     let activeEof_D2S = null;
//     let refX_D2S = null;

//     // ==========================================
//     // 🧹 THE SMART HISTORY MANAGER & MAGIC ERASER
//     // ==========================================
//     const isCounterSig = (sig) => 
//         sig.type === "IDM(D2S)" || sig.type === "IDM(S2D)" || 
//         sig.type === "BOS(C)" || sig.type === "X(C)" ||
//         (sig.displayName && (sig.displayName.includes("S2D") || sig.displayName.includes("D2S")));

//     const wipeCounterStructure = () => {
//         // 1. D2S मेमोरी क्लीन
//         isDobTapped_D2S = false; tappingCandle_D2S = null; isDobFailed_D2S = false;
//         refLL_D2S = null; tempLH_D2S = null; confirmedLH_D2S = null; idm_D2S_Taken = false;
//         swingLH_D2S = null; pullbacks_D2S = [];
//         validLL_D2S = null; tempSwingHigh_D2S = null;
//         activeDob_D2S = null; activeDof_D2S = null;
//         activeEob_D2S = null; activeEof_D2S = null;
//         refX_D2S = null;

//         // 2. S2D मेमोरी क्लीन
//         isDobTapped_S2D = false; tappingCandle_S2D = null; isDobFailed_S2D = false;
//         refHH_S2D = null; tempHL_S2D = null; confirmedHL_S2D = null; idm_S2D_Taken = false;
//         validHH_S2D = null; tempSwingLow_S2D = null; 
//         activeDob_S2D = null; activeDof_S2D = null; 
//         activeEob_S2D = null; activeEof_S2D = null; 
//         refX_S2D = null;

//         // 🔥 3. SMART HISTORY LOGIC
//         // सिर्फ वो काउंटर सिग्नल्स निकालो जो अभी 'करंट' हैं (यानी पहले से हिस्ट्री में नहीं गए हैं)
//         let currentCounterSignals = signals.filter(sig => isCounterSig(sig) && !sig.isHistorical);

//         if (currentCounterSignals.length > 0) {
//             // इन सिग्नल्स को 'Historical' मार्क कर दें ताकि फ्रंटएंड इन्हें हल्का (dim) कर सके
//             currentCounterSignals.forEach(sig => sig.isHistorical = true);
//             historicalCounterWaves.push(currentCounterSignals);
//         }

//         // FIFO: पुरानी लहरों (Waves) को यूज़र की लिमिट (Depth) के हिसाब से हटाएं
//         while (historicalCounterWaves.length > counterStructureDepth) {
//             historicalCounterWaves.shift(); // सबसे पुराना काउंटर स्ट्रक्चर डिलीट!
//         }

//         // 4. Signals Array को फिर से बनाएं (Main Signals + Allowed History)
//         let mainSignals = signals.filter(sig => !isCounterSig(sig));
//         let validHistorySignals = [];
//         historicalCounterWaves.forEach(wave => validHistorySignals.push(...wave));

//         signals = [...mainSignals, ...validHistorySignals];
//     };

//     // 🔥 NEW: COUNTER STRUCTURE (S2D) VARIABLES FOR BEARISH TREND
//     let isDobTapped_S2D = false;
//     let tappingCandle_S2D = null;
//     let isDobFailed_S2D = false;
//     let refHH_S2D = null;
//     let tempHL_S2D = null;
//     let confirmedHL_S2D = null;
//     let idm_S2D_Taken = false;




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
//                 wipeCounterStructure();
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
//                         wipeCounterStructure();
//                         lockedSwingLow = { ...absoluteLowest };

//                         validLL = null; refLL = null; tempSwingHigh = null; lockedSwingHigh = null;
//                         refX_CHoCH_Bearish = null; refX_BOS_Bearish = null;
//                         bearishPullbacks = []; tempPullbackTracker_Bearish = null;

//                         refHH = null; tempHL = null; bullishPullbacks = []; tempPullbackTracker = null;

//                         // 🔥 RETRO-SCANNER INJECTION: CHoCH के पहले वाले Bullish पुलबैक्स ढूँढो
//                         let startIdx = candles.findIndex(c => c.timestamp === lockedSwingLow.time);
//                         let retroPBs = scanRetroactivePullbacks(startIdx, i, candles, "BULLISH");
//                         confirmedHL = retroPBs.length > 0 ? retroPBs[retroPBs.length - 1] : null;

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
//                             // 🔥 THE McM(X) SWEEP CHECK FOR BEARISH: क्या कैंडल ने Ref LL के ऊपर क्लोज़ किया? (Wick Sweep)
//                             tempPullbackTracker_Bearish.isSwept = (curr.close > tempPullbackTracker_Bearish.confirmLL);

//                             tempPullbackTracker_Bearish.breakCandleIndex = i;
//                             bearishPullbacks.push({ ...tempPullbackTracker_Bearish });
//                             tempPullbackTracker_Bearish = null;
//                         }
//                     }
//                 }
//             }

//             // 🎯 THE FINAL IDM CONFIRMATION & SUPPLY ZONE TRANSFORMATION
//             // 🎯 THE FINAL IDM CONFIRMATION & SUPPLY ZONE TRANSFORMATION
//             if (confirmedLH !== null && curr.high >= confirmedLH.price && !isIdmTaken) {
//                 isIdmTaken = true;
//                 validLL = { ...absoluteLowest };
//                 tempSwingHigh = { price: curr.high, time: curr.timestamp };
//                 majorIdm_Bearish = { price: curr.high, time: curr.timestamp };

//                 // ==========================================================
//                 // 🔥 THE McM(X) & IDM-OF LOGIC FOR BEARISH (THE TRUE SWEEP FIX)
//                 // ==========================================================
//                 let idmLabel = "IDM";
//                 const targetPb = bearishPullbacks.find(pb => pb.validLH === confirmedLH.price);

//                 if (targetPb) {
//                     // 🛡️ THE REAL SWEEP VERIFIER FOR BEARISH
//                     // चेक करो कि ब्रेक होने वाली कैंडल से लेकर अभी (IDM लेने वाली कैंडल) तक,
//                     // क्या किसी भी कैंडल ने Ref LL (confirmLL) के नीचे फुल 'Close' किया है?
//                     let trueSweep = true;
//                     for (let k = targetPb.breakCandleIndex; k <= i; k++) {
//                         if (candles[k].close < targetPb.confirmLL) {
//                             trueSweep = false; // ❌ Full body break मिल गया, यह स्वीप नहीं है!
//                             break;
//                         }
//                     }

//                     if (trueSweep) {
//                         idmLabel = "IDM/ch"; 

//                         // 1. McM(X) लाइन ड्रा करें (बॉटम पर)
//                         signals.push({ 
//                             type: "McM(X)", 
//                             trend: "BEARISH", 
//                             sweptSide: "LOW", 
//                             price: targetPb.confirmLL, // Ref LL का प्राइस
//                             startTime: targetPb.startTime, 
//                             endTime: validLL.time  
//                         });

//                         // 2. IDM-OF (Order Flow) Box ड्रा करें
//                         // Bearish में यह Demand ज़ोन की तरह काम करेगा, इसलिए बुलिश मिटिगेशन (ऊपर से नीचे टैप) यूज़ करेंगे
//                         let mitTimeIdmOf = findMitigationTime(confirmedLH.price, i, candles);

//                         signals.push({ 
//                             type: "IDM-OF", 
//                             displayName: "IDM OF", 
//                             trend: "BEARISH", 
//                             priceTop: confirmedLH.price, 
//                             priceBottom: validLL.price, 
//                             startTime: validLL.time, 
//                             endTime: mitTimeIdmOf, 
//                             isActive: true 
//                         });
//                     }
//                 }

//                 // IDM या IDM/ch की लाइन ड्रा करें
//                 signals.push({ type: idmLabel, trend: "BEARISH", price: confirmedLH.price, startTime: confirmedLH.time, endTime: curr.timestamp });

//                 // 🔥 1. THE ROOT EXTREME FIX
//                 const rootTime = lockedSwingHigh ? lockedSwingHigh.time : absoluteHighest.time;
//                 const rootPrice = lockedSwingHigh ? lockedSwingHigh.price : absoluteHighest.price;

//                 const swingLHIndex = candles.findIndex(c => c.timestamp === rootTime);
//                 const refLLIndex = candles.findIndex(c => c.timestamp === validLL.time);

//                 // 🎯 THE E-OF SIZE FIX: स्कैनर से पहला पुलबैक निकालो
//                 let rootConfirmLL = validLL.price;
//                 let wavePullbacks = scanRetroactivePullbacks(swingLHIndex, refLLIndex, candles, "BEARISH");
//                 if (wavePullbacks.length > 0) {
//                     rootConfirmLL = wavePullbacks[0].confirmLL; // पहला पुलबैक का Low
//                 }

//                 const rootExtreme = {
//                     id: "ROOT_SWING_LH",
//                     validLH: rootPrice,
//                     validLHCandleIndex: swingLHIndex,
//                     confirmLL: rootConfirmLL, // <--- परफेक्ट साइज़
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
//                         wipeCounterStructure();
//                         validLL = null; refLL = null; refX_BOS_Bearish = null;

//                         // 🔥 RETRO-SCANNER INJECTION: BOS के पहले वाले पुलबैक्स ढूँढो
//                         let startIdx = candles.findIndex(c => c.timestamp === lockedSwingHigh.time);
//                         let retroPBs = scanRetroactivePullbacks(startIdx, i, candles, "BEARISH");
//                         confirmedLH = retroPBs.length > 0 ? retroPBs[retroPBs.length - 1] : null;
                        
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
//             // =========================================================================
//             // 🔥 PHASE 1: COUNTER STRUCTURE (S2D) LOGIC STARTS HERE 🔥
//             // =========================================================================

//             // 🛑 THE CHoCH/BOS AUTO-CLEANER (Chanchal Bhai's Rule)
//             let currentWaveStart_S2D = lockedSwingHigh ? lockedSwingHigh.time : absoluteHighest.time;

//             if ( (confirmedHL_S2D && confirmedHL_S2D.time < currentWaveStart_S2D) || 
//                  (refHH_S2D && refHH_S2D.time < currentWaveStart_S2D) ) {
//                 isDobTapped_S2D = false; tappingCandle_S2D = null; isDobFailed_S2D = false;
//                 refHH_S2D = null; tempHL_S2D = null; confirmedHL_S2D = null; idm_S2D_Taken = false;
//             }
            
//             // 🎯 1. Active D-OB (Supply Zone) को ढूँढना
//             let activeDobZone_Bearish = null;
//             if (isIdmTaken) {
//                 for (let s = signals.length - 1; s >= 0; s--) {
//                     if (signals[s].type === "D-OB" && signals[s].trend === "BEARISH" && signals[s].isActive !== false) {
//                         if (signals[s].startTime >= currentWaveStart_S2D) { 
//                             activeDobZone_Bearish = signals[s];
//                             break;
//                         }
//                     }
//                 }
//             }

//             if (activeDobZone_Bearish) {
//                 // 🎯 2. TAPPING CHECK 
//                 if (!isDobTapped_S2D && curr.high >= activeDobZone_Bearish.priceBottom) {
//                     isDobTapped_S2D = true;
//                     tappingCandle_S2D = curr;
//                 }

//                 // 🎯 3. D-OB FAILURE CHECK 
//                 if (isDobTapped_S2D && !isDobFailed_S2D) {
//                     let isOutsideBar_S2D = curr.high > tappingCandle_S2D.high && curr.low < tappingCandle_S2D.low;
//                     if (!isOutsideBar_S2D) {
//                         if (curr.high > tappingCandle_S2D.high || tappingCandle_S2D.close > activeDobZone_Bearish.priceTop) {
//                             isDobFailed_S2D = true;
//                             refHH_S2D = { price: curr.high, time: curr.timestamp };
//                         }
//                     }
//                 }
//             }

//             // 🎯 4. IDM(S2D) PULLBACK TRACKING 
//             if (isDobFailed_S2D && !idm_S2D_Taken) {
//                 let brokeLow = curr.low < refCandle.low; 

//                 if (brokeLow && !isOutsideBar && refHH_S2D !== null && tempHL_S2D === null) {
//                     tempHL_S2D = { price: curr.low, time: curr.timestamp };
//                 } 
//                 else if (refHH_S2D !== null) {
//                     if (tempHL_S2D !== null && curr.low < tempHL_S2D.price) {
//                         tempHL_S2D = { price: curr.low, time: curr.timestamp };
//                     }
//                     if (tempHL_S2D === null && curr.high > refHH_S2D.price) {
//                         refHH_S2D = { price: curr.high, time: curr.timestamp };
//                     }
//                     if (tempHL_S2D !== null && curr.high >= refHH_S2D.price) {
//                         if (curr.timestamp === tempHL_S2D.time) {
//                             refHH_S2D = null; 
//                             tempHL_S2D = null; 
//                         } else {
//                             confirmedHL_S2D = tempHL_S2D;
//                             refHH_S2D = { price: curr.high, time: curr.timestamp }; 
//                             tempHL_S2D = null; 
//                         }
//                     }
//                 }

//                 // 🎯 5. IDM(S2D) HIT & ZONE GENERATION!
//                 if (confirmedHL_S2D !== null && curr.low <= confirmedHL_S2D.price) {
                    
//                     let isGhost = false;
//                     for(let k = signals.length - 1; k >= 0; k--) {
//                         let sig = signals[k];
//                         if(sig.type === "CHoCH" || sig.type === "BOS") {
//                             if(sig.endTime > confirmedHL_S2D.time) { isGhost = true; break; }
//                         }
//                     }

//                     if (!isGhost) {
//                         idm_S2D_Taken = true;
//                         // 🔥 Phase 2 की शुरुआत: Top और Bottom लॉक करो!
//                         validHH_S2D = { price: refHH_S2D.price, time: refHH_S2D.time };
//                         tempSwingLow_S2D = { price: curr.low, time: curr.timestamp };

//                         signals.push({ 
//                             type: "IDM(S2D)", trend: "BULLISH_COUNTER", 
//                             price: confirmedHL_S2D.price, startTime: confirmedHL_S2D.time, 
//                             endTime: curr.timestamp, sweptSide: "LOW", position: "bottom"    
//                         });

//                         // =======================================================
//                         // 🔥 THE BUG FIX: S2D का सही Bottom (Start Index) ढूँढना!
//                         // =======================================================
//                         let tempStartIdx = candles.findIndex(c => c.timestamp === currentWaveStart_S2D);
//                         let endIdx_S2D = candles.findIndex(c => c.timestamp === validHH_S2D.time);
                        
//                         let startIdx_S2D = tempStartIdx;
//                         if (tempStartIdx !== -1 && endIdx_S2D !== -1) {
//                             let minLow = candles[tempStartIdx].low;
//                             for (let k = tempStartIdx; k <= endIdx_S2D; k++) {
//                                 if (candles[k].low < minLow) {
//                                     minLow = candles[k].low;
//                                     startIdx_S2D = k;
//                                 }
//                             }
//                         }
                        
//                         let s2dPullbacks = scanRetroactivePullbacks(startIdx_S2D, endIdx_S2D, candles, "BULLISH");

//                         // 🔥 ROOT EXTREME FIX FOR S2D (ताकि D-OB सही से मिले)
//                         if (startIdx_S2D !== -1 && endIdx_S2D !== -1) {
//                             let rootConfirmHH = s2dPullbacks.length > 0 ? s2dPullbacks[0].confirmHH : validHH_S2D.price;
//                             s2dPullbacks.unshift({
//                                 id: "ROOT_SWING_HL",
//                                 validHL: candles[startIdx_S2D].low,
//                                 validHLCandleIndex: startIdx_S2D,
//                                 confirmHH: rootConfirmHH,
//                                 confirmHHCandleIndex: endIdx_S2D,
//                                 breakCandleIndex: endIdx_S2D, 
//                                 startTime: candles[startIdx_S2D].timestamp
//                             });
//                         }

//                         let poiZones_S2D = findSMCZones(candles, s2dPullbacks, i);
//                         // =======================================================
                        
//                         if (poiZones_S2D.dof) {
//                             let mitTimeDof = findMitigationTime(poiZones_S2D.dof.top, i, candles);
//                             activeDof_S2D = { type: "D-OF", displayName: "D-S2D(OF)", trend: "BULLISH", priceTop: poiZones_S2D.dof.top, priceBottom: poiZones_S2D.dof.bottom, startTime: poiZones_S2D.dof.startTime, endTime: mitTimeDof, isActive: true };
//                             signals.push(activeDof_S2D);
//                         }
//                         if (poiZones_S2D.dob) {
//                             let mitTimeDob = findMitigationTime(poiZones_S2D.dob.top, i, candles);
//                             activeDob_S2D = { type: "D-OB", displayName: "D-S2D(OB)", trend: "BULLISH", priceTop: poiZones_S2D.dob.top, priceBottom: poiZones_S2D.dob.bottom, startTime: poiZones_S2D.dob.startTime, fvgTop: poiZones_S2D.dob.fvgTop, fvgBottom: poiZones_S2D.dob.fvgBottom, endTime: mitTimeDob, isActive: true };
//                             signals.push(activeDob_S2D);
//                         }
                        
//                         // --- 🔥 PHASE 3: EXTREME ZONES (S2D) ---
//                         if (poiZones_S2D.eof) {
//                             let mitTimeEof = findMitigationTime(poiZones_S2D.eof.top, i, candles);
//                             activeEof_S2D = { 
//                                 type: "E-OF", 
//                                 displayName: "E-S2D(OF)", // 🎯 यही नाम फ्रंटएंड पर छपेगा
//                                 trend: "BULLISH", 
//                                 priceTop: poiZones_S2D.eof.top, 
//                                 priceBottom: poiZones_S2D.eof.bottom, 
//                                 startTime: poiZones_S2D.eof.startTime, 
//                                 endTime: mitTimeEof, 
//                                 isActive: true 
//                             };
//                             signals.push(activeEof_S2D);
//                         }
//                         if (poiZones_S2D.eob) {
//                             let mitTimeEob = findMitigationTime(poiZones_S2D.eob.top, i, candles);
//                             activeEob_S2D = { 
//                                 type: "E-OB", 
//                                 displayName: "E-S2D(OB)", // 🎯 यही नाम फ्रंटएंड पर छपेगा
//                                 trend: "BULLISH", 
//                                 priceTop: poiZones_S2D.eob.top, 
//                                 priceBottom: poiZones_S2D.eob.bottom, 
//                                 startTime: poiZones_S2D.eob.startTime, 
//                                 fvgTop: poiZones_S2D.eob.fvgTop, 
//                                 fvgBottom: poiZones_S2D.eob.fvgBottom, 
//                                 endTime: mitTimeEob, 
//                                 isActive: true 
//                             };
//                             signals.push(activeEob_S2D);
//                         }
//                     }
                    
//                     refHH_S2D = null; tempHL_S2D = null; confirmedHL_S2D = null;
//                 }
//             }
//             // =========================================================================
//             // 🔥 PHASE 1: COUNTER STRUCTURE ENDS HERE 🔥
//             // =========================================================================
//             // 🎯 6. PHASE 2 & 3: BOS(C) LOGIC FOR S2D
//             if (idm_S2D_Taken && validHH_S2D !== null) {
//                 // Dip ट्रैक करो
//                 if (curr.low < tempSwingLow_S2D.price) {
//                     tempSwingLow_S2D = { price: curr.low, time: curr.timestamp };
//                 }
                
//                 let breakLevel_S2D = refX_S2D ? refX_S2D.price : validHH_S2D.price;
                
//                 if (curr.high > breakLevel_S2D) {
//                     if (curr.close > breakLevel_S2D) { // 🚀 Full Body Break (BOS-C)
                        
//                         // 🔥 चेक करो कि क्या ब्रेक करने से पहले किसी भी ज़ोन (Decisional या Extreme) को टैप किया था?
//                         let isTapped = false;
//                         if ((activeDob_S2D && tempSwingLow_S2D.price <= activeDob_S2D.priceTop) || 
//                             (activeDof_S2D && tempSwingLow_S2D.price <= activeDof_S2D.priceTop) ||
//                             (activeEob_S2D && tempSwingLow_S2D.price <= activeEob_S2D.priceTop) ||
//                             (activeEof_S2D && tempSwingLow_S2D.price <= activeEof_S2D.priceTop)) {
//                             isTapped = true;
//                         }
                        
//                         if (isTapped) {
//                             signals.push({ type: "BOS(C)", trend: "BULLISH", price: validHH_S2D.price, startTime: validHH_S2D.time, endTime: curr.timestamp });
//                             if (refX_S2D) {
//                                 signals.push({ type: "X(C)", sweptSide: "HIGH", trend: "BULLISH", price: validHH_S2D.price, startTime: validHH_S2D.time, endTime: refX_S2D.time });
//                             }
//                         } else {
//                             // 🧹 बिना टैप किये ब्रेक किया: चार्ट से पुराने सारे D और E ज़ोन मिटा दो!
//                             signals = signals.filter(s => 
//                                 s !== activeDob_S2D && s !== activeDof_S2D && 
//                                 s !== activeEob_S2D && s !== activeEof_S2D
//                             );
//                             signals.push({ type: "BOS(C)", trend: "BULLISH", price: validHH_S2D.price, startTime: validHH_S2D.time, endTime: curr.timestamp });
//                         }
                        
//                         // 🔥 S2D का ट्रेंड चालू रहेगा! अगले पुलबैक के लिए रीसेट करो
//                         idm_S2D_Taken = false;
//                         refHH_S2D = { price: curr.high, time: curr.timestamp };
//                         validHH_S2D = null; tempSwingLow_S2D = null; 
//                         activeDob_S2D = null; activeDof_S2D = null; 
//                         activeEob_S2D = null; activeEof_S2D = null; 
//                         refX_S2D = null;
                        
//                     } else { 
//                         // 🧹 Sweep हुआ (X-C)
//                         refX_S2D = { price: curr.high, time: curr.timestamp };
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
//                 wipeCounterStructure();
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
//                         signals.push({
//                             type: "CHoCH", trend: "BEARISH",
//                             price: lockedSwingLow.price,
//                             startTime: lockedSwingLow.time,
//                             endTime: curr.timestamp
//                         });

//                         trend = -1;
//                         isIdmTaken = false;
//                         wipeCounterStructure();
//                         lockedSwingHigh = { ...absoluteHighest };

//                         validHH = null; refHH = null; tempSwingLow = null; lockedSwingLow = null;
//                         refX_CHoCH_Bullish = null; refX_BOS_Bullish = null;
//                         bullishPullbacks = []; tempPullbackTracker = null;

//                         refLL = null; tempLH = null; bearishPullbacks = []; tempPullbackTracker_Bearish = null;

//                         // 🔥 RETRO-SCANNER INJECTION: CHoCH के पहले वाले Bearish पुलबैक्स ढूँढो
//                         let startIdx = candles.findIndex(c => c.timestamp === lockedSwingHigh.time);
//                         let retroPBs = scanRetroactivePullbacks(startIdx, i, candles, "BEARISH");
//                         confirmedLH = retroPBs.length > 0 ? retroPBs[retroPBs.length - 1] : null;

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
//                     if (curr.timestamp === tempHL.time) {
//                         // ❌ Fake Engulfing Pullback (Discard)
//                         refHH = null;
//                         tempPullbackTracker = null;
//                     } else {
//                         // ✅ Valid Pullback (Confirm)
//                         confirmedHL = tempHL;
//                         refHH = null;

//                         if (tempPullbackTracker) {
//                             // 🔥 THE McM(X) SWEEP CHECK: क्या कैंडल ने Ref HH के नीचे क्लोज़ किया? (Wick Sweep)
//                             tempPullbackTracker.isSwept = (curr.close < tempPullbackTracker.confirmHH);
                            
//                             tempPullbackTracker.breakCandleIndex = i;
//                             bullishPullbacks.push({ ...tempPullbackTracker });
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

//                 // ==========================================================
//                 // 🔥 THE McM(X) & IDM-OF LOGIC
//                 // ==========================================================
//                 let idmLabel = "IDM";
//                 const targetPb = bullishPullbacks.find(pb => pb.validHL === confirmedHL.price);

//                 if (targetPb) {
//                     // 🛡️ THE REAL SWEEP VERIFIER
//                     // चेक करो कि ब्रेक होने वाली कैंडल से लेकर अभी (IDM लेने वाली कैंडल) तक,
//                     // क्या किसी भी कैंडल ने Ref HH (confirmHH) के ऊपर फुल 'Close' किया है?
//                     let trueSweep = true;
//                     for (let k = targetPb.breakCandleIndex; k <= i; k++) {
//                         if (candles[k].close > targetPb.confirmHH) {
//                             trueSweep = false; // ❌ Full body break मिल गया, यह स्वीप नहीं है!
//                             break;
//                         }
//                     }

//                     if (trueSweep) {
//                         idmLabel = "IDM/ch"; 

//                         // 1. McM(X) लाइन ड्रा करें (टॉप पर)
//                         signals.push({ 
//                             type: "McM(X)", 
//                             trend: "BULLISH", 
//                             sweptSide: "HIGH", 
//                             price: targetPb.confirmHH, // Ref HH का प्राइस
//                             startTime: targetPb.startTime, 
//                             endTime: validHH.time  
//                         });

//                         // 2. IDM-OF (Order Flow) Box ड्रा करें
//                         let mitTimeIdmOf = findMitigationTime_Bearish(confirmedHL.price, i, candles);

//                         signals.push({ 
//                             type: "IDM-OF", 
//                             displayName: "IDM OF", 
//                             trend: "BULLISH", 
//                             priceTop: validHH.price, 
//                             priceBottom: confirmedHL.price, 
//                             startTime: validHH.time, 
//                             endTime: mitTimeIdmOf, 
//                             isActive: true 
//                         });
//                     }
//                 }

//                 // IDM या IDM/ch की लाइन ड्रा करें
//                 signals.push({ type: idmLabel, trend: "BULLISH", price: confirmedHL.price, startTime: confirmedHL.time, endTime: curr.timestamp });
//                 // ==========================================================
//                 // 🔥 THE ROOT EXTREME FIX (Null Crash Fix)
//                 // ==========================================================   
//                 const rootTime = lockedSwingLow ? lockedSwingLow.time : absoluteLowest.time;
//                 const rootPrice = lockedSwingLow ? lockedSwingLow.price : absoluteLowest.price;

//                 const swingHLIndex = candles.findIndex(c => c.timestamp === rootTime);
//                 const refHHIndex = candles.findIndex(c => c.timestamp === validHH.time);

//                 // 🎯 THE E-OF SIZE FIX: स्कैनर से पहला पुलबैक निकालो
//                 let rootConfirmHH = validHH.price;
//                 let wavePullbacks = scanRetroactivePullbacks(swingHLIndex, refHHIndex, candles, "BULLISH");
//                 if (wavePullbacks.length > 0) {
//                     rootConfirmHH = wavePullbacks[0].confirmHH; // पहला पुलबैक का High
//                 }

//                 const rootExtreme = {
//                     id: "ROOT_SWING_HL",
//                     validHL: rootPrice,
//                     validHLCandleIndex: swingHLIndex,
//                     confirmHH: rootConfirmHH, // <--- परफेक्ट साइज़
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
//                             price: validHH.price,
//                             startTime: validHH.time,
//                             endTime: curr.timestamp
//                         });

//                         if (refX_CHoCH_Bullish) {
//                             signals.push({ type: "X", trend: "BULLISH", sweptSide: "LOW", price: lockedSwingLow.price, startTime: lockedSwingLow.time, endTime: refX_CHoCH_Bullish.time });
//                             refX_CHoCH_Bullish = null;
//                         }

//                         lockedSwingLow = { ...tempSwingLow };
//                         isIdmTaken = false;
//                         wipeCounterStructure();
//                         validHH = null; refHH = null; refX_BOS_Bullish = null;

//                         // 🔥 RETRO-SCANNER INJECTION: BOS के पहले वाले Bullish पुलबैक्स ढूँढो
//                         let startIdx = candles.findIndex(c => c.timestamp === lockedSwingLow.time);
//                         let retroPBs = scanRetroactivePullbacks(startIdx, i, candles, "BULLISH");
//                         confirmedHL = retroPBs.length > 0 ? retroPBs[retroPBs.length - 1] : null;

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

//             // =========================================================================
//             // 🔥 PHASE 1: COUNTER STRUCTURE (D2S) LOGIC STARTS HERE 🔥
//             // =========================================================================

//            // 🛑 THE CHoCH/BOS AUTO-CLEANER (Chanchal Bhai's Rule)
//             // अगर पुराना D2S ट्रैकर (LL/LH) मेन स्ट्रक्चर (CHoCH/BOS) से पहले का है, तो उसे तुरंत क्लियर कर दो!
//             let currentWaveStart_D2S = lockedSwingLow ? lockedSwingLow.time : absoluteLowest.time;
            
//             if ( (confirmedLH_D2S && confirmedLH_D2S.time < currentWaveStart_D2S) || 
//                  (refLL_D2S && refLL_D2S.time < currentWaveStart_D2S) ) {
//                 isDobTapped_D2S = false; tappingCandle_D2S = null; isDobFailed_D2S = false;
//                 refLL_D2S = null; tempLH_D2S = null; confirmedLH_D2S = null; idm_D2S_Taken = false;
//             }

//             // 🎯 1. Active D-OB Zone को ढूँढना (Ghost Fix Applied)
//             let activeDobZone = null;
//             if (isIdmTaken) {
//                 for (let s = signals.length - 1; s >= 0; s--) {
//                     if (signals[s].type === "D-OB" && signals[s].trend === "BULLISH" && signals[s].isActive !== false) {
//                         // सिर्फ करेंट वेव का D-OB उठाओ
//                         if (signals[s].startTime >= currentWaveStart_D2S) {
//                             activeDobZone = signals[s];
//                             break;
//                         }
//                     }
//                 }
//             }

//             if (activeDobZone) {
//                 // 🎯 2. TAPPING CHECK 
//                 if (!isDobTapped_D2S && curr.low <= activeDobZone.priceTop) {
//                     isDobTapped_D2S = true;
//                     tappingCandle_D2S = curr;
//                 }

//                 // 🎯 3. D-OB FAILURE CHECK
//                 if (isDobTapped_D2S && !isDobFailed_D2S) {
//                     let isOutsideBar = curr.high > tappingCandle_D2S.high && curr.low < tappingCandle_D2S.low;
//                     if (!isOutsideBar) {
//                         if (curr.low < tappingCandle_D2S.low || tappingCandle_D2S.close < activeDobZone.priceBottom) {
//                             isDobFailed_D2S = true;
//                             refLL_D2S = { price: curr.low, time: curr.timestamp };
//                         }
//                     }
//                 }
//             }

//             // 🎯 4. IDM(D2S) PULLBACK TRACKING 
//             if (isDobFailed_D2S && !idm_D2S_Taken) {
//                 let brokeHigh = curr.high > refCandle.high; 

//                 if (brokeHigh && !isOutsideBar && refLL_D2S !== null && tempLH_D2S === null) {
//                     tempLH_D2S = { price: curr.high, time: curr.timestamp };
//                 } 
//                 else if (refLL_D2S !== null) {
//                     if (tempLH_D2S !== null && curr.high > tempLH_D2S.price) {
//                         tempLH_D2S = { price: curr.high, time: curr.timestamp };
//                     }
//                     if (tempLH_D2S === null && curr.low < refLL_D2S.price) {
//                         refLL_D2S = { price: curr.low, time: curr.timestamp };
//                     }
//                     if (tempLH_D2S !== null && curr.low <= refLL_D2S.price) {
//                         if (curr.timestamp === tempLH_D2S.time) {
//                             refLL_D2S = null; 
//                             tempLH_D2S = null; 
//                         } else {
//                             confirmedLH_D2S = tempLH_D2S;
//                             refLL_D2S = { price: curr.low, time: curr.timestamp }; 
//                             tempLH_D2S = null; 
//                         }
//                     }
//                 }

//                 // 🎯 5. IDM(D2S) HIT & ZONE GENERATION!
//                 if (confirmedLH_D2S !== null && curr.high >= confirmedLH_D2S.price) {
                    
//                     let isGhost = false;
//                     for(let k = signals.length - 1; k >= 0; k--) {
//                         let sig = signals[k];
//                         if(sig.type === "CHoCH" || sig.type === "BOS") {
//                             if(sig.endTime > confirmedLH_D2S.time) { isGhost = true; break; }
//                         }
//                     }

//                     if (!isGhost) {
//                         idm_D2S_Taken = true;
                        
//                         // 🔥 Phase 2 & 3 की शुरुआत: Top और Bottom लॉक करो!
//                         validLL_D2S = { price: refLL_D2S.price, time: refLL_D2S.time };
//                         tempSwingHigh_D2S = { price: curr.high, time: curr.timestamp }; // पीक ट्रैक करने के लिए

//                         signals.push({ 
//                             type: "IDM(D2S)", trend: "BEARISH_COUNTER", 
//                             price: confirmedLH_D2S.price, startTime: confirmedLH_D2S.time, 
//                             endTime: curr.timestamp, sweptSide: "HIGH", position: "aboveBar" 
//                         });

//                         // =======================================================
//                         // 🔥 THE BUG FIX: D2S का सही Top (Start Index) ढूँढना!
//                         // =======================================================
//                         let tempStartIdx = candles.findIndex(c => c.timestamp === currentWaveStart_D2S);
//                         let endIdx_D2S = candles.findIndex(c => c.timestamp === validLL_D2S.time);
                        
//                         let startIdx_D2S = tempStartIdx;
//                         if (tempStartIdx !== -1 && endIdx_D2S !== -1) {
//                             let maxHigh = candles[tempStartIdx].high;
//                             for (let k = tempStartIdx; k <= endIdx_D2S; k++) {
//                                 if (candles[k].high > maxHigh) {
//                                     maxHigh = candles[k].high;
//                                     startIdx_D2S = k;
//                                 }
//                             }
//                         }
                        
//                         let d2sPullbacks = scanRetroactivePullbacks(startIdx_D2S, endIdx_D2S, candles, "BEARISH");

//                         // 🔥 ROOT EXTREME FIX FOR D2S (Bearish)
//                         if (startIdx_D2S !== -1 && endIdx_D2S !== -1) {
//                             let rootConfirmLL = d2sPullbacks.length > 0 ? d2sPullbacks[0].confirmLL : validLL_D2S.price;
//                             d2sPullbacks.unshift({
//                                 id: "ROOT_SWING_LH",
//                                 validLH: candles[startIdx_D2S].high,
//                                 validLHCandleIndex: startIdx_D2S,
//                                 confirmLL: rootConfirmLL, // <--- परफेक्ट साइज़
//                                 confirmLLCandleIndex: endIdx_D2S,
//                                 breakCandleIndex: endIdx_D2S, 
//                                 startTime: candles[startIdx_D2S].timestamp
//                             });
//                         }

//                         let poiZones_D2S = findSMCZones_Bearish(candles, d2sPullbacks, i);
//                         // =======================================================
                        
//                         // --- DECISIONAL ZONES (D2S) ---
//                         if (poiZones_D2S.dof) {
//                             let mitTimeDof = findMitigationTime_Bearish(poiZones_D2S.dof.bottom, i, candles);
//                             activeDof_D2S = { type: "D-OF", displayName: "D-D2S(OF)", trend: "BEARISH", priceTop: poiZones_D2S.dof.top, priceBottom: poiZones_D2S.dof.bottom, startTime: poiZones_D2S.dof.startTime, endTime: mitTimeDof, isActive: true };
//                             signals.push(activeDof_D2S);
//                         }
//                         if (poiZones_D2S.dob) {
//                             let mitTimeDob = findMitigationTime_Bearish(poiZones_D2S.dob.bottom, i, candles);
//                             activeDob_D2S = { type: "D-OB", displayName: "D-D2S(OB)", trend: "BEARISH", priceTop: poiZones_D2S.dob.top, priceBottom: poiZones_D2S.dob.bottom, startTime: poiZones_D2S.dob.startTime, fvgTop: poiZones_D2S.dob.fvgTop, fvgBottom: poiZones_D2S.dob.fvgBottom, endTime: mitTimeDob, isActive: true };
//                             signals.push(activeDob_D2S);
//                         }

//                         // --- 🔥 PHASE 3: EXTREME ZONES (D2S) ---
//                         if (poiZones_D2S.eof) {
//                             let mitTimeEof = findMitigationTime_Bearish(poiZones_D2S.eof.bottom, i, candles);
//                             activeEof_D2S = { type: "E-OF", displayName: "E-D2S(OF)", trend: "BEARISH", priceTop: poiZones_D2S.eof.top, priceBottom: poiZones_D2S.eof.bottom, startTime: poiZones_D2S.eof.startTime, endTime: mitTimeEof, isActive: true };
//                             signals.push(activeEof_D2S);
//                         }
//                         if (poiZones_D2S.eob) {
//                             let mitTimeEob = findMitigationTime_Bearish(poiZones_D2S.eob.bottom, i, candles);
//                             activeEob_D2S = { type: "E-OB", displayName: "E-D2S(OB)", trend: "BEARISH", priceTop: poiZones_D2S.eob.top, priceBottom: poiZones_D2S.eob.bottom, startTime: poiZones_D2S.eob.startTime, fvgTop: poiZones_D2S.eob.fvgTop, fvgBottom: poiZones_D2S.eob.fvgBottom, endTime: mitTimeEob, isActive: true };
//                             signals.push(activeEob_D2S);
//                         }
//                     }
                    
//                     refLL_D2S = null; tempLH_D2S = null; confirmedLH_D2S = null;
//                 }
//             }
//             // =========================================================================
//             // 🔥 PHASE 1: COUNTER STRUCTURE ENDS HERE 🔥
//             // =========================================================================


//             // 🎯 6. PHASE 2 & 3: BOS(C) LOGIC FOR D2S (Counter Bearish)
//             if (idm_D2S_Taken && validLL_D2S !== null) {
//                 // Peak (High) ट्रैक करो
//                 if (curr.high > tempSwingHigh_D2S.price) {
//                     tempSwingHigh_D2S = { price: curr.high, time: curr.timestamp };
//                 }
                
//                 let breakLevel_D2S = refX_D2S ? refX_D2S.price : validLL_D2S.price;
                
//                 if (curr.low < breakLevel_D2S) {
//                     if (curr.close < breakLevel_D2S) { // 🚀 Full Body Break (BOS-C)
                        
//                         // 🔥 चेक करो कि क्या ब्रेक करने से पहले किसी ज़ोन को टैप किया था?
//                         // Bearish Counter Trend है, तो प्राइस ऊपर जाकर Supply Zone के 'Bottom' को टैप करेगा!
//                         let isTapped = false;
//                         if ((activeDob_D2S && tempSwingHigh_D2S.price >= activeDob_D2S.priceBottom) || 
//                             (activeDof_D2S && tempSwingHigh_D2S.price >= activeDof_D2S.priceBottom) ||
//                             (activeEob_D2S && tempSwingHigh_D2S.price >= activeEob_D2S.priceBottom) ||
//                             (activeEof_D2S && tempSwingHigh_D2S.price >= activeEof_D2S.priceBottom)) {
//                             isTapped = true;
//                         }
                        
//                         if (isTapped) {
//                             signals.push({ type: "BOS(C)", trend: "BEARISH", price: validLL_D2S.price, startTime: validLL_D2S.time, endTime: curr.timestamp });
//                             if (refX_D2S) {
//                                 signals.push({ type: "X(C)", sweptSide: "LOW", trend: "BEARISH", price: validLL_D2S.price, startTime: validLL_D2S.time, endTime: refX_D2S.time });
//                             }
//                         } else {
//                             // 🧹 बिना टैप किये ब्रेक किया: चार्ट से पुराने सारे D2S ज़ोन मिटा दो!
//                             signals = signals.filter(s => 
//                                 s !== activeDob_D2S && s !== activeDof_D2S && 
//                                 s !== activeEob_D2S && s !== activeEof_D2S
//                             );
//                             signals.push({ type: "BOS(C)", trend: "BEARISH", price: validLL_D2S.price, startTime: validLL_D2S.time, endTime: curr.timestamp });
//                         }
                        
//                         // 🔥 D2S का ट्रेंड चालू रहेगा! अगले पुलबैक के लिए रीसेट करो
//                         idm_D2S_Taken = false;
//                         refLL_D2S = { price: curr.low, time: curr.timestamp };
//                         validLL_D2S = null; tempSwingHigh_D2S = null; 
//                         activeDob_D2S = null; activeDof_D2S = null; 
//                         activeEob_D2S = null; activeEof_D2S = null; 
//                         refX_D2S = null;
                        
//                     } else { 
//                         // 🧹 Sweep हुआ (X-C)
//                         refX_D2S = { price: curr.low, time: curr.timestamp };
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
//     // 🔥 THE FIX: IDM वाली कैंडल (startIndex) के ठीक बाद वाली कैंडल (+1) से स्कैन शुरू करेंगे
//     for (let j = startIndex + 1; j < candles.length; j++) { 
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

//             // 🔥 THE FIX: अगर यह हमारा फेक 'ROOT' पुलबैक है, तो इसका विशालकाय E-OF ड्रा मत करो!
//             if (pb.id !== "ROOT_SWING_HL") {
//                 smcZones.eof = { type: "E-OF", top: pb.confirmHH, bottom: pb.validHL, startTime: pb.startTime, isMitigated: mitigatedOF, data: pb };
//             }

//             smcZones.eob = {
//                 type: "E-OB", top: obResult.price.high, bottom: obResult.price.low,
//                 startTime: obResult.startTime, fvgTop: obResult.fvgZone.top, fvgBottom: obResult.fvgZone.bottom
//             };
//             break;
//         }
//     }

//     // ==============================================================
//     // 🔥 2. DECISIONAL ZONES (D-OF / D-OB)
//     // ==============================================================
//     for (let i = pullbacksArray.length - 1; i >= 0; i--) {
//         const pb = pullbacksArray[i];
//         if (smcZones.eof && smcZones.eof.data.id === pb.id) break;

//         const obResult = findValidOrderBlock(pb, candles, currentIndex);

//         if (obResult.found) {
//             if (smcZones.eob && smcZones.eob.startTime === obResult.startTime) continue;

//             const mitigatedOF = isOfMitigated(pb, candles, currentIndex);

//             // 🔥 THE FIX: अगर यह फेक 'ROOT' पुलबैक है, तो इसका विशालकाय D-OF ड्रा मत करो!
//             if (pb.id !== "ROOT_SWING_HL") {
//                 smcZones.dof = { type: "D-OF", top: pb.confirmHH, bottom: pb.validHL, startTime: pb.startTime, isMitigated: mitigatedOF, data: pb };
//             }

//             smcZones.dob = {
//                 type: "D-OB", top: obResult.price.high, bottom: obResult.price.low,
//                 startTime: obResult.startTime, fvgTop: obResult.fvgZone.top, fvgBottom: obResult.fvgZone.bottom, data: pb
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
//     for (let i = 0; i < pullbacksArray.length; i++) {
//         const pb = pullbacksArray[i];
//         const obResult = findBearishValidOrderBlock(pb, candles, currentIndex);

//         if (obResult.found) {
//             const mitigatedOF = isOfMitigated_Bearish(pb, candles, currentIndex);

//             // 🔥 THE FIX: 'ROOT_SWING_LH' के लिए OF ड्रा नहीं होगा
//             if (pb.id !== "ROOT_SWING_LH") {
//                 smcZones.eof = { type: "E-OF", top: pb.validLH, bottom: pb.confirmLL, startTime: pb.startTime, isMitigated: mitigatedOF, data: pb };
//             }

//             smcZones.eob = {
//                 type: "E-OB", top: obResult.price.top, bottom: obResult.price.bottom,
//                 startTime: obResult.startTime, fvgTop: obResult.fvgZone.top, fvgBottom: obResult.fvgZone.bottom
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
//             if (smcZones.eob && smcZones.eob.startTime === obResult.startTime) continue;

//             const mitigatedOF = isOfMitigated_Bearish(pb, candles, currentIndex);

//             // 🔥 THE FIX: 'ROOT_SWING_LH' के लिए OF ड्रा नहीं होगा
//             if (pb.id !== "ROOT_SWING_LH") {
//                 smcZones.dof = { type: "D-OF", top: pb.validLH, bottom: pb.confirmLL, startTime: pb.startTime, isMitigated: mitigatedOF, data: pb };
//             }

//             smcZones.dob = {
//                 type: "D-OB", top: obResult.price.top, bottom: obResult.price.bottom,
//                 startTime: obResult.startTime, fvgTop: obResult.fvgZone.top, fvgBottom: obResult.fvgZone.bottom, data: pb
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
// // 🎯 UPDATE 2: checkPriceActionSignal का पैरामीटर
// const checkPriceActionSignal = (htfCandles, ltfCandles, setupType, startingTrend = "AUTO", counterStructureDepth = 0) => {
//     let signal = { long: false, short: false, reason: "" };

//     if (!htfCandles || htfCandles.length < 15 || !ltfCandles || ltfCandles.length === 0) {
//         return signal;
//     }

//     // यहाँ counterStructureDepth पास कर रहे हैं
//     const htfSignals = identifyMechanicalStructure(htfCandles, startingTrend, counterStructureDepth);
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








// // =========================================================================
// // 🧠 SMART RETRO-SCANNER (Visual Zig-Zag Logic by Chanchal Bhai)
// // =========================================================================
// const scanRetroactivePullbacks = (startIndex, endIndex, candles, trendType) => {
//     let validPullbacks = [];
//     let inPullback = false;
//     let tempExtreme = null;
//     let targetBreakLevel = null;

//     if (trendType === "BEARISH") {
//         for (let j = startIndex + 1; j <= endIndex; j++) {
//             let curr = candles[j];
//             let prev = candles[j - 1];
//             let isOutsideBar = curr.high > prev.high && curr.low < prev.low;
//             let brokeHigh = curr.high > prev.high;

//             if (!inPullback && brokeHigh && !isOutsideBar) {
//                 inPullback = true;
//                 targetBreakLevel = prev.low;
//                 tempExtreme = { price: curr.high, time: curr.timestamp };
//             }
//             else if (inPullback) {
//                 if (curr.high > tempExtreme.price) {
//                     tempExtreme = { price: curr.high, time: curr.timestamp };
//                 }
//                 if (curr.low < targetBreakLevel) {
//                     validPullbacks.push({
//                         price: tempExtreme.price,
//                         time: tempExtreme.time,
//                         confirmLL: targetBreakLevel // 🎯 E-OF के बॉटम के लिए
//                     });
//                     inPullback = false;
//                 }
//             }
//         }
//     }
//     else if (trendType === "BULLISH") {
//         for (let j = startIndex + 1; j <= endIndex; j++) {
//             let curr = candles[j];
//             let prev = candles[j - 1];
//             let isOutsideBar = curr.high > prev.high && curr.low < prev.low;
//             let brokeLow = curr.low < prev.low;

//             if (!inPullback && brokeLow && !isOutsideBar) {
//                 inPullback = true;
//                 targetBreakLevel = prev.high;
//                 tempExtreme = { price: curr.low, time: curr.timestamp };
//             }
//             else if (inPullback) {
//                 if (curr.low < tempExtreme.price) {
//                     tempExtreme = { price: curr.low, time: curr.timestamp };
//                 }
//                 if (curr.high > targetBreakLevel) {
//                     validPullbacks.push({
//                         price: tempExtreme.price,
//                         time: tempExtreme.time,
//                         confirmHH: targetBreakLevel // 🎯 E-OF के टॉप के लिए
//                     });
//                     inPullback = false;
//                 }
//             }
//         }
//     }
//     return validPullbacks; // 🔥 पूरा लिस्ट रिटर्न करेगा
// };


// const identifyMechanicalStructure = (candles, startingTrend = "AUTO", counterStructureDepth = 0, structureMode = "MECHANICAL") => {

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

//     // 🔥 NEW: History Tracker for Counter Structures
//     let historicalCounterWaves = [];

//     // ==========================================
//     // 📉 BEARISH STATE VARIABLES
//     // ==========================================
//     let refLL = null;
//     let tempLH = null;
//     let confirmedLH = null;
//     let validLL = null;
//     let tempSwingHigh = null;
//     let lockedSwingHigh = null;
//     let prevLockedSwingHigh = null; // 🔥 THE GRANDFATHER NODE (बियरिश के लिए)
//     let absoluteLowest = { price: candles[0].low, time: candles[0].timestamp };

//     let bearishPullbacks = [];
//     let tempPullbackTracker_Bearish = null;

//     // 🔥 Liquidity Sweep (X) Variables
//     let refX_BOS_Bearish = null;
//     let majorIdm_Bearish = { price: -Infinity, time: null };
//     let refX_CHoCH_Bearish = null;


//     // 🔥 COUNTER STRUCTURE (D2S) VARIABLES FOR BULLISH TREND
//     let isDobTapped_D2S = false;
//     let tappingCandle_D2S = null;
//     let isDobFailed_D2S = false;
//     let refLL_D2S = null;
//     let tempLH_D2S = null;
//     let confirmedLH_D2S = null;
//     let idm_D2S_Taken = false;


//     // Phase 2 ke variables (Advance preparation)
//     let swingLH_D2S = null;
//     let pullbacks_D2S = [];

//     // 🔥 NEW: COUNTER STRUCTURE (S2D) PHASE 2 & 3 VARIABLES
//     let validHH_S2D = null;
//     let tempSwingLow_S2D = null;
//     let activeDob_S2D = null;
//     let activeDof_S2D = null;
//     let activeEob_S2D = null;  // 🎯 PHASE 3 
//     let activeEof_S2D = null;  // 🎯 PHASE 3 
//     let refX_S2D = null;


//     // 🔥 NEW: COUNTER STRUCTURE (D2S) PHASE 2 & 3 VARIABLES
//     let validLL_D2S = null;
//     let tempSwingHigh_D2S = null;
//     let activeDob_D2S = null;
//     let activeDof_D2S = null;
//     let activeEob_D2S = null;
//     let activeEof_D2S = null;
//     let refX_D2S = null;

//     // ==========================================
//     // 🧹 THE SMART HISTORY MANAGER & MAGIC ERASER
//     // ==========================================
//     const isCounterSig = (sig) => 
//         sig.type === "IDM(D2S)" || sig.type === "IDM(S2D)" || 
//         sig.type === "BOS(C)" || sig.type === "X(C)" ||
//         (sig.displayName && (sig.displayName.includes("S2D") || sig.displayName.includes("D2S")));

//     const wipeCounterStructure = () => {
//         // 1. D2S मेमोरी क्लीन
//         isDobTapped_D2S = false; tappingCandle_D2S = null; isDobFailed_D2S = false;
//         refLL_D2S = null; tempLH_D2S = null; confirmedLH_D2S = null; idm_D2S_Taken = false;
//         swingLH_D2S = null; pullbacks_D2S = [];
//         validLL_D2S = null; tempSwingHigh_D2S = null;
//         activeDob_D2S = null; activeDof_D2S = null;
//         activeEob_D2S = null; activeEof_D2S = null;
//         refX_D2S = null;

//         // 2. S2D मेमोरी क्लीन
//         isDobTapped_S2D = false; tappingCandle_S2D = null; isDobFailed_S2D = false;
//         refHH_S2D = null; tempHL_S2D = null; confirmedHL_S2D = null; idm_S2D_Taken = false;
//         validHH_S2D = null; tempSwingLow_S2D = null; 
//         activeDob_S2D = null; activeDof_S2D = null; 
//         activeEob_S2D = null; activeEof_S2D = null; 
//         refX_S2D = null;

//         // 🔥 3. SMART HISTORY LOGIC
//         // सिर्फ वो काउंटर सिग्नल्स निकालो जो अभी 'करंट' हैं (यानी पहले से हिस्ट्री में नहीं गए हैं)
//         let currentCounterSignals = signals.filter(sig => isCounterSig(sig) && !sig.isHistorical);

//         if (currentCounterSignals.length > 0) {
//             // इन सिग्नल्स को 'Historical' मार्क कर दें ताकि फ्रंटएंड इन्हें हल्का (dim) कर सके
//             currentCounterSignals.forEach(sig => sig.isHistorical = true);
//             historicalCounterWaves.push(currentCounterSignals);
//         }

//         // FIFO: पुरानी लहरों (Waves) को यूज़र की लिमिट (Depth) के हिसाब से हटाएं
//         while (historicalCounterWaves.length > counterStructureDepth) {
//             historicalCounterWaves.shift(); // सबसे पुराना काउंटर स्ट्रक्चर डिलीट!
//         }

//         // 4. Signals Array को फिर से बनाएं (Main Signals + Allowed History)
//         let mainSignals = signals.filter(sig => !isCounterSig(sig));
//         let validHistorySignals = [];
//         historicalCounterWaves.forEach(wave => validHistorySignals.push(...wave));

//         signals = [...mainSignals, ...validHistorySignals];
//     };

//     // 🔥 NEW: COUNTER STRUCTURE (S2D) VARIABLES FOR BEARISH TREND
//     let isDobTapped_S2D = false;
//     let tappingCandle_S2D = null;
//     let isDobFailed_S2D = false;
//     let refHH_S2D = null;
//     let tempHL_S2D = null;
//     let confirmedHL_S2D = null;
//     let idm_S2D_Taken = false;




//     // ==========================================
//     // 📈 BULLISH STATE VARIABLES
//     // ==========================================
//     let refHH = null;
//     let tempHL = null;
//     let confirmedHL = null;
//     let validHH = null;

//     let tempSwingLow = null;
//     let lockedSwingLow = null;
//     let prevLockedSwingLow = null; // 🔥 THE GRANDFATHER NODE (बुलिश के लिए)
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
//                 wipeCounterStructure();
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
//                     if (curr.close > breakLevel) { // 🚀 Full Body Break (Valid Breakout)
                        
//                         // =======================================================
//                         // 🧠 TECHNICAL STRUCTURE: FAKE CHoCH TRAP (TRANSFER OF IDM)
//                         // =======================================================
//                         if (structureMode === "TECHNICAL" && !isIdmTaken) {
//                             // ❌ फेक CHoCH! इस वेव ने नीचे कोई IDM नहीं लिया था। 
//                             // यह ब्रेकआउट ही असली IDM (Transfer) है!
//                             isIdmTaken = true;
                            
//                             // 🔥 THE ERASER FIX: पुराना फेक BOS चार्ट से मिटा दो!
//                             for (let s = signals.length - 1; s >= 0; s--) {
//                                 if (signals[s].type === "BOS" && signals[s].trend === "BEARISH") {
//                                     signals.splice(s, 1); // सबसे ताज़ा (गलत) BOS को डिलीट कर दो
//                                     break;
//                                 }
//                             }
                            
//                             signals.push({ 
//                                 type: "IDM(T)", // (T) = Technical Transfer
//                                 trend: "BEARISH", 
//                                 price: lockedSwingHigh.price, 
//                                 startTime: lockedSwingHigh.time, 
//                                 endTime: curr.timestamp 
//                             });

//                             // 1. Valid LL को सबसे निचले पॉइंट (Absolute Lowest) पर फिक्स करो
//                             validLL = { ...absoluteLowest };
                            
//                             // 2. Temp Swing High सेट करो
//                             tempSwingHigh = { price: curr.high, time: curr.timestamp };
//                             majorIdm_Bearish = { price: curr.high, time: curr.timestamp };

//                             // 3. 👑 दादाजी की वापसी! (Restore Grandfather)
//                             lockedSwingHigh = prevLockedSwingHigh ? { ...prevLockedSwingHigh } : null;

//                             // 4. क्लीनअप
//                             refX_CHoCH_Bearish = null; 
                            
//                             continue; // CHoCH नहीं हुआ है, इसलिए यहीं से आगे बढ़ो!
//                         }
//                         // =======================================================
//                         signals.push({
//                             type: "CHoCH", trend: "BULLISH",
//                             sweptSide: "HIGH",
//                             price: lockedSwingHigh.price,
//                             startTime: lockedSwingHigh.time,
//                             endTime: curr.timestamp
//                         });

//                         trend = 1;
//                         isIdmTaken = false;
//                         wipeCounterStructure();
//                         lockedSwingLow = { ...absoluteLowest };

//                         validLL = null; refLL = null; tempSwingHigh = null; lockedSwingHigh = null;
//                         refX_CHoCH_Bearish = null; refX_BOS_Bearish = null;
//                         bearishPullbacks = []; tempPullbackTracker_Bearish = null;

//                         refHH = null; tempHL = null; bullishPullbacks = []; tempPullbackTracker = null;

//                         // 🔥 RETRO-SCANNER INJECTION: CHoCH के पहले वाले Bullish पुलबैक्स ढूँढो
//                         let startIdx = candles.findIndex(c => c.timestamp === lockedSwingLow.time);
//                         let retroPBs = scanRetroactivePullbacks(startIdx, i, candles, "BULLISH");
//                         confirmedHL = retroPBs.length > 0 ? retroPBs[retroPBs.length - 1] : null;

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
//                             // 🔥 THE McM(X) SWEEP CHECK FOR BEARISH: क्या कैंडल ने Ref LL के ऊपर क्लोज़ किया? (Wick Sweep)
//                             tempPullbackTracker_Bearish.isSwept = (curr.close > tempPullbackTracker_Bearish.confirmLL);

//                             tempPullbackTracker_Bearish.breakCandleIndex = i;
//                             bearishPullbacks.push({ ...tempPullbackTracker_Bearish });
//                             tempPullbackTracker_Bearish = null;
//                         }
//                     }
//                 }
//             }

//             // 🎯 THE FINAL IDM CONFIRMATION & SUPPLY ZONE TRANSFORMATION
//             // 🎯 THE FINAL IDM CONFIRMATION & SUPPLY ZONE TRANSFORMATION
//             if (confirmedLH !== null && curr.high >= confirmedLH.price && !isIdmTaken) {
//                 isIdmTaken = true;
//                 validLL = { ...absoluteLowest };
//                 tempSwingHigh = { price: curr.high, time: curr.timestamp };
//                 majorIdm_Bearish = { price: curr.high, time: curr.timestamp };

//                 // ==========================================================
//                 // 🔥 THE McM(X) & IDM-OF LOGIC FOR BEARISH (THE TRUE SWEEP FIX)
//                 // ==========================================================
//                 let idmLabel = "IDM";
//                 const targetPb = bearishPullbacks.find(pb => pb.validLH === confirmedLH.price);

//                 if (targetPb) {
//                     // 🛡️ THE REAL SWEEP VERIFIER FOR BEARISH
//                     // चेक करो कि ब्रेक होने वाली कैंडल से लेकर अभी (IDM लेने वाली कैंडल) तक,
//                     // क्या किसी भी कैंडल ने Ref LL (confirmLL) के नीचे फुल 'Close' किया है?
//                     let trueSweep = true;
//                     for (let k = targetPb.breakCandleIndex; k <= i; k++) {
//                         if (candles[k].close < targetPb.confirmLL) {
//                             trueSweep = false; // ❌ Full body break मिल गया, यह स्वीप नहीं है!
//                             break;
//                         }
//                     }

//                     if (trueSweep) {
//                         idmLabel = "IDM/ch"; 

//                         // 1. McM(X) लाइन ड्रा करें (बॉटम पर)
//                         signals.push({ 
//                             type: "McM(X)", 
//                             trend: "BEARISH", 
//                             sweptSide: "LOW", 
//                             price: targetPb.confirmLL, // Ref LL का प्राइस
//                             startTime: targetPb.startTime, 
//                             endTime: validLL.time  
//                         });

//                         // 2. IDM-OF (Order Flow) Box ड्रा करें
//                         // Bearish में यह Demand ज़ोन की तरह काम करेगा, इसलिए बुलिश मिटिगेशन (ऊपर से नीचे टैप) यूज़ करेंगे
//                         let mitTimeIdmOf = findMitigationTime(confirmedLH.price, i, candles);

//                         signals.push({ 
//                             type: "IDM-OF", 
//                             displayName: "IDM OF", 
//                             trend: "BEARISH", 
//                             priceTop: confirmedLH.price, 
//                             priceBottom: validLL.price, 
//                             startTime: validLL.time, 
//                             endTime: mitTimeIdmOf, 
//                             isActive: true 
//                         });
//                     }
//                 }

//                 // IDM या IDM/ch की लाइन ड्रा करें
//                 signals.push({ type: idmLabel, trend: "BEARISH", price: confirmedLH.price, startTime: confirmedLH.time, endTime: curr.timestamp });

//                 // 🔥 1. THE ROOT EXTREME FIX
//                 const rootTime = lockedSwingHigh ? lockedSwingHigh.time : absoluteHighest.time;
//                 const rootPrice = lockedSwingHigh ? lockedSwingHigh.price : absoluteHighest.price;

//                 const swingLHIndex = candles.findIndex(c => c.timestamp === rootTime);
//                 const refLLIndex = candles.findIndex(c => c.timestamp === validLL.time);

//                 // 🎯 THE E-OF SIZE FIX: स्कैनर से पहला पुलबैक निकालो
//                 let rootConfirmLL = validLL.price;
//                 let wavePullbacks = scanRetroactivePullbacks(swingLHIndex, refLLIndex, candles, "BEARISH");
//                 if (wavePullbacks.length > 0) {
//                     rootConfirmLL = wavePullbacks[0].confirmLL; // पहला पुलबैक का Low
//                 }

//                 const rootExtreme = {
//                     id: "ROOT_SWING_LH",
//                     validLH: rootPrice,
//                     validLHCandleIndex: swingLHIndex,
//                     confirmLL: rootConfirmLL, // <--- परफेक्ट साइज़
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

//                         prevLockedSwingHigh = { ...lockedSwingHigh }; // 🔥 दादाजी को सेव करो!
//                         lockedSwingHigh = { ...tempSwingHigh };
                        
//                         isIdmTaken = false;
//                         wipeCounterStructure();
//                         validLL = null; refLL = null; refX_BOS_Bearish = null;

//                         // 🔥 RETRO-SCANNER INJECTION: BOS के पहले वाले पुलबैक्स ढूँढो
//                         let startIdx = candles.findIndex(c => c.timestamp === lockedSwingHigh.time);
//                         let retroPBs = scanRetroactivePullbacks(startIdx, i, candles, "BEARISH");
//                         confirmedLH = retroPBs.length > 0 ? retroPBs[retroPBs.length - 1] : null;
                        
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
//             // =========================================================================
//             // 🔥 PHASE 1: COUNTER STRUCTURE (S2D) LOGIC STARTS HERE 🔥
//             // =========================================================================

//             // 🛑 THE CHoCH/BOS AUTO-CLEANER (Chanchal Bhai's Rule)
//             let currentWaveStart_S2D = lockedSwingHigh ? lockedSwingHigh.time : absoluteHighest.time;

//             if ( (confirmedHL_S2D && confirmedHL_S2D.time < currentWaveStart_S2D) || 
//                  (refHH_S2D && refHH_S2D.time < currentWaveStart_S2D) ) {
//                 isDobTapped_S2D = false; tappingCandle_S2D = null; isDobFailed_S2D = false;
//                 refHH_S2D = null; tempHL_S2D = null; confirmedHL_S2D = null; idm_S2D_Taken = false;
//             }
            
//             // 🎯 1. Active D-OB (Supply Zone) को ढूँढना
//             let activeDobZone_Bearish = null;
//             if (isIdmTaken) {
//                 for (let s = signals.length - 1; s >= 0; s--) {
//                     if (signals[s].type === "D-OB" && signals[s].trend === "BEARISH" && signals[s].isActive !== false) {
//                         if (signals[s].startTime >= currentWaveStart_S2D) { 
//                             activeDobZone_Bearish = signals[s];
//                             break;
//                         }
//                     }
//                 }
//             }

//             if (activeDobZone_Bearish) {
//                 // 🎯 2. TAPPING CHECK 
//                 if (!isDobTapped_S2D && curr.high >= activeDobZone_Bearish.priceBottom) {
//                     isDobTapped_S2D = true;
//                     tappingCandle_S2D = curr;
//                 }

//                 // 🎯 3. D-OB FAILURE CHECK 
//                 if (isDobTapped_S2D && !isDobFailed_S2D) {
//                     let isOutsideBar_S2D = curr.high > tappingCandle_S2D.high && curr.low < tappingCandle_S2D.low;
//                     if (!isOutsideBar_S2D) {
//                         if (curr.high > tappingCandle_S2D.high || tappingCandle_S2D.close > activeDobZone_Bearish.priceTop) {
//                             isDobFailed_S2D = true;
//                             refHH_S2D = { price: curr.high, time: curr.timestamp };
//                         }
//                     }
//                 }
//             }

//             // 🎯 4. IDM(S2D) PULLBACK TRACKING 
//             if (isDobFailed_S2D && !idm_S2D_Taken) {
//                 let brokeLow = curr.low < refCandle.low; 

//                 if (brokeLow && !isOutsideBar && refHH_S2D !== null && tempHL_S2D === null) {
//                     tempHL_S2D = { price: curr.low, time: curr.timestamp };
//                 } 
//                 else if (refHH_S2D !== null) {
//                     if (tempHL_S2D !== null && curr.low < tempHL_S2D.price) {
//                         tempHL_S2D = { price: curr.low, time: curr.timestamp };
//                     }
//                     if (tempHL_S2D === null && curr.high > refHH_S2D.price) {
//                         refHH_S2D = { price: curr.high, time: curr.timestamp };
//                     }
//                     if (tempHL_S2D !== null && curr.high >= refHH_S2D.price) {
//                         if (curr.timestamp === tempHL_S2D.time) {
//                             refHH_S2D = null; 
//                             tempHL_S2D = null; 
//                         } else {
//                             confirmedHL_S2D = tempHL_S2D;
//                             refHH_S2D = { price: curr.high, time: curr.timestamp }; 
//                             tempHL_S2D = null; 
//                         }
//                     }
//                 }

//                 // 🎯 5. IDM(S2D) HIT & ZONE GENERATION!
//                 if (confirmedHL_S2D !== null && curr.low <= confirmedHL_S2D.price) {
                    
//                     let isGhost = false;
//                     for(let k = signals.length - 1; k >= 0; k--) {
//                         let sig = signals[k];
//                         if(sig.type === "CHoCH" || sig.type === "BOS") {
//                             if(sig.endTime > confirmedHL_S2D.time) { isGhost = true; break; }
//                         }
//                     }

//                     if (!isGhost) {
//                         idm_S2D_Taken = true;
//                         // 🔥 Phase 2 की शुरुआत: Top और Bottom लॉक करो!
//                         validHH_S2D = { price: refHH_S2D.price, time: refHH_S2D.time };
//                         tempSwingLow_S2D = { price: curr.low, time: curr.timestamp };

//                         signals.push({ 
//                             type: "IDM(S2D)", trend: "BULLISH_COUNTER", 
//                             price: confirmedHL_S2D.price, startTime: confirmedHL_S2D.time, 
//                             endTime: curr.timestamp, sweptSide: "LOW", position: "bottom"    
//                         });

//                         // =======================================================
//                         // 🔥 THE BUG FIX: S2D का सही Bottom (Start Index) ढूँढना!
//                         // =======================================================
//                         let tempStartIdx = candles.findIndex(c => c.timestamp === currentWaveStart_S2D);
//                         let endIdx_S2D = candles.findIndex(c => c.timestamp === validHH_S2D.time);
                        
//                         let startIdx_S2D = tempStartIdx;
//                         if (tempStartIdx !== -1 && endIdx_S2D !== -1) {
//                             let minLow = candles[tempStartIdx].low;
//                             for (let k = tempStartIdx; k <= endIdx_S2D; k++) {
//                                 if (candles[k].low < minLow) {
//                                     minLow = candles[k].low;
//                                     startIdx_S2D = k;
//                                 }
//                             }
//                         }
                        
//                         let s2dPullbacks = scanRetroactivePullbacks(startIdx_S2D, endIdx_S2D, candles, "BULLISH");

//                         // 🔥 ROOT EXTREME FIX FOR S2D (ताकि D-OB सही से मिले)
//                         if (startIdx_S2D !== -1 && endIdx_S2D !== -1) {
//                             let rootConfirmHH = s2dPullbacks.length > 0 ? s2dPullbacks[0].confirmHH : validHH_S2D.price;
//                             s2dPullbacks.unshift({
//                                 id: "ROOT_SWING_HL",
//                                 validHL: candles[startIdx_S2D].low,
//                                 validHLCandleIndex: startIdx_S2D,
//                                 confirmHH: rootConfirmHH,
//                                 confirmHHCandleIndex: endIdx_S2D,
//                                 breakCandleIndex: endIdx_S2D, 
//                                 startTime: candles[startIdx_S2D].timestamp
//                             });
//                         }

//                         let poiZones_S2D = findSMCZones(candles, s2dPullbacks, i);
//                         // =======================================================
                        
//                         if (poiZones_S2D.dof) {
//                             let mitTimeDof = findMitigationTime(poiZones_S2D.dof.top, i, candles);
//                             activeDof_S2D = { type: "D-OF", displayName: "D-S2D(OF)", trend: "BULLISH", priceTop: poiZones_S2D.dof.top, priceBottom: poiZones_S2D.dof.bottom, startTime: poiZones_S2D.dof.startTime, endTime: mitTimeDof, isActive: true };
//                             signals.push(activeDof_S2D);
//                         }
//                         if (poiZones_S2D.dob) {
//                             let mitTimeDob = findMitigationTime(poiZones_S2D.dob.top, i, candles);
//                             activeDob_S2D = { type: "D-OB", displayName: "D-S2D(OB)", trend: "BULLISH", priceTop: poiZones_S2D.dob.top, priceBottom: poiZones_S2D.dob.bottom, startTime: poiZones_S2D.dob.startTime, fvgTop: poiZones_S2D.dob.fvgTop, fvgBottom: poiZones_S2D.dob.fvgBottom, endTime: mitTimeDob, isActive: true };
//                             signals.push(activeDob_S2D);
//                         }
                        
//                         // --- 🔥 PHASE 3: EXTREME ZONES (S2D) ---
//                         if (poiZones_S2D.eof) {
//                             let mitTimeEof = findMitigationTime(poiZones_S2D.eof.top, i, candles);
//                             activeEof_S2D = { 
//                                 type: "E-OF", 
//                                 displayName: "E-S2D(OF)", // 🎯 यही नाम फ्रंटएंड पर छपेगा
//                                 trend: "BULLISH", 
//                                 priceTop: poiZones_S2D.eof.top, 
//                                 priceBottom: poiZones_S2D.eof.bottom, 
//                                 startTime: poiZones_S2D.eof.startTime, 
//                                 endTime: mitTimeEof, 
//                                 isActive: true 
//                             };
//                             signals.push(activeEof_S2D);
//                         }
//                         if (poiZones_S2D.eob) {
//                             let mitTimeEob = findMitigationTime(poiZones_S2D.eob.top, i, candles);
//                             activeEob_S2D = { 
//                                 type: "E-OB", 
//                                 displayName: "E-S2D(OB)", // 🎯 यही नाम फ्रंटएंड पर छपेगा
//                                 trend: "BULLISH", 
//                                 priceTop: poiZones_S2D.eob.top, 
//                                 priceBottom: poiZones_S2D.eob.bottom, 
//                                 startTime: poiZones_S2D.eob.startTime, 
//                                 fvgTop: poiZones_S2D.eob.fvgTop, 
//                                 fvgBottom: poiZones_S2D.eob.fvgBottom, 
//                                 endTime: mitTimeEob, 
//                                 isActive: true 
//                             };
//                             signals.push(activeEob_S2D);
//                         }
//                     }
                    
//                     refHH_S2D = null; tempHL_S2D = null; confirmedHL_S2D = null;
//                 }
//             }
//             // =========================================================================
//             // 🔥 PHASE 1: COUNTER STRUCTURE ENDS HERE 🔥
//             // =========================================================================
//             // 🎯 6. PHASE 2 & 3: BOS(C) LOGIC FOR S2D
//             if (idm_S2D_Taken && validHH_S2D !== null) {
//                 // Dip ट्रैक करो
//                 if (curr.low < tempSwingLow_S2D.price) {
//                     tempSwingLow_S2D = { price: curr.low, time: curr.timestamp };
//                 }
                
//                 let breakLevel_S2D = refX_S2D ? refX_S2D.price : validHH_S2D.price;
                
//                 if (curr.high > breakLevel_S2D) {
//                     if (curr.close > breakLevel_S2D) { // 🚀 Full Body Break (BOS-C)
                        
//                         // 🔥 चेक करो कि क्या ब्रेक करने से पहले किसी भी ज़ोन (Decisional या Extreme) को टैप किया था?
//                         let isTapped = false;
//                         if ((activeDob_S2D && tempSwingLow_S2D.price <= activeDob_S2D.priceTop) || 
//                             (activeDof_S2D && tempSwingLow_S2D.price <= activeDof_S2D.priceTop) ||
//                             (activeEob_S2D && tempSwingLow_S2D.price <= activeEob_S2D.priceTop) ||
//                             (activeEof_S2D && tempSwingLow_S2D.price <= activeEof_S2D.priceTop)) {
//                             isTapped = true;
//                         }
                        
//                         if (isTapped) {
//                             signals.push({ type: "BOS(C)", trend: "BULLISH", price: validHH_S2D.price, startTime: validHH_S2D.time, endTime: curr.timestamp });
//                             if (refX_S2D) {
//                                 signals.push({ type: "X(C)", sweptSide: "HIGH", trend: "BULLISH", price: validHH_S2D.price, startTime: validHH_S2D.time, endTime: refX_S2D.time });
//                             }
//                         } else {
//                             // 🧹 बिना टैप किये ब्रेक किया: चार्ट से पुराने सारे D और E ज़ोन मिटा दो!
//                             signals = signals.filter(s => 
//                                 s !== activeDob_S2D && s !== activeDof_S2D && 
//                                 s !== activeEob_S2D && s !== activeEof_S2D
//                             );
//                             signals.push({ type: "BOS(C)", trend: "BULLISH", price: validHH_S2D.price, startTime: validHH_S2D.time, endTime: curr.timestamp });
//                         }
                        
//                         // 🔥 S2D का ट्रेंड चालू रहेगा! अगले पुलबैक के लिए रीसेट करो
//                         idm_S2D_Taken = false;
//                         refHH_S2D = { price: curr.high, time: curr.timestamp };
//                         validHH_S2D = null; tempSwingLow_S2D = null; 
//                         activeDob_S2D = null; activeDof_S2D = null; 
//                         activeEob_S2D = null; activeEof_S2D = null; 
//                         refX_S2D = null;
                        
//                     } else { 
//                         // 🧹 Sweep हुआ (X-C)
//                         refX_S2D = { price: curr.high, time: curr.timestamp };
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
//                 wipeCounterStructure();
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

//                         // =======================================================
//                         // 🧠 TECHNICAL STRUCTURE: FAKE CHoCH TRAP (TRANSFER OF IDM)
//                         // =======================================================
//                         if (structureMode === "TECHNICAL" && !isIdmTaken) {
//                             // ❌ फेक CHoCH! इस वेव ने ऊपर कोई IDM नहीं लिया था। 
//                             // यह ब्रेकआउट ही असली IDM (Transfer) है!
//                             isIdmTaken = true;

//                             // 🔥 THE ERASER FIX: पुराना फेक BOS चार्ट से मिटा दो!
//                             for (let s = signals.length - 1; s >= 0; s--) {
//                                 if (signals[s].type === "BOS" && signals[s].trend === "BULLISH") {
//                                     signals.splice(s, 1); // सबसे ताज़ा (गलत) BOS को डिलीट कर दो
//                                     break;
//                                 }
//                             }

//                             signals.push({ 
//                                 type: "IDM(T)", // (T) = Technical Transfer
//                                 trend: "BULLISH", 
//                                 price: lockedSwingLow.price, 
//                                 startTime: lockedSwingLow.time, 
//                                 endTime: curr.timestamp 
//                             });

//                             // 1. Valid HH को सबसे ऊपरी पॉइंट पर फिक्स करो
//                             validHH = { ...absoluteHighest };
                            
//                             // 2. Temp Swing Low सेट करो
//                             tempSwingLow = { price: curr.low, time: curr.timestamp };
//                             majorIdm_Bullish = { price: curr.low, time: curr.timestamp };

//                             // 3. 👑 दादाजी की वापसी! (Restore Grandfather)
//                             lockedSwingLow = prevLockedSwingLow ? { ...prevLockedSwingLow } : null;

//                             // 4. क्लीनअप
//                             refX_CHoCH_Bullish = null; 
                            
//                             continue; // CHoCH नहीं हुआ है, इसलिए यहीं से आगे बढ़ो!
//                         }

//                         signals.push({
//                             type: "CHoCH", trend: "BEARISH",
//                             price: lockedSwingLow.price,
//                             startTime: lockedSwingLow.time,
//                             endTime: curr.timestamp
//                         });

//                         trend = -1;
//                         isIdmTaken = false;
//                         wipeCounterStructure();
//                         lockedSwingHigh = { ...absoluteHighest };

//                         validHH = null; refHH = null; tempSwingLow = null; lockedSwingLow = null;
//                         refX_CHoCH_Bullish = null; refX_BOS_Bullish = null;
//                         bullishPullbacks = []; tempPullbackTracker = null;

//                         refLL = null; tempLH = null; bearishPullbacks = []; tempPullbackTracker_Bearish = null;

//                         // 🔥 RETRO-SCANNER INJECTION: CHoCH के पहले वाले Bearish पुलबैक्स ढूँढो
//                         let startIdx = candles.findIndex(c => c.timestamp === lockedSwingHigh.time);
//                         let retroPBs = scanRetroactivePullbacks(startIdx, i, candles, "BEARISH");
//                         confirmedLH = retroPBs.length > 0 ? retroPBs[retroPBs.length - 1] : null;

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
//                     if (curr.timestamp === tempHL.time) {
//                         // ❌ Fake Engulfing Pullback (Discard)
//                         refHH = null;
//                         tempPullbackTracker = null;
//                     } else {
//                         // ✅ Valid Pullback (Confirm)
//                         confirmedHL = tempHL;
//                         refHH = null;

//                         if (tempPullbackTracker) {
//                             // 🔥 THE McM(X) SWEEP CHECK: क्या कैंडल ने Ref HH के नीचे क्लोज़ किया? (Wick Sweep)
//                             tempPullbackTracker.isSwept = (curr.close < tempPullbackTracker.confirmHH);
                            
//                             tempPullbackTracker.breakCandleIndex = i;
//                             bullishPullbacks.push({ ...tempPullbackTracker });
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

//                 // ==========================================================
//                 // 🔥 THE McM(X) & IDM-OF LOGIC
//                 // ==========================================================
//                 let idmLabel = "IDM";
//                 const targetPb = bullishPullbacks.find(pb => pb.validHL === confirmedHL.price);

//                 if (targetPb) {
//                     // 🛡️ THE REAL SWEEP VERIFIER
//                     // चेक करो कि ब्रेक होने वाली कैंडल से लेकर अभी (IDM लेने वाली कैंडल) तक,
//                     // क्या किसी भी कैंडल ने Ref HH (confirmHH) के ऊपर फुल 'Close' किया है?
//                     let trueSweep = true;
//                     for (let k = targetPb.breakCandleIndex; k <= i; k++) {
//                         if (candles[k].close > targetPb.confirmHH) {
//                             trueSweep = false; // ❌ Full body break मिल गया, यह स्वीप नहीं है!
//                             break;
//                         }
//                     }

//                     if (trueSweep) {
//                         idmLabel = "IDM/ch"; 

//                         // 1. McM(X) लाइन ड्रा करें (टॉप पर)
//                         signals.push({ 
//                             type: "McM(X)", 
//                             trend: "BULLISH", 
//                             sweptSide: "HIGH", 
//                             price: targetPb.confirmHH, // Ref HH का प्राइस
//                             startTime: targetPb.startTime, 
//                             endTime: validHH.time  
//                         });

//                         // 2. IDM-OF (Order Flow) Box ड्रा करें
//                         let mitTimeIdmOf = findMitigationTime_Bearish(confirmedHL.price, i, candles);

//                         signals.push({ 
//                             type: "IDM-OF", 
//                             displayName: "IDM OF", 
//                             trend: "BULLISH", 
//                             priceTop: validHH.price, 
//                             priceBottom: confirmedHL.price, 
//                             startTime: validHH.time, 
//                             endTime: mitTimeIdmOf, 
//                             isActive: true 
//                         });
//                     }
//                 }

//                 // IDM या IDM/ch की लाइन ड्रा करें
//                 signals.push({ type: idmLabel, trend: "BULLISH", price: confirmedHL.price, startTime: confirmedHL.time, endTime: curr.timestamp });
//                 // ==========================================================
//                 // 🔥 THE ROOT EXTREME FIX (Null Crash Fix)
//                 // ==========================================================   
//                 const rootTime = lockedSwingLow ? lockedSwingLow.time : absoluteLowest.time;
//                 const rootPrice = lockedSwingLow ? lockedSwingLow.price : absoluteLowest.price;

//                 const swingHLIndex = candles.findIndex(c => c.timestamp === rootTime);
//                 const refHHIndex = candles.findIndex(c => c.timestamp === validHH.time);

//                 // 🎯 THE E-OF SIZE FIX: स्कैनर से पहला पुलबैक निकालो
//                 let rootConfirmHH = validHH.price;
//                 let wavePullbacks = scanRetroactivePullbacks(swingHLIndex, refHHIndex, candles, "BULLISH");
//                 if (wavePullbacks.length > 0) {
//                     rootConfirmHH = wavePullbacks[0].confirmHH; // पहला पुलबैक का High
//                 }

//                 const rootExtreme = {
//                     id: "ROOT_SWING_HL",
//                     validHL: rootPrice,
//                     validHLCandleIndex: swingHLIndex,
//                     confirmHH: rootConfirmHH, // <--- परफेक्ट साइज़
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
//                             price: validHH.price,
//                             startTime: validHH.time,
//                             endTime: curr.timestamp
//                         });

//                         if (refX_CHoCH_Bullish) {
//                             signals.push({ type: "X", trend: "BULLISH", sweptSide: "LOW", price: lockedSwingLow.price, startTime: lockedSwingLow.time, endTime: refX_CHoCH_Bullish.time });
//                             refX_CHoCH_Bullish = null;
//                         }

//                         // 🔥 दादाजी को सेव करो!
//                         prevLockedSwingLow = { ...lockedSwingLow }; 
//                         lockedSwingLow = { ...tempSwingLow };
//                         isIdmTaken = false;
//                         wipeCounterStructure();
//                         validHH = null; refHH = null; refX_BOS_Bullish = null;

//                         // 🔥 RETRO-SCANNER INJECTION: BOS के पहले वाले Bullish पुलबैक्स ढूँढो
//                         let startIdx = candles.findIndex(c => c.timestamp === lockedSwingLow.time);
//                         let retroPBs = scanRetroactivePullbacks(startIdx, i, candles, "BULLISH");
//                         confirmedHL = retroPBs.length > 0 ? retroPBs[retroPBs.length - 1] : null;

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

//             // =========================================================================
//             // 🔥 PHASE 1: COUNTER STRUCTURE (D2S) LOGIC STARTS HERE 🔥
//             // =========================================================================

//            // 🛑 THE CHoCH/BOS AUTO-CLEANER (Chanchal Bhai's Rule)
//             // अगर पुराना D2S ट्रैकर (LL/LH) मेन स्ट्रक्चर (CHoCH/BOS) से पहले का है, तो उसे तुरंत क्लियर कर दो!
//             let currentWaveStart_D2S = lockedSwingLow ? lockedSwingLow.time : absoluteLowest.time;
            
//             if ( (confirmedLH_D2S && confirmedLH_D2S.time < currentWaveStart_D2S) || 
//                  (refLL_D2S && refLL_D2S.time < currentWaveStart_D2S) ) {
//                 isDobTapped_D2S = false; tappingCandle_D2S = null; isDobFailed_D2S = false;
//                 refLL_D2S = null; tempLH_D2S = null; confirmedLH_D2S = null; idm_D2S_Taken = false;
//             }

//             // 🎯 1. Active D-OB Zone को ढूँढना (Ghost Fix Applied)
//             let activeDobZone = null;
//             if (isIdmTaken) {
//                 for (let s = signals.length - 1; s >= 0; s--) {
//                     if (signals[s].type === "D-OB" && signals[s].trend === "BULLISH" && signals[s].isActive !== false) {
//                         // सिर्फ करेंट वेव का D-OB उठाओ
//                         if (signals[s].startTime >= currentWaveStart_D2S) {
//                             activeDobZone = signals[s];
//                             break;
//                         }
//                     }
//                 }
//             }

//             if (activeDobZone) {
//                 // 🎯 2. TAPPING CHECK 
//                 if (!isDobTapped_D2S && curr.low <= activeDobZone.priceTop) {
//                     isDobTapped_D2S = true;
//                     tappingCandle_D2S = curr;
//                 }

//                 // 🎯 3. D-OB FAILURE CHECK
//                 if (isDobTapped_D2S && !isDobFailed_D2S) {
//                     let isOutsideBar = curr.high > tappingCandle_D2S.high && curr.low < tappingCandle_D2S.low;
//                     if (!isOutsideBar) {
//                         if (curr.low < tappingCandle_D2S.low || tappingCandle_D2S.close < activeDobZone.priceBottom) {
//                             isDobFailed_D2S = true;
//                             refLL_D2S = { price: curr.low, time: curr.timestamp };
//                         }
//                     }
//                 }
//             }

//             // 🎯 4. IDM(D2S) PULLBACK TRACKING 
//             if (isDobFailed_D2S && !idm_D2S_Taken) {
//                 let brokeHigh = curr.high > refCandle.high; 

//                 if (brokeHigh && !isOutsideBar && refLL_D2S !== null && tempLH_D2S === null) {
//                     tempLH_D2S = { price: curr.high, time: curr.timestamp };
//                 } 
//                 else if (refLL_D2S !== null) {
//                     if (tempLH_D2S !== null && curr.high > tempLH_D2S.price) {
//                         tempLH_D2S = { price: curr.high, time: curr.timestamp };
//                     }
//                     if (tempLH_D2S === null && curr.low < refLL_D2S.price) {
//                         refLL_D2S = { price: curr.low, time: curr.timestamp };
//                     }
//                     if (tempLH_D2S !== null && curr.low <= refLL_D2S.price) {
//                         if (curr.timestamp === tempLH_D2S.time) {
//                             refLL_D2S = null; 
//                             tempLH_D2S = null; 
//                         } else {
//                             confirmedLH_D2S = tempLH_D2S;
//                             refLL_D2S = { price: curr.low, time: curr.timestamp }; 
//                             tempLH_D2S = null; 
//                         }
//                     }
//                 }

//                 // 🎯 5. IDM(D2S) HIT & ZONE GENERATION!
//                 if (confirmedLH_D2S !== null && curr.high >= confirmedLH_D2S.price) {
                    
//                     let isGhost = false;
//                     for(let k = signals.length - 1; k >= 0; k--) {
//                         let sig = signals[k];
//                         if(sig.type === "CHoCH" || sig.type === "BOS") {
//                             if(sig.endTime > confirmedLH_D2S.time) { isGhost = true; break; }
//                         }
//                     }

//                     if (!isGhost) {
//                         idm_D2S_Taken = true;
                        
//                         // 🔥 Phase 2 & 3 की शुरुआत: Top और Bottom लॉक करो!
//                         validLL_D2S = { price: refLL_D2S.price, time: refLL_D2S.time };
//                         tempSwingHigh_D2S = { price: curr.high, time: curr.timestamp }; // पीक ट्रैक करने के लिए

//                         signals.push({ 
//                             type: "IDM(D2S)", trend: "BEARISH_COUNTER", 
//                             price: confirmedLH_D2S.price, startTime: confirmedLH_D2S.time, 
//                             endTime: curr.timestamp, sweptSide: "HIGH", position: "aboveBar" 
//                         });

//                         // =======================================================
//                         // 🔥 THE BUG FIX: D2S का सही Top (Start Index) ढूँढना!
//                         // =======================================================
//                         let tempStartIdx = candles.findIndex(c => c.timestamp === currentWaveStart_D2S);
//                         let endIdx_D2S = candles.findIndex(c => c.timestamp === validLL_D2S.time);
                        
//                         let startIdx_D2S = tempStartIdx;
//                         if (tempStartIdx !== -1 && endIdx_D2S !== -1) {
//                             let maxHigh = candles[tempStartIdx].high;
//                             for (let k = tempStartIdx; k <= endIdx_D2S; k++) {
//                                 if (candles[k].high > maxHigh) {
//                                     maxHigh = candles[k].high;
//                                     startIdx_D2S = k;
//                                 }
//                             }
//                         }
                        
//                         let d2sPullbacks = scanRetroactivePullbacks(startIdx_D2S, endIdx_D2S, candles, "BEARISH");

//                         // 🔥 ROOT EXTREME FIX FOR D2S (Bearish)
//                         if (startIdx_D2S !== -1 && endIdx_D2S !== -1) {
//                             let rootConfirmLL = d2sPullbacks.length > 0 ? d2sPullbacks[0].confirmLL : validLL_D2S.price;
//                             d2sPullbacks.unshift({
//                                 id: "ROOT_SWING_LH",
//                                 validLH: candles[startIdx_D2S].high,
//                                 validLHCandleIndex: startIdx_D2S,
//                                 confirmLL: rootConfirmLL, // <--- परफेक्ट साइज़
//                                 confirmLLCandleIndex: endIdx_D2S,
//                                 breakCandleIndex: endIdx_D2S, 
//                                 startTime: candles[startIdx_D2S].timestamp
//                             });
//                         }

//                         let poiZones_D2S = findSMCZones_Bearish(candles, d2sPullbacks, i);
//                         // =======================================================
                        
//                         // --- DECISIONAL ZONES (D2S) ---
//                         if (poiZones_D2S.dof) {
//                             let mitTimeDof = findMitigationTime_Bearish(poiZones_D2S.dof.bottom, i, candles);
//                             activeDof_D2S = { type: "D-OF", displayName: "D-D2S(OF)", trend: "BEARISH", priceTop: poiZones_D2S.dof.top, priceBottom: poiZones_D2S.dof.bottom, startTime: poiZones_D2S.dof.startTime, endTime: mitTimeDof, isActive: true };
//                             signals.push(activeDof_D2S);
//                         }
//                         if (poiZones_D2S.dob) {
//                             let mitTimeDob = findMitigationTime_Bearish(poiZones_D2S.dob.bottom, i, candles);
//                             activeDob_D2S = { type: "D-OB", displayName: "D-D2S(OB)", trend: "BEARISH", priceTop: poiZones_D2S.dob.top, priceBottom: poiZones_D2S.dob.bottom, startTime: poiZones_D2S.dob.startTime, fvgTop: poiZones_D2S.dob.fvgTop, fvgBottom: poiZones_D2S.dob.fvgBottom, endTime: mitTimeDob, isActive: true };
//                             signals.push(activeDob_D2S);
//                         }

//                         // --- 🔥 PHASE 3: EXTREME ZONES (D2S) ---
//                         if (poiZones_D2S.eof) {
//                             let mitTimeEof = findMitigationTime_Bearish(poiZones_D2S.eof.bottom, i, candles);
//                             activeEof_D2S = { type: "E-OF", displayName: "E-D2S(OF)", trend: "BEARISH", priceTop: poiZones_D2S.eof.top, priceBottom: poiZones_D2S.eof.bottom, startTime: poiZones_D2S.eof.startTime, endTime: mitTimeEof, isActive: true };
//                             signals.push(activeEof_D2S);
//                         }
//                         if (poiZones_D2S.eob) {
//                             let mitTimeEob = findMitigationTime_Bearish(poiZones_D2S.eob.bottom, i, candles);
//                             activeEob_D2S = { type: "E-OB", displayName: "E-D2S(OB)", trend: "BEARISH", priceTop: poiZones_D2S.eob.top, priceBottom: poiZones_D2S.eob.bottom, startTime: poiZones_D2S.eob.startTime, fvgTop: poiZones_D2S.eob.fvgTop, fvgBottom: poiZones_D2S.eob.fvgBottom, endTime: mitTimeEob, isActive: true };
//                             signals.push(activeEob_D2S);
//                         }
//                     }
                    
//                     refLL_D2S = null; tempLH_D2S = null; confirmedLH_D2S = null;
//                 }
//             }
//             // =========================================================================
//             // 🔥 PHASE 1: COUNTER STRUCTURE ENDS HERE 🔥
//             // =========================================================================


//             // 🎯 6. PHASE 2 & 3: BOS(C) LOGIC FOR D2S (Counter Bearish)
//             if (idm_D2S_Taken && validLL_D2S !== null) {
//                 // Peak (High) ट्रैक करो
//                 if (curr.high > tempSwingHigh_D2S.price) {
//                     tempSwingHigh_D2S = { price: curr.high, time: curr.timestamp };
//                 }
                
//                 let breakLevel_D2S = refX_D2S ? refX_D2S.price : validLL_D2S.price;
                
//                 if (curr.low < breakLevel_D2S) {
//                     if (curr.close < breakLevel_D2S) { // 🚀 Full Body Break (BOS-C)
                        
//                         // 🔥 चेक करो कि क्या ब्रेक करने से पहले किसी ज़ोन को टैप किया था?
//                         // Bearish Counter Trend है, तो प्राइस ऊपर जाकर Supply Zone के 'Bottom' को टैप करेगा!
//                         let isTapped = false;
//                         if ((activeDob_D2S && tempSwingHigh_D2S.price >= activeDob_D2S.priceBottom) || 
//                             (activeDof_D2S && tempSwingHigh_D2S.price >= activeDof_D2S.priceBottom) ||
//                             (activeEob_D2S && tempSwingHigh_D2S.price >= activeEob_D2S.priceBottom) ||
//                             (activeEof_D2S && tempSwingHigh_D2S.price >= activeEof_D2S.priceBottom)) {
//                             isTapped = true;
//                         }
                        
//                         if (isTapped) {
//                             signals.push({ type: "BOS(C)", trend: "BEARISH", price: validLL_D2S.price, startTime: validLL_D2S.time, endTime: curr.timestamp });
//                             if (refX_D2S) {
//                                 signals.push({ type: "X(C)", sweptSide: "LOW", trend: "BEARISH", price: validLL_D2S.price, startTime: validLL_D2S.time, endTime: refX_D2S.time });
//                             }
//                         } else {
//                             // 🧹 बिना टैप किये ब्रेक किया: चार्ट से पुराने सारे D2S ज़ोन मिटा दो!
//                             signals = signals.filter(s => 
//                                 s !== activeDob_D2S && s !== activeDof_D2S && 
//                                 s !== activeEob_D2S && s !== activeEof_D2S
//                             );
//                             signals.push({ type: "BOS(C)", trend: "BEARISH", price: validLL_D2S.price, startTime: validLL_D2S.time, endTime: curr.timestamp });
//                         }
                        
//                         // 🔥 D2S का ट्रेंड चालू रहेगा! अगले पुलबैक के लिए रीसेट करो
//                         idm_D2S_Taken = false;
//                         refLL_D2S = { price: curr.low, time: curr.timestamp };
//                         validLL_D2S = null; tempSwingHigh_D2S = null; 
//                         activeDob_D2S = null; activeDof_D2S = null; 
//                         activeEob_D2S = null; activeEof_D2S = null; 
//                         refX_D2S = null;
                        
//                     } else { 
//                         // 🧹 Sweep हुआ (X-C)
//                         refX_D2S = { price: curr.low, time: curr.timestamp };
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
//     // 🔥 THE FIX: IDM वाली कैंडल (startIndex) के ठीक बाद वाली कैंडल (+1) से स्कैन शुरू करेंगे
//     for (let j = startIndex + 1; j < candles.length; j++) { 
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

//             // 🔥 THE FIX: अगर यह हमारा फेक 'ROOT' पुलबैक है, तो इसका विशालकाय E-OF ड्रा मत करो!
//             if (pb.id !== "ROOT_SWING_HL") {
//                 smcZones.eof = { type: "E-OF", top: pb.confirmHH, bottom: pb.validHL, startTime: pb.startTime, isMitigated: mitigatedOF, data: pb };
//             }

//             smcZones.eob = {
//                 type: "E-OB", top: obResult.price.high, bottom: obResult.price.low,
//                 startTime: obResult.startTime, fvgTop: obResult.fvgZone.top, fvgBottom: obResult.fvgZone.bottom
//             };
//             break;
//         }
//     }

//     // ==============================================================
//     // 🔥 2. DECISIONAL ZONES (D-OF / D-OB)
//     // ==============================================================
//     for (let i = pullbacksArray.length - 1; i >= 0; i--) {
//         const pb = pullbacksArray[i];
//         if (smcZones.eof && smcZones.eof.data.id === pb.id) break;

//         const obResult = findValidOrderBlock(pb, candles, currentIndex);

//         if (obResult.found) {
//             if (smcZones.eob && smcZones.eob.startTime === obResult.startTime) continue;

//             const mitigatedOF = isOfMitigated(pb, candles, currentIndex);

//             // 🔥 THE FIX: अगर यह फेक 'ROOT' पुलबैक है, तो इसका विशालकाय D-OF ड्रा मत करो!
//             if (pb.id !== "ROOT_SWING_HL") {
//                 smcZones.dof = { type: "D-OF", top: pb.confirmHH, bottom: pb.validHL, startTime: pb.startTime, isMitigated: mitigatedOF, data: pb };
//             }

//             smcZones.dob = {
//                 type: "D-OB", top: obResult.price.high, bottom: obResult.price.low,
//                 startTime: obResult.startTime, fvgTop: obResult.fvgZone.top, fvgBottom: obResult.fvgZone.bottom, data: pb
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
//     for (let i = 0; i < pullbacksArray.length; i++) {
//         const pb = pullbacksArray[i];
//         const obResult = findBearishValidOrderBlock(pb, candles, currentIndex);

//         if (obResult.found) {
//             const mitigatedOF = isOfMitigated_Bearish(pb, candles, currentIndex);

//             // 🔥 THE FIX: 'ROOT_SWING_LH' के लिए OF ड्रा नहीं होगा
//             if (pb.id !== "ROOT_SWING_LH") {
//                 smcZones.eof = { type: "E-OF", top: pb.validLH, bottom: pb.confirmLL, startTime: pb.startTime, isMitigated: mitigatedOF, data: pb };
//             }

//             smcZones.eob = {
//                 type: "E-OB", top: obResult.price.top, bottom: obResult.price.bottom,
//                 startTime: obResult.startTime, fvgTop: obResult.fvgZone.top, fvgBottom: obResult.fvgZone.bottom
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
//             if (smcZones.eob && smcZones.eob.startTime === obResult.startTime) continue;

//             const mitigatedOF = isOfMitigated_Bearish(pb, candles, currentIndex);

//             // 🔥 THE FIX: 'ROOT_SWING_LH' के लिए OF ड्रा नहीं होगा
//             if (pb.id !== "ROOT_SWING_LH") {
//                 smcZones.dof = { type: "D-OF", top: pb.validLH, bottom: pb.confirmLL, startTime: pb.startTime, isMitigated: mitigatedOF, data: pb };
//             }

//             smcZones.dob = {
//                 type: "D-OB", top: obResult.price.top, bottom: obResult.price.bottom,
//                 startTime: obResult.startTime, fvgTop: obResult.fvgZone.top, fvgBottom: obResult.fvgZone.bottom, data: pb
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
// // 🎯 UPDATE 2: checkPriceActionSignal का पैरामीटर
// const checkPriceActionSignal = (htfCandles, ltfCandles, setupType, startingTrend = "AUTO", counterStructureDepth = 0, structureMode = "MECHANICAL") => { // 🔥 NAYA PARAMETER
//     let signal = { long: false, short: false, reason: "" };

//     if (!htfCandles || htfCandles.length < 15 || !ltfCandles || ltfCandles.length === 0) {
//         return signal;
//     }

//     // यहाँ counterStructureDepth पास कर रहे हैं
//     const htfSignals = identifyMechanicalStructure(htfCandles, startingTrend, counterStructureDepth, structureMode); // 🔥 यहाँ पास कर दें
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
    let validPullbacks = [];
    let inPullback = false;
    let tempExtreme = null;
    let targetBreakLevel = null;

    if (trendType === "BEARISH") {
        for (let j = startIndex + 1; j <= endIndex; j++) {
            let curr = candles[j];
            let prev = candles[j - 1];
            let isOutsideBar = curr.high > prev.high && curr.low < prev.low;
            let brokeHigh = curr.high > prev.high;

            if (!inPullback && brokeHigh && !isOutsideBar) {
                inPullback = true;
                targetBreakLevel = prev.low;
                tempExtreme = { price: curr.high, time: curr.timestamp };
            }
            else if (inPullback) {
                if (curr.high > tempExtreme.price) {
                    tempExtreme = { price: curr.high, time: curr.timestamp };
                }
                if (curr.low < targetBreakLevel) {
                    validPullbacks.push({
                        price: tempExtreme.price,
                        time: tempExtreme.time,
                        confirmLL: targetBreakLevel // 🎯 E-OF के बॉटम के लिए
                    });
                    inPullback = false;
                }
            }
        }
    }
    else if (trendType === "BULLISH") {
        for (let j = startIndex + 1; j <= endIndex; j++) {
            let curr = candles[j];
            let prev = candles[j - 1];
            let isOutsideBar = curr.high > prev.high && curr.low < prev.low;
            let brokeLow = curr.low < prev.low;

            if (!inPullback && brokeLow && !isOutsideBar) {
                inPullback = true;
                targetBreakLevel = prev.high;
                tempExtreme = { price: curr.low, time: curr.timestamp };
            }
            else if (inPullback) {
                if (curr.low < tempExtreme.price) {
                    tempExtreme = { price: curr.low, time: curr.timestamp };
                }
                if (curr.high > targetBreakLevel) {
                    validPullbacks.push({
                        price: tempExtreme.price,
                        time: tempExtreme.time,
                        confirmHH: targetBreakLevel // 🎯 E-OF के टॉप के लिए
                    });
                    inPullback = false;
                }
            }
        }
    }
    return validPullbacks; // 🔥 पूरा लिस्ट रिटर्न करेगा
};


const identifyMechanicalStructure = (candles, startingTrend = "AUTO", counterStructureDepth = 0, structureMode = "MECHANICAL") => {

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

    // 🔥 NEW: History Tracker for Counter Structures
    let historicalCounterWaves = [];

    // ==========================================
    // 📉 BEARISH STATE VARIABLES
    // ==========================================
    let refLL = null;
    let tempLH = null;
    let confirmedLH = null;
    let validLL = null;
    let tempSwingHigh = null;
    let lockedSwingHigh = null;
    let prevLockedSwingHigh = null; // 🔥 THE GRANDFATHER NODE (बियरिश के लिए)
    let absoluteLowest = { price: candles[0].low, time: candles[0].timestamp };

    let bearishPullbacks = [];
    let tempPullbackTracker_Bearish = null;

    // 🔥 Liquidity Sweep (X) Variables
    let refX_BOS_Bearish = null;
    let majorIdm_Bearish = { price: -Infinity, time: null };
    let refX_CHoCH_Bearish = null;


    // 🔥 COUNTER STRUCTURE (D2S) VARIABLES FOR BULLISH TREND
    let isDobTapped_D2S = false;
    let tappingCandle_D2S = null;
    let isDobFailed_D2S = false;
    let refLL_D2S = null;
    let tempLH_D2S = null;
    let confirmedLH_D2S = null;
    let idm_D2S_Taken = false;


    // Phase 2 ke variables (Advance preparation)
    let swingLH_D2S = null;
    let pullbacks_D2S = [];

    // 🔥 NEW: COUNTER STRUCTURE (S2D) PHASE 2 & 3 VARIABLES
    let validHH_S2D = null;
    let tempSwingLow_S2D = null;
    let activeDob_S2D = null;
    let activeDof_S2D = null;
    let activeEob_S2D = null;  // 🎯 PHASE 3 
    let activeEof_S2D = null;  // 🎯 PHASE 3 
    let refX_S2D = null;


    // 🔥 NEW: COUNTER STRUCTURE (D2S) PHASE 2 & 3 VARIABLES
    let validLL_D2S = null;
    let tempSwingHigh_D2S = null;
    let activeDob_D2S = null;
    let activeDof_D2S = null;
    let activeEob_D2S = null;
    let activeEof_D2S = null;
    let refX_D2S = null;

    // ==========================================
    // 🧹 THE SMART HISTORY MANAGER & MAGIC ERASER
    // ==========================================
    const isCounterSig = (sig) => 
        sig.type === "IDM(D2S)" || sig.type === "IDM(S2D)" || 
        sig.type === "BOS(C)" || sig.type === "X(C)" ||
        (sig.displayName && (sig.displayName.includes("S2D") || sig.displayName.includes("D2S")));

    const wipeCounterStructure = () => {
        // 1. D2S मेमोरी क्लीन
        isDobTapped_D2S = false; tappingCandle_D2S = null; isDobFailed_D2S = false;
        refLL_D2S = null; tempLH_D2S = null; confirmedLH_D2S = null; idm_D2S_Taken = false;
        swingLH_D2S = null; pullbacks_D2S = [];
        validLL_D2S = null; tempSwingHigh_D2S = null;
        activeDob_D2S = null; activeDof_D2S = null;
        activeEob_D2S = null; activeEof_D2S = null;
        refX_D2S = null;

        // 2. S2D मेमोरी क्लीन
        isDobTapped_S2D = false; tappingCandle_S2D = null; isDobFailed_S2D = false;
        refHH_S2D = null; tempHL_S2D = null; confirmedHL_S2D = null; idm_S2D_Taken = false;
        validHH_S2D = null; tempSwingLow_S2D = null; 
        activeDob_S2D = null; activeDof_S2D = null; 
        activeEob_S2D = null; activeEof_S2D = null; 
        refX_S2D = null;

        // 🔥 3. SMART HISTORY LOGIC
        // सिर्फ वो काउंटर सिग्नल्स निकालो जो अभी 'करंट' हैं (यानी पहले से हिस्ट्री में नहीं गए हैं)
        let currentCounterSignals = signals.filter(sig => isCounterSig(sig) && !sig.isHistorical);

        if (currentCounterSignals.length > 0) {
            // इन सिग्नल्स को 'Historical' मार्क कर दें ताकि फ्रंटएंड इन्हें हल्का (dim) कर सके
            currentCounterSignals.forEach(sig => sig.isHistorical = true);
            historicalCounterWaves.push(currentCounterSignals);
        }

        // FIFO: पुरानी लहरों (Waves) को यूज़र की लिमिट (Depth) के हिसाब से हटाएं
        while (historicalCounterWaves.length > counterStructureDepth) {
            historicalCounterWaves.shift(); // सबसे पुराना काउंटर स्ट्रक्चर डिलीट!
        }

        // 4. Signals Array को फिर से बनाएं (Main Signals + Allowed History)
        let mainSignals = signals.filter(sig => !isCounterSig(sig));
        let validHistorySignals = [];
        historicalCounterWaves.forEach(wave => validHistorySignals.push(...wave));

        signals = [...mainSignals, ...validHistorySignals];
    };

    // 🔥 NEW: COUNTER STRUCTURE (S2D) VARIABLES FOR BEARISH TREND
    let isDobTapped_S2D = false;
    let tappingCandle_S2D = null;
    let isDobFailed_S2D = false;
    let refHH_S2D = null;
    let tempHL_S2D = null;
    let confirmedHL_S2D = null;
    let idm_S2D_Taken = false;




    // ==========================================
    // 📈 BULLISH STATE VARIABLES
    // ==========================================
    let refHH = null;
    let tempHL = null;
    let confirmedHL = null;
    let validHH = null;

    let tempSwingLow = null;
    let lockedSwingLow = null;
    let prevLockedSwingLow = null; // 🔥 THE GRANDFATHER NODE (बुलिश के लिए)
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
                wipeCounterStructure();
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
                    if (curr.close > breakLevel) { // 🚀 Full Body Break (Valid Breakout)
                        
                        // =======================================================
                        // 🧠 TECHNICAL STRUCTURE: FAKE CHoCH TRAP (TRANSFER OF IDM)
                        // =======================================================
                        if (structureMode === "TECHNICAL" && !isIdmTaken) {
                            // ❌ फेक CHoCH! इस वेव ने नीचे कोई IDM नहीं लिया था। 
                            // यह ब्रेकआउट ही असली IDM (Transfer) है!
                            isIdmTaken = true;
                            
                            // 🔥 THE ERASER FIX: पुराना फेक BOS चार्ट से मिटा दो!
                            for (let s = signals.length - 1; s >= 0; s--) {
                                if (signals[s].type === "BOS" && signals[s].trend === "BEARISH") {
                                    signals.splice(s, 1); // सबसे ताज़ा (गलत) BOS को डिलीट कर दो
                                    break;
                                }
                            }
                            
                            signals.push({ 
                                type: "IDM(T)", // (T) = Technical Transfer
                                trend: "BEARISH", 
                                price: lockedSwingHigh.price, 
                                startTime: lockedSwingHigh.time, 
                                endTime: curr.timestamp 
                            });

                            // 1. Valid LL को सबसे निचले पॉइंट (Absolute Lowest) पर फिक्स करो
                            validLL = { ...absoluteLowest };
                            
                            // 2. Temp Swing High सेट करो
                            tempSwingHigh = { price: curr.high, time: curr.timestamp };
                            majorIdm_Bearish = { price: curr.high, time: curr.timestamp };

                            // 3. 👑 दादाजी की वापसी! (Restore Grandfather)
                            lockedSwingHigh = prevLockedSwingHigh ? { ...prevLockedSwingHigh } : null;

                            // 4. क्लीनअप
                            refX_CHoCH_Bearish = null; 
                            
                            continue; // CHoCH नहीं हुआ है, इसलिए यहीं से आगे बढ़ो!
                        }
                        // =======================================================

                        // ✅ Normal CHoCH Logic
                        
                        // 🔥 THE FADE FIX: CHoCH से पहले का सारा अंदरूनी (Internal) स्ट्रक्चर धुंधला कर दो
                        if (structureMode === "TECHNICAL") {
                            signals.forEach(sig => {
                                let sigStart = sig.startTime || sig.time;
                                let sigEnd = sig.endTime || sig.time;
                                
                                // अगर कोई स्ट्रक्चर इस Major 'Swing High' के टाइम से लेकर अभी ब्रेकआउट के बीच बना है:
                                if (sigStart >= lockedSwingHigh.time && sigEnd <= curr.timestamp) {
                                    sig.isHistorical = true; // 🌫️ फ्रंटएंड पर धुंधला (Dim) हो जाएगा
                                    if (["E-OB", "D-OB", "E-OF", "D-OF"].includes(sig.type)) {
                                        sig.isActive = false; // 🛑 पुराने ज़ोन को आगे बढ़ने से रोक दो
                                    }
                                }
                            });
                        }
                        signals.push({
                            type: "CHoCH", trend: "BULLISH",
                            sweptSide: "HIGH",
                            price: lockedSwingHigh.price,
                            startTime: lockedSwingHigh.time,
                            endTime: curr.timestamp
                        });

                        trend = 1;
                        isIdmTaken = false;
                        wipeCounterStructure();
                        lockedSwingLow = { ...absoluteLowest };

                        validLL = null; refLL = null; tempSwingHigh = null; lockedSwingHigh = null;
                        refX_CHoCH_Bearish = null; refX_BOS_Bearish = null;
                        bearishPullbacks = []; tempPullbackTracker_Bearish = null;

                        refHH = null; tempHL = null; bullishPullbacks = []; tempPullbackTracker = null;

                        // 🔥 RETRO-SCANNER INJECTION: CHoCH के पहले वाले Bullish पुलबैक्स ढूँढो
                        let startIdx = candles.findIndex(c => c.timestamp === lockedSwingLow.time);
                        let retroPBs = scanRetroactivePullbacks(startIdx, i, candles, "BULLISH");
                        confirmedHL = retroPBs.length > 0 ? retroPBs[retroPBs.length - 1] : null;

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
                            // 🔥 THE McM(X) SWEEP CHECK FOR BEARISH: क्या कैंडल ने Ref LL के ऊपर क्लोज़ किया? (Wick Sweep)
                            tempPullbackTracker_Bearish.isSwept = (curr.close > tempPullbackTracker_Bearish.confirmLL);

                            tempPullbackTracker_Bearish.breakCandleIndex = i;
                            bearishPullbacks.push({ ...tempPullbackTracker_Bearish });
                            tempPullbackTracker_Bearish = null;
                        }
                    }
                }
            }

            // 🎯 THE FINAL IDM CONFIRMATION & SUPPLY ZONE TRANSFORMATION
            // 🎯 THE FINAL IDM CONFIRMATION & SUPPLY ZONE TRANSFORMATION
            if (confirmedLH !== null && curr.high >= confirmedLH.price && !isIdmTaken) {
                isIdmTaken = true;
                validLL = { ...absoluteLowest };
                tempSwingHigh = { price: curr.high, time: curr.timestamp };
                majorIdm_Bearish = { price: curr.high, time: curr.timestamp };

                // ==========================================================
                // 🔥 THE McM(X) & IDM-OF LOGIC FOR BEARISH (THE TRUE SWEEP FIX)
                // ==========================================================
                let idmLabel = "IDM";
                const targetPb = bearishPullbacks.find(pb => pb.validLH === confirmedLH.price);

                if (targetPb) {
                    // 🛡️ THE REAL SWEEP VERIFIER FOR BEARISH
                    // चेक करो कि ब्रेक होने वाली कैंडल से लेकर अभी (IDM लेने वाली कैंडल) तक,
                    // क्या किसी भी कैंडल ने Ref LL (confirmLL) के नीचे फुल 'Close' किया है?
                    let trueSweep = true;
                    for (let k = targetPb.breakCandleIndex; k <= i; k++) {
                        if (candles[k].close < targetPb.confirmLL) {
                            trueSweep = false; // ❌ Full body break मिल गया, यह स्वीप नहीं है!
                            break;
                        }
                    }

                    if (trueSweep) {
                        idmLabel = "IDM/ch"; 

                        // 1. McM(X) लाइन ड्रा करें (बॉटम पर)
                        signals.push({ 
                            type: "McM(X)", 
                            trend: "BEARISH", 
                            sweptSide: "LOW", 
                            price: targetPb.confirmLL, // Ref LL का प्राइस
                            startTime: targetPb.startTime, 
                            endTime: validLL.time  
                        });

                        // 2. IDM-OF (Order Flow) Box ड्रा करें
                        // Bearish में यह Demand ज़ोन की तरह काम करेगा, इसलिए बुलिश मिटिगेशन (ऊपर से नीचे टैप) यूज़ करेंगे
                        let mitTimeIdmOf = findMitigationTime(confirmedLH.price, i, candles);

                        signals.push({ 
                            type: "IDM-OF", 
                            displayName: "IDM OF", 
                            trend: "BEARISH", 
                            priceTop: confirmedLH.price, 
                            priceBottom: validLL.price, 
                            startTime: validLL.time, 
                            endTime: mitTimeIdmOf, 
                            isActive: true 
                        });
                    }
                }

                // IDM या IDM/ch की लाइन ड्रा करें
                signals.push({ type: idmLabel, trend: "BEARISH", price: confirmedLH.price, startTime: confirmedLH.time, endTime: curr.timestamp });

                // 🔥 1. THE ROOT EXTREME FIX
                const rootTime = lockedSwingHigh ? lockedSwingHigh.time : absoluteHighest.time;
                const rootPrice = lockedSwingHigh ? lockedSwingHigh.price : absoluteHighest.price;

                const swingLHIndex = candles.findIndex(c => c.timestamp === rootTime);
                const refLLIndex = candles.findIndex(c => c.timestamp === validLL.time);

                // 🎯 THE E-OF SIZE FIX: स्कैनर से पहला पुलबैक निकालो
                let rootConfirmLL = validLL.price;
                let wavePullbacks = scanRetroactivePullbacks(swingLHIndex, refLLIndex, candles, "BEARISH");
                if (wavePullbacks.length > 0) {
                    rootConfirmLL = wavePullbacks[0].confirmLL; // पहला पुलबैक का Low
                }

                const rootExtreme = {
                    id: "ROOT_SWING_LH",
                    validLH: rootPrice,
                    validLHCandleIndex: swingLHIndex,
                    confirmLL: rootConfirmLL, // <--- परफेक्ट साइज़
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

                        prevLockedSwingHigh = { ...lockedSwingHigh }; // 🔥 दादाजी को सेव करो!
                        lockedSwingHigh = { ...tempSwingHigh };
                        
                        isIdmTaken = false;
                        wipeCounterStructure();
                        validLL = null; refLL = null; refX_BOS_Bearish = null;

                        // 🔥 RETRO-SCANNER INJECTION: BOS के पहले वाले पुलबैक्स ढूँढो
                        let startIdx = candles.findIndex(c => c.timestamp === lockedSwingHigh.time);
                        let retroPBs = scanRetroactivePullbacks(startIdx, i, candles, "BEARISH");
                        confirmedLH = retroPBs.length > 0 ? retroPBs[retroPBs.length - 1] : null;
                        
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
            // =========================================================================
            // 🔥 PHASE 1: COUNTER STRUCTURE (S2D) LOGIC STARTS HERE 🔥
            // =========================================================================

            // 🛑 THE CHoCH/BOS AUTO-CLEANER (Chanchal Bhai's Rule)
            let currentWaveStart_S2D = lockedSwingHigh ? lockedSwingHigh.time : absoluteHighest.time;

            if ( (confirmedHL_S2D && confirmedHL_S2D.time < currentWaveStart_S2D) || 
                 (refHH_S2D && refHH_S2D.time < currentWaveStart_S2D) ) {
                isDobTapped_S2D = false; tappingCandle_S2D = null; isDobFailed_S2D = false;
                refHH_S2D = null; tempHL_S2D = null; confirmedHL_S2D = null; idm_S2D_Taken = false;
            }
            
            // 🎯 1. Active D-OB (Supply Zone) को ढूँढना
            let activeDobZone_Bearish = null;
            if (isIdmTaken) {
                for (let s = signals.length - 1; s >= 0; s--) {
                    if (signals[s].type === "D-OB" && signals[s].trend === "BEARISH" && signals[s].isActive !== false) {
                        if (signals[s].startTime >= currentWaveStart_S2D) { 
                            activeDobZone_Bearish = signals[s];
                            break;
                        }
                    }
                }
            }

            if (activeDobZone_Bearish) {
                // 🎯 2. TAPPING CHECK 
                if (!isDobTapped_S2D && curr.high >= activeDobZone_Bearish.priceBottom) {
                    isDobTapped_S2D = true;
                    tappingCandle_S2D = curr;
                }

                // 🎯 3. D-OB FAILURE CHECK 
                if (isDobTapped_S2D && !isDobFailed_S2D) {
                    let isOutsideBar_S2D = curr.high > tappingCandle_S2D.high && curr.low < tappingCandle_S2D.low;
                    if (!isOutsideBar_S2D) {
                        if (curr.high > tappingCandle_S2D.high || tappingCandle_S2D.close > activeDobZone_Bearish.priceTop) {
                            isDobFailed_S2D = true;
                            refHH_S2D = { price: curr.high, time: curr.timestamp };
                        }
                    }
                }
            }

            // 🎯 4. IDM(S2D) PULLBACK TRACKING 
            if (isDobFailed_S2D && !idm_S2D_Taken) {
                let brokeLow = curr.low < refCandle.low; 

                if (brokeLow && !isOutsideBar && refHH_S2D !== null && tempHL_S2D === null) {
                    tempHL_S2D = { price: curr.low, time: curr.timestamp };
                } 
                else if (refHH_S2D !== null) {
                    if (tempHL_S2D !== null && curr.low < tempHL_S2D.price) {
                        tempHL_S2D = { price: curr.low, time: curr.timestamp };
                    }
                    if (tempHL_S2D === null && curr.high > refHH_S2D.price) {
                        refHH_S2D = { price: curr.high, time: curr.timestamp };
                    }
                    if (tempHL_S2D !== null && curr.high >= refHH_S2D.price) {
                        if (curr.timestamp === tempHL_S2D.time) {
                            refHH_S2D = null; 
                            tempHL_S2D = null; 
                        } else {
                            confirmedHL_S2D = tempHL_S2D;
                            refHH_S2D = { price: curr.high, time: curr.timestamp }; 
                            tempHL_S2D = null; 
                        }
                    }
                }

                // 🎯 5. IDM(S2D) HIT & ZONE GENERATION!
                if (confirmedHL_S2D !== null && curr.low <= confirmedHL_S2D.price) {
                    
                    let isGhost = false;
                    for(let k = signals.length - 1; k >= 0; k--) {
                        let sig = signals[k];
                        if(sig.type === "CHoCH" || sig.type === "BOS") {
                            if(sig.endTime > confirmedHL_S2D.time) { isGhost = true; break; }
                        }
                    }

                    if (!isGhost) {
                        idm_S2D_Taken = true;
                        // 🔥 Phase 2 की शुरुआत: Top और Bottom लॉक करो!
                        validHH_S2D = { price: refHH_S2D.price, time: refHH_S2D.time };
                        tempSwingLow_S2D = { price: curr.low, time: curr.timestamp };

                        signals.push({ 
                            type: "IDM(S2D)", trend: "BULLISH_COUNTER", 
                            price: confirmedHL_S2D.price, startTime: confirmedHL_S2D.time, 
                            endTime: curr.timestamp, sweptSide: "LOW", position: "bottom"    
                        });

                        // =======================================================
                        // 🔥 THE BUG FIX: S2D का सही Bottom (Start Index) ढूँढना!
                        // =======================================================
                        let tempStartIdx = candles.findIndex(c => c.timestamp === currentWaveStart_S2D);
                        let endIdx_S2D = candles.findIndex(c => c.timestamp === validHH_S2D.time);
                        
                        let startIdx_S2D = tempStartIdx;
                        if (tempStartIdx !== -1 && endIdx_S2D !== -1) {
                            let minLow = candles[tempStartIdx].low;
                            for (let k = tempStartIdx; k <= endIdx_S2D; k++) {
                                if (candles[k].low < minLow) {
                                    minLow = candles[k].low;
                                    startIdx_S2D = k;
                                }
                            }
                        }
                        
                        let s2dPullbacks = scanRetroactivePullbacks(startIdx_S2D, endIdx_S2D, candles, "BULLISH");

                        // 🔥 ROOT EXTREME FIX FOR S2D (ताकि D-OB सही से मिले)
                        if (startIdx_S2D !== -1 && endIdx_S2D !== -1) {
                            let rootConfirmHH = s2dPullbacks.length > 0 ? s2dPullbacks[0].confirmHH : validHH_S2D.price;
                            s2dPullbacks.unshift({
                                id: "ROOT_SWING_HL",
                                validHL: candles[startIdx_S2D].low,
                                validHLCandleIndex: startIdx_S2D,
                                confirmHH: rootConfirmHH,
                                confirmHHCandleIndex: endIdx_S2D,
                                breakCandleIndex: endIdx_S2D, 
                                startTime: candles[startIdx_S2D].timestamp
                            });
                        }

                        let poiZones_S2D = findSMCZones(candles, s2dPullbacks, i);
                        // =======================================================
                        
                        if (poiZones_S2D.dof) {
                            let mitTimeDof = findMitigationTime(poiZones_S2D.dof.top, i, candles);
                            activeDof_S2D = { type: "D-OF", displayName: "D-S2D(OF)", trend: "BULLISH", priceTop: poiZones_S2D.dof.top, priceBottom: poiZones_S2D.dof.bottom, startTime: poiZones_S2D.dof.startTime, endTime: mitTimeDof, isActive: true };
                            signals.push(activeDof_S2D);
                        }
                        if (poiZones_S2D.dob) {
                            let mitTimeDob = findMitigationTime(poiZones_S2D.dob.top, i, candles);
                            activeDob_S2D = { type: "D-OB", displayName: "D-S2D(OB)", trend: "BULLISH", priceTop: poiZones_S2D.dob.top, priceBottom: poiZones_S2D.dob.bottom, startTime: poiZones_S2D.dob.startTime, fvgTop: poiZones_S2D.dob.fvgTop, fvgBottom: poiZones_S2D.dob.fvgBottom, endTime: mitTimeDob, isActive: true };
                            signals.push(activeDob_S2D);
                        }
                        
                        // --- 🔥 PHASE 3: EXTREME ZONES (S2D) ---
                        if (poiZones_S2D.eof) {
                            let mitTimeEof = findMitigationTime(poiZones_S2D.eof.top, i, candles);
                            activeEof_S2D = { 
                                type: "E-OF", 
                                displayName: "E-S2D(OF)", // 🎯 यही नाम फ्रंटएंड पर छपेगा
                                trend: "BULLISH", 
                                priceTop: poiZones_S2D.eof.top, 
                                priceBottom: poiZones_S2D.eof.bottom, 
                                startTime: poiZones_S2D.eof.startTime, 
                                endTime: mitTimeEof, 
                                isActive: true 
                            };
                            signals.push(activeEof_S2D);
                        }
                        if (poiZones_S2D.eob) {
                            let mitTimeEob = findMitigationTime(poiZones_S2D.eob.top, i, candles);
                            activeEob_S2D = { 
                                type: "E-OB", 
                                displayName: "E-S2D(OB)", // 🎯 यही नाम फ्रंटएंड पर छपेगा
                                trend: "BULLISH", 
                                priceTop: poiZones_S2D.eob.top, 
                                priceBottom: poiZones_S2D.eob.bottom, 
                                startTime: poiZones_S2D.eob.startTime, 
                                fvgTop: poiZones_S2D.eob.fvgTop, 
                                fvgBottom: poiZones_S2D.eob.fvgBottom, 
                                endTime: mitTimeEob, 
                                isActive: true 
                            };
                            signals.push(activeEob_S2D);
                        }
                    }
                    
                    refHH_S2D = null; tempHL_S2D = null; confirmedHL_S2D = null;
                }
            }
            // =========================================================================
            // 🔥 PHASE 1: COUNTER STRUCTURE ENDS HERE 🔥
            // =========================================================================
            // 🎯 6. PHASE 2 & 3: BOS(C) LOGIC FOR S2D
            if (idm_S2D_Taken && validHH_S2D !== null) {
                // Dip ट्रैक करो
                if (curr.low < tempSwingLow_S2D.price) {
                    tempSwingLow_S2D = { price: curr.low, time: curr.timestamp };
                }
                
                let breakLevel_S2D = refX_S2D ? refX_S2D.price : validHH_S2D.price;
                
                if (curr.high > breakLevel_S2D) {
                    if (curr.close > breakLevel_S2D) { // 🚀 Full Body Break (BOS-C)
                        
                        // 🔥 चेक करो कि क्या ब्रेक करने से पहले किसी भी ज़ोन (Decisional या Extreme) को टैप किया था?
                        let isTapped = false;
                        if ((activeDob_S2D && tempSwingLow_S2D.price <= activeDob_S2D.priceTop) || 
                            (activeDof_S2D && tempSwingLow_S2D.price <= activeDof_S2D.priceTop) ||
                            (activeEob_S2D && tempSwingLow_S2D.price <= activeEob_S2D.priceTop) ||
                            (activeEof_S2D && tempSwingLow_S2D.price <= activeEof_S2D.priceTop)) {
                            isTapped = true;
                        }
                        
                        if (isTapped) {
                            signals.push({ type: "BOS(C)", trend: "BULLISH", price: validHH_S2D.price, startTime: validHH_S2D.time, endTime: curr.timestamp });
                            if (refX_S2D) {
                                signals.push({ type: "X(C)", sweptSide: "HIGH", trend: "BULLISH", price: validHH_S2D.price, startTime: validHH_S2D.time, endTime: refX_S2D.time });
                            }
                        } else {
                            // 🧹 बिना टैप किये ब्रेक किया: चार्ट से पुराने सारे D और E ज़ोन मिटा दो!
                            signals = signals.filter(s => 
                                s !== activeDob_S2D && s !== activeDof_S2D && 
                                s !== activeEob_S2D && s !== activeEof_S2D
                            );
                            signals.push({ type: "BOS(C)", trend: "BULLISH", price: validHH_S2D.price, startTime: validHH_S2D.time, endTime: curr.timestamp });
                        }
                        
                        // 🔥 S2D का ट्रेंड चालू रहेगा! अगले पुलबैक के लिए रीसेट करो
                        idm_S2D_Taken = false;
                        refHH_S2D = { price: curr.high, time: curr.timestamp };
                        validHH_S2D = null; tempSwingLow_S2D = null; 
                        activeDob_S2D = null; activeDof_S2D = null; 
                        activeEob_S2D = null; activeEof_S2D = null; 
                        refX_S2D = null;
                        
                    } else { 
                        // 🧹 Sweep हुआ (X-C)
                        refX_S2D = { price: curr.high, time: curr.timestamp };
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
                wipeCounterStructure();
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

                        // =======================================================
                        // 🧠 TECHNICAL STRUCTURE: FAKE CHoCH TRAP (TRANSFER OF IDM)
                        // =======================================================
                        if (structureMode === "TECHNICAL" && !isIdmTaken) {
                            // ❌ फेक CHoCH! इस वेव ने ऊपर कोई IDM नहीं लिया था। 
                            // यह ब्रेकआउट ही असली IDM (Transfer) है!
                            isIdmTaken = true;

                            // 🔥 THE ERASER FIX: पुराना फेक BOS चार्ट से मिटा दो!
                            for (let s = signals.length - 1; s >= 0; s--) {
                                if (signals[s].type === "BOS" && signals[s].trend === "BULLISH") {
                                    signals.splice(s, 1); // सबसे ताज़ा (गलत) BOS को डिलीट कर दो
                                    break;
                                }
                            }

                            signals.push({ 
                                type: "IDM(T)", // (T) = Technical Transfer
                                trend: "BULLISH", 
                                price: lockedSwingLow.price, 
                                startTime: lockedSwingLow.time, 
                                endTime: curr.timestamp 
                            });

                            // 1. Valid HH को सबसे ऊपरी पॉइंट पर फिक्स करो
                            validHH = { ...absoluteHighest };
                            
                            // 2. Temp Swing Low सेट करो
                            tempSwingLow = { price: curr.low, time: curr.timestamp };
                            majorIdm_Bullish = { price: curr.low, time: curr.timestamp };

                            // 3. 👑 दादाजी की वापसी! (Restore Grandfather)
                            lockedSwingLow = prevLockedSwingLow ? { ...prevLockedSwingLow } : null;

                            // 4. क्लीनअप
                            refX_CHoCH_Bullish = null; 
                            
                            continue; // CHoCH नहीं हुआ है, इसलिए यहीं से आगे बढ़ो!
                        }


                        // 🔥 THE FADE FIX: CHoCH से पहले का सारा अंदरूनी (Internal) स्ट्रक्चर धुंधला कर दो
                        if (structureMode === "TECHNICAL") {
                            signals.forEach(sig => {
                                let sigStart = sig.startTime || sig.time;
                                let sigEnd = sig.endTime || sig.time;
                                
                                // अगर कोई स्ट्रक्चर इस Major 'Swing Low' के टाइम से लेकर अभी ब्रेकआउट के बीच बना है:
                                if (sigStart >= lockedSwingLow.time && sigEnd <= curr.timestamp) {
                                    sig.isHistorical = true; // 🌫️ फ्रंटएंड पर धुंधला (Dim) हो जाएगा
                                    if (["E-OB", "D-OB", "E-OF", "D-OF"].includes(sig.type)) {
                                        sig.isActive = false; // 🛑 पुराने ज़ोन को आगे बढ़ने से रोक दो
                                    }
                                }
                            });
                        }
                        signals.push({
                            type: "CHoCH", trend: "BEARISH",
                            price: lockedSwingLow.price,
                            startTime: lockedSwingLow.time,
                            endTime: curr.timestamp
                        });

                        trend = -1;
                        isIdmTaken = false;
                        wipeCounterStructure();
                        lockedSwingHigh = { ...absoluteHighest };

                        validHH = null; refHH = null; tempSwingLow = null; lockedSwingLow = null;
                        refX_CHoCH_Bullish = null; refX_BOS_Bullish = null;
                        bullishPullbacks = []; tempPullbackTracker = null;

                        refLL = null; tempLH = null; bearishPullbacks = []; tempPullbackTracker_Bearish = null;

                        // 🔥 RETRO-SCANNER INJECTION: CHoCH के पहले वाले Bearish पुलबैक्स ढूँढो
                        let startIdx = candles.findIndex(c => c.timestamp === lockedSwingHigh.time);
                        let retroPBs = scanRetroactivePullbacks(startIdx, i, candles, "BEARISH");
                        confirmedLH = retroPBs.length > 0 ? retroPBs[retroPBs.length - 1] : null;

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
                    if (curr.timestamp === tempHL.time) {
                        // ❌ Fake Engulfing Pullback (Discard)
                        refHH = null;
                        tempPullbackTracker = null;
                    } else {
                        // ✅ Valid Pullback (Confirm)
                        confirmedHL = tempHL;
                        refHH = null;

                        if (tempPullbackTracker) {
                            // 🔥 THE McM(X) SWEEP CHECK: क्या कैंडल ने Ref HH के नीचे क्लोज़ किया? (Wick Sweep)
                            tempPullbackTracker.isSwept = (curr.close < tempPullbackTracker.confirmHH);
                            
                            tempPullbackTracker.breakCandleIndex = i;
                            bullishPullbacks.push({ ...tempPullbackTracker });
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

                // ==========================================================
                // 🔥 THE McM(X) & IDM-OF LOGIC
                // ==========================================================
                let idmLabel = "IDM";
                const targetPb = bullishPullbacks.find(pb => pb.validHL === confirmedHL.price);

                if (targetPb) {
                    // 🛡️ THE REAL SWEEP VERIFIER
                    // चेक करो कि ब्रेक होने वाली कैंडल से लेकर अभी (IDM लेने वाली कैंडल) तक,
                    // क्या किसी भी कैंडल ने Ref HH (confirmHH) के ऊपर फुल 'Close' किया है?
                    let trueSweep = true;
                    for (let k = targetPb.breakCandleIndex; k <= i; k++) {
                        if (candles[k].close > targetPb.confirmHH) {
                            trueSweep = false; // ❌ Full body break मिल गया, यह स्वीप नहीं है!
                            break;
                        }
                    }

                    if (trueSweep) {
                        idmLabel = "IDM/ch"; 

                        // 1. McM(X) लाइन ड्रा करें (टॉप पर)
                        signals.push({ 
                            type: "McM(X)", 
                            trend: "BULLISH", 
                            sweptSide: "HIGH", 
                            price: targetPb.confirmHH, // Ref HH का प्राइस
                            startTime: targetPb.startTime, 
                            endTime: validHH.time  
                        });

                        // 2. IDM-OF (Order Flow) Box ड्रा करें
                        let mitTimeIdmOf = findMitigationTime_Bearish(confirmedHL.price, i, candles);

                        signals.push({ 
                            type: "IDM-OF", 
                            displayName: "IDM OF", 
                            trend: "BULLISH", 
                            priceTop: validHH.price, 
                            priceBottom: confirmedHL.price, 
                            startTime: validHH.time, 
                            endTime: mitTimeIdmOf, 
                            isActive: true 
                        });
                    }
                }

                // IDM या IDM/ch की लाइन ड्रा करें
                signals.push({ type: idmLabel, trend: "BULLISH", price: confirmedHL.price, startTime: confirmedHL.time, endTime: curr.timestamp });
                // ==========================================================
                // 🔥 THE ROOT EXTREME FIX (Null Crash Fix)
                // ==========================================================   
                const rootTime = lockedSwingLow ? lockedSwingLow.time : absoluteLowest.time;
                const rootPrice = lockedSwingLow ? lockedSwingLow.price : absoluteLowest.price;

                const swingHLIndex = candles.findIndex(c => c.timestamp === rootTime);
                const refHHIndex = candles.findIndex(c => c.timestamp === validHH.time);

                // 🎯 THE E-OF SIZE FIX: स्कैनर से पहला पुलबैक निकालो
                let rootConfirmHH = validHH.price;
                let wavePullbacks = scanRetroactivePullbacks(swingHLIndex, refHHIndex, candles, "BULLISH");
                if (wavePullbacks.length > 0) {
                    rootConfirmHH = wavePullbacks[0].confirmHH; // पहला पुलबैक का High
                }

                const rootExtreme = {
                    id: "ROOT_SWING_HL",
                    validHL: rootPrice,
                    validHLCandleIndex: swingHLIndex,
                    confirmHH: rootConfirmHH, // <--- परफेक्ट साइज़
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

                        // 🔥 दादाजी को सेव करो!
                        prevLockedSwingLow = { ...lockedSwingLow }; 
                        lockedSwingLow = { ...tempSwingLow };
                        isIdmTaken = false;
                        wipeCounterStructure();
                        validHH = null; refHH = null; refX_BOS_Bullish = null;

                        // 🔥 RETRO-SCANNER INJECTION: BOS के पहले वाले Bullish पुलबैक्स ढूँढो
                        let startIdx = candles.findIndex(c => c.timestamp === lockedSwingLow.time);
                        let retroPBs = scanRetroactivePullbacks(startIdx, i, candles, "BULLISH");
                        confirmedHL = retroPBs.length > 0 ? retroPBs[retroPBs.length - 1] : null;

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

            // =========================================================================
            // 🔥 PHASE 1: COUNTER STRUCTURE (D2S) LOGIC STARTS HERE 🔥
            // =========================================================================

           // 🛑 THE CHoCH/BOS AUTO-CLEANER (Chanchal Bhai's Rule)
            // अगर पुराना D2S ट्रैकर (LL/LH) मेन स्ट्रक्चर (CHoCH/BOS) से पहले का है, तो उसे तुरंत क्लियर कर दो!
            let currentWaveStart_D2S = lockedSwingLow ? lockedSwingLow.time : absoluteLowest.time;
            
            if ( (confirmedLH_D2S && confirmedLH_D2S.time < currentWaveStart_D2S) || 
                 (refLL_D2S && refLL_D2S.time < currentWaveStart_D2S) ) {
                isDobTapped_D2S = false; tappingCandle_D2S = null; isDobFailed_D2S = false;
                refLL_D2S = null; tempLH_D2S = null; confirmedLH_D2S = null; idm_D2S_Taken = false;
            }

            // 🎯 1. Active D-OB Zone को ढूँढना (Ghost Fix Applied)
            let activeDobZone = null;
            if (isIdmTaken) {
                for (let s = signals.length - 1; s >= 0; s--) {
                    if (signals[s].type === "D-OB" && signals[s].trend === "BULLISH" && signals[s].isActive !== false) {
                        // सिर्फ करेंट वेव का D-OB उठाओ
                        if (signals[s].startTime >= currentWaveStart_D2S) {
                            activeDobZone = signals[s];
                            break;
                        }
                    }
                }
            }

            if (activeDobZone) {
                // 🎯 2. TAPPING CHECK 
                if (!isDobTapped_D2S && curr.low <= activeDobZone.priceTop) {
                    isDobTapped_D2S = true;
                    tappingCandle_D2S = curr;
                }

                // 🎯 3. D-OB FAILURE CHECK
                if (isDobTapped_D2S && !isDobFailed_D2S) {
                    let isOutsideBar = curr.high > tappingCandle_D2S.high && curr.low < tappingCandle_D2S.low;
                    if (!isOutsideBar) {
                        if (curr.low < tappingCandle_D2S.low || tappingCandle_D2S.close < activeDobZone.priceBottom) {
                            isDobFailed_D2S = true;
                            refLL_D2S = { price: curr.low, time: curr.timestamp };
                        }
                    }
                }
            }

            // 🎯 4. IDM(D2S) PULLBACK TRACKING 
            if (isDobFailed_D2S && !idm_D2S_Taken) {
                let brokeHigh = curr.high > refCandle.high; 

                if (brokeHigh && !isOutsideBar && refLL_D2S !== null && tempLH_D2S === null) {
                    tempLH_D2S = { price: curr.high, time: curr.timestamp };
                } 
                else if (refLL_D2S !== null) {
                    if (tempLH_D2S !== null && curr.high > tempLH_D2S.price) {
                        tempLH_D2S = { price: curr.high, time: curr.timestamp };
                    }
                    if (tempLH_D2S === null && curr.low < refLL_D2S.price) {
                        refLL_D2S = { price: curr.low, time: curr.timestamp };
                    }
                    if (tempLH_D2S !== null && curr.low <= refLL_D2S.price) {
                        if (curr.timestamp === tempLH_D2S.time) {
                            refLL_D2S = null; 
                            tempLH_D2S = null; 
                        } else {
                            confirmedLH_D2S = tempLH_D2S;
                            refLL_D2S = { price: curr.low, time: curr.timestamp }; 
                            tempLH_D2S = null; 
                        }
                    }
                }

                // 🎯 5. IDM(D2S) HIT & ZONE GENERATION!
                if (confirmedLH_D2S !== null && curr.high >= confirmedLH_D2S.price) {
                    
                    let isGhost = false;
                    for(let k = signals.length - 1; k >= 0; k--) {
                        let sig = signals[k];
                        if(sig.type === "CHoCH" || sig.type === "BOS") {
                            if(sig.endTime > confirmedLH_D2S.time) { isGhost = true; break; }
                        }
                    }

                    if (!isGhost) {
                        idm_D2S_Taken = true;
                        
                        // 🔥 Phase 2 & 3 की शुरुआत: Top और Bottom लॉक करो!
                        validLL_D2S = { price: refLL_D2S.price, time: refLL_D2S.time };
                        tempSwingHigh_D2S = { price: curr.high, time: curr.timestamp }; // पीक ट्रैक करने के लिए

                        signals.push({ 
                            type: "IDM(D2S)", trend: "BEARISH_COUNTER", 
                            price: confirmedLH_D2S.price, startTime: confirmedLH_D2S.time, 
                            endTime: curr.timestamp, sweptSide: "HIGH", position: "aboveBar" 
                        });

                        // =======================================================
                        // 🔥 THE BUG FIX: D2S का सही Top (Start Index) ढूँढना!
                        // =======================================================
                        let tempStartIdx = candles.findIndex(c => c.timestamp === currentWaveStart_D2S);
                        let endIdx_D2S = candles.findIndex(c => c.timestamp === validLL_D2S.time);
                        
                        let startIdx_D2S = tempStartIdx;
                        if (tempStartIdx !== -1 && endIdx_D2S !== -1) {
                            let maxHigh = candles[tempStartIdx].high;
                            for (let k = tempStartIdx; k <= endIdx_D2S; k++) {
                                if (candles[k].high > maxHigh) {
                                    maxHigh = candles[k].high;
                                    startIdx_D2S = k;
                                }
                            }
                        }
                        
                        let d2sPullbacks = scanRetroactivePullbacks(startIdx_D2S, endIdx_D2S, candles, "BEARISH");

                        // 🔥 ROOT EXTREME FIX FOR D2S (Bearish)
                        if (startIdx_D2S !== -1 && endIdx_D2S !== -1) {
                            let rootConfirmLL = d2sPullbacks.length > 0 ? d2sPullbacks[0].confirmLL : validLL_D2S.price;
                            d2sPullbacks.unshift({
                                id: "ROOT_SWING_LH",
                                validLH: candles[startIdx_D2S].high,
                                validLHCandleIndex: startIdx_D2S,
                                confirmLL: rootConfirmLL, // <--- परफेक्ट साइज़
                                confirmLLCandleIndex: endIdx_D2S,
                                breakCandleIndex: endIdx_D2S, 
                                startTime: candles[startIdx_D2S].timestamp
                            });
                        }

                        let poiZones_D2S = findSMCZones_Bearish(candles, d2sPullbacks, i);
                        // =======================================================
                        
                        // --- DECISIONAL ZONES (D2S) ---
                        if (poiZones_D2S.dof) {
                            let mitTimeDof = findMitigationTime_Bearish(poiZones_D2S.dof.bottom, i, candles);
                            activeDof_D2S = { type: "D-OF", displayName: "D-D2S(OF)", trend: "BEARISH", priceTop: poiZones_D2S.dof.top, priceBottom: poiZones_D2S.dof.bottom, startTime: poiZones_D2S.dof.startTime, endTime: mitTimeDof, isActive: true };
                            signals.push(activeDof_D2S);
                        }
                        if (poiZones_D2S.dob) {
                            let mitTimeDob = findMitigationTime_Bearish(poiZones_D2S.dob.bottom, i, candles);
                            activeDob_D2S = { type: "D-OB", displayName: "D-D2S(OB)", trend: "BEARISH", priceTop: poiZones_D2S.dob.top, priceBottom: poiZones_D2S.dob.bottom, startTime: poiZones_D2S.dob.startTime, fvgTop: poiZones_D2S.dob.fvgTop, fvgBottom: poiZones_D2S.dob.fvgBottom, endTime: mitTimeDob, isActive: true };
                            signals.push(activeDob_D2S);
                        }

                        // --- 🔥 PHASE 3: EXTREME ZONES (D2S) ---
                        if (poiZones_D2S.eof) {
                            let mitTimeEof = findMitigationTime_Bearish(poiZones_D2S.eof.bottom, i, candles);
                            activeEof_D2S = { type: "E-OF", displayName: "E-D2S(OF)", trend: "BEARISH", priceTop: poiZones_D2S.eof.top, priceBottom: poiZones_D2S.eof.bottom, startTime: poiZones_D2S.eof.startTime, endTime: mitTimeEof, isActive: true };
                            signals.push(activeEof_D2S);
                        }
                        if (poiZones_D2S.eob) {
                            let mitTimeEob = findMitigationTime_Bearish(poiZones_D2S.eob.bottom, i, candles);
                            activeEob_D2S = { type: "E-OB", displayName: "E-D2S(OB)", trend: "BEARISH", priceTop: poiZones_D2S.eob.top, priceBottom: poiZones_D2S.eob.bottom, startTime: poiZones_D2S.eob.startTime, fvgTop: poiZones_D2S.eob.fvgTop, fvgBottom: poiZones_D2S.eob.fvgBottom, endTime: mitTimeEob, isActive: true };
                            signals.push(activeEob_D2S);
                        }
                    }
                    
                    refLL_D2S = null; tempLH_D2S = null; confirmedLH_D2S = null;
                }
            }
            // =========================================================================
            // 🔥 PHASE 1: COUNTER STRUCTURE ENDS HERE 🔥
            // =========================================================================


            // 🎯 6. PHASE 2 & 3: BOS(C) LOGIC FOR D2S (Counter Bearish)
            if (idm_D2S_Taken && validLL_D2S !== null) {
                // Peak (High) ट्रैक करो
                if (curr.high > tempSwingHigh_D2S.price) {
                    tempSwingHigh_D2S = { price: curr.high, time: curr.timestamp };
                }
                
                let breakLevel_D2S = refX_D2S ? refX_D2S.price : validLL_D2S.price;
                
                if (curr.low < breakLevel_D2S) {
                    if (curr.close < breakLevel_D2S) { // 🚀 Full Body Break (BOS-C)
                        
                        // 🔥 चेक करो कि क्या ब्रेक करने से पहले किसी ज़ोन को टैप किया था?
                        // Bearish Counter Trend है, तो प्राइस ऊपर जाकर Supply Zone के 'Bottom' को टैप करेगा!
                        let isTapped = false;
                        if ((activeDob_D2S && tempSwingHigh_D2S.price >= activeDob_D2S.priceBottom) || 
                            (activeDof_D2S && tempSwingHigh_D2S.price >= activeDof_D2S.priceBottom) ||
                            (activeEob_D2S && tempSwingHigh_D2S.price >= activeEob_D2S.priceBottom) ||
                            (activeEof_D2S && tempSwingHigh_D2S.price >= activeEof_D2S.priceBottom)) {
                            isTapped = true;
                        }
                        
                        if (isTapped) {
                            signals.push({ type: "BOS(C)", trend: "BEARISH", price: validLL_D2S.price, startTime: validLL_D2S.time, endTime: curr.timestamp });
                            if (refX_D2S) {
                                signals.push({ type: "X(C)", sweptSide: "LOW", trend: "BEARISH", price: validLL_D2S.price, startTime: validLL_D2S.time, endTime: refX_D2S.time });
                            }
                        } else {
                            // 🧹 बिना टैप किये ब्रेक किया: चार्ट से पुराने सारे D2S ज़ोन मिटा दो!
                            signals = signals.filter(s => 
                                s !== activeDob_D2S && s !== activeDof_D2S && 
                                s !== activeEob_D2S && s !== activeEof_D2S
                            );
                            signals.push({ type: "BOS(C)", trend: "BEARISH", price: validLL_D2S.price, startTime: validLL_D2S.time, endTime: curr.timestamp });
                        }
                        
                        // 🔥 D2S का ट्रेंड चालू रहेगा! अगले पुलबैक के लिए रीसेट करो
                        idm_D2S_Taken = false;
                        refLL_D2S = { price: curr.low, time: curr.timestamp };
                        validLL_D2S = null; tempSwingHigh_D2S = null; 
                        activeDob_D2S = null; activeDof_D2S = null; 
                        activeEob_D2S = null; activeEof_D2S = null; 
                        refX_D2S = null;
                        
                    } else { 
                        // 🧹 Sweep हुआ (X-C)
                        refX_D2S = { price: curr.low, time: curr.timestamp };
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
    // 🔥 THE FIX: IDM वाली कैंडल (startIndex) के ठीक बाद वाली कैंडल (+1) से स्कैन शुरू करेंगे
    for (let j = startIndex + 1; j < candles.length; j++) { 
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

            // 🔥 THE FIX: अगर यह हमारा फेक 'ROOT' पुलबैक है, तो इसका विशालकाय E-OF ड्रा मत करो!
            if (pb.id !== "ROOT_SWING_HL") {
                smcZones.eof = { type: "E-OF", top: pb.confirmHH, bottom: pb.validHL, startTime: pb.startTime, isMitigated: mitigatedOF, data: pb };
            }

            smcZones.eob = {
                type: "E-OB", top: obResult.price.high, bottom: obResult.price.low,
                startTime: obResult.startTime, fvgTop: obResult.fvgZone.top, fvgBottom: obResult.fvgZone.bottom
            };
            break;
        }
    }

    // ==============================================================
    // 🔥 2. DECISIONAL ZONES (D-OF / D-OB)
    // ==============================================================
    for (let i = pullbacksArray.length - 1; i >= 0; i--) {
        const pb = pullbacksArray[i];
        if (smcZones.eof && smcZones.eof.data.id === pb.id) break;

        const obResult = findValidOrderBlock(pb, candles, currentIndex);

        if (obResult.found) {
            if (smcZones.eob && smcZones.eob.startTime === obResult.startTime) continue;

            const mitigatedOF = isOfMitigated(pb, candles, currentIndex);

            // 🔥 THE FIX: अगर यह फेक 'ROOT' पुलबैक है, तो इसका विशालकाय D-OF ड्रा मत करो!
            if (pb.id !== "ROOT_SWING_HL") {
                smcZones.dof = { type: "D-OF", top: pb.confirmHH, bottom: pb.validHL, startTime: pb.startTime, isMitigated: mitigatedOF, data: pb };
            }

            smcZones.dob = {
                type: "D-OB", top: obResult.price.high, bottom: obResult.price.low,
                startTime: obResult.startTime, fvgTop: obResult.fvgZone.top, fvgBottom: obResult.fvgZone.bottom, data: pb
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
    for (let i = 0; i < pullbacksArray.length; i++) {
        const pb = pullbacksArray[i];
        const obResult = findBearishValidOrderBlock(pb, candles, currentIndex);

        if (obResult.found) {
            const mitigatedOF = isOfMitigated_Bearish(pb, candles, currentIndex);

            // 🔥 THE FIX: 'ROOT_SWING_LH' के लिए OF ड्रा नहीं होगा
            if (pb.id !== "ROOT_SWING_LH") {
                smcZones.eof = { type: "E-OF", top: pb.validLH, bottom: pb.confirmLL, startTime: pb.startTime, isMitigated: mitigatedOF, data: pb };
            }

            smcZones.eob = {
                type: "E-OB", top: obResult.price.top, bottom: obResult.price.bottom,
                startTime: obResult.startTime, fvgTop: obResult.fvgZone.top, fvgBottom: obResult.fvgZone.bottom
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
            if (smcZones.eob && smcZones.eob.startTime === obResult.startTime) continue;

            const mitigatedOF = isOfMitigated_Bearish(pb, candles, currentIndex);

            // 🔥 THE FIX: 'ROOT_SWING_LH' के लिए OF ड्रा नहीं होगा
            if (pb.id !== "ROOT_SWING_LH") {
                smcZones.dof = { type: "D-OF", top: pb.validLH, bottom: pb.confirmLL, startTime: pb.startTime, isMitigated: mitigatedOF, data: pb };
            }

            smcZones.dob = {
                type: "D-OB", top: obResult.price.top, bottom: obResult.price.bottom,
                startTime: obResult.startTime, fvgTop: obResult.fvgZone.top, fvgBottom: obResult.fvgZone.bottom, data: pb
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
// 🎯 UPDATE 2: checkPriceActionSignal का पैरामीटर
const checkPriceActionSignal = (htfCandles, ltfCandles, setupType, startingTrend = "AUTO", counterStructureDepth = 0, structureMode = "MECHANICAL") => { // 🔥 NAYA PARAMETER
    let signal = { long: false, short: false, reason: "" };

    if (!htfCandles || htfCandles.length < 15 || !ltfCandles || ltfCandles.length === 0) {
        return signal;
    }

    // यहाँ counterStructureDepth पास कर रहे हैं
    const htfSignals = identifyMechanicalStructure(htfCandles, startingTrend, counterStructureDepth, structureMode); // 🔥 यहाँ पास कर दें
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

