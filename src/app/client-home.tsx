'use client';

import { useState, useTransition, useRef } from 'react';
import styles from './page.module.css';
import { submitUsage } from './actions';
import MyStatsView from './components/MyStatsView';

import Link from 'next/link';

interface ClientHomeProps {
    initialUsage: { count45: number; count75: number };
    stats: any;
    recentNotice?: any; // Avoiding strict type sharing for now to keep client component clean
}

export default function ClientHome({ initialUsage, stats, recentNotice }: ClientHomeProps) {
    // 0 = Usage, 1 = Stats
    const [activeIndex, setActiveIndex] = useState(0);

    // --- Usage Logic ---
    const [isPending, startTransition] = useTransition();
    const [savedCounts, setSavedCounts] = useState(initialUsage);
    const [pendingDelta, setPendingDelta] = useState({ count45: 0, count75: 0 });
    const [message, setMessage] = useState<string | null>(null);

    const handleDelta = (size: 45 | 75, change: number) => {
        setPendingDelta(prev => ({
            ...prev,
            [size === 45 ? 'count45' : 'count75']: prev[size === 45 ? 'count45' : 'count75'] + change
        }));
    };

    const current45 = Math.max(0, savedCounts.count45 + pendingDelta.count45);
    const current75 = Math.max(0, savedCounts.count75 + pendingDelta.count75);
    const hasChanges = pendingDelta.count45 !== 0 || pendingDelta.count75 !== 0;

    const handleSubmit = () => {
        if (!hasChanges) return;

        startTransition(async () => {
            const result = await submitUsage(pendingDelta.count45, pendingDelta.count75);
            if (result.success) {
                setSavedCounts({ count45: 0, count75: 0 });
                setPendingDelta({ count45: 0, count75: 0 });
                setMessage('✅ 전송 완료되었습니다.');
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage('❌ 전송 실패: ' + (result.error || '알 수 없는 오류'));
            }
        });
    };

    // --- Pointer Swipe Logic ---
    const touchStartX = useRef<number | null>(null);

    const onPointerDown = (e: React.PointerEvent) => {
        // Prevent default only if needed, but for horizontal swipe usually we let browser handle potential scroll start
        touchStartX.current = e.clientX;
    };

    const onPointerUp = (e: React.PointerEvent) => {
        if (touchStartX.current === null) return;

        const diff = touchStartX.current - e.clientX;
        // Threshold 30px
        if (Math.abs(diff) > 30) {
            if (diff > 0) {
                // Swipe Left -> Next
                if (activeIndex === 0) setActiveIndex(1);
            } else {
                // Swipe Right -> Prev
                if (activeIndex === 1) setActiveIndex(0);
            }
        }
        touchStartX.current = null;
    };

    const onPointerLeave = (e: React.PointerEvent) => {
        // Same as Up
        onPointerUp(e);
    };

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Notice Widget */}
            {recentNotice && (
                <div style={{ width: '100%', maxWidth: '480px', padding: '0 1rem', marginBottom: '1rem' }}>
                    <Link href="/notices" style={{ textDecoration: 'none' }}>
                        <div style={{
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            borderRadius: '12px',
                            padding: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            cursor: 'pointer'
                        }}>
                            <span style={{ fontSize: '1.5rem' }}>📢</span>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {recentNotice.title}
                                </h3>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {recentNotice.content}
                                </p>
                            </div>
                            <span style={{ color: '#60a5fa', fontSize: '0.9rem' }}>&rarr;</span>
                        </div>
                    </Link>
                </div>
            )}

            {/* Custom Tabs */}
            <div className={styles.tabs}>
                <div
                    className={`${styles.tab} ${activeIndex === 0 ? styles.activeTab : ''}`}
                    onClick={() => setActiveIndex(0)}
                >
                    오늘의 배출량
                </div>
                <div
                    className={`${styles.tab} ${activeIndex === 1 ? styles.activeTab : ''}`}
                    onClick={() => setActiveIndex(1)}
                >
                    내 사용량 통계
                </div>
            </div>

            {/* Slider Window */}
            <div
                className={styles.sliderWindow}
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerLeave}
            >
                <div
                    className={styles.sliderContainer}
                    style={{ transform: `translateX(-${activeIndex * 50}%)` }}
                >
                    {/* Slide 1: Usage Input */}
                    <div className={styles.slide}>
                        <div className={styles.card}>
                            <h1 className={styles.title}>오늘의 배출량 입력</h1>

                            <div className={styles.inputRows}>
                                <div className={`${styles.row} ${styles.row45}`}>
                                    <div className={styles.bagInfo}>
                                        <div className={styles.bagIcon}>45L</div>
                                        <span className={styles.bagLabel}>일반 쓰레기</span>
                                    </div>
                                    <div className={styles.controls}>
                                        <button className={styles.controlBtn} onClick={() => handleDelta(45, -1)} disabled={current45 <= 0 || isPending}>−</button>
                                        <span className={styles.countValue}>{current45}</span>
                                        <button className={`${styles.controlBtn} ${styles.addBtn}`} onClick={() => handleDelta(45, 1)} disabled={isPending}>+</button>
                                    </div>
                                </div>

                                <div className={`${styles.row} ${styles.row75}`}>
                                    <div className={styles.bagInfo}>
                                        <div className={styles.bagIcon}>75L</div>
                                        <span className={styles.bagLabel}>대형 쓰레기</span>
                                    </div>
                                    <div className={styles.controls}>
                                        <button className={styles.controlBtn} onClick={() => handleDelta(75, -1)} disabled={current75 <= 0 || isPending}>−</button>
                                        <span className={styles.countValue}>{current75}</span>
                                        <button className={`${styles.controlBtn} ${styles.addBtn}`} onClick={() => handleDelta(75, 1)} disabled={isPending}>+</button>
                                    </div>
                                </div>
                            </div>

                            <div className={`${styles.message} ${message ? styles.messageVisible : ''}`}>{message}</div>

                            <button className={styles.sendButton} onClick={handleSubmit} disabled={!hasChanges || isPending}>
                                {isPending ? '전송 중...' : '전송하기'}
                            </button>
                        </div>
                    </div>

                    {/* Slide 2: Stats View */}
                    <div className={styles.slide}>
                        <MyStatsView stats={stats} />
                    </div>
                </div>
            </div>
        </div>
    );
}
