
import styles from './attendance.module.css';
import Link from 'next/link';
import { getMyAttendanceAction, getCurrentUser } from '../actions';
import { redirect } from 'next/navigation';
import AttendanceClient from './attendance-client';
import { HomeIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';

export default async function AttendancePage() {
    const user = await getCurrentUser();
    if (!user) {
        redirect('/login');
    }

    const records = await getMyAttendanceAction();
    // Sort descending
    records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const latest = records[0];
    const isWorking = latest?.type === 'CHECK_IN';
    const todayDate = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long', timeZone: 'Asia/Seoul' });

    // Grouping Logic for Table
    const groupedByDate: Record<string, { checkIns: string[], checkOuts: string[] }> = {};

    records.forEach(r => {
        const d = new Date(r.timestamp);
        const dateStr = d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', weekday: 'short', timeZone: 'Asia/Seoul' });
        const timeStr = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul' });

        if (!groupedByDate[dateStr]) {
            groupedByDate[dateStr] = { checkIns: [], checkOuts: [] };
        }

        if (r.type === 'CHECK_IN') groupedByDate[dateStr].checkIns.push(timeStr);
        else groupedByDate[dateStr].checkOuts.push(timeStr);
    });

    const tableRows = Object.entries(groupedByDate).map(([date, data]) => {
        const checkIn = data.checkIns.sort().join(', ') || '-';
        const checkOut = data.checkOuts.sort().join(', ') || '-';
        return { date, checkIn, checkOut };
    });

    // Sort table rows by date descending (already roughly done by record sort, but map order isn't guaranteed strict)
    // We can rely on insertion order in JS for simple objects usually, but better to be explicit if needed.
    // Since we scanned records (desc) and inserted keys, keys might be in first-seen order (newest first).
    // Let's assume it's fine for now.

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.backLink} aria-label="홈으로">
                    <HomeIcon />
                </Link>
                <h1 className={styles.title}>출퇴근 기록</h1>
                <div style={{ width: '40px' }}></div>
            </header>

            <AttendanceClient
                isWorking={isWorking}
                todayDate={todayDate}
                workLat={user.workLat}
                workLng={user.workLng}
                allowedRadius={user.allowedRadius}
            />

            <div className={styles.recordSection}>
                <h2 className={styles.sectionTitle}>이번 주 근무 기록</h2>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>날짜</th>
                                <th>출근</th>
                                <th>퇴근</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableRows.length > 0 ? (
                                tableRows.map((row, i) => (
                                    <tr key={i}>
                                        <td className={styles.dateCell}>{row.date}</td>
                                        <td className={styles.timeCell}>{row.checkIn}</td>
                                        <td className={styles.timeCell}>{row.checkOut}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                                        기록이 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
