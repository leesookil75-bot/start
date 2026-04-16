const fs = require('fs');

const data = JSON.parse(fs.readFileSync('out.json', 'utf8'));
const pathRaw = JSON.parse(data.path_data);

const maxPoints = 15;
const step = Math.ceil(pathRaw.length / maxPoints);

const sampled = [];
for (let i = 0; i < pathRaw.length; i += step) {
    sampled.push(`            [${pathRaw[i][1]}, ${pathRaw[i][0]}]`);
}
sampled.push(`            [${pathRaw[pathRaw.length - 1][1]}, ${pathRaw[pathRaw.length - 1][0]}]`);

const messyCoordsString = `        const messyCoords = [\n${sampled.join(',\n')}\n        ];`;

let html = fs.readFileSync('public/simulation-snap.html', 'utf8');
html = html.replace(/const messyCoords = \[[\s\S]*?\];/, messyCoordsString);
    // 반경 50으로 증가된 버전 주입 포함
    html = html.replace(/const radiusesString = messyCoords.map\(\(\) => '20'\).join\(';'\);/g, "const radiusesString = messyCoords.map(() => '50').join(';');");
    fs.writeFileSync('public/simulation-snap.html', html, 'utf8');
console.log('HTML updated again!');
