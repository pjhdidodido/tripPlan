from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request, Response, status

from ...core.config import UPLOAD_DIR, upload_path
from ...domain.schemas import ScheduleComment, ScheduleCommentCreate, ScheduleCreate, ScheduleItem, ScheduleUpdate, TripDay
from ...infrastructure.database import add_schedule_comment, create_schedule, delete_schedule, list_trip_days, set_schedule_image, update_schedule


router = APIRouter(prefix="/trips/{trip_id}/days", tags=["schedules"])
IMAGE_EXTENSIONS = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}
MAX_IMAGE_BYTES = 8 * 1024 * 1024


@router.get("", response_model=list[TripDay], response_model_by_alias=True)
def get_trip_days(trip_id: str) -> list[TripDay]:
    days = list_trip_days(trip_id)
    if not days:
        raise HTTPException(status_code=404, detail="Trip not found")
    return days


@router.post("/{day_id}/schedules", response_model=ScheduleItem, response_model_by_alias=True, status_code=status.HTTP_201_CREATED)
def post_schedule(trip_id: str, day_id: str, data: ScheduleCreate) -> ScheduleItem:
    item = create_schedule(trip_id, day_id, data)
    if item is None:
        raise HTTPException(status_code=404, detail="Trip day not found")
    return item


@router.patch("/{day_id}/schedules/{item_id}", response_model=ScheduleItem, response_model_by_alias=True)
def patch_schedule(trip_id: str, day_id: str, item_id: str, data: ScheduleUpdate) -> ScheduleItem:
    item = update_schedule(trip_id, day_id, item_id, data)
    if item is None:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return item


@router.put("/{day_id}/schedules/{item_id}/image", response_model=ScheduleItem, response_model_by_alias=True)
async def put_schedule_image(trip_id: str, day_id: str, item_id: str, request: Request) -> ScheduleItem:
    extension = IMAGE_EXTENSIONS.get(request.headers.get("content-type", ""))
    if extension is None:
        raise HTTPException(status_code=415, detail="JPG, PNG, WEBP, GIF 이미지만 업로드할 수 있습니다")
    content = await request.body()
    if not content or len(content) > MAX_IMAGE_BYTES:
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
        upload_path(previous).unlink(missing_ok=True)
    return item


@router.delete("/{day_id}/schedules/{item_id}/image", response_model=ScheduleItem, response_model_by_alias=True)
def remove_schedule_image(trip_id: str, day_id: str, item_id: str) -> ScheduleItem:
    result = set_schedule_image(trip_id, day_id, item_id, None)
    if result is None:
        raise HTTPException(status_code=404, detail="Schedule not found")
    item, previous = result
    if previous:
        upload_path(previous).unlink(missing_ok=True)
    return item


@router.post("/{day_id}/schedules/{item_id}/comments", response_model=ScheduleComment, status_code=status.HTTP_201_CREATED)
def post_schedule_comment(trip_id: str, day_id: str, item_id: str, data: ScheduleCommentCreate) -> ScheduleComment:
    comment = add_schedule_comment(trip_id, day_id, item_id, data)
    if comment is None:
        raise HTTPException(status_code=404, detail="Schedule or trip member not found")
    return comment


@router.delete("/{day_id}/schedules/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_schedule(trip_id: str, day_id: str, item_id: str) -> Response:
    if not delete_schedule(trip_id, day_id, item_id):
        raise HTTPException(status_code=404, detail="Schedule not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
