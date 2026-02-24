import { getCurrentUser } from '../../actions';
import { getNotices } from '@/lib/data';
import { redirect } from 'next/navigation';
import AdminNoticesClient from './client';
import MobileNoticeManager from './MobileNoticeManager';
import adminStyles from '../admin.module.css';

export const dynamic = 'force-dynamic';

export default async function AdminNoticesPage() {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
        redirect('/login');
    }

    const notices = await getNotices();

    return (
        <>
            {/* Mobile View */}
            <div className={adminStyles.mobileOnlyWrapper}>
                <MobileNoticeManager initialNotices={notices} />
            </div>

            {/* PC View */}
            <div className={adminStyles.pcOnlyWrapper}>
                <AdminNoticesClient notices={notices} />
            </div>
        </>
    );
}
