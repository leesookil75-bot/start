import { getAgencies } from '@/lib/data';
import { getCurrentUser } from '../actions';
import { redirect } from 'next/navigation';
import AgencyList from './AgencyList';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SuperAdminPage() {
    const user = await getCurrentUser();
    
    // Check if super_admin
    if (!user || user.role !== 'super_admin') {
        redirect('/login');
    }

    const agencies = await getAgencies();

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>가로청소 SaaS 마스터 대시보드</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <Link href="/admin" style={{ padding: '0.5rem 1rem', background: '#e2e8f0', borderRadius: '8px', textDecoration: 'none', color: '#333' }}>
                        일반 어드민 뷰 보기
                    </Link>
                    <form action={async () => {
                        'use server';
                        const { logout } = await import('../actions');
                        await logout();
                    }}>
                        <button type="submit" style={{ padding: '0.5rem 1rem', background: '#ef4444', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
                            로그아웃
                        </button>
                    </form>
                </div>
            </header>

            <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>가입된 학원/업체 (Agencies)</h2>
                    <button style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                        + 새 업체 등록
                    </button>
                </div>
                
                <AgencyList agencies={agencies} />
            </section>
        </div>
    );
}
