"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import mapping from "../data/periode_mapping.json";

const apiBase =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "http://localhost:8000";

interface TrendItem {
  periode: number;
  total: number;
  valid: number | null;
  invalid: number | null;
  bulan?: string;
  tahun?: number;
  tanggal?: string | null;
  yearBand?: number;
}

const SEMESTER_GENAP = new Set(["April", "Juli"]);
const getSemester = (bulan: string) => (SEMESTER_GENAP.has(bulan) ? "Genap" : "Ganjil");
const formatPeriodeDate = (info?: { tanggal?: string | null; bulan?: string; tahun?: number }) => {
  if (!info) return "—";
  if (info.tanggal) return info.tanggal;
  if (info.bulan && info.tahun) return `${info.bulan} ${info.tahun}`;
  return info.bulan || "—";
};

export default function TrenPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"raw" | "normalized">("raw");
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [selected, setSelected] = useState<number>(98);
  const [yudisiumJan, setYudisiumJan] = useState(120);
  const [yudisiumFeb, setYudisiumFeb] = useState(160);
  const [yudisiumMar, setYudisiumMar] = useState(190);
  const [compareMode, setCompareMode] = useState<"month" | "semester">("month");
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string[] } | null>(null);

  const showTooltip = (e: React.MouseEvent, item: TrendItem, valid: number, invalid: number) => {
    setTooltip({ x: e.clientX + 14, y: e.clientY + 14, content: [`Periode ${item.periode}`, formatPeriodeDate(item), `Total: ${item.total}`, `Valid: ${valid}`, `Invalid: ${invalid}`] });
  };

  useEffect(() => {
    const urlMode = searchParams.get("mode");
    if (urlMode === "raw" || urlMode === "normalized") setMode(urlMode);
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      setLoadingTrends(true);
      const res = await fetch(`${apiBase}/api/trends/detail?mode=${mode}`);
      if (res.ok) { const d = (await res.json()) as { items: TrendItem[] }; setTrends(d.items); }
      setLoadingTrends(false);
    };
    load();
  }, [mode]);

  const updateMode = (m: "raw" | "normalized") => {
    setMode(m);
    const p = new URLSearchParams(searchParams.toString());
    p.set("mode", m);
    router.replace(`/tren?${p}`);
  };

  const periodeInfo = useMemo(() => mapping.periode_mapping.find((i) => i.periode === selected), [selected]);
  const semesterTarget = useMemo(() => (periodeInfo ? getSemester(periodeInfo.bulan) : "Genap"), [periodeInfo]);
  const bulanTarget = useMemo(() => periodeInfo?.bulan ?? "—", [periodeInfo]);
  const compareLabel = useMemo(() => (compareMode === "month" ? `bulan ${bulanTarget}` : `sem. ${semesterTarget}`), [compareMode, bulanTarget, semesterTarget]);

  const trenWithSemester = useMemo(() =>
    trends.map((item) => {
      const info = mapping.periode_mapping.find((r) => r.periode === item.periode);
      const bulan = info?.bulan ?? "—";
      return { ...item, bulan, semester: info ? getSemester(info.bulan) : "—", tahun: info?.tahun, tanggal: info?.tanggal ?? null };
    }), [trends]);

  const trenNewestFirst = useMemo(() => {
    const sorted = [...trenWithSemester].sort((a, b) => b.periode - a.periode);
    let band = -1; let lastYear: number | null = null;
    return sorted.map((item) => {
      if (item.tahun == null) return { ...item, yearBand: -1 };
      if (item.tahun !== lastYear) { band = (band + 1) % 2; lastYear = item.tahun; }
      return { ...item, yearBand: band };
    });
  }, [trenWithSemester]);

  const lastThree = useMemo(() => {
    const filtered = trenWithSemester.filter((i) => compareMode === "month" ? i.bulan === bulanTarget : i.semester === semesterTarget);
    return [...filtered].sort((a, b) => a.periode - b.periode).slice(-3);
  }, [trenWithSemester, bulanTarget, semesterTarget, compareMode]);

  const avgAll = useMemo(() => (!trends.length ? 0 : Math.round(trends.reduce((s, i) => s + i.total, 0) / trends.length)), [trends]);
  const avgCompare = useMemo(() => {
    const f = trenWithSemester.filter((i) => compareMode === "month" ? i.bulan === bulanTarget : i.semester === semesterTarget);
    return !f.length ? 0 : Math.round(f.reduce((s, i) => s + i.total, 0) / f.length);
  }, [trenWithSemester, bulanTarget, semesterTarget, compareMode]);
  const avgLastThree = useMemo(() => (!lastThree.length ? 0 : Math.round(lastThree.reduce((s, i) => s + i.total, 0) / lastThree.length)), [lastThree]);

  const yudisiumTotal = yudisiumJan + yudisiumFeb + yudisiumMar;
  const trendFactor = avgAll ? (avgCompare + avgLastThree) / (2 * avgAll) : 1;
  const predictedRaw = Math.round(yudisiumTotal * trendFactor);
  const predicted = compareMode === "semester" ? Math.max(yudisiumTotal, predictedRaw) : predictedRaw;

  const maxTotal = Math.max(1, ...trends.map((i) => i.total));
  const genapPeriods = trenWithSemester.filter((i) => i.semester === "Genap").map((i) => i.periode);
  const ganjilPeriods = trenWithSemester.filter((i) => i.semester === "Ganjil").map((i) => i.periode);

  const periodeOptions = useMemo(() => mapping.periode_mapping.slice().sort((a, b) => b.periode - a.periode), []);

  return (
    <div className="app-shell">
      <Sidebar mode={mode} onModeChange={updateMode} loading={loadingTrends} />

      <div className="main-area">
        <div className="topbar">
          <div className="topbar-left">
            <span className="topbar-title">Tren &amp; Prediksi</span>
            <span className="topbar-sep">/</span>
            <span className="topbar-sub">Target Periode {selected}</span>
          </div>
          <div className="topbar-right">
            <span className={`status-dot ${loadingTrends ? "loading" : "ok"}`}>
              {loadingTrends ? "Memuat..." : `${trends.length} periode historis`}
            </span>
          </div>
        </div>

        <div className="page-content">

          {/* Hero prediction card */}
          <div className="trend-hero-card fade-up d1">
            <div>
              <div className="trend-hero-tag">
                Prediksi · {formatPeriodeDate(periodeInfo)}
              </div>
              <div className="trend-hero-title">Tren &amp; Prediksi Wisuda</div>
              <div className="trend-hero-sub">
                Dihitung dari total yudisium Jan–Mar, disesuaikan faktor tren dan rata-rata periode sebelumnya.
              </div>
            </div>
            <div className="trend-hero-metrics">
              <div className="trend-metric-block">
                <div className="trend-metric-label">Prediksi Peserta</div>
                <div className="trend-metric-value">{predicted}</div>
                <div className="trend-metric-note">Faktor tren: {trendFactor.toFixed(2)}</div>
              </div>
              <div className="trend-metric-block">
                <div className="trend-metric-label">Semester Target</div>
                <div className="trend-metric-value">{semesterTarget}</div>
                <div className="trend-metric-note">Rata-rata {compareLabel}: {avgCompare}</div>
              </div>
              <div className="trend-metric-block">
                <div className="trend-metric-label">Rata-rata Global</div>
                <div className="trend-metric-value">{avgAll}</div>
                <div className="trend-metric-note">dari {trends.length} periode</div>
              </div>
            </div>
          </div>

          {/* Grid: Controls + Last 3 + Semester split */}
          <div className="tren-grid fade-up d2">

            {/* Input Yudisium */}
            <div className="panel">
              <div className="panel-head">
                <span className="panel-head-title">Input Yudisium 2026</span>
                <span className="panel-head-sub">Jan–Mar</span>
              </div>
              <div className="panel-body">
                <div className="input-list">
                  <div className="input-row">
                    <label>Januari</label>
                    <input type="number" value={yudisiumJan}
                      onChange={(e) => setYudisiumJan(e.target.value === "" ? 0 : Number(e.target.value))}
                      onFocus={(e) => e.target.select()} />
                  </div>
                  <div className="input-row">
                    <label>Februari</label>
                    <input type="number" value={yudisiumFeb}
                      onChange={(e) => setYudisiumFeb(e.target.value === "" ? 0 : Number(e.target.value))}
                      onFocus={(e) => e.target.select()} />
                  </div>
                  <div className="input-row">
                    <label>Maret</label>
                    <input type="number" value={yudisiumMar}
                      onChange={(e) => setYudisiumMar(e.target.value === "" ? 0 : Number(e.target.value))}
                      onFocus={(e) => e.target.select()} />
                  </div>
                  <div className="input-total">
                    <span>Total Yudisium</span>
                    <span className="mono">{yudisiumTotal}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Target Periode & Mode */}
            <div className="panel">
              <div className="panel-head">
                <span className="panel-head-title">Konfigurasi Prediksi</span>
              </div>
              <div className="panel-body flex-col gap-12">
                <div>
                  <div className="ctrl-label" style={{ marginBottom: 6 }}>Periode Target</div>
                  <select className="ctrl-select" style={{ width: "100%" }} value={selected} onChange={(e) => setSelected(Number(e.target.value))}>
                    {periodeOptions.map((p) => (
                      <option key={p.periode} value={p.periode}>
                        {p.periode} — {p.bulan} {p.tahun}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="ctrl-label" style={{ marginBottom: 6 }}>Mode Pembanding</div>
                  <div className="compare-toggle">
                    <button className={`compare-btn ${compareMode === "month" ? "active" : ""}`} onClick={() => setCompareMode("month")}>Bulan</button>
                    <button className={`compare-btn ${compareMode === "semester" ? "active" : ""}`} onClick={() => setCompareMode("semester")}>Semester</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Last 3 Periods */}
            <div className="panel">
              <div className="panel-head">
                <span className="panel-head-title">3 Periode Terakhir</span>
                <span className="panel-head-sub">{compareLabel}</span>
              </div>
              <div className="panel-body">
                <div className="bar-list">
                  {lastThree.map((item) => (
                    <div key={item.periode} className="bar-item">
                      <div className="bar-item-label">Periode {item.periode}</div>
                      <div className="bar-track">
                        <div className="bar-fill accent" style={{ width: `${(item.total / Math.max(1, ...lastThree.map((i) => i.total))) * 100}%` }} />
                      </div>
                      <div className="bar-item-value">{item.total}</div>
                    </div>
                  ))}
                </div>
                <div className="divider" />
                <div className="flex-between text-sm text-muted">
                  <span>Rata-rata</span>
                  <span className="mono" style={{ color: "var(--accent2)", fontWeight: 600 }}>{avgLastThree}</span>
                </div>
              </div>
            </div>

            {/* Semester split */}
            <div className="panel">
              <div className="panel-head">
                <span className="panel-head-title">Ganjil vs Genap</span>
                <span className="panel-head-sub">pengelompokan periode</span>
              </div>
              <div className="panel-body flex-col gap-12">
                <div className="semester-pair">
                  <div className="semester-chip">
                    <div className="semester-chip-title">🌟 Genap</div>
                    <div className="semester-chip-val">{genapPeriods.slice(-6).join(", ") || "—"}</div>
                  </div>
                  <div className="semester-chip">
                    <div className="semester-chip-title">⭐ Ganjil</div>
                    <div className="semester-chip-val">{ganjilPeriods.slice(-6).join(", ") || "—"}</div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Historical trend chart */}
          <div className="panel fade-up d3">
            <div className="panel-head">
              <span className="panel-head-title">Tren Historis Peserta per Periode</span>
              <span className="panel-head-sub">mode: {mode} · {trenNewestFirst.length} periode</span>
            </div>
            <div className="panel-body">
              <div className="bar-list scrollable">
                {loadingTrends
                  ? Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="bar-item">
                      <div className="skeleton-cell" style={{ width: "60%", height: 12 }} />
                      <div className="bar-track"><div className="skeleton-cell" style={{ width: "80%", height: 6 }} /></div>
                      <div className="skeleton-cell" style={{ width: "100%", height: 12 }} />
                    </div>
                  ))
                  : trenNewestFirst.map((item) => {
                    const valid = item.valid ?? 0;
                    const invalid = item.invalid ?? 0;
                    return (
                      <div
                        key={item.periode}
                        className={`trend-bar-item ${item.yearBand === 0 ? "band-0" : item.yearBand === 1 ? "band-1" : ""}`}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <div className="bar-item-label" title={`Periode ${item.periode} · ${formatPeriodeDate(item)}`}>
                          {item.periode} · {item.bulan} {item.tahun ?? ""}
                        </div>
                        <div
                          className="stacked-bar"
                          onMouseMove={(e) => showTooltip(e, item, valid, invalid)}
                        >
                          <div className="bar-fill green" style={{ width: `${(valid / maxTotal) * 100}%` }} />
                          <div className="bar-fill red" style={{ width: `${(invalid / maxTotal) * 100}%` }} />
                        </div>
                        <div className="bar-item-value">{item.total}</div>
                      </div>
                    );
                  })
                }
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                <div className="legend-item"><div className="legend-dot" style={{ background: "var(--green)" }} /><span className="legend-text text-xs">Valid</span></div>
                <div className="legend-item"><div className="legend-dot" style={{ background: "var(--red)" }} /><span className="legend-text text-xs">Tidak valid</span></div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {tooltip && (
        <div className="cursor-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <strong>{tooltip.content[0]}</strong>
          {tooltip.content.slice(1).map((t, i) => <span key={i}>{t}</span>)}
        </div>
      )}
    </div>
  );
}
