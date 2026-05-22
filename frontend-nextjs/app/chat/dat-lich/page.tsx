"use client";

import { useState, FormEvent, useEffect } from "react";

export default function DatLichPage() {
  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift();
    return null;
  };

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    dob: "",
    appointmentDate: "",
    timeSlot: "08:00",
    reason: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [availableDoctors, setAvailableDoctors] = useState<any[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [doctorId, setDoctorId] = useState("");

  const validate = (data = formData) => {
    const errors: Record<string, string> = {};
    if (!data.fullName.trim()) errors.fullName = "Họ tên không được để trống";
    if (!data.phone.trim()) {
      errors.phone = "Số điện thoại không được để trống";
    } else if (!/^\d{10,11}$/.test(data.phone)) {
      errors.phone = "Số điện thoại không hợp lệ (10-11 số)";
    }
    if (!data.dob) errors.dob = "Vui lòng chọn ngày sinh";
    if (!data.appointmentDate) errors.appointmentDate = "Vui lòng chọn ngày khám";
    if (!doctorId) errors.doctorId = "Vui lòng chọn bác sĩ phù hợp (hoặc đổi khung giờ nếu kín lịch)";
    if (!data.reason.trim()) errors.reason = "Vui lòng nhập lý do khám";

    setFormErrors(errors);
    const isValid = Object.keys(errors).length === 0;
    return isValid;
  };

  useEffect(() => {
    if (!formData.appointmentDate || !formData.timeSlot) return;

    const fetchDocs = async () => {
      setLoadingDoctors(true);
      try {
        const token = getCookie("access_token");
        const res = await fetch(`http://localhost:8000/api/v1/appointments/available-doctors?date=${formData.appointmentDate}&time=${formData.timeSlot}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAvailableDoctors(data);
          if (data.length > 0) setDoctorId(data[0].id);
          else setDoctorId("");
        }
      } catch (e) {
      } finally {
        setLoadingDoctors(false);
      }
    };

    fetchDocs();
  }, [formData.appointmentDate, formData.timeSlot]);

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validate();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    console.log("Submit triggered", formData);

    // Mark all as touched to show errors
    const allTouched: Record<string, boolean> = {};
    Object.keys(formData).forEach(key => { allTouched[key] = true; });
    setTouched(allTouched);

    if (!validate()) {
      console.log("Validation failed", formErrors);
      setError("Vui lòng kiểm tra lại các thông tin còn thiếu.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = getCookie("access_token");
      if (!token) {
        throw new Error("Phiên đăng nhập hết hạn (Không tìm thấy token trong cookie). Vui lòng đăng nhập lại.");
      }

      console.log("Sending request to backend...");
      const response = await fetch("http://localhost:8000/api/v1/appointments/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          appointment_date: formData.appointmentDate,
          appointment_time: formData.timeSlot,
          symptoms: `Bệnh nhân: ${formData.fullName}, SĐT: ${formData.phone}, Ngày sinh: ${formData.dob}. Lý do: ${formData.reason}`,
          doctor_id: doctorId
        })
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Lỗi không xác định từ server" }));
        throw new Error(errorData.detail || "Đã có lỗi xảy ra khi lưu lịch khám");
      }

      setSuccess(true);
      // Reset form
      setFormData({
        fullName: "",
        phone: "",
        dob: "",
        appointmentDate: "",
        timeSlot: "08:00",
        reason: "",
      });
      setTouched({});
      setFormErrors({});
    } catch (err: any) {
      console.error("Booking error:", err);
      setError(err.message || "Đã có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="appointment-page-container">
      <div className="appointment-card">
        <div className="appointment-header">
          <div className="icon-wrap">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="header-text">
            <h1>Đặt lịch khám bệnh</h1>
            <p>Vui lòng điền đầy đủ thông tin để bác sĩ có thể chuẩn bị tốt nhất cho buổi khám của bạn.</p>
          </div>
        </div>

        {success ? (
          <div className="success-state">
            <div className="success-icon">✓</div>
            <h2>Đăng ký thành công!</h2>
            <p>Yêu cầu của bạn đã được gửi tới hệ thống. Bạn có thể theo dõi trạng thái tại mục "Danh sách lịch khám".</p>
            <button className="btn-primary" onClick={() => setSuccess(false)}>Đặt lịch mới</button>
          </div>
        ) : (
          <form className="appointment-form" onSubmit={handleSubmit} noValidate>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="fullName">Họ và tên bệnh nhân</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  placeholder="Nguyễn Văn A"
                  className={touched.fullName && formErrors.fullName ? "error" : ""}
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  onBlur={() => handleBlur("fullName")}
                />
                {touched.fullName && formErrors.fullName && <span className="error-msg">{formErrors.fullName}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="phone">Số điện thoại liên lạc</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  placeholder="09xx xxx xxx"
                  className={touched.phone && formErrors.phone ? "error" : ""}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  onBlur={() => handleBlur("phone")}
                />
                {touched.phone && formErrors.phone && <span className="error-msg">{formErrors.phone}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="dob">Ngày tháng năm sinh</label>
                <input
                  type="date"
                  id="dob"
                  name="dob"
                  className={touched.dob && formErrors.dob ? "error" : ""}
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  onBlur={() => handleBlur("dob")}
                />
                {touched.dob && formErrors.dob && <span className="error-msg">{formErrors.dob}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="appointmentDate">Ngày muốn khám</label>
                <input
                  type="date"
                  id="appointmentDate"
                  name="appointmentDate"
                  min={new Date().toISOString().split("T")[0]}
                  className={touched.appointmentDate && formErrors.appointmentDate ? "error" : ""}
                  value={formData.appointmentDate}
                  onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
                  onBlur={() => handleBlur("appointmentDate")}
                />
                {touched.appointmentDate && formErrors.appointmentDate && <span className="error-msg">{formErrors.appointmentDate}</span>}
              </div>

              <div className="form-group full-width">
                <label htmlFor="timeSlot">Thời gian khám dự kiến</label>
                <select
                  id="timeSlot"
                  name="timeSlot"
                  value={formData.timeSlot}
                  onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
                >
                  {Array.from({ length: 13 }).map((_, i) => {
                    const hour = i + 8;
                    const timeStr = `${hour < 10 ? "0" + hour : hour}:00`;
                    return (
                      <option key={timeStr} value={timeStr}>
                        {timeStr}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-group full-width">
                <label htmlFor="doctorId">Chọn Bác sĩ phụ trách {loadingDoctors && <span style={{ fontSize: '0.8rem', color: '#64748b' }}>(Đang tải...)</span>}</label>
                <select
                  id="doctorId"
                  name="doctorId"
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  className={formErrors.doctorId ? "error" : ""}
                >
                  {!formData.appointmentDate && <option value="">Vui lòng chọn ngày khám trước</option>}
                  {formData.appointmentDate && availableDoctors.length === 0 && !loadingDoctors && (
                    <option value="">Không có bác sĩ nào trống lịch khung giờ này</option>
                  )}
                  {availableDoctors.map(doc => (
                    <option key={doc.id} value={doc.id}>Bác sĩ: {doc.full_name}</option>
                  ))}
                </select>
                {formErrors.doctorId && <span className="error-msg">{formErrors.doctorId}</span>}
              </div>

              <div className="form-group full-width">
                <label htmlFor="reason">Lý do khám / Triệu chứng</label>
                <textarea
                  id="reason"
                  name="reason"
                  rows={4}
                  placeholder="Mô tả ngắn gọn tình trạng sức khỏe của bạn (ví dụ: ho kéo dài, đau ngực...)"
                  className={touched.reason && formErrors.reason ? "error" : ""}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  onBlur={() => handleBlur("reason")}
                ></textarea>
                {touched.reason && formErrors.reason && <span className="error-msg">{formErrors.reason}</span>}
              </div>
            </div>

            {error && <div className="form-error" style={{ color: '#ef4444', marginTop: '10px', fontSize: '0.9rem' }}>{error}</div>}

            <div className="form-actions" style={{ marginTop: '30px' }}>
              <button type="submit" className="btn-submit" disabled={loading} style={{ background: '#059669', color: 'white', padding: '12px 24px', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? "Đang gửi yêu cầu..." : "Xác nhận đặt lịch"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
