const fs = require('fs');
const https = require('https');

const html = fs.readFileSync('public/simulation-snap.html', 'utf8');
const match = html.match(/const messyCoords = \[([\s\S]*?)\];/);
if (!match) {
    console.error("Could not find messyCoords in html");
    return;
}

const rawLines = match[1].split(',\n');
const messyCoords = [];
for (let line of rawLines) {
    if (!line.trim()) continue;
    const parts = line.replace('[', '').replace(']', '').split(',');
    if (parts.length >= 2) {
        messyCoords.push([parseFloat(parts[0]), parseFloat(parts[1])]);
    }
}

const coordinatesString = messyCoords.map(c => `${c[0]},${c[1]}`).join(';');
const radiusesString = messyCoords.map(() => '50').join(';'); // increased radius to 50

const url = `https://router.project-osrm.org/match/v1/foot/${coordinatesString}?geometries=geojson&radiuses=${radiusesString}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log("Status:", json.code);
            console.log(json.message || "");
        } catch(e) {
            console.error(e);
        }
    });
});
