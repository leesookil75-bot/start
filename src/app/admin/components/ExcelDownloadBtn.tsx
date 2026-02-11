'use client';

import * as XLSX from 'xlsx';
import { StatEntry } from '@/lib/types';
import styles from '../admin.module.css';

interface ExcelDownloadBtnProps {
    data: any[];
    fileName?: string;
}

export default function ExcelDownloadBtn({ data, fileName = 'clean-track-records' }: ExcelDownloadBtnProps) {
    const handleDownload = () => {
        const ws = XLSX.utils.json_to_sheet(data);

        // Example: Add a SUM formula at the bottom of the 'Size' column (assuming it's arguably the 2nd column, 'B')
        const rangeRef = ws['!ref'];

        // If range exists and has data (more than just header)
        if (rangeRef) {
            const range = XLSX.utils.decode_range(rangeRef);

            // Checking if there are data rows (range.e.r is the last row index, header is usually 0)
            if (range.e.r > 0) {
                const rowCount = range.e.r + 1; // Total existing rows

                // Add "Total" label in Column A
                const labelCellRef = XLSX.utils.encode_cell({ r: rowCount, c: 0 });
                ws[labelCellRef] = { t: 's', v: 'Total Capacity' }; // A{rowCount+1}

                // Add SUM formula in Column B
                // Data starts at row 2 (index 1) in Excel terms if header is row 1
                // Formula: SUM(B2:B{rowCount}) - rowCount corresponds to the last data row in Excel 1-based index
                const formulaCellRef = XLSX.utils.encode_cell({ r: rowCount, c: 1 });
                ws[formulaCellRef] = { t: 'n', f: `SUM(B2:B${rowCount})` }; // B{rowCount+1}

                // Update the range to include the new row
                range.e.r = rowCount;
                ws['!ref'] = XLSX.utils.encode_range(range);
            }
        }

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
