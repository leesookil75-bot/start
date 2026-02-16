import { getNotices } from '@/lib/data';
import Link from 'next/link';
import styles from '../notices.module.css';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function NoticeDetailPage({ params }: Props) {
    const { id } = await params;
    const notices = await getNotices();
    const notice = notices.find(n => n.id === id);

    if (!notice) {
        notFound();
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>공지사항</h1>
                <Link href="/notices" className={styles.backLink} aria-label="목록으로">
                    <ArrowLeftIcon />
                </Link>
            </header>

            <article className={styles.card}>
                {notice.imageData && (
                    <div className={styles.cardImage}>
                        <img src={notice.imageData} alt={notice.title} />
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
        </div>
    );
}
