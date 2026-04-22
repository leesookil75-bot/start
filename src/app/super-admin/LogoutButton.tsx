'use client';

import { logout } from '../actions';

export default function LogoutButton() {
    return (
        <button 
            onClick={async () => {
                // 완전히 모바일 캐시에서 날려버림
                document.cookie = "clean-track-user-id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                await logout();
            }} 
            style={{ padding: '0.5rem 1rem', background: '#ef4444', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}
        >
            로그아웃
        </button>
    );
}
