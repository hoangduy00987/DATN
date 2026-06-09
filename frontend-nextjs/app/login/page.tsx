"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, FormEvent, useEffect } from "react";

const ACCESS_NOTICE: Record<"patient" | "forbidden" | "reauth", string> = {
    patient:
        "Tài khoản của bạn không có quyền vào khu vực này. Vui lòng dùng đúng loại tài khoản hoặc liên hệ quản trị.",
    forbidden: "Tài khoản của bạn không có quyền vào trang chat.",
    reauth: "Phiên đăng nhập cần làm mới. Vui lòng đăng xuất rồi đăng nhập lại.",
};

interface Review {
    id: string;
    doctor_name: string;
    patient_name: string;
    rating: number;
    comment: string;
    created_at: string;
    avatar: string;
}

export default function LoginPage() {
    const [activeTab, setActiveTab] = useState<"login" | "signup">("login");

    // Login state
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [loginLoading, setLoginLoading] = useState(false);

    // Signup state
    const [signupEmail, setSignupEmail] = useState("");
    const [signupPassword, setSignupPassword] = useState("");
    const [signupConfirm, setSignupConfirm] = useState("");
    const [signupError, setSignupError] = useState("");
    const [signupSuccess, setSignupSuccess] = useState("");
    const [signupLoading, setSignupLoading] = useState(false);

    const [mounted, setMounted] = useState(false);
    const [accessNotice, setAccessNotice] = useState<"patient" | "forbidden" | "reauth" | null>(null);

    const [reviews, setReviews] = useState<Review[]>([]);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        const q = new URLSearchParams(window.location.search);
        const r = q.get("reason");
        if (r === "patient" || r === "forbidden" || r === "reauth") setAccessNotice(r as any);

        const fetchReviews = async () => {
            try {
                const res = await fetch("http://localhost:8000/api/v1/reviews/public");
                if (res.ok) {
                    const data = await res.json();
                    setReviews(data);
                }
            } catch (err) { }
        };
        fetchReviews();
    }, []);

    // Reset forms when switching tabs
    useEffect(() => {
        setLoginEmail("");
        setLoginPassword("");
        setLoginError("");
        setSignupEmail("");
        setSignupPassword("");
        setSignupConfirm("");
        setSignupError("");
        setSignupSuccess("");
    }, [activeTab]);

    const handleLogout = async () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user_role");
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
    };

    if (!mounted) return null;

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setLoginLoading(true);
        setLoginError("");

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: loginEmail, password: loginPassword }),
            });

            const data = await res.json();
            if (!res.ok) {
                setLoginError(data?.detail || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
                return;
            }

            // Save to localStorage for components that need it
            if (data.access_token) {
                localStorage.setItem("access_token", data.access_token);
                localStorage.setItem("refresh_token", data.refresh_token);
                localStorage.setItem("user_role", data.role);
            }

            // Full reload: cookie từ response login được gửi kèm request tới `/` và middleware chạy ổn định hơn so with router.push.
            window.location.replace("/");
        } catch {
            setLoginError("Lỗi kết nối khi đăng nhập.");
        } finally {
            setLoginLoading(false);
        }
    };

    const handleSignup = async (e: FormEvent) => {
        e.preventDefault();
        setSignupError("");
        setSignupSuccess("");

        if (signupPassword !== signupConfirm) {
            setSignupError("Mật khẩu xác nhận không khớp.");
            return;
        }

        // Password complexity check
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
        if (!passwordRegex.test(signupPassword)) {
            setSignupError(
                "Mật khẩu phải có ít nhất 8 ký tự, bao gồm: 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt (@$!%*?&#)."
            );
            return;
        }

        setSignupLoading(true);
        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: signupEmail, password: signupPassword }),
            });

            const data = await res.json();
            if (!res.ok) {
                setSignupError(data?.detail || "Đăng ký thất bại.");
            } else {
                setSignupSuccess("Đăng ký thành công! Đang tự động đăng nhập...");

                // Auto-login after registration
                try {
                    const loginRes = await fetch("/api/auth/login", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: signupEmail, password: signupPassword }),
                    });
                    if (loginRes.ok) {
                        const loginData = await loginRes.json();
                        if (loginData.access_token) {
                            localStorage.setItem("access_token", loginData.access_token);
                            localStorage.setItem("refresh_token", loginData.refresh_token ?? "");
                            localStorage.setItem("user_role", loginData.role ?? "");
                        }
                        window.location.replace("/");
                    } else {
                        setSignupSuccess("Đăng ký thành công! Vui lòng chuyển sang tab đăng nhập.");
                        setTimeout(() => setActiveTab("login"), 1500);
                    }
                } catch {
                    setSignupSuccess("Đăng ký thành công! Vui lòng chuyển sang tab đăng nhập.");
                    setTimeout(() => setActiveTab("login"), 1500);
                }
            }
        } catch {
            setSignupError("Lỗi kết nối khi đăng ký.");
        } finally {
            setSignupLoading(false);
        }
    };

    const isLogin = activeTab === "login";

    return (
        <div className="login-shell">
            <div className="page-root">
                <section className="login-hero" aria-labelledby="login-slogan-heading">
                    <div className="login-hero-brand">
                        <Link href="/" className="login-logo-link">
                            <Image
                                src="/logo.png"
                                alt="LungCare"
                                width={640}
                                height={640}
                                priority
                                sizes="(max-width: 900px) 92vw, 560px"
                                className="login-logo-img"
                            />
                        </Link>
                        <div className="login-slogan">
                            <h1 id="login-slogan-heading" className="login-slogan-title">
                                <span className="login-slogan-brand">LungCare</span>
                                <span className="login-slogan-sep"> — </span>
                                <span className="login-slogan-lead">Đồng hành cùng sức khỏe phổi của bạn</span>
                            </h1>
                        </div>
                    </div>
                </section>
                <div className="login-form-area">
                    <div className="wrapper">
                        {accessNotice && (
                            <div className="alert warning" style={{ marginBottom: 16 }}>
                                {ACCESS_NOTICE[accessNotice]}
                                <div className="notice-actions">
                                    <button type="button" onClick={handleLogout}>
                                        Đăng xuất
                                    </button>
                                </div>
                            </div>
                        )}
                        {/* Title */}
                        <div className="title-text">
                            <div
                                className="title"
                                style={{ marginLeft: isLogin ? "0%" : "-50%" }}
                            >
                                Đăng nhập
                            </div>
                            <div className="title">Đăng ký</div>
                        </div>

                        <div className="form-container">
                            {/* Tab controls */}
                            <div className="slide-controls">
                                <div
                                    className={`slider-tab${isLogin ? "" : " signup"}`}
                                />
                                <button
                                    className={`slide-btn${isLogin ? " active" : ""}`}
                                    onClick={() => setActiveTab("login")}
                                >
                                    Đăng nhập
                                </button>
                                <button
                                    className={`slide-btn${!isLogin ? " active" : ""}`}
                                    onClick={() => setActiveTab("signup")}
                                >
                                    Đăng ký
                                </button>
                            </div>

                            {/* Forms */}
                            <div className="form-inner">
                                {/* ── LOGIN ── */}
                                <form
                                    onSubmit={handleLogin}
                                    style={{ marginLeft: isLogin ? "0%" : "-50%" }}
                                >
                                    <div className="field">
                                        <input
                                            type="email"
                                            placeholder="Tên đăng nhập (Email)"
                                            value={loginEmail}
                                            onChange={e => setLoginEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="field">
                                        <input
                                            type="password"
                                            placeholder="Mật khẩu"
                                            value={loginPassword}
                                            onChange={e => setLoginPassword(e.target.value)}
                                            required
                                        />
                                    </div>

                                    {loginError && (
                                        <div className="alert error">{loginError}</div>
                                    )}

                                    <div className="pass-link">
                                        <Link href="/forgot-password">Quên mật khẩu?</Link>
                                    </div>

                                    <div className="btn-field">
                                        <div className="btn-layer" />
                                        <button type="submit" disabled={loginLoading}>
                                            {loginLoading ? "Đang xử lý..." : "Đăng nhập"}
                                        </button>
                                    </div>

                                    <div className="signup-link">
                                        Chưa có tài khoản?{" "}
                                        <a onClick={() => setActiveTab("signup")}>Đăng ký ngay</a>
                                    </div>
                                </form>

                                {/* ── SIGNUP ── */}
                                <form onSubmit={handleSignup}>
                                    <div className="field">
                                        <input
                                            type="email"
                                            placeholder="Tên đăng nhập (Email)"
                                            value={signupEmail}
                                            onChange={e => setSignupEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="field">
                                        <input
                                            type="password"
                                            placeholder="Mật khẩu"
                                            value={signupPassword}
                                            onChange={e => setSignupPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="field">
                                        <input
                                            type="password"
                                            placeholder="Xác nhận mật khẩu"
                                            value={signupConfirm}
                                            onChange={e => setSignupConfirm(e.target.value)}
                                            required
                                        />
                                    </div>

                                    {signupError && (
                                        <div className="alert error">{signupError}</div>
                                    )}
                                    {signupSuccess && (
                                        <div className="alert success">{signupSuccess}</div>
                                    )}

                                    <div className="btn-field">
                                        <div className="btn-layer" />
                                        <button type="submit" disabled={signupLoading}>
                                            {signupLoading ? "Đang xử lý..." : "Đăng ký"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reviews Section */}
            <section className="reviews-section">
                <div className="reviews-container">
                    <div className="reviews-header">
                        <h2>Đánh giá từ bệnh nhân</h2>
                        <p>Những bệnh nhân đã tin tưởng và hài lòng với chất lượng dịch vụ của LungCare</p>
                    </div>
                    <div className="reviews-grid">
                        {reviews.length > 0 ? (
                            reviews.map(rev => (
                                <div key={rev.id} className="review-card">
                                    <div className="review-doctor-info">
                                        <span className="review-avatar">{rev.avatar}</span>
                                        <div>
                                            <h3 className="doctor-name">{rev.doctor_name}</h3>
                                        </div>
                                    </div>
                                    <div className="review-stars">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <span key={i} className={i < rev.rating ? "star filled" : "star"}>★</span>
                                        ))}
                                    </div>
                                    <p className="review-comment">"{rev.comment}"</p>
                                    <div className="review-footer">
                                        <span className="patient-name">{rev.patient_name}</span>
                                        <span className="review-date">{new Date(rev.created_at).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-reviews">Chưa có đánh giá nào.</div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
