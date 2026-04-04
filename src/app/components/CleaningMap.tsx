'use client';

import dynamic from 'next/dynamic';

const CleaningMapClient = dynamic(() => import('./CleaningMapClient'), { 
    ssr: false,
    loading: () => <div className="min-h-screen bg-blue-900 text-white flex items-center justify-center text-3xl font-bold">지도 불러오는 중...</div>
});

export default function CleaningMap() {
    return <CleaningMapClient />;
}
