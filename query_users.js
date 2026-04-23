require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function run() {
    try {
        const res = await sql`SELECT id, name, role, agency_id FROM users LIMIT 10`;
        console.log("Users:", res.rows);
    } catch (e) {
        console.error("Error querying DB:", e);
    }
}
run();
