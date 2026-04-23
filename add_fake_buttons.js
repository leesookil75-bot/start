const fs = require('fs');

// 1. MobileUserManagement.tsx
let m = fs.readFileSync('src/app/admin/users/MobileUserManagement.tsx', 'utf8');

m = m.replace(/user\.role === 'cleaner' && \(/g, `(user.role === 'cleaner' || user.role === 'super_admin') && (`);

m = m.replace(/onClick=\{\(\) => handleResetPassword\(user\)\}/g, `onClick={() => {
    if (user.role === 'super_admin') {
        alert("알 수 없는 오류가 발생했습니다. (보호된 계정)");
        return;
    }
    handleResetPassword(user);
}}`);

m = m.replace(/onClick=\{\(\) => handleDelete\(user\.id, user\.name\)\}/g, `onClick={() => {
    if (user.role === 'super_admin') {
        alert("알 수 없는 오류가 발생했습니다. (보호된 계정)");
        return;
    }
    handleDelete(user.id, user.name);
}}`);

fs.writeFileSync('src/app/admin/users/MobileUserManagement.tsx', m);

// 2. user-management.tsx
let u = fs.readFileSync('src/app/admin/users/user-management.tsx', 'utf8');

u = u.replace(/user\.role === 'cleaner' && \(/g, `(user.role === 'cleaner' || user.role === 'super_admin') && (`);

u = u.replace(/onClick=\{\(\) => \{\n\s*if \(confirm/g, `onClick={() => {
    if (user.role === 'super_admin') {
        alert("알 수 없는 오류가 발생했습니다. (보호된 계정)");
        return;
    }
    if (confirm`);

u = u.replace(/onClick=\{\(\) => handleDelete\(user\.id\)\}/g, `onClick={() => {
    if (user.role === 'super_admin') {
        alert("알 수 없는 오류가 발생했습니다. (보호된 계정)");
        return;
    }
    handleDelete(user.id);
}}`);

fs.writeFileSync('src/app/admin/users/user-management.tsx', u);

console.log("Added fake buttons for super_admin");
