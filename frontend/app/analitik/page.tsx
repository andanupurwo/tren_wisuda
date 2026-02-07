"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const apiBase =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "http://localhost:8000";

interface AnalyticsBucket {
  label: string;
  count: number;
}

interface AnalyticsResponse {
  total: number;
  valid: number;
  invalid: number;
  byFakultas: AnalyticsBucket[];
  byProdi: AnalyticsBucket[];
}

export default function AnalitikPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [periods, setPeriods] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | "">("");
  const [summary, setSummary] = useState<AnalyticsResponse>({
    total: 0,
    valid: 0,
    invalid: 0,
    byFakultas: [],
    byProdi: []
  });
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"raw" | "normalized">("raw");

  const selectedIndex = useMemo(() => {
    if (!selected) {
      return -1;
    }
    return periods.indexOf(selected);
  }, [periods, selected]);

  const handlePrevPeriod = () => {
    if (selectedIndex <= 0) {
      return;
    }
    setSelected(periods[selectedIndex - 1]);
  };

  const handleNextPeriod = () => {
    if (selectedIndex < 0 || selectedIndex >= periods.length - 1) {
      return;
    }
    setSelected(periods[selectedIndex + 1]);
  };

  useEffect(() => {
    const urlMode = searchParams.get("mode");
    if (urlMode === "raw" || urlMode === "normalized") {
      setMode(urlMode);
    }
  }, [searchParams]);

  const updateMode = (nextMode: "raw" | "normalized") => {
    setMode(nextMode);
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", nextMode);
    router.replace(`/analitik?${params.toString()}`);
  };

  useEffect(() => {
    const loadPeriods = async () => {
      const res = await fetch(`${apiBase}/api/periods?mode=${mode}`);
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as number[];
      setPeriods(data);
      if (data.length > 0) {
        setSelected(data[data.length - 1]);
      }
    };

    loadPeriods();
  }, [mode]);

  useEffect(() => {
    if (!selected) {
      return;
    }

    const loadSummary = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${apiBase}/api/analytics?periode=${selected}&mode=${mode}`
        );
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as AnalyticsResponse;
        setSummary(data);
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, [selected, mode]);

  const validPercent = useMemo(() => {
    if (!summary.total) {
      return 0;
    }
    return Math.round((summary.valid / summary.total) * 100);
  }, [summary]);

  const invalidPercent = 100 - validPercent;

  const maxFakultas = useMemo(() => {
    return summary.byFakultas.reduce(
      (max, item) => Math.max(max, item.count),
      0
    );
  }, [summary.byFakultas]);

  const maxProdi = useMemo(() => {
    return summary.byProdi.reduce(
      (max, item) => Math.max(max, item.count),
      0
    );
  }, [summary.byProdi]);

  return (
    <main className="page">
      <header className="menu-bar">
        <div className="menu-left">
          <nav className="menu-nav">
            <a href={`/?mode=${mode}`}>Riwayat</a>
            <a className="active" href={`/analitik?mode=${mode}`}>Data Analitik</a>
            <a href={`/tren?mode=${mode}`}>Tren/Prediksi</a>
          </nav>
        </div>
        <div className="menu-right">
          <span className="menu-chip">Periode: {selected || "-"}</span>
          <div className="menu-toggle">
            <button
              type="button"
              className={mode === "raw" ? "active" : ""}
              onClick={() => updateMode("raw")}
            >
              Raw
            </button>
            <button
              type="button"
              className={mode === "normalized" ? "active" : ""}
              onClick={() => updateMode("normalized")}
            >
              Normalized
            </button>
          </div>
          {loading ? (
            <span className="pill status-pill header-status">
              <span className="status-light processing" />
            </span>
          ) : (
            <span className="pill status-pill header-status success">
              <span className="status-light stable" />
            </span>
          )}
        </div>
      </header>

      <section className="controls compact">
        <div className="control">
          <label>Pilih Periode</label>
          <div className="period-nav">
            <button
              type="button"
              onClick={handlePrevPeriod}
              disabled={selectedIndex <= 0}
            >
              Prev
            </button>
            <select
              value={selected}
              onChange={(event) => setSelected(Number(event.target.value))}
            >
              <option value="" disabled>
                Pilih periode
              </option>
              {periods.map((period) => (
                <option key={period} value={period}>
                  Periode {period}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleNextPeriod}
              disabled={selectedIndex < 0 || selectedIndex >= periods.length - 1}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <section className="analytics-grid">
        <div className="analytics-card">
          <span className="label">Total Peserta</span>
          <strong>{summary.total}</strong>
          <p className="analytics-note">Periode {selected || "-"}</p>
        </div>
        <div className="analytics-card">
          <span className="label">Valid</span>
          <strong>{summary.valid}</strong>
          <p className="analytics-note">{validPercent}% dari total</p>
        </div>
        <div className="analytics-card">
          <span className="label">Tidak Valid</span>
          <strong>{summary.invalid}</strong>
          <p className="analytics-note">{invalidPercent}% dari total</p>
        </div>
      </section>

      <section className="analytics-layout">
        <div className="analytics-panel">
          <div className="panel-header">
            <h2>Komparasi Valid vs Tidak Valid</h2>
            <span className="panel-sub">Mode data: {mode}</span>
          </div>
          <div className="validity-wrap">
            <div
              className="donut"
              style={{
                background: `conic-gradient(#2f8f4e 0 ${validPercent}%, #d66a4a ${validPercent}% 100%)`
              }}
            >
              <span>{validPercent}%</span>
            </div>
            <div className="validity-bars">
              <div className="bar-row">
                <span className="bar-label">Valid</span>
                <span className="bar-track">
                  <span
                    className="bar-fill valid"
                    style={{ width: `${validPercent}%` }}
                  />
                </span>
                <span className="bar-value">{summary.valid}</span>
              </div>
              <div className="bar-row">
                <span className="bar-label">Tidak Valid</span>
                <span className="bar-track">
                  <span
                    className="bar-fill invalid"
                    style={{ width: `${invalidPercent}%` }}
                  />
                </span>
                <span className="bar-value">{summary.invalid}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="analytics-panel">
          <div className="panel-header">
            <h2>Top Fakultas</h2>
            <span className="panel-sub">Berdasarkan jumlah peserta</span>
          </div>
          <div className="bar-stack">
            {summary.byFakultas.map((item) => (
              <div key={item.label} className="bar-row">
                <span className="bar-label" title={item.label}>
                  {item.label}
                </span>
                <span className="bar-track">
                  <span
                    className="bar-fill fakultas"
                    style={{
                      width: `${Math.max(4, (item.count / (maxFakultas || 1)) * 100)}%`
                    }}
                  />
                </span>
                <span className="bar-value">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="analytics-panel">
          <div className="panel-header">
            <h2>Top Prodi</h2>
            <span className="panel-sub">Berdasarkan jumlah peserta</span>
          </div>
          <div className="bar-stack">
            {summary.byProdi.map((item) => (
              <div key={item.label} className="bar-row">
                <span className="bar-label" title={item.label}>
                  {item.label}
                </span>
                <span className="bar-track">
                  <span
                    className="bar-fill prodi"
                    style={{
                      width: `${Math.max(4, (item.count / (maxProdi || 1)) * 100)}%`
                    }}
                  />
                </span>
                <span className="bar-value">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
