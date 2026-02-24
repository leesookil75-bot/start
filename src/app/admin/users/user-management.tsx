'use client';

import { useState, useTransition } from 'react';
import styles from './user-management.module.css';
import { createUser, deleteUserAction, resetUserPassword, updateUserAction } from '../../actions';

import { Workplace } from '@/lib/data';

type User = {
    id: string;
    phoneNumber: string;
    name: string;
    cleaningArea: string;
    role: 'admin' | 'cleaner';
    createdAt: string;
    workAddress?: string;
    workLat?: number;
    workLng?: number;
    allowedRadius?: number;
    workplaceId?: string; // Add workplaceId to User type locally
    totalLeaves?: number;
};

export default function UserManagement({ initialUsers, workplaces }: { initialUsers: User[], workplaces: Workplace[] }) {
    // Note: For a real app, we might want to use optimistic updates or re-fetch, 
    // ... comments ...

    const [newUser, setNewUser] = useState({ name: '', phoneNumber: '', cleaningArea: '', role: 'cleaner' as const, workplaceId: '', totalLeaves: 15 });
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        startTransition(async () => {
            // Filter out empty workplaceId
            const submission = { ...newUser };
            if (submission.workplaceId === '') delete (submission as any).workplaceId;

            const result = await createUser(submission);
            if (result.success) {
                setNewUser({ name: '', phoneNumber: '', cleaningArea: '', role: 'cleaner', workplaceId: '', totalLeaves: 15 });
            } else {
                setError(result.error || 'Failed to add user');
            }
        });
    };

    const setNewWorkplaceIdWithAreaReset = (wpId: string) => {
        setNewUser(prev => ({ ...prev, workplaceId: wpId, cleaningArea: '' }));
    };

    // ... handleDelete ... (keep as is)
    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        startTransition(async () => {
            const result = await deleteUserAction(id);
            if (!result.success) {
                setError(result.error || 'Failed to delete user');
            }
        });
    };

    return (
        <div className={styles.container}>
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>새 사용자 추가</h2>
                <form onSubmit={handleAdd} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>이름</label>
                        <input
                            className={styles.input}
                            value={newUser.name}
                            onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                            required
                            placeholder="홍길동"
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>전화번호</label>
                        <input
                            className={styles.input}
                            value={newUser.phoneNumber}
                            onChange={e => setNewUser({ ...newUser, phoneNumber: e.target.value })}
                            required
                            placeholder="010-1234-5678"
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>근무지 선택 (선택 사항)</label>
                        <select
                            className={styles.input}
                            value={newUser.workplaceId}
                            onChange={e => setNewWorkplaceIdWithAreaReset(e.target.value)}
                            style={{ background: '#333', color: 'white', border: '1px solid #444' }}
                        >
                            <option value="">- 근무지 미지정 (또는 개별 설정) -</option>
                            {workplaces.map(wp => (
                                <option key={wp.id} value={wp.id}>
                                    {wp.dong ? `[${wp.dong}] ` : ''}{wp.name} ({wp.address})
                                </option>
                            ))}
                        </select>
                        <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.3rem' }}>
                            * 근무지를 선택하면 해당 위치로 출퇴근 지역이 설정됩니다.
                        </p>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>담당 구역</label>
                        {(() => {
                            const selectedWp = workplaces.find(wp => wp.id === newUser.workplaceId);
                            if (selectedWp && selectedWp.subAreas && selectedWp.subAreas.length > 0) {
                                return (
                                    <select
                                        className={styles.input}
                                        value={newUser.cleaningArea}
                                        onChange={e => setNewUser({ ...newUser, cleaningArea: e.target.value })}
                                        required
                                        style={{ background: '#333', color: 'white', border: '1px solid #444' }}
                                    >
                                        <option value="">- 구역 선택 -</option>
                                        {selectedWp.subAreas.map((sa, idx) => (
                                            <option key={idx} value={sa}>{sa}</option>
                                        ))}
                                    </select>
                                );
                            }
                            return (
                                <input
                                    className={styles.input}
                                    value={newUser.cleaningArea}
                                    onChange={e => setNewUser({ ...newUser, cleaningArea: e.target.value })}
                                    required
                                    placeholder="A동 1층"
                                />
                            );
                        })()}
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>연차 일수</label>
                        <input
                            type="number"
                            className={styles.input}
                            value={newUser.totalLeaves}
                            onChange={e => setNewUser({ ...newUser, totalLeaves: parseInt(e.target.value) || 0 })}
                            required
                            placeholder="15"
                            min="0"
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>근무지 선택 (선택 사항)</label>
                        <select
                            className={styles.input}
                            value={newUser.workplaceId}
                            onChange={e => setNewUser({ ...newUser, workplaceId: e.target.value })}
                            style={{ background: '#333', color: 'white', border: '1px solid #444' }}
                        >
                            <option value="">- 근무지 미지정 (또는 개별 설정) -</option>
                            {workplaces.map(wp => (
                                <option key={wp.id} value={wp.id}>
                                    {wp.name} ({wp.address})
                                </option>
                            ))}
                        </select>
                        <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.3rem' }}>
                            * 근무지를 선택하면 해당 위치로 출퇴근 지역이 설정됩니다.
                        </p>
                    </div>

                    <button type="submit" className={styles.addButton} disabled={isPending}>
                        {isPending ? '추가 중...' : '사용자 추가'}
                    </button>
                </form>
                {error && <p className={styles.error}>{error}</p>}
            </div>

            <div className={styles.section}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>등록된 사용자</h2>
                    <button
                        onClick={async () => {
                            if (confirm('사용자 목록에 없는 유령 데이터를 정리하시겠습니까?\n이 작업은 리포트에서 "Unknown"으로 표시되는 데이터를 삭제합니다.')) {
                                startTransition(async () => {
                                    const { cleanupOrphanedRecordsAction } = await import('../../actions');
                                    const result = await cleanupOrphanedRecordsAction();
                                    if (result.success) {
                                        alert(`${result.count}개의 유령 데이터가 정리되었습니다.`);
                                    } else {
                                        setError(result.error || 'Failed to cleanup data');
                                    }
                                });
                            }
                        }}
                        style={{
                            padding: '0.4rem 0.8rem',
                            background: '#555',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                        }}
                    >
                        유령 데이터 정리
                    </button>
                </div>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>이름</th>
                                <th>전화번호</th>
                                <th>담당 구역</th>
                                <th>역할</th>
                                <th>근무지</th>
                                <th>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {initialUsers.map(user => {
                                const userWorkplace = workplaces.find(wp => wp.id === user.workplaceId);
                                return (
                                    <tr key={user.id}>
                                        <td>{user.name}</td>
                                        <td>{user.phoneNumber}</td>
                                        <td>{user.cleaningArea}</td>
                                        <td>
                                            <span style={{
                                                padding: '0.2rem 0.5rem',
                                                borderRadius: '4px',
                                                background: user.role === 'admin' ? '#7c4dff' : '#444',
                                                fontSize: '0.8rem',
                                                color: 'white'
                                            }}>
                                                {user.role === 'admin' ? '관리자' : '청소부'}
                                            </span>
                                        </td>
                                        <td>{userWorkplace ? `${userWorkplace.dong ? `[${userWorkplace.dong}] ` : ''}${userWorkplace.name}` : (user.workAddress ? '개별 설정' : '-')}</td>
                                        <td>
                                            {/* ... buttons ... */}
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    className={styles.resetButton}
                                                    onClick={() => setEditingUser(user)}
                                                    style={{ background: '#2196F3', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}
                                                >
                                                    수정
                                                </button>
                                                {user.role !== 'admin' && (
                                                    <>
                                                        <button
                                                            className={styles.resetButton}
                                                            onClick={() => {
                                                                if (confirm(`비밀번호를 초기화하시겠습니까?\n(${user.phoneNumber.slice(-4)})`)) {
                                                                    startTransition(async () => {
                                                                        const result = await resetUserPassword(user.id);
                                                                        if (result.success) {
                                                                            alert('비밀번호가 초기화되었습니다.');
                                                                        } else {
                                                                            setError(result.error || 'Failed to reset password');
                                                                        }
                                                                    });
                                                                }
                                                            }}
                                                            disabled={isPending}
                                                            title="비밀번호를 전화번호 뒤 4자리로 초기화"
                                                        >
                                                            비번초기화
                                                        </button>
                                                        <button
                                                            className={styles.deleteButton}
                                                            onClick={() => handleDelete(user.id)}
                                                            disabled={isPending}
                                                        >
                                                            삭제
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {initialUsers.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', opacity: 0.5 }}>등록된 사용자가 없습니다.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingUser && (
                <EditModal
                    user={editingUser}
                    workplaces={workplaces}
                    onClose={() => setEditingUser(null)}
                    onSave={async (id, updates) => {
                        startTransition(async () => {
                            const result = await updateUserAction(id, updates);
                            if (result.success) {
                                setEditingUser(null);
                            } else {
                                setError(result.error || 'Failed to update user');
                            }
                        });
                    }}
                    isPending={isPending}
                />
            )}
        </div>
    );
}

function EditModal({ user, workplaces, onClose, onSave, isPending }: { user: User, workplaces: Workplace[], onClose: () => void, onSave: (id: string, updates: any) => void, isPending: boolean }) {
    const [selectedWorkplaceId, setSelectedWorkplaceId] = useState(user.workplaceId || '');
    const [cleaningArea, setCleaningArea] = useState(user.cleaningArea || '');

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: '#1a1a1a', padding: '2rem', borderRadius: '8px',
                width: '90%', maxWidth: '400px', border: '1px solid #333',
                maxHeight: '90vh', overflowY: 'auto'
            }}>
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'white' }}>사용자 정보 수정</h3>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    // Role is manually handled if needed, or excluded if readonly
                    const formData = new FormData(e.currentTarget);
                    const updates: any = {
                        name: formData.get('name') as string,
                        phoneNumber: formData.get('phoneNumber') as string,
                        cleaningArea: formData.get('cleaningArea') as string,
                        role: formData.get('role') as 'admin' | 'cleaner',
                        workplaceId: formData.get('workplaceId') as string || null, // Convert empty string to null for DB
                        totalLeaves: parseInt(formData.get('totalLeaves') as string) || 15
                    };

                    // If workplaceId is NOT selected, we use the manual fields
                    if (!updates.workplaceId) {
                        updates.workAddress = formData.get('workAddress') as string;
                        updates.workLat = formData.get('workLat') ? parseFloat(formData.get('workLat') as string) : undefined;
                        updates.workLng = formData.get('workLng') ? parseFloat(formData.get('workLng') as string) : undefined;
                        updates.allowedRadius = formData.get('allowedRadius') ? parseInt(formData.get('allowedRadius') as string) : 100;
                    } else {
                        // If workplace IS selected, we might want to clear manual overrides or just leave them as fallback?
                        // Let's clear them to avoid confusion, or rely on logic that workplaceId takes precedence.
                        // Logic in data.ts prioritizes workplaceId, but let's send null to be clean?
                        // Actually data.ts update logic:
                        // work_address = ${updates.workAddress ?? user.work_address}
                        // If we don't include workAddress in updates, it keeps old value.
                        // So we should explicitly set them to null if we want to clear them.
                        // But maybe we don't need to clear them, just let workplaceId take effect.
                        // Let's keep it simple: just update workplaceId.
                    }

                    onSave(user.id, updates);
                }}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>이름</label>
                        <input
                            name="name"
                            defaultValue={user.name}
                            className={styles.input}
                            required
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>전화번호</label>
                        <input
                            name="phoneNumber"
                            defaultValue={user.phoneNumber}
                            className={styles.input}
                            required
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>담당 구역</label>
                        {(() => {
                            const selectedWp = workplaces.find(wp => wp.id === selectedWorkplaceId);
                            if (selectedWp && selectedWp.subAreas && selectedWp.subAreas.length > 0) {
                                return (
                                    <select
                                        name="cleaningArea"
                                        value={cleaningArea}
                                        onChange={e => setCleaningArea(e.target.value)}
                                        className={styles.input}
                                        required
                                        style={{ background: '#333', color: 'white', border: '1px solid #444' }}
                                    >
                                        <option value="">- 구역 선택 -</option>
                                        {selectedWp.subAreas.map((sa, idx) => (
                                            <option key={idx} value={sa}>{sa}</option>
                                        ))}
                                    </select>
                                );
                            }
                            return (
                                <input
                                    name="cleaningArea"
                                    value={cleaningArea}
                                    onChange={e => setCleaningArea(e.target.value)}
                                    className={styles.input}
                                    required
                                />
                            );
                        })()}
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>역할</label>
                        <select
                            name="role"
                            defaultValue={user.role}
                            className={styles.input}
                            style={{ background: '#333', color: 'white', border: '1px solid #444' }}
                        >
                            <option value="cleaner">청소부</option>
                            <option value="admin">관리자</option>
                        </select>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>연차 일수</label>
                        <input
                            type="number"
                            name="totalLeaves"
                            defaultValue={user.totalLeaves ?? 15}
                            className={styles.input}
                            required
                            min="0"
                        />
                    </div>

                    <hr style={{ margin: '1.5rem 0', borderColor: '#444' }} />
                    <h4 style={{ margin: '0 0 1rem 0', color: '#ccc' }}>근무지 설정</h4>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>근무지 선택</label>
                        <select
                            name="workplaceId"
                            value={selectedWorkplaceId}
                            onChange={e => setSelectedWorkplaceId(e.target.value)}
                            className={styles.input}
                            style={{ background: '#333', color: 'white', border: '1px solid #444' }}
                        >
                            <option value="">- 개별 설정 (아래에서 직접 지정) -</option>
                            {workplaces.map(wp => (
                                <option key={wp.id} value={wp.id}>
                                    {wp.dong ? `[${wp.dong}] ` : ''}{wp.name} ({wp.address})
                                </option>
                            ))}
                        </select>
                    </div>

                    {!selectedWorkplaceId && (
                        <div style={{ border: '1px solid #444', padding: '1rem', borderRadius: '4px', background: '#222' }}>
                            <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#ccc' }}>
                                📍 개별 위치 지정
                            </p>
                            <AddressSearch
                                initialAddress={user.workAddress}
                                initialLat={user.workLat}
                                initialLng={user.workLng}
                            />
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>반경 (미터)</label>
                                <input
                                    name="allowedRadius"
                                    type="number"
                                    defaultValue={user.allowedRadius || 100}
                                    placeholder="기본값: 100"
                                    className={styles.input}
                                />
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ flex: 1, padding: '0.8rem', background: '#444', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            style={{ flex: 1, padding: '0.8rem', background: 'var(--accent-color)', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}
                            disabled={isPending}
                        >
                            {isPending ? '저장 중...' : '저장'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function AddressSearch({ initialAddress, initialLat, initialLng }: { initialAddress?: string, initialLat?: number, initialLng?: number }) {
    const [address, setAddress] = useState(initialAddress || '');
    const [lat, setLat] = useState(initialLat);
    const [lng, setLng] = useState(initialLng);
    const [results, setResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    const handleSearch = async () => {
        if (!address) return;
        setSearching(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`, {
                headers: {
                    'Referer': 'https://clean-track.vercel.app', // Required by Nominatim usage policy
                    'User-Agent': 'CleanTrackApp/1.0'
                }
            });
            const data = await response.json();
            setResults(data);
        } catch (e) {
            alert('주소 검색 실패');
        } finally {
            setSearching(false);
        }
    };

    const handleSelect = (result: any) => {
        setAddress(result.display_name);
        setLat(parseFloat(result.lat));
        setLng(parseFloat(result.lon));
        setResults([]);
    };

    return (
        <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#ccc' }}>주소 검색</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                    type="text"
                    name="workAddress"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="예: 서울특별시 중구 세종대로 110"
                    style={{ flex: 1, padding: '0.5rem', background: '#333', border: '1px solid #444', color: 'white', borderRadius: '4px' }}
                />
                <button
                    type="button"
                    onClick={handleSearch}
                    disabled={searching}
                    style={{ padding: '0.5rem 1rem', background: '#555', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    {searching ? '...' : '검색'}
                </button>
            </div>

            {results.length > 0 && (
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem 0', maxHeight: '150px', overflowY: 'auto', background: '#222', border: '1px solid #444', borderRadius: '4px' }}>
                    {results.map((r, i) => (
                        <li
                            key={i}
                            onClick={() => handleSelect(r)}
                            style={{ padding: '0.5rem', borderBottom: '1px solid #333', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                            {r.display_name}
                        </li>
                    ))}
                </ul>
            )}

            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#888' }}>
                <div>위도: {lat ?? '-'}</div>
                <div>경도: {lng ?? '-'}</div>
            </div>
            <input type="hidden" name="workLat" value={lat ?? ''} />
            <input type="hidden" name="workLng" value={lng ?? ''} />

            <button
                type="button"
                onClick={() => {
                    if (!navigator.geolocation) {
                        alert('Geolocation is not supported by your browser');
                        return;
                    }
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            setLat(position.coords.latitude);
                            setLng(position.coords.longitude);
                            setAddress('📍 현위치 좌표 설정됨');
                        },
                        (error) => {
                            alert('위치 정보를 가져올 수 없습니다.');
                        }
                    );
                }}
                style={{
                    marginTop: '0.5rem',
                    fontSize: '0.8rem',
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                }}
            >
                📍 현재 위치 좌표로 설정
            </button>
        </div>
    );
}
