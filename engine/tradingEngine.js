

// import { calculateBSDelta } from "./utils/blackScholes.js";
// import { fetchLivePrice } from "./utils/priceFetcher.js";

// import { findStrikeByLivePremium } from "./scanners/optionChainScanner.js";
// import { getIndicatorSignal } from "./scanners/indicatorScanner.js";

// import { handleMoveSlToCost } from "./features/advanceFeatures/moveSlToCost.js";

// const cron = require("node-cron");
// const moment = require("moment-timezone");
// const axios = require("axios");
// const Deployment = require("../models/Deployment");
// const Broker = require("../models/Broker");
// const AlgoTradeLog = require("../models/AlgoTradeLog");
// const {
//   placeDhanOrder,
//   fetchLiveLTP,
//   fetchDhanHistoricalData,
// } = require("../services/dhanService");
// const {
//   calculateIndicator,
//   extractParams,
//   evaluateCondition,
// } = require("../services/indicatorService"); // 👈 NAYA
// const { getOptionSecurityId } = require("../services/instrumentService");

// const { getImpliedVolatility } = require("implied-volatility");

// console.log("🚀 Trading Engine Initialized...");

// const executionLocks = new Set();
// const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// const getStrikeStep = (symbol) => {
//   const sym = symbol.toUpperCase();
//   if (sym.includes("BANKNIFTY")) return 100;
//   if (sym.includes("FINNIFTY")) return 50;
//   if (sym.includes("MIDCPNIFTY") || sym.includes("MIDCAP")) return 25; // Midcap Strike Step
//   if (sym.includes("NIFTY")) return 50;
//   if (sym.includes("SENSEX")) return 100;
//   return 50;
// };

// // ==========================================
// // 📝 LOG CREATOR
// // ==========================================
// const createAndEmitLog = async (
//   broker,
//   symbol,
//   action,
//   quantity,
//   status,
//   message,
//   orderId = "N/A",
// ) => {
//   try {
//     const newLog = await AlgoTradeLog.create({
//       brokerId: broker._id,
//       brokerName: broker.name,
//       symbol,
//       action,
//       quantity,
//       status,
//       message,
//       orderId,
//     });
//     if (global.io) global.io.emit("new-trade-log", newLog);
//   } catch (err) {
//     console.error("❌ Log Error:", err.message);
//   }
// };

// // ==========================================
// // ⚙️ MAIN CRON JOB
// // ==========================================
// cron.schedule("*/30 * * * * *", async () => {
//   try {
//     const currentTime = moment().tz("Asia/Kolkata").format("HH:mm");
//     const activeDeployments = await Deployment.find({
//       status: "ACTIVE",
//     }).populate("strategyId");

//     if (activeDeployments.length === 0) return;

//     if (currentTime === "00:00" && executionLocks.size > 0)
//       executionLocks.clear();

//     for (const deployment of activeDeployments) {
//       await sleep(1000);

//       const strategy = deployment.strategyId;
//       if (!strategy) continue;

//       const config = strategy.data?.config || {};
//       const entryLockKey = `ENTRY_${deployment._id.toString()}_${currentTime}`;
//       const exitLockKey = `EXIT_${deployment._id.toString()}_${currentTime}`;
//       const squareOffTime = deployment.squareOffTime || config.squareOffTime;

//       // 1. ENTRY LOGIC ⚡
//       if (!executionLocks.has(entryLockKey) && !deployment.tradedSecurityId) {
//         let shouldEnter = false;
//         let currentSignalType = "NONE";
//         const strategyType = strategy.type || "Time Based";

//         // ==============================================================
//         // 🛑 THE SHIELD: STRICT SYMBOL VALIDATION (Fail-Safe Mechanism)
//         // ==============================================================
//         const instrumentData =
//           strategy.data.instruments && strategy.data.instruments.length > 0
//             ? strategy.data.instruments[0]
//             : {};
//         let rawSymbol =
//           instrumentData.name ||
//           config.index ||
//           strategy.symbol ||
//           strategy.name;

//         if (!rawSymbol) {
//           console.log(
//             `❌ [CRITICAL ERROR] No valid symbol found for strategy: ${strategy.name}. Trade Aborted!`,
//           );
//           continue; // Loop me agli strategy par chale jao
//         }

//         let baseSymbol = "";
//         const upperRawSymbol = String(rawSymbol).toUpperCase();

//         if (upperRawSymbol.includes("BANK")) baseSymbol = "BANKNIFTY";
//         else if (upperRawSymbol.includes("FIN")) baseSymbol = "FINNIFTY";
//         else if (upperRawSymbol.includes("MID")) baseSymbol = "MIDCPNIFTY";
//         else if (upperRawSymbol.includes("NIFTY")) baseSymbol = "NIFTY";
//         else if (upperRawSymbol.includes("SENSEX")) baseSymbol = "SENSEX";
//         else {
//           console.log(
//             `❌ [CRITICAL ERROR] Unknown symbol format: '${rawSymbol}' for strategy: ${strategy.name}. Trade Aborted!`,
//           );
//           continue; // Agar "Reliance" ya koi ajeeb naam hai toh rok do
//         }
//         // ==============================================================

//         // 🟢 A. INDICATOR BASED CHECK
//         if (strategyType === "Indicator Based") {
//           const broker = await Broker.findById(deployment.brokers[0]);
//           if (broker && broker.engineOn) {
//             // 🧠 Signal mangao (Ab baseSymbol upar se verified aayega)
//             const signal = await getIndicatorSignal(
//               strategy,
//               broker,
//               baseSymbol,
//             );

//             if (signal.long) {
//               shouldEnter = true;
//               currentSignalType = "LONG";
//               console.log(
//                 `📈 [BULLISH SIGNAL] LONG Indicator matched for ${strategy.name}`,
//               );
//             } else if (signal.short) {
//               shouldEnter = true;
//               currentSignalType = "SHORT";
//               console.log(
//                 `📉 [BEARISH SIGNAL] SHORT Indicator matched for ${strategy.name}`,
//               );
//             }
//           }
//         }
//         // ⏰ B. TIME BASED CHECK
//         else {
//           if (config.startTime === currentTime) {
//             shouldEnter = true;
//             currentSignalType = "TIME";
//           }
//         }

//         // 🚀 C. EXECUTE ENTRY
//         if (shouldEnter) {
//           executionLocks.add(entryLockKey);
//           const isPrePunchSL =
//             strategy.data?.advanceSettings?.prePunchSL || false;

//           for (const brokerId of deployment.brokers) {
//             const broker = await Broker.findById(brokerId);
//             if (broker && broker.engineOn) {
//               for (const leg of strategy.data.legs) {
//                 let tradeAction = (leg.action || "BUY").toUpperCase();
//                 let tradeQty = (leg.quantity || 1) * deployment.multiplier;

//                 // 🔥 OPTION BUYING & SELLING LOGIC
//                 let optType = leg.optionType === "Call" ? "CE" : "PE";

//                 if (currentSignalType === "LONG") {
//                   optType = tradeAction === "BUY" ? "CE" : "PE";
//                 } else if (currentSignalType === "SHORT") {
//                   optType = tradeAction === "BUY" ? "PE" : "CE";
//                 }

//                 let currentSpotPrice = await fetchLivePrice(baseSymbol);
//                 if (!currentSpotPrice) continue;

//                 let stepValue = getStrikeStep(baseSymbol);
//                 let targetStrikePrice =
//                   Math.round(currentSpotPrice / stepValue) * stepValue;
//                 // const instrument = getOptionSecurityId(baseSymbol, targetStrikePrice, optType);

//                 // 🔥 THE SMART STRIKE FINDER 🔥
//                 const strikeCriteria = leg.strikeCriteria || "ATM pt";
//                 const strikeType = leg.strikeType || "ATM";
//                 const requestedExpiry = leg.expiry || "WEEKLY";

//                 let instrument = null;

//                 // Agar user ko Premium (CP) ke hisab se trade lena hai:
//                 if (
//                   ["CP", "CP >=", "CP <=", "Delta"].includes(strikeCriteria)
//                 ) {
//                   instrument = await findStrikeByLivePremium(
//                     baseSymbol,
//                     currentSpotPrice,
//                     optType,
//                     requestedExpiry,
//                     strikeCriteria,
//                     strikeType, // Yahan strikeType ke andar user ka value hoga (e.g., 100, 50)
//                     broker,
//                   );
//                 }
//                 // Normal ATM/ITM/OTM points ya % ke liye purana fast method:
//                 else {
//                   instrument = getOptionSecurityId(
//                     baseSymbol,
//                     currentSpotPrice,
//                     strikeCriteria,
//                     strikeType,
//                     optType,
//                     requestedExpiry,
//                   );
//                 }

//                 if (!instrument) {
//                   console.log(
//                     `⚠️ Trade skipped: Could not find valid instrument for Leg ${leg.id}`,
//                   );
//                   continue;
//                 }

//                 // 🟢 FORWARD TEST / PAPER TRADING EXECUTION
//                 if (
//                   deployment.executionType === "FORWARD_TEST" ||
//                   deployment.executionType === "PAPER"
//                 ) {
//                   await sleep(500);
//                   const entryPrice =
//                     (await fetchLiveLTP(
//                       broker.clientId,
//                       broker.apiSecret,
//                       instrument.exchange,
//                       instrument.id,
//                     )) || currentSpotPrice;

//                   deployment.tradedSecurityId = instrument.id;
//                   deployment.tradedExchange = instrument.exchange;
//                   deployment.tradedQty = tradeQty;
//                   deployment.tradeAction = tradeAction;
//                   deployment.tradedSymbol = instrument.tradingSymbol;
//                   deployment.entryPrice = entryPrice;

//                   if (isPrePunchSL && entryPrice > 0 && leg.slValue > 0) {
//                     let slPrice = 0;
//                     if (tradeAction === "BUY") {
//                       slPrice =
//                         leg.slType === "SL%"
//                           ? entryPrice -
//                             entryPrice * (Number(leg.slValue) / 100)
//                           : entryPrice - Number(leg.slValue);
//                     } else if (tradeAction === "SELL") {
//                       slPrice =
//                         leg.slType === "SL%"
//                           ? entryPrice +
//                             entryPrice * (Number(leg.slValue) / 100)
//                           : entryPrice + Number(leg.slValue);
//                     }
//                     deployment.paperSlPrice = slPrice;
//                   }

//                   await deployment.save();
//                   console.log(
//                     `📝 PAPER TRADE EXECUTED: ${instrument.tradingSymbol} (Action: ${tradeAction}) at ₹${entryPrice}`,
//                   );
//                   await createAndEmitLog(
//                     broker,
//                     instrument.tradingSymbol,
//                     tradeAction,
//                     tradeQty,
//                     "SUCCESS",
//                     `Paper Trade Entry Executed at ₹${entryPrice}`,
//                   );
//                 }

//                 // ==========================================
//                 // 🔴 LIVE TRADING EXECUTION (Asli Paisa)
//                 // ==========================================
//                 if (deployment.executionType === "LIVE") {
//                   const orderData = {
//                     action: tradeAction,
//                     quantity: tradeQty,
//                     securityId: instrument.id,
//                     segment: instrument.exchange,
//                   };
//                   const orderResponse = await placeDhanOrder(
//                     broker.clientId,
//                     broker.apiSecret,
//                     orderData,
//                   );

//                   if (orderResponse.success) {
//                     const respData = orderResponse.data || {};
//                     const orderStatus = respData.orderStatus
//                       ? respData.orderStatus.toUpperCase()
//                       : "UNKNOWN";

//                     if (orderStatus !== "REJECTED") {
//                       deployment.tradedSecurityId = instrument.id;
//                       deployment.tradedExchange = instrument.exchange;
//                       deployment.tradedQty = tradeQty;
//                       deployment.tradeAction = tradeAction;
//                       deployment.tradedSymbol = instrument.tradingSymbol;

//                       await sleep(1000);
//                       const entryPrice = await fetchLiveLTP(
//                         broker.clientId,
//                         broker.apiSecret,
//                         instrument.exchange,
//                         instrument.id,
//                       );
//                       deployment.entryPrice = entryPrice || 0;

//                       // 🛡️ LIVE PRE-PUNCH SL LOGIC
//                       if (isPrePunchSL && entryPrice > 0 && leg.slValue > 0) {
//                         let slPrice =
//                           leg.slType === "SL%"
//                             ? entryPrice -
//                               entryPrice * (Number(leg.slValue) / 100)
//                             : entryPrice - Number(leg.slValue);

//                         // Yahan Dhan ka SL-M Order fire hoga future me
//                         console.log(
//                           `🛡️ [LIVE PRE-PUNCH] SL Placed at ₹${slPrice.toFixed(2)} on Exchange`,
//                         );
//                       }

//                       await deployment.save();
//                       await createAndEmitLog(
//                         broker,
//                         instrument.tradingSymbol,
//                         tradeAction,
//                         tradeQty,
//                         "SUCCESS",
//                         `Entry Order placed successfully`,
//                         respData.orderId,
//                       );
//                     } else {
//                       await createAndEmitLog(
//                         broker,
//                         instrument.tradingSymbol,
//                         tradeAction,
//                         tradeQty,
//                         "FAILED",
//                         respData.remarks || "RMS Rejected",
//                         respData.orderId,
//                       );
//                     }
//                   } else {
//                     const errorObj = orderResponse.error || {};
//                     await createAndEmitLog(
//                       broker,
//                       instrument.tradingSymbol,
//                       tradeAction,
//                       tradeQty,
//                       "FAILED",
//                       errorObj.internalErrorMessage || JSON.stringify(errorObj),
//                     );
//                   }
//                 }
//               }
//             }
//           }
//         }
//       }

//       // 2. // ==========================================
//       // 2. AUTO SQUARE-OFF LOGIC ⏰
//       // ==========================================
//       if (
//         squareOffTime === currentTime &&
//         !executionLocks.has(exitLockKey) &&
//         deployment.tradedSecurityId
//       ) {
//         executionLocks.add(exitLockKey);
//         console.log(`⏰ SQUARE-OFF TRIGGERED! Strategy: ${strategy.name}`);

//         for (const brokerId of deployment.brokers) {
//           const broker = await Broker.findById(brokerId);
//           if (broker && broker.engineOn) {
//             const exitAction =
//               deployment.tradeAction === "BUY" ? "SELL" : "BUY";
//             const squareOffSymbolName = deployment.tradedSymbol
//               ? `${deployment.tradedSymbol} (Auto-Exit)`
//               : "Auto Square-Off";

//             let isExitSuccessful = false;
//             let exitLtp = 0;
//             let exitRemarks = "Square-Off Completed";
//             let orderIdToSave = "N/A";

//             // 🟢 PAPER TRADE EXIT LOGIC
//             if (
//               deployment.executionType === "FORWARD_TEST" ||
//               deployment.executionType === "PAPER"
//             ) {
//               await sleep(500);
//               exitLtp =
//                 (await fetchLiveLTP(
//                   broker.clientId,
//                   broker.apiSecret,
//                   deployment.tradedExchange,
//                   deployment.tradedSecurityId,
//                 )) || 0;
//               isExitSuccessful = true;
//               exitRemarks = "Paper Trade Auto-Exit Executed";
//             }
//             // 🔴 LIVE TRADE EXIT LOGIC
//             else if (deployment.executionType === "LIVE") {
//               const orderData = {
//                 action: exitAction,
//                 quantity: deployment.tradedQty,
//                 securityId: deployment.tradedSecurityId,
//                 segment: deployment.tradedExchange,
//               };
//               const orderResponse = await placeDhanOrder(
//                 broker.clientId,
//                 broker.apiSecret,
//                 orderData,
//               );

//               if (orderResponse.success) {
//                 const respData = orderResponse.data || {};
//                 if (
//                   respData.orderStatus &&
//                   respData.orderStatus.toUpperCase() !== "REJECTED"
//                 ) {
//                   await sleep(1000);
//                   exitLtp =
//                     (await fetchLiveLTP(
//                       broker.clientId,
//                       broker.apiSecret,
//                       deployment.tradedExchange,
//                       deployment.tradedSecurityId,
//                     )) || 0;
//                   isExitSuccessful = true;
//                   orderIdToSave = respData.orderId;
//                   exitRemarks = `Live Auto-Exit Successful`;
//                 } else {
//                   exitRemarks = respData.remarks || "RMS Rejected";
//                 }
//               } else {
//                 exitRemarks =
//                   orderResponse.error?.errorMessage || "API Order Failed";
//               }
//             }

//             // 🧮 FINAL P&L CALCULATION & DB SAVE
//             if (isExitSuccessful) {
//               let finalPnl = 0;
//               if (exitLtp > 0 && deployment.entryPrice > 0) {
//                 finalPnl =
//                   deployment.tradeAction === "BUY"
//                     ? (exitLtp - deployment.entryPrice) * deployment.tradedQty
//                     : (deployment.entryPrice - exitLtp) * deployment.tradedQty;
//               }

//               deployment.exitPrice = exitLtp;
//               deployment.pnl = finalPnl; // 🔥 FIX: Frontend isko padhta hai
//               deployment.realizedPnl = finalPnl;
//               deployment.status = "COMPLETED";
//               await deployment.save();

//               console.log(
//                 `🏁 [EXIT SUCCESS] ${exitRemarks} | P&L: ₹${finalPnl.toFixed(2)}`,
//               );
//               await createAndEmitLog(
//                 broker,
//                 squareOffSymbolName,
//                 exitAction,
//                 deployment.tradedQty,
//                 "SUCCESS",
//                 `${exitRemarks} (P&L: ₹${finalPnl.toFixed(2)})`,
//                 orderIdToSave,
//               );
//             } else {
//               await createAndEmitLog(
//                 broker,
//                 squareOffSymbolName,
//                 exitAction,
//                 deployment.tradedQty,
//                 "FAILED",
//                 `Exit Failed: ${exitRemarks}`,
//                 orderIdToSave,
//               );
//               executionLocks.delete(exitLockKey); // Failed hua to aagle loop me fir try karega
//             }
//           }
//         }
//       }

//       // ==========================================
//       // 3. MTM (MAX PROFIT / MAX LOSS) SQUARE-OFF LOGIC 💰
//       // ==========================================
//       const riskData = strategy.data?.riskManagement || {};
//       const maxProfit = parseFloat(riskData.maxProfit) || 0;
//       const maxLoss = parseFloat(riskData.maxLoss) || 0;

//       if (
//         !executionLocks.has(exitLockKey) &&
//         deployment.tradedSecurityId &&
//         deployment.entryPrice > 0 &&
//         (maxProfit > 0 || maxLoss > 0)
//       ) {
//         for (const brokerId of deployment.brokers) {
//           const broker = await Broker.findById(brokerId);
//           if (broker && broker.engineOn) {
//             try {
//               const liveLtp = await fetchLiveLTP(
//                 broker.clientId,
//                 broker.apiSecret,
//                 deployment.tradedExchange,
//                 deployment.tradedSecurityId,
//               );

//               if (liveLtp && liveLtp > 0) {
//                 let currentPnl =
//                   deployment.tradeAction === "BUY"
//                     ? (liveLtp - deployment.entryPrice) * deployment.tradedQty
//                     : (deployment.entryPrice - liveLtp) * deployment.tradedQty;

//                 let squareOffReason = null;
//                 if (maxProfit > 0 && currentPnl >= maxProfit)
//                   squareOffReason = `Target Reached (Max Profit: ₹${maxProfit})`;
//                 else if (maxLoss > 0 && currentPnl <= -Math.abs(maxLoss))
//                   squareOffReason = `Stop-Loss Hit (Max Loss: ₹${Math.abs(maxLoss)})`;

//                 if (squareOffReason) {
//                   executionLocks.add(exitLockKey);
//                   console.log(
//                     `🚨 MTM SQUARE-OFF TRIGGERED! Reason: ${squareOffReason}`,
//                   );

//                   const exitAction =
//                     deployment.tradeAction === "BUY" ? "SELL" : "BUY";
//                   const squareOffSymbolName = deployment.tradedSymbol
//                     ? `${deployment.tradedSymbol} (MTM-Exit)`
//                     : "MTM Square-Off";

//                   let isExitSuccessful = false;
//                   let exitRemarks = squareOffReason;
//                   let orderIdToSave = "N/A";

//                   // 🟢 PAPER TRADE MTM EXIT
//                   if (
//                     deployment.executionType === "FORWARD_TEST" ||
//                     deployment.executionType === "PAPER"
//                   ) {
//                     isExitSuccessful = true;
//                     exitRemarks = `Paper Trade MTM Exit: ${squareOffReason}`;
//                   }
//                   // 🔴 LIVE TRADE MTM EXIT
//                   else if (deployment.executionType === "LIVE") {
//                     const orderData = {
//                       action: exitAction,
//                       quantity: deployment.tradedQty,
//                       securityId: deployment.tradedSecurityId,
//                       segment: deployment.tradedExchange,
//                     };
//                     const orderResponse = await placeDhanOrder(
//                       broker.clientId,
//                       broker.apiSecret,
//                       orderData,
//                     );

//                     if (
//                       orderResponse.success &&
//                       orderResponse.data?.orderStatus?.toUpperCase() !==
//                         "REJECTED"
//                     ) {
//                       isExitSuccessful = true;
//                       orderIdToSave = orderResponse.data.orderId;
//                       exitRemarks = `Live MTM Exit: ${squareOffReason}`;
//                     } else {
//                       exitRemarks =
//                         orderResponse.data?.remarks ||
//                         orderResponse.error?.errorMessage ||
//                         "RMS Rejected";
//                     }
//                   }

//                   // 🧮 FINAL P&L CALCULATION & DB SAVE
//                   if (isExitSuccessful) {
//                     deployment.exitPrice = liveLtp;
//                     deployment.pnl = currentPnl; // 🔥 FIX
//                     deployment.realizedPnl = currentPnl;
//                     deployment.status = "COMPLETED";
//                     await deployment.save();

//                     await createAndEmitLog(
//                       broker,
//                       squareOffSymbolName,
//                       exitAction,
//                       deployment.tradedQty,
//                       "SUCCESS",
//                       `${exitRemarks} (Final P&L: ₹${currentPnl.toFixed(2)})`,
//                       orderIdToSave,
//                     );
//                   } else {
//                     await createAndEmitLog(
//                       broker,
//                       squareOffSymbolName,
//                       exitAction,
//                       deployment.tradedQty,
//                       "FAILED",
//                       `MTM Exit Failed: ${exitRemarks}`,
//                       orderIdToSave,
//                     );
//                     executionLocks.delete(exitLockKey);
//                   }
//                 }
//               }
//             } catch (err) {
//               console.log(`⚠️ MTM Check Failed for ${strategy.name}: ${err.message}`,);
//             }
//           }
//         }
//       }
//     }
//   } catch (error) {
//     console.error("❌ Trading Engine Error:", error);
//   }
// });



// // ==========================================
// // 🌟 MAIN TRADING ENGINE (THE MANAGER) 🌟
// // ==========================================
// const cron = require('node-cron');
// const moment = require('moment-timezone');

// // 📂 Models
// const Deployment = require('../models/Deployment.js');
// const Broker = require('../models/Broker.js');

// // 🛠️ Utilities & APIs (Inhe apne path ke hisab se set karein)
// const { sleep, getStrikeStep, getOptionSecurityId } = require('../services/instrumentService.js');
// const { placeDhanOrder, fetchLiveLTP } = require('../services/dhanService.js');
// const { fetchLivePrice } = require('./utils/priceFetcher.js');
// const { createAndEmitLog } = require('./utils/logger.js'); // Log function ko ek file me dal diya hai

// // 🔍 Scanners
// const { findStrikeByLivePremium } = require('./scanners/optionChainScanner.js');
// const { getIndicatorSignal } = require('./scanners/indicatorScanner.js');  

// // 🛡️ Risk Management & Advance Features
// const { handleMtmSquareOff } = require('./features/riskManagement/mtmSquareOff.js');
// const { processTrailingLogic } = require('./features/riskManagement/trailingLogic.js');
// const { handleMoveSlToCost } = require('./features/advanceFeatures/moveSlToCost.js');

// // Global execution locks (Double entry se bachne ke liye)
// const executionLocks = new Set();

// // ==========================================
// // ⚙️ THE CORE CRON JOB LOOP (Runs every 30s)
// // ==========================================
// cron.schedule('*/30 * * * * *', async () => {
//     try {
//         const currentTime = moment().tz("Asia/Kolkata").format("HH:mm");
//         const activeDeployments = await Deployment.find({ status: 'ACTIVE' }).populate('strategyId');

//         if (activeDeployments.length === 0) return;

//         // Reset locks at midnight
//         if (currentTime === "00:00" && executionLocks.size > 0) executionLocks.clear();

//         for (const deployment of activeDeployments) {
//             await sleep(1000);

//             const strategy = deployment.strategyId;
//             if (!strategy) continue;

//             const config = strategy.data?.config || {};
//             const entryLockKey = `ENTRY_${deployment._id.toString()}_${currentTime}`;
//             const exitLockKey = `EXIT_${deployment._id.toString()}_${currentTime}`;
//             const squareOffTime = deployment.squareOffTime || config.squareOffTime;

//             // ==============================================================
//             // 🛑 THE SHIELD: STRICT SYMBOL VALIDATION 
//             // ==============================================================
//             const instrumentData = (strategy.data.instruments && strategy.data.instruments.length > 0) ? strategy.data.instruments[0] : {};
//             let rawSymbol = instrumentData.name || config.index || strategy.symbol || strategy.name;
//             if (!rawSymbol) continue;

//             let baseSymbol = "";
//             const upperRawSymbol = String(rawSymbol).toUpperCase();
//             if (upperRawSymbol.includes("BANK")) baseSymbol = "BANKNIFTY";
//             else if (upperRawSymbol.includes("FIN")) baseSymbol = "FINNIFTY";
//             else if (upperRawSymbol.includes("MID")) baseSymbol = "MIDCPNIFTY";
//             else if (upperRawSymbol.includes("NIFTY")) baseSymbol = "NIFTY";
//             else if (upperRawSymbol.includes("SENSEX")) baseSymbol = "SENSEX";
//             else continue; // Invalid symbol skip

//             // ==============================================================
//             // ⚡ 1. ENTRY LOGIC 
//             // ==============================================================
//             if (!executionLocks.has(entryLockKey) && !deployment.tradedSecurityId) {
//                 let shouldEnter = false;
//                 let currentSignalType = "NONE";
//                 const strategyType = strategy.type || "Time Based"; 

//                 // 🟢 A. INDICATOR BASED CHECK (Delegated to Scanner)
//                 if (strategyType === "Indicator Based") {
//                     const broker = await Broker.findById(deployment.brokers[0]);
//                     if (broker && broker.engineOn) {
//                         const signal = await getIndicatorSignal(strategy, broker, baseSymbol);
//                         if (signal.long) { shouldEnter = true; currentSignalType = "LONG"; } 
//                         else if (signal.short) { shouldEnter = true; currentSignalType = "SHORT"; }
//                     }
//                 } 
//                 // ⏰ B. TIME BASED CHECK
//                 else {
//                     if (config.startTime === currentTime) { shouldEnter = true; currentSignalType = "TIME"; }
//                 }

//                 // 🚀 C. EXECUTE ENTRY
//                 if (shouldEnter) {
//                     executionLocks.add(entryLockKey);
//                     const isPrePunchSL = strategy.data?.advanceSettings?.prePunchSL || false;

//                     for (const brokerId of deployment.brokers) {
//                         const broker = await Broker.findById(brokerId);
//                         if (broker && broker.engineOn) {
                            
//                             for (const leg of strategy.data.legs) {
//                                 let tradeAction = (leg.action || "BUY").toUpperCase(); 
//                                 let tradeQty = (leg.quantity || 1) * deployment.multiplier;

//                                 // Option Type Selection
//                                 let optType = leg.optionType === "Call" ? "CE" : "PE"; 
//                                 if (currentSignalType === "LONG") optType = (tradeAction === "BUY") ? "CE" : "PE"; 
//                                 else if (currentSignalType === "SHORT") optType = (tradeAction === "BUY") ? "PE" : "CE"; 

//                                 let currentSpotPrice = await fetchLivePrice(baseSymbol);
//                                 if (!currentSpotPrice) continue;

//                                 // 🎯 STRIKE SELECTION
//                                 const strikeCriteria = leg.strikeCriteria || "ATM pt";
//                                 let instrument = null;

//                                 if (["CP", "CP >=", "CP <=", "Delta"].includes(strikeCriteria)) {
//                                     // Delegated to Scanner
//                                     instrument = await findStrikeByLivePremium(baseSymbol, currentSpotPrice, optType, leg.expiry || "WEEKLY", strikeCriteria, leg.strikeType || "ATM", broker);
//                                 } else {
//                                     instrument = getOptionSecurityId(baseSymbol, currentSpotPrice, strikeCriteria, leg.strikeType || "ATM", optType, leg.expiry || "WEEKLY");
//                                 }
                                
//                                 if (!instrument) continue;

//                                 // 🟢 PAPER TRADE EXECUTION
//                                 if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                                     await sleep(500); 
//                                     const entryPrice = await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id) || currentSpotPrice;
                                    
//                                     deployment.tradedSecurityId = instrument.id;
//                                     deployment.tradedExchange = instrument.exchange;
//                                     deployment.tradedQty = tradeQty;
//                                     deployment.tradeAction = tradeAction;
//                                     deployment.tradedSymbol = instrument.tradingSymbol;
//                                     deployment.entryPrice = entryPrice;

//                                     if (isPrePunchSL && entryPrice > 0 && leg.slValue > 0) {
//                                         deployment.paperSlPrice = tradeAction === "BUY" 
//                                             ? (leg.slType === 'SL%' ? entryPrice - (entryPrice * (Number(leg.slValue)/100)) : entryPrice - Number(leg.slValue))
//                                             : (leg.slType === 'SL%' ? entryPrice + (entryPrice * (Number(leg.slValue)/100)) : entryPrice + Number(leg.slValue));
//                                     }

//                                     await deployment.save();
//                                     await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Paper Entry at ₹${entryPrice}`);
//                                 } 
//                                 // 🔴 LIVE TRADE EXECUTION
//                                 else if (deployment.executionType === 'LIVE') {
//                                     const orderData = { action: tradeAction, quantity: tradeQty, securityId: instrument.id, segment: instrument.exchange };
//                                     const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

//                                     if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
//                                         deployment.tradedSecurityId = instrument.id;
//                                         deployment.tradedExchange = instrument.exchange;
//                                         deployment.tradedQty = tradeQty;
//                                         deployment.tradeAction = tradeAction;
//                                         deployment.tradedSymbol = instrument.tradingSymbol;

//                                         await sleep(1000);
//                                         const entryPrice = await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id);
//                                         deployment.entryPrice = entryPrice || 0;

//                                         if (isPrePunchSL) console.log(`🛡️ [LIVE PRE-PUNCH] SL Placed on Exchange`); // (SL order logic yahan lagayenge)

//                                         await deployment.save();
//                                         await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Live Entry Executed`, orderResponse.data.orderId);
//                                     } else {
//                                         await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'FAILED', orderResponse.data?.remarks || "Order Failed");
//                                     }
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }

//             // ==============================================================
//             // ⏰ 2. TIME-BASED AUTO SQUARE-OFF LOGIC
//             // ==============================================================
//             if (squareOffTime === currentTime && !executionLocks.has(exitLockKey) && deployment.tradedSecurityId) {
//                 executionLocks.add(exitLockKey);
//                 console.log(`⏰ TIME SQUARE-OFF TRIGGERED! Strategy: ${strategy.name}`);

//                 for (const brokerId of deployment.brokers) {
//                     const broker = await Broker.findById(brokerId);
//                     if (broker && broker.engineOn) {
//                         const exitAction = deployment.tradeAction === 'BUY' ? 'SELL' : 'BUY';
                        
//                         // Paper Exit
//                         if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                             const exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId) || 0;
//                             // PnL Logic yahan aayega...
//                         } 
//                         // Live Exit
//                         else if (deployment.executionType === 'LIVE') {
//                             const orderData = { action: exitAction, quantity: deployment.tradedQty, securityId: deployment.tradedSecurityId, segment: deployment.tradedExchange };
//                             await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
//                         }
//                     }
//                 }
//             }

//             // ==============================================================
//             // 💰 3. RISK MANAGEMENT & ADVANCE FEATURES DELEGATION (Workers)
//             // ==============================================================
//             if (deployment.tradedSecurityId && deployment.status === 'ACTIVE') {
                
//                 // MTM Max Profit / Loss Check
//                 await handleMtmSquareOff(deployment, strategy, executionLocks, exitLockKey);

//                 // Trailing SL & Profit Lock Check
//                 const broker = await Broker.findById(deployment.brokers[0]); // Fetching for LTP check
//                 if (broker) {
//                     const liveLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId);
                    
//                     if (liveLtp && liveLtp > 0) {
//                         // Trail Profit
//                         await processTrailingLogic(deployment, strategy, liveLtp, broker);
//                     }
//                 }

//                 // Advance Features Check
//                 if (strategy.data?.advanceSettings?.moveSLToCost) {
//                     await handleMoveSlToCost(strategy);
//                 }
                
//                 // Future Advance Features:
//                 // if (strategy.data?.advanceSettings?.waitAndTrade) await handleWaitAndTrade(deployment, strategy, liveLtp);
//             }
//         }
//     } catch (error) { 
//         console.error("❌ Trading Engine Core Error:", error); 
//     }
// });


// // ==========================================
// // 🌟 MAIN TRADING ENGINE (THE MANAGER) 🌟
// // ==========================================
// const cron = require('node-cron');
// const moment = require('moment-timezone');

// // 📂 Models
// const Deployment = require('../models/Deployment.js');
// const Broker = require('../models/Broker.js');

// // 🛠️ Utilities & APIs 
// const { sleep, getStrikeStep, getOptionSecurityId } = require('../services/instrumentService.js');
// const { placeDhanOrder, fetchLiveLTP } = require('../services/dhanService.js');
// const { fetchLivePrice } = require('./utils/priceFetcher.js');
// const { createAndEmitLog } = require('./utils/logger.js'); 

// // 🔍 Scanners
// const { findStrikeByLivePremium } = require('./scanners/optionChainScanner.js');
// const { getIndicatorSignal } = require('./scanners/indicatorScanner.js');  

// // 🛡️ Risk Management
// const { handleMtmSquareOff } = require('./features/riskManagement/mtmSquareOff.js');
// const { processTrailingLogic } = require('./features/riskManagement/trailingLogic.js');

// // 🚀 ADVANCE FEATURES (The Brahmastras)
// const { handleMoveSlToCost } = require('./features/advanceFeatures/moveSlToCost.js');
// const { handlePrePunchSl } = require('./features/advanceFeatures/prePunchSl.js');
// const { handleExitAllOnSlTgt } = require('./features/advanceFeatures/exitAllOnSlTgt.js');

// // Global execution locks (Double entry se bachne ke liye)
// const executionLocks = new Set();
// let isEngineRunning = false; // 🔥 MASTER LOCK: Overlapping Cron Job ko rokne ke liye

// // ==========================================
// // ⚙️ THE CORE CRON JOB LOOP (Runs every 30s)
// // ==========================================
// cron.schedule('*/30 * * * * *', async () => {
    
//     // 🔥 THE ULTIMATE 805 FIX: Agar purana loop chal raha hai (kyunki usme sleep delays hain), 
//     // to naye 30-second wale trigger ko ignore maro, taaki Dhan API par double attack na ho.
//     if (isEngineRunning) {
//         console.log("⏳ Engine is taking time (Processing active trades), skipping overlapping tick...");
//         return; 
//     }
    
//     isEngineRunning = true; // Lock laga diya

//     try {
//         const currentTime = moment().tz("Asia/Kolkata").format("HH:mm");
//         const activeDeployments = await Deployment.find({ status: 'ACTIVE' }).populate('strategyId');

//         if (activeDeployments.length === 0) return;

//         // Reset locks at midnight
//         if (currentTime === "00:00" && executionLocks.size > 0) executionLocks.clear();

//         for (const deployment of activeDeployments) {
//             await sleep(1000);

//             const strategy = deployment.strategyId;
//             if (!strategy) continue;

//             const config = strategy.data?.config || {};
//             const entryLockKey = `ENTRY_${deployment._id.toString()}_${currentTime}`;
//             const exitLockKey = `EXIT_${deployment._id.toString()}_${currentTime}`;
//             const squareOffTime = deployment.squareOffTime || config.squareOffTime;

//             // ==============================================================
//             // 🛑 THE SHIELD: STRICT SYMBOL VALIDATION 
//             // ==============================================================
//             const instrumentData = (strategy.data.instruments && strategy.data.instruments.length > 0) ? strategy.data.instruments[0] : {};
//             let rawSymbol = instrumentData.name || config.index || strategy.symbol || strategy.name;
//             if (!rawSymbol) continue;

//             let baseSymbol = "";
//             const upperRawSymbol = String(rawSymbol).toUpperCase();
//             if (upperRawSymbol.includes("BANK")) baseSymbol = "BANKNIFTY";
//             else if (upperRawSymbol.includes("FIN")) baseSymbol = "FINNIFTY";
//             else if (upperRawSymbol.includes("MID")) baseSymbol = "MIDCPNIFTY";
//             else if (upperRawSymbol.includes("NIFTY")) baseSymbol = "NIFTY";
//             else if (upperRawSymbol.includes("SENSEX")) baseSymbol = "SENSEX";
//             else continue; // Invalid symbol skip

//             // ==============================================================
//             // ⚡ 1. ENTRY LOGIC 
//             // ==============================================================
//             if (!executionLocks.has(entryLockKey) && !deployment.tradedSecurityId) {
//                 let shouldEnter = false;
//                 let currentSignalType = "NONE";
//                 const strategyType = strategy.type || "Time Based"; 

//                 // 🟢 A. INDICATOR BASED CHECK
//                 if (strategyType === "Indicator Based") {
//                     const broker = await Broker.findById(deployment.brokers[0]);
//                     if (broker && broker.engineOn) {
//                         const signal = await getIndicatorSignal(strategy, broker, baseSymbol);
//                         if (signal.long) { shouldEnter = true; currentSignalType = "LONG"; } 
//                         else if (signal.short) { shouldEnter = true; currentSignalType = "SHORT"; }
//                     }
//                 } 
//                 // ⏰ B. TIME BASED CHECK
//                 else {
//                     if (config.startTime === currentTime) { shouldEnter = true; currentSignalType = "TIME"; }
//                 }

//                 // 🚀 C. EXECUTE ENTRY
//                 if (shouldEnter) {
//                     executionLocks.add(entryLockKey);
//                     const isPrePunchSL = strategy.data?.advanceSettings?.prePunchSL || false;

//                     for (const brokerId of deployment.brokers) {
//                         const broker = await Broker.findById(brokerId);
//                         if (broker && broker.engineOn) {
                            
//                             for (const leg of strategy.data.legs) {
//                                 let tradeAction = (leg.action || "BUY").toUpperCase(); 
//                                 let tradeQty = (leg.quantity || 1) * deployment.multiplier;

//                                 // Option Type Selection
//                                 let optType = leg.optionType === "Call" ? "CE" : "PE"; 
//                                 if (currentSignalType === "LONG") optType = (tradeAction === "BUY") ? "CE" : "PE"; 
//                                 else if (currentSignalType === "SHORT") optType = (tradeAction === "BUY") ? "PE" : "CE"; 

//                                 let currentSpotPrice = await fetchLivePrice(baseSymbol);
//                                 if (!currentSpotPrice) continue;

//                                 // 🎯 STRIKE SELECTION & API REUSE
//                                 const strikeCriteria = leg.strikeCriteria || "ATM pt";
//                                 let instrument = null;
//                                 let preFetchedLtp = null; // 🔥 SMART FIX: Save API Call

//                                 if (["CP", "CP >=", "CP <=", "Delta"].includes(strikeCriteria)) {
//                                     instrument = await findStrikeByLivePremium(baseSymbol, currentSpotPrice, optType, leg.expiry || "WEEKLY", strikeCriteria, leg.strikeType || "ATM", broker);
//                                     if (instrument && instrument.ltp) preFetchedLtp = instrument.ltp;
//                                 } else {
//                                     instrument = getOptionSecurityId(baseSymbol, currentSpotPrice, strikeCriteria, leg.strikeType || "ATM", optType, leg.expiry || "WEEKLY");
//                                 }
                                
//                                 if (!instrument) continue;

//                                 // 🟢 PAPER TRADE EXECUTION
//                                 if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                                     await sleep(500); 
//                                     // 🔥 API REUSE: Agar Scanner ne Premium pehle hi nikal liya hai, to Dhan ko dobara API mat maro!
//                                     const entryPrice = preFetchedLtp || await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id) || currentSpotPrice;
                                    
//                                     deployment.tradedSecurityId = instrument.id;
//                                     deployment.tradedExchange = instrument.exchange;
//                                     deployment.tradedQty = tradeQty;
//                                     deployment.tradeAction = tradeAction;
//                                     deployment.tradedSymbol = instrument.tradingSymbol;
//                                     deployment.entryPrice = entryPrice;

//                                     if (isPrePunchSL && entryPrice > 0 && leg.slValue > 0) {
//                                         deployment.paperSlPrice = tradeAction === "BUY" 
//                                             ? (leg.slType === 'SL%' ? entryPrice - (entryPrice * (Number(leg.slValue)/100)) : entryPrice - Number(leg.slValue))
//                                             : (leg.slType === 'SL%' ? entryPrice + (entryPrice * (Number(leg.slValue)/100)) : entryPrice + Number(leg.slValue));
//                                     }

//                                     await deployment.save();
//                                     await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Paper Entry at ₹${entryPrice}`);
//                                 } 
//                                 // 🔴 LIVE TRADE EXECUTION
//                                 else if (deployment.executionType === 'LIVE') {
//                                     const orderData = { action: tradeAction, quantity: tradeQty, securityId: instrument.id, segment: instrument.exchange };
//                                     const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

//                                     if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
//                                         deployment.tradedSecurityId = instrument.id;
//                                         deployment.tradedExchange = instrument.exchange;
//                                         deployment.tradedQty = tradeQty;
//                                         deployment.tradeAction = tradeAction;
//                                         deployment.tradedSymbol = instrument.tradingSymbol;

//                                         await sleep(2000); // GAP Before checking Status
//                                         const entryPrice = await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id);
//                                         deployment.entryPrice = entryPrice || 0;

//                                         // 🔥 ADVANCE FEATURE 3: PRE-PUNCH SL
//                                         if (isPrePunchSL) {
//                                             console.log(`🛡️ [LIVE PRE-PUNCH] Executing Pre-Punch SL on Exchange...`);
//                                             await handlePrePunchSl(deployment, broker, leg, deployment.entryPrice);
//                                         }

//                                         await deployment.save();
//                                         await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Live Entry Executed`, orderResponse.data.orderId);
//                                     } else {
//                                         await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'FAILED', orderResponse.data?.remarks || "Order Failed");
//                                     }
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }

//             // ==============================================================
//             // ⏰ 2. TIME-BASED AUTO SQUARE-OFF LOGIC
//             // ==============================================================
//             if (squareOffTime === currentTime && !executionLocks.has(exitLockKey) && deployment.tradedSecurityId) {
//                 executionLocks.add(exitLockKey);
//                 console.log(`⏰ TIME SQUARE-OFF TRIGGERED! Strategy: ${strategy.name}`);

//                 for (const brokerId of deployment.brokers) {
//                     const broker = await Broker.findById(brokerId);
//                     if (broker && broker.engineOn) {
//                         const exitAction = deployment.tradeAction === 'BUY' ? 'SELL' : 'BUY';
                        
//                         // Paper Exit (Time Based Square-Off)
//                         if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                             await sleep(500); 
//                             const exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId) || 0;
                            
//                             if (exitLtp > 0 && deployment.entryPrice > 0) {
//                                 // PnL calculate karo
//                                 const finalPnl = deployment.tradeAction === 'BUY' 
//                                     ? (exitLtp - deployment.entryPrice) * deployment.tradedQty 
//                                     : (deployment.entryPrice - exitLtp) * deployment.tradedQty;

//                                 // Database update karo
//                                 deployment.exitPrice = exitLtp;
//                                 deployment.pnl = finalPnl;
//                                 deployment.realizedPnl = finalPnl;
//                                 deployment.status = 'COMPLETED';
//                                 deployment.exitRemarks = "Time Auto Square-Off";
//                                 await deployment.save();

//                                 console.log(`🏁 [PAPER EXIT SUCCESS] Time Square-Off | P&L: ₹${finalPnl.toFixed(2)}`);
//                                 await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'SUCCESS', `Paper Trade Auto-Exit (Time). P&L: ₹${finalPnl.toFixed(2)}`);
//                             }
//                         }
//                         else if (deployment.executionType === 'LIVE') {
//                             const orderData = { action: exitAction, quantity: deployment.tradedQty, securityId: deployment.tradedSecurityId, segment: deployment.tradedExchange };
//                             await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
//                         }
//                     }
//                 }
//             }

//             // ==============================================================
//             // 💰 3. RISK MANAGEMENT & ADVANCE FEATURES DELEGATION (Workers)
//             // ==============================================================
//             if (deployment.tradedSecurityId && deployment.status === 'ACTIVE') {
                
//                 // Risk Management: MTM Max Profit / Loss Check
//                 await handleMtmSquareOff(deployment, strategy, executionLocks, exitLockKey);

//                 // Risk Management: Trailing SL & Profit Lock Check
//                 const broker = await Broker.findById(deployment.brokers[0]); 
//                 if (broker) {
//                     await sleep(2000); // 🔥 805 FIX: Gap before fetching LTP for Trailing
                    
//                     const liveLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId);
                    
//                     if (liveLtp && liveLtp > 0) {
//                         // Trail Profit
//                         await processTrailingLogic(deployment, strategy, liveLtp, broker);

//                         // 🔥 ADVANCE FEATURES 1 & 2: EXIT ALL & MOVE SL TO COST
//                         const checkExitStatus = await Deployment.findById(deployment._id);
//                         if (checkExitStatus && checkExitStatus.status === 'COMPLETED') {
//                             const triggerReason = checkExitStatus.exitRemarks || "Target/SL Hit";

//                             // 🚨 Exit All
//                             if (strategy.data?.advanceSettings?.exitAllOnSlTgt) {
//                                 await handleExitAllOnSlTgt(strategy, checkExitStatus, broker, triggerReason);
//                             }
                            
//                             // 🛡️ Move SL to Cost
//                             if (strategy.data?.advanceSettings?.moveSLToCost) {
//                                 await handleMoveSlToCost(strategy, checkExitStatus, broker);
//                             }
//                         }
//                     }
//                 }
//             }
//         }
//     } catch (error) { 
//         console.error("❌ Trading Engine Core Error:", error); 
//     } finally {
//         isEngineRunning = false; // 🔥 CHABI: Engine ka kaam khatam, lock khol diya naye loop ke liye!
//     }
// });



// // ==========================================
// // 🌟 MAIN TRADING ENGINE (THE MANAGER) 🌟
// // ==========================================
// const cron = require('node-cron');
// const moment = require('moment-timezone');

// // 📂 Models
// const Deployment = require('../models/Deployment.js');
// const Broker = require('../models/Broker.js');

// // 🛠️ Utilities & APIs 
// const { sleep, getStrikeStep, getOptionSecurityId } = require('../services/instrumentService.js');
// const { placeDhanOrder, fetchLiveLTP } = require('../services/dhanService.js');
// const { fetchLivePrice } = require('./utils/priceFetcher.js');
// const { createAndEmitLog } = require('./utils/logger.js'); 

// // 🔍 Scanners
// // 🔥 FIX: Added 'getIndicatorExitSignal' for Indicator Exits
// const { findStrikeByLivePremium } = require('./scanners/optionChainScanner.js');
// const { getIndicatorSignal, getIndicatorExitSignal } = require('./scanners/indicatorScanner.js');  

// // 🛡️ Risk Management
// const { handleMtmSquareOff } = require('./features/riskManagement/mtmSquareOff.js');
// const { processTrailingLogic } = require('./features/riskManagement/trailingLogic.js');

// // 🚀 ADVANCE FEATURES
// const { handleMoveSlToCost } = require('./features/advanceFeatures/moveSlToCost.js');
// const { handlePrePunchSl } = require('./features/advanceFeatures/prePunchSl.js');
// const { handleExitAllOnSlTgt } = require('./features/advanceFeatures/exitAllOnSlTgt.js');
// const { processWaitAndTrade } = require('./features/advanceFeatures/waitAndTrade.js');

// // Global execution locks
// const executionLocks = new Set();
// let isEngineRunning = false; 

// // ==========================================
// // ⚙️ THE CORE CRON JOB LOOP (Runs every 30s)
// // ==========================================
// cron.schedule('*/30 * * * * *', async () => {
    
//     if (isEngineRunning) {
//         console.log("⏳ Engine is taking time, skipping overlapping tick...");
//         return; 
//     }
    
//     isEngineRunning = true; 

//     try {
//         const currentTime = moment().tz("Asia/Kolkata").format("HH:mm");
//         const activeDeployments = await Deployment.find({ status: 'ACTIVE' }).populate('strategyId');

//         if (activeDeployments.length === 0) return;

//         if (currentTime === "00:00" && executionLocks.size > 0) executionLocks.clear();

//         for (const deployment of activeDeployments) {
//             await sleep(1000);

//             const strategy = deployment.strategyId;
//             if (!strategy) continue;

//             const config = strategy.data?.config || {};
//             const entryLockKey = `ENTRY_${deployment._id.toString()}_${currentTime}`;
//             const exitLockKey = `EXIT_${deployment._id.toString()}_${currentTime}`;
//             const squareOffTime = deployment.squareOffTime || config.squareOffTime;

//             // 🛑 THE SHIELD: STRICT SYMBOL VALIDATION 
//             const instrumentData = (strategy.data.instruments && strategy.data.instruments.length > 0) ? strategy.data.instruments[0] : {};
//             let rawSymbol = instrumentData.name || config.index || strategy.symbol || strategy.name;
//             if (!rawSymbol) continue;

//             let baseSymbol = "";
//             const upperRawSymbol = String(rawSymbol).toUpperCase();
//             if (upperRawSymbol.includes("BANK")) baseSymbol = "BANKNIFTY";
//             else if (upperRawSymbol.includes("FIN")) baseSymbol = "FINNIFTY";
//             else if (upperRawSymbol.includes("MID")) baseSymbol = "MIDCPNIFTY";
//             else if (upperRawSymbol.includes("NIFTY")) baseSymbol = "NIFTY";
//             else if (upperRawSymbol.includes("SENSEX")) baseSymbol = "SENSEX";
//             else continue; 

//             // ==============================================================
//             // ⚡ 1. ENTRY LOGIC 
//             // ==============================================================
//             if (!executionLocks.has(entryLockKey) && !deployment.tradedSecurityId) {
//                 let shouldEnter = false;
//                 let currentSignalType = "NONE";
//                 const strategyType = strategy.type || "Time Based"; 

//                 if (strategyType === "Indicator Based") {
//                     const broker = await Broker.findById(deployment.brokers[0]);
//                     if (broker && broker.engineOn) {
//                         const signal = await getIndicatorSignal(strategy, broker, baseSymbol);
//                         if (signal.long) { shouldEnter = true; currentSignalType = "LONG"; } 
//                         else if (signal.short) { shouldEnter = true; currentSignalType = "SHORT"; }
//                     }
//                 } 
//                 else {
//                     if (config.startTime === currentTime) { shouldEnter = true; currentSignalType = "TIME"; }
//                 }

//                 if (shouldEnter) {
//                     executionLocks.add(entryLockKey);
//                     const isPrePunchSL = strategy.data?.advanceSettings?.prePunchSL || false;

//                     for (const brokerId of deployment.brokers) {
//                         const broker = await Broker.findById(brokerId);
//                         if (broker && broker.engineOn) {
                            
//                             for (const leg of strategy.data.legs) {
//                                 let tradeAction = (leg.action || "BUY").toUpperCase(); 
//                                 let tradeQty = (leg.quantity || 1) * deployment.multiplier;

//                                 let optType = leg.optionType === "Call" ? "CE" : "PE"; 
//                                 if (currentSignalType === "LONG") optType = (tradeAction === "BUY") ? "CE" : "PE"; 
//                                 else if (currentSignalType === "SHORT") optType = (tradeAction === "BUY") ? "PE" : "CE"; 

//                                 let currentSpotPrice = await fetchLivePrice(baseSymbol);
//                                 if (!currentSpotPrice) continue;

//                                 const strikeCriteria = leg.strikeCriteria || "ATM pt";
//                                 let instrument = null;
//                                 let preFetchedLtp = null; 

//                                 if (["CP", "CP >=", "CP <=", "Delta"].includes(strikeCriteria)) {
//                                     instrument = await findStrikeByLivePremium(baseSymbol, currentSpotPrice, optType, leg.expiry || "WEEKLY", strikeCriteria, leg.strikeType || "ATM", broker);
//                                     if (instrument && instrument.ltp) preFetchedLtp = instrument.ltp;
//                                 } else {
//                                     instrument = getOptionSecurityId(baseSymbol, currentSpotPrice, strikeCriteria, leg.strikeType || "ATM", optType, leg.expiry || "WEEKLY");
//                                 }
                                
//                                 if (!instrument) continue;


//                                 if (!instrument) continue;

//                                 // 🔥 THE WAIT & TRADE INJECTION 🔥
//                                 await sleep(500); // 805 Rate limit safety
//                                 const currentPremiumLtp = preFetchedLtp || await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id) || currentSpotPrice;

//                                 const isWaitAndTradeActive = strategy.data?.advanceSettings?.waitAndTrade;
//                                 const waitAndTradeConfig = strategy.data?.advanceSettings?.waitAndTradeConfig || {};

//                                 if (isWaitAndTradeActive && waitAndTradeConfig.movement > 0) {
//                                     // 1. Agar Reference Price save nahi hai, to save karo aur Wait karo
//                                     if (!deployment.waitReferencePrice) {
//                                         deployment.waitReferencePrice = currentPremiumLtp; 
//                                         await deployment.save();
                                        
//                                         console.log(`⏳ [WAIT & TRADE] Signal Aaya! Ref Price: ₹${currentPremiumLtp}. Waiting for movement...`);
//                                         await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'INFO', `Wait & Trade Activated. Ref Premium: ₹${currentPremiumLtp}`);
//                                         continue; // 🛑 Trade execute mat karo, agle loop ka intezaar karo
//                                     } 
//                                     // 2. Agar pehle se Wait kar rahe hain, to condition check karo
//                                     else {
//                                         const waitStatus = processWaitAndTrade(waitAndTradeConfig, currentPremiumLtp, deployment.waitReferencePrice);
                                        
//                                         if (!waitStatus.shouldExecute) {
//                                             // Condition abhi meet nahi hui hai
//                                             continue; // 🛑 Chup chaap agle loop me jao
//                                         } else {
//                                             console.log(`🎯 [WAIT & TRADE] Condition Met! Current: ₹${currentPremiumLtp} crossed Target: ₹${waitStatus.targetPrice}.`);
//                                             await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'INFO', `Wait Target (₹${waitStatus.targetPrice}) Hit! Executing Trade...`);
//                                         }
//                                     }
//                                 }

//                                 // 🟢 PAPER TRADE ENTRY
//                                 if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                                     await sleep(500); 
                                    
//                                     // 🔥 THE BUG FIX: "|| currentSpotPrice" hata diya gaya hai!
//                                     let entryPrice = preFetchedLtp || await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id);
                                    
//                                     // Agar API error ki wajah se price nahi mila, to galat price par entry mat lo!
//                                     if (!entryPrice || entryPrice <= 0) {
//                                         console.log(`⚠️ [WARNING] LTP not found for Paper Trade Entry. Skipping tick to prevent wrong P&L.`);
//                                         continue; 
//                                     }
                                    
//                                     deployment.tradedSecurityId = instrument.id;
//                                     deployment.tradedExchange = instrument.exchange;
//                                     deployment.tradedQty = tradeQty;
//                                     deployment.tradeAction = tradeAction;
//                                     deployment.tradedSymbol = instrument.tradingSymbol;
//                                     deployment.entryPrice = entryPrice;

//                                     if (isPrePunchSL && entryPrice > 0 && leg.slValue > 0) {
//                                         deployment.paperSlPrice = tradeAction === "BUY" 
//                                             ? (leg.slType === 'SL%' ? entryPrice - (entryPrice * (Number(leg.slValue)/100)) : entryPrice - Number(leg.slValue))
//                                             : (leg.slType === 'SL%' ? entryPrice + (entryPrice * (Number(leg.slValue)/100)) : entryPrice + Number(leg.slValue));
//                                     }

//                                     await deployment.save();
//                                     await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Paper Entry at ₹${entryPrice}`);
//                                 }

                                
//                                 // 🔴 LIVE TRADE ENTRY
//                                 else if (deployment.executionType === 'LIVE') {
//                                     const orderData = { action: tradeAction, quantity: tradeQty, securityId: instrument.id, segment: instrument.exchange };
//                                     const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

//                                     if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
//                                         deployment.tradedSecurityId = instrument.id;
//                                         deployment.tradedExchange = instrument.exchange;
//                                         deployment.tradedQty = tradeQty;
//                                         deployment.tradeAction = tradeAction;
//                                         deployment.tradedSymbol = instrument.tradingSymbol;
//                                         deployment.signalType = currentSignalType; // 🔥 FIX: Saving Signal Type

//                                         await sleep(2000); 
//                                         const entryPrice = await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id);
//                                         deployment.entryPrice = entryPrice || 0;

//                                         if (isPrePunchSL) {
//                                             await handlePrePunchSl(deployment, broker, leg, deployment.entryPrice);
//                                         }

//                                         await deployment.save();
//                                         await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Live Entry Executed`, orderResponse.data.orderId);
//                                     } else {
//                                         await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'FAILED', orderResponse.data?.remarks || "Order Failed");
//                                     }
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }

//             // ==============================================================
//             // 📉 2.5 INDICATOR BASED EXIT LOGIC (NEW)
//             // ==============================================================
//             if (!executionLocks.has(exitLockKey) && deployment.tradedSecurityId && strategy.type === "Indicator Based") {
//                 const broker = await Broker.findById(deployment.brokers[0]);
//                 if (broker && broker.engineOn) {
//                     // 🔥 Scanner se poochho ki Exit ka signal aaya kya?
//                     const shouldExit = await getIndicatorExitSignal(strategy, broker, baseSymbol, deployment.signalType);
                    
//                     if (shouldExit) {
//                         executionLocks.add(exitLockKey);
//                         console.log(`📉 INDICATOR EXIT TRIGGERED! Strategy: ${strategy.name}`);

//                         const exitAction = deployment.tradeAction === 'BUY' ? 'SELL' : 'BUY';
                        
//                         // 🟢 PAPER EXIT (Indicator)
//                         if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                             await sleep(500); 
//                             const exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId) || 0;
                            
//                             if (exitLtp > 0 && deployment.entryPrice > 0) {
//                                 const finalPnl = deployment.tradeAction === 'BUY' 
//                                     ? (exitLtp - deployment.entryPrice) * deployment.tradedQty 
//                                     : (deployment.entryPrice - exitLtp) * deployment.tradedQty;

//                                 deployment.exitPrice = exitLtp;
//                                 deployment.pnl = finalPnl;
//                                 deployment.realizedPnl = finalPnl;
//                                 deployment.status = 'COMPLETED';
//                                 deployment.exitRemarks = "Indicator Exit condition met";
//                                 await deployment.save();

//                                 await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'SUCCESS', `Paper Auto-Exit (Indicator). P&L: ₹${finalPnl.toFixed(2)}`);
                                
//                                 // Trigger Advance Features (Exit All)
//                                 if (strategy.data?.advanceSettings?.exitAllOnSlTgt) {
//                                     await handleExitAllOnSlTgt(strategy, deployment, broker, "Indicator Exit");
//                                 }
//                             }
//                         } 
//                         // 🔴 LIVE EXIT (Indicator)
//                         else if (deployment.executionType === 'LIVE') {
//                             const orderData = { action: exitAction, quantity: deployment.tradedQty, securityId: deployment.tradedSecurityId, segment: deployment.tradedExchange };
//                             const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                            
//                             if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
//                                 await sleep(2000); 
//                                 const exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId) || 0;
                                
//                                 const finalPnl = deployment.tradeAction === 'BUY' 
//                                     ? (exitLtp - deployment.entryPrice) * deployment.tradedQty 
//                                     : (deployment.entryPrice - exitLtp) * deployment.tradedQty;

//                                 deployment.exitPrice = exitLtp;
//                                 deployment.pnl = finalPnl;
//                                 deployment.realizedPnl = finalPnl;
//                                 deployment.status = 'COMPLETED';
//                                 deployment.exitRemarks = "Indicator Exit condition met";
//                                 await deployment.save();

//                                 await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'SUCCESS', `Live Auto-Exit (Indicator). P&L: ₹${finalPnl.toFixed(2)}`, orderResponse.data.orderId);

//                                 // Trigger Advance Features (Exit All)
//                                 if (strategy.data?.advanceSettings?.exitAllOnSlTgt) {
//                                     await handleExitAllOnSlTgt(strategy, deployment, broker, "Indicator Exit");
//                                 }
//                             } else {
//                                 await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'FAILED', `Indicator Exit Failed: ${orderResponse.data?.remarks || "RMS Rejected"}`);
//                                 executionLocks.delete(exitLockKey);
//                             }
//                         }
//                     }
//                 }
//             }


//             // ==============================================================
//             // ⏰ 3. TIME-BASED AUTO SQUARE-OFF LOGIC
//             // ==============================================================
//             if (squareOffTime === currentTime && !executionLocks.has(exitLockKey) && deployment.tradedSecurityId) {
//                 executionLocks.add(exitLockKey);
//                 console.log(`⏰ TIME SQUARE-OFF TRIGGERED! Strategy: ${strategy.name}`);

//                 for (const brokerId of deployment.brokers) {
//                     const broker = await Broker.findById(brokerId);
//                     if (broker && broker.engineOn) {
//                         const exitAction = deployment.tradeAction === 'BUY' ? 'SELL' : 'BUY';
                        
//                         if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                             await sleep(500); 
//                             const exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId) || 0;
                            
//                             if (exitLtp > 0 && deployment.entryPrice > 0) {
//                                 const finalPnl = deployment.tradeAction === 'BUY' 
//                                     ? (exitLtp - deployment.entryPrice) * deployment.tradedQty 
//                                     : (deployment.entryPrice - exitLtp) * deployment.tradedQty;

//                                 deployment.exitPrice = exitLtp;
//                                 deployment.pnl = finalPnl;
//                                 deployment.realizedPnl = finalPnl;
//                                 deployment.status = 'COMPLETED';
//                                 deployment.exitRemarks = "Time Auto Square-Off";
//                                 await deployment.save();

//                                 await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'SUCCESS', `Paper Trade Auto-Exit (Time). P&L: ₹${finalPnl.toFixed(2)}`);
//                             }
//                         } 
//                         else if (deployment.executionType === 'LIVE') {
//                             const orderData = { action: exitAction, quantity: deployment.tradedQty, securityId: deployment.tradedSecurityId, segment: deployment.tradedExchange };
//                             await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
//                         }
//                     }
//                 }
//             }

//             // ==============================================================
//             // 💰 4. RISK MANAGEMENT & ADVANCE FEATURES DELEGATION 
//             // ==============================================================
//             if (deployment.tradedSecurityId && deployment.status === 'ACTIVE') {
                
//                 await handleMtmSquareOff(deployment, strategy, executionLocks, exitLockKey);

//                 const broker = await Broker.findById(deployment.brokers[0]); 
//                 if (broker) {
//                     await sleep(2000); 
                    
//                     const liveLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId);
                    
//                     if (liveLtp && liveLtp > 0) {
//                         await processTrailingLogic(deployment, strategy, liveLtp, broker);

//                         const checkExitStatus = await Deployment.findById(deployment._id);
//                         if (checkExitStatus && checkExitStatus.status === 'COMPLETED') {
//                             const triggerReason = checkExitStatus.exitRemarks || "Target/SL Hit";

//                             if (strategy.data?.advanceSettings?.exitAllOnSlTgt) {
//                                 await handleExitAllOnSlTgt(strategy, checkExitStatus, broker, triggerReason);
//                             }
                            
//                             if (strategy.data?.advanceSettings?.moveSLToCost) {
//                                 await handleMoveSlToCost(strategy, checkExitStatus, broker);
//                             }
//                         }
//                     }
//                 }
//             }
//         }
//     } catch (error) { 
//         console.error("❌ Trading Engine Core Error:", error); 
//     } finally {
//         isEngineRunning = false; 
//     }
// });




// // ==========================================
// // 🌟 MAIN TRADING ENGINE (THE MANAGER) 🌟
// // ==========================================
// const cron = require('node-cron');
// const moment = require('moment-timezone');

// // 📂 Models
// const Deployment = require('../models/Deployment.js');
// const Broker = require('../models/Broker.js');

// // 🛠️ Utilities & APIs 
// const { sleep, getStrikeStep, getOptionSecurityId } = require('../services/instrumentService.js');
// const { placeDhanOrder, fetchLiveLTP } = require('../services/dhanService.js');
// const { fetchLivePrice } = require('./utils/priceFetcher.js');
// const { createAndEmitLog } = require('./utils/logger.js'); 

// // 🔍 Scanners
// // 🔥 FIX: Added 'getIndicatorExitSignal' for Indicator Exits
// const { findStrikeByLivePremium } = require('./scanners/optionChainScanner.js');
// const { getIndicatorSignal, getIndicatorExitSignal } = require('./scanners/indicatorScanner.js');  

// // 🛡️ Risk Management
// const { handleMtmSquareOff } = require('./features/riskManagement/mtmSquareOff.js');
// const { processTrailingLogic } = require('./features/riskManagement/trailingLogic.js');

// // 🚀 ADVANCE FEATURES
// const { handleMoveSlToCost } = require('./features/advanceFeatures/moveSlToCost.js');
// const { handlePrePunchSl } = require('./features/advanceFeatures/prePunchSl.js');
// const { handleExitAllOnSlTgt } = require('./features/advanceFeatures/exitAllOnSlTgt.js');
// const { processWaitAndTrade } = require('./features/advanceFeatures/waitAndTrade.js');

// // Global execution locks
// const executionLocks = new Set();
// let isEngineRunning = false; 

// // ==========================================
// // ⚙️ THE CORE CRON JOB LOOP (Runs every 30s)
// // ==========================================
// cron.schedule('*/30 * * * * *', async () => {
    
//     if (isEngineRunning) {
//         console.log("⏳ Engine is taking time, skipping overlapping tick...");
//         return; 
//     }
    
//     isEngineRunning = true; 

//     try {
//         const currentTime = moment().tz("Asia/Kolkata").format("HH:mm");
//         const activeDeployments = await Deployment.find({ status: 'ACTIVE' }).populate('strategyId');

//         if (activeDeployments.length === 0) return;

//         if (currentTime === "00:00" && executionLocks.size > 0) executionLocks.clear();

//         for (const deployment of activeDeployments) {
//             await sleep(1000);

//             const strategy = deployment.strategyId;
//             if (!strategy) continue;

//             const config = strategy.data?.config || {};
//             const entryLockKey = `ENTRY_${deployment._id.toString()}_${currentTime}`;
//             const exitLockKey = `EXIT_${deployment._id.toString()}_${currentTime}`;
//             const squareOffTime = deployment.squareOffTime || config.squareOffTime;

//             // 🛑 THE SHIELD: STRICT SYMBOL VALIDATION 
//             const instrumentData = (strategy.data.instruments && strategy.data.instruments.length > 0) ? strategy.data.instruments[0] : {};
//             let rawSymbol = instrumentData.name || config.index || strategy.symbol || strategy.name;
//             if (!rawSymbol) continue;

//             let baseSymbol = "";
//             const upperRawSymbol = String(rawSymbol).toUpperCase();
//             if (upperRawSymbol.includes("BANK")) baseSymbol = "BANKNIFTY";
//             else if (upperRawSymbol.includes("FIN")) baseSymbol = "FINNIFTY";
//             else if (upperRawSymbol.includes("MID")) baseSymbol = "MIDCPNIFTY";
//             else if (upperRawSymbol.includes("NIFTY")) baseSymbol = "NIFTY";
//             else if (upperRawSymbol.includes("SENSEX")) baseSymbol = "SENSEX";
//             else continue; 

//             // ==============================================================
//             // ⚡ 1. ENTRY LOGIC 
//             // ==============================================================
//             if (!executionLocks.has(entryLockKey) && !deployment.tradedSecurityId) {
//                 let shouldEnter = false;
//                 let currentSignalType = "NONE";
//                 const strategyType = strategy.type || "Time Based"; 

//                 if (strategyType === "Indicator Based") {
//                     const broker = await Broker.findById(deployment.brokers[0]);
//                     if (broker && broker.engineOn) {
//                         const signal = await getIndicatorSignal(strategy, broker, baseSymbol);
//                         if (signal.long) { shouldEnter = true; currentSignalType = "LONG"; } 
//                         else if (signal.short) { shouldEnter = true; currentSignalType = "SHORT"; }
//                     }
//                 } 
//                 else {
//                     if (config.startTime === currentTime) { shouldEnter = true; currentSignalType = "TIME"; }
//                 }

//                 if (shouldEnter) {
//                     executionLocks.add(entryLockKey);
//                     const isPrePunchSL = strategy.data?.advanceSettings?.prePunchSL || false;

//                     for (const brokerId of deployment.brokers) {
//                         const broker = await Broker.findById(brokerId);
//                         if (broker && broker.engineOn) {
                            
//                             for (const leg of strategy.data.legs) {
//                                 let tradeAction = (leg.action || "BUY").toUpperCase(); 
//                                 let tradeQty = (leg.quantity || 1) * deployment.multiplier;

//                                 let optType = leg.optionType === "Call" ? "CE" : "PE"; 
//                                 if (currentSignalType === "LONG") optType = (tradeAction === "BUY") ? "CE" : "PE"; 
//                                 else if (currentSignalType === "SHORT") optType = (tradeAction === "BUY") ? "PE" : "CE"; 

//                                 let currentSpotPrice = await fetchLivePrice(baseSymbol);
//                                 if (!currentSpotPrice) continue;

//                                 const strikeCriteria = leg.strikeCriteria || "ATM pt";
//                                 let instrument = null;
//                                 let preFetchedLtp = null; 

//                                 if (["CP", "CP >=", "CP <=", "Delta"].includes(strikeCriteria)) {
//                                     instrument = await findStrikeByLivePremium(baseSymbol, currentSpotPrice, optType, leg.expiry || "WEEKLY", strikeCriteria, leg.strikeType || "ATM", broker);
//                                     if (instrument && instrument.ltp) preFetchedLtp = instrument.ltp;
//                                 } else {
//                                     instrument = getOptionSecurityId(baseSymbol, currentSpotPrice, strikeCriteria, leg.strikeType || "ATM", optType, leg.expiry || "WEEKLY");
//                                 }
                                
//                                 if (!instrument) continue;


//                                 if (!instrument) continue;

//                                 // 🔥 THE WAIT & TRADE INJECTION 🔥
//                                 await sleep(500); // 805 Rate limit safety
//                                 const currentPremiumLtp = preFetchedLtp || await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id) || currentSpotPrice;

//                                 const isWaitAndTradeActive = strategy.data?.advanceSettings?.waitAndTrade;
//                                 const waitAndTradeConfig = strategy.data?.advanceSettings?.waitAndTradeConfig || {};

//                                 if (isWaitAndTradeActive && waitAndTradeConfig.movement > 0) {
//                                     // 1. Agar Reference Price save nahi hai, to save karo aur Wait karo
//                                     if (!deployment.waitReferencePrice) {
//                                         deployment.waitReferencePrice = currentPremiumLtp; 
//                                         await deployment.save();
                                        
//                                         console.log(`⏳ [WAIT & TRADE] Signal Aaya! Ref Price: ₹${currentPremiumLtp}. Waiting for movement...`);
//                                         await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'INFO', `Wait & Trade Activated. Ref Premium: ₹${currentPremiumLtp}`);
//                                         continue; // 🛑 Trade execute mat karo, agle loop ka intezaar karo
//                                     } 
//                                     // 2. Agar pehle se Wait kar rahe hain, to condition check karo
//                                     else {
//                                         const waitStatus = processWaitAndTrade(waitAndTradeConfig, currentPremiumLtp, deployment.waitReferencePrice);
                                        
//                                         if (!waitStatus.shouldExecute) {
//                                             // Condition abhi meet nahi hui hai
//                                             continue; // 🛑 Chup chaap agle loop me jao
//                                         } else {
//                                             console.log(`🎯 [WAIT & TRADE] Condition Met! Current: ₹${currentPremiumLtp} crossed Target: ₹${waitStatus.targetPrice}.`);
//                                             await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'INFO', `Wait Target (₹${waitStatus.targetPrice}) Hit! Executing Trade...`);
//                                         }
//                                     }
//                                 }

//                                 // 🟢 PAPER TRADE ENTRY
//                                 if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                                     await sleep(500); 
                                    
//                                     // 🔥 THE BUG FIX: "|| currentSpotPrice" hata diya gaya hai!
//                                     let entryPrice = preFetchedLtp || await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id);
                                    
//                                     // Agar API error ki wajah se price nahi mila, to galat price par entry mat lo!
//                                     if (!entryPrice || entryPrice <= 0) {
//                                         console.log(`⚠️ [WARNING] LTP not found for Paper Trade Entry. Skipping tick to prevent wrong P&L.`);
//                                         continue; 
//                                     }
                                    
//                                     deployment.tradedSecurityId = instrument.id;
//                                     deployment.tradedExchange = instrument.exchange;
//                                     deployment.tradedQty = tradeQty;
//                                     deployment.tradeAction = tradeAction;
//                                     deployment.tradedSymbol = instrument.tradingSymbol;
//                                     deployment.entryPrice = entryPrice;

//                                     if (isPrePunchSL && entryPrice > 0 && leg.slValue > 0) {
//                                         deployment.paperSlPrice = tradeAction === "BUY" 
//                                             ? (leg.slType === 'SL%' ? entryPrice - (entryPrice * (Number(leg.slValue)/100)) : entryPrice - Number(leg.slValue))
//                                             : (leg.slType === 'SL%' ? entryPrice + (entryPrice * (Number(leg.slValue)/100)) : entryPrice + Number(leg.slValue));
//                                     }

//                                     await deployment.save();
//                                     await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Paper Entry at ₹${entryPrice}`);
//                                 }

                                
//                                 // 🔴 LIVE TRADE ENTRY
//                                 else if (deployment.executionType === 'LIVE') {
//                                     const orderData = { action: tradeAction, quantity: tradeQty, securityId: instrument.id, segment: instrument.exchange };
//                                     const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

//                                     if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
//                                         deployment.tradedSecurityId = instrument.id;
//                                         deployment.tradedExchange = instrument.exchange;
//                                         deployment.tradedQty = tradeQty;
//                                         deployment.tradeAction = tradeAction;
//                                         deployment.tradedSymbol = instrument.tradingSymbol;
//                                         deployment.signalType = currentSignalType; // 🔥 FIX: Saving Signal Type

//                                         await sleep(2000); 
//                                         const entryPrice = await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id);
//                                         deployment.entryPrice = entryPrice || 0;

//                                         if (isPrePunchSL) {
//                                             await handlePrePunchSl(deployment, broker, leg, deployment.entryPrice);
//                                         }

//                                         await deployment.save();
//                                         await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Live Entry Executed`, orderResponse.data.orderId);
//                                     } else {
//                                         await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'FAILED', orderResponse.data?.remarks || "Order Failed");
//                                     }
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }

//             // ==============================================================
//             // 📉 2.5 INDICATOR BASED EXIT LOGIC (NEW)
//             // ==============================================================
//             if (!executionLocks.has(exitLockKey) && deployment.tradedSecurityId && strategy.type === "Indicator Based") {
//                 const broker = await Broker.findById(deployment.brokers[0]);
//                 if (broker && broker.engineOn) {
//                     // 🔥 Scanner se poochho ki Exit ka signal aaya kya?
//                     const shouldExit = await getIndicatorExitSignal(strategy, broker, baseSymbol, deployment.signalType);
                    
//                     if (shouldExit) {
//                         executionLocks.add(exitLockKey);
//                         console.log(`📉 INDICATOR EXIT TRIGGERED! Strategy: ${strategy.name}`);

//                         const exitAction = deployment.tradeAction === 'BUY' ? 'SELL' : 'BUY';
                        
//                         // 🟢 PAPER EXIT (Indicator)
//                         if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                             await sleep(500); 
//                             const exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId) || 0;
                            
//                             if (exitLtp > 0 && deployment.entryPrice > 0) {
//                                 const finalPnl = deployment.tradeAction === 'BUY' 
//                                     ? (exitLtp - deployment.entryPrice) * deployment.tradedQty 
//                                     : (deployment.entryPrice - exitLtp) * deployment.tradedQty;

//                                 deployment.exitPrice = exitLtp;
//                                 deployment.pnl = finalPnl;
//                                 deployment.realizedPnl = finalPnl;
//                                 deployment.status = 'COMPLETED';
//                                 deployment.exitRemarks = "Indicator Exit condition met";
//                                 await deployment.save();

//                                 await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'SUCCESS', `Paper Auto-Exit (Indicator). P&L: ₹${finalPnl.toFixed(2)}`);
                                
//                                 // Trigger Advance Features (Exit All)
//                                 if (strategy.data?.advanceSettings?.exitAllOnSlTgt) {
//                                     await handleExitAllOnSlTgt(strategy, deployment, broker, "Indicator Exit");
//                                 }
//                             }
//                         } 
//                         // 🔴 LIVE EXIT (Indicator)
//                         else if (deployment.executionType === 'LIVE') {
//                             const orderData = { action: exitAction, quantity: deployment.tradedQty, securityId: deployment.tradedSecurityId, segment: deployment.tradedExchange };
//                             const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                            
//                             if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
//                                 await sleep(2000); 
//                                 const exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId) || 0;
                                
//                                 const finalPnl = deployment.tradeAction === 'BUY' 
//                                     ? (exitLtp - deployment.entryPrice) * deployment.tradedQty 
//                                     : (deployment.entryPrice - exitLtp) * deployment.tradedQty;

//                                 deployment.exitPrice = exitLtp;
//                                 deployment.pnl = finalPnl;
//                                 deployment.realizedPnl = finalPnl;
//                                 deployment.status = 'COMPLETED';
//                                 deployment.exitRemarks = "Indicator Exit condition met";
//                                 await deployment.save();

//                                 await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'SUCCESS', `Live Auto-Exit (Indicator). P&L: ₹${finalPnl.toFixed(2)}`, orderResponse.data.orderId);

//                                 // Trigger Advance Features (Exit All)
//                                 if (strategy.data?.advanceSettings?.exitAllOnSlTgt) {
//                                     await handleExitAllOnSlTgt(strategy, deployment, broker, "Indicator Exit");
//                                 }
//                             } else {
//                                 await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'FAILED', `Indicator Exit Failed: ${orderResponse.data?.remarks || "RMS Rejected"}`);
//                                 executionLocks.delete(exitLockKey);
//                             }
//                         }
//                     }
//                 }
//             }


//             // ==============================================================
//             // ⏰ 3. TIME-BASED AUTO SQUARE-OFF LOGIC (BULLETPROOF FIXED)
//             // ==============================================================
//             if (squareOffTime && deployment.tradedSecurityId && !executionLocks.has(exitLockKey)) {
                
//                 // Convert both times to pure minutes for safe >= comparison
//                 const [currH, currM] = currentTime.split(':').map(Number);
//                 const currentMinutes = (currH * 60) + currM;

//                 const [sqH, sqM] = squareOffTime.split(':').map(Number);
//                 const squareOffMinutes = (sqH * 60) + sqM;

//                 // Agar current time square-off time ke barabar ya usse zayada hai
//                 if (currentMinutes >= squareOffMinutes) {
//                     executionLocks.add(exitLockKey);
//                     console.log(`⏰ TIME SQUARE-OFF TRIGGERED! Strategy: ${strategy.name} at ${currentTime} (Target was ${squareOffTime})`);

//                     for (const brokerId of deployment.brokers) {
//                         const broker = await Broker.findById(brokerId);
//                         if (broker && broker.engineOn) {
//                             const exitAction = deployment.tradeAction === 'BUY' ? 'SELL' : 'BUY';
                            
//                             if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                                 await sleep(500); 
//                                 const exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId) || 0;
                                
//                                 if (exitLtp > 0 && deployment.entryPrice > 0) {
//                                     const finalPnl = deployment.tradeAction === 'BUY' 
//                                         ? (exitLtp - deployment.entryPrice) * deployment.tradedQty 
//                                         : (deployment.entryPrice - exitLtp) * deployment.tradedQty;

//                                     deployment.exitPrice = exitLtp;
//                                     deployment.pnl = finalPnl;
//                                     deployment.realizedPnl = finalPnl;
//                                     deployment.status = 'COMPLETED';
//                                     deployment.exitRemarks = "Time Auto Square-Off";
//                                     await deployment.save();

//                                     await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'SUCCESS', `Paper Trade Auto-Exit (Time). P&L: ₹${finalPnl.toFixed(2)}`);
//                                 }
//                             } 
//                             else if (deployment.executionType === 'LIVE') {
//                                 const orderData = { action: exitAction, quantity: deployment.tradedQty, securityId: deployment.tradedSecurityId, segment: deployment.tradedExchange };
//                                 const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                                
//                                 if (orderResponse.success) {
//                                     // Live db save & log is handled by Webhook, but we can add a basic log here
//                                     await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'INFO', `Live Time Auto Square-Off order placed.`);
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }


            

//             // ==============================================================
//             // 💰 4. RISK MANAGEMENT & ADVANCE FEATURES DELEGATION 
//             // ==============================================================
//             if (deployment.tradedSecurityId && deployment.status === 'ACTIVE') {
                
//                 await handleMtmSquareOff(deployment, strategy, executionLocks, exitLockKey);

//                 const broker = await Broker.findById(deployment.brokers[0]); 
//                 if (broker) {
//                     await sleep(2000); 
                    
//                     const liveLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId);
                    
//                     if (liveLtp && liveLtp > 0) {
//                         await processTrailingLogic(deployment, strategy, liveLtp, broker);

//                         const checkExitStatus = await Deployment.findById(deployment._id);
//                         if (checkExitStatus && checkExitStatus.status === 'COMPLETED') {
//                             const triggerReason = checkExitStatus.exitRemarks || "Target/SL Hit";

//                             if (strategy.data?.advanceSettings?.exitAllOnSlTgt) {
//                                 await handleExitAllOnSlTgt(strategy, checkExitStatus, broker, triggerReason);
//                             }
                            
//                             if (strategy.data?.advanceSettings?.moveSLToCost) {
//                                 await handleMoveSlToCost(strategy, checkExitStatus, broker);
//                             }
//                         }
//                     }
//                 }
//             }
//         }
//     } catch (error) { 
//         console.error("❌ Trading Engine Core Error:", error); 
//     } finally {
//         isEngineRunning = false; 
//     }
// });




// // ==========================================
// // 🌟 MAIN TRADING ENGINE (THE MANAGER) 🌟
// // ==========================================
// const cron = require('node-cron');
// const moment = require('moment-timezone');

// // 📂 Models
// const Deployment = require('../models/Deployment.js');
// const Broker = require('../models/Broker.js');

// // 🛠️ Utilities & APIs 
// const { sleep, getStrikeStep, getOptionSecurityId } = require('../services/instrumentService.js');
// const { placeDhanOrder, fetchLiveLTP } = require('../services/dhanService.js');
// const { fetchLivePrice } = require('./utils/priceFetcher.js');
// const { createAndEmitLog } = require('./utils/logger.js'); 

// // 🔍 Scanners
// // 🔥 FIX: Added 'getIndicatorExitSignal' for Indicator Exits
// const { findStrikeByLivePremium } = require('./scanners/optionChainScanner.js');
// const { getIndicatorSignal, getIndicatorExitSignal } = require('./scanners/indicatorScanner.js');  

// // 🛡️ Risk Management
// const { handleMtmSquareOff } = require('./features/riskManagement/mtmSquareOff.js');
// const { processTrailingLogic } = require('./features/riskManagement/trailingLogic.js');

// // 🚀 ADVANCE FEATURES
// const { handleMoveSlToCost } = require('./features/advanceFeatures/moveSlToCost.js');
// const { handlePrePunchSl } = require('./features/advanceFeatures/prePunchSl.js');
// const { handleExitAllOnSlTgt } = require('./features/advanceFeatures/exitAllOnSlTgt.js');
// const { processWaitAndTrade } = require('./features/advanceFeatures/waitAndTrade.js');

// // Global execution locks
// const executionLocks = new Set();
// let isEngineRunning = false; 

// // ==========================================
// // ⚙️ THE CORE CRON JOB LOOP (Runs every 30s)
// // ==========================================
// cron.schedule('*/30 * * * * *', async () => {
    
//     if (isEngineRunning) {
//         console.log("⏳ Engine is taking time, skipping overlapping tick...");
//         return; 
//     }
    
//     isEngineRunning = true; 

//     try {
//         const currentTime = moment().tz("Asia/Kolkata").format("HH:mm");
//         const activeDeployments = await Deployment.find({ status: 'ACTIVE' }).populate('strategyId');

//         if (activeDeployments.length === 0) return;

//         if (currentTime === "00:00" && executionLocks.size > 0) executionLocks.clear();

//         for (const deployment of activeDeployments) {
//             await sleep(1000);

//             const strategy = deployment.strategyId;
//             if (!strategy) continue;

//             const config = strategy.data?.config || {};
//             const entryLockKey = `ENTRY_${deployment._id.toString()}_${currentTime}`;
//             const exitLockKey = `EXIT_${deployment._id.toString()}_${currentTime}`;
//             const squareOffTime = deployment.squareOffTime || config.squareOffTime;

//             // 🛑 THE SHIELD: STRICT SYMBOL VALIDATION 
//             const instrumentData = (strategy.data.instruments && strategy.data.instruments.length > 0) ? strategy.data.instruments[0] : {};
//             let rawSymbol = instrumentData.name || config.index || strategy.symbol || strategy.name;
//             if (!rawSymbol) continue;

//             let baseSymbol = "";
//             const upperRawSymbol = String(rawSymbol).toUpperCase();
//             if (upperRawSymbol.includes("BANK")) baseSymbol = "BANKNIFTY";
//             else if (upperRawSymbol.includes("FIN")) baseSymbol = "FINNIFTY";
//             else if (upperRawSymbol.includes("MID")) baseSymbol = "MIDCPNIFTY";
//             else if (upperRawSymbol.includes("NIFTY")) baseSymbol = "NIFTY";
//             else if (upperRawSymbol.includes("SENSEX")) baseSymbol = "SENSEX";
//             else continue; 

//             // ==============================================================
//             // ⚡ 1. ENTRY LOGIC 
//             // ==============================================================
//             if (!executionLocks.has(entryLockKey) && !deployment.tradedSecurityId) {
//                 let shouldEnter = false;
//                 let currentSignalType = "NONE";
//                 const strategyType = strategy.type || "Time Based"; 

//                 if (strategyType === "Indicator Based") {
//                     const broker = await Broker.findById(deployment.brokers[0]);
//                     if (broker && broker.engineOn) {
//                         const signal = await getIndicatorSignal(strategy, broker, baseSymbol);
//                         if (signal.long) { shouldEnter = true; currentSignalType = "LONG"; } 
//                         else if (signal.short) { shouldEnter = true; currentSignalType = "SHORT"; }
//                     }
//                 } 
//                 else {
//                     if (config.startTime === currentTime) { shouldEnter = true; currentSignalType = "TIME"; }
//                 }

//                 if (shouldEnter) {
//                     executionLocks.add(entryLockKey);
//                     const isPrePunchSL = strategy.data?.advanceSettings?.prePunchSL || false;

//                     for (const brokerId of deployment.brokers) {
//                         const broker = await Broker.findById(brokerId);
//                         if (broker && broker.engineOn) {
                            
//                             for (const leg of strategy.data.legs) {
//                                 let tradeAction = (leg.action || "BUY").toUpperCase(); 
//                                 let tradeQty = (leg.quantity || 1) * deployment.multiplier;

//                                 let optType = leg.optionType === "Call" ? "CE" : "PE"; 
//                                 if (currentSignalType === "LONG") optType = (tradeAction === "BUY") ? "CE" : "PE"; 
//                                 else if (currentSignalType === "SHORT") optType = (tradeAction === "BUY") ? "PE" : "CE"; 

//                                 let currentSpotPrice = await fetchLivePrice(baseSymbol);
//                                 if (!currentSpotPrice) continue;

//                                 const strikeCriteria = leg.strikeCriteria || "ATM pt";
//                                 let instrument = null;
//                                 let preFetchedLtp = null; 

//                                 if (["CP", "CP >=", "CP <=", "Delta"].includes(strikeCriteria)) {
//                                     instrument = await findStrikeByLivePremium(baseSymbol, currentSpotPrice, optType, leg.expiry || "WEEKLY", strikeCriteria, leg.strikeType || "ATM", broker);
//                                     if (instrument && instrument.ltp) preFetchedLtp = instrument.ltp;
//                                 } else {
//                                     instrument = getOptionSecurityId(baseSymbol, currentSpotPrice, strikeCriteria, leg.strikeType || "ATM", optType, leg.expiry || "WEEKLY");
//                                 }
                                
//                                 if (!instrument) continue;


//                                 if (!instrument) continue;

//                                 // 🔥 THE WAIT & TRADE INJECTION 🔥
//                                 await sleep(500); // 805 Rate limit safety
//                                 const currentPremiumLtp = preFetchedLtp || await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id) || currentSpotPrice;

//                                 const isWaitAndTradeActive = strategy.data?.advanceSettings?.waitAndTrade;
//                                 const waitAndTradeConfig = strategy.data?.advanceSettings?.waitAndTradeConfig || {};

//                                 if (isWaitAndTradeActive && waitAndTradeConfig.movement > 0) {
//                                     // 1. Agar Reference Price save nahi hai, to save karo aur Wait karo
//                                     if (!deployment.waitReferencePrice) {
//                                         deployment.waitReferencePrice = currentPremiumLtp; 
//                                         await deployment.save();
                                        
//                                         console.log(`⏳ [WAIT & TRADE] Signal Aaya! Ref Price: ₹${currentPremiumLtp}. Waiting for movement...`);
//                                         await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'INFO', `Wait & Trade Activated. Ref Premium: ₹${currentPremiumLtp}`);
//                                         continue; // 🛑 Trade execute mat karo, agle loop ka intezaar karo
//                                     } 
//                                     // 2. Agar pehle se Wait kar rahe hain, to condition check karo
//                                     else {
//                                         const waitStatus = processWaitAndTrade(waitAndTradeConfig, currentPremiumLtp, deployment.waitReferencePrice);
                                        
//                                         if (!waitStatus.shouldExecute) {
//                                             // Condition abhi meet nahi hui hai
//                                             continue; // 🛑 Chup chaap agle loop me jao
//                                         } else {
//                                             console.log(`🎯 [WAIT & TRADE] Condition Met! Current: ₹${currentPremiumLtp} crossed Target: ₹${waitStatus.targetPrice}.`);
//                                             await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'INFO', `Wait Target (₹${waitStatus.targetPrice}) Hit! Executing Trade...`);
//                                         }
//                                     }
//                                 }

//                                 // 🟢 PAPER TRADE ENTRY
//                                 if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                                     await sleep(500); 
                                    
//                                     // 🔥 THE BUG FIX: "|| currentSpotPrice" hata diya gaya hai!
//                                     let entryPrice = preFetchedLtp || await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id);
                                    
//                                     // Agar API error ki wajah se price nahi mila, to galat price par entry mat lo!
//                                     if (!entryPrice || entryPrice <= 0) {
//                                         console.log(`⚠️ [WARNING] LTP not found for Paper Trade Entry. Skipping tick to prevent wrong P&L.`);
//                                         continue; 
//                                     }
                                    
//                                     deployment.tradedSecurityId = instrument.id;
//                                     deployment.tradedExchange = instrument.exchange;
//                                     deployment.tradedQty = tradeQty;
//                                     deployment.tradeAction = tradeAction;
//                                     deployment.tradedSymbol = instrument.tradingSymbol;
//                                     deployment.entryPrice = entryPrice;

//                                     if (isPrePunchSL && entryPrice > 0 && leg.slValue > 0) {
//                                         deployment.paperSlPrice = tradeAction === "BUY" 
//                                             ? (leg.slType === 'SL%' ? entryPrice - (entryPrice * (Number(leg.slValue)/100)) : entryPrice - Number(leg.slValue))
//                                             : (leg.slType === 'SL%' ? entryPrice + (entryPrice * (Number(leg.slValue)/100)) : entryPrice + Number(leg.slValue));
//                                     }

//                                     await deployment.save();
//                                     await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Paper Entry at ₹${entryPrice}`);
//                                 }

                                
//                                 // 🔴 LIVE TRADE ENTRY
//                                 else if (deployment.executionType === 'LIVE') {
//                                     const orderData = { action: tradeAction, quantity: tradeQty, securityId: instrument.id, segment: instrument.exchange };
//                                     const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

//                                     if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
//                                         deployment.tradedSecurityId = instrument.id;
//                                         deployment.tradedExchange = instrument.exchange;
//                                         deployment.tradedQty = tradeQty;
//                                         deployment.tradeAction = tradeAction;
//                                         deployment.tradedSymbol = instrument.tradingSymbol;
//                                         deployment.signalType = currentSignalType; // 🔥 FIX: Saving Signal Type

//                                         await sleep(2000); 
//                                         const entryPrice = await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id);
//                                         deployment.entryPrice = entryPrice || 0;

//                                         if (isPrePunchSL) {
//                                             await handlePrePunchSl(deployment, broker, leg, deployment.entryPrice);
//                                         }

//                                         await deployment.save();
//                                         await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Live Entry Executed`, orderResponse.data.orderId);
//                                     } else {
//                                         await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'FAILED', orderResponse.data?.remarks || "Order Failed");
//                                     }
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }

//             // ==============================================================
//             // 📉 2.5 INDICATOR BASED EXIT LOGIC (NEW)
//             // ==============================================================
//             if (!executionLocks.has(exitLockKey) && deployment.tradedSecurityId && strategy.type === "Indicator Based") {
//                 const broker = await Broker.findById(deployment.brokers[0]);
//                 if (broker && broker.engineOn) {
//                     // 🔥 Scanner se poochho ki Exit ka signal aaya kya?
//                     const shouldExit = await getIndicatorExitSignal(strategy, broker, baseSymbol, deployment.signalType);
                    
//                     if (shouldExit) {
//                         executionLocks.add(exitLockKey);
//                         console.log(`📉 INDICATOR EXIT TRIGGERED! Strategy: ${strategy.name}`);

//                         const exitAction = deployment.tradeAction === 'BUY' ? 'SELL' : 'BUY';
                        
//                         // 🟢 PAPER EXIT (Indicator)
//                         if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                             await sleep(500); 
//                             const exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId) || 0;
                            
//                             if (exitLtp > 0 && deployment.entryPrice > 0) {
//                                 const finalPnl = deployment.tradeAction === 'BUY' 
//                                     ? (exitLtp - deployment.entryPrice) * deployment.tradedQty 
//                                     : (deployment.entryPrice - exitLtp) * deployment.tradedQty;

//                                 deployment.exitPrice = exitLtp;
//                                 deployment.pnl = finalPnl;
//                                 deployment.realizedPnl = finalPnl;
//                                 deployment.status = 'COMPLETED';
//                                 deployment.exitRemarks = "Indicator Exit condition met";
//                                 await deployment.save();

//                                 await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'SUCCESS', `Paper Auto-Exit (Indicator). P&L: ₹${finalPnl.toFixed(2)}`);
                                
//                                 // Trigger Advance Features (Exit All)
//                                 if (strategy.data?.advanceSettings?.exitAllOnSlTgt) {
//                                     await handleExitAllOnSlTgt(strategy, deployment, broker, "Indicator Exit");
//                                 }
//                             }
//                         } 
//                         // 🔴 LIVE EXIT (Indicator)
//                         else if (deployment.executionType === 'LIVE') {
//                             const orderData = { action: exitAction, quantity: deployment.tradedQty, securityId: deployment.tradedSecurityId, segment: deployment.tradedExchange };
//                             const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                            
//                             if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
//                                 await sleep(2000); 
//                                 const exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId) || 0;
                                
//                                 const finalPnl = deployment.tradeAction === 'BUY' 
//                                     ? (exitLtp - deployment.entryPrice) * deployment.tradedQty 
//                                     : (deployment.entryPrice - exitLtp) * deployment.tradedQty;

//                                 deployment.exitPrice = exitLtp;
//                                 deployment.pnl = finalPnl;
//                                 deployment.realizedPnl = finalPnl;
//                                 deployment.status = 'COMPLETED';
//                                 deployment.exitRemarks = "Indicator Exit condition met";
//                                 await deployment.save();

//                                 await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'SUCCESS', `Live Auto-Exit (Indicator). P&L: ₹${finalPnl.toFixed(2)}`, orderResponse.data.orderId);

//                                 // Trigger Advance Features (Exit All)
//                                 if (strategy.data?.advanceSettings?.exitAllOnSlTgt) {
//                                     await handleExitAllOnSlTgt(strategy, deployment, broker, "Indicator Exit");
//                                 }
//                             } else {
//                                 await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'FAILED', `Indicator Exit Failed: ${orderResponse.data?.remarks || "RMS Rejected"}`);
//                                 executionLocks.delete(exitLockKey);
//                             }
//                         }
//                     }
//                 }
//             }


//             // ==============================================================
//             // ⏰ 3. TIME-BASED AUTO SQUARE-OFF LOGIC (BULLETPROOF FIXED)
//             // ==============================================================
//             if (squareOffTime && deployment.tradedSecurityId && !executionLocks.has(exitLockKey)) {
                
//                 // Convert both times to pure minutes for safe >= comparison
//                 const [currH, currM] = currentTime.split(':').map(Number);
//                 const currentMinutes = (currH * 60) + currM;

//                 const [sqH, sqM] = squareOffTime.split(':').map(Number);
//                 const squareOffMinutes = (sqH * 60) + sqM;

//                 // Agar current time square-off time ke barabar ya usse zayada hai
//                 if (currentMinutes >= squareOffMinutes) {
//                     executionLocks.add(exitLockKey);
//                     console.log(`⏰ TIME SQUARE-OFF TRIGGERED! Strategy: ${strategy.name} at ${currentTime} (Target was ${squareOffTime})`);

//                     for (const brokerId of deployment.brokers) {
//                         const broker = await Broker.findById(brokerId);
//                         if (broker && broker.engineOn) {
//                             const exitAction = deployment.tradeAction === 'BUY' ? 'SELL' : 'BUY';
                            
//                             if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                                 await sleep(500); 
//                                 const exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId) || 0;
                                
//                                 if (exitLtp > 0 && deployment.entryPrice > 0) {
//                                     const finalPnl = deployment.tradeAction === 'BUY' 
//                                         ? (exitLtp - deployment.entryPrice) * deployment.tradedQty 
//                                         : (deployment.entryPrice - exitLtp) * deployment.tradedQty;

//                                     deployment.exitPrice = exitLtp;
//                                     deployment.pnl = finalPnl;
//                                     deployment.realizedPnl = finalPnl;
//                                     deployment.status = 'COMPLETED';
//                                     deployment.exitRemarks = "Time Auto Square-Off";
//                                     await deployment.save();

//                                     await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'SUCCESS', `Paper Trade Auto-Exit (Time). P&L: ₹${finalPnl.toFixed(2)}`);
//                                 }
//                             } 
//                             else if (deployment.executionType === 'LIVE') {
//                                 const orderData = { action: exitAction, quantity: deployment.tradedQty, securityId: deployment.tradedSecurityId, segment: deployment.tradedExchange };
//                                 const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                                
//                                 if (orderResponse.success) {
//                                     // Live db save & log is handled by Webhook, but we can add a basic log here
//                                     await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'INFO', `Live Time Auto Square-Off order placed.`);
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }


//             // ==============================================================
//             // 💰 4. RISK MANAGEMENT & ADVANCE FEATURES DELEGATION 
//             // ==============================================================
//             if (deployment.tradedSecurityId && deployment.status === 'ACTIVE' && !executionLocks.has(exitLockKey)) {
                
//                 // MTM Square-off (Overall Strategy Level)
//                 await handleMtmSquareOff(deployment, strategy, executionLocks, exitLockKey);

//                 const broker = await Broker.findById(deployment.brokers[0]); 
//                 if (broker) {
//                     await sleep(2000); 
                    
//                     const liveLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, deployment.tradedExchange, deployment.tradedSecurityId);
                    
//                     if (liveLtp && liveLtp > 0) {
                        
//                         // ==============================================================
//                         // 🎯 4.1 NEW: INDIVIDUAL LEG SL & TP LOGIC (% and Points)
//                         // ==============================================================
//                         let isSlHit = false;
//                         let isTpHit = false;
//                         let exitReason = "";

//                         // Strategy setup me se is leg ka config nikalo
//                         const legConfig = strategy.data.legs.find(l => 
//                             (l.action || "BUY").toUpperCase() === deployment.tradeAction && 
//                             deployment.tradedSymbol.includes(l.optionType === "Call" ? "CE" : "PE")
//                         ) || strategy.data.legs[0];

//                         if (legConfig) {
//                             // Backend ke keys handle karna (UI ke hisaab se)
//                             const slType = legConfig.slType || "SL pt";
//                             const slVal = Number(legConfig.slValue || legConfig.sl || 0);
//                             const tpType = legConfig.tpType || "TP pt";
//                             const tpVal = Number(legConfig.tpValue || legConfig.tp || 0);

//                             // PnL in Points (Kitne point upar/niche gaya)
//                             let pnlInPoints = deployment.tradeAction === 'BUY' 
//                                 ? (liveLtp - deployment.entryPrice) 
//                                 : (deployment.entryPrice - liveLtp);
                                
//                             // PnL in Percentage (Kitna % upar/niche gaya)
//                             let pnlInPercentage = (pnlInPoints / deployment.entryPrice) * 100;

//                             // 🚨 CHECK STOPLOSS (SL)
//                             if (slVal > 0) {
//                                 if (slType.includes("%") && pnlInPercentage <= -slVal) {
//                                     isSlHit = true;
//                                     exitReason = `StopLoss Hit (${slVal}%)`;
//                                 } else if (!slType.includes("%") && pnlInPoints <= -slVal) {
//                                     isSlHit = true;
//                                     exitReason = `StopLoss Hit (${slVal} pts)`;
//                                 }
//                             }

//                             // 🎯 CHECK TARGET (TP)
//                             if (tpVal > 0 && !isSlHit) {
//                                 if (tpType.includes("%") && pnlInPercentage >= tpVal) {
//                                     isTpHit = true;
//                                     exitReason = `Target Hit (${tpVal}%)`;
//                                 } else if (!tpType.includes("%") && pnlInPoints >= tpVal) {
//                                     isTpHit = true;
//                                     exitReason = `Target Hit (${tpVal} pts)`;
//                                 }
//                             }
//                         }

//                         // ⚡ AGAR SL YA TP HIT HUA HAI TO TRADE SQUARE-OFF KARO
//                         if (isSlHit || isTpHit) {
//                             executionLocks.add(exitLockKey);
//                             const exitAction = deployment.tradeAction === 'BUY' ? 'SELL' : 'BUY';
//                             console.log(`🎯 TARGET/SL TRIGGERED: ${exitReason} for ${deployment.tradedSymbol}`);

//                             // 🟢 PAPER TRADE EXIT
//                             if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
//                                 const finalPnl = deployment.tradeAction === 'BUY' 
//                                     ? (liveLtp - deployment.entryPrice) * deployment.tradedQty 
//                                     : (deployment.entryPrice - liveLtp) * deployment.tradedQty;

//                                 deployment.exitPrice = liveLtp;
//                                 deployment.pnl = finalPnl;
//                                 deployment.realizedPnl = finalPnl;
//                                 deployment.status = 'COMPLETED';
//                                 deployment.exitRemarks = exitReason; // Frontend par ab reason dikhega
//                                 await deployment.save();

//                                 await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'SUCCESS', `Auto-Exit: ${exitReason}. P&L: ₹${finalPnl.toFixed(2)}`);

//                                 // Trigger Advance Features (Exit All)
//                                 if (strategy.data?.advanceSettings?.exitAllOnSlTgt) {
//                                     await handleExitAllOnSlTgt(strategy, deployment, broker, exitReason);
//                                 }
//                             } 
//                             // 🔴 LIVE TRADE EXIT
//                             else if (deployment.executionType === 'LIVE') {
//                                 const orderData = { action: exitAction, quantity: deployment.tradedQty, securityId: deployment.tradedSecurityId, segment: deployment.tradedExchange };
//                                 const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

//                                 if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
//                                     const finalPnl = deployment.tradeAction === 'BUY' 
//                                         ? (liveLtp - deployment.entryPrice) * deployment.tradedQty 
//                                         : (deployment.entryPrice - liveLtp) * deployment.tradedQty;

//                                     deployment.exitPrice = liveLtp;
//                                     deployment.pnl = finalPnl;
//                                     deployment.realizedPnl = finalPnl;
//                                     deployment.status = 'COMPLETED';
//                                     deployment.exitRemarks = exitReason; // Frontend par ab reason dikhega
//                                     await deployment.save();

//                                     await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'SUCCESS', `Live Auto-Exit: ${exitReason}. P&L: ₹${finalPnl.toFixed(2)}`, orderResponse.data.orderId);

//                                     if (strategy.data?.advanceSettings?.exitAllOnSlTgt) {
//                                         await handleExitAllOnSlTgt(strategy, deployment, broker, exitReason);
//                                     }
//                                 } else {
//                                     await createAndEmitLog(broker, deployment.tradedSymbol, exitAction, deployment.tradedQty, 'FAILED', `Exit Failed: ${orderResponse.data?.remarks || "RMS Rejected"}`);
//                                     executionLocks.delete(exitLockKey);
//                                 }
//                             }
//                         } 
//                         // ==============================================================
//                         // 🔄 4.2 AGAR SL/TP HIT NAHI HUA, TO TRAILING LOGIC CHALAO
//                         // ==============================================================
//                         else {
//                             await processTrailingLogic(deployment, strategy, liveLtp, broker);

//                             const checkExitStatus = await Deployment.findById(deployment._id);
//                             if (checkExitStatus && checkExitStatus.status === 'COMPLETED') {
//                                 const triggerReason = checkExitStatus.exitRemarks || "Trailing SL Hit";

//                                 if (strategy.data?.advanceSettings?.exitAllOnSlTgt) {
//                                     await handleExitAllOnSlTgt(strategy, checkExitStatus, broker, triggerReason);
//                                 }
                                
//                                 if (strategy.data?.advanceSettings?.moveSLToCost) {
//                                     await handleMoveSlToCost(strategy, checkExitStatus, broker);
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }
//         }
//     } catch (error) { 
//         console.error("❌ Trading Engine Core Error:", error); 
//     } finally {
//         isEngineRunning = false; 
//     }
// });



// ==========================================
// 🌟 MAIN TRADING ENGINE (THE MANAGER) 🌟
// ==========================================
const cron = require('node-cron');
const moment = require('moment-timezone');

// 📂 Models
const Deployment = require('../models/Deployment.js');
const Broker = require('../models/Broker.js');

// 🛠️ Utilities & APIs 
const { sleep, getStrikeStep, getOptionSecurityId } = require('../services/instrumentService.js');
const { placeDhanOrder, fetchLiveLTP } = require('../services/dhanService.js');
const { fetchLivePrice } = require('./utils/priceFetcher.js');
const { createAndEmitLog } = require('./utils/logger.js'); 

// 🔍 Scanners
const { findStrikeByLivePremium } = require('./scanners/optionChainScanner.js');
const { getIndicatorSignal, getIndicatorExitSignal } = require('./scanners/indicatorScanner.js');  

// 🛡️ Risk Management
const { handleMtmSquareOff } = require('./features/riskManagement/mtmSquareOff.js');
const { processTrailingLogic } = require('./features/riskManagement/trailingLogic.js');

// 🚀 ADVANCE FEATURES
const { handleMoveSlToCost } = require('./features/advanceFeatures/moveSlToCost.js');
const { handlePrePunchSl } = require('./features/advanceFeatures/prePunchSl.js');
const { handleExitAllOnSlTgt } = require('./features/advanceFeatures/exitAllOnSlTgt.js');
const { processWaitAndTrade } = require('./features/advanceFeatures/waitAndTrade.js');

// Global execution locks
const executionLocks = new Set();
let isEngineRunning = false; 

// ==========================================
// ⚙️ THE CORE CRON JOB LOOP (Runs every 30s)
// ==========================================
cron.schedule('*/30 * * * * *', async () => {
    
    if (isEngineRunning) {
        console.log("⏳ Engine is taking time, skipping overlapping tick...");
        return; 
    }
    
    isEngineRunning = true; 

    try {
        const currentTime = moment().tz("Asia/Kolkata").format("HH:mm");
        const activeDeployments = await Deployment.find({ 
            status: { $in: ['ACTIVE', 'PARTIALLY_COMPLETED'] } // 🔥 FIX: Both active states
        }).populate('strategyId');

        if (activeDeployments.length === 0) return;

        if (currentTime === "00:00" && executionLocks.size > 0) executionLocks.clear();

        for (const deployment of activeDeployments) {
            await sleep(1000);

            const strategy = deployment.strategyId;
            if (!strategy) continue;

            const config = strategy.data?.config || {};
            const entryLockKey = `ENTRY_${deployment._id.toString()}_${currentTime}`;
            const exitLockKey = `EXIT_${deployment._id.toString()}_${currentTime}`;
            const squareOffTime = deployment.squareOffTime || config.squareOffTime;

            // 🛑 THE SHIELD: STRICT SYMBOL VALIDATION 
            const instrumentData = (strategy.data.instruments && strategy.data.instruments.length > 0) ? strategy.data.instruments[0] : {};
            let rawSymbol = instrumentData.name || config.index || strategy.symbol || strategy.name;
            if (!rawSymbol) continue;

            let baseSymbol = "";
            const upperRawSymbol = String(rawSymbol).toUpperCase();
            if (upperRawSymbol.includes("BANK")) baseSymbol = "BANKNIFTY";
            else if (upperRawSymbol.includes("FIN")) baseSymbol = "FINNIFTY";
            else if (upperRawSymbol.includes("MID")) baseSymbol = "MIDCPNIFTY";
            else if (upperRawSymbol.includes("NIFTY")) baseSymbol = "NIFTY";
            else if (upperRawSymbol.includes("SENSEX")) baseSymbol = "SENSEX";
            else continue; 

            // 🔥 HELPERS
            const hasLegs = deployment.executedLegs && deployment.executedLegs.length > 0;
            const hasActiveLegs = hasLegs && deployment.executedLegs.some(l => l.status === 'ACTIVE');

            // ==============================================================
            // ⚡ 1. ENTRY LOGIC (Fixed to use executedLegs array)
            // ==============================================================
            if (!executionLocks.has(entryLockKey) && !hasLegs) {
                let shouldEnter = false;
                let currentSignalType = "NONE";
                const strategyType = strategy.type || "Time Based"; 

                if (strategyType === "Indicator Based") {
                    const broker = await Broker.findById(deployment.brokers[0]);
                    if (broker && broker.engineOn) {
                        const signal = await getIndicatorSignal(strategy, broker, baseSymbol);
                        if (signal.long) { shouldEnter = true; currentSignalType = "LONG"; } 
                        else if (signal.short) { shouldEnter = true; currentSignalType = "SHORT"; }
                    }
                } 
                else {
                    if (config.startTime === currentTime) { shouldEnter = true; currentSignalType = "TIME"; }
                }

                if (shouldEnter) {
                    executionLocks.add(entryLockKey);
                    const isPrePunchSL = strategy.data?.advanceSettings?.prePunchSL || false;

                    for (const brokerId of deployment.brokers) {
                        const broker = await Broker.findById(brokerId);
                        if (broker && broker.engineOn) {
                            
                            for (const leg of strategy.data.legs) {
                                let tradeAction = (leg.action || "BUY").toUpperCase(); 
                                let tradeQty = (leg.quantity || 1) * deployment.multiplier;

                                let optType = leg.optionType === "Call" ? "CE" : "PE"; 
                                if (currentSignalType === "LONG") optType = (tradeAction === "BUY") ? "CE" : "PE"; 
                                else if (currentSignalType === "SHORT") optType = (tradeAction === "BUY") ? "PE" : "CE"; 

                                let currentSpotPrice = await fetchLivePrice(baseSymbol);
                                if (!currentSpotPrice) continue;

                                const strikeCriteria = leg.strikeCriteria || "ATM pt";
                                let instrument = null;
                                let preFetchedLtp = null; 

                                if (["CP", "CP >=", "CP <=", "Delta"].includes(strikeCriteria)) {
                                    instrument = await findStrikeByLivePremium(baseSymbol, currentSpotPrice, optType, leg.expiry || "WEEKLY", strikeCriteria, leg.strikeType || "ATM", broker);
                                    if (instrument && instrument.ltp) preFetchedLtp = instrument.ltp;
                                } else {
                                    instrument = getOptionSecurityId(baseSymbol, currentSpotPrice, strikeCriteria, leg.strikeType || "ATM", optType, leg.expiry || "WEEKLY");
                                }
                                
                                if (!instrument) continue;

                                // 🔥 THE WAIT & TRADE INJECTION
                                await sleep(500); 
                                const currentPremiumLtp = preFetchedLtp || await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id) || currentSpotPrice;

                                const isWaitAndTradeActive = strategy.data?.advanceSettings?.waitAndTrade;
                                const waitAndTradeConfig = strategy.data?.advanceSettings?.waitAndTradeConfig || {};

                                if (isWaitAndTradeActive && waitAndTradeConfig.movement > 0) {
                                    if (!deployment.waitReferencePrice) {
                                        deployment.waitReferencePrice = currentPremiumLtp; 
                                        await deployment.save();
                                        console.log(`⏳ [WAIT & TRADE] Ref Price: ₹${currentPremiumLtp}. Waiting for movement...`);
                                        await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'INFO', `Wait & Trade Activated. Ref Premium: ₹${currentPremiumLtp}`);
                                        continue; 
                                    } else {
                                        const waitStatus = processWaitAndTrade(waitAndTradeConfig, currentPremiumLtp, deployment.waitReferencePrice);
                                        if (!waitStatus.shouldExecute) {
                                            continue; 
                                        } else {
                                            console.log(`🎯 [WAIT & TRADE] Target Hit! Executing Trade...`);
                                        }
                                    }
                                }

                                // 🟢 PAPER TRADE ENTRY
                                if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
                                    await sleep(500); 
                                    let entryPrice = preFetchedLtp || await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id);
                                    
                                    if (!entryPrice || entryPrice <= 0) {
                                        console.log(`⚠️ LTP not found. Skipping...`);
                                        continue; 
                                    }
                                    
                                    let paperSl = 0;
                                    if (isPrePunchSL && entryPrice > 0 && leg.slValue > 0) {
                                        paperSl = tradeAction === "BUY" 
                                            ? (leg.slType === 'SL%' ? entryPrice - (entryPrice * (Number(leg.slValue)/100)) : entryPrice - Number(leg.slValue))
                                            : (leg.slType === 'SL%' ? entryPrice + (entryPrice * (Number(leg.slValue)/100)) : entryPrice + Number(leg.slValue));
                                    }

                                    // 🔥 PUSH TO ARRAY
                                    deployment.executedLegs.push({
                                        securityId: instrument.id,
                                        exchange: instrument.exchange,
                                        symbol: instrument.tradingSymbol,
                                        action: tradeAction,
                                        quantity: tradeQty,
                                        entryPrice: entryPrice,
                                        paperSlPrice: paperSl,
                                        status: 'ACTIVE'
                                    });

                                    await deployment.save();
                                    await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Paper Entry at ₹${entryPrice}`);
                                }
                                
                                // 🔴 LIVE TRADE ENTRY
                                else if (deployment.executionType === 'LIVE') {
                                    const orderData = { action: tradeAction, quantity: tradeQty, securityId: instrument.id, segment: instrument.exchange };
                                    const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);

                                    if (orderResponse.success && orderResponse.data?.orderStatus?.toUpperCase() !== "REJECTED") {
                                        await sleep(2000); 
                                        const entryPrice = await fetchLiveLTP(broker.clientId, broker.apiSecret, instrument.exchange, instrument.id) || 0;

                                        // 🔥 PUSH TO ARRAY
                                        deployment.executedLegs.push({
                                            securityId: instrument.id,
                                            exchange: instrument.exchange,
                                            symbol: instrument.tradingSymbol,
                                            action: tradeAction,
                                            quantity: tradeQty,
                                            entryPrice: entryPrice,
                                            status: 'ACTIVE'
                                        });

                                        await deployment.save();
                                        await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'SUCCESS', `Live Entry Executed`, orderResponse.data.orderId);
                                    } else {
                                        await createAndEmitLog(broker, instrument.tradingSymbol, tradeAction, tradeQty, 'FAILED', orderResponse.data?.remarks || "Order Failed");
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // ==============================================================
            // 📉 2.5 INDICATOR BASED EXIT LOGIC (Fixed for Array)
            // ==============================================================
            if (!executionLocks.has(exitLockKey) && hasActiveLegs && strategy.type === "Indicator Based") {
                const broker = await Broker.findById(deployment.brokers[0]);
                if (broker && broker.engineOn) {
                    // Check signal (you might need to update your scanner if it relied on single leg data)
                    const shouldExit = await getIndicatorExitSignal(strategy, broker, baseSymbol, deployment.signalType || "NONE");
                    
                    if (shouldExit) {
                        executionLocks.add(exitLockKey);
                        console.log(`📉 INDICATOR EXIT TRIGGERED! Strategy: ${strategy.name}`);

                        for (let i = 0; i < deployment.executedLegs.length; i++) {
                            let currentLeg = deployment.executedLegs[i];
                            if (currentLeg.status !== 'ACTIVE') continue;

                            const exitAction = currentLeg.action === 'BUY' ? 'SELL' : 'BUY';
                            await sleep(500);
                            
                            // PAPER
                            if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
                                const exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, currentLeg.exchange, currentLeg.securityId) || 0;
                                if (exitLtp > 0) {
                                    const finalPnl = currentLeg.action === 'BUY' 
                                        ? (exitLtp - currentLeg.entryPrice) * currentLeg.quantity 
                                        : (currentLeg.entryPrice - exitLtp) * currentLeg.quantity;

                                    currentLeg.exitPrice = exitLtp;
                                    currentLeg.livePnl = finalPnl;
                                    currentLeg.status = 'COMPLETED';
                                    currentLeg.exitReason = "Indicator Exit";
                                    
                                    deployment.pnl = (deployment.pnl || 0) + finalPnl;
                                    deployment.realizedPnl = (deployment.realizedPnl || 0) + finalPnl;

                                    await createAndEmitLog(broker, currentLeg.symbol, exitAction, currentLeg.quantity, 'SUCCESS', `Paper Indicator Exit. P&L: ₹${finalPnl.toFixed(2)}`);
                                }
                            } 
                            // LIVE
                            else if (deployment.executionType === 'LIVE') {
                                const orderData = { action: exitAction, quantity: currentLeg.quantity, securityId: currentLeg.securityId, segment: currentLeg.exchange };
                                const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                                
                                if (orderResponse.success) {
                                    await sleep(2000); 
                                    const exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, currentLeg.exchange, currentLeg.securityId) || 0;
                                    const finalPnl = currentLeg.action === 'BUY' 
                                        ? (exitLtp - currentLeg.entryPrice) * currentLeg.quantity 
                                        : (currentLeg.entryPrice - exitLtp) * currentLeg.quantity;

                                    currentLeg.exitPrice = exitLtp;
                                    currentLeg.livePnl = finalPnl;
                                    currentLeg.status = 'COMPLETED';
                                    currentLeg.exitReason = "Indicator Exit";
                                    
                                    deployment.pnl = (deployment.pnl || 0) + finalPnl;
                                    deployment.realizedPnl = (deployment.realizedPnl || 0) + finalPnl;

                                    await createAndEmitLog(broker, currentLeg.symbol, exitAction, currentLeg.quantity, 'SUCCESS', `Live Indicator Exit. P&L: ₹${finalPnl.toFixed(2)}`, orderResponse.data.orderId);
                                }
                            }
                        }
                        deployment.status = 'COMPLETED';
                        deployment.exitRemarks = "Indicator Exit condition met";
                        await deployment.save();

                        if (strategy.data?.advanceSettings?.exitAllOnSlTgt) {
                            await handleExitAllOnSlTgt(strategy, deployment, broker, "Indicator Exit");
                        }
                    }
                }
            }

            // ==============================================================
            // ⏰ 3. TIME-BASED AUTO SQUARE-OFF LOGIC (Fixed for Array)
            // ==============================================================
            if (squareOffTime && hasActiveLegs && !executionLocks.has(exitLockKey)) {
                const [currH, currM] = currentTime.split(':').map(Number);
                const currentMinutes = (currH * 60) + currM;

                const [sqH, sqM] = squareOffTime.split(':').map(Number);
                const squareOffMinutes = (sqH * 60) + sqM;

                if (currentMinutes >= squareOffMinutes) {
                    executionLocks.add(exitLockKey);
                    console.log(`⏰ TIME SQUARE-OFF TRIGGERED! Strategy: ${strategy.name}`);

                    const broker = await Broker.findById(deployment.brokers[0]);
                    if (broker && broker.engineOn) {
                        for (let i = 0; i < deployment.executedLegs.length; i++) {
                            let currentLeg = deployment.executedLegs[i];
                            if (currentLeg.status !== 'ACTIVE') continue;

                            const exitAction = currentLeg.action === 'BUY' ? 'SELL' : 'BUY';
                            
                            // PAPER
                            if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
                                await sleep(500); 
                                const exitLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, currentLeg.exchange, currentLeg.securityId) || 0;
                                
                                if (exitLtp > 0) {
                                    const finalPnl = currentLeg.action === 'BUY' 
                                        ? (exitLtp - currentLeg.entryPrice) * currentLeg.quantity 
                                        : (currentLeg.entryPrice - exitLtp) * currentLeg.quantity;

                                    currentLeg.exitPrice = exitLtp;
                                    currentLeg.livePnl = finalPnl;
                                    currentLeg.status = 'COMPLETED';
                                    currentLeg.exitReason = "Time Auto Square-Off";
                                    
                                    deployment.pnl = (deployment.pnl || 0) + finalPnl;
                                    deployment.realizedPnl = (deployment.realizedPnl || 0) + finalPnl;

                                    await createAndEmitLog(broker, currentLeg.symbol, exitAction, currentLeg.quantity, 'SUCCESS', `Paper Auto-Exit (Time). P&L: ₹${finalPnl.toFixed(2)}`);
                                }
                            } 
                            // LIVE
                            else if (deployment.executionType === 'LIVE') {
                                const orderData = { action: exitAction, quantity: currentLeg.quantity, securityId: currentLeg.securityId, segment: currentLeg.exchange };
                                const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                                
                                if (orderResponse.success) {
                                    currentLeg.status = 'COMPLETED'; // Will sync properly with Webhook
                                    currentLeg.exitReason = "Time Auto Square-Off";
                                    await createAndEmitLog(broker, currentLeg.symbol, exitAction, currentLeg.quantity, 'INFO', `Live Time Auto Square-Off order placed.`);
                                }
                            }
                        }
                        deployment.status = 'COMPLETED';
                        deployment.exitRemarks = "Time Auto Square-Off";
                        await deployment.save();
                    }
                }
            }

            // ==============================================================
            // 💰 4. RISK MANAGEMENT & ADVANCE FEATURES DELEGATION 
            // ==============================================================
            if (hasActiveLegs && (deployment.status === 'ACTIVE' || deployment.status === 'PARTIALLY_COMPLETED') && !executionLocks.has(exitLockKey)) {
                
                await handleMtmSquareOff(deployment, strategy, executionLocks, exitLockKey);

                const broker = await Broker.findById(deployment.brokers[0]); 
                if (broker) {
                    
                    // Loop through each Executed Leg
                    for (let i = 0; i < deployment.executedLegs.length; i++) {
                        let currentLeg = deployment.executedLegs[i];
                        
                        if (currentLeg.status !== 'ACTIVE') continue; 

                        await sleep(1000); 
                        const liveLtp = await fetchLiveLTP(broker.clientId, broker.apiSecret, currentLeg.exchange, currentLeg.securityId);
                        
                        if (liveLtp && liveLtp > 0) {
                            
                            let isSlHit = false;
                            let isTpHit = false;
                            let exitReason = "";

                            const legConfig = strategy.data.legs.find(l => 
                                (l.action || "BUY").toUpperCase() === currentLeg.action && 
                                currentLeg.symbol.includes(l.optionType === "Call" ? "CE" : "PE")
                            ) || strategy.data.legs[0];

                            if (legConfig) {
                                const slType = legConfig.slType || "SL pt";
                                const slVal = Number(legConfig.slValue || legConfig.sl || 0);
                                const tpType = legConfig.tpType || "TP pt";
                                const tpVal = Number(legConfig.tpValue || legConfig.tp || 0);

                                let pnlInPoints = currentLeg.action === 'BUY' 
                                    ? (liveLtp - currentLeg.entryPrice) 
                                    : (currentLeg.entryPrice - liveLtp);
                                    
                                let pnlInPercentage = (pnlInPoints / currentLeg.entryPrice) * 100;

                                // 🚨 CHECK STOPLOSS (SL)
                                if (slVal > 0) {
                                    if (slType.includes("%") && pnlInPercentage <= -slVal) {
                                        isSlHit = true; exitReason = `StopLoss Hit (${slVal}%)`;
                                    } else if (!slType.includes("%") && pnlInPoints <= -slVal) {
                                        isSlHit = true; exitReason = `StopLoss Hit (${slVal} pts)`;
                                    }
                                }

                                // 🎯 CHECK TARGET (TP)
                                if (tpVal > 0 && !isSlHit) {
                                    if (tpType.includes("%") && pnlInPercentage >= tpVal) {
                                        isTpHit = true; exitReason = `Target Hit (${tpVal}%)`;
                                    } else if (!tpType.includes("%") && pnlInPoints >= tpVal) {
                                        isTpHit = true; exitReason = `Target Hit (${tpVal} pts)`;
                                    }
                                }
                            }

                            // ⚡ SQUARE-OFF
                            if (isSlHit || isTpHit) {
                                executionLocks.add(exitLockKey);
                                const exitAction = currentLeg.action === 'BUY' ? 'SELL' : 'BUY';
                                console.log(`🎯 LEG EXIT TRIGGERED: ${exitReason} for ${currentLeg.symbol}`);

                                const finalPnl = currentLeg.action === 'BUY' 
                                    ? (liveLtp - currentLeg.entryPrice) * currentLeg.quantity 
                                    : (currentLeg.entryPrice - liveLtp) * currentLeg.quantity;

                                currentLeg.exitPrice = liveLtp;
                                currentLeg.livePnl = finalPnl;
                                currentLeg.status = 'COMPLETED';
                                currentLeg.exitReason = exitReason;

                                deployment.pnl = (deployment.pnl || 0) + finalPnl;
                                deployment.realizedPnl = (deployment.realizedPnl || 0) + finalPnl;
                                
                                const allCompleted = deployment.executedLegs.every(l => l.status === 'COMPLETED');
                                deployment.status = allCompleted ? 'COMPLETED' : 'PARTIALLY_COMPLETED';

                                await deployment.save();

                                // PAPER / LIVE Log Execution
                                if (deployment.executionType === 'FORWARD_TEST' || deployment.executionType === 'PAPER') {
                                    await createAndEmitLog(broker, currentLeg.symbol, exitAction, currentLeg.quantity, 'SUCCESS', `Auto-Exit: ${exitReason}. P&L: ₹${finalPnl.toFixed(2)}`);
                                } else if (deployment.executionType === 'LIVE') {
                                    const orderData = { action: exitAction, quantity: currentLeg.quantity, securityId: currentLeg.securityId, segment: currentLeg.exchange };
                                    const orderResponse = await placeDhanOrder(broker.clientId, broker.apiSecret, orderData);
                                    if (orderResponse.success) {
                                        await createAndEmitLog(broker, currentLeg.symbol, exitAction, currentLeg.quantity, 'SUCCESS', `Live Auto-Exit: ${exitReason}. P&L: ₹${finalPnl.toFixed(2)}`, orderResponse.data.orderId);
                                    }
                                }

                                // 🚀 ADVANCE FEATURES
                                if (!allCompleted && strategy.data?.advanceSettings?.moveSLToCost) {
                                    await handleMoveSlToCost(strategy, deployment, broker);
                                }
                                if (strategy.data?.advanceSettings?.exitAllOnSlTgt) {
                                    await handleExitAllOnSlTgt(strategy, deployment, broker, exitReason);
                                }

                            } else {
                                // Live PnL UI Update
                                currentLeg.livePnl = currentLeg.action === 'BUY' 
                                    ? (liveLtp - currentLeg.entryPrice) * currentLeg.quantity 
                                    : (currentLeg.entryPrice - liveLtp) * currentLeg.quantity;
                                await deployment.save();
                                
                                // Note: Trailing logic can be called here if needed for the current leg
                                // await processTrailingLogic(deployment, strategy, liveLtp, broker);
                            }
                        }
                    }
                }
            }
        }
    } catch (error) { 
        console.error("❌ Trading Engine Core Error:", error); 
    } finally {
        isEngineRunning = false; 
    }
});