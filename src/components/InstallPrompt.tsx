'use client';

import { useEffect, useState } from 'react';
import styles from '../app/page.module.css';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isVisible, setIsVisible] = useState(false);
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        if (isStandalone) {
            // Already initialized to false
            return;
        }

        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        setIsIOS(/iphone|ipad|ipod/.test(userAgent));

        // Show the prompt if not in standalone (fallback for browsers that don't fire beforeinstallprompt instantly)
        setIsVisible(true);

        const handler = (e: Event) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = async () => {
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isKakao = /kakaotalk/i.test(userAgent);
        const isAndroid = /android/i.test(userAgent);
        const isIOSDevice = /iphone|ipad|ipod/i.test(userAgent);

        if (deferredPrompt) {
            // Android / Chrome: Use native prompt
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            setDeferredPrompt(null);
            if (outcome === 'accepted') setIsVisible(false);
        } else {
            // Fallback Logic for In-App Browsers or iOS

            if (isAndroid && isKakao) {
                // Force open in Chrome for Android KakaoTalk
                setRedirecting(true);
                location.href = 'intent://' + location.href.replace(/https?:\/\//i, '') + '#Intent;scheme=https;package=com.android.chrome;end';
                return;
            }

            if (isIOSDevice) {
                alert("아이폰/아이패드 설치 방법:\n1. 하단 '공유' 버튼(네모 화살표)을 눌러주세요.\n2. '홈 화면에 추가'를 선택해주세요.\n(카카오톡에서는 'Safari로 열기' 후 진행해주세요)");
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
                background: 'rgba(20, 20, 20, 0.95)', // Slightly cleaner dark bg
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
                {redirecting ? '크롬으로 이동 중...' : '홈화면 바로가기 설치'}
            </button>
        </div>
    );
}

