import { redirect } from 'next/navigation';
import { getCurrentUser, getTodayPreworkChecklist } from '../actions';
import { STREET_CLEANING_CHECKLIST } from '@/lib/checklists';
import ChecklistClient from './client';

export default async function ChecklistPage() {
    const user = await getCurrentUser();
    if (!user) {
        redirect('/login');
    }

    const def = STREET_CLEANING_CHECKLIST;
    const today = await getTodayPreworkChecklist(def.type);

    return (
        <ChecklistClient
            def={def}
            initialResults={today?.results ?? null}
            submittedAt={today?.createdAt ?? null}
            userName={user.name}
        />
    );
}
