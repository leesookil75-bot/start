'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import styles from './notices.module.css';
import { createNoticeAction, deleteNoticeAction, updateNoticeAction } from '../../actions';
import { compressImage } from '@/lib/image-utils';

export type Notice = {
    id: string;
    title: string;
    content: string;
    imageData?: string;
    isPinned?: boolean;
    createdAt: string;
};

export function NoticeForm({
    editingNotice,
    onSuccess,
    onCancel
}: {
    editingNotice: Notice | null,
    onSuccess: () => void,
    onCancel: () => void
}) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isPinned, setIsPinned] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Populate form when editingNotice changes
    useEffect(() => {
        if (editingNotice) {
            setTitle(editingNotice.title);
            setContent(editingNotice.content);
            setIsPinned(!!editingNotice.isPinned);
            setImagePreview(editingNotice.imageData || null);
        } else {
            resetLocalForm();
        }
    }, [editingNotice]);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            setImagePreview(null);
            return;
        }

        try {
            console.log(`Original file size: ${(file.size / 1024).toFixed(2)} KB`);
            const compressed = await compressImage(file);
            console.log(`Compressed image length: ${compressed.length} chars (~${(compressed.length / 1024).toFixed(2)} KB)`);

            if (compressed.length > 1024 * 1024 * 2) { // 2MB limit warning
                alert('Warning: Compressed image is still large (> 2MB). It might fail to upload.');
            }

            setImagePreview(compressed);
        } catch (err) {
            console.error('Image compression failed', err);
            setError('Image processing failed. Please try another image.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        startTransition(async () => {
            let result;
            if (editingNotice) {
                result = await updateNoticeAction(editingNotice.id, title, content, imagePreview || undefined, isPinned);
            } else {
                result = await createNoticeAction(title, content, imagePreview || undefined, isPinned);
            }

            if (result.success) {
                resetLocalForm();
                alert(editingNotice ? 'Notice updated successfully!' : 'Notice posted successfully!');
                onSuccess();
            } else {
                setError(result.error || 'Failed to save notice');
            }
        });
    };

    const resetLocalForm = () => {
        setTitle('');
        setContent('');
        setIsPinned(false);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleCancel = () => {
        resetLocalForm();
        onCancel();
    }

    return (
        <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{editingNotice ? 'Edit Notice' : 'Post New Notice'}</h2>
            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className={styles.input}
                        placeholder="Enter notice title"
                        required
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Content</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className={styles.textarea}
                        placeholder="Enter detailed content..."
                        required
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Image (Optional, max 800px)</label>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        accept="image/*"
                        className={styles.fileInput}
                    />
                    {imagePreview && (
                        <div className={styles.preview}>
                            <img src={imagePreview} alt="Preview" />
                        </div>
                    )}
                </div>

                <div className={styles.inputGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                        type="checkbox"
                        id="isPinned"
                        checked={isPinned}
                        onChange={(e) => setIsPinned(e.target.checked)}
                        style={{ width: 'auto', margin: 0 }}
                    />
                    <label htmlFor="isPinned" className={styles.label} style={{ marginBottom: 0, cursor: 'pointer' }}>
                        상단 고정 (Pin to Top) 📌
                    </label>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button type="submit" className={styles.submitButton} disabled={isPending}>
                        {isPending ? 'Saving...' : (editingNotice ? 'Update Notice' : 'Post Notice')}
                    </button>
                    {editingNotice && (
                        <button
                            type="button"
                            onClick={handleCancel}
                            className={styles.deleteButton}
                            style={{ backgroundColor: '#666' }}
                            disabled={isPending}
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>
        </section>
    );
}

export function NoticeList({
    notices,
    onEdit
}: {
    notices: Notice[],
    onEdit: (notice: Notice) => void
}) {
    const [isPending, startTransition] = useTransition();

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this notice?')) return;
        startTransition(async () => {
            const result = await deleteNoticeAction(id);
            if (!result.success) {
                alert(result.error || 'Failed to delete notice');
            }
        });
    };

    return (
        <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Recent Notices</h2>
            <div className={styles.noticeList}>
                {notices.map((notice) => (
                    <div key={notice.id} className={styles.noticeItem}>
                        <div className={styles.noticeHeader}>
                            <div>
                                <h3 className={styles.noticeTitle}>
                                    {notice.isPinned && <span style={{ marginRight: '0.5rem' }}>📌</span>}
                                    {notice.title}
                                </h3>
                                <span className={styles.noticeDate}>
                                    {new Date(notice.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => onEdit(notice)}
                                    className={styles.submitButton}
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: '#4caf50' }}
                                    disabled={isPending}
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(notice.id)}
                                    className={styles.deleteButton}
                                    disabled={isPending}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                        <div className={styles.noticeContent}>{notice.content}</div>
                        {notice.imageData && (
                            <div className={styles.noticeImage}>
                                <img src={notice.imageData} alt="Notice attachment" />
                            </div>
                        )}
                    </div>
                ))}
                {notices.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>
                        No notices found.
                    </div>
                )}
            </div>
        </section>
    );
}

// Default export kept for backward compatibility if needed, but we prefer named exports
export default function AdminNoticesClient({ notices }: { notices: Notice[] }) {
    const [editingNotice, setEditingNotice] = useState<Notice | null>(null);

    return (
        <div className={styles.container}>
            <NoticeForm
                editingNotice={editingNotice}
                onSuccess={() => setEditingNotice(null)}
                onCancel={() => setEditingNotice(null)}
            />
            <NoticeList notices={notices} onEdit={setEditingNotice} />
        </div>
    );
}
