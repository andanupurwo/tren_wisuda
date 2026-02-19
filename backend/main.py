import os
from pathlib import Path

from dotenv import load_dotenv

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware

try:
    from backend.db import fetchall_dict, fetchone_value, get_conn
    from backend.load_xlsx import analyze_file, load_from_bytes, export_periode_to_csv
except ModuleNotFoundError:
    from db import fetchall_dict, fetchone_value, get_conn
    from load_xlsx import analyze_file, load_from_bytes, export_periode_to_csv

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
    q: Optional[str] = Query(None, min_length=1),
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
    limit: int = Query(100, ge=1, le=1000),
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

            # Gender Stats
            cur.execute(
                f"SELECT COALESCE(NULLIF(TRIM(jenis_kelamin), ''), '(kosong)') "
                "AS label, COUNT(*) AS count "
                f"FROM {table} WHERE periode = %s "
                "GROUP BY label ORDER BY count DESC, label ASC",
                [periode],
            )
            by_gender = fetchall_dict(cur)

            # Predikat Stats
            cur.execute(
                f"SELECT COALESCE(NULLIF(TRIM(predikat), ''), '(kosong)') "
                "AS label, COUNT(*) AS count "
                f"FROM {table} WHERE periode = %s "
                "GROUP BY label ORDER BY count DESC, label ASC",
                [periode],
            )
            by_predikat = fetchall_dict(cur)

            # Approval Stats (Unit/Directorate)
            approval_cols = ["analyze_upt", "approve_rc", "approve_dpk", "approve_bpc", "approve_daak"]
            units_data = []
            
            # Helper to generate approval SQL based on mode
            def get_approval_sql(col):
                if mode == "raw":
                     # For raw, we look for 'valid', 'true', 'ok', etc strings
                    return (
                        f"SUM(CASE WHEN LOWER(COALESCE({col}, '')) IN "
                        "('valid', 'true', 'ok', 'ya', 'yes', 'v', '✓') "
                        "THEN 1 ELSE 0 END)"
                    )
                else:
                    return f"SUM(CASE WHEN {col} IS TRUE THEN 1 ELSE 0 END)"

            # Map correct column names for raw table if needed based on load_xlsx.py map
            # In load_xlsx.py, keys are normalized but DB columns are approve_upt etc.
            # safe to use DB column names
            
            unit_labels = {
                "approve_upt": "UPT",
                "approve_rc": "RC",
                "approve_dpk": "DPK",
                "approve_bpc": "BPC",
                "approve_daak": "DAAK"
            }

            for col, label in unit_labels.items():
                sql_expr = get_approval_sql(col)
                cur.execute(
                    f"SELECT {sql_expr} as approved_count FROM {table} WHERE periode = %s",
                    [periode]
                )
                approved_count = fetchone_value(cur) or 0
                units_data.append({
                    "label": label,
                    "approved": approved_count,
                    "total": total, # Percentage can be calculated on frontend or here
                    "percentage": round((approved_count / total * 100), 1) if total > 0 else 0
                })
            
            # Sort units by percentage descending
            units_data.sort(key=lambda x: x["percentage"], reverse=True)


    return {
        "total": total,
        "valid": validity.get("valid") or 0,
        "invalid": validity.get("invalid") or 0,
        "byFakultas": by_fakultas,
        "byProdi": by_prodi,
        "byGender": by_gender,
        "byPredikat": by_predikat,
        "byUnit": units_data
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


# ─────────────────────────────────────────────────
# IMPORT / EXPORT / DELETE
# ─────────────────────────────────────────────────

@app.post("/api/import/analyze")
async def import_analyze(file: UploadFile = File(...)):
    """Analyze an xlsx file and return column mapping info (no import)."""
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Hanya file .xlsx yang didukung.")
    content = await file.read()
    try:
        result = analyze_file(content, file.filename)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
    return result


@app.post("/api/import/upload")
async def import_upload(
    file: UploadFile = File(...),
    periode: Optional[int] = Query(None, description="Override periode number"),
):
    """Import an xlsx file into the database."""
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Hanya file .xlsx yang didukung.")
    content = await file.read()
    try:
        result = load_from_bytes(content, file.filename, periode_override=periode)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import gagal: {str(e)}")
    return result


@app.get("/api/export/bulk")
def export_bulk(
    periodes: str = Query(..., description="Comma-separated periode numbers, e.g. 98,99"),
    mode: str = Query("raw"),
):
    """Export multiple periods data as a single ZIP file containing CSVs."""
    import zipfile
    import io

    if mode not in {"raw", "normalized"}:
        raise HTTPException(status_code=400, detail="mode tidak valid")

    try:
        periode_list = [int(p.strip()) for p in periodes.split(",") if p.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="periodes harus berupa angka dipisah koma")

    if not periode_list:
        raise HTTPException(status_code=400, detail="tidak ada periode yang dipilih")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for p in periode_list:
            csv_content = export_periode_to_csv(p, mode)
            filename = f"wisuda_periode_{p}_{mode}.csv"
            # Encode to utf-8-sig for Excel compatibility
            zip_file.writestr(filename, csv_content.encode("utf-8-sig"))

    zip_buffer.seek(0)
    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="wisuda_export_bulk.zip"'},
    )


@app.get("/api/export/{periode}")
def export_periode(
    periode: int,
    mode: str = Query("raw"),
    fmt: str = Query("csv"),
):
    """Export a periode's data as CSV."""
    if mode not in {"raw", "normalized"}:
        raise HTTPException(status_code=400, detail="mode tidak valid")

    csv_content = export_periode_to_csv(periode, mode)
    filename = f"wisuda_periode_{periode}_{mode}.csv"
    return Response(
        content=csv_content.encode("utf-8-sig"),  # BOM for Excel compatibility
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.delete("/api/periode/{periode}")
def delete_periode(periode: int):
    """Delete all data for a specific periode."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM peserta_wisuda_raw WHERE periode = %s", [periode])
            deleted_raw = cur.rowcount
            cur.execute("DELETE FROM peserta_wisuda WHERE periode = %s", [periode])
            deleted_norm = cur.rowcount
        conn.commit()
    return {"deleted_raw": deleted_raw, "deleted_normalized": deleted_norm, "periode": periode}


@app.get("/api/import/history")
def import_history():
    """Return list of all imported periods with row counts from both tables."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT r.periode,
                       r.total   AS raw_count,
                       n.total   AS norm_count,
                       r.updated AS last_updated
                FROM (
                    SELECT periode, COUNT(*) AS total, MAX(updated_at) AS updated
                    FROM peserta_wisuda_raw GROUP BY periode
                ) r
                LEFT JOIN (
                    SELECT periode, COUNT(*) AS total
                    FROM peserta_wisuda GROUP BY periode
                ) n USING (periode)
                ORDER BY r.periode DESC
                """
            )
            rows = fetchall_dict(cur)
    return {"items": rows}
