'use client';

import { useState, useTransition } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Import calendar styles
import styles from './apply.module.css';
import { requestVacation, getMyLeaveStatus } from '../actions';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@/components/icons';
import Link from 'next/link';
import './calendar-override.css'; // Custom overrides
import { useEffect } from 'react';

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

export default function ClientApplyPage() {
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

        // Determine start and end date
        let startDate: Date;
        let endDate: Date;

        if (Array.isArray(date)) {
            // Range selection
            startDate = date[0] as Date;
            endDate = date[1] as Date;
        } else {
            // Single date
            startDate = date as Date;
            endDate = date as Date;
        }

        if (!startDate || !endDate) return;

        // Reset time to local midnight or handle timezone carefully
        // Here we just want YYYY-MM-DD
        const toLocalISO = (d: Date) => {
            const offset = d.getTimezoneOffset() * 60000;
            return new Date(d.getTime() - offset).toISOString().split('T')[0];
        };

        const startStr = toLocalISO(startDate);
        const endStr = toLocalISO(endDate);

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
                        selectRange={true} // Allow range selection
                        className="react-calendar-custom"
                        minDate={new Date()} // Can't select past dates
                    />
                    <p className={styles.helpText}>
                        * 날짜를 터치하여 기간을 선택하세요.<br />
                        (하루인 경우 두 번 터치하거나 그대로 진행)
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
