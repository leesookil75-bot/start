import { getMyStats } from '../actions';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function MyStatsPage() {
    const stats = await getMyStats();

    if (!stats) {
        redirect('/login');
    }

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#000',
            color: '#fff',
            padding: '2rem 1rem',
            fontFamily: 'sans-serif'
        }}>
            <header style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>내 사용량 통계</h1>
                <a href="/" style={{
                    color: '#fff',
                    textDecoration: 'none',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#333',
                    borderRadius: '6px',
                    fontSize: '0.9rem'
                }}>
                    ← 뒤로가기
                </a>
            </header>

            <div style={{ display: 'grid', gap: '1rem' }}>
                {/* Daily Card */}
                <div style={cardStyle}>
                    <h2 style={cardTitleStyle}>📅 오늘 (Daily)</h2>
                    <div style={statRowStyle}>
                        <div style={bagItemStyle}>
                            <div style={{ ...bagIconStyle, backgroundColor: '#3b82f6' }}>45L</div>
                            <span style={countStyle}>{stats.daily.count45}</span>
                        </div>
                        <div style={bagItemStyle}>
                            <div style={{ ...bagIconStyle, backgroundColor: '#eab308', color: '#000' }}>75L</div>
                            <span style={countStyle}>{stats.daily.count75}</span>
                        </div>
                    </div>
                </div>

                {/* Weekly Card */}
                <div style={cardStyle}>
                    <h2 style={cardTitleStyle}>🗓️ 이번 주 (Weekly)</h2>
                    <div style={statRowStyle}>
                        <div style={bagItemStyle}>
                            <div style={{ ...bagIconStyle, backgroundColor: '#3b82f6' }}>45L</div>
                            <span style={countStyle}>{stats.weekly.count45}</span>
                        </div>
                        <div style={bagItemStyle}>
                            <div style={{ ...bagIconStyle, backgroundColor: '#eab308', color: '#000' }}>75L</div>
                            <span style={countStyle}>{stats.weekly.count75}</span>
                        </div>
                    </div>
                </div>

                {/* Monthly Card */}
                <div style={cardStyle}>
                    <h2 style={cardTitleStyle}>📊 이번 달 (Monthly)</h2>
                    <div style={statRowStyle}>
                        <div style={bagItemStyle}>
                            <div style={{ ...bagIconStyle, backgroundColor: '#3b82f6' }}>45L</div>
                            <span style={countStyle}>{stats.monthly.count45}</span>
                        </div>
                        <div style={bagItemStyle}>
                            <div style={{ ...bagIconStyle, backgroundColor: '#eab308', color: '#000' }}>75L</div>
                            <span style={countStyle}>{stats.monthly.count75}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const cardStyle = {
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    padding: '1.5rem',
    border: '1px solid #333'
};

const cardTitleStyle = {
    fontSize: '1.1rem',
    marginBottom: '1rem',
    color: '#888'
};

const statRowStyle = {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center'
};

const bagItemStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.5rem'
};

const bagIconStyle = {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '1rem',
    color: '#fff'
};

const countStyle = {
    fontSize: '1.5rem',
    fontWeight: 'bold'
};
