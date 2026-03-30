import { NextRequest } from 'next/server';
import { getUsers } from '@/lib/data';

const COOKIE_NAME = 'clean-track-user-id';

export async function ApiGetCurrentUser(req: NextRequest) {
    // 1. Authorization 헤더 확인 (Capacitor 모바일 앱 환경 대비)
    const authHeader = req.headers.get('Authorization');
    let userId = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        userId = authHeader.substring(7); 
        // JWT 등 더 안전한 방식이 좋으나, 기존 Cookie 방식을 그대로 호환하기 위해 우선 ID 자체를 토큰처럼 활용합니다.
    } 
    
    // 2. 기존 브라우저 쿠키 확인 (기존 웹 환경 지원 유지)
    if (!userId) {
        userId = req.cookies.get(COOKIE_NAME)?.value || null;
    }

    if (!userId) return null;

    const users = await getUsers();
    return users.find(u => u.id === userId) || null;
}

// CORS 공통 헤더
export const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // 개발 단계용 오픈. 필요시 capacitor://localhost 등으로 엄격히 제한 가능
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
