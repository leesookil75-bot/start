'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { createNoticeAction, deleteNoticeAction, updateNoticeAction } from '../../actions';
import { compressImage } from '@/lib/image-utils';

type Notice = {
    id: string;
    title: string;
    content: string;
    imageData?: string;
    isPinned?: boolean;
    createdAt: string;
};

export default function MobileNoticeManager({ initialNotices }: { initialNotices: Notice[] }) {
    const [notices, setNotices] = useState<Notice[]>(initialNotices);
    const [view, setView] = useState<'list' | 'form'>('list');
    const [editingNotice, setEditingNotice] = useState<Notice | null>(null);

    useEffect(() => {
        setNotices(initialNotices);
    }, [initialNotices]);

    const [isPending, startTransition] = useTransition();

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`'${title}' 공지사항을 삭제하시겠습니까?`)) return;
        startTransition(async () => {
            const result = await deleteNoticeAction(id);
            if (result.success) {
                setNotices(prev => prev.filter(n => n.id !== id));
            } else {
                alert(result.error || '삭제 실패');
            }
        });
    };

    const handleEdit = (notice: Notice) => {
        setEditingNotice(notice);
        setView('form');
    };

    const handleFormSuccess = () => {
        setView('list');
        setEditingNotice(null);
    };

    return (
        <div style={{ padding: '1rem', background: '#121212', minHeight: '100vh', color: '#fff', paddingBottom: '5rem' }}>
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => {
                        if (view === 'form') {
                            setView('list');
                            setEditingNotice(null);
                        } else {
                            window.history.back();
                        }
                    }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem' }}>
                        &larr;
                    </button>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 2px 0' }}>
                        {view === 'list' ? '공지사항 관리' : (editingNotice ? '공지 수정' : '새 공지 작성')}
                    </h1>
                </div>
            </header>

            {view === 'list' ? (
                <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {notices.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#888' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
                                등록된 공지사항이 없습니다.
                            </div>
                        ) : (
                            notices.map(notice => (
                                <div key={notice.id} style={{ background: '#1e1e1e', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                                    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {notice.isPinned && <span style={{ color: '#ef4444', fontSize: '1rem' }}>📌</span>}
                                                {notice.title}
                                            </h3>
                                            <span style={{ fontSize: '0.8rem', color: '#888', whiteSpace: 'nowrap' }}>
                                                {new Date(notice.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>

                                        <div style={{ color: '#ccc', fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                                            {notice.content}
                                        </div>

                                        {notice.imageData && (
                                            <div style={{ marginTop: '0.5rem', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                <img src={notice.imageData} alt="Notice attachment" style={{ width: '100%', display: 'block' }} />
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                                            <button
                                                onClick={() => handleDelete(notice.id, notice.title)}
                                                disabled={isPending}
                                                style={{ background: 'transparent', color: '#ef4444', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 'bold' }}
                                            >
                                                삭제
                                            </button>
                                            <button
                                                onClick={() => handleEdit(notice)}
                                                style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', padding: '0.4rem 1rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 'bold' }}
                                            >
                                                수정
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <button
                        onClick={() => {
                            setEditingNotice(null);
                            setView('form');
                        }}
                        style={{ position: 'fixed', bottom: '2rem', right: '1.5rem', width: '3.5rem', height: '3.5rem', borderRadius: '50%', background: '#3b82f6', color: '#fff', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)', zIndex: 50, cursor: 'pointer' }}
                    >
                        ✏️
                    </button>
                </>
            ) : (
                <MobileNoticeForm
                    initialNotice={editingNotice}
                    onSuccess={handleFormSuccess}
                />
            )}
        </div>
    );
}

function MobileNoticeForm({ initialNotice, onSuccess }: { initialNotice: Notice | null, onSuccess: () => void }) {
    const [title, setTitle] = useState(initialNotice?.title || '');
    const [content, setContent] = useState(initialNotice?.content || '');
    const [isPinned, setIsPinned] = useState(!!initialNotice?.isPinned);
    const [imagePreview, setImagePreview] = useState<string | null>(initialNotice?.imageData || null);
    const [isPending, startTransition] = useTransition();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            setImagePreview(null);
            return;
        }
        try {
            const compressed = await compressImage(file);
            setImagePreview(compressed);
        } catch (err) {
            alert('이미지 처리 실패');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            let result;
            if (initialNotice) {
                result = await updateNoticeAction(initialNotice.id, title, content, imagePreview || undefined, isPinned);
            } else {
                result = await createNoticeAction(title, content, imagePreview || undefined, isPinned);
            }

            if (result.success) {
                onSuccess();
            } else {
                alert(result.error || '저장 실패');
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s' }}>
            <div>
                <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="제목을 입력하세요"
                    required
                    style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '1rem 0', fontSize: '1.25rem', fontWeight: 'bold' }}
                />
            </div>

            <div style={{ flex: 1, minHeight: '30vh' }}>
                <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="내용을 입력하세요..."
                    required
                    style={{ width: '100%', height: '100%', minHeight: '200px', background: 'transparent', border: 'none', color: '#ccc', padding: '0.5rem 0', fontSize: '1rem', lineHeight: '1.6', resize: 'vertical' }}
                />
            </div>

            {imagePreview && (
                <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <img src={imagePreview} alt="Preview" style={{ width: '100%', display: 'block' }} />
                    <button
                        type="button"
                        onClick={() => setImagePreview(null)}
                        style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}
                    >
                        &times;
                    </button>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '1rem 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#fff', fontSize: '1rem' }}>
                    <input type="checkbox" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} style={{ transform: 'scale(1.2)' }} />
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>상단 고정 📌</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#3b82f6', fontWeight: 'bold', cursor: 'pointer' }}>
                    <span>🖼️ 사진 첨부</span>
                    <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" style={{ display: 'none' }} />
                </label>
            </div>

            <button
                type="submit"
                disabled={isPending}
                style={{ width: '100%', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', padding: '1rem', fontSize: '1.1rem', fontWeight: 'bold', marginTop: '1rem' }}
            >
                {isPending ? '저장 중...' : (initialNotice ? '수정 완료' : '등록하기')}
            </button>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </form>
    );
}
