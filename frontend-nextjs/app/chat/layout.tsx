"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useState, useRef, type ReactNode } from "react";

const patientNavItems = [
  { href: "/chat/dat-lich", label: "Đặt lịch khám bệnh", icon: "calendar" as const },
  { href: "/chat/lich-da-dat", label: "Danh sách lịch khám", icon: "list" as const },
  { href: "/chat/ket-qua", label: "Kết quả khám bệnh", icon: "clipboard" as const },
];

const doctorNavItems = [
  { href: "/chat", label: "AI tư vấn", icon: "sparkles" as const },
  { href: "/chat/lich-kham", label: "Danh sách lịch khám", icon: "list" as const },
];

function NavIcon({ name }: { name: "calendar" | "clipboard" | "sparkles" | "list" | "fileReview" }) {
  if (name === "calendar") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    );
  }
  if (name === "clipboard") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        <path d="M9 14h6M9 18h6M9 10h2" />
      </svg>
    );
  }
  if (name === "sparkles") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    );
  }
  if (name === "list") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="m9 15 2 2 4-4" />
    </svg>
  );
}

export default function ChatLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sessionRole, setSessionRole] = useState<string | null | undefined>(undefined);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  // Đồng bộ độ rộng sidebar → --sidebar-width (composer `left`) — tránh chồng lên sidebar
  useLayoutEffect(() => {
    const el = sidebarRef.current;
    if (typeof window === "undefined" || !el) return;

    const apply = () => {
      const width = el.getBoundingClientRect().width;
      if (window.innerWidth > 768) {
        document.documentElement.style.setProperty("--sidebar-width", `${Math.round(width)}px`);
      } else {
        document.documentElement.style.setProperty("--sidebar-width", "0px");
      }
    };

    apply();

    const observer = new ResizeObserver(() => {
      apply();
    });
    observer.observe(el);
    window.addEventListener("resize", apply);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, [isCollapsed]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { role?: string | null }) => {
        if (!cancelled) setSessionRole(typeof d.role === "string" ? d.role : null);
      })
      .catch(() => {
        if (!cancelled) setSessionRole(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isPatient = sessionRole === "patient";
  const isDoctorNav = sessionRole === "doctor" || sessionRole === "admin";
  const brandHref = isPatient ? "/chat/dat-lich" : "/chat";
  const brandSubtitle = isPatient ? "Khu vực người khám bệnh" : "Trợ lý AI — Bác sĩ";

  const handleLogout = useCallback(async () => {
    setLogoutLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch {
      setLogoutLoading(false);
    }
  }, []);

  return (
    <div className="chat-app-shell">
      <aside
        ref={sidebarRef}
        className={`chat-sidebar${isCollapsed ? " collapsed" : ""}`}
        aria-label="Menu điều hướng"
      >
        <div className="chat-sidebar-brand">
          <Link href={brandHref}>
            <Image
              src="/logo.png"
              alt="LungCare"
              width={512}
              height={512}
              priority
              sizes="220px"
              className="chat-sidebar-logo"
            />
            <p>{brandSubtitle}</p>
          </Link>
        </div>

        {sessionRole === undefined ? (
          <div className="chat-nav-skeleton" aria-hidden>
            <span className="sk-line" />
            <span className="sk-line" />
          </div>
        ) : isPatient ? (
          patientNavItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={`chat-nav-link${active ? " active" : ""}`}>
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })
        ) : isDoctorNav ? (
          doctorNavItems.map((item) => {
            const active =
              item.href === "/chat"
                ? pathname === "/chat" || pathname === "/chat/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={`chat-nav-link${active ? " active" : ""}`}>
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })
        ) : null}

        <div className="chat-sidebar-footer">
          <button
            type="button"
            className="chat-sidebar-logout"
            onClick={handleLogout}
            disabled={logoutLoading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>{logoutLoading ? "Đang đăng xuất…" : "Đăng xuất"}</span>
          </button>

          <button
            type="button"
            className="chat-sidebar-toggle"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          >
            {isCollapsed ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M15 3v18" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
              </svg>
            )}
            <span>{isCollapsed ? "Mở rộng" : "Thu gọn"}</span>
          </button>
        </div>
      </aside>

      <div className="chat-app-main">{children}</div>
    </div>
  );
}
