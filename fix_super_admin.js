const fs = require('fs');
let c = fs.readFileSync('src/app/super-admin/page.tsx', 'utf8');

c = c.replace(
    "import RoleSwitchButtons from './RoleSwitchButtons';",
    "import RoleSwitchButtons from './RoleSwitchButtons';\nimport AddAgencyButton from './AddAgencyButton';"
);

c = c.replace(
    `<button style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                        + 새 업체 등록
                    </button>`,
    `<AddAgencyButton />`
);

fs.writeFileSync('src/app/super-admin/page.tsx', c);
console.log("Updated page.tsx with AddAgencyButton");
