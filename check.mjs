import { sql } from '@vercel/postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
    try {
        const { rows } = await sql`SELECT * FROM users WHERE phone_number='010-9999-9999'`;
        console.log(rows);
    } catch (e) { console.error(e) }
}
check();
