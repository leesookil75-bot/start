'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { checkInAction, checkOutAction } from '../../actions';

// Dynamically import Map to avoid SSR issues
const Map = dynamic(() => import('@/components/Map'), { ssr: false });

import { Suspense } from 'react';

function MapAttendanceContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const mode = searchParams.get('mode') as 'CHECK_IN' | 'CHECK_OUT';

    // Default to Seoul forest or some neutral place if no location found yet
    const [center, setCenter] = useState<[number, number]>([37.5445, 127.0374]);
    const [marker, setMarker] = useState<[number, number] | null>(null);
    const [status, setStatus] = useState<'LOADING' | 'READY' | 'ERROR'>('LOADING');
    const [errorMsg, setErrorMsg] = useState('');
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (!navigator.geolocation) {
            setStatus('ERROR');
            setErrorMsg('브라우저가 위치 정보를 지원하지 않습니다.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setCenter([latitude, longitude]);
                setMarker([latitude, longitude]);
                setStatus('READY');
            },
            (err) => {
                setStatus('ERROR');
                setErrorMsg('위치 정보를 가져올 수 없습니다. ' + err.message);
            },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    }, []);

    const handleConfirm = () => {
        startTransition(async () => {
            // We can optionally pass location to the action if we want to save it later
            const result = mode === 'CHECK_IN'
                ? await checkInAction()
                : await checkOutAction();

            if (result.success) {
                alert(mode === 'CHECK_IN' ? '출근 처리되었습니다.' : '퇴근 처리되었습니다.');
                router.push('/');
            } else {
                alert('처리 중 오류가 발생했습니다: ' + result.error);
            }
        });
    };

    return (
        <div style={{ padding: '1rem', minHeight: '100vh', background: '#111', color: '#fff', display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ fontSize: '1.2rem', marginBottom: '1rem', textAlign: 'center' }}>
                {mode === 'CHECK_IN' ? '출근 위치 확인' : '퇴근 위치 확인'}
            </h1>

            <div style={{ flex: 1, position: 'relative', borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem' }}>
                {status === 'LOADING' && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        위치 확인 중...
                    </div>
                )}

                <Map
                    center={center}
                    zoom={17}
                    markers={marker ? [{ lat: marker[0], lng: marker[1], popup: '현재 위치' }] : []}
                    height="100%"
                />
            </div>

            {status === 'ERROR' && (
                <div style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>
                    {errorMsg}
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                    onClick={handleConfirm}
                    disabled={status !== 'READY' || isPending}
                    style={{
                        padding: '1rem',
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        background: mode === 'CHECK_IN' ? '#22c55e' : '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: status === 'READY' ? 'pointer' : 'not-allowed',
                        opacity: status === 'READY' ? 1 : 0.5
                    }}
                >
                    {isPending ? '처리 중...' : (mode === 'CHECK_IN' ? '현재 위치에서 출근하기' : '현재 위치에서 퇴근하기')}
                </button>

                <button
                    onClick={() => router.back()}
                    disabled={isPending}
                    style={{
                        padding: '1rem',
                        fontSize: '1rem',
                        background: '#333',
                        color: '#aaa',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer'
                    }}
                >
                    취소
                </button>
            </div>
        </div>
    );
}

export default function MapAttendancePage() {
    return (
        <Suspense fallback={<div style={{ padding: '2rem', color: '#fff', textAlign: 'center' }}>Loading...</div>}>
            <MapAttendanceContent />
        </Suspense>
    );
}
