"""
Initialize database by creating all tables defined in SQLAlchemy models.
Run this once to set up your database schema.
"""
from app.core.database import engine, Base
from app.models import Store, Person, Product, User, Inventory, Order
from sqlalchemy import text

def init_db():
    """Create all tables in the database."""
    print("Creating database tables...")
    
    # Import all models to ensure they're registered with Base.metadata
    # (already done via app.models imports above)
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    print("✓ All tables created successfully!")
    
    # Verify tables exist
    with engine.connect() as conn:
        result = conn.execute(text("SHOW TABLES"))
        tables = [row[0] for row in result]
        print(f"\nTables in database: {', '.join(tables)}")

if __name__ == "__main__":
    init_db()
