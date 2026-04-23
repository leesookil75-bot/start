const fs = require('fs');
const lines = fs.readFileSync('src/app/actions.ts', 'utf8').split('\n');
lines.forEach((line, i) => {
    if (line.includes("!== 'admin'")) {
        console.log((i + 1) + ": " + line);
    }
});
