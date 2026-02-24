'use client';

import { useState, useTransition, useEffect } from 'react';
import styles from './workplace-management.module.css';
import { addWorkplaceAction, updateWorkplaceAction, deleteWorkplaceAction, searchAddressAction } from '../../actions';
import { Workplace } from '@/lib/data';

export default function WorkplaceManagement({ workplaces }: { workplaces: Workplace[] }) {
    const [newWorkplace, setNewWorkplace] = useState<{ name: string, dong: string, subAreas: string[], address: string, lat: number, lng: number, radius: number }>({ name: '', dong: '', subAreas: [], address: '', lat: 0, lng: 0, radius: 100 });
    const [subAreaInput, setSubAreaInput] = useState('');
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
                setNewWorkplace({ name: '', dong: '', subAreas: [], address: '', lat: 0, lng: 0, radius: 100 });
                setSubAreaInput('');
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
                    <div className={styles.inputGroup} style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <label className={styles.label}>동 (선택)</label>
                            <input
                                className={styles.input}
                                value={newWorkplace.dong}
                                onChange={e => setNewWorkplace({ ...newWorkplace, dong: e.target.value })}
                                placeholder="예: 구미동"
                            />
                        </div>
                        <div style={{ flex: 2 }}>
                            <label className={styles.label}>근무지 명칭</label>
                            <input
                                className={styles.input}
                                value={newWorkplace.name}
                                onChange={e => setNewWorkplace({ ...newWorkplace, name: e.target.value })}
                                placeholder="예: 본사, 1공장, 1구역"
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>구역명 추가 (선택)</label>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <input
                                className={styles.input}
                                value={subAreaInput}
                                onChange={e => setSubAreaInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (subAreaInput.trim()) {
                                            setNewWorkplace(prev => ({ ...prev, subAreas: [...prev.subAreas, subAreaInput.trim()] }));
                                            setSubAreaInput('');
                                        }
                                    }
                                }}
                                placeholder="예: 1구역, 2구역 (엔터로 추가)"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    if (subAreaInput.trim()) {
                                        setNewWorkplace(prev => ({ ...prev, subAreas: [...prev.subAreas, subAreaInput.trim()] }));
                                        setSubAreaInput('');
                                    }
                                }}
                                style={{ padding: '0 1rem', background: '#4b5563', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                추가
                            </button>
                        </div>
                        {newWorkplace.subAreas.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {newWorkplace.subAreas.map((sa, idx) => (
                                    <div key={idx} style={{ padding: '0.25rem 0.5rem', background: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        {sa}
                                        <button
                                            type="button"
                                            onClick={() => setNewWorkplace(prev => ({ ...prev, subAreas: prev.subAreas.filter((_, i) => i !== idx) }))}
                                            style={{ background: 'none', border: 'none', color: '#1e3a8a', cursor: 'pointer', padding: 0, fontSize: '1rem', lineHeight: 1 }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Address Search spans 2 columns or full width depending on layout, but let's keep it simple */}
                    <div style={{ gridColumn: '1 / -1' }}>
                        <AddressSearch
                            address={newWorkplace.address}
                            lat={newWorkplace.lat}
                            lng={newWorkplace.lng}
                            onSelect={(addr, lat, lng) => setNewWorkplace({ ...newWorkplace, address: addr, lat, lng })}
                            radius={newWorkplace.radius}
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
                                    <td>
                                        <div style={{ fontWeight: 'bold' }}>{wp.dong ? `[${wp.dong}] ` : ''}{wp.name}</div>
                                        {wp.subAreas && wp.subAreas.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                                                {wp.subAreas.map((sa, idx) => (
                                                    <span key={idx} style={{ padding: '0.1rem 0.3rem', background: '#f3f4f6', color: '#374151', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid #e5e7eb' }}>
                                                        {sa}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </td>
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
    const [updates, setUpdates] = useState<Workplace>({ ...workplace, subAreas: workplace.subAreas || [] });
    const [subAreaInput, setSubAreaInput] = useState('');

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(2px)' // Lighter overlay
        }}>
            <div style={{
                background: '#fff', padding: '2rem', borderRadius: '12px',
                width: '90%', maxWidth: '500px', border: '1px solid #e5e7eb',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                maxHeight: '90vh', overflowY: 'auto'
            }}>
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#111', fontSize: '1.25rem', fontWeight: 'bold' }}>근무지 수정</h3>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    onSave(workplace.id, updates);
                }}>
                    <div className={styles.inputGroup} style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <label className={styles.label}>동 (선택)</label>
                            <input
                                className={styles.input}
                                value={updates.dong || ''}
                                onChange={e => setUpdates({ ...updates, dong: e.target.value })}
                            />
                        </div>
                        <div style={{ flex: 2 }}>
                            <label className={styles.label}>근무지 명칭</label>
                            <input
                                className={styles.input}
                                value={updates.name}
                                onChange={e => setUpdates({ ...updates, name: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.inputGroup} style={{ marginBottom: '1rem' }}>
                        <label className={styles.label}>구역명 추가 (선택)</label>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <input
                                className={styles.input}
                                value={subAreaInput}
                                onChange={e => setSubAreaInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (subAreaInput.trim()) {
                                            setUpdates(prev => ({ ...prev, subAreas: [...(prev.subAreas || []), subAreaInput.trim()] }));
                                            setSubAreaInput('');
                                        }
                                    }
                                }}
                                placeholder="예: 1구역, 2구역 (엔터로 추가)"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    if (subAreaInput.trim()) {
                                        setUpdates(prev => ({ ...prev, subAreas: [...(prev.subAreas || []), subAreaInput.trim()] }));
                                        setSubAreaInput('');
                                    }
                                }}
                                style={{ padding: '0 1rem', background: '#4b5563', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                추가
                            </button>
                        </div>
                        {updates.subAreas && updates.subAreas.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {updates.subAreas.map((sa, idx) => (
                                    <div key={idx} style={{ padding: '0.25rem 0.5rem', background: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        {sa}
                                        <button
                                            type="button"
                                            onClick={() => setUpdates(prev => ({ ...prev, subAreas: (prev.subAreas || []).filter((_, i) => i !== idx) }))}
                                            style={{ background: 'none', border: 'none', color: '#1e3a8a', cursor: 'pointer', padding: 0, fontSize: '1rem', lineHeight: 1 }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
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

// Dynamic Import for Map
import dynamic from 'next/dynamic';
const Map = dynamic(() => import('@/components/Map'), { ssr: false });

function AddressSearch({ address, lat, lng, onSelect, radius = 100 }: { address: string, lat: number, lng: number, onSelect: (addr: string, lat: number, lng: number) => void, radius?: number }) {
    const [query, setQuery] = useState('');
    const [detailAddress, setDetailAddress] = useState('');
    // Split incoming address on mount if possible, but for simplicity we'll just use the provided address as the base
    // In a real app we might store base and detail separately, but here we just concatenate them.
    const [results, setResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    // Initialize state from existing address (simple split by last space or comma if needed, or just keep as one)
    useEffect(() => {
        if (address && !query && !detailAddress) {
            setQuery(address);
        }
    }, [address]);

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
                alert('주소 검색 실패: ' + (result.error || 'Unknown error'));
            }
        } catch (e: any) {
            alert('주소 검색 에러 (Client): ' + e.message);
        } finally {
            setSearching(false);
        }
    };

    const handleSelectResult = (r: any) => {
        setQuery(r.display_name);
        // Reset detail address when a new main address is selected
        setDetailAddress('');
        onSelect(r.display_name, parseFloat(r.lat), parseFloat(r.lon));
        setResults([]);
        setSearching(false);
    };

    const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDetail = e.target.value;
        setDetailAddress(newDetail);
        // Combine base query and new detail to emit as full address
        const fullAddress = `${query} ${newDetail}`.trim();
        onSelect(fullAddress, lat, lng); // keep existing coordinates, just update address string
    };

    return (
        <div className={styles.inputGroup} style={{ marginBottom: '0.5rem' }}>
            <label className={styles.label}>주소 검색 & 상세 위치 설정</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
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
                    placeholder="지번, 도로명, 건물명 검색 (예: 판교역로 166)"
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
                <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
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
                                onClick={() => handleSelectResult(r)}
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

            {/* Detailed Address Input (Shown only after a base address is selected and coordinates exist) */}
            {lat !== 0 && lng !== 0 && (
                <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                        type="text"
                        value={detailAddress}
                        onChange={handleDetailChange}
                        placeholder="상세 주소 (예: A동 3층 301호)"
                        className={styles.input}
                        style={{ width: '100%' }}
                    />
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        정확한 출근 기록을 위해 세부 공간 정보를 기입해 주세요. (위 기본 주소 뒤에 합쳐집니다: {query} {detailAddress})
                    </p>
                </div>
            )}

            {/* Map Visualization */}
            {lat !== 0 && lng !== 0 && (
                <div style={{ marginTop: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ padding: '0.5rem', background: '#e0f2fe', color: '#0369a1', fontSize: '0.85rem', fontWeight: 600, borderBottom: '1px solid #bae6fd', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>📍</span> 지도를 클릭하여 출근 핀(빨간 원)의 위치를 건물 입구 등으로 <strong>미세 조정</strong>할 수 있습니다.
                    </div>
                    <Map
                        center={[lat, lng]}
                        zoom={17}
                        markers={[{ lat, lng, popup: '근무지 기준점', color: 'red' }]}
                        circle={{ lat, lng, radius: radius, color: 'red' }}
                        onMapClick={(clickedLat, clickedLng) => {
                            // User can fine-tune location by clicking map
                            // We don't change the address string here, just the coordinates
                            const fullAddress = `${query} ${detailAddress}`.trim();
                            onSelect(fullAddress, clickedLat, clickedLng);
                        }}
                        height="300px"
                    />
                    <div style={{ padding: '0.5rem', background: '#f9fafb', fontSize: '0.8rem', color: '#6b7280', borderTop: '1px solid #e5e7eb' }}>
                        선택된 좌표: {lat.toFixed(5)}, {lng.toFixed(5)} / 반경: {radius}m
                    </div>
                </div>
            )}
        </div>
    );
}

