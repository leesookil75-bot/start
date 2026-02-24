'use client';

import { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import '@/app/vacations/apply/calendar-override.css';
import { LeaveRequest } from '@/lib/types';
import { processVacationRequest } from '@/app/vacations/actions';

export default function MobileVacationManager({ initialRequests }: { initialRequests: LeaveRequest[] }) {
    const [requests, setRequests] = useState<LeaveRequest[]>(initialRequests);
    const [activeTab, setActiveTab] = useState<'pending' | 'calendar'>('pending');

    // Calendar state
    const [date, setDate] = useState<Date>(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const pendingRequests = requests.filter(r => r.status === 'PENDING');
    const approvedRequests = requests.filter(r => r.status === 'APPROVED');

    const handleProcess = async (id: string, approved: boolean, userName: string) => {
        if (!confirm(`${userName}님의 휴가를 ${approved ? '승인' : '반려'}하시겠습니까?`)) return;

        const result = await processVacationRequest(id, approved);
        if (result.success) {
            setRequests(prev => prev.map(r =>
                r.id === id ? { ...r, status: approved ? 'APPROVED' : 'REJECTED' } : r
            ));
        } else {
            alert('처리 실패: ' + result.error);
        }
    };

    const getLeavesOnDate = (d: Date) => {
        const offset = d.getTimezoneOffset() * 60000;
        const localDate = new Date(d.getTime() - offset).toISOString().split('T')[0];

        return approvedRequests.filter(r =>
            localDate >= r.startDate && localDate <= r.endDate
        );
    };

    const tileContent = ({ date: tileDate, view }: { date: Date, view: string }) => {
        if (view !== 'month') return null;

        const leavesOnDay = getLeavesOnDate(tileDate);
        if (leavesOnDay.length === 0) return null;

        return (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', marginTop: '4px', flexWrap: 'wrap', maxWidth: '100%' }}>
                {leavesOnDay.slice(0, 3).map((_, i) => (
                    <div key={i} style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#10b981' }} />
                ))}
                {leavesOnDay.length > 3 && (
                    <div style={{ fontSize: '8px', color: '#10b981', lineHeight: '4px' }}>+</div>
                )}
            </div>
        );
    };

    const selectedLeaves = selectedDate ? getLeavesOnDate(selectedDate) : [];

    return (
        <div style={{ padding: '1rem', background: '#121212', minHeight: '100vh', color: '#fff', paddingBottom: '3rem' }}>
            <header style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
                <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem' }}>
                    &larr;
                </button>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 2px 0' }}>휴가 관리</h1>
            </header>

            {/* Tabs */}
            <div style={{ display: 'flex', background: '#1e1e1e', borderRadius: '12px', padding: '0.25rem', marginBottom: '1.5rem' }}>
                <button
                    onClick={() => setActiveTab('pending')}
                    style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: 'none', background: activeTab === 'pending' ? '#333' : 'transparent', color: activeTab === 'pending' ? '#fff' : '#aaa', fontWeight: 'bold' }}
                >
                    대기 목록
                    {pendingRequests.length > 0 && (
                        <span style={{ marginLeft: '0.5rem', background: '#ef4444', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '99px', fontSize: '0.75rem' }}>
                            {pendingRequests.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('calendar')}
                    style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: 'none', background: activeTab === 'calendar' ? '#333' : 'transparent', color: activeTab === 'calendar' ? '#fff' : '#aaa', fontWeight: 'bold' }}
                >
                    달력 뷰
                </button>
            </div>

            {/* Pending Tab */}
            {activeTab === 'pending' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {pendingRequests.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#888' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                            결재 대기 중인 휴가가 없습니다.
                        </div>
                    ) : (
                        pendingRequests.map(req => (
                            <div key={req.id} style={{ background: '#1e1e1e', borderRadius: '16px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{req.userName}</span>
                                        <span style={{ fontSize: '0.8rem', color: '#aaa' }}>{req.cleaningArea}</span>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: '#888' }}>{req.createdAt.split('T')[0]} 신청</span>
                                </div>

                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                    <div style={{ color: '#3b82f6', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                        📅 {req.startDate} ~ {req.endDate}
                                    </div>
                                    <div style={{ color: '#ccc' }}>{req.reason}</div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => handleProcess(req.id, false, req.userName || '알 수 없음')}
                                        style={{ flex: 1, padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '12px', fontWeight: 'bold' }}
                                    >
                                        반려
                                    </button>
                                    <button
                                        onClick={() => handleProcess(req.id, true, req.userName || '알 수 없음')}
                                        style={{ flex: 1, padding: '0.75rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold' }}
                                    >
                                        승인
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Calendar Tab */}
            {activeTab === 'calendar' && (
                <div>
                    <div style={{ background: '#1e1e1e', padding: '1rem', borderRadius: '16px', marginBottom: '1rem' }}>
                        <Calendar
                            onChange={(d) => {
                                setDate(d as Date);
                                setSelectedDate(d as Date);
                            }}
                            value={date}
                            tileContent={tileContent}
                            className="mobile-admin-calendar"
                        />
                    </div>

                    {/* Bottom Sheet for Selected Date */}
                    {selectedDate && (
                        <div style={{ background: '#1e1e1e', borderRadius: '16px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)', animation: 'slideUp 0.3s' }}>
                            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 휴가자</span>
                                <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '0.2rem 0.6rem', borderRadius: '99px', fontSize: '0.8rem' }}>
                                    {selectedLeaves.length}명
                                </span>
                            </h3>

                            {selectedLeaves.length === 0 ? (
                                <p style={{ color: '#888', margin: 0, textAlign: 'center', padding: '1rem 0' }}>이 날은 휴가자가 없습니다.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {selectedLeaves.map(l => (
                                        <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                                            <div>
                                                <span style={{ fontWeight: 'bold', marginRight: '0.5rem' }}>{l.userName}</span>
                                                <span style={{ fontSize: '0.8rem', color: '#aaa' }}>{l.cleaningArea}</span>
                                            </div>
                                            <span style={{ fontSize: '0.8rem', color: '#888' }}>잔여: {l.remainingLeaves}일</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
            <style jsx global>{`
                .mobile-admin-calendar {
                    width: 100%;
                    background: transparent !important;
                    border: none !important;
                    color: white;
                    font-family: inherit;
                }
                .mobile-admin-calendar .react-calendar__navigation button {
                    color: white;
                    min-width: 44px;
                    background: none;
                }
                .mobile-admin-calendar .react-calendar__navigation button:enabled:hover,
                .mobile-admin-calendar .react-calendar__navigation button:enabled:focus {
                    background: rgba(255, 255, 255, 0.1);
                }
                .mobile-admin-calendar .react-calendar__month-view__weekdays__weekday {
                    color: #aaa;
                    font-weight: bold;
                    text-decoration: none;
                }
                .mobile-admin-calendar .react-calendar__month-view__weekdays__weekday abbr {
                    text-decoration: none;
                }
                .mobile-admin-calendar .react-calendar__tile {
                    color: white;
                    padding: 0.5em 0.25em;
                }
                .mobile-admin-calendar .react-calendar__tile:enabled:hover,
                .mobile-admin-calendar .react-calendar__tile:enabled:focus {
                    background: rgba(255, 255, 255, 0.1) !important;
                    border-radius: 8px;
                }
                .mobile-admin-calendar .react-calendar__tile--now {
                    background: rgba(59, 130, 246, 0.2) !important;
                    color: #60a5fa !important;
                    border-radius: 8px;
                }
                .mobile-admin-calendar .react-calendar__tile--active,
                .mobile-admin-calendar .react-calendar__tile--active:enabled:hover,
                .mobile-admin-calendar .react-calendar__tile--active:enabled:focus {
                    background: #3b82f6 !important;
                    color: white !important;
                    border-radius: 8px;
                }
                .mobile-admin-calendar .react-calendar__month-view__days__day--weekend {
                    color: #fca5a5;
                }
            `}</style>
        </div>
    );
}
