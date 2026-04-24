const fs = require('fs');

let c = fs.readFileSync('src/app/v2/home/client-home-v2.tsx', 'utf8');

c = c.replace(
    "import { recordUsage, logout } from '../../actions';", 
    "import { submitUsage, logout } from '../../actions';"
);

c = c.replace(
    "await recordUsage(actionType, position.coords.latitude, position.coords.longitude);",
    "await submitUsage(actionType, position.coords.latitude, position.coords.longitude);"
);

fs.writeFileSync('src/app/v2/home/client-home-v2.tsx', c);
console.log("Fixed submitUsage");
