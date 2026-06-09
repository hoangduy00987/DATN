"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useState, useRef, type ReactNode } from "react";
import ChangePasswordModal from "@/app/components/ChangePasswordModal";

const patientNavItems = [
  { href: "/chat/dat-lich", label: "Đặt lịch khám bệnh", icon: "calendar" as const },
  { href: "/chat/lich-da-dat", label: "Danh sách lịch khám", icon: "list" as const },
];

const doctorNavItems = [
  { href: "/chat", label: "AI tư vấn", icon: "sparkles" as const },
  { href: "/chat/lich-da-dat", label: "Danh sách lịch khám", icon: "list" as const },
];

const adminNavItems = [
  { href: "/chat/statistics", label: "Thống kê hệ thống", icon: "barChart" as const },
  { href: "/chat/quan-ly-nguoi-dung", label: "Quản lý người dùng", icon: "clipboard" as const },
  { href: "/chat/lich-da-dat", label: "Danh sách lịch khám", icon: "list" as const },
];

function NavIcon({ name }: { name: "calendar" | "clipboard" | "sparkles" | "list" | "fileReview" | "barChart" }) {
  if (name === "barChart") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    );
  }
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
  const router = useRouter();
  const [sessionRole, setSessionRole] = useState<string | null | undefined>(undefined);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPwdModalOpen, setIsPwdModalOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  // Đồng bộ độ rộng sidebar -> --sidebar-width (composer `left`) để tránh chồng lên sidebar.
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

  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Format any YYYY-MM-DD dates inside a notification message to dd/mm/yyyy
  const formatNotifMessage = (msg: string) =>
    msg.replace(/(\d{4})-(\d{2})-(\d{2})/g, (_: string, y: string, m: string, d: string) => `${d}/${m}/${y}`);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    }
  }, []);

  const markAsRead = async (notification: any) => {
    try {
      if (!notification.is_read) {
        await fetch(`/api/notifications/${notification.id}/read`, { method: "PATCH" });
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      if (notification.link) {
        setShowNotifications(false);
        router.push(notification.link);
      }
    } catch { }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
      fetchNotifications();
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications, fetchNotifications]);

  useEffect(() => {
    let cancelled = false;
    const checkSession = async () => {
      try {
        const r = await fetch("/api/auth/session", { cache: "no-store" });
        const d = await r.json();
        if (cancelled) return;

        const role = typeof d.role === "string" ? d.role : null;
        setSessionRole(role);

        if (role === "admin" && (pathname === "/chat" || pathname === "/chat/")) {
          window.location.href = "/chat/quan-ly-nguoi-dung";
        }

        if (role && role !== "admin") {
          const nr = await fetch("/api/notifications/unread-count", { cache: "no-store" });
          const nv = await nr.json();
          if (!cancelled) setUnreadCount(nv.unread_count || 0);
        }
      } catch (err) {
        if (!cancelled) setSessionRole(null);
      }
    };

    checkSession();

    // Polling every 20 seconds for new notifications
    const interval = setInterval(() => {
      if (sessionRole && sessionRole !== "admin") {
        fetch("/api/notifications/unread-count", { cache: "no-store" })
          .then(r => r.json())
          .then(v => setUnreadCount(v.unread_count || 0))
          .catch(() => { });
      }
    }, 20000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pathname, sessionRole]);

  const isPatient = sessionRole === "patient";
  const isAdmin = sessionRole === "admin";
  const isDoctor = sessionRole === "doctor";
  const isDoctorNav = isDoctor || isAdmin;

  const brandHref = isPatient ? "/chat/dat-lich" : isAdmin ? "/chat/quan-ly-nguoi-dung" : "/chat";
  const brandSubtitle = isPatient
    ? "Khu vực người khám bệnh"
    : isAdmin
      ? "Quản trị hệ thống"
      : "Trợ lý AI - Bác sĩ";

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
        ) : sessionRole === "admin" ? (
          adminNavItems.map((item) => {
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

        {sessionRole && !isAdmin && (
          <div className="chat-nav-divider" style={{ margin: "auto 0 10px 0", height: "1px", background: "rgba(255,255,255,0.1)" }} />
        )}

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
            <span>{logoutLoading ? "Đang đăng xuất..." : "Đăng xuất"}</span>
          </button>

          <button
            type="button"
            className="chat-sidebar-logout"
            onClick={() => setIsPwdModalOpen(true)}
            style={{ marginTop: '-4px' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
            </svg>
            <span>Đổi mật khẩu</span>
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

      <div className="chat-app-main">
        {sessionRole && !isAdmin && (
          <header className="chat-top-header">
            <div className="notification-wrapper" ref={popoverRef}>
              <button
                className={`notif-bell-btn ${showNotifications ? 'active' : ''} ${unreadCount > 0 ? 'has-notify' : ''}`}
                onClick={() => setShowNotifications(!showNotifications)}
                title="Thông báo"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>

              {showNotifications && (
                <div className="notif-popover">
                  <div className="notif-popover-header">Thông báo</div>
                  <div className="notif-popover-body">
                    {(!Array.isArray(notifications) || notifications.length === 0) ? (
                      <div className="notif-empty">Không có thông báo nào</div>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div
                          key={n.id}
                          className={`notif-item ${!n.is_read ? 'unread' : ''}`}
                          onClick={() => markAsRead(n)}
                        >
                          <div className="notif-dot"></div>
                          <div className="notif-content">
                            <div className="notif-title">{n.title}</div>
                            <div className="notif-message">{formatNotifMessage(n.message)}</div>
                            <div className="notif-time">{new Date(n.created_at).toLocaleString('vi-VN')}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </header>
        )}
        <div className="chat-content-container">
          {children}
        </div>
      </div>

      <ChangePasswordModal
        isOpen={isPwdModalOpen}
        onClose={() => setIsPwdModalOpen(false)}
      />
    </div>
  );
}
