'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '../admin.module.css';
import { logout } from '../../actions';

interface AdminSidebarProps {
    user: {
        name: string;
        cleaningArea: string;
    }
}

export default function AdminSidebar({ user }: AdminSidebarProps) {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
                <div className={styles.logo}>Clean Track <span style={{ fontSize: '0.8rem', color: '#888' }}>Admin</span></div>
                <div className={styles.sidebarUserInfo}>
                    <div className={styles.sidebarUserName}>{user.name} 님</div>
                    <div className={styles.sidebarUserArea}>관리자</div>
                </div>
            </div>

            <nav className={styles.sidebarNav}>
                <Link
                    href="/admin"
                    className={`${styles.sidebarNavItem} ${isActive('/admin') ? styles.sidebarNavActive : ''}`}
                >
                    📊 대시보드
                </Link>
                <Link
                    href="/admin/users"
                    className={`${styles.sidebarNavItem} ${isActive('/admin/users') ? styles.sidebarNavActive : ''}`}
                >
                    👥 사용자 관리
                </Link>
                <Link
                    href="/admin/notices"
                    className={`${styles.sidebarNavItem} ${isActive('/admin/notices') ? styles.sidebarNavActive : ''}`}
                >
                    📢 공지사항 관리
                </Link>
                <Link
                    href="/admin/attendance"
                    className={`${styles.sidebarNavItem} ${isActive('/admin/attendance') ? styles.sidebarNavActive : ''}`}
                >
                    🕒 출퇴근 기록
                </Link>
                <Link
                    href="/admin/workplaces"
                    className={`${styles.sidebarNavItem} ${isActive('/admin/workplaces') ? styles.sidebarNavActive : ''}`}
                >
                    🏢 근무지 관리
                </Link>

                <div className={styles.sidebarDivider} />

                <Link href="/" className={styles.sidebarNavItem}>
                    🏠 홈으로 가기
                </Link>
                <Link href="/change-password" className={styles.sidebarNavItem}>
                    🔒 비밀번호 변경
                </Link>
                <form action={logout}>
                    <button className={styles.sidebarLogoutBtn}>로그아웃</button>
                </form>
            </nav>
        </aside>
    );
}
