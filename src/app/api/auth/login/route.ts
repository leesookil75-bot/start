import { NextRequest, NextResponse } from 'next/server';
import { getUserByPhone } from '@/lib/data';
import { corsHeaders } from '@/lib/api-auth';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'clean-track-user-id';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { phoneNumber, password } = body;

        if (!phoneNumber) {
            return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400, headers: corsHeaders });
        }

        const user = await getUserByPhone(phoneNumber);

        if (!user) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404, headers: corsHeaders });
        }

        const dbPassword = user.password || user.phoneNumber.slice(-4);

        if (dbPassword !== password) {
            return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401, headers: corsHeaders });
        }

        // 브라우저용 쿠키 셋팅 (동일 도메인 환경용)
        (await cookies()).set(COOKIE_NAME, user.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 365 * 10, // 10 years
            path: '/',
        });

        // 네이티브 앱용 토큰(순수 ID) 반환 (Bearer 형식 활용)
        return NextResponse.json({ 
            success: true, 
            token: user.id, 
            user: { id: user.id, name: user.name, role: user.role } 
        }, { status: 200, headers: corsHeaders });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500, headers: corsHeaders });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}
