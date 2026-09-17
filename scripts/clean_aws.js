const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function cleanAwsDatabase() {
    console.log("🧹 AWS Database Cleanup Started...");
    
    const awsDbUrl = process.env.AWS_DB_URL;
    if (!awsDbUrl) {
        console.error("❌ AWS_DB_URL not found in .env");
        return;
    }

    const client = new Client({ connectionString: awsDbUrl });

    try {
        await client.connect();
        
        // 🚨 Warning: Ye command dono tables ko poora saaf kar degi
        const query = `TRUNCATE TABLE historical_candles, option_chain_data RESTART IDENTITY;`;
        
        await client.query(query);
        console.log("✅ BOOM! 💥 AWS Database has been successfully truncated and is now 100% EMPTY.");
        console.log("✅ ID counters have been reset to 1. Storage is fully recovered!");

    } catch (error) {
        console.error("❌ Cleanup Error:", error.message);
    } finally {
        await client.end();
    }
}

cleanAwsDatabase();