import { getCurrentUser, getMonthlyChecklistsAction } from '@/app/actions';
import { redirect } from 'next/navigation';
import { CHECKLISTS } from '@/lib/checklists';
import adminStyles from '../admin.module.css';
import ChecklistMatrix from './ChecklistMatrix';
import ChecklistDailyRoster from './ChecklistDailyRoster';

export const dynamic = 'force-dynamic';

function getTodayStrKST(): string {
    const kstNow = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
    const yyyy = kstNow.getUTCFullYear();
    const mm = String(kstNow.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(kstNow.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export default async function AdminChecklistsPage({
    searchParams,
}: {
    searchParams?: { [key: string]: string | string[] | undefined };
}) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        redirect('/login');
    }

    const nowKst = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
    const sp = await searchParams;
    const qYear = sp?.year;
    const qMonth = sp?.month;
    const year = qYear ? parseInt(Array.isArray(qYear) ? qYear[0] : qYear) : nowKst.getUTCFullYear();
    const month = qMonth ? parseInt(Array.isArray(qMonth) ? qMonth[0] : qMonth) : nowKst.getUTCMonth() + 1;

    const { workers, submissions, workplaces } = await getMonthlyChecklistsAction(year, month);

    const defs = Object.fromEntries(
        Object.entries(CHECKLISTS).map(([k, v]) => [k, { title: v.title, items: v.items }])
    );

    return (
        <>
            {/* 모바일: 오늘 기준 제출/미제출 현황 */}
            <div className={adminStyles.mobileOnlyWrapper}>
                <ChecklistDailyRoster
                    submissions={submissions}
                    workers={workers}
                    defs={defs}
                    today={getTodayStrKST()}
                />
            </div>

            {/* PC: 월별 점검 매트릭스 + 엑셀 출력 */}
            <div className={adminStyles.pcOnlyWrapper}>
                <ChecklistMatrix
                    year={year}
                    month={month}
                    workers={workers}
                    submissions={submissions}
                    workplaces={workplaces}
                    defs={defs}
                />
            </div>
        </>
    );
}
