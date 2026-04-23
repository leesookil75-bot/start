import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/app/actions';
import { redirect } from 'next/navigation';
import PrintClient from './PrintClient';

export default async function PrintSafetyTrainingPage(props: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
        redirect('/login');
    }

    const params = await props.params;
    const id = params.id;

    // Fetch training
    const { rows: trainingRows } = await sql`
        SELECT * FROM safety_trainings WHERE id = ${id}
    `;

    if (trainingRows.length === 0) {
        return <div>교육 정보를 찾을 수 없습니다.</div>;
    }

    // Fetch signatures
    const { rows: signatureRows } = await sql`
        SELECT s.*, u.name, u.cleaning_area, u.phone_number 
        FROM safety_signatures s
        JOIN users u ON s.user_id = u.id
        WHERE s.training_id = ${id}
        ORDER BY s.created_at ASC
    `;

    return (
        <PrintClient training={trainingRows[0]} signatures={signatureRows} />
    );
}
