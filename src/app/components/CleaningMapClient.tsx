'use client';

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { CheckCircle2, XCircle, Trash2, Settings, User } from 'lucide-react';

interface Zone {
    id: string;
    lat: number;
    lng: number;
    radius: number;
    isCleaned: boolean;
}

// Component to handle map clicks for adding zones
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

export default function CleaningMapClient() {
    const [isAdmin, setIsAdmin] = useState(false); // Demo Mode Toggle
    const [zones, setZones] = useState<Zone[]>([
        { id: '1', lat: 37.5665, lng: 126.9780, radius: 100, isCleaned: false },
        { id: '2', lat: 37.5685, lng: 126.9810, radius: 100, isCleaned: true },
    ]);

    // Center map around Seoul roughly
    const defaultCenter: [number, number] = [37.5665, 126.9780];

    const completedCount = zones.filter(z => z.isCleaned).length;
    const totalCount = zones.length;

    const handleMapClick = (latlng: { lat: number; lng: number }) => {
        if (!isAdmin) return;
        const newZone: Zone = {
            id: Date.now().toString(),
            lat: latlng.lat,
            lng: latlng.lng,
            radius: 100, // Roughly 100 meters
            isCleaned: false,
        };
        setZones(prev => [...prev, newZone]);
    };

    const toggleCleaningStatus = (id: string) => {
        if (isAdmin) return; // Admins don't clean
        setZones(prev => prev.map(z => z.id === id ? { ...z, isCleaned: !z.isCleaned } : z));
    };

    const deleteZone = (id: string) => {
        if (!isAdmin) return;
        setZones(prev => prev.filter(z => z.id !== id));
    };

    return (
        <div className="relative w-full h-screen bg-blue-900 text-white font-sans flex flex-col">
            {/* Header (Worker Mode Progress) */}
            <header className={`p-6 shadow-md z-10 flex flex-col items-center justify-center text-center ${isAdmin ? 'bg-slate-800' : 'bg-blue-800'}`}>
                {isAdmin ? (
                    <div>
                        <h1 className="text-3xl font-bold mb-2 break-keep">구역 설정 모드 (관리자)</h1>
                        <p className="text-xl">지도를 터치하여 청소 구역을 추가하세요.</p>
                    </div>
                ) : (
                    <div className="w-full">
                        <h1 className="text-4xl font-extrabold mb-3">오늘 {totalCount}곳 중 <span className="text-green-400 text-5xl">{completedCount}곳</span> 완료!</h1>
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
                <MapContainer center={defaultCenter} zoom={15} style={{ height: '100%', width: '100%', zIndex: 0 }} zoomControl={false}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapClickHandler onMapClick={handleMapClick} isAdmin={isAdmin} />

                    {zones.map((zone) => {
                        const isDone = zone.isCleaned;
                        const colorProps = isDone
                            ? { color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.6 } // Green
                            : { color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.6 }; // Red

                        return (
                            <Circle
                                key={zone.id}
                                center={[zone.lat, zone.lng]}
                                radius={zone.radius}
                                pathOptions={{ ...colorProps, weight: 3 }}
                            >
                                <Popup closeButton={false} autoPanPadding={[50, 50]}>
                                    <div className="text-center w-[200px] p-2 flex flex-col gap-4">
                                        {isAdmin ? (
                                            <>
                                                <h3 className="text-xl font-bold text-slate-800">이 구역 삭제할까요?</h3>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); deleteZone(zone.id); }}
                                                    className="w-full bg-red-600 hover:bg-red-700 text-white min-h-[80px] rounded-2xl flex items-center justify-center gap-2 text-2xl font-bold shadow-lg"
                                                >
                                                    <Trash2 size={36} /> 삭제하기
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <h3 className="text-2xl font-bold text-slate-800 mb-2">
                                                    {isDone ? '완료된 구역입니다' : '이 구역 청소할까요?'}
                                                </h3>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); toggleCleaningStatus(zone.id); }}
                                                    className={`w-full min-h-[100px] rounded-3xl flex items-center justify-center gap-2 text-2xl font-extrabold shadow-xl text-white ${
                                                        isDone ? 'bg-slate-500 hover:bg-slate-600' : 'bg-green-500 hover:bg-green-600'
                                                    }`}
                                                >
                                                    {isDone ? (
                                                        <><XCircle size={40} /> 취소하기</>
                                                    ) : (
                                                        <><CheckCircle2 size={40} /> 완료하기</>
                                                    )}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </Popup>
                            </Circle>
                        );
                    })}

                    <CustomZoomControls />
                </MapContainer>
            </main>

            {/* Demo Mode Switcher (For testing only) */}
            <div className="absolute top-32 right-4 z-[1000]">
                <button
                    onClick={() => setIsAdmin(!isAdmin)}
                    className={`px-6 py-4 rounded-xl font-bold text-xl shadow-2xl flex items-center gap-2 border-2 ${
                        isAdmin ? 'bg-red-600 text-white border-red-400' : 'bg-blue-600 text-white border-blue-400'
                    }`}
                >
                    {isAdmin ? <Settings size={28} /> : <User size={28} />}
                    {isAdmin ? '관리자 모드' : '어르신 모드'}
                </button>
            </div>
        </div>
    );
}
