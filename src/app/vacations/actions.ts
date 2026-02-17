'use server';

import {
    addLeaveRequest,
    getLeaveRequests as fetchLeaveRequests,
    updateLeaveRequestStatus,
    LeaveRequest,
    LeaveStatus
} from '@/lib/data';
import { getCurrentUser } from '@/app/actions';
import { revalidatePath } from 'next/cache';

export async function requestVacation(startDate: string, endDate: string, reason: string): Promise<{ success: boolean; error?: string }> {
    const user = await getCurrentUser();
    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await addLeaveRequest({
            userId: user.id,
            startDate,
            endDate,
            reason
        });
        revalidatePath('/vacations');
        revalidatePath('/admin/vacations');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to request vacation' };
    }
}

export async function getVacationRequests(isAdmin: boolean = false): Promise<{ success: boolean; data?: LeaveRequest[]; error?: string }> {
    const user = await getCurrentUser();
    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }

    if (isAdmin && user.role !== 'admin') {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const requests = await fetchLeaveRequests(isAdmin ? undefined : user.id);
        return { success: true, data: requests };
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to fetch requests' };
    }
}

export async function processVacationRequest(id: string, approved: boolean): Promise<{ success: boolean; error?: string }> {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const status: LeaveStatus = approved ? 'APPROVED' : 'REJECTED';
        await updateLeaveRequestStatus(id, status);
        revalidatePath('/admin/vacations');
        revalidatePath('/vacations');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to process request' };
    }
}
