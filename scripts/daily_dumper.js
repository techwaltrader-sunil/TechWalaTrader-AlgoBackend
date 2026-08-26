// const { exec } = require('child_process');
// const cron = require('node-cron');
// const path = require('path');
// const fs = require('fs');
// require('dotenv').config({ path: path.join(__dirname, '../.env') });

// // ==========================================
// // 📁 1. BACKUP FOLDER SETUP
// // ==========================================
// // यह तुम्हारे प्रोजेक्ट में 'backups' नाम का फोल्डर बनाएगा (अगर नहीं है तो)
// const backupDir = path.join(__dirname, '../backups');
// if (!fs.existsSync(backupDir)) {
//     fs.mkdirSync(backupDir);
// }

// // ==========================================
// // 💾 2. THE DUMP FUNCTION
// // ==========================================
// function takeDailyBackup() {
//     const timeNow = new Date().toLocaleTimeString();
//     console.log(`\n[${timeNow}] ⏳ Starting AWS Database Dump...`);
    
//     const today = new Date();
//     const year = today.getFullYear();
//     const month = String(today.getMonth() + 1).padStart(2, '0');
//     const day = String(today.getDate()).padStart(2, '0');
//     const dateStr = `${year}-${month}-${day}`;
    
//     // फाइल का नाम आज की डेट के हिसाब से बनेगा
//     const fileName = `smart_trader_aws_dump_${dateStr}.sql`;
//     const filePath = path.join(backupDir, fileName);

//     // .env से AWS का URL उठाना (Make sure name matches your .env)
//     const dbUrl = process.env.POSTGRES_URL; 

//     if (!dbUrl) {
//         console.error("❌ POSTGRES_URL not found in .env file.");
//         return;
//     }

//     // pg_dump कमांड जो सीधा URL के ज़रिए AWS से कनेक्ट होकर बैकअप लेगा
//     const pgDumpPath = `"C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe"`; 
//     const command = `${pgDumpPath} "${dbUrl}" -f "${filePath}"`;

//     exec(command, (error, stdout, stderr) => {
//         if (error) {
//             console.error(`❌ Backup Failed: ${error.message}`);
//             return;
//         }
//         console.log(`🎉 [SUCCESS] AWS Database dumped successfully!`);
//         console.log(`📂 File saved at: ${filePath}`);
//     });
// }

// // ==========================================
// // ⏰ 3. THE TIMEKEEPER (CRON SCHEDULER)
// // ==========================================
// // यह हर सोमवार से शुक्रवार, दोपहर 3:35 PM पर अपने आप ट्रिगर होगा
// cron.schedule('35 15 * * 1-5', () => {
//     console.log("\n⏰ 3:35 PM Triggered: Initiating Daily Backup...");
//     takeDailyBackup();
// });

// console.log("=====================================================");
// console.log("🟢 SMART TRADER AUTO-DUMPER STARTED");
// console.log("⏳ Waiting for the clock to hit 3:35 PM...");
// console.log("=====================================================");

// // ⚠️ सिर्फ टेस्टिंग के लिए: अगर तुम चाहते हो कि रन करते ही तुरंत एक बैकअप ले ले, 
// // तो नीचे वाली लाइन से '//' हटा देना, वरना इसे ऐसे ही रहने देना।
// takeDailyBackup();




const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// 📁 1. BACKUP FOLDER SETUP
const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
}

const pgDumpPath = `"C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe"`;
const psqlPath = `"C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe"`;

// 💾 2. THE DUMP & IMPORT FUNCTION
function syncDataNow() {
    const timeNow = new Date().toLocaleTimeString();
    console.log(`\n[${timeNow}] ⚡ SYNCHRONIZATION STARTED...`);
    
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const fileName = `smart_trader_aws_dump_${dateStr}.sql`;
    const filePath = path.join(backupDir, fileName);

    const awsDbUrl = process.env.POSTGRES_URL; 
    const localDbUrl = "postgresql://postgres:Trademaster2026@localhost:5432/historical_data";

    if (!awsDbUrl) {
        console.error("❌ POSTGRES_URL not found in .env file.");
        return;
    }

    console.log(`⏳ [STEP 1] Downloading fresh data from AWS...`);
    const dumpCommand = `${pgDumpPath} -c "${awsDbUrl}" -f "${filePath}"`;

    exec(dumpCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ [STEP 1 FAILED]: ${error.message}`);
            return;
        }
        console.log(`🎉 [STEP 1 SUCCESS] Data downloaded at: ${filePath}`);
        console.log(`⏳ [STEP 2] Importing data into Local pgAdmin...`);
        
        const importCommand = `${psqlPath} "${localDbUrl}" -f "${filePath}"`;
        
        exec(importCommand, (importError, importStdout, importStderr) => {
            if (importError) {
                console.error(`❌ [STEP 2 FAILED]: ${importError.message}`);
                return;
            }
            console.log(`🚀 [STEP 2 SUCCESS] Local Database is now 100% Up-to-date!`);
            console.log(`✅ You can now start your analysis.`);
        });
    });
}

// 🚦 RUN IMMEDIATELY (No Timers)
syncDataNow();