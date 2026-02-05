'use client';

import { useState } from 'react';
import styles from './admin.module.css';
import StatsCharts from './components/StatsCharts';
import ExcelDownloadBtn from './components/ExcelDownloadBtn';
import AdminNoticesClient from './notices/client';
import { useRef, useEffect } from 'react';

type Tab = 'records' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'area';

interface DashboardClientProps {
    records: any[];
    stats: {
        daily: any[];
        weekly: any[];
        monthly: any[];
        yearly: any[];
        area: any[];
    };
    summaryStats: {
        count45: number;
        count75: number;
        total: number;
    };
    excelData: any[];
    notices: any[];
}

export default function AdminDashboardClient({ records, stats, summaryStats, excelData, notices }: DashboardClientProps) {
    const [activeTab, setActiveTab] = useState<Tab>('records');
    const [page, setPage] = useState(0); // 0: Dashboard, 1: Notices
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

        if (isSwipeLeft && page === 0) {
            setPage(1);
        }

        if (isSwipeRight && page === 1) {
            setPage(0);
        }

        // Reset
        touchStartX.current = 0;
        touchEndX.current = 0;
    };

    // Add mouse event handlers for desktop testing
    const [isMouseDown, setIsMouseDown] = useState(false);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsMouseDown(true);
        touchStartX.current = e.clientX;
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isMouseDown) {
            touchEndX.current = e.clientX;
        }
    };

    const handleMouseUp = () => {
        if (isMouseDown) {
            setIsMouseDown(false);
            handleTouchEnd(); // Re-use logic
        }
    };

    // Sort records locally for display
    const sortedRecords = [...records].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return (
        <div className={styles.dashboardContainer} style={{ marginTop: 0 }}>
            {/* Page Tabs for easy switching (and indicator) */}
            <div className={styles.pageTabs}>
                <button
                    className={`${styles.pageTab} ${page === 0 ? styles.activePageTab : ''}`}
                    onClick={() => setPage(0)}
                >
                    Dashboard Stats
                </button>
                <button
                    className={`${styles.pageTab} ${page === 1 ? styles.activePageTab : ''}`}
                    onClick={() => setPage(1)}
                >
                    Manage Notices
                </button>
            </div>

            <div
                className={styles.sliderContainer}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => setIsMouseDown(false)}
            >
                <div
                    className={styles.slideTrack}
                    style={{ transform: `translateX(-${page * 50}%)` }}
                >
                    {/* Slide 1: Dashboard */}
                    <div className={styles.slide}>
                        {/* Stats Grid - Moved Inside for better Swipe context */}
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

                        <div className={styles.tabBar}>
                            <div className={styles.tabs}>
                                <button className={`${styles.tab} ${activeTab === 'records' ? styles.activeTab : ''}`} onClick={() => setActiveTab('records')}>Records</button>
                                <button className={`${styles.tab} ${activeTab === 'daily' ? styles.activeTab : ''}`} onClick={() => setActiveTab('daily')}>Daily</button>
                                <button className={`${styles.tab} ${activeTab === 'weekly' ? styles.activeTab : ''}`} onClick={() => setActiveTab('weekly')}>Weekly</button>
                                <button className={`${styles.tab} ${activeTab === 'monthly' ? styles.activeTab : ''}`} onClick={() => setActiveTab('monthly')}>Monthly</button>
                                <button className={`${styles.tab} ${activeTab === 'yearly' ? styles.activeTab : ''}`} onClick={() => setActiveTab('yearly')}>Yearly</button>
                                <button className={`${styles.tab} ${activeTab === 'area' ? styles.activeTab : ''}`} onClick={() => setActiveTab('area')}>By Area</button>
                            </div>

                            <ExcelDownloadBtn data={excelData} />
                        </div>

                        <div className={styles.contentArea}>
                            {activeTab === 'records' && (
                                <div className={styles.tableContainer}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>Type</th>
                                                <th>User</th>
                                                <th>Time</th>
                                                <th>ID</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedRecords.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} style={{ textAlign: 'center', opacity: 0.5 }}>No records yet</td>
                                                </tr>
                                            ) : (
                                                sortedRecords.slice(0, 50).map((record) => ( // Limit to 50 for performance
                                                    <tr key={record.id}>
                                                        <td>
                                                            <span className={`${styles.badge} ${record.size === 45 ? styles.badge45 : styles.badge75}`}>
                                                                {record.size}L
                                                            </span>
                                                        </td>
                                                        <td>{record.userName || '-'}</td>
                                                        <td className={styles.time}>{new Date(record.timestamp).toLocaleString()}</td>
                                                        <td className={styles.time} style={{ fontSize: '0.8em' }}>{record.id.slice(0, 8)}...</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                    {sortedRecords.length > 50 && <div style={{ textAlign: 'center', padding: '1rem', color: '#666' }}>Showing recent 50 records</div>}
                                </div>
                            )}

                            {activeTab === 'daily' && <StatsCharts data={stats.daily} type="bar" />}
                            {activeTab === 'weekly' && <StatsCharts data={stats.weekly} type="bar" />}
                            {activeTab === 'monthly' && <StatsCharts data={stats.monthly} type="bar" />}
                            {activeTab === 'yearly' && <StatsCharts data={stats.yearly} type="bar" />}
                            {activeTab === 'area' && <StatsCharts data={stats.area} type="pie" />}
                        </div>
                    </div>

                    {/* Slide 2: Notices */}
                    <div className={styles.slide}>
                        <AdminNoticesClient notices={notices} />
                    </div>
                </div>
            </div>
        </div>
    );
}
