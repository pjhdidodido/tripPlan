from typing import Annotated, Literal

from pydantic import BaseModel, Field


class Trip(BaseModel):
    id: str
    title: str
    destination: str
    startDate: str
    endDate: str
    members: list[str]
    budget: int = Field(ge=0)


class TripCreate(BaseModel):
    title: str = Field(min_length=1, max_length=80)
    destination: str = Field(min_length=1, max_length=80)
    startDate: str
    endDate: str
    members: list[str] = Field(min_length=1, max_length=12)
    budget: int = Field(default=0, ge=0)


class TripMembersUpdate(BaseModel):
    members: list[str] = Field(min_length=1, max_length=12)


class TripBudgetUpdate(BaseModel):
    budget: int = Field(ge=0)


class ScheduleBase(BaseModel):
    id: str
    time: str
    title: str
    status: Literal["confirmed", "candidate"]


class PlaceSchedule(ScheduleBase):
    kind: Literal["place"]
    location: str
    durationMinutes: int


class MealSchedule(ScheduleBase):
    kind: Literal["meal"]
    location: str
    reservationName: str | None = None


class TransportSchedule(ScheduleBase):
    kind: Literal["transport"]
    from_: str = Field(alias="from", serialization_alias="from")
    to: str

    model_config = {"populate_by_name": True}


ScheduleItem = Annotated[
    PlaceSchedule | MealSchedule | TransportSchedule,
    Field(discriminator="kind"),
]


class TripDay(BaseModel):
    id: str
    label: str
    date: str
    items: list[ScheduleItem]


class ScheduleCreate(BaseModel):
    title: str = Field(min_length=1)
    time: str = Field(pattern=r"^[0-2][0-9]:[0-5][0-9]$")
    kind: Literal["place", "meal", "transport"]
    location: str = Field(min_length=1)


class ScheduleUpdate(BaseModel):
    title: str = Field(min_length=1)
    time: str = Field(pattern=r"^[0-2][0-9]:[0-5][0-9]$")
    status: Literal["confirmed", "candidate"]
