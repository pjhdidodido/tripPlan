# TripWeave

TypeScript, Next.js App Router, FastAPI로 만드는 협업 여행 플래너입니다. 여행별 일정, 준비물, 예약 정보, 사진, 댓글을 함께 관리할 수 있습니다.

## 기술 구성

- Frontend: TypeScript, React 19, Next.js 16, Vinext
- UI: Tailwind CSS, shadcn/ui
- Validation: Zod, Pydantic
- Local backend: Python, FastAPI, SQLite
- Local file storage: `backend/data/uploads`
- Hosting target: ChatGPT Sites의 관리형 런타임, D1, R2
- CI: GitHub Actions

## 폴더 구조

애플리케이션 코드와 공용 코드를 구분하고, 여행 기능은 한 폴더에 모으는 feature-first 구조를 사용합니다.

```text
tripweave/
├─ app/                            Next.js App Router와 전역 스타일
│  ├─ page.tsx                     첫 여행으로 이동하는 진입 페이지
│  └─ trips/[tripId]/page.tsx      여행 상세 동적 라우트
├─ src/
│  ├─ features/
│  │  └─ trips/
│  │     ├─ api/                   HTTP 요청과 Zod 응답 검증
│  │     ├─ components/            여행 기능 전용 UI
│  │     └─ model/                 여행 도메인 타입과 스키마
│  ├─ shared/
│  │  ├─ components/ui/            여러 기능에서 재사용하는 UI 기본 요소
│  │  ├─ hooks/                    공용 React 훅
│  │  └─ lib/                      프레임워크 비의존 유틸리티
│  └─ server/
│     ├─ auth/                     서버 전용 로그인 정보 처리
│     └─ db/                       Sites D1 전환을 위한 Drizzle 진입점
├─ backend/
│  ├─ app/
│  │  ├─ main.py                   FastAPI 생성과 라우터 조립
│  │  ├─ api/routes/               기능별 HTTP 엔드포인트
│  │  ├─ core/config.py            환경 변수와 업로드 경로
│  │  ├─ domain/schemas.py         Pydantic API 계약
│  │  ├─ infrastructure/database.py SQLite 테이블과 CRUD
│  │  └─ services/weather.py       Open-Meteo 연동
│  └─ tests/                       API와 서비스 테스트
├─ public/                         정적 이미지와 아이콘
├─ .github/workflows/ci.yml        무료 CI 검사
├─ .openai/hosting.json            ChatGPT Sites 프로젝트와 저장소 바인딩
├─ build/, scripts/, vendor/       Sites 빌드 런타임 지원 파일
└─ LEARNING.md                     TypeScript 학습 순서
```

`app`은 URL과 화면 조립만 담당합니다. 여행 기능에서만 쓰는 코드는 `src/features/trips`, 여러 기능이 공유하는 코드는 `src/shared`, 브라우저에 노출되면 안 되는 코드는 `src/server`에 둡니다. FastAPI도 `main.py`에 모든 API를 작성하지 않고 `api/routes`에서 기능별로 관리합니다.

## 로컬 실행

Python 3.12 이상과 Node.js 22 이상을 권장합니다. 터미널 두 개에서 실행합니다.

```bash
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.app.main:app --reload --port 8000
```

```bash
npm install
npm run dev
```

`http://localhost:5173`에서 앱을 열고, `http://127.0.0.1:8000/docs`에서 API를 시험할 수 있습니다. API 주소는 `.env`의 `NEXT_PUBLIC_TRIPWEAVE_API_URL`로 변경합니다.

## 데이터 저장

로컬 개발 데이터는 `backend/data/tripweave.db`, 사진은 `backend/data/uploads`에 저장됩니다. 두 경로는 Git에 포함되지 않습니다. 프론트엔드와 Python 서버를 다시 실행해도 데이터는 유지되지만, 이 로컬 저장소는 ChatGPT Sites에 배포되지 않습니다.

배포 전에는 다음과 같이 전환합니다.

| 데이터 | 로컬 | Sites 배포 |
|---|---|---|
| 여행·일정·댓글·체크리스트·예약 | SQLite | 관리형 D1 |
| 일정 사진·바우처 | 로컬 업로드 폴더 | 관리형 R2 |
| 로그인 사용자 | 없음 | Sign in with ChatGPT |
| API | FastAPI | Site의 서버 라우트 |

## 자동 과금 없는 배포

목표는 별도 Cloudflare 계정의 종량제 서비스를 만들지 않고 ChatGPT Sites가 관리하는 호스팅, D1, R2만 사용하는 것입니다. Sites의 플랜별 한도에 도달하면 저장소 추가나 공개 운영이 제한될 수 있지만 자동으로 유료 플랜으로 전환하는 흐름은 사용하지 않습니다.

1. FastAPI의 API와 SQLite 쿼리를 `app/api` 서버 라우트와 D1 쿼리로 옮깁니다.
2. 업로드 파일을 Sites 관리형 R2 바인딩에 저장하도록 변경합니다.
3. 서버 라우트에서 Sign in with ChatGPT 사용자와 여행별 권한을 검사합니다.
4. `.openai/hosting.json`의 `d1`, `r2`에는 Sites가 생성한 바인딩 이름만 기록합니다. 비밀키나 Cloudflare 계정 키는 넣지 않습니다.
5. Sites에서 저장한 버전을 검토한 후 공개 범위를 `초대된 사용자만`으로 두고 배포합니다.
6. 개인 Cloudflare R2 구독, Workers Paid, Render/Railway 유료 인스턴스는 생성하지 않습니다.

현재 코드는 1~3단계 전의 로컬 개발 구조입니다. 데이터 이전을 완료하기 전에는 화면만 배포되고 로컬 FastAPI 데이터는 공유되지 않습니다.

## CI/CD

`.github/workflows/ci.yml`이 `develop`, `main` 브랜치 push와 Pull Request마다 다음 검사를 수행합니다.

1. `npm ci`
2. ESLint
3. TypeScript 타입 검사
4. 프론트엔드 프로덕션 빌드
5. Python 의존성 설치
6. FastAPI 테스트

공개 GitHub 저장소에서 표준 GitHub-hosted runner를 사용하면 Actions는 무료입니다. 비공개 GitHub Free 저장소는 월 2,000분의 무료 실행 시간이 있고, 결제 수단이 없다면 무료 시간을 모두 사용했을 때 실행이 중단됩니다. 결제 수단이 있다면 GitHub Billing에서 Actions 예산을 `0`으로 설정하고 **Stop usage when budget limit is reached**를 켭니다. 이 워크플로는 비용이 생길 수 있는 대형 러너와 빌드 산출물 업로드를 사용하지 않습니다.

ChatGPT Sites는 현재 CLI용 배포 관리 기능을 제공하지 않습니다. 따라서 파이프라인은 다음처럼 운영합니다.

```text
feature 브랜치 → Pull Request → 무료 GitHub Actions CI
                              ↓ 통과
                         develop/main 병합
                              ↓
                 Sites에서 버전 저장·검토·수동 배포
```

CI는 자동이고 배포는 승인 후 수동입니다. 이 방식은 잘못된 코드의 자동 배포를 막고 별도 종량제 호스팅 계정을 요구하지 않습니다.

## 검증 명령

```bash
npm run lint
npm run typecheck
npm run build
python -m unittest discover -s backend/tests
```

## 현재 기능

- 여행 생성·삭제·선택과 동행인 변경
- 날짜별 일정 추가·수정·삭제
- 일정 사진과 동행자 댓글
- 공통·개인 준비물 체크리스트
- 숙소·교통·입장권 예약 보관함
- 일정 예상 비용과 공동 예산 잔액
- Open-Meteo 여행 기간 날씨 예보

TypeScript를 읽고 확장하는 순서는 [LEARNING.md](./LEARNING.md)를 참고합니다.
