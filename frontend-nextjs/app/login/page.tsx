"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data?.detail || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
                setLoading(false);
                return;
            }

            router.push("/chat");
        } catch (err) {
            setError("Lỗi kết nối khi đăng nhập.");
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f5f7fa", // subtle light background to make the white card pop
            fontFamily: "Inter, sans-serif"
        }}>
            <div style={{
                background: "#ffffff",
                width: "100%",
                maxWidth: 400,
                padding: "40px",
                borderRadius: "16px",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center"
            }}>
                <h1 style={{
                    margin: "0 0 8px 0",
                    fontSize: "28px",
                    color: "#1e293b",
                    fontWeight: 700
                }}>LungCare AI</h1>

                <p style={{
                    margin: "0 0 32px 0",
                    color: "#64748b",
                    fontSize: "14px"
                }}>Đăng nhập dành cho Bác sĩ</p>

                {error && (
                    <div style={{
                        width: "100%",
                        padding: "12px",
                        backgroundColor: "#fee2e2",
                        color: "#ef4444",
                        borderRadius: "8px",
                        fontSize: "14px",
                        marginBottom: "16px",
                        textAlign: "center"
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "14px", color: "#334155", fontWeight: 500 }}>Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="doctor@admin.com"
                            required
                            style={{
                                padding: "12px 16px",
                                borderRadius: "8px",
                                border: "1px solid #cbd5e1",
                                outline: "none",
                                fontSize: "15px",
                                transition: "border-color 0.2s"
                            }}
                        />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "14px", color: "#334155", fontWeight: 500 }}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            style={{
                                padding: "12px 16px",
                                borderRadius: "8px",
                                border: "1px solid #cbd5e1",
                                outline: "none",
                                fontSize: "15px",
                                transition: "border-color 0.2s"
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            marginTop: "8px",
                            padding: "14px",
                            backgroundColor: "#0ea5e9",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "16px",
                            fontWeight: 600,
                            cursor: loading ? "not-allowed" : "pointer",
                            opacity: loading ? 0.7 : 1,
                            transition: "background-color 0.2s"
                        }}
                    >
                        {loading ? "Đang xử lý..." : "Đăng Nhập"}
                    </button>
                </form>
            </div>
        </div>
    );
}
