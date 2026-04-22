'use client';

import { Agency } from '@/lib/types';
import { useState } from 'react';

export default function AgencyList({ agencies }: { agencies: Agency[] }) {
    return (
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {agencies.map(agency => (
                <div key={agency.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', background: 'white', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{agency.name}</h3>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>ID: {agency.id.split('-')[0]}...</p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>연락처:</span>
                            <span>{agency.contactPhone || '미등록'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>플랜:</span>
                            <span style={{ textTransform: 'capitalize', color: '#10b981', fontWeight: 'bold' }}>{agency.planType}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>상태:</span>
                            <span style={{ color: agency.isActive ? '#3b82f6' : '#ef4444' }}>
                                {agency.isActive ? '✅ 활성' : '❌ 비활성'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>가입일:</span>
                            <span>{new Date(agency.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>

                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                        <button style={{ flex: 1, padding: '0.5rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>
                            정보 수정
                        </button>
                        <button style={{ flex: 1, padding: '0.5rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>
                            관리자로 접속
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
