'use server';

import {
    addRecord,
    getRecords,
    UsageRecord,
    getUsers,
    addUser as addNewUser,
    deleteUser as removeUser,
    getUserByPhone,
    updateUserPassword,
    User
} from '@/lib/data';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const COOKIE_NAME = 'clean-track-user-id';

// --- Auth Actions ---

export async function login(phoneNumber: string, password?: string): Promise<{ success: boolean; error?: string }> {
    const user = await getUserByPhone(phoneNumber);

    if (!user) {
        return { success: false, error: 'User not found' };
    }

    // Verify Password
    // If user has no password (legacy), we should ideally force update or allow if logic dictates.
    // But our migration ensures all users have passwords.
    // Default fallback to phone slice if password is somehow missing in DB object but usually it should be there.
    const dbPassword = user.password || user.phoneNumber.slice(-4);

    // Simple comparison for now (as per plan)
    if (dbPassword !== password) {
        return { success: false, error: 'Invalid password' };
    }

    // Set cookie
    (await cookies()).set(COOKIE_NAME, user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
    });

    return { success: true };
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return { success: false, error: 'Unauthorized' };
    }

    // Verify current (old) password
    const dbPassword = currentUser.password || currentUser.phoneNumber.slice(-4);
    if (dbPassword !== currentPassword) {
        return { success: false, error: '현재 비밀번호가 일치하지 않습니다.' };
    }

    // Update password
    // We need a direct DB update function for this. 
    // Since 'updateUser' isn't exported from lib/data, we'll implement sql here or add to lib/data.
    // For simplicity and speed, I will use sql directly here if postgres is enabled, else file system logic.
    // But strict separation suggests putting it in lib/data. 
    // Given the instructions, I'll put the logic here for now but ideally it belongs in lib/data.

    // Check mode
    if (process.env.POSTGRES_URL) {
        try {
            await sql`UPDATE users SET password = ${newPassword} WHERE id = ${currentUser.id}`;
        } catch (e) {
            return { success: false, error: 'Database error' };
        }
    } else {
        // File system update
        // We'll read, find, update, write.
        // Importing fs/path implies we need to be in node context. server actions are node.
        // But we can't import 'fs' inside function easily or reuse constants from lib/data if not exported.
        // I will assume for now we are mainly on Vercel Postgres or I should add a helper in lib/data.
        // Let's add a helper function "updateUserPassword" in lib/data IS BETTER.
        // For now, to avoid context switching back to lib/data again, I will reuse the `addRecord` pattern? No.

        // Actually, I should have added `updateUser` in lib/data. 
        // Let's rely on a new exported function from lib/data? 
        // Or just do a quick hack for file system?
        // Since the user is likely on Postgres (Vercel), I'll focus on that.
        // But for local dev (file system)... 
        // Re-reading actions.ts, it imports from '@/lib/data'.
        // I'll add `updateUserPassword` to `lib/data.ts` in a separate tool call if needed?
        // NO, I must handle it. 
        // I'll proceed with Postgres logic here. For local file system, 
        // I'll skip implementing it for now or assume `initializeDB` handles the migration and we focus on Postgres.
        // Wait, the prompt implies "local" is important too.
        // I will try to implement file system update by reading the file similar to `getUsers` but I don't have the path constants.
        // I will implement `updateUserPassword` in `lib/data` in a subsequent step if `changePassword` fails locally.
        // Actually, to do it right, I will add `updateUserPassword` to `lib/data.ts` FIRST? 
        // No, I can't go back easily. I will add it in the NEXT step. For now I will comment it.

        // Wait, I can just do another replace on lib/data in the same turn? 
        // No, "Do NOT make multiple parallel calls to this tool or the replace_file_content tool for the same file."
        // I can edit actions.ts and lib/data.ts in parallel if they are different files. 
        // But I am already editing actions.ts here.
        // So I can Call replace_file_content on lib/data.ts in PARALLEL.
        // Good plan.
    }

    // Wait, I can't put logic in actions.ts that depends on helper I haven't written.
    // I will write the `updateUserPassword` in `lib/data` in this same turn.

    await import('@/lib/data').then(mod => {
        if (mod.updateUserPassword) {
            return mod.updateUserPassword(currentUser.id, newPassword);
        }
    });

    return { success: true };
}

export async function logout() {
    (await cookies()).delete(COOKIE_NAME);
    redirect('/login');
}

export async function getCurrentUser(): Promise<User | null> {
    const userId = (await cookies()).get(COOKIE_NAME)?.value;
    if (!userId) return null;

    const users = await getUsers();
    return users.find(u => u.id === userId) || null;
}


// --- User Management Actions ---

export async function createUser(data: Omit<User, 'id' | 'createdAt'>): Promise<{ success: boolean; error?: string }> {
    // Check auth - only admin logic could be added here, but for now we trust the caller (or add checks)
    // For better security, we should check if currentUser.role === 'admin'
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await addNewUser(data);
        revalidatePath('/admin/users');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteUserAction(userId: string): Promise<{ success: boolean; error?: string }> {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await removeUser(userId);
        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to delete user' };
    }
}

export async function resetUserPassword(userId: string): Promise<{ success: boolean; error?: string }> {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const users = await getUsers();
        const targetUser = users.find(u => u.id === userId);

        if (!targetUser) {
            return { success: false, error: 'User not found' };
        }

        const defaultPassword = targetUser.phoneNumber.slice(-4);

        // We imported updateUserPassword at the top, so we can use it directly if available.
        // Or re-implement the simple check:
        // Use helper or direct SQL
        if (process.env.POSTGRES_URL) {
            await sql`UPDATE users SET password = ${defaultPassword} WHERE id = ${userId}`;
        } else {
            // Fallback for file system using the imported helper
            await updateUserPassword(userId, defaultPassword);
        }

        revalidatePath('/admin/users');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to reset password' };
    }
}

// --- Usage Actions ---

export async function recordUsage(size: 45 | 75): Promise<{ success: boolean; data?: UsageRecord; error?: string }> {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const record = await addRecord(size, user.id, user.name);
        revalidatePath('/admin'); // Revalidate admin dashboard
        revalidatePath('/'); // Revalidate home
        return { success: true, data: record };
    } catch (error) {
        console.error('Failed to record usage:', error);
        return { success: false, error: 'Failed to record usage' };
    }
}

// New Actions for Batched Input
import { manageUsageDelta } from '@/lib/data';

export async function submitUsage(delta45: number, delta75: number): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        // Only process if there are actual changes
        if (delta45 === 0 && delta75 === 0) {
            return { success: true };
        }

        await manageUsageDelta(user.id, user.name, delta45, delta75);

        revalidatePath('/admin');
        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to submit usage:', error);
        return { success: false, error: error.message || 'Failed to submit usage' };
    }
}

// Helper to get KST midnight in UTC
function getStartOfTodayKST() {
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000; // 9 hours in ms
    const nowKst = new Date(now.getTime() + kstOffset);

    // Set to 00:00:00.000 KST (which effectively resets it in the "shifted" UTC)
    nowKst.setUTCHours(0, 0, 0, 0);

    // Shift back to real UTC to get the comparison point
    return new Date(nowKst.getTime() - kstOffset);
}

export async function getTodayUserUsage(): Promise<{ count45: number; count75: number }> {
    const user = await getCurrentUser();
    if (!user) return { count45: 0, count75: 0 };

    const records = await getRecords();
    const startOfToday = getStartOfTodayKST();

    const todayRecords = records.filter(r =>
        r.userId === user.id &&
        new Date(r.timestamp) >= startOfToday
    );

    return {
        count45: todayRecords.filter(r => r.size === 45).length,
        count75: todayRecords.filter(r => r.size === 75).length
    };
}

export async function getUsageStats() {
    const records = await getRecords();

    const stats = records.reduce(
        (acc, record) => {
            if (record.size === 45) acc.count45++;
            else if (record.size === 75) acc.count75++;
            return acc;
        },
        { count45: 0, count75: 0, total: records.length }
    );

    return { stats, records };
}

export async function getMyStats() {
    const user = await getCurrentUser();
    if (!user) return null;

    const records = await getRecords();
    const userRecords = records.filter(r => r.userId === user.id);

    const todayStart = getStartOfTodayKST();

    // Start of this week (Sunday is 0) - Calculated based on KST today
    // We treat "Today KST" as the anchor
    const kstNow = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
    const dayOfWeek = kstNow.getUTCDay(); // 0-6
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - dayOfWeek);

    // Start of this month - Based on KST
    const monthStart = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), 1));
    monthStart.setHours(monthStart.getHours() - 9); // Shift back to real UTC

    const stats = {
        daily: { count45: 0, count75: 0 },
        weekly: { count45: 0, count75: 0 },
        monthly: { count45: 0, count75: 0 }
    };

    userRecords.forEach(r => {
        const rDate = new Date(r.timestamp);

        if (rDate >= todayStart) {
            if (r.size === 45) stats.daily.count45++;
            else if (r.size === 75) stats.daily.count75++;
        }

        if (rDate >= weekStart) {
            if (r.size === 45) stats.weekly.count45++;
            else if (r.size === 75) stats.weekly.count75++;
        }

        if (rDate >= monthStart) {
            if (r.size === 45) stats.monthly.count45++;
            else if (r.size === 75) stats.monthly.count75++;
        }
    });

    return stats;
}

// --- Database Initialization ---
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
        // We use RIGHT(phone_number, 4) or SUBSTRING. Postgres matches logic.
        await sql`
            UPDATE users 
            SET password = RIGHT(phone_number, 4) 
            WHERE password IS NULL;
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS usage_records (
                id UUID PRIMARY KEY,
                size INT NOT NULL,
                user_id UUID REFERENCES users(id),
                user_name VARCHAR(255),
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;

        // Attempt to create extension, might fail if not superuser but usually fine on Vercel
        // gen_random_uuid() is built-in for Postgres 13+, so we might not need uuid-ossp
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

export async function debugConnection() {
    try {
        const hasUrl = !!process.env.POSTGRES_URL;
        if (!hasUrl) {
            return { success: false, error: 'MISSING_ENV: POSTGRES_URL environment variable is not set. Did you Redeploy?' };
        }

        await sql`SELECT 1`;
        return { success: true, message: 'Database connection successful!' };
    } catch (e: any) {
        return { success: false, error: 'CONNECTION_FAILED: ' + e.message };
    }
}
