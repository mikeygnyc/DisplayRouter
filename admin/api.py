from fastapi import APIRouter

from router.api.admin import router as admin_router

router = APIRouter()
router.include_router(admin_router)
