"use client";

import { usePathname } from "next/navigation";

interface SidebarProps {
    mode: "raw" | "normalized";
    onModeChange: (m: "raw" | "normalized") => void;
    loading?: boolean;
    error?: string | null;
}

export default function Sidebar({ mode, onModeChange, loading, error }: SidebarProps) {
    const pathname = usePathname();
    const navItems = [
        { href: "/", icon: "📋", label: "Riwayat", exact: true },
        { href: "/analitik", icon: "📊", label: "Analitik" },
        { href: "/tren", icon: "📈", label: "Tren & Prediksi" },
        { href: "/import", icon: "📥", label: "Import & Export" },
    ];

    const isActive = (href: string, exact?: boolean) =>
        exact ? pathname === href : pathname.startsWith(href);

    return (
        <aside className="sidebar">
            {/* Brand header — status dot di kanan judul */}
            <div className="sidebar-brand">
                <div className="brand-icon">🎓</div>
                <div className="brand-text">
                    <div className="brand-title">WisudaDB</div>
                    <div className="brand-sub">Dashboard</div>
                </div>
                <span
                    className={`brand-status-dot ${loading ? "loading" : error ? "error" : "ok"}`}
                    title={loading ? "Memuat..." : error ? `Gagal: ${error}` : "Terhubung ke server"}
                />
            </div>

            <nav className="sidebar-nav">
                <div className="nav-section-label">Menu</div>
                {navItems.map((item) => (
                    <a
                        key={item.href}
                        href={`${item.href}?mode=${mode}`}
                        className={`nav-item ${isActive(item.href, item.exact) ? "active" : ""}`}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {item.label}
                    </a>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-footer-label">Mode Data</div>
                <div className="mode-switch">
                    <button
                        className={`mode-switch-btn ${mode === "raw" ? "active" : ""}`}
                        onClick={() => onModeChange("raw")}
                    >
                        Raw
                    </button>
                    <button
                        className={`mode-switch-btn ${mode === "normalized" ? "active" : ""}`}
                        onClick={() => onModeChange("normalized")}
                    >
                        Normalized
                    </button>
                </div>
            </div>
        </aside>
    );
}
