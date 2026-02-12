
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const OLD_DB_URL = process.env.OLD_DB_URL;
const NEW_DB_URL = process.env.POSTGRES_URL;

if (!OLD_DB_URL) {
    console.error('Error: OLD_DB_URL environment variable is required.');
    process.exit(1);
}

if (!NEW_DB_URL) {
    console.error('Error: POSTGRES_URL environment variable is required.');
    process.exit(1);
}

// Create connection pools
const oldDbPool = new Pool({
    connectionString: OLD_DB_URL,
    ssl: { rejectUnauthorized: false }, // Vercel/Neon requires SSL
});

const newDbPool = new Pool({
    connectionString: NEW_DB_URL,
    ssl: { rejectUnauthorized: false },
});

async function main() {
    console.log('Starting migration from OLD DB to NEW DB...');
    const oldClient = await oldDbPool.connect();
    const newClient = await newDbPool.connect();

    try {
        // --- 1. Migrate Users ---
        console.log('Migrating Users...');
        // Check if old DB has 'password' column (it might not if very old)
        // We'll select * and handle missing fields
        const oldUsersRes = await oldClient.query('SELECT * FROM users');
        const oldUsers = oldUsersRes.rows;

        for (const user of oldUsers) {
            // Check if user exists in new DB
            const checkRes = await newClient.query('SELECT id FROM users WHERE phone_number = $1', [user.phone_number]);

            if (checkRes.rows.length === 0) {
                // Insert user
                // Map fields. Ensure we handle missing password if old DB didn't have it.
                // Default password to last 4 digits of phone number if missing.
                const password = user.password || user.phone_number.slice(-4);

                // Handle UUID: if old id is not uuid, we generate new one.
                // But wait, usage_records link to user_id. capturing old id is crucial if we want to migrate records.
                // If old DB used generated UUIDs, we can reuse them.
                // If old DB used something else (some simple string), we might have issues if new DB enforces UUID.
                // Let's assume old DB used UUIDs as it was likely also Vercel Postgres/Neon.
                // If not, we might fail here.

                await newClient.query(`
                    INSERT INTO users (id, phone_number, name, cleaning_area, role, password, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (id) DO NOTHING
                 `, [user.id, user.phone_number, user.name, user.cleaning_area, user.role, password, user.created_at]);
                console.log(`Migrated user: ${user.name}`);
            } else {
                // User exists (e.g. admin), skipping or updating?
                // Let's skip to avoid overwriting current logic, assuming phone number uniqueness is the key identity.
                // However, we need to know the mapping of [Old ID] -> [New ID] for records if they differ.
                // If they differ, we can't easily migrate records without a map.
                // But since the Seed admin has a generated UUID which might differ from old Admin UUID...
                // If the Admin user matches by phone, we should probably record the NEW ID for that phone number to use for records.
                console.log(`User already exists: ${user.name} (${user.phone_number}). usage_records for this user will need correct ID.`);
            }
        }

        // Build a mapping of Old User ID -> New User ID based on phone number
        // This handles cases where we skipped insertion because user existed, OR where we inserted with same ID.
        // Actually, best check is: For each old user, find the corresponding user in New DB (by phone) and use THAT id for records.
        const userIdMap = new Map<string, string>();
        for (const oldUser of oldUsers) {
            const newUserRes = await newClient.query('SELECT id FROM users WHERE phone_number = $1', [oldUser.phone_number]);
            if (newUserRes.rows.length > 0) {
                userIdMap.set(oldUser.id, newUserRes.rows[0].id);
            }
        }

        // --- 2. Migrate Usage Records ---
        console.log('Migrating Usage Records...');
        const oldRecordsRes = await oldClient.query('SELECT * FROM usage_records');
        const oldRecords = oldRecordsRes.rows;

        let recordsCount = 0;
        for (const record of oldRecordsRes.rows) {
            const newUserId = userIdMap.get(record.user_id);
            if (newUserId) {
                await newClient.query(`
                    INSERT INTO usage_records (id, size, user_id, user_name, timestamp)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (id) DO NOTHING
                `, [record.id || crypto.randomUUID(), record.size, newUserId, record.user_name, record.timestamp]);
                recordsCount++;
            } else {
                console.warn(`Skipping record ${record.id}: Linked user not found in new DB.`);
            }
        }
        console.log(`Migrated ${recordsCount} usage records.`);

        // --- 3. Migrate Notices ---
        console.log('Migrating Notices...');
        try {
            const oldNoticesRes = await oldClient.query('SELECT * FROM notices');
            for (const notice of oldNoticesRes.rows) {
                const authorId = userIdMap.get(notice.author_id);
                // If author not found, maybe default to the first admin found in new DB? or skip?
                // Let's create without author if allowed, or find an admin.
                // Assuming authorId is nullable or we find a valid one.

                await newClient.query(`
                    INSERT INTO notices (id, title, content, image_data, is_pinned, created_at, author_id)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (id) DO NOTHING
                `, [
                    notice.id || crypto.randomUUID(),
                    notice.title,
                    notice.content,
                    notice.image_data,
                    notice.is_pinned || false,
                    notice.created_at,
                    authorId || null // nullable in schema usually
                ]);
            }
            console.log(`Migrated ${oldNoticesRes.rows.length} notices.`);
        } catch (e: any) {
            console.log('Old DB might not have notices table or compatible schema:', e.message);
        }

        // --- 4. Migrate Daily Overrides (if exists) ---
        console.log('Migrating Daily Overrides...');
        try {
            const oldOverridesRes = await oldClient.query('SELECT * FROM daily_overrides');
            for (const ov of oldOverridesRes.rows) {
                const newUserId = userIdMap.get(ov.user_id);
                if (newUserId) {
                    await newClient.query(`
                         INSERT INTO daily_overrides (date, user_id, type, value, updated_at)
                         VALUES ($1, $2, $3, $4, $5)
                         ON CONFLICT (date, user_id, type) DO UPDATE
                         SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
                     `, [ov.date, newUserId, ov.type, ov.value, ov.updated_at]);
                }
            }
            console.log(`Migrated ${oldOverridesRes.rows.length} overrides.`);
        } catch (e: any) {
            console.log('Old DB might not have daily_overrides table:', e.message);
        }

        console.log('Migration Complete from OLD DB!');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await oldClient.release();
        await newClient.release();
        await oldDbPool.end();
        await newDbPool.end();
    }
}

main();
