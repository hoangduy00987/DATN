"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, FormEvent, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [token, setToken] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const t = searchParams.get("token");
        if (t) {
            // Kiểm tra token ngay khi trang load
            const verifyToken = async () => {
                try {
                    const res = await fetch(`/api/auth/verify-reset-token?token=${t}`);
                    const data = await res.json();
                    if (res.ok) {
                        setToken(t);
                    } else {
                        setError(data.detail || "Liên kết không hợp lệ hoặc đã hết hạn.");
                    }
                } catch {
                    setError("Lỗi kết nối khi xác thực liên kết.");
                }
            };
            verifyToken();
        } else {
            setError("Mã xác thực không tìm thấy. Vui lòng kiểm tra lại email.");
        }
    }, [searchParams]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp.");
            return;
        }

        setLoading(true);
        setError("");
        setMessage("");

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, new_password: password }),
            });

            const data = await res.json();
            if (res.ok) {
                setMessage("Cập nhật mật khẩu thành công! Đang chuyển hướng về trang đăng nhập...");
                setTimeout(() => router.push("/login"), 3000);
            } else {
                setError(data.detail || "Có lỗi xảy ra. Vui lòng thử lại.");
            }
        } catch {
            setError("Lỗi kết nối server.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-shell">
            <div className="page-root">
                <section className="login-hero">
                    <div className="login-hero-brand">
                        <Link href="/" className="login-logo-link">
                            <Image
                                src="/logo.png"
                                alt="LungCare"
                                width={640}
                                height={640}
                                priority
                                className="login-logo-img"
                            />
                        </Link>
                    </div>
                </section>
                <div className="login-form-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="wrapper" style={{
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                        borderRadius: '24px',
                        padding: '40px',
                        width: '100%',
                        maxWidth: '420px'
                    }}>
                        <div className="title" style={{
                            marginBottom: 20,
                            fontSize: '1.6rem',
                            fontWeight: '800',
                            color: '#064e3b',
                            textAlign: 'center',
                            whiteSpace: 'nowrap'
                        }}>
                            Đặt lại mật khẩu
                        </div>

                        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                            <div className="field" style={{ marginBottom: 15 }}>
                                <input
                                    type="password"
                                    placeholder="Mật khẩu mới"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    disabled={!token}
                                    style={{
                                        borderRadius: '14px',
                                        border: '1px solid #e2e8f0',
                                        padding: '16px',
                                        fontSize: '16px'
                                    }}
                                />
                            </div>
                            <div className="field" style={{ marginBottom: 20 }}>
                                <input
                                    type="password"
                                    placeholder="Xác nhận mật khẩu mới"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    required
                                    disabled={!token}
                                    style={{
                                        borderRadius: '14px',
                                        border: '1px solid #e2e8f0',
                                        padding: '16px',
                                        fontSize: '16px'
                                    }}
                                />
                            </div>

                            {error && (
                                <div className="alert error" style={{
                                    background: '#fef2f2',
                                    color: '#dc2626',
                                    border: '1px solid #fecaca',
                                    borderRadius: '12px',
                                    padding: '12px',
                                    fontSize: '14px',
                                    marginBottom: 20,
                                    textAlign: 'center'
                                }}>
                                    {error}
                                </div>
                            )}
                            {message && (
                                <div className="alert success" style={{
                                    background: '#f0fdf4',
                                    color: '#16a34a',
                                    border: '1px solid #bbf7d0',
                                    borderRadius: '12px',
                                    padding: '12px',
                                    fontSize: '14px',
                                    marginBottom: 20,
                                    textAlign: 'center'
                                }}>
                                    {message}
                                </div>
                            )}

                            <div className="btn-field">
                                <div className="btn-layer" style={{ borderRadius: '14px', background: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)' }} />
                                <button type="submit" disabled={loading || !token} style={{ fontWeight: '700' }}>
                                    {loading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
                                </button>
                            </div>

                            <div className="signup-link" style={{ marginTop: 30 }}>
                                Quay về <Link href="/login" style={{ color: '#059669', fontWeight: '600' }}>Đăng nhập</Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div>Đang tải...</div>}>
            <ResetPasswordForm />
        </Suspense>
    );
}
