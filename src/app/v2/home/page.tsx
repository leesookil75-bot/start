import { redirect } from 'next/navigation';
import ClientHomeV2 from './client-home-v2';

export default async function PreviewHome() {
  const { getCurrentUser, getTodayUserUsage, getMyStats, getMyDailyAttendanceStatus } = await import('@/app/actions');
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const viewMode = cookieStore.get('view_mode')?.value;

  // We don't force redirect admins here, let them preview it
  // if (user.role === 'admin' && viewMode !== 'worker') { ... }

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
  const recentNotice = notices.length > 0 ? notices[0] : null;

  return (
    <>
      <ClientHomeV2
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
    </>
  );
}
