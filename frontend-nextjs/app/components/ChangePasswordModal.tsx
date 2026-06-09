"use client";

import { useState } from "react";

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (newPassword !== confirmPassword) {
            setError("Mật khẩu mới và xác nhận không khớp.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
            });

            const data = await res.json();
            if (res.ok) {
                setSuccess("Đổi mật khẩu thành công!");
                setOldPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setTimeout(() => onClose(), 2000);
            } else {
                setError(data.detail || "Có lỗi xảy ra.");
            }
        } catch (err) {
            setError("Lỗi kết nối.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pwd-modal-overlay">
            <div className="pwd-modal-content">
                <div className="pwd-modal-header">
                    <h2>Đổi mật khẩu</h2>
                    <button onClick={onClose} className="pwd-close-btn">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="pwd-form">
                    <div className="pwd-field-group">
                        <label>Mật khẩu cũ</label>
                        <input
                            type="password"
                            required
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                        />
                    </div>
                    <div className="pwd-field-group">
                        <label>Mật khẩu mới</label>
                        <input
                            type="password"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>
                    <div className="pwd-field-group">
                        <label>Xác nhận mật khẩu mới</label>
                        <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>

                    {error && <div className="pwd-alert error">{error}</div>}
                    {success && <div className="pwd-alert success">{success}</div>}

                    <div className="pwd-actions">
                        <button type="submit" disabled={loading} className="pwd-submit-btn">
                            {loading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
                        </button>
                    </div>
                </form>
            </div>

            <style jsx>{`
                .pwd-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.4);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                }
                .pwd-modal-content {
                    background: #fff;
                    width: 90%;
                    max-width: 420px;
                    border-radius: 20px;
                    padding: 30px;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
                    animation: pwdFadeIn 0.3s ease;
                }
                @keyframes pwdFadeIn {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .pwd-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                }
                .pwd-modal-header h2 {
                    margin: 0;
                    font-size: 1.5rem;
                    color: #064e3b;
                    font-weight: 700;
                }
                .pwd-close-btn {
                    background: none;
                    border: none;
                    font-size: 24px;
                    color: #94a3b8;
                    cursor: pointer;
                    transition: color 0.2s;
                }
                .pwd-close-btn:hover {
                    color: #1e293b;
                }
                .pwd-form {
                    display: flex;
                    flex-direction: column;
                    gap: 18px;
                }
                .pwd-field-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .pwd-field-group label {
                    font-size: 0.88rem;
                    font-weight: 500;
                    color: #475569;
                }
                .pwd-field-group input {
                    padding: 12px 14px;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    outline: none;
                    transition: border-color 0.2s;
                    font-family: inherit;
                }
                .pwd-field-group input:focus {
                    border-color: #059669;
                }
                .pwd-alert {
                    padding: 10px;
                    border-radius: 10px;
                    font-size: 0.85rem;
                    text-align: center;
                }
                .pwd-alert.error { background: #fee2e2; color: #dc2626; }
                .pwd-alert.success { background: #dcfce7; color: #16a34a; }
                .pwd-submit-btn {
                    margin-top: 10px;
                    padding: 14px;
                    border-radius: 12px;
                    border: none;
                    background: #059669;
                    color: #fff;
                    font-weight: 600;
                    font-size: 1rem;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .pwd-submit-btn:hover {
                    background: #047857;
                }
                .pwd-submit-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
            `}</style>
        </div>
    );
}
