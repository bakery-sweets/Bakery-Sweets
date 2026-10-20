import { useState } from "react";
import AdminHeader from "../components/AdminHeader";
import { Link } from "react-router-dom";

export default function EmployeeList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  const depts = [
    { key: "all", label: "Tất Cả", count: 18 },
    { key: "Kitchen", label: "Bếp Bánh (Kitchen)", count: 8 },
    { key: "Decor", label: "Trang Trí & Decor", count: 4 },
    { key: "Counter", label: "Thu Ngân & Quầy", count: 6 },
  ];

  const employees = [
    {
      id: 1,
      code: "NV001",
      name: "Nguyễn Minh Tuấn",
      phone: "0912345671",
      department: "Bếp Bánh (Kitchen)",
      position: "Bếp Trưởng Bánh Mousse",
      contract: "Full-time",
      shift: "Ca Sáng (06:00 - 14:00)",
      status: "Active",
      avatarColor: "#de5d7c",
    },
    {
      id: 2,
      code: "NV002",
      name: "Trần Thị Mai",
      phone: "0912345672",
      department: "Thu Ngân & Quầy",
      position: "Trưởng Ca Thu Ngân",
      contract: "Full-time",
      shift: "Ca Chiều (13:30 - 21:30)",
      status: "Active",
      avatarColor: "#0ea5e9",
    },
    {
      id: 3,
      code: "NV003",
      name: "Lê Hoàng Phúc",
      phone: "0912345673",
      department: "Trang Trí & Decor",
      position: "Nghệ Nhân Vẽ Bánh Sinh Nhật",
      contract: "Full-time",
      shift: "Ca Sáng (07:00 - 15:00)",
      status: "Active",
      avatarColor: "#10b981",
    },
    {
      id: 4,
      code: "NV004",
      name: "Phạm Hồng Ánh",
      phone: "0912345674",
      department: "Thu Ngân & Quầy",
      position: "Nhân Viên Pha Chế Trà",
      contract: "Part-time",
      shift: "Ca Tối (17:00 - 22:00)",
      status: "Active",
      avatarColor: "#8b5cf6",
    },
    {
      id: 5,
      code: "NV005",
      name: "Đặng Gia Huy",
      phone: "0912345675",
      department: "Bếp Bánh (Kitchen)",
      position: "Thợ Nướng Bánh Croissant",
      contract: "Probation",
      shift: "Ca Đêm/Sáng (04:00 - 12:00)",
      status: "On Leave",
      avatarColor: "#f59e0b",
    },
  ];

  const filtered = employees.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept = deptFilter === "all" || e.department.includes(deptFilter);
    return matchSearch && matchDept;
  });

  return (
    <>
      <AdminHeader />

      <div className="admin-page-container">
        {/* Header Row */}
        <div className="admin-page-header-row">
          <div className="admin-page-title-group">
            <h1>Nhân Sự &amp; Ca Kíp</h1>
            <p>Quản lý đội ngũ nghệ nhân làm bánh, thợ trang trí &amp; nhân viên quầy</p>
          </div>

          <div className="admin-page-actions">
            <button className="btn-pill-outline" type="button">
              <ion-icon name="download-outline"></ion-icon>
              <span>Xuất Bảng Ca</span>
            </button>
            <Link to="/admin/employees/add" className="btn-pill-primary">
              <ion-icon name="person-add-outline"></ion-icon>
              <span>Thêm Nhân Viên</span>
            </Link>
          </div>
        </div>

        {/* Filter Department Pills */}
        <div className="admin-filter-tabs">
          {depts.map((d) => (
            <button
              key={d.key}
              onClick={() => setDeptFilter(d.key)}
              className={`tab-pill-btn ${deptFilter === d.key ? "active" : ""}`}
            >
              {d.label} ({d.count})
            </button>
          ))}
        </div>

        {/* Table Box */}
        <div className="admin-card-box">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#f8fafc", padding: "8px 16px", borderRadius: "9999px", border: "1px solid #f1f2f4", width: "300px" }}>
              <ion-icon name="search-outline" style={{ color: "#94a3b8", fontSize: "17px" }}></ion-icon>
              <input
                type="text"
                placeholder="Tìm mã NV, tên, chức vụ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: "none", background: "transparent", outline: "none", fontSize: "13px", width: "100%", color: "#1e293b", fontFamily: "inherit" }}
              />
            </div>

            <div style={{ fontSize: "13px", color: "#8c9ba5", fontWeight: "600" }}>
              Tổng số <span style={{ color: "#1e293b", fontWeight: "800" }}>{filtered.length}</span> nhân sự
            </div>
          </div>

          <div className="admin-table-clean-wrapper">
            <table className="admin-table-clean">
              <thead>
                <tr>
                  <th>MÃ NV</th>
                  <th>HỌ VÀ TÊN</th>
                  <th>SỐ ĐIỆN THOẠI</th>
                  <th>PHÒNG BAN &amp; VỊ TRÍ</th>
                  <th>HỢP ĐỒNG</th>
                  <th>CA KÍP LÀM VIỆC</th>
                  <th>TÌNH TRẠNG</th>
                  <th style={{ textAlign: "right" }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => {
                  const initials = emp.name.split(" ").slice(-2).map(w => w[0]).join("");
                  return (
                    <tr key={emp.id}>
                      <td>
                        <span style={{ fontWeight: "800", color: "#de5d7c", fontSize: "13px" }}>
                          {emp.code}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            style={{
                              width: "34px",
                              height: "34px",
                              borderRadius: "50%",
                              background: emp.avatarColor,
                              color: "#ffffff",
                              fontSize: "12px",
                              fontWeight: "800",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: "700", color: "#1e293b" }}>{emp.name}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ color: "#475569", fontSize: "13px" }}>{emp.phone}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: "600", color: "#1e293b", fontSize: "13px" }}>{emp.position}</div>
                        <div style={{ fontSize: "11.5px", color: "#8c9ba5" }}>{emp.department}</div>
                      </td>
                      <td>
                        <span className="badge-pill gray" style={{ fontSize: "11px" }}>
                          {emp.contract}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "12px", color: "#475569", fontWeight: "500" }}>
                          {emp.shift}
                        </span>
                      </td>
                      <td>
                        {emp.status === "Active" ? (
                          <span className="badge-pill mint" style={{ fontSize: "11.5px" }}>
                            <span className="dot-status green"></span> Đang làm
                          </span>
                        ) : (
                          <span className="badge-pill amber" style={{ fontSize: "11.5px" }}>
                            <span className="dot-status orange"></span> Nghỉ phép
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          <Link
                            to={`/admin/employees/edit/${emp.id}`}
                            className="btn-pill-outline"
                            style={{ padding: "5px 12px", fontSize: "12px" }}
                          >
                            Hồ sơ
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}
