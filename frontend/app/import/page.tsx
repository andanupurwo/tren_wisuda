"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "../../components/Sidebar";

const apiBase =
    process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") || "http://localhost:8000";

interface ColumnMatch {
    original: string;
    mapped_to: string;
}

interface AnalyzeResult {
    periode: number | null;
    filename: string;
    row_count: number;
    matched_columns: ColumnMatch[];
    unmatched_columns: string[];
    has_npm: boolean;
    preview_headers: string[];
    preview_rows: string[][];
}

interface HistoryItem {
    periode: number;
    raw_count: number;
    norm_count: number | null;
    last_updated: string | null;
}

type Stage = "idle" | "analyzing" | "analyzed" | "importing" | "done" | "error";

export default function ImportExportPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [mode, setMode] = useState<"raw" | "normalized">("raw");

    // File upload state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [stage, setStage] = useState<Stage>("idle");
    const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
    const [periodeOverride, setPeriodeOverride] = useState<string>("");
    const [importResult, setImportResult] = useState<{ inserted: number; periode: number; unmatched_columns?: string[] } | null>(null);
    const [errorMsg, setErrorMsg] = useState("");

    // History state
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [deletingPeriode, setDeletingPeriode] = useState<number | null>(null);
    const [exportingPeriode, setExportingPeriode] = useState<number | null>(null);

    // Bulk selection state
    const [selectedPeriodes, setSelectedPeriodes] = useState<number[]>([]);
    const [bulkProcessing, setBulkProcessing] = useState(false);

    useEffect(() => {
        const urlMode = searchParams.get("mode");
        if (urlMode === "raw" || urlMode === "normalized") setMode(urlMode);
    }, [searchParams]);

    const updateMode = (m: "raw" | "normalized") => {
        setMode(m);
        const p = new URLSearchParams(searchParams.toString());
        p.set("mode", m);
        router.replace(`/import?${p}`);
    };

    const loadHistory = async () => {
        setHistoryLoading(true);
        try {
            const res = await fetch(`${apiBase}/api/import/history`);
            if (res.ok) {
                const data = (await res.json()) as { items: HistoryItem[] };
                setHistory(data.items);
                setSelectedPeriodes([]); // reset selection on reload
            }
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => { loadHistory(); }, []);

    const handleFile = (f: File) => {
        if (!f.name.toLowerCase().endsWith(".xlsx")) {
            setErrorMsg("Hanya file .xlsx yang didukung.");
            setStage("error");
            return;
        }
        setFile(f);
        setStage("idle");
        setAnalysis(null);
        setImportResult(null);
        setErrorMsg("");
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
    };

    const handleAnalyze = async () => {
        if (!file) return;
        setStage("analyzing");
        setErrorMsg("");
        const form = new FormData();
        form.append("file", file);
        try {
            const res = await fetch(`${apiBase}/api/import/analyze`, { method: "POST", body: form });
            const data = await res.json();
            if (!res.ok) { setErrorMsg(data.detail || "Analisis gagal."); setStage("error"); return; }
            setAnalysis(data as AnalyzeResult);
            if (data.periode) setPeriodeOverride(String(data.periode));
            setStage("analyzed");
        } catch {
            setErrorMsg("Tidak dapat terhubung ke server."); setStage("error");
        }
    };

    const handleImport = async () => {
        if (!file) return;
        setStage("importing");
        setErrorMsg("");
        const form = new FormData();
        form.append("file", file);
        const url = new URL(`${apiBase}/api/import/upload`);
        if (periodeOverride) url.searchParams.set("periode", periodeOverride);
        try {
            const res = await fetch(url.toString(), { method: "POST", body: form });
            const data = await res.json();
            if (!res.ok) { setErrorMsg(data.detail || "Import gagal."); setStage("error"); return; }
            setImportResult(data);
            setStage("done");
            loadHistory();
        } catch {
            setErrorMsg("Tidak dapat terhubung ke server."); setStage("error");
        }
    };

    const handleExport = async (periode: number, exportMode: string) => {
        setExportingPeriode(periode);
        try {
            const url = `${apiBase}/api/export/${periode}?mode=${exportMode}`;
            const res = await fetch(url);
            if (!res.ok) { alert("Export gagal."); return; }
            const blob = await res.blob();
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `wisuda_periode_${periode}_${exportMode}.csv`;
            a.click();
        } finally {
            setExportingPeriode(null);
        }
    };

    const handleDelete = async (periode: number) => {
        if (!confirm(`Hapus semua data Periode ${periode}? Tindakan ini tidak dapat dibatalkan.`)) return;
        setDeletingPeriode(periode);
        try {
            const res = await fetch(`${apiBase}/api/periode/${periode}`, { method: "DELETE" });
            if (res.ok) { loadHistory(); }
            else { alert("Gagal menghapus periode."); }
        } finally {
            setDeletingPeriode(null);
        }
    };

    const reset = () => {
        setFile(null); setStage("idle"); setAnalysis(null);
        setImportResult(null); setErrorMsg(""); setPeriodeOverride("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // ── Bulk Actions ──

    const toggleSelect = (p: number) => {
        setSelectedPeriodes(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
    };

    const toggleSelectAll = () => {
        if (selectedPeriodes.length === history.length) setSelectedPeriodes([]);
        else setSelectedPeriodes(history.map(h => h.periode));
    };

    const handleBulkExport = async () => {
        if (selectedPeriodes.length === 0) return;
        setBulkProcessing(true);
        try {
            const periodesStr = selectedPeriodes.join(",");
            const url = `${apiBase}/api/export/bulk?periodes=${periodesStr}&mode=${mode}`;
            const res = await fetch(url);
            if (!res.ok) { alert("Export gagal."); return; }
            const blob = await res.blob();
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `wisuda_bulk_export_${mode}.zip`;
            a.click();
        } finally {
            setBulkProcessing(false);
            setSelectedPeriodes([]); // clear selection after action
        }
    };

    const handleBulkDelete = async () => {
        if (selectedPeriodes.length === 0) return;
        if (!confirm(`Yakin hapus ${selectedPeriodes.length} periode terpilih? PERMANEN!`)) return;

        setBulkProcessing(true);
        try {
            // Parallel delete requests
            await Promise.all(
                selectedPeriodes.map(p => fetch(`${apiBase}/api/periode/${p}`, { method: "DELETE" }))
            );
            loadHistory();
        } catch {
            alert("Sebagian penghapusan gagal.");
        } finally {
            setBulkProcessing(false);
            setSelectedPeriodes([]);
        }
    };

    return (
        <div className="app-shell">
            <Sidebar mode={mode} onModeChange={updateMode} />

            <div className="main-area">
                <div className="topbar">
                    <div className="topbar-left">
                        <span className="topbar-title">Import &amp; Export</span>
                        <span className="topbar-sep">/</span>
                        <span className="topbar-sub">Kelola Data Periode</span>
                    </div>
                    <div className="topbar-right">
                        <span className="status-dot ok">{history.length} periode tersimpan</span>
                    </div>
                </div>

                <div className="page-content">
                    <div className="import-export-grid fade-up d1">

                        {/* ── LEFT: Import ── */}
                        <div className="panel">
                            <div className="panel-head">
                                <span className="panel-head-title">📥 Import Data XLSX</span>
                                <span className="panel-head-sub">Smart column mapping otomatis</span>
                            </div>
                            <div className="panel-body">

                                {/* Drop Zone */}
                                {stage === "idle" || stage === "error" ? (
                                    <>
                                        <div
                                            className={`drop-zone ${dragOver ? "drag-active" : ""} ${file ? "has-file" : ""}`}
                                            onClick={() => fileInputRef.current?.click()}
                                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                            onDragLeave={() => setDragOver(false)}
                                            onDrop={handleDrop}
                                        >
                                            <div className="drop-icon">{file ? "📄" : "📂"}</div>
                                            <div className="drop-title">
                                                {file ? file.name : "Seret file ke sini atau klik untuk pilih"}
                                            </div>
                                            <div className="drop-sub">
                                                {file
                                                    ? `${(file.size / 1024).toFixed(1)} KB — Siap dianalisis`
                                                    : "Format: Peserta Wisuda Periode XX *.xlsx"}
                                            </div>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".xlsx"
                                                style={{ display: "none" }}
                                                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
                                            />
                                        </div>
                                        {stage === "error" && (
                                            <div className="import-error">{errorMsg}</div>
                                        )}
                                        {file && (
                                            <button className="btn btn-primary" style={{ width: "100%", marginTop: 12 }} onClick={handleAnalyze}>
                                                🔍 Analisis File
                                            </button>
                                        )}
                                    </>
                                ) : stage === "analyzing" ? (
                                    <div className="import-loading">
                                        <div className="spinner" />
                                        <span>Membaca struktur file...</span>
                                    </div>
                                ) : stage === "analyzed" && analysis ? (
                                    <div className="analyze-result">
                                        {/* Status badges */}
                                        <div className="analyze-badges">
                                            <span className={`badge ${analysis.has_npm ? "green" : "red"}`}>
                                                {analysis.has_npm ? "✓ Kolom NPM ditemukan" : "✗ NPM tidak ditemukan!"}
                                            </span>
                                            <span className="badge blue">{analysis.row_count} baris data</span>
                                            <span className="badge">{analysis.matched_columns.length} kolom terdeteksi</span>
                                        </div>

                                        {/* Periode override */}
                                        <div className="input-row" style={{ marginTop: 16 }}>
                                            <label>Nomor Periode</label>
                                            <input
                                                type="number"
                                                value={periodeOverride}
                                                onChange={(e) => setPeriodeOverride(e.target.value)}
                                                placeholder={analysis.periode ? String(analysis.periode) : "Masukkan nomor periode"}
                                            />
                                        </div>
                                        {!analysis.periode && (
                                            <div className="import-warn">⚠ Periode tidak terdeteksi dari nama file. Masukkan secara manual.</div>
                                        )}

                                        {/* Column mapping preview */}
                                        <div style={{ marginTop: 16 }}>
                                            <div className="mapping-header">
                                                <span>Kolom XLSX</span>
                                                <span>→</span>
                                                <span>Kolom Database</span>
                                            </div>
                                            <div className="mapping-list">
                                                {analysis.matched_columns.map((c, i) => (
                                                    <div key={i} className="mapping-row ok">
                                                        <span className="mono text-xs">{c.original}</span>
                                                        <span className="mapping-arrow">→</span>
                                                        <span className="mono text-xs" style={{ color: "var(--accent2)" }}>{c.mapped_to}</span>
                                                    </div>
                                                ))}
                                                {analysis.unmatched_columns.map((c, i) => (
                                                    <div key={i} className="mapping-row warn">
                                                        <span className="mono text-xs">{c}</span>
                                                        <span className="mapping-arrow">→</span>
                                                        <span className="text-xs" style={{ color: "var(--yellow)" }}>dilewati</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Preview table */}
                                        {analysis.preview_rows.length > 0 && (
                                            <div style={{ marginTop: 16 }}>
                                                <div className="ctrl-label" style={{ marginBottom: 6 }}>Preview Data (5 baris pertama)</div>
                                                <div className="preview-table-wrap">
                                                    <table className="preview-table">
                                                        <thead>
                                                            <tr>{analysis.preview_headers.map((h, i) => <th key={i}>{h || `Col ${i + 1}`}</th>)}</tr>
                                                        </thead>
                                                        <tbody>
                                                            {analysis.preview_rows.map((row, ri) => (
                                                                <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell || "—"}</td>)}</tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="import-actions">
                                            <button className="btn btn-ghost" onClick={reset}>← Ganti File</button>
                                            <button
                                                className="btn btn-primary"
                                                disabled={!analysis.has_npm || (!periodeOverride && !analysis.periode)}
                                                onClick={handleImport}
                                            >
                                                ⬆ Import ke Database
                                            </button>
                                        </div>
                                    </div>

                                ) : stage === "importing" ? (
                                    <div className="import-loading">
                                        <div className="spinner" />
                                        <span>Menyimpan data ke database...</span>
                                    </div>
                                ) : stage === "done" && importResult ? (
                                    <div className="import-success">
                                        <div className="success-icon">✅</div>
                                        <div className="success-title">Import Berhasil!</div>
                                        <div className="success-detail">
                                            <strong>{importResult.inserted}</strong> baris disimpan ke Periode <strong>{importResult.periode}</strong>
                                        </div>
                                        {importResult.unmatched_columns && importResult.unmatched_columns.length > 0 && (
                                            <div className="import-warn" style={{ marginTop: 8 }}>
                                                Kolom dilewati: {importResult.unmatched_columns.join(", ")}
                                            </div>
                                        )}
                                        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={reset}>
                                            Import File Lain
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        {/* ── RIGHT: History & Export ── */}
                        <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
                            <div className="panel-head">
                                <span className="panel-head-title">📋 Riwayat Periode</span>
                                <span className="panel-head-sub">{history.length} periode di database</span>
                            </div>
                            <div className="panel-body" style={{ padding: 0, flex: 1, position: "relative" }}>
                                {historyLoading ? (
                                    <div style={{ padding: "20px 16px" }}>
                                        {Array.from({ length: 6 }).map((_, i) => (
                                            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                                                <div className="skeleton-cell" style={{ flex: 1, height: 18 }} />
                                                <div className="skeleton-cell" style={{ width: 60, height: 18 }} />
                                                <div className="skeleton-cell" style={{ width: 60, height: 18 }} />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <>
                                        <div className="history-table-wrap">
                                            <table className="history-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: 40 }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={history.length > 0 && selectedPeriodes.length === history.length}
                                                                onChange={toggleSelectAll}
                                                                style={{ cursor: "pointer" }}
                                                            />
                                                        </th>
                                                        <th>Periode</th>
                                                        <th>Raw</th>
                                                        <th>Norm</th>
                                                        <th>Update</th>
                                                        <th>Aksi</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {history.map((item) => (
                                                        <tr key={item.periode} className={selectedPeriodes.includes(item.periode) ? "selected-row" : ""}>
                                                            <td>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedPeriodes.includes(item.periode)}
                                                                    onChange={() => toggleSelect(item.periode)}
                                                                    style={{ cursor: "pointer" }}
                                                                />
                                                            </td>
                                                            <td onClick={() => toggleSelect(item.periode)} style={{ cursor: "pointer" }}>
                                                                <span className="mono" style={{ color: "var(--accent)", fontWeight: 600 }}>P{item.periode}</span>
                                                            </td>
                                                            <td><span className="mono">{item.raw_count}</span></td>
                                                            <td><span className="mono">{item.norm_count ?? "—"}</span></td>
                                                            <td className="text-xs text-muted">
                                                                {item.last_updated
                                                                    ? new Date(item.last_updated).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" })
                                                                    : "—"}
                                                            </td>
                                                            <td>
                                                                <div style={{ display: "flex", gap: 6 }}>
                                                                    <button
                                                                        className="btn-icon"
                                                                        title="Export CSV (raw)"
                                                                        disabled={exportingPeriode === item.periode}
                                                                        onClick={() => handleExport(item.periode, "raw")}
                                                                    >
                                                                        {exportingPeriode === item.periode ? "…" : "⬇"}
                                                                    </button>
                                                                    <button
                                                                        className="btn-icon btn-icon-del"
                                                                        title="Hapus periode"
                                                                        disabled={deletingPeriode === item.periode}
                                                                        onClick={() => handleDelete(item.periode)}
                                                                    >
                                                                        {deletingPeriode === item.periode ? "…" : "🗑"}
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Floating Bulk Action Bar */}
                                        {selectedPeriodes.length > 0 && (
                                            <div className="bulk-actions-bar fade-up">
                                                <div className="bulk-info">
                                                    <span className="bulk-count">{selectedPeriodes.length}</span>
                                                    <span>dipilih</span>
                                                </div>
                                                <div className="bulk-ctrls">
                                                    <button
                                                        className="btn btn-ghost"
                                                        onClick={() => setSelectedPeriodes([])}
                                                        disabled={bulkProcessing}
                                                        style={{ height: 32, fontSize: 12, padding: "0 12px" }}
                                                    >
                                                        Batal
                                                    </button>
                                                    <button
                                                        className="btn btn-primary"
                                                        onClick={handleBulkExport}
                                                        disabled={bulkProcessing}
                                                        style={{ height: 32, fontSize: 12, padding: "0 12px" }}
                                                    >
                                                        {bulkProcessing ? "..." : "⬇ ZIP"}
                                                    </button>
                                                    <button
                                                        className="btn btn-ghost"
                                                        onClick={handleBulkDelete}
                                                        disabled={bulkProcessing}
                                                        style={{ height: 32, fontSize: 12, padding: "0 12px", color: "var(--red)", borderColor: "var(--red)" }}
                                                    >
                                                        🗑 Hapus
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Info card */}
                    {history.length === 0 && (
                        <div className="panel fade-up d2">
                            <div className="panel-head">
                                <span className="panel-head-title">💡 Cara Import Data Baru</span>
                            </div>
                            <div className="panel-body">
                                <div className="info-steps">
                                    <div className="info-step">
                                        <div className="step-num">1</div>
                                        <div>
                                            <div className="step-title">Siapkan file XLSX</div>
                                            <div className="step-desc">Format sama dengan file wisuda sebelumnya. Nama file idealnya mengandung "Periode XX" untuk deteksi otomatis.</div>
                                        </div>
                                    </div>
                                    <div className="info-step">
                                        <div className="step-num">2</div>
                                        <div>
                                            <div className="step-title">Analisis otomatis 🧠</div>
                                            <div className="step-desc">Sistem mendeteksi kolom secara cerdas.</div>
                                        </div>
                                    </div>
                                    <div className="info-step">
                                        <div className="step-num">3</div>
                                        <div>
                                            <div className="step-title">Import!</div>
                                            <div className="step-desc">Data tersimpan ke database.</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
