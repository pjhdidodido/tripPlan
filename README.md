# TripWeave

TypeScript와 Next.js로 만드는 협업 여행 플래너입니다. 첫 단계에서는 교토 여행 일정 화면과 날짜 전환, 후보 일정 추가 흐름을 구현했습니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173`을 엽니다.

## 학습

코드를 읽고 확장하는 순서는 [LEARNING.md](./LEARNING.md)에 정리되어 있습니다. 시작점은 `lib/trip-types.ts`의 도메인 타입과 `app/trip-planner.tsx`의 상태 업데이트입니다.

## 현재 범위

- 반응형 일정 대시보드
- 날짜별 일정 목록과 빈 상태
- 장소·식사·이동을 구분하는 TypeScript 유니온
- 후보 일정 추가 및 입력 검증
- AI 에이전트가 같은 일정 추가 흐름을 사용할 수 있는 WebMCP 도구

현재 일정은 브라우저 메모리에만 저장됩니다. 다음 단계에서 Zod, Server Action, D1 데이터베이스를 차례로 연결합니다.
