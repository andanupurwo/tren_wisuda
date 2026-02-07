"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
  { key: "mhs_angkatan", label: "Mhs Angkatan" },
  { key: "peserta_valid", label: "Peserta Valid?", filterable: true },
  { key: "npm", label: "NPM" },
  { key: "nama", label: "Nama" },
  { key: "jenis_kelamin", label: "Jenis Kelamin", filterable: true },
  { key: "ukuran_toga", label: "Ukuran Toga" },
  { key: "catatan", label: "Catatan" },
  { key: "email", label: "Email" },
  { key: "telepon1", label: "Telepon1" },
  { key: "telepon2", label: "Telepon2" },
  { key: "tempat_lahir", label: "Tempat Lahir" },
  { key: "tanggal_lahir", label: "Tanggal Lahir" },
  { key: "tanggal_lulus", label: "Tanggal Lulus" },
  { key: "masa_studi_bulan", label: "Masa Studi (bulan)" },
  { key: "masa_studi_tahun", label: "Masa Studi (tahun)" },
  { key: "nama_ayah", label: "Nama Ayah" },
  { key: "pekerjaan_ortu", label: "Pekerjaan Ortu" },
  { key: "jabatan_ortu", label: "Jabatan Ortu" },
  { key: "ipk", label: "IPK" },
  { key: "sks", label: "SKS" },
  { key: "predikat", label: "Predikat", filterable: true },
  { key: "judul_ta_skripsi", label: "Judul TA/Skripsi" },
  { key: "catatan_upt", label: "CatatanUpt" },
  { key: "catatan_rc", label: "CatatanRc" },
  { key: "catatan_dpk", label: "CatatanDpk" },
  { key: "catatan_bpc", label: "CatatanBpc" },
  { key: "catatan_daak", label: "CatatanDaak" },
  { key: "approve_upt", label: "ApproveUPT" },
  { key: "approve_rc", label: "ApproveRC" },
  { key: "approve_dpk", label: "ApproveDPK" },
  { key: "approve_bpc", label: "ApproveBPC" },
  { key: "approve_daak", label: "ApproveDAAK" }
];

const formatCell = (value: string | number | boolean | null) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (typeof value === "boolean") {
    return value ? "Ya" : "Tidak";
  }
  return String(value);
};

const getSortValue = (value: string | number | boolean | null) => {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  return value;
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
    fakultas: "",
    prodi: "",
    program: "",
    peserta_valid: "",
    jenis_kelamin: "",
    predikat: ""
  });

  useEffect(() => {
    const urlMode = searchParams.get("mode");
    if (urlMode === "raw" || urlMode === "normalized") {
      setMode(urlMode);
    }
  }, [searchParams]);

  useEffect(() => {
    const loadPeriods = async () => {
      try {
        const res = await fetch(`${apiBase}/api/periods?mode=${mode}`);
        if (!res.ok) {
          throw new Error("Gagal memuat periode");
        }
        const data = (await res.json()) as number[];
        setPeriods(data);
        if (data.length > 0) {
          setSelected(data[data.length - 1]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      }
    };

    loadPeriods();
  }, [mode]);

  const searchParam = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (!selected) {
      return;
    }

    const loadPeserta = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          periode: String(selected),
          limit: "500"
        });
        if (searchParam) {
          params.set("q", searchParam);
        }
        params.set("mode", mode);
        const res = await fetch(`${apiBase}/api/peserta?${params.toString()}`);
        if (!res.ok) {
          throw new Error("Gagal memuat data peserta");
        }
        const data = (await res.json()) as { items: Peserta[] };
        setRows(data.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    };

    loadPeserta();
  }, [selected, searchParam, mode]);

  const filterOptions = useMemo(() => {
    const buildOptions = (key: ColumnKey) => {
      const values = rows
        .map((row) => formatCell(row[key]))
        .filter((value) => value !== "-");
      return Array.from(new Set(values)).sort();
    };

    return {
      fakultas: buildOptions("fakultas"),
      prodi: buildOptions("prodi"),
      program: buildOptions("program"),
      peserta_valid: buildOptions("peserta_valid"),
      jenis_kelamin: buildOptions("jenis_kelamin"),
      predikat: buildOptions("predikat")
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const checks: [string, ColumnKey][] = [
        [filters.fakultas, "fakultas"],
        [filters.prodi, "prodi"],
        [filters.program, "program"],
        [filters.peserta_valid, "peserta_valid"],
        [filters.jenis_kelamin, "jenis_kelamin"],
        [filters.predikat, "predikat"]
      ];

      return checks.every(([filterValue, key]) => {
        if (!filterValue) {
          return true;
        }
        return formatCell(row[key]) === filterValue;
      });
    });
  }, [rows, filters]);

  const sortedRows = useMemo(() => {
    const copy = [...filteredRows];
    copy.sort((a, b) => {
      const aValue = getSortValue(a[sortKey]);
      const bValue = getSortValue(b[sortKey]);

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDir === "asc" ? aValue - bValue : bValue - aValue;
      }
      const aText = String(aValue).toLowerCase();
      const bText = String(bValue).toLowerCase();
      if (aText < bText) {
        return sortDir === "asc" ? -1 : 1;
      }
      if (aText > bText) {
        return sortDir === "asc" ? 1 : -1;
      }
      return 0;
    });
    return copy;
  }, [filteredRows, sortKey, sortDir]);

  const handleSort = (key: ColumnKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  };

  const updateMode = (nextMode: "raw" | "normalized") => {
    setMode(nextMode);
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", nextMode);
    router.replace(`/?${params.toString()}`);
  };

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

  return (
    <main className="page">
      <header className="menu-bar">
        <div className="menu-left">
          <nav className="menu-nav">
            <a className="active" href={`/?mode=${mode}`}>Riwayat</a>
            <a href={`/analitik?mode=${mode}`}>Data Analitik</a>
            <a href={`/tren?mode=${mode}`}>Tren/Prediksi</a>
          </nav>
        </div>
        <div className="menu-right">
          <span className="menu-chip">Total: {sortedRows.length}</span>
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
          ) : error ? (
            <span className="pill status-pill header-status error">
              <span className="status-light error" />
            </span>
          ) : (
            <span className="pill status-pill header-status success">
              <span className="status-light stable" />
            </span>
          )}
        </div>
      </header>

      <section className="controls">
        <div className="control">
          <label>Periode</label>
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
        <div className="control wide">
          <label>Pencarian</label>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama atau NPM"
          />
        </div>
        <div className="control">
          <label>Mode Data</label>
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as "raw" | "normalized")}
          >
            <option value="raw">Raw (XLSX asli)</option>
            <option value="normalized">Normalized</option>
          </select>
        </div>
      </section>

      <section className="table-wrap">
        <div className="table-inner">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>
                    <button
                      type="button"
                      className="th-button"
                      onClick={() => handleSort(column.key)}
                    >
                      {column.label}
                      <span className="sort-indicator">
                        {sortKey === column.key ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
              <tr className="filter-row">
                {columns.map((column) => (
                  <th key={`${column.key}-filter`}>
                    {column.filterable ? (
                      <select
                        value={filters[column.key] ?? ""}
                        onChange={(event) =>
                          setFilters((prev) => ({
                            ...prev,
                            [column.key]: event.target.value
                          }))
                        }
                      >
                        <option value="">Semua</option>
                        {(filterOptions[column.key] ?? []).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={`${row.npm}-${row.periode}`}>
                  {columns.map((column) => {
                    const value = row[column.key];
                    const label = formatCell(value as string | number | boolean | null);
                    return (
                      <td key={`${row.npm}-${column.key}`} title={label}>
                        {label}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && rows.length === 0 && (
            <div className="empty">Data belum tersedia untuk periode ini.</div>
          )}
        </div>
      </section>
    </main>
  );
}
