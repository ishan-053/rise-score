const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
        console.log("Tables:", tables.rows);
        for (let row of tables.rows) {
            const cols = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1`, [row.table_name]);
            console.log(`Columns for ${row.table_name}:`, cols.rows);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

check();
