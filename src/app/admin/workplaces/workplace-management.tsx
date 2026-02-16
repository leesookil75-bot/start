'use client';

import { useState, useTransition } from 'react';
import styles from '../admin.module.css';
import { addWorkplaceAction, updateWorkplaceAction, deleteWorkplaceAction } from '../../actions';
import { Workplace } from '@/lib/data';

// Reuse AddressSearch component from user-management? 
// Ideally refactor it to a shared component, but for now duplicate or import?
// We cannot easily import a local component from another page folder in Next.js if it's not in specific components folder.
// user-management.tsx exports UserManagement as default. AddressSearch is not exported.
// I should extract AddressSearch to a shared component first. 
// But to save time and reduce risk of breaking user-management, I will duplicate it here OR Refactor it now.
// Refactoring is better.

// But wait, the previous step just updated data.ts and actions.ts.
// Let's first create this page, and I will include AddressSearch implementation here.

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
            <h1 className={styles.pageTitle}>근무지 관리</h1>

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

                    <AddressSearch
                        address={newWorkplace.address}
                        lat={newWorkplace.lat}
                        lng={newWorkplace.lng}
                        onSelect={(addr, lat, lng) => setNewWorkplace({ ...newWorkplace, address: addr, lat, lng })}
                    />

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>허용 반경 (미터)</label>
                        <input
                            type="number"
                            className={styles.input}
                            value={newWorkplace.radius}
                            onChange={e => setNewWorkplace({ ...newWorkplace, radius: parseInt(e.target.value) || 100 })}
                            required
                        />
                    </div>

                    <button type="submit" className={styles.addButton} disabled={isPending}>
                        {isPending ? '등록 중...' : '근무지 등록'}
                    </button>
                    {error && <p className={styles.error}>{error}</p>}
                </form>
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
                                                style={{ background: '#2196F3', color: 'white', border: 'none' }}
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
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: '#1a1a1a', padding: '2rem', borderRadius: '8px',
                width: '90%', maxWidth: '500px', border: '1px solid #333'
            }}>
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'white' }}>근무지 수정</h3>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    onSave(workplace.id, updates);
                }}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>근무지 명칭</label>
                        <input
                            className={styles.input}
                            value={updates.name}
                            onChange={e => setUpdates({ ...updates, name: e.target.value })}
                            required
                        />
                    </div>

                    <AddressSearch
                        address={updates.address}
                        lat={updates.lat}
                        lng={updates.lng}
                        onSelect={(addr, lat, lng) => setUpdates({ ...updates, address: addr, lat, lng })}
                    />

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>허용 반경 (미터)</label>
                        <input
                            type="number"
                            className={styles.input}
                            value={updates.radius}
                            onChange={e => setUpdates({ ...updates, radius: parseInt(e.target.value) || 100 })}
                            required
                        />
                    </div>

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

// Duplicated AddressSearch for now (can be refactored to shared component later)
function AddressSearch({ address, lat, lng, onSelect }: { address: string, lat: number, lng: number, onSelect: (addr: string, lat: number, lng: number) => void }) {
    const [query, setQuery] = useState(address);
    const [results, setResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    const handleSearch = async () => {
        if (!query) return;
        setSearching(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`, {
                headers: {
                    'Referer': 'https://clean-track.vercel.app',
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

    return (
        <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#ccc' }}>주소 검색</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
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
                            onClick={() => {
                                setQuery(r.display_name);
                                onSelect(r.display_name, parseFloat(r.lat), parseFloat(r.lon));
                                setResults([]);
                            }}
                            style={{ padding: '0.5rem', borderBottom: '1px solid #333', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                            {r.display_name}
                        </li>
                    ))}
                </ul>
            )}

            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#888' }}>
                <div>위도: {lat || '-'}</div>
                <div>경도: {lng || '-'}</div>
            </div>
        </div>
    );
}
