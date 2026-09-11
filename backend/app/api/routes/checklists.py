from fastapi import APIRouter, HTTPException, Response, status

from ...domain.schemas import ChecklistItem, ChecklistItemCreate, ChecklistItemUpdate
from ...infrastructure.database import create_checklist_item, delete_checklist_item, list_checklist_items, update_checklist_item


router = APIRouter(prefix="/trips/{trip_id}/checklist", tags=["checklist"])


@router.get("", response_model=list[ChecklistItem])
def get_trip_checklist(trip_id: str) -> list[ChecklistItem]:
    items = list_checklist_items(trip_id)
    if items is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return items


@router.post("", response_model=ChecklistItem, status_code=status.HTTP_201_CREATED)
def post_trip_checklist_item(trip_id: str, data: ChecklistItemCreate) -> ChecklistItem:
    try:
        item = create_checklist_item(trip_id, data)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    if item is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return item


@router.patch("/{item_id}", response_model=ChecklistItem)
def patch_trip_checklist_item(trip_id: str, item_id: str, data: ChecklistItemUpdate) -> ChecklistItem:
    item = update_checklist_item(trip_id, item_id, data)
    if item is None:
        raise HTTPException(status_code=404, detail="Checklist item not found")
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_trip_checklist_item(trip_id: str, item_id: str) -> Response:
    if not delete_checklist_item(trip_id, item_id):
        raise HTTPException(status_code=404, detail="Checklist item not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
