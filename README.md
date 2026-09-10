# TripWeave

TypeScript와 Next.js App Router로 만드는 협업 여행 플래너입니다. `/trips/[tripId]` 경로에서 여행별 일정을 표시합니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173`을 엽니다.

## 학습

코드를 읽고 확장하는 순서는 [LEARNING.md](./LEARNING.md)에 정리되어 있습니다. 시작점은 `features/trips/model/trip.ts`의 도메인 타입과 `features/trips/components/trip-planner.tsx`의 상태 업데이트입니다.

## 현재 범위

- 반응형 일정 대시보드
- 날짜별 일정 목록과 빈 상태
- 장소·식사·이동을 구분하는 TypeScript 유니온
- 후보 일정 추가 및 입력 검증
- 일정 수정·삭제와 브라우저 자동 저장
- AI 에이전트가 같은 일정 추가 흐름을 사용할 수 있는 WebMCP 도구

## 폴더 구조

```text
app/                         라우팅과 공통 레이아웃
  trips/[tripId]/page.tsx    여행 상세 동적 라우트
features/trips/              여행 도메인 기능
  components/                화면과 상호작용 컴포넌트
  data/                      샘플 여행 데이터
  model/                     도메인 타입
  storage/                   localStorage 저장과 런타임 타입 검증
components/ui/               공용 UI 기본 컴포넌트
```

일정은 브라우저 `localStorage`에 자동 저장됩니다. 프로젝트나 브라우저를 껐다 켜도 같은 브라우저 프로필에서는 유지되지만, 다른 기기와 동기화되지 않으며 사이트 데이터를 지우면 함께 삭제됩니다. 여러 사용자가 공유하는 단계에서는 Server Action과 D1 데이터베이스로 옮길 수 있습니다.
