'use client';

import { useEffect } from 'react';
import styles from './PrintClient.module.css';

interface PrintClientProps {
    training: any;
    signatures: any[];
}

export default function PrintClient({ training, signatures }: PrintClientProps) {
    // Optional: Auto-print on load
    // useEffect(() => {
    //     window.print();
    // }, []);

    return (
        <div className={styles.printContainer}>
            <div className={styles.noPrint} style={{ padding: '20px', textAlign: 'center', background: '#f7fafc', marginBottom: '20px' }}>
                <button 
                    onClick={() => window.print()}
                    style={{ padding: '10px 20px', background: '#3182ce', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}
                >
                    🖨️ 인쇄하기 (또는 PDF로 저장)
                </button>
                <p style={{ marginTop: '10px', color: '#718096' }}>* 인쇄 옵션에서 '배경 그래픽'을 켜주시면 서명 박스가 잘 보입니다.</p>
            </div>

            <div className={styles.document}>
                <h1 className={styles.docTitle}>안전보건교육 일지 (참석자 명단)</h1>
                
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

                <h2 className={styles.subTitle}>참석자 서명부</h2>
                
                <table className={styles.signatureTable}>
                    <thead>
                        <tr>
                            <th className={styles.th} style={{ width: '10%' }}>연번</th>
                            <th className={styles.th} style={{ width: '20%' }}>소속 (구역)</th>
                            <th className={styles.th} style={{ width: '20%' }}>성명</th>
                            <th className={styles.th} style={{ width: '30%' }}>서명</th>
                            <th className={styles.th} style={{ width: '20%' }}>비고 (서명시간)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {signatures.map((sig, index) => {
                            const timeStr = new Date(sig.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                            return (
                                <tr key={sig.id}>
                                    <td className={styles.td} style={{ textAlign: 'center' }}>{index + 1}</td>
                                    <td className={styles.td} style={{ textAlign: 'center' }}>{sig.cleaning_area}</td>
                                    <td className={styles.td} style={{ textAlign: 'center', fontWeight: 'bold' }}>{sig.name}</td>
                                    <td className={styles.td} style={{ padding: '4px', textAlign: 'center', height: '60px' }}>
                                        {sig.signature_data ? (
                                            <img src={sig.signature_data} alt="서명" style={{ maxHeight: '50px', maxWidth: '100%' }} />
                                        ) : '서명 없음'}
                                    </td>
                                    <td className={styles.td} style={{ textAlign: 'center', fontSize: '0.8rem', color: '#4a5568' }}>
                                        {timeStr}
                                    </td>
                                </tr>
                            );
                        })}
                        {signatures.length === 0 && (
                            <tr>
                                <td colSpan={5} className={styles.td} style={{ textAlign: 'center', padding: '20px' }}>
                                    참석자 서명 내역이 없습니다.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                
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
