const fs = require('fs');
let code = fs.readFileSync('src/app/components/CleaningMapClient.tsx', 'utf8');

// 1. Update type
code = code.replace(
    `workers?: { id: string, name: string, cleaningArea?: string }[]`,
    `workers?: { id: string, name: string, cleaningArea?: string, workplaceName?: string }[]`
);

// 2. displayArea format (around line 1378)
code = code.replace(
    `const assignedWorker = workers?.find(w => w.id === workerId);
                            const wArea = assignedWorker?.cleaningArea;
                            const zGroup = wZones[0]?.groupName;
                            const displayArea = [wArea, zGroup].filter(Boolean).join(' ') || '구역미지정';`,
    `const assignedWorker = workers?.find(w => w.id === workerId);
                            const wWorkplace = assignedWorker?.workplaceName;
                            const wArea = assignedWorker?.cleaningArea;
                            const assignedAreaString = [wWorkplace, wArea].filter(Boolean).join(' ');
                            const displayArea = assignedAreaString || wZones[0]?.groupName || '구역미지정';`
);

// 3. Admin popup format (around line 1540)
code = code.replace(
    `const wArea = workers?.find(w => w.id === zone.workerId)?.cleaningArea;
                                                                const zGroup = zone.groupName;
                                                                const combined = [wArea, zGroup].filter(Boolean).join(' ');`,
    `const assignedWorker = workers?.find(w => w.id === zone.workerId);
                                                                const wWorkplace = assignedWorker?.workplaceName;
                                                                const wArea = assignedWorker?.cleaningArea;
                                                                const assignedAreaString = [wWorkplace, wArea].filter(Boolean).join(' ');
                                                                const combined = assignedAreaString || zone.groupName;`
);

// 4. Worker popup format (around line 1576)
code = code.replace(
    `const wArea = workers?.find(w => w.id === zone.workerId)?.cleaningArea;
                                                            const zGroup = zone.groupName;
                                                            const combined = [wArea, zGroup].filter(Boolean).join(' ');`,
    `const assignedWorker = workers?.find(w => w.id === zone.workerId);
                                                            const wWorkplace = assignedWorker?.workplaceName;
                                                            const wArea = assignedWorker?.cleaningArea;
                                                            const assignedAreaString = [wWorkplace, wArea].filter(Boolean).join(' ');
                                                            const combined = assignedAreaString || zone.groupName;`
);

fs.writeFileSync('src/app/components/CleaningMapClient.tsx', code, 'utf8');
console.log("Replacement done");
