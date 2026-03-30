import { NextRequest, NextResponse } from 'next/server';
import { ApiGetCurrentUser, corsHeaders } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
    try {
        const user = await ApiGetCurrentUser(req);
        
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized', user: null }, { status: 401, headers: corsHeaders });
        }

        return NextResponse.json({ success: true, user }, { status: 200, headers: corsHeaders });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500, headers: corsHeaders });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}
