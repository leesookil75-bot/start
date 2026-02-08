import { getRecords, getUsers } from './data';

export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type StatEntry = {
    key: string;       // "2024-01-01" or "Week 10" or "Jan 2024" or "A Area"
    count45: number;
    count75: number;
    total: number;
};
export type AreaStatEntry = StatEntry;

function getWeekNumber(d: Date): number {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
}

export async function getStatsByPeriod(
    period: PeriodType
): Promise<StatEntry[]> {
    const records = await getRecords();
    const rawData: Record<string, { count45: number; count75: number }> = {};

    records.forEach((record) => {
        const date = new Date(record.timestamp);
        let key = '';

        if (period === 'daily') {
            key = date.toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }); // 24. 01. 01.
        } else if (period === 'weekly') {
            const week = getWeekNumber(date);
            key = `${date.getFullYear()} W${week}`;
        } else if (period === 'monthly') {
            key = date.toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit' }); // 24. 01.
        } else if (period === 'yearly') {
            key = date.getFullYear().toString();
        }

        if (!rawData[key]) rawData[key] = { count45: 0, count75: 0 };
        if (record.size === 45) rawData[key].count45++;
        else if (record.size === 75) rawData[key].count75++;
    });

    // Sort keys
    const sortedKeys = Object.keys(rawData).sort();
    // Reverse sort for display (recent first for some views, but charts usually need old->new. Let's send old->new)
    if (period === 'daily') {
        sortedKeys.sort((a, b) => new Date(a.replace(/\. /g, '-')).getTime() - new Date(b.replace(/\. /g, '-')).getTime());
    }

    return sortedKeys.map((key) => ({
        key,
        count45: rawData[key].count45,
        count75: rawData[key].count75,
        total: rawData[key].count45 + rawData[key].count75,
    }));
}

export async function getStatsByArea(): Promise<AreaStatEntry[]> {
    const records = await getRecords();
    const users = await getUsers();
    const userMap = new Map(users.map(u => [u.id, u.cleaningArea]));

    const rawData: Record<string, { count45: number; count75: number }> = {};

    records.forEach((record) => {
        let area = 'Unknown';
        if (record.userId && userMap.has(record.userId)) {
            area = userMap.get(record.userId) || 'Unknown';
        } else if (record.userName === '관리자') {
            area = '관리실';
        }

        if (!rawData[area]) rawData[area] = { count45: 0, count75: 0 };
        if (record.size === 45) rawData[area].count45++;
        else if (record.size === 75) rawData[area].count75++;
    });

    return Object.keys(rawData).map((key) => ({
        key,
        count45: rawData[key].count45,
        count75: rawData[key].count75,
        total: rawData[key].count45 + rawData[key].count75,
    })).sort((a, b) => b.total - a.total); // Sort by total usage descending
}

// Prepare export data
export async function getExcelData() {
    const records = await getRecords();
    const users = await getUsers();
    const userMap = new Map(users.map(u => [u.id, u]));

    return records.map(r => {
        const user = r.userId ? userMap.get(r.userId) : null;
        return {
            Time: new Date(r.timestamp).toLocaleString('ko-KR'),
            Size: r.size,
            Name: r.userName || user?.name || 'Unknown',
            Area: user?.cleaningArea || (r.userName === '관리자' ? '관리실' : '-'),
            Phone: user?.phoneNumber || '-',
        };
    }).sort((a, b) => new Date(b.Time).getTime() - new Date(a.Time).getTime());
}

export interface MonthlyUserStat {
    userId: string;
    userName: string;
    area: string;
    monthly: { count45: number; count75: number }[]; // Index 0 = Jan, 11 = Dec
    total45: number;
    total75: number;
}

export async function getMonthlyUserStats(): Promise<MonthlyUserStat[]> {
    const records = await getRecords();
    const users = await getUsers();

    // Create a map to store stats for each user
    // Key: userId
    const statsMap = new Map<string, MonthlyUserStat>();

    // Initialize map with all users
    users.forEach(user => {
        statsMap.set(user.id, {
            userId: user.id,
            userName: user.name,
            area: user.cleaningArea || '-',
            monthly: Array(12).fill(0).map(() => ({ count45: 0, count75: 0 })),
            total45: 0,
            total75: 0
        });
    });

    const currentYear = new Date().getFullYear();

    records.forEach(record => {
        const date = new Date(record.timestamp);
        if (date.getFullYear() !== currentYear) return;

        const month = date.getMonth(); // 0-11
        const userId = record.userId || 'unknown';

        // If user not in map (e.g. admin or deleted), create entry if we want to show them
        let stat = statsMap.get(userId);
        if (!stat) {
            stat = {
                userId: userId,
                userName: record.userName || 'Unknown',
                area: userId === 'admin-user' || record.userName === '관리자' ? '관리실' : '-', // Fallback area logic
                monthly: Array(12).fill(0).map(() => ({ count45: 0, count75: 0 })),
                total45: 0,
                total75: 0
            };
            statsMap.set(userId, stat);
        }

        if (record.size === 45) {
            stat.monthly[month].count45++;
            stat.total45++;
        } else if (record.size === 75) {
            stat.monthly[month].count75++;
            stat.total75++;
        }
    });

    // Convert map to array and sort by area first, then name
    return Array.from(statsMap.values()).sort((a, b) => {
        if (a.area < b.area) return -1;
        if (a.area > b.area) return 1;
        return a.userName.localeCompare(b.userName);
    });
}
