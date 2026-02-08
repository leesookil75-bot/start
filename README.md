# Clean Track Service (CTS)

청소 관리 및 작업 추적을 위한 PWA 기반 웹 애플리케이션입니다.

## 🚀 프로젝트 개요
관리자와 작업자(청소 담당자)를 위한 모바일 최적화 웹 앱으로, 작업 완료 여부를 기록하고 관리할 수 있습니다.
Next.js 14+ (App Router), Tailwind CSS로 구축되었으며, PWA 기능을 지원하여 홈 화면에 설치해 앱처럼 사용할 수 있습니다.

## ✨ 주요 기능
### 1. 사용자 역할 구분
- **작업자 (Worker)**:
  - 전화번호 뒷자리로 간편 로그인
  - "오늘의 청소" 탭에서 작업 완료 체크
  - 스와이프 제스처로 "나의 기록" 탭 이동
  - 월별 청소 통계 확인
- **관리자 (Admin)**:
  - 전용 대시보드 접근 (`/admin`)
  - 전체 작업자 목록 및 상태 관리
  - 공지사항 작성 및 관리

### 2. PWA (Progressive Web App) 지원
- **설치 가능**: 모바일 브라우저에서 홈 화면에 추가 가능 (`manifest.json` 설정 완료)
- **앱 같은 경험**: 상단 주소창이 없는 Standalone 모드 실행
- **설치 유도**: 미설치 시 홈 화면에 "앱 설치하기" 버튼 제공 (iOS/Android 대응)

### 3. UI/UX
- **모바일 최적화**: 터치 친화적인 인터페이스
- **스와이프 네비게이션**: 탭 간 부드러운 전환 애니메이션
- **직관적인 디자인**: 작업 완료 상태 시각적 피드백 (체크 표시 등)

## 🛠 기술 스택
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: 
  - 로컬 개발환경: JSON 파일 기반 (`data.json`, `users.json`)
  - 배포 환경: Vercel Postgres (예정/준비 중)
- **Deployment**: Vercel

## 📂 프로젝트 구조
- `/src/app`: 페이지 및 라우팅 로직
- `/src/components`: 재사용 가능한 UI 컴포넌트 (`SwipeableViews`, `InstallPrompt` 등)
- `/src/lib`: 유틸리티 함수 및 데이터 처리 로직 (`storage.ts` 등)
- `/public`: 정적 리소스 (아이콘, 매니페스트 등)

## ✅ 최근 작업 내역 (저장 완료)
- **2026-02-08**:
  - PWA 설치 버튼 텍스트 수정 ("홈화면 바로가기 설치") 및 로직 개선
  - 스와이프 제스처 감도 조정
  - 관리자 로그인/로그아웃 UI 개선
  - 빌드 테스트 통과 (Production Build Success)

## 🏁 실행 방법
```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

## 🔒 데이터 보안
- 현재 로컬 JSON 파일로 데이터를 관리 중입니다.
- 운영 환경 배포 시 데이터베이스 마이그레이션이 필요합니다.
