from fastapi import APIRouter

from app.api.routers import auth, departments, donors, organizations, users

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(organizations.router)
api_router.include_router(departments.router)
api_router.include_router(donors.router)
api_router.include_router(users.router)
