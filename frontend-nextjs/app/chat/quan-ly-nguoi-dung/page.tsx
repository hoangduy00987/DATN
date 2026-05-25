"use client";

import { useState, useEffect, useRef } from "react";

interface User {
    id: string;
    email: string;
    full_name: string;
    phone: string | null;
    role: string;
    gender: string | null;
    status: string;
}

export default function UserManagementPage() {
    const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(";").shift();
        return null;
    };

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [searchTerm, setSearchTerm] = useState("");
    const [filterRole, setFilterRole] = useState("all");

    // Modal States
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);

    // Form States
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        role: "patient",
        gender: "Nam",
        status: "active"
    });
    const [fieldErrors, setFieldErrors] = useState({
        email: "",
        phone: "",
        password: "",
        full_name: ""
    });
    const [formError, setFormError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [toast, setToast] = useState<{ message: string; show: boolean; type?: "success" | "error" }>({ message: "", show: false });

    const triggerToast = (msg: string, type: "success" | "error" = "success") => {
        setToast({ message: msg, show: true, type });
        setTimeout(() => setToast({ message: "", show: false }), 3000);
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = getCookie("access_token");
            if (!token) throw new Error("Phiên đăng nhập hết hạn.");

            const response = await fetch(`http://localhost:8000/api/v1/users/`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Không thể tải danh sách người dùng.");
            const data = await response.json();
            setUsers(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleOpenCreate = () => {
        setIsEdit(false);
        setSelectedUser(null);
        setFormData({
            email: "",
            password: "",
            full_name: "",
            phone: "",
            role: "patient",
            gender: "Nam",
            status: "active"
        });
        setFormError("");
        setFieldErrors({ email: "", phone: "", password: "", full_name: "" });
        setShowModal(true);
    };

    const handleOpenEdit = (user: User) => {
        setIsEdit(true);
        setSelectedUser(user);
        setFormData({
            email: user.email,
            password: "", // Don't show password
            full_name: user.full_name,
            phone: user.phone || "",
            role: user.role,
            gender: user.gender || "Nam",
            status: user.status
        });
        setFormError("");
        setFieldErrors({ email: "", phone: "", password: "", full_name: "" });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFormError("");
        setFieldErrors({ email: "", phone: "", password: "", full_name: "" });

        // Client-side validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
        let hasError = false;
        const newFieldErrors = { email: "", phone: "", password: "", full_name: "" };

        if (!emailRegex.test(formData.email)) {
            newFieldErrors.email = "Email không đúng định dạng.";
            hasError = true;
        }

        if (formData.phone && !phoneRegex.test(formData.phone)) {
            newFieldErrors.phone = "Số điện thoại không hợp lệ (10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09).";
            hasError = true;
        }

        if (!formData.full_name.trim()) {
            newFieldErrors.full_name = "Vui lòng nhập họ và tên.";
            hasError = true;
        }

        if (!isEdit && !formData.password) {
            newFieldErrors.password = "Vui lòng nhập mật khẩu.";
            hasError = true;
        }

        if (hasError) {
            setFieldErrors(newFieldErrors);
            setIsSubmitting(false);
            return;
        }

        try {
            const token = getCookie("access_token");
            if (!token) throw new Error("Phiên đăng nhập hết hạn.");

            const url = isEdit
                ? `http://localhost:8000/api/v1/users/${selectedUser?.id}`
                : `http://localhost:8000/api/v1/users/`;

            const method = isEdit ? "PATCH" : "POST";

            // Filter out empty password on edit
            const bodyData = { ...formData };
            if (isEdit && !bodyData.password) {
                delete (bodyData as any).password;
            }

            const response = await fetch(url, {
                method,
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(bodyData)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || "Có lỗi xảy ra.");
            }

            triggerToast(isEdit ? "Cập nhật thành công!" : "Tạo người dùng thành công!");
            setShowModal(false);
            fetchUsers();
        } catch (err: any) {
            setFormError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (user: User) => {
        if (!confirm(`Bạn có chắc chắn muốn xóa người dùng ${user.full_name}?`)) return;

        try {
            const token = getCookie("access_token");
            const response = await fetch(`http://localhost:8000/api/v1/users/${user.id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Không thể xóa người dùng.");

            triggerToast("Đã xóa người dùng.");
            fetchUsers();
        } catch (err: any) {
            triggerToast(err.message, "error");
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === "all" || user.role === filterRole;
        return matchesSearch && matchesRole;
    });

    return (
        <div className="user-mgmt-container premium-ui">
            {toast.show && (
                <div className="toast-premium-container">
                    <div className={`toast-premium-card ${toast.type === 'error' ? 'toast-error' : ''}`}>
                        <div className="toast-icon">{toast.type === 'error' ? '!' : '✓'}</div>
                        <div className="toast-msg">{toast.message}</div>
                    </div>
                </div>
            )}

            <div className="admin-card">
                <div className="admin-header-v2">
                    <div className="header-title-section">
                        <div className="header-icon-main">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        </div>
                        <div className="header-text-main">
                            <h1>Quản lý người dùng</h1>
                            <p>Quản lý tài khoản bác sĩ, bệnh nhân và quản trị viên</p>
                        </div>
                    </div>
                    <button className="btn-add-user" onClick={handleOpenCreate}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        <span>Thêm người dùng</span>
                    </button>
                </div>

                <div className="admin-toolbar-v5">
                    <div className="toolbar-item-v5 search-box-v5">
                        <label className="item-label-v5">Tìm kiếm</label>
                        <div className="input-wrap-v5">
                            <svg className="search-icon-v5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                            <input type="text" placeholder="Tên hoặc email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>

                    <div className="toolbar-item-v5 status-box-v5">
                        <label className="item-label-v5">Vai trò</label>
                        <div className="select-wrap-v5">
                            <select className="status-select-v5" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                                <option value="all">Tất cả vai trò</option>
                                <option value="doctor">Bác sĩ</option>
                                <option value="patient">Bệnh nhân</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="content-area">
                    <div className="table-responsive-v5">
                        <table className="admin-table-v5">
                            <thead>
                                <tr>
                                    <th>Người dùng</th>
                                    <th>Email</th>
                                    <th>Vai trò</th>
                                    <th>Giới tính</th>
                                    <th>Số điện thoại</th>
                                    <th>Trạng thái</th>
                                    <th>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={6} className="status-cell-v5">Đang tải danh sách...</td></tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr><td colSpan={6} className="status-cell-v5">Không tìm thấy người dùng nào</td></tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <tr key={user.id} className="row-hover-v5">
                                            <td><div className="name-bold">{user.full_name}</div></td>
                                            <td><div className="email-text">{user.email}</div></td>
                                            <td>
                                                <span className={`pill-role role-${user.role}`}>
                                                    {user.role === 'admin' ? 'Admin' : user.role === 'doctor' ? 'Bác sĩ' : 'Bệnh nhân'}
                                                </span>
                                            </td>
                                            <td><div className="gender-text">{user.gender || "Chưa cập nhật"}</div></td>
                                            <td><div className="tag-phone">{user.phone || "N/A"}</div></td>
                                            <td>
                                                <span className={`pill-status status-${user.status}`}>
                                                    {user.status === 'active' ? 'Hoạt động' : 'Khóa'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="action-btns-v5">
                                                    <button className="btn-act btn-edit-v5" onClick={() => handleOpenEdit(user)}>
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg>
                                                    </button>
                                                    <button className="btn-act btn-delete-v5" onClick={() => handleDelete(user)}>
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="modal-mask">
                    <div className="modal-container-v5">
                        <div className="modal-header-v5">
                            <h3>{isEdit ? "Cập nhật người dùng" : "Thêm người dùng mới"}</h3>
                            <button className="btn-x" onClick={() => setShowModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-grid-v5">
                                <div className="item-v5">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        className="form-input-v5"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                    {fieldErrors.email && <span className="field-error-v5">{fieldErrors.email}</span>}
                                </div>
                                {!isEdit && (
                                    <div className="item-v5">
                                        <label>Mật khẩu</label>
                                        <input
                                            type="password"
                                            className="form-input-v5"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            required={!isEdit}
                                            placeholder=""
                                        />
                                        {fieldErrors.password && <span className="field-error-v5">{fieldErrors.password}</span>}
                                    </div>
                                )}
                                <div className="item-v5 full-v5">
                                    <label>Họ và tên</label>
                                    <input
                                        type="text"
                                        className="form-input-v5"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        required
                                    />
                                    {fieldErrors.full_name && <span className="field-error-v5">{fieldErrors.full_name}</span>}
                                </div>
                                <div className="item-v5">
                                    <label>Số điện thoại</label>
                                    <input
                                        type="text"
                                        className="form-input-v5"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                    {fieldErrors.phone && <span className="field-error-v5">{fieldErrors.phone}</span>}
                                </div>
                                <div className="item-v5">
                                    <label>Vai trò</label>
                                    <select
                                        className="form-select-v5"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="patient">Bệnh nhân</option>
                                        <option value="doctor">Bác sĩ</option>
                                    </select>
                                </div>
                                <div className="item-v5">
                                    <label>Giới tính</label>
                                    <select
                                        className="form-select-v5"
                                        value={formData.gender}
                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                    >
                                        <option value="Nam">Nam</option>
                                        <option value="Nữ">Nữ</option>
                                        <option value="Khác">Khác</option>
                                    </select>
                                </div>
                                <div className="item-v5">
                                    <label>Trạng thái</label>
                                    <select
                                        className="form-select-v5"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="active">Hoạt động</option>
                                        <option value="locked">Khóa</option>
                                    </select>
                                </div>
                                {isEdit && (
                                    <div className="item-v5 full-v5">
                                        <label>Mật khẩu mới</label>
                                        <input
                                            type="password"
                                            className="form-input-v5"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            placeholder="Nhập mật khẩu mới..."
                                        />
                                    </div>
                                )}
                                {formError && <div className="item-v5 full-v5 result-error-v5">{formError}</div>}
                            </div>
                            <div className="modal-footer-v5">
                                <button type="button" className="btn-close-v5 btn-muted-v5" onClick={() => setShowModal(false)}>Hủy</button>
                                <button type="submit" className="btn-close-v5" disabled={isSubmitting}>
                                    {isSubmitting ? "Đang xử lý..." : isEdit ? "Cập nhật" : "Tạo mới"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
        .premium-ui { background: #f1f5f9; font-family: Arial, sans-serif !important; min-height: 100vh; padding: 15px; }
        
        .toast-premium-container { position: fixed; top: 24px; right: 24px; z-index: 3000; animation: slideIn 0.3s ease; }
        .toast-premium-card { background: #0f172a; color: white; padding: 12px 20px; border-radius: 8px; display: flex; align-items: center; gap: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .toast-error { background: #fee2e2; color: #991b1b; }
        .toast-icon { background: #10b981; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; }
        .toast-error .toast-icon { background: #ef4444; }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

        .admin-card { background: white; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 24px; width: 100%; }
        .admin-header-v2 { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 32px; border-bottom: 1px solid #f1f5f9; padding-bottom: 24px; }
        .header-title-section { display: flex; align-items: center; gap: 16px; }
        .header-icon-main { width: 44px; height: 44px; background: #059669; color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .header-text-main h1 { font-size: 1.4rem; margin: 0; color: #0f172a; }
        .header-text-main p { margin: 4px 0 0; color: #64748b; font-size: 0.85rem; }

        .btn-add-user { display: flex; align-items: center; gap: 8px; background: #059669; color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .btn-add-user:hover { background: #047857; transform: translateY(-1px); }

        .admin-toolbar-v5 { display: grid; grid-template-columns: 1.5fr 1fr; gap: 18px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 24px; align-items: end; }
        .toolbar-item-v5 { display: flex; flex-direction: column; gap: 6px; }
        .item-label-v5 { font-size: 0.8rem; font-weight: 700; color: #475569; }
        
        .input-wrap-v5 { position: relative; display: flex; align-items: center; }
        .search-icon-v5 { position: absolute; left: 12px; color: #94a3b8; }
        .input-wrap-v5 input { width: 100%; padding: 10px 12px 10px 36px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; outline: none; transition: 0.2s; }
        .input-wrap-v5 input:focus { border-color: #059669; box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1); }

        .select-wrap-v5 { position: relative; }
        .status-select-v5 { width: 100%; height: 40px; padding: 0 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: white; font-size: 0.9rem; outline: none; cursor: pointer; }

        .table-responsive-v5 { overflow-x: auto; }
        .admin-table-v5 { width: 100%; border-collapse: collapse; min-width: 800px; }
        .admin-table-v5 th { text-align: left; padding: 12px 16px; font-size: 0.8rem; color: #64748b; font-weight: 700; border-bottom: 2px solid #f1f5f9; }
        .admin-table-v5 td { padding: 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .row-hover-v5:hover { background: #f8fafc; }
        
        .name-bold { font-weight: 700; color: #1e293b; }
        .email-text { color: #64748b; font-size: 0.9rem; }
        .tag-phone { font-size: 0.85rem; color: #64748b; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; display: inline-block; }
        
        .pill-role { padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; }
        .role-admin { background: #fee2e2; color: #991b1b; }
        .role-doctor { background: #dbeafe; color: #1d4ed8; }
        .role-patient { background: #d1fae5; color: #065f46; }

        .pill-status { padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; }
        .status-active { background: #d1fae5; color: #065f46; }
        .status-locked { background: #f1f5f9; color: #64748b; }

        .action-btns-v5 { display: flex; gap: 8px; }
        .btn-act { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px; border: none; cursor: pointer; transition: 0.2s; }
        .btn-edit-v5 { background: #f1f5f9; color: #059669; }
        .btn-edit-v5:hover { background: #059669; color: white; }
        .btn-delete-v5 { background: #f1f5f9; color: #ef4444; }
        .btn-delete-v5:hover { background: #ef4444; color: white; }

        .modal-mask { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 2000; }
        .modal-container-v5 { background: white; width: 95%; max-width: 600px; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
        .modal-header-v5 { padding: 20px 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
        .modal-header-v5 h3 { margin: 0; font-size: 1.25rem; color: #0f172a; }
        .btn-x { background: none; border: none; font-size: 28px; color: #94a3b8; cursor: pointer; line-height: 1; }
        
        .modal-grid-v5 { padding: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .form-input-v5, .form-select-v5 { width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; outline: none; }
        .form-input-v5:focus, .form-select-v5:focus { border-color: #059669; }
        
        .status-cell-v5 { text-align: center; padding: 40px !important; color: #94a3b8; }
        .result-error-v5 { color: #dc2626; font-size: 0.85rem; font-weight: 600; }
        .field-error-v5 { color: #dc2626; font-size: 0.75rem; margin-top: 4px; font-weight: normal; }
        
        .modal-footer-v5 { padding: 20px 24px; display: flex; justify-content: flex-end; background: #f8fafc; border-top: 1px solid #f1f5f9; }
        .btn-close-v5 { padding: 10px 24px; background: #0f172a; color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .btn-close-v5:hover { background: #334155; }
        .btn-muted-v5 { background: #e2e8f0; color: #334155; margin-right: 10px; }
      `}</style>
        </div>
    );
}
