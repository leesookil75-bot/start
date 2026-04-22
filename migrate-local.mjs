import { sql } from '@vercel/postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function runMigration() {
    try {
        console.log('Starting SaaS Database Migration...');

        // 1. Create agencies table
        await sql`
            CREATE TABLE IF NOT EXISTS agencies (
                id UUID PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                contact_phone VARCHAR(20),
                plan_type VARCHAR(50) DEFAULT 'basic',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;

        // 2. Insert the Default Agency (가로청소 본사) if it doesn't exist
        const agencyId = '11111111-1111-1111-1111-111111111111'; // Fixed UUID for default agency
        await sql`
            INSERT INTO agencies (id, name, contact_phone, plan_type)
            VALUES (${agencyId}, '가로청소 본사', '010-0000-0000', 'pro')
            ON CONFLICT (id) DO NOTHING;
        `;

        // 3. Add agency_id to main tables
        try { await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);`; } catch (e) { console.log(e.message) }
        try { await sql`ALTER TABLE workplaces ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);`; } catch (e) { console.log(e.message) }
        try { await sql`ALTER TABLE notices ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);`; } catch (e) { console.log(e.message) }
        try { await sql`ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);`; } catch (e) { console.log(e.message) }
        try { await sql`ALTER TABLE cleaning_zones ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);`; } catch (e) { console.log(e.message) }


        // 4. Migrate existing data to the Default Agency (Zero-downtime)
        await sql`UPDATE users SET agency_id = ${agencyId} WHERE agency_id IS NULL;`;
        await sql`UPDATE workplaces SET agency_id = ${agencyId} WHERE agency_id IS NULL;`;
        await sql`UPDATE notices SET agency_id = ${agencyId} WHERE agency_id IS NULL;`;

        console.log('Database migrated successfully for Multi-Tenancy! Existing users linked to "가로청소 본사".');
    } catch (error) {
        console.error('Migration Failed:', error);
    }
}

runMigration();
