'use server';

import { getVacationRequests } from '@/app/vacations/actions';
import AdminVacationClient from './client';

export default async function AdminVacationPage() {
    // Fetch all requests (admin view)
    const result = await getVacationRequests(true);
    const requests = result.data || [];

    return <AdminVacationClient initialRequests={requests} />;
}
