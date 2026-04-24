const fs = require('fs');

const dummyNames = "u.name !== '최고관리자' && u.name !== '관리자1' && u.name !== '간이환경 관리자'";

// MobileAttendance.tsx
let m = fs.readFileSync('src/app/admin/attendance/MobileAttendance.tsx', 'utf8');
m = m.replace(
    "const filteredUsers = selectedWorkplace ? data.users.filter(u => u.workplaceId === selectedWorkplace) : data.users;",
    `const displayUsers = data.users.filter(u => ${dummyNames});\n    const filteredUsers = selectedWorkplace ? displayUsers.filter(u => u.workplaceId === selectedWorkplace) : displayUsers;`
);
fs.writeFileSync('src/app/admin/attendance/MobileAttendance.tsx', m);

// attendance-matrix.tsx
let p = fs.readFileSync('src/app/admin/attendance/attendance-matrix.tsx', 'utf8');
p = p.replace(
    "const usersToExport = selectedWorkplace ? data.users.filter(u => u.workplaceId === selectedWorkplace) : data.users;",
    `const displayUsers = data.users.filter(u => ${dummyNames});\n        const usersToExport = selectedWorkplace ? displayUsers.filter(u => u.workplaceId === selectedWorkplace) : displayUsers;`
);
p = p.replace(
    "{(selectedWorkplace ? data.users.filter(u => u.workplaceId === selectedWorkplace) : data.users).map(user => {",
    `{((selectedWorkplace ? data.users.filter(u => u.workplaceId === selectedWorkplace) : data.users).filter(u => ${dummyNames})).map(user => {`
);
fs.writeFileSync('src/app/admin/attendance/attendance-matrix.tsx', p);
console.log("Fixed display of users in attendance components.");
