import { getNotices } from '@/lib/data';
import Link from 'next/link';
import styles from './notices.module.css';

export const dynamic = 'force-dynamic';

export default async function NoticesPage() {
    const notices = await getNotices();

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>공지사항</h1>
                <Link href="/" className={styles.backLink}>
                    홈으로
                </Link>
            </header>

            <div className={styles.noticeList}>
                {notices.map(notice => (
                    <article key={notice.id} className={styles.card}>
                        {notice.imageData && (
                            <div className={styles.cardImage}>
                                <img src={notice.imageData} alt={notice.title} loading="lazy" />
                            </div>
                        )}
                        <div className={styles.content}>
                            <h2 className={styles.cardTitle}>
                                {notice.isPinned && <span style={{ marginRight: '0.4rem' }}>📌</span>}
                                {notice.title}
                            </h2>
                            <time className={styles.date}>{new Date(notice.createdAt).toLocaleDateString()}</time>
                            <p className={styles.cardBody}>{notice.content}</p>
                        </div>
                    </article>
                ))}

                {notices.length === 0 && (
                    <div className={styles.empty}>
                        등록된 공지사항이 없습니다.
                    </div>
                )}
            </div>
        </div>
    );
}
