import Link from 'next/link';
import styles from './admin.module.css';
import { getUsageStats, logout, getCurrentUser } from '../actions';
import { getNotices } from '@/lib/data';
import { getStatsByPeriod, getStatsByArea, getExcelData } from '@/lib/statistics';
import AdminDashboardClient from './dashboard-client';
import { redirect } from 'next/navigation';

// Ensure dynamic rendering to fetch fresh data on every request
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
        redirect('/login');
    }

    const { stats, records } = await getUsageStats();

    // Fetch all stats server-side
    const [
        dailyStats,
        weeklyStats,
        monthlyStats,
        yearlyStats,
        areaStats,
        excelData,
        notices
    ] = await Promise.all([
        getStatsByPeriod('daily'),
        getStatsByPeriod('weekly'),
        getStatsByPeriod('monthly'),
        getStatsByPeriod('yearly'),
        getStatsByArea(),
        getExcelData(),
        getNotices()
    ]);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Dashboard</h1>
                <div className={styles.headerActions}>
                    <Link href="/admin/notices" className={styles.backLink} style={{ background: 'rgba(255, 165, 0, 0.1)', color: 'orange' }}>
                        Manage Notices
                    </Link>
                    <Link href="/change-password" className={styles.changePasswordLink}>
                        Change Password
                    </Link>
                    <Link href="/admin/users" className={styles.backLink}>
                        Manage Users
                    </Link>
                    <form action={logout}>
                        <button className={styles.logoutButton}>
                            Logout
                        </button>
                    </form>
                </div>
            </header>

            {/* Stats Grid has been moved inside AdminDashboardClient for Swipe compatibility */}

            <AdminDashboardClient
                records={records}
                stats={{
                    daily: dailyStats,
                    weekly: weeklyStats,
                    monthly: monthlyStats,
                    yearly: yearlyStats,
                    area: areaStats
                }}
                summaryStats={stats}
                excelData={excelData}
                notices={notices}
            />
        </div>
    );
}
