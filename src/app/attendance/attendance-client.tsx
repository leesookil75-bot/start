'use client';

import { useState, useTransition, useEffect } from 'react';
import styles from './attendance.module.css';
import { checkInAction, checkOutAction, initializeDB } from '../actions';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

interface AttendanceClientProps {
    isWorking: boolean;
    todayDate: string;
    workLat?: number;
    workLng?: number;
    allowedRadius?: number;
    workplaces?: { lat: number, lng: number, radius: number, name: string }[];
}

export default function AttendanceClient({ isWorking: initialIsWorking, todayDate, workLat, workLng, allowedRadius = 100, workplaces }: AttendanceClientProps) {
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<string | null>(null);
    const [locationStatus, setLocationStatus] = useState<'checking' | 'allowed' | 'denied' | 'error'>('checking');
    const [distance, setDistance] = useState<number | null>(null);
    const [myLocation, setMyLocation] = useState<{ lat: number, lng: number } | null>(null);

    useEffect(() => {
        // If no work location is set, we allow attendance
        if (!workLat || !workLng) {
            setLocationStatus('allowed');
            return;
        }

        if (!navigator.geolocation) {
            setMessage('이 브라우저는 위치 정보를 지원하지 않습니다.');
            setLocationStatus('error');
            return;
        }

        let watchId: number;

        const startWatching = () => {
            setLocationStatus('checking');
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const currentLat = position.coords.latitude;
                    const currentLng = position.coords.longitude;
                    setMyLocation({ lat: currentLat, lng: currentLng });

                    let isAllowed = false;
                    let minDistance = Infinity;
                    let closestName = '';

                    if (workplaces && workplaces.length > 0) {
                        for (const wp of workplaces) {
                            if (!wp.lat || !wp.lng) continue;
                            const dist = getDistanceFromLatLonInM(wp.lat, wp.lng, currentLat, currentLng);
                            if (dist < minDistance) {
                                minDistance = dist;
                                closestName = wp.name;
                            }
                            if (dist <= wp.radius) {
                                isAllowed = true;
                                break;
                            }
                        }
                    } else if (workLat && workLng) {
                        const dist = getDistanceFromLatLonInM(workLat, workLng, currentLat, currentLng);
                        minDistance = dist;
                        if (dist <= (allowedRadius || 100)) isAllowed = true;
                    }

                    if (minDistance !== Infinity) {
                        setDistance(Math.round(minDistance));
                    }

                    if (isAllowed) {
                        setLocationStatus('allowed');
                        setMessage(null); // Clear any previous error
                    } else {
                        setLocationStatus('denied');
                        if (closestName) {
                            setMessage(`가장 가까운 근무지(${closestName})에서 멉니다. (거리: ${Math.round(minDistance)}m)`);
                        } else {
                            setMessage(`근무지에서 너무 멉니다. (거리: ${Math.round(minDistance)}m, 허용: ${allowedRadius}m)`);
                        }
                    }
                },
                (error) => {
                    console.error(error);
                    setLocationStatus('error');
                    setMessage('위치 정보를 가져올 수 없습니다. 위치 권한을 허용해주세요.');
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        };

        startWatching();

        return () => {
            if (watchId !== undefined) {
                navigator.geolocation.clearWatch(watchId);
            }
        };

        // User might move, so adding a "Retry Location" button might be good or auto-refresh.
    }, [workLat, workLng, allowedRadius, workplaces]);


    const handleAction = async (action: 'checkIn' | 'checkOut') => {
        if (locationStatus !== 'allowed' && (workLat && workLng)) {
            // Double check? Or rely on state.
            // If checking, blocking.
            if (locationStatus === 'checking') {
                setMessage('위치 확인 중입니다...');
                return;
            }
            if (locationStatus === 'denied') {
                setMessage(`근무지 반경 내에서만 가능합니다. (현재 거리: ${distance}m)`);
                return;
            }
            if (locationStatus === 'error') {
                setMessage('위치 정보를 확인할 수 없어 출퇴근을 기록할 수 없습니다.');
                return;
            }
        }

        setMessage(null);
        startTransition(async () => {
            const result = action === 'checkIn' ? await checkInAction() : await checkOutAction();
            if (!result.success) {
                setMessage(result.error || '작업 실패');
            }
        });
    };

    const handleFixDB = () => {
        startTransition(async () => {
            const result = await initializeDB();
            if (result.success) {
                setMessage('✅ 데이터베이스가 초기화되었습니다. 다시 시도해주세요.');
            } else {
                setMessage('❌ 초기화 실패: ' + result.error);
            }
        });
    };

    const showFixButton = message && (message.includes('relation') || message.includes('does not exist') || message.includes('table'));
    const isLocationRestricted = (workLat !== undefined && workLng !== undefined) && locationStatus !== 'allowed';

    return (
        <>
            <div className={styles.statusContainer}>
                <div className={styles.statusLabel}>현재 상태</div>
                <div className={`${styles.currentStatus} ${initialIsWorking ? styles.statusWorking : styles.statusOff}`}>
                    {initialIsWorking ? '근무 중' : '근무 종료'}
                </div>
                <div className={styles.timeDisplay}>
                    {todayDate}
                </div>
                {distance !== null && locationStatus === 'allowed' && workLat && (
                    <div style={{ fontSize: '0.8rem', color: 'green', marginTop: '0.5rem' }}>
                        ✅ 근무지 범위 내 ({distance}m)
                    </div>
                )}
            </div>

            {/* Map Visualization */}
            {workLat && workLng && (
                <div style={{ margin: '1rem 0', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                    <Map
                        center={myLocation ? [myLocation.lat, myLocation.lng] : [workLat, workLng]}
                        zoom={17}
                        markers={[
                            { lat: workLat, lng: workLng, popup: '근무지', color: 'red' },
                            ...(myLocation ? [{ lat: myLocation.lat, lng: myLocation.lng, popup: '내 위치', color: 'blue' }] : [])
                        ]}
                        circle={{ lat: workLat, lng: workLng, radius: allowedRadius, color: 'red' }}
                        height="250px"
                    />
                </div>
            )}

            <div className={styles.actionButtons}>
                <button
                    onClick={() => handleAction('checkIn')}
                    className={`${styles.actionBtn} ${styles.checkInBtn}`}
                    disabled={initialIsWorking || isPending || isLocationRestricted}
                    style={isLocationRestricted ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                    <span className={styles.btnIcon}>☀️</span>
                    <span className={styles.btnLabel}>출근하기</span>
                </button>
                <button
                    onClick={() => handleAction('checkOut')}
                    className={`${styles.actionBtn} ${styles.checkOutBtn}`}
                    disabled={!initialIsWorking || isPending || isLocationRestricted}
                    style={isLocationRestricted ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                    <span className={styles.btnIcon}>🌙</span>
                    <span className={styles.btnLabel}>퇴근하기</span>
                </button>
            </div>

            {message && (
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <p style={{ color: 'red', marginBottom: '0.5rem' }}>{message}</p>
                    {showFixButton && (
                        <button
                            onClick={handleFixDB}
                            disabled={isPending}
                            style={{
                                padding: '0.5rem 1rem',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            🛠️ 문제 해결 (데이터베이스 초기화)
                        </button>
                    )}
                </div>
            )}
        </>
    );
}

function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d * 1000; // Distance in m
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
}
