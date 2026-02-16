import { getWorkplacesAction } from '../../actions';
import WorkplaceManagement from './workplace-management';

export default async function Page() {
    const workplaces = await getWorkplacesAction();
    return <WorkplaceManagement workplaces={workplaces} />;
}
