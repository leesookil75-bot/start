'use client';

import { useState, useTransition } from 'react';
import styles from './page.module.css';
import { submitUsage } from './actions';

interface ClientHomeProps {
    initialUsage: { count45: number; count75: number };
}

export default function ClientHome({ initialUsage }: ClientHomeProps) {
    const [isPending, startTransition] = useTransition();
    // Tracks the confirmed count from server (base)
    const [savedCounts, setSavedCounts] = useState(initialUsage);
    // Tracks the local current changes (+/-)
    const [pendingDelta, setPendingDelta] = useState({ count45: 0, count75: 0 });
    const [message, setMessage] = useState<string | null>(null);

    const handleDelta = (size: 45 | 75, change: number) => {
        setPendingDelta(prev => ({
            ...prev,
            [size === 45 ? 'count45' : 'count75']: prev[size === 45 ? 'count45' : 'count75'] + change
        }));
    };

    // Calculate current display values
    const current45 = Math.max(0, savedCounts.count45 + pendingDelta.count45);
    const current75 = Math.max(0, savedCounts.count75 + pendingDelta.count75);

    const hasChanges = pendingDelta.count45 !== 0 || pendingDelta.count75 !== 0;

    const handleSubmit = () => {
        if (!hasChanges) return;

        startTransition(async () => {
            const result = await submitUsage(pendingDelta.count45, pendingDelta.count75);
            if (result.success) {
                // Update saved counts to match the new reality
                // Reset saved counts to 0 to visually clear the form as requested
                setSavedCounts({
                    count45: 0,
                    count75: 0
                });
                // Reset delta
                setPendingDelta({ count45: 0, count75: 0 });

                setMessage('✅ 전송 완료되었습니다.');
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage('❌ 전송 실패: ' + (result.error || '알 수 없는 오류'));
            }
        });
    };

    return (
        <div className={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h1 className={styles.title} style={{ marginBottom: 0 }}>오늘의 배출량</h1>
                <a href="/my-stats" style={{ color: '#aaa', fontSize: '0.9rem', textDecoration: 'underline' }}>
                    📊 내 통계 보기
                </a>
            </div>

            <div className={styles.inputRows}>
                {/* 45L Row */}
                <div className={`${styles.row} ${styles.row45}`}>
                    <div className={styles.bagInfo}>
                        <div className={styles.bagIcon}>45L</div>
                        <span className={styles.bagLabel}>일반 쓰레기</span>
                    </div>

                    <div className={styles.controls}>
                        <button
                            className={styles.controlBtn}
                            onClick={() => handleDelta(45, -1)}
                            disabled={current45 <= 0 || isPending}
                        >
                            −
                        </button>
                        <span className={styles.countValue}>{current45}</span>
                        <button
                            className={`${styles.controlBtn} ${styles.addBtn}`}
                            onClick={() => handleDelta(45, 1)}
                            disabled={isPending}
                        >
                            +
                        </button>
                    </div>
                </div>

                {/* 75L Row */}
                <div className={`${styles.row} ${styles.row75}`}>
                    <div className={styles.bagInfo}>
                        <div className={styles.bagIcon}>75L</div>
                        <span className={styles.bagLabel}>대형 쓰레기</span>
                    </div>

                    <div className={styles.controls}>
                        <button
                            className={styles.controlBtn}
                            onClick={() => handleDelta(75, -1)}
                            disabled={current75 <= 0 || isPending}
                        >
                            −
                        </button>
                        <span className={styles.countValue}>{current75}</span>
                        <button
                            className={`${styles.controlBtn} ${styles.addBtn}`}
                            onClick={() => handleDelta(75, 1)}
                            disabled={isPending}
                        >
                            +
                        </button>
                    </div>
                </div>
            </div>

            <div className={`${styles.message} ${message ? styles.messageVisible : ''}`}>
                {message}
            </div>

            <button
                className={styles.sendButton}
                onClick={handleSubmit}
                disabled={!hasChanges || isPending}
            >
                {isPending ? '전송 중...' : '전송하기'}
            </button>
        </div>
    );
}
