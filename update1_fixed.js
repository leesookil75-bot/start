const fs = require('fs');
let code = fs.readFileSync('src/app/components/CleaningMapClient.tsx', 'utf8');

// 1. MapClickHandler
code = code.replace(
    'function MapZoomTracker({ onZoomChange }: { onZoomChange: (z: number) => void }) {',
    `function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {\n    useMapEvents({\n        click: () => onMapClick()\n    });\n    return null;\n}\n\n// Track zoom level dynamically\nfunction MapZoomTracker({ onZoomChange }: { onZoomChange: (z: number) => void }) {`
);

// 2. Add state
code = code.replace(
    `const [focusedGroup, setFocusedGroup] = useState<string | null>(null);`,
    `const [focusedGroup, setFocusedGroup] = useState<string | null>(null);\n    const [focusedTerritoryId, setFocusedTerritoryId] = useState<string | null>(null);`
);

// 3. Add component instance
code = code.replace(
    `<MapZoomTracker onZoomChange={setCurrentZoom} />`,
    `<MapZoomTracker onZoomChange={setCurrentZoom} />\n                    <MapClickHandler onMapClick={() => setFocusedTerritoryId(null)} />`
);

fs.writeFileSync('src/app/components/CleaningMapClient.tsx', code, 'utf8');
console.log("update1 done");
