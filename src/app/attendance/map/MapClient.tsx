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
    const [accuracy, setAccuracy] = useState<number | null>(null);
    const [accuracyGrade, setAccuracyGrade] = useState<{ label: string, color: string } | null>(null);
    const [status, setStatus] = useState<'LOADING' | 'READY' | 'ERROR'>('LOADING');
    const [errorMsg, setErrorMsg] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPending, startTransition] = useTransition();

    // Haversine formula to calculate distance in meters
    const getDistanceFromLatLonInM = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3; // Radius of the earth in m
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in m
        return d;
    };

    const deg2rad = (deg: number) => {
        return deg * (Math.PI / 180);
    };

    const [distance, setDistance] = useState<number | null>(null);
    const [isWithinRadius, setIsWithinRadius] = useState<boolean>(false);

    const getAccuracyGrade = (acc: number) => {
        if (acc <= 20) return { label: '좋음 (GPS)', color: '#4ade80' };
        if (acc <= 60) return { label: '보통 (Wi-Fi/교외)', color: '#fbbf24' };
        return { label: '낮음 (실내/기상)', color: '#f87171' };
    };

    const getAdvice = (error: GeolocationPositionError) => {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                return '위치 정보 권한이 거부되었습니다. 설정에서 브라우저의 위치 권한을 허용해 주세요.';
            case error.POSITION_UNAVAILABLE:
                return '위치 정보를 사용할 수 없습니다. GPS가 켜져 있는지 확인하고 창가나 실외로 이동해 주세요.';
            case error.TIMEOUT:
                return '위치 확인 시간이 초과되었습니다. 신호가 약한 지역일 수 있으니 자리를 옮겨 다시 시도해 주세요.';
            default:
                return '알 수 없는 오류가 발생했습니다: ' + error.message;
        }
    };

    useEffect(() => {
        // Change maximumAge to 0 to completely prevent caching of old locations.
        const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };

        const updatePosition = (pos: GeolocationPosition) => {
            const { latitude, longitude, accuracy } = pos.coords;
            setUserLoc([latitude, longitude]);
            setAccuracy(accuracy);
            setAccuracyGrade(getAccuracyGrade(accuracy));
            setCenter([latitude, longitude]);
            setStatus('READY');

            if (user.workLat && user.workLng) {
                const dist = getDistanceFromLatLonInM(latitude, longitude, user.workLat, user.workLng);
                setDistance(dist);
                // Increased default radius to 100 for better margin of error on mobile web
                const radius = user.allowedRadius || 100;
                setIsWithinRadius(dist <= radius);
            } else if (!user.workLat) {
                setIsWithinRadius(true);
            }
        };

        const handleError = (err: GeolocationPositionError) => {
            console.error('WatchPosition Error:', err);
            if (status === 'LOADING') {
                setStatus('ERROR');
                setErrorMsg(getAdvice(err));
            }
        };

        // First do an initial getCurrentPosition to warm up GPS
        navigator.geolocation.getCurrentPosition(
            (pos) => { updatePosition(pos); },
            (err) => { console.warn('Initial position fetch failed, falling back to watchPosition', err); },
            options
        );

        // Then continue watching
        const watchId = navigator.geolocation.watchPosition(updatePosition, handleError, {
            ...options,
            timeout: 30000 // slightly longer timeout for continuous watching
        });

        return () => navigator.geolocation.clearWatch(watchId);
    }, [user.workLat, user.workLng, user.allowedRadius]);

    const refreshLocation = () => {
        if (!navigator.geolocation) return;
        setIsRefreshing(true);

        const onRefreshSuccess = (pos: GeolocationPosition) => {
            const { latitude, longitude, accuracy } = pos.coords;
            setUserLoc([latitude, longitude]);
            setAccuracy(accuracy);
            setAccuracyGrade(getAccuracyGrade(accuracy));
            setCenter([latitude, longitude]);
            setIsRefreshing(false);
        };

        const onRefreshError = (err: GeolocationPositionError) => {
            if (err.code === err.TIMEOUT) {
                // One last try with highAccuracy: false on timeout
                navigator.geolocation.getCurrentPosition(onRefreshSuccess, (finalErr) => {
                    console.error('Refresh Error (Final):', finalErr);
                    setIsRefreshing(false);
                    alert(getAdvice(finalErr));
                }, { enableHighAccuracy: false, timeout: 10000 });
            } else {
                console.error('Refresh Error:', err);
                setIsRefreshing(false);
                alert(getAdvice(err));
            }
        };

        navigator.geolocation.getCurrentPosition(onRefreshSuccess, onRefreshError, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    };

    const handleConfirm = () => {
        if (!isWithinRadius && user.workLat) {
            alert('근무지 반경을 벗어났습니다. 근무지 근처에서 다시 시도해주세요.');
            return;
        }

        if (accuracy !== null && accuracy >= 100) {
            alert('위치 정보가 부정확합니다. 잠시 후 다시 시도해주세요');
            return;
        }

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
                    userCircle={userLoc && accuracy ? { lat: userLoc[0], lng: userLoc[1], radius: accuracy } : undefined}
                    height="100%"
                />

                {/* Refresh button */}
                <button
                    onClick={refreshLocation}
                    disabled={isRefreshing}
                    style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        zIndex: 1000,
                        background: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                        cursor: 'pointer'
                    }}
                    title="위치 새로고침"
                >
                    <span style={{ fontSize: '1.2rem', animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }}>
                        {isRefreshing ? '⌛' : '🔄'}
                    </span>
                </button>

                {/* Distance Info Overlay */}
                {distance !== null && user.workLat && (
                    <div style={{
                        position: 'absolute',
                        bottom: '10px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(0,0,0,0.8)',
                        color: isWithinRadius ? '#4ade80' : '#f87171',
                        padding: '0.5rem 1rem',
                        borderRadius: '20px',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        zIndex: 1000,
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                    }}>
                        근무지와의 거리: {Math.round(distance)}m
                        {isWithinRadius ? ' (가능)' : ' (불가)'}
                    </div>
                )}

                {/* Accuracy Tip Overlay */}
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    background: accuracy && accuracy > 60 ? 'rgba(239,68,68,0.95)' : 'rgba(0,0,0,0.7)',
                    color: '#fff',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    zIndex: 1000,
                    maxWidth: accuracy && accuracy > 60 ? '220px' : '150px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    transition: 'all 0.3s ease-in-out'
                }}>
                    <div style={{ marginBottom: '0.4rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        정확도: <span style={{ color: accuracy && accuracy > 60 ? '#fff' : (accuracyGrade?.color || '#fff') }}>{accuracyGrade?.label || '확인 중...'}</span>
                    </div>
                    {accuracy && accuracy > 60 ? (
                        <div style={{ fontSize: '0.75rem', color: '#fff', lineHeight: '1.4', fontWeight: 'bold' }}>
                            🔴 GPS 확인 중 (오차 {Math.round(accuracy)}m)<br/>반경 원이 줄어들 때까지 탁 트인 곳에서 잠시 기다려주세요!
                        </div>
                    ) : (
                        <div style={{ fontSize: '0.7rem', color: '#ccc', lineHeight: '1.3' }}>
                            💡 원이 클수록 부정확합니다. 창가로 이동해 🔄 버튼을 눌러보세요.
                        </div>
                    )}
                </div>
            </div>

            {status === 'ERROR' && (
                <div style={{ color: '#ef4444', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
                    {errorMsg}
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                    onClick={handleConfirm}
                    disabled={status !== 'READY' || isPending || (!isWithinRadius && !!user.workLat)}
                    style={{
                        padding: '1rem',
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        background: (status === 'READY' && !isPending && (isWithinRadius || !user.workLat))
                            ? (mode === 'CHECK_IN' ? '#22c55e' : '#f59e0b')
                            : '#4b5563',
                        color: (status === 'READY' && !isPending && (isWithinRadius || !user.workLat)) ? 'white' : '#9ca3af',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: (status === 'READY' && !isPending && (isWithinRadius || !user.workLat)) ? 'pointer' : 'not-allowed',
                        opacity: (status === 'READY' && !isPending && (isWithinRadius || !user.workLat)) ? 1 : 0.7,
                        transition: 'background 0.2s'
                    }}
                >
                    {isPending ? '처리 중...' : (!isWithinRadius && !!user.workLat ? '근무지 반경을 벗어났습니다' : (mode === 'CHECK_IN' ? '현재 위치에서 출근하기' : '현재 위치에서 퇴근하기'))}
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
