'use client';

import { DailyUserStat } from '@/lib/types';
import styles from '../admin.module.css';
import { useState } from 'react';
import EditRecordModal from './EditRecordModal';
import { useRouter } from 'next/navigation';

interface AreaMonthlyReportTableProps {
    data: DailyUserStat[];
    year: number;
    month: number;
}

export default function AreaMonthlyReportTable({ data, year, month }: AreaMonthlyReportTableProps) {
    // 1. Group Data by Area
    // Sort is already done by backend, but we need structure for headers.
    // data is sorted by Area then Name.

    // Calculate days in month
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Grouping for headers
    const areaGroups: { name: string; users: DailyUserStat[] }[] = [];
    let currentArea = '';
    let currentGroup: { name: string; users: DailyUserStat[] } | null = null;

    data.forEach(user => {
        if (user.area !== currentArea) {
            currentArea = user.area;
            currentGroup = { name: currentArea, users: [] };
            areaGroups.push(currentGroup);
        }
        currentGroup?.users.push(user);
    });

    // Helper to get day name (Mon, Tue...)
    const getDayName = (day: number) => {
        const date = new Date(year, month - 1, day);
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        return dayNames[date.getDay()];
    };

    // Calculate Column Totals
    // user.total45 and user.total75 are already provided.

    // Calculate Grand Totals (Row-wise, i.e., Total for Date X across all users)
    const getDayTotal = (dayIndex: number, size: 45 | 75) => {
        return data.reduce((sum, user) => sum + (size === 45 ? user.daily[dayIndex].count45 : user.daily[dayIndex].count75), 0);
    };

    // Calculate Grand Total of Totals
    const grandTotal45 = data.reduce((sum, user) => sum + user.total45, 0);
    const grandTotal75 = data.reduce((sum, user) => sum + user.total75, 0);

    // State for modal
    const [editingCell, setEditingCell] = useState<{
        userId: string;
        userName: string;
        day: number;
        type: '45' | '75';
        currentValue: string | number;
    } | null>(null);

    const router = useRouter();

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

    return (
        <div className={styles.tableContainer} style={{ overflowX: 'auto', maxHeight: '80vh' }}>
            <table className={styles.table} style={{ borderCollapse: 'collapse', textAlign: 'center' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#1a1a1a' }}>
                    {/* Row 1: Areas */}
                    <tr>
                        <th rowSpan={3} style={{ border: '1px solid #444', minWidth: '60px', zIndex: 50, left: 0, position: 'sticky', background: '#1a1a1a' }}>Date</th>
                        <th rowSpan={3} style={{ border: '1px solid #444', minWidth: '40px', zIndex: 50, left: '60px', position: 'sticky', background: '#1a1a1a' }}>Day</th>
                        {areaGroups.map((group, idx) => (
                            <th
                                key={idx}
                                colSpan={group.users.length * 2}
                                style={{ border: '1px solid #444', textAlign: 'center', padding: '0.5rem' }}
                            >
                                {group.name}
                            </th>
                        ))}
                    </tr>
                    {/* Row 2: Users */}
                    <tr>
                        {data.map(user => (
                            <th
                                key={user.userId}
                                colSpan={2}
                                style={{ border: '1px solid #444', textAlign: 'center', padding: '0.5rem', whiteSpace: 'nowrap' }}
                            >
                                {user.userName}
                            </th>
                        ))}
                    </tr>
                    {/* Row 3: 45L / 75L */}
                    <tr>
                        {data.map(user => (
                            <>
                                <th key={`${user.userId}-45`} style={{ border: '1px solid #444', color: 'var(--accent-45)', fontSize: '0.8rem', minWidth: '40px' }}>45L</th>
                                <th key={`${user.userId}-75`} style={{ border: '1px solid #444', color: 'var(--accent-75)', fontSize: '0.8rem', minWidth: '40px' }}>75L</th>
                            </>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {days.map((day, dayIndex) => {
                        const dayName = getDayName(day);
                        const isSunday = dayName === '일';
                        const isSaturday = dayName === '토';
                        const rowStyle = isSunday ? { background: 'rgba(239, 68, 68, 0.1)' } : (isSaturday ? { background: 'rgba(59, 130, 246, 0.1)' } : {});
                        const dateColor = isSunday ? '#fca5a5' : (isSaturday ? '#93c5fd' : 'inherit');

                        return (
                            <tr key={day} style={rowStyle}>
                                <td style={{ border: '1px solid #444', textAlign: 'center', padding: '0.5rem', position: 'sticky', left: 0, background: '#1a1a1a', zIndex: 15, color: dateColor }}>{day}</td>
                                <td style={{ border: '1px solid #444', textAlign: 'center', padding: '0.5rem', position: 'sticky', left: '60px', background: '#1a1a1a', zIndex: 15, color: dateColor }}>{dayName}</td>
                                {data.map(user => {
                                    const dayStat = user.daily[dayIndex];
                                    // Use display value if available (for overrides), else count
                                    // Note: API returns display45/75 in daily stats.
                                    const val45 = dayStat.display45 !== undefined ? dayStat.display45 : (dayStat.count45 || '');
                                    const val75 = dayStat.display75 !== undefined ? dayStat.display75 : (dayStat.count75 || '');

                                    return (
                                        <>
                                            <td
                                                key={`${user.userId}-45`}
                                                onClick={() => handleCellClick(user.userId, user.userName, day, '45', dayStat.display45 ?? dayStat.count45)}
                                                style={{ border: '1px solid #444', textAlign: 'center', padding: '0.5rem', color: val45 ? 'var(--accent-45)' : '#444', cursor: 'pointer' }}
                                            >
                                                {val45}
                                            </td>
                                            <td
                                                key={`${user.userId}-75`}
                                                onClick={() => handleCellClick(user.userId, user.userName, day, '75', dayStat.display75 ?? dayStat.count75)}
                                                style={{ border: '1px solid #444', textAlign: 'center', padding: '0.5rem', color: val75 ? 'var(--accent-75)' : '#444', cursor: 'pointer' }}
                                            >
                                                {val75}
                                            </td>
                                        </>
                                    );
                                })}
                            </tr>
                        );
                    })}
                    {/* Totals Row */}
                    <tr style={{ background: 'rgba(255,255,255,0.05)', fontWeight: 'bold' }}>
                        <td style={{ border: '1px solid #444', textAlign: 'center', padding: '1rem 0.5rem', position: 'sticky', left: 0, background: '#2a2a2a', zIndex: 5 }}>Total</td>
                        <td style={{ border: '1px solid #444', textAlign: 'center', padding: '1rem 0.5rem', position: 'sticky', left: '60px', background: '#2a2a2a', zIndex: 5 }}>-</td>
                        {data.map(user => (
                            <>
                                <td key={`total-${user.userId}-45`} style={{ border: '1px solid #444', textAlign: 'center', color: 'var(--accent-45)' }}>{user.total45}</td>
                                <td key={`total-${user.userId}-75`} style={{ border: '1px solid #444', textAlign: 'center', color: 'var(--accent-75)' }}>{user.total75}</td>
                            </>
                        ))}
                    </tr>
                </tbody>
            </table>

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
