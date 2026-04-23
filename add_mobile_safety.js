const fs = require('fs');
let c = fs.readFileSync('src/app/admin/components/MobileAdminHome.tsx', 'utf8');

const safetyTrainingLink = `
                <Link href="/admin/safety-trainings" style={{ textDecoration: 'none' }}>
                    <div style={{ background: '#1e1e1e', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', aspectRatio: '1', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🦺</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff' }}>안전교육 관리</div>
                    </div>
                </Link>
`;

c = c.replace('            <div style={{ display: \'grid\', gridTemplateColumns: \'1fr 1fr\', gap: \'1rem\' }}>', '            <div style={{ display: \'grid\', gridTemplateColumns: \'1fr 1fr\', gap: \'1rem\' }}>' + safetyTrainingLink);

fs.writeFileSync('src/app/admin/components/MobileAdminHome.tsx', c);
