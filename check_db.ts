import { sql } from '@vercel/postgres';
import { config } from 'dotenv';
config({ path: '.env.local' });
async function run() {
    const { rows } = await sql`SELECT id, path, worker_name, group_name FROM zones WHERE worker_name LIKE '%이수길%'`;
    console.log(`Found ${rows.length} zones for 이수길`);
    let badCount = 0;
    for (const r of rows) {
        let isPolygon = false;
        if (r.path.length > 0 && Array.isArray(r.path[0][0])) {
            isPolygon = true;
        }
        if (!isPolygon) badCount++;
    }
    console.log(`Of those, ${badCount} are old format (Polylines instead of Polygons)`);
}
run();
