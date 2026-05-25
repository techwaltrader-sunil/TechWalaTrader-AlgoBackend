// /**
//  * SMC & Price Action Scanner
//  * यह कैंडल्स का डेटा लेकर Swing High/Low और BOS/CHoCH डिटेक्ट करेगा
//  */

// // Swing High/Low पहचानने का फंक्शन
// const identifySwings = (candles) => {
//     let swings = [];
//     for (let i = 1; i < candles.length - 1; i++) {
//         const prev = candles[i - 1];
//         const curr = candles[i];
//         const next = candles[i + 1];

//         // Swing High: करंट कैंडल का हाई पिछले और अगले दोनों से ज्यादा है
//         if (curr.high > prev.high && curr.high > next.high) {
//             swings.push({ type: 'HIGH', price: curr.high, index: i });
//         }
//         // Swing Low: करंट कैंडल का लो पिछले और अगले दोनों से कम है
//         else if (curr.low < prev.low && curr.low < next.low) {
//             swings.push({ type: 'LOW', price: curr.low, index: i });
//         }
//     }
//     return swings;
// };

// // Break of Structure (BOS) चेक करने का फंक्शन
// const checkBOS = (candles, swings) => {
//     const lastSwing = swings[swings.length - 1];
//     const currentPrice = candles[candles.length - 1].close;

//     if (lastSwing.type === 'HIGH' && currentPrice > lastSwing.price) {
//         return { signal: 'BULLISH', type: 'BOS' };
//     }
//     if (lastSwing.type === 'LOW' && currentPrice < lastSwing.price) {
//         return { signal: 'BEARISH', type: 'BOS' };
//     }
//     return null;
// };

// module.exports = { identifySwings, checkBOS };


/**
 * Advanced Price Action Scanner - SMC Logic
 */

// // स्विंग्स डिटेक्ट करना (आसान भाषा में: मार्केट के लेवल्स को मार्क करना)
// const identifySwings = (candles) => {
//     let swings = [];
//     // यहाँ i = 1 से शुरू करें, और स्विंग बनाने की कंडीशन को आसान करें
//     for (let i = 1; i < candles.length - 1; i++) {
//         const prev = candles[i - 1];
//         const curr = candles[i];
//         const next = candles[i + 1];

//         // थोड़ा ढीला रखें (>= या <= का प्रयोग करें)
//         if (curr.high >= prev.high && curr.high >= next.high) {
//             swings.push({ type: 'HIGH', price: curr.high, index: i });
//         } else if (curr.low <= prev.low && curr.low <= next.low) {
//             swings.push({ type: 'LOW', price: curr.low, index: i });
//         }
//     }
//     return swings;
// };

// // एडवांस स्कैनर: BOS और CHoCH को पहचानना
// const checkPriceActionSignal = (candles, swings, setupType) => {
//     // console.log(`🔍 Scanner Running | Swings Found: ${swings.length} | Last Price: ${candles[candles.length - 1].close}`);
//     if (swings.length < 3) return { long: false, short: false };

//     const lastSwing = swings[swings.length - 1];
//     const prevSwing = swings[swings.length - 2];
//     const currentPrice = candles[candles.length - 1].close;

//     let signal = { long: false, short: false };

//     // 1. BOS (Break of Structure): ट्रेंड जारी रहने का सिग्नल
//     if (setupType === "BOS (Break of Structure)") {
//         // Bullish BOS (पिछले हाई को तोड़ा)
//         if (lastSwing.type === 'HIGH' && currentPrice > lastSwing.price) {
//             signal = { long: true, short: false, reason: "BOS Bullish" };
//         }
//         // 🔥 THE FIX: Bearish BOS (पिछले लो को तोड़ा) - यह मिसिंग था!
//         else if (lastSwing.type === 'LOW' && currentPrice < lastSwing.price) {
//             signal = { long: false, short: true, reason: "BOS Bearish" };
//         }
//     }

//     // 2. CHoCH (Change of Character): ट्रेंड रिवर्सल का सिग्नल
//     else if (setupType === "CHoCH (Change of Character)") {
//         // बुलिश CHoCH
//         if (lastSwing.type === 'HIGH' && prevSwing.type === 'LOW' && currentPrice > lastSwing.price) {
//             signal = { long: true, short: false, reason: `CHoCH Bullish` };
//         }
//         // बेयरिश CHoCH
//         else if (lastSwing.type === 'LOW' && prevSwing.type === 'HIGH' && currentPrice < lastSwing.price) {
//             signal = { long: false, short: true, reason: `CHoCH Bearish` };
//         }
//     }

//     return signal;
// };

// module.exports = { identifySwings, checkPriceActionSignal };



// /**
//  * Advanced Price Action Scanner - Multi-Timeframe SMC Logic (HTF + LTF)
//  */

// // स्विंग्स डिटेक्ट करना (मार्केट स्ट्रक्चर - Manager का काम)
// const identifySwings = (candles) => {
//     let swings = [];
//     for (let i = 1; i < candles.length - 1; i++) {
//         const prev = candles[i - 1];
//         const curr = candles[i];
//         const next = candles[i + 1];

//         if (curr.high >= prev.high && curr.high >= next.high) {
//             swings.push({ type: 'HIGH', price: curr.high, index: i });
//         } else if (curr.low <= prev.low && curr.low <= next.low) {
//             swings.push({ type: 'LOW', price: curr.low, index: i });
//         }
//     }
//     return swings;
// };

// // 🎯 एडवांस स्कैनर: Multi-Timeframe BOS और CHoCH
// const checkPriceActionSignal = (htfCandles, ltfCandles, setupType) => {
//     let signal = { long: false, short: false, reason: "" };

//     // अगर डेटा पूरा नहीं है तो सिग्नल मत दो
//     if (!htfCandles || htfCandles.length < 10 || !ltfCandles || ltfCandles.length === 0) {
//         return signal;
//     }

//     // 1. HTF (15m) पर स्विंग चेक करो
//     const htfSwings = identifySwings(htfCandles);
//     if (htfSwings.length < 3) return signal;

//     const lastSwing = htfSwings[htfSwings.length - 1];
//     const prevSwing = htfSwings[htfSwings.length - 2];
//     const currentHtfPrice = htfCandles[htfCandles.length - 1].close;

//     let htfSignalLong = false;
//     let htfSignalShort = false;

//     // 🔥 STEP 1: HTF MANAGER (Trend Identification)
//     if (setupType === "BOS (Break of Structure)") {
//         if (lastSwing.type === 'HIGH' && currentHtfPrice > lastSwing.price) {
//             htfSignalLong = true;
//             signal.reason = "HTF BOS Bullish";
//         } else if (lastSwing.type === 'LOW' && currentHtfPrice < lastSwing.price) {
//             htfSignalShort = true;
//             signal.reason = "HTF BOS Bearish";
//         }
//     }
//     else if (setupType === "CHoCH (Change of Character)") {
//         if (lastSwing.type === 'HIGH' && prevSwing.type === 'LOW' && currentHtfPrice > lastSwing.price) {
//             htfSignalLong = true;
//             signal.reason = "HTF CHoCH Bullish";
//         } else if (lastSwing.type === 'LOW' && prevSwing.type === 'HIGH' && currentHtfPrice < lastSwing.price) {
//             htfSignalShort = true;
//             signal.reason = "HTF CHoCH Bearish";
//         }
//     }

//     // 🚀 STEP 2: LTF DELIVERY BOY (Sniper Execution)
//     // अगर Manager (HTF) ने सिग्नल दे दिया है, तो Delivery Boy (LTF) कन्फर्मेशन लेगा
//     if (htfSignalLong || htfSignalShort) {
//         const currentLtfCandle = ltfCandles[ltfCandles.length - 1];
        
//         // चेक करो कि 1-मिनट की कैंडल ग्रीन (Bullish) है या रेड (Bearish)
//         const isLtfBullish = currentLtfCandle.close > currentLtfCandle.open;
//         const isLtfBearish = currentLtfCandle.close < currentLtfCandle.open;

//         // अगर HTF Bullish है और LTF की कैंडल भी ग्रीन क्लोज हुई है, तब ही एंट्री लो!
//         if (htfSignalLong && isLtfBullish) {
//             signal.long = true;
//             signal.reason += " + LTF Bullish Close";
//         } 
//         // अगर HTF Bearish है और LTF की कैंडल भी रेड क्लोज हुई है, तब ही एंट्री लो!
//         else if (htfSignalShort && isLtfBearish) {
//             signal.short = true;
//             signal.reason += " + LTF Bearish Close";
//         }
//     }

//     return signal;
// };

// module.exports = { identifySwings, checkPriceActionSignal };




// /*/**
//  * 🚀 Advanced Price Action Scanner - Mechanical Structure (HTF Manager)
//  * FIXED: IDM Overwrite Bug Resolved
//  */

// const identifyMechanicalStructure = (candles) => {
//     let trend = candles.length > 5 ? (candles[5].close > candles[0].close ? 1 : -1) : 0;
    
//     let tempHH = candles[0].high, tempLL = candles[0].low;
//     let refHH = null, pullbackHL = null, validHH = null, swingHL = null;
//     let refLL = null, pullbackLH = null, validLL = null, swingLH = null;
//     let isIdmTaken = false;
//     let signals = [];

//     for (let i = 1; i < candles.length; i++) {
//         const curr = candles[i];
//         const prev = candles[i - 1];

//         if (curr.high > tempHH) tempHH = curr.high;
//         if (curr.low < tempLL) tempLL = curr.low;

//         // ==========================================
//         // 📉 BEARISH STRUCTURE LOGIC (-1)
//         // ==========================================
//         if (trend === -1) {
//             // 🔥 FIX: STEP 2 (IDM CHECK) MUST BE BEFORE STEP 1!
//             // ताकि पुराना LH ओवरराइट होने से पहले चेक हो जाए कि Sweep हुआ या नहीं।
//             if (pullbackLH !== null && curr.high > pullbackLH && !isIdmTaken) {
//                 isIdmTaken = true;
//                 validLL = refLL; 
//                 swingLH = curr.high; 
//             }

//             // STEP 1: Pullback (LH)
//             if (curr.high > prev.high && !isIdmTaken) {
//                 if (refLL === null || tempLL < refLL) refLL = tempLL;
//                 if (pullbackLH === null || curr.high > pullbackLH) pullbackLH = curr.high;
//             }

//             // STEP 4: Swing LH Tracking
//             if (isIdmTaken && curr.high > swingLH) {
//                 swingLH = curr.high;
//             }

//             // STEP 3: BOS Confirmation
//             if (isIdmTaken && validLL !== null && curr.close < validLL) {
//                 signals.push({ index: i, type: "BOS", trend: "BEARISH", price: curr.close, timestamp: curr.timestamp });
//                 tempLL = curr.low; 
//                 refLL = null; pullbackLH = null; validLL = null;
//                 isIdmTaken = false;
//             }

//             // STEP 5: CHoCH Confirmation
//             if (swingLH !== null && curr.close > swingLH) {
//                 signals.push({ index: i, type: "CHoCH", trend: "BULLISH", price: curr.close, timestamp: curr.timestamp });
//                 trend = 1;
//                 tempHH = curr.high;
//                 refHH = null; pullbackHL = null; validHH = null; swingHL = curr.low;
//                 isIdmTaken = false;
//             }
//         }

//         // ==========================================
//         // 📈 BULLISH STRUCTURE LOGIC (1)
//         // ==========================================
//         else if (trend === 1) {
//             // 🔥 FIX: STEP 2 (IDM CHECK) BEFORE STEP 1
//             if (pullbackHL !== null && curr.low < pullbackHL && !isIdmTaken) {
//                 isIdmTaken = true;
//                 validHH = refHH;
//                 swingHL = curr.low; 
//             }

//             // STEP 1: Pullback (HL)
//             if (curr.low < prev.low && !isIdmTaken) {
//                 if (refHH === null || tempHH > refHH) refHH = tempHH;
//                 if (pullbackHL === null || curr.low < pullbackHL) pullbackHL = curr.low;
//             }

//             // STEP 4: Swing HL Tracking
//             if (isIdmTaken && curr.low < swingHL) {
//                 swingHL = curr.low;
//             }

//             // STEP 3: BOS Confirmation
//             if (isIdmTaken && validHH !== null && curr.close > validHH) {
//                 signals.push({ index: i, type: "BOS", trend: "BULLISH", price: curr.close, timestamp: curr.timestamp });
//                 tempHH = curr.high; 
//                 refHH = null; pullbackHL = null; validHH = null;
//                 isIdmTaken = false;
//             }

//             // STEP 5: CHoCH Confirmation
//             if (swingHL !== null && curr.close < swingHL) {
//                 signals.push({ index: i, type: "CHoCH", trend: "BEARISH", price: curr.close, timestamp: curr.timestamp });
//                 trend = -1;
//                 tempLL = curr.low;
//                 refLL = null; pullbackLH = null; validLL = null; swingLH = curr.high;
//                 isIdmTaken = false;
//             }
//         }
//     }
//     return signals;
// };

// // 🎯 MAIN SCANNER
// const checkPriceActionSignal = (htfCandles, ltfCandles, setupType) => {
//     let signal = { long: false, short: false, reason: "" };

//     if (!htfCandles || htfCandles.length < 15 || !ltfCandles || ltfCandles.length === 0) {
//         return signal;
//     }

//     const htfSignals = identifyMechanicalStructure(htfCandles);
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





/*/**
 * 🚀 Advanced Price Action Scanner - Mechanical Structure (HTF Manager)
 * FIXED: IDM Overwrite Bug Resolved
 */

// const identifyMechanicalStructure = (candles) => {
//     let trend = candles.length > 5 ? (candles[5].close > candles[0].close ? 1 : -1) : 0;
    
//     // 🔥 UPGRADE 1: अब हम सिर्फ 'Price' नहीं, बल्कि {price, time} दोनों याद रखेंगे
//     let tempHigh = { price: candles[0].high, time: candles[0].timestamp };
//     let tempLow = { price: candles[0].low, time: candles[0].timestamp };

//     let refLL = null, pullbackLH = null, validLL = null, swingLH = null;
//     let refHH = null, pullbackHL = null, validHH = null, swingHL = null;

//     let isIdmTaken = false;
//     let signals = [];

//     // 🔥 UPGRADE 2: Inside Bar को इग्नोर करने के लिए Reference Candle
//     let currentSwingRef = candles[0]; 

//     for (let i = 1; i < candles.length; i++) {
//         const curr = candles[i];

//         // टेम्परेरी हाई/लो को अपडेट करें (Time के साथ)
//         if (curr.high > tempHigh.price) tempHigh = { price: curr.high, time: curr.timestamp };
//         if (curr.low < tempLow.price) tempLow = { price: curr.low, time: curr.timestamp };

//         // ==========================================
//         // 📉 BEARISH STRUCTURE LOGIC (-1)
//         // ==========================================
//         if (trend === -1) {
            
//             // 1. IDM SWEEP / BREAK
//             if (pullbackLH !== null && curr.high > pullbackLH.price && !isIdmTaken) {
//                 isIdmTaken = true;
//                 validLL = refLL; 
//                 swingLH = { price: curr.high, time: curr.timestamp };

//                 // 🔥 UPGRADE 3: IDM सिग्नल को भी चार्ट के लिए सेव करें
//                 signals.push({
//                     type: "IDM", trend: "BEARISH",
//                     price: pullbackLH.price,
//                     startTime: pullbackLH.time, // कहाँ से लाइन शुरू होगी
//                     endTime: curr.timestamp     // कहाँ खत्म होगी
//                 });
//             }

//             // 2. PULLBACK (LH) DETECTION (Inside Bar Filtered)
//             // सिर्फ तब पुलबैक मानेंगे जब रेफरेंस कैंडल का हाई ब्रेक हो
//             if (curr.high > currentSwingRef.high && !isIdmTaken) {
//                 if (refLL === null || tempLow.price < refLL.price) refLL = { ...tempLow };
//                 if (pullbackLH === null || curr.high > pullbackLH.price) {
//                     pullbackLH = { price: curr.high, time: curr.timestamp };
//                 }
//             }

//             // नया Low बनने पर रेफरेंस कैंडल को शिफ्ट करें
//             if (curr.low < currentSwingRef.low) {
//                 currentSwingRef = curr;
//             }

//             // 3. TRACK SWING HIGH AFTER IDM
//             if (isIdmTaken && curr.high > swingLH.price) {
//                 swingLH = { price: curr.high, time: curr.timestamp };
//             }

//             // 4. BOS CONFIRMATION
//             if (isIdmTaken && validLL !== null && curr.close < validLL.price) {
//                 signals.push({ 
//                     type: "BOS", trend: "BEARISH", 
//                     price: validLL.price,
//                     startTime: validLL.time, // Valid Low कब बना था
//                     endTime: curr.timestamp  // ब्रेक कब हुआ
//                 });
                
//                 tempLow = { price: curr.low, time: curr.timestamp };
//                 refLL = null; pullbackLH = null; validLL = null;
//                 isIdmTaken = false;
//                 currentSwingRef = curr; // नया डाउन स्विंग शुरू
//             }

//             // 5. CHoCH CONFIRMATION
//             if (swingLH !== null && curr.close > swingLH.price) {
//                 signals.push({ 
//                     type: "CHoCH", trend: "BULLISH", 
//                     price: swingLH.price,
//                     startTime: swingLH.time,
//                     endTime: curr.timestamp
//                 });
//                 trend = 1;
//                 tempHigh = { price: curr.high, time: curr.timestamp };
//                 refHH = null; pullbackHL = null; validHH = null; 
//                 swingHL = { price: curr.low, time: curr.timestamp };
//                 isIdmTaken = false;
//                 currentSwingRef = curr;
//             }
//         }

//         // ==========================================
//         // 📈 BULLISH STRUCTURE LOGIC (1)
//         // ==========================================
//         else if (trend === 1) {
            
//             // 1. IDM SWEEP / BREAK
//             if (pullbackHL !== null && curr.low < pullbackHL.price && !isIdmTaken) {
//                 isIdmTaken = true;
//                 validHH = refHH;
//                 swingHL = { price: curr.low, time: curr.timestamp };

//                 signals.push({
//                     type: "IDM", trend: "BULLISH",
//                     price: pullbackHL.price,
//                     startTime: pullbackHL.time,
//                     endTime: curr.timestamp
//                 });
//             }

//             // 2. PULLBACK (HL) DETECTION (Inside Bar Filtered)
//             if (curr.low < currentSwingRef.low && !isIdmTaken) {
//                 if (refHH === null || tempHigh.price > refHH.price) refHH = { ...tempHigh };
//                 if (pullbackHL === null || curr.low < pullbackHL.price) {
//                     pullbackHL = { price: curr.low, time: curr.timestamp };
//                 }
//             }

//             // नया High बनने पर रेफरेंस शिफ्ट करें
//             if (curr.high > currentSwingRef.high) {
//                 currentSwingRef = curr;
//             }

//             // 3. TRACK SWING LOW AFTER IDM
//             if (isIdmTaken && curr.low < swingHL.price) {
//                 swingHL = { price: curr.low, time: curr.timestamp };
//             }

//             // 4. BOS CONFIRMATION
//             if (isIdmTaken && validHH !== null && curr.close > validHH.price) {
//                 signals.push({ 
//                     type: "BOS", trend: "BULLISH", 
//                     price: validHH.price,
//                     startTime: validHH.time,
//                     endTime: curr.timestamp
//                 });
//                 tempHigh = { price: curr.high, time: curr.timestamp }; 
//                 refHH = null; pullbackHL = null; validHH = null;
//                 isIdmTaken = false;
//                 currentSwingRef = curr;
//             }

//             // 5. CHoCH CONFIRMATION
//             if (swingHL !== null && curr.close < swingHL.price) {
//                 signals.push({ 
//                     type: "CHoCH", trend: "BEARISH", 
//                     price: swingHL.price,
//                     startTime: swingHL.time,
//                     endTime: curr.timestamp
//                 });
//                 trend = -1;
//                 tempLow = { price: curr.low, time: curr.timestamp };
//                 refLL = null; pullbackLH = null; validLL = null; 
//                 swingLH = { price: curr.high, time: curr.timestamp };
//                 isIdmTaken = false;
//                 currentSwingRef = curr;
//             }
//         }
//     }
//     return signals;
// };

// // 🎯 MAIN SCANNER
// const checkPriceActionSignal = (htfCandles, ltfCandles, setupType) => {
//     let signal = { long: false, short: false, reason: "" };

//     if (!htfCandles || htfCandles.length < 15 || !ltfCandles || ltfCandles.length === 0) {
//         return signal;
//     }

//     const htfSignals = identifyMechanicalStructure(htfCandles);
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






// const identifyMechanicalStructure = (candles) => {
//     let trend = candles.length > 5 ? (candles[5].close > candles[0].close ? 1 : -1) : 0;
    
//     // 🔥 UPGRADE 1: अब हम सिर्फ 'Price' नहीं, बल्कि {price, time} दोनों याद रखेंगे
//     let tempHigh = { price: candles[0].high, time: candles[0].timestamp };
//     let tempLow = { price: candles[0].low, time: candles[0].timestamp };

//     let refLL = null, pullbackLH = null, validLL = null, swingLH = null;
//     let refHH = null, pullbackHL = null, validHH = null, swingHL = null;

//     let isIdmTaken = false;
//     let signals = [];

//     // 🔥 UPGRADE 2: Inside Bar को इग्नोर करने के लिए Reference Candle
//     let currentSwingRef = candles[0]; 

//     for (let i = 1; i < candles.length; i++) {
//         const curr = candles[i];

//         // टेम्परेरी हाई/लो को अपडेट करें (Time के साथ)
//         if (curr.high > tempHigh.price) tempHigh = { price: curr.high, time: curr.timestamp };
//         if (curr.low < tempLow.price) tempLow = { price: curr.low, time: curr.timestamp };

//         // ==========================================
//         // 📉 BEARISH STRUCTURE LOGIC (-1)
//         // ==========================================
//         if (trend === -1) {
            
//             // 1. IDM SWEEP / BREAK
//             if (pullbackLH !== null && curr.high > pullbackLH.price && !isIdmTaken) {
//                 isIdmTaken = true;
//                 validLL = refLL; 
//                 swingLH = { price: curr.high, time: curr.timestamp };

//                 // 🔥 UPGRADE 3: IDM सिग्नल को भी चार्ट के लिए सेव करें
//                 signals.push({
//                     type: "IDM", trend: "BEARISH",
//                     price: pullbackLH.price,
//                     startTime: pullbackLH.time, // कहाँ से लाइन शुरू होगी
//                     endTime: curr.timestamp     // कहाँ खत्म होगी
//                 });
//             }

//             // 2. PULLBACK (LH) DETECTION (Inside Bar Filtered)
//             // सिर्फ तब पुलबैक मानेंगे जब रेफरेंस कैंडल का हाई ब्रेक हो
//             if (curr.high > currentSwingRef.high && !isIdmTaken) {
//                 if (refLL === null || tempLow.price < refLL.price) refLL = { ...tempLow };
//                 if (pullbackLH === null || curr.high > pullbackLH.price) {
//                     pullbackLH = { price: curr.high, time: curr.timestamp };
//                 }
//             }

//             // नया Low बनने पर रेफरेंस कैंडल को शिफ्ट करें
//             if (curr.low < currentSwingRef.low) {
//                 currentSwingRef = curr;
//             }

//             // 3. TRACK SWING HIGH AFTER IDM
//             if (isIdmTaken && curr.high > swingLH.price) {
//                 swingLH = { price: curr.high, time: curr.timestamp };
//             }

//             // 4. BOS CONFIRMATION
//             if (isIdmTaken && validLL !== null && curr.close < validLL.price) {
//                 signals.push({ 
//                     type: "BOS", trend: "BEARISH", 
//                     price: validLL.price,
//                     startTime: validLL.time, // Valid Low कब बना था
//                     endTime: curr.timestamp  // ब्रेक कब हुआ
//                 });
                
//                 tempLow = { price: curr.low, time: curr.timestamp };
//                 refLL = null; pullbackLH = null; validLL = null;
//                 isIdmTaken = false;
//                 currentSwingRef = curr; // नया डाउन स्विंग शुरू
//             }

//             // 5. CHoCH CONFIRMATION
//             if (swingLH !== null && curr.close > swingLH.price) {
//                 signals.push({ 
//                     type: "CHoCH", trend: "BULLISH", 
//                     price: swingLH.price,
//                     startTime: swingLH.time,
//                     endTime: curr.timestamp
//                 });
//                 trend = 1;
//                 tempHigh = { price: curr.high, time: curr.timestamp };
//                 refHH = null; pullbackHL = null; validHH = null; 
//                 swingHL = { price: curr.low, time: curr.timestamp };
//                 isIdmTaken = false;
//                 currentSwingRef = curr;
//             }
//         }

//         // ==========================================
//         // 📈 BULLISH STRUCTURE LOGIC (1)
//         // ==========================================
//         else if (trend === 1) {
            
//             // 1. IDM SWEEP / BREAK
//             if (pullbackHL !== null && curr.low < pullbackHL.price && !isIdmTaken) {
//                 isIdmTaken = true;
//                 validHH = refHH;
//                 swingHL = { price: curr.low, time: curr.timestamp };

//                 signals.push({
//                     type: "IDM", trend: "BULLISH",
//                     price: pullbackHL.price,
//                     startTime: pullbackHL.time,
//                     endTime: curr.timestamp
//                 });
//             }

//             // 2. PULLBACK (HL) DETECTION (Inside Bar Filtered)
//             if (curr.low < currentSwingRef.low && !isIdmTaken) {
//                 if (refHH === null || tempHigh.price > refHH.price) refHH = { ...tempHigh };
//                 if (pullbackHL === null || curr.low < pullbackHL.price) {
//                     pullbackHL = { price: curr.low, time: curr.timestamp };
//                 }
//             }

//             // नया High बनने पर रेफरेंस शिफ्ट करें
//             if (curr.high > currentSwingRef.high) {
//                 currentSwingRef = curr;
//             }

//             // 3. TRACK SWING LOW AFTER IDM
//             if (isIdmTaken && curr.low < swingHL.price) {
//                 swingHL = { price: curr.low, time: curr.timestamp };
//             }

//             // 4. BOS CONFIRMATION
//             if (isIdmTaken && validHH !== null && curr.close > validHH.price) {
//                 signals.push({ 
//                     type: "BOS", trend: "BULLISH", 
//                     price: validHH.price,
//                     startTime: validHH.time,
//                     endTime: curr.timestamp
//                 });
//                 tempHigh = { price: curr.high, time: curr.timestamp }; 
//                 refHH = null; pullbackHL = null; validHH = null;
//                 isIdmTaken = false;
//                 currentSwingRef = curr;
//             }

//             // 5. CHoCH CONFIRMATION
//             if (swingHL !== null && curr.close < swingHL.price) {
//                 signals.push({ 
//                     type: "CHoCH", trend: "BEARISH", 
//                     price: swingHL.price,
//                     startTime: swingHL.time,
//                     endTime: curr.timestamp
//                 });
//                 trend = -1;
//                 tempLow = { price: curr.low, time: curr.timestamp };
//                 refLL = null; pullbackLH = null; validLL = null; 
//                 swingLH = { price: curr.high, time: curr.timestamp };
//                 isIdmTaken = false;
//                 currentSwingRef = curr;
//             }
//         }
//     }
//     return signals;
// };

// // 🎯 MAIN SCANNER
// const checkPriceActionSignal = (htfCandles, ltfCandles, setupType) => {
//     let signal = { long: false, short: false, reason: "" };

//     if (!htfCandles || htfCandles.length < 15 || !ltfCandles || ltfCandles.length === 0) {
//         return signal;
//     }

//     const htfSignals = identifyMechanicalStructure(htfCandles);
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





// const identifyMechanicalStructure = (candles) => {
//     let trend = candles.length > 5 ? (candles[5].close > candles[0].close ? 1 : -1) : 0;

//     let signals = [];
//     if (candles.length === 0) return signals;

//     let refCandle = candles[0];

//     // ==========================================
//     // 📉 BEARISH STATE VARIABLES
//     // ==========================================
//     let refLL = null;           // Rule 1: Temporary Low waiting to be broken
//     let tempLH = null;          // Track highest point during pullback
//     let confirmedLH = null;     // Nearest Confirmed Lower High (IDM level)
//     let validLL = null;         // Confirmed Lower Low after IDM is taken
//     let swingLH = null;         // Highest point between IDM and BOS (CHoCH level)
//     let absoluteLowest = { price: candles[0].low, time: candles[0].timestamp }; // Track lowest point

//     // ==========================================
//     // 📈 BULLISH STATE VARIABLES
//     // ==========================================
//     let refHH = null;
//     let tempHL = null;
//     let confirmedHL = null;
//     let validHH = null;
//     let swingHL = null;
//     let absoluteHighest = { price: candles[0].high, time: candles[0].timestamp };

//     let isIdmTaken = false;

//     for (let i = 1; i < candles.length; i++) {
//         const curr = candles[i];

//         // 🔥 Rule 1 (B) Notes: INSIDE BAR FILTER
//         if (curr.high <= refCandle.high && curr.low >= refCandle.low) {
//             continue; // इनसाइड बार को पूरी तरह से इग्नोर करें 
//         }

//         // 🔥 Rule 1 (B) Notes: OUTSIDE BAR (Engulfing) FILTER
//         if (curr.high > refCandle.high && curr.low < refCandle.low) {
//             refCandle = curr; // पिछली कैंडल को इग्नोर करें, नई कैंडल को रेफरेंस बनाएं
//             continue; 
//         }

//         let brokeHigh = curr.high > refCandle.high;
//         let brokeLow = curr.low < refCandle.low;

//         // ट्रैक Absolute Low/High (Valid LL/HH सेट करने के काम आएगा)
//         if (curr.low < absoluteLowest.price) absoluteLowest = { price: curr.low, time: curr.timestamp };
//         if (curr.high > absoluteHighest.price) absoluteHighest = { price: curr.high, time: curr.timestamp };

//         // ==========================================
//         // 📉 BEARISH STRUCTURE LOGIC (-1)
//         // ==========================================
//         if (trend === -1) {
            
//             // 1. PULLBACK (LH) RULES
//             if (brokeHigh && refLL === null && !isIdmTaken) {
//                 // नया पुलबैक शुरू: Previous candle का low हमारा 'Ref LL' बन गया
//                 refLL = { price: refCandle.low, time: refCandle.timestamp };
//                 tempLH = { price: curr.high, time: curr.timestamp };
//             } 
//             else if (refLL !== null && !isIdmTaken) {
//                 // Rule 1 Notes (A): जब तक LH कन्फर्म नहीं होता, नया Ref LL नहीं खोजना है, बस High ट्रैक करें
//                 if (curr.high > tempLH.price) {
//                     tempLH = { price: curr.high, time: curr.timestamp };
//                 }

//                 // 🔥 सुधार: Sweep या Break दोनों को कंसीडर करें!
//                 // अगर current कैंडल का LOW, हमारे refLL के price से नीचे या उसके बराबर भी जाता है, तो LH कन्फर्म।
//                 if (curr.low <= refLL.price) {
//                     confirmedLH = tempLH; 
//                     refLL = null; // अगले पुलबैक के लिए रिसेट
//                 }
//             }

//             // 2. IDM RULES
//             if (confirmedLH !== null && curr.high > confirmedLH.price && !isIdmTaken) {
//                 isIdmTaken = true;
//                 validLL = { ...absoluteLowest }; // IDM लेते ही अब तक का सबसे Low 'Valid LL' बन गया
//                 swingLH = { price: curr.high, time: curr.timestamp }; 

//                 signals.push({
//                     type: "IDM", trend: "BEARISH",
//                     price: confirmedLH.price,
//                     startTime: confirmedLH.time,
//                     endTime: curr.timestamp
//                 });
                
//                 confirmedLH = null; // IDM कंज्यूम हो गया
//             }

//             // 4. SWING LH TRACKING (IDM से BOS के बीच)
//             if (isIdmTaken && curr.high > swingLH.price) {
//                 swingLH = { price: curr.high, time: curr.timestamp };
//             }

//             // 3. BOS RULES
//             if (isIdmTaken && validLL !== null && curr.close < validLL.price) { // Full Candle Close Break
//                 signals.push({
//                     type: "BOS", trend: "BEARISH",
//                     price: validLL.price,
//                     startTime: validLL.time,
//                     endTime: curr.timestamp
//                 });

//                 // BOS के बाद अगले लेग (Leg) के लिए रिसेट
//                 isIdmTaken = false;
//                 validLL = null;
//                 refLL = null;
//                 absoluteLowest = { price: curr.low, time: curr.timestamp }; 
//             }

//             // 5. CHoCH RULES
//             if (isIdmTaken && swingLH !== null && curr.close > swingLH.price) {
//                 signals.push({
//                     type: "CHoCH", trend: "BULLISH",
//                     price: swingLH.price,
//                     startTime: swingLH.time,
//                     endTime: curr.timestamp
//                 });
//                 trend = 1; // ट्रेंड Bullish हो गया
//                 isIdmTaken = false;
//                 refHH = null;
//                 absoluteHighest = { price: curr.high, time: curr.timestamp };
//             }
//         }
        
//         // ==========================================
//         // 📈 BULLISH STRUCTURE LOGIC (1)
//         // ==========================================
//         else if (trend === 1) {
            
//             // 1. PULLBACK (HL) RULES
//             if (brokeLow && refHH === null && !isIdmTaken) {
//                 refHH = { price: refCandle.high, time: refCandle.timestamp };
//                 tempHL = { price: curr.low, time: curr.timestamp };
//             } 
//             else if (refHH !== null && !isIdmTaken) {
//                 if (curr.low < tempHL.price) {
//                     tempHL = { price: curr.low, time: curr.timestamp };
//                 }

//                 // 🔥 सुधार: Sweep या Break दोनों को कंसीडर करें!
//                 // अगर current कैंडल का HIGH, हमारे refHH के price से ऊपर या उसके बराबर भी जाता है, तो HL कन्फर्म।
//                 if (curr.high >= refHH.price) {
//                     confirmedHL = tempHL; 
//                     refHH = null; 
//                 }
//             }

//             // 2. IDM RULES
//             if (confirmedHL !== null && curr.low < confirmedHL.price && !isIdmTaken) {
//                 isIdmTaken = true;
//                 validHH = { ...absoluteHighest }; 
//                 swingHL = { price: curr.low, time: curr.timestamp };

//                 signals.push({
//                     type: "IDM", trend: "BULLISH",
//                     price: confirmedHL.price,
//                     startTime: confirmedHL.time,
//                     endTime: curr.timestamp
//                 });
                
//                 confirmedHL = null; 
//             }

//             // 4. SWING HL TRACKING
//             if (isIdmTaken && curr.low < swingHL.price) {
//                 swingHL = { price: curr.low, time: curr.timestamp };
//             }

//             // 3. BOS RULES
//             if (isIdmTaken && validHH !== null && curr.close > validHH.price) {
//                 signals.push({
//                     type: "BOS", trend: "BULLISH",
//                     price: validHH.price,
//                     startTime: validHH.time,
//                     endTime: curr.timestamp
//                 });

//                 isIdmTaken = false;
//                 validHH = null;
//                 refHH = null;
//                 absoluteHighest = { price: curr.high, time: curr.timestamp }; 
//             }

//             // 5. CHoCH RULES
//             if (isIdmTaken && swingHL !== null && curr.close < swingHL.price) {
//                 signals.push({
//                     type: "CHoCH", trend: "BEARISH",
//                     price: swingHL.price,
//                     startTime: swingHL.time,
//                     endTime: curr.timestamp
//                 });
//                 trend = -1; // ट्रेंड Bearish हो गया
//                 isIdmTaken = false;
//                 refLL = null;
//                 absoluteLowest = { price: curr.low, time: curr.timestamp };
//             }
//         }

//         // हर वैलिड कैंडल को नई रेफरेंस कैंडल बनाएं 
//         refCandle = curr;
//     }

//     return signals;
// };

// // 🎯 MAIN SCANNER
// const checkPriceActionSignal = (htfCandles, ltfCandles, setupType) => {
//     let signal = { long: false, short: false, reason: "" };

//     if (!htfCandles || htfCandles.length < 15 || !ltfCandles || ltfCandles.length === 0) {
//         return signal;
//     }

//     const htfSignals = identifyMechanicalStructure(htfCandles);
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




// const identifyMechanicalStructure = (candles) => {
//     let trend = candles.length > 5 ? (candles[5].close > candles[0].close ? 1 : -1) : 0;

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
    
//     // 🔥 Rule 4 & 5 के लिए नए वेरिएबल्स
//     let tempSwingHigh = null;   // IDM और BOS के बीच का हाई ट्रैक करेगा
//     let lockedSwingHigh = null; // BOS होने के बाद यह लॉक हो जाएगा (यही CHoCH लाइन है)
    
//     let absoluteLowest = { price: candles[0].low, time: candles[0].timestamp };

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

//     let isIdmTaken = false;

//     for (let i = 1; i < candles.length; i++) {
//         const curr = candles[i];

//         // 1. INSIDE BAR FILTER
//         if (curr.high <= refCandle.high && curr.low >= refCandle.low) continue; 
        
//         // 2. OUTSIDE BAR FILTER
//         if (curr.high > refCandle.high && curr.low < refCandle.low) {
//             refCandle = curr; 
//             continue; 
//         }

//         let brokeHigh = curr.high > refCandle.high;
//         let brokeLow = curr.low < refCandle.low;

//         // ट्रैक Absolute Low/High
//         if (curr.low < absoluteLowest.price) absoluteLowest = { price: curr.low, time: curr.timestamp };
//         if (curr.high > absoluteHighest.price) absoluteHighest = { price: curr.high, time: curr.timestamp };

//         // ==========================================
//         // 📉 BEARISH STRUCTURE LOGIC (-1)
//         // ==========================================
//         if (trend === -1) {
            
//             // 🔥 RULE 5: CHoCH RULES (सबसे पहले चेक करें)
//             // अगर लॉक किया हुआ Swing LH फुल कैंडल से ब्रेक हो जाए
//             if (lockedSwingHigh !== null && curr.close > lockedSwingHigh.price) {
//                 signals.push({
//                     type: "CHoCH", trend: "BULLISH",
//                     price: lockedSwingHigh.price,
//                     startTime: lockedSwingHigh.time,
//                     endTime: curr.timestamp
//                 });
                
//                 trend = 1; // 🚀 ट्रेंड बदल गया!
//                 isIdmTaken = false;
                
//                 // बेयरिश ट्रेंड का सबसे लोएस्ट पॉइंट अब बुलिश के लिए CHoCH लाइन बन जाएगा
//                 lockedSwingLow = { ...absoluteLowest }; 
                
//                 // बेयरिश का कचरा साफ़ करें
//                 validLL = null; refLL = null; tempSwingHigh = null; lockedSwingHigh = null;
//                 absoluteHighest = { price: curr.high, time: curr.timestamp };
//                 refCandle = curr;
//                 continue; // इस कैंडल के लिए आगे का बेयरिश लॉजिक छोड़ दें
//             }

//             // RULE 1 & 2: PULLBACK & IDM
//             if (brokeHigh && refLL === null && !isIdmTaken) {
//                 refLL = { price: refCandle.low, time: refCandle.timestamp };
//                 tempLH = { price: curr.high, time: curr.timestamp };
//             } 
//             else if (refLL !== null && !isIdmTaken) {
//                 if (curr.high > tempLH.price) tempLH = { price: curr.high, time: curr.timestamp };

//                 // Sweep or Break (IDM Level Confirmed)
//                 if (curr.low <= refLL.price) {
//                     confirmedLH = tempLH; 
//                     refLL = null; 
//                 }
//             }

//             // IDM TAKEN
//             if (confirmedLH !== null && curr.high >= confirmedLH.price && !isIdmTaken) {
//                 isIdmTaken = true;
//                 validLL = { ...absoluteLowest }; 
                
//                 // 🔥 RULE 4 Start: IDM लेते ही Swing LH ट्रैक करना शुरू करें
//                 tempSwingHigh = { price: curr.high, time: curr.timestamp }; 

//                 signals.push({
//                     type: "IDM", trend: "BEARISH",
//                     price: confirmedLH.price,
//                     startTime: confirmedLH.time,
//                     endTime: curr.timestamp
//                 });
//                 confirmedLH = null; 
//             }

//             // 🔥 RULE 4 Tracking: IDM और BOS के बीच का सबसे हाई पॉइंट ट्रैक करें
//             if (isIdmTaken && curr.high > tempSwingHigh.price) {
//                 tempSwingHigh = { price: curr.high, time: curr.timestamp };
//             }

//             // RULE 3: BOS CONFIRMATION
//             if (isIdmTaken && validLL !== null && curr.close < validLL.price) { 
//                 signals.push({
//                     type: "BOS", trend: "BEARISH",
//                     price: validLL.price,
//                     startTime: validLL.time,
//                     endTime: curr.timestamp
//                 });

//                 // 🔥 RULE 4 Lock: BOS होते ही, उस लेग (leg) का हाई पॉइंट 'Swing LH' बन जाएगा!
//                 lockedSwingHigh = { ...tempSwingHigh }; 

//                 // Reset for next leg
//                 isIdmTaken = false;
//                 validLL = null;
//                 refLL = null;
//                 absoluteLowest = { price: curr.low, time: curr.timestamp }; 
//             }
//         }
        
//         // ==========================================
//         // 📈 BULLISH STRUCTURE LOGIC (1)
//         // ==========================================
//         else if (trend === 1) {
            
//             // 🔥 RULE 5: CHoCH RULES (Bullish to Bearish)
//             if (lockedSwingLow !== null && curr.close < lockedSwingLow.price) {
//                 signals.push({
//                     type: "CHoCH", trend: "BEARISH",
//                     price: lockedSwingLow.price,
//                     startTime: lockedSwingLow.time,
//                     endTime: curr.timestamp
//                 });
                
//                 trend = -1; // 🚀 ट्रेंड बदल गया!
//                 isIdmTaken = false;
//                 lockedSwingHigh = { ...absoluteHighest }; 
                
//                 validHH = null; refHH = null; tempSwingLow = null; lockedSwingLow = null;
//                 absoluteLowest = { price: curr.low, time: curr.timestamp };
//                 refCandle = curr;
//                 continue; 
//             }

//             // RULE 1 & 2: PULLBACK & IDM
//             if (brokeLow && refHH === null && !isIdmTaken) {
//                 refHH = { price: refCandle.high, time: refCandle.timestamp };
//                 tempHL = { price: curr.low, time: curr.timestamp };
//             } 
//             else if (refHH !== null && !isIdmTaken) {
//                 if (curr.low < tempHL.price) tempHL = { price: curr.low, time: curr.timestamp };

//                 // Sweep or Break
//                 if (curr.high >= refHH.price) {
//                     confirmedHL = tempHL; 
//                     refHH = null; 
//                 }
//             }

//             // IDM TAKEN
//             if (confirmedHL !== null && curr.low <= confirmedHL.price && !isIdmTaken) {
//                 isIdmTaken = true;
//                 validHH = { ...absoluteHighest }; 
                
//                 // 🔥 RULE 4 Start
//                 tempSwingLow = { price: curr.low, time: curr.timestamp }; 

//                 signals.push({
//                     type: "IDM", trend: "BULLISH",
//                     price: confirmedHL.price,
//                     startTime: confirmedHL.time,
//                     endTime: curr.timestamp
//                 });
//                 confirmedHL = null; 
//             }

//             // 🔥 RULE 4 Tracking
//             if (isIdmTaken && curr.low < tempSwingLow.price) {
//                 tempSwingLow = { price: curr.low, time: curr.timestamp };
//             }

//             // RULE 3: BOS CONFIRMATION
//             if (isIdmTaken && validHH !== null && curr.close > validHH.price) {
//                 signals.push({
//                     type: "BOS", trend: "BULLISH",
//                     price: validHH.price,
//                     startTime: validHH.time,
//                     endTime: curr.timestamp
//                 });

//                 // 🔥 RULE 4 Lock
//                 lockedSwingLow = { ...tempSwingLow }; 

//                 isIdmTaken = false;
//                 validHH = null;
//                 refHH = null;
//                 absoluteHighest = { price: curr.high, time: curr.timestamp }; 
//             }
//         }

//         refCandle = curr;
//     }

//     return signals;
// };

// // 🎯 MAIN SCANNER
// const checkPriceActionSignal = (htfCandles, ltfCandles, setupType) => {
//     let signal = { long: false, short: false, reason: "" };

//     if (!htfCandles || htfCandles.length < 15 || !ltfCandles || ltfCandles.length === 0) {
//         return signal;
//     }

//     const htfSignals = identifyMechanicalStructure(htfCandles);
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




// const identifyMechanicalStructure = (candles) => {
//     let trend = candles.length > 5 ? (candles[5].close > candles[0].close ? 1 : -1) : 0;

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

//     let isIdmTaken = false;

//     for (let i = 1; i < candles.length; i++) {
//         const curr = candles[i];

//         // 🔥 FIX 1: किसी भी कैंडल को स्किप करने से पहले Absolute High/Low ट्रैक करें!
//         if (curr.low < absoluteLowest.price) absoluteLowest = { price: curr.low, time: curr.timestamp };
//         if (curr.high > absoluteHighest.price) absoluteHighest = { price: curr.high, time: curr.timestamp };

//         // INSIDE/OUTSIDE BAR IDENTIFICATION
//         let isInsideBar = curr.high <= refCandle.high && curr.low >= refCandle.low;
//         let isOutsideBar = curr.high > refCandle.high && curr.low < refCandle.low;

//         // 🔥 FIX 2: इनसाइड बार को इग्नोर करें, लेकिन आउटसाइड बार पर लॉजिक रन होने दें!
//         if (isInsideBar) continue; 

//         let brokeHigh = curr.high > refCandle.high;
//         let brokeLow = curr.low < refCandle.low;

//         // ==========================================
//         // 📉 BEARISH STRUCTURE LOGIC (-1)
//         // ==========================================
//         if (trend === -1) {
            
//             // RULE 5: CHoCH
//             if (lockedSwingHigh !== null && curr.close > lockedSwingHigh.price) {
//                 signals.push({ type: "CHoCH", trend: "BULLISH", price: lockedSwingHigh.price, startTime: lockedSwingHigh.time, endTime: curr.timestamp });
//                 trend = 1; 
//                 isIdmTaken = false;
//                 lockedSwingLow = { ...absoluteLowest }; 
//                 validLL = null; refLL = null; tempSwingHigh = null; lockedSwingHigh = null; confirmedLH = null;
//                 absoluteHighest = { price: curr.high, time: curr.timestamp };
//                 refCandle = curr;
//                 continue; 
//             }

//             // RULE 1: PULLBACK (LH) - (आउटसाइड बार नया पुलबैक शुरू नहीं करती, बस पुरानी को निगलती है)
//             if (brokeHigh && !isOutsideBar && refLL === null && !isIdmTaken) {
//                 refLL = { price: refCandle.low, time: refCandle.timestamp };
//                 tempLH = { price: curr.high, time: curr.timestamp };
//             } 
//             else if (refLL !== null && !isIdmTaken) {
//                 if (curr.high > tempLH.price) tempLH = { price: curr.high, time: curr.timestamp };
//                 if (curr.low <= refLL.price) {
//                     confirmedLH = tempLH; 
//                     refLL = null; 
//                 }
//             }

//             // RULE 2: IDM TAKEN
//             if (confirmedLH !== null && curr.high >= confirmedLH.price && !isIdmTaken) {
//                 isIdmTaken = true;
//                 validLL = { ...absoluteLowest }; 
//                 tempSwingHigh = { price: curr.high, time: curr.timestamp }; 
//                 signals.push({ type: "IDM", trend: "BEARISH", price: confirmedLH.price, startTime: confirmedLH.time, endTime: curr.timestamp });
//                 confirmedLH = null; 
//             }

//             // RULE 4 Tracking: SWING LH
//             if (isIdmTaken && curr.high > tempSwingHigh.price) {
//                 tempSwingHigh = { price: curr.high, time: curr.timestamp };
//             }

//             // RULE 3: BOS
//             if (isIdmTaken && validLL !== null && curr.close < validLL.price) { 
//                 signals.push({ type: "BOS", trend: "BEARISH", price: validLL.price, startTime: validLL.time, endTime: curr.timestamp });
//                 lockedSwingHigh = { ...tempSwingHigh }; 
//                 isIdmTaken = false;
//                 validLL = null;
//                 refLL = null;
//                 absoluteLowest = { price: curr.low, time: curr.timestamp }; 
//             }
//         }
        
//         // ==========================================
//         // 📈 BULLISH STRUCTURE LOGIC (1)
//         // ==========================================
//         else if (trend === 1) {
            
//             // RULE 5: CHoCH
//             if (lockedSwingLow !== null && curr.close < lockedSwingLow.price) {
//                 signals.push({ type: "CHoCH", trend: "BEARISH", price: lockedSwingLow.price, startTime: lockedSwingLow.time, endTime: curr.timestamp });
//                 trend = -1; 
//                 isIdmTaken = false;
//                 lockedSwingHigh = { ...absoluteHighest }; 
//                 validHH = null; refHH = null; tempSwingLow = null; lockedSwingLow = null; confirmedHL = null;
//                 absoluteLowest = { price: curr.low, time: curr.timestamp };
//                 refCandle = curr;
//                 continue; 
//             }

//             // RULE 1: PULLBACK (HL)
//             if (brokeLow && !isOutsideBar && refHH === null && !isIdmTaken) {
//                 refHH = { price: refCandle.high, time: refCandle.timestamp };
//                 tempHL = { price: curr.low, time: curr.timestamp };
//             } 
//             else if (refHH !== null && !isIdmTaken) {
//                 if (curr.low < tempHL.price) tempHL = { price: curr.low, time: curr.timestamp };
//                 if (curr.high >= refHH.price) {
//                     confirmedHL = tempHL; 
//                     refHH = null; 
//                 }
//             }

//             // RULE 2: IDM TAKEN
//             if (confirmedHL !== null && curr.low <= confirmedHL.price && !isIdmTaken) {
//                 isIdmTaken = true;
//                 validHH = { ...absoluteHighest }; 
//                 tempSwingLow = { price: curr.low, time: curr.timestamp }; 
//                 signals.push({ type: "IDM", trend: "BULLISH", price: confirmedHL.price, startTime: confirmedHL.time, endTime: curr.timestamp });
//                 confirmedHL = null; 
//             }

//             // RULE 4 Tracking: SWING HL
//             if (isIdmTaken && curr.low < tempSwingLow.price) {
//                 tempSwingLow = { price: curr.low, time: curr.timestamp };
//             }

//             // RULE 3: BOS
//             if (isIdmTaken && validHH !== null && curr.close > validHH.price) {
//                 signals.push({ type: "BOS", trend: "BULLISH", price: validHH.price, startTime: validHH.time, endTime: curr.timestamp });
//                 lockedSwingLow = { ...tempSwingLow }; 
//                 isIdmTaken = false;
//                 validHH = null;
//                 refHH = null;
//                 absoluteHighest = { price: curr.high, time: curr.timestamp }; 
//             }
//         }

//         // 🔥 हर वैलिड कैंडल (नार्मल या आउटसाइड बार) को नया रेफरेंस बनाएं
//         refCandle = curr; 
//     }

//     return signals;
// };

// // 🎯 MAIN SCANNER
// const checkPriceActionSignal = (htfCandles, ltfCandles, setupType) => {
//     let signal = { long: false, short: false, reason: "" };

//     if (!htfCandles || htfCandles.length < 15 || !ltfCandles || ltfCandles.length === 0) {
//         return signal;
//     }

//     const htfSignals = identifyMechanicalStructure(htfCandles);
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





// const identifyMechanicalStructure = (candles) => {
//     let trend = candles.length > 5 ? (candles[5].close > candles[0].close ? 1 : -1) : 0;
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

//     // 🔥 Liquidity Sweep (X) Variables
//     let refX_BOS_Bullish = null; 
//     let majorIdm_Bullish = { price: Infinity, time: null }; 
//     let refX_CHoCH_Bullish = null;

//     let isIdmTaken = false;

//     for (let i = 1; i < candles.length; i++) {
//         const curr = candles[i];

//         if (curr.low < absoluteLowest.price) absoluteLowest = { price: curr.low, time: curr.timestamp };
//         if (curr.high > absoluteHighest.price) absoluteHighest = { price: curr.high, time: curr.timestamp };

//         let isInsideBar = curr.high <= refCandle.high && curr.low >= refCandle.low;
//         let isOutsideBar = curr.high > refCandle.high && curr.low < refCandle.low;

//         if (isInsideBar) continue; 

//         let brokeHigh = curr.high > refCandle.high;
//         let brokeLow = curr.low < refCandle.low;

//        // ==========================================
//         // 📉 BEARISH STRUCTURE LOGIC (-1)
//         // ==========================================
//         if (trend === -1) {
            
//             if (isIdmTaken) {
//                 if (curr.high > majorIdm_Bearish.price) majorIdm_Bearish = { price: curr.high, time: curr.timestamp };
//             }

//             // RULE 5 & 6c: CHoCH & Sweep Logic
//             if (lockedSwingHigh !== null) {
//                 // इंजन चेक करने के लिए sweep level (breakLevel) यूज़ करेगा
//                 let breakLevel = refX_CHoCH_Bearish ? refX_CHoCH_Bearish.price : lockedSwingHigh.price;

//                 if (curr.high > breakLevel) {
//                     if (curr.close > breakLevel) { // 🚀 Full Body Break (Valid CHoCH)
                        
//                         // 🔥 VISUAL FIX: लाइन हमेशा ओरिजिनल 'lockedSwingHigh' से ही ड्रा होगी!
//                         signals.push({ 
//                             type: "CHoCH", trend: "BULLISH", 
//                             price: lockedSwingHigh.price,      // <-- Original Price
//                             startTime: lockedSwingHigh.time,   // <-- Original Time
//                             endTime: curr.timestamp 
//                         });
                        
//                         trend = 1; 
//                         isIdmTaken = false;
//                         lockedSwingLow = { ...absoluteLowest }; 
//                         validLL = null; refLL = null; tempSwingHigh = null; lockedSwingHigh = null; confirmedLH = null;
//                         refX_CHoCH_Bearish = null; refX_BOS_Bearish = null;
//                         absoluteHighest = { price: curr.high, time: curr.timestamp };
//                         refCandle = curr;
//                         continue; 
//                     } else { // 🧹 Sweep (Ref X)
//                         refX_CHoCH_Bearish = { price: curr.high, time: curr.timestamp };
//                     }
//                 }
//             }

//             // ... (PULLBACK और IDM का लॉजिक वही रहेगा) ...
//             if (brokeHigh && !isOutsideBar && refLL === null && !isIdmTaken) {
//                 refLL = { price: refCandle.low, time: refCandle.timestamp };
//                 tempLH = { price: curr.high, time: curr.timestamp };
//             } else if (refLL !== null && !isIdmTaken) {
//                 if (curr.high > tempLH.price) tempLH = { price: curr.high, time: curr.timestamp };
//                 if (curr.low <= refLL.price) { confirmedLH = tempLH; refLL = null; }
//             }

//             if (confirmedLH !== null && curr.high >= confirmedLH.price && !isIdmTaken) {
//                 isIdmTaken = true;
//                 validLL = { ...absoluteLowest }; 
//                 tempSwingHigh = { price: curr.high, time: curr.timestamp }; 
//                 majorIdm_Bearish = { price: curr.high, time: curr.timestamp }; 
//                 signals.push({ type: "IDM", trend: "BEARISH", price: confirmedLH.price, startTime: confirmedLH.time, endTime: curr.timestamp });
//                 confirmedLH = null; 
//             }

//             if (isIdmTaken && curr.high > tempSwingHigh.price) {
//                 tempSwingHigh = { price: curr.high, time: curr.timestamp };
//             }

//             // RULE 3 & 6a: BOS & Sweep Logic
//             if (isIdmTaken && validLL !== null) { 
//                 let breakLevel = refX_BOS_Bearish ? refX_BOS_Bearish.price : validLL.price;

//                 if (curr.low < breakLevel) {
//                     if (curr.close < breakLevel) { // 🚀 Full Body Break (Valid BOS)
                        
//                         // 🔥 VISUAL FIX: लाइन हमेशा ओरिजिनल 'validLL' से ही ड्रा होगी!
//                         signals.push({ 
//                             type: "BOS", trend: "BEARISH", 
//                             price: validLL.price,        // <-- Original Price
//                             startTime: validLL.time,     // <-- Original Time
//                             endTime: curr.timestamp 
//                         });
                        
//                         if (refX_CHoCH_Bearish) {
//                             signals.push({ type: "X", trend: "BEARISH", price: refX_CHoCH_Bearish.price, startTime: lockedSwingHigh.time, endTime: refX_CHoCH_Bearish.time });
//                             refX_CHoCH_Bearish = null;
//                         }

//                         lockedSwingHigh = { ...tempSwingHigh }; 
//                         isIdmTaken = false;
//                         validLL = null; refLL = null; refX_BOS_Bearish = null;
//                         absoluteLowest = { price: curr.low, time: curr.timestamp }; 
//                     } else { // 🧹 Sweep (Ref X)
//                         refX_BOS_Bearish = { price: curr.low, time: curr.timestamp, majorIdmTarget: { ...majorIdm_Bearish } };
//                     }
//                 }

//                 if (refX_BOS_Bearish && refX_BOS_Bearish.majorIdmTarget) {
//                     if (curr.high > refX_BOS_Bearish.majorIdmTarget.price) {
//                         signals.push({ type: "IDM", trend: "BEARISH", price: refX_BOS_Bearish.majorIdmTarget.price, startTime: refX_BOS_Bearish.majorIdmTarget.time, endTime: curr.timestamp });
//                         signals.push({ type: "X", trend: "BEARISH", price: refX_BOS_Bearish.price, startTime: validLL.time, endTime: refX_BOS_Bearish.time });
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
//                         absoluteLowest = { price: curr.low, time: curr.timestamp };
//                         refCandle = curr;
//                         continue; 
//                     } else { // 🧹 Sweep (Ref X)
//                         refX_CHoCH_Bullish = { price: curr.low, time: curr.timestamp };
//                     }
//                 }
//             }

//             // ... (PULLBACK और IDM का लॉजिक वही रहेगा) ...
//             if (brokeLow && !isOutsideBar && refHH === null && !isIdmTaken) {
//                 refHH = { price: refCandle.high, time: refCandle.timestamp };
//                 tempHL = { price: curr.low, time: curr.timestamp };
//             } else if (refHH !== null && !isIdmTaken) {
//                 if (curr.low < tempHL.price) tempHL = { price: curr.low, time: curr.timestamp };
//                 if (curr.high >= refHH.price) { confirmedHL = tempHL; refHH = null; }
//             }

//             if (confirmedHL !== null && curr.low <= confirmedHL.price && !isIdmTaken) {
//                 isIdmTaken = true;
//                 validHH = { ...absoluteHighest }; 
//                 tempSwingLow = { price: curr.low, time: curr.timestamp }; 
//                 majorIdm_Bullish = { price: curr.low, time: curr.timestamp }; 
//                 signals.push({ type: "IDM", trend: "BULLISH", price: confirmedHL.price, startTime: confirmedHL.time, endTime: curr.timestamp });
//                 confirmedHL = null; 
//             }

//             if (isIdmTaken && curr.low < tempSwingLow.price) {
//                 tempSwingLow = { price: curr.low, time: curr.timestamp };
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
//                             signals.push({ type: "X", trend: "BULLISH", price: refX_CHoCH_Bullish.price, startTime: lockedSwingLow.time, endTime: refX_CHoCH_Bullish.time });
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
//                         signals.push({ type: "X", trend: "BULLISH", price: refX_BOS_Bullish.price, startTime: validHH.time, endTime: refX_BOS_Bullish.time });
//                         validHH = { price: refX_BOS_Bullish.price, time: refX_BOS_Bullish.time };
//                         refX_BOS_Bullish = null; 
//                         majorIdm_Bullish = { price: curr.low, time: curr.timestamp }; 
//                     }
//                 }
//             }
//         }

//         refCandle = curr; 
//     }
//     return signals;
// };

// // 🎯 MAIN SCANNER
// const checkPriceActionSignal = (htfCandles, ltfCandles, setupType) => {
//     let signal = { long: false, short: false, reason: "" };

//     if (!htfCandles || htfCandles.length < 15 || !ltfCandles || ltfCandles.length === 0) {
//         return signal;
//     }

//     const htfSignals = identifyMechanicalStructure(htfCandles);
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





// const identifyMechanicalStructure = (candles) => {
//     let trend = candles.length > 5 ? (candles[5].close > candles[0].close ? 1 : -1) : 0;
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

//     // 🔥 Liquidity Sweep (X) Variables
//     let refX_BOS_Bullish = null; 
//     let majorIdm_Bullish = { price: Infinity, time: null }; 
//     let refX_CHoCH_Bullish = null;

//     let isIdmTaken = false;

//     for (let i = 1; i < candles.length; i++) {
//         const curr = candles[i];

//         if (curr.low < absoluteLowest.price) absoluteLowest = { price: curr.low, time: curr.timestamp };
//         if (curr.high > absoluteHighest.price) absoluteHighest = { price: curr.high, time: curr.timestamp };

//         let isInsideBar = curr.high <= refCandle.high && curr.low >= refCandle.low;
//         let isOutsideBar = curr.high > refCandle.high && curr.low < refCandle.low;

//         if (isInsideBar) continue; 

//         let brokeHigh = curr.high > refCandle.high;
//         let brokeLow = curr.low < refCandle.low;

//        // ==========================================
//         // 📉 BEARISH STRUCTURE LOGIC (-1)
//         // ==========================================
//         if (trend === -1) {
            
//             if (isIdmTaken) {
//                 if (curr.high > majorIdm_Bearish.price) majorIdm_Bearish = { price: curr.high, time: curr.timestamp };
//             }

//             // RULE 5 & 6c: CHoCH & Sweep Logic
//             if (lockedSwingHigh !== null) {
//                 // इंजन चेक करने के लिए sweep level (breakLevel) यूज़ करेगा
//                 let breakLevel = refX_CHoCH_Bearish ? refX_CHoCH_Bearish.price : lockedSwingHigh.price;

//                 if (curr.high > breakLevel) {
//                     if (curr.close > breakLevel) { // 🚀 Full Body Break (Valid CHoCH)
                        
//                         // 🔥 VISUAL FIX: लाइन हमेशा ओरिजिनल 'lockedSwingHigh' से ही ड्रा होगी!
//                         signals.push({ 
//                             type: "CHoCH", trend: "BULLISH", 
//                             price: lockedSwingHigh.price,      // <-- Original Price
//                             startTime: lockedSwingHigh.time,   // <-- Original Time
//                             endTime: curr.timestamp 
//                         });
                        
//                         trend = 1; 
//                         isIdmTaken = false;
//                         lockedSwingLow = { ...absoluteLowest }; 
//                         validLL = null; refLL = null; tempSwingHigh = null; lockedSwingHigh = null; confirmedLH = null;
//                         refX_CHoCH_Bearish = null; refX_BOS_Bearish = null;
//                         absoluteHighest = { price: curr.high, time: curr.timestamp };
//                         refCandle = curr;
//                         continue; 
//                     } else { // 🧹 Sweep (Ref X)
//                         refX_CHoCH_Bearish = { price: curr.high, time: curr.timestamp };
//                     }
//                 }
//             }

//             // ... (PULLBACK और IDM का लॉजिक वही रहेगा) ...
//             if (brokeHigh && !isOutsideBar && refLL === null && !isIdmTaken) {
//                 refLL = { price: refCandle.low, time: refCandle.timestamp };
//                 tempLH = { price: curr.high, time: curr.timestamp };
//             } else if (refLL !== null && !isIdmTaken) {
//                 if (curr.high > tempLH.price) tempLH = { price: curr.high, time: curr.timestamp };
//                 if (curr.low <= refLL.price) { confirmedLH = tempLH; refLL = null; }
//             }

//             if (confirmedLH !== null && curr.high >= confirmedLH.price && !isIdmTaken) {
//                 isIdmTaken = true;
//                 validLL = { ...absoluteLowest }; 
//                 tempSwingHigh = { price: curr.high, time: curr.timestamp }; 
//                 majorIdm_Bearish = { price: curr.high, time: curr.timestamp }; 
//                 signals.push({ type: "IDM", trend: "BEARISH", price: confirmedLH.price, startTime: confirmedLH.time, endTime: curr.timestamp });
//                 confirmedLH = null; 
//             }

//             if (isIdmTaken && curr.high > tempSwingHigh.price) {
//                 tempSwingHigh = { price: curr.high, time: curr.timestamp };
//             }

//             // RULE 3 & 6a: BOS & Sweep Logic
//             if (isIdmTaken && validLL !== null) { 
//                 let breakLevel = refX_BOS_Bearish ? refX_BOS_Bearish.price : validLL.price;

//                 if (curr.low < breakLevel) {
//                     if (curr.close < breakLevel) { // 🚀 Full Body Break (Valid BOS)
                        
//                         // 🔥 VISUAL FIX: लाइन हमेशा ओरिजिनल 'validLL' से ही ड्रा होगी!
//                         signals.push({ 
//                             type: "BOS", trend: "BEARISH", 
//                             price: validLL.price,        // <-- Original Price
//                             startTime: validLL.time,     // <-- Original Time
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
//                     } else { // 🧹 Sweep (Ref X)
//                         refX_BOS_Bearish = { price: curr.low, time: curr.timestamp, majorIdmTarget: { ...majorIdm_Bearish } };
//                     }
//                 }

//                 if (refX_BOS_Bearish && refX_BOS_Bearish.majorIdmTarget) {
//                     if (curr.high > refX_BOS_Bearish.majorIdmTarget.price) {
//                         signals.push({ type: "IDM", trend: "BEARISH", price: refX_BOS_Bearish.majorIdmTarget.price, startTime: refX_BOS_Bearish.majorIdmTarget.time, endTime: curr.timestamp });
                        
//                         signals.push({ type: "X", trend: "BEARISH", price: validLL.price, startTime: validLL.time, endTime: refX_BOS_Bearish.time }); // <-- यहाँ बदलाव है
                        
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
//                         absoluteLowest = { price: curr.low, time: curr.timestamp };
//                         refCandle = curr;
//                         continue; 
//                     } else { // 🧹 Sweep (Ref X)
//                         refX_CHoCH_Bullish = { price: curr.low, time: curr.timestamp };
//                     }
//                 }
//             }

//             // ... (PULLBACK और IDM का लॉजिक वही रहेगा) ...
//             if (brokeLow && !isOutsideBar && refHH === null && !isIdmTaken) {
//                 refHH = { price: refCandle.high, time: refCandle.timestamp };
//                 tempHL = { price: curr.low, time: curr.timestamp };
//             } else if (refHH !== null && !isIdmTaken) {
//                 if (curr.low < tempHL.price) tempHL = { price: curr.low, time: curr.timestamp };
//                 if (curr.high >= refHH.price) { confirmedHL = tempHL; refHH = null; }
//             }

//             if (confirmedHL !== null && curr.low <= confirmedHL.price && !isIdmTaken) {
//                 isIdmTaken = true;
//                 validHH = { ...absoluteHighest }; 
//                 tempSwingLow = { price: curr.low, time: curr.timestamp }; 
//                 majorIdm_Bullish = { price: curr.low, time: curr.timestamp }; 
//                 signals.push({ type: "IDM", trend: "BULLISH", price: confirmedHL.price, startTime: confirmedHL.time, endTime: curr.timestamp });
//                 confirmedHL = null; 
//             }

//             if (isIdmTaken && curr.low < tempSwingLow.price) {
//                 tempSwingLow = { price: curr.low, time: curr.timestamp };
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
//                             signals.push({ type: "X", trend: "BULLISH", price: lockedSwingLow.price, startTime: lockedSwingLow.time, endTime: refX_CHoCH_Bullish.time });
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
                        
//                         signals.push({ type: "X", trend: "BULLISH", price: validHH.price, startTime: validHH.time, endTime: refX_BOS_Bullish.time }); // <-- यहाँ बदलाव है
                        
//                         validHH = { price: refX_BOS_Bullish.price, time: refX_BOS_Bullish.time };
//                         refX_BOS_Bullish = null; 
//                         majorIdm_Bullish = { price: curr.low, time: curr.timestamp }; 
//                     }
//                 }
//             }
//         }

//         refCandle = curr; 
//     }
//     return signals;
// };

// // 🎯 MAIN SCANNER
// const checkPriceActionSignal = (htfCandles, ltfCandles, setupType) => {
//     let signal = { long: false, short: false, reason: "" };

//     if (!htfCandles || htfCandles.length < 15 || !ltfCandles || ltfCandles.length === 0) {
//         return signal;
//     }

//     const htfSignals = identifyMechanicalStructure(htfCandles);
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





// const identifyMechanicalStructure = (candles) => {
//     let trend = candles.length > 5 ? (candles[5].close > candles[0].close ? 1 : -1) : 0;
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

//     // 🔥 Liquidity Sweep (X) Variables
//     let refX_BOS_Bullish = null; 
//     let majorIdm_Bullish = { price: Infinity, time: null }; 
//     let refX_CHoCH_Bullish = null;

//     let isIdmTaken = false;

//     for (let i = 1; i < candles.length; i++) {
//         const curr = candles[i];

//         if (curr.low < absoluteLowest.price) absoluteLowest = { price: curr.low, time: curr.timestamp };
//         if (curr.high > absoluteHighest.price) absoluteHighest = { price: curr.high, time: curr.timestamp };

//         let isInsideBar = curr.high <= refCandle.high && curr.low >= refCandle.low;
//         let isOutsideBar = curr.high > refCandle.high && curr.low < refCandle.low;

//         if (isInsideBar) continue; 

//         let brokeHigh = curr.high > refCandle.high;
//         let brokeLow = curr.low < refCandle.low;

//        // ==========================================
//         // 📉 BEARISH STRUCTURE LOGIC (-1)
//         // ==========================================
//         if (trend === -1) {
            
//             if (isIdmTaken) {
//                 if (curr.high > majorIdm_Bearish.price) majorIdm_Bearish = { price: curr.high, time: curr.timestamp };
//             }

//             // RULE 5 & 6c: CHoCH & Sweep Logic
//             if (lockedSwingHigh !== null) {
//                 // इंजन चेक करने के लिए sweep level (breakLevel) यूज़ करेगा
//                 let breakLevel = refX_CHoCH_Bearish ? refX_CHoCH_Bearish.price : lockedSwingHigh.price;

//                 if (curr.high > breakLevel) {
//                     if (curr.close > breakLevel) { // 🚀 Full Body Break (Valid CHoCH)
                        
//                         // 🔥 VISUAL FIX: लाइन हमेशा ओरिजिनल 'lockedSwingHigh' से ही ड्रा होगी!
//                         signals.push({ 
//                             type: "CHoCH", trend: "BULLISH", 
//                             sweptSide: "HIGH",
//                             price: lockedSwingHigh.price,      // <-- Original Price
//                             startTime: lockedSwingHigh.time,   // <-- Original Time
//                             endTime: curr.timestamp 
//                         });
                        
//                         trend = 1; 
//                         isIdmTaken = false;
//                         lockedSwingLow = { ...absoluteLowest }; 
//                         validLL = null; refLL = null; tempSwingHigh = null; lockedSwingHigh = null; confirmedLH = null;
//                         refX_CHoCH_Bearish = null; refX_BOS_Bearish = null;
//                         absoluteHighest = { price: curr.high, time: curr.timestamp };
//                         refCandle = curr;
//                         continue; 
//                     } else { // 🧹 Sweep (Ref X)
//                         refX_CHoCH_Bearish = { price: curr.high, time: curr.timestamp };
//                     }
//                 }
//             }

//             // ... (PULLBACK और IDM का लॉजिक वही रहेगा) ...
//             if (brokeHigh && !isOutsideBar && refLL === null && !isIdmTaken) {
//                 refLL = { price: refCandle.low, time: refCandle.timestamp };
//                 tempLH = { price: curr.high, time: curr.timestamp };
//             } else if (refLL !== null && !isIdmTaken) {
//                 if (curr.high > tempLH.price) tempLH = { price: curr.high, time: curr.timestamp };
//                 if (curr.low <= refLL.price) { confirmedLH = tempLH; refLL = null; }
//             }

//             if (confirmedLH !== null && curr.high >= confirmedLH.price && !isIdmTaken) {
//                 isIdmTaken = true;
//                 validLL = { ...absoluteLowest }; 
//                 tempSwingHigh = { price: curr.high, time: curr.timestamp }; 
//                 majorIdm_Bearish = { price: curr.high, time: curr.timestamp }; 
//                 signals.push({ type: "IDM", trend: "BEARISH", price: confirmedLH.price, startTime: confirmedLH.time, endTime: curr.timestamp });
//                 confirmedLH = null; 
//             }

//             if (isIdmTaken && curr.high > tempSwingHigh.price) {
//                 tempSwingHigh = { price: curr.high, time: curr.timestamp };
//             }

//             // RULE 3 & 6a: BOS & Sweep Logic
//             if (isIdmTaken && validLL !== null) { 
//                 let breakLevel = refX_BOS_Bearish ? refX_BOS_Bearish.price : validLL.price;

//                 if (curr.low < breakLevel) {
//                     if (curr.close < breakLevel) { // 🚀 Full Body Break (Valid BOS)
                        
//                         // 🔥 VISUAL FIX: लाइन हमेशा ओरिजिनल 'validLL' से ही ड्रा होगी!
//                         signals.push({ 
//                             type: "BOS", trend: "BEARISH", 
//                             price: validLL.price,        // <-- Original Price
//                             startTime: validLL.time,     // <-- Original Time
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
//                     } else { // 🧹 Sweep (Ref X)
//                         refX_BOS_Bearish = { price: curr.low, time: curr.timestamp, majorIdmTarget: { ...majorIdm_Bearish } };
//                     }
//                 }

//                 if (refX_BOS_Bearish && refX_BOS_Bearish.majorIdmTarget) {
//                     if (curr.high > refX_BOS_Bearish.majorIdmTarget.price) {
//                         signals.push({ type: "IDM", trend: "BEARISH", price: refX_BOS_Bearish.majorIdmTarget.price, startTime: refX_BOS_Bearish.majorIdmTarget.time, endTime: curr.timestamp });
                        
//                         signals.push({ type: "X", trend: "BEARISH", sweptSide: "LOW", price: validLL.price, startTime: validLL.time, endTime: refX_BOS_Bearish.time }); // <-- यहाँ बदलाव है
                        
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
//                         absoluteLowest = { price: curr.low, time: curr.timestamp };
//                         refCandle = curr;
//                         continue; 
//                     } else { // 🧹 Sweep (Ref X)
//                         refX_CHoCH_Bullish = { price: curr.low, time: curr.timestamp };
//                     }
//                 }
//             }

//             // ... (PULLBACK और IDM का लॉजिक वही रहेगा) ...
//             if (brokeLow && !isOutsideBar && refHH === null && !isIdmTaken) {
//                 refHH = { price: refCandle.high, time: refCandle.timestamp };
//                 tempHL = { price: curr.low, time: curr.timestamp };
//             } else if (refHH !== null && !isIdmTaken) {
//                 if (curr.low < tempHL.price) tempHL = { price: curr.low, time: curr.timestamp };
//                 if (curr.high >= refHH.price) { confirmedHL = tempHL; refHH = null; }
//             }

//             if (confirmedHL !== null && curr.low <= confirmedHL.price && !isIdmTaken) {
//                 isIdmTaken = true;
//                 validHH = { ...absoluteHighest }; 
//                 tempSwingLow = { price: curr.low, time: curr.timestamp }; 
//                 majorIdm_Bullish = { price: curr.low, time: curr.timestamp }; 
//                 signals.push({ type: "IDM", trend: "BULLISH", price: confirmedHL.price, startTime: confirmedHL.time, endTime: curr.timestamp });
//                 confirmedHL = null; 
//             }

//             if (isIdmTaken && curr.low < tempSwingLow.price) {
//                 tempSwingLow = { price: curr.low, time: curr.timestamp };
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
//     return signals;
// };

// // 🎯 MAIN SCANNER
// const checkPriceActionSignal = (htfCandles, ltfCandles, setupType) => {
//     let signal = { long: false, short: false, reason: "" };

//     if (!htfCandles || htfCandles.length < 15 || !ltfCandles || ltfCandles.length === 0) {
//         return signal;
//     }

//     const htfSignals = identifyMechanicalStructure(htfCandles);
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





// const identifyMechanicalStructure = (candles) => {
//     let trend = candles.length > 5 ? (candles[5].close > candles[0].close ? 1 : -1) : 0;
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

//     // 🔥 Liquidity Sweep (X) Variables
//     let refX_BOS_Bullish = null; 
//     let majorIdm_Bullish = { price: Infinity, time: null }; 
//     let refX_CHoCH_Bullish = null;

//     let isIdmTaken = false;

//     for (let i = 1; i < candles.length; i++) {
//         const curr = candles[i];

//         if (curr.low < absoluteLowest.price) absoluteLowest = { price: curr.low, time: curr.timestamp };
//         if (curr.high > absoluteHighest.price) absoluteHighest = { price: curr.high, time: curr.timestamp };

//         let isInsideBar = curr.high <= refCandle.high && curr.low >= refCandle.low;
//         let isOutsideBar = curr.high > refCandle.high && curr.low < refCandle.low;

//         if (isInsideBar) continue; 

//         let brokeHigh = curr.high > refCandle.high;
//         let brokeLow = curr.low < refCandle.low;

//        // ==========================================
//         // 📉 BEARISH STRUCTURE LOGIC (-1)
//         // ==========================================
//         if (trend === -1) {
            
//             if (isIdmTaken) {
//                 if (curr.high > majorIdm_Bearish.price) majorIdm_Bearish = { price: curr.high, time: curr.timestamp };
//             }

//             // RULE 5 & 6c: CHoCH & Sweep Logic
//             if (lockedSwingHigh !== null) {
//                 // इंजन चेक करने के लिए sweep level (breakLevel) यूज़ करेगा
//                 let breakLevel = refX_CHoCH_Bearish ? refX_CHoCH_Bearish.price : lockedSwingHigh.price;

//                 if (curr.high > breakLevel) {
//                     if (curr.close > breakLevel) { // 🚀 Full Body Break (Valid CHoCH)
                        
//                         // 🔥 VISUAL FIX: लाइन हमेशा ओरिजिनल 'lockedSwingHigh' से ही ड्रा होगी!
//                         signals.push({ 
//                             type: "CHoCH", trend: "BULLISH", 
//                             sweptSide: "HIGH",
//                             price: lockedSwingHigh.price,      // <-- Original Price
//                             startTime: lockedSwingHigh.time,   // <-- Original Time
//                             endTime: curr.timestamp 
//                         });
                        
//                         trend = 1; 
//                         isIdmTaken = false;
//                         lockedSwingLow = { ...absoluteLowest }; 
//                         validLL = null; refLL = null; tempSwingHigh = null; lockedSwingHigh = null; confirmedLH = null;
//                         refX_CHoCH_Bearish = null; refX_BOS_Bearish = null;
//                         absoluteHighest = { price: curr.high, time: curr.timestamp };
//                         refCandle = curr;
//                         continue; 
//                     } else { // 🧹 Sweep (Ref X)
//                         refX_CHoCH_Bearish = { price: curr.high, time: curr.timestamp };
//                     }
//                 }
//             }

//             // ... (PULLBACK और IDM का लॉजिक वही रहेगा) ...
//             if (brokeHigh && !isOutsideBar && refLL === null && !isIdmTaken) {
//                 refLL = { price: refCandle.low, time: refCandle.timestamp };
//                 tempLH = { price: curr.high, time: curr.timestamp };
//             } else if (refLL !== null && !isIdmTaken) {
//                 if (curr.high > tempLH.price) tempLH = { price: curr.high, time: curr.timestamp };
//                 if (curr.low <= refLL.price) { confirmedLH = tempLH; refLL = null; }
//             }

//             if (confirmedLH !== null && curr.high >= confirmedLH.price && !isIdmTaken) {
//                 isIdmTaken = true;
//                 validLL = { ...absoluteLowest }; 
//                 tempSwingHigh = { price: curr.high, time: curr.timestamp }; 
//                 majorIdm_Bearish = { price: curr.high, time: curr.timestamp }; 
//                 signals.push({ type: "IDM", trend: "BEARISH", price: confirmedLH.price, startTime: confirmedLH.time, endTime: curr.timestamp });
//                 confirmedLH = null; 
//             }

//             if (isIdmTaken && curr.high > tempSwingHigh.price) {
//                 tempSwingHigh = { price: curr.high, time: curr.timestamp };
//             }

//             // RULE 3 & 6a: BOS & Sweep Logic
//             if (isIdmTaken && validLL !== null) { 
//                 let breakLevel = refX_BOS_Bearish ? refX_BOS_Bearish.price : validLL.price;

//                 if (curr.low < breakLevel) {
//                     if (curr.close < breakLevel) { // 🚀 Full Body Break (Valid BOS)
                        
//                         // 🔥 VISUAL FIX: लाइन हमेशा ओरिजिनल 'validLL' से ही ड्रा होगी!
//                         signals.push({ 
//                             type: "BOS", trend: "BEARISH", 
//                             price: validLL.price,        // <-- Original Price
//                             startTime: validLL.time,     // <-- Original Time
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
//                     } else { // 🧹 Sweep (Ref X)
//                         refX_BOS_Bearish = { price: curr.low, time: curr.timestamp, majorIdmTarget: { ...majorIdm_Bearish } };
//                     }
//                 }

//                 if (refX_BOS_Bearish && refX_BOS_Bearish.majorIdmTarget) {
//                     if (curr.high > refX_BOS_Bearish.majorIdmTarget.price) {
//                         signals.push({ type: "IDM", trend: "BEARISH", price: refX_BOS_Bearish.majorIdmTarget.price, startTime: refX_BOS_Bearish.majorIdmTarget.time, endTime: curr.timestamp });
                        
//                         signals.push({ type: "X", trend: "BEARISH", sweptSide: "LOW", price: validLL.price, startTime: validLL.time, endTime: refX_BOS_Bearish.time }); // <-- यहाँ बदलाव है
                        
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
//                         absoluteLowest = { price: curr.low, time: curr.timestamp };
//                         refCandle = curr;
//                         continue; 
//                     } else { // 🧹 Sweep (Ref X)
//                         refX_CHoCH_Bullish = { price: curr.low, time: curr.timestamp };
//                     }
//                 }
//             }

//             // ... (PULLBACK और IDM का लॉजिक वही रहेगा) ...
//             if (brokeLow && !isOutsideBar && refHH === null && !isIdmTaken) {
//                 refHH = { price: refCandle.high, time: refCandle.timestamp };
//                 tempHL = { price: curr.low, time: curr.timestamp };
//             } else if (refHH !== null && !isIdmTaken) {
//                 if (curr.low < tempHL.price) tempHL = { price: curr.low, time: curr.timestamp };
//                 if (curr.high >= refHH.price) { confirmedHL = tempHL; refHH = null; }
//             }

//             if (confirmedHL !== null && curr.low <= confirmedHL.price && !isIdmTaken) {
//                 isIdmTaken = true;
//                 validHH = { ...absoluteHighest }; 
//                 tempSwingLow = { price: curr.low, time: curr.timestamp }; 
//                 majorIdm_Bullish = { price: curr.low, time: curr.timestamp }; 
//                 signals.push({ type: "IDM", trend: "BULLISH", price: confirmedHL.price, startTime: confirmedHL.time, endTime: curr.timestamp });
//                 confirmedHL = null; 
//             }

//             if (isIdmTaken && curr.low < tempSwingLow.price) {
//                 tempSwingLow = { price: curr.low, time: curr.timestamp };
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



// // 🎯 MAIN SCANNER
// const checkPriceActionSignal = (htfCandles, ltfCandles, setupType) => {
//     let signal = { long: false, short: false, reason: "" };

//     if (!htfCandles || htfCandles.length < 15 || !ltfCandles || ltfCandles.length === 0) {
//         return signal;
//     }

//     const htfSignals = identifyMechanicalStructure(htfCandles);
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

    // 🔥 Liquidity Sweep (X) Variables
    let refX_BOS_Bullish = null; 
    let majorIdm_Bullish = { price: Infinity, time: null }; 
    let refX_CHoCH_Bullish = null;

    let isIdmTaken = false;

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
                        absoluteLowest = { price: curr.low, time: curr.timestamp };
                        refCandle = curr;
                        continue; 
                    } else { // 🧹 Sweep (Ref X)
                        refX_CHoCH_Bullish = { price: curr.low, time: curr.timestamp };
                    }
                }
            }

            // ... (PULLBACK और IDM का लॉजिक वही रहेगा) ...
            if (brokeLow && !isOutsideBar && refHH === null && !isIdmTaken) {
                refHH = { price: refCandle.high, time: refCandle.timestamp };
                tempHL = { price: curr.low, time: curr.timestamp };
            } else if (refHH !== null && !isIdmTaken) {
                if (curr.low < tempHL.price) tempHL = { price: curr.low, time: curr.timestamp };
                if (curr.high >= refHH.price) { confirmedHL = tempHL; refHH = null; }
            }

            if (confirmedHL !== null && curr.low <= confirmedHL.price && !isIdmTaken) {
                isIdmTaken = true;
                validHH = { ...absoluteHighest }; 
                tempSwingLow = { price: curr.low, time: curr.timestamp }; 
                majorIdm_Bullish = { price: curr.low, time: curr.timestamp }; 
                signals.push({ type: "IDM", trend: "BULLISH", price: confirmedHL.price, startTime: confirmedHL.time, endTime: curr.timestamp });
                confirmedHL = null; 
            }

            if (isIdmTaken && curr.low < tempSwingLow.price) {
                tempSwingLow = { price: curr.low, time: curr.timestamp };
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