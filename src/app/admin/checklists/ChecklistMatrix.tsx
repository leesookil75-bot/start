'use client';

import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { ANSWER_SYMBOLS, ANSWER_LABELS, ChecklistAnswer } from '@/lib/checklists';
import styles from './checklist-matrix.module.css';

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
    workplaceId?: string | null;
}

interface DefLite {
    title: string;
    items: { no: number; text: string }[];
}

interface Workplace {
    id: string;
    name: string;
}

interface Props {
    year: number;
    month: number;
    workers: Worker[];
    submissions: Submission[];
    workplaces: Workplace[];
    defs: Record<string, DefLite>;
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

export default function ChecklistMatrix({ year, month, workers, submissions, workplaces, defs }: Props) {
    const [detail, setDetail] = useState<{ worker: Worker; sub: Submission } | null>(null);
    const [selectedWorkplace, setSelectedWorkplace] = useState<string>('');

    // 근무지 필터 적용된 근로자 목록
    const filteredWorkers = useMemo(
        () => (selectedWorkplace ? workers.filter((w) => w.workplaceId === selectedWorkplace) : workers),
        [workers, selectedWorkplace]
    );

    const daysInMonth = new Date(year, month, 0).getDate();
    const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

    // userId -> (day -> submission)
    const subMap = useMemo(() => {
        const map = new Map<string, Map<number, Submission>>();
        for (const s of submissions) {
            const day = parseInt(s.workDate.slice(8, 10));
            if (!map.has(s.userId)) map.set(s.userId, new Map());
            map.get(s.userId)!.set(day, s);
        }
        return map;
    }, [submissions]);

    const issuesOf = (s: Submission) => s.results.filter((r) => r.answer === 'V').length;

    const goMonth = (delta: number) => {
        let y = year;
        let m = month + delta;
        if (m < 1) { m = 12; y -= 1; }
        if (m > 12) { m = 1; y += 1; }
        window.location.href = `?year=${y}&month=${m}`;
    };

    const cellText = (s: Submission | undefined) => {
        if (!s) return '';
        const n = issuesOf(s);
        return n > 0 ? `✔${n}` : '○';
    };

    const handleExport = () => {
        const wb = XLSX.utils.book_new();
        const wsData: (string | number)[][] = [];
        const merges: XLSX.Range[] = [];

        const totalCols = days.length + 3; // 이름, 구역, [일자...], 제출일수
        const wpName = selectedWorkplace ? workplaces.find((w) => w.id === selectedWorkplace)?.name ?? '' : '전체 근무지';
        const title = `${year}년 ${month}월 작업 전 안전점검 점검표 (가로청소 · ${wpName})`;
        const titleRow: (string | number)[] = [title];
        for (let i = 1; i < totalCols; i++) titleRow.push('');
        wsData.push(titleRow);
        merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } });

        const headerRow: (string | number)[] = ['이름', '구역'];
        days.forEach((d) => {
            const date = new Date(year, month - 1, d);
            headerRow.push(`${d}(${DAY_NAMES[date.getDay()]})`);
        });
        headerRow.push('제출일수');
        wsData.push(headerRow);

        filteredWorkers.forEach((w) => {
            const row: (string | number)[] = [w.name, w.cleaningArea];
            let submitted = 0;
            days.forEach((d) => {
                const s = subMap.get(w.id)?.get(d);
                if (s) submitted += 1;
                row.push(cellText(s));
            });
            row.push(submitted);
            wsData.push(row);
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!merges'] = merges;
        const cols = [{ wch: 10 }, { wch: 12 }];
        days.forEach(() => cols.push({ wch: 6 }));
        cols.push({ wch: 9 });
        ws['!cols'] = cols;

        XLSX.utils.book_append_sheet(wb, ws, `${month}월 안전점검`);
        XLSX.writeFile(wb, `CleanTrack_Checklist_${year}_${String(month).padStart(2, '0')}.xlsx`);
    };

    const answerColor = (ans: ChecklistAnswer) =>
        ans === 'O' ? '#059669' : ans === 'V' ? '#c2410c' : '#9ca3af';

    return (
        <div className={styles.container}>
            <div className={styles.controls}>
                <div className={styles.monthSelector}>
                    <button onClick={() => goMonth(-1)}>&lt;</button>
                    <span className={styles.currentMonth}>{year}년 {month}월</span>
                    <button onClick={() => goMonth(1)}>&gt;</button>
                </div>
                <div className={styles.rightControls}>
                    {workplaces.length > 0 && (
                        <select
                            value={selectedWorkplace}
                            onChange={(e) => setSelectedWorkplace(e.target.value)}
                            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                        >
                            <option value="">전체 근무지</option>
                            {workplaces.map((wp) => (
                                <option key={wp.id} value={wp.id}>{wp.name}</option>
                            ))}
                        </select>
                    )}
                    <button className={styles.exportButton} onClick={handleExport}>
                        Excel 다운로드
                    </button>
                </div>
            </div>

            <div className={styles.legend}>
                <span className={styles.legendItem}><b className={styles.ok}>○</b> 점검완료(이상없음)</span>
                <span className={styles.legendItem}><b style={{ color: '#c2410c' }}>✔N</b> 개선필요 N건</span>
                <span className={styles.legendItem}><b className={styles.empty} style={{ color: '#9ca3af' }}>·</b> 미제출</span>
                <span style={{ marginLeft: 'auto', color: '#6b7280' }}>근로자 {filteredWorkers.length}명</span>
            </div>

            <div className={styles.tableWrapper}>
                {filteredWorkers.length === 0 ? (
                    <div className={styles.emptyState}>해당 근무지에 등록된 근로자가 없습니다.</div>
                ) : (
                    <table className={styles.matrixTable}>
                        <thead>
                            <tr>
                                <th className={styles.stickyCol}>이름</th>
                                {days.map((d) => {
                                    const date = new Date(year, month - 1, d);
                                    const dow = date.getDay();
                                    return (
                                        <th key={d} className={dow === 0 ? styles.weekend : dow === 6 ? styles.saturday : ''}>
                                            {d}
                                            <div style={{ fontSize: '0.7rem', fontWeight: 400 }}>{DAY_NAMES[dow]}</div>
                                        </th>
                                    );
                                })}
                                <th className={styles.countCol}>제출<br />일수</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredWorkers.map((w) => {
                                let submitted = 0;
                                return (
                                    <tr key={w.id}>
                                        <td className={styles.stickyCol}>
                                            <div className={styles.name}>{w.name}</div>
                                            <div className={styles.area}>{w.cleaningArea}</div>
                                        </td>
                                        {days.map((d) => {
                                            const s = subMap.get(w.id)?.get(d);
                                            if (s) submitted += 1;
                                            const date = new Date(year, month - 1, d);
                                            const dow = date.getDay();
                                            const issues = s ? issuesOf(s) : 0;
                                            const cls = [
                                                styles.dayCell,
                                                s ? styles.clickable : '',
                                                s && issues > 0 ? styles.issue : '',
                                                !s && dow === 0 ? styles.weekend : '',
                                                !s && dow === 6 ? styles.saturday : '',
                                            ].join(' ');
                                            return (
                                                <td
                                                    key={d}
                                                    className={cls}
                                                    onClick={() => s && setDetail({ worker: w, sub: s })}
                                                >
                                                    {s ? (
                                                        <span className={issues > 0 ? '' : styles.ok}>{cellText(s)}</span>
                                                    ) : (
                                                        <span className={styles.empty}>·</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className={styles.countCol}>{submitted}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* 상세 모달 */}
            {detail && (
                <div className={styles.modalOverlay} onClick={() => setDetail(null)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>{detail.worker.name} · {detail.worker.cleaningArea}</h3>
                        <p className={styles.modalSub}>
                            {detail.sub.workDate} 작업 전 안전점검 · 제출 {new Date(detail.sub.createdAt).toLocaleString('ko-KR')}
                        </p>
                        <ul className={styles.modalList}>
                            {(defs[detail.sub.checklistType]?.items ?? []).map((item) => {
                                const r = detail.sub.results.find((x) => x.no === item.no);
                                const ans = (r?.answer ?? '-') as ChecklistAnswer;
                                return (
                                    <li key={item.no} className={styles.modalItem}>
                                        <span className={styles.modalItemNo}>{item.no}.</span>
                                        <span className={styles.modalItemText}>{item.text}</span>
                                        <span className={styles.modalAnswer} style={{ color: answerColor(ans) }}>
                                            {ANSWER_SYMBOLS[ans]} {ANSWER_LABELS[ans]}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                        <button className={styles.closeButton} onClick={() => setDetail(null)}>닫기</button>
                    </div>
                </div>
            )}
        </div>
    );
}
