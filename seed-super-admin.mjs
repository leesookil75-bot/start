import { sql } from '@vercel/postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function createSuperAdmin() {
    try {
        console.log('Creating Super Admin user...');

        const id = crypto.randomUUID();
        const phoneNumber = '010-9999-9999';
        const password = '9999';

        await sql`
            INSERT INTO users (id, phone_number, name, cleaning_area, role, created_at, password)
            VALUES (${id}, ${phoneNumber}, '최고관리자', '본사', 'super_admin', NOW(), ${password})
            ON CONFLICT DO NOTHING;
        `;

        console.log('Super Admin created! Login with 010-9999-9999 / 9999');
    } catch (error) {
        console.error('Failed:', error);
    }
}

createSuperAdmin();
