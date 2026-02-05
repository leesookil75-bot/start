import Link from 'next/link';
import styles from './admin.module.css';
import { getUsageStats, logout, getCurrentUser } from '../actions';
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
        excelData
    ] = await Promise.all([
        getStatsByPeriod('daily'),
        getStatsByPeriod('weekly'),
        getStatsByPeriod('monthly'),
        getStatsByPeriod('yearly'),
        getStatsByArea(),
        getExcelData()
    ]);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Dashboard</h1>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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

            <div className={styles.statsGrid}>
                <div className={styles.card}>
                    <div className={styles.statLabel}>45L Bags Used</div>
                    <div className={`${styles.statValue} ${styles.value45}`}>{stats.count45}</div>
                </div>
                <div className={styles.card}>
                    <div className={styles.statLabel}>75L Bags Used</div>
                    <div className={`${styles.statValue} ${styles.value75}`}>{stats.count75}</div>
                </div>
                <div className={styles.card}>
                    <div className={styles.statLabel}>Total Usage</div>
                    <div className={styles.statValue}>{stats.total}</div>
                </div>
            </div>

            <AdminDashboardClient
                records={records}
                stats={{
                    daily: dailyStats,
                    weekly: weeklyStats,
                    monthly: monthlyStats,
                    yearly: yearlyStats,
                    area: areaStats
                }}
                excelData={excelData}
            />
        </div>
    );
}
