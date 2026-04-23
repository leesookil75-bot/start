'use client';

export default function RoleSwitchButtons() {
    return (
        <>
            <button 
                onClick={() => {
                    document.cookie = "view_mode=admin; path=/";
                    window.location.href = '/admin';
                }}
                style={{ padding: '0.5rem 1rem', background: '#e2e8f0', borderRadius: '8px', border: 'none', cursor: 'pointer', color: '#333', fontWeight: 'bold' }}
            >
                🏢 일반 관리자 뷰
            </button>
            <button 
                onClick={() => {
                    document.cookie = "view_mode=worker; path=/";
                    window.location.href = '/';
                }}
                style={{ padding: '0.5rem 1rem', background: '#48bb78', borderRadius: '8px', border: 'none', cursor: 'pointer', color: 'white', fontWeight: 'bold' }}
            >
                📱 앱 화면(근로자) 뷰
            </button>
        </>
    );
}
