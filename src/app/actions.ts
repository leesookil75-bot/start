'use server';

import {
    addRecord,
    getRecords,
    UsageRecord,
    getUsers,
    addUser as addNewUser,
    deleteUser as removeUser,
    getUserByPhone,
    User
} from '@/lib/data';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const COOKIE_NAME = 'clean-track-user-id';

// --- Auth Actions ---

export async function login(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
    const user = await getUserByPhone(phoneNumber);

    if (!user) {
        return { success: false, error: 'User not found' };
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
    } catch (error) {
        console.error('Failed to submit usage:', error);
        return { success: false, error: 'Failed to submit usage' };
    }
}

export async function getTodayUserUsage(): Promise<{ count45: number; count75: number }> {
    const user = await getCurrentUser();
    if (!user) return { count45: 0, count75: 0 };

    const records = await getRecords();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const todayRecords = records.filter(r =>
        r.userId === user.id &&
        r.timestamp.startsWith(todayStr)
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
