'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import styles from './page.module.css';
import { BellIcon, KeyIcon, LogOutIcon, PlaneIcon } from '@/components/icons';
import { submitUsage } from './actions';
import MyStatsView from './components/MyStatsView';
import MyStatsEditCalendar from './components/MyStatsEditCalendar';
import InstallPrompt from '@/components/InstallPrompt';
import Link from 'next/link';
import { logout, switchViewMode } from './actions';
import SafetySignatureModal from './components/SafetySignatureModal';
import { useRouter } from 'next/navigation';

interface ClientHomeProps {
    initialUsage: { count50: number; count75: number };
    stats: any;
    recentNotice?: {
        id: string;
        title: string;
    } | null;
    attendanceStatus: {
        status: 'IDLE' | 'WORKING' | 'DONE';
        startTime?: string;
        endTime?: string;
    };
    activeSafetyTraining?: {
        id: string;
        title: string;
    } | null;
    hasSignedSafetyTraining?: boolean;
    user: {
        id: string;
        name: string;
        cleaningArea: string;
        role: string;
    };
}

export default function ClientHome({ initialUsage, stats, attendanceStatus, activeSafetyTraining, hasSignedSafetyTraining: initialHasSigned, user, recentNotice }: ClientHomeProps) {
    const router = useRouter();
    // 0 = Usage, 1 = Stats, 2 = Edit Calendar
    const [activeIndex, setActiveIndex] = useState(0);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [hasSignedSafetyTraining, setHasSignedSafetyTraining] = useState(initialHasSigned);

    const handleSwitchToAdmin = async () => {
        const mode = user.role === 'super_admin' ? 'super_admin' : 'admin';
        await switchViewMode(mode);
        window.location.href = (mode === 'super_admin' ? '/super-admin' : '/admin') + '?v=' + Date.now();
    };

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
                setActiveIndex(prev => Math.min(2, prev + 1)); // Next
            } else {
                setActiveIndex(prev => Math.max(0, prev - 1)); // Prev
            }
        }
        startX.current = null;
    };

    const onPointerLeave = () => {
        startX.current = null;
    };

    // --- Attendance Button Logic ---
    const renderAttendanceButton = () => {
        if (attendanceStatus.status === 'IDLE') {
            return (
                <Link href="/attendance/map?mode=CHECK_IN" className={styles.attendanceBtn}>
                    <div className={styles.attendanceIcon}>🕒</div>
                    <div className={styles.attendanceText}>출근하기</div>
                </Link>
            );
        } else if (attendanceStatus.status === 'WORKING') {
            return (
                <Link href="/attendance/map?mode=CHECK_OUT" className={`${styles.attendanceBtn} ${styles.checkOutBtn}`}>
                    <div className={styles.attendanceIcon}>🏃</div>
                    <div className={styles.attendanceText}>퇴근하기</div>
                </Link>
            );
        } else {
            return (
                <Link href="/attendance" className={`${styles.attendanceBtn} ${styles.doneBtn}`}>
                    <div className={styles.attendanceIcon}>✅</div>
                    <div className={styles.attendanceText}>오늘 근무 완료</div>
                    {attendanceStatus.startTime && attendanceStatus.endTime && (
                        <div className={styles.attendanceSubText}>
                            {new Date(attendanceStatus.startTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} ~
                            {new Date(attendanceStatus.endTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    )}
                </Link>
            );
        }
    };

    return (
        <div className={styles.responsiveContainer}>
            {/* Sidebar (Desktop Only) */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.logo}>가로</div>
                    <div className={styles.sidebarUserInfo}>
                        <div className={styles.sidebarUserName}>{user.name} 님</div>
                        <div className={styles.sidebarUserArea}>{user.cleaningArea}</div>
                    </div>
                </div>

                <nav className={styles.sidebarNav}>
                    <button
                        onClick={() => setActiveIndex(0)}
                        className={`${styles.sidebarNavItem} ${activeIndex === 0 ? styles.sidebarNavActive : ''}`}
                    >
                        📝 배출량 입력
                    </button>
                    <button
                        onClick={() => setActiveIndex(1)}
                        className={`${styles.sidebarNavItem} ${activeIndex === 1 ? styles.sidebarNavActive : ''}`}
                    >
                        📊 배출량 통계
                    </button>
                    <div className={styles.sidebarDivider} />
                    <Link href="/attendance" className={styles.sidebarNavItem}>
                        📅 출퇴근 기록
                    </Link>
                    <Link href="/map" className={styles.sidebarNavItem}>
                        🗺️ 내 청소 구역
                    </Link>
                    <Link href="/notices" className={styles.sidebarNavItem}>
                        📢 공지사항
                    </Link>
                    <Link href="/change-password" className={styles.sidebarNavItem}>
                        🔒 비밀번호 변경
                    </Link>
                    {(user.role === 'admin' || user.role === 'super_admin') && (
                        <button onClick={handleSwitchToAdmin} className={styles.sidebarNavItem} style={{ color: '#3182ce', fontWeight: 'bold' }}>
                            🔄 관리자 모드로 돌아가기
                        </button>
                    )}
                    <form action={logout}>
                        <button type="submit" onClick={() => {
                            document.cookie = "clean-track-user-id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                                document.cookie = "view_mode=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                        }} className={styles.sidebarLogoutBtn}>로그아웃</button>
                    </form>
                </nav>
            </aside>

            {/* Main Content Area */}
            <div className={styles.contentWrapper}>
                {/* Header (Mobile Only) */}
                <div className={styles.header}>
                    <div className={styles.userInfo}>
                        <span className={styles.userName}>{user.name} 님</span>
                        <span className={styles.userArea}>({user.cleaningArea})</span>
                    </div>
                    <div className={styles.headerActions}>
                        <Link href="/map" className={styles.iconLink} aria-label="지도">
                            <span style={{ fontSize: '1.2rem' }}>🗺️</span>
                        </Link>
                        <Link href="/attendance" className={styles.iconLink} aria-label="출퇴근">
                            <span style={{ fontSize: '1.2rem' }}>🕒</span>
                        </Link>
                        <Link href="/notices" className={styles.iconLink} aria-label="공지사항">
                            <BellIcon />
                        </Link>
                        <Link href="/vacations/apply" className={styles.iconLink} aria-label="휴가 신청">
                            <PlaneIcon />
                        </Link>
                        <Link href="/change-password" className={styles.iconLink} aria-label="비밀번호 변경">
                            <KeyIcon />
                        </Link>
                        {(user.role === 'admin' || user.role === 'super_admin') && (
                            <button onClick={handleSwitchToAdmin} className={styles.iconButton} aria-label="관리자 모드">
                                🔄
                            </button>
                        )}
                        <form action={logout}>
                            <button type="submit" onClick={() => {
                                document.cookie = "clean-track-user-id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                                document.cookie = "view_mode=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                                document.cookie = "view_mode=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                            }} className={styles.iconButton} aria-label="로그아웃">
                                <LogOutIcon />
                            </button>
                        </form>
                    </div>
                </div>

                {/* Attendance Buttons (Replaces Notice Widget) */}
                <div className={styles.noticeContainer}>
                    {renderAttendanceButton()}
                </div>

                {/* Safety Training Banner */}
                {activeSafetyTraining && !hasSignedSafetyTraining && (
                    <div className={styles.noticeContainer} style={{ marginBottom: '16px' }}>
                        <button 
                            onClick={() => setShowSignatureModal(true)}
                            style={{
                                width: '100%',
                                padding: '20px',
                                backgroundColor: '#e53e3e',
                                color: 'white',
                                borderRadius: '16px',
                                border: 'none',
                                fontSize: '1.2rem',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                            }}
                        >
                            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                            오늘 안전교육 서명하기
                        </button>
                    </div>
                )}

                {recentNotice && (
                    <div className={styles.noticeContainer}>
                        <Link href={`/notices/${recentNotice.id}`} className={styles.noticeBanner}>
                            <div className={styles.noticeIcon}>📢</div>
                            <div className={styles.noticeText}>
                                <span className={styles.scrollingText}>{recentNotice.title}   ---   {recentNotice.title}   ---   {recentNotice.title}</span>
                            </div>
                        </Link>
                    </div>
                )}

                {/* Mobile Tabs */}
                <div className={styles.tabs}>
                    <div
                        className={`${styles.tab} ${activeIndex === 0 ? styles.activeTab : ''}`}
                        onClick={() => setActiveIndex(0)}
                    >
                        입력
                    </div>
                    <div
                        className={`${styles.tab} ${activeIndex === 1 ? styles.activeTab : ''}`}
                        onClick={() => setActiveIndex(1)}
                    >
                        통계
                    </div>
                    <div
                        className={`${styles.tab} ${activeIndex === 2 ? styles.activeTab : ''}`}
                        onClick={() => setActiveIndex(2)}
                    >
                        수정
                    </div>
                </div>

                <InstallPrompt />

                {/* Content Slider/Grid */}
                <div
                    className={styles.sliderWindow}
                    onPointerDown={onPointerDown}
                    onPointerUp={onPointerUp}
                    onPointerLeave={onPointerLeave}
                >
                    <div
                        className={styles.sliderContainer}
                        style={{ transform: `translateX(-${activeIndex * 33.3333}%)` }}
                        data-active-index={activeIndex}
                    >
                        {/* Slide 1: Usage Input */}
                        <div className={styles.slide}>
                            <div className={styles.card}>
                                <h1 className={styles.title}>배출량 입력</h1>

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

                                {message && <p className={styles.message}>{message}</p>}

                                <button
                                    className={styles.submitButton}
                                    onClick={handleSubmit}
                                    disabled={isPending || !hasChanges}
                                >
                                    {isPending ? '전송 중...' : '전송'}
                                </button>
                            </div>
                        </div>

                        {/* Slide 2: Stats View */}
                        <div className={styles.slide}>
                            <MyStatsView stats={stats} />
                        </div>

                        {/* Slide 3: Edit Calendar View (Mobile Only) */}
                        <div className={styles.slide}>
                            <MyStatsEditCalendar />
                        </div>
                    </div>
                </div>
            </div>

            {/* Signature Modal */}
            {showSignatureModal && activeSafetyTraining && (
                <SafetySignatureModal
                    trainingId={activeSafetyTraining.id}
                    trainingTitle={activeSafetyTraining.title}
                    userId={user.id}
                    onClose={() => setShowSignatureModal(false)}
                    onSuccess={() => {
                        setShowSignatureModal(false);
                        setHasSignedSafetyTraining(true);
                        alert('안전교육 출석이 완료되었습니다!');
                    }}
                />
            )}
        </div>
    );
}
