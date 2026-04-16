const fs = require('fs');
const https = require('https');

const data = JSON.parse(fs.readFileSync('out.json', 'utf8'));
const pathRaw = JSON.parse(data.path_data);

// pathRaw is [lat, lng]. We need [lng, lat] for OSRM
const allCoords = pathRaw.map(p => [p[1], p[0]]);

// We downsample first so it's not crazy
const maxPoints = 80;
const step = Math.ceil(allCoords.length / maxPoints);
const sampled = [];
for (let i = 0; i < allCoords.length; i += step) {
    sampled.push(allCoords[i]);
}
sampled.push(allCoords[allCoords.length - 1]);

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
    console.log("Total sampled points to match:", sampled.length);
    let matchedPath = [];
    
    // Split into chunks of 20 points
    const chunkSize = 20;
    for (let i = 0; i < sampled.length; i += chunkSize) {
        // overlap by 1 point to keep contiguous path
        const end = Math.min(i + chunkSize + 1, sampled.length);
        const chunk = sampled.slice(i, end);
        if (chunk.length < 2) continue;
        
        console.log(`Processing chunk from ${i} to ${end-1}...`);
        try {
            const result = await fetchMatch(chunk);
            if (result.code === 'Ok' && result.matchings && result.matchings.length > 0) {
                // Assuming first match is best
                const coords = result.matchings[0].geometry.coordinates;
                matchedPath.push(...coords);
            } else {
                console.log("Chunk failed:", result.code, result.message);
                // Fallback: just use raw GPS points for this chunk
                matchedPath.push(...chunk);
            }
        } catch(e) {
            console.error("Chunk error:", e);
            matchedPath.push(...chunk);
        }
        
        // respect OSRM limits
        await new Promise(r => setTimeout(r, 1000));
    }
    
    fs.writeFileSync('matched_isugil.json', JSON.stringify({
        original: allCoords,
        matched: matchedPath
    }), 'utf8');
    console.log("Done! Results saved to matched_isugil.json");
}

main();
