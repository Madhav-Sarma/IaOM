import os
from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import make_url
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Prefer settings if available, else read env directly
try:
    from app.core.config import settings
    DATABASE_URL = os.getenv("DATABASE_URL", settings.DATABASE_URL)
except Exception:
    DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not set in environment or settings")

# Parse URL and build a server-level URL (no specific database)
url = make_url(DATABASE_URL)
_db_name = url.database
if not _db_name:
    raise RuntimeError("No database name found in DATABASE_URL")

# Connect to server (mysql default database) to create target DB if missing
server_url = url.set(database="mysql")

# Use AUTOCOMMIT so CREATE DATABASE works without explicit transaction
engine = create_engine(server_url, isolation_level="AUTOCOMMIT", pool_pre_ping=True, future=True)

def ensure_database():
    with engine.connect() as conn:
        conn.execute(text(f"CREATE DATABASE IF NOT EXISTS `{_db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"))
        print(f"[create_db] Database ensured: {_db_name}")

if __name__ == "__main__":
    ensure_database()
