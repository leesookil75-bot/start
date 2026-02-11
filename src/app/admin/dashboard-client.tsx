'use client';

import { useState, useRef } from 'react';
import styles from './admin.module.css';
import StatsCharts from './components/StatsCharts';
import ExcelDownloadBtn from './components/ExcelDownloadBtn';
import { NoticeForm, NoticeList, Notice } from './notices/client';
import Link from 'next/link';
import { logout } from '../actions';
import { useRouter } from 'next/navigation';

import { MonthlyUserStat, DailyUserStat } from '@/lib/statistics';
import MonthlyReportTable from './components/MonthlyReportTable';
import DailyReportTable from './components/DailyReportTable';

type Tab = 'daily-report' | 'user-report' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'area';

interface DashboardClientProps {
    records: any[];
    stats: {
        daily: any[];
        weekly: any[];
        monthly: any[];
        yearly: any[];
        area: any[];
        monthlyUser: MonthlyUserStat[];
        dailyUser: DailyUserStat[];
    };
    currentDate: {
        year: number;
        month: number;
    };
    summaryStats: {
        count45: number;
        count75: number;
        total: number;
    };
    excelData: any[];
    notices: Notice[];
}

export default function AdminDashboardClient({ records, stats, currentDate, summaryStats, excelData, notices }: DashboardClientProps) {
    const [activeTab, setActiveTab] = useState<Tab>('daily-report');
    const [page, setPage] = useState(0); // 0: Dashboard, 1: Create/Edit Notice, 2: Notice List
    const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
    const router = useRouter();

    // Swipe Logic
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.targetTouches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.targetTouches[0].clientX;
    };

    const handleTouchEnd = () => {
        if (!touchStartX.current || !touchEndX.current) return;

        const distance = touchStartX.current - touchEndX.current;
        const isSwipeLeft = distance > 50;
        const isSwipeRight = distance < -50;

        if (isSwipeLeft && page < 2) {
            setPage(p => p + 1);
        }

        if (isSwipeRight && page > 0) {
            setPage(p => p - 1);
        }

        // Reset
        touchStartX.current = 0;
        touchEndX.current = 0;
    };

    const handleEditNotice = (notice: Notice) => {
        setEditingNotice(notice);
        setPage(1); // Go to Form page
    };

    const handleFormSuccess = () => {
        setEditingNotice(null);
        setPage(2); // Go to List page to see new/updated notice
    };

    const handleFormCancel = () => {
        setEditingNotice(null);
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const [y, m] = e.target.value.split('-');
        router.push(`/admin?year=${y}&month=${m}`);
    };

    return (
        <div className={styles.dashboardContainer} style={{ marginTop: 0 }}>
            {/* Header - Only visible on Page 0 (Dashboard) */}
            {page === 0 && (
                <header className={styles.header}>
                    <h1 className={styles.title}>Dashboard</h1>
                    <div className={styles.headerActions}>
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
            )}

            {/* Page Tabs for easy switching (and indicator) */}
            <div className={styles.pageTabs}>
                <button
                    className={`${styles.pageTab} ${page === 0 ? styles.activePageTab : ''}`}
                    onClick={() => setPage(0)}
                >
                    Dashboard
                </button>
                <button
                    className={`${styles.pageTab} ${page === 1 ? styles.activePageTab : ''}`}
                    onClick={() => setPage(1)}
                >
                    {editingNotice ? 'Edit Notice' : 'Post Notice'}
                </button>
                <button
                    className={`${styles.pageTab} ${page === 2 ? styles.activePageTab : ''}`}
                    onClick={() => setPage(2)}
                >
                    Notices List
                </button>
            </div>

            <div
                className={styles.sliderContainer}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div
                    className={styles.slideTrack}
                    style={{ transform: `translateX(-${page * (100 / 3)}%)`, width: '300%' }}
                >
                    {/* Slide 0: Dashboard */}
                    <div className={styles.slide} style={{ width: '33.333%' }}>
                        {/* Stats Grid */}
                        <div className={styles.statsGrid}>
                            <div className={styles.card}>
                                <div className={styles.statLabel}>45L Bags</div>
                                <div className={`${styles.statValue} ${styles.value45}`}>{summaryStats.count45}</div>
                            </div>
                            <div className={styles.card}>
                                <div className={styles.statLabel}>75L Bags</div>
                                <div className={`${styles.statValue} ${styles.value75}`}>{summaryStats.count75}</div>
                            </div>
                            <div className={styles.card}>
                                <div className={styles.statLabel}>Total Usage</div>
                                <div className={styles.statValue}>{summaryStats.total}</div>
                            </div>
                        </div>

                        <div className={styles.contentArea}>
                            {/* Date Selector for Daily Report */}
                            {activeTab === 'daily-report' && (
                                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
                                    <label htmlFor="month-picker" style={{ fontWeight: 'bold' }}>Select Month: </label>
                                    <input
                                        type="month"
                                        id="month-picker"
                                        value={`${currentDate.year}-${String(currentDate.month).padStart(2, '0')}`}
                                        onChange={handleDateChange}
                                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                                    />
                                </div>
                            )}

                            <div className={styles.tabBar}>
                                <div className={styles.tabs}>
                                    <button className={`${styles.tab} ${activeTab === 'daily-report' ? styles.activeTab : ''}`} onClick={() => setActiveTab('daily-report')}>Daily Report</button>
                                    <button className={`${styles.tab} ${activeTab === 'user-report' ? styles.activeTab : ''}`} onClick={() => setActiveTab('user-report')}>Monthly Report</button>
                                    <button className={`${styles.tab} ${activeTab === 'daily' ? styles.activeTab : ''}`} onClick={() => setActiveTab('daily')}>Daily Graph</button>
                                    <button className={`${styles.tab} ${activeTab === 'weekly' ? styles.activeTab : ''}`} onClick={() => setActiveTab('weekly')}>Weekly</button>
                                    <button className={`${styles.tab} ${activeTab === 'monthly' ? styles.activeTab : ''}`} onClick={() => setActiveTab('monthly')}>Monthly</button>
                                    <button className={`${styles.tab} ${activeTab === 'yearly' ? styles.activeTab : ''}`} onClick={() => setActiveTab('yearly')}>Yearly</button>
                                    <button className={`${styles.tab} ${activeTab === 'area' ? styles.activeTab : ''}`} onClick={() => setActiveTab('area')}>By Area</button>
                                </div>

                                {activeTab !== 'daily-report' && activeTab !== 'user-report' && <ExcelDownloadBtn data={excelData} />}
                            </div>

                            {/* Stop propagation for touch events on tables to prevent page swipe */}
                            <div onTouchStart={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
                                {activeTab === 'daily-report' && (
                                    <DailyReportTable
                                        data={stats.dailyUser}
                                        year={currentDate.year}
                                        month={currentDate.month}
                                    />
                                )}
                                {activeTab === 'user-report' && <MonthlyReportTable data={stats.monthlyUser} year={new Date().getFullYear()} />}
                            </div>

                            {activeTab === 'daily' && <StatsCharts data={stats.daily} type="bar" />}
                            {activeTab === 'weekly' && <StatsCharts data={stats.weekly} type="bar" />}
                            {activeTab === 'monthly' && <StatsCharts data={stats.monthly} type="bar" />}
                            {activeTab === 'yearly' && <StatsCharts data={stats.yearly} type="bar" />}
                            {activeTab === 'area' && <StatsCharts data={stats.area} type="pie" />}
                        </div>
                    </div>

                    {/* Slide 1: Create/Edit Notice */}
                    <div className={styles.slide} style={{ width: '33.333%' }}>
                        <div className={styles.card} style={{ height: '100%', overflowY: 'auto' }}>
                            <NoticeForm
                                editingNotice={editingNotice}
                                onSuccess={handleFormSuccess}
                                onCancel={handleFormCancel}
                            />
                        </div>
                    </div>

                    {/* Slide 2: Recent Notices List */}
                    <div className={styles.slide} style={{ width: '33.333%' }}>
                        <div className={styles.card} style={{ height: '100%', overflowY: 'auto' }}>
                            <NoticeList
                                notices={notices}
                                onEdit={handleEditNotice}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
