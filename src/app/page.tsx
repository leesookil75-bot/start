import styles from './page.module.css';
import { recordUsage, getCurrentUser, logout, getTodayUserUsage } from './actions';
import { redirect } from 'next/navigation';

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

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{user.name} 님</span>
          <span className={styles.userArea}>({user.cleaningArea})</span>
        </div>
        <form action={logout}>
          <button className={styles.logoutButton}>Logout</button>
        </form>
      </div>

      <ClientHome initialUsage={initialUsage} />

    </main>
  );
}

// Client component for interactivity
import ClientHome from './client-home';

