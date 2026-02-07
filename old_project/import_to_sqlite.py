from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Iterable

import pandas as pd

DATA_DIR = Path(__file__).resolve().parent / "history_peserta_wisuda"
DB_PATH = Path(__file__).resolve().parent / "tren_wisuda.db"
TABLE_NAME = "peserta_wisuda"


def list_excel_files(data_dir: Path) -> list[Path]:
    if not data_dir.exists():
        return []
    return sorted(data_dir.glob("*.xlsx"))


def collect_columns(files: Iterable[Path]) -> list[str]:
    columns: list[str] = []
    for file in files:
        df = pd.read_excel(file, nrows=0)
        for col in df.columns:
            if col not in columns:
                columns.append(col)
    columns.extend(["_periode", "_file"])
    return columns


def parse_periode(filename: str) -> int:
    parts = filename.split()
    for i, part in enumerate(parts):
        if part.lower() == "periode" and i + 1 < len(parts):
            try:
                return int(parts[i + 1])
            except ValueError:
                return 0
    return 0


def import_files(files: list[Path], db_path: Path) -> None:
    if not files:
        raise SystemExit("Tidak ada file Excel ditemukan.")

    columns = collect_columns(files)
    dtype_map = {col: "TEXT" for col in columns}
    max_vars = 900
    chunk_size = max(1, max_vars // max(1, len(columns)))

    with sqlite3.connect(db_path) as conn:
        conn.execute(f"DROP TABLE IF EXISTS {TABLE_NAME}")
        col_defs = ", ".join([f'"{col}" TEXT' for col in columns])
        conn.execute(f"CREATE TABLE {TABLE_NAME} ({col_defs})")
        conn.commit()

        for idx, file in enumerate(files, start=1):
            print(f"[{idx}/{len(files)}] Mengimpor {file.name}...")
            df = pd.read_excel(file)
            df = df.dropna(how="all")
            df["_periode"] = parse_periode(file.name)
            df["_file"] = file.name

            for col in columns:
                if col not in df.columns:
                    df[col] = None

            df = df[columns]
            df = df.where(pd.notnull(df), None)

            df.to_sql(
                TABLE_NAME,
                conn,
                if_exists="append",
                index=False,
                dtype=dtype_map,
                chunksize=chunk_size,
            )

    print(f"Selesai. Database tersimpan di: {db_path}")


if __name__ == "__main__":
    excel_files = list_excel_files(DATA_DIR)
    import_files(excel_files, DB_PATH)
