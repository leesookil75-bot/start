const https = require('https');

const lon1 = 126.9780;
const lat1 = 37.5665;
const lon2 = 126.9810;
const lat2 = 37.5685;

const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`;

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(JSON.parse(data));
  });
});
