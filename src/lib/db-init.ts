import { sql } from '@vercel/postgres';

export async function initializeDB() {
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY,
                phone_number VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                cleaning_area VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;

        // 1. Add password column if it doesn't exist
        await sql`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);
        `;

        // 2. Migrate existing users: Set default password to last 4 digits of phone number
        await sql`
            UPDATE users 
            SET password = RIGHT(phone_number, 4) 
            WHERE password IS NULL;
        `;

        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS work_lat DOUBLE PRECISION;`;
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS work_lng DOUBLE PRECISION;`;
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS work_address VARCHAR(255);`;
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_radius INTEGER DEFAULT 100;`;

        await sql`
            CREATE TABLE IF NOT EXISTS usage_records (
                id UUID PRIMARY KEY,
                size INT NOT NULL,
                user_id UUID REFERENCES users(id),
                user_name VARCHAR(255),
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS notices (
                id UUID PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                image_data TEXT,
                is_pinned BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                author_id UUID REFERENCES users(id)
            );
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS daily_overrides (
                date VARCHAR(10) NOT NULL,
                user_id UUID REFERENCES users(id),
                type VARCHAR(10) NOT NULL,
                value TEXT NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (date, user_id, type)
            );
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS attendance_records (
                id UUID PRIMARY KEY,
                user_id UUID REFERENCES users(id),
                type VARCHAR(20) NOT NULL,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS workplaces (
                id UUID PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                address VARCHAR(255),
                lat DOUBLE PRECISION,
                lng DOUBLE PRECISION,
                radius INTEGER DEFAULT 100,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;

        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS workplace_id UUID REFERENCES workplaces(id);`;


        await sql`ALTER TABLE notices ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;`;

        // Attempt to create extension, might fail if not superuser but usually fine on Vercel
        try {
            await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`;
        } catch (e) {
            console.log('UUID extension creation failed or already exists (ignoring):', e);
        }

        await seedAdminUser();

        return { success: true };
    } catch (error: any) {
        console.error('Init DB Failed:', error);
        return { success: false, error: error.message };
    }
}

async function seedAdminUser() {
    try {
        const { rows } = await sql`SELECT COUNT(*) FROM users`;
        const count = parseInt(rows[0].count);

        if (count === 0) {
            const adminId = crypto.randomUUID();
            // Default admin password is last 4 of phone: 5678
            await sql`
                INSERT INTO users (id, phone_number, name, cleaning_area, role, password)
                VALUES (${adminId}, '010-1234-5678', '관리자', '관리실', 'admin', '5678')
            `;
            console.log('Seeded default admin user');
        }
    } catch (e) {
        console.error('Failed to seed admin:', e);
    }
}
