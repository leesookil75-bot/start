'use client';

import { useState, useTransition } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Import calendar styles
import styles from './apply.module.css';
import { requestVacation, getMyLeaveStatus } from '../actions';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, PlaneIcon } from '@/components/icons';
import Link from 'next/link';
import './calendar-override.css'; // Custom overrides
import { useEffect } from 'react';
import { LeaveRequest } from '@/lib/data';

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface ClientApplyPageProps {
    initialRequests?: LeaveRequest[];
}

export default function ClientApplyPage({ initialRequests = [] }: ClientApplyPageProps) {
    const [date, setDate] = useState<Value>(new Date());
    const [reason, setReason] = useState('');
    const [isPending, startTransition] = useTransition();
    const [leaveStats, setLeaveStats] = useState<{ total: number; used: number; remaining: number } | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchStats = async () => {
            const result = await getMyLeaveStatus();
            if (result.success && result.data) {
                setLeaveStats(result.data);
            }
        };
        fetchStats();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let targetDate: Date;
        if (Array.isArray(date)) {
            targetDate = date[0] as Date; // Fallback in case state wasn't cleared
        } else {
            targetDate = date as Date;
        }

        if (!targetDate) return;

        // Reset time to local midnight or handle timezone carefully
        // Here we just want YYYY-MM-DD
        const toLocalISO = (d: Date) => {
            const offset = d.getTimezoneOffset() * 60000;
            return new Date(d.getTime() - offset).toISOString().split('T')[0];
        };

        const startStr = toLocalISO(targetDate);
        const endStr = startStr; // 단일 휴가이므로 시작일과 종료일이 같음

        const y = targetDate.getFullYear();
        const m = targetDate.getMonth() + 1;
        const d = targetDate.getDate();
        
        if (!confirm(`[최종 확인]\n\n선택하신 날짜: ${y}년 ${m}월 ${d}일 (하루)\n\n이대로 휴가를 신청하시겠습니까?`)) {
            return;
        }

        startTransition(async () => {
            const result = await requestVacation(startStr, endStr, reason);
            if (result.success) {
                alert('휴가 신청이 완료되었습니다.');
                router.push('/');
            } else {
                alert('신청 실패: ' + result.error);
            }
        });
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.backLink}>
                    <ArrowLeftIcon />
                </Link>
                <h1 className={styles.title}>휴가 신청</h1>
            </header>

            {leaveStats && (
                <div className={styles.statsContainer}>
                    <div className={styles.statBox}>
                        <span className={styles.statLabel}>잔여 연차</span>
                        <span className={styles.statValue}>{leaveStats.remaining}일</span>
                    </div>
                    <div className={styles.statDivider} />
                    <div className={styles.statBox}>
                        <span className={styles.statLabel}>전체 연차</span>
                        <span className={styles.statTotal}>{leaveStats.total}일</span>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.calendarWrapper}>
                    <label className={styles.label}>날짜 선택</label>
                    <Calendar
                        onChange={setDate}
                        value={date}
                        selectRange={false} 
                        className="react-calendar-custom"
                        minDate={new Date()} // Can't select past dates
                        tileContent={({ date: cellDate, view }) => {
                            if (view !== 'month') return null;

                            // Check if cellDate is within any approved leave
                            const isApproved = initialRequests.some(r => {
                                if (r.status !== 'APPROVED') return false;
                                const start = new Date(r.startDate);
                                const end = new Date(r.endDate);
                                // Set times to midnight for comparison
                                start.setHours(0, 0, 0, 0);
                                end.setHours(0, 0, 0, 0);
                                cellDate.setHours(0, 0, 0, 0);
                                return cellDate >= start && cellDate <= end;
                            });

                            if (isApproved) {
                                return (
                                    <div className={styles.leaveTileContent}>
                                        <PlaneIcon className={styles.leaveTileIcon} />
                                        <span className={styles.leaveTileText}>휴가</span>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <p className={styles.helpText}>
                        * 달력에서 원하시는 날짜를 한 번만 터치하세요.
                    </p>
                </div>

                <div className={styles.inputGroup}>
                    <label htmlFor="reason" className={styles.label}>사유</label>
                    <textarea
                        id="reason"
                        className={styles.textarea}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="예: 개인 사정, 연차 등"
                        required
                    />
                </div>

                <button type="submit" className={styles.submitBtn} disabled={isPending}>
                    {isPending ? '신청 중...' : '신청하기'}
                </button>
            </form>
        </div>
    );
}
