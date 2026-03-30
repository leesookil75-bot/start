'use client';

import { useEffect, useState } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export function CapacitorPermissionGuard({ children }: { children: React.ReactNode }) {
    const [isResolved, setIsResolved] = useState(false);

    useEffect(() => {
        const initializePermissions = async () => {
            if (Capacitor.isNativePlatform()) {
                try {
                    const permissionStatus = await Geolocation.checkPermissions();
                    if (permissionStatus.location !== 'granted') {
                        const requestStatus = await Geolocation.requestPermissions();
                        if (requestStatus.location !== 'granted') {
                            alert('출퇴근 기능을 위해 위치 권한 승인이 반드시 필요합니다.');
                        }
                    }
                } catch (error) {
                    console.error('위치 권한 요청 중 에러 발생:', error);
                }
            }
            setIsResolved(true);
        };

        if (!Capacitor.isNativePlatform()) {
            setIsResolved(true);
        } else {
            initializePermissions();
        }
    }, []);

    if (!isResolved) return <div style={{width:'100vw',height:'100vh',background:'#111',display:'flex',justifyContent:'center',alignItems:'center',color:'#fff'}}>앱 환경 권한 확인 중...</div>;

    return <>{children}</>;
}
