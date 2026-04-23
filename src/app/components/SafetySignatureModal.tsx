'use client';

import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import styles from './SafetySignatureModal.module.css';

interface SafetySignatureModalProps {
    trainingId: string;
    trainingTitle: string;
    userId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function SafetySignatureModal({ trainingId, trainingTitle, userId, onClose, onSuccess }: SafetySignatureModalProps) {
    const sigCanvas = useRef<SignatureCanvas>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const clear = () => {
        sigCanvas.current?.clear();
    };

    const submit = () => {
        if (sigCanvas.current?.isEmpty()) {
            setError('이름을 서명해주세요.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        // 1. Get location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    const signatureData = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');

                    try {
                        const res = await fetch('/api/safety-signatures', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                training_id: trainingId,
                                user_id: userId,
                                signature_data: signatureData,
                                lat,
                                lng
                            })
                        });

                        const data = await res.json();
                        if (data.success) {
                            onSuccess();
                        } else {
                            setError(data.error || '서명 제출에 실패했습니다.');
                            setIsSubmitting(false);
                        }
                    } catch (err) {
                        setError('서버 오류가 발생했습니다.');
                        setIsSubmitting(false);
                    }
                },
                (err) => {
                    setError('위치 정보를 가져올 수 없습니다. GPS를 켜주세요.');
                    setIsSubmitting(false);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            setError('이 기기에서는 위치 정보를 지원하지 않습니다.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <h2 className={styles.title}>오늘의 안전교육</h2>
                <p className={styles.subtitle}>{trainingTitle}</p>
                <div className={styles.instruction}>아래 흰색 빈 공간에 <b>손가락으로 이름을 써주세요</b></div>
                
                <div className={styles.canvasContainer}>
                    <SignatureCanvas 
                        ref={sigCanvas} 
                        penColor="black"
                        canvasProps={{ className: styles.sigPad }} 
                    />
                </div>
                
                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.buttonGroup}>
                    <button className={styles.clearBtn} onClick={clear} disabled={isSubmitting}>지우기/다시쓰기</button>
                    <button className={styles.submitBtn} onClick={submit} disabled={isSubmitting}>
                        {isSubmitting ? '전송 중...' : '제출완료'}
                    </button>
                </div>
                
                <button className={styles.closeBtn} onClick={onClose} disabled={isSubmitting}>나중에 하기</button>
            </div>
        </div>
    );
}
