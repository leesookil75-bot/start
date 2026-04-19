import { sql } from '@vercel/postgres';
import { config } from 'dotenv';
import * as turf from '@turf/turf';

config({ path: '.env.local' });

function downsampleNodes(nodes: { lat: number, lng: number }[], maxNodes: number): { lat: number, lng: number }[] {
    if (nodes.length <= maxNodes) return nodes;
    const step = (nodes.length - 1) / (maxNodes - 1);
    const sampled: typeof nodes = [];
    for (let i = 0; i < maxNodes; i++) {
        const index = Math.min(Math.round(i * step), nodes.length - 1);
        sampled.push(nodes[index]);
    }
    return sampled;
}

async function run() {
    const { rows } = await sql`
        SELECT z.*, u.name as worker_name 
        FROM cleaning_zones z
        LEFT JOIN users u ON z.worker_id = u.id
        WHERE u.name LIKE '%이수길%'
    `;
    console.log(`Found ${rows.length} total zones for 이수길`);

    let updatedCount = 0;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    if (!token) {
        console.error("No mapbox token found for migration");
        return;
    }

    for (const r of rows) {
        const path = typeof r.path === 'string' ? JSON.parse(r.path) : r.path;
        
        if (!path || !Array.isArray(path)) continue;
        
        let isPolygon = false;
        if (path.length > 0 && Array.isArray(path[0]) && Array.isArray(path[0][0])) {
            isPolygon = true;
        }

        if (!isPolygon) {
            console.log(`Migrating zone ID: ${r.id}`);
            
            // Convert tuple to lat/lng object
            const nodes = path.map((p: any) => ({ lat: p[0], lng: p[1] }));
            const sampledNodes = downsampleNodes(nodes, 80);
            const coordsString = sampledNodes.map((n: any) => `${n.lng},${n.lat}`).join(';');
            const radiuses = sampledNodes.map(() => '20').join(';');
            
            const url = `https://api.mapbox.com/matching/v5/mapbox/walking/${coordsString}?radiuses=${radiuses}&geometries=geojson&steps=false&access_token=${token}`;
            
            try {
                const res = await fetch(url);
                const data = await res.json();
                
                if (data.code === 'Ok' && data.matchings && data.matchings.length > 0) {
                    const matchedCoords = data.matchings[0].geometry.coordinates; // [lng, lat][]
                    const lineString = turf.lineString(matchedCoords);
                    const buffered = turf.buffer(lineString, 3, { units: 'meters' }); // 3m radius
                    
                    if (buffered && buffered.geometry && buffered.geometry.type === 'Polygon') {
                        // Polygon coordinates are [[[lng, lat], ...]]
                        const polyCoords = buffered.geometry.coordinates[0].map(c => [c[1], c[0]]); // Leaflet uses [lat, lng]
                        const finalPath = [polyCoords]; // Wrap once for single polygon layer
                        
                        await sql`UPDATE cleaning_zones SET path = ${JSON.stringify(finalPath)} WHERE id = ${r.id}`;
                        console.log(`Successfully migrated ${r.id} to polygon!`);
                        updatedCount++;
                    }
                } else {
                    console.error(`Mapbox API failed for ${r.id}:`, data.message || data.code);
                }
            } catch (e: any) {
                console.error(`Error processing ${r.id}:`, e.message);
            }
            
            // Prevent hitting rate limits
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    console.log(`Migration complete! Successfully converted ${updatedCount} zones to Mapbox polygons.`);
}

run();
