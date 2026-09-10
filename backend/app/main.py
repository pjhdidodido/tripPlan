import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware

from .database import create_schedule, create_trip, delete_schedule, delete_trip, initialize_database, list_trip_days, list_trips, replace_trip_members, update_schedule
from .schemas import ScheduleCreate, ScheduleItem, ScheduleUpdate, Trip, TripCreate, TripDay, TripMembersUpdate


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(title="TripWeave API", version="1.0.0", lifespan=lifespan)
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


@app.delete("/api/trips/{trip_id}/days/{day_id}/schedules/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_schedule(trip_id: str, day_id: str, item_id: str) -> Response:
    if not delete_schedule(trip_id, day_id, item_id):
        raise HTTPException(status_code=404, detail="Schedule not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
