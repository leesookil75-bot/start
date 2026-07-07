'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ChecklistDef,
    ChecklistAnswer,
    ChecklistResultItem,
    ANSWER_ORDER,
    ANSWER_LABELS,
    ANSWER_SYMBOLS,
} from '@/lib/checklists';
import { submitPreworkChecklist } from '../actions';
import styles from './checklist.module.css';

interface Props {
    def: ChecklistDef;
    initialResults: ChecklistResultItem[] | null;
    submittedAt: string | null;
    userName: string;
}

export default function ChecklistClient({ def, initialResults, submittedAt, userName }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [lastSubmittedAt, setLastSubmittedAt] = useState<string | null>(submittedAt);

    // 기존 제출값이 있으면 그대로, 없으면 전 항목 기본 '적정(O)'
    const [answers, setAnswers] = useState<Record<number, ChecklistAnswer>>(() => {
        const map: Record<number, ChecklistAnswer> = {};
        for (const item of def.items) {
            const found = initialResults?.find(r => r.no === item.no);
            map[item.no] = found?.answer ?? 'O';
        }
        return map;
    });

    const setAnswer = (no: number, answer: ChecklistAnswer) => {
        setAnswers(prev => ({ ...prev, [no]: answer }));
        setMessage(null);
    };

    const handleSubmit = () => {
        const results: ChecklistResultItem[] = def.items.map(item => ({
            no: item.no,
            answer: answers[item.no],
        }));
        startTransition(async () => {
            const res = await submitPreworkChecklist(def.type, results);
            if (res.success) {
                setMessage({ type: 'success', text: '작업 전 안전점검이 저장되었습니다.' });
                setLastSubmittedAt(new Date().toISOString());
                router.refresh();
            } else {
                setMessage({ type: 'error', text: res.error || '저장에 실패했습니다.' });
            }
        });
    };

    const todayLabel = new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
    });

    return (
        <main className={styles.main}>
            <header className={styles.header}>
                <Link href="/" className={styles.backBtn} aria-label="홈으로">←</Link>
                <div className={styles.headerText}>
                    <h1 className={styles.title}>작업 전 안전점검</h1>
                    <p className={styles.subtitle}>{def.title.replace(' 작업 전 안전점검', '')}</p>
                </div>
            </header>

            <div className={styles.metaBar}>
                <span>{todayLabel}</span>
                <span className={styles.metaName}>{userName}</span>
            </div>

            {lastSubmittedAt && (
                <div className={styles.doneBanner}>
                    ✅ 오늘 점검 완료 · 내용을 수정하려면 다시 저장하세요.
                </div>
            )}

            <ul className={styles.list}>
                {def.items.map(item => (
                    <li key={item.no} className={styles.item}>
                        <div className={styles.itemHead}>
                            <span className={styles.itemNo}>{item.no}</span>
                            <span className={styles.itemText}>{item.text}</span>
                        </div>
                        <div className={styles.options}>
                            {ANSWER_ORDER.map(opt => {
                                const selected = answers[item.no] === opt;
                                return (
                                    <button
                                        key={opt}
                                        type="button"
                                        className={`${styles.optionBtn} ${selected ? styles.optionSelected : ''} ${styles['opt_' + (opt === '-' ? 'na' : opt)]}`}
                                        onClick={() => setAnswer(item.no, opt)}
                                        aria-pressed={selected}
                                    >
                                        <span className={styles.optSymbol}>{ANSWER_SYMBOLS[opt]}</span>
                                        <span className={styles.optLabel}>{ANSWER_LABELS[opt]}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </li>
                ))}
            </ul>

            <p className={styles.legend}>표기: 적정(○) · 개선필요(✔) · 해당없음(-)</p>

            {message && (
                <div className={`${styles.message} ${message.type === 'success' ? styles.msgSuccess : styles.msgError}`}>
                    {message.text}
                </div>
            )}

            <div className={styles.footer}>
                <button className={styles.submitBtn} onClick={handleSubmit} disabled={isPending}>
                    {isPending ? '저장 중...' : lastSubmittedAt ? '수정 저장' : '점검 완료'}
                </button>
            </div>
        </main>
    );
}
