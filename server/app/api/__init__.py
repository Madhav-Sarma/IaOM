from fastapi import APIRouter
from app.api import example_routes, auth_routes, customer_routes

api_router = APIRouter()

# Authentication routes
api_router.include_router(auth_routes.router, prefix="/auth", tags=["authentication"])

# Include all route modules here
api_router.include_router(example_routes.router, prefix="/products", tags=["products"])
api_router.include_router(customer_routes.router, prefix="/customers", tags=["customers"])

# Add more routers as you create them:
# api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
# api_router.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
