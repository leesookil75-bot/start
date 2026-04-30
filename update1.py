import json

with open("src/app/components/CleaningMapClient.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# 1. MapZoomTracker -> Add MapClickHandler
start1 = -1
for i, line in enumerate(lines):
    if "function MapZoomTracker" in line:
        start1 = i
        break

if start1 != -1:
    lines.insert(start1 + 6, """
function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
    useMapEvents({
        click: () => onMapClick()
    });
    return null;
}
""")

# 2. Add state
start2 = -1
for i, line in enumerate(lines):
    if "const [focusedGroup, setFocusedGroup]" in line:
        start2 = i
        break

if start2 != -1:
    lines.insert(start2 + 1, "    const [focusedTerritoryId, setFocusedTerritoryId] = useState<string | null>(null);\n")

# 3. Add MapClickHandler
start3 = -1
for i, line in enumerate(lines):
    if "<MapZoomTracker onZoomChange={setCurrentZoom} />" in line:
        start3 = i
        break

if start3 != -1:
    lines.insert(start3 + 1, "                    <MapClickHandler onMapClick={() => setFocusedTerritoryId(null)} />\n")

with open("src/app/components/CleaningMapClient.tsx", "w", encoding="utf-8") as f:
    f.writelines(lines)
