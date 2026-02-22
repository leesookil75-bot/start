'use client';

import { useState, useEffect, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { getUserMonthlyUsages, submitUsageForDate } from '../actions';
import styles from '../page.module.css';

export default function MyStatsEditCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [monthlyData, setMonthlyData] = useState<Record<string, { count50: number, count75: number }>>({});
    const [isLoading, setIsLoading] = useState(false);

    // Modal state
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [pendingDelta, setPendingDelta] = useState({ count50: 0, count75: 0 });
    const [message, setMessage] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    useEffect(() => {
        setMounted(true);
        loadData();
    }, [year, month]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await getUserMonthlyUsages(year, month);
            setMonthlyData(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(year, month - 2, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(year, month, 1));
    };

    // Calendar logic
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0(Sun) - 6(Sat)

    const days = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
        days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    const handleDateClick = (day: number) => {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        // Future dates shouldn't be edited realistically, but let's allow up to today
        const todayStr = new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
        if (dateStr > todayStr) {
            alert('미래의 날짜는 수정할 수 없습니다.');
            return;
        }
        setSelectedDate(dateStr);
        setPendingDelta({ count50: 0, count75: 0 });
        setMessage(null);
    };

    const closeEditing = () => {
        setSelectedDate(null);
        setPendingDelta({ count50: 0, count75: 0 });
    };

    const handleDelta = (size: 50 | 75, change: number) => {
        setPendingDelta(prev => ({
            ...prev,
            [size === 50 ? 'count50' : 'count75']: prev[size === 50 ? 'count50' : 'count75'] + change
        }));
    };

    const current50 = Math.max(0, (monthlyData[selectedDate!]?.count50 || 0) + pendingDelta.count50);
    const current75 = Math.max(0, (monthlyData[selectedDate!]?.count75 || 0) + pendingDelta.count75);
    const hasChanges = pendingDelta.count50 !== 0 || pendingDelta.count75 !== 0;

    const handleSubmit = () => {
        if (!hasChanges || !selectedDate) return;

        startTransition(async () => {
            const result = await submitUsageForDate(pendingDelta.count50, pendingDelta.count75, selectedDate);
            if (result.success) {
                setMessage('✅ 수정 완료되었습니다.');
                await loadData(); // refresh data
                setTimeout(() => {
                    closeEditing();
                }, 1000);
            } else {
                setMessage('❌ 수정 실패: ' + (result.error || '알 수 없는 오류'));
            }
        });
    };

    return (
        <div className={styles.card}>
            <h1 className={styles.title} style={{ marginBottom: '1.5rem', textAlign: 'center', fontSize: '1.5rem' }}>
                배출량 수정 ({month}월)
            </h1>

            <div style={{ width: '100%', background: 'rgba(0, 0, 0, 0.2)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <button onClick={handlePrevMonth} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#fff' }}>◀</button>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: '#fff' }}>{year}년 {month}월</h2>
                    <button onClick={handleNextMonth} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#fff', opacity: (year === new Date().getFullYear() && month === new Date().getMonth() + 1) ? 0.3 : 1 }} disabled={year === new Date().getFullYear() && month === new Date().getMonth() + 1}>▶</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '0.5rem', fontWeight: 'bold', color: '#9ca3af', fontSize: '0.85rem' }}>
                    <div style={{ color: '#ef4444' }}>일</div>
                    <div>월</div>
                    <div>화</div>
                    <div>수</div>
                    <div>목</div>
                    <div>금</div>
                    <div style={{ color: '#3b82f6' }}>토</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                    {days.map((day, idx) => {
                        if (day === null) return <div key={`empty-${idx}`} style={{ padding: '0.5rem' }} />;

                        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const data = monthlyData[dateStr];
                        const hasData = data && (data.count50 > 0 || data.count75 > 0);

                        const isToday = dateStr === new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];

                        return (
                            <div
                                key={day}
                                onClick={() => handleDateClick(day)}
                                style={{
                                    padding: '0.25rem',
                                    border: isToday ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    background: hasData ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255,255,255,0.02)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    minHeight: '60px',
                                    opacity: dateStr > new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0] ? 0.5 : 1
                                }}
                            >
                                <span style={{ fontSize: '0.85rem', fontWeight: isToday ? 'bold' : 'normal', marginBottom: '4px', color: '#e5e7eb' }}>{day}</span>
                                {hasData && (
                                    <div style={{ fontSize: '0.7rem', display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
                                        {data.count50 > 0 && <div style={{ background: 'rgba(59, 130, 246, 0.5)', color: '#fff', padding: '2px 4px', borderRadius: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>50L: {data.count50}</div>}
                                        {data.count75 > 0 && <div style={{ background: 'rgba(245, 158, 11, 0.5)', color: '#fff', padding: '2px 4px', borderRadius: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>75L: {data.count75}</div>}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {mounted && selectedDate && createPortal(
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 2000, backdropFilter: 'blur(2px)'
                }}>
                    <div className={styles.card} style={{ width: '90%', maxWidth: '400px', margin: 0 }}>
                        <h3 className={styles.title} style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', textAlign: 'center' }}>
                            {selectedDate} 배출량 수정
                        </h3>

                        <div className={styles.inputRows}>
                            <div className={`${styles.row} ${styles.row50}`}>
                                <div className={styles.bagInfo}>
                                    <div className={styles.bagIcon}>50L</div>
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
                                </div>
                                <div className={styles.controls}>
                                    <button className={styles.controlBtn} onClick={() => handleDelta(75, -1)} disabled={current75 <= 0 || isPending}>−</button>
                                    <span className={styles.countValue}>{current75}</span>
                                    <button className={`${styles.controlBtn} ${styles.addBtn}`} onClick={() => handleDelta(75, 1)} disabled={isPending}>+</button>
                                </div>
                            </div>
                        </div>

                        {message && <p className={styles.message} style={{ marginTop: '1rem', textAlign: 'center' }}>{message}</p>}

                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                            <button
                                onClick={closeEditing}
                                style={{ flex: 1, padding: '0.75rem', background: '#f3f4f6', border: 'none', borderRadius: '8px', color: '#374151', fontWeight: 'bold' }}
                                disabled={isPending}
                            >
                                취소
                            </button>
                            <button
                                className={styles.submitButton}
                                style={{ flex: 1, marginTop: 0 }}
                                onClick={handleSubmit}
                                disabled={isPending || !hasChanges}
                            >
                                {isPending ? '저장 중...' : '변경 내용 저장'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
