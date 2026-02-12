'use client';
import { useState } from 'react';
import styles from '../admin.module.css';

interface EditRecordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (value: string | number) => void;
    initialValue: string | number;
    title: string;
}

export default function EditRecordModal({ isOpen, onClose, onSave, initialValue, title }: EditRecordModalProps) {
    const [value, setValue] = useState<string>(String(initialValue));

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Check if value is a number
        const numVal = Number(value);
        if (!isNaN(numVal) && value.trim() !== '') {
            onSave(numVal);
        } else {
            onSave(value); // Save as string
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h3 className={styles.modalTitle}>{title}</h3>
                <form onSubmit={handleSubmit} className={styles.modalForm}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>수정할 값 (숫자 또는 문자)</label>
                        <input
                            type="text"
                            className={styles.input}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            autoFocus
                        />
                        <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>
                            * 문자를 입력하면 합계에서 제외(0)됩니다.<br />
                            * 예: "휴가", "병가", "-"
                        </p>
                    </div>
                    <div className={styles.modalActions}>
                        <button type="button" onClick={onClose} className={styles.cancelButton}>
                            취소
                        </button>
                        <button type="submit" className={styles.submitButton}>
                            저장
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
