import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/app/actions';
import { redirect } from 'next/navigation';
import SafetyTrainingClient from './SafetyTrainingClient';

export default async function SafetyTrainingsPage() {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        redirect('/login');
    }

    const { rows } = await sql`
        SELECT 
            st.*, 
            (SELECT COUNT(*) FROM safety_signatures ss WHERE ss.training_id = st.id) as signature_count 
        FROM safety_trainings st 
        ORDER BY created_at DESC
    `;

    const safeRows = JSON.parse(JSON.stringify(rows));

    return (
        <SafetyTrainingClient initialTrainings={safeRows} />
    );
}
