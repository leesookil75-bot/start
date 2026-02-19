'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet Default Icon in Next.js
// We need to delete the default internal paths and set them manually or use base64
// A common workaround:
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41]
});

// Red Icon for Workplace
const WorkplaceIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Blue Icon for User (Standard) -> Default is blue, but let's be explicit if needed.
// Actually Default IS blue.

L.Marker.prototype.options.icon = DefaultIcon;


function MapController({ center, zoom }: { center: [number, number], zoom: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
}

interface MapProps {
    center: [number, number];
    zoom?: number;
    markers?: {
        lat: number;
        lng: number;
        popup?: string;
        color?: string; // Relaxed to string to allow flexibility, though implemented for red/blue
    }[];
    circle?: {
        lat: number;
        lng: number;
        radius: number;
        color?: string;
    };
    userCircle?: {
        lat: number;
        lng: number;
        radius: number;
    };
    onMapClick?: (lat: number, lng: number) => void;
    height?: string;
}

// Click Handler Component
import { useMapEvents } from 'react-leaflet';
function MapEvents({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            if (onClick) {
                // Leaflet returns latlng object. Ensure we pass lat, lng numbers.
                onClick(e.latlng.lat, e.latlng.lng);
            }
        },
    });
    return null;
}

export default function Map({ center, zoom = 15, markers = [], circle, userCircle, onMapClick, height = '300px' }: MapProps) {
    // Ensure Leaflet CSS is loaded globally or here.
    // Next.js might struggle with 'window' in Leaflet import if not dynamic.
    // This component MUST be imported dynamically with `ssr: false` in parent.

    return (
        <MapContainer center={center} zoom={zoom} style={{ height, width: '100%', borderRadius: '8px', zIndex: 0 }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController center={center} zoom={zoom} />

            {onMapClick && <MapEvents onClick={onMapClick} />}

            {markers.map((marker, idx) => (
                <Marker
                    key={idx}
                    position={[marker.lat, marker.lng]}
                    icon={marker.color === 'red' ? WorkplaceIcon : DefaultIcon}
                >
                    {marker.popup && <Popup>{marker.popup}</Popup>}
                </Marker>
            ))}

            {circle && (
                <Circle
                    center={[circle.lat, circle.lng]}
                    radius={circle.radius}
                    pathOptions={{ color: circle.color || 'red', fillColor: circle.color || 'red', fillOpacity: 0.2 }}
                />
            )}

            {userCircle && (
                <Circle
                    center={[userCircle.lat, userCircle.lng]}
                    radius={userCircle.radius}
                    pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15, weight: 1 }}
                />
            )}
        </MapContainer>
    );
}
