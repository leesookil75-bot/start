const fs = require('fs');
const files = [
  'src/app/admin/layout.tsx',
  'src/app/admin/attendance/page.tsx',
  'src/app/admin/notices/page.tsx',
  'src/app/admin/safety-trainings/page.tsx',
  'src/app/admin/safety-trainings/[id]/print/page.tsx',
  'src/app/admin/users/page.tsx'
];

files.forEach(f => {
  try {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/user\.role !== 'admin'/g, `(user.role !== 'admin' && user.role !== 'super_admin')`);
    content = content.replace(/currentUser\.role !== 'admin'/g, `(currentUser.role !== 'admin' && currentUser.role !== 'super_admin')`);
    fs.writeFileSync(f, content);
    console.log('Updated ' + f);
  } catch(e) {
    console.log('Skipped ' + f);
  }
});
