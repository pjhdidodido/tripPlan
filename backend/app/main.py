import os
from contextlib import asynccontextmanager
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import database
from .database import add_schedule_comment, create_schedule, create_trip, delete_schedule, delete_trip, get_trip, initialize_database, list_trip_days, list_trips, replace_trip_members, set_schedule_image, update_schedule, update_trip_budget
from .schemas import ScheduleComment, ScheduleCommentCreate, ScheduleCreate, ScheduleItem, ScheduleUpdate, Trip, TripBudgetUpdate, TripCreate, TripDay, TripMembersUpdate, WeatherForecast
from .weather import get_weather_forecast


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(title="TripWeave API", version="1.0.0", lifespan=lifespan)
UPLOAD_DIR = database.DB_PATH.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
allowed_origins = os.getenv(
    "TRIPWEAVE_ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/trips", response_model=list[Trip])
def get_trips() -> list[Trip]:
    return list_trips()


@app.get("/api/trips/{trip_id}/weather", response_model=WeatherForecast)
def get_trip_weather(trip_id: str) -> WeatherForecast:
    trip = get_trip(trip_id)
    if trip is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return get_weather_forecast(trip.destination, trip.startDate, trip.endDate)


@app.post("/api/trips", response_model=Trip, status_code=status.HTTP_201_CREATED)
def post_trip(data: TripCreate) -> Trip:
    try:
        return create_trip(data)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.put("/api/trips/{trip_id}/members", response_model=Trip)
def put_trip_members(trip_id: str, data: TripMembersUpdate) -> Trip:
    try:
        trip = replace_trip_members(trip_id, data.members)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    if trip is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


@app.put("/api/trips/{trip_id}/budget", response_model=Trip)
def put_trip_budget(trip_id: str, data: TripBudgetUpdate) -> Trip:
    trip = update_trip_budget(trip_id, data.budget)
    if trip is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip

@app.delete("/api/trips/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_trip(trip_id: str) -> Response:
    if not delete_trip(trip_id):
        raise HTTPException(status_code=404, detail="Trip not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/api/trips/{trip_id}/days", response_model=list[TripDay], response_model_by_alias=True)
def get_trip_days(trip_id: str) -> list[TripDay]:
    days = list_trip_days(trip_id)
    if not days:
        raise HTTPException(status_code=404, detail="Trip not found")
    return days


@app.post("/api/trips/{trip_id}/days/{day_id}/schedules", response_model=ScheduleItem, response_model_by_alias=True, status_code=status.HTTP_201_CREATED)
def post_schedule(trip_id: str, day_id: str, data: ScheduleCreate) -> ScheduleItem:
    item = create_schedule(trip_id, day_id, data)
    if item is None:
        raise HTTPException(status_code=404, detail="Trip day not found")
    return item


@app.patch("/api/trips/{trip_id}/days/{day_id}/schedules/{item_id}", response_model=ScheduleItem, response_model_by_alias=True)
def patch_schedule(trip_id: str, day_id: str, item_id: str, data: ScheduleUpdate) -> ScheduleItem:
    item = update_schedule(trip_id, day_id, item_id, data)
    if item is None:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return item


@app.put("/api/trips/{trip_id}/days/{day_id}/schedules/{item_id}/image", response_model=ScheduleItem, response_model_by_alias=True)
async def put_schedule_image(trip_id: str, day_id: str, item_id: str, request: Request) -> ScheduleItem:
    content_type = request.headers.get("content-type", "")
    extensions = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}
    extension = extensions.get(content_type)
    if extension is None:
        raise HTTPException(status_code=415, detail="JPG, PNG, WEBP, GIF 이미지만 업로드할 수 있습니다")
    content = await request.body()
    if not content or len(content) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="이미지는 8MB 이하여야 합니다")

    filename = f"{uuid4().hex}{extension}"
    path = UPLOAD_DIR / filename
    path.write_bytes(content)
    result = set_schedule_image(trip_id, day_id, item_id, filename)
    if result is None:
        path.unlink(missing_ok=True)
        raise HTTPException(status_code=404, detail="Schedule not found")
    item, previous = result
    if previous and previous != filename:
        (UPLOAD_DIR / Path(previous).name).unlink(missing_ok=True)
    return item


@app.delete("/api/trips/{trip_id}/days/{day_id}/schedules/{item_id}/image", response_model=ScheduleItem, response_model_by_alias=True)
def remove_schedule_image(trip_id: str, day_id: str, item_id: str) -> ScheduleItem:
    result = set_schedule_image(trip_id, day_id, item_id, None)
    if result is None:
        raise HTTPException(status_code=404, detail="Schedule not found")
    item, previous = result
    if previous:
        (UPLOAD_DIR / Path(previous).name).unlink(missing_ok=True)
    return item


@app.post("/api/trips/{trip_id}/days/{day_id}/schedules/{item_id}/comments", response_model=ScheduleComment, status_code=status.HTTP_201_CREATED)
def post_schedule_comment(trip_id: str, day_id: str, item_id: str, data: ScheduleCommentCreate) -> ScheduleComment:
    comment = add_schedule_comment(trip_id, day_id, item_id, data)
    if comment is None:
        raise HTTPException(status_code=404, detail="Schedule or trip member not found")
    return comment


@app.delete("/api/trips/{trip_id}/days/{day_id}/schedules/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_schedule(trip_id: str, day_id: str, item_id: str) -> Response:
    if not delete_schedule(trip_id, day_id, item_id):
        raise HTTPException(status_code=404, detail="Schedule not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
