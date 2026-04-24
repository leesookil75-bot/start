'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import styles from '../v2.module.css';
import Link from 'next/link';
import SignatureCanvas from 'react-signature-canvas';
import { logout, submitUsage } from '../../actions';
import { LogOutIcon, KeyIcon } from '@/components/icons';
import MyStatsView from '../../components/MyStatsView';
import MyStatsEditCalendar from '../../components/MyStatsEditCalendar';

interface ClientHomeV2Props {
  initialUsage: any;
  stats: any;
  recentNotice: any;
  attendanceStatus: any;
  activeSafetyTraining: any;
  hasSignedSafetyTraining: boolean;
  user: {
    id: string;
    name: string;
    cleaningArea: string;
    role: string;
  }
}

export default function ClientHomeV2({
  initialUsage,
  stats,
  recentNotice,
  attendanceStatus,
  activeSafetyTraining,
  hasSignedSafetyTraining: initialHasSignedSafetyTraining,
  user
}: ClientHomeV2Props) {
  const [time, setTime] = useState<Date | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [hasSignedSafetyTraining, setHasSignedSafetyTraining] = useState(initialHasSignedSafetyTraining);
  const sigCanvas = useRef<any>(null);

  // Tab state for Garbage Bag & Stats
  const [activeIndex, setActiveIndex] = useState(0);
  
  // Usage state
  const [isUsagePending, startUsageTransition] = useTransition();
  const [savedCounts, setSavedCounts] = useState(initialUsage);
  const [pendingDelta, setPendingDelta] = useState({ count50: 0, count75: 0 });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSignatureSubmit = async () => {
    if (sigCanvas.current?.isEmpty()) {
      alert('서명을 입력해주세요.');
      return;
    }
    const signatureDataUrl = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
    if (!signatureDataUrl || !activeSafetyTraining) return;

    setIsPending(true);
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                try {
                    const res = await fetch('/api/safety-signatures', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            training_id: activeSafetyTraining.id,
                            user_id: user.id,
                            signature_data: signatureDataUrl,
                            lat,
                            lng
                        })
                    });
                    const data = await res.json();
                    setIsPending(false);
                    if (res.ok) {
                        setShowSignatureModal(false);
                        setHasSignedSafetyTraining(true);
                        alert('안전교육 서명이 완료되었습니다.');
                    } else {
                        alert(data.error || '서명 제출에 실패했습니다.');
                    }
                } catch(e) {
                    setIsPending(false);
                    alert('서명 제출 중 오류가 발생했습니다.');
                }
            },
            () => {
                setIsPending(false);
                alert('위치 정보를 가져올 수 없어 서명을 제출할 수 없습니다.');
            }
        );
    } else {
        setIsPending(false);
        alert('위치 정보를 지원하지 않는 브라우저입니다.');
    }
  };

  const handleSwitchToAdmin = () => {
    document.cookie = "view_mode=admin; path=/";
    window.location.href = '/admin?v=' + Date.now();
  };

  // Usage Methods
  const handleDelta = (size: 50 | 75, change: number) => {
    setPendingDelta(prev => ({
        ...prev,
        [size === 50 ? 'count50' : 'count75']: prev[size === 50 ? 'count50' : 'count75'] + change
    }));
  };

  const current50 = Math.max(0, savedCounts.count50 + pendingDelta.count50);
  const current75 = Math.max(0, savedCounts.count75 + pendingDelta.count75);
  const hasChanges = pendingDelta.count50 !== 0 || pendingDelta.count75 !== 0;

  const handleSubmitUsage = () => {
    if (!hasChanges) return;

    startUsageTransition(async () => {
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

  const formattedTime = time ? time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--';
  const formattedDate = time ? time.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }) : '로딩 중...';

  return (
    <div className={styles.main}>
      <header className={styles.header}>
        <div>
          <div className={styles.roleBadge}>{user.role === 'admin' || user.role === 'super_admin' ? '관리자 모드 접속 가능' : '현장 근로자'}</div>
          <h1 className={styles.greeting}>
            <span>{user.name}</span>님,<br/>환영합니다
          </h1>
        </div>
        <div className={styles.topActions}>
            <Link href="/change-password" className={styles.iconButton} aria-label="비밀번호 변경">
                <KeyIcon />
            </Link>
            {(user.role === 'admin' || user.role === 'super_admin') && (
                <button onClick={handleSwitchToAdmin} className={styles.iconButton} aria-label="관리자 모드 전환">
                    🔄
                </button>
            )}
            <form action={logout}>
                <button type="submit" onClick={() => {
                    document.cookie = "clean-track-user-id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                    document.cookie = "view_mode=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                }} className={styles.iconButton} aria-label="로그아웃">
                    <LogOutIcon />
                </button>
            </form>
        </div>
      </header>

      <div className={styles.clockContainer}>
        <div className={styles.time}>{formattedTime}</div>
        <div className={styles.date}>{formattedDate}</div>
      </div>

      {activeSafetyTraining && !hasSignedSafetyTraining && (
        <button 
            onClick={() => setShowSignatureModal(true)}
            className={styles.safetyBanner}
        >
            <div className={styles.safetyBannerIcon}>🦺</div>
            <div className={styles.safetyBannerTitle}>오늘의 안전교육을 확인해주세요</div>
            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>터치하여 서명하기</div>
        </button>
      )}

      {recentNotice && (
        <Link href={`/notices/${recentNotice.id}`} className={styles.noticeBanner}>
            <div style={{ fontSize: '1.5rem' }}>📢</div>
            <div className={styles.noticeContent}>
                <div className={styles.noticeTitle}>{recentNotice.title}</div>
                <div className={styles.noticeDate}>최신 공지사항</div>
            </div>
        </Link>
      )}

      <div className={styles.mainActionContainer}>
        {(!attendanceStatus || attendanceStatus.status === 'IDLE') && (
            <Link href="/attendance/map?mode=CHECK_IN" className={`${styles.checkInOutButton} ${styles.checkInMode}`}>
                <div className={styles.buttonIcon}>👋</div>
                <div className={styles.buttonText}>출근하기</div>
                <div className={styles.buttonSubtext}>오늘 하루도 안전하게!</div>
            </Link>
        )}
        {attendanceStatus?.status === 'WORKING' && (
            <Link href="/attendance/map?mode=CHECK_OUT" className={`${styles.checkInOutButton} ${styles.checkOutMode}`}>
                <div className={styles.buttonIcon}>🏠</div>
                <div className={styles.buttonText}>퇴근하기</div>
                <div className={styles.buttonSubtext}>수고하셨습니다!</div>
            </Link>
        )}
        {attendanceStatus?.status === 'DONE' && (
            <Link href="/attendance" className={`${styles.checkInOutButton} ${styles.disabled}`}>
                <div className={styles.buttonIcon}>✨</div>
                <div className={styles.buttonText}>근무 종료</div>
                <div className={styles.buttonSubtext}>오늘의 일정이 끝났습니다.</div>
            </Link>
        )}
      </div>

      <div className={styles.gridMenu}>
        <Link href="/attendance" className={styles.gridItem}>
            <div className={styles.gridIcon}>🕒</div>
            <div className={styles.gridTitle}>출퇴근 기록</div>
        </Link>
        <Link href="/map" className={styles.gridItem}>
            <div className={styles.gridIcon}>🗺️</div>
            <div className={styles.gridTitle}>지도 관제</div>
        </Link>
        <Link href="/vacations/apply" className={styles.gridItem}>
            <div className={styles.gridIcon}>🌴</div>
            <div className={styles.gridTitle}>휴가 신청</div>
        </Link>
        <Link href="/notices" className={styles.gridItem}>
            <div className={styles.gridIcon}>📋</div>
            <div className={styles.gridTitle}>공지 게시판</div>
        </Link>
      </div>

      {/* TABS FOR USAGE & STATS */}
      <div className={styles.tabs}>
          <div className={`${styles.tab} ${activeIndex === 0 ? styles.activeTab : ''}`} onClick={() => setActiveIndex(0)}>
              쓰레기봉투
          </div>
          <div className={`${styles.tab} ${activeIndex === 1 ? styles.activeTab : ''}`} onClick={() => setActiveIndex(1)}>
              사용 통계
          </div>
          <div className={`${styles.tab} ${activeIndex === 2 ? styles.activeTab : ''}`} onClick={() => setActiveIndex(2)}>
              기록 수정
          </div>
      </div>

      {activeIndex === 0 && (
          <div style={{ backgroundColor: '#1e1e1e', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.2rem' }}>오늘의 배출량 입력</h3>
              <div className={styles.inputRows}>
                  <div className={styles.row}>
                      <div className={styles.bagInfo}>50L 봉투</div>
                      <div className={styles.controls}>
                          <button className={styles.controlBtn} onClick={() => handleDelta(50, -1)} disabled={current50 <= 0 || isUsagePending}>−</button>
                          <span className={styles.countValue}>{current50}</span>
                          <button className={`${styles.controlBtn} ${styles.addBtn}`} onClick={() => handleDelta(50, 1)} disabled={isUsagePending}>+</button>
                      </div>
                  </div>
                  <div className={styles.row}>
                      <div className={styles.bagInfo}>75L 봉투</div>
                      <div className={styles.controls}>
                          <button className={styles.controlBtn} onClick={() => handleDelta(75, -1)} disabled={current75 <= 0 || isUsagePending}>−</button>
                          <span className={styles.countValue}>{current75}</span>
                          <button className={`${styles.controlBtn} ${styles.addBtn}`} onClick={() => handleDelta(75, 1)} disabled={isUsagePending}>+</button>
                      </div>
                  </div>
              </div>
              {message && <p style={{ color: message.includes('❌') ? '#ef4444' : '#10b981', textAlign: 'center', marginBottom: '1rem' }}>{message}</p>}
              <button
                  className={styles.submitButton}
                  onClick={handleSubmitUsage}
                  disabled={isUsagePending || !hasChanges}
              >
                  {isUsagePending ? '전송 중...' : '사용량 전송하기'}
              </button>
          </div>
      )}

      {activeIndex === 1 && (
          <div style={{ backgroundColor: '#1e1e1e', borderRadius: '16px', padding: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <MyStatsView stats={stats} />
          </div>
      )}

      {activeIndex === 2 && (
          <div style={{ backgroundColor: '#1e1e1e', borderRadius: '16px', padding: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <MyStatsEditCalendar />
          </div>
      )}


      {showSignatureModal && (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h3 className={styles.modalTitle}>안전교육 전자서명</h3>
                <p className={styles.modalDescription}>
                    오늘의 안전교육({activeSafetyTraining?.title}) 내용을 숙지하였으며, 이에 서명합니다.
                </p>
                
                <div className={styles.signatureCanvas}>
                    <SignatureCanvas 
                        ref={sigCanvas} 
                        penColor="black"
                        canvasProps={{width: '100%', height: '100%', className: 'sigCanvas'}} 
                    />
                </div>
                
                <div className={styles.modalActions}>
                    <button 
                        onClick={() => sigCanvas.current?.clear()} 
                        className={styles.modalBtnSecondary}
                    >
                        지우기
                    </button>
                    <button 
                        onClick={handleSignatureSubmit} 
                        disabled={isPending}
                        className={styles.modalBtnPrimary}
                    >
                        {isPending ? '제출 중...' : '서명 제출'}
                    </button>
                </div>
                <button 
                    onClick={() => setShowSignatureModal(false)}
                    style={{ background: 'none', border: 'none', color: '#888', marginTop: '1rem', padding: '0.5rem' }}
                >
                    취소
                </button>
            </div>
        </div>
      )}
    </div>
  );
}
