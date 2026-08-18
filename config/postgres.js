const { Pool } = require('pg');
require('dotenv').config();

// 1. Connection Pool banana
const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
});

// 2. Table create karne ka function
const initPostgresDB = async () => {
    try {
        // Postgres se connect karna
        const client = await pool.connect();
        console.log('✅ Postgres Database Connected Successfully!');

        // OHLCV Data ke liye table banana (agar pehle se nahi hai toh)
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS historical_candles (
                id SERIAL PRIMARY KEY,
                symbol VARCHAR(100) NOT NULL,
                timestamp TIMESTAMPTZ NOT NULL,
                open NUMERIC,
                high NUMERIC,
                low NUMERIC,
                close NUMERIC,
                volume BIGINT,
                UNIQUE(symbol, timestamp) 
            );
        `;
        
        await client.query(createTableQuery);
        console.log('📈 Table "historical_candles" is ready for data!');
        
        // Backtest engine ki speed rocket jaisi karne ke liye Index banana
        const createIndexQuery = `CREATE INDEX IF NOT EXISTS idx_symbol_time ON historical_candles(symbol, timestamp DESC);`;
        await client.query(createIndexQuery);
        
        client.release();
    } catch (error) {
        console.error('❌ Postgres Connection Error:', error);
    }
};

module.exports = { pool, initPostgresDB };