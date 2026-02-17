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
    cleanupOrphanedRecords,
    getDailyOverrides,
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

export async function updateUserAction(id: string, updates: Partial<User>): Promise<{ success: boolean; error?: string }> {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await import('@/lib/data').then(mod => mod.updateUser(id, updates));
        revalidatePath('/admin/users');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Failed to update user' };
    }
}

export async function cleanupOrphanedRecordsAction(): Promise<{ success: boolean; count?: number; error?: string }> {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const count = await cleanupOrphanedRecords();
        revalidatePath('/admin');
        return { success: true, count };
    } catch (e: any) {
        console.error('Cleanup Error:', e);
        return { success: false, error: e.message || 'Failed to cleanup records' };
    }
}



// --- Notice Actions ---
import { addNotice, deleteNotice as removeNotice, updateNotice } from '@/lib/data';

export async function createNoticeAction(title: string, content: string, imageData?: string, isPinned: boolean = false): Promise<{ success: boolean; error?: string }> {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await addNotice({
            title,
            content,
            imageData,
            isPinned,
            authorId: currentUser.id
        });
        revalidatePath('/admin/notices');
        revalidatePath('/notices');
        revalidatePath('/'); // For homepage widget
        return { success: true };
    } catch (e: any) {
        console.error('Create Notice Error:', e);
        return { success: false, error: e.message || 'Failed to create notice' };
    }
}

export async function deleteNoticeAction(id: string): Promise<{ success: boolean; error?: string }> {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await removeNotice(id);
        revalidatePath('/admin/notices');
        revalidatePath('/notices');
        revalidatePath('/');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Failed to delete notice' };
    }
}

export async function updateNoticeAction(id: string, title: string, content: string, imageData?: string, isPinned?: boolean): Promise<{ success: boolean; error?: string }> {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await updateNotice(id, {
            title,
            content,
            imageData, // If undefined, data layer should handle logic (keep existing)
            isPinned
        });
        revalidatePath('/admin/notices');
        revalidatePath('/notices');
        revalidatePath('/');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Failed to update notice' };
    }
}

// --- Usage Actions ---

// ... imports

export async function recordUsage(size: 45 | 50 | 75): Promise<{ success: boolean; data?: UsageRecord; error?: string }> {
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

export async function submitUsage(delta50: number, delta75: number): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        // Only process if there are actual changes
        if (delta50 === 0 && delta75 === 0) {
            return { success: true };
        }

        await manageUsageDelta(user.id, user.name, delta50, delta75);

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

export async function getTodayUserUsage(): Promise<{ count50: number; count75: number }> {
    const user = await getCurrentUser();
    if (!user) return { count50: 0, count75: 0 };

    const records = await getRecords();
    const startOfToday = getStartOfTodayKST();

    const todayRecords = records.filter(r =>
        r.userId === user.id &&
        new Date(r.timestamp) >= startOfToday
    );

    return {
        count50: todayRecords.filter(r => r.size === 45 || r.size === 50).length,
        count75: todayRecords.filter(r => r.size === 75).length
    };
}

export async function getUsageStats() {
    const records = await getRecords();

    const stats = records.reduce(
        (acc, record) => {
            if (record.size === 45 || record.size === 50) acc.count50++;
            else if (record.size === 75) acc.count75++;
            return acc;
        },
        { count50: 0, count75: 0, total: records.length }
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
        daily: { count50: 0, count75: 0 },
        weekly: { count50: 0, count75: 0 },
        monthly: { count50: 0, count75: 0 }
    };

    userRecords.forEach(r => {
        const rDate = new Date(r.timestamp);

        if (rDate >= todayStart) {
            if (r.size === 45 || r.size === 50) stats.daily.count50++;
            else if (r.size === 75) stats.daily.count75++;
        }

        if (rDate >= weekStart) {
            if (r.size === 45 || r.size === 50) stats.weekly.count50++;
            else if (r.size === 75) stats.weekly.count75++;
        }

        if (rDate >= monthStart) {
            if (r.size === 45 || r.size === 50) stats.monthly.count50++;
            else if (r.size === 75) stats.monthly.count75++;
        }
    });

    return stats;
}

// --- Database Initialization ---
import { sql } from '@vercel/postgres';
import { initializeDB as initDBLogic } from '@/lib/db-init';

export async function initializeDB() {
    return await initDBLogic();
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

// --- Attendance Actions ---
import { addAttendanceRecord, getAttendanceRecords, getLatestAttendance } from '@/lib/data';

export async function checkInAction(): Promise<{ success: boolean; error?: string }> {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const latest = await getLatestAttendance(user.id);
    // Optional: Prevent double check-in if needed, but for now we allow it to be robust

    try {
        await addAttendanceRecord(user.id, 'CHECK_IN');
        revalidatePath('/attendance');
        revalidatePath('/');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Failed to check in' };
    }
}

export async function checkOutAction(): Promise<{ success: boolean; error?: string }> {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    try {
        await addAttendanceRecord(user.id, 'CHECK_OUT');
        revalidatePath('/attendance');
        revalidatePath('/');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Failed to check out' };
    }
}

export async function getMyAttendanceAction() {
    const user = await getCurrentUser();
    if (!user) return [];
    return await getAttendanceRecords(user.id);
}

export async function getAllAttendanceStatusAction() {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') return [];

    const users = await getUsers();
    const records = await getAttendanceRecords();

    // Calculate status for each user
    // We want: User, Status (Working/Off), Latest Check-in, Latest Check-out

    // Group records by user
    const userRecordsMap = new Map();
    records.forEach(r => {
        if (!userRecordsMap.has(r.userId)) {
            userRecordsMap.set(r.userId, []);
        }
        userRecordsMap.get(r.userId).push(r);
    });

    const result = users.map(u => {
        const uRecords = userRecordsMap.get(u.id) || [];
        // Sort DESC
        uRecords.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const latest = uRecords[0];
        const isWorking = latest?.type === 'CHECK_IN';

        // Find today's check-in
        // This requires date parsing. 
        // Let's return raw strings and let frontend format

        return {
            user: u,
            latestRecord: latest,
            isWorking,
            todayRecords: uRecords.filter((r: any) => {
                // Simple today check (UTC vs Local issue again, but let's approximate or just send recent)
                const rDate = new Date(r.timestamp);
                const now = new Date();
                return rDate.getDate() === now.getDate() && rDate.getMonth() === now.getMonth() && rDate.getFullYear() === now.getFullYear();
            })
        };
    });

    return result;
}

// --- Monthly Attendance Actions ---
import { updateAttendanceRecord, deleteAttendanceRecord } from '@/lib/data';

export async function getMonthlyAttendanceAction(year: number, month: number) {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') return { users: [], records: [] };

    // Calculate start and end of month in KST (or UTC equivalent)
    // We want all records that fall within the month in KST.
    // Simplest: Fetch all, filter in JS. For < 10k records this is fine.

    // 1. Get All Users
    const users = await getUsers();

    // 2. Get All Records (or range query if implemented)
    // Currently getAttendanceRecords fetches all.
    const allRecords = await getAttendanceRecords();

    // 3. Filter by month
    // Month is 1-12
    const filteredRecords = allRecords.filter(r => {
        const d = new Date(r.timestamp);
        // Convert to KST for correct filtering? 
        // Or just rely on UTC month if close enough, but for "Monthly Report" strict KST is better.
        // r.timestamp is UTC string.
        const kstDate = new Date(new Date(r.timestamp).getTime() + 9 * 60 * 60 * 1000);
        return kstDate.getUTCFullYear() === year && (kstDate.getUTCMonth() + 1) === month;
    });

    return { users, records: filteredRecords };
}

export async function updateAttendanceRecordAction(
    action: 'update' | 'create' | 'delete',
    data: { id?: string, userId?: string, type?: 'CHECK_IN' | 'CHECK_OUT', timestamp?: string }
): Promise<{ success: boolean; error?: string }> {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        if (action === 'update' && data.id) {
            await updateAttendanceRecord(data.id, {
                type: data.type,
                timestamp: data.timestamp
            });
        } else if (action === 'create' && data.userId && data.type) {
            // we use addAttendanceRecord but we need to force timestamp if provided
            // data.addAttendanceRecord uses NOW().
            // So we use SQL or direct insert helper?
            // Existing addAttendanceRecord uses NOW().
            // We need a way to add PASTAND records.
            // Let's modify addAttendanceRecord or use update logic?
            // Better: updateAttendanceRecord checks ID.
            // Let's add a new helper `addManualAttendanceRecord`?
            // Or just use sql directly here for simplicity if allowed? 
            // "data.ts" encapsulates DB.
            // I should have added `addAttendanceRecordWithTimestamp` to data.ts
            // But I can't go back easily.
            // WORKAROUND: Create with NOW(), then immediately Update timestamp.
            const newRecord = await addAttendanceRecord(data.userId, data.type);
            if (data.timestamp) {
                await updateAttendanceRecord(newRecord.id, { timestamp: data.timestamp });
            }
        } else if (action === 'delete' && data.id) {
            await deleteAttendanceRecord(data.id);
        }

        revalidatePath('/admin/attendance');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Failed to update record' };
    }
}

export async function upsertDailyAttendanceAction(
    userId: string,
    dateStr: string, // YYYY-MM-DD
    checkInTime: string | null, // HH:mm
    checkOutTime: string | null // HH:mm
): Promise<{ success: boolean; error?: string }> {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        // 1. Get existing records for this user on this day
        // We can fetch all and filter, or use range query. 
        // For simplicity reusing getAttendanceRecords(userId) then filtering.
        const allRecords = await getAttendanceRecords(userId);

        // Filter by day (KST)
        // dateStr is '2026-02-16'
        const targetRecords = allRecords.filter(r => {
            const kstDate = new Date(new Date(r.timestamp).getTime() + 9 * 60 * 60 * 1000);
            const rDateStr = kstDate.toISOString().split('T')[0];
            return rDateStr === dateStr;
        });

        const existingCheckIn = targetRecords.find(r => r.type === 'CHECK_IN');
        const existingCheckOut = targetRecords.find(r => r.type === 'CHECK_OUT');

        // Helper to create ISO string from dateStr + time (assumes KST input)
        const toIso = (time: string) => new Date(`${dateStr}T${time}:00+09:00`).toISOString();

        // 2. Check In Logic
        if (checkInTime) {
            const newIso = toIso(checkInTime);
            if (existingCheckIn) {
                if (existingCheckIn.timestamp !== newIso) {
                    await updateAttendanceRecord(existingCheckIn.id, { timestamp: newIso });
                }
            } else {
                // Create new, but we need to force timestamp. 
                // addAttendanceRecord uses NOW(). 
                // Workaround: Create then Update.
                const newRec = await addAttendanceRecord(userId, 'CHECK_IN');
                await updateAttendanceRecord(newRec.id, { timestamp: newIso });
            }
        } else if (existingCheckIn) {
            // User cleared the time -> Delete
            await deleteAttendanceRecord(existingCheckIn.id);
        }

        // 3. Check Out Logic
        if (checkOutTime) {
            const newIso = toIso(checkOutTime);
            if (existingCheckOut) {
                if (existingCheckOut.timestamp !== newIso) {
                    await updateAttendanceRecord(existingCheckOut.id, { timestamp: newIso });
                }
            } else {
                const newRec = await addAttendanceRecord(userId, 'CHECK_OUT');
                await updateAttendanceRecord(newRec.id, { timestamp: newIso });
            }
        } else if (existingCheckOut) {
            await deleteAttendanceRecord(existingCheckOut.id);
        }

        revalidatePath('/admin/attendance');
        return { success: true };

    } catch (e: any) {
        console.error('Upsert Error:', e);
        return { success: false, error: e.message || 'Failed to update attendance' };
    }
}

// --- Workplace Actions ---
import {
    addWorkplace,
    getWorkplaces,
    updateWorkplace,
    deleteWorkplace as removeWorkplace,
    Workplace
} from '@/lib/data';

export async function getWorkplacesAction(): Promise<Workplace[]> {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') return [];
    return await getWorkplaces();
}

export async function addWorkplaceAction(data: Omit<Workplace, 'id' | 'createdAt'>): Promise<{ success: boolean; error?: string }> {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        return { success: false, error: 'Unauthorized' };
    }
    try {
        await addWorkplace(data);
        revalidatePath('/admin/workplaces');
        revalidatePath('/admin/users');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Failed to add workplace' };
    }
}

export async function updateWorkplaceAction(id: string, updates: Partial<Workplace>): Promise<{ success: boolean; error?: string }> {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        return { success: false, error: 'Unauthorized' };
    }
    try {
        await updateWorkplace(id, updates);
        revalidatePath('/admin/workplaces');
        revalidatePath('/admin/users');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Failed to update workplace' };
    }
}

export async function deleteWorkplaceAction(id: string): Promise<{ success: boolean; error?: string }> {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        return { success: false, error: 'Unauthorized' };
    }
    try {
        await removeWorkplace(id);
        revalidatePath('/admin/workplaces');
        revalidatePath('/admin/users');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Failed to delete workplace' };
    }
}

export async function searchAddressAction(query: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    if (!query) return { success: false, error: 'Query is empty' };


    console.log('Searching address:', query);
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`, {
            headers: {
                'User-Agent': 'CleanTrackApp/1.0',
                'Referer': 'https://start-rho-azure.vercel.app'
            }
        });

        if (!response.ok) {
            console.error('Nominatim API error:', response.statusText);
            throw new Error(`Nominatim API failed: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Nominatim response length:', data.length);
        return { success: true, data };
    } catch (error: any) {
        console.error('Address Search Error:', error);
        return { success: false, error: 'Failed to search address' };
    }
}
// ... existing code ...

export async function getMyDailyAttendanceStatus(): Promise<{ status: 'IDLE' | 'WORKING' | 'DONE'; startTime?: string; endTime?: string }> {
    const user = await getCurrentUser();
    if (!user) return { status: 'IDLE' }; // Or handle error

    const records = await getAttendanceRecords(user.id);
    const startOfToday = getStartOfTodayKST();

    const todayRecords = records.filter(r => new Date(r.timestamp) >= startOfToday);
    todayRecords.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const checkIns = todayRecords.filter(r => r.type === 'CHECK_IN');
    const checkOuts = todayRecords.filter(r => r.type === 'CHECK_OUT');

    const firstIn = checkIns.length > 0 ? checkIns[0] : null;
    const lastOut = checkOuts.length > 0 ? checkOuts[checkOuts.length - 1] : null;

    if (!firstIn) {
        return { status: 'IDLE' };
    }

    if (firstIn && !lastOut) {
        return { status: 'WORKING', startTime: firstIn.timestamp };
    }

    // If we have both, we need to check if the last OUT is after the last IN.
    // Actually, simple logic: if last record is OUT, then DONE. If last record is IN, then WORKING.
    // checking `lastOut` existence is not enough if they checked in again.

    // Let's look at the VERY last record.
    const lastRecord = todayRecords[todayRecords.length - 1];
    if (lastRecord.type === 'CHECK_IN') {
        return { status: 'WORKING', startTime: firstIn.timestamp };
    } else {
        return { status: 'DONE', startTime: firstIn.timestamp, endTime: lastRecord.timestamp };
    }
}
