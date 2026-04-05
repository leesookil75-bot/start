'use client';

import dynamic from 'next/dynamic';

const CleaningMapClient = dynamic(() => import('@/app/components/CleaningMapClient'), {
    ssr: false
});

export default function MapWrapper(props: any) {
    return <CleaningMapClient {...props} />;
}
