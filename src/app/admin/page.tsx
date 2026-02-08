import Link from 'next/link';
import styles from './admin.module.css';
import { getUsageStats, logout, getCurrentUser } from '../actions';
import { getStatsByPeriod, getStatsByArea, getExcelData, getMonthlyUserStats } from '@/lib/statistics';
import { getNotices } from '@/lib/data';
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
        notices,
        monthlyUserStats
    ] = await Promise.all([
        getStatsByPeriod('daily'),
        getStatsByPeriod('weekly'),
        getStatsByPeriod('monthly'),
        getStatsByPeriod('yearly'),
        getStatsByArea(),
        getExcelData(),
        getNotices(),
        getMonthlyUserStats()
    ]);

    return (
        <div className={styles.container}>
            {/* Header moved to Client component for conditional page visibility */}

            <AdminDashboardClient
                records={records}
                stats={{
                    daily: dailyStats,
                    weekly: weeklyStats,
                    monthly: monthlyStats,
                    yearly: yearlyStats,
                    area: areaStats,
                    monthlyUser: monthlyUserStats
                }}
                summaryStats={stats}
                excelData={excelData}
                notices={notices}
            />
        </div>
    );
}
