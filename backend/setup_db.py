import os
from pathlib import Path

import pg8000
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")


def get_admin_conn():
    return pg8000.connect(
        host=os.getenv("PGHOST", "localhost"),
        port=int(os.getenv("PGPORT", "5432")),
        database=os.getenv("PGADMIN_DB", "postgres"),
        user=os.getenv("PGUSER", "postgres"),
        password=os.getenv("PGPASSWORD", "postgres"),
    )


def get_app_conn():
    return pg8000.connect(
        host=os.getenv("PGHOST", "localhost"),
        port=int(os.getenv("PGPORT", "5432")),
        database=os.getenv("PGDATABASE", "history_peserta_wisuda"),
        user=os.getenv("PGUSER", "postgres"),
        password=os.getenv("PGPASSWORD", "postgres"),
    )


def ensure_database():
    db_name = os.getenv("PGDATABASE", "history_peserta_wisuda")
    with get_admin_conn() as conn:
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM pg_database WHERE datname = %s", (db_name,)
            )
            exists = cur.fetchone() is not None
            if not exists:
                cur.execute(f"CREATE DATABASE {db_name}")


def apply_schema():
    schema_path = Path(__file__).resolve().parents[1] / "schema.sql"
    sql = schema_path.read_text(encoding="utf-8")
    statements = [stmt.strip() for stmt in sql.split(";") if stmt.strip()]

    with get_app_conn() as conn:
        conn.autocommit = True
        with conn.cursor() as cur:
            for stmt in statements:
                cur.execute(stmt)


if __name__ == "__main__":
    ensure_database()
    apply_schema()
    print("Database dan schema siap.")
