'use client';

import { MonthlyUserStat } from '@/lib/statistics';
import styles from '../admin.module.css';
import * as XLSX from 'xlsx';

interface MonthlyReportTableProps {
    data: MonthlyUserStat[];
    year: number;
}

export default function MonthlyReportTable({ data, year }: MonthlyReportTableProps) {
    // Calculate Monthly Totals for Footer
    const monthlyTotals = Array(12).fill(0).map(() => ({ count45: 0, count75: 0 }));
    let grandTotal45 = 0;
    let grandTotal75 = 0;

    data.forEach(user => {
        user.monthly.forEach((m, idx) => {
            monthlyTotals[idx].count45 += m.count45;
            monthlyTotals[idx].count75 += m.count75;
        });
        grandTotal45 += user.total45;
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
            // Row for 45L
            const row45 = [user.userName, user.area, '45L', ...user.monthly.map(m => m.count45 || ''), user.total45];
            // Row for 75L
            const row75 = [user.userName, user.area, '75L', ...user.monthly.map(m => m.count75 || ''), user.total75];

            rows.push(row45);
            rows.push(row75);

            // Merge Name column (Column A, index 0) for these 2 rows
            merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex + 1, c: 0 } });
            // Merge Area column (Column B, index 1) for these 2 rows
            merges.push({ s: { r: rowIndex, c: 1 }, e: { r: rowIndex + 1, c: 1 } });

            rowIndex += 2;
        });

        // Footer Row
        const footer45 = ['Total', '', '45L', ...monthlyTotals.map(m => m.count45), grandTotal45];
        const footer75 = ['Total', '', '75L', ...monthlyTotals.map(m => m.count75), grandTotal75];

        rows.push(footer45);
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
                <table className={styles.table} style={{ fontSize: '0.9rem' }}>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Area</th>
                            <th>Type</th>
                            {Array(12).fill(0).map((_, i) => (
                                <th key={i}>{i + 1}월</th>
                            ))}
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((user) => (
                            <>
                                <tr key={`${user.userId}-45`}>
                                    <td rowSpan={2} style={{ verticalAlign: 'middle', background: 'rgba(255,255,255,0.02)' }}>
                                        {user.userName}
                                    </td>
                                    <td rowSpan={2} style={{ verticalAlign: 'middle', background: 'rgba(255,255,255,0.02)', fontSize: '0.85rem', color: '#ccc' }}>
                                        {user.area}
                                    </td>
                                    <td>
                                        <span className={`${styles.badge} ${styles.badge45}`}>45L</span>
                                    </td>
                                    {user.monthly.map((m, i) => (
                                        <td key={i} style={{ textAlign: 'center', color: m.count45 ? 'inherit' : '#444' }}>
                                            {m.count45 || '-'}
                                        </td>
                                    ))}
                                    <td style={{ fontWeight: 'bold', textAlign: 'center' }}>
                                        <span className={styles.value45}>{user.total45}</span>
                                    </td>
                                </tr>
                                <tr key={`${user.userId}-75`}>
                                    <td>
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
                            <td rowSpan={2} style={{ verticalAlign: 'middle' }}>Total</td>
                            <td rowSpan={2}></td>
                            <td>45L</td>
                            {monthlyTotals.map((m, i) => (
                                <td key={i} style={{ textAlign: 'center' }}>{m.count45}</td>
                            ))}
                            <td style={{ textAlign: 'center', color: 'var(--accent-45)' }}>{grandTotal45}</td>
                        </tr>
                        <tr style={{ background: 'rgba(255,255,255,0.05)', fontWeight: 'bold' }}>
                            <td>75L</td>
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
