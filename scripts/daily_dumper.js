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
    // const dateStr = 2026-9-11;
    
    const fileName = `smart_trader_aws_dump_${dateStr}.sql`;
    const filePath = path.join(backupDir, fileName);


    const awsDbUrl = process.env.AWS_DB_URL; 
    const localDbUrl = process.env.LOCAL_DB_URL; 

    if (!awsDbUrl || !localDbUrl) {
        console.error("❌ Database URLs not found in .env file.");
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





// const { Client } = require('pg');
// const path = require('path');
// require('dotenv').config({ path: path.join(__dirname, '../.env') });

// // 🛠️ JON-JON SI TABLES SYNC KARNI HAIN, UNKI LIST AUR COLUMNS
// const SYNC_TABLES = [
//     {
//         name: 'historical_candles',
//         columns: ['symbol', 'timestamp', 'open', 'high', 'low', 'close', 'volume']
//     },
//     {
//         name: 'option_chain_data',
//         columns: ['instrument', 'strike', 'option_type', 'expiry_date', 'timestamp', 'close', 'volume', 'oi']
//     }
// ];

// async function smartSyncNow() {
//     const timeNow = new Date().toLocaleTimeString();
//     console.log(`\n[${timeNow}] ⚡ SMART SYNCHRONIZATION STARTED...`);

//     const localDbUrl = process.env.LOCAL_DB_URL;
//     const awsDbUrl = process.env.AWS_DB_URL;

//     if (!awsDbUrl || !localDbUrl) {
//         console.error("❌ ERROR: Database URLs (LOCAL_DB_URL ya AWS_DB_URL) .env file me nahi mile.");
//         return;
//     }

//     const localClient = new Client({ connectionString: localDbUrl });
//     const awsClient = new Client({ connectionString: awsDbUrl });

//     try {
//         await localClient.connect();
//         await awsClient.connect();

//         // 🔄 HAR TABLE KE LIYE LOOP CHALAYENGE (Pehle Candles, Fir Option Chain)
//         for (const table of SYNC_TABLES) {
//             console.log(`\n📊 Checking table: [${table.name}]...`);

//             // 1️⃣ Local DB se Last Timestamp nikalo
//             const localRes = await localClient.query(`SELECT MAX(timestamp) as last_time FROM ${table.name}`);
//             const lastTime = localRes.rows[0].last_time;

//             let query = `SELECT ${table.columns.join(', ')} FROM ${table.name}`;
//             let queryParams = [];

//             if (lastTime) {
//                 console.log(`📌 Local me last data: ${lastTime.toLocaleString()} tak ka hai.`);
//                 query += " WHERE timestamp > $1 ORDER BY timestamp ASC";
//                 queryParams.push(lastTime);
//             } else {
//                 console.log("📌 Local database khali hai. AWS se poora data fetch kar rahe hain...");
//                 query += " ORDER BY timestamp ASC";
//             }

//             // 2️⃣ AWS se naya data fetch karo
//             console.log(`⏳ AWS se naya data download ho raha hai...`);
//             const awsRes = await awsClient.query(query, queryParams);
//             const newData = awsRes.rows;

//             if (newData.length === 0) {
//                 console.log(`✅ [${table.name}] pehle se 100% Up-to-date hai! (No new data)`);
//                 continue; // Agli table par jao
//             }

//             console.log(`🔥 ${newData.length} naye rows mil gaye! Local me append kar rahe hain...`);

//             // 3️⃣ Naya data Local me insert karo (Batch processing - 2000 rows at a time for speed)
//             const BATCH_SIZE = 2000;
//             for (let i = 0; i < newData.length; i += BATCH_SIZE) {
//                 const batch = newData.slice(i, i + BATCH_SIZE);
//                 let insertQuery = `INSERT INTO ${table.name} (${table.columns.join(', ')}) VALUES `;
//                 const values = [];
//                 let paramIndex = 1;
//                 const rowValues = [];

//                 for (const row of batch) {
//                     const rowParams = table.columns.map(() => `$${paramIndex++}`);
//                     rowValues.push(`(${rowParams.join(', ')})`);
//                     table.columns.forEach(col => values.push(row[col]));
//                 }

//                 insertQuery += rowValues.join(", ") + ";";
//                 await localClient.query(insertQuery, values);
//                 console.log(`  -> Inserted ${Math.min(i + BATCH_SIZE, newData.length)} / ${newData.length} rows...`);
//             }
//             console.log(`✅ [${table.name}] ka naya data successfully append ho gaya!`);
//         }

//         console.log(`\n🚀🚀 [SUPER SUCCESS] Local Database is now 100% synchronized! Aap AWS ka data delete kar sakte hain.`);

//     } catch (error) {
//         console.error("❌ SYNC ERROR:", error.message);
//     } finally {
//         await localClient.end();
//         await awsClient.end();
//     }
// }

// // 🚦 RUN IMMEDIATELY
// smartSyncNow();