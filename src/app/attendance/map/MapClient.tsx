'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { checkInAction, checkOutAction } from '../../actions';
import { User } from '@/lib/types';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

interface MapClientProps {
    user: User;
}

export default function MapClient({ user }: MapClientProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const mode = searchParams.get('mode') as 'CHECK_IN' | 'CHECK_OUT';

    // Initial center: Workplace or Default (Seoul)
    const defaultLat = user.workLat || 37.5665;
    const defaultLng = user.workLng || 126.9780;

    const [center, setCenter] = useState<[number, number]>([defaultLat, defaultLng]);
    const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
    const [status, setStatus] = useState<'LOADING' | 'READY' | 'ERROR'>('LOADING');
    const [errorMsg, setErrorMsg] = useState('');
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (!navigator.geolocation) {
            setStatus('ERROR');
            setErrorMsg('브라우저가 위치 정보를 지원하지 않습니다.');
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setUserLoc([latitude, longitude]);
                setCenter([latitude, longitude]); // Auto-pan to user? Or maybe just once? 
                // Let's pan to user initially or if they move significantly?
                // For now, simple keeping center on user is fine for "Check-in confirmation"
                setStatus('READY');
            },
            (err) => {
                console.error(err);
                if (status === 'LOADING') {
                    setStatus('ERROR');
                    setErrorMsg('위치 정보를 가져올 수 없습니다: ' + err.message);
                }
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    const handleConfirm = () => {
        startTransition(async () => {
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

    // Prepare markers
    const markers = [];

    // User Marker
    if (userLoc) {
        markers.push({ lat: userLoc[0], lng: userLoc[1], popup: '현재 위치', color: 'blue' });
    }

    // Workplace Marker
    if (user.workLat && user.workLng) {
        markers.push({ lat: user.workLat, lng: user.workLng, popup: '근무지', color: 'red' });
    }

    // Workplace Circle
    const circle = (user.workLat && user.workLng && user.allowedRadius) ? {
        lat: user.workLat,
        lng: user.workLng,
        radius: user.allowedRadius,
        color: 'red'
    } : undefined;


    return (
        <div style={{ padding: '1rem', height: '100vh', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            <h1 style={{ fontSize: '1.2rem', marginBottom: '1rem', textAlign: 'center', color: '#fff' }}>
                {mode === 'CHECK_IN' ? '출근 위치 확인' : '퇴근 위치 확인'}
            </h1>

            <div style={{ flex: 1, position: 'relative', borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem', background: '#222' }}>
                {status === 'LOADING' && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        위치 확인 중...
                    </div>
                )}

                {/* 
                   Force Map to take full height of this flex container.
                   We pass "100%" as height to Map component, which passes it to MapContainer.
                   MapContainer needs its parent (this div) to have explicit height.
                   Flex child with flex: 1 has height, so this should work.
                */}
                <Map
                    center={center}
                    zoom={17}
                    markers={markers}
                    circle={circle}
                    height="100%"
                />
            </div>

            {status === 'ERROR' && (
                <div style={{ color: '#ef4444', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
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
                        background: (status === 'READY' && !isPending) ? (mode === 'CHECK_IN' ? '#22c55e' : '#f59e0b') : '#4b5563',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: (status === 'READY' && !isPending) ? 'pointer' : 'not-allowed',
                        opacity: (status === 'READY' && !isPending) ? 1 : 0.7,
                        transition: 'background 0.2s'
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
