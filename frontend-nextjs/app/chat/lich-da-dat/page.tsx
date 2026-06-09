"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  doctor_id: string | null;
  status: string;
  symptoms: string;
  created_at: string;
  medical_result?: {
    diagnosis: string;
  } | null;
  doctor?: {
    full_name: string;
  } | null;
}

function LichDaDatContent() {
  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift();
    return null;
  };

  // User Role State
  const [role, setRole] = useState<string | null>(null);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter States (For Doctors/Admins)
  const getLocalDate = () => {
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzOffset).toISOString().split("T")[0];
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState(getLocalDate());
  const [filterStatus, setFilterStatus] = useState("booked");

  // Modal States
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [aptToCancel, setAptToCancel] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({ id: "", fullName: "", phone: "", dob: "", date: "", time: "08:00", reason: "" });
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");

  const [toast, setToast] = useState<{ message: string; show: boolean }>({ message: "", show: false });
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightRowRef = useRef<HTMLTableRowElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Medical Result Entry States
  const [showResultEntryModal, setShowResultEntryModal] = useState(false);
  const [diagnosis, setDiagnosis] = useState("");
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);

  // Review Modal States
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const isAdmin = role === "admin";

  const triggerToast = (msg: string) => {
    setToast({ message: msg, show: true });
    setTimeout(() => setToast({ message: "", show: false }), 3000);
  };

  const fetchUserInfo = async () => {
    try {
      const token = getCookie("access_token");
      if (!token) return;
      const response = await fetch("http://localhost:8000/api/v1/auth/me", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRole(data.role);
      }
    } catch (err) { }
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const token = getCookie("access_token");
      if (!token) throw new Error("Phiên đăng nhập hết hạn.");

      let url = "http://localhost:8000/api/v1/appointments/my";

      // If doctor/admin, use the /all endpoint with filters
      if (role === "doctor" || role === "admin") {
        const params = new URLSearchParams();
        if (filterDate) params.append("date", filterDate);
        if (filterStatus && filterStatus !== "all") params.append("status", filterStatus);
        if (searchTerm.trim()) params.append("search", searchTerm.trim());
        const queryString = params.toString();
        url = `http://localhost:8000/api/v1/appointments/all${queryString ? `?${queryString}` : ""}`;
      }

      const response = await fetch(url, {
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

  useEffect(() => {
    fetchUserInfo();
  }, []);

  useEffect(() => {
    if (role) {
      const hId = searchParams.get("highlight");
      // If we have a highlight, ensure we are searching across all statuses
      if (hId && (role === "doctor" || role === "admin") && filterStatus !== "all") {
        setFilterStatus("all");
        // The next effect cycle will fetch with 'all'
        return;
      }
      fetchAppointments();
    }
  }, [role, filterDate, filterStatus, searchParams]);

  // After appointments loaded, handle highlight param
  useEffect(() => {
    const hId = searchParams.get("highlight");
    if (!hId || !appointments.length) return;

    const found = appointments.find(a => a.id.toLowerCase() === hId.toLowerCase());

    if (found) {
      if (highlightId !== found.id) {
        setHighlightId(found.id);
        setSelectedApt(found);
      }

      // We found it, now we can remove from URL so it doesn't re-trigger on reload
      // But we use a flag or just do it once
      const search = new URLSearchParams(window.location.search);
      if (search.has("highlight")) {
        // Scroll and open modal
        setTimeout(() => {
          if (highlightRowRef.current) {
            highlightRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          // Only auto-open if it's a completed appointment (usually for results)
          if (found.status === "completed") {
            setShowResultModal(true);
          }
          router.replace('/chat/lich-da-dat', { scroll: false });
        }, 600);
      }
    }
  }, [appointments, searchParams, highlightId, router]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (role === "doctor" || role === "admin") fetchAppointments();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
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

  const formatFilterDate = (dateStr: string) => {
    if (!dateStr) return "Tất cả các ngày";
    return formatDate(dateStr);
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

  const handleEditClick = (apt: Appointment) => {
    const info = parseSymptoms(apt.symptoms);
    setEditData({
      id: apt.id,
      fullName: info.name,
      phone: info.phone,
      dob: info.dob,
      date: apt.appointment_date,
      time: apt.appointment_time.substring(0, 5),
      reason: info.reason
    });
    setUpdateError("");
    setShowEditModal(true);
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const token = getCookie("access_token");
      const newSymptoms = `Bệnh nhân: ${editData.fullName}, SĐT: ${editData.phone}, Ngày sinh: ${editData.dob}. Lý do: ${editData.reason}`;
      const response = await fetch(`http://localhost:8000/api/v1/appointments/${editData.id}`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ appointment_date: editData.date, appointment_time: editData.time, symptoms: newSymptoms })
      });
      if (response.ok) {
        setShowEditModal(false);
        fetchAppointments();
        triggerToast("Đã chỉnh sửa thành công");
      } else {
        const errData = await response.json();
        setUpdateError(errData.detail || "Cập nhật thất bại.");
      }
    } catch (err) {
      setUpdateError("Lỗi kết nối.");
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmCancel = async () => {
    if (!aptToCancel) return;
    setIsCancelling(true);
    try {
      const token = getCookie("access_token");
      const response = await fetch(`http://localhost:8000/api/v1/appointments/${aptToCancel}/cancel`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        setShowCancelModal(false);
        fetchAppointments();
        triggerToast("Đã hủy lịch thành công");
      }
    } catch (err) { } finally {
      setIsCancelling(false);
    }
  };

  const handleResultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApt) return;
    setIsSubmittingResult(true);
    try {
      const token = getCookie("access_token");
      const response = await fetch(`http://localhost:8000/api/v1/appointments/${selectedApt.id}/result`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ diagnosis })
      });
      if (response.ok) {
        setShowResultEntryModal(false);
        fetchAppointments();
        triggerToast("Đã gửi kết quả thành công");
      } else {
        const d = await response.json();
        triggerToast(d.detail || "Gửi kết quả thất bại");
      }
    } catch (err) {
      triggerToast("Lỗi kết nối");
    } finally {
      setIsSubmittingResult(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApt) return;
    setIsSubmittingReview(true);
    try {
      const token = getCookie("access_token");
      const response = await fetch(`http://localhost:8000/api/v1/reviews/`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_id: selectedApt.id,
          rating: reviewRating,
          comment: reviewComment
        })
      });
      if (response.ok) {
        setShowReviewModal(false);
        setReviewRating(5);
        setReviewComment("");
        triggerToast("Đã gửi đánh giá thành công! Cảm ơn bạn.");
      } else {
        const d = await response.json();
        triggerToast(d.detail || "Gửi đánh giá thất bại");
      }
    } catch (err) {
      triggerToast("Lỗi kết nối");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleOpenReviewModal = async (apt: Appointment) => {
    setSelectedApt(apt);
    setReviewRating(0);
    setReviewComment("");

    if (apt.doctor_id) {
      try {
        const token = getCookie("access_token");
        const res = await fetch(`http://localhost:8000/api/v1/reviews/my-review/${apt.doctor_id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setReviewRating(data.rating || 0);
          setReviewComment(data.comment || "");
        }
      } catch (err) { }
    }

    setShowReviewModal(true);
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
        <div className="appointment-header">
          <div className="icon-wrap">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="9" y1="6" x2="21" y2="6" />
              <line x1="9" y1="12" x2="21" y2="12" />
              <line x1="9" y1="18" x2="21" y2="18" />
              <circle cx="5" cy="6" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="5" cy="18" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <div className="header-text">
            <h1>{role === "doctor" || role === "admin" ? "Quản lý lịch khám bệnh" : "Danh sách lịch khám của tôi"}</h1>
            <p>{role === "doctor" || role === "admin" ? "Theo dõi và quản lý bệnh nhân trong ngày" : "Quản lý hành trình chăm sóc sức khỏe của bạn"}</p>
          </div>
        </div>

        {/* Doctor Filters Toolbar */}
        {(role === 'doctor' || role === 'admin') && (
          <div className="doctor-toolbar">
            <div className="filter-group search">
              <div className="search-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input type="text" placeholder="Tìm tên bệnh nhân..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
            <div className="filter-group date">
              <div className="date-input-wrap-mini">
                <input type="date" className="native-date-input-v5" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
                {filterDate && <button type="button" className="btn-clear-mini" style={{ right: '35px' }} onClick={(e) => { e.stopPropagation(); setFilterDate(""); }}>&times;</button>}
              </div>
            </div>
            <div className="filter-group status">
              <select className="mini-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="booked">Đang chờ (Đã đặt)</option>
                <option value="completed">Đã khám bệnh</option>
                <option value="cancelled">Đã hủy</option>
                <option value="all">Tất cả trạng thái</option>
              </select>
            </div>
          </div>
        )}

        <div className="content-area">
          {loading ? (
            <div className="loading-wrapper">Đang tải danh sách...</div>
          ) : appointments.length === 0 ? (
            <div className="appointment-empty-state">
              <div className="header-text">
                <h1>Không có lịch khám nào</h1>
              </div>
              {role === "patient" && (
                <Link href="/chat/dat-lich" className="btn-primary">
                  Đặt lịch ngay
                </Link>
              )}
            </div>
          ) : (
            <div className="table-container">
              <table className="modern-table">
                <thead>
                  <tr><th>Bệnh nhân</th><th>Liên lạc</th><th>Thời gian</th>{role !== 'doctor' && <th>Bác sĩ</th>}<th>Trạng thái</th><th>Hành động</th></tr>
                </thead>
                <tbody>
                  {appointments.map((apt) => {
                    const info = parseSymptoms(apt.symptoms);
                    const isCancelled = apt.status === "cancelled";
                    const isCompleted = apt.status === "completed";
                    const isLocked = isCancelled || isCompleted;
                    return (
                      <tr
                        key={apt.id}
                        ref={apt.id === highlightId ? highlightRowRef : null}
                        className={`table-row-hover${apt.id === highlightId ? ' row-highlight' : ''}`}
                      >
                        <td><div className="patient-name">{info.name}</div></td>
                        <td><div className="phone-tag">{info.phone}</div></td>
                        <td><div className="datetime-cell"><span className="date-main">{formatDate(apt.appointment_date)}</span><span className="time-sub">{apt.appointment_time}</span></div></td>
                        {role !== 'doctor' && <td><div className="doctor-tag">{apt.doctor ? apt.doctor.full_name : "Chưa xếp"}</div></td>}
                        <td>
                          <span className={`status-pill ${isCancelled ? 'status-cancelled' :
                            isCompleted ? 'status-completed' : 'status-booked'
                            }`}>
                            {isCancelled ? "Đã hủy" : isCompleted ? "Đã khám bệnh" : "Đã đặt"}
                          </span>
                        </td>
                        <td>
                          <div className="action-group-premium-left">
                            <button className="act-btn view-btn" title="Xem chi tiết" onClick={() => { setSelectedApt(apt); setShowDetailModal(true); }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg></button>

                            {(role === 'doctor' || role === 'admin') && (apt.status === 'booked' || apt.status === 'confirmed' || apt.status === 'pending') && (
                              <button className="act-btn edit-btn" style={{ background: '#059669', color: 'white' }} title="Gửi kết quả" onClick={() => { setSelectedApt(apt); setDiagnosis(apt.medical_result?.diagnosis || ""); setShowResultEntryModal(true); }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                              </button>
                            )}

                            {role === 'patient' && isCompleted && (
                              <>
                                <button className="act-btn result-btn" title="Xem kết quả" onClick={() => { setSelectedApt(apt); setShowResultModal(true); }}>
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                                </button>
                                <button className="act-btn review-btn" title="Đánh giá bác sĩ" onClick={() => handleOpenReviewModal(apt)}>
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                </button>
                              </>
                            )}

                            <button className="act-btn edit-btn" title="Chỉnh sửa" disabled={isLocked} onClick={() => handleEditClick(apt)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg></button>
                            <button className="act-btn delete-btn" title="Hủy lịch" disabled={isLocked} onClick={() => { setAptToCancel(apt.id); setShowCancelModal(true); }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals remain the same but use shared logic */}
      {/* ... (Detail, Edit, Cancel modals) */}
      {showDetailModal && selectedApt && (
        <div className="modal-overlay-blur">
          <div className="modal-premium-content">
            <div className="modal-banner"><h3>Chi tiết cuộc hẹn</h3><button className="btn-close-top" onClick={() => setShowDetailModal(false)}>&times;</button></div>
            <div className="modal-grid">
              <div className="info-block"><span className="block-label">Họ và tên</span><span className="block-value">{parseSymptoms(selectedApt.symptoms).name}</span></div>
              <div className="info-block"><span className="block-label">Số điện thoại</span><span className="block-value">{parseSymptoms(selectedApt.symptoms).phone}</span></div>
              <div className="info-block"><span className="block-label">Ngày sinh</span><span className="block-value">{formatDate(parseSymptoms(selectedApt.symptoms).dob)}</span></div>
              <div className="info-block"><span className="block-label">Trạng thái</span><span className="status-pill-mini" style={{ color: selectedApt.status === 'cancelled' ? '#ef4444' : selectedApt.status === 'completed' ? '#64748b' : '#166534' }}>{selectedApt.status === "cancelled" ? "Đã hủy" : selectedApt.status === "completed" ? "Đã khám bệnh" : "Đã đặt"}</span></div>
              {role !== 'doctor' && <div className="info-block"><span className="block-label">Bác sĩ phụ trách</span><span className="block-value">{selectedApt.doctor ? selectedApt.doctor.full_name : "Chưa có"}</span></div>}
              <div className="info-block"><span className="block-label">Ngày khám</span><span className="block-value">{formatDate(selectedApt.appointment_date)}</span></div>
              <div className="info-block"><span className="block-label">Giờ khám dự kiến</span><span className="block-value">{selectedApt.appointment_time}</span></div>
              <div className="info-block full"><span className="block-label">Lý do khám / Triệu chứng</span><p className="block-text">{parseSymptoms(selectedApt.symptoms).reason}</p></div>
            </div>
            <div className="modal-actions-v2-right"><button className="btn-primary-v2 equal-btn" onClick={() => setShowDetailModal(false)}>Đóng</button></div>
          </div>
        </div>
      )}

      {showResultModal && selectedApt && (
        <div className="modal-overlay-blur">
          <div className="modal-premium-content">
            <div className="modal-banner">
              <h3>Kết quả khám bệnh</h3>
              <button className="btn-close-top" onClick={() => setShowResultModal(false)}>&times;</button>
            </div>
            <div className="modal-grid">
              <div className="info-block full">
                <span className="block-label">Bệnh nhân</span>
                <span className="block-value">{parseSymptoms(selectedApt.symptoms).name}</span>
              </div>
              <div className="info-block full">
                <span className="block-label">Ngày khám bệnh</span>
                <span className="block-value">{formatDate(selectedApt.appointment_date)}</span>
              </div>
              <div className="info-block full">
                <span className="block-label">Nội dung bác sĩ gửi</span>
                {selectedApt.medical_result?.diagnosis ? (
                  <p className="block-text result-text-view">{selectedApt.medical_result.diagnosis}</p>
                ) : (
                  <p className="block-text result-empty-view">Chưa có kết quả khám cho lịch hẹn này.</p>
                )}
              </div>
            </div>
            <div className="modal-actions-v2-right"><button className="btn-primary-v2 equal-btn" onClick={() => setShowResultModal(false)}>Đóng</button></div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay-blur">
          <div className="modal-premium-content">
            <div className="modal-banner"><h3>Chỉnh sửa lịch khám</h3><button className="btn-close-top" onClick={() => setShowEditModal(false)}>&times;</button></div>
            <form onSubmit={handleUpdateSubmit}>
              <div className="modal-grid">
                <div className="info-block"><span className="block-label">Họ và tên</span><input className="edit-input" value={editData.fullName} onChange={e => setEditData({ ...editData, fullName: e.target.value })} required /></div>
                <div className="info-block"><span className="block-label">Số điện thoại</span><input className="edit-input" value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} required /></div>
                <div className="info-block">
                  <span className="block-label">Ngày sinh</span>
                  <div className="date-input-wrap">
                    <input type="date" className="edit-input date-picker-input" value={editData.dob} onChange={e => setEditData({ ...editData, dob: e.target.value })} required />
                    <div className="date-display-overlay"><span>{formatDate(editData.dob)}</span><svg className="calendar-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
                  </div>
                </div>
                <div className="info-block">
                  <span className="block-label">Ngày khám</span>
                  <div className="date-input-wrap">
                    <input type="date" className="edit-input date-picker-input" value={editData.date} onChange={e => setEditData({ ...editData, date: e.target.value })} required />
                    <div className="date-display-overlay"><span>{formatDate(editData.date)}</span><svg className="calendar-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
                  </div>
                </div>
                <div className="info-block full">
                  <span className="block-label">Giờ khám dự kiến</span>
                  <select className="edit-input edit-select" value={editData.time} onChange={e => setEditData({ ...editData, time: e.target.value })} required>
                    {Array.from({ length: 13 }).map((_, i) => {
                      const timeStr = `${(i + 8).toString().padStart(2, '0')}:00`;
                      return <option key={timeStr} value={timeStr}>{timeStr}</option>;
                    })}
                  </select>
                </div>
                <div className="info-block full"><span className="block-label">Lý do khám / Triệu chứng</span><textarea className="edit-textarea" value={editData.reason} onChange={e => setEditData({ ...editData, reason: e.target.value })} required rows={3} /></div>
                {updateError && <div className="info-block full" style={{ color: '#ef4444', fontWeight: 600 }}>{updateError}</div>}
              </div>
              <div className="modal-actions-v2-right">
                <button type="button" className="btn-secondary-v2 equal-btn" onClick={() => setShowEditModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary-v2 equal-btn" disabled={isUpdating}>{isUpdating ? "Đang lưu..." : "Lưu thay đổi"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div className="modal-overlay-blur">
          <div className="modal-premium-content confirm-modal">
            <div className="modal-banner danger"><h3>Xác nhận hủy lịch</h3></div>
            <div className="modal-body-p"><p>Bạn có chắc chắn muốn hủy lịch khám này không?</p></div>
            <div className="modal-actions-v2-right">
              <button className="btn-secondary-v2 equal-btn" onClick={() => setShowCancelModal(false)}>Đóng</button>
              <button className="btn-danger-v2 equal-btn" disabled={isCancelling} onClick={confirmCancel}>{isCancelling ? "Đang xử lý..." : "Xác nhận hủy"}</button>
            </div>
          </div>
        </div>
      )}


      {showResultEntryModal && selectedApt && (
        <div className="modal-overlay-blur">
          <div className="modal-premium-content">
            <div className="modal-banner"><h3>Gửi kết quả khám bệnh</h3><button className="btn-close-top" onClick={() => setShowResultEntryModal(false)}>&times;</button></div>
            <form onSubmit={handleResultSubmit}>
              <div className="modal-grid">
                <div className="info-block"><span className="block-label">Bệnh nhân</span><span className="block-value">{parseSymptoms(selectedApt.symptoms).name}</span></div>
                <div className="info-block"><span className="block-label">Ngày khám</span><span className="block-value">{formatDate(selectedApt.appointment_date)}</span></div>
                <div className="info-block full"><span className="block-label">Nội dung kết quả / Chẩn đoán</span><textarea className="edit-textarea" rows={6} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Nhập chẩn đoán và lời khuyên của bác sĩ..."></textarea></div>
              </div>
              <div className="modal-actions-v2-right">
                <button type="button" className="btn-secondary-v2 equal-btn" onClick={() => setShowResultEntryModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary-v2 equal-btn" disabled={isSubmittingResult}>{isSubmittingResult ? "Đang gửi..." : "Gửi kết quả"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReviewModal && selectedApt && (
        <div className="modal-overlay-blur">
          <div className="modal-premium-content">
            <div className="modal-banner">
              <h3>Đánh giá bác sĩ</h3>
              <button className="btn-close-top" onClick={() => setShowReviewModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleReviewSubmit}>
              <div className="modal-grid">
                <div className="info-block full">
                  <span className="block-label">Bác sĩ phụ trách</span>
                  <span className="block-value" style={{ color: '#059669' }}>{selectedApt.doctor?.full_name || "Bác sĩ hệ thống"}</span>
                </div>
                <div className="info-block full">
                  <span className="block-label">Mức độ hài lòng</span>
                  <div className="star-rating-input" style={{ display: 'flex', gap: '8px', margin: '8px 0' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '28px', color: star <= reviewRating ? '#f59e0b' : '#cbd5e1' }}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <div className="info-block full">
                  <span className="block-label">Nhận xét của bạn</span>
                  <textarea
                    className="edit-textarea"
                    rows={4}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Hãy chia sẻ cảm nhận của bạn về bác sĩ và dịch vụ..."
                    required
                  ></textarea>
                </div>
              </div>
              <div className="modal-actions-v2-right">
                <button type="button" className="btn-secondary-v2 equal-btn" onClick={() => setShowReviewModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary-v2 equal-btn" disabled={isSubmittingReview}>
                  {isSubmittingReview ? "Đang gửi..." : "Gửi đánh giá"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .premium-ui { background: #f1f5f9; font-family: Arial, sans-serif !important; }
        
        .toast-premium-container { position: fixed; top: 24px; right: 24px; z-index: 3000; animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .toast-premium-card { background: #0f172a; color: white; padding: 16px 24px; border-radius: 12px; display: flex; align-items: center; gap: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); }
        .toast-icon { background: #059669; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; }
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

        /* Doctor Toolbar Styling */
        .doctor-toolbar {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          padding: 16px;
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          align-items: center;
        }
        .filter-group.search { flex: 1; }
        .search-box { position: relative; }
        .search-box svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        .search-box input { width: 100%; padding: 10px 12px 10px 40px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; }
        
        .date-input-wrap-mini { position: relative; min-width: 180px; display: flex; align-items: center; }
        .native-date-input-v5 { width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; font-size: 0.9rem; font-weight: 600; color: #1e293b; outline: none; cursor: pointer; appearance: auto; transition: 0.2s; font-family: inherit; }
        .native-date-input-v5:focus { border-color: #059669; box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.12); background: white; }
        .btn-clear-mini { position: absolute; right: 8px; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; background: #e2e8f0; color: #64748b; border: none; border-radius: 50%; font-size: 14px; cursor: pointer; z-index: 3; transition: 0.2s; }
        .btn-clear-mini:hover { background: #ef4444; color: white; }
        .mini-select { padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; font-size: 0.9rem; font-weight: 600; color: #1e293b; outline: none; }

        .modern-table { width: 100%; border-collapse: separate; border-spacing: 0 12px; }
        .modern-table th { padding: 0 20px 8px; font-size: 0.85rem; font-weight: 700; color: #475569; text-align: left; }
        
        /* Unified Row Styling */
        .modern-table td { 
          padding: 20px; 
          background: #ffffff; 
          border-top: 1px solid #f1f5f9;
          border-bottom: 1px solid #f1f5f9;
          border-left: none;
          border-right: none;
          transition: all 0.2s;
        }
        .modern-table td:first-child { 
          border-left: 1px solid #f1f5f9;
          border-radius: 12px 0 0 12px; 
        }
        .modern-table td:last-child { 
          border-right: 1px solid #f1f5f9;
          border-radius: 0 12px 12px 0; 
        }

        .table-row-hover:hover td { background: #f8fafc; transform: translateY(-1px); }
        
        /* Seamless Highlight Styling */
        .row-highlight td { 
          background: #fef9c3 !important; 
          border-top: 2px solid #f59e0b !important; 
          border-bottom: 2px solid #f59e0b !important;
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.15);
        }
        .row-highlight td:first-child { 
          border-left: 2px solid #f59e0b !important; 
          border-radius: 12px 0 0 12px; 
        }
        .row-highlight td:last-child { 
          border-right: 2px solid #f59e0b !important; 
          border-radius: 0 12px 12px 0; 
        }
        @keyframes fadeHighlight { 0% { background: #fef08a !important; } 100% { background: #fef9c3 !important; } }

        .patient-name { font-weight: 700; color: #1e293b; }
        .phone-tag { font-size: 0.85rem; background: #f1f5f9; padding: 4px 10px; border-radius: 6px; color: #475569; font-weight: 500; display: inline-block; }
        .datetime-cell { display: flex; flex-direction: column; }
        .date-main { font-weight: 600; color: #1e293b; }
        .time-sub { font-size: 0.8rem; color: #64748b; }
        .doctor-tag { font-size: 0.85rem; font-weight: 600; color: #059669; background: #ecfdf5; padding: 4px 8px; border-radius: 4px; display: inline-block; }
        
        .status-pill { display: inline-flex; padding: 6px 12px; border-radius: 999px; font-size: 0.75rem; font-weight: 700; }
        .status-booked { background: #dcfce7; color: #166534; }
        .status-confirmed { background: #dbeafe; color: #1e40af; }
        .status-cancelled { background: #fee2e2; color: #991b1b; }
        .status-completed { background: #f1f5f9; color: #64748b; }
        .status-pill-mini { font-size: 1.1rem; font-weight: 700; }

        .action-group-premium-left { display: flex; gap: 8px; }
        .act-btn { width: 38px; height: 38px; border-radius: 10px; border: none; background: #f8fafc; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .act-btn:hover:not(:disabled) { color: white; transform: scale(1.1); }
        .view-btn:hover:not(:disabled) { background: #3b82f6; }
        .assign-btn:hover:not(:disabled) { background: #8b5cf6; }
        .result-btn:hover:not(:disabled) { background: #059669; }
        .review-btn:hover:not(:disabled) { background: #f59e0b; }
        .edit-btn:hover:not(:disabled) { background: #f59e0b; }
        .delete-btn:hover:not(:disabled) { background: #ef4444; }
        .act-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .modal-overlay-blur { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 2000; }
        .modal-premium-content { background: white; width: 90%; max-width: 550px; border-radius: 12px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); display: flex; flex-direction: column; }
        .modal-banner { padding: 16px 24px; background: #f8fafc; border-bottom: 1px solid #f1f5f9; position: relative; }
        .modal-banner h3 { margin: 0; font-size: 1.4rem; color: #000000; font-weight: 600; text-transform: none; }
        .modal-banner.danger h3 { color: #991b1b; }
        .btn-close-top { position: absolute; top: 16px; right: 20px; background: none; border: none; font-size: 28px; color: #94a3b8; cursor: pointer; }
        
        .modal-grid { padding: 24px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        .info-block { display: flex; flex-direction: column; gap: 4px; }
        .info-block.full { grid-column: 1 / -1; }
        .block-label { font-size: 0.85rem; font-weight: 600; color: #475569; margin-bottom: 2px; text-transform: none; }
        .block-value { font-size: 1.1rem; font-weight: 700; color: #1e293b; word-break: break-word; }
        .block-text { margin: 0; padding: 16px; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; color: #334155; line-height: 1.6; font-size: 0.95rem; }
        .result-text-view { white-space: pre-wrap; }
        .result-empty-view { color: #64748b; font-style: italic; }

        .date-input-wrap { position: relative; width: 100%; }
        .date-display-overlay {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: white; padding: 10px 12px; border-radius: 8px;
          display: flex; align-items: center; justify-content: space-between;
          pointer-events: none; font-family: Arial, sans-serif; font-size: 0.95rem;
          color: #1e293b; border: 1px solid #e2e8f0; z-index: 1;
        }
        .calendar-icon-svg { color: #64748b; flex-shrink: 0; }
        .date-picker-input { position: relative; z-index: 2; opacity: 0; cursor: pointer; width: 100%; height: 40px; }
        .edit-input, .edit-textarea, .edit-select { width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-family: Arial, sans-serif; font-size: 0.95rem; box-sizing: border-box; }
        .edit-input:focus, .edit-textarea:focus, .edit-select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
        .modal-actions-v2-right { padding: 16px 24px 24px; display: flex; justify-content: flex-end; gap: 12px; }
        .btn-primary-v2 { padding: 12px 24px; background: #0f172a; color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .btn-secondary-v2 { padding: 12px 24px; background: #f1f5f9; color: #475569; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; }
        .btn-danger-v2 { padding: 12px 24px; background: #ef4444; color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; }
        .equal-btn { min-width: 140px; }
        .modal-body-p { padding: 24px; color: #475569; line-height: 1.5; }
      `}</style>
    </div>
  );
}

export default function LichDaDatPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Đang tải...</div>}>
      <LichDaDatContent />
    </Suspense>
  );
}
