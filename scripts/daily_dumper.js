const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// 🛠️ JON-JON SI TABLES SYNC KARNI HAIN, UNKI LIST AUR COLUMNS
const SYNC_TABLES = [
    {
        name: 'historical_candles',
        columns: ['symbol', 'timestamp', 'open', 'high', 'low', 'close', 'volume']
    },
    {
        name: 'option_chain_data',
        columns: ['instrument', 'strike', 'option_type', 'expiry_date', 'timestamp', 'close', 'volume', 'oi']
    }
];

async function smartSyncNow() {
    const timeNow = new Date().toLocaleTimeString();
    console.log(`\n[${timeNow}] ⚡ SMART SYNCHRONIZATION STARTED...`);

    const localDbUrl = process.env.LOCAL_DB_URL;
    const awsDbUrl = process.env.AWS_DB_URL;

    if (!awsDbUrl || !localDbUrl) {
        console.error("❌ ERROR: Database URLs (LOCAL_DB_URL ya AWS_DB_URL) .env file me nahi mile.");
        return;
    }

    const localClient = new Client({ connectionString: localDbUrl });
    const awsClient = new Client({ connectionString: awsDbUrl });

    try {
        await localClient.connect();
        await awsClient.connect();

        // 🔄 HAR TABLE KE LIYE LOOP CHALAYENGE (Pehle Candles, Fir Option Chain)
        for (const table of SYNC_TABLES) {
            console.log(`\n📊 Checking table: [${table.name}]...`);

            // 1️⃣ Local DB se Last Timestamp nikalo
            const localRes = await localClient.query(`SELECT MAX(timestamp) as last_time FROM ${table.name}`);
            const lastTime = localRes.rows[0].last_time;

            let query = `SELECT ${table.columns.join(', ')} FROM ${table.name}`;
            let queryParams = [];

            if (lastTime) {
                console.log(`📌 Local me last data: ${lastTime.toLocaleString()} tak ka hai.`);
                query += " WHERE timestamp > $1 ORDER BY timestamp ASC";
                queryParams.push(lastTime);
            } else {
                console.log("📌 Local database khali hai. AWS se poora data fetch kar rahe hain...");
                query += " ORDER BY timestamp ASC";
            }

            // 2️⃣ AWS se naya data fetch karo
            console.log(`⏳ AWS se naya data download ho raha hai...`);
            const awsRes = await awsClient.query(query, queryParams);
            const newData = awsRes.rows;

            if (newData.length === 0) {
                console.log(`✅ [${table.name}] pehle se 100% Up-to-date hai! (No new data)`);
                continue; // Agli table par jao
            }

            console.log(`🔥 ${newData.length} naye rows mil gaye! Local me append kar rahe hain...`);

            // 3️⃣ Naya data Local me insert karo (Batch processing - 2000 rows at a time for speed)
            const BATCH_SIZE = 2000;
            for (let i = 0; i < newData.length; i += BATCH_SIZE) {
                const batch = newData.slice(i, i + BATCH_SIZE);
                let insertQuery = `INSERT INTO ${table.name} (${table.columns.join(', ')}) VALUES `;
                const values = [];
                let paramIndex = 1;
                const rowValues = [];

                for (const row of batch) {
                    const rowParams = table.columns.map(() => `$${paramIndex++}`);
                    rowValues.push(`(${rowParams.join(', ')})`);
                    table.columns.forEach(col => values.push(row[col]));
                }

                insertQuery += rowValues.join(", ") + ";";
                await localClient.query(insertQuery, values);
                console.log(`  -> Inserted ${Math.min(i + BATCH_SIZE, newData.length)} / ${newData.length} rows...`);
            }
            console.log(`✅ [${table.name}] ka naya data successfully append ho gaya!`);
        }

        console.log(`\n🚀🚀 [SUPER SUCCESS] Local Database is now 100% synchronized! Aap AWS ka data delete kar sakte hain.`);

    } catch (error) {
        console.error("❌ SYNC ERROR:", error.message);
    } finally {
        await localClient.end();
        await awsClient.end();
    }
}

// 🚦 RUN IMMEDIATELY
smartSyncNow();

