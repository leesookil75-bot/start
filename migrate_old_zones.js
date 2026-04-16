require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');
const https = require('https');

// Pure JS Douglas-Peucker simplification
function getSqDist(p1, p2) {
    var dx = p1.x - p2.x, dy = p1.y - p2.y;
    return dx * dx + dy * dy;
}
function getSqSegDist(p, p1, p2) {
    var x = p1.x, y = p1.y, dx = p2.x - x, dy = p2.y - y;
    if (dx !== 0 || dy !== 0) {
        var t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
        if (t > 1) { x = p2.x; y = p2.y; }
        else if (t > 0) { x += dx * t; y += dy * t; }
    }
    dx = p.x - x; dy = p.y - y;
    return dx * dx + dy * dy;
}
function simplifyDPStep(points, first, last, sqTolerance, simplified) {
    var maxSqDist = sqTolerance, index;
    for (var i = first + 1; i < last; i++) {
        var sqDist = getSqSegDist(points[i], points[first], points[last]);
        if (sqDist > maxSqDist) { index = i; maxSqDist = sqDist; }
    }
    if (maxSqDist > sqTolerance) {
        if (index - first > 1) simplifyDPStep(points, first, index, sqTolerance, simplified);
        simplified.push(points[index]);
        if (last - index > 1) simplifyDPStep(points, index, last, sqTolerance, simplified);
    }
}
function simplify(points, tolerance) {
    if (points.length <= 2) return points;
    var sqTolerance = tolerance !== undefined ? tolerance * tolerance : 1;
    var simplified = [points[0]];
    simplifyDPStep(points, 0, points.length - 1, sqTolerance, simplified);
    simplified.push(points[points.length - 1]);
    return simplified;
}
function downsampleNodes(nodes, maxNodes = 25) {
    if (nodes.length <= maxNodes) return nodes;
    const step = nodes.length / maxNodes;
    const sampled = [];
    for (let i = 0; i < maxNodes; i++) sampled.push(nodes[Math.floor(i * step)]);
    if (sampled[sampled.length - 1] !== nodes[nodes.length - 1]) sampled[sampled.length - 1] = nodes[nodes.length - 1];
    return sampled;
}

async function fetchMatch(coords) {
    return new Promise((resolve, reject) => {
        const cStr = coords.map(c => `${c.lng},${c.lat}`).join(';');
        const rStr = coords.map(() => '30').join(';');
        const url = `https://router.project-osrm.org/match/v1/foot/${cStr}?overview=full&geometries=geojson&radiuses=${rStr}&tidy=true`;
        https.get(url, res => {
            let d = '';
            res.on('data', chunk => d+=chunk);
            res.on('end', () => resolve(JSON.parse(d)));
        }).on('error', reject);
    });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
    try {
        console.log("Fetching all zones...");
        const result = await sql`SELECT * FROM cleaning_zones ORDER BY created_at ASC`;
        const zones = result.rows;
        console.log(`Found ${zones.length} zones in database.`);

        let updatedCount = 0;

        for (let i = 0; i < zones.length; i++) {
            const z = zones[i];
            const rawPath = JSON.parse(z.path_data || "[]");
            
            // Check if already snapped or too small (no need to fix if < 30 points)
            if (rawPath.length < 30) {
                console.log(`Zone [${z.group_name}] skipped: already clean or too short (${rawPath.length} points)`);
                continue;
            }

            console.log(`Zone [${z.group_name}] processing: original ${rawPath.length} points...`);
            
            // rawPath has [lat, lng]. Convert to {x: lng, y: lat} for DP
            const pts = rawPath.map(p => ({ x: p[1], y: p[0] }));
            const simpl = simplify(pts, 0.0003); // match frontend tolerance
            let coreNodes = simpl.map(p => ({ lng: p.x, lat: p.y }));
            
            if (coreNodes.length > 25) {
                coreNodes = downsampleNodes(coreNodes, 25);
            }

            console.log(`    -> Compressed to ${coreNodes.length} core nodes.`);

            // Try Map Matching
            const matchRes = await fetchMatch(coreNodes);
            let finalCoords = [];
            
            if (matchRes.code === 'Ok' && matchRes.matchings && matchRes.matchings.length > 0) {
                const combined = matchRes.matchings.flatMap(m => m.geometry.coordinates);
                finalCoords = combined.map(c => [c[1], c[0]]); // back to [lat, lng]
                console.log(`    -> OSRM Match SUCCESS: extracted ${finalCoords.length} snappped points!`);
            } else {
                console.log(`    -> OSRM Match FAILED (${matchRes.code}), falling back to simplified nodes.`);
                finalCoords = coreNodes.map(n => [n.lat, n.lng]);
            }

            // Update database
            const jsonStr = JSON.stringify(finalCoords);
            await sql`UPDATE cleaning_zones SET path_data = ${jsonStr} WHERE id = ${z.id}`;
            updatedCount++;
            console.log(`✓ Zone ${z.id} updated successfully in DB.\n`);

            // respect rate limit
            await sleep(1500); 
        }

        console.log(`\n🎉 Migration Complete! Successfully cleaned up ${updatedCount} old zones.`);
    } catch (e) {
        console.error("Migration Fatal Error:", e);
    }
}
main();
