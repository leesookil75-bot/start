'use client';

import { DailyUserStat } from '@/lib/statistics';
import styles from '../admin.module.css';
import * as XLSX from 'xlsx';
import { useState } from 'react';
import EditRecordModal from './EditRecordModal';
import { useRouter } from 'next/navigation';

interface DailyReportTableProps {
    data: DailyUserStat[];
    year: number;
    month: number;
}

export default function DailyReportTable({ data, year, month }: DailyReportTableProps) {
    const router = useRouter();
    const daysInMonth = data.length > 0 ? data[0].daily.length : new Date(year, month, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // State for modal
    const [editingCell, setEditingCell] = useState<{
        userId: string;
        userName: string;
        day: number;
        type: '45' | '75';
        currentValue: string | number;
    } | null>(null);

    const handleCellClick = (userId: string, userName: string, day: number, type: '45' | '75', currentValue: string | number) => {
        setEditingCell({ userId, userName, day, type, currentValue });
    };

    const handleSaveOverride = async (newValue: string | number) => {
        if (!editingCell) return;

        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(editingCell.day).padStart(2, '0')}`;

        try {
            const res = await fetch('/api/admin/overrides', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: dateStr,
                    userId: editingCell.userId,
                    type: editingCell.type,
                    value: newValue
                })
            });

            if (res.ok) {
                setEditingCell(null);
                router.refresh(); // Refresh data to show new value
            } else {
                alert('Failed to save edit.');
            }
        } catch (error) {
            console.error('Error saving:', error);
            alert('Error saving edit.');
        }
    };

    // Calculate Totals per Day for Footer
    const dailyTotals = days.map(() => ({ count45: 0, count75: 0 }));
    let grandTotal45 = 0;
    let grandTotal75 = 0;

    data.forEach(user => {
        user.daily.forEach((d, idx) => {
            if (idx < dailyTotals.length) {
                dailyTotals[idx].count45 += d.count45;
                dailyTotals[idx].count75 += d.count75;
            }
        });
        grandTotal45 += user.total45;
        grandTotal75 += user.total75;
    });

    const handleDownload = () => {
        const headerRow = ['Name', 'Area', 'Type', ...days.map(d => `${d}일`), 'Total'];

        const rows: any[] = [];
        const merges: any[] = [];

        let rowIndex = 1; // 0 is header

        data.forEach(user => {
            const row45 = [
                user.userName,
                user.area,
                '45L',
                ...user.daily.map(d => d.display45 !== undefined ? d.display45 : (d.count45 || '')),
                user.total45
            ];
            const row75 = [
                user.userName,
                user.area,
                '75L',
                ...user.daily.map(d => d.display75 !== undefined ? d.display75 : (d.count75 || '')),
                user.total75
            ];

            rows.push(row45);
            rows.push(row75);

            // Merge Name (col 0)
            merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex + 1, c: 0 } });
            // Merge Area (col 1)
            merges.push({ s: { r: rowIndex, c: 1 }, e: { r: rowIndex + 1, c: 1 } });

            rowIndex += 2;
        });

        // Footer
        const footer45 = ['Total', '', '45L', ...dailyTotals.map(d => d.count45), grandTotal45];
        const footer75 = ['Total', '', '75L', ...dailyTotals.map(d => d.count75), grandTotal75];

        rows.push(footer45);
        rows.push(footer75);

        merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex + 1, c: 0 } });
        merges.push({ s: { r: rowIndex, c: 1 }, e: { r: rowIndex + 1, c: 1 } });

        const ws = XLSX.utils.aoa_to_sheet([headerRow, ...rows]);
        ws['!merges'] = merges;
        ws['!cols'] = [
            { wch: 15 }, // Name
            { wch: 12 }, // Area
            { wch: 8 },  // Type
            ...days.map(() => ({ wch: 4 })), // Days
            { wch: 8 }   // Total
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `${year}-${month} Report`);
        XLSX.writeFile(wb, `daily_report_${year}_${month}.xlsx`);
    };

    const isSunday = (day: number) => {
        const date = new Date(year, month - 1, day);
        return date.getDay() === 0;
    };

    return (
        <div className={styles.tableContainer}>
            <div className={styles.tableHeader}>
                <span className={styles.tableTitle}>{year}년 {month}월 일별 리포트</span>
                <button onClick={handleDownload} className={styles.downloadButton}>
                    📥 Download Excel
                </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table className={styles.table} style={{ fontSize: '0.85rem', width: 'max-content' }}>
                    <thead>
                        <tr>
                            <th style={{ position: 'sticky', left: 0, zIndex: 20, background: '#1a1a1a', minWidth: '60px' }}>Name</th>
                            <th style={{ position: 'sticky', left: '60px', zIndex: 20, background: '#1a1a1a', minWidth: '80px' }}>Area</th>
                            <th style={{ position: 'sticky', left: '140px', zIndex: 20, background: '#1a1a1a', minWidth: '60px' }}>Type</th>
                            {days.map(d => (
                                <th key={d} style={{
                                    minWidth: '30px',
                                    textAlign: 'center',
                                    padding: '0.5rem 0.2rem',
                                    color: isSunday(d) ? '#ff6b6b' : 'inherit',
                                    backgroundColor: isSunday(d) ? 'rgba(255, 107, 107, 0.1)' : 'transparent'
                                }}>{d}</th>
                            ))}
                            <th style={{ minWidth: '60px' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((user) => (
                            <>
                                <tr key={`${user.userId}-45`}>
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
                                        <span className={`${styles.badge} ${styles.badge45}`} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>45L</span>
                                    </td>
                                    {user.daily.map((d, i) => {
                                        const displayVal = d.display45 !== undefined ? d.display45 : (d.count45 || '-');
                                        const isString = typeof d.display45 === 'string';

                                        return (
                                            <td key={i}
                                                onClick={() => handleCellClick(user.userId, user.userName, i + 1, '45', d.display45 ?? d.count45)}
                                                style={{
                                                    textAlign: 'center',
                                                    padding: '0.5rem 0',
                                                    cursor: 'pointer',
                                                    color: d.count45 || isString ? 'inherit' : '#444',
                                                    backgroundColor: isSunday(i + 1) ? 'rgba(255, 107, 107, 0.05)' : 'transparent',
                                                    fontSize: isString ? '0.7rem' : 'inherit'
                                                }}>
                                                {displayVal}
                                            </td>
                                        )
                                    })}
                                    <td style={{ fontWeight: 'bold', textAlign: 'center' }}>
                                        <span className={styles.value45}>{user.total45}</span>
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
                                        <span className={`${styles.badge} ${styles.badge75}`} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>75L</span>
                                    </td>
                                    {user.daily.map((d, i) => {
                                        const displayVal = d.display75 !== undefined ? d.display75 : (d.count75 || '-');
                                        const isString = typeof d.display75 === 'string';

                                        return (
                                            <td key={i}
                                                onClick={() => handleCellClick(user.userId, user.userName, i + 1, '75', d.display75 ?? d.count75)}
                                                style={{
                                                    textAlign: 'center',
                                                    padding: '0.5rem 0',
                                                    cursor: 'pointer',
                                                    color: d.count75 || isString ? 'inherit' : '#444',
                                                    backgroundColor: isSunday(i + 1) ? 'rgba(255, 107, 107, 0.05)' : 'transparent',
                                                    fontSize: isString ? '0.7rem' : 'inherit'
                                                }}>
                                                {displayVal}
                                            </td>
                                        )
                                    })}
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
                            }}>45L</td>
                            {dailyTotals.map((d, i) => (
                                <td key={i} style={{
                                    textAlign: 'center',
                                    padding: '0.5rem 0',
                                    backgroundColor: isSunday(i + 1) ? 'rgba(255, 107, 107, 0.05)' : 'transparent'
                                }}>{d.count45}</td>
                            ))}
                            <td style={{ textAlign: 'center', color: 'var(--accent-45)' }}>{grandTotal45}</td>
                        </tr>
                        <tr style={{ background: 'rgba(255,255,255,0.05)', fontWeight: 'bold' }}>
                            <td style={{
                                position: 'sticky',
                                left: '140px',
                                zIndex: 10,
                                background: '#1a1a1a',
                                borderRight: '1px solid rgba(255,255,255,0.1)'
                            }}>75L</td>
                            {dailyTotals.map((d, i) => (
                                <td key={i} style={{
                                    textAlign: 'center',
                                    padding: '0.5rem 0',
                                    backgroundColor: isSunday(i + 1) ? 'rgba(255, 107, 107, 0.05)' : 'transparent'
                                }}>{d.count75}</td>
                            ))}
                            <td style={{ textAlign: 'center', color: 'var(--accent-75)' }}>{grandTotal75}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Edit Modal */}
            <EditRecordModal
                isOpen={!!editingCell}
                onClose={() => setEditingCell(null)}
                onSave={handleSaveOverride}
                initialValue={editingCell?.currentValue || 0}
                title={editingCell ? `${editingCell.userName} - ${editingCell.day}일 (${editingCell.type}L)` : ''}
            />
        </div>
    );
}
