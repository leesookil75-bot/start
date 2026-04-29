import { getCurrentUser } from '@/app/actions';
import { getUsers, getWorkplaces, User } from '@/lib/data';
import { redirect } from 'next/navigation';
import MapWrapper from './MapWrapper';

export default async function MapPage() {
    const user = await getCurrentUser();
    
    if (!user) {
        redirect('/login');
    }

    // Load available workers to pass to map component for assignment features
    const allUsers = await getUsers(user.agencyId);
    const workplaces = await getWorkplaces(user.agencyId);
    
    const workers = allUsers.map((u: User) => {
        const wp = workplaces.find(w => w.id === u.workplaceId);
        return {
            id: u.id, 
            name: u.name, 
            cleaningArea: u.cleaningArea,
            workplaceName: wp?.name || u.workAddress || undefined
        };
    });

    return (
        <MapWrapper 
            role={user.role === 'cleaner' ? 'worker' : 'admin'} 
            currentUser={{ 
                id: user.id, 
                name: user.name, 
                lat: user.workLat, 
                lng: user.workLng 
            }} 
            workers={workers} 
        />
    );
}
