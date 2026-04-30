const fs = require('fs');

let lines = fs.readFileSync('src/app/components/CleaningMapClient.tsx', 'utf8').split('\n');

// 1. Add MapZoomTracker -> Add MapClickHandler
const start1 = lines.findIndex(line => line.includes('function MapZoomTracker'));
if (start1 !== -1) {
    lines.splice(start1 + 6, 0, 
`function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
    useMapEvents({
        click: () => onMapClick()
    });
    return null;
}`);
}

// 2. Add state
const start2 = lines.findIndex(line => line.includes('const [focusedGroup, setFocusedGroup]'));
if (start2 !== -1) {
    lines.splice(start2 + 1, 0, "    const [focusedTerritoryId, setFocusedTerritoryId] = useState<string | null>(null);");
}

// 3. Add MapClickHandler component instance
const start3 = lines.findIndex(line => line.includes('<MapZoomTracker onZoomChange={setCurrentZoom} />'));
if (start3 !== -1) {
    lines.splice(start3 + 1, 0, "                    <MapClickHandler onMapClick={() => setFocusedTerritoryId(null)} />");
}

fs.writeFileSync('src/app/components/CleaningMapClient.tsx', lines.join('\n'), 'utf8');
console.log("update 1 done");
