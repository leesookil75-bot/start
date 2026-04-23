import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        
        // 1. Fetch training info
        const { rows: trainingRows } = await sql`
            SELECT * FROM safety_trainings WHERE id = ${id}
        `;
        
        if (trainingRows.length === 0) {
            return NextResponse.json({ success: false, error: 'Training not found' }, { status: 404 });
        }
        
        // 2. Fetch signatures with user details
        const { rows: signatureRows } = await sql`
            SELECT s.*, u.name, u.cleaning_area, u.phone_number 
            FROM safety_signatures s
            JOIN users u ON s.user_id = u.id
            WHERE s.training_id = ${id}
            ORDER BY s.created_at ASC
        `;

        return NextResponse.json({ success: true, training: trainingRows[0], signatures: signatureRows });
    } catch (e: any) {
        console.error('Failed to fetch safety signatures:', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
