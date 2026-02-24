import { getUsers, getWorkplaces } from '@/lib/data';
import { getCurrentUser } from '../../actions';
import { redirect } from 'next/navigation';
import UserManagement from './user-management';
import MobileUserManagement from './MobileUserManagement';
import Link from 'next/link';
import styles from './user-management.module.css';
import adminStyles from '../admin.module.css';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        redirect('/login');
    }

    const users = await getUsers();
    const workplaces = await getWorkplaces();

    return (
        <>
            {/* Mobile View */}
            <div className={adminStyles.mobileOnlyWrapper}>
                <MobileUserManagement initialUsers={users} workplaces={workplaces} />
            </div>

            {/* PC View */}
            <div className={`${adminStyles.pcOnlyWrapper}`} style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
                <header className={styles.header}>
                    <h1 className={styles.title}>사용자 관리</h1>
                    <Link href="/admin" className={styles.backLink}>
                        &larr; 대시보드로 돌아가기
                    </Link>
                </header>

                <UserManagement initialUsers={users} workplaces={workplaces} />
            </div>
        </>
    );
}
