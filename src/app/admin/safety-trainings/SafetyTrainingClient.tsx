'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SafetyTrainingClient({ initialTrainings }: { initialTrainings: any[] }) {
    const [trainings, setTrainings] = useState(initialTrainings);
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCreate = () => {
        if (!navigator.geolocation) {
            alert('이 기기에서는 위치 정보를 지원하지 않습니다.');
            return;
        }

        setIsSubmitting(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                try {
                    const res = await fetch('/api/admin/safety-trainings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            title: newTitle,
                            date: newDate,
                            lat,
                            lng,
                            instructor: '관리자'
                        })
                    });
                    const data = await res.json();
                    if (data.success) {
                        alert('안전교육이 생성되었습니다!');
                        window.location.reload();
                    } else {
                        alert('생성 실패: ' + data.error);
                    }
                } catch (err) {
                    alert('서버 오류');
                }
                setIsSubmitting(false);
            },
            (err) => {
                alert('위치 정보를 가져올 수 없습니다. 권한을 허용해주세요.');
                setIsSubmitting(false);
            },
            { enableHighAccuracy: true }
        );
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>안전교육 서명 관리</h1>
                <Link href="/admin" style={{ padding: '8px 16px', background: '#e2e8f0', borderRadius: '8px', textDecoration: 'none', color: '#1a202c' }}>
                    돌아가기
                </Link>
            </div>

            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>새 교육 시작하기 (현재 위치가 교육 장소로 지정됩니다)</h2>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <input 
                        type="date" 
                        value={newDate} 
                        onChange={e => setNewDate(e.target.value)}
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
                    />
                    <input 
                        type="text" 
                        placeholder="교육 주제 (예: 여름철 온열질환 예방)" 
                        value={newTitle} 
                        onChange={e => setNewTitle(e.target.value)}
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e0', flex: 1 }}
                    />
                    <button 
                        onClick={handleCreate} 
                        disabled={isSubmitting || !newTitle}
                        style={{ padding: '10px 20px', background: '#3182ce', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        {isSubmitting ? '생성 중...' : '교육 생성 및 서명받기'}
                    </button>
                </div>
            </div>

            <div>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>진행된 교육 목록</h2>
                {trainings.length === 0 ? <p>아직 진행된 안전교육이 없습니다.</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {trainings.map(t => (
                            <div key={t.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '4px' }}>{t.title}</div>
                                    <div style={{ color: '#718096', fontSize: '0.9rem' }}>{t.date} | 강사: {t.instructor}</div>
                                </div>
                                <Link href={`/admin/safety-trainings/${t.id}/print`} target="_blank" style={{ padding: '8px 16px', background: '#48bb78', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}>
                                    🖨️ 보고서 출력
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
