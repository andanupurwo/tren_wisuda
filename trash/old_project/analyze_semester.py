from __future__ import annotations

import sqlite3
from pathlib import Path

import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go

DB_PATH = Path(__file__).resolve().parent / "tren_wisuda.db"


def load_data() -> pd.DataFrame:
    with sqlite3.connect(DB_PATH) as conn:
        df = pd.read_sql_query("SELECT * FROM peserta_wisuda", conn)
    df["_periode"] = pd.to_numeric(df["_periode"], errors="coerce").fillna(0).astype(int)
    return df


def add_semester_type(df: pd.DataFrame) -> pd.DataFrame:
    """Add semester type (ganjil/genap) based on periode"""
    df["semester_type"] = df["_periode"].apply(lambda x: "Ganjil" if x % 2 == 1 else "Genap")
    return df


def analyze_semester_trend(df: pd.DataFrame) -> dict:
    """Analyze trend differences between odd and even semesters"""
    result = {}
    
    # Total per semester type
    semester_totals = df.groupby("semester_type").size()
    result["total_by_type"] = semester_totals.to_dict()
    
    # Average per periode per semester type
    periode_counts = df.groupby(["_periode", "semester_type"]).size().reset_index(name="count")
    avg_ganjil = periode_counts[periode_counts["semester_type"] == "Ganjil"]["count"].mean()
    avg_genap = periode_counts[periode_counts["semester_type"] == "Genap"]["count"].mean()
    result["avg_by_type"] = {"Ganjil": avg_ganjil, "Genap": avg_genap}
    
    # Trend analysis
    ganjil_data = periode_counts[periode_counts["semester_type"] == "Ganjil"].sort_values("_periode")
    genap_data = periode_counts[periode_counts["semester_type"] == "Genap"].sort_values("_periode")
    
    result["ganjil_trend"] = ganjil_data.to_dict("records")
    result["genap_trend"] = genap_data.to_dict("records")
    
    return result


def print_analysis(analysis: dict):
    """Print analysis results"""
    print("\n" + "="*60)
    print("ANALISIS PERPENGARUH SEMESTER GANJIL/GENAP")
    print("="*60)
    
    print("\n1. TOTAL PESERTA PER JENIS SEMESTER")
    for sem_type, count in analysis["total_by_type"].items():
        print(f"   {sem_type:8} : {count:5} peserta")
    
    print("\n2. RATA-RATA PESERTA PER PERIODE")
    for sem_type, avg in analysis["avg_by_type"].items():
        print(f"   {sem_type:8} : {avg:7.2f} peserta/periode")
    
    diff = analysis["avg_by_type"]["Ganjil"] - analysis["avg_by_type"]["Genap"]
    pct_diff = (diff / analysis["avg_by_type"]["Genap"]) * 100 if analysis["avg_by_type"]["Genap"] > 0 else 0
    print(f"\n   Selisih : {diff:+.2f} peserta ({pct_diff:+.1f}%)")
    
    print("\n3. DETAIL TREN GANJIL")
    print("   Periode | Jumlah")
    for record in sorted(analysis["ganjil_trend"], key=lambda x: x["_periode"]):
        print(f"   {record['_periode']:7} | {record['count']:6}")
    
    print("\n4. DETAIL TREN GENAP")
    print("   Periode | Jumlah")
    for record in sorted(analysis["genap_trend"], key=lambda x: x["_periode"]):
        print(f"   {record['_periode']:7} | {record['count']:6}")
    
    print("\n" + "="*60)


def create_comparison_chart(df: pd.DataFrame) -> go.Figure:
    """Create comparison chart"""
    periode_counts = df.groupby(["_periode", "semester_type"]).size().reset_index(name="count")
    
    fig = px.bar(
        periode_counts,
        x="_periode",
        y="count",
        color="semester_type",
        barmode="group",
        labels={"_periode": "Periode", "count": "Jumlah Peserta", "semester_type": "Jenis Semester"},
        title="Perbandingan Jumlah Peserta Ganjil vs Genap"
    )
    return fig


if __name__ == "__main__":
    df = load_data()
    df = add_semester_type(df)
    
    analysis = analyze_semester_trend(df)
    print_analysis(analysis)
    
    # Save chart
    fig = create_comparison_chart(df)
    fig.write_html("semester_comparison.html")
    print("\nGrafik tersimpan ke: semester_comparison.html")
