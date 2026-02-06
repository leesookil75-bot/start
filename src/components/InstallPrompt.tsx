'use client';

import { useEffect, useState } from 'react';
import styles from '../app/page.module.css';

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(true); // Force true initially
    const [isIOS, setIsIOS] = useState(false);
    const [redirecting, setRedirecting] = useState(false);

    useEffect(() => {
        // Register Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => {
                    console.log('SW registered:', registration);
                })
                .catch((error) => {
                    console.error('SW registration failed:', error);
                });
        }

        // Check if already in standalone mode
        // For debugging, we will SHOW it even if standalone for a moment to verify it exists
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        console.log("Is Standalone:", isStandalone);

        // if (isStandalone) {
        //     setIsVisible(false);
        //     return;
        // }

        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        setIsIOS(/iphone|ipad|ipod/.test(userAgent));

        const handler = (e: any) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            // Android / Chrome: Use native prompt
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            setDeferredPrompt(null);
            // if (outcome === 'accepted') setIsVisible(false);
        } else {
            // Fallback Logic
            const userAgent = window.navigator.userAgent.toLowerCase();
            const isAndroid = /android/.test(userAgent);

            if (isAndroid) {
                // If on Android but no deferredPrompt, we are likely in an In-App Browser (Kakao, Naver, etc.)
                // Force open in Chrome without blocking alert (preserves user gesture)
                setRedirecting(true);
                location.href = 'intent://' + location.href.replace(/https?:\/\//i, '') + '#Intent;scheme=https;package=com.android.chrome;end';
                return;
            }

            if (isIOS) {
                alert("아이폰/아이패드 설치 방법:\n하단 '공유' 버튼 → '홈 화면에 추가'를 선택해주세요.");
            } else {
                alert("앱 설치 방법:\n브라우저 우측 상단/하단 메뉴(⋮ 또는 N)에서 '앱 설치' 또는 '홈 화면에 추가'를 선택해주세요.");
            }
        }
    };

    if (!isVisible) return null;

    return (
        <div
            style={{
                zIndex: 99999,
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                background: 'rgba(50, 50, 50, 0.95)',
                padding: '12px',
                display: 'flex',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                backdropFilter: 'blur(5px)'
            }}
        >
            <button
                className={styles.installButton}
                onClick={handleInstallClick}
                disabled={redirecting}
                style={{ margin: 0 }} // Override any external margin
            >
                {redirecting ? '크롬으로 이동 중...' : 'DEBUG: 앱 설치 (보이나요?)'}
            </button>
        </div>
    );
}
