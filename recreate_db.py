import os
from pathlib import Path
import pg8000
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / "backend" / ".env")

def get_admin_conn():
    return pg8000.connect(
        host=os.getenv("PGHOST", "localhost"),
        port=int(os.getenv("PGPORT", "5432")),
        database="postgres",  # Connect to postgres database
        user=os.getenv("PGUSER", "postgres"),
        password=os.getenv("PGPASSWORD", "postgres"),
    )

def recreate_database():
    db_name = os.getenv("PGDATABASE", "db_tren_wisuda")
    
    with get_admin_conn() as conn:
        conn.autocommit = True
        with conn.cursor() as cur:
            # Drop database if exists
            print(f"Dropping database {db_name} if exists...")
            cur.execute(f"DROP DATABASE IF EXISTS {db_name}")
            
            # Create database with UTF8 encoding
            print(f"Creating database {db_name} with UTF8 encoding...")
            cur.execute(f"CREATE DATABASE {db_name} ENCODING 'UTF8' LC_COLLATE='C' LC_CTYPE='C' TEMPLATE=template0")
            
    print(f"Database {db_name} created successfully with UTF8 encoding!")

if __name__ == "__main__":
    recreate_database()
