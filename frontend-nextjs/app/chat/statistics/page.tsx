"use client";

import { useEffect, useState } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell
} from "recharts";
import {
    Users, Calendar, CheckCircle, Star, TrendingUp, Award, ArrowUpRight, ArrowDownRight
} from "lucide-react";

interface OverviewData {
    users: { total: number; patients: number; doctors: number };
    appointments: { total: number; completed: number; pending: number };
    reviews: { average_rating: number; total: number };
}

interface TrendData {
    date: string;
    total: number;
    completed: number;
}

interface DoctorRanking {
    id: string;
    full_name: string;
    avg_rating: number;
    total_reviews: number;
    total_appointments: number;
}

export default function StatisticsPage() {
    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [trend, setTrend] = useState<TrendData[]>([]);
    const [rankings, setRankings] = useState<DoctorRanking[]>([]);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(7);
    const [viewMode, setViewMode] = useState<"days" | "month">("days");
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem("access_token");
                const headers = {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                };

                let url = "/api/statistics?type=appointments-trend";
                if (viewMode === "month") {
                    const [year, month] = selectedMonth.split("-");
                    url += `&month=${month}&year=${year}`;
                } else {
                    url += `&days=${days}`;
                }

                const [ovRes, trendRes, rankRes] = await Promise.all([
                    fetch("/api/statistics?type=overview", { headers }),
                    fetch(url, { headers }),
                    fetch("/api/statistics?type=doctor-rankings", { headers })
                ]);

                if (ovRes.ok) setOverview(await ovRes.json());
                if (trendRes.ok) setTrend(await trendRes.json());
                if (rankRes.ok) setRankings(await rankRes.json());
            } catch (error) {
                console.error("Error fetching statistics:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [days, viewMode, selectedMonth]);

    if (loading) return <div className="p-8 text-center">Đang tải dữ liệu thống kê...</div>;

    const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"];

    const userRoleData = overview ? [
        { name: "Bệnh nhân", value: overview.users.patients },
        { name: "Bác sĩ", value: overview.users.doctors },
    ] : [];

    return (
        <div className="stats-container">
            <header className="stats-header">
                <h1>Thống kê hệ thống</h1>
                <p>Tổng quan về hoạt động của LungCare</p>
            </header>

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon users"><Users size={24} /></div>
                    <div className="stat-info">
                        <h3>Tổng người dùng</h3>
                        <div className="stat-value">{overview?.users.total}</div>
                        <p>{overview?.users.patients} bệnh nhân, {overview?.users.doctors} bác sĩ</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon appointments"><Calendar size={24} /></div>
                    <div className="stat-info">
                        <h3>Lượt đặt khám</h3>
                        <div className="stat-value">{overview?.appointments.total}</div>
                        <p>{overview?.appointments.pending} lượt đang chờ duyệt</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon completed"><CheckCircle size={24} /></div>
                    <div className="stat-info">
                        <h3>Đã hoàn thành</h3>
                        <div className="stat-value">{overview?.appointments.completed}</div>
                        <p>Tỷ lệ: {overview ? Math.round((overview.appointments.completed / overview.appointments.total) * 100) : 0}%</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon rating"><Star size={24} /></div>
                    <div className="stat-info">
                        <h3>Đánh giá chung</h3>
                        <div className="stat-value">{overview?.reviews.average_rating} / 5</div>
                        <p>Từ {overview?.reviews.total} lượt đánh giá</p>
                    </div>
                </div>
            </div>

            {/* Main Charts */}
            <div className="charts-row">
                <div className="chart-container large">
                    <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <h3><TrendingUp size={18} /> Xu hướng đặt khám</h3>
                        <div className="controls" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div className="mode-tabs" style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '2px' }}>
                                <button
                                    onClick={() => setViewMode("days")}
                                    style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', background: viewMode === "days" ? 'white' : 'transparent', border: 'none', cursor: 'pointer', boxShadow: viewMode === "days" ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                                >
                                    Gần đây
                                </button>
                                <button
                                    onClick={() => setViewMode("month")}
                                    style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', background: viewMode === "month" ? 'white' : 'transparent', border: 'none', cursor: 'pointer', boxShadow: viewMode === "month" ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                                >
                                    Theo tháng
                                </button>
                            </div>

                            {viewMode === "days" ? (
                                <div className="time-selector" style={{ display: 'flex', gap: '8px' }}>
                                    {[7, 30, 90].map(d => (
                                        <button
                                            key={d}
                                            onClick={() => setDays(d)}
                                            style={{
                                                padding: '4px 12px',
                                                borderRadius: '16px',
                                                fontSize: '0.8rem',
                                                border: '1px solid #e2e8f0',
                                                background: days === d ? '#3b82f6' : 'white',
                                                color: days === d ? 'white' : '#64748b',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {d} ngày
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    style={{
                                        padding: '4px 10px',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '0.8rem',
                                        outline: 'none'
                                    }}
                                />
                            )}
                        </div>
                    </div>
                    <div className="chart-body">
                        {(() => {
                            let interval = 0;
                            if (viewMode === "month" || days === 30) interval = 4;
                            else if (days === 90) interval = 9;

                            return (
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={trend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="date" interval={interval} />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="total" name="Tổng lượt đặt" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                        <Line type="monotone" dataKey="completed" name="Đã khám" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} strokeDasharray="5 5" />
                                    </LineChart>
                                </ResponsiveContainer>
                            );
                        })()}
                    </div>
                </div>

                <div className="chart-container small">
                    <div className="chart-header">
                        <h3><Users size={18} /> Cơ cấu người dùng</h3>
                    </div>
                    <div className="chart-body">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={userRoleData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {userRoleData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Doctor Rankings */}
            <div className="rankings-section">
                <div className="section-header">
                    <h3><Award size={20} /> Xếp hạng Bác sĩ</h3>
                    <p>Dựa trên đánh giá và hiệu suất hoạt động</p>
                </div>
                <div className="table-wrapper">
                    <table className="rankings-table">
                        <thead>
                            <tr>
                                <th>Hạng</th>
                                <th>Bác sĩ</th>
                                <th>Đánh giá trung bình</th>
                                <th>Lượt đánh giá</th>
                                <th>Tổng ca khám</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rankings.map((doctor, index) => (
                                <tr key={doctor.id}>
                                    <td>
                                        <span className={`rank-badge ${index < 3 ? 'top' : ''}`}>
                                            {index + 1}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="doctor-name-cell">
                                            <strong>{doctor.full_name}</strong>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="rating-cell">
                                            <Star size={14} fill="#f59e0b" color="#f59e0b" />
                                            <span>{doctor.avg_rating}</span>
                                        </div>
                                    </td>
                                    <td>{doctor.total_reviews}</td>
                                    <td>{doctor.total_appointments}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <style jsx>{`
        .stats-container {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .stats-header h1 {
          margin: 0;
          font-size: 1.75rem;
          color: #0d1b2a;
        }
        .stats-header p {
          margin: 4px 0 0;
          color: #64748b;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
        }
        .stat-card {
          background: #fff;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          border: 1px solid #f1f5f9;
        }
        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-icon.users { background: #eff6ff; color: #3b82f6; }
        .stat-icon.appointments { background: #fff7ed; color: #f59e0b; }
        .stat-icon.completed { background: #ecfdf5; color: #10b981; }
        .stat-icon.rating { background: #fef2f2; color: #ef4444; }
        
        .stat-info h3 {
          margin: 0;
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 500;
        }
        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #0f172a;
          margin: 4px 0;
        }
        .stat-info p {
          margin: 0;
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .charts-row {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }
        .chart-container {
          background: #fff;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          border: 1px solid #f1f5f9;
        }
        .chart-container.large { flex: 2; min-width: 400px; }
        .chart-container.small { flex: 1; min-width: 300px; }
        
        .chart-header {
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .chart-header h3 {
          margin: 0;
          font-size: 1rem;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .rankings-section {
          background: #fff;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          border: 1px solid #f1f5f9;
        }
        .section-header {
          margin-bottom: 20px;
        }
        .section-header h3 {
          margin: 0;
          font-size: 1.25rem;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .section-header p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 0.875rem;
        }

        .table-wrapper {
          overflow-x: auto;
        }
        .rankings-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .rankings-table th {
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
          color: #64748b;
          font-size: 0.875rem;
          font-weight: 500;
        }
        .rankings-table td {
          padding: 16px;
          border-bottom: 1px solid #f8fafc;
          font-size: 0.9375rem;
        }
        .rank-badge {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          color: #64748b;
          font-weight: 600;
          font-size: 0.8125rem;
        }
        .rank-badge.top {
          background: #fef3c7;
          color: #d97706;
        }
        .rating-cell {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        @media (max-width: 768px) {
          .charts-row { flex-direction: column; }
          .chart-container.large, .chart-container.small { width: 100%; min-width: unset; }
        }
      `}</style>
        </div>
    );
}
