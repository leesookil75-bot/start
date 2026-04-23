const fs = require('fs');

// 1. Update AdminDashboardClient
let c1 = fs.readFileSync('src/app/admin/dashboard-client.tsx', 'utf8');
c1 = c1.replace('agencyName }: DashboardClientProps', 'agencyName, userRole }: DashboardClientProps');
const buttonStr = `
                    {userRole === 'super_admin' && (
                        <button 
                            onClick={() => {
                                document.cookie = "view_mode=super_admin; path=/";
                                window.location.href = '/super-admin?v=' + Date.now();
                            }} 
                            className={styles.backLink} 
                            style={{ background: '#e2e8f0', color: '#333', border: 'none', cursor: 'pointer' }}
                        >
                            👑 마스터 대시보드
                        </button>
                    )}
                    <button 
                        onClick={async () => {`;
c1 = c1.replace(`<button \n                        onClick={async () => {`, buttonStr);
fs.writeFileSync('src/app/admin/dashboard-client.tsx', c1);

// 2. Update MobileAdminHome
let c2 = fs.readFileSync('src/app/admin/components/MobileAdminHome.tsx', 'utf8');
c2 = c2.replace('agencyName, onLogout }: MobileAdminHomeProps', 'agencyName, userRole, onLogout }: MobileAdminHomeProps');
const mobileButtonStr = `
                            {userRole === 'super_admin' && (
                                <button onClick={() => {
                                    document.cookie = "view_mode=super_admin; path=/";
                                    window.location.href = '/super-admin?v=' + Date.now();
                                }} style={{ width: '100%', padding: '1rem', background: '#e2e8f0', color: '#333', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                                    👑 마스터 대시보드로 복귀
                                </button>
                            )}
                            <button onClick={async () => {`;
c2 = c2.replace(`<button onClick={async () => {`, mobileButtonStr);
fs.writeFileSync('src/app/admin/components/MobileAdminHome.tsx', c2);
