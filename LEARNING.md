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
- `fetch`와 Zod를 이용한 API 통신 및 런타임 검증
- 배열의 `map`, `filter`를 이용한 수정·삭제
- FastAPI, Pydantic, SQLite로 구현한 서버 CRUD
- `Trip`, `TripDay`, `Schedule`, `Member` 사이의 데이터 관계
- 동적 라우트와 여행 선택에 따른 화면 상태 전환
- 데스크톱과 모바일 반응형 화면

## 코드를 읽는 순서

1. `features/trips/model/trip.ts`에서 `ScheduleItem`의 세 종류를 비교합니다.
2. `features/trips/data/sample-trip.ts`가 해당 타입을 어떻게 사용하는지 확인합니다.
3. `schedule-timeline.tsx`의 `scheduleDescription`에서 `item.kind`에 따라 사용할 수 있는 속성이 달라지는지 확인합니다.
4. `trip-planner.tsx`의 `appendSchedule`에서 폼 값이 `ScheduleItem`으로 변환되는 과정을 따라갑니다.
5. `setDays`에서 배열과 객체를 직접 변경하지 않고 새 값으로 만드는 방식을 확인합니다.
6. `api/trip-api.ts`에서 서버의 JSON 데이터가 TypeScript 타입만으로 안전해지지 않는 이유와 Zod 검증 과정을 확인합니다.
7. `backend/app/schemas.py`와 TypeScript 타입을 비교하고 두 언어가 API 계약을 표현하는 방식을 확인합니다.
8. `backend/app/database.py`에서 SQL의 생성·조회·수정·삭제 흐름을 따라갑니다.
9. `trip-switcher.tsx`에서 새 여행을 만든 뒤 동적 URL로 이동하는 과정을 확인합니다.
10. `manage-members-dialog.tsx`에서 배열 입력을 추가·변경·삭제하는 방식을 확인합니다.

## 다음 단계

1. API 오류와 로딩 상태를 화면 컴포넌트로 표현합니다.
2. OpenAPI 스키마로 TypeScript API 타입을 자동 생성합니다.
3. Alembic으로 데이터베이스 마이그레이션을 관리합니다.
4. 로그인과 여행별 멤버 권한을 추가합니다.
5. 공동 경비와 투표 기능을 구현합니다.
6. PostgreSQL 또는 D1으로 배포용 저장소를 구성합니다.

## 첫 번째 직접 과제

`ScheduleItem`에 `memo` 종류를 추가해 보세요. 메모에는 장소 대신 `content`가 필요합니다. 타입을 추가하면 `kindMeta`, `scheduleDescription`, 일정 추가 폼에서 어떤 오류가 생기는지 먼저 관찰한 뒤 하나씩 해결하세요.
