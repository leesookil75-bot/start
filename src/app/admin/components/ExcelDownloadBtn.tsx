'use client';

import * as XLSX from 'xlsx';
import { StatEntry } from '@/lib/statistics';
import styles from '../admin.module.css';

interface ExcelDownloadBtnProps {
    data: any[];
    fileName?: string;
}

export default function ExcelDownloadBtn({ data, fileName = 'clean-track-records' }: ExcelDownloadBtnProps) {
    const handleDownload = () => {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Records');
        XLSX.writeFile(wb, `${fileName}.xlsx`);
    };

    return (
        <button onClick={handleDownload} className={styles.downloadButton}>
            📥 Download Excel
        </button>
    );
}
