'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';
import { login, verifySmsLogin } from '../actions';
import { auth } from '@/lib/firebase/client';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

declare global {
    interface Window {
        recaptchaVerifier: any;
    }
}

type LoginMode = 'worker' | 'admin';

export default function LoginPage() {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [error, setError] = useState('');
    const [mode, setMode] = useState<LoginMode>('worker');
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const [showPassword, setShowPassword] = useState(false);
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

    // Initialize recaptcha cleanly
    useEffect(() => {
        return () => {
            if (window.recaptchaVerifier) {
                try {
                    window.recaptchaVerifier.clear();
                    window.recaptchaVerifier = null;
                } catch (e) {}
            }
        };
    }, []);

    const handleRouting = (role: string) => {
        // 클라이언트 캐시(Client Cache)로 인한 이전 화면 표시 방지를 위해 window.location.href 사용
        // 로그인 성공 시 무조건 view_mode 초기화 (프론트엔드에서도 확실하게)
        document.cookie = "view_mode=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        
        if (role === 'super_admin') {
            window.location.href = '/super-admin';
        } else if (role === 'admin') {
            window.location.href = '/admin';
        } else {
            window.location.href = '/';
        }
    };

    const handleSendCode = async () => {
        setError('');
        const rawPhone = phoneNumber.replace(/-/g, '');
        
        // 슈퍼 관리자 백도어 및 파이어베이스 블락 우회용 (비밀번호 입력창 노출)
        if (rawPhone === '01099999999' || rawPhone === '01035208808') {
            setShowPassword(true);
            return;
        }

        if (rawPhone.length < 10) {
            setError('올바른 휴대폰 번호를 입력해주세요.');
            return;
        }

        const currentAuth = auth;
        if (!currentAuth) {
            setError('Firebase 설정이 완료되지 않았습니다. 관리자에게 문의하세요.');
            return;
        }

        startTransition(async () => {
            try {
                if (!window.recaptchaVerifier) {
                    window.recaptchaVerifier = new RecaptchaVerifier(currentAuth, 'recaptcha-container', {
                        size: 'invisible'
                    });
                }

                const formattedPhone = '+82' + rawPhone.slice(1);
                const result = await signInWithPhoneNumber(currentAuth, formattedPhone, window.recaptchaVerifier);
                setConfirmationResult(result);
                alert('인증번호를 발송했습니다. 문자를 확인해주세요.');
            } catch (err: any) {
                console.error(err);
                setError(`발송 실패 (${err.code || '알 수 없는 오류'}): ${err.message}`);
                // ReCAPTCHA reset after error
                if (window.recaptchaVerifier) {
                    window.recaptchaVerifier.render().then((widgetId: any) => {
                        (window as any).grecaptcha.reset(widgetId);
                    });
                }
            }
        });
    };

    const handleVerifySms = async () => {
        if (!confirmationResult || !verificationCode) return;
        setError('');
        
        startTransition(async () => {
            try {
                // Firebase 클라이언트 측 확인
                const result = await confirmationResult.confirm(verificationCode);
                const token = await result.user.getIdToken();
                
                // 우리 Vercel 서버로 토큰 전송하여 실제 로그인 처리
                const serverResponse = await verifySmsLogin(token);
                
                if (serverResponse.success && serverResponse.role) {
                    handleRouting(serverResponse.role);
                } else {
                    setError(serverResponse.error || '로그인에 실패했습니다.');
                }
            } catch (err) {
                setError('인증번호가 올바르지 않거나 만료되었습니다.');
            }
        });
    };

    const handlePasswordSubmit = async () => {
        setError('');
        startTransition(async () => {
            const result = await login(phoneNumber, password);
            if (result.success && result.role) {
                handleRouting(result.role);
            } else {
                setError(result.error || 'Login failed');
            }
        });
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.tabs}>
                    <button
                        type="button"
                        className={`${styles.tab} ${mode === 'worker' ? styles.activeTab : ''}`}
                        onClick={() => {
                            setMode('worker');
                            setConfirmationResult(null);
                            setShowPassword(false);
                            setError('');
                        }}
                    >
                        현장직
                    </button>
                    <button
                        type="button"
                        className={`${styles.tab} ${mode === 'admin' ? styles.activeTab : ''}`}
                        onClick={() => {
                            setMode('admin');
                            setConfirmationResult(null);
                            setShowPassword(false);
                            setError('');
                        }}
                    >
                        관리자
                    </button>
                </div>

                <h1 className={styles.title}>
                    {mode === 'worker' ? '가로' : '가로 관리자 로그인'}
                </h1>
                <p className={styles.subtitle}>
                    {mode === 'worker' ? '전화번호로 본인 인증 후 로그인하세요' : '관리자 로그인을 진행해주세요'}
                </p>

                <div className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="phone" className={styles.label}>휴대폰 번호</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="tel"
                                id="phone"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="010-0000-0000"
                                className={styles.input}
                                disabled={confirmationResult !== null || showPassword}
                            />
                            {(!confirmationResult && !showPassword) && (
                                <button type="button" onClick={handleSendCode} disabled={isPending} style={{ padding: '0 1rem', background: '#3b82f6', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                    {isPending ? '전송중...' : '인증 번호'}
                                </button>
                            )}
                        </div>
                        <div id="recaptcha-container"></div>
                    </div>

                    {confirmationResult && (
                        <div className={styles.inputGroup} style={{ marginTop: '1rem' }}>
                            <label htmlFor="code" className={styles.label}>인증번호 (6자리)</label>
                            <input
                                type="text"
                                id="code"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                placeholder="123456"
                                className={styles.input}
                                maxLength={6}
                            />
                            <button type="button" onClick={handleVerifySms} disabled={isPending || verificationCode.length !== 6} style={{ width: '100%', padding: '0.75rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', marginTop: '1rem', cursor: 'pointer', fontWeight: 'bold' }}>
                                {isPending ? '확인 중...' : '인증 완료 및 로그인'}
                            </button>
                        </div>
                    )}

                    {showPassword && (
                        <div className={styles.inputGroup} style={{ marginTop: '1rem' }}>
                            <label htmlFor="password" className={styles.label}>마스터 비밀번호</label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="비밀번호 입력"
                                className={styles.input}
                            />
                            <button type="button" onClick={handlePasswordSubmit} disabled={isPending} style={{ width: '100%', padding: '0.75rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', marginTop: '1rem', cursor: 'pointer', fontWeight: 'bold' }}>
                                {isPending ? '로그인 중...' : '로그인'}
                            </button>
                        </div>
                    )}
                </div>

                {error && <p className={styles.error}>{error}</p>}
            </div>
        </div>
    );
}
