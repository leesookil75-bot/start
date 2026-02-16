'use client';

import { useState } from 'react';
import { initializeDB } from '../actions';

export const dynamic = 'force-dynamic';

export default function InitPage() {
    const [status, setStatus] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const handleInit = async () => {
        if (!confirm('DB를 초기화하시겠습니까? (데이터가 삭제되지 않고 테이블만 생성됩니다)')) return;
        setLoading(true);
        setStatus('초기화 중...');
        try {
            const result = await initializeDB();
            if (result.success) {
                setStatus('✅ 성공! 이제 로그인 페이지로 이동하세요.');
            } else {
                setStatus('❌ 실패: ' + result.error);
            }
        } catch (e: any) {
            setStatus('❌ 오류: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
            <h1>시스템 초기화</h1>
            <p>데이터베이스 테이블이 없는 경우 생성합니다.</p>
            <button
                onClick={handleInit}
                disabled={loading}
                style={{
                    padding: '1rem 2rem',
                    fontSize: '1.2rem',
                    backgroundColor: '#0070f3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: loading ? 'wait' : 'pointer',
                    marginTop: '1rem'
                }}
            >
                {loading ? '작업 중...' : 'DB 초기화 실행'}
            </button>
            {status && <div style={{ marginTop: '2rem', fontSize: '1.1rem', fontWeight: 'bold' }}>{status}</div>}
            <div style={{ marginTop: '2rem' }}>
                <a href="/login" style={{ color: '#0070f3' }}>&larr; 로그인 페이지로 돌아가기</a>
            </div>
        </div>
    );
}
