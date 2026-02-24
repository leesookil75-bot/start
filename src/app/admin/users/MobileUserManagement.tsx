'use client';

import { useState, useTransition } from 'react';
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
    workplaceId?: string;
    totalLeaves?: number;
};

export default function MobileUserManagement({ initialUsers, workplaces }: { initialUsers: User[], workplaces: Workplace[] }) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`${name}님을 정말 삭제하시겠습니까?`)) return;
        startTransition(async () => {
            const result = await deleteUserAction(id);
            if (!result.success) {
                alert(result.error || 'Failed to delete user');
            }
        });
    };

    const handleResetPassword = async (user: User) => {
        if (!confirm(`${user.name}님의 비밀번호를 뒷자리 4자리로 초기화하시겠습니까?`)) return;
        startTransition(async () => {
            const result = await resetUserPassword(user.id);
            if (result.success) {
                alert('비밀번호가 초기화되었습니다.');
            } else {
                alert(result.error || 'Failed to reset password');
            }
        });
    };

    return (
        <div style={{ padding: '1rem', background: '#121212', minHeight: '100vh', color: '#fff', paddingBottom: '5rem' }}>
            <header style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
                <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem' }}>
                    &larr;
                </button>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 2px 0' }}>사용자 관리</h1>
            </header>

            {error && <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.2)', color: '#fca5a5', borderRadius: '8px', marginBottom: '1rem' }}>{error}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {initialUsers.map(user => {
                    const wp = workplaces.find(w => w.id === user.workplaceId);
                    return (
                        <div key={user.id} style={{ background: '#1e1e1e', borderRadius: '16px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{user.name}</span>
                                        <span style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', background: user.role === 'admin' ? '#7c4dff' : '#444', fontSize: '0.7rem' }}>
                                            {user.role === 'admin' ? '관리자' : '청소부'}
                                        </span>
                                    </div>
                                    <div style={{ color: '#aaa', fontSize: '0.85rem' }}>{user.phoneNumber}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => setEditingUser(user)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem' }}>
                                        수정
                                    </button>
                                </div>
                            </div>

                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#888' }}>담당 구역</span>
                                    <span>{user.cleaningArea}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#888' }}>근무지</span>
                                    <span>{wp ? wp.name : (user.workAddress ? '개별 설정' : '-')}</span>
                                </div>
                            </div>

                            {user.role !== 'admin' && (
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                    <button
                                        onClick={() => handleResetPassword(user)}
                                        disabled={isPending}
                                        style={{ flex: 1, padding: '0.6rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold' }}
                                    >
                                        비번 초기화
                                    </button>
                                    <button
                                        onClick={() => handleDelete(user.id, user.name)}
                                        disabled={isPending}
                                        style={{ flex: 1, padding: '0.6rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold' }}
                                    >
                                        삭제
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Floating Action Button */}
            <button
                onClick={() => setIsAddModalOpen(true)}
                style={{ position: 'fixed', bottom: '2rem', right: '1.5rem', width: '3.5rem', height: '3.5rem', borderRadius: '50%', background: '#3b82f6', color: '#fff', fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)', zIndex: 50, cursor: 'pointer' }}
            >
                +
            </button>

            {/* Modals... */}
            {isAddModalOpen && (
                <UserFormModal
                    title="새 사용자 추가"
                    workplaces={workplaces}
                    onClose={() => setIsAddModalOpen(false)}
                    onSubmit={async (data) => {
                        startTransition(async () => {
                            const result = await createUser(data);
                            if (result.success) {
                                setIsAddModalOpen(false);
                            } else {
                                alert(result.error || 'Failed to add user');
                            }
                        });
                    }}
                    isPending={isPending}
                />
            )}

            {editingUser && (
                <UserFormModal
                    title="사용자 정보 수정"
                    user={editingUser}
                    workplaces={workplaces}
                    onClose={() => setEditingUser(null)}
                    onSubmit={async (data) => {
                        startTransition(async () => {
                            const result = await updateUserAction(editingUser.id, data);
                            if (result.success) {
                                setEditingUser(null);
                            } else {
                                alert(result.error || 'Failed to update user');
                            }
                        });
                    }}
                    isPending={isPending}
                />
            )}
        </div>
    );
}

// Reusable Modal Form for Add/Edit
function UserFormModal({ title, user, workplaces, onClose, onSubmit, isPending }: { title: string, user?: User, workplaces: Workplace[], onClose: () => void, onSubmit: (data: any) => void, isPending: boolean }) {
    const [selectedWp, setSelectedWp] = useState(user?.workplaceId || '');

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(2px)' }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#1e1e1e', width: '100%', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto', animation: 'slideUp 0.3s ease-out' }}>
                <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: '0 auto 1.5rem' }} />
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: '#fff' }}>{title}</h2>

                <form onSubmit={e => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const data: any = {
                        name: formData.get('name'),
                        phoneNumber: formData.get('phoneNumber'),
                        cleaningArea: formData.get('cleaningArea'),
                        role: formData.get('role'),
                        workplaceId: formData.get('workplaceId') || null,
                        totalLeaves: parseInt(formData.get('totalLeaves') as string) || 15
                    };
                    onSubmit(data);
                }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#aaa', marginBottom: '0.5rem' }}>이름</label>
                        <input name="name" defaultValue={user?.name} required style={{ width: '100%', background: '#121212', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.8rem', borderRadius: '8px' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#aaa', marginBottom: '0.5rem' }}>전화번호</label>
                        <input name="phoneNumber" defaultValue={user?.phoneNumber} required style={{ width: '100%', background: '#121212', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.8rem', borderRadius: '8px' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#aaa', marginBottom: '0.5rem' }}>담당 구역</label>
                        <input name="cleaningArea" defaultValue={user?.cleaningArea} required style={{ width: '100%', background: '#121212', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.8rem', borderRadius: '8px' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: '#aaa', marginBottom: '0.5rem' }}>역할</label>
                            <select name="role" defaultValue={user?.role || 'cleaner'} style={{ width: '100%', background: '#121212', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.8rem', borderRadius: '8px' }}>
                                <option value="cleaner">청소부</option>
                                <option value="admin">관리자</option>
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: '#aaa', marginBottom: '0.5rem' }}>연차 (15일 기본)</label>
                            <input type="number" name="totalLeaves" defaultValue={user?.totalLeaves ?? 15} min="0" required style={{ width: '100%', background: '#121212', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.8rem', borderRadius: '8px' }} />
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#aaa', marginBottom: '0.5rem' }}>근무지 지정</label>
                        <select name="workplaceId" value={selectedWp} onChange={e => setSelectedWp(e.target.value)} style={{ width: '100%', background: '#121212', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.8rem', borderRadius: '8px' }}>
                            <option value="">- 미지정 (또는 개별 주소) -</option>
                            {workplaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                        <button type="button" onClick={onClose} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '1rem', borderRadius: '12px', fontWeight: 'bold' }}>취소</button>
                        <button type="submit" disabled={isPending} style={{ flex: 2, background: '#3b82f6', color: '#fff', border: 'none', padding: '1rem', borderRadius: '12px', fontWeight: 'bold' }}>{isPending ? '저장 중...' : '저장하기'}</button>
                    </div>
                </form>
            </div>
            <style jsx>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
