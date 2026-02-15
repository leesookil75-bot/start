
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
    size: 45 | 50 | 75;
    timestamp: string;
    userId?: string;
    userName?: string;
};

export type AttendanceRecord = {
    id: string;
    userId: string;
    type: 'CHECK_IN' | 'CHECK_OUT';
    timestamp: string;
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
    type: '45' | '50' | '75';
    value: string | number;
};

export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type StatEntry = {
    key: string;       // "2024-01-01" or "Week 10" or "Jan 2024" or "A Area"
    count50: number;
    count75: number;
    total: number;
};

export type AreaStatEntry = StatEntry;

export interface MonthlyUserStat {
    userId: string;
    userName: string;
    area: string;
    monthly: { count50: number; count75: number }[]; // Index 0 = Jan, 11 = Dec
    total50: number;
    total75: number;
}

export interface DailyUserStat {
    userId: string;
    userName: string;
    area: string;
    daily: {
        count50: number;
        count75: number;
        display50?: string | number;
        display75?: string | number;
    }[]; // Index 0 = 1st
    total50: number;
    total75: number;
}
