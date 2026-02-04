# Clean Track - Vercel Deployment Guide

이 문서는 **Clean Track** 앱을 Vercel에 배포하고, 데이터베이스를 연결하는 방법을 설명합니다.

## 1. 준비 사항 (GitHub)
먼저 작성된 코드를 GitHub에 올려야 합니다.
(이미 올리셨다면 생략 가능)

```bash
git add .
git commit -m "Prepare for Vercel deployment with Postgres"
git push
```

## 2. Vercel 프로젝트 생성
1. [Vercel 대시보드](https://vercel.com/dashboard)로 이동합니다.
2. **"Add New..."** -> **"Project"** 클릭.
3. 방금 올린 **GitHub 레포지토리**를 선택하여 Import 합니다.
4. **"Deploy"** 버튼을 눌러 초기 배포를 시작합니다.

## 3. 데이터베이스 생성 (Vercel Postgres)
1. Vercel 프로젝트 페이지 상단 메뉴에서 **[Storage]** 탭을 클릭합니다.
2. **"Create Database"** -> **"Postgres"** 선택.
3. 이름(예: `clean-track-db`)을 입력하고 생성합니다.
4. 생성이 완료되면 **"Connect Project"** 버튼을 눌러 현재 프로젝트와 연결합니다.
   - *참고: 연결하면 `POSTGRES_URL` 같은 환경 변수가 자동으로 추가됩니다.*

## 4. 데이터베이스 초기화 (테이블 생성)
데이터베이스가 생성되었지만 테이블이 없는 상태입니다.
별도의 복잡한 명령어 없이, **앱에서 제공하는 설정 페이지**를 통해 초기화할 수 있습니다.

1. **배포된 앱 URL 접속**
   - 예: `https://clean-track.vercel.app/setup`
   - (`/setup` 경로를 주소 뒤에 붙여서 접속하세요)

2. **"원클릭 진단 & 설정 시작" 버튼 클릭**
   - 자동으로 DB 연결을 확인하고 테이블을 생성합니다.
   - `✅ 성공!` 메시지가 뜨면 완료된 것입니다.

3. **완료 후에는 `/login` 페이지로 이동하여 사용하세요.**

## 5. 최종 배포 (재배포)
데이터베이스가 준비되었으니, 최신 상태를 반영하기 위해 다시 배포합니다.
Vercel 대시보드에서 **Deployments** -> **Redeploy** 하거나, 아래 명령어로 배포할 수 있습니다.

```bash
npx vercel deploy --prod
```

## 완료!
이제 제공된 Vercel URL(예: `https://clean-track.vercel.app`)로 접속하면, **IP 주소 걱정 없이** 어디서든 앱을 사용할 수 있습니다.
- 데이터는 안전하게 Vercel DB에 저장됩니다.
- 내 컴퓨터는 꺼도 됩니다.
