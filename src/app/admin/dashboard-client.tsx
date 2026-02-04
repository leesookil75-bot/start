'use client';

import { useState } from 'react';
import styles from './admin.module.css';
import StatsCharts from './components/StatsCharts';
import ExcelDownloadBtn from './components/ExcelDownloadBtn';

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
    excelData: any[];
}

export default function AdminDashboardClient({ records, stats, excelData }: DashboardClientProps) {
    const [activeTab, setActiveTab] = useState<Tab>('records');

    // Sort records locally for display
    const sortedRecords = [...records].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return (
        <div className={styles.dashboardContainer}>
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
    );
}
