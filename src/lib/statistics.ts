import { getRecords, getUsers, getDailyOverrides } from './data';
import { PeriodType, StatEntry, AreaStatEntry, DailyUserStat, MonthlyUserStat } from './types';
export type { PeriodType, StatEntry, AreaStatEntry, DailyUserStat, MonthlyUserStat };


function getWeekNumber(d: Date): number {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
}

// ... (imports)

// ... (getWeekNumber)

export async function getStatsByPeriod(
    period: PeriodType
): Promise<StatEntry[]> {
    const records = await getRecords();
    const rawData: Record<string, { count50: number; count75: number }> = {};

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

        if (!rawData[key]) rawData[key] = { count50: 0, count75: 0 };
        if (record.size === 45 || record.size === 50) rawData[key].count50++;
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
        count50: rawData[key].count50,
        count75: rawData[key].count75,
        total: rawData[key].count50 + rawData[key].count75,
    }));
}

export async function getStatsByArea(): Promise<AreaStatEntry[]> {
    const records = await getRecords();
    const users = await getUsers();
    const userMap = new Map(users.map(u => [u.id, u.cleaningArea]));

    const rawData: Record<string, { count50: number; count75: number }> = {};

    records.forEach((record) => {
        let area = 'Unknown';
        if (record.userId && userMap.has(record.userId)) {
            area = userMap.get(record.userId) || 'Unknown';
        } else if (record.userName === '관리자') {
            area = '관리실';
        }

        if (!rawData[area]) rawData[area] = { count50: 0, count75: 0 };
        if (record.size === 45 || record.size === 50) rawData[area].count50++;
        else if (record.size === 75) rawData[area].count75++;
    });

    return Object.keys(rawData).map((key) => ({
        key,
        count50: rawData[key].count50,
        count75: rawData[key].count75,
        total: rawData[key].count50 + rawData[key].count75,
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
            Size: r.size, // This will show 45 or 50 as stored
            Name: r.userName || user?.name || 'Unknown',
            Area: user?.cleaningArea || (r.userName === '관리자' ? '관리실' : '-'),
            Phone: user?.phoneNumber || '-',
        };
    }).sort((a, b) => new Date(b.Time).getTime() - new Date(a.Time).getTime());
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
            monthly: Array(12).fill(0).map(() => ({ count50: 0, count75: 0 })),
            total50: 0,
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
                monthly: Array(12).fill(0).map(() => ({ count50: 0, count75: 0 })),
                total50: 0,
                total75: 0
            };
            statsMap.set(userId, stat);
        }

        if (record.size === 45 || record.size === 50) {
            stat.monthly[month].count50++;
            stat.total50++;
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




export async function getDailyUserStats(year: number, month: number): Promise<DailyUserStat[]> {
    const records = await getRecords();
    const users = await getUsers();
    const overrides = await getDailyOverrides();

    const statsMap = new Map<string, DailyUserStat>();

    // Calculate days in month (0-based day for previous month's last day trick: new Date(year, month, 0))
    // If month is 1-based (1=Jan), new Date(2024, 1, 0) is Jan 31. Correct.
    const daysInMonth = new Date(year, month, 0).getDate();

    // Initialize all users
    users.forEach(user => {
        statsMap.set(user.id, {
            userId: user.id,
            userName: user.name,
            area: user.cleaningArea || '-',
            daily: Array(daysInMonth).fill(0).map(() => ({ count50: 0, count75: 0 })),
            total50: 0,
            total75: 0
        });
    });

    // Populate base counts from records
    records.forEach(record => {
        const date = new Date(record.timestamp);
        // Check year and month (0-11)
        // input month is 1-based. date.getMonth() is 0-based.
        if (date.getFullYear() !== year || date.getMonth() + 1 !== month) return;

        const day = date.getDate();
        const dayIndex = day - 1;

        if (dayIndex < 0 || dayIndex >= daysInMonth) return;

        const userId = record.userId || 'unknown';

        let stat = statsMap.get(userId);
        if (!stat) {
            // Handle unknown users if necessary
            stat = {
                userId: userId,
                userName: record.userName || 'Unknown',
                area: userId === 'admin-user' || record.userName === '관리자' ? '관리실' : '-',
                daily: Array(daysInMonth).fill(0).map(() => ({ count50: 0, count75: 0 })),
                total50: 0,
                total75: 0
            };
            statsMap.set(userId, stat);
        }

        if (record.size === 45 || record.size === 50) {
            stat.daily[dayIndex].count50++;
        } else if (record.size === 75) {
            stat.daily[dayIndex].count75++;
        }
    });

    // Apply Overrides and Calculate Totals
    const stats = Array.from(statsMap.values());

    stats.forEach(stat => {
        let total50 = 0;
        let total75 = 0;

        stat.daily = stat.daily.map((dayStat, dayIndex) => {
            const day = dayIndex + 1;
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            // Check for overrides
            // We check for both 45 and 50 overrides. Use 50 if present, else 45? Or sum?
            // Safer to check 50 first, then 45. Or just 50 as per new convention.
            // But we didn't migrate DB. So old overrides are '45'.
            // If user sets new override, it will be '50' (if we update UI to set 50).
            // Let's look for both.

            const override45 = overrides.find(o => o.date === dateStr && o.userId === stat.userId && o.type === '45');
            const override50 = overrides.find(o => o.date === dateStr && o.userId === stat.userId && o.type === '50');
            const override75 = overrides.find(o => o.date === dateStr && o.userId === stat.userId && o.type === '75');

            // 50L Logic (Aggregation of 45 and 50)
            let display50: string | number = dayStat.count50;
            let effective50 = dayStat.count50;

            if (override50) {
                display50 = override50.value;
                effective50 = typeof override50.value === 'number' ? override50.value : 0;
            } else if (override45) {
                // Fallback to 45 override if 50 not present
                display50 = override45.value;
                effective50 = typeof override45.value === 'number' ? override45.value : 0;
            }

            // 75L Logic
            let display75: string | number = dayStat.count75;
            let effective75 = dayStat.count75;

            if (override75) {
                display75 = override75.value;
                effective75 = typeof override75.value === 'number' ? override75.value : 0;
            }

            total50 += effective50;
            total75 += effective75;

            return {
                count50: effective50,
                count75: effective75,
                display50,
                display75
            };
        });

        stat.total50 = total50;
        stat.total75 = total75;
    });

    return stats.sort((a, b) => {
        if (a.area < b.area) return -1;
        if (a.area > b.area) return 1;
        return a.userName.localeCompare(b.userName);
    });
}

