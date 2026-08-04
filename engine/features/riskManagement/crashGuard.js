// ==============================================================
// 🛡️ PHASE 4: THE CRASH GUARD (STATE RECOVERY MANAGER)
// ==============================================================
const Deployment = require('../../../models/Deployment');
const Broker = require('../../../models/Broker');
const dhanStreamer = require('../../../services/dhanStreamer');

// 💾 1. SILENT SYNC (The Memory Back-up Engine)
// Har 10 second me RAM (activeRatioDeployments) ka data MongoDB me push karega
const startSilentSync = (activeRatioDeployments) => {
    setInterval(async () => {
        if (typeof activeRatioDeployments === 'undefined' || activeRatioDeployments.size === 0) return;
        
        for (let [depId, memory] of activeRatioDeployments.entries()) {
            if (memory.status === 'ACTIVE' || memory.status === 'RECOVERY_MODE') {
                try {
                    await Deployment.findByIdAndUpdate(depId, {
                        $set: {
                            "sessionState.highestLockedProfit": memory.highestLockedProfit || 0,
                            "sessionState.isGammaShieldActive": memory.isGammaShieldActive || false,
                            "sessionState.currentTrailedSL": memory.currentTrailedSL || 0,
                            "sessionState.isPanicApiMode": memory.isPanicApiMode || false
                        }
                    });
                } catch (e) {
                    // Silent Error - Taki live market na ruke
                }
            }
        }
    }, 10000); // 10 Sec interval
    console.log("💾 [CRASH GUARD] Silent Sync Started. Engine memory is being backed up...");
};

// 🧟‍♂️ 2. THE ULTIMATE BOOTLOADER (Ressurection)
// Server start hone par ye chalega aur purane trades ko zinda karega
const recoverCrashState = async (activeRatioDeployments) => {
    try {
        console.log("\n🔄 [CRASH GUARD] Booting up Ultimate State Recovery...");
        
        const activeDeployments = await Deployment.find({ status: { $in: ['ACTIVE', 'PARTIALLY_COMPLETED'] } }).populate('brokers');
        
        if (activeDeployments.length === 0) {
            console.log("✅ [CRASH GUARD] System clean. No active trades to resume.\n");
            return;
        }

        console.log(`🚑 [CRASH GUARD] Found ${activeDeployments.length} Active Trade(s). Reading Session States...`);

        const activeBrokers = await Broker.find({ terminalOn: true });
        if (activeBrokers.length > 0 && !dhanStreamer.isConnected) {
            dhanStreamer.connect(activeBrokers[0].clientId, activeBrokers[0].apiSecret);
            await new Promise(resolve => setTimeout(resolve, 3000)); 
        }

        let nseTokens = new Set();
        let bseTokens = new Set();
        let idxTokens = new Set();

        activeDeployments.forEach(dep => {
            const session = dep.sessionState || {};
            const upperSymbol = dep.executedLegs?.[0]?.symbol?.split(' ')[0] || "NIFTY";
            const broker = dep.brokers[0];
            
            // Set Spot Security ID
            let spotSecurityId = "13"; 
            if (upperSymbol.includes("BANKNIFTY")) spotSecurityId = "25";
            else if (upperSymbol.includes("FINNIFTY")) spotSecurityId = "27";
            else if (upperSymbol.includes("MIDCPNIFTY")) spotSecurityId = "26";
            else if (upperSymbol.includes("SENSEX")) spotSecurityId = "51";
            
            idxTokens.add(String(spotSecurityId));

            // 🎯 RAM (Map) ko wapas waise hi bhar do jaisa wo crash hone se pehle tha!
            activeRatioDeployments.set(dep._id.toString(), {
                deploymentId: dep._id.toString(),
                broker: broker,
                symbol: upperSymbol,
                spotSecurityId: spotSecurityId,
                status: dep.status,
                activeLegs: dep.executedLegs,
                estimatedMargin: dep.marginBlocked || 1500000,
                maxLossLimit: dep.maxLoss || 0,
                
                // 🔥 THE MAGIC: Restoring Saved Memory from MongoDB 🔥
                highestLockedProfit: session.highestLockedProfit || 0,
                isGammaShieldActive: session.isGammaShieldActive || false,
                currentTrailedSL: session.currentTrailedSL || 0,
                isPanicApiMode: session.isPanicApiMode || false,
                
                spotHistory: [],
                vWindow: 15,
                vPoints: upperSymbol.includes("BANK") ? 250 : 100
            });

            // Extract Tokens
            dep.executedLegs.forEach(leg => {
                if (leg.status === 'ACTIVE' && leg.securityId) {
                    const exch = String(leg.exchange || "NSE_FNO").toUpperCase();
                    if (exch.includes("BSE")) bseTokens.add(String(leg.securityId));
                    else nseTokens.add(String(leg.securityId));
                }
            });
        });

        // Fire Subscriptions!
        if (nseTokens.size > 0) dhanStreamer.subscribeTokens("NSE_FNO", Array.from(nseTokens));
        if (bseTokens.size > 0) dhanStreamer.subscribeTokens("BSE_FNO", Array.from(bseTokens));
        if (idxTokens.size > 0) dhanStreamer.subscribeTokens("IDX_I", Array.from(idxTokens));

        console.log(`🎯 [CRASH GUARD] Immortal Engine Resumed! Restored Memory for ${activeDeployments.length} deployments. Live Hunt Started!\n`);

    } catch (error) {
        console.error("❌ [CRASH GUARD] Error during recovery:", error);
    }
};

module.exports = {
    startSilentSync,
    recoverCrashState
};