import { getMonthlyAttendanceAction } from '../../actions';
import { redirect } from 'next/navigation';
import AttendanceMatrix from './attendance-matrix';
import { getCurrentUser } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function AdminAttendancePage({
    searchParams,
}: {
    searchParams?: { [key: string]: string | string[] | undefined };
}) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
        redirect('/login');
    }

    const today = new Date();
    // Use KST? 
    const nowKst = new Date(today.getTime() + 9 * 60 * 60 * 1000);

    // Parse year/month from query or default to current
    const sp = await searchParams; // Next.js 15 requires awaiting searchParams if it's a promise? 
    // In strict Next 15 yes, in 14 no. Assuming 14 or safe way.
    // If searchParams is standard object in this version:

    // Safety check for searchParams being undefined
    const qYear = sp?.year;
    const qMonth = sp?.month;

    const year = qYear ? parseInt(Array.isArray(qYear) ? qYear[0] : qYear) : nowKst.getUTCFullYear();
    const month = qMonth ? parseInt(Array.isArray(qMonth) ? qMonth[0] : qMonth) : nowKst.getUTCMonth() + 1;

    const data = await getMonthlyAttendanceAction(year, month);

    return (
        <AttendanceMatrix
            year={year}
            month={month}
            data={data}
        />
    );
}
