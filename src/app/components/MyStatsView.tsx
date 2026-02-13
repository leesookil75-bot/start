import styles from './my-stats.module.css';

export default function MyStatsView({ stats }: { stats: any }) {
    if (!stats) return <div style={{ color: '#888' }}>로딩 중...</div>;

    return (
        <div className={styles.grid}>
            {/* Daily Card */}
            <div className={styles.card}>
                <h2 className={styles.cardTitle}>📅 오늘 (Daily)</h2>
                <div className={styles.statRow}>
                    <div className={styles.bagItem}>
                        <div className={`${styles.bagIcon} ${styles.bag50}`}>50L</div>
                        <span className={styles.count}>{stats.daily.count50}</span>
                    </div>
                    <div className={styles.bagItem}>
                        <div className={`${styles.bagIcon} ${styles.bag75}`}>75L</div>
                        <span className={styles.count}>{stats.daily.count75}</span>
                    </div>
                </div>
            </div>

            {/* Weekly Card */}
            <div className={styles.card}>
                <h2 className={styles.cardTitle}>🗓️ 이번 주 (Weekly)</h2>
                <div className={styles.statRow}>
                    <div className={styles.bagItem}>
                        <div className={`${styles.bagIcon} ${styles.bag50}`}>50L</div>
                        <span className={styles.count}>{stats.weekly.count50}</span>
                    </div>
                    <div className={styles.bagItem}>
                        <div className={`${styles.bagIcon} ${styles.bag75}`}>75L</div>
                        <span className={styles.count}>{stats.weekly.count75}</span>
                    </div>
                </div>
            </div>

            {/* Monthly Card */}
            <div className={styles.card}>
                <h2 className={styles.cardTitle}>📊 이번 달 (Monthly)</h2>
                <div className={styles.statRow}>
                    <div className={styles.bagItem}>
                        <div className={`${styles.bagIcon} ${styles.bag50}`}>50L</div>
                        <span className={styles.count}>{stats.monthly.count50}</span>
                    </div>
                    <div className={styles.bagItem}>
                        <div className={`${styles.bagIcon} ${styles.bag75}`}>75L</div>
                        <span className={styles.count}>{stats.monthly.count75}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
