import { getUsers } from '@/lib/data';
import UserManagement from './user-management';
import Link from 'next/link';
import styles from './user-management.module.css';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
    const users = await getUsers();

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
            <header className={styles.header}>
                <h1 className={styles.title}>User Management</h1>
                <Link href="/admin" className={styles.backLink}>
                    &larr; Back to Dashboard
                </Link>
            </header>

            <UserManagement initialUsers={users} />
        </div>
    );
}
