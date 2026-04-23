const fs = require('fs');

const fixFile = (path) => {
    try {
        let content = fs.readFileSync(path, 'utf8');
        content = content.replace(/currentUser\.role !== 'admin'/g, `(currentUser.role !== 'admin' && currentUser.role !== 'super_admin')`);
        content = content.replace(/user\.role !== 'admin'/g, `(user.role !== 'admin' && user.role !== 'super_admin')`);
        fs.writeFileSync(path, content);
        console.log('Fixed ' + path);
    } catch (e) {
        console.log('Skipped ' + path);
    }
};

fixFile('src/app/actions.ts');
fixFile('src/app/vacations/actions.ts');
