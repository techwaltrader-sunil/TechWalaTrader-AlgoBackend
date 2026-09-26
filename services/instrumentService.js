
const axios = require('axios');
const csv = require('csv-parser');

// 🔥 THE FIX: Sleep function add karein
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const DHAN_CSV_URL = "https://images.dhan.co/api-data/api-scrip-master.csv";

let nfoInstruments = [];

const downloadAndParseInstruments = async () => {
    console.log("📥 Downloading Dhan Scrip Master CSV... Please wait.");
    try {
        const response = await axios({ method: 'get', url: DHAN_CSV_URL, responseType: 'stream' });
        const tempData = [];

        response.data
            .pipe(csv({ mapHeaders: ({ header }) => header.trim() }))
            .on('data', (row) => {
                const instName = (row.SEM_INSTRUMENT_NAME || "").trim();
                // 🔥 THE FIX: Ab OPTIDX ke sath-sath FUTIDX (Futures) bhi parse aur save hoga!
                if (instName === 'OPTIDX' || instName === 'OPTSTK' || instName === 'FUTIDX' || instName === 'FUTSTK') {
                    tempData.push({
                        id: (row.SEM_SMST_SECURITY_ID || "").trim(),
                        customSymbol: (row.SEM_CUSTOM_SYMBOL || "").trim().toUpperCase(),
                        tradingSymbol: (row.SEM_TRADING_SYMBOL || "").trim().toUpperCase(),
                        strike: parseFloat(row.SEM_STRIKE_PRICE || 0),
                        expiry: (row.SEM_EXPIRY_DATE || "").trim(),
                        instrumentType: instName // Taki baad me pata chale ye Option hai ya Future
                    });
                }
            })
            .on('end', () => {
                nfoInstruments = tempData;
                console.log(`✅ Dhan CSV Parsed Successfully! Loaded ${nfoInstruments.length} NFO contracts (Options + Futures).`);
            });

    } catch (error) {
        console.error("❌ Failed to download CSV:", error.message);
    }
};

// 🔥 NAYA HELPER: Instrument ke hisab se Strike Step nikalna
const getStrikeStep = (symbol) => {
    const sym = (symbol || "").toUpperCase(); 
    if (sym.includes("BANKNIFTY") || sym.includes("SENSEX") || sym.includes("BANKEX")) return 100;
    if (sym.includes("FINNIFTY") || sym.includes("NIFTY")) return 50;
    if (sym.includes("MIDCPNIFTY") || sym.includes("MIDCAP")) return 25;
    return 50;
};

// 🔥 NAYA HELPER: OTM/ITM aur % ka Math karke exact Strike Price nikalna
const calculateTargetStrike = (spotPrice, baseSymbol, strikeCriteria, strikeType, optionType) => {
    const step = getStrikeStep(baseSymbol);
    const atmStrike = Math.round(spotPrice / step) * step; 

    if (!strikeType || String(strikeType).trim() === "ATM" || String(strikeType).trim() === "") return atmStrike;

    const isCall = ['CE', 'CALL'].includes((optionType || "").toUpperCase());
    const parts = String(strikeType).split(' '); 

    if (parts.length >= 2) {
        const type = (parts[0] || "").toUpperCase(); 
        let offsetVal = parseFloat(String(parts[1]).replace('%', '')) || 0; 

        let offsetPoints = 0;
        if (strikeCriteria === "ATM pt") {
            offsetPoints = offsetVal;
        } else if (strikeCriteria === "ATM %") {
            offsetPoints = (atmStrike * offsetVal) / 100;
        }

        const steppedOffset = Math.round(offsetPoints / step) * step;

        if (type === 'ITM') {
            return isCall ? (atmStrike - steppedOffset) : (atmStrike + steppedOffset);
        } else if (type === 'OTM') {
            return isCall ? (atmStrike + steppedOffset) : (atmStrike - steppedOffset);
        }
    }
    return atmStrike; 
};

// 🔥 THE NEW SMART HELPER: FOR FUTURE CONTRACTS 🔥
// 🔥 THE NEW SMART HELPER: FOR FUTURE CONTRACTS 🔥
const getFutureSecurityId = async (baseSymbol, dateStr) => {
    let targetBase = String(baseSymbol).toUpperCase().replace(' 50', '').replace(' BANK', '').trim();
    if (targetBase === "NIFTY FIN SERVICE") targetBase = "FINNIFTY";
    else if (targetBase === "NIFTY MID SELECT") targetBase = "MIDCPNIFTY";
    else if (targetBase === "BSE SENSEX") targetBase = "SENSEX";

    const tradeDate = new Date(dateStr);
    tradeDate.setHours(0, 0, 0, 0);
    
    if (nfoInstruments.length > 0) {
        const matches = nfoInstruments.filter(inst => 
            inst.instrumentType === 'FUTIDX' && 
            (inst.tradingSymbol.startsWith(targetBase) || inst.customSymbol.startsWith(targetBase))
        );
        
        if (matches.length > 0) {
            // Find the future contract whose expiry is >= tradeDate
            const validFutures = matches.filter(inst => new Date(inst.expiry) >= tradeDate);
            if (validFutures.length > 0) {
                validFutures.sort((a, b) => new Date(a.expiry) - new Date(b.expiry));
                return validFutures[0].id; // Exact Future ID mil gaya!
            }
        }
    }

    // 🚨 Agar contract expire ho chuka hai aur CSV me nahi hai, toh null return karo.
    return null;
};

// 🔥 UPDATED FUNCTION: Ab ye Expiry aur Strike Criteria bhi handle karega
const getOptionSecurityId = (baseSymbol, spotPrice, strikeCriteria, strikeType, optionType, requestedExpiry = "WEEKLY") => {
    
    // Failsafe: Agar backtest se symbol ya option type gayab ho
    if (!baseSymbol || !optionType) {
        console.log(`⚠️ Invalid Input in getOptionSecurityId: Base=${baseSymbol}, Opt=${optionType}`);
        return null;
    }

    let targetBase = String(baseSymbol).toUpperCase().replace(' 50', '').trim();
    if (targetBase === "NIFTY BANK") targetBase = "BANKNIFTY";
    else if (targetBase === "NIFTY FIN SERVICE") targetBase = "FINNIFTY";
    else if (targetBase === "NIFTY MID SELECT") targetBase = "MIDCPNIFTY";
    else if (targetBase === "BSE SENSEX") targetBase = "SENSEX";   // 🔥 Sensex map
    else if (targetBase === "BSE BANKEX") targetBase = "BANKEX";   // 🔥 Bankex map

    const suffix = ['CE', 'CALL'].includes(String(optionType).toUpperCase()) ? 'CE' : 'PE';

    const targetStrike = calculateTargetStrike(spotPrice, targetBase, strikeCriteria, strikeType, suffix);

    const matches = nfoInstruments.filter(inst => {
        if (inst.instrumentType !== 'OPTIDX' && inst.instrumentType !== 'OPTSTK') return false; // Options only
        if (inst.strike !== targetStrike) return false;
        if (inst.id.length > 7) return false; 
        const ts = inst.tradingSymbol;
        const cs = inst.customSymbol;
        if (!ts.startsWith(targetBase) && !cs.startsWith(targetBase)) return false;
        if (!ts.endsWith(suffix) && !cs.endsWith(suffix)) return false;
        return true;
    });

    if (matches.length === 0) return null;

    const uniqueExpiries = [...new Set(matches.map(inst => inst.expiry.split(' ')[0]))]
                            .sort((a, b) => new Date(a) - new Date(b));

    let selectedExpiry = uniqueExpiries[0]; 

    if (requestedExpiry === "NEXT WEEKLY" && uniqueExpiries.length > 1) {
        selectedExpiry = uniqueExpiries[1]; 
    } 
    else if (requestedExpiry === "MONTHLY") {
        const currentMonth = new Date(uniqueExpiries[0]).getMonth();
        const currentMonthExpiries = uniqueExpiries.filter(d => new Date(d).getMonth() === currentMonth);
        selectedExpiry = currentMonthExpiries[currentMonthExpiries.length - 1]; 
        if (!selectedExpiry) selectedExpiry = uniqueExpiries[uniqueExpiries.length - 1];
    }

    const finalMatch = matches.find(m => m.expiry.startsWith(selectedExpiry)) || matches[0];

    const isBSE = targetBase === "SENSEX" || targetBase === "BANKEX" || targetBase === "BSE SENSEX" || targetBase === "BSE BANKEX";

    return {
        id: finalMatch.id,
        exchange: isBSE ? "BSE_FNO" : "NSE_FNO",
        tradingSymbol: finalMatch.customSymbol || finalMatch.tradingSymbol,
        expiry: finalMatch.expiry.split(' ')[0],
        optionType: suffix === 'CE' ? 'CALL' : 'PUT',
        strike: finalMatch.strike
    };
};


// 🔥 NAYA FUNCTION: Option Chain ke 210 Tokens (±2600 points) nikalne ke liye
const getOptionChainTokens = (baseSymbol, expiryDate, spotPrice) => {
    // console.log(`getOptionChainTokens called with spotPrice: ${spotPrice}`);
    
    let targetBase = String(baseSymbol).toUpperCase().replace(' 50', '').trim();
    if (targetBase === "NIFTY BANK") targetBase = "BANKNIFTY";
    else if (targetBase === "NIFTY FIN SERVICE") targetBase = "FINNIFTY";
    else if (targetBase === "NIFTY MID SELECT") targetBase = "MIDCPNIFTY";

    const step = getStrikeStep(targetBase);
    const atmStrike = Math.round(spotPrice / step) * step;

    // ±2600 Points ki range
    const minStrike = atmStrike - 2600;
    const maxStrike = atmStrike + 2600;

    // nfoInstruments (RAM) se matching strikes filter karna
    const matches = nfoInstruments.filter(inst => {
        if (inst.instrumentType !== 'OPTIDX') return false; 
        if (inst.strike < minStrike || inst.strike > maxStrike) return false; 
        
        const ts = inst.tradingSymbol;
        if (!ts.startsWith(targetBase + "-")) return false; 
        if (!inst.expiry.startsWith(expiryDate)) return false; 
        
        return true;
    });

    // 🎯 THE SILENT KILLER FIX: Dhan WebSocket expects "NSE_FNO" (not OPTIDX)
    const isBSE = targetBase === "SENSEX" || targetBase === "BANKEX";
    const exchangeSeg = isBSE ? "BSE_FNO" : "NSE_FNO";

    return matches.map(opt => ({
        ExchangeSegment: exchangeSeg, // 👈 🎯 यहाँ OPTIDX की जगह NSE_FNO कर दिया!
        SecurityId: opt.id.toString()
    }));
};

// 🔥 NAYA FUNCTION: Table ka dhancha (Skeleton)
// 🎯 THE FIX: Bracket me spotPrice add kiya gaya hai
const getOptionChainSkeleton = (baseSymbol, expiryDate, spotPrice) => { 
    let targetBase = String(baseSymbol).toUpperCase().replace(' 50', '').trim();
    if (targetBase === "NIFTY BANK") targetBase = "BANKNIFTY";

    const step = getStrikeStep(targetBase);
    
    // 🎯 THE FIX: spotPrice ab upar se aayega, error nahi aayega
    const validSpot = (spotPrice && spotPrice > 0) ? spotPrice : 23200; 
    const atmStrike = Math.round(validSpot / step) * step;

    const minStrike = atmStrike - 2600;
    const maxStrike = atmStrike + 2600;

    const matches = nfoInstruments.filter(inst => {
        if (inst.instrumentType !== 'OPTIDX') return false;
        if (inst.strike < minStrike || inst.strike > maxStrike) return false; 

        const ts = inst.tradingSymbol;
        if (!ts.startsWith(targetBase + "-")) return false; 
        if (!inst.expiry.startsWith(expiryDate)) return false; 
        return true;
    });

    const chainMap = {};
    matches.forEach(inst => {
        const strike = inst.strike;
        if (!chainMap[strike]) {
            chainMap[strike] = { 
                strikePrice: strike, strike: strike, 
                CE: { ltp: 0, volume: 0, oi: 0, oiChg: 0, token: '' }, 
                PE: { ltp: 0, volume: 0, oi: 0, oiChg: 0, token: '' } 
            };
        }
        const isCE = inst.tradingSymbol.endsWith('CE') || inst.customSymbol.endsWith('CE');
        if (isCE) {
            chainMap[strike].CE.token = inst.id.toString();
        } else {
            chainMap[strike].PE.token = inst.id.toString();
        }
    });

    return Object.values(chainMap).sort((a, b) => a.strikePrice - b.strikePrice);
};

// 🔥 MODULE EXPORTS ME GET_FUTURE_SECURITY_ID ADD KIYA GAYA HAI
module.exports = { 
    downloadAndParseInstruments, 
    getOptionSecurityId, 
    getStrikeStep, 
    getFutureSecurityId, 
    sleep,
    getOptionChainTokens,
    getOptionChainSkeleton
};