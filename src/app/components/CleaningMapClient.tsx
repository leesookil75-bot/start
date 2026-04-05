'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Popup, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CheckCircle2, XCircle, Trash2, PlusCircle, Users, User, Camera, Siren, CheckCircle } from 'lucide-react';

interface Zone {
    id: string;
    path: [number, number][]; // Array of [lat, lng]
    isCleaned: boolean;
    workerId: string;
    workerName: string;
}

interface Issue {
    id: string;
    lat: number;
    lng: number;
    workerId: string;
    workerName: string;
    status: 'PENDING' | 'WORKER_RESOLVED' | 'CLOSED';
    photoUrl?: string; // Base64 data url for prototype
    createdAt: number;
}

const markerIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

// Custom Icon for Issues
const pendingIssueIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

const resolvedIssueIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});


function CustomZoomControls() {
    const map = useMap();
    return (
        <div className="absolute bottom-8 right-8 z-[1000] flex flex-col gap-4">
            <button onClick={(e) => { e.stopPropagation(); map.zoomIn(); }} className="w-20 h-20 bg-white text-blue-900 rounded-full shadow-2xl flex items-center justify-center text-5xl font-bold border-4 border-slate-200 active:bg-slate-200">
                +
            </button>
            <button onClick={(e) => { e.stopPropagation(); map.zoomOut(); }} className="w-20 h-20 bg-white text-blue-900 rounded-full shadow-2xl flex items-center justify-center text-5xl font-bold border-4 border-slate-200 active:bg-slate-200">
                -
            </button>
        </div>
    );
}

function MapClickHandler({ onMapClick, isClickMode }: { onMapClick: (latlng: { lat: number; lng: number }) => void; isClickMode: boolean }) {
    useMapEvents({
        click(e: any) {
            if (isClickMode) onMapClick(e.latlng);
        },
    });
    return null;
}

const MOCK_WORKERS = [
    { id: 'w1', name: '김반장 (사우동)' },
    { id: 'w2', name: '이여사 (풍무동)' },
];

export default function CleaningMapClient() {
    const [isMounted, setIsMounted] = useState(false);
    
    const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'worker'>('worker');
    const [currentWorkerId, setCurrentWorkerId] = useState<string>('w1');
    
    // Core Data
    const [zones, setZones] = useState<Zone[]>([]);
    const [issues, setIssues] = useState<Issue[]>([]);
    
    // UI States
    const [pendingStartNode, setPendingStartNode] = useState<{lat: number, lng: number} | null>(null);
    const [isFetchingRoute, setIsFetchingRoute] = useState(false);
    
    const [isWorkerAdding, setIsWorkerAdding] = useState(false);
    const [isAdminAddingIssue, setIsAdminAddingIssue] = useState(false);
    const [pendingIssuePoint, setPendingIssuePoint] = useState<{lat: number, lng: number} | null>(null);
    const [suggestedWorker, setSuggestedWorker] = useState<Zone | null>(null);

    const alarmRef = useRef<HTMLAudioElement | null>(null);
    const [showAlarmPopup, setShowAlarmPopup] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const savedZones = localStorage.getItem('cleanTrackZones_v2');
        const savedIssues = localStorage.getItem('cleanTrackIssues_v1');
        if (savedZones) try { setZones(JSON.parse(savedZones)); } catch(e) {}
        if (savedIssues) try { setIssues(JSON.parse(savedIssues)); } catch(e) {}
        
        alarmRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    }, []);

    useEffect(() => {
        if(isMounted) {
            localStorage.setItem('cleanTrackZones_v2', JSON.stringify(zones));
            localStorage.setItem('cleanTrackIssues_v1', JSON.stringify(issues));
        }
    }, [zones, issues, isMounted]);

    // Check for pending issues for the logged in worker
    useEffect(() => {
        if (!isMounted) return;
        if (currentUserRole === 'worker') {
            const hasPending = issues.some(i => i.workerId === currentWorkerId && i.status === 'PENDING');
            if (hasPending) {
                setShowAlarmPopup(true);
                alarmRef.current?.play().catch(e => console.log('Audio autoplay blocked', e));
            } else {
                setShowAlarmPopup(false);
                alarmRef.current?.pause();
            }
        } else {
            setShowAlarmPopup(false);
            alarmRef.current?.pause();
        }
    }, [currentUserRole, currentWorkerId, issues, isMounted]);

    const defaultCenter: [number, number] = [37.5665, 126.9780];

    const visibleZones = currentUserRole === 'admin' ? zones : zones.filter(z => z.workerId === currentWorkerId);
    const visibleIssues = currentUserRole === 'admin' ? issues : issues.filter(i => i.workerId === currentWorkerId);

    const completedCount = visibleZones.filter(z => z.isCleaned).length;
    const totalCount = visibleZones.length;

    const findNearestWorker = (lat: number, lng: number): Zone | null => {
        if (zones.length === 0) return null;
        let minDistance = Infinity;
        let nearestZone: Zone | null = null;
        
        zones.forEach(z => {
            z.path.forEach(pt => {
                const p1 = L.latLng(lat, lng);
                const p2 = L.latLng(pt[0], pt[1]);
                const d = p1.distanceTo(p2);
                if (d < minDistance) {
                    minDistance = d;
                    nearestZone = z;
                }
            });
        });
        return nearestZone;
    };

    const handleMapClick = (latlng: { lat: number; lng: number }) => {
        if (isFetchingRoute) return;
        
        // Handling Admin Issue Drop
        if (isAdminAddingIssue) {
            const nearest = findNearestWorker(latlng.lat, latlng.lng);
            setPendingIssuePoint(latlng);
            setSuggestedWorker(nearest);
            return;
        }

        // Handling Route Generation
        if (!pendingStartNode) {
            setPendingStartNode(latlng);
        } else {
            fetchRouteAndCreateZone(pendingStartNode, latlng);
        }
    };

    const confirmIssue = () => {
        if (!pendingIssuePoint || !suggestedWorker) return;
        const newIssue: Issue = {
            id: Date.now().toString(),
            lat: pendingIssuePoint.lat,
            lng: pendingIssuePoint.lng,
            workerId: suggestedWorker.workerId,
            workerName: suggestedWorker.workerName,
            status: 'PENDING',
            createdAt: Date.now()
        };
        setIssues(prev => [...prev, newIssue]);
        setPendingIssuePoint(null);
        setSuggestedWorker(null);
        setIsAdminAddingIssue(false);
    };

    const cancelIssueDrop = () => {
        setPendingIssuePoint(null);
        setSuggestedWorker(null);
        setIsAdminAddingIssue(false);
    };

    const fetchRouteAndCreateZone = async (start: {lat: number, lng: number}, end: {lat: number, lng: number}) => {
        setIsFetchingRoute(true);
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                const coords = data.routes[0].geometry.coordinates;
                const pathCoords: [number, number][] = coords.map((c: [number, number]) => [c[1], c[0]]);
                
                const workerId = currentUserRole === 'admin' ? 'w1' : currentWorkerId; // fallback to w1 for admin
                const workerDetail = MOCK_WORKERS.find(w => w.id === workerId) || MOCK_WORKERS[0];
                
                const newZone: Zone = {
                    id: Date.now().toString(),
                    path: pathCoords,
                    isCleaned: false,
                    workerId: workerDetail.id,
                    workerName: workerDetail.name
                };
                setZones(prev => [...prev, newZone]);
            } else {
                alert("해당 지점 근처에 도로를 찾을 수 없거나 연결할 수 없습니다.");
            }
        } catch (error) {
            alert("경로 탐색 통신에 실패했습니다.");
        } finally {
            setIsFetchingRoute(false);
            setPendingStartNode(null);
            setIsWorkerAdding(false);
        }
    };

    const toggleCleaningStatus = (id: string) => {
        if (currentUserRole === 'admin') return; 
        setZones(prev => prev.map(z => z.id === id ? { ...z, isCleaned: !z.isCleaned } : z));
    };

    const deleteZone = (id: string) => {
        setZones(prev => prev.filter(z => z.id !== id));
    };

    const handlePhotoUpload = (issueId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        // Create low quality preview logic to save localStorage space directly
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 400;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5); // 50% quality
                
                setIssues(prev => prev.map(i => i.id === issueId ? { ...i, photoUrl: compressedDataUrl } : i));
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const resolveWorkerIssue = (issueId: string) => {
        setIssues(prev => prev.map(i => i.id === issueId ? { ...i, status: 'WORKER_RESOLVED' } : i));
    };

    const closeAdminIssue = (issueId: string) => {
        setIssues(prev => prev.map(i => i.id === issueId ? { ...i, status: 'CLOSED' } : i));
    };

    const deleteAdminIssue = (issueId: string) => {
        setIssues(prev => prev.filter(i => i.id !== issueId));
    };

    if (!isMounted) return null;

    const isClickMode = currentUserRole === 'admin' || isWorkerAdding;
    const currentWorkerName = MOCK_WORKERS.find(w => w.id === currentWorkerId)?.name;

    return (
        <div className="relative w-full h-screen bg-blue-900 text-white font-sans flex flex-col overflow-hidden">
            
            {/* Alarm Overlay for Worker */}
            {showAlarmPopup && (
                <div className="absolute inset-0 z-[5000] bg-red-600/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-pulse">
                    <Siren size={100} className="text-white mb-6 animate-bounce" />
                    <h2 className="text-4xl text-center font-extrabold text-white mb-8 leading-tight">
                        긴급!<br/>구역 내 민원이 발생했습니다<br/>신속히 처리 바랍니다
                    </h2>
                    <button 
                        onClick={() => setShowAlarmPopup(false)}
                        className="bg-white text-red-600 px-10 py-5 rounded-full text-3xl font-extrabold shadow-2xl active:scale-95"
                    >
                        안내 닫고 확인하기
                    </button>
                </div>
            )}

            {/* Mock Authentication Switcher */}
            <div className="absolute top-4 left-4 z-[2000] bg-white p-3 rounded-2xl shadow-2xl text-slate-800 flex flex-col gap-2 border-2 border-slate-300">
                <div className="font-bold text-sm text-slate-500 mb-1 border-b pb-1">🧪 가상 로그인 시뮬레이터</div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => {setCurrentUserRole('admin'); setIsWorkerAdding(false); setPendingStartNode(null); setIsAdminAddingIssue(false);}}
                        className={`px-4 py-2 font-bold rounded-xl transition ${currentUserRole === 'admin' ? 'bg-slate-800 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}
                    >
                        <Users size={18} className="inline mr-1"/> 관리자 로그인
                    </button>
                    <div className="flex flex-col gap-1 items-start">
                        <button 
                            onClick={() => {setCurrentUserRole('worker'); setIsWorkerAdding(false); setPendingStartNode(null); setIsAdminAddingIssue(false);}}
                            className={`px-4 py-2 font-bold rounded-xl transition ${currentUserRole === 'worker' ? 'bg-blue-600 text-white' : 'bg-white border-2 border-slate-200 hover:bg-slate-50'}`}
                        >
                            <User size={18} className="inline mr-1"/> 근로자 로그인
                        </button>
                        {currentUserRole === 'worker' && (
                            <select 
                                value={currentWorkerId}
                                onChange={(e) => setCurrentWorkerId(e.target.value)}
                                className="p-2 ml-1 text-sm border-2 border-blue-200 rounded-xl font-bold bg-blue-50 focus:outline-none"
                            >
                                {MOCK_WORKERS.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        )}
                    </div>
                </div>
            </div>

            {/* Header */}
            <header className={`pt-28 pb-6 px-4 shadow-md z-10 flex flex-col items-center justify-center text-center transition-colors ${currentUserRole === 'admin' ? 'bg-slate-800' : (isWorkerAdding ? 'bg-blue-700' : 'bg-blue-800')}`}>
                {isAdminAddingIssue ? (
                    <div className="animate-pulse bg-red-600 w-full py-4 -my-4 mb-2">
                        <h1 className="text-2xl sm:text-3xl font-bold mb-1 text-white">🚨 민원 구역 지정 모드</h1>
                        <p className="text-lg text-red-100">지도에서 민원이 발생한 위치를 터치하세요.</p>
                        <button onClick={cancelIssueDrop} className="mt-2 bg-white text-red-600 px-4 py-1 rounded-full font-bold">취소</button>
                    </div>
                ) : currentUserRole === 'admin' ? (
                    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
                        <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-yellow-300">전체 관리자 맵</h1>
                        <p className="text-md text-slate-300">도로 추가(두 번 터치) 및 현장 민원 배정을 할 수 있습니다.</p>
                        {pendingStartNode && <div className="mt-2 text-yellow-400 font-bold animate-pulse">🚀 도로의 끝 지점을 한 번 더 터치하세요!</div>}
                        
                        {!pendingStartNode && (
                            <button 
                                onClick={() => setIsAdminAddingIssue(true)}
                                className="mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-2xl shadow-xl flex items-center gap-2"
                            >
                                <Siren size={24} /> 현장 민원 핀 추가하기
                            </button>
                        )}
                    </div>
                ) : isWorkerAdding ? (
                    <div className="animate-pulse">
                        <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-yellow-300">새 구역 지정하기</h1>
                        <p className="text-xl sm:text-2xl font-bold text-white">
                            {pendingStartNode ? '🚀 도로의 끝나는 지점을 한 번 더 터치하세요!' : '지도를 터치하여 시작점을 고르세요.'}
                        </p>
                    </div>
                ) : (
                    <div className="w-full max-w-4xl mx-auto">
                        <h1 className="text-3xl sm:text-4xl font-extrabold mb-3">내 청소 구역 ({currentWorkerName})</h1>
                        <div className="flex items-end justify-center gap-2 mb-2">
                            <span className="text-2xl">오늘 {totalCount}곳 중</span>
                            <span className="text-green-400 text-4xl font-extrabold">{completedCount}곳</span>
                            <span className="text-2xl">완료!</span>
                        </div>
                        <div className="w-full max-w-lg mx-auto h-6 bg-blue-950 rounded-full overflow-hidden border-2 border-white/20 mt-2">
                            <div 
                                className="h-full bg-green-500 transition-all duration-500"
                                style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
                            />
                        </div>
                    </div>
                )}
            </header>

            {/* Admin Issue Drop Confirm Dialog */}
            {isAdminAddingIssue && pendingIssuePoint && (
                <div className="absolute inset-0 z-[3000] bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 text-slate-800 w-full max-w-sm text-center shadow-2xl animate-in zoom-in">
                        <h2 className="text-2xl font-black mb-4">민원구역 할당 확인</h2>
                        {suggestedWorker ? (
                            <p className="text-lg font-bold mb-6">
                                터치하신 위치는 <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block mx-1">{suggestedWorker.workerName}</span>의 구역과 가장 가깝습니다.<br/><br/>
                                이 근로자에게 민원 알림을 보낼까요?
                            </p>
                        ) : (
                            <p className="text-lg font-bold mb-6 text-red-500">
                                근처에 등록된 작업자의 구역이 없습니다.<br/>그래도 임의로 배정하시겠습니까?
                            </p>
                        )}
                        <div className="flex gap-2">
                            <button onClick={cancelIssueDrop} className="flex-1 py-4 bg-slate-200 text-slate-700 font-bold rounded-2xl text-xl">다시 찍기</button>
                            <button onClick={confirmIssue} className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl text-xl shadow-lg border-2 border-red-700">확인(알림 전송)</button>
                        </div>
                    </div>
                </div>
            )}

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
                    <MapClickHandler onMapClick={handleMapClick} isClickMode={isClickMode || isAdminAddingIssue} />

                    {/* Pending Start Node Visualization */}
                    {pendingStartNode && (
                        <Marker position={[pendingStartNode.lat, pendingStartNode.lng]} icon={markerIcon} />
                    )}

                    {/* Issues Markers */}
                    {visibleIssues.filter(i => i.status !== 'CLOSED').map((issue) => {
                        const isResolvedByWorker = issue.status === 'WORKER_RESOLVED';
                        const icon = isResolvedByWorker ? resolvedIssueIcon : pendingIssueIcon;
                        return (
                            <Marker key={issue.id} position={[issue.lat, issue.lng]} icon={icon}>
                                <Popup autoPanPadding={[50, 50]} closeButton={false}>
                                    <div className="text-center w-[250px] p-2 flex flex-col gap-3">
                                        {currentUserRole === 'admin' ? (
                                            <>
                                                <h3 className="text-xl font-bold text-slate-800 border-b pb-2">
                                                    {isResolvedByWorker ? '✅ 조치 완료된 민원' : '🚨 미처리 민원 대기중'}
                                                </h3>
                                                <p className="text-sm font-bold text-slate-600 text-left">담당: {issue.workerName}</p>
                                                
                                                {isResolvedByWorker && issue.photoUrl ? (
                                                    <div className="bg-slate-100 rounded-lg p-2 border border-slate-300">
                                                        <p className="text-xs font-bold text-slate-500 mb-1">근로자 첨부 사진</p>
                                                        <img src={issue.photoUrl} alt="현장 보고" className="w-full h-32 object-cover rounded-md mb-2 shadow-sm" />
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); closeAdminIssue(issue.id); }}
                                                            className="w-full bg-green-600 hover:bg-green-700 text-white min-h-[60px] rounded-xl flex items-center justify-center gap-2 text-xl font-bold shadow-md"
                                                        >
                                                            <CheckCircle size={24} /> 종결 처리
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); deleteAdminIssue(issue.id); }}
                                                        className="w-full bg-slate-300 text-slate-700 min-h-[50px] rounded-xl font-bold mt-2 hover:bg-red-100 hover:text-red-600"
                                                    >
                                                        접수 취소 (삭제)
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <h3 className="text-2xl font-bold text-slate-800 mb-2">
                                                    {isResolvedByWorker ? '처리 완료됨 (대기중)' : '🚨 구역 내 민원 발생'}
                                                </h3>
                                                
                                                {!isResolvedByWorker ? (
                                                    <div className="flex flex-col gap-3">
                                                        {issue.photoUrl ? (
                                                            <div className="relative">
                                                                <img src={issue.photoUrl} alt="Preview" className="w-full h-24 object-cover rounded-xl border-4 border-green-400" />
                                                                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">사진 적용됨</div>
                                                            </div>
                                                        ) : (
                                                            <label className="w-full bg-slate-100 border-2 border-dashed border-slate-300 hover:bg-blue-50 text-slate-600 min-h-[80px] rounded-2xl flex flex-col items-center justify-center cursor-pointer active:bg-blue-100 transition-colors">
                                                                <Camera size={28} className="mb-1 text-slate-500" />
                                                                <span className="font-bold">현장 사진 찍기</span>
                                                                <input 
                                                                    type="file" 
                                                                    accept="image/*" 
                                                                    capture="environment" 
                                                                    className="hidden"
                                                                    onChange={(e) => handlePhotoUpload(issue.id, e)}
                                                                />
                                                            </label>
                                                        )}
                                                        
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); resolveWorkerIssue(issue.id); }}
                                                            disabled={!issue.photoUrl}
                                                            className={`w-full min-h-[70px] rounded-2xl flex items-center justify-center gap-2 text-2xl font-extrabold shadow-lg transition-colors ${
                                                                issue.photoUrl ? 'bg-green-600 text-white shadow-green-600/50' : 'bg-slate-300 text-slate-500'
                                                            }`}
                                                        >
                                                            <CheckCircle2 size={30} /> 보고 완료하기
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm font-bold text-slate-600">관리자의 확인을 기다리고 있습니다.</p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}

                    {/* Clean/Unclean Polylines */}
                    {visibleZones.map((zone) => {
                        const isDone = zone.isCleaned;
                        const color = isDone ? '#22c55e' : '#ef4444'; 

                        return (
                            <Polyline
                                key={zone.id}
                                positions={zone.path}
                                pathOptions={{ color: color, weight: 15, opacity: 0.8 }}
                            >
                                <Popup autoPanPadding={[50, 50]} closeButton={false}>
                                    <div className="text-center w-[250px] p-2 flex flex-col gap-3">
                                        {currentUserRole === 'admin' ? (
                                            <>
                                                <div className="bg-slate-100 text-slate-800 rounded-lg p-2 font-bold mb-1">
                                                    담당자: <span className="text-blue-600">{zone.workerName}</span><br/>
                                                    상태: <span className={isDone ? 'text-green-600' : 'text-red-500'}>{isDone ? '청소완료' : '미완료'}</span>
                                                </div>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); deleteZone(zone.id); }}
                                                    className="w-full bg-red-100 hover:bg-red-200 text-red-600 min-h-[50px] rounded-xl flex items-center justify-center gap-2 text-xl font-bold transition"
                                                >
                                                    <Trash2 size={24} /> 도로 지우기
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <h3 className="text-2xl font-bold text-slate-800 mb-2">
                                                    {isDone ? '완료된 도로구역' : '이곳을 청소할까요?'}
                                                </h3>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); toggleCleaningStatus(zone.id); }}
                                                    className={`w-full min-h-[110px] rounded-3xl flex items-center justify-center gap-2 text-3xl font-extrabold shadow-2xl text-white transition-colors ${
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

            {/* Worker Floating ADD ZONE Button */}
            {currentUserRole === 'worker' && !isWorkerAdding && (
                <div className="absolute top-[35%] left-4 z-[1000]">
                    <button
                        onClick={() => setIsWorkerAdding(true)}
                        className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center border-4 border-blue-400 transform transition active:scale-95"
                    >
                        <PlusCircle size={40} className="mb-1" />
                        <span className="text-lg font-extrabold px-2">새 구역</span>
                    </button>
                </div>
            )}
            
            {/* Worker Canceling Add Zone Button */}
            {currentUserRole === 'worker' && isWorkerAdding && (
                <div className="absolute top-[35%] left-4 z-[1000]">
                    <button
                        onClick={() => { setIsWorkerAdding(false); setPendingStartNode(null); }}
                        className="p-4 bg-red-600 hover:bg-red-700 text-white rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center border-4 border-red-400 transform transition active:scale-95"
                    >
                        <XCircle size={50} className="mb-1" />
                        <span className="text-xl font-extrabold">추가 취소</span>
                    </button>
                </div>
            )}
        </div>
    );
}
