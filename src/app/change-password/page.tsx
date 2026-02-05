'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './change-password.module.css';
import { changePassword } from '../actions';

export default function ChangePasswordPage() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword.length !== 4) {
            setError('새 비밀번호는 4자리여야 합니다.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('새 비밀번호가 일치하지 않습니다.');
            return;
        }

        startTransition(async () => {
            const result = await changePassword(currentPassword, newPassword);
            if (result.success) {
                setSuccess('비밀번호가 성공적으로 변경되었습니다.');
                setTimeout(() => {
                    router.push('/');
                }, 1500);
            } else {
                setError(result.error || '비밀번호 변경 실패');
            }
        });
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.title}>비밀번호 변경</h1>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="current" className={styles.label}>현재 비밀번호</label>
                        <input
                            type="password"
                            id="current"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="현재 비밀번호 (초기값: 전화번호 뒤 4자리)"
                            className={styles.input}
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="new" className={styles.label}>새 비밀번호 (4자리)</label>
                        <input
                            type="password"
                            id="new"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="새 비밀번호"
                            className={styles.input}
                            maxLength={4}
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="confirm" className={styles.label}>새 비밀번호 확인</label>
                        <input
                            type="password"
                            id="confirm"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="새 비밀번호 확인"
                            className={styles.input}
                            maxLength={4}
                            required
                        />
                    </div>

                    <button type="submit" className={styles.button} disabled={isPending}>
                        {isPending ? '변경 중...' : '비밀번호 변경'}
                    </button>
                </form>

                {error && <p className={styles.error}>{error}</p>}
                {success && <p className={styles.success}>{success}</p>}

                <Link href="/" className={styles.backLink}>
                    홈으로 돌아가기
                </Link>
            </div>
        </div>
    );
}
