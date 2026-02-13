import styles from './page.module.css';
import { recordUsage, getCurrentUser, logout, getTodayUserUsage, getMyStats } from './actions';
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

  // Get recent notices
  const { getNotices } = await import('@/lib/data');
  const notices = await getNotices();
  const recentNotice = notices.length > 0 ? notices[0] : null;

  return (
    <main className={styles.main}>
      <ClientHome
        initialUsage={initialUsage}
        stats={stats}
        recentNotice={recentNotice}
        user={{
          name: user.name,
          cleaningArea: user.cleaningArea,
          role: user.role
        }}
      />
    </main>
  );
}

