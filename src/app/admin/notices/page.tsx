import { getCurrentUser } from '../../actions';
import { getNotices } from '@/lib/data';
import { redirect } from 'next/navigation';
import AdminNoticesClient from './client';

export const dynamic = 'force-dynamic';

export default async function AdminNoticesPage() {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
        redirect('/login');
    }

    const notices = await getNotices();

    return <AdminNoticesClient notices={notices} />;
}
