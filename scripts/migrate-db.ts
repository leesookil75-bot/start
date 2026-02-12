
import { sql } from '@vercel/postgres';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { User, UsageRecord, Notice, DailyOverride } from '../src/lib/types';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const USERS_FILE_PATH = path.join(process.cwd(), 'users.json');
const DATA_FILE_PATH = path.join(process.cwd(), 'data.json');
const NOTICES_FILE_PATH = path.join(process.cwd(), 'notices.json');
const OVERRIDES_FILE_PATH = path.join(process.cwd(), 'daily_overrides.json');

async function readJsonFile<T>(filePath: string): Promise<T[]> {
    try {
        await fs.access(filePath);
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.warn(`File not found or empty: ${filePath}`);
        return [];
    }
}

async function migrateUsers() {
    console.log('Migrating Users...');
    const users = await readJsonFile<User>(USERS_FILE_PATH);

    for (const user of users) {
        try {
            const password = user.password || user.phoneNumber.slice(-4);
            // Upsert user (update if exists, insert if not)
            await sql`
        INSERT INTO users (id, phone_number, name, cleaning_area, role, created_at, password)
        VALUES (${user.id}, ${user.phoneNumber}, ${user.name}, ${user.cleaningArea}, ${user.role}, ${user.createdAt}, ${password})
        ON CONFLICT (id) DO UPDATE 
        SET phone_number = EXCLUDED.phone_number,
            name = EXCLUDED.name,
            cleaning_area = EXCLUDED.cleaning_area,
            role = EXCLUDED.role,
            password = EXCLUDED.password;
      `;
        } catch (e) {
            console.error(`Failed to migrate user ${user.name}:`, e);
        }
    }
    console.log(`Migrated ${users.length} users.`);
}

async function migrateRecords() {
    console.log('Migrating Usage Records...');
    const records = await readJsonFile<UsageRecord>(DATA_FILE_PATH);

    for (const record of records) {
        try {
            await sql`
        INSERT INTO usage_records (id, size, user_id, user_name, timestamp)
        VALUES (${record.id}, ${record.size}, ${record.userId}, ${record.userName}, ${record.timestamp})
        ON CONFLICT (id) DO NOTHING;
      `;
        } catch (e) {
            console.error(`Failed to migrate record ${record.id}:`, e);
        }
    }
    console.log(`Migrated ${records.length} records.`);
}

async function migrateNotices() {
    console.log('Migrating Notices...');
    const notices = await readJsonFile<Notice>(NOTICES_FILE_PATH);

    for (const notice of notices) {
        try {
            await sql`
        INSERT INTO notices (id, title, content, image_data, is_pinned, created_at, author_id)
        VALUES (${notice.id}, ${notice.title}, ${notice.content}, ${notice.imageData || null}, ${notice.isPinned || false}, ${notice.createdAt}, ${notice.authorId})
        ON CONFLICT (id) DO UPDATE
        SET title = EXCLUDED.title,
            content = EXCLUDED.content,
            image_data = EXCLUDED.image_data,
            is_pinned = EXCLUDED.is_pinned;
      `;
        } catch (e) {
            console.error(`Failed to migrate notice ${notice.title}:`, e);
        }
    }
    console.log(`Migrated ${notices.length} notices.`);
}

async function migrateOverrides() {
    console.log('Migrating Daily Overrides...');
    const overrides = await readJsonFile<DailyOverride>(OVERRIDES_FILE_PATH);

    for (const override of overrides) {
        try {
            // Must ensure value is string
            const val = String(override.value);
            await sql`
        INSERT INTO daily_overrides (date, user_id, type, value, updated_at)
        VALUES (${override.date}, ${override.userId}, ${override.type}, ${val}, NOW())
        ON CONFLICT (date, user_id, type)
        DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
        `;
        } catch (e) {
            console.error(`Failed to migrate override for ${override.date}:`, e);
        }
    }
    console.log(`Migrated ${overrides.length} overrides.`);
}

async function main() {
    if (!process.env.POSTGRES_URL) {
        console.error('Error: POSTGRES_URL not found in .env.local');
        process.exit(1);
    }

    // Mask the password in the log
    const urlParts = process.env.POSTGRES_URL.split('@');
    const host = urlParts.length > 1 ? urlParts[1] : 'unknown host';
    console.log('Starting migration to:', host);

    await migrateUsers();
    await migrateRecords();
    await migrateNotices();
    await migrateOverrides();

    console.log('Migration Complete!');
    process.exit(0);
}

main().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
