const fs = require('fs');

// 1. page.tsx
let p = fs.readFileSync('src/app/admin/users/page.tsx', 'utf8');
p = p.replace('const users = await getUsers(currentUser.agencyId);', 
`const allUsers = await getUsers(currentUser.agencyId);
    const users = currentUser.role === 'super_admin' ? allUsers : allUsers.filter(u => u.role !== 'super_admin');`);
fs.writeFileSync('src/app/admin/users/page.tsx', p);

// 2. MobileUserManagement.tsx
let m = fs.readFileSync('src/app/admin/users/MobileUserManagement.tsx', 'utf8');
m = m.replace(/user\.role === 'admin' \? '#7c4dff' : '#444'/g, `user.role === 'super_admin' ? '#eab308' : user.role === 'admin' ? '#7c4dff' : '#444'`);
m = m.replace(/user\.role === 'admin' \? '관리자' : '청소부'/g, `user.role === 'super_admin' ? '최고관리자' : user.role === 'admin' ? '관리자' : '청소부'`);
m = m.replace(/user\.role !== 'admin' && \(/g, `user.role === 'cleaner' && (`);
fs.writeFileSync('src/app/admin/users/MobileUserManagement.tsx', m);

// 3. user-management.tsx
let u = fs.readFileSync('src/app/admin/users/user-management.tsx', 'utf8');
u = u.replace(/user\.role === 'admin' \? '#7c4dff' : '#444'/g, `user.role === 'super_admin' ? '#eab308' : user.role === 'admin' ? '#7c4dff' : '#444'`);
u = u.replace(/user\.role === 'admin' \? '관리자' : '청소부'/g, `user.role === 'super_admin' ? '최고관리자' : user.role === 'admin' ? '관리자' : '청소부'`);
u = u.replace(/user\.role !== 'admin' && \(/g, `user.role === 'cleaner' && (`);
fs.writeFileSync('src/app/admin/users/user-management.tsx', u);

console.log("Updated files");
