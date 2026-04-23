import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c * 1000; // Distance in m
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI/180);
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { training_id, user_id, signature_data, lat, lng } = body;
        
        // 1. Fetch training to get target coordinates
        const { rows: trainingRows } = await sql`
            SELECT lat, lng FROM safety_trainings WHERE id = ${training_id}
        `;
        
        if (trainingRows.length === 0) {
            return NextResponse.json({ success: false, error: 'Training not found' }, { status: 404 });
        }
        
        const targetLat = trainingRows[0].lat;
        const targetLng = trainingRows[0].lng;
        
        // 2. Calculate distance
        let distance_m = null;
        if (lat !== null && lng !== null && targetLat !== null && targetLng !== null) {
             distance_m = Math.round(getDistanceFromLatLonInM(lat, lng, targetLat, targetLng));
             
             // Geo-fencing logic: Reject if > 100m
             if (distance_m > 100) {
                 return NextResponse.json({ success: false, error: '교육 장소와 너무 멉니다. (100m 이내에서 서명 가능)' }, { status: 403 });
             }
        }
        
        const id = crypto.randomUUID();

        await sql`
            INSERT INTO safety_signatures (id, training_id, user_id, signature_data, lat, lng, distance_m)
            VALUES (${id}, ${training_id}, ${user_id}, ${signature_data}, ${lat}, ${lng}, ${distance_m})
        `;

        return NextResponse.json({ success: true, id });
    } catch (e: any) {
        console.error('Failed to submit safety signature:', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
