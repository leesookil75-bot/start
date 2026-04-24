const fs = require('fs');

let c = fs.readFileSync('src/app/v2/home/client-home-v2.tsx', 'utf8');

c = c.replace(
    "import { recordUsage, submitSafetySignature, logout } from '../../actions';", 
    "import { recordUsage, logout } from '../../actions';"
);

c = c.replace(
`    const result = await submitSafetySignature(activeSafetyTraining.id, signatureDataUrl);
    setIsPending(false);

    if (result.success) {
      setShowSignatureModal(false);
      setHasSignedSafetyTraining(true);
      alert('안전교육 서명이 완료되었습니다.');
    } else {
      alert(result.error || '서명 제출에 실패했습니다.');
    }`,
`
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    try {
                        const res = await fetch('/api/safety-signatures', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                training_id: activeSafetyTraining.id,
                                user_id: user.id,
                                signature_data: signatureDataUrl,
                                lat,
                                lng
                            })
                        });
                        const data = await res.json();
                        setIsPending(false);
                        if (res.ok) {
                            setShowSignatureModal(false);
                            setHasSignedSafetyTraining(true);
                            alert('안전교육 서명이 완료되었습니다.');
                        } else {
                            alert(data.error || '서명 제출에 실패했습니다.');
                        }
                    } catch(e) {
                        setIsPending(false);
                        alert('서명 제출 중 오류가 발생했습니다.');
                    }
                },
                () => {
                    setIsPending(false);
                    alert('위치 정보를 가져올 수 없어 서명을 제출할 수 없습니다.');
                }
            );
        } else {
            setIsPending(false);
            alert('위치 정보를 지원하지 않는 브라우저입니다.');
        }
`
);

fs.writeFileSync('src/app/v2/home/client-home-v2.tsx', c);
console.log("Fixed client-home-v2.tsx");
