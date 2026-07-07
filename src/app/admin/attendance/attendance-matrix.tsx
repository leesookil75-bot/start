'use client';

import { useState, useTransition } from 'react';
import { User } from '@/lib/data';
import { upsertDailyAttendanceAction, bulkCheckOutAction } from '../../actions';
import * as XLSX from 'xlsx';
import styles from './attendance-matrix.module.css';

interface MonthlyData {
    users: User[];
    records: any[];
    workplaces?: any[];
}

interface AttendanceMatrixProps {
    year: number;
    month: number;
    data: MonthlyData;
}

export default function AttendanceMatrix({ year, month, data }: AttendanceMatrixProps) {
    const [editingCell, setEditingCell] = useState<{ userId: string, day: number } | null>(null);
    const [editValue, setEditValue] = useState('');
    const [selectedWorkplace, setSelectedWorkplace] = useState<string>('');
    const [isPending, startTransition] = useTransition();

    // 일괄 퇴근 모달
    const kstTodayStr = new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkDate, setBulkDate] = useState(kstTodayStr);
    const [bulkTime, setBulkTime] = useState('18:00');
    const [pendingNames, setPendingNames] = useState<string[] | null>(null); // 확인 단계용 대상 명단
    const [isBulkPending, startBulkTransition] = useTransition();

    const openBulkModal = () => {
        setBulkDate(kstTodayStr);
        setBulkTime('18:00');
        setPendingNames(null);
        setShowBulkModal(true);
    };

    // 1단계: 대상자 미리 조회
    const handleBulkPreview = () => {
        startBulkTransition(async () => {
            const result = await bulkCheckOutAction(bulkDate, bulkTime, true);
            if (!result.success) { alert(result.error || '대상자 조회에 실패했습니다.'); return; }
            if ((result.count ?? 0) === 0) {
                alert('일괄 퇴근 대상자가 없습니다.\n(출근 미기록·이미 퇴근·연차자 제외)');
                return;
            }
            setPendingNames(result.names || []);
        });
    };

    // 2단계: 실제 퇴근 처리
    const handleBulkConfirm = () => {
        startBulkTransition(async () => {
            const result = await bulkCheckOutAction(bulkDate, bulkTime, false);
            if (result.success) {
                setShowBulkModal(false);
                setPendingNames(null);
                alert(`${result.count}명 일괄 퇴근 처리되었습니다. (${bulkDate} ${bulkTime})`);
                window.location.reload();
            } else {
                alert(result.error || '일괄 퇴근 처리에 실패했습니다.');
            }
        });
    };

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
        const merges: XLSX.Range[] = [];
        
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

        // 1. Title Row
        const wpTitleText = selectedWorkplace 
            ? data.workplaces?.find(w => w.id === selectedWorkplace)?.name || '' 
            : '동지역 등 가로청소 용역 전체';
        const title = `${year}년 ${wpTitleText} 출퇴근 기록부`;
        
        const titleRow = [title];
        for (let i = 0; i < days.length + 2; i++) {
            titleRow.push('');
        }
        wsData.push(titleRow);
        // Merge title across all columns
        merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: days.length + 2 } });

        // 2. Header Row
        const headerRow = ['직원', '사원번호', ''];
        days.forEach(d => {
            const date = new Date(year, month - 1, d);
            headerRow.push(`${d}/${dayNames[date.getDay()]}`);
        });
        wsData.push(headerRow);

        // 3. User Data Rows (2 rows per user)
        const displayUsers = data.users.filter(u => u.name !== '최고관리자' && u.name !== '관리자1' && u.name !== '간이환경 관리자');
        const usersToExport = selectedWorkplace ? displayUsers.filter(u => u.workplaceId === selectedWorkplace) : displayUsers;
        
        let currentRowIdx = 2; // Row 0 is Title, Row 1 is Header

        usersToExport.forEach(user => {
            const wp = data.workplaces?.find(w => w.id === user.workplaceId);
            const areaDisplay = wp ? `${wp.name} ${user.cleaningArea}` : user.cleaningArea;

            const rowIn = [user.name, areaDisplay, '출근'];
            const rowOut = ['', '', '퇴근'];

            days.forEach(day => {
                const records = recordMap.get(user.id)?.get(day) || [];
                if (records.length === 0) {
                    rowIn.push('');
                    rowOut.push('');
                    return;
                }

                records.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                const checkIns = records.filter(r => r.type === 'CHECK_IN');
                const checkOuts = records.filter(r => r.type === 'CHECK_OUT');

                const firstIn = checkIns.length > 0 ? checkIns[0] : null;
                const lastOut = checkOuts.length > 0 ? checkOuts[checkOuts.length - 1] : null;

                const format = (d: string) => {
                    const date = new Date(d);
                    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul' });
                };

                rowIn.push(firstIn ? format(firstIn.timestamp) : '');
                rowOut.push(lastOut ? format(lastOut.timestamp) : '');
            });

            wsData.push(rowIn);
            wsData.push(rowOut);

            // Merge Name (col 0) and Area (col 1) vertically for the 2 rows
            merges.push({ s: { r: currentRowIdx, c: 0 }, e: { r: currentRowIdx + 1, c: 0 } });
            merges.push({ s: { r: currentRowIdx, c: 1 }, e: { r: currentRowIdx + 1, c: 1 } });

            currentRowIdx += 2;
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!merges'] = merges;
        
        // Adjust column widths
        const wscols = [{ wch: 8 }, { wch: 12 }, { wch: 5 }];
        days.forEach(() => wscols.push({ wch: 7 }));
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
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {data.workplaces && data.workplaces.length > 0 && (
                        <select
                            value={selectedWorkplace}
                            onChange={(e) => setSelectedWorkplace(e.target.value)}
                            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                        >
                            <option value="">전체 근무지</option>
                            {data.workplaces.map(wp => (
                                <option key={wp.id} value={wp.id}>{wp.name}</option>
                            ))}
                        </select>
                    )}
                    <button
                        onClick={openBulkModal}
                        style={{ background: '#dc2626', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        ⏹ 일괄 퇴근
                    </button>
                    <button className={styles.exportButton} onClick={handleExport}>
                        Excel 다운로드
                    </button>
                </div>
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
                        {((selectedWorkplace ? data.users.filter(u => u.workplaceId === selectedWorkplace) : data.users).filter(u => u.name !== '최고관리자' && u.name !== '관리자1' && u.name !== '간이환경 관리자')).map(user => {
                            const wp = data.workplaces?.find(w => w.id === user.workplaceId);
                            return (
                                <tr key={user.id}>
                                    <td className={styles.stickyCol}>
                                        <div className={styles.name}>{user.name}</div>
                                        <div className={styles.area}>{wp ? `${wp.name} ` : ''}{user.cleaningArea}</div>
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
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {showBulkModal && (
                <div
                    onClick={() => !isBulkPending && setShowBulkModal(false)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
                >
                    <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '440px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ margin: '0 0 6px', fontSize: '1.25rem', fontWeight: 800, color: '#111' }}>⏹ 일괄 퇴근 처리</h3>

                        {pendingNames === null ? (
                            // 1단계: 날짜/시각 입력
                            <>
                                <p style={{ margin: '0 0 18px', fontSize: '0.9rem', color: '#4b5563', lineHeight: 1.5 }}>
                                    선택한 날짜에 <b>출근했으나 아직 퇴근하지 않은 직원</b>을 지정한 시각으로 일괄 퇴근 처리합니다.
                                    <br />연차(승인) 직원은 제외되며, 체크리스트 작성 여부와 무관합니다.
                                </p>

                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>날짜</label>
                                <input
                                    type="date"
                                    value={bulkDate}
                                    onChange={(e) => setBulkDate(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #d1d5db', marginBottom: '14px', fontSize: '1rem' }}
                                />

                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>퇴근 시각</label>
                                <input
                                    type="time"
                                    value={bulkTime}
                                    onChange={(e) => setBulkTime(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #d1d5db', marginBottom: '22px', fontSize: '1rem' }}
                                />

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={() => setShowBulkModal(false)}
                                        disabled={isBulkPending}
                                        style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', background: '#f3f4f6', color: '#374151', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        취소
                                    </button>
                                    <button
                                        onClick={handleBulkPreview}
                                        disabled={isBulkPending}
                                        style={{ flex: 2, padding: '0.75rem', borderRadius: '8px', border: 'none', background: isBulkPending ? '#9ca3af' : '#2563eb', color: '#fff', fontWeight: 700, cursor: isBulkPending ? 'not-allowed' : 'pointer' }}
                                    >
                                        {isBulkPending ? '조회 중...' : '대상 확인'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            // 2단계: 대상 명단 확인 후 실행
                            <>
                                <p style={{ margin: '0 0 12px', fontSize: '0.95rem', color: '#111', lineHeight: 1.5 }}>
                                    <b style={{ color: '#dc2626' }}>{bulkDate} {bulkTime}</b> 기준으로 아래 <b>{pendingNames.length}명</b>을 퇴근 처리합니다. 계속할까요?
                                </p>
                                <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {pendingNames.map((n, i) => (
                                        <span key={i} style={{ background: '#f3f4f6', borderRadius: '999px', padding: '4px 10px', fontSize: '0.85rem', color: '#374151' }}>{n}</span>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={() => setPendingNames(null)}
                                        disabled={isBulkPending}
                                        style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', background: '#f3f4f6', color: '#374151', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        ← 뒤로
                                    </button>
                                    <button
                                        onClick={handleBulkConfirm}
                                        disabled={isBulkPending}
                                        style={{ flex: 2, padding: '0.75rem', borderRadius: '8px', border: 'none', background: isBulkPending ? '#9ca3af' : '#dc2626', color: '#fff', fontWeight: 700, cursor: isBulkPending ? 'not-allowed' : 'pointer' }}
                                    >
                                        {isBulkPending ? '처리 중...' : `${pendingNames.length}명 퇴근 확정`}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

