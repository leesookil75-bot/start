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
            <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '80vh' }}>
                <table className={styles.table} style={{ fontSize: '0.9rem', minWidth: '100%' }}>
                    <thead>
                        <tr>
                            <th className={styles.stickyLeft0} style={{ width: '100px', minWidth: '100px', maxWidth: '100px', position: 'sticky', top: 0, zIndex: 60 }}>Name</th>
                            <th className={styles.stickyLeft100} style={{ width: '150px', minWidth: '150px', maxWidth: '150px', position: 'sticky', top: 0, zIndex: 60 }}>Area</th>
                            <th className={styles.stickyLeft250} style={{ width: '60px', minWidth: '60px', maxWidth: '60px', position: 'sticky', top: 0, zIndex: 60 }}>Type</th>
                            {Array(12).fill(0).map((_, i) => (
                                <th key={i} style={{ position: 'sticky', top: 0, zIndex: 50, background: '#f9fafb', minWidth: '40px' }}>{i + 1}월</th>
                            ))}
                            <th style={{ minWidth: '60px', position: 'sticky', top: 0, zIndex: 50, background: '#f9fafb' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((user) => (
                            <>
                                <tr key={`${user.userId}-50`}>
                                    <td rowSpan={2} className={styles.stickyLeft0} style={{ verticalAlign: 'middle', width: '100px', minWidth: '100px', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {user.userName}
                                    </td>
                                    <td rowSpan={2} className={styles.stickyLeft100} style={{ verticalAlign: 'middle', fontSize: '0.85rem', color: '#ccc', width: '150px', minWidth: '150px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {user.area}
                                    </td>
                                    <td className={styles.stickyLeft250} style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}>
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
                                    <td className={styles.stickyLeft250} style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}>
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
                            <td rowSpan={2} className={styles.stickyLeft0} style={{ verticalAlign: 'middle' }}>Total</td>
                            <td rowSpan={2} className={styles.stickyLeft100}></td>
                            <td className={styles.stickyLeft250}>50L</td>
                            {monthlyTotals.map((m, i) => (
                                <td key={i} style={{ textAlign: 'center' }}>{m.count50}</td>
                            ))}
                            <td style={{ textAlign: 'center', color: 'var(--accent-50)' }}>{grandTotal50}</td>
                        </tr>
                        <tr style={{ background: 'rgba(255,255,255,0.05)', fontWeight: 'bold' }}>
                            <td className={styles.stickyLeft250}>75L</td>
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
