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

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{user.name} 님</span>
          <span className={styles.userArea}>({user.cleaningArea})</span>
        </div>
        <div className={styles.headerActions}>
          <a href="/change-password" className={styles.changePasswordLink}>비밀번호 변경</a>
          <form action={logout}>
            <button className={styles.logoutButton}>Logout</button>
          </form>
        </div>
      </div>

      <ClientHome initialUsage={initialUsage} stats={stats} />

    </main>
  );
}

