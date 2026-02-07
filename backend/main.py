import os
from pathlib import Path

from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from backend.db import fetchall_dict, fetchone_value, get_conn

load_dotenv(Path(__file__).resolve().parent / ".env")

app = FastAPI(title="History Peserta Wisuda API")

cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/periods")
def list_periods(mode: str = Query("raw")):
    if mode not in {"raw", "normalized"}:
        raise HTTPException(status_code=400, detail="mode tidak valid")
    table = "peserta_wisuda_raw" if mode == "raw" else "peserta_wisuda"
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT DISTINCT periode FROM {table} ORDER BY periode"
            )
            rows = fetchall_dict(cur)

    return [row["periode"] for row in rows]


@app.get("/api/peserta")
def list_peserta(
    periode: int = Query(...),
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    q: str | None = Query(None, min_length=1),
    mode: str = Query("raw"),
):
    if mode not in {"raw", "normalized"}:
        raise HTTPException(status_code=400, detail="mode tidak valid")
    table = "peserta_wisuda_raw" if mode == "raw" else "peserta_wisuda"
    where_sql = "WHERE periode = %s"
    params = [periode]

    if q:
        where_sql += " AND (LOWER(nama) LIKE %s OR LOWER(npm) LIKE %s)"
        q_like = f"%{q.lower()}%"
        params.extend([q_like, q_like])

    count_sql = f"SELECT COUNT(*) AS total FROM {table} {where_sql}"
    data_sql = (
        f"SELECT * FROM {table} "
        f"{where_sql} ORDER BY npm LIMIT %s OFFSET %s"
    )

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(count_sql, params)
            total = fetchone_value(cur) or 0

            cur.execute(data_sql, params + [limit, offset])
            items = fetchall_dict(cur)

    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@app.get("/api/analytics")
def analytics(
    periode: int = Query(...),
    mode: str = Query("raw"),
    limit: int = Query(10, ge=3, le=30),
):
    if mode not in {"raw", "normalized"}:
        raise HTTPException(status_code=400, detail="mode tidak valid")
    table = "peserta_wisuda_raw" if mode == "raw" else "peserta_wisuda"

    if mode == "raw":
        valid_sql = (
            "SUM(CASE WHEN LOWER(COALESCE(peserta_valid, '')) = 'valid' "
            "THEN 1 ELSE 0 END)"
        )
        invalid_sql = (
            "SUM(CASE WHEN LOWER(COALESCE(peserta_valid, '')) = 'tidak valid' "
            "THEN 1 ELSE 0 END)"
        )
    else:
        valid_sql = "SUM(CASE WHEN peserta_valid IS TRUE THEN 1 ELSE 0 END)"
        invalid_sql = "SUM(CASE WHEN peserta_valid IS FALSE THEN 1 ELSE 0 END)"

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT COUNT(*) AS total FROM {table} WHERE periode = %s",
                [periode],
            )
            total = fetchone_value(cur) or 0

            cur.execute(
                f"SELECT {valid_sql} AS valid, {invalid_sql} AS invalid "
                f"FROM {table} WHERE periode = %s",
                [periode],
            )
            validity = fetchall_dict(cur)[0]

            cur.execute(
                f"SELECT COALESCE(NULLIF(TRIM(fakultas), ''), '(kosong)') "
                "AS label, COUNT(*) AS count "
                f"FROM {table} WHERE periode = %s "
                "GROUP BY label ORDER BY count DESC, label ASC LIMIT %s",
                [periode, limit],
            )
            by_fakultas = fetchall_dict(cur)

            cur.execute(
                f"SELECT COALESCE(NULLIF(TRIM(prodi), ''), '(kosong)') "
                "AS label, COUNT(*) AS count "
                f"FROM {table} WHERE periode = %s "
                "GROUP BY label ORDER BY count DESC, label ASC LIMIT %s",
                [periode, limit],
            )
            by_prodi = fetchall_dict(cur)

    return {
        "total": total,
        "valid": validity.get("valid") or 0,
        "invalid": validity.get("invalid") or 0,
        "byFakultas": by_fakultas,
        "byProdi": by_prodi,
    }


@app.get("/api/trends")
def trends(mode: str = Query("raw")):
    if mode not in {"raw", "normalized"}:
        raise HTTPException(status_code=400, detail="mode tidak valid")
    table = "peserta_wisuda_raw" if mode == "raw" else "peserta_wisuda"

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT periode, COUNT(*) AS total FROM {table} "
                "GROUP BY periode ORDER BY periode"
            )
            rows = fetchall_dict(cur)

    return {"items": rows}


@app.get("/api/trends/detail")
def trends_detail(mode: str = Query("raw")):
    if mode not in {"raw", "normalized"}:
        raise HTTPException(status_code=400, detail="mode tidak valid")
    table = "peserta_wisuda_raw" if mode == "raw" else "peserta_wisuda"

    if mode == "raw":
        valid_sql = (
            "SUM(CASE WHEN LOWER(COALESCE(peserta_valid, '')) = 'valid' "
            "THEN 1 ELSE 0 END)"
        )
        invalid_sql = (
            "SUM(CASE WHEN LOWER(COALESCE(peserta_valid, '')) = 'tidak valid' "
            "THEN 1 ELSE 0 END)"
        )
    else:
        valid_sql = "SUM(CASE WHEN peserta_valid IS TRUE THEN 1 ELSE 0 END)"
        invalid_sql = "SUM(CASE WHEN peserta_valid IS FALSE THEN 1 ELSE 0 END)"

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT periode, COUNT(*) AS total, {valid_sql} AS valid, "
                f"{invalid_sql} AS invalid FROM {table} "
                "GROUP BY periode ORDER BY periode"
            )
            rows = fetchall_dict(cur)

    return {"items": rows}
