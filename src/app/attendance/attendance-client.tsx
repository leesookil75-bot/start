'use client';

import { useState, useTransition } from 'react';
import styles from './attendance.module.css';
import { checkInAction, checkOutAction } from '../actions';

interface AttendanceClientProps {
    isWorking: boolean;
    todayDate: string;
}

export default function AttendanceClient({ isWorking: initialIsWorking, todayDate }: AttendanceClientProps) {
    const [isPending, startTransition] = useTransition();
    // Optimistic UI could be used, but for now we rely on revalidatePath refreshing the page prop
    // However, the page prop won't update instantly unless the parent refreshes.
    // Server actions with revalidatePath usually trigger a router refresh.
    // So `initialIsWorking` should update after the action completes and page reloads.

    // To be safe, we can track local state too, but let's trust Next.js

    const [message, setMessage] = useState<string | null>(null);

    const handleAction = async (action: 'checkIn' | 'checkOut') => {
        setMessage(null);
        startTransition(async () => {
            const result = action === 'checkIn' ? await checkInAction() : await checkOutAction();
            if (result.success) {
                // Success
            } else {
                setMessage(result.error || '작업 실패');
            }
        });
    };

    return (
        <>
            <div className={styles.statusContainer}>
                <div className={styles.statusLabel}>현재 상태</div>
                <div className={`${styles.currentStatus} ${initialIsWorking ? styles.statusWorking : styles.statusOff}`}>
                    {initialIsWorking ? '근무 중' : '근무 종료'}
                </div>
                <div className={styles.timeDisplay}>
                    {todayDate}
                </div>
            </div>

            <div className={styles.actionButtons}>
                <button
                    onClick={() => handleAction('checkIn')}
                    className={`${styles.actionBtn} ${styles.checkInBtn}`}
                    disabled={initialIsWorking || isPending}
                >
                    <span className={styles.btnIcon}>☀️</span>
                    <span className={styles.btnLabel}>출근하기</span>
                </button>
                <button
                    onClick={() => handleAction('checkOut')}
                    className={`${styles.actionBtn} ${styles.checkOutBtn}`}
                    disabled={!initialIsWorking || isPending}
                >
                    <span className={styles.btnIcon}>🌙</span>
                    <span className={styles.btnLabel}>퇴근하기</span>
                </button>
            </div>
            {message && <p style={{ textAlign: 'center', color: 'red', marginBottom: '1rem' }}>{message}</p>}
        </>
    );
}
