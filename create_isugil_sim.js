const fs = require('fs');

const data = JSON.parse(fs.readFileSync('out.json', 'utf8'));
const pathRaw = JSON.parse(data.path_data);

// downsample to ~300 points for performance, but keep the real shape
const maxPoints = 300;
const step = Math.ceil(pathRaw.length / maxPoints);
const sampled = [];
for (let i = 0; i < pathRaw.length; i += step) {
    sampled.push(`[${pathRaw[i][1]}, ${pathRaw[i][0]}]`);
}
sampled.push(`[${pathRaw[pathRaw.length - 1][1]}, ${pathRaw[pathRaw.length - 1][0]}]`);

const messyCoordsString = `[\n${sampled.join(',\n')}\n]`;

const template = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>도로 스냅 보정 시뮬레이션 (이수길 데이터)</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        body, html { margin: 0; padding: 0; height: 100%; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
        #map { width: 100%; height: 100vh; }
        #overlay {
            position: absolute; top: 20px; left: 50%; transform: translateX(-50%); z-index: 1000;
            background: rgba(255, 255, 255, 0.95); padding: 20px; border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2); text-align: center; width: 85%; max-width: 400px;
        }
        h2 { margin: 0 0 10px 0; font-size: 18px; color: #1e293b; }
        p { margin: 0 0 15px 0; font-size: 13px; color: #475569; line-height: 1.4; }
        button { background: #2563eb; color: white; border: none; padding: 12px 20px; border-radius: 8px; font-size: 15px; font-weight: bold; cursor: pointer; width: 100%; }
        .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; }
        .badge-gray { background: #cbd5e1; color: #475569; }
        .badge-red { background: #fee2e2; color: #e11d48; }
    </style>
</head>
<body>
    <div id="overlay">
        <h2>✨ 이수길 작업자 리얼 데이터 시뮬레이션</h2>
        <p>지도 위의 <span class="badge badge-gray">회색 겹친 선</span>은 이수길님이 오늘 작업하신 실제 원본 궤적입니다.<br><br>아래 버튼을 누르면 AI 보정 알고리즘이 겹친 구간을 분석하여 <span class="badge badge-red">가장 뚜렷한 한 줄</span>로 펴주는 과정을 시뮬레이션합니다.</p>
        <button id="snapBtn" onclick="runMapMatching()">🚀 인공지능 도로 스냅(가상 보정) 실행!</button>
    </div>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        const messyCoords = ${messyCoordsString};
        const latLngs = messyCoords.map(c => [c[1], c[0]]);

        const map = L.map('map');
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(map);

        const originalPath = L.polyline(latLngs, { color: '#64748b', weight: 4, opacity: 0.6, dashArray: '10, 10' }).addTo(map);
        map.fitBounds(originalPath.getBounds(), { padding: [50, 50] });

        function runMapMatching() {
            const btn = document.getElementById('snapBtn');
            btn.disabled = true;
            btn.innerText = "분석 및 보정 완료!";

            // 오프라인 수학적 알고리즘으로 경로 압축 시뮬레이션 (Douglas-Peucker Simplification)
            // 실제 서비스에서는 Mapbox API를 통해 완벽한 통신 스냅샷을 가져옵니다.
            const points = latLngs.map(ll => map.latLngToLayerPoint(ll));
            // 높은 허용치를 주어 겹친 구간을 최대한 뭉뚱그려 직선으로 압축
            const simplifiedPoints = L.LineUtil.simplify(points, 20); 
            const simplifiedLatLngs = simplifiedPoints.map(p => map.layerPointToLatLng(p));

            L.polyline(simplifiedLatLngs, { color: '#e11d48', weight: 6, opacity: 1 }).addTo(map);
            originalPath.setStyle({ opacity: 0.1 });
        }
    </script>
</body>
</html>`;

fs.writeFileSync('public/simulation-isugil.html', template, 'utf8');
console.log('sim generated');
