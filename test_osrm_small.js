const fs = require('fs');
const https = require('https');

const data = JSON.parse(fs.readFileSync('out.json', 'utf8'));
const pathRaw = JSON.parse(data.path_data);
const allCoords = pathRaw.map(p => [p[1], p[0]]);

async function fetchMatch(coords) {
    return new Promise((resolve, reject) => {
        const cStr = coords.map(c => `${c[0]},${c[1]}`).join(';');
        const rStr = coords.map(() => '15').join(';'); // Very tight radius to prevent huge graph searches
        const url = `https://router.project-osrm.org/match/v1/foot/${cStr}?geometries=geojson&radiuses=${rStr}`;
        https.get(url, res => {
            let d = '';
            res.on('data', chunk => d+=chunk);
            res.on('end', () => resolve(JSON.parse(d)));
        }).on('error', reject);
    });
}

async function main() {
    // take every 50th point to make a sparse but broad path
    const sparse = [];
    for(let i=0; i<allCoords.length; i+=50) sparse.push(allCoords[i]);
    
    // slice 10 points
    const chunk = sparse.slice(0, 10);
    console.log("Testing 10 sparse points...");
    
    try {
        const result = await fetchMatch(chunk);
        console.log("OSRM code:", result.code);
        if (result.message) console.log("Message:", result.message);
    } catch(e) {
        console.error(e);
    }
}
main();
