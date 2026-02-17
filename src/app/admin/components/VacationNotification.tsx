'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../admin.module.css'; // Reuse or create new

export default function VacationNotification({ count }: { count: number }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (count > 0) {
            // Delay slightly for effect
            const timer = setTimeout(() => setVisible(true), 1000);
            return () => clearTimeout(timer);
        }
    }, [count]);

    if (!visible) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '1rem',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            minWidth: '250px',
            animation: 'slideIn 0.3s ease-out'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold' }}>📢 알림</span>
                <button
                    onClick={() => setVisible(false)}
                    style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }}
                >
                    &times;
                </button>
            </div>
            <div>
                휴가 신청 <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{count}</span>건이 도착하였습니다.
            </div>
            <Link
                href="/admin/vacations"
                style={{
                    marginTop: '0.5rem',
                    textAlign: 'center',
                    background: 'white',
                    color: '#3b82f6',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontWeight: 'bold'
                }}
            >
                확인하기
            </Link>
            <style jsx global>{`
                @keyframes slideIn {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
