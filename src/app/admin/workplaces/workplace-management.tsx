'use client';

import { useState, useTransition } from 'react';
import styles from './workplace-management.module.css';
import { addWorkplaceAction, updateWorkplaceAction, deleteWorkplaceAction, searchAddressAction } from '../../actions';
import { Workplace } from '@/lib/data';

export default function WorkplaceManagement({ workplaces }: { workplaces: Workplace[] }) {
    const [newWorkplace, setNewWorkplace] = useState({ name: '', address: '', lat: 0, lng: 0, radius: 100 });
    const [editingWorkplace, setEditingWorkplace] = useState<Workplace | null>(null);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!newWorkplace.lat || !newWorkplace.lng) {
            setError('주소를 검색하여 위치를 설정해주세요.');
            return;
        }

        startTransition(async () => {
            const result = await addWorkplaceAction(newWorkplace);
            if (result.success) {
                setNewWorkplace({ name: '', address: '', lat: 0, lng: 0, radius: 100 });
            } else {
                setError(result.error || 'Failed to add workplace');
            }
        });
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까? 해당 근무지에 배정된 사원들의 근무지 설정이 해제됩니다.')) return;
        startTransition(async () => {
            const result = await deleteWorkplaceAction(id);
            if (!result.success) {
                setError(result.error || 'Failed to delete workplace');
            }
        });
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>근무지 관리</h1>
            </div>

            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>새 근무지 등록</h2>
                <form onSubmit={handleAdd} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>근무지 명칭</label>
                        <input
                            className={styles.input}
                            value={newWorkplace.name}
                            onChange={e => setNewWorkplace({ ...newWorkplace, name: e.target.value })}
                            placeholder="예: 본사, 1공장"
                            required
                        />
                    </div>

                    {/* Address Search spans 2 columns or full width depending on layout, but let's keep it simple */}
                    <div style={{ gridColumn: '1 / -1' }}>
                        <AddressSearch
                            address={newWorkplace.address}
                            lat={newWorkplace.lat}
                            lng={newWorkplace.lng}
                            onSelect={(addr, lat, lng) => setNewWorkplace({ ...newWorkplace, address: addr, lat, lng })}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>허용 반경 (미터)</label>
                        <input
                            type="number"
                            className={styles.input}
                            value={newWorkplace.radius}
                            onChange={e => setNewWorkplace({ ...newWorkplace, radius: parseInt(e.target.value) || 100 })}
                            required
                            placeholder="기본값: 100"
                        />
                    </div>

                    <button type="submit" className={styles.addButton} disabled={isPending}>
                        {isPending ? '등록 중...' : '근무지 등록'}
                    </button>
                </form>
                {error && <p className={styles.error}>{error}</p>}
            </div>

            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>등록된 근무지 목록</h2>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>명칭</th>
                                <th>주소</th>
                                <th>반경</th>
                                <th>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {workplaces.map(wp => (
                                <tr key={wp.id}>
                                    <td>{wp.name}</td>
                                    <td>{wp.address}</td>
                                    <td>{wp.radius}m</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => setEditingWorkplace(wp)}
                                                className={styles.resetButton}
                                            >
                                                수정
                                            </button>
                                            <button
                                                onClick={() => handleDelete(wp.id)}
                                                className={styles.deleteButton}
                                            >
                                                삭제
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {workplaces.length === 0 && (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                                        등록된 근무지가 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingWorkplace && (
                <EditModal
                    workplace={editingWorkplace}
                    onClose={() => setEditingWorkplace(null)}
                    onSave={async (id, updates) => {
                        startTransition(async () => {
                            const result = await updateWorkplaceAction(id, updates);
                            if (result.success) {
                                setEditingWorkplace(null);
                            } else {
                                alert(result.error);
                            }
                        });
                    }}
                    isPending={isPending}
                />
            )}
        </div>
    );
}

function EditModal({ workplace, onClose, onSave, isPending }: { workplace: Workplace, onClose: () => void, onSave: (id: string, updates: Partial<Workplace>) => void, isPending: boolean }) {
    const [updates, setUpdates] = useState(workplace);

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(2px)' // Lighter overlay
        }}>
            <div style={{
                background: '#fff', padding: '2rem', borderRadius: '12px',
                width: '90%', maxWidth: '500px', border: '1px solid #e5e7eb',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#111', fontSize: '1.25rem', fontWeight: 'bold' }}>근무지 수정</h3>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    onSave(workplace.id, updates);
                }}>
                    <div className={styles.inputGroup} style={{ marginBottom: '1rem' }}>
                        <label className={styles.label}>근무지 명칭</label>
                        <input
                            className={styles.input}
                            value={updates.name}
                            onChange={e => setUpdates({ ...updates, name: e.target.value })}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <AddressSearch
                            address={updates.address}
                            lat={updates.lat}
                            lng={updates.lng}
                            onSelect={(addr, lat, lng) => setUpdates({ ...updates, address: addr, lat, lng })}
                        />
                    </div>

                    <div className={styles.inputGroup} style={{ marginBottom: '1.5rem' }}>
                        <label className={styles.label}>허용 반경 (미터)</label>
                        <input
                            type="number"
                            className={styles.input}
                            value={updates.radius}
                            onChange={e => setUpdates({ ...updates, radius: parseInt(e.target.value) || 100 })}
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ padding: '0.75rem 1.5rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', color: '#374151', cursor: 'pointer', fontWeight: 600 }}
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            style={{ padding: '0.75rem 1.5rem', background: '#2563eb', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontWeight: 600 }}
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

function AddressSearch({ address, lat, lng, onSelect }: { address: string, lat: number, lng: number, onSelect: (addr: string, lat: number, lng: number) => void }) {
    const [query, setQuery] = useState(address);
    const [results, setResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    const handleSearch = async () => {
        if (!query) {
            alert('검색어를 입력해주세요.');
            return;
        }
        setSearching(true);
        try {
            // Use Server Action here
            const result = await searchAddressAction(query);
            if (result.success) {
                if (result.data && result.data.length > 0) {
                    setResults(result.data);
                } else {
                    alert('검색 결과가 없습니다.');
                    setResults([]);
                }
            } else {
                alert('주소 검색 실패 (Server): ' + (result.error || 'Unknown error'));
            }
        } catch (e: any) {
            alert('주소 검색 에러 (Client): ' + e.message);
        } finally {
            setSearching(false);
        }
    };

    return (
        <div className={styles.inputGroup} style={{ marginBottom: '0.5rem' }}>
            <label className={styles.label}>주소 검색</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSearch();
                        }
                    }}
                    placeholder="예: 서울특별시 중구 세종대로 110"
                    className={styles.input}
                    style={{ flex: 1 }}
                />
                <button
                    type="button"
                    onClick={handleSearch}
                    disabled={searching}
                    style={{
                        padding: '0.75rem 1.5rem',
                        background: '#374151',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {searching ? '...' : '검색'}
                </button>
            </div>

            {results.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                    <p style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 600, marginBottom: '0.25rem' }}>
                        ⬇️ 검색 결과 중 하나를 클릭하여 선택해주세요:
                    </p>
                    <ul style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        background: '#fff',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}>
                        {results.map((r, i) => (
                            <li
                                key={i}
                                onClick={() => {
                                    setQuery(r.display_name);
                                    onSelect(r.display_name, parseFloat(r.lat), parseFloat(r.lon));
                                    setResults([]);
                                    setSearching(false); // Clear searching state
                                }}
                                style={{
                                    padding: '0.75rem',
                                    borderBottom: i === results.length - 1 ? 'none' : '1px solid #f3f4f6',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    color: '#374151',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#eff6ff'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <span style={{ fontWeight: 'bold', color: '#111' }}>[선택]</span> {r.display_name}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem' }}>
                <div>위도: {lat || '-'}</div>
                <div>경도: {lng || '-'}</div>
            </div>
        </div>
    );
}
