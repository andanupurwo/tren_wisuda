import os
from pathlib import Path
from urllib.parse import urlparse

import pg8000
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")


def get_conn():
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        parsed = urlparse(database_url)
        conn = pg8000.connect(
            host=parsed.hostname or "localhost",
            port=parsed.port or 5432,
            database=(parsed.path or "").lstrip("/"),
            user=parsed.username,
            password=parsed.password,
        )
        conn.autocommit = True
        # Set client encoding to UTF-8
        with conn.cursor() as cur:
            cur.execute("SET CLIENT_ENCODING TO 'UTF8'")
        return conn

    conn = pg8000.connect(
        host=os.getenv("PGHOST", "localhost"),
        port=int(os.getenv("PGPORT", "5432")),
        database=os.getenv("PGDATABASE", "history_peserta_wisuda"),
        user=os.getenv("PGUSER", "postgres"),
        password=os.getenv("PGPASSWORD", "postgres"),
    )
    conn.autocommit = True
    # Set client encoding to UTF-8
    with conn.cursor() as cur:
        cur.execute("SET CLIENT_ENCODING TO 'UTF8'")
    return conn


def fetchall_dict(cursor):
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def fetchone_value(cursor):
    row = cursor.fetchone()
    if row is None:
        return None
    return row[0]
