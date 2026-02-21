# sh_budget 앱 개발 진행상황

## 기술 스택
- Framework: React Native + Expo SDK 54
- Language: TypeScript
- Router: Expo Router (파일 기반)
- UI: NativeWind v4 (Tailwind CSS)
- 상태관리: Zustand
- API: TanStack Query + Axios
- 폼: React Hook Form + Zod
- 보안 저장소: expo-secure-store

---

## ✅ 완료된 단계

### Step 1: Expo 프로젝트 생성
- `/Users/shimsungbo/Downloads/sh_budget_app` 에 생성
- TypeScript 템플릿 사용

### Step 2: 기술 스택 설치
- 모든 라이브러리 설치 완료 (--legacy-peer-deps 필요)
- tailwindcss는 NativeWind v4 호환을 위해 v3로 다운그레이드

### Step 3: 프로젝트 구조 세팅
- `babel.config.js` - NativeWind babel 플러그인
- `metro.config.js` - NativeWind metro 설정
- `tailwind.config.js` - Tailwind 설정 (income/expense/transfer 커스텀 컬러 포함)
- `global.css` - Tailwind 기본 지시문
- `nativewind-env.d.ts` - NativeWind 타입
- `tsconfig.json` - 경로 alias (@/* → src/*)
- `app.json` - scheme: "shbudget" 추가
- `index.ts` - expo-router 엔트리로 변경
- `App.tsx` - 삭제 (expo-router로 대체)

#### 생성된 화면 구조
```
app/
├── _layout.tsx         ← Root Layout (QueryClient Provider)
├── index.tsx           ← 진입점 (인증 상태 따라 분기 예정)
├── (auth)/
│   ├── _layout.tsx
│   ├── login.tsx       ← 로그인 (골격만)
│   └── register.tsx    ← 회원가입 (골격만)
└── (tabs)/
    ├── _layout.tsx     ← 하단 탭바
    ├── index.tsx       ← 홈/거래내역
    ├── assets.tsx      ← 자산
    └── settings.tsx    ← 설정
```

---

## 🔜 다음 단계

### Step 4: API 클라이언트 + 타입 정의
- `src/types/index.ts` - 백엔드 API 응답 타입 (Member, Book, Asset, Transaction)
- `src/api/client.ts` - Axios 인스턴스 (X-Member-Id 헤더 자동 주입, 기저 URL 설정)
- `src/api/member.ts` - 회원 API 함수
- `src/api/book.ts` - 가계부 API 함수
- `src/api/asset.ts` - 자산 API 함수
- `src/api/transaction.ts` - 거래 API 함수

### Step 5: 인증 스토어 + 로그인/회원가입 화면
- `src/stores/authStore.ts` - Zustand (memberId, 로그인 상태)
- `app/(auth)/login.tsx` - 이메일 로그인 UI + 로직
- `app/(auth)/register.tsx` - 회원가입 UI + 로직
- `app/index.tsx` - 인증 상태에 따라 라우팅 분기

### Step 6: 홈 화면 (거래내역)
- 월별 수입/지출 요약
- 거래내역 리스트
- 거래 추가 버튼

### Step 7: 자산 화면
- 자산 목록
- 총 자산 요약
- 자산 추가/편집

### Step 8: 거래 추가 화면
- INCOME / EXPENSE / TRANSFER 타입 선택
- 폼 입력 (금액, 날짜, 메모, 자산 선택)

### Step 9: EAS Build + TestFlight 배포
- `eas.json` 설정
- EAS Build로 iOS 빌드
- TestFlight 업로드

---

## 백엔드 정보 (sh_budget)
- 경로: `/Users/shimsungbo/Downloads/sh_budget`
- 스택: Java 21 + Spring Boot 4.0.2 + MySQL 8.0
- 로컬 실행: `./gradlew bootRun --args='--spring.profiles.active=dev'`
- Swagger: `http://localhost:8080/swagger-ui.html`
- 인증 방식: 현재 `X-Member-Id` 헤더 (JWT/Kakao OAuth는 Phase 6 예정)
- DB: Docker로 실행 (`docker-compose up -d`)

### 주요 API
| 도메인 | 엔드포인트 |
|--------|-----------|
| 회원 | POST/GET/PUT `/api/members` |
| 가계부 | `/api/books/**` |
| 자산 | `/api/assets/**` |
| 거래 | `/api/transactions` |
