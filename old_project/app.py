from __future__ import annotations

import re
import sqlite3
from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

APP_TITLE = "Tren & Prediksi Peserta Wisuda"
DATA_DIR = Path(__file__).resolve().parent / "history_peserta_wisuda"
DB_PATH = Path(__file__).resolve().parent / "tren_wisuda.db"
PERIODE_REGEX = re.compile(r"Periode\s*(\d+)", re.IGNORECASE)


@st.cache_data(show_spinner=False)
def list_excel_files(data_dir: Path) -> list[Path]:
    if not data_dir.exists():
        return []
    return sorted(data_dir.glob("*.xlsx"))


def parse_periode(name: str, fallback: int) -> int:
    match = PERIODE_REGEX.search(name)
    if match:
        try:
            return int(match.group(1))
        except ValueError:
            return fallback
    return fallback


@st.cache_data(show_spinner=True)
def load_data(files: Iterable[Path]) -> pd.DataFrame:
    frames: list[pd.DataFrame] = []
    for idx, file in enumerate(files, start=1):
        df = pd.read_excel(file)
        df = df.dropna(how="all")
        df["_periode"] = parse_periode(file.name, idx)
        df["_file"] = file.name
        frames.append(df)

    if not frames:
        return pd.DataFrame(columns=["_periode", "_file"])

    combined = pd.concat(frames, ignore_index=True)
    return combined


@st.cache_data(show_spinner=True)
def load_data_from_db(db_path: Path) -> pd.DataFrame:
    if not db_path.exists():
        return pd.DataFrame(columns=["_periode", "_file"])
    with sqlite3.connect(db_path) as conn:
        df = pd.read_sql_query("SELECT * FROM peserta_wisuda", conn)
    df["_periode"] = pd.to_numeric(df["_periode"], errors="coerce").fillna(0).astype(int)
    return df


def series_total_periode(df: pd.DataFrame) -> pd.DataFrame:
    grouped = df.groupby("_periode").size().reset_index(name="jumlah")
    return grouped.sort_values("_periode")


def series_by_column(df: pd.DataFrame, column: str) -> pd.DataFrame:
    temp = df.dropna(subset=[column])
    grouped = (
        temp.groupby(["_periode", column]).size().reset_index(name="jumlah")
    )
    return grouped.sort_values(["_periode", "jumlah"], ascending=[True, False])


def linear_forecast(periods: np.ndarray, values: np.ndarray, steps: int) -> pd.DataFrame:
    if len(periods) < 2:
        return pd.DataFrame(columns=["_periode", "prediksi"])

    coef = np.polyfit(periods, values, 1)
    start = int(periods.max()) + 1
    future = np.arange(start, start + steps)
    pred = coef[0] * future + coef[1]
    pred = np.clip(pred, 0, None)
    return pd.DataFrame({"_periode": future, "prediksi": pred.round(0).astype(int)})


def add_semester_type(df: pd.DataFrame) -> pd.DataFrame:
    """Add semester type (Ganjil=odd/Genap=even) based on periode"""
    df["_semester"] = df["_periode"].apply(lambda x: "Ganjil" if x % 2 == 1 else "Genap")
    return df


st.set_page_config(page_title=APP_TITLE, layout="wide")

st.markdown(
    """
    <style>
    .app-header {font-size: 2.1rem; font-weight: 700; margin-bottom: 0.25rem;}
    .app-subtitle {color: #6b7280; margin-bottom: 1rem;}
    .card {padding: 1rem 1.25rem; border-radius: 14px; background: #f8fafc; border: 1px solid #e5e7eb;}
    .card-title {font-size: 0.9rem; color: #6b7280;}
    .card-value {font-size: 1.6rem; font-weight: 700;}
    .badge {display:inline-block; padding:0.2rem 0.6rem; border-radius:999px; background:#eef2ff; color:#4338ca; font-size:0.75rem;}
    .section-title {font-size: 1.25rem; font-weight: 700; margin-top: 0.5rem;}
    </style>
    """,
    unsafe_allow_html=True,
)

st.markdown(f"<div class='app-header'>{APP_TITLE}</div>", unsafe_allow_html=True)
st.markdown(
    "<div class='app-subtitle'>Flashback data masa lalu dan tren peserta wisuda mendatang berdasarkan histori.</div>",
    unsafe_allow_html=True,
)

with st.sidebar:
    st.header("Pengaturan")
    data_dir = st.text_input("Folder data", str(DATA_DIR))
    use_db = st.checkbox("Gunakan database SQLite", value=DB_PATH.exists())
    with st.expander("Filter", expanded=True):
        semester_filter = st.multiselect(
            "Filter Semester",
            options=["Ganjil", "Genap"],
            default=["Ganjil", "Genap"],
            help="Pilih semester yang ingin dianalisis",
        )
        steps = st.number_input("Jumlah periode prediksi", min_value=1, max_value=12, value=3)
    st.caption("Tips: aktifkan database agar loading lebih cepat.")

files = list_excel_files(Path(data_dir))

if use_db:
    with st.spinner("Memuat data dari database..."):
        df = load_data_from_db(DB_PATH)
else:
    if not files:
        st.warning("File Excel tidak ditemukan. Pastikan folder data benar.")
        st.stop()
    with st.spinner("Memuat data..."):
        df = load_data(files)

if df.empty:
    st.warning("Data kosong setelah dibaca.")
    st.stop()

# Add semester type and apply filter
df = add_semester_type(df)
df_filtered = df[df["_semester"].isin(semester_filter)].copy() if semester_filter else df

if df_filtered.empty:
    st.warning("Tidak ada data untuk semester yang dipilih.")
    st.stop()

available_columns = sorted([c for c in df_filtered.columns if not c.startswith("_")])

trend = series_total_periode(df_filtered)
periods = trend["_periode"].to_numpy()
values = trend["jumlah"].to_numpy()
forecast = linear_forecast(periods, values, steps)

last_periode = int(trend["_periode"].max()) if not trend.empty else 0
last_value = int(trend.loc[trend["_periode"] == last_periode, "jumlah"].iloc[0]) if last_periode else 0
prev_value = int(trend.loc[trend["_periode"] == last_periode - 1, "jumlah"].iloc[0]) if (last_periode - 1) in trend["_periode"].values else 0
delta_value = last_value - prev_value if prev_value else 0
delta_pct = (delta_value / prev_value * 100) if prev_value else 0
peak_idx = trend["jumlah"].idxmax() if not trend.empty else None
peak_periode = int(trend.loc[peak_idx, "_periode"]) if peak_idx is not None else 0
peak_value = int(trend.loc[peak_idx, "jumlah"]) if peak_idx is not None else 0

tab_ringkasan, tab_tren, tab_analisis, tab_semester = st.tabs(
    ["Ringkasan", "Tren & Prediksi", "Analisis Kolom", "Semester"]
)

with tab_ringkasan:
    st.markdown("<div class='section-title'>Ringkasan Cepat</div>", unsafe_allow_html=True)
    k1, k2, k3, k4 = st.columns(4)
    total = len(df_filtered)
    periode_count = df_filtered["_periode"].nunique()
    ganjil_total = len(df_filtered[df_filtered["_semester"] == "Ganjil"])
    genap_total = len(df_filtered[df_filtered["_semester"] == "Genap"])

    k1.metric("Total peserta", f"{total:,}")
    k2.metric("Jumlah periode", f"{periode_count}")
    k3.metric("Ganjil", f"{ganjil_total:,}")
    k4.metric("Genap", f"{genap_total:,}")

    c1, c2, c3 = st.columns(3)
    with c1:
        st.markdown("<div class='card'><div class='card-title'>Periode terbaru</div>" +
                    f"<div class='card-value'>{last_periode}</div></div>", unsafe_allow_html=True)
    with c2:
        st.markdown("<div class='card'><div class='card-title'>Peserta periode terbaru</div>" +
                    f"<div class='card-value'>{last_value:,}</div></div>", unsafe_allow_html=True)
    with c3:
        delta_text = f"{delta_value:+,} ({delta_pct:+.1f}%)" if prev_value else "-"
        st.markdown("<div class='card'><div class='card-title'>Perubahan vs periode sebelumnya</div>" +
                    f"<div class='card-value'>{delta_text}</div></div>", unsafe_allow_html=True)

    if peak_periode:
        st.info(f"Puncak peserta ada di periode {peak_periode} dengan total {peak_value:,}.")

with tab_tren:
    st.markdown("<div class='section-title'>Tren Total Peserta</div>", unsafe_allow_html=True)
    fig = px.line(trend, x="_periode", y="jumlah", markers=True)
    fig.update_layout(xaxis_title="Periode", yaxis_title="Jumlah Peserta")
    st.plotly_chart(fig, use_container_width=True)

    st.markdown("<div class='section-title'>Prediksi Peserta</div>", unsafe_allow_html=True)
    fcol1, fcol2 = st.columns([2, 1])
    with fcol1:
        if forecast.empty:
            st.info("Data belum cukup untuk prediksi (minimal 2 periode).")
        else:
            fig3 = go.Figure()
            fig3.add_trace(go.Scatter(x=trend["_periode"], y=trend["jumlah"], mode="lines+markers", name="Aktual"))
            fig3.add_trace(go.Scatter(x=forecast["_periode"], y=forecast["prediksi"], mode="lines+markers", name="Prediksi"))
            fig3.update_layout(xaxis_title="Periode", yaxis_title="Jumlah Peserta")
            st.plotly_chart(fig3, use_container_width=True)
    with fcol2:
        if not forecast.empty:
            st.caption("Hasil Prediksi")
            st.dataframe(forecast, use_container_width=True)
    st.caption("Metode prediksi: regresi linear sederhana berdasarkan tren periode.")

with tab_analisis:
    st.markdown("<div class='section-title'>Analisis Berdasarkan Kolom</div>", unsafe_allow_html=True)
    if not available_columns:
        st.info("Kolom data tambahan tidak ditemukan. Hanya menampilkan tren total.")
    else:
        selected_col = st.selectbox("Pilih kolom", available_columns)
        breakdown = series_by_column(df_filtered, selected_col)

        top_n = st.slider("Tampilkan Top N kategori", min_value=3, max_value=20, value=8)
        latest_periode = breakdown["_periode"].max()
        latest_top = (
            breakdown[breakdown["_periode"] == latest_periode]
            .sort_values("jumlah", ascending=False)
            .head(top_n)
        )

        bcol1, bcol2 = st.columns([2, 1])
        with bcol1:
            fig2 = px.line(
                breakdown,
                x="_periode",
                y="jumlah",
                color=selected_col,
                markers=True,
            )
            fig2.update_layout(xaxis_title="Periode", yaxis_title="Jumlah Peserta")
            st.plotly_chart(fig2, use_container_width=True)

        with bcol2:
            st.caption(f"Top {top_n} pada periode {latest_periode}")
            st.dataframe(latest_top, use_container_width=True)

with tab_semester:
    st.markdown("<div class='section-title'>Perbandingan Semester Ganjil vs Genap</div>", unsafe_allow_html=True)
    sem_comparison = df.groupby(["_periode", "_semester"]).size().reset_index(name="jumlah")
    fig_sem = px.bar(
        sem_comparison,
        x="_periode",
        y="jumlah",
        color="_semester",
        barmode="group",
        labels={"_periode": "Periode", "jumlah": "Jumlah Peserta", "_semester": "Semester"},
    )
    col_sem1, col_sem2 = st.columns([3, 1])
    with col_sem1:
        st.plotly_chart(fig_sem, use_container_width=True)
    with col_sem2:
        st.metric("Ganjil Total", f"{len(df[df['_semester']=='Ganjil']):,}")
        st.metric("Genap Total", f"{len(df[df['_semester']=='Genap']):,}")
