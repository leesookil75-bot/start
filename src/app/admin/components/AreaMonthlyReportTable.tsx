'use client';

import { DailyUserStat } from '@/lib/types';
import styles from '../admin.module.css';
import { useState } from 'react';
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
    const getDayTotal = (dayIndex: number, size: 50 | 75) => {
        return data.reduce((sum, user) => sum + (size === 50 ? user.daily[dayIndex].count50 : user.daily[dayIndex].count75), 0);
    };

    // Calculate Grand Total of Totals
    const grandTotal50 = data.reduce((sum, user) => sum + user.total50, 0);
    const grandTotal75 = data.reduce((sum, user) => sum + user.total75, 0);

    // State for inline selection
    const [selectedCell, setSelectedCell] = useState<{
        userId: string;
        userName: string;
        day: number;
        type: '50' | '75';
        initialValue: string | number;
    } | null>(null);
    const [inputValue, setInputValue] = useState<string>('');

    const router = useRouter();

    const handleSave = async (cell: typeof selectedCell, value: string | number) => {
        if (!cell) return;

        // If value hasn't changed, don't save
        if (String(cell.initialValue) === String(value)) return;

        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;

        try {
            await fetch('/api/admin/overrides', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: dateStr,
                    userId: cell.userId,
                    type: cell.type,
                    value: value
                })
            });
            router.refresh();
        } catch (error) {
            console.error('Error saving:', error);
        }
    };

    const handleCellClick = (userId: string, userName: string, day: number, type: '50' | '75', currentValue: string | number) => {
        // If clicking the currently selected cell, do nothing (keep editing)
        if (selectedCell?.userId === userId && selectedCell?.day === day && selectedCell?.type === type) {
            return;
        }

        // Save previous cell if it exists
        if (selectedCell) {
            let valToSave: string | number = inputValue;
            const numVal = Number(inputValue);
            if (!isNaN(numVal) && inputValue.trim() !== '') {
                valToSave = numVal;
            }
            handleSave(selectedCell, valToSave);
        }

        // Select new cell
        const val = currentValue !== undefined && currentValue !== null ? String(currentValue) : '';
        setSelectedCell({ userId, userName, day, type, initialValue: currentValue });
        setInputValue(val);
    };

    const handleInputBlur = () => {
        if (selectedCell) {
            let valToSave: string | number = inputValue;
            const numVal = Number(inputValue);
            if (!isNaN(numVal) && inputValue.trim() !== '') {
                valToSave = numVal;
            }
            handleSave(selectedCell, valToSave);
            setSelectedCell(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            (e.currentTarget as HTMLInputElement).blur(); // Triggers handleInputBlur
        }
    };



    return (
        <div className={styles.tableContainer} style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '80vh' }}>
            <table className={styles.table} style={{ borderCollapse: 'collapse', textAlign: 'center', minWidth: '100%' }}>
                <thead className={styles.stickyBg} style={{ top: 0, zIndex: 60, border: 'none' }}>
                    {/* Row 1: Areas */}
                    <tr>
                        <th rowSpan={3} className={styles.stickyLeft0} style={{ border: '1px solid #444', minWidth: '60px', zIndex: 50, top: 0 }}>Date</th>
                        <th rowSpan={3} className={styles.stickyLeft60} style={{ border: '1px solid #444', minWidth: '40px', zIndex: 50, top: 0 }}>Day</th>
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
                                <th key={`${user.userId}-50`} style={{ border: '1px solid #444', color: 'var(--accent-50)', fontSize: '0.8rem', minWidth: '40px' }}>50L</th>
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
                                <td className={styles.stickyLeft0} style={{ border: '1px solid #444', textAlign: 'center', padding: '0.5rem', zIndex: 15, color: dateColor }}>{day}</td>
                                <td className={styles.stickyLeft60} style={{ border: '1px solid #444', textAlign: 'center', padding: '0.5rem', zIndex: 15, color: dateColor }}>{dayName}</td>
                                {data.map(user => {
                                    const dayStat = user.daily[dayIndex];
                                    const val50 = dayStat.display50 !== undefined ? dayStat.display50 : (dayStat.count50 || '');
                                    const val75 = dayStat.display75 !== undefined ? dayStat.display75 : (dayStat.count75 || '');

                                    const isSelected50 = selectedCell?.userId === user.userId && selectedCell?.day === day && selectedCell?.type === '50';
                                    const isSelected75 = selectedCell?.userId === user.userId && selectedCell?.day === day && selectedCell?.type === '75';

                                    return (
                                        <>
                                            <td
                                                key={`${user.userId}-50`}
                                                onClick={() => handleCellClick(user.userId, user.userName, day, '50', dayStat.display50 ?? dayStat.count50)}
                                                className={isSelected50 ? styles.selectedCell : ''}
                                                style={{
                                                    border: '1px solid #444',
                                                    textAlign: 'center',
                                                    padding: isSelected50 ? 0 : '0.5rem',
                                                    color: val50 ? 'var(--accent-50)' : '#444',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    minWidth: '40px',
                                                    height: '40px',
                                                    maxWidth: '40px'
                                                }}
                                            >
                                                {isSelected50 ? (
                                                    <input
                                                        type="text"
                                                        value={inputValue}
                                                        onChange={(e) => setInputValue(e.target.value)}
                                                        onBlur={handleInputBlur}
                                                        onKeyDown={handleKeyDown}
                                                        className={styles.cellInput}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    val50
                                                )}
                                            </td>
                                            <td
                                                key={`${user.userId}-75`}
                                                onClick={() => handleCellClick(user.userId, user.userName, day, '75', dayStat.display75 ?? dayStat.count75)}
                                                className={isSelected75 ? styles.selectedCell : ''}
                                                style={{
                                                    border: '1px solid #444',
                                                    textAlign: 'center',
                                                    padding: isSelected75 ? 0 : '0.5rem',
                                                    color: val75 ? 'var(--accent-75)' : '#444',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    minWidth: '40px',
                                                    height: '40px',
                                                    maxWidth: '40px'
                                                }}
                                            >
                                                {isSelected75 ? (
                                                    <input
                                                        type="text"
                                                        value={inputValue}
                                                        onChange={(e) => setInputValue(e.target.value)}
                                                        onBlur={handleInputBlur}
                                                        onKeyDown={handleKeyDown}
                                                        className={styles.cellInput}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    val75
                                                )}
                                            </td>
                                        </>
                                    );
                                })}
                            </tr>
                        );
                    })}
                    {/* Totals Row */}
                    <tr style={{ background: 'rgba(255,255,255,0.05)', fontWeight: 'bold' }}>
                        <td className={styles.stickyLeft0} style={{ border: '1px solid #444', textAlign: 'center', padding: '1rem 0.5rem', zIndex: 5 }}>Total</td>
                        <td className={styles.stickyLeft60} style={{ border: '1px solid #444', textAlign: 'center', padding: '1rem 0.5rem', zIndex: 5 }}>-</td>
                        {data.map(user => (
                            <>
                                <td key={`total-${user.userId}-50`} style={{ border: '1px solid #444', textAlign: 'center', color: 'var(--accent-50)' }}>{user.total50}</td>
                                <td key={`total-${user.userId}-75`} style={{ border: '1px solid #444', textAlign: 'center', color: 'var(--accent-75)' }}>{user.total75}</td>
                            </>
                        ))}
                    </tr>
                </tbody>
            </table>

        </div>
    );
}
