'use client';

import { useState } from 'react';
import { initializeDB, debugConnection } from '../actions';

export default function SetupPage() {
    const [status, setStatus] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [debugInfo, setDebugInfo] = useState<string>('');

    const handleInit = async () => {
        setLoading(true);
        setStatus('진행 중...');
        try {
            // 1. Run Diagnostics first
            const diag = await debugConnection();
            if (!diag.success) {
                setDebugInfo(diag.error || 'Unknown Error');
                setStatus('❌ 데이터베이스 연결 실패. 아래 진단 내용을 확인하세요.');
                return;
            }

            // 2. Initialize DB
            const result = await initializeDB();
            if (result.success) {
                setStatus('✅ 성공! 테이블이 생성되었습니다. 이제 앱을 사용하셔도 됩니다.');
                setDebugInfo('DB Connection: OK\nTable Creation: OK');
            } else {
                setStatus('❌ 테이블 생성 실패: ' + result.error);
                setDebugInfo('DB Connection: OK\nCreate Table Error: ' + result.error);
            }
        } catch (e: any) {
            setStatus('❌ 오류 발생: ' + e.message);
            setDebugInfo(e.toString());
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            <h1 style={{ marginBottom: '1rem' }}>🔧 DB 연결 진단 및 초기화</h1>

            <div style={{ backgroundColor: '#f5f5f5', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
                <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
                    이 버튼은 다음 작업을 수행합니다:<br />
                    1. Vercel 데이터베이스 연결 상태 확인<br />
                    2. 필요한 테이블(Users, Usage) 자동 생성
                </p>

                <button
                    onClick={handleInit}
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '1rem',
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        backgroundColor: loading ? '#ccc' : '#0070f3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        transition: 'background-color 0.2s'
                    }}
                >
                    {loading ? '진단 및 설정 중...' : '원클릭 진단 & 설정 시작'}
                </button>
            </div>

            {status && (
                <div style={{
                    padding: '1rem',
                    borderRadius: '6px',
                    backgroundColor: status.startsWith('✅') ? '#e6fffa' : '#fff5f5',
                    border: `1px solid ${status.startsWith('✅') ? '#38b2ac' : '#fc8181'}`,
                    marginBottom: '1rem'
                }}>
                    <strong style={{ fontSize: '1.1rem' }}>{status}</strong>
                </div>
            )}

            {debugInfo && (
                <div style={{ marginTop: '2rem' }}>
                    <h3>🔎 상세 진단 내용 (개발자에게 알려주세요)</h3>
                    <pre style={{
                        backgroundColor: '#333',
                        color: '#fff',
                        padding: '1rem',
                        borderRadius: '6px',
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap'
                    }}>
                        {debugInfo}
                    </pre>
                </div>
            )}
        </div>
    );
}
