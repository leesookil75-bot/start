'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ANSWER_SYMBOLS, ANSWER_LABELS, ChecklistAnswer } from '@/lib/checklists';

interface Submission {
    id: string;
    userId: string;
    checklistType: string;
    workDate: string;
    results: { no: number; answer: string }[];
    createdAt: string;
    userName: string;
    cleaningArea: string;
}

interface Worker {
    id: string;
    name: string;
    cleaningArea: string;
}

interface DefLite {
    title: string;
    items: { no: number; text: string }[];
}

interface Props {
    submissions: Submission[];
    workers: Worker[];
    defs: Record<string, DefLite>;
    today: string;
}

const answerColor: Record<string, string> = {
    O: '#63b3ed',
    V: '#f6ad55',
    '-': '#a0aec0',
};

export default function ChecklistDailyRoster({ submissions, workers, defs, today }: Props) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [dateFilter, setDateFilter] = useState<string>(today);

    const dates = useMemo(() => {
        const set = new Set(submissions.map((s) => s.workDate));
        set.add(today);
        return Array.from(set).sort().reverse();
    }, [submissions, today]);

    const countIssues = (s: Submission) => s.results.filter((r) => r.answer === 'V').length;

    const dayView = useMemo(() => {
        if (!dateFilter) return null;
        const subsByUser = new Map(
            submissions.filter((s) => s.workDate === dateFilter).map((s) => [s.userId, s])
        );
        const done: { worker: Worker; sub: Submission }[] = [];
        const notDone: Worker[] = [];
        for (const w of workers) {
            const sub = subsByUser.get(w.id);
            if (sub) done.push({ worker: w, sub });
            else notDone.push(w);
        }
        const workerIds = new Set(workers.map((w) => w.id));
        const orphans = submissions
            .filter((s) => s.workDate === dateFilter && !workerIds.has(s.userId))
            .map((s) => ({ worker: { id: s.userId, name: s.userName, cleaningArea: s.cleaningArea }, sub: s }));
        return { done, orphans, notDone };
    }, [dateFilter, submissions, workers]);

    const renderSubRow = (name: string, area: string, sub: Submission) => {
        const isOpen = expandedId === sub.id;
        const issues = countIssues(sub);
        const def = defs[sub.checklistType];
        return (
            <div key={sub.id} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden', background: '#1e1e1e' }}>
                <button
                    onClick={() => setExpandedId(isOpen ? null : sub.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#fff' }}
                >
                    <span style={{ color: '#48bb78' }}>✅</span>
                    <span style={{ fontWeight: 700, minWidth: '80px' }}>{name}</span>
                    <span style={{ fontSize: '0.85rem', color: '#a0aec0' }}>{area}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.85rem' }}>
                        {issues > 0 ? (
                            <span style={{ color: '#f6ad55', fontWeight: 700 }}>개선필요 {issues}건</span>
                        ) : (
                            <span style={{ color: '#68d391', fontWeight: 600 }}>이상 없음</span>
                        )}
                    </span>
                    <span style={{ color: '#718096' }}>{isOpen ? '▲' : '▼'}</span>
                </button>
                {isOpen && def && (
                    <div style={{ padding: '4px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <p style={{ fontSize: '0.8rem', color: '#718096', margin: '10px 0' }}>
                            제출: {new Date(sub.createdAt).toLocaleString('ko-KR')}
                        </p>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {def.items.map((item) => {
                                const r = sub.results.find((x) => x.no === item.no);
                                const ans = (r?.answer ?? '-') as ChecklistAnswer;
                                return (
                                    <li key={item.no} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.9rem' }}>
                                        <span style={{ color: '#718096', minWidth: '20px' }}>{item.no}.</span>
                                        <span style={{ flex: 1, color: '#cbd5e0', lineHeight: 1.4 }}>{item.text}</span>
                                        <span style={{ minWidth: '76px', textAlign: 'right', fontWeight: 700, color: answerColor[ans] }}>
                                            {ANSWER_SYMBOLS[ans]} {ANSWER_LABELS[ans]}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>
        );
    };

    const totalWorkers = workers.length;
    const doneCount = dayView ? dayView.done.length : 0;
    const orphanCount = dayView ? dayView.orphans.length : 0;
    const rate = totalWorkers > 0 ? Math.round((doneCount / totalWorkers) * 100) : 0;

    return (
        <div style={{ padding: '20px 16px', color: '#fff' }}>
            <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#90cdf4', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, marginBottom: '12px' }}>
                ← 관리자 홈으로
            </Link>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '4px' }}>📋 작업전 체크리스트</h1>
            <p style={{ color: '#a0aec0', marginBottom: '18px', fontSize: '0.9rem' }}>
                전체 근로자의 작업 전 안전점검 제출 현황입니다.
            </p>

            <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ fontSize: '0.9rem', color: '#cbd5e0' }}>날짜</label>
                <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #4a5568', background: '#1e1e1e', color: '#fff' }}
                >
                    {dates.map((d) => (
                        <option key={d} value={d}>{d}{d === today ? ' (오늘)' : ''}</option>
                    ))}
                    <option value="">전체 이력</option>
                </select>
            </div>

            {dayView && (
                <>
                    <div style={{ background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '16px 18px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
                            <span style={{ fontWeight: 700, fontSize: '1rem' }}>{dateFilter} 제출 현황</span>
                            <span style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                                <span style={{ color: '#48bb78' }}>{doneCount}</span>
                                <span style={{ color: '#718096' }}> / {totalWorkers}명 ({rate}%)</span>
                            </span>
                        </div>
                        <div style={{ height: '10px', background: '#2d3748', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{ width: `${rate}%`, height: '100%', background: rate === 100 ? '#48bb78' : '#f6ad55', transition: 'width 0.3s' }} />
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#fc8181', margin: '0 0 10px' }}>
                            ⬜ 미제출 {dayView.notDone.length}명
                        </h2>
                        {dayView.notDone.length === 0 ? (
                            <p style={{ color: '#68d391', fontSize: '0.9rem' }}>전원 제출 완료 🎉</p>
                        ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {dayView.notDone.map((w) => (
                                    <span key={w.id} style={{ background: 'rgba(252,129,129,0.12)', border: '1px solid rgba(252,129,129,0.4)', color: '#fc8181', borderRadius: '999px', padding: '6px 14px', fontSize: '0.9rem', fontWeight: 600 }}>
                                        {w.name} <span style={{ opacity: 0.7, fontWeight: 400 }}>{w.cleaningArea}</span>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#68d391', margin: '0 0 10px' }}>
                            ✅ 제출 완료 {dayView.done.length}명
                        </h2>
                        {dayView.done.length === 0 ? (
                            <p style={{ color: '#718096', fontSize: '0.9rem' }}>아직 제출한 근로자가 없습니다.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {dayView.done.map(({ worker, sub }) => renderSubRow(worker.name, worker.cleaningArea, sub))}
                            </div>
                        )}
                    </div>

                    {orphanCount > 0 && (
                        <div style={{ marginTop: '20px' }}>
                            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#a0aec0', margin: '0 0 10px' }}>
                                ℹ️ 명단 외 제출 {orphanCount}명 <span style={{ fontWeight: 400, fontSize: '0.8rem' }}>(관리자/삭제된 사용자 · 근로자 비율 미포함)</span>
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {dayView.orphans.map(({ worker, sub }) => renderSubRow(worker.name, worker.cleaningArea, sub))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {!dateFilter && (
                <div>
                    {submissions.length === 0 && (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>제출된 체크리스트가 없습니다.</div>
                    )}
                    {Array.from(new Set(submissions.map((s) => s.workDate))).map((date) => {
                        const subs = submissions.filter((s) => s.workDate === date);
                        return (
                            <div key={date} style={{ marginBottom: '24px' }}>
                                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', margin: '0 0 10px', paddingBottom: '6px', borderBottom: '2px solid #2d3748' }}>
                                    {date} <span style={{ color: '#718096', fontWeight: 500, fontSize: '0.85rem' }}>({subs.length}명)</span>
                                </h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {subs.map((s) => renderSubRow(s.userName, s.cleaningArea, s))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
