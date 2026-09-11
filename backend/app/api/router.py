from fastapi import APIRouter

from .routes import checklists, reservations, schedules, trips


api_router = APIRouter(prefix="/api")
api_router.include_router(trips.router)
api_router.include_router(checklists.router)
api_router.include_router(reservations.router)
api_router.include_router(schedules.router)
