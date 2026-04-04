'use client';

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Popup, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CheckCircle2, XCircle, Trash2, Settings, User } from 'lucide-react';

interface Zone {
    id: string;
    path: [number, number][]; // Array of [lat, lng]
    isCleaned: boolean;
}

// Leaflet default icon fixing issue via JS since Next.js static files can be tricky
const markerIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

// Component to handle custom zoom buttons inside MapContainer
function CustomZoomControls() {
    const map = useMap();
    return (
        <div className="absolute bottom-8 right-8 z-[1000] flex flex-col gap-4">
            <button 
                onClick={(e) => { e.stopPropagation(); map.zoomIn(); }}
                className="w-20 h-20 bg-white text-blue-900 rounded-full shadow-2xl flex items-center justify-center text-5xl font-bold border-4 border-slate-200 active:bg-slate-200"
            >
                +
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); map.zoomOut(); }}
                className="w-20 h-20 bg-white text-blue-900 rounded-full shadow-2xl flex items-center justify-center text-5xl font-bold border-4 border-slate-200 active:bg-slate-200"
            >
                -
            </button>
        </div>
    );
}

// Component to handle map clicks for adding zones (Route A to Route B)
function MapClickHandler({ onMapClick, isAdmin }: { onMapClick: (latlng: { lat: number; lng: number }) => void; isAdmin: boolean }) {
    useMapEvents({
        click(e: any) {
            if (isAdmin) {
                onMapClick(e.latlng);
            }
        },
    });
    return null;
}

export default function CleaningMapClient() {
    const [isMounted, setIsMounted] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    
    const [zones, setZones] = useState<Zone[]>([]);
    const [pendingStartNode, setPendingStartNode] = useState<{lat: number, lng: number} | null>(null);
    const [isFetchingRoute, setIsFetchingRoute] = useState(false);

    // Initial persistence load
    useEffect(() => {
        setIsMounted(true);
        const saved = localStorage.getItem('cleanTrackZones');
        if (saved) {
            try {
                setZones(JSON.parse(saved));
            } catch(e) {
                console.error("Local storage parse error:", e);
            }
        }
    }, []);

    // Save persistence on change
    useEffect(() => {
        if(isMounted) {
            localStorage.setItem('cleanTrackZones', JSON.stringify(zones));
        }
    }, [zones, isMounted]);

    // Center map around Seoul roughly
    const defaultCenter: [number, number] = [37.5665, 126.9780];

    const completedCount = zones.filter(z => z.isCleaned).length;
    const totalCount = zones.length;

    const fetchRouteAndCreateZone = async (start: {lat: number, lng: number}, end: {lat: number, lng: number}) => {
        setIsFetchingRoute(true);
        try {
            // OSRM expects lon,lat format
            const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                // GeoJSON gives coordinates as [lng, lat]
                const coords = data.routes[0].geometry.coordinates;
                const pathCoords: [number, number][] = coords.map((c: [number, number]) => [c[1], c[0]]);
                
                const newZone: Zone = {
                    id: Date.now().toString(),
                    path: pathCoords,
                    isCleaned: false,
                };
                setZones(prev => [...prev, newZone]);
            } else {
                alert("해당 지점 근처에 도로를 찾을 수 없거나 연결할 수 없습니다. 다른 곳을 터치해주세요.");
            }
        } catch (error) {
            console.error(error);
            alert("경로 탐색 통신에 실패했습니다.");
        } finally {
            setIsFetchingRoute(false);
            setPendingStartNode(null);
        }
    };

    const handleMapClick = (latlng: { lat: number; lng: number }) => {
        if (!isAdmin || isFetchingRoute) return;
        
        if (!pendingStartNode) {
            setPendingStartNode(latlng);
        } else {
            // End point selected, fetch route!
            fetchRouteAndCreateZone(pendingStartNode, latlng);
        }
    };

    const toggleCleaningStatus = (id: string) => {
        if (isAdmin) return; // Admins edit, workers interact via popup
        setZones(prev => prev.map(z => z.id === id ? { ...z, isCleaned: !z.isCleaned } : z));
    };

    const deleteZone = (id: string) => {
        if (!isAdmin) return;
        setZones(prev => prev.filter(z => z.id !== id));
    };

    if (!isMounted) return null;

    return (
        <div className="relative w-full h-screen bg-blue-900 text-white font-sans flex flex-col">
            {/* Header */}
            <header className={`p-6 shadow-md z-10 flex flex-col items-center justify-center text-center ${isAdmin ? 'bg-slate-800' : 'bg-blue-800'}`}>
                {isAdmin ? (
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold mb-2 break-keep">구역 설정 (도로 자동연결)</h1>
                        <p className="text-lg sm:text-xl font-medium text-blue-200">
                            {pendingStartNode ? '🚀 끝 지점을 지도에서 터치하세요!' : '지도를 터치하여 시작점을 고르세요.'}
                        </p>
                    </div>
                ) : (
                    <div className="w-full">
                        <h1 className="text-3xl sm:text-4xl font-extrabold mb-3">오늘 {totalCount}개 도로 중 <span className="text-green-400 text-4xl sm:text-5xl">{completedCount}곳</span> 완료!</h1>
                        <div className="w-full h-6 bg-blue-950 rounded-full overflow-hidden border-2 border-white/20 mt-2">
                            <div 
                                className="h-full bg-green-500 transition-all duration-500"
                                style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
                            />
                        </div>
                    </div>
                )}
            </header>

            {/* Map Area */}
            <main className="flex-1 relative">
                {isFetchingRoute && (
                    <div className="absolute inset-0 z-[2000] bg-black/40 flex items-center justify-center backdrop-blur-sm">
                        <span className="text-3xl font-bold bg-blue-900 border-4 border-white px-8 py-4 rounded-3xl shadow-2xl animate-pulse">
                            도로 자동 탐색 중...
                        </span>
                    </div>
                )}

                <MapContainer center={defaultCenter} zoom={15} style={{ height: '100%', width: '100%', zIndex: 0 }} zoomControl={false}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapClickHandler onMapClick={handleMapClick} isAdmin={isAdmin} />

                    {/* Pending Start Node Visualization */}
                    {pendingStartNode && (
                        <Marker position={[pendingStartNode.lat, pendingStartNode.lng]} icon={markerIcon} />
                    )}

                    {zones.map((zone) => {
                        const isDone = zone.isCleaned;
                        const color = isDone ? '#22c55e' : '#ef4444'; // Green or Red

                        // Determine center of polyline for popup to open stably if clicked on line edges.
                        // Actually Leaflet opens Popup at the clicked location natively for Polylines, which is perfect and huge!
                        return (
                            <Polyline
                                key={zone.id}
                                positions={zone.path}
                                pathOptions={{ color: color, weight: 15, opacity: 0.8 }}
                                // Thicker interactive area! In older leaflet this was interactive true. By default it uses weight.
                            >
                                <Popup autoPanPadding={[50, 50]} closeButton={false}>
                                    <div className="text-center w-[220px] p-2 flex flex-col gap-4">
                                        {isAdmin ? (
                                            <>
                                                <h3 className="text-2xl font-bold text-slate-800">이 도로 삭제할까요?</h3>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); deleteZone(zone.id); }}
                                                    className="w-full bg-red-600 hover:bg-red-700 text-white min-h-[90px] rounded-2xl flex items-center justify-center gap-2 text-3xl font-bold shadow-lg"
                                                >
                                                    <Trash2 size={40} /> 삭제하기
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <h3 className="text-2xl font-bold text-slate-800 mb-2">
                                                    {isDone ? '완료된 도로구역' : '이곳을 청소할까요?'}
                                                </h3>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); toggleCleaningStatus(zone.id); }}
                                                    className={`w-full min-h-[110px] rounded-3xl flex items-center justify-center gap-2 text-3xl font-extrabold shadow-2xl text-white ${
                                                        isDone ? 'bg-slate-500 hover:bg-slate-600' : 'bg-green-500 hover:bg-green-600'
                                                    }`}
                                                >
                                                    {isDone ? (
                                                        <><XCircle size={44} /> 취소하기</>
                                                    ) : (
                                                        <><CheckCircle2 size={44} /> 완료하기</>
                                                    )}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </Popup>
                            </Polyline>
                        );
                    })}

                    <CustomZoomControls />
                </MapContainer>
            </main>

            {/* Demo Mode Switcher (For testing only) */}
            <div className="absolute top-32 right-4 z-[1000] flex flex-col items-end gap-3">
                <button
                    onClick={() => setIsAdmin(!isAdmin)}
                    className={`px-6 py-4 rounded-2xl font-bold text-xl shadow-2xl flex items-center gap-2 border-2 ${
                        isAdmin ? 'bg-red-600 text-white border-red-400' : 'bg-blue-600 text-white border-blue-400'
                    }`}
                >
                    {isAdmin ? <Settings size={28} /> : <User size={28} />}
                    {isAdmin ? '관리자 모드' : '어르신 모드'}
                </button>
                {isAdmin && (
                    <button
                        onClick={() => {
                            if(confirm("모든 저장된 구역 데이터를 초기화하시겠습니까?")) {
                                localStorage.removeItem('cleanTrackZones');
                                setZones([]);
                            }
                        }}
                        className="px-4 py-2 bg-slate-700/80 text-white rounded-xl text-sm font-bold shadow hover:bg-slate-700"
                    >
                        데이터 초기화
                    </button>
                )}
            </div>
        </div>
    );
}
