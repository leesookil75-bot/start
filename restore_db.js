require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');
const fs = require('fs');

async function main() {
    try {
        const data = JSON.parse(fs.readFileSync('out.json', 'utf8'));
        const originalId = data.id; // "1bb83e78-08d2-46b8-a9ac-d698d2bf30ec"
        const rawJsonString = data.path_data; // The massive string!
        
        await sql`UPDATE cleaning_zones SET path_data = ${rawJsonString} WHERE id = ${originalId}`;
        console.log(`Restored massive trace to ${originalId}!`);
    } catch(e) {
        console.error(e);
    }
}
main();
