const fs = require('fs');
let code = fs.readFileSync('src/app/components/CleaningMapClient.tsx', 'utf8');

code = code.split(".join(' ')").join(".join('')");

fs.writeFileSync('src/app/components/CleaningMapClient.tsx', code, 'utf8');
console.log("Replaced join(' ') with join('') in CleaningMapClient.tsx");
