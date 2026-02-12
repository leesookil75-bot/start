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
    const getDayTotal = (dayIndex: number, size: 45 | 75) => {
        return data.reduce((sum, user) => sum + (size === 45 ? user.daily[dayIndex].count45 : user.daily[dayIndex].count75), 0);
    };

    // Calculate Grand Total of Totals
    const grandTotal45 = data.reduce((sum, user) => sum + user.total45, 0);
    const grandTotal75 = data.reduce((sum, user) => sum + user.total75, 0);

    // State for inline selection
    const [selectedCell, setSelectedCell] = useState<{
        userId: string;
        userName: string;
        day: number;
        type: '45' | '75';
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

    const handleCellClick = (userId: string, userName: string, day: number, type: '45' | '75', currentValue: string | number) => {
        // 1. If there's an existing selection, check if we need to save it
        if (selectedCell) {
            // If clicking the same cell, do nothing (keep it selected)
            if (selectedCell.userId === userId && selectedCell.day === day && selectedCell.type === type) {
                return;
            }
            // Save previous cell if value changed
            // Convert input value to number if possible for valid check
            let valToSave: string | number = inputValue;
            const numVal = Number(inputValue);
            if (!isNaN(numVal) && inputValue.trim() !== '') {
                valToSave = numVal;
            }
            handleSave(selectedCell, valToSave);
        }

        // 2. Select new cell
        setSelectedCell({ userId, userName, day, type, initialValue: currentValue });
        setInputValue(String(currentValue !== undefined && currentValue !== null ? currentValue : ''));
    };

    const handleDone = () => {
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

    return (
        <div className={styles.tableContainer} style={{ overflowX: 'auto', maxHeight: '80vh', paddingBottom: selectedCell ? '80px' : '0' }}>
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
                                    const val45 = dayStat.display45 !== undefined ? dayStat.display45 : (dayStat.count45 || '');
                                    const val75 = dayStat.display75 !== undefined ? dayStat.display75 : (dayStat.count75 || '');

                                    const isSelected45 = selectedCell?.userId === user.userId && selectedCell?.day === day && selectedCell?.type === '45';
                                    const isSelected75 = selectedCell?.userId === user.userId && selectedCell?.day === day && selectedCell?.type === '75';

                                    return (
                                        <>
                                            <td
                                                key={`${user.userId}-45`}
                                                onClick={() => handleCellClick(user.userId, user.userName, day, '45', dayStat.display45 ?? dayStat.count45)}
                                                className={isSelected45 ? styles.selectedCell : ''}
                                                style={{
                                                    border: '1px solid #444',
                                                    textAlign: 'center',
                                                    padding: '0.5rem',
                                                    color: val45 ? 'var(--accent-45)' : '#444',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {val45}
                                            </td>
                                            <td
                                                key={`${user.userId}-75`}
                                                onClick={() => handleCellClick(user.userId, user.userName, day, '75', dayStat.display75 ?? dayStat.count75)}
                                                className={isSelected75 ? styles.selectedCell : ''}
                                                style={{
                                                    border: '1px solid #444',
                                                    textAlign: 'center',
                                                    padding: '0.5rem',
                                                    color: val75 ? 'var(--accent-75)' : '#444',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
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

            {/* Bottom Input Panel */}
            {selectedCell && (
                <div className={styles.bottomPanel}>
                    <div className={styles.bottomPanelInfo}>
                        <span>{selectedCell.userName}</span>
                        <span>{selectedCell.day}일 ({selectedCell.type}L)</span>
                    </div>
                    <div className={styles.bottomPanelInputGroup}>
                        <input
                            type="text"
                            inputMode="decimal"
                            className={styles.bottomPanelInput}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="값 입력 (예: 1, 2, 휴가)"
                            autoFocus
                        />
                        <button className={styles.bottomPanelButton} onClick={handleDone}>
                            완료
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
