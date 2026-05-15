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

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        const q = new URLSearchParams(window.location.search);
        const r = q.get("reason");
        if (r === "patient" || r === "forbidden" || r === "reauth") setAccessNotice(r);
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
                            Login Form
                        </div>
                        <div className="title">Signup Form</div>
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
                                Login
                            </button>
                            <button
                                className={`slide-btn${!isLogin ? " active" : ""}`}
                                onClick={() => setActiveTab("signup")}
                            >
                                Signup
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
                                        placeholder="Email Address"
                                        value={loginEmail}
                                        onChange={e => setLoginEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="field">
                                    <input
                                        type="password"
                                        placeholder="Password"
                                        value={loginPassword}
                                        onChange={e => setLoginPassword(e.target.value)}
                                        required
                                    />
                                </div>

                                {loginError && (
                                    <div className="alert error">{loginError}</div>
                                )}

                                <div className="pass-link">
                                    <a href="#">Forgot password?</a>
                                </div>

                                <div className="btn-field">
                                    <div className="btn-layer" />
                                    <button type="submit" disabled={loginLoading}>
                                        {loginLoading ? "Đang xử lý..." : "Login"}
                                    </button>
                                </div>

                                <div className="signup-link">
                                    Not a member?{" "}
                                    <a onClick={() => setActiveTab("signup")}>Signup now</a>
                                </div>
                            </form>

                            {/* ── SIGNUP ── */}
                            <form onSubmit={handleSignup}>
                                <div className="field">
                                    <input
                                        type="email"
                                        placeholder="Email Address"
                                        value={signupEmail}
                                        onChange={e => setSignupEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="field">
                                    <input
                                        type="password"
                                        placeholder="Password"
                                        value={signupPassword}
                                        onChange={e => setSignupPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="field">
                                    <input
                                        type="password"
                                        placeholder="Confirm password"
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
                                        {signupLoading ? "Đang xử lý..." : "Signup"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                </div>
            </div>
        </div>
    );
}
