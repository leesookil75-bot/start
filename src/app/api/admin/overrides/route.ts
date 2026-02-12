import { NextRequest, NextResponse } from 'next/server';
import { saveDailyOverride, DailyOverride } from '@/lib/data';
import { getCurrentUser } from '@/app/actions';

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { date, userId, type, value } = body;

        if (!date || !userId || !type || value === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Ensure value is treated correctly (string or number)
        // If it looks like a number and is not empty string, parse it? 
        // Or trust the client to send numbers as numbers?
        // Let's trust the client payload types, but ensure safe handling.

        const override: DailyOverride = {
            date,
            userId,
            type: type as '45' | '75',
            value
        };

        await saveDailyOverride(override);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving override:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
