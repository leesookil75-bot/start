'use client';

import { useState, useEffect, useRef } from 'react';
import styles from '../v2.module.css';
import Link from 'next/link';
import SignatureCanvas from 'react-signature-canvas';
import { recordUsage, logout } from '../../actions';
import { LogOutIcon, KeyIcon } from '@/components/icons';

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

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAction = (actionType: 'check-in' | 'check-out') => {
    setIsPending(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            await recordUsage(actionType, position.coords.latitude, position.coords.longitude);
            window.location.reload();
          } catch (error) {
            alert('기록 중 오류가 발생했습니다.');
            setIsPending(false);
          }
        },
        (error) => {
          alert('위치 정보를 가져올 수 없습니다. 권한을 확인해주세요.');
          setIsPending(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      alert('이 기기에서는 위치 정보를 지원하지 않습니다.');
      setIsPending(false);
    }
  };

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

  const formattedTime = time ? time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--';
  const formattedDate = time ? time.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }) : '로딩 중...';

  // Determine button state
  let buttonMode: 'check-in' | 'check-out' | 'disabled' = 'check-in';
  let buttonText = '출근하기';
  let buttonSubtext = '오늘 하루도 안전하게!';

  if (attendanceStatus) {
      if (attendanceStatus.checkInTime && !attendanceStatus.checkOutTime) {
          buttonMode = 'check-out';
          buttonText = '퇴근하기';
          buttonSubtext = '수고하셨습니다!';
      } else if (attendanceStatus.checkInTime && attendanceStatus.checkOutTime) {
          buttonMode = 'disabled';
          buttonText = '근무 종료';
          buttonSubtext = '오늘의 일정이 끝났습니다.';
      }
  }

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
        <button
            onClick={() => buttonMode !== 'disabled' && handleAction(buttonMode)}
            disabled={isPending || buttonMode === 'disabled'}
            className={`${styles.checkInOutButton} ${
                buttonMode === 'check-in' ? styles.checkInMode : 
                buttonMode === 'check-out' ? styles.checkOutMode : styles.disabled
            }`}
        >
            <div className={styles.buttonIcon}>
                {buttonMode === 'check-in' ? '👋' : buttonMode === 'check-out' ? '🏠' : '✨'}
            </div>
            <div className={styles.buttonText}>{isPending ? '처리 중...' : buttonText}</div>
            <div className={styles.buttonSubtext}>{buttonSubtext}</div>
        </button>
      </div>

      <div className={styles.statusCard}>
        <div className={styles.statusHeader}>
            이번 달 근무 현황
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
                <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.25rem' }}>정상 출근</div>
                <div className={styles.statusValue}>{stats.workDays}<span className={styles.statusUnit}>일</span></div>
            </div>
            <div>
                <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.25rem' }}>잔여 연차</div>
                <div className={styles.statusValue}>{stats.remainingLeaves}<span className={styles.statusUnit}>일</span></div>
            </div>
        </div>
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
