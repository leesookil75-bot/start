import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
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
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);`;
        await sql`ALTER TABLE workplaces ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);`;
        await sql`ALTER TABLE notices ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);`;

        // 4. Migrate existing data to the Default Agency (Zero-downtime)
        await sql`UPDATE users SET agency_id = ${agencyId} WHERE agency_id IS NULL;`;
        await sql`UPDATE workplaces SET agency_id = ${agencyId} WHERE agency_id IS NULL;`;
        await sql`UPDATE notices SET agency_id = ${agencyId} WHERE agency_id IS NULL;`;

        // (Bonus) In clean-track, attendance and tasks are scoped to users and workplaces.
        // As long as users/workplaces are scoped to agency, data is mostly isolated.
        // But for safety, we could also attach it to groups or zones, but user_id is enough for now.

        return NextResponse.json({ 
            success: true, 
            message: 'Database migrated successfully for Multi-Tenancy! Existing users linked to "가로청소 본사".' 
        });
    } catch (error: any) {
        console.error('Migration Failed:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
