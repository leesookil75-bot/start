'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';
import { login } from '../actions';

type LoginMode = 'worker' | 'admin';

export default function LoginPage() {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [error, setError] = useState('');
    const [mode, setMode] = useState<LoginMode>('worker');
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        startTransition(async () => {
            const result = await login(phoneNumber);
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
                    {mode === 'worker' ? '전화번호로 로그인하세요' : '관리자 전화번호를 입력하세요'}
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

                    <button type="submit" className={styles.button} disabled={isPending}>
                        {isPending ? 'Logging in...' : (mode === 'admin' ? 'Admin Login' : 'Login')}
                    </button>
                </form>

                {error && <p className={styles.error}>{error}</p>}
            </div>
        </div>
    );
}
