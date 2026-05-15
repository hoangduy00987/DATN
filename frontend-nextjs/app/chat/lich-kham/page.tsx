"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  symptoms: string;
  created_at: string;
}

export default function LichKhamDoctorPage() {
  const today = new Date().toISOString().split("T")[0];

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift();
    return null;
  };

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Doctor Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState(today);
  const [filterStatus, setFilterStatus] = useState("booked");

  // Modal States
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [toast, setToast] = useState<{ message: string; show: boolean }>({ message: "", show: false });
  const dateInputRef = useRef<HTMLInputElement>(null);

  const triggerToast = (msg: string) => {
    setToast({ message: msg, show: true });
    setTimeout(() => setToast({ message: "", show: false }), 3000);
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const token = getCookie("access_token");
      if (!token) throw new Error("Phiên đăng nhập hết hạn.");

      const params = new URLSearchParams();
      if (filterDate) params.append("date", filterDate);
      if (filterStatus && filterStatus !== "all") params.append("status", filterStatus);
      if (searchTerm.trim()) params.append("search", searchTerm.trim());
      
      const queryString = params.toString();
      const response = await fetch(`http://localhost:8000/api/v1/appointments/all${queryString ? `?${queryString}` : ""}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("Không thể tải danh sách lịch khám.");
      const data = await response.json();
      setAppointments(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh when Date or Status changes (Intuitive behavior)
  useEffect(() => {
    fetchAppointments();
  }, [filterDate, filterStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAppointments();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleClearAllFilters = () => {
    setSearchTerm("");
    setFilterDate(today);
    setFilterStatus("booked");
    // useEffect will trigger fetch because filterDate/Status changed
  };

  const handleSendResult = (apt: Appointment) => {
    triggerToast(`Đang gửi kết quả cho bệnh nhân...`);
  };

  const handleDateContainerClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.btn-clear-field')) return;
    if (dateInputRef.current) {
      try {
        // @ts-ignore
        if (typeof dateInputRef.current.showPicker === 'function') {
          // @ts-ignore
          dateInputRef.current.showPicker();
        } else {
          dateInputRef.current.focus();
        }
      } catch (e) {
        dateInputRef.current.click();
      }
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Tất cả các ngày";
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3 && parts[0].length === 4) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}/${month}/${d.getFullYear()}`;
    }
    return dateStr;
  };

  const parseSymptoms = (text: string) => {
    const nameMatch = text.match(/Bệnh nhân: ([^,]+)/);
    const phoneMatch = text.match(/SĐT: ([^,]+)/);
    const dobMatch = text.match(/Ngày sinh: ([^.]+)/);
    const reasonMatch = text.match(/Lý do: (.*)/);
    return {
      name: nameMatch ? nameMatch[1] : "N/A",
      phone: phoneMatch ? phoneMatch[1] : "N/A",
      dob: dobMatch ? dobMatch[1] : "N/A",
      reason: reasonMatch ? reasonMatch[1] : text
    };
  };

  return (
    <div className="appointment-page-container premium-ui">
      {toast.show && (
        <div className="toast-premium-container">
          <div className="toast-premium-card">
            <div className="toast-icon">✓</div>
            <div className="toast-msg">{toast.message}</div>
          </div>
        </div>
      )}

      <div className="appointment-card">
        <div className="appointment-header-v2">
          <div className="header-title-section">
            <div className="header-icon-main">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            </div>
            <div className="header-text-main">
              <h1>Quản lý lịch khám bệnh</h1>
              <p>Theo dõi và xem thông tin bệnh nhân trong ngày</p>
            </div>
          </div>
        </div>

        {/* Doctor Toolbar V5 */}
        <div className="doctor-toolbar-v5">
          <div className="toolbar-item-v5 search-box-v5">
            <label className="item-label-v5">Tìm bệnh nhân</label>
            <div className="input-wrap-v5">
              <svg className="search-icon-v5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Tên hoặc SĐT..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchAppointments()} />
              {searchTerm && <button className="btn-clear-mini" onClick={() => setSearchTerm("")}>&times;</button>}
            </div>
          </div>

          <div className="toolbar-item-v5 date-box-v5">
            <label className="item-label-v5">Ngày khám</label>
            <div className="date-box-v5-inner" onClick={handleDateContainerClick}>
              <input ref={dateInputRef} type="date" className="hidden-date-v5" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
              <div className="display-layer-v5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span>{formatDate(filterDate)}</span>
                {filterDate && <button className="btn-clear-mini" onClick={(e) => { e.stopPropagation(); setFilterDate(""); }}>&times;</button>}
              </div>
            </div>
          </div>

          <div className="toolbar-item-v5 status-box-v5">
            <label className="item-label-v5">Trạng thái</label>
            <div className="select-wrap-v5">
              <select className="status-select-v5" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="booked">Đã đặt</option>
                <option value="cancelled">Đã hủy</option>
                <option value="all">Tất cả</option>
              </select>
              {filterStatus !== "all" && <button className="btn-clear-mini" onClick={() => setFilterStatus("all")}>&times;</button>}
            </div>
          </div>

          <div className="toolbar-actions-v5">
            <button className="btn-main-v5 btn-reset-v5" onClick={handleClearAllFilters} title="Xóa tất cả bộ lọc">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              <span>Xóa lọc</span>
            </button>
          </div>
        </div>

        <div className="content-area">
          <div className="table-responsive-v5">
            <table className="doctor-table-v5">
              <thead>
                <tr><th>Bệnh nhân</th><th>Liên lạc</th><th>Thời gian</th><th>Trạng thái</th><th>Hành động</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="status-cell-v5">Đang tải danh sách...</td></tr>
                ) : appointments.length === 0 ? (
                  <tr><td colSpan={5} className="status-cell-v5">Không có dữ liệu lịch khám</td></tr>
                ) : (
                  appointments.map((apt) => {
                    const info = parseSymptoms(apt.symptoms);
                    const isCancelled = apt.status === "cancelled";
                    return (
                      <tr key={apt.id} className="row-hover-v5">
                        <td><div className="name-bold">{info.name}</div></td>
                        <td><div className="tag-phone">{info.phone}</div></td>
                        <td><div className="time-group"><span className="day-text">{formatDate(apt.appointment_date)}</span><span className="hour-text">{apt.appointment_time}</span></div></td>
                        <td><span className={`pill-status ${isCancelled ? 'pill-cancelled' : 'pill-booked'}`}>{isCancelled ? "Đã hủy" : "Đã đặt"}</span></td>
                        <td>
                          <div className="action-btns-v5">
                            <button className="btn-act btn-detail-v5" onClick={() => { setSelectedApt(apt); setShowDetailModal(true); }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                              <span>Chi tiết</span>
                            </button>
                            <button className="btn-act btn-send-v5" onClick={() => handleSendResult(apt)}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                              <span>Gửi kết quả</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showDetailModal && selectedApt && (
        <div className="modal-mask">
          <div className="modal-container-v5">
            <div className="modal-header-v5"><h3>Chi tiết cuộc hẹn</h3><button className="btn-x" onClick={() => setShowDetailModal(false)}>&times;</button></div>
            <div className="modal-grid-v5">
              <div className="item-v5"><label>Họ và tên</label><p>{parseSymptoms(selectedApt.symptoms).name}</p></div>
              <div className="item-v5"><label>Số điện thoại</label><p>{parseSymptoms(selectedApt.symptoms).phone}</p></div>
              <div className="item-v5"><label>Ngày sinh</label><p>{formatDate(parseSymptoms(selectedApt.symptoms).dob)}</p></div>
              <div className="item-v5"><label>Trạng thái</label><p style={{ color: selectedApt.status === 'cancelled' ? '#ef4444' : '#059669', fontWeight: 700 }}>{selectedApt.status === "cancelled" ? "Đã hủy" : "Đã đặt"}</p></div>
              <div className="item-v5"><label>Ngày khám</label><p>{formatDate(selectedApt.appointment_date)}</p></div>
              <div className="item-v5"><label>Giờ khám</label><p>{selectedApt.appointment_time}</p></div>
              <div className="item-v5 full-v5"><label>Lý do khám / Triệu chứng</label><div className="reason-text">{parseSymptoms(selectedApt.symptoms).reason}</div></div>
            </div>
            <div className="modal-footer-v5"><button className="btn-close-v5" onClick={() => setShowDetailModal(false)}>Đóng</button></div>
          </div>
        </div>
      )}

      <style jsx>{`
        .premium-ui { background: #f1f5f9; font-family: Arial, sans-serif !important; min-height: 100vh; padding: 15px; }
        
        .toast-premium-container { position: fixed; top: 24px; right: 24px; z-index: 3000; animation: slideIn 0.3s ease; }
        .toast-premium-card { background: #0f172a; color: white; padding: 12px 20px; border-radius: 8px; display: flex; align-items: center; gap: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .toast-icon { background: #10b981; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

        .appointment-card { background: white; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 15px; width: 100%; max-width: none; margin: 0; min-width: 0; }
        .appointment-header-v2 { display: flex; align-items: center; gap: 16px; margin-bottom: 32px; border-bottom: 1px solid #f1f5f9; padding-bottom: 24px; }
        .header-icon-main { width: 44px; height: 44px; background: #059669; color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .header-text-main h1 { font-size: 1.4rem; margin: 0; color: #0f172a; }
        .header-text-main p { margin: 4px 0 0; color: #64748b; font-size: 0.85rem; }

        .doctor-toolbar-v5 { display: grid; grid-template-columns: minmax(260px, 1.5fr) minmax(220px, 1fr) minmax(180px, 0.8fr) auto; gap: 18px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 24px; align-items: end; }
        .toolbar-item-v5 { display: flex; flex-direction: column; gap: 6px; }
        .item-label-v5 { font-size: 0.8rem; font-weight: 700; color: #475569; }
        
        .search-box-v5 { width: 100%; }
        .input-wrap-v5 { position: relative; display: flex; align-items: center; }
        .search-icon-v5 { position: absolute; left: 12px; color: #94a3b8; }
        .input-wrap-v5 input { width: 100%; padding: 10px 32px 10px 36px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; outline: none; transition: 0.2s; }

        .date-box-v5 { width: 100%; }
        .date-box-v5-inner { position: relative; height: 40px; cursor: pointer; }
        .hidden-date-v5 { position: absolute; inset: 0; opacity: 0; z-index: 5; pointer-events: none; }
        .display-layer-v5 { position: absolute; inset: 0; display: flex; align-items: center; gap: 8px; padding: 0 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; font-size: 0.85rem; font-weight: 600; color: #1e293b; z-index: 1; }

        .status-box-v5 { width: 100%; }
        .select-wrap-v5 { position: relative; display: flex; align-items: center; }
        .status-select-v5 { width: 100%; height: 40px; padding: 0 28px 0 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; font-size: 0.9rem; font-weight: 600; outline: none; cursor: pointer; appearance: none; }

        .btn-clear-mini { position: absolute; right: 8px; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; background: #e2e8f0; color: #64748b; border: none; border-radius: 50%; font-size: 14px; cursor: pointer; z-index: 10; transition: 0.2s; }
        .btn-clear-mini:hover { background: #ef4444; color: white; }

        .toolbar-actions-v5 { display: flex; justify-content: flex-end; gap: 12px; align-items: flex-end; }
        .btn-main-v5 { display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 20px; border-radius: 8px; font-weight: 700; font-size: 0.9rem; cursor: pointer; border: none; transition: 0.2s; }
        .btn-reset-v5 { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; min-width: 140px; justify-content: center; }
        .btn-reset-v5:hover { background: #fee2e2; color: #ef4444; }

        @media (max-width: 900px) {
          .doctor-toolbar-v5 { grid-template-columns: 1fr 1fr; }
          .toolbar-actions-v5 { justify-content: stretch; }
          .btn-reset-v5 { width: 100%; }
        }

        .content-area { min-width: 0; }
        .table-responsive-v5 { width: 100%; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .doctor-table-v5 { width: 100%; border-collapse: collapse; min-width: 800px; }
        .doctor-table-v5 th { text-align: left; padding: 12px 16px; font-size: 0.8rem; color: #64748b; font-weight: 700; border-bottom: 2px solid #f1f5f9; text-transform: none; letter-spacing: 0; }
        .doctor-table-v5 td { padding: 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .row-hover-v5:hover { background: #f8fafc; }
        .status-cell-v5 { text-align: center; padding: 80px !important; color: #94a3b8; font-weight: 600; font-size: 1.1rem; }

        .name-bold { font-weight: 700; color: #1e293b; font-size: 0.95rem; }
        .tag-phone { font-size: 0.85rem; color: #64748b; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; display: inline-block; }
        .time-group { display: flex; flex-direction: column; }
        .day-text { font-weight: 600; color: #334155; }
        .hour-text { font-size: 0.8rem; color: #94a3b8; }
        
        .pill-status { padding: 4px 12px; border-radius: 999px; font-size: 0.75rem; font-weight: 700; display: inline-block; }
        .pill-booked { background: #d1fae5; color: #065f46; }
        .pill-cancelled { background: #fee2e2; color: #991b1b; }

        .action-btns-v5 { display: flex; gap: 10px; }
        .btn-act { display: flex; align-items: center; gap: 6px; height: 34px; padding: 0 14px; border-radius: 8px; border: none; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .btn-detail-v5 { background: #f1f5f9; color: #3b82f6; }
        .btn-detail-v5:hover { background: #3b82f6; color: white; transform: translateY(-1px); }
        .btn-send-v5 { background: #f1f5f9; color: #059669; }
        .btn-send-v5:hover { background: #059669; color: white; transform: translateY(-1px); }

        @media (max-width: 1024px) {
          .premium-ui { padding: 15px; }
          .appointment-card { padding: 15px; border-radius: 12px; }
          .appointment-header-v2 { margin-bottom: 20px; padding-bottom: 18px; }
          .header-title-section { gap: 12px; align-items: flex-start; }
          .header-icon-main { width: 38px; height: 38px; border-radius: 9px; flex-shrink: 0; }
          .header-text-main h1 { font-size: 1.1rem; line-height: 1.3; }
          .header-text-main p { font-size: 0.8rem; line-height: 1.45; }
          .doctor-toolbar-v5 { grid-template-columns: 1fr; padding: 14px; gap: 14px; }
          .table-responsive-v5 { overflow-x: visible; }
          .doctor-table-v5,
          .doctor-table-v5 thead,
          .doctor-table-v5 tbody,
          .doctor-table-v5 tr,
          .doctor-table-v5 td {
            display: block;
            width: 100%;
          }
          .doctor-table-v5 { min-width: 0; border-collapse: separate; border-spacing: 0; }
          .doctor-table-v5 thead { display: none; }
          .doctor-table-v5 tr {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 12px;
            margin-bottom: 12px;
            background: #ffffff;
          }
          .doctor-table-v5 td {
            display: grid;
            grid-template-columns: 96px minmax(0, 1fr);
            gap: 12px;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #f1f5f9;
          }
          .doctor-table-v5 td:last-child { border-bottom: none; }
          .doctor-table-v5 td::before {
            color: #64748b;
            font-size: 0.78rem;
            font-weight: 700;
          }
          .doctor-table-v5 td:nth-child(1)::before { content: "Bệnh nhân"; }
          .doctor-table-v5 td:nth-child(2)::before { content: "Liên lạc"; }
          .doctor-table-v5 td:nth-child(3)::before { content: "Thời gian"; }
          .doctor-table-v5 td:nth-child(4)::before { content: "Trạng thái"; }
          .doctor-table-v5 td:nth-child(5)::before { content: "Hành động"; align-self: start; padding-top: 8px; }
          .status-cell-v5 {
            display: block !important;
            padding: 36px 12px !important;
            border-bottom: none !important;
          }
          .status-cell-v5::before { display: none; }
          .name-bold,
          .tag-phone,
          .day-text,
          .pill-status {
            max-width: 100%;
            overflow-wrap: anywhere;
          }
          .action-btns-v5 {
            flex-wrap: wrap;
            gap: 8px;
          }
          .btn-act {
            min-width: 0;
            flex: 1 1 130px;
            justify-content: center;
            padding: 0 10px;
          }
        }

        .modal-mask { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 2000; }
        .modal-container-v5 { background: white; width: 95%; max-width: 550px; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
        .modal-header-v5 { padding: 20px 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
        .modal-header-v5 h3 { margin: 0; font-size: 1.25rem; color: #0f172a; }
        .btn-x { background: none; border: none; font-size: 28px; color: #94a3b8; cursor: pointer; line-height: 1; }
        .modal-grid-v5 { padding: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .item-v5 { display: flex; flex-direction: column; gap: 6px; }
        .item-v5.full-v5 { grid-column: span 2; }
        .item-v5 label { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.025em; }
        .item-v5 p { margin: 0; font-weight: 700; color: #1e293b; font-size: 1.05rem; }
        .reason-text { padding: 16px; background: #f8fafc; border-radius: 12px; border: 1px solid #f1f5f9; font-size: 0.95rem; line-height: 1.6; color: #334155; }
        .modal-footer-v5 { padding: 20px 24px; display: flex; justify-content: flex-end; background: #f8fafc; border-top: 1px solid #f1f5f9; }
        .btn-close-v5 { padding: 10px 28px; background: #0f172a; color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .btn-close-v5:hover { background: #334155; }
      `}</style>
    </div>
  );
}
