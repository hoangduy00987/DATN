"use client";

import { useState, FormEvent, useEffect } from "react";

const ACCESS_NOTICE: Record<"patient" | "forbidden" | "reauth", string> = {
    patient:
        "Bạn đã đăng nhập với tư cách người khám bệnh. Khu vực chat AI chỉ dành cho bác sĩ.",
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

    const handleLogout = async () => {
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

            if (!res.ok) {
                const data = await res.json();
                setLoginError(data?.detail || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
                return;
            }

            // Full reload: cookie từ response login được gửi kèm request tới `/` và middleware chạy ổn định hơn so với router.push.
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
                setSignupSuccess("Đăng ký thành công! Bạn có thể đăng nhập.");
                setSignupEmail("");
                setSignupPassword("");
                setSignupConfirm("");
                setTimeout(() => setActiveTab("login"), 1500);
            }
        } catch {
            setSignupError("Lỗi kết nối khi đăng ký.");
        } finally {
            setSignupLoading(false);
        }
    };

    const isLogin = activeTab === "login";

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

                *, *::before, *::after {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    font-family: 'Poppins', sans-serif;
                }

                .page-root {
                    display: grid;
                    min-height: 100vh;
                    width: 100%;
                    place-items: center;
                    background: linear-gradient(to right, #003366, #004080, #0059b3, #0073e6);
                }

                ::selection {
                    background: #1a75ff;
                    color: #fff;
                }

                .wrapper {
                    overflow: hidden;
                    max-width: 390px;
                    width: 90%;
                    background: #fff;
                    padding: 30px;
                    border-radius: 15px;
                    box-shadow: 0px 15px 20px rgba(0,0,0,0.1);
                }

                .title-text {
                    display: flex;
                    width: 200%;
                    overflow: hidden;
                }

                .title {
                    width: 50%;
                    font-size: 35px;
                    font-weight: 600;
                    text-align: center;
                    transition: margin 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                }

                .slide-controls {
                    position: relative;
                    display: flex;
                    height: 50px;
                    width: 100%;
                    overflow: hidden;
                    margin: 30px 0 10px 0;
                    justify-content: space-between;
                    border: 1px solid lightgrey;
                    border-radius: 15px;
                }

                .slide-btn {
                    height: 100%;
                    width: 100%;
                    color: #000;
                    font-size: 18px;
                    font-weight: 500;
                    text-align: center;
                    line-height: 48px;
                    cursor: pointer;
                    z-index: 1;
                    transition: color 0.6s ease;
                    border: none;
                    background: transparent;
                    font-family: 'Poppins', sans-serif;
                }

                .slide-btn.active {
                    color: #fff;
                    cursor: default;
                    user-select: none;
                }

                .slider-tab {
                    position: absolute;
                    height: 100%;
                    width: 50%;
                    left: 0;
                    z-index: 0;
                    border-radius: 15px;
                    background: linear-gradient(to right, #003366, #004080, #0059b3, #0073e6);
                    transition: left 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                }

                .slider-tab.signup {
                    left: 50%;
                }

                .form-container {
                    width: 100%;
                    overflow: hidden;
                }

                .form-inner {
                    display: flex;
                    width: 200%;
                    transition: margin 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                }

                .form-inner form {
                    width: 50%;
                }

                .field {
                    height: 50px;
                    width: 100%;
                    margin-top: 20px;
                }

                .field input {
                    height: 100%;
                    width: 100%;
                    outline: none;
                    padding-left: 15px;
                    border-radius: 15px;
                    border: 1px solid lightgrey;
                    border-bottom-width: 2px;
                    font-size: 17px;
                    transition: all 0.3s ease;
                    font-family: 'Poppins', sans-serif;
                }

                .field input:focus {
                    border-color: #1a75ff;
                }

                .field input::placeholder {
                    color: #999;
                    transition: all 0.3s ease;
                }

                .field input:focus::placeholder {
                    color: #1a75ff;
                }

                .pass-link {
                    margin-top: 5px;
                }

                .signup-link {
                    text-align: center;
                    margin-top: 30px;
                }

                .pass-link a,
                .signup-link a {
                    color: #1a75ff;
                    text-decoration: none;
                    cursor: pointer;
                    background: none;
                    border: none;
                    font-size: inherit;
                    font-family: 'Poppins', sans-serif;
                }

                .pass-link a:hover,
                .signup-link a:hover {
                    text-decoration: underline;
                }

                .btn-field {
                    height: 50px;
                    width: 100%;
                    border-radius: 15px;
                    position: relative;
                    overflow: hidden;
                    margin-top: 20px;
                }

                .btn-layer {
                    height: 100%;
                    width: 300%;
                    position: absolute;
                    left: -100%;
                    background: linear-gradient(to left, #003366, #004080, #0059b3, #0073e6);
                    border-radius: 15px;
                    transition: left 0.4s ease;
                }

                .btn-field:hover .btn-layer {
                    left: 0;
                }

                .btn-field button[type="submit"] {
                    height: 100%;
                    width: 100%;
                    z-index: 1;
                    position: relative;
                    background: none;
                    border: none;
                    color: #fff;
                    border-radius: 15px;
                    font-size: 20px;
                    font-weight: 500;
                    cursor: pointer;
                    font-family: 'Poppins', sans-serif;
                    transition: opacity 0.2s;
                }

                .btn-field button[type="submit"]:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .alert {
                    margin-top: 12px;
                    padding: 10px 14px;
                    border-radius: 10px;
                    font-size: 13px;
                    text-align: center;
                }

                .alert.error {
                    background: #fee2e2;
                    color: #dc2626;
                }

                .alert.success {
                    background: #dcfce7;
                    color: #16a34a;
                }

                .alert.warning {
                    background: #fef3c7;
                    color: #92400e;
                }

                .notice-actions {
                    margin-top: 12px;
                    display: flex;
                    justify-content: center;
                }

                .notice-actions button {
                    padding: 8px 16px;
                    border-radius: 8px;
                    border: none;
                    background: #003366;
                    color: #fff;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    font-family: 'Poppins', sans-serif;
                }

                .brand {
                    text-align: center;
                    font-size: 13px;
                    color: #64748b;
                    margin-top: 24px;
                }
            `}</style>

            <div className="page-root">
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

                    <p className="brand">LungCare AI — Dành cho Bác sĩ</p>
                </div>
            </div>
        </>
    );
}
