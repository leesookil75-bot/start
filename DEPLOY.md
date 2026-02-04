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
데이터베이스는 비어 있으므로, 우리가 만든 `seed.ts` 스크립트로 테이블을 만들어야 합니다.
**내 컴퓨터(로컬)에서 아래 명령어를 순서대로 실행하세요.**

1. **Vercel 연결 및 환경 변수 가져오기**
   ```bash
   npx vercel link
   # 질문이 나오면 엔터(Enter)를 눌러 기본값 선택 (내 계정, 해당 프로젝트 선택)
   
   npx vercel env pull .env.local
   # .env.local 파일이 생성되며 DB 접속 정보가 저장됩니다.
   ```

2. **데이터베이스 초기화 스크립트 실행**
   ```bash
   node scripts/seed.ts
   ```
   - *성공 메시지: "Database seeded successfully"가 나오면 완료!*

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
