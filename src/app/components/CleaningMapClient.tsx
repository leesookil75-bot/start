'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Polygon, Popup, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as turf from '@turf/turf';
import { CheckCircle2, XCircle, Trash2, PlusCircle, Users, User, Camera, Siren, CheckCircle, Crosshair, Home, Search, List, Edit2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Capacitor, registerPlugin } from '@capacitor/core';
const BackgroundGeolocation = registerPlugin<any>('BackgroundGeolocation');

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
    deleteIssueAction,
    renameZoneGroupAction,
    deleteZoneGroupAction,
    getMapboxTokenAction
} from '@/app/actions';

type UIMode = 'IDLE' | 'ROUTE_CHOICE' | 'ROUTE_BUILDING' | 'ROUTE_GPS_READY' | 'ROUTE_GPS' | 'ISSUE_DROP' | 'GROUP_LIST';

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

// 좌표 스무딩 알고리즘 (삐죽하게 튀는 GPS 잡음을 부드러운 곡선으로 마사지)
function smoothPathAngles(coords: [number, number][], iterations = 2): [number, number][] {
    if (coords.length < 3) return coords;
    let result = [...coords];
    for (let iter = 0; iter < iterations; iter++) {
        const temp: [number, number][] = [result[0]];
        for (let i = 1; i < result.length - 1; i++) {
            const prev = result[i - 1];
            const curr = result[i];
            const next = result[i + 1];
            // 3점의 평균을 내어 모서리(각)를 둥글게 깎음
            temp.push([
                (prev[0] + curr[0] + next[0]) / 3,
                (prev[1] + curr[1] + next[1]) / 3,
            ]);
        }
        temp.push(result[result.length - 1]);
        result = temp;
    }
    return result;
}

// 서버(OSRM) 한계를 우회하기 위해 전체 좌표를 최대 80개의 대표 힌트로 압축하는 함수 (Data Diet)
function downsampleNodes(nodes: {lat: number, lng: number}[], maxNodes = 80): {lat: number, lng: number}[] {
    if (nodes.length <= maxNodes) return nodes;
    const step = nodes.length / maxNodes;
    const sampled = [];
    for (let i = 0; i < maxNodes; i++) {
        sampled.push(nodes[Math.floor(i * step)]);
    }
    // 마지막 목적지도 끄트머리에 확실히 포함시켜 줍니다
    if (sampled[sampled.length - 1] !== nodes[nodes.length - 1]) {
        sampled[sampled.length - 1] = nodes[nodes.length - 1];
    }
    return sampled;
}

function getZonePoints(path: any): [number, number][] {
    if (!path || path.length === 0) return [];
    if (Array.isArray(path[0][0])) return path[0];
    return path;
}

// Fit bounds to visible data only on initial load to prevent hijacking user zoom/pan
function MapBoundsFitter({ zones, issues }: { zones: Zone[], issues: Issue[] }) {
    const map = useMap();
    const hasFitted = useRef(false);
    
    useEffect(() => {
        if (hasFitted.current) return;

        const bounds = new L.LatLngBounds([]);
        let hasPoints = false;

        // 대한민국 전체(혹은 기타 엉뚱한 위치)에 찍힌 테스트용 데이터 때문에 지도가 전국구 단위로 넓어지는 것을 방지
        // 김포/수도권 일대 좌표만 유효하게 취급하여 바운드 박스 생성
        const isValidArea = (lat: number, lng: number) => lat > 37.4 && lat < 37.8 && lng > 126.4 && lng < 127.2;

        zones.forEach(z => {
            getZonePoints(z.path).forEach((pt: any) => {
                const [lat, lng] = pt as [number, number];
                if (isValidArea(lat, lng)) {
                    bounds.extend([lat, lng]);
                    hasPoints = true;
                }
            });
        });

        issues.forEach(i => {
            if (isValidArea(i.lat, i.lng)) {
                bounds.extend([i.lat, i.lng]);
                hasPoints = true;
            }
        });

        if (hasPoints && bounds.isValid()) {
            // 첫 번째 구역의 중심점 찾기
            let targetCenter: L.LatLngExpression = bounds.getCenter();
            if (zones.length > 0 && zones[0].path.length > 0) {
                const zBounds = new L.LatLngBounds([]);
                getZonePoints(zones[0].path).forEach((pt: any) => zBounds.extend(pt as [number, number]));
                targetCenter = zBounds.getCenter();
            } else if (issues.length > 0) {
                targetCenter = [issues[0].lat, issues[0].lng] as L.LatLngTuple;
            }

            setTimeout(() => {
                map.invalidateSize();
                const targetLatLng = L.latLng(targetCenter);
                const targetPoint = map.project(targetLatLng, 17);
                targetPoint.y -= 80; // 화면 위 가림막(배너)을 피하기 위해 시점을 80px 위(북쪽)로 올려 구역을 화면 아래로 내림
                const offsetCenter = map.unproject(targetPoint, 17);
                map.setView(offsetCenter, 17, { animate: false }); 
            }, 500); 
            hasFitted.current = true;
        } else if (!hasPoints) {
            // 데이터가 아예 없을 경우 (혹은 아직 다운로드 중일 경우) 기본 김포 시청 부근으로 임시 설정하되,
            // later에 데이터가 들어오면 다시 중앙정렬을 탈 수 있도록 Lock(hasFitted)을 걸지 않습니다.
            map.setView([37.615246, 126.715632], 17);
        }
    }, [zones, issues, map]); 

    return null;
}

// Controls inside Map
function CustomZoomControls({ zones, issues }: { zones?: Zone[], issues?: Issue[] }) {
    const map = useMap();
    
    const handleFitBounds = () => {
        if (!zones || !issues) return;
        const bounds = new L.LatLngBounds([]);
        let hasPoints = false;
        const isValidArea = (lat: number, lng: number) => lat > 37.4 && lat < 37.8 && lng > 126.4 && lng < 127.2;
        
        zones.forEach(z => { getZonePoints(z.path).forEach((pt: any) => { 
            const [lat, lng] = pt as [number, number];
            if (isValidArea(lat, lng)) { bounds.extend([lat, lng]); hasPoints = true; }
        }); });
        issues.forEach(i => { 
            if (isValidArea(i.lat, i.lng)) { bounds.extend([i.lat, i.lng]); hasPoints = true; }
        });
        
        if (hasPoints && bounds.isValid()) {
             let targetCenter: L.LatLngExpression = bounds.getCenter();
             if (zones.length > 0 && zones[0].path.length > 0) {
                 const zBounds = new L.LatLngBounds([]);
                 getZonePoints(zones[0].path).forEach((pt: any) => zBounds.extend(pt as [number, number]));
                 targetCenter = zBounds.getCenter();
             } else if (issues.length > 0) {
                 targetCenter = [issues[0].lat, issues[0].lng] as L.LatLngTuple;
             }
             map.invalidateSize();
             const targetLatLng = L.latLng(targetCenter);
             const targetPoint = map.project(targetLatLng, 17);
             targetPoint.y -= 80;
             const offsetCenter = map.unproject(targetPoint, 17);
             map.flyTo(offsetCenter, 17, { animate: true, duration: 1 });
        } else {
             map.flyTo([37.615246, 126.715632], 17, { animate: true, duration: 1 });
        }
    };

    return (
        <div className="absolute bottom-32 sm:bottom-8 right-4 sm:right-8 z-[1000] flex flex-col gap-3">
            {zones && issues && (
                <button onClick={(e) => { e.stopPropagation(); handleFitBounds(); }} className="w-16 h-16 sm:w-20 sm:h-20 bg-white text-blue-600 rounded-full shadow-2xl flex items-center justify-center font-bold border-4 border-slate-200 active:bg-slate-200 hover:border-blue-400 transition" title="전체 구역 화면 꽉 차게 보기">
                    <Crosshair size={32} />
                </button>
            )}
            <div className="flex flex-col gap-2 mt-1">
                <button onClick={(e) => { e.stopPropagation(); map.zoomIn(); }} className="w-16 h-16 sm:w-20 sm:h-20 bg-white text-slate-800 rounded-full shadow-2xl flex items-center justify-center text-4xl font-bold border-4 border-slate-200 active:bg-slate-200 hover:border-slate-300">
                    +
                </button>
                <button onClick={(e) => { e.stopPropagation(); map.zoomOut(); }} className="w-16 h-16 sm:w-20 sm:h-20 bg-white text-slate-800 rounded-full shadow-2xl flex items-center justify-center text-5xl font-bold border-4 border-slate-200 active:bg-slate-200 hover:border-slate-300">
                    -
                </button>
            </div>
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
    isDirectMode,
    setIsDirectMode,
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
    const [focusedGroup, setFocusedGroup] = useState<string | null>(null);
    
    const [routeNodes, setRouteNodes] = useState<{lat: number, lng: number}[]>([]);
    const [isFetchingRoute, setIsFetchingRoute] = useState(false);
    
    // GPS Recording State
    const [gpsNodes, setGpsNodes] = useState<{lat: number, lng: number}[]>([]);
    const watchIdRef = useRef<number | string | null>(null);
    
    // Admin Issue Drop Confirmation State
    const [pendingIssuePoint, setPendingIssuePoint] = useState<{lat: number, lng: number} | null>(null);
    const [suggestedWorker, setSuggestedWorker] = useState<Zone | null>(null);
    const [pendingAdminPhotoUrl, setPendingAdminPhotoUrl] = useState<string | null>(null);

    const [showGroupNameModal, setShowGroupNameModal] = useState(false);
    const [newGroupNameInput, setNewGroupNameInput] = useState('');

    const alarmRef = useRef<HTMLAudioElement | null>(null);
    const [showAlarmPopup, setShowAlarmPopup] = useState(false);
    const [ackedIssues, setAckedIssues] = useState<string[]>([]);
    const [currentZoom, setCurrentZoom] = useState(17);
    
    // Routing toggle mode: Direct line vs Footpath snap
    const [isDirectMode, setIsDirectMode] = useState(false);
    const isRouteFromGpsRef = useRef(false);

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
            const hasUnacked = issues.some(i => i.workerId === currentWorkerId && i.status === 'PENDING' && !ackedIssues.includes(i.id));
            if (hasUnacked) {
                setShowAlarmPopup(true);
                alarmRef.current?.play().catch(e => console.log('Audio error', e));
            } else {
                if (showAlarmPopup && !issues.some(i => i.workerId === currentWorkerId && i.status === 'PENDING')) {
                   setShowAlarmPopup(false);
                }
                alarmRef.current?.pause();
            }
        } else {
            setShowAlarmPopup(false);
            alarmRef.current?.pause();
        }
    }, [currentUserRole, currentWorkerId, issues, isMounted, ackedIssues, showAlarmPopup]);

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
            getZonePoints(z.path).forEach((pt: any) => {
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
        const fromGps = isRouteFromGpsRef.current;
        isRouteFromGpsRef.current = false;

        try {
            let pathCoords: [number, number][] = [];

            if (isDirectMode) {
                // 온전한 수동 직결 모드
                pathCoords = nodes.map(n => [n.lat, n.lng]);
            } else if (fromGps || nodes.length > 20) {
                // GPS 스캔 모드: 오차 보정용 맵 매칭 알고리즘 (Mapbox AI)
                const sampledNodes = downsampleNodes(nodes, 80);
                const coordsString = sampledNodes.map(n => `${n.lng},${n.lat}`).join(';');
                // 각 좌표 반경 50m를 허용치로 주어 흔들리는 GPS를 강제 편입 (Map Matching)
                const radiuses = sampledNodes.map(() => '50').join(';');
                
                // 서버 액션을 통해 런타임에 동적으로 토큰을 받아옵니다 (Vercel 빌드타임 환경 변수 띄어쓰기 버그 완전 우회)
                const token = await getMapboxTokenAction();
                
                if (!token) {
                    console.error("Mapbox token is missing from server environment variables.");
                    throw new Error('Mapbox Token Missing');
                }
                
                const url = `https://api.mapbox.com/matching/v5/mapbox/walking/${coordsString}?radiuses=${radiuses}&geometries=geojson&steps=false&access_token=${token}`;
                
                try {
                    const res = await fetch(url);
                    const data = await res.json();
                    
                    if (data.code === 'Ok' && data.matchings && data.matchings.length > 0) {
                        // 첫번째 매칭된 선형 추출 (가장 확률이 높은 도로)
                        const coords = data.matchings[0].geometry.coordinates;
                        
                        // Turf.js를 사용하여 매칭된 경로를 기반으로 3m 반경의 다각형(면적) 추출
                        const line = turf.lineString(coords); // [lng, lat] 배열
                        const buffered = turf.buffer(line, 3, { units: 'meters' });
                        
                        if (buffered && buffered.geometry.type === 'Polygon') {
                            // Turf의 Polygon은 [lng, lat]를 사용하므로, Leaflet이 사용하는 [lat, lng]로 뒤집어줍니다.
                            // 외부 링(배열의 첫번째 요소)만 추출하여 하나의 단일 구역으로 구성
                            const polygonCoords = buffered.geometry.coordinates[0].map((c: any) => [c[1], c[0]] as [number, number]);
                            pathCoords = [polygonCoords] as any; // 타입 호환성을 위해 any 캐스팅, 실제로는 [ [lat, lng], ... ] 의 중첩 배열
                        } else {
                            // 폴리곤 생성에 실패하면 단순 라인 배열 반환
                            pathCoords = coords.map((c: [number, number]) => [c[1], c[0]]);
                        }
                    } else {
                        throw new Error('Matching Engine Failed');
                    }
                } catch (e) {
                    console.warn("Map matching failed, gracefully falling back to raw GPS route", e);
                    // Match 실패 시 무조건 원본 연결로 안전하게 Fallback 보장하되,
                    // 점이 너무 많으면 DB 저장 크기(Payload) 초과로 뻗거나 메모리 에러가 발생하므로 100개로 압축합니다.
                    const safeRawNodes = downsampleNodes(nodes, 100);
                    
                    // 폴리마사지 (스무딩)
                    let smoothed = smoothPathAngles(safeRawNodes.map(n => [n.lat, n.lng]), 3);
                    const turfCoords = smoothed.map(c => [c[1], c[0]]); // [lng, lat] for Turf
                    
                    if (turfCoords.length > 1) {
                        try {
                            const line = turf.lineString(turfCoords);
                            const buffered = turf.buffer(line, 3.5, { units: 'meters' });
                            if (buffered && buffered.geometry.type === 'Polygon') {
                                const polygonCoords = buffered.geometry.coordinates[0].map((c: any) => [c[1], c[0]] as [number, number]);
                                pathCoords = [polygonCoords] as any;
                            } else {
                                pathCoords = smoothed;
                            }
                        } catch (err) {
                            pathCoords = smoothed;
                        }
                    } else {
                        pathCoords = smoothed;
                    }
                }
            } else {
                // 수동 그리기 모드
                // 외부 OSRM 연결 없이, 사용자가 그린 궤적 그대로 연결하여 면적화(Polygon)
                const safeNodes = downsampleNodes(nodes, 150); // 수동 드래그 시 포인트 폭주 방지압축
                const coords = safeNodes.map(n => [n.lng, n.lat]);
                
                if (coords.length > 1) {
                    try {
                        const line = turf.lineString(coords); 
                        const buffered = turf.buffer(line, 3, { units: 'meters' });
                        
                        if (buffered && buffered.geometry.type === 'Polygon') {
                            const polygonCoords = buffered.geometry.coordinates[0].map((c: any) => [c[1], c[0]] as [number, number]);
                            pathCoords = [polygonCoords] as any;
                        } else {
                            pathCoords = safeNodes.map(n => [n.lat, n.lng]);
                        }
                    } catch (e) {
                        pathCoords = safeNodes.map(n => [n.lat, n.lng]);
                    }
                } else {
                    pathCoords = safeNodes.map(n => [n.lat, n.lng]);
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

    const handleRenameGroup = async (oldName: string) => {
        const newName = prompt(`'${oldName}' 구역의 새 이름을 입력하세요:`, oldName);
        if (!newName || newName.trim() === '' || newName === oldName) return;
        
        await renameZoneGroupAction(currentWorkerId || '', oldName, newName.trim());
        getZonesAction().then(setZones);
    };

    const handleDeleteGroup = async (groupName: string) => {
        if (!confirm(`정말 '${groupName}' 구역 전체를 삭제하시겠습니까?\n(묶여있는 모든 블록이 영구 삭제됩니다)`)) return;
        await deleteZoneGroupAction(currentWorkerId || '', groupName);
        getZonesAction().then(setZones);
    };

    const focusGroupCoords = (groupName: string) => {
        if (!mapRef.current) return;
        const groupZones = zones.filter(z => z.groupName === groupName && (currentUserRole === 'admin' || z.workerId === currentWorkerId));
        if (groupZones.length === 0) return;
        
        const allPoints: [number, number][] = [];
        groupZones.forEach(z => {
            z.path.forEach(p => {
                if (Array.isArray(p[0])) { 
                    (p as unknown as [number, number][]).forEach(c => allPoints.push(c));
                } else {
                    allPoints.push(p as [number, number]);
                }
            });
        });
        
        if (allPoints.length > 0) {
            setFocusedGroup(groupName);
            const bounds = L.latLngBounds(allPoints);
            mapRef.current.fitBounds(bounds, { padding: [50, 50], animate: true });
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

    const prepareGpsRecording = () => {
        setUiMode('ROUTE_GPS_READY');
        setGpsNodes([]);
        
        if (!navigator.geolocation) {
           alert('GPS를 지원하지 않는 기기입니다.');
           setUiMode('IDLE');
           return;
        }

        navigator.geolocation.getCurrentPosition((pos) => {
             const { latitude, longitude } = pos.coords;
             if (mapRef.current) {
                 mapRef.current.setView([latitude, longitude], 18, { animate: true });
             }
        }, () => {
             alert('위치 정보 접근 권한이 필요합니다.');
             setUiMode('IDLE');
        }, { enableHighAccuracy: true, maximumAge: 0 });
    };

    const startGpsRecording = async () => {
        setUiMode('ROUTE_GPS');
        setGpsNodes([]);
        
        const handleLocation = (latitude: number, longitude: number, accuracy: number) => {
            // 오차 반경이 너무 크면 기지국/와이파이 등으로 부정확하게 튄 데이터이므로 버림
            if (accuracy > 30) return;

            // 지도 실시간 이동 (Auto-pan)
            if (mapRef.current) {
                mapRef.current.panTo([latitude, longitude], { animate: true });
            }
            
            setGpsNodes(prev => {
                const newPt = { lat: latitude, lng: longitude };
                if (prev.length === 0) return [newPt];
                
                const lastPt = prev[prev.length - 1];
                const dist = L.latLng(lastPt.lat, lastPt.lng).distanceTo(L.latLng(latitude, longitude));
                
                // 3미터 이상 이동했을 때만 추가. 단, 순간이동(스파이크) 데이터 무시.
                // 보통 짧은 시간에 200m 이상 멀어지면 비정상 튐 데이터.
                if (dist > 3 && dist < 200) {
                    return [...prev, newPt];
                }
                return prev;
            });
        };

        if (Capacitor.isNativePlatform()) {
             try {
                 const watcherId = await BackgroundGeolocation.addWatcher(
                     {
                         backgroundMessage: "안심 동선을 안전하게 추적하고 있습니다.",
                         backgroundTitle: "위치 기록 중",
                         requestPermissions: true,
                         stale: false,
                         distanceFilter: 3 // 미터 단위 움직임 감지
                     },
                     (location: any, error: any) => {
                         if (error || !location) {
                             if (error?.code !== 'NOT_AUTHORIZED') { console.warn(error); }
                             return;
                         }
                         handleLocation(location.latitude, location.longitude, location.accuracy || 10);
                     }
                 );
                 watchIdRef.current = watcherId;
             } catch (e) {
                 console.error("Background Geolocation err:", e);
                 alert('위치 서비스 시작에 실패했습니다. (Background Plugin)');
                 setUiMode('IDLE');
             }
        } else {
             if (!navigator.geolocation) return;
             watchIdRef.current = navigator.geolocation.watchPosition(
                 (pos) => {
                     handleLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
                 },
                 (err) => {
                     console.error('GPS 에러', err);
                     alert('위치 정보 접근 권한을 허용해 주셔야 합니다.');
                     setUiMode('IDLE');
                     if (typeof watchIdRef.current === 'number') {
                         navigator.geolocation.clearWatch(watchIdRef.current);
                         watchIdRef.current = null;
                     }
                 },
                 { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
             );
        }
    };

    const stopGpsRecording = () => {
        if (watchIdRef.current !== null) {
            if (Capacitor.isNativePlatform() && typeof watchIdRef.current === 'string') {
                BackgroundGeolocation.removeWatcher({ id: watchIdRef.current });
            } else if (typeof watchIdRef.current === 'number') {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
            watchIdRef.current = null;
        }
        
        if (gpsNodes.length < 2) {
            alert('기록된 동선이 너무 짧습니다. 다시 시도해주세요.');
            setUiMode('IDLE');
            setGpsNodes([]);
            return;
        }

        isRouteFromGpsRef.current = true;
        setRouteNodes(gpsNodes);
        setShowGroupNameModal(true);
        setNewGroupNameInput('');
        setUiMode('IDLE');
        setGpsNodes([]);
    };

    const cancelOperation = () => {
        setUiMode('IDLE');
        setRouteNodes([]);
        setPendingIssuePoint(null);
        setSuggestedWorker(null);
        setPendingAdminPhotoUrl(null);
        setShowGroupNameModal(false);
        setNewGroupNameInput('');
        setGpsNodes([]);
        if (watchIdRef.current !== null) {
            if (Capacitor.isNativePlatform() && typeof watchIdRef.current === 'string') {
                BackgroundGeolocation.removeWatcher({ id: watchIdRef.current });
            } else if (typeof watchIdRef.current === 'number') {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
            watchIdRef.current = null;
        }
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
        <div className="relative w-full h-screen bg-slate-200 text-slate-800 font-sans overflow-hidden">
            
            {/* Privacy Badge for Workers */}
            {currentUserRole === 'worker' && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-[2000] pt-1 flex justify-center w-full pointer-events-none">
                    {uiMode === 'ROUTE_GPS' ? (
                        <div className="bg-red-600/90 backdrop-blur text-white px-4 py-1.5 rounded-full text-xs font-black shadow-lg flex items-center gap-2 animate-pulse border border-red-400">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-200"></span>
                            </span>
                            🔴 내 위치 실시간 기록 중...
                        </div>
                    ) : (
                        <div className="bg-slate-700/80 backdrop-blur text-green-300 px-4 py-1.5 rounded-b-xl text-[10px] sm:text-xs font-bold shadow flex items-center gap-1 border-x border-b border-slate-600">
                            🛡️ 위치 추적 꺼짐 (사생활 보호중)
                        </div>
                    )}
                </div>
            )}

            {/* Alarm Overlay for Worker */}
            {showAlarmPopup && (
                <div className="absolute inset-0 z-[5000] bg-red-600/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-pulse">
                    <Siren size={100} className="text-white mb-6 animate-bounce" />
                    <h2 className="text-4xl text-center font-extrabold text-white mb-8 leading-tight">
                        긴급!<br/>구역 내 민원이 발생했습니다<br/>신속히 처리 바랍니다
                    </h2>
                    <button 
                        onClick={() => {
                            setShowAlarmPopup(false);
                            alarmRef.current?.pause();
                            const currentPending = issues.filter(i => i.workerId === currentWorkerId && i.status === 'PENDING').map(i => i.id);
                            setAckedIssues(prev => Array.from(new Set([...prev, ...currentPending])));
                        }}
                        className="bg-white text-red-600 px-10 py-5 rounded-full text-3xl font-extrabold shadow-[0_10px_40px_rgba(0,0,0,0.6)] active:scale-95 transition"
                    >
                        안내 닫고 지도 확인
                    </button>
                </div>
            )}
            
            {/* Top Floating Panel */}
            <div className="absolute top-4 left-0 right-0 px-4 z-[1000] pointer-events-none flex flex-col items-center">
                {currentUserRole === 'admin' ? (
                    <div className="w-full max-w-lg bg-slate-800/90 backdrop-blur-md rounded-2xl shadow-xl p-3 sm:p-4 pointer-events-auto border border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                             <button onClick={() => router.push('/admin')} className="p-2 sm:p-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-white transition active:scale-95 shadow border border-slate-600 text-sm"> <Home size={18} /> </button>
                             <div className="flex flex-col items-center">
                                <h1 className="text-lg sm:text-xl font-black text-yellow-300">전체 관리자 맵</h1>
                                <p className="text-[10px] sm:text-xs text-slate-300">할당 구역 조망 및 민원 관제</p>
                             </div>
                             <div className="w-10"></div>
                        </div>

                        {/* Address Search Bar */}
                        <form onSubmit={handleSearch} className="relative w-full mb-1 flex">
                            <input 
                                type="text"
                                placeholder="도로명 주소를 검색하세요..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-3 pr-10 py-2.5 sm:py-3 rounded-xl text-slate-900 border-0 outline-none shadow-inner text-sm font-bold placeholder:text-slate-400"
                            />
                            <button disabled={isSearching} type="submit" className="absolute right-1 top-1 p-1.5 sm:p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow">
                                {isSearching ? <span className="animate-spin text-sm">⏳</span> : <Search size={18} />}
                            </button>

                            {searchResults.length > 0 && (
                                <ul className="absolute top-[110%] left-0 w-full bg-white text-slate-800 rounded-xl shadow-2xl overflow-hidden border border-slate-200 z-[2000]">
                                    <li className="bg-slate-100 p-2 text-xs font-black text-slate-500 text-left border-b">검색 결과</li>
                                    {searchResults.map((res: any, idx) => (
                                        <li 
                                            key={idx} 
                                            className="px-3 py-3 hover:bg-blue-50 cursor-pointer text-left text-sm border-b last:border-b-0 flex items-center justify-between font-bold"
                                            onClick={() => handleSelectSearchResult(res.lat, res.lon)}
                                        >
                                            <span className="truncate max-w-[85%]">{res.display_name}</span>
                                            <span className="text-blue-500">👉</span>
                                        </li>
                                    ))}
                                    <li 
                                        className="p-2 text-center text-red-500 font-black bg-red-50 hover:bg-red-100 cursor-pointer"
                                        onClick={() => setSearchResults([])}
                                    >
                                        닫기
                                    </li>
                                </ul>
                            )}
                        </form>
                    </div>
                ) : (
                    <div className="w-full max-w-md bg-blue-800/90 text-white backdrop-blur-md rounded-2xl shadow-xl p-3 sm:p-4 pointer-events-auto border border-blue-700">
                        <div className="flex items-center justify-between mb-2">
                             <button onClick={() => router.push('/')} className="p-2 sm:p-2.5 bg-blue-700 hover:bg-blue-600 rounded-xl text-white transition shadow active:scale-95 border border-blue-600"> <Home size={18} /> </button>
                             <h1 className="text-base sm:text-lg font-black text-white text-center flex-1 pr-10">내 구역 ({currentWorkerName})</h1>
                        </div>
                        <div className="flex items-end justify-center gap-1 mb-1">
                            <span className="text-xs sm:text-sm font-bold text-blue-200">오늘 {totalCount}곳 중</span>
                            <span className="text-green-400 text-xl font-black leading-none">{completedCount}곳</span>
                            <span className="text-xs sm:text-sm font-bold text-blue-200 leading-tight">완료</span>
                        </div>
                        <div className="w-full h-2.5 sm:h-3 bg-blue-950 rounded-full overflow-hidden border border-white/20 mt-1 shadow-inner">
                            <div 
                                className="h-full bg-green-500 transition-all duration-500 rounded-full"
                                style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Group Name Selection Overlay */}
            {showGroupNameModal && (
                <div className="absolute inset-0 z-[4000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-6 md:p-8 text-slate-800 w-full max-w-sm shadow-2xl animate-in zoom-in max-h-[90vh] flex flex-col items-center">
                        <h2 className="text-2xl font-black mb-1 text-blue-900 leading-tight text-center">동선 기록 완료!</h2>
                        <p className="text-sm text-blue-600 mb-6 font-bold text-center bg-blue-50 py-1.5 px-3 rounded-full w-full">
                            ✨ 내 구역함 ({currentWorkerName})에 저장
                        </p>
                        
                        <div className="w-full flex-1 overflow-y-auto custom-scrollbar pr-1 mb-2">
                            {Array.from(new Set(visibleZones.map(z => z.groupName).filter(Boolean))).length > 0 ? (
                                <div className="mb-6">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">내가 입력한 과거 구역 이름 원터치</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {Array.from(new Set(visibleZones.map(z => z.groupName).filter(Boolean))).map((gName, idx) => (
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
            <main className="absolute inset-0 z-0">
                {isFetchingRoute && (
                    <div className="absolute inset-0 z-[2000] bg-black/50 flex flex-col items-center justify-center backdrop-blur-sm">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 mb-4"></div>
                        <span className="text-3xl font-bold bg-blue-900 border-4 border-white px-8 py-4 rounded-3xl shadow-2xl animate-pulse text-white">
                            도로 자동 탐색 중...
                        </span>
                    </div>
                )}

                <MapContainer ref={mapRef} center={defaultCenter} zoom={17} style={{ height: '100%', width: '100%', zIndex: 0 }} zoomControl={false}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* Applies auto bounding box zoom when data changes. Disable when recording track so auto-pan takes priority. */}
                    {uiMode !== 'ROUTE_GPS' && <MapBoundsFitter zones={visibleZones} issues={visibleIssues} />}
                    <MapFlyTo target={searchFlyTarget} />
                    <MapZoomTracker onZoomChange={setCurrentZoom} />

                    {routeNodes.map((node, idx) => (
                        <Marker key={idx} position={[node.lat, node.lng]} icon={markerIcon} />
                    ))}
                    {routeNodes.length > 1 && (
                        <Polyline positions={routeNodes.map(n => [n.lat, n.lng])} color="blue" dashArray="10, 10" weight={4} />
                    )}

                    {uiMode === 'ROUTE_GPS' && gpsNodes.length > 0 && (
                        <>
                            <Polyline positions={gpsNodes.map(n => [n.lat, n.lng])} color="#ef4444" weight={2} opacity={1} />
                            <Marker position={[gpsNodes[gpsNodes.length-1].lat, gpsNodes[gpsNodes.length-1].lng]} icon={markerIcon}>
                                <Popup autoPanPadding={[50, 50]} closeButton={false}>
                                    <div className="p-2 text-center text-red-600 font-black text-sm">현재 위치 기록중!</div>
                                </Popup>
                            </Marker>
                        </>
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
                        const isFocused = focusedGroup === zone.groupName;
                        let color = isDone ? '#22c55e' : '#ef4444'; 
                        let weightAtZoom18 = typeof window !== 'undefined' && window.innerWidth > 600 ? 4 : 5;
                        let fillOpacity = 0.4;
                        let defaultWeight = 2;
                        
                        if (isFocused) {
                            color = '#facc15'; // 눈에 띄는 노란색(Yellow) 
                            weightAtZoom18 = 10;
                            fillOpacity = 0.8;
                            defaultWeight = 5;
                        }

                        // 줌 레벨에 비례하여 실제 도로 폭(지리적 크기)에 맞게 굵기 조정 
                        const dynamicWeight = Math.max(1, weightAtZoom18 * Math.pow(2, currentZoom - 18));

                        const isPolygon = zone.path.length > 0 && Array.isArray(zone.path[0][0]);
                        
                        const popupContent = (
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
                                                <Trash2 size={24} /> 이 구역 지우기
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
                                                {isDone ? '✨ 이 구역은 깨끗합니다' : '🧹 청소를 시작할까요?'}
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
                                                    <><CheckCircle2 size={44} /> 구역 청소 완료!</>
                                                )}
                                            </button>                                                <button 
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
                                pathOptions={{ color: color, weight: defaultWeight, fillColor: color, fillOpacity: fillOpacity, className: isFocused ? 'animate-pulse' : '' }}
                            >
                                {popupContent}
                            </Polygon>
                        ) : (
                            <Polyline
                                key={zone.id}
                                positions={zone.path as any}
                                pathOptions={{ color: color, weight: dynamicWeight, opacity: isFocused ? 1 : 0.8, className: isFocused ? 'animate-pulse' : '' }}
                            >
                                {popupContent}
                            </Polyline>
                        );
                    })}

                    <CustomZoomControls zones={visibleZones} issues={visibleIssues} />
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

            {/* Bottom Floating Actions */}
            {uiMode === 'IDLE' && (
                <div className="absolute bottom-6 sm:bottom-8 left-0 right-0 px-2 sm:px-4 z-[1000] pointer-events-none flex flex-col items-center gap-3">
                    {currentUserRole === 'admin' ? (
                        <div className="flex gap-2 sm:gap-3 w-full max-w-lg pointer-events-auto">
                            <button 
                                onClick={() => setUiMode('ROUTE_CHOICE')}
                                className="flex-1 font-black py-4 sm:py-4 rounded-2xl shadow-xl flex flex-col items-center justify-center gap-1 border text-sm border-slate-600 bg-slate-800/95 backdrop-blur-md text-white hover:bg-slate-700 active:scale-95 transition-transform"
                            >
                                <PlusCircle size={20} /> 구역 관리
                            </button>
                            <button 
                                onClick={() => { setUiMode('GROUP_LIST'); setFocusedGroup(null); }}
                                className="flex-1 font-black py-4 sm:py-4 rounded-2xl shadow-xl flex flex-col items-center justify-center gap-1 border text-sm border-indigo-500 bg-indigo-600/95 backdrop-blur-md text-white hover:bg-indigo-500 active:scale-95 transition-transform"
                            >
                                <List size={20} /> 전체 구역 관리
                            </button>
                            <button 
                                onClick={() => setUiMode('ISSUE_DROP')}
                                className="flex-1 font-black py-4 sm:py-4 rounded-2xl shadow-xl flex flex-col items-center justify-center gap-1 border text-sm border-slate-600 bg-slate-800/95 backdrop-blur-md text-white hover:bg-slate-700 active:scale-95 transition-transform"
                            >
                                <Siren size={20} /> 현장 핀 지시
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-2 w-full max-w-md pointer-events-auto">
                            <button 
                                onClick={() => setUiMode('ROUTE_CHOICE')}
                                className="flex-1 font-black py-3 sm:py-4 rounded-2xl shadow-xl flex flex-col items-center justify-center gap-1 border text-[13px] border-blue-600 bg-blue-800/95 backdrop-blur-md text-white hover:bg-blue-700 active:scale-95 transition-transform"
                            >
                                <PlusCircle size={18} /> 새 구역 긋기
                            </button>
                            <button 
                                onClick={() => { setUiMode('GROUP_LIST'); setFocusedGroup(null); }}
                                className="flex-1 font-black py-3 sm:py-4 rounded-2xl shadow-xl flex flex-col items-center justify-center gap-1 border text-[13px] border-indigo-500 bg-indigo-600/95 backdrop-blur-md text-white hover:bg-indigo-500 active:scale-95 transition-transform"
                            >
                                <List size={18} /> 내 구역 리스트
                            </button>
                            <button 
                                onClick={() => setUiMode('ISSUE_DROP')}
                                className="flex-1 font-black py-3 sm:py-4 rounded-2xl shadow-xl flex flex-col items-center justify-center gap-1 border text-[13px] border-red-500 bg-red-600/95 backdrop-blur-md text-white hover:bg-red-500 active:scale-95 transition-transform"
                            >
                                <Siren size={18} /> 민원 핀 지시
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Group List Drawer */}
            {uiMode === 'GROUP_LIST' && (
                <div className="absolute inset-x-0 bottom-0 top-1/4 z-[3000] bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-full">
                    <div className="w-full flex justify-center py-3 bg-slate-50 border-b border-slate-200" onClick={() => setUiMode('IDLE')}>
                        <div className="w-16 h-1.5 bg-slate-300 rounded-full"></div>
                    </div>
                    <div className="p-4 sm:p-6 pb-2 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h2 className="text-xl sm:text-2xl font-black text-slate-800">
                            {currentUserRole === 'admin' ? '전체 구역 관리 리스트' : '내 구역 관리 리스트'}
                        </h2>
                        <button onClick={() => setUiMode('IDLE')} className="p-2 bg-slate-200 text-slate-600 rounded-full hover:bg-slate-300">
                            <XCircle size={24} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/50">
                        {(() => {
                            const myZones = zones.filter(z => currentUserRole === 'admin' || z.workerId === currentWorkerId);
                            const groupNames = Array.from(new Set(myZones.map(z => z.groupName).filter(Boolean))) as string[];
                            
                            if (groupNames.length === 0) {
                                return (
                                    <div className="text-center py-10 text-slate-400 font-bold">
                                        아직 설정된 구역 그룹이 없습니다.
                                    </div>
                                );
                            }

                            return groupNames.map((gName, idx) => {
                                const groupBlocks = myZones.filter(z => z.groupName === gName);
                                const cleanedBlocks = groupBlocks.filter(z => z.isCleaned);
                                const progress = Math.round((cleanedBlocks.length / groupBlocks.length) * 100);
                                
                                return (
                                    <div key={idx} className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 mb-3 shadow-sm flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1" onClick={() => focusGroupCoords(gName)}>
                                                <h3 className="text-lg font-black text-blue-900 mb-1 cursor-pointer hover:underline">{gName}</h3>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-md border border-slate-200">
                                                        총 {groupBlocks.length}개 블록 묶음
                                                    </span>
                                                    {progress === 100 && <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">청소 완료</span>}
                                                </div>
                                            </div>
                                            <div className="flex gap-2 ml-2">
                                                <button onClick={() => focusGroupCoords(gName)} className="p-2.5 sm:p-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-colors shrink-0 shadow-sm" title="구역 위치로 이동">
                                                    <Crosshair size={18} className="stroke-[2.5px]" />
                                                </button>
                                                <button onClick={() => handleRenameGroup(gName)} className="p-2.5 sm:p-3 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-xl transition-colors shrink-0 shadow-sm" title="이름 수정">
                                                    <Edit2 size={18} className="stroke-[2.5px]" />
                                                </button>
                                                <button onClick={() => handleDeleteGroup(gName)} className="p-2.5 sm:p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors shrink-0 shadow-sm" title="그룹 삭제">
                                                    <Trash2 size={18} className="stroke-[2.5px]" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                            <div className="bg-blue-600 h-2.5 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>
            )}

            {/* Route Choice Dialog */}
            {uiMode === 'ROUTE_CHOICE' && (
                <div className="absolute inset-0 z-[3000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-6 md:p-8 text-slate-800 w-full max-w-sm shadow-2xl animate-in zoom-in max-h-[90vh] flex flex-col items-center text-center">
                        <h2 className="text-2xl font-black mb-2 text-blue-900">새 구역 추가 방법</h2>
                        <p className="text-sm text-slate-500 mb-6 font-bold">어떤 방식으로 구역을 그릴까요?</p>
                        
                        <div className="flex flex-col gap-3 w-full">
                            <button 
                                onClick={() => prepareGpsRecording()}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl p-4 shadow-xl flex flex-col items-center gap-2 transform active:scale-95 transition border-4 border-blue-400"
                            >
                                <span className="text-4xl">🚶‍♂️</span>
                                <span className="font-extrabold text-lg">걸어가며 자동 기록 (추천)</span>
                                <span className="text-xs text-blue-200">기록 중에만 화면에 위치가 노출됩니다.</span>
                            </button>

                            <button 
                                onClick={() => setUiMode('ROUTE_BUILDING')}
                                className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-2xl p-4 shadow-xl flex flex-col items-center gap-2 transform active:scale-95 transition border-4 border-amber-300"
                            >
                                <span className="text-4xl">📍</span>
                                <span className="font-extrabold text-lg">화면 드래그로 수동 그리기</span>
                                <span className="text-xs text-amber-100">위치 노출 없이 화면에 수동으로 선 긋기.</span>
                            </button>

                            <button 
                                onClick={cancelOperation}
                                className="w-full mt-3 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl"
                            >
                                취소
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* GPS Recording READY Mode Overlay */}
            {uiMode === 'ROUTE_GPS_READY' && (
                <div className="absolute bottom-10 left-0 right-0 px-6 z-[3000] pointer-events-auto flex flex-col items-center">
                    <div className="bg-black/80 backdrop-blur text-white px-5 py-3 rounded-2xl text-center mb-4 border border-white/20 shadow-2xl animate-bounce">
                        <p className="font-extrabold text-lg text-blue-300 mb-1">시작 지점으로 이동해주세요</p>
                        <p className="text-xs sm:text-sm text-slate-200 font-bold">도착하셨으면 아래 출발 버튼을 눌러주세요.</p>
                    </div>
                    <button 
                        onClick={startGpsRecording}
                        className="w-full max-w-sm py-5 bg-blue-600 text-white font-extrabold rounded-3xl text-2xl shadow-[0_15px_30px_rgba(0,0,0,0.5)] border-4 border-blue-400 transform transition active:scale-95 flex items-center justify-center gap-2 hover:bg-blue-500"
                    >
                        <span className="text-3xl">▶️</span>
                        <span>이곳에서 출발 (기록 시작)</span>
                    </button>
                    <button onClick={cancelOperation} className="mt-4 w-full max-w-sm py-3 bg-slate-200 text-slate-700 font-bold rounded-2xl text-lg hover:bg-slate-300 transform transition active:scale-95">
                        취소
                    </button>
                </div>
            )}

            {/* GPS Recording Mode Overlay */}
            {uiMode === 'ROUTE_GPS' && (
                <div className="absolute bottom-10 left-0 right-0 px-6 z-[3000] pointer-events-auto flex flex-col items-center">
                    <div className="bg-black/80 backdrop-blur text-white px-5 py-3 rounded-2xl text-center mb-4 border border-white/20 shadow-2xl animate-pulse">
                        <p className="font-extrabold text-lg text-yellow-300 mb-1">현재 걷는 길이 기록되고 있습니다!</p>
                        <p className="text-xs sm:text-sm text-slate-300 font-bold">구역의 끝에 도착하면 아래 버튼을 눌러주세요.</p>
                    </div>
                    <button 
                        onClick={stopGpsRecording}
                        className="w-full max-w-sm py-5 bg-red-600 text-white font-extrabold rounded-3xl text-2xl shadow-[0_15px_30px_rgba(0,0,0,0.5)] border-4 border-red-400 transform transition active:scale-95 flex items-center justify-center gap-2 hover:bg-red-500"
                    >
                        <span className="text-3xl">⏹️</span>
                        <span>여기까지 기록 완료</span>
                    </button>
                </div>
            )}
            
            {/* CANCEL UI Button */}
            {(uiMode === 'ROUTE_BUILDING' || uiMode === 'ISSUE_DROP') && (
                <div className="absolute top-[120px] sm:top-28 right-4 z-[2000]">
                    <button
                        onClick={cancelOperation}
                        className="p-3 bg-white/95 backdrop-blur shadow-2xl border border-slate-200 rounded-full flex items-center justify-center gap-2 active:bg-slate-100 transition-all font-black text-slate-700 text-sm"
                    >
                        <XCircle size={18} className="text-red-500" />
                        <span>작업 취소</span>
                    </button>
                </div>
            )}
        </div>
    );
}
