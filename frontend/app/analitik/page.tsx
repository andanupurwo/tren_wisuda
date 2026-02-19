"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "../../components/Sidebar";

const apiBase =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "http://localhost:8000";

interface AnalyticsBucket { label: string; count: number; }
interface AnalyticsResponse {
  total: number;
  valid: number;
  invalid: number;
  byFakultas: AnalyticsBucket[];
  byProdi: AnalyticsBucket[];
  byGender: AnalyticsBucket[];
  byPredikat: AnalyticsBucket[];
  byUnit: { label: string; approved: number; total: number; percentage: number }[];
}

const COLORS = ["accent", "green", "blue", "yellow", "purple", "red"] as const;

export default function AnalitikPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [periods, setPeriods] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | "">("");
  const [summary, setSummary] = useState<AnalyticsResponse>({
    total: 0, valid: 0, invalid: 0, byFakultas: [], byProdi: [], byGender: [], byPredikat: [], byUnit: [],
  });
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"raw" | "normalized">("raw");

  const selectedIndex = useMemo(() => (!selected ? -1 : periods.indexOf(selected)), [periods, selected]);
  const handlePrev = () => { if (selectedIndex > 0) setSelected(periods[selectedIndex - 1]); };
  const handleNext = () => { if (selectedIndex >= 0 && selectedIndex < periods.length - 1) setSelected(periods[selectedIndex + 1]); };

  useEffect(() => {
    const urlMode = searchParams.get("mode");
    if (urlMode === "raw" || urlMode === "normalized") setMode(urlMode);
  }, [searchParams]);

  const updateMode = (m: "raw" | "normalized") => {
    setMode(m);
    const p = new URLSearchParams(searchParams.toString());
    p.set("mode", m);
    router.replace(`/analitik?${p}`);
  };

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`${apiBase}/api/periods?mode=${mode}`);
      if (!res.ok) return;
      const data = (await res.json()) as number[];
      setPeriods(data);
      if (data.length > 0) setSelected(data[data.length - 1]);
    };
    load();
  }, [mode]);

  useEffect(() => {
    if (!selected) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiBase}/api/analytics?periode=${selected}&mode=${mode}&limit=1000`);
        if (!res.ok) return;
        setSummary((await res.json()) as AnalyticsResponse);
      } finally { setLoading(false); }
    };
    load();
  }, [selected, mode]);

  const validPercent = useMemo(() => (!summary.total ? 0 : Math.round((summary.valid / summary.total) * 100)), [summary]);
  const maxFak = useMemo(() => summary.byFakultas.reduce((m, i) => Math.max(m, i.count), 0), [summary]);
  const maxProdi = useMemo(() => summary.byProdi.reduce((m, i) => Math.max(m, i.count), 0), [summary]);
  const maxPred = useMemo(() => (summary.byPredikat || []).reduce((m, i) => Math.max(m, i.count), 0), [summary]);

  const SkeletonBar = () => (
    <div className="bar-item">
      <div className="skeleton-cell" style={{ width: "80%", height: 12 }} />
      <div className="bar-track"><div className="skeleton-cell" style={{ width: "60%", height: 6 }} /></div>
      <div className="skeleton-cell" style={{ width: "100%", height: 12 }} />
    </div>
  );

  return (
    <div className="app-shell">
      <Sidebar mode={mode} onModeChange={updateMode} loading={loading} />

      <div className="main-area">
        <div className="topbar">
          <div className="topbar-left">
            <span className="topbar-title">Analitik</span>
            <span className="topbar-sep">/</span>
            <span className="topbar-sub">Periode {selected || "—"}</span>
          </div>
          <div className="topbar-right">
            <div className="period-nav2">
              <button className="ctrl-btn" onClick={handlePrev} disabled={selectedIndex <= 0}>‹</button>
              <select className="ctrl-select" value={selected} onChange={(e) => setSelected(Number(e.target.value))}>
                <option value="" disabled>Pilih periode</option>
                {periods.map((p) => <option key={p} value={p}>Periode {p}</option>)}
              </select>
              <button className="ctrl-btn" onClick={handleNext} disabled={selectedIndex < 0 || selectedIndex >= periods.length - 1}>›</button>
            </div>
            <span className={`status-dot ${loading ? "loading" : "ok"}`}>
              {loading ? "Memuat..." : `${summary.total} peserta`}
            </span>
          </div>
        </div>

        <div className="page-content">
          {/* Stat Cards */}
          <div className="stat-grid fade-up d1">
            <div className="stat-card blue">
              <div className="stat-label">Total Peserta</div>
              {loading ? <div className="skeleton-cell" style={{ height: 36, width: "40%" }} /> : <div className="stat-value">{summary.total}</div>}
              <div className="stat-sub">periode {selected || "—"}</div>
            </div>
            <div className="stat-card green">
              <div className="stat-label">Valid</div>
              {loading ? <div className="skeleton-cell" style={{ height: 36, width: "40%" }} /> : <div className="stat-value">{summary.valid}</div>}
              <div className="stat-sub up">{validPercent}% dari total</div>
            </div>
            <div className="stat-card red">
              <div className="stat-label">Tidak Valid</div>
              {loading ? <div className="skeleton-cell" style={{ height: 36, width: "40%" }} /> : <div className="stat-value">{summary.invalid}</div>}
              <div className="stat-sub down">{100 - validPercent}% dari total</div>
            </div>
            {(summary.byGender || []).map((g) => (
              <div key={g.label} className="stat-card">
                <div className="stat-label">{g.label}</div>
                {loading ? <div className="skeleton-cell" style={{ height: 36, width: "40%" }} /> : <div className="stat-value">{g.count}</div>}
                <div className="stat-sub">{summary.total > 0 ? Math.round((g.count / summary.total) * 100) : 0}% dari total</div>
              </div>
            ))}
          </div>

          {/* Analytics Layout */}
          <div className="analytics-layout fade-up d2">

            {/* Validity & Approvals */}
            <div className="panel">
              <div className="panel-head">
                <span className="panel-head-title">Validitas Peserta</span>
                <span className="panel-head-sub">mode: {mode}</span>
              </div>
              <div className="panel-body">
                {/* Donut */}
                <div className="donut-wrap" style={{ marginBottom: 20 }}>
                  <div
                    className="donut-chart"
                    style={{
                      background: `conic-gradient(var(--green) 0 ${validPercent * 3.6}deg, var(--red) ${validPercent * 3.6}deg 360deg)`,
                    }}
                  >
                    <span className="donut-value">{validPercent}%</span>
                  </div>
                  <div className="donut-legend">
                    <div className="legend-item">
                      <div className="legend-dot" style={{ background: "var(--green)" }} />
                      <span className="legend-text">Valid</span>
                      <span className="legend-val">{summary.valid}</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-dot" style={{ background: "var(--red)" }} />
                      <span className="legend-text">Tidak valid</span>
                      <span className="legend-val">{summary.invalid}</span>
                    </div>
                  </div>
                </div>

                <div className="divider" />

                {/* Unit Approvals */}
                <div style={{ fontWeight: 600, fontSize: 12, color: "var(--text)", marginBottom: 12 }}>
                  Approval Direktorat
                </div>
                <div className="bar-list">
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => <SkeletonBar key={i} />)
                    : (summary.byUnit || []).map((u) => (
                      <div key={u.label} className="bar-item">
                        <div className="bar-item-label" title={u.label}>{u.label}</div>
                        <div className="bar-track">
                          <div className="bar-fill green" style={{ width: `${u.percentage}%` }} />
                        </div>
                        <div className="bar-item-value">{u.percentage}%</div>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>

            {/* Fakultas */}
            <div className="panel">
              <div className="panel-head">
                <span className="panel-head-title">Distribusi Fakultas</span>
                <span className="panel-head-sub">jumlah peserta</span>
              </div>
              <div className="panel-body">
                <div className="bar-list">
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => <SkeletonBar key={i} />)
                    : summary.byFakultas.map((item, idx) => {
                      const short = item.label.replace(/Fakultas /i, "").split(" ").slice(0, 3).join(" ");
                      return (
                        <div key={item.label} className="bar-item">
                          <div className="bar-item-label" title={item.label}>{short}</div>
                          <div className="bar-track">
                            <div className={`bar-fill ${COLORS[idx % COLORS.length]}`} style={{ width: `${Math.max(4, (item.count / (maxFak || 1)) * 100)}%` }} />
                          </div>
                          <div className="bar-item-value">{item.count}</div>
                        </div>
                      );
                    })
                  }
                </div>
              </div>
            </div>

            {/* Predikat */}
            <div className="panel">
              <div className="panel-head">
                <span className="panel-head-title">Predikat Kelulusan</span>
                <span className="panel-head-sub">distribusi predikat</span>
              </div>
              <div className="panel-body">
                <div className="bar-list">
                  {loading
                    ? Array.from({ length: 4 }).map((_, i) => <SkeletonBar key={i} />)
                    : (summary.byPredikat || []).filter((i) => i.count > 0).map((item, idx) => (
                      <div key={item.label} className="bar-item">
                        <div className="bar-item-label">{item.label}</div>
                        <div className="bar-track">
                          <div className={`bar-fill ${COLORS[idx % COLORS.length]}`} style={{ width: `${Math.max(4, (item.count / (maxPred || 1)) * 100)}%` }} />
                        </div>
                        <div className="bar-item-value">{item.count}</div>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>

            {/* Prodi (scrollable) */}
            <div className="panel">
              <div className="panel-head">
                <span className="panel-head-title">Semua Program Studi</span>
                <span className="panel-head-sub">{summary.byProdi.length} prodi</span>
              </div>
              <div className="panel-body">
                <div className="bar-list scrollable">
                  {loading
                    ? Array.from({ length: 8 }).map((_, i) => <SkeletonBar key={i} />)
                    : summary.byProdi.map((item, idx) => (
                      <div key={item.label} className="bar-item">
                        <div className="bar-item-label" title={item.label}>{item.label}</div>
                        <div className="bar-track">
                          <div className={`bar-fill ${COLORS[idx % COLORS.length]}`} style={{ width: `${Math.max(4, (item.count / (maxProdi || 1)) * 100)}%` }} />
                        </div>
                        <div className="bar-item-value">{item.count}</div>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
