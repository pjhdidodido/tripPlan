from fastapi import APIRouter, HTTPException, Response, status

from ...domain.schemas import Trip, TripBudgetUpdate, TripCreate, TripMembersUpdate, WeatherForecast
from ...infrastructure.database import create_trip, delete_trip, get_trip, list_trips, replace_trip_members, update_trip_budget
from ...services.weather import get_weather_forecast


router = APIRouter(prefix="/trips", tags=["trips"])


@router.get("", response_model=list[Trip])
def get_trips() -> list[Trip]:
    return list_trips()


@router.post("", response_model=Trip, status_code=status.HTTP_201_CREATED)
def post_trip(data: TripCreate) -> Trip:
    try:
        return create_trip(data)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.put("/{trip_id}/members", response_model=Trip)
def put_trip_members(trip_id: str, data: TripMembersUpdate) -> Trip:
    try:
        trip = replace_trip_members(trip_id, data.members)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    if trip is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


@router.put("/{trip_id}/budget", response_model=Trip)
def put_trip_budget(trip_id: str, data: TripBudgetUpdate) -> Trip:
    trip = update_trip_budget(trip_id, data.budget)
    if trip is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


@router.get("/{trip_id}/weather", response_model=WeatherForecast)
def get_trip_weather(trip_id: str) -> WeatherForecast:
    trip = get_trip(trip_id)
    if trip is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return get_weather_forecast(trip.destination, trip.startDate, trip.endDate)


@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_trip(trip_id: str) -> Response:
    if not delete_trip(trip_id):
        raise HTTPException(status_code=404, detail="Trip not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
