
export type User = {
    id: string;
    phoneNumber: string;
    name: string;
    cleaningArea: string;
    role: 'admin' | 'cleaner';
    createdAt: string;
    password?: string;
};

export type UsageRecord = {
    id: string;
    size: 45 | 75;
    timestamp: string;
    userId?: string;
    userName?: string;
};

export type Notice = {
    id: string;
    title: string;
    content: string;
    imageData?: string; // Base64
    isPinned?: boolean;
    createdAt: string;
    authorId: string;
};

export type DailyOverride = {
    date: string; // YYYY-MM-DD
    userId: string;
    type: '45' | '75';
    value: string | number;
};

export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type StatEntry = {
    key: string;       // "2024-01-01" or "Week 10" or "Jan 2024" or "A Area"
    count45: number;
    count75: number;
    total: number;
};

export type AreaStatEntry = StatEntry;

export interface MonthlyUserStat {
    userId: string;
    userName: string;
    area: string;
    monthly: { count45: number; count75: number }[]; // Index 0 = Jan, 11 = Dec
    total45: number;
    total75: number;
}

export interface DailyUserStat {
    userId: string;
    userName: string;
    area: string;
    daily: {
        count45: number;
        count75: number;
        display45?: string | number;
        display75?: string | number;
    }[]; // Index 0 = 1st
    total45: number;
    total75: number;
}
