'use client';

import * as XLSX from 'xlsx';
import styles from '../admin.module.css';
import { DailyUserStat } from '@/lib/types';

interface AreaReportDownloadBtnProps {
    data: DailyUserStat[];
    year: number;
    month: number;
    fileName?: string;
}

export default function AreaReportDownloadBtn({ data, year, month, fileName = 'monthly_area_report' }: AreaReportDownloadBtnProps) {
    const handleDownload = () => {
        // We need to build the worksheet manually to support merged headers and layout
        // Rows:
        // 0: Headers (Area)
        // 1: Headers (Name)
        // 2: Headers (45L/75L)
        // 3...N: Daily Data
        // N+1: Totals

        const daysInMonth = new Date(year, month, 0).getDate();
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        const ws_data: any[][] = [];

        // --- Header Construction ---

        // Row 0: Areas
        // Cols 0, 1 reserved for Date, Day
        const row0 = ['Date', 'Day'];
        const merges: XLSX.Range[] = [
            { s: { r: 0, c: 0 }, e: { r: 2, c: 0 } }, // Date Merge
            { s: { r: 0, c: 1 }, e: { r: 2, c: 1 } }  // Day Merge
        ];

        let colIndex = 2;
        let currentArea = '';
        let startColForArea = 2;

        data.forEach((user, idx) => {
            // Area Header
            if (user.area !== currentArea) {
                // Merge previous area if it existed
                if (idx > 0) {
                    merges.push({ s: { r: 0, c: startColForArea }, e: { r: 0, c: colIndex - 1 } });
                }
                currentArea = user.area;
                startColForArea = colIndex;
                row0.push(currentArea); // Add Area Name
                // Fill remaining cells for this user (and subsequent users in area) with empty string to allow merge
                // But simplified: push name, then push blanks?
                // Actually xlsx just needs the first cell of merge to have value.
            } else {
                row0.push('');
            }
            row0.push(''); // For the 75L column of this user
            colIndex += 2;
        });
        // Merge last area
        if (data.length > 0) {
            merges.push({ s: { r: 0, c: startColForArea }, e: { r: 0, c: colIndex - 1 } });
        }

        // Row 1: Names
        const row1 = ['', '']; // Date, Day placeholders
        colIndex = 2;
        data.forEach(user => {
            row1.push(user.userName);
            row1.push(''); // Placeholder for merge
            merges.push({ s: { r: 1, c: colIndex }, e: { r: 1, c: colIndex + 1 } }); // Merge Name over 2 cols
            colIndex += 2;
        });

        // Row 2: 45L / 75L
        const row2 = ['', ''];
        data.forEach(_ => {
            row2.push('45L');
            row2.push('75L');
        });

        ws_data.push(row0);
        ws_data.push(row1);
        ws_data.push(row2);

        // --- Data Rows ---
        days.forEach(day => {
            const date = new Date(year, month - 1, day);
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const dayName = dayNames[date.getDay()];

            const row = [day, dayName];
            data.forEach(user => {
                const dayStat = user.daily[day - 1]; // day is 1-based, index 0-based
                // Use display value or count.
                const val45 = dayStat.display45 !== undefined ? dayStat.display45 : (dayStat.count45 || '');
                const val75 = dayStat.display75 !== undefined ? dayStat.display75 : (dayStat.count75 || '');
                row.push(val45);
                row.push(val75);
            });
            ws_data.push(row);
        });

        // --- Totals ---
        const totalRow: (string | number)[] = ['Total', ''];
        data.forEach(user => {
            totalRow.push(user.total45);
            totalRow.push(user.total75);
        });
        ws_data.push(totalRow);


        // Create Sheet
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        ws['!merges'] = merges;

        // Auto width (approximation)
        const wscols = [{ wch: 6 }, { wch: 6 }]; // Date, Day
        data.forEach(() => {
            wscols.push({ wch: 5 }); // 45L
            wscols.push({ wch: 5 }); // 75L
        });
        ws['!cols'] = wscols;

        // Styling isn't supported in basic community xlsx, requires Pro. 
        // But headers/structure should be fine.

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Montly Area Report');
        XLSX.writeFile(wb, `${fileName}_${year}_${month}.xlsx`);
    };

    return (
        <button onClick={handleDownload} className={styles.downloadButton}>
            📥 Download Area Excel
        </button>
    );
}
