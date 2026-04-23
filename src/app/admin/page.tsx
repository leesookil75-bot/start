import Link from 'next/link';
import styles from './admin.module.css';
import { getUsageStats, logout, getCurrentUser } from '../actions';
import { getExcelData, getMonthlyUserStats, getDailyUserStats } from '@/lib/statistics';
import { getNotices } from '@/lib/data';
import AdminDashboardClient from './dashboard-client';
import MobileAdminHome from './components/MobileAdminHome';
import { redirect } from 'next/navigation';
import VacationNotification from './components/VacationNotification';

// Ensure dynamic rendering to fetch fresh data on every request
export const dynamic = 'force-dynamic';

export default async function AdminPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const user = await getCurrentUser();
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const viewMode = cookieStore.get('view_mode')?.value;

    if (!user || user.role === 'cleaner') {
        redirect('/login');
    }
    if (user.role === 'super_admin' && viewMode !== 'admin') {
        redirect('/super-admin');
    }
    if (viewMode === 'worker') {
        redirect('/');
    }

    const { stats, records } = await getUsageStats();

    // Parse Year/Month from query params or default to current
    const params = await searchParams;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const queryYear = params.year ? parseInt(params.year as string) : currentYear;
    const queryMonth = params.month ? parseInt(params.month as string) : currentMonth;

    // Fetch all stats server-side
    const [
        excelData,
        notices,
        monthlyUserStats,
        dailyUserStats
    ] = await Promise.all([
        getExcelData(user.agencyId),
        getNotices(user.agencyId),
        getMonthlyUserStats(user.agencyId),
        getDailyUserStats(queryYear, queryMonth, user.agencyId)
    ]);

    // Fetch agency name
    const { getAgencies } = await import('@/lib/data');
    const agencies = await getAgencies();
    const agencyName = agencies.find(a => a.id === user.agencyId)?.name || '가로청소 본사';

    // Fetch pending vacation requests
    const { getVacationRequests } = await import('@/app/vacations/actions');
    const vacationResult = await getVacationRequests(true); // as admin
    const pendingVacations = (vacationResult.data || []).filter(r => r.status === 'PENDING').length;

    // Header moved to Client component for conditional page visibility
    return (
        <>
            {/* Mobile View */}
            <div className={styles.mobileOnlyWrapper}>
                <MobileAdminHome
                    userName={user.name}
                    agencyName={agencyName}
                    onLogout={logout}
                />
            </div>

            {/* PC View */}
            <div className={styles.pcOnlyWrapper}>
                <AdminDashboardClient
                    agencyName={agencyName}
                    records={records}
                    stats={{
                        daily: [],
                        weekly: [],
                        monthly: [],
                        yearly: [],
                        area: [],
                        monthlyUser: monthlyUserStats,
                        dailyUser: dailyUserStats
                    }}
                    currentDate={{ year: queryYear, month: queryMonth }}
                    summaryStats={stats}
                    excelData={excelData}
                    notices={notices}
                />
                <VacationNotification count={pendingVacations} />
            </div>
        </>
    );
}
