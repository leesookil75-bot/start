const fs = require('fs');

let c = fs.readFileSync('src/app/v2/home/client-home-v2.tsx', 'utf8');

c = c.replace(
    "<MyStatsView />",
    "<MyStatsView stats={stats} />"
);

fs.writeFileSync('src/app/v2/home/client-home-v2.tsx', c);
console.log("Fixed stats prop");
