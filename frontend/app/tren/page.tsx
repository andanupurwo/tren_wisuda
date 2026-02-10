"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

const getSemester = (bulan: string) => {
  return SEMESTER_GENAP.has(bulan) ? "Genap" : "Ganjil";
};

const formatPeriodeDate = (info?: {
  tanggal?: string | null;
  bulan?: string;
  tahun?: number;
}) => {
  if (!info) {
    return "Tanggal belum tersedia";
  }
  if (info.tanggal) {
    return info.tanggal;
  }
  if (info.bulan && info.tahun) {
    return `${info.bulan} ${info.tahun}`;
  }
  if (info.bulan) {
    return info.bulan;
  }
  return "Tanggal belum tersedia";
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
  const [compareMode, setCompareMode] = useState<"month" | "semester">(
    "month"
  );
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    content: string[];
  } | null>(null);

  const showTooltip = (
    event: React.MouseEvent,
    item: TrendItem,
    valid: number,
    invalid: number
  ) => {
    setTooltip({
      x: event.clientX + 12,
      y: event.clientY + 12,
      content: [
        `Periode ${item.periode}`,
        `Tanggal: ${formatPeriodeDate(item)}`,
        `Total: ${item.total}`,
        `Valid: ${valid}`,
        `Tidak valid: ${invalid}`
      ]
    });
  };

  useEffect(() => {
    const urlMode = searchParams.get("mode");
    if (urlMode === "raw" || urlMode === "normalized") {
      setMode(urlMode);
    }
  }, [searchParams]);

  useEffect(() => {
    const loadTrends = async () => {
      setLoadingTrends(true);
      const res = await fetch(`${apiBase}/api/trends/detail?mode=${mode}`);
      if (res.ok) {
        const data = (await res.json()) as { items: TrendItem[] };
        setTrends(data.items);
      }
      setLoadingTrends(false);
    };

    loadTrends();
  }, [mode]);

  const updateMode = (nextMode: "raw" | "normalized") => {
    setMode(nextMode);
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", nextMode);
    router.replace(`/tren?${params.toString()}`);
  };

  const periodeInfo = useMemo(() => {
    return mapping.periode_mapping.find((item) => item.periode === selected);
  }, [selected]);

  const semesterTarget = useMemo(() => {
    return periodeInfo ? getSemester(periodeInfo.bulan) : "Genap";
  }, [periodeInfo]);

  const bulanTarget = useMemo(() => {
    return periodeInfo?.bulan ?? "-";
  }, [periodeInfo]);

  const compareLabel = useMemo(() => {
    return compareMode === "month"
      ? `bulan ${bulanTarget}`
      : `semester ${semesterTarget}`;
  }, [compareMode, bulanTarget, semesterTarget]);

  const trenWithSemester = useMemo(() => {
    return trends.map((item) => {
      const info = mapping.periode_mapping.find(
        (row) => row.periode === item.periode
      );
      const bulan = info?.bulan ?? "-";
      const semester = info ? getSemester(info.bulan) : "-";
      return {
        ...item,
        bulan,
        semester,
        tahun: info?.tahun,
        tanggal: info?.tanggal ?? null
      };
    });
  }, [trends]);

  const trenNewestFirst = useMemo(() => {
    const sorted = [...trenWithSemester].sort((a, b) => b.periode - a.periode);
    let band = -1;
    let lastYear: number | null = null;
    return sorted.map((item) => {
      if (item.tahun == null) {
        return { ...item, yearBand: -1 };
      }
      if (item.tahun !== lastYear) {
        band = (band + 1) % 2;
        lastYear = item.tahun;
      }
      return { ...item, yearBand: band };
    });
  }, [trenWithSemester]);

  const lastThree = useMemo(() => {
    const filtered = trenWithSemester.filter((item) =>
      compareMode === "month"
        ? item.bulan === bulanTarget
        : item.semester === semesterTarget
    );
    const sorted = [...filtered].sort((a, b) => a.periode - b.periode);
    return sorted.slice(-3);
  }, [trenWithSemester, bulanTarget, semesterTarget, compareMode]);

  const avgAll = useMemo(() => {
    if (!trends.length) {
      return 0;
    }
    const total = trends.reduce((sum, item) => sum + item.total, 0);
    return Math.round(total / trends.length);
  }, [trends]);

  const avgCompare = useMemo(() => {
    const filtered = trenWithSemester.filter((item) =>
      compareMode === "month"
        ? item.bulan === bulanTarget
        : item.semester === semesterTarget
    );
    if (!filtered.length) {
      return 0;
    }
    const total = filtered.reduce((sum, item) => sum + item.total, 0);
    return Math.round(total / filtered.length);
  }, [trenWithSemester, bulanTarget, semesterTarget, compareMode]);

  const avgLastThree = useMemo(() => {
    if (!lastThree.length) {
      return 0;
    }
    const total = lastThree.reduce((sum, item) => sum + item.total, 0);
    return Math.round(total / lastThree.length);
  }, [lastThree]);

  const yudisiumTotal = yudisiumJan + yudisiumFeb + yudisiumMar;
  const trendFactor = avgAll ? (avgCompare + avgLastThree) / (2 * avgAll) : 1;
  const predictedRaw = Math.round(yudisiumTotal * trendFactor);
  const predicted =
    compareMode === "semester"
      ? Math.max(yudisiumTotal, predictedRaw)
      : predictedRaw;

  const maxTotal = Math.max(1, ...trends.map((item) => item.total));

  const genapPeriods = trenWithSemester
    .filter((item) => item.semester === "Genap")
    .map((item) => item.periode);
  const ganjilPeriods = trenWithSemester
    .filter((item) => item.semester === "Ganjil")
    .map((item) => item.periode);

  return (
    <main className="page">
      <header className="menu-bar">
        <div className="menu-left">
          <nav className="menu-nav">
            <a href={`/?mode=${mode}`}>Riwayat</a>
            <a href={`/analitik?mode=${mode}`}>Data Analitik</a>
            <a className="active" href={`/tren?mode=${mode}`}>
              Tren/Prediksi
            </a>
          </nav>
        </div>
        <div className="menu-right">
          <span className="menu-chip">Periode Target: {selected}</span>
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
          {loadingTrends ? (
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

      <section className="trend-hero">
        <div>
          <p className="trend-tag">
            Prediksi periode {selected} · {formatPeriodeDate(periodeInfo)}
          </p>
          <h1>Tren & Prediksi Peserta Wisuda</h1>
          <p className="trend-sub">
            Prediksi dihitung dari total yudisium Januari–Maret dan
            disesuaikan dengan tren semester serta rata-rata periode terakhir.
          </p>
        </div>
        <div className="trend-metrics">
          <div className="metric-block">
            <span className="label">Prediksi Peserta</span>
            <strong>{predicted}</strong>
            <p className="analytics-note">Faktor tren: {trendFactor.toFixed(2)}</p>
          </div>
          <div className="metric-block">
            <span className="label">Semester Target</span>
            <strong>{semesterTarget}</strong>
            <p className="analytics-note">Rata-rata {compareLabel}: {avgCompare}</p>
          </div>
          <div className="metric-block metric-toggle">
            <span className="label">Mode Pembanding</span>
            <div className="menu-toggle">
              <button
                type="button"
                className={compareMode === "month" ? "active" : ""}
                onClick={() => setCompareMode("month")}
              >
                Bulan
              </button>
              <button
                type="button"
                className={compareMode === "semester" ? "active" : ""}
                onClick={() => setCompareMode("semester")}
              >
                Semester
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="trend-grid">
        <div className="trend-card">
          <div className="panel-header">
            <h2>Input Yudisium 2026</h2>
            <span className="panel-sub">Jan–Mar</span>
          </div>
          <div className="yudisium-list">
            <label>
              Januari
              <input
                type="number"
                value={yudisiumJan}
                onChange={(event) => setYudisiumJan(event.target.value === '' ? 0 : Number(event.target.value))}
                onFocus={(event) => event.target.select()}
              />
            </label>
            <label>
              Februari
              <input
                type="number"
                value={yudisiumFeb}
                onChange={(event) => setYudisiumFeb(event.target.value === '' ? 0 : Number(event.target.value))}
                onFocus={(event) => event.target.select()}
              />
            </label>
            <label>
              Maret
              <input
                type="number"
                value={yudisiumMar}
                onChange={(event) => setYudisiumMar(event.target.value === '' ? 0 : Number(event.target.value))}
                onFocus={(event) => event.target.select()}
              />
            </label>
          </div>
          <div className="trend-summary">
            <span>Total Yudisium</span>
            <strong>{yudisiumTotal}</strong>
          </div>
        </div>

        <div className="trend-card">
          <div className="panel-header">
            <h2>Tren Periode Terakhir</h2>
            <span className="panel-sub">3 periode terakhir ({compareLabel})</span>
          </div>
          <div className="trend-list">
            {lastThree.map((item) => (
              <div key={item.periode} className="trend-row">
                <span>Periode {item.periode}</span>
                <strong>{item.total}</strong>
              </div>
            ))}
          </div>
          <p className="analytics-note">Rata-rata 3 periode ({compareLabel}): {avgLastThree}</p>
        </div>

        <div className="trend-card">
          <div className="panel-header">
            <h2>Semester Ganjil vs Genap</h2>
            <span className="panel-sub">Kelompok periode</span>
          </div>
          <div className="semester-list">
            <div>
              <h3>Genap</h3>
              <p>{genapPeriods.join(", ") || "-"}</p>
            </div>
            <div>
              <h3>Ganjil</h3>
              <p>{ganjilPeriods.join(", ") || "-"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="trend-chart">
        <div className="panel-header">
          <h2>Tren Jumlah Peserta per Periode</h2>
          <span className="panel-sub">Mode: {mode}</span>
        </div>
        <div className="bar-stack">
          {trenNewestFirst.map((item) => {
            const valid = item.valid ?? 0;
            const invalid = item.invalid ?? 0;
            const validWidth = (valid / maxTotal) * 100;
            const invalidWidth = (invalid / maxTotal) * 100;
            return (
              <div
                key={item.periode}
                className={`bar-row bar-hover${item.yearBand === 0
                    ? " year-band-0"
                    : item.yearBand === 1
                      ? " year-band-1"
                      : ""
                  }`}
                onMouseLeave={() => setTooltip(null)}
              >
                <span
                  className="bar-label"
                  title={`Periode ${item.periode} · ${formatPeriodeDate(item)}`}
                >
                  {item.periode} ({item.bulan} {item.tahun ?? ""})
                </span>
                <span
                  className="bar-track"
                  onMouseMove={(event) => showTooltip(event, item, valid, invalid)}
                >
                  <span
                    className="bar-fill valid"
                    style={{ width: `${validWidth}%` }}
                  />
                  <span
                    className="bar-fill invalid"
                    style={{ width: `${invalidWidth}%` }}
                  />
                </span>
                <span className="bar-value">{item.total}</span>
              </div>
            );
          })}
        </div>
      </section>
      {tooltip && (
        <div
          className="cursor-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <strong>{tooltip.content[0]}</strong>
          <span>{tooltip.content[1]}</span>
          <span>{tooltip.content[2]}</span>
          <span>{tooltip.content[3]}</span>
          <span>{tooltip.content[4]}</span>
        </div>
      )}
    </main>
  );
}
