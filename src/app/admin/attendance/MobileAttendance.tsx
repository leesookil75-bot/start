'use client';

import { useState, useTransition } from 'react';
import { User, LeaveRequest } from '@/lib/data';
import { upsertDailyAttendanceAction } from '../../actions';

interface MonthlyData {
    users: User[];
    records: any[];
    workplaces?: any[];
}

interface MobileAttendanceProps {
    year: number;
    month: number;
    data: MonthlyData;
    vacations: LeaveRequest[];
}

export default function MobileAttendance({ year, month, data, vacations }: MobileAttendanceProps) {
    const todayKst = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
    const defaultDate = todayKst.toISOString().split('T')[0];

    // We can allow admin to pick any day, but default to current KST date.
    // If we only have monthly data, we should restrict to days in this month.
    // For simplicity, just use a state for the selected day of the current month.
    const [selectedDay, setSelectedDay] = useState(todayKst.getUTCFullYear() === year && (todayKst.getUTCMonth() + 1) === month ? todayKst.getUTCDate() : 1);
    const [selectedWorkplace, setSelectedWorkplace] = useState<string>('');

    // Group users by Area
    const filteredUsers = selectedWorkplace ? data.users.filter(u => u.workplaceId === selectedWorkplace) : data.users;

    const usersByArea = filteredUsers.reduce((acc, user) => {
        const wp = data.workplaces?.find(w => w.id === user.workplaceId);
        const areaName = wp ? `${wp.name} ${user.cleaningArea || '미지정'}` : (user.cleaningArea || '미지정');
        if (!acc[areaName]) acc[areaName] = [];
        acc[areaName].push(user);
        return acc;
    }, {} as Record<string, User[]>);

    const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>(
        Object.keys(usersByArea).reduce((acc, area) => ({ ...acc, [area]: true }), {})
    );

    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editInTime, setEditInTime] = useState('');
    const [editOutTime, setEditOutTime] = useState('');
    const [isPending, startTransition] = useTransition();

    const toggleArea = (area: string) => {
        setExpandedAreas(prev => ({ ...prev, [area]: !prev[area] }));
    };

    // Get attendance info for a specific user and day
    const getAttendanceInfo = (userId: string, day: number) => {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const recordsForDay = data.records.filter(r => {
            const kstDate = new Date(new Date(r.timestamp).getTime() + 9 * 60 * 60 * 1000);
            return r.userId === userId && kstDate.getUTCDate() === day;
        });

        recordsForDay.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        const inRecord = recordsForDay.find(r => r.type === 'CHECK_IN');
        const outRecord = [...recordsForDay].reverse().find(r => r.type === 'CHECK_OUT');

        const format = (ts: string) => {
            const dElem = new Date(ts);
            return dElem.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul' });
        };

        const inText = inRecord ? format(inRecord.timestamp) : '-';
        const outText = outRecord ? format(outRecord.timestamp) : '-';

        // Check if vacation
        const isOnVacation = vacations.some(v =>
            v.userId === userId &&
            v.status === 'APPROVED' &&
            v.startDate <= dateStr &&
            v.endDate >= dateStr
        );

        let isLate = false;
        if (inRecord) {
            const inTime = new Date(inRecord.timestamp);
            const kstIn = new Date(inTime.getTime() + 9 * 60 * 60 * 1000);
            if (kstIn.getUTCHours() > 9 || (kstIn.getUTCHours() === 9 && kstIn.getUTCMinutes() > 0)) {
                isLate = true;
            }
        }

        return { inText, outText, isLate, isOnVacation, dateStr };
    };

    const handleSave = () => {
        if (!editingUser) return;
        const info = getAttendanceInfo(editingUser.id, selectedDay);

        startTransition(async () => {
            const result = await upsertDailyAttendanceAction(
                editingUser.id,
                info.dateStr,
                editInTime === '-' ? null : editInTime || null,
                editOutTime === '-' ? null : editOutTime || null
            );

            if (!result.success) {
                alert(result.error);
            } else {
                setEditingUser(null);
            }
        });
    };

    const daysInMonth = new Date(year, month, 0).getDate();

    return (
        <div style={{ padding: '1rem', background: '#121212', minHeight: '100vh', color: '#fff', paddingBottom: '2rem' }}>
            <header style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
                <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem' }}>
                    &larr;
                </button>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 2px 0' }}>출퇴근 현황</h1>
                    <div style={{ fontSize: '0.85rem', color: '#aaa' }}>{year}년 {month}월 {selectedDay}일</div>
                </div>
            </header>

            {data.workplaces && data.workplaces.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                    <select
                        value={selectedWorkplace}
                        onChange={e => setSelectedWorkplace(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: '#1e1e1e', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                        <option value="">전체 근무지</option>
                        {data.workplaces.map(wp => (
                            <option key={wp.id} value={wp.id}>{wp.name}</option>
                        ))}
                    </select>
                </div>
            )}


            {/* Date Slider */}
            <div style={{ display: 'flex', overflowX: 'auto', gap: '0.5rem', paddingBottom: '1rem', marginBottom: '1rem', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                    <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        style={{
                            minWidth: '3.5rem',
                            padding: '0.75rem 0',
                            borderRadius: '12px',
                            border: 'none',
                            background: selectedDay === day ? '#3b82f6' : '#1e1e1e',
                            color: selectedDay === day ? '#fff' : '#aaa',
                            fontWeight: 'bold',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.25rem'
                        }}
                    >
                        <span style={{ fontSize: '0.75rem', fontWeight: 'normal', opacity: 0.8 }}>{day}일</span>
                    </button>
                ))}
            </div>

            {/* Area Accordions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {Object.keys(usersByArea).map(area => (
                    <div key={area} style={{ background: '#1e1e1e', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <button
                            onClick={() => toggleArea(area)}
                            style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{area}</span>
                                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '99px', fontSize: '0.75rem' }}>
                                    {usersByArea[area].length}명
                                </span>
                            </div>
                            <span style={{ transform: expandedAreas[area] ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                        </button>

                        {expandedAreas[area] && (
                            <div style={{ padding: '0 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {usersByArea[area].map(user => {
                                    const info = getAttendanceInfo(user.id, selectedDay);
                                    return (
                                        <div
                                            key={user.id}
                                            onClick={() => {
                                                setEditingUser(user);
                                                setEditInTime(info.inText !== '-' ? info.inText : '');
                                                setEditOutTime(info.outText !== '-' ? info.outText : '');
                                            }}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '1rem',
                                                background: info.isOnVacation ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0,0,0,0.2)',
                                                border: info.isOnVacation ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent',
                                                borderRadius: '12px'
                                            }}
                                        >
                                            <div style={{ fontWeight: 'bold' }}>{user.name}</div>

                                            {info.isOnVacation ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#10b981', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                                    🌴 휴가
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: '#ccc' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                        <span style={{ fontSize: '0.7rem', color: '#888' }}>출근</span>
                                                        <span style={{ color: info.isLate ? '#ef4444' : '#fff' }}>{info.inText}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                        <span style={{ fontSize: '0.7rem', color: '#888' }}>퇴근</span>
                                                        <span style={{ color: '#fff' }}>{info.outText}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Edit Modal */}
            {editingUser && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(2px)' }} onClick={() => setEditingUser(null)}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#1e1e1e', width: '100%', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '1.5rem', animation: 'slideUp 0.3s ease-out' }}>
                        <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: '0 auto 1.5rem' }} />
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#fff' }}>시간 수정: {editingUser.name}</h2>
                        <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '1.5rem' }}>{year}년 {month}월 {selectedDay}일</div>

                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: '#aaa', marginBottom: '0.5rem' }}>출근 시간 (HH:MM)</label>
                                <input
                                    type="time"
                                    value={editInTime}
                                    onChange={e => setEditInTime(e.target.value)}
                                    style={{ width: '100%', background: '#121212', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '1rem', borderRadius: '12px', fontSize: '1.25rem', textAlign: 'center' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: '#aaa', marginBottom: '0.5rem' }}>퇴근 시간 (HH:MM)</label>
                                <input
                                    type="time"
                                    value={editOutTime}
                                    onChange={e => setEditOutTime(e.target.value)}
                                    style={{ width: '100%', background: '#121212', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '1rem', borderRadius: '12px', fontSize: '1.25rem', textAlign: 'center' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => setEditingUser(null)} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '1rem', borderRadius: '12px', fontWeight: 'bold' }}>취소</button>
                            <button onClick={handleSave} disabled={isPending} style={{ flex: 2, background: '#3b82f6', color: '#fff', border: 'none', padding: '1rem', borderRadius: '12px', fontWeight: 'bold' }}>{isPending ? '저장 중...' : '저장하기'}</button>
                        </div>
                    </div>
                </div>
            )}
            <style jsx>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
