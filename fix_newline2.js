const fs = require('fs');

const fixFile = (path) => {
    let content = fs.readFileSync(path, 'utf8');
    content = content.replace(/\\n/g, '\n');
    fs.writeFileSync(path, content);
};

fixFile('src/app/admin/dashboard-client.tsx');
fixFile('src/app/admin/components/MobileAdminHome.tsx');
