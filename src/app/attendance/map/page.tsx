import { getCurrentUser } from '../../actions';
import { redirect } from 'next/navigation';
import MapClient from './MapClient';

export const dynamic = 'force-dynamic';

export default async function MapAttendancePage() {
    const user = await getCurrentUser();
    if (!user) {
        redirect('/login');
    }

    return <MapClient user={user as any} />;
}
