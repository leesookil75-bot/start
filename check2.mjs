import { sql } from '@vercel/postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
    try {
        const { rows } = await sql`SELECT phone_number, name, role FROM users LIMIT 5`;
        console.log(rows);
    } catch (e) { console.error(e) }
}
check();
