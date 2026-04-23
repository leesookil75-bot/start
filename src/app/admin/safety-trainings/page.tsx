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
        SELECT * FROM safety_trainings ORDER BY created_at DESC
    `;

    return (
        <SafetyTrainingClient initialTrainings={rows} />
    );
}
