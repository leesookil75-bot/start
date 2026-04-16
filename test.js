require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');
const fs = require('fs');

async function main() {
    try {
        const { rows } = await sql`SELECT * FROM cleaning_zones ORDER BY created_at DESC LIMIT 5`;
        fs.writeFileSync('out.json', JSON.stringify(rows[0], null, 2), 'utf8');
        console.log("Done");
    } catch (e) {
        console.error(e);
    }
}
main();
