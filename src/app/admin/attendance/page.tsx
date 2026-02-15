
import { getAllAttendanceStatusAction, getCurrentUser } from '../../actions';
import { redirect } from 'next/navigation';
import styles from '../admin.module.css'; // Reuse admin styles

export const dynamic = 'force-dynamic';

export default async function AdminAttendancePage() {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
        redirect('/login');
    }

    const attendanceStatus = await getAllAttendanceStatusAction();
    // Sort: Working first, then by name
    attendanceStatus.sort((a, b) => {
        if (a.isWorking && !b.isWorking) return -1;
        if (!a.isWorking && b.isWorking) return 1;
        return a.user.name.localeCompare(b.user.name);
    });

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>출퇴근 현황</h1>
                <div style={{ color: '#888', fontSize: '0.9rem' }}>
                    {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })} 기준
                </div>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>이름</th>
                            <th>담당 구역</th>
                            <th>상태</th>
                            <th>출근 시간</th>
                            <th>퇴근 시간</th>
                        </tr>
                    </thead>
                    <tbody>
                        {attendanceStatus.map((status: any) => {
                            // Find today's Check In / Check Out
                            // Logic: 
                            // Check In: First one today? Or latest?
                            // Check Out: Latest one today?
                            // Given our data model, we filtered `todayRecords`.
                            // Let's assume user works once a day.
                            // If user Check-in -> Check-out -> Check-in, it's complex.
                            // Let's take the *earliest* Check-in today and *latest* Check-out today?
                            // Or just the latest pair?

                            // Let's use the `todayRecords` we computed in action.
                            // It is sorted descendant.
                            const todayRecords = status.todayRecords || [];

                            // Check In: find method 'CHECK_IN' from end (earliest) or just find?
                            // Since sorted DESC (newest first), last element is oldest.
                            const checkIns = todayRecords.filter((r: any) => r.type === 'CHECK_IN');
                            const checkOuts = todayRecords.filter((r: any) => r.type === 'CHECK_OUT');

                            const firstCheckIn = checkIns.length > 0 ? checkIns[checkIns.length - 1] : null; // Oldest Check In
                            const lastCheckOut = checkOuts.length > 0 ? checkOuts[0] : null; // Newest Check Out

                            const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

                            return (
                                <tr key={status.user.id}>
                                    <td style={{ fontWeight: 'bold' }}>{status.user.name}</td>
                                    <td>{status.user.cleaningArea}</td>
                                    <td>
                                        <span className={`${styles.badge} ${status.isWorking ? styles.badge50 : ''}`} style={{
                                            background: status.isWorking ? 'rgba(74, 222, 128, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                                            color: status.isWorking ? '#4ade80' : '#94a3b8'
                                        }}>
                                            {status.isWorking ? '근무 중' : '부재 중'}
                                        </span>
                                    </td>
                                    <td className={styles.time}>{firstCheckIn ? formatTime(firstCheckIn.timestamp) : '-'}</td>
                                    <td className={styles.time}>{lastCheckOut ? formatTime(lastCheckOut.timestamp) : '-'}</td>
                                </tr>
                            );
                        })}
                        {attendanceStatus.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>직원 데이터가 없습니다.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
