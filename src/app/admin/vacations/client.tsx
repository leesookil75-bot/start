'use client';

import { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { LeaveRequest } from '@/lib/types';
import { processVacationRequest } from '@/app/vacations/actions';
import styles from './vacation.module.css';
import * as XLSX from 'xlsx';
import '@/app/vacations/apply/calendar-override.css'; // Reuse overrides

interface AdminVacationClientProps {
    initialRequests: LeaveRequest[];
}

export default function AdminVacationClient({ initialRequests }: AdminVacationClientProps) {
    const [requests, setRequests] = useState<LeaveRequest[]>(initialRequests);
    const [date, setDate] = useState<Date>(new Date()); // Calendar View Date

    const pendingRequests = requests.filter(r => r.status === 'PENDING');
    const approvedRequests = requests.filter(r => r.status === 'APPROVED');

    const handleProcess = async (id: string, approved: boolean) => {
        if (!confirm(approved ? '승인하시겠습니까?' : '반려하시겠습니까?')) return;

        const result = await processVacationRequest(id, approved);
        if (result.success) {
            setRequests(prev => prev.map(r =>
                r.id === id ? { ...r, status: approved ? 'APPROVED' : 'REJECTED' } : r
            ));
        } else {
            alert('처리 실패: ' + result.error);
        }
    };

    const handleCancelApproval = async (e: React.MouseEvent, id: string, userName: string) => {
        e.stopPropagation();
        if (!confirm(`${userName}님의 승인된 휴가를 직권 취소하시겠습니까?\n(해당 달력 일정이 즉시 삭제되며 연차가 복구됩니다)`)) return;

        const result = await processVacationRequest(id, false);
        if (result.success) {
            setRequests(prev => prev.map(r =>
                r.id === id ? { ...r, status: 'REJECTED' } : r
            ));
        } else {
            alert('취소 실패: ' + result.error);
        }
    };

    const handleDownloadExcel = () => {
        // Filter by current month view in calendar? Or all? 
        // User asked for "Overview of all workers monthly schedule". 
        // Let's download currently visible month's Approved leaves.

        const year = date.getFullYear();
        const month = date.getMonth(); // 0-11

        const monthlyLeaves = approvedRequests.filter(r => {
            const start = new Date(r.startDate);
            const end = new Date(r.endDate);
            // Check overlap with this month
            const monthStart = new Date(year, month, 1);
            const monthEnd = new Date(year, month + 1, 0);
            return start <= monthEnd && end >= monthStart;
        });

        const data = monthlyLeaves.map(r => ({
            '이름': r.userName || 'Unknown',
            '상태': r.status,
            '시작일': r.startDate,
            '종료일': r.endDate,
            '휴가 기간': `${r.startDate} ~ ${r.endDate}`,
            '사유': r.reason || ''
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `${year}년 ${month + 1}월 휴가`);
        XLSX.writeFile(wb, `휴가내역_${year}_${month + 1}.xlsx`);
    };

    // Calendar Tile Content to show leaves
    const tileContent = ({ date: tileDate, view }: { date: Date, view: string }) => {
        if (view !== 'month') return null;

        // Check for leaves on this day
        // Simply check if tileDate is between start and end of any approved leave
        // Note: Timezone handling is simple here (local date comparison)

        const dayIso = tileDate.toISOString().split('T')[0]; // Local approx if noon? 
        // Best to standardise: tileDate is local 00:00 usually in react-calendar?
        // Actually react-calendar returns local date object.
        // We compare YYYY-MM-DD strings.

        // Fix local time offset for string comparison
        const offset = tileDate.getTimezoneOffset() * 60000;
        const localDate = new Date(tileDate.getTime() - offset).toISOString().split('T')[0];

        const leavesOnDay = approvedRequests.filter(r =>
            localDate >= r.startDate && localDate <= r.endDate
        );

        if (leavesOnDay.length === 0) return null;

        return (
            <div className={styles.tileContent}>
                {leavesOnDay.map((l, i) => (
                    <div key={i} className={styles.leaveItem} title={`${l.userName} (잔여: ${l.remainingLeaves}) - ${l.cleaningArea}`} style={{ position: 'relative', paddingRight: '18px' }}>
                        <span className={styles.leaveName}>
                            {l.userName}
                            <span style={{ fontSize: '0.8em', marginLeft: '2px', fontWeight: 'normal', opacity: 0.8 }}>
                                ({l.remainingLeaves})
                            </span>
                        </span>
                        <span className={styles.leaveArea}>{l.cleaningArea}</span>
                        <button 
                            onClick={(e) => handleCancelApproval(e, l.id, l.userName || '알 수 없음')}
                            style={{ position: 'absolute', top: '50%', right: '4px', transform: 'translateY(-50%)', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', width: '14px', height: '14px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                            title="승인 취소"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.pageTitle}>휴가 관리</h1>
                <button onClick={handleDownloadExcel} className={styles.excelBtn}>
                    📥 엑셀 다운로드 ({date.getMonth() + 1}월)
                </button>
            </header>

            <div className={styles.grid}>
                {/* Left: Pending Requests */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>승인 대기 ({pendingRequests.length})</h2>
                    <div className={styles.list}>
                        {pendingRequests.length === 0 ? (
                            <p className={styles.empty}>대기 중인 요청이 없습니다.</p>
                        ) : (
                            pendingRequests.map(req => (
                                <div key={req.id} className={styles.card}>
                                    <div className={styles.cardHeader}>
                                        <span className={styles.userName}>{req.userName}</span>
                                        <span className={styles.date}>{req.createdAt.split('T')[0]} 신청</span>
                                    </div>
                                    <div className={styles.period}>
                                        📅 {req.startDate} ~ {req.endDate}
                                    </div>
                                    <p className={styles.reason}>{req.reason}</p>
                                    <div className={styles.actions}>
                                        <button
                                            onClick={() => handleProcess(req.id, true)}
                                            className={`${styles.btn} ${styles.approveBtn}`}
                                        >
                                            승인
                                        </button>
                                        <button
                                            onClick={() => handleProcess(req.id, false)}
                                            className={`${styles.btn} ${styles.rejectBtn}`}
                                        >
                                            반려
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right: Calendar Overview */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>월간 일정</h2>
                    <div className={styles.calendarWrapper}>
                        <Calendar
                            onChange={(d) => setDate(d as Date)}
                            value={date}
                            tileContent={tileContent}
                            className="admin-calendar"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
