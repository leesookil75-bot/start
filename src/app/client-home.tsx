'use client';

import { useState, useTransition, useRef } from 'react';
import styles from './page.module.css';
import { submitUsage } from './actions';
import MyStatsView from './components/MyStatsView';
import InstallPrompt from '@/components/InstallPrompt';

import Link from 'next/link';

interface ClientHomeProps {
    initialUsage: { count50: number; count75: number };
    stats: any;
    recentNotice?: any; // Avoiding strict type sharing for now to keep client component clean
}

export default function ClientHome({ initialUsage, stats, recentNotice }: ClientHomeProps) {
    // 0 = Usage, 1 = Stats
    const [activeIndex, setActiveIndex] = useState(0);

    // --- Usage Logic ---
    const [isPending, startTransition] = useTransition();
    const [savedCounts, setSavedCounts] = useState(initialUsage);
    const [pendingDelta, setPendingDelta] = useState({ count50: 0, count75: 0 });
    const [message, setMessage] = useState<string | null>(null);

    const handleDelta = (size: 50 | 75, change: number) => {
        setPendingDelta(prev => ({
            ...prev,
            [size === 50 ? 'count50' : 'count75']: prev[size === 50 ? 'count50' : 'count75'] + change
        }));
    };

    const current50 = Math.max(0, savedCounts.count50 + pendingDelta.count50);
    const current75 = Math.max(0, savedCounts.count75 + pendingDelta.count75);
    const hasChanges = pendingDelta.count50 !== 0 || pendingDelta.count75 !== 0;

    const handleSubmit = () => {
        if (!hasChanges) return;

        startTransition(async () => {
            const result = await submitUsage(pendingDelta.count50, pendingDelta.count75);
            if (result.success) {
                setSavedCounts({ count50: 0, count75: 0 });
                setPendingDelta({ count50: 0, count75: 0 });
                setMessage('✅ 전송 완료되었습니다.');
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage('❌ 전송 실패: ' + (result.error || '알 수 없는 오류'));
            }
        });
    };

    // --- Pointer Swipe Logic ---
    const startX = useRef<number | null>(null);

    const onPointerDown = (e: React.PointerEvent) => {
        startX.current = e.clientX;
    };

    const onPointerUp = (e: React.PointerEvent) => {
        if (startX.current === null) return;
        const diff = startX.current - e.clientX;
        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                setActiveIndex(1); // Next
            } else {
                setActiveIndex(0); // Prev
            }
        }
        startX.current = null;
    };

    const onPointerLeave = () => {
        startX.current = null;
    };

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* ... (Notice Widget) */}

            {/* ... (Custom Tabs) */}

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
                                <div className={`${styles.row} ${styles.row50}`}>
                                    <div className={styles.bagInfo}>
                                        <div className={styles.bagIcon}>50L</div>
                                        <span className={styles.bagLabel}>일반 쓰레기</span>
                                    </div>
                                    <div className={styles.controls}>
                                        <button className={styles.controlBtn} onClick={() => handleDelta(50, -1)} disabled={current50 <= 0 || isPending}>−</button>
                                        <span className={styles.countValue}>{current50}</span>
                                        <button className={`${styles.controlBtn} ${styles.addBtn}`} onClick={() => handleDelta(50, 1)} disabled={isPending}>+</button>
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

                            {message && <p className={styles.message}>{message}</p>}

                            <button
                                className={styles.submitButton}
                                onClick={handleSubmit}
                                disabled={isPending || !hasChanges}
                            >
                                {isPending ? '전송 중...' : '오늘 배출량 전송'}
                            </button>
                        </div>
                    </div>

                    {/* Slide 2: Stats View */}
                    <div className={styles.slide}>
                        <MyStatsView stats={stats} />
                    </div>
                </div>
            </div>

            {/* Global InstallPrompt is now in layout.tsx, removed from here */}
        </div>
    );
}

