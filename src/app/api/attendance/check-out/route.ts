import { NextRequest, NextResponse } from 'next/server';
import { ApiGetCurrentUser, corsHeaders } from '@/lib/api-auth';
import { addAttendanceRecord } from '@/lib/data';

export async function POST(req: NextRequest) {
    try {
        const user = await ApiGetCurrentUser(req);
        
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
        }

        await addAttendanceRecord(user.id, 'CHECK_OUT');
        
        return NextResponse.json({ success: true, message: '퇴근 처리되었습니다.' }, { status: 200, headers: corsHeaders });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message || 'Failed to check out' }, { status: 500, headers: corsHeaders });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}
