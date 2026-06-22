// // =========================================================================
// // 🎯 SMC ENTRY ENGINE (The Ultimate Sniper)
// // 🧠 Logic Designed by: Chanchal Bhai
// // =========================================================================

// class SMCEntryEngine {
//     constructor(userSettings) {
//         // 1. Dynamic Risk Management (The Master Rule)
//         this.maxSlLimit = userSettings.maxSlPoints || 20; 
        
//         // 2. User Selected Triggers Array (e.g., ['DIRECT ENTRY', 'POI ENTRY', ...])
//         this.entryTriggers = userSettings.entryTriggers || [];
        
//         // 3. Timeframe Variables
//         this.htf = userSettings.htf; 
//         this.ltf = userSettings.ltf;

//         // 4. State Machine Tracker
//         this.activeState = 'WAITING_FOR_TAP'; 
//         this.currentSetupParams = null; // ज़ोन का डेटा स्टोर करने के लिए

//         // 🛡️ Timeframe Validation Guard (LTF <= HTF)
//         this.validateTimeframes();
//     }

//     // ==========================================
//     // 🛡️ SECURITY & VALIDATION
//     // ==========================================
//     validateTimeframes() {
//         const tfMap = { '1 min': 1, '3 min': 3, '5 min': 5, '15 min': 15 };
//         let htfMins = tfMap[this.htf];
//         let ltfMins = tfMap[this.ltf];

//         if (ltfMins > htfMins) {
//             throw new Error("❌ ERROR: LTF (Entry Trigger) HTF (Master Trend) से बड़ा नहीं हो सकता!");
//         }
//     }

//     // ==========================================
//     // 🟢 MAIN ENGINE: PROCESS LIVE DATA
//     // ==========================================
//     processLiveMarket(currentPrice, currentCandle, activeZone, trend) {
        
//         // Step 1: इंतज़ार करो कि प्राइस ज़ोन (D-OB, E-OF, IDM-Sweep) में घुसे
//         if (this.activeState === 'WAITING_FOR_TAP') {
//             if (this.isPriceInZone(currentPrice, activeZone)) {
//                 console.log(`🎯 Target Locked in ${activeZone.type}. Checking Priorities...`);
//                 this.activeState = 'EVALUATE_PRIORITIES';
//                 this.currentSetupParams = activeZone;
//             } else {
//                 return null; // ज़ोन के बाहर है, चुपचाप बैठे रहो
//             }
//         }

//         // Step 2: The Waterfall Priority Execution
//         if (this.activeState === 'EVALUATE_PRIORITIES') {
//             return this.executeWaterfallPriority(currentPrice, currentCandle, trend);
//         }

//         // Step 3: Pending States (Waiting for Candle Closes, SCOB, etc.)
//         return this.processPendingStates(currentCandle, trend);
//     }

//     // ==========================================
//     // 🌊 THE WATERFALL PRIORITY LOGIC
//     // ==========================================
//     executeWaterfallPriority(price, candle, trend) {
//         let zone = this.currentSetupParams;
//         let slSize = Math.abs(zone.top - zone.bottom);

//         // 🎯 Priority 1: DIRECT ENTRY
//         if (this.entryTriggers.includes('DIRECT ENTRY')) {
//             if (slSize <= this.maxSlLimit) {
//                 return this.fireTrade('DIRECT_ENTRY', price, zone);
//             }
//             // अगर SL 20 से ज़्यादा है, तो यह चुपचाप Priority 2 पर खिसक जाएगा
//         }

//         // 🎯 Priority 2 & 3: POI / POI 50% ENTRY (Sweep Wick Logic)
//         if (this.entryTriggers.includes('POI ENTRY') || this.entryTriggers.includes('POI 50% ENTRY')) {
//             let wickData = this.measureWick(candle, trend);
//             if (wickData.size <= this.maxSlLimit && this.entryTriggers.includes('POI ENTRY')) {
//                 return this.fireTrade('POI_ENTRY', wickData.extremePrice, zone);
//             } 
//             if (wickData.size > this.maxSlLimit && this.entryTriggers.includes('POI 50% ENTRY')) {
//                 let poi50Level = (wickData.top + wickData.bottom) / 2;
//                 return this.setLimitOrder('POI_50_ENTRY', poi50Level, zone);
//             }
//         }

//         // 🎯 Priority 4, 5, 6: SCOB SERIES (SCOB, SCOB 50%, SCOB/POI)
//         if (this.entryTriggers.some(t => t.includes('SCOB'))) {
//             this.activeState = 'WAITING_FOR_SCOB_CONFIRMATION';
//             return { status: 'WAITING', message: 'Tracking SCOB and Running Candle...' };
//         }

//         // 🎯 Priority 7: CHOCH BASE ENTRY
//         if (this.entryTriggers.includes('CHOCH BASE ENTRY')) {
//             if (zone.type === 'E-OF' || zone.type === 'E-OB') {
//                 this.activeState = 'WAITING_FOR_AGGRESSIVE_CHOCH'; // Without IDM (Liquidity already swept)
//             } else {
//                 this.activeState = 'WAITING_FOR_NORMAL_CHOCH'; // With IDM
//             }
//             return { status: 'WAITING', message: 'Scanning LTF for CHoCH...' };
//         }

//         return null;
//     }

//     // ==========================================
//     // ⏳ STATE PROCESSORS (Micro-Structure Tracking)
//     // ==========================================
//     processPendingStates(candle, trend) {
        
//         // SCOB Logic Processor (Sweep -> Break -> Mitigate -> Running Candle)
//         if (this.activeState === 'WAITING_FOR_SCOB_CONFIRMATION') {
//             // (यहाँ हम पिछली 3 कैंडल्स का Array चेक करेंगे)
//             let scobSignal = this.checkForRunningCandleClose(candle, trend);
//             if (scobSignal) {
//                 // SL नापो और 50% या डायरेक्ट ट्रेड मारो
//                 return this.fireTrade('SCOB_SERIES_ENTRY', scobSignal.price, this.currentSetupParams);
//             }
//         }

//         // CHoCH Normal (Wait for IDM)
//         if (this.activeState === 'WAITING_FOR_NORMAL_CHOCH') {
//             let chochData = this.scanLtfForChochWithIdm(candle, trend);
//             if (chochData && chochData.sl <= this.maxSlLimit) return this.fireTrade('CHOCH_OB_ENTRY', chochData.price, this.currentSetupParams);
//             if (chochData && chochData.sl > this.maxSlLimit) return this.fireTrade('CHOCH_POI_ENTRY', chochData.poiPrice, this.currentSetupParams);
//         }

//         // CHoCH Aggressive (E-OF: Skip IDM, Check Rejection Wick outside OF)
//         if (this.activeState === 'WAITING_FOR_AGGRESSIVE_CHOCH') {
//             let aggChochData = this.scanLtfAggressiveChoch(candle, trend);
//             if (aggChochData) {
//                 // Check if candle body closed outside the OF but wick touched it
//                 if (this.isRejectionCandle(candle, aggChochData.ofZone)) {
//                     let wickData = this.measureWick(candle, trend);
//                     if (wickData.size <= this.maxSlLimit) return this.fireTrade('AGGRESSIVE_POI_ENTRY', wickData.extremePrice, this.currentSetupParams);
//                     else return this.setLimitOrder('AGGRESSIVE_POI_50_ENTRY', wickData.midPrice, this.currentSetupParams);
//                 }
//             }
//         }

//         return null;
//     }

//     // ==========================================
//     // 🛠️ HELPER FUNCTIONS (MATH & LOGIC)
//     // ==========================================
//     isPriceInZone(price, zone) {
//         return price <= zone.top && price >= zone.bottom;
//     }

//     measureWick(candle, trend) {
//         if (trend === 'BULLISH') return { top: Math.min(candle.open, candle.close), bottom: candle.low, extremePrice: candle.low, size: Math.min(candle.open, candle.close) - candle.low };
//         if (trend === 'BEARISH') return { top: candle.high, bottom: Math.max(candle.open, candle.close), extremePrice: candle.high, size: candle.high - Math.max(candle.open, candle.close) };
//     }

//     isRejectionCandle(candle, ofZone) {
//         // कैंडल की बॉडी OF ज़ोन के बाहर क्लोज़ होनी चाहिए
//         let bodyTop = Math.max(candle.open, candle.close);
//         let bodyBottom = Math.min(candle.open, candle.close);
//         return (bodyBottom > ofZone.top || bodyTop < ofZone.bottom); 
//     }

//     // 🚀 EXECUTION TRIGGERS
//     fireTrade(type, entryPrice, zone) {
//         this.activeState = 'TRADE_EXECUTED';
//         return { action: 'BUY/SELL', type: type, entryPrice: entryPrice, slSize: this.maxSlLimit, timestamp: new Date() };
//     }

//     setLimitOrder(type, limitPrice, zone) {
//         this.activeState = 'LIMIT_ORDER_PLACED';
//         return { action: 'LIMIT_ORDER', type: type, limitPrice: limitPrice, timestamp: new Date() };
//     }

//     // (Mock Functions for internal logic connections)
//     checkForRunningCandleClose(candle, trend) { return null; }
//     scanLtfForChochWithIdm(candle, trend) { return null; }
//     scanLtfAggressiveChoch(candle, trend) { return null; }
// }

// module.exports = SMCEntryEngine;



// =========================================================================
// 🎯 SMC ENTRY ENGINE (The Ultimate Sniper)
// 🧠 Core Logic & Architecture by: Chanchal Kumar Sahu
// =========================================================================

// const { identifyMechanicalStructure } = require('../scanners/priceActionScanner');

// class SMCEntryEngine {
//     constructor(userSettings) {
//         // 1. Dynamic Risk Management (The Master Rule: e.g., 20 pts)
//         this.maxSlLimit = Number(userSettings.maxSlPoints) || 20; 
        
//         // 2. User Selected Triggers Array 
//         // e.g., ['DIRECT ENTRY', 'POI ENTRY', 'POI 50% ENTRY', 'SCOB ENTRY', 'CHOCH BASE ENTRY']
//         this.entryTriggers = userSettings.entryTriggers || [];
        
//         // 3. Timeframe Alignment
//         this.htf = userSettings.htf || '5 min'; 
//         this.ltf = userSettings.ltf || '1 min';

//         // 4. State Machine Trackers (Engine's Memory)
//         this.activeState = 'WAITING_FOR_TAP'; 
//         this.currentSetupParams = null; // Store active zone details
//         this.scobMemory = { sweepCandle: null, confirmationCandle: null }; 

//         // 🛡️ Timeframe Validation Guard (LTF <= HTF)
//         this.validateTimeframes();
//     }

//     // ==========================================
//     // 🛡️ SECURITY & VALIDATION
//     // ==========================================
//     validateTimeframes() {
//         const tfMap = { '1 min': 1, '3 min': 3, '5 min': 5, '15 min': 15, '1 Hour': 60 };
//         let htfMins = tfMap[this.htf] || 5;
//         let ltfMins = tfMap[this.ltf] || 1;

//         if (ltfMins > htfMins) {
//             console.error("❌ ERROR: LTF (Entry Trigger) cannot be greater than HTF (Master Trend)!");
//             throw new Error("Invalid Timeframe Alignment");
//         }
//     }

//     // ==========================================
//     // 🟢 MAIN ENGINE: PROCESS LIVE TICK DATA
//     // ==========================================
//     processLiveMarket(currentPrice, currentCandle, activeZone, trend) {
        
//         // Step 1: इंतज़ार करो कि प्राइस ज़ोन (D-OB, E-OF, IDM-Sweep) में घुसे
//         if (this.activeState === 'WAITING_FOR_TAP') {
//             if (this.isPriceInZone(currentPrice, activeZone)) {
//                 this.activeState = 'EVALUATE_PRIORITIES';
//                 this.currentSetupParams = activeZone;
//                 // Sweep candle को याद रखो (POI/SCOB के लिए)
//                 this.scobMemory.sweepCandle = currentCandle; 
//             } else {
//                 return null; // ज़ोन के बाहर है, कुछ मत करो
//             }
//         }

//         // Step 2: The Waterfall Priority Execution
//         if (this.activeState === 'EVALUATE_PRIORITIES') {
//             return this.executeWaterfallPriority(currentPrice, currentCandle, trend);
//         }

//         // Step 3: Pending States (Waiting for Candle Closes, SCOB, CHoCH)
//         return this.processPendingStates(currentPrice, currentCandle, trend);
//     }

//     // ==========================================
//     // 🌊 THE WATERFALL PRIORITY LOGIC (Chain of Command)
//     // ==========================================
//     executeWaterfallPriority(price, candle, trend) {
//         let zone = this.currentSetupParams;
//         let slSize = Math.abs(zone.top - zone.bottom);

//         // 🎯 Priority 1: DIRECT ENTRY
//         if (this.entryTriggers.includes('DIRECT ENTRY')) {
//             if (slSize <= this.maxSlLimit) {
//                 return this.fireTrade('DIRECT_ENTRY', price, trend);
//             }
//         }

//         // 🎯 Priority 2 & 3: POI / POI 50% ENTRY (Sweep Wick Logic)
//         if (this.entryTriggers.includes('POI ENTRY') || this.entryTriggers.includes('POI 50% ENTRY')) {
//             let wickData = this.measureWick(this.scobMemory.sweepCandle, trend);
            
//             if (wickData.size <= this.maxSlLimit && this.entryTriggers.includes('POI ENTRY')) {
//                 return this.fireTrade('POI_ENTRY', wickData.extremePrice, trend);
//             } 
//             if (wickData.size > this.maxSlLimit && this.entryTriggers.includes('POI 50% ENTRY')) {
//                 let poi50Level = (wickData.top + wickData.bottom) / 2;
//                 // अगर प्राइस 50% पर आ गया है तो फायर करो
//                 if ((trend === 'BULLISH' && price <= poi50Level) || (trend === 'BEARISH' && price >= poi50Level)) {
//                     return this.fireTrade('POI_50_ENTRY', poi50Level, trend);
//                 }
//                 return null; // 50% लेवल का इंतज़ार
//             }
//         }

//         // 🎯 Priority 4, 5, 6: SCOB SERIES
//         if (this.entryTriggers.some(t => t.includes('SCOB'))) {
//             this.activeState = 'WAITING_FOR_SCOB_CONFIRMATION';
//             return null;
//         }

//         // 🎯 Priority 7: CHOCH BASE ENTRY
//         if (this.entryTriggers.includes('CHOCH BASE ENTRY')) {
//             if (zone.type === 'E-OF' || zone.type === 'E-OB') {
//                 this.activeState = 'WAITING_FOR_AGGRESSIVE_CHOCH'; // No IDM wait
//             } else {
//                 this.activeState = 'WAITING_FOR_NORMAL_CHOCH'; // Normal IDM mapping
//             }
//             return null;
//         }

//         return null;
//     }

//     // ==========================================
//     // ⏳ STATE PROCESSORS (Micro-Structure Tracking)
//     // ==========================================
//     processPendingStates(price, candle, trend) {
        
//         // --- SCOB & Running Candle Logic ---
//         if (this.activeState === 'WAITING_FOR_SCOB_CONFIRMATION') {
//             let scobData = this.trackScobAndRunningCandle(candle, trend);
            
//             if (scobData && scobData.isTriggered) {
//                 if (scobData.sl <= this.maxSlLimit && this.entryTriggers.includes('SCOB ENTRY')) {
//                     return this.fireTrade('SCOB_ENTRY', scobData.entryPrice, trend);
//                 }
//                 if (scobData.sl > this.maxSlLimit && this.entryTriggers.includes('SCOB 50% ENTRY')) {
//                     return this.fireTrade('SCOB_50_ENTRY', scobData.poi50Price, trend);
//                 }
//                 if (this.entryTriggers.includes('SCOB/POI ENTRY')) {
//                     return this.fireTrade('SCOB_POI_ENTRY', scobData.poiExtremePrice, trend);
//                 }
//             }
//         }

//         // --- CHoCH Normal (Wait for IDM -> Check OB) ---
//         if (this.activeState === 'WAITING_FOR_NORMAL_CHOCH') {
//             let chochData = this.scanLtfForChochWithIdm(candle, trend); // Aapka priceActionScanner yahan call hoga
            
//             if (chochData && chochData.isTriggered) {
//                 if (chochData.hasOb && chochData.sl <= this.maxSlLimit) {
//                     return this.fireTrade('CHOCH_OB_ENTRY', chochData.obPrice, trend);
//                 } else {
//                     // Agar OB nahi hai, ya SL bada hai, toh POI (Wick) par lo
//                     return this.fireTrade('CHOCH_POI_ENTRY', chochData.poiPrice, trend);
//                 }
//             }
//         }

//         // --- CHoCH Aggressive (E-OF / E-OB Liquidity Sweep) ---
//         if (this.activeState === 'WAITING_FOR_AGGRESSIVE_CHOCH') {
//             let aggData = this.scanLtfAggressiveChoch(candle, trend);
            
//             if (aggData && aggData.isTriggered) {
//                 if (this.isRejectionCandle(candle, aggData.ofZone)) {
//                     let wickData = this.measureWick(candle, trend);
                    
//                     if (wickData.size <= this.maxSlLimit) {
//                         return this.fireTrade('AGGRESSIVE_POI_ENTRY', wickData.extremePrice, trend);
//                     } else {
//                         return this.fireTrade('AGGRESSIVE_POI_50_ENTRY', wickData.midPrice, trend);
//                     }
//                 }
//             }
//         }

//         return null;
//     }

//     // ==========================================
//     // 🛠️ HELPER FUNCTIONS (MATH & LOGIC)
//     // ==========================================
//     isPriceInZone(price, zone) {
//         if (!zone || !zone.top || !zone.bottom) return false;
//         return price <= zone.top && price >= zone.bottom;
//     }

//     measureWick(candle, trend) {
//         if (!candle) return { top: 0, bottom: 0, extremePrice: 0, size: 0, midPrice: 0 };
        
//         let wickTop, wickBottom, extreme, size;
        
//         if (trend === 'BULLISH' || trend === 'LONG') {
//             wickTop = Math.min(candle.open, candle.close);
//             wickBottom = candle.low;
//             extreme = candle.low;
//             size = wickTop - wickBottom;
//         } else {
//             // BEARISH / SHORT
//             wickTop = candle.high;
//             wickBottom = Math.max(candle.open, candle.close);
//             extreme = candle.high;
//             size = wickTop - wickBottom;
//         }
        
//         return {
//             top: wickTop,
//             bottom: wickBottom,
//             extremePrice: extreme,
//             midPrice: (wickTop + wickBottom) / 2,
//             size: size
//         };
//     }

//     isRejectionCandle(candle, ofZone) {
//         if (!candle || !ofZone) return false;
//         let bodyTop = Math.max(candle.open, candle.close);
//         let bodyBottom = Math.min(candle.open, candle.close);
        
//         // कैंडल की बॉडी ज़ोन के बाहर होनी चाहिए (Sweep/Rejection validation)
//         return (bodyBottom > ofZone.top || bodyTop < ofZone.bottom); 
//     }

//     // ==========================================
//     // 🚀 EXECUTION TRIGGERS
//     // ==========================================
//     fireTrade(type, entryPrice, trend) {
//         this.activeState = 'TRADE_EXECUTED'; // Lock engine
//         let action = (trend === 'BULLISH' || trend === 'LONG') ? 'BUY' : 'SELL';
        
//         return { 
//             action: action, 
//             type: type, 
//             entryPrice: entryPrice, 
//             trendType: trend,
//             timestamp: new Date() 
//         };
//     }

//     // ==========================================
//     // 🔌 PLUG-IN METHODS (Integrate with your Scanners here)
//     // ==========================================
    
//     trackScobAndRunningCandle(currentCandle, trend) {
//         if (!this.scobMemory.sweepCandle) return null;
        
//         let sweepC = this.scobMemory.sweepCandle;
//         let sweepTop = Math.max(sweepC.open, sweepC.close);
//         let sweepBottom = Math.min(sweepC.open, sweepC.close);

//         // Step 1: Check for SCOB Confirmation (Full Body Break)
//         if (!this.scobMemory.confirmationCandle) {
//             let isConfirmed = false;
//             if (trend === "BULLISH" && currentCandle.close > sweepC.high) isConfirmed = true;
//             if (trend === "BEARISH" && currentCandle.close < sweepC.low) isConfirmed = true;
            
//             if (isConfirmed) {
//                 this.scobMemory.confirmationCandle = currentCandle; // SCOB बन गया!
//             }
//             return null; // अभी सिर्फ कन्फर्म हुआ है, मिटिगेशन का इंतज़ार है
//         }

//         // Step 2: Check for Mitigation / Running Candle
//         if (this.scobMemory.confirmationCandle) {
//             let isMitigated = false;
//             let poiExtreme = (trend === "BULLISH") ? sweepC.low : sweepC.high;
//             let poi50Price = (trend === "BULLISH") ? (sweepTop + sweepC.low)/2 : (sweepBottom + sweepC.high)/2;
            
//             // अगर प्राइस वापस Sweep कैंडल की Wick (POI) में आया
//             if (trend === "BULLISH" && currentCandle.low <= sweepTop) isMitigated = true;
//             if (trend === "BEARISH" && currentCandle.high >= sweepBottom) isMitigated = true;

//             if (isMitigated) {
//                 // 🚀 TRIPLE TRIGGER RETURN
//                 return {
//                     isTriggered: true,
//                     sl: Math.abs(sweepTop - sweepC.low), // Wick Size
//                     entryPrice: currentCandle.close, // Running Candle Close Price
//                     poi50Price: poi50Price,
//                     poiExtremePrice: poiExtreme
//                 };
//             }
//         }
//         return null;
//     }

//     scanLtfForChochWithIdm(ltfCandles, trend) {
//         // 1. LTF कैंडल्स को आपके असली स्कैनर में डालें
//         const ltfSignals = identifyMechanicalStructure(
//             ltfCandles, 
//             trend, // "BULLISH" या "BEARISH"
//             0, "DISCOUNTED", false, true, false, true, true, true, true
//         );

//         if (!ltfSignals || ltfSignals.length === 0) return null;

//         // 2. अब चेक करें कि क्या LTF पर कोई ताज़ा CHoCH हुआ है?
//         let recentChoch = ltfSignals.slice().reverse().find(sig => sig.type === "CHoCH");
//         let recentIdm = ltfSignals.slice().reverse().find(sig => sig.type === "IDM" || sig.type === "IDM(Dis)");
//         let activeOb = ltfSignals.slice().reverse().find(sig => ["D-OB", "E-OB"].includes(sig.type) && sig.isActive);

//         // 3. CHoCH Base Entry Logic (Priority 7)
//         if (recentChoch && recentIdm && recentIdm.startTime > recentChoch.startTime) {
            
//             // अगर OB है, तो OB वाला डेटा रिटर्न करें
//             if (activeOb) {
//                 let slSize = Math.abs(activeOb.priceTop - activeOb.priceBottom);
//                 let entryPrice = (trend === "BULLISH") ? activeOb.priceTop : activeOb.priceBottom;
                
//                 return {
//                     isTriggered: true,
//                     hasOb: true,
//                     sl: slSize,
//                     obPrice: entryPrice,
//                     poiPrice: recentChoch.price // Wick Extreme if SL is too big
//                 };
//             } 
//             // अगर OB नहीं है, तो सीधे POI/IDM Sweep वाला डेटा रिटर्न करें
//             else {
//                 return {
//                     isTriggered: true,
//                     hasOb: false,
//                     sl: 0, 
//                     obPrice: 0,
//                     poiPrice: recentChoch.price // Extreme Wick Point
//                 };
//             }
//         }

//         return null; // अभी CHoCH या IDM नहीं मिला, इंतज़ार करो
//     }

//     scanLtfAggressiveChoch(ltfCandles, trend) {
//         // E-OF में हम IDM का इंतज़ार नहीं करते, सिर्फ CHoCH देखते हैं
//         const { identifyMechanicalStructure } = require('./scanners/priceActionScanner'); // Make sure path is correct
        
//         const ltfSignals = identifyMechanicalStructure(
//             ltfCandles, trend, 0, "DISCOUNTED", false, true, false, true, true, true, true
//         );

//         if (!ltfSignals || ltfSignals.length === 0) return null;

//         let recentChoch = ltfSignals.slice().reverse().find(sig => sig.type === "CHoCH");
        
//         if (recentChoch) {
//             // CHoCH करवाने वाला Order Flow (OF) निकालो (पिछली 3 कैंडल्स का हाई/लो)
//             let chochIdx = ltfCandles.findIndex(c => c.timestamp === recentChoch.endTime);
//             if (chochIdx > 2) {
//                 let ofTop = Math.max(ltfCandles[chochIdx-1].high, ltfCandles[chochIdx-2].high);
//                 let ofBottom = Math.min(ltfCandles[chochIdx-1].low, ltfCandles[chochIdx-2].low);
                
//                 return {
//                     isTriggered: true,
//                     ofZone: { top: ofTop, bottom: ofBottom }
//                 };
//             }
//         }
//         return null;
//     }
// }

// module.exports = SMCEntryEngine;







// const { identifyMechanicalStructure } = require('../scanners/priceActionScanner');

// class SMCEntryEngine {
//     constructor(userSettings) {
//         // 1. Dynamic Risk Management (The Master Rule: e.g., 20 pts)
//         this.maxSlLimit = Number(userSettings.maxSlPoints) || 20; 
        
//         // 2. User Selected Triggers Array 
//         this.entryTriggers = userSettings.entryTriggers || [];
        
//         // 3. Timeframe Alignment
//         this.htf = userSettings.htf || '5 min'; 
//         this.ltf = userSettings.ltf || '1 min';

//         // 4. State Machine Trackers (Engine's Memory)
//         this.activeState = 'WAITING_FOR_TAP'; 
//         this.currentSetupParams = null; // Store active zone details
//         this.scobMemory = { sweepCandle: null, confirmationCandle: null }; 

//         // 🛡️ Timeframe Validation Guard (LTF <= HTF)
//         this.validateTimeframes();
//     }

//     // ==========================================
//     // 🛡️ SECURITY & VALIDATION
//     // ==========================================
//     validateTimeframes() {
//         const tfMap = { '1 min': 1, '3 min': 3, '5 min': 5, '15 min': 15, '1 Hour': 60 };
//         let htfMins = tfMap[this.htf] || 5;
//         let ltfMins = tfMap[this.ltf] || 1;

//         if (ltfMins > htfMins) {
//             console.error("❌ ERROR: LTF (Entry Trigger) cannot be greater than HTF (Master Trend)!");
//             throw new Error("Invalid Timeframe Alignment");
//         }
//     }

//     // ==========================================
//     // 🟢 MAIN ENGINE: PROCESS LIVE TICK DATA
//     // ==========================================
//     processLiveMarket(currentPrice, currentCandle, activeZone, trend) {
        
//         // Step 1: इंतज़ार करो कि प्राइस ज़ोन (D-OB, E-OF, IDM-Sweep) में घुसे
//         if (this.activeState === 'WAITING_FOR_TAP') {
            
//             // 🔥 THE FIX: Close price का नहीं, कैंडल के High/Low (Wick) का इंतज़ार करो!
//             if (this.isZoneTapped(currentCandle, activeZone, trend)) {
//                 this.activeState = 'EVALUATE_PRIORITIES';
//                 this.currentSetupParams = activeZone;
//                 // Sweep candle को याद रखो (POI/SCOB के लिए)
//                 this.scobMemory.sweepCandle = currentCandle; 
//             } else {
//                 return null; // ज़ोन के बाहर है, कुछ मत करो
//             }
//         }

//         // Step 2: The Waterfall Priority Execution
//         if (this.activeState === 'EVALUATE_PRIORITIES') {
//             return this.executeWaterfallPriority(currentPrice, currentCandle, trend);
//         }

//         // Step 3: Pending States (Waiting for Candle Closes, SCOB, CHoCH)
//         return this.processPendingStates(currentPrice, currentCandle, trend);
//     }

//     // ==========================================
//     // 🌊 THE WATERFALL PRIORITY LOGIC (Chain of Command)
//     // ==========================================
//     executeWaterfallPriority(price, candle, trend) {
//         let zone = this.currentSetupParams;
//         let slSize = Math.abs(zone.top - zone.bottom);

//         // 🎯 Priority 1: DIRECT ENTRY (🔥 INSTANT LIMIT ORDER)
//         if (this.entryTriggers.includes('DIRECT ENTRY')) {
//             if (slSize <= this.maxSlLimit) {
//                 // 🔥 THE FIX: Entry Price बिल्कुल Zone का बॉर्डर होगा (Limit order logic)
//                 let exactEntryPrice = (trend === 'BULLISH' || trend === 'LONG') ? zone.top : zone.bottom;
//                 return this.fireTrade('DIRECT_ENTRY', exactEntryPrice, trend);
//             }
//         }

//         // 🎯 Priority 2 & 3: POI / POI 50% ENTRY (Sweep Wick Logic)
//         if (this.entryTriggers.includes('POI ENTRY') || this.entryTriggers.includes('POI 50% ENTRY')) {
//             let wickData = this.measureWick(this.scobMemory.sweepCandle, trend);
            
//             if (wickData.size <= this.maxSlLimit && this.entryTriggers.includes('POI ENTRY')) {
//                 return this.fireTrade('POI_ENTRY', wickData.extremePrice, trend);
//             } 
//             if (wickData.size > this.maxSlLimit && this.entryTriggers.includes('POI 50% ENTRY')) {
//                 let poi50Level = (wickData.top + wickData.bottom) / 2;
//                 // अगर प्राइस 50% पर आ गया है तो फायर करो
//                 if ((trend === 'BULLISH' && price <= poi50Level) || (trend === 'BEARISH' && price >= poi50Level)) {
//                     return this.fireTrade('POI_50_ENTRY', poi50Level, trend);
//                 }
//                 return null; // 50% लेवल का इंतज़ार
//             }
//         }

//         // 🎯 Priority 4, 5, 6: SCOB SERIES
//         if (this.entryTriggers.some(t => t.includes('SCOB'))) {
//             this.activeState = 'WAITING_FOR_SCOB_CONFIRMATION';
//             return null;
//         }

//         // 🎯 Priority 7: CHOCH BASE ENTRY
//         if (this.entryTriggers.includes('CHOCH BASE ENTRY')) {
//             if (zone.type === 'E-OF' || zone.type === 'E-OB') {
//                 this.activeState = 'WAITING_FOR_AGGRESSIVE_CHOCH'; // No IDM wait
//             } else {
//                 this.activeState = 'WAITING_FOR_NORMAL_CHOCH'; // Normal IDM mapping
//             }
//             return null;
//         }

//         return null;
//     }

//     // ==========================================
//     // ⏳ STATE PROCESSORS (Micro-Structure Tracking)
//     // ==========================================
//     processPendingStates(price, candle, trend) {
        
//         // --- SCOB & Running Candle Logic ---
//         if (this.activeState === 'WAITING_FOR_SCOB_CONFIRMATION') {
//             let scobData = this.trackScobAndRunningCandle(candle, trend);
            
//             if (scobData && scobData.isTriggered) {
//                 if (scobData.sl <= this.maxSlLimit && this.entryTriggers.includes('SCOB ENTRY')) {
//                     return this.fireTrade('SCOB_ENTRY', scobData.entryPrice, trend);
//                 }
//                 if (scobData.sl > this.maxSlLimit && this.entryTriggers.includes('SCOB 50% ENTRY')) {
//                     return this.fireTrade('SCOB_50_ENTRY', scobData.poi50Price, trend);
//                 }
//                 if (this.entryTriggers.includes('SCOB/POI ENTRY')) {
//                     return this.fireTrade('SCOB_POI_ENTRY', scobData.poiExtremePrice, trend);
//                 }
//             }
//         }

//         // --- CHoCH Normal (Wait for IDM -> Check OB) ---
//         if (this.activeState === 'WAITING_FOR_NORMAL_CHOCH') {
//             let chochData = this.scanLtfForChochWithIdm(candle, trend); 
            
//             if (chochData && chochData.isTriggered) {
//                 if (chochData.hasOb && chochData.sl <= this.maxSlLimit) {
//                     return this.fireTrade('CHOCH_OB_ENTRY', chochData.obPrice, trend);
//                 } else {
//                     return this.fireTrade('CHOCH_POI_ENTRY', chochData.poiPrice, trend);
//                 }
//             }
//         }

//         // --- CHoCH Aggressive (E-OF / E-OB Liquidity Sweep) ---
//         if (this.activeState === 'WAITING_FOR_AGGRESSIVE_CHOCH') {
//             let aggData = this.scanLtfAggressiveChoch(candle, trend);
            
//             if (aggData && aggData.isTriggered) {
//                 if (this.isRejectionCandle(candle, aggData.ofZone)) {
//                     let wickData = this.measureWick(candle, trend);
                    
//                     if (wickData.size <= this.maxSlLimit) {
//                         return this.fireTrade('AGGRESSIVE_POI_ENTRY', wickData.extremePrice, trend);
//                     } else {
//                         return this.fireTrade('AGGRESSIVE_POI_50_ENTRY', wickData.midPrice, trend);
//                     }
//                 }
//             }
//         }

//         return null;
//     }

//     // ==========================================
//     // 🛠️ HELPER FUNCTIONS (MATH & LOGIC)
//     // ==========================================
    
//     // 🔥 THE NEW FIX: Check exact Wick tap (Limit Order Fill)
//     isZoneTapped(candle, zone, trend) {
//         if (!zone || !zone.top || !zone.bottom || !candle) return false;
        
//         if (trend === 'BULLISH' || trend === 'LONG') {
//             // Bullish: ज़ोन नीचे होता है, कैंडल का 'Low' ज़ोन के Top को छूना चाहिए
//             return candle.low <= zone.top; 
//         } else {
//             // Bearish: ज़ोन ऊपर होता है, कैंडल का 'High' ज़ोन के Bottom को छूना चाहिए
//             return candle.high >= zone.bottom; 
//         }
//     }

//     measureWick(candle, trend) {
//         if (!candle) return { top: 0, bottom: 0, extremePrice: 0, size: 0, midPrice: 0 };
        
//         let wickTop, wickBottom, extreme, size;
        
//         if (trend === 'BULLISH' || trend === 'LONG') {
//             wickTop = Math.min(candle.open, candle.close);
//             wickBottom = candle.low;
//             extreme = candle.low;
//             size = wickTop - wickBottom;
//         } else {
//             // BEARISH / SHORT
//             wickTop = candle.high;
//             wickBottom = Math.max(candle.open, candle.close);
//             extreme = candle.high;
//             size = wickTop - wickBottom;
//         }
        
//         return {
//             top: wickTop,
//             bottom: wickBottom,
//             extremePrice: extreme,
//             midPrice: (wickTop + wickBottom) / 2,
//             size: size
//         };
//     }

//     isRejectionCandle(candle, ofZone) {
//         if (!candle || !ofZone) return false;
//         let bodyTop = Math.max(candle.open, candle.close);
//         let bodyBottom = Math.min(candle.open, candle.close);
        
//         return (bodyBottom > ofZone.top || bodyTop < ofZone.bottom); 
//     }

//     // ==========================================
//     // 🚀 EXECUTION TRIGGERS
//     // ==========================================
//     fireTrade(type, entryPrice, trend) {
//         this.activeState = 'TRADE_EXECUTED'; // Lock engine
//         let action = (trend === 'BULLISH' || trend === 'LONG') ? 'BUY' : 'SELL';
        
//         return { 
//             action: action, 
//             type: type, 
//             entryPrice: entryPrice, 
//             trendType: trend,
//             timestamp: new Date() 
//         };
//     }

//     // ==========================================
//     // 🔌 PLUG-IN METHODS
//     // ==========================================
    
//     trackScobAndRunningCandle(currentCandle, trend) {
//         if (!this.scobMemory.sweepCandle) return null;
        
//         let sweepC = this.scobMemory.sweepCandle;
//         let sweepTop = Math.max(sweepC.open, sweepC.close);
//         let sweepBottom = Math.min(sweepC.open, sweepC.close);

//         // Step 1: Check for SCOB Confirmation (Full Body Break)
//         if (!this.scobMemory.confirmationCandle) {
//             let isConfirmed = false;
//             if (trend === "BULLISH" && currentCandle.close > sweepC.high) isConfirmed = true;
//             if (trend === "BEARISH" && currentCandle.close < sweepC.low) isConfirmed = true;
            
//             if (isConfirmed) {
//                 this.scobMemory.confirmationCandle = currentCandle; 
//             }
//             return null; 
//         }

//         // Step 2: Check for Mitigation / Running Candle
//         if (this.scobMemory.confirmationCandle) {
//             let isMitigated = false;
//             let poiExtreme = (trend === "BULLISH") ? sweepC.low : sweepC.high;
//             let poi50Price = (trend === "BULLISH") ? (sweepTop + sweepC.low)/2 : (sweepBottom + sweepC.high)/2;
            
//             if (trend === "BULLISH" && currentCandle.low <= sweepTop) isMitigated = true;
//             if (trend === "BEARISH" && currentCandle.high >= sweepBottom) isMitigated = true;

//             if (isMitigated) {
//                 return {
//                     isTriggered: true,
//                     sl: Math.abs(sweepTop - sweepC.low), 
//                     entryPrice: currentCandle.close, 
//                     poi50Price: poi50Price,
//                     poiExtremePrice: poiExtreme
//                 };
//             }
//         }
//         return null;
//     }

//     scanLtfForChochWithIdm(ltfCandles, trend) {
//         const ltfSignals = identifyMechanicalStructure(
//             ltfCandles, trend, 0, "DISCOUNTED", false, true, false, true, true, true, true
//         );

//         if (!ltfSignals || ltfSignals.length === 0) return null;

//         let recentChoch = ltfSignals.slice().reverse().find(sig => sig.type === "CHoCH");
//         let recentIdm = ltfSignals.slice().reverse().find(sig => sig.type === "IDM" || sig.type === "IDM(Dis)");
//         let activeOb = ltfSignals.slice().reverse().find(sig => ["D-OB", "E-OB"].includes(sig.type) && sig.isActive);

//         if (recentChoch && recentIdm && recentIdm.startTime > recentChoch.startTime) {
//             if (activeOb) {
//                 let slSize = Math.abs(activeOb.priceTop - activeOb.priceBottom);
//                 let entryPrice = (trend === "BULLISH") ? activeOb.priceTop : activeOb.priceBottom;
                
//                 return {
//                     isTriggered: true, hasOb: true, sl: slSize, obPrice: entryPrice, poiPrice: recentChoch.price 
//                 };
//             } else {
//                 return {
//                     isTriggered: true, hasOb: false, sl: 0, obPrice: 0, poiPrice: recentChoch.price 
//                 };
//             }
//         }
//         return null;
//     }

//     scanLtfAggressiveChoch(ltfCandles, trend) {
//         const { identifyMechanicalStructure } = require('./priceActionScanner'); 
        
//         const ltfSignals = identifyMechanicalStructure(
//             ltfCandles, trend, 0, "DISCOUNTED", false, true, false, true, true, true, true
//         );

//         if (!ltfSignals || ltfSignals.length === 0) return null;

//         let recentChoch = ltfSignals.slice().reverse().find(sig => sig.type === "CHoCH");
        
//         if (recentChoch) {
//             let chochIdx = ltfCandles.findIndex(c => c.timestamp === recentChoch.endTime);
//             if (chochIdx > 2) {
//                 let ofTop = Math.max(ltfCandles[chochIdx-1].high, ltfCandles[chochIdx-2].high);
//                 let ofBottom = Math.min(ltfCandles[chochIdx-1].low, ltfCandles[chochIdx-2].low);
                
//                 return {
//                     isTriggered: true, ofZone: { top: ofTop, bottom: ofBottom }
//                 };
//             }
//         }
//         return null;
//     }
// }

// module.exports = SMCEntryEngine;




const { identifyMechanicalStructure } = require('./priceActionScanner'); // Path verify kar lena

class SMCEntryEngine {
    constructor(userSettings) {
        // 🔥 The Master Rule: User का SL % हो या Pts, इंजन इसे Spot Points ही मानेगा
        this.maxSlLimit = Number(userSettings.maxSlPoints) || 20; 
        
        this.entryTriggers = userSettings.entryTriggers || [];
        this.htf = userSettings.htf || '5 min'; 
        this.ltf = userSettings.ltf || '1 min';

        this.activeState = 'WAITING_FOR_TAP'; 
        this.currentSetupParams = null; 
        this.scobMemory = { sweepCandle: null, confirmationCandle: null }; 

        this.validateTimeframes();
    }

    validateTimeframes() {
        const tfMap = { '1 min': 1, '3 min': 3, '5 min': 5, '15 min': 15, '1 Hour': 60 };
        let htfMins = tfMap[this.htf] || 5;
        let ltfMins = tfMap[this.ltf] || 1;

        if (ltfMins > htfMins) {
            console.error("❌ ERROR: LTF (Entry) cannot be greater than HTF (Trend)!");
        }
    }

    processLiveMarket(currentPrice, currentCandle, activeZone, trend) {
        if (this.activeState === 'WAITING_FOR_TAP') {
            // 🔥 Close price का नहीं, कैंडल के High/Low (Wick) का इंतज़ार
            if (this.isZoneTapped(currentCandle, activeZone, trend)) {
                this.activeState = 'EVALUATE_PRIORITIES';
                this.currentSetupParams = activeZone;
                this.scobMemory.sweepCandle = currentCandle; 
            } else {
                return null; 
            }
        }

        if (this.activeState === 'EVALUATE_PRIORITIES') {
            return this.executeWaterfallPriority(currentPrice, currentCandle, trend);
        }

        return this.processPendingStates(currentPrice, currentCandle, trend);
    }

    executeWaterfallPriority(price, candle, trend) {
        let zone = this.currentSetupParams;
        let slSize = Math.abs(zone.top - zone.bottom);
        
        // 🔥 Spot SL Price: Bullish के लिए ज़ोन के नीचे, Bearish के लिए ज़ोन के ऊपर
        let zoneSlPrice = (trend === 'BULLISH' || trend === 'LONG') ? zone.bottom : zone.top;

        // 🎯 DIRECT ENTRY
        if (this.entryTriggers.includes('DIRECT ENTRY')) {
            if (slSize <= this.maxSlLimit) {
                let exactEntryPrice = (trend === 'BULLISH' || trend === 'LONG') ? zone.top : zone.bottom;
                return this.fireTrade('DIRECT_ENTRY', exactEntryPrice, trend, zoneSlPrice);
            }
        }

        // 🎯 POI ENTRY (Sweep Wick Logic)
        if (this.entryTriggers.includes('POI ENTRY') || this.entryTriggers.includes('POI 50% ENTRY')) {
            let wickData = this.measureWick(this.scobMemory.sweepCandle, trend);
            // 🔥 Wick का Spot SL Price
            let wickSlPrice = (trend === 'BULLISH' || trend === 'LONG') ? wickData.bottom : wickData.top;
            
            if (wickData.size <= this.maxSlLimit && this.entryTriggers.includes('POI ENTRY')) {
                // 🔥 THE FIX: तुरंत फायर मत करो! POI ड्रॉ करके अगली कैंडल का इंतज़ार करो
                this.activeState = 'WAITING_FOR_POI_MITIGATION';
                let entryLine = (trend === 'BULLISH' || trend === 'LONG') ? wickData.top : wickData.bottom;
                this.scobMemory.poiData = { ...wickData, targetEntry: entryLine, slPrice: wickSlPrice, type: 'POI_ENTRY' };
                return null; 
            } 
            if (wickData.size > this.maxSlLimit && this.entryTriggers.includes('POI 50% ENTRY')) {
                let poi50Level = (wickData.top + wickData.bottom) / 2;
                this.activeState = 'WAITING_FOR_POI_MITIGATION';
                this.scobMemory.poiData = { ...wickData, targetEntry: poi50Level, slPrice: wickSlPrice, type: 'POI_50_ENTRY' };
                return null; 
            }
        }

        if (this.entryTriggers.some(t => t.includes('SCOB'))) {
            this.activeState = 'WAITING_FOR_SCOB_CONFIRMATION';
            return null;
        }

        return null;
    }

    processPendingStates(price, candle, trend) {

        // 👇🔥 THE NEW PHOTOSHOP FIX: POI MITIGATION TRACKER 🔥👇
        if (this.activeState === 'WAITING_FOR_POI_MITIGATION') {
            let poi = this.scobMemory.poiData;
            let isMitigated = false;
            
            // अगर करंट कैंडल का High/Low हमारे POI बॉक्स को टच कर दे
            if ((trend === 'BULLISH' || trend === 'LONG') && candle.low <= poi.targetEntry) isMitigated = true;
            if ((trend === 'BEARISH' || trend === 'SHORT') && candle.high >= poi.targetEntry) isMitigated = true;

            if (isMitigated) {
                return this.fireTrade(poi.type, poi.targetEntry, trend, poi.slPrice);
            }
            return null; // अगर टच नहीं किया, तो इंतज़ार जारी रखो
        }

        // SCOB & Running Candle Logic
        if (this.activeState === 'WAITING_FOR_SCOB_CONFIRMATION') {
            let scobData = this.trackScobAndRunningCandle(candle, trend);
            if (scobData && scobData.isTriggered) {
                if (scobData.sl <= this.maxSlLimit && this.entryTriggers.includes('SCOB ENTRY')) {
                    return this.fireTrade('SCOB_ENTRY', scobData.entryPrice, trend, scobData.slPrice);
                }
                if (scobData.sl > this.maxSlLimit && this.entryTriggers.includes('SCOB 50% ENTRY')) {
                    return this.fireTrade('SCOB_50_ENTRY', scobData.poi50Price, trend, scobData.slPrice);
                }
            }
        }
        return null;
    }

    isZoneTapped(candle, zone, trend) {
        if (!zone || !zone.top || !zone.bottom || !candle) return false;
        if (trend === 'BULLISH' || trend === 'LONG') return candle.low <= zone.top; 
        else return candle.high >= zone.bottom; 
    }

    measureWick(candle, trend) {
        if (!candle) return { top: 0, bottom: 0, extremePrice: 0, size: 0, midPrice: 0 };
        let wickTop, wickBottom, extreme, size;
        if (trend === 'BULLISH' || trend === 'LONG') {
            wickTop = Math.min(candle.open, candle.close);
            wickBottom = candle.low;
            extreme = candle.low;
        } else {
            wickTop = candle.high;
            wickBottom = Math.max(candle.open, candle.close);
            extreme = candle.high;
        }
        return { top: wickTop, bottom: wickBottom, extremePrice: extreme, midPrice: (wickTop + wickBottom) / 2, size: wickTop - wickBottom };
    }

    fireTrade(type, entryPrice, trend, spotSlPrice = 0) {
        this.activeState = 'TRADE_EXECUTED'; 
        let action = (trend === 'BULLISH' || trend === 'LONG') ? 'BUY' : 'SELL';
        return { action, type, entryPrice, spotSlPrice, trendType: trend, timestamp: new Date() };
    }

    trackScobAndRunningCandle(currentCandle, trend) {
        if (!this.scobMemory.sweepCandle) return null;
        let sweepC = this.scobMemory.sweepCandle;
        let sweepTop = Math.max(sweepC.open, sweepC.close);
        let sweepBottom = Math.min(sweepC.open, sweepC.close);

        if (!this.scobMemory.confirmationCandle) {
            let isConfirmed = false;
            if (trend === "BULLISH" && currentCandle.close > sweepC.high) isConfirmed = true;
            if (trend === "BEARISH" && currentCandle.close < sweepC.low) isConfirmed = true;
            if (isConfirmed) this.scobMemory.confirmationCandle = currentCandle; 
            return null; 
        }

        if (this.scobMemory.confirmationCandle) {
            let isMitigated = false;
            let poiExtreme = (trend === "BULLISH") ? sweepC.low : sweepC.high;
            let poi50Price = (trend === "BULLISH") ? (sweepTop + sweepC.low)/2 : (sweepBottom + sweepC.high)/2;
            let slPrice = (trend === "BULLISH") ? sweepC.low : sweepC.high; // 🔥 SCOB Spot SL
            
            if (trend === "BULLISH" && currentCandle.low <= sweepTop) isMitigated = true;
            if (trend === "BEARISH" && currentCandle.high >= sweepBottom) isMitigated = true;

            if (isMitigated) {
                return { isTriggered: true, sl: Math.abs(sweepTop - sweepC.low), entryPrice: currentCandle.close, poi50Price, poiExtremePrice: poiExtreme, slPrice: slPrice };
            }
        }
        return null;
    }
}

module.exports = SMCEntryEngine;



