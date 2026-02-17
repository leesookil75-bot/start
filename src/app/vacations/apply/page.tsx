import { getVacationRequests } from '../actions';
import ClientApplyPage from './client';

export default async function ApplyPage() {
    const result = await getVacationRequests(false);
    const requests = result.data || [];

    return <ClientApplyPage initialRequests={requests} />;
}
