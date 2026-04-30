'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './PrintClient.module.css';

interface PrintClientProps {
    training: any;
    signatures: any[];
    workers?: any[];
}

export default function PrintClient({ training, signatures, workers = [] }: PrintClientProps) {
    const router = useRouter();

    const sortedWorkers = [...workers].sort((a, b) => {
        const wpA = a.workplace_name || '';
        const wpB = b.workplace_name || '';
        if (wpA !== wpB) return wpA.localeCompare(wpB);
        const areaA = a.cleaning_area || '';
        const areaB = b.cleaning_area || '';
        return areaA.localeCompare(areaB, undefined, { numeric: true, sensitivity: 'base' });
    });

    return (
        <div className={styles.printContainer}>
            <div className={styles.noPrint} style={{ padding: '15px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => router.back()} style={{ padding: '8px 16px', background: '#e2e8f0', color: '#1e293b', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                        ← 뒤로
                    </button>
                    <button onClick={() => router.push('/admin')} style={{ padding: '8px 16px', background: '#e2e8f0', color: '#1e293b', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                        🏠 홈
                    </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'bold', display: 'none' }} className="sm:inline-block">
                        서명 현황: {signatures.length} / {sortedWorkers.length}명
                    </span>
                    <button 
                        onClick={() => window.print()}
                        style={{ padding: '8px 20px', background: '#3182ce', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        🖨️ 인쇄 (PDF)
                    </button>
                </div>
            </div>

            <div className={styles.document}>
                <h1 className={styles.docTitle}>안전보건교육 일지 (참석자 명단)</h1>
                
                <div className={styles.tableContainer}>
                    <table className={styles.infoTable}>
                        <tbody>
                            <tr>
                                <th className={styles.th}>교육 일자</th>
                                <td className={styles.td}>{training.date}</td>
                                <th className={styles.th}>교육 강사</th>
                                <td className={styles.td}>{training.instructor}</td>
                            </tr>
                            <tr>
                                <th className={styles.th}>교육 주제</th>
                                <td className={styles.td} colSpan={3}>{training.title}</td>
                            </tr>
                            <tr>
                                <th className={styles.th}>교육 장소</th>
                                <td className={styles.td} colSpan={3}>지정 현장 (GPS 인증 완료)</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <h2 className={styles.subTitle}>참석자 서명부 (총 {sortedWorkers.length}명)</h2>
                
                <div className={styles.tableContainer}>
                    <table className={styles.signatureTable}>
                        <thead>
                            <tr>
                                <th className={styles.th} style={{ width: '8%' }}>연번</th>
                                <th className={styles.th} style={{ width: '22%' }}>소속 (구역)</th>
                                <th className={styles.th} style={{ width: '15%' }}>성명</th>
                                <th className={styles.th} style={{ width: '35%' }}>서명 여부</th>
                                <th className={styles.th} style={{ width: '20%' }}>비고 (서명시간)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedWorkers.length > 0 ? sortedWorkers.map((worker, index) => {
                                const sig = signatures.find(s => s.user_id === worker.id);
                                const timeStr = sig ? new Date(sig.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';
                                
                                return (
                                    <tr key={worker.id} style={{ backgroundColor: sig ? 'white' : '#fff5f5' }}>
                                        <td className={styles.td} style={{ textAlign: 'center' }}>{index + 1}</td>
                                        <td className={styles.td} style={{ textAlign: 'center' }}>{worker.workplace_name} {worker.cleaning_area}</td>
                                        <td className={styles.td} style={{ textAlign: 'center', fontWeight: 'bold' }}>{worker.name}</td>
                                        <td className={styles.td} style={{ padding: '4px', textAlign: 'center', height: '60px' }}>
                                            {sig ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                    <span style={{ color: '#047857', fontWeight: '900', fontSize: '1.2rem' }}>O</span>
                                                    {sig.signature_data && <img src={sig.signature_data} alt="서명" style={{ maxHeight: '30px', maxWidth: '100%' }} />}
                                                </div>
                                            ) : (
                                                <span style={{ color: '#e53e3e', fontWeight: '900', fontSize: '1.2rem' }}>X (미서명)</span>
                                            )}
                                        </td>
                                        <td className={styles.td} style={{ textAlign: 'center', fontSize: '0.8rem', color: '#4a5568' }}>
                                            {timeStr}
                                        </td>
                                    </tr>
                                );
                            }) : signatures.map((sig, index) => {
                                // Fallback if workers array is empty
                                const timeStr = new Date(sig.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                                return (
                                    <tr key={sig.id}>
                                        <td className={styles.td} style={{ textAlign: 'center' }}>{index + 1}</td>
                                        <td className={styles.td} style={{ textAlign: 'center' }}>{sig.cleaning_area}</td>
                                        <td className={styles.td} style={{ textAlign: 'center', fontWeight: 'bold' }}>{sig.name}</td>
                                        <td className={styles.td} style={{ padding: '4px', textAlign: 'center', height: '60px' }}>
                                            {sig.signature_data ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <span style={{ color: '#047857', fontWeight: '900', fontSize: '1.2rem' }}>O</span>
                                                    <img src={sig.signature_data} alt="서명" style={{ maxHeight: '30px', maxWidth: '100%' }} />
                                                </div>
                                            ) : 'O (서명 이미지 없음)'}
                                        </td>
                                        <td className={styles.td} style={{ textAlign: 'center', fontSize: '0.8rem', color: '#4a5568' }}>
                                            {timeStr}
                                        </td>
                                    </tr>
                                );
                            })}
                            {sortedWorkers.length === 0 && signatures.length === 0 && (
                                <tr>
                                    <td colSpan={5} className={styles.td} style={{ textAlign: 'center', padding: '20px' }}>
                                        등록된 작업자가 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                <div className={styles.footer}>
                    <p>위와 같이 안전보건교육을 실시하고 참석하였음을 확인합니다.</p>
                    <div style={{ marginTop: '30px', textAlign: 'right', paddingRight: '40px' }}>
                        강사 성명: {training.instructor} (서명/인)
                    </div>
                </div>
            </div>
        </div>
    );
}
