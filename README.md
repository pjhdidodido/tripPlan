# TripWeave

TypeScript와 Next.js App Router로 만드는 협업 여행 플래너입니다. `/trips/[tripId]` 경로에서 여행별 일정을 표시합니다.

## 실행

터미널 두 개에서 백엔드와 프론트엔드를 각각 실행합니다.

```bash
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.app.main:app --reload --port 8000
```

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173`을 엽니다. API 문서는 `http://127.0.0.1:8000/docs`에서 직접 실행해 볼 수 있습니다.

## 학습

코드를 읽고 확장하는 순서는 [LEARNING.md](./LEARNING.md)에 정리되어 있습니다. 시작점은 `features/trips/model/trip.ts`의 도메인 타입과 `features/trips/components/trip-planner.tsx`의 상태 업데이트입니다.

## 현재 범위

- 반응형 일정 대시보드
- 상단 여행 목록에서 여행별 화면 전환
- 여행 생성·삭제와 여행 기간별 날짜 자동 생성
- 여행별 동행인 추가·변경
- 날짜별 일정 목록과 빈 상태
- 장소·식사·이동을 구분하는 TypeScript 유니온
- 후보 일정 추가 및 입력 검증
- 일정 수정·삭제와 Python API 자동 저장
- 일정별 사진 첨부·교체와 동행자 코멘트
- 일정 예상 비용을 합산한 공동 예산 잔액 계산
- Open-Meteo를 이용한 여행 기간 날씨 예보
- SQLite 파일을 이용한 서버 측 영구 저장
- AI 에이전트가 같은 일정 추가 흐름을 사용할 수 있는 WebMCP 도구

## 폴더 구조

```text
app/                         라우팅과 공통 레이아웃
  trips/[tripId]/page.tsx    여행 상세 동적 라우트
features/trips/              여행 도메인 기능
  api/                       FastAPI 요청과 응답 검증
  components/                화면과 상호작용 컴포넌트
  model/                     도메인 타입
components/ui/               공용 UI 기본 컴포넌트
backend/                     FastAPI와 SQLite 백엔드
  app/main.py                API 라우트와 CORS 설정
  app/database.py            테이블 생성과 SQL CRUD
  app/schemas.py             Pydantic 요청·응답 모델
```

여행, 동행인, 날짜, 일정, 코멘트는 `backend/data/tripweave.db`에 여행별로 저장되고 사진은 `backend/data/uploads`에 저장됩니다. 프론트엔드나 브라우저를 다시 실행해도 유지되고, 같은 Python API에 접속한 브라우저는 같은 데이터를 봅니다. 날씨는 [Open-Meteo](https://open-meteo.com/)의 위치 검색과 16일 예보를 사용하므로 여행 시작 16일 전부터 표시됩니다. 배포할 때는 Python 서버에 영구 디스크를 연결하거나 데이터베이스와 사진 저장소를 PostgreSQL, Cloudflare D1/R2 등으로 교체해야 합니다.
