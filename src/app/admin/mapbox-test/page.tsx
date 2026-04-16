'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Map, { Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import * as turf from '@turf/turf';
import { Layers, Activity, Map as MapIcon } from 'lucide-react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function MapboxTestPage() {
  const [data, setData] = useState<{
    original: number[][]; // [lng, lat]
    matched: number[][];  // [lng, lat]
  } | null>(null);

  const [showRaw, setShowRaw] = useState(true);
  const [showMatched, setShowMatched] = useState(true);
  const [showBuffer, setShowBuffer] = useState(true);

  const [viewState, setViewState] = useState({
    longitude: 126.9780, // Default Seoul, will be updated to data boundaries
    latitude: 37.5665,
    zoom: 16
  });

  useEffect(() => {
    fetch('/data/matched_mapbox.json')
      .then(res => res.json())
      .then(json => {
        setData(json);
        
        // Calculate center based on matched data (first point or bounding box)
        if (json.matched && json.matched.length > 0) {
          // simple centering on first point
          setViewState({
            longitude: json.matched[0][0],
            latitude: json.matched[0][1],
            zoom: 16.5
          });
        }
      })
      .catch(err => console.error("Failed to load map data:", err));
  }, []);

  // --- GeoJSON Generators ---

  // 1. Raw GPS Points Data
  const rawPointsGeoJSON = useMemo(() => {
    if (!data || !data.original) return null;
    return {
      type: 'FeatureCollection',
      features: data.original.map((coord) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: coord },
        properties: {}
      }))
    };
  }, [data]);

  // 2. Matched Path Data
  const matchedPathGeoJSON = useMemo(() => {
    if (!data || !data.matched || data.matched.length < 2) return null;
    return {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: data.matched },
      properties: {}
    };
  }, [data]);

  // 3. Turf.js Buffered Polygon Data
  const bufferedPolygonGeoJSON = useMemo(() => {
    if (!data || !data.matched || data.matched.length < 2) return null;
    
    // Create a turf LineString
    const line = turf.lineString(data.matched);
    
    // Apply buffer of 5 meters around the line
    // This creates our clean "Cleaning Zone" area
    const buffered = turf.buffer(line, 5, { units: 'meters' });
    
    return buffered;
  }, [data]);


  return (
    <div className="flex bg-gray-50 h-screen w-full">
      {/* Control Panel */}
      <div className="w-80 bg-white p-6 shadow-lg z-10 flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold font-sans text-gray-800 flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-600" />
            Mapbox 프로토타입
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            지저분한 GPS 궤적을 Map Matching으로 보정하고, Turf.js를 통해 깔끔한 면적으로 면적화(Buffer)하는 시뮬레이션입니다.
          </p>
        </div>

        <div className="flex flex-col gap-3 mt-4">
          <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input 
              type="checkbox" 
              checked={showRaw} 
              onChange={() => setShowRaw(!showRaw)}
              className="w-5 h-5 appearance-none border-2 border-gray-300 rounded-md checked:bg-red-500 checked:border-red-500 bg-white relative
              after:content-[''] after:absolute after:hidden checked:after:block after:left-[6px] after:top-[2px] after:w-[6px] after:h-[12px] after:border-r-2 after:border-b-2 after:border-white after:rotate-45"
            />
            <span className="ml-3 flex-1 text-gray-700 font-medium">1단계: 원본 GPS 궤적</span>
            <div className="w-4 h-4 rounded-full bg-red-500 shadow-sm"></div>
          </label>

          <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input 
              type="checkbox" 
              checked={showMatched} 
              onChange={() => setShowMatched(!showMatched)}
              className="w-5 h-5 appearance-none border-2 border-gray-300 rounded-md checked:bg-blue-600 checked:border-blue-600 bg-white relative
              after:content-[''] after:absolute after:hidden checked:after:block after:left-[6px] after:top-[2px] after:w-[6px] after:h-[12px] after:border-r-2 after:border-b-2 after:border-white after:rotate-45"
            />
            <span className="ml-3 flex-1 text-gray-700 font-medium">2단계: 경로 보정선 (Snap)</span>
            <div className="w-4 h-1 bg-blue-600 shadow-sm"></div>
          </label>

          <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors bg-green-50 border-green-200">
            <input 
              type="checkbox" 
              checked={showBuffer} 
              onChange={() => setShowBuffer(!showBuffer)}
              className="w-5 h-5 appearance-none border-2 border-gray-300 rounded-md checked:bg-green-500 checked:border-green-500 bg-white relative
              after:content-[''] after:absolute after:hidden checked:after:block after:left-[6px] after:top-[2px] after:w-[6px] after:h-[12px] after:border-r-2 after:border-b-2 after:border-white after:rotate-45"
            />
            <div className="flex flex-col ml-3 flex-1">
              <span className="text-gray-800 font-bold">3단계: 면적 생성 (Buffer)</span>
              <span className="text-xs text-green-700 mt-1">완성된 청소 구역 (반경 5m)</span>
            </div>
            <div className="w-5 h-5 bg-green-200 border-2 border-green-500 rounded-sm"></div>
          </label>
        </div>

        <div className="mt-auto pt-6 border-t select-none">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Activity className="w-4 h-4" /> 데이터 상태
          </div>
          {data ? (
            <div className="text-xs space-y-1 text-gray-600 bg-gray-100 p-3 rounded-md">
              <div>원본 점 개수: <span className="font-mono text-gray-800">{data.original.length}</span>개</div>
              <div>보정 중심선 포인트: <span className="font-mono text-gray-800">{data.matched?.length}</span>개</div>
              <div>Mapbox Token: <span className="font-mono text-green-600 font-semibold text-[10px]">Loaded</span></div>
            </div>
          ) : (
            <div className="text-sm text-blue-500 animate-pulse">데이터를 불러오는 중...</div>
          )}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative">
        {!MAPBOX_TOKEN && (
          <div className="absolute inset-0 bg-white z-50 flex items-center justify-center p-4 text-center">
            <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 max-w-lg shadow-sm">
              <h3 className="font-bold mb-2">Mapbox Token Missing</h3>
              <p>환경변수에 NEXT_PUBLIC_MAPBOX_TOKEN을 설정해야 합니다.</p>
            </div>
          </div>
        )}

        <Map
          {...viewState}
          onMove={(evt: any) => setViewState(evt.viewState)}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={MAPBOX_TOKEN}
          style={{ width: '100%', height: '100%' }}
        >
          
          {/* Layer 3: Buffered Area (Bottom Layer) */}
          {showBuffer && bufferedPolygonGeoJSON && (
            <Source id="buffered-polygon" type="geojson" data={bufferedPolygonGeoJSON as any}>
              <Layer 
                id="buffered-polygon-fill" 
                type="fill" 
                paint={{
                  'fill-color': '#10B981',
                  'fill-opacity': 0.3
                }} 
              />
              <Layer 
                id="buffered-polygon-outline" 
                type="line" 
                paint={{
                  'line-color': '#059669',
                  'line-width': 2,
                  'line-dasharray': [2, 2]
                }} 
              />
            </Source>
          )}

          {/* Layer 2: Matched Polyline (Middle Layer) */}
          {showMatched && matchedPathGeoJSON && (
            <Source id="matched-path" type="geojson" data={matchedPathGeoJSON as any}>
              <Layer 
                id="matched-path-line" 
                type="line" 
                paint={{
                  'line-color': '#2563EB',
                  'line-width': 4,
                  'line-opacity': 0.8
                }} 
              />
            </Source>
          )}

          {/* Layer 1: Raw Points (Top Layer) */}
          {showRaw && rawPointsGeoJSON && (
            <Source id="raw-points" type="geojson" data={rawPointsGeoJSON as any}>
              <Layer 
                id="raw-points-circle" 
                type="circle" 
                paint={{
                  'circle-color': '#EF4444',
                  'circle-radius': 4,
                  'circle-stroke-width': 1,
                  'circle-stroke-color': '#FFFFFF'
                }} 
              />
            </Source>
          )}

        </Map>
      </div>
    </div>
  );
}
