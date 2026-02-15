'use client';

import { useState, useTransition } from 'react';
import styles from './attendance.module.css';
import { checkInAction, checkOutAction, initializeDB } from '../actions';

interface AttendanceClientProps {
    isWorking: boolean;
    todayDate: string;
}

export default function AttendanceClient({ isWorking: initialIsWorking, todayDate }: AttendanceClientProps) {
    const [isPending, startTransition] = useTransition();
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

    const handleFixDB = () => {
        startTransition(async () => {
            const result = await initializeDB();
            if (result.success) {
                setMessage('✅ 데이터베이스가 초기화되었습니다. 다시 시도해주세요.');
            } else {
                setMessage('❌ 초기화 실패: ' + result.error);
            }
        });
    };

    const showFixButton = message && (message.includes('relation') || message.includes('does not exist') || message.includes('table'));

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

            {message && (
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <p style={{ color: 'red', marginBottom: '0.5rem' }}>{message}</p>
                    {showFixButton && (
                        <button
                            onClick={handleFixDB}
                            disabled={isPending}
                            style={{
                                padding: '0.5rem 1rem',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            🛠️ 문제 해결 (데이터베이스 초기화)
                        </button>
                    )}
                </div>
            )}
        </>
    );
}
