import { getCurrentUser } from '../actions';
import { redirect } from 'next/navigation';
import AdminSidebar from './components/AdminSidebar';
import styles from './admin.module.css';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await getCurrentUser();

    if (!user || user.role !== 'admin') {
        redirect('/login');
    }

    return (
        <div className={styles.adminLayoutContainer}>
            {/* Sidebar for Desktop */}
            <div className={styles.desktopSidebarWrapper}>
                <AdminSidebar user={user} />
            </div>

            {/* Main Content */}
            <main className={styles.mainContentWrapper}>
                {children}
            </main>
        </div>
    );
}
