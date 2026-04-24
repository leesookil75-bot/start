import { getAgencies, getUsers } from '@/lib/data';
import { getCurrentUser } from '../actions';
import { redirect } from 'next/navigation';
import AgencyList from './AgencyList';
import Link from 'next/link';
import LogoutButton from './LogoutButton';
import RoleSwitchButtons from './RoleSwitchButtons';
import AddAgencyButton from './AddAgencyButton';

export const dynamic = 'force-dynamic';

export default async function SuperAdminPage() {
    const user = await getCurrentUser();
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const viewMode = cookieStore.get('view_mode')?.value;
    
    // Check if super_admin
    if (!user || user.role !== 'super_admin') {
        redirect('/login');
    }

    if (viewMode === 'admin') {
        redirect('/admin');
    }
    if (viewMode === 'worker') {
        redirect('/');
    }

    const [agencies, allUsers] = await Promise.all([
        getAgencies(),
        getUsers()
    ]);
    const adminUsers = allUsers.filter(u => u.role === 'admin' || u.role === 'super_admin');

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>가로청소 SaaS 마스터 대시보드</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <RoleSwitchButtons />
                    <LogoutButton />
                </div>
            </header>

            <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>가입된 업체 (Agencies)</h2>
                    <AddAgencyButton />
                </div>
                
                <AgencyList agencies={agencies} adminUsers={adminUsers} />
            </section>
        </div>
    );
}
