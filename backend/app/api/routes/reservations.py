from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request, Response, status

from ...core.config import UPLOAD_DIR, upload_path
from ...domain.schemas import Reservation, ReservationCreate, ReservationUpdate
from ...infrastructure.database import create_reservation, delete_reservation, list_reservations, set_reservation_image, update_reservation


router = APIRouter(prefix="/trips/{trip_id}/reservations", tags=["reservations"])
IMAGE_EXTENSIONS = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}
MAX_IMAGE_BYTES = 8 * 1024 * 1024


@router.get("", response_model=list[Reservation])
def get_trip_reservations(trip_id: str) -> list[Reservation]:
    reservations = list_reservations(trip_id)
    if reservations is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return reservations


@router.post("", response_model=Reservation, status_code=status.HTTP_201_CREATED)
def post_trip_reservation(trip_id: str, data: ReservationCreate) -> Reservation:
    reservation = create_reservation(trip_id, data)
    if reservation is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return reservation


@router.patch("/{reservation_id}", response_model=Reservation)
def patch_trip_reservation(trip_id: str, reservation_id: str, data: ReservationUpdate) -> Reservation:
    reservation = update_reservation(trip_id, reservation_id, data)
    if reservation is None:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return reservation


@router.delete("/{reservation_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_trip_reservation(trip_id: str, reservation_id: str) -> Response:
    deleted, image_filename = delete_reservation(trip_id, reservation_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if image_filename:
        upload_path(image_filename).unlink(missing_ok=True)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/{reservation_id}/image", response_model=Reservation)
async def put_reservation_image(trip_id: str, reservation_id: str, request: Request) -> Reservation:
    extension = IMAGE_EXTENSIONS.get(request.headers.get("content-type", ""))
    if extension is None:
        raise HTTPException(status_code=415, detail="JPG, PNG, WEBP, GIF 이미지만 업로드할 수 있습니다")
    content = await request.body()
    if not content or len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="이미지는 8MB 이하여야 합니다")
    filename = f"{uuid4().hex}{extension}"
    path = UPLOAD_DIR / filename
    path.write_bytes(content)
    result = set_reservation_image(trip_id, reservation_id, filename)
    if result is None:
        path.unlink(missing_ok=True)
        raise HTTPException(status_code=404, detail="Reservation not found")
    reservation, previous = result
    if previous:
        upload_path(previous).unlink(missing_ok=True)
    return reservation


@router.delete("/{reservation_id}/image", response_model=Reservation)
def remove_reservation_image(trip_id: str, reservation_id: str) -> Reservation:
    result = set_reservation_image(trip_id, reservation_id, None)
    if result is None:
        raise HTTPException(status_code=404, detail="Reservation not found")
    reservation, previous = result
    if previous:
        upload_path(previous).unlink(missing_ok=True)
    return reservation
