const fs = require('fs');
let content = fs.readFileSync('src/app/client-home.tsx', 'utf8');
const search = 'document.cookie = "clean-track-user-id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";';
const replace = 'document.cookie = "clean-track-user-id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";\n                                document.cookie = "view_mode=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";';
content = content.split(search).join(replace);
fs.writeFileSync('src/app/client-home.tsx', content);

let adminContent = fs.readFileSync('src/app/admin/dashboard-client.tsx', 'utf8');
adminContent = adminContent.split(search).join(replace);
fs.writeFileSync('src/app/admin/dashboard-client.tsx', adminContent);
