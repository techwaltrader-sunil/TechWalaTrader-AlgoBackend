const axios = require('axios');
const readline = require('readline');

async function findTokens() {
    console.log("🚀 Dhan API Master CSV Download ho rahi hai...\n");
    try {
        const response = await axios.get("https://images.dhan.co/api-data/api-scrip-master.csv", { 
            responseType: 'stream' 
        });
        
        console.log("✅ File Downloaded! Scanning for Original Index IDs...\n");
        console.log("---------------------------------------------------------");
        console.log("INDEX NAME \t\t|\t REAL SECURITY_ID \t|\t EXCHANGE");
        console.log("---------------------------------------------------------");

        const rl = readline.createInterface({ input: response.data });

        rl.on('line', (line) => {
            const cols = line.split(',');
            // cols[3] = INSTRUMENT_NAME, cols[5] = TRADING_SYMBOL, cols[2] = SECURITY_ID
            if (cols.length > 5 && cols[3] === 'INDEX') {
                const symbol = String(cols[5]).toUpperCase();
                // Nifty, BankNifty, FinNifty, Midcap aur Bankex sabko scan karega
                if (symbol.includes('MID') || symbol.includes('BANKEX') || symbol === 'NIFTY 50' || symbol === 'NIFTY BANK') {
                    console.log(`${cols[5].padEnd(20)} \t|\t ${cols[2].padEnd(15)} \t|\t ${cols[0]}`);
                }
            }
        });

    } catch (e) {
        console.error("❌ Error fetching CSV:", e.message);
    }
}

findTokens();