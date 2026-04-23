const fs = require('fs');
let c = fs.readFileSync('src/app/admin/page.tsx', 'utf8');
c = c.replace('agencyName={agencyName}\\n                    userRole={user.role}', 'agencyName={agencyName}\n                    userRole={user.role}');
fs.writeFileSync('src/app/admin/page.tsx', c);
