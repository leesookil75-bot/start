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
  if (user.role === 'super_admin') {
    redirect('/super-admin');
  }


  const initialUsage = await getTodayUserUsage();
  const stats = await getMyStats();
  const attendanceStatus = await getMyDailyAttendanceStatus();

  // Fetch today's safety training
  const today = new Date().toISOString().split('T')[0];
  const { sql } = await import('@vercel/postgres');
  const { rows: safetyTrainings } = await sql`
      SELECT id, title, lat, lng FROM safety_trainings WHERE date = ${today} LIMIT 1
  `;
  const activeSafetyTraining = safetyTrainings.length > 0 ? (safetyTrainings[0] as { id: string; title: string; lat: number; lng: number }) : null;

  // Check if user already signed
  let hasSignedSafetyTraining = false;
  if (activeSafetyTraining) {
      const { rows: signRows } = await sql`
          SELECT id FROM safety_signatures WHERE training_id = ${activeSafetyTraining.id} AND user_id = ${user.id}
      `;
      hasSignedSafetyTraining = signRows.length > 0;
  }

  // Get recent notices
  const { getNotices } = await import('@/lib/data');
  const notices = await getNotices();
  // Filter out recent notices if they are already dismissed? 
  // For now just pass the latest one.
  const recentNotice = notices.length > 0 ? notices[0] : null;
  // I'll keep fetching it just in case, but ClientHome will handle the UI change.

  return (
    <main className={styles.main}>
      <ClientHome
        initialUsage={initialUsage}
        stats={stats}
        recentNotice={recentNotice}
        attendanceStatus={attendanceStatus}
        activeSafetyTraining={activeSafetyTraining}
        hasSignedSafetyTraining={hasSignedSafetyTraining}
        user={{
          id: user.id,
          name: user.name,
          cleaningArea: user.cleaningArea,
          role: user.role
        }}
      />
    </main>
  );
}

