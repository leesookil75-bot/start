// @ts-nocheck
const { db } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function main() {
    const client = await db.connect();

    try {
        console.log('Creating daily_overrides table...');
        await client.sql`
      CREATE TABLE IF NOT EXISTS daily_overrides (
        date TEXT NOT NULL,
        user_id UUID NOT NULL,
        type TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT unique_override UNIQUE (date, user_id, type)
      );
    `;
        console.log('daily_overrides table created successfully.');
    } catch (err) {
        console.error('Error creating table:', err);
    } finally {
        await client.end();
    }
}

main().catch((err) => {
    console.error('An error occurred:', err);
});
