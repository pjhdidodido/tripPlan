# TripWeave Python API

```bash
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.app.main:app --reload --port 8000
```

API 문서는 서버 실행 후 `http://127.0.0.1:8000/docs`에서 확인할 수 있습니다. SQLite 파일은 첫 실행 시 `backend/data/tripweave.db`에 생성되고 일정 사진은 `backend/data/uploads`에 저장됩니다. 날씨 API는 Open-Meteo를 사용하며 별도의 API 키가 필요하지 않습니다.

배포 환경에서는 `TRIPWEAVE_DB_PATH`에 영구 디스크 경로를 지정하고, `TRIPWEAVE_ALLOWED_ORIGINS`에 프론트엔드 주소를 지정합니다.
