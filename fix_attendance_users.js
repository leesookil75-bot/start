const fs = require('fs');

let c = fs.readFileSync('src/app/actions.ts', 'utf8');

c = c.replace(/const users = await getUsers\(\);/g, 
    "let users = await getUsers();\n    users = users.filter(u => u.name !== '최고관리자' && u.name !== '관리자1' && u.name !== '간이환경 관리자');"
);

fs.writeFileSync('src/app/actions.ts', c);
console.log("Fixed all getUsers in actions.ts");
