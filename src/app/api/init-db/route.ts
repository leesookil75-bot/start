import { NextResponse } from 'next/server';
import { initializeDB } from '../../actions';

export async function GET() {
    try {
        const result = await initializeDB();
        if (result.success) {
            return NextResponse.json({ success: true, message: 'Database initialized successfully' });
        } else {
            return NextResponse.json({ success: false, error: result.error }, { status: 500 });
        }
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
