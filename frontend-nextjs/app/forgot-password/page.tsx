"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, FormEvent } from "react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();
            if (res.ok) {
                setMessage(data.message || "Liên kết đặt lại mật khẩu đã được gửi!");
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
                            marginBottom: 10,
                            fontSize: '1.6rem',
                            fontWeight: '800',
                            color: '#064e3b',
                            textAlign: 'center',
                            whiteSpace: 'nowrap'
                        }}>
                            Quên mật khẩu
                        </div>
                        <p style={{
                            textAlign: 'center',
                            color: '#64748b',
                            fontSize: '14px',
                            lineHeight: '1.6',
                            marginBottom: 25
                        }}>
                            Đừng lo lắng! Hãy nhập email và chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu cho bạn.
                        </p>

                        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                            <div className="field" style={{ marginBottom: 20 }}>
                                <input
                                    type="email"
                                    placeholder="Tên đăng nhập (Email)"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    style={{
                                        borderRadius: '14px',
                                        border: '1px solid #e2e8f0',
                                        padding: '16px',
                                        fontSize: '16px',
                                        transition: 'all 0.3s ease'
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
                                    marginBottom: 20
                                }}>
                                    {error.includes("Dữ liệu yêu cầu") ? "Email không hợp lệ hoặc không tồn tại." : error}
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
                                    marginBottom: 20
                                }}>
                                    {message}
                                </div>
                            )}

                            <div className="btn-field">
                                <div className="btn-layer" style={{ borderRadius: '14px', background: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)' }} />
                                <button type="submit" disabled={loading} style={{ fontWeight: '700', letterSpacing: '0.5px' }}>
                                    {loading ? "Đang xử lý..." : "Gửi mã xác nhận"}
                                </button>
                            </div>

                            <div className="signup-link" style={{ marginTop: 30 }}>
                                Nhớ lại mật khẩu? <Link href="/login" style={{ color: '#059669', fontWeight: '600' }}>Quay về Đăng nhập</Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
