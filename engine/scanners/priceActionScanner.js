
// const { 
//     findSMCZones, 
//     findSMCZones_Bearish, 
//     findMitigationTime, 
//     findMitigationTime_Bearish 
// } = require('./SetupFinder');


// // =========================================================================
// // 🧠 SMART RETRO-SCANNER (Visual Zig-Zag Logic by Chanchal Bhai)
// // =========================================================================
// const scanRetroactivePullbacks = (startIndex, endIndex, candles, trendType) => {
//     let validPullbacks = [];
//     let inPullback = false;
//     let tempExtreme = null;
//     let targetBreakLevel = null;
    
//     // 🔥 THE FIX: OB स्कैनर के लिए कैंडल इंडेक्स ट्रैक करने वाले वेरिएबल्स
//     let breakCandleIdx = -1; 
//     let tempExtremeIdx = -1;

//     if (trendType === "BEARISH") {
//         for (let j = startIndex + 1; j <= endIndex; j++) {
//             let curr = candles[j];
//             let prev = candles[j - 1];
//             let isOutsideBar = curr.high > prev.high && curr.low < prev.low;
//             let brokeHigh = curr.high > prev.high;

//             if (!inPullback && brokeHigh && !isOutsideBar) {
//                 inPullback = true;
//                 targetBreakLevel = prev.low;
//                 breakCandleIdx = j - 1; // 🎯 जिस कैंडल का लो ब्रेक होने वाला है
//                 tempExtreme = { price: curr.high, time: curr.timestamp };
//                 tempExtremeIdx = j; // 🎯 टॉप कैंडल का इंडेक्स
//             }
//             else if (inPullback) {
//                 if (curr.high > tempExtreme.price) {
//                     tempExtreme = { price: curr.high, time: curr.timestamp };
//                     tempExtremeIdx = j;
//                 }
//                 if (curr.low < targetBreakLevel) {
//                     // 🔥 THE FIX: FVG ढूँढने के लिए स्कैनर को पूरा डेटा (इंडेक्स) दें
//                     validPullbacks.push({
//                         id: validPullbacks.length + 1,
//                         price: tempExtreme.price,
//                         time: tempExtreme.time,
//                         startTime: tempExtreme.time,
//                         validLH: tempExtreme.price, 
//                         validLHCandleIndex: tempExtremeIdx, // D-OB के लिए शुरूआती कैंडल
//                         confirmLL: targetBreakLevel,
//                         confirmLLCandleIndex: breakCandleIdx,
//                         breakCandleIndex: j // D-OB के लिए आखिरी कैंडल (FVG लिमिट)
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
//                 breakCandleIdx = j - 1; // 🎯 जिस कैंडल का हाई ब्रेक होने वाला है
//                 tempExtreme = { price: curr.low, time: curr.timestamp };
//                 tempExtremeIdx = j; // 🎯 बॉटम कैंडल का इंडेक्स
//             }
//             else if (inPullback) {
//                 if (curr.low < tempExtreme.price) {
//                     tempExtreme = { price: curr.low, time: curr.timestamp };
//                     tempExtremeIdx = j;
//                 }
//                 if (curr.high > targetBreakLevel) {
//                     // 🔥 THE FIX: FVG ढूँढने के लिए स्कैनर को पूरा डेटा (इंडेक्स) दें
//                     validPullbacks.push({
//                         id: validPullbacks.length + 1,
//                         price: tempExtreme.price,
//                         time: tempExtreme.time,
//                         startTime: tempExtreme.time,
//                         validHL: tempExtreme.price,
//                         validHLCandleIndex: tempExtremeIdx, // D-OB के लिए शुरूआती कैंडल
//                         confirmHH: targetBreakLevel,
//                         confirmHHCandleIndex: breakCandleIdx,
//                         breakCandleIndex: j // D-OB के लिए आखिरी कैंडल (FVG लिमिट)
//                     });
//                     inPullback = false;
//                 }
//             }
//         }
//     }
//     return validPullbacks; // 🔥 पूरा लिस्ट रिटर्न करेगा
// };


// const identifyMechanicalStructure = (candles, startingTrend = "AUTO", counterStructureDepth = 0, structureMode = "MECHANICAL", strictDecisional = false, strictCounter = true, majorOnly = false, showD2S_DOB = true, showD2S_DOF = true, showD2S_EOB = true, showD2S_EOF = true) => {
//     // =========================================================================
//     // 👑 DISCOUNTED (MAJOR) STRUCTURE VARIABLES (THE PARENT NODE)
//     // =========================================================================
//     // 📉 Bearish Discounted State
//     let swingHH_Dis_Bearish = null; 
//     let swingLL_Dis_Bearish = null;
//     let refSwingLL_Dis_Bearish = null; // Ref Swing LL (Bottom)
//     let refSwingHH_Dis_Bearish = null; // Ref IDM (Top Pullback)
//     let isIdmTaken_Dis_Bearish = false;
//     let is50PercentTapped_Bearish = false; 
    
//     // 📈 Bullish Discounted State
//     let swingHL_Dis_Bullish = null; 
//     let swingHH_Dis_Bullish = null;
//     let refSwingHH_Dis_Bullish = null; // Ref Swing HH (Top)
//     let refSwingHL_Dis_Bullish = null; // Ref IDM (Bottom Pullback)
//     let isIdmTaken_Dis_Bullish = false;
//     let is50PercentTapped_Bullish = false; 
//     // =========================================================================

//     let isIdmTransferred = false;
//     let idmT_Level = null; // IDM-T का प्राइस लेवल

//     // 🔥 THE FIX: Trend बदलने पर पुराने कचरे को साफ़ करने का टूल
//     const resetDiscountedTrackers = () => {
//         is50PercentTapped_Bearish = false; isIdmTaken_Dis_Bearish = false;
//         refSwingLL_Dis_Bearish = null; refSwingHH_Dis_Bearish = null;
//         is50PercentTapped_Bullish = false; isIdmTaken_Dis_Bullish = false;
//         refSwingHL_Dis_Bullish = null; refSwingHH_Dis_Bullish = null;
//         isIdmTransferred = false; // 🔥 IDM-T State Reset
//     };


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



//     // 🔥 यह फंक्शन चेक करेगा कि सिग्नल को पुश करना है या नहीं
//     const shouldAddSignal = (sig) => {
//         const isDiscountedSignal = ["BOS(Dis)", "CHoCH(Dis)", "IDM(Dis)"].includes(sig.displayName);
//         if (structureMode !== "DISCOUNTED" && isDiscountedSignal) {
//             return false; // ❌ Discounted signal है और मोड Technical है, तो मत लो
//         }
//         return true; // ✅ बाकी सब आने दो
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

//         let newBOS_Detected = false;

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

//             // 🔥 1. INITIALIZE ANCHOR (यही वह जगह है जहाँ दादाजी सेट होंगे)
//             if (refSwingHH_Dis_Bearish === null && absoluteHighest) {
//                 refSwingHH_Dis_Bearish = { ...absoluteHighest };
//             }

//             // 🔥 2. DEBUG & TAPPING LOGIC
//             if (structureMode === "DISCOUNTED") {
//                 let currentTop = refSwingHH_Dis_Bearish ? refSwingHH_Dis_Bearish : lockedSwingHigh;
//                 if (isIdmTaken && validLL && currentTop) {
//                     let eqLevel_Bearish = calculateEquilibrium(currentTop.price, validLL.price);
                    
//                     // ✅ THE FIX: बेयरिश में 50% (Premium) टैप करने के लिए कैंडल का High ऊपर जाना चाहिए!
//                     if (curr.high >= eqLevel_Bearish) is50PercentTapped_Bearish = true;
//                 }
                
//                 // रनअवे ट्रेंड शिफ्टिंग लॉजिक (Condition 2B)
//                 if (newBOS_Detected && !is50PercentTapped_Bearish) {
//                     refSwingHH_Dis_Bearish = { ...tempSwingHigh }; // एंकर शिफ्ट!
//                 }
//             }

//             // 🔥 SMART AUTO FIX & 1st E-OB FAILURE LOGIC: 
//             if (lockedSwingHigh === null && curr.close > prevAbsoluteHighest) {
                
//                 signals.push({
//                     type: "CHoCH", trend: "BULLISH",
//                     sweptSide: "HIGH",
//                     price: prevAbsoluteHighest, 
//                     startTime: absoluteHighest.time,
//                     endTime: curr.timestamp,
//                     // 🔥 THE FIX: Yahan bhi displayName add kiya
//                     displayName: (structureMode === "DISCOUNTED") ? "CHoCH(Dis)" : "CHoCH",
//                     isHistorical: false
//                 });

//                 trend = 1;
//                 isIdmTaken = false;
//                 wipeCounterStructure();
//                 resetDiscountedTrackers();
                
//                 // 🔥 THE MISSING ANCHOR FIX: बुलिश के लिए नया बॉटम लॉक करो!
//                 lockedSwingLow = { ...absoluteLowest }; 
//                 lockedSwingHigh = null;

//                 validLL = null; refLL = null; tempSwingHigh = null; confirmedLH = null;

//                 bearishPullbacks = []; 
//                 tempPullbackTracker_Bearish = null; 

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

//                         // 🔥 THE PERFECT GAP-AWARE VALIDATOR (NO INTERNAL NOISE) 🔥
//                         let isGapBreak_Bearish = (candles[i-1] && candles[i-1].close <= breakLevel && curr.open > breakLevel);
                        
//                         let isTrap = false;
                        
//                         // 🌟 THE STRICT RULE: अगर IDM नहीं लिया है, तो यह 100% Trap (IDM-T) है!
//                         if (!isIdmTaken) {
//                             isTrap = true; 
                            
//                             // सिर्फ गैप-अप (Gap Up) के केस में भविष्य चेक करो
//                             if (isGapBreak_Bearish) {
//                                 let futurePBs = scanRetroactivePullbacks(i, Math.min(i + 150, candles.length - 1), candles, "BULLISH");
//                                 if (futurePBs.length > 0) isTrap = false; // Valid Gap CHoCH
//                             }
//                         }

//                         // =======================================================
//                         // 🧠 FAKE CHoCH TRAP (IDM-T TRANSFER LOGIC)
//                         // =======================================================
//                         if (isTrap) {
//                             isIdmTaken = true;
//                             isIdmTransferred = true; // 🛑 IDM-T State Active

//                             if (structureMode === "DISCOUNTED") {
//                                 isIdmTaken_Dis_Bearish = false; // 50% का इंतज़ार करो
//                             }
                            
//                             let bosDisRemoved = false, lhDisRemoved = false, llDisRemoved = false, eobDemoted = false;
//                             for (let k = signals.length - 1; k >= 0; k--) {
//                                 let sig = signals[k];
//                                 if (!bosDisRemoved && sig.type === "BOS" && sig.trend === "BEARISH" && sig.displayName === "BOS(Dis)") {
//                                     signals.splice(k, 1); bosDisRemoved = true; continue; 
//                                 }
//                                 if (!llDisRemoved && sig.type === "ANCHOR" && sig.displayName === "LL(Dis)") {
//                                     signals.splice(k, 1); llDisRemoved = true; continue;
//                                 }
//                                 if (!lhDisRemoved && sig.type === "ANCHOR" && sig.displayName === "LH(Dis)") {
//                                     signals.splice(k, 1); lhDisRemoved = true; continue;
//                                 }
//                                 if (!eobDemoted && sig.type === "E-OB" && sig.trend === "BEARISH") {
//                                     sig.type = "D-OB"; sig.displayName = "Supply Zone(D-OB)"; eobDemoted = true;
//                                 }
//                                 if (bosDisRemoved && llDisRemoved && lhDisRemoved && eobDemoted) break;
//                             }
                            
//                             // 🔥 THE GHOST BUG FIX: हमेशा "IDM-T" भेजो ताकि Frontend उसे दिखा सके!
//                             let pushLabel = "IDM-T"; 
                            
//                             // 🔥 CHANCHAL BHAI'S ADVANCED IDM-T SHIFTING LOGIC (Condition 1 & 2) 🔥
//                             let idmT_Price = breakLevel; // Default: Condition 1 (जहाँ Swing LH टूटा)
                            
//                             // Condition 2: अगर Engulfing है तो Shift कर दो
//                             if (typeof isEngulfingBreakout !== 'undefined' && isEngulfingBreakout) {
//                                 idmT_Price = candles[i-1].high; // Shift to previous High
//                             }

//                             let waveStartBearish = lockedSwingHigh.time;
//                             for (let s = signals.length - 1; s >= 0; s--) {
//                                 if (signals[s].startTime < waveStartBearish) break;
//                                 if (signals[s].trend === "BEARISH" && (signals[s].type.includes("IDM") || signals[s].type === "McM(X)")) {
//                                     signals[s].isHistorical = true;
//                                 }
//                             }

//                             // 🎯 IDM-T Draw (Dynamic Price के साथ)
//                             signals.push({ 
//                                 type: pushLabel, trend: "BEARISH", 
//                                 price: idmT_Price, // 🔥 Yahan dynamic price lag gaya
//                                 startTime: lockedSwingHigh.time, endTime: curr.timestamp,
//                                 displayName: pushLabel 
//                             });

//                             // 🔥 IDM-T बनते ही LL(Dis)-Ref ड्रा करें!
//                             if (structureMode === "DISCOUNTED") {
//                                 signals.push({
//                                     type: "ANCHOR", displayName: "LL(Dis)-Ref", trend: "BEARISH",
//                                     price: absoluteLowest.price, startTime: absoluteLowest.time, endTime: absoluteLowest.time,
//                                     position: "belowBar"
//                                 });
//                             }
                            
//                             validLL = { ...absoluteLowest };
//                             tempSwingHigh = { price: curr.high, time: curr.timestamp };
//                             majorIdm_Bearish = { price: curr.high, time: curr.timestamp };
//                             lockedSwingHigh = prevLockedSwingHigh ? { ...prevLockedSwingHigh } : null;
//                             if (structureMode === "DISCOUNTED") {
//                                 refSwingHH_Dis_Bearish = prevLockedSwingHigh ? { ...prevLockedSwingHigh } : null;
//                             }
//                             refX_CHoCH_Bearish = null; 
//                             continue; // 🛑 लूप घुमाओ, CHoCH मत छापो!
//                         }

//                         // =======================================================
//                         // ✅ NORMAL CHoCH LOGIC (TRUE TREND SHIFT)
//                         // =======================================================
//                         let isMajorCHoCH = (structureMode === "DISCOUNTED") ? isIdmTaken_Dis_Bearish : true;
//                         let isTrueMajorCHoCH = true;
//                         if (structureMode === "DISCOUNTED") {
//                             isTrueMajorCHoCH = (!refSwingHH_Dis_Bearish || lockedSwingHigh.time === refSwingHH_Dis_Bearish.time);
//                         }
                        
//                         if (structureMode === "DISCOUNTED") {
//                             let elementsToRemove = new Set();
//                             for (let k = signals.length - 1; k >= 0; k--) {
//                                 let sig = signals[k];
                                
//                                 // 🔥 THE BOUNDARY FIX: जहाँ से ये वेव शुरू हुई थी (lockedSwingHigh), वहाँ पहुँचते ही सफाई रोक दो!
//                                 if (sig.startTime <= lockedSwingHigh.time) break;
//                                 if (sig.displayName === "BOS(Dis)" || sig.displayName === "CHoCH(Dis)") break;
                                
//                                 if (sig.trend === "BEARISH") {
//                                     if (sig.type === "ANCHOR" && (sig.displayName === "LH(Dis)" || sig.displayName === "LL(Dis)" || sig.displayName === "LH(Dis)-Ref" || sig.displayName === "LL(Dis)-Ref")) elementsToRemove.add(k);
//                                     if (sig.type === "E-OB") { sig.type = "D-OB"; sig.displayName = "Supply Zone(D-OB)"; }
//                                 }
//                             }
//                             signals = signals.filter((_, idx) => !elementsToRemove.has(idx));

//                             // 🔥 CHANCHAL BHAI'S TROUGH FIX: बेयरिश वेव के सबसे बॉटम पॉइंट को HL(Dis) में बदल दो!
//                             if (isTrueMajorCHoCH) {
//                                 signals.push({
//                                     type: "ANCHOR", displayName: "HL(Dis)", trend: "BULLISH",
//                                     price: absoluteLowest.price, startTime: absoluteLowest.time, endTime: absoluteLowest.time,
//                                     position: "belowBar"
//                                 });
//                             }
//                         }

//                         if (structureMode === "TECHNICAL" || structureMode === "DISCOUNTED") {
//                             signals.forEach(sig => {
//                                 let sigStart = sig.startTime || sig.time;
//                                 let sigEnd = sig.endTime || sig.time;
//                                 if (sigStart >= lockedSwingHigh.time && sigEnd <= curr.timestamp) {
//                                     if (sig.type !== "BOS" && sig.type !== "CHoCH") sig.isHistorical = true;
//                                     if (["E-OB", "D-OB", "E-OF", "D-OF"].includes(sig.type)) sig.isActive = false;
//                                 }
//                             });
//                         }

//                         signals.push({
//                             type: "CHoCH", trend: "BULLISH", sweptSide: "HIGH",
//                             price: breakLevel, startTime: lockedSwingHigh.time, endTime: curr.timestamp,
//                             displayName: (structureMode === "DISCOUNTED") ? (isTrueMajorCHoCH ? "CHoCH(Dis)" : "") : "CHoCH",
//                             isHistorical: !isTrueMajorCHoCH,
//                             isHidden: (structureMode === "DISCOUNTED" && !isTrueMajorCHoCH) 
//                         });

//                         // 3. बाकि सारा Logic वही रहेगा (Trend Shift Setup)
//                         trend = 1; // 🎯 बेयरिश से बुलिश हो गया
//                         isIdmTaken = false;
//                         wipeCounterStructure();
//                         resetDiscountedTrackers();
                        
//                         // बुलिश के लिए नया बॉटम लॉक करो और बेयरिश वेरिएबल्स साफ करो
//                         lockedSwingLow = { ...absoluteLowest };
//                         lockedSwingHigh = null; 
                        
//                         validLL = null; refLL = null; tempSwingHigh = null; 
//                         refX_CHoCH_Bearish = null; refX_BOS_Bearish = null;
//                         bearishPullbacks = []; tempPullbackTracker_Bearish = null;
                        
//                         // बुलिश ट्रैकर इनिशियलाइज़ करो
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
//             }else if (refLL !== null) {
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
//             if (confirmedLH !== null && curr.high >= confirmedLH.price && !isIdmTaken) {
                
//                 // 🔥 THE SINGLE CANDLE ENGULFING (IDM + BOS) FIX 🔥
//                 let expectedBreakLevel = refX_BOS_Bearish ? refX_BOS_Bearish.price : absoluteLowest.price;
                
//                 // 🔥 THE SCOPE FIX: poiZones को एकदम ऊपर डिक्लेयर करो!
//                 let poiZones = { eof: null, eob: null, dof: null, dob: null };

//                 // अगर एक ही कैंडल ऊपर IDM (LH) ले रही है और नीचे LL भी तोड़ रही है!
//                 if (curr.low <= expectedBreakLevel) {
//                     // ❌ फेक कैंडल: इसे स्किप कर दो
//                     confirmedLH = null;
//                     bearishPullbacks = [];
//                     tempPullbackTracker_Bearish = null;
//                 } 
//                 else {
//                     // ✅ नार्मल कैंडल है
//                     isIdmTaken = true;
//                     validLL = { ...absoluteLowest };
//                     tempSwingHigh = { price: curr.high, time: curr.timestamp };
//                     majorIdm_Bearish = { price: curr.high, time: curr.timestamp };

//                     // ==========================================================
//                     // 🔥 THE McM(X) & IDM-OF LOGIC FOR BEARISH (THE TRUE SWEEP FIX)
//                     // ==========================================================
//                     let idmLabel = "IDM"; // 🎯 FIX: 'IDM(Dis)' हटाकर इसे हमेशा शुद्ध "IDM" रखें
//                     const targetPb = bearishPullbacks.find(pb => pb.validLH === confirmedLH.price);

//                     if (targetPb) {
//                         // 🛡️ THE REAL SWEEP VERIFIER FOR BEARISH
//                         let trueSweep = true;
//                         for (let k = targetPb.breakCandleIndex; k <= i; k++) {
//                             if (candles[k].close < targetPb.confirmLL) {
//                                 trueSweep = false; 
//                                 break;
//                             }
//                         }

//                         if (trueSweep) {
//                             idmLabel = "IDM/ch"; 
//                         }
//                     }

//                     // 🌟 NAYA CODE: IDM TRANSFER FADE FIX (पुराने IDMs को धुंधला करें) 🌟
//                     let waveStartBearish = lockedSwingHigh ? lockedSwingHigh.time : absoluteHighest.time;
//                     for (let s = signals.length - 1; s >= 0; s--) {
//                         if (signals[s].startTime < waveStartBearish) break; // पुरानी वेव में मत जाओ
//                         if (signals[s].trend === "BEARISH" && (signals[s].type.includes("IDM") || signals[s].type === "McM(X)")) {
//                             signals[s].isHistorical = true;
//                         }
//                     }

//                     // IDM या IDM/ch की लाइन ड्रा करें
//                     signals.push({ 
//                         type: idmLabel, 
//                         trend: "BEARISH", 
//                         price: confirmedLH.price, 
//                         startTime: confirmedLH.time, 
//                         endTime: curr.timestamp,
//                         displayName: idmLabel 
//                     });

//                     // 🔥 1. THE ROOT EXTREME FIX
//                     const rootTime = lockedSwingHigh ? lockedSwingHigh.time : absoluteHighest.time;
//                     const rootPrice = lockedSwingHigh ? lockedSwingHigh.price : absoluteHighest.price;

//                     const swingLHIndex = candles.findIndex(c => c.timestamp === rootTime);

//                     // 🛡️ THE NULL GUARD: अगर validLL मौजूद है, तभी अंदर का काम करो
//                     if (validLL !== null) {
//                         const refLLIndex = candles.findIndex(c => c.timestamp === validLL.time);

//                         // 🎯 THE E-OF SIZE FIX: स्कैनर से पहला पुलबैक निकालो
//                         let rootConfirmLL = validLL.price;
//                         let wavePullbacks = scanRetroactivePullbacks(swingLHIndex, refLLIndex, candles, "BEARISH");
//                         if (wavePullbacks.length > 0) {
//                             rootConfirmLL = wavePullbacks[0].confirmLL; // पहला पुलबैक का Low
//                         }

//                         const rootExtreme = {
//                             id: "ROOT_SWING_LH",
//                             validLH: rootPrice,
//                             validLHCandleIndex: swingLHIndex,
//                             confirmLL: rootConfirmLL, // <--- परफेक्ट साइज़
//                             confirmLLCandleIndex: refLLIndex,
//                             breakCandleIndex: refLLIndex,
//                             startTime: rootTime
//                         };

//                         const validPullbacksForSMC = bearishPullbacks.filter(pb => pb.validLH !== confirmedLH.price);

//                         if (swingLHIndex !== -1 && refLLIndex !== -1) {
//                             validPullbacksForSMC.unshift(rootExtreme);
//                         }

//                         // यहाँ 'const' नहीं लगेगा क्योंकि हमने इसे बाहर 'let' से बनाया है
//                         poiZones = findSMCZones_Bearish(candles, validPullbacksForSMC, i);
//                     }

//                     // 🔥 2. THE MASTER STATE MANAGEMENT
//                     signals.forEach(sig => {
//                         if (["E-OB", "D-OB", "E-OF", "D-OF"].includes(sig.type)) {

//                             // 🔥 VIP PASS: Counter-Structure (S2D/D2S) ज़ोन्स को मेन इंजन के क्लिनअप से आज़ाद करो!
//                             if (sig.displayName && (sig.displayName.includes("S2D") || sig.displayName.includes("D2S"))) return;

//                             // अगर पहले से Demand/Supply नाम नहीं हुआ है, तभी चेक करो
//                             if (!sig.displayName || (!sig.displayName.includes("Demand") && !sig.displayName.includes("Supply"))) {
//                                 sig.isActive = false; // पुराने ज़ोन डीएक्टिवेट करें

//                                 let isMitigated = false;
//                                 let startIdx = candles.findIndex(c => c.timestamp === sig.startTime);

//                                 if (startIdx !== -1) {
//                                     for (let j = startIdx + 3; j <= i; j++) {
//                                         // बुलिश ज़ोन के लिए चेकिंग
//                                         if (sig.trend === "BULLISH" && candles[j].low <= sig.priceTop) {
//                                             isMitigated = true;
//                                             break;
//                                         }
//                                         // बेयरिश ज़ोन के लिए चेकिंग
//                                         if (sig.trend === "BEARISH" && candles[j].high >= sig.priceBottom) {
//                                             isMitigated = true;
//                                             break;
//                                         }
//                                     }
//                                 }

//                                 // 🎯 सिर्फ अनमिटिगेटेड ज़ोन्स का नाम उनके ट्रेंड के हिसाब से बदलें
//                                 if (!isMitigated) {
//                                     if (sig.trend === "BULLISH") {
//                                         if (sig.type === "E-OB" || sig.type === "D-OB") sig.displayName = "Demand Zone(OB)";
//                                         if (sig.type === "E-OF" || sig.type === "D-OF") sig.displayName = "Demand Zone(OF)";
//                                     } else if (sig.trend === "BEARISH") {
//                                         if (sig.type === "E-OB" || sig.type === "D-OB") sig.displayName = "Supply Zone(OB)";
//                                         if (sig.type === "E-OF" || sig.type === "D-OF") sig.displayName = "Supply Zone(OF)";
//                                     }
//                                 }
//                             }
//                         }
//                     });

//                     // 🔥 3. THE VISUAL FIX & DISCOUNT POI FILTER
//                     let eqFilter_Bearish = null;
//                     let strictEqFilter_Bearish = null; // 🛡️ NEW: True Anchor for Strict Mode
                    
//                     if (structureMode === "DISCOUNTED") {
//                         // Shifted Anchor (Normal E-OB के लिए)
//                         let currentTopForFilter = refSwingHH_Dis_Bearish ? refSwingHH_Dis_Bearish : lockedSwingHigh;
//                         eqFilter_Bearish = calculateEquilibrium(
//                             currentTopForFilter ? currentTopForFilter.price : absoluteHighest.price, 
//                             validLL.price
//                         );
                        
//                         // True Origin Anchor (Strict D-OB के लिए)
//                         strictEqFilter_Bearish = calculateEquilibrium(
//                             lockedSwingHigh ? lockedSwingHigh.price : absoluteHighest.price, 
//                             validLL.price
//                         );
//                     }
//                     const isValidPremium = (bottomPrice) => structureMode !== "DISCOUNTED" || !eqFilter_Bearish || bottomPrice >= eqFilter_Bearish;
                    
//                     const isStrictPremium = (bottomPrice) => structureMode !== "DISCOUNTED" || !strictEqFilter_Bearish || bottomPrice >= strictEqFilter_Bearish;

//                     if (poiZones.eof && !poiZones.eof.isMitigated && isValidPremium(poiZones.eof.bottom)) {
//                         let mitTimeEOF = findMitigationTime_Bearish(poiZones.eof.bottom, i, candles);
//                         signals.push({ type: "E-OF", displayName: "E-OF", trend: "BEARISH", priceTop: poiZones.eof.top, priceBottom: poiZones.eof.bottom, startTime: poiZones.eof.startTime, endTime: mitTimeEOF, isActive: true });
//                     }
//                     if (poiZones.eob && isValidPremium(poiZones.eob.bottom)) {
//                         let mitTimeEOB = findMitigationTime_Bearish(poiZones.eob.bottom, i, candles);
//                         signals.push({ type: "E-OB", displayName: "E-OB", trend: "BEARISH", priceTop: poiZones.eob.top, priceBottom: poiZones.eob.bottom, startTime: poiZones.eob.startTime, fvgTop: poiZones.eob.fvgTop, fvgBottom: poiZones.eob.fvgBottom, endTime: mitTimeEOB, isActive: true });
//                     }

//                     // 🔥 THE FIX: D-OB अब असली 50% (Origin) से ही नापा जाएगा!
//                     if (poiZones.dof && !poiZones.dof.isMitigated && (!strictDecisional || isStrictPremium(poiZones.dof.bottom))) {
//                         let mitTimeDOF = findMitigationTime_Bearish(poiZones.dof.bottom, i, candles);
//                         signals.push({ type: "D-OF", displayName: "D-OF", trend: "BEARISH", priceTop: poiZones.dof.top, priceBottom: poiZones.dof.bottom, startTime: poiZones.dof.startTime, endTime: mitTimeDOF, isActive: true });
//                     }
//                     if (poiZones.dob && (!strictDecisional || isStrictPremium(poiZones.dob.bottom))) {
//                         let mitTimeDOB = findMitigationTime_Bearish(poiZones.dob.bottom, i, candles);
//                         signals.push({ type: "D-OB", displayName: "D-OB", trend: "BEARISH", priceTop: poiZones.dob.top, priceBottom: poiZones.dob.bottom, startTime: poiZones.dob.startTime, fvgTop: poiZones.dob.fvgTop, fvgBottom: poiZones.dob.fvgBottom, endTime: mitTimeDOB, isActive: true });
//                     }

//                     bearishPullbacks = [];
//                     tempPullbackTracker_Bearish = null;
//                     confirmedLH = null;
//                 } // <--- 🔥 Else ब्लॉक यहाँ एकदम परफेक्टली बंद हुआ
//             }

//             // 🎯 New High before BOS (Unlock Tracker)
//             if (isIdmTaken && curr.high > tempSwingHigh.price) {
//                 tempSwingHigh = { price: curr.high, time: curr.timestamp };
//                 bearishPullbacks = []; // 🎯 Added
//                 refLL = null;
//                 tempPullbackTracker_Bearish = null; // 🎯 Added
//             }

//             // =========================================================================
//             // 🔥 DISCOUNTED MODE: IDM(Dis) & 50% TRACKER (BEARISH)
//             // =========================================================================
//             if (structureMode === "DISCOUNTED") {
//                 let currentTop = refSwingHH_Dis_Bearish ? refSwingHH_Dis_Bearish : lockedSwingHigh;
                
//                 if (isIdmTaken && validLL && currentTop) {
//                     let eqLevel_Bearish = calculateEquilibrium(currentTop.price, validLL.price);
                    
//                     // ✅ THE FIX: जब 50% टैप हो तो पुराने IDM को IDM(Dis) में बदल दें!
//                     if (curr.high >= eqLevel_Bearish && !isIdmTaken_Dis_Bearish) {
//                         is50PercentTapped_Bearish = true;
//                         isIdmTaken_Dis_Bearish = true; // 🔥 बेयरिश IDM(Dis) वैलिड!

//                         // 🎯 1. एरे में पीछे जाओ और सबसे ताज़ा 'IDM' को ढूंढकर उसका नाम बदल दो
//                         for (let s = signals.length - 1; s >= 0; s--) {
//                             if ((signals[s].type === "IDM" || signals[s].type === "IDM/ch" || signals[s].type === "IDM-T") && signals[s].trend === "BEARISH") {
//                                 signals[s].displayName = (signals[s].type === "IDM/ch") ? "IDM/ch(Dis)" : "IDM(Dis)";
//                                 signals[s].type = "IDM(Dis)"; // 🔥 Type अपडेट करना ज़रूरी है ताकि BOS को IDM मिल सके!
//                                 break; // एक बार मिल गया तो लूप रोक दो
//                             }
//                         }

//                         // 🎯 2. VISUAL ANCHORS: Swing LH और LL के मार्कर ड्रा करो
//                         signals.push({ 
//                             type: "ANCHOR", displayName: "LH(Dis)-Ref", trend: "BEARISH", // 🔥 नाम बदल दिया
//                             price: currentTop.price, startTime: currentTop.time, endTime: currentTop.time,
//                             position: "aboveBar" 
//                         });
                        
//                         signals.push({ 
//                             type: "ANCHOR", displayName: "LL(Dis)", trend: "BEARISH", 
//                             price: validLL.price, startTime: validLL.time, endTime: validLL.time,
//                             position: "belowBar" // कैंडल के नीचे दिखेगा
//                         });
//                     }
//                 }
                
//                 // 🏃‍♂️ रनअवे लॉजिक (Shifting Logic) - इसे बिल्कुल मत हटाना!
//                 if (newBOS_Detected && !is50PercentTapped_Bearish) {
//                     refSwingHH_Dis_Bearish = { ...tempSwingHigh }; // एंकर शिफ्ट!
//                 }
//             }
//             // ========================================================================

//             // RULE 3 & 6a: BOS & Sweep Logic (BEARISH)
//             if (isIdmTaken && validLL !== null) {
//                 let breakLevel = refX_BOS_Bearish ? refX_BOS_Bearish.price : validLL.price;

//                 if (curr.low < breakLevel) {
//                     if (curr.close < breakLevel) { // 🚀 Full Body Break

//                         let newBOS_Detected = true; // इंजन को पता चले कि BOS हुआ है

//                         // 🔥 DISCOUNTED MODE GATEKEEPER
//                         let canPushBOS = (structureMode === "DISCOUNTED") ? (isIdmTaken_Dis_Bearish === true) : true;
                        
//                         signals.push({
//                             type: "BOS", 
//                             trend: "BEARISH",
//                             price: validLL.price,
//                             startTime: validLL.time,
//                             endTime: curr.timestamp,
//                             displayName: (structureMode === "DISCOUNTED") ? (canPushBOS ? "BOS(Dis)" : "BOS") : "BOS", 
//                             isHistorical: !canPushBOS 
//                         });

//                         // ❌ (यहाँ से IDM-T का गलत कोड हटा दिया गया है)

//                         // 🔥 THE FIX: Reset Discounted Trackers (नया Rule: BOS(Dis) होते ही रेंज फ्रेश हो जाती है)
//                         if (canPushBOS && structureMode === "DISCOUNTED") {
//                             // 1. LL(Dis) और BOS ब्रेकआउट कैंडल के बीच का सबसे ऊँचा पॉइंट ढूँढें
//                             let legStartIdx = candles.findIndex(c => c.timestamp === validLL.time);
//                             let trueLH = { price: -Infinity, time: null };
                            
//                             if (legStartIdx !== -1) {
//                                 for (let k = legStartIdx; k <= i; k++) {
//                                     if (candles[k].high > trueLH.price) {
//                                         trueLH = { price: candles[k].high, time: candles[k].timestamp };
//                                     }
//                                 }
//                             }

//                             // 2. पुराने सारे "LH(Dis)-Ref" लेबल्स को चार्ट से साफ़ कर दें
//                             signals = signals.filter(sig => !(sig.type === "ANCHOR" && sig.displayName === "LH(Dis)-Ref" && sig.trend === "BEARISH"));

//                             // 3. असली "LH(Dis)" को सबसे हाईएस्ट पॉइंट पर ड्रा करें
//                             if (trueLH.time) {
//                                 signals.push({ 
//                                     type: "ANCHOR", displayName: "LH(Dis)", trend: "BEARISH", 
//                                     price: trueLH.price, startTime: trueLH.time, endTime: trueLH.time,
//                                     position: "aboveBar" 
//                                 });
//                             }

//                             // 4. ट्रैकर्स को रीसेट करें
//                             isIdmTaken_Dis_Bearish = false;
//                             is50PercentTapped_Bearish = false;
//                             refSwingHH_Dis_Bearish = { ...tempSwingHigh }; 
//                         }

//                         // =========================================================================
//                         // 🧠 DISCOUNTED MODE: THE 3 CONDITIONS GATEKEEPER (BEARISH)
//                         // =========================================================================
//                         if (structureMode === "DISCOUNTED") {
//                             if (!is50PercentTapped_Bearish) {
//                                 // ❌ 50% टैप नहीं हुआ! (Runaway Trend)
                                
//                                 // अगर मार्केट बिना 50% छुए गिर रहा है, तो दादाजी को नीचे खिसका लाओ!
//                                 if (refSwingHH_Dis_Bearish) { 
//                                     lockedSwingHigh = { ...refSwingHH_Dis_Bearish }; 
//                                 }

//                                 // 🔄 Naye Wave ke liye Trackers Shift karo
//                                 refSwingHH_Dis_Bearish = { ...tempSwingHigh }; 
                                
//                                 // 🌫️ Fade Internal Noise
//                                 signals.forEach(sig => {
//                                     let sigStart = sig.startTime || sig.time;
//                                     if (lockedSwingHigh && sigStart > lockedSwingHigh.time) { 
//                                         if (["E-OB", "E-OF"].includes(sig.type)) { 
//                                             sig.isHistorical = true;
//                                             sig.isActive = false;
//                                         }
//                                     }
//                                 });

//                                 // 🧹 Cleanup & Skip BOS (Zombie Bug Fix)
//                                 isIdmTaken = false; 
//                                 validLL = null; 
//                                 refLL = null; 
//                                 refX_BOS_Bearish = null;
//                                 tempSwingHigh = { price: curr.high, time: curr.timestamp }; 
//                                 continue;
//                             } else {
//                                 // ✅ Condition 1: Perfect 50% Tapped & Breakout! (Valid BOS Dis)
//                                 is50PercentTapped_Bearish = false; 
//                                 isIdmTaken_Dis_Bearish = false;
//                                 refSwingHH_Dis_Bearish = { ...tempSwingHigh }; 
//                             }
//                         }
//                         // =========================================================================

//                         if (refX_CHoCH_Bearish) {
//                             signals.push({ type: "X", trend: "BEARISH", sweptSide: "HIGH", price: lockedSwingHigh.price, startTime: lockedSwingHigh.time, endTime: refX_CHoCH_Bearish.time });
//                             refX_CHoCH_Bearish = null;
//                         }

//                         // 🔥 दादाजी को सेव करो!
//                         prevLockedSwingHigh = { ...lockedSwingHigh }; 
//                         lockedSwingHigh = { ...tempSwingHigh };
//                         isIdmTaken = false;
//                         wipeCounterStructure();
//                         validLL = null; refLL = null; refX_BOS_Bearish = null;

//                         // 🔥 RETRO-SCANNER INJECTION: BOS के पहले वाले Bearish पुलबैक्स ढूँढो
//                         let startIdx = candles.findIndex(c => c.timestamp === lockedSwingHigh.time);
//                         let retroPBs = scanRetroactivePullbacks(startIdx, i, candles, "BEARISH");
//                         confirmedLH = retroPBs.length > 0 ? retroPBs[retroPBs.length - 1] : null;

//                         bearishPullbacks = [];
//                         tempPullbackTracker_Bearish = null;
//                         absoluteLowest = { price: curr.low, time: curr.timestamp };

//                     } else { // 🧹 Sweep (Ref X)
//                         // 🔥 THE NULL FIX: Ensure majorIdmTarget doesn't crash if null
//                         let safeIdmTarget = majorIdm_Bearish ? { ...majorIdm_Bearish } : { price: -Infinity, time: curr.timestamp };
//                         refX_BOS_Bearish = { price: curr.low, time: curr.timestamp, majorIdmTarget: safeIdmTarget };
//                     }
//                 }

//                 if (refX_BOS_Bearish && refX_BOS_Bearish.majorIdmTarget) {
//                     if (curr.high > refX_BOS_Bearish.majorIdmTarget.price) {
//                       // 🌟 NAYA CODE: IDM TRANSFER FADE FIX 🌟
//                         let waveStartBearish = lockedSwingHigh ? lockedSwingHigh.time : absoluteHighest.time;
//                         for (let s = signals.length - 1; s >= 0; s--) {
//                             if (signals[s].startTime < waveStartBearish) break;
//                             if (signals[s].trend === "BEARISH" && (signals[s].type.includes("IDM") || signals[s].type === "McM(X)")) {
//                                 signals[s].isHistorical = true;
//                             }
//                         }

//                         signals.push({ type: "IDM", trend: "BEARISH", price: refX_BOS_Bearish.majorIdmTarget.price, startTime: refX_BOS_Bearish.majorIdmTarget.time, endTime: curr.timestamp });
//                         // 🔥 THE NULL FIX: Ensure validLL is not null here
//                         if (validLL) {
//                             signals.push({ type: "X", trend: "BEARISH", sweptSide: "LOW", price: validLL.price, startTime: validLL.time, endTime: refX_BOS_Bearish.time });
//                         }
                        
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

            

//              // 🎯 5. IDM(S2D) HIT & ZONE GENERATION!
//                 // 🔥 THE NEW TECHNICAL COUNTER LOGIC (Fake CHoCH / Transfer)
//                 let isTechnicalBreak_S2D = false;
//                 if ((structureMode === "TECHNICAL" || structureMode === "DISCOUNTED") && confirmedHL_S2D !== null && refHH_S2D !== null) {
//                     if (curr.close > refHH_S2D.price) {
//                         isTechnicalBreak_S2D = true; // 🚀 बिना IDM लिए ऊपर का लेवल तोड़ दिया!
//                     }
//                 }

//                 if (confirmedHL_S2D !== null && (curr.low <= confirmedHL_S2D.price || isTechnicalBreak_S2D)) {
                    
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
//                         validHH_S2D = { 
//                             price: refHH_S2D ? refHH_S2D.price : curr.high, 
//                             time: refHH_S2D ? refHH_S2D.time : curr.timestamp 
//                         };
//                         tempSwingLow_S2D = { price: curr.low, time: curr.timestamp };

//                         // 🎯 Technical Break है तो IDM(T-C) छापो, वरना नॉर्मल IDM(S2D)
//                         if (isTechnicalBreak_S2D) {
//                             signals.push({ 
//                                 type: "IDM(T)", trend: "BULLISH_COUNTER", 
//                                 price: confirmedHL_S2D.price, startTime: confirmedHL_S2D.time, 
//                                 endTime: curr.timestamp, sweptSide: "HIGH", position: "belowBar",
//                                 displayName: "IDM(T-C)" // 🔥 (C) लगाने से मास्टर फ़िल्टर इसे काउंटर समझेगा
//                             });
//                         } else {
//                             signals.push({ 
//                                 type: "IDM(S2D)", trend: "BULLISH_COUNTER", 
//                                 price: confirmedHL_S2D.price, startTime: confirmedHL_S2D.time, 
//                                 endTime: curr.timestamp, sweptSide: "LOW", position: "bottom"  
//                             });
//                         }

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
                            
//                             // 🎯 THE UI FIX: अगर "Strict (Extreme Only)" चालू है, तभी इस विशाल Root को जोड़ें!
//                             if (strictCounter) {
//                                 s2dPullbacks.unshift({
//                                     id: "ROOT_SWING_HL",
//                                     validHL: candles[startIdx_S2D].low,
//                                     validHLCandleIndex: startIdx_S2D,
//                                     confirmHH: rootConfirmHH,
//                                     confirmHHCandleIndex: endIdx_S2D,
//                                     breakCandleIndex: endIdx_S2D, 
//                                     startTime: candles[startIdx_S2D].timestamp
//                                 });
//                             }
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
//                             activeEof_S2D = { type: "E-OF", displayName: "E-S2D(OF)", trend: "BULLISH", priceTop: poiZones_S2D.eof.top, priceBottom: poiZones_S2D.eof.bottom, startTime: poiZones_S2D.eof.startTime, endTime: mitTimeEof, isActive: true };
//                             signals.push(activeEof_S2D);
//                         }
//                         if (poiZones_S2D.eob) {
//                             let mitTimeEob = findMitigationTime(poiZones_S2D.eob.top, i, candles);
//                             activeEob_S2D = { type: "E-OB", displayName: "E-S2D(OB)", trend: "BULLISH", priceTop: poiZones_S2D.eob.top, priceBottom: poiZones_S2D.eob.bottom, startTime: poiZones_S2D.eob.startTime, fvgTop: poiZones_S2D.eob.fvgTop, fvgBottom: poiZones_S2D.eob.fvgBottom, endTime: mitTimeEob, isActive: true };
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
//                             // 🧹 THE FIX: अगर Strict Mode है तभी चार्ट साफ करो, 'Every Pullback' मोड में सब दिखने दो!
//                             if (strictCounter) {
//                                 signals = signals.filter(s => 
//                                     s !== activeDob_S2D && s !== activeDof_S2D && 
//                                     s !== activeEob_S2D && s !== activeEof_S2D
//                                 );
//                             }
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

//             // 🔥 1. INITIALIZE DISCOUNTED ANCHOR (बुलिश दादाजी सेट करें)
//             if (refSwingHL_Dis_Bullish === null && absoluteLowest) {
//                 refSwingHL_Dis_Bullish = { ...absoluteLowest };
//             }

//             // 🔥 2. DEBUG & TAPPING LOGIC (Discounted Mode)
//             if (structureMode === "DISCOUNTED") {
//                 let currentBottom = refSwingHL_Dis_Bullish ? refSwingHL_Dis_Bullish : lockedSwingLow;
//                 if (isIdmTaken && validHH && currentBottom) {
//                     // बुलिश में Valid HH (Top) और Current Bottom का 50% निकालते हैं
//                     let eqLevel = calculateEquilibrium(validHH.price, currentBottom.price);
                    
//                     // अगर मार्केट 50% या उससे नीचे (Discount zone) आ गया है, तो Tapped = true
//                     if (curr.low <= eqLevel) is50PercentTapped_Bullish = true;
//                 }
                
//                 // रनअवे ट्रेंड शिफ्टिंग लॉजिक (Condition 2B)
//                 // अगर नया BOS हुआ लेकिन 50% टैप नहीं हुआ, तो एंकर शिफ्ट करो
//                 if (newBOS_Detected && !is50PercentTapped_Bullish) {
//                     refSwingHL_Dis_Bullish = { ...tempSwingLow }; // एंकर को नए लो पर खिसका दिया
//                 }
//             }

//             // 🔥 SMART AUTO FIX & 1st E-OB FAILURE LOGIC: 
//             if (lockedSwingLow === null && curr.close < prevAbsoluteLowest) {
                
//                 signals.push({
//                     type: "CHoCH", trend: "BEARISH",
//                     sweptSide: "LOW",
//                     price: prevAbsoluteLowest, 
//                     startTime: absoluteLowest.time,
//                     endTime: curr.timestamp,
//                     // 🔥 THE FIX: Yahan displayName add kiya taaki Filter isey hide na kare
//                     displayName: (structureMode === "DISCOUNTED") ? "CHoCH(Dis)" : "CHoCH",
//                     isHistorical: false
//                 });
//                 trend = -1;
//                 isIdmTaken = false;
//                 wipeCounterStructure();
//                 resetDiscountedTrackers();

//                 // 🔥 THE MISSING ANCHOR FIX: बेयरिश के लिए नया टॉप लॉक करो!
//                 lockedSwingHigh = { ...absoluteHighest }; 
//                 lockedSwingLow = null;

//                 validHH = null; refHH = null; tempSwingLow = null; confirmedHL = null;

//                 bullishPullbacks = [];
//                 tempPullbackTracker = null;

//                 absoluteHighest = { price: curr.high, time: curr.timestamp }; 
//                 refCandle = curr;
//                 continue;
//             }

//             if (isIdmTaken) {
//                 if (curr.low < majorIdm_Bullish.price) majorIdm_Bullish = { price: curr.low, time: curr.timestamp };
//             }

//             // RULE 5 & 6c: CHoCH & Sweep Logic (BULLISH TO BEARISH)
//             if (lockedSwingLow !== null) {
//                 let breakLevel = refX_CHoCH_Bullish ? refX_CHoCH_Bullish.price : lockedSwingLow.price;

//                 if (curr.low < breakLevel) { // 🎯 बुलिश में लो (Low) टूटेगा
//                     if (curr.close < breakLevel) { // 🚀 Full Body Break (Valid Breakout)

//                         // 🔥 THE PERFECT GAP-AWARE VALIDATOR (NO INTERNAL NOISE) 🔥
//                         let isGapBreak_Bullish = (candles[i-1] && candles[i-1].close >= breakLevel && curr.open < breakLevel);
                        
//                         let isTrap = false;
                        
//                         // 🌟 THE STRICT RULE: अगर IDM नहीं लिया है, तो यह 100% Trap (IDM-T) है!
//                         if (!isIdmTaken) {
//                             isTrap = true; 
                            
//                             // सिर्फ गैप-डाउन (Gap Down) के केस में भविष्य चेक करो
//                             if (isGapBreak_Bullish) {
//                                 let futurePBs = scanRetroactivePullbacks(i, Math.min(i + 150, candles.length - 1), candles, "BEARISH");
//                                 if (futurePBs.length > 0) isTrap = false; // Valid Gap CHoCH
//                             }
//                         }

//                         // =======================================================
//                         // 🧠 FAKE CHoCH TRAP (IDM-T TRANSFER LOGIC)
//                         // =======================================================
//                         if (isTrap) {
//                             isIdmTaken = true;
//                             isIdmTransferred = true; // 🛑 IDM-T State Active

//                             if (structureMode === "DISCOUNTED") {
//                                 isIdmTaken_Dis_Bullish = false; // 50% का इंतज़ार करो
//                             }
                            
//                             let bosDisRemoved = false, hhDisRemoved = false, hlDisRemoved = false, eobDemoted = false;
//                             for (let k = signals.length - 1; k >= 0; k--) {
//                                 let sig = signals[k];
//                                 if (!bosDisRemoved && sig.type === "BOS" && sig.trend === "BULLISH" && sig.displayName === "BOS(Dis)") {
//                                     signals.splice(k, 1); bosDisRemoved = true; continue;
//                                 }
//                                 if (!hlDisRemoved && sig.type === "ANCHOR" && sig.displayName === "HL(Dis)") {
//                                     signals.splice(k, 1); hlDisRemoved = true; continue;
//                                 }
//                                 if (!hhDisRemoved && sig.type === "ANCHOR" && sig.displayName === "HH(Dis)") {
//                                     signals.splice(k, 1); hhDisRemoved = true; continue;
//                                 }
//                                 if (!eobDemoted && sig.type === "E-OB" && sig.trend === "BULLISH") {
//                                     sig.type = "D-OB"; sig.displayName = "Demand Zone(D-OB)"; eobDemoted = true;
//                                 }
//                                 if (bosDisRemoved && hlDisRemoved && hhDisRemoved && eobDemoted) break;
//                             }
                            
//                             // 🔥 THE GHOST BUG FIX: हमेशा "IDM-T" भेजो ताकि Frontend उसे दिखा सके!
//                             let pushLabel = "IDM-T"; 
                            
//                             // 🔥 CHANCHAL BHAI'S ADVANCED IDM-T SHIFTING LOGIC (Condition 1 & 2) 🔥
//                             let idmT_Price = breakLevel; // Default: Condition 1 (जहाँ Swing HL टूटा)
                            
//                             // Condition 2: अगर Engulfing है तो Shift कर दो
//                             if (typeof isEngulfingBreakout !== 'undefined' && isEngulfingBreakout) {
//                                 idmT_Price = candles[i-1].low; // Shift to previous Low
//                             }
                            
//                             let waveStartBullish = lockedSwingLow.time;
//                             for (let s = signals.length - 1; s >= 0; s--) {
//                                 if (signals[s].startTime < waveStartBullish) break;
//                                 if (signals[s].trend === "BULLISH" && (signals[s].type.includes("IDM") || signals[s].type === "McM(X)")) {
//                                     signals[s].isHistorical = true;
//                                 }
//                             }

//                             // 🎯 IDM-T Draw (Dynamic Price के साथ)
//                             signals.push({ 
//                                 type: pushLabel, trend: "BULLISH", 
//                                 price: idmT_Price, // 🎯 Dynamic Price Shift
//                                 startTime: lockedSwingLow.time, endTime: curr.timestamp,
//                                 displayName: pushLabel 
//                             });

//                             // 🔥 IDM-T बनते ही HH(Dis)-Ref ड्रा करें!
//                             if (structureMode === "DISCOUNTED") {
//                                 signals.push({
//                                     type: "ANCHOR", displayName: "HH(Dis)-Ref", trend: "BULLISH",
//                                     price: absoluteHighest.price, startTime: absoluteHighest.time, endTime: absoluteHighest.time,
//                                     position: "aboveBar"
//                                 });
//                             }
                            
//                             validHH = { ...absoluteHighest };
//                             tempSwingLow = { price: curr.low, time: curr.timestamp };
//                             majorIdm_Bullish = { price: curr.low, time: curr.timestamp };
//                             lockedSwingLow = prevLockedSwingLow ? { ...prevLockedSwingLow } : null;
//                             if (structureMode === "DISCOUNTED") {
//                                 refSwingHL_Dis_Bullish = prevLockedSwingLow ? { ...prevLockedSwingLow } : null;
//                             }
//                             refX_CHoCH_Bullish = null; 
//                             continue; // 🛑 लूप घुमाओ, CHoCH मत छापो!
//                         }

//                         // =======================================================
//                         // ✅ NORMAL CHoCH LOGIC (TRUE TREND SHIFT)
//                         // =======================================================
//                         let isMajorCHoCH = (structureMode === "DISCOUNTED") ? isIdmTaken_Dis_Bullish : true;
//                         let isTrueMajorCHoCH = true;
//                         if (structureMode === "DISCOUNTED") {
//                             isTrueMajorCHoCH = (!refSwingHL_Dis_Bullish || lockedSwingLow.time === refSwingHL_Dis_Bullish.time);
//                         }
                        
//                         if (structureMode === "DISCOUNTED") {
//                             let elementsToRemove = new Set();
//                             for (let k = signals.length - 1; k >= 0; k--) {
//                                 let sig = signals[k];
                                
//                                 // 🔥 THE BOUNDARY FIX: जहाँ से ये वेव शुरू हुई थी (lockedSwingLow), वहाँ पहुँचते ही सफाई रोक दो!
//                                 // इससे पुराना HL(Dis), HH(Dis) और BOS(Dis) डिलीट होने से बच जाएगा!
//                                 if (sig.startTime <= lockedSwingLow.time) break;
//                                 if (sig.displayName === "BOS(Dis)" || sig.displayName === "CHoCH(Dis)") break;
                                
//                                 if (sig.trend === "BULLISH") {
//                                     if (sig.type === "ANCHOR" && (sig.displayName === "HL(Dis)" || sig.displayName === "HH(Dis)" || sig.displayName === "HL(Dis)-Ref" || sig.displayName === "HH(Dis)-Ref")) elementsToRemove.add(k);
//                                     if (sig.type === "E-OB") { sig.type = "D-OB"; sig.displayName = "Demand Zone(D-OB)"; }
//                                 }
//                             }
//                             signals = signals.filter((_, idx) => !elementsToRemove.has(idx));

//                             // 🔥 CHANCHAL BHAI'S PEAK FIX: बुलिश वेव के सबसे टॉप पॉइंट को LH(Dis) में बदल दो!
//                             if (isTrueMajorCHoCH) {
//                                 signals.push({
//                                     type: "ANCHOR", displayName: "LH(Dis)", trend: "BEARISH",
//                                     price: absoluteHighest.price, startTime: absoluteHighest.time, endTime: absoluteHighest.time,
//                                     position: "aboveBar"
//                                 });
//                             }
//                         }

//                         if (structureMode === "TECHNICAL" || structureMode === "DISCOUNTED") {
//                             signals.forEach(sig => {
//                                 let sigStart = sig.startTime || sig.time;
//                                 let sigEnd = sig.endTime || sig.time;
//                                 if (sigStart >= lockedSwingLow.time && sigEnd <= curr.timestamp) {
//                                     if (sig.type !== "BOS" && sig.type !== "CHoCH") sig.isHistorical = true;
//                                     if (["E-OB", "D-OB", "E-OF", "D-OF"].includes(sig.type)) sig.isActive = false;
//                                 }
//                             });
//                         }

//                         signals.push({
//                             type: "CHoCH", trend: "BEARISH", sweptSide: "LOW",
//                             price: breakLevel, startTime: lockedSwingLow.time, endTime: curr.timestamp,
//                             displayName: (structureMode === "DISCOUNTED") ? (isTrueMajorCHoCH ? "CHoCH(Dis)" : "") : "CHoCH",
//                             isHistorical: !isTrueMajorCHoCH,
//                             isHidden: (structureMode === "DISCOUNTED" && !isTrueMajorCHoCH)
//                         });

//                         // 3. बाकि सारा Logic वही रहेगा (Trend Shift Setup)
//                         trend = -1; // 🎯 बुलिश से बेयरिश हो गया
//                         isIdmTaken = false;
//                         wipeCounterStructure();
//                         resetDiscountedTrackers();

//                         // बेयरिश के लिए नया टॉप लॉक करो और बुलिश वेरिएबल्स साफ करो
//                         lockedSwingHigh = { ...absoluteHighest };
//                         lockedSwingLow = null; 
                        
//                         validHH = null; refHH = null; tempSwingLow = null; 
//                         refX_CHoCH_Bullish = null; refX_BOS_Bullish = null;
//                         bullishPullbacks = []; tempPullbackTracker = null;
                        
//                         // बेयरिश ट्रैकर इनिशियलाइज़ करो
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
//            if (brokeLow && !isOutsideBar && refHH === null) { 
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


//             // 🎯 THE FINAL IDM CONFIRMATION & DEMAND ZONE TRANSFORMATION
//             if (confirmedHL !== null && curr.low <= confirmedHL.price && !isIdmTaken) {
                
//                 // 🔥 THE SINGLE CANDLE ENGULFING (IDM + BOS) FIX 🔥
//                 let expectedBreakLevel = refX_BOS_Bullish ? refX_BOS_Bullish.price : absoluteHighest.price;
                
//                 // 🔥 THE SCOPE FIX: poiZones को एकदम ऊपर डिक्लेयर करो!
//                 let poiZones = { eof: null, eob: null, dof: null, dob: null };

//                 // अगर एक ही कैंडल नीचे IDM (HL) ले रही है और ऊपर HH भी तोड़ रही है!
//                 if (curr.high >= expectedBreakLevel) {
//                     // ❌ फेक कैंडल (स्किप करो)
//                     confirmedHL = null;
//                     bullishPullbacks = [];
//                     tempPullbackTracker = null;
//                 } 
//                 else {
//                     // ✅ नार्मल कैंडल है, तो पुराना पूरा लॉजिक चलने दो
//                     isIdmTaken = true;
//                     validHH = { ...absoluteHighest };
//                     tempSwingLow = { price: curr.low, time: curr.timestamp };
//                     majorIdm_Bullish = { price: curr.low, time: curr.timestamp };

//                     // ==========================================================
//                     // 🔥 THE McM(X) & IDM-OF LOGIC
//                     // ==========================================================
//                     let idmLabel = "IDM";
//                     const targetPb = bullishPullbacks.find(pb => pb.validHL === confirmedHL.price);

//                     if (targetPb) {
//                         // 🛡️ THE REAL SWEEP VERIFIER
//                         // चेक करो कि ब्रेक होने वाली कैंडल से लेकर अभी (IDM लेने वाली कैंडल) तक,
//                         // क्या किसी भी कैंडल ने Ref HH (confirmHH) के ऊपर फुल 'Close' किया है?
//                         let trueSweep = true;
//                         for (let k = targetPb.breakCandleIndex; k <= i; k++) {
//                             if (candles[k].close > targetPb.confirmHH) {
//                                 trueSweep = false; // ❌ Full body break मिल गया, यह स्वीप नहीं है!
//                                 break;
//                             }
//                         }

//                         if (trueSweep) {
//                             idmLabel = "IDM/ch"; 

//                             // 1. McM(X) लाइन ड्रा करें (टॉप पर)
//                             signals.push({ 
//                                 type: "McM(X)", 
//                                 trend: "BULLISH", 
//                                 sweptSide: "HIGH", 
//                                 price: targetPb.confirmHH, // Ref HH का प्राइस
//                                 startTime: targetPb.startTime, 
//                                 endTime: validHH.time  
//                             });

//                             // 2. IDM-OF (Order Flow) Box ड्रा करें
//                             let mitTimeIdmOf = findMitigationTime_Bearish(confirmedHL.price, i, candles);

//                             signals.push({ 
//                                 type: "IDM-OF", 
//                                 displayName: "IDM OF", 
//                                 trend: "BULLISH", 
//                                 priceTop: validHH.price, 
//                                 priceBottom: confirmedHL.price, 
//                                 startTime: validHH.time, 
//                                 endTime: mitTimeIdmOf, 
//                                 isActive: true 
//                             });
//                         }
//                     }

//                     // 🌟 NAYA CODE: IDM TRANSFER FADE FIX (पुराने IDMs को धुंधला करें) 🌟
//                     let waveStartBullish = lockedSwingLow ? lockedSwingLow.time : absoluteLowest.time;
//                     for (let s = signals.length - 1; s >= 0; s--) {
//                         if (signals[s].startTime < waveStartBullish) break; // पुरानी वेव में मत जाओ
//                         if (signals[s].trend === "BULLISH" && (signals[s].type.includes("IDM") || signals[s].type === "McM(X)")) {
//                             signals[s].isHistorical = true;
//                         }
//                     }

//                     // IDM या IDM/ch की लाइन ड्रा करें
//                     signals.push({ 
//                         type: idmLabel, 
//                         trend: "BULLISH", 
//                         price: confirmedHL.price, 
//                         startTime: confirmedHL.time, 
//                         endTime: curr.timestamp,
//                         displayName: idmLabel 
//                     });

//                     // ==========================================================
//                     // 🔥 THE ROOT EXTREME FIX (Null Crash Fix)
//                     // ==========================================================   
//                     const rootTime = lockedSwingLow ? lockedSwingLow.time : absoluteLowest.time;
//                     const rootPrice = lockedSwingLow ? lockedSwingLow.price : absoluteLowest.price;

//                     const swingHLIndex = candles.findIndex(c => c.timestamp === rootTime);
                    
//                     // 🛡️ THE NULL GUARD: अगर validHH मौजूद है, तभी अंदर का काम करो
//                     if (validHH !== null) {
//                         const refHHIndex = candles.findIndex(c => c.timestamp === validHH.time);

//                         // 🎯 THE E-OF SIZE FIX: स्कैनर से पहला पुलबैक निकालो
//                         let rootConfirmHH = validHH.price;
//                         let wavePullbacks = scanRetroactivePullbacks(swingHLIndex, refHHIndex, candles, "BULLISH");
//                         if (wavePullbacks.length > 0) {
//                             rootConfirmHH = wavePullbacks[0].confirmHH; // पहला पुलबैक का High
//                         }

//                         const rootExtreme = {
//                             id: "ROOT_SWING_HL",
//                             validHL: rootPrice,
//                             validHLCandleIndex: swingHLIndex,
//                             confirmHH: rootConfirmHH, // <--- परफेक्ट साइज़
//                             confirmHHCandleIndex: refHHIndex,
//                             breakCandleIndex: refHHIndex,
//                             startTime: rootTime
//                         };

//                         const validPullbacksForSMC = bullishPullbacks.filter(pb =>
//                             confirmedHL ? pb.validHL !== confirmedHL.price : true
//                         );

//                         if (swingHLIndex !== -1 && refHHIndex !== -1) {
//                             validPullbacksForSMC.unshift(rootExtreme);
//                         }

//                         // यहाँ 'const' नहीं लगेगा क्योंकि हमने इसे बाहर 'let' से बनाया है
//                         poiZones = findSMCZones(candles, validPullbacksForSMC, i);
//                     }

//                     // ==========================================================
//                     // 🔥 THE VISUAL FIX
//                     // ==========================================================

//                     // 1. जब नया IDM कन्फर्म होता है, तो 'signals' एरे में मौजूद पिछले सारे ज़ोन्स 'पुराने' बन जाते हैं।
//                     signals.forEach(sig => {
//                         if (["E-OB", "D-OB", "E-OF", "D-OF"].includes(sig.type)) {

//                             // 🔥 VIP PASS: Counter-Structure (S2D/D2S) ज़ोन्स को मेन इंजन के क्लिनअप से आज़ाद करो!
//                             if (sig.displayName && (sig.displayName.includes("S2D") || sig.displayName.includes("D2S"))) return;

//                             // अगर पहले से Demand/Supply नाम नहीं हुआ है, तभी चेक करो
//                             if (!sig.displayName || (!sig.displayName.includes("Demand") && !sig.displayName.includes("Supply"))) {
//                                 sig.isActive = false; // पुराने ज़ोन डीएक्टिवेट करें

//                                 let isMitigated = false;
//                                 let startIdx = candles.findIndex(c => c.timestamp === sig.startTime);

//                                 if (startIdx !== -1) {
//                                     for (let j = startIdx + 3; j <= i; j++) {
//                                         // बुलिश ज़ोन के लिए चेकिंग
//                                         if (sig.trend === "BULLISH" && candles[j].low <= sig.priceTop) {
//                                             isMitigated = true;
//                                             break;
//                                         }
//                                         // बेयरिश ज़ोन के लिए चेकिंग
//                                         if (sig.trend === "BEARISH" && candles[j].high >= sig.priceBottom) {
//                                             isMitigated = true;
//                                             break;
//                                         }
//                                     }
//                                 }

//                                 // 🎯 सिर्फ अनमिटिगेटेड ज़ोन्स का नाम उनके ट्रेंड के हिसाब से बदलें
//                                 if (!isMitigated) {
//                                     if (sig.trend === "BULLISH") {
//                                         if (sig.type === "E-OB" || sig.type === "D-OB") sig.displayName = "Demand Zone(OB)";
//                                         if (sig.type === "E-OF" || sig.type === "D-OF") sig.displayName = "Demand Zone(OF)";
//                                     } else if (sig.trend === "BEARISH") {
//                                         if (sig.type === "E-OB" || sig.type === "D-OB") sig.displayName = "Supply Zone(OB)";
//                                         if (sig.type === "E-OF" || sig.type === "D-OF") sig.displayName = "Supply Zone(OF)";
//                                     }
//                                 }
//                             }
//                         }
//                     });

//                     // 2. नए (Current Structure) ज़ोन्स को सिग्नल्स में पुश करें & DISCOUNT POI FILTER
//                     let eqFilter_Bullish = null;
//                     let strictEqFilter_Bullish = null; // 🛡️ NEW: True Anchor for Strict Mode
                    
//                     if (structureMode === "DISCOUNTED") {
//                         // Shifted Anchor (Normal E-OB के लिए)
//                         let currentBottomForFilter = refSwingHL_Dis_Bullish ? refSwingHL_Dis_Bullish : lockedSwingLow;
//                         eqFilter_Bullish = calculateEquilibrium(
//                             validHH.price,
//                             currentBottomForFilter ? currentBottomForFilter.price : absoluteLowest.price
//                         );
                        
//                         // True Origin Anchor (Strict D-OB के लिए)
//                         strictEqFilter_Bullish = calculateEquilibrium(
//                             validHH.price,
//                             lockedSwingLow ? lockedSwingLow.price : absoluteLowest.price
//                         );
//                     }
//                     const isValidDiscount = (topPrice) => structureMode !== "DISCOUNTED" || !eqFilter_Bullish || topPrice <= eqFilter_Bullish;
                    
//                     const isStrictDiscount = (topPrice) => structureMode !== "DISCOUNTED" || !strictEqFilter_Bullish || topPrice <= strictEqFilter_Bullish;

//                     if (poiZones.eof && !poiZones.eof.isMitigated && isValidDiscount(poiZones.eof.top)) {
//                         let mitTimeEOF = findMitigationTime(poiZones.eof.top, i, candles);
//                         signals.push({ type: "E-OF", displayName: "E-OF", trend: "BULLISH", priceTop: poiZones.eof.top, priceBottom: poiZones.eof.bottom, startTime: poiZones.eof.startTime, endTime: mitTimeEOF, isActive: true });
//                     }
//                     if (poiZones.eob && isValidDiscount(poiZones.eob.top)) {
//                         let mitTimeEOB = findMitigationTime(poiZones.eob.top, i, candles);
//                         signals.push({ type: "E-OB", displayName: "E-OB", trend: "BULLISH", priceTop: poiZones.eob.top, priceBottom: poiZones.eob.bottom, startTime: poiZones.eob.startTime, fvgTop: poiZones.eob.fvgTop, fvgBottom: poiZones.eob.fvgBottom, endTime: mitTimeEOB, isActive: true });
//                     }

//                     // 🔥 THE FIX: D-OB अब असली 50% (Origin) से ही नापा जाएगा!
//                     if (poiZones.dof && !poiZones.dof.isMitigated && (!strictDecisional || isStrictDiscount(poiZones.dof.top))) {
//                         let mitTimeDOF = findMitigationTime(poiZones.dof.top, i, candles);
//                         signals.push({ type: "D-OF", displayName: "D-OF", trend: "BULLISH", priceTop: poiZones.dof.top, priceBottom: poiZones.dof.bottom, startTime: poiZones.dof.startTime, endTime: mitTimeDOF, isActive: true });
//                     }
//                     if (poiZones.dob && (!strictDecisional || isStrictDiscount(poiZones.dob.top))) {
//                         let mitTimeDOB = findMitigationTime(poiZones.dob.top, i, candles);
//                         signals.push({ type: "D-OB", displayName: "D-OB", trend: "BULLISH", priceTop: poiZones.dob.top, priceBottom: poiZones.dob.bottom, startTime: poiZones.dob.startTime, fvgTop: poiZones.dob.fvgTop, fvgBottom: poiZones.dob.fvgBottom, endTime: mitTimeDOB, isActive: true });
//                     }

//                     bullishPullbacks = [];
//                     tempPullbackTracker = null;
//                     confirmedHL = null;
//                 } // <--- 🔥 Else ब्लॉक यहाँ एकदम परफेक्टली बंद हुआ
//             }

//             if (isIdmTaken && curr.low < tempSwingLow.price) {
//                 tempSwingLow = { price: curr.low, time: curr.timestamp };

//                 bullishPullbacks = [];
//                 refHH = null; // ट्रैकर अनलॉक!
//                 tempPullbackTracker = null;
//             }
           

//             // =========================================================================
//             // 🔥 DISCOUNTED MODE: IDM(Dis) & 50% TRACKER (BULLISH)
//             // =========================================================================
//             if (structureMode === "DISCOUNTED") {
//                 let currentBottom = refSwingHL_Dis_Bullish ? refSwingHL_Dis_Bullish : lockedSwingLow;
                
//                 if (isIdmTaken && validHH && currentBottom) {
//                     let eqLevel = calculateEquilibrium(validHH.price, currentBottom.price);
                    
//                     // ✅ THE FIX: जब 50% टैप हो तो पुराने IDM को IDM(Dis) में बदल दें!
//                     if (curr.low <= eqLevel && !isIdmTaken_Dis_Bullish) {
//                         is50PercentTapped_Bullish = true;
//                         isIdmTaken_Dis_Bullish = true; // 🔥 बुलिश IDM(Dis) वैलिड!

//                         // 🎯 1. एरे में पीछे जाओ और सबसे ताज़ा 'IDM' को ढूंढकर उसका नाम बदल दो
//                         for (let s = signals.length - 1; s >= 0; s--) {
//                             if ((signals[s].type === "IDM" || signals[s].type === "IDM/ch" || signals[s].type === "IDM-T") && signals[s].trend === "BULLISH") {
//                                 signals[s].displayName = (signals[s].type === "IDM/ch") ? "IDM/ch(Dis)" : "IDM(Dis)";
//                                 signals[s].type = "IDM(Dis)"; // 🔥 Type अपडेट करना ज़रूरी है ताकि BOS को IDM मिल सके!
//                                 break; 
//                             }
//                         }

//                         // 🎯 2. VISUAL ANCHORS: Swing HL और HH के मार्कर ड्रा करो
//                         signals.push({ 
//                             type: "ANCHOR", displayName: "HL(Dis)-Ref", trend: "BULLISH", // 🔥 नाम बदल दिया
//                             price: currentBottom.price, startTime: currentBottom.time, endTime: currentBottom.time,
//                             position: "belowBar" 
//                         });
                        
//                         signals.push({ 
//                             type: "ANCHOR", displayName: "HH(Dis)", trend: "BULLISH", 
//                             price: validHH.price, startTime: validHH.time, endTime: validHH.time,
//                             position: "aboveBar" // कैंडल के ऊपर दिखेगा
//                         });
//                     }
//                 }

//                 // 🏃‍♂️ रनअवे लॉजिक (Shifting Logic) - इसे बिल्कुल मत हटाना!
//                 if (newBOS_Detected && !is50PercentTapped_Bullish) {
//                     refSwingHL_Dis_Bullish = { ...tempSwingLow }; // एंकर को नए लो पर खिसका दिया
//                 }
//             }
//             // ========================================================================

//             // =========================================================================
//             // 🔥 YAHAN PASTE KAREIN: IDM-T से IDM(Dis) प्रमोशन का जादू 🔥
//             // =========================================================================
//             if (isIdmTransferred && structureMode === "DISCOUNTED") {
//                 // ट्रेंड के हिसाब से सही ओरिजिन और टारगेट लेवल ढूँढो
//                 let currentOrigin = (trend === -1) ? (refSwingHH_Dis_Bearish || lockedSwingHigh) : (refSwingHL_Dis_Bullish || lockedSwingLow);
//                 let currentTarget = (trend === -1) ? (validLL || absoluteLowest) : (validHH || absoluteHighest);

//                 if (currentOrigin && currentTarget) {
//                     let eqLevel = calculateEquilibrium(currentOrigin.price, currentTarget.price);
                    
//                     // अगर मार्केट 50% ज़ोन को टैप कर दे (IDM-T अब मैच्योर हो गया!)
//                     if ((trend === -1 && curr.high >= eqLevel) || (trend === 1 && curr.low <= eqLevel)) {
//                         isIdmTransferred = false; 

//                         isIdmTaken = true;
                        
//                         // ट्रेंड के हिसाब से सही IDM Flag अपडेट करें ताकि BOS(Dis) छप सके
//                         if (trend === -1) isIdmTaken_Dis_Bearish = true;
//                         else isIdmTaken_Dis_Bullish = true;
                        
//                         signals.forEach(sig => {
//                             if (sig.displayName === "IDM-T") {
//                                 sig.displayName = "IDM(Dis)";
//                                 sig.type = "IDM(Dis)";
//                             }
//                         });
//                     }
//                 }
//             }
//             // =====================================================================

//             // RULE 3 & 6a: BOS & Sweep Logic
//             if (isIdmTaken && validHH !== null) {
//                 let breakLevel = refX_BOS_Bullish ? refX_BOS_Bullish.price : validHH.price;

//                 if (curr.high > breakLevel) {
//                     if (curr.close > breakLevel) { // 🚀 Full Body Break

//                         let newBOS_Detected = true; // इंजन को पता चले कि BOS हुआ है

//                         // 🔥 DISCOUNTED MODE GATEKEEPER
//                         let canPushBOS = (structureMode === "DISCOUNTED") ? (isIdmTaken_Dis_Bullish === true) : true;
                        
//                         // 🔥 THE FIX: यहाँ displayName जोड़ दिया गया है ताकि मास्टर फ़िल्टर इसे पहचान सके!
//                         signals.push({
//                             type: "BOS", 
//                             trend: "BULLISH",
//                             price: validHH.price,
//                             startTime: validHH.time,
//                             endTime: curr.timestamp,
//                             displayName: (structureMode === "DISCOUNTED") ? (canPushBOS ? "BOS(Dis)" : "BOS") : "BOS",
//                             isHistorical: !canPushBOS // अगर शर्तें पूरी नहीं हुईं, तो धुंधला कर दो
//                         });

//                         // 🧹 (यहाँ से IDM-T वाला गलत कोड हटा दिया गया है)

//                         // 🔥 Reset Discounted Trackers (नया Rule: BOS(Dis) होते ही रेंज फ्रेश हो जाती है)
//                         if (canPushBOS && structureMode === "DISCOUNTED") {
//                             // 1. HH(Dis) और BOS ब्रेकआउट कैंडल के बीच का सबसे निचला (Lowest) पॉइंट ढूँढें
//                             let legStartIdx = candles.findIndex(c => c.timestamp === validHH.time);
//                             let trueHL = { price: Infinity, time: null };
                            
//                             if (legStartIdx !== -1) {
//                                 for (let k = legStartIdx; k <= i; k++) {
//                                     if (candles[k].low < trueHL.price) {
//                                         trueHL = { price: candles[k].low, time: candles[k].timestamp };
//                                     }
//                                 }
//                             }

//                             // 2. पुराने सारे "HL(Dis)-Ref" लेबल्स को चार्ट से साफ़ कर दें
//                             signals = signals.filter(sig => !(sig.type === "ANCHOR" && sig.displayName === "HL(Dis)-Ref" && sig.trend === "BULLISH"));

//                             // 3. असली "HL(Dis)" को सबसे लोएस्ट पॉइंट पर ड्रा करें
//                             if (trueHL.time) {
//                                 signals.push({ 
//                                     type: "ANCHOR", displayName: "HL(Dis)", trend: "BULLISH", 
//                                     price: trueHL.price, startTime: trueHL.time, endTime: trueHL.time,
//                                     position: "belowBar" 
//                                 });
//                             }

//                             // 4. ट्रैकर्स को रीसेट करें
//                             isIdmTaken_Dis_Bullish = false;
//                             is50PercentTapped_Bullish = false;
//                             refSwingHL_Dis_Bullish = { ...tempSwingLow }; 
//                         }

//                         // =========================================================================
//                         // 🧠 DISCOUNTED MODE: THE 3 CONDITIONS GATEKEEPER (BULLISH)
//                         // =========================================================================
//                         if (structureMode === "DISCOUNTED") {
//                             if (!is50PercentTapped_Bullish) {
//                                 // ❌ 50% टैप नहीं हुआ! (Runaway Trend)
                                
//                                 // अगर मार्केट बिना 50% छुए भाग रहा है, तो दादाजी को ऊपर खिसका लाओ!
//                                 if (refSwingHL_Dis_Bullish) { 
//                                     lockedSwingLow = { ...refSwingHL_Dis_Bullish }; 
//                                 }

//                                 // 🔄 Naye Wave ke liye Trackers Shift karo
//                                 refSwingHH_Dis_Bullish = { price: curr.high, time: curr.timestamp };
//                                 refSwingHL_Dis_Bullish = { ...tempSwingLow }; 
                                
//                                 // 🌫️ Fade Internal Noise
//                                 signals.forEach(sig => {
//                                     let sigStart = sig.startTime || sig.time;
//                                     if (lockedSwingLow && sigStart > lockedSwingLow.time) { 
//                                         if (["E-OB", "E-OF"].includes(sig.type)) { 
//                                             sig.isHistorical = true;
//                                             sig.isActive = false;
//                                         }
//                                     }
//                                 });

//                                 // 🧹 Cleanup & Skip BOS (Zombie Bug Fix)
//                                 isIdmTaken = false; 
//                                 validHH = null; 
//                                 refHH = null; 
//                                 refX_BOS_Bullish = null;
//                                 tempSwingLow = { price: curr.low, time: curr.timestamp }; 
//                                 continue;
//                             } else {
//                                 // ✅ Condition 1: Perfect 50% Tapped & Breakout! (Valid BOS Dis)
//                                 is50PercentTapped_Bullish = false; 
//                                 isIdmTaken_Dis_Bullish = false;
//                                 refSwingHH_Dis_Bullish = { price: curr.high, time: curr.timestamp };
//                                 refSwingHL_Dis_Bullish = { ...tempSwingLow }; 
//                             }
//                         }
//                         // =========================================================================

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
//                         // 🔥 THE NULL FIX: Ensure majorIdmTarget doesn't crash if null
//                         let safeIdmTarget = majorIdm_Bullish ? { ...majorIdm_Bullish } : { price: Infinity, time: curr.timestamp };
//                         refX_BOS_Bullish = { price: curr.high, time: curr.timestamp, majorIdmTarget: safeIdmTarget };
//                     }
//                 }

//                 if (refX_BOS_Bullish && refX_BOS_Bullish.majorIdmTarget) {
//                     if (curr.low < refX_BOS_Bullish.majorIdmTarget.price) {

//                       // 🌟 NAYA CODE: IDM TRANSFER FADE FIX 🌟
//                         let waveStartBullish = lockedSwingLow ? lockedSwingLow.time : absoluteLowest.time;
//                         for (let s = signals.length - 1; s >= 0; s--) {
//                             if (signals[s].startTime < waveStartBullish) break;
//                             if (signals[s].trend === "BULLISH" && (signals[s].type.includes("IDM") || signals[s].type === "McM(X)")) {
//                                 signals[s].isHistorical = true;
//                             }
//                         }

//                         signals.push({ type: "IDM", trend: "BULLISH", price: refX_BOS_Bullish.majorIdmTarget.price, startTime: refX_BOS_Bullish.majorIdmTarget.time, endTime: curr.timestamp });
                        
//                         // 🔥 THE NULL FIX: Ensure validHH is not null
//                         if (validHH) {
//                             signals.push({ type: "X", trend: "BULLISH", sweptSide: "HIGH", price: validHH.price, startTime: validHH.time, endTime: refX_BOS_Bullish.time });
//                         }

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



//             // 🎯 5. IDM(D2S) HIT & ZONE GENERATION!
//                 // 🔥 THE NEW TECHNICAL COUNTER LOGIC (Fake CHoCH / Transfer)
//                 let isTechnicalBreak_D2S = false;
//                 if ((structureMode === "TECHNICAL" || structureMode === "DISCOUNTED") && confirmedLH_D2S !== null && refLL_D2S !== null) {
//                     if (curr.close < refLL_D2S.price) {
//                         isTechnicalBreak_D2S = true; // 🚀 बिना IDM लिए नीचे का लेवल तोड़ दिया!
//                     }
//                 }

//                 if (confirmedLH_D2S !== null && (curr.high >= confirmedLH_D2S.price || isTechnicalBreak_D2S)) {
                    
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
//                         validLL_D2S = { 
//                             price: refLL_D2S ? refLL_D2S.price : curr.low, 
//                             time: refLL_D2S ? refLL_D2S.time : curr.timestamp 
//                         };
//                         tempSwingHigh_D2S = { price: curr.high, time: curr.timestamp }; // पीक ट्रैक करने के लिए

//                         // 🎯 Technical Break है तो IDM(T-C) छापो, वरना नॉर्मल IDM(D2S)
//                         if (isTechnicalBreak_D2S) {
//                             signals.push({ 
//                                 type: "IDM(T)", trend: "BEARISH_COUNTER", 
//                                 price: confirmedLH_D2S.price, startTime: confirmedLH_D2S.time, 
//                                 endTime: curr.timestamp, sweptSide: "LOW", position: "aboveBar",
//                                 displayName: "IDM(T-C)" // 🔥 (C) लगाने से मास्टर फ़िल्टर इसे काउंटर समझेगा
//                             });
//                         } else {
//                             signals.push({ 
//                                 type: "IDM(D2S)", trend: "BEARISH_COUNTER", 
//                                 price: confirmedLH_D2S.price, startTime: confirmedLH_D2S.time, 
//                                 endTime: curr.timestamp, sweptSide: "HIGH", position: "aboveBar" 
//                             });
//                         }

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
                            
//                             // 🎯 THE UI FIX: अगर "Strict (Extreme Only)" चालू है, तभी इस विशाल Root को जोड़ें!
//                             if (strictCounter) {
//                                 d2sPullbacks.unshift({
//                                     id: "ROOT_SWING_LH",
//                                     validLH: candles[startIdx_D2S].high,
//                                     validLHCandleIndex: startIdx_D2S,
//                                     confirmLL: rootConfirmLL, 
//                                     confirmLLCandleIndex: endIdx_D2S,
//                                     breakCandleIndex: endIdx_D2S, 
//                                     startTime: candles[startIdx_D2S].timestamp
//                                 });
//                             }
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
//               }
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
//                             // 🧹 THE FIX: अगर Strict Mode है तभी चार्ट साफ करो, 'Every Pullback' मोड में सब दिखने दो!
//                             if (strictCounter) {
//                                 signals = signals.filter(s => 
//                                     s !== activeDob_D2S && s !== activeDof_D2S && 
//                                     s !== activeEob_D2S && s !== activeEof_D2S
//                                 );
//                             }
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



//     // =========================================================================
//     // 🛠️ CHANCHAL BHAI'S MASTER ZONE OVERLAP & PROMOTION LOGIC
//     // =========================================================================
//     // =========================================================================
//     // 🛠️ CHANCHAL BHAI'S MASTER ZONE OVERLAP & PROMOTION LOGIC (LEG-BASED)
//     // =========================================================================
//     let waveZonesMap = {};
//     let currentLegId = 0;

//     // 1. लेग (Leg) के हिसाब से ज़ोन्स को ग्रुप करें (BOS/CHoCH के आधार पर)
//     signals.forEach(sig => {
//         // जैसे ही मेजर स्ट्रक्चर (BOS/CHoCH) मिले, नया लेग (डब्बा) शुरू कर दो
//         let name = sig.displayName || sig.type;
//         if (["BOS", "CHoCH", "BOS(Dis)", "CHoCH(Dis)"].includes(name)) {
//             currentLegId++;
//         }
        
//         // सिर्फ मेन स्ट्रक्चर के ज़ोन्स को ग्रुप में डालो (Counter ज़ोन्स को डिस्टर्ब मत करो)
//         if (["E-OB", "D-OB", "E-OF", "D-OF"].includes(sig.type)) {
//             let key = `${sig.trend}_LEG_${currentLegId}`;
//             if (!waveZonesMap[key]) waveZonesMap[key] = [];
//             waveZonesMap[key].push(sig);
//         }
//     });

//     Object.values(waveZonesMap).forEach(waveZones => {
//         let flows = waveZones.filter(z => z.type.includes("OF"));
//         let blocks = waveZones.filter(z => z.type.includes("OB"));
        
//         if (blocks.length === 0 && flows.length === 0) return;

//         let trend = waveZones[0].trend;

//         // 🎯 RULE 1: OF Containment & Cleanup (एक OF के अंदर मल्टीपल OBs का सफाया)
//         flows.forEach(of => {
//             let insideOBs = blocks.filter(ob => 
//                 !ob.isFakeExtreme &&
//                 ob.priceTop <= Math.max(of.priceTop, of.priceBottom) && 
//                 ob.priceBottom >= Math.min(of.priceTop, of.priceBottom)
//             );

//             if (insideOBs.length > 1) {
//                 if (trend === "BEARISH") {
//                     insideOBs.sort((a, b) => b.priceTop - a.priceTop); 
//                 } else {
//                     insideOBs.sort((a, b) => a.priceBottom - b.priceBottom); 
//                 }

//                 for (let i = 1; i < insideOBs.length; i++) {
//                     insideOBs[i].isFakeExtreme = true;
//                 }
//             }
//         });

//         // 🧹 जो OBs फेक मार्क हो गए हैं, उन्हें आगे के लॉजिक से हटा दें
//         blocks = blocks.filter(b => !b.isFakeExtreme);

//         // 🎯 RULE 2: Global Extreme Assignment (पूरे लेग का असली E-OB और E-OF सेट करें)
//         if (blocks.length > 0) {
//             if (trend === "BEARISH") blocks.sort((a, b) => b.priceTop - a.priceTop);
//             else blocks.sort((a, b) => a.priceBottom - b.priceBottom);

//             // सबसे पहला असली E-OB है
//             blocks[0].type = "E-OB";
//             if (blocks[0].displayName) blocks[0].displayName = blocks[0].displayName.replace("D-", "E-");

//             // बाकी सब D-OB हैं
//             for (let i = 1; i < blocks.length; i++) {
//                 blocks[i].type = "D-OB";
//                 if (blocks[i].displayName) blocks[i].displayName = blocks[i].displayName.replace("E-", "D-");
//             }
//         }

//         if (flows.length > 0) {
//             if (trend === "BEARISH") flows.sort((a, b) => b.priceTop - a.priceTop);
//             else flows.sort((a, b) => a.priceBottom - b.priceBottom);

//             // सबसे पहला E-OF है (बाय डिफ़ॉल्ट)
//             flows[0].type = "E-OF";
//             if (flows[0].displayName) flows[0].displayName = flows[0].displayName.replace("D-", "E-");

//             // बाकी सब D-OF हैं
//             for (let i = 1; i < flows.length; i++) {
//                 flows[i].type = "D-OF";
//                 if (flows[i].displayName) flows[i].displayName = flows[i].displayName.replace("E-", "D-");
//             }
//         }

//         // 🎯 RULE 3: Nature Alignment (🔥 CHANCHAL BHAI'S FIX 🔥)
//         // "अगर OF में D-OB है, तो वो ज़ोन D-OF ही होगा!"
//         flows.forEach(of => {
//             let insideOBs = blocks.filter(ob => 
//                 ob.priceTop <= Math.max(of.priceTop, of.priceBottom) && 
//                 ob.priceBottom >= Math.min(of.priceTop, of.priceBottom)
//             );

//             if (insideOBs.length > 0) {
//                 let survivingOB = insideOBs[0]; 
                
//                 // अगर OF के अंदर D-OB है, तो वो OF कभी E-OF नहीं हो सकता! उसे D-OF बनाओ।
//                 if (survivingOB.type === "D-OB" && of.type === "E-OF") {
//                     of.type = "D-OF";
//                     if (of.displayName) of.displayName = of.displayName.replace("E-", "D-");
//                 }
//                 // अगर OF के अंदर E-OB है, तो वो D-OF नहीं हो सकता, उसे E-OF बनाओ।
//                 else if (survivingOB.type === "E-OB" && of.type === "D-OF") {
//                     of.type = "E-OF";
//                     if (of.displayName) of.displayName = of.displayName.replace("D-", "E-");
//                 }
//             }
//         });
        
//         // 🎯 RULE 4: Final Duplicate Extreme Killer (सेफ्टी के लिए)
//         let finalEOBs = blocks.filter(b => b.type === "E-OB");
//         if (finalEOBs.length > 1) {
//             if (trend === "BEARISH") finalEOBs.sort((a, b) => b.priceTop - a.priceTop); 
//             else finalEOBs.sort((a, b) => a.priceBottom - b.bottom); 
//             for (let i = 1; i < finalEOBs.length; i++) finalEOBs[i].isFakeExtreme = true;
//         }

//         let finalEOFs = flows.filter(f => f.type === "E-OF");
//         if (finalEOFs.length > 1) {
//             if (trend === "BEARISH") finalEOFs.sort((a, b) => b.priceTop - a.priceTop); 
//             else finalEOFs.sort((a, b) => a.priceBottom - b.priceBottom); 
//             for (let i = 1; i < finalEOFs.length; i++) finalEOFs[i].isFakeExtreme = true;
//         }
//     });
//     // =========================================================================


//     // =========================================================================
//     // 🧹 THE ULTIMATE DUPLICATE ZONE ERASER & MASTER FILTER (Unified Version)
//     // =========================================================================
//     let finalUniqueSignals = [];
//     let seenZoneKeys = new Set();

//     // लूप को पीछे से चलाएंगे ताकि ताज़ा (Fresh) ज़ोन्स (जैसे नया E-OB) पहले मिलें
//     for (let k = signals.length - 1; k >= 0; k--) {
//         let sig = signals[k];
        
//         // 🔥 THE NEW FILTER: जो Fake E-OB मार्क हुए हैं, उन्हें सीधा चार्ट से बाहर निकाल फेंको!
//         if (sig.isFakeExtreme) continue; 
        
//         // चेक करें कि क्या यह कोई Order Block या Order Flow ज़ोन है
//         let isZone = ["E-OB", "D-OB", "E-OF", "D-OF"].includes(sig.type) || 
//                      (sig.displayName && (sig.displayName.includes("Demand") || sig.displayName.includes("Supply")));
        
//         if (isZone) {
//             // OB और OF को अलग-अलग पहचानने के लिए बेस टाइप निकालें
//             let baseType = (sig.type && sig.type.includes("OF")) || (sig.displayName && sig.displayName.includes("OF")) ? "OF" : "OB";
            
//             // एक यूनिक चाबी (Key) बनाएं: StartTime + Top + Bottom + Trend + BaseType
//             let zoneKey = `${sig.startTime}_${sig.priceTop}_${sig.priceBottom}_${baseType}_${sig.trend}`;
            
//             if (seenZoneKeys.has(zoneKey)) {
//                 // ❌ अगर यह चाबी पहले ही मिल चुकी है तो इग्नोर (Delete) कर दो
//                 continue; 
//             } else {
//                 seenZoneKeys.add(zoneKey);
//                 finalUniqueSignals.unshift(sig); // एरे में आगे जोड़ें ताकि ओरिजिनल आर्डर बना रहे
//             }
//         } else {
//             // =================================================================
//             // 🔥 THE MASTER FILTER INJECTION: मुख्य लेबल्स को यहाँ प्रोसेस करेंगे
//             // =================================================================
//             if (structureMode === "DISCOUNTED") {
//                 const isDis = sig.displayName && sig.displayName.includes("(Dis)");
                
//                 // 🛡️ FIX: अगर मोड DISCOUNTED है और नाम में (Dis) नहीं है, तो इसे धुंधला (Technical Reference) कर दो
//                 if (!isDis && sig.displayName !== "IDM-T" && ["BOS", "CHoCH", "IDM", "IDM/ch", "IDM(T)"].includes(sig.type)) {
//                     sig.isHistorical = true; 
//                 }
//             } else {
//                 // 🛡️ FIX: अगर मोड Technical/Mechanical है, तो (Dis) वाले लेबल्स को चार्ट पर आने ही मत दो (Skip करो)
//                 if (sig.displayName && sig.displayName.includes("(Dis)")) {
//                     continue; 
//                 }
//             }
            
//             // जो फ़िल्टर से बच गए, उन्हें सीधा पास कर दो
//             finalUniqueSignals.unshift(sig);
//         }
//     }
    
//     // ---------------------------------------------------------
//     // 🛡️ 🔥 THE NEW MASTER FILTER FOR COUNTER STRUCTURE 🔥 🛡️
//     // ---------------------------------------------------------
//     if (strictCounter) {
//         finalUniqueSignals = finalUniqueSignals.filter(sig => {
//             // अगर Strict Mode ON है, तो Counter Structure के फालतू लेबल्स (IDM, BOS, D-OB) को चार्ट से छुपा दो
//             if (sig.type === "IDM(S2D)" || sig.type === "IDM(D2S)") return false;
//             if (sig.type === "BOS(C)" || sig.type === "X(C)") return false;
//             if (sig.displayName && (sig.displayName.includes("D-S2D") || sig.displayName.includes("D-D2S"))) return false;
            
//             return true; // बाकी सब (E-D2S, E-S2D और Main Structure) दिखने दो!
//         });
//     }

//     // identifyMechanicalStructure के अंदर सबसे लास्ट में ये रखो (return से ठीक पहले):
//     // IDM Transfer (IDM-T) ट्रैकर
    

//     if (majorOnly) {
//         finalUniqueSignals = finalUniqueSignals.filter(sig => {
            
//             // 1. काउंटर स्ट्रक्चर को पहचानें
//             let isCounter = ["IDM(S2D)", "IDM(D2S)", "BOS(C)", "X(C)", "McM(X)"].includes(sig.type) || 
//                             (sig.displayName && (sig.displayName.includes("S2D") || sig.displayName.includes("D2S") || sig.displayName.includes("(C)")));

//             // 2. मेजर लेबल्स को पहचानें
//             let isMajor = ["BOS", "CHoCH", "IDM", "IDM(T)", "IDM/ch", "ANCHOR"].includes(sig.type) || 
//                            (sig.type && (sig.type.includes("IDM") || sig.type.includes("Dis")));
            
//             // 3. Discounted Mode Logic
//             if (structureMode === "DISCOUNTED" && isMajor && !isCounter) {
//                 // 🔥 THE FIX: IDM-T को चार्ट से गायब होने से बचाओ!
//                 if (!sig.displayName || (!sig.displayName.includes("(Dis)") && sig.displayName !== "IDM-T")) {
//                     sig.isHistorical = true; 
//                 } else {
//                     sig.isHistorical = false; 
//                 }
//             }
            
//             let isPoiZone = ["E-OB", "E-OF", "D-OB", "D-OF"].includes(sig.type);
            
//             // =========================================================
//             // 🎯 THE PERFECT UI-FILTER (Chanchal Bhai's Multi-Feature Fix)
//             // =========================================================
//             if (isCounter) {
//                 // अगर यूज़र ने "Every Pullback Mapping" चुना है (!strictCounter)
//                 if (!strictCounter) {
//                     return true; // 🔥 D-D2S और E-D2S दोनों को चार्ट पर छापने दो!
//                 } 
//                 // अगर यूज़र ने "Strict (Extreme Only)" चुना है (strictCounter)
//                 else {
//                     let isCounterExtreme = sig.displayName && (sig.displayName.includes("E-S2D") || sig.displayName.includes("E-D2S"));
//                     return isCounterExtreme; // 🛑 D-D2S को रोक दो, सिर्फ E-D2S छपेगा! (पहले जैसा ही रहेगा)
//                 }
//             }

//             return isMajor || isPoiZone; 
//         });
//     }

//     // =========================================================================
//     // 🎛️ CHANCHAL BHAI'S UI CHECKBOX FILTER (The Missing Piece)
//     // =========================================================================
//     // यह फ़िल्टर तुम्हारे UI से आए 4 चेकबॉक्स (True/False) के आधार पर कचरा साफ करेगा
//     finalUniqueSignals = finalUniqueSignals.filter(sig => {
//         let name = sig.displayName || "";

//         // API URL से डेटा String ("false") या Boolean (false) किसी भी रूप में आ सकता है, इसलिए String() यूज़ किया है
//         if ((name.includes("D-D2S(OB)") || name.includes("D-S2D(OB)")) && String(showD2S_DOB) === "false") return false;
//         if ((name.includes("D-D2S(OF)") || name.includes("D-S2D(OF)")) && String(showD2S_DOF) === "false") return false;
//         if ((name.includes("E-D2S(OB)") || name.includes("E-S2D(OB)")) && String(showD2S_EOB) === "false") return false;
//         if ((name.includes("E-D2S(OF)") || name.includes("E-S2D(OF)")) && String(showD2S_EOF) === "false") return false;

//         return true; // जो पास हो गया, उसे चार्ट पर जाने दो
//     });

//     let indicesToRemove = new Set();
//     let targetArray = typeof finalUniqueSignals !== 'undefined' ? finalUniqueSignals : signals;

//     for (let i = 0; i < targetArray.length; i++) {
//         let sig = targetArray[i];

//         // 1. अगर ये कोई भी CHoCH है
//         if (sig.type && sig.type.includes("CHoCH")) {

//             // 2. 🔥 THE MAGIC BULLET 🔥
//             // ढूँढो कि क्या एकदम उसी Price और उसी Time पर कोई IDM भी छपा है?
//             let overlappingIdmIndex = targetArray.findIndex((s, idx) => 
//                 idx !== i && 
//                 s.type && s.type.includes("IDM") && 
//                 s.startTime === sig.startTime && 
//                 s.price === sig.price // 🎯 100% Guaranteed Overlap Catch!
//             );

//             if (overlappingIdmIndex !== -1) {
//                 // 🚨 OVERLAP DETECTED! 🚨
                
//                 // 1. CHoCH को उड़ाने के लिए मार्क करो
//                 indicesToRemove.add(i);

//                 // 2. IDM को एक्टिव (डार्क) कर दो ताकि वो एकदम साफ़ दिखे
//                 targetArray[overlappingIdmIndex].isHistorical = false;

//                 // 3. इस CHoCH से ठीक पहले वाले सबसे ताज़ा BOS को ढूंढ कर हमेशा के लिए उड़ा दो!
//                 for (let k = i - 1; k >= 0; k--) {
//                     if (targetArray[k].type && targetArray[k].type.includes("BOS")) {
//                         indicesToRemove.add(k);
//                         break; // सिर्फ एक (लेटेस्ट) BOS उड़ाना है
//                     }
//                 }
//             }
//         }
//     }

//     // जिन-जिन को उड़ाने के लिए मार्क किया है, उन्हें फाइनल लिस्ट से बाहर निकाल दो
//     targetArray = targetArray.filter((_, idx) => !indicesToRemove.has(idx));

//     // वापस मेन वेरिएबल में सेव कर दो
//     if (typeof finalUniqueSignals !== 'undefined') {
//         finalUniqueSignals = targetArray;
//     } else {
//         signals = targetArray;
//     }
//     // =========================================================================

//     return typeof finalUniqueSignals !== 'undefined' ? finalUniqueSignals : signals;
// };

// // ============================================================================
// // 🎯 SMC POI SCANNER BLOCK: E-OF, E-OB, D-OF, D-OB FOR BULLISH SCENARIO
// // ============================================================================

// // =========================================================================
// // 🔥 HELPER: 50% GANN BOX (EQUILIBRIUM) CALCULATOR
// // =========================================================================
// const calculateEquilibrium = (highPrice, lowPrice) => {
//     return (highPrice + lowPrice) / 2;
// };



// // 🎯 MAIN SCANNER
// const checkPriceActionSignal = (htfCandles, ltfCandles, setupType, startingTrend = "AUTO", counterStructureDepth = 0, structureMode = "MECHANICAL", strictDecisional = false, strictCounter = true, majorOnly = false, showD2S_DOB = true, showD2S_DOF = true, showD2S_EOB = true, showD2S_EOF = true) => {

//     let signal = { long: false, short: false, reason: "" };

//     if (!htfCandles || htfCandles.length < 15 || !ltfCandles || ltfCandles.length === 0) {
//         return signal;
//     }

//     // 🔥 यहाँ strictDecisional पास कर दें
//     const htfSignals = identifyMechanicalStructure(htfCandles, startingTrend, counterStructureDepth, structureMode, strictDecisional, strictCounter, majorOnly, showD2S_DOB, showD2S_DOF, showD2S_EOB, showD2S_EOF);
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








// const { 
//     findSMCZones, 
//     findSMCZones_Bearish, 
//     findMitigationTime, 
//     findMitigationTime_Bearish 
// } = require('./SetupFinder');


// // =========================================================================
// // 🧠 SMART RETRO-SCANNER (Visual Zig-Zag Logic by Chanchal Bhai)
// // =========================================================================
// const scanRetroactivePullbacks = (startIndex, endIndex, candles, trendType) => {
//     let validPullbacks = [];
//     let inPullback = false;
//     let tempExtreme = null;
//     let targetBreakLevel = null;
    
//     // 🔥 THE FIX: OB स्कैनर के लिए कैंडल इंडेक्स ट्रैक करने वाले वेरिएबल्स
//     let breakCandleIdx = -1; 
//     let tempExtremeIdx = -1;

//     if (trendType === "BEARISH") {
//         for (let j = startIndex + 1; j <= endIndex; j++) {
//             let curr = candles[j];
//             let prev = candles[j - 1];
//             let isOutsideBar = curr.high > prev.high && curr.low < prev.low;
//             let brokeHigh = curr.high > prev.high;

//             if (!inPullback && brokeHigh && !isOutsideBar) {
//                 inPullback = true;
//                 targetBreakLevel = prev.low;
//                 breakCandleIdx = j - 1; // 🎯 जिस कैंडल का लो ब्रेक होने वाला है
//                 tempExtreme = { price: curr.high, time: curr.timestamp };
//                 tempExtremeIdx = j; // 🎯 टॉप कैंडल का इंडेक्स
//             }
//             else if (inPullback) {
//                 if (curr.high > tempExtreme.price) {
//                     tempExtreme = { price: curr.high, time: curr.timestamp };
//                     tempExtremeIdx = j;
//                 }
//                 if (curr.low < targetBreakLevel) {
//                     // 🔥 THE FIX: FVG ढूँढने के लिए स्कैनर को पूरा डेटा (इंडेक्स) दें
//                     validPullbacks.push({
//                         id: validPullbacks.length + 1,
//                         price: tempExtreme.price,
//                         time: tempExtreme.time,
//                         startTime: tempExtreme.time,
//                         validLH: tempExtreme.price, 
//                         validLHCandleIndex: tempExtremeIdx, // D-OB के लिए शुरूआती कैंडल
//                         confirmLL: targetBreakLevel,
//                         confirmLLCandleIndex: breakCandleIdx,
//                         breakCandleIndex: j // D-OB के लिए आखिरी कैंडल (FVG लिमिट)
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
//                 breakCandleIdx = j - 1; // 🎯 जिस कैंडल का हाई ब्रेक होने वाला है
//                 tempExtreme = { price: curr.low, time: curr.timestamp };
//                 tempExtremeIdx = j; // 🎯 बॉटम कैंडल का इंडेक्स
//             }
//             else if (inPullback) {
//                 if (curr.low < tempExtreme.price) {
//                     tempExtreme = { price: curr.low, time: curr.timestamp };
//                     tempExtremeIdx = j;
//                 }
//                 if (curr.high > targetBreakLevel) {
//                     // 🔥 THE FIX: FVG ढूँढने के लिए स्कैनर को पूरा डेटा (इंडेक्स) दें
//                     validPullbacks.push({
//                         id: validPullbacks.length + 1,
//                         price: tempExtreme.price,
//                         time: tempExtreme.time,
//                         startTime: tempExtreme.time,
//                         validHL: tempExtreme.price,
//                         validHLCandleIndex: tempExtremeIdx, // D-OB के लिए शुरूआती कैंडल
//                         confirmHH: targetBreakLevel,
//                         confirmHHCandleIndex: breakCandleIdx,
//                         breakCandleIndex: j // D-OB के लिए आखिरी कैंडल (FVG लिमिट)
//                     });
//                     inPullback = false;
//                 }
//             }
//         }
//     }
//     return validPullbacks; // 🔥 पूरा लिस्ट रिटर्न करेगा
// };


// const identifyMechanicalStructure = (candles, startingTrend = "AUTO", counterStructureDepth = 0, structureMode = "MECHANICAL", strictDecisional = false, strictCounter = true, majorOnly = false, showD2S_DOB = true, showD2S_DOF = true, showD2S_EOB = true, showD2S_EOF = true) => {
//     // =========================================================================
//     // 👑 DISCOUNTED (MAJOR) STRUCTURE VARIABLES (THE PARENT NODE)
//     // =========================================================================
//     // 📉 Bearish Discounted State
//     let swingHH_Dis_Bearish = null; 
//     let swingLL_Dis_Bearish = null;
//     let refSwingLL_Dis_Bearish = null; // Ref Swing LL (Bottom)
//     let refSwingHH_Dis_Bearish = null; // Ref IDM (Top Pullback)
//     let isIdmTaken_Dis_Bearish = false;
//     let is50PercentTapped_Bearish = false; 
    
//     // 📈 Bullish Discounted State
//     let swingHL_Dis_Bullish = null; 
//     let swingHH_Dis_Bullish = null;
//     let refSwingHH_Dis_Bullish = null; // Ref Swing HH (Top)
//     let refSwingHL_Dis_Bullish = null; // Ref IDM (Bottom Pullback)
//     let isIdmTaken_Dis_Bullish = false;
//     let is50PercentTapped_Bullish = false; 
//     // =========================================================================

//     let isIdmTransferred = false;
//     let idmT_Level = null; // IDM-T का प्राइस लेवल

//     // 🔥 THE FIX: Trend बदलने पर पुराने कचरे को साफ़ करने का टूल
//     const resetDiscountedTrackers = () => {
//         is50PercentTapped_Bearish = false; isIdmTaken_Dis_Bearish = false;
//         refSwingLL_Dis_Bearish = null; refSwingHH_Dis_Bearish = null;
//         is50PercentTapped_Bullish = false; isIdmTaken_Dis_Bullish = false;
//         refSwingHL_Dis_Bullish = null; refSwingHH_Dis_Bullish = null;
//         isIdmTransferred = false; // 🔥 IDM-T State Reset
//     };


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



//     // 🔥 यह फंक्शन चेक करेगा कि सिग्नल को पुश करना है या नहीं
//     const shouldAddSignal = (sig) => {
//         const isDiscountedSignal = ["BOS(Dis)", "CHoCH(Dis)", "IDM(Dis)"].includes(sig.displayName);
//         if (structureMode !== "DISCOUNTED" && isDiscountedSignal) {
//             return false; // ❌ Discounted signal है और मोड Technical है, तो मत लो
//         }
//         return true; // ✅ बाकी सब आने दो
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

//         let newBOS_Detected = false;

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

//             // 🔥 1. INITIALIZE ANCHOR (यही वह जगह है जहाँ दादाजी सेट होंगे)
//             if (refSwingHH_Dis_Bearish === null && absoluteHighest) {
//                 refSwingHH_Dis_Bearish = { ...absoluteHighest };
//             }

//             // 🔥 2. DEBUG & TAPPING LOGIC
//             if (structureMode === "DISCOUNTED") {
//                 let currentTop = refSwingHH_Dis_Bearish ? refSwingHH_Dis_Bearish : lockedSwingHigh;
//                 if (isIdmTaken && validLL && currentTop) {
//                     let eqLevel_Bearish = calculateEquilibrium(currentTop.price, validLL.price);
                    
//                     // ✅ THE FIX: बेयरिश में 50% (Premium) टैप करने के लिए कैंडल का High ऊपर जाना चाहिए!
//                     if (curr.high >= eqLevel_Bearish) is50PercentTapped_Bearish = true;
//                 }
                
//                 // रनअवे ट्रेंड शिफ्टिंग लॉजिक (Condition 2B)
//                 if (newBOS_Detected && !is50PercentTapped_Bearish) {
//                     refSwingHH_Dis_Bearish = { ...tempSwingHigh }; // एंकर शिफ्ट!
//                 }
//             }

//             // 🔥 SMART AUTO FIX & 1st E-OB FAILURE LOGIC: 
//             if (lockedSwingHigh === null && curr.close > prevAbsoluteHighest) {
                
//                 signals.push({
//                     type: "CHoCH", trend: "BULLISH",
//                     sweptSide: "HIGH",
//                     price: prevAbsoluteHighest, 
//                     startTime: absoluteHighest.time,
//                     endTime: curr.timestamp,
//                     // 🔥 THE FIX: Yahan bhi displayName add kiya
//                     displayName: (structureMode === "DISCOUNTED") ? "CHoCH(Dis)" : "CHoCH",
//                     isHistorical: false
//                 });

//                 trend = 1;
//                 isIdmTaken = false;
//                 wipeCounterStructure();
//                 resetDiscountedTrackers();
                
//                 // 🔥 THE MISSING ANCHOR FIX: बुलिश के लिए नया बॉटम लॉक करो!
//                 lockedSwingLow = { ...absoluteLowest }; 
//                 lockedSwingHigh = null;

//                 validLL = null; refLL = null; tempSwingHigh = null; confirmedLH = null;

//                 bearishPullbacks = []; 
//                 tempPullbackTracker_Bearish = null; 

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

//                         // 🔥 THE PERFECT GAP-AWARE VALIDATOR (NO INTERNAL NOISE) 🔥
//                         let isGapBreak_Bearish = (candles[i-1] && candles[i-1].close <= breakLevel && curr.open > breakLevel);
                        
//                         let isTrap = false;
                        
//                         // 🌟 THE STRICT RULE: अगर IDM नहीं लिया है, तो यह 100% Trap (IDM-T) है!
//                         if (!isIdmTaken) {
//                             isTrap = true; 
                            
//                             // सिर्फ गैप-अप (Gap Up) के केस में भविष्य चेक करो
//                             if (isGapBreak_Bearish) {
//                                 let futurePBs = scanRetroactivePullbacks(i, Math.min(i + 150, candles.length - 1), candles, "BULLISH");
//                                 if (futurePBs.length > 0) isTrap = false; // Valid Gap CHoCH
//                             }
//                         }

//                         // =======================================================
//                         // 🧠 FAKE CHoCH TRAP (IDM-T TRANSFER LOGIC)
//                         // =======================================================
//                         if (isTrap) {
//                             isIdmTaken = true;
//                             isIdmTransferred = true; // 🛑 IDM-T State Active

//                             if (structureMode === "DISCOUNTED") {
//                                 isIdmTaken_Dis_Bearish = false; // 50% का इंतज़ार करो
//                             }
                            
//                             let bosDisRemoved = false, lhDisRemoved = false, llDisRemoved = false, eobDemoted = false;
//                             for (let k = signals.length - 1; k >= 0; k--) {
//                                 let sig = signals[k];
//                                 if (!bosDisRemoved && sig.type === "BOS" && sig.trend === "BEARISH" && sig.displayName === "BOS(Dis)") {
//                                     signals.splice(k, 1); bosDisRemoved = true; continue; 
//                                 }
//                                 if (!llDisRemoved && sig.type === "ANCHOR" && sig.displayName === "LL(Dis)") {
//                                     signals.splice(k, 1); llDisRemoved = true; continue;
//                                 }
//                                 if (!lhDisRemoved && sig.type === "ANCHOR" && sig.displayName === "LH(Dis)") {
//                                     signals.splice(k, 1); lhDisRemoved = true; continue;
//                                 }
//                                 if (!eobDemoted && sig.type === "E-OB" && sig.trend === "BEARISH") {
//                                     sig.type = "D-OB"; sig.displayName = "Supply Zone(D-OB)"; eobDemoted = true;
//                                 }
//                                 if (bosDisRemoved && llDisRemoved && lhDisRemoved && eobDemoted) break;
//                             }
                            
//                             // 🔥 THE GHOST BUG FIX: हमेशा "IDM-T" भेजो ताकि Frontend उसे दिखा सके!
//                             let pushLabel = "IDM-T"; 
                            
//                             // 🔥 CHANCHAL BHAI'S ADVANCED IDM-T SHIFTING LOGIC (Condition 1 & 2) 🔥
//                             let idmT_Price = breakLevel; // Default: Condition 1 (जहाँ Swing LH टूटा)
                            
//                             // Condition 2: अगर Engulfing है तो Shift कर दो
//                             if (typeof isEngulfingBreakout !== 'undefined' && isEngulfingBreakout) {
//                                 idmT_Price = candles[i-1].high; // Shift to previous High
//                             }

//                             let waveStartBearish = lockedSwingHigh.time;
//                             for (let s = signals.length - 1; s >= 0; s--) {
//                                 if (signals[s].startTime < waveStartBearish) break;
//                                 if (signals[s].trend === "BEARISH" && (signals[s].type.includes("IDM") || signals[s].type === "McM(X)")) {
//                                     signals[s].isHistorical = true;
//                                 }
//                             }

//                             // 🎯 IDM-T Draw (Dynamic Price के साथ)
//                             signals.push({ 
//                                 type: pushLabel, trend: "BEARISH", 
//                                 price: idmT_Price, // 🔥 Yahan dynamic price lag gaya
//                                 startTime: lockedSwingHigh.time, endTime: curr.timestamp,
//                                 displayName: pushLabel 
//                             });

//                             // 🔥 IDM-T बनते ही LL(Dis)-Ref ड्रा करें!
//                             if (structureMode === "DISCOUNTED") {
//                                 signals.push({
//                                     type: "ANCHOR", displayName: "LL(Dis)-Ref", trend: "BEARISH",
//                                     price: absoluteLowest.price, startTime: absoluteLowest.time, endTime: absoluteLowest.time,
//                                     position: "belowBar"
//                                 });
//                             }
                            
//                             validLL = { ...absoluteLowest };
//                             tempSwingHigh = { price: curr.high, time: curr.timestamp };
//                             majorIdm_Bearish = { price: curr.high, time: curr.timestamp };
//                             lockedSwingHigh = prevLockedSwingHigh ? { ...prevLockedSwingHigh } : null;
//                             if (structureMode === "DISCOUNTED") {
//                                 refSwingHH_Dis_Bearish = prevLockedSwingHigh ? { ...prevLockedSwingHigh } : null;
//                             }
//                             refX_CHoCH_Bearish = null; 
//                             continue; // 🛑 लूप घुमाओ, CHoCH मत छापो!
//                         }

//                         // =======================================================
//                         // ✅ NORMAL CHoCH LOGIC (TRUE TREND SHIFT)
//                         // =======================================================
//                         let isMajorCHoCH = (structureMode === "DISCOUNTED") ? isIdmTaken_Dis_Bearish : true;
//                         let isTrueMajorCHoCH = true;
//                         if (structureMode === "DISCOUNTED") {
//                             isTrueMajorCHoCH = (!refSwingHH_Dis_Bearish || lockedSwingHigh.time === refSwingHH_Dis_Bearish.time);
//                         }
                        
//                         if (structureMode === "DISCOUNTED") {
//                             let elementsToRemove = new Set();
//                             for (let k = signals.length - 1; k >= 0; k--) {
//                                 let sig = signals[k];
                                
//                                 // 🔥 THE BOUNDARY FIX: जहाँ से ये वेव शुरू हुई थी (lockedSwingHigh), वहाँ पहुँचते ही सफाई रोक दो!
//                                 if (sig.startTime <= lockedSwingHigh.time) break;
//                                 if (sig.displayName === "BOS(Dis)" || sig.displayName === "CHoCH(Dis)") break;
                                
//                                 if (sig.trend === "BEARISH") {
//                                     if (sig.type === "ANCHOR" && (sig.displayName === "LH(Dis)" || sig.displayName === "LL(Dis)" || sig.displayName === "LH(Dis)-Ref" || sig.displayName === "LL(Dis)-Ref")) elementsToRemove.add(k);
//                                     if (sig.type === "E-OB") { sig.type = "D-OB"; sig.displayName = "Supply Zone(D-OB)"; }
//                                 }
//                             }
//                             signals = signals.filter((_, idx) => !elementsToRemove.has(idx));

//                             // 🔥 CHANCHAL BHAI'S TROUGH FIX: बेयरिश वेव के सबसे बॉटम पॉइंट को HL(Dis) में बदल दो!
//                             if (isTrueMajorCHoCH) {
//                                 signals.push({
//                                     type: "ANCHOR", displayName: "HL(Dis)", trend: "BULLISH",
//                                     price: absoluteLowest.price, startTime: absoluteLowest.time, endTime: absoluteLowest.time,
//                                     position: "belowBar"
//                                 });
//                             }
//                         }

//                         if (structureMode === "TECHNICAL" || structureMode === "DISCOUNTED") {
//                             signals.forEach(sig => {
//                                 let sigStart = sig.startTime || sig.time;
//                                 let sigEnd = sig.endTime || sig.time;
//                                 if (sigStart >= lockedSwingHigh.time && sigEnd <= curr.timestamp) {
//                                     if (sig.type !== "BOS" && sig.type !== "CHoCH") sig.isHistorical = true;
//                                     if (["E-OB", "D-OB", "E-OF", "D-OF"].includes(sig.type)) sig.isActive = false;
//                                 }
//                             });
//                         }

//                         signals.push({
//                             type: "CHoCH", trend: "BULLISH", sweptSide: "HIGH",
//                             price: breakLevel, startTime: lockedSwingHigh.time, endTime: curr.timestamp,
//                             displayName: (structureMode === "DISCOUNTED") ? (isTrueMajorCHoCH ? "CHoCH(Dis)" : "") : "CHoCH",
//                             isHistorical: !isTrueMajorCHoCH,
//                             isHidden: (structureMode === "DISCOUNTED" && !isTrueMajorCHoCH) 
//                         });

//                         // 3. बाकि सारा Logic वही रहेगा (Trend Shift Setup)
//                         trend = 1; // 🎯 बेयरिश से बुलिश हो गया
//                         isIdmTaken = false;
//                         wipeCounterStructure();
//                         resetDiscountedTrackers();
                        
//                         // बुलिश के लिए नया बॉटम लॉक करो और बेयरिश वेरिएबल्स साफ करो
//                         lockedSwingLow = { ...absoluteLowest };
//                         lockedSwingHigh = null; 
                        
//                         validLL = null; refLL = null; tempSwingHigh = null; 
//                         refX_CHoCH_Bearish = null; refX_BOS_Bearish = null;
//                         bearishPullbacks = []; tempPullbackTracker_Bearish = null;
                        
//                         // बुलिश ट्रैकर इनिशियलाइज़ करो
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
//             }else if (refLL !== null) {
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
//             if (confirmedLH !== null && curr.high >= confirmedLH.price && !isIdmTaken) {
                
//                 // 🔥 THE SINGLE CANDLE ENGULFING (IDM + BOS) FIX 🔥
//                 let expectedBreakLevel = refX_BOS_Bearish ? refX_BOS_Bearish.price : absoluteLowest.price;
                
//                 // 🔥 THE SCOPE FIX: poiZones को एकदम ऊपर डिक्लेयर करो!
//                 let poiZones = { eof: null, eob: null, dof: null, dob: null };

//                 // अगर एक ही कैंडल ऊपर IDM (LH) ले रही है और नीचे LL भी तोड़ रही है!
//                 if (curr.low <= expectedBreakLevel) {
//                     // ❌ फेक कैंडल: इसे स्किप कर दो
//                     confirmedLH = null;
//                     bearishPullbacks = [];
//                     tempPullbackTracker_Bearish = null;
//                 } 
//                 else {
//                     // ✅ नार्मल कैंडल है
//                     isIdmTaken = true;
//                     validLL = { ...absoluteLowest };
//                     tempSwingHigh = { price: curr.high, time: curr.timestamp };
//                     majorIdm_Bearish = { price: curr.high, time: curr.timestamp };

//                     // ==========================================================
//                     // 🔥 THE McM(X) & IDM-OF LOGIC FOR BEARISH (THE TRUE SWEEP FIX)
//                     // ==========================================================
//                     let idmLabel = "IDM"; // 🎯 FIX: 'IDM(Dis)' हटाकर इसे हमेशा शुद्ध "IDM" रखें
//                     const targetPb = bearishPullbacks.find(pb => pb.validLH === confirmedLH.price);

//                     if (targetPb) {
//                         // 🛡️ THE REAL SWEEP VERIFIER FOR BEARISH
//                         let trueSweep = true;
//                         for (let k = targetPb.breakCandleIndex; k <= i; k++) {
//                             if (candles[k].close < targetPb.confirmLL) {
//                                 trueSweep = false; 
//                                 break;
//                             }
//                         }

//                         if (trueSweep) {
//                             idmLabel = "IDM/ch"; 
//                         }
//                     }

//                     // 🌟 NAYA CODE: IDM TRANSFER FADE FIX (पुराने IDMs को धुंधला करें) 🌟
//                     let waveStartBearish = lockedSwingHigh ? lockedSwingHigh.time : absoluteHighest.time;
//                     for (let s = signals.length - 1; s >= 0; s--) {
//                         if (signals[s].startTime < waveStartBearish) break; // पुरानी वेव में मत जाओ
//                         if (signals[s].trend === "BEARISH" && (signals[s].type.includes("IDM") || signals[s].type === "McM(X)")) {
//                             signals[s].isHistorical = true;
//                         }
//                     }

//                     // IDM या IDM/ch की लाइन ड्रा करें
//                     signals.push({ 
//                         type: idmLabel, 
//                         trend: "BEARISH", 
//                         price: confirmedLH.price, 
//                         startTime: confirmedLH.time, 
//                         endTime: curr.timestamp,
//                         displayName: idmLabel 
//                     });

//                     // 🔥 1. THE ROOT EXTREME FIX
//                     const rootTime = lockedSwingHigh ? lockedSwingHigh.time : absoluteHighest.time;
//                     const rootPrice = lockedSwingHigh ? lockedSwingHigh.price : absoluteHighest.price;

//                     const swingLHIndex = candles.findIndex(c => c.timestamp === rootTime);

//                     // 🛡️ THE NULL GUARD: अगर validLL मौजूद है, तभी अंदर का काम करो
//                     if (validLL !== null) {
//                         const refLLIndex = candles.findIndex(c => c.timestamp === validLL.time);

//                         // 🎯 THE E-OF SIZE FIX: स्कैनर से पहला पुलबैक निकालो
//                         let rootConfirmLL = validLL.price;
//                         let wavePullbacks = scanRetroactivePullbacks(swingLHIndex, refLLIndex, candles, "BEARISH");
//                         if (wavePullbacks.length > 0) {
//                             rootConfirmLL = wavePullbacks[0].confirmLL; // पहला पुलबैक का Low
//                         }

//                         const rootExtreme = {
//                             id: "ROOT_SWING_LH",
//                             validLH: rootPrice,
//                             validLHCandleIndex: swingLHIndex,
//                             confirmLL: rootConfirmLL, // <--- परफेक्ट साइज़
//                             confirmLLCandleIndex: refLLIndex,
//                             breakCandleIndex: refLLIndex,
//                             startTime: rootTime
//                         };

//                         const validPullbacksForSMC = bearishPullbacks.filter(pb => pb.validLH !== confirmedLH.price);

//                         if (swingLHIndex !== -1 && refLLIndex !== -1) {
//                             validPullbacksForSMC.unshift(rootExtreme);
//                         }

//                         // यहाँ 'const' नहीं लगेगा क्योंकि हमने इसे बाहर 'let' से बनाया है
//                         poiZones = findSMCZones_Bearish(candles, validPullbacksForSMC, i);
//                     }

//                     // 🔥 2. THE MASTER STATE MANAGEMENT
//                     signals.forEach(sig => {
//                         if (["E-OB", "D-OB", "E-OF", "D-OF"].includes(sig.type)) {

//                             // 🔥 VIP PASS: Counter-Structure (S2D/D2S) ज़ोन्स को मेन इंजन के क्लिनअप से आज़ाद करो!
//                             if (sig.displayName && (sig.displayName.includes("S2D") || sig.displayName.includes("D2S"))) return;

//                             // अगर पहले से Demand/Supply नाम नहीं हुआ है, तभी चेक करो
//                             if (!sig.displayName || (!sig.displayName.includes("Demand") && !sig.displayName.includes("Supply"))) {
//                                 sig.isActive = false; // पुराने ज़ोन डीएक्टिवेट करें

//                                 let isMitigated = false;
//                                 let startIdx = candles.findIndex(c => c.timestamp === sig.startTime);

//                                 if (startIdx !== -1) {
//                                     for (let j = startIdx + 3; j <= i; j++) {
//                                         // बुलिश ज़ोन के लिए चेकिंग
//                                         if (sig.trend === "BULLISH" && candles[j].low <= sig.priceTop) {
//                                             isMitigated = true;
//                                             break;
//                                         }
//                                         // बेयरिश ज़ोन के लिए चेकिंग
//                                         if (sig.trend === "BEARISH" && candles[j].high >= sig.priceBottom) {
//                                             isMitigated = true;
//                                             break;
//                                         }
//                                     }
//                                 }

//                                 // 🎯 सिर्फ अनमिटिगेटेड ज़ोन्स का नाम उनके ट्रेंड के हिसाब से बदलें
//                                 if (!isMitigated) {
//                                     if (sig.trend === "BULLISH") {
//                                         if (sig.type === "E-OB" || sig.type === "D-OB") sig.displayName = "Demand Zone(OB)";
//                                         if (sig.type === "E-OF" || sig.type === "D-OF") sig.displayName = "Demand Zone(OF)";
//                                     } else if (sig.trend === "BEARISH") {
//                                         if (sig.type === "E-OB" || sig.type === "D-OB") sig.displayName = "Supply Zone(OB)";
//                                         if (sig.type === "E-OF" || sig.type === "D-OF") sig.displayName = "Supply Zone(OF)";
//                                     }
//                                 }
//                             }
//                         }
//                     });

//                     // 🔥 3. THE VISUAL FIX & DISCOUNT POI FILTER
//                     let eqFilter_Bearish = null;
//                     let strictEqFilter_Bearish = null; // 🛡️ NEW: True Anchor for Strict Mode
                    
//                     if (structureMode === "DISCOUNTED") {
//                         // Shifted Anchor (Normal E-OB के लिए)
//                         let currentTopForFilter = refSwingHH_Dis_Bearish ? refSwingHH_Dis_Bearish : lockedSwingHigh;
//                         eqFilter_Bearish = calculateEquilibrium(
//                             currentTopForFilter ? currentTopForFilter.price : absoluteHighest.price, 
//                             validLL.price
//                         );
                        
//                         // True Origin Anchor (Strict D-OB के लिए)
//                         strictEqFilter_Bearish = calculateEquilibrium(
//                             lockedSwingHigh ? lockedSwingHigh.price : absoluteHighest.price, 
//                             validLL.price
//                         );
//                     }
//                     const isValidPremium = (bottomPrice) => structureMode !== "DISCOUNTED" || !eqFilter_Bearish || bottomPrice >= eqFilter_Bearish;
                    
//                     const isStrictPremium = (bottomPrice) => structureMode !== "DISCOUNTED" || !strictEqFilter_Bearish || bottomPrice >= strictEqFilter_Bearish;

//                     if (poiZones.eof && !poiZones.eof.isMitigated && isValidPremium(poiZones.eof.bottom)) {
//                         let mitTimeEOF = findMitigationTime_Bearish(poiZones.eof.bottom, i, candles);
//                         signals.push({ type: "E-OF", displayName: "E-OF", trend: "BEARISH", priceTop: poiZones.eof.top, priceBottom: poiZones.eof.bottom, startTime: poiZones.eof.startTime, endTime: mitTimeEOF, isActive: true });
//                     }
//                     if (poiZones.eob && isValidPremium(poiZones.eob.bottom)) {
//                         let mitTimeEOB = findMitigationTime_Bearish(poiZones.eob.bottom, i, candles);
//                         signals.push({ type: "E-OB", displayName: "E-OB", trend: "BEARISH", priceTop: poiZones.eob.top, priceBottom: poiZones.eob.bottom, startTime: poiZones.eob.startTime, fvgTop: poiZones.eob.fvgTop, fvgBottom: poiZones.eob.fvgBottom, endTime: mitTimeEOB, isActive: true });
//                     }

//                     // 🔥 THE FIX: D-OB अब असली 50% (Origin) से ही नापा जाएगा!
//                     if (poiZones.dof && !poiZones.dof.isMitigated && (!strictDecisional || isStrictPremium(poiZones.dof.bottom))) {
//                         let mitTimeDOF = findMitigationTime_Bearish(poiZones.dof.bottom, i, candles);
//                         signals.push({ type: "D-OF", displayName: "D-OF", trend: "BEARISH", priceTop: poiZones.dof.top, priceBottom: poiZones.dof.bottom, startTime: poiZones.dof.startTime, endTime: mitTimeDOF, isActive: true });
//                     }
//                     if (poiZones.dob && (!strictDecisional || isStrictPremium(poiZones.dob.bottom))) {
//                         let mitTimeDOB = findMitigationTime_Bearish(poiZones.dob.bottom, i, candles);
//                         signals.push({ type: "D-OB", displayName: "D-OB", trend: "BEARISH", priceTop: poiZones.dob.top, priceBottom: poiZones.dob.bottom, startTime: poiZones.dob.startTime, fvgTop: poiZones.dob.fvgTop, fvgBottom: poiZones.dob.fvgBottom, endTime: mitTimeDOB, isActive: true });
//                     }

//                     bearishPullbacks = [];
//                     tempPullbackTracker_Bearish = null;
//                     confirmedLH = null;
//                 } // <--- 🔥 Else ब्लॉक यहाँ एकदम परफेक्टली बंद हुआ
//             }

//             // 🎯 New High before BOS (Unlock Tracker)
//             if (isIdmTaken && curr.high > tempSwingHigh.price) {
//                 tempSwingHigh = { price: curr.high, time: curr.timestamp };
//                 bearishPullbacks = []; // 🎯 Added
//                 refLL = null;
//                 tempPullbackTracker_Bearish = null; // 🎯 Added
//             }

//             // =========================================================================
//             // 🔥 DISCOUNTED MODE: IDM(Dis) & 50% TRACKER (BEARISH)
//             // =========================================================================
//             // अगर मार्केट बिना ट्रैप के नया इंटरनल हाई बनाता है, तो एंकर को उसी हाई पर शिफ्ट कर दो!
//             if (structureMode === "DISCOUNTED" && refSwingHH_Dis_Bearish && !isIdmTransferred) {
//                 if (curr.high > refSwingHH_Dis_Bearish.price) {
//                     refSwingHH_Dis_Bearish = { price: curr.high, time: curr.timestamp };
//                 }
//             }

//             if (structureMode === "DISCOUNTED") {
//                 let currentTop = refSwingHH_Dis_Bearish ? refSwingHH_Dis_Bearish : lockedSwingHigh;
                
//                 if (isIdmTaken && validLL && currentTop) {
//                     let eqLevel_Bearish = calculateEquilibrium(currentTop.price, validLL.price);
                    
//                     // ✅ THE FIX: जब 50% टैप हो तो पुराने IDM को IDM(Dis) में बदल दें!
//                     if (curr.high >= eqLevel_Bearish && !isIdmTaken_Dis_Bearish) {
//                         is50PercentTapped_Bearish = true;
//                         isIdmTaken_Dis_Bearish = true; // 🔥 बेयरिश IDM(Dis) वैलिड!

//                         // 🎯 1. एरे में पीछे जाओ और सबसे ताज़ा 'IDM' को ढूंढकर उसका नाम बदल दो
//                         for (let s = signals.length - 1; s >= 0; s--) {
//                             if ((signals[s].type === "IDM" || signals[s].type === "IDM/ch" || signals[s].type === "IDM-T") && signals[s].trend === "BEARISH") {
//                                 signals[s].displayName = (signals[s].type === "IDM/ch") ? "IDM/ch(Dis)" : "IDM(Dis)";
//                                 signals[s].type = "IDM(Dis)"; // 🔥 Type अपडेट करना ज़रूरी है ताकि BOS को IDM मिल सके!
//                                 break; // एक बार मिल गया तो लूप रोक दो
//                             }
//                         }

//                         // 🎯 2. VISUAL ANCHORS: Swing LH और LL के मार्कर ड्रा करो
//                         signals.push({ 
//                             type: "ANCHOR", displayName: "LH(Dis)-Ref", trend: "BEARISH", // 🔥 नाम बदल दिया
//                             price: currentTop.price, startTime: currentTop.time, endTime: currentTop.time,
//                             position: "aboveBar" 
//                         });
                        
//                         signals.push({ 
//                             type: "ANCHOR", displayName: "LL(Dis)", trend: "BEARISH", 
//                             price: validLL.price, startTime: validLL.time, endTime: validLL.time,
//                             position: "belowBar" // कैंडल के नीचे दिखेगा
//                         });
//                     }
//                 }
                
//                 // 🏃‍♂️ रनअवे लॉजिक (Shifting Logic) - इसे बिल्कुल मत हटाना!
//                 if (newBOS_Detected && !is50PercentTapped_Bearish) {
//                     refSwingHH_Dis_Bearish = { ...tempSwingHigh }; // एंकर शिफ्ट!
//                 }
//             }
//             // ========================================================================

//             // RULE 3 & 6a: BOS & Sweep Logic (BEARISH)
//             if (isIdmTaken && validLL !== null) {
//                 let breakLevel = refX_BOS_Bearish ? refX_BOS_Bearish.price : validLL.price;

//                 if (curr.low < breakLevel) {
//                     if (curr.close < breakLevel) { // 🚀 Full Body Break

//                         let newBOS_Detected = true; // इंजन को पता चले कि BOS हुआ है

//                         // 🔥 DISCOUNTED MODE GATEKEEPER
//                         let canPushBOS = (structureMode === "DISCOUNTED") ? (isIdmTaken_Dis_Bearish === true) : true;
                        
//                         signals.push({
//                             type: "BOS", 
//                             trend: "BEARISH",
//                             price: validLL.price,
//                             startTime: validLL.time,
//                             endTime: curr.timestamp,
//                             displayName: (structureMode === "DISCOUNTED") ? (canPushBOS ? "BOS(Dis)" : "BOS") : "BOS", 
//                             isHistorical: !canPushBOS 
//                         });

//                         // ❌ (यहाँ से IDM-T का गलत कोड हटा दिया गया है)

//                         // 🔥 THE FIX: Reset Discounted Trackers (नया Rule: BOS(Dis) होते ही रेंज फ्रेश हो जाती है)
//                         if (canPushBOS && structureMode === "DISCOUNTED") {
//                             // 1. LL(Dis) और BOS ब्रेकआउट कैंडल के बीच का सबसे ऊँचा पॉइंट ढूँढें
//                             let legStartIdx = candles.findIndex(c => c.timestamp === validLL.time);
//                             let trueLH = { price: -Infinity, time: null };
                            
//                             if (legStartIdx !== -1) {
//                                 for (let k = legStartIdx; k <= i; k++) {
//                                     if (candles[k].high > trueLH.price) {
//                                         trueLH = { price: candles[k].high, time: candles[k].timestamp };
//                                     }
//                                 }
//                             }

//                             // 2. पुराने सारे "LH(Dis)-Ref" लेबल्स को चार्ट से साफ़ कर दें
//                             signals = signals.filter(sig => !(sig.type === "ANCHOR" && sig.displayName === "LH(Dis)-Ref" && sig.trend === "BEARISH"));

//                             // 3. असली "LH(Dis)" को सबसे हाईएस्ट पॉइंट पर ड्रा करें
//                             if (trueLH.time) {
//                                 signals.push({ 
//                                     type: "ANCHOR", displayName: "LH(Dis)", trend: "BEARISH", 
//                                     price: trueLH.price, startTime: trueLH.time, endTime: trueLH.time,
//                                     position: "aboveBar" 
//                                 });
//                             }

//                             // 4. ट्रैकर्स को रीसेट करें
//                             isIdmTaken_Dis_Bearish = false;
//                             is50PercentTapped_Bearish = false;
//                             refSwingHH_Dis_Bearish = { ...tempSwingHigh }; 
//                         }

//                         // =========================================================================
//                         // 🧠 DISCOUNTED MODE: THE 3 CONDITIONS GATEKEEPER (BEARISH)
//                         // =========================================================================
//                         if (structureMode === "DISCOUNTED") {
//                             if (!is50PercentTapped_Bearish) {
//                                 // ❌ 50% टैप नहीं हुआ! (Runaway Trend)
                                
//                                 // अगर मार्केट बिना 50% छुए गिर रहा है, तो दादाजी को नीचे खिसका लाओ!
//                                 if (refSwingHH_Dis_Bearish) { 
//                                     lockedSwingHigh = { ...refSwingHH_Dis_Bearish }; 
//                                 }

//                                 // 🔄 Naye Wave ke liye Trackers Shift karo
//                                 refSwingHH_Dis_Bearish = { ...tempSwingHigh }; 
                                
//                                 // 🌫️ Fade Internal Noise
//                                 signals.forEach(sig => {
//                                     let sigStart = sig.startTime || sig.time;
//                                     if (lockedSwingHigh && sigStart > lockedSwingHigh.time) { 
//                                         if (["E-OB", "E-OF"].includes(sig.type)) { 
//                                             sig.isHistorical = true;
//                                             sig.isActive = false;
//                                         }
//                                     }
//                                 });

//                                 // 🧹 Cleanup & Skip BOS (Zombie Bug Fix)
//                                 isIdmTaken = false; 
//                                 validLL = null; 
//                                 refLL = null; 
//                                 refX_BOS_Bearish = null;
//                                 tempSwingHigh = { price: curr.high, time: curr.timestamp }; 
//                                 continue;
//                             } else {
//                                 // ✅ Condition 1: Perfect 50% Tapped & Breakout! (Valid BOS Dis)
//                                 is50PercentTapped_Bearish = false; 
//                                 isIdmTaken_Dis_Bearish = false;
//                                 refSwingHH_Dis_Bearish = { ...tempSwingHigh }; 
//                             }
//                         }
//                         // =========================================================================

//                         if (refX_CHoCH_Bearish) {
//                             signals.push({ type: "X", trend: "BEARISH", sweptSide: "HIGH", price: lockedSwingHigh.price, startTime: lockedSwingHigh.time, endTime: refX_CHoCH_Bearish.time });
//                             refX_CHoCH_Bearish = null;
//                         }

//                         // 🔥 दादाजी को सेव करो!
//                         prevLockedSwingHigh = { ...lockedSwingHigh }; 
//                         lockedSwingHigh = { ...tempSwingHigh };
//                         isIdmTaken = false;
//                         wipeCounterStructure();
//                         validLL = null; refLL = null; refX_BOS_Bearish = null;

//                         // 🔥 RETRO-SCANNER INJECTION: BOS के पहले वाले Bearish पुलबैक्स ढूँढो
//                         let startIdx = candles.findIndex(c => c.timestamp === lockedSwingHigh.time);
//                         let retroPBs = scanRetroactivePullbacks(startIdx, i, candles, "BEARISH");
//                         confirmedLH = retroPBs.length > 0 ? retroPBs[retroPBs.length - 1] : null;

//                         bearishPullbacks = [];
//                         tempPullbackTracker_Bearish = null;
//                         absoluteLowest = { price: curr.low, time: curr.timestamp };

//                     } else { // 🧹 Sweep (Ref X)
//                         // 🔥 THE NULL FIX: Ensure majorIdmTarget doesn't crash if null
//                         let safeIdmTarget = majorIdm_Bearish ? { ...majorIdm_Bearish } : { price: -Infinity, time: curr.timestamp };
//                         refX_BOS_Bearish = { price: curr.low, time: curr.timestamp, majorIdmTarget: safeIdmTarget };
//                     }
//                 }

//                 if (refX_BOS_Bearish && refX_BOS_Bearish.majorIdmTarget) {
//                     if (curr.high > refX_BOS_Bearish.majorIdmTarget.price) {
//                       // 🌟 NAYA CODE: IDM TRANSFER FADE FIX 🌟
//                         let waveStartBearish = lockedSwingHigh ? lockedSwingHigh.time : absoluteHighest.time;
//                         for (let s = signals.length - 1; s >= 0; s--) {
//                             if (signals[s].startTime < waveStartBearish) break;
//                             if (signals[s].trend === "BEARISH" && (signals[s].type.includes("IDM") || signals[s].type === "McM(X)")) {
//                                 signals[s].isHistorical = true;
//                             }
//                         }

//                         signals.push({ type: "IDM", trend: "BEARISH", price: refX_BOS_Bearish.majorIdmTarget.price, startTime: refX_BOS_Bearish.majorIdmTarget.time, endTime: curr.timestamp });
//                         // 🔥 THE NULL FIX: Ensure validLL is not null here
//                         if (validLL) {
//                             signals.push({ type: "X", trend: "BEARISH", sweptSide: "LOW", price: validLL.price, startTime: validLL.time, endTime: refX_BOS_Bearish.time });
//                         }
                        
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

            

//              // 🎯 5. IDM(S2D) HIT & ZONE GENERATION!
//                 // 🔥 THE NEW TECHNICAL COUNTER LOGIC (Fake CHoCH / Transfer)
//                 let isTechnicalBreak_S2D = false;
//                 if ((structureMode === "TECHNICAL" || structureMode === "DISCOUNTED") && confirmedHL_S2D !== null && refHH_S2D !== null) {
//                     if (curr.close > refHH_S2D.price) {
//                         isTechnicalBreak_S2D = true; // 🚀 बिना IDM लिए ऊपर का लेवल तोड़ दिया!
//                     }
//                 }

//                 if (confirmedHL_S2D !== null && (curr.low <= confirmedHL_S2D.price || isTechnicalBreak_S2D)) {
                    
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
//                         validHH_S2D = { 
//                             price: refHH_S2D ? refHH_S2D.price : curr.high, 
//                             time: refHH_S2D ? refHH_S2D.time : curr.timestamp 
//                         };
//                         tempSwingLow_S2D = { price: curr.low, time: curr.timestamp };

//                         // 🎯 Technical Break है तो IDM(T-C) छापो, वरना नॉर्मल IDM(S2D)
//                         if (isTechnicalBreak_S2D) {
//                             signals.push({ 
//                                 type: "IDM(T)", trend: "BULLISH_COUNTER", 
//                                 price: confirmedHL_S2D.price, startTime: confirmedHL_S2D.time, 
//                                 endTime: curr.timestamp, sweptSide: "HIGH", position: "belowBar",
//                                 displayName: "IDM(T-C)" // 🔥 (C) लगाने से मास्टर फ़िल्टर इसे काउंटर समझेगा
//                             });
//                         } else {
//                             signals.push({ 
//                                 type: "IDM(S2D)", trend: "BULLISH_COUNTER", 
//                                 price: confirmedHL_S2D.price, startTime: confirmedHL_S2D.time, 
//                                 endTime: curr.timestamp, sweptSide: "LOW", position: "bottom"  
//                             });
//                         }

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
                            
//                             // 🎯 THE UI FIX: अगर "Strict (Extreme Only)" चालू है, तभी इस विशाल Root को जोड़ें!
//                             if (strictCounter) {
//                                 s2dPullbacks.unshift({
//                                     id: "ROOT_SWING_HL",
//                                     validHL: candles[startIdx_S2D].low,
//                                     validHLCandleIndex: startIdx_S2D,
//                                     confirmHH: rootConfirmHH,
//                                     confirmHHCandleIndex: endIdx_S2D,
//                                     breakCandleIndex: endIdx_S2D, 
//                                     startTime: candles[startIdx_S2D].timestamp
//                                 });
//                             }
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
//                             activeEof_S2D = { type: "E-OF", displayName: "E-S2D(OF)", trend: "BULLISH", priceTop: poiZones_S2D.eof.top, priceBottom: poiZones_S2D.eof.bottom, startTime: poiZones_S2D.eof.startTime, endTime: mitTimeEof, isActive: true };
//                             signals.push(activeEof_S2D);
//                         }
//                         if (poiZones_S2D.eob) {
//                             let mitTimeEob = findMitigationTime(poiZones_S2D.eob.top, i, candles);
//                             activeEob_S2D = { type: "E-OB", displayName: "E-S2D(OB)", trend: "BULLISH", priceTop: poiZones_S2D.eob.top, priceBottom: poiZones_S2D.eob.bottom, startTime: poiZones_S2D.eob.startTime, fvgTop: poiZones_S2D.eob.fvgTop, fvgBottom: poiZones_S2D.eob.fvgBottom, endTime: mitTimeEob, isActive: true };
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
//                             // 🧹 THE FIX: अगर Strict Mode है तभी चार्ट साफ करो, 'Every Pullback' मोड में सब दिखने दो!
//                             if (strictCounter) {
//                                 signals = signals.filter(s => 
//                                     s !== activeDob_S2D && s !== activeDof_S2D && 
//                                     s !== activeEob_S2D && s !== activeEof_S2D
//                                 );
//                             }
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

//             // 🔥 1. INITIALIZE DISCOUNTED ANCHOR (बुलिश दादाजी सेट करें)
//             if (refSwingHL_Dis_Bullish === null && absoluteLowest) {
//                 refSwingHL_Dis_Bullish = { ...absoluteLowest };
//             }

//             // 🔥 2. DEBUG & TAPPING LOGIC (Discounted Mode)
//             if (structureMode === "DISCOUNTED") {
//                 let currentBottom = refSwingHL_Dis_Bullish ? refSwingHL_Dis_Bullish : lockedSwingLow;
//                 if (isIdmTaken && validHH && currentBottom) {
//                     // बुलिश में Valid HH (Top) और Current Bottom का 50% निकालते हैं
//                     let eqLevel = calculateEquilibrium(validHH.price, currentBottom.price);
                    
//                     // अगर मार्केट 50% या उससे नीचे (Discount zone) आ गया है, तो Tapped = true
//                     if (curr.low <= eqLevel) is50PercentTapped_Bullish = true;
//                 }
                
//                 // रनअवे ट्रेंड शिफ्टिंग लॉजिक (Condition 2B)
//                 // अगर नया BOS हुआ लेकिन 50% टैप नहीं हुआ, तो एंकर शिफ्ट करो
//                 if (newBOS_Detected && !is50PercentTapped_Bullish) {
//                     refSwingHL_Dis_Bullish = { ...tempSwingLow }; // एंकर को नए लो पर खिसका दिया
//                 }
//             }

//             // 🔥 SMART AUTO FIX & 1st E-OB FAILURE LOGIC: 
//             if (lockedSwingLow === null && curr.close < prevAbsoluteLowest) {
                
//                 signals.push({
//                     type: "CHoCH", trend: "BEARISH",
//                     sweptSide: "LOW",
//                     price: prevAbsoluteLowest, 
//                     startTime: absoluteLowest.time,
//                     endTime: curr.timestamp,
//                     // 🔥 THE FIX: Yahan displayName add kiya taaki Filter isey hide na kare
//                     displayName: (structureMode === "DISCOUNTED") ? "CHoCH(Dis)" : "CHoCH",
//                     isHistorical: false
//                 });
//                 trend = -1;
//                 isIdmTaken = false;
//                 wipeCounterStructure();
//                 resetDiscountedTrackers();

//                 // 🔥 THE MISSING ANCHOR FIX: बेयरिश के लिए नया टॉप लॉक करो!
//                 lockedSwingHigh = { ...absoluteHighest }; 
//                 lockedSwingLow = null;

//                 validHH = null; refHH = null; tempSwingLow = null; confirmedHL = null;

//                 bullishPullbacks = [];
//                 tempPullbackTracker = null;

//                 absoluteHighest = { price: curr.high, time: curr.timestamp }; 
//                 refCandle = curr;
//                 continue;
//             }

//             if (isIdmTaken) {
//                 if (curr.low < majorIdm_Bullish.price) majorIdm_Bullish = { price: curr.low, time: curr.timestamp };
//             }

//             // RULE 5 & 6c: CHoCH & Sweep Logic (BULLISH TO BEARISH)
//             if (lockedSwingLow !== null) {
//                 let breakLevel = refX_CHoCH_Bullish ? refX_CHoCH_Bullish.price : lockedSwingLow.price;

//                 if (curr.low < breakLevel) { // 🎯 बुलिश में लो (Low) टूटेगा
//                     if (curr.close < breakLevel) { // 🚀 Full Body Break (Valid Breakout)

//                         // 🔥 THE PERFECT GAP-AWARE VALIDATOR (NO INTERNAL NOISE) 🔥
//                         let isGapBreak_Bullish = (candles[i-1] && candles[i-1].close >= breakLevel && curr.open < breakLevel);
                        
//                         let isTrap = false;
                        
//                         // 🌟 THE STRICT RULE: अगर IDM नहीं लिया है, तो यह 100% Trap (IDM-T) है!
//                         if (!isIdmTaken) {
//                             isTrap = true; 
                            
//                             // सिर्फ गैप-डाउन (Gap Down) के केस में भविष्य चेक करो
//                             if (isGapBreak_Bullish) {
//                                 let futurePBs = scanRetroactivePullbacks(i, Math.min(i + 150, candles.length - 1), candles, "BEARISH");
//                                 if (futurePBs.length > 0) isTrap = false; // Valid Gap CHoCH
//                             }
//                         }

//                         // =======================================================
//                         // 🧠 FAKE CHoCH TRAP (IDM-T TRANSFER LOGIC)
//                         // =======================================================
//                         if (isTrap) {
//                             isIdmTaken = true;
//                             isIdmTransferred = true; // 🛑 IDM-T State Active

//                             if (structureMode === "DISCOUNTED") {
//                                 isIdmTaken_Dis_Bullish = false; // 50% का इंतज़ार करो
//                             }
                            
//                             let bosDisRemoved = false, hhDisRemoved = false, hlDisRemoved = false, eobDemoted = false;
//                             for (let k = signals.length - 1; k >= 0; k--) {
//                                 let sig = signals[k];
//                                 if (!bosDisRemoved && sig.type === "BOS" && sig.trend === "BULLISH" && sig.displayName === "BOS(Dis)") {
//                                     signals.splice(k, 1); bosDisRemoved = true; continue;
//                                 }
//                                 if (!hlDisRemoved && sig.type === "ANCHOR" && sig.displayName === "HL(Dis)") {
//                                     signals.splice(k, 1); hlDisRemoved = true; continue;
//                                 }
//                                 if (!hhDisRemoved && sig.type === "ANCHOR" && sig.displayName === "HH(Dis)") {
//                                     signals.splice(k, 1); hhDisRemoved = true; continue;
//                                 }
//                                 if (!eobDemoted && sig.type === "E-OB" && sig.trend === "BULLISH") {
//                                     sig.type = "D-OB"; sig.displayName = "Demand Zone(D-OB)"; eobDemoted = true;
//                                 }
//                                 if (bosDisRemoved && hlDisRemoved && hhDisRemoved && eobDemoted) break;
//                             }
                            
//                             // 🔥 THE GHOST BUG FIX: हमेशा "IDM-T" भेजो ताकि Frontend उसे दिखा सके!
//                             let pushLabel = "IDM-T"; 
                            
//                             // 🔥 CHANCHAL BHAI'S ADVANCED IDM-T SHIFTING LOGIC (Condition 1 & 2) 🔥
//                             let idmT_Price = breakLevel; // Default: Condition 1 (जहाँ Swing HL टूटा)
                            
//                             // Condition 2: अगर Engulfing है तो Shift कर दो
//                             if (typeof isEngulfingBreakout !== 'undefined' && isEngulfingBreakout) {
//                                 idmT_Price = candles[i-1].low; // Shift to previous Low
//                             }
                            
//                             let waveStartBullish = lockedSwingLow.time;
//                             for (let s = signals.length - 1; s >= 0; s--) {
//                                 if (signals[s].startTime < waveStartBullish) break;
//                                 if (signals[s].trend === "BULLISH" && (signals[s].type.includes("IDM") || signals[s].type === "McM(X)")) {
//                                     signals[s].isHistorical = true;
//                                 }
//                             }

//                             // 🎯 IDM-T Draw (Dynamic Price के साथ)
//                             signals.push({ 
//                                 type: pushLabel, trend: "BULLISH", 
//                                 price: idmT_Price, // 🎯 Dynamic Price Shift
//                                 startTime: lockedSwingLow.time, endTime: curr.timestamp,
//                                 displayName: pushLabel 
//                             });

//                             // 🔥 IDM-T बनते ही HH(Dis)-Ref ड्रा करें!
//                             if (structureMode === "DISCOUNTED") {
//                                 signals.push({
//                                     type: "ANCHOR", displayName: "HH(Dis)-Ref", trend: "BULLISH",
//                                     price: absoluteHighest.price, startTime: absoluteHighest.time, endTime: absoluteHighest.time,
//                                     position: "aboveBar"
//                                 });
//                             }
                            
//                             validHH = { ...absoluteHighest };
//                             tempSwingLow = { price: curr.low, time: curr.timestamp };
//                             majorIdm_Bullish = { price: curr.low, time: curr.timestamp };
//                             lockedSwingLow = prevLockedSwingLow ? { ...prevLockedSwingLow } : null;
//                             if (structureMode === "DISCOUNTED") {
//                                 refSwingHL_Dis_Bullish = prevLockedSwingLow ? { ...prevLockedSwingLow } : null;
//                             }
//                             refX_CHoCH_Bullish = null; 
//                             continue; // 🛑 लूप घुमाओ, CHoCH मत छापो!
//                         }

//                         // =======================================================
//                         // ✅ NORMAL CHoCH LOGIC (TRUE TREND SHIFT)
//                         // =======================================================
//                         let isMajorCHoCH = (structureMode === "DISCOUNTED") ? isIdmTaken_Dis_Bullish : true;
//                         let isTrueMajorCHoCH = true;
//                         if (structureMode === "DISCOUNTED") {
//                             isTrueMajorCHoCH = (!refSwingHL_Dis_Bullish || lockedSwingLow.time === refSwingHL_Dis_Bullish.time);
//                         }
                        
//                         if (structureMode === "DISCOUNTED") {
//                             let elementsToRemove = new Set();
//                             for (let k = signals.length - 1; k >= 0; k--) {
//                                 let sig = signals[k];
                                
//                                 // 🔥 THE BOUNDARY FIX: जहाँ से ये वेव शुरू हुई थी (lockedSwingLow), वहाँ पहुँचते ही सफाई रोक दो!
//                                 // इससे पुराना HL(Dis), HH(Dis) और BOS(Dis) डिलीट होने से बच जाएगा!
//                                 if (sig.startTime <= lockedSwingLow.time) break;
//                                 if (sig.displayName === "BOS(Dis)" || sig.displayName === "CHoCH(Dis)") break;
                                
//                                 if (sig.trend === "BULLISH") {
//                                     if (sig.type === "ANCHOR" && (sig.displayName === "HL(Dis)" || sig.displayName === "HH(Dis)" || sig.displayName === "HL(Dis)-Ref" || sig.displayName === "HH(Dis)-Ref")) elementsToRemove.add(k);
//                                     if (sig.type === "E-OB") { sig.type = "D-OB"; sig.displayName = "Demand Zone(D-OB)"; }
//                                 }
//                             }
//                             signals = signals.filter((_, idx) => !elementsToRemove.has(idx));

//                             // 🔥 CHANCHAL BHAI'S PEAK FIX: बुलिश वेव के सबसे टॉप पॉइंट को LH(Dis) में बदल दो!
//                             if (isTrueMajorCHoCH) {
//                                 signals.push({
//                                     type: "ANCHOR", displayName: "LH(Dis)", trend: "BEARISH",
//                                     price: absoluteHighest.price, startTime: absoluteHighest.time, endTime: absoluteHighest.time,
//                                     position: "aboveBar"
//                                 });
//                             }
//                         }

//                         if (structureMode === "TECHNICAL" || structureMode === "DISCOUNTED") {
//                             signals.forEach(sig => {
//                                 let sigStart = sig.startTime || sig.time;
//                                 let sigEnd = sig.endTime || sig.time;
//                                 if (sigStart >= lockedSwingLow.time && sigEnd <= curr.timestamp) {
//                                     if (sig.type !== "BOS" && sig.type !== "CHoCH") sig.isHistorical = true;
//                                     if (["E-OB", "D-OB", "E-OF", "D-OF"].includes(sig.type)) sig.isActive = false;
//                                 }
//                             });
//                         }

//                         signals.push({
//                             type: "CHoCH", trend: "BEARISH", sweptSide: "LOW",
//                             price: breakLevel, startTime: lockedSwingLow.time, endTime: curr.timestamp,
//                             displayName: (structureMode === "DISCOUNTED") ? (isTrueMajorCHoCH ? "CHoCH(Dis)" : "") : "CHoCH",
//                             isHistorical: !isTrueMajorCHoCH,
//                             isHidden: (structureMode === "DISCOUNTED" && !isTrueMajorCHoCH)
//                         });

//                         // 3. बाकि सारा Logic वही रहेगा (Trend Shift Setup)
//                         trend = -1; // 🎯 बुलिश से बेयरिश हो गया
//                         isIdmTaken = false;
//                         wipeCounterStructure();
//                         resetDiscountedTrackers();

//                         // बेयरिश के लिए नया टॉप लॉक करो और बुलिश वेरिएबल्स साफ करो
//                         lockedSwingHigh = { ...absoluteHighest };
//                         lockedSwingLow = null; 
                        
//                         validHH = null; refHH = null; tempSwingLow = null; 
//                         refX_CHoCH_Bullish = null; refX_BOS_Bullish = null;
//                         bullishPullbacks = []; tempPullbackTracker = null;
                        
//                         // बेयरिश ट्रैकर इनिशियलाइज़ करो
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
//            if (brokeLow && !isOutsideBar && refHH === null) { 
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


//             // 🎯 THE FINAL IDM CONFIRMATION & DEMAND ZONE TRANSFORMATION
//             if (confirmedHL !== null && curr.low <= confirmedHL.price && !isIdmTaken) {
                
//                 // 🔥 THE SINGLE CANDLE ENGULFING (IDM + BOS) FIX 🔥
//                 let expectedBreakLevel = refX_BOS_Bullish ? refX_BOS_Bullish.price : absoluteHighest.price;
                
//                 // 🔥 THE SCOPE FIX: poiZones को एकदम ऊपर डिक्लेयर करो!
//                 let poiZones = { eof: null, eob: null, dof: null, dob: null };

//                 // अगर एक ही कैंडल नीचे IDM (HL) ले रही है और ऊपर HH भी तोड़ रही है!
//                 if (curr.high >= expectedBreakLevel) {
//                     // ❌ फेक कैंडल (स्किप करो)
//                     confirmedHL = null;
//                     bullishPullbacks = [];
//                     tempPullbackTracker = null;
//                 } 
//                 else {
//                     // ✅ नार्मल कैंडल है, तो पुराना पूरा लॉजिक चलने दो
//                     isIdmTaken = true;
//                     validHH = { ...absoluteHighest };
//                     tempSwingLow = { price: curr.low, time: curr.timestamp };
//                     majorIdm_Bullish = { price: curr.low, time: curr.timestamp };

//                     // ==========================================================
//                     // 🔥 THE McM(X) & IDM-OF LOGIC
//                     // ==========================================================
//                     let idmLabel = "IDM";
//                     const targetPb = bullishPullbacks.find(pb => pb.validHL === confirmedHL.price);

//                     if (targetPb) {
//                         // 🛡️ THE REAL SWEEP VERIFIER
//                         // चेक करो कि ब्रेक होने वाली कैंडल से लेकर अभी (IDM लेने वाली कैंडल) तक,
//                         // क्या किसी भी कैंडल ने Ref HH (confirmHH) के ऊपर फुल 'Close' किया है?
//                         let trueSweep = true;
//                         for (let k = targetPb.breakCandleIndex; k <= i; k++) {
//                             if (candles[k].close > targetPb.confirmHH) {
//                                 trueSweep = false; // ❌ Full body break मिल गया, यह स्वीप नहीं है!
//                                 break;
//                             }
//                         }

//                         if (trueSweep) {
//                             idmLabel = "IDM/ch"; 

//                             // 1. McM(X) लाइन ड्रा करें (टॉप पर)
//                             signals.push({ 
//                                 type: "McM(X)", 
//                                 trend: "BULLISH", 
//                                 sweptSide: "HIGH", 
//                                 price: targetPb.confirmHH, // Ref HH का प्राइस
//                                 startTime: targetPb.startTime, 
//                                 endTime: validHH.time  
//                             });

//                             // 2. IDM-OF (Order Flow) Box ड्रा करें
//                             let mitTimeIdmOf = findMitigationTime_Bearish(confirmedHL.price, i, candles);

//                             signals.push({ 
//                                 type: "IDM-OF", 
//                                 displayName: "IDM OF", 
//                                 trend: "BULLISH", 
//                                 priceTop: validHH.price, 
//                                 priceBottom: confirmedHL.price, 
//                                 startTime: validHH.time, 
//                                 endTime: mitTimeIdmOf, 
//                                 isActive: true 
//                             });
//                         }
//                     }

//                     // 🌟 NAYA CODE: IDM TRANSFER FADE FIX (पुराने IDMs को धुंधला करें) 🌟
//                     let waveStartBullish = lockedSwingLow ? lockedSwingLow.time : absoluteLowest.time;
//                     for (let s = signals.length - 1; s >= 0; s--) {
//                         if (signals[s].startTime < waveStartBullish) break; // पुरानी वेव में मत जाओ
//                         if (signals[s].trend === "BULLISH" && (signals[s].type.includes("IDM") || signals[s].type === "McM(X)")) {
//                             signals[s].isHistorical = true;
//                         }
//                     }

//                     // IDM या IDM/ch की लाइन ड्रा करें
//                     signals.push({ 
//                         type: idmLabel, 
//                         trend: "BULLISH", 
//                         price: confirmedHL.price, 
//                         startTime: confirmedHL.time, 
//                         endTime: curr.timestamp,
//                         displayName: idmLabel 
//                     });

//                     // ==========================================================
//                     // 🔥 THE ROOT EXTREME FIX (Null Crash Fix)
//                     // ==========================================================   
//                     const rootTime = lockedSwingLow ? lockedSwingLow.time : absoluteLowest.time;
//                     const rootPrice = lockedSwingLow ? lockedSwingLow.price : absoluteLowest.price;

//                     const swingHLIndex = candles.findIndex(c => c.timestamp === rootTime);
                    
//                     // 🛡️ THE NULL GUARD: अगर validHH मौजूद है, तभी अंदर का काम करो
//                     if (validHH !== null) {
//                         const refHHIndex = candles.findIndex(c => c.timestamp === validHH.time);

//                         // 🎯 THE E-OF SIZE FIX: स्कैनर से पहला पुलबैक निकालो
//                         let rootConfirmHH = validHH.price;
//                         let wavePullbacks = scanRetroactivePullbacks(swingHLIndex, refHHIndex, candles, "BULLISH");
//                         if (wavePullbacks.length > 0) {
//                             rootConfirmHH = wavePullbacks[0].confirmHH; // पहला पुलबैक का High
//                         }

//                         const rootExtreme = {
//                             id: "ROOT_SWING_HL",
//                             validHL: rootPrice,
//                             validHLCandleIndex: swingHLIndex,
//                             confirmHH: rootConfirmHH, // <--- परफेक्ट साइज़
//                             confirmHHCandleIndex: refHHIndex,
//                             breakCandleIndex: refHHIndex,
//                             startTime: rootTime
//                         };

//                         const validPullbacksForSMC = bullishPullbacks.filter(pb =>
//                             confirmedHL ? pb.validHL !== confirmedHL.price : true
//                         );

//                         if (swingHLIndex !== -1 && refHHIndex !== -1) {
//                             validPullbacksForSMC.unshift(rootExtreme);
//                         }

//                         // यहाँ 'const' नहीं लगेगा क्योंकि हमने इसे बाहर 'let' से बनाया है
//                         poiZones = findSMCZones(candles, validPullbacksForSMC, i);
//                     }

//                     // ==========================================================
//                     // 🔥 THE VISUAL FIX
//                     // ==========================================================

//                     // 1. जब नया IDM कन्फर्म होता है, तो 'signals' एरे में मौजूद पिछले सारे ज़ोन्स 'पुराने' बन जाते हैं।
//                     signals.forEach(sig => {
//                         if (["E-OB", "D-OB", "E-OF", "D-OF"].includes(sig.type)) {

//                             // 🔥 VIP PASS: Counter-Structure (S2D/D2S) ज़ोन्स को मेन इंजन के क्लिनअप से आज़ाद करो!
//                             if (sig.displayName && (sig.displayName.includes("S2D") || sig.displayName.includes("D2S"))) return;

//                             // अगर पहले से Demand/Supply नाम नहीं हुआ है, तभी चेक करो
//                             if (!sig.displayName || (!sig.displayName.includes("Demand") && !sig.displayName.includes("Supply"))) {
//                                 sig.isActive = false; // पुराने ज़ोन डीएक्टिवेट करें

//                                 let isMitigated = false;
//                                 let startIdx = candles.findIndex(c => c.timestamp === sig.startTime);

//                                 if (startIdx !== -1) {
//                                     for (let j = startIdx + 3; j <= i; j++) {
//                                         // बुलिश ज़ोन के लिए चेकिंग
//                                         if (sig.trend === "BULLISH" && candles[j].low <= sig.priceTop) {
//                                             isMitigated = true;
//                                             break;
//                                         }
//                                         // बेयरिश ज़ोन के लिए चेकिंग
//                                         if (sig.trend === "BEARISH" && candles[j].high >= sig.priceBottom) {
//                                             isMitigated = true;
//                                             break;
//                                         }
//                                     }
//                                 }

//                                 // 🎯 सिर्फ अनमिटिगेटेड ज़ोन्स का नाम उनके ट्रेंड के हिसाब से बदलें
//                                 if (!isMitigated) {
//                                     if (sig.trend === "BULLISH") {
//                                         if (sig.type === "E-OB" || sig.type === "D-OB") sig.displayName = "Demand Zone(OB)";
//                                         if (sig.type === "E-OF" || sig.type === "D-OF") sig.displayName = "Demand Zone(OF)";
//                                     } else if (sig.trend === "BEARISH") {
//                                         if (sig.type === "E-OB" || sig.type === "D-OB") sig.displayName = "Supply Zone(OB)";
//                                         if (sig.type === "E-OF" || sig.type === "D-OF") sig.displayName = "Supply Zone(OF)";
//                                     }
//                                 }
//                             }
//                         }
//                     });

//                     // 2. नए (Current Structure) ज़ोन्स को सिग्नल्स में पुश करें & DISCOUNT POI FILTER
//                     let eqFilter_Bullish = null;
//                     let strictEqFilter_Bullish = null; // 🛡️ NEW: True Anchor for Strict Mode
                    
//                     if (structureMode === "DISCOUNTED") {
//                         // Shifted Anchor (Normal E-OB के लिए)
//                         let currentBottomForFilter = refSwingHL_Dis_Bullish ? refSwingHL_Dis_Bullish : lockedSwingLow;
//                         eqFilter_Bullish = calculateEquilibrium(
//                             validHH.price,
//                             currentBottomForFilter ? currentBottomForFilter.price : absoluteLowest.price
//                         );
                        
//                         // True Origin Anchor (Strict D-OB के लिए)
//                         strictEqFilter_Bullish = calculateEquilibrium(
//                             validHH.price,
//                             lockedSwingLow ? lockedSwingLow.price : absoluteLowest.price
//                         );
//                     }
//                     const isValidDiscount = (topPrice) => structureMode !== "DISCOUNTED" || !eqFilter_Bullish || topPrice <= eqFilter_Bullish;
                    
//                     const isStrictDiscount = (topPrice) => structureMode !== "DISCOUNTED" || !strictEqFilter_Bullish || topPrice <= strictEqFilter_Bullish;

//                     if (poiZones.eof && !poiZones.eof.isMitigated && isValidDiscount(poiZones.eof.top)) {
//                         let mitTimeEOF = findMitigationTime(poiZones.eof.top, i, candles);
//                         signals.push({ type: "E-OF", displayName: "E-OF", trend: "BULLISH", priceTop: poiZones.eof.top, priceBottom: poiZones.eof.bottom, startTime: poiZones.eof.startTime, endTime: mitTimeEOF, isActive: true });
//                     }
//                     if (poiZones.eob && isValidDiscount(poiZones.eob.top)) {
//                         let mitTimeEOB = findMitigationTime(poiZones.eob.top, i, candles);
//                         signals.push({ type: "E-OB", displayName: "E-OB", trend: "BULLISH", priceTop: poiZones.eob.top, priceBottom: poiZones.eob.bottom, startTime: poiZones.eob.startTime, fvgTop: poiZones.eob.fvgTop, fvgBottom: poiZones.eob.fvgBottom, endTime: mitTimeEOB, isActive: true });
//                     }

//                     // 🔥 THE FIX: D-OB अब असली 50% (Origin) से ही नापा जाएगा!
//                     if (poiZones.dof && !poiZones.dof.isMitigated && (!strictDecisional || isStrictDiscount(poiZones.dof.top))) {
//                         let mitTimeDOF = findMitigationTime(poiZones.dof.top, i, candles);
//                         signals.push({ type: "D-OF", displayName: "D-OF", trend: "BULLISH", priceTop: poiZones.dof.top, priceBottom: poiZones.dof.bottom, startTime: poiZones.dof.startTime, endTime: mitTimeDOF, isActive: true });
//                     }
//                     if (poiZones.dob && (!strictDecisional || isStrictDiscount(poiZones.dob.top))) {
//                         let mitTimeDOB = findMitigationTime(poiZones.dob.top, i, candles);
//                         signals.push({ type: "D-OB", displayName: "D-OB", trend: "BULLISH", priceTop: poiZones.dob.top, priceBottom: poiZones.dob.bottom, startTime: poiZones.dob.startTime, fvgTop: poiZones.dob.fvgTop, fvgBottom: poiZones.dob.fvgBottom, endTime: mitTimeDOB, isActive: true });
//                     }

//                     bullishPullbacks = [];
//                     tempPullbackTracker = null;
//                     confirmedHL = null;
//                 } // <--- 🔥 Else ब्लॉक यहाँ एकदम परफेक्टली बंद हुआ
//             }

//             if (isIdmTaken && curr.low < tempSwingLow.price) {
//                 tempSwingLow = { price: curr.low, time: curr.timestamp };

//                 bullishPullbacks = [];
//                 refHH = null; // ट्रैकर अनलॉक!
//                 tempPullbackTracker = null;
//             }
           

//             // =========================================================================
//             // 🔥 DISCOUNTED MODE: IDM(Dis) & 50% TRACKER (BULLISH)
//             // =========================================================================
//             // अगर मार्केट बिना ट्रैप के नया इंटरनल लो बनाता है, तो एंकर को उसी लो पर शिफ्ट कर दो!
//             if (structureMode === "DISCOUNTED" && refSwingHL_Dis_Bullish && !isIdmTransferred) {
//                 if (curr.low < refSwingHL_Dis_Bullish.price) {
//                     refSwingHL_Dis_Bullish = { price: curr.low, time: curr.timestamp };
//                 }
//             }
            
//             if (structureMode === "DISCOUNTED") {
//                 let currentBottom = refSwingHL_Dis_Bullish ? refSwingHL_Dis_Bullish : lockedSwingLow;
                
//                 if (isIdmTaken && validHH && currentBottom) {
//                     let eqLevel = calculateEquilibrium(validHH.price, currentBottom.price);
                    
//                     // ✅ THE FIX: जब 50% टैप हो तो पुराने IDM को IDM(Dis) में बदल दें!
//                     if (curr.low <= eqLevel && !isIdmTaken_Dis_Bullish) {
//                         is50PercentTapped_Bullish = true;
//                         isIdmTaken_Dis_Bullish = true; // 🔥 बुलिश IDM(Dis) वैलिड!

//                         // 🎯 1. एरे में पीछे जाओ और सबसे ताज़ा 'IDM' को ढूंढकर उसका नाम बदल दो
//                         for (let s = signals.length - 1; s >= 0; s--) {
//                             if ((signals[s].type === "IDM" || signals[s].type === "IDM/ch" || signals[s].type === "IDM-T") && signals[s].trend === "BULLISH") {
//                                 signals[s].displayName = (signals[s].type === "IDM/ch") ? "IDM/ch(Dis)" : "IDM(Dis)";
//                                 signals[s].type = "IDM(Dis)"; // 🔥 Type अपडेट करना ज़रूरी है ताकि BOS को IDM मिल सके!
//                                 break; 
//                             }
//                         }

//                         // 🎯 2. VISUAL ANCHORS: Swing HL और HH के मार्कर ड्रा करो
//                         signals.push({ 
//                             type: "ANCHOR", displayName: "HL(Dis)-Ref", trend: "BULLISH", // 🔥 नाम बदल दिया
//                             price: currentBottom.price, startTime: currentBottom.time, endTime: currentBottom.time,
//                             position: "belowBar" 
//                         });
                        
//                         signals.push({ 
//                             type: "ANCHOR", displayName: "HH(Dis)", trend: "BULLISH", 
//                             price: validHH.price, startTime: validHH.time, endTime: validHH.time,
//                             position: "aboveBar" // कैंडल के ऊपर दिखेगा
//                         });
//                     }
//                 }

//                 // 🏃‍♂️ रनअवे लॉजिक (Shifting Logic) - इसे बिल्कुल मत हटाना!
//                 if (newBOS_Detected && !is50PercentTapped_Bullish) {
//                     refSwingHL_Dis_Bullish = { ...tempSwingLow }; // एंकर को नए लो पर खिसका दिया
//                 }
//             }
//             // ========================================================================

//             // =========================================================================
//             // 🔥 YAHAN PASTE KAREIN: IDM-T से IDM(Dis) प्रमोशन का जादू 🔥
//             // =========================================================================
//             if (isIdmTransferred && structureMode === "DISCOUNTED") {
//                 // ट्रेंड के हिसाब से सही ओरिजिन और टारगेट लेवल ढूँढो
//                 let currentOrigin = (trend === -1) ? (refSwingHH_Dis_Bearish || lockedSwingHigh) : (refSwingHL_Dis_Bullish || lockedSwingLow);
//                 let currentTarget = (trend === -1) ? (validLL || absoluteLowest) : (validHH || absoluteHighest);

//                 if (currentOrigin && currentTarget) {
//                     let eqLevel = calculateEquilibrium(currentOrigin.price, currentTarget.price);
                    
//                     // अगर मार्केट 50% ज़ोन को टैप कर दे (IDM-T अब मैच्योर हो गया!)
//                     if ((trend === -1 && curr.high >= eqLevel) || (trend === 1 && curr.low <= eqLevel)) {
//                         isIdmTransferred = false; 

//                         isIdmTaken = true;
                        
//                         // ट्रेंड के हिसाब से सही IDM Flag अपडेट करें ताकि BOS(Dis) छप सके
//                         if (trend === -1) isIdmTaken_Dis_Bearish = true;
//                         else isIdmTaken_Dis_Bullish = true;
                        
//                         signals.forEach(sig => {
//                             if (sig.displayName === "IDM-T") {
//                                 sig.displayName = "IDM(Dis)";
//                                 sig.type = "IDM(Dis)";
//                             }
//                         });
//                     }
//                 }
//             }
//             // =====================================================================

//             // RULE 3 & 6a: BOS & Sweep Logic
//             if (isIdmTaken && validHH !== null) {
//                 let breakLevel = refX_BOS_Bullish ? refX_BOS_Bullish.price : validHH.price;

//                 if (curr.high > breakLevel) {
//                     if (curr.close > breakLevel) { // 🚀 Full Body Break

//                         let newBOS_Detected = true; // इंजन को पता चले कि BOS हुआ है

//                         // 🔥 DISCOUNTED MODE GATEKEEPER
//                         let canPushBOS = (structureMode === "DISCOUNTED") ? (isIdmTaken_Dis_Bullish === true) : true;
                        
//                         // 🔥 THE FIX: यहाँ displayName जोड़ दिया गया है ताकि मास्टर फ़िल्टर इसे पहचान सके!
//                         signals.push({
//                             type: "BOS", 
//                             trend: "BULLISH",
//                             price: validHH.price,
//                             startTime: validHH.time,
//                             endTime: curr.timestamp,
//                             displayName: (structureMode === "DISCOUNTED") ? (canPushBOS ? "BOS(Dis)" : "BOS") : "BOS",
//                             isHistorical: !canPushBOS // अगर शर्तें पूरी नहीं हुईं, तो धुंधला कर दो
//                         });

//                         // 🧹 (यहाँ से IDM-T वाला गलत कोड हटा दिया गया है)

//                         // 🔥 Reset Discounted Trackers (नया Rule: BOS(Dis) होते ही रेंज फ्रेश हो जाती है)
//                         if (canPushBOS && structureMode === "DISCOUNTED") {
//                             // 1. HH(Dis) और BOS ब्रेकआउट कैंडल के बीच का सबसे निचला (Lowest) पॉइंट ढूँढें
//                             let legStartIdx = candles.findIndex(c => c.timestamp === validHH.time);
//                             let trueHL = { price: Infinity, time: null };
                            
//                             if (legStartIdx !== -1) {
//                                 for (let k = legStartIdx; k <= i; k++) {
//                                     if (candles[k].low < trueHL.price) {
//                                         trueHL = { price: candles[k].low, time: candles[k].timestamp };
//                                     }
//                                 }
//                             }

//                             // 2. पुराने सारे "HL(Dis)-Ref" लेबल्स को चार्ट से साफ़ कर दें
//                             signals = signals.filter(sig => !(sig.type === "ANCHOR" && sig.displayName === "HL(Dis)-Ref" && sig.trend === "BULLISH"));

//                             // 3. असली "HL(Dis)" को सबसे लोएस्ट पॉइंट पर ड्रा करें
//                             if (trueHL.time) {
//                                 signals.push({ 
//                                     type: "ANCHOR", displayName: "HL(Dis)", trend: "BULLISH", 
//                                     price: trueHL.price, startTime: trueHL.time, endTime: trueHL.time,
//                                     position: "belowBar" 
//                                 });
//                             }

//                             // 4. ट्रैकर्स को रीसेट करें
//                             isIdmTaken_Dis_Bullish = false;
//                             is50PercentTapped_Bullish = false;
//                             refSwingHL_Dis_Bullish = { ...tempSwingLow }; 
//                         }

//                         // =========================================================================
//                         // 🧠 DISCOUNTED MODE: THE 3 CONDITIONS GATEKEEPER (BULLISH)
//                         // =========================================================================
//                         if (structureMode === "DISCOUNTED") {
//                             if (!is50PercentTapped_Bullish) {
//                                 // ❌ 50% टैप नहीं हुआ! (Runaway Trend)
                                
//                                 // अगर मार्केट बिना 50% छुए भाग रहा है, तो दादाजी को ऊपर खिसका लाओ!
//                                 if (refSwingHL_Dis_Bullish) { 
//                                     lockedSwingLow = { ...refSwingHL_Dis_Bullish }; 
//                                 }

//                                 // 🔄 Naye Wave ke liye Trackers Shift karo
//                                 refSwingHH_Dis_Bullish = { price: curr.high, time: curr.timestamp };
//                                 refSwingHL_Dis_Bullish = { ...tempSwingLow }; 
                                
//                                 // 🌫️ Fade Internal Noise
//                                 signals.forEach(sig => {
//                                     let sigStart = sig.startTime || sig.time;
//                                     if (lockedSwingLow && sigStart > lockedSwingLow.time) { 
//                                         if (["E-OB", "E-OF"].includes(sig.type)) { 
//                                             sig.isHistorical = true;
//                                             sig.isActive = false;
//                                         }
//                                     }
//                                 });

//                                 // 🧹 Cleanup & Skip BOS (Zombie Bug Fix)
//                                 isIdmTaken = false; 
//                                 validHH = null; 
//                                 refHH = null; 
//                                 refX_BOS_Bullish = null;
//                                 tempSwingLow = { price: curr.low, time: curr.timestamp }; 
//                                 continue;
//                             } else {
//                                 // ✅ Condition 1: Perfect 50% Tapped & Breakout! (Valid BOS Dis)
//                                 is50PercentTapped_Bullish = false; 
//                                 isIdmTaken_Dis_Bullish = false;
//                                 refSwingHH_Dis_Bullish = { price: curr.high, time: curr.timestamp };
//                                 refSwingHL_Dis_Bullish = { ...tempSwingLow }; 
//                             }
//                         }
//                         // =========================================================================

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
//                         // 🔥 THE NULL FIX: Ensure majorIdmTarget doesn't crash if null
//                         let safeIdmTarget = majorIdm_Bullish ? { ...majorIdm_Bullish } : { price: Infinity, time: curr.timestamp };
//                         refX_BOS_Bullish = { price: curr.high, time: curr.timestamp, majorIdmTarget: safeIdmTarget };
//                     }
//                 }

//                 if (refX_BOS_Bullish && refX_BOS_Bullish.majorIdmTarget) {
//                     if (curr.low < refX_BOS_Bullish.majorIdmTarget.price) {

//                       // 🌟 NAYA CODE: IDM TRANSFER FADE FIX 🌟
//                         let waveStartBullish = lockedSwingLow ? lockedSwingLow.time : absoluteLowest.time;
//                         for (let s = signals.length - 1; s >= 0; s--) {
//                             if (signals[s].startTime < waveStartBullish) break;
//                             if (signals[s].trend === "BULLISH" && (signals[s].type.includes("IDM") || signals[s].type === "McM(X)")) {
//                                 signals[s].isHistorical = true;
//                             }
//                         }

//                         signals.push({ type: "IDM", trend: "BULLISH", price: refX_BOS_Bullish.majorIdmTarget.price, startTime: refX_BOS_Bullish.majorIdmTarget.time, endTime: curr.timestamp });
                        
//                         // 🔥 THE NULL FIX: Ensure validHH is not null
//                         if (validHH) {
//                             signals.push({ type: "X", trend: "BULLISH", sweptSide: "HIGH", price: validHH.price, startTime: validHH.time, endTime: refX_BOS_Bullish.time });
//                         }

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



//             // 🎯 5. IDM(D2S) HIT & ZONE GENERATION!
//                 // 🔥 THE NEW TECHNICAL COUNTER LOGIC (Fake CHoCH / Transfer)
//                 let isTechnicalBreak_D2S = false;
//                 if ((structureMode === "TECHNICAL" || structureMode === "DISCOUNTED") && confirmedLH_D2S !== null && refLL_D2S !== null) {
//                     if (curr.close < refLL_D2S.price) {
//                         isTechnicalBreak_D2S = true; // 🚀 बिना IDM लिए नीचे का लेवल तोड़ दिया!
//                     }
//                 }

//                 if (confirmedLH_D2S !== null && (curr.high >= confirmedLH_D2S.price || isTechnicalBreak_D2S)) {
                    
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
//                         validLL_D2S = { 
//                             price: refLL_D2S ? refLL_D2S.price : curr.low, 
//                             time: refLL_D2S ? refLL_D2S.time : curr.timestamp 
//                         };
//                         tempSwingHigh_D2S = { price: curr.high, time: curr.timestamp }; // पीक ट्रैक करने के लिए

//                         // 🎯 Technical Break है तो IDM(T-C) छापो, वरना नॉर्मल IDM(D2S)
//                         if (isTechnicalBreak_D2S) {
//                             signals.push({ 
//                                 type: "IDM(T)", trend: "BEARISH_COUNTER", 
//                                 price: confirmedLH_D2S.price, startTime: confirmedLH_D2S.time, 
//                                 endTime: curr.timestamp, sweptSide: "LOW", position: "aboveBar",
//                                 displayName: "IDM(T-C)" // 🔥 (C) लगाने से मास्टर फ़िल्टर इसे काउंटर समझेगा
//                             });
//                         } else {
//                             signals.push({ 
//                                 type: "IDM(D2S)", trend: "BEARISH_COUNTER", 
//                                 price: confirmedLH_D2S.price, startTime: confirmedLH_D2S.time, 
//                                 endTime: curr.timestamp, sweptSide: "HIGH", position: "aboveBar" 
//                             });
//                         }

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
                            
//                             // 🎯 THE UI FIX: अगर "Strict (Extreme Only)" चालू है, तभी इस विशाल Root को जोड़ें!
//                             if (strictCounter) {
//                                 d2sPullbacks.unshift({
//                                     id: "ROOT_SWING_LH",
//                                     validLH: candles[startIdx_D2S].high,
//                                     validLHCandleIndex: startIdx_D2S,
//                                     confirmLL: rootConfirmLL, 
//                                     confirmLLCandleIndex: endIdx_D2S,
//                                     breakCandleIndex: endIdx_D2S, 
//                                     startTime: candles[startIdx_D2S].timestamp
//                                 });
//                             }
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
//               }
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
//                             // 🧹 THE FIX: अगर Strict Mode है तभी चार्ट साफ करो, 'Every Pullback' मोड में सब दिखने दो!
//                             if (strictCounter) {
//                                 signals = signals.filter(s => 
//                                     s !== activeDob_D2S && s !== activeDof_D2S && 
//                                     s !== activeEob_D2S && s !== activeEof_D2S
//                                 );
//                             }
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



//     // =========================================================================
//     // 🛠️ CHANCHAL BHAI'S MASTER ZONE OVERLAP & PROMOTION LOGIC
//     // =========================================================================
//     // =========================================================================
//     // 🛠️ CHANCHAL BHAI'S MASTER ZONE OVERLAP & PROMOTION LOGIC (LEG-BASED)
//     // =========================================================================
//     let waveZonesMap = {};
//     let currentLegId = 0;

//     // 1. लेग (Leg) के हिसाब से ज़ोन्स को ग्रुप करें (BOS/CHoCH के आधार पर)
//     signals.forEach(sig => {
//         // जैसे ही मेजर स्ट्रक्चर (BOS/CHoCH) मिले, नया लेग (डब्बा) शुरू कर दो
//         let name = sig.displayName || sig.type;
//         if (["BOS", "CHoCH", "BOS(Dis)", "CHoCH(Dis)"].includes(name)) {
//             currentLegId++;
//         }
        
//         // सिर्फ मेन स्ट्रक्चर के ज़ोन्स को ग्रुप में डालो (Counter ज़ोन्स को डिस्टर्ब मत करो)
//         if (["E-OB", "D-OB", "E-OF", "D-OF"].includes(sig.type)) {
//             let key = `${sig.trend}_LEG_${currentLegId}`;
//             if (!waveZonesMap[key]) waveZonesMap[key] = [];
//             waveZonesMap[key].push(sig);
//         }
//     });

//     Object.values(waveZonesMap).forEach(waveZones => {
//         let flows = waveZones.filter(z => z.type.includes("OF"));
//         let blocks = waveZones.filter(z => z.type.includes("OB"));
        
//         if (blocks.length === 0 && flows.length === 0) return;

//         let trend = waveZones[0].trend;

//         // 🎯 RULE 1: OF Containment & Cleanup (एक OF के अंदर मल्टीपल OBs का सफाया)
//         flows.forEach(of => {
//             let insideOBs = blocks.filter(ob => 
//                 !ob.isFakeExtreme &&
//                 ob.priceTop <= Math.max(of.priceTop, of.priceBottom) && 
//                 ob.priceBottom >= Math.min(of.priceTop, of.priceBottom)
//             );

//             if (insideOBs.length > 1) {
//                 if (trend === "BEARISH") {
//                     insideOBs.sort((a, b) => b.priceTop - a.priceTop); 
//                 } else {
//                     insideOBs.sort((a, b) => a.priceBottom - b.priceBottom); 
//                 }

//                 for (let i = 1; i < insideOBs.length; i++) {
//                     insideOBs[i].isFakeExtreme = true;
//                 }
//             }
//         });

//         // 🧹 जो OBs फेक मार्क हो गए हैं, उन्हें आगे के लॉजिक से हटा दें
//         blocks = blocks.filter(b => !b.isFakeExtreme);

//         // 🎯 RULE 2: Global Extreme Assignment (पूरे लेग का असली E-OB और E-OF सेट करें)
//         if (blocks.length > 0) {
//             if (trend === "BEARISH") blocks.sort((a, b) => b.priceTop - a.priceTop);
//             else blocks.sort((a, b) => a.priceBottom - b.priceBottom);

//             // सबसे पहला असली E-OB है
//             blocks[0].type = "E-OB";
//             if (blocks[0].displayName) blocks[0].displayName = blocks[0].displayName.replace("D-", "E-");

//             // बाकी सब D-OB हैं
//             for (let i = 1; i < blocks.length; i++) {
//                 blocks[i].type = "D-OB";
//                 if (blocks[i].displayName) blocks[i].displayName = blocks[i].displayName.replace("E-", "D-");
//             }
//         }

//         if (flows.length > 0) {
//             if (trend === "BEARISH") flows.sort((a, b) => b.priceTop - a.priceTop);
//             else flows.sort((a, b) => a.priceBottom - b.priceBottom);

//             // सबसे पहला E-OF है (बाय डिफ़ॉल्ट)
//             flows[0].type = "E-OF";
//             if (flows[0].displayName) flows[0].displayName = flows[0].displayName.replace("D-", "E-");

//             // बाकी सब D-OF हैं
//             for (let i = 1; i < flows.length; i++) {
//                 flows[i].type = "D-OF";
//                 if (flows[i].displayName) flows[i].displayName = flows[i].displayName.replace("E-", "D-");
//             }
//         }

//         // 🎯 RULE 3: Nature Alignment (🔥 CHANCHAL BHAI'S FIX 🔥)
//         // "अगर OF में D-OB है, तो वो ज़ोन D-OF ही होगा!"
//         flows.forEach(of => {
//             let insideOBs = blocks.filter(ob => 
//                 ob.priceTop <= Math.max(of.priceTop, of.priceBottom) && 
//                 ob.priceBottom >= Math.min(of.priceTop, of.priceBottom)
//             );

//             if (insideOBs.length > 0) {
//                 let survivingOB = insideOBs[0]; 
                
//                 // अगर OF के अंदर D-OB है, तो वो OF कभी E-OF नहीं हो सकता! उसे D-OF बनाओ।
//                 if (survivingOB.type === "D-OB" && of.type === "E-OF") {
//                     of.type = "D-OF";
//                     if (of.displayName) of.displayName = of.displayName.replace("E-", "D-");
//                 }
//                 // अगर OF के अंदर E-OB है, तो वो D-OF नहीं हो सकता, उसे E-OF बनाओ।
//                 else if (survivingOB.type === "E-OB" && of.type === "D-OF") {
//                     of.type = "E-OF";
//                     if (of.displayName) of.displayName = of.displayName.replace("D-", "E-");
//                 }
//             }
//         });
        
//         // 🎯 RULE 4: Final Duplicate Extreme Killer (सेफ्टी के लिए)
//         let finalEOBs = blocks.filter(b => b.type === "E-OB");
//         if (finalEOBs.length > 1) {
//             if (trend === "BEARISH") finalEOBs.sort((a, b) => b.priceTop - a.priceTop); 
//             else finalEOBs.sort((a, b) => a.priceBottom - b.bottom); 
//             for (let i = 1; i < finalEOBs.length; i++) finalEOBs[i].isFakeExtreme = true;
//         }

//         let finalEOFs = flows.filter(f => f.type === "E-OF");
//         if (finalEOFs.length > 1) {
//             if (trend === "BEARISH") finalEOFs.sort((a, b) => b.priceTop - a.priceTop); 
//             else finalEOFs.sort((a, b) => a.priceBottom - b.priceBottom); 
//             for (let i = 1; i < finalEOFs.length; i++) finalEOFs[i].isFakeExtreme = true;
//         }
//     });
//     // =========================================================================


//     // =========================================================================
//     // 🧹 THE ULTIMATE DUPLICATE ZONE ERASER & MASTER FILTER (Unified Version)
//     // =========================================================================
//     let finalUniqueSignals = [];
//     let seenZoneKeys = new Set();

//     // लूप को पीछे से चलाएंगे ताकि ताज़ा (Fresh) ज़ोन्स (जैसे नया E-OB) पहले मिलें
//     for (let k = signals.length - 1; k >= 0; k--) {
//         let sig = signals[k];
        
//         // 🔥 THE NEW FILTER: जो Fake E-OB मार्क हुए हैं, उन्हें सीधा चार्ट से बाहर निकाल फेंको!
//         if (sig.isFakeExtreme) continue; 
        
//         // चेक करें कि क्या यह कोई Order Block या Order Flow ज़ोन है
//         let isZone = ["E-OB", "D-OB", "E-OF", "D-OF"].includes(sig.type) || 
//                      (sig.displayName && (sig.displayName.includes("Demand") || sig.displayName.includes("Supply")));
        
//         if (isZone) {
//             // OB और OF को अलग-अलग पहचानने के लिए बेस टाइप निकालें
//             let baseType = (sig.type && sig.type.includes("OF")) || (sig.displayName && sig.displayName.includes("OF")) ? "OF" : "OB";
            
//             // एक यूनिक चाबी (Key) बनाएं: StartTime + Top + Bottom + Trend + BaseType
//             let zoneKey = `${sig.startTime}_${sig.priceTop}_${sig.priceBottom}_${baseType}_${sig.trend}`;
            
//             if (seenZoneKeys.has(zoneKey)) {
//                 // ❌ अगर यह चाबी पहले ही मिल चुकी है तो इग्नोर (Delete) कर दो
//                 continue; 
//             } else {
//                 seenZoneKeys.add(zoneKey);
//                 finalUniqueSignals.unshift(sig); // एरे में आगे जोड़ें ताकि ओरिजिनल आर्डर बना रहे
//             }
//         } else {
//             // =================================================================
//             // 🔥 THE MASTER FILTER INJECTION: मुख्य लेबल्स को यहाँ प्रोसेस करेंगे
//             // =================================================================
//             if (structureMode === "DISCOUNTED") {
//                 const isDis = sig.displayName && sig.displayName.includes("(Dis)");
                
//                 // 🛡️ FIX: अगर मोड DISCOUNTED है और नाम में (Dis) नहीं है, तो इसे धुंधला (Technical Reference) कर दो
//                 if (!isDis && sig.displayName !== "IDM-T" && ["BOS", "CHoCH", "IDM", "IDM/ch", "IDM(T)"].includes(sig.type)) {
//                     sig.isHistorical = true; 
//                 }
//             } else {
//                 // 🛡️ FIX: अगर मोड Technical/Mechanical है, तो (Dis) वाले लेबल्स को चार्ट पर आने ही मत दो (Skip करो)
//                 if (sig.displayName && sig.displayName.includes("(Dis)")) {
//                     continue; 
//                 }
//             }
            
//             // जो फ़िल्टर से बच गए, उन्हें सीधा पास कर दो
//             finalUniqueSignals.unshift(sig);
//         }
//     }
    
//     // ---------------------------------------------------------
//     // 🛡️ 🔥 THE NEW MASTER FILTER FOR COUNTER STRUCTURE 🔥 🛡️
//     // ---------------------------------------------------------
//     if (strictCounter) {
//         finalUniqueSignals = finalUniqueSignals.filter(sig => {
//             // अगर Strict Mode ON है, तो Counter Structure के फालतू लेबल्स (IDM, BOS, D-OB) को चार्ट से छुपा दो
//             if (sig.type === "IDM(S2D)" || sig.type === "IDM(D2S)") return false;
//             if (sig.type === "BOS(C)" || sig.type === "X(C)") return false;
//             if (sig.displayName && (sig.displayName.includes("D-S2D") || sig.displayName.includes("D-D2S"))) return false;
            
//             return true; // बाकी सब (E-D2S, E-S2D और Main Structure) दिखने दो!
//         });
//     }

//     // identifyMechanicalStructure के अंदर सबसे लास्ट में ये रखो (return से ठीक पहले):
//     // IDM Transfer (IDM-T) ट्रैकर
    

//     if (majorOnly) {
//         finalUniqueSignals = finalUniqueSignals.filter(sig => {
            
//             // 1. काउंटर स्ट्रक्चर को पहचानें
//             let isCounter = ["IDM(S2D)", "IDM(D2S)", "BOS(C)", "X(C)", "McM(X)"].includes(sig.type) || 
//                             (sig.displayName && (sig.displayName.includes("S2D") || sig.displayName.includes("D2S") || sig.displayName.includes("(C)")));

//             // 2. मेजर लेबल्स को पहचानें
//             let isMajor = ["BOS", "CHoCH", "IDM", "IDM(T)", "IDM/ch", "ANCHOR"].includes(sig.type) || 
//                            (sig.type && (sig.type.includes("IDM") || sig.type.includes("Dis")));
            
//             // 3. Discounted Mode Logic
//             if (structureMode === "DISCOUNTED" && isMajor && !isCounter) {
//                 // 🔥 THE FIX: IDM-T को चार्ट से गायब होने से बचाओ!
//                 if (!sig.displayName || (!sig.displayName.includes("(Dis)") && sig.displayName !== "IDM-T")) {
//                     sig.isHistorical = true; 
//                 } else {
//                     sig.isHistorical = false; 
//                 }
//             }
            
//             let isPoiZone = ["E-OB", "E-OF", "D-OB", "D-OF"].includes(sig.type);
            
//             // =========================================================
//             // 🎯 THE PERFECT UI-FILTER (Chanchal Bhai's Multi-Feature Fix)
//             // =========================================================
//             if (isCounter) {
//                 // अगर यूज़र ने "Every Pullback Mapping" चुना है (!strictCounter)
//                 if (!strictCounter) {
//                     return true; // 🔥 D-D2S और E-D2S दोनों को चार्ट पर छापने दो!
//                 } 
//                 // अगर यूज़र ने "Strict (Extreme Only)" चुना है (strictCounter)
//                 else {
//                     let isCounterExtreme = sig.displayName && (sig.displayName.includes("E-S2D") || sig.displayName.includes("E-D2S"));
//                     return isCounterExtreme; // 🛑 D-D2S को रोक दो, सिर्फ E-D2S छपेगा! (पहले जैसा ही रहेगा)
//                 }
//             }

//             return isMajor || isPoiZone; 
//         });
//     }

//     // =========================================================================
//     // 🎛️ CHANCHAL BHAI'S UI CHECKBOX FILTER (The Missing Piece)
//     // =========================================================================
//     // यह फ़िल्टर तुम्हारे UI से आए 4 चेकबॉक्स (True/False) के आधार पर कचरा साफ करेगा
//     finalUniqueSignals = finalUniqueSignals.filter(sig => {
//         let name = sig.displayName || "";

//         // API URL से डेटा String ("false") या Boolean (false) किसी भी रूप में आ सकता है, इसलिए String() यूज़ किया है
//         if ((name.includes("D-D2S(OB)") || name.includes("D-S2D(OB)")) && String(showD2S_DOB) === "false") return false;
//         if ((name.includes("D-D2S(OF)") || name.includes("D-S2D(OF)")) && String(showD2S_DOF) === "false") return false;
//         if ((name.includes("E-D2S(OB)") || name.includes("E-S2D(OB)")) && String(showD2S_EOB) === "false") return false;
//         if ((name.includes("E-D2S(OF)") || name.includes("E-S2D(OF)")) && String(showD2S_EOF) === "false") return false;

//         return true; // जो पास हो गया, उसे चार्ट पर जाने दो
//     });

//     let indicesToRemove = new Set();
//     let targetArray = typeof finalUniqueSignals !== 'undefined' ? finalUniqueSignals : signals;

//     for (let i = 0; i < targetArray.length; i++) {
//         let sig = targetArray[i];

//         // 1. अगर ये कोई भी CHoCH है
//         if (sig.type && sig.type.includes("CHoCH")) {

//             // 2. 🔥 THE MAGIC BULLET 🔥
//             // ढूँढो कि क्या एकदम उसी Price और उसी Time पर कोई IDM भी छपा है?
//             let overlappingIdmIndex = targetArray.findIndex((s, idx) => 
//                 idx !== i && 
//                 s.type && s.type.includes("IDM") && 
//                 s.startTime === sig.startTime && 
//                 s.price === sig.price // 🎯 100% Guaranteed Overlap Catch!
//             );

//             if (overlappingIdmIndex !== -1) {
//                 // 🚨 OVERLAP DETECTED! 🚨
                
//                 // 1. CHoCH को उड़ाने के लिए मार्क करो
//                 indicesToRemove.add(i);

//                 // 2. IDM को एक्टिव (डार्क) कर दो ताकि वो एकदम साफ़ दिखे
//                 targetArray[overlappingIdmIndex].isHistorical = false;

//                 // 3. इस CHoCH से ठीक पहले वाले सबसे ताज़ा BOS को ढूंढ कर हमेशा के लिए उड़ा दो!
//                 for (let k = i - 1; k >= 0; k--) {
//                     if (targetArray[k].type && targetArray[k].type.includes("BOS")) {
//                         indicesToRemove.add(k);
//                         break; // सिर्फ एक (लेटेस्ट) BOS उड़ाना है
//                     }
//                 }
//             }
//         }
//     }

//     // जिन-जिन को उड़ाने के लिए मार्क किया है, उन्हें फाइनल लिस्ट से बाहर निकाल दो
//     targetArray = targetArray.filter((_, idx) => !indicesToRemove.has(idx));

//     // वापस मेन वेरिएबल में सेव कर दो
//     if (typeof finalUniqueSignals !== 'undefined') {
//         finalUniqueSignals = targetArray;
//     } else {
//         signals = targetArray;
//     }
//     // =========================================================================

//     return typeof finalUniqueSignals !== 'undefined' ? finalUniqueSignals : signals;
// };

// // ============================================================================
// // 🎯 SMC POI SCANNER BLOCK: E-OF, E-OB, D-OF, D-OB FOR BULLISH SCENARIO
// // ============================================================================

// // =========================================================================
// // 🔥 HELPER: 50% GANN BOX (EQUILIBRIUM) CALCULATOR
// // =========================================================================
// const calculateEquilibrium = (highPrice, lowPrice) => {
//     return (highPrice + lowPrice) / 2;
// };



// // 🎯 MAIN SCANNER
// const checkPriceActionSignal = (htfCandles, ltfCandles, setupType, startingTrend = "AUTO", counterStructureDepth = 0, structureMode = "MECHANICAL", strictDecisional = false, strictCounter = true, majorOnly = false, showD2S_DOB = true, showD2S_DOF = true, showD2S_EOB = true, showD2S_EOF = true) => {

//     let signal = { long: false, short: false, reason: "" };

//     if (!htfCandles || htfCandles.length < 15 || !ltfCandles || ltfCandles.length === 0) {
//         return signal;
//     }

//     // 🔥 यहाँ strictDecisional पास कर दें
//     const htfSignals = identifyMechanicalStructure(htfCandles, startingTrend, counterStructureDepth, structureMode, strictDecisional, strictCounter, majorOnly, showD2S_DOB, showD2S_DOF, showD2S_EOB, showD2S_EOF);
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






const { 
    findSMCZones, 
    findSMCZones_Bearish, 
    findMitigationTime, 
    findMitigationTime_Bearish 
} = require('./SetupFinder');


// =========================================================================
// 🧠 SMART RETRO-SCANNER (Visual Zig-Zag Logic by Chanchal Bhai)
// =========================================================================
const scanRetroactivePullbacks = (startIndex, endIndex, candles, trendType) => {
    let validPullbacks = [];
    let inPullback = false;
    let tempExtreme = null;
    let targetBreakLevel = null;
    
    // 🔥 THE FIX: OB स्कैनर के लिए कैंडल इंडेक्स ट्रैक करने वाले वेरिएबल्स
    let breakCandleIdx = -1; 
    let tempExtremeIdx = -1;

    if (trendType === "BEARISH") {
        for (let j = startIndex + 1; j <= endIndex; j++) {
            let curr = candles[j];
            let prev = candles[j - 1];
            let isOutsideBar = curr.high > prev.high && curr.low < prev.low;
            let brokeHigh = curr.high > prev.high;

            if (!inPullback && brokeHigh && !isOutsideBar) {
                inPullback = true;
                targetBreakLevel = prev.low;
                breakCandleIdx = j - 1; // 🎯 जिस कैंडल का लो ब्रेक होने वाला है
                tempExtreme = { price: curr.high, time: curr.timestamp };
                tempExtremeIdx = j; // 🎯 टॉप कैंडल का इंडेक्स
            }
            else if (inPullback) {
                if (curr.high > tempExtreme.price) {
                    tempExtreme = { price: curr.high, time: curr.timestamp };
                    tempExtremeIdx = j;
                }
                if (curr.low < targetBreakLevel) {
                    // 🔥 THE FIX: FVG ढूँढने के लिए स्कैनर को पूरा डेटा (इंडेक्स) दें
                    validPullbacks.push({
                        id: validPullbacks.length + 1,
                        price: tempExtreme.price,
                        time: tempExtreme.time,
                        startTime: tempExtreme.time,
                        validLH: tempExtreme.price, 
                        validLHCandleIndex: tempExtremeIdx, // D-OB के लिए शुरूआती कैंडल
                        confirmLL: targetBreakLevel,
                        confirmLLCandleIndex: breakCandleIdx,
                        breakCandleIndex: j // D-OB के लिए आखिरी कैंडल (FVG लिमिट)
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
                breakCandleIdx = j - 1; // 🎯 जिस कैंडल का हाई ब्रेक होने वाला है
                tempExtreme = { price: curr.low, time: curr.timestamp };
                tempExtremeIdx = j; // 🎯 बॉटम कैंडल का इंडेक्स
            }
            else if (inPullback) {
                if (curr.low < tempExtreme.price) {
                    tempExtreme = { price: curr.low, time: curr.timestamp };
                    tempExtremeIdx = j;
                }
                if (curr.high > targetBreakLevel) {
                    // 🔥 THE FIX: FVG ढूँढने के लिए स्कैनर को पूरा डेटा (इंडेक्स) दें
                    validPullbacks.push({
                        id: validPullbacks.length + 1,
                        price: tempExtreme.price,
                        time: tempExtreme.time,
                        startTime: tempExtreme.time,
                        validHL: tempExtreme.price,
                        validHLCandleIndex: tempExtremeIdx, // D-OB के लिए शुरूआती कैंडल
                        confirmHH: targetBreakLevel,
                        confirmHHCandleIndex: breakCandleIdx,
                        breakCandleIndex: j // D-OB के लिए आखिरी कैंडल (FVG लिमिट)
                    });
                    inPullback = false;
                }
            }
        }
    }
    return validPullbacks; // 🔥 पूरा लिस्ट रिटर्न करेगा
};


const identifyMechanicalStructure = (candles, startingTrend = "AUTO", counterStructureDepth = 0, structureMode = "MECHANICAL", strictDecisional = false, strictCounter = true, majorOnly = false, showD2S_DOB = true, showD2S_DOF = true, showD2S_EOB = true, showD2S_EOF = true) => {
    // =========================================================================
    // 👑 DISCOUNTED (MAJOR) STRUCTURE VARIABLES (THE PARENT NODE)
    // =========================================================================
    // 📉 Bearish Discounted State
    let swingHH_Dis_Bearish = null; 
    let swingLL_Dis_Bearish = null;
    let refSwingLL_Dis_Bearish = null; // Ref Swing LL (Bottom)
    let refSwingHH_Dis_Bearish = null; // Ref IDM (Top Pullback)
    let isIdmTaken_Dis_Bearish = false;
    let is50PercentTapped_Bearish = false; 
    
    // 📈 Bullish Discounted State
    let swingHL_Dis_Bullish = null; 
    let swingHH_Dis_Bullish = null;
    let refSwingHH_Dis_Bullish = null; // Ref Swing HH (Top)
    let refSwingHL_Dis_Bullish = null; // Ref IDM (Bottom Pullback)
    let isIdmTaken_Dis_Bullish = false;
    let is50PercentTapped_Bullish = false; 
    // =========================================================================

    let isIdmTransferred = false;
    let idmT_Level = null; // IDM-T का प्राइस लेवल

    // 🔥 THE FIX: Trend बदलने पर पुराने कचरे को साफ़ करने का टूल
    const resetDiscountedTrackers = () => {
        is50PercentTapped_Bearish = false; isIdmTaken_Dis_Bearish = false;
        refSwingLL_Dis_Bearish = null; refSwingHH_Dis_Bearish = null;
        is50PercentTapped_Bullish = false; isIdmTaken_Dis_Bullish = false;
        refSwingHL_Dis_Bullish = null; refSwingHH_Dis_Bullish = null;
        isIdmTransferred = false; // 🔥 IDM-T State Reset
    };


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



    // 🔥 यह फंक्शन चेक करेगा कि सिग्नल को पुश करना है या नहीं
    const shouldAddSignal = (sig) => {
        const isDiscountedSignal = ["BOS(Dis)", "CHoCH(Dis)", "IDM(Dis)"].includes(sig.displayName);
        if (structureMode !== "DISCOUNTED" && isDiscountedSignal) {
            return false; // ❌ Discounted signal है और मोड Technical है, तो मत लो
        }
        return true; // ✅ बाकी सब आने दो
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

        let newBOS_Detected = false;

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

            // 🔥 1. INITIALIZE ANCHOR (यही वह जगह है जहाँ दादाजी सेट होंगे)
            if (refSwingHH_Dis_Bearish === null && absoluteHighest) {
                refSwingHH_Dis_Bearish = { ...absoluteHighest };
            }

            // 🔥 2. DEBUG & TAPPING LOGIC
            if (structureMode === "DISCOUNTED") {
                let currentTop = refSwingHH_Dis_Bearish ? refSwingHH_Dis_Bearish : lockedSwingHigh;
                if (isIdmTaken && validLL && currentTop) {
                    let eqLevel_Bearish = calculateEquilibrium(currentTop.price, validLL.price);
                    
                    // ✅ THE FIX: बेयरिश में 50% (Premium) टैप करने के लिए कैंडल का High ऊपर जाना चाहिए!
                    if (curr.high >= eqLevel_Bearish) is50PercentTapped_Bearish = true;
                }
                
                // रनअवे ट्रेंड शिफ्टिंग लॉजिक (Condition 2B)
                if (newBOS_Detected && !is50PercentTapped_Bearish) {
                    // 🔥 THE FIX: सिर्फ तभी शिफ्ट करो जब असली IDM(Dis) पेंडिंग हो
                    if (!isIdmTaken_Dis_Bearish) {
                        refSwingHH_Dis_Bearish = { ...tempSwingHigh }; 
                    }
                }
            }
            // ========================================================================

            // 🌟 CHANCHAL BHAI'S DYNAMIC PEAK FIX (BEARISH) 🌟
            // अगर मार्केट बिना IDM लिए कोई नया इंटरनल हाई (Peak) बनाता है, तो एंकर को वहाँ शिफ्ट कर दो!
            if (structureMode === "DISCOUNTED" && refSwingHH_Dis_Bearish && lockedSwingHigh) { // ✅ Yahan lockedSwingHigh check add kiya
                if (curr.high > refSwingHH_Dis_Bearish.price && curr.high <= lockedSwingHigh.price) { // ✅ Ab ye safe hai
                    refSwingHH_Dis_Bearish = { price: curr.high, time: curr.timestamp };
                }
            }

            // 🔥 SMART AUTO FIX & 1st E-OB FAILURE LOGIC: 
            if (lockedSwingHigh === null && curr.close > prevAbsoluteHighest) {
                
                signals.push({
                    type: "CHoCH", trend: "BULLISH",
                    sweptSide: "HIGH",
                    price: prevAbsoluteHighest, 
                    startTime: absoluteHighest.time,
                    endTime: curr.timestamp,
                    // 🔥 THE FIX: Yahan bhi displayName add kiya
                    displayName: (structureMode === "DISCOUNTED") ? "CHoCH(Dis)" : "CHoCH",
                    isHistorical: false
                });

                trend = 1;
                isIdmTaken = false;
                wipeCounterStructure();
                resetDiscountedTrackers();
                
                // 🔥 THE MISSING ANCHOR FIX: बुलिश के लिए नया बॉटम लॉक करो!
                lockedSwingLow = { ...absoluteLowest }; 
                lockedSwingHigh = null;

                validLL = null; refLL = null; tempSwingHigh = null; confirmedLH = null;

                bearishPullbacks = []; 
                tempPullbackTracker_Bearish = null; 

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

                        // 🔥 THE PERFECT GAP-AWARE VALIDATOR (NO INTERNAL NOISE) 🔥
                        let isGapBreak_Bearish = (candles[i-1] && candles[i-1].close <= breakLevel && curr.open > breakLevel);
                        
                        let isTrap = false;
                        
                        // 🌟 THE STRICT RULE: अगर IDM नहीं लिया है, तो यह 100% Trap (IDM-T) है!
                        if (!isIdmTaken) {
                            isTrap = true; 
                            
                            // सिर्फ गैप-अप (Gap Up) के केस में भविष्य चेक करो
                            if (isGapBreak_Bearish) {
                                let futurePBs = scanRetroactivePullbacks(i, Math.min(i + 150, candles.length - 1), candles, "BULLISH");
                                if (futurePBs.length > 0) isTrap = false; // Valid Gap CHoCH
                            }
                        }

                        // =======================================================
                        // 🧠 FAKE CHoCH TRAP (IDM-T TRANSFER LOGIC)
                        // =======================================================
                        if (isTrap) {
                            isIdmTaken = true;
                            isIdmTransferred = true; // 🛑 IDM-T State Active

                            if (structureMode === "DISCOUNTED") {
                                isIdmTaken_Dis_Bearish = false; // 50% का इंतज़ार करो
                            }
                            
                            let bosDisRemoved = false, lhDisRemoved = false, llDisRemoved = false, eobDemoted = false;
                            for (let k = signals.length - 1; k >= 0; k--) {
                                let sig = signals[k];
                                if (!bosDisRemoved && sig.type === "BOS" && sig.trend === "BEARISH" && sig.displayName === "BOS(Dis)") {
                                    signals.splice(k, 1); bosDisRemoved = true; continue; 
                                }
                                if (!llDisRemoved && sig.type === "ANCHOR" && sig.displayName === "LL(Dis)") {
                                    signals.splice(k, 1); llDisRemoved = true; continue;
                                }
                                if (!lhDisRemoved && sig.type === "ANCHOR" && sig.displayName === "LH(Dis)") {
                                    signals.splice(k, 1); lhDisRemoved = true; continue;
                                }
                                if (!eobDemoted && sig.type === "E-OB" && sig.trend === "BEARISH") {
                                    sig.type = "D-OB"; sig.displayName = "Supply Zone(D-OB)"; eobDemoted = true;
                                }
                                if (bosDisRemoved && llDisRemoved && lhDisRemoved && eobDemoted) break;
                            }
                            
                            // 🔥 THE GHOST BUG FIX: हमेशा "IDM-T" भेजो ताकि Frontend उसे दिखा सके!
                            let pushLabel = "IDM-T"; 
                            
                            // 🔥 CHANCHAL BHAI'S ADVANCED IDM-T SHIFTING LOGIC (Condition 1 & 2) 🔥
                            let idmT_Price = breakLevel; // Default: Condition 1 (जहाँ Swing LH टूटा)
                            
                            // Condition 2: अगर Engulfing है तो Shift कर दो
                            if (typeof isEngulfingBreakout !== 'undefined' && isEngulfingBreakout) {
                                idmT_Price = candles[i-1].high; // Shift to previous High
                            }

                            let waveStartBearish = lockedSwingHigh.time;
                            for (let s = signals.length - 1; s >= 0; s--) {
                                if (signals[s].startTime < waveStartBearish) break;
                                if (signals[s].trend === "BEARISH" && (signals[s].type.includes("IDM") || signals[s].type === "McM(X)")) {
                                    signals[s].isHistorical = true;
                                }
                            }

                            // 🎯 IDM-T Draw (Dynamic Price के साथ)
                            signals.push({ 
                                type: pushLabel, trend: "BEARISH", 
                                price: idmT_Price, // 🔥 Yahan dynamic price lag gaya
                                startTime: lockedSwingHigh.time, endTime: curr.timestamp,
                                displayName: pushLabel 
                            });

                            // 🔥 IDM-T बनते ही LL(Dis)-Ref ड्रा करें!
                            if (structureMode === "DISCOUNTED") {
                                signals.push({
                                    type: "ANCHOR", displayName: "LL(Dis)-Ref", trend: "BEARISH",
                                    price: absoluteLowest.price, startTime: absoluteLowest.time, endTime: absoluteLowest.time,
                                    position: "belowBar"
                                });
                            }
                            
                            validLL = { ...absoluteLowest };
                            tempSwingHigh = { price: curr.high, time: curr.timestamp };
                            majorIdm_Bearish = { price: curr.high, time: curr.timestamp };
                            lockedSwingHigh = prevLockedSwingHigh ? { ...prevLockedSwingHigh } : null;
                            if (structureMode === "DISCOUNTED") {
                                refSwingHH_Dis_Bearish = prevLockedSwingHigh ? { ...prevLockedSwingHigh } : null;
                            }
                            refX_CHoCH_Bearish = null; 
                            continue; // 🛑 लूप घुमाओ, CHoCH मत छापो!
                        }

                        // =======================================================
                        // ✅ NORMAL CHoCH LOGIC (TRUE TREND SHIFT)
                        // =======================================================
                        let isMajorCHoCH = (structureMode === "DISCOUNTED") ? isIdmTaken_Dis_Bearish : true;
                        let isTrueMajorCHoCH = true;
                        if (structureMode === "DISCOUNTED") {
                            isTrueMajorCHoCH = (!refSwingHH_Dis_Bearish || lockedSwingHigh.time === refSwingHH_Dis_Bearish.time);
                        }
                        
                        if (structureMode === "DISCOUNTED") {
                            let elementsToRemove = new Set();
                            for (let k = signals.length - 1; k >= 0; k--) {
                                let sig = signals[k];
                                
                                // 🔥 THE BOUNDARY FIX: जहाँ से ये वेव शुरू हुई थी (lockedSwingHigh), वहाँ पहुँचते ही सफाई रोक दो!
                                if (sig.startTime <= lockedSwingHigh.time) break;
                                if (sig.displayName === "BOS(Dis)" || sig.displayName === "CHoCH(Dis)") break;
                                
                                if (sig.trend === "BEARISH") {
                                    if (sig.type === "ANCHOR" && (sig.displayName === "LH(Dis)" || sig.displayName === "LL(Dis)" || sig.displayName === "LH(Dis)-Ref" || sig.displayName === "LL(Dis)-Ref")) elementsToRemove.add(k);
                                    if (sig.type === "E-OB") { sig.type = "D-OB"; sig.displayName = "Supply Zone(D-OB)"; }
                                }
                            }
                            signals = signals.filter((_, idx) => !elementsToRemove.has(idx));

                            // 🔥 CHANCHAL BHAI'S TROUGH FIX: बेयरिश वेव के सबसे बॉटम पॉइंट को HL(Dis) में बदल दो!
                            if (isTrueMajorCHoCH) {
                                signals.push({
                                    type: "ANCHOR", displayName: "HL(Dis)", trend: "BULLISH",
                                    price: absoluteLowest.price, startTime: absoluteLowest.time, endTime: absoluteLowest.time,
                                    position: "belowBar"
                                });
                            }
                        }

                        if (structureMode === "TECHNICAL" || structureMode === "DISCOUNTED") {
                            signals.forEach(sig => {
                                let sigStart = sig.startTime || sig.time;
                                let sigEnd = sig.endTime || sig.time;
                                if (sigStart >= lockedSwingHigh.time && sigEnd <= curr.timestamp) {
                                    if (sig.type !== "BOS" && sig.type !== "CHoCH") sig.isHistorical = true;
                                    if (["E-OB", "D-OB", "E-OF", "D-OF"].includes(sig.type)) sig.isActive = false;
                                }
                            });
                        }

                        signals.push({
                            type: "CHoCH", trend: "BULLISH", sweptSide: "HIGH",
                            price: breakLevel, startTime: lockedSwingHigh.time, endTime: curr.timestamp,
                            displayName: (structureMode === "DISCOUNTED") ? (isTrueMajorCHoCH ? "CHoCH(Dis)" : "") : "CHoCH",
                            isHistorical: !isTrueMajorCHoCH,
                            isHidden: (structureMode === "DISCOUNTED" && !isTrueMajorCHoCH) 
                        });

                        // 3. बाकि सारा Logic वही रहेगा (Trend Shift Setup)
                        trend = 1; // 🎯 बेयरिश से बुलिश हो गया
                        isIdmTaken = false;
                        wipeCounterStructure();
                        resetDiscountedTrackers();
                        
                        // बुलिश के लिए नया बॉटम लॉक करो और बेयरिश वेरिएबल्स साफ करो
                        lockedSwingLow = { ...absoluteLowest };
                        lockedSwingHigh = null; 
                        
                        validLL = null; refLL = null; tempSwingHigh = null; 
                        refX_CHoCH_Bearish = null; refX_BOS_Bearish = null;
                        bearishPullbacks = []; tempPullbackTracker_Bearish = null;
                        
                        // बुलिश ट्रैकर इनिशियलाइज़ करो
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
            }else if (refLL !== null) {
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
            if (confirmedLH !== null && curr.high >= confirmedLH.price && !isIdmTaken) {
                
                // 🔥 THE SINGLE CANDLE ENGULFING (IDM + BOS) FIX 🔥
                let expectedBreakLevel = refX_BOS_Bearish ? refX_BOS_Bearish.price : absoluteLowest.price;
                
                // 🔥 THE SCOPE FIX: poiZones को एकदम ऊपर डिक्लेयर करो!
                let poiZones = { eof: null, eob: null, dof: null, dob: null };

                // अगर एक ही कैंडल ऊपर IDM (LH) ले रही है और नीचे LL भी तोड़ रही है!
                if (curr.low <= expectedBreakLevel) {
                    // ❌ फेक कैंडल: इसे स्किप कर दो
                    confirmedLH = null;
                    bearishPullbacks = [];
                    tempPullbackTracker_Bearish = null;
                } 
                else {
                    // ✅ नार्मल कैंडल है
                    isIdmTaken = true;
                    validLL = { ...absoluteLowest };
                    tempSwingHigh = { price: curr.high, time: curr.timestamp };
                    majorIdm_Bearish = { price: curr.high, time: curr.timestamp };

                    // ==========================================================
                    // 🔥 THE McM(X) & IDM-OF LOGIC FOR BEARISH (THE TRUE SWEEP FIX)
                    // ==========================================================
                    let idmLabel = "IDM"; // 🎯 FIX: 'IDM(Dis)' हटाकर इसे हमेशा शुद्ध "IDM" रखें
                    const targetPb = bearishPullbacks.find(pb => pb.validLH === confirmedLH.price);

                    if (targetPb) {
                        // 🛡️ THE REAL SWEEP VERIFIER FOR BEARISH
                        let trueSweep = true;
                        for (let k = targetPb.breakCandleIndex; k <= i; k++) {
                            if (candles[k].close < targetPb.confirmLL) {
                                trueSweep = false; 
                                break;
                            }
                        }

                        if (trueSweep) {
                            idmLabel = "IDM/ch"; 
                        }
                    }

                    // 🌟 NAYA CODE: IDM TRANSFER FADE FIX (पुराने IDMs को धुंधला करें) 🌟
                    let waveStartBearish = lockedSwingHigh ? lockedSwingHigh.time : absoluteHighest.time;
                    for (let s = signals.length - 1; s >= 0; s--) {
                        if (signals[s].startTime < waveStartBearish) break; // पुरानी वेव में मत जाओ
                        if (signals[s].trend === "BEARISH" && (signals[s].type.includes("IDM") || signals[s].type === "McM(X)")) {
                            signals[s].isHistorical = true;
                        }
                    }

                    // IDM या IDM/ch की लाइन ड्रा करें
                    signals.push({ 
                        type: idmLabel, 
                        trend: "BEARISH", 
                        price: confirmedLH.price, 
                        startTime: confirmedLH.time, 
                        endTime: curr.timestamp,
                        displayName: idmLabel 
                    });

                    // 🔥 1. THE ROOT EXTREME FIX
                    const rootTime = lockedSwingHigh ? lockedSwingHigh.time : absoluteHighest.time;
                    const rootPrice = lockedSwingHigh ? lockedSwingHigh.price : absoluteHighest.price;

                    const swingLHIndex = candles.findIndex(c => c.timestamp === rootTime);

                    // 🛡️ THE NULL GUARD: अगर validLL मौजूद है, तभी अंदर का काम करो
                    if (validLL !== null) {
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

                        // यहाँ 'const' नहीं लगेगा क्योंकि हमने इसे बाहर 'let' से बनाया है
                        poiZones = findSMCZones_Bearish(candles, validPullbacksForSMC, i);
                    }

                    // 🔥 2. THE MASTER STATE MANAGEMENT
                    signals.forEach(sig => {
                        if (["E-OB", "D-OB", "E-OF", "D-OF"].includes(sig.type)) {

                            // 🔥 VIP PASS: Counter-Structure (S2D/D2S) ज़ोन्स को मेन इंजन के क्लिनअप से आज़ाद करो!
                            if (sig.displayName && (sig.displayName.includes("S2D") || sig.displayName.includes("D2S"))) return;

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

                    // 🔥 3. THE VISUAL FIX & DISCOUNT POI FILTER
                    let eqFilter_Bearish = null;
                    let strictEqFilter_Bearish = null; // 🛡️ NEW: True Anchor for Strict Mode
                    
                    if (structureMode === "DISCOUNTED") {
                        // Shifted Anchor (Normal E-OB के लिए)
                        let currentTopForFilter = refSwingHH_Dis_Bearish ? refSwingHH_Dis_Bearish : lockedSwingHigh;
                        eqFilter_Bearish = calculateEquilibrium(
                            currentTopForFilter ? currentTopForFilter.price : absoluteHighest.price, 
                            validLL.price
                        );
                        
                        // True Origin Anchor (Strict D-OB के लिए)
                        strictEqFilter_Bearish = calculateEquilibrium(
                            lockedSwingHigh ? lockedSwingHigh.price : absoluteHighest.price, 
                            validLL.price
                        );
                    }
                    const isValidPremium = (bottomPrice) => structureMode !== "DISCOUNTED" || !eqFilter_Bearish || bottomPrice >= eqFilter_Bearish;
                    
                    const isStrictPremium = (bottomPrice) => structureMode !== "DISCOUNTED" || !strictEqFilter_Bearish || bottomPrice >= strictEqFilter_Bearish;

                    if (poiZones.eof && !poiZones.eof.isMitigated && isValidPremium(poiZones.eof.bottom)) {
                        let mitTimeEOF = findMitigationTime_Bearish(poiZones.eof.bottom, i, candles);
                        signals.push({ type: "E-OF", displayName: "E-OF", trend: "BEARISH", priceTop: poiZones.eof.top, priceBottom: poiZones.eof.bottom, startTime: poiZones.eof.startTime, endTime: mitTimeEOF, isActive: true });
                    }
                    if (poiZones.eob && isValidPremium(poiZones.eob.bottom)) {
                        let mitTimeEOB = findMitigationTime_Bearish(poiZones.eob.bottom, i, candles);
                        signals.push({ type: "E-OB", displayName: "E-OB", trend: "BEARISH", priceTop: poiZones.eob.top, priceBottom: poiZones.eob.bottom, startTime: poiZones.eob.startTime, fvgTop: poiZones.eob.fvgTop, fvgBottom: poiZones.eob.fvgBottom, endTime: mitTimeEOB, isActive: true });
                    }

                    // 🔥 THE FIX: D-OB अब असली 50% (Origin) से ही नापा जाएगा!
                    if (poiZones.dof && !poiZones.dof.isMitigated && (!strictDecisional || isStrictPremium(poiZones.dof.bottom))) {
                        let mitTimeDOF = findMitigationTime_Bearish(poiZones.dof.bottom, i, candles);
                        signals.push({ type: "D-OF", displayName: "D-OF", trend: "BEARISH", priceTop: poiZones.dof.top, priceBottom: poiZones.dof.bottom, startTime: poiZones.dof.startTime, endTime: mitTimeDOF, isActive: true });
                    }
                    if (poiZones.dob && (!strictDecisional || isStrictPremium(poiZones.dob.bottom))) {
                        let mitTimeDOB = findMitigationTime_Bearish(poiZones.dob.bottom, i, candles);
                        signals.push({ type: "D-OB", displayName: "D-OB", trend: "BEARISH", priceTop: poiZones.dob.top, priceBottom: poiZones.dob.bottom, startTime: poiZones.dob.startTime, fvgTop: poiZones.dob.fvgTop, fvgBottom: poiZones.dob.fvgBottom, endTime: mitTimeDOB, isActive: true });
                    }

                    bearishPullbacks = [];
                    tempPullbackTracker_Bearish = null;
                    confirmedLH = null;
                } // <--- 🔥 Else ब्लॉक यहाँ एकदम परफेक्टली बंद हुआ
            }

            // 🎯 New High before BOS (Unlock Tracker)
            if (isIdmTaken && curr.high > tempSwingHigh.price) {
                tempSwingHigh = { price: curr.high, time: curr.timestamp };
                bearishPullbacks = []; // 🎯 Added
                refLL = null;
                tempPullbackTracker_Bearish = null; // 🎯 Added
            }

          
            // =========================================================================
            // 🔥 DISCOUNTED MODE: IDM(Dis) & 50% TRACKER (BEARISH)
            // =========================================================================
            if (structureMode === "DISCOUNTED") {
                let currentTop = refSwingHH_Dis_Bearish ? refSwingHH_Dis_Bearish : lockedSwingHigh;
                
                // 🔥 THE FIX: Normal IDM और IDM-T दोनों को एक साथ प्रोसेस करो!
                if ((isIdmTaken || isIdmTransferred) && validLL && currentTop) {
                    let eqLevel_Bearish = calculateEquilibrium(currentTop.price, validLL.price);
                    
                    // ✅ 50% Tap होने पर प्रमोशन
                    if (curr.high >= eqLevel_Bearish && !isIdmTaken_Dis_Bearish) {
                        is50PercentTapped_Bearish = true;
                        isIdmTaken_Dis_Bearish = true; // 🔥 बेयरिश IDM(Dis) वैलिड!
                        isIdmTransferred = false; // ट्रैप फ्लैग रीसेट

                        // 🎯 1. एरे में पीछे जाओ और 'IDM' या 'IDM-T' को 'IDM(Dis)' बना दो
                        for (let s = signals.length - 1; s >= 0; s--) {
                            if (!signals[s].isHistorical && (signals[s].type === "IDM" || signals[s].type === "IDM/ch" || signals[s].type === "IDM-T") && signals[s].trend === "BEARISH") {
                                signals[s].displayName = (signals[s].type === "IDM/ch") ? "IDM/ch(Dis)" : "IDM(Dis)";
                                signals[s].type = "IDM(Dis)";
                                break; 
                            }
                        }

                        // 🎯 2. VISUAL ANCHORS: Swing LH और LL के मार्कर ड्रा करो
                        signals.push({ 
                            type: "ANCHOR", displayName: "LH(Dis)-Ref", trend: "BEARISH", 
                            price: currentTop.price, startTime: currentTop.time, endTime: currentTop.time,
                            position: "aboveBar" 
                        });
                        
                        signals.push({ 
                            type: "ANCHOR", displayName: "LL(Dis)", trend: "BEARISH", 
                            price: validLL.price, startTime: validLL.time, endTime: validLL.time,
                            position: "belowBar" 
                        });
                    }
                }
                
                // 🏃‍♂️ रनअवे लॉजिक
                if (newBOS_Detected && !is50PercentTapped_Bearish) {
                    refSwingHH_Dis_Bearish = { ...tempSwingHigh }; 
                }
            }
            // ========================================================================


            // =========================================================================
            // 🔥 YAHAN PASTE KAREIN: IDM-T से IDM(Dis) प्रमोशन का जादू (BEARISH) 🔥
            // =========================================================================
            if (isIdmTransferred && structureMode === "DISCOUNTED") {
                let currentOrigin = refSwingHH_Dis_Bearish ? refSwingHH_Dis_Bearish : lockedSwingHigh;
                let currentTarget = validLL ? validLL : absoluteLowest;

                if (currentOrigin && currentTarget) {
                    let eqLevel = calculateEquilibrium(currentOrigin.price, currentTarget.price);
                    
                    // बेयरिश में मार्केट 50% (Equilibrium) के ऊपर जाना चाहिए
                    if (curr.high >= eqLevel) {
                        isIdmTransferred = false; 
                        isIdmTaken = true;
                        isIdmTaken_Dis_Bearish = true; // 🔥 बेयरिश IDM(Dis) एक्टिवेट
                        
                        // IDM-T को ढूँढकर IDM(Dis) में बदल दो
                        signals.forEach(sig => {
                            if (sig.displayName === "IDM-T") {
                                sig.displayName = "IDM(Dis)";
                                sig.type = "IDM(Dis)";
                            }
                        });
                    }
                }
            }


            // RULE 3 & 6a: BOS & Sweep Logic (BEARISH)
            if (isIdmTaken && validLL !== null) {
                let breakLevel = refX_BOS_Bearish ? refX_BOS_Bearish.price : validLL.price;

                if (curr.low < breakLevel) {
                    if (curr.close < breakLevel) { // 🚀 Full Body Break

                        let newBOS_Detected = true; // इंजन को पता चले कि BOS हुआ है

                        // 🔥 DISCOUNTED MODE GATEKEEPER
                        let canPushBOS = (structureMode === "DISCOUNTED") ? (isIdmTaken_Dis_Bearish === true) : true;
                        
                        signals.push({
                            type: "BOS", 
                            trend: "BEARISH",
                            price: validLL.price,
                            startTime: validLL.time,
                            endTime: curr.timestamp,
                            displayName: (structureMode === "DISCOUNTED") ? (canPushBOS ? "BOS(Dis)" : "BOS") : "BOS", 
                            isHistorical: !canPushBOS 
                        });

                        // ❌ (यहाँ से IDM-T का गलत कोड हटा दिया गया है)

                        // 🔥 THE FIX: Reset Discounted Trackers (नया Rule: BOS(Dis) होते ही रेंज फ्रेश हो जाती है)
                        if (canPushBOS && structureMode === "DISCOUNTED") {
                            // 1. LL(Dis) और BOS ब्रेकआउट कैंडल के बीच का सबसे ऊँचा पॉइंट ढूँढें
                            let legStartIdx = candles.findIndex(c => c.timestamp === validLL.time);
                            let trueLH = { price: -Infinity, time: null };
                            
                            if (legStartIdx !== -1) {
                                for (let k = legStartIdx; k <= i; k++) {
                                    if (candles[k].high > trueLH.price) {
                                        trueLH = { price: candles[k].high, time: candles[k].timestamp };
                                    }
                                }
                            }

                            // 2. पुराने सारे "LH(Dis)-Ref" लेबल्स को चार्ट से साफ़ कर दें
                            signals = signals.filter(sig => !(sig.type === "ANCHOR" && sig.displayName === "LH(Dis)-Ref" && sig.trend === "BEARISH"));

                            // 3. असली "LH(Dis)" को सबसे हाईएस्ट पॉइंट पर ड्रा करें
                            if (trueLH.time) {
                                signals.push({ 
                                    type: "ANCHOR", displayName: "LH(Dis)", trend: "BEARISH", 
                                    price: trueLH.price, startTime: trueLH.time, endTime: trueLH.time,
                                    position: "aboveBar" 
                                });
                            }

                            // 4. ट्रैकर्स को रीसेट करें
                            isIdmTaken_Dis_Bearish = false;
                            is50PercentTapped_Bearish = false;
                            refSwingHH_Dis_Bearish = { ...tempSwingHigh }; 
                        }

                        // =========================================================================
                        // 🧠 DISCOUNTED MODE: THE 3 CONDITIONS GATEKEEPER (BEARISH)
                        // =========================================================================
                        if (structureMode === "DISCOUNTED") {
                            if (!is50PercentTapped_Bearish) {
                                // ❌ 50% टैप नहीं हुआ! (Runaway Trend)
                                
                                // अगर मार्केट बिना 50% छुए गिर रहा है, तो दादाजी को नीचे खिसका लाओ!
                                if (refSwingHH_Dis_Bearish) { 
                                    lockedSwingHigh = { ...refSwingHH_Dis_Bearish }; 
                                }

                                // 🔄 Naye Wave ke liye Trackers Shift karo
                                refSwingHH_Dis_Bearish = { ...tempSwingHigh }; 
                                
                                // 🌫️ Fade Internal Noise
                                signals.forEach(sig => {
                                    let sigStart = sig.startTime || sig.time;
                                    if (lockedSwingHigh && sigStart > lockedSwingHigh.time) { 
                                        if (["E-OB", "E-OF"].includes(sig.type)) { 
                                            sig.isHistorical = true;
                                            sig.isActive = false;
                                        }
                                    }
                                });

                                // 🧹 Cleanup & Skip BOS (Zombie Bug Fix)
                                isIdmTaken = false; 
                                validLL = null; 
                                refLL = null; 
                                refX_BOS_Bearish = null;
                                tempSwingHigh = { price: curr.high, time: curr.timestamp }; 
                                continue;
                            } else {
                                // ✅ Condition 1: Perfect 50% Tapped & Breakout! (Valid BOS Dis)
                                is50PercentTapped_Bearish = false; 
                                isIdmTaken_Dis_Bearish = false;
                                refSwingHH_Dis_Bearish = { ...tempSwingHigh }; 
                            }
                        }
                        // =========================================================================

                        if (refX_CHoCH_Bearish) {
                            signals.push({ type: "X", trend: "BEARISH", sweptSide: "HIGH", price: lockedSwingHigh.price, startTime: lockedSwingHigh.time, endTime: refX_CHoCH_Bearish.time });
                            refX_CHoCH_Bearish = null;
                        }

                        // 🔥 दादाजी को सेव करो!
                        prevLockedSwingHigh = { ...lockedSwingHigh }; 
                        lockedSwingHigh = { ...tempSwingHigh };
                        isIdmTaken = false;
                        wipeCounterStructure();
                        validLL = null; refLL = null; refX_BOS_Bearish = null;

                        // 🔥 RETRO-SCANNER INJECTION: BOS के पहले वाले Bearish पुलबैक्स ढूँढो
                        let startIdx = candles.findIndex(c => c.timestamp === lockedSwingHigh.time);
                        let retroPBs = scanRetroactivePullbacks(startIdx, i, candles, "BEARISH");
                        confirmedLH = retroPBs.length > 0 ? retroPBs[retroPBs.length - 1] : null;

                        bearishPullbacks = [];
                        tempPullbackTracker_Bearish = null;
                        absoluteLowest = { price: curr.low, time: curr.timestamp };

                    } else { // 🧹 Sweep (Ref X)
                        // 🔥 THE NULL FIX: Ensure majorIdmTarget doesn't crash if null
                        let safeIdmTarget = majorIdm_Bearish ? { ...majorIdm_Bearish } : { price: -Infinity, time: curr.timestamp };
                        refX_BOS_Bearish = { price: curr.low, time: curr.timestamp, majorIdmTarget: safeIdmTarget };
                    }
                }

                if (refX_BOS_Bearish && refX_BOS_Bearish.majorIdmTarget) {
                    if (curr.high > refX_BOS_Bearish.majorIdmTarget.price) {
                      // 🌟 NAYA CODE: IDM TRANSFER FADE FIX 🌟
                        let waveStartBearish = lockedSwingHigh ? lockedSwingHigh.time : absoluteHighest.time;
                        for (let s = signals.length - 1; s >= 0; s--) {
                            if (signals[s].startTime < waveStartBearish) break;
                            if (signals[s].trend === "BEARISH" && (signals[s].type.includes("IDM") || signals[s].type === "McM(X)")) {
                                signals[s].isHistorical = true;
                            }
                        }

                        signals.push({ type: "IDM", trend: "BEARISH", price: refX_BOS_Bearish.majorIdmTarget.price, startTime: refX_BOS_Bearish.majorIdmTarget.time, endTime: curr.timestamp });
                        // 🔥 THE NULL FIX: Ensure validLL is not null here
                        if (validLL) {
                            signals.push({ type: "X", trend: "BEARISH", sweptSide: "LOW", price: validLL.price, startTime: validLL.time, endTime: refX_BOS_Bearish.time });
                        }
                        
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
                // 🔥 THE NEW TECHNICAL COUNTER LOGIC (Fake CHoCH / Transfer)
                let isTechnicalBreak_S2D = false;
                if ((structureMode === "TECHNICAL" || structureMode === "DISCOUNTED") && confirmedHL_S2D !== null && refHH_S2D !== null) {
                    if (curr.close > refHH_S2D.price) {
                        isTechnicalBreak_S2D = true; // 🚀 बिना IDM लिए ऊपर का लेवल तोड़ दिया!
                    }
                }

                if (confirmedHL_S2D !== null && (curr.low <= confirmedHL_S2D.price || isTechnicalBreak_S2D)) {
                    
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
                        validHH_S2D = { 
                            price: refHH_S2D ? refHH_S2D.price : curr.high, 
                            time: refHH_S2D ? refHH_S2D.time : curr.timestamp 
                        };
                        tempSwingLow_S2D = { price: curr.low, time: curr.timestamp };

                        // 🎯 Technical Break है तो IDM(T-C) छापो, वरना नॉर्मल IDM(S2D)
                        if (isTechnicalBreak_S2D) {
                            signals.push({ 
                                type: "IDM(T)", trend: "BULLISH_COUNTER", 
                                price: confirmedHL_S2D.price, startTime: confirmedHL_S2D.time, 
                                endTime: curr.timestamp, sweptSide: "HIGH", position: "belowBar",
                                displayName: "IDM(T-C)" // 🔥 (C) लगाने से मास्टर फ़िल्टर इसे काउंटर समझेगा
                            });
                        } else {
                            signals.push({ 
                                type: "IDM(S2D)", trend: "BULLISH_COUNTER", 
                                price: confirmedHL_S2D.price, startTime: confirmedHL_S2D.time, 
                                endTime: curr.timestamp, sweptSide: "LOW", position: "bottom"  
                            });
                        }

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
                            
                            // 🎯 THE UI FIX: अगर "Strict (Extreme Only)" चालू है, तभी इस विशाल Root को जोड़ें!
                            if (strictCounter) {
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
                            activeEof_S2D = { type: "E-OF", displayName: "E-S2D(OF)", trend: "BULLISH", priceTop: poiZones_S2D.eof.top, priceBottom: poiZones_S2D.eof.bottom, startTime: poiZones_S2D.eof.startTime, endTime: mitTimeEof, isActive: true };
                            signals.push(activeEof_S2D);
                        }
                        if (poiZones_S2D.eob) {
                            let mitTimeEob = findMitigationTime(poiZones_S2D.eob.top, i, candles);
                            activeEob_S2D = { type: "E-OB", displayName: "E-S2D(OB)", trend: "BULLISH", priceTop: poiZones_S2D.eob.top, priceBottom: poiZones_S2D.eob.bottom, startTime: poiZones_S2D.eob.startTime, fvgTop: poiZones_S2D.eob.fvgTop, fvgBottom: poiZones_S2D.eob.fvgBottom, endTime: mitTimeEob, isActive: true };
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
                            // 🧹 THE FIX: अगर Strict Mode है तभी चार्ट साफ करो, 'Every Pullback' मोड में सब दिखने दो!
                            if (strictCounter) {
                                signals = signals.filter(s => 
                                    s !== activeDob_S2D && s !== activeDof_S2D && 
                                    s !== activeEob_S2D && s !== activeEof_S2D
                                );
                            }
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

            // 🔥 1. INITIALIZE DISCOUNTED ANCHOR (बुलिश दादाजी सेट करें)
            if (refSwingHL_Dis_Bullish === null && absoluteLowest) {
                refSwingHL_Dis_Bullish = { ...absoluteLowest };
            }

            // 🔥 2. DEBUG & TAPPING LOGIC (Discounted Mode)
            if (structureMode === "DISCOUNTED") {
                let currentBottom = refSwingHL_Dis_Bullish ? refSwingHL_Dis_Bullish : lockedSwingLow;
                if (isIdmTaken && validHH && currentBottom) {
                    // बुलिश में Valid HH (Top) और Current Bottom का 50% निकालते हैं
                    let eqLevel = calculateEquilibrium(validHH.price, currentBottom.price);
                    
                    // अगर मार्केट 50% या उससे नीचे (Discount zone) आ गया है, तो Tapped = true
                    if (curr.low <= eqLevel) is50PercentTapped_Bullish = true;
                }
                
                // रनअवे ट्रेंड शिफ्टिंग लॉजिक (Condition 2B)
                // अगर नया BOS हुआ लेकिन 50% टैप नहीं हुआ, तो एंकर शिफ्ट करो
                if (newBOS_Detected && !is50PercentTapped_Bullish) {
                    refSwingHL_Dis_Bullish = { ...tempSwingLow }; // एंकर को नए लो पर खिसका दिया
                }
            }

            // 🔥 SMART AUTO FIX & 1st E-OB FAILURE LOGIC: 
            if (lockedSwingLow === null && curr.close < prevAbsoluteLowest) {
                
                signals.push({
                    type: "CHoCH", trend: "BEARISH",
                    sweptSide: "LOW",
                    price: prevAbsoluteLowest, 
                    startTime: absoluteLowest.time,
                    endTime: curr.timestamp,
                    // 🔥 THE FIX: Yahan displayName add kiya taaki Filter isey hide na kare
                    displayName: (structureMode === "DISCOUNTED") ? "CHoCH(Dis)" : "CHoCH",
                    isHistorical: false
                });
                trend = -1;
                isIdmTaken = false;
                wipeCounterStructure();
                resetDiscountedTrackers();

                // 🔥 THE MISSING ANCHOR FIX: बेयरिश के लिए नया टॉप लॉक करो!
                lockedSwingHigh = { ...absoluteHighest }; 
                lockedSwingLow = null;

                validHH = null; refHH = null; tempSwingLow = null; confirmedHL = null;

                bullishPullbacks = [];
                tempPullbackTracker = null;

                absoluteHighest = { price: curr.high, time: curr.timestamp }; 
                refCandle = curr;
                continue;
            }

            if (isIdmTaken) {
                if (curr.low < majorIdm_Bullish.price) majorIdm_Bullish = { price: curr.low, time: curr.timestamp };
            }

            // RULE 5 & 6c: CHoCH & Sweep Logic (BULLISH TO BEARISH)
            if (lockedSwingLow !== null) {
                let breakLevel = refX_CHoCH_Bullish ? refX_CHoCH_Bullish.price : lockedSwingLow.price;

                if (curr.low < breakLevel) { // 🎯 बुलिश में लो (Low) टूटेगा
                    if (curr.close < breakLevel) { // 🚀 Full Body Break (Valid Breakout)

                        // 🔥 THE PERFECT GAP-AWARE VALIDATOR (NO INTERNAL NOISE) 🔥
                        let isGapBreak_Bullish = (candles[i-1] && candles[i-1].close >= breakLevel && curr.open < breakLevel);
                        
                        let isTrap = false;
                        
                        // 🌟 THE STRICT RULE: अगर IDM नहीं लिया है, तो यह 100% Trap (IDM-T) है!
                        if (!isIdmTaken) {
                            isTrap = true; 
                            
                            // सिर्फ गैप-डाउन (Gap Down) के केस में भविष्य चेक करो
                            if (isGapBreak_Bullish) {
                                let futurePBs = scanRetroactivePullbacks(i, Math.min(i + 150, candles.length - 1), candles, "BEARISH");
                                if (futurePBs.length > 0) isTrap = false; // Valid Gap CHoCH
                            }
                        }

                        // =======================================================
                        // 🧠 FAKE CHoCH TRAP (IDM-T TRANSFER LOGIC)
                        // =======================================================
                        if (isTrap) {
                            isIdmTaken = true;
                            isIdmTransferred = true; // 🛑 IDM-T State Active

                            if (structureMode === "DISCOUNTED") {
                                isIdmTaken_Dis_Bullish = false; // 50% का इंतज़ार करो
                            }
                            
                            let bosDisRemoved = false, hhDisRemoved = false, hlDisRemoved = false, eobDemoted = false;
                            for (let k = signals.length - 1; k >= 0; k--) {
                                let sig = signals[k];
                                if (!bosDisRemoved && sig.type === "BOS" && sig.trend === "BULLISH" && sig.displayName === "BOS(Dis)") {
                                    signals.splice(k, 1); bosDisRemoved = true; continue;
                                }
                                if (!hlDisRemoved && sig.type === "ANCHOR" && sig.displayName === "HL(Dis)") {
                                    signals.splice(k, 1); hlDisRemoved = true; continue;
                                }
                                if (!hhDisRemoved && sig.type === "ANCHOR" && sig.displayName === "HH(Dis)") {
                                    signals.splice(k, 1); hhDisRemoved = true; continue;
                                }
                                if (!eobDemoted && sig.type === "E-OB" && sig.trend === "BULLISH") {
                                    sig.type = "D-OB"; sig.displayName = "Demand Zone(D-OB)"; eobDemoted = true;
                                }
                                if (bosDisRemoved && hlDisRemoved && hhDisRemoved && eobDemoted) break;
                            }
                            
                            // 🔥 THE GHOST BUG FIX: हमेशा "IDM-T" भेजो ताकि Frontend उसे दिखा सके!
                            let pushLabel = "IDM-T"; 
                            
                            // 🔥 CHANCHAL BHAI'S ADVANCED IDM-T SHIFTING LOGIC (Condition 1 & 2) 🔥
                            let idmT_Price = breakLevel; // Default: Condition 1 (जहाँ Swing HL टूटा)
                            
                            // Condition 2: अगर Engulfing है तो Shift कर दो
                            if (typeof isEngulfingBreakout !== 'undefined' && isEngulfingBreakout) {
                                idmT_Price = candles[i-1].low; // Shift to previous Low
                            }
                            
                            let waveStartBullish = lockedSwingLow.time;
                            for (let s = signals.length - 1; s >= 0; s--) {
                                if (signals[s].startTime < waveStartBullish) break;
                                if (signals[s].trend === "BULLISH" && (signals[s].type.includes("IDM") || signals[s].type === "McM(X)")) {
                                    signals[s].isHistorical = true;
                                }
                            }

                            // 🎯 IDM-T Draw (Dynamic Price के साथ)
                            signals.push({ 
                                type: pushLabel, trend: "BULLISH", 
                                price: idmT_Price, // 🎯 Dynamic Price Shift
                                startTime: lockedSwingLow.time, endTime: curr.timestamp,
                                displayName: pushLabel 
                            });

                            // 🔥 IDM-T बनते ही HH(Dis)-Ref ड्रा करें!
                            if (structureMode === "DISCOUNTED") {
                                signals.push({
                                    type: "ANCHOR", displayName: "HH(Dis)-Ref", trend: "BULLISH",
                                    price: absoluteHighest.price, startTime: absoluteHighest.time, endTime: absoluteHighest.time,
                                    position: "aboveBar"
                                });
                            }
                            
                            validHH = { ...absoluteHighest };
                            tempSwingLow = { price: curr.low, time: curr.timestamp };
                            majorIdm_Bullish = { price: curr.low, time: curr.timestamp };
                            lockedSwingLow = prevLockedSwingLow ? { ...prevLockedSwingLow } : null;
                            if (structureMode === "DISCOUNTED") {
                                refSwingHL_Dis_Bullish = prevLockedSwingLow ? { ...prevLockedSwingLow } : null;
                            }
                            refX_CHoCH_Bullish = null; 
                            continue; // 🛑 लूप घुमाओ, CHoCH मत छापो!
                        }

                        // =======================================================
                        // ✅ NORMAL CHoCH LOGIC (TRUE TREND SHIFT)
                        // =======================================================
                        let isMajorCHoCH = (structureMode === "DISCOUNTED") ? isIdmTaken_Dis_Bullish : true;
                        let isTrueMajorCHoCH = true;
                        if (structureMode === "DISCOUNTED") {
                            isTrueMajorCHoCH = (!refSwingHL_Dis_Bullish || lockedSwingLow.time === refSwingHL_Dis_Bullish.time);
                        }
                        
                        if (structureMode === "DISCOUNTED") {
                            let elementsToRemove = new Set();
                            for (let k = signals.length - 1; k >= 0; k--) {
                                let sig = signals[k];
                                
                                // 🔥 THE BOUNDARY FIX: जहाँ से ये वेव शुरू हुई थी (lockedSwingLow), वहाँ पहुँचते ही सफाई रोक दो!
                                // इससे पुराना HL(Dis), HH(Dis) और BOS(Dis) डिलीट होने से बच जाएगा!
                                if (sig.startTime <= lockedSwingLow.time) break;
                                if (sig.displayName === "BOS(Dis)" || sig.displayName === "CHoCH(Dis)") break;
                                
                                if (sig.trend === "BULLISH") {
                                    if (sig.type === "ANCHOR" && (sig.displayName === "HL(Dis)" || sig.displayName === "HH(Dis)" || sig.displayName === "HL(Dis)-Ref" || sig.displayName === "HH(Dis)-Ref")) elementsToRemove.add(k);
                                    if (sig.type === "E-OB") { sig.type = "D-OB"; sig.displayName = "Demand Zone(D-OB)"; }
                                }
                            }
                            signals = signals.filter((_, idx) => !elementsToRemove.has(idx));

                            // 🔥 CHANCHAL BHAI'S PEAK FIX: बुलिश वेव के सबसे टॉप पॉइंट को LH(Dis) में बदल दो!
                            if (isTrueMajorCHoCH) {
                                signals.push({
                                    type: "ANCHOR", displayName: "LH(Dis)", trend: "BEARISH",
                                    price: absoluteHighest.price, startTime: absoluteHighest.time, endTime: absoluteHighest.time,
                                    position: "aboveBar"
                                });
                            }
                        }

                        if (structureMode === "TECHNICAL" || structureMode === "DISCOUNTED") {
                            signals.forEach(sig => {
                                let sigStart = sig.startTime || sig.time;
                                let sigEnd = sig.endTime || sig.time;
                                if (sigStart >= lockedSwingLow.time && sigEnd <= curr.timestamp) {
                                    if (sig.type !== "BOS" && sig.type !== "CHoCH") sig.isHistorical = true;
                                    if (["E-OB", "D-OB", "E-OF", "D-OF"].includes(sig.type)) sig.isActive = false;
                                }
                            });
                        }

                        signals.push({
                            type: "CHoCH", trend: "BEARISH", sweptSide: "LOW",
                            price: breakLevel, startTime: lockedSwingLow.time, endTime: curr.timestamp,
                            displayName: (structureMode === "DISCOUNTED") ? (isTrueMajorCHoCH ? "CHoCH(Dis)" : "") : "CHoCH",
                            isHistorical: !isTrueMajorCHoCH,
                            isHidden: (structureMode === "DISCOUNTED" && !isTrueMajorCHoCH)
                        });

                        // 3. बाकि सारा Logic वही रहेगा (Trend Shift Setup)
                        trend = -1; // 🎯 बुलिश से बेयरिश हो गया
                        isIdmTaken = false;
                        wipeCounterStructure();
                        resetDiscountedTrackers();

                        // बेयरिश के लिए नया टॉप लॉक करो और बुलिश वेरिएबल्स साफ करो
                        lockedSwingHigh = { ...absoluteHighest };
                        lockedSwingLow = null; 
                        
                        validHH = null; refHH = null; tempSwingLow = null; 
                        refX_CHoCH_Bullish = null; refX_BOS_Bullish = null;
                        bullishPullbacks = []; tempPullbackTracker = null;
                        
                        // बेयरिश ट्रैकर इनिशियलाइज़ करो
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


            // 🎯 THE FINAL IDM CONFIRMATION & DEMAND ZONE TRANSFORMATION
            if (confirmedHL !== null && curr.low <= confirmedHL.price && !isIdmTaken) {
                
                // 🔥 THE SINGLE CANDLE ENGULFING (IDM + BOS) FIX 🔥
                let expectedBreakLevel = refX_BOS_Bullish ? refX_BOS_Bullish.price : absoluteHighest.price;
                
                // 🔥 THE SCOPE FIX: poiZones को एकदम ऊपर डिक्लेयर करो!
                let poiZones = { eof: null, eob: null, dof: null, dob: null };

                // अगर एक ही कैंडल नीचे IDM (HL) ले रही है और ऊपर HH भी तोड़ रही है!
                if (curr.high >= expectedBreakLevel) {
                    // ❌ फेक कैंडल (स्किप करो)
                    confirmedHL = null;
                    bullishPullbacks = [];
                    tempPullbackTracker = null;
                } 
                else {
                    // ✅ नार्मल कैंडल है, तो पुराना पूरा लॉजिक चलने दो
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

                    // 🌟 NAYA CODE: IDM TRANSFER FADE FIX (पुराने IDMs को धुंधला करें) 🌟
                    let waveStartBullish = lockedSwingLow ? lockedSwingLow.time : absoluteLowest.time;
                    for (let s = signals.length - 1; s >= 0; s--) {
                        if (signals[s].startTime < waveStartBullish) break; // पुरानी वेव में मत जाओ
                        if (signals[s].trend === "BULLISH" && (signals[s].type.includes("IDM") || signals[s].type === "McM(X)")) {
                            signals[s].isHistorical = true;
                        }
                    }

                    // IDM या IDM/ch की लाइन ड्रा करें
                    signals.push({ 
                        type: idmLabel, 
                        trend: "BULLISH", 
                        price: confirmedHL.price, 
                        startTime: confirmedHL.time, 
                        endTime: curr.timestamp,
                        displayName: idmLabel 
                    });

                    // ==========================================================
                    // 🔥 THE ROOT EXTREME FIX (Null Crash Fix)
                    // ==========================================================   
                    const rootTime = lockedSwingLow ? lockedSwingLow.time : absoluteLowest.time;
                    const rootPrice = lockedSwingLow ? lockedSwingLow.price : absoluteLowest.price;

                    const swingHLIndex = candles.findIndex(c => c.timestamp === rootTime);
                    
                    // 🛡️ THE NULL GUARD: अगर validHH मौजूद है, तभी अंदर का काम करो
                    if (validHH !== null) {
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
                            confirmedHL ? pb.validHL !== confirmedHL.price : true
                        );

                        if (swingHLIndex !== -1 && refHHIndex !== -1) {
                            validPullbacksForSMC.unshift(rootExtreme);
                        }

                        // यहाँ 'const' नहीं लगेगा क्योंकि हमने इसे बाहर 'let' से बनाया है
                        poiZones = findSMCZones(candles, validPullbacksForSMC, i);
                    }

                    // ==========================================================
                    // 🔥 THE VISUAL FIX
                    // ==========================================================

                    // 1. जब नया IDM कन्फर्म होता है, तो 'signals' एरे में मौजूद पिछले सारे ज़ोन्स 'पुराने' बन जाते हैं।
                    signals.forEach(sig => {
                        if (["E-OB", "D-OB", "E-OF", "D-OF"].includes(sig.type)) {

                            // 🔥 VIP PASS: Counter-Structure (S2D/D2S) ज़ोन्स को मेन इंजन के क्लिनअप से आज़ाद करो!
                            if (sig.displayName && (sig.displayName.includes("S2D") || sig.displayName.includes("D2S"))) return;

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

                    // 2. नए (Current Structure) ज़ोन्स को सिग्नल्स में पुश करें & DISCOUNT POI FILTER
                    let eqFilter_Bullish = null;
                    let strictEqFilter_Bullish = null; // 🛡️ NEW: True Anchor for Strict Mode
                    
                    if (structureMode === "DISCOUNTED") {
                        // Shifted Anchor (Normal E-OB के लिए)
                        let currentBottomForFilter = refSwingHL_Dis_Bullish ? refSwingHL_Dis_Bullish : lockedSwingLow;
                        eqFilter_Bullish = calculateEquilibrium(
                            validHH.price,
                            currentBottomForFilter ? currentBottomForFilter.price : absoluteLowest.price
                        );
                        
                        // True Origin Anchor (Strict D-OB के लिए)
                        strictEqFilter_Bullish = calculateEquilibrium(
                            validHH.price,
                            lockedSwingLow ? lockedSwingLow.price : absoluteLowest.price
                        );
                    }
                    const isValidDiscount = (topPrice) => structureMode !== "DISCOUNTED" || !eqFilter_Bullish || topPrice <= eqFilter_Bullish;
                    
                    const isStrictDiscount = (topPrice) => structureMode !== "DISCOUNTED" || !strictEqFilter_Bullish || topPrice <= strictEqFilter_Bullish;

                    if (poiZones.eof && !poiZones.eof.isMitigated && isValidDiscount(poiZones.eof.top)) {
                        let mitTimeEOF = findMitigationTime(poiZones.eof.top, i, candles);
                        signals.push({ type: "E-OF", displayName: "E-OF", trend: "BULLISH", priceTop: poiZones.eof.top, priceBottom: poiZones.eof.bottom, startTime: poiZones.eof.startTime, endTime: mitTimeEOF, isActive: true });
                    }
                    if (poiZones.eob && isValidDiscount(poiZones.eob.top)) {
                        let mitTimeEOB = findMitigationTime(poiZones.eob.top, i, candles);
                        signals.push({ type: "E-OB", displayName: "E-OB", trend: "BULLISH", priceTop: poiZones.eob.top, priceBottom: poiZones.eob.bottom, startTime: poiZones.eob.startTime, fvgTop: poiZones.eob.fvgTop, fvgBottom: poiZones.eob.fvgBottom, endTime: mitTimeEOB, isActive: true });
                    }

                    // 🔥 THE FIX: D-OB अब असली 50% (Origin) से ही नापा जाएगा!
                    if (poiZones.dof && !poiZones.dof.isMitigated && (!strictDecisional || isStrictDiscount(poiZones.dof.top))) {
                        let mitTimeDOF = findMitigationTime(poiZones.dof.top, i, candles);
                        signals.push({ type: "D-OF", displayName: "D-OF", trend: "BULLISH", priceTop: poiZones.dof.top, priceBottom: poiZones.dof.bottom, startTime: poiZones.dof.startTime, endTime: mitTimeDOF, isActive: true });
                    }
                    if (poiZones.dob && (!strictDecisional || isStrictDiscount(poiZones.dob.top))) {
                        let mitTimeDOB = findMitigationTime(poiZones.dob.top, i, candles);
                        signals.push({ type: "D-OB", displayName: "D-OB", trend: "BULLISH", priceTop: poiZones.dob.top, priceBottom: poiZones.dob.bottom, startTime: poiZones.dob.startTime, fvgTop: poiZones.dob.fvgTop, fvgBottom: poiZones.dob.fvgBottom, endTime: mitTimeDOB, isActive: true });
                    }

                    bullishPullbacks = [];
                    tempPullbackTracker = null;
                    confirmedHL = null;
                } // <--- 🔥 Else ब्लॉक यहाँ एकदम परफेक्टली बंद हुआ
            }

            if (isIdmTaken && curr.low < tempSwingLow.price) {
                tempSwingLow = { price: curr.low, time: curr.timestamp };

                bullishPullbacks = [];
                refHH = null; // ट्रैकर अनलॉक!
                tempPullbackTracker = null;
            }
           

            // =========================================================================
            // 🔥 DISCOUNTED MODE: IDM(Dis) & 50% TRACKER (BULLISH)
            // =========================================================================
            if (structureMode === "DISCOUNTED") {
                let currentBottom = refSwingHL_Dis_Bullish ? refSwingHL_Dis_Bullish : lockedSwingLow;
                
                // 🔥 THE FIX: Normal IDM और IDM-T दोनों को एक साथ प्रोसेस करो!
                if ((isIdmTaken || isIdmTransferred) && validHH && currentBottom) {
                    let eqLevel = calculateEquilibrium(validHH.price, currentBottom.price);
                    
                    // ✅ 50% Tap होने पर प्रमोशन
                    if (curr.low <= eqLevel && !isIdmTaken_Dis_Bullish) {
                        is50PercentTapped_Bullish = true;
                        isIdmTaken_Dis_Bullish = true; // 🔥 बुलिश IDM(Dis) वैलिड!
                        isIdmTransferred = false; // ट्रैप फ्लैग रीसेट

                        // 🎯 1. एरे में पीछे जाओ और 'IDM' या 'IDM-T' को 'IDM(Dis)' बना दो
                        for (let s = signals.length - 1; s >= 0; s--) {
                            if (!signals[s].isHistorical && (signals[s].type === "IDM" || signals[s].type === "IDM/ch" || signals[s].type === "IDM-T") && signals[s].trend === "BULLISH") {
                                signals[s].displayName = (signals[s].type === "IDM/ch") ? "IDM/ch(Dis)" : "IDM(Dis)";
                                signals[s].type = "IDM(Dis)"; 
                                break; 
                            }
                        }

                        // 🎯 2. VISUAL ANCHORS: Swing HL और HH के मार्कर ड्रा करो
                        signals.push({ 
                            type: "ANCHOR", displayName: "HL(Dis)-Ref", trend: "BULLISH", 
                            price: currentBottom.price, startTime: currentBottom.time, endTime: currentBottom.time,
                            position: "belowBar" 
                        });
                        
                        signals.push({ 
                            type: "ANCHOR", displayName: "HH(Dis)", trend: "BULLISH", 
                            price: validHH.price, startTime: validHH.time, endTime: validHH.time,
                            position: "aboveBar" 
                        });
                    }
                }

                // 🏃‍♂️ रनअवे लॉजिक
                if (newBOS_Detected && !is50PercentTapped_Bullish) {
                    refSwingHL_Dis_Bullish = { ...tempSwingLow }; 
                }
            }
            // ========================================================================

            // // =========================================================================
            // // 🔥 YAHAN PASTE KAREIN: IDM-T से IDM(Dis) प्रमोशन का जादू 🔥
            // // =========================================================================
            // if (isIdmTransferred && structureMode === "DISCOUNTED") {
            //     // ट्रेंड के हिसाब से सही ओरिजिन और टारगेट लेवल ढूँढो
            //     let currentOrigin = (trend === -1) ? (refSwingHH_Dis_Bearish || lockedSwingHigh) : (refSwingHL_Dis_Bullish || lockedSwingLow);
            //     let currentTarget = (trend === -1) ? (validLL || absoluteLowest) : (validHH || absoluteHighest);

            //     if (currentOrigin && currentTarget) {
            //         let eqLevel = calculateEquilibrium(currentOrigin.price, currentTarget.price);
                    
            //         // अगर मार्केट 50% ज़ोन को टैप कर दे (IDM-T अब मैच्योर हो गया!)
            //         if ((trend === -1 && curr.high >= eqLevel) || (trend === 1 && curr.low <= eqLevel)) {
            //             isIdmTransferred = false; 

            //             isIdmTaken = true;
                        
            //             // ट्रेंड के हिसाब से सही IDM Flag अपडेट करें ताकि BOS(Dis) छप सके
            //             if (trend === -1) isIdmTaken_Dis_Bearish = true;
            //             else isIdmTaken_Dis_Bullish = true;
                        
            //             signals.forEach(sig => {
            //                 if (sig.displayName === "IDM-T") {
            //                     sig.displayName = "IDM(Dis)";
            //                     sig.type = "IDM(Dis)";
            //                 }
            //             });
            //         }
            //     }
            // }
            // // =====================================================================

            // RULE 3 & 6a: BOS & Sweep Logic
            if (isIdmTaken && validHH !== null) {
                let breakLevel = refX_BOS_Bullish ? refX_BOS_Bullish.price : validHH.price;

                if (curr.high > breakLevel) {
                    if (curr.close > breakLevel) { // 🚀 Full Body Break

                        let newBOS_Detected = true; // इंजन को पता चले कि BOS हुआ है

                        // 🔥 DISCOUNTED MODE GATEKEEPER
                        let canPushBOS = (structureMode === "DISCOUNTED") ? (isIdmTaken_Dis_Bullish === true) : true;
                        
                        // 🔥 THE FIX: यहाँ displayName जोड़ दिया गया है ताकि मास्टर फ़िल्टर इसे पहचान सके!
                        signals.push({
                            type: "BOS", 
                            trend: "BULLISH",
                            price: validHH.price,
                            startTime: validHH.time,
                            endTime: curr.timestamp,
                            displayName: (structureMode === "DISCOUNTED") ? (canPushBOS ? "BOS(Dis)" : "BOS") : "BOS",
                            isHistorical: !canPushBOS // अगर शर्तें पूरी नहीं हुईं, तो धुंधला कर दो
                        });

                        // 🧹 (यहाँ से IDM-T वाला गलत कोड हटा दिया गया है)

                        // 🔥 Reset Discounted Trackers (नया Rule: BOS(Dis) होते ही रेंज फ्रेश हो जाती है)
                        if (canPushBOS && structureMode === "DISCOUNTED") {
                            // 1. HH(Dis) और BOS ब्रेकआउट कैंडल के बीच का सबसे निचला (Lowest) पॉइंट ढूँढें
                            let legStartIdx = candles.findIndex(c => c.timestamp === validHH.time);
                            let trueHL = { price: Infinity, time: null };
                            
                            if (legStartIdx !== -1) {
                                for (let k = legStartIdx; k <= i; k++) {
                                    if (candles[k].low < trueHL.price) {
                                        trueHL = { price: candles[k].low, time: candles[k].timestamp };
                                    }
                                }
                            }

                            // 2. पुराने सारे "HL(Dis)-Ref" लेबल्स को चार्ट से साफ़ कर दें
                            signals = signals.filter(sig => !(sig.type === "ANCHOR" && sig.displayName === "HL(Dis)-Ref" && sig.trend === "BULLISH"));

                            // 3. असली "HL(Dis)" को सबसे लोएस्ट पॉइंट पर ड्रा करें
                            if (trueHL.time) {
                                signals.push({ 
                                    type: "ANCHOR", displayName: "HL(Dis)", trend: "BULLISH", 
                                    price: trueHL.price, startTime: trueHL.time, endTime: trueHL.time,
                                    position: "belowBar" 
                                });
                            }

                            // 4. ट्रैकर्स को रीसेट करें
                            isIdmTaken_Dis_Bullish = false;
                            is50PercentTapped_Bullish = false;
                            refSwingHL_Dis_Bullish = { ...tempSwingLow }; 
                        }

                        // =========================================================================
                        // 🧠 DISCOUNTED MODE: THE 3 CONDITIONS GATEKEEPER (BULLISH)
                        // =========================================================================
                        if (structureMode === "DISCOUNTED") {
                            if (!is50PercentTapped_Bullish) {
                                // ❌ 50% टैप नहीं हुआ! (Runaway Trend)
                                
                                // अगर मार्केट बिना 50% छुए भाग रहा है, तो दादाजी को ऊपर खिसका लाओ!
                                if (refSwingHL_Dis_Bullish) { 
                                    lockedSwingLow = { ...refSwingHL_Dis_Bullish }; 
                                }

                                // 🔄 Naye Wave ke liye Trackers Shift karo
                                refSwingHH_Dis_Bullish = { price: curr.high, time: curr.timestamp };
                                refSwingHL_Dis_Bullish = { ...tempSwingLow }; 
                                
                                // 🌫️ Fade Internal Noise
                                signals.forEach(sig => {
                                    let sigStart = sig.startTime || sig.time;
                                    if (lockedSwingLow && sigStart > lockedSwingLow.time) { 
                                        if (["E-OB", "E-OF"].includes(sig.type)) { 
                                            sig.isHistorical = true;
                                            sig.isActive = false;
                                        }
                                    }
                                });

                                // 🧹 Cleanup & Skip BOS (Zombie Bug Fix)
                                isIdmTaken = false; 
                                validHH = null; 
                                refHH = null; 
                                refX_BOS_Bullish = null;
                                tempSwingLow = { price: curr.low, time: curr.timestamp }; 
                                continue;
                            } else {
                                // ✅ Condition 1: Perfect 50% Tapped & Breakout! (Valid BOS Dis)
                                is50PercentTapped_Bullish = false; 
                                isIdmTaken_Dis_Bullish = false;
                                refSwingHH_Dis_Bullish = { price: curr.high, time: curr.timestamp };
                                refSwingHL_Dis_Bullish = { ...tempSwingLow }; 
                            }
                        }
                        // =========================================================================

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
                        // 🔥 THE NULL FIX: Ensure majorIdmTarget doesn't crash if null
                        let safeIdmTarget = majorIdm_Bullish ? { ...majorIdm_Bullish } : { price: Infinity, time: curr.timestamp };
                        refX_BOS_Bullish = { price: curr.high, time: curr.timestamp, majorIdmTarget: safeIdmTarget };
                    }
                }

                if (refX_BOS_Bullish && refX_BOS_Bullish.majorIdmTarget) {
                    if (curr.low < refX_BOS_Bullish.majorIdmTarget.price) {

                      // 🌟 NAYA CODE: IDM TRANSFER FADE FIX 🌟
                        let waveStartBullish = lockedSwingLow ? lockedSwingLow.time : absoluteLowest.time;
                        for (let s = signals.length - 1; s >= 0; s--) {
                            if (signals[s].startTime < waveStartBullish) break;
                            if (signals[s].trend === "BULLISH" && (signals[s].type.includes("IDM") || signals[s].type === "McM(X)")) {
                                signals[s].isHistorical = true;
                            }
                        }

                        signals.push({ type: "IDM", trend: "BULLISH", price: refX_BOS_Bullish.majorIdmTarget.price, startTime: refX_BOS_Bullish.majorIdmTarget.time, endTime: curr.timestamp });
                        
                        // 🔥 THE NULL FIX: Ensure validHH is not null
                        if (validHH) {
                            signals.push({ type: "X", trend: "BULLISH", sweptSide: "HIGH", price: validHH.price, startTime: validHH.time, endTime: refX_BOS_Bullish.time });
                        }

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
                // 🔥 THE NEW TECHNICAL COUNTER LOGIC (Fake CHoCH / Transfer)
                let isTechnicalBreak_D2S = false;
                if ((structureMode === "TECHNICAL" || structureMode === "DISCOUNTED") && confirmedLH_D2S !== null && refLL_D2S !== null) {
                    if (curr.close < refLL_D2S.price) {
                        isTechnicalBreak_D2S = true; // 🚀 बिना IDM लिए नीचे का लेवल तोड़ दिया!
                    }
                }

                if (confirmedLH_D2S !== null && (curr.high >= confirmedLH_D2S.price || isTechnicalBreak_D2S)) {
                    
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
                        validLL_D2S = { 
                            price: refLL_D2S ? refLL_D2S.price : curr.low, 
                            time: refLL_D2S ? refLL_D2S.time : curr.timestamp 
                        };
                        tempSwingHigh_D2S = { price: curr.high, time: curr.timestamp }; // पीक ट्रैक करने के लिए

                        // 🎯 Technical Break है तो IDM(T-C) छापो, वरना नॉर्मल IDM(D2S)
                        if (isTechnicalBreak_D2S) {
                            signals.push({ 
                                type: "IDM(T)", trend: "BEARISH_COUNTER", 
                                price: confirmedLH_D2S.price, startTime: confirmedLH_D2S.time, 
                                endTime: curr.timestamp, sweptSide: "LOW", position: "aboveBar",
                                displayName: "IDM(T-C)" // 🔥 (C) लगाने से मास्टर फ़िल्टर इसे काउंटर समझेगा
                            });
                        } else {
                            signals.push({ 
                                type: "IDM(D2S)", trend: "BEARISH_COUNTER", 
                                price: confirmedLH_D2S.price, startTime: confirmedLH_D2S.time, 
                                endTime: curr.timestamp, sweptSide: "HIGH", position: "aboveBar" 
                            });
                        }

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
                            
                            // 🎯 THE UI FIX: अगर "Strict (Extreme Only)" चालू है, तभी इस विशाल Root को जोड़ें!
                            if (strictCounter) {
                                d2sPullbacks.unshift({
                                    id: "ROOT_SWING_LH",
                                    validLH: candles[startIdx_D2S].high,
                                    validLHCandleIndex: startIdx_D2S,
                                    confirmLL: rootConfirmLL, 
                                    confirmLLCandleIndex: endIdx_D2S,
                                    breakCandleIndex: endIdx_D2S, 
                                    startTime: candles[startIdx_D2S].timestamp
                                });
                            }
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
                            // 🧹 THE FIX: अगर Strict Mode है तभी चार्ट साफ करो, 'Every Pullback' मोड में सब दिखने दो!
                            if (strictCounter) {
                                signals = signals.filter(s => 
                                    s !== activeDob_D2S && s !== activeDof_D2S && 
                                    s !== activeEob_D2S && s !== activeEof_D2S
                                );
                            }
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



    // =========================================================================
    // 🛠️ CHANCHAL BHAI'S MASTER ZONE OVERLAP & PROMOTION LOGIC
    // =========================================================================
    // =========================================================================
    // 🛠️ CHANCHAL BHAI'S MASTER ZONE OVERLAP & PROMOTION LOGIC (LEG-BASED)
    // =========================================================================
    let waveZonesMap = {};
    let currentLegId = 0;

    // 1. लेग (Leg) के हिसाब से ज़ोन्स को ग्रुप करें (BOS/CHoCH के आधार पर)
    signals.forEach(sig => {
        // जैसे ही मेजर स्ट्रक्चर (BOS/CHoCH) मिले, नया लेग (डब्बा) शुरू कर दो
        let name = sig.displayName || sig.type;
        if (["BOS", "CHoCH", "BOS(Dis)", "CHoCH(Dis)"].includes(name)) {
            currentLegId++;
        }
        
        // सिर्फ मेन स्ट्रक्चर के ज़ोन्स को ग्रुप में डालो (Counter ज़ोन्स को डिस्टर्ब मत करो)
        if (["E-OB", "D-OB", "E-OF", "D-OF"].includes(sig.type)) {
            let key = `${sig.trend}_LEG_${currentLegId}`;
            if (!waveZonesMap[key]) waveZonesMap[key] = [];
            waveZonesMap[key].push(sig);
        }
    });

    Object.values(waveZonesMap).forEach(waveZones => {
        let flows = waveZones.filter(z => z.type.includes("OF"));
        let blocks = waveZones.filter(z => z.type.includes("OB"));
        
        if (blocks.length === 0 && flows.length === 0) return;

        let trend = waveZones[0].trend;

        // 🎯 RULE 1: OF Containment & Cleanup (एक OF के अंदर मल्टीपल OBs का सफाया)
        flows.forEach(of => {
            let insideOBs = blocks.filter(ob => 
                !ob.isFakeExtreme &&
                ob.priceTop <= Math.max(of.priceTop, of.priceBottom) && 
                ob.priceBottom >= Math.min(of.priceTop, of.priceBottom)
            );

            if (insideOBs.length > 1) {
                if (trend === "BEARISH") {
                    insideOBs.sort((a, b) => b.priceTop - a.priceTop); 
                } else {
                    insideOBs.sort((a, b) => a.priceBottom - b.priceBottom); 
                }

                for (let i = 1; i < insideOBs.length; i++) {
                    insideOBs[i].isFakeExtreme = true;
                }
            }
        });

        // 🧹 जो OBs फेक मार्क हो गए हैं, उन्हें आगे के लॉजिक से हटा दें
        blocks = blocks.filter(b => !b.isFakeExtreme);

        // 🎯 RULE 2: Global Extreme Assignment (पूरे लेग का असली E-OB और E-OF सेट करें)
        if (blocks.length > 0) {
            if (trend === "BEARISH") blocks.sort((a, b) => b.priceTop - a.priceTop);
            else blocks.sort((a, b) => a.priceBottom - b.priceBottom);

            // सबसे पहला असली E-OB है
            blocks[0].type = "E-OB";
            if (blocks[0].displayName) blocks[0].displayName = blocks[0].displayName.replace("D-", "E-");

            // बाकी सब D-OB हैं
            for (let i = 1; i < blocks.length; i++) {
                blocks[i].type = "D-OB";
                if (blocks[i].displayName) blocks[i].displayName = blocks[i].displayName.replace("E-", "D-");
            }
        }

        if (flows.length > 0) {
            if (trend === "BEARISH") flows.sort((a, b) => b.priceTop - a.priceTop);
            else flows.sort((a, b) => a.priceBottom - b.priceBottom);

            // सबसे पहला E-OF है (बाय डिफ़ॉल्ट)
            flows[0].type = "E-OF";
            if (flows[0].displayName) flows[0].displayName = flows[0].displayName.replace("D-", "E-");

            // बाकी सब D-OF हैं
            for (let i = 1; i < flows.length; i++) {
                flows[i].type = "D-OF";
                if (flows[i].displayName) flows[i].displayName = flows[i].displayName.replace("E-", "D-");
            }
        }

        // 🎯 RULE 3: Nature Alignment (🔥 CHANCHAL BHAI'S FIX 🔥)
        // "अगर OF में D-OB है, तो वो ज़ोन D-OF ही होगा!"
        flows.forEach(of => {
            let insideOBs = blocks.filter(ob => 
                ob.priceTop <= Math.max(of.priceTop, of.priceBottom) && 
                ob.priceBottom >= Math.min(of.priceTop, of.priceBottom)
            );

            if (insideOBs.length > 0) {
                let survivingOB = insideOBs[0]; 
                
                // अगर OF के अंदर D-OB है, तो वो OF कभी E-OF नहीं हो सकता! उसे D-OF बनाओ।
                if (survivingOB.type === "D-OB" && of.type === "E-OF") {
                    of.type = "D-OF";
                    if (of.displayName) of.displayName = of.displayName.replace("E-", "D-");
                }
                // अगर OF के अंदर E-OB है, तो वो D-OF नहीं हो सकता, उसे E-OF बनाओ।
                else if (survivingOB.type === "E-OB" && of.type === "D-OF") {
                    of.type = "E-OF";
                    if (of.displayName) of.displayName = of.displayName.replace("D-", "E-");
                }
            }
        });
        
        // 🎯 RULE 4: Final Duplicate Extreme Killer (सेफ्टी के लिए)
        let finalEOBs = blocks.filter(b => b.type === "E-OB");
        if (finalEOBs.length > 1) {
            if (trend === "BEARISH") finalEOBs.sort((a, b) => b.priceTop - a.priceTop); 
            else finalEOBs.sort((a, b) => a.priceBottom - b.bottom); 
            for (let i = 1; i < finalEOBs.length; i++) finalEOBs[i].isFakeExtreme = true;
        }

        let finalEOFs = flows.filter(f => f.type === "E-OF");
        if (finalEOFs.length > 1) {
            if (trend === "BEARISH") finalEOFs.sort((a, b) => b.priceTop - a.priceTop); 
            else finalEOFs.sort((a, b) => a.priceBottom - b.priceBottom); 
            for (let i = 1; i < finalEOFs.length; i++) finalEOFs[i].isFakeExtreme = true;
        }
    });
    // =========================================================================


    // =========================================================================
    // 🧹 THE ULTIMATE DUPLICATE ZONE ERASER & MASTER FILTER (Unified Version)
    // =========================================================================
    let finalUniqueSignals = [];
    let seenZoneKeys = new Set();

    // लूप को पीछे से चलाएंगे ताकि ताज़ा (Fresh) ज़ोन्स (जैसे नया E-OB) पहले मिलें
    for (let k = signals.length - 1; k >= 0; k--) {
        let sig = signals[k];
        
        // 🔥 THE NEW FILTER: जो Fake E-OB मार्क हुए हैं, उन्हें सीधा चार्ट से बाहर निकाल फेंको!
        if (sig.isFakeExtreme) continue; 
        
        // चेक करें कि क्या यह कोई Order Block या Order Flow ज़ोन है
        let isZone = ["E-OB", "D-OB", "E-OF", "D-OF"].includes(sig.type) || 
                     (sig.displayName && (sig.displayName.includes("Demand") || sig.displayName.includes("Supply")));
        
        if (isZone) {
            // OB और OF को अलग-अलग पहचानने के लिए बेस टाइप निकालें
            let baseType = (sig.type && sig.type.includes("OF")) || (sig.displayName && sig.displayName.includes("OF")) ? "OF" : "OB";
            
            // एक यूनिक चाबी (Key) बनाएं: StartTime + Top + Bottom + Trend + BaseType
            let zoneKey = `${sig.startTime}_${sig.priceTop}_${sig.priceBottom}_${baseType}_${sig.trend}`;
            
            if (seenZoneKeys.has(zoneKey)) {
                // ❌ अगर यह चाबी पहले ही मिल चुकी है तो इग्नोर (Delete) कर दो
                continue; 
            } else {
                seenZoneKeys.add(zoneKey);
                finalUniqueSignals.unshift(sig); // एरे में आगे जोड़ें ताकि ओरिजिनल आर्डर बना रहे
            }
        } else {
            // =================================================================
            // 🔥 THE MASTER FILTER INJECTION: मुख्य लेबल्स को यहाँ प्रोसेस करेंगे
            // =================================================================
            if (structureMode === "DISCOUNTED") {
                const isDis = sig.displayName && sig.displayName.includes("(Dis)");
                
                // 🛡️ FIX: अगर मोड DISCOUNTED है और नाम में (Dis) नहीं है, तो इसे धुंधला (Technical Reference) कर दो
                if (!isDis && sig.displayName !== "IDM-T" && ["BOS", "CHoCH", "IDM", "IDM/ch", "IDM(T)"].includes(sig.type)) {
                    sig.isHistorical = true; 
                }
            } else {
                // 🛡️ FIX: अगर मोड Technical/Mechanical है, तो (Dis) वाले लेबल्स को चार्ट पर आने ही मत दो (Skip करो)
                if (sig.displayName && sig.displayName.includes("(Dis)")) {
                    continue; 
                }
            }
            
            // जो फ़िल्टर से बच गए, उन्हें सीधा पास कर दो
            finalUniqueSignals.unshift(sig);
        }
    }
    
    // ---------------------------------------------------------
    // 🛡️ 🔥 THE NEW MASTER FILTER FOR COUNTER STRUCTURE 🔥 🛡️
    // ---------------------------------------------------------
    if (strictCounter) {
        finalUniqueSignals = finalUniqueSignals.filter(sig => {
            // अगर Strict Mode ON है, तो Counter Structure के फालतू लेबल्स (IDM, BOS, D-OB) को चार्ट से छुपा दो
            if (sig.type === "IDM(S2D)" || sig.type === "IDM(D2S)") return false;
            if (sig.type === "BOS(C)" || sig.type === "X(C)") return false;
            if (sig.displayName && (sig.displayName.includes("D-S2D") || sig.displayName.includes("D-D2S"))) return false;
            
            return true; // बाकी सब (E-D2S, E-S2D और Main Structure) दिखने दो!
        });
    }

    // identifyMechanicalStructure के अंदर सबसे लास्ट में ये रखो (return से ठीक पहले):
    // IDM Transfer (IDM-T) ट्रैकर
    

    if (majorOnly) {
        finalUniqueSignals = finalUniqueSignals.filter(sig => {
            
            // 1. काउंटर स्ट्रक्चर को पहचानें
            let isCounter = ["IDM(S2D)", "IDM(D2S)", "BOS(C)", "X(C)", "McM(X)"].includes(sig.type) || 
                            (sig.displayName && (sig.displayName.includes("S2D") || sig.displayName.includes("D2S") || sig.displayName.includes("(C)")));

            // 2. मेजर लेबल्स को पहचानें
            let isMajor = ["BOS", "CHoCH", "IDM", "IDM(T)", "IDM/ch", "ANCHOR"].includes(sig.type) || 
                           (sig.type && (sig.type.includes("IDM") || sig.type.includes("Dis")));
            
            // 3. Discounted Mode Logic
            if (structureMode === "DISCOUNTED" && isMajor && !isCounter) {
                // 🔥 THE FIX: IDM-T को चार्ट से गायब होने से बचाओ!
                if (!sig.displayName || (!sig.displayName.includes("(Dis)") && sig.displayName !== "IDM-T")) {
                    sig.isHistorical = true; 
                } else {
                    sig.isHistorical = false; 
                }
            }
            
            let isPoiZone = ["E-OB", "E-OF", "D-OB", "D-OF"].includes(sig.type);
            
            // =========================================================
            // 🎯 THE PERFECT UI-FILTER (Chanchal Bhai's Multi-Feature Fix)
            // =========================================================
            if (isCounter) {
                // अगर यूज़र ने "Every Pullback Mapping" चुना है (!strictCounter)
                if (!strictCounter) {
                    return true; // 🔥 D-D2S और E-D2S दोनों को चार्ट पर छापने दो!
                } 
                // अगर यूज़र ने "Strict (Extreme Only)" चुना है (strictCounter)
                else {
                    let isCounterExtreme = sig.displayName && (sig.displayName.includes("E-S2D") || sig.displayName.includes("E-D2S"));
                    return isCounterExtreme; // 🛑 D-D2S को रोक दो, सिर्फ E-D2S छपेगा! (पहले जैसा ही रहेगा)
                }
            }

            return isMajor || isPoiZone; 
        });
    }

    // =========================================================================
    // 🎛️ CHANCHAL BHAI'S UI CHECKBOX FILTER (The Missing Piece)
    // =========================================================================
    // यह फ़िल्टर तुम्हारे UI से आए 4 चेकबॉक्स (True/False) के आधार पर कचरा साफ करेगा
    finalUniqueSignals = finalUniqueSignals.filter(sig => {
        let name = sig.displayName || "";

        // API URL से डेटा String ("false") या Boolean (false) किसी भी रूप में आ सकता है, इसलिए String() यूज़ किया है
        if ((name.includes("D-D2S(OB)") || name.includes("D-S2D(OB)")) && String(showD2S_DOB) === "false") return false;
        if ((name.includes("D-D2S(OF)") || name.includes("D-S2D(OF)")) && String(showD2S_DOF) === "false") return false;
        if ((name.includes("E-D2S(OB)") || name.includes("E-S2D(OB)")) && String(showD2S_EOB) === "false") return false;
        if ((name.includes("E-D2S(OF)") || name.includes("E-S2D(OF)")) && String(showD2S_EOF) === "false") return false;

        return true; // जो पास हो गया, उसे चार्ट पर जाने दो
    });

    let indicesToRemove = new Set();
    let targetArray = typeof finalUniqueSignals !== 'undefined' ? finalUniqueSignals : signals;

    for (let i = 0; i < targetArray.length; i++) {
        let sig = targetArray[i];

        // 1. अगर ये कोई भी CHoCH है
        if (sig.type && sig.type.includes("CHoCH")) {

            // 2. 🔥 THE MAGIC BULLET 🔥
            // ढूँढो कि क्या एकदम उसी Price और उसी Time पर कोई IDM भी छपा है?
            let overlappingIdmIndex = targetArray.findIndex((s, idx) => 
                idx !== i && 
                s.type && s.type.includes("IDM") && 
                s.startTime === sig.startTime && 
                s.price === sig.price // 🎯 100% Guaranteed Overlap Catch!
            );

            if (overlappingIdmIndex !== -1) {
                // 🚨 OVERLAP DETECTED! 🚨
                
                // 1. CHoCH को उड़ाने के लिए मार्क करो
                indicesToRemove.add(i);

                // 2. IDM को एक्टिव (डार्क) कर दो ताकि वो एकदम साफ़ दिखे
                targetArray[overlappingIdmIndex].isHistorical = false;

                // 3. इस CHoCH से ठीक पहले वाले सबसे ताज़ा BOS को ढूंढ कर हमेशा के लिए उड़ा दो!
                for (let k = i - 1; k >= 0; k--) {
                    if (targetArray[k].type && targetArray[k].type.includes("BOS")) {
                        indicesToRemove.add(k);
                        break; // सिर्फ एक (लेटेस्ट) BOS उड़ाना है
                    }
                }
            }
        }
    }

    // जिन-जिन को उड़ाने के लिए मार्क किया है, उन्हें फाइनल लिस्ट से बाहर निकाल दो
    targetArray = targetArray.filter((_, idx) => !indicesToRemove.has(idx));

    // वापस मेन वेरिएबल में सेव कर दो
    if (typeof finalUniqueSignals !== 'undefined') {
        finalUniqueSignals = targetArray;
    } else {
        signals = targetArray;
    }
    // =========================================================================

    return typeof finalUniqueSignals !== 'undefined' ? finalUniqueSignals : signals;
};

// ============================================================================
// 🎯 SMC POI SCANNER BLOCK: E-OF, E-OB, D-OF, D-OB FOR BULLISH SCENARIO
// ============================================================================

// =========================================================================
// 🔥 HELPER: 50% GANN BOX (EQUILIBRIUM) CALCULATOR
// =========================================================================
const calculateEquilibrium = (highPrice, lowPrice) => {
    return (highPrice + lowPrice) / 2;
};



// 🎯 MAIN SCANNER
const checkPriceActionSignal = (htfCandles, ltfCandles, setupType, startingTrend = "AUTO", counterStructureDepth = 0, structureMode = "MECHANICAL", strictDecisional = false, strictCounter = true, majorOnly = false, showD2S_DOB = true, showD2S_DOF = true, showD2S_EOB = true, showD2S_EOF = true) => {

    let signal = { long: false, short: false, reason: "" };

    if (!htfCandles || htfCandles.length < 15 || !ltfCandles || ltfCandles.length === 0) {
        return signal;
    }

    // 🔥 यहाँ strictDecisional पास कर दें
    const htfSignals = identifyMechanicalStructure(htfCandles, startingTrend, counterStructureDepth, structureMode, strictDecisional, strictCounter, majorOnly, showD2S_DOB, showD2S_DOF, showD2S_EOB, showD2S_EOF);
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












