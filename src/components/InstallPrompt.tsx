'use client';

import { useEffect, useState } from 'react';
import styles from '../app/page.module.css';

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

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
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        if (isStandalone) {
            setIsVisible(false);
            return;
        }

        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        setIsIOS(/iphone|ipad|ipod/.test(userAgent));

        // Always show the button for visibility (fallback mode), unless standalone
        setIsVisible(true);

        const handler = (e: any) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            // Update UI notify the user they can install the PWA
            // setIsVisible(true); // Already true
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
            if (outcome === 'accepted') setIsVisible(false);
        } else {
            // Fallback Logic
            const userAgent = window.navigator.userAgent.toLowerCase();
            const isKakao = /kakaotalk/.test(userAgent);
            const isAndroid = /android/.test(userAgent);

            if (isKakao && isAndroid) {
                // KakaoTalk Android -> Android Chrome Intent
                // This forces opening in the external Chrome browser
                location.href = 'intent://' + location.href.replace(/https?:\/\//i, '') + '#Intent;scheme=https;package=com.android.chrome;end';
                return;
            }

            if (isIOS) {
                alert("아이폰/아이패드 설치 방법:\n하단 '공유' 버튼 → '홈 화면에 추가'를 선택해주세요.");
            } else {
                alert("앱 설치 방법:\n브라우저 우측 상단/하단 메뉴(⋮ 또는 N)에서 '앱 설치' 또는 '홈 화면에 추가'를 선택해주세요.\n(카카오톡 등 인앱 브라우저에서는 '다른 브라우저로 열기' 후 시도해주세요.)");
            }
        }
    };

    if (!isVisible) return null;

    return (
        <div className={styles.installContainer}>
            <button className={styles.installButton} onClick={handleInstallClick}>
                📲 앱 설치하기
            </button>
        </div>
    );
}
