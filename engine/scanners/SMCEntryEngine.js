const { identifyMechanicalStructure } = require('./priceActionScanner'); // Path verify kar lena

class SMCEntryEngine {
    constructor(userSettings) {
        // 🔥 The Master Rule: User का SL % हो या Pts, इंजन इसे Spot Points ही मानेगा
        this.maxSlLimit = Number(userSettings.maxSlPoints) || 20; 
        
        this.entryTriggers = userSettings.entryTriggers || [];
        this.htf = userSettings.htf || '5 min'; 
        this.ltf = userSettings.ltf || '1 min';

        // State Machine
        this.activeState = 'WAITING_FOR_TAP'; 
        this.currentSetupParams = null; 
        this.scobMemory = { sweepCandle: null, confirmationCandle: null, poiData: null }; 
        
        // 🌟 THE FIX: डेड ज़ोन्स की 'कब्रगाह' (Graveyard for mitigated/failed zones)
        this.deadZones = new Set(); 

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

    // 🌟 THE MASTER RESET (इंजन को अगले ट्रेड के लिए फ्रेश करने के लिए)
    resetEngine() {
        this.activeState = 'WAITING_FOR_TAP'; 
        this.currentSetupParams = null; 
        this.scobMemory = { sweepCandle: null, confirmationCandle: null, poiData: null }; 
    }

    // 🔥 Helper: ज़ोन की यूनिक ID बनाना
    getZoneId(zone) {
        if (!zone) return null;
        // StartTime, Top और Bottom को मिलाकर एक यूनिक ID बनाते हैं
        return `${zone.startTime}_${zone.priceTop}_${zone.priceBottom}`;
    }

    processLiveMarket(currentPrice, currentCandle, activeZone, trend) {
        
        // 🌟 THE FIX 1: क्या यह ज़ोन पहले ही यूज़ हो चुका है या फेल हो चुका है?
        let activeZoneId = this.getZoneId(activeZone);
        if (activeZoneId && this.deadZones.has(activeZoneId)) {
            return null; // अगर हाँ, तो इसे पूरी तरह इग्नोर करो (Trade 2 & 3 Fix)
        }

        // 🌟 THE FIX 2: ज़ोन फेल्योर ट्रैकर (अगर एंट्री मिलने से पहले या बाद में ज़ोन टूट जाए)
        if (this.currentSetupParams && this.activeState !== 'WAITING_FOR_TAP') {
            let zoneSlPrice = (trend === 'BULLISH' || trend === 'LONG') ? this.currentSetupParams.bottom : this.currentSetupParams.top;
            
            let isZoneBroken = false;
            // बुलिश में कैंडल का लो ज़ोन के बॉटम के नीचे क्लोज/विक कर दे
            if ((trend === 'BULLISH' || trend === 'LONG') && currentCandle.low < zoneSlPrice) isZoneBroken = true;
            // बेयरिश में कैंडल का हाई ज़ोन के टॉप के ऊपर क्लोज/विक कर दे
            if ((trend === 'BEARISH' || trend === 'SHORT') && currentCandle.high > zoneSlPrice) isZoneBroken = true;

            if (isZoneBroken) {
                // ज़ोन टूट गया, इसे डेड ज़ोन्स की लिस्ट में डाल दो ताकि दोबारा कभी यूज़ न हो
                this.deadZones.add(this.getZoneId(this.currentSetupParams));
                this.resetEngine(); 
                return null;
            }
        }

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
                return this.fireTrade('DIRECT_ENTRY', exactEntryPrice, trend, zoneSlPrice, zone);
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
                return this.fireTrade(poi.type, poi.targetEntry, trend, poi.slPrice, this.currentSetupParams);
            }
            return null; // अगर टच नहीं किया, तो इंतज़ार जारी रखो
        }

        // SCOB & Running Candle Logic
        if (this.activeState === 'WAITING_FOR_SCOB_CONFIRMATION') {
            let scobData = this.trackScobAndRunningCandle(candle, trend);
            if (scobData && scobData.isTriggered) {
                if (scobData.sl <= this.maxSlLimit && this.entryTriggers.includes('SCOB ENTRY')) {
                    return this.fireTrade('SCOB_ENTRY', scobData.entryPrice, trend, scobData.slPrice, this.currentSetupParams);
                }
                if (scobData.sl > this.maxSlLimit && this.entryTriggers.includes('SCOB 50% ENTRY')) {
                    return this.fireTrade('SCOB_50_ENTRY', scobData.poi50Price, trend, scobData.slPrice, this.currentSetupParams);
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

    // 🌟 THE FIX 3: Trade Fire होते ही ज़ोन को 'Dead' मार्क कर दो!
    fireTrade(type, entryPrice, trend, spotSlPrice = 0, usedZone = null) {
        let action = (trend === 'BULLISH' || trend === 'LONG') ? 'BUY' : 'SELL';
        let tradeResult = { action, type, entryPrice, spotSlPrice, trendType: trend, timestamp: new Date() };

        // 1. ज़ोन को डेड लिस्ट में डाल दो ताकि दोबारा एंट्री न मिले (Mitigation Fix)
        if (usedZone) {
            this.deadZones.add(this.getZoneId(usedZone));
        }

        // 2. ट्रेड फायर करने के बाद इंजन को वापस 'जागने' के लिए रिसेट करो!
        this.resetEngine();

        return tradeResult;
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