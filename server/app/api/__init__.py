from fastapi import APIRouter


api_router = APIRouter()
# Use relative imports to avoid circular import during package init
from .auth_routes import router as auth_router  # noqa: E402
from .customer_routes import router as customer_router  # noqa: E402
from .product_routes import router as product_router  # noqa: E402
from .order_routes import router as order_router  # noqa: E402
from .store_routes import router as store_router  # noqa: E402

# Authentication routes
api_router.include_router(auth_router, prefix="/auth", tags=["authentication"])

# Customer management routes
api_router.include_router(customer_router, prefix="/customers", tags=["customers"])

# Product management routes
api_router.include_router(product_router, prefix="/products", tags=["products"])

# Order management routes
api_router.include_router(order_router, prefix="/orders", tags=["orders"])

# Store settings routes
api_router.include_router(store_router, prefix="/store", tags=["store"])

# Add more routers as you create them:
# api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
