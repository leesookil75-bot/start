'use client';

import { useState, useTransition } from 'react';
import styles from './user-management.module.css';
import { createUser, deleteUserAction, resetUserPassword, updateUserAction } from '../../actions';

type User = {
    id: string;
    phoneNumber: string;
    name: string;
    cleaningArea: string;
    role: 'admin' | 'cleaner';
    createdAt: string;
};

export default function UserManagement({ initialUsers }: { initialUsers: User[] }) {
    // Note: For a real app, we might want to use optimistic updates or re-fetch, 
    // but since we revalidatePath in actions, the parent server component refreshes data on navigation/refresh.
    // Actually, for instant feedback, we rely on the router refresh or just passing new props.
    // However, since this is a client component receiving props from a server component, 
    // updating the data requires a refresh of the server component.
    // Server Actions + router.refresh() or specialized hooks are common.
    // Here, we'll keep it simple and trust the revalidatePath to update the page if we trigger a refresh or let Next.js handle it.

    const [newUser, setNewUser] = useState({ name: '', phoneNumber: '', cleaningArea: '', role: 'cleaner' as const });
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        startTransition(async () => {
            const result = await createUser(newUser);
            if (result.success) {
                setNewUser({ name: '', phoneNumber: '', cleaningArea: '', role: 'cleaner' });
                // Optional: Trigger a router refresh if needed, but revalidatePath usually handles it on next render
            } else {
                setError(result.error || 'Failed to add user');
            }
        });
    };

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
                <h2 className={styles.sectionTitle}>Add New User</h2>
                <form onSubmit={handleAdd} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Name</label>
                        <input
                            className={styles.input}
                            value={newUser.name}
                            onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                            required
                            placeholder="홍길동"
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Phone Number</label>
                        <input
                            className={styles.input}
                            value={newUser.phoneNumber}
                            onChange={e => setNewUser({ ...newUser, phoneNumber: e.target.value })}
                            required
                            placeholder="010-1234-5678"
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Area</label>
                        <input
                            className={styles.input}
                            value={newUser.cleaningArea}
                            onChange={e => setNewUser({ ...newUser, cleaningArea: e.target.value })}
                            required
                            placeholder="A동 1층"
                        />
                    </div>
                    <button type="submit" className={styles.addButton} disabled={isPending}>
                        {isPending ? 'Adding...' : 'Add User'}
                    </button>
                </form>
                {error && <p className={styles.error}>{error}</p>}
            </div>

            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Registered Users</h2>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Area</th>
                            <th>Role</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {initialUsers.map(user => (
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
                                        {user.role}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            className={styles.resetButton}
                                            onClick={() => setEditingUser(user)}
                                            style={{ background: '#2196F3', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}
                                        >
                                            Edit
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
                                                    Reset
                                                </button>
                                                <button
                                                    className={styles.deleteButton}
                                                    onClick={() => handleDelete(user.id)}
                                                    disabled={isPending}
                                                >
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {initialUsers.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', opacity: 0.5 }}>No users found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {editingUser && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: '#1a1a1a', padding: '2rem', borderRadius: '8px',
                        width: '90%', maxWidth: '400px', border: '1px solid #333'
                    }}>
                        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'white' }}>Edit User</h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            setError('');
                            // Role is manually handled if needed, or excluded if readonly
                            const formData = new FormData(e.currentTarget);
                            const updates = {
                                name: formData.get('name') as string,
                                phoneNumber: formData.get('phoneNumber') as string,
                                cleaningArea: formData.get('cleaningArea') as string,
                                role: formData.get('role') as 'admin' | 'cleaner'
                            };

                            startTransition(async () => {
                                const result = await updateUserAction(editingUser.id, updates);
                                if (result.success) {
                                    setEditingUser(null);
                                } else {
                                    setError(result.error || 'Failed to update user');
                                }
                            });
                        }}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Name</label>
                                <input
                                    name="name"
                                    defaultValue={editingUser.name}
                                    className={styles.input}
                                    required
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Phone Number</label>
                                <input
                                    name="phoneNumber"
                                    defaultValue={editingUser.phoneNumber}
                                    className={styles.input}
                                    required
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Area</label>
                                <input
                                    name="cleaningArea"
                                    defaultValue={editingUser.cleaningArea}
                                    className={styles.input}
                                    required
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Role</label>
                                <select
                                    name="role"
                                    defaultValue={editingUser.role}
                                    className={styles.input}
                                    style={{ background: '#333', color: 'white', border: '1px solid #444' }}
                                >
                                    <option value="cleaner">Cleaner</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    style={{ flex: 1, padding: '0.8rem', background: '#444', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{ flex: 1, padding: '0.8rem', background: 'var(--accent-color)', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}
                                    disabled={isPending}
                                >
                                    {isPending ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
