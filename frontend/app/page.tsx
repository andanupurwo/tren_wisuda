"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "../components/Sidebar";

const apiBase =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "http://localhost:8000";

interface Peserta {
  npm: string;
  periode: number;
  fakultas: string | null;
  prodi: string | null;
  program: string | null;
  status_awal: string | null;
  mhs_angkatan: string | null;
  peserta_valid: string | boolean | null;
  nama: string | null;
  jenis_kelamin: string | null;
  ukuran_toga: string | null;
  catatan: string | null;
  email: string | null;
  telepon1: string | null;
  telepon2: string | null;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  tanggal_lulus: string | null;
  masa_studi_bulan: string | number | null;
  masa_studi_tahun: string | number | null;
  nama_ayah: string | null;
  pekerjaan_ortu: string | null;
  jabatan_ortu: string | null;
  ipk: string | number | null;
  sks: string | number | null;
  predikat: string | null;
  judul_ta_skripsi: string | null;
  catatan_upt: string | null;
  catatan_rc: string | null;
  catatan_dpk: string | null;
  catatan_bpc: string | null;
  catatan_daak: string | null;
  approve_upt: string | boolean | null;
  approve_rc: string | boolean | null;
  approve_dpk: string | boolean | null;
  approve_bpc: string | boolean | null;
  approve_daak: string | boolean | null;
}

type ColumnKey = keyof Peserta;

const columns: { key: ColumnKey; label: string; filterable?: boolean }[] = [
  { key: "fakultas", label: "Fakultas", filterable: true },
  { key: "prodi", label: "Prodi", filterable: true },
  { key: "program", label: "Program", filterable: true },
  { key: "status_awal", label: "Status Awal" },
  { key: "mhs_angkatan", label: "Angkatan" },
  { key: "peserta_valid", label: "Valid?", filterable: true },
  { key: "npm", label: "NPM" },
  { key: "nama", label: "Nama" },
  { key: "jenis_kelamin", label: "L/P", filterable: true },
  { key: "ukuran_toga", label: "Toga" },
  { key: "catatan", label: "Catatan" },
  { key: "email", label: "Email" },
  { key: "telepon1", label: "Telp 1" },
  { key: "telepon2", label: "Telp 2" },
  { key: "tempat_lahir", label: "T. Lahir" },
  { key: "tanggal_lahir", label: "Tgl Lahir" },
  { key: "tanggal_lulus", label: "Tgl Lulus" },
  { key: "masa_studi_bulan", label: "Masa(bln)" },
  { key: "masa_studi_tahun", label: "Masa(thn)" },
  { key: "nama_ayah", label: "Nm Ayah" },
  { key: "pekerjaan_ortu", label: "Pkrj Ortu" },
  { key: "jabatan_ortu", label: "Jbt Ortu" },
  { key: "ipk", label: "IPK" },
  { key: "sks", label: "SKS" },
  { key: "predikat", label: "Predikat", filterable: true },
  { key: "judul_ta_skripsi", label: "Judul TA" },
  { key: "catatan_upt", label: "UPT" },
  { key: "catatan_rc", label: "RC" },
  { key: "catatan_dpk", label: "DPK" },
  { key: "catatan_bpc", label: "BPC" },
  { key: "catatan_daak", label: "DAAK" },
  { key: "approve_upt", label: "Apv UPT" },
  { key: "approve_rc", label: "Apv RC" },
  { key: "approve_dpk", label: "Apv DPK" },
  { key: "approve_bpc", label: "Apv BPC" },
  { key: "approve_daak", label: "Apv DAAK" },
];

const formatCell = (v: string | number | boolean | null) => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Ya" : "Tidak";
  return String(v);
};
const getSortValue = (v: string | number | boolean | null) => {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? 1 : 0;
  return v;
};

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [periods, setPeriods] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | "">("");
  const [rows, setRows] = useState<Peserta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"raw" | "normalized">("raw");
  const [sortKey, setSortKey] = useState<ColumnKey>("npm");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<Record<string, string>>({
    fakultas: "", prodi: "", program: "", peserta_valid: "", jenis_kelamin: "", predikat: "",
  });

  useEffect(() => {
    const urlMode = searchParams.get("mode");
    if (urlMode === "raw" || urlMode === "normalized") setMode(urlMode);
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${apiBase}/api/periods?mode=${mode}`);
        if (!res.ok) throw new Error("Gagal memuat periode");
        const data = (await res.json()) as number[];
        setPeriods(data);
        if (data.length > 0) setSelected(data[data.length - 1]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      }
    };
    load();
  }, [mode]);

  const searchParam = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (!selected) return;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const params = new URLSearchParams({ periode: String(selected), limit: "500", mode });
        if (searchParam) params.set("q", searchParam);
        const res = await fetch(`${apiBase}/api/peserta?${params}`);
        if (!res.ok) throw new Error("Gagal memuat data peserta");
        const data = (await res.json()) as { items: Peserta[] };
        setRows(data.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selected, searchParam, mode]);

  const filterOptions = useMemo(() => {
    const build = (k: ColumnKey) =>
      Array.from(new Set(rows.map((r) => formatCell(r[k])).filter((v) => v !== "—"))).sort();
    return { fakultas: build("fakultas"), prodi: build("prodi"), program: build("program"), peserta_valid: build("peserta_valid"), jenis_kelamin: build("jenis_kelamin"), predikat: build("predikat") };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const checks: [string, ColumnKey][] = [
      [filters.fakultas, "fakultas"], [filters.prodi, "prodi"], [filters.program, "program"],
      [filters.peserta_valid, "peserta_valid"], [filters.jenis_kelamin, "jenis_kelamin"], [filters.predikat, "predikat"],
    ];
    return rows.filter((row) => checks.every(([fv, k]) => !fv || formatCell(row[k]) === fv));
  }, [rows, filters]);

  const sortedRows = useMemo(() => {
    const copy = [...filteredRows];
    copy.sort((a, b) => {
      const av = getSortValue(a[sortKey]), bv = getSortValue(b[sortKey]);
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      const at = String(av).toLowerCase(), bt = String(bv).toLowerCase();
      return sortDir === "asc" ? at.localeCompare(bt) : bt.localeCompare(at);
    });
    return copy;
  }, [filteredRows, sortKey, sortDir]);

  const handleSort = (key: ColumnKey) => {
    if (sortKey === key) { setSortDir((p) => (p === "asc" ? "desc" : "asc")); return; }
    setSortKey(key); setSortDir("asc");
  };

  const updateMode = (m: "raw" | "normalized") => {
    setMode(m);
    const p = new URLSearchParams(searchParams.toString());
    p.set("mode", m);
    router.replace(`/?${p}`);
  };

  const selectedIndex = useMemo(() => (selected ? periods.indexOf(selected) : -1), [periods, selected]);
  const handlePrev = () => { if (selectedIndex > 0) setSelected(periods[selectedIndex - 1]); };
  const handleNext = () => { if (selectedIndex >= 0 && selectedIndex < periods.length - 1) setSelected(periods[selectedIndex + 1]); };

  const validCount = useMemo(() => rows.filter((r) => {
    const v = String(r.peserta_valid).toLowerCase();
    return v === "valid" || v === "true" || v === "ya" || v === "ok" || v === "v";
  }).length, [rows]);

  const topFakultas = useMemo(() => {
    const freq = rows.reduce((acc, r) => { const f = r.fakultas || "?"; acc[f] = (acc[f] || 0) + 1; return acc; }, {} as Record<string, number>);
    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0]?.replace(/Fakultas /i, "") || "—";
  }, [rows]);

  return (
    <div className="app-shell">
      <Sidebar mode={mode} onModeChange={updateMode} loading={loading} error={error} />

      <div className="main-area">
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-left">
            <span className="topbar-title">Riwayat Peserta</span>
            <span className="topbar-sep">/</span>
            <span className="topbar-sub">Periode {selected || "—"}</span>
          </div>
          <div className="topbar-right">
            <input
              className="ctrl-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="🔍  Cari nama atau NPM..."
              style={{ width: 220 }}
            />
            <span className={`status-dot ${loading ? "loading" : error ? "error" : "ok"}`}>
              {loading ? "Memuat..." : error ? "Error" : `${sortedRows.length} data`}
            </span>
          </div>
        </div>

        {/* Page Content */}
        <div className="page-content">

          {/* Stat Cards */}
          <div className="stat-grid fade-up d1">
            <div className="stat-card blue">
              <div className="stat-label">Total Peserta</div>
              {loading
                ? <div className="skeleton-cell" style={{ height: 36, width: "40%" }} />
                : <div className="stat-value">{rows.length}</div>}
              <div className="stat-sub">periode {selected || "—"}</div>
            </div>
            <div className="stat-card green">
              <div className="stat-label">Peserta Valid</div>
              {loading
                ? <div className="skeleton-cell" style={{ height: 36, width: "40%" }} />
                : <div className="stat-value">{validCount}</div>}
              <div className="stat-sub up">
                {rows.length > 0 ? Math.round((validCount / rows.length) * 100) : 0}% dari total
              </div>
            </div>
            <div className="stat-card yellow">
              <div className="stat-label">Tidak Valid</div>
              {loading
                ? <div className="skeleton-cell" style={{ height: 36, width: "40%" }} />
                : <div className="stat-value">{rows.length - validCount}</div>}
              <div className="stat-sub down">
                {rows.length > 0 ? Math.round(((rows.length - validCount) / rows.length) * 100) : 0}% dari total
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Fak. Terbanyak</div>
              {loading
                ? <div className="skeleton-cell" style={{ height: 36, width: "70%" }} />
                : <div className="stat-value" style={{ fontSize: 16, letterSpacing: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingTop: 4 }} title={topFakultas}>{topFakultas}</div>}
              <div className="stat-sub">dominasi peserta</div>
            </div>
          </div>

          {/* Controls */}
          <div className="controls-bar fade-up d2">
            <div className="ctrl-group">
              <span className="ctrl-label">Periode</span>
              <div className="period-nav2">
                <button className="ctrl-btn" onClick={handlePrev} disabled={selectedIndex <= 0}>‹</button>
                <select className="ctrl-select" value={selected} onChange={(e) => setSelected(Number(e.target.value))}>
                  <option value="" disabled>Pilih periode</option>
                  {periods.map((p) => <option key={p} value={p}>Periode {p}</option>)}
                </select>
                <button className="ctrl-btn" onClick={handleNext} disabled={selectedIndex < 0 || selectedIndex >= periods.length - 1}>›</button>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="table-container fade-up d3">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th key={col.key}>
                        <button type="button" className="th-btn" onClick={() => handleSort(col.key)}>
                          {col.label}
                          <span style={{ fontSize: 9, opacity: 0.5 }}>
                            {sortKey === col.key ? (sortDir === "asc" ? " ▲" : " ▼") : " ↕"}
                          </span>
                        </button>
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {columns.map((col) => (
                      <th key={`f-${col.key}`} className="filter-th">
                        {col.filterable ? (
                          <select
                            value={filters[col.key] ?? ""}
                            onChange={(e) => setFilters((p) => ({ ...p, [col.key]: e.target.value }))}
                          >
                            <option value="">Semua</option>
                            {(filterOptions[col.key as keyof typeof filterOptions] ?? []).map((o) => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                        ) : null}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 12 }).map((_, i) => (
                      <tr key={`sk-${i}`}>
                        {columns.map((col) => (
                          <td key={`sk-td-${i}-${col.key}`}>
                            <div className="skeleton-cell" style={{ width: col.key === "npm" || col.key === "ipk" ? "55%" : "85%" }} />
                          </td>
                        ))}
                      </tr>
                    ))
                    : sortedRows.map((row, idx) => (
                      <tr key={`${row.npm}-${row.periode}`} style={{ opacity: 0, animation: `fadeUp 0.25s ease-out ${Math.min(idx * 0.03, 0.4)}s forwards` }}>
                        {columns.map((col) => {
                          const v = row[col.key];
                          const label = formatCell(v as string | number | boolean | null);
                          return <td key={`${row.npm}-${col.key}`} title={label}>{label}</td>;
                        })}
                      </tr>
                    ))}
                </tbody>
              </table>
              {!loading && rows.length === 0 && (
                <div className="table-empty">Tidak ada data untuk periode ini.</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
