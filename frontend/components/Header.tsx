"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface HeaderProps {
    total?: number;
    period?: number | string;
    loading?: boolean;
    error?: string | null;
    mode: "raw" | "normalized";
    onModeChange: (mode: "raw" | "normalized") => void;
    customRight?: React.ReactNode;
}

export default function Header({
    total,
    period,
    loading,
    error,
    mode,
    onModeChange,
    customRight
}: HeaderProps) {
    const pathname = usePathname();
    // We use pathname to determines active state

    const getLinkClass = (path: string) => {
        return pathname === path ? "nav-link active" : "nav-link";
    };

    return (
        <header className="modern-header">
            <div className="header-left">
                <div className="logo-container">
                    <div className="logo-icon">🎓</div>
                    <div className="app-title">
                        Tren Wisuda
                        <span>Dashboard</span>
                    </div>
                </div>

                <nav className="modern-nav">
                    <a href={`/?mode=${mode}`} className={getLinkClass("/")}>
                        Riwayat
                    </a>
                    <a href={`/analitik?mode=${mode}`} className={getLinkClass("/analitik")}>
                        Analitik
                    </a>
                    <a href={`/tren?mode=${mode}`} className={getLinkClass("/tren")}>
                        Prediksi
                    </a>
                </nav>
            </div>

            <div className="header-right">
                {period && (
                    <div className="stat-group">
                        <span className="stat-label">Periode</span>
                        {period}
                    </div>
                )}

                {total !== undefined && (
                    <div className="stat-group">
                        <span className="stat-label">Total</span>
                        {total}
                    </div>
                )}

                {customRight}

                <div className="mode-toggle">
                    <button
                        type="button"
                        className={`mode-btn ${mode === "raw" ? "active" : ""}`}
                        onClick={() => onModeChange("raw")}
                    >
                        Raw
                    </button>
                    <button
                        type="button"
                        className={`mode-btn ${mode === "normalized" ? "active" : ""}`}
                        onClick={() => onModeChange("normalized")}
                    >
                        Norm
                    </button>
                </div>

                <div className={`status-indicator ${loading ? "processing" : error ? "error" : "success"}`} title={loading ? "Loading..." : error ? "Error" : "Connected"} />
            </div>
        </header>
    );
}
