'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';
import { login } from '../actions';

type LoginMode = 'worker' | 'admin';

export default function LoginPage() {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [mode, setMode] = useState<LoginMode>('worker');
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        startTransition(async () => {
            // For admin, we force password check (actions.ts handles it)
            // For worker, we also force password check now.
            const result = await login(phoneNumber, password);
            if (result.success) {
                // The server action sets the cookie, redirection handles by next logic
                router.push(mode === 'admin' ? '/admin' : '/');
                router.refresh();
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
                        onClick={() => setMode('worker')}
                    >
                        현장직
                    </button>
                    <button
                        type="button"
                        className={`${styles.tab} ${mode === 'admin' ? styles.activeTab : ''}`}
                        onClick={() => setMode('admin')}
                    >
                        관리자
                    </button>
                </div>

                <h1 className={styles.title}>
                    {mode === 'worker' ? 'Clean Track' : 'Admin Login'}
                </h1>
                <p className={styles.subtitle}>
                    {mode === 'worker' ? '전화번호와 비밀번호로 로그인하세요' : '관리자 로그인을 해주세요'}
                </p>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="phone" className={styles.label}>Phone Number</label>
                        <input
                            type="tel"
                            id="phone"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="010-0000-0000"
                            className={styles.input}
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="password" className={styles.label}>Password (4자리)</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="비밀번호 4자리"
                            className={styles.input}
                            maxLength={4}
                            required
                        />
                    </div>

                    <button type="submit" className={styles.button} disabled={isPending}>
                        {isPending ? 'Logging in...' : (mode === 'admin' ? 'Admin Login' : 'Login')}
                    </button>
                </form>

                {error && <p className={styles.error}>{error}</p>}

                <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                    <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>
                        시스템 설정 (v1.5)
                    </p>
                    <button
                        type="button"
                        onClick={async () => {
                            if (!confirm('데이터베이스를 초기화하시겠습니까? (기존 데이터 보존됨)')) return;
                            try {
                                const { initializeDB } = await import('../actions');
                                const result = await initializeDB();
                                if (result.success) {
                                    alert('✅ 초기화 성공! 이제 로그인하세요.');
                                } else {
                                    alert('❌ 초기화 실패: ' + result.error);
                                }
                            } catch (e: any) {
                                alert('❌ 오류: ' + e.message);
                            }
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#ccc',
                            textDecoration: 'underline',
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                        }}
                    >
                        ⚙️ DB 초기화 실행
                    </button>
                    <div style={{ marginTop: '5px', fontSize: '0.7rem', color: '#ddd' }}>
                        Build: {new Date().toISOString().slice(0, 16)}
                    </div>
                </div>
            </div>
        </div>
    );
}
