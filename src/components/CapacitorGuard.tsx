'use client';

import { useEffect, useState } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export function CapacitorPermissionGuard({ children }: { children: React.ReactNode }) {
    const [isResolved, setIsResolved] = useState(false);

    useEffect(() => {
        const MIN_LOADING_TIME = 3000; // 3초 대기
        
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
        };

        const loadWithDelay = async () => {
            const delayPromise = new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME));
            if (!Capacitor.isNativePlatform()) {
                await delayPromise;
            } else {
                await Promise.all([initializePermissions(), delayPromise]);
            }
            setIsResolved(true);
        };

        loadWithDelay();
    }, []);

    if (!isResolved) {
        return (
            <div className="flex flex-col items-center justify-center w-screen h-screen bg-gradient-to-br from-indigo-900 via-slate-800 to-slate-900 text-white overflow-hidden relative">
                <style dangerouslySetInnerHTML={{__html: `
                    @keyframes sweep {
                        0%, 100% { transform: rotate(-15deg) translateX(-10px); }
                        50% { transform: rotate(15deg) translateX(10px); }
                    }
                    @keyframes sparkleFade {
                        0% { opacity: 0; transform: scale(0.5); }
                        50% { opacity: 1; transform: scale(1.2); }
                        100% { opacity: 0; transform: scale(0.5); }
                    }
                    @keyframes loading-slide {
                        0% { transform: translateX(-100%); width: 40%; }
                        50% { width: 60%; }
                        100% { transform: translateX(300%); width: 40%; }
                    }
                    .animate-sweep {
                        animation: sweep 1.5s ease-in-out infinite;
                        transform-origin: bottom center;
                    }
                    .sparkle-1 { animation: sparkleFade 2s infinite 0s; }
                    .sparkle-2 { animation: sparkleFade 2s infinite 0.7s; }
                    .sparkle-3 { animation: sparkleFade 2s infinite 1.4s; }
                    .loading-bar { animation: loading-slide 1.5s infinite ease-in-out; }
                `}} />
                
                <div className="relative mb-8 mt-[-10vh]">
                    <div className="text-7xl animate-sweep drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                        🧹
                    </div>
                    <div className="absolute top-0 -left-6 text-2xl sparkle-1">✨</div>
                    <div className="absolute top-8 -right-8 text-3xl sparkle-2">✨</div>
                    <div className="absolute -bottom-4 right-0 text-xl sparkle-3">✨</div>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black mb-3 text-center tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-white drop-shadow-sm">
                    오늘도 깨끗한 거리 🧹✨
                </h1>
                <p className="text-slate-300 font-bold text-sm sm:text-base animate-pulse">
                    현장 작업을 준비하고 있습니다...
                </p>
                
                <div className="absolute bottom-16 sm:bottom-24 w-48 h-1.5 bg-slate-700/50 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full loading-bar shadow-[0_0_10px_rgba(96,165,250,0.8)]"></div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
