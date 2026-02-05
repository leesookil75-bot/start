'use client';

import { useState, useTransition, useRef } from 'react';
import styles from './notices.module.css';
import { createNoticeAction, deleteNoticeAction, updateNoticeAction } from '../../actions';
import { compressImage } from '@/lib/image-utils';
import Link from 'next/link';

type Notice = {
    id: string;
    title: string;
    content: string;
    imageData?: string;
    isPinned?: boolean;
    createdAt: string;
};

export default function AdminNoticesClient({ notices }: { notices: Notice[] }) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isPinned, setIsPinned] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            setImagePreview(null);
            return;
        }

        try {
            // Compress image immediately on selection
            const compressed = await compressImage(file);
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
            if (editingId) {
                result = await updateNoticeAction(editingId, title, content, imagePreview || undefined, isPinned);
            } else {
                result = await createNoticeAction(title, content, imagePreview || undefined, isPinned);
            }

            if (result.success) {
                resetForm();
                alert(editingId ? 'Notice updated successfully!' : 'Notice posted successfully!');
            } else {
                setError(result.error || 'Failed to save notice');
            }
        });
    };

    const resetForm = () => {
        setTitle('');
        setContent('');
        setIsPinned(false);
        setImagePreview(null);
        setEditingId(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleEdit = (notice: Notice) => {
        setTitle(notice.title);
        setContent(notice.content);
        setIsPinned(!!notice.isPinned);
        setImagePreview(notice.imageData || null);
        setEditingId(notice.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

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
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Notice Board Management</h1>
                <Link href="/admin" className={styles.backLink}>
                    &larr; Dashboard
                </Link>
            </header>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{editingId ? 'Edit Notice' : 'Post New Notice'}</h2>
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
                            {isPending ? 'Saving...' : (editingId ? 'Update Notice' : 'Post Notice')}
                        </button>
                        {editingId && (
                            <button
                                type="button"
                                onClick={resetForm}
                                className={styles.deleteButton} // Reuse delete style for cancel or add new style
                                style={{ backgroundColor: '#666' }}
                                disabled={isPending}
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </section>

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
                                        onClick={() => handleEdit(notice)}
                                        className={styles.submitButton} // Reusing submit button style but smaller
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
        </div>
    );
}
