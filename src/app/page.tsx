import styles from './page.module.css';
import { recordUsage, getCurrentUser, logout, getTodayUserUsage, getMyStats, getMyDailyAttendanceStatus } from './actions';
import { redirect } from 'next/navigation';
import ClientHome from './client-home';

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // If user is admin, redirect to admin dashboard immediately
  if (user.role === 'admin') {
    redirect('/admin');
  }


  const initialUsage = await getTodayUserUsage();
  const stats = await getMyStats();
  const attendanceStatus = await getMyDailyAttendanceStatus();

  // Get recent notices
  const { getNotices } = await import('@/lib/data');
  const notices = await getNotices();
  // Filter out recent notices if they are already dismissed? 
  // For now just pass the latest one.
  // Actually, user requested to REMOVE the notice banner.
  // So we don't need to pass recentNotice anymore, OR we keep it for the "Notice" tab but not the banner.
  // The User said "replace the notice banner". 
  // I will stop passing `recentNotice` to ClientHome or ClientHome will ignore it.
  // I'll keep fetching it just in case, but ClientHome will handle the UI change.

  return (
    <main className={styles.main}>
      <ClientHome
        initialUsage={initialUsage}
        stats={stats}
        attendanceStatus={attendanceStatus}
        user={{
          name: user.name,
          cleaningArea: user.cleaningArea,
          role: user.role
        }}
      />
    </main>
  );
}

