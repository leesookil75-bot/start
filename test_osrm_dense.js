const fs = require('fs');
const https = require('https');

const data = JSON.parse(fs.readFileSync('out.json', 'utf8'));
const pathRaw = JSON.parse(data.path_data);
const allCoords = pathRaw.map(p => [p[1], p[0]]);

async function fetchMatch(coords) {
    return new Promise((resolve, reject) => {
        const cStr = coords.map(c => `${c[0]},${c[1]}`).join(';');
        const rStr = coords.map(() => '30').join(';');
        const url = `https://router.project-osrm.org/match/v1/foot/${cStr}?geometries=geojson&radiuses=${rStr}`;
        https.get(url, res => {
            let d = '';
            res.on('data', chunk => d+=chunk);
            res.on('end', () => resolve(JSON.parse(d)));
        }).on('error', reject);
    });
}

async function main() {
    const chunk = allCoords.slice(0, 50); // first 50 dense points
    console.log("Testing 50 dense points...");
    
    try {
        const result = await fetchMatch(chunk);
        if (result.code === 'Ok') {
            console.log("OSRM SUCCESS! Matched coordinates:", result.matchings[0].geometry.coordinates.length);
        } else {
            console.log("OSRM FAILED:", result);
        }
    } catch(e) {
        console.error(e);
    }
}
main();
