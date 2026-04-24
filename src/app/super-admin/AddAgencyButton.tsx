'use client';

import { useState, useTransition } from 'react';
import { createNewAgencyAction } from '../actions';

export default function AddAgencyButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [planType, setPlanType] = useState('basic');
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        startTransition(async () => {
            const res = await createNewAgencyAction(name, phone, planType);
            if (res.success) {
                setIsOpen(false);
                setName('');
                setPhone('');
                setPlanType('basic');
            } else {
                setError(res.error || '업체 생성 중 오류가 발생했습니다.');
            }
        });
    };

    return (
        <>
            <button 
                onClick={() => setIsOpen(true)}
                style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
            >
                + 새 업체 등록
            </button>

            {isOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100
                }}>
                    <div style={{ background: '#1e1e1e', padding: '2rem', borderRadius: '12px', width: '400px', maxWidth: '90%' }}>
                        <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#fff' }}>새 업체 등록</h2>
                        
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa' }}>업체명</label>
                                <input 
                                    type="text" 
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                    required
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#121212', color: '#fff' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa' }}>연락처 (가입/로그인용 폰번호)</label>
                                <input 
                                    type="text" 
                                    value={phone} 
                                    onChange={e => setPhone(e.target.value)} 
                                    required
                                    placeholder="010-0000-0000"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#121212', color: '#fff' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa' }}>플랜 종류</label>
                                <select 
                                    value={planType} 
                                    onChange={e => setPlanType(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#121212', color: '#fff' }}
                                >
                                    <option value="basic">Basic (기본 제공)</option>
                                    <option value="pro">Pro (고급 기능 포함)</option>
                                    <option value="enterprise">Enterprise (커스텀)</option>
                                </select>
                            </div>

                            {error && <div style={{ color: '#ef4444', fontSize: '0.9rem' }}>{error}</div>}

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setIsOpen(false)}
                                    disabled={isPending}
                                    style={{ flex: 1, padding: '0.75rem', background: '#333', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                                >
                                    취소
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={isPending}
                                    style={{ flex: 1, padding: '0.75rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                                >
                                    {isPending ? '등록 중...' : '등록하기'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
