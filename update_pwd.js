require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function run() {
    try {
        const res = await sql`UPDATE users SET password = '1220' WHERE phone_number = '010-3520-8808' OR phone_number = '01035208808' RETURNING *`;
        console.log("Updated rows:", res.rows);
    } catch (e) {
        console.error("Error updating DB:", e);
    }
}
run();
