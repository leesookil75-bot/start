const fs = require('fs');
let code = fs.readFileSync('src/app/components/CleaningMapClient.tsx', 'utf8');

// 1. Add MapZoomTracker / MapClickHandler
code = code.replace(
`function MapZoomTracker({ onZoomChange }: { onZoomChange: (z: number) => void }) {
    useMapEvents({
        zoomend: (e) => onZoomChange(e.target.getZoom())
    });
    return null;
}`,
`function MapZoomTracker({ onZoomChange }: { onZoomChange: (z: number) => void }) {
    useMapEvents({
        zoomend: (e) => onZoomChange(e.target.getZoom())
    });
    return null;
}

function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
    useMapEvents({
        click: () => onMapClick()
    });
    return null;
}`
);

// 2. Add state
code = code.replace(
`    const [focusedGroup, setFocusedGroup] = useState<string | null>(null);`,
`    const [focusedGroup, setFocusedGroup] = useState<string | null>(null);
    const [focusedTerritoryId, setFocusedTerritoryId] = useState<string | null>(null);`
);

// 3. Map container
code = code.replace(
`                    <MapBoundsFitter zones={visibleZones} issues={issues} />
                    <MapZoomTracker onZoomChange={setCurrentZoom} />`,
`                    <MapBoundsFitter zones={visibleZones} issues={issues} />
                    <MapZoomTracker onZoomChange={setCurrentZoom} />
                    <MapClickHandler onMapClick={() => setFocusedTerritoryId(null)} />`
);

// 4. Territory block start
const startString = `                    {/* Territories (Convex Hulls) */}`;
const endString = `                                        </Polyline>
                                    );
                                })}`;

const startIdx = code.indexOf(startString);
const endIdx = code.indexOf(endString) + endString.length;

if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
    const replacement = `                    {/* Territories and Zones */}
                    {(() => {
                        const workerZones = new Map<string, Zone[]>();
                        visibleZones.forEach(z => {
                            if (!workerZones.has(z.workerId)) workerZones.set(z.workerId, []);
                            workerZones.get(z.workerId)!.push(z);
                        });

                        const territories: any[] = [];
                        const workerFeatures = new Map<string, any>();

                        Array.from(workerZones.entries()).forEach(([workerId, wZones]) => {
                            const assignedWorker = workers?.find(w => w.id === workerId);
                            const displayArea = assignedWorker?.cleaningArea || wZones[0]?.groupName || '구역미지정';
                            const name = assignedWorker?.name || wZones[0]?.workerName;

                            const bufferedPolys: any[] = [];
                            wZones.forEach(z => {
                                try {
                                    const pts = getZonePoints(z.path).map((pt: any) => [pt[1], pt[0]]);
                                    if (pts.length >= 2) {
                                        let feature;
                                        const isPoly = z.path.length > 0 && Array.isArray(z.path[0][0]);
                                        if (isPoly) {
                                            if (pts[0][0] !== pts[pts.length-1][0] || pts[0][1] !== pts[pts.length-1][1]) {
                                                pts.push([...pts[0]]);
                                            }
                                            if (pts.length >= 4) {
                                                feature = turf.polygon([pts]);
                                            }
                                        } else {
                                            feature = turf.lineString(pts);
                                        }
                                        
                                        if (feature) {
                                            const buf = turf.buffer(feature, 20, { units: 'meters' });
                                            if (buf) bufferedPolys.push(buf);
                                        }
                                    }
                                } catch(e) {}
                            });

                            if (bufferedPolys.length > 0) {
                                try {
                                    let merged: any = null;
                                    try {
                                        merged = turf.union(turf.featureCollection(bufferedPolys));
                                    } catch(e) {
                                        merged = bufferedPolys.reduce((acc, curr) => turf.union(acc, curr) || acc);
                                    }
                                    
                                    if (merged) {
                                        workerFeatures.set(workerId, { merged, name, displayArea });
                                    }
                                } catch (e) {
                                    console.error("Union failed", e);
                                }
                            }
                        });

                        // 공간 인지 배색 (Spatial Graph Coloring)
                        const colorAssignments = new Map<string, string>();
                        const workerIds = Array.from(workerFeatures.keys());
                        
                        workerIds.forEach((id, idx) => {
                            const featureInfo = workerFeatures.get(id)!;
                            const usedNeighborsColors = new Set<string>();

                            workerIds.forEach(otherId => {
                                if (id !== otherId) {
                                    const otherFeature = workerFeatures.get(otherId)!;
                                    try {
                                        if (turf.booleanIntersects(featureInfo.merged, otherFeature.merged)) {
                                            if (colorAssignments.has(otherId)) {
                                                usedNeighborsColors.add(colorAssignments.get(otherId)!);
                                            }
                                        }
                                    } catch(e) {}
                                }
                            });

                            let assignedColor = WORKER_COLORS.find(c => !usedNeighborsColors.has(c));
                            if (!assignedColor) {
                                assignedColor = WORKER_COLORS[idx % WORKER_COLORS.length]; // Fallback
                            }
                            colorAssignments.set(id, assignedColor);
                            
                            const leafletCoords = extractLeafletCoordsFromBuffer(featureInfo.merged, []);
                            territories.push({ id: 'terr_' + id, workerId: id, coords: leafletCoords, color: assignedColor, name: featureInfo.name, displayArea: featureInfo.displayArea });
                        });

                        return (
                            <>
                                {territories.map(t => {
                                    const isFocused = focusedTerritoryId === t.workerId;
                                    const isDimmed = focusedTerritoryId !== null && !isFocused;
                                    
                                    return (
                                        <Polygon 
                                            key={t.id} 
                                            positions={t.coords} 
                                            pathOptions={{ 
                                                color: t.color, 
                                                fillColor: t.color, 
                                                fillOpacity: isFocused ? 0.3 : (isDimmed ? 0.05 : 0.15), 
                                                weight: isFocused ? 4 : (isDimmed ? 1 : 2), 
                                                dashArray: '8, 8', 
                                                interactive: true,
                                                className: isFocused ? 'animate-pulse' : 'transition-opacity duration-500'
                                            }}
                                            eventHandlers={{
                                                click: (e) => {
                                                    L.DomEvent.stopPropagation(e.originalEvent);
                                                    setFocusedTerritoryId(t.workerId);
                                                }
                                            }}
                                        >
                                            {currentZoom >= 14 && (
                                                <Tooltip permanent direction="center" className={\`bg-white/95 border-2 shadow-xl text-slate-800 text-xs sm:text-sm px-3 py-2 rounded-2xl backdrop-blur-md z-[1000] transition-opacity duration-300 \${isDimmed ? 'opacity-30' : 'opacity-100'}\`} opacity={1} interactive={true}>
                                                    <div className="text-center leading-tight min-w-[80px]" onClick={(e) => { e.stopPropagation(); setFocusedTerritoryId(t.workerId); }}>
                                                        <span style={{color: t.color}} className="text-base sm:text-lg font-black drop-shadow-sm">{t.name}</span><br/>
                                                        <span className="text-[11px] sm:text-xs text-slate-600 font-bold mt-1 inline-block">{t.displayArea}</span>
                                                    </div>
                                                </Tooltip>
                                            )}
                                        </Polygon>
                                    );
                                })}

                                {visibleZones.map((zone) => {
                                    const isDone = zone.isCleaned;
                                    const isFocusedGroup = focusedGroup === zone.groupName;
                                    
                                    let color = colorAssignments.get(zone.workerId) || WORKER_COLORS[0]; 
                                    
                                    let weightAtZoom18 = typeof window !== 'undefined' && window.innerWidth > 600 ? 5 : 6;
                                    
                                    let lineOpacity = isDone ? 1.0 : 0.4;
                                    let dashArray = isDone ? undefined : '5, 8';
                                    let weightMultiplier = isDone ? 1.2 : 0.8;
                                    let fillOpacity = isDone ? 0.7 : 0.2;
                                    
                                    if (isFocusedGroup) {
                                        color = '#facc15'; 
                                        weightAtZoom18 = 10;
                                        lineOpacity = 1.0;
                                        weightMultiplier = 1.5;
                                        dashArray = undefined;
                                    }

                                    const isTerritoryFocused = focusedTerritoryId === zone.workerId;
                                    const isTerritoryDimmed = focusedTerritoryId !== null && !isTerritoryFocused;

                                    if (isTerritoryFocused) {
                                        lineOpacity = 1.0;
                                        weightMultiplier = isDone ? 1.5 : 1.0;
                                    } else if (isTerritoryDimmed) {
                                        lineOpacity = isDone ? 0.2 : 0.1;
                                        fillOpacity = 0.05;
                                    }

                                    const dynamicWeight = Math.max(2, weightAtZoom18 * weightMultiplier * Math.pow(2, currentZoom - 18));
                                    const isPolygon = zone.path.length > 0 && Array.isArray(zone.path[0][0]);
                                    
                                    const popupContent = (
                                        <Popup autoPanPadding={[50, 50]} closeButton={false}>
                                            <div className="text-center w-[250px] sm:w-[280px] p-3 flex flex-col gap-3 max-h-[35vh] overflow-y-auto custom-scrollbar">
                                                {currentUserRole === 'admin' ? (
                                                    <>
                                                        <div className="bg-slate-50 text-slate-800 rounded-xl p-3 font-bold border-2 border-slate-200 shadow-inner">
                                                            <div className="text-sm text-slate-500 mb-1">담당 구역 마스터</div>
                                                            <div className="text-2xl text-blue-700 mb-3">{workers?.find(w => w.id === zone.workerId)?.name || zone.workerName}</div>
                                                            {(workers?.find(w => w.id === zone.workerId)?.cleaningArea || zone.groupName) && (
                                                                <div className="bg-slate-200 text-slate-700 text-sm font-bold py-1 px-3 rounded-full mb-3 inline-block">
                                                                    {workers?.find(w => w.id === zone.workerId)?.cleaningArea || zone.groupName}
                                                                </div>
                                                            )}
                                                            <div className="flex items-center justify-between px-2">
                                                                <span>현재 상태:</span>
                                                                <span className={isDone ? 'text-green-600 bg-green-100 px-3 py-1 rounded-full' : 'text-red-500 bg-red-100 px-3 py-1 rounded-full'}>
                                                                    {isDone ? '✨ 청소완료' : '🧹 미완료'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); deleteZone(zone.id); }}
                                                            className="w-full bg-red-100 hover:bg-red-200 text-red-600 min-h-[60px] rounded-xl flex items-center justify-center gap-2 text-xl font-bold border border-red-300"
                                                        >
                                                            <Trash2 size={24} /> 이 구역 지우기
                                                        </button>
                                                        
                                                        {!isPolygon && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleUpgradeLegacyZone(zone); }}
                                                                disabled={isUpgradingZone === zone.id}
                                                                className="w-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 min-h-[50px] mt-2 rounded-xl flex items-center justify-center gap-2 text-sm font-bold border border-indigo-300 transition-all active:scale-95"
                                                            >
                                                                {isUpgradingZone === zone.id ? '⏳ 맵 매칭 최적화 중...' : '✨ 구역 자동 도로 스냅 (Mapbox 변환)'}
                                                            </button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        {(workers?.find(w => w.id === zone.workerId)?.cleaningArea || zone.groupName) && (
                                                            <div className="bg-blue-100 text-blue-800 text-sm font-black py-1 px-3 rounded-md mb-2 inline-block">
                                                                {workers?.find(w => w.id === zone.workerId)?.cleaningArea || zone.groupName}
                                                            </div>
                                                        )}
                                                        <h3 className="text-2xl font-black text-slate-800 mb-2 mt-2">
                                                            {isDone ? '✨ 이 구역은 깨끗합니다' : '🧹 청소를 시작할까요?'}
                                                        </h3>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); toggleCleaningStatus(zone.id); }}
                                                            className={\`w-full min-h-[120px] rounded-3xl flex items-center justify-center gap-2 text-3xl font-black shadow-2xl text-white transform active:scale-95 transition-all \${
                                                                isDone ? 'bg-slate-600 hover:bg-slate-700 border-4 border-slate-400' : 'bg-green-500 hover:bg-green-600 border-4 border-green-300 shadow-green-500/30'
                                                            }\`}
                                                        >
                                                            {isDone ? (
                                                                <><XCircle size={44} /> 청소 취소</>
                                                            ) : (
                                                                <><CheckCircle2 size={44} /> 구역 청소 완료!</>
                                                            )}
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); deleteZone(zone.id); }}
                                                            className="w-full bg-slate-200 hover:bg-red-100 text-slate-600 hover:text-red-600 min-h-[40px] mt-3 rounded-xl flex items-center justify-center gap-2 text-md font-bold transition-all"
                                                        >
                                                            <Trash2 size={18} /> 잘못 그린 이 구역 지우기
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </Popup>
                                    );

                                    return isPolygon ? (
                                        <Polygon
                                            key={zone.id}
                                            positions={zone.path as any}
                                            pathOptions={{ color: color, weight: dynamicWeight, fillColor: color, fillOpacity: fillOpacity, dashArray: dashArray, opacity: lineOpacity, className: isFocusedGroup || isTerritoryFocused ? 'animate-pulse' : 'transition-opacity duration-500' }}
                                        >
                                            {popupContent}
                                        </Polygon>
                                    ) : (
                                        <Polyline
                                            key={zone.id}
                                            positions={zone.path as any}
                                            pathOptions={{ color: color, weight: dynamicWeight, opacity: lineOpacity, dashArray: dashArray, className: isFocusedGroup || isTerritoryFocused ? 'animate-pulse' : 'transition-opacity duration-500' }}
                                        >
                                            {popupContent}
                                        </Polyline>
                                    );
                                })}}`;
    code = code.substring(0, startIdx) + replacement + code.substring(endIdx);
    fs.writeFileSync('src/app/components/CleaningMapClient.tsx', code);
    console.log("Successfully replaced code");
} else {
    console.log("Failed to find start or end index");
}
