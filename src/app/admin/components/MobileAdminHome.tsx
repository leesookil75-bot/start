'use client';

import Link from 'next/link';
import { useState } from 'react';
import styles from '../admin.module.css';

interface MobileAdminHomeProps {
    userName: string;
    agencyName?: string;\n    userRole?: string;
    onLogout: () => void;
}

export default function MobileAdminHome({ userName, agencyName, userRole, onLogout }: MobileAdminHomeProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <div style={{ padding: '1.5rem', minHeight: '100vh', background: '#121212', color: '#fff' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>관리자 홈</h1>
                <button
                    onClick={() => setIsMenuOpen(true)}
                    style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}
                >
                    ⚙️
                </button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Link href="/admin/users" style={{ textDecoration: 'none' }}>
                    <div style={{ background: '#1e1e1e', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', aspectRatio: '1', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👥</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff' }}>사용자 관리</div>
                    </div>
                </Link>

                <Link href="/admin/attendance" style={{ textDecoration: 'none' }}>
                    <div style={{ background: '#1e1e1e', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', aspectRatio: '1', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⏱️</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff' }}>출퇴근 현황</div>
                    </div>
                </Link>

                <Link href="/admin/vacations" style={{ textDecoration: 'none' }}>
                    <div style={{ background: '#1e1e1e', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', aspectRatio: '1', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🌴</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff' }}>휴가 관리</div>
                    </div>
                </Link>

                <Link href="/admin/notices" style={{ textDecoration: 'none' }}>
                    <div style={{ background: '#1e1e1e', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', aspectRatio: '1', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📢</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff' }}>공지사항</div>
                    </div>
                </Link>

                <Link href="/map" style={{ textDecoration: 'none' }}>
                    <div style={{ background: '#1e1e1e', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', aspectRatio: '1', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🗺️</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff' }}>지도 관제</div>
                    </div>
                </Link>
            </div>

            {/* Settings Bottom Sheet / Modal */}
            {isMenuOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(2px)' }} onClick={() => setIsMenuOpen(false)}>
                    <div onClick={(e) => e.stopPropagation()} style={{ background: '#1e1e1e', width: '100%', padding: '2rem', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', animation: 'slideUp 0.3s ease-out' }}>
                        <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: '0 auto 1.5rem' }} />

                        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: '#fff' }}>내 정보</h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                                <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '0.25rem' }}>현재 계정</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{userName}</div>
                                {agencyName && (
                                    <div style={{ fontSize: '0.85rem', color: '#3b82f6', marginTop: '0.25rem' }}>소속: {agencyName}</div>
                                )}
                            </div>

                            <Link href="/change-password" style={{ textDecoration: 'none' }}>
                                <button style={{ width: '100%', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                                    비밀번호 변경
                                </button>
                            </Link>

                            
                            {userRole === 'super_admin' && (
                                <button onClick={() => {
                                    document.cookie = "view_mode=super_admin; path=/";
                                    window.location.href = '/super-admin?v=' + Date.now();
                                }} style={{ width: '100%', padding: '1rem', background: '#e2e8f0', color: '#333', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                                    👑 마스터 대시보드로 복귀
                                </button>
                            )}
                            <button onClick={async () => {
                                document.cookie = "clean-track-user-id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                                await onLogout();
                            }} style={{ width: '100%', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                                로그아웃
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <style jsx>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
