'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Popup, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CheckCircle2, XCircle, Trash2, PlusCircle, Users, User, Camera, Siren, CheckCircle, Crosshair, Home, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

import type { Zone, Issue } from '@/lib/data';
import { 
    getZonesAction, 
    addZoneAction, 
    toggleZoneStatusAction, 
    toggleZoneGroupStatusAction,
    deleteZoneAction, 
    getIssuesAction, 
    addIssueAction, 
    updateIssuePhotoAndStatusAction, 
    closeIssueAction, 
    deleteIssueAction 
} from '@/app/actions';

type UIMode = 'IDLE' | 'ROUTE_BUILDING' | 'ISSUE_DROP';

const markerIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

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

// Fit bounds to visible data only on initial load to prevent hijacking user zoom/pan
function MapBoundsFitter({ zones, issues }: { zones: Zone[], issues: Issue[] }) {
    const map = useMap();
    const hasFitted = useRef(false);
    
    useEffect(() => {
        if (hasFitted.current) return;

        const bounds = new L.LatLngBounds([]);
        let hasPoints = false;

        zones.forEach(z => {
            z.path.forEach(pt => {
                bounds.extend(pt as L.LatLngTuple);
                hasPoints = true;
            });
        });

        issues.forEach(i => {
            bounds.extend([i.lat, i.lng]);
            hasPoints = true;
        });

        if (hasPoints && bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
            hasFitted.current = true;
        }
    }, [zones, issues, map]); 

    return null;
}

// Controls inside Map
function CustomZoomControls() {
    const map = useMap();
    return (
        <div className="absolute bottom-32 sm:bottom-8 right-4 sm:right-8 z-[1000] flex flex-col gap-4">
            <button onClick={(e) => { e.stopPropagation(); map.zoomIn(); }} className="w-16 h-16 sm:w-20 sm:h-20 bg-white text-blue-900 rounded-full shadow-2xl flex items-center justify-center text-4xl sm:text-5xl font-bold border-4 border-slate-200 active:bg-slate-200">
                +
            </button>
            <button onClick={(e) => { e.stopPropagation(); map.zoomOut(); }} className="w-16 h-16 sm:w-20 sm:h-20 bg-white text-blue-900 rounded-full shadow-2xl flex items-center justify-center text-4xl sm:text-5xl font-bold border-4 border-slate-200 active:bg-slate-200">
                -
            </button>
        </div>
    );
}

function MapFlyTo({ target }: { target: [number, number] | null }) {
    const map = useMap();
    useEffect(() => {
        if (target) {
            map.flyTo(target, 17, { animate: true, duration: 1.5 });
        }
    }, [target, map]);
    return null;
}

// Track zoom level dynamically
function MapZoomTracker({ onZoomChange }: { onZoomChange: (z: number) => void }) {
    useMapEvents({
        zoomend: (e) => onZoomChange(e.target.getZoom())
    });
    return null;
}

// Center Crosshair and Targeting UI Layer
function TargetOverlays({ 
    uiMode, 
    routeNodes, 
    onAddRouteNode, 
    onUndoRouteNode,
    onCancelRoute,
    onCompleteRoute, 
    onSetIssue 
}: { 
    uiMode: UIMode, 
    routeNodes: {lat: number, lng: number}[],
    isDirectMode: boolean,
    setIsDirectMode: (val: boolean) => void,
    onAddRouteNode: () => void,
    onUndoRouteNode: () => void,
    onCancelRoute: () => void,
    onCompleteRoute: () => void,
    onSetIssue: () => void,
}) {
    if (uiMode === 'IDLE') return null;

    if (uiMode === 'ROUTE_BUILDING') {
        const nodeCount = routeNodes.length;
        return (
            <div className="absolute inset-0 z-[1500] pointer-events-none flex flex-col items-center justify-center">
                <div className="absolute top-6 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full text-white font-bold text-center shadow-xl text-sm sm:text-base border border-white/20">
                    지도를 움직여 과녁을 🎯 원하는 곳에 맞추세요
                </div>
                
                <div className="absolute top-[4.5rem] pointer-events-auto">
                    <button 
                        onClick={() => setIsDirectMode(!isDirectMode)}
                        className={`px-4 py-2 rounded-full font-bold text-xs sm:text-sm shadow-xl border-2 transition active:scale-95 flex items-center justify-center gap-1 ${isDirectMode ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-600/30' : 'bg-white text-slate-700 border-slate-300'}`}
                    >
                        {isDirectMode ? '📏 클릭한 구간만 직접 직선 연결합니다' : '🚙 도로를 따라 자동으로 스냅 설정 중'}
                    </button>
                </div>
                
                <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-blue-500/20 w-32 h-32 -ml-16 -mt-16 animate-ping" />
                    <Crosshair size={60} className="text-blue-600 drop-shadow-[0_2px_10px_rgba(255,255,255,1)]" strokeWidth={2.5}/>
                    <div className="absolute w-2 h-2 bg-blue-600 rounded-full" />
                </div>

                <div className="absolute bottom-6 w-full px-4 flex flex-col gap-2 justify-center pointer-events-auto max-w-sm mx-auto left-0 right-0">
                    <button 
                         onClick={() => onAddRouteNode()}
                         className={`w-full py-4 px-4 rounded-xl text-white font-bold text-lg shadow-lg border border-white/20 transform transition active:scale-95 bg-blue-600/90 backdrop-blur-md hover:bg-blue-600`}
                    >
                         {nodeCount === 0 ? '📍 이 위치를 출발지로 지정' : `➕ ${nodeCount + 1}번째 경유지로 추가`}
                    </button>

                    {nodeCount >= 2 && (
                        <button 
                            onClick={onCompleteRoute}
                            className={`w-full py-3 px-4 rounded-xl text-white font-bold text-base shadow-lg border border-white/20 transform transition active:scale-95 bg-green-600/90 backdrop-blur-md hover:bg-green-600`}
                        >
                            ✅ 여기까지 연결하여 완성하기
                        </button>
                    )}

                    {nodeCount > 0 && (
                        <button 
                            onClick={onUndoRouteNode}
                            className="w-full py-2.5 px-2 rounded-xl text-slate-700 font-bold text-sm bg-white/90 backdrop-blur-md shadow border border-slate-200 transform transition active:scale-95 hover:bg-slate-50 flex items-center justify-center gap-1"
                        >
                            🔙 방금 추가한 지점 취소
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // ISSUE_DROP mode
    return (
        <div className="absolute inset-0 z-[1500] pointer-events-none flex flex-col items-center justify-center">
            <div className="absolute top-6 px-6 py-3 bg-black/70 backdrop-blur rounded-full text-white font-bold text-center animate-bounce shadow-2xl text-lg sm:text-xl border-2 border-white/30">
                지도를 움직여 과녁을 🎯 원하는 곳에 맞추세요
            </div>

            <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-red-500/20 w-32 h-32 -ml-16 -mt-16 animate-ping" />
                <Crosshair size={60} className="text-red-600 drop-shadow-[0_2px_10px_rgba(255,255,255,1)]" strokeWidth={2.5}/>
                <div className="absolute w-2 h-2 bg-red-600 rounded-full" />
            </div>

            <div className="absolute bottom-10 w-full px-6 flex flex-col justify-center pointer-events-auto max-w-sm mx-auto left-0 right-0">
                <button 
                    onClick={() => onSetIssue()}
                    className={`w-full py-5 px-6 rounded-2xl text-white font-extrabold text-2xl shadow-[0_15px_30px_rgba(0,0,0,0.4)] border-4 border-white/20 transform transition active:scale-95 bg-red-600 hover:bg-red-500`}
                >
                    🚨 이곳에 민원 접수하기
                </button>
            </div>
        </div>
    );
}

export default function CleaningMapClient({
    role,
    currentUser,
    workers = []
}: {
    role: 'admin' | 'worker',
    currentUser: { id: string, name: string, lat?: number, lng?: number },
    workers?: { id: string, name: string }[]
}) {
    const [isMounted, setIsMounted] = useState(false);
    const mapRef = useRef<L.Map | null>(null);
    
    const currentUserRole = role;
    const currentWorkerId = currentUser.id;
    const currentWorkerName = currentUser.name;
    
    // Core Data
    const [zones, setZones] = useState<Zone[]>([]);
    const [issues, setIssues] = useState<Issue[]>([]);
    const router = useRouter();
    
    // Address Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchFlyTarget, setSearchFlyTarget] = useState<[number, number] | null>(null);
    
    // UI States
    const [uiMode, setUiMode] = useState<UIMode>('IDLE');
    
    const [routeNodes, setRouteNodes] = useState<{lat: number, lng: number}[]>([]);
    const [isFetchingRoute, setIsFetchingRoute] = useState(false);
    
    // Admin Issue Drop Confirmation State
    const [pendingIssuePoint, setPendingIssuePoint] = useState<{lat: number, lng: number} | null>(null);
    const [suggestedWorker, setSuggestedWorker] = useState<Zone | null>(null);
    const [pendingAdminPhotoUrl, setPendingAdminPhotoUrl] = useState<string | null>(null);

    // Group Name Selection Modal State
    const [showGroupNameModal, setShowGroupNameModal] = useState(false);
    const [newGroupNameInput, setNewGroupNameInput] = useState('');

    const alarmRef = useRef<HTMLAudioElement | null>(null);
    const [showAlarmPopup, setShowAlarmPopup] = useState(false);
    const [currentZoom, setCurrentZoom] = useState(13);
    
    // Routing toggle mode: Direct line vs Driving snap
    const [isDirectMode, setIsDirectMode] = useState(true);

    useEffect(() => {
        setIsMounted(true);
        alarmRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

        const loadData = async () => {
            try {
                const fetchedZones = await getZonesAction();
                const fetchedIssues = await getIssuesAction();
                setZones(fetchedZones || []);
                setIssues(fetchedIssues || []);
            } catch (error) {
                console.error("Failed to load map data from server", error);
            }
        };

        loadData();
        const interval = setInterval(loadData, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            // Using free Nominatim API. Consider standardizing with debounce if rate issues occur.
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
            const data = await res.json();
            setSearchResults(data);
        } catch (error) {
            console.error("Geocoding failed", error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectSearchResult = (lat: string, lon: string) => {
        const target: [number, number] = [parseFloat(lat), parseFloat(lon)];
        setSearchFlyTarget(target);
        setUiMode('ISSUE_DROP');
        setSearchResults([]);
        // Optional: clear query
    };

    useEffect(() => {
        if (!isMounted) return;
        if (currentUserRole === 'worker') {
            const hasPending = issues.some(i => i.workerId === currentWorkerId && i.status === 'PENDING');
            if (hasPending) {
                setShowAlarmPopup(true);
                alarmRef.current?.play().catch(e => console.log('Audio error', e));
            } else {
                setShowAlarmPopup(false);
                alarmRef.current?.pause();
            }
        } else {
            setShowAlarmPopup(false);
            alarmRef.current?.pause();
        }
    }, [currentUserRole, currentWorkerId, issues, isMounted]);

    const defaultCenter: [number, number] = [
        currentUser.lat || 37.615246, 
        currentUser.lng || 126.715632
    ];

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

    // --- Action Handlers mapping to Target UI ---
    const handleAddRouteNode = (latlng: {lat: number, lng: number}) => {
        setRouteNodes(prev => [...prev, latlng]);
    };

    const handleCompleteRoute = () => {
        if (routeNodes.length < 2) {
            alert('최소 2개 이상의 경유지가 필요합니다.');
            return;
        }
        
        setShowGroupNameModal(true);
        setNewGroupNameInput('');
    };

    const finalizeRoute = (groupName: string) => {
        setShowGroupNameModal(false);
        setUiMode('IDLE');
        fetchRouteAndCreateZone(routeNodes, groupName.trim());
    };

    const handleSetIssueDrop = (latlng: {lat: number, lng: number}) => {
        const nearest = findNearestWorker(latlng.lat, latlng.lng);
        setPendingIssuePoint(latlng);
        setSuggestedWorker(nearest);
        setUiMode('IDLE'); // Hide target overlay to show confirmation dialog
    };

    const fetchRouteAndCreateZone = async (nodes: {lat: number, lng: number}[], groupName: string) => {
        setIsFetchingRoute(true);
        try {
            let pathCoords: [number, number][] = [];

            if (isDirectMode) {
                pathCoords = nodes.map(n => [n.lat, n.lng]);
            } else {
                const coordsString = nodes.map(n => `${n.lng},${n.lat}`).join(';');
                const url = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`;
                const res = await fetch(url);
                const data = await res.json();

                if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                    const coords = data.routes[0].geometry.coordinates;
                    pathCoords = coords.map((c: [number, number]) => [c[1], c[0]]);
                } else {
                    alert("해당 위치 근처에서 차량 도로망을 찾을 수 없습니다. (대신 직선으로 연결합니다)");
                    pathCoords = nodes.map(n => [n.lat, n.lng]);
                }
            }
            
            const workerId = currentUserRole === 'admin' ? (workers[0]?.id || currentWorkerId) : currentWorkerId;
            const workerDetail = workers.find(w => w.id === workerId) || { id: workerId, name: currentWorkerName };
            
            const newZone: Omit<Zone, 'workerName' | 'createdAt'> = {
                id: crypto.randomUUID(),
                path: pathCoords,
                isCleaned: false,
                workerId: workerDetail.id,
                groupName: groupName || undefined,
            };
            
            // Optimistic UI
            setZones(prev => [...prev, { ...newZone, workerName: workerDetail.name, createdAt: new Date().toISOString() }]);
            const result = await addZoneAction(newZone);
            if (!result.success) {
                alert('구역 저장 실패: ' + result.error);
            }
            
            getZonesAction().then(setZones);
        } catch (error) {
            alert("통신 연결에 실패했습니다.");
        } finally {
            setIsFetchingRoute(false);
            setRouteNodes([]);
            setUiMode('IDLE');
        }
    };

    const confirmIssue = async () => {
        if (!pendingIssuePoint || !suggestedWorker) return;
        const newIssue: Omit<Issue, 'workerName'> = {
            id: crypto.randomUUID(),
            lat: pendingIssuePoint.lat,
            lng: pendingIssuePoint.lng,
            workerId: suggestedWorker.workerId,
            status: 'PENDING',
            adminPhotoUrl: pendingAdminPhotoUrl || undefined,
            createdAt: new Date().toISOString()
        };
        // Optimistic UI
        setIssues(prev => [...prev, { ...newIssue, workerName: suggestedWorker.workerName, createdAt: new Date().toISOString() } as Issue]);
        
        await addIssueAction(newIssue);
        const refetched = await getIssuesAction();
        setIssues(refetched || []);

        setPendingIssuePoint(null);
        setSuggestedWorker(null);
        setPendingAdminPhotoUrl(null);
    };

    const cancelOperation = () => {
        setUiMode('IDLE');
        setRouteNodes([]);
        setPendingIssuePoint(null);
        setSuggestedWorker(null);
        setPendingAdminPhotoUrl(null);
        setShowGroupNameModal(false);
        setNewGroupNameInput('');
    };

    const toggleCleaningStatus = async (id: string) => {
        if (currentUserRole === 'admin') return; 
        const zone = zones.find(z => z.id === id);
        if (!zone) return;
        const newStatus = !zone.isCleaned;
        
        if (zone.groupName) {
            // Optimistic update all zones in the group
            setZones(prev => prev.map(z => z.groupName === zone.groupName ? { ...z, isCleaned: newStatus } : z));
            await toggleZoneGroupStatusAction(zone.groupName, newStatus);
        } else {
            // Optimistic update single zone
            setZones(prev => prev.map(z => z.id === id ? { ...z, isCleaned: newStatus } : z));
            await toggleZoneStatusAction(id, newStatus);
        }
        
        getZonesAction().then(setZones);
    };

    const deleteZone = async (id: string) => {
        setZones(prev => prev.filter(z => z.id !== id));
        await deleteZoneAction(id);
    };

    const handlePhotoUpload = (issueId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
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
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5);
                // Optimistic
                setIssues(prev => prev.map(i => i.id === issueId ? { ...i, photoUrl: compressedDataUrl } : i));
                updateIssuePhotoAndStatusAction(issueId, compressedDataUrl, 'PENDING').then(() => getIssuesAction().then(setIssues));
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleAdminPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
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
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5);
                setPendingAdminPhotoUrl(compressedDataUrl);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const resolveWorkerIssue = async (issueId: string) => {
        setIssues(prev => prev.map(i => i.id === issueId ? { ...i, status: 'WORKER_RESOLVED' } : i));
        const issue = issues.find(i => i.id === issueId);
        if (issue && issue.photoUrl) {
            await updateIssuePhotoAndStatusAction(issueId, issue.photoUrl, 'WORKER_RESOLVED');
        }
    };

    const closeAdminIssue = async (issueId: string) => {
        setIssues(prev => prev.map(i => i.id === issueId ? { ...i, status: 'CLOSED' } : i));
        await closeIssueAction(issueId);
    };

    const deleteAdminIssue = async (issueId: string) => {
        setIssues(prev => prev.filter(i => i.id !== issueId));
        await deleteIssueAction(issueId);
    };

    if (!isMounted) return null;

    return (
        <div className="relative w-full h-screen bg-blue-900 text-white font-sans flex flex-col overflow-hidden">
            
            {/* Alarm Overlay for Worker */}
            {showAlarmPopup && (
                <div className="absolute inset-0 z-[5000] bg-red-600/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-pulse">
                    <Siren size={100} className="text-white mb-6 animate-bounce" />
                    <h2 className="text-4xl text-center font-extrabold text-white mb-8 leading-tight">
                        긴급!<br/>구역 내 민원이 발생했습니다<br/>신속히 처리 바랍니다
                    </h2>
                    <button 
                        onClick={() => setShowAlarmPopup(false)}
                        className="bg-white text-red-600 px-10 py-5 rounded-full text-3xl font-extrabold shadow-[0_10px_40px_rgba(0,0,0,0.6)] active:scale-95 transition"
                    >
                        안내 닫고 지도 확인
                    </button>
                </div>
            )}
            
            {/* Absolute Home/Back Button */}
            <button 
                onClick={() => router.push(currentUserRole === 'admin' ? '/admin' : '/')}
                className="absolute top-6 left-6 z-[2000] bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 p-3 rounded-2xl shadow-xl flex items-center justify-center text-white transition pointer-events-auto active:scale-95"
            >
                <Home size={28} />
            </button>

            {/* Header */}
            <header className={`pt-28 pb-6 px-4 shadow-md z-10 flex flex-col items-center justify-center text-center transition-colors ${currentUserRole === 'admin' ? 'bg-slate-800' : 'bg-blue-800'}`}>
                {currentUserRole === 'admin' ? (
                    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
                        <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-yellow-300">전체 관리자 맵</h1>
                        <p className="text-md text-slate-300 mb-3">전체 근로자의 할당 구역 조망 및 민원 관제 센터입니다.</p>

                        {/* Address Search Bar */}
                        <form onSubmit={handleSearch} className="relative w-full max-w-md mx-auto mb-4 flex z-[2000]">
                            <input 
                                type="text"
                                placeholder="지번 또는 도로명 주소를 검색하세요..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-5 pr-12 py-3 rounded-2xl text-slate-900 border-0 outline-none shadow-inner"
                            />
                            <button disabled={isSearching} type="submit" className="absolute right-2 top-1.5 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition">
                                {isSearching ? <span className="animate-spin text-sm">⏳</span> : <Search size={20} />}
                            </button>

                            {searchResults.length > 0 && (
                                <ul className="absolute top-[110%] left-0 w-full bg-white text-slate-800 rounded-xl shadow-2xl z-[2000] overflow-hidden border border-slate-200">
                                    <li className="bg-slate-100 p-2 text-xs font-bold text-slate-500 text-left border-b">검색 결과 (가장 가까운 곳 터치)</li>
                                    {searchResults.map((res: any, idx) => (
                                        <li 
                                            key={idx} 
                                            className="px-4 py-3 hover:bg-blue-50 cursor-pointer text-left text-sm border-b last:border-b-0 flex items-center justify-between"
                                            onClick={() => handleSelectSearchResult(res.lat, res.lon)}
                                        >
                                            <span className="truncate max-w-[85%]">{res.display_name}</span>
                                            <span className="text-blue-500 font-bold ml-2">이동 👉</span>
                                        </li>
                                    ))}
                                    <li 
                                        className="p-2 text-center text-red-500 font-bold bg-red-50 hover:bg-red-100 cursor-pointer"
                                        onClick={() => setSearchResults([])}
                                    >
                                        결과창 닫기
                                    </li>
                                </ul>
                            )}
                        </form>
                        
                        <div className="flex gap-3 flex-wrap justify-center">
                            <button 
                                onClick={() => setUiMode('ROUTE_BUILDING')}
                                className={`font-bold py-3 px-6 rounded-2xl shadow-xl flex items-center gap-2 border-2 ${uiMode === 'ROUTE_BUILDING' ? 'bg-blue-600 border-blue-300 text-white animate-pulse' : 'bg-slate-700 border-slate-600 text-slate-200'}`}
                            >
                                <PlusCircle size={24} /> 구역 새로 그리기
                            </button>
                            <button 
                                onClick={() => setUiMode('ISSUE_DROP')}
                                className={`font-bold py-3 px-6 rounded-2xl shadow-xl flex items-center gap-2 border-2 ${uiMode === 'ISSUE_DROP' ? 'bg-red-600 border-red-300 text-white animate-pulse' : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'}`}
                            >
                                <Siren size={24} /> 현장 민원 핀 지시하기
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="w-full max-w-4xl mx-auto">
                        <h1 className="text-3xl sm:text-4xl font-extrabold mb-3">내 청소 구역 ({currentWorkerName})</h1>
                        <div className="flex items-end justify-center gap-2 mb-2">
                            <span className="text-2xl">오늘 {totalCount}곳 중</span>
                            <span className="text-green-400 text-4xl font-extrabold">{completedCount}곳</span>
                            <span className="text-2xl">완료!</span>
                        </div>
                        <div className="w-full max-w-lg mx-auto h-6 bg-blue-950 rounded-full overflow-hidden border-2 border-white/20 mt-2 mb-4">
                            <div 
                                className="h-full bg-green-500 transition-all duration-500"
                                style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
                            />
                        </div>

                        <div className="flex gap-3 flex-wrap justify-center mt-3">
                            <button 
                                onClick={() => setUiMode('ROUTE_BUILDING')}
                                className={`font-bold py-3 px-6 rounded-2xl shadow-xl flex items-center gap-2 border-2 ${uiMode === 'ROUTE_BUILDING' ? 'bg-blue-600 border-blue-300 text-white animate-pulse' : 'bg-slate-700 border-slate-600 text-slate-200'}`}
                            >
                                <PlusCircle size={24} /> 새 청소 구역 그리기
                            </button>
                            <button 
                                onClick={() => setUiMode('ISSUE_DROP')}
                                className={`font-bold py-3 px-6 rounded-2xl shadow-xl flex items-center gap-2 border-2 ${uiMode === 'ISSUE_DROP' ? 'bg-red-600 border-red-300 text-white animate-pulse' : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'}`}
                            >
                                <Siren size={24} /> 내 민원 핀 꽂기
                            </button>
                        </div>
                    </div>
                )}
            </header>

            {/* Group Name Selection Overlay */}
            {showGroupNameModal && (
                <div className="absolute inset-0 z-[3000] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 md:p-8 text-slate-800 w-full max-w-sm shadow-2xl animate-in zoom-in max-h-[90vh] flex flex-col">
                        <h2 className="text-2xl font-black mb-2 text-center text-blue-900">구역 이름 지정</h2>
                        <p className="text-sm text-slate-500 mb-6 text-center font-bold">같은 이름으로 지정하면 하나의 그룹으로 묶여 한 번에 청소 확인이 가능합니다.</p>
                        
                        <div className="flex-1 overflow-y-auto mb-6 custom-scrollbar pr-2">
                            {Array.from(new Set(zones.map(z => z.groupName).filter(Boolean))).length > 0 ? (
                                <div className="mb-6">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">기존에 만든 구역 선택</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {Array.from(new Set(zones.map(z => z.groupName).filter(Boolean))).map((gName, idx) => (
                                            <button 
                                                key={idx}
                                                onClick={() => finalizeRoute(gName as string)}
                                                className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border-2 border-blue-200 hover:border-blue-600 rounded-xl font-bold transition-all text-sm active:scale-95"
                                            >
                                                {gName}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-400 text-sm font-bold mb-6">
                                    아직 등록된 구역 그룹이 없습니다.
                                </div>
                            )}

                            <div>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">새로운 구역 이름 입력</h3>
                                <input 
                                    type="text"
                                    placeholder="예: 1구역, 남부, 공원 입구 등..."
                                    value={newGroupNameInput}
                                    onChange={e => setNewGroupNameInput(e.target.value)}
                                    className="w-full bg-slate-100 border-2 border-slate-200 outline-none p-4 rounded-xl font-bold text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white transition"
                                />
                                <button 
                                    onClick={() => finalizeRoute(newGroupNameInput)}
                                    disabled={!newGroupNameInput.trim()}
                                    className={`w-full mt-3 py-3 rounded-xl font-bold transform transition-all active:scale-95 border-2 ${newGroupNameInput.trim() ? "bg-blue-600 border-blue-700 text-white shadow-lg" : "bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed"}`}
                                >
                                    이 이름으로 생성하기
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button 
                                onClick={() => finalizeRoute('')}
                                className="flex-1 py-3 px-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition"
                            >
                                건너뛰기 (이름없음)
                            </button>
                            <button 
                                onClick={() => setShowGroupNameModal(false)}
                                className="flex-1 py-3 px-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl font-bold transition"
                            >
                                취소
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Issue Drop Confirm Dialog */}
            {pendingIssuePoint && (
                <div className="absolute inset-0 z-[3000] bg-black/70 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 text-slate-800 w-full max-w-sm text-center shadow-2xl animate-in zoom-in max-h-[90vh] overflow-y-auto">
                        <Siren size={60} className="text-red-500 mx-auto mb-4" />
                        <h2 className="text-3xl font-black mb-4">민원구역 할당 확인</h2>
                        {suggestedWorker ? (
                            <p className="text-xl font-bold mb-6">
                                타겟팅하신 위치는 <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block mx-1">{suggestedWorker.workerName}</span>의 구역과 가장 가깝습니다.<br/><br/>
                                이 담당자에게 즉시 사이렌을 보낼까요?
                            </p>
                        ) : (
                            <p className="text-lg font-bold mb-6 text-red-500">
                                반경 맵 내에 소속된 작업자가 없습니다.<br/>그래도 임의로 배정(김반장)하시겠습니까?
                            </p>
                        )}

                        <div className="mb-6">
                            {pendingAdminPhotoUrl ? (
                                <div className="relative">
                                    <img src={pendingAdminPhotoUrl} alt="현장 사진 미리보기" className="w-full h-32 object-cover rounded-xl border-4 border-red-500 shadow-md" />
                                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">사진 첨부됨</div>
                                    <button 
                                        onClick={() => setPendingAdminPhotoUrl(null)} 
                                        className="absolute bottom-2 right-2 bg-white text-red-600 px-3 py-1 rounded-lg text-sm font-bold shadow-md hover:bg-red-50"
                                    >
                                        사진 삭제
                                    </button>
                                </div>
                            ) : (
                                <label className="w-full bg-slate-100 border-4 border-dashed border-slate-300 hover:bg-slate-200 text-slate-600 min-h-[80px] rounded-2xl flex flex-col items-center justify-center cursor-pointer active:bg-slate-300 transition shadow-inner p-2">
                                    <Camera size={30} className="mb-1 text-slate-400" />
                                    <span className="font-bold text-lg">참고용 현장 사진 첨부 (선택)</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleAdminPhotoUpload}/>
                                </label>
                            )}
                        </div>

                        <div className="flex flex-col gap-3">
                            <button onClick={confirmIssue} className="w-full py-4 bg-red-600 text-white font-bold rounded-2xl text-2xl shadow-xl border-4 border-red-700 active:bg-red-700">과녁 위치에 발령 완료</button>
                            <button onClick={cancelOperation} className="w-full py-3 bg-slate-200 text-slate-700 font-bold rounded-2xl text-xl">돌아가기</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Map Area */}
            <main className="flex-1 relative bg-slate-200">
                {isFetchingRoute && (
                    <div className="absolute inset-0 z-[2000] bg-black/50 flex flex-col items-center justify-center backdrop-blur-sm">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 mb-4"></div>
                        <span className="text-3xl font-bold bg-blue-900 border-4 border-white px-8 py-4 rounded-3xl shadow-2xl animate-pulse">
                            도로 자동 탐색 중...
                        </span>
                    </div>
                )}

                <MapContainer ref={mapRef} center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }} zoomControl={false}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* Applies auto bounding box zoom when data changes */}
                    <MapBoundsFitter zones={visibleZones} issues={visibleIssues} />
                    <MapFlyTo target={searchFlyTarget} />
                    <MapZoomTracker onZoomChange={setCurrentZoom} />

                    {routeNodes.map((node, idx) => (
                        <Marker key={idx} position={[node.lat, node.lng]} icon={markerIcon} />
                    ))}
                    {routeNodes.length > 1 && (
                        <Polyline positions={routeNodes.map(n => [n.lat, n.lng])} color="blue" dashArray="10, 10" weight={4} />
                    )}

                    {issues.filter(i => i.status !== 'CLOSED').map((issue) => {
                        if (currentUserRole === 'worker' && issue.workerId !== currentWorkerId) return null;

                        const isResolvedByWorker = issue.status === 'WORKER_RESOLVED';
                        const icon = isResolvedByWorker ? resolvedIssueIcon : pendingIssueIcon;
                        return (
                            <Marker key={issue.id} position={[issue.lat, issue.lng]} icon={icon}>
                                <Popup autoPanPadding={[50, 50]} closeButton={false}>
                                    <div className="text-center w-[260px] max-h-[35vh] overflow-y-auto overflow-x-hidden p-2 flex flex-col gap-3 custom-scrollbar">
                                        {currentUserRole === 'admin' ? (
                                            <>
                                                <h3 className="text-xl font-bold text-slate-800 border-b pb-2">
                                                    {isResolvedByWorker ? '✅ 조치 완료된 민원' : '🚨 미처리 민원 대기중'}
                                                </h3>
                                                <p className="text-sm font-bold text-slate-600 text-left">담당: {issue.workerName}</p>
                                                
                                                {issue.adminPhotoUrl && !isResolvedByWorker && (
                                                    <div className="mt-2 text-left">
                                                        <p className="text-xs font-bold text-slate-500 mb-1">첨부했던 현장사진</p>
                                                        <img src={issue.adminPhotoUrl} alt="민원 상황" className="w-full h-20 object-cover rounded-md mb-2 shadow-sm border" />
                                                    </div>
                                                )}

                                                {isResolvedByWorker && issue.photoUrl ? (
                                                    <div className="bg-slate-100 rounded-lg p-2 border border-slate-300 shadow-inner">
                                                        <p className="text-xs font-bold text-slate-500 mb-2">근로자 첨부 완료 사진</p>
                                                        <img src={issue.photoUrl} alt="현장 보고" className="w-full h-24 object-cover rounded-md mb-2 shadow-sm border" />
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); closeAdminIssue(issue.id); }}
                                                            className="w-full bg-green-600 hover:bg-green-700 text-white min-h-[50px] rounded-xl flex items-center justify-center gap-2 text-lg font-extrabold shadow-md transform active:scale-95 mt-1"
                                                        >
                                                            <CheckCircle size={20} /> 종결 완료
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); deleteAdminIssue(issue.id); }}
                                                        className="w-full bg-slate-200 text-slate-600 min-h-[40px] rounded-xl font-bold mt-2 hover:bg-red-100 hover:text-red-600"
                                                    >
                                                        접수 취소 (삭제)
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <div className="bg-red-50 text-red-700 py-2 rounded-xl mb-1 border border-red-200 shadow-sm">
                                                    <h3 className="text-xl font-black">{isResolvedByWorker ? '보고서 제출완료 대기' : '🚨 긴급! 이곳을 확인하세요'}</h3>
                                                </div>
                                                
                                                {!isResolvedByWorker ? (
                                                    <div className="flex flex-col gap-3">
                                                        {issue.adminPhotoUrl && (
                                                            <div className="text-left mb-1">
                                                                <p className="text-xs font-bold text-slate-500 mb-1">관리자 첨부 현장사진</p>
                                                                <img src={issue.adminPhotoUrl} alt="민원 상황" className="w-full h-20 object-cover rounded-xl border border-slate-300 shadow-sm" />
                                                            </div>
                                                        )}
                                                        
                                                        {issue.photoUrl ? (
                                                            <div className="relative">
                                                                <img src={issue.photoUrl} alt="Preview" className="w-full h-24 object-cover rounded-xl border-4 border-green-500 shadow-md" />
                                                                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">사진 등록완료</div>
                                                            </div>
                                                        ) : (
                                                            <label className="w-full bg-slate-100 border-4 border-dashed border-slate-300 hover:bg-blue-50 text-slate-600 min-h-[80px] rounded-2xl flex flex-col items-center justify-center cursor-pointer active:bg-blue-100 transition shadow-inner">
                                                                <Camera size={40} className="mb-2 text-slate-400" />
                                                                <span className="font-extrabold text-xl">현장 사진 촬영</span>
                                                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoUpload(issue.id, e)}/>
                                                            </label>
                                                        )}
                                                        
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); resolveWorkerIssue(issue.id); }}
                                                            disabled={!issue.photoUrl}
                                                            className={`w-full min-h-[60px] rounded-2xl flex items-center justify-center gap-2 text-xl font-black shadow-lg transition-transform active:scale-95 border-2 ${
                                                                issue.photoUrl ? 'bg-green-600 text-white shadow-green-600/50 border-green-400' : 'bg-slate-300 text-slate-400 border-slate-200 cursor-not-allowed'
                                                            }`}
                                                        >
                                                            <CheckCircle2 size={30} /> {issue.photoUrl ? '보고 전송 완료' : '사진 등록 대기'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <p className="text-md font-bold text-slate-500 italic py-4">담당 관리자의 승인을 기다리고 있습니다.</p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}

                    {visibleZones.map((zone) => {
                        const isDone = zone.isCleaned;
                        const color = isDone ? '#22c55e' : '#ef4444'; 
                        // 줌 레벨에 비례하여 실제 도로 폭(지리적 크기)에 맞게 굵기 조정 
                        // OSM 기준 줌 18에서 도로폭이 약 16~20px 정도임
                        const weightAtZoom18 = typeof window !== 'undefined' && window.innerWidth > 600 ? 16 : 20;
                        const dynamicWeight = Math.max(4, weightAtZoom18 * Math.pow(2, currentZoom - 18));

                        return (
                            <Polyline
                                key={zone.id}
                                positions={zone.path}
                                pathOptions={{ color: color, weight: dynamicWeight, opacity: 0.8 }}
                            >
                                <Popup autoPanPadding={[50, 50]} closeButton={false}>
                                    <div className="text-center w-[250px] sm:w-[280px] p-3 flex flex-col gap-3 max-h-[35vh] overflow-y-auto custom-scrollbar">
                                        {currentUserRole === 'admin' ? (
                                            <>
                                                <div className="bg-slate-50 text-slate-800 rounded-xl p-3 font-bold border-2 border-slate-200 shadow-inner">
                                                    <div className="text-sm text-slate-500 mb-1">담당 구역 마스터</div>
                                                    <div className="text-2xl text-blue-700 mb-3">{zone.workerName}</div>
                                                    {zone.groupName && (
                                                        <div className="bg-slate-200 text-slate-700 text-sm font-bold py-1 px-3 rounded-full mb-3 inline-block">
                                                            {zone.groupName}
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
                                                    <Trash2 size={24} /> 이 도로 지우기
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                {zone.groupName && (
                                                    <div className="bg-blue-100 text-blue-800 text-sm font-black py-1 px-3 rounded-md mb-2 inline-block">
                                                        {zone.groupName}
                                                    </div>
                                                )}
                                                <h3 className="text-2xl font-black text-slate-800 mb-2 mt-2">
                                                    {isDone ? '✨ 이 도로는 깨끗합니다' : '🧹 청소를 시작할까요?'}
                                                </h3>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); toggleCleaningStatus(zone.id); }}
                                                    className={`w-full min-h-[120px] rounded-3xl flex items-center justify-center gap-2 text-3xl font-black shadow-2xl text-white transform active:scale-95 transition-all ${
                                                        isDone ? 'bg-slate-600 hover:bg-slate-700 border-4 border-slate-400' : 'bg-green-500 hover:bg-green-600 border-4 border-green-300 shadow-green-500/30'
                                                    }`}
                                                >
                                                    {isDone ? (
                                                        <><XCircle size={44} /> 청소 취소</>
                                                    ) : (
                                                        <><CheckCircle2 size={44} /> 길 청소 완료!</>
                                                    )}
                                                </button>                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); deleteZone(zone.id); }}
                                                    className="w-full bg-slate-200 hover:bg-red-100 text-slate-600 hover:text-red-600 min-h-[40px] mt-3 rounded-xl flex items-center justify-center gap-2 text-md font-bold transition-all"
                                                >
                                                    <Trash2 size={18} /> 잘못 그린 이 도로 지우기
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

                <TargetOverlays 
                    uiMode={uiMode} 
                    routeNodes={routeNodes}
                    isDirectMode={isDirectMode}
                    setIsDirectMode={setIsDirectMode}
                    onAddRouteNode={() => {
                        if (mapRef.current) handleAddRouteNode(mapRef.current.getCenter());
                    }}
                    onUndoRouteNode={() => setRouteNodes(prev => prev.slice(0, -1))}
                    onCancelRoute={() => { setRouteNodes([]); setUiMode('IDLE'); }}
                    onCompleteRoute={handleCompleteRoute}
                    onSetIssue={() => {
                        if (mapRef.current) handleSetIssueDrop(mapRef.current.getCenter());
                    }}
                />
            </main>

            {/* Worker Floating Central ADD ZONE Button (when IDLE) */}
            {currentUserRole === 'worker' && uiMode === 'IDLE' && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-sm">
                    <button
                        onClick={() => setUiMode('ROUTE_BUILDING')}
                        className="w-full py-5 bg-blue-600 text-white rounded-full shadow-[0_15px_30px_rgba(0,0,0,0.5)] flex items-center justify-center gap-3 border-4 border-blue-400 transform transition active:scale-95"
                    >
                        <PlusCircle size={36} />
                        <span className="text-2xl font-extrabold tracking-wide">내 청소구역 추가</span>
                    </button>
                </div>
            )}
            
            {/* CANCEL UI Button */}
            {uiMode !== 'IDLE' && (
                <div className="absolute top-[100px] sm:top-28 right-4 z-[2000]">
                    <button
                        onClick={cancelOperation}
                        className="p-2.5 px-4 bg-white/95 backdrop-blur shadow-lg border border-slate-200 rounded-full flex items-center justify-center gap-2 active:bg-slate-100 transition-all font-bold text-slate-700 text-sm"
                    >
                        <XCircle size={18} className="text-red-500" />
                        <span>작업 취소</span>
                    </button>
                </div>
            )}
        </div>
    );
}
