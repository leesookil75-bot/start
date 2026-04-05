import { getCurrentUser } from '@/app/actions';
import { getUsers, User } from '@/lib/data';
import { redirect } from 'next/navigation';
import MapWrapper from './MapWrapper';

export default async function MapPage() {
    const user = await getCurrentUser();
    
    if (!user) {
        redirect('/login');
    }

    // Load available workers to pass to map component for assignment features
    const allUsers = await getUsers();
    const workers = allUsers
        .filter((u: User) => u.role === 'cleaner')
        .map((u: User) => ({ id: u.id, name: u.name }));

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
