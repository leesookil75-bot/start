'use client';

import { MonthlyUserStat } from '@/lib/types';
import styles from '../admin.module.css';
import * as XLSX from 'xlsx';

interface MonthlyReportTableProps {
    data: MonthlyUserStat[];
    year: number;
}

export default function MonthlyReportTable({ data, year }: MonthlyReportTableProps) {
    // Calculate Monthly Totals for Footer
    const monthlyTotals = Array(12).fill(0).map(() => ({ count50: 0, count75: 0 }));
    let grandTotal50 = 0;
    let grandTotal75 = 0;

    data.forEach(user => {
        user.monthly.forEach((m, idx) => {
            monthlyTotals[idx].count50 += m.count50;
            monthlyTotals[idx].count75 += m.count75;
        });
        grandTotal50 += user.total50;
        grandTotal75 += user.total75;
    });

    const handleDownload = () => {
        // Headers with Area
        const headerRow = ['Name', 'Area', 'Type', ...Array(12).fill(0).map((_, i) => `${i + 1}월`), 'Total'];

        const rows: any[] = [];
        const merges: any[] = [];

        // Data Rows
        let rowIndex = 1; // Start after header
        data.forEach(user => {
            // Row for 50L
            const row50 = [user.userName, user.area, '50L', ...user.monthly.map(m => m.count50 || ''), user.total50];
            // Row for 75L
            const row75 = [user.userName, user.area, '75L', ...user.monthly.map(m => m.count75 || ''), user.total75];

            rows.push(row50);
            rows.push(row75);

            // Merge Name column (Column A, index 0) for these 2 rows
            merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex + 1, c: 0 } });
            // Merge Area column (Column B, index 1) for these 2 rows
            merges.push({ s: { r: rowIndex, c: 1 }, e: { r: rowIndex + 1, c: 1 } });

            rowIndex += 2;
        });

        // Footer Row
        const footer50 = ['Total', '', '50L', ...monthlyTotals.map(m => m.count50), grandTotal50];
        const footer75 = ['Total', '', '75L', ...monthlyTotals.map(m => m.count75), grandTotal75];

        rows.push(footer50);
        rows.push(footer75);

        // Merge "Total" label in footer (Name col)
        merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex + 1, c: 0 } });
        // Merge empty Area col in footer
        merges.push({ s: { r: rowIndex, c: 1 }, e: { r: rowIndex + 1, c: 1 } });

        // Create Worksheet
        const ws = XLSX.utils.aoa_to_sheet([headerRow, ...rows]);
        ws['!merges'] = merges;

        // Col widths
        ws['!cols'] = [
            { wch: 15 }, // Name
            { wch: 12 }, // Area
            { wch: 8 },  // Type
            ...Array(12).fill({ wch: 5 }), // Months
            { wch: 8 }   // Total
        ];

        // Create Workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `${year} Monthly Report`);
        XLSX.writeFile(wb, `monthly_report_${year}.xlsx`);
    };

    return (
        <div className={styles.tableContainer}>
            <div className={styles.tableHeader}>
                <span className={styles.tableTitle}>{year} Monthly Report</span>
                <button onClick={handleDownload} className={styles.downloadButton}>
                    📥 Download Excel
                </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table className={styles.table} style={{ fontSize: '0.9rem', width: 'max-content' }}>
                    <thead>
                        <tr>
                            <th style={{ position: 'sticky', left: 0, zIndex: 20, background: '#1a1a1a', minWidth: '60px' }}>Name</th>
                            <th style={{ position: 'sticky', left: '60px', zIndex: 20, background: '#1a1a1a', minWidth: '80px' }}>Area</th>
                            <th style={{ position: 'sticky', left: '140px', zIndex: 20, background: '#1a1a1a', minWidth: '60px' }}>Type</th>
                            {Array(12).fill(0).map((_, i) => (
                                <th key={i}>{i + 1}월</th>
                            ))}
                            <th style={{ minWidth: '60px' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((user) => (
                            <>
                                <tr key={`${user.userId}-50`}>
                                    <td rowSpan={2} style={{
                                        verticalAlign: 'middle',
                                        position: 'sticky',
                                        left: 0,
                                        zIndex: 10,
                                        background: '#1a1a1a',
                                        borderRight: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                        {user.userName}
                                    </td>
                                    <td rowSpan={2} style={{
                                        verticalAlign: 'middle',
                                        fontSize: '0.85rem',
                                        color: '#ccc',
                                        position: 'sticky',
                                        left: '60px',
                                        zIndex: 10,
                                        background: '#1a1a1a',
                                        borderRight: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                        {user.area}
                                    </td>
                                    <td style={{
                                        position: 'sticky',
                                        left: '140px',
                                        zIndex: 10,
                                        background: '#1a1a1a',
                                        borderRight: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                        <span className={`${styles.badge} ${styles.badge50}`}>50L</span>
                                    </td>
                                    {user.monthly.map((m, i) => (
                                        <td key={i} style={{ textAlign: 'center', color: m.count50 ? 'inherit' : '#444' }}>
                                            {m.count50 || '-'}
                                        </td>
                                    ))}
                                    <td style={{ fontWeight: 'bold', textAlign: 'center' }}>
                                        <span className={styles.value50}>{user.total50}</span>
                                    </td>
                                </tr>
                                <tr key={`${user.userId}-75`}>
                                    <td style={{
                                        position: 'sticky',
                                        left: '140px',
                                        zIndex: 10,
                                        background: '#1a1a1a',
                                        borderRight: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                        <span className={`${styles.badge} ${styles.badge75}`}>75L</span>
                                    </td>
                                    {user.monthly.map((m, i) => (
                                        <td key={i} style={{ textAlign: 'center', color: m.count75 ? 'inherit' : '#444' }}>
                                            {m.count75 || '-'}
                                        </td>
                                    ))}
                                    <td style={{ fontWeight: 'bold', textAlign: 'center' }}>
                                        <span className={styles.value75}>{user.total75}</span>
                                    </td>
                                </tr>
                            </>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr style={{ background: 'rgba(255,255,255,0.05)', fontWeight: 'bold' }}>
                            <td rowSpan={2} style={{
                                verticalAlign: 'middle',
                                position: 'sticky',
                                left: 0,
                                zIndex: 10,
                                background: '#1a1a1a',
                                borderRight: '1px solid rgba(255,255,255,0.1)'
                            }}>Total</td>
                            <td rowSpan={2} style={{
                                position: 'sticky',
                                left: '60px',
                                zIndex: 10,
                                background: '#1a1a1a',
                                borderRight: '1px solid rgba(255,255,255,0.1)'
                            }}></td>
                            <td style={{
                                position: 'sticky',
                                left: '140px',
                                zIndex: 10,
                                background: '#1a1a1a',
                                borderRight: '1px solid rgba(255,255,255,0.1)'
                            }}>50L</td>
                            {monthlyTotals.map((m, i) => (
                                <td key={i} style={{ textAlign: 'center' }}>{m.count50}</td>
                            ))}
                            <td style={{ textAlign: 'center', color: 'var(--accent-50)' }}>{grandTotal50}</td>
                        </tr>
                        <tr style={{ background: 'rgba(255,255,255,0.05)', fontWeight: 'bold' }}>
                            <td style={{
                                position: 'sticky',
                                left: '140px',
                                zIndex: 10,
                                background: '#1a1a1a',
                                borderRight: '1px solid rgba(255,255,255,0.1)'
                            }}>75L</td>
                            {monthlyTotals.map((m, i) => (
                                <td key={i} style={{ textAlign: 'center' }}>{m.count75}</td>
                            ))}
                            <td style={{ textAlign: 'center', color: 'var(--accent-75)' }}>{grandTotal75}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
