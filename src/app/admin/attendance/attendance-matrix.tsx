'use client';

import { useState, useTransition } from 'react';
import { User } from '@/lib/data';
import { upsertDailyAttendanceAction } from '../../actions';
import * as XLSX from 'xlsx';
import styles from './attendance-matrix.module.css';

interface MonthlyData {
    users: User[];
    records: any[];
}

interface AttendanceMatrixProps {
    year: number;
    month: number;
    data: MonthlyData;
}

export default function AttendanceMatrix({ year, month, data }: AttendanceMatrixProps) {
    const [editingCell, setEditingCell] = useState<{ userId: string, day: number } | null>(null);
    const [editValue, setEditValue] = useState('');
    const [isPending, startTransition] = useTransition();

    const daysInMonth = new Date(year, month, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const recordMap = new Map<string, Map<number, any[]>>();
    data.records.forEach(r => {
        const d = new Date(r.timestamp);
        const kstDate = new Date(d.getTime() + 9 * 60 * 60 * 1000);
        const day = kstDate.getUTCDate();

        if (!recordMap.has(r.userId)) {
            recordMap.set(r.userId, new Map());
        }
        const userMap = recordMap.get(r.userId)!;
        if (!userMap.has(day)) {
            userMap.set(day, []);
        }
        userMap.get(day)!.push(r);
    });

    const getCellContent = (userId: string, day: number) => {
        const records = recordMap.get(userId)?.get(day) || [];
        if (records.length === 0) return { text: '', isLate: false, isEmpty: true };

        records.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        const checkIns = records.filter(r => r.type === 'CHECK_IN');
        const checkOuts = records.filter(r => r.type === 'CHECK_OUT');

        const firstIn = checkIns.length > 0 ? checkIns[0] : null;
        const lastOut = checkOuts.length > 0 ? checkOuts[checkOuts.length - 1] : null;

        const format = (d: string) => {
            const date = new Date(d);
            return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul' });
        };

        const inText = firstIn ? format(firstIn.timestamp) : '';
        const outText = lastOut ? format(lastOut.timestamp) : '';

        let isLate = false;
        if (firstIn) {
            const inTime = new Date(firstIn.timestamp);
            const kstIn = new Date(inTime.getTime() + 9 * 60 * 60 * 1000);
            if (kstIn.getUTCHours() > 9 || (kstIn.getUTCHours() === 9 && kstIn.getUTCMinutes() > 0)) {
                isLate = true;
            }
        }

        let display = '';
        if (inText && outText) display = `${inText} / ${outText}`;
        else if (inText) display = `${inText} / -`;
        else if (outText) display = `- / ${outText}`;

        return {
            text: display,
            isLate,
            isEmpty: false
        };
    };

    const handleCellClick = (userId: string, day: number, currentText: string) => {
        setEditingCell({ userId, day });
        setEditValue(currentText === '-' || !currentText ? '' : currentText);
    };

    const handleBlur = () => {
        saveEdit();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            saveEdit();
        } else if (e.key === 'Escape') {
            setEditingCell(null);
        }
    };

    const saveEdit = () => {
        if (!editingCell) return;
        const { userId, day } = editingCell;
        const rawValue = editValue.trim();
        setEditingCell(null);

        let inTime: string | null = null;
        let outTime: string | null = null;

        if (rawValue) {
            const parts = rawValue.split('/').map(s => s.trim());
            const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

            if (parts.length === 1) {
                // Determine if it looks like start or end? 
                // Ambiguous. Let's assume input implies "Start" if single? 
                // Or maybe they just typed "09:00".
                if (timeRegex.test(parts[0])) inTime = parts[0];
            } else {
                if (parts[0] && parts[0] !== '-' && timeRegex.test(parts[0])) inTime = parts[0];
                if (parts[1] && parts[1] !== '-' && timeRegex.test(parts[1])) outTime = parts[1];
            }
        }

        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        startTransition(async () => {
            const result = await upsertDailyAttendanceAction(userId, dateStr, inTime, outTime);
            if (!result.success) {
                alert(result.error);
            }
        });
    };

    const handleExport = () => {
        const wb = XLSX.utils.book_new();
        const wsData: any[][] = [];
        const header = ['이름', '담당구역', ...days.map(d => `${month}/${d}`)];
        wsData.push(header);

        data.users.forEach(user => {
            const row = [user.name, user.cleaningArea];
            days.forEach(day => {
                const cell = getCellContent(user.id, day);
                row.push(cell.isEmpty ? '' : cell.text);
            });
            wsData.push(row);
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wscols = [{ wch: 10 }, { wch: 15 }];
        days.forEach(() => wscols.push({ wch: 15 }));
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, `${month}월 출퇴근기록`);
        XLSX.writeFile(wb, `CleanTrack_Attendance_${year}_${month}.xlsx`);
    };

    return (
        <div className={styles.container}>
            <div className={styles.controls}>
                <div className={styles.monthSelector}>
                    <button onClick={() => window.location.href = `?year=${month === 1 ? year - 1 : year}&month=${month === 1 ? 12 : month - 1}`}>&lt;</button>
                    <span className={styles.currentMonth}>{year}년 {month}월</span>
                    <button onClick={() => window.location.href = `?year=${month === 12 ? year + 1 : year}&month=${month === 12 ? 1 : month + 1}`}>&gt;</button>
                </div>
                <button className={styles.exportButton} onClick={handleExport}>
                    Excel 다운로드
                </button>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.matrixTable}>
                    <thead>
                        <tr>
                            <th className={styles.stickyCol}>이름</th>
                            {days.map(d => {
                                const date = new Date(year, month - 1, d);
                                const isSunday = date.getDay() === 0;
                                const isSaturday = date.getDay() === 6;
                                return (
                                    <th key={d} className={`
                                        ${isSunday ? styles.weekend : ''}
                                        ${isSaturday ? styles.saturday : ''}
                                    `}>
                                        {d}일
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {data.users.map(user => (
                            <tr key={user.id}>
                                <td className={styles.stickyCol}>
                                    <div className={styles.name}>{user.name}</div>
                                    <div className={styles.area}>{user.cleaningArea}</div>
                                </td>
                                {days.map(day => {
                                    const cell = getCellContent(user.id, day);
                                    const date = new Date(year, month - 1, day);
                                    const isSunday = date.getDay() === 0;
                                    const isSaturday = date.getDay() === 6;
                                    const isEditing = editingCell?.userId === user.id && editingCell?.day === day;

                                    return (
                                        <td
                                            key={day}
                                            className={`
                                                ${styles.cell} 
                                                ${cell.isLate ? styles.late : ''}
                                                ${isSunday ? styles.weekend : ''}
                                                ${isSaturday ? styles.saturday : ''}
                                            `}
                                            onClick={() => !isEditing && handleCellClick(user.id, day, cell.text)}
                                        >
                                            {isEditing ? (
                                                <input
                                                    autoFocus
                                                    className={styles.inlineInput}
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={handleBlur}
                                                    onKeyDown={handleKeyDown}
                                                    placeholder="09:00 / 18:00"
                                                />
                                            ) : (
                                                <div className={styles.cellContent}>
                                                    {cell.text || <span className={styles.empty}>-</span>}
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

interface AttendanceMatrixProps {
    year: number;
    month: number;
    data: MonthlyData;
}

export default function AttendanceMatrix({ year, month, data }: AttendanceMatrixProps) {
    const [selectedRecord, setSelectedRecord] = useState<{ userId: string, date: string, records: any[] } | null>(null);
    const [isPending, startTransition] = useTransition();

    // Helper to get days in month
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Process data into a map: userId -> date (day) -> records
    const recordMap = new Map<string, Map<number, any[]>>();
    data.records.forEach(r => {
        const d = new Date(r.timestamp);
        // Adjust to KST for day calculation
        const kstDate = new Date(d.getTime() + 9 * 60 * 60 * 1000);
        const day = kstDate.getUTCDate();

        if (!recordMap.has(r.userId)) {
            recordMap.set(r.userId, new Map());
        }
        const userMap = recordMap.get(r.userId)!;
        if (!userMap.has(day)) {
            userMap.set(day, []);
        }
        userMap.get(day)!.push(r);
    });

    // Formatting helper
    const getCellContent = (userId: string, day: number) => {
        const records = recordMap.get(userId)?.get(day) || [];
        if (records.length === 0) return { text: '-', isLate: false, isEmpty: true };

        // Sort by time
        records.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        const checkIns = records.filter(r => r.type === 'CHECK_IN');
        const checkOuts = records.filter(r => r.type === 'CHECK_OUT');

        const firstIn = checkIns.length > 0 ? checkIns[0] : null;
        const lastOut = checkOuts.length > 0 ? checkOuts[checkOuts.length - 1] : null;

        const format = (d: string) => {
            const date = new Date(d);
            return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul' });
        };

        const inText = firstIn ? format(firstIn.timestamp) : '';
        const outText = lastOut ? format(lastOut.timestamp) : '';

        // Simple logic: Late if after 09:00
        let isLate = false;
        if (firstIn) {
            const inTime = new Date(firstIn.timestamp);
            const kstIn = new Date(inTime.getTime() + 9 * 60 * 60 * 1000);
            if (kstIn.getUTCHours() > 9 || (kstIn.getUTCHours() === 9 && kstIn.getUTCMinutes() > 0)) {
                isLate = true;
            }
        }

        return {
            text: `${inText || '미출근'} / ${outText || '미퇴근'}`,
            isLate,
            isEmpty: false
        };
    };

    const handleCellClick = (userId: string, day: number) => {
        const records = recordMap.get(userId)?.get(day) || [];
        // Construct the date string YYYY-MM-DD
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setSelectedRecord({ userId, date: dateStr, records });
    };

    const handleExport = () => {
        const wb = XLSX.utils.book_new();
        const wsData: any[][] = [];

        // Header
        const header = ['이름', '담당구역', ...days.map(d => `${month}/${d}`)];
        wsData.push(header);

        // Rows
        data.users.forEach(user => {
            const row = [user.name, user.cleaningArea];
            days.forEach(day => {
                const cell = getCellContent(user.id, day);
                row.push(cell.isEmpty ? '' : cell.text);
            });
            wsData.push(row);
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Auto-width
        const wscols = [{ wch: 10 }, { wch: 15 }];
        days.forEach(() => wscols.push({ wch: 15 }));
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, `${month}월 출퇴근기록`);
        XLSX.writeFile(wb, `CleanTrack_Attendance_${year}_${month}.xlsx`);
    };

    return (
        <div className={styles.container}>
            <div className={styles.controls}>
                <div className={styles.monthSelector}>
                    {/* Month Navigation could be here or handled by page links */}
                    {/* For now simple display */}
                    <button onClick={() => window.location.href = `?year=${month === 1 ? year - 1 : year}&month=${month === 1 ? 12 : month - 1}`}>&lt;</button>
                    <span className={styles.currentMonth}>{year}년 {month}월</span>
                    <button onClick={() => window.location.href = `?year=${month === 12 ? year + 1 : year}&month=${month === 12 ? 1 : month + 1}`}>&gt;</button>
                </div>
                <button className={styles.exportButton} onClick={handleExport}>
                    Excel 다운로드
                </button>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.matrixTable}>
                    <thead>
                        <tr>
                            <th className={styles.stickyCol}>이름</th>
                            {days.map(d => {
                                const date = new Date(year, month - 1, d);
                                const isSunday = date.getDay() === 0;
                                const isSaturday = date.getDay() === 6;
                                return (
                                    <th key={d} className={`
                                        ${isSunday ? styles.weekend : ''}
                                        ${isSaturday ? styles.saturday : ''}
                                    `}>
                                        {d}일
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {data.users.map(user => (
                            <tr key={user.id}>
                                <td className={styles.stickyCol}>
                                    <div className={styles.name}>{user.name}</div>
                                    <div className={styles.area}>{user.cleaningArea}</div>
                                </td>
                                {days.map(day => {
                                    const cell = getCellContent(user.id, day);
                                    const date = new Date(year, month - 1, day);
                                    const isSunday = date.getDay() === 0;
                                    const isSaturday = date.getDay() === 6;

                                    return (
                                        <td
                                            key={day}
                                            className={`
                                                ${styles.cell} 
                                                ${cell.isLate ? styles.late : ''}
                                                ${isSunday ? styles.weekend : ''}
                                                ${isSaturday ? styles.saturday : ''}
                                            `}
                                            onClick={() => handleCellClick(user.id, day)}
                                        >
                                            <div className={styles.cellContent}>
                                                {cell.text === '-' ? <span className={styles.empty}>-</span> : cell.text}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedRecord && (
                <EditModal
                    data={selectedRecord}
                    onClose={() => setSelectedRecord(null)}
                    isPending={isPending}
                    startTransition={startTransition}
                />
            )}
        </div>
    );
}

function EditModal({ data, onClose, isPending, startTransition }: {
    data: { userId: string, date: string, records: any[] },
    onClose: () => void,
    isPending: boolean,
    startTransition: React.TransitionStartFunction
}) {
    // We need to manage state for inputs? 
    // Or just list records and allow editing/deleting them?
    // User wants "Check In" and "Check Out".
    // Sometimes there are multiple. 
    // Simplest UI: List existing records with Delete button.
    // And "Add Record" form (Time, Type).

    const [newTime, setNewTime] = useState('');
    const [newType, setNewType] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');

    const handleAdd = async () => {
        if (!newTime) return;
        const timestamp = `${data.date}T${newTime}:00.000Z`; // Construct ISO?
        // Wait, input type="time" gives local time usually (HH:mm). 
        // We need to convert it to ISO UTC string.
        // data.date is YYYY-MM-DD.
        // We assume "Simulated KST" input.
        // ISO string needed for DB is UTC.
        // So {data.date} {newTime} (KST) -> UTC.
        const kstDate = new Date(`${data.date}T${newTime}:00+09:00`);
        const iso = kstDate.toISOString();

        startTransition(async () => {
            const result = await updateAttendanceRecordAction('create', {
                userId: data.userId,
                type: newType,
                timestamp: iso
            });
            if (result.success) {
                onClose(); // Close on success or maybe refresh local state? 
                // Since we rely on Server Component refresh via revalidatePath, onClose fits.
                // But better to keep open to see change? 
                // revalidatePath refreshes the page props -> Modal might close if parent re-renders?
                // Parent re-render won't close modal unless `selectedRecord` is reset.
                // But `selectedRecord` holds OLD `records`.
                // So we should probably close.
            } else {
                alert(result.error);
            }
        });
    };

    const handleDelete = (id: string) => {
        if (!confirm('삭제하시겠습니까?')) return;
        startTransition(async () => {
            await updateAttendanceRecordAction('delete', { id });
            onClose();
        });
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h3>기록 수정 ({data.date})</h3>

                <div className={styles.recordList}>
                    {data.records.map(r => (
                        <div key={r.id} className={styles.recordItem}>
                            <span>{r.type === 'CHECK_IN' ? '출근' : '퇴근'}</span>
                            <span className={styles.recordTime}>
                                {new Date(r.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })}
                            </span>
                            <button onClick={() => handleDelete(r.id)} disabled={isPending}>삭제</button>
                        </div>
                    ))}
                    {data.records.length === 0 && <p className={styles.noData}>기록이 없습니다.</p>}
                </div>

                <div className={styles.addForm}>
                    <h4>기록 추가</h4>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select
                            value={newType}
                            onChange={(e) => setNewType(e.target.value as any)}
                            className={styles.select}
                        >
                            <option value="CHECK_IN">출근</option>
                            <option value="CHECK_OUT">퇴근</option>
                        </select>
                        <input
                            type="time"
                            value={newTime}
                            onChange={(e) => setNewTime(e.target.value)}
                            className={styles.input}
                        />
                        <button onClick={handleAdd} disabled={isPending || !newTime} className={styles.addButton}>
                            추가
                        </button>
                    </div>
                </div>

                <div className={styles.footer}>
                    <button onClick={onClose} className={styles.closeButton}>닫기</button>
                </div>
            </div>
        </div>
    );
}
