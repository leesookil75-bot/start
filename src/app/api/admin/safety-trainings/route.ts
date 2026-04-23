import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { title, date, lat, lng, instructor } = body;
        const id = crypto.randomUUID();

        await sql`
            INSERT INTO safety_trainings (id, title, date, lat, lng, instructor)
            VALUES (${id}, ${title}, ${date}, ${lat}, ${lng}, ${instructor})
        `;

        return NextResponse.json({ success: true, id });
    } catch (e: any) {
        console.error('Failed to create safety training:', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function GET() {
    try {
        const { rows } = await sql`
            SELECT * FROM safety_trainings
            ORDER BY created_at DESC
        `;
        return NextResponse.json({ success: true, trainings: rows });
    } catch (e: any) {
        console.error('Failed to fetch safety trainings:', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
