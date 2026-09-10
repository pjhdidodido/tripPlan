# TripWeave TypeScript 학습 순서

이 프로젝트는 기능을 한 단계씩 확장하면서 TypeScript를 익히기 위한 기반입니다.

## 현재 완성된 1단계

- `features/trips/model/trip.ts`: 여행 일정의 도메인 타입
- `features/trips/data/sample-trip.ts`: 타입을 만족하는 샘플 데이터
- `features/trips/components/trip-planner.tsx`: 날짜 선택과 화면 상태 관리
- `features/trips/components/add-schedule-dialog.tsx`: 입력 폼과 검증
- `features/trips/components/schedule-timeline.tsx`: 일정 종류별 렌더링
- `app/trips/[tripId]/page.tsx`: 여행 ID를 받는 동적 라우트
- `ScheduleItem` 구분된 유니온과 `switch`를 이용한 타입 좁히기
- `satisfies`를 이용한 일정 종류별 메타데이터 검사
- 빈 문자열을 거부하는 폼 검증
- 데스크톱과 모바일 반응형 화면

## 코드를 읽는 순서

1. `features/trips/model/trip.ts`에서 `ScheduleItem`의 세 종류를 비교합니다.
2. `features/trips/data/sample-trip.ts`가 해당 타입을 어떻게 사용하는지 확인합니다.
3. `schedule-timeline.tsx`의 `scheduleDescription`에서 `item.kind`에 따라 사용할 수 있는 속성이 달라지는지 확인합니다.
4. `trip-planner.tsx`의 `appendSchedule`에서 폼 값이 `ScheduleItem`으로 변환되는 과정을 따라갑니다.
5. `setDays`에서 배열과 객체를 직접 변경하지 않고 새 값으로 만드는 방식을 확인합니다.

## 다음 단계

1. Zod로 폼과 서버 입력을 검증합니다.
2. Server Action을 만들고 일정 저장을 서버로 옮깁니다.
3. D1 데이터베이스와 Drizzle로 여행과 일정을 영구 저장합니다.
4. 로그인과 여행별 멤버 권한을 추가합니다.
5. 공동 경비와 투표 기능을 구현합니다.
6. 테스트, 접근성 검사, 배포 문서를 마무리합니다.

## 첫 번째 직접 과제

`ScheduleItem`에 `memo` 종류를 추가해 보세요. 메모에는 장소 대신 `content`가 필요합니다. 타입을 추가하면 `kindMeta`, `scheduleDescription`, 일정 추가 폼에서 어떤 오류가 생기는지 먼저 관찰한 뒤 하나씩 해결하세요.
