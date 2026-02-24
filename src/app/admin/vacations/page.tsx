'use server';

import { getVacationRequests } from '@/app/vacations/actions';

import AdminVacationClient from './client';
import MobileVacationManager from './MobileVacationManager';
import adminStyles from '../admin.module.css';

export default async function AdminVacationPage() {
    // Fetch all requests (admin view)
    const result = await getVacationRequests(true);
    const requests = result.data || [];

    return (
        <>
            {/* Mobile View */}
            <div className={adminStyles.mobileOnlyWrapper}>
                <MobileVacationManager initialRequests={requests} />
            </div>

            {/* PC View */}
            <div className={adminStyles.pcOnlyWrapper}>
                <AdminVacationClient initialRequests={requests} />
            </div>
        </>
    );
}
