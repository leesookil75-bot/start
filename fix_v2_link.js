const fs = require('fs');

let c = fs.readFileSync('src/app/v2/home/client-home-v2.tsx', 'utf8');

c = c.replace(
    "import { submitUsage, logout } from '../../actions';", 
    "import { logout } from '../../actions';"
);

// We need to rewrite the main action container logic to use <Link>
// I will just use regex to replace the entire mainActionContainer div.

const replacement = `
      <div className={styles.mainActionContainer}>
        {attendanceStatus?.status === 'IDLE' && (
            <Link href="/attendance/map?mode=CHECK_IN" className={\`\${styles.checkInOutButton} \${styles.checkInMode}\`}>
                <div className={styles.buttonIcon}>👋</div>
                <div className={styles.buttonText}>출근하기</div>
                <div className={styles.buttonSubtext}>오늘 하루도 안전하게!</div>
            </Link>
        )}
        {attendanceStatus?.status === 'WORKING' && (
            <Link href="/attendance/map?mode=CHECK_OUT" className={\`\${styles.checkInOutButton} \${styles.checkOutMode}\`}>
                <div className={styles.buttonIcon}>🏠</div>
                <div className={styles.buttonText}>퇴근하기</div>
                <div className={styles.buttonSubtext}>수고하셨습니다!</div>
            </Link>
        )}
        {attendanceStatus?.status === 'DONE' && (
            <Link href="/attendance" className={\`\${styles.checkInOutButton} \${styles.disabled}\`}>
                <div className={styles.buttonIcon}>✨</div>
                <div className={styles.buttonText}>근무 종료</div>
                <div className={styles.buttonSubtext}>오늘의 일정이 끝났습니다.</div>
            </Link>
        )}
      </div>
`;

c = c.replace(/<div className=\{styles\.mainActionContainer\}>[\s\S]*?<\/div>/m, replacement);

fs.writeFileSync('src/app/v2/home/client-home-v2.tsx', c);
console.log("Fixed Link");
